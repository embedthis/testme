/**
 * testme - Testing utilities for JavaScript and TypeScript tests
 * Provides assertion functions, environment variable access, and test utilities
 */

let exitCode = 0;

function tdepth() {
    return parseInt(tget("TESTME_DEPTH", "0"), 10);
}

function tverbose() {
    return Boolean(tget("TESTME_VERBOSE"));
}

function getStack() {
    const error = new Error();
    const stack = error.stack?.split("\n") || [];
    // Skip this function and the calling test function to get the actual test line
    const caller = stack[3] || stack[2] || stack[1] || "unknown";
    const match = caller.match(/at (?:.*\s+\()?([^:]+):(\d+):(\d+)\)?/);
    if (match) {
        return {
            filename: match[1],
            line: match[2],
            column: match[3],
        };
    }
    return { filename: "unknown", line: "?", column: "?" };
}

function ttrue(condition, message = "") {
    if (condition) {
        console.log(`✓ ${message}`);
    } else {
        console.error(
            `✗ ${message} at ${getStack().filename}:${getStack().line}`
        );
        process.exit(1);
    }
}

function tfalse(condition, message = "") {
    ttrue(!condition, message);
}

function tfail(message = "") {
    console.error(`✗ ${message} at ${getStack().filename}:${getStack().line}`);
    process.exit(1);
}

// Assert that two values are equal
function teq(received, expected, message = "") {
    if (received === expected) {
        console.log(`✓ ${message}`);
    } else {
        console.error(
            `✗ ${message} at ${getStack().filename}:${getStack().line}` +
                `\nExpected: ${expected}\nReceived: ${received}`
        );
        process.exit(1);
    }
}

function tneq(received, expected, message = "") {
    ttrue(expected !== received, message);
}

function tmatch(string, pattern, message = "") {
    const regex = new RegExp(pattern);
    if (regex.test(string)) {
        console.log(`✓ ${message}`);
    } else {
        console.error(
            `✗ ${message} at ${getStack().filename}:${getStack().line}` +
                `\nPattern:  ${pattern}\nReceived: ${string}`
        );
        process.exit(1);
    }
}

function tcontains(string, pattern, message = "") {
    if (string.includes(pattern)) {
        console.log(`✓ ${message}`);
    } else {
        console.error(
            `✗ ${message} at ${getStack().filename}:${getStack().line}` +
                `\nPattern:  ${pattern}\nReceived: ${string}`
        );
        process.exit(1);
    }
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
    tcontains,
    tdebug,
    tdepth,
    teq,
    tfalse,
    tfail,
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
    tcontains,
    tdebug,
    tdepth,
    teq,
    tfalse,
    tfail,
    tinfo,
    tmatch,
    tneq,
    tskip,
    ttrue,
    tverbose,
    twrite,
};
