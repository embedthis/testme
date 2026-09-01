/*
    adversarial-spacing.fixture.ts - Marker shapes that must and must not be counted

    Driven by ../assertion-total.tst.ts. Three lines here begin with a status marker and must be
    counted: one at the start of a line, one indented behind blank lines, and one behind a tab. The
    rest carry the same glyphs in the places a real failure report puts them -- inside a message, and
    in the quoted Expected/Received values -- and must not be counted.
 */

console.log('✓ marker at the start of a line')
console.log('')
console.log('')
console.log('    ✓ indented marker after blank lines')
console.log('progress: ✓ the glyph is mid-line, not a result')
console.log('Expected: ✓')
console.log('Received: ✗')
console.log('\t✓ marker behind a tab')
