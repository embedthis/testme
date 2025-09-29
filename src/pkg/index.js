/**
 * testme - Testing utilities for JavaScript and TypeScript tests
 * Provides assertion functions, environment variable access, and test utilities
 */

let exitCode = 0;

function tdepth() {
    return parseInt(tget("TESTME_DEPTH", "0"), 10);
}

function tget(key, def = null) {
    let value = process.env[key];
    if (value == null || value == "") {
        value = def;
    }
    return value;
}

function thas(key) {
    return tget(key) - 0;
}

function tverbose() {
    return Boolean(tget("TESTME_VERBOSE"));
}

export function getStack() {
    const error = new Error();
    const stack = error.stack?.split("\n") || [];
    // Skip this function and the calling test function to get the actual test line
    const caller = stack[3] || stack[2] || stack[1] || "unknown";
    const match = caller.match(/at (?:.*\s+\()?([^:w]+):(\d+)\)?/);
    if (match) {
        return {
            filename: match[1],
            line: match[2],
        };
    }
    return { filename: "unknown file", line: "unknown line" };
}

function treport(success, stack, message, received, expected) {
    let loc = `${stack.filename}:${stack.line}`;
    if (!message) {
        message = `Test ${success ? "passed" : "failed"} at ${loc}`;
    }
    if (success) {
        console.log(`✓ ${message}`);
    } else {
        if (expected === undefined && received === undefined) {
            console.error(`✗ ${message} at ${loc}`);
        } else {
            console.error(
                `✗ ${message} at ${loc}\nExpected: ${expected}\nReceived: ${received}`
            );
        }
        process.exit(1);
    }
}

function tassert(condition, message = "") {
    treport(condition, getStack(), message);
}
function ttrue(condition, message = "") {
    treport(condition, getStack(), message);
}

function tfalse(condition, message = "") {
    treport(!condition, getStack(), message);
}

function tfail(message = "") {
    treport(false, getStack(), message);
}

function teq(received, expected, message = "") {
    treport(received == expected, getStack(), message, received, expected);
}

function tneq(received, expected, message = "") {
    treport(received != expected, getStack(), message, received, expected);
}

function tmatch(string, pattern, message = "") {
    treport(
        new RegExp(pattern).test(string),
        getStack(),
        message,
        string,
        pattern
    );
}

function tcontains(string, pattern, message = "") {
    console.log(`STRING <${string}> PATTERN <${pattern}>`);
    treport(string.includes(pattern), getStack(), message, string, pattern);
}

function tinfo(...args) {
    console.log(...args);
}

function tdebug(...args) {
    console.log(...args);
}

function tskip(...args) {
    console.log(...args);
}

function twrite(...args) {
    console.log(...args);
}

// Process exit handler to return appropriate exit code
process.on("exit", () => {
    process.exitCode = exitCode;
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error.message);
    if (tverbose()) {
        console.error(error.stack);
    }
    process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
});

// Export all functions for use in tests
export {
    tassert,
    tcontains,
    tdebug,
    tdepth,
    teq,
    tfalse,
    tfail,
    tget,
    thas,
    tinfo,
    tmatch,
    tneq,
    tskip,
    ttrue,
    tverbose,
    twrite,
};

// Default export with all functions
export default {
    tassert,
    tcontains,
    tdebug,
    tdepth,
    teq,
    tfalse,
    tfail,
    tget,
    thas,
    tinfo,
    tmatch,
    tneq,
    tskip,
    ttrue,
    tverbose,
    twrite,
};
