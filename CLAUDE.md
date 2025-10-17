# TestMe - Multi-Language Test Runner

TestMe is a specialized test runner designed for **embedded systems**, **C/C++/Rust**, and **core infrastructure projects** that use Make or CMake build systems. It discovers, compiles, and executes tests across multiple programming languages with configurable patterns and parallel execution -- ideal for low-level and performance-critical codebases.

## 🎯 Ideal Use Cases

TestMe is purpose-built for:

-   **Embedded systems** - Cross-platform firmware and IoT device testing
-   **C/C++/Rust projects** - Native compilation with GCC/Clang/MSVC, direct binary execution
-   **Make/CMake-based projects** - Seamless integration with traditional build systems
-   **Core infrastructure** - System-level components, libraries, and low-level tools
-   **Multi-language tests** - Write tests in C, C++, shell scripts, Python, Go or Javascript/Typescript

**TestMe focuses on simplicity and direct execution** for system-level projects.

## Development Commands

### Running the Application

```bash
# Run testme with current source
bun run src/index.ts

# Run with patterns (examples)
bun run src/index.ts "*.tst.c"
bun run src/index.ts --list
bun run src/index.ts --clean

# Development with hot reload
bun --hot src/index.ts
```

### Build and Test

To build the TestMe app, run:

```bash
make build
```

This will build a binary `dist/tm` (or `dist/tm.exe` on Windows).

To run tests, run:

```bash
make test

# Clean build artifacts and test artifacts
make clean
```

### Test the Application Itself

```bash
# Test discovery functionality
tm --list

# Run sample tests (from test/ directory)
tm

# Test specific patterns
tm "*.tst.sh"
tm "*.tst.c"
```

## Architecture Overview

### Core Data Flow

1. **CLI parsing** (cli.ts) → **Configuration loading** (config.ts) → **Test discovery** (discovery.ts)
2. **Test execution** via **TestRunner** (runner.ts) which orchestrates **TestHandlers** (handlers/)
3. **Artifact management** (artifacts.ts) creates `.testme` directories for build outputs
4. **Result reporting** (reporter.ts) formats output in simple/detailed/JSON formats

### Key Architecture Patterns

#### Test Handler Strategy Pattern

Each test type (Shell, PowerShell, Batch, C, JS, TS, Python, Go, ES) implements the `TestHandler` type:

-   `canHandle()` - Determines if handler processes a test file
-   `execute()` - Runs the test and returns `TestResult`
-   `prepare()`/`cleanup()` - Optional setup/teardown

#### Service Management System

-   `ServiceManager` handles skip, environment, prep, setup, and cleanup scripts
-   Skip scripts determine if tests should run (exit 0=run, non-zero=skip)
-   Environment scripts emit key=value lines to set environment variables
-   Prep runs once before tests (foreground)
-   Setup starts background service for tests
-   Cleanup runs after all tests complete

#### Configuration Hierarchy

-   `ConfigManager.findConfig()` walks up directory tree looking for `testme.json5`
-   User config is merged with defaults using spread operator pattern
-   Configuration affects:
    -   Test control (enable, depth requirements)
    -   Compilation (C flags, Ejscript modules)
    -   Execution (timeouts, parallelism, workers)
    -   Patterns (file discovery with platform-specific deep blending)
    -   Services (skip, environment, prep, setup, cleanup)
    -   Environment variables with `${...}` expansion
    -   Output formatting

#### Pattern Configuration with Platform Support

Patterns support platform-specific deep blending:

-   **Base patterns**: Applied to all platforms (include/exclude arrays)
-   **Platform-specific patterns**: Additions for windows/macosx/linux
-   **Deep blending**: Platform patterns are added to (not replace) base patterns
-   **Auto-detection**: Current platform determines which patterns to merge

Example:

```json5
{
    patterns: {
        include: ['**/*.tst.c', '**/*.tst.js'], // All platforms
        windows: {include: ['**/*.tst.ps1']}, // Added on Windows
        macosx: {include: ['**/*.tst.sh']}, // Added on macOS
        linux: {include: ['**/*.tst.sh']}, // Added on Linux
    },
}
```

Effective on Windows: `**/*.tst.c`, `**/*.tst.js`, `**/*.tst.ps1`
Effective on macOS: `**/*.tst.c`, `**/*.tst.js`, `**/*.tst.sh`

#### Artifact Management System

-   Each test gets a `.testme/` directory in the same location as the test file
-   C tests: stores compiled binaries and `compile.log`
-   Artifacts are cleaned up automatically or via `--clean` flag

### Test Runtime Modules (`src/modules/`)

TestMe provides runtime helpers for different test languages:

-   **C Module** (`src/modules/c/`): Contains `testme.h` header with test assertion macros

    -   `teq(got, expected, msg)` - Test equality
    -   `ttrue(condition, msg)` - Test boolean condition
    -   `tinfo(msg, ...)` - Output test information
    -   Installed to `~/.local/include/testme.h` for user-local use
    -   Copied to `test/testme.h` for local development

-   **JavaScript/TypeScript Module** (`src/modules/js/`): Test utilities for Bun runtime

    -   Importable via `import { ... } from 'testme'`
    -   Provides traditional test assertion helpers: `teq()`, `tneq()`, `ttrue()`, `tfalse()`, etc.
    -   Provides Jest/Vitest-compatible `expect()` API with 30+ matchers
    -   Full TypeScript support with type definitions in `expect.d.ts`
    -   Supports `.not` negation, `.resolves` and `.rejects` for promises
    -   Deep equality algorithm for objects, arrays, Maps, Sets, Dates, RegExp
    -   See `src/modules/js/expect.js` for implementation details

-   **Ejscript Module** (`src/modules/es/`): Test helpers for Ejscript runtime
    -   Loadable via `--require` flag in configuration

### Critical File Relationships

#### Type System (`src/types.ts`)

All core types are defined here as `type` aliases (not interfaces):

-   `TestFile` - Represents discovered test with metadata
-   `TestResult` - Execution results with status/duration/output
-   `TestConfig` - Hierarchical configuration structure
-   `TestHandler` - Strategy interface for language handlers

#### Test Discovery Process (`src/discovery.ts`)

**Pattern-Driven Discovery:**

-   Recursively walks directory trees starting from current working directory
-   Files are discovered based on configured include patterns (no hardcoded expectations)
-   File type determined by final extension: `.c` → C, `.js` → JavaScript, `.sh` → Shell, etc.
-   Platform-specific patterns (in `macosx:`, `linux:`, `windows:` sections) only apply on that platform
-   Any naming convention works: `*.tst.c`, `*.test.c`, `*.spec.js`, `*.tst.macosx.c`, etc.

**Pattern Matching Modes:**

-   **Glob patterns**: `**/*.tst.c`, `**/*.test.js`, `test/**/*.c`
-   **Platform-specific**: `**/*.tst.macosx.c` (only on macOS), `**/*.tst.win.c` (only on Windows)
-   **Base names**: `math` matches math.tst.c, math.tst.js, etc.
-   **Directory names**: `integration` runs all tests in that directory
-   **Path patterns**: `**/math*`, `test/unit/*.tst.c`

**Implementation:**

-   `matchesIncludePatterns()` checks files against patterns first
-   `analyzeFileByExtension()` extracts final extension to determine test type
-   `EXTENSION_TO_TYPE` map: `.c` → C, `.js` → JavaScript, `.sh` → Shell, etc.
-   Respects exclude patterns (node_modules, .testme, hidden directories)
-   Creates `TestFile` objects with artifact directory paths

#### Language-Specific Execution

-   **Shell** (`handlers/shell.ts`): Detects shebang, makes executable, runs directly (bash, sh, zsh)
-   **PowerShell** (`handlers/shell.ts`): Executes `.tst.ps1` files with PowerShell on Windows
-   **Batch** (`handlers/shell.ts`): Executes `.tst.bat` and `.tst.cmd` files on Windows
-   **C** (`handlers/c.ts`): Compiles with gcc/clang/msvc to `.testme/binary`, then executes
-   **JS/TS** (`handlers/javascript.ts`, `handlers/typescript.ts`): Direct execution via Bun runtime
-   **Python** (`handlers/python.ts`): Executes with python runtime
-   **Go** (`handlers/go.ts`): Compiles and executes with go runtime
-   **Ejscript** (`handlers/ejscript.ts`): Executes with ejs runtime, supports `--require` for module preloading

#### Test Orchestration (`src/runner.ts` and `src/index.ts`)

-   Groups tests by configuration directory for proper service management
-   For each configuration group:
    -   Check if tests are enabled (`enable` flag)
    -   Verify depth requirements (`--depth` vs config `depth`)
    -   Run skip script if configured (exit 0=run, non-zero=skip)
    -   Run environment script to get environment variables (key=value lines)
    -   Execute prep script (waits for completion)
    -   Start setup service (runs in background)
    -   Run tests with parallel or sequential execution
    -   Execute cleanup script
-   Parallel execution uses batched workers to prevent resource exhaustion
-   Each test gets its own handler instance via strategy pattern

## Configuration System

### testme.json5 Structure

The configuration file uses this hierarchy:

