/**
    jest-api-lifecycle.tst.js - Test beforeAll/afterAll lifecycle hooks and skip functionality
*/

import {describe, test, it, expect, beforeEach, afterEach, beforeAll, afterAll} from 'testme'

//  Track hook execution order
let executionLog = []

await describe('beforeAll and afterAll hooks', async () => {
    beforeAll(() => {
        executionLog.push('beforeAll-1')
    })

    afterAll(() => {
        executionLog.push('afterAll-1')
    })

    beforeEach(() => {
        executionLog.push('beforeEach')
    })

    afterEach(() => {
        executionLog.push('afterEach')
    })

    test('first test', () => {
        executionLog.push('test-1')
        expect(executionLog).toContain('beforeAll-1')
        expect(executionLog).toContain('beforeEach')
    })

    test('second test', () => {
        executionLog.push('test-2')
        //  beforeAll should only run once
        const beforeAllCount = executionLog.filter((x) => x === 'beforeAll-1').length
        expect(beforeAllCount).toBe(1)
        //  beforeEach should run for each test
        const beforeEachCount = executionLog.filter((x) => x === 'beforeEach').length
        expect(beforeEachCount).toBe(2)
    })

    test('afterAll not run yet', () => {
        executionLog.push('test-3')
        //  afterAll should not have run yet
        expect(executionLog).not.toContain('afterAll-1')
    })
})

//  Verify afterAll ran after all tests
test('afterAll hook verification', () => {
    expect(executionLog).toContain('afterAll-1')
    //  Verify execution order
    const beforeAllIndex = executionLog.indexOf('beforeAll-1')
    const afterAllIndex = executionLog.indexOf('afterAll-1')
    const test1Index = executionLog.indexOf('test-1')
    const test2Index = executionLog.indexOf('test-2')
    const test3Index = executionLog.indexOf('test-3')

    //  beforeAll should come before all tests
    expect(beforeAllIndex).toBeLessThan(test1Index)
    expect(beforeAllIndex).toBeLessThan(test2Index)
    expect(beforeAllIndex).toBeLessThan(test3Index)

    //  afterAll should come after all tests
    expect(afterAllIndex).toBeGreaterThan(test1Index)
    expect(afterAllIndex).toBeGreaterThan(test2Index)
    expect(afterAllIndex).toBeGreaterThan(test3Index)
})

//  Test nested describe blocks
executionLog = []

await describe('nested describe blocks', async () => {
    beforeAll(() => {
        executionLog.push('outer-beforeAll')
    })

    afterAll(() => {
        executionLog.push('outer-afterAll')
    })

    test('outer test 1', () => {
        executionLog.push('outer-test-1')
        expect(executionLog).toContain('outer-beforeAll')
    })

    await describe('inner describe', async () => {
        beforeAll(() => {
            executionLog.push('inner-beforeAll')
        })

        afterAll(() => {
            executionLog.push('inner-afterAll')
        })

        test('inner test 1', () => {
            executionLog.push('inner-test-1')
            expect(executionLog).toContain('outer-beforeAll')
            expect(executionLog).toContain('inner-beforeAll')
        })

        test('inner test 2', () => {
            executionLog.push('inner-test-2')
            //  inner beforeAll should only run once
            const innerBeforeAllCount = executionLog.filter((x) => x === 'inner-beforeAll').length
            expect(innerBeforeAllCount).toBe(1)
        })
    })

    test('outer test 2', () => {
        executionLog.push('outer-test-2')
        //  inner afterAll should have run
        expect(executionLog).toContain('inner-afterAll')
        //  outer afterAll should not have run yet
        expect(executionLog).not.toContain('outer-afterAll')
    })
})

//  Verify hook order for nested blocks
test('nested hooks verification', () => {
    expect(executionLog).toContain('outer-afterAll')

    const outerBeforeAllIndex = executionLog.indexOf('outer-beforeAll')
    const innerBeforeAllIndex = executionLog.indexOf('inner-beforeAll')
    const innerAfterAllIndex = executionLog.indexOf('inner-afterAll')
    const outerAfterAllIndex = executionLog.indexOf('outer-afterAll')

    //  Outer beforeAll should come first
    expect(outerBeforeAllIndex).toBeLessThan(innerBeforeAllIndex)
    //  Inner afterAll should come before outer afterAll
    expect(innerAfterAllIndex).toBeLessThan(outerAfterAllIndex)
})

