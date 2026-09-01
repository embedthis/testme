/*
    assertion-total.tst.ts - The Assertions line in the run summary must be a function of the
    markers the tests printed, and of nothing else.

    Drives tm over test/assertions, whose fixtures print a number of markers fixed by construction,
    and checks the three properties the tally has to have: it equals the number of markers printed,
    it does not move between two identical runs, and running the fixtures one at a time and adding
    the per-run totals gives the same number as running them together.
 */

import {describe, test, expect} from 'testme'
import {join, resolve} from 'path'

const TESTME = resolve(import.meta.dir, '..', 'testme.ts')
const FIXTURES = join(import.meta.dir, 'assertions')

//  Markers each fixture prints. Fixed by construction - keep in step with the fixtures themselves.
const EXPECTED: Record<string, number> = {
    'known-count.fixture.ts': 7,
    'adversarial-spacing.fixture.ts': 3,
}
const TOTAL = Object.values(EXPECTED).reduce((sum, count) => sum + count, 0)

type Tally = {passed: number; total: number}

/*
    Runs tm over the fixture directory and returns the tally it reported.
    @param patterns Optional test file patterns to select a subset of the fixtures
    @returns The passed and total assertion counts from the run summary
 */
async function runTm(patterns: string[] = []): Promise<Tally> {
    const proc = Bun.spawn([process.execPath, 'run', TESTME, ...patterns], {
        cwd: FIXTURES,
        stdout: 'pipe',
        stderr: 'pipe',
    })
    const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ])
    await proc.exited

    const output = stdout + stderr
    const match = output.match(/Assertions: (\d+)\/(\d+) passed/)
    if (!match) {
        throw new Error(`tm reported no assertion tally for [${patterns.join(' ')}]:\n${output}`)
    }
    return {passed: Number(match[1]), total: Number(match[2])}
}

await describe('assertion tally', () => {
    test('counts exactly the markers the fixtures printed', async () => {
        expect(await runTm()).toEqual({passed: TOTAL, total: TOTAL})
    })

    test('does not move between two identical runs', async () => {
        const first = await runTm()
        const second = await runTm()
        expect(second).toEqual(first)
    })

    test('reports the same total whole as the sum of its parts', async () => {
        let sum = 0
        for (const [fixture, markers] of Object.entries(EXPECTED)) {
            const tally = await runTm([fixture])
            expect(tally).toEqual({passed: markers, total: markers})
            sum += tally.passed
        }
        expect(sum).toBe(TOTAL)
    })
})
