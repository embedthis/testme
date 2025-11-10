# TestMe - Development Plan

## Current Status

TestMe is a specialized test runner designed for **core infrastructure projects** such as those written in C/C++ and those that require compilation before execution. TestMe discovers, compiles, and executes tests with configurable patterns and parallel execution -- ideal for low-level and performance-critical codebases.

Test files can be written in C, C++, shell scripts, Python, Go or Javascript/Typescript.

**Version**: 0.8.30
**Last Updated**: 2025-11-11

## Recently Completed

-   ✅ Duration flag for test control (2025-11-11)
    -   Added `--duration <COUNT>` CLI flag with time suffix support
    -   Supports suffixes: no suffix/sec/secs (seconds), min/mins (minutes), hr/hrs/hour/hours (hours), day/days (days)
    -   Supports decimal values (e.g., `--duration 1.5hours` → 5400 seconds)
    -   Exports `TESTME_DURATION` environment variable in seconds to all tests and service scripts
    -   Available in all test types (C, Shell, JavaScript, TypeScript, Python, Go, Ejscript)
    -   Use cases: load testing, performance testing, time-based integration tests
-   ✅ Monitor mode streaming fixes (2025-11-10)
    -   Fixed `--monitor` flag to properly stream test output in real-time
    -   Added fflush() calls to C test utility functions
    -   Removed strict TTY requirement when user explicitly requests --monitor
-   ✅ Configuration inheritance fixes (2025-11-04)
    -   Fixed ${CONFIGDIR} variable expansion in inherited configs
    -   Parent's ${CONFIGDIR} now correctly substituted with absolute path before inheritance
    -   Prevents incorrect paths in child configs (especially rpath settings)
    -   Supports grandparent inheritance chains with recursive substitution
    -   Added comprehensive test coverage for inheritance scenarios
-   ✅ Absolute path handling (2025-11-04)
    -   Changed ${TESTDIR} and ${CONFIGDIR} to provide absolute paths
    -   More reliable for rpath flags and inherited configurations
    -   Consistent behavior across all use cases
-   ✅ Pattern matching improvements (2025-11-04)
    -   Fixed subdirectory path matching (e.g., `tm subdir/name`)
    -   Now correctly matches tests with full extension removal
-   ✅ Enhanced environment variables (2025-10-28)
    -   Added TESTME_DEPTH and TESTME_ITERATIONS exports
    -   Made TESTME_VERBOSE, TESTME_QUIET, TESTME_KEEP always set to '0' or '1'
-   ✅ Root configuration discovery (2025-10-22)
    -   Changed to use shallowest config from discovered tests
    -   More reliable globalPrep/globalCleanup execution
-   ✅ Service health check implementation (2025-10-22)
    -   Implemented active service health checking to replace arbitrary delays
    -   Created HealthCheckManager class with 4 check types: HTTP, TCP, Script, File
    -   HTTP/HTTPS checks verify endpoint status and optional response body
    -   TCP checks verify port is accepting connections
    -   Script checks execute custom commands and verify exit codes
    -   File checks verify existence of ready marker files
    -   Type defaults to 'http' for simplified configuration
    -   Falls back to setupDelay if not configured (backward compatible)
    -   Comprehensive documentation in README, man page, DESIGN.md, CLAUDE.md
    -   Configuration examples in doc/testme.json5
    -   Test coverage: HTTP and TCP health check tests both passing
    -   Benefits: Faster test execution, more reliable service startup
-   ✅ Service shutdown improvements and Ctrl+C handling (2025-10-21)
    -   Fixed shutdownTimeout default behavior - now sends SIGTERM first even with timeout=0
    -   Changed default shutdownTimeout from 0 to 5 seconds for optimal behavior
    -   Implemented polling mechanism (100ms intervals) to detect graceful process exit
    -   Added `--stop` command line option for fast-fail behavior
    -   Implemented proper Ctrl+C (SIGINT) signal handling for graceful shutdown
    -   First Ctrl+C stops tests gracefully, second Ctrl+C forces immediate exit
-   ✅ Jest/Vitest API compatibility (2025-10-18)
    -   Complete describe/test/it API for organizing tests
    -   beforeAll/afterAll lifecycle hooks
    -   beforeEach/afterEach hooks with proper scoping
    -   test.skip() and test.skipIf() for conditional test skipping
    -   describe.skip() for skipping entire test suites
    -   Full TypeScript type definitions
    -   Comprehensive test coverage (20+ tests)
