import { TestFile, TestResult, TestConfig, TestStatus, TestType } from '../types.ts';
import { BaseTestHandler } from './base.ts';

/*
 Handler for executing TypeScript tests (.tst.ts files)
 Uses Bun runtime to execute TypeScript test files directly (with transpilation)
 */
export class TypeScriptTestHandler extends BaseTestHandler {
    /*
     Checks if this handler can process the given test file
     @param file Test file to check
     @returns true if file is a TypeScript test
     */
    canHandle(file: TestFile): boolean {
        return file.type === TestType.TypeScript;
    }

    /*
     Executes TypeScript test file using Bun runtime
     Bun can execute TypeScript files directly with built-in transpilation
     @param file TypeScript test file to execute
     @param config Test execution configuration
     @returns Promise resolving to test results
     */
    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        const { result, duration } = await this.measureExecution(async () => {
            // Bun can execute TypeScript files directly
            return await this.runCommand('bun', [file.path], {
                cwd: file.directory,
                timeout: config.execution?.timeout || 30000,
                env: await this.getTestEnvironment(config)
            });
        });

        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
        const output = this.combineOutput(result.stdout, result.stderr);
        const error = result.exitCode !== 0 ? result.stderr : undefined;

        return this.createTestResult(file, status, duration, output, error, result.exitCode);
    }

    /*
     Combines stdout and stderr into formatted output
     @param stdout Standard output from TypeScript execution
     @param stderr Standard error from TypeScript execution
     @returns Formatted combined output
     */
    private combineOutput(stdout: string, stderr: string): string {
        let output = '';
        if (stdout.trim()) {
            output += `STDOUT:\n${stdout}\n`;
        }
        if (stderr.trim()) {
            output += `STDERR:\n${stderr}`;
        }
        return output.trim();
    }
}