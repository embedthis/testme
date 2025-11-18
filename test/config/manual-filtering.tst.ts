/*
    Test manual test filtering behavior

    Tests that enable='manual' in config requires explicit test naming
*/

import {spawn} from 'bun'
import {join} from 'path'

const testDir = join(import.meta.dir, 'manual_test')
const tmPath = join(import.meta.dir, '..', '..', 'dist', 'tm')

async function runTm(args: string[]): Promise<{exitCode: number; stdout: string; stderr: string}> {
    // Use --chdir to change to the test directory
    const fullArgs = ['--chdir', testDir, ...args]
    const proc = spawn([tmPath, ...fullArgs], {
        stdout: 'pipe',
        stderr: 'pipe',
    })

    const output = await new Response(proc.stdout).text()
    const errors = await new Response(proc.stderr).text()
    await proc.exited

    return {
        exitCode: proc.exitCode ?? 1,
        stdout: output,
        stderr: errors,
    }
}

function extractTotalTests(output: string): number | null {
    // Match "Total:" followed by any amount of whitespace and then digits
    const match = output.match(/Total:\s+(\d+)/)
    return match ? parseInt(match[1], 10) : null
}

async function test() {
    console.log('Testing manual test filtering...')

    // Test 1: Running tm without patterns should NOT run manual tests
    console.log('\n1. Running tm without patterns (should skip manual tests)...')
    const result1 = await runTm([])
    // Should have no tests to run (all skipped)
    const total1 = extractTotalTests(result1.stdout)
    if (total1 !== 0) {
        console.log('STDOUT:', result1.stdout)
        throw new Error(`Manual tests should not run without explicit naming - expected Total: 0, got: ${total1}`)
    }
    console.log('✓ Manual tests correctly skipped')

    // Test 2: Running tm with wildcard pattern should NOT run manual tests
    console.log('\n2. Running tm with wildcard pattern *.tst.js (should skip manual tests)...')
    const result2 = await runTm(['*.tst.js'])
    const total2 = extractTotalTests(result2.stdout)
    if (!result2.stdout.includes('No tests discovered') && total2 !== 0) {
        console.log('STDOUT:', result2.stdout)
        throw new Error(
            `Manual tests should not run with wildcard patterns - expected Total: 0 or "No tests discovered", got Total: ${total2}`
        )
    }
    console.log('✓ Manual tests correctly skipped with wildcard')

    // Test 3: Running tm with explicit base name should run the test
    console.log('\n3. Running tm with explicit base name "manual" (should run manual test)...')
    const result3 = await runTm(['manual'])
    const total3 = extractTotalTests(result3.stdout)
    if (!result3.stdout.includes('PASSED') || result3.exitCode !== 0 || total3 !== 1) {
        console.log('STDOUT:', result3.stdout)
        console.log('STDERR:', result3.stderr)
        console.log('EXIT CODE:', result3.exitCode)
        throw new Error(
            `Manual test should run and pass when explicitly named by base name - got Total: ${total3}, exit: ${result3.exitCode}`
        )
    }
    console.log('✓ Manual test correctly ran with explicit base name')

    // Test 4: Running tm with explicit full name should run the test
    console.log('\n4. Running tm with explicit full name "manual.tst.js" (should run manual test)...')
    const result4 = await runTm(['manual.tst.js'])
    const total4 = extractTotalTests(result4.stdout)
    if (!result4.stdout.includes('PASSED') || result4.exitCode !== 0 || total4 !== 1) {
        console.log('STDOUT:', result4.stdout)
        console.log('STDERR:', result4.stderr)
        throw new Error(
            `Manual test should run and pass when explicitly named by full name - got Total: ${total4}, exit: ${result4.exitCode}`
        )
    }
    console.log('✓ Manual test correctly ran with explicit full name')

    // Test 5: List command should show manual tests
    console.log('\n5. Running tm --list with explicit pattern (should show manual tests)...')
    const result5 = await runTm(['--list', 'manual'])
    if (!result5.stdout.includes('manual.tst.js')) {
        console.log('STDOUT:', result5.stdout)
        throw new Error('Manual tests should appear in --list output when explicitly named')
    }
    console.log('✓ Manual tests correctly appear in list')

    // Test 6: Running tm with same-name pattern should only run top-level test (not manual subdir)
    console.log('\n6. Running tm same-name (should only run top-level test, not manual subdir)...')
    const result6 = await runTm(['same-name'])
    const total6 = extractTotalTests(result6.stdout)
    if (!result6.stdout.includes('PASSED') || result6.exitCode !== 0 || total6 !== 1) {
        console.log('STDOUT:', result6.stdout)
        console.log('STDERR:', result6.stderr)
        throw new Error(
            `Should only run top-level test, not manual subdir test - got Total: ${total6}, exit: ${result6.exitCode}`
        )
    }
    // Verify that it ran only in the root directory (not in manual-subdir)
    if (!result6.stdout.includes('Running 1 test(s) in: .')) {
        console.log('STDOUT:', result6.stdout)
        throw new Error('Should have run the test in root directory')
    }
    console.log('✓ Correctly ran only top-level test, skipped manual subdir test')

    // Test 7: Running tm manual-subdir/same-name should run the manual test
    console.log('\n7. Running tm manual-subdir/same-name (should run manual test)...')
    const result7 = await runTm(['manual-subdir/same-name'])
    const total7 = extractTotalTests(result7.stdout)
    if (!result7.stdout.includes('PASSED') || result7.exitCode !== 0 || total7 !== 1) {
        console.log('STDOUT:', result7.stdout)
        console.log('STDERR:', result7.stderr)
        throw new Error(
            `Manual test should run when explicitly named with directory path - got Total: ${total7}, exit: ${result7.exitCode}`
        )
    }
    // Verify that it ran in the manual-subdir
    if (!result7.stdout.includes('Running 1 test(s) in: manual-subdir')) {
        console.log('STDOUT:', result7.stdout)
        throw new Error('Should have run the test in manual-subdir')
    }
    console.log('✓ Manual test correctly ran when explicitly named with directory path')

    console.log('\n✅ All manual filtering tests passed!')
}

try {
    await test()
} catch (error) {
    console.error('❌ Test failed:', (error as Error).message)
    process.exit(1)
}
