import type { TestConfig } from './types.ts';
import { join, dirname } from 'path';
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
            }
        },
        execution: {
            timeout: 30000, // 30 seconds
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
     * values to ensure all required properties are present.
     */
    static async findConfig(startDir: string): Promise<TestConfig> {
        const { config, configDir } = await this.findConfigFile(startDir);
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
            compiler: {
                ...this.DEFAULT_CONFIG.compiler,
                ...userConfig.compiler,
                c: {
                    ...this.DEFAULT_CONFIG.compiler?.c,
                    ...userConfig.compiler?.c
                }
            },
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
            env: userConfig.env // Include environment variables from user config
        } : { ...this.DEFAULT_CONFIG };

        // Add config directory to the configuration
        return {
            ...baseConfig,
            configDir: configDir || undefined
        };
    }

    /**
     * Merges base patterns with user patterns and applies platform-specific overrides
     *
     * @param basePatterns - Default pattern configuration
     * @param userPatterns - User-provided pattern configuration
     * @returns Merged pattern configuration with platform-specific patterns blended
     *
     * @internal
     * @remarks
     * Platform-specific patterns are deep blended with base patterns:
     * 1. Start with base include/exclude patterns
     * 2. Merge with user include/exclude patterns
     * 3. Add platform-specific patterns (windows/macosx/linux) to the merged base
     * 4. Platform patterns augment rather than replace the base patterns
     */
    private static mergePlatformPatterns(basePatterns: any, userPatterns: any): any {
        if (!userPatterns) {
            return basePatterns;
        }

        // Determine current platform
        const platform = process.platform === 'win32' ? 'windows' :
                        process.platform === 'darwin' ? 'macosx' : 'linux';

        // Merge base patterns
        const merged = {
            include: [...(basePatterns.include || []), ...(userPatterns.include || [])],
            exclude: [...(basePatterns.exclude || []), ...(userPatterns.exclude || [])]
        };

        // Deep blend platform-specific patterns
        const platformPatterns = userPatterns[platform];
        if (platformPatterns) {
            if (platformPatterns.include) {
                merged.include = [...merged.include, ...platformPatterns.include];
            }
            if (platformPatterns.exclude) {
                merged.exclude = [...merged.exclude, ...platformPatterns.exclude];
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