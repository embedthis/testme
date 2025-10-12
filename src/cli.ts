import type { CliOptions } from "./types.ts";

/*
 Command-line interface parser for the testme application
 Handles argument parsing, validation, and help text generation
 */
export class CliParser {
    /*
     Parses command-line arguments into structured options
     @param args Array of command-line arguments (excluding program name)
     @returns Parsed CLI options
     @throws Error if invalid options are provided
     */
    static parse(args: string[]): CliOptions {
        const options: CliOptions = {
            patterns: [],
            clean: false,
            list: false,
            verbose: false,
            keep: false,
            step: false,
            debug: false,
            help: false,
            version: false,
            quiet: false,
            show: false,
            init: false,
            continue: false,
            noServices: false,
        };

        let i = 0;
        while (i < args.length) {
            const arg = args[i];

            switch (arg) {
                case "--config":
                case "-c":
                    if (i + 1 < args.length) {
                        options.config = args[i + 1]!;
                        i += 2;
                    } else {
                        throw new Error(`${arg} requires a value`);
                    }
                    break;

                case "--clean":
                    options.clean = true;
                    i++;
                    break;

                case "--list":
                case "-l":
                    options.list = true;
                    i++;
                    break;

                case "--verbose":
                case "-v":
                    options.verbose = true;
                    i++;
                    break;


                case "--help":
                case "-h":
                    options.help = true;
                    i++;
                    break;

                case "--version":
                case "-V":
                    options.version = true;
                    i++;
                    break;

                case "--chdir":
                    if (i + 1 < args.length) {
                        options.chdir = args[i + 1]!;
                        i += 2;
                    } else {
                        throw new Error(`${arg} requires a directory path`);
                    }
                    break;

                case "--quiet":
                case "-q":
                    options.quiet = true;
                    i++;
                    break;

                case "--keep":
                case "-k":
                    options.keep = true;
                    i++;
                    break;

                case "--step":
                    options.step = true;
                    i++;
                    break;

                case "--depth":
                    if (i + 1 < args.length) {
                        const depthValue = parseInt(args[i + 1]!, 10);
                        if (isNaN(depthValue) || depthValue < 0) {
                            throw new Error(`${arg} requires a non-negative number`);
                        }
                        options.depth = depthValue;
                        i += 2;
                    } else {
                        throw new Error(`${arg} requires a number value`);
                    }
                    break;

                case "--debug":
                case "-d":
                    options.debug = true;
                    i++;
                    break;

                case "--show":
                case "-s":
                    options.show = true;
                    i++;
                    break;

                case "--workers":
                case "-w":
                    if (i + 1 < args.length) {
                        const workersValue = parseInt(args[i + 1]!, 10);
                        if (isNaN(workersValue) || workersValue < 1) {
                            throw new Error(`${arg} requires a positive number`);
                        }
                        options.workers = workersValue;
                        i += 2;
                    } else {
                        throw new Error(`${arg} requires a number value`);
                    }
                    break;

                case "--profile":
                case "-p":
                    if (i + 1 < args.length) {
                        options.profile = args[i + 1]!;
                        i += 2;
                    } else {
                        throw new Error(`${arg} requires a profile name`);
                    }
                    break;

                case "--init":
                    options.init = true;
                    i++;
                    break;

                case "--new":
                    if (i + 1 < args.length) {
                        options.new = args[i + 1]!;
                        i += 2;
                    } else {
                        throw new Error(`${arg} requires a test name`);
                    }
                    break;

                case "--continue":
                    options.continue = true;
                    i++;
                    break;

                case "--no-services":
                    options.noServices = true;
                    i++;
                    break;

                default:
                    if (arg.startsWith("-")) {
                        throw new Error(`Unknown option: ${arg}`);
                    }
                    // This is a test pattern
                    options.patterns.push(arg);
                    i++;
                    break;
            }
        }

        return options;
    }

