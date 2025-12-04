import {glob} from 'glob'
import {relative, resolve} from 'path'

/*
 Special variables that can be used in ${...} expressions
 */
export type SpecialVariables = {
    TESTDIR?: string // Absolute path to test file directory
    CONFIGDIR?: string // Absolute path to testme.json5 directory
    OS?: string // Operating system: darwin, linux, windows
    ARCH?: string // CPU architecture: arm64, x64, x86
    PLATFORM?: string // Combined OS-ARCH: macosx-arm64, linux-x64, windows-x64
    CC?: string // Compiler name: gcc, clang, msvc
    PROFILE?: string // Build profile: dev, prod, debug, release, etc.
}

/*
 Expands ${...} references in strings using glob patterns and special variables
 Supports expanding ${path/pattern} to matching file paths
 Supports special variables like ${TESTDIR}, ${OS}, ${ARCH}, etc.
 */
export class GlobExpansion {
    /*
     Expands a single string that may contain ${...} references
     @param input String potentially containing ${...} patterns
     @param baseDir Base directory for relative path resolution
     @param specialVars Optional special variables to substitute
     @returns Promise resolving to array of expanded strings
     */
    static async expandString(
        input: string,
        baseDir: string = process.cwd(),
        specialVars?: SpecialVariables
    ): Promise<string[]> {
        // Type guard - ensure input is a string
        if (typeof input !== 'string') {
            throw new TypeError(`expandString expects a string, got ${typeof input}: ${JSON.stringify(input)}`)
        }

        // If no ${...} pattern found, return input as-is
        if (!input.includes('${')) {
            return [input]
        }

        // First, substitute special variables (${TESTDIR}, ${OS}, etc.)
        // These take priority over environment variables
        let processed = this.substituteSpecialVariables(input, specialVars)

        // Then, substitute environment variables (${PATH}, ${HOME}, etc.)
        processed = this.substituteEnvironmentVariables(processed)

        // If all ${...} patterns were substituted, we're done
        if (!processed.includes('${')) {
            return [processed]
        }

        // Find all remaining ${...} patterns (glob patterns)
        const patterns = this.extractPatterns(processed)
        if (patterns.length === 0) {
            return [processed]
        }

        // For simplicity, handle strings with a single ${...} pattern
        // Multiple patterns in one string would require more complex expansion logic
        if (patterns.length === 1) {
            return await this.expandSinglePattern(processed, patterns[0], baseDir)
        }

        // For multiple patterns, we'd need to generate all combinations
        // For now, just expand the first pattern found
        return await this.expandSinglePattern(processed, patterns[0], baseDir)
    }

    /*
     Expands an array of strings that may contain ${...} references
     @param inputs Array of strings potentially containing ${...} patterns
     @param baseDir Base directory for relative path resolution
     @param specialVars Optional special variables to substitute
     @returns Promise resolving to flattened array of expanded strings
     */
    static async expandArray(
        inputs: string[],
        baseDir: string = process.cwd(),
        specialVars?: SpecialVariables
    ): Promise<string[]> {
        const results: string[] = []

        for (const input of inputs) {
            const expanded = await this.expandString(input, baseDir, specialVars)
            results.push(...expanded)
        }

        return results
    }

    /*
     Expands a single string and returns the first result (for environment variables)
     @param input String potentially containing ${...} patterns
     @param baseDir Base directory for relative path resolution
     @param specialVars Optional special variables to substitute
     @returns Promise resolving to the first expanded string
     */
    static async expandSingle(
        input: string,
        baseDir: string = process.cwd(),
        specialVars?: SpecialVariables
    ): Promise<string> {
        // Type guard - ensure input is a string
        if (typeof input !== 'string') {
            throw new TypeError(`expandSingle expects a string, got ${typeof input}: ${JSON.stringify(input)}`)
        }

        // If no ${...} pattern, return input as-is without expansion
        if (!input.includes('${')) {
            return input
        }

        const expanded = await this.expandString(input, baseDir, specialVars)
        return expanded[0] || input
    }

