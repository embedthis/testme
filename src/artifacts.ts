import type { TestFile, ArtifactManager as IArtifactManager, TestConfig } from "./types.ts";
import { join, basename, relative } from "path";
import * as path from "path";
import { mkdir, rmdir, readdir, unlink, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { GlobExpansion } from "./utils/glob-expansion.ts";

/*
 Manages build artifacts and temporary files for test execution
 Creates and cleans .testme directories alongside test files
 */
export class ArtifactManager implements IArtifactManager {
    /*
     Creates the artifact directory for a test file
     @param testFile Test file to create artifact directory for
     @returns Path to the created artifact directory
     @throws Error if directory creation fails
     */
    async createArtifactDir(testFile: TestFile): Promise<string> {
        const artifactDir = testFile.artifactDir;

        try {
            await mkdir(artifactDir, { recursive: true });
            return artifactDir;
        } catch (error) {
            throw new Error(
                `Failed to create artifact directory ${artifactDir}: ${error}`
            );
        }
    }

    /*
     Removes the artifact directory for a test file
     @param testFile Test file to clean artifact directory for
     @throws Error if directory removal fails
     */
    async cleanArtifactDir(testFile: TestFile): Promise<void> {
        const artifactDir = testFile.artifactDir;

        if (!existsSync(artifactDir)) {
            return;
        }

        try {
            await this.removeDirectory(artifactDir);
        } catch (error) {
            throw new Error(
                `Failed to clean artifact directory ${artifactDir}: ${error}`
            );
        }
    }

    /*
     Recursively removes all .testme directories in a directory tree
     @param rootDir Root directory to start cleaning from
     @throws Error if cleanup fails
     */
    async cleanAllArtifacts(rootDir: string): Promise<void> {
        try {
            await this.findAndRemoveArtifactDirs(rootDir);
        } catch (error) {
            throw new Error(
                `Failed to clean all artifacts in ${rootDir}: ${error}`
            );
        }
    }

    /*
     Gets the full path to an artifact file
     @param testFile Test file to get artifact path for
     @param filename Name of the artifact file
     @returns Full path to the artifact file
     */
    getArtifactPath(testFile: TestFile, filename: string): string {
        return join(testFile.artifactDir, filename);
    }

    /*
     Ensures the artifact directory exists, creating it if necessary
     @param testFile Test file to ensure artifact directory for
     */
    async ensureArtifactDirExists(testFile: TestFile): Promise<void> {
        if (!existsSync(testFile.artifactDir)) {
            await this.createArtifactDir(testFile);
        }
    }

    /*
     Writes content to an artifact file
     @param testFile Test file to write artifact for
     @param filename Name of the artifact file
     @param content Content to write
     @throws Error if write fails
     */
    async writeArtifact(
        testFile: TestFile,
        filename: string,
        content: string
    ): Promise<void> {
        await this.ensureArtifactDirExists(testFile);
        const filePath = this.getArtifactPath(testFile, filename);

        try {
            await Bun.write(filePath, content);
        } catch (error) {
            throw new Error(`Failed to write artifact ${filePath}: ${error}`);
        }
    }

    /*
     Reads content from an artifact file
     @param testFile Test file to read artifact for
     @param filename Name of the artifact file
     @returns Content of the artifact file
     @throws Error if read fails
     */
    async readArtifact(testFile: TestFile, filename: string): Promise<string> {
        const filePath = this.getArtifactPath(testFile, filename);

        try {
            const file = Bun.file(filePath);
            return await file.text();
        } catch (error) {
            throw new Error(`Failed to read artifact ${filePath}: ${error}`);
        }
    }

    /*
     Checks if an artifact file exists
     @param testFile Test file to check artifact for
     @param filename Name of the artifact file
     @returns true if artifact exists, false otherwise
     */
    async artifactExists(
        testFile: TestFile,
        filename: string
    ): Promise<boolean> {
        const filePath = this.getArtifactPath(testFile, filename);

        try {
            const file = Bun.file(filePath);
            return await file.exists();
        } catch {
            return false;
        }
    }

    /*
     Recursively removes a directory and all its contents
     @param dirPath Path to directory to remove
     */
    private async removeDirectory(dirPath: string): Promise<void> {
        try {
            const entries = await readdir(dirPath);

            // Remove all files and subdirectories
            for (const entry of entries) {
                const fullPath = join(dirPath, entry);
                const stats = await stat(fullPath);

                if (stats.isDirectory()) {
                    await this.removeDirectory(fullPath);
                } else {
                    await unlink(fullPath);
                }
            }

            // Remove the directory itself
            await rmdir(dirPath);
        } catch (error) {
            // If directory doesn't exist, that's OK
            if ((error as any).code !== "ENOENT") {
                throw error;
            }
        }
    }

    /*
     Recursively finds and removes all .testme artifact directories
     @param dirPath Directory to search for artifact directories
     */
    private async findAndRemoveArtifactDirs(dirPath: string): Promise<void> {
        try {
            const entries = await readdir(dirPath);

            for (const entry of entries) {
                const fullPath = join(dirPath, entry);
                const stats = await stat(fullPath);

                if (stats.isDirectory()) {
                    if (entry === ".testme") {
                        // Found an artifact directory, remove it
                        await this.removeDirectory(fullPath);
                    } else if (!this.shouldSkipDirectory(entry)) {
                        // Recursively search subdirectories
                        await this.findAndRemoveArtifactDirs(fullPath);
                    }
                }
            }
        } catch (error) {
            // Log warning but continue
            console.warn(
                `Warning: Could not clean artifacts in ${dirPath}: ${error}`
            );
        }
    }

    /*
     Determines if a directory should be skipped during artifact cleanup
     @param dirName Name of the directory
     @returns true if directory should be skipped
     */
    private shouldSkipDirectory(dirName: string): boolean {
        const skipDirs = [
            "node_modules",
            ".git",
            ".svn",
            ".hg",
            "__pycache__",
            ".pytest_cache",
            "coverage",
            "dist",
            "build",
        ];

        return (
            skipDirs.includes(dirName) ||
            (dirName.startsWith(".") && dirName !== ".testme")
        );
    }

    /*
     Generates an Xcode project configuration for debugging on macOS
     @param testFile C test file to create project for
     @param expandedFlags Compiler flags with ${vars} already expanded
     @param expandedLibraries Library names with ${vars} already expanded
     @param config Test configuration containing environment variables
     @returns Content of the project.yml file for xcodegen
     */
    async generateXcodeProjectConfig(testFile: TestFile, expandedFlags: string[], expandedLibraries: string[], config: TestConfig): Promise<string> {
        const testBaseName = basename(testFile.name, '.tst.c');
        const relativePath = relative(testFile.artifactDir, testFile.path);
        // Use absolute path for working directory - Xcode needs this to exist
        const testDirectoryPath = testFile.directory;

        // Process flags to extract settings for Xcode
        const { settings: xcodeSettings, librarySearchPaths } = this.processCompilerFlagsForXcode(expandedFlags, testFile);
        const libraryFlags = this.processLibrariesForXcode(expandedLibraries, librarySearchPaths, testFile);

        let settingsBlock = `      PRODUCT_NAME: ${testBaseName}
      CONFIGURATION_BUILD_DIR: $(SRCROOT)
      GCC_OPTIMIZATION_LEVEL: 0
      GCC_GENERATE_DEBUGGING_SYMBOLS: YES
      DEBUG_INFORMATION_FORMAT: dwarf-with-dsym
      ENABLE_TESTABILITY: YES`;

        if (xcodeSettings) {
            settingsBlock += '\n' + xcodeSettings;
        }

        if (libraryFlags) {
            settingsBlock += '\n' + libraryFlags;
        }

        // Generate environment variables for the scheme
        let environmentVariables = '';
        if (config.env && Object.keys(config.env).length > 0) {
            const baseDir = config.configDir || testFile.directory;
            const envVars: string[] = [];

            for (const [key, value] of Object.entries(config.env)) {
                // Expand ${...} references in environment variable values
                const expandedValue = await GlobExpansion.expandSingle(value, baseDir);
                envVars.push(`        ${key}: "${expandedValue}"`);
            }

            if (envVars.length > 0) {
                environmentVariables = `
      environmentVariables:
${envVars.join('\n')}`;
            }
        }

        return `name: ${testBaseName}
targets:
  ${testBaseName}:
    type: tool
    platform: macOS
    sources:
      - ${relativePath}
    settings:
${settingsBlock}
schemes:
  ${testBaseName}:
    build:
      targets:
        ${testBaseName}: all
    run:
      config: Debug
      customWorkingDirectory: ${testDirectoryPath}${environmentVariables}
`;
    }

    /*
     Creates an Xcode project for debugging a C test file
     @param testFile C test file to create project for
     @param expandedFlags Compiler flags with ${vars} already expanded
     @param expandedLibraries Library names with ${vars} already expanded
     @param config Test configuration containing environment variables
     @throws Error if project creation fails
     */
    async createXcodeProject(testFile: TestFile, expandedFlags: string[], expandedLibraries: string[], config: TestConfig): Promise<void> {
        try {
            const testBaseName = basename(testFile.name, '.tst.c');
            const projectConfigContent = await this.generateXcodeProjectConfig(testFile, expandedFlags, expandedLibraries, config);
            const configFileName = `${testBaseName}.yml`;

            // Write the project configuration file
            await this.writeArtifact(testFile, configFileName, projectConfigContent);

            console.log(`📝 Created Xcode project configuration: ${configFileName}`);
        } catch (error) {
            throw new Error(`Failed to create Xcode project: ${error}`);
        }
    }

    /*
     Converts absolute paths to relative paths when they're within the project structure
     @param absolutePath The absolute path to convert
     @param fromDirectory The directory to calculate relative path from (artifact directory)
     @returns Relative path if local, absolute path if external
     */
    private makePathRelativeIfLocal(absolutePath: string, fromDirectory: string): string {
        // If it's already relative, return as-is
        if (!path.isAbsolute(absolutePath)) {
            return absolutePath;
        }

        // Check if the path is within a reasonable project structure
        // (contains common project patterns like /build/, /lib/, /include/, etc.)
        const projectPatterns = ['/build/', '/lib/', '/include/', '/src/', '/test/', '../'];
        const isProjectPath = projectPatterns.some(pattern => absolutePath.includes(pattern));

        if (isProjectPath) {
            try {
                const relativePath = relative(fromDirectory, absolutePath);
                // Prefer relative paths that don't go up too many levels (max 3)
                const upLevels = (relativePath.match(/\.\.\//g) || []).length;
                if (upLevels <= 3) {
                    return relativePath;
                }
            } catch {
                // If relative() fails, fall back to absolute
            }
        }

        // Return absolute path for system libraries and deep nested paths
        return absolutePath;
    }

    /*
     Processes compiler flags to extract Xcode build settings
     @param flags Array of compiler flags
     @param testFile TestFile object to determine relative paths from
     @returns Object with formatted Xcode settings string and library search paths
     */
    private processCompilerFlagsForXcode(flags: string[], testFile: TestFile): { settings: string; librarySearchPaths: string[] } {
        const settings: string[] = [];
        const headerSearchPaths: string[] = [];
        const librarySearchPaths: string[] = [];
        const runpathSearchPaths: string[] = [];
        const otherCFlags: string[] = [];

        for (const flag of flags) {
            if (flag.startsWith('-I')) {
                const path = flag.substring(2);
                if (path && path !== '.') {
                    // Build-time paths need to be relative to artifact directory (where Xcode builds)
                    const relativePath = this.makePathRelativeIfLocal(path, testFile.artifactDir);
                    headerSearchPaths.push(`"${relativePath}"`);
                }
            } else if (flag.startsWith('-L')) {
                const path = flag.substring(2);
                if (path) {
                    // Build-time paths need to be relative to artifact directory (where Xcode builds)
                    const relativePath = this.makePathRelativeIfLocal(path, testFile.artifactDir);
                    librarySearchPaths.push(`"${relativePath}"`);
                }
            } else if (flag.startsWith('-Wl,-rpath,')) {
                // Handle rpath flags: -Wl,-rpath,/path/to/libs
                const rpathValue = flag.substring(11); // Remove '-Wl,-rpath,'
                if (rpathValue) {
                    // Handle @executable_path and @loader_path relative paths
                    let processedPath = rpathValue;
                    if (rpathValue.startsWith('@executable_path/') || rpathValue.startsWith('@loader_path/')) {
                        // Extract the relative part after @executable_path/ or @loader_path/
                        const pathPrefix = rpathValue.startsWith('@executable_path/') ? '@executable_path/' : '@loader_path/';
                        const relativePart = rpathValue.substring(pathPrefix.length);

                        // The relative part (e.g., "../../build/*/bin") is from executable location to target
                        // Executable is in test/.testme/socket/, target is at some path
                        // We need to convert this to be relative from test directory instead

                        // First, resolve what the target absolute path would be
                        const executableDir = testFile.artifactDir; // e.g., /Users/mob/c/r/test/.testme/socket
                        const targetPath = path.resolve(executableDir, relativePart);

                        // Now make it relative to the test directory (working directory)
                        processedPath = path.relative(testFile.directory, targetPath);
                    }

                    // Runtime paths need to be relative to test directory (working directory)
                    const relativePath = this.makePathRelativeIfLocal(processedPath, testFile.directory);
                    runpathSearchPaths.push(`"${relativePath}"`);
                }
            } else if (flag.startsWith('-std=')) {
                // Map C standard to Xcode setting
                const std = flag.substring(5);
                if (std === 'c99') {
                    settings.push('GCC_C_LANGUAGE_STANDARD: c99');
                } else if (std === 'c11') {
                    settings.push('GCC_C_LANGUAGE_STANDARD: c11');
                }
            } else if (flag === '-Wall') {
                settings.push('WARNING_CFLAGS: "-Wall"');
            } else if (flag === '-Wextra') {
                // Add to other C flags since Xcode doesn't have direct equivalent
                otherCFlags.push(flag);
            } else if (flag.startsWith('-W') || flag.startsWith('-O') || flag.startsWith('-g')) {
                // Other warning, optimization, or debug flags
                otherCFlags.push(flag);
            }
        }

        // Add header search paths
        // Always include the test directory itself for header searches
        const testDirFromArtifact = this.makePathRelativeIfLocal(testFile.directory, testFile.artifactDir);
        headerSearchPaths.unshift(`"${testDirFromArtifact}"`);

        if (headerSearchPaths.length > 0) {
            settings.push(`HEADER_SEARCH_PATHS: [${headerSearchPaths.join(', ')}]`);
        }

        // Add library search paths
        if (librarySearchPaths.length > 0) {
            settings.push(`LIBRARY_SEARCH_PATHS: [${librarySearchPaths.join(', ')}]`);
        }

        // Add runtime library search paths (rpath)
        if (runpathSearchPaths.length > 0) {
            settings.push(`LD_RUNPATH_SEARCH_PATHS: [${runpathSearchPaths.join(', ')}]`);
        }

        // Add other C flags
        if (otherCFlags.length > 0) {
            settings.push(`OTHER_CFLAGS: "${otherCFlags.join(' ')}"`);
        }

        return {
            settings: settings.map(setting => `      ${setting}`).join('\n'),
            librarySearchPaths
        };
    }

    /*
     Processes library names to create Xcode linker settings
     @param libraries Array of library names
     @param librarySearchPaths Array of library search paths extracted from flags (already made relative)
     @param testFile TestFile object to determine relative paths from
     @returns Formatted Xcode linker settings string
     */
    private processLibrariesForXcode(libraries: string[], librarySearchPaths: string[], testFile: TestFile): string {
        if (libraries.length === 0) {
            return '';
        }

        const settings: string[] = [];

        // Note: LIBRARY_SEARCH_PATHS is now handled in processCompilerFlagsForXcode() from -L flags

        // Use -l flags for all libraries - let Xcode find .a or .dylib automatically
        const libFlags = libraries.map(lib => {
            // Remove "lib" prefix if present, then add "-l" prefix
            const libName = lib.startsWith('lib') ? lib.slice(3) : lib;
            return `-l${libName}`;
        }).join(' ');

        if (libFlags) {
            settings.push(`OTHER_LDFLAGS: "${libFlags}"`);
        }

        // Note: LD_RUNPATH_SEARCH_PATHS is now handled in processCompilerFlagsForXcode() from rpath flags

        return settings.map(setting => `      ${setting}`).join('\n');
    }
}
