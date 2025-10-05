import { GlobExpansion } from '../../src/utils/glob-expansion.ts';
import { mkdtemp, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Test the glob expansion functionality
async function test() {
    // Create a temporary directory structure for testing
    const testDir = await mkdtemp(join(tmpdir(), 'testme-glob-test-'));

    // Create some test directories and files
    await mkdir(join(testDir, 'build'), { recursive: true });
    await mkdir(join(testDir, 'build', 'x86'), { recursive: true });
    await mkdir(join(testDir, 'build', 'arm'), { recursive: true });
    await mkdir(join(testDir, 'build', 'x86', 'inc'), { recursive: true });
    await mkdir(join(testDir, 'build', 'arm', 'inc'), { recursive: true });

    // Create some header files
    await writeFile(join(testDir, 'build', 'x86', 'inc', 'test.h'), '// test header');
    await writeFile(join(testDir, 'build', 'arm', 'inc', 'test.h'), '// test header');

    console.log('Test directory structure created at:', testDir);

    // Test 1: Expand flags with glob pattern
    console.log('\nTest 1: Expanding flags with ${build/*/inc}');
    const flagsInput = ['-std=c99', '-I${build/*/inc}', '-Wall'];
    const expandedFlags = await GlobExpansion.expandArray(flagsInput, testDir);
    console.log('Input flags:', flagsInput);
    console.log('Expanded flags:', expandedFlags);

    // Test 2: Expand libraries with glob pattern
    console.log('\nTest 2: Expanding libraries');
    const libsInput = ['m', '${build/*/inc}', 'pthread'];
    const expandedLibs = await GlobExpansion.expandArray(libsInput, testDir);
    console.log('Input libraries:', libsInput);
    console.log('Expanded libraries:', expandedLibs);

    // Test 3: String without glob patterns (should remain unchanged)
    console.log('\nTest 3: String without glob patterns');
    const normalFlags = ['-O2', '-g'];
    const unchangedFlags = await GlobExpansion.expandArray(normalFlags, testDir);
    console.log('Input flags:', normalFlags);
    console.log('Output flags:', unchangedFlags);

    // Test 4: Pattern with no matches (should gracefully degrade)
    console.log('\nTest 4: Pattern with no matches');
    const noMatchFlags = ['-I${nonexistent/*/path}'];
    const noMatchResult = await GlobExpansion.expandArray(noMatchFlags, testDir);
    console.log('Input flags:', noMatchFlags);
    console.log('Fallback flags:', noMatchResult);

    console.log('\nAll tests completed successfully!');
    return 0;
}

// Run the test
test().then(code => process.exit(code)).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});