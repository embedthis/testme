/**
    js/index.js - Testing utilities API for JavaScript and TypeScript tests
    Provides assertion functions, environment variable access, and test utilities

    Supports two testing styles:
    1. Traditional TestMe API: ttrue(), teq(), etc.
    2. Jest/Vitest-compatible API: expect().toBe(), etc.
 */

//  Import Jest/Vitest-compatible expect() API
import {expect} from './expect.js'

let exitCode = 0

function tdepth() {
    return parseInt(tget('TESTME_DEPTH', '0'), 10)
}

function tget(key, def = null) {
    let value = process.env[key]
    if (value == null || value == '') {
        value = def
    }
    return value
}

function thas(key) {
    return tget(key) - 0
}

function tverbose() {
    return Boolean(tget('TESTME_VERBOSE'))
}

export function getStack() {
    const error = new Error()
    const stack = error.stack?.split('\n') || []
    // Skip this function and the calling test function to get the actual test line
    const caller = stack[3] || stack[2] || stack[1] || 'unknown'
    const match = caller.match(/at (?:.*\s+\()?([^:w]+):(\d+)\)?/)
    if (match) {
        return {
            filename: match[1],
            line: match[2],
        }
    }
    return {filename: 'unknown file', line: 'unknown line'}
}

function treport(success, stack, message, received, expected) {
    let loc = `${stack.filename}:${stack.line}`
    if (!message) {
        message = `Test ${success ? 'passed' : 'failed'}`
    }
    if (success) {
        console.log(`✓ ${message} at ${loc}`)
    } else {
        if (expected === undefined && received === undefined) {
            console.error(`✗ ${message} at ${loc}`)
        } else {
            console.error(`✗ ${message} at ${loc}\nExpected: ${expected}\nReceived: ${received}`)
        }
        process.exit(1)
    }
}

function tassert(condition, message = '') {
    treport(condition, getStack(), message)
}
function ttrue(condition, message = '') {
    treport(condition, getStack(), message)
}

function tfalse(condition, message = '') {
    treport(!condition, getStack(), message)
}

function tfail(message = '') {
    treport(false, getStack(), message)
}

//  Type-specific equality functions for better error messages

function teqi(received, expected, message = '') {
    treport(received === expected, getStack(), message, received, expected)
}

function teql(received, expected, message = '') {
    treport(received === expected, getStack(), message, received, expected)
}

function teqll(received, expected, message = '') {
    treport(BigInt(received) === BigInt(expected), getStack(), message, received, expected)
}

function teqz(received, expected, message = '') {
    treport(received === expected, getStack(), message, received, expected)
}

function tequ(received, expected, message = '') {
    treport(received === expected, getStack(), message, received, expected)
}

function teqp(received, expected, message = '') {
    treport(received === expected, getStack(), message, received, expected)
}

//  Type-specific inequality functions

function tneqi(received, expected, message = '') {
    treport(received !== expected, getStack(), message, received, expected)
}

function tneql(received, expected, message = '') {
    treport(received !== expected, getStack(), message, received, expected)
}

function tneqll(received, expected, message = '') {
    treport(BigInt(received) !== BigInt(expected), getStack(), message, received, expected)
}

function tneqz(received, expected, message = '') {
    treport(received !== expected, getStack(), message, received, expected)
}

function tnequ(received, expected, message = '') {
    treport(received !== expected, getStack(), message, received, expected)
}

function tneqp(received, expected, message = '') {
    treport(received !== expected, getStack(), message, received, expected)
}

//  Comparison functions (greater than)

function tgti(received, expected, message = '') {
    treport(received > expected, getStack(), message, received, expected)
}

function tgtl(received, expected, message = '') {
    treport(received > expected, getStack(), message, received, expected)
}

function tgtz(received, expected, message = '') {
    treport(received > expected, getStack(), message, received, expected)
}

//  Comparison functions (greater than or equal)

function tgtei(received, expected, message = '') {
    treport(received >= expected, getStack(), message, received, expected)
}

function tgtel(received, expected, message = '') {
    treport(received >= expected, getStack(), message, received, expected)
}

function tgtez(received, expected, message = '') {
    treport(received >= expected, getStack(), message, received, expected)
}

//  Comparison functions (less than)

function tlti(received, expected, message = '') {
    treport(received < expected, getStack(), message, received, expected)
}

function tltl(received, expected, message = '') {
    treport(received < expected, getStack(), message, received, expected)
}

function tltz(received, expected, message = '') {
    treport(received < expected, getStack(), message, received, expected)
}

//  Comparison functions (less than or equal)

function tltei(received, expected, message = '') {
    treport(received <= expected, getStack(), message, received, expected)
}

function tltel(received, expected, message = '') {
    treport(received <= expected, getStack(), message, received, expected)
}

function tltez(received, expected, message = '') {
    treport(received <= expected, getStack(), message, received, expected)
}

//  NULL checking functions

function tnull(value, message = '') {
    treport(value === null, getStack(), message, value, null)
}

function tnotnull(value, message = '') {
    treport(value !== null, getStack(), message, value, null)
}

//  Legacy deprecated functions (kept for backward compatibility)

function teq(received, expected, message = '') {
    return teqi(received, expected, message)
}

function tneq(received, expected, message = '') {
    return tneqi(received, expected, message)
}

function tmatch(string, pattern, message = '') {
    treport(new RegExp(pattern).test(string), getStack(), message, string, pattern)
}

function tcontains(string, pattern, message = '') {
    treport(string.includes(pattern), getStack(), message, string, pattern)
}

function tinfo(...args) {
    console.log(...args)
}

function tdebug(...args) {
    console.log(...args)
}

function tskip(...args) {
    console.log(...args)
}

function twrite(...args) {
    console.log(...args)
}

// Process exit handler to return appropriate exit code
process.on('exit', () => {
    process.exitCode = exitCode
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error.message)
    if (tverbose()) {
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
export {
    //  Jest/Vitest-compatible API
    expect,
    //  Traditional TestMe API
    tassert,
    tcontains,
    tdebug,
    tdepth,
    teq,
    teqi,
    teql,
    teqll,
    teqz,
    tequ,
    teqp,
    tfalse,
    tfail,
    tget,
    tgti,
    tgtl,
    tgtz,
    tgtei,
    tgtel,
    tgtez,
    thas,
    tinfo,
    tlti,
    tltl,
    tltz,
    tltei,
    tltel,
    tltez,
    tmatch,
    tneq,
    tneqi,
    tneql,
    tneqll,
    tneqz,
    tnequ,
    tneqp,
    tnull,
    tnotnull,
    tskip,
    ttrue,
    tverbose,
    twrite,
}

// Default export with all functions
export default {
    //  Jest/Vitest-compatible API
    expect,
    //  Traditional TestMe API
    tassert,
    tcontains,
    tdebug,
    tdepth,
    teq,
    teqi,
    teql,
    teqll,
    teqz,
    tequ,
    teqp,
    tfalse,
    tfail,
    tget,
    tgti,
    tgtl,
    tgtz,
    tgtei,
    tgtel,
    tgtez,
    thas,
    tinfo,
    tlti,
    tltl,
    tltz,
    tltei,
    tltel,
    tltez,
    tmatch,
    tneq,
    tneqi,
    tneql,
    tneqll,
    tneqz,
    tnequ,
    tneqp,
    tnull,
    tnotnull,
    tskip,
    ttrue,
    tverbose,
    twrite,
}
