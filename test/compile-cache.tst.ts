/*
    compile-cache.tst.ts - The C compile cache must see everything the binary was built from

    The cache was keyed on the .tst.c file alone, so a header the test included -- or the library it
    linked -- could be edited into something that does not even compile, and TestMe would rerun the
    cached binary and report a pass. Both are the normal way to factor C for tests: each .tst.c is a
    standalone translation unit with no link step, so shared code lives in a header, and the library
    is usually the whole point of the run. The cache was blind precisely where it mattered most.

    Drives tm over fixtures whose header and library this test rewrites, and checks the cache
    decision each time. The child's raw output is printed only when a check fails: it contains ✓ and
    ✗ markers by design, and the assertion counter would otherwise count them against this test.
 */

import {ttrue, tinfo} from 'testme'
import {DependencyTracker} from '../src/utils/dependencies.ts'
import {CompilerManager, CompilerType} from '../src/platform/compiler.ts'
import {spawn} from 'bun'
import {mkdirSync, readFileSync, writeFileSync, rmSync, utimesSync, existsSync} from 'fs'
import {join} from 'path'

const TM = join(import.meta.dir, '..', 'dist', 'tm')
const HEADER_DIR = join(import.meta.dir, 'cache')
const LIB_DIR = join(import.meta.dir, 'cache-lib')
const DEPENDENT_HEADER = join(HEADER_DIR, 'cachedep.h')
const UNRELATED_HEADER = join(HEADER_DIR, 'unrelated.h')
const PROBE_SOURCE = join(LIB_DIR, 'probe.c')

type Run = {exitCode: number; output: string}

/*
    Restores the fixtures this test edits. A failed assertion calls process.exit(), so a finally
    block would not run and a failing run would leave a fixture that cannot compile behind, failing
    every later run for a reason that has nothing to do with the defect under test.
 */
const restorers: Array<() => void> = []
process.on('exit', () => {
    for (const restore of restorers) {
        try {
            restore()
        } catch {
            //  Best effort: a restore that cannot run must not mask the result being reported
        }
    }
})

//  The summary is colourised, so its labels carry escape sequences between the words
function plain(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '')
}

async function run(dir: string, ...names: string[]): Promise<Run> {
    const proc = spawn([TM, '--chdir', dir, '--verbose', ...names], {stdout: 'pipe', stderr: 'pipe'})
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    await proc.exited
    return {exitCode: proc.exitCode ?? 1, output: plain(stdout + stderr)}
}

function check(result: Run, condition: boolean, message: string) {
    if (!condition) {
        console.log('--- tm output ---')
        console.log(result.output)
        console.log('--- exit code: ' + result.exitCode + ' ---')
    }
    ttrue(condition, message)
}

function usedCache(result: Run): boolean {
    return result.output.includes('Using cached binary')
}

/*
    Marks a file as modified now. Writing the same bytes back is not enough on a filesystem whose
    mtime granularity is coarser than the time between two runs.
 */
function touch(path: string) {
    const future = new Date(Date.now() + 2000)
    utimesSync(path, future, future)
}

//  ==================== The header case ====================

rmSync(join(HEADER_DIR, '.testme'), {recursive: true, force: true})
const originalHeader = readFileSync(DEPENDENT_HEADER, 'utf8')
restorers.push(() => {
    writeFileSync(DEPENDENT_HEADER, originalHeader)
    rmSync(join(HEADER_DIR, '.testme'), {recursive: true, force: true})
})

{
    const first = await run(HEADER_DIR, 'cache-header')
    check(first, first.exitCode === 0, 'the header fixture passes when freshly compiled')
    check(first, !usedCache(first), 'the first run compiles rather than using a cached binary')

    const inputs = JSON.parse(readFileSync(join(HEADER_DIR, '.testme', 'cache-header.tst', 'inputs.json'), 'utf8'))
    check(first, inputs.inputs.includes(DEPENDENT_HEADER), 'the included header is recorded as an input')

    const second = await run(HEADER_DIR, 'cache-header')
    check(second, usedCache(second), 'an unchanged test reuses its cached binary')

    touch(UNRELATED_HEADER)
    const unrelated = await run(HEADER_DIR, 'cache-header')
    check(unrelated, usedCache(unrelated), 'a header the test does not include does not force a rebuild')

    //  The reproduction from the ticket: a header edited into something that cannot compile
    writeFileSync(DEPENDENT_HEADER, originalHeader + '\n#error PROBE\n')
    touch(DEPENDENT_HEADER)
    const broken = await run(HEADER_DIR, 'cache-header')
    check(broken, !usedCache(broken), 'an edited header forces a rebuild')
    check(broken, broken.exitCode !== 0, 'a header that cannot compile fails the run')
    check(broken, broken.output.includes('PROBE'), 'the compiler error from the header is reported')

    writeFileSync(DEPENDENT_HEADER, originalHeader)
    touch(DEPENDENT_HEADER)
    const restored = await run(HEADER_DIR, 'cache-header')
    check(restored, restored.exitCode === 0, 'restoring the header makes the fixture pass again')
}

