/**
    jest-api-async.tst.ts - Test async/promise matchers
    Tests: .resolves and .rejects modifiers with various matchers
*/

import {expect} from 'testme'

console.log('Testing Jest/Vitest-compatible expect() API - Async Matchers...')

//  Helper functions for testing
function resolveAfter(ms: number, value: any): Promise<any> {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function rejectAfter(ms: number, error: any): Promise<any> {
    return new Promise((_, reject) => setTimeout(() => reject(error), ms))
}

async function runTests() {
    //  ==================== .resolves - Basic ====================

    //  .resolves.toBe
    await expect(Promise.resolve(42)).resolves.toBe(42)
    await expect(Promise.resolve('hello')).resolves.toBe('hello')
    await expect(Promise.resolve(true)).resolves.toBe(true)
    await expect(Promise.resolve(null)).resolves.toBe(null)

    await expect(Promise.resolve(42)).resolves.not.toBe(43)
    await expect(Promise.resolve('hello')).resolves.not.toBe('world')

    //  .resolves.toEqual - deep equality
    await expect(Promise.resolve({a: 1, b: 2})).resolves.toEqual({a: 1, b: 2})
    await expect(Promise.resolve([1, 2, 3])).resolves.toEqual([1, 2, 3])
    await expect(Promise.resolve({a: 1})).resolves.not.toEqual({a: 2})

    //  ==================== .resolves - Truthiness ====================

    await expect(Promise.resolve(true)).resolves.toBeTruthy()
    await expect(Promise.resolve(1)).resolves.toBeTruthy()
    await expect(Promise.resolve('hello')).resolves.toBeTruthy()
    await expect(Promise.resolve(false)).resolves.toBeFalsy()
    await expect(Promise.resolve(0)).resolves.toBeFalsy()
    await expect(Promise.resolve('')).resolves.toBeFalsy()

    await expect(Promise.resolve(null)).resolves.toBeNull()
    await expect(Promise.resolve(undefined)).resolves.toBeUndefined()
    await expect(Promise.resolve(123)).resolves.toBeDefined()

    //  ==================== .resolves - Numeric Comparisons ====================

    await expect(Promise.resolve(10)).resolves.toBeGreaterThan(5)
    await expect(Promise.resolve(5)).resolves.toBeGreaterThanOrEqual(5)
    await expect(Promise.resolve(3)).resolves.toBeLessThan(5)
    await expect(Promise.resolve(5)).resolves.toBeLessThanOrEqual(5)

    await expect(Promise.resolve(0.1 + 0.2)).resolves.toBeCloseTo(0.3)
    await expect(Promise.resolve(1.234)).resolves.toBeCloseTo(1.235, 2)

    //  ==================== .resolves - Strings & Collections ====================

    await expect(Promise.resolve('hello world')).resolves.toMatch(/hello/)
    await expect(Promise.resolve('test123')).resolves.toMatch(/\d+/)

    await expect(Promise.resolve('hello world')).resolves.toContain('world')
    await expect(Promise.resolve([1, 2, 3])).resolves.toContain(2)

    await expect(Promise.resolve('hello')).resolves.toHaveLength(5)
    await expect(Promise.resolve([1, 2, 3])).resolves.toHaveLength(3)

    //  ==================== .resolves - Objects ====================

    await expect(Promise.resolve({name: 'Alice', age: 30})).resolves.toHaveProperty('name')
    await expect(Promise.resolve({name: 'Alice', age: 30})).resolves.toHaveProperty('name', 'Alice')

    await expect(Promise.resolve({name: 'Bob', city: 'Portland'})).resolves.toMatchObject({name: 'Bob'})

    //  ==================== .rejects - Basic ====================

    //  .rejects.toThrow - function is called to create promise
    await expect(Promise.reject(new Error('Failed'))).rejects.toThrow()
    await expect(Promise.reject(new Error('Not found'))).rejects.toThrow('Not found')
    await expect(Promise.reject(new Error('Error 404'))).rejects.toThrow(/404/)
    await expect(Promise.reject(new TypeError('Type error'))).rejects.toThrow(TypeError)

    await expect(Promise.resolve('success')).rejects.not.toThrow() //  Doesn't reject

    //  .rejects with error message matching
    await expect(Promise.reject(new Error('Invalid input'))).rejects.toThrow('Invalid')
    await expect(Promise.reject(new Error('Connection timeout'))).rejects.toThrow(/timeout/)

    //  ==================== Real-World Async Scenarios ====================

    //  Simulated async operations with delays
    await expect(resolveAfter(10, 42)).resolves.toBe(42)
    await expect(resolveAfter(10, 'data')).resolves.toBe('data')
    await expect(rejectAfter(10, new Error('Failed'))).rejects.toThrow('Failed')

    //  Simulated API calls
    async function fetchUser(id: number): Promise<any> {
        if (id <= 0) {
            throw new Error('Invalid user ID')
        }
        return {id, name: 'User ' + id}
    }

    await expect(fetchUser(1)).resolves.toMatchObject({id: 1})
    await expect(fetchUser(1)).resolves.toHaveProperty('name')
    await expect(fetchUser(0)).rejects.toThrow('Invalid user ID')

    //  Simulated database query
    async function queryDatabase(query: string): Promise<any[]> {
        if (!query) {
            throw new Error('Query cannot be empty')
        }
        return [{id: 1}, {id: 2}]
    }

    await expect(queryDatabase('SELECT *')).resolves.toHaveLength(2)
    await expect(queryDatabase('SELECT *')).resolves.toContainEqual({id: 1})
    await expect(queryDatabase('')).rejects.toThrow('Query cannot be empty')

    //  Multiple async operations
    const promises = [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]

    await expect(promises[0]).resolves.toBe(1)
    await expect(promises[1]).resolves.toBe(2)
    await expect(promises[2]).resolves.toBe(3)

    //  Promise.all scenario
    const allPromises = Promise.all([
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
    ])
    await expect(allPromises).resolves.toEqual([1, 2, 3])
    await expect(allPromises).resolves.toHaveLength(3)

    //  Async function with validation
    async function validateEmail(email: string): Promise<boolean> {
        if (!email.includes('@')) {
            throw new Error('Invalid email format')
        }
        return true
    }

    await expect(validateEmail('user@example.com')).resolves.toBe(true)
    await expect(validateEmail('invalid')).rejects.toThrow('Invalid email format')
    await expect(validateEmail('invalid')).rejects.toThrow(/email format/)

    //  Nested async operations
    async function processData(data: any): Promise<any> {
        if (!data) {
            throw new Error('No data provided')
        }
        return {processed: true, data}
    }

    await expect(processData({value: 123})).resolves.toMatchObject({processed: true})
    await expect(processData({value: 123})).resolves.toHaveProperty('data.value', 123)
    await expect(processData(null)).rejects.toThrow('No data provided')

    //  Timeout simulation
    async function fetchWithTimeout(url: string, timeout: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Request timeout')), timeout)
            //  Simulate successful request
            setTimeout(() => {
                clearTimeout(timer)
                resolve('data')
            }, timeout / 2)
        })
    }

    await expect(fetchWithTimeout('http://example.com', 100)).resolves.toBe('data')

    console.log('✓ All async Jest API tests passed!')
}

//  Run all async tests
runTests()
    .then(() => {
        console.log('✓ Async test suite completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('✗ Async test suite failed:', error.message)
        process.exit(1)
    })
