import type {TestFile, ArtifactManager as IArtifactManager, TestConfig} from './types.ts'
import {join, basename, relative, dirname} from 'path'
import * as path from 'path'
import {mkdir, rmdir, readdir, unlink} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {GlobExpansion} from './utils/glob-expansion.ts'

/**
 * Manages build artifacts and temporary files for test execution
 *
 * ArtifactManager handles the creation and cleanup of .testme directories that store
 * build artifacts, compiled binaries, and other temporary files generated during test execution.
 * Each test file gets its own subdirectory within .testme for isolation.
 *
 * @remarks
 * Artifact Directory Structure:
 * ```
 * test/
 *   ├── math.tst.c
 *   └── .testme/
 *       └── math/           // Unique directory for math.tst.c
 *           ├── binary       // Compiled executable
 *           ├── compile.log  // Compilation output
 *           └── math.yml     // Xcode project config (macOS only)
 * ```
 *
 * Features:
 * - Creates isolated artifact directories per test file
 * - Supports Xcode project generation for C test debugging on macOS
 * - Handles recursive cleanup of artifact directories
 * - Provides artifact file read/write utilities
 *
 * @example
 * ```typescript
 * const manager = new ArtifactManager();
 *
 * // Create artifact directory
 * await manager.createArtifactDir(testFile);
 *
 * // Write compilation log
 * await manager.writeArtifact(testFile, 'compile.log', logOutput);
 *
 * // Clean up after tests
 * await manager.cleanArtifactDir(testFile);
 * ```
 */
export class ArtifactManager implements IArtifactManager {
    /*
     Creates the artifact directory for a test file
     @param testFile Test file to create artifact directory for
     @returns Path to the created artifact directory
     @throws Error if directory creation fails
     */
    async createArtifactDir(testFile: TestFile): Promise<string> {
        const artifactDir = testFile.artifactDir

        try {
            // Explicitly create parent .testme directory first to work around
            // Windows mkdir recursive issues in GitHub runners
            const parentDir = dirname(artifactDir)
            if (basename(parentDir) === '.testme' && !existsSync(parentDir)) {
                await mkdir(parentDir, {recursive: true})
            }

            // Create the test-specific artifact directory
            await mkdir(artifactDir, {recursive: true})
            return artifactDir
        } catch (error) {
            throw new Error(`Failed to create artifact directory ${artifactDir}: ${error}`)
        }
    }

    /*
     Removes the artifact directory for a test file
     Also removes the parent .testme directory if it becomes empty
     @param testFile Test file to clean artifact directory for
     @throws Error if directory removal fails
     */
    async cleanArtifactDir(testFile: TestFile): Promise<void> {
        const artifactDir = testFile.artifactDir

        if (!existsSync(artifactDir)) {
            return
        }

        try {
            // Remove the test's artifact directory
            await this.removeDirectory(artifactDir)

            // Check if parent .testme directory is now empty and remove it
            const parentDir = dirname(artifactDir)
            if (basename(parentDir) === '.testme' && existsSync(parentDir)) {
                const entries = await readdir(parentDir)
                if (entries.length === 0) {
                    await rmdir(parentDir)
                }
            }
        } catch (error) {
            throw new Error(`Failed to clean artifact directory ${artifactDir}: ${error}`)
        }
    }

    /*
     Recursively removes all .testme directories in a directory tree
     @param rootDir Root directory to start cleaning from
     @throws Error if cleanup fails
     */
    async cleanAllArtifacts(rootDir: string): Promise<void> {
        try {
            await this.findAndRemoveArtifactDirs(rootDir)
        } catch (error) {
            throw new Error(`Failed to clean all artifacts in ${rootDir}: ${error}`)
        }
    }

    /*
     Gets the full path to an artifact file
     @param testFile Test file to get artifact path for
     @param filename Name of the artifact file
     @returns Full path to the artifact file
     */
    getArtifactPath(testFile: TestFile, filename: string): string {
        return join(testFile.artifactDir, filename)
    }

    /*
     Ensures the artifact directory exists, creating it if necessary
     @param testFile Test file to ensure artifact directory for
     */
    async ensureArtifactDirExists(testFile: TestFile): Promise<void> {
        if (!existsSync(testFile.artifactDir)) {
            await this.createArtifactDir(testFile)
        }
    }

