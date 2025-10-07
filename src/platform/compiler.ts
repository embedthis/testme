import { PlatformDetector } from "./detector.ts";
import type { CompilerInfo } from "./detector.ts";
import { PermissionManager } from "./permissions.ts";
import os from "os";

export enum CompilerType {
    GCC = "gcc",
    Clang = "clang",
    MSVC = "msvc",
    MinGW = "mingw",
    Unknown = "unknown"
}

export interface CompilerConfig {
    compiler: string;
    type: CompilerType;
    flags: string[];
    libraries?: string[];
    env?: {
        PATH?: string;
        INCLUDE?: string;
        LIB?: string;
    };
}

export interface CompileResult {
    success: boolean;
    outputPath: string;
    stderr: string;
    stdout: string;
}

/*
 Cross-platform C compiler abstraction
 Handles compiler detection, flag translation, and compilation
 */
export class CompilerManager {
    /*
     Detects the best available C compiler for the platform
     @returns Promise resolving to compiler information
     */
    static async detectBestCompiler(): Promise<CompilerInfo | null> {
        const compilers = await PlatformDetector.detectCompilers();

        if (compilers.length === 0) {
            return null;
        }

        // Priority order differs by platform
        if (PlatformDetector.isWindows()) {
            // Windows: prefer MSVC > MinGW > Clang
            const msvc = compilers.find(c => c.type === "msvc");
            if (msvc) return msvc;

            const mingw = compilers.find(c => c.type === "mingw");
            if (mingw) return mingw;

            const clang = compilers.find(c => c.type === "clang");
            if (clang) return clang;
        } else {
            // Unix: prefer GCC > Clang
            const gcc = compilers.find(c => c.type === "gcc");
            if (gcc) return gcc;

            const clang = compilers.find(c => c.type === "clang");
            if (clang) return clang;
        }

        // Return first available as fallback
        return compilers[0];
    }

    /*
     Gets the default compiler configuration for the platform
     @param compilerName Optional compiler name to use
     @returns Compiler configuration with appropriate defaults
     */
    static async getDefaultCompilerConfig(compilerName?: string): Promise<CompilerConfig> {
        let compiler = compilerName;
        let type = CompilerType.Unknown;
        let env;

        // Treat 'default' as auto-detect (same as undefined/null)
        if (!compiler || compiler === 'default') {
            const detected = await this.detectBestCompiler();
            if (detected) {
                compiler = detected.path;
                type = this.mapCompilerType(detected.type);
                env = detected.env;
            } else if (PlatformDetector.isWindows()) {
                compiler = "cl.exe";
                type = CompilerType.MSVC;
            } else {
                compiler = "gcc";
                type = CompilerType.GCC;
            }
        } else if (compiler === 'msvc' || compiler === 'gcc' || compiler === 'clang' || compiler === 'mingw') {
            // Handle compiler type names - detect and use actual compiler
            const detected = await this.detectBestCompiler();
            if (detected && detected.type === compiler) {
                compiler = detected.path;
                type = this.mapCompilerType(detected.type);
                env = detected.env;
            } else {
                // Requested compiler not found, fall back to defaults
                if (compiler === 'msvc') {
                    compiler = "cl.exe";
                    type = CompilerType.MSVC;
                } else if (compiler === 'gcc') {
                    compiler = "gcc";
                    type = CompilerType.GCC;
                } else if (compiler === 'clang') {
                    compiler = "clang";
                    type = CompilerType.Clang;
                } else if (compiler === 'mingw') {
                    compiler = "gcc";
                    type = CompilerType.MinGW;
                }
            }
        } else {
            type = this.detectCompilerType(compiler);
        }

        const flags = this.getDefaultFlags(type);

        return {
            compiler,
            type,
            flags,
            env
        };
    }