-   ✅ Documentation structure maintained and updated (2025-10-19)
    -   Archived outdated design documents (MACRO_IMPROVEMENTS.md, EJSX_MIGRATION_DOCS.md)
    -   Reorganized JEST_API.md to proper location (.agent/designs/)
    -   Updated DESIGN.md to reflect current architecture
-   ✅ Documentation structure maintained and updated (2025-10-15)
    -   Verified all `.agent` documentation is current
    -   DESIGN.md reflects latest architecture (environment variable exports, pattern-based discovery)
    -   PLAN.md priorities and status are accurate
    -   CHANGELOG.md includes all recent development activities
    -   PROCEDURE.md and REFERENCES.md verified as current
-   ✅ Added --no-services command line option (2025-10-12)
    -   New CLI flag to skip all service commands (skip, prep, setup, cleanup)
    -   Enables manual service control for debugging and faster test iteration
    -   Updated CLI parser, help text, man page, and documentation
    -   All tests pass with option working correctly
-   ✅ JavaScript service execution in compiled binary (2025-10-12)
    -   Fixed setup services using `.js` files failing when run from compiled `tm` binary
    -   Added detection for compiled binary context to use `bun` command instead of `process.execPath`
    -   Fixed scope issue with options variable in catch block
    -   All tests now pass including `test/portable/delay_test`
-   ✅ Critical bug fixes (2025-10-07)
    -   Fixed Bun compiled binary working directory issue with shell wrapper
    -   Fixed `profile` property from testme.json5 not being used for `${PROFILE}` expansion
    -   Fixed format-truncation warning in testme.h
    -   Fixed Ejscript module installation to `~/.local/lib/testme/testme.mod`
-   ✅ Configuration system improvements (2025-10-07)
    -   Fixed default PROFILE from 'debug' to 'dev'
    -   Fixed compiler flag blending (generic + compiler-specific + platform-specific)
    -   Fixed platform-specific include paths (Homebrew only on macOS)
    -   Added comprehensive sample configuration [doc/testme.json5](../../doc/testme.json5)
-   ✅ Error message improvements (2025-10-07)
    -   Fixed misleading "testme.h not found" for linker errors
    -   Improved include syntax guidance
    -   Better error detection patterns
-   ✅ Cross-platform test suite - All tests now work on Windows, macOS, and Linux
-   ✅ CI/CD pipeline enhancements - Added Python and Go runtime support
-   ✅ GitHub Actions CI/CD pipeline with multi-platform testing
-   ✅ Manual test mode (`enable: 'manual'`) for tests that only run when explicitly named
-   ✅ Native Windows support (PowerShell, Batch, MSVC/MinGW/Clang)
-   ✅ Platform abstraction layer (src/platform/)
-   ✅ Special variable system (${TESTDIR}, ${CONFIGDIR}, ${PLATFORM}, ${PROFILE}, etc.)
-   ✅ Cross-platform compiler detection and flag translation
-   ✅ Test structure reorganization (test/portable/ directory)
-   ✅ Comprehensive documentation consolidation
-   ✅ Build profile support (--profile CLI option)
-   ✅ VS Code debugging support for Windows

## Current Focus

### Documentation Polish

-   [x] Review and update all documentation for consistency
-   [x] Ensure all special variables are documented in all relevant places (added ${OS}, ${ARCH}, ${CC})
-   [x] Add more usage examples to README (added Common Use Cases section)
-   [x] Create a CONTRIBUTING.md guide

### Code Quality

-   [x] Review TypeScript strict mode compliance (tsconfig.json created, ~50 type errors identified)
-   [ ] Ensure consistent error handling patterns
-   [x] Add more inline documentation where needed (added comprehensive docs to runner.ts, config.ts, discovery.ts)
-   [ ] Review and optimize performance bottlenecks

### Testing

-   [x] Cross-platform test compatibility - Completed 2025-10-07
    -   Converted all shell-based tests to JavaScript for Windows compatibility
    -   All tests now run on Windows, macOS, and Linux
-   [ ] Expand test coverage for edge cases
-   [x] Add tests for special variable expansion (portable/special-vars.tst.ts)
-   [ ] Test on different Windows configurations (MSVC, MinGW, Clang)
-   [ ] Add integration tests for complex scenarios

## Short-term Goals (Next Sprint)

### 1. Enhanced Error Messages

**Priority**: High
**Effort**: Medium
**Status**: ✅ Completed 2025-10-07

Improve error messages to be more actionable:

