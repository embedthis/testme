/*
 Platform detection and capability checking
 Provides unified interface for detecting OS, architecture, and available tools
 */

import { join } from "path";
import { readdir } from "fs/promises";

export enum Platform {
    Windows = "windows",
    MacOS = "macos",
    Linux = "linux",
    Unknown = "unknown"
}

export enum Architecture {
    X64 = "x64",
    ARM64 = "arm64",
    X86 = "x86",
    ARM = "arm",
    Unknown = "unknown"
}

export interface PlatformCapabilities {
    platform: Platform;
    arch: Architecture;
    compilers: CompilerInfo[];
    shells: ShellInfo[];
    debuggers: DebuggerInfo[];
}

export interface CompilerInfo {
    name: string;
    path: string;
    type: "gcc" | "clang" | "msvc" | "mingw";
    version?: string;
    env?: {
        PATH?: string;
        INCLUDE?: string;
        LIB?: string;
    };
}

export interface ShellInfo {
    name: string;
    path: string;
    type: "bash" | "sh" | "zsh" | "fish" | "powershell" | "cmd" | "pwsh";
}

export interface DebuggerInfo {
    name: string;
    path: string;
    type: "gdb" | "lldb" | "xcode" | "vs" | "windbg" | "vscode";
}

/*
 Platform detection and capability checking
 */
export class PlatformDetector {
    /*
     Detects the current platform
     @returns Platform enum value
     */
    static detectPlatform(): Platform {
        switch (process.platform) {
            case "win32":
                return Platform.Windows;
            case "darwin":
                return Platform.MacOS;
            case "linux":
                return Platform.Linux;
            default:
                return Platform.Unknown;
        }
    }

    /*
     Detects the current architecture
     @returns Architecture enum value
     */
    static detectArchitecture(): Architecture {
        switch (process.arch) {
            case "x64":
                return Architecture.X64;
            case "arm64":
                return Architecture.ARM64;
            case "ia32":
                return Architecture.X86;
            case "arm":
                return Architecture.ARM;
            default:
                return Architecture.Unknown;
        }
    }

    /*
     Checks if running on Windows
     @returns true if platform is Windows
     */
    static isWindows(): boolean {
        return this.detectPlatform() === Platform.Windows;
    }

    /*
     Checks if running on macOS
     @returns true if platform is macOS
     */
    static isMacOS(): boolean {
        return this.detectPlatform() === Platform.MacOS;
    }

    /*
     Checks if running on Linux
     @returns true if platform is Linux
     */
    static isLinux(): boolean {
        return this.detectPlatform() === Platform.Linux;
    }

    /*
     Checks if running on Unix-like system (macOS or Linux)
     @returns true if platform is Unix-like
     */
    static isUnix(): boolean {
        return this.isMacOS() || this.isLinux();
    }

    /*
     Detects all available C compilers on the system
     @returns Promise resolving to array of compiler information
     */
    static async detectCompilers(): Promise<CompilerInfo[]> {
        const compilers: CompilerInfo[] = [];

        if (this.isWindows()) {
            // Check for MSVC (cl.exe) - first in PATH, then in VS installation
            let msvc = await this.findInPath("cl.exe");
            let msvcEnv;

            // If not in PATH, try to find in Visual Studio installation
            if (!msvc) {
                const msvcInfo = await this.findMSVCCompilerWithEnv();
                if (msvcInfo) {
                    msvc = msvcInfo.path;
                    msvcEnv = msvcInfo.env;
                }
            }

            if (msvc) {
                compilers.push({
                    name: "MSVC",
                    path: msvc,
                    type: "msvc",
                    env: msvcEnv
                });
            }

            // Check for MinGW (gcc.exe)
            const mingw = await this.findInPath("gcc.exe");
            if (mingw) {
                compilers.push({
                    name: "MinGW GCC",
                    path: mingw,
                    type: "mingw"
                });
            }

            // Check for Clang (clang.exe or clang-cl.exe)
            const clang = await this.findInPath("clang.exe");
            if (clang) {
                compilers.push({
                    name: "Clang",
                    path: clang,
                    type: "clang"
                });
            }
        } else {
            // Check for GCC
            const gcc = await this.findInPath("gcc");
            if (gcc) {
                compilers.push({
                    name: "GCC",
                    path: gcc,
                    type: "gcc"
                });
            }

            // Check for Clang
            const clang = await this.findInPath("clang");
            if (clang) {
                compilers.push({
                    name: "Clang",
                    path: clang,
                    type: "clang"
                });
            }
        }

        return compilers;
    }

