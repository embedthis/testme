/**
    jest-api-errors.tst.ts - Test error and exception matchers
    Tests: toThrow, toThrowError
*/

import {expect} from 'testme'

console.log('Testing Jest/Vitest-compatible expect() API - Error Matchers...')

//  ==================== toThrow - Basic ====================

//  toThrow - function throws any error
expect(() => {
    throw new Error('Something went wrong')
}).toThrow()

expect(() => {
    throw 'String error'
}).toThrow()

expect(() => {
    throw 42
}).toThrow()

//  toThrow - function doesn't throw
expect(() => {
    return 'success'
}).not.toThrow()

expect(() => {
    const x = 1 + 1
    return x
}).not.toThrow()

//  ==================== toThrow - String Message Matching ====================

//  toThrow - match error message substring
expect(() => {
    throw new Error('Something went wrong')
}).toThrow('went wrong')

expect(() => {
    throw new Error('Invalid input')
}).toThrow('Invalid')

expect(() => {
    throw new Error('File not found')
}).toThrow('not found')

//  toThrow - message doesn't match
expect(() => {
    throw new Error('Something went wrong')
}).not.toThrow('success')

//  ==================== toThrow - Regex Matching ====================

//  toThrow - match error message with regex
expect(() => {
    throw new Error('Error: 404 not found')
}).toThrow(/404/)

expect(() => {
    throw new Error('Invalid input: expected number')
}).toThrow(/expected number/)

expect(() => {
    throw new Error('Connection timeout after 30 seconds')
}).toThrow(/\d+ seconds/)

//  Case insensitive matching
expect(() => {
    throw new Error('ERROR: System Failure')
}).toThrow(/error/i)

//  ==================== toThrow - Error Constructor Matching ====================

//  toThrow - match error type
expect(() => {
    throw new TypeError('Not a number')
}).toThrow(TypeError)

expect(() => {
    throw new ReferenceError('Variable not defined')
}).toThrow(ReferenceError)

expect(() => {
    throw new RangeError('Out of range')
}).toThrow(RangeError)

//  Generic Error
expect(() => {
    throw new Error('Generic error')
}).toThrow(Error)

//  Wrong error type
expect(() => {
    throw new TypeError('Type error')
}).not.toThrow(RangeError)

//  ==================== toThrow - Custom Errors ====================

//  Custom error class
class ValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ValidationError'
    }
}

class DatabaseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'DatabaseError'
    }
}

expect(() => {
    throw new ValidationError('Invalid email')
}).toThrow(ValidationError)

expect(() => {
    throw new DatabaseError('Connection failed')
}).toThrow(DatabaseError)

expect(() => {
    throw new ValidationError('Invalid email')
}).not.toThrow(DatabaseError)

//  ==================== toThrowError (Alias) ====================

//  toThrowError is an alias for toThrow
expect(() => {
    throw new Error('Test error')
}).toThrowError()

expect(() => {
    throw new Error('Another error')
}).toThrowError('Another')

expect(() => {
    throw new TypeError('Type error')
}).toThrowError(TypeError)

expect(() => {
    return 'success'
}).not.toThrowError()

//  ==================== Real-World Scenarios ====================

//  JSON parsing errors
expect(() => {
    JSON.parse('invalid json')
}).toThrow()

expect(() => {
    JSON.parse('invalid json')
}).toThrow(SyntaxError)

expect(() => {
    JSON.parse('{"valid": "json"}')
}).not.toThrow()

//  Array access errors
expect(() => {
    const arr: any = null
    arr[0]
}).toThrow(TypeError)

//  Function with validation
function divide(a: number, b: number): number {
    if (b === 0) {
        throw new Error('Division by zero')
    }
    return a / b
}

expect(() => divide(10, 0)).toThrow()
expect(() => divide(10, 0)).toThrow('Division by zero')
expect(() => divide(10, 0)).toThrow(/zero/)
expect(() => divide(10, 2)).not.toThrow()

//  Async function that throws (synchronously)
function fetchData(url: string) {
    if (!url) {
        throw new Error('URL is required')
    }
    return 'data'
}

expect(() => fetchData('')).toThrow('URL is required')
expect(() => fetchData('http://example.com')).not.toThrow()

//  Multiple error conditions
function validateAge(age: number) {
    if (typeof age !== 'number') {
        throw new TypeError('Age must be a number')
    }
    if (age < 0) {
        throw new RangeError('Age cannot be negative')
    }
    if (age > 150) {
        throw new RangeError('Age is unrealistic')
    }
    return true
}

expect(() => validateAge(-5)).toThrow(RangeError)
expect(() => validateAge(-5)).toThrow('cannot be negative')
expect(() => validateAge(200)).toThrow(RangeError)
expect(() => validateAge(200)).toThrow('unrealistic')
expect(() => validateAge(25)).not.toThrow()

console.log('✓ All error Jest API tests passed!')
