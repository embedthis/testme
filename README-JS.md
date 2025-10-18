# TestMe JavaScript/TypeScript Testing API Reference

Complete API reference for writing unit tests in JavaScript and TypeScript using TestMe.

**Target Audience:** JavaScript/TypeScript developers writing unit tests, AI tools generating JS/TS tests.

**Related Documentation:**
- [README-TESTS.md](README-TESTS.md) - General test requirements and conventions
- [README-C.md](README-C.md) - C testing API
- [doc/JEST_API.md](doc/JEST_API.md) - Jest/Vitest API examples
- [README.md](README.md) - TestMe usage guide

---

## Module Import

Import functions from the `testme` module:

```javascript
import {expect, describe, test, teq, tinfo} from 'testme'
```

**Installation:** TestMe automatically installs and links the `testme` module when running JS/TS tests.

**Runtime:** All JavaScript and TypeScript tests execute using the Bun runtime with full TypeScript support.

---

## Table of Contents

1. [Traditional Assertion API](#traditional-assertion-api)
2. [Jest/Vitest expect() API](#jestvitest-expect-api)
3. [Test Organization API (describe/test)](#test-organization-api)
4. [Environment Access Functions](#environment-access-functions)
5. [Output Functions](#output-functions)

---

## Traditional Assertion API

### Equality Functions

#### teq()
```typescript
function teq(received: any, expected: any, msg?: string): void
```
**Description:** Assert two values are equal using deep comparison.

**Parameters:**
- `received` - Value produced by code under test
- `expected` - Expected value
- `msg` - Optional description

**Behavior:** On failure, prints expected vs actual values and exits with code 1.

**Alias:** Use type-specific functions for clarity: `teqi()`, `teql()`, etc.

---

#### teqi()
```typescript
function teqi(received: any, expected: any, msg?: string): void
```
**Description:** Assert two integer values are equal using strict equality (`===`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `teq()`.

---

#### teql()
```typescript
function teql(received: any, expected: any, msg?: string): void
```
**Description:** Assert two long values are equal using strict equality (`===`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `teq()`.

---

#### teqll()
```typescript
function teqll(received: any, expected: any, msg?: string): void
```
**Description:** Assert two BigInt values are equal.

**Parameters:** Same as `teq()`.

**Behavior:** Converts values to BigInt before comparison. Same failure behavior as `teq()`.

---

#### teqz()
```typescript
function teqz(received: any, expected: any, msg?: string): void
```
**Description:** Assert two size values are equal using strict equality (`===`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `teq()`.

---

#### tequ()
```typescript
function tequ(received: any, expected: any, msg?: string): void
```
**Description:** Assert two unsigned integer values are equal using strict equality (`===`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `teq()`.

---

#### teqp()
```typescript
function teqp(received: any, expected: any, msg?: string): void
```
**Description:** Assert two pointer/reference values are equal using strict equality (`===`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `teq()`.

---

### Inequality Functions

#### tneq()
```typescript
function tneq(received: any, expected: any, msg?: string): void
```
**Description:** Assert two values are not equal.

**Parameters:** Same as `teq()`.

**Behavior:** On failure (values are equal), prints error and exits with code 1.

**Alias:** Use type-specific functions for clarity: `tneqi()`, `tneql()`, etc.

---

#### tneqi()
```typescript
function tneqi(received: any, expected: any, msg?: string): void
```
**Description:** Assert two integer values are not equal using strict inequality (`!==`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `tneq()`.

---

#### tneql()
```typescript
function tneql(received: any, expected: any, msg?: string): void
```
**Description:** Assert two long values are not equal using strict inequality (`!==`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `tneq()`.

---

#### tneqll()
```typescript
function tneqll(received: any, expected: any, msg?: string): void
```
**Description:** Assert two BigInt values are not equal.

**Parameters:** Same as `teq()`.

**Behavior:** Converts values to BigInt before comparison. Same failure behavior as `tneq()`.

---

#### tneqz()
```typescript
function tneqz(received: any, expected: any, msg?: string): void
```
**Description:** Assert two size values are not equal using strict inequality (`!==`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `tneq()`.

---

#### tnequ()
```typescript
function tnequ(received: any, expected: any, msg?: string): void
```
**Description:** Assert two unsigned integer values are not equal using strict inequality (`!==`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `tneq()`.

---

#### tneqp()
```typescript
function tneqp(received: any, expected: any, msg?: string): void
```
**Description:** Assert two pointer/reference values are not equal using strict inequality (`!==`).

**Parameters:** Same as `teq()`.

**Behavior:** Same as `tneq()`.

---

### Comparison Functions (Greater Than)

#### tgti()
```typescript
function tgti(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received > expected` (integer).

**Parameters:**
- `received` - Value to check
- `expected` - Threshold (exclusive)
- `msg` - Optional description

**Behavior:** Fails and exits if `received <= expected`.

---

#### tgtl()
```typescript
function tgtl(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received > expected` (long).

**Parameters:** Same as `tgti()`.

**Behavior:** Same as `tgti()`.

---

#### tgtz()
```typescript
function tgtz(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received > expected` (size).

**Parameters:** Same as `tgti()`.

**Behavior:** Same as `tgti()`.

---

#### tgtei()
```typescript
function tgtei(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received >= expected` (integer).

**Parameters:** Same as `tgti()` but threshold is inclusive.

**Behavior:** Fails and exits if `received < expected`.

---

#### tgtel()
```typescript
function tgtel(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received >= expected` (long).

**Parameters:** Same as `tgtei()`.

**Behavior:** Same as `tgtei()`.

---

#### tgtez()
```typescript
function tgtez(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received >= expected` (size).

**Parameters:** Same as `tgtei()`.

**Behavior:** Same as `tgtei()`.

---

### Comparison Functions (Less Than)

#### tlti()
```typescript
function tlti(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received < expected` (integer).

**Parameters:**
- `received` - Value to check
- `expected` - Threshold (exclusive)
- `msg` - Optional description

**Behavior:** Fails and exits if `received >= expected`.

---

#### tltl()
```typescript
function tltl(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received < expected` (long).

**Parameters:** Same as `tlti()`.

**Behavior:** Same as `tlti()`.

---

#### tltz()
```typescript
function tltz(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received < expected` (size).

**Parameters:** Same as `tlti()`.

**Behavior:** Same as `tlti()`.

---

#### tltei()
```typescript
function tltei(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received <= expected` (integer).

**Parameters:** Same as `tlti()` but threshold is inclusive.

**Behavior:** Fails and exits if `received > expected`.

---

#### tltel()
```typescript
function tltel(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received <= expected` (long).

**Parameters:** Same as `tltei()`.

**Behavior:** Same as `tltei()`.

---

#### tltez()
```typescript
function tltez(received: number, expected: number, msg?: string): void
```
**Description:** Assert `received <= expected` (size).

**Parameters:** Same as `tltei()`.

**Behavior:** Same as `tltei()`.

---

### Boolean Functions

#### ttrue()
```typescript
function ttrue(expr: any, msg?: string): void
```
**Description:** Assert expression is truthy.

**Parameters:**
- `expr` - Expression to evaluate
- `msg` - Optional description

**Behavior:** Fails and exits if `expr` is falsy.

---

#### tfalse()
```typescript
function tfalse(expr: any, msg?: string): void
```
**Description:** Assert expression is falsy.

**Parameters:** Same as `ttrue()`.

**Behavior:** Fails and exits if `expr` is truthy.

---

### Pointer/Null Functions

#### tnull()
```typescript
function tnull(value: any, msg?: string): void
```
**Description:** Assert value is `null`.

**Parameters:**
- `value` - Value to check
- `msg` - Optional description

**Behavior:** Fails and exits if `value !== null`.

---

#### tnotnull()
```typescript
function tnotnull(value: any, msg?: string): void
```
**Description:** Assert value is not `null`.

**Parameters:** Same as `tnull()`.

**Behavior:** Fails and exits if `value === null`.

---

### String Functions

#### tmatch()
```typescript
function tmatch(str: string, pattern: string | RegExp, msg?: string): void
```
**Description:** Assert string matches regex pattern.

**Parameters:**
- `str` - String to test
- `pattern` - String or RegExp pattern to match
- `msg` - Optional description

**Behavior:** Converts string patterns to RegExp. Fails and exits if pattern doesn't match.

---

#### tcontains()
```typescript
function tcontains(str: string, substr: string, msg?: string): void
```
**Description:** Assert string contains substring.

**Parameters:**
- `str` - String to search in
- `substr` - Substring to find
- `msg` - Optional description

**Behavior:** Uses `String.includes()`. Fails and exits if substring not found.

---

### Control Function

#### tfail()
```typescript
function tfail(msg: string): void
```
**Description:** Unconditionally fail the test.

**Parameters:**
- `msg` - Failure message

**Behavior:** Prints error and exits with code 1.

---

### Legacy Functions

#### tassert()
```typescript
function tassert(expr: any, msg?: string): void
```
**Description:** Alias for `ttrue()`. Provided for backward compatibility.

**Parameters:** Same as `ttrue()`.

**Behavior:** Same as `ttrue()`.

---

## Jest/Vitest expect() API

### Main Function

#### expect()
```typescript
function expect(received: any): ExpectMatcher
```
**Description:** Creates an expectation object with chainable matchers.

**Parameters:**
- `received` - Value to test

**Return Value:** `ExpectMatcher` instance with matcher methods and modifiers.

**Behavior:**
- When used **inside** `test()`: throws error on failure (caught by test runner)
- When used **outside** `test()`: exits with code 1 on failure (backward compatible)

---

### Modifiers

All matchers support these modifiers accessed as properties:

#### .not
```typescript
matcher.not
```
**Description:** Negates the matcher expectation.

**Example:**
```javascript
expect(5).not.toBe(10)  // Passes if 5 !== 10
```

---

#### .resolves
```typescript
matcher.resolves
```
**Description:** Unwraps promise and applies matcher to resolved value.

**Requirements:** `received` must be a Promise.

**Example:**
```javascript
await expect(Promise.resolve(42)).resolves.toBe(42)
```

---

#### .rejects
```typescript
matcher.rejects
```
**Description:** Unwraps promise and applies matcher to rejection reason.

**Requirements:** `received` must be a Promise.

**Example:**
```javascript
await expect(Promise.reject(new Error('fail'))).rejects.toThrow('fail')
```

---

### Equality Matchers

#### toBe()
```typescript
matcher.toBe(expected: any): void | Promise<void>
```
**Description:** Strict equality using `Object.is()`.

**Parameters:**
- `expected` - Expected value

**Comparison:** Uses `Object.is()` which handles `NaN`, `-0`, `+0` correctly.

**Usage:** Primitive values, object identity checks.

---

#### toEqual()
```typescript
matcher.toEqual(expected: any): void | Promise<void>
```
**Description:** Deep equality comparison.

**Parameters:**
- `expected` - Expected value

**Comparison:** Recursively compares objects, arrays, Maps, Sets, Dates, RegExp.

**Usage:** Objects, arrays, complex structures.

---

#### toStrictEqual()
```typescript
matcher.toStrictEqual(expected: any): void | Promise<void>
```
**Description:** Strict deep equality (checks undefined props and constructors).

**Parameters:**
- `expected` - Expected value

**Comparison:** Like `toEqual()` but also checks:
- Undefined properties
- Constructor types
- Exact property counts

**Usage:** When strict type and property checking is needed.

---

### Truthiness Matchers

#### toBeTruthy()
```typescript
matcher.toBeTruthy(): void | Promise<void>
```
**Description:** Value is truthy.

**Comparison:** Evaluates `Boolean(received)`.

**Truthy values:** Non-zero numbers, non-empty strings, objects, arrays, true.

---

#### toBeFalsy()
```typescript
matcher.toBeFalsy(): void | Promise<void>
```
**Description:** Value is falsy.

**Comparison:** Evaluates `!Boolean(received)`.

**Falsy values:** `false`, `0`, `""`, `null`, `undefined`, `NaN`.

---

#### toBeNull()
```typescript
matcher.toBeNull(): void | Promise<void>
```
**Description:** Value is `null`.

**Comparison:** `received === null`.

---

#### toBeUndefined()
```typescript
matcher.toBeUndefined(): void | Promise<void>
```
**Description:** Value is `undefined`.

**Comparison:** `received === undefined`.

---

#### toBeDefined()
```typescript
matcher.toBeDefined(): void | Promise<void>
```
**Description:** Value is not `undefined`.

**Comparison:** `received !== undefined`.

**Note:** Passes for `null` values.

---

#### toBeNaN()
```typescript
matcher.toBeNaN(): void | Promise<void>
```
**Description:** Value is `NaN`.

**Comparison:** `Number.isNaN(received)`.

---

### Type Matchers

#### toBeInstanceOf()
```typescript
matcher.toBeInstanceOf(expected: Function): void | Promise<void>
```
**Description:** Value is instance of class.

**Parameters:**
- `expected` - Constructor function

**Comparison:** `received instanceof expected`.

**Example:**
```javascript
expect(new Date()).toBeInstanceOf(Date)
```

---

#### toBeTypeOf()
```typescript
matcher.toBeTypeOf(expected: string): void | Promise<void>
```
**Description:** Value has specific typeof result.

**Parameters:**
- `expected` - Type name: `'string'`, `'number'`, `'object'`, `'function'`, `'boolean'`, `'undefined'`, `'symbol'`, `'bigint'`

**Comparison:** `typeof received === expected`.

---

### Numeric Comparison Matchers

#### toBeGreaterThan()
```typescript
matcher.toBeGreaterThan(expected: number): void | Promise<void>
```
**Description:** `received > expected`.

**Parameters:**
- `expected` - Number to compare against

---

#### toBeGreaterThanOrEqual()
```typescript
matcher.toBeGreaterThanOrEqual(expected: number): void | Promise<void>
```
**Description:** `received >= expected`.

**Parameters:**
- `expected` - Number to compare against

---

#### toBeLessThan()
```typescript
matcher.toBeLessThan(expected: number): void | Promise<void>
```
**Description:** `received < expected`.

**Parameters:**
- `expected` - Number to compare against

---

#### toBeLessThanOrEqual()
```typescript
matcher.toBeLessThanOrEqual(expected: number): void | Promise<void>
```
**Description:** `received <= expected`.

**Parameters:**
- `expected` - Number to compare against

---

#### toBeCloseTo()
```typescript
matcher.toBeCloseTo(expected: number, precision?: number): void | Promise<void>
```
**Description:** Floating point approximation.

**Parameters:**
- `expected` - Expected value
- `precision` - Number of decimal places (default: 2)

**Comparison:** `Math.abs(received - expected) < 1 / (10 ** precision) / 2`.

**Usage:** Floating point comparisons with tolerance.

**Example:**
```javascript
expect(0.1 + 0.2).toBeCloseTo(0.3)  // Passes
expect(0.1 + 0.2).toBe(0.3)         // Fails (floating point precision)
```

---

### String and Collection Matchers

#### toMatch()
```typescript
matcher.toMatch(pattern: string | RegExp): void | Promise<void>
```
**Description:** String matches regex or string pattern.

**Parameters:**
- `pattern` - String or RegExp pattern

**Requirements:** `received` must be a string.

**Example:**
```javascript
expect('hello world').toMatch(/world/)
expect('test@example.com').toMatch(/^[\w.]+@[\w.]+$/)
```

---

#### toContain()
```typescript
matcher.toContain(item: any): void | Promise<void>
```
**Description:** Array/string contains item/substring.

**Parameters:**
- `item` - Item to find (substring for strings, element for arrays)

**Requirements:** `received` must be string or array.

**Comparison:**
- Strings: `received.includes(item)`
- Arrays: `received.includes(item)` (strict equality)

---

#### toContainEqual()
```typescript
matcher.toContainEqual(item: any): void | Promise<void>
```
**Description:** Array contains item with deep equality.

**Parameters:**
- `item` - Item to find

**Requirements:** `received` must be an array.

**Comparison:** Deep equality check for each array element.

**Usage:** Finding objects in arrays.

**Example:**
```javascript
expect([{id: 1}, {id: 2}]).toContainEqual({id: 1})
```

---

#### toHaveLength()
```typescript
matcher.toHaveLength(expected: number): void | Promise<void>
```
**Description:** Array/string has specific length.

**Parameters:**
- `expected` - Expected length

**Requirements:** `received` must be string or array.

**Comparison:** `received.length === expected`.

---

### Object Matchers

#### toHaveProperty()
```typescript
matcher.toHaveProperty(keyPath: string | string[], value?: any): void | Promise<void>
```
**Description:** Object has property at key path.

**Parameters:**
- `keyPath` - Property path (`'a.b.c'` or `['a', 'b', 'c']`)
- `value` - Optional expected value (uses deep equality)

**Requirements:** `received` must be an object.

**Example:**
```javascript
expect({a: {b: {c: 1}}}).toHaveProperty('a.b.c')
expect({a: {b: {c: 1}}}).toHaveProperty('a.b.c', 1)
expect({a: {b: {c: 1}}}).toHaveProperty(['a', 'b', 'c'])
```

---

#### toMatchObject()
```typescript
matcher.toMatchObject(pattern: object): void | Promise<void>
```
**Description:** Object contains all properties of pattern (partial match).

**Parameters:**
- `pattern` - Pattern object to match

**Requirements:** `received` must be an object.

**Comparison:** Recursively checks that all pattern properties exist with matching values.

**Example:**
```javascript
expect({a: 1, b: 2, c: 3}).toMatchObject({a: 1, b: 2})  // Passes
expect({a: 1, b: 2}).toMatchObject({a: 1, b: 2, c: 3})  // Fails
```

---

### Error Matchers

#### toThrow()
```typescript
matcher.toThrow(error?: string | RegExp | Error | Function): void | Promise<void>
```
**Description:** Function throws an error.

**Parameters:**
- `error` - Optional error matcher:
  - String: matches error message substring
  - RegExp: matches error message pattern
  - Function: matches error constructor
  - Error: matches error message exactly
  - Omitted: just checks that it throws

**Requirements:** `received` must be a function (unless used with `.rejects`).

**Example:**
```javascript
expect(() => { throw new Error('fail') }).toThrow()
expect(() => { throw new Error('fail') }).toThrow('fail')
expect(() => { throw new Error('fail') }).toThrow(/fail/)
expect(() => { throw new TypeError() }).toThrow(TypeError)
```

---

#### toThrowError()
```typescript
matcher.toThrowError(error?: string | RegExp | Error | Function): void | Promise<void>
```
**Description:** Alias for `toThrow()`.

**Parameters:** Same as `toThrow()`.

**Behavior:** Identical to `toThrow()`.

---

## Test Organization API

### describe()
```typescript
async function describe(name: string, fn: () => void | Promise<void>): Promise<void>
```
**Description:** Groups related tests with a label. Supports nesting.

**Parameters:**
- `name` - Description of the test group
- `fn` - Function containing tests and nested describes

**Requirements:**
- Top-level `describe()` blocks **must be awaited**
- Nested `describe()` blocks within async functions **must be awaited**
- Tests within a describe execute **sequentially**

**Behavior:**
- Prints group name with indentation
- Increments nesting level during execution
- Restores hooks and context when exiting
- Catches and reports errors in describe blocks

**Example:**
```javascript
await describe('Calculator', async () => {
    test('addition', () => {
        expect(2 + 2).toBe(4)
    })

    await describe('multiplication', () => {
        test('positive numbers', () => {
            expect(3 * 4).toBe(12)
        })
    })
})
```

---

### test()
```typescript
async function test(name: string, fn: () => void | Promise<void>): void
```
**Description:** Execute a single test with a label.

**Parameters:**
- `name` - Description of the test
- `fn` - Test function (sync or async)

**Behavior:**
- Runs `beforeEach` hooks before test
- Sets `inTest` context flag (enables `expect()` error throwing)
- Executes test function
- Runs `afterEach` hooks after test
- Reports success/failure with ✓/✗ indicator
- Catches and reports errors

**Example:**
```javascript
test('addition works', () => {
    expect(2 + 2).toBe(4)
})

test('async operation', async () => {
    const result = await fetchData()
    expect(result).toBeDefined()
})
```

---

### it()
```typescript
const it: typeof test
```
**Description:** Alias for `test()`.

**Parameters:** Same as `test()`.

**Behavior:** Identical to `test()`.

**Usage:** Provides familiar Jest/Vitest syntax.

---

### beforeEach()
```typescript
function beforeEach(fn: () => void | Promise<void>): void
```
**Description:** Register a hook to run before each test in current describe scope.

**Parameters:**
- `fn` - Setup function (sync or async)

**Behavior:**
- Pushed to hook array for current describe
- Executed before each `test()` in scope
- Executes in registration order
- Scoped to current describe block
- Restored when describe exits

**Example:**
```javascript
await describe('Database tests', () => {
    let db

    beforeEach(() => {
        db = createTestDatabase()
    })

    test('insert works', () => {
        db.insert({name: 'Alice'})
        expect(db.count()).toBe(1)
    })

    test('query works', () => {
        db.insert({name: 'Bob'})
        expect(db.find('Bob')).toBeDefined()
    })
})
```

---

### afterEach()
```typescript
function afterEach(fn: () => void | Promise<void>): void
```
**Description:** Register a hook to run after each test in current describe scope.

**Parameters:**
- `fn` - Cleanup function (sync or async)

**Behavior:**
- Pushed to hook array for current describe
- Executed after each `test()` in scope
- Executes in registration order
- Scoped to current describe block
- Restored when describe exits
- Runs even if test fails

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

    test('write works', () => {
        writeFile(tempFile, 'data')
        expect(readFile(tempFile)).toBe('data')
    })
})
```

---

### beforeAll()
```typescript
function beforeAll(fn: () => void | Promise<void>): void
```
**Description:** Register a hook to run **once** before all tests in current describe scope.

**Parameters:**
- `fn` - Setup function (sync or async)

**Behavior:**
- Executed once at the start of the describe block
- Runs **before** any tests in the describe block
- Runs **after** parent describe's beforeAll hooks (for nested describes)
- Ideal for expensive setup operations (database connections, test servers)
- Scoped to current describe block
- Restored when describe exits

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

**Nested Describes:**
```javascript
await describe('Outer', async () => {
    beforeAll(() => {
        console.log('Outer beforeAll')  // Runs first
    })

    test('outer test 1', () => {
        expect(true).toBeTruthy()
    })

    await describe('Inner', async () => {
        beforeAll(() => {
            console.log('Inner beforeAll')  // Runs after outer beforeAll
        })

        test('inner test 1', () => {
            expect(true).toBeTruthy()
        })
    })
})
```

---

### afterAll()
```typescript
function afterAll(fn: () => void | Promise<void>): void
```
**Description:** Register a hook to run **once** after all tests in current describe scope.

**Parameters:**
- `fn` - Cleanup function (sync or async)

**Behavior:**
- Executed once after all tests in the describe block complete
- Runs **before** parent describe's afterAll hooks (for nested describes)
- Ideal for cleanup operations (close connections, remove test data)
- Scoped to current describe block
- Restored when describe exits
- Runs even if tests fail

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

    test('query records', async () => {
        const users = await connection.query('users')
        expect(users).toHaveLength(1)
    })
})
```

---

### test.skip()
```typescript
test.skip(name: string, fn: () => void | Promise<void>): void
```
**Description:** Skip a test - it will not execute.

**Parameters:**
- `name` - Description of the test
- `fn` - Test function (not executed)

**Behavior:**
- Prints test name with ⊘ indicator and "(skipped)"
- Test function is not executed
- Useful for temporarily disabling tests

**Example:**
```javascript
await describe('Feature tests', () => {
    test('this test runs', () => {
        expect(true).toBeTruthy()
    })

    test.skip('this test is skipped', () => {
        // This code never executes
        expect(false).toBeTruthy()
    })

    test('this test also runs', () => {
        expect(true).toBeTruthy()
    })
})
```

---

### test.skipIf()
```typescript
test.skipIf(condition: boolean): typeof test
```
**Description:** Conditionally skip a test based on a boolean condition.

**Parameters:**
- `condition` - If `true`, the test is skipped; if `false`, the test runs

**Returns:** Either `test.skip` or `test` depending on condition

**Behavior:**
- Evaluates condition when test is registered
- Returns appropriate test function
- Useful for platform-specific or environment-specific tests

**Example:**
```javascript
const isCI = process.env.CI === 'true'
const isWindows = process.platform === 'win32'

await describe('Platform tests', () => {
    test.skipIf(isCI)('skipped in CI', () => {
        // Only runs locally, not in CI
        expect(true).toBeTruthy()
    })

    test.skipIf(isWindows)('Unix-only test', () => {
        // Only runs on macOS and Linux
        expect(process.platform).not.toBe('win32')
    })

    test.skipIf(false)('always runs', () => {
        expect(true).toBeTruthy()
    })
})
```

---

### it.skip() and it.skipIf()
```typescript
it.skip(name: string, fn: () => void | Promise<void>): void
it.skipIf(condition: boolean): typeof it
```
**Description:** Aliases for `test.skip()` and `test.skipIf()`.

**Behavior:** Identical to test.skip() and test.skipIf().

**Example:**
```javascript
it.skip('skipped test', () => {
    expect(false).toBeTruthy()
})

it.skipIf(true)('conditionally skipped', () => {
    expect(false).toBeTruthy()
})
```

---

### describe.skip()
```typescript
describe.skip(name: string, fn: () => void | Promise<void>): Promise<void>
```
**Description:** Skip an entire describe block - none of its tests will execute.

**Parameters:**
- `name` - Description of the test group
- `fn` - Function containing tests (not executed)

**Behavior:**
- Prints group name with "(skipped)"
- Function is not executed
- All tests in the block are skipped
- beforeAll/afterAll hooks do not run
- Useful for disabling entire test suites

**Example:**
```javascript
describe.skip('Experimental features', async () => {
    // None of this code executes
    beforeAll(() => {
        console.log('This does not run')
    })

    test('feature A', () => {
        expect(false).toBeTruthy()
    })

    test('feature B', () => {
        expect(false).toBeTruthy()
    })
})
```

---

## Environment Access Functions

### tget()
```typescript
function tget(key: string, defaultValue: string): string | null
```
**Description:** Get environment variable with default fallback.

**Parameters:**
- `key` - Environment variable name
- `defaultValue` - Value to return if not set (default: `null`)

**Return Value:** String value or `null` if not set and no default.

**Behavior:** Returns empty string as empty string (not as null).

---

### thas()
```typescript
function thas(key: string): number
```
**Description:** Check if environment variable exists.

**Parameters:**
- `key` - Environment variable name

**Return Value:**
- Numeric value from variable if exists
- `0` if variable doesn't exist

**Note:** Returns numeric type (not boolean) for compatibility with C API.

---

### tdepth()
```typescript
function tdepth(): number
```
**Description:** Get current test execution depth from `TESTME_DEPTH` environment variable.

**Parameters:** None.

**Return Value:** Integer depth value (0 if not set).

---

### tverbose()
```typescript
function tverbose(): boolean
```
**Description:** Check if verbose mode is enabled.

**Parameters:** None.

**Return Value:** `true` if `TESTME_VERBOSE` is set, `false` otherwise.

**Note:** Returns boolean type (unlike C API which uses int).

---

## Output Functions

### tinfo()
```typescript
function tinfo(...args: any[]): void
```
**Description:** Print informational message.

**Parameters:**
- `...args` - Values to print (forwarded to `console.log()`)

**Behavior:** Writes to stdout. Does not affect test pass/fail status.

---

### tdebug()
```typescript
function tdebug(...args: any[]): void
```
**Description:** Print debug message.

**Parameters:** Same as `tinfo()`.

**Behavior:** Same as `tinfo()`.

---

### tskip()
```typescript
function tskip(...args: any[]): void
```
**Description:** Print message about skipped conditions.

**Parameters:** Same as `tinfo()`.

**Behavior:** Same as `tinfo()`.

---

### twrite()
```typescript
function twrite(...args: any[]): void
```
**Description:** Write general output.

**Parameters:** Same as `tinfo()`.

**Behavior:** Same as `tinfo()`.

---

## Best Practices

### Choosing Between APIs

**Use `expect()` API when:**
- Familiar with Jest/Vitest
- Want chainable matchers
- Need promise matchers (`.resolves`, `.rejects`)
- Writing structured tests with `describe()`/`test()`

**Use traditional `t*` API when:**
- Prefer functional style
- Writing simple flat tests
- Need C-compatible syntax for cross-language projects

**Mix both APIs:**
Both are fully supported and can be used in the same file.

### Test Organization

**Flat tests (simple):**
```javascript
import {expect} from 'testme'

expect(2 + 2).toBe(4)
expect('hello').toContain('ell')
```

**Organized tests (recommended):**
```javascript
import {describe, test, expect} from 'testme'

await describe('Math operations', () => {
    test('addition', () => {
        expect(2 + 2).toBe(4)
    })

    test('subtraction', () => {
        expect(5 - 3).toBe(2)
    })
})
```

### Async/Await

**Always await:**
- Top-level `describe()` blocks
- Nested `describe()` blocks in async functions
- Promise matchers (`.resolves`, `.rejects`)

**Example:**
```javascript
await describe('Async operations', async () => {
    test('fetch data', async () => {
        await expect(fetchData()).resolves.toBeDefined()
    })

    await describe('nested async', () => {
        test('nested test', async () => {
            const result = await processData()
            expect(result).toBeTruthy()
        })
    })
})
```

---

## Related Documentation

- [README-TESTS.md](README-TESTS.md) - Exit codes, output streams, environment variables
- [README-C.md](README-C.md) - C testing API reference
- [doc/JEST_API.md](doc/JEST_API.md) - Jest/Vitest API examples and migration guide
- [README.md](README.md) - TestMe usage guide with configuration

---

## Version Information

This API reference applies to TestMe 1.x and later.

Source: [src/modules/js/index.js](src/modules/js/index.js), [src/modules/js/expect.js](src/modules/js/expect.js)
