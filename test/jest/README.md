# Jest/Vitest API Tests

This directory contains comprehensive tests for TestMe's Jest/Vitest-compatible `expect()` API.

## Test Files

- **[jest-api-basic.tst.ts](jest-api-basic.tst.ts)** - Basic matchers (toBe, toEqual, truthiness, type checks)
- **[jest-api-numbers.tst.ts](jest-api-numbers.tst.ts)** - Numeric comparison matchers (toBeGreaterThan, toBeCloseTo, etc.)
- **[jest-api-strings.tst.ts](jest-api-strings.tst.ts)** - String and collection matchers (toMatch, toContain, toHaveLength)
- **[jest-api-objects.tst.ts](jest-api-objects.tst.ts)** - Object property matchers (toHaveProperty, toMatchObject)
- **[jest-api-errors.tst.ts](jest-api-errors.tst.ts)** - Error and exception matchers (toThrow, toThrowError)
- **[jest-api-async.tst.ts](jest-api-async.tst.ts)** - Async/Promise support (.resolves, .rejects)
- **[jest-api-compat.tst.ts](jest-api-compat.tst.ts)** - Compatibility tests (old and new APIs together)

## Running Tests

```bash
# Run all Jest API tests
tm test/jest-api/

# Run specific test file
tm test/jest-api/jest-api-basic.tst.ts

# Run with verbose output
tm --verbose test/jest-api/

# List all Jest API tests
tm --list test/jest-api/
```

## Test Coverage

These tests verify:
- ✅ All 30+ matchers work correctly
- ✅ `.not` modifier negates matchers properly
- ✅ `.resolves` and `.rejects` handle promises correctly
- ✅ Deep equality algorithm handles complex objects
- ✅ Property detection works with undefined values
- ✅ Error matching supports strings, regex, and constructors
- ✅ Async/await patterns work as expected
- ✅ Both old and new APIs can coexist

## API Documentation

For complete API documentation, see:
- [../../doc/JEST_API.md](../../doc/JEST_API.md) - Full Jest/Vitest API reference
- [../../README.md](../../README.md) - Main TestMe documentation
- [../../src/modules/js/expect.js](../../src/modules/js/expect.js) - Implementation
- [../../src/modules/js/expect.d.ts](../../src/modules/js/expect.d.ts) - TypeScript types
