/*
    Permission Manager unit tests
    Tests cross-platform file permissions and executable handling
 */

import {PermissionManager} from '../../src/platform/permissions.ts'
import {PlatformDetector} from '../../src/platform/detector.ts'
import {writeFile, unlink, mkdir, rmdir} from 'node:fs/promises'
import {join} from 'path'

interface TestResult {
    name: string
    passed: boolean
    message?: string
}

// Create a unique test directory using process ID to avoid conflicts
const testDir = join(process.cwd(), `.test/permissions-${process.pid}`)

async function setupTestDir(): Promise<void> {
    await mkdir(testDir, {recursive: true})
}

async function cleanupTestDir(): Promise<void> {
    try {
        // Remove all test files
        const testFiles = ['test.sh', 'test.bat', 'test.exe', 'test.txt']
        for (const file of testFiles) {
            try {
                await unlink(join(testDir, file))
            } catch {
                // Ignore if file doesn't exist
            }
        }
        await rmdir(testDir)
    } catch {
        // Ignore cleanup errors
    }
}

async function testBinaryExtension(): Promise<TestResult[]> {
    const results: TestResult[] = []

    const ext = PermissionManager.getBinaryExtension()
    const isWindows = PlatformDetector.isWindows()

    results.push({
        name: 'Binary extension matches platform',
        passed: isWindows ? ext === '.exe' : ext === '',
        message: `Platform: ${isWindows ? 'Windows' : 'Unix'}, Extension: "${ext}"`,
    })

    // Test adding binary extension
    const filename = 'myapp'
    const withExt = PermissionManager.addBinaryExtension(filename)
    results.push({
        name: 'Binary extension is added correctly',
        passed: isWindows ? withExt === 'myapp.exe' : withExt === 'myapp',
        message: `Expected: ${isWindows ? 'myapp.exe' : 'myapp'}, Got: ${withExt}`,
    })

    // Test idempotent adding (don't add twice)
    const alreadyWithExt = PermissionManager.addBinaryExtension(withExt)
    results.push({
        name: 'Binary extension not added twice',
        passed: alreadyWithExt === withExt,
        message: `Expected: ${withExt}, Got: ${alreadyWithExt}`,
    })

    return results
}

async function testExecutableDetection(): Promise<TestResult[]> {
    const results: TestResult[] = []
    const isWindows = PlatformDetector.isWindows()

    // Create test files
    const scriptPath = join(testDir, isWindows ? 'test.bat' : 'test.sh')
    const scriptContent = isWindows ? '@echo Test' : '#!/bin/bash\necho Test'
    await writeFile(scriptPath, scriptContent, 'utf-8')

    const textPath = join(testDir, 'test.txt')
    await writeFile(textPath, 'Just text', 'utf-8')

    if (isWindows) {
        // On Windows, test executable extension detection
        const exePath = join(testDir, 'test.exe')
        await writeFile(exePath, 'Binary', 'utf-8')

        const isExeExecutable = await PermissionManager.isExecutable(exePath)
        results.push({
            name: 'Windows .exe detected as executable',
            passed: isExeExecutable,
            message: `Expected true for .exe file`,
        })

        const isBatExecutable = await PermissionManager.isExecutable(scriptPath)
        results.push({
            name: 'Windows .bat detected as executable',
            passed: isBatExecutable,
            message: `Expected true for .bat file`,
        })
    } else {
        // On Unix, test permission-based executability
        // File without execute permission
        const isNotExecutable = await PermissionManager.isExecutable(textPath)
        results.push({
            name: 'Unix file without execute permission not executable',
            passed: !isNotExecutable,
            message: `Expected false for file without execute permission`,
        })

        // Make script executable and test
        await PermissionManager.makeExecutable(scriptPath)
        const isExecutable = await PermissionManager.isExecutable(scriptPath)
        results.push({
            name: 'Unix file with execute permission is executable',
            passed: isExecutable,
            message: `Expected true after chmod +x`,
        })
    }

    const isTextExecutable = await PermissionManager.isExecutable(textPath)
    results.push({
        name: 'Text file not detected as executable',
        passed: !isTextExecutable,
        message: `Expected false for .txt file`,
    })

    return results
}

