# Jest/Vitest-Compatible API for TestMe

TestMe now supports a Jest/Vitest-compatible `expect()` API and `describe()`/`test()` structure alongside the traditional `t*` functions. This allows developers familiar with Jest or Vitest to write tests using their preferred syntax.

## Quick Start

### Basic Assertions with expect()

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

### Organizing Tests with describe() and test()

```javascript
import {describe, test, it, expect, beforeEach, afterEach} from 'testme'

await describe('Math operations', async () => {
    let value

    beforeEach(() => {
        value = 0
    })

    afterEach(() => {
        value = 0
    })

    test('addition works', () => {
        expect(2 + 2).toBe(4)
    })

    it('it() is an alias for test()', () => {
        expect(true).toBeTruthy()
    })

    test('async test', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(true).toBeTruthy()
    })

    await describe('nested group', () => {
        test('nested test', () => {
            expect(1).toBe(1)
        })
    })
})
```

## API Reference

### Test Organization Functions

TestMe provides `describe()` and `test()` functions for organizing tests in a structured hierarchy:

#### `describe(name, fn)`

Groups related tests together. Supports nesting for hierarchical test organization.

**Parameters:**
- `name` (string): Description of the test group
- `fn` (function): Function containing tests and nested describes

**Important Notes:**
- Top-level `describe()` blocks must be awaited
- Nested `describe()` blocks must be awaited within async describe functions
- Tests within a describe execute sequentially

**Example:**

```javascript
await describe('Calculator', async () => {
    test('basic math', () => {
        expect(2 + 2).toBe(4)
    })

    await describe('advanced operations', () => {
        test('power', () => {
            expect(Math.pow(2, 3)).toBe(8)
        })
    })
})
```

#### `test(name, fn)` / `it(name, fn)`

Defines an individual test case. `it()` is an alias for `test()`.

**Parameters:**
- `name` (string): Description of what the test validates
- `fn` (function): Test function (can be sync or async)

**Example:**

```javascript
test('validates user input', () => {
    expect(validateEmail('test@example.com')).toBeTruthy()
})

it('also works with it()', async () => {
    const result = await fetchData()
    expect(result).toBeDefined()
})
```

#### `beforeEach(fn)`

Registers a function to run before each test in the current `describe()` scope.

**Parameters:**
- `fn` (function): Setup function to run before each test

**Example:**

```javascript
await describe('Database tests', () => {
    let db

    beforeEach(() => {
        db = createTestDatabase()
    })

    test('can insert record', () => {
        db.insert({name: 'Alice'})
        expect(db.count()).toBe(1)
    })

    test('can query records', () => {
        db.insert({name: 'Bob'})
        expect(db.find('Bob')).toBeDefined()
    })
})
```

#### `afterEach(fn)`

Registers a function to run after each test in the current `describe()` scope.

**Parameters:**
- `fn` (function): Cleanup function to run after each test

**Example:**

```javascript
await describe('File operations', () => {
    let tempFile

    beforeEach(() => {
        tempFile = createTempFile()
    })

    afterEach(() => {
        deleteTempFile(tempFile)
        tempFile = null
    })

    test('writes data', () => {
        writeFile(tempFile, 'hello')
        expect(readFile(tempFile)).toBe('hello')
    })
})
```

#### `beforeAll(fn)`

Registers a function to run **once** before all tests in the current `describe()` scope.

**Parameters:**
- `fn` (function): Setup function to run once before tests

**Example:**

```javascript
await describe('HTTP Server tests', async () => {
    let server

    beforeAll(async () => {
        // Start server once for all tests
        server = await startTestServer()
    })

    afterAll(async () => {
        // Stop server after all tests
        await server.stop()
    })

    test('GET /api', async () => {
        const response = await fetch(`${server.url}/api`)
        expect(response.status).toBe(200)
    })

    test('POST /data', async () => {
        const response = await fetch(`${server.url}/data`, {method: 'POST'})
        expect(response.status).toBe(201)
    })
})
```

#### `afterAll(fn)`

Registers a function to run **once** after all tests in the current `describe()` scope.

**Parameters:**
- `fn` (function): Cleanup function to run once after all tests

**Example:**

```javascript
await describe('Database tests', async () => {
    let connection

    beforeAll(async () => {
        connection = await connectToDatabase()
        await connection.createTestTables()
    })

    afterAll(async () => {
        await connection.dropTestTables()
        await connection.close()
    })

    test('insert record', async () => {
        await connection.insert('users', {name: 'Alice'})
        expect(await connection.count('users')).toBe(1)
    })
})
```

#### `test.skip()` and `test.skipIf()`

Skip tests conditionally or unconditionally:

```javascript
// Unconditional skip
test.skip('not ready yet', () => {
    expect(newFeature()).toBeDefined()
})

// Conditional skip
const isCI = process.env.CI === 'true'
test.skipIf(isCI)('local only test', () => {
    expect(true).toBeTruthy()
})

// Platform-specific tests
const isWindows = process.platform === 'win32'
test.skipIf(isWindows)('Unix-only test', () => {
    expect(process.platform).not.toBe('win32')
})
```

#### `describe.skip()`

Skip an entire test suite:

```javascript
describe.skip('Experimental features', async () => {
    test('feature A', () => {
        // This never runs
    })

    test('feature B', () => {
        // This never runs
    })
})
```

#### Key Behaviors

1. **Sequential Execution**: Tests within a `describe()` block run sequentially, one after another
2. **Hook Scoping**: All hooks (`beforeEach`, `afterEach`, `beforeAll`, `afterAll`) are scoped to their `describe()` block
3. **Hook Execution Order**: `beforeAll` → `beforeEach` → test → `afterEach` → (repeat for each test) → `afterAll`
4. **Nested Hooks**: Parent `beforeAll` runs before child `beforeAll`; child `afterAll` runs before parent `afterAll`
5. **Hook Restoration**: When a `describe()` block exits, hooks are restored to the parent scope
6. **Error Handling**: When `expect()` is used inside `test()`, failures throw errors caught by the test runner
7. **Backward Compatibility**: When `expect()` is used outside `test()`, failures exit immediately (preserving backward compatibility)

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
