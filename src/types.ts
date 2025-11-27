/*
 Represents a discovered test file with metadata
 */
export type TestFile = {
    path: string
    name: string
    extension: string
    type: TestType
    directory: string
    artifactDir: string
    isManual?: boolean // True if enable='manual' in config
    configDir?: string // Directory containing the config for this test
}

/*
 Represents the result of executing a test
 */
export type TestResult = {
    file: TestFile
    status: TestStatus
    duration: number
    output: string
    error?: string
    exitCode?: number
    assertions?: {
        passed: number
        failed: number
    }
}

/*
 Main configuration for the test runner
 */
export type TestConfig = {
    enable?: boolean | 'manual' // Enable (true), disable (false), or run only when explicitly named ('manual')
    depth?: number // Minimum depth required to run tests in this directory (default: 0)
    profile?: string // Build profile (dev, prod, debug, release, etc.) - defaults to env.PROFILE or 'dev'
    inherit?: boolean | string[] // Inherit from parent config: true (all), false (none), or array of keys to inherit
    compiler?: CompilerConfig
    debug?: DebugConfig
    execution?: ExecutionConfig
    output?: OutputConfig
    patterns?: PatternConfig
    services?: ServiceConfig
    environment?: EnvironmentConfig // Environment variables (replaces 'env')
    env?: EnvironmentConfig // Deprecated: use 'environment' instead (supported for backward compatibility)
    configDir?: string // Directory containing the config file
}

/*
 Platform-specific compiler settings
 */
type PlatformCompilerSettings = {
    flags?: string[]
    libraries?: string[]
}

/*
 Compiler-specific settings with optional platform overrides
 */
type CompilerSettings = {
    flags?: string[]
    libraries?: string[]
    windows?: PlatformCompilerSettings
    macosx?: PlatformCompilerSettings
    linux?: PlatformCompilerSettings
}

/*
 Configuration for language-specific compilers
 */
export type CompilerConfig = {
    c?: {
        compiler?:
            | string
            | {
                  windows?: string
                  macosx?: string
                  linux?: string
              } // Optional: auto-detect if not specified, or use platform-specific compiler
        flags?: string[] // Default flags for all compilers
        libraries?: string[]
        gcc?: CompilerSettings
        clang?: CompilerSettings
        msvc?: CompilerSettings
    }
    es?: {
        require?: string | string[]
    }
}

/*
 Platform-specific debugger map type
 */
type PlatformDebugger =
    | string
    | {
          windows?: string
          macosx?: string
          linux?: string
      }

/*
 Configuration for debuggers across different languages
 */
export type DebugConfig = {
    c?: PlatformDebugger // C debugger: xcode, lldb, gdb, vs, vscode, or path
    js?: PlatformDebugger // JavaScript debugger: vscode, or path
    ts?: PlatformDebugger // TypeScript debugger: vscode, or path
    py?: PlatformDebugger // Python debugger: vscode, pdb, or path
    go?: PlatformDebugger // Go debugger: vscode, delve, or path
    es?: PlatformDebugger // Ejscript debugger: vscode, or path
}

/*
 Configuration for test execution behavior
 */
export type ExecutionConfig = {
    timeout: number // Timeout per test in seconds
    parallel: boolean
    workers?: number
    keepArtifacts?: boolean
    rebuild?: boolean // Force recompilation of C tests even if binary is up-to-date
    stepMode?: boolean
    depth?: number
    debugMode?: boolean
    showCommands?: boolean
    showWarnings?: boolean // Show compiler warnings and compile command line
    iterations?: number
    stopOnFailure?: boolean // Stop testing as soon as a test fails
    duration?: number // Duration in seconds (exported as TESTME_DURATION)
}

/*
 Configuration for output formatting and display
 */
export type OutputConfig = {
    verbose: boolean
    format: 'simple' | 'detailed' | 'json'
    colors: boolean
    quiet?: boolean
    errorsOnly?: boolean
    live?: boolean // Stream test output in real-time to console (requires TTY)
}

/*
 Configuration for file pattern matching
 */
export type PatternConfig = {
    include: string[]
    exclude: string[]
    windows?: {
        include?: string[]
        exclude?: string[]
    }
    macosx?: {
        include?: string[]
        exclude?: string[]
    }
    linux?: {
        include?: string[]
        exclude?: string[]
    }
}

/*
 Configuration for test setup and cleanup services
 */
