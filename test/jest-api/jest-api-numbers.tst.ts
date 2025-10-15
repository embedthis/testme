/**
    jest-api-numbers.tst.ts - Test numeric comparison matchers
    Tests: toBeGreaterThan, toBeGreaterThanOrEqual, toBeLessThan, toBeLessThanOrEqual, toBeCloseTo
*/

import {expect} from 'testme'

console.log('Testing Jest/Vitest-compatible expect() API - Numeric Matchers...')

//  ==================== Numeric Comparison Matchers ====================

//  toBeGreaterThan
expect(5).toBeGreaterThan(3)
expect(10).toBeGreaterThan(5)
expect(-1).toBeGreaterThan(-5)
expect(0.5).toBeGreaterThan(0.3)

expect(3).not.toBeGreaterThan(5)
expect(5).not.toBeGreaterThan(5) //  Equal values don't pass

//  toBeGreaterThanOrEqual
expect(5).toBeGreaterThanOrEqual(3)
expect(5).toBeGreaterThanOrEqual(5) //  Equal values pass
expect(10).toBeGreaterThanOrEqual(10)
expect(-1).toBeGreaterThanOrEqual(-5)

expect(3).not.toBeGreaterThanOrEqual(5)
expect(4.9).not.toBeGreaterThanOrEqual(5)

//  toBeLessThan
expect(3).toBeLessThan(5)
expect(-5).toBeLessThan(-1)
expect(0.3).toBeLessThan(0.5)

expect(5).not.toBeLessThan(3)
expect(5).not.toBeLessThan(5) //  Equal values don't pass

//  toBeLessThanOrEqual
expect(3).toBeLessThanOrEqual(5)
expect(5).toBeLessThanOrEqual(5) //  Equal values pass
expect(10).toBeLessThanOrEqual(10)
expect(-5).toBeLessThanOrEqual(-1)

expect(5).not.toBeLessThanOrEqual(3)
expect(5.1).not.toBeLessThanOrEqual(5)

//  toBeCloseTo - floating point approximation
expect(0.1 + 0.2).toBeCloseTo(0.3) //  Classic floating point issue
expect(0.1 + 0.2).not.toBe(0.3) //  Strict equality fails
expect(0.1 + 0.2).toBeCloseTo(0.3, 10) //  Even with high precision

expect(0.2 + 0.1).toBeCloseTo(0.3, 1) //  Precision 1
expect(0.2 + 0.1).toBeCloseTo(0.3, 2) //  Precision 2
expect(0.2 + 0.1).toBeCloseTo(0.3, 5) //  Precision 5

expect(1.23456).toBeCloseTo(1.23455, 4) //  Close with precision 4
expect(1.23456).not.toBeCloseTo(1.24, 2) //  Not close with precision 2

//  Edge cases
expect(0).toBeCloseTo(0)
expect(-0).toBeCloseTo(0)
expect(1e-10).toBeCloseTo(0, 9)

//  Negative numbers
expect(-0.1 - 0.2).toBeCloseTo(-0.3)
expect(-5.123).toBeCloseTo(-5.124, 2)

//  Large numbers
expect(1000000.1).toBeCloseTo(1000000.1)
expect(1000000.1).not.toBeCloseTo(1000001)

//  Chain comparisons for ranges
const value = 5
expect(value).toBeGreaterThan(0)
expect(value).toBeLessThan(10)
expect(value).toBeGreaterThanOrEqual(5)
expect(value).toBeLessThanOrEqual(5)

//  Test with .not
expect(1.5).not.toBeCloseTo(1.6, 1)
expect(1.51).not.toBeCloseTo(1.6, 1)

console.log('✓ All numeric Jest API tests passed!')
