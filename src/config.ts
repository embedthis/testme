import type { TestConfig } from './types.ts';
import { join, dirname, resolve, isAbsolute } from 'path';
import { readdir, stat } from 'fs/promises';
import JSON5 from 'json5';
import { ErrorMessages } from './utils/error-messages.ts';

/*
 ConfigManager - Hierarchical configuration management

 Responsibilities:
 - Loads testme.json5 configuration files
 - Walks directory tree to find nearest config file
 - Merges configurations with intelligent defaults
 - Supports CLI argument overrides
 - Provides configuration inheritance

 Configuration Discovery:
 1. Starts from test file directory
 2. Walks up directory tree looking for testme.json5
 3. Returns first found config or default if none found
 4. Each test can have its own nearest config

 Configuration Merging Priority (highest to lowest):
 1. CLI arguments (--verbose, --workers, etc.)
 2. Test-specific testme.json5 (nearest to test file)
 3. Parent directory configs (inherited)
 4. Built-in defaults

 This enables:
 - Project-wide defaults at repository root
 - Module-specific overrides in subdirectories
 - Test-specific configuration closest to tests
 - Automatic merging with CLI args preserved
 */
/**
 * Manages hierarchical configuration loading and merging for TestMe
 *
 * ConfigManager handles the discovery and loading of testme.json5 configuration files
 * throughout the directory tree. It implements a hierarchical configuration system where
 * configurations can be inherited and overridden at different directory levels.
 *
 * @remarks
 * Configuration Discovery Algorithm:
 * 1. Starts from a specified directory (typically the test file's location)
 * 2. Walks up the directory tree looking for testme.json5
 * 3. Returns the first found configuration merged with defaults
 * 4. Each test can have its own nearest configuration
 *
 * Configuration Priority (highest to lowest):
 * 1. CLI arguments (--verbose, --workers, etc.)
 * 2. Test-specific testme.json5 (nearest to test file)
 * 3. Parent directory configs (inherited)
 * 4. Built-in defaults
 *
 * @example
 * ```typescript
 * // Find configuration for a test file
 * const config = await ConfigManager.findConfig('/path/to/test/dir');
 *
 * // Load from specific file
 * const config = await ConfigManager.loadConfigFromFile('/path/to/testme.json5');
 *
 * // Get default configuration
 * const defaults = ConfigManager.getDefaultConfig();
 * ```
 */
export class ConfigManager {
    /**
     * Name of the configuration file to search for
     * @internal
     */
    private static readonly CONFIG_FILENAME = 'testme.json5';

    /**
     * Default configuration values used as fallback
     * @internal
     */
    private static readonly DEFAULT_CONFIG: TestConfig = {
        enable: true, // Tests are enabled by default
        compiler: {
            c: {
                // No compiler specified - auto-detect based on platform
                // No flags specified - use compiler defaults from CompilerManager
            },
            es: {
                require: ['testme']
            }
        },
        execution: {
            timeout: 30, // 30 seconds
            parallel: true,
            workers: 4
        },
        output: {
            verbose: false,
            format: 'simple',
            colors: true
        },
        patterns: {
            include: ['**/*.tst.c', '**/*.tst.js', '**/*.tst.ts', '**/*.tst.py', '**/*.tst.go', '**/*.tst.es'],
            exclude: ['**/node_modules/**', '**/.testme/**', '**/.*/**'],
            windows: {
                include: ['**/*.tst.ps1', '**/*.tst.bat', '**/*.tst.cmd']
            },
            macosx: {
                include: ['**/*.tst.sh']
            },
            linux: {
                include: ['**/*.tst.sh']
            }
        },
        services: {
            prep: '',
            setup: '',
            cleanup: '',
            prepTimeout: 30000,
            setupTimeout: 30000,
            cleanupTimeout: 10000,
            delay: 0 // No delay by default
        }
    };

