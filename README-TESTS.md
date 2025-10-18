# TestMe Test Requirements

This document specifies the general requirements and conventions for writing unit tests with TestMe.

**Target Audience:** Test authors and AI tools generating tests for C, JavaScript, or TypeScript projects.

**Related Documentation:**
- [README-C.md](README-C.md) - Complete C testing API reference
- [README-JS.md](README-JS.md) - Complete JavaScript/TypeScript testing API reference
- [README.md](README.md) - TestMe usage guide with examples
- [doc/JEST_API.md](doc/JEST_API.md) - Jest/Vitest-compatible API examples

---

## Exit Code Requirements

All tests must follow this exit code convention:

**Exit 0 (Success)**
- Test passed all assertions
- No errors were encountered
- All expected conditions were met

**Non-zero Exit (Failure)**
- Typically exit code 1
- Test failed one or more assertions
- Test encountered runtime errors
- Unexpected conditions occurred

TestMe interprets the exit code of each test process to determine pass/fail status. Tests that exit with code 0 are marked as passed; all other exit codes indicate failure.

---

## Standard Output and Error Streams

### stdout (Standard Output)

**Purpose:** Normal test output, informational messages, and success indicators.

**Usage:**
- Progress messages during test execution
- Success indicators (e.g., `✓ Test passed`)
- Informational logging via `tinfo()` or `console.log()`
- Debug output when verbose mode is enabled
- Test result summaries

**Behavior:**
- Captured by TestMe and displayed based on verbosity settings
- In quiet mode (`-q`), stdout is suppressed
- In verbose mode (`-v`), stdout is displayed in real-time
- In default mode, stdout is shown for failing tests

### stderr (Standard Error)

**Purpose:** Error messages, failure details, and diagnostic information.

**Usage:**
- Assertion failure messages
- Expected vs actual value comparisons
- Stack traces and error context
- File/line location information
- Critical diagnostic information

**Behavior:**
- Always captured by TestMe
- Always displayed when a test fails
- Shown regardless of quiet mode
- Should contain sufficient detail for debugging

---

## Output Formatting Recommendations

### Success Messages

- Use clear, concise messages: `✓ Addition test passed`
- Include context when helpful: `✓ User validation accepts valid email`
- Use checkmark or success indicators: `✓`, `PASS`, `OK`

### Failure Messages

**Essential Information:**
- What assertion failed
- Expected value
- Actual/received value
- File name and line number
- Function or test name

**Example Format:**
```
✗ Test failed at math.tst.c:42: Addition test
Expected: 5
Received: 4
```

**Best Practices:**
- Be specific about what failed
- Show both expected and actual values
- Include file:line location for easy navigation
- Avoid excessive output that obscures the failure
- Use consistent formatting across tests

---

## Working Directory

All tests execute with their working directory (CWD) set to the directory containing the test file.

**Benefits:**
- Consistent behavior across all test types
- Reliable access to relative file paths
- Predictable resource loading
- Platform-independent path handling

**Implications:**
- Test files can reference sibling files with relative paths
- Configuration files in the test directory are accessible
- Test data files should be placed relative to test files
- No need to compute paths from project root

**Examples:**
- C test in `test/unit/math.tst.c` runs with CWD = `test/unit/`
- JavaScript test in `test/api/user.tst.js` runs with CWD = `test/api/`
- Configuration file `testme.json5` is read from nearest parent directory

---

## Test File Naming Conventions

TestMe discovers tests based on configured patterns. **Default patterns:**

**Cross-Platform:**
- C tests: `**/*.tst.c`
- JavaScript tests: `**/*.tst.js`
- TypeScript tests: `**/*.tst.ts`
- Python tests: `**/*.tst.py`
- Go tests: `**/*.tst.go`

**Platform-Specific:**
- Shell tests (Unix/macOS/Linux): `**/*.tst.sh`
- PowerShell tests (Windows): `**/*.tst.ps1`
- Batch tests (Windows): `**/*.tst.bat`, `**/*.tst.cmd`