-   `enable` - Enable or disable tests in this directory (default: true)
-   `depth` - Minimum depth required to run tests (default: 0)
-   `compiler.c` - C compilation settings (compiler, flags, libraries)
    -   `compiler` - Can be: "default" (auto-detect), string (e.g., "gcc"), or platform map: `{ windows: 'msvc', macosx: 'clang', linux: 'gcc' }`
-   `compiler.es` - Ejscript settings (require modules)
-   `execution` - Runtime behavior (timeout in seconds, parallel, workers)
-   `output` - Display formatting (verbose, format, colors)
-   `patterns` - File discovery (include/exclude glob patterns) with platform-specific blending
-   `services` - Service scripts (skip, environment, prep, setup, cleanup)
-   `environment` - Environment variables with `${...}` glob expansion (replaces deprecated `env`)

### Default Behavior

-   Uses `gcc` with `-Wall -Wextra` for C compilation (no -std flag, uses compiler default)
-   30-second timeout per test (configured in seconds, not milliseconds)
-   Parallel execution with max 4 concurrent tests
-   Simple colored output format
-   Default patterns discover: `**/*.tst.c`, `**/*.tst.js`, `**/*.tst.ts`, `**/*.tst.py`, `**/*.tst.go`, `**/*.tst.es`
-   Platform-specific defaults: `**/*.tst.sh` (macOS/Linux), `**/*.tst.ps1` (Windows)
-   Excludes: node_modules, .testme, hidden directories
-   Tests enabled by default with depth requirement of 0

### Key Features

**Environment Variables:**

-   Values support `${...}` patterns for glob expansion
-   Paths resolved relative to config file directory
-   Example: `BIN: "${../build/*/bin}"` expands to actual build path

**Test Control:**

-   Set `enable: false` to disable tests in a directory
-   Set `depth: N` to require `--depth N` or higher to run tests
-   Skip script can dynamically determine if tests should run

**Service Lifecycle:**

-   Skip → Environment → Prep → Setup → Tests → Cleanup
-   Skip: exit 0=run, non-zero=skip (can output message)
-   Environment: emits key=value lines to set environment variables for services and tests
-   Prep: runs once, waits for completion
-   Setup: background service during tests
-   Cleanup: runs after all tests (kills setup if running)

**Platform-Specific Tests:**

Create tests that only run on specific platforms using pattern configuration:

```json5
{
    patterns: {
        include: ['**/*.tst.c'], // All platforms
        macosx: {
            include: ['**/*.tst.macosx.c'], // macOS only
        },
        linux: {
            include: ['**/*.tst.linux.c'], // Linux only
        },
        windows: {
            include: ['**/*.tst.win.c'], // Windows only
        },
    },
}
```

-   Tests not matching current platform are never discovered
-   File type determined by final extension (`.c`, `.js`, `.sh`)
-   Naming before final extension is arbitrary (`test.tst.macosx.c`, `windows-api.tst.win.c`)

## Development Notes

### Code Style Requirements

-   4-space indentation (configured in .editorconfig and .vscode/settings.json)
-   TypeScript with strict mode and verbatim module syntax
-   Type-only imports where possible (import type { ... })
-   Comprehensive JSDoc comments on all public methods

### Test File Conventions

**Flexible Naming:**

-   Test files can use ANY naming convention that matches configured patterns
-   Default patterns: `**/*.tst.sh`, `**/*.tst.c`, `**/*.tst.js`, etc.
-   Custom patterns supported: `**/*.test.c`, `**/*.spec.js`, `**/*_test.py`
-   Platform-specific naming: `**/*.tst.macosx.c` (macOS only), `**/*.tst.win.c` (Windows only)

**Recognized Test Types (by final extension):**

-   `.c` - C program tests (compiled with gcc/clang/msvc)
-   `.js` - JavaScript tests (Bun runtime)
-   `.ts` - TypeScript tests (Bun runtime)
-   `.sh` - Shell script tests (bash, sh, zsh)
-   `.ps1` - PowerShell script tests (Windows)
-   `.bat`, `.cmd` - Batch script tests (Windows)
-   `.py` - Python script tests
-   `.go` - Go program tests
-   `.es` - Ejscript tests (ejs runtime)

**Examples:**

-   `math.tst.c` - Standard C test (all platforms)
-   `windows-api.tst.win.c` - Windows-only C test
-   `posix-calls.tst.macosx.c` - macOS-only C test
-   `integration.test.js` - Custom naming if pattern configured
-   `unit_tests.spec.ts` - Custom naming if pattern configured

**Execution Rules:**

-   Exit code 0 indicates test success, non-zero indicates failure
-   All tests execute with their working directory set to the directory containing the test file
-   Platform-specific tests are only discovered on their target platform

### Adding New Language Support

