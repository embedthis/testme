import type {TestFile, DiscoveryOptions} from './types.ts'
import {TestType} from './types.ts'
import {join, dirname, basename, extname} from 'path'
import {readdir, stat} from 'node:fs/promises'

/*
 TestDiscovery - Pattern-driven test file discovery engine

 Responsibilities:
 - Recursively walks directory trees to find test files
 - Uses include patterns to determine which files are tests
 - Identifies test types by final file extension (.c, .js, .sh, etc.)
 - Supports platform-specific pattern matching
 - Creates TestFile objects with metadata

 Discovery Strategy:
 - Pattern-driven: Files are discovered based on configured include patterns
 - No hardcoded expectations: Any naming convention works (*.tst.c, *.test.c, *.spec.c, etc.)
 - Platform-specific: Patterns in platform sections (macosx, linux, windows) only apply on that platform
 - Type detection: Final extension determines test type (.c → C, .js → JavaScript, etc.)

 Supported Test Types (by final extension):
 - C (.c)
 - JavaScript (.js)
 - TypeScript (.ts)
 - Shell (.sh)
 - PowerShell (.ps1)
 - Batch (.bat, .cmd)
 - Python (.py)
 - Go (.go)
 - Ejscript (.es)

 Pattern Matching:
 - Fully glob-based: patterns like "**​/*.tst.c", "**​/*.test.js", etc.
 - Platform-specific patterns enable platform-specific test files
 - Patterns are evaluated against relative paths from root directory

 Exclusions:
 - node_modules directories
 - .testme artifact directories
 - Hidden directories (.star-slash)
 - Custom exclusion patterns
 */
export class TestDiscovery {
    // Mapping of final file extensions to test types
    // File type is determined purely by the rightmost extension
    private static readonly EXTENSION_TO_TYPE: Record<string, TestType> = {
        '.c': TestType.C,
        '.js': TestType.JavaScript,
        '.ts': TestType.TypeScript,
        '.sh': TestType.Shell,
        '.ps1': TestType.PowerShell,
        '.bat': TestType.Batch,
        '.cmd': TestType.Batch,
        '.py': TestType.Python,
        '.go': TestType.Go,
        '.es': TestType.Ejscript,
    }

    /*
     Discovers test files based on provided options
     @param options Discovery configuration including patterns and root directory
     @returns Array of discovered test files
     @throws Error if directory cannot be read
     */
    static async discoverTests(options: DiscoveryOptions): Promise<TestFile[]> {
        const tests: TestFile[] = []

        try {
            await this.searchDirectory(options.rootDir, options, tests)
        } catch (error) {
            throw new Error(`Failed to discover tests in ${options.rootDir}: ${error}`)
        }

        return this.filterByPatterns(tests, options.patterns, options.rootDir)
    }

    /*
     Recursively searches a directory for test files
     Pattern-driven: Only files matching include patterns are analyzed
     @param dirPath Directory path to search
     @param options Discovery options
     @param tests Array to accumulate found test files
     */
    private static async searchDirectory(dirPath: string, options: DiscoveryOptions, tests: TestFile[]): Promise<void> {
        try {
            const entries = await readdir(dirPath)

            for (const entry of entries) {
                const fullPath = join(dirPath, entry)
                const stats = await stat(fullPath)

                if (stats.isDirectory()) {
                    // Skip excluded directories
                    if (this.shouldSkipDirectory(entry)) {
                        continue
                    }

                    // Recursively search subdirectories
                    await this.searchDirectory(fullPath, options, tests)
                } else if (stats.isFile()) {
                    // First check if file matches include patterns
                    if (this.matchesIncludePatterns(fullPath, options.patterns, options.rootDir)) {
                        // Then check if it's excluded
                        if (this.matchesExcludePatterns(fullPath, options.excludePatterns)) {
                            // Analyze file based on final extension
                            const testFile = this.analyzeFileByExtension(fullPath)
                            if (testFile) {
                                tests.push(testFile)
                            }
                        }
                    }
                }
            }
        } catch (error) {
            // Log warning but continue - might be permission issue
            console.warn(`Warning: Could not read directory ${dirPath}: ${error}`)
        }
    }

    /*
     Checks if a file matches any include patterns
     @param filePath Full path to the file
     @param patterns Array of include patterns
     @param rootDir Root directory for relative path calculation
     @returns true if file matches at least one include pattern
     */
    private static matchesIncludePatterns(filePath: string, patterns: string[], rootDir: string): boolean {
        if (!patterns.length) return false

        const relativePath = filePath.startsWith(rootDir)
            ? filePath.slice(rootDir.length).replace(/^[\/\\]/, '')
            : filePath
        const normalizedPath = relativePath.replace(/\\/g, '/')

        return patterns.some((pattern) => this.matchesGlob(normalizedPath, pattern))
    }