    /**
     * Finds and loads configuration starting from a directory and walking up the tree
     *
     * @param startDir - Directory to start searching from
     * @returns Merged configuration with defaults and config directory
     *
     * @remarks
     * This method walks up the directory tree starting from `startDir`, looking for
     * the first testme.json5 file. The found configuration is merged with default
     * values to ensure all required properties are present. If the config specifies
     * inheritance, parent configs are loaded and merged.
     */
    static async findConfig(startDir: string): Promise<TestConfig> {
        const { config, configDir } = await this.findConfigFile(startDir);

        // If config has inherit field, load parent config and merge
        if (config && config.inherit !== undefined && config.inherit !== false) {
            const parentConfig = configDir ? await this.loadParentConfig(configDir) : null;
            const inheritedConfig = this.mergeInheritedConfig(config, parentConfig);
            return this.mergeWithDefaults(inheritedConfig, configDir);
        }

        return this.mergeWithDefaults(config, configDir);
    }

    /**
     * Searches for configuration file by walking up directory tree
     *
     * @param startDir - Directory to start searching from
     * @returns Object with parsed configuration and config directory path
     *
     * @remarks
     * Returns null for both config and configDir if no configuration file is found.
     * Uses JSON5 parser to allow comments and trailing commas in config files.
     */
    static async findConfigFile(startDir: string): Promise<{ config: Partial<TestConfig> | null; configDir: string | null }> {
        let currentDir = startDir;

        while (true) {
            const configPath = join(currentDir, this.CONFIG_FILENAME);

            try {
                const file = Bun.file(configPath);
                if (await file.exists()) {
                    const configText = await file.text();
                    const config = JSON5.parse(configText) as Partial<TestConfig>;
                    return { config, configDir: currentDir };
                }
            } catch (error) {
                console.error(ErrorMessages.configFileError(configPath, error));
                // Continue searching in parent directories
            }

            const parentDir = dirname(currentDir);
            if (parentDir === currentDir) {
                // Reached root directory
                break;
            }
            currentDir = parentDir;
        }

        return { config: null, configDir: null };
    }

    /**
     * Finds the root (top-most) configuration file by recursively searching subdirectories
     *
     * @param startDir - Directory to start searching from
     * @returns Merged configuration from the top-most testme.json5 found
     *
     * @remarks
     * This method finds the top-most testme.json5 file in the directory hierarchy.
     * This is used for global services (globalPrep, globalCleanup) to ensure they
     * run from the project root configuration, not a subdirectory config.
     *
     * Algorithm:
     * 1. Check startDir and all parent directories for testme.json5
     * 2. If not found, recursively search common subdirectories (test, tests, spec, src)
     * 3. Return the top-most (highest in directory tree) configuration found
     * 4. If no config found, return default configuration
     */
    static async findRootConfig(startDir: string): Promise<TestConfig> {
        let currentDir = startDir;
        let rootConfig: Partial<TestConfig> | null = null;
        let rootConfigDir: string | null = null;

        // First, walk up the directory tree to find any configs in parent directories
        while (true) {
            const configPath = join(currentDir, this.CONFIG_FILENAME);

            try {
                const file = Bun.file(configPath);
                if (await file.exists()) {
                    const configText = await file.text();
                    const config = JSON5.parse(configText) as Partial<TestConfig>;
                    // Keep updating rootConfig as we find configs higher in the tree
                    rootConfig = config;
                    rootConfigDir = currentDir;
                }
            } catch (error) {
                console.error(ErrorMessages.configFileError(configPath, error));
                // Continue searching in parent directories
            }

            const parentDir = dirname(currentDir);
            if (parentDir === currentDir) {
                // Reached root directory
                break;
            }
            currentDir = parentDir;
        }

        // If no config found in current or parent directories, search common subdirectories
        if (!rootConfig) {
            const commonSubdirs = ['test', 'tests', 'spec', 'src'];
            for (const subdir of commonSubdirs) {
                const subdirPath = join(startDir, subdir);
                const configPath = join(subdirPath, this.CONFIG_FILENAME);

                try {
                    const file = Bun.file(configPath);
                    if (await file.exists()) {
                        const configText = await file.text();
                        rootConfig = JSON5.parse(configText) as Partial<TestConfig>;
                        rootConfigDir = subdirPath;
                        break; // Use the first one found
                    }
                } catch (error) {
                    // Continue searching other subdirectories
                }
            }
        }

        // If we found a root config, merge it with defaults
        if (rootConfig && rootConfigDir) {
            // Handle inheritance if specified
            if (rootConfig.inherit !== undefined && rootConfig.inherit !== false) {
                const parentConfig = await this.loadParentConfig(rootConfigDir);
                const inheritedConfig = this.mergeInheritedConfig(rootConfig, parentConfig);
                return this.mergeWithDefaults(inheritedConfig, rootConfigDir);
            }
            return this.mergeWithDefaults(rootConfig, rootConfigDir);
        }

        // No config found, return defaults with null configDir
        return this.mergeWithDefaults(null, null);
    }