**Pattern Customization:**
Patterns are configurable in `testme.json5` and support platform-specific overrides.

**File Type Detection:**
TestMe determines test type by the final file extension:
- `.c` → C test (compile with GCC/Clang/MSVC, then execute)
- `.js` → JavaScript test (execute with Bun runtime)
- `.ts` → TypeScript test (execute with Bun runtime)
- `.sh` → Shell test (execute with bash/sh)
- `.ps1` → PowerShell test (execute with PowerShell)
- `.bat`, `.cmd` → Batch test (execute with cmd.exe)
- `.py` → Python test (execute with python)
- `.go` → Go test (compile and execute with go)

---

## Environment Variables

TestMe provides environment variables to all tests and service scripts.

### User-Configurable Variables

Defined in `testme.json5` configuration files under the `environment` section. These are custom variables set by the test project.

### TestMe System Variables

Automatically set by TestMe (all prefixed with `TESTME_`):

**Execution Context:**
- `TESTME_VERBOSE` - Set to `"1"` when `--verbose` flag is used
- `TESTME_DEPTH` - Current depth value from `--depth` flag (string number)
- `TESTME_ITERATIONS` - Iteration count from `--iterations` flag (default: `"1"`)

**Platform Information:**
- `TESTME_PLATFORM` - Combined OS-architecture (e.g., `"macosx-arm64"`, `"linux-x64"`, `"windows-x64"`)
- `TESTME_OS` - Operating system (`"macosx"`, `"linux"`, `"windows"`)
- `TESTME_ARCH` - CPU architecture (`"x64"`, `"arm64"`, `"ia32"`)

**Build Configuration:**
- `TESTME_CC` - C compiler detected/configured (`"gcc"`, `"clang"`, `"msvc"`)
- `TESTME_PROFILE` - Build profile from config or `--profile` flag (default: `"dev"`)

**Path Information:**
- `TESTME_TESTDIR` - Relative path from executable to test file directory
- `TESTME_CONFIGDIR` - Relative path from executable to config file directory

**Accessing Environment Variables:**

**C tests:**
```c
const char *verbose = getenv("TESTME_VERBOSE");
const char *depth = tget("TESTME_DEPTH", "0");
```

**JavaScript/TypeScript tests:**
```javascript
const verbose = process.env.TESTME_VERBOSE
const depth = tget('TESTME_DEPTH', '0')
```

**Shell tests:**
```bash
if [ "$TESTME_VERBOSE" = "1" ]; then
    echo "Verbose mode enabled"
fi
```

---

## Test Organization

### Flat Tests

Simple tests can be written as standalone scripts that execute assertions sequentially:

```javascript
import {expect} from 'testme'

expect(2 + 2).toBe(4)
expect('hello').toContain('ell')
```

### Organized Tests with describe() and test()

For better structure, use `describe()` and `test()` (JavaScript/TypeScript only):

```javascript
import {describe, test, expect} from 'testme'

await describe('Calculator', () => {
    test('addition works', () => {
        expect(2 + 2).toBe(4)
    })

    test('subtraction works', () => {
        expect(5 - 3).toBe(2)
    })
})
```

**See:** [README-JS.md](README-JS.md) for complete `describe()` and `test()` API documentation.

---

## Test Discovery

TestMe recursively discovers tests by:

1. Walking directory trees from current working directory
2. Matching files against configured include patterns
3. Excluding files matching exclude patterns (e.g., `node_modules`, `.testme`)
4. Grouping tests by their configuration directory

**Pattern Matching Modes:**
- **Glob patterns:** `**/*.tst.c`, `test/**/*.js`
- **Base names:** `math` matches `math.tst.c`, `math.tst.js`, etc.
- **Directory names:** `integration` runs all tests in that directory
- **Path patterns:** `**/math*`, `test/unit/*.tst.c`

---

## Artifact Management

### C Test Artifacts

C tests create build artifacts in `.testme` directories co-located with test files:

```
project/tests/
├── math.tst.c
└── .testme/
    ├── math              # Compiled binary
    ├── math.dSYM/        # Debug symbols (macOS)
    └── compile.log       # Compilation output
```

