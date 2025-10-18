# TestMe C Testing API Reference

Complete API reference for writing unit tests in C using TestMe.

**Target Audience:** C developers writing unit tests, AI tools generating C tests.

**Related Documentation:**
- [README-TESTS.md](README-TESTS.md) - General test requirements and conventions
- [README-JS.md](README-JS.md) - JavaScript/TypeScript testing API
- [README.md](README.md) - TestMe usage guide

---

## Header File

Include `testme.h` in your C test files:

```c
#include "testme.h"
```

**Installation Locations:**
- System: `~/.local/include/testme.h`
- Local development: `test/testme.h` (copied during build)

---

## Equality Assertions

### teqi()
```c
void teqi(int actual, int expected, const char *msg, ...)
```
**Description:** Assert two `int` values are equal.

**Parameters:**
- `actual` - Value produced by code under test
- `expected` - Expected value
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** On success, prints `✓` message. On failure, prints `✗` message with expected/actual values and exits with code 1.

---

### teql()
```c
void teql(long actual, long expected, const char *msg, ...)
```
**Description:** Assert two `long` values are equal.

**Parameters:** Same as `teqi()` but for `long` type.

**Behavior:** Same as `teqi()`.

---

### teqll()
```c
void teqll(long long actual, long long expected, const char *msg, ...)
```
**Description:** Assert two `long long` values are equal.

**Parameters:** Same as `teqi()` but for `long long` type.

**Behavior:** Same as `teqi()`.

---

### teqz()
```c
void teqz(ssize actual, ssize expected, const char *msg, ...)
```
**Description:** Assert two `ssize`/`size_t`/`ptrdiff_t` values are equal.

**Parameters:** Same as `teqi()` but for size types.

**Behavior:** Same as `teqi()`.

**Note:** `ssize` is always 64 bits on all platforms in TestMe projects.

---

### tequ()
```c
void tequ(unsigned int actual, unsigned int expected, const char *msg, ...)
```
**Description:** Assert two `unsigned int` values are equal.

**Parameters:** Same as `teqi()` but for `unsigned int` type.

**Behavior:** Same as `teqi()`.

---

### teqp()
```c
void teqp(void *actual, void *expected, const char *msg, ...)
```
**Description:** Assert two pointer values are equal.

**Parameters:**
- `actual` - Pointer produced by code under test
- `expected` - Expected pointer value
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** Same as `teqi()`.

---

## Inequality Assertions

### tneqi()
```c
void tneqi(int actual, int expected, const char *msg, ...)
```
**Description:** Assert two `int` values are not equal.

**Parameters:** Same as `teqi()`.

**Behavior:** On success, prints `✓` message. On failure (values are equal), prints `✗` message and exits with code 1.

---

### tneql()
```c
void tneql(long actual, long expected, const char *msg, ...)
```
**Description:** Assert two `long` values are not equal.

**Parameters:** Same as `teql()`.

**Behavior:** Same as `tneqi()`.

---

### tneqll()
```c
void tneqll(long long actual, long long expected, const char *msg, ...)
```
**Description:** Assert two `long long` values are not equal.

**Parameters:** Same as `teqll()`.

**Behavior:** Same as `tneqi()`.

---

### tneqz()
```c
void tneqz(ssize actual, ssize expected, const char *msg, ...)
```
**Description:** Assert two `ssize`/`size_t`/`ptrdiff_t` values are not equal.

**Parameters:** Same as `teqz()`.

**Behavior:** Same as `tneqi()`.

---

### tnequ()
```c
void tnequ(unsigned int actual, unsigned int expected, const char *msg, ...)
```
**Description:** Assert two `unsigned int` values are not equal.

**Parameters:** Same as `tequ()`.

**Behavior:** Same as `tneqi()`.

---

### tneqp()
```c
void tneqp(void *actual, void *expected, const char *msg, ...)
```
**Description:** Assert two pointer values are not equal.

**Parameters:** Same as `teqp()`.

**Behavior:** Same as `tneqi()`.

---

## Comparison Assertions (Greater Than)

### tgti()
```c
void tgti(int actual, int threshold, const char *msg, ...)
```
**Description:** Assert `actual > threshold` (int).

**Parameters:**
- `actual` - Value to check
- `threshold` - Minimum value (exclusive)
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** Succeeds if `actual > threshold`. Fails and exits if `actual <= threshold`.

---

### tgtl()
```c
void tgtl(long actual, long threshold, const char *msg, ...)
```
**Description:** Assert `actual > threshold` (long).