    /**
     * Resolves relative paths in a configuration to absolute paths
     *
     * @param config - Configuration to resolve paths in
     * @param configDir - Directory containing the config file
     * @returns Configuration with resolved absolute paths
     *
     * @internal
     * @remarks
     * This function resolves relative paths in:
     * - Compiler flags (-I, -L, /I, /LIBPATH:, -Wl,-rpath)
     * - Environment variable values (PATH-like and other paths)
     *
     * Only resolves paths that start with ./ or ../
     * Absolute paths and paths without ./ or ../ are left unchanged
     */
    private static resolveConfigPaths(config: Partial<TestConfig>, configDir: string): Partial<TestConfig> {
        const resolved = { ...config };

        // Resolve compiler paths
        if (resolved.compiler?.c) {
            const c = resolved.compiler.c;

            // Resolve GCC paths
            if (c.gcc) {
                c.gcc.flags = this.resolvePathsInFlags(c.gcc.flags || [], configDir);
                if (c.gcc.macosx?.flags) {
                    c.gcc.macosx.flags = this.resolvePathsInFlags(c.gcc.macosx.flags, configDir);
                }
                if (c.gcc.linux?.flags) {
                    c.gcc.linux.flags = this.resolvePathsInFlags(c.gcc.linux.flags, configDir);
                }
                if (c.gcc.windows?.flags) {
                    c.gcc.windows.flags = this.resolvePathsInFlags(c.gcc.windows.flags, configDir);
                }
            }

            // Resolve Clang paths
            if (c.clang) {
                c.clang.flags = this.resolvePathsInFlags(c.clang.flags || [], configDir);
                if (c.clang.macosx?.flags) {
                    c.clang.macosx.flags = this.resolvePathsInFlags(c.clang.macosx.flags, configDir);
                }
                if (c.clang.linux?.flags) {
                    c.clang.linux.flags = this.resolvePathsInFlags(c.clang.linux.flags, configDir);
                }
                if (c.clang.windows?.flags) {
                    c.clang.windows.flags = this.resolvePathsInFlags(c.clang.windows.flags, configDir);
                }
            }

            // Resolve MSVC paths
            if (c.msvc) {
                c.msvc.flags = this.resolvePathsInFlags(c.msvc.flags || [], configDir);
                if (c.msvc.windows?.flags) {
                    c.msvc.windows.flags = this.resolvePathsInFlags(c.msvc.windows.flags, configDir);
                }
            }
        }

        // Resolve environment variable paths
        const env = resolved.environment || resolved.env;
        if (env) {
            // Resolve base environment variables
            for (const [key, value] of Object.entries(env)) {
                // Skip platform-specific keys and default key
                if (key === 'windows' || key === 'macosx' || key === 'linux' || key === 'default') {
                    continue;
                }
                if (typeof value === 'string') {
                    env[key] = this.resolvePathsInEnvValue(value, configDir);
                }
            }

            // Resolve default section
            if (env.default && typeof env.default === 'object') {
                for (const [key, value] of Object.entries(env.default)) {
                    if (typeof value === 'string') {
                        env.default[key] = this.resolvePathsInEnvValue(value, configDir);
                    }
                }
            }

            // Resolve platform-specific environment variables
            for (const platform of ['windows', 'macosx', 'linux'] as const) {
                const platformEnv = env[platform];
                if (platformEnv && typeof platformEnv === 'object') {
                    for (const [key, value] of Object.entries(platformEnv)) {
                        if (typeof value === 'string') {
                            platformEnv[key] = this.resolvePathsInEnvValue(value, configDir);
                        }
                    }
                }
            }
        }

        return resolved;
    }

