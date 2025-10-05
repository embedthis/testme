/*
    Service Lifecycle Integration Tests
    Tests the complete service lifecycle: skip, prep, setup, cleanup
 */

import { ServiceManager } from "../../src/services.ts";
import type { TestConfig } from "../../src/types.ts";
import { writeFile, unlink, mkdir, rmdir } from "node:fs/promises";
import { join } from "path";
import { PlatformDetector } from "../../src/platform/detector.ts";

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
}

// Create a unique test directory using process ID to avoid conflicts
const testDir = join(process.cwd(), `.test/service-${process.pid}`);
const isWindows = PlatformDetector.isWindows();

async function setupTestDir(): Promise<void> {
    await mkdir(testDir, { recursive: true });
}

async function cleanupTestDir(): Promise<void> {
    try {
        await rmdir(testDir, { recursive: true });
    } catch {
        // Ignore cleanup errors
    }
}

async function createScript(filename: string, content: string): Promise<string> {
    const ext = isWindows ? ".bat" : ".sh";
    const scriptPath = join(testDir, filename + ext);
    const scriptContent = isWindows ? content : `#!/bin/bash\n${content}`;
    await writeFile(scriptPath, scriptContent, { mode: 0o755 });
    return scriptPath;
}

async function testSkipService(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const serviceManager = new ServiceManager(testDir);

    // Test 1: Skip script that returns 0 (don't skip)
    const dontSkipScript = await createScript("dont-skip", isWindows ? "@exit 0" : "exit 0");

    const config1: TestConfig = {
        services: {
            skip: `./${dontSkipScript.split('/').pop()}`
        },
        configDir: testDir,
        execution: { timeout: 30000, parallel: false },
        output: { verbose: false, format: "simple", colors: true },
        patterns: { include: [], exclude: [] }
    };

    const skipResult1 = await serviceManager.runSkip(config1);
    results.push({
        name: "Skip script returning 0 means don't skip",
        passed: !skipResult1.shouldSkip,
        message: `shouldSkip: ${skipResult1.shouldSkip}, expected: false`
    });

    // Test 2: Skip script that returns non-zero (skip tests)
    const doSkipScript = await createScript("do-skip", isWindows ? "@exit 1" : "exit 1");

    const config2: TestConfig = {
        services: {
            skip: `./${doSkipScript.split('/').pop()}`
        },
        configDir: testDir,
        execution: { timeout: 30000, parallel: false },
        output: { verbose: false, format: "simple", colors: true },
        patterns: { include: [], exclude: [] }
    };

    const skipResult2 = await serviceManager.runSkip(config2);
    results.push({
        name: "Skip script returning non-zero means skip",
        passed: skipResult2.shouldSkip,
        message: `shouldSkip: ${skipResult2.shouldSkip}, expected: true`
    });

    // Test 3: Skip script with message
    const skipWithMessageScript = await createScript(
        "skip-with-message",
        isWindows ? "@echo Skipping due to missing dependencies\n@exit 1" : "echo 'Skipping due to missing dependencies'\nexit 1"
    );

    const config3: TestConfig = {
        services: {
            skip: `./${skipWithMessageScript.split('/').pop()}`
        },
        configDir: testDir,
        execution: { timeout: 30000, parallel: false },
        output: { verbose: false, format: "simple", colors: true },
        patterns: { include: [], exclude: [] }
    };

    const skipResult3 = await serviceManager.runSkip(config3);
    results.push({
        name: "Skip script captures message",
        passed: skipResult3.shouldSkip && !!skipResult3.message && skipResult3.message.includes("missing dependencies"),
        message: `Message: ${skipResult3.message}`
    });

    // Cleanup
    await unlink(dontSkipScript);
    await unlink(doSkipScript);
    await unlink(skipWithMessageScript);

    return results;
}

async function testPrepService(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const serviceManager = new ServiceManager(testDir);

    // Test 1: Prep script that creates a file
    const prepMarker = join(testDir, "prep-ran.txt");
    const prepScript = await createScript(
        "prep",
        isWindows ? `@echo prep > ${prepMarker}` : `echo 'prep' > ${prepMarker}`
    );

    const config: TestConfig = {
        services: {
            prep: `./${prepScript.split('/').pop()}`
        },
        configDir: testDir,
        execution: { timeout: 30000, parallel: false },
        output: { verbose: false, format: "simple", colors: true },
        patterns: { include: [], exclude: [] }
    };

    try {
        await serviceManager.runPrep(config);

        // Check if prep ran
        const file = Bun.file(prepMarker);
        const exists = await file.exists();

        results.push({
            name: "Prep script executes successfully",
            passed: exists,
            message: `Prep marker exists: ${exists}`
        });

        // Cleanup
        if (exists) {
            await unlink(prepMarker);
        }
    } catch (error) {
        results.push({
            name: "Prep script executes successfully",
            passed: false,
            message: `Error: ${error}`
        });
    }

    await unlink(prepScript);
    return results;
}

