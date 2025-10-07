# TestMe Changelog

## 2025-10-07

### Cross-Platform Test Compatibility

-   **DEV**: Converted shell-based tests to cross-platform JavaScript
    -   Converted `test/config/manual_test/another.tst.sh` → `another.tst.js`
    -   Converted `test/config/manual_test/manual.tst.sh` → `manual.tst.js`
    -   Converted `test/ejscript/skip.sh` → `skip.js` with platform-aware command detection
        -   Uses `which` on Unix and `where` on Windows to check for ejsc compiler
    -   Updated `test/config/manual-filtering.tst.ts` to reference `.tst.js` files
    -   Updated `test/ejscript/testme.json5` to use `skip.js`
    -   Ensures all CI-critical tests run on Windows, macOS, and Linux

### CI/CD Pipeline Enhancements

-   **DEV**: Enhanced GitHub Actions CI workflow for multi-language testing
    -   Added Python setup via `actions/setup-python@v5` with Python 3.x
    -   Added Go setup via `actions/setup-go@v5` with stable Go version
    -   Added verification steps to confirm Python and Go installation
    -   Ensures Python (`.tst.py`) and Go (`.tst.go`) tests can execute in CI
    -   Maintains existing C compiler, Bun runtime, and build verification

-   **DEV**: Disabled automatic tag-based releases in `release.yml`
    -   Commented out `push.tags` trigger to prevent automatic releases on tag creation
    -   Release workflow now only runs via manual `workflow_dispatch`
    -   Prevents accidental duplicate builds and allows controlled release process
    -   Maintains ability to create tags for version tracking without triggering release

### CI/CD Pipeline

-   **DEV**: Added GitHub Actions workflows for continuous integration and deployment
    -   Created `.github/workflows/ci.yml` for automated testing on push and pull requests
        -   Multi-platform testing on Ubuntu, macOS, and Windows
        -   Automatic C compiler installation (GCC, Clang, MSVC)
        -   Python and Go runtime installation for multi-language tests
        -   Build verification and test execution
        -   Test artifact upload on failure for debugging
        -   Lint and format checking
        -   Package building on main branch commits
    -   Created `.github/workflows/release.yml` for manual releases only
        -   Manual workflow dispatch support with version input
        -   Automatic GitHub release creation with release notes
        -   Automated NPM package publishing
        -   Tag-based triggers disabled (use manual dispatch only)
    -   All workflows use latest Bun runtime and actions versions
    -   Fail-fast disabled to see results on all platforms

### Manual Test Mode

-   **DEV**: Added `enable: 'manual'` configuration option for tests that should only run when explicitly named
    -   Tests with `enable: 'manual'` are excluded from directory-level and wildcard pattern matching
    -   Manual tests run when named by full path (e.g., `tm test/slow.tst.c`), base name (e.g., `tm slow`), or filename (e.g., `tm slow.tst.c`)
    -   Useful for slow tests, destructive tests, or tests requiring special setup that should not run automatically
    -   Updated `TestConfig.enable` type to accept `boolean | 'manual'` instead of just `boolean`
    -   Enhanced test filtering logic in `executeHierarchically()` to support manual test exclusion
    -   Improved pattern matching to distinguish explicit test names from wildcards
    -   Added `isExplicitPattern()`, `testMatchesExplicitPattern()`, and `getTestBaseName()` helper methods
    -   See documentation in man page (doc/tm.1) and configuration templates

### Testing

-   **TEST**: Added comprehensive test suite for manual test filtering
    -   Created `test/config/manual-filtering.tst.ts` with 5 test scenarios
    -   Created test fixtures in `test/config/manual_test/`
    -   Tests verify that manual tests are excluded from wildcards but run when explicitly named
    -   All 24 tests passing

### Documentation

-   **DOC**: Updated man page with detailed explanation of `enable: 'manual'` option
-   **DOC**: Updated `--init` template with comments explaining all three `enable` values (true, false, 'manual')
-   **DOC**: Updated PLAN.md to mark CI/CD integration as completed

## 2025-10-06

### Installation Changes

