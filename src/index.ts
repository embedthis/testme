#!/usr/bin/env bun

import { CliParser } from "./cli.ts";
import { ConfigManager } from "./config.ts";
import { TestRunner } from "./runner.ts";
import { ServiceManager } from "./services.ts";
import { TestDiscovery } from "./discovery.ts";
import type { TestConfig, TestFile } from "./types.ts";
import { resolve, dirname, relative, join } from "path";

class TestMeApp {
    private runner: TestRunner;
    private serviceManager: ServiceManager | null = null;

    constructor() {
        this.runner = new TestRunner();
    }

    private getServiceManager(invocationDir: string): ServiceManager {
        if (!this.serviceManager) {
            this.serviceManager = new ServiceManager(invocationDir);
        }
        return this.serviceManager;
    }

    /*
     Executes tests hierarchically with proper configuration and services handling
     @param rootDir Root directory to start test discovery
     @param patterns Optional patterns to filter tests
     @param baseConfig Base configuration to inherit from
     @param options CLI options
     @returns Exit code
     */
    private async executeHierarchically(
        rootDir: string,
        patterns: string[],
        baseConfig: TestConfig,
        options: any
    ): Promise<number> {
        // Discover all tests in the directory tree
        const allTests = await TestDiscovery.discoverTests({
            rootDir,
            patterns: patterns.length > 0 ? patterns : baseConfig.patterns?.include || [],
            excludePatterns: baseConfig.patterns?.exclude || []
        });

        if (allTests.length === 0) {
            console.log("No tests discovered");
            return 0;
        }

        // Group tests by their configuration directory
        const testGroups = await this.groupTestsByConfig(allTests);

        console.log(`\nDiscovered ${allTests.length} test(s) in ${testGroups.size} configuration group(s)`);

        let allResults: any[] = [];
        let totalExitCode = 0;

        // Execute each configuration group
        for (const [configDir, tests] of testGroups) {
            // Get configuration for this group
            const groupConfig = await ConfigManager.findConfig(configDir);

            // Apply CLI overrides to group config
            const mergedConfig = this.applyCliOverrides(groupConfig, options);

            // Check if tests are disabled for this directory
            if (mergedConfig.enable === false) {
                if (mergedConfig.output?.verbose) {
                    console.log(`\n🚫 Tests disabled in: ${relative(rootDir, configDir) || '.'}`);
                }
                continue;
            }

            // Check if depth requirement is met
            const requiredDepth = mergedConfig.depth ?? 0;
            const currentDepth = options.depth ?? 0;
            if (currentDepth < requiredDepth) {
                if (mergedConfig.output?.verbose) {
                    console.log(`\n⏭️  Skipping tests in: ${relative(rootDir, configDir) || '.'} (requires --depth ${requiredDepth}, current: ${currentDepth})`);
                }
                continue;
            }

            // Check if tests should be skipped via skip script
            if (mergedConfig.services?.skip) {
                const skipResult = await this.getServiceManager(rootDir).runSkip(mergedConfig);
                if (skipResult.shouldSkip) {
                    if (mergedConfig.output?.verbose) {
                        console.log(`\n⏭️  Skipping tests in: ${relative(rootDir, configDir) || '.'} - ${skipResult.message || 'Skip script returned non-zero'}`);
                    }
                    continue;
                }
            }

            console.log(`\n🧪 Running ${tests.length} test(s) in: ${relative(rootDir, configDir) || '.'}`);

            try {
                // Run services for this configuration group
                if (mergedConfig.services?.prep) {
                    await this.getServiceManager(rootDir).runPrep(mergedConfig);
                }

                if (mergedConfig.services?.setup) {
                    await this.getServiceManager(rootDir).runSetup(mergedConfig);
                }

                // Execute tests in this group
                const results = await this.runner.executeTestsWithConfig(tests, mergedConfig, rootDir);

                allResults.push(...results);
                const exitCode = this.runner.getExitCode(results);
                if (exitCode !== 0) {
                    totalExitCode = exitCode;
                }

            } finally {
                // Cleanup for this configuration group
                if (mergedConfig.services?.cleanup) {
                    await this.getServiceManager(rootDir).runCleanup(mergedConfig);
                }
            }
        }

        // Report final results
        if (!this.isQuietMode(baseConfig)) {
            this.runner.reportFinalResults(allResults, baseConfig, rootDir);
        }

        return totalExitCode;
    }

