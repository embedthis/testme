# TestMe - Design Documentation

## Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Design Patterns](#design-patterns)
- [Implementation Details](#implementation-details)
  - [Test Discovery Process](#test-discovery-process)
  - [C Test Compilation Pipeline](#c-test-compilation-pipeline)
  - [Integrated Debugging Support](#integrated-debugging-support)
  - [Platform Abstraction Layer](#platform-abstraction-layer)
- [Test Macro System](MACRO_IMPROVEMENTS.md) - Type-specific assertion macros for C and JavaScript

## Overview

TestMe is a multi-language test runner built with Bun that discovers, compiles, and executes tests across shell, PowerShell, Batch, C, JavaScript, TypeScript, Python, Go, and Ejscript with configurable patterns and parallel execution. It provides a simple, consistent interface for running tests in embedded and cross-platform development environments.

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

Each test type (Shell, PowerShell, Batch, C, JS, TS, Python, Go, ES) implements the `TestHandler` interface:

```typescript
interface TestHandler {
    canHandle(file: TestFile): boolean
    execute(file: TestFile, config: TestConfig): Promise<TestResult>
    prepare?(file: TestFile): Promise<void>
    cleanup?(file: TestFile, config?: TestConfig): Promise<void>
}
```

**Benefits:**

-   Easy to add new language support
-   Isolated test execution logic
-   Consistent interface across all test types

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

-   Code reuse for common operations
-   Consistent error handling and timing
-   Standardized command execution

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

-   Eliminates race conditions in parallel execution
-   Each test gets isolated handler state
-   Clean separation of concerns

### Observer Pattern - Progress Reporting

`TestReporter` observes test execution progress with configurable output modes:

```typescript
// Default behavior: always show test names as they run
reporter.reportProgress(result) // Shows: ✓ PASS test.tst.c (123ms)

// Unless in quiet mode (suppresses all output)
if (!this.isQuietMode(config)) {
    reporter.reportProgress(result)
}
```

**Output Modes:**

-   **Default**: Shows test names, status, and timing as tests execute
-   **Verbose**: Adds detailed error information and compilation commands
-   **Quiet**: No output, only exit codes (for automation/scripting)

## Key Architecture Decisions

### 1. Parallel Execution Strategy

**Problem:** How to run tests concurrently without resource conflicts?

**Solution:** Batched parallel execution with configurable concurrency:

```typescript
// Process tests in batches
for (let i = 0; i < testSuite.tests.length; i += workers) {
    const batch = testSuite.tests.slice(i, i + workers)
    const batchPromises = batch.map((testFile) => this.executeTest(testFile, config))
    const batchResults = await Promise.all(batchPromises)
}
```

**Benefits:**

-   Controlled resource usage
-   Prevents system overload
-   Maintains test isolation

### 2. Artifact Management

**Problem:** Where to store compiled binaries and build artifacts?

**Solution:** Unique `.testme` directories per test location:

```typescript
// Each test gets its own artifact directory
const testFile: TestFile = {
    path: '/path/to/test.tst.c',
    artifactDir: '/path/to/.testme', // Co-located with test
}
```

**Benefits:**

-   No artifact conflicts between tests
-   Easy cleanup and debugging
-   Parallel compilation safety

### 3. Working Directory Management

**Problem:** What should be the working directory when tests execute?

**Solution:** Always use the test file's directory as the working directory:

```typescript
// All test handlers execute with CWD set to test directory
return await this.runCommand(binaryPath, [], {
    cwd: file.directory, // Always run test with CWD set to test directory
    timeout: config.execution?.timeout || 30000,
    env: this.getTestEnvironment(config),
})
```

**Benefits:**

-   Tests can access relative files consistently
-   Local configuration files are accessible
-   Consistent behavior across all test types
-   Xcode debugging projects also use test directory as working directory

**Implementation Details:**

-   **C Tests**: Compiled in artifact directory, executed from test directory
-   **Shell/JS/TS Tests**: Executed directly from test directory
-   **Xcode Projects**: Include `customWorkingDirectory` scheme setting pointing to test directory

### 4. Configuration Hierarchy

**Problem:** How to handle project-specific vs global configuration?

**Solution:** Hierarchical config discovery walking up directory tree:

```typescript
// Walks up from test directory looking for testme.json5
const testSpecificConfig = await ConfigManager.findConfig(testFile.directory)
```

**Benefits:**

-   Test-specific configuration overrides
-   Project-wide defaults
-   Flexible deployment scenarios

### 5. Fresh Handler Instances

**Problem:** Shared handler state causing race conditions in parallel execution?

**Solution:** Create fresh handler instances for each test:

```typescript
// OLD: Shared handlers (caused race conditions)
const handler = this.findHandler(testFile)

// NEW: Fresh instances (thread-safe)
const handler = this.createFreshHandler(testFile)
```

**Benefits:**

-   Eliminates shared state race conditions
-   Parallel execution safety
-   Isolated test environments

## Module Responsibilities

### Core Modules

| Module         | Responsibility                               | Key Classes     |
| -------------- | -------------------------------------------- | --------------- |
| `cli.ts`       | Command-line argument parsing and validation | `CliParser`     |
| `config.ts`    | Configuration loading and merging            | `ConfigManager` |
| `runner.ts`    | Test orchestration and parallel execution    | `TestRunner`    |
| `discovery.ts` | Test file discovery and pattern matching     | `TestDiscovery` |
| `reporter.ts`  | Output formatting and progress reporting     | `TestReporter`  |
| `types.ts`     | TypeScript type definitions                  | N/A             |
| `index.ts`     | Main application entry point                 | N/A             |

### Handler Modules

| Module                   | Responsibility                          | Key Features                                                                 |
| ------------------------ | --------------------------------------- | ---------------------------------------------------------------------------- |
| `handlers/base.ts`       | Common handler functionality            | Command execution, timing, error handling                                    |
| `handlers/c.ts`          | C test compilation and execution        | GCC/Clang compilation, debugging support                                     |
| `handlers/shell.ts`      | Shell/PowerShell/Batch script execution | Shebang detection, platform-specific shell selection, executable permissions |
| `handlers/javascript.ts` | JavaScript test execution               | Bun runtime execution                                                        |
| `handlers/typescript.ts` | TypeScript test execution               | Direct Bun TypeScript execution                                              |
| `handlers/python.ts`     | Python test execution                   | Python runtime execution                                                     |
| `handlers/go.ts`         | Go test execution                       | Go compilation and execution                                                 |
| `handlers/ejscript.ts`   | Ejscript test execution                 | Ejs runtime with module preloading                                           |

### Utility Modules

| Module                    | Responsibility                | Key Features                                          |
| ------------------------- | ----------------------------- | ----------------------------------------------------- |
| `artifacts.ts`            | Build artifact management     | Directory creation, cleanup, path resolution          |
| `utils/glob-expansion.ts` | Path pattern expansion        | `${...}` pattern resolution for include/library paths |
| `services.ts`             | Background service management | Setup/cleanup process lifecycle                       |

## Implementation Details

### Test Discovery Process

1. **Recursive Directory Walking**: Starting from root, traverse all subdirectories
2. **Extension Matching**: Files ending in `.tst.sh`, `.tst.ps1`, `.tst.bat`, `.tst.cmd`, `.tst.c`, `.tst.js`, `.tst.ts`, `.tst.py`, `.tst.go`, `.tst.es`
3. **Pattern Filtering**: Apply include/exclude glob patterns with platform-specific blending
4. **TestFile Creation**: Generate metadata including artifact directories

#### Platform-Specific Pattern Blending

Patterns support platform-specific additions that are deep blended with base patterns:

1. **Base Patterns**: Applied to all platforms (include/exclude)
2. **Platform Patterns**: Platform-specific patterns (windows/macosx/linux) are added to base patterns
3. **Deep Blending**: Platform patterns augment (not replace) the base patterns

**Example Configuration:**

```json5
{
    patterns: {
        include: ['**/*.tst.c', '**/*.tst.js'], // All platforms
        exclude: ['**/node_modules/**'],
        windows: {
            include: ['**/*.tst.ps1', '**/*.tst.bat'], // Added on Windows
        },
        macosx: {
            include: ['**/*.tst.sh'], // Added on macOS
        },
        linux: {
            include: ['**/*.tst.sh'], // Added on Linux
        },
    },
}
```

**Effective Patterns on Windows:**

-   Include: `**/*.tst.c`, `**/*.tst.js`, `**/*.tst.ps1`, `**/*.tst.bat`
-   Exclude: `**/node_modules/**`

**Effective Patterns on macOS:**

-   Include: `**/*.tst.c`, `**/*.tst.js`, `**/*.tst.sh`
-   Exclude: `**/node_modules/**`

#### Discovery vs Skip Scripts: Separation of Concerns

TestMe maintains a clear architectural distinction between test discovery and test execution:

**Discovery Phase** (`--list` and initial test finding):
-   Filters tests by **file extension compatibility** with the current platform
-   Shows all tests that the platform can **technically compile and execute**
-   Extension patterns (`.tst.c`, `.tst.sh`, `.tst.ps1`) determine capability

**Execution Phase** (actual test running):
-   Applies **skip scripts** for runtime policy decisions
-   Determines if tests **should run** based on dynamic conditions

**Key Architectural Decision:**

A test file like `test/windows/wmath.tst.c` will appear in discovery output on macOS because:
1. `.tst.c` is a cross-platform extension that macOS can compile and execute
2. The file extension indicates capability, not policy
3. The skip script in `test/windows/testme.json5` enforces the policy at runtime

**User Experience:**

```bash
# Discovery shows the test as a candidate
$ tm --list test/windows
test/windows/wmath.tst.c

# Execution skips it with explanation
$ tm test/windows
⏭️  Skipping tests in: test/windows - Skipping Windows-specific tests (not running on Windows)
```

**Rationale:**
-   **Capability vs Policy**: Extension patterns answer "can this platform run it?", skip scripts answer "should we run it?"
-   **Complete Visibility**: Users can see the full test suite across all platforms
-   **Dynamic Decisions**: Skip scripts can check environment variables, dependencies, hardware availability
-   **Consistent Semantics**: A `.tst.c` file is always discoverable on platforms with C compilers, regardless of directory location

```typescript
// Test file structure
type TestFile = {
    path: string // Full path to test file
    name: string // Filename only
    extension: string // Test extension (.tst.c)
    type: TestType // Enum: Shell, C, JavaScript, TypeScript
    directory: string // Directory containing test
    artifactDir: string // .testme directory path
}
```

### C Test Compilation Pipeline

#### Cross-Platform Compiler Support

TestMe automatically detects and configures the appropriate C compiler for the platform:

**Platform-Specific Compiler Detection:**

-   **Windows**: MSVC (via vswhere.exe + manual search), MinGW, or Clang
-   **macOS**: Clang or GCC
-   **Linux**: GCC or Clang

**Default Compiler Flags (automatically applied):**

-   **GCC/Clang**: `-std=c99 -Wall -Wextra -O0 -g`
-   **MSVC**: `/std:c11 /W4 /Od /Zi /nologo`

**Flag Merging**: User-specified flags are merged with defaults:

```typescript
// Defaults applied first, then user flags (user flags can override)
let flags = [...compilerConfig.flags, ...userFlags]
```

**Compiler Selection**: Three configuration modes:

1. **Auto-detect** (default): `compiler: 'default'` - Detects best compiler for platform
2. **Explicit compiler**: `compiler: 'gcc'` - Uses specified compiler on all platforms
3. **Per-platform map**: `compiler: { windows: 'msvc', macosx: 'clang', linux: 'gcc' }`
    - Automatically selects compiler based on current platform
    - Falls back to auto-detect if platform not specified in map

**Compiler-Specific Configuration**: Users can provide compiler-specific flags:

-   `compiler.c.gcc.flags` - Merged with GCC defaults
-   `compiler.c.clang.flags` - Merged with Clang defaults
-   `compiler.c.msvc.flags` - Merged with MSVC defaults

#### Compilation Pipeline Steps

1. **Artifact Directory Creation**: Ensure `.testme` directory exists
2. **Platform Resolution**: Resolve per-platform compiler selection from configuration
3. **Compiler Detection**: Auto-detect platform-appropriate compiler (or use resolved compiler)
4. **Flag Selection**: Choose compiler-specific config and merge with defaults
5. **Glob Expansion**: Resolve `${...}` patterns in compiler flags
6. **Path Resolution**: Convert relative paths to absolute for artifact directory compilation
7. **Compilation**: Execute compiler with resolved flags and paths from artifact directory
8. **Execution**: Run compiled binary with working directory set to test directory
9. **Cleanup**: Remove artifacts unless `--keep` specified

```typescript
// Compilation: Uses artifact directory to avoid conflicts
return await this.runCommand(compiler, args, {
    cwd: file.artifactDir, // Unique directory per test
    timeout: 60000,
})

// Execution: Uses test directory for consistent file access
return await this.runCommand(binaryPath, [], {
    cwd: file.directory, // Always run test with CWD set to test directory
    timeout: config.execution?.timeout || 30000,
})
```

### Integrated Debugging Support

TestMe provides integrated debugging support for all test languages using the `--debug` flag. The debugging system uses platform-appropriate debuggers and properly configures the environment and working directory.

#### C Language Debugging

C tests can be debugged with multiple debuggers based on platform:

**Platform Defaults:**
- **Windows**: Visual Studio (vs) for MSVC, VS Code (vscode) for GCC/MinGW
- **macOS**: Xcode (xcode) or LLDB (lldb)
- **Linux**: GDB (gdb)

**Debugger Configuration:**

Configure debugger in testme.json5:
```json5
{
    debug: {
        c: 'vs',           // Use Visual Studio
        // or: 'vscode'    // Use VS Code
        // or: 'gdb'       // Use GDB
        // or: 'lldb'      // Use LLDB
        // or: 'xcode'     // Use Xcode (macOS)
    }
}
```

**Environment and Working Directory:**

All debuggers receive:
1. **Processed environment** from testme.json5 via `getTestEnvironment()`:
   - Expanded `${PLATFORM}`, `${PROFILE}`, and other special variables
   - Resolved relative paths (e.g., `../build/...` → absolute paths)
   - Merged with system environment
   - Proper PATH for finding DLLs/shared libraries

2. **Correct working directory**:
   - Set to test file directory (`file.directory`)
   - NOT the artifact directory (`.testme/test/`)
   - Allows tests to access relative files from test location

**Visual Studio Debugger (Windows):**

```typescript
// Implementation: src/handlers/c.ts - launchVisualStudioDebugger()
const testEnv = await this.getTestEnvironment(config, file, 'msvc');
Bun.spawn(["cmd", "/c", "start", "Visual Studio Debugger", devenvPath, binaryPath], {
    cwd: file.directory,        // Test file directory, not .testme/
    env: { ...process.env, ...testEnv },  // Merged environment
});
```

**VS Code Debugger (Cross-platform):**

Creates `.vscode/launch.json` with:
- Program path to compiled executable
- Working directory set to test file directory
- Environment variables from testme.json5
- Platform-specific debugger type (cppvsdbg for MSVC, cppdbg for GCC/Clang)

**Interactive Debuggers (GDB, LLDB):**

Launch in terminal with full environment:
```typescript
await this.runCommand("gdb", [binaryPath], {
    cwd: file.directory,
    env: await this.getTestEnvironment(config, file, compiler),
});
```

#### JavaScript/TypeScript Debugging

Uses Bun's built-in debugger or VS Code with proper environment:
```json5
{
    debug: {
        js: 'vscode',  // VS Code debugger
        ts: 'vscode'   // VS Code debugger
    }
}
```

#### Python Debugging

Supports pdb (interactive) or VS Code:
```json5
{
    debug: {
        py: 'pdb'      // Python debugger
        // or: 'vscode' // VS Code debugger
    }
}
```

#### Go Debugging

Supports Delve or VS Code:
```json5
{
    debug: {
        go: 'delve'    // Delve debugger
        // or: 'vscode' // VS Code debugger
    }
}
```

#### Environment Variable Processing

The `getTestEnvironment()` method in BaseTestHandler:

1. **Expands special variables**: `${PLATFORM}`, `${PROFILE}`, `${CC}`, etc.
2. **Expands environment variables**: `${PATH}`, `${HOME}`, etc.
3. **Resolves relative paths**: `../build/...` relative to config directory
4. **Converts path separators**: Unix `:` to Windows `;` for PATH
5. **Merges platform-specific settings**: Windows/macOS/Linux sections

**Common Issue - ${CONFIGDIR} in Environment Variables:**

Do NOT use `${CONFIGDIR}` in environment PATH:
```json5
// WRONG - ${CONFIGDIR} is a relative path from executable
env: {
    PATH: '${CONFIGDIR}/../build/${PLATFORM}-${PROFILE}/bin;${PATH}'
}

// CORRECT - relative paths automatically resolved from config directory
env: {
    PATH: '../build/${PLATFORM}-${PROFILE}/bin;${PATH}'
}
```

### Platform Abstraction Layer

TestMe implements a comprehensive cross-platform abstraction layer in `src/platform/` that enables native support for Windows, macOS, and Linux without requiring emulation layers like WSL.

#### Platform Detection (`src/platform/detector.ts`)

Provides automatic detection of:

**Operating System:**

-   Windows 10/11
-   macOS (Darwin)
-   Linux distributions

**CPU Architecture:**

-   x64 (x86_64, AMD64)
-   ARM64 (AArch64)
-   x86 (i386, i686)
-   ARM (ARM32)

**C Compilers:**

-   **Windows**: MSVC (via vswhere.exe), MinGW-w64, LLVM/Clang
-   **macOS**: Clang (Xcode), GCC (Homebrew)
-   **Linux**: GCC, Clang

**Shell Interpreters:**

-   **Windows**: PowerShell, cmd.exe, Git Bash
-   **Unix**: bash, zsh, fish, sh

**Debuggers:**

-   **Windows**: VS Code (cppvsdbg for MSVC, cppdbg for GCC/MinGW)
-   **macOS**: Xcode, LLDB
-   **Linux**: GDB

#### Process Management (`src/platform/process.ts`)

Unified interface for cross-platform process operations:

**Process Termination:**

```typescript
// Windows: taskkill /PID <pid> /T /F
// Unix: kill -TERM <pid> → kill -KILL <pid>
await ProcessManager.killProcess(pid, graceful)
```

**Features:**

-   Graceful vs forceful termination
-   Process tree termination (including child processes)
-   Process status checking
-   Platform-appropriate timeout handling

#### File Permissions (`src/platform/permissions.ts`)

Handles platform differences in executable file handling:

**Windows:**

-   Extension-based execution (`.exe`, `.bat`, `.cmd`, `.ps1`)
-   No chmod equivalent
-   Automatic binary naming with `.exe` extension

**Unix:**

-   Permission bits via `chmod +x`
-   Shebang line detection
-   No file extension required

**Binary Path Resolution:**

```typescript
// Automatically adds .exe on Windows
const binaryPath = PermissionManager.getBinaryPath(basePath)
// Windows: path/to/test.exe
// Unix: path/to/test
```

#### Shell Execution (`src/platform/shell.ts`)

Cross-platform shell detection and execution:

**Shell Priority:**

-   **Windows**: PowerShell → cmd → Git Bash
-   **macOS**: zsh → bash → sh
-   **Linux**: bash → sh → dash

**Shell-Specific Execution:**

```typescript
// PowerShell: powershell.exe -ExecutionPolicy Bypass -File script.ps1
// Batch: cmd.exe /c call script.bat
// Bash: bash script.sh
```

**Extension Mapping:**

-   `.ps1` → PowerShell
-   `.bat`, `.cmd` → cmd.exe
-   `.sh` → bash/zsh/sh

#### Compiler Abstraction (`src/platform/compiler.ts`)

Unified C compiler interface with automatic flag translation:

**Compiler Detection Priority:**

-   **Windows**: MSVC → MinGW → Clang
-   **macOS**: Clang → GCC
-   **Linux**: GCC → Clang

**Automatic Flag Translation:**
| GCC/Clang | MSVC | Purpose |
|-----------|------|---------|
| `-Wall` | `/W4` | Warning level |
| `-std=c99` | `/std:c11` | Language standard |
| `-I<path>` | `/I<path>` | Include directory |
| `-L<path>` | `/LIBPATH:<path>` | Library directory |
| `-D<def>` | `/D<def>` | Preprocessor define |
| `-o <file>` | `/Fe:<file>` | Output file |
| `-g` | `/Zi` | Debug information |
| `-O0` | `/Od` | Optimization level |

**Default Compiler Configurations:**

```typescript
// GCC/Clang defaults
const gccDefaults = ['-std=c99', '-Wall', '-Wextra', '-O0', '-g']

// MSVC defaults
const msvcDefaults = ['/std:c11', '/W4', '/Od', '/Zi', '/nologo']
```

### Cross-Platform Test Types

TestMe supports platform-specific test types alongside cross-platform ones:

| Test Type  | Extension              | Windows   | macOS | Linux | Executor       |
| ---------- | ---------------------- | --------- | ----- | ----- | -------------- |
| Shell      | `.tst.sh`              | Git Bash¹ | ✅    | ✅    | bash/zsh/sh    |
| PowerShell | `.tst.ps1`             | ✅        | pwsh² | pwsh² | powershell.exe |
| Batch      | `.tst.bat`, `.tst.cmd` | ✅        | ❌    | ❌    | cmd.exe        |
| C          | `.tst.c`               | ✅        | ✅    | ✅    | MSVC/GCC/Clang |
| JavaScript | `.tst.js`              | ✅        | ✅    | ✅    | Bun            |
| TypeScript | `.tst.ts`              | ✅        | ✅    | ✅    | Bun            |
| Python     | `.tst.py`              | ✅        | ✅    | ✅    | python         |
| Go         | `.tst.go`              | ✅        | ✅    | ✅    | go             |
| Ejscript   | `.tst.es`              | ✅        | ✅    | ✅    | ejs            |

¹ Requires Git for Windows installation
² Requires PowerShell Core installation

### Platform-Specific Features

#### Windows

-   Binary extension: `.exe` automatically appended
-   PATH separator: `;` (semicolon)
-   Process termination: `taskkill /PID <pid> /T /F`
-   File executability: Extension-based (`.exe`, `.bat`, `.cmd`, `.ps1`)
-   Default compiler: MSVC (Visual Studio)
-   Debugger: VS Code with cppvsdbg (MSVC) or cppdbg (MinGW/Clang)

#### macOS

-   Binary extension: None
-   PATH separator: `:` (colon)
-   Process termination: `kill -TERM <pid>` then `kill -KILL <pid>`
-   File executability: Permission bits via `chmod +x`
-   Default compiler: Clang (Xcode)
-   Debugger: Xcode with lldb

#### Linux

-   Binary extension: None
-   PATH separator: `:` (colon)
-   Process termination: `kill -TERM <pid>` then `kill -KILL <pid>`
-   File executability: Permission bits via `chmod +x`
-   Default compiler: GCC
-   Debugger: GDB

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

-   **Per-test resolution**: Each test file gets its own configuration by walking up from the test file's directory
-   **Directory tree walking**: Starting from the test file's location, searches each parent directory until finding a `testme.json5` or reaching the filesystem root
-   **Closest wins**: Uses the first configuration file found (closest to the test file)
-   **Configuration merging**: Test-specific configurations are merged with global settings, with test-specific values taking precedence
-   **CLI preservation**: Command-line arguments override both test-specific and project-wide configuration values

**Configuration Inheritance:**

TestMe supports explicit inheritance from parent configurations using the `inherit` field:

-   **`inherit: true`** - Inherit all keys from parent config (compiler, debug, execution, output, patterns, services, env, profile)
-   **`inherit: ['env', 'compiler']`** - Selective inheritance of specified keys only
-   **`inherit: false` or omitted** - No inheritance (default behavior, uses only nearest config)

Inheritance features:
-   **Recursive**: Parent configs can also inherit from their parents, creating a chain
-   **Deep merge for objects**: Environment variables and compiler settings are combined (child + parent)
-   **Array concatenation**: Flags and libraries lists append parent items first, then child items
-   **Child overrides**: Primitive values from child always override parent values

Example with inheritance:

```
project/
├── testme.json5          # Project-wide settings (env, compiler flags)
├── module-a/
│   ├── testme.json5      # inherit: ['env', 'compiler'] + module-specific additions
│   └── test.tst.c        # Gets both project and module settings
└── module-b/
    └── test.tst.c        # Uses only project defaults (no inherit)
```

Without `inherit`, only the nearest `testme.json5` is used. With `inherit`, child configs can build upon parent settings.

**Configuration Structure:**

For a comprehensive example of all configuration options, see [doc/testme.json5](../../doc/testme.json5) which documents every available property with examples.

**Compiler Flag Merging Hierarchy:**

TestMe uses a hierarchical flag merging system that combines configuration at multiple levels:

1. **Compiler Defaults** - Platform-appropriate base flags (e.g., `-std=c99 -Wall -I~/.local/include`)
2. **Generic Config Flags** - `compiler.c.flags` - Applied to all compilers
3. **Compiler-Specific Flags** - `compiler.c.gcc.flags` - Applied only to specific compiler
4. **Platform-Specific Flags** - `compiler.c.gcc.linux.flags` - Applied to compiler on specific platform

All levels are **merged** (not replaced), allowing fine-grained control:

```json5
{
  compiler: {
    c: {
      flags: ['-I../include'],           // Always included for all compilers
      libraries: ['m'],                  // Always included
      gcc: {
        flags: ['-I../gcc-headers'],    // Added only when using GCC
        libraries: ['pthread'],          // Added only when using GCC
        linux: {
          flags: ['-D_GNU_SOURCE'],     // Added only for GCC on Linux
          libraries: ['rt']              // Added only for GCC on Linux
        }
      }
    }
  }
}
```

**Result on Linux with GCC:**
- Defaults: `-std=c99 -Wall -Wextra -O0 -g -I. -I~/.local/include -L~/.local/lib`
- + Generic: `-I../include`
- + GCC-specific: `-I../gcc-headers`
- + Platform-specific: `-D_GNU_SOURCE`
- Libraries: `-lm -lpthread -lrt`

**Variable Expansion System:**

TestMe supports `${...}` patterns in configuration values with multiple expansion modes:

1. **Special Variables** (highest priority):
   - `${TESTDIR}` - Relative path from executable to test directory (use in rpath/runtime paths)
   - `${CONFIGDIR}` - Relative path from executable to config directory (use in rpath/runtime paths)
   - `${OS}` - Operating system (macosx, linux, windows)
   - `${ARCH}` - CPU architecture (arm64, x64, x86)
   - `${PLATFORM}` - Combined OS-ARCH (e.g., macosx-arm64)
   - `${CC}` - Compiler name (gcc, clang, msvc)
   - `${PROFILE}` - Build profile (priority: CLI --profile > config > env.PROFILE > 'dev')

   **IMPORTANT - ${CONFIGDIR} and ${TESTDIR} Usage:**
   - These expand to **relative paths** from the compiled executable location to the directory
   - Example: executable at `.testme/test/test.exe`, config at `./testme.json5` → `${CONFIGDIR}` = `../..`
   - **Correct usage**: Runtime paths (rpath) in compiled executables
     ```json5
     gcc: {
       flags: ['-Wl,-rpath,$ORIGIN/${CONFIGDIR}/../build/${PLATFORM}-${PROFILE}/bin']
     }
     ```
   - **INCORRECT usage**: Environment variables like PATH
     ```json5
     // WRONG - results in incorrect path calculation
     env: {
       PATH: '${CONFIGDIR}/../build/${PLATFORM}-${PROFILE}/bin;${PATH}'
     }
     // CORRECT - relative paths in env are already resolved from config directory
     env: {
       PATH: '../build/${PLATFORM}-${PROFILE}/bin;${PATH}'
     }
     ```
   - Environment variable paths are **automatically resolved relative to config directory**
   - No need to use `${CONFIGDIR}` in environment variables

2. **Environment Variables** (middle priority):
   - `${PATH}` - Current system PATH
   - `${HOME}` - User home directory
   - `${USER}` - Current username
   - Any other environment variable via `${VAR_NAME}`

3. **Glob Patterns** (lowest priority):
   - `${../build/*/bin}` - Glob expansion to matching paths

**Expansion Priority**: Special variables → Environment variables → Glob patterns

**Expansion Capabilities and Limitations:**
- **Multiple variables**: `PATH: '${HOME}/bin:${PATH}'` - both expand independently
- **Sequential expansion**: Variables can reference other variables defined earlier
- **NOT supported**: Nested expansion like `${${VAR}}` - only single-level expansion
- **Single-pass**: Each variable is expanded once, not recursively re-evaluated

**Undefined Variable Behavior:**

Variables that cannot be resolved are handled differently based on type:

1. **Special Variables** (${PLATFORM}, ${OS}, ${CC}, etc.):
   - If undefined (e.g., no file context): Pattern remains as-is: `${PLATFORM}` → `${PLATFORM}`
   - Example: When called without file context, special vars are not expanded

2. **Environment Variables** (${PATH}, ${HOME}, custom ${VAR}):
   - If not found in process.env: Pattern remains as-is: `${UNDEFINED}` → `${UNDEFINED}`
   - Kept as literal string (may be processed as glob pattern later)
   - **Note**: This can result in literal `${UNDEFINED}` in final output

3. **Glob Patterns** (${../build/*/bin}):
   - If no files match: Wrapper removed but pattern kept: `${../build/*/bin}` → `../build/*/bin`
   - "Graceful degradation" - path might still be valid even without matches

**Example with undefined variables:**
```json5
env: {
    PATH: '${HOME}/bin:${UNDEFINED}:${../missing/*/path}:${PATH}'
}
```
Results in: `C:\Users\mob/bin:${UNDEFINED}:../missing/*/path;C:\Windows\System32;...`

**Future Enhancement**: Consider making undefined variable handling more consistent (warn, remove, or error on undefined variables). See PLAN.md for details.

**Cross-Platform PATH Handling:**

TestMe automatically converts path separators for the PATH environment variable on Windows:
- Configuration uses Unix-style `:` separators on all platforms
- Windows automatically converts `:` to `;` for PATH variable only
- Preserves drive letters (C:\, D:\) during conversion
- Example: `PATH: 'mydir:${PATH}'` becomes `mydir;C:\Windows\System32` on Windows

This enables cross-platform configuration files without platform-specific PATH syntax.

```typescript
type TestConfig = {
    enable?: boolean | 'manual' // Enable (true), disable (false), or run only when explicitly named ('manual')
    depth?: number // Minimum depth required to run tests (default: 0)
    profile?: string // Build profile (dev, prod, debug, release, etc.) - defaults to env.PROFILE or 'dev'
    compiler?: {
        c?: {
            compiler?: string // Optional: compiler path (auto-detects if not specified)
            flags?: string[] // Generic flags for all compilers (merged with defaults)
            libraries?: string[] // Generic libraries for all compilers
            gcc?: {
                // GCC-specific configuration
                flags?: string[] // Added to generic flags when using GCC
                libraries?: string[] // Added to generic libraries when using GCC
                windows?: { flags?: string[], libraries?: string[] } // Platform-specific additions
                macosx?: { flags?: string[], libraries?: string[] }
                linux?: { flags?: string[], libraries?: string[] }
            }
            clang?: {
                // Clang-specific configuration (same structure as gcc)
                flags?: string[]
                libraries?: string[]
                windows?: { flags?: string[], libraries?: string[] }
                macosx?: { flags?: string[], libraries?: string[] }
                linux?: { flags?: string[], libraries?: string[] }
            }
            msvc?: {
                // MSVC-specific configuration (Windows)
                flags?: string[] // Added to generic flags when using MSVC
                libraries?: string[]
                windows?: { flags?: string[], libraries?: string[] }
            }
        }
        es?: {
            require?: string | string[] // Modules to preload with --require
        }
    }
    execution?: {
        timeout: number // Per-test timeout (ms)
        parallel: boolean // Enable parallel execution
        workers: number // Number of parallel workers
    }
    output?: {
        verbose: boolean // Detailed output
        format: string // 'simple' | 'detailed' | 'json'
        colors: boolean // ANSI color codes
    }
    patterns?: {
        include: string[] // Base include glob patterns (all platforms)
        exclude: string[] // Base exclude glob patterns (all platforms)
        windows?: {
            // Windows-specific patterns (added to base)
            include?: string[] // Additional include patterns for Windows
            exclude?: string[] // Additional exclude patterns for Windows
        }
        macosx?: {
            // macOS-specific patterns (added to base)
            include?: string[] // Additional include patterns for macOS
            exclude?: string[] // Additional exclude patterns for macOS
        }
        linux?: {
            // Linux-specific patterns (added to base)
            include?: string[] // Additional include patterns for Linux
            exclude?: string[] // Additional exclude patterns for Linux
        }
    }
    services?: {
        skip?: string // Script to check if tests should run (0=run, non-zero=skip)
        prep?: string // Prep command
        setup?: string // Setup command
        cleanup?: string // Cleanup command
        skipTimeout?: number // Skip timeout (ms)
        prepTimeout?: number // Prep timeout (ms)
        setupTimeout?: number // Setup timeout (ms)
        cleanupTimeout?: number // Cleanup timeout (ms)
        delay?: number // Delay after setup before running tests (ms)
    }
    env?: {
        [key: string]: string // Environment variables with ${...} expansion
    }
}
```

## Directory-Level Test Control

TestMe provides configuration options to control test execution at the directory level:

### Skip Script

The `services.skip` field allows conditional test execution based on runtime checks:

```json5
{
    services: {
        skip: './check-requirements.sh', // Script to determine if tests should run
        skipTimeout: 30000,
    },
}
```

**Behavior:**

-   **Exit code 0**: Tests are enabled and will run
-   **Non-zero exit code**: Tests are skipped
-   **Message output**: stdout or stderr from skip script is displayed in verbose mode
-   **Execution order**: Runs before prep and setup scripts
-   **Per-directory**: Each configuration group can have its own skip logic

**Use Cases:**

-   Check for required dependencies or tools
-   Verify hardware availability (specific devices, sensors)
-   Check environment conditions (network connectivity, service availability)
-   Platform-specific test gating
-   License or feature flag checking

### Test Depth Requirements

The `depth` field allows tests to require a minimum depth level to run:

```json5
{
    depth: 2, // Requires --depth 2 or higher to run these tests
}
```

**Behavior:**

-   **Default**: Tests require depth 0 (run by default)
-   **CLI override**: Use `--depth N` to set current depth level
-   **Comparison**: Tests only run if `--depth N` >= config `depth`
-   **Use cases**: Mark integration tests, resource-intensive tests, or optional test suites

**Use Cases:**

-   Integration tests that should only run in CI
-   Performance tests requiring special environment
-   Long-running test suites
-   Tests requiring external services or hardware

### Test Enable/Disable/Manual

The `enable` field controls test execution with three modes:

```json5
{
    enable: true,      // Run tests normally (default)
    enable: false,     // Disable all tests in this directory
    enable: 'manual',  // Only run when explicitly named
}
```

**Behavior:**

-   **`enable: true` (default)**: Tests run normally when discovered by pattern matching
-   **`enable: false`**: Tests are skipped entirely during execution
    -   Verbose output shows "🚫 Tests disabled in: <directory>" message
    -   Silent operation shows no message
    -   Disabled tests are filtered out from `--list` output
-   **`enable: 'manual'`**: Tests only run when explicitly named (new in 2025-10-07)
    -   Excluded from directory-level patterns (e.g., running `tm` in a directory)
    -   Excluded from wildcard patterns (e.g., `*.tst.c`, `test*`)
    -   Included when named explicitly by:
        -   Full path: `tm test/slow.tst.c`
        -   Base name: `tm slow`
        -   Filename: `tm slow.tst.c`
    -   Verbose output shows "⏭️ Skipping manual tests in: <directory> (not explicitly named)" when excluded
    -   Manual tests appear in `--list` output when explicitly named

**Use Cases:**

-   **`enable: false`**:
    -   Temporarily disable flaky tests
    -   Skip tests in development branches
    -   Exclude tests that require specific hardware/environment
-   **`enable: 'manual'`**:
    -   Slow tests that should not run automatically (e.g., stress tests, benchmarks)
    -   Destructive tests that modify system state (e.g., database migrations, file system changes)
    -   Tests requiring special setup or credentials (e.g., cloud API tests, hardware-dependent tests)
    -   Resource-intensive integration tests
    -   Tests that should only run on-demand

### Service Initialization Delay

The `services.delay` field provides time for setup services to initialize:

```json5
{
    services: {
        setup: './start-database.sh',
        delay: 3000, // Wait 3 seconds after setup before running tests
        cleanup: './stop-database.sh',
    },
}
```

**Behavior:**

-   **Default**: No delay (`delay: 0`)
-   **Timing**: Delay applied after setup service starts successfully
-   **Verbose output**: Shows "⏳ Waiting {delay}ms for setup service to initialize..."
-   **Service lifecycle**: Skip → Prep → Setup → Verify running → Delay → Tests → Cleanup

**Use Cases:**

-   Database startup and connection establishment
-   Web server initialization and port binding
-   Service mesh or container orchestration startup
-   Hardware initialization delays

**Implementation Details:**

-   Delay occurs after the standard 1-second startup verification
-   Services that fail to start will not trigger the delay
-   Delay is per-configuration group, not global
-   Multiple directories can have different delay settings

## Error Handling Strategy

### Graceful Degradation

-   **Missing Config Files**: Use built-in defaults
-   **Compilation Failures**: Report errors, continue with other tests
-   **Permission Issues**: Warn and skip affected directories
-   **Timeout Handling**: Kill processes cleanly, report timeout errors

### Error Context

All errors include:

-   File path context
-   Operation being performed
-   Original error message
-   Suggested resolution (where applicable)

```typescript
throw new Error(`Failed to compile ${file.path}: ${error}\nCheck compiler flags in testme.json5`)
```

## Performance Considerations

### Parallel Execution Optimization

-   **Batched Processing**: Prevents system overload
-   **Fresh Handler Instances**: Eliminates synchronization overhead
-   **Isolated Directories**: No file system contention
-   **Configurable Concurrency**: Tunable based on system resources

### Memory Management

-   **Process Isolation**: Each test runs in separate Bun.spawn process
-   **Artifact Cleanup**: Automatic cleanup unless `--keep` specified
-   **Stream Handling**: Proper stdout/stderr stream management

### File System Optimization

-   **Artifact Co-location**: `.testme` directories next to test files
-   **Absolute Paths**: Eliminates path resolution overhead
-   **Glob Caching**: Efficient pattern matching for large codebases

## Security Considerations

### Safe Defaults

-   **Sandboxed Execution**: Tests run in isolated processes
-   **Timeout Protection**: Prevents runaway processes
-   **Path Validation**: Prevents directory traversal attacks
-   **Command Injection Prevention**: Proper argument escaping

### Trust Model

-   **Developer Control**: Assumes developers control test content
-   **Local Execution**: Designed for development environments
-   **No Remote Execution**: No network-based test execution

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
        return file.type === TestType.Python
    }

    async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
        // Implementation for Python test execution
    }
}
```

### Configuration Extension

-   **New Config Sections**: Add to `TestConfig` type
-   **Validation**: Implement in `ConfigManager`
-   **CLI Integration**: Add parsing in `CliParser`
-   **Handler Support**: Access via `config` parameter

## Testing Strategy

### Unit Tests

-   **Handler Testing**: Mock file system and command execution
-   **Configuration Testing**: Test loading and merging logic
-   **Discovery Testing**: Test pattern matching and filtering
-   **CLI Testing**: Test argument parsing and validation

### Integration Tests

-   **End-to-End Scenarios**: Real test file execution
-   **Parallel Execution**: Concurrency safety verification
-   **Error Conditions**: Timeout, compilation failure, missing files
-   **Platform Testing**: Cross-platform compatibility

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

## NPM Package Distribution

TestMe is distributed as an npm package (`@embedthis/testme`) with automatic installation:

### Installation Process

The package uses a dual-runtime wrapper approach to support both Bun and Node.js:

1. **Wrapper Script** (`bin/install.sh`): POSIX-compliant shell script that:

    - Detects if Bun is available, uses it preferentially
    - Falls back to Node.js if Bun is not found
    - Executes the main installation script

2. **Installation Script** (`bin/install.mjs`): ES module that:
    - Checks for Bun availability (required for building)
    - Builds the `tm` binary using `bun build --compile`
    - Platform detection and appropriate binary naming (`.exe` on Windows)
    - Creates shell wrapper to preserve working directory:
        - Actual binary installed as `tm-bin` (or `tm-bin.exe` on Windows)
        - Wrapper script installed as `tm` (shell script on Unix, batch file on Windows)
        - Wrapper captures current directory with `$(pwd)` and exports as `TM_INVOCATION_DIR`
        - Binary restores working directory on startup using `TM_INVOCATION_DIR`
        - Solves Bun compiled binary limitation where cwd changes to embedded source location
    - Installs binary to user-local locations (no sudo required):
        - All platforms: `~/.bun/bin/tm-bin` (actual binary) and `~/.bun/bin/tm` (wrapper)
    - Installs support files:
        - C header: `~/.local/include/testme.h`
        - Man page: `~/.local/share/man/man1/tm.1` (Unix only)
        - Ejscript module: `~/.ejs/testme.mod` and `~/.local/lib/testme/testme.mod` (if `ejsc` found)

### Package Configuration

Key `package.json` settings:

```json
{
    "name": "@embedthis/testme",
    "bin": {
        "tm": "./dist/tm"
    },
    "scripts": {
        "postinstall": "sh bin/install.sh"
    },
    "files": [
        "bin/install.sh",
        "bin/install.mjs",
        "src/**/*.ts",
        "src/**/*.js",
        "src/**/*.d.ts",
        "src/modules/es/testme.mod",
        "test/testme.h",
        "doc/tm.1",
        "testme.ts"
    ]
}
```

**Note:** The `dist/tm` binary is NOT included in the package files - it's built during postinstall. This ensures cross-platform compatibility and reduces package size.

### Installation Workflow

1. User runs: `npm install -g @embedthis/testme` or `bun install -g @embedthis/testme`
2. npm/bun downloads package (without pre-built binary)
3. Postinstall hook runs `bin/install.sh`
4. Wrapper detects runtime and executes `bin/install.mjs`
5. Installation script builds binary for current platform
6. Binary and support files installed to system paths
7. npm/bun links binary to user's PATH via the `bin` field

## Conclusion

TestMe's architecture emphasizes simplicity, safety, and extensibility. The strategy pattern for handlers, fresh instance creation for parallel safety, and hierarchical configuration provide a robust foundation for multi-language testing in embedded and cross-platform development environments.

The key architectural decisions - batched parallel execution, isolated artifact management, fresh handler instances, and platform abstraction layer - successfully resolve the inherent challenges of concurrent test execution while maintaining simplicity, performance, and cross-platform compatibility.