-   **DEV**: Changed installation path from `/usr/local` to `~/.local` for user-local installations
    -   Binary now installs to `~/.bun/bin/tm` instead of `/usr/local/bin/tm`
    -   Header installs to `~/.local/include/testme.h` instead of `/usr/local/include/testme.h`
    -   Man page installs to `~/.local/share/man/man1/tm.1` instead of `/usr/local/share/man/man1/tm.1`
    -   Ejscript module installs to `~/.local/lib/testme/testme.mod` instead of `/usr/local/lib/testme/testme.mod`
    -   JavaScript testme module is now linked via `bun link` during installation
    -   Tests can now import testme utilities via `import { teq, ttrue } from 'testme'`
    -   **Auto-linking**: JavaScript and TypeScript handlers automatically run `bun link testme` if not already linked
    -   Auto-linking searches up from test directory to find the closest `testme.json5` file
    -   Link is created in the directory containing `testme.json5`, not above it
    -   Only creates link if it doesn't exist or isn't already a symlink
    -   No longer requires sudo for installation
    -   Follows XDG Base Directory specification

### Compiler Configuration

-   **DEV**: Added per-platform compiler settings support
    -   Compiler-specific settings (gcc, clang, msvc) now support platform-specific overrides
    -   Platform subdirectories: `windows`, `macosx`, `linux`
    -   Platform settings are merged with base compiler settings (additive)
    -   Example: `clang: { flags: ['-O0'], macosx: { flags: ['-framework', 'IOKit'] } }`
    -   Allows platform-specific flags and libraries without duplicating common settings

-   **FIX**: Default compiler flags now use expanded home directory paths
    -   Changed from `-I~/.local/include` to `-I/Users/username/.local/include` (expanded at runtime)
    -   Changed from `-L~/.local/lib` to `-L/Users/username/.local/lib` (expanded at runtime)
    -   Added `os.homedir()` expansion in compiler.ts getDefaultFlags()

### Path Expansion

-   **DEV**: Added tilde (`~`) expansion support in Ejscript handler
    -   `compiler.es.require` configuration now supports `~/.local/lib/testme/testme.mod`
    -   Paths are expanded to full home directory at runtime
    -   Also supports `${~/...}` pattern from glob expansion

### Version Management

-   **DEV**: Automatic version synchronization from package.json
    -   Created `src/version.ts` that exports VERSION constant
    -   Added `bin/update-version.mjs` script to sync version from package.json
    -   Makefile now runs version update before build
    -   `tm --version` now displays correct version from package.json
    -   Added `prebuild` npm script to auto-update version

### Package Management

-   **FIX**: Added `trustedDependencies` to package.json for Bun
    -   Bun now automatically runs postinstall script without `--trust` flag
    -   Installation with `bun install @embedthis/testme` now works correctly

### Per-Platform Compiler and Debugger Selection

-   **DEV**: Added support for platform-specific compiler configuration
    -   Compiler field now accepts string, "default", or platform map: `{ windows: 'msvc', macosx: 'clang', linux: 'gcc' }`
    -   Platform map automatically selects compiler based on current platform
    -   Falls back to auto-detect if platform not specified in map
    -   Updated CompilerConfig type to support union type (string | platform map)
    -   Added `resolvePlatformCompiler()` method in ConfigManager
    -   Maintains backward compatibility with string values
    -   Added unit tests in `test/portable/compiler-platform.tst.ts`

-   **DEV**: Restructured debugger configuration to top-level `debug` field
    -   Moved from `compiler.c.debugger` to top-level `debug.c`
    -   Added support for all languages: `debug.c`, `debug.js`, `debug.ts`, `debug.py`, `debug.go`, `debug.es`
    -   Each language debugger accepts string, "default", or platform map
    -   Valid C debuggers: `xcode`, `lldb`, `gdb`, `vs`, `vscode`, or path to executable
    -   Platform map automatically selects debugger based on current platform
    -   Falls back to platform defaults if not specified (xcode on macOS, vs on Windows, gdb on Linux)
    -   Added `launchLldbDebugger()` method for LLDB debugger support
    -   Refactored `launchDebugger()` to use configured debugger from `debug.c`
    -   Created generic `resolvePlatformValue()` helper for compiler/debugger resolution

### Multi-Language Debug Support

