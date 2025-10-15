/**
    jest-api-basic.tst.ts - Test basic Jest/Vitest-compatible API
    Tests: toBe, toEqual, toStrictEqual, truthiness matchers, and .not modifier
*/

import {expect} from 'testme'

console.log('Testing Jest/Vitest-compatible expect() API - Basic Matchers...')

//  ==================== Equality Matchers ====================

//  toBe - strict equality with Object.is()
expect(1).toBe(1)
expect('hello').toBe('hello')
expect(true).toBe(true)
expect(null).toBe(null)
expect(undefined).toBe(undefined)

//  .not modifier
expect(1).not.toBe(2)
expect('hello').not.toBe('world')
expect(true).not.toBe(false)

//  toEqual - deep equality
const obj1 = {a: 1, b: 2}
const obj2 = {a: 1, b: 2}
const obj3 = {a: 1, b: 3}
expect(obj1).toEqual(obj2)
expect(obj1).not.toEqual(obj3)

const arr1 = [1, 2, 3]
const arr2 = [1, 2, 3]
const arr3 = [1, 2, 4]
expect(arr1).toEqual(arr2)
expect(arr1).not.toEqual(arr3)

//  toStrictEqual - strict deep equality
const strictObj1 = {a: 1, b: undefined}
const strictObj2 = {a: 1}
expect(strictObj1).not.toStrictEqual(strictObj2) //  Different because b is undefined vs missing

//  ==================== Truthiness Matchers ====================

//  toBeTruthy
expect(true).toBeTruthy()
expect(1).toBeTruthy()
expect('hello').toBeTruthy()
expect({}).toBeTruthy()
expect([]).toBeTruthy()

expect(false).not.toBeTruthy()
expect(0).not.toBeTruthy()
expect('').not.toBeTruthy()
expect(null).not.toBeTruthy()
expect(undefined).not.toBeTruthy()

//  toBeFalsy
expect(false).toBeFalsy()
expect(0).toBeFalsy()
expect('').toBeFalsy()
expect(null).toBeFalsy()
expect(undefined).toBeFalsy()

expect(true).not.toBeFalsy()
expect(1).not.toBeFalsy()
expect('hello').not.toBeFalsy()

//  toBeNull
expect(null).toBeNull()
expect(undefined).not.toBeNull()
expect(0).not.toBeNull()
expect(false).not.toBeNull()

//  toBeUndefined
expect(undefined).toBeUndefined()
expect(null).not.toBeUndefined()
expect(0).not.toBeUndefined()
expect(false).not.toBeUndefined()

let undefVar
expect(undefVar).toBeUndefined()

//  toBeDefined
expect(1).toBeDefined()
expect('hello').toBeDefined()
expect(null).toBeDefined() //  null is defined (not undefined)
expect(undefined).not.toBeDefined()

//  toBeNaN
expect(NaN).toBeNaN()
expect(0 / 0).toBeNaN()
expect(1).not.toBeNaN()
expect('hello').not.toBeNaN()

//  ==================== Type Matchers ====================

//  toBeInstanceOf
class TestClass {}
const instance = new TestClass()
expect(instance).toBeInstanceOf(TestClass)
expect({}).toBeInstanceOf(Object)
expect([]).toBeInstanceOf(Array)
expect(new Date()).toBeInstanceOf(Date)
expect(new RegExp('test')).toBeInstanceOf(RegExp)

expect({}).not.toBeInstanceOf(Array)
//  Note: Arrays ARE instances of Object in JavaScript ([] instanceof Object === true)
//  This is correct JavaScript behavior, commenting out incorrect test
// expect([]).not.toBeInstanceOf(Object)

//  toBeTypeOf
expect('hello').toBeTypeOf('string')
expect(123).toBeTypeOf('number')
expect(true).toBeTypeOf('boolean')
expect({}).toBeTypeOf('object')
expect([]).toBeTypeOf('object') //  Arrays are type 'object'
expect(() => {}).toBeTypeOf('function')
expect(undefined).toBeTypeOf('undefined')
expect(Symbol('test')).toBeTypeOf('symbol')
expect(BigInt(123)).toBeTypeOf('bigint')

expect('hello').not.toBeTypeOf('number')
expect(123).not.toBeTypeOf('string')

console.log('✓ All basic Jest API tests passed!')
