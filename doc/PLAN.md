# TestMe - Development Plan

## Current Status

TestMe is a production-ready, cross-platform multi-language test runner with native support for Windows, macOS, and Linux. Core features are complete and well-documented.

**Version**: 0.7.0+
**Last Updated**: 2025-10-05

## Recently Completed

- ✅ Native Windows support (PowerShell, Batch, MSVC/MinGW/Clang)
- ✅ Platform abstraction layer (src/platform/)
- ✅ Special variable system (${TESTDIR}, ${CONFIGDIR}, ${PLATFORM}, ${PROFILE}, etc.)
- ✅ Cross-platform compiler detection and flag translation
- ✅ Test structure reorganization (test/portable/ directory)
- ✅ Comprehensive documentation consolidation
- ✅ Build profile support (--profile CLI option)
- ✅ VS Code debugging support for Windows

## Current Focus

### Documentation Polish
- [ ] Review and update all documentation for consistency
- [ ] Ensure all special variables are documented in all relevant places
- [ ] Add more usage examples to README
- [ ] Create a CONTRIBUTING.md guide

### Code Quality
- [ ] Review TypeScript strict mode compliance
- [ ] Ensure consistent error handling patterns
- [ ] Add more inline documentation where needed
- [ ] Review and optimize performance bottlenecks

### Testing
- [ ] Expand test coverage for edge cases
- [ ] Add tests for special variable expansion
- [ ] Test on different Windows configurations (MSVC, MinGW, Clang)
- [ ] Add integration tests for complex scenarios

## Short-term Goals (Next Sprint)

### 1. Enhanced Error Messages
**Priority**: High
**Effort**: Medium

Improve error messages to be more actionable:
- [ ] Better compiler not found messages with installation instructions
- [ ] Clearer configuration error messages with file locations
- [ ] Helpful hints for common mistakes (e.g., missing testme.h)

### 2. Configuration Validation
**Priority**: Medium
**Effort**: Low

Add validation for testme.json5:
- [ ] Validate required fields and types
- [ ] Warn about unknown/deprecated fields
- [ ] Suggest corrections for common typos

### 3. Performance Optimization
**Priority**: Medium
**Effort**: Medium

Optimize test discovery and execution:
- [ ] Cache test discovery results
- [ ] Implement incremental compilation detection
- [ ] Optimize glob pattern matching

## Medium-term Goals (Next Month)

### 1. CI/CD Integration
**Priority**: High
**Effort**: High

Add first-class CI/CD support:
- [ ] GitHub Actions examples
- [ ] GitLab CI examples
- [ ] Jenkins integration guide
- [ ] Exit code standardization for CI systems
- [ ] JUnit XML output format option

### 2. Test Coverage Reporting
**Priority**: Medium
**Effort**: High

Add coverage support for C tests:
- [ ] GCC/Clang coverage (gcov/lcov)
- [ ] MSVC coverage
- [ ] HTML coverage reports
- [ ] Coverage thresholds

### 3. Advanced Debugging Features
**Priority**: Medium
**Effort**: Medium

Enhance debugging capabilities:
- [ ] Better Xcode integration on macOS
- [ ] WinDbg support for Windows (alternative to VS Code)
- [ ] Remote debugging support
- [ ] Core dump analysis integration

### 4. Test Filtering Enhancements
**Priority**: Low
**Effort**: Low

More powerful test selection:
- [ ] Tag-based filtering (e.g., @smoke, @integration)
- [ ] Regular expression patterns
- [ ] Exclusion patterns (--exclude)
- [ ] Last-failed test mode

## Long-term Vision

### 1. Package Distribution
**Priority**: High
**Effort**: High

Make TestMe easily installable:
- [ ] npm/bun package publication
- [ ] Homebrew formula (macOS)
- [ ] winget package (Windows)
- [ ] chocolatey package (Windows)
- [ ] apt/yum packages (Linux)

### 2. Language Extensions
**Priority**: Low
**Effort**: Varies

Support additional languages:
- [ ] Python tests (.tst.py) - High demand
- [ ] Go tests (.tst.go)
- [ ] Rust tests (.tst.rs)
- [ ] Ruby tests (.tst.rb)

### 3. Test Generation Tools
**Priority**: Low
**Effort**: Medium

Help users create tests:
- [ ] `tm init` command to create testme.json5
- [ ] `tm new <name>` to scaffold test files
- [ ] Test templates for common patterns
- [ ] Interactive test wizard

### 4. Web UI/Dashboard
**Priority**: Low
**Effort**: Very High

Web-based test management:
- [ ] Real-time test execution dashboard
- [ ] Historical test results tracking
- [ ] Test suite organization
- [ ] Visual test failure analysis

## Technical Debt

### High Priority
- [ ] Add unit tests for platform abstraction layer
- [ ] Improve type safety in configuration merging
- [ ] Standardize error handling across handlers
- [ ] Add integration tests for service lifecycle

### Medium Priority
- [ ] Refactor glob expansion to support nested variables
- [ ] Optimize path normalization performance
- [ ] Simplify test handler registration
- [ ] Document internal APIs

### Low Priority
- [ ] Consider migrating to pnpm for package management
- [ ] Evaluate alternative configuration formats (YAML, TOML)
- [ ] Explore parallel test compilation
- [ ] Consider plugin architecture for extensibility

## Ideas Backlog

These are ideas for future consideration:

- **Watch mode**: Auto-run tests on file changes
- **Snapshot testing**: Golden file comparison for regression testing
- **Test fixtures**: Shared setup/teardown across test groups
- **Mocking framework**: Built-in mocking for C tests
- **Property-based testing**: Fuzzing and property testing support
- **Benchmark mode**: Performance regression testing
- **Test sharding**: Split tests across multiple machines
- **Docker integration**: Containerized test execution
- **Cloud test runners**: AWS/Azure/GCP integration
- **Test analytics**: Flakiness detection, performance trends

## Contributing

Interested in contributing? Check priority items above or propose new features by:
1. Opening an issue to discuss the idea
2. Creating a proof-of-concept
3. Submitting a pull request with tests and documentation

See CONTRIBUTING.md (TODO) for detailed guidelines.

## Notes

- Keep documentation up-to-date as features are implemented
- Update CHANGELOG.md with each significant change
- Maintain backward compatibility where possible
- Follow existing code conventions and patterns
- Write tests for new features
- Update man page and README for user-facing changes

---

**Next Review**: 2025-10-12