    /*
     Detects all available shells on the system
     @returns Promise resolving to array of shell information
     */
    static async detectShells(): Promise<ShellInfo[]> {
        const shells: ShellInfo[] = [];

        if (this.isWindows()) {
            // Check for PowerShell
            const powershell = await this.findInPath("powershell.exe");
            if (powershell) {
                shells.push({
                    name: "PowerShell",
                    path: powershell,
                    type: "powershell"
                });
            }

            // Check for PowerShell Core (pwsh)
            const pwsh = await this.findInPath("pwsh.exe");
            if (pwsh) {
                shells.push({
                    name: "PowerShell Core",
                    path: pwsh,
                    type: "pwsh"
                });
            }

            // Check for cmd
            const cmd = await this.findInPath("cmd.exe");
            if (cmd) {
                shells.push({
                    name: "Command Prompt",
                    path: cmd,
                    type: "cmd"
                });
            }

            // Check for Git Bash
            const bash = await this.findInPath("bash.exe");
            if (bash) {
                shells.push({
                    name: "Git Bash",
                    path: bash,
                    type: "bash"
                });
            }
        } else {
            // Check for common Unix shells
            for (const shellName of ["bash", "zsh", "fish", "sh"]) {
                const shellPath = await this.findInPath(shellName);
                if (shellPath) {
                    shells.push({
                        name: shellName.charAt(0).toUpperCase() + shellName.slice(1),
                        path: shellPath,
                        type: shellName as any
                    });
                }
            }
        }

        return shells;
    }

    /*
     Detects all available debuggers on the system
     @returns Promise resolving to array of debugger information
     */
    static async detectDebuggers(): Promise<DebuggerInfo[]> {
        const debuggers: DebuggerInfo[] = [];

        if (this.isWindows()) {
            // Check for Visual Studio devenv
            const devenv = await this.findInPath("devenv.exe");
            if (devenv) {
                debuggers.push({
                    name: "Visual Studio",
                    path: devenv,
                    type: "vs"
                });
            }

            // Check for WinDbg
            const windbg = await this.findInPath("windbg.exe");
            if (windbg) {
                debuggers.push({
                    name: "WinDbg",
                    path: windbg,
                    type: "windbg"
                });
            }
        } else if (this.isMacOS()) {
            // Check for Xcode
            const xcodebuild = await this.findInPath("xcodebuild");
            if (xcodebuild) {
                debuggers.push({
                    name: "Xcode",
                    path: xcodebuild,
                    type: "xcode"
                });
            }

            // Check for LLDB
            const lldb = await this.findInPath("lldb");
            if (lldb) {
                debuggers.push({
                    name: "LLDB",
                    path: lldb,
                    type: "lldb"
                });
            }
        } else if (this.isLinux()) {
            // Check for GDB
            const gdb = await this.findInPath("gdb");
            if (gdb) {
                debuggers.push({
                    name: "GDB",
                    path: gdb,
                    type: "gdb"
                });
            }
        }

        // Check for VS Code (cross-platform)
        let code = await this.findInPath(this.isWindows() ? "code.exe" : "code");

        // On Windows, check common install locations if not in PATH
        if (!code && this.isWindows()) {
            const commonPaths = [
                `${process.env.LOCALAPPDATA}\\Programs\\Microsoft VS Code\\Code.exe`,
                `C:\\Program Files\\Microsoft VS Code\\Code.exe`,
                `C:\\Program Files (x86)\\Microsoft VS Code\\Code.exe`,
            ];

            for (const path of commonPaths) {
                try {
                    const file = Bun.file(path);
                    if (await file.exists()) {
                        code = path;
                        break;
                    }
                } catch {
                    // Continue checking other paths
                }
            }
        }

        if (code) {
            debuggers.push({
                name: "VS Code",
                path: code,
                type: "vscode"
            });
        }

        // Check for Cursor (cross-platform)
        let cursor = await this.findInPath(this.isWindows() ? "cursor.exe" : "cursor");

        // On Windows, check common install locations if not in PATH
        if (!cursor && this.isWindows()) {
            const commonPaths = [
                `${process.env.LOCALAPPDATA}\\Programs\\Cursor\\Cursor.exe`,
                `C:\\Program Files\\Cursor\\Cursor.exe`,
                `C:\\Program Files (x86)\\Cursor\\Cursor.exe`,
            ];

            for (const path of commonPaths) {
                try {
                    const file = Bun.file(path);
                    if (await file.exists()) {
                        cursor = path;
                        break;
                    }
                } catch {
                    // Continue checking other paths
                }
            }
        }

        if (cursor) {
            debuggers.push({
                name: "Cursor",
                path: cursor,
                type: "vscode"
            });
        }

        return debuggers;
    }