**Parameters:** Same as `tgti()` but for `long` type.

**Behavior:** Same as `tgti()`.

---

### tgtll()
```c
void tgtll(long long actual, long long threshold, const char *msg, ...)
```
**Description:** Assert `actual > threshold` (long long).

**Parameters:** Same as `tgti()` but for `long long` type.

**Behavior:** Same as `tgti()`.

---

### tgtz()
```c
void tgtz(ssize actual, ssize threshold, const char *msg, ...)
```
**Description:** Assert `actual > threshold` (ssize).

**Parameters:** Same as `tgti()` but for size types.

**Behavior:** Same as `tgti()`.

---

### tgtei()
```c
void tgtei(int actual, int threshold, const char *msg, ...)
```
**Description:** Assert `actual >= threshold` (int).

**Parameters:** Same as `tgti()` but threshold is inclusive.

**Behavior:** Succeeds if `actual >= threshold`. Fails and exits if `actual < threshold`.

---

### tgtel()
```c
void tgtel(long actual, long threshold, const char *msg, ...)
```
**Description:** Assert `actual >= threshold` (long).

**Parameters:** Same as `tgtei()` but for `long` type.

**Behavior:** Same as `tgtei()`.

---

### tgtell()
```c
void tgtell(long long actual, long long threshold, const char *msg, ...)
```
**Description:** Assert `actual >= threshold` (long long).

**Parameters:** Same as `tgtei()` but for `long long` type.

**Behavior:** Same as `tgtei()`.

---

### tgtez()
```c
void tgtez(ssize actual, ssize threshold, const char *msg, ...)
```
**Description:** Assert `actual >= threshold` (ssize).

**Parameters:** Same as `tgtei()` but for size types.

**Behavior:** Same as `tgtei()`.

---

## Comparison Assertions (Less Than)

### tlti()
```c
void tlti(int actual, int threshold, const char *msg, ...)
```
**Description:** Assert `actual < threshold` (int).

**Parameters:**
- `actual` - Value to check
- `threshold` - Maximum value (exclusive)
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** Succeeds if `actual < threshold`. Fails and exits if `actual >= threshold`.

---

### tltl()
```c
void tltl(long actual, long threshold, const char *msg, ...)
```
**Description:** Assert `actual < threshold` (long).

**Parameters:** Same as `tlti()` but for `long` type.

**Behavior:** Same as `tlti()`.

---

### tltll()
```c
void tltll(long long actual, long long threshold, const char *msg, ...)
```
**Description:** Assert `actual < threshold` (long long).

**Parameters:** Same as `tlti()` but for `long long` type.

**Behavior:** Same as `tlti()`.

---

### tltz()
```c
void tltz(ssize actual, ssize threshold, const char *msg, ...)
```
**Description:** Assert `actual < threshold` (ssize).

**Parameters:** Same as `tlti()` but for size types.

**Behavior:** Same as `tlti()`.

---

### tltei()
```c
void tltei(int actual, int threshold, const char *msg, ...)
```
**Description:** Assert `actual <= threshold` (int).

**Parameters:** Same as `tlti()` but threshold is inclusive.

**Behavior:** Succeeds if `actual <= threshold`. Fails and exits if `actual > threshold`.

---

### tltel()
```c
void tltel(long actual, long threshold, const char *msg, ...)
```
**Description:** Assert `actual <= threshold` (long).

**Parameters:** Same as `tltei()` but for `long` type.

**Behavior:** Same as `tltei()`.

---

### tltell()
```c
void tltell(long long actual, long long threshold, const char *msg, ...)
```
**Description:** Assert `actual <= threshold` (long long).

**Parameters:** Same as `tltei()` but for `long long` type.

**Behavior:** Same as `tltei()`.

---

### tltez()
```c
void tltez(ssize actual, ssize threshold, const char *msg, ...)
```
**Description:** Assert `actual <= threshold` (ssize).

**Parameters:** Same as `tltei()` but for size types.

**Behavior:** Same as `tltei()`.

---

## Boolean Assertions

### ttrue()
```c
void ttrue(int expr, const char *msg, ...)
```
**Description:** Assert expression evaluates to non-zero (true).

**Parameters:**
- `expr` - Expression to test
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** Succeeds if `expr != 0`. Fails and exits if `expr == 0`.

---

### tfalse()
```c
void tfalse(int expr, const char *msg, ...)
```
**Description:** Assert expression evaluates to zero (false).

