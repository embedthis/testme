/*
    service-teardown.tst.ts - Tearing down a setup service must leave nothing it started running

    killProcessUnix() signalled one pid, even though killSetup()'s comment claimed a process-tree
    kill. A setup script is a shell or a launcher, and the server that holds the ports is a separate
    process, so the signal never reached it. The server outlived the run; the next run could not
    bind, reported "Failed to start setup service", and the whole suite failed for no fault of any
    test - a failure that does not look like an environment problem.

    Drives tm over test/service-teardown twice in a row, which is the reproduction from the ticket,
    and checks the grandchild afterwards. The child's raw output is printed only when a check fails:
    it contains ✓ and ✗ markers by design, and the assertion counter would otherwise count them
    against this test.
 */

import {ttrue, tinfo} from 'testme'
import {ProcessManager} from '../src/platform/process.ts'
import {spawn} from 'bun'
import {existsSync, readFileSync, rmSync} from 'fs'
import {join} from 'path'

const TM = join(import.meta.dir, '..', 'dist', 'tm')
const FIXTURE = join(import.meta.dir, 'service-teardown')
const SERVER_PID = join(FIXTURE, 'server.pid')
const SETUP_PID = join(FIXTURE, 'setup.pid')
const GRACEFUL = join(FIXTURE, 'graceful')
const PORT = 18099

type Run = {exitCode: number; output: string}

function plain(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '')
}

function clearState() {
    for (const path of [SERVER_PID, SETUP_PID, GRACEFUL]) {
        rmSync(path, {force: true})
    }
}

/*
    Kills anything a failed run left behind, so a failure here does not fail every later run -- the
    very symptom this test exists to catch. A failed assertion calls process.exit(), so this cannot
    be a finally block.
 */
process.on('exit', () => {
    for (const path of [SERVER_PID, SETUP_PID]) {
        if (!existsSync(path)) {
            continue
        }
        const pid = Number(readFileSync(path, 'utf8'))
        try {
            process.kill(pid, 'SIGKILL')
        } catch {
            //  Already gone, which is the result this test wants
        }
    }
    clearState()
})

async function runFixture(): Promise<Run> {
    const proc = spawn([TM, '--chdir', FIXTURE, 'reach'], {stdout: 'pipe', stderr: 'pipe'})
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    await proc.exited
    return {exitCode: proc.exitCode ?? 1, output: plain(stdout + stderr)}
}

function check(run: Run, condition: boolean, message: string) {
    if (!condition) {
        console.log('--- tm output ---')
        console.log(run.output)
        console.log('--- exit code: ' + run.exitCode + ' ---')
    }
    ttrue(condition, message)
}

/*
    The port is free when nothing is listening on it. Binding is the same question the next run's
    setup service asks, which is the failure the ticket describes.
 */
async function portIsFree(): Promise<boolean> {
    try {
        const server = Bun.listen({hostname: 'localhost', port: PORT, socket: {data() {}}})
        server.stop(true)
        return true
    } catch {
        return false
    }
}

clearState()

const first = await runFixture()
check(first, first.exitCode === 0, 'the first run passes with its setup service')
check(first, existsSync(SERVER_PID), 'the setup service started the background server')

const serverPid = Number(readFileSync(SERVER_PID, 'utf8'))
const setupPid = Number(readFileSync(SETUP_PID, 'utf8'))

//  Give the teardown a moment to be observable, then check what it left behind
await new Promise((resolve) => setTimeout(resolve, 500))

check(first, !(await ProcessManager.isProcessRunning(setupPid)), 'the setup service is gone after the run')
check(first, !(await ProcessManager.isProcessRunning(serverPid)), 'the server the setup service started is gone')
check(first, await portIsFree(), 'the port the server held is free after the run')

if (process.platform === 'win32') {
    tinfo('SIGTERM is not a Windows signal: the graceful-shutdown check is not run on this platform')
} else {
    check(first, existsSync(GRACEFUL), 'the server was asked to stop before it was forced to')
}

//  The reproduction from the ticket: the second consecutive run must start its setup service too
const second = await runFixture()
check(second, second.exitCode === 0, 'a second consecutive run starts its setup service and passes')
check(second, !second.output.includes('Failed to start setup service'), 'the second run is not blocked by an orphan')
