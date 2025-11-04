import type {TestFile, TestResult, TestConfig} from '../types.ts'
import {TestStatus, TestType} from '../types.ts'
import {BaseTestHandler} from './base.ts'

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
        return file.type === TestType.Python
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
        // Handle debug mode
        if (config.execution?.debugMode) {
            return await this.launchDebugger(file, config)
        }

        // Get test environment
        const testEnv = await this.getTestEnvironment(config, file)

        // Display environment info if showCommands is enabled
        await this.displayEnvironmentInfo(config, file, testEnv)

        const {result, duration} = await this.measureExecution(async () => {
            // Try python3 first, fall back to python
            const pythonCommand = await this.getPythonCommand()

            return await this.runCommand(pythonCommand, [file.path], {
                cwd: file.directory,
                timeout: (config.execution?.timeout || 30) * 1000,
                env: testEnv,
                config,
            })
        })

        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed
        const output = this.combineOutput(result.stdout, result.stderr)
        const error = result.exitCode !== 0 ? result.stderr : undefined

        return this.createTestResult(file, status, duration, output, error, result.exitCode)
    }

    /**
     * Launches Python debugger for interactive debugging
     *
     * @param file - Python test file to debug
     * @param config - Test configuration
     * @returns Promise resolving to test results
     */
    private async launchDebugger(file: TestFile, config: TestConfig): Promise<TestResult> {
        try {
            const debuggerName = config.debug?.py || this.getDefaultDebugger()

            console.log(`\n🐛 Launching ${debuggerName} debugger for: ${file.path}`)
            console.log(`Working directory: ${file.directory}\n`)

            switch (debuggerName) {
                case 'vscode':
                    return await this.launchVSCodeDebugger(file, config)
                case 'pdb':
                    return await this.launchPdbDebugger(file, config)
                default:
                    // Treat as path to debugger executable
                    return await this.launchCustomDebugger(file, config, debuggerName)
            }
        } catch (error) {
            return this.createErrorResult(file, error)
        }
    }

    /**
     * Gets default debugger for current platform
     *
     * @returns Default debugger name
     */
    private getDefaultDebugger(): string {
        return 'pdb'
    }

    /**
     * Launches VSCode debugger with Python debugging configuration
     *
     * @param file - Python test file to debug
     * @param config - Test configuration
     * @returns Promise resolving to test results
     */
    private async launchVSCodeDebugger(file: TestFile, config: TestConfig): Promise<TestResult> {
        const startTime = performance.now()

        console.log('VSCode Python debugging:')
        console.log(`File: ${file.path}`)
        console.log('\nInstructions:')
        console.log('1. Open VSCode')
        console.log('2. Install Python extension if not already installed')
        console.log('3. Set breakpoints in your test file')
        console.log('4. Run > Start Debugging (F5)')
        console.log('5. Select "Python File" configuration\n')
        console.log('Alternatively, use pdb debugger: tm --debug with pdb configured\n')

        const pythonCommand = await this.getPythonCommand()
        const result = await this.runCommand(pythonCommand, [file.path], {
            cwd: file.directory,
            env: await this.getTestEnvironment(config, file),
        })

        const duration = performance.now() - startTime
        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed
        const output = this.combineOutput(result.stdout, result.stderr)
        const error = result.exitCode !== 0 ? result.stderr : undefined

        return this.createTestResult(file, status, duration, output, error, result.exitCode)
    }

    /**
     * Launches Python debugger (pdb) for interactive debugging
     *
     * @param file - Python test file to debug
     * @param config - Test configuration
     * @returns Promise resolving to test results
     */
    private async launchPdbDebugger(file: TestFile, config: TestConfig): Promise<TestResult> {
        const startTime = performance.now()

        console.log('Starting Python debugger (pdb)...')
        console.log(`File: ${file.path}`)
        console.log('\nDebugger commands:')
        console.log('  h - help')
        console.log('  b <line> - set breakpoint')
        console.log('  c - continue')
        console.log('  n - next line')
        console.log('  s - step into')
        console.log('  p <var> - print variable')
        console.log('  q - quit\n')

        const pythonCommand = await this.getPythonCommand()
        const result = await this.runCommand(pythonCommand, ['-m', 'pdb', file.path], {
            cwd: file.directory,
            env: await this.getTestEnvironment(config, file),
        })

        const duration = performance.now() - startTime
        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed
        const output = this.combineOutput(result.stdout, result.stderr)
        const error = result.exitCode !== 0 ? result.stderr : undefined

        return this.createTestResult(file, status, duration, output, error, result.exitCode)
    }

    /**
     * Launches custom debugger using specified executable path
     *
     * @param file - Python test file to debug
     * @param config - Test configuration
     * @param debuggerPath - Path to debugger executable
     * @returns Promise resolving to test results
     */
    private async launchCustomDebugger(file: TestFile, config: TestConfig, debuggerPath: string): Promise<TestResult> {
        const startTime = performance.now()

        console.log(`Launching custom debugger: ${debuggerPath}`)
        const result = await this.runCommand(debuggerPath, [file.path], {
            cwd: file.directory,
            env: await this.getTestEnvironment(config, file),
        })

        const duration = performance.now() - startTime
        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed
        const output = this.combineOutput(result.stdout, result.stderr)
        const error = result.exitCode !== 0 ? result.stderr : undefined

        return this.createTestResult(file, status, duration, output, error, result.exitCode)
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
            const proc = Bun.spawn(['which', 'python3'], {
                stdout: 'pipe',
                stderr: 'pipe',
            })
            const exitCode = await proc.exited
            if (exitCode === 0) {
                return 'python3'
            }
        } catch {
            // Fall through to try python
        }

        // Fall back to python
        try {
            const proc = Bun.spawn(['which', 'python'], {
                stdout: 'pipe',
                stderr: 'pipe',
            })
            const exitCode = await proc.exited
            if (exitCode === 0) {
                return 'python'
            }
        } catch {
            // Fall through
        }

        // Default to python3 and let it fail if not available
        return 'python3'
    }
}
