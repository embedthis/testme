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
import { ErrorMessages } from "../utils/error-messages.ts";
import { basename, resolve, isAbsolute, join } from "path";
import os from "os";

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
                // Determine current platform
                const platform = PlatformDetector.isWindows() ? 'windows' :
                               PlatformDetector.isMacOS() ? 'macosx' : 'linux';

                // Start with generic flags/libraries (if present)
                userFlags = [...(cConfig.flags || [])];
                rawLibraries = [...(cConfig.libraries || [])];

                // Add compiler-specific config on top
                if (compilerConfig.type === CompilerType.MSVC && cConfig.msvc) {
                    if (cConfig.msvc.flags) userFlags.push(...cConfig.msvc.flags);
                    if (cConfig.msvc.libraries) rawLibraries.push(...cConfig.msvc.libraries);
                    // Check for platform-specific overrides
                    const platformSettings = cConfig.msvc[platform];
                    if (platformSettings) {
                        if (platformSettings.flags) userFlags.push(...platformSettings.flags);
                        if (platformSettings.libraries) rawLibraries.push(...platformSettings.libraries);
                    }
                } else if (compilerConfig.type === CompilerType.GCC && cConfig.gcc) {
                    if (cConfig.gcc.flags) userFlags.push(...cConfig.gcc.flags);
                    if (cConfig.gcc.libraries) rawLibraries.push(...cConfig.gcc.libraries);
                    // Check for platform-specific overrides
                    const platformSettings = cConfig.gcc[platform];
                    if (platformSettings) {
                        if (platformSettings.flags) userFlags.push(...platformSettings.flags);
                        if (platformSettings.libraries) rawLibraries.push(...platformSettings.libraries);
                    }
                } else if (compilerConfig.type === CompilerType.Clang && cConfig.clang) {
                    if (cConfig.clang.flags) userFlags.push(...cConfig.clang.flags);
                    if (cConfig.clang.libraries) rawLibraries.push(...cConfig.clang.libraries);
                    // Check for platform-specific overrides
                    const platformSettings = cConfig.clang[platform];
                    if (platformSettings) {
                        if (platformSettings.flags) userFlags.push(...platformSettings.flags);
                        if (platformSettings.libraries) rawLibraries.push(...platformSettings.libraries);
                    }
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

            // Normalize rpath values for the current platform
            const normalizedFlags = CompilerManager.normalizePlatformRpaths(expandedFlags);

            // Convert relative paths to absolute paths since we compile from artifact directory
            flags = this.resolveRelativePaths(normalizedFlags, baseDir);
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
                // Specify unique PDB file in artifact directory to avoid parallel build conflicts
                const pdbPath = join(file.artifactDir, basename(binaryPath, '.exe') + '.pdb');
                args.push(`/Fd:${pdbPath}`);
                args.push(file.path);

                // Add linker options
                const homeDir = os.homedir();
                args.push("/link");
                args.push(`/LIBPATH:${homeDir}\\.local\\lib`);

                if (libraryFlags.length > 0) {
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
        let error = result.exitCode !== 0 ? result.stderr : undefined;

        // Enhance error messages for common compilation failures
        if (error) {
            error = this.enhanceCompilationError(error, file);
        }

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
     Launches the appropriate debugger based on configuration or platform defaults
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
            // Get debugger from config or auto-detect based on platform
            const debuggerName = config.debug?.c || this.getDefaultDebugger();

            // Route to appropriate debugger handler
            switch (debuggerName) {
                case 'xcode':
                    return await this.launchXcodeDebugger(file, config, compileDuration);
                case 'lldb':
                    return await this.launchLldbDebugger(file, config, compileDuration);
                case 'gdb':
                    return await this.launchGdbDebugger(file, config, compileDuration);
                case 'vs':
                    return await this.launchVisualStudioDebugger(file, config, compileDuration);
                case 'vscode':
                    return await this.launchVSCodeDebugger(file, config, compileDuration);
                default:
                    // If it's not a known alias, treat it as a path to a debugger executable
                    return this.createTestResult(
                        file,
                        TestStatus.Error,
                        compileDuration,
                        "",
                        `Unknown debugger: ${debuggerName}. Valid options: xcode, lldb, gdb, vs, vscode, or path to debugger executable`
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
     Gets the default debugger for the current platform
     @returns Default debugger name
     */
    private getDefaultDebugger(): string {
        if (PlatformDetector.isMacOS()) {
            return 'xcode';
        } else if (PlatformDetector.isLinux()) {
            return 'gdb';
        } else if (PlatformDetector.isWindows()) {
            return 'vs';
        }
        return 'gdb'; // Fallback
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

            // Get compiler-specific or default user flags and libraries (same as compile method)
            let userFlags: string[] = [];
            let rawLibraries: string[] = [];

            const cConfig = config.compiler?.c;
            if (cConfig) {
                // Determine current platform
                const platform = PlatformDetector.isWindows() ? 'windows' :
                               PlatformDetector.isMacOS() ? 'macosx' : 'linux';

                // Try compiler-specific config first
                if (compilerConfig.type === CompilerType.MSVC && cConfig.msvc) {
                    userFlags = [...(cConfig.msvc.flags || [])];
                    rawLibraries = [...(cConfig.msvc.libraries || [])];
                    // Check for platform-specific overrides
                    const platformSettings = cConfig.msvc[platform];
                    if (platformSettings) {
                        if (platformSettings.flags) userFlags.push(...platformSettings.flags);
                        if (platformSettings.libraries) rawLibraries.push(...platformSettings.libraries);
                    }
                } else if (compilerConfig.type === CompilerType.GCC && cConfig.gcc) {
                    userFlags = [...(cConfig.gcc.flags || [])];
                    rawLibraries = [...(cConfig.gcc.libraries || [])];
                    // Check for platform-specific overrides
                    const platformSettings = cConfig.gcc[platform];
                    if (platformSettings) {
                        if (platformSettings.flags) userFlags.push(...platformSettings.flags);
                        if (platformSettings.libraries) rawLibraries.push(...platformSettings.libraries);
                    }
                } else if (compilerConfig.type === CompilerType.Clang && cConfig.clang) {
                    userFlags = [...(cConfig.clang.flags || [])];
                    rawLibraries = [...(cConfig.clang.libraries || [])];
                    // Check for platform-specific overrides
                    const platformSettings = cConfig.clang[platform];
                    if (platformSettings) {
                        if (platformSettings.flags) userFlags.push(...platformSettings.flags);
                        if (platformSettings.libraries) rawLibraries.push(...platformSettings.libraries);
                    }
                } else {
                    // Fall back to default flags
                    userFlags = cConfig.flags || [];
                    rawLibraries = cConfig.libraries || [];
                }
            }

            // Merge compiler defaults with user flags (defaults first, then user overrides)
            const rawFlags = [...compilerConfig.flags, ...userFlags];

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
            env: config.env,
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
     Launches LLDB debugger
     @param file C test file to debug
     @param config Test execution configuration
     @param compileDuration Duration of compilation phase
     @returns Promise resolving to test results
     */
    private async launchLldbDebugger(
        file: TestFile,
        config: TestConfig,
        compileDuration: number
    ): Promise<TestResult> {
        const binaryPath = this.getBinaryPath(file);

        try {
            console.log("🐛 Launching LLDB debugger...");
            console.log(`Binary: ${binaryPath}`);
            console.log("LLDB commands you can use:");
            console.log("  (lldb) run       - Start the program");
            console.log("  (lldb) b main    - Set breakpoint at main");
            console.log("  (lldb) step      - Step through code");
            console.log("  (lldb) continue  - Continue execution");
            console.log("  (lldb) p var     - Print variable value");
            console.log("  (lldb) quit      - Exit debugger");
            console.log("");

            // Launch LLDB in interactive mode
            const lldb = await this.runCommand("lldb", [binaryPath], {
                cwd: file.directory,
                timeout: 0, // No timeout for interactive debugging
                env: await this.getTestEnvironment(config),
            });

            const output = `LLDB debugging session completed.
Exit code: ${lldb.exitCode}
${lldb.stdout}`;

            const status =
                lldb.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed;
            const error = lldb.exitCode !== 0 ? lldb.stderr : undefined;

            return this.createTestResult(
                file,
                status,
                compileDuration,
                output,
                error,
                lldb.exitCode
            );
        } catch (error) {
            throw new Error(`LLDB debugger setup failed: ${error}`);
        }
    }

    /*
     Launches GDB debugger
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
     Launches Windows debugger (Visual Studio for MSVC, VS Code for GCC/MinGW)
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
        const compilerConfig = await CompilerManager.getDefaultCompilerConfig(
            config.compiler?.c?.compiler
        );

        // Use Visual Studio for MSVC, VS Code for GCC/MinGW
        if (compilerConfig.type === CompilerType.MSVC) {
            return await this.launchVisualStudioDebugger(file, config, compileDuration);
        } else {
            return await this.launchVSCodeDebugger(file, config, compileDuration);
        }
    }

    /*
     Launches Visual Studio debugger for MSVC-compiled tests
     @param file C test file to debug
     @param config Test execution configuration
     @param compileDuration Duration of compilation phase
     @returns Promise resolving to test results
     */
    private async launchVisualStudioDebugger(
        file: TestFile,
        config: TestConfig,
        compileDuration: number
    ): Promise<TestResult> {
        const binaryPath = this.getBinaryPath(file);

        try {
            console.log("🛠️  Preparing Visual Studio debugger...");
            console.log(`📁 Binary: ${binaryPath}`);
            console.log(`📄 Source: ${file.path}`);

            // Get compiler config to find devenv path from MSVC installation
            const compilerConfig = await CompilerManager.getDefaultCompilerConfig(
                config.compiler?.c?.compiler
            );

            let devenvPath = "devenv";

            // If we have MSVC compiler path, derive devenv path from it
            if (compilerConfig.type === CompilerType.MSVC && compilerConfig.compiler) {
                const derivedDevenv = this.findDevenvFromCompiler(compilerConfig.compiler);
                if (derivedDevenv) {
                    devenvPath = derivedDevenv;
                    console.log(`🔍 Found Visual Studio at: ${devenvPath}`);
                }
            }

            // Try to launch Visual Studio with debugger
            let vsOpened = false;
            try {
                console.log("🚀 Launching Visual Studio...");

                // Use Windows 'start' command to launch devenv detached
                // start requires: start "title" "program" args
                // The first quoted string is the window title, second is the program
                const proc = Bun.spawn(["cmd", "/c", "start", "Visual Studio Debugger", devenvPath, binaryPath], {
                    cwd: file.directory,
                    stdout: "ignore",
                    stderr: "ignore",
                    stdin: "ignore",
                    detached: true,
                });

                // Unref the process so it doesn't keep the test runner alive
                proc.unref();

                // Give it a moment to start
                await new Promise(resolve => setTimeout(resolve, 1500));

                vsOpened = true;
                console.log("✅ Visual Studio launched");
            } catch (error) {
                // Visual Studio devenv command not available
                console.log("📋 Could not launch Visual Studio automatically");
                console.log(`   Manually open Visual Studio and debug: ${binaryPath}`);
            }

            const output = `Visual Studio debug setup completed.
Binary: ${binaryPath}
Source: ${file.path}

To debug:
${vsOpened ? '1. Visual Studio should be open with the debugger ready' : `1. Open Visual Studio\n2. File > Open > Project/Solution, or run: "${devenvPath}" /DebugExe "${binaryPath}"`}
${vsOpened ? '2' : '3'}. Set breakpoints in the source: ${file.path}
${vsOpened ? '3' : '4'}. Start debugging (F5)`;

            return this.createTestResult(
                file,
                TestStatus.Passed,
                compileDuration,
                output
            );
        } catch (error) {
            throw new Error(`Visual Studio debugger setup failed: ${error}`);
        }
    }

    /*
     Finds devenv.exe path from MSVC compiler path
     @param compilerPath Path to cl.exe
     @returns Path to devenv.exe if found, null otherwise
     */
    private findDevenvFromCompiler(compilerPath: string): string | null {
        // MSVC path format: C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.41.34120\bin\Hostx64\x64\cl.exe
        // devenv.exe is at:  C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\devenv.exe

        const parts = compilerPath.split(/[\\\/]/);

        // Find Visual Studio root (directory before VC)
        const vcIndex = parts.findIndex(p => p.toUpperCase() === 'VC');
        if (vcIndex === -1) {
            return null;
        }

        // Build path to devenv.exe
        const vsRoot = parts.slice(0, vcIndex).join('\\');
        const devenvPath = `${vsRoot}\\Common7\\IDE\\devenv.exe`;

        return devenvPath;
    }

    /*
     Launches VS Code debugger for GCC/MinGW-compiled tests
     @param file C test file to debug
     @param config Test execution configuration
     @param compileDuration Duration of compilation phase
     @returns Promise resolving to test results
     */
    private async launchVSCodeDebugger(
        file: TestFile,
        config: TestConfig,
        compileDuration: number
    ): Promise<TestResult> {
        const binaryPath = this.getBinaryPath(file);
        const testBaseName = basename(file.name, ".tst.c");

        try {
            // Create VS Code launch configuration
            const vscodeConfigCreated = await this.createVSCodeDebugConfig(file, config);

            if (vscodeConfigCreated) {
                console.log("🛠️  VS Code debug configuration created");
                console.log(`📁 Project location: ${file.artifactDir}`);

                // Try to launch VS Code (optional - don't fail if not available)
                let vscodeOpened = false;
                try {
                    console.log("🚀 Opening VS Code...");
                    // Open the artifact directory and the test source file
                    const vscode = await this.runCommand("code", [file.artifactDir, file.path], {
                        cwd: file.directory,
                        timeout: 10000,
                    });

                    if (vscode.exitCode === 0) {
                        vscodeOpened = true;
                        console.log("✅ VS Code opened successfully");
                    }
                } catch (error) {
                    // VS Code CLI not available - provide manual instructions
                    console.log("📋 VS Code 'code' command not found in PATH");
                    console.log(`   Manually open this folder in VS Code: ${file.artifactDir}`);
                }

                const output = `VS Code debug configuration created successfully.
Location: ${file.artifactDir}\\.vscode\\launch.json
Binary: ${binaryPath}
Source: ${file.path}

To debug:
1. ${vscodeOpened ? 'VS Code should be open' : `Open this folder in VS Code: ${file.artifactDir}`}
2. Open the test file: ${file.path}
3. Set breakpoints in your code
4. Press F5 (or Run > Start Debugging)
5. The debugger will stop at entry point

Note: Make sure you have the C/C++ extension installed in VS Code.
${!vscodeOpened ? '\nTip: Install VS Code CLI by opening VS Code > Command Palette (Ctrl+Shift+P) > "Shell Command: Install \'code\' command in PATH"' : ''}`;

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
            throw new Error(`VS Code debugger setup failed: ${error}`);
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
            const testBaseName = basename(file.name, ".tst.c");
            const vscodeDir = resolve(file.artifactDir, ".vscode");
            const launchJsonPath = resolve(vscodeDir, "launch.json");

            // Create .vscode directory if it doesn't exist
            await Bun.$`mkdir -p ${vscodeDir}`.quiet();

            const binaryPath = this.getBinaryPath(file);

            // Use cppdbg debugger type for Windows (works with both GDB and MSVC)
            const debuggerType = "cppdbg";

            const launchConfig = {
                version: "0.2.0",
                configurations: [
                    {
                        name: `Debug ${file.name}`,
                        type: debuggerType,
                        request: "launch",
                        program: binaryPath,
                        args: [],
                        stopAtEntry: true,
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
                            },
                            {
                                description: "Set Disassembly Flavor to Intel",
                                text: "-gdb-set disassembly-flavor intel",
                                ignoreFailures: true
                            }
                        ] : undefined,
                        preLaunchTask: undefined,
                        sourceFileMap: {
                            [file.directory]: file.directory
                        }
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

    /*
     Enhances compilation error messages with helpful hints
     @param error Original error message from compiler
     @param file Test file being compiled
     @returns Enhanced error message with helpful hints
     */
    private enhanceCompilationError(error: string, file: TestFile): string {
        let enhancedError = error;
        let hints: string[] = [];

        // Check for missing testme.h (must be on same line to avoid false positives)
        const testmeHeaderPatterns = [
            /testme\.h.*No such file/i,
            /testme\.h.*not found/i,
            /testme\.h.*cannot find/i,
            /No such file.*testme\.h/i,
            /not found.*testme\.h/i,
            /cannot find.*testme\.h/i,
            /fatal error:.*testme\.h/i,  // Common compiler error format
        ];

        if (testmeHeaderPatterns.some(pattern => pattern.test(error))) {
            hints.push(ErrorMessages.testmeHeaderNotFound());
        }

        // Check for missing library errors
        const libNotFoundPatterns = [
            /cannot find -l(\w+)/g,  // GCC/Clang: cannot find -lm
            /ld: library not found for -l(\w+)/g,  // macOS Clang
            /undefined reference to `(\w+)'/g,  // Missing function (likely library)
        ];

        for (const pattern of libNotFoundPatterns) {
            const matches = error.matchAll(pattern);
            for (const match of matches) {
                const libName = match[1];
                if (libName && !hints.some(h => h.includes(libName))) {
                    hints.push(`\n💡 Hint: Library '${libName}' not found.
Add to testme.json5:
{
  compiler: {
    c: {
      libraries: ['${libName}']
    }
  }
}

Or install the library development package on your system.`);
                }
            }
        }

        // Check for common include path issues
        if (error.includes(".h:") || error.includes(".h'")) {
            if (error.includes("No such file") || error.includes("not found")) {
                hints.push(`\n💡 Hint: Header file not found.
Solutions:
1. Add include path in testme.json5:
   {
     compiler: {
       c: {
         flags: ['-I/path/to/headers']
       }
     }
   }

2. Copy the header file to your test directory

3. Check the #include statement uses correct syntax:
   - System headers: #include <header.h>
   - Local headers: #include "header.h"`);
            }
        }

        // Check for syntax errors
        if (error.includes("error: expected") || error.includes("syntax error")) {
            hints.push(`\n💡 Hint: Syntax error detected.
Common causes:
- Missing semicolon ;
- Mismatched braces { }
- Missing closing parenthesis )
- Incorrect variable declarations

Check the line number in the error message above.`);
        }

        // Check for undefined reference (missing implementation)
        if (error.includes("undefined reference") || error.includes("unresolved external")) {
            hints.push(`\n💡 Hint: Undefined reference (missing implementation).
Common causes:
1. Function declared but not implemented
2. Missing library (add to libraries in testme.json5)
3. Misspelled function name
4. Missing source file in compilation`);
        }

        // Add hints to error if any were generated
        if (hints.length > 0) {
            enhancedError += "\n\n" + hints.join("\n");
        }

        return enhancedError;
    }
}