//  ==================== The link-input resolver ====================

const probeDir = join(import.meta.dir, '.testme-cache-probe')
rmSync(probeDir, {recursive: true, force: true})
mkdirSync(probeDir, {recursive: true})
writeFileSync(join(probeDir, 'libresolved.a'), '')
writeFileSync(join(probeDir, 'explicit.o'), '')

const resolved = DependencyTracker.resolveLinkInputs(
    [`-L${probeDir}`, join(probeDir, 'explicit.o'), '-Wall'],
    ['-lresolved', '-lmissing']
)

const resolverRun: Run = {exitCode: 0, output: resolved.join('\n')}
check(resolverRun, resolved.includes(join(probeDir, 'libresolved.a')), 'a -l library under a -L directory is resolved')
check(resolverRun, resolved.includes(join(probeDir, 'explicit.o')), 'an explicit object path is resolved')
check(resolverRun, resolved.every((path) => !path.includes('missing')), 'a library that does not exist is not recorded')
rmSync(probeDir, {recursive: true, force: true})

//  ==================== The library case ====================

/*
    Building the archive needs ar, which MSVC does not ship. The resolver checks above cover the
    part of this that is compiler independent; this drives the whole path where ar is available.
 */
const compilerConfig = await CompilerManager.getDefaultCompilerConfig()
const haveAr = compilerConfig.type !== CompilerType.MSVC && (await Bun.$`which ar`.nothrow().quiet()).exitCode === 0

if (!haveAr) {
    tinfo('ar is not available: the end-to-end library check is not run on this toolchain')
} else {
    const buildDir = join(LIB_DIR, 'build')
    const originalProbe = readFileSync(PROBE_SOURCE, 'utf8')
    restorers.push(() => {
        writeFileSync(PROBE_SOURCE, originalProbe)
        rmSync(join(LIB_DIR, '.testme'), {recursive: true, force: true})
        rmSync(buildDir, {recursive: true, force: true})
    })

    /*
        Compiles probe.c into build/libcacheprobe.a, which the fixture links.
     */
    async function buildLibrary() {
        mkdirSync(buildDir, {recursive: true})
        const objectPath = join(buildDir, 'probe.o')
        const compiled = spawn([compilerConfig.compiler, '-c', '-o', objectPath, PROBE_SOURCE], {
            cwd: LIB_DIR,
            stdout: 'pipe',
            stderr: 'pipe',
        })
        await compiled.exited
        ttrue(compiled.exitCode === 0, 'the probe library source compiles')

        const archived = spawn(['ar', 'rcs', join(buildDir, 'libcacheprobe.a'), objectPath], {
            cwd: LIB_DIR,
            stdout: 'pipe',
            stderr: 'pipe',
        })
        await archived.exited
        ttrue(archived.exitCode === 0, 'the probe library archives')
    }

    rmSync(join(LIB_DIR, '.testme'), {recursive: true, force: true})
    rmSync(buildDir, {recursive: true, force: true})

    {
        await buildLibrary()

        const first = await run(LIB_DIR, 'cache-lib')
        check(first, first.exitCode === 0, 'the library fixture passes when freshly compiled')

        const inputsPath = join(LIB_DIR, '.testme', 'cache-lib.tst', 'inputs.json')
        check(first, existsSync(inputsPath), 'the library fixture recorded its inputs')
        const inputs = JSON.parse(readFileSync(inputsPath, 'utf8'))
        check(
            first,
            inputs.inputs.includes(join(buildDir, 'libcacheprobe.a')),
            'the linked library is recorded as an input'
        )

        const second = await run(LIB_DIR, 'cache-lib')
        check(second, usedCache(second), 'an unchanged library lets the test reuse its cached binary')

        //  Rebuild the library so it returns a value the fixture asserts is wrong
        writeFileSync(PROBE_SOURCE, originalProbe.replace('return 1;', 'return 2;'))
        await buildLibrary()
        touch(join(buildDir, 'libcacheprobe.a'))

        const relinked = await run(LIB_DIR, 'cache-lib')
        check(relinked, !usedCache(relinked), 'a rebuilt library forces a relink')
        check(relinked, relinked.exitCode !== 0, 'the relinked test sees the library change and fails')
    }
}
