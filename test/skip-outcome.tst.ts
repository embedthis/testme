/*
    skip-outcome.tst.ts - A skipped test must be reported as skipped, not passed

    tskip() used to be console.log: it printed its reason, returned, and let the file run off its
    end with zero assertions, which every handler reads as a pass. So every platform-gated,
    depth-gated and tool-gated test in every project using TestMe contributed a green tick to its
    suite's headline number while never executing, and the summary's "Skipped" line was always
    zero. A reader of that number could not tell "this passed" from "this never ran".

    This drives the whole path -- fixture, exit status, handler, reporter -- rather than
    unit-testing the handler, because the defect lived in the seam between them.

    The child's raw output is printed only when a check fails: it contains ✓ and ✗ markers by
    design, and the assertion counter would otherwise count them against this test.
 */

import {ttrue} from 'testme'
import {spawn} from 'bun'
import {join} from 'path'

const TM = join(import.meta.dir, '..', 'dist', 'tm')
const FIXTURES = join(import.meta.dir, 'skip')

//  The summary is colourised, so its labels carry escape sequences between the words
function plain(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '')
}

async function runFixtures(...names: string[]): Promise<{exitCode: number; output: string}> {
    const proc = spawn([TM, '--chdir', FIXTURES, ...names], {stdout: 'pipe', stderr: 'pipe'})
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    await proc.exited
    return {exitCode: proc.exitCode ?? 1, output: plain(stdout + stderr)}
}

/*
    Asserts a condition about a run, dumping the run's output when it does not hold.
 */
function check(run: {exitCode: number; output: string}, condition: boolean, message: string) {
    if (!condition) {
        console.log('--- tm output ---')
        console.log(run.output)
        console.log('--- exit code: ' + run.exitCode + ' ---')
    }
    ttrue(condition, message)
}

/*
    Checks the outcome of a fixture that skips itself, in whichever language wrote it.
 */
function checkSkipped(run: {exitCode: number; output: string}, language: string) {
    check(run, /Skipped:\s+1/.test(run.output), `${language}: the summary reports one skipped test`)
    check(run, /Passed:\s+0/.test(run.output), `${language}: a skipped test is not counted as a pass`)
    check(run, /Failed:\s+0/.test(run.output), `${language}: a skipped test is not counted as a failure`)
    check(run, run.output.includes('no kettle on this platform'), `${language}: the skip reason is reported`)
    check(run, !run.output.includes('NEVER-REACHED'), `${language}: code after tskip() does not run`)
    check(run, run.exitCode === 0, `${language}: a run whose only test skipped exits zero`)
    check(run, /Result:\s+PASSED/.test(run.output), `${language}: a run whose only test skipped is not a failure`)
}

const skippedTs = await runFixtures('skip-skipped')
check(skippedTs, skippedTs.output.includes('skip-skipped.tst.ts'), 'the skipping fixture was discovered and run')
checkSkipped(skippedTs, 'ts')

const skippedC = await runFixtures('skip-c')
check(skippedC, skippedC.output.includes('skip-c.tst.c'), 'the skipping C fixture was discovered and run')
checkSkipped(skippedC, 'c')

//  One passing, one failing and one skipped must tally 1 / 1 / 1, not 2 / 1 / 0
const mixed = await runFixtures('skip-passing', 'skip-failing', 'skip-skipped')
check(mixed, /Passed:\s+1/.test(mixed.output), 'a mixed suite reports one pass')
check(mixed, /Failed:\s+1/.test(mixed.output), 'a mixed suite reports one failure')
check(mixed, /Skipped:\s+1/.test(mixed.output), 'a mixed suite reports one skip')
check(mixed, /Total:\s+3/.test(mixed.output), 'a mixed suite reports three tests in total')
check(mixed, mixed.exitCode !== 0, 'a mixed suite containing a failure exits non-zero')
