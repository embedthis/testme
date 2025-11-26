import {PlatformDetector} from './detector.ts'
import {extname} from 'path'

export enum ShellType {
    Bash = 'bash',
    Sh = 'sh',
    Zsh = 'zsh',
    Fish = 'fish',
    PowerShell = 'powershell',
    PowerShellCore = 'pwsh',
    Cmd = 'cmd',
    Unknown = 'unknown',
}

/*
 Cross-platform shell detection and execution
 */
export class ShellDetector {
    /*
     Detects the appropriate shell for a script file
     @param filePath Path to the script file
     @returns Promise resolving to shell command to use
     */
    static async detectShell(filePath: string): Promise<string> {
        const ext = extname(filePath).toLowerCase()

        // Extension-based detection (works on all platforms)
        if (ext === '.ps1') {
            return await this.findPowerShell()
        } else if (ext === '.bat' || ext === '.cmd') {
            return 'cmd.exe'
        } else if (ext === '.sh') {
            // Try to read shebang for .sh files
            const shebangShell = await this.detectShellFromShebang(filePath)
            if (shebangShell !== ShellType.Unknown) {
                return shebangShell
            }

            // Fall back to system default for .sh files
            if (PlatformDetector.isWindows()) {
                // On Windows, find Git Bash (avoiding WSL bash)
                return await this.findGitBash()
            } else {
                return await this.detectUnixShell()
            }
        }

        // Default shell for platform
        if (PlatformDetector.isWindows()) {
            return 'cmd.exe'
        } else {
            return await this.detectUnixShell()
        }
    }

    /*
     Detects shell from shebang line in script
     @param filePath Path to script file
     @returns Shell type detected from shebang
     */
    private static async detectShellFromShebang(filePath: string): Promise<string> {
        try {
            const file = Bun.file(filePath)
            const content = await file.text()
            const firstLine = content.split('\n')[0]

            if (firstLine.startsWith('#!')) {
                const shebang = firstLine.slice(2).trim()
                if (shebang.includes('bash')) return 'bash'
                if (shebang.includes('zsh')) return 'zsh'
                if (shebang.includes('fish')) return 'fish'
                if (shebang.includes('sh')) return 'sh'
            }
        } catch {
            // Ignore errors and fall back to default
        }

        return ShellType.Unknown
    }

    /*
     Detects the default Unix shell
     @returns Shell command to use
     */
    private static async detectUnixShell(): Promise<string> {
        // Check SHELL environment variable
        if (process.env.SHELL) {
            const shellPath = process.env.SHELL
            if (shellPath.includes('bash')) return 'bash'
            if (shellPath.includes('zsh')) return 'zsh'
            if (shellPath.includes('fish')) return 'fish'
        }

        // Ultimate fallback to POSIX shell
        return 'sh'
    }

    /*
     Finds PowerShell on the system
     @returns PowerShell command to use
     */
    private static async findPowerShell(): Promise<string> {
        // Try PowerShell Core first (cross-platform)
        const pwsh = await this.findInPath(PlatformDetector.isWindows() ? 'pwsh.exe' : 'pwsh')
        if (pwsh) {
            return PlatformDetector.isWindows() ? 'pwsh.exe' : 'pwsh'
        }

        // Fall back to Windows PowerShell
        if (PlatformDetector.isWindows()) {
            return 'powershell.exe'
        }

        throw new Error('PowerShell not found on this system')
    }

    /*
     Gets the shell type from a script file extension
     @param filePath Path to script file
     @returns ShellType enum value
     */
    static getShellTypeFromExtension(filePath: string): ShellType {
        const ext = extname(filePath).toLowerCase()

        switch (ext) {
            case '.ps1':
                return ShellType.PowerShell
            case '.bat':
            case '.cmd':
                return ShellType.Cmd
            case '.sh':
                return ShellType.Bash // Default assumption
            default:
                return ShellType.Unknown
        }
    }

    /*
     Checks if a shell type requires special handling
     @param shellType Shell type to check
     @returns true if shell requires special execution parameters
     */
    static requiresSpecialHandling(shellType: ShellType): boolean {
        return (
            shellType === ShellType.PowerShell || shellType === ShellType.PowerShellCore || shellType === ShellType.Cmd
        )
    }