**Parameters:** Same as `ttrue()`.

**Behavior:** Succeeds if `expr == 0`. Fails and exits if `expr != 0`.

---

## Pointer Assertions

### tnull()
```c
void tnull(void *ptr, const char *msg, ...)
```
**Description:** Assert pointer is NULL.

**Parameters:**
- `ptr` - Pointer to check
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** Succeeds if `ptr == NULL`. Fails and exits if `ptr != NULL`.

---

### tnotnull()
```c
void tnotnull(void *ptr, const char *msg, ...)
```
**Description:** Assert pointer is not NULL.

**Parameters:** Same as `tnull()`.

**Behavior:** Succeeds if `ptr != NULL`. Fails and exits if `ptr == NULL`.

---

## String Assertions

### tmatch()
```c
void tmatch(const char *str, const char *pattern, const char *msg, ...)
```
**Description:** Assert string exactly matches pattern.

**Parameters:**
- `str` - String to check
- `pattern` - Pattern to match against
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** Succeeds if strings are identical (via `strcmp()`). Handles NULL strings (both NULL is considered a match). Fails and exits if strings differ.

---

### tcontains()
```c
void tcontains(const char *str, const char *substr, const char *msg, ...)
```
**Description:** Assert string contains substring.

**Parameters:**
- `str` - String to search in
- `substr` - Substring to find
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** Succeeds if `str` contains `substr` (via `strstr()`). Handles NULL strings. Fails and exits if substring not found.

---

## Control Functions

### tfail()
```c
void tfail(const char *msg, ...)
```
**Description:** Unconditionally fail the test with a message.

**Parameters:**
- `msg` - Printf-style format string (optional)
- `...` - Format arguments (optional)

**Behavior:** Always prints error message and exits with code 1.

---

## Environment Access Functions

### tget()
```c
const char *tget(const char *key, const char *defaultValue)
```
**Description:** Get environment variable as string with default fallback.

**Parameters:**
- `key` - Environment variable name
- `defaultValue` - Value to return if variable not set

**Return Value:** String value (never NULL, returns `defaultValue` if not set).

**Behavior:** Does not exit or fail. Returns `defaultValue` if variable is not found.

---

### tgeti()
```c
int tgeti(const char *key, int defaultValue)
```
**Description:** Get environment variable as integer with default fallback.

**Parameters:**
- `key` - Environment variable name
- `defaultValue` - Value to return if variable not set or not numeric

**Return Value:** Integer value (via `atoi()`).

**Behavior:** Does not exit or fail. Returns `defaultValue` if variable not found or not numeric.

---

### thas()
```c
int thas(const char *key)
```
**Description:** Check if environment variable exists.

**Parameters:**
- `key` - Environment variable name

**Return Value:**
- `1` if variable exists (even if empty)
- `0` if variable does not exist

**Behavior:** Does not exit or fail.

---

### tdepth()
```c
int tdepth(void)
```
**Description:** Get current test execution depth from `TESTME_DEPTH` environment variable.

**Parameters:** None.

**Return Value:** Integer depth value (0 if not set).

**Behavior:** Does not exit or fail. Returns 0 if `TESTME_DEPTH` not set.

---

## Output Functions

### tinfo()
```c
void tinfo(const char *fmt, ...)
```
**Description:** Print informational message during test execution. Automatically appends newline.

**Parameters:**
- `fmt` - Printf-style format string
- `...` - Format arguments

**Behavior:** Writes to stdout and continues execution. Does not affect test pass/fail status.

---

### tdebug()
```c
void tdebug(const char *fmt, ...)
```
**Description:** Print debug message during test execution. Automatically appends newline.

**Parameters:** Same as `tinfo()`.

**Behavior:** Same as `tinfo()`.

---

### tskip()
```c
void tskip(const char *fmt, ...)
```
**Description:** Print message about skipped test conditions. Automatically appends newline.

**Parameters:** Same as `tinfo()`.

**Behavior:** Same as `tinfo()`.

**Usage:** Typically used to explain why a test was skipped or conditional logic was bypassed.

---

### twrite()
```c
void twrite(const char *fmt, ...)
```
**Description:** Write general output during test execution. Automatically appends newline.

**Parameters:** Same as `tinfo()`.

**Behavior:** Same as `tinfo()`.

---

## Legacy Functions (Deprecated)

### teq()
```c
void teq(int actual, int expected, const char *msg, ...)
```
**Description:** DEPRECATED. Use `teqi()` instead.

