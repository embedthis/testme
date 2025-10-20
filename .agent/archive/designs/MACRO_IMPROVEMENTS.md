# TestMe Macro Improvements

## Summary

Enhanced the TestMe C and JavaScript test macros with type-specific functions for better error reporting and type safety.

## Key Changes

### 1. Type-Specific Equality/Inequality Macros

**C Language:**
- `teqi(a, b, msg)` - int equality
- `teql(a, b, msg)` - long equality
- `teqll(a, b, msg)` - long long equality
- `teqz(a, b, msg)` - size_t/ssize equality
- `tequ(a, b, msg)` - unsigned int equality
- `teqp(a, b, msg)` - pointer equality
- Corresponding `tneq*` variants for inequality

**JavaScript:**
- Same naming convention as C
- `teqll` uses BigInt for comparison
- Uses strict equality (`===`) for type safety

### 2. Comparison Macros

Added greater/less than comparisons for int, long, and size types:

**Greater Than:**
- `tgti(a, b, msg)` - integer
- `tgtl(a, b, msg)` - long
- `tgtz(a, b, msg)` - size

**Greater Than or Equal:**
- `tgtei(a, b, msg)` - integer
- `tgtel(a, b, msg)` - long
- `tgtez(a, b, msg)` - size

**Less Than:**
- `tlti(a, b, msg)` - integer
- `tltl(a, b, msg)` - long
- `tltz(a, b, msg)` - size

**Less Than or Equal:**
- `tltei(a, b, msg)` - integer
- `tltel(a, b, msg)` - long
- `tltez(a, b, msg)` - size

### 3. NULL Checking Macros

- `tnull(ptr, msg)` - assert pointer is NULL
- `tnotnull(ptr, msg)` - assert pointer is not NULL

### 4. Internal Naming Improvements

**C Implementation:**
- Renamed `treport` → `tReport` (better naming convention)
- Renamed `treportx` → `tReportString` (clarity)
- Added type-specific report helpers:
  - `tReportInt` - for int types
  - `tReportLong` - for long types
  - `tReportLongLong` - for long long types
  - `tReportSize` - for size_t/ssize types
  - `tReportUnsigned` - for unsigned types
  - `tReportPtr` - for pointers

### 5. Backward Compatibility

**Deprecated but Functional:**
- `teq` → now aliases to `teqi`
- `tneq` → now aliases to `tneqi`

Both are marked as deprecated in documentation but remain functional for existing code.

## Benefits

1. **Better Error Messages**: Type-specific formatting shows values in appropriate format (decimal, hex, pointers)
2. **Type Safety**: Eliminates issues with wrong format specifiers
3. **Clearer Intent**: Function names indicate expected types
4. **More Comprehensive**: Covers common test scenarios (comparisons, NULL checks)
5. **Backward Compatible**: Existing code continues to work

## Migration Guide

### Before (Old Style)
```c
teq(count, 5, "Should be 5");           // Limited to int
teq(size, 1024, "Wrong size");          // Could overflow
teq(ptr, NULL, "Should be NULL");       // Wrong format specifier
```

### After (New Style)
```c
teqi(count, 5, "Should be 5");          // Explicit int
teqz(size, 1024, "Wrong size");         // Proper size_t handling
teqp(ptr, NULL, "Should be NULL");      // Proper pointer formatting
// Or use the dedicated NULL check:
tnull(ptr, "Should be NULL");
```

### Comparisons
```c
// Old style - needed manual comparison
ttrue(count > 0, "Should be positive");

// New style - clearer intent
tgti(count, 0, "Should be positive");
```

## Examples

See `test/portable/new-macros.tst.c` for comprehensive usage examples.

## Implementation Details

- All macros use if/else structure for safety in enclosing code
- Arguments evaluated only once (safe for function calls)
- Each macro provides file:line location on failure
- Consistent "Expected vs Received" error format
