/*
    testme.h -- Header for the TestMe C language test runner

    This file provides a simple API for writing C unit tests.

    Copyright (c) All Rights Reserved. See details at the end of the file.
 */

#ifndef _h_TESTME
#define _h_TESTME 1

/*********************************** Includes *********************************/

#ifdef _WIN32
    //  Disable security warnings for standard C functions on Windows
    #undef   _CRT_SECURE_NO_DEPRECATE
    #define  _CRT_SECURE_NO_DEPRECATE 1
    #undef   _CRT_SECURE_NO_WARNINGS
    #define  _CRT_SECURE_NO_WARNINGS 1
    #define  _WINSOCK_DEPRECATED_NO_WARNINGS 1
    #include <winsock2.h>
    #include <windows.h>
#else
    #include <unistd.h>
#endif

#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <string.h>
#include <sys/types.h>

#if defined(__linux__)
#define true 1
#define false 0
#endif

#ifdef __cplusplus
extern "C" {
#endif

/*********************************** Defines **********************************/

//  Maximum buffer size for test messages
#define TM_MAX_BUFFER  4096

//  Short sleep duration in microseconds (5ms)
#define TM_SHORT_NAP   5000

//  Suppress unused function warnings for static helper functions
#if defined(__GNUC__) || defined(__clang__)
    #define TM_UNUSED __attribute__((unused))
#else
    #define TM_UNUSED
#endif

/*********************************** Functions *********************************/

/**
    Get the depth of the test.
    @return The depth of the test.
 */
int tdepth(void)
{
    const char   *value;

    if ((value = getenv("TESTME_DEPTH")) != 0) {
        return atoi(value);
    }
    return 0;
}

/**
    Exit the test on failure. If TESTME_SLEEP environment variable is set, pause for debugging.
    @param success Test success status. If false, exits or pauses for debugging.
 */
TM_UNUSED static void texit(int success) {
    if (success) {
        return;
    }
    if (getenv("TESTME_SLEEP")) {
#if _WIN32
            DebugBreak();
#else
            sleep(300);
#endif
    } else {
        exit(1);
    }
}

/**
    Get an environment variable.
    @param key The key to get.
    @param def The default value.
    @return The value of the environment variable.
 */
const char *tget(const char *key, const char *def)
{
    const char   *value;

    if ((value = getenv(key)) != 0) {
        return value;
    } else {
        return def;
    }
}


/**
    Get an environment variable as an integer.
    @param key The key to get.
    @param def The default value.
    @return The value of the environment variable.
 */
int tgeti(const char *key, int def)
{
    const char   *value;

    if ((value = getenv(key)) != 0) {
        return atoi(value);
    } else {
        return def;
    }
}

/**
    Check if an environment variable exists.
    @param key The key to check.
    @return 1 if the environment variable exists, 0 otherwise.
 */
int thas(const char *key)
{
    return tgeti(key, 0);
}

/**
    Emit a pass/fail message based on the success of the test.
    @param success The success of the test.
    @param loc The location of the test.
    @param fmt Message to emit
 */
TM_UNUSED static void tReport(int success, const char *loc, const char *expected, const char *received,
    const char *fmt, ...) {
    va_list     ap;
    char        buf[TM_MAX_BUFFER];
    char        tmp[TM_MAX_BUFFER];

    if (fmt && *fmt) {
        va_start(ap, fmt);
        vsnprintf(tmp, sizeof(tmp), fmt, ap);
        va_end(ap);
        if (!success) {
            snprintf(buf, sizeof(buf), "Test failed at %s: %s", loc, tmp);
        } else {
            snprintf(buf, sizeof(buf), "%s", tmp);
        }
    } else {
        if (success) {
            snprintf(buf, sizeof(buf), "Test passed at %s", loc);
        } else {
            snprintf(buf, sizeof(buf), "Test failed at %s", loc);
        }
    }
    if (success) {
        printf("✓ %s\n", buf);
        fflush(stdout);
    } else {
        if (!expected) expected = "(NULL)";
        if (!received) received = "(NULL)";
        fprintf(stderr, "✗ %s at %s\nExpected: %s\nReceived: %s\n", buf, loc, expected, received);
        fflush(stderr);
        texit(success);
    }
}

/**
    Helper macro to handle optional format string for string comparisons
 */
#define tReportString(success, loc, received, expected, ...) \
    tReport((int) (success), loc, expected, received, "" __VA_ARGS__)

/**
    Helper macro for int comparisons, converting integers to strings for reporting
 */
#define tReportInt(success, loc, received, expected, ...) \
    if (1) { \
        char ebuf[80], rbuf[80]; \
        snprintf(ebuf, sizeof(ebuf), "%d", (int)(expected)); \
        snprintf(rbuf, sizeof(rbuf), "%d", (int)(received)); \
        tReport((int) (success), loc, ebuf, rbuf, "" __VA_ARGS__) ; \
    }

/**
    Helper macro for long comparisons, converting to strings for reporting
 */
#define tReportLong(success, loc, received, expected, ...) \
    if (1) { \
        char ebuf[80], rbuf[80]; \
        snprintf(ebuf, sizeof(ebuf), "%ld", (long)(expected)); \
        snprintf(rbuf, sizeof(rbuf), "%ld", (long)(received)); \
        tReport((int) (success), loc, ebuf, rbuf, "" __VA_ARGS__) ; \
    }

/**
    Helper macro for long long comparisons, converting to strings for reporting
 */
#define tReportLongLong(success, loc, received, expected, ...) \
    if (1) { \
        char ebuf[80], rbuf[80]; \
        snprintf(ebuf, sizeof(ebuf), "%lld", (long long)(expected)); \
        snprintf(rbuf, sizeof(rbuf), "%lld", (long long)(received)); \
        tReport((int) (success), loc, ebuf, rbuf, "" __VA_ARGS__) ; \
    }

/**
    Helper macro for size_t/ptrdiff_t comparisons, converting to strings for reporting
 */
#define tReportSize(success, loc, received, expected, ...) \
    if (1) { \
        char ebuf[80], rbuf[80]; \
        snprintf(ebuf, sizeof(ebuf), "%td", (ptrdiff_t)(expected)); \
        snprintf(rbuf, sizeof(rbuf), "%td", (ptrdiff_t)(received)); \
        tReport((int) (success), loc, ebuf, rbuf, "" __VA_ARGS__) ; \
    }

/**
    Helper macro for unsigned int comparisons, converting to strings for reporting
 */
#define tReportUnsigned(success, loc, received, expected, ...) \
    if (1) { \
        char ebuf[80], rbuf[80]; \
        snprintf(ebuf, sizeof(ebuf), "%u", (unsigned int)(expected)); \
        snprintf(rbuf, sizeof(rbuf), "%u", (unsigned int)(received)); \
        tReport((int) (success), loc, ebuf, rbuf, "" __VA_ARGS__) ; \
    }

/**
    Helper macro for pointer comparisons, converting to strings for reporting
 */
#define tReportPtr(success, loc, received, expected, ...) \
    if (1) { \
        char ebuf[80], rbuf[80]; \
        snprintf(ebuf, sizeof(ebuf), "%p", (void*)(expected)); \
        snprintf(rbuf, sizeof(rbuf), "%p", (void*)(received)); \
        tReport((int) (success), loc, ebuf, rbuf, "" __VA_ARGS__) ; \
    }

//  Macros to construct source file location strings (file@line)
#define TM_LINE(s)          #s
#define TM_LINE2(s)         TM_LINE(s)
#define TM_LINE3            TM_LINE2(__LINE__)
#define TM_LOC              __FILE__ "@" TM_LINE3

/******************************** Test Assertion Macros **********************/

/*
    All test macros use if/else structure to be safe in enclosing code.
    Arguments are evaluated only once to safely handle function call expressions.
 */

/**
    Test that a string contains a substring.
    @param s The string to search in
    @param p The substring pattern to find
    @param ... Optional printf-style format string and arguments for custom message
    Example: tcontains(result, "success", "API call should succeed");
 */
#define tcontains(s, p, ...) if (1) { \
                                char *_s = (char*) (s); \
                                char *_p = (char*) (p); \
                                int _r = (_s && _p && strstr((char*) _s, (char*) _p) != 0); \
                                tReportString(_r, TM_LOC, _p, _s, __VA_ARGS__); \
                            } else