**Cleanup:**
- Use `tm --clean` to remove all `.testme` directories
- Use `tm --keep` to preserve artifacts after tests run
- Artifacts are automatically cleaned unless `--keep` is specified

### Script Test Artifacts

JavaScript, TypeScript, Shell, Python, and Go tests do not create persistent artifacts. Temporary files created during test execution should be cleaned up by the test itself.

---

## Test Configuration

Tests can be configured using `testme.json5` files in the test directory hierarchy. Each test inherits configuration from the nearest `testme.json5` file walking up the directory tree.

**Configuration Hierarchy (highest to lowest priority):**
1. CLI arguments (e.g., `--verbose`, `--depth 2`)
2. Test-specific `testme.json5` (nearest to test file)
3. Project `testme.json5` (walking up directory tree)
4. Built-in defaults

**Key Configuration Options:**
- `enable` - Enable/disable tests in directory (default: `true`)
- `depth` - Minimum depth required to run tests (default: `0`)
- `execution.timeout` - Test timeout in seconds (default: `30`)
- `execution.parallel` - Enable parallel execution (default: `true`)
- `execution.workers` - Number of parallel workers (default: `4`)
- `patterns.include` - Test file discovery patterns
- `patterns.exclude` - Files/directories to exclude
- `environment` - Environment variables for tests
- `services` - Service lifecycle scripts (skip, prep, setup, cleanup)

**See:** [README.md](README.md) Configuration section for complete details.

---

## Test Lifecycle

### Service Scripts

TestMe supports service lifecycle management through scripts:

1. **Skip Script** - Determines if tests should run (exit 0=run, non-zero=skip)
2. **Environment Script** - Emits environment variables (key=value lines)
3. **Prep Script** - Runs once before tests (waits for completion)
4. **Setup Script** - Starts background service during tests
5. **Test Execution** - Tests run sequentially or in parallel
6. **Cleanup Script** - Runs after all tests complete

### Test Execution Order

**Sequential Execution (within describe blocks):**
- Tests within a `describe()` block run sequentially
- Hooks (`beforeEach`, `afterEach`) run in order

**Parallel Execution (default):**
- Top-level tests run in parallel (configurable workers)
- Each test gets isolated environment
- Artifacts are isolated per test

---

## Best Practices

### Writing Effective Tests

1. **Use descriptive names** - `user_authentication.tst.c` not `test1.tst.c`
2. **One concept per test** - Focus each test on a single behavior
3. **Clear assertions** - Use specific assertions with descriptive messages
4. **Clean up resources** - Remove temporary files and close connections
5. **Independent tests** - Tests should not depend on execution order

### Output Quality

1. **Informative failures** - Show what failed and why
2. **Minimal success output** - Brief confirmation is sufficient
3. **Structured output** - Use consistent formatting
4. **Actionable errors** - Include enough context to fix the issue

### Performance

1. **Fast tests** - Keep individual tests under 1 second when possible
2. **Parallel-safe** - Design tests to run concurrently
3. **Resource cleanup** - Free memory and close handles
4. **Timeout awareness** - Complete within configured timeout (default 30s)

---

## Debugging Tests

### Command-Line Debugging

**Verbose mode:**
```bash
tm --verbose              # Show detailed output
tm --show                 # Display configuration and environment
```

**Debugging specific tests:**
```bash
tm --debug math.tst.c     # Launch debugger (GDB, LLDB, Xcode, VS)
tm --step                 # Run tests one at a time with prompts
tm --keep                 # Keep artifacts for inspection
```

### Debug Environment Variables

Set `TESTME_VERBOSE=1` to enable verbose output within tests:

```c
if (thas("TESTME_VERBOSE")) {
    tinfo("Debug info: value=%d", x);
}
```

```javascript
if (tverbose()) {
    tinfo('Debug info:', value)
}
```

---

## Version Information

This specification applies to TestMe 1.x and later.

For the latest updates, see the project repository and CHANGELOG.
