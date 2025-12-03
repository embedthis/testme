import type {TestConfig} from './types.ts'
import {relative, delimiter, isAbsolute, join} from 'path'
import {GlobExpansion} from './utils/glob-expansion.ts'
import {ProcessManager} from './platform/process.ts'
import {PlatformDetector} from './platform/detector.ts'
import {HealthCheckManager} from './services/health-check.ts'
import {ShellDetector} from './platform/shell.ts'

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
 * 2. Environment - Emits environment variables (key=value lines)
 * 3. Prep - Runs once in foreground before tests
 * 4. Setup - Starts as background service during tests
 * 5. Tests Execute
 * 6. Cleanup - Runs after tests complete, kills setup if still running
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
    private setupProcess: Bun.Subprocess | null = null
    /** @internal */
    private isSetupRunning = false
    /** @internal */
    private cleanupHasRun = false
    /** @internal */
    private invocationDir: string
    /** @internal */
    private environmentVars: Record<string, string> = {}

    /**
     * Creates a new ServiceManager instance
     *
     * @param invocationDir - Directory from which tests were invoked (for display paths)
     */
    constructor(invocationDir?: string) {
        this.invocationDir = invocationDir || process.cwd()
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
    async runSkip(config: TestConfig): Promise<{shouldSkip: boolean; message?: string}> {
        const skipCommand = config.services?.skip
        if (!skipCommand) {
            return {shouldSkip: false}
        }

        const timeout = (config.services?.skipTimeout || 30) * 1000

        const displayPath = this.getDisplayPath(skipCommand, config)
        if (config.output?.verbose) {
            console.log(`Running skip script: ${displayPath}`)
        }

        try {
            // Parse command and arguments
            const [command, ...args] = await this.parseCommand(skipCommand, config.configDir)

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? 'inherit' : 'pipe'
            const stderrMode = config.output?.verbose ? 'inherit' : 'pipe'

            // Run skip script in foreground with proper environment
            const skipProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config),
            })

            // Set up timeout
            let timeoutId: Timer | undefined
            let timedOut = false

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true
                    skipProcess.kill()
                }, timeout)
            }

            // Read stdout/stderr concurrently with waiting for process exit
            // This ensures we capture output even if the process crashes
            const [result, stdout, stderr] = await Promise.all([
                skipProcess.exited,
                new Response(skipProcess.stdout).text(),
                new Response(skipProcess.stderr).text(),
            ])

            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (timedOut) {
                throw new Error(`Skip script '${displayPath}' timed out after ${timeout / 1000}s`)
            } else if (result === 0) {
                // Exit code 0 means don't skip (run tests)
                if (config.output?.verbose) {
                    console.log('✓ Skip script returned 0 - tests will run')
                }
                return {shouldSkip: false}
            } else {
                // Non-zero exit code means skip tests
                const output = this.combineServiceOutput(stdout, stderr)
                const message = output || `Skip script returned exit code ${result}`
                return {shouldSkip: true, message}
            }
        } catch (error) {
            // Extract just the message to avoid nested error wrapping
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to run skip script: ${message}`)
        }
    }

    /**
     * Runs the environment script to get environment variables
     *
     * @param config - Test configuration containing service settings
     * @returns Object with environment variables from the script
     *
     * @remarks
     * Environment script runs before prep and emits key=value lines.
     * Each line should be in the format: KEY=VALUE
     * These variables are then added to the environment for all service scripts and tests.
     */
    async runEnvironment(config: TestConfig): Promise<Record<string, string>> {
        const environmentCommand = config.services?.environment
        if (!environmentCommand) {
            return {}
        }

        const timeout = (config.services?.environmentTimeout || 30) * 1000

        const displayPath = this.getDisplayPath(environmentCommand, config)
        if (config.output?.verbose) {
            console.log(`Running environment script: ${displayPath}`)
        }

        try {
            // Parse command and arguments
            const [command, ...args] = await this.parseCommand(environmentCommand, config.configDir)

            // Always pipe stdout to capture environment variables
            // Pipe stderr in quiet mode, inherit in verbose mode
            const stderrMode = config.output?.verbose ? 'inherit' : 'pipe'

            // Run environment script in foreground with config environment
            const envProcess = Bun.spawn([command, ...args], {
                stdout: 'pipe', // Always pipe stdout to capture output
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config), // Include config environment variables
            })

            // Set up timeout
            let timeoutId: Timer | undefined
            let timedOut = false

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true
                    envProcess.kill()
                }, timeout)
            }

            // Read stdout/stderr concurrently with waiting for process exit
            // This ensures we capture output even if the process crashes
            const [result, stdout, stderr] = await Promise.all([
                envProcess.exited,
                new Response(envProcess.stdout).text(),
                new Response(envProcess.stderr).text(),
            ])

            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (timedOut) {
                throw new Error(`Environment script '${displayPath}' timed out after ${timeout / 1000}s`)
            } else if (result === 0) {
                // Parse stdout for key=value pairs
                const envVars: Record<string, string> = {}

                // Parse each line for KEY=VALUE format
                const lines = stdout.split('\n')
                for (const line of lines) {
                    const trimmed = line.trim()
                    if (!trimmed || trimmed.startsWith('#')) {
                        // Skip empty lines and comments
                        continue
                    }

                    const equalIndex = trimmed.indexOf('=')
                    if (equalIndex > 0) {
                        const key = trimmed.substring(0, equalIndex).trim()
                        const value = trimmed.substring(equalIndex + 1).trim()
                        envVars[key] = value
                    }
                }

                if (config.output?.verbose) {
                    console.log(`✓ Environment script completed - loaded ${Object.keys(envVars).length} variable(s)`)
                }

                // Store environment variables for use by other scripts
                this.environmentVars = envVars

                return envVars
            } else {
                // Show both stdout and stderr for better diagnostics
                const output = this.combineServiceOutput(stdout, stderr)
                throw new Error(`Environment script failed with exit code ${result}${output ? ':\n' + output : ''}`)
            }
        } catch (error) {
            // Extract just the message to avoid nested error wrapping
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to run environment script: ${message}`)
        }
    }

    /**
     * Runs the global prep command once before all test groups
     *
     * @param config - Test configuration containing service settings
     * @throws Error if global prep command fails or times out
     *
     * @remarks
     * Global prep script runs once before any test groups execute and waits for completion.
     * Runs in the invocation directory (root) with the root configuration environment.
     * Use for global setup operations that need to happen before all tests (e.g., building shared libraries).
     */
    async runGlobalPrep(config: TestConfig): Promise<void> {
        const globalPrepCommand = config.services?.globalPrep
        if (!globalPrepCommand) {
            return
        }

        const timeout = (config.services?.globalPrepTimeout || 30) * 1000

        const displayPath = this.getDisplayPath(globalPrepCommand, config)
        if (config.output?.verbose) {
            console.log(`Running global prep: ${displayPath}`)
        }

        try {
            // Parse command and arguments
            const [command, ...args] = await this.parseCommand(globalPrepCommand, config.configDir)

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? 'inherit' : 'pipe'
            const stderrMode = config.output?.verbose ? 'inherit' : 'pipe'

            // Run global prep in foreground with proper environment
            const globalPrepProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config),
            })

            // Set up timeout
            let timeoutId: Timer | undefined
            let timedOut = false

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true
                    globalPrepProcess.kill()
                }, timeout)
            }

            // Read stdout/stderr concurrently with waiting for process exit
            // This ensures we capture output even if the process crashes
            const [result, stdout, stderr] = await Promise.all([
                globalPrepProcess.exited,
                new Response(globalPrepProcess.stdout).text(),
                new Response(globalPrepProcess.stderr).text(),
            ])

            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (timedOut) {
                throw new Error(`Global prep script '${displayPath}' timed out after ${timeout / 1000}s`)
            } else if (result === 0) {
                console.log(`✓ Global prep completed successfully: ${displayPath}`)
            } else {
                // Show both stdout and stderr for better diagnostics
                const output = this.combineServiceOutput(stdout, stderr)
                throw new Error(`Global prep script failed with exit code ${result}${output ? ':\n' + output : ''}`)
            }
        } catch (error) {
            // Extract just the message to avoid nested error wrapping
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to run global prep script: ${message}`)
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
        const prepCommand = config.services?.prep
        if (!prepCommand) {
            return
        }

        const timeout = (config.services?.prepTimeout || 30) * 1000

        const displayPath = this.getDisplayPath(prepCommand, config)
        if (config.output?.verbose) {
            console.log(`Running prep script: ${displayPath}`)
        }

        try {
            // Parse command and arguments
            const [command, ...args] = await this.parseCommand(prepCommand, config.configDir)

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? 'inherit' : 'pipe'
            const stderrMode = config.output?.verbose ? 'inherit' : 'pipe'

            // Run prep in foreground with proper environment
            const prepProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config),
            })

            // Set up timeout
            let timeoutId: Timer | undefined
            let timedOut = false

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true
                    prepProcess.kill()
                }, timeout)
            }

            // Read stdout/stderr concurrently with waiting for process exit
            // This ensures we capture output even if the process crashes
            const [result, stdout, stderr] = await Promise.all([
                prepProcess.exited,
                new Response(prepProcess.stdout).text(),
                new Response(prepProcess.stderr).text(),
            ])

            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (timedOut) {
                throw new Error(`Prep script '${displayPath}' timed out after ${timeout / 1000}s`)
            } else if (result === 0) {
                console.log(`✓ Prep script completed successfully: ${displayPath}`)
            } else {
                // Show both stdout and stderr for better diagnostics
                const output = this.combineServiceOutput(stdout, stderr)
                throw new Error(`Prep script failed with exit code ${result}${output ? ':\n' + output : ''}`)
            }
        } catch (error) {
            // Extract just the message to avoid nested error wrapping
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to run prep script: ${message}`)
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
     * Supports health checks to verify service readiness or falls back to setupDelay.
     */
    async runSetup(config: TestConfig): Promise<void> {
        const setupCommand = config.services?.setup
        if (!setupCommand) {
            return
        }

        const timeout = (config.services?.setupTimeout || 30) * 1000

        const displayPath = this.getDisplayPath(setupCommand, config)
        if (config.output?.verbose) {
            console.log(`Starting setup service: ${displayPath}`)
        }

        try {
            // Parse command and arguments
            const [command, ...args] = await this.parseCommand(setupCommand, config.configDir, true)

            // Always pipe stdout/stderr for setup services to prevent output from appearing
            // after test results. Service output is only shown if there's an error or
            // if the service exits unexpectedly.
            // This ensures test results are always the last output displayed.
            const stdoutMode = 'pipe'
            const stderrMode = 'pipe'

            // Start the background process with proper environment
            this.setupProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                stdin: 'pipe', // Don't ignore stdin on Windows - some commands like timeout need it
                cwd: config.configDir, // Run in the directory containing testme.json5
                env: await this.getServiceEnvironment(config),
            })

            this.isSetupRunning = true

            // In verbose mode, stream setup service output to console
            if (config.output?.verbose && this.setupProcess) {
                this.streamSetupOutput(this.setupProcess)
            }

            // Set up timeout
            let timeoutId: Timer | undefined
            let timedOut = false

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true
                    console.log(`✗ Setup command '${displayPath}' timed out after ${timeout / 1000}s`)
                    this.killSetup()
                }, timeout)
            }

            // Wait for service to be ready using health check or delay
            // Support healthCheck (camelCase), healthcheck (lowercase), and health (short form) for backward compatibility
            const healthCheckConfig =
                (config.services as any)?.healthCheck ||
                (config.services as any)?.healthcheck ||
                (config.services as any)?.health
            if (healthCheckConfig) {
                // Use health check to verify service is ready
                const healthCheckManager = new HealthCheckManager()
                try {
                    await healthCheckManager.waitForHealthy(
                        healthCheckConfig,
                        this.setupProcess,
                        config.output?.verbose
                    )
                } catch (error) {
                    // Health check failed - kill the setup process
                    await this.killSetup(config)
                    throw error
                }
            } else {
                // Fall back to setupDelay if no health check configured
                // Use setupDelay if configured, fall back to legacy 'delay', default to 1 second
                const initialDelay =
                    (config.services?.setupDelay !== undefined
                        ? config.services.setupDelay
                        : config.services?.delay !== undefined
                          ? config.services.delay
                          : 1) * 1000

                if (initialDelay > 0) {
                    await new Promise((resolve) => setTimeout(resolve, initialDelay))
                }
            }

            // Check if process is still running by checking if exited promise is still pending
            const exitPromise = this.setupProcess.exited
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 100))
            const raceResult = await Promise.race([exitPromise, timeoutPromise])

            // If the race resolved to 'timeout', the process is still running
            if (this.setupProcess && raceResult === 'timeout') {
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }

                if (!timedOut) {
                    if (config.output?.verbose) {
                        console.log('✓ Setup service started successfully')
                    }

                    // Note: Setup service output is not displayed in real-time to avoid cluttering test output.
                    // Output will be shown if the service fails or exits unexpectedly.

                    // Monitor for unexpected process exit
                    this.monitorSetupProcessExit(config)

                    // Set up cleanup on process exit
                    this.registerCleanupHandlers()
                }
            } else {
                // Process exited immediately - capture output for debugging
                const exitCode = typeof raceResult === 'number' ? raceResult : -1
                let errorMessage = `Setup process exited immediately with code ${exitCode}`

                // Try to read any output from the process (only if piped, not inherited)
                if (!config.output?.verbose) {
                    try {
                        let stdout = ''
                        let stderr = ''

                        // Read stdout if it's a stream
                        if (this.setupProcess.stdout && typeof this.setupProcess.stdout !== 'number') {
                            const reader = this.setupProcess.stdout.getReader()
                            const chunks: Uint8Array[] = []
                            let done = false
                            while (!done) {
                                const result = await reader.read()
                                if (result.value) chunks.push(result.value)
                                done = result.done
                            }
                            const decoder = new TextDecoder()
                            stdout = decoder.decode(Buffer.concat(chunks))
                        }

                        // Read stderr if it's a stream
                        if (this.setupProcess.stderr && typeof this.setupProcess.stderr !== 'number') {
                            const reader = this.setupProcess.stderr.getReader()
                            const chunks: Uint8Array[] = []
                            let done = false
                            while (!done) {
                                const result = await reader.read()
                                if (result.value) chunks.push(result.value)
                                done = result.done
                            }
                            const decoder = new TextDecoder()
                            stderr = decoder.decode(Buffer.concat(chunks))
                        }

                        if (stdout || stderr) {
                            errorMessage += '\n\nProcess output:'
                            if (stdout) errorMessage += `\nSTDOUT:\n${stdout}`
                            if (stderr) errorMessage += `\nSTDERR:\n${stderr}`
                        }
                    } catch (readError) {
                        errorMessage += `\n(Could not read process output: ${readError})`
                    }
                } else {
                    errorMessage += '\n(Output was displayed above in verbose mode)'
                }

                throw new Error(errorMessage)
            }
        } catch (error) {
            this.isSetupRunning = false
            this.setupProcess = null
            // Extract just the message to avoid nested error wrapping
            const message = error instanceof Error ? error.message : String(error)
            throw new Error(`Failed to start setup service (${displayPath}): ${message}`)
        }
    }

    /**
     * Streams setup service output to console in the background
     * Does not wait for the process to complete - output is streamed asynchronously
     *
     * @param proc - The subprocess to stream output from
     * @internal
     */
    private streamSetupOutput(proc: Bun.Subprocess): void {
        // Stream stdout asynchronously
        if (proc.stdout && typeof proc.stdout !== 'number') {
            const stdoutReader = proc.stdout.getReader()
            const decoder = new TextDecoder()

            // Don't await - let it run in background
            ;(async () => {
                try {
                    while (true) {
                        const {done, value} = await stdoutReader.read()
                        if (done) break
                        const text = decoder.decode(value, {stream: true})
                        process.stdout.write(text)
                    }
                } catch (error) {
                    // Ignore errors - process may have been killed
                } finally {
                    stdoutReader.releaseLock()
                }
            })()
        }

        // Stream stderr asynchronously
        if (proc.stderr && typeof proc.stderr !== 'number') {
            const stderrReader = proc.stderr.getReader()
            const decoder = new TextDecoder()

            // Don't await - let it run in background
            ;(async () => {
                try {
                    while (true) {
                        const {done, value} = await stderrReader.read()
                        if (done) break
                        const text = decoder.decode(value, {stream: true})
                        process.stderr.write(text)
                    }
                } catch (error) {
                    // Ignore errors - process may have been killed
                } finally {
                    stderrReader.releaseLock()
                }
            })()
        }
    }

    /**
     * Runs the global cleanup command once after all test groups
     *
     * @param config - Test configuration containing service settings
     * @param allTestsPassed - Optional boolean indicating if all tests passed
     *
     * @remarks
     * Global cleanup script runs once after all test groups complete.
     * Runs in the invocation directory (root) with the root configuration environment.
     * Use for global teardown operations (stopping databases, cleaning shared resources, etc.).
     * Errors in cleanup are logged but don't fail the test run.
     * Sets TESTME_SUCCESS=1 if allTestsPassed is true, 0 otherwise.
     */
    async runGlobalCleanup(config: TestConfig, allTestsPassed?: boolean): Promise<void> {
        const globalCleanupCommand = config.services?.globalCleanup
        if (!globalCleanupCommand) {
            return
        }

        const timeout = (config.services?.globalCleanupTimeout || 10) * 1000

        const displayPath = this.getDisplayPath(globalCleanupCommand, config)
        if (config.output?.verbose) {
            console.log(`Running global cleanup: ${displayPath}`)
        }

        try {
            // Parse command and arguments
            const [command, ...args] = await this.parseCommand(globalCleanupCommand, config.configDir)

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? 'inherit' : 'pipe'
            const stderrMode = config.output?.verbose ? 'inherit' : 'pipe'

            // Get service environment and add cleanup-specific variables
            const env = await this.getServiceEnvironment(config)

            // Add TESTME_SUCCESS (1 if all tests passed, 0 otherwise)
            env.TESTME_SUCCESS = allTestsPassed === true ? '1' : '0'

            // Run global cleanup in foreground with proper environment
            const globalCleanupProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env,
            })

            // Set up timeout
            let timeoutId: Timer | undefined
            let timedOut = false

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true
                    globalCleanupProcess.kill()
                }, timeout)
            }

            // Read stdout/stderr concurrently with waiting for process exit
            // This ensures we capture output even if the process crashes
            const [result, stdout, stderr] = await Promise.all([
                globalCleanupProcess.exited,
                new Response(globalCleanupProcess.stdout).text(),
                new Response(globalCleanupProcess.stderr).text(),
            ])

            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (timedOut) {
                console.log(`✗ Global cleanup command '${displayPath}' timed out after ${timeout / 1000}s`)
            } else if (result === 0) {
                console.log(`✓ Global cleanup completed successfully: ${displayPath}`)
            } else {
                // Show both stdout and stderr for better diagnostics
                const output = this.combineServiceOutput(stdout, stderr)
                console.warn(`✗ Global cleanup completed with exit code ${result}${output ? ':\n' + output : ''}`)
            }
        } catch (error) {
            console.error(`✗ Global cleanup failed: ${error}`)
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
     */
    async runCleanup(config: TestConfig, allTestsPassed?: boolean): Promise<void> {
        const cleanupCommand = config.services?.cleanup
        if (!cleanupCommand) {
            return
        }

        // Prevent duplicate cleanup execution
        if (this.cleanupHasRun) {
            return
        }
        this.cleanupHasRun = true

        // First kill the setup process if it's running
        await this.killSetup(config)

        const timeout = (config.services?.cleanupTimeout || 10) * 1000

        const displayPath = this.getDisplayPath(cleanupCommand, config)
        if (config.output?.verbose) {
            console.log(`Running cleanup: ${displayPath}`)
        }

        try {
            // Parse command and arguments
            const [command, ...args] = await this.parseCommand(cleanupCommand, config.configDir)

            // In verbose mode, inherit stdout/stderr to show service output
            // Otherwise pipe it so we can capture on errors
            const stdoutMode = config.output?.verbose ? 'inherit' : 'pipe'
            const stderrMode = config.output?.verbose ? 'inherit' : 'pipe'

            // Get service environment and add cleanup-specific variables
            const env = await this.getServiceEnvironment(config)

            // Add TESTME_SUCCESS (1 if all tests passed, 0 otherwise)
            env.TESTME_SUCCESS = allTestsPassed === true ? '1' : '0'

            // Run cleanup in foreground with proper environment
            const cleanupProcess = Bun.spawn([command, ...args], {
                stdout: stdoutMode,
                stderr: stderrMode,
                cwd: config.configDir, // Run in the directory containing testme.json5
                env,
            })

            // Set up timeout
            let timeoutId: Timer | undefined
            let timedOut = false

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    timedOut = true
                    cleanupProcess.kill()
                }, timeout)
            }

            // Read stdout/stderr concurrently with waiting for process exit
            // This ensures we capture output even if the process crashes
            const [result, stdout, stderr] = await Promise.all([
                cleanupProcess.exited,
                new Response(cleanupProcess.stdout).text(),
                new Response(cleanupProcess.stderr).text(),
            ])

            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            if (timedOut) {
                console.log(`✗ Cleanup command '${displayPath}' timed out after ${timeout / 1000}s`)
            } else if (result === 0) {
                console.log(`✓ Cleanup completed successfully: ${displayPath}`)
            } else {
                // Show both stdout and stderr for better diagnostics
                const output = this.combineServiceOutput(stdout, stderr)
                console.warn(`✗ Cleanup completed with exit code ${result}${output ? ':\n' + output : ''}`)
            }
        } catch (error) {
            console.error(`✗ Cleanup failed: ${error}`)
        }
    }

    /**
     * Kills the setup process and all its subprocesses
     *
     * @remarks
     * Uses platform-appropriate process killing (kills entire process tree on Unix).
     * Safe to call multiple times - idempotent operation.
     */
    async killSetup(config?: TestConfig): Promise<void> {
        if (!this.setupProcess || !this.isSetupRunning) {
            return
        }

        try {
            // Get shutdown timeout from config (convert seconds to milliseconds, default to 5)
            const shutdownTimeout = (config?.services?.shutdownTimeout ?? 5) * 1000

            // Kill the process using platform-appropriate method
            if (this.setupProcess.pid) {
                await ProcessManager.killProcess(this.setupProcess.pid, true, shutdownTimeout)
            } else {
                // Fallback: just kill the main process
                this.setupProcess.kill()
            }

            this.isSetupRunning = false
            this.setupProcess = null
        } catch (error) {
            console.warn(`✗ Error stopping setup service: ${error}`)
            this.isSetupRunning = false
            this.setupProcess = null
        }
    }

    /**
     * Checks if setup service is currently running
     *
     * @returns true if setup process is running
     */
    isSetupServiceRunning(): boolean {
        return this.isSetupRunning && this.setupProcess !== null && !this.setupProcess.killed
    }

    /*
     Parses a command string into command and arguments, resolving relative paths
     @param commandString Full command string to parse
     @param cwd Current working directory to resolve relative paths
     @param isBackgroundService Whether this is for a background service (affects Windows batch handling)
     @returns Array with command as first element and arguments as rest
     */
    private async parseCommand(commandString: string, cwd?: string, isBackgroundService: boolean = false): Promise<string[]> {
        // Simple parsing - split on spaces (doesn't handle quoted arguments)
        // For more complex parsing, could use a proper shell parser
        const parts = commandString.trim().split(/\s+/)

        if (parts.length > 0) {
            const command = parts[0]
            let resolvedCommand = command

            // If it's already absolute, use as-is
            if (isAbsolute(command)) {
                resolvedCommand = command
            }
            // If it starts with ./ or .\, resolve it to an absolute path
            else if (command.startsWith('./') || command.startsWith('.\\')) {
                const relativePath = command.slice(2)
                if (cwd) {
                    resolvedCommand = join(cwd, relativePath)
                } else {
                    resolvedCommand = join(process.cwd(), relativePath)
                }
            }
            // If it doesn't contain path separators, it's a command in PATH - leave as-is
            else if (!command.includes('/') && !command.includes('\\')) {
                // Command in PATH, use as-is
                resolvedCommand = command
            }
            // Otherwise it's a relative path without ./ prefix - resolve it
            else {
                if (cwd) {
                    resolvedCommand = join(cwd, command)
                } else {
                    resolvedCommand = join(process.cwd(), command)
                }
            }

            // On Windows, batch files need to be executed via cmd.exe
            const ext = resolvedCommand.toLowerCase().slice(resolvedCommand.lastIndexOf('.'))
            if (PlatformDetector.isWindows() && (ext === '.bat' || ext === '.cmd')) {
                // For background services, don't use /c as it waits for completion
                // Just use cmd.exe to execute the batch file
                if (isBackgroundService) {
                    return ['cmd.exe', '/c', resolvedCommand, ...parts.slice(1)]
                }
                // For foreground, use cmd.exe /c to execute and return
                return ['cmd.exe', '/c', resolvedCommand, ...parts.slice(1)]
            }

            // JavaScript/TypeScript files need to be executed via bun
            // When running from compiled binary, process.execPath points to the binary, not bun
            // So we need to explicitly use 'bun' command
            if (ext === '.js' || ext === '.ts') {
                // Check if we're running from a compiled binary (process.execPath ends with our binary name)
                const isBunCompiled =
                    process.execPath.includes('/tm') ||
                    process.execPath.includes('\\tm.exe') ||
                    process.execPath.includes('\\tm')
                const bunExecutable = isBunCompiled ? 'bun' : process.execPath
                return [bunExecutable, resolvedCommand, ...parts.slice(1)]
            }

            // Shell scripts need to be executed via bash
            // On Windows: use Git Bash (avoiding WSL bash)
            // On Unix: bash to handle scripts without shebang or without execute permissions
            if (ext === '.sh') {
                const bashCommand = await ShellDetector.findGitBash()
                return [bashCommand, resolvedCommand, ...parts.slice(1)]
            }

            parts[0] = resolvedCommand
        }

        return parts
    }

    /*
     Registers cleanup handlers for process exit signals
     */
    private registerCleanupHandlers(): void {
        const cleanup = async () => {
            await this.killSetup()
        }

        // Handle various exit scenarios
        process.on('SIGINT', cleanup) // Ctrl+C
        process.on('SIGTERM', cleanup) // Termination signal
        process.on('exit', cleanup) // Normal exit
        process.on('uncaughtException', async (error) => {
            console.error('Uncaught exception:', error)
            await cleanup()
            process.exit(1)
        })
        process.on('unhandledRejection', async (reason) => {
            console.error('Unhandled rejection:', reason)
            await cleanup()
            process.exit(1)
        })
    }

    /*
     Monitors the setup process for unexpected exit after it's been validated as running
     Logs verbose information if the process exits while tests are running with non-zero exit code
     @param config Test configuration for accessing output settings
     */
    private monitorSetupProcessExit(config: TestConfig): void {
        if (!this.setupProcess) {
            return
        }

        // Monitor for unexpected exit in the background
        ;(async () => {
            try {
                const exitCode = await this.setupProcess?.exited
                // If we get here, the setup process exited while tests were running
                // Only warn if exit code is non-zero (failure) and verbose is enabled
                if (this.isSetupRunning && config.output?.verbose && exitCode !== 0) {
                    console.log(`\n⚠️  Setup process exited unexpectedly with code ${exitCode}`)
                }
                this.isSetupRunning = false
            } catch (error) {
                // Ignore errors - process may have been killed intentionally
            }
        })()
    }

    /*
     Gets the display path for a service script, showing relative path when possible
     @param command The command/script path
     @param config Configuration to get the working directory from
     @returns Relative path from invocation directory to provide context
     */
    private getDisplayPath(command: string, config: TestConfig): string {
        // If it's just a command name without path separators, return as-is
        if (!command.includes('/') && !command.includes('\\')) {
            return command
        }

        // Get the full path by combining with config directory
        const fullPath = config.configDir ? `${config.configDir}/${command}` : command
        const relativePath = relative(this.invocationDir, fullPath)

        // Always prefer showing the relative path from invocation directory for context
        // This makes it clear which directory's service script is running
        // Only fall back to command if the relative path is absurdly long
        if (!relativePath.startsWith('../../../..')) {
            return relativePath
        }

        return command
    }

    /*
     Gets the environment variables for service execution including config env vars
     @param config Configuration containing environment variables
     @returns Environment object with expanded variables and special TESTME_* variables:
              - TESTME_PLATFORM: Platform identifier (e.g., macosx-arm64)
              - TESTME_PROFILE: Build profile (e.g., dev, prod)
              - TESTME_OS: Operating system (macosx, windows, linux)
              - TESTME_ARCH: Architecture (arm64, x64)
              - TESTME_CC: Compiler name
              - TESTME_TESTDIR: Absolute path to test directory
              - TESTME_CONFIGDIR: Absolute path to config directory
              - TESTME_VERBOSE: 1 if verbose mode, 0 otherwise
              - TESTME_QUIET: 1 if quiet mode, 0 otherwise
              - TESTME_KEEP: 1 if keepArtifacts is enabled, 0 otherwise
              - TESTME_DEPTH: Depth value if --depth specified
              - TESTME_ITERATIONS: Iteration count if --iterations specified
              - TESTME_DURATION: Duration in seconds if --duration specified
     */
    private async getServiceEnvironment(config: TestConfig): Promise<Record<string, string>> {
        // Start with process environment, then add environment script variables
        // Filter out undefined values from process.env
        const env: Record<string, string> = {}
        for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined) {
                // On Windows, normalize PATH to uppercase to avoid case-sensitivity issues
                // Windows env vars are case-insensitive but JS objects are case-sensitive
                if (PlatformDetector.isWindows() && key.toUpperCase() === 'PATH') {
                    env.PATH = value
                } else {
                    env[key] = value
                }
            }
        }
        // Add environment script variables
        Object.assign(env, this.environmentVars)

        // On Windows, ensure System32 is first in PATH to prevent Unix commands from shadowing Windows commands
        if (PlatformDetector.isWindows()) {
            const system32 = 'C:\\Windows\\System32'
            const currentPath = process.env.PATH || ''
            // Remove System32 if it exists elsewhere in PATH, then add it at the beginning
            const pathParts = currentPath.split(delimiter).filter((p) => p.toLowerCase() !== system32.toLowerCase())
            env.PATH = `${system32}${delimiter}.${delimiter}${pathParts.join(delimiter)}`
        } else {
            // Add local directory to PATH for service scripts
            env.PATH = `.${delimiter}${process.env.PATH}`
        }

        // Create and export special variables for all service scripts
        // Use _envConfigDir if available (for inherited env vars), otherwise use configDir
        const baseDir = (config as any)._envConfigDir || config.configDir || process.cwd()

        // Determine current platform
        const platform = process.platform === 'darwin' ? 'macosx' : process.platform === 'win32' ? 'windows' : 'linux'

        // Create special variables for expansion (PLATFORM, PROFILE, etc.)
        const specialVars = GlobExpansion.createSpecialVariables(
            baseDir, // executableDir
            baseDir, // testDir
            config.configDir, // configDir
            undefined, // compiler (not relevant for services)
            config.profile // profile from config
        )

        // Export special variables as environment variables for service scripts
        if (specialVars.PLATFORM !== undefined) env.TESTME_PLATFORM = specialVars.PLATFORM
        if (specialVars.PROFILE !== undefined) env.TESTME_PROFILE = specialVars.PROFILE
        if (specialVars.OS !== undefined) env.TESTME_OS = specialVars.OS
        if (specialVars.ARCH !== undefined) env.TESTME_ARCH = specialVars.ARCH
        if (specialVars.CC !== undefined) env.TESTME_CC = specialVars.CC
        // Use '.' for empty relative paths (when in the same directory)
        if (specialVars.TESTDIR !== undefined) env.TESTME_TESTDIR = specialVars.TESTDIR || '.'
        if (specialVars.CONFIGDIR !== undefined) env.TESTME_CONFIGDIR = specialVars.CONFIGDIR || '.'

        // Export verbose, quiet, and keepArtifacts flags for service scripts
        env.TESTME_VERBOSE = config.output?.verbose === true ? '1' : '0'
        env.TESTME_QUIET = config.output?.quiet === true ? '1' : '0'
        env.TESTME_KEEP = config.execution?.keepArtifacts === true ? '1' : '0'

        // Export depth, iterations, and duration if set
        if (config.execution?.depth !== undefined) {
            env.TESTME_DEPTH = String(config.execution.depth)
        }
        if (config.execution?.iterations !== undefined) {
            env.TESTME_ITERATIONS = String(config.execution.iterations)
        }
        if (config.execution?.duration !== undefined) {
            env.TESTME_DURATION = String(config.execution.duration)
        }
        if (config.execution?.testClass !== undefined) {
            env.TESTME_CLASS = config.execution.testClass
        }

        // Add environment variables from configuration with expansion
        // Support both 'environment' (new) and 'env' (legacy) keys
        const configEnv = config.environment || config.env
        if (configEnv) {
            // First, process default environment variables if present
            const defaultEnv = configEnv.default
            if (defaultEnv && typeof defaultEnv === 'object') {
                for (const [key, value] of Object.entries(defaultEnv)) {
                    if (value === null || value === undefined) {
                        continue
                    }
                    // Convert to string if not already (handles numbers, booleans, etc.)
                    const stringValue = typeof value === 'string' ? value : String(value)
                    // Expand ${...} references in environment variable values
                    const expandedValue = await GlobExpansion.expandSingle(stringValue, baseDir, specialVars)
                    env[key] = expandedValue
                }
            }

            // Then, process base environment variables (exclude platform and default keys)
            for (const [key, value] of Object.entries(configEnv)) {
                // Skip platform-specific keys, default key, and null/undefined values
                if (
                    key === 'windows' ||
                    key === 'macosx' ||
                    key === 'linux' ||
                    key === 'default' ||
                    value === null ||
                    value === undefined
                ) {
                    continue
                }
                // Convert to string if not already (handles numbers, booleans, etc.)
                const stringValue = typeof value === 'string' ? value : String(value)
                // Expand ${...} references in environment variable values
                const expandedValue = await GlobExpansion.expandSingle(stringValue, baseDir, specialVars)
                env[key] = expandedValue
            }

            // Finally, merge platform-specific environment variables (these override defaults)
            const platformEnv = configEnv[platform]
            if (platformEnv) {
                for (const [key, value] of Object.entries(platformEnv)) {
                    if (value === null || value === undefined) {
                        continue
                    }
                    // Convert to string if not already (handles numbers, booleans, etc.)
                    const stringValue = typeof value === 'string' ? value : String(value)
                    // Expand ${...} references in environment variable values
                    const expandedValue = await GlobExpansion.expandSingle(stringValue, baseDir, specialVars)
                    env[key] = expandedValue
                }
            }
        }

        return env
    }

    /**
     * Combines stdout and stderr for service script error messages
     * Shows both streams with newline separator if both have content
     * @param stdout Standard output from service script
     * @param stderr Standard error from service script
     * @returns Combined output string, or empty if both are empty
     */
    private combineServiceOutput(stdout: string, stderr: string): string {
        const out = stdout.trim()
        const err = stderr.trim()

        if (out && err) {
            return `${out}\n${err}`
        } else if (out) {
            return out
        } else if (err) {
            return err
        }
        return ''
    }
}