/**
    Test that an expression is false.
    @param E The expression to test
    @param ... Optional printf-style format string and arguments for custom message
    Example: tfalse(error_flag, "Error flag should be clear");
 */
#define tfalse(E, ...)      if (1) { \
                                int _r = (E) == 0; \
                                tReportString(_r, TM_LOC, "false", _r ? "true" : "false", __VA_ARGS__); \
                            } else

/**
    Unconditionally fail a test with a message.
    @param ... Optional printf-style format string and arguments for custom message
    Example: tfail("Unexpected code path reached");
 */
#define tfail(...)          tReportString(0, TM_LOC, "", "test failed", __VA_ARGS__)

/**
    Test that two int values are equal.
    @param a First int value
    @param b Second int value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: teqi(count, 5, "Should have processed 5 items");
 */
#define teqi(a, b, ...)     if (1) { \
                                int _r = (a) == (b); \
                                tReportInt(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two long values are equal.
    @param a First long value
    @param b Second long value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: teql(file_size, 1024L, "File should be 1024 bytes");
 */
#define teql(a, b, ...)     if (1) { \
                                int _r = (a) == (b); \
                                tReportLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two long long values are equal.
    @param a First long long value
    @param b Second long long value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: teqll(timestamp, 1234567890LL, "Timestamp should match");
 */
#define teqll(a, b, ...)    if (1) { \
                                int _r = (a) == (b); \
                                tReportLongLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two size_t/ssize values are equal.
    @param a First size value
    @param b Second size value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: teqz(length, strlen(str), "Length should match");
 */
#define teqz(a, b, ...)     if (1) { \
                                int _r = (a) == (b); \
                                tReportSize(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two unsigned int values are equal.
    @param a First unsigned int value
    @param b Second unsigned int value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tequ(flags, 0x0F, "Flags should be set correctly");
 */
#define tequ(a, b, ...)     if (1) { \
                                int _r = (a) == (b); \
                                tReportUnsigned(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two pointer values are equal.
    @param a First pointer
    @param b Second pointer to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: teqp(ptr, NULL, "Pointer should be NULL");
 */
#define teqp(a, b, ...)     if (1) { \
                                int _r = (a) == (b); \
                                tReportPtr(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two strings match exactly.
    Handles NULL strings (both NULL is considered a match).
    @param s First string
    @param p Second string to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tmatch(name, "expected", "Name should match");
 */
#define tmatch(s, p, ...)   if (1) { \
                                char *_s = (char*) (s); \
                                char *_p = (char*) (p); \
                                tReportString(((_s) == NULL && (_p) == NULL) || \
                                ((_s) != NULL && (_p) != NULL && strcmp((char*) _s, (char*) _p) == 0), TM_LOC, s, p, __VA_ARGS__); \
                            } else

/**
    Test that two int values are not equal.
    @param a First int value
    @param b Second int value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tneqi(status, ERROR_CODE, "Status should not be error");
 */
#define tneqi(a, b, ...)    if (1) { \
                                int _r = (a) != (b); \
                                tReportInt(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two long values are not equal.
    @param a First long value
    @param b Second long value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tneql(offset, 0L, "Offset should not be zero");
 */
#define tneql(a, b, ...)    if (1) { \
                                int _r = (a) != (b); \
                                tReportLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two long long values are not equal.
    @param a First long long value
    @param b Second long long value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tneqll(id, 0LL, "ID should not be zero");
 */
#define tneqll(a, b, ...)   if (1) { \
                                int _r = (a) != (b); \
                                tReportLongLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two size_t/ssize values are not equal.
    @param a First size value
    @param b Second size value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tneqz(bytes_read, 0, "Should have read some bytes");
 */
#define tneqz(a, b, ...)    if (1) { \
                                int _r = (a) != (b); \
                                tReportSize(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two unsigned int values are not equal.
    @param a First unsigned int value
    @param b Second unsigned int value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tnequ(mask, 0, "Mask should not be empty");
 */
#define tnequ(a, b, ...)    if (1) { \
                                int _r = (a) != (b); \
                                tReportUnsigned(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that two pointer values are not equal.
    @param a First pointer
    @param b Second pointer to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tneqp(buffer, NULL, "Buffer should be allocated");
 */
#define tneqp(a, b, ...)    if (1) { \
                                int _r = (a) != (b); \
                                tReportPtr(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that an expression is true.
    @param E The expression to test
    @param ... Optional printf-style format string and arguments for custom message
    Example: ttrue(connection_active, "Connection should be active");
 */
#define ttrue(E, ...)       if (1) { \
                                int _r = (E) != 0; \
                                tReportString(_r, TM_LOC, "true", _r ? "true" : "false", __VA_ARGS__); \
                            } else

/**
    Test that first value is greater than second value (integer types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tgti(count, 0, "Count should be positive");
 */
#define tgti(a, b, ...)     if (1) { \
                                int _r = (a) > (b); \
                                tReportInt(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is greater than second value (long types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tgtl(file_size, 1024L, "File should be larger than 1KB");
 */
#define tgtl(a, b, ...)     if (1) { \
                                int _r = (a) > (b); \
                                tReportLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is greater than second value (long long types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tgtll(timestamp, baseline, "Timestamp should be after baseline");
 */
#define tgtll(a, b, ...)    if (1) { \
                                int _r = (a) > (b); \
                                tReportLongLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is greater than second value (size types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tgtz(bytes_written, 0, "Should have written data");
 */
#define tgtz(a, b, ...)     if (1) { \
                                int _r = (a) > (b); \
                                tReportSize(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is greater than or equal to second value (integer types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tgtei(score, 60, "Score should be passing");
 */
#define tgtei(a, b, ...)    if (1) { \
                                int _r = (a) >= (b); \
                                tReportInt(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is greater than or equal to second value (long types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tgtel(timestamp, start_time, "Event should be after start");
 */
#define tgtel(a, b, ...)    if (1) { \
                                int _r = (a) >= (b); \
                                tReportLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is greater than or equal to second value (long long types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tgtell(counter, minimum, "Counter should be at least minimum");
 */
#define tgtell(a, b, ...)   if (1) { \
                                int _r = (a) >= (b); \
                                tReportLongLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is greater than or equal to second value (size types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tgtez(buffer_size, required_size, "Buffer should be large enough");
 */
#define tgtez(a, b, ...)    if (1) { \
                                int _r = (a) >= (b); \
                                tReportSize(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is less than second value (integer types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tlti(retries, MAX_RETRIES, "Should not exceed max retries");
 */
#define tlti(a, b, ...)     if (1) { \
                                int _r = (a) < (b); \
                                tReportInt(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is less than second value (long types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tltl(elapsed_time, timeout, "Should complete before timeout");
 */
#define tltl(a, b, ...)     if (1) { \
                                int _r = (a) < (b); \
                                tReportLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is less than second value (long long types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tltll(value, maximum, "Value should be under maximum");
 */
#define tltll(a, b, ...)    if (1) { \
                                int _r = (a) < (b); \
                                tReportLongLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is less than second value (size types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tltz(used_memory, max_memory, "Memory usage should be under limit");
 */
#define tltz(a, b, ...)     if (1) { \
                                int _r = (a) < (b); \
                                tReportSize(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is less than or equal to second value (integer types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tltei(index, array_size, "Index should be within bounds");
 */
#define tltei(a, b, ...)    if (1) { \
                                int _r = (a) <= (b); \
                                tReportInt(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is less than or equal to second value (long types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tltel(file_pos, file_size, "Position should not exceed file size");
 */
#define tltel(a, b, ...)    if (1) { \
                                int _r = (a) <= (b); \
                                tReportLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is less than or equal to second value (long long types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tltell(value, limit, "Value should not exceed limit");
 */
#define tltell(a, b, ...)   if (1) { \
                                int _r = (a) <= (b); \
                                tReportLongLong(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that first value is less than or equal to second value (size types).
    @param a First value
    @param b Second value to compare against
    @param ... Optional printf-style format string and arguments for custom message
    Example: tltez(bytes_read, buffer_size, "Should not overflow buffer");
 */
#define tltez(a, b, ...)    if (1) { \
                                int _r = (a) <= (b); \
                                tReportSize(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else

/**
    Test that a pointer is NULL.
    @param p The pointer to test
    @param ... Optional printf-style format string and arguments for custom message
    Example: tnull(unused_ptr, "Pointer should not be allocated");
 */
#define tnull(p, ...)       if (1) { \
                                int _r = (p) == NULL; \
                                tReportPtr(_r, TM_LOC, p, NULL, __VA_ARGS__); \
                            } else

/**
    Test that a pointer is not NULL.
    @param p The pointer to test
    @param ... Optional printf-style format string and arguments for custom message
    Example: tnotnull(buffer, "Buffer should be allocated");
 */
#define tnotnull(p, ...)    if (1) { \
                                int _r = (p) != NULL; \
                                tReportPtr(_r, TM_LOC, p, NULL, __VA_ARGS__); \
                            } else

/******************************** Legacy/Deprecated Macros ********************/

/**
    DEPRECATED: Use teqi() instead.
    Test that two integer values are equal.
    This macro is kept for backward compatibility but will be removed in a future version.
    @param a First integer value
    @param b Second integer value to compare against
    @param ... Optional printf-style format string and arguments for custom message
 */
#define teq(a, b, ...)      teqi(a, b, __VA_ARGS__)

/**
    DEPRECATED: Use tneqi() instead.
    Test that two integer values are not equal.
    This macro is kept for backward compatibility but will be removed in a future version.
    @param a First integer value
    @param b Second integer value to compare against
    @param ... Optional printf-style format string and arguments for custom message
 */
#define tneq(a, b, ...)     tneqi(a, b, __VA_ARGS__)

/******************************** Utility Functions **************************/

/**
    Output informational message during test execution. Automatically appends a newline.
    @param fmt Printf-style format string
    @param ... Arguments for format string
    Example: tinfo("Processing item %d", count);
 */
static inline void tinfo(const char *fmt, ...) {
    va_list     ap;
    char        buf[TM_MAX_BUFFER];

    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    printf("%s\n", buf);
    fflush(stdout);
}

/**
    Output debug message during test execution. Automatically appends a newline.
    @param fmt Printf-style format string
    @param ... Arguments for format string
    Example: tdebug("Debug: value = %d", val);
 */
static inline void tdebug(const char *fmt, ...) {
    va_list     ap;
    char        buf[TM_MAX_BUFFER];

    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    printf("%s\n", buf);
    fflush(stdout);
}

/**
    Output message about skipped test conditions. Automatically appends a newline.
    @param fmt Printf-style format string
    @param ... Arguments for format string
    Example: tskip("Skipping test on this platform");
 */
static inline void tskip(const char *fmt, ...) {
    va_list     ap;
    char        buf[TM_MAX_BUFFER];

    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    printf("%s\n", buf);
    fflush(stdout);
}

/**
    Write output during test execution. Automatically appends a newline.
    @param fmt Printf-style format string
    @param ... Arguments for format string
    Example: twrite("Test output: %s", result);
 */
static inline void twrite(const char *fmt, ...) {
    va_list     ap;
    char        buf[TM_MAX_BUFFER];

    va_start(ap, fmt);
    vsnprintf(buf, sizeof(buf), fmt, ap);
    va_end(ap);
    printf("%s\n", buf);
    fflush(stdout);
}

/**
    Legacy assertion macro. Use ttrue() for new code.
    @param E The expression to test
    @param ... Optional printf-style format string and arguments for custom message
 */
#define tassert(E, ...)     if (1) { \
                                int _r = (E) != 0; \
                                tReportString(_r, TM_LOC, "true", _r ? "true" : "false", __VA_ARGS__); \
                            } else
#ifdef __cplusplus
}
#endif

#endif /* _h_TESTME */

/*
    Copyright (c) Embedthis Software. All Rights Reserved.
    This software is distributed under commercial and open source licenses.
    You may use the Embedthis Open Source license or you may acquire a
    commercial license from Embedthis Software. You agree to be fully bound
    by the terms of either license. Consult the LICENSE.md distributed with
    this software for full details and other copyrights.
 */

