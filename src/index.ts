#!/usr/bin/env bun

import { CliParser } from "./cli.ts";
import { ConfigManager } from "./config.ts";
import { TestRunner } from "./runner.ts";
import { ServiceManager } from "./services.ts";
import { TestDiscovery } from "./discovery.ts";
import type { TestConfig, TestFile } from "./types.ts";
import { resolve, dirname, relative, join } from "path";
import { writeFile } from "fs/promises";
import { existsSync } from "fs";

/*
 Handles --init command to create testme.json5 configuration file
 Creates a default configuration with common settings
 */
async function handleInit(): Promise<void> {
    const configPath = join(process.cwd(), "testme.json5");

    // Check if file already exists
    if (existsSync(configPath)) {
        console.error("❌ Error: testme.json5 already exists in current directory");
        process.exit(1);
    }

    const defaultConfig = `{
    /*
        TestMe Configuration
        See https://github.com/embedthis/testme for documentation
     */

    // Enable or disable tests in this directory
    enable: true,

    // Minimum depth required to run tests (use tm --depth N)
    depth: 0,

    // Compiler configuration for different languages
    compiler: {
        c: {
            compiler: 'default',  // Auto-detect best compiler

            // GCC-specific flags (Unix/Linux/MinGW)
            gcc: {
                flags: ['-I..'],
                libraries: ['m', 'pthread'],
            },

            // Clang-specific flags (macOS/Unix)
            clang: {
                flags: ['-I..'],
                libraries: ['m', 'pthread'],
            },

            // MSVC-specific flags (Windows)
            msvc: {
                flags: ['/I..'],
                libraries: [],
            },
        },
        es: {
            require: 'testme',
        },
    },

    // Test execution settings
    execution: {
        timeout: 30000,     // Timeout per test in milliseconds
        parallel: true,     // Run tests in parallel
        workers: 4,         // Number of parallel workers
    },

    // Output formatting options
    output: {
        verbose: false,     // Show detailed output
        format: 'simple',   // Output format: simple, detailed, json
        colors: true,       // Enable colored output
    },

    // File discovery patterns
    patterns: {
        include: [
            '**/*.tst.sh',
            '**/*.tst.ps1',
            '**/*.tst.bat',
            '**/*.tst.cmd',
            '**/*.tst.c',
            '**/*.tst.js',
            '**/*.tst.ts',
            '**/*.tst.es',
        ],
        exclude: ['**/node_modules/**', '**/.testme/**', '**/.*/**'],
    },

    // Service management for test setup/teardown
    services: {
        skip: '',           // Script to check if tests should be skipped
        prep: '',           // Script to run once before all tests
        setup: '',          // Background service to start before tests
        cleanup: '',        // Script to run after all tests
        delay: 0,           // Delay in ms after setup before running tests
    },

    // Environment variables for test execution
    env: {
        // Example: BIN: '\${../build/\${PLATFORM}-\${PROFILE}/bin}',
    },
}
`;

    await writeFile(configPath, defaultConfig, "utf-8");
    console.log("✓ Created testme.json5");
    console.log("\nNext steps:");
    console.log("  1. Edit testme.json5 to configure your test environment");
    console.log("  2. Create test files with .tst.* extension (e.g., math.tst.c)");
    console.log("  3. Run tests with: tm");
}

/*
 Handles --new <name> command to scaffold a test file
 Creates a template test file for the specified type
 */
async function handleNew(name: string): Promise<void> {
    // Detect test type from extension if provided, default to .tst.c
    let extension = ".tst.c";
    let baseName = name;

    if (name.includes(".tst.")) {
        // Full name with extension provided
        baseName = name.substring(0, name.indexOf(".tst."));
        extension = name.substring(name.indexOf(".tst."));
    } else if (name.includes(".")) {
        // Some extension provided, use it
        const ext = name.substring(name.lastIndexOf("."));
        baseName = name.substring(0, name.lastIndexOf("."));
        extension = ".tst" + ext;
    }

    const filePath = join(process.cwd(), baseName + extension);

    // Check if file already exists
    if (existsSync(filePath)) {
        console.error(`❌ Error: ${baseName}${extension} already exists`);
        process.exit(1);
    }

    let template = "";

    // Generate template based on file type
    if (extension === ".tst.c") {
        template = `#include "testme.h"

/*
    ${baseName} - Test file
 */

int main() {
    // Test assertions
    teq(1, 1, "1 should equal 1");
    ttrue(1 == 1, "1 should equal 1");

    // Add your tests here

    return 0;  // 0 = success, non-zero = failure
}
`;
    } else if (extension === ".tst.sh") {
        template = `#!/bin/bash
#
# ${baseName} - Shell test
#

# Simple test
if [ 1 -eq 1 ]; then
    echo "✓ Test passed"
    exit 0
else
    echo "✗ Test failed"
    exit 1
fi
`;
    } else if (extension === ".tst.js") {
        template = `/*
    ${baseName} - JavaScript test
 */

import { teq, ttrue, tfalse } from "testme";

function test() {
    teq(1, 1, "1 should equal 1");
    ttrue(1 === 1, "1 should equal 1");

    // Add your tests here
}

try {
    test();
    console.log("✓ All tests passed");
} catch (error) {
    console.error("✗ Test failed:", error.message);
    process.exit(1);
}
`;
    } else if (extension === ".tst.ts") {
        template = `/*
    ${baseName} - TypeScript test
 */

import { teq, ttrue, tfalse } from "testme";

function test(): void {
    teq(1, 1, "1 should equal 1");
    ttrue(1 === 1, "1 should equal 1");

    // Add your tests here
}

try {
    test();
    console.log("✓ All tests passed");
} catch (error) {
    console.error("✗ Test failed:", (error as Error).message);
    process.exit(1);
}
`;
    } else {
        template = `// ${baseName} test file
// Add your test code here
`;
    }

    await writeFile(filePath, template, "utf-8");
    console.log(`✓ Created ${baseName}${extension}`);
    console.log("\nNext steps:");
    console.log(`  1. Edit ${baseName}${extension} to add your tests`);
    console.log("  2. Run tests with: tm");
}

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

        if (options.profile !== undefined) {
            mergedConfig.profile = options.profile;
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

            // Handle init option - create testme.json5
            if (options.init) {
                await handleInit();
                return 0;
            }

            // Handle new option - scaffold test file
            if (options.new) {
                await handleNew(options.new);
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
