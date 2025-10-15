/**
    jest-api-strings.tst.ts - Test string and collection matchers
    Tests: toMatch, toContain, toContainEqual, toHaveLength
*/

import {expect} from 'testme'

console.log('Testing Jest/Vitest-compatible expect() API - String & Collection Matchers...')

//  ==================== String Matchers ====================

//  toMatch - string matching
expect('hello world').toMatch('hello')
expect('hello world').toMatch('world')
expect('hello world').toMatch('hello world')

expect('hello world').not.toMatch('goodbye')
expect('hello world').not.toMatch('Hello') //  Case sensitive

//  toMatch - regex matching
expect('hello world').toMatch(/hello/)
expect('hello world').toMatch(/world/)
expect('hello world').toMatch(/hello world/)
expect('test123').toMatch(/\d+/)
expect('abc@example.com').toMatch(/^[\w.]+@[\w.]+$/)

expect('hello world').not.toMatch(/goodbye/)
expect('hello world').not.toMatch(/^world/) //  Must match from start
expect('123').not.toMatch(/[a-z]/)

//  toMatch - case insensitive regex
expect('Hello World').toMatch(/hello/i)
expect('TESTING').toMatch(/testing/i)

//  ==================== String toContain ====================

//  toContain - substring
expect('hello world').toContain('hello')
expect('hello world').toContain('world')
expect('hello world').toContain('lo wo')
expect('hello world').toContain('')

expect('hello world').not.toContain('goodbye')
expect('hello world').not.toContain('Hello') //  Case sensitive

//  ==================== Array toContain ====================

//  toContain - array contains item (uses ===)
const numbers = [1, 2, 3, 4, 5]
expect(numbers).toContain(3)
expect(numbers).toContain(1)
expect(numbers).toContain(5)

expect(numbers).not.toContain(6)
expect(numbers).not.toContain(0)

const strings = ['apple', 'banana', 'cherry']
expect(strings).toContain('banana')
expect(strings).not.toContain('grape')

//  Mixed types
const mixed = [1, 'two', 3, 'four']
expect(mixed).toContain(1)
expect(mixed).toContain('two')
expect(mixed).not.toContain('1') //  String vs number

//  ==================== Array toContainEqual ====================

//  toContainEqual - deep equality check
const objects = [{a: 1}, {b: 2}, {c: 3}]
expect(objects).toContainEqual({b: 2})
expect(objects).not.toContainEqual({d: 4})

const nested = [[1, 2], [3, 4], [5, 6]]
expect(nested).toContainEqual([3, 4])
expect(nested).not.toContainEqual([4, 3]) //  Order matters

//  Complex objects
const people = [
    {name: 'Alice', age: 30},
    {name: 'Bob', age: 25},
    {name: 'Charlie', age: 35},
]
expect(people).toContainEqual({name: 'Bob', age: 25})
expect(people).not.toContainEqual({name: 'Bob', age: 26})

//  ==================== toHaveLength ====================

//  toHaveLength - string length
expect('hello').toHaveLength(5)
expect('').toHaveLength(0)
expect('a').toHaveLength(1)

expect('hello').not.toHaveLength(4)
expect('hello').not.toHaveLength(6)

//  toHaveLength - array length
expect([1, 2, 3]).toHaveLength(3)
expect([]).toHaveLength(0)
expect(['a']).toHaveLength(1)

expect([1, 2, 3, 4, 5]).toHaveLength(5)
expect([1, 2, 3]).not.toHaveLength(4)

//  Edge cases
expect([undefined, null, 0]).toHaveLength(3)
expect(['', '', '']).toHaveLength(3)
expect([[], [], []]).toHaveLength(3)

//  Unicode strings
expect('hello 🌍').toHaveLength(8) //  Emoji counts as 2 code units in JavaScript
expect('café').toHaveLength(4)

//  Combining matchers
const testArray = [1, 2, 3, 4, 5]
expect(testArray).toHaveLength(5)
expect(testArray).toContain(3)
expect(testArray[0]).toBe(1)
expect(testArray[testArray.length - 1]).toBe(5)

const testString = 'hello world'
expect(testString).toHaveLength(11)
expect(testString).toContain('world')
expect(testString).toMatch(/^hello/)

console.log('✓ All string & collection Jest API tests passed!')