async function testDirectExecution(): Promise<TestResult[]> {
    const results: TestResult[] = []
    const isWindows = PlatformDetector.isWindows()

    if (isWindows) {
        // On Windows, batch files can be executed directly
        const batPath = join(testDir, 'test.bat')
        await writeFile(batPath, '@echo Test', 'utf-8')

        const canExecute = await PermissionManager.canExecuteDirectly(batPath)
        results.push({
            name: 'Windows batch file can execute directly',
            passed: canExecute,
            message: `Expected true for .bat file on Windows`,
        })

        const txtPath = join(testDir, 'test.txt')
        await writeFile(txtPath, 'Text', 'utf-8')

        const cannotExecute = await PermissionManager.canExecuteDirectly(txtPath)
        results.push({
            name: 'Windows text file cannot execute directly',
            passed: !cannotExecute,
            message: `Expected false for .txt file on Windows`,
        })
    } else {
        // On Unix, need shebang and execute permission
        const scriptPath = join(testDir, 'test.sh')
        const scriptContent = '#!/bin/bash\necho Test'
        await writeFile(scriptPath, scriptContent, 'utf-8')

        // With execute permission
        await PermissionManager.makeExecutable(scriptPath)
        const canExecuteNow = await PermissionManager.canExecuteDirectly(scriptPath)
        results.push({
            name: 'Unix script with shebang and execute permission can run directly',
            passed: canExecuteNow,
            message: `Expected true after chmod +x and shebang present`,
        })

        // Without shebang (even with execute permission)
        const noShebangPath = join(testDir, 'noshebang.sh')
        await writeFile(noShebangPath, 'echo Test', 'utf-8')
        await PermissionManager.makeExecutable(noShebangPath)

        const cannotExecuteNoShebang = await PermissionManager.canExecuteDirectly(noShebangPath)
        results.push({
            name: 'Unix script without shebang cannot run directly',
            passed: !cannotExecuteNoShebang,
            message: `Expected false without shebang`,
        })
    }

    return results
}

async function testMakeExecutable(): Promise<TestResult[]> {
    const results: TestResult[] = []
    const isWindows = PlatformDetector.isWindows()

    const scriptPath = join(testDir, isWindows ? 'make-exec.bat' : 'make-exec.sh')
    const scriptContent = isWindows ? '@echo Test' : '#!/bin/bash\necho Test'
    await writeFile(scriptPath, scriptContent, 'utf-8')

    try {
        await PermissionManager.makeExecutable(scriptPath)
        results.push({
            name: 'makeExecutable completes without error',
            passed: true,
        })

        if (!isWindows) {
            // On Unix, verify the file is now executable
            const isExecutable = await PermissionManager.isExecutable(scriptPath)
            results.push({
                name: 'makeExecutable actually makes file executable on Unix',
                passed: isExecutable,
                message: `Expected file to be executable after makeExecutable()`,
            })
        }
    } catch (error) {
        results.push({
            name: 'makeExecutable completes without error',
            passed: false,
            message: `Error: ${error}`,
        })
    }

    return results
}

async function runTests(): Promise<void> {
    console.log('Running permission manager tests...\n')

    await setupTestDir()

    try {
        const testSuites = [
            {name: 'Binary Extension', tests: testBinaryExtension},
            {name: 'Executable Detection', tests: testExecutableDetection},
            {name: 'Direct Execution', tests: testDirectExecution},
            {name: 'Make Executable', tests: testMakeExecutable},
        ]

        let totalPassed = 0
        let totalFailed = 0

        for (const suite of testSuites) {
            console.log(`\n=== ${suite.name} ===`)
            const results = await suite.tests()

            for (const result of results) {
                if (result.passed) {
                    console.log(`  ✓ ${result.name}`)
                    totalPassed++
                } else {
                    console.error(`  ✗ ${result.name}`)
                    if (result.message) {
                        console.error(`    ${result.message}`)
                    }
                    totalFailed++
                }
            }
        }

        console.log(`\n=== Summary ===`)
        console.log(`Total: ${totalPassed + totalFailed} tests`)
        console.log(`Passed: ${totalPassed}`)
        console.log(`Failed: ${totalFailed}`)

        if (totalFailed > 0) {
            await cleanupTestDir()
            process.exit(1)
        }
    } finally {
        await cleanupTestDir()
    }
}

await runTests()
