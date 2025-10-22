/*
    Test that inherited compiler flags and environment paths are resolved correctly

    Parent config is at: test/config/inherit-paths/
    Parent has paths: ../../dist (resolves to test/dist from parent's location)

    This test is in grandchild directory, 2 levels below parent
    The inherited paths should be absolute and point to test/dist
*/

import { resolve, sep } from 'path';

// Expected absolute paths - parent's ../../dist resolves to test/dist
// Test directory structure: /Users/mob/c/testme/test/config/inherit-paths/child/grandchild
// Parent is at: /Users/mob/c/testme/test/config/inherit-paths
// Parent's ../../dist resolves to: /Users/mob/c/testme/test/dist

// Use platform-specific path separator for splitting
const pathSeparator = `${sep}test${sep}config${sep}inherit-paths`;
const parts = process.cwd().split(pathSeparator);
if (parts.length === 0 || !parts[0]) {
    console.error('Failed to determine test root directory from:', process.cwd());
    process.exit(1);
}
const testRootDir = parts[0];
const expectedDistDir = resolve(testRootDir, 'test', 'dist');

// Check compiler flags
const compilerFlags = process.env.TESTME_COMPILER_FLAGS || '';
console.log('Compiler flags:', compilerFlags);

// Check environment variables
const testPath = process.env.TEST_PATH || '';
const path = process.env.PATH || '';

console.log('TEST_PATH:', testPath);
console.log('PATH:', path);

// Verify TEST_PATH is absolute and points to dist
if (!testPath.includes(expectedDistDir)) {
    console.error(`TEST_PATH should contain ${expectedDistDir}, got: ${testPath}`);
    process.exit(1);
}

// Verify PATH contains dist directory
if (!path.includes(expectedDistDir)) {
    console.error(`PATH should contain ${expectedDistDir}, got: ${path}`);
    process.exit(1);
}

console.log('✓ Inherited paths were resolved correctly');
process.exit(0);
