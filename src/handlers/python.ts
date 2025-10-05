import {
    TestFile,
    TestResult,
    TestConfig,
    TestStatus,
    TestType,
} from "../types.ts";
import { BaseTestHandler } from "./base.ts";

/**
 * Handler for executing Python tests (.tst.py files)
 * Uses python3/python command to execute Python test files directly
 */
export class PythonTestHandler extends BaseTestHandler {
    /**
     * Checks if this handler can process the given test file
     *
     * @param file - Test file to check
     * @returns true if file is a Python test
     */
    canHandle(file: TestFile): boolean {
        return file.type === TestType.Python;
    }

    /**
     * Executes Python test file using python3 runtime
     *
     * @param file - Python test file to execute
     * @param config - Test execution configuration
     * @returns Promise resolving to test results
     *
     * @remarks
     * Tries python3 first (preferred), falls back to python if python3 is not available.
     * Tests should use standard exit codes: 0 for success, non-zero for failure.
     */
    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        const { result, duration } = await this.measureExecution(async () => {
            // Try python3 first, fall back to python
            const pythonCommand = await this.getPythonCommand();

            return await this.runCommand(pythonCommand, [file.path], {
                cwd: file.directory,
                timeout: config.execution?.timeout || 30000,
                env: await this.getTestEnvironment(config),
            });
        });

        const status =
            result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
        const output = this.combineOutput(result.stdout, result.stderr);
        const error = result.exitCode !== 0 ? result.stderr : undefined;

        return this.createTestResult(
            file,
            status,
            duration,
            output,
            error,
            result.exitCode
        );
    }

    /**
     * Determines which Python command to use (python3 or python)
     *
     * @returns Promise resolving to the Python command to use
     *
     * @remarks
     * Checks for python3 first (modern systems), falls back to python.
     * Caches the result for performance.
     */
    private async getPythonCommand(): Promise<string> {
        // Try python3 first (preferred on most systems)
        try {
            const proc = Bun.spawn(["which", "python3"], {
                stdout: "pipe",
                stderr: "pipe"
            });
            const exitCode = await proc.exited;
            if (exitCode === 0) {
                return "python3";
            }
        } catch {
            // Fall through to try python
        }

        // Fall back to python
        try {
            const proc = Bun.spawn(["which", "python"], {
                stdout: "pipe",
                stderr: "pipe"
            });
            const exitCode = await proc.exited;
            if (exitCode === 0) {
                return "python";
            }
        } catch {
            // Fall through
        }

        // Default to python3 and let it fail if not available
        return "python3";
    }
}