    /*
     Returns formatted help text for the application
     @returns Multi-line help string with usage, options, and examples
     */
    static getUsage(): string {
        return `
tm - Multi-language Test Runner

USAGE:
    tm [OPTIONS] [PATTERNS...]

DESCRIPTION:
    By default, tm shows test names as they run and displays a summary.
    Use --quiet for silent operation or --verbose for detailed output.

ARGUMENTS:
    <PATTERNS>    Optional glob patterns to filter tests
                  - Full filenames: "math.tst.c", "*.tst.c"
                  - Base names: "math", "test*" (matches math.tst.c, test.tst.js, etc.)
                  - Path patterns: "**/math*", "tests/*.tst.c"

OPTIONS:
        --chdir <DIR>      Change to directory before running tests
        --clean            Clean all .testme artifact directories
    -c, --config <FILE>    Use specific configuration file
        --continue         Continue running tests even if some fail, always exit with 0
    -d, --debug            Launch debugger (GDB on Linux, Xcode on macOS)
        --depth <NUMBER>   Run tests with depth requirement <= NUMBER (default: 0)
    -h, --help             Show this help message
        --init             Create testme.json5 configuration file in current directory
    -k, --keep             Keep .testme artifacts after running tests
    -l, --list             List discovered tests without running them
        --new <NAME>       Create new test file from template (e.g., --new math.c)
        --no-services      Skip all service commands (skip, prep, setup, cleanup)
    -p, --profile <NAME>   Set build profile (overrides config and env.PROFILE)
    -q, --quiet            Run silently with no output, only exit codes
    -s, --show             Display the C compile command used
        --step             Run tests one at a time with prompts (forces serial mode)
    -v, --verbose          Enable verbose mode with detailed output and TESTME_VERBOSE
    -V, --version          Show version information
    -w, --workers <NUMBER> Number of parallel workers (overrides config)

EXAMPLES:
    # Getting Started
    tm --init                  # Create testme.json5 configuration file
    tm --new math.c            # Create math.tst.c from template
    tm --new api.js            # Create api.tst.js from template
    tm --new test.sh           # Create test.tst.sh from template

    # Running Tests
    tm                         # Run all tests in current directory tree
    tm "*.tst.c"               # Run only C tests
    tm "math"                  # Run math.tst.c, math.tst.js, etc.
    tm "math.tst.c"            # Run specific test file
    tm "**/math*"              # Run tests with 'math' in their name
    tm --list                  # List all discoverable tests
    tm --clean                 # Clean all test artifacts
    tm -v "integration*"       # Run integration tests with verbose output
    tm --keep "*.tst.c"        # Run C tests and keep build artifacts
    tm --step                  # Run tests one at a time with prompts
    tm --depth 5               # Run tests with depth requirement <= 5
    tm --debug math            # Debug math.tst.c with GDB/Xcode
    tm -s "*.tst.c"            # Display C compile commands used
    tm -w 8                    # Use 8 parallel workers (overrides config)
    tm --quiet                 # Run silently with no output, only exit codes
    tm --no-services           # Run tests without any service commands (run services externally)

SUPPORTED TEST TYPES:
    *.tst.sh    Shell script tests (bash/zsh/fish)
    *.tst.ps1   PowerShell script tests (Windows)
    *.tst.bat   Batch script tests (Windows)
    *.tst.cmd   Command script tests (Windows)
    *.tst.c     C program tests (compiled with gcc/clang/MSVC)
    *.tst.js    JavaScript tests (run with Bun)
    *.tst.ts    TypeScript tests (run with Bun)
    *.tst.es    Ejscript tests (run with ejs)

CONFIGURATION:
    tm looks for testme.json configuration files starting from the current
    directory and walking up the directory tree. Configuration files support:

    - Compiler settings for C tests
    - Execution timeouts and parallelism
    - Output formatting preferences
    - Include/exclude patterns
    - Service commands (prep, setup, cleanup)
    - Depth requirements (tests only run if --depth >= config depth)

For more information, see the project documentation.
`;
    }

    /*
     Validates parsed CLI options for consistency and correctness
     @param options Parsed CLI options to validate
     @throws Error if options are invalid or conflicting
     */
    static validateOptions(options: CliOptions): void {
        if (options.config && !options.config.trim()) {
            throw new Error("Config file path cannot be empty");
        }

        if (options.help) {
            return; // Help option is always valid, skip other validations
        }

        if (options.clean && options.list) {
            throw new Error("Cannot use --clean and --list together");
        }

        // Validate test patterns
        for (const pattern of options.patterns) {
            if (!pattern.trim()) {
                throw new Error("Empty patterns are not allowed");
            }
        }
    }
}
