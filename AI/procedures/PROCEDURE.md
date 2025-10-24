# TestMe - Development Procedures

## Overview

This document describes the standard procedures for developing, testing, and maintaining the TestMe project.

## Development Workflow

### 1. Setting Up Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd testme

# Install dependencies
bun install

# Build the project
make build

# Run tests
make test
```

### 2. Making Changes

1. Create a feature branch from `main`
2. Make changes following coding conventions in CLAUDE.md
3. Run tests to ensure changes don't break existing functionality
4. Update documentation as needed
5. Commit with proper prefix (FIX:, DEV:, DOC:, TEST:, CHORE:)

### 3. Testing Changes

```bash
# Run all tests
make test

# Run specific test pattern
tm "*.tst.c"

# Run with verbose output
tm -v

# Clean artifacts
make clean
```

### 4. Building Distribution

```bash
# Build binary
make build

# Test local installation
npm pack
npm install -g testme-*.tgz

# Clean up
npm uninstall -g @embedthis/testme
```

## Adding New Features

### Adding a New Test Language

1. **Create Handler** in `src/handlers/`
    - Extend `BaseTestHandler`
    - Implement `canHandle()` and `execute()` methods
    - Add optional `prepare()` and `cleanup()` methods

2. **Update Types** in `src/types.ts`
    - Add new `TestType` enum value
    - Update relevant type definitions

3. **Register Handler** in `src/handlers/index.ts`
    - Import the new handler
    - Add to `createHandlers()` function

4. **Update Discovery** in `src/discovery.ts`
    - Add file extension to `TEST_EXTENSIONS` mapping

5. **Create Tests**
    - Add example test in `test/` directory
    - Create handler-specific unit tests

6. **Update Documentation**
    - README.md - Add to supported languages
    - DESIGN.md - Document handler architecture
    - man page (`doc/tm.1`) - Update supported file types

### Adding Configuration Options

1. **Update Types** in `src/types.ts`
    - Add new fields to `TestConfig` type

2. **Update ConfigManager** in `src/config.ts`
    - Add default values
    - Add merging logic if needed
    - Add validation if needed

3. **Update CLI** in `src/cli.ts`
    - Add command-line argument parsing
    - Add to usage text

4. **Update Documentation**
    - README.md - Document new option
    - man page - Add to OPTIONS section

## Code Quality Procedures

### Before Committing

1. **Format Code**
    ```bash
    # Format is automatic via .editorconfig
    # Check formatting manually if needed
    ```

2. **Run Tests**
    ```bash
    make test
    ```

3. **Check Types** (when TypeScript strict mode is fully enabled)
    ```bash
    bun run type-check
    ```

4. **Update Documentation**
    - Update CHANGELOG.md
    - Update relevant documentation files
    - Update inline comments and JSDoc

### Code Review Checklist

- [ ] Code follows 4-space indentation
- [ ] All functions have JSDoc comments
- [ ] Error handling is consistent
- [ ] Tests are included for new features
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] No debug code or console.log statements
- [ ] Performance impact considered

## Release Procedures

### Version Bump

1. Update version in `package.json`
2. Run `bun run prebuild` to sync version
3. Update CHANGELOG.md with release notes
4. Commit with message: "CHORE: bump version to X.Y.Z"

### Creating a Release

1. **Test Thoroughly**
    ```bash
    make test
    tm --clean
    tm
    ```

2. **Build Distribution**
    ```bash
    make build
    ```

3. **Create Git Tag**
    ```bash
    git tag -a vX.Y.Z -m "Release X.Y.Z"
    git push origin vX.Y.Z
    ```

4. **Publish to npm**
    ```bash
    npm publish
    ```

5. **Update Package Managers**
    - Update Homebrew formula
    - Update WinGet manifest
    - Update Chocolatey package
    - Update APT package

## Debugging Procedures

### Debugging TestMe Itself

1. **Enable Verbose Output**
    ```bash
    tm -v <pattern>
    ```

2. **Show Compilation Commands**
    ```bash
    tm -s <pattern>
    ```

3. **Keep Artifacts**
    ```bash
    tm --keep <pattern>
    # Inspect .testme/compile.log
    ```

4. **Use Bun Debugger**
    ```bash
    bun --inspect src/index.ts <args>
    ```

### Debugging Test Failures

1. **Run Single Test**
    ```bash
    tm <test-name>
    ```

2. **Check Compilation Log**
    ```bash
    cat <test-dir>/.testme/compile.log
    ```

3. **Run Test Directly**
    ```bash
    # C test
    <test-dir>/.testme/<test-binary>

    # Shell test
    bash <test-file>.tst.sh

    # JavaScript test
    bun <test-file>.tst.js
    ```

4. **Use Debug Mode**
    ```bash
    tm --debug <test-name>
    ```

## Documentation Maintenance

### Keeping Documentation Current

1. **After Feature Changes**
    - Update README.md
    - Update DESIGN.md
    - Update man page (doc/tm.1)
    - Update CHANGELOG.md

2. **After API Changes**
    - Update inline JSDoc comments
    - Update type definitions
    - Update configuration examples

3. **After Bug Fixes**
    - Update CHANGELOG.md
    - Add troubleshooting entry if applicable

### Documentation Review

Periodically review and update:
- [ ] README.md - Quick start and examples
- [ ] DESIGN.md - Architecture accuracy
- [ ] PLAN.md - Current status and priorities
- [ ] CHANGELOG.md - Recent changes
- [ ] man page - CLI options and usage
- [ ] CLAUDE.md - AI assistant context

## Continuous Integration

### CI/CD Workflow

1. **On Pull Request**
    - Run all tests
    - Build binary for all platforms
    - Check code formatting
    - Run type checking

2. **On Merge to Main**
    - Run full test suite
    - Build release artifacts
    - Update documentation site

3. **On Tag**
    - Create GitHub release
    - Publish to npm
    - Update package manager repositories

## Troubleshooting Common Issues

### Build Failures

**Problem**: Binary fails to build
**Solution**:
- Ensure Bun is installed and up-to-date
- Clear node_modules and reinstall: `rm -rf node_modules && bun install`
- Check for syntax errors in TypeScript files

### Test Failures

**Problem**: Tests fail unexpectedly
**Solution**:
- Clean artifacts: `make clean`
- Check test configuration in testme.json5
- Run with verbose mode to see detailed output
- Verify test file has correct permissions

### Installation Issues

**Problem**: Global installation fails
**Solution**:
- Check npm/bun is configured correctly
- Verify ~/.bun/bin is in PATH
- Try manual installation from source

## Index of Related Procedures

This is the main procedure document. Additional procedures may be documented in separate files:

- None currently

---

**Last Updated**: 2025-10-07
**Version**: 1.0