    /**
     * Resolves relative paths in compiler flags
     */
    private static resolvePathsInFlags(flags: string[], configDir: string): string[] {
        return flags.map(flag => {
            // -I../include → -I/absolute/path/include
            if (flag.startsWith('-I') && flag.length > 2) {
                const path = flag.substring(2);
                if (path.startsWith('./') || path.startsWith('../')) {
                    return '-I' + resolve(configDir, path);
                }
            }
            // -L../lib → -L/absolute/path/lib
            else if (flag.startsWith('-L') && flag.length > 2) {
                const path = flag.substring(2);
                if (path.startsWith('./') || path.startsWith('../')) {
                    return '-L' + resolve(configDir, path);
                }
            }
            // /I../../include → /I/absolute/path/include
            else if (flag.startsWith('/I') && flag.length > 2) {
                const path = flag.substring(2);
                if (path.startsWith('./') || path.startsWith('../') || path.startsWith('.\\') || path.startsWith('..\\')) {
                    return '/I' + resolve(configDir, path);
                }
            }
            // /LIBPATH:../../lib → /LIBPATH:/absolute/path/lib
            else if (flag.startsWith('/LIBPATH:')) {
                const path = flag.substring(9);
                if (path.startsWith('./') || path.startsWith('../') || path.startsWith('.\\') || path.startsWith('..\\')) {
                    return '/LIBPATH:' + resolve(configDir, path);
                }
            }
            // -Wl,-rpath,@executable_path/${CONFIGDIR}/../../build/bin
            // Don't resolve rpath as it may contain special variables
            // These will be resolved later during execution

            return flag;
        });
    }

    /**
     * Resolves relative paths in environment variable values
     */
    private static resolvePathsInEnvValue(value: string, configDir: string): string {
        // PATH-like variables with : or ; separators
        if (value.includes(':') || value.includes(';')) {
            const separator = value.includes(';') ? ';' : ':';
            const parts = value.split(separator);
            return parts.map(part => {
                part = part.trim();
                // Resolve relative paths
                if (part.startsWith('./') || part.startsWith('../') || part.startsWith('.\\') || part.startsWith('..\\')) {
                    // Don't resolve if it contains ${...} variables - those will be expanded later
                    if (!part.includes('${')) {
                        return resolve(configDir, part);
                    }
                }
                return part;
            }).join(separator);
        }
        // Single path value
        else if (value.startsWith('./') || value.startsWith('../') || value.startsWith('.\\') || value.startsWith('..\\')) {
            // Don't resolve if it contains ${...} variables - those will be expanded later
            if (!value.includes('${')) {
                return resolve(configDir, value);
            }
        }

        return value;
    }

    /**
     * Loads parent configuration from parent directory
     *
     * @param currentConfigDir - Directory containing current config file
     * @returns Parent configuration or null if no parent config found
     *
     * @internal
     * @remarks
     * Searches for testme.json5 in parent directories, starting from the parent
     * of the current config directory. Parent configs can also have inherit,
     * creating a chain of inheritance.
     */
    private static async loadParentConfig(currentConfigDir: string): Promise<Partial<TestConfig> | null> {
        const parentDir = dirname(currentConfigDir);

        // If we're at the root, no parent config
        if (parentDir === currentConfigDir) {
            return null;
        }

        // Search for config in parent directory and above
        const { config: parentConfig, configDir: parentConfigDir } = await this.findConfigFile(parentDir);

        if (!parentConfig || !parentConfigDir) {
            return null;
        }

        // Resolve relative paths in parent config to absolute paths
        // This allows child configs to inherit without path depth issues
        const resolvedParentConfig = this.resolveConfigPaths(parentConfig, parentConfigDir);

        // If parent config also has inherit, recursively load its parent
        if (resolvedParentConfig.inherit !== undefined && resolvedParentConfig.inherit !== false) {
            const grandparentConfig = await this.loadParentConfig(parentConfigDir);
            if (grandparentConfig) {
                return this.mergeInheritedConfig(resolvedParentConfig, grandparentConfig);
            }
        }

        return resolvedParentConfig;
    }

