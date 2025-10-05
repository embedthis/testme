#!/usr/bin/env node

/**
    Post-install script for testme npm package
    Builds the tm binary and installs support files
 */

import {execSync} from 'child_process'
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
    const binarySrc = platform === 'win32' ? 'dist/tm.exe' : 'dist/tm'
    const binaryDest = platform === 'win32' ? 'C:\\Windows\\System32\\tm.exe' : '/usr/local/bin/tm'

    try {
        if (platform === 'win32') {
            log(`Installing tm binary to ${binaryDest}...`)
            execSync(`copy "${binarySrc}" "${binaryDest}"`, {stdio: 'inherit', shell: 'cmd.exe'})
        } else {
            log(`Installing tm binary to ${binaryDest} (may require sudo)...`)
            execSync(`sudo cp ${binarySrc} ${binaryDest}`, {stdio: 'inherit'})
            execSync(`sudo chmod +x ${binaryDest}`, {stdio: 'inherit'})
        }
    } catch (err) {
        error(`Could not install binary to ${binaryDest}. You may need administrator/sudo privileges.`)
        error('You can manually copy the binary from dist/tm to your PATH.')
    }
}

function installSupportFiles() {
    const platform = os.platform()

    // Install testme.h header
    try {
        const headerSrc = path.join(__dirname, '..', 'test', 'testme.h')
        const headerDest =
            platform === 'win32'
                ? path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'testme', 'include', 'testme.h')
                : '/usr/local/include/testme.h'

        if (platform === 'win32') {
            log('Installing testme.h header...')
            const headerDir = path.dirname(headerDest)
            execSync(`if not exist "${headerDir}" mkdir "${headerDir}"`, {stdio: 'inherit', shell: 'cmd.exe'})
            execSync(`copy "${headerSrc}" "${headerDest}"`, {stdio: 'inherit', shell: 'cmd.exe'})
        } else {
            log('Installing testme.h header...')
            execSync(`sudo mkdir -p $(dirname ${headerDest})`, {stdio: 'inherit'})
            execSync(`sudo cp ${headerSrc} ${headerDest}`, {stdio: 'inherit'})
        }
    } catch (err) {
        error('Could not install testme.h header. You may need to install it manually.')
    }

    // Install man page (Unix only)
    if (platform !== 'win32') {
        try {
            const manSrc = path.join(__dirname, '..', 'doc', 'tm.1')
            const manDest = '/usr/local/share/man/man1/tm.1'

            log('Installing man page...')
            execSync(`sudo mkdir -p $(dirname ${manDest})`, {stdio: 'inherit'})
            execSync(`sudo cp ${manSrc} ${manDest}`, {stdio: 'inherit'})
        } catch (err) {
            error('Could not install man page. You may need to install it manually.')
        }
    }

    // Install legacy Ejscript testme.mod if ejsc is available
    if (checkEjsc()) {
        try {
            const modSrc = path.join(__dirname, '..', 'src', 'modules', 'es', 'testme.mod')
            const homeDir = os.homedir()
            const userModDest = path.join(homeDir, '.ejs', 'testme.mod')
            const systemModDest = '/usr/local/lib/testme/testme.mod'

            log('Installing Ejscript testme.mod...')

            // Install to user directory
            const userModDir = path.dirname(userModDest)
            execSync(`mkdir -p ${userModDir}`, {stdio: 'inherit'})
            execSync(`cp ${modSrc} ${userModDest}`, {stdio: 'inherit'})

            // Install to system directory
            execSync(`sudo mkdir -p $(dirname ${systemModDest})`, {stdio: 'inherit'})
            execSync(`sudo cp ${modSrc} ${systemModDest}`, {stdio: 'inherit'})

            log('Ejscript testme.mod installed successfully')
        } catch (err) {
            error('Could not install Ejscript testme.mod. You may need to install it manually.')
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
    log('Run "tm --help" to get started')
}

main()
