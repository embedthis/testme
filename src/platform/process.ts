import {PlatformDetector} from './detector.ts'

/*
 Cross-platform process management abstraction
 Provides unified interface for spawning and killing processes across platforms
 */
export class ProcessManager {
    /*
     Kills a process and its children using platform-appropriate method
     @param pid Process ID to kill
     @param graceful Whether to attempt graceful termination first
     @param shutdownTimeout Time to wait for graceful shutdown in milliseconds (default: 0)
     @returns Promise that resolves when process is killed
     */
    static async killProcess(pid: number, graceful: boolean = true, shutdownTimeout: number = 0): Promise<void> {
        if (PlatformDetector.isWindows()) {
            return this.killProcessWindows(pid, graceful, shutdownTimeout)
        } else {
            return this.killProcessUnix(pid, graceful, shutdownTimeout)
        }
    }

    /*
     Kills a process on Windows using taskkill
     @param pid Process ID to kill
     @param graceful Whether to attempt graceful termination first
     @param shutdownTimeout Time to wait for graceful shutdown in milliseconds (default: 0)
     @returns Promise that resolves when process is killed
     */
    private static async killProcessWindows(
        pid: number,
        graceful: boolean,
        shutdownTimeout: number = 0
    ): Promise<void> {
        try {
            if (graceful) {
                // Always try graceful termination first
                const gracefulKill = Bun.spawn(['taskkill', '/PID', pid.toString(), '/T'], {
                    stdout: 'pipe',
                    stderr: 'pipe',
                })

                await gracefulKill.exited

                // Poll for process exit with configurable timeout
                // Even with shutdownTimeout=0, do at least one check to give signal handlers a chance
                const pollInterval = 100 // ms
                const maxPolls = shutdownTimeout > 0 ? Math.ceil(shutdownTimeout / pollInterval) : 1

                for (let i = 0; i < maxPolls; i++) {
                    // Check if process is still running
                    const stillRunning = await this.isProcessRunning(pid)
                    if (!stillRunning) {
                        // Process exited gracefully - no need to force kill
                        return
                    }

                    // Wait before next poll (or before force kill)
                    await new Promise((resolve) => setTimeout(resolve, pollInterval))
                }

                // If we get here, process didn't exit within timeout
                // Fall through to force kill
            }

            // Force kill if still needed
            const forceKill = Bun.spawn(['taskkill', '/PID', pid.toString(), '/T', '/F'], {
                stdout: 'pipe',
                stderr: 'pipe',
            })

            await forceKill.exited
        } catch (error) {
            // Process may already be dead, ignore errors
        }
    }

    /*
     Kills a process on Unix using signals
     @param pid Process ID to kill
     @param graceful Whether to attempt graceful termination first
     @returns Promise that resolves when process is killed
     */
    private static async killProcessUnix(pid: number, graceful: boolean, shutdownTimeout: number = 0): Promise<void> {
        try {
            if (graceful) {
                // Always try SIGTERM first for graceful shutdown
                const termKill = Bun.spawn(['kill', '-TERM', pid.toString()], {
                    stdout: 'pipe',
                    stderr: 'pipe',
                })

                await termKill.exited

                // Poll for process exit with configurable timeout
                // Even with shutdownTimeout=0, do at least one check to give signal handlers a chance
                const pollInterval = 100 // ms
                const maxPolls = shutdownTimeout > 0 ? Math.ceil(shutdownTimeout / pollInterval) : 1

                for (let i = 0; i < maxPolls; i++) {
                    // Check if process is still running
                    const stillRunning = await this.isProcessRunning(pid)
                    if (!stillRunning) {
                        // Process exited gracefully - no need to SIGKILL
                        return
                    }

                    // Wait before next poll (or before SIGKILL)
                    await new Promise((resolve) => setTimeout(resolve, pollInterval))
                }

                // If we get here, process didn't exit within timeout
                // Fall through to SIGKILL
            }

            // Force kill with SIGKILL (only if process still running)
            const forceKill = Bun.spawn(['kill', '-KILL', pid.toString()], {
                stdout: 'pipe',
                stderr: 'pipe',
            })

            await forceKill.exited
        } catch (error) {
            // Process may already be dead, ignore errors
        }
    }

    /*
     Checks if a process is running
     @param pid Process ID to check
     @returns Promise resolving to true if process is running
     */
    static async isProcessRunning(pid: number): Promise<boolean> {
        try {
            if (PlatformDetector.isWindows()) {
                const proc = Bun.spawn(['tasklist', '/FI', `PID eq ${pid}`, '/NH'], {
                    stdout: 'pipe',
                    stderr: 'pipe',
                })

                const result = await proc.exited
                if (result === 0) {
                    const stdout = await new Response(proc.stdout).text()
                    return stdout.includes(pid.toString())
                }
                return false
            } else {
                // On Unix, kill -0 checks if process exists without killing it
                const proc = Bun.spawn(['kill', '-0', pid.toString()], {
                    stdout: 'pipe',
                    stderr: 'pipe',
                })

                const result = await proc.exited
                return result === 0
            }
        } catch {
            return false
        }
    }

    /*
     Gets the appropriate shell for executing commands
     @returns Shell command to use
     */
    static getSystemShell(): string {
        if (PlatformDetector.isWindows()) {
            return 'cmd.exe'
        } else {
            return process.env.SHELL || 'sh'
        }
    }

    /*
     Gets the shell flag for executing a command string
     @returns Shell flag (e.g., '-c' for Unix, '/c' for Windows cmd)
     */
    static getShellFlag(): string {
        if (PlatformDetector.isWindows()) {
            return '/c'
        } else {
            return '-c'
        }
    }

    /*
     Spawns a process with platform-appropriate configuration
     @param command Command to execute
     @param args Command arguments
     @param options Spawn options
     @returns Bun.Subprocess instance
     */
    static spawn(
        command: string,
        args: string[],
        options?: {
            cwd?: string
            env?: Record<string, string>
            stdout?: 'pipe' | 'inherit' | 'ignore'
            stderr?: 'pipe' | 'inherit' | 'ignore'
            stdin?: 'pipe' | 'inherit' | 'ignore'
        }
    ): Bun.Subprocess {
        const env = {
            ...process.env,
            ...options?.env,
        }

        // On Windows, ensure PATH includes current directory for local scripts
        if (PlatformDetector.isWindows()) {
            env.PATH = `.;${env.PATH || process.env.PATH || ''}`
        } else {
            env.PATH = `.:${env.PATH || process.env.PATH || ''}`
        }

        return Bun.spawn([command, ...args], {
            cwd: options?.cwd,
            env,
            stdout: options?.stdout || 'pipe',
            stderr: options?.stderr || 'pipe',
            stdin: options?.stdin || 'ignore',
        })
    }
}
