# MAP.md — Project Navigation

**Project**: TestMe (`tm`) — multi-language test runner
**Version**: 0.8.32

## System Summary

TestMe is a test runner for embedded systems, C/C++/Rust, and core infrastructure projects that build
with Make or CMake. It discovers, compiles, and executes tests across shell, PowerShell, Batch, C,
JavaScript, TypeScript, Python, Go, and Ejscript, with configurable discovery patterns and parallel
execution.

The tool is written in TypeScript and runs on Bun. The core flow is CLI parsing (`src/cli.ts`) →
configuration loading (`src/config.ts`) → test discovery (`src/discovery.ts`) → execution through
per-language handlers (`src/handlers/`) → reporting (`src/reporter.ts`). Configuration lives in
`testme.json5` files, which are discovered by walking up the directory tree and may inherit from a
parent config.

## Key Documents

| Document | Path | Description |
|----------|------|-------------|
| Product overview | [overview/product.md](overview/product.md) | What TestMe is and who it is for |
| Roadmap | [overview/roadmap.md](overview/roadmap.md) | Goals, technical debt, and ideas backlog |
| System architecture | [architecture/system.md](architecture/system.md) | Components, patterns, implementation detail |
| Jest/Vitest API | [architecture/components/jest_api.md](architecture/components/jest_api.md) | `describe`/`test`/`expect` API for JS and TS tests |
| Feature index | [features/INDEX.md](features/INDEX.md) | Features and their plans |
| Procedures | [operations/PROCEDURE.md](operations/PROCEDURE.md) | Testing and development procedures |
| Changelog | [sessions/CHANGELOG.md](sessions/CHANGELOG.md) | Development history |
| Release notes | [releases/](releases/) | Per-version release notes (v0.8.23 onward) |
| References | [references/REFERENCES.md](references/REFERENCES.md) | External documentation and resources |

## Navigation

- **New to the project?** Start with [overview/product.md](overview/product.md), then the root
  `README.md` for user-facing usage.
- **Looking for a feature?** Check [features/INDEX.md](features/INDEX.md).
- **Changing the code?** Read [architecture/system.md](architecture/system.md) and the conventions in
  the root `CLAUDE.md`.
- **Looking for history?** See [sessions/CHANGELOG.md](sessions/CHANGELOG.md) and
  [releases/](releases/). Superseded designs and completed plans are under [archive/](archive/).

## Current Status

v0.8.32 adds Visual Studio project generation for Windows ARM64, with special-variable expansion in
IDE project environments, ARM64 platform detection via `PROCESSOR_IDENTIFIER`, and library-name
preservation when linking. The most recent change fixed the npm package entry points, which pointed at
a `src/pkg/testme.js` file that does not exist; they now resolve to `src/modules/js/index.js`, so
`@embedthis/testme` is importable by package name.
