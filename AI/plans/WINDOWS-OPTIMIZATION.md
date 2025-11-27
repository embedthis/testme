# TestMe Windows Performance Optimization Plan

## Implementation Status: ✅ COMPLETED (2025-11-27)

All optimizations in this plan have been implemented and tested. See CHANGELOG.md for detailed implementation notes.

| Phase | Item | Status |
|-------|------|--------|
| 1.1 | Cache Git Bash Path | ✅ Completed |
| 1.2 | Cache PowerShell Path | ✅ Completed |
| 1.3 | Reduce File Deletion Retry Parameters | ✅ Completed |
| 1.4 | Increase Windows Process Polling Interval | ✅ Completed |
| 2.1 | Replace `tasklist` with `process.kill(pid, 0)` | ✅ Completed |
| 3.1 | Cache Compiler Detection Results | ✅ Completed |
| 3.2 | Cache Config File Lookups | ✅ Completed |
| 3.3 | Cache `findInPath` Results | ✅ Completed |
| 4.1 | Use `readdir({ withFileTypes: true })` in Discovery | ✅ Completed |
| 4.2 | Use `readdir({ withFileTypes: true })` in Artifacts | ✅ Completed |

---

## Problem Statement
TestMe is significantly slower on Windows compared to macOS/Linux due to:
- Process spawning overhead (Windows spawns external processes where Unix uses syscalls)
- File system operation differences (slower stat, file locking after process exit)
- Shell detection requiring subprocess spawning per test
- Lack of caching for frequently-used values

## Implementation Plan

### Phase 1: Quick Wins (Minimal Changes, High Impact)

#### 1.1 Cache Git Bash Path
**File:** `src/platform/shell.ts`
**Change:** Add module-level cache for `findGitBash()` result
- Add `cachedGitBashPath` and `gitBashCached` variables at module level
- Return cached value on subsequent calls
- **Impact:** Eliminates ~200-400ms subprocess spawn per `.sh` test

#### 1.2 Cache PowerShell Path
**File:** `src/platform/shell.ts`
**Change:** Add module-level cache for `findPowerShell()` result
- Same pattern as Git Bash caching
- **Impact:** Eliminates subprocess spawn per `.ps1` test

#### 1.3 Reduce File Deletion Retry Parameters
**File:** `src/artifacts.ts`
**Change:** In `removeFileWithRetry()`:
- Reduce `maxRetries` from 10 to 5
- Reduce initial `delayMs` from 100 to 50
- Reduce max delay cap from 2000ms to 500ms
- **Impact:** Worst-case cleanup drops from ~13s to ~1.5s per locked file

#### 1.4 Increase Windows Process Polling Interval
**File:** `src/platform/process.ts`
**Change:** In `killProcessWindows()`:
- Increase `pollInterval` from 100ms to 250ms on Windows
- **Impact:** Reduces `tasklist` spawns from 50 to 20 per service shutdown

### Phase 2: Process Management Optimization

#### 2.1 Replace `tasklist` with `process.kill(pid, 0)`
**File:** `src/platform/process.ts`
**Change:** Rewrite `isProcessRunning()` to use Node's `process.kill(pid, 0)`:
```typescript
static async isProcessRunning(pid: number): Promise<boolean> {
    try {
        process.kill(pid, 0)
        return true
    } catch {
        return false
    }
}
```
- **Impact:** Eliminates ALL tasklist spawns during process monitoring (5-10s savings)

### Phase 3: Caching Infrastructure

#### 3.1 Cache Compiler Detection Results
**File:** `src/platform/detector.ts`
**Change:** Add static cache for `detectCompilers()`:
- Add `compilerCache` and `compilerCachePromise` static properties
- Return cached results on subsequent calls
- Handle concurrent requests with promise deduplication
- **Impact:** Eliminates 3-4 subprocess spawns per C test

#### 3.2 Cache Config File Lookups
**File:** `src/config.ts`
**Change:** Add Map-based cache for `findConfigFile()`:
- Cache keyed by start directory
- Return cached result for repeated lookups
- Add `clearConfigCache()` for testing
- **Impact:** Eliminates repeated directory walks for tests in same directories

#### 3.3 Cache `findInPath` Results
**File:** `src/platform/detector.ts`
**Change:** Add Map-based cache for `findInPath()`:
- Cache executable → path mappings
- Handle concurrent requests with promise Map
- **Impact:** Eliminates repeated `where`/`which` calls

### Phase 4: File System Optimization

#### 4.1 Use `readdir({ withFileTypes: true })` in Discovery
**File:** `src/discovery.ts`
**Change:** Modify `searchDirectory()`:
- Replace `readdir()` + `stat()` with `readdir({ withFileTypes: true })`
- Use `entry.isDirectory()` and `entry.isFile()` instead of `stat()`
- **Impact:** Reduces stat() calls by 50-70%

#### 4.2 Use `readdir({ withFileTypes: true })` in Artifacts
**File:** `src/artifacts.ts`
**Change:** Modify `removeDirectory()` and `findAndRemoveArtifactDirs()`:
- Same pattern as discovery optimization
- **Impact:** Eliminates all stat() calls during cleanup

#### 4.3 Optimize Config File Loading
**File:** `src/config.ts`
**Change:** In `findConfigFile()`:
- Try `Bun.file().text()` directly and catch ENOENT
- Instead of `exists()` then `text()` (two operations)
- **Impact:** Halves file system operations for config discovery

## Critical Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `src/platform/shell.ts` | P1 | Cache Git Bash and PowerShell paths |
| `src/platform/process.ts` | P1 | Use process.kill(pid,0), increase poll interval |
| `src/artifacts.ts` | P1 | Reduce retry params, use withFileTypes |
| `src/platform/detector.ts` | P2 | Cache compiler detection, findInPath |
| `src/config.ts` | P2 | Cache config lookups, optimize file loading |
| `src/discovery.ts` | P3 | Use readdir withFileTypes |

## Expected Impact

| Optimization | Time Saved | Risk |
|-------------|-----------|------|
| Shell path caching | 200-400ms per shell test | Very Low |
| process.kill(pid,0) | 5-10s per run with services | Low |
| Compiler caching | 500-1000ms per C test | Low |
| Retry reduction | 1-3s per failed test cleanup | Low |
| Config caching | 50-100ms per test | Low |
| readdir withFileTypes | 0.5-1s for large suites | Low |

**Total Expected Improvement:** 50-70% reduction in Windows test execution overhead

## Testing Strategy

1. Run existing test suite on Windows before/after each phase
2. Measure with `time tm` or similar timing
3. Test edge cases:
   - First run (cold cache)
   - Repeated runs (warm cache)
   - Tests with services (setup/cleanup)
   - Tests with compilation (C handler)
   - Failed tests (artifact cleanup)

## Implementation Order

1. **Phase 1** - Quick wins first (shell caching, retry reduction, poll interval)
2. **Phase 2** - Process management (process.kill optimization)
3. **Phase 3** - Caching infrastructure (compiler, config, findInPath)
4. **Phase 4** - File system optimization (readdir withFileTypes)

Each phase can be tested independently before moving to the next.
