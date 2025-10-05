# TestMe Changelog

## 2025-10-05 (Session 3)

### Enhanced Error Messages

#### Compiler Not Found Errors
- Added platform-specific installation instructions for GCC, Clang, and MSVC
- Error messages now include:
  - Download links for compilers
  - Package manager installation commands
  - Alternative compiler suggestions
  - PATH configuration instructions

#### Configuration File Errors
- Better JSON5 syntax error messages with common fixes
- File location prominently displayed in error output
- Hints for common mistakes (missing commas, unclosed brackets, etc.)
  - Permission error detection and fix suggestions

#### Compilation Error Hints
- Automatic detection of missing testme.h with installation instructions
- Library not found errors with configuration examples
- Header file not found with include path solutions
- Syntax error hints with common causes
- Undefined reference errors with troubleshooting steps

New file: [src/utils/error-messages.ts](../src/utils/error-messages.ts) - Centralized error message generation

## 2025-10-05 (Session 2)

### New Language Support
- **Python Test Support (.tst.py)** - Added full support for Python tests
  - Uses `python3` command (falls back to `python` if unavailable)
  - Automatic detection and execution
  - Example test: [test/python-basic.tst.py](../test/python-basic.tst.py)

- **Go Test Support (.tst.go)** - Added full support for Go tests
  - Uses `go run` for compilation and execution
  - Requires Go to be installed
  - Example test: [test/go-basic.tst.go](../test/go-basic.tst.go)

### Code Quality Improvements

#### Standardized Error Handling
- Moved duplicate `combineOutput()` method from all handlers to BaseTestHandler
- Added `createErrorResult()` helper method for consistent error reporting
- Improved error messages to include file paths for easier debugging
- All handlers now use standardized output formatting

#### Comprehensive Test Coverage
- **Platform Abstraction Layer Tests**
  - test/platform-detector.tst.ts - Platform and capability detection
  - test/platform-permissions.tst.ts - File permissions and executability
  - test/platform-process.tst.ts - Process spawning and management

- **Service Lifecycle Integration Tests**
  - test/service-lifecycle.tst.ts - Complete service lifecycle testing
  - Tests skip, prep, setup, and cleanup services
  - Verifies proper process management and cleanup

#### API Documentation
- Added comprehensive JSDoc documentation to internal APIs:
  - ConfigManager - Configuration loading and merging
  - ServiceManager - Service lifecycle management
  - ArtifactManager - Build artifact management
  - All methods now have proper parameter and return type documentation

### Test Results
All test suites pass successfully:
- ✓ Platform detector tests (10 tests)
- ✓ Platform permissions tests (10 tests)
- ✓ Platform process tests (10 tests)
- ✓ Service lifecycle tests (11 tests)
- ✓ String tests (4 tests)
- ✓ Glob expansion tests (4 tests)
- ✓ Python basic tests (4 tests)

Total: 53 passing tests

## 2025-10-05 (Session 1)

### Compiler Defaults
- **DEV**: Added default compiler flags for GCC/Clang
  - Added `-Wno-unused-parameter` to suppress unused parameter warnings
  - Added `-Wno-strict-prototypes` to suppress strict prototype warnings
  - Added `-I.` to include current directory by default
  - Added `-I/usr/local/include` and `-L/usr/local/lib` for standard Unix paths
  - Added `-I/opt/homebrew/include` and `-L/opt/homebrew/lib` for Homebrew (macOS)
- **CHORE**: Cleaned up redundant flags from all testme.json5 configuration files

### Documentation
- **DOC**: Added logo to README.md
- **DOC**: Updated README with complete special variable documentation (${OS}, ${ARCH}, ${CC}, ${TESTDIR})
- **DOC**: Added "Common Use Cases" section to README with practical examples:
  - Multi-platform C project configuration
  - Docker service integration
  - Conditional test execution
  - Test organization by depth
- **DOC**: Updated compiler configuration documentation to reflect per-compiler sections
- **DOC**: Documented variable expansion system comprehensively
- **DOC**: Created comprehensive CONTRIBUTING.md guide with:
  - Development workflow and setup instructions
  - Coding standards and style guidelines
  - Testing guidelines and best practices
  - Commit message conventions
  - Pull request process and templates
  - Guide for adding new features

### Code Quality
- **CHORE**: Added tsconfig.json with strict TypeScript checking enabled
- **CHORE**: Identified ~50 type errors to fix (type-only imports, override modifiers, strict nulls)
- **DOC**: Added comprehensive inline documentation to core modules:
  - TestRunner (src/runner.ts) - Architecture, execution flow, and responsibilities
  - ConfigManager (src/config.ts) - Hierarchical config system, discovery, merging
  - TestDiscovery (src/discovery.ts) - Test discovery engine, pattern matching modes

