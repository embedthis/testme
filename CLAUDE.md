# TestMe - Testing Framework (TestMe)

Testme is a simple, multi-language test runner built with Bun that discovers, compiles, and executes tests across shell, C, JavaScript, and TypeScript with configurable patterns and parallel execution.

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

This will build a binary `./testme` in the current directory.

To run tests, run:

```bash
make test

# Clean build artifacts and test artifacts
make clean
```

### Test the Application Itself

```bash
# Test discovery functionality
testme --list

# Run sample tests (from tests/ directory)
testme

# Test specific patterns
testme "*.tst.sh"
testme "*.tst.c"
```

## Architecture Overview

### Core Data Flow

1. **CLI parsing** (cli.ts) → **Configuration loading** (config.ts) → **Test discovery** (discovery.ts)
2. **Test execution** via **TestRunner** (runner.ts) which orchestrates **TestHandlers** (handlers/)
3. **Artifact management** (artifacts.ts) creates `.testme` directories for build outputs
4. **Result reporting** (reporter.ts) formats output in simple/detailed/JSON formats

### Key Architecture Patterns

#### Test Handler Strategy Pattern

Each test type (Shell, C, JS, TS) implements the `TestHandler` type:

-   `canHandle()` - Determines if handler processes a test file
-   `execute()` - Runs the test and returns `TestResult`
-   `prepare()`/`cleanup()` - Optional setup/teardown

#### Configuration Hierarchy

-   `ConfigManager.findConfig()` walks up directory tree looking for `testme.json`
-   User config is merged with defaults using spread operator pattern
-   Configuration affects compilation (C flags), execution (timeouts, parallelism), and output formatting

#### Artifact Management System

-   Each test gets a `.testme/` directory in the same location as the test file
-   C tests: stores compiled binaries and `compile.log`
-   Artifacts are cleaned up automatically or via `--clean` flag

### Critical File Relationships

#### Type System (`src/types.ts`)

All core types are defined here as `type` aliases (not interfaces):

-   `TestFile` - Represents discovered test with metadata
-   `TestResult` - Execution results with status/duration/output
-   `TestConfig` - Hierarchical configuration structure
-   `TestHandler` - Strategy interface for language handlers

#### Test Discovery Process (`src/discovery.ts`)

-   Recursively walks directory trees starting from current working directory
-   Filters files by extension patterns (`.tst.sh`, `.tst.c`, `.tst.js`, `.tst.ts`)
-   Respects exclude patterns (node_modules, .testme, hidden directories)
-   Creates `TestFile` objects with artifact directory paths

#### Language-Specific Execution

-   **Shell** (`handlers/shell.ts`): Detects shebang, makes executable, runs directly
-   **C** (`handlers/c.ts`): Compiles with gcc/clang to `.testme/binary`, then executes
-   **JS/TS** (`handlers/javascript.ts`, `handlers/typescript.ts`): Direct execution via Bun runtime

#### Test Orchestration (`src/runner.ts`)

-   Parallel vs sequential execution based on config
-   Batched parallel execution (workers) to prevent resource exhaustion
-   Each test gets its own handler via strategy pattern lookup

## Configuration System

### testme.json Structure

The configuration file uses this hierarchy:

-   `compiler.c` - C compilation settings (compiler, flags)
-   `execution` - Runtime behavior (timeout, parallel, workers)
-   `output` - Display formatting (verbose, format, colors)
-   `patterns` - File discovery (include/exclude glob patterns)

### Default Behavior

-   Uses `gcc` with `-std=c99 -Wall -Wextra` for C compilation
-   30-second timeout per test
-   Parallel execution with max 4 concurrent tests
-   Simple colored output format
-   Discovers all `.tst.*` files, excludes node_modules/.testme/hidden dirs

## Development Notes

### Code Style Requirements

-   4-space indentation (configured in .editorconfig and .vscode/settings.json)
-   TypeScript with strict mode and verbatim module syntax
-   Type-only imports where possible (import type { ... })
-   Comprehensive JSDoc comments on all public methods

### Test File Conventions

Test files must use these specific extensions:

-   `.tst.sh` - Shell script tests
-   `.tst.c` - C program tests
-   `.tst.js` - JavaScript tests
-   `.tst.ts` - TypeScript tests

Exit code 0 indicates test success, non-zero indicates failure.

### Adding New Language Support

1. Create handler in `src/handlers/` extending `BaseTestHandler`
2. Add file extension mapping to `TestDiscovery.TEST_EXTENSIONS`
3. Add new `TestType` enum value in `types.ts`
4. Register handler in `handlers/index.ts` `createHandlers()` function

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

# Important Notes
- Always format the code using an indent of 4 spaces
- Text inside comments should be indented by 4 spaces
- Update the DESIGN.md and man page whenever impactful changes are made to the code.