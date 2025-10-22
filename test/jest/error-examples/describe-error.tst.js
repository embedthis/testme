/**
    Test error handling in describe/test
*/

import {describe, test, expect} from 'testme'

await describe('Tests that should pass', () => {
    test('passing test 1', () => {
        expect(1).toBe(1)
    })

    test('passing test 2', () => {
        expect(true).toBeTruthy()
    })
})

await describe('Test with a failure', () => {
    test('this test will fail', () => {
        expect(1).toBe(2) // This should fail
    })
})