    /*
     Writes content to an artifact file
     @param testFile Test file to write artifact for
     @param filename Name of the artifact file
     @param content Content to write
     @throws Error if write fails
     */
    async writeArtifact(testFile: TestFile, filename: string, content: string): Promise<void> {
        await this.ensureArtifactDirExists(testFile)
        const filePath = this.getArtifactPath(testFile, filename)

        try {
            await Bun.write(filePath, content)
        } catch (error) {
            throw new Error(`Failed to write artifact ${filePath}: ${error}`)
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
        const filePath = this.getArtifactPath(testFile, filename)

        try {
            const file = Bun.file(filePath)
            return await file.text()
        } catch (error) {
            throw new Error(`Failed to read artifact ${filePath}: ${error}`)
        }
    }

    /*
     Checks if an artifact file exists
     @param testFile Test file to check artifact for
     @param filename Name of the artifact file
     @returns true if artifact exists, false otherwise
     */
    async artifactExists(testFile: TestFile, filename: string): Promise<boolean> {
        const filePath = this.getArtifactPath(testFile, filename)

        try {
            const file = Bun.file(filePath)
            return await file.exists()
        } catch {
            return false
        }
    }

    /*
     Recursively removes a directory and all its contents
     Includes retry logic for Windows file locking issues
     Uses readdir with withFileTypes to avoid extra stat() calls
     @param dirPath Path to directory to remove
     */
    private async removeDirectory(dirPath: string): Promise<void> {
        try {
            const entries = await readdir(dirPath, {withFileTypes: true})

            // Remove all files and subdirectories
            for (const entry of entries) {
                const fullPath = join(dirPath, entry.name)

                if (entry.isDirectory()) {
                    await this.removeDirectory(fullPath)
                } else {
                    // Windows may lock executables briefly after process exit
                    // Retry file deletion with exponential backoff
                    await this.removeFileWithRetry(fullPath)
                }
            }

            // Remove the directory itself
            await rmdir(dirPath)
        } catch (error) {
            // If directory doesn't exist, that's OK
            if ((error as any).code !== 'ENOENT') {
                throw error
            }
        }
    }

    /*
     Removes a file with retry logic for Windows file locking
     @param filePath Path to file to remove
     @param maxRetries Maximum number of retry attempts (default: 5)
     @param delayMs Initial delay in milliseconds (default: 50)
     */
    private async removeFileWithRetry(filePath: string, maxRetries: number = 5, delayMs: number = 50): Promise<void> {
        let lastError: any

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Check if file still exists before attempting deletion
                if (!existsSync(filePath)) {
                    return // File already deleted, success
                }

                await unlink(filePath)
                return // Success
            } catch (error: any) {
                lastError = error

                // Only retry on Windows EPERM/EBUSY errors (file locked)
                if (error.code === 'EPERM' || error.code === 'EBUSY') {
                    if (attempt < maxRetries) {
                        // Exponential backoff: 50ms, 100ms, 200ms, 400ms (capped at 500ms)
                        const delay = Math.min(delayMs * Math.pow(2, attempt), 500)
                        await new Promise((resolve) => setTimeout(resolve, delay))
                        continue
                    }
                }

                // For ENOENT (file doesn't exist), treat as success
                if (error.code === 'ENOENT') {
                    return
                }

                // For other errors or max retries exceeded, throw
                throw error
            }
        }

