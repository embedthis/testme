import type {
    TestFile,
    TestResult,
    TestConfig,
    TestHandler,
} from "../types.ts";
import { TestStatus } from "../types.ts";
import { GlobExpansion } from "../utils/glob-expansion.ts";
import { ErrorMessages } from "../utils/error-messages.ts";
import { PlatformDetector } from "../platform/detector.ts";
import { countAssertions } from "../utils/assertion-counter.ts";
import { resolve } from "path";

/*
 Abstract base class for all test handlers
 Provides common functionality for running commands and measuring execution time
 */
export abstract class BaseTestHandler implements TestHandler {
    /*
     Determines if this handler can execute the given test file
     @param file Test file to check
     @returns true if handler can process this file type
     */
    abstract canHandle(file: TestFile): boolean;

    /*
     Executes the test file and returns results
     @param file Test file to execute
     @param config Test execution configuration
     @returns Promise resolving to test results
     */
    abstract execute(file: TestFile, config: TestConfig): Promise<TestResult>;

    /*
     Optional preparation step before test execution
     @param _file Test file to prepare
     */
    async prepare?(_file: TestFile): Promise<void> {
        // Default implementation - no preparation needed
    }

    /*
     Optional cleanup step after test execution
     @param _file Test file to clean up
     @param _config Test configuration that may affect cleanup behavior
     */
    async cleanup?(_file: TestFile, _config?: TestConfig): Promise<void> {
        // Default implementation - no cleanup needed
    }

