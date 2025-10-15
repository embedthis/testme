# Jest/Vitest-Compatible API for TestMe

TestMe now supports a Jest/Vitest-compatible `expect()` API alongside the traditional `t*` functions. This allows developers familiar with Jest or Vitest to write tests using their preferred syntax.

## Quick Start

```javascript
import {expect} from 'testme'

//  Basic assertions
expect(1 + 1).toBe(2)
expect({a: 1}).toEqual({a: 1})
expect('hello world').toContain('world')
expect([1, 2, 3]).toHaveLength(3)

//  Negation with .not
expect(5).not.toBe(10)

//  Async/Promise support
await expect(Promise.resolve(42)).resolves.toBe(42)
await expect(Promise.reject(new Error('fail'))).rejects.toThrow('fail')
```

## API Reference

### Equality Matchers
- `toBe(expected)` - Strict equality
- `toEqual(expected)` - Deep equality
- `toStrictEqual(expected)` - Strict deep equality

### Truthiness Matchers
- `toBeTruthy()`, `toBeFalsy()`, `toBeNull()`, `toBeUndefined()`, `toBeDefined()`, `toBeNaN()`

### Type Matchers
- `toBeInstanceOf(constructor)` - Instance check
- `toBeTypeOf(type)` - typeof check

### Numeric Matchers
- `toBeGreaterThan(n)`, `toBeGreaterThanOrEqual(n)`, `toBeLessThan(n)`, `toBeLessThanOrEqual(n)`, `toBeCloseTo(n, precision?)`

### String/Collection Matchers
- `toMatch(pattern)` - String/regex match
- `toContain(item)` - Contains substring/item
- `toContainEqual(item)` - Deep array membership
- `toHaveLength(n)` - Length check

### Object Matchers
- `toHaveProperty(keyPath, value?)` - Property check
- `toMatchObject(pattern)` - Partial object match

### Error Matchers
- `toThrow(error?)`, `toThrowError(error?)` - Exception check

### Modifiers
- `.not` - Negation
- `.resolves` - Promise resolution
- `.rejects` - Promise rejection

## Migration from TestMe API

| TestMe API | Jest API |
|------------|----------|
| `teqi(x, y)` | `expect(x).toBe(y)` |
| `tneqi(x, y)` | `expect(x).not.toBe(y)` |
| `ttrue(condition)` | `expect(condition).toBeTruthy()` |
| `tfalse(condition)` | `expect(condition).toBeFalsy()` |
| `tnull(x)` | `expect(x).toBeNull()` |
| `tmatch(str, pattern)` | `expect(str).toMatch(pattern)` |
| `tcontains(str, substr)` | `expect(str).toContain(substr)` |

## Test Examples

See comprehensive test examples in the `test/jest-api/` directory:
- `test/jest-api/jest-api-basic.tst.ts` - Basic matchers
- `test/jest-api/jest-api-numbers.tst.ts` - Numeric comparisons
- `test/jest-api/jest-api-strings.tst.ts` - String/collection matchers
- `test/jest-api/jest-api-objects.tst.ts` - Object matchers
- `test/jest-api/jest-api-errors.tst.ts` - Error handling
- `test/jest-api/jest-api-async.tst.ts` - Async/promise support
- `test/jest-api/jest-api-compat.tst.ts` - API compatibility

For the full TestMe documentation, see [README.md](../README.md).
