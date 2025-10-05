import type { TestFile, TestResult, TestConfig } from '../types.ts';
import { TestStatus, TestType } from '../types.ts';
import { BaseTestHandler } from './base.ts';

/*
 Handler for executing Ejscript tests (.tst.es files)
 Uses ejs command to execute Ejscript test files directly
 */
export class EjscriptTestHandler extends BaseTestHandler {
    /*
     Checks if this handler can process the given test file
     @param file Test file to check
     @returns true if file is an Ejscript test
     */
    canHandle(file: TestFile): boolean {
        return file.type === TestType.Ejscript;
    }

    /*
     Executes Ejscript test file using ejs runtime
     @param file Ejscript test file to execute
     @param config Test execution configuration
     @returns Promise resolving to test results
     */
    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        const { result, duration } = await this.measureExecution(async () => {
            const args = this.buildEjsArgs(file, config);
            return await this.runCommand('ejs', args, {
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
     Builds command-line arguments for ejs command
     @param file Ejscript test file to execute
     @param config Test execution configuration
     @returns Array of command-line arguments
     */
    private buildEjsArgs(file: TestFile, config: TestConfig): string[] {
        const args: string[] = [];

        const require = config.compiler?.es?.require;
        if (require) {
            const modules = Array.isArray(require) ? require.join(' ') : require;
            args.push('--require', modules);
        }

        args.push(file.path);
        return args;
    }

    /*
     Combines stdout and stderr into formatted output
     @param stdout Standard output from Ejscript execution
     @param stderr Standard error from Ejscript execution
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