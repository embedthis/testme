import type {HealthCheckConfig} from '../types.ts'

/*
 HealthCheckManager - Manages service health checking

 Responsibilities:
 - Execute health checks using configured method (HTTP, TCP, script, file)
 - Poll at specified intervals until service is healthy or timeout
 - Return success when service is confirmed ready

 Architecture:
 - Strategy pattern for different health check types
 - Polling loop with configurable interval
 - Timeout handling with clear error messages
 */
export class HealthCheckManager {
    /*
     Waits for a service to become healthy using the configured health check
     @param config Health check configuration
     @param setupProcess Optional setup process to monitor (stops checking if it exits)
     @param verbose Whether to log check attempts
     @returns Promise that resolves when healthy, rejects on timeout or if setup process exits
     */
    async waitForHealthy(
        config: HealthCheckConfig,
        setupProcess: Bun.Subprocess | null = null,
        verbose: boolean = false
    ): Promise<void> {
        const interval = config.interval ?? 100 // Default 100ms
        const timeout = (config.timeout ?? 30) * 1000 // Default 30s, convert to ms
        const startTime = Date.now()

        // Determine health check type (default to http)
        const type = config.type ?? 'http'

        if (verbose) {
            console.log(`⏳ Waiting for service to be healthy (${type} check, timeout: ${timeout / 1000}s)...`)
        }

        let attemptCount = 0
        let lastError: string | null = null

        while (Date.now() - startTime < timeout) {
            // Check if setup process has exited
            if (setupProcess) {
                const exitPromise = setupProcess.exited
                const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 10))
                const raceResult = await Promise.race([exitPromise, timeoutPromise])

                // If the process has exited, stop health checks
                if (raceResult !== 'timeout') {
                    const exitCode = typeof raceResult === 'number' ? raceResult : -1
                    throw new Error(`Setup process exited with code ${exitCode} during health check`)
                }
            }

            attemptCount++

            try {
                const isHealthy = await this.checkHealth(config, type)

                if (isHealthy) {
                    if (verbose) {
                        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
                        console.log(`✓ Service is healthy (${elapsed}s, ${attemptCount} attempts)`)
                    }
                    return // Success!
                }
            } catch (error) {
                lastError = error instanceof Error ? error.message : String(error)
                if (verbose && attemptCount === 1) {
                    console.log(`  Checking... (will retry every ${interval}ms)`)
                }
            }

            // Wait before next check
            await new Promise((resolve) => setTimeout(resolve, interval))
        }

        // Timeout reached
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
        const errorMsg = lastError ? `: ${lastError}` : ''
        throw new Error(`Health check timed out after ${elapsed}s (${attemptCount} attempts)${errorMsg}`)
    }

    /*
     Performs a single health check
     @param config Health check configuration
     @param type Health check type
     @returns Promise resolving to true if healthy, false otherwise
     */
    private async checkHealth(config: HealthCheckConfig, type: string): Promise<boolean> {
        switch (type) {
            case 'http':
                return await this.checkHttp(config as Extract<HealthCheckConfig, {url: string}>)
            case 'tcp':
                return await this.checkTcp(config as Extract<HealthCheckConfig, {host: string; port: number}>)
            case 'script':
                return await this.checkScript(config as Extract<HealthCheckConfig, {command: string}>)
            case 'file':
                return await this.checkFile(config as Extract<HealthCheckConfig, {path: string}>)
            default:
                throw new Error(`Unknown health check type: ${type}`)
        }
    }

    /*
     HTTP/HTTPS health check
     @param config HTTP health check configuration
     @returns Promise resolving to true if healthy
     */
    private async checkHttp(config: Extract<HealthCheckConfig, {url: string}>): Promise<boolean> {
        const expectedStatus = config.expectedStatus ?? 200

        try {
            const response = await fetch(config.url, {
                method: 'GET',
                headers: {
                    Connection: 'close',
                },
                signal: AbortSignal.timeout(5000), // 5s timeout per request
            })

            // Check status code
            if (response.status !== expectedStatus) {
                return false
            }

            // Check body if expected body is specified
            if (config.expectedBody) {
                const body = await response.text()
                if (!body.includes(config.expectedBody)) {
                    return false
                }
            }

            return true
        } catch (error) {
            // Connection failed, service not ready
            return false
        }
    }

    /*
     TCP port health check
     @param config TCP health check configuration
     @returns Promise resolving to true if healthy
     */
    private async checkTcp(config: Extract<HealthCheckConfig, {host: string; port: number}>): Promise<boolean> {
        try {
            // Attempt TCP connection using Bun.connect
            const socket = await Bun.connect({
                hostname: config.host,
                port: config.port,
                socket: {
                    data(socket, data) {
                        socket.end()
                    },
                    open(socket) {
                        socket.end() // Close immediately after connecting
                    },
                    close(socket) {
                        // Connection successful
                    },
                    error(socket, error) {
                        // Connection failed
                    },
                },
            })

            return true // Connection succeeded
        } catch (error) {
            return false // Connection failed
        }
    }

    /*
     Script-based health check
     @param config Script health check configuration
     @returns Promise resolving to true if healthy
     */
    private async checkScript(config: Extract<HealthCheckConfig, {command: string}>): Promise<boolean> {
        const expectedExit = config.expectedExit ?? 0

        try {
            const proc = Bun.spawn(config.command.split(' '), {
                stdout: 'pipe',
                stderr: 'pipe',
            })

            const exitCode = await proc.exited
            return exitCode === expectedExit
        } catch (error) {
            return false
        }
    }

    /*
     File existence health check
     @param config File health check configuration
     @returns Promise resolving to true if healthy
     */
    private async checkFile(config: Extract<HealthCheckConfig, {path: string}>): Promise<boolean> {
        try {
            const file = Bun.file(config.path)
            return await file.exists()
        } catch (error) {
            return false
        }
    }
}
