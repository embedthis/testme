#!/usr/bin/env node

/**
 * Cross-platform postbuild script for linking testme module
 * Falls back to copying files when symlinks fail (e.g., network drives)
 */

import { execSync, spawnSync } from 'child_process'
import { existsSync, mkdirSync, rmSync, cpSync, lstatSync } from 'fs'
import { join, resolve } from 'path'

const isWindows = process.platform === 'win32'
const rootDir = resolve(import.meta.dirname, '..')
const modulesJsDir = join(rootDir, 'src', 'modules', 'js')
const testDir = join(rootDir, 'test')
const testNodeModules = join(testDir, 'node_modules')
const testmeLink = join(testNodeModules, 'testme')

// Step 1: Register the testme package globally with bun link
try {
    execSync('bun link', { cwd: modulesJsDir, stdio: 'inherit' })
} catch (error) {
    console.error('Failed to register testme package:', error.message)
    process.exit(1)
}

// Step 2: Link testme in the test directory
const result = spawnSync('bun', ['link', 'testme'], {
    cwd: testDir,
    stdio: 'pipe',
    shell: isWindows
})

if (result.status === 0) {
    // bun link succeeded
    process.exit(0)
}

// bun link failed - fall back to copying files (for network drives, etc.)
console.log('bun link failed, copying files instead...')

// Ensure node_modules exists
if (!existsSync(testNodeModules)) {
    mkdirSync(testNodeModules, { recursive: true })
}

// Remove existing link/directory if present
if (existsSync(testmeLink)) {
    try {
        rmSync(testmeLink, { recursive: true, force: true })
    } catch (e) {
        // Ignore cleanup errors
    }
}

// Copy the module files
try {
    cpSync(modulesJsDir, testmeLink, { recursive: true })
} catch (error) {
    console.error('Failed to copy testme module:', error.message)
    process.exit(1)
}