    /*
     Detects compiler type from compiler command
     @param compiler Compiler command
     @returns Compiler type
     */
    private static detectCompilerType(compiler: string): CompilerType {
        const lower = compiler.toLowerCase();

        if (lower.includes("cl.exe") || lower.includes("cl ")) {
            return CompilerType.MSVC;
        } else if (lower.includes("gcc")) {
            return CompilerType.GCC;
        } else if (lower.includes("clang")) {
            return CompilerType.Clang;
        } else if (lower.includes("mingw")) {
            return CompilerType.MinGW;
        }

        return CompilerType.Unknown;
    }

    /*
     Maps detector compiler type to internal compiler type
     @param type Detector compiler type string
     @returns CompilerType enum value
     */
    private static mapCompilerType(type: string): CompilerType {
        switch (type) {
            case "gcc":
                return CompilerType.GCC;
            case "clang":
                return CompilerType.Clang;
            case "msvc":
                return CompilerType.MSVC;
            case "mingw":
                return CompilerType.MinGW;
            default:
                return CompilerType.Unknown;
        }
    }

    /*
     Gets default compiler flags for a compiler type
     These are the standard recommended flags that are always applied
     @param type Compiler type
     @returns Array of default flags
     */
    private static getDefaultFlags(type: CompilerType): string[] {
        const homeDir = os.homedir();

        switch (type) {
            case CompilerType.MSVC:
                return [
                    "/std:c11",     // C11 standard
                    "/W4",          // Warning level 4 (high)
                    "/Od",          // Disable optimizations (for debugging)
                    "/Zi",          // Generate debug info
                    "/FS",          // Force synchronous PDB writes (for parallel builds)
                    "/nologo",      // Suppress startup banner
                    `/I${homeDir}\\.local\\include` // Include ~/.local
                ];
            case CompilerType.GCC:
            case CompilerType.MinGW:
                const gccFlags = [
                    "-std=c99",         // C99 standard
                    "-Wall",            // Enable all warnings
                    "-Wextra",          // Enable extra warnings
                    "-Wno-unused-parameter", // Disable unused parameter warnings
                    "-Wno-strict-prototypes", // Disable strict prototype warnings
                    "-O0",              // No optimization (for debugging)
                    "-g",               // Generate debug info
                    "-I.",              // Include current directory
                    `-I${homeDir}/.local/include`, // Include ~/.local
                    `-L${homeDir}/.local/lib`, // Library path ~/.local
                ];
                // Add Homebrew paths only on macOS
                if (PlatformDetector.isMacOS()) {
                    gccFlags.push("-I/opt/homebrew/include"); // Include Homebrew (macOS)
                    gccFlags.push("-L/opt/homebrew/lib");     // Library path Homebrew (macOS)
                }
                return gccFlags;
            case CompilerType.Clang:
                const clangFlags = [
                    "-std=c99",         // C99 standard
                    "-Wall",            // Enable all warnings
                    "-Wextra",          // Enable extra warnings
                    "-Wno-unused-parameter", // Disable unused parameter warnings
                    "-O0",              // No optimization (for debugging)
                    "-g",               // Generate debug info
                    "-I.",              // Include current directory
                    `-I${homeDir}/.local/include`, // Include ~/.local
                    `-L${homeDir}/.local/lib`, // Library path ~/.local
                ];
                // Add Homebrew paths only on macOS
                if (PlatformDetector.isMacOS()) {
                    clangFlags.push("-I/opt/homebrew/include"); // Include Homebrew (macOS)
                    clangFlags.push("-L/opt/homebrew/lib");     // Library path Homebrew (macOS)
                }
                return clangFlags;
            default:
                return ["-std=c99", "-Wall"];
        }
    }

    /*
     Normalizes rpath values to use platform-appropriate tokens
     Converts @executable_path (macOS) to $ORIGIN (Linux) and vice versa
     @param flags Array of compiler flags
     @returns Array of flags with normalized rpath values
     */
    static normalizePlatformRpaths(flags: string[]): string[] {
        return flags.map(flag => {
            if (flag.includes('-rpath,')) {
                if (PlatformDetector.isMacOS()) {
                    return flag.replace(/\$ORIGIN/g, '@executable_path');
                } else if (PlatformDetector.isLinux()) {
                    return flag.replace(/@executable_path/g, '$ORIGIN').replace(/@loader_path/g, '$ORIGIN');
                }
            }
            return flag;
        });
    }

