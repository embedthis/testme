#!/usr/bin/env node

/**
    Post-install script for testme npm package
    Builds the tm binary and installs support files
 */

import {execSync} from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {fileURLToPath} from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function log(message) {
    console.log(`[testme install] ${message}`)
}

function error(message) {
    console.error(`[testme install] ERROR: ${message}`)
}

function checkBun() {
    try {
        execSync('bun --version', {stdio: 'ignore'})
        return true
    } catch {
        return false
    }
}

function checkEjsc() {
    try {
        execSync('ejsc --version', {stdio: 'ignore'})
        return true
    } catch {
        return false
    }
}

function buildBinary() {
    const platform = os.platform()
    const binaryName = platform === 'win32' ? 'dist/tm.exe' : 'dist/tm'

    log('Building tm binary...')
    try {
        execSync(`bun build ./testme.ts --compile --outfile ${binaryName}`, {
            stdio: 'inherit',
        })
        log('Binary built successfully')
        return true
    } catch (err) {
        error('Failed to build binary')
        return false
    }
}

function installBinary() {
    const platform = os.platform()
    const binarySrc = platform === 'win32' ? path.join('dist', 'tm.exe') : 'dist/tm'
    const binDir = path.join(os.homedir(), '.bun', 'bin')
    const binaryDest = path.join(binDir, platform === 'win32' ? 'tm.exe' : 'tm')

    try {
        log(`Installing tm binary to ${binDir}...`)
        // Create directory structure recursively if it doesn't exist
        if (!fs.existsSync(binDir)) {
            log(`Creating directory ${binDir}...`)
            fs.mkdirSync(binDir, {recursive: true})
        }
        if (!fs.existsSync(binarySrc)) {
            throw new Error(`Source file not found: ${binarySrc}`)
        }

        // Install the binary directly (no wrapper needed - process.cwd() is correct at startup)
        fs.copyFileSync(binarySrc, binaryDest)
        if (platform !== 'win32') {
            fs.chmodSync(binaryDest, 0o755)
        }

        log('Binary installed successfully')
    } catch (err) {
        error(`Could not install binary to ${binDir}: ${err.message}`)
        if (err.code) {
            error(`  Error code: ${err.code}`)
        }
        error('You can manually copy the binary from dist/tm to your PATH.')
    }
}