export type ServiceConfig = {
    skip?: string
    environment?: string // Script to emit environment variables (runs before prep)
    globalPrep?: string // Script to run once before all test groups (runs with root config)
    prep?: string
    setup?: string
    cleanup?: string
    globalCleanup?: string // Script to run once after all test groups (runs with root config)
    skipTimeout?: number // Skip script timeout in seconds
    environmentTimeout?: number // Environment script timeout in seconds
    globalPrepTimeout?: number // Global prep timeout in seconds
    prepTimeout?: number // Prep timeout in seconds
    setupTimeout?: number // Setup timeout in seconds
    cleanupTimeout?: number // Cleanup timeout in seconds
    globalCleanupTimeout?: number // Global cleanup timeout in seconds
    delay?: number // DEPRECATED: Use setupDelay instead (kept for backward compatibility)
    setupDelay?: number // Delay in seconds after setup before running tests (default: 1)
    shutdownTimeout?: number // Wait time in seconds for graceful shutdown before SIGKILL (default: 5)
    healthCheck?: HealthCheckConfig // Health check configuration to verify service readiness
}

/*
 Health check configuration for verifying service readiness
 */
export type HealthCheckConfig = {
    type?: 'http' | 'tcp' | 'script' | 'file' // Health check type (default: http)
    interval?: number // Poll interval in milliseconds (default: 100)
    timeout?: number // Maximum wait time in seconds (default: 30)
} & (
    | {type?: 'http'; url: string; expectedStatus?: number; expectedBody?: string}
    | {type: 'tcp'; host: string; port: number}
    | {type: 'script'; command: string; expectedExit?: number}
    | {type: 'file'; path: string}
)

/*
 Configuration for environment variables to set during test execution
 Supports platform-specific overrides via windows, macosx, linux keys and default fallback values
 */
export type EnvironmentConfig = {
    [key: string]:
        | string
        | {
              default?: string
              windows?: string
              macosx?: string
              linux?: string
          }
    windows?: {
        [key: string]: string
    }
    macosx?: {
        [key: string]: string
    }
    linux?: {
        [key: string]: string
    }
}

/*
 Parsed command-line interface options
 */
export type CliOptions = {
    patterns: string[]
    config?: string
    clean: boolean
    list: boolean
    verbose: boolean
    keep: boolean
    rebuild: boolean // Force recompilation of C tests even if binary is up-to-date
    step: boolean
    depth?: number
    debug: boolean
    help: boolean
    version: boolean
    chdir?: string
    quiet: boolean
    show: boolean
    warning: boolean // Show compiler warnings and compile command
    workers?: number
    profile?: string
    init: boolean
    new?: string
    continue: boolean
    noServices: boolean
    iterations?: number
    stop: boolean
    live: boolean
    duration?: number // Duration in seconds
    timeout?: number // Timeout in seconds (overrides config)
}

/*
 Represents a collection of tests to be executed
 */
export type TestSuite = {
    tests: TestFile[]
    config: TestConfig
    rootDir: string
}

/*
 Enumeration of supported test file types
 */
export enum TestType {
    Shell = 'shell',
    PowerShell = 'powershell',
    Batch = 'batch',
    C = 'c',
    JavaScript = 'javascript',
    TypeScript = 'typescript',
    Ejscript = 'ejscript',
    Python = 'python',
    Go = 'go',
}

/*
 Enumeration of possible test execution states
 */
export enum TestStatus {
    Pending = 'pending',
    Running = 'running',
    Passed = 'passed',
    Failed = 'failed',
    Skipped = 'skipped',
    Error = 'error',
}

/*
 Type definition for language-specific test handlers
 */
export type TestHandler = {
    canHandle(file: TestFile): boolean
    prepare?(file: TestFile): Promise<void>
    execute(file: TestFile, config: TestConfig): Promise<TestResult>
    cleanup?(file: TestFile, config?: TestConfig): Promise<void>
}

/*
 Options for test file discovery
 */
export type DiscoveryOptions = {
    rootDir: string
    patterns: string[]
    excludePatterns: string[]
}

/*
 Type definition for managing build artifacts and temporary files
 */
export type ArtifactManager = {
    createArtifactDir(testFile: TestFile): Promise<string>
    cleanArtifactDir(testFile: TestFile): Promise<void>
    cleanAllArtifacts(rootDir: string): Promise<void>
    getArtifactPath(testFile: TestFile, filename: string): string
}
