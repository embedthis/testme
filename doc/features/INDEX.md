# Feature Index

Feature-centric implementation units. Each active feature has its own directory containing at least a
plan; completed features whose plans are fully implemented are moved to
[../archive/features/](../archive/features/).

## Active

| Feature | Status | Description |
|---------|--------|-------------|
| [windows-optimization](windows-optimization/plan.md) | Completed 2025-11-27 | Windows performance work — cache shell, compiler, and config lookups; replace `tasklist` with `process.kill(pid, 0)`; dirent-based directory traversal. Shipped in v0.8.31; ready to archive. |

## Archived

| Feature | Outcome | Description |
|---------|---------|-------------|
| [healthcheck](../archive/features/HEALTHCHECK.md) | Shipped | Active service health checking (HTTP, TCP, script, file) replacing the fixed `setupDelay`. |
| [vs-project-generation](../archive/features/vs-project-generation.md) | Shipped | Visual Studio project generation, including Windows ARM64 support. Shipped in v0.8.32. |
| [ejsx-migration-docs](../archive/features/EJSX_MIGRATION_DOCS.md) | Superseded | Ejscript migration documentation. |

## Backlog

Forward-looking work — configuration validation, coverage reporting, tag-based filtering, additional
language support — is tracked in [../overview/roadmap.md](../overview/roadmap.md) rather than as feature
directories, and is promoted to a feature directory when work starts.
