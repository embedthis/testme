# TestMe — Product Overview

## What It Is

TestMe (`tm`) is a multi-language test runner built for **embedded systems**, **C/C++/Rust**, and
**core infrastructure projects** that use Make or CMake. It discovers, compiles, and executes tests
with configurable patterns and parallel execution, favouring simplicity and direct execution over a
heavyweight framework.

## Who It Is For

TestMe targets projects where tests must be compiled and run as native binaries, and where the build
system is a traditional one:

- **Embedded systems** — cross-platform firmware and IoT device testing
- **C/C++/Rust projects** — native compilation with GCC, Clang, or MSVC, then direct binary execution
- **Make/CMake-based projects** — integration with traditional build systems
- **Core infrastructure** — system-level components, libraries, and low-level tools
- **Multi-language test suites** — tests written in C, C++, shell, Python, Go, JavaScript, or TypeScript

## What It Does

- **Discovers** tests by glob pattern (`**/*.tst.c`, `**/*.tst.js`, and so on), with platform-specific
  patterns so a test can be restricted to one operating system.
- **Compiles** C tests with the platform compiler into a per-test `.testme/` artifact directory, caching
  binaries by modification time so unchanged tests are not rebuilt.
- **Executes** tests in parallel with a configurable worker count and per-test timeouts. A test passes if
  it exits zero.
- **Manages services** around tests through a lifecycle of global prep, skip, environment, prep, setup,
  cleanup, and global cleanup scripts, with health checks (HTTP, TCP, script, file) to detect service
  readiness rather than waiting a fixed delay.
- **Reports** results in simple, detailed, or JSON formats, and can stream live output with `--monitor`.

## Supported Test Types

Test type is determined by the file's final extension: `.c`, `.js`, `.ts`, `.sh`, `.ps1`, `.bat`, `.cmd`,
`.py`, `.go`, and `.es`. Naming before that extension is arbitrary, so a project can adopt whatever
convention its patterns configure.

## Runtime and Distribution

TestMe is written in TypeScript and runs on Bun, and is compiled to a standalone `tm` binary. It is
distributed as the npm package `@embedthis/testme`, which builds and installs the binary on postinstall,
along with the `testme.h` C header and the `tm` man page. Homebrew, winget, chocolatey, and apt packaging
also exist under `installs/`.

## Related Documents

- [roadmap.md](roadmap.md) — planned work and backlog
- [../architecture/system.md](../architecture/system.md) — architecture and design
- [../features/INDEX.md](../features/INDEX.md) — feature index