    /*
     Detects all platform capabilities
     @returns Promise resolving to platform capabilities
     */
    static async detectCapabilities(): Promise<PlatformCapabilities> {
        return {
            platform: this.detectPlatform(),
            arch: this.detectArchitecture(),
            compilers: await this.detectCompilers(),
            shells: await this.detectShells(),
            debuggers: await this.detectDebuggers()
        };
    }

    /*
     Finds an executable in the system PATH
     @param executable Name of the executable to find
     @returns Promise resolving to full path if found, null otherwise
     */
    private static async findInPath(executable: string): Promise<string | null> {
        try {
            const which = this.isWindows() ? "where" : "which";
            const proc = Bun.spawn([which, executable], {
                stdout: "pipe",
                stderr: "pipe"
            });

            const result = await proc.exited;
            if (result === 0) {
                const stdout = await new Response(proc.stdout).text();
                const firstPath = stdout.trim().split('\n')[0].trim();
                return firstPath || null;
            }
            return null;
        } catch {
            return null;
        }
    }

    /*
     Finds MSVC compiler in Visual Studio installation directories
     Uses vswhere.exe (official VS locator) if available, then falls back to manual search
     @returns Promise resolving to cl.exe path if found, null otherwise
     */
    private static async findMSVCCompiler(): Promise<string | null> {
        const info = await this.findMSVCCompilerWithEnv();
        return info ? info.path : null;
    }

    /*
     Finds MSVC compiler with environment setup
     @returns Promise resolving to compiler path and environment, or null
     */
    private static async findMSVCCompilerWithEnv(): Promise<{ path: string; env: { PATH: string; INCLUDE: string; LIB: string } } | null> {
        if (!this.isWindows()) {
            return null;
        }

        // Try using vswhere.exe (official Visual Studio locator tool)
        const vsPath = await this.findVSInstallPathWithVSWhere();
        if (vsPath) {
            const clPath = await this.findCLInVSInstallation(vsPath);
            if (clPath) {
                const env = await this.getMSVCEnvironment(clPath, vsPath);
                return { path: clPath, env };
            }
        }

        // Fallback: Manual search through common VS installation paths
        const clPath = await this.findMSVCCompilerManual();
        if (clPath) {
            // Try to determine VS path from cl.exe path
            const parts = clPath.split('\\');
            const vsIndex = parts.findIndex(p => p.includes('Visual Studio'));
            if (vsIndex >= 0) {
                const vsPath = parts.slice(0, vsIndex + 2).join('\\');
                const env = await this.getMSVCEnvironment(clPath, vsPath);
                return { path: clPath, env };
            }
            // Return without environment if we can't determine VS path
            return { path: clPath, env: { PATH: '', INCLUDE: '', LIB: '' } };
        }

        return null;
    }

    /*
     Uses vswhere.exe to find Visual Studio installation path
     @returns Promise resolving to VS installation path if found, null otherwise
     */
    private static async findVSInstallPathWithVSWhere(): Promise<string | null> {
        const vswherePaths = [
            "C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe",
            "C:\\Program Files\\Microsoft Visual Studio\\Installer\\vswhere.exe"
        ];

        for (const vswherePath of vswherePaths) {
            try {
                const file = Bun.file(vswherePath);
                if (await file.exists()) {
                    const proc = Bun.spawn([vswherePath, "-latest", "-property", "installationPath"], {
                        stdout: "pipe",
                        stderr: "pipe"
                    });

                    const result = await proc.exited;
                    if (result === 0) {
                        const stdout = await new Response(proc.stdout).text();
                        const path = stdout.trim();
                        if (path) {
                            return path;
                        }
                    }
                }
            } catch {
                // Continue to next path
            }
        }

        return null;
    }

    /*
     Finds cl.exe within a Visual Studio installation
     @param vsPath Visual Studio installation path
     @returns Promise resolving to cl.exe path if found, null otherwise
     */
    private static async findCLInVSInstallation(vsPath: string): Promise<string | null> {
        const vcToolsPath = join(vsPath, 'VC', 'Tools', 'MSVC');

        try {
            // List MSVC version directories using Node's readdir
            const versions = await readdir(vcToolsPath);

            if (versions.length > 0) {
                // Sort versions and use the latest
                versions.sort().reverse();
                const latestVersion = versions[0];

                // Check for cl.exe in various architecture combinations
                const archCombos = [
                    ["Hostx64", "x64"],
                    ["Hostx86", "x86"],
                    ["Hostx64", "x86"],
                    ["Hostx86", "x64"]
                ];

                for (const [hostArch, targetArch] of archCombos) {
                    const clPath = join(vcToolsPath, latestVersion, 'bin', hostArch, targetArch, 'cl.exe');
                    const file = Bun.file(clPath);
                    if (await file.exists()) {
                        return clPath;
                    }
                }
            }
        } catch {
            // Directory doesn't exist or other error - continue
        }

        return null;
    }

