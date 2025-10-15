import {
    TestFile,
    TestResult,
    TestConfig,
    TestStatus,
    TestType,
} from "../types.ts";
import { BaseTestHandler } from "./base.ts";
import { PlatformDetector } from "../platform/detector.ts";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

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
        // Ensure testme module is linked
        await this.ensureTestmeLinked(file, config);

        // Handle debug mode
        if (config.execution?.debugMode) {
            return await this.launchDebugger(file, config);
        }

        const { result, duration } = await this.measureExecution(async () => {
            return await this.runCommand("bun", [file.path], {
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

    /*
     Ensures testme module is linked by checking for node_modules/testme
     If not found, runs 'bun link testme' in the appropriate directory
     @param file Test file being executed
     @param config Test configuration
     */
    private async ensureTestmeLinked(file: TestFile, config: TestConfig): Promise<void> {
        // Search up from test file directory for testme.json5
        const linkDir = this.findLinkDirectory(file.directory);

        if (!linkDir) {
            return; // No suitable directory found
        }

        const testmeModulePath = path.join(linkDir, 'node_modules', 'testme');

        // Check if testme module already exists as a local link
        if (fs.existsSync(testmeModulePath)) {
            // Verify it's a symlink (not a real package)
            try {
                const stats = fs.lstatSync(testmeModulePath);
                if (stats.isSymbolicLink()) {
                    return; // Already linked
                }
            } catch {
                // Continue to create link
            }
        }

        // Run bun link testme in the link directory
        try {
            await this.runCommand('bun', ['link', 'testme'], {
                cwd: linkDir,
            });
        } catch (error) {
            // Linking failed, but continue anyway - the test might not need it
        }
    }

    /*
     Finds the appropriate directory to run 'bun link testme' in
     Searches up from test file directory to find the closest testme.json5
     @param startDir Directory to start searching from
     @returns Directory path containing testme.json5, or null if not found
     */
    private findLinkDirectory(startDir: string): string | null {
        let currentDir = startDir;
        const homeDir = os.homedir();

        while (true) {
            // Stop at home directory
            if (currentDir === homeDir) {
                return null;
            }

            // Check for testme.json5
            const configPath = path.join(currentDir, 'testme.json5');
            if (fs.existsSync(configPath)) {
                return currentDir;
            }

            // Move up one directory
            const parentDir = path.dirname(currentDir);

            // Stop if we've reached the root
            if (parentDir === currentDir) {
                return null;
            }

            currentDir = parentDir;
        }
    }

    /*
     Launches JavaScript debugger for interactive debugging
     @param file JavaScript test file to debug
     @param config Test configuration
     @returns Promise resolving to test results
     */
    private async launchDebugger(
        file: TestFile,
        config: TestConfig
    ): Promise<TestResult> {
        try {
            const debuggerName = config.debug?.js || this.getDefaultDebugger();

            console.log(`\n🐛 Launching ${debuggerName} debugger for: ${file.path}`);
            console.log(`Working directory: ${file.directory}\n`);

            switch (debuggerName) {
                case 'vscode':
                    return await this.launchVSCodeDebugger(file, config, 'code');
                case 'cursor':
                    return await this.launchVSCodeDebugger(file, config, 'cursor');
                default:
                    // Treat as path to debugger executable
                    return await this.launchCustomDebugger(file, config, debuggerName);
            }
        } catch (error) {
            return this.createErrorResult(file, error);
        }
    }

    /*
     Gets default debugger for current platform
     @returns Default debugger name
     */
    private getDefaultDebugger(): string {
        return 'vscode';
    }

    /*
     Launches VSCode debugger with JavaScript debugging configuration
     @param file JavaScript test file to debug
     @param config Test configuration
     @returns Promise resolving to test results
     */
    private async launchVSCodeDebugger(
        file: TestFile,
        config: TestConfig,
        editorCommand: string = 'code'
    ): Promise<TestResult> {
        const startTime = performance.now();
        const editorName = editorCommand === 'cursor' ? 'Cursor' : 'VSCode';

        console.log(`Starting test with Bun debugger in ${editorName}...`);
        console.log(`File: ${file.path}\n`);

        // Create .vscode directory and launch.json
        await this.createVSCodeConfig(file);

        console.log(`Opening ${editorName} workspace...`);
        console.log('\nPrerequisites:');
        console.log('- Install Bun extension: https://marketplace.visualstudio.com/items?itemName=oven.bun-vscode');
        console.log('\nInstructions:');
        console.log(`1. ${editorName} will open with your test directory`);
        console.log('2. Open the test file and set breakpoints');
        console.log('3. Press F5 or Run > Start Debugging');
        console.log('4. Select "Debug Bun Test" configuration\n');

        // Find the editor executable
        const debuggers = await PlatformDetector.detectDebuggers();
        const debuggerName = editorCommand === 'cursor' ? 'Cursor' : 'VS Code';
        const editorDebugger = debuggers.find(d => d.name === debuggerName);

        if (!editorDebugger) {
            throw new Error(`${editorName} not found. Please install ${editorName} or add it to PATH`);
        }

        // Launch editor with the directory (so .vscode is visible)
        await this.runCommand(editorDebugger.path, [file.directory], {
            cwd: file.directory,
        });

        // Wait for user to set up debugging in VSCode
        console.log('\nWaiting for you to start debugging in VSCode...');
        console.log('The test will run when you start the debugger (F5)\n');

        // Run test normally - user will attach debugger
        const result = await this.runCommand('bun', [file.path], {
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

    /*
     Creates VSCode launch configuration for Bun debugging
     @param file Test file to create configuration for
     */
    private async createVSCodeConfig(file: TestFile): Promise<void> {
        const vscodeDir = path.join(file.directory, '.vscode');
        const launchJsonPath = path.join(vscodeDir, 'launch.json');

        // Create .vscode directory if it doesn't exist
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }

        // Create launch.json configuration
        const launchConfig = {
            version: '0.2.0',
            configurations: [
                {
                    type: 'bun',
                    request: 'launch',
                    name: 'Debug Bun Test',
                    program: file.path,
                    cwd: file.directory,
                    stopOnEntry: false,
                    watchMode: false
                }
            ]
        };

        // Write or update launch.json
        if (fs.existsSync(launchJsonPath)) {
            console.log('Updating existing .vscode/launch.json...');
        } else {
            console.log('Creating .vscode/launch.json...');
        }

        fs.writeFileSync(launchJsonPath, JSON.stringify(launchConfig, null, 4));
    }

    /*
     Launches custom debugger using specified executable path
     @param file JavaScript test file to debug
     @param config Test configuration
     @param debuggerPath Path to debugger executable
     @returns Promise resolving to test results
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
