/*
    Test manual test filtering behavior

    Tests that enable='manual' in config requires explicit test naming
*/

import { spawn } from 'bun';
import { join } from 'path';

const testDir = join(import.meta.dir, 'manual_test');
const tmPath = join(import.meta.dir, '..', '..', 'dist', 'tm');

async function runTm(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    // Use --chdir to change to the test directory
    const fullArgs = ['--chdir', testDir, ...args];
    const proc = spawn([tmPath, ...fullArgs], {
        stdout: 'pipe',
        stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const errors = await new Response(proc.stderr).text();
    await proc.exited;

    return {
        exitCode: proc.exitCode ?? 1,
        stdout: output,
        stderr: errors,
    };
}

async function test() {
    console.log('Testing manual test filtering...');

    // Test 1: Running tm without patterns should NOT run manual tests
    console.log('\n1. Running tm without patterns (should skip manual tests)...');
    const result1 = await runTm([]);
    // Should have no tests to run (all skipped)
    if (!result1.stdout.includes('No tests discovered')) {
        throw new Error('Manual tests should not run without explicit naming - expected "No tests discovered"');
    }
    console.log('✓ Manual tests correctly skipped');

    // Test 2: Running tm with wildcard pattern should NOT run manual tests
    console.log('\n2. Running tm with wildcard pattern *.tst.sh (should skip manual tests)...');
    const result2 = await runTm(['*.tst.sh']);
    if (!result2.stdout.includes('No tests discovered') && !result2.stdout.includes('Total:   0')) {
        console.log('STDOUT:', result2.stdout);
        throw new Error('Manual tests should not run with wildcard patterns - expected "No tests discovered" or "Total: 0"');
    }
    console.log('✓ Manual tests correctly skipped with wildcard');

    // Test 3: Running tm with explicit base name should run the test
    console.log('\n3. Running tm with explicit base name "manual" (should run manual test)...');
    const result3 = await runTm(['manual']);
    if (!result3.stdout.includes('PASSED') || result3.exitCode !== 0) {
        console.log('STDOUT:', result3.stdout);
        console.log('STDERR:', result3.stderr);
        console.log('EXIT CODE:', result3.exitCode);
        throw new Error('Manual test should run and pass when explicitly named by base name');
    }
    console.log('✓ Manual test correctly ran with explicit base name');

    // Test 4: Running tm with explicit full name should run the test
    console.log('\n4. Running tm with explicit full name "manual.tst.sh" (should run manual test)...');
    const result4 = await runTm(['manual.tst.sh']);
    if (!result4.stdout.includes('PASSED') || result4.exitCode !== 0) {
        throw new Error('Manual test should run and pass when explicitly named by full name');
    }
    console.log('✓ Manual test correctly ran with explicit full name');

    // Test 5: List command should show manual tests
    console.log('\n5. Running tm --list with explicit pattern (should show manual tests)...');
    const result5 = await runTm(['--list', 'manual']);
    if (!result5.stdout.includes('manual.tst.sh')) {
        console.log('STDOUT:', result5.stdout);
        throw new Error('Manual tests should appear in --list output when explicitly named');
    }
    console.log('✓ Manual tests correctly appear in list');

    console.log('\n✅ All manual filtering tests passed!');
}

try {
    await test();
} catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
    process.exit(1);
}
