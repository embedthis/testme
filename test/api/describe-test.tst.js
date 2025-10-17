/**
    Test describe() and test() API functionality
*/

import {describe, test, it, expect, beforeEach, afterEach} from 'testme'

let counter = 0

await describe('Basic describe/test functionality', () => {
    test('simple test passes', () => {
        expect(2 + 2).toBe(4)
    })

    test('another simple test', () => {
        expect('hello').toBe('hello')
    })

    it('it() is an alias for test()', () => {
        expect(true).toBeTruthy()
    })
})

await describe('Nested describe blocks', async () => {
    await describe('Level 1', async () => {
        test('test at level 1', () => {
            expect(1).toBe(1)
        })

        await describe('Level 2', () => {
            test('test at level 2', () => {
                expect(2).toBe(2)
            })
        })
    })
})

await describe('Async tests', () => {
    test('async test with promise', async () => {
        const promise = Promise.resolve(42)
        await expect(promise).resolves.toBe(42)
    })

    test('async test with timeout', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(true).toBeTruthy()
    })
})

await describe('beforeEach and afterEach hooks', () => {
    beforeEach(() => {
        counter = 0
    })

    afterEach(() => {
        counter = 0
    })

    test('first test increments counter', () => {
        counter++
        expect(counter).toBe(1)
    })

    test('second test starts with reset counter', () => {
        expect(counter).toBe(0)
        counter++
        expect(counter).toBe(1)
    })
})

await describe('Mixed with traditional API', () => {
    test('can use expect() inside test()', () => {
        expect([1, 2, 3]).toHaveLength(3)
        expect({a: 1, b: 2}).toHaveProperty('a', 1)
    })
})
