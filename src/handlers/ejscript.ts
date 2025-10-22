import type {TestFile, TestResult, TestConfig} from '../types.ts'
import {TestStatus, TestType} from '../types.ts'
import {BaseTestHandler} from './base.ts'
import os from 'os'

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
        return file.type === TestType.Ejscript
    }

    /*
     Executes Ejscript test file using ejs runtime
     @param file Ejscript test file to execute
     @param config Test execution configuration
     @returns Promise resolving to test results
     */
    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        // Get test environment
        const testEnv = await this.getTestEnvironment(config, file)

        // Display environment info if showCommands is enabled
        await this.displayEnvironmentInfo(config, file, testEnv)

        const {result, duration} = await this.measureExecution(async () => {
            const args = this.buildEjsArgs(file, config)
            return await this.runCommand('ejs', args, {
                cwd: file.directory,
                timeout: (config.execution?.timeout || 30) * 1000,
                env: testEnv,
            })
        })

        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed
        const output = this.combineOutput(result.stdout, result.stderr)
        const error = result.exitCode !== 0 ? result.stderr : undefined

        return this.createTestResult(file, status, duration, output, error, result.exitCode)
    }

    /*
     Builds command-line arguments for ejs command
     @param file Ejscript test file to execute
     @param config Test execution configuration
     @returns Array of command-line arguments
     */
    private buildEjsArgs(file: TestFile, config: TestConfig): string[] {
        const args: string[] = []

        const require = config.compiler?.es?.require
        if (require) {
            const modules = Array.isArray(require) ? require.join(' ') : require
            const expandedModules = this.expandPath(modules)
            args.push('--require', expandedModules)
        }

        args.push(file.path)
        return args
    }

    /*
     Expands paths with tilde (~) and ${} patterns
     @param path Path to expand
     @returns Expanded path
     */
    private expandPath(path: string): string {
        // Expand tilde to home directory
        let expanded = path
        if (expanded.startsWith('~/')) {
            expanded = expanded.replace('~', os.homedir())
        }

        // Handle ${~/ pattern from glob expansion
        if (expanded.includes('${~/')) {
            expanded = expanded.replace(/\$\{~\//g, os.homedir() + '/')
            expanded = expanded.replace(/\}/g, '')
        }

        return expanded
    }
}