### Test Infrastructure
- **TEST**: Fixed all unit test failures - all tests now passing (26/26 tests pass)
- **TEST**: Added skip script for Windows-specific tests (test/windows/skip-if-not-windows.sh)
- **TEST**: Fixed CRLF line ending issues in portable shell tests
- **TEST**: Fixed import path in portable/glob-expansion.tst.ts
- **TEST**: Added environment variables to portable/testme.json5
- **TEST**: Linked testme package for JavaScript/TypeScript tests in test directory
- **TEST**: Added comprehensive special variable expansion test (test/portable/special-vars.tst.ts)
  - Tests ${PLATFORM}, ${OS}, ${ARCH}, ${CC}, ${PROFILE}, ${CONFIGDIR}, ${TESTDIR}
  - Tests combined variable expansion
  - Tests array expansion
  - Validates all special variable types

### Features
- **DEV**: Added test generation commands for easier project setup:
  - `tm --init` - Creates testme.json5 configuration file with sensible defaults
  - `tm --new <name>` - Scaffolds test files with templates
  - Supports C (.tst.c), Shell (.tst.sh), JavaScript (.tst.js), TypeScript (.tst.ts)
  - Auto-detects test type from extension (e.g., `tm --new math.c` creates math.tst.c)
  - Includes helpful templates and next-step instructions
  - Updated CLI usage text with new commands and examples
  - Updated man page (doc/tm.1) with new options and examples section
- **DEV**: Added special variable support for build configuration
  - Added `${TESTDIR}` - Relative path from executable to test directory
  - Added `${CONFIGDIR}` - Relative path from executable to config directory
  - Added `${OS}` - Operating system (macosx, linux, windows)
  - Added `${ARCH}` - CPU architecture (arm64, x64, x86)
  - Added `${PLATFORM}` - Combined OS-ARCH (e.g., macosx-arm64)
  - Added `${CC}` - Compiler name (gcc, clang, msvc)
  - Added `${PROFILE}` - Build profile with env/config/CLI support
- **DEV**: Added `--profile` CLI option to set build profile
- **DEV**: Added `profile` field to TestConfig for configuration files
- **DEV**: Added support for `compiler: 'default'` in testme.json5 to explicitly request auto-detection

### Documentation
- **DOC**: Updated man page with special variables documentation and `--profile` option
- **DOC**: Merged Windows installation guide into main README
- **DOC**: Added Windows-specific troubleshooting section to README
- **DOC**: Added PowerShell and Batch test examples to README

### Test Infrastructure
- **TEST**: Reorganized test directory structure
  - Moved portable unit tests to `test/portable/` subdirectory
  - Created `test/basic.tst.c` as top-level framework verification test
  - Moved test subdirectories (delay_test, disabled_test, enabled_test) to portable/
- **TEST**: Updated test configuration to include `-I.` and `-I..` for testme.h location

### Configuration
- **DEV**: Enhanced compiler flag merging to properly merge nested compiler.c configuration
- **DEV**: Special variables now resolve with proper priority: CLI > config > env > default

### Build System
- **CHORE**: Moved build.ps1 to bin/ directory for safe-keeping
- **CHORE**: Simplified build system relying on Makefile and bun commands

## 2025-10-02

### Windows Support
- **DEV**: Implemented native Windows support without WSL requirement
- **DEV**: Added PowerShell test support (`.tst.ps1`)
- **DEV**: Added Batch script test support (`.tst.bat`, `.tst.cmd`)
- **DEV**: Implemented cross-platform compiler detection and configuration
  - MSVC auto-detection via vswhere and manual search
  - MinGW-w64 support
  - LLVM/Clang support on Windows
- **DEV**: Added platform abstraction layer in `src/platform/`
  - detector.ts - Platform, compiler, shell detection
  - process.ts - Cross-platform process management
  - permissions.ts - File permission handling
  - shell.ts - Shell detection and execution
  - compiler.ts - Compiler abstraction and flag translation
- **DEV**: Implemented VS Code debugging support for Windows C tests
- **TEST**: Added Windows test examples in `test/windows/`
- **DOC**: Created Windows-specific documentation (WINDOWS_PORT.md, WINDOWS_INSTALL.md)

### Cross-Platform Enhancements
- **DEV**: Updated core components to use platform abstractions
- **DEV**: Fixed path separator handling (`;` on Windows, `:` on Unix)
- **DEV**: Implemented proper process termination (taskkill vs kill)
- **DEV**: Added binary extension management (`.exe` on Windows)

## Earlier Changes

### Core Features
- **DEV**: Multi-language test runner supporting Shell, C, JavaScript, TypeScript, Ejscript
- **DEV**: Automatic C compilation with GCC/Clang/MSVC
- **DEV**: Recursive test discovery with pattern matching
- **DEV**: Parallel test execution with configurable workers
- **DEV**: Hierarchical configuration system with testme.json5
- **DEV**: Environment variable expansion with glob patterns
- **DEV**: Service lifecycle management (skip, prep, setup, cleanup)
- **DEV**: Test depth requirements and enable/disable flags
- **DEV**: Multiple output formats (simple, detailed, JSON)
- **DEV**: Integrated debugging (GDB on Linux, Xcode on macOS, VS Code on Windows)
- **DEV**: Artifact management in `.testme` directories
- **DEV**: Test helper libraries (testme.h for C, testme.js for JS/TS)