-   [x] Better compiler not found messages with installation instructions
-   [x] Clearer configuration error messages with file locations
-   [x] Helpful hints for common mistakes (e.g., missing testme.h)
-   [x] Fixed false positive testme.h errors for linker failures
-   [x] Improved include syntax guidance

### 2. Configuration Validation

**Priority**: Medium
**Effort**: Low

Add validation for testme.json5:

-   [ ] Validate required fields and types
-   [ ] Warn about unknown/deprecated fields
-   [ ] Suggest corrections for common typos

### 3. Service Health Checks

**Priority**: Medium
**Effort**: Medium
**Status**: Proposed

Replace arbitrary `setupDelay` with active health checking to start tests as soon as services are ready. See detailed plan: [HEALTHCHECK.md](HEALTHCHECK.md)

**Phase 1** (HTTP + TCP):

-   [ ] Create HealthCheckManager with polling loop
-   [ ] Implement HTTP health check (status + body matching)
-   [ ] Implement TCP port health check
-   [ ] Integrate with ServiceManager
-   [ ] Update configuration system

**Phase 2** (Advanced):

-   [ ] Implement script-based health checks
-   [ ] Implement file/socket existence checks

**Benefits**:

-   Faster test execution (no unnecessary waiting)
-   More reliable tests (services confirmed ready)
-   Backward compatible (falls back to setupDelay)

## Medium-term Goals (Next Month)

### 1. CI/CD Integration

**Priority**: High
**Effort**: High

Add first-class CI/CD support:

-   [x] GitHub Actions workflows - Completed 2025-10-07
    -   CI workflow (.github/workflows/ci.yml) with multi-platform testing (Ubuntu, macOS, Windows)
    -   Release workflow (.github/workflows/release.yml) with automated NPM publishing
    -   Automated testing on push and pull requests
    -   Build verification and artifact upload
-   [ ] GitLab CI examples
-   [x] Exit code standardization for CI systems - Already implemented

### 2. Test Coverage Reporting

**Priority**: Medium
**Effort**: High

Add coverage support for C tests:

-   [ ] GCC/Clang coverage (gcov/lcov)
-   [ ] MSVC coverage
-   [ ] HTML coverage reports
-   [ ] Coverage thresholds

### 3. Advanced Debugging Features

**Priority**: Low
**Effort**: Medium

Enhance debugging capabilities:

-   [ ] Core dump analysis integration

### 4. Test Filtering Enhancements

**Priority**: Low
**Effort**: Low

More powerful test selection:

-   [x] Manual test mode (`enable: 'manual'`) - Completed 2025-10-07
-   [ ] Tag-based filtering (e.g., @smoke, @integration)
-   [ ] Exclusion patterns (--exclude)
-   [ ] Last-failed test mode

## Long-term Vision

### 1. Package Distribution

**Priority**: High
**Effort**: High

Make TestMe easily installable:

-   [x] npm/bun package publication - Completed (@embedthis/testme)
-   [x] Homebrew formula (macOS) - Completed (installs/homebrew/)
-   [x] winget package (Windows) - Completed (installs/winget/)
-   [x] chocolatey package (Windows) - Completed (installs/chocolatey/)
-   [x] apt packages (Linux) - Completed (installs/apt/)
-   [x] NPM package installation scripts - Completed (bin/install.sh, bin/install.mjs)
-   [x] Automatic binary installation to system paths - Completed
-   [x] Support file installation (testme.h, man page, testme.mod) - Completed
-   [ ] Publish packages to respective registries (npm, homebrew, winget, chocolatey, apt)
-   [ ] yum/rpm packages (RHEL/Fedora)

### 2. Language Extensions

**Priority**: Low
**Effort**: Varies

Support additional languages:

-   [x] Python tests (.tst.py) - Completed
-   [x] Go tests (.tst.go) - Completed
-   [ ] Rust tests (.tst.rs)
-   [ ] Ruby tests (.tst.rb)

### 3. Test Generation Tools

**Priority**: Medium
**Effort**: Medium

Help users create tests:

-   [x] `tm --init` command to create testme.json5 - Completed
-   [x] `tm --new <name>` to scaffold test files - Completed

## Technical Debt

### High Priority

-   [x] Add unit tests for platform abstraction layer (platform-detector.tst.ts, platform-permissions.tst.ts, platform-process.tst.ts)
-   [x] Document internal APIs (ConfigManager, ServiceManager, ArtifactManager, GlobExpansion)
-   [x] Standardize error handling across handlers (moved combineOutput to base handler, added createErrorResult helper)
-   [x] Add integration tests for service lifecycle (service-lifecycle.tst.ts)
-   [ ] Improve type safety in configuration merging