**Behavior:** Identical to `teqi()`. Provided for backward compatibility only.

**Recommendation:** Use type-specific `teqi()` for clarity.

---

### tneq()
```c
void tneq(int actual, int expected, const char *msg, ...)
```
**Description:** DEPRECATED. Use `tneqi()` instead.

**Behavior:** Identical to `tneqi()`. Provided for backward compatibility only.

**Recommendation:** Use type-specific `tneqi()` for clarity.

---

### tassert()
```c
void tassert(int expr, const char *msg, ...)
```
**Description:** DEPRECATED. Use `ttrue()` instead.

**Behavior:** Identical to `ttrue()`. Provided for backward compatibility only.

**Recommendation:** Use `ttrue()` for consistency with modern test APIs.

---

## Constants and Macros

### TM_MAX_BUFFER
```c
#define TM_MAX_BUFFER 4096
```
**Description:** Maximum buffer size for test messages (4096 bytes).

**Usage:** Internal limit for formatting assertion messages.

---

### TM_SHORT_NAP
```c
#define TM_SHORT_NAP 5000
```
**Description:** Short sleep duration in microseconds (5ms or 5000µs).

**Usage:** Used internally for brief delays during debugging pauses.

---

## Special Features

### Debug Pause

If the `TESTME_SLEEP` environment variable is set, failed assertions will pause for debugging:
- **Windows:** Triggers `DebugBreak()` to attach debugger
- **Unix/Linux/macOS:** Sleeps for 300 seconds (5 minutes) to allow debugger attachment

**Usage:**
```bash
TESTME_SLEEP=1 tm my_test.tst.c
# Test pauses on failure, allowing debugger to attach
```

---

## Usage Example

```c
#include "testme.h"

int add(int a, int b) {
    return a + b;
}

int main() {
    // Basic equality
    teqi(add(2, 3), 5, "Addition test");
    tneqi(add(2, 3), 6, "Addition inequality test");

    // Comparisons
    tgti(add(5, 5), 9, "Result should be greater than 9");
    tlti(add(1, 1), 10, "Result should be less than 10");

    // Boolean checks
    ttrue(add(5, 0) == 5, "Identity test");
    tfalse(add(2, 2) == 5, "Should not equal 5");

    // Pointer checks
    int *ptr = NULL;
    tnull(ptr, "Pointer should be NULL");

    int value = 42;
    ptr = &value;
    tnotnull(ptr, "Pointer should not be NULL");

    // String tests
    const char *result = "success";
    tmatch(result, "success", "String should match");
    tcontains(result, "ucc", "Should contain substring");

    // Environment access
    const char *binPath = tget("BIN", "/default/bin");
    tnotnull(binPath, "BIN variable should be available");

    if (thas("TESTME_VERBOSE")) {
        tinfo("Verbose mode enabled");
    }

    int depth = tdepth();
    tinfo("Running at depth %d", depth);

    return 0;
}
```

---

## Error Output Format

When an assertion fails, output follows this format:

```
✗ Test failed at math.tst.c@42: Addition test
Expected: 5
Received: 4
```

**Components:**
- `✗` - Failure indicator
- Test location: `filename@line`
- Custom message: "Addition test"
- Expected value
- Received/actual value

---

## Best Practices

1. **Use type-specific assertions** - `teqi()`, `teql()`, etc. provide better error messages than generic `teq()`
2. **Provide descriptive messages** - Use the optional message parameter to explain what is being tested
3. **Check return values** - Use `tneqi(result, -1, "Function should succeed")` pattern
4. **Use environment functions** - Access `TESTME_*` variables via `tget()`, `thas()`, `tdepth()`
5. **Clean up resources** - Free allocated memory and close file handles
6. **Avoid printf** - Use `tinfo()`, `tdebug()` instead for consistent output formatting

---

## Platform Compatibility

All functions work consistently across:
- **Linux** (GCC, Clang)
- **macOS** (Clang, GCC)
- **Windows** (MSVC, MinGW, Clang)

Platform-specific behavior is handled internally by `testme.h`.

---

## Related Documentation

- [README-TESTS.md](README-TESTS.md) - Exit codes, output streams, environment variables
- [README-JS.md](README-JS.md) - JavaScript/TypeScript testing API
- [README.md](README.md) - TestMe usage guide with configuration

---

## Version Information

This API reference applies to TestMe 1.x and later.

Source: [src/modules/c/testme.h](src/modules/c/testme.h)
