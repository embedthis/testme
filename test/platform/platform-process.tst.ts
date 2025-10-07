/*
    Process Manager unit tests
    Tests cross-platform process management
 */

import { ProcessManager } from "../../src/platform/process.ts";
import { PlatformDetector } from "../../src/platform/detector.ts";
import { writeFile, unlink, mkdir, rmdir } from "node:fs/promises";
import { join } from "path";

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
}

// Create a unique test directory using process ID to avoid conflicts
const testDir = join(process.cwd(), `.test/process-${process.pid}`);

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

async function testShellDetection(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const isWindows = PlatformDetector.isWindows();

    const shell = ProcessManager.getSystemShell();
    results.push({
        name: "System shell is detected",
        passed: typeof shell === "string" && shell.length > 0,
        message: `Shell: ${shell}`
    });

    const flag = ProcessManager.getShellFlag();
    results.push({
        name: "Shell flag matches platform",
        passed: isWindows ? flag === "/c" : flag === "-c",
        message: `Expected: ${isWindows ? "/c" : "-c"}, Got: ${flag}`
    });

    return results;
}

async function testProcessSpawning(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const isWindows = PlatformDetector.isWindows();

    // Test basic command execution
    const command = isWindows ? "C:\\Windows\\System32\\cmd.exe" : "echo";
    const args = isWindows ? ["/c", "echo", "test"] : ["test"];

    try {
        const proc = ProcessManager.spawn(command, args);
        const exitCode = await proc.exited;
        const stdout = await new Response(proc.stdout).text();

        results.push({
            name: "Process spawns successfully",
            passed: exitCode === 0,
            message: `Exit code: ${exitCode}`
        });

        results.push({
            name: "Process output is captured",
            passed: stdout.includes("test"),
            message: `Output: ${stdout.trim()}`
        });
    } catch (error) {
        results.push({
            name: "Process spawns successfully",
            passed: false,
            message: `Error: ${error}`
        });
    }

    return results;
}

async function testProcessEnvironment(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const isWindows = PlatformDetector.isWindows();

    // Test environment variable passing
    const envVarName = "TESTME_PROCESS_TEST";
    const envVarValue = "test-value-123";

    const command = isWindows ? "C:\\Windows\\System32\\cmd.exe" : "sh";
    const args = isWindows
        ? ["/c", "echo", `%${envVarName}%`]
        : ["-c", `echo $${envVarName}`];

    try {
        const proc = ProcessManager.spawn(command, args, {
            env: { [envVarName]: envVarValue }
        });

        const exitCode = await proc.exited;
        const stdout = await new Response(proc.stdout).text();

        results.push({
            name: "Environment variables are passed to process",
            passed: stdout.includes(envVarValue),
            message: `Expected output to contain "${envVarValue}", got: ${stdout.trim()}`
        });
    } catch (error) {
        results.push({
            name: "Environment variables are passed to process",
            passed: false,
            message: `Error: ${error}`
        });
    }

    return results;
}

async function testProcessWorkingDirectory(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const isWindows = PlatformDetector.isWindows();

    // Create a test file in the test directory
    const testFileName = "cwd-test.txt";
    const testFilePath = join(testDir, testFileName);
    await writeFile(testFilePath, "test", "utf-8");

    // Test working directory
    const command = isWindows ? "C:\\Windows\\System32\\cmd.exe" : "sh";
    const args = isWindows
        ? ["/c", "dir", "/b", testFileName]
        : ["-c", `ls ${testFileName}`];

    try {
        const proc = ProcessManager.spawn(command, args, {
            cwd: testDir
        });

        const exitCode = await proc.exited;
        const stdout = await new Response(proc.stdout).text();

        results.push({
            name: "Working directory is set correctly",
            passed: exitCode === 0 && stdout.includes(testFileName),
            message: `Exit code: ${exitCode}, Output: ${stdout.trim()}`
        });
    } catch (error) {
        results.push({
            name: "Working directory is set correctly",
            passed: false,
            message: `Error: ${error}`
        });
    } finally {
        try {
            await unlink(testFilePath);
        } catch {
            // Ignore cleanup errors
        }
    }

    return results;
}

async function testProcessCheck(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test checking if a process is running
    const currentPid = process.pid;
    const isRunning = await ProcessManager.isProcessRunning(currentPid);

    results.push({
        name: "Current process is detected as running",
        passed: isRunning,
        message: `PID ${currentPid} running: ${isRunning}`
    });

    // Test checking a non-existent process (use a very high PID unlikely to exist)
    const fakePid = 999999;
    const isNotRunning = await ProcessManager.isProcessRunning(fakePid);

    results.push({
        name: "Non-existent process is detected as not running",
        passed: !isNotRunning,
        message: `PID ${fakePid} running: ${isNotRunning}`
    });

    return results;
}

async function testProcessKilling(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const isWindows = PlatformDetector.isWindows();

    // Spawn a long-running process directly (not through shell)
    // On Windows, use ping to localhost as a delay mechanism (pings 30 times with 1s delay)
    const command = isWindows ? "C:\\Windows\\System32\\PING.EXE" : "sleep";
    const args = isWindows
        ? ["127.0.0.1", "-n", "30"]
        : ["30"];

    const proc = ProcessManager.spawn(command, args);
    const pid = proc.pid;

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if it's running
    const isRunningBefore = await ProcessManager.isProcessRunning(pid);
    results.push({
        name: "Long-running process starts successfully",
        passed: isRunningBefore,
        message: `PID ${pid} running before kill: ${isRunningBefore}`
    });

    // Kill the process
    try {
        await ProcessManager.killProcess(pid, false); // Force kill without graceful attempt

        // Wait a moment for the kill to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if it's no longer running
        const isRunningAfter = await ProcessManager.isProcessRunning(pid);
        results.push({
            name: "Process is killed successfully",
            passed: !isRunningAfter,
            message: `PID ${pid} running after kill: ${isRunningAfter}`
        });
    } catch (error) {
        results.push({
            name: "Process is killed successfully",
            passed: false,
            message: `Error: ${error}`
        });
    }

    return results;
}

async function runTests(): Promise<void> {
    console.log("Running process manager tests...\n");

    await setupTestDir();

    try {
        const testSuites = [
            { name: "Shell Detection", tests: testShellDetection },
            { name: "Process Spawning", tests: testProcessSpawning },
            { name: "Process Environment", tests: testProcessEnvironment },
            { name: "Process Working Directory", tests: testProcessWorkingDirectory },
            { name: "Process Check", tests: testProcessCheck },
            { name: "Process Killing", tests: testProcessKilling }
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