### Medium Priority

-   [ ] Refactor glob expansion to support nested variables
-   [ ] Optimize path normalization performance
-   [ ] Simplify test handler registration
-   [ ] Improve undefined variable handling consistency
    -   Current behavior is inconsistent:
        -   Special variables: kept as `${VAR}` if undefined
        -   Environment variables: kept as `${VAR}` if undefined
        -   Glob patterns: wrapper removed to `pattern` if no matches
    -   Consider options:
        1. Remove undefined variables entirely (treat as empty string)
        2. Warn about undefined variables (log warning but keep)
        3. Remove `${...}` wrapper uniformly (like glob patterns)
        4. Error on undefined variables (strict mode)
    -   See DESIGN.md "Undefined Variable Behavior" section for details

### Low Priority

-   [ ] Consider migrating to pnpm for package management
-   [ ] Evaluate alternative configuration formats (YAML, TOML)
-   [ ] Explore parallel test compilation
-   [ ] Consider plugin architecture for extensibility

## Ideas Backlog

These are ideas for future consideration:

-   **Watch mode**: Auto-run tests on file changes
-   **Test fixtures**: Shared setup/teardown across test groups
-   **Mocking framework**: Built-in mocking for C tests
-   **Property-based testing**: Fuzzing and property testing support
-   **Benchmark mode**: Performance regression testing
-   **Test sharding**: Split tests across multiple machines
-   **Docker integration**: Containerized test execution
-   **Cloud test runners**: AWS/Azure/GCP integration
-   **Test analytics**: Flakiness detection, performance trends

## Contributing

Interested in contributing? Check priority items above or propose new features by:

1. Opening an issue to discuss the idea
2. Creating a proof-of-concept
3. Submitting a pull request with tests and documentation

See CONTRIBUTING.md (TODO) for detailed guidelines.

## Notes

-   Keep documentation up-to-date as features are implemented
-   Update CHANGELOG.md with each significant change
-   Maintain backward compatibility where possible
-   Follow existing code conventions and patterns
-   Write tests for new features
-   Update man page and README for user-facing changes

---

## Recent Work (2025-10-07)

### Cross-Platform CI/CD and Test Compatibility

Completed comprehensive cross-platform improvements:

-   ✅ Enhanced CI/CD pipeline for multi-language support
    -   Added Python runtime installation (actions/setup-python@v5)
    -   Added Go runtime installation (actions/setup-go@v5)
    -   Ensures all test types (.tst.py, .tst.go, .tst.c, .tst.js, .tst.ts) run in CI
-   ✅ Converted shell-based tests to cross-platform JavaScript
    -   Converted config test fixtures (manual.tst.sh, another.tst.sh → .tst.js)
    -   Converted ejscript skip script (skip.sh → skip.js with platform-aware detection)
    -   All tests now run on Windows, macOS, and Linux without modification
-   ✅ Disabled automatic tag-based releases
    -   Release workflow now manual-only via workflow_dispatch
    -   Prevents accidental duplicate builds on tag creation
    -   Allows controlled release process
-   ✅ Established .agent documentation structure
    -   Created complete directory hierarchy for AI-assisted development
    -   Organized designs, plans, procedures, logs, and references
    -   Added comprehensive documentation for project architecture and workflows

**Next Review**: 2025-10-14

## Recent Work (2025-10-06)

### NPM Package Installation System

Completed full npm package installation infrastructure:

-   ✅ Created `bin/install.sh` wrapper script supporting both Bun and Node.js runtimes
-   ✅ Implemented `bin/install.mjs` ES module installation script with:
    -   Platform detection (Windows vs Unix)
    -   Binary building with correct extension (.exe on Windows)
    -   Binary installation to `~/.bun/bin/tm` (no sudo required)
    -   `testme.h` header installation to `~/.local/include/testme.h`
    -   Man page installation to `~/.local/share/man/man1/tm.1` (Unix only)
    -   Ejscript `testme.mod` installation to `~/.ejs/testme.mod` and `~/.local/lib/testme/testme.mod` (if `ejsc` found)
-   ✅ Updated package.json with correct files array (excluding pre-built binary)
-   ✅ Configured postinstall hook to run installation script
-   ✅ Updated documentation (CLAUDE.md) with installation process details
