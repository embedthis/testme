/**
    jest-api-compat.tst.ts - Test compatibility between old and new APIs
    Verifies that both testing styles can coexist in the same test file
*/

import {expect, ttrue, tfalse, teqi, tneqi, tmatch, tcontains, tnull, tnotnull} from 'testme'

console.log('Testing Jest/Vitest API compatibility with traditional TestMe API...')

//  ==================== Side-by-Side Comparison ====================

//  Equality tests - old vs new
teqi(1, 1, 'Old API: integers equal')
expect(1).toBe(1)

tneqi(1, 2, 'Old API: integers not equal')
expect(1).not.toBe(2)

//  Boolean tests - old vs new
ttrue(true, 'Old API: value is true')
expect(true).toBeTruthy()

tfalse(false, 'Old API: value is false')
expect(false).toBeFalsy()

//  String matching - old vs new
tmatch('hello world', 'hello', 'Old API: string matches pattern')
expect('hello world').toMatch(/hello/)

tcontains('hello world', 'world', 'Old API: string contains substring')
expect('hello world').toContain('world')

//  Null checking - old vs new
tnull(null, 'Old API: value is null')
expect(null).toBeNull()

tnotnull('value', 'Old API: value is not null')
expect('value').not.toBeNull()

//  ==================== Mixed Usage in Tests ====================

//  Test object with both APIs
const user = {
    name: 'Alice',
    age: 30,
    email: 'alice@example.com',
}

//  Old API
teqi(user.name, 'Alice', 'User name is Alice')
teqi(user.age, 30, 'User age is 30')
ttrue(user.email.includes('@'), 'Email contains @')

//  New API
expect(user.name).toBe('Alice')
expect(user.age).toBe(30)
expect(user.email).toContain('@')
expect(user).toHaveProperty('name', 'Alice')
expect(user).toMatchObject({age: 30})

//  ==================== Array Testing ====================

const numbers = [1, 2, 3, 4, 5]

//  Old API
teqi(numbers.length, 5, 'Array has 5 elements')
ttrue(numbers.includes(3), 'Array includes 3')
teqi(numbers[0], 1, 'First element is 1')

//  New API
expect(numbers).toHaveLength(5)
expect(numbers).toContain(3)
expect(numbers[0]).toBe(1)
expect(numbers).toEqual([1, 2, 3, 4, 5])

//  ==================== Comparison Tests ====================

const value = 10

//  Old API style
ttrue(value > 5, 'Value is greater than 5')
ttrue(value < 15, 'Value is less than 15')
ttrue(value >= 10, 'Value is >= 10')

//  New API style
expect(value).toBeGreaterThan(5)
expect(value).toBeLessThan(15)
expect(value).toBeGreaterThanOrEqual(10)

//  ==================== Complex Objects ====================

const product = {
    id: 123,
    name: 'Widget',
    price: 29.99,
    inStock: true,
    tags: ['hardware', 'tools'],
}

//  Old API checks
teqi(product.id, 123, 'Product ID is correct')
teqi(product.name, 'Widget', 'Product name is correct')
ttrue(product.inStock, 'Product is in stock')
teqi(product.tags.length, 2, 'Product has 2 tags')

//  New API checks
expect(product).toHaveProperty('id', 123)
expect(product).toHaveProperty('name', 'Widget')
expect(product.inStock).toBeTruthy()
expect(product.tags).toHaveLength(2)
expect(product.tags).toContain('hardware')
expect(product).toMatchObject({
    name: 'Widget',
    inStock: true,
})

//  ==================== Error Handling ====================

function divide(a: number, b: number): number {
    if (b === 0) {
        throw new Error('Division by zero')
    }
    return a / b
}

//  Old API - would need manual try/catch
let errorCaught = false
try {
    divide(10, 0)
} catch (e) {
    errorCaught = true
}
ttrue(errorCaught, 'Old API: division by zero throws error')

//  New API - cleaner error testing
expect(() => divide(10, 0)).toThrow('Division by zero')
expect(() => divide(10, 2)).not.toThrow()

//  ==================== String Operations ====================

const text = 'The quick brown fox jumps over the lazy dog'

//  Old API
ttrue(text.length > 40, 'Text is longer than 40 chars')
tcontains(text, 'fox', 'Text contains "fox"')
tmatch(text, 'quick', 'Text matches "quick"')

//  New API
expect(text).toHaveLength(43) //  Actual length of the string
expect(text).toContain('fox')
expect(text).toMatch(/quick/)
expect(text).toMatch(/^The/)

//  ==================== Type Checking ====================

const testValue: any = 'hello'

//  Old API - manual type checking
ttrue(typeof testValue === 'string', 'Value is a string')
tfalse(typeof testValue === 'number', 'Value is not a number')

//  New API - built-in type matcher
expect(testValue).toBeTypeOf('string')
expect(testValue).not.toBeTypeOf('number')

//  ==================== Floating Point ====================

const calculated = 0.1 + 0.2

//  Old API - would need manual epsilon comparison
const epsilon = 0.0001
ttrue(Math.abs(calculated - 0.3) < epsilon, 'Old API: floating point close to 0.3')

//  New API - built-in precision handling
expect(calculated).toBeCloseTo(0.3)
expect(calculated).toBeCloseTo(0.3, 10)

//  ==================== Both APIs Together ====================

//  A realistic test combining both styles
const config = {
    api: {
        url: 'https://api.example.com',
        timeout: 5000,
        retries: 3,
    },
    features: ['auth', 'cache', 'logging'],
    enabled: true,
}

//  Use old API for simple checks
ttrue(config.enabled, 'Config is enabled')
teqi(config.api.retries, 3, 'Retries set to 3')

//  Use new API for complex checks
expect(config).toHaveProperty('api.url', 'https://api.example.com')
expect(config).toHaveProperty('api.timeout')
expect(config.api.timeout).toBeGreaterThan(1000)
expect(config.features).toHaveLength(3)
expect(config.features).toContain('auth')
expect(config).toMatchObject({
    enabled: true,
    api: {
        retries: 3,
    },
})

//  ==================== Migration Example ====================

//  Old-style test block
function oldStyleTests() {
    const data = {value: 42}
    teqi(data.value, 42, 'Value is 42')
    ttrue(data.value > 0, 'Value is positive')
}

//  Equivalent new-style test block
function newStyleTests() {
    const data = {value: 42}
    expect(data.value).toBe(42)
    expect(data.value).toBeGreaterThan(0)
    expect(data).toHaveProperty('value', 42)
}

//  Both work fine
oldStyleTests()
newStyleTests()

console.log('✓ All compatibility tests passed!')
console.log('✓ Both old and new APIs work together seamlessly!')
