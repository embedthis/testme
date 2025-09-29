import { TestConfig } from "./types.ts";
import { relative } from "path";
import { GlobExpansion } from "./utils/glob-expansion.ts";

/*
 Manages setup and cleanup services for test execution
 Handles background processes and ensures proper cleanup
 */
export class ServiceManager {
    private setupProcess: Bun.Subprocess | null = null;
    private isSetupRunning = false;
    private invocationDir: string;

    constructor(invocationDir?: string) {
        this.invocationDir = invocationDir || process.cwd();
    }

    /*
     Runs the skip script to determine if tests should be skipped
     @param config Test configuration containing service settings
     @returns Object with shouldSkip boolean and optional message
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
            const [command, ...args] = this.parseCommand(skipCommand);

            // Run skip script in foreground with proper environment
            const skipProcess = Bun.spawn([command, ...args], {
                stdout: "pipe",
                stderr: "pipe",
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

    /*
     Runs the prep command in the foreground and waits for completion
     @param config Test configuration containing service settings
     @throws Error if prep command fails or times out
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
            const [command, ...args] = this.parseCommand(prepCommand);

            // Run prep in foreground with proper environment
            const prepProcess = Bun.spawn([command, ...args], {
                stdout: "pipe",
                stderr: "pipe",
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

    /*
     Runs the setup command as a background process
     @param config Test configuration containing service settings
     @throws Error if setup command fails or times out
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
            const [command, ...args] = this.parseCommand(setupCommand);

            // Start the background process with proper environment
            this.setupProcess = Bun.spawn([command, ...args], {
                stdout: "pipe",
                stderr: "pipe",
                stdin: "ignore",
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

            // Check if process is still running
            if (this.setupProcess && !this.setupProcess.killed) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                if (!timedOut) {
                    if (config.output?.verbose) {
                        console.log("✅ Setup service started successfully");
                    }

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
                throw new Error("Setup process exited immediately");
            }
        } catch (error) {
            this.isSetupRunning = false;
            this.setupProcess = null;
            throw new Error(`Failed to start setup service: ${error}`);
        }
    }

    /*
     Runs the cleanup command in the foreground
     @param config Test configuration containing service settings
     */
    async runCleanup(config: TestConfig): Promise<void> {
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
            const [command, ...args] = this.parseCommand(cleanupCommand);

            // Run cleanup in foreground with proper environment
            const cleanupProcess = Bun.spawn([command, ...args], {
                stdout: "pipe",
                stderr: "pipe",
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config)
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

    /*
     Kills the setup process and all its subprocesses
     */
    async killSetup(): Promise<void> {
        if (!this.setupProcess || !this.isSetupRunning) {
            return;
        }

        // Note: killSetup doesn't have access to config, so always show stopping message

        try {
            // Kill the process group to ensure all subprocesses are terminated
            if (this.setupProcess.pid) {
                // Kill process group (negative PID kills the group)
                await Bun.$`kill -TERM ${this.setupProcess.pid}`.quiet();

                // Give it a moment to terminate gracefully
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Force kill if still running
                if (!this.setupProcess.killed) {
                    await Bun.$`kill -KILL ${this.setupProcess.pid}`.quiet();
                }
            } else {
                // Fallback: just kill the main process
                this.setupProcess.kill();
            }

            this.isSetupRunning = false;
            this.setupProcess = null;
            // Note: killSetup doesn't have access to config, so always show stopped message
        } catch (error) {
            console.warn(`⚠️  Error stopping setup service: ${error}`);
            this.isSetupRunning = false;
            this.setupProcess = null;
        }
    }

    /*
     Checks if setup service is currently running
     @returns true if setup process is running
     */
    isSetupServiceRunning(): boolean {
        return (
            this.isSetupRunning &&
            this.setupProcess &&
            !this.setupProcess.killed
        );
    }

    /*
     Parses a command string into command and arguments
     @param commandString Full command string to parse
     @returns Array with command as first element and arguments as rest
     */
    private parseCommand(commandString: string): string[] {
        // Simple parsing - split on spaces (doesn't handle quoted arguments)
        // For more complex parsing, could use a proper shell parser
        const parts = commandString.trim().split(/\s+/);

        // If the command doesn't contain path separators, prefix with ./ to ensure
        // it's found in the current directory (Bun.spawn PATH resolution differs from shell)
        if (parts.length > 0 && !parts[0].includes('/') && !parts[0].includes('\\')) {
            parts[0] = `./${parts[0]}`;
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

        // Add local directory to PATH for service scripts
        env.PATH = `.${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`;

        // Add environment variables from configuration with expansion
        if (config.env) {
            const baseDir = config.configDir || process.cwd();

            for (const [key, value] of Object.entries(config.env)) {
                // Expand ${...} references in environment variable values
                const expandedValue = await GlobExpansion.expandSingle(value, baseDir);
                env[key] = expandedValue;
            }
        }

        return env;
    }
}
