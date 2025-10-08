import {
    TestFile,
    TestResult,
    TestConfig,
    TestStatus,
    TestHandler,
} from "../types.ts";
import { GlobExpansion } from "../utils/glob-expansion.ts";
import { ErrorMessages } from "../utils/error-messages.ts";
import { PlatformDetector } from "../platform/detector.ts";

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
     @param file Test file to prepare
     */
    async prepare?(file: TestFile): Promise<void> {
        // Default implementation - no preparation needed
    }

    /*
     Optional cleanup step after test execution
     @param file Test file to clean up
     @param config Test configuration that may affect cleanup behavior
     */
    async cleanup?(file: TestFile, config?: TestConfig): Promise<void> {
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
        // Build environment - be defensive about PATH handling
        const spawnEnv: Record<string, string> = {};

        // Copy process.env, but skip PATH variants to avoid corruption
        for (const [key, value] of Object.entries(process.env)) {
            if (key.toUpperCase() !== 'PATH') {
                spawnEnv[key] = value || '';
            }
        }

        // Then add our options.env (which may include clean PATH)
        for (const [key, value] of Object.entries(options.env || {})) {
            spawnEnv[key] = value;
        }

        // On Windows, normalize PATH key and ensure it's set correctly
        if (PlatformDetector.isWindows() && spawnEnv.PATH) {
            // Remove any case variants, keep only uppercase PATH
            delete spawnEnv.Path;
            delete spawnEnv.path;
        }

        const proc = Bun.spawn([command, ...args], {
            cwd: options.cwd,
            env: spawnEnv,
            stdout: "pipe",
            stderr: "pipe",
            stdin: "ignore",
        });

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
            const result = await proc.exited;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            const stdout = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();

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
        }

        // Add environment variables from configuration with expansion
        if (config.env) {
            const baseDir = config.configDir || process.cwd();

            // Determine current platform
            const platform = PlatformDetector.isWindows() ? 'windows' :
                           PlatformDetector.isMacOS() ? 'macosx' : 'linux';

            // First, process base environment variables (exclude platform keys)
            for (const [key, value] of Object.entries(config.env)) {
                // Skip platform-specific keys
                if (key === 'windows' || key === 'macosx' || key === 'linux') {
                    continue;
                }
                // Expand ${...} references in environment variable values
                let expandedValue = await GlobExpansion.expandSingle(
                    value,
                    baseDir,
                    specialVars
                );
                // Normalize PATH variable on Windows (Path, path -> PATH)
                let envKey = key;
                if (PlatformDetector.isWindows() && key.toUpperCase() === 'PATH') {
                    envKey = 'PATH';
                    expandedValue = this.convertPathSeparators(expandedValue);
                }
                env[envKey] = expandedValue;
            }

            // Then, merge platform-specific environment variables
            const platformEnv = config.env[platform];
            if (platformEnv) {
                for (const [key, value] of Object.entries(platformEnv)) {
                    let expandedValue = await GlobExpansion.expandSingle(
                        value,
                        baseDir,
                        specialVars
                    );
                    // Normalize PATH variable on Windows (Path, path -> PATH)
                    let envKey = key;
                    if (PlatformDetector.isWindows() && key.toUpperCase() === 'PATH') {
                        envKey = 'PATH';
                        expandedValue = this.convertPathSeparators(expandedValue);
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
        return {
            file,
            status,
            duration,
            output,
            error,
            exitCode,
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
}
