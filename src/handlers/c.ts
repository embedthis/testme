import { TestFile, TestResult, TestConfig, TestStatus, TestType } from '../types.ts';
import { BaseTestHandler } from './base.ts';
import { ArtifactManager } from '../artifacts.ts';
import { GlobExpansion } from '../utils/glob-expansion.ts';
import { basename, resolve, isAbsolute } from 'path';

/*
 Handler for executing C program tests (.tst.c files)
 Compiles C source to binary in artifact directory, then executes
 */
export class CTestHandler extends BaseTestHandler {
    private artifactManager: ArtifactManager;

    /*
     Creates a new C test handler with artifact management
     */
    constructor() {
        super();
        this.artifactManager = new ArtifactManager();
    }

    /*
     Checks if this handler can process the given test file
     @param file Test file to check
     @returns true if file is a C test
     */
    canHandle(file: TestFile): boolean {
        return file.type === TestType.C;
    }

    /*
     Prepares C test for execution by creating artifact directory
     @param file C test file to prepare
     */
    async prepare(file: TestFile): Promise<void> {
        // Create artifact directory for compilation outputs
        await this.artifactManager.createArtifactDir(file);
    }

    /*
     Compiles and executes C test, returning combined results
     @param file C test file to execute
     @param config Test execution configuration
     @returns Promise resolving to test results
     */
    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        // First compile the C program
        const compileResult = await this.compile(file, config);
        if (!compileResult.success) {
            return this.createTestResult(
                file,
                TestStatus.Error,
                compileResult.duration,
                compileResult.output,
                compileResult.error
            );
        }

        // Handle debug mode
        if (config.execution?.debugMode) {
            return await this.launchDebugger(file, config, compileResult.duration);
        }

        // Normal execution
        const { result, duration } = await this.measureExecution(async () => {
            const binaryPath = this.getBinaryPath(file);

            return await this.runCommand(binaryPath, [], {
                cwd: file.directory, // Always run test with CWD set to test directory
                timeout: config.execution?.timeout || 30000,
                env: await this.getTestEnvironment(config)
            });
        });

        const totalDuration = compileResult.duration + duration;
        const status = result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
        const output = this.combineOutputs(compileResult.output, result.stdout, result.stderr);
        const error = result.exitCode !== 0 ? result.stderr : undefined;

