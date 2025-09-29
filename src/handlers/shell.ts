import { TestFile, TestResult, TestConfig, TestStatus, TestType } from '../types.ts';
import { BaseTestHandler } from './base.ts';
import { chmod } from 'node:fs/promises';

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
        return file.type === TestType.Shell;
    }

    /*
     Prepares shell script for execution by making it executable
     @param file Shell script test file
     @throws Error if chmod fails
     */
    async prepare(file: TestFile): Promise<void> {
        // Make shell script executable
        try {
            await chmod(file.path, 0o755);
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
            const shell = await this.detectShell(file.path);

            return await this.runCommand(shell, [file.path], {
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
     Detects the appropriate shell to use for script execution
     Checks shebang line first, then falls back to environment detection
     @param filePath Path to the shell script
     @returns Shell command to use (bash, zsh, sh, etc.)
     */
    private async detectShell(filePath: string): Promise<string> {
        try {
            // Read the first line to check for shebang
            const file = Bun.file(filePath);
            const content = await file.text();
            const firstLine = content.split('\n')[0];

            if (firstLine.startsWith('#!')) {
                const shebang = firstLine.slice(2).trim();
                if (shebang.includes('bash')) return 'bash';
                if (shebang.includes('zsh')) return 'zsh';
                if (shebang.includes('fish')) return 'fish';
                if (shebang.includes('sh')) return 'sh';
            }
        } catch {
            // Ignore errors and fall back to default
        }

        // Default shell detection from environment
        if (process.env.SHELL) {
            const shellPath = process.env.SHELL;
            if (shellPath.includes('bash')) return 'bash';
            if (shellPath.includes('zsh')) return 'zsh';
            if (shellPath.includes('fish')) return 'fish';
        }

        // Ultimate fallback to POSIX shell
        return 'sh';
    }

    /*
     Combines stdout and stderr into formatted output
     @param stdout Standard output from shell execution
     @param stderr Standard error from shell execution
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