//  Test async lifecycle hooks
let asyncValue = 0

await describe('async lifecycle hooks', async () => {
    beforeAll(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        asyncValue = 42
    })

    afterAll(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        asyncValue = 0
    })

    test('async beforeAll sets value', () => {
        expect(asyncValue).toBe(42)
    })

    test('async value persists', () => {
        expect(asyncValue).toBe(42)
    })
})

test('async afterAll cleared value', () => {
    expect(asyncValue).toBe(0)
})

//  Test test.skip()
let skipTestRan = false

await describe('test.skip() functionality', async () => {
    test('this test runs', () => {
        expect(true).toBeTruthy()
    })

    test.skip('this test is skipped', () => {
        skipTestRan = true
        //  This should not execute
        expect(false).toBeTruthy()
    })

    test('verify skipped test did not run', () => {
        expect(skipTestRan).toBe(false)
    })
})

//  Test test.skipIf()
const isCI = process.env.CI === 'true'
const isNotCI = !isCI

await describe('test.skipIf() functionality', async () => {
    test.skipIf(true)('skipped when condition is true', () => {
        //  This should not execute
        expect(false).toBeTruthy()
    })

    test.skipIf(false)('runs when condition is false', () => {
        expect(true).toBeTruthy()
    })

    //  Test with real condition
    test.skipIf(isCI)('skipped in CI environment', () => {
        //  Only runs if not in CI
        expect(isNotCI).toBeTruthy()
    })
})

//  Test it.skip() and it.skipIf() (aliases)
let itSkipTestRan = false

await describe('it.skip() and it.skipIf() functionality', async () => {
    it('this test runs', () => {
        expect(true).toBeTruthy()
    })

    it.skip('this test is skipped', () => {
        itSkipTestRan = true
        //  This should not execute
        expect(false).toBeTruthy()
    })

    it.skipIf(true)('skipped with it.skipIf(true)', () => {
        //  This should not execute
        expect(false).toBeTruthy()
    })

    it.skipIf(false)('runs with it.skipIf(false)', () => {
        expect(true).toBeTruthy()
    })

    test('verify it.skip() did not run', () => {
        expect(itSkipTestRan).toBe(false)
    })
})

//  Test describe.skip()
let describeSkipTestRan = false

describe.skip('this entire block is skipped', async () => {
    beforeAll(() => {
        describeSkipTestRan = true
    })

    test('this test does not run', () => {
        //  This should not execute
        expect(false).toBeTruthy()
    })

    test('neither does this one', () => {
        //  This should not execute
        expect(false).toBeTruthy()
    })
})

test('verify describe.skip() did not run', () => {
    expect(describeSkipTestRan).toBe(false)
})

//  Test combination of beforeAll/afterAll with beforeEach/afterEach
executionLog = []

await describe('combined hooks', async () => {
    beforeAll(() => {
        executionLog.push('setup-once')
    })

    beforeEach(() => {
        executionLog.push('setup-each')
    })

    afterEach(() => {
        executionLog.push('teardown-each')
    })

    afterAll(() => {
        executionLog.push('teardown-once')
    })

    test('first combined test', () => {
        executionLog.push('test-A')
        expect(executionLog).toEqual(['setup-once', 'setup-each', 'test-A'])
    })

    test('second combined test', () => {
        executionLog.push('test-B')
        expect(executionLog).toEqual(['setup-once', 'setup-each', 'test-A', 'teardown-each', 'setup-each', 'test-B'])
    })
})

test('verify combined hooks order', () => {
    expect(executionLog).toEqual([
        'setup-once',
        'setup-each',
        'test-A',
        'teardown-each',
        'setup-each',
        'test-B',
        'teardown-each',
        'teardown-once',
    ])
})

console.log('\n✓ All lifecycle hook tests passed!')
