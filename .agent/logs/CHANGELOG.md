# TestMe Changelog

## 2025-10-16

### Parallel Worker Count Display Fix

-   **FIX**: Fixed parallel worker count display to not exceed number of tests
    -   Issue: Test runner showed "Running 1 test(s) with 4 in parallel" when only 1 test
    -   Root cause: Display always showed configured worker count regardless of test count
    -   Solution: Calculate `actualWorkers = Math.min(workers, testCount)` for display
    -   Display now shows sensible messages:
        -   1 test: "Running 1 test(s) in: directory" (no parallel mention)
        -   2 tests with 4 workers: "Running 2 test(s) with 2 in parallel"
        -   7 tests with 4 workers: "Running 7 test(s) with 4 in parallel"
    -   Files modified: [src/index.ts](../../src/index.ts:455-462)
    -   Improves clarity and prevents confusing output

### Documentation Updates - Jest API and Project Purpose

-   **DOC**: Clarified TestMe's purpose and ideal use cases
    -   Added "Ideal Use Cases" section to [CLAUDE.md](../../CLAUDE.md):
        -   Embedded systems projects
        -   C/C++/Rust projects
        -   Make/CMake-based projects
        -   Core infrastructure
        -   Multi-language projects
    -   Added "When to Use Alternatives" section recommending Jest/Vitest for:
        -   Cloud-native JavaScript/TypeScript projects
        -   Projects needing rich plugin ecosystems
        -   Projects requiring framework integration (React, Vue, Angular)
    -   Updated [README.md](../../README.md) with similar guidance prominently at top
    -   Key message: "TestMe focuses on simplicity and direct execution for system-level projects"

-   **DOC**: Comprehensive Jest/Vitest API documentation updates
    -   **README.md** updates:
        -   Added Jest API to Features section
        -   Enhanced JavaScript Testing section with comprehensive matcher examples
        -   Added all matcher categories with examples:
            -   Equality, Truthiness, Type Checking, Numeric, Strings/Collections
            -   Objects, Errors, Modifiers (.not, .resolves, .rejects)
        -   Added "Choosing Between APIs" guidance
        -   Enhanced TypeScript section with Jest API examples
        -   Demonstrated async/await support with typed functions
    -   **CLAUDE.md** updates:
        -   Enhanced JavaScript/TypeScript Module section
        -   Listed all Jest API capabilities (30+ matchers)
        -   Noted TypeScript type definitions (expect.d.ts)
        -   Mentioned deep equality algorithm
    -   **Man Page (doc/tm.1)** updates:
        -   Split into "Traditional API" and "Jest/Vitest-Compatible API" sections
        -   Added comprehensive matcher list with categories
        -   Included code examples
        -   Reference to doc/JEST_API.md
    -   All documentation now presents Jest API as first-class feature

## 2025-10-15

### Improved Parallel Test Execution

-   **FIX**: Improved parallel test execution to use true worker pool pattern
    -   Tests now start immediately as workers become available
    -   Removed batching behavior where tests waited for entire batch to complete
    -   Long-running tests no longer block short tests from starting
    -   Better CPU/worker utilization with continuous task queue processing
    -   Implementation changed from semaphore-gated `Promise.all()` to worker pool with shared queue
    -   Each worker continuously pulls and processes tests until queue is empty
    -   Files modified: [src/runner.ts](../../src/runner.ts) `runTestsParallel()` method

### Jest/Vitest-Compatible expect() API

-   **DEV**: Added comprehensive Jest/Vitest-compatible `expect()` API for JavaScript/TypeScript tests
    -   Full backward compatibility with existing `t*` functions
    -   Equality matchers: `toBe()`, `toEqual()`, `toStrictEqual()`
    -   Truthiness matchers: `toBeTruthy()`, `toBeFalsy()`, `toBeNull()`, `toBeUndefined()`, `toBeDefined()`, `toBeNaN()`
    -   Type matchers: `toBeInstanceOf()`, `toBeTypeOf()`
    -   Numeric matchers: `toBeGreaterThan()`, `toBeLessThan()`, `toBeCloseTo()`, etc.
    -   String/Collection matchers: `toMatch()`, `toContain()`, `toHaveLength()`
    -   Object matchers: `toHaveProperty()`, `toMatchObject()`
    -   Error matchers: `toThrow()`, `toThrowError()`
    -   Modifiers: `.not`, `.resolves`, `.rejects`
    -   Custom deep equality with proper handling of undefined properties
    -   TypeScript type definitions in [src/modules/js/expect.d.ts](../../src/modules/js/expect.d.ts)
    -   Comprehensive test suite in [test/jest-api/](../../test/jest-api/) (7 test files, all passing)
    -   Documentation: [doc/JEST_API.md](../../doc/JEST_API.md) and updated [README.md](../../README.md)

### Documentation Maintenance

-   **DOC**: Updated `.agent` project documentation structure
    -   Verified DESIGN.md reflects current architecture
    -   Reviewed PLAN.md current status and priorities
    -   Updated CHANGELOG.md with documentation maintenance entry
    -   All documentation synchronized with codebase state as of 2025-10-15

## 2025-10-13

### Environment Variable Exports with TESTME_ Prefix

-   **DEV**: All special variables now automatically exported as environment variables to tests and service scripts
    -   **Variables Exported**:
        -   `TESTME_PLATFORM` - Combined OS-architecture (e.g., `macosx-arm64`, `linux-x64`, `windows-x64`)
        -   `TESTME_PROFILE` - Build profile from `--profile` flag, config, or env var (defaults to `dev`)
        -   `TESTME_OS` - Operating system (`macosx`, `linux`, `windows`)
        -   `TESTME_ARCH` - CPU architecture (`x64`, `arm64`, `ia32`)
        -   `TESTME_CC` - C compiler (`gcc`, `clang`, `msvc`, `unknown`)
        -   `TESTME_TESTDIR` - Relative path from executable to test directory
        -   `TESTME_CONFIGDIR` - Relative path from executable to config directory
        -   `TESTME_VERBOSE` - Set to `1` when `--verbose` flag is used
        -   `TESTME_DEPTH` - Current depth value from `--depth` flag
        -   `TESTME_ITERATIONS` - Iteration count from `--iterations` flag (defaults to `1`)
    -   **Implementation**: Variables exported in both [src/services.ts](../../src/services.ts) (for service scripts) and [src/handlers/base.ts](../../src/handlers/base.ts) (for tests)
    -   **Handler Fixes**: Updated all language handlers (TypeScript, JavaScript, Python, Go, Ejscript) to pass `file` parameter to `getTestEnvironment()`
    -   **Config Preservation**: Fixed [src/runner.ts](../../src/runner.ts) to preserve `workers` and `iterations` CLI options during config merge
    -   **Dual Use**: Variables available both as `${...}` patterns for expansion and as actual environment variables
    -   **Documentation**: Updated [README.md](../../README.md) and [doc/tm.1](../../doc/tm.1) with comprehensive environment variable documentation
    -   **Tests**: Created [test/portable/env-export.tst.ts](../../test/portable/env-export.tst.ts) to verify all exports

### Added --iterations CLI Option

-   **DEV**: New `-i, --iterations <N>` command line option for iteration count
    -   **Purpose**: Exports `TESTME_ITERATIONS` environment variable for tests to use internally
    -   **Important**: TestMe does NOT automatically repeat test execution - this is for tests to implement their own iteration logic
    -   **Default**: Defaults to `1` when not specified
    -   **Implementation**:
        -   Added to [src/types.ts](../../src/types.ts) `CliOptions` and `ExecutionConfig`
        -   CLI parsing in [src/cli.ts](../../src/cli.ts)
        -   Config merging in [src/index.ts](../../src/index.ts) at two merge points
        -   Preserved during config hierarchy in [src/runner.ts](../../src/runner.ts)
    -   **Use Case**: Performance testing, stress testing, or any test requiring multiple runs
    -   **Documentation**: Clear notes in help text, README, and man page that this doesn't auto-repeat execution
    -   **Tests**: Created [test/portable/iterations.tst.ts](../../test/portable/iterations.tst.ts) to verify export
    -   All 18 portable tests pass successfully