    /*
     Groups tests by their nearest configuration directory
     @param tests Array of discovered test files
     @returns Map of config directory to tests in that directory
     */
    private async groupTestsByConfig(tests: TestFile[]): Promise<Map<string, TestFile[]>> {
        const groups = new Map<string, TestFile[]>();

        for (const test of tests) {
            // Find the nearest config directory for this test
            const configResult = await ConfigManager.findConfigFile(test.directory);
            const configDir = configResult.configDir || test.directory;

            if (!groups.has(configDir)) {
                groups.set(configDir, []);
            }
            groups.get(configDir)!.push(test);
        }

        return groups;
    }

    /*
     Applies CLI overrides to a configuration
     @param config Base configuration
     @param options CLI options
     @returns Configuration with CLI overrides applied
     */
    private applyCliOverrides(config: TestConfig, options: any): TestConfig {
        let mergedConfig = { ...config };

        if (options.verbose) {
            mergedConfig.output = {
                ...mergedConfig.output,
                verbose: true,
                format: "detailed",
                colors: mergedConfig.output?.colors ?? true,
            };
        }

        if (options.keep) {
            mergedConfig.execution = {
                ...mergedConfig.execution,
                timeout: mergedConfig.execution?.timeout ?? 30000,
                parallel: mergedConfig.execution?.parallel ?? true,
                keepArtifacts: true,
            };
        }

        if (options.step) {
            mergedConfig.execution = {
                ...mergedConfig.execution,
                timeout: mergedConfig.execution?.timeout ?? 30000,
                parallel: false,
                stepMode: true,
            };
        }

        if (options.depth !== undefined) {
            mergedConfig.execution = {
                ...mergedConfig.execution,
                timeout: mergedConfig.execution?.timeout ?? 30000,
                parallel: mergedConfig.execution?.parallel ?? true,
                depth: options.depth,
            };
        }

        if (options.debug) {
            mergedConfig.execution = {
                ...mergedConfig.execution,
                timeout: mergedConfig.execution?.timeout ?? 30000,
                parallel: false,
                debugMode: true,
                keepArtifacts: true,
            };
        }

        if (options.show) {
            mergedConfig.execution = {
                ...mergedConfig.execution,
                timeout: mergedConfig.execution?.timeout ?? 30000,
                parallel: mergedConfig.execution?.parallel ?? true,
                showCommands: true,
            };
        }

        if (options.workers !== undefined) {
            mergedConfig.execution = {
                ...mergedConfig.execution,
                timeout: mergedConfig.execution?.timeout ?? 30000,
                parallel: mergedConfig.execution?.parallel ?? true,
                workers: options.workers,
            };
        }

        return mergedConfig;
    }

    /*
     Checks if quiet mode is enabled
     @param config Configuration to check
     @returns True if quiet mode is enabled
     */
    private isQuietMode(config: TestConfig): boolean {
        return config.output?.quiet === true;
    }

