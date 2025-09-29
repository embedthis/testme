# TestMe - Design Documentation

## Overview

TestMe is a multi-language test runner built with Bun that discovers, compiles, and executes tests across shell, C, JavaScript, and TypeScript with configurable patterns and parallel execution. It provides a simple, consistent interface for running tests in embedded development environments.

## Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLI Parser    │────│  Config Manager │────│   Test Runner   │
│   (cli.ts)      │    │   (config.ts)   │    │   (runner.ts)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐             │
                       │ Test Discovery  │◄────────────┤
                       │ (discovery.ts)  │             │
                       └─────────────────┘             │
                                                       │
                       ┌─────────────────┐             │
                       │  Test Reporter  │◄────────────┤
                       │  (reporter.ts)  │             │
                       └─────────────────┘             │
                                                       │
                       ┌─────────────────┐             │
                       │ Test Handlers   │◄────────────┘
                       │ (handlers/*.ts) │
                       └─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────┐       ┌──────────▼──┐        ┌──────────▼──┐
│   Shell    │       │      C      │        │JavaScript/TS│
│  Handler   │       │   Handler   │        │   Handler   │
└────────────┘       └─────────────┘        └─────────────┘
                             │
                    ┌────────▼────────┐
                    │ Artifact Manager│
                    │ (artifacts.ts)  │
                    └─────────────────┘
```

### Data Flow

1. **CLI Parsing** → **Configuration Loading** → **Test Discovery**
2. **Test Execution** via **TestRunner** orchestrating **TestHandlers**
3. **Artifact Management** creates `.testme` directories for build outputs
4. **Result Reporting** formats output in simple/detailed/JSON formats

## Design Patterns

### Strategy Pattern - Test Handlers

Each test type (Shell, C, JS, TS) implements the `TestHandler` interface:

```typescript
interface TestHandler {
    canHandle(file: TestFile): boolean;
    execute(file: TestFile, config: TestConfig): Promise<TestResult>;
    prepare?(file: TestFile): Promise<void>;
    cleanup?(file: TestFile, config?: TestConfig): Promise<void>;
}
```

**Benefits:**
- Easy to add new language support
- Isolated test execution logic
- Consistent interface across all test types

### Template Method Pattern - Base Handler

`BaseTestHandler` provides common functionality:

```typescript
abstract class BaseTestHandler implements TestHandler {
    protected async runCommand(command: string, args: string[], options: {}): Promise<CommandResult>
    protected getTestEnvironment(config: TestConfig): Record<string, string>
    protected createTestResult(...): TestResult
    protected async measureExecution<T>(fn: () => Promise<T>): Promise<{result: T, duration: number}>
}
```

**Benefits:**
- Code reuse for common operations
- Consistent error handling and timing
- Standardized command execution

### Factory Pattern - Handler Creation

Fresh handler instances are created for each test to avoid shared state:

```typescript
private createFreshHandler(testFile: TestFile): TestHandler | undefined {
    switch (testFile.type) {
        case TestType.C: return new CTestHandler();
        case TestType.Shell: return new ShellTestHandler();
        // ... etc
    }
}
```

**Benefits:**
- Eliminates race conditions in parallel execution
- Each test gets isolated handler state
- Clean separation of concerns

### Observer Pattern - Progress Reporting

`TestReporter` observes test execution progress with configurable output modes:

```typescript
// Default behavior: always show test names as they run
reporter.reportProgress(result);  // Shows: ✓ PASS test.tst.c (123ms)

// Unless in quiet mode (suppresses all output)
if (!this.isQuietMode(config)) {
    reporter.reportProgress(result);
}
```

**Output Modes:**
- **Default**: Shows test names, status, and timing as tests execute
- **Verbose**: Adds detailed error information and compilation commands
- **Quiet**: No output, only exit codes (for automation/scripting)

## Key Architecture Decisions

### 1. Parallel Execution Strategy

**Problem:** How to run tests concurrently without resource conflicts?

**Solution:** Batched parallel execution with configurable concurrency:

```typescript
// Process tests in batches
for (let i = 0; i < testSuite.tests.length; i += workers) {
    const batch = testSuite.tests.slice(i, i + workers);
    const batchPromises = batch.map(testFile => this.executeTest(testFile, config));
    const batchResults = await Promise.all(batchPromises);
}
```

**Benefits:**
- Controlled resource usage
- Prevents system overload
- Maintains test isolation

### 2. Artifact Management

**Problem:** Where to store compiled binaries and build artifacts?

**Solution:** Unique `.testme` directories per test location:

```typescript
// Each test gets its own artifact directory
const testFile: TestFile = {
    path: '/path/to/test.tst.c',
    artifactDir: '/path/to/.testme'  // Co-located with test
};
```

**Benefits:**
- No artifact conflicts between tests
- Easy cleanup and debugging
- Parallel compilation safety

### 3. Working Directory Management

**Problem:** What should be the working directory when tests execute?

**Solution:** Always use the test file's directory as the working directory:

```typescript
// All test handlers execute with CWD set to test directory
return await this.runCommand(binaryPath, [], {
    cwd: file.directory, // Always run test with CWD set to test directory
    timeout: config.execution?.timeout || 30000,
    env: this.getTestEnvironment(config)
});
```

**Benefits:**
- Tests can access relative files consistently
- Local configuration files are accessible
- Consistent behavior across all test types
- Xcode debugging projects also use test directory as working directory

**Implementation Details:**
- **C Tests**: Compiled in artifact directory, executed from test directory
- **Shell/JS/TS Tests**: Executed directly from test directory
- **Xcode Projects**: Include `customWorkingDirectory` scheme setting pointing to test directory

### 4. Configuration Hierarchy

**Problem:** How to handle project-specific vs global configuration?

**Solution:** Hierarchical config discovery walking up directory tree:

```typescript
// Walks up from test directory looking for testme.json5
const testSpecificConfig = await ConfigManager.findConfig(testFile.directory);
```

**Benefits:**
- Test-specific configuration overrides
- Project-wide defaults
- Flexible deployment scenarios

### 5. Fresh Handler Instances

**Problem:** Shared handler state causing race conditions in parallel execution?

**Solution:** Create fresh handler instances for each test:

```typescript
// OLD: Shared handlers (caused race conditions)
const handler = this.findHandler(testFile);

// NEW: Fresh instances (thread-safe)
const handler = this.createFreshHandler(testFile);
```

**Benefits:**
- Eliminates shared state race conditions
- Parallel execution safety
- Isolated test environments

## Module Responsibilities

### Core Modules

| Module | Responsibility | Key Classes |
|--------|---------------|-------------|
| `cli.ts` | Command-line argument parsing and validation | `CliParser` |
| `config.ts` | Configuration loading and merging | `ConfigManager` |
| `runner.ts` | Test orchestration and parallel execution | `TestRunner` |
| `discovery.ts` | Test file discovery and pattern matching | `TestDiscovery` |
| `reporter.ts` | Output formatting and progress reporting | `TestReporter` |
| `types.ts` | TypeScript type definitions | N/A |
| `index.ts` | Main application entry point | N/A |

### Handler Modules

| Module | Responsibility | Key Features |
|--------|---------------|--------------|
| `handlers/base.ts` | Common handler functionality | Command execution, timing, error handling |
| `handlers/c.ts` | C test compilation and execution | GCC/Clang compilation, debugging support |
| `handlers/shell.ts` | Shell script execution | Shebang detection, executable permissions |
| `handlers/javascript.ts` | JavaScript test execution | Bun runtime execution |
| `handlers/typescript.ts` | TypeScript test execution | Direct Bun TypeScript execution |

### Utility Modules

| Module | Responsibility | Key Features |
|--------|---------------|--------------|
| `artifacts.ts` | Build artifact management | Directory creation, cleanup, path resolution |
| `utils/glob-expansion.ts` | Path pattern expansion | `${...}` pattern resolution for include/library paths |
| `services.ts` | Background service management | Setup/cleanup process lifecycle |

## Implementation Details

### Test Discovery Process

1. **Recursive Directory Walking**: Starting from root, traverse all subdirectories
2. **Extension Matching**: Files ending in `.tst.sh`, `.tst.c`, `.tst.js`, `.tst.ts`
3. **Pattern Filtering**: Apply include/exclude glob patterns
4. **TestFile Creation**: Generate metadata including artifact directories

```typescript
// Test file structure
type TestFile = {
    path: string;           // Full path to test file
    name: string;           // Filename only
    extension: string;      // Test extension (.tst.c)
    type: TestType;         // Enum: Shell, C, JavaScript, TypeScript
    directory: string;      // Directory containing test
    artifactDir: string;    // .testme directory path
}
```

### C Test Compilation Pipeline

1. **Artifact Directory Creation**: Ensure `.testme` directory exists
2. **Glob Expansion**: Resolve `${...}` patterns in compiler flags
3. **Path Resolution**: Convert relative paths to absolute for artifact directory compilation
4. **Compilation**: Execute GCC/Clang with resolved flags and paths from artifact directory
5. **Execution**: Run compiled binary with working directory set to test directory
6. **Cleanup**: Remove artifacts unless `--keep` specified

```typescript
// Compilation: Uses artifact directory to avoid conflicts
return await this.runCommand(compiler, args, {
    cwd: file.artifactDir,  // Unique directory per test
    timeout: 60000
});

// Execution: Uses test directory for consistent file access
return await this.runCommand(binaryPath, [], {
    cwd: file.directory, // Always run test with CWD set to test directory
    timeout: config.execution?.timeout || 30000
});
```

### Parallel Execution Safety

**Race Condition Fixes Applied:**

1. **Compilation Working Directory**: Each test compiles in its own `.testme` directory
2. **Execution Working Directory**: All tests run with CWD set to their containing directory
3. **Fresh Handler Instances**: No shared state between parallel tests
4. **Absolute Path Resolution**: Library and include paths resolved to absolute paths
5. **Batched Execution**: Controlled concurrency prevents resource exhaustion

### Configuration System

**Configuration Priority (highest to lowest):**
1. CLI arguments
2. Test-specific `testme.json5` (nearest to test file)
3. Project `testme.json5` (walking up directory tree)
4. Built-in defaults

**Nested Configuration Discovery:**

TestMe implements a hierarchical configuration system that supports nested `testme.json5` files:

- **Per-test resolution**: Each test file gets its own configuration by walking up from the test file's directory
- **Directory tree walking**: Starting from the test file's location, searches each parent directory until finding a `testme.json5` or reaching the filesystem root
- **Closest wins**: Uses the first configuration file found (closest to the test file)
- **Configuration merging**: Test-specific configurations are merged with global settings, with test-specific values taking precedence
- **CLI preservation**: Command-line arguments override both test-specific and project-wide configuration values

This allows project-wide defaults at the repository root with test-specific overrides in subdirectories. For example:

```
project/
├── testme.json5          # Project defaults
├── module-a/
│   ├── testme.json5      # Module-specific settings
│   └── test.tst.c
└── module-b/
    └── test.tst.c        # Uses project defaults
```

**Configuration Structure:**
```typescript
type TestConfig = {
    enable?: boolean;            // Enable or disable tests in this directory
    compiler?: {
        c?: {
            compiler: string;    // 'gcc' or 'clang'
            flags: string[];     // Compilation flags
            libraries: string[]; // Libraries to link
        }
    };
    execution?: {
        timeout: number;         // Per-test timeout (ms)
        parallel: boolean;       // Enable parallel execution
        workers: number;         // Number of parallel workers
    };
    output?: {
        verbose: boolean;        // Detailed output
        format: string;          // 'simple' | 'detailed' | 'json'
        colors: boolean;         // ANSI color codes
    };
    patterns?: {
        include: string[];       // Include glob patterns
        exclude: string[];       // Exclude glob patterns
    };
    services?: {
        setup: string;           // Setup command
        cleanup: string;         // Cleanup command
        setupTimeout: number;    // Setup timeout (ms)
        cleanupTimeout: number;  // Cleanup timeout (ms)
        delay: number;           // Delay after setup before running tests (ms)
    };
}
```

## Directory-Level Test Control

TestMe provides configuration options to control test execution at the directory level:

### Test Enable/Disable

The `enable` field allows tests to be disabled for specific directories:

```json5
{
    enable: false  // Disables all tests in this directory
}
```

**Behavior:**
- **Default**: Tests are enabled (`enable: true`)
- **Disabled directories**: Tests are skipped entirely during execution
- **Verbose output**: Shows "🚫 Tests disabled in: <directory>" message when `--verbose` is used
- **Silent operation**: No message shown in normal mode
- **Discovery**: Disabled tests are filtered out from `--list` output

**Use Cases:**
- Temporarily disable flaky tests
- Skip tests in development branches
- Exclude tests that require specific hardware/environment
- Selective testing during debugging

### Service Initialization Delay

The `services.delay` field provides time for setup services to initialize:

```json5
{
    services: {
        setup: './start-database.sh',
        delay: 3000,  // Wait 3 seconds after setup before running tests
        cleanup: './stop-database.sh'
    }
}
```

**Behavior:**
- **Default**: No delay (`delay: 0`)
- **Timing**: Delay applied after setup service starts successfully
- **Verbose output**: Shows "⏳ Waiting {delay}ms for setup service to initialize..."
- **Service lifecycle**: Setup → Verify running → Delay → Tests → Cleanup

**Use Cases:**
- Database startup and connection establishment
- Web server initialization and port binding
- Service mesh or container orchestration startup
- Hardware initialization delays

**Implementation Details:**
- Delay occurs after the standard 1-second startup verification
- Services that fail to start will not trigger the delay
- Delay is per-configuration group, not global
- Multiple directories can have different delay settings

## Error Handling Strategy

### Graceful Degradation

- **Missing Config Files**: Use built-in defaults
- **Compilation Failures**: Report errors, continue with other tests
- **Permission Issues**: Warn and skip affected directories
- **Timeout Handling**: Kill processes cleanly, report timeout errors

### Error Context

All errors include:
- File path context
- Operation being performed
- Original error message
- Suggested resolution (where applicable)

```typescript
throw new Error(`Failed to compile ${file.path}: ${error}\nCheck compiler flags in testme.json5`);
```

## Performance Considerations

### Parallel Execution Optimization

- **Batched Processing**: Prevents system overload
- **Fresh Handler Instances**: Eliminates synchronization overhead
- **Isolated Directories**: No file system contention
- **Configurable Concurrency**: Tunable based on system resources

### Memory Management

- **Process Isolation**: Each test runs in separate Bun.spawn process
- **Artifact Cleanup**: Automatic cleanup unless `--keep` specified
- **Stream Handling**: Proper stdout/stderr stream management

### File System Optimization

- **Artifact Co-location**: `.testme` directories next to test files
- **Absolute Paths**: Eliminates path resolution overhead
- **Glob Caching**: Efficient pattern matching for large codebases

## Security Considerations

### Safe Defaults

- **Sandboxed Execution**: Tests run in isolated processes
- **Timeout Protection**: Prevents runaway processes
- **Path Validation**: Prevents directory traversal attacks
- **Command Injection Prevention**: Proper argument escaping

### Trust Model

- **Developer Control**: Assumes developers control test content
- **Local Execution**: Designed for development environments
- **No Remote Execution**: No network-based test execution

## Extensibility

### Adding New Language Support

1. **Create Handler Class**: Extend `BaseTestHandler`
2. **Implement Interface**: Provide `canHandle()` and `execute()` methods
3. **Register Handler**: Add to `createFreshHandler()` factory method
4. **Update Discovery**: Add file extension to `TEST_EXTENSIONS` mapping

```typescript
// Example: Adding Python support
export class PythonTestHandler extends BaseTestHandler {
    canHandle(file: TestFile): boolean {
        return file.type === TestType.Python;
    }

    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        // Implementation for Python test execution
    }
}
```

### Configuration Extension

- **New Config Sections**: Add to `TestConfig` type
- **Validation**: Implement in `ConfigManager`
- **CLI Integration**: Add parsing in `CliParser`
- **Handler Support**: Access via `config` parameter

## Testing Strategy

### Unit Tests

- **Handler Testing**: Mock file system and command execution
- **Configuration Testing**: Test loading and merging logic
- **Discovery Testing**: Test pattern matching and filtering
- **CLI Testing**: Test argument parsing and validation

### Integration Tests

- **End-to-End Scenarios**: Real test file execution
- **Parallel Execution**: Concurrency safety verification
- **Error Conditions**: Timeout, compilation failure, missing files
- **Platform Testing**: Cross-platform compatibility

## Future Enhancements

### Planned Features

1. **Watch Mode**: Continuous test execution on file changes
2. **Test Filtering**: More sophisticated filtering options
3. **Coverage Integration**: Code coverage reporting
4. **Remote Execution**: Distributed test execution
5. **Plugin System**: Third-party handler plugins

### Performance Improvements

1. **Incremental Compilation**: Only recompile changed tests
2. **Parallel Discovery**: Concurrent test file discovery
3. **Caching Layer**: Cache compilation results
4. **Resource Pooling**: Reuse compilation processes

## Conclusion

TestMe's architecture emphasizes simplicity, safety, and extensibility. The strategy pattern for handlers, fresh instance creation for parallel safety, and hierarchical configuration provide a robust foundation for multi-language testing in embedded development environments.

The key architectural decisions - batched parallel execution, isolated artifact management, and fresh handler instances - successfully resolve the inherent challenges of concurrent test execution while maintaining simplicity and performance.