### Code Quality Improvements

-   **CHORE**: Fixed all TypeScript compilation errors in C test handler
    -   **Type-only imports**: Split imports to use `import type` for type-only imports while keeping enums as regular imports
        -   Changed: `import {TestFile, TestResult, TestConfig}` to `import type {TestFile, TestResult, TestConfig}`
        -   Kept: `import {TestStatus, TestType}` as regular imports (enums need runtime values)
    -   **Override modifiers**: Added `override` keyword to methods that override base class methods
        -   Added `override` to `prepare()` method in CTestHandler
        -   Added `override` to `cleanup()` method in CTestHandler
    -   **Compiler config type resolution**: Created helper method to resolve platform-specific compiler configuration
        -   Added `resolveCompilerName()` method to handle `string | {windows?: string, macosx?: string, linux?: string}` union type
        -   Applied to all `getDefaultCompilerConfig()` calls throughout the file
    -   **Environment type safety**: Fixed type mismatch when building MSVC environment
        -   Changed from spreading `process.env` (which has `string | undefined` values)
        -   To explicit filtering: only copy defined values to create proper `Record<string, string>`
    -   **Removed unused code**: Cleaned up unused variables and dead code
        -   Removed unused `configPath` variable in Xcode debugger setup
        -   Removed unused `testBaseName` variables in VS Code debugger methods
        -   Removed unused `file` parameter from `enhanceCompilationError()` method
        -   Removed entire unused `launchWindowsDebugger()` method (dead code)
    -   **Impact**: Build now completes with zero TypeScript errors, improved type safety
    -   Files modified: [src/handlers/c.ts](../../src/handlers/c.ts)
    -   All tests pass successfully after changes

## 2025-10-12

### Added --no-services Command Line Option

-   **FEATURE**: New `--no-services` command line option to skip all service commands
    -   **Use Case**: Allows running tests without executing skip, prep, setup, or cleanup scripts
    -   **Benefits**:
        -   Enable manual control of services for debugging
        -   Run services externally in a separate terminal
        -   Faster test iteration when services are already running
        -   Useful for development workflows where services persist
    -   **Implementation**:
        -   Added `noServices` boolean to `CliOptions` type
        -   CLI parser recognizes `--no-services` flag
        -   Service calls in test runner check `!options.noServices` before execution
        -   All service types affected: skip, prep, setup, cleanup
    -   **Documentation**: Updated help text, man page, and README
    -   **Example**: `tm --no-services` runs tests without any service lifecycle
    -   Files modified: [src/types.ts](../../src/types.ts), [src/cli.ts](../../src/cli.ts), [src/index.ts](../../src/index.ts)
    -   Tests: All 28 tests pass, verified with `test/portable/delay_test`

### Fixed JavaScript Service Execution in Compiled Binary

-   **FIX**: Setup services using JavaScript files now execute correctly when running from compiled binary
    -   **Issue**: Setup services specified as `.js` files would exit immediately with code 0 instead of running
    -   **Root Cause**: When running from compiled binary, `process.execPath` returns path to the `tm` binary instead of `bun`
        -   The service manager was using `process.execPath` to execute JavaScript files
        -   This resulted in trying to execute `.js` files with the `tm` binary, which failed silently
    -   **Example Problem**:
        -   Running: `./dist/tm test/portable/delay_test`
        -   Setup: `./mock_service.js` (background service using `setInterval`)
        -   Incorrect execution: `/Users/mob/c/testme/dist/tm /path/to/mock_service.js`
        -   Result: Service exits immediately instead of running in background
    -   **Solution**: Detect when running from compiled binary and explicitly use `bun` command
        -   Check if `process.execPath` contains `/tm`, `\tm.exe`, or `\tm`
        -   If compiled: use `'bun'` as executable
        -   If not compiled: use `process.execPath` (normal Bun runtime)
    -   **Impact**: Background services (setup scripts) now work correctly in both development and production
    -   Files modified: [src/services.ts](../../src/services.ts) `parseCommand()` method
    -   Tests: All tests pass including `test/portable/delay_test` which uses JavaScript setup service

## 2025-10-10

### Fixed PATH Environment Variable Resolution on Windows

-   **FIX**: Corrected environment variable path resolution for Windows
    -   **Issue**: When using `${CONFIGDIR}` in PATH environment variables, relative paths were incorrectly resolved
    -   **Root Cause**: `${CONFIGDIR}` expands to a relative path from executable to config directory (e.g., `../..`), which when combined with `../build/...` resulted in incorrect path calculations
    -   **Example Problem**:
        -   Config at: `C:\Users\mob\json\test\testme.json5`
        -   PATH setting: `${CONFIGDIR}/../build/${PLATFORM}-${PROFILE}/bin`
        -   Incorrect result: `C:\Users\build\windows-x64-dev\bin` (missing `mob\json`)
        -   Correct result: `C:\Users\mob\json\build\windows-x64-dev\bin`
    -   **Solution**: Remove `${CONFIGDIR}` prefix from environment PATH variables
        -   Environment variables are already resolved relative to config directory
        -   `${CONFIGDIR}` is intended for runtime paths (rpath) in compiled executables, not environment variables
        -   Correct usage: `PATH: '../build/${PLATFORM}-${PROFILE}/bin;...'`
    -   **Documentation**: Updated to clarify proper usage of `${CONFIGDIR}` vs relative paths
    -   Related: [src/handlers/base.ts](../../src/handlers/base.ts), [src/utils/glob-expansion.ts](../../src/utils/glob-expansion.ts)

### Fixed Visual Studio Debugger Environment and Working Directory

-   **FIX**: Visual Studio debugger now uses correct environment variables and working directory
    -   **Environment Issue**: VS debugger was not receiving processed environment from testme.json5
        -   Missing expanded `${PLATFORM}`, `${PROFILE}`, and other variables
        -   Missing resolved relative paths from config
    -   **Working Directory Issue**: Confirmed working directory was already correct (test file directory, not artifact directory)
    -   **Solution**:
        -   Call `await this.getTestEnvironment(config, file, compilerName)` to get fully processed environment
        -   Pass environment to spawn via `env: { ...process.env, ...testEnv }`
        -   Added debug output showing working directory: `📂 Working Directory: ${file.directory}`
    -   **Consistency**: Now matches behavior of other debuggers (LLDB, GDB, VS Code)
    -   Files modified: [src/handlers/c.ts](../../src/handlers/c.ts) `launchVisualStudioDebugger()` method
    -   Impact: Windows users can now debug tests with proper PATH to find DLLs and correct working directory

### Enhanced Test Macro System

