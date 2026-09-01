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

    test('counts markers at the start of a line', () => {
        expect(countAssertions('✓ first\n✓ second\n✗ third\n')).toEqual({passed: 2, failed: 1})
    })

    /*
        The counting pattern lets leading whitespace run across line boundaries, so a marker behind
        one or more blank lines has to be counted once rather than swallowed or counted twice.
     */
    test('counts markers preceded by blank lines exactly once', () => {
        expect(countAssertions('\n\n✓ first\n\n\n   ✓ second\n \t\n\t✓ third\n')).toEqual({
            passed: 3,
            failed: 0,
        })
    })

    test('counts adjacent bare markers on consecutive lines', () => {
        expect(countAssertions('✓\n✓\n✗\n')).toEqual({passed: 2, failed: 1})
    })

    test('does not count a marker embedded mid-line', () => {
        expect(countAssertions('progress: ✓ done\nsummary ✗ 1 of 4\n')).toBe(null)
    })

    /*
        A failure report quotes the values it compared. When the values are themselves markers the
        quoted lines must not be added to the tally, or a failure inflates the count it belongs to.
     */
    test('does not count markers quoted as expected and received values', () => {
        expect(countAssertions('✗ mismatch at t.ts:9\nExpected: ✓\nReceived: ✗\n')).toEqual({
            passed: 0,
            failed: 1,
        })
    })

    test('counts markers in CRLF output', () => {
        expect(countAssertions('✓ first\r\n  ✓ second\r\n✗ third\r\n')).toEqual({passed: 2, failed: 1})
    })

    test('counts only the first marker when two share a line', () => {
        expect(countAssertions('✓ first ✓ second\n')).toEqual({passed: 1, failed: 0})
    })
})