        throw lastError
    }

    /*
     Recursively finds and removes all .testme artifact directories
     Uses readdir with withFileTypes to avoid extra stat() calls
     @param dirPath Directory to search for artifact directories
     */
    private async findAndRemoveArtifactDirs(dirPath: string): Promise<void> {
        try {
            const entries = await readdir(dirPath, {withFileTypes: true})

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const fullPath = join(dirPath, entry.name)

                    if (entry.name === '.testme') {
                        // Found an artifact directory, remove it
                        await this.removeDirectory(fullPath)
                    } else if (!this.shouldSkipDirectory(entry.name)) {
                        // Recursively search subdirectories
                        await this.findAndRemoveArtifactDirs(fullPath)
                    }
                }
            }
        } catch (error) {
            // Log warning but continue
            console.warn(`Warning: Could not clean artifacts in ${dirPath}: ${error}`)
        }
    }

    /*
     Determines if a directory should be skipped during artifact cleanup
     @param dirName Name of the directory
     @returns true if directory should be skipped
     */
    private shouldSkipDirectory(dirName: string): boolean {
        const skipDirs = [
            'node_modules',
            '.git',
            '.svn',
            '.hg',
            '__pycache__',
            '.pytest_cache',
            'coverage',
            'dist',
            'build',
        ]

        return skipDirs.includes(dirName) || (dirName.startsWith('.') && dirName !== '.testme')
    }

    /*
     Generates an Xcode project configuration for debugging on macOS
     @param testFile C test file to create project for
     @param expandedFlags Compiler flags with ${vars} already expanded
     @param expandedLibraries Library names with ${vars} already expanded
     @param config Test configuration containing environment variables
     @param compiler Compiler name for TESTME_CC variable
     @returns Content of the project.yml file for xcodegen
     */
    async generateXcodeProjectConfig(
        testFile: TestFile,
        expandedFlags: string[],
        expandedLibraries: string[],
        config: TestConfig,
        compiler?: string
    ): Promise<string> {
        const testBaseName = basename(testFile.name, '.tst.c')
        const relativePath = relative(testFile.artifactDir, testFile.path)
        // Use absolute path for working directory - Xcode needs this to exist
        const testDirectoryPath = testFile.directory

        // Process flags to extract settings for Xcode
        const {settings: xcodeSettings} = this.processCompilerFlagsForXcode(expandedFlags, testFile)
        const libraryFlags = this.processLibrariesForXcode(expandedLibraries)

        let settingsBlock = `      PRODUCT_NAME: ${testBaseName}
      CONFIGURATION_BUILD_DIR: $(SRCROOT)
      GCC_OPTIMIZATION_LEVEL: 0
      GCC_GENERATE_DEBUGGING_SYMBOLS: YES
      DEBUG_INFORMATION_FORMAT: dwarf-with-dsym
      ENABLE_TESTABILITY: YES`

        if (xcodeSettings) {
            settingsBlock += '\n' + xcodeSettings
        }

        if (libraryFlags) {
            settingsBlock += '\n' + libraryFlags
        }

        // Generate environment variables for the scheme
        const baseDir = config.configDir || testFile.directory
        const allEnvVars: Record<string, string> = {}

        // 1. First, capture any TESTME_* variables from the current process environment
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith('TESTME_') && value !== undefined) {
                allEnvVars[key] = value
            }
        }

        // 2. Add TESTME_* variables derived from CLI options/config
        allEnvVars.TESTME_VERBOSE = config.output?.verbose === true ? '1' : '0'
        allEnvVars.TESTME_QUIET = config.output?.quiet === true ? '1' : '0'
        allEnvVars.TESTME_KEEP = config.execution?.keepArtifacts === true ? '1' : '0'
        allEnvVars.TESTME_STOP = config.execution?.stopOnFailure === true ? '1' : '0'
        allEnvVars.TESTME_ITERATIONS = (config.execution?.iterations ?? 1).toString()

        if (config.execution?.depth !== undefined) {
            allEnvVars.TESTME_DEPTH = config.execution.depth.toString()
        }
        if (config.execution?.duration !== undefined) {
            allEnvVars.TESTME_DURATION = config.execution.duration.toString()
        }
        if (config.execution?.testClass !== undefined) {
            allEnvVars.TESTME_CLASS = config.execution.testClass
        }

        // 3. Add special variables (PLATFORM, PROFILE, OS, ARCH, CC, TESTDIR, CONFIGDIR)
        const specialVars = GlobExpansion.createSpecialVariables(
            testFile.artifactDir,
            testFile.directory,
            config.configDir || testFile.directory,
            compiler,
            config.profile
        )
        if (specialVars.PLATFORM !== undefined) allEnvVars.TESTME_PLATFORM = specialVars.PLATFORM
        if (specialVars.PROFILE !== undefined) allEnvVars.TESTME_PROFILE = specialVars.PROFILE
        if (specialVars.OS !== undefined) allEnvVars.TESTME_OS = specialVars.OS
        if (specialVars.ARCH !== undefined) allEnvVars.TESTME_ARCH = specialVars.ARCH
        if (specialVars.CC !== undefined) allEnvVars.TESTME_CC = specialVars.CC
        if (specialVars.TESTDIR !== undefined) allEnvVars.TESTME_TESTDIR = specialVars.TESTDIR
        if (specialVars.CONFIGDIR !== undefined) allEnvVars.TESTME_CONFIGDIR = specialVars.CONFIGDIR

        // 4. Add user-defined environment variables from config (config.environment or config.env)
        const configEnv = config.environment || config.env
        if (configEnv) {
            // Determine current platform
            const platform =
                process.platform === 'darwin' ? 'macosx' : process.platform === 'win32' ? 'windows' : 'linux'

            // First, add base environment variables
            for (const [key, value] of Object.entries(configEnv)) {
                // Skip platform-specific keys and non-string values
                if (key === 'windows' || key === 'macosx' || key === 'linux' || typeof value !== 'string') {
                    continue
                }
                allEnvVars[key] = value
            }

            // Then, merge platform-specific environment variables
            const platformEnv = configEnv[platform]
            if (platformEnv) {
                for (const [key, value] of Object.entries(platformEnv)) {
                    // Skip non-string values
                    if (typeof value !== 'string') {
                        continue
                    }
                    allEnvVars[key] = value
                }
            }
        }

        // Build the environment variables YAML block
        let environmentVariables = ''
        const envVars: string[] = []

        // Expand ${...} references in environment variable values and format for YAML
        for (const [key, value] of Object.entries(allEnvVars)) {
            const expandedValue = await GlobExpansion.expandSingle(value, baseDir, specialVars)
            envVars.push(`        ${key}: "${expandedValue}"`)
        }

        if (envVars.length > 0) {
            environmentVariables = `
      environmentVariables:
${envVars.join('\n')}`
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
`
    }

    /*
     Creates an Xcode project for debugging a C test file
     @param testFile C test file to create project for
     @param expandedFlags Compiler flags with ${vars} already expanded
     @param expandedLibraries Library names with ${vars} already expanded
     @param config Test configuration containing environment variables
     @param compiler Compiler name for TESTME_CC variable
     @throws Error if project creation fails
     */
    async createXcodeProject(
        testFile: TestFile,
        expandedFlags: string[],
        expandedLibraries: string[],
        config: TestConfig,
        compiler?: string
    ): Promise<void> {
        try {
            const testBaseName = basename(testFile.name, '.tst.c')
            const projectConfigContent = await this.generateXcodeProjectConfig(
                testFile,
                expandedFlags,
                expandedLibraries,
                config,
                compiler
            )
            const configFileName = `${testBaseName}.yml`

            // Write the project configuration file
            await this.writeArtifact(testFile, configFileName, projectConfigContent)

            console.log(`📝 Created Xcode project configuration: ${configFileName}`)
        } catch (error) {
            throw new Error(`Failed to create Xcode project: ${error}`)
        }
    }

    /*
     Generates Visual Studio project configuration for debugging on Windows
     @param testFile C test file to create project for
     @param expandedFlags Compiler flags with ${vars} already expanded
     @param expandedLibraries Library names with ${vars} already expanded
     @param config Test configuration containing environment variables
     @param compiler Compiler name for TESTME_CC variable
     @returns Object containing vcxproj and vcxproj.user content
     */
    async generateVisualStudioProject(
        testFile: TestFile,
        expandedFlags: string[],
        expandedLibraries: string[],
        config: TestConfig,
        compiler?: string
    ): Promise<{vcxproj: string; vcxprojUser: string}> {
        const testBaseName = basename(testFile.name, '.tst.c')
        const relativePath = relative(testFile.artifactDir, testFile.path).replace(/\//g, '\\')

        // Generate a deterministic GUID from the test name
        const guid = this.generateGuid(testFile.path)

        // Detect platform architecture for VS project
        // On Windows ARM64, Bun reports process.arch as 'x64' due to emulation
        // Use PROCESSOR_IDENTIFIER to detect actual ARM64
        let vsPlatform = 'x64'
        if (process.platform === 'win32') {
            const procId = process.env.PROCESSOR_IDENTIFIER || ''
            if (procId.includes('ARM')) {
                vsPlatform = 'ARM64'
            } else if (process.arch === 'ia32') {
                vsPlatform = 'Win32'
            }
        }

        // Process compiler flags for MSVC
        const {includePaths, libraryPaths} = this.processCompilerFlagsForMSVC(expandedFlags, testFile)

        // Process libraries for MSVC
        const additionalDependencies = this.processLibrariesForMSVC(expandedLibraries)

        // Build the vcxproj content
        const vcxproj = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" ToolsVersion="Current" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup Label="ProjectConfigurations">
    <ProjectConfiguration Include="Debug|${vsPlatform}">
      <Configuration>Debug</Configuration>
      <Platform>${vsPlatform}</Platform>
    </ProjectConfiguration>
  </ItemGroup>
  <PropertyGroup Label="Globals">
    <ProjectGuid>{${guid}}</ProjectGuid>
    <RootNamespace>${testBaseName}</RootNamespace>
    <ProjectName>${testBaseName}</ProjectName>
  </PropertyGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.default.props" />
  <PropertyGroup Label="Configuration" Condition="'$(Configuration)|$(Platform)'=='Debug|${vsPlatform}'">
    <ConfigurationType>Application</ConfigurationType>
    <PlatformToolset>v143</PlatformToolset>
    <CharacterSet>Unicode</CharacterSet>
    <UseDebugLibraries>true</UseDebugLibraries>
  </PropertyGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.props" />
  <ImportGroup Label="ExtensionSettings" />
  <ImportGroup Label="PropertySheets" Condition="'$(Configuration)|$(Platform)'=='Debug|${vsPlatform}'">
    <Import Project="$(UserRootDir)\\Microsoft.Cpp.$(Platform).user.props" Condition="exists('$(UserRootDir)\\Microsoft.Cpp.$(Platform).user.props')" Label="LocalAppDataPlatform" />
  </ImportGroup>
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|${vsPlatform}'">
    <OutDir>$(ProjectDir)</OutDir>
    <IntDir>$(ProjectDir)obj\\</IntDir>
    <TargetName>${testBaseName}</TargetName>
  </PropertyGroup>
  <ItemDefinitionGroup Condition="'$(Configuration)|$(Platform)'=='Debug|${vsPlatform}'">
    <ClCompile>
      <Optimization>Disabled</Optimization>
      <AdditionalIncludeDirectories>${includePaths}%(AdditionalIncludeDirectories)</AdditionalIncludeDirectories>
      <PreprocessorDefinitions>_DEBUG;_CONSOLE;%(PreprocessorDefinitions)</PreprocessorDefinitions>
      <WarningLevel>Level3</WarningLevel>
      <DebugInformationFormat>ProgramDatabase</DebugInformationFormat>
    </ClCompile>
    <Link>
      <GenerateDebugInformation>true</GenerateDebugInformation>
      <AdditionalLibraryDirectories>${libraryPaths}%(AdditionalLibraryDirectories)</AdditionalLibraryDirectories>
      <AdditionalDependencies>${additionalDependencies}%(AdditionalDependencies)</AdditionalDependencies>
      <SubSystem>Console</SubSystem>
    </Link>
  </ItemDefinitionGroup>
  <ItemGroup>
    <ClCompile Include="${relativePath}" />
  </ItemGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.targets" />
  <ImportGroup Label="ExtensionTargets" />
</Project>`

        // Build environment variables for the .user file
        const envString = await this.buildEnvironmentVariablesForMSVC(testFile, config, compiler)

        // Convert working directory to Windows path format
        const workingDirectory = testFile.directory.replace(/\//g, '\\')

        // Build the vcxproj.user content
        const vcxprojUser = `<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="Current" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|${vsPlatform}'">
    <LocalDebuggerWorkingDirectory>${workingDirectory}</LocalDebuggerWorkingDirectory>
    <LocalDebuggerEnvironment>${envString}</LocalDebuggerEnvironment>
    <DebuggerFlavor>WindowsLocalDebugger</DebuggerFlavor>
  </PropertyGroup>
</Project>`

        return {vcxproj, vcxprojUser}
    }

    /*
     Creates Visual Studio project files for debugging a C test file on Windows
     @param testFile C test file to create project for
     @param expandedFlags Compiler flags with ${vars} already expanded
     @param expandedLibraries Library names with ${vars} already expanded
     @param config Test configuration containing environment variables
     @param compiler Compiler name for TESTME_CC variable
     @returns Path to the generated .vcxproj file
     @throws Error if project creation fails
     */
    async createVisualStudioProject(
        testFile: TestFile,
        expandedFlags: string[],
        expandedLibraries: string[],
        config: TestConfig,
        compiler?: string
    ): Promise<string> {
        try {
            const testBaseName = basename(testFile.name, '.tst.c')
            const {vcxproj, vcxprojUser} = await this.generateVisualStudioProject(
                testFile,
                expandedFlags,
                expandedLibraries,
                config,
                compiler
            )

            // Write the project files
            const vcxprojFileName = `${testBaseName}.vcxproj`
            const vcxprojUserFileName = `${testBaseName}.vcxproj.user`

            await this.writeArtifact(testFile, vcxprojFileName, vcxproj)
            await this.writeArtifact(testFile, vcxprojUserFileName, vcxprojUser)

            console.log(`📝 Created Visual Studio project: ${vcxprojFileName}`)

            return join(testFile.artifactDir, vcxprojFileName)
        } catch (error) {
            throw new Error(`Failed to create Visual Studio project: ${error}`)
        }
    }

    /*
     Generates a deterministic GUID from a string
     @param input String to generate GUID from
     @returns GUID string in format XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */
    private generateGuid(input: string): string {
        // Simple hash function to generate deterministic values
        let hash = 0
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32bit integer
        }

        // Use absolute value and pad to create GUID-like structure
        const hex = Math.abs(hash).toString(16).padStart(8, '0')
        const hex2 = Math.abs(hash * 31).toString(16).padStart(12, '0')

        return `${hex.slice(0, 8)}-${hex2.slice(0, 4)}-4${hex2.slice(4, 7)}-a${hex2.slice(7, 10)}-${hex2.slice(0, 12)}`
            .toUpperCase()
    }

    /*
     Processes compiler flags to extract MSVC-compatible include and library paths
     @param flags Array of compiler flags
     @param testFile TestFile object to determine paths from
     @returns Object with include paths and library paths formatted for vcxproj
     */
    private processCompilerFlagsForMSVC(
        flags: string[],
        testFile: TestFile
    ): {includePaths: string; libraryPaths: string} {
        const includePaths: string[] = []
        const libraryPaths: string[] = []

        // Always include the test directory for headers (relative from artifact dir)
        const testDirFromArtifact = this.makePathRelativeIfLocal(testFile.directory, testFile.artifactDir)
        includePaths.push(testDirFromArtifact.replace(/\//g, '\\'))

        for (const flag of flags) {
            if (flag.startsWith('-I') || flag.startsWith('/I')) {
                const pathValue = flag.startsWith('-I') ? flag.substring(2) : flag.substring(2)
                if (pathValue && pathValue !== '.') {
                    // Adjust path to be relative from artifact directory (where vcxproj lives)
                    const relativePath = this.makePathRelativeIfLocal(pathValue, testFile.artifactDir)
                    includePaths.push(relativePath.replace(/\//g, '\\'))
                }
            } else if (flag.startsWith('-L') || flag.startsWith('/LIBPATH:')) {
                const pathValue = flag.startsWith('-L') ? flag.substring(2) : flag.substring(9)
                if (pathValue) {
                    // Adjust path to be relative from artifact directory (where vcxproj lives)
                    const relativePath = this.makePathRelativeIfLocal(pathValue, testFile.artifactDir)
                    libraryPaths.push(relativePath.replace(/\//g, '\\'))
                }
            }
        }

        // Format as semicolon-separated with trailing semicolon
        const includeStr = includePaths.length > 0 ? includePaths.join(';') + ';' : ''
        const libraryStr = libraryPaths.length > 0 ? libraryPaths.join(';') + ';' : ''

        return {includePaths: includeStr, libraryPaths: libraryStr}
    }

    /*
     Processes library names for MSVC linker
     @param libraries Array of library names
     @returns Formatted library dependencies for vcxproj
     */
    private processLibrariesForMSVC(libraries: string[]): string {
        if (libraries.length === 0) {
            return ''
        }

        // Convert library names to .lib format
        // Preserve the name as-is, just add .lib suffix if not present
        const libs = libraries.map((lib) => {
            return lib.endsWith('.lib') ? lib : `${lib}.lib`
        })

        return libs.join(';') + ';'
    }

    /*
     Builds environment variables string for MSVC debugger
     @param testFile TestFile object
     @param config Test configuration
     @param compiler Compiler name
     @returns Newline-separated KEY=VALUE string for LocalDebuggerEnvironment
     */
    private async buildEnvironmentVariablesForMSVC(
        testFile: TestFile,
        config: TestConfig,
        compiler?: string
    ): Promise<string> {
        const baseDir = config.configDir || testFile.directory
        const allEnvVars: Record<string, string> = {}

        // 1. First, capture any TESTME_* variables from the current process environment
        for (const [key, value] of Object.entries(process.env)) {
            if (key.startsWith('TESTME_') && value !== undefined) {
                allEnvVars[key] = value
            }
        }

        // 2. Add TESTME_* variables derived from CLI options/config
        allEnvVars.TESTME_VERBOSE = config.output?.verbose === true ? '1' : '0'
        allEnvVars.TESTME_QUIET = config.output?.quiet === true ? '1' : '0'
        allEnvVars.TESTME_KEEP = config.execution?.keepArtifacts === true ? '1' : '0'
        allEnvVars.TESTME_STOP = config.execution?.stopOnFailure === true ? '1' : '0'
        allEnvVars.TESTME_ITERATIONS = (config.execution?.iterations ?? 1).toString()

        if (config.execution?.depth !== undefined) {
            allEnvVars.TESTME_DEPTH = config.execution.depth.toString()
        }
        if (config.execution?.duration !== undefined) {
            allEnvVars.TESTME_DURATION = config.execution.duration.toString()
        }
        if (config.execution?.testClass !== undefined) {
            allEnvVars.TESTME_CLASS = config.execution.testClass
        }

        // 3. Add special variables (PLATFORM, PROFILE, OS, ARCH, CC, TESTDIR, CONFIGDIR)
        const specialVars = GlobExpansion.createSpecialVariables(
            testFile.artifactDir,
            testFile.directory,
            config.configDir || testFile.directory,
            compiler,
            config.profile
        )
        if (specialVars.PLATFORM !== undefined) allEnvVars.TESTME_PLATFORM = specialVars.PLATFORM
        if (specialVars.PROFILE !== undefined) allEnvVars.TESTME_PROFILE = specialVars.PROFILE
        if (specialVars.OS !== undefined) allEnvVars.TESTME_OS = specialVars.OS
        if (specialVars.ARCH !== undefined) allEnvVars.TESTME_ARCH = specialVars.ARCH
        if (specialVars.CC !== undefined) allEnvVars.TESTME_CC = specialVars.CC
        if (specialVars.TESTDIR !== undefined) allEnvVars.TESTME_TESTDIR = specialVars.TESTDIR
        if (specialVars.CONFIGDIR !== undefined) allEnvVars.TESTME_CONFIGDIR = specialVars.CONFIGDIR

        // 4. Add user-defined environment variables from config (config.environment or config.env)
        const configEnv = config.environment || config.env
        if (configEnv) {
            // First, add base environment variables
            for (const [key, value] of Object.entries(configEnv)) {
                // Skip platform-specific keys and non-string values
                if (key === 'windows' || key === 'macosx' || key === 'linux' || typeof value !== 'string') {
                    continue
                }
                allEnvVars[key] = value
            }

            // Then, merge Windows-specific environment variables
            const platformEnv = (configEnv as any).windows
            if (platformEnv) {
                for (const [key, value] of Object.entries(platformEnv)) {
                    if (typeof value !== 'string') {
                        continue
                    }
                    allEnvVars[key] = value
                }
            }
        }

        // Expand ${...} references and build newline-separated KEY=VALUE string
        const envLines: string[] = []
        for (const [key, value] of Object.entries(allEnvVars)) {
            const expandedValue = await GlobExpansion.expandSingle(value, baseDir, specialVars)
            // Convert forward slashes to backslashes for Windows paths
            const windowsValue = expandedValue.replace(/\//g, '\\')
            envLines.push(`${key}=${windowsValue}`)
        }

        return envLines.join('\n')
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
            return absolutePath
        }

        // Check if the path is within a reasonable project structure
        // (contains common project patterns like /build/, /lib/, /include/, etc.)
        const projectPatterns = ['/build/', '/lib/', '/include/', '/src/', '/test/', '../']
        const isProjectPath = projectPatterns.some((pattern) => absolutePath.includes(pattern))

        if (isProjectPath) {
            try {
                const relativePath = relative(fromDirectory, absolutePath)
                // Prefer relative paths that don't go up too many levels (max 3)
                const upLevels = (relativePath.match(/\.\.\//g) || []).length
                if (upLevels <= 3) {
                    return relativePath
                }
            } catch {
                // If relative() fails, fall back to absolute
            }
        }

        // Return absolute path for system libraries and deep nested paths
        return absolutePath
    }

    /*
     Processes compiler flags to extract Xcode build settings
     @param flags Array of compiler flags
     @param testFile TestFile object to determine relative paths from
     @returns Object with formatted Xcode settings string and library search paths
     */
    private processCompilerFlagsForXcode(
        flags: string[],
        testFile: TestFile
    ): {settings: string; librarySearchPaths: string[]} {
        const settings: string[] = []
        const headerSearchPaths: string[] = []
        const librarySearchPaths: string[] = []
        const runpathSearchPaths: string[] = []
        const otherCFlags: string[] = []

        for (const flag of flags) {
            if (flag.startsWith('-I')) {
                const path = flag.substring(2)
                if (path && path !== '.') {
                    // Build-time paths need to be relative to artifact directory (where Xcode builds)
                    const relativePath = this.makePathRelativeIfLocal(path, testFile.artifactDir)
                    headerSearchPaths.push(`"${relativePath}"`)
                }
            } else if (flag.startsWith('-L')) {
                const path = flag.substring(2)
                if (path) {
                    // Build-time paths need to be relative to artifact directory (where Xcode builds)
                    const relativePath = this.makePathRelativeIfLocal(path, testFile.artifactDir)
                    librarySearchPaths.push(`"${relativePath}"`)
                }
            } else if (flag.startsWith('-Wl,-rpath,')) {
                // Handle rpath flags: -Wl,-rpath,/path/to/libs
                const rpathValue = flag.substring(11) // Remove '-Wl,-rpath,'
                if (rpathValue) {
                    // Handle @executable_path and @loader_path relative paths
                    let processedPath = rpathValue
                    if (rpathValue.startsWith('@executable_path/') || rpathValue.startsWith('@loader_path/')) {
                        // Extract the relative part after @executable_path/ or @loader_path/
                        const pathPrefix = rpathValue.startsWith('@executable_path/')
                            ? '@executable_path/'
                            : '@loader_path/'
                        const relativePart = rpathValue.substring(pathPrefix.length)

                        // The relative part (e.g., "../../build/*/bin") is from executable location to target
                        // Executable is in test/.testme/socket/, target is at some path
                        // We need to convert this to be relative from test directory instead

                        // First, resolve what the target absolute path would be
                        const executableDir = testFile.artifactDir // e.g., /Users/mob/c/r/test/.testme/socket
                        const targetPath = path.resolve(executableDir, relativePart)

                        // Now make it relative to the test directory (working directory)
                        processedPath = path.relative(testFile.directory, targetPath)
                    }

                    // Runtime paths need to be relative to test directory (working directory)
                    const relativePath = this.makePathRelativeIfLocal(processedPath, testFile.directory)
                    runpathSearchPaths.push(`"${relativePath}"`)
                }
            } else if (flag.startsWith('-std=')) {
                // Map C standard to Xcode setting
                const std = flag.substring(5)
                if (std === 'c99') {
                    settings.push('GCC_C_LANGUAGE_STANDARD: c99')
                } else if (std === 'c11') {
                    settings.push('GCC_C_LANGUAGE_STANDARD: c11')
                }
            } else if (flag === '-Wall') {
                settings.push('WARNING_CFLAGS: "-Wall"')
            } else if (flag === '-Wextra') {
                // Add to other C flags since Xcode doesn't have direct equivalent
                otherCFlags.push(flag)
            } else if (flag.startsWith('-W') || flag.startsWith('-O') || flag.startsWith('-g')) {
                // Other warning, optimization, or debug flags
                otherCFlags.push(flag)
            }
        }

        // Add header search paths
        // Always include the test directory itself for header searches
        const testDirFromArtifact = this.makePathRelativeIfLocal(testFile.directory, testFile.artifactDir)
        headerSearchPaths.unshift(`"${testDirFromArtifact}"`)

        if (headerSearchPaths.length > 0) {
            settings.push(`HEADER_SEARCH_PATHS: [${headerSearchPaths.join(', ')}]`)
        }

        // Add library search paths
        if (librarySearchPaths.length > 0) {
            settings.push(`LIBRARY_SEARCH_PATHS: [${librarySearchPaths.join(', ')}]`)
        }

        // Add runtime library search paths (rpath)
        if (runpathSearchPaths.length > 0) {
            settings.push(`LD_RUNPATH_SEARCH_PATHS: [${runpathSearchPaths.join(', ')}]`)
        }

        // Add other C flags
        if (otherCFlags.length > 0) {
            settings.push(`OTHER_CFLAGS: "${otherCFlags.join(' ')}"`)
        }

        return {
            settings: settings.map((setting) => `      ${setting}`).join('\n'),
            librarySearchPaths,
        }
    }

    /*
     Processes library names to create Xcode linker settings
     @param libraries Array of library names
     @returns Formatted Xcode linker settings string
     */
    private processLibrariesForXcode(libraries: string[]): string {
        if (libraries.length === 0) {
            return ''
        }

        const settings: string[] = []

        // Note: LIBRARY_SEARCH_PATHS is now handled in processCompilerFlagsForXcode() from -L flags

        // Use -l flags for all libraries - let Xcode find .a or .dylib automatically
        const libFlags = libraries
            .map((lib) => {
                // Remove "lib" prefix if present, then add "-l" prefix
                const libName = lib.startsWith('lib') ? lib.slice(3) : lib
                return `-l${libName}`
            })
            .join(' ')

        if (libFlags) {
            settings.push(`OTHER_LDFLAGS: "${libFlags}"`)
        }

        // Note: LD_RUNPATH_SEARCH_PATHS is now handled in processCompilerFlagsForXcode() from rpath flags

        return settings.map((setting) => `      ${setting}`).join('\n')
    }
}
