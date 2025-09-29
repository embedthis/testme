/*
    testme.h -- Header for the TestMe C language test runner

    This file provides a simple API for writing unit tests.

    Copyright (c) All Rights Reserved. See details at the end of the file.
 */

#ifndef _h_TESTME
#define _h_TESTME 1

/*********************************** Includes *********************************/

#ifdef _WIN32
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
#include <string.h>
#include <sys/types.h>

#ifdef __cplusplus
extern "C" {
#endif

/*********************************** Defines **********************************/

#define TM_MAX_BUFFER  4096
#define TM_SHORT_NAP   5000

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

static void texit(int success) {
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
static void treport(int success, const char *loc, const char *expected, const char *received,
    const char *fmt, ...) {
    va_list     ap;
    char        buf[TM_MAX_BUFFER];

    if (fmt && *fmt) {
        va_start(ap, fmt);
        vsnprintf(buf, sizeof(buf), fmt, ap);
        va_end(ap);
        if (!success) {
            snprintf(buf, sizeof(buf), "Test failed at %s: %s", loc, buf);
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
    } else {
        if (!expected) expected = "(NULL)";
        if (!received) received = "(NULL)";
        fprintf(stderr, "✗ %s at %s\nExpected: %s\nReceived: %s\n", buf, loc, expected, received);
        texit(success);
    }
}

/**
    Helper macro to handle optional format string
 */
#define treportx(success, loc, received, expected, ...) \
    treport((int) (success), loc, expected, received, "" __VA_ARGS__)

#define treportInt(success, loc, received, expected, ...) \
    if (1) { \
        char ebuf[80], rbuf[80]; \
        snprintf(ebuf, sizeof(ebuf), "%d", expected); \
        snprintf(rbuf, sizeof(rbuf), "%d", received); \
        treport((int) (success), loc, ebuf, rbuf, "" __VA_ARGS__) ; \
    }

#define TM_LINE(s)          #s
#define TM_LINE2(s)         TM_LINE(s)
#define TM_LINE3            TM_LINE2(__LINE__)
#define TM_LOC              __FILE__ "@" TM_LINE3

/*
    Ensure we invoke args only once if they are function calls.
    Use if /else structure to be safe in enclosing code.
 */
#define tcontains(s, p, ...) if (1) { \
                                char *_s = (char*) (s); \
                                char *_p = (char*) (p); \
                                int _r = (_s && _p && strstr((char*) _s, (char*) _p) != 0); \
                                treportx(_r, TM_LOC, _p, _s, __VA_ARGS__); \
                            } else
#define tfalse(E, ...)      if (1) { \
                                int _r = (E) == 0; \
                                treportx(_r, TM_LOC, "false", _r ? "true" : "false", __VA_ARGS__); \
                            } else
#define tfail(...)          treportx(0, TM_LOC, "", "test failed", __VA_ARGS__)
#define teq(a, b, ...)      if (1) { \
                                int _r = (a) == (b); \
                                treportInt(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else
#define tmatch(s, p, ...)   if (1) { \
                                char *_s = (char*) (s); \
                                char *_p = (char*) (p); \
                                treportx(((_s) == NULL && (_p) == NULL) || \
                                ((_s) != NULL && (_p) != NULL && strcmp((char*) _s, (char*) _p) == 0), TM_LOC, p, s, __VA_ARGS__); \
                            } else
#define tneq(a, b, ...)      if (1) { \
                                int _r = (a) != (b); \
                                treportInt(_r, TM_LOC, a, b, __VA_ARGS__); \
                            } else
#define ttrue(E, ...)       if (1) { \
                                int _r = (E) != 0; \
                                treportx(_r, TM_LOC, "true", _r ? "true" : "false", __VA_ARGS__); \
                            } else

#define tgt(a)      if (1) { \


// Legacy
#define tinfo(...)          printf(__VA_ARGS__)
#define tdebug(...)         printf(__VA_ARGS__)
#define tskip(...)          printf(__VA_ARGS__)
#define twrite(...)         printf(__VA_ARGS__)
#define tassert(E, ...)     if (1) { \
                                int _r = (E) != 0; \
                                treportx(_r, TM_LOC, "true", _r ? "true" : "false", __VA_ARGS__); \
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