function installSupportFiles() {
    const platform = os.platform()

    // Install testme.h header
    try {
        const headerSrc = path.join(__dirname, '..', 'src', 'modules', 'c', 'testme.h')
        const headerDest = path.join(os.homedir(), '.local', 'include', 'testme.h')

        log('Installing testme.h header to ~/.local/include...')
        const headerDir = path.dirname(headerDest)
        if (!fs.existsSync(headerDir)) {
            log(`Creating directory ${headerDir}...`)
            fs.mkdirSync(headerDir, {recursive: true})
        }
        if (!fs.existsSync(headerSrc)) {
            throw new Error(`Source file not found: ${headerSrc}`)
        }
        fs.copyFileSync(headerSrc, headerDest)
        log('Header installed successfully')
    } catch (err) {
        error(`Could not install testme.h header: ${err.message}`)
        if (err.code) {
            error(`  Error code: ${err.code}`)
        }
        error('You may need to install it manually.')
    }

    // Install man page (Unix only)
    if (platform !== 'win32') {
        try {
            const manSrc = path.join(__dirname, '..', 'doc', 'tm.1')
            const manDest = path.join(os.homedir(), '.local', 'share', 'man', 'man1', 'tm.1')

            log('Installing man page...')
            const manDir = path.dirname(manDest)
            if (!fs.existsSync(manDir)) {
                log(`Creating directory ${manDir}...`)
                fs.mkdirSync(manDir, {recursive: true})
            }
            if (!fs.existsSync(manSrc)) {
                throw new Error(`Source file not found: ${manSrc}`)
            }
            fs.copyFileSync(manSrc, manDest)
            log('Man page installed successfully')
        } catch (err) {
            error(`Could not install man page: ${err.message}`)
            if (err.code) {
                error(`  Error code: ${err.code}`)
            }
            error('You may need to install it manually.')
        }
    }

    // Link JavaScript testme module via bun link
    const jsModuleSrc = path.join(__dirname, '..', 'src', 'modules', 'js')

    // On UNC paths (network drives), copy to local directory first since symlinks don't work
    let jsModuleDir = jsModuleSrc
    const isUncPath = jsModuleSrc.startsWith('\\\\')

    if (isUncPath) {
        const localModuleDir = path.join(os.homedir(), '.local', 'lib', 'testme-js')
        log('Network drive detected - copying JS module to local directory...')
        try {
            // Create directory and copy files
            if (!fs.existsSync(localModuleDir)) {
                fs.mkdirSync(localModuleDir, {recursive: true})
            }
            // Copy all files from src/modules/js to local directory
            const files = fs.readdirSync(jsModuleSrc)
            for (const file of files) {
                const srcFile = path.join(jsModuleSrc, file)
                const destFile = path.join(localModuleDir, file)
                if (fs.statSync(srcFile).isFile()) {
                    fs.copyFileSync(srcFile, destFile)
                }
            }
            jsModuleDir = localModuleDir
            log(`Copied JS module to ${localModuleDir}`)
        } catch (err) {
            error(`Could not copy JS module to local directory: ${err.message}`)
        }
    }

    try {
        log('Linking JavaScript testme module via bun link...')
        execSync('bun link', {
            cwd: jsModuleDir,
            stdio: 'pipe',
        })
        log('JavaScript testme module linked successfully')
    } catch (err) {
        error('Could not link JavaScript testme module. You may need to run "bun link" manually.')
        error(`  cd ${jsModuleDir} && bun link`)
        if (err.stderr) {
            error(`  Error: ${err.stderr.toString().trim()}`)
        } else if (err.message) {
            error(`  Error: ${err.message}`)
        }
    }

    // Install legacy Ejscript testme.mod if ejsc is available
    if (checkEjsc()) {
        try {
            const modSrc = path.join(__dirname, '..', 'src', 'modules', 'es', 'testme.mod')
            const homeDir = os.homedir()
            const userModDest = path.join(homeDir, '.ejs', 'testme.mod')
            const localModDest = path.join(homeDir, '.local', 'lib', 'testme', 'testme.mod')

            log('Installing Ejscript testme.mod...')

            if (!fs.existsSync(modSrc)) {
                throw new Error(`Source file not found: ${modSrc}`)
            }

            // Install to user .ejs directory
            const userModDir = path.dirname(userModDest)
            if (!fs.existsSync(userModDir)) {
                log(`Creating directory ${userModDir}...`)
                fs.mkdirSync(userModDir, {recursive: true})
            }
            fs.copyFileSync(modSrc, userModDest)

            // Install to .local directory
            const localModDir = path.dirname(localModDest)
            if (!fs.existsSync(localModDir)) {
                log(`Creating directory ${localModDir}...`)
                fs.mkdirSync(localModDir, {recursive: true})
            }
            fs.copyFileSync(modSrc, localModDest)

            log('Ejscript testme.mod installed successfully')
        } catch (err) {
            error(`Could not install Ejscript testme.mod: ${err.message}`)
            if (err.code) {
                error(`  Error code: ${err.code}`)
            }
            error('You may need to install it manually.')
        }
    }
}

function main() {
    log('Starting testme installation...')

    // Check if bun is installed
    if (!checkBun()) {
        error('Bun is required but not found. Please install Bun first:')
        error('  curl -fsSL https://bun.sh/install | bash')
        process.exit(1)
    }

    // Build the binary
    if (!buildBinary()) {
        error('Installation failed: could not build binary')
        process.exit(1)
    }

    // Install the binary
    installBinary()

    // Install support files
    installSupportFiles()

    log('Installation complete!')
}

main()
