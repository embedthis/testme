/*
    Platform Detector unit tests
    Tests platform detection and capability discovery
 */

import { PlatformDetector, Platform, Architecture } from "../src/platform/detector.ts";

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
}

async function testPlatformDetection(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test platform detection returns a valid platform
    const platform = PlatformDetector.detectPlatform();
    results.push({
        name: "Platform detection returns valid enum",
        passed: Object.values(Platform).includes(platform),
        message: `Expected valid Platform enum, got "${platform}"`
    });

    // Test architecture detection returns a valid architecture
    const arch = PlatformDetector.detectArchitecture();
    results.push({
        name: "Architecture detection returns valid enum",
        passed: Object.values(Architecture).includes(arch),
        message: `Expected valid Architecture enum, got "${arch}"`
    });

    // Test platform-specific boolean checks are consistent
    const isWindows = PlatformDetector.isWindows();
    const isMacOS = PlatformDetector.isMacOS();
    const isLinux = PlatformDetector.isLinux();
    const isUnix = PlatformDetector.isUnix();

    results.push({
        name: "Exactly one platform is detected",
        passed: (isWindows ? 1 : 0) + (isMacOS ? 1 : 0) + (isLinux ? 1 : 0) === 1,
        message: `Windows: ${isWindows}, macOS: ${isMacOS}, Linux: ${isLinux}`
    });

    results.push({
        name: "isUnix is consistent with macOS/Linux",
        passed: isUnix === (isMacOS || isLinux),
        message: `isUnix: ${isUnix}, isMacOS || isLinux: ${isMacOS || isLinux}`
    });

    return results;
}

async function testCapabilityDetection(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test compiler detection
    const compilers = await PlatformDetector.detectCompilers();
    results.push({
        name: "Compiler detection returns array",
        passed: Array.isArray(compilers),
        message: `Expected array, got ${typeof compilers}`
    });

    if (compilers.length > 0) {
        const firstCompiler = compilers[0];
        results.push({
            name: "Compiler has required properties",
            passed: !!firstCompiler.name && !!firstCompiler.path && !!firstCompiler.type,
            message: `Compiler: ${JSON.stringify(firstCompiler)}`
        });
    }

    // Test shell detection
    const shells = await PlatformDetector.detectShells();
    results.push({
        name: "Shell detection returns array",
        passed: Array.isArray(shells),
        message: `Expected array, got ${typeof shells}`
    });

    if (shells.length > 0) {
        const firstShell = shells[0];
        results.push({
            name: "Shell has required properties",
            passed: !!firstShell.name && !!firstShell.path && !!firstShell.type,
            message: `Shell: ${JSON.stringify(firstShell)}`
        });
    }

    // Test debugger detection
    const debuggers = await PlatformDetector.detectDebuggers();
    results.push({
        name: "Debugger detection returns array",
        passed: Array.isArray(debuggers),
        message: `Expected array, got ${typeof debuggers}`
    });

    // Test full capability detection
    const capabilities = await PlatformDetector.detectCapabilities();
    results.push({
        name: "Full capabilities has all properties",
        passed: !!capabilities.platform && !!capabilities.arch &&
                Array.isArray(capabilities.compilers) &&
                Array.isArray(capabilities.shells) &&
                Array.isArray(capabilities.debuggers),
        message: `Capabilities: platform=${capabilities.platform}, arch=${capabilities.arch}, ` +
                 `compilers=${capabilities.compilers.length}, shells=${capabilities.shells.length}, ` +
                 `debuggers=${capabilities.debuggers.length}`
    });

    return results;
}

async function runTests(): Promise<void> {
    console.log("Running platform detector tests...\n");

    const testSuites = [
        { name: "Platform Detection", tests: testPlatformDetection },
        { name: "Capability Detection", tests: testCapabilityDetection }
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
        process.exit(1);
    }
}

await runTests();