-   **DEV**: Comprehensive improvements to C and JavaScript test macros for better type safety and error reporting
    -   **Type-Specific Equality Macros**: Replaced generic `teq`/`tneq` with type-specific variants
        -   `teqi`, `tneqi` - int equality/inequality with %d formatting
        -   `teql`, `tneql` - long equality/inequality with %ld formatting
        -   `teqll`, `tneqll` - long long equality/inequality with %lld formatting
        -   `teqz`, `tneqz` - size_t/ssize equality/inequality with %zd formatting
        -   `tequ`, `tnequ` - unsigned int equality/inequality with %u formatting
        -   `teqp`, `tneqp` - pointer equality/inequality with %p formatting
    -   **Comparison Macros**: Added greater/less than comparisons for numeric types
        -   Greater than: `tgti`, `tgtl`, `tgtz` (int, long, size)
        -   Greater or equal: `tgtei`, `tgtel`, `tgtez` (int, long, size)
        -   Less than: `tlti`, `tltl`, `tltz` (int, long, size)
        -   Less or equal: `tltei`, `tltel`, `tltez` (int, long, size)
    -   **NULL Checking Macros**: Dedicated pointer NULL checks
        -   `tnull(ptr, msg)` - assert pointer is NULL
        -   `tnotnull(ptr, msg)` - assert pointer is not NULL
    -   **Internal Improvements**: Cleaner implementation with consistent naming
        -   Renamed `treport` → `tReport` for consistency
        -   Renamed `treportx` → `tReportString` for clarity
        -   Added type-specific helpers: `tReportInt`, `tReportLong`, `tReportLongLong`, `tReportSize`, `tReportUnsigned`, `tReportPtr`
    -   **Backward Compatibility**: Legacy macros maintained as aliases
        -   `teq` now aliases to `teqi` (marked deprecated)
        -   `tneq` now aliases to `tneqi` (marked deprecated)
    -   **JavaScript Parity**: Applied same improvements to JavaScript/TypeScript test module
        -   Added all type-specific macros to [src/modules/js/index.js](../../src/modules/js/index.js)
        -   Uses strict equality (`===`) for type safety
        -   `teqll` uses BigInt for proper long long handling
    -   **Documentation**: Comprehensive JSDoc comments on all macros with examples
        -   Every macro documented with parameter descriptions
        -   Usage examples for each assertion type
        -   Clear warnings about type requirements (e.g., teqi only for integers)
    -   **Testing**: Created comprehensive test demonstrating all new macros
        -   [test/portable/new-macros.tst.c](../../test/portable/new-macros.tst.c) - 60+ assertions testing all new functionality
        -   All 28 existing tests continue to pass
    -   Files modified: [src/modules/c/testme.h](../../src/modules/c/testme.h), [src/modules/js/index.js](../../src/modules/js/index.js)
    -   Created design document: [.agent/designs/MACRO_IMPROVEMENTS.md](../designs/MACRO_IMPROVEMENTS.md)

### Benefits of New Macro System

-   **Better Error Messages**: Type-specific formatting shows values in appropriate format (decimal for int, hex for pointers, etc.)
-   **Type Safety**: Eliminates issues with wrong printf format specifiers causing undefined behavior
-   **Clearer Intent**: Macro names indicate expected types (teqi = int, teql = long, teqp = pointer)
-   **More Comprehensive**: Covers common test scenarios that previously required verbose code
-   **Backward Compatible**: Existing code using `teq`/`tneq` continues to work via aliases

## 2025-10-08

### Windows PATH Handling and Environment Variable Type Safety

-   **FIX**: Sanitize corrupted PATH entries on Windows
    -   Fixed issue where double backslashes in `process.env.PATH` (e.g., `C:\\ghcup\bin`) break PATH resolution
    -   GitHub Actions Windows runners have corrupted PATH entries that prevent executables from being found
    -   When expanding `${PATH}`, automatically fix double backslashes: `C:\\dir` → `C:\dir` ([src/utils/glob-expansion.ts](../../src/utils/glob-expansion.ts:226-229))
    -   Preserves UNC paths (network paths starting with `\\`) which legitimately use double backslashes
    -   Fixes cleanup script failures when custom PATH is prepended to system PATH
-   **FIX**: Fixed PATH handling on Windows to be robust against corrupted environment variables
    -   Modified `runCommand()` to explicitly copy environment variables instead of spreading ([src/handlers/base.ts](../../src/handlers/base.ts:65-88))
    -   On Windows, when custom PATH is defined in config, removes all case variants (Path, path) to ensure only uppercase PATH is used
    -   Prevents corrupted `process.env.PATH` from interfering with test execution
    -   Allows configs like `PATH: '${PATH};./bin'` to correctly append to existing PATH
    -   When no custom PATH defined, uses `process.env.PATH` so executables can be found
-   **FIX**: Added type guards to prevent non-string values from being passed to GlobExpansion functions
    -   Fixed TypeError: `input.includes is not a function` when platform-specific env config present
    -   Added type checks in `getTestEnvironment()` ([src/handlers/base.ts](../../src/handlers/base.ts:220))
    -   Added type checks in `getServiceEnvironment()` with platform-specific handling ([src/services.ts](../../src/services.ts:575,588))
    -   Added type checks in artifact generation ([src/artifacts.ts](../../src/artifacts.ts:318,329))
    -   Added defensive type guards in `expandSingle()` and `expandString()` with detailed error messages ([src/utils/glob-expansion.ts](../../src/utils/glob-expansion.ts:97,32))
    -   All locations now skip platform-specific keys (windows/macosx/linux) and non-string values
-   **DEV**: Normalized PATH variable name handling on Windows
    -   All PATH variants (PATH, Path, path) normalized to uppercase PATH on Windows ([src/handlers/base.ts](../../src/handlers/base.ts:206-209, 227-234))
    -   Ensures consistent PATH handling across different Windows environments
    -   PATH separator conversion (`:` to `;`) applied automatically after normalization

## 2025-10-08 (Earlier)

### Configuration Inheritance System

-   **DEV**: Added hierarchical configuration inheritance
    -   Child configs can now inherit settings from parent directory's testme.json5
    -   `inherit: true` - inherit all keys from parent (compiler, debug, execution, output, patterns, services, env, profile)
    -   `inherit: ['env', 'compiler']` - selective inheritance of specified keys only
    -   `inherit: false` or omitted - no inheritance (default behavior)
    -   Recursive inheritance - parent configs can also inherit from their parents
    -   Deep merge for objects (env variables, compiler settings) - child and parent values combined
    -   Array concatenation for lists (flags, libraries) - parent items first, then child items
    -   Primitives from child always override parent values
    -   Added `inherit` field to TestConfig type ([src/types.ts](../../src/types.ts:34))
    -   Implemented in ConfigManager ([src/config.ts](../../src/config.ts:132-305)):
        -   `loadParentConfig()` - recursively loads parent configurations
        -   `mergeInheritedConfig()` - merges child with parent based on inherit settings
        -   `deepMerge()` - deep merges objects and concatenates arrays
    -   Example: parent has `flags: ['-O2']`, child has `inherit: ['compiler']` and `flags: ['-g']`, result has both `-O2` and `-g`
    -   Updated documentation in [doc/testme.json5](../../doc/testme.json5:26-41)
    -   Added comprehensive unit test ([test/config/inherit/child/test-inherit.tst.ts](../../test/config/inherit/child/test-inherit.tst.ts))

### Environment Variable Expansion

-   **DEV**: Added environment variable fallback in ${...} expansion
    -   Any `${VAR}` pattern now checks `process.env.VAR` if not a special variable or glob
    -   Supports common environment variables: `${PATH}`, `${HOME}`, `${USER}`, etc.
    -   Priority order: Special variables (${TESTDIR}, ${OS}) → Environment variables (${PATH}) → Glob patterns
    -   Added `substituteEnvironmentVariables()` method ([src/utils/glob-expansion.ts](../../src/utils/glob-expansion.ts:206-220))
    -   Updated expansion order in `expandString()` ([src/utils/glob-expansion.ts](../../src/utils/glob-expansion.ts:36-41))
    -   Example: `env: { PATH: 'mydir:${PATH}' }` expands ${PATH} to current PATH value
    -   Added unit test ([test/portable/env-path.tst.ts](../../test/portable/env-path.tst.ts))

### Automatic PATH Separator Conversion for Windows