    /*
     Translates compiler flags between different compiler types
     @param flags Original flags
     @param fromType Source compiler type
     @param toType Target compiler type
     @returns Translated flags
     */
    static translateFlags(flags: string[], fromType: CompilerType, toType: CompilerType): string[] {
        // If same type or unknown, return as-is
        if (fromType === toType || toType === CompilerType.Unknown) {
            return flags;
        }

        // Translate from GCC/MinGW/Clang to MSVC
        if (toType === CompilerType.MSVC) {
            return flags.map(flag => {
                // Warning flags
                if (flag === "-Wall") return "/W4";
                if (flag === "-Wextra") return "/W4";
                if (flag === "-Werror") return "/WX";

                // Standard flags
                if (flag === "-std=c99") return "/std:c11";
                if (flag === "-std=c11") return "/std:c11";
                if (flag === "-std=c17") return "/std:c17";

                // Optimization flags
                if (flag === "-O0") return "/Od";
                if (flag === "-O1" || flag === "-O2") return "/O2";
                if (flag === "-O3") return "/Ox";

                // Debug flags
                if (flag === "-g") return "/Zi";

                // Include paths: -I/path -> /I/path
                if (flag.startsWith("-I")) {
                    return "/I" + flag.substring(2);
                }

                // Library paths: -L/path -> /LIBPATH:/path
                if (flag.startsWith("-L")) {
                    return "/LIBPATH:" + flag.substring(2);
                }

                // Defines: -DFOO -> /DFOO
                if (flag.startsWith("-D")) {
                    return "/D" + flag.substring(2);
                }

                // Unknown flags - keep as-is
                return flag;
            });
        }

        // Translate from MSVC to GCC/MinGW/Clang
        if (fromType === CompilerType.MSVC &&
            (toType === CompilerType.GCC || toType === CompilerType.MinGW || toType === CompilerType.Clang)) {
            return flags.map(flag => {
                // Warning flags
                if (flag === "/W4") return "-Wall";
                if (flag === "/WX") return "-Werror";

                // Standard flags
                if (flag === "/std:c11") return "-std=c11";
                if (flag === "/std:c17") return "-std=c17";

                // Optimization flags
                if (flag === "/Od") return "-O0";
                if (flag === "/O2") return "-O2";
                if (flag === "/Ox") return "-O3";

                // Debug flags
                if (flag === "/Zi") return "-g";

                // Include paths: /I/path -> -I/path
                if (flag.startsWith("/I")) {
                    return "-I" + flag.substring(2);
                }

                // Library paths: /LIBPATH:/path -> -L/path
                if (flag.startsWith("/LIBPATH:")) {
                    return "-L" + flag.substring(9);
                }

                // Defines: /DFOO -> -DFOO
                if (flag.startsWith("/D")) {
                    return "-D" + flag.substring(2);
                }

                // Unknown flags - keep as-is
                return flag;
            });
        }

        return flags;
    }

