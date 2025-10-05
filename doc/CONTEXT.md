# TestMe Development Context

## Project Overview

TestMe is a multi-language test runner built with Bun that discovers, compiles, and executes tests across shell, C, JavaScript, and TypeScript with configurable patterns and parallel execution. It's designed for embedded development environments and provides a consistent interface for running tests.

## Recent Major Issues Resolved

### 1. Parallel Execution Race Conditions (CRITICAL FIX)

**Problem**: When `workers > 1`, tests would fail with exit code 137, while `workers = 1` worked fine. No resource contention in the tests themselves.

**Root Causes Discovered**:
1. **Compilation Race Conditions**: C tests were compiling in shared working directories, causing file conflicts
2. **Shared Handler State**: Handler instances were reused across parallel test executions, creating race conditions

**Solutions Implemented**:
1. **Isolated Compilation**: Modified C handler to compile in unique `.testme` artifact directories per test
2. **Fresh Handler Instances**: Implemented factory pattern to create new handler instances for each test execution
3. **Absolute Path Resolution**: Converted relative paths to absolute paths for proper compilation isolation

**Key Code Changes**:
```typescript
// runner.ts - Fresh handler instances per test
private createFreshHandler(testFile: TestFile): TestHandler | undefined {
    switch (testFile.type) {
        case TestType.C: return new CTestHandler();
        case TestType.Shell: return new ShellTestHandler();
        // ... etc
    }
}

// handlers/c.ts - Isolated compilation directories
return await this.runCommand(compiler, args, {
    cwd: file.artifactDir, // Unique directory per test
    timeout: 60000
});
```

### 2. Xcode Debug Integration Issues

**Problem**: Xcode projects generated via `--debug` couldn't find dylib libraries at runtime, showing "dyld: Library not loaded" errors.

**Solution**: Enhanced Xcode project generation to include:
- Direct dylib linking instead of `-l` flags
- Proper `LD_RUNPATH_SEARCH_PATHS` configuration
- Variable expansion for `${...}` patterns in library paths
- Correct library categorization (custom dylibs vs system libraries)

### 3. Output Behavior Redesign

**Previous Behavior**: Silent by default, test names only shown in verbose mode
**New Behavior**:
- **Default**: Shows test names as they run with status and timing
- **Verbose**: Adds detailed error info and compilation commands
- **Quiet**: Silent operation with only exit codes

**Implementation**: Modified reporter and runner to always show progress unless in explicit quiet mode.

## Architecture Patterns Successfully Applied

### 1. Strategy Pattern - Test Handlers
- Each language (C, Shell, JS, TS) implements `TestHandler` interface
- Enables easy addition of new language support
- Provides isolated execution logic per language

### 2. Factory Pattern - Handler Creation
- Fresh handler instances created per test to eliminate shared state
- Critical for parallel execution safety
- Prevents race conditions between concurrent tests

### 3. Template Method Pattern - Base Handler
- `BaseTestHandler` provides common functionality
- Consistent command execution, timing, and error handling
- Code reuse across all handler implementations

### 4. Observer Pattern - Progress Reporting
- `TestReporter` observes test execution with configurable output modes
- Supports different verbosity levels
- Clean separation of execution and reporting concerns

## Critical Configuration Discoveries

### Parallel Execution Safety Requirements
1. **Unique Working Directories**: Each test must compile/execute in isolated directories
2. **Fresh State**: No shared handler state between parallel executions
3. **Absolute Paths**: Relative paths must be resolved to absolute for artifact directory compilation
4. **Batched Processing**: Controlled concurrency prevents system resource exhaustion

### Configuration Hierarchy
- CLI arguments override configuration files
- Test-specific `testme.json5` files override project-wide configuration
- Built-in defaults provide sensible fallbacks
- Configuration discovery walks up directory tree from test location

## File Structure and Responsibilities

### Core Modules
- `src/runner.ts` - Test orchestration and parallel execution management
- `src/handlers/c.ts` - C test compilation and execution with artifact management
- `src/artifacts.ts` - Build artifact management and Xcode project generation
- `src/reporter.ts` - Output formatting and progress reporting
- `src/config.ts` - Configuration loading and merging
- `src/discovery.ts` - Test file discovery and pattern matching

### Test Organization
- Tests belong in `test/` directory (not `tests/`)
- Test files use extensions: `.tst.sh`, `.tst.c`, `.tst.js`, `.tst.ts`
- Each test gets co-located `.testme/` directory for build artifacts
- Artifacts include compiled binaries, logs, and debug symbols

## Important Learnings

### 1. Race Condition Prevention
- **Never share state** between parallel operations
- **Isolate working directories** for compilation/execution
- **Use fresh instances** rather than singleton patterns for parallel-safe code
- **Absolute paths** prevent relative path conflicts in different working directories

### 2. Build System Integration
- **Xcode projects** require direct dylib linking, not `-l` flags
- **Variable expansion** (`${...}` patterns) must happen before project generation
- **Library categorization** needed for proper linking (system vs custom libraries)
- **rpath configuration** critical for runtime library loading

### 3. User Experience Design
- **Progressive verbosity**: Default → Verbose → Quiet modes serve different use cases
- **Immediate feedback**: Show test names as they run for better UX
- **Silent automation**: Quiet mode essential for CI/CD integration
- **Consistent patterns**: Similar CLI patterns across all operations

### 4. Documentation Maintenance
- **Synchronize changes**: Update DESIGN.md, man page, and CLI help together
- **Architecture decisions**: Document why choices were made, not just what
- **Real examples**: Include actual command examples and expected outputs

## Current Status

✅ **Parallel execution** works reliably with proper isolation
✅ **Xcode debugging** integration functions correctly
✅ **Output modes** provide appropriate verbosity levels
✅ **Documentation** comprehensively covers architecture and usage
✅ **Test suite** validates functionality across all supported languages

## Development Workflow

### Building and Testing
```bash
# Build binary
bun build ./src/index.ts --compile --outfile tm

# Run tests from test directory
cd test && ../tm

# Test different modes
../tm --quiet "*.tst.c"    # Silent mode
../tm --verbose "*.tst.c"  # Detailed output
../tm --debug math.tst.c   # Launch debugger
```

### Adding New Features
1. Update type definitions in `src/types.ts`
2. Implement handler logic following existing patterns
3. Update CLI parser and help text
4. Add configuration support if needed
5. Update documentation (DESIGN.md, man page)
6. Test parallel execution safety

## Future Considerations

### Potential Enhancements
- Watch mode for continuous test execution
- Coverage integration for C tests
- Plugin system for custom handlers
- Remote/distributed test execution
- Incremental compilation for faster builds

### Stability Priorities
- Maintain parallel execution safety
- Preserve configuration hierarchy
- Keep documentation synchronized
- Ensure cross-platform compatibility

This context captures the evolution from a basic test runner to a robust, parallel-safe, multi-language testing framework with proper isolation, debugging support, and user-friendly output modes.