#!/usr/bin/env bun
//
// Skip script for Ejscript tests
// Exit 0 to run tests, non-zero to skip
//

import {spawnSync} from 'bun'

// Check if ejsc command exists
// Use 'where' on Windows, 'which' on Unix
const isWindows = process.platform === 'win32'
const command = isWindows ? 'where' : 'which'

const result = spawnSync([command, 'ejsc'], {
    stdout: 'ignore',
    stderr: 'ignore',
})

if (result.exitCode !== 0) {
    console.log("Ejscript compiler 'ejsc' not found - skipping Ejscript tests")
    process.exit(1)
}

process.exit(0)
