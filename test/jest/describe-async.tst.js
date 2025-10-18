/**
    Test async describe blocks
*/

import {describe, test, expect} from 'testme'

await describe('Sync describe with sync tests', () => {
    test('test 1', () => {
        expect(1).toBe(1)
    })

    test('test 2', () => {
        expect(2).toBe(2)
    })
})

await describe('Async describe block', async () => {
    await test('test in async describe', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        expect(3).toBe(3)
    })

    await test('another test in async describe', () => {
        expect(4).toBe(4)
    })
})

await describe('Mixed sync/async tests', () => {
    test('sync test', () => {
        expect(5).toBe(5)
    })

    test('async test', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))
        expect(6).toBe(6)
    })

    test('another sync test', () => {
        expect(7).toBe(7)
    })
})