    /*
     Compiles a C source file
     @param sourcePath Path to source file
     @param outputPath Path for output binary
     @param config Compiler configuration
     @param workingDir Working directory for compilation
     @returns Promise resolving to compile result
     */
    static async compile(
        sourcePath: string,
        outputPath: string,
        config: CompilerConfig,
        workingDir?: string
    ): Promise<CompileResult> {
        const args: string[] = [];

        // Add platform-appropriate binary extension
        const finalOutputPath = PermissionManager.addBinaryExtension(outputPath);

        // Build compiler arguments based on compiler type
        if (config.type === CompilerType.MSVC) {
            // MSVC syntax: cl.exe [flags] /Fe:output.exe input.c /link [linker flags] [libraries]
            args.push(...config.flags);
            args.push(`/Fe:${finalOutputPath}`);
            args.push(sourcePath);

            // Add linker options
            const homeDir = os.homedir();
            args.push("/link");
            args.push(`/LIBPATH:${homeDir}\\.local\\lib`);

            if (config.libraries && config.libraries.length > 0) {
                config.libraries.forEach(lib => {
                    args.push(lib.endsWith(".lib") ? lib : `${lib}.lib`);
                });
            }
        } else {
            // GCC/Clang/MinGW syntax: gcc [flags] -o output input.c [libraries]
            args.push(...config.flags);
            args.push("-o", finalOutputPath);
            args.push(sourcePath);

            if (config.libraries && config.libraries.length > 0) {
                config.libraries.forEach(lib => {
                    if (lib.startsWith("-l")) {
                        args.push(lib);
                    } else {
                        args.push(`-l${lib}`);
                    }
                });
            }
        }

        try {
            let proc;

            // For MSVC on Windows, we need to set up the Visual Studio environment
            if (config.type === CompilerType.MSVC && PlatformDetector.isWindows() && config.env) {
                // Build environment with MSVC paths
                const env = { ...process.env };

                if (config.env.PATH) {
                    env.PATH = `${config.env.PATH};${process.env.PATH}`;
                }
                if (config.env.INCLUDE) {
                    env.INCLUDE = config.env.INCLUDE;
                }
                if (config.env.LIB) {
                    env.LIB = config.env.LIB;
                }

                proc = Bun.spawn([config.compiler, ...args], {
                    cwd: workingDir,
                    stdout: "pipe",
                    stderr: "pipe",
                    env
                });
            } else {
                proc = Bun.spawn([config.compiler, ...args], {
                    cwd: workingDir,
                    stdout: "pipe",
                    stderr: "pipe"
                });
            }

            const exitCode = await proc.exited;
            const stdout = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();

            return {
                success: exitCode === 0,
                outputPath: finalOutputPath,
                stdout,
                stderr
            };
        } catch (error) {
            return {
                success: false,
                outputPath: finalOutputPath,
                stdout: "",
                stderr: `Compilation failed: ${error}`
            };
        }
    }

    /*
     Finds vcvarsall.bat from cl.exe path
     @param clPath Path to cl.exe
     @returns Path to vcvarsall.bat if found, null otherwise
     */
    private static async findVCVarsAll(clPath: string): Promise<string | null> {
        // Path format: C:\...\VC\Tools\MSVC\14.41.34120\bin\Hostx64\x64\cl.exe
        // We need:     C:\...\VC\Auxiliary\Build\vcvarsall.bat

        // Find the VC directory by going up from cl.exe
        const parts = clPath.split('\\');
        const vcIndex = parts.findIndex(p => p.toUpperCase() === 'VC');

        if (vcIndex === -1) {
            return null;
        }

        // Build path to vcvarsall.bat
        const vcPath = parts.slice(0, vcIndex + 1).join('\\');
        const vcvarsPath = `${vcPath}\\Auxiliary\\Build\\vcvarsall.bat`;

        // Check if file exists
        const file = Bun.file(vcvarsPath);
        if (await file.exists()) {
            return vcvarsPath;
        }

        return null;
    }

    /*
     Processes library names for linking
     @param libraries Array of library names
     @param compilerType Compiler type
     @returns Array of linker flags
     */
    static processLibraries(libraries: string[], compilerType: CompilerType): string[] {
        if (compilerType === CompilerType.MSVC) {
            // MSVC uses .lib files directly or via /link
            return libraries.map(lib => {
                if (lib.endsWith(".lib")) {
                    return lib;
                } else if (lib.startsWith("lib")) {
                    return lib.slice(3) + ".lib";
                } else {
                    return lib + ".lib";
                }
            });
        } else {
            // GCC/Clang use -l flag
            return libraries.map(lib => {
                if (lib.startsWith("-l")) {
                    return lib;
                } else if (lib.startsWith("lib")) {
                    return `-l${lib.slice(3)}`;
                } else {
                    return `-l${lib}`;
                }
            });
        }
    }
}
