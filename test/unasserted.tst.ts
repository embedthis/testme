/*
    unasserted.tst.ts - A test that passes having asserted nothing must be reported distinctly

    A test file that runs to its end without asserting has nearly always swallowed its own body:
    an early return, a gate that never opened, or an exception caught and discarded. It used to be
    reported as a plain PASS, indistinguishable from a test that asserted and passed. It is now
    flagged with a warning, failed under the 'fail' policy, and left alone under 'allow' for tests
    that rely on their exit status.

    This drives the whole path -- fixture, handler, runner, reporter -- through the built binary.
    The child's raw output is printed only when a check fails: it contains ✓ and ✗ markers by
    design, and the assertion counter would otherwise count them against this test.
 */

import {ttrue} from 'testme'
import {spawn} from 'bun'
import {join} from 'path'

const TM = join(import.meta.dir, '..', 'dist', 'tm')
const FIXTURES = join(import.meta.dir, 'unasserted')

//  The summary is colourised, so its labels carry escape sequences between the words
function plain(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '')
}

//  Each policy's fixtures live in a directory of their own, whose testme.json5 sets the policy
async function runFixture(policy: string, name: string): Promise<{exitCode: number; output: string}> {
    const proc = spawn([TM, '--chdir', join(FIXTURES, policy), name], {stdout: 'pipe', stderr: 'pipe'})
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

const WARNED = /unasserted-silent\.tst\.ts \([^)]*\) - warning: no assertions/

const silent = await runFixture('warn', 'unasserted-silent')
check(silent, WARNED.test(silent.output), 'a test that asserts nothing is warned about beside its result')
check(silent, /Warnings:\s+1 passed with no assertions/.test(silent.output), 'the summary counts the warning')
check(silent, /Passed:\s+1/.test(silent.output), 'under the default policy the warning is advisory')
check(silent, silent.exitCode === 0, 'an advisory warning does not fail the run')

const asserting = await runFixture('warn', 'unasserted-asserting')
check(asserting, asserting.output.includes('unasserted-asserting.tst.ts'), 'the asserting fixture was run')
check(asserting, !asserting.output.includes('warning:'), 'a test that asserts is not warned about')
check(asserting, !asserting.output.includes('Warnings:'), 'a run with no warnings has no warnings line')

const skipping = await runFixture('warn', 'unasserted-skipping')
check(skipping, /Skipped:\s+1/.test(skipping.output), 'the skipping fixture skipped')
check(skipping, !skipping.output.includes('warning:'), 'a test that skipped itself is not warned about')

const strict = await runFixture('fail', 'unasserted-strict')
check(strict, /Failed:\s+1/.test(strict.output), "the 'fail' policy fails a test that asserts nothing")
check(strict, strict.output.includes('without making any assertions'), "the 'fail' policy says why")
check(strict, strict.exitCode !== 0, "a run failed by the 'fail' policy exits non-zero")

const allowed = await runFixture('allow', 'unasserted-status')
check(allowed, /Passed:\s+1/.test(allowed.output), "the 'allow' policy passes a test relying on its exit status")
check(allowed, !allowed.output.includes('warning:'), "the 'allow' policy silences the warning")
