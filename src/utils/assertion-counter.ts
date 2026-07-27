/*
    assertion-counter.ts - Count test assertions from test output

    Responsibilities:
    - Parse line-leading ✓ (pass) and ✗ (fail) assertion markers
    - Return assertion counts
*/

export type AssertionCounts = {
    passed: number
    failed: number
}

/**
 * Count test assertions from line-leading ✓ and ✗ markers
 *
 * @param output - Test output string
 * @returns Object with passed and failed counts, or null if no assertions found
 */
export function countAssertions(output: string): AssertionCounts | null {
    if (!output) {
        return null
    }

    /*
        TestMe assertion/test-result lines begin with an optional indent followed
        by exactly one status marker. Do not count status glyphs embedded in test
        names, diagnostics, or expected/received values.
    */
    let passed = 0
    let failed = 0
    for (const match of output.matchAll(/^\s*([✓✗])(?:\s|$)/gm)) {
        if (match[1] === '✓') {
            passed++
        } else {
            failed++
        }
    }

    // Only return counts if we found at least one assertion marker
    if (passed === 0 && failed === 0) {
        return null
    }

    return {passed, failed}
}
