#!/usr/bin/env bun
//
// Skip Windows-specific tests if not running on Windows
// Exit 0 to run tests, non-zero to skip
//

if (process.platform === 'win32') {
    // Running on Windows - run the tests
    process.exit(0);
}

// Not on Windows - skip these tests
console.log("Skipping Windows-specific tests (not running on Windows)");
process.exit(1);