    /**
     * Merges child config with parent config based on inherit settings
     *
     * @param childConfig - Child configuration with inherit field
     * @param parentConfig - Parent configuration to inherit from
     * @returns Merged configuration with inherited values
     *
     * @internal
     * @remarks
     * Inheritance modes:
     * - inherit: true → inherit all keys from parent
     * - inherit: ['env', 'compiler'] → inherit only specified keys
     * - inherit: false or undefined → no inheritance
     *
     * Child settings always override parent settings (deep merge for objects).
     */
    private static mergeInheritedConfig(
        childConfig: Partial<TestConfig>,
        parentConfig: Partial<TestConfig> | null
    ): Partial<TestConfig> {
        if (!parentConfig || !childConfig.inherit) {
            return childConfig;
        }

        // Determine which keys to inherit
        const keysToInherit: string[] = childConfig.inherit === true
            ? ['compiler', 'debug', 'execution', 'output', 'patterns', 'services', 'environment', 'env', 'profile']
            : Array.isArray(childConfig.inherit)
            ? childConfig.inherit
            : [];

        const inherited: Partial<TestConfig> = { ...childConfig };

        // Inherit specified keys from parent
        for (const key of keysToInherit) {
            if (key === 'compiler' && parentConfig.compiler) {
                inherited.compiler = this.deepMerge(parentConfig.compiler, childConfig.compiler || {});
            } else if (key === 'debug' && parentConfig.debug) {
                inherited.debug = this.deepMerge(parentConfig.debug, childConfig.debug || {});
            } else if (key === 'execution' && parentConfig.execution) {
                inherited.execution = { ...parentConfig.execution, ...childConfig.execution };
            } else if (key === 'output' && parentConfig.output) {
                inherited.output = { ...parentConfig.output, ...childConfig.output };
            } else if (key === 'patterns' && parentConfig.patterns) {
                inherited.patterns = this.deepMerge(parentConfig.patterns, childConfig.patterns || {});
            } else if (key === 'services' && parentConfig.services) {
                inherited.services = { ...parentConfig.services, ...childConfig.services };
            } else if (key === 'environment') {
                // Prefer 'environment' over 'env' from parent
                const parentEnv = parentConfig.environment || parentConfig.env;
                const childEnv = childConfig.environment || childConfig.env;
                if (parentEnv) {
                    inherited.environment = this.deepMerge(parentEnv, childEnv || {});
                    // Preserve the parent's configDir for env path resolution
                    if ((parentConfig as any)._envConfigDir) {
                        (inherited as any)._envConfigDir = (parentConfig as any)._envConfigDir;
                    }
                }
            } else if (key === 'env') {
                // Legacy support for 'env' - only used if 'environment' not already set
                if (!inherited.environment) {
                    const parentEnv = parentConfig.env || parentConfig.environment;
                    const childEnv = childConfig.env || childConfig.environment;
                    if (parentEnv) {
                        inherited.environment = this.deepMerge(parentEnv, childEnv || {});
                        // Preserve the parent's configDir for env path resolution
                        if ((parentConfig as any)._envConfigDir) {
                            (inherited as any)._envConfigDir = (parentConfig as any)._envConfigDir;
                        }
                    }
                }
            } else if (key === 'profile' && parentConfig.profile && !childConfig.profile) {
                inherited.profile = parentConfig.profile;
            }
        }

        return inherited;
    }

    /**
     * Deep merges two objects, with child values taking precedence
     *
     * @param parent - Parent object
     * @param child - Child object (overrides parent)
     * @returns Merged object
     *
     * @internal
     * @remarks
     * Arrays are concatenated (parent items first, then child items).
     * Objects are recursively merged.
     * Primitives from child override parent.
     */
    private static deepMerge(parent: any, child: any): any {
        if (!parent) return child;
        if (!child) return parent;

        const result = { ...parent };

        for (const key in child) {
            if (child[key] !== undefined) {
                if (Array.isArray(child[key])) {
                    // Concatenate arrays (parent first, then child)
                    const parentArray = Array.isArray(parent[key]) ? parent[key] : [];
                    result[key] = [...parentArray, ...child[key]];
                } else if (typeof child[key] === 'object' && child[key] !== null) {
                    // Recursively merge objects
                    result[key] = this.deepMerge(parent[key], child[key]);
                } else {
                    // Primitives from child override parent
                    result[key] = child[key];
                }
            }
        }

        return result;
    }