    /*
     Executes a system command with timeout and environment options
     @param command Command to execute
     @param args Command arguments
     @param options Execution options (cwd, timeout, env)
     @returns Promise resolving to command execution results
     */
    protected async runCommand(
        command: string,
        args: string[],
        options: {
            cwd?: string;
            timeout?: number;
            env?: Record<string, string>;
        } = {}
    ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
        // Build environment - be defensive about PATH handling on Windows
        const spawnEnv: Record<string, string> = {};

        // Copy all environment variables
        for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined) {
                spawnEnv[key] = value;
            }
        }

        // Merge options.env
        for (const [key, value] of Object.entries(options.env || {})) {
            spawnEnv[key] = value;
        }

        // On Windows, if we have a custom PATH, ensure it completely replaces any variants
        if (PlatformDetector.isWindows() && options.env?.PATH) {
            // Remove any case variants from process.env, keep only our uppercase PATH
            for (const key of Object.keys(spawnEnv)) {
                if (key !== 'PATH' && key.toUpperCase() === 'PATH') {
                    delete spawnEnv[key];
                }
            }
        }

        const proc = Bun.spawn([command, ...args], {
            cwd: options.cwd,
            env: spawnEnv,
            stdout: "pipe",
            stderr: "pipe",
            stdin: PlatformDetector.isWindows() ? "pipe" : "ignore",
        });

        // On Windows, close stdin pipe immediately to prevent process from waiting for input
        if (PlatformDetector.isWindows() && proc.stdin) {
            proc.stdin.end();
        }

        let timeoutId: Timer | undefined;
        let timedOut = false;

        // Set up timeout if specified
        if (options.timeout) {
            timeoutId = setTimeout(() => {
                timedOut = true;
                proc.kill();
            }, options.timeout);
        }

        try {
            // Read stdout/stderr concurrently with waiting for process exit
            // This ensures we capture output even if the process crashes
            const [result, stdout, stderr] = await Promise.all([
                proc.exited,
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text(),
            ]);

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (timedOut) {
                return {
                    exitCode: -1,
                    stdout: stdout,
                    stderr: stderr + "\nProcess timed out",
                };
            }

            return {
                exitCode: result,
                stdout,
                stderr,
            };
        } catch (error) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // Provide helpful error messages for common failures
            let errorMessage = `Failed to execute command: ${error}`;

            const errorStr = String(error);
            // Detect "command not found" or "executable not found" errors
            if (errorStr.includes("ENOENT") || errorStr.includes("not found") ||
                errorStr.includes("No such file")) {

                // Check if it's a compiler
                if (command === "gcc" || command === "clang" || command === "cl" ||
                    command === "cl.exe" || command.includes("gcc") || command.includes("clang")) {
                    errorMessage = ErrorMessages.compilerNotFound(command);
                }
                // Check if it's a runtime dependency
                else if (command === "python" || command === "python3" || command === "go" ||
                         command === "node" || command === "bun") {
                    errorMessage = ErrorMessages.dependencyNotFound(command);
                }
                else {
                    errorMessage = `Executable not found in $PATH: "${command}"

Common solutions:
1. Install ${command} using your system's package manager
2. Add ${command}'s directory to your PATH environment variable
3. Specify the full path to ${command}

Original error: ${error}`;
                }
            }

            return {
                exitCode: -1,
                stdout: "",
                stderr: errorMessage,
            };
        }
    }

    /*
     Generates environment variables for test execution
     @param config Test configuration that may include verbose mode settings
     @returns Promise resolving to environment variables object to pass to test processes
     */
    protected async getTestEnvironment(
        config: TestConfig,
        file?: TestFile,
        compiler?: string
    ): Promise<Record<string, string>> {
        const env: Record<string, string> = {};

        // Set TESTME_VERBOSE if verbose mode is enabled
        if (config.output?.verbose) {
            env.TESTME_VERBOSE = "1";
        }

        // Set TESTME_DEPTH if depth is specified
        if (config.execution?.depth !== undefined) {
            env.TESTME_DEPTH = config.execution.depth.toString();
        }

        // Set TESTME_ITERATIONS (default to 1 if not specified)
        env.TESTME_ITERATIONS = (config.execution?.iterations ?? 1).toString();

        // Create special variables for expansion if we have file context
        let specialVars;
        if (file) {
            specialVars = GlobExpansion.createSpecialVariables(
                file.artifactDir,
                file.directory,
                config.configDir || file.directory,
                compiler,
                config.profile
            );

            // Export special variables as environment variables for tests
            if (specialVars.PLATFORM !== undefined) env.TESTME_PLATFORM = specialVars.PLATFORM;
            if (specialVars.PROFILE !== undefined) env.TESTME_PROFILE = specialVars.PROFILE;
            if (specialVars.OS !== undefined) env.TESTME_OS = specialVars.OS;
            if (specialVars.ARCH !== undefined) env.TESTME_ARCH = specialVars.ARCH;
            if (specialVars.CC !== undefined) env.TESTME_CC = specialVars.CC;
            if (specialVars.TESTDIR !== undefined) env.TESTME_TESTDIR = specialVars.TESTDIR;
            if (specialVars.CONFIGDIR !== undefined) env.TESTME_CONFIGDIR = specialVars.CONFIGDIR;
        }

        // Add environment variables from configuration with expansion
        // Support both 'environment' (new) and 'env' (legacy) keys
        const configEnv = config.environment || config.env;
        if (configEnv) {
            // Use _envConfigDir if available (for inherited env vars), otherwise use configDir
            // This ensures inherited paths are resolved relative to where they were defined
            const baseDir = (config as any)._envConfigDir || config.configDir || process.cwd();

            // Determine current platform
            const platform = PlatformDetector.isWindows() ? 'windows' :
                           PlatformDetector.isMacOS() ? 'macosx' : 'linux';

            // First, process base environment variables (exclude platform keys)
            for (const [key, value] of Object.entries(configEnv)) {
                // Skip platform-specific section keys (legacy format)
                if (key === 'windows' || key === 'macosx' || key === 'linux' || key === 'default') {
                    continue;
                }

                let resolvedValue: string | undefined;

                // Handle object values with default/platform pattern
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    // Cast to our platform object type
                    const platformObj = value as { default?: string; windows?: string; macosx?: string; linux?: string };
                    // Try platform-specific value first, fall back to default
                    resolvedValue = platformObj[platform as 'windows' | 'macosx' | 'linux'] || platformObj.default;
                } else if (value === null || value === undefined) {
                    // Skip null/undefined values
                    continue;
                } else {
                    // Convert non-string values (numbers, booleans) to strings
                    resolvedValue = typeof value === 'string' ? value : String(value);
                }

                // Skip if no value resolved
                if (!resolvedValue) {
                    continue;
                }

                // Expand ${...} references in environment variable values
                let expandedValue = await GlobExpansion.expandSingle(
                    resolvedValue,
                    baseDir,
                    specialVars
                );

                // Normalize PATH variable on Windows (Path, path -> PATH)
                let envKey = key;
                if (PlatformDetector.isWindows() && key.toUpperCase() === 'PATH') {
                    envKey = 'PATH';
                    expandedValue = this.convertPathSeparators(expandedValue);
                }

                // Convert relative paths in PATH to absolute paths (based on config directory)
                if (key.toUpperCase() === 'PATH' || key === 'LD_LIBRARY_PATH' || key === 'DYLD_LIBRARY_PATH') {
                    expandedValue = this.resolvePathComponents(expandedValue, baseDir);
                }

                env[envKey] = expandedValue;
            }

            // Then, merge default environment variables (legacy format with env.default section)
            const defaultEnv = configEnv['default'];
            if (defaultEnv && typeof defaultEnv === 'object') {
                for (const [key, value] of Object.entries(defaultEnv)) {
                    if (value === null || value === undefined) {
                        continue;
                    }
                    // Convert non-string values to strings
                    const stringValue = typeof value === 'string' ? value : String(value);
                    let expandedValue = await GlobExpansion.expandSingle(
                        stringValue,
                        baseDir,
                        specialVars
                    );
                    // Normalize PATH variable on Windows (Path, path -> PATH)
                    let envKey = key;
                    if (PlatformDetector.isWindows() && key.toUpperCase() === 'PATH') {
                        envKey = 'PATH';
                        expandedValue = this.convertPathSeparators(expandedValue);
                    }

                    // Convert relative paths in PATH to absolute paths (based on config directory)
                    if (key.toUpperCase() === 'PATH' || key === 'LD_LIBRARY_PATH' || key === 'DYLD_LIBRARY_PATH') {
                        expandedValue = this.resolvePathComponents(expandedValue, baseDir);
                    }

                    env[envKey] = expandedValue;
                }
            }

            // Finally, merge platform-specific environment variables (legacy format)
            // These override both base and default values
            const platformEnv = configEnv[platform];
            if (platformEnv && typeof platformEnv === 'object') {
                for (const [key, value] of Object.entries(platformEnv)) {
                    if (value === null || value === undefined) {
                        continue;
                    }
                    // Convert non-string values to strings
                    const stringValue = typeof value === 'string' ? value : String(value);
                    let expandedValue = await GlobExpansion.expandSingle(
                        stringValue,
                        baseDir,
                        specialVars
                    );
                    // Normalize PATH variable on Windows (Path, path -> PATH)
                    let envKey = key;
                    if (PlatformDetector.isWindows() && key.toUpperCase() === 'PATH') {
                        envKey = 'PATH';
                        expandedValue = this.convertPathSeparators(expandedValue);
                    }

                    // Convert relative paths in PATH to absolute paths (based on config directory)
                    if (key.toUpperCase() === 'PATH' || key === 'LD_LIBRARY_PATH' || key === 'DYLD_LIBRARY_PATH') {
                        expandedValue = this.resolvePathComponents(expandedValue, baseDir);
                    }

                    env[envKey] = expandedValue;
                }
            }
        }

        return env;
    }

    /*
     Converts Unix path separators (:) to Windows path separators (;)
     @param path Path string with Unix-style separators
     @returns Path string with Windows-style separators
     */
    private convertPathSeparators(path: string): string {
        // Replace : with ; but avoid replacing : in drive letters (e.g., C:)
        // Windows drive letters are followed by \ or / or end of string
        return path.replace(/:(?![\\\/]|$)/g, ';');
    }

    /*
     Resolves relative path components in PATH-like variables to absolute paths
     @param pathValue PATH-like variable value (colon or semicolon separated)
     @param baseDir Base directory for resolving relative paths (typically config directory)
     @returns Path value with relative components resolved to absolute paths
     */
    private resolvePathComponents(pathValue: string, baseDir: string): string {
        // Determine separator based on platform
        const sep = PlatformDetector.isWindows() ? ';' : ':';

        // Split by separator, resolve each component, rejoin
        const components = pathValue.split(sep);
        const resolved = components.map(component => {
            // Skip empty components
            if (!component) return component;

            // Skip if already absolute (starts with / on Unix, or drive letter on Windows)
            if (component.startsWith('/') || /^[a-zA-Z]:/.test(component)) {
                return component;
            }

            // Skip environment variable references like ${PATH}, $PATH, %PATH%
            if (component.includes('$') || component.includes('%')) {
                return component;
            }

            // Resolve relative path to absolute based on baseDir
            return resolve(baseDir, component);
        });

        return resolved.join(sep);
    }

    /*
     Creates a standardized TestResult object
     @param file Test file that was executed
     @param status Execution status
     @param duration Execution time in milliseconds
     @param output Combined output from the test
     @param error Error message if test failed
     @param exitCode Process exit code
     @returns TestResult object
     */
    protected createTestResult(
        file: TestFile,
        status: TestStatus,
        duration: number,
        output: string,
        error?: string,
        exitCode?: number
    ): TestResult {
        // Count assertions in output (✓ and ✗ symbols from test macros)
        const assertions = countAssertions(output);

        return {
            file,
            status,
            duration,
            output,
            error,
            exitCode,
            assertions: assertions || undefined,
        };
    }

    /*
     Measures execution time of an async function
     @param fn Function to measure
     @returns Promise resolving to result and duration
     */
    protected async measureExecution<T>(
        fn: () => Promise<T>
    ): Promise<{ result: T; duration: number }> {
        const startTime = performance.now();
        const result = await fn();
        const duration = performance.now() - startTime;

        return { result, duration };
    }

    /**
     * Combines stdout and stderr into formatted output
     *
     * @param stdout - Standard output from test execution
     * @param stderr - Standard error from test execution
     * @returns Formatted combined output
     *
     * @remarks
     * This is a standardized output format used across all test handlers.
     * Empty output sections are omitted.
     */
    protected combineOutput(stdout: string, stderr: string): string {
        let output = "";
        if (stdout.trim()) {
            output += `STDOUT:\n${stdout}\n`;
        }
        if (stderr.trim()) {
            output += `STDERR:\n${stderr}`;
        }
        return output.trim();
    }

    /**
     * Creates an error result for when test execution fails unexpectedly
     *
     * @param file - Test file that failed
     * @param error - Error that occurred
     * @param duration - Duration before failure (optional)
     * @returns TestResult with Error status
     *
     * @remarks
     * Use this for infrastructure failures (compilation errors, runtime errors, etc.)
     * rather than test assertion failures.
     */
    protected createErrorResult(
        file: TestFile,
        error: unknown,
        duration: number = 0
    ): TestResult {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return this.createTestResult(
            file,
            TestStatus.Error,
            duration,
            "",
            `Test execution error in ${file.path}: ${errorMessage}`
        );
    }

    /*
     Displays environment information when showCommands is enabled
     @param config Test configuration to check for showCommands flag
     @param file Test file being executed
     @param testEnv Environment variables that will be passed to the test
     */
    protected async displayEnvironmentInfo(
        config: TestConfig,
        file: TestFile,
        testEnv: Record<string, string>
    ): Promise<void> {
        if (!config.execution?.showCommands) {
            return;
        }

        console.log(`📄 Config used for ${file.name}:`);
        console.log(this.formatConfig(config));

        // Show environment variables defined by TestMe
        if (Object.keys(testEnv).length > 0) {
            console.log(`\n🌍 TestMe environment variables:`);
            for (const [key, value] of Object.entries(testEnv)) {
                console.log(`   ${key}=${value}`);
            }
        }

        // Show full environment if verbose mode is enabled
        if (config.output?.verbose) {
            console.log(`\n🌍 Full environment (${Object.keys(process.env).length} variables):`);
            const sortedKeys = Object.keys(process.env).sort();
            for (const key of sortedKeys) {
                console.log(`   ${key}=${process.env[key]}`);
            }
        }
    }

    /*
     Formats the configuration for display when --show is used
     @param config Test configuration to format
     @returns Formatted JSON string with relevant config sections
     */
    protected formatConfig(config: TestConfig): string {
        // Create a clean config object for display
        const displayConfig = {
            configDir: config.configDir || '(none - using test file directory)',
            compiler: config.compiler,
            execution: {
                timeout: config.execution?.timeout,
                parallel: config.execution?.parallel,
                workers: config.execution?.workers,
                keepArtifacts: config.execution?.keepArtifacts,
                stepMode: config.execution?.stepMode,
                depth: config.execution?.depth,
                debugMode: config.execution?.debugMode,
                showCommands: config.execution?.showCommands,
                iterations: config.execution?.iterations,
            },
            output: config.output,
            patterns: config.patterns,
            services: config.services,
            environment: config.environment || config.env,
        };

        // Remove undefined values for cleaner output
        const cleanConfig = this.removeUndefined(displayConfig);

        return JSON.stringify(cleanConfig, null, 2);
    }

    /*
     Recursively removes undefined values from an object for cleaner JSON output
     @param obj Object to clean
     @returns Object with undefined values removed
     */
    protected removeUndefined(obj: any): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.removeUndefined(item));
        }

        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                result[key] = this.removeUndefined(value);
            }
        }

        return result;
    }
}
