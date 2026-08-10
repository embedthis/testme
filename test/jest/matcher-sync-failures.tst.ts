/**
    matcher-sync-failures.tst.ts - Regression tests for synchronous matcher failure attribution
*/

import {describe, expect, test} from 'testme'

await describe('matcher failure attribution', async () => {
    test('toEqual failure throws in the current test context', () => {
        let caught = false
        try {
            expect(['a']).toEqual(['b'])
        } catch (error) {
            caught = true
            expect((error as Error).message).toContain('toEqual')
        }
        expect(caught).toBe(true)
    })

    test('toStrictEqual failure throws in the current test context', () => {
        let caught = false
        try {
            expect({a: undefined}).toStrictEqual({})
        } catch (error) {
            caught = true
            expect((error as Error).message).toContain('toStrictEqual')
        }
        expect(caught).toBe(true)
    })
})