1. Add new `TestType` enum value in `types.ts`
2. Create handler in `src/handlers/` extending `BaseTestHandler`
3. Add file extension mapping to `TestDiscovery.EXTENSION_TO_TYPE` in `discovery.ts` (e.g., `.rb` → Ruby)
4. Register handler in `handlers/index.ts` `createHandlers()` function
5. Add default pattern to `ConfigManager.DEFAULT_CONFIG.patterns` in `config.ts`
6. Update documentation (README.md, man page, DESIGN.md, CLAUDE.md)

### Pattern Matching Implementation

Pattern matching supports multiple modes (see `discovery.ts:filterByPatterns()`):

1. **Extension matching**: `.tst.c` matches by file type
2. **Directory component matching**: `integration` matches any test in directory named "integration"
3. **Path suffix matching**: `test/math.tst.c` matches paths ending with that pattern
4. **Path suffix without extension**: `test/math` matches `test/math.tst.c`, `test/math.tst.js`, etc.
5. **Glob matching**: Standard glob patterns for complex matching

Relative paths are calculated from rootDir to avoid matching absolute path components.

## Code Conventions

-   4-space indentation
-   120-character line limit
-   camelCase for functions and variables
-   one line between functions and between code blocks.
-   one line comments should use double slash
-   multiline comments should not begin each line with "\*"
-   Descriptive symbol names for variables and functions

## GIT

When committing changes, use the following format:

-   Commit message should be a single line describing the changes.
-   If the commit is a fix, the commit message should be prefixed with "FIX: "
-   If the commit is a feature or refactor, the commit message should be prefixed with "DEV: "
-   If the commit is cosmetic or formatting, or build infrastructure, the commit message should be prefixed with "CHORE: "
-   If the commit is a test, the commit message should be prefixed with "TEST: "
-   If the commit is a documentation change, the commit message should be prefixed with "DOC: "

### Bun Runtime Dependencies

-   Uses Bun for TypeScript/JavaScript execution (no separate transpilation step)
-   Uses Bun.spawn() for process execution with timeout/pipe handling
-   Uses Bun.file() API for file operations
-   Built as Bun target, not Node.js

## Key Implementation Details

### Path Handling in Reporter

The reporter converts absolute paths in output to relative paths (`reporter.ts:convertPathsToRelative()`):

-   Uses regex to find absolute paths in test output
-   Excludes URLs (http://, https://) via negative lookbehind
-   Converts paths relative to invocation directory for cleaner output

### Environment Variable Expansion

The `GlobExpansion` utility (`utils/glob-expansion.ts`) handles `${...}` patterns:

-   Expands glob patterns in environment variable values
-   Resolves paths relative to config directory
-   Only processes values containing `${` to avoid breaking URLs and other values
-   Example: `${../build/*/bin}` → `/path/to/build/macosx-arm64-debug/bin`

### Service Management

Services are managed per configuration group:

-   Each config directory gets its own service lifecycle
-   Setup processes run in background and are killed on exit or during cleanup
-   Skip scripts can output messages (stdout/stderr) that are displayed in verbose mode
-   Service timeouts and delays are configurable in seconds (skip, prep, setup, cleanup, delay)

## Installation and Distribution

### NPM Package Installation

TestMe is distributed as an npm package (`@embedthis/testme`) that:

-   Builds the `tm` binary during postinstall using `bin/install.mjs`
-   Installs binary to `~/.bun/bin/tm`
-   Installs `testme.h` C header to `~/.local/include/testme.h`
-   Installs man page to `~/.local/share/man/man1/tm.1` (Unix only)
-   Installs Ejscript `testme.mod` to `~/.ejs/testme.mod` and `~/.local/lib/testme/testme.mod` if `ejsc` is found

The installation script (`bin/install.mjs`) supports both Bun and Node.js runtimes via the `bin/install.sh` wrapper.

### Building for Distribution

```bash
# Build binary
bun run build              # Creates dist/tm or dist/tm.exe

# Test installation locally
npm pack                   # Creates tarball
npm install -g testme-*.tgz

# Publish to npm
npm publish
```

# Important Notes

-   Always format the code using an indent of 4 spaces
-   Text inside comments should be indented by 4 spaces
-   Update the DESIGN.md and man page whenever impactful changes are made to the code
-   When writing code, format using prettier with tab stops set to 4 spaces
-   All code is sufficiently commented with JSDoc-style comments
-   Tests in subdirectories need to have unique names to avoid conflicts with tests in the parent or sibling directories.
-   Create new unit tests in well named sub-directories under test
-   No need to document publicly Ejscript support.
-   Do not generate shell test or skip scripts if the test needs to run cross-platform. Only use \*.js in that case.
