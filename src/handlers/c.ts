import {
    TestFile,
    TestResult,
    TestConfig,
    TestStatus,
    TestType,
} from "../types.ts";
import { BaseTestHandler } from "./base.ts";
import { ArtifactManager } from "../artifacts.ts";
import { GlobExpansion } from "../utils/glob-expansion.ts";
import { CompilerManager, CompilerType } from "../platform/compiler.ts";
import { PermissionManager } from "../platform/permissions.ts";
import { PlatformDetector } from "../platform/detector.ts";
import { basename, resolve, isAbsolute } from "path";

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
            return await this.launchDebugger(
                file,
                config,
                compileResult.duration
            );
        }

        // Normal execution
        const { result, duration } = await this.measureExecution(async () => {
            const binaryPath = this.getBinaryPath(file);

            return await this.runCommand(binaryPath, [], {
                cwd: file.directory, // Always run test with CWD set to test directory
                timeout: config.execution?.timeout || 30000,
                env: await this.getTestEnvironment(config),
            });
        });

        const totalDuration = compileResult.duration + duration;
        const status =
            result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
        const output = this.combineOutputs(
            compileResult.output,
            result.stdout,
            result.stderr
        );
        const error = result.exitCode !== 0 ? result.stderr : undefined;

        return this.createTestResult(
            file,
            status,
            totalDuration,
            output,
            error,
            result.exitCode
        );
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
    ): Promise<{
        success: boolean;
        duration: number;
        output: string;
        error?: string;
    }> {
        const { result, duration } = await this.measureExecution(async () => {
            const binaryPath = this.getBinaryPath(file);
            const baseDir = config.configDir || file.directory;

            // Get compiler configuration (auto-detect if not specified)
            const compilerConfig = await CompilerManager.getDefaultCompilerConfig(
                config.compiler?.c?.compiler
            );

            // Get compiler-specific or default flags and libraries
            let userFlags: string[] = [];
            let rawLibraries: string[] = [];

            // Select flags based on detected compiler type
            const cConfig = config.compiler?.c;
            if (cConfig) {
                // Try compiler-specific config first
                if (compilerConfig.type === CompilerType.MSVC && cConfig.msvc) {
                    userFlags = cConfig.msvc.flags || [];
                    rawLibraries = cConfig.msvc.libraries || [];
                } else if (compilerConfig.type === CompilerType.GCC && cConfig.gcc) {
                    userFlags = cConfig.gcc.flags || [];
                    rawLibraries = cConfig.gcc.libraries || [];
                } else if (compilerConfig.type === CompilerType.Clang && cConfig.clang) {
                    userFlags = cConfig.clang.flags || [];
                    rawLibraries = cConfig.clang.libraries || [];
                } else {
                    // Fall back to default flags
                    userFlags = cConfig.flags || [];
                    rawLibraries = cConfig.libraries || [];
                }
            }

            // Merge compiler defaults with user flags (defaults first, then user overrides)
            let flags = [...compilerConfig.flags, ...userFlags];

            // Create special variables for expansion
            const specialVars = GlobExpansion.createSpecialVariables(
                file.artifactDir,
                file.directory,
                config.configDir,
                compilerConfig.compiler,
                config.profile
            );

            // Expand ${...} references in flags and libraries
            const expandedFlags = await GlobExpansion.expandArray(flags, baseDir, specialVars);
            const expandedLibraries = await GlobExpansion.expandArray(rawLibraries, baseDir, specialVars);

            // Convert relative paths to absolute paths since we compile from artifact directory
            flags = this.resolveRelativePaths(expandedFlags, baseDir);
            const libraries = this.resolveRelativePaths(expandedLibraries, baseDir);

            // Process libraries based on compiler type
            const libraryFlags = CompilerManager.processLibraries(
                libraries,
                compilerConfig.type
            );

            // Build compiler arguments based on compiler type
            const args: string[] = [];

            if (compilerConfig.type === CompilerType.MSVC) {
                // MSVC syntax: cl.exe [flags] /Fe:output.exe input.c [/link libraries]
                args.push(...flags);
                args.push(`/I${file.directory}`); // Include test directory
                args.push(`/Fe:${binaryPath}`);
                args.push(file.path);

                if (libraryFlags.length > 0) {
                    args.push("/link");
                    args.push(...libraryFlags);
                }
            } else {
                // GCC/Clang/MinGW syntax: gcc [flags] -I dir -o output input.c [libraries]
                args.push(...flags);
                args.push("-I", file.directory);
                args.push("-o", binaryPath);
                args.push(file.path);
                args.push(...libraryFlags);
            }

            // Display config and compile command if showCommands is enabled
            if (config.execution?.showCommands) {
                console.log(`📄 Config used for ${file.name}:`);
                console.log(this.formatConfig(config));
                console.log(`🔧 Compiler: ${compilerConfig.compiler} (${compilerConfig.type})`);
                console.log(`📋 Compile command: ${compilerConfig.compiler} ${args.join(" ")}`);
            }

            // Build environment for MSVC if needed
            let env = undefined;
            if (compilerConfig.type === CompilerType.MSVC && compilerConfig.env) {
                env = { ...process.env };
                if (compilerConfig.env.PATH) {
                    env.PATH = `${compilerConfig.env.PATH};${process.env.PATH}`;
                }
                if (compilerConfig.env.INCLUDE) {
                    env.INCLUDE = compilerConfig.env.INCLUDE;
                }
                if (compilerConfig.env.LIB) {
                    env.LIB = compilerConfig.env.LIB;
                }
            }

            return await this.runCommand(compilerConfig.compiler, args, {
                cwd: baseDir, // Compile from config directory so relative paths in flags work correctly
                timeout: 60000, // 1 minute for compilation
                env
            });
        });

        const success = result.exitCode === 0;
        const output = result.stdout || "Compilation completed";
        const error = result.exitCode !== 0 ? result.stderr : undefined;

        // Save compilation log to artifacts
        const logContent = `Compiler: ${config.compiler?.c?.compiler || "gcc"}
Exit Code: ${result.exitCode}
STDOUT:
${result.stdout}
STDERR:
${result.stderr}`;

        try {
            await this.artifactManager.writeArtifact(
                file,
                "compile.log",
                logContent
            );
        } catch {
            // Ignore write errors - compilation log is not critical
        }

        return { success, duration, output, error };
    }

    /*
     Gets the path where the compiled binary should be stored
     @param file C test file
     @returns Path to compiled binary in artifact directory (with .exe on Windows)
     */
    private getBinaryPath(file: TestFile): string {
        const baseName = basename(file.name, ".tst.c");
        const binaryName = PermissionManager.addBinaryExtension(baseName);
        return this.artifactManager.getArtifactPath(file, binaryName);
    }

    /*
     Combines compilation and execution outputs into single formatted string
     @param compileOutput Output from compilation step
     @param stdout Standard output from execution
     @param stderr Standard error from execution
     @returns Formatted combined output
     */
    private combineOutputs(
        compileOutput: string,
        stdout: string,
        stderr: string
    ): string {
        let output = "";

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
    private async launchDebugger(
        file: TestFile,
        config: TestConfig,
        compileDuration: number
    ): Promise<TestResult> {
        try {
            if (PlatformDetector.isMacOS()) {
                return await this.launchXcodeDebugger(
                    file,
                    config,
                    compileDuration
                );
            } else if (PlatformDetector.isLinux()) {
                return await this.launchGdbDebugger(
                    file,
                    config,
                    compileDuration
                );
            } else if (PlatformDetector.isWindows()) {
                return await this.launchWindowsDebugger(
                    file,
                    config,
                    compileDuration
                );
            } else {
                return this.createTestResult(
                    file,
                    TestStatus.Error,
                    compileDuration,
                    "",
                    `Debug mode not supported on platform: ${process.platform}`
                );
            }
        } catch (error) {
            return this.createTestResult(
                file,
                TestStatus.Error,
                compileDuration,
                "",
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
    private async launchXcodeDebugger(
        file: TestFile,
        config: TestConfig,
        compileDuration: number
    ): Promise<TestResult> {
        const testBaseName = basename(file.name, ".tst.c");

        try {
            // Get expanded flags and libraries (same as used for compilation)
            const baseDir = config.configDir || file.directory;
            const compilerConfig = await CompilerManager.getDefaultCompilerConfig(
                config.compiler?.c?.compiler
            );
            const rawFlags = config.compiler?.c?.flags || [
                "-std=c99",
                "-Wall",
                "-Wextra",
            ];
            const rawLibraries = config.compiler?.c?.libraries || [];

            // Create special variables for expansion
            const specialVars = GlobExpansion.createSpecialVariables(
                file.artifactDir,
                file.directory,
                config.configDir,
                compilerConfig.compiler,
                config.profile
            );

            // Expand ${...} references in flags and libraries
            const expandedFlags = await GlobExpansion.expandArray(
                rawFlags,
                baseDir,
                specialVars
            );
            const expandedLibraries = await GlobExpansion.expandArray(
                rawLibraries,
                baseDir,
                specialVars
            );

            // Convert relative paths to absolute paths for Xcode project
            const resolvedFlags = this.resolveRelativePaths(
                expandedFlags,
                baseDir
            );
            const resolvedLibraries = this.resolveRelativePaths(
                expandedLibraries,
                baseDir
            );

            // Create Xcode project configuration with proper flags and libraries
            await this.artifactManager.createXcodeProject(
                file,
                resolvedFlags,
                resolvedLibraries,
                config
            );

            const configFileName = `${testBaseName}.yml`;
            const configPath = this.artifactManager.getArtifactPath(
                file,
                configFileName
            );
            const projectName = `${testBaseName}.xcodeproj`;

            console.log("🛠️  Generating Xcode project...");

            // Run xcodegen to create the project
            const xcodegen = await this.runCommand(
                "xcodegen",
                ["--spec", configFileName],
                {
                    cwd: file.artifactDir,
                    timeout: 30000,
                }
            );

            if (xcodegen.exitCode !== 0) {
                throw new Error(`xcodegen failed: ${xcodegen.stderr}`);
            }

            console.log("🗑️  Removing pre-compiled executable...");

            // Remove the pre-compiled executable so Xcode compiles fresh
            const binaryPath = this.getBinaryPath(file);
            try {
                await Bun.$`rm -f ${binaryPath}`;
                console.log(`   Removed: ${binaryPath}`);
            } catch (error) {
                console.warn(
                    `   Warning: Could not remove ${binaryPath}: ${error}`
                );
            }

            console.log("🚀 Opening Xcode project...");

            // Open the Xcode project
            const open = await this.runCommand("open", [projectName], {
                cwd: file.artifactDir,
                timeout: 10000,
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
            configDir: config.configDir || "(none - using test file directory)",
            compiler: config.compiler,
            execution: {
                timeout: config.execution?.timeout,
                parallel: config.execution?.parallel,
                workers: config.execution?.workers,
                keepArtifacts: config.execution?.keepArtifacts,
                stepMode: config.execution?.stepMode,
                depth: config.execution?.depth,
                debugMode: config.execution?.debugMode,
                showCommands: config.execution?.showCommands,
            },
            output: config.output,
            patterns: config.patterns,
            services: config.services,
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
        if (obj === null || typeof obj !== "object") {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.removeUndefined(item));
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
    private async launchGdbDebugger(
        file: TestFile,
        config: TestConfig,
        compileDuration: number
    ): Promise<TestResult> {
        const binaryPath = this.getBinaryPath(file);

        try {
            console.log("🐛 Launching GDB debugger...");
            console.log(`Binary: ${binaryPath}`);
            console.log("GDB commands you can use:");
            console.log("  (gdb) run       - Start the program");
            console.log("  (gdb) break main - Set breakpoint at main");
            console.log("  (gdb) step      - Step through code");
            console.log("  (gdb) continue  - Continue execution");
            console.log("  (gdb) print var - Print variable value");
            console.log("  (gdb) quit      - Exit debugger");
            console.log("");

            // Launch GDB in interactive mode
            const gdb = await this.runCommand("gdb", [binaryPath], {
                cwd: file.directory, // Always run with CWD set to test directory
                timeout: 0, // No timeout for interactive debugging
                env: await this.getTestEnvironment(config),
            });

            const output = `GDB debugging session completed.
Exit code: ${gdb.exitCode}
${gdb.stdout}`;

            const status =
                gdb.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
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
     Launches Windows debugger (VS Code or Visual Studio)
     @param file C test file to debug
     @param config Test execution configuration
     @param compileDuration Duration of compilation phase
     @returns Promise resolving to test results
     */
    private async launchWindowsDebugger(
        file: TestFile,
        config: TestConfig,
        compileDuration: number
    ): Promise<TestResult> {
        const binaryPath = this.getBinaryPath(file);

        try {
            // Try to create VS Code launch configuration
            const vscodeConfigCreated = await this.createVSCodeDebugConfig(file, config);

            if (vscodeConfigCreated) {
                console.log("🛠️  VS Code debug configuration created");
                console.log(`📁 Open this folder in VS Code: ${file.directory}`);
                console.log("📋 Press F5 in VS Code to start debugging");

                const output = `VS Code debug configuration created successfully.
Location: ${file.directory}\\.vscode\\launch.json
Binary: ${binaryPath}

To debug:
1. Open this folder in VS Code
2. Open the test file: ${file.name}
3. Set breakpoints in your code
4. Press F5 (or Run > Start Debugging)
5. The debugger will stop at breakpoints

Note: Make sure you have the C/C++ extension installed in VS Code.`;

                return this.createTestResult(
                    file,
                    TestStatus.Passed,
                    compileDuration,
                    output
                );
            } else {
                throw new Error("Could not create VS Code debug configuration");
            }
        } catch (error) {
            throw new Error(`Windows debugger setup failed: ${error}`);
        }
    }

    /*
     Creates VS Code debug configuration for C test
     @param file C test file
     @param config Test execution configuration
     @returns Promise resolving to true if successful
     */
    private async createVSCodeDebugConfig(
        file: TestFile,
        config: TestConfig
    ): Promise<boolean> {
        try {
            const vscodeDir = resolve(file.directory, ".vscode");
            const launchJsonPath = resolve(vscodeDir, "launch.json");

            // Create .vscode directory if it doesn't exist
            await Bun.$`mkdir -p ${vscodeDir}`.quiet();

            const binaryPath = this.getBinaryPath(file);

            // Determine debugger type based on available compiler
            const compilerConfig = await CompilerManager.getDefaultCompilerConfig(
                config.compiler?.c?.compiler
            );

            let debuggerType = "cppvsdbg"; // Default for MSVC
            if (compilerConfig.type === CompilerType.MinGW || compilerConfig.type === CompilerType.GCC) {
                debuggerType = "cppdbg"; // For MinGW/GCC (uses GDB)
            }

            const launchConfig = {
                version: "0.2.0",
                configurations: [
                    {
                        name: `Debug ${file.name}`,
                        type: debuggerType,
                        request: "launch",
                        program: binaryPath,
                        args: [],
                        stopAtEntry: false,
                        cwd: file.directory,
                        environment: [],
                        externalConsole: false,
                        MIMode: debuggerType === "cppdbg" ? "gdb" : undefined,
                        miDebuggerPath: debuggerType === "cppdbg" ? "gdb.exe" : undefined,
                        setupCommands: debuggerType === "cppdbg" ? [
                            {
                                description: "Enable pretty-printing for gdb",
                                text: "-enable-pretty-printing",
                                ignoreFailures: true
                            }
                        ] : undefined,
                        preLaunchTask: undefined
                    }
                ]
            };

            // Write launch.json
            await Bun.write(launchJsonPath, JSON.stringify(launchConfig, null, 4));

            return true;
        } catch (error) {
            console.warn(`Warning: Could not create VS Code config: ${error}`);
            return false;
        }
    }

    /*
     Resolves relative paths to absolute paths based on a base directory
     @param flags Array of compiler flags that may contain relative paths
     @param baseDir Base directory to resolve relative paths from
     @returns Array of flags with relative paths resolved to absolute paths
     */
    private resolveRelativePaths(flags: string[], baseDir: string): string[] {
        return flags.map((flag) => {
            // Check if this is an include or library path flag that starts with a relative path
            if (
                (flag.startsWith("-I") || flag.startsWith("-L") || flag.startsWith("/I")) &&
                flag.length > 2
            ) {
                const pathStart = flag.startsWith("/I") ? 2 : 2;
                const path = flag.substring(pathStart);
                if (!isAbsolute(path)) {
                    const resolvedPath = resolve(baseDir, path);
                    return flag.substring(0, pathStart) + resolvedPath;
                }
            }
            return flag;
        });
    }
}
