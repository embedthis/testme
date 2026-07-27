import {describe, test, expect} from 'testme'
import {countAssertions} from '../src/utils/assertion-counter.ts'

await describe('assertion counter', () => {
    test('returns null when output contains no assertion markers', () => {
        expect(countAssertions('ordinary output with embedded ✓ and ✗ glyphs')).toBe(null)
    })

    test('counts indented pass and fail result lines', () => {
        expect(countAssertions('  ✓ first result\n    ✗ second result\n')).toEqual({
            passed: 1,
            failed: 1,
        })
    })

    test('ignores status glyphs embedded in passing test names', () => {
        expect(countAssertions([
            '  ✓ L1 reports ✗ above the rejection threshold',
            '  ✓ L9 maps ✓, warning, and ✗ accuracy bands',
        ].join('\n'))).toEqual({
            passed: 2,
            failed: 0,
        })
    })

    test('counts a genuine failure once when its name also contains glyphs', () => {
        expect(countAssertions('  ✗ expected ✓ but received ✗\nExpected: ✓\nReceived: ✗')).toEqual({
            passed: 0,
            failed: 1,
        })
    })
})
