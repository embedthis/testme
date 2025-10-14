import { TestConfig } from "./types.ts";
import { relative, delimiter, isAbsolute, join } from "path";
import { GlobExpansion } from "./utils/glob-expansion.ts";
import { ProcessManager } from "./platform/process.ts";
import { PlatformDetector } from "./platform/detector.ts";

/**
 * Manages setup and cleanup services for test execution
 *
 * ServiceManager coordinates the lifecycle of test environment services including
 * skip checks, preparation scripts, background setup processes, and cleanup operations.
 * It ensures proper process management and cleanup even when tests fail or are interrupted.
 *
 * @remarks
 * Service Execution Order:
 * 1. Skip - Determines if tests should run (exit 0=run, non-zero=skip)
 * 2. Prep - Runs once in foreground before tests
 * 3. Setup - Starts as background service during tests
 * 4. Tests Execute
 * 5. Cleanup - Runs after tests complete, kills setup if still running
 *
 * Process Management:
 * - Setup processes run in background and are automatically killed on exit
 * - Cleanup handlers registered for SIGINT, SIGTERM, and process exit
 * - All scripts run in the directory containing testme.json5
 * - Environment variables from config are expanded and passed to services
 *
 * @example
 * ```typescript
 * const serviceManager = new ServiceManager('/path/to/tests');
 *
 * // Check if tests should be skipped
 * const { shouldSkip, message } = await serviceManager.runSkip(config);
 * if (shouldSkip) {
 *   console.log('Skipping:', message);
 *   return;
 * }
 *
 * // Run preparation
 * await serviceManager.runPrep(config);
 *
 * // Start background service
 * await serviceManager.runSetup(config);
 *
 * // Run tests...
 *
 * // Cleanup
 * await serviceManager.runCleanup(config);
 * ```
 */
export class ServiceManager {
    /** @internal */
    private setupProcess: Bun.Subprocess | null = null;
    /** @internal */
    private isSetupRunning = false;
    /** @internal */
    private invocationDir: string;

    /**
     * Creates a new ServiceManager instance
     *
     * @param invocationDir - Directory from which tests were invoked (for display paths)
     */
    constructor(invocationDir?: string) {
        this.invocationDir = invocationDir || process.cwd();
    }