-   **DEV**: Implemented debug mode for JavaScript, TypeScript, Python, and Go tests
    -   **JavaScript/TypeScript**: Integrated VSCode/Cursor debugging workflow
        -   Supports `vscode` debugger (default) and `cursor` editor
        -   Automatically creates `.vscode/launch.json` configuration in test directory
        -   Opens VSCode/Cursor with the test workspace (folder view)
        -   User sets breakpoints and launches debugger via F5
        -   Uses Bun's built-in debugging capabilities
        -   Requires Bun VSCode extension to be installed
        -   Allows custom debugger path
    -   **Python**: Supports both `pdb` (default) and `vscode` debuggers
        -   `pdb` mode launches Python debugger with interactive command prompt
        -   `vscode` mode provides VSCode debugging instructions
        -   Allows custom debugger path
        -   Displays helpful debugger command reference
    -   **Go**: Supports both `delve` (default) and `vscode` debuggers
        -   `delve` mode launches Delve debugger (dlv) with interactive prompt
        -   `vscode` mode provides VSCode debugging instructions
        -   Allows custom debugger path
        -   Displays helpful debugger command reference
    -   All handlers follow consistent pattern with `launchDebugger()` method
    -   Debug mode activated via `--debug` flag: `tm --debug <test_pattern>`
    -   Configuration via `debug.js`, `debug.ts`, `debug.py`, `debug.go` in testme.json5

### Documentation

-   **DOC**: Updated CLAUDE.md to reference `~/.local` instead of `/usr/local`
-   **DOC**: Updated installation paths in all documentation
-   **DOC**: Added documentation for per-platform compiler selection

## 2025-10-05 (Session 4)

### Installation Packages

Created complete installation package configurations for multiple package managers:

#### NPM/Bun Package (installs/npm/)

-   Full package.json configuration for npm registry
-   Postinstall script for building binary and installing support files
-   Handles testme.h header installation on Unix systems
-   Man page installation support
-   Cross-platform installation via `npm install -g @embedthis/testme` or `bun install -g @embedthis/testme`

#### Homebrew Formula (installs/homebrew/)

-   Complete Ruby formula for Homebrew tap
-   Automated build and installation process
-   Installs binary, header, man page, and JS/ES modules
-   Test validation in formula
-   Installation via `brew install testme`

#### WinGet Manifest (installs/winget/)

-   Complete manifest files for Windows Package Manager
-   Version, installer, and locale manifests
-   Support for x64 and ARM64 architectures
-   Portable installation with command alias
-   Installation via `winget install Embedthis.TestMe`

#### Chocolatey Package (installs/chocolatey/)

-   NuSpec package definition
-   PowerShell installation and uninstallation scripts
-   PATH management and header file installation
-   Bun runtime dependency
-   Installation via `choco install testme`

#### Debian/APT Package (installs/apt/)

-   Complete Debian packaging with control, rules, changelog, copyright
-   debhelper-compat support
-   Multi-architecture build support (amd64, arm64, armhf)
-   PPA publishing instructions
-   Installation via `sudo apt install testme`

#### Documentation Updates

-   Created master installation guide: [installs/README.md](../installs/README.md)
-   Updated main README with quick install instructions for all platforms
-   Added package-specific READMEs with build and publishing instructions
-   Updated PLAN.md marking package distribution tasks complete

All packages include:

-   tm binary installation
-   testme.h header for C tests
-   Man page documentation
-   JavaScript/TypeScript modules
-   Cross-platform support

## 2025-10-05 (Session 3)

### Enhanced Error Messages

#### Compiler Not Found Errors

-   Added platform-specific installation instructions for GCC, Clang, and MSVC
-   Error messages now include:
    -   Download links for compilers
    -   Package manager installation commands
    -   Alternative compiler suggestions
    -   PATH configuration instructions

#### Configuration File Errors

-   Better JSON5 syntax error messages with common fixes
-   File location prominently displayed in error output
-   Hints for common mistakes (missing commas, unclosed brackets, etc.)
    -   Permission error detection and fix suggestions

#### Compilation Error Hints

-   Automatic detection of missing testme.h with installation instructions
-   Library not found errors with configuration examples
-   Header file not found with include path solutions
-   Syntax error hints with common causes
-   Undefined reference errors with troubleshooting steps

New file: [src/utils/error-messages.ts](../src/utils/error-messages.ts) - Centralized error message generation

## 2025-10-05 (Session 2)

### New Language Support

-   **Python Test Support (.tst.py)** - Added full support for Python tests

    -   Uses `python3` command (falls back to `python` if unavailable)
    -   Automatic detection and execution
    -   Example test: [test/python-basic.tst.py](../test/python-basic.tst.py)

-   **Go Test Support (.tst.go)** - Added full support for Go tests
    -   Uses `go run` for compilation and execution
    -   Requires Go to be installed
    -   Example test: [test/go-basic.tst.go](../test/go-basic.tst.go)

### Code Quality Improvements

#### Standardized Error Handling