    /*
     Gets MSVC environment paths from cl.exe path
     @param clPath Path to cl.exe
     @param vsPath Visual Studio installation path
     @returns Environment variables needed for MSVC
     */
    private static async getMSVCEnvironment(clPath: string, vsPath: string): Promise<{ PATH: string; INCLUDE: string; LIB: string }> {
        // Extract paths from cl.exe location
        // Format: C:\...\VC\Tools\MSVC\14.41.34120\bin\Hostx64\x64\cl.exe
        const parts = clPath.split('\\');
        const vcIndex = parts.findIndex(p => p.toUpperCase() === 'VC');
        const msvcIndex = parts.findIndex(p => p.toUpperCase() === 'MSVC');

        const vcPath = parts.slice(0, vcIndex + 1).join('\\');
        const msvcVersion = parts[msvcIndex + 1];
        const msvcRoot = join(vcPath, 'Tools', 'MSVC', msvcVersion);
        const binPath = parts.slice(0, parts.length - 1).join('\\');

        // Determine architecture
        const targetArch = parts[parts.length - 2]; // x64 or x86

        // Build PATH (include compiler bin and common tools)
        const pathDirs = [
            binPath,
            join(vsPath, 'Common7', 'IDE'),
            join(vsPath, 'Common7', 'Tools')
        ];

        // Build INCLUDE (C/C++ headers, Windows SDK headers, etc.)
        const includeDirs = [
            join(msvcRoot, 'include'),
            join(msvcRoot, 'atlmfc', 'include')
        ];

        // Add Windows SDK paths if available
        const kitsPath = 'C:\\Program Files (x86)\\Windows Kits\\10';
        const kitsInclude = join(kitsPath, 'Include');

        // Try to find latest Windows SDK version
        try {
            const versions = await readdir(kitsInclude);
            if (versions.length > 0) {
                versions.sort().reverse();
                const latestSDK = versions[0];
                includeDirs.push(
                    join(kitsInclude, latestSDK, 'ucrt'),
                    join(kitsInclude, latestSDK, 'um'),
                    join(kitsInclude, latestSDK, 'shared')
                );
            }
        } catch {
            // Continue without SDK paths
        }

        // Build LIB (C/C++ libraries, Windows SDK libraries)
        const libDirs = [
            join(msvcRoot, 'lib', targetArch),
            join(msvcRoot, 'atlmfc', 'lib', targetArch)
        ];

        // Add Windows SDK lib paths
        try {
            const kitsLib = join(kitsPath, 'Lib');
            const versions = await readdir(kitsLib);
            if (versions.length > 0) {
                versions.sort().reverse();
                const latestSDK = versions[0];
                libDirs.push(
                    join(kitsLib, latestSDK, 'ucrt', targetArch),
                    join(kitsLib, latestSDK, 'um', targetArch)
                );
            }
        } catch {
            // Continue without SDK paths
        }

        return {
            PATH: pathDirs.join(';'),
            INCLUDE: includeDirs.join(';'),
            LIB: libDirs.join(';')
        };
    }

    /*
     Manually searches for MSVC compiler in common Visual Studio paths
     @returns Promise resolving to cl.exe path if found, null otherwise
     */
    private static async findMSVCCompilerManual(): Promise<string | null> {
        // Common Visual Studio installation paths (both Program Files locations)
        const vsBasePaths = [
            "C:\\Program Files\\Microsoft Visual Studio",
            "C:\\Program Files (x86)\\Microsoft Visual Studio"
        ];

        // VS versions to check (newest first)
        const vsVersions = ["2022", "2019", "2017"];

        // VS editions to check (priority order)
        const vsEditions = ["Enterprise", "Professional", "Community", "BuildTools"];

        for (const basePath of vsBasePaths) {
            for (const version of vsVersions) {
                for (const edition of vsEditions) {
                    const vsPath = `${basePath}\\${version}\\${edition}`;
                    const clPath = await this.findCLInVSInstallation(vsPath);
                    if (clPath) {
                        return clPath;
                    }
                }
            }
        }

        return null;
    }
}
