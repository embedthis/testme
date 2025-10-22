/**
 * testme - Testing utilities for JavaScript and TypeScript tests
 * Provides assertion functions, environment variable access, and test utilities
 */

let exitCode = 0

// Get test depth from TESTME_DEPTH environment variable
function tdepth() {
    return parseInt(tget('TESTME_DEPTH', '0'), 10)
}

// Check if verbose mode is enabled
function tverbose() {
    return Boolean(tget('TESTME_VERBOSE'))
}

// Get stack trace information for error reporting
function getCallSite() {
    const error = new Error()
    const stack = error.stack?.split('\n') || []
    // Skip this function and the calling test function to get the actual test line
    const caller = stack[3] || stack[2] || stack[1] || 'unknown'
    const match = caller.match(/at (?:.*\s+\()?([^:]+):(\d+):(\d+)\)?/)
    if (match) {
        return {
            filename: match[1],
            line: match[2],
            column: match[3],
        }
    }
    return {filename: 'unknown', line: '?', column: '?'}
}

// Print test result with optional verbose information
function printResult(type, message, callSite) {
    if (type === 'fail') {
        exitCode = 1
    }

    if (isVerbose() && callSite) {
        console.log(`${type} in ${callSite.filename}@${callSite.line} ${message}`)
    } else {
        console.log(`${type} ${message}`)
    }
}

// Assert that condition is true
function ttrue(condition, message = '') {
    const callSite = getCallSite()
    if (!condition) {
        printResult('fail', `Assertion failed${message ? ': ' + message : ''}`, callSite)
    } else if (isVerbose()) {
        printResult('pass', `Assertion passed${message ? ': ' + message : ''}`, callSite)
    }
}

// Assert that condition is false
function tfalse(condition, message = '') {
    ttrue(!condition, message)
}

// Assert that two values are equal
function teq(actual, expected, message = '') {
    const callSite = getCallSite()
    if (actual !== expected) {
        const msg = `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(
            actual
        )}${message ? ': ' + message : ''}`
        printResult('fail', msg, callSite)
    } else if (isVerbose()) {
        const msg = `Values are equal${message ? ': ' + message : ''}`
        printResult('pass', msg, callSite)
    }
}

// Match string against pattern (basic regex support)
function tmatch(string, pattern, message = '') {
    const callSite = getCallSite()
    const regex = new RegExp(pattern)
    if (!regex.test(string)) {
        const msg = `String "${string}" does not match pattern "${pattern}"${message ? ': ' + message : ''}`
        printResult('fail', msg, callSite)
    } else if (isVerbose()) {
        const msg = `String matches pattern${message ? ': ' + message : ''}`
        printResult('pass', msg, callSite)
    }
}

// Process exit handler to return appropriate exit code
process.on('exit', () => {
    process.exitCode = exitCode
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error.message)
    if (isVerbose()) {
        console.error(error.stack)
    }
    process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason)
    process.exit(1)
})

// Export all functions for use in tests
export {tdepth, teq, tfalse, tmatch, ttrue, tverbose}

// Default export with all functions
export default {
    tdepth,
    teq,
    tfalse,
    tmatch,
    ttrue,
    tverbose,
}