-   Moved duplicate `combineOutput()` method from all handlers to BaseTestHandler
-   Added `createErrorResult()` helper method for consistent error reporting
-   Improved error messages to include file paths for easier debugging
-   All handlers now use standardized output formatting

#### Comprehensive Test Coverage

-   **Platform Abstraction Layer Tests**

    -   test/platform-detector.tst.ts - Platform and capability detection
    -   test/platform-permissions.tst.ts - File permissions and executability
    -   test/platform-process.tst.ts - Process spawning and management

-   **Service Lifecycle Integration Tests**
    -   test/service-lifecycle.tst.ts - Complete service lifecycle testing
    -   Tests skip, prep, setup, and cleanup services
    -   Verifies proper process management and cleanup

#### API Documentation

-   Added comprehensive JSDoc documentation to internal APIs:
    -   ConfigManager - Configuration loading and merging
    -   ServiceManager - Service lifecycle management
    -   ArtifactManager - Build artifact management
    -   All methods now have proper parameter and return type documentation

### Test Results

All test suites pass successfully:

-   ✓ Platform detector tests (10 tests)
-   ✓ Platform permissions tests (10 tests)
-   ✓ Platform process tests (10 tests)
-   ✓ Service lifecycle tests (11 tests)
-   ✓ String tests (4 tests)
-   ✓ Glob expansion tests (4 tests)
-   ✓ Python basic tests (4 tests)

Total: 53 passing tests

## 2025-10-05 (Session 1)

### Compiler Defaults

-   **DEV**: Added default compiler flags for GCC/Clang
    -   Added `-Wno-unused-parameter` to suppress unused parameter warnings
    -   Added `-Wno-strict-prototypes` to suppress strict prototype warnings
    -   Added `-I.` to include current directory by default
    -   Added `-I/usr/local/include` and `-L/usr/local/lib` for standard Unix paths
    -   Added `-I/opt/homebrew/include` and `-L/opt/homebrew/lib` for Homebrew (macOS)
-   **CHORE**: Cleaned up redundant flags from all testme.json5 configuration files

### Documentation

-   **DOC**: Added logo to README.md
-   **DOC**: Updated README with complete special variable documentation (${OS}, ${ARCH}, ${CC}, ${TESTDIR})
-   **DOC**: Added "Common Use Cases" section to README with practical examples:
    -   Multi-platform C project configuration
    -   Docker service integration
    -   Conditional test execution
    -   Test organization by depth
-   **DOC**: Updated compiler configuration documentation to reflect per-compiler sections
-   **DOC**: Documented variable expansion system comprehensively
-   **DOC**: Created comprehensive CONTRIBUTING.md guide with:
    -   Development workflow and setup instructions
    -   Coding standards and style guidelines
    -   Testing guidelines and best practices
    -   Commit message conventions
    -   Pull request process and templates
    -   Guide for adding new features

### Code Quality

-   **CHORE**: Added tsconfig.json with strict TypeScript checking enabled
-   **CHORE**: Identified ~50 type errors to fix (type-only imports, override modifiers, strict nulls)
-   **DOC**: Added comprehensive inline documentation to core modules:
    -   TestRunner (src/runner.ts) - Architecture, execution flow, and responsibilities
    -   ConfigManager (src/config.ts) - Hierarchical config system, discovery, merging
    -   TestDiscovery (src/discovery.ts) - Test discovery engine, pattern matching modes

### Test Infrastructure

-   **TEST**: Fixed all unit test failures - all tests now passing (26/26 tests pass)
-   **TEST**: Added skip script for Windows-specific tests (test/windows/skip-if-not-windows.sh)
-   **TEST**: Fixed CRLF line ending issues in portable shell tests
-   **TEST**: Fixed import path in portable/glob-expansion.tst.ts
-   **TEST**: Added environment variables to portable/testme.json5
-   **TEST**: Linked testme package for JavaScript/TypeScript tests in test directory
-   **TEST**: Added comprehensive special variable expansion test (test/portable/special-vars.tst.ts)
    -   Tests ${PLATFORM}, ${OS}, ${ARCH}, ${CC}, ${PROFILE}, ${CONFIGDIR}, ${TESTDIR}
    -   Tests combined variable expansion
    -   Tests array expansion
    -   Validates all special variable types

### Features