    /*
     Creates special variables object from test context
     @param executableDir Directory containing the compiled executable
     @param testDir Directory containing the test file
     @param configDir Directory containing testme.json5 (optional)
     @param compiler Compiler name (gcc, clang, msvc)
     @param profile Build profile (dev, prod, debug, release, etc.)
     @returns SpecialVariables object with calculated values
     */
    static createSpecialVariables(
        executableDir: string,
        testDir: string,
        configDir?: string,
        compiler?: string,
        profile?: string
    ): SpecialVariables {
        // TESTDIR and CONFIGDIR are absolute paths (for use in rpath and other absolute path contexts)
        const testDirAbs = resolve(testDir)
        const configDirAbs = configDir ? resolve(configDir) : resolve(testDir)

        // Detect OS
        let os = 'unknown'
        if (process.platform === 'darwin') os = 'macosx'
        else if (process.platform === 'linux') os = 'linux'
        else if (process.platform === 'win32') os = 'windows'

        // Detect architecture
        // Note: Bun on Windows ARM64 reports process.arch as 'x64' due to x64 emulation
        // Check PROCESSOR_IDENTIFIER env var on Windows for accurate ARM64 detection
        let arch = 'unknown'
        if (process.platform === 'win32') {
            const procId = process.env.PROCESSOR_IDENTIFIER || ''
            if (procId.includes('ARM')) {
                arch = 'arm64'
            } else if (process.arch === 'x64') {
                arch = 'x64'
            } else if (process.arch === 'ia32') {
                arch = 'x86'
            }
        } else {
            if (process.arch === 'arm64') arch = 'arm64'
            else if (process.arch === 'x64') arch = 'x64'
            else if (process.arch === 'ia32') arch = 'x86'
        }

        // Combine OS and architecture
        const platform = `${os}-${arch}`

        // Extract compiler name from path if needed
        let cc = compiler || 'unknown'
        if (cc.includes('/')) {
            cc = cc.split('/').pop() || cc
        }
        if (cc.startsWith('cl.exe') || cc === 'cl') {
            cc = 'msvc'
        } else if (cc.includes('gcc')) {
            cc = 'gcc'
        } else if (cc.includes('clang')) {
            cc = 'clang'
        }

        // Determine profile (use provided, or from environment, or default to 'dev')
        const profileValue = profile || process.env.PROFILE || 'dev'

        return {
            TESTDIR: testDirAbs,
            CONFIGDIR: configDirAbs,
            OS: os,
            ARCH: arch,
            PLATFORM: platform,
            CC: cc,
            PROFILE: profileValue,
        }
    }

    /*
     Substitutes special variables in a string
     @param input String potentially containing special variables like ${TESTDIR}
     @param specialVars Special variables to substitute
     @returns String with special variables replaced
     */
    private static substituteSpecialVariables(input: string, specialVars?: SpecialVariables): string {
        if (!specialVars) {
            return input
        }

        let result = input

        // Replace each special variable if defined
        if (specialVars.TESTDIR !== undefined) {
            result = result.replace(/\$\{TESTDIR\}/g, specialVars.TESTDIR)
        }
        if (specialVars.CONFIGDIR !== undefined) {
            result = result.replace(/\$\{CONFIGDIR\}/g, specialVars.CONFIGDIR)
        }
        if (specialVars.OS !== undefined) {
            result = result.replace(/\$\{OS\}/g, specialVars.OS)
        }
        if (specialVars.ARCH !== undefined) {
            result = result.replace(/\$\{ARCH\}/g, specialVars.ARCH)
        }
        if (specialVars.PLATFORM !== undefined) {
            result = result.replace(/\$\{PLATFORM\}/g, specialVars.PLATFORM)
        }
        if (specialVars.CC !== undefined) {
            result = result.replace(/\$\{CC\}/g, specialVars.CC)
        }
        if (specialVars.PROFILE !== undefined) {
            result = result.replace(/\$\{PROFILE\}/g, specialVars.PROFILE)
        }

        return result
    }

    /*
     Substitutes environment variables in a string
     Checks process.env for any ${VAR} pattern and replaces with the env var value
     @param input String potentially containing environment variables like ${PATH}
     @returns String with environment variables replaced
     */
    private static substituteEnvironmentVariables(input: string): string {
        // Match ${VAR} patterns that are not glob patterns (don't contain / or *)
        const envVarRegex = /\$\{([A-Z_][A-Z0-9_]*)\}/g

        return input.replace(envVarRegex, (match, varName) => {
            // Check if this environment variable exists
            const envValue = process.env[varName]
            if (envValue !== undefined) {
                return envValue
            }
            // If not found in environment, keep the original ${VAR} pattern
            // so it can potentially be processed as a glob pattern later
            return match
        })
    }

    /*
     Extracts all ${...} patterns from a string
     @param input String to search for patterns
     @returns Array of extracted patterns (without ${} wrapper)
     */
    private static extractPatterns(input: string): string[] {
        const patterns: string[] = []
        const regex = /\$\{([^}]+)\}/g
        let match

        while ((match = regex.exec(input)) !== null) {
            patterns.push(match[1])
        }

        return patterns
    }

    /*
     Expands a string containing a single ${...} pattern
     @param input Original string with ${...} pattern
     @param pattern The glob pattern inside ${...}
     @param baseDir Base directory for relative path resolution
     @returns Promise resolving to array of expanded strings
     */
    private static async expandSinglePattern(input: string, pattern: string, baseDir: string): Promise<string[]> {
        try {
            // Use glob to find matching paths
            const matches = await glob(pattern, {
                cwd: baseDir,
                absolute: false,
                nodir: false, // Allow directories to match too
            })

            if (matches.length === 0) {
                // If no matches found, return the original string with ${...} removed
                // This allows graceful degradation
                const fallback = input.replace(`\${${pattern}}`, pattern)
                return [fallback]
            }

            // Replace ${pattern} with each match
            return matches.map((match) => input.replace(`\${${pattern}}`, match))
        } catch (error) {
            // If glob fails, return original string with ${...} removed
            const fallback = input.replace(`\${${pattern}}`, pattern)
            return [fallback]
        }
    }
}
