# Configuration and Compiler Fixes - 2025-10-07

## Session Summary

Fixed multiple configuration and compiler-related issues affecting flag merging, platform-specific paths, and error reporting.

## Issues Addressed

### 1. Default PROFILE Variable

**Issue**: Default PROFILE was set to 'debug' instead of 'dev'

**Fix**:
- Changed default in `src/utils/glob-expansion.ts:144` from 'debug' to 'dev'
- Updated documentation in `src/types.ts:33` and `doc/tm.1:379`
- Priority order remains: `--profile` CLI > `env.PROFILE` > 'dev' (default)

### 2. Platform-Specific Include Paths

**Issue**: Homebrew paths (`/opt/homebrew/include`, `/opt/homebrew/lib`) were being added on all platforms including Linux

**Fix**:
- Modified `src/platform/compiler.ts:195-232` to conditionally add Homebrew paths only on macOS
- Linux now correctly receives only `~/.local/include` and `~/.local/lib`
- macOS receives both `~/.local` and Homebrew paths

**Code Changes**:
```typescript
// Before: Always added Homebrew paths
return ["-std=c99", ..., "-I/opt/homebrew/include", "-L/opt/homebrew/lib"];

// After: Conditional based on platform
const flags = ["-std=c99", ..., "-I~/.local/include", "-L~/.local/lib"];
if (PlatformDetector.isMacOS()) {
    flags.push("-I/opt/homebrew/include", "-L/opt/homebrew/lib");
}
return flags;
```

### 3. Compiler Flag Blending

**Issue**: Generic `compiler.c.flags` were being ignored when compiler-specific config (gcc/clang/msvc) existed

**Root Cause**:
- Old logic: IF compiler-specific config exists THEN use only those flags ELSE use generic
- This meant generic flags were replaced instead of merged

**Fix** (`src/handlers/c.ts:157-189`):
- Changed to always start with generic flags
- Then add compiler-specific flags on top
- Then add platform-specific flags on top

**Flag Hierarchy** (in order):
1. Compiler defaults (from CompilerManager)
2. Generic config flags (`compiler.c.flags`)
3. Compiler-specific flags (`compiler.c.gcc.flags`)
4. Platform-specific flags (`compiler.c.gcc.linux.flags`)

**Example**:
```json5
{
  compiler: {
    c: {
      flags: ['-I../include'],      // Always included
      gcc: {
        flags: ['-I../gcc-inc'],    // Added for GCC
        linux: {
          flags: ['-D_GNU_SOURCE']  // Added for GCC on Linux
        }
      }
    }
  }
}
```

Result: All flags are merged, not replaced.

### 4. Misleading testme.h Error Messages

**Issue**: Error "testme.h not found" appeared when linker failed with missing libraries

**Root Cause**:
```typescript
// Old logic (incorrect):
if (error.includes("testme.h") && error.includes("not found")) {
    // Triggered when testme.h appeared in warnings AND
    // "not found" appeared anywhere else (e.g., linker errors)
}
```

**Fix** (`src/handlers/c.ts:1059-1072`):
- Changed to regex patterns requiring both terms on same line
- Patterns match actual header errors like:
  - `testme.h: No such file or directory`
  - `fatal error: testme.h: No such file or directory`

### 5. Include Syntax Guidance

**Issue**: Error message incorrectly stated `#include "testme.h"` is wrong

**Reality**:
- Both `<testme.h>` and `"testme.h"` work when testme.h is in system include paths
- Quotes search current directory first, then fall back to system paths
- Angle brackets search only system paths

**Fix** (`src/utils/error-messages.ts:167-184`):
- Removed incorrect/misleading guidance about include syntax
- Focused on actual solutions (installation paths, -I flags)
- Noted both syntaxes are valid

### 6. Documentation Updates

**Added**: Comprehensive sample configuration file `doc/testme.json5`
- Documents all TestConfig properties
- Shows enable: true/false/'manual' options
- Demonstrates profile configuration
- Includes all execution and output options
- Referenced in DESIGN.md and REFERENCES.md

## Testing

### Test Case: `/Users/mob/c/r/test/string.tst.c`

**Initial Failure**: JSON5 syntax error in config
```json5
libraries: ['uctx' 'r', 'm'],  // Missing comma after 'uctx'
```

**Fix**: Added missing comma
```json5
libraries: ['uctx', 'r', 'm'],
```

**Result**: Test now passes with proper flag merging

## Files Modified

1. `src/utils/glob-expansion.ts` - Default PROFILE
2. `src/types.ts` - PROFILE documentation
3. `doc/tm.1` - Man page PROFILE default
4. `src/platform/compiler.ts` - Conditional Homebrew paths
5. `src/handlers/c.ts` - Flag blending logic, error detection
6. `src/utils/error-messages.ts` - Error message improvements
7. `doc/testme.json5` - Comprehensive sample config
8. `.agent/designs/DESIGN.md` - Added config reference
9. `.agent/references/REFERENCES.md` - Added config reference
10. `/Users/mob/c/r/test/testme.json5` - Fixed JSON5 syntax

## Impact

- ✅ Correct default profile for new users
- ✅ Platform-appropriate compiler flags on all OSes
- ✅ Proper flag merging preserves all configuration levels
- ✅ Accurate error messages for compilation failures
- ✅ Better user guidance for configuration

## Next Steps

- Monitor for any regressions in flag merging
- Consider validation for testme.json5 to catch syntax errors early
- Update CI/CD to test across all platforms with various configurations