# TestMe - Development Plan

## Current Status

TestMe is a production-ready, cross-platform multi-language test runner with native support for Windows, macOS, and Linux. Core features are complete and well-documented.

**Version**: 0.8.14
**Last Updated**: 2025-10-12

## Recently Completed

-   ✅ JavaScript service execution in compiled binary (2025-10-12)
    -   Fixed setup services using `.js` files failing when run from compiled `tm` binary
    -   Added detection for compiled binary context to use `bun` command instead of `process.execPath`
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
        - Special variables: kept as `${VAR}` if undefined
        - Environment variables: kept as `${VAR}` if undefined
        - Glob patterns: wrapper removed to `pattern` if no matches
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
