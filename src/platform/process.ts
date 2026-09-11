import {PlatformDetector} from './detector.ts'

/*
 A process as the system reports it, with enough to walk the tree and reach its group
 */
type UnixProcess = {
    pid: number
    ppid: number
    pgid: number
}

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
                // Use 200ms interval to reduce tasklist process spawns on Windows
                // Even with shutdownTimeout=0, do at least one check to give signal handlers a chance
                const pollInterval = 200 // ms
                const maxPolls = shutdownTimeout > 0 ? Math.ceil(shutdownTimeout / pollInterval) : 1

                for (let i = 0; i < maxPolls; i++) {
                    // Wait before checking (gives process time to exit)
                    await new Promise((resolve) => setTimeout(resolve, pollInterval))

                    // Check if process is still running
                    const stillRunning = await this.isProcessRunning(pid)
                    if (!stillRunning) {
                        // Process exited gracefully - no need to force kill
                        return
                    }
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
     Kills a process and everything it started on Unix, the counterpart of taskkill /T on Windows
     Signalling the given pid alone is not enough: a setup script is a shell, and the server it
     backgrounds is a separate process that a signal to the shell never reaches. The service then
     outlives the run still holding its ports, and the next run cannot start.
     @param pid Process ID to kill
     @param graceful Whether to attempt graceful termination first
     @param shutdownTimeout Time to wait for graceful shutdown in milliseconds (default: 0)
     @returns Promise that resolves when the process and its descendants are gone
     */
    private static async killProcessUnix(pid: number, graceful: boolean, shutdownTimeout: number = 0): Promise<void> {
        try {
            //  Deepest first, so a parent cannot start more work while its children are being killed
            const targets = (await this.collectDescendantsUnix(pid)).reverse()

            if (graceful) {
                await this.signalUnix(targets, 'SIGTERM')

                // Poll for process exit with configurable timeout
                // Use 200ms interval to reduce process spawns
                // Even with shutdownTimeout=0, do at least one check to give signal handlers a chance
                const pollInterval = 200 // ms
                const maxPolls = shutdownTimeout > 0 ? Math.ceil(shutdownTimeout / pollInterval) : 1

                for (let i = 0; i < maxPolls; i++) {
                    // Wait before checking (gives processes time to exit)
                    await new Promise((resolve) => setTimeout(resolve, pollInterval))

                    const running = await Promise.all(targets.map((target) => this.isProcessRunning(target.pid)))
                    if (!running.some(Boolean)) {
                        // Everything exited gracefully - no need to SIGKILL
                        return
                    }
                }

                // If we get here, something didn't exit within timeout
                // Fall through to SIGKILL
            }

            await this.signalUnix(targets, 'SIGKILL')
        } catch (error) {
            // Process may already be dead, ignore errors
        }
    }

    /*
     Sends a signal to each target, and to the group of any target that leads one
     A shell that runs with job control puts each job in a process group of its own, so the job's
     own children are reachable only through that group
     @param targets Processes to signal, deepest first
     @param signal Signal name to send
     */
    private static async signalUnix(targets: UnixProcess[], signal: NodeJS.Signals): Promise<void> {
        const ownGroup = this.ownProcessGroup()

        for (const target of targets) {
            //  Signal the group first: its members include the target itself
            if (target.pgid === target.pid && target.pgid !== ownGroup) {
                try {
                    process.kill(-target.pgid, signal)
                    continue
                } catch {
                    // No such group, or it went away: fall back to the process itself
                }
            }
            try {
                process.kill(target.pid, signal)
            } catch {
                // Already gone
            }
        }
    }

    /*
     Reads this process's own group, so it is never signalled by a teardown
     @returns The process group id, or undefined if it cannot be determined
     */
    private static ownProcessGroup(): number | undefined {
        try {
            //  Available on Unix only; undefined elsewhere
            return (process as any).getpgrp?.()
        } catch {
            return undefined
        }
    }

    /*
     Collects a process and everything descended from it
     @param pid Root process id
     @returns The root followed by its descendants, parents before children
     */
    private static async collectDescendantsUnix(pid: number): Promise<UnixProcess[]> {
        let output = ''

        try {
            const ps = Bun.spawn(['ps', '-Ao', 'pid=,ppid=,pgid='], {stdout: 'pipe', stderr: 'pipe'})
            const [text] = await Promise.all([new Response(ps.stdout).text(), ps.exited])
            output = text
        } catch {
            // ps is unavailable: fall back to the root pid alone
        }

        return this.buildTree(this.parseProcessTable(output), pid)
    }

    /*
     Parses "pid ppid pgid" lines from ps
     @param output Raw ps output
     @returns Every process by pid, with its parent and group
     */
    private static parseProcessTable(output: string): Map<number, UnixProcess> {
        const table = new Map<number, UnixProcess>()

        for (const line of output.split('\n')) {
            const [pid, ppid, pgid] = line.trim().split(/\s+/).map(Number)
            if (Number.isInteger(pid) && Number.isInteger(ppid) && Number.isInteger(pgid)) {
                table.set(pid, {pid, ppid, pgid})
            }
        }

        return table
    }

    /*
     Walks a process table from a root outwards
     @param table Every known process
     @param pid Root process id
     @returns The root followed by its descendants, parents before children
     */
    private static buildTree(table: Map<number, UnixProcess>, pid: number): UnixProcess[] {
        const root = table.get(pid) || {pid, ppid: 0, pgid: pid}

        const children = new Map<number, UnixProcess[]>()
        for (const entry of table.values()) {
            const siblings = children.get(entry.ppid) || []
            siblings.push(entry)
            children.set(entry.ppid, siblings)
        }

        const collected: UnixProcess[] = []
        const seen = new Set<number>()
        const queue: UnixProcess[] = [root]

        while (queue.length > 0) {
            const entry = queue.shift()!
            if (seen.has(entry.pid)) {
                continue
            }
            seen.add(entry.pid)
            collected.push(entry)
            queue.push(...(children.get(entry.pid) || []))
        }

        return collected
    }

    /*
     Kills a process and everything it started, without awaiting anything
     For the process exit path, which has no chance to await: the alternative is a service that
     survives the run
     @param pid Process ID to kill
     */
    static killProcessTreeSync(pid: number): void {
        if (PlatformDetector.isWindows()) {
            try {
                Bun.spawnSync(['taskkill', '/PID', pid.toString(), '/T', '/F'], {stdout: 'pipe', stderr: 'pipe'})
            } catch {
                // Process may already be dead, ignore errors
            }
            return
        }

        const ownGroup = this.ownProcessGroup()

        for (const target of this.collectDescendantsSync(pid).reverse()) {
            if (target.pgid === target.pid && target.pgid !== ownGroup) {
                try {
                    process.kill(-target.pgid, 'SIGKILL')
                    continue
                } catch {
                    // No such group: fall back to the process itself
                }
            }
            try {
                process.kill(target.pid, 'SIGKILL')
            } catch {
                // Already gone
            }
        }
    }

    /*
     Collects a process and its descendants without awaiting
     @param pid Root process id
     @returns The root followed by its descendants, parents before children
     */
    private static collectDescendantsSync(pid: number): UnixProcess[] {
        let output = ''

        try {
            const ps = Bun.spawnSync(['ps', '-Ao', 'pid=,ppid=,pgid='], {stdout: 'pipe', stderr: 'pipe'})
            output = ps.stdout.toString()
        } catch {
            // ps is unavailable: fall back to the root pid alone
        }

        return this.buildTree(this.parseProcessTable(output), pid)
    }

    /*
     Checks if a process is running
     Uses process.kill(pid, 0) which is cross-platform and zero-overhead
     Signal 0 checks existence without actually sending a signal
     @param pid Process ID to check
     @returns Promise resolving to true if process is running
     */
    static async isProcessRunning(pid: number): Promise<boolean> {
        try {
            // process.kill(pid, 0) checks if process exists without killing it
            // Works on both Windows and Unix - throws if process doesn't exist
            process.kill(pid, 0)
            return true
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