    async run(args: string[]): Promise<number> {
        let isQuiet = false;
        let config: TestConfig | undefined;
        try {
            // Parse command line arguments
            const options = CliParser.parse(args);
            CliParser.validateOptions(options);
            isQuiet = options.quiet;

            // Handle help option
            if (options.help) {
                console.log(CliParser.getUsage());
                return 0;
            }

            // Handle version option
            if (options.version) {
                console.log("tm version 1.0.0");
                return 0;
            }

            // Handle chdir option
            if (options.chdir) {
                try {
                    process.chdir(options.chdir);
                } catch (error) {
                    throw new Error(
                        `Failed to change directory to ${options.chdir}: ${error}`
                    );
                }
            }

            // Load configuration
            config = options.config
                ? await ConfigManager.loadConfigFromFile(options.config)
                : await ConfigManager.findConfig(process.cwd());

            // Apply verbose flag from CLI - enables detailed output and TESTME_VERBOSE
            if (options.verbose) {
                config.output = {
                    ...config.output,
                    verbose: true,
                    format: "detailed",
                    colors: config.output?.colors ?? true,
                };
            }

            // Apply keep flag from CLI - prevents artifact cleanup
            if (options.keep) {
                config.execution = {
                    ...config.execution,
                    timeout: config.execution?.timeout ?? 30000,
                    parallel: config.execution?.parallel ?? true,
                    keepArtifacts: true,
                };
            }

            // Apply step flag from CLI - forces serial mode with prompts
            if (options.step) {
                config.execution = {
                    ...config.execution,
                    timeout: config.execution?.timeout ?? 30000,
                    parallel: false, // Force serial mode
                    stepMode: true,
                };
            }

            // Apply depth flag from CLI - sets TESTME_DEPTH environment variable
            if (options.depth !== undefined) {
                config.execution = {
                    ...config.execution,
                    timeout: config.execution?.timeout ?? 30000,
                    parallel: config.execution?.parallel ?? true,
                    depth: options.depth,
                };
            }

            // Apply debug flag from CLI - enables debugging with GDB/Xcode
            if (options.debug) {
                config.execution = {
                    ...config.execution,
                    timeout: config.execution?.timeout ?? 30000,
                    parallel: false, // Force serial mode for debugging
                    debugMode: true,
                    keepArtifacts: true, // Keep artifacts for debugging
                };
            }

            // Apply show flag from CLI - displays compile commands
            if (options.show) {
                config.execution = {
                    ...config.execution,
                    timeout: config.execution?.timeout ?? 30000,
                    parallel: config.execution?.parallel ?? true,
                    showCommands: true,
                };
            }

            // Apply workers flag from CLI - overrides number of parallel workers
            if (options.workers !== undefined) {
                config.execution = {
                    ...config.execution,
                    timeout: config.execution?.timeout ?? 30000,
                    parallel: config.execution?.parallel ?? true,
                    workers: options.workers,
                };
            }

            const rootDir = resolve(process.cwd());

            // Handle clean option
            if (options.clean) {
                console.log("Cleaning test artifacts...");
                await this.runner.cleanArtifacts(rootDir);
                console.log("✓ All test artifacts cleaned");
                return 0;
            }

            // Handle list option
            if (options.list) {
                await this.runner.listTests(
                    {
                        rootDir,
                        patterns: options.patterns.length
                            ? options.patterns
                            : config.patterns?.include || [],
                        excludePatterns: config.patterns?.exclude || [],
                    },
                    config,
                    rootDir
                );
                return 0;
            }

            // Execute tests hierarchically with proper configuration and services handling
            console.log(`\n🧪 Test runner starting in: ${rootDir}`);

            // Apply quiet mode to base config if needed
            if (options.quiet) {
                config = {
                    ...config,
                    output: {
                        ...config.output,
                        quiet: true,
                        verbose: false,
                        colors: false,
                        format: config.output?.format ?? "simple",
                    },
                };
            }

            return await this.executeHierarchically(
                rootDir,
                options.patterns,
                config,
                options
            );
        } catch (error) {
            // Ensure cleanup runs even on error
            try {
                if (config?.services?.cleanup) {
                    await this.serviceManager.runCleanup(config);
                }
            } catch (cleanupError) {
                if (!isQuiet) {
                    console.error("❌ Cleanup failed:", cleanupError);
                }
            }

            // Don't output errors in quiet mode
            if (!isQuiet) {
                this.handleError(error);
            }
            return 1;
        }
    }

    private handleError(error: unknown): void {
        if (error instanceof Error) {
            console.error(`❌ Error: ${error.message}`);

            if (process.env.DEBUG || process.env.NODE_ENV === "development") {
                console.error("Stack trace:", error.stack);
            }
        } else {
            console.error("❌ An unexpected error occurred:", error);
        }
    }
}

// Main execution
async function main() {
    const app = new TestMeApp();
    const args = process.argv.slice(2); // Remove 'node' and script name
    const exitCode = await app.run(args);
    process.exit(exitCode);
}

// Only run if this file is being executed directly
if (import.meta.main) {
    main().catch((error) => {
        console.error("💥 Fatal error:", error);
        process.exit(1);
    });
}

export { TestMeApp };
