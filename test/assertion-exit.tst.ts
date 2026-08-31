/*
    assertion-exit.tst.ts - A failed assertion must fail its test

    treport() prints its ✗ and calls process.exit(1), but the module's process 'exit' handler then
    set process.exitCode back to the Jest-style API's accumulated code, which the traditional
    ttrue()/teq() path never touches and which is 0. Every handler takes a test's status from the
    exit code, so a failing ttrue() reported PASS. The suite showed the failure only as a gap
    between the passed and total assertion counts in the summary, which nobody reads as a failure.

    This drives the whole path -- fixture, runner, reporter, exit status -- rather than unit-testing
    the handler, because the defect lived in the seam between them.

    The child's raw output is printed only when a check fails: it contains ✗ markers by design, and
    the assertion counter would otherwise count them against this test.
 */

import {ttrue} from 'testme'
import {spawn} from 'bun'
import {join} from 'path'

const TM = join(import.meta.dir, '..', 'dist', 'tm')
const FIXTURES = join(import.meta.dir, 'assertion-exit')

//  The summary is colourised, so "✗ Failed:" carries an escape sequence between the two words
function plain(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '')
}

async function runFixture(name: string): Promise<{exitCode: number; output: string}> {
    const proc = spawn([TM, '--chdir', FIXTURES, name], {stdout: 'pipe', stderr: 'pipe'})
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    await proc.exited
    return {exitCode: proc.exitCode ?? 1, output: plain(stdout + stderr)}
}

const result = await runFixture('failing')

function check(condition: boolean, message: string) {
    if (!condition) {
        console.log('--- tm output ---')
        console.log(result.output)
        console.log('--- exit code: ' + result.exitCode + ' ---')
    }
    ttrue(condition, message)
}

//  The fixture ran at all -- a pattern that matched nothing would pass every check below
check(result.output.includes('failing.tst.ts'), 'the failing fixture was discovered and run')

check(result.exitCode !== 0, 'a run containing a failed assertion exits non-zero')
check(/✗\s+Failed:\s+1/.test(result.output), 'the summary reports one failed test')
check(!/Result:.*PASSED/.test(result.output), 'the run is not reported as PASSED')
