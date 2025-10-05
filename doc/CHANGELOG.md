# TestMe Changelog

## 2025-10-05

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

### Features
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