-   **DEV**: Added automatic path separator conversion for Windows
    -   Unix-style `:` separators automatically converted to `;` on Windows for PATH variable
    -   Only affects PATH environment variable on Windows platform
    -   Preserves drive letters (e.g., `C:\`, `D:\`) during conversion
    -   Added `convertPathSeparators()` method ([src/handlers/base.ts](../../src/handlers/base.ts:221-225))
    -   Applied in `getTestEnvironment()` when setting PATH ([src/handlers/base.ts](../../src/handlers/base.ts:190-192, 205-207))
    -   Enables cross-platform configuration: write `PATH: 'bin:${PATH}'` once, works on all platforms
    -   Updated documentation ([doc/testme.json5](../../doc/testme.json5:207-210))

### Environment Variable Tracing with --show

-   **DEV**: Enhanced --show flag to display environment variables
    -   `--show` now displays TestMe-defined environment variables before compilation
    -   `--show --verbose` displays full environment (all system variables)
    -   Shows during C test compilation for debugging configuration issues
    -   Added to C handler ([src/handlers/c.ts](../../src/handlers/c.ts:278-295))
    -   Output format:
        ```
        🌍 TestMe environment variables:
           BIN=/path/to/bin
           TEST_VAR=value

        🌍 Full environment (96 variables):  # with --verbose
           PATH=/usr/bin:/bin
           ...
        ```

### Debugger Environment Support

-   **DEV**: Added environment variable support to all debuggers
    -   **Xcode**: Environment variables included in generated project scheme with platform-specific merging
        -   Updated Xcode project generation ([src/artifacts.ts](../../src/artifacts.ts:300-343))
        -   Properly merges base and platform-specific env vars for macOS
    -   **VS Code**: Environment variables added to launch.json configuration
        -   Updated VS Code debug config ([src/handlers/c.ts](../../src/handlers/c.ts:1022-1024))
        -   Uses `getTestEnvironment()` to get fully-expanded variables
    -   **GDB/LLDB**: Already supported via runCommand() env parameter (verified)
    -   **Go debuggers**: Already supported for Delve and VS Code (verified)
    -   **Visual Studio**: Launched via GUI, environment must be set in project properties
    -   All debuggers now receive TestMe environment variables automatically during debug sessions

### Bug Fixes

-   **FIX**: Fixed Go test timeout on Windows
    -   Added `stdin: "ignore"` to `Bun.spawn()` to prevent commands hanging while waiting for stdin
    -   Go tests no longer timeout at 30 seconds on Windows CI
    -   Updated base handler ([src/handlers/base.ts](../../src/handlers/base.ts:70))

-   **FIX**: Enhanced error reporting for silent test failures
    -   Tests that fail with no output now show diagnostic help message
    -   Helpful hints for silent crashes, access violations, missing DLLs on Windows
    -   Added to reporter ([src/reporter.ts](../../src/reporter.ts:161-171))
    -   Message includes common causes and troubleshooting steps

### Documentation Updates

-   **DOC**: Updated testme.json5 documentation with inheritance examples
-   **DOC**: Documented environment variable expansion and PATH conversion
-   **DOC**: Updated all debugger sections to mention environment variable support
-   **DOC**: Added cross-platform PATH configuration examples

### Test Coverage

-   **TEST**: Added environment variable expansion test ([test/portable/env-path.tst.ts](../../test/portable/env-path.tst.ts))
-   **TEST**: Added configuration inheritance test ([test/config/inherit/child/test-inherit.tst.ts](../../test/config/inherit/child/test-inherit.tst.ts))
-   All tests passing: 27/27 (including 2 new tests)

## 2025-10-08 (earlier)

### Platform-Specific Environment Variables

-   **DEV**: Added platform-specific environment variable support
    -   Environment variables now support `windows`, `macosx`, and `linux` subsections
    -   Platform-specific variables are merged with base variables (additive)
    -   Platform values override base values for matching keys
    -   Example: `env: { TEST_MODE: 'dev', windows: { PATH: '...' }, linux: { LD_LIBRARY_PATH: '...' } }`
    -   Updated TypeScript types ([src/types.ts](../../src/types.ts:169-180))
    -   Modified `getTestEnvironment()` in BaseTestHandler ([src/handlers/base.ts](../../src/handlers/base.ts:154-205))
    -   Updated documentation: [README.md](../../README.md), [doc/testme.json5](../../doc/testme.json5:197-226), [doc/tm.1](../../doc/tm.1)
    -   Allows platform-specific library paths (PATH, LD_LIBRARY_PATH, DYLD_LIBRARY_PATH)
    -   All tests pass with new functionality

### MSVC Compiler Fixes

-   **FIX**: Fixed `/LIBPATH:` relative path resolution for MSVC
    -   Added support for resolving relative paths in `/LIBPATH:` flags
    -   `/LIBPATH:../build/...` now correctly resolves to absolute paths based on config directory
    -   Updated `resolveRelativePaths()` method ([src/handlers/c.ts](../../src/handlers/c.ts:1077-1086))
    -   Ensures library paths are correctly resolved during Windows builds

-   **FIX**: Fixed MSVC linker flag ordering
    -   Separated compiler flags from linker flags to ensure proper MSVC command structure
    -   `/LIBPATH:`, `.lib`, and `.obj` files now correctly placed after `/link` separator
    -   Command structure: `cl.exe [compiler flags] /Fe:output.exe input.c /link [linker flags] [libraries]`
    -   Updated compilation logic ([src/handlers/c.ts](../../src/handlers/c.ts:227-261))
    -   Prevents linker errors from flags appearing in wrong order

-   **FIX**: Fixed MSVC library name handling - removed incorrect "lib" prefix stripping
    -   Library name `libr` now correctly becomes `libr.lib` instead of `r.lib`
    -   MSVC library files keep their exact names without prefix manipulation
    -   GCC/Clang still correctly strips "lib" prefix (`libr` → `-lr`)
    -   Updated `processLibraries()` method ([src/platform/compiler.ts](../../src/platform/compiler.ts:496-505))
    -   Fixes linker errors when libraries have "lib" prefix on Windows

### Installation Improvements

-   **FIX**: Improved installation error messages
    -   Enhanced error reporting in `bin/install.mjs` to show actual error details
    -   Added stderr capture and display for `bun link` failures
    -   Added error code display for filesystem operations
    -   Changed `stdio: 'ignore'` to `stdio: 'pipe'` for better error visibility
    -   Helps users diagnose installation failures more easily

-   **FIX**: Fixed postinstall error handling to only fail on actual errors
    -   Updated `bin/postinstall.mjs` to check exit code instead of catching all exceptions
    -   Only fails installation if exit code is non-zero
    -   Prevents false failures from stderr output that doesn't indicate actual errors
    -   Improves installation reliability

-   **FIX**: Removed circular dependency causing Bun installation loop
    -   Removed `trustedDependencies` from `package.json` that referenced the package itself
    -   Fixes "Package has a dependency loop" error during `bun install -g`
    -   Installation now works correctly with both npm and Bun

### CLI Enhancements

-   **DEV**: Added `--continue` flag for CI/CD environments
    -   Tests continue running even if some fail
    -   Always exits with status code 0 when `--continue` is used
    -   Useful for collecting all test results in CI pipelines
    -   Test failures are still reported in output, only exit code changes
    -   Added to CliOptions type ([src/types.ts](../../src/types.ts:204))
    -   Added CLI parsing ([src/cli.ts](../../src/cli.ts:165-168))
    -   Modified exit logic ([src/index.ts](../../src/index.ts:484))
    -   Updated help text and man page
    -   Tested and verified working correctly

### Documentation Updates

-   **DOC**: Updated README.md with platform-specific environment variable examples
-   **DOC**: Updated doc/testme.json5 with comprehensive env platform sections
-   **DOC**: Updated man page (doc/tm.1) with env platform documentation and `--continue` flag
-   **DOC**: Updated all documentation to reflect MSVC linker fixes

## 2025-10-07

### Bug Fixes

-   **FIX**: Fixed rpath using macOS-specific `@executable_path` on Linux
    -   Issue: GitHub CI/CD on Linux failed with "error while loading shared libraries: libr.so: cannot open shared object file"
    -   Root cause: rpath flags used macOS token `@executable_path` which Linux doesn't recognize
    -   Solution: Added `CompilerManager.normalizePlatformRpaths()` to automatically convert rpath tokens
    -   Linux: converts `@executable_path` → `$ORIGIN` and `@loader_path` → `$ORIGIN`
    -   macOS: converts `$ORIGIN` → `@executable_path`
    -   Windows: rpath not applicable (uses DLL search paths)
    -   Files modified: [src/platform/compiler.ts](../../src/platform/compiler.ts:238-255), [src/handlers/c.ts](../../src/handlers/c.ts:208-209)
    -   Updated documentation in [doc/testme.json5](../../doc/testme.json5) with rpath platform notes
    -   Tests can now use either `@executable_path` or `$ORIGIN` in config, and TestMe converts to correct platform format

-   **FIX**: Fixed `env` section not displayed in config output when using `showCommands`
    -   Issue: When using `execution.showCommands: true`, the environment variables from `env` section were not shown in config dump
    -   Root cause: `formatConfig()` method in C handler didn't include `env` property in display config
    -   Solution: Added `env: config.env` to the display config object
    -   Files modified: [src/handlers/c.ts](../../src/handlers/c.ts:615)
    -   Environment variables are now visible in debug output for easier troubleshooting
    -   Note: `env` variables were always being applied correctly via `getTestEnvironment()` in base handler

-   **FIX**: Removed unnecessary wrapper scripts that caused Windows installation failures
    -   Issue: Windows installation failed with "not a valid application for this OS platform" when running `tm.exe`
    -   Root cause: Wrapper scripts (`.bat` on Windows, shell script on Unix) were unnecessary complexity
    -   Discovery: Testing revealed `process.cwd()` already returns correct invocation directory in Bun compiled binaries
    -   Solution: Removed wrapper script logic entirely - install binary directly
    -   Files modified: [testme.ts](../../testme.ts:5-12), [bin/install.mjs](../../bin/install.mjs:60-88)
    -   Benefits: Simpler installation, fixes Windows issues, reduces complexity
    -   Note: Previous CHANGELOG entry about wrapper scripts is now superseded by this fix

-   **FIX**: Fixed Bun compiled binary working directory issue
    -   Issue: `tm --list` from `/Users/mob/c/r/test` showed "No tests discovered"
    -   Root cause: Bun compiled binaries change working directory to embedded source location
    -   Solution: Created shell wrapper script that captures invocation directory
    -   Binary now installed as `tm-bin`, wrapper script as `tm`
    -   Wrapper sets `TM_INVOCATION_DIR` environment variable with `$(pwd)`
    -   Binary restores working directory on startup using `TM_INVOCATION_DIR`
    -   Files modified: [testme.ts](../../testme.ts), [bin/install.mjs](../../bin/install.mjs)
    -   Tests now correctly discovered from any working directory

-   **FIX**: Fixed `profile` property from testme.json5 not being used for `${PROFILE}` expansion
    -   Issue: `${PROFILE}` always defaulted to 'dev' even when `profile: 'xdev'` set in config
    -   Root cause: `profile` property not preserved during config merging in `ConfigManager.mergeWithDefaults()`
    -   Solution: Added `profile: userConfig.profile` to merged config object
    -   Also added `depth: userConfig.depth` for consistency
    -   Profile priority: CLI `--profile` > config `profile` > env `PROFILE` > default 'dev'
    -   Files modified: [src/config.ts](../../src/config.ts:192)
    -   Variable expansion now correctly uses config-specified profile

-   **FIX**: Fixed format-truncation warning in testme.h
    -   Issue: `warning: '%s' directive output may be truncated writing up to 4095 bytes`
    -   Root cause: `snprintf(buf, sizeof(buf), "...", loc, buf)` used buf as source and destination
    -   Solution: Added temporary buffer `tmp` to hold formatted message before concatenation
    -   Changed flow: vsnprintf → tmp → snprintf(buf using tmp) instead of vsnprintf → buf → snprintf(buf using buf)
    -   Files modified: [src/modules/c/testme.h](../../src/modules/c/testme.h:127)
    -   Compiler warning eliminated, tests pass successfully

### Configuration and Compiler Fixes

-   **FIX**: Fixed default PROFILE variable from 'debug' to 'dev'
    -   Changed default profile in glob expansion from 'debug' to 'dev'
    -   Updated documentation (types.ts, man page) to reflect new default
    -   Priority order remains: --profile CLI > env.PROFILE > 'dev' (default)

-   **FIX**: Fixed Homebrew paths being added on non-macOS platforms
    -   Issue: `/opt/homebrew/include` and `/opt/homebrew/lib` flags added on Linux
    -   Root cause: GCC/Clang default flags included macOS-specific Homebrew paths unconditionally
    -   Solution: Made Homebrew paths conditional using `PlatformDetector.isMacOS()`
    -   Linux now correctly gets only `~/.local/include` and `~/.local/lib` without Homebrew paths
    -   macOS gets both `~/.local` and `/opt/homebrew` paths

-   **FIX**: Fixed compiler flag blending when using compiler-specific config
    -   Issue: Generic `compiler.c.flags` were ignored when `compiler.c.gcc` config existed
    -   Root cause: Compiler-specific config replaced generic flags instead of merging
    -   Solution: Always start with generic flags, then add compiler-specific on top
    -   Flag hierarchy now: defaults → generic → compiler-specific → platform-specific
    -   Example: `c.flags` + `c.gcc.flags` + `c.gcc.linux.flags` all properly merged

-   **FIX**: Fixed misleading "testme.h not found" error for linker failures
    -   Issue: Error reported "testme.h not found" when linker failed with missing libraries
    -   Root cause: Pattern matching found "testme.h" in warnings and "not found" in linker errors
    -   Solution: Changed to regex patterns requiring both terms on same line
    -   Now correctly distinguishes header errors from linker errors

-   **FIX**: Fixed misleading include syntax guidance in error messages
    -   Removed incorrect claim that `#include "testme.h"` is wrong
    -   Both `<testme.h>` and `"testme.h"` work with system include paths
    -   Updated error messages to focus on actual solutions (install paths, -I flags)

### Documentation Updates

-   **DOC**: Added comprehensive sample configuration file [doc/testme.json5](../../doc/testme.json5)
    -   Documents all TestConfig properties with examples
    -   Shows enable: true/false/'manual' options
    -   Demonstrates profile configuration and priority
    -   Includes all execution and output options
    -   Referenced in DESIGN.md and REFERENCES.md

## 2025-10-07 (earlier)

### NPM Package Fixes

-   **FIX**: Fixed NPM package missing `testme.h` header file
    -   Issue: `[testme install] ERROR: Could not install testme.h header: Source file not found`
    -   Root cause: `package.json` files array listed incorrect path `test/testme.h` instead of `src/modules/c/testme.h`
    -   Solution: Updated files array to include correct path `src/modules/c/testme.h`
    -   Removed incorrect `test/testme.h` entry that was never a valid path
    -   Package now includes both C header (`testme.h`) and Ejscript module (`testme.mod`) for installation

### Windows CI Fixes

-   **FIX**: Fixed MSVC PDB file conflicts when compiling C tests in parallel on Windows
    -   Issue: `fatal error C1041: cannot open program database 'vc140.pdb'` in GitHub Actions CI
    -   Root cause: Multiple parallel compilations writing to same default PDB file even with `/FS` flag
    -   Solution: Added `/Fd:path` flag to specify unique PDB file for each test in its artifact directory
    -   PDB path: `<artifactDir>/<testname>.pdb` (e.g., `test/portable/.testme/header/header.pdb`)
    -   Each test now has isolated PDB file, eliminating parallel build conflicts
    -   `/FS` flag still present for additional safety but `/Fd` provides the actual isolation

-   **FIX**: Fixed Python test Unicode encoding error on Windows
    -   Issue: `UnicodeEncodeError: 'charmap' codec can't encode character '\u2713'` (checkmark symbols)
    -   Root cause: Windows Python defaults to CP1252 encoding which doesn't support Unicode checkmarks
    -   Solution: Force UTF-8 encoding for stdout/stderr on Windows platform in Python test
    -   Test now works correctly on Windows with Unicode symbols in output

-   **FIX**: Fixed Go test timeout on Windows (30s timeout)
    -   Issue: Go test hanging/timing out on Windows CI
    -   Root cause: Go `fmt.Printf` may block on Windows when outputting Unicode checkmarks to non-UTF-8 console
    -   Solution: Replaced Unicode symbols (✓ ✗) with ASCII text (PASS/FAIL) in Go test output
    -   Test now completes successfully on all platforms without Unicode-related blocking

### Platform-Specific Pattern Filtering

-   **FIX**: Fixed platform-specific test discovery to properly filter Windows-only tests on macOS/Linux
    -   Issue: `tm --list test` on macOS was showing `.tst.ps1` and `.tst.bat` files that should only appear on Windows
    -   Root cause: Configuration merging didn't apply platform filtering when no user config existed
    -   Root cause: CLI patterns bypassed platform-specific extension filtering
    -   Fixed `ConfigManager.mergeWithDefaults()` to apply platform filtering even with null user config
    -   Fixed `ConfigManager.mergePlatformPatterns()` to always filter by current platform
    -   Fixed `TestDiscovery.filterByPatterns()` to use AND logic: directory patterns AND extension patterns
    -   Modified discovery to combine CLI patterns with platform-specific extension patterns
    -   Now correctly shows only platform-appropriate test files (e.g., `.tst.sh` on macOS, `.tst.ps1` on Windows)
    -   Cross-platform tests (`.tst.c`, `.tst.js`, `.tst.ts`) appear on all platforms regardless of directory location
    -   Platform-specific tests are filtered by file extension during discovery, not by directory name

-   **DOC**: Documented "Discovery vs Skip Scripts" architectural pattern in DESIGN.md
    -   Discovery phase filters by file extension compatibility (capability)
    -   Execution phase uses skip scripts for runtime policy decisions
    -   Example: `test/windows/wmath.tst.c` appears in discovery on macOS (C is cross-platform) but skip script prevents execution
    -   Clear separation of concerns: extension patterns = "can run", skip scripts = "should run"

### Cross-Platform Test Compatibility

-   **DEV**: Converted shell-based tests to cross-platform JavaScript
    -   Converted `test/config/manual_test/another.tst.sh` → `another.tst.js`
    -   Converted `test/config/manual_test/manual.tst.sh` → `manual.tst.js`
    -   Converted `test/ejscript/skip.sh` → `skip.js` with platform-aware command detection
        -   Uses `which` on Unix and `where` on Windows to check for ejsc compiler
    -   Updated `test/config/manual-filtering.tst.ts` to reference `.tst.js` files
    -   Updated `test/ejscript/testme.json5` to use `skip.js`
    -   Ensures all CI-critical tests run on Windows, macOS, and Linux

### CI/CD Pipeline Enhancements

-   **DEV**: Enhanced GitHub Actions CI workflow for multi-language testing
    -   Added Python setup via `actions/setup-python@v5` with Python 3.x
    -   Added Go setup via `actions/setup-go@v5` with stable Go version
    -   Added verification steps to confirm Python and Go installation
    -   Ensures Python (`.tst.py`) and Go (`.tst.go`) tests can execute in CI
    -   Maintains existing C compiler, Bun runtime, and build verification

-   **DEV**: Disabled automatic tag-based releases in `release.yml`
    -   Commented out `push.tags` trigger to prevent automatic releases on tag creation
    -   Release workflow now only runs via manual `workflow_dispatch`
    -   Prevents accidental duplicate builds and allows controlled release process
    -   Maintains ability to create tags for version tracking without triggering release

### CI/CD Pipeline

-   **DEV**: Added GitHub Actions workflows for continuous integration and deployment
    -   Created `.github/workflows/ci.yml` for automated testing on push and pull requests
        -   Multi-platform testing on Ubuntu, macOS, and Windows
        -   Automatic C compiler installation (GCC, Clang, MSVC)
        -   Python and Go runtime installation for multi-language tests
        -   Build verification and test execution
        -   Test artifact upload on failure for debugging
        -   Lint and format checking
        -   Package building on main branch commits
    -   Created `.github/workflows/release.yml` for manual releases only
        -   Manual workflow dispatch support with version input
        -   Automatic GitHub release creation with release notes
        -   Automated NPM package publishing
        -   Tag-based triggers disabled (use manual dispatch only)
    -   All workflows use latest Bun runtime and actions versions
    -   Fail-fast disabled to see results on all platforms

### Manual Test Mode

-   **DEV**: Added `enable: 'manual'` configuration option for tests that should only run when explicitly named
    -   Tests with `enable: 'manual'` are excluded from directory-level and wildcard pattern matching
    -   Manual tests run when named by full path (e.g., `tm test/slow.tst.c`), base name (e.g., `tm slow`), or filename (e.g., `tm slow.tst.c`)
    -   Useful for slow tests, destructive tests, or tests requiring special setup that should not run automatically
    -   Updated `TestConfig.enable` type to accept `boolean | 'manual'` instead of just `boolean`
    -   Enhanced test filtering logic in `executeHierarchically()` to support manual test exclusion
    -   Improved pattern matching to distinguish explicit test names from wildcards
    -   Added `isExplicitPattern()`, `testMatchesExplicitPattern()`, and `getTestBaseName()` helper methods
    -   See documentation in man page (doc/tm.1) and configuration templates

### Testing

-   **TEST**: Added comprehensive test suite for manual test filtering
    -   Created `test/config/manual-filtering.tst.ts` with 5 test scenarios
    -   Created test fixtures in `test/config/manual_test/`
    -   Tests verify that manual tests are excluded from wildcards but run when explicitly named
    -   All 24 tests passing

### Documentation

-   **DOC**: Updated man page with detailed explanation of `enable: 'manual'` option
-   **DOC**: Updated `--init` template with comments explaining all three `enable` values (true, false, 'manual')
-   **DOC**: Updated PLAN.md to mark CI/CD integration as completed

## 2025-10-06

### Installation Changes

-   **DEV**: Changed installation path from `/usr/local` to `~/.local` for user-local installations
    -   Binary now installs to `~/.bun/bin/tm` instead of `/usr/local/bin/tm`
    -   Header installs to `~/.local/include/testme.h` instead of `/usr/local/include/testme.h`
    -   Man page installs to `~/.local/share/man/man1/tm.1` instead of `/usr/local/share/man/man1/tm.1`
    -   Ejscript module installs to `~/.local/lib/testme/testme.mod` instead of `/usr/local/lib/testme/testme.mod`
    -   JavaScript testme module is now linked via `bun link` during installation
    -   Tests can now import testme utilities via `import { teq, ttrue } from 'testme'`
    -   **Auto-linking**: JavaScript and TypeScript handlers automatically run `bun link testme` if not already linked
    -   Auto-linking searches up from test directory to find the closest `testme.json5` file
    -   Link is created in the directory containing `testme.json5`, not above it
    -   Only creates link if it doesn't exist or isn't already a symlink
    -   No longer requires sudo for installation
    -   Follows XDG Base Directory specification

### Compiler Configuration

-   **DEV**: Added per-platform compiler settings support
    -   Compiler-specific settings (gcc, clang, msvc) now support platform-specific overrides
    -   Platform subdirectories: `windows`, `macosx`, `linux`
    -   Platform settings are merged with base compiler settings (additive)
    -   Example: `clang: { flags: ['-O0'], macosx: { flags: ['-framework', 'IOKit'] } }`
    -   Allows platform-specific flags and libraries without duplicating common settings

-   **FIX**: Default compiler flags now use expanded home directory paths
    -   Changed from `-I~/.local/include` to `-I/Users/username/.local/include` (expanded at runtime)
    -   Changed from `-L~/.local/lib` to `-L/Users/username/.local/lib` (expanded at runtime)
    -   Added `os.homedir()` expansion in compiler.ts getDefaultFlags()

### Path Expansion

-   **DEV**: Added tilde (`~`) expansion support in Ejscript handler
    -   `compiler.es.require` configuration now supports `~/.local/lib/testme/testme.mod`
    -   Paths are expanded to full home directory at runtime
    -   Also supports `${~/...}` pattern from glob expansion

### Version Management

-   **DEV**: Automatic version synchronization from package.json
    -   Created `src/version.ts` that exports VERSION constant
    -   Added `bin/update-version.mjs` script to sync version from package.json
    -   Makefile now runs version update before build
    -   `tm --version` now displays correct version from package.json
    -   Added `prebuild` npm script to auto-update version

### Package Management

-   **FIX**: Added `trustedDependencies` to package.json for Bun
    -   Bun now automatically runs postinstall script without `--trust` flag
    -   Installation with `bun install @embedthis/testme` now works correctly

### Per-Platform Compiler and Debugger Selection

-   **DEV**: Added support for platform-specific compiler configuration
    -   Compiler field now accepts string, "default", or platform map: `{ windows: 'msvc', macosx: 'clang', linux: 'gcc' }`
    -   Platform map automatically selects compiler based on current platform
    -   Falls back to auto-detect if platform not specified in map
    -   Updated CompilerConfig type to support union type (string | platform map)
    -   Added `resolvePlatformCompiler()` method in ConfigManager
    -   Maintains backward compatibility with string values
    -   Added unit tests in `test/portable/compiler-platform.tst.ts`

-   **DEV**: Restructured debugger configuration to top-level `debug` field
    -   Moved from `compiler.c.debugger` to top-level `debug.c`
    -   Added support for all languages: `debug.c`, `debug.js`, `debug.ts`, `debug.py`, `debug.go`, `debug.es`
    -   Each language debugger accepts string, "default", or platform map
    -   Valid C debuggers: `xcode`, `lldb`, `gdb`, `vs`, `vscode`, or path to executable
    -   Platform map automatically selects debugger based on current platform
    -   Falls back to platform defaults if not specified (xcode on macOS, vs on Windows, gdb on Linux)
    -   Added `launchLldbDebugger()` method for LLDB debugger support
    -   Refactored `launchDebugger()` to use configured debugger from `debug.c`
    -   Created generic `resolvePlatformValue()` helper for compiler/debugger resolution

### Multi-Language Debug Support

-   **DEV**: Implemented debug mode for JavaScript, TypeScript, Python, and Go tests
    -   **JavaScript/TypeScript**: Integrated VSCode/Cursor debugging workflow
        -   Supports `vscode` debugger (default) and `cursor` editor
        -   Automatically creates `.vscode/launch.json` configuration in test directory
        -   Opens VSCode/Cursor with the test workspace (folder view)
        -   User sets breakpoints and launches debugger via F5
        -   Uses Bun's built-in debugging capabilities
        -   Requires Bun VSCode extension to be installed
        -   Allows custom debugger path
    -   **Python**: Supports both `pdb` (default) and `vscode` debuggers
        -   `pdb` mode launches Python debugger with interactive command prompt
        -   `vscode` mode provides VSCode debugging instructions
        -   Allows custom debugger path
        -   Displays helpful debugger command reference
    -   **Go**: Supports both `delve` (default) and `vscode` debuggers
        -   `delve` mode launches Delve debugger (dlv) with interactive prompt
        -   `vscode` mode provides VSCode debugging instructions
        -   Allows custom debugger path
        -   Displays helpful debugger command reference
    -   All handlers follow consistent pattern with `launchDebugger()` method
    -   Debug mode activated via `--debug` flag: `tm --debug <test_pattern>`
    -   Configuration via `debug.js`, `debug.ts`, `debug.py`, `debug.go` in testme.json5

### Documentation

-   **DOC**: Updated CLAUDE.md to reference `~/.local` instead of `/usr/local`
-   **DOC**: Updated installation paths in all documentation
-   **DOC**: Added documentation for per-platform compiler selection

## 2025-10-05 (Session 4)

### Installation Packages

Created complete installation package configurations for multiple package managers:

#### NPM/Bun Package (installs/npm/)

-   Full package.json configuration for npm registry
-   Postinstall script for building binary and installing support files
-   Handles testme.h header installation on Unix systems
-   Man page installation support
-   Cross-platform installation via `npm install -g @embedthis/testme` or `bun install -g @embedthis/testme`

#### Homebrew Formula (installs/homebrew/)

-   Complete Ruby formula for Homebrew tap
-   Automated build and installation process
-   Installs binary, header, man page, and JS/ES modules
-   Test validation in formula
-   Installation via `brew install testme`

#### WinGet Manifest (installs/winget/)

-   Complete manifest files for Windows Package Manager
-   Version, installer, and locale manifests
-   Support for x64 and ARM64 architectures
-   Portable installation with command alias
-   Installation via `winget install Embedthis.TestMe`

#### Chocolatey Package (installs/chocolatey/)

-   NuSpec package definition
-   PowerShell installation and uninstallation scripts
-   PATH management and header file installation
-   Bun runtime dependency
-   Installation via `choco install testme`

#### Debian/APT Package (installs/apt/)

-   Complete Debian packaging with control, rules, changelog, copyright
-   debhelper-compat support
-   Multi-architecture build support (amd64, arm64, armhf)
-   PPA publishing instructions
-   Installation via `sudo apt install testme`

#### Documentation Updates

-   Created master installation guide: [installs/README.md](../installs/README.md)
-   Updated main README with quick install instructions for all platforms
-   Added package-specific READMEs with build and publishing instructions
-   Updated PLAN.md marking package distribution tasks complete

All packages include:

-   tm binary installation
-   testme.h header for C tests
-   Man page documentation
-   JavaScript/TypeScript modules
-   Cross-platform support

## 2025-10-05 (Session 3)

### Enhanced Error Messages

#### Compiler Not Found Errors

-   Added platform-specific installation instructions for GCC, Clang, and MSVC
-   Error messages now include:
    -   Download links for compilers
    -   Package manager installation commands
    -   Alternative compiler suggestions
    -   PATH configuration instructions

#### Configuration File Errors

-   Better JSON5 syntax error messages with common fixes
-   File location prominently displayed in error output
-   Hints for common mistakes (missing commas, unclosed brackets, etc.)
    -   Permission error detection and fix suggestions

#### Compilation Error Hints

-   Automatic detection of missing testme.h with installation instructions
-   Library not found errors with configuration examples
-   Header file not found with include path solutions
-   Syntax error hints with common causes
-   Undefined reference errors with troubleshooting steps

New file: [src/utils/error-messages.ts](../src/utils/error-messages.ts) - Centralized error message generation

## 2025-10-05 (Session 2)

### New Language Support

-   **Python Test Support (.tst.py)** - Added full support for Python tests

    -   Uses `python3` command (falls back to `python` if unavailable)
    -   Automatic detection and execution
    -   Example test: [test/python-basic.tst.py](../test/python-basic.tst.py)

-   **Go Test Support (.tst.go)** - Added full support for Go tests
    -   Uses `go run` for compilation and execution
    -   Requires Go to be installed
    -   Example test: [test/go-basic.tst.go](../test/go-basic.tst.go)

### Code Quality Improvements

#### Standardized Error Handling

-   Moved duplicate `combineOutput()` method from all handlers to BaseTestHandler
-   Added `createErrorResult()` helper method for consistent error reporting
-   Improved error messages to include file paths for easier debugging
-   All handlers now use standardized output formatting

#### Comprehensive Test Coverage

-   **Platform Abstraction Layer Tests**

    -   test/platform-detector.tst.ts - Platform and capability detection
    -   test/platform-permissions.tst.ts - File permissions and executability
    -   test/platform-process.tst.ts - Process spawning and management

-   **Service Lifecycle Integration Tests**
    -   test/service-lifecycle.tst.ts - Complete service lifecycle testing
    -   Tests skip, prep, setup, and cleanup services
    -   Verifies proper process management and cleanup

#### API Documentation

-   Added comprehensive JSDoc documentation to internal APIs:
    -   ConfigManager - Configuration loading and merging
    -   ServiceManager - Service lifecycle management
    -   ArtifactManager - Build artifact management
    -   All methods now have proper parameter and return type documentation

### Test Results

All test suites pass successfully:

-   ✓ Platform detector tests (10 tests)
-   ✓ Platform permissions tests (10 tests)
-   ✓ Platform process tests (10 tests)
-   ✓ Service lifecycle tests (11 tests)
-   ✓ String tests (4 tests)
-   ✓ Glob expansion tests (4 tests)
-   ✓ Python basic tests (4 tests)

Total: 53 passing tests

## 2025-10-05 (Session 1)

### Compiler Defaults

-   **DEV**: Added default compiler flags for GCC/Clang
    -   Added `-Wno-unused-parameter` to suppress unused parameter warnings
    -   Added `-Wno-strict-prototypes` to suppress strict prototype warnings
    -   Added `-I.` to include current directory by default
    -   Added `-I/usr/local/include` and `-L/usr/local/lib` for standard Unix paths
    -   Added `-I/opt/homebrew/include` and `-L/opt/homebrew/lib` for Homebrew (macOS)
-   **CHORE**: Cleaned up redundant flags from all testme.json5 configuration files

### Documentation

-   **DOC**: Added logo to README.md
-   **DOC**: Updated README with complete special variable documentation (${OS}, ${ARCH}, ${CC}, ${TESTDIR})
-   **DOC**: Added "Common Use Cases" section to README with practical examples:
    -   Multi-platform C project configuration
    -   Docker service integration
    -   Conditional test execution
    -   Test organization by depth
-   **DOC**: Updated compiler configuration documentation to reflect per-compiler sections
-   **DOC**: Documented variable expansion system comprehensively
-   **DOC**: Created comprehensive CONTRIBUTING.md guide with:
    -   Development workflow and setup instructions
    -   Coding standards and style guidelines
    -   Testing guidelines and best practices
    -   Commit message conventions
    -   Pull request process and templates
    -   Guide for adding new features

### Code Quality

-   **CHORE**: Added tsconfig.json with strict TypeScript checking enabled
-   **CHORE**: Identified ~50 type errors to fix (type-only imports, override modifiers, strict nulls)
-   **DOC**: Added comprehensive inline documentation to core modules:
    -   TestRunner (src/runner.ts) - Architecture, execution flow, and responsibilities
    -   ConfigManager (src/config.ts) - Hierarchical config system, discovery, merging
    -   TestDiscovery (src/discovery.ts) - Test discovery engine, pattern matching modes

### Test Infrastructure

-   **TEST**: Fixed all unit test failures - all tests now passing (26/26 tests pass)
-   **TEST**: Added skip script for Windows-specific tests (test/windows/skip-if-not-windows.sh)
-   **TEST**: Fixed CRLF line ending issues in portable shell tests
-   **TEST**: Fixed import path in portable/glob-expansion.tst.ts
-   **TEST**: Added environment variables to portable/testme.json5
-   **TEST**: Linked testme package for JavaScript/TypeScript tests in test directory
-   **TEST**: Added comprehensive special variable expansion test (test/portable/special-vars.tst.ts)
    -   Tests ${PLATFORM}, ${OS}, ${ARCH}, ${CC}, ${PROFILE}, ${CONFIGDIR}, ${TESTDIR}
    -   Tests combined variable expansion
    -   Tests array expansion
    -   Validates all special variable types

### Features

-   **DEV**: Added test generation commands for easier project setup:
    -   `tm --init` - Creates testme.json5 configuration file with sensible defaults
    -   `tm --new <name>` - Scaffolds test files with templates
    -   Supports C (.tst.c), Shell (.tst.sh), JavaScript (.tst.js), TypeScript (.tst.ts)
    -   Auto-detects test type from extension (e.g., `tm --new math.c` creates math.tst.c)
    -   Includes helpful templates and next-step instructions
    -   Updated CLI usage text with new commands and examples
    -   Updated man page (doc/tm.1) with new options and examples section
-   **DEV**: Added special variable support for build configuration
    -   Added `${TESTDIR}` - Relative path from executable to test directory
    -   Added `${CONFIGDIR}` - Relative path from executable to config directory
    -   Added `${OS}` - Operating system (macosx, linux, windows)
    -   Added `${ARCH}` - CPU architecture (arm64, x64, x86)
    -   Added `${PLATFORM}` - Combined OS-ARCH (e.g., macosx-arm64)
    -   Added `${CC}` - Compiler name (gcc, clang, msvc)
    -   Added `${PROFILE}` - Build profile with env/config/CLI support
-   **DEV**: Added `--profile` CLI option to set build profile
-   **DEV**: Added `profile` field to TestConfig for configuration files
-   **DEV**: Added support for `compiler: 'default'` in testme.json5 to explicitly request auto-detection

### Documentation

-   **DOC**: Updated man page with special variables documentation and `--profile` option
-   **DOC**: Merged Windows installation guide into main README
-   **DOC**: Added Windows-specific troubleshooting section to README
-   **DOC**: Added PowerShell and Batch test examples to README

### Test Infrastructure

-   **TEST**: Reorganized test directory structure
    -   Moved portable unit tests to `test/portable/` subdirectory
    -   Created `test/basic.tst.c` as top-level framework verification test
    -   Moved test subdirectories (delay_test, disabled_test, enabled_test) to portable/
-   **TEST**: Updated test configuration to include `-I.` and `-I..` for testme.h location

### Configuration

-   **DEV**: Enhanced compiler flag merging to properly merge nested compiler.c configuration
-   **DEV**: Special variables now resolve with proper priority: CLI > config > env > default

### Build System

-   **CHORE**: Moved build.ps1 to bin/ directory for safe-keeping
-   **CHORE**: Simplified build system relying on Makefile and bun commands

## 2025-10-02

### Windows Support

-   **DEV**: Implemented native Windows support without WSL requirement
-   **DEV**: Added PowerShell test support (`.tst.ps1`)
-   **DEV**: Added Batch script test support (`.tst.bat`, `.tst.cmd`)
-   **DEV**: Implemented cross-platform compiler detection and configuration
    -   MSVC auto-detection via vswhere and manual search
    -   MinGW-w64 support
    -   LLVM/Clang support on Windows
-   **DEV**: Added platform abstraction layer in `src/platform/`
    -   detector.ts - Platform, compiler, shell detection
    -   process.ts - Cross-platform process management
    -   permissions.ts - File permission handling
    -   shell.ts - Shell detection and execution
    -   compiler.ts - Compiler abstraction and flag translation
-   **DEV**: Implemented VS Code debugging support for Windows C tests
-   **TEST**: Added Windows test examples in `test/windows/`
-   **DOC**: Created Windows-specific documentation (WINDOWS_PORT.md, WINDOWS_INSTALL.md)

### Cross-Platform Enhancements

-   **DEV**: Updated core components to use platform abstractions
-   **DEV**: Fixed path separator handling (`;` on Windows, `:` on Unix)
-   **DEV**: Implemented proper process termination (taskkill vs kill)
-   **DEV**: Added binary extension management (`.exe` on Windows)

## Earlier Changes

### Core Features

-   **DEV**: Multi-language test runner supporting Shell, C, JavaScript, TypeScript, Ejscript
-   **DEV**: Automatic C compilation with GCC/Clang/MSVC
-   **DEV**: Recursive test discovery with pattern matching
-   **DEV**: Parallel test execution with configurable workers
-   **DEV**: Hierarchical configuration system with testme.json5
-   **DEV**: Environment variable expansion with glob patterns
-   **DEV**: Service lifecycle management (skip, prep, setup, cleanup)
-   **DEV**: Test depth requirements and enable/disable flags
-   **DEV**: Multiple output formats (simple, detailed, JSON)
-   **DEV**: Integrated debugging (GDB on Linux, Xcode on macOS, VS Code on Windows)
-   **DEV**: Artifact management in `.testme` directories
-   **DEV**: Test helper libraries (testme.h for C, testme.js for JS/TS)
