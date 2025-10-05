/**
    testme - Testing utilities for Ejscript tests
    Provides assertion functions, environment variable access, and test utilities
 */

module testme {

    function tdepth() {
        return parseInt(tget("TESTME_DEPTH", "0"), 10);
    }

    function tget(key, def = null) {
        let value = App.env[key];
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

    function getStack() {
        const error = new Error();
        const stack = error.stack
        // Skip this function and the calling test function to get the actual test line
        const caller = stack[3] || stack[2] || stack[1] || "unknown";
        return {
                filename: caller.filename,
                line: caller.lineno,
                func: caller.func,
        };
    }

    function treport(success, stack, message, received, expected) {
        let loc = stack.filename + ':' + stack.line;
        if (!message) {
            message = 'Test ' + (success ? 'passed' : 'failed')
        }
        if (success) {
            print('✓ ' + message);
        } else {
            if (expected === undefined && received === undefined) {
                stderr.write('✗ ' + message + ' at ' + loc + '\n');
            } else {
                stderr.write(
                    '✗ ' + message + ' at ' + loc + '\nExpected: ' + expected + '\nReceived: ' + received
                + '\n');
            }
            App.exit(1);
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
        treport(string.indexOf(pattern) >= 0, getStack(), message, string, pattern);
    }

    function tinfo(...args) {
        print(...args);
    }

    function tdebug(...args) {
        print(...args);
    }

    function tskip(...args) {
        print(...args);
    }

    function twrite(...args) {
        print(...args);
    }
}