async function testSetupCleanupService(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const serviceManager = new ServiceManager(testDir);

    // Test 1: Setup service that runs in background
    const setupMarker = join(testDir, "setup-ran.txt");
    const setupScript = await createScript(
        "setup",
        isWindows
            ? `@echo setup > ${setupMarker}\n@timeout /t 5 /nobreak > nul`
            : `echo 'setup' > ${setupMarker}\nsleep 5`
    );

    const config: TestConfig = {
        services: {
            setup: `./${setupScript.split('/').pop()}`,
            cleanup: `./${setupScript.split('/').pop()}` // Will cleanup the setup
        },
        configDir: testDir,
        execution: { timeout: 30000, parallel: false },
        output: { verbose: false, format: "simple", colors: true },
        patterns: { include: [], exclude: [] }
    };

    try {
        await serviceManager.runSetup(config);

        // Give it a moment to create the marker
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check if setup ran
        const file = Bun.file(setupMarker);
        const exists = await file.exists();

        results.push({
            name: "Setup service starts in background",
            passed: exists,
            message: `Setup marker exists: ${exists}`
        });

        // Check if service is running
        const isRunning = serviceManager.isSetupServiceRunning();
        results.push({
            name: "Setup service is detected as running",
            passed: isRunning,
            message: `Service running: ${isRunning}`
        });

        // Run cleanup
        await serviceManager.runCleanup(config);

        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if service stopped
        const isStillRunning = serviceManager.isSetupServiceRunning();
        results.push({
            name: "Cleanup stops setup service",
            passed: !isStillRunning,
            message: `Service still running: ${isStillRunning}`
        });

        // Cleanup
        if (exists) {
            await unlink(setupMarker);
        }
    } catch (error) {
        results.push({
            name: "Setup/cleanup service lifecycle",
            passed: false,
            message: `Error: ${error}`
        });
    }

    await unlink(setupScript);
    return results;
}

async function testFullLifecycle(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const serviceManager = new ServiceManager(testDir);

    // Create all service scripts
    const skipScript = await createScript("full-skip", isWindows ? "@exit 0" : "exit 0");
    const prepMarker = join(testDir, "full-prep.txt");
    const prepScript = await createScript("full-prep", isWindows ? `@echo prep > ${prepMarker}` : `echo 'prep' > ${prepMarker}`);
    const setupMarker = join(testDir, "full-setup.txt");
    const setupScript = await createScript(
        "full-setup",
        isWindows
            ? `@echo setup > ${setupMarker}\n@timeout /t 5 /nobreak > nul`
            : `echo 'setup' > ${setupMarker}\nsleep 5`
    );
    const cleanupMarker = join(testDir, "full-cleanup.txt");
    const cleanupScript = await createScript("full-cleanup", isWindows ? `@echo cleanup > ${cleanupMarker}` : `echo 'cleanup' > ${cleanupMarker}`);

    const config: TestConfig = {
        services: {
            skip: `./${skipScript.split('/').pop()}`,
            prep: `./${prepScript.split('/').pop()}`,
            setup: `./${setupScript.split('/').pop()}`,
            cleanup: `./${cleanupScript.split('/').pop()}`
        },
        configDir: testDir,
        execution: { timeout: 30000, parallel: false },
        output: { verbose: false, format: "simple", colors: true },
        patterns: { include: [], exclude: [] }
    };

    try {
        // Run full lifecycle
        const skipResult = await serviceManager.runSkip(config);
        results.push({
            name: "Full lifecycle: skip check passes",
            passed: !skipResult.shouldSkip,
            message: `shouldSkip: ${skipResult.shouldSkip}`
        });

        await serviceManager.runPrep(config);
        await new Promise(resolve => setTimeout(resolve, 500));

        const prepFile = Bun.file(prepMarker);
        const prepExists = await prepFile.exists();
        results.push({
            name: "Full lifecycle: prep runs",
            passed: prepExists,
            message: `Prep marker exists: ${prepExists}`
        });

        await serviceManager.runSetup(config);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const setupFile = Bun.file(setupMarker);
        const setupExists = await setupFile.exists();
        results.push({
            name: "Full lifecycle: setup runs",
            passed: setupExists,
            message: `Setup marker exists: ${setupExists}`
        });

        await serviceManager.runCleanup(config);
        await new Promise(resolve => setTimeout(resolve, 500));

        const cleanupFile = Bun.file(cleanupMarker);
        const cleanupExists = await cleanupFile.exists();
        results.push({
            name: "Full lifecycle: cleanup runs",
            passed: cleanupExists,
            message: `Cleanup marker exists: ${cleanupExists}`
        });

        // Cleanup markers
        if (prepExists) await unlink(prepMarker);
        if (setupExists) await unlink(setupMarker);
        if (cleanupExists) await unlink(cleanupMarker);
    } catch (error) {
        results.push({
            name: "Full lifecycle test",
            passed: false,
            message: `Error: ${error}`
        });
    }

    // Cleanup scripts
    await unlink(skipScript);
    await unlink(prepScript);
    await unlink(setupScript);
    await unlink(cleanupScript);

    return results;
}

async function runTests(): Promise<void> {
    console.log("Running service lifecycle integration tests...\n");

    await setupTestDir();

    try {
        const testSuites = [
            { name: "Skip Service", tests: testSkipService },
            { name: "Prep Service", tests: testPrepService },
            { name: "Setup/Cleanup Service", tests: testSetupCleanupService },
            { name: "Full Lifecycle", tests: testFullLifecycle }
        ];

        let totalPassed = 0;
        let totalFailed = 0;

        for (const suite of testSuites) {
            console.log(`\n=== ${suite.name} ===`);
            const results = await suite.tests();

            for (const result of results) {
                if (result.passed) {
                    console.log(`  ✓ ${result.name}`);
                    totalPassed++;
                } else {
                    console.error(`  ✗ ${result.name}`);
                    if (result.message) {
                        console.error(`    ${result.message}`);
                    }
                    totalFailed++;
                }
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Total: ${totalPassed + totalFailed} tests`);
        console.log(`Passed: ${totalPassed}`);
        console.log(`Failed: ${totalFailed}`);

        if (totalFailed > 0) {
            await cleanupTestDir();
            process.exit(1);
        }
    } finally {
        await cleanupTestDir();
    }
}

await runTests();