    /*
     Analyzes a file by its final extension to determine test type
     @param filePath Path to the file to analyze
     @returns TestFile object if extension is recognized, null otherwise
     */
    private static analyzeFileByExtension(filePath: string): TestFile | null {
        const fileName = basename(filePath)
        const directory = dirname(filePath)

        // Extract final extension (.c, .js, .sh, etc.)
        const ext = extname(fileName).toLowerCase()

        // Map extension to test type
        const testType = this.EXTENSION_TO_TYPE[ext]
        if (!testType) {
            return null // Unknown extension
        }

        // Create artifact directory based on full filename without final extension
        const testBaseName = fileName.slice(0, -ext.length)

        return {
            path: filePath,
            name: fileName,
            extension: ext,
            type: testType,
            directory,
            artifactDir: join(directory, '.testme', testBaseName),
        }
    }

    /*
     Determines if a directory should be skipped during discovery
     @param dirName Name of the directory
     @returns true if directory should be skipped
     */
    private static shouldSkipDirectory(dirName: string): boolean {
        const skipDirs = [
            'node_modules',
            '.testme',
            '.git',
            '.svn',
            '.hg',
            '__pycache__',
            '.pytest_cache',
            'coverage',
            'dist',
            'build',
        ]

        return skipDirs.includes(dirName) || dirName.startsWith('.')
    }

    /*
     Checks if a file path matches any exclude patterns
     @param filePath Path to check
     @param excludePatterns Array of exclude patterns
     @returns true if file should be included (not excluded)
     */
    private static matchesExcludePatterns(filePath: string, excludePatterns: string[]): boolean {
        if (!excludePatterns.length) return true

        return !excludePatterns.some((pattern) => {
            return this.matchesGlob(filePath, pattern)
        })
    }

    /*
     Public method to filter tests by patterns (used for CLI pattern filtering)
     @param tests Array of test files to filter
     @param patterns Array of patterns to match
     @param rootDir Root directory for relative path calculation
     @returns Filtered array of test files
     */
    static filterTestsByPatterns(tests: TestFile[], patterns: string[], rootDir: string): TestFile[] {
        return this.filterByPatterns(tests, patterns, rootDir)
    }

    /*
     Filters test files by include patterns
     @param tests Array of test files to filter
     @param patterns Array of include patterns
     @param rootDir Root directory for relative path calculation
     @returns Filtered array of test files
     */
    private static filterByPatterns(tests: TestFile[], patterns: string[], rootDir: string): TestFile[] {
        if (!patterns.length) return tests

        // Separate extension patterns (starting with .) from path patterns
        const extensionPatterns = patterns.filter((p) => p.startsWith('.') && !p.includes('/'))
        const otherPatterns = patterns.filter((p) => !extensionPatterns.includes(p))

        return tests.filter((test) => {
            // First check if test matches any non-extension pattern
            // If there are ONLY extension patterns (no other patterns), pass this check
            // If there are other patterns, at least one must match
            const matchesOtherPattern =
                (otherPatterns.length === 0 && extensionPatterns.length > 0) ||
                otherPatterns.some((pattern) => {
                    // Get base name without final extension for matching (e.g., "math.tst" from "math.tst.c")
                    const baseName = this.getBaseNameWithoutExtension(test.name)
                    // Also get the test base name (e.g., "math" from "math.tst.c")
                    const testBaseName = this.getTestBaseName(test.name)

                    // Check if pattern matches a directory component (relative to rootDir)
                    const relativePath = test.directory.startsWith(rootDir)
                        ? test.directory.slice(rootDir.length).replace(/^[\/\\]/, '')
                        : test.directory
                    const directoryParts = relativePath.split(/[\/\\]/).filter((p) => p.length > 0)
                    if (directoryParts.includes(pattern)) {
                        return true
                    }

                    // If pattern contains a path separator, check if the path ends with the pattern
                    if (pattern.includes('/') || pattern.includes('\\')) {
                        // Normalize both pattern and paths to use forward slashes for comparison
                        const normalizedPattern = pattern.replace(/\\/g, '/')
                        const normalizedPath = test.path.replace(/\\/g, '/')
                        const normalizedDir = test.directory.replace(/\\/g, '/')

                        if (normalizedPath.endsWith(normalizedPattern)) {
                            return true
                        }
                        // Also try matching with the final extension removed from the path
                        const pathWithoutExt = normalizedPath.slice(0, -test.extension.length)
                        if (pathWithoutExt.endsWith(normalizedPattern)) {
                            return true
                        }
                        // Also try matching with the full test extension removed (e.g., remove .tst.sh not just .sh)
                        const pathWithoutTestExt = normalizedPath.slice(0, -(test.name.length - testBaseName.length))
                        if (pathWithoutTestExt.endsWith(normalizedPattern)) {
                            return true
                        }
                        // Check if pattern is a directory prefix (test directory contains the pattern)
                        const patternWithSlash = normalizedPattern.endsWith('/')
                            ? normalizedPattern
                            : normalizedPattern + '/'
                        if (
                            normalizedPath.includes('/' + patternWithSlash) ||
                            normalizedPath.includes(patternWithSlash) ||
                            normalizedDir.includes('/' + patternWithSlash) ||
                            normalizedDir.includes(patternWithSlash)
                        ) {
                            return true
                        }
                    }

                    // For glob patterns, match against relative path with normalized separators
                    const relativeFilePath = test.path.startsWith(rootDir)
                        ? test.path.slice(rootDir.length).replace(/^[\/\\]/, '')
                        : test.path
                    const normalizedRelativePath = relativeFilePath.replace(/\\/g, '/')
                    const normalizedPattern = pattern.replace(/\\/g, '/')

                    // Match against relative path, full filename, base name, or test base name
                    return (
                        this.matchesGlob(normalizedRelativePath, normalizedPattern) ||
                        this.matchesGlob(test.name, pattern) ||
                        this.matchesGlob(baseName, pattern) ||
                        this.matchesGlob(testBaseName, pattern)
                    )
                })

            // If there are extension patterns, also check if test matches any of them
            // This implements AND logic: test must match other patterns AND extension patterns
            const matchesExtensionPattern =
                extensionPatterns.length === 0 ||
                extensionPatterns.some((pattern) => {
                    // Extension pattern like ".c" or ".js"
                    return test.extension === pattern || test.name.endsWith(pattern)
                })

            return matchesOtherPattern && matchesExtensionPattern
        })
    }

