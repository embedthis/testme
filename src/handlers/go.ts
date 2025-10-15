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
        // Handle debug mode
        if (config.execution?.debugMode) {
            return await this.launchDebugger(file, config);
        }

        const { result, duration } = await this.measureExecution(async () => {
            return await this.runCommand("go", ["run", file.path], {
                cwd: file.directory,
                timeout: (config.execution?.timeout || 30) * 1000,
                env: await this.getTestEnvironment(config, file),
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
     * Launches Go debugger for interactive debugging
     *
     * @param file - Go test file to debug
     * @param config - Test configuration
     * @returns Promise resolving to test results
     */
    private async launchDebugger(
        file: TestFile,
        config: TestConfig
    ): Promise<TestResult> {
        try {
            const debuggerName = config.debug?.go || this.getDefaultDebugger();

            console.log(`\n🐛 Launching ${debuggerName} debugger for: ${file.path}`);
            console.log(`Working directory: ${file.directory}\n`);

            switch (debuggerName) {
                case 'vscode':
                    return await this.launchVSCodeDebugger(file, config);
                case 'delve':
                    return await this.launchDelveDebugger(file, config);
                default:
                    // Treat as path to debugger executable
                    return await this.launchCustomDebugger(file, config, debuggerName);
            }
        } catch (error) {
            return this.createErrorResult(file, error);
        }
    }

    /**
     * Gets default debugger for current platform
     *
     * @returns Default debugger name
     */
    private getDefaultDebugger(): string {
        return 'delve';
    }

    /**
     * Launches VSCode debugger with Go debugging configuration
     *
     * @param file - Go test file to debug
     * @param config - Test configuration
     * @returns Promise resolving to test results
     */
    private async launchVSCodeDebugger(
        file: TestFile,
        config: TestConfig
    ): Promise<TestResult> {
        const startTime = performance.now();

        console.log('VSCode Go debugging:');
        console.log(`File: ${file.path}`);
        console.log('\nInstructions:');
        console.log('1. Open VSCode');
        console.log('2. Install Go extension if not already installed');
        console.log('3. Set breakpoints in your test file');
        console.log('4. Run > Start Debugging (F5)');
        console.log('5. Select "Go: Debug File" configuration\n');
        console.log('Alternatively, use delve debugger: tm --debug with delve configured\n');

        const result = await this.runCommand('go', ['run', file.path], {
            cwd: file.directory,
            env: await this.getTestEnvironment(config, file),
        });

        const duration = performance.now() - startTime;
        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
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
     * Launches Delve debugger for interactive Go debugging
     *
     * @param file - Go test file to debug
     * @param config - Test configuration
     * @returns Promise resolving to test results
     */
    private async launchDelveDebugger(
        file: TestFile,
        config: TestConfig
    ): Promise<TestResult> {
        const startTime = performance.now();

        console.log('Starting Delve debugger (dlv)...');
        console.log(`File: ${file.path}`);
        console.log('\nDebugger commands:');
        console.log('  help - show help');
        console.log('  break <line> - set breakpoint');
        console.log('  continue - continue execution');
        console.log('  next - step over');
        console.log('  step - step into');
        console.log('  print <var> - print variable');
        console.log('  exit - exit debugger\n');

        const result = await this.runCommand('dlv', ['debug', file.path], {
            cwd: file.directory,
            env: await this.getTestEnvironment(config, file),
        });

        const duration = performance.now() - startTime;
        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
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
     * Launches custom debugger using specified executable path
     *
     * @param file - Go test file to debug
     * @param config - Test configuration
     * @param debuggerPath - Path to debugger executable
     * @returns Promise resolving to test results
     */
    private async launchCustomDebugger(
        file: TestFile,
        config: TestConfig,
        debuggerPath: string
    ): Promise<TestResult> {
        const startTime = performance.now();

        console.log(`Launching custom debugger: ${debuggerPath}`);
        const result = await this.runCommand(debuggerPath, [file.path], {
            cwd: file.directory,
            env: await this.getTestEnvironment(config, file),
        });

        const duration = performance.now() - startTime;
        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
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