    /**
     * Merges user configuration with default values
     *
     * @param userConfig - User-provided configuration (can be null)
     * @param configDir - Directory containing the config file (can be null)
     * @returns Complete configuration with defaults applied
     *
     * @internal
     * @remarks
     * Performs deep merge of user config with defaults, ensuring all required
     * properties exist. The configDir is added to the merged configuration for
     * use in resolving relative paths.
     */
    private static mergeWithDefaults(userConfig: Partial<TestConfig> | null, configDir: string | null): TestConfig {
        const baseConfig = userConfig ? {
            enable: userConfig.enable !== undefined ? userConfig.enable : this.DEFAULT_CONFIG.enable,
            depth: userConfig.depth,
            profile: userConfig.profile, // Include profile from user config
            compiler: {
                ...this.DEFAULT_CONFIG.compiler,
                ...userConfig.compiler,
                c: {
                    ...this.DEFAULT_CONFIG.compiler?.c,
                    ...userConfig.compiler?.c,
                    // Resolve platform-specific compiler selection
                    compiler: this.resolvePlatformCompiler(userConfig.compiler?.c?.compiler)
                }
            },
            debug: userConfig.debug ? {
                // Resolve platform-specific debugger selections for each language
                c: this.resolvePlatformValue(userConfig.debug.c),
                js: this.resolvePlatformValue(userConfig.debug.js),
                ts: this.resolvePlatformValue(userConfig.debug.ts),
                py: this.resolvePlatformValue(userConfig.debug.py),
                go: this.resolvePlatformValue(userConfig.debug.go),
                es: this.resolvePlatformValue(userConfig.debug.es)
            } : undefined,
            execution: {
                ...this.DEFAULT_CONFIG.execution,
                ...userConfig.execution
            },
            output: {
                ...this.DEFAULT_CONFIG.output,
                ...userConfig.output
            },
            patterns: this.mergePlatformPatterns(this.DEFAULT_CONFIG.patterns!, userConfig.patterns),
            services: {
                ...this.DEFAULT_CONFIG.services,
                ...userConfig.services
            },
            // Prefer 'environment' over 'env' for consistency, but support both for backward compatibility
            environment: userConfig.environment || userConfig.env,
            env: undefined // Don't propagate deprecated 'env' key
        } : {
            ...this.DEFAULT_CONFIG,
            // Apply platform-specific pattern merging even when no user config exists
            patterns: this.mergePlatformPatterns(this.DEFAULT_CONFIG.patterns!, null)
        };

        // Add config directory to the configuration
        const result: any = {
            ...baseConfig,
            configDir: configDir || undefined
        };

        // Preserve _envConfigDir if it was set (for inherited env vars)
        if (userConfig && (userConfig as any)._envConfigDir) {
            result._envConfigDir = (userConfig as any)._envConfigDir;
        }

        return result;
    }

    /**
     * Resolves platform-specific compiler selection
     *
     * @param compilerConfig - Compiler configuration (string, object, or undefined)
     * @returns Resolved compiler string or undefined for auto-detect
     *
     * @internal
     * @remarks
     * Handles three configuration modes:
     * 1. Undefined or "default" → returns undefined (auto-detect)
     * 2. String value → returns that compiler for all platforms
     * 3. Platform map → returns platform-specific compiler or undefined if not specified
     */
    private static resolvePlatformCompiler(compilerConfig: string | { windows?: string; macosx?: string; linux?: string } | undefined): string | undefined {
        return this.resolvePlatformValue(compilerConfig);
    }

    /**
     * Generic platform-specific value resolution
     *
     * @param config - Configuration value (string, object, or undefined)
     * @returns Resolved string or undefined
     *
     * @internal
     * @remarks
     * Shared implementation for resolving platform-specific configuration values
     */
    private static resolvePlatformValue(config: string | { windows?: string; macosx?: string; linux?: string } | undefined): string | undefined {
        // If unset or "default", return undefined (triggers auto-detect)
        if (!config || config === 'default') {
            return undefined;
        }

        // If string, return as-is
        if (typeof config === 'string') {
            return config;
        }

        // If object, resolve based on current platform
        const platform = process.platform === 'win32' ? 'windows' :
                        process.platform === 'darwin' ? 'macosx' : 'linux';

        const platformValue = config[platform];

        // If platform not specified in map, return undefined (auto-detect)
        return platformValue || undefined;
    }