    /**
     * Runs the skip script to determine if tests should be skipped
     *
     * @param config - Test configuration containing service settings
     * @returns Object with shouldSkip boolean and optional message
     *
     * @remarks
     * Exit code 0 means tests should run (don't skip).
     * Non-zero exit code means tests should be skipped.
     * Any output (stdout/stderr) from the skip script is captured as the skip message.
     */
    async runSkip(config: TestConfig): Promise<{ shouldSkip: boolean; message?: string }> {
        const skipCommand = config.services?.skip;
        if (!skipCommand) {
            return { shouldSkip: false };
        }

        const timeout = config.services?.skipTimeout || 30000;

        const displayPath = this.getDisplayPath(skipCommand, config);
        if (config.output?.verbose) {
            console.log(`🔍 Running skip script: ${displayPath}`);
        }

        try {
            // Parse command and arguments
            const [command, ...args] = this.parseCommand(skipCommand, config.configDir);

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? "inherit" : "pipe";
            const stderrMode = config.output?.verbose ? "inherit" : "pipe";

            // Run skip script in foreground with proper environment
            const skipProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config)
            });

            // Set up timeout
            let timeoutId: Timer | undefined;
            let timedOut = false;

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    skipProcess.kill();
                }, timeout);
            }

            const result = await skipProcess.exited;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (timedOut) {
                throw new Error(`Skip script timed out after ${timeout}ms`);
            } else if (result === 0) {
                // Exit code 0 means don't skip (run tests)
                if (config.output?.verbose) {
                    console.log("✅ Skip script returned 0 - tests will run");
                }
                return { shouldSkip: false };
            } else {
                // Non-zero exit code means skip tests
                const stdout = await new Response(skipProcess.stdout).text();
                const stderr = await new Response(skipProcess.stderr).text();
                const message = (stdout.trim() || stderr.trim()) || `Skip script returned exit code ${result}`;
                return { shouldSkip: true, message };
            }
        } catch (error) {
            throw new Error(`Failed to run skip script: ${error}`);
        }
    }

    /**
     * Runs the prep command in the foreground and waits for completion
     *
     * @param config - Test configuration containing service settings
     * @throws Error if prep command fails or times out
     *
     * @remarks
     * Prep script runs once before all tests and waits for completion.
     * Use for one-time setup operations like compiling code or starting databases.
     */
    async runPrep(config: TestConfig): Promise<void> {
        const prepCommand = config.services?.prep;
        if (!prepCommand) {
            return;
        }

        const timeout = config.services?.prepTimeout || 30000;

        const displayPath = this.getDisplayPath(prepCommand, config);
        if (config.output?.verbose) {
            console.log(`🔧 Running prep script: ${displayPath}`);
        }

        try {
            // Parse command and arguments
            const [command, ...args] = this.parseCommand(prepCommand, config.configDir);

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? "inherit" : "pipe";
            const stderrMode = config.output?.verbose ? "inherit" : "pipe";

            // Run prep in foreground with proper environment
            const prepProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config)
            });

            // Set up timeout
            let timeoutId: Timer | undefined;
            let timedOut = false;

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    prepProcess.kill();
                }, timeout);
            }

            const result = await prepProcess.exited;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (timedOut) {
                throw new Error(`Prep script timed out after ${timeout}ms`);
            } else if (result === 0) {
                if (config.output?.verbose) {
                    console.log("✅ Prep script completed successfully");
                }
            } else {
                const stderr = await new Response(prepProcess.stderr).text();
                throw new Error(`Prep script failed with exit code ${result}: ${stderr}`);
            }
        } catch (error) {
            throw new Error(`Failed to run prep script: ${error}`);
        }
    }

    /**
     * Runs the setup command as a background process
     *
     * @param config - Test configuration containing service settings
     * @throws Error if setup command fails or times out
     *
     * @remarks
     * Setup script runs in the background during test execution.
     * Automatically killed when tests complete or process exits.
     * Supports optional delay after startup before tests begin.
     */
    async runSetup(config: TestConfig): Promise<void> {
        const setupCommand = config.services?.setup;
        if (!setupCommand) {
            return;
        }

        const timeout = config.services?.setupTimeout || 30000;

        const displayPath = this.getDisplayPath(setupCommand, config);
        if (config.output?.verbose) {
            console.log(`🚀 Starting setup service: ${displayPath}`);
        }

        try {
            // Parse command and arguments
            const [command, ...args] = this.parseCommand(setupCommand, config.configDir, true);

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? "inherit" : "pipe";
            const stderrMode = config.output?.verbose ? "inherit" : "pipe";

            // Start the background process with proper environment
            this.setupProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                stdin: "pipe", // Don't ignore stdin on Windows - some commands like timeout need it
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config)
            });

            this.isSetupRunning = true;

            // Set up timeout
            let timeoutId: Timer | undefined;
            let timedOut = false;

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    console.log(
                        `⏰ Setup command timed out after ${timeout}ms`
                    );
                    this.killSetup();
                }, timeout);
            }

            // Wait for the process to start (give it a moment to initialize)
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Check if process is still running by checking if exited promise is still pending
            const exitPromise = this.setupProcess.exited;
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 100));
            const raceResult = await Promise.race([exitPromise, timeoutPromise]);

            // If the race resolved to 'timeout', the process is still running
            if (this.setupProcess && raceResult === 'timeout') {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                if (!timedOut) {
                    if (config.output?.verbose) {
                        console.log("✅ Setup service started successfully");
                    }

                    // Note: Setup service output is not displayed in real-time to avoid cluttering test output.
                    // Output will be shown if the service fails or exits unexpectedly.

                    // Apply configured delay after setup starts
                    const delay = config.services?.delay || 0;
                    if (delay > 0) {
                        if (config.output?.verbose) {
                            console.log(`⏳ Waiting ${delay}ms for setup service to initialize...`);
                        }
                        await new Promise((resolve) => setTimeout(resolve, delay));

                        if (config.output?.verbose) {
                            console.log("✅ Setup initialization delay completed");
                        }
                    }

                    // Set up cleanup on process exit
                    this.registerCleanupHandlers();
                }
            } else {
                // Process exited immediately - capture output for debugging
                const exitCode = typeof raceResult === 'number' ? raceResult : -1;
                let errorMessage = `Setup process exited immediately with code ${exitCode}`;

                // Try to read any output from the process (only if piped, not inherited)
                if (!config.output?.verbose) {
                    try {
                        let stdout = '';
                        let stderr = '';

                        // Read stdout if it's a stream
                        if (this.setupProcess.stdout && typeof this.setupProcess.stdout !== 'number') {
                            const reader = this.setupProcess.stdout.getReader();
                            const chunks: Uint8Array[] = [];
                            let done = false;
                            while (!done) {
                                const result = await reader.read();
                                if (result.value) chunks.push(result.value);
                                done = result.done;
                            }
                            const decoder = new TextDecoder();
                            stdout = decoder.decode(Buffer.concat(chunks));
                        }

                        // Read stderr if it's a stream
                        if (this.setupProcess.stderr && typeof this.setupProcess.stderr !== 'number') {
                            const reader = this.setupProcess.stderr.getReader();
                            const chunks: Uint8Array[] = [];
                            let done = false;
                            while (!done) {
                                const result = await reader.read();
                                if (result.value) chunks.push(result.value);
                                done = result.done;
                            }
                            const decoder = new TextDecoder();
                            stderr = decoder.decode(Buffer.concat(chunks));
                        }

                        if (stdout || stderr) {
                            errorMessage += '\n\nProcess output:';
                            if (stdout) errorMessage += `\nSTDOUT:\n${stdout}`;
                            if (stderr) errorMessage += `\nSTDERR:\n${stderr}`;
                        }
                    } catch (readError) {
                        errorMessage += `\n(Could not read process output: ${readError})`;
                    }
                } else {
                    errorMessage += '\n(Output was displayed above in verbose mode)';
                }

                throw new Error(errorMessage);
            }
        } catch (error) {
            this.isSetupRunning = false;
            this.setupProcess = null;
            throw new Error(`Failed to start setup service: ${error}`);
        }
    }

    /**
     * Runs the cleanup command in the foreground
     *
     * @param config - Test configuration containing service settings
     * @param allTestsPassed - Optional boolean indicating if all tests passed
     *
     * @remarks
     * Cleanup script runs after all tests complete.
     * Automatically kills the setup process first if it's still running.
     * Errors in cleanup are logged but don't fail the test run.
     * Sets TESTME_SUCCESS=1 if allTestsPassed is true, 0 otherwise.
     * Sets TESTME_KEEP=1 if keepArtifacts is enabled, 0 otherwise.
     */
    async runCleanup(config: TestConfig, allTestsPassed?: boolean): Promise<void> {
        const cleanupCommand = config.services?.cleanup;
        if (!cleanupCommand) {
            return;
        }

        // First kill the setup process if it's running
        await this.killSetup();

        const timeout = config.services?.cleanupTimeout || 10000;

        const displayPath = this.getDisplayPath(cleanupCommand, config);
        if (config.output?.verbose) {
            console.log(`🧹 Running cleanup: ${displayPath}`);
        }

        try {
            // Parse command and arguments
            const [command, ...args] = this.parseCommand(cleanupCommand, config.configDir);

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? "inherit" : "pipe";
            const stderrMode = config.output?.verbose ? "inherit" : "pipe";

            // Get service environment and add cleanup-specific variables
            const env = await this.getServiceEnvironment(config);

            // Add TESTME_SUCCESS (1 if all tests passed, 0 otherwise)
            env.TESTME_SUCCESS = allTestsPassed === true ? '1' : '0';

            // Add TESTME_KEEP (1 if keepArtifacts is enabled, 0 otherwise)
            env.TESTME_KEEP = config.execution?.keepArtifacts === true ? '1' : '0';

            // Run cleanup in foreground with proper environment
            const cleanupProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env
            });

            // Set up timeout
            let timeoutId: Timer | undefined;
            let timedOut = false;

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    cleanupProcess.kill();
                }, timeout);
            }

            const result = await cleanupProcess.exited;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (timedOut) {
                console.log(`⏰ Cleanup command timed out after ${timeout}ms`);
            } else if (result === 0) {
                if (config.output?.verbose) {
                    console.log("✅ Cleanup completed successfully");
                }
            } else {
                const stderr = await new Response(cleanupProcess.stderr).text();
                console.warn(
                    `⚠️ Cleanup completed with exit code ${result}: ${stderr}`
                );
            }
        } catch (error) {
            console.error(`❌ Cleanup failed: ${error}`);
        }
    }

    /**
     * Kills the setup process and all its subprocesses
     *
     * @remarks
     * Uses platform-appropriate process killing (kills entire process tree on Unix).
     * Safe to call multiple times - idempotent operation.
     */
    async killSetup(): Promise<void> {
        if (!this.setupProcess || !this.isSetupRunning) {
            return;
        }

        try {
            // Kill the process using platform-appropriate method
            if (this.setupProcess.pid) {
                await ProcessManager.killProcess(this.setupProcess.pid, true);
            } else {
                // Fallback: just kill the main process
                this.setupProcess.kill();
            }

            this.isSetupRunning = false;
            this.setupProcess = null;
        } catch (error) {
            console.warn(`⚠️  Error stopping setup service: ${error}`);
            this.isSetupRunning = false;
            this.setupProcess = null;
        }
    }

    /**
     * Checks if setup service is currently running
     *
     * @returns true if setup process is running
     */
    isSetupServiceRunning(): boolean {
        return (
            this.isSetupRunning &&
            this.setupProcess &&
            !this.setupProcess.killed
        );
    }

    /*
     Parses a command string into command and arguments, resolving relative paths
     @param commandString Full command string to parse
     @param cwd Current working directory to resolve relative paths
     @param isBackgroundService Whether this is for a background service (affects Windows batch handling)
     @returns Array with command as first element and arguments as rest
     */
    private parseCommand(commandString: string, cwd?: string, isBackgroundService: boolean = false): string[] {
        // Simple parsing - split on spaces (doesn't handle quoted arguments)
        // For more complex parsing, could use a proper shell parser
        const parts = commandString.trim().split(/\s+/);

        if (parts.length > 0) {
            const command = parts[0];
            let resolvedCommand = command;

            // If it's already absolute, use as-is
            if (isAbsolute(command)) {
                resolvedCommand = command;
            }
            // If it starts with ./ or .\, resolve it to an absolute path
            else if (command.startsWith('./') || command.startsWith('.\\')) {
                const relativePath = command.slice(2);
                if (cwd) {
                    resolvedCommand = join(cwd, relativePath);
                } else {
                    resolvedCommand = join(process.cwd(), relativePath);
                }
            }
            // If it doesn't contain path separators, it's a command in PATH - leave as-is
            else if (!command.includes('/') && !command.includes('\\')) {
                // Command in PATH, use as-is
                resolvedCommand = command;
            }
            // Otherwise it's a relative path without ./ prefix - resolve it
            else {
                if (cwd) {
                    resolvedCommand = join(cwd, command);
                } else {
                    resolvedCommand = join(process.cwd(), command);
                }
            }

            // On Windows, batch files need to be executed via cmd.exe
            const ext = resolvedCommand.toLowerCase().slice(resolvedCommand.lastIndexOf('.'));
            if (PlatformDetector.isWindows() && (ext === '.bat' || ext === '.cmd')) {
                // For background services, don't use /c as it waits for completion
                // Just use cmd.exe to execute the batch file
                if (isBackgroundService) {
                    return ['cmd.exe', '/c', resolvedCommand, ...parts.slice(1)];
                }
                // For foreground, use cmd.exe /c to execute and return
                return ['cmd.exe', '/c', resolvedCommand, ...parts.slice(1)];
            }

            // JavaScript/TypeScript files need to be executed via bun
            // When running from compiled binary, process.execPath points to the binary, not bun
            // So we need to explicitly use 'bun' command
            if (ext === '.js' || ext === '.ts') {
                // Check if we're running from a compiled binary (process.execPath ends with our binary name)
                const isBunCompiled = process.execPath.includes('/tm') || process.execPath.includes('\\tm.exe') || process.execPath.includes('\\tm');
                const bunExecutable = isBunCompiled ? 'bun' : process.execPath;
                return [bunExecutable, resolvedCommand, ...parts.slice(1)];
            }

            // Shell scripts on Windows need to be executed via bash (from Git for Windows)
            if (PlatformDetector.isWindows() && ext === '.sh') {
                return ['bash', resolvedCommand, ...parts.slice(1)];
            }

            parts[0] = resolvedCommand;
        }

        return parts;
    }

    /*
     Registers cleanup handlers for process exit signals
     */
    private registerCleanupHandlers(): void {
        const cleanup = async () => {
            await this.killSetup();
        };

        // Handle various exit scenarios
        process.on("SIGINT", cleanup); // Ctrl+C
        process.on("SIGTERM", cleanup); // Termination signal
        process.on("exit", cleanup); // Normal exit
        process.on("uncaughtException", async (error) => {
            console.error("Uncaught exception:", error);
            await cleanup();
            process.exit(1);
        });
        process.on("unhandledRejection", async (reason) => {
            console.error("Unhandled rejection:", reason);
            await cleanup();
            process.exit(1);
        });
    }

    /*
     Gets the display path for a service script, showing relative path when possible
     @param command The command/script path
     @param config Configuration to get the working directory from
     @returns Relative path if reasonable, otherwise just the command
     */
    private getDisplayPath(command: string, config: TestConfig): string {
        // If it's just a command name or already relative, return as-is
        if (!command.includes('/') || !command.startsWith('./')) {
            return command;
        }

        // Get the full path by combining with config directory
        const fullPath = config.configDir ? `${config.configDir}/${command}` : command;
        const relativePath = relative(this.invocationDir, fullPath);

        // If the relative path is reasonable, use it, otherwise use the original command
        if (relativePath.length <= command.length && !relativePath.startsWith('../../..')) {
            return relativePath;
        }

        return command;
    }

    /*
     Checks if quiet mode is enabled
     @param config Configuration to check
     @returns True if quiet mode is enabled
     */
    private isQuietMode(config: TestConfig): boolean {
        return config.output?.quiet === true;
    }

    /*
     Gets the environment variables for service execution including config env vars
     @param config Configuration containing environment variables
     @returns Environment object with expanded variables
     */
    private async getServiceEnvironment(config: TestConfig): Promise<Record<string, string>> {
        const env = { ...process.env };

        // On Windows, ensure System32 is first in PATH to prevent Unix commands from shadowing Windows commands
        if (PlatformDetector.isWindows()) {
            const system32 = 'C:\\Windows\\System32';
            const currentPath = process.env.PATH || '';
            // Remove System32 if it exists elsewhere in PATH, then add it at the beginning
            const pathParts = currentPath.split(delimiter).filter(p => p.toLowerCase() !== system32.toLowerCase());
            env.PATH = `${system32}${delimiter}.${delimiter}${pathParts.join(delimiter)}`;
        } else {
            // Add local directory to PATH for service scripts
            env.PATH = `.${delimiter}${process.env.PATH}`;
        }

        // Create and export special variables for all service scripts
        const baseDir = config.configDir || process.cwd();

        // Determine current platform
        const platform = process.platform === 'darwin' ? 'macosx' :
                       process.platform === 'win32' ? 'windows' : 'linux';

        // Create special variables for expansion (PLATFORM, PROFILE, etc.)
        const specialVars = GlobExpansion.createSpecialVariables(
            baseDir,  // executableDir
            baseDir,  // testDir
            config.configDir,  // configDir
            undefined,  // compiler (not relevant for services)
            config.profile  // profile from config
        );

        // Export special variables as environment variables for service scripts
        if (specialVars.PLATFORM !== undefined) env.TESTME_PLATFORM = specialVars.PLATFORM;
        if (specialVars.PROFILE !== undefined) env.TESTME_PROFILE = specialVars.PROFILE;
        if (specialVars.OS !== undefined) env.TESTME_OS = specialVars.OS;
        if (specialVars.ARCH !== undefined) env.TESTME_ARCH = specialVars.ARCH;
        if (specialVars.CC !== undefined) env.TESTME_CC = specialVars.CC;
        // Use '.' for empty relative paths (when in the same directory)
        if (specialVars.TESTDIR !== undefined) env.TESTME_TESTDIR = specialVars.TESTDIR || '.';
        if (specialVars.CONFIGDIR !== undefined) env.TESTME_CONFIGDIR = specialVars.CONFIGDIR || '.';

        // Add environment variables from configuration with expansion
        if (config.env) {
            // First, process default environment variables if present
            const defaultEnv = config.env.default;
            if (defaultEnv && typeof defaultEnv === 'object') {
                for (const [key, value] of Object.entries(defaultEnv)) {
                    if (typeof value !== 'string') {
                        continue;
                    }
                    // Expand ${...} references in environment variable values
                    const expandedValue = await GlobExpansion.expandSingle(value, baseDir, specialVars);
                    env[key] = expandedValue;
                }
            }

            // Then, process base environment variables (exclude platform and default keys)
            for (const [key, value] of Object.entries(config.env)) {
                // Skip platform-specific keys, default key, and non-string values
                if (key === 'windows' || key === 'macosx' || key === 'linux' || key === 'default' || typeof value !== 'string') {
                    continue;
                }
                // Expand ${...} references in environment variable values
                const expandedValue = await GlobExpansion.expandSingle(value, baseDir, specialVars);
                env[key] = expandedValue;
            }

            // Finally, merge platform-specific environment variables (these override defaults)
            const platformEnv = config.env[platform];
            if (platformEnv) {
                for (const [key, value] of Object.entries(platformEnv)) {
                    // Skip non-string values
                    if (typeof value !== 'string') {
                        continue;
                    }
                    // Expand ${...} references in environment variable values
                    const expandedValue = await GlobExpansion.expandSingle(value, baseDir, specialVars);
                    env[key] = expandedValue;
                }
            }
        }

        return env;
    }
}
