/*
    assertion-counter.ts - Count test assertions from test output

    Responsibilities:
    - Parse test output for ✓ (pass) and ✗ (fail) symbols
    - Return assertion counts
*/

export type AssertionCounts = {
    passed: number
    failed: number
}

/**
 * Count test assertions from output by looking for ✓ and ✗ symbols
 *
 * @param output - Test output string
 * @returns Object with passed and failed counts, or null if no assertions found
 */
export function countAssertions(output: string): AssertionCounts | null {
    if (!output) {
        return null
    }

    // Count ✓ symbols (pass)
    const passedMatches = output.match(/✓/g)
    const passed = passedMatches ? passedMatches.length : 0

    // Count ✗ symbols (fail)
    const failedMatches = output.match(/✗/g)
    const failed = failedMatches ? failedMatches.length : 0

    // Only return counts if we found at least one assertion marker
    if (passed === 0 && failed === 0) {
        return null
    }

    return {passed, failed}
}
