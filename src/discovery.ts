import { TestFile, TestType, DiscoveryOptions } from './types.ts';
import { join, dirname, basename, extname } from 'path';
import { readdir, stat } from 'node:fs/promises';

/*
 Handles discovery of test files in directory trees
 Supports pattern matching and filtering
 */
export class TestDiscovery {
    // Mapping of file extensions to test types
    private static readonly TEST_EXTENSIONS = {
        '.tst.sh': TestType.Shell,
        '.tst.c': TestType.C,
        '.tst.js': TestType.JavaScript,
        '.tst.ts': TestType.TypeScript,
        '.tst.es': TestType.Ejscript
    };

    /*
     Discovers test files based on provided options
     @param options Discovery configuration including patterns and root directory
     @returns Array of discovered test files
     @throws Error if directory cannot be read
     */
    static async discoverTests(options: DiscoveryOptions): Promise<TestFile[]> {
        const tests: TestFile[] = [];

        try {
            await this.searchDirectory(options.rootDir, options, tests);
        } catch (error) {
            throw new Error(`Failed to discover tests in ${options.rootDir}: ${error}`);
        }

        return this.filterByPatterns(tests, options.patterns, options.rootDir);
    }

    /*
     Recursively searches a directory for test files
     @param dirPath Directory path to search
     @param options Discovery options
     @param tests Array to accumulate found test files
     */
    private static async searchDirectory(
        dirPath: string,
        options: DiscoveryOptions,
        tests: TestFile[]
    ): Promise<void> {
        try {
            const entries = await readdir(dirPath);

            for (const entry of entries) {
                const fullPath = join(dirPath, entry);
                const stats = await stat(fullPath);

                if (stats.isDirectory()) {
                    // Skip excluded directories
                    if (this.shouldSkipDirectory(entry)) {
                        continue;
                    }

                    // Recursively search subdirectories
                    await this.searchDirectory(fullPath, options, tests);
                } else if (stats.isFile()) {
                    const testFile = this.analyzeFile(fullPath);
                    if (testFile && this.matchesExcludePatterns(fullPath, options.excludePatterns)) {
                        tests.push(testFile);
                    }
                }
            }
        } catch (error) {
            // Log warning but continue - might be permission issue
            console.warn(`Warning: Could not read directory ${dirPath}: ${error}`);
        }
    }

    /*
     Analyzes a file to determine if it's a test file
     @param filePath Path to the file to analyze
     @returns TestFile object if it's a test, null otherwise
     */
    private static analyzeFile(filePath: string): TestFile | null {
        const fileName = basename(filePath);
        const directory = dirname(filePath);

        // Check if file matches any test extension pattern
        for (const [extension, testType] of Object.entries(this.TEST_EXTENSIONS)) {
            if (fileName.endsWith(extension)) {
                // Create unique artifact directory per test file
                const testBaseName = fileName.slice(0, -extension.length);
                return {
                    path: filePath,
                    name: fileName,
                    extension,
                    type: testType,
                    directory,
                    artifactDir: join(directory, '.testme', testBaseName)
                };
            }
        }

        return null;
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
            'build'
        ];

        return skipDirs.includes(dirName) || dirName.startsWith('.');
    }

    /*
     Checks if a file path matches any exclude patterns
     @param filePath Path to check
     @param excludePatterns Array of exclude patterns
     @returns true if file should be included (not excluded)
     */
    private static matchesExcludePatterns(filePath: string, excludePatterns: string[]): boolean {
        if (!excludePatterns.length) return true;

        return !excludePatterns.some(pattern => {
            return this.matchesGlob(filePath, pattern);
        });
    }

    /*
     Filters test files by include patterns
     @param tests Array of test files to filter
     @param patterns Array of include patterns
     @param rootDir Root directory for relative path calculation
     @returns Filtered array of test files
     */
    private static filterByPatterns(tests: TestFile[], patterns: string[], rootDir: string): TestFile[] {
        if (!patterns.length) return tests;

        return tests.filter(test => {
            return patterns.some(pattern => {
                // If pattern is just an extension, match by type
                if (pattern.startsWith('.tst.')) {
                    return test.extension === pattern;
                }

                // Get base name without test extension for matching
                const baseName = this.getBaseNameWithoutTestExtension(test.name);

                // Check if pattern matches a directory component (relative to rootDir)
                const relativePath = test.directory.startsWith(rootDir)
                    ? test.directory.slice(rootDir.length).replace(/^\//, '')
                    : test.directory;
                const directoryParts = relativePath.split('/').filter(p => p.length > 0);
                if (directoryParts.includes(pattern)) {
                    return true;
                }

                // If pattern contains a path separator, check if the path ends with the pattern
                if (pattern.includes('/')) {
                    if (test.path.endsWith(pattern)) {
                        return true;
                    }
                    // Also try matching with the test extension removed from the path
                    const pathWithoutExt = test.path.slice(0, -test.extension.length);
                    if (pathWithoutExt.endsWith(pattern)) {
                        return true;
                    }
                    // Check if pattern is a directory prefix (test directory contains the pattern)
                    const normalizedPattern = pattern.endsWith('/') ? pattern : pattern + '/';
                    if (test.path.includes('/' + normalizedPattern) || test.path.includes(normalizedPattern)) {
                        return true;
                    }
                }

                // Match against full path, full filename, or base name
                return this.matchesGlob(test.path, pattern) ||
                       this.matchesGlob(test.name, pattern) ||
                       this.matchesGlob(baseName, pattern);
            });
        });
    }

    /*
     Extracts the base name from a test file name by removing the test extension
     @param fileName Full test file name (e.g., "math.tst.c")
     @returns Base name without test extension (e.g., "math")
     */
    private static getBaseNameWithoutTestExtension(fileName: string): string {
        // Check each test extension and remove it if found
        for (const extension of Object.keys(this.TEST_EXTENSIONS)) {
            if (fileName.endsWith(extension)) {
                return fileName.slice(0, -extension.length);
            }
        }
        // If no test extension found, return the filename as-is
        return fileName;
    }

    /*
     Simple glob pattern matching
     @param text Text to match against
     @param pattern Glob pattern (supports * and ?)
     @returns true if text matches pattern
     */
    private static matchesGlob(text: string, pattern: string): boolean {
        // Simple glob matching - convert glob to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');

        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(text);
    }

    /*
     Gets the test type for a given file extension
     @param extension File extension (e.g., '.tst.js')
     @returns TestType enum value or null if not supported
     */
    static getTestTypeFromExtension(extension: string): TestType | null {
        return this.TEST_EXTENSIONS[extension as keyof typeof this.TEST_EXTENSIONS] || null;
    }

    /*
     Returns array of all supported test file extensions
     @returns Array of supported extensions
     */
    static getSupportedExtensions(): string[] {
        return Object.keys(this.TEST_EXTENSIONS);
    }
}