        return this.createTestResult(file, status, totalDuration, output, error, result.exitCode);
    }

    /*
     Cleans up compilation artifacts after test execution
     @param file C test file to clean up
     @param config Test configuration that may specify to keep artifacts
     */
    async cleanup(file: TestFile, config?: TestConfig): Promise<void> {
        // Only clean artifacts if not configured to keep them
        if (!config?.execution?.keepArtifacts) {
            await this.artifactManager.cleanArtifactDir(file);
        }
    }

    /*
     Compiles C source file to executable binary
     @param file C test file to compile
     @param config Test configuration with compiler settings
     @returns Compilation result with success status, duration, and output
     */
    private async compile(
        file: TestFile,
        config: TestConfig
    ): Promise<{ success: boolean; duration: number; output: string; error?: string }> {
        const { result, duration } = await this.measureExecution(async () => {
            const compiler = config.compiler?.c?.compiler || 'gcc';
            const rawFlags = config.compiler?.c?.flags || ['-std=c99', '-Wall', '-Wextra'];
            const rawLibraries = config.compiler?.c?.libraries || [];
            const binaryPath = this.getBinaryPath(file);

            // Use config directory as base for glob expansion if available, otherwise use test file directory
            const baseDir = config.configDir || file.directory;

            // Expand ${...} references in flags and libraries
            const expandedFlags = await GlobExpansion.expandArray(rawFlags, baseDir);
            const expandedLibraries = await GlobExpansion.expandArray(rawLibraries, baseDir);

            // Convert relative paths to absolute paths since we compile from artifact directory
            const flags = this.resolveRelativePaths(expandedFlags, baseDir);
            const libraries = this.resolveRelativePaths(expandedLibraries, baseDir);

            const libraryFlags = this.processLibraries(libraries);

            const args = [
                ...flags,
                '-I', file.directory, // Add test file directory to include path since we compile from artifact dir
                '-o', binaryPath,
                file.path, // Already absolute path, so works from any cwd
                ...libraryFlags
            ];

            // Display config and compile command if showCommands is enabled
            if (config.execution?.showCommands) {
                // Display the configuration being used
                console.log(`📄 Config used for ${file.name}:`);
                console.log(this.formatConfig(config));

                // Display the compile command
                const command = `${compiler} ${args.join(' ')}`;
                console.log(`📋 Compile command: ${command}`);
            }

            return await this.runCommand(compiler, args, {
                cwd: file.artifactDir, // Use unique artifact directory to avoid parallel compilation conflicts
                timeout: 60000 // 1 minute for compilation
            });
        });

        const success = result.exitCode === 0;
        const output = result.stdout || 'Compilation completed';
        const error = result.exitCode !== 0 ? result.stderr : undefined;

        // Save compilation log to artifacts
        const logContent = `Compiler: ${config.compiler?.c?.compiler || 'gcc'}
Exit Code: ${result.exitCode}
STDOUT:
${result.stdout}
STDERR:
${result.stderr}`;

        try {
            await this.artifactManager.writeArtifact(file, 'compile.log', logContent);
        } catch {
            // Ignore write errors - compilation log is not critical
        }

        return { success, duration, output, error };
    }

    /*
     Gets the path where the compiled binary should be stored
     @param file C test file
     @returns Path to compiled binary in artifact directory
     */
    private getBinaryPath(file: TestFile): string {
        const baseName = basename(file.name, '.tst.c');
        return this.artifactManager.getArtifactPath(file, baseName);
    }

    /*
     Processes library names and converts them to linker flags
     Handles both bare names (e.g., "m") and lib-prefixed names (e.g., "libm")
     @param libraries Array of library names from configuration
     @returns Array of linker flags (e.g., ["-lm", "-lpthread"])
     */
    private processLibraries(libraries: string[]): string[] {
        return libraries.map(lib => {
            // Remove "lib" prefix if present, then add "-l" prefix
            const libName = lib.startsWith('lib') ? lib.slice(3) : lib;
            return `-l${libName}`;
        });
    }

    /*
     Combines compilation and execution outputs into single formatted string
     @param compileOutput Output from compilation step
     @param stdout Standard output from execution
     @param stderr Standard error from execution
     @returns Formatted combined output
     */
    private combineOutputs(compileOutput: string, stdout: string, stderr: string): string {
        let output = '';

        if (compileOutput.trim()) {
            output += `COMPILATION:\n${compileOutput}\n\n`;
        }

        if (stdout.trim()) {
            output += `EXECUTION STDOUT:\n${stdout}\n`;
        }

        if (stderr.trim()) {
            output += `EXECUTION STDERR:\n${stderr}`;
        }

        return output.trim();
    }

    /*
     Launches the appropriate debugger based on the platform
     @param file C test file to debug
     @param config Test execution configuration
     @param compileDuration Duration of compilation phase
     @returns Promise resolving to test results
     */
    private async launchDebugger(file: TestFile, config: TestConfig, compileDuration: number): Promise<TestResult> {
        const platform = process.platform;

        try {
            if (platform === 'darwin') {
                return await this.launchXcodeDebugger(file, config, compileDuration);
            } else if (platform === 'linux') {
                return await this.launchGdbDebugger(file, config, compileDuration);
            } else {
                return this.createTestResult(
                    file,
                    TestStatus.Error,
                    compileDuration,
                    '',
                    `Debug mode not supported on platform: ${platform}`
                );
            }
        } catch (error) {
            return this.createTestResult(
                file,
                TestStatus.Error,
                compileDuration,
                '',
                `Failed to launch debugger: ${error}`
            );
        }
    }

    /*
     Launches Xcode debugger on macOS
     @param file C test file to debug
     @param config Test execution configuration
     @param compileDuration Duration of compilation phase
     @returns Promise resolving to test results
     */
    private async launchXcodeDebugger(file: TestFile, config: TestConfig, compileDuration: number): Promise<TestResult> {
        const testBaseName = basename(file.name, '.tst.c');

        try {
            // Get expanded flags and libraries (same as used for compilation)
            const baseDir = config.configDir || file.directory;
            const rawFlags = config.compiler?.c?.flags || ['-std=c99', '-Wall', '-Wextra'];
            const rawLibraries = config.compiler?.c?.libraries || [];

            // Expand ${...} references in flags and libraries
            const expandedFlags = await GlobExpansion.expandArray(rawFlags, baseDir);
            const expandedLibraries = await GlobExpansion.expandArray(rawLibraries, baseDir);

            // Convert relative paths to absolute paths for Xcode project
            const resolvedFlags = this.resolveRelativePaths(expandedFlags, baseDir);
            const resolvedLibraries = this.resolveRelativePaths(expandedLibraries, baseDir);

            // Create Xcode project configuration with proper flags and libraries
            await this.artifactManager.createXcodeProject(file, resolvedFlags, resolvedLibraries, config);

            const configFileName = `${testBaseName}.yml`;
            const configPath = this.artifactManager.getArtifactPath(file, configFileName);
            const projectName = `${testBaseName}.xcodeproj`;

            console.log('🛠️  Generating Xcode project...');

            // Run xcodegen to create the project
            const xcodegen = await this.runCommand('xcodegen', ['--spec', configFileName], {
                cwd: file.artifactDir,
                timeout: 30000
            });

            if (xcodegen.exitCode !== 0) {
                throw new Error(`xcodegen failed: ${xcodegen.stderr}`);
            }

            console.log('🗑️  Removing pre-compiled executable...');

            // Remove the pre-compiled executable so Xcode compiles fresh
            const binaryPath = this.getBinaryPath(file);
            try {
                await Bun.$`rm -f ${binaryPath}`;
                console.log(`   Removed: ${binaryPath}`);
            } catch (error) {
                console.warn(`   Warning: Could not remove ${binaryPath}: ${error}`);
            }

            console.log('🚀 Opening Xcode project...');

            // Open the Xcode project
            const open = await this.runCommand('open', [projectName], {
                cwd: file.artifactDir,
                timeout: 10000
            });

            if (open.exitCode !== 0) {
                throw new Error(`Failed to open Xcode: ${open.stderr}`);
            }

            const output = `Xcode project '${testBaseName}' created and opened successfully.
Project location: ${file.artifactDir}/${projectName}
Pre-compiled binary removed - Xcode will compile fresh for debugging

To debug:
1. Set breakpoints in your code
2. Build and run the project (Cmd+R)
3. The debugger will stop at breakpoints
4. Use Xcode's debugging tools (variables view, console, etc.)`;

            return this.createTestResult(
                file,
                TestStatus.Passed,
                compileDuration,
                output
            );

        } catch (error) {
            throw new Error(`Xcode debugger setup failed: ${error}`);
        }
    }

    /*
     Formats the configuration for display when --show is used
     @param config Test configuration to format
     @returns Formatted JSON string with relevant config sections
     */
    private formatConfig(config: TestConfig): string {
        // Create a clean config object for display
        const displayConfig = {
            configDir: config.configDir || '(none - using test file directory)',
            compiler: config.compiler,
            execution: {
                timeout: config.execution?.timeout,
                parallel: config.execution?.parallel,
                workers: config.execution?.workers,
                keepArtifacts: config.execution?.keepArtifacts,
                stepMode: config.execution?.stepMode,
                depth: config.execution?.depth,
                debugMode: config.execution?.debugMode,
                showCommands: config.execution?.showCommands
            },
            output: config.output,
            patterns: config.patterns,
            services: config.services
        };

        // Remove undefined values for cleaner output
        const cleanConfig = this.removeUndefined(displayConfig);

        return JSON.stringify(cleanConfig, null, 2);
    }

    /*
     Recursively removes undefined values from an object for cleaner JSON output
     @param obj Object to clean
     @returns Object with undefined values removed
     */
    private removeUndefined(obj: any): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.removeUndefined(item));
        }

        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                result[key] = this.removeUndefined(value);
            }
        }

        return result;
    }

    /*
     Launches GDB debugger on Linux
     @param file C test file to debug
     @param config Test execution configuration
     @param compileDuration Duration of compilation phase
     @returns Promise resolving to test results
     */
    private async launchGdbDebugger(file: TestFile, config: TestConfig, compileDuration: number): Promise<TestResult> {
        const binaryPath = this.getBinaryPath(file);

        try {
            console.log('🐛 Launching GDB debugger...');
            console.log(`Binary: ${binaryPath}`);
            console.log('GDB commands you can use:');
            console.log('  (gdb) run       - Start the program');
            console.log('  (gdb) break main - Set breakpoint at main');
            console.log('  (gdb) step      - Step through code');
            console.log('  (gdb) continue  - Continue execution');
            console.log('  (gdb) print var - Print variable value');
            console.log('  (gdb) quit      - Exit debugger');
            console.log('');

            // Launch GDB in interactive mode
            const gdb = await this.runCommand('gdb', [binaryPath], {
                cwd: file.directory, // Always run with CWD set to test directory
                timeout: 0, // No timeout for interactive debugging
                env: await this.getTestEnvironment(config)
            });

            const output = `GDB debugging session completed.
Exit code: ${gdb.exitCode}
${gdb.stdout}`;

            const status = gdb.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
            const error = gdb.exitCode !== 0 ? gdb.stderr : undefined;

            return this.createTestResult(
                file,
                status,
                compileDuration,
                output,
                error,
                gdb.exitCode
            );

        } catch (error) {
            throw new Error(`GDB debugger setup failed: ${error}`);
        }
    }

    /*
     Resolves relative paths to absolute paths based on a base directory
     @param flags Array of compiler flags that may contain relative paths
     @param baseDir Base directory to resolve relative paths from
     @returns Array of flags with relative paths resolved to absolute paths
     */
    private resolveRelativePaths(flags: string[], baseDir: string): string[] {
        return flags.map(flag => {
            // Check if this is an include or library path flag that starts with a relative path
            if ((flag.startsWith('-I') || flag.startsWith('-L')) && flag.length > 2) {
                const path = flag.substring(2);
                if (!isAbsolute(path)) {
                    const resolvedPath = resolve(baseDir, path);
                    return flag.substring(0, 2) + resolvedPath;
                }
            }
            return flag;
        });
    }
}