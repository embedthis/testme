/*
    env-export.tst.ts - Test that TESTME_* environment variables are exported
    Verifies that special variables are available as environment variables to tests
 */

// Test that all expected TESTME_* variables are defined
const requiredVars = [
    'TESTME_PLATFORM',
    'TESTME_PROFILE',
    'TESTME_OS',
    'TESTME_ARCH',
    'TESTME_CC',
    'TESTME_TESTDIR',
    'TESTME_CONFIGDIR',
]

console.log('Testing TESTME_* environment variable exports...\n')

let failed = false

for (const varName of requiredVars) {
    const value = process.env[varName]
    if (value === undefined) {
        console.error(`✗ ${varName} is not defined`)
        failed = true
    } else {
        console.log(`✓ ${varName} = ${value}`)
    }
}

// Test TESTME_VERBOSE (may or may not be set depending on --verbose flag)
if (process.env.TESTME_VERBOSE !== undefined) {
    console.log(`✓ TESTME_VERBOSE = ${process.env.TESTME_VERBOSE}`)
}

// Test TESTME_DEPTH (may or may not be set depending on --depth flag)
if (process.env.TESTME_DEPTH !== undefined) {
    console.log(`✓ TESTME_DEPTH = ${process.env.TESTME_DEPTH}`)
}

// Validate some expected patterns
if (process.env.TESTME_PLATFORM && !process.env.TESTME_PLATFORM.includes('-')) {
    console.error(`✗ TESTME_PLATFORM should contain hyphen: ${process.env.TESTME_PLATFORM}`)
    failed = true
}

if (process.env.TESTME_OS && !['macosx', 'linux', 'windows'].includes(process.env.TESTME_OS)) {
    console.error(`✗ TESTME_OS should be macosx/linux/windows: ${process.env.TESTME_OS}`)
    failed = true
}

if (process.env.TESTME_ARCH && !['arm64', 'x64', 'ia32'].includes(process.env.TESTME_ARCH)) {
    console.error(`✗ TESTME_ARCH should be arm64/x64/ia32: ${process.env.TESTME_ARCH}`)
    failed = true
}

if (process.env.TESTME_CC && !['gcc', 'clang', 'msvc', 'unknown'].includes(process.env.TESTME_CC)) {
    console.error(`✗ TESTME_CC should be gcc/clang/msvc/unknown: ${process.env.TESTME_CC}`)
    failed = true
}

console.log('')
if (failed) {
    console.error('✗ Some TESTME_* environment variables are missing or invalid')
    process.exit(1)
} else {
    console.log('✓ All TESTME_* environment variables are correctly exported')
    process.exit(0)
}