-   **DEV**: Added test generation commands for easier project setup:
    -   `tm --init` - Creates testme.json5 configuration file with sensible defaults
    -   `tm --new <name>` - Scaffolds test files with templates
    -   Supports C (.tst.c), Shell (.tst.sh), JavaScript (.tst.js), TypeScript (.tst.ts)
    -   Auto-detects test type from extension (e.g., `tm --new math.c` creates math.tst.c)
    -   Includes helpful templates and next-step instructions
    -   Updated CLI usage text with new commands and examples
    -   Updated man page (doc/tm.1) with new options and examples section
-   **DEV**: Added special variable support for build configuration
    -   Added `${TESTDIR}` - Relative path from executable to test directory
    -   Added `${CONFIGDIR}` - Relative path from executable to config directory
    -   Added `${OS}` - Operating system (macosx, linux, windows)
    -   Added `${ARCH}` - CPU architecture (arm64, x64, x86)
    -   Added `${PLATFORM}` - Combined OS-ARCH (e.g., macosx-arm64)
    -   Added `${CC}` - Compiler name (gcc, clang, msvc)
    -   Added `${PROFILE}` - Build profile with env/config/CLI support
-   **DEV**: Added `--profile` CLI option to set build profile
-   **DEV**: Added `profile` field to TestConfig for configuration files
-   **DEV**: Added support for `compiler: 'default'` in testme.json5 to explicitly request auto-detection

### Documentation

-   **DOC**: Updated man page with special variables documentation and `--profile` option
-   **DOC**: Merged Windows installation guide into main README
-   **DOC**: Added Windows-specific troubleshooting section to README
-   **DOC**: Added PowerShell and Batch test examples to README

### Test Infrastructure

-   **TEST**: Reorganized test directory structure
    -   Moved portable unit tests to `test/portable/` subdirectory
    -   Created `test/basic.tst.c` as top-level framework verification test
    -   Moved test subdirectories (delay_test, disabled_test, enabled_test) to portable/
-   **TEST**: Updated test configuration to include `-I.` and `-I..` for testme.h location

### Configuration

-   **DEV**: Enhanced compiler flag merging to properly merge nested compiler.c configuration
-   **DEV**: Special variables now resolve with proper priority: CLI > config > env > default

### Build System

-   **CHORE**: Moved build.ps1 to bin/ directory for safe-keeping
-   **CHORE**: Simplified build system relying on Makefile and bun commands

## 2025-10-02

### Windows Support

-   **DEV**: Implemented native Windows support without WSL requirement
-   **DEV**: Added PowerShell test support (`.tst.ps1`)
-   **DEV**: Added Batch script test support (`.tst.bat`, `.tst.cmd`)
-   **DEV**: Implemented cross-platform compiler detection and configuration
    -   MSVC auto-detection via vswhere and manual search
    -   MinGW-w64 support
    -   LLVM/Clang support on Windows
-   **DEV**: Added platform abstraction layer in `src/platform/`
    -   detector.ts - Platform, compiler, shell detection
    -   process.ts - Cross-platform process management
    -   permissions.ts - File permission handling
    -   shell.ts - Shell detection and execution
    -   compiler.ts - Compiler abstraction and flag translation
-   **DEV**: Implemented VS Code debugging support for Windows C tests
-   **TEST**: Added Windows test examples in `test/windows/`
-   **DOC**: Created Windows-specific documentation (WINDOWS_PORT.md, WINDOWS_INSTALL.md)

### Cross-Platform Enhancements

-   **DEV**: Updated core components to use platform abstractions
-   **DEV**: Fixed path separator handling (`;` on Windows, `:` on Unix)
-   **DEV**: Implemented proper process termination (taskkill vs kill)
-   **DEV**: Added binary extension management (`.exe` on Windows)

## Earlier Changes

### Core Features

-   **DEV**: Multi-language test runner supporting Shell, C, JavaScript, TypeScript, Ejscript
-   **DEV**: Automatic C compilation with GCC/Clang/MSVC
-   **DEV**: Recursive test discovery with pattern matching
-   **DEV**: Parallel test execution with configurable workers
-   **DEV**: Hierarchical configuration system with testme.json5
-   **DEV**: Environment variable expansion with glob patterns
-   **DEV**: Service lifecycle management (skip, prep, setup, cleanup)
-   **DEV**: Test depth requirements and enable/disable flags
-   **DEV**: Multiple output formats (simple, detailed, JSON)
-   **DEV**: Integrated debugging (GDB on Linux, Xcode on macOS, VS Code on Windows)
-   **DEV**: Artifact management in `.testme` directories
-   **DEV**: Test helper libraries (testme.h for C, testme.js for JS/TS)
