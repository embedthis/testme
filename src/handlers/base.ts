import { TestFile, TestResult, TestConfig, TestStatus, TestHandler } from '../types.ts';

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
        const proc = Bun.spawn([command, ...args], {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            stdout: 'pipe',
            stderr: 'pipe'
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
                    stderr: stderr + '\nProcess timed out'
                };
            }

            return {
                exitCode: result,
                stdout,
                stderr
            };
        } catch (error) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            return {
                exitCode: -1,
                stdout: '',
                stderr: `Failed to execute command: ${error}`
            };
        }
    }

    /*
     Generates environment variables for test execution
     @param config Test configuration that may include verbose mode settings
     @returns Environment variables object to pass to test processes
     */
    protected getTestEnvironment(config: TestConfig): Record<string, string> {
        const env: Record<string, string> = {};

        // Set TESTME_VERBOSE if verbose mode is enabled
        if (config.output?.verbose) {
            env.TESTME_VERBOSE = '1';
        }

        // Set TESTME_DEPTH if depth is specified
        if (config.execution?.depth !== undefined) {
            env.TESTME_DEPTH = config.execution.depth.toString();
        }

        return env;
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
            exitCode
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
}