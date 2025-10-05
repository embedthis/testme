import {
    TestFile,
    TestResult,
    TestConfig,
    TestStatus,
    TestType,
} from "../types.ts";
import { BaseTestHandler } from "./base.ts";
import { PermissionManager } from "../platform/permissions.ts";
import { ShellDetector, ShellType } from "../platform/shell.ts";

/*
 Handler for executing shell script tests (.tst.sh files)
 Automatically detects the appropriate shell and makes scripts executable
 */
export class ShellTestHandler extends BaseTestHandler {
    /*
     Checks if this handler can process the given test file
     @param file Test file to check
     @returns true if file is a shell test
     */
    canHandle(file: TestFile): boolean {
        return file.type === TestType.Shell ||
               file.type === TestType.PowerShell ||
               file.type === TestType.Batch;
    }

    /*
     Prepares shell script for execution by making it executable
     @param file Shell script test file
     @throws Error if operation fails
     */
    async prepare(file: TestFile): Promise<void> {
        // Make shell script executable (no-op on Windows)
        try {
            await PermissionManager.makeExecutable(file.path);
        } catch (error) {
            throw new Error(`Failed to make shell script executable: ${error}`);
        }
    }

    /*
        Executes shell script test and returns results
        @param file Shell test file to execute
        @param config Test execution configuration
        @returns Promise resolving to test results
     */
    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        const { result, duration } = await this.measureExecution(async () => {
            // Determine shell to use
            const shell = await ShellDetector.detectShell(file.path);
            const shellType = ShellDetector.getShellTypeFromExtension(file.path);
            const args = ShellDetector.getShellArgs(shellType, file.path);

            return await this.runCommand(shell, args, {
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

    /*
     Combines stdout and stderr into formatted output
     @param stdout Standard output from shell execution
     @param stderr Standard error from shell execution
     @returns Formatted combined output
     */
    private combineOutput(stdout: string, stderr: string): string {
        let output = "";
        if (stdout.trim()) {
            output += `STDOUT:\n${stdout}\n`;
        }
        if (stderr.trim()) {
            output += `STDERR:\n${stderr}`;
        }
        return output.trim();
    }
}
