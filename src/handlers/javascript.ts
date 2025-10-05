import {
    TestFile,
    TestResult,
    TestConfig,
    TestStatus,
    TestType,
} from "../types.ts";
import { BaseTestHandler } from "./base.ts";

/*
 Handler for executing JavaScript tests (.tst.js files)
 Uses Bun runtime to execute JavaScript test files directly
 */
export class JavaScriptTestHandler extends BaseTestHandler {
    /*
     Checks if this handler can process the given test file
     @param file Test file to check
     @returns true if file is a JavaScript test
     */
    canHandle(file: TestFile): boolean {
        return file.type === TestType.JavaScript;
    }

    /*
     Executes JavaScript test file using Bun runtime
     @param file JavaScript test file to execute
     @param config Test execution configuration
     @returns Promise resolving to test results
     */
    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        const { result, duration } = await this.measureExecution(async () => {
            return await this.runCommand("bun", [file.path], {
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
