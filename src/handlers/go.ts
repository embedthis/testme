import {
    TestFile,
    TestResult,
    TestConfig,
    TestStatus,
    TestType,
} from "../types.ts";
import { BaseTestHandler } from "./base.ts";

/**
 * Handler for executing Go tests (.tst.go files)
 * Uses `go run` command to execute Go test files directly
 */
export class GoTestHandler extends BaseTestHandler {
    /**
     * Checks if this handler can process the given test file
     *
     * @param file - Test file to check
     * @returns true if file is a Go test
     */
    canHandle(file: TestFile): boolean {
        return file.type === TestType.Go;
    }

    /**
     * Executes Go test file using `go run` command
     *
     * @param file - Go test file to execute
     * @param config - Test execution configuration
     * @returns Promise resolving to test results
     *
     * @remarks
     * Uses `go run` to compile and execute Go programs in one step.
     * Tests should use standard exit codes: 0 for success, non-zero for failure.
     * Go test files must contain a valid main package and main() function.
     */
    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        const { result, duration } = await this.measureExecution(async () => {
            return await this.runCommand("go", ["run", file.path], {
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
}
