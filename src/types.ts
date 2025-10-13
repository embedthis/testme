/*
 Represents a discovered test file with metadata
 */
export type TestFile = {
  path: string;
  name: string;
  extension: string;
  type: TestType;
  directory: string;
  artifactDir: string;
  isManual?: boolean; // True if enable='manual' in config
  configDir?: string; // Directory containing the config for this test
}

/*
 Represents the result of executing a test
 */
export type TestResult = {
  file: TestFile;
  status: TestStatus;
  duration: number;
  output: string;
  error?: string;
  exitCode?: number;
}

/*
 Main configuration for the test runner
 */
export type TestConfig = {
  enable?: boolean | 'manual'; // Enable (true), disable (false), or run only when explicitly named ('manual')
  depth?: number; // Minimum depth required to run tests in this directory (default: 0)
  profile?: string; // Build profile (dev, prod, debug, release, etc.) - defaults to env.PROFILE or 'dev'
  inherit?: boolean | string[]; // Inherit from parent config: true (all), false (none), or array of keys to inherit
  compiler?: CompilerConfig;
  debug?: DebugConfig;
  execution?: ExecutionConfig;
  output?: OutputConfig;
  patterns?: PatternConfig;
  services?: ServiceConfig;
  env?: EnvironmentConfig;
  configDir?: string; // Directory containing the config file
}

/*
 Platform-specific compiler settings
 */
type PlatformCompilerSettings = {
  flags?: string[];
  libraries?: string[];
};

/*
 Compiler-specific settings with optional platform overrides
 */
type CompilerSettings = {
  flags?: string[];
  libraries?: string[];
  windows?: PlatformCompilerSettings;
  macosx?: PlatformCompilerSettings;
  linux?: PlatformCompilerSettings;
};

/*
 Configuration for language-specific compilers
 */
export type CompilerConfig = {
  c?: {
    compiler?: string | {
      windows?: string;
      macosx?: string;
      linux?: string;
    }; // Optional: auto-detect if not specified, or use platform-specific compiler
    flags?: string[]; // Default flags for all compilers
    libraries?: string[];
    gcc?: CompilerSettings;
    clang?: CompilerSettings;
    msvc?: CompilerSettings;
  };
  es?: {
    require?: string | string[];
  };
}

/*
 Platform-specific debugger map type
 */
type PlatformDebugger = string | {
  windows?: string;
  macosx?: string;
  linux?: string;
};

/*
 Configuration for debuggers across different languages
 */
export type DebugConfig = {
  c?: PlatformDebugger;      // C debugger: xcode, lldb, gdb, vs, vscode, or path
  js?: PlatformDebugger;     // JavaScript debugger: vscode, or path
  ts?: PlatformDebugger;     // TypeScript debugger: vscode, or path
  py?: PlatformDebugger;     // Python debugger: vscode, pdb, or path
  go?: PlatformDebugger;     // Go debugger: vscode, delve, or path
  es?: PlatformDebugger;     // Ejscript debugger: vscode, or path
}

/*
 Configuration for test execution behavior
 */
export type ExecutionConfig = {
  timeout: number;
  parallel: boolean;
  workers?: number;
  keepArtifacts?: boolean;
  stepMode?: boolean;
  depth?: number;
  debugMode?: boolean;
  showCommands?: boolean;
  iterations?: number;
}

/*
 Configuration for output formatting and display
 */
export type OutputConfig = {
  verbose: boolean;
  format: 'simple' | 'detailed' | 'json';
  colors: boolean;
  quiet?: boolean;
  errorsOnly?: boolean;
}

/*
 Configuration for file pattern matching
 */
export type PatternConfig = {
  include: string[];
  exclude: string[];
  windows?: {
    include?: string[];
    exclude?: string[];
  };
  macosx?: {
    include?: string[];
    exclude?: string[];
  };
  linux?: {
    include?: string[];
    exclude?: string[];
  };
}

/*
 Configuration for test setup and cleanup services
 */
export type ServiceConfig = {
  skip?: string;
  prep?: string;
  setup?: string;
  cleanup?: string;
  skipTimeout?: number;
  prepTimeout?: number;
  setupTimeout?: number;
  cleanupTimeout?: number;
  delay?: number; // Delay in milliseconds after setup before running tests
}

/*
 Configuration for environment variables to set during test execution
 Supports platform-specific overrides via windows, macosx, linux keys and default fallback values
 */
export type EnvironmentConfig = {
  [key: string]: string | {
    default?: string;
    windows?: string;
    macosx?: string;
    linux?: string;
  };
  windows?: {
    [key: string]: string;
  };
  macosx?: {
    [key: string]: string;
  };
  linux?: {
    [key: string]: string;
  };
}

/*
 Parsed command-line interface options
 */
export type CliOptions = {
  patterns: string[];
  config?: string;
  clean: boolean;
  list: boolean;
  verbose: boolean;
  keep: boolean;
  step: boolean;
  depth?: number;
  debug: boolean;
  help: boolean;
  version: boolean;
  chdir?: string;
  quiet: boolean;
  show: boolean;
  workers?: number;
  profile?: string;
  init: boolean;
  new?: string;
  continue: boolean;
  noServices: boolean;
  iterations?: number;
}

/*
 Represents a collection of tests to be executed
 */
export type TestSuite = {
  tests: TestFile[];
  config: TestConfig;
  rootDir: string;
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
  Go = 'go'
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
  Error = 'error'
}

/*
 Type definition for language-specific test handlers
 */
export type TestHandler = {
  canHandle(file: TestFile): boolean;
  prepare?(file: TestFile): Promise<void>;
  execute(file: TestFile, config: TestConfig): Promise<TestResult>;
  cleanup?(file: TestFile, config?: TestConfig): Promise<void>;
}

/*
 Options for test file discovery
 */
export type DiscoveryOptions = {
  rootDir: string;
  patterns: string[];
  excludePatterns: string[];
}

/*
 Type definition for managing build artifacts and temporary files
 */
export type ArtifactManager = {
  createArtifactDir(testFile: TestFile): Promise<string>;
  cleanArtifactDir(testFile: TestFile): Promise<void>;
  cleanAllArtifacts(rootDir: string): Promise<void>;
  getArtifactPath(testFile: TestFile, filename: string): string;
}