    /*
     Extracts the base name from a file name by removing the final extension
     @param fileName Full file name (e.g., "math.tst.c")
     @returns Base name without final extension (e.g., "math.tst")
     */
    private static getBaseNameWithoutExtension(fileName: string): string {
        const ext = extname(fileName)
        return ext ? fileName.slice(0, -ext.length) : fileName
    }

    /*
     Extracts the test base name by removing the full test extension
     @param fileName Full test file name (e.g., "math.tst.c")
     @returns Base name without test extension (e.g., "math")
     */
    private static getTestBaseName(fileName: string): string {
        const testExtensions = [
            '.tst.sh',
            '.tst.ps1',
            '.tst.bat',
            '.tst.cmd',
            '.tst.c',
            '.tst.js',
            '.tst.ts',
            '.tst.es',
            '.tst.py',
            '.tst.go',
        ]
        for (const ext of testExtensions) {
            if (fileName.endsWith(ext)) {
                return fileName.slice(0, -ext.length)
            }
        }
        return fileName
    }

    /*
     Simple glob pattern matching
     @param text Text to match against
     @param pattern Glob pattern (supports *, **, and ?)
     @returns true if text matches pattern
     */
    private static matchesGlob(text: string, pattern: string): boolean {
        // Simple manual glob matching without complex regex
        // Split pattern into segments
        const patternParts = pattern.split('/')
        const textParts = text.split('/')

        return this.matchGlobParts(textParts, patternParts)
    }

    /*
     Recursively matches glob pattern parts against text parts
     @param textParts Text split by /
     @param patternParts Pattern split by /
     @returns true if match
     */
    private static matchGlobParts(textParts: string[], patternParts: string[]): boolean {
        // Base case: both empty = match
        if (patternParts.length === 0 && textParts.length === 0) {
            return true
        }

        // Pattern empty but text remains = no match
        if (patternParts.length === 0) {
            return false
        }

        const [patternHead, ...patternTail] = patternParts

        // Handle ** (matches zero or more path segments)
        if (patternHead === '**') {
            // Try matching with ** consuming 0, 1, 2, ... segments
            for (let i = 0; i <= textParts.length; i++) {
                if (this.matchGlobParts(textParts.slice(i), patternTail)) {
                    return true
                }
            }
            return false
        }

        // Text empty but pattern remains (and it's not **) = no match
        if (textParts.length === 0) {
            return false
        }

        const [textHead, ...textTail] = textParts

        // Match current segment
        if (this.matchSegment(textHead, patternHead)) {
            return this.matchGlobParts(textTail, patternTail)
        }

        return false
    }

    /*
     Matches a single path segment with * and ? wildcards
     @param text Text segment
     @param pattern Pattern segment
     @returns true if match
     */
    private static matchSegment(text: string, pattern: string): boolean {
        // Convert glob pattern to regex for single segment
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
            .replace(/\*/g, '.*') // * matches anything
            .replace(/\?/g, '.') // ? matches single char

        const regex = new RegExp(`^${regexPattern}$`, 'i')
        return regex.test(text)
    }

    /*
     Gets the test type for a given file extension
     @param extension File extension (e.g., '.c', '.js', '.sh')
     @returns TestType enum value or null if not supported
     */
    static getTestTypeFromExtension(extension: string): TestType | null {
        return this.EXTENSION_TO_TYPE[extension.toLowerCase()] || null
    }

    /*
     Returns array of all supported final file extensions
     @returns Array of supported extensions (.c, .js, .sh, etc.)
     */
    static getSupportedExtensions(): string[] {
        return Object.keys(this.EXTENSION_TO_TYPE)
    }
}
