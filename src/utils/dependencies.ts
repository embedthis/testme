import {existsSync} from 'fs'
import {readFile, writeFile} from 'fs/promises'
import {isAbsolute, resolve} from 'path'
import {CompilerType} from '../platform/compiler.ts'

/*
 Tracks every file a compiled test actually depends on, so the compile cache can tell whether a
 cached binary is still current.

 Keying the cache on the .tst.c file alone is wrong twice over: a test compiles as a standalone
 translation unit, so shared C is factored into headers the cache could not see, and a test usually
 exists to exercise a library that the cache could not see either. Both produce the same failure --
 a green run that executed a binary built from code that no longer exists.
 */
export class DependencyTracker {
    //  Name of the sidecar recording the inputs a cached binary was built from
    private static readonly SIDECAR = 'inputs.json'

    //  Extensions that name a link input directly on the command line
    private static readonly LINK_SUFFIXES = ['.a', '.o', '.so', '.dylib', '.lib', '.obj']

    /*
     Compiler arguments that make the compiler report the headers it included
     @param type Compiler type
     @param depfilePath Where a makefile-fragment depfile should be written
     @returns Arguments to add to the compile command
     */
    static compileArgs(type: CompilerType, depfilePath: string): string[] {
        if (type === CompilerType.MSVC) {
            //  MSVC has no depfile; it reports includes on stdout instead
            return ['/showIncludes']
        }
        return ['-MMD', '-MF', depfilePath]
    }

    /*
     Extracts included headers from MSVC /showIncludes output and removes those lines from it
     The note prefix is localized, so a line is recognised by the rooted path (drive, UNC or slash) it
     ends with
     @param stdout Compiler standard output
     @returns The headers reported, and the output with the notes removed
     */
    static extractMsvcIncludes(stdout: string): {includes: string[]; output: string} {
        const includes: string[] = []
        const kept: string[] = []

        for (const line of stdout.split('\n')) {
            const match = line.match(/:\s+((?:[A-Za-z]:[\\/]|\\\\|\/).*?)\s*$/)
            const path = match?.[1]?.trim()
            if (path && isAbsolute(path) && existsSync(path)) {
                includes.push(path)
            } else {
                kept.push(line)
            }
        }

        return {includes, output: kept.join('\n')}
    }

    /*
     Parses a makefile-fragment depfile into the paths it names
     @param content Depfile content as written by -MMD
     @returns Absolute paths of every prerequisite, excluding the target itself
     */
    static parseDepfile(content: string, baseDir: string): string[] {
        //  Join the escaped line continuations, then drop the "target:" prefix
        const joined = content.replace(/\\\r?\n/g, ' ')
        const colon = joined.indexOf(':')
        if (colon < 0) {
            return []
        }

        //  Prerequisites are whitespace separated, with spaces in a path escaped as "\ "
        const prerequisites = joined
            .slice(colon + 1)
            .split(/(?<!\\)\s+/)
            .map((entry) => entry.replace(/\\ /g, ' ').trim())
            .filter((entry) => entry.length > 0)

        return prerequisites.map((entry) => (isAbsolute(entry) ? entry : resolve(baseDir, entry)))
    }

    /*
     Resolves the files a link command actually reads
     Only libraries reachable through the test's own -L/\/LIBPATH: directories are tracked: those are
     the ones a test run rebuilds, while system libraries do not change between runs
     @param flags Fully resolved compiler flags
     @param libraryFlags Fully resolved library flags, as produced by CompilerManager.processLibraries
     @returns Absolute paths of the link inputs that exist
     */
    static resolveLinkInputs(flags: string[], libraryFlags: string[]): string[] {
        const args = [...flags, ...libraryFlags]
        const searchDirs: string[] = []
        const inputs: string[] = []

        for (let i = 0; i < args.length; i++) {
            const arg = args[i]

            if (arg === '-L' || arg === '-l') {
                //  Separated form: the value is the next argument
                const value = args[i + 1]
                if (value) {
                    if (arg === '-L') searchDirs.push(value)
                    i++
                }
            } else if (arg.startsWith('-L')) {
                searchDirs.push(arg.slice(2))
            } else if (arg.startsWith('/LIBPATH:')) {
                searchDirs.push(arg.slice('/LIBPATH:'.length))
            } else if (this.LINK_SUFFIXES.some((suffix) => arg.toLowerCase().endsWith(suffix))) {
                inputs.push(arg)
            }
        }

        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            const name = arg === '-l' ? args[i + 1] : arg.startsWith('-l') ? arg.slice(2) : undefined
            if (!name) {
                continue
            }
            for (const dir of searchDirs) {
                inputs.push(...['.a', '.dylib', '.so'].map((suffix) => resolve(dir, `lib${name}${suffix}`)))
                inputs.push(resolve(dir, `${name}.lib`))
            }
        }

        return [...new Set(inputs.map((path) => resolve(path)))].filter((path) => existsSync(path))
    }

    /*
     Records the inputs a freshly compiled binary was built from
     @param sidecarPath Path of the sidecar to write
     @param inputs Absolute paths of every file the binary depends on
     */
    static async record(sidecarPath: string, inputs: string[]): Promise<void> {
        const unique = [...new Set(inputs)].sort()
        await writeFile(sidecarPath, JSON.stringify({inputs: unique}, null, 2))
    }

    /*
     Reads back the inputs recorded for a cached binary
     @param sidecarPath Path of the sidecar to read
     @returns The recorded paths, or undefined if nothing was recorded
     */
    static async read(sidecarPath: string): Promise<string[] | undefined> {
        try {
            const parsed = JSON.parse(await readFile(sidecarPath, 'utf8'))
            return Array.isArray(parsed?.inputs) ? parsed.inputs : undefined
        } catch {
            return undefined
        }
    }

    /*
     Name of the sidecar file inside a test's artifact directory
     @returns The sidecar's file name
     */
    static sidecarName(): string {
        return this.SIDECAR
    }
}