    /*
     Gets the execution arguments for a shell
     @param shellType Shell type
     @param scriptPath Path to script to execute
     @returns Array of arguments to pass to shell command
     */
    static getShellArgs(shellType: ShellType, scriptPath: string): string[] {
        switch (shellType) {
            case ShellType.PowerShell:
            case ShellType.PowerShellCore:
                // PowerShell needs -ExecutionPolicy Bypass and -File
                return ['-ExecutionPolicy', 'Bypass', '-File', scriptPath]
            case ShellType.Cmd:
                // Use 'call' to execute batch file and return to caller
                return ['/c', 'call', scriptPath]
            default:
                // Unix shells just take the script path
                return [scriptPath]
        }
    }

    /*
     Determines if a file is a shell script based on extension
     @param filePath Path to file
     @returns true if file is a shell script
     */
    static isShellScript(filePath: string): boolean {
        const ext = extname(filePath).toLowerCase()
        const shellExtensions = ['.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd']
        return shellExtensions.includes(ext)
    }

    /*
     Gets supported shell script extensions for the current platform
     @returns Array of supported extensions
     */
    static getSupportedExtensions(): string[] {
        if (PlatformDetector.isWindows()) {
            return ['.ps1', '.bat', '.cmd', '.sh'] // .sh if Git Bash is available
        } else {
            return ['.sh', '.bash', '.zsh', '.fish']
        }
    }

    /*
     Finds an executable in the system PATH
     @param executable Name of the executable to find
     @returns Promise resolving to full path if found, null otherwise
     */
    private static async findInPath(executable: string): Promise<string | null> {
        try {
            const which = PlatformDetector.isWindows() ? 'where' : 'which'
            const proc = Bun.spawn([which, executable], {
                stdout: 'pipe',
                stderr: 'pipe',
            })

            const result = await proc.exited
            if (result === 0) {
                const stdout = await new Response(proc.stdout).text()
                const firstPath = stdout.trim().split('\n')[0].trim()
                return firstPath || null
            }
            return null
        } catch {
            return null
        }
    }

    /*
     Finds Git Bash on Windows, avoiding WSL bash
     Checks common installation paths and filters out WSL bash from PATH search
     @returns Promise resolving to Git Bash path or 'bash' as fallback
     */
    static async findGitBash(): Promise<string> {
        if (!PlatformDetector.isWindows()) {
            return 'bash'
        }

        // Common Git Bash installation paths
        const gitBashPaths = [
            'C:\\Program Files\\Git\\bin\\bash.exe',
            'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
            `${process.env.LOCALAPPDATA}\\Programs\\Git\\bin\\bash.exe`,
            `${process.env.ProgramFiles}\\Git\\bin\\bash.exe`,
            `${process.env['ProgramFiles(x86)']}\\Git\\bin\\bash.exe`,
        ]

        // Check each known path first
        for (const bashPath of gitBashPaths) {
            if (bashPath && (await this.fileExists(bashPath))) {
                return bashPath
            }
        }

        // Use 'where' to find bash.exe and filter out WSL paths
        try {
            const proc = Bun.spawn(['where', 'bash.exe'], {
                stdout: 'pipe',
                stderr: 'pipe',
            })

            const result = await proc.exited
            if (result === 0) {
                const stdout = await new Response(proc.stdout).text()
                const paths = stdout.trim().split('\n').map((p) => p.trim())

                // Filter out WSL paths (they contain 'WindowsApps' or 'System32')
                for (const path of paths) {
                    const lowerPath = path.toLowerCase()
                    if (
                        !lowerPath.includes('windowsapps') &&
                        !lowerPath.includes('system32') &&
                        !lowerPath.includes('wsl')
                    ) {
                        return path
                    }
                }
            }
        } catch {
            // Ignore errors
        }

        // Fallback to just 'bash' and hope it works
        return 'bash'
    }

    /*
     Checks if a file exists
     @param path File path to check
     @returns Promise resolving to true if file exists
     */
    private static async fileExists(path: string): Promise<boolean> {
        try {
            const file = Bun.file(path)
            return await file.exists()
        } catch {
            return false
        }
    }
}
