# TestMe - Development Plan

## Current Status

TestMe is a production-ready, cross-platform multi-language test runner with native support for Windows, macOS, and Linux. Core features are complete and well-documented.

**Version**: 0.7.0+
**Last Updated**: 2025-10-05

## Recently Completed

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

-   [ ] Expand test coverage for edge cases
-   [x] Add tests for special variable expansion (portable/special-vars.tst.ts)
-   [ ] Test on different Windows configurations (MSVC, MinGW, Clang)
-   [ ] Add integration tests for complex scenarios

## Short-term Goals (Next Sprint)

### 1. Enhanced Error Messages

**Priority**: High
**Effort**: Medium

Improve error messages to be more actionable:

-   [x] Better compiler not found messages with installation instructions
-   [x] Clearer configuration error messages with file locations
-   [x] Helpful hints for common mistakes (e.g., missing testme.h)

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

-   [ ] GitHub Actions examples
-   [ ] GitLab CI examples
-   [ ] Exit code standardization for CI systems

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

-   [ ] Tag-based filtering (e.g., @smoke, @integration)
-   [ ] Exclusion patterns (--exclude)
-   [ ] Last-failed test mode

## Long-term Vision

### 1. Package Distribution

**Priority**: High
**Effort**: High

Make TestMe easily installable:

-   [ ] npm/bun package publication
-   [ ] Homebrew formula (macOS)
-   [ ] winget package (Windows)
-   [ ] chocolatey package (Windows)
-   [ ] apt/yum packages (Linux)

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

-   [ ] `tm init` command to create testme.json5
-   [ ] `tm new <name>` to scaffold test files

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

**Next Review**: 2025-10-12