    /**
     * Merges base patterns with user patterns and applies platform-specific overrides
     *
     * @param basePatterns - Default pattern configuration
     * @param userPatterns - User-provided pattern configuration (can be null)
     * @returns Merged pattern configuration with platform-specific patterns blended
     *
     * @internal
     * @remarks
     * Platform-specific patterns are deep blended with base patterns:
     * 1. Start with base include/exclude patterns
     * 2. Merge with user include/exclude patterns (if provided)
     * 3. Add platform-specific patterns (windows/macosx/linux) to the merged base
     * 4. Platform patterns augment rather than replace the base patterns
     * 5. ALWAYS filters out non-current platform patterns from the result
     */
    private static mergePlatformPatterns(basePatterns: any, userPatterns: any): any {
        // Determine current platform
        const platform = process.platform === 'win32' ? 'windows' :
                        process.platform === 'darwin' ? 'macosx' : 'linux';

        // Merge base patterns with user patterns (if provided)
        const merged = {
            include: [...(basePatterns.include || []), ...(userPatterns?.include || [])],
            exclude: [...(basePatterns.exclude || []), ...(userPatterns?.exclude || [])]
        };

        // Deep blend platform-specific patterns from both base and user configs
        // Start with base platform patterns
        const basePlatformPatterns = basePatterns[platform];
        if (basePlatformPatterns) {
            if (basePlatformPatterns.include) {
                merged.include = [...merged.include, ...basePlatformPatterns.include];
            }
            if (basePlatformPatterns.exclude) {
                merged.exclude = [...merged.exclude, ...basePlatformPatterns.exclude];
            }
        }

        // Then add user platform patterns (if provided)
        if (userPatterns) {
            const userPlatformPatterns = userPatterns[platform];
            if (userPlatformPatterns) {
                if (userPlatformPatterns.include) {
                    merged.include = [...merged.include, ...userPlatformPatterns.include];
                }
                if (userPlatformPatterns.exclude) {
                    merged.exclude = [...merged.exclude, ...userPlatformPatterns.exclude];
                }
            }
        }

        return merged;
    }

    /**
     * Loads configuration from a specific file path
     *
     * @param configPath - Path to configuration file
     * @returns Merged configuration with defaults
     * @throws Error if file cannot be loaded or parsed
     *
     * @remarks
     * Directly loads a configuration file from a specific path, useful when
     * you already know the exact configuration file location.
     */
    static async loadConfigFromFile(configPath: string): Promise<TestConfig> {
        try {
            const file = Bun.file(configPath);
            const configText = await file.text();
            const userConfig = JSON5.parse(configText) as Partial<TestConfig>;
            const configDir = dirname(configPath);
            return this.mergeWithDefaults(userConfig, configDir);
        } catch (error) {
            throw new Error(ErrorMessages.configFileError(configPath, error));
        }
    }

    /**
     * Searches for testme.json5 files in immediate subdirectories
     *
     * @param rootDir - Directory to search subdirectories of
     * @returns Array of config directories that contain testme.json5
     *
     * @remarks
     * Only searches one level deep - does not recursively search nested directories.
     * Results are sorted alphabetically for consistent ordering.
     */
    static async findSubdirectoryConfigs(rootDir: string): Promise<string[]> {
        const configDirs: string[] = [];

        try {
            const entries = await readdir(rootDir);

            for (const entry of entries) {
                const entryPath = join(rootDir, entry);

                try {
                    const stats = await stat(entryPath);

                    if (stats.isDirectory()) {
                        const configPath = join(entryPath, this.CONFIG_FILENAME);
                        const file = Bun.file(configPath);

                        if (await file.exists()) {
                            configDirs.push(entryPath);
                        }
                    }
                } catch (error) {
                    // Skip directories we can't read
                    continue;
                }
            }
        } catch (error) {
            // If we can't read the root directory, return empty array
            return [];
        }

        return configDirs.sort(); // Sort for consistent ordering
    }

    /**
     * Returns a copy of the default configuration
     *
     * @returns Default configuration object
     *
     * @remarks
     * Returns a shallow copy to prevent modification of the default values.
     * Useful for testing or programmatic configuration creation.
     */
    static getDefaultConfig(): TestConfig {
        return { ...this.DEFAULT_CONFIG };
    }
}