import type { TestFile, TestResult, TestConfig, TestHandler, TestSuite, DiscoveryOptions } from './types.ts';
import { TestStatus, TestType } from './types.ts';
import { TestDiscovery } from './discovery.ts';
import { ArtifactManager } from './artifacts.ts';
import { TestReporter } from './reporter.ts';
import { ShellTestHandler, CTestHandler, JavaScriptTestHandler, TypeScriptTestHandler, EjscriptTestHandler, PythonTestHandler, GoTestHandler } from './handlers/index.ts';
import { ConfigManager } from './config.ts';

/*
 TestRunner - Core test execution orchestrator

 Responsibilities:
 - Discovers test files using TestDiscovery
 - Manages test execution using language-specific handlers
 - Coordinates parallel and sequential test execution
 - Reports test results using TestReporter
 - Manages artifact cleanup

 Architecture:
 - Uses Semaphore for concurrency control in parallel mode
 - Delegates test execution to language-specific handlers (C, Shell, JS, TS, etc.)
 - Supports both parallel and sequential execution modes
 - Handles step mode for interactive debugging
 - Manages artifact directories via ArtifactManager

 Execution Flow:
 1. discoverTests() - Find all test files matching patterns
 2. runTests() - Execute tests using appropriate handlers
 3. Handlers perform: prepare() -> execute() -> cleanup()
 4. Results collected and reported via TestReporter
 */

/*
 TestRunner class - Main test execution coordinator
 Orchestrates test discovery, execution, and reporting across multiple test types
 */
export class TestRunner {
  private artifactManager: ArtifactManager;
  private shouldStopCallback: (() => boolean) | null = null;

  /*
   Creates a new TestRunner instance
   Initializes artifact manager for test build outputs
   */
  constructor() {
    this.artifactManager = new ArtifactManager();
  }

  /*
   Sets a callback function to check if execution should stop (e.g., Ctrl+C pressed)
   @param callback Function that returns true if execution should stop
   */
  setShouldStopCallback(callback: () => boolean): void {
    this.shouldStopCallback = callback;
  }

  /*
   Discovers all test files matching the given options
   @param options Discovery options including patterns, root directory, and exclusions
   @returns Promise resolving to array of discovered test files
   */
  async discoverTests(options: DiscoveryOptions): Promise<TestFile[]> {
    return await TestDiscovery.discoverTests(options);
  }

  /*
   Runs all tests in the test suite
   Handles parallel or sequential execution based on configuration
   @param testSuite Test suite containing tests and configuration
   @returns Promise resolving to array of test results
   */
  async runTests(testSuite: TestSuite): Promise<TestResult[]> {
    const reporter = new TestReporter(testSuite.config);

    // Only show "Running tests..." if not in quiet mode and we have tests to run
    if (!this.isQuietMode(testSuite.config) && testSuite.tests.length > 0) {
      reporter.reportTestsStarting();
    }

    if (testSuite.config.execution?.parallel) {
      return await this.runTestsParallel(testSuite, reporter);
    } else {
      return await this.runTestsSequential(testSuite, reporter);
    }
  }

  async cleanArtifacts(rootDir: string): Promise<void> {
    await this.artifactManager.cleanAllArtifacts(rootDir);
  }

  private async runTestsSequential(testSuite: TestSuite, reporter: TestReporter): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (let i = 0; i < testSuite.tests.length; i++) {
      // Check if we should stop (Ctrl+C pressed)
      if (this.shouldStopCallback && this.shouldStopCallback()) {
        break;
      }

      const testFile = testSuite.tests[i];

      // Handle step mode prompting
      if (testSuite.config.execution?.stepMode) {
        const shouldSkip = await this.promptForNextTest(testFile);

        if (shouldSkip) {
          // Create a skipped result
          const skippedResult = {
            file: testFile,
            status: TestStatus.Skipped,
            duration: 0,
            output: 'Test skipped by user in step mode'
          };
          results.push(skippedResult);

          if (!this.isQuietMode(testSuite.config)) {
            reporter.reportProgress(skippedResult);
          }
          continue;
        }
      }

      // Show test starting (interactive animation)
      if (!this.isQuietMode(testSuite.config)) {
        reporter.reportTestStarting(testFile);
      }

      const result = await this.executeTest(testFile, testSuite.config);
      results.push(result);

      if (!this.isQuietMode(testSuite.config)) {
        reporter.reportProgress(result);
      }

      // Stop immediately if test failed and stopOnFailure is enabled
      if (testSuite.config.execution?.stopOnFailure && result.status === TestStatus.Failed) {
        break;
      }
    }

    return results;
  }

  /*
   Runs tests in parallel using a worker pool pattern

   Key design: Uses a shared queue where workers continuously pull tests and process them.
   As soon as a worker finishes a test, it immediately starts the next one from the queue.
   This ensures maximum parallelism and prevents long-running tests from blocking shorter ones.

   Benefits over semaphore/Promise.all approach:
   - True streaming execution: tests start immediately as workers free up
   - No batching delays: long tests don't hold up entire batches
   - Better resource utilization: workers never sit idle while tests remain

   @param testSuite Test suite containing tests and configuration
   @param reporter Reporter for progress updates
   @returns Promise resolving to array of test results
   */
  private async runTestsParallel(testSuite: TestSuite, reporter: TestReporter): Promise<TestResult[]> {
    const workers = testSuite.config.execution?.workers || 4;
    const results: TestResult[] = [];
    const testsQueue = [...testSuite.tests];
    const activeWorkers: Promise<void>[] = [];
    let shouldStop = false; // Shared flag to signal workers to stop

    // Worker function that processes tests from the queue
    // Each worker runs in a loop, continuously pulling tests until queue is empty
    const worker = async () => {
      while (testsQueue.length > 0 && !shouldStop) {
        // Check if we should stop (Ctrl+C pressed)
        if (this.shouldStopCallback && this.shouldStopCallback()) {
          shouldStop = true;
          testsQueue.length = 0;
          break;
        }

        const testFile = testsQueue.shift();
        if (!testFile) break;

        // Show test starting (interactive animation)
        if (!this.isQuietMode(testSuite.config)) {
          reporter.reportTestStarting(testFile);
        }

        const result = await this.executeTest(testFile, testSuite.config);
        results.push(result);

        if (!this.isQuietMode(testSuite.config)) {
          reporter.reportProgress(result);
        }

        // Stop all workers if test failed and stopOnFailure is enabled
        if (testSuite.config.execution?.stopOnFailure && result.status === TestStatus.Failed) {
          shouldStop = true;
          testsQueue.length = 0; // Clear queue to stop other workers
        }
      }
    };

    // Start worker pool
    for (let i = 0; i < Math.min(workers, testSuite.tests.length); i++) {
      activeWorkers.push(worker());
    }

    // Wait for all workers to complete
    await Promise.all(activeWorkers);

    return results;
  }

  private async executeTest(testFile: TestFile, globalConfig: TestConfig): Promise<TestResult> {
    const handler = this.createFreshHandler(testFile);

    if (!handler) {
      return {
        file: testFile,
        status: TestStatus.Error,
        duration: 0,
        output: '',
        error: `No handler found for test type: ${testFile.type}`
      };
    }

    try {
      // Find the nearest config file to this specific test file
      const testSpecificConfig = await this.findConfigForTest(testFile, globalConfig);

      // Prepare test (if needed)
      if (handler.prepare) {
        await handler.prepare(testFile);
      }

      // Execute the test with its specific config
      const result = await handler.execute(testFile, testSpecificConfig);

      // Cleanup (if needed)
      if (handler.cleanup) {
        await handler.cleanup(testFile, testSpecificConfig);
      }

      return result;
    } catch (error) {
      return {
        file: testFile,
        status: TestStatus.Error,
        duration: 0,
        output: '',
        error: `Test execution failed: ${error}`
      };
    }
  }

  /*
   Creates a fresh handler instance for each test to avoid shared state conflicts
   @param testFile Test file to create handler for
   @returns New handler instance or undefined if no handler found
   */
  private createFreshHandler(testFile: TestFile): TestHandler | undefined {
    switch (testFile.type) {
      case TestType.Shell:
      case TestType.PowerShell:
      case TestType.Batch:
        return new ShellTestHandler();
      case TestType.C:
        return new CTestHandler();
      case TestType.JavaScript:
        return new JavaScriptTestHandler();
      case TestType.TypeScript:
        return new TypeScriptTestHandler();
      case TestType.Ejscript:
        return new EjscriptTestHandler();
      case TestType.Python:
        return new PythonTestHandler();
      case TestType.Go:
        return new GoTestHandler();
      default:
        return undefined;
    }
  }

  async listTests(options: DiscoveryOptions, config: TestConfig, invocationDir?: string, cliPatterns?: string[]): Promise<void> {
    let tests = await this.discoverTests(options);

    // If CLI patterns are provided, apply them as an additional filter
    if (cliPatterns && cliPatterns.length > 0) {
      tests = TestDiscovery.filterTestsByPatterns(tests, cliPatterns, options.rootDir);
    }

    if (!tests.length) {
      console.log('No tests discovered');
      return;
    }

    // Group tests by configuration directory and filter out disabled ones
    const testGroups = new Map<string, TestFile[]>();
    const enabledTests: TestFile[] = [];

    for (const test of tests) {
      // Find the nearest config directory for this test
      const configResult = await ConfigManager.findConfigFile(test.directory);
      const configDir = configResult.configDir || test.directory;

      if (!testGroups.has(configDir)) {
        testGroups.set(configDir, []);
      }
      testGroups.get(configDir)!.push(test);
    }

    // Check each configuration group for enable status
    for (const [configDir, groupTests] of testGroups) {
      const groupConfig = await ConfigManager.findConfig(configDir);

      if (groupConfig.enable === false) {
        if (config.output?.verbose) {
          console.log(`🚫 Tests disabled in: ${configDir === options.rootDir ? '.' : configDir.replace(options.rootDir + '/', '')}`);
        }
      } else {
        enabledTests.push(...groupTests);
      }
    }

    if (!enabledTests.length) {
      console.log('No enabled tests discovered');
      return;
    }

    // Create mock results for the reporter
    const mockResults: TestResult[] = enabledTests.map(test => ({
      file: test,
      status: TestStatus.Pending,
      duration: 0,
      output: ''
    }));

    const reporter = new TestReporter(config, invocationDir || options.rootDir);
    reporter.reportDiscoveredTests(mockResults);
  }

  async executeTestSuite(
    rootDir: string,
    patterns: string[],
    config: TestConfig
  ): Promise<TestResult[]> {
    // Discover tests
    const tests = await this.discoverTests({
      rootDir,
      patterns: patterns.length ? patterns : config.patterns?.include || [],
      excludePatterns: config.patterns?.exclude || []
    });

    if (!tests.length) {
      if (!this.isQuietMode(config)) {
        console.log('No tests discovered');
      }
      return [];
    }

    // Create test suite
    const testSuite: TestSuite = {
      tests,
      config,
      rootDir
    };

    // Run tests with elapsed time tracking
    const startTime = Date.now();
    const results = await this.runTests(testSuite);
    const elapsedTime = Date.now() - startTime;

    // Report final results only if not in quiet mode
    if (!this.isQuietMode(config)) {
      // Check if there are any failures or errors
      const hasFailures = results.some(result =>
        result.status === TestStatus.Failed || result.status === TestStatus.Error
      );

      // If there are failures and we're not already in verbose mode, re-report with verbose mode showing only errors
      if (hasFailures && !config.output?.verbose) {
        const verboseConfig = {
          ...config,
          output: {
            ...config.output,
            verbose: true,
            format: "detailed" as const,
            colors: config.output?.colors ?? true,
            errorsOnly: true,
          }
        };
        const verboseReporter = new TestReporter(verboseConfig);
        verboseReporter.reportResults(results, elapsedTime);
      } else {
        const reporter = new TestReporter(config);
        reporter.reportResults(results, elapsedTime);
      }
    }

    return results;
  }

  getExitCode(results: TestResult[]): number {
    const hasFailures = results.some(result =>
      result.status === TestStatus.Failed || result.status === TestStatus.Error
    );

    return hasFailures ? 1 : 0;
  }

  private isQuietMode(config: TestConfig): boolean {
    return config.output?.quiet === true;
  }

  /*
   Finds the most specific config file for a test file
   Walks up from the test file directory looking for testme.json5
   Falls back to global config if no specific config is found
   @param testFile Test file to find config for
   @param globalConfig Fallback global configuration with CLI overrides applied
   @returns Test-specific configuration with CLI overrides preserved
   */
  private async findConfigForTest(testFile: TestFile, globalConfig: TestConfig): Promise<TestConfig> {
    try {
      // Look for config starting from the test file's directory
      const testSpecificConfig = await ConfigManager.findConfig(testFile.directory);

      // If we found a config and it has a configDir, merge with global CLI overrides
      if (testSpecificConfig.configDir) {
        // Preserve CLI overrides from global config
        return {
          ...testSpecificConfig,
          // Preserve execution settings that may have CLI overrides
          execution: {
            timeout: testSpecificConfig.execution?.timeout ?? 30000,
            parallel: testSpecificConfig.execution?.parallel ?? true,
            ...testSpecificConfig.execution,
            // Preserve CLI-specific overrides from global config
            ...(globalConfig.execution?.showCommands && { showCommands: globalConfig.execution.showCommands }),
            ...(globalConfig.execution?.debugMode && { debugMode: globalConfig.execution.debugMode }),
            ...(globalConfig.execution?.keepArtifacts && { keepArtifacts: globalConfig.execution.keepArtifacts }),
            ...(globalConfig.execution?.stepMode && { stepMode: globalConfig.execution.stepMode }),
            ...(globalConfig.execution?.depth !== undefined && { depth: globalConfig.execution.depth }),
            ...(globalConfig.execution?.workers !== undefined && { workers: globalConfig.execution.workers }),
            ...(globalConfig.execution?.iterations !== undefined && { iterations: globalConfig.execution.iterations }),
          },
          // Preserve output settings that may have CLI overrides
          output: {
            verbose: testSpecificConfig.output?.verbose ?? false,
            colors: testSpecificConfig.output?.colors ?? true,
            format: testSpecificConfig.output?.format ?? 'simple',
            quiet: testSpecificConfig.output?.quiet ?? false,
            ...testSpecificConfig.output,
            ...(globalConfig.output?.verbose !== undefined && { verbose: globalConfig.output.verbose }),
            ...(globalConfig.output?.format && { format: globalConfig.output.format }),
            ...(globalConfig.output?.errorsOnly !== undefined && { errorsOnly: globalConfig.output.errorsOnly }),
          },
          // Preserve environment variables from global config (including those from environment script)
          environment: {
            ...testSpecificConfig.environment,
            ...globalConfig.environment
          }
        };
      }
    } catch (error) {
      // If config loading fails, fall back to global config
      console.warn(`Warning: Failed to load config for ${testFile.path}: ${error}`);
    }

    // Fall back to global config
    return globalConfig;
  }

  /*
   Prompts user for input before running the next test in step mode
   @param testFile The test file about to be executed
   @returns Promise that resolves to true if test should be skipped, false to continue
   */
  private async promptForNextTest(testFile: TestFile): Promise<boolean> {
    console.log(`\n📋 About to run: ${testFile.name}`);
    console.log(`   Path: ${testFile.path}`);
    console.log(`   Type: ${testFile.type}`);

    // Use Bun's built-in prompt functionality
    const input = prompt('Press Enter to continue, "s" to skip, or "q" to quit: ');

    if (input === 'q' || input === 'quit') {
      console.log('🛑 Test execution stopped by user');
      process.exit(0);
    } else if (input === 's' || input === 'skip') {
      console.log('⏭️  Skipping test');
      return true; // Skip this test
    }

    console.log('▶️  Running test...');
    return false; // Continue with test
  }

  /*
   Executes a specific set of tests with a given configuration
   @param tests Array of test files to execute
   @param config Configuration to use for execution
   @param invocationDir Directory from which tests were invoked (for relative path display)
   @returns Array of test results
   */
  async executeTestsWithConfig(tests: TestFile[], config: TestConfig, invocationDir?: string): Promise<TestResult[]> {
    // Create a test suite with the given tests
    const testSuite: TestSuite = {
      tests: tests,
      config: config,
      rootDir: tests.length > 0 ? tests[0].directory : ''
    };

    // Create reporter for this configuration
    const reporter = new TestReporter(config, invocationDir);

    // Execute tests
    if (config.execution?.parallel) {
      return await this.runTestsParallel(testSuite, reporter);
    } else {
      return await this.runTestsSequential(testSuite, reporter);
    }
  }

  /*
   Reports final results from all test groups
   @param allResults Combined results from all test executions
   @param config Configuration for output formatting
   @param invocationDir Directory from which tests were invoked (for relative path display)
   */
  reportFinalResults(allResults: TestResult[], config: TestConfig, invocationDir?: string): void {
    // Create reporter for final output
    const reporter = new TestReporter(config, invocationDir);

    // Check if there are any failures or errors
    const hasFailures = allResults.some(result =>
      result.status === TestStatus.Failed || result.status === TestStatus.Error
    );

    // If there are failures and we're not already in verbose mode, re-report with verbose mode showing only errors
    if (hasFailures && !config.output?.verbose) {
      const verboseConfig = {
        ...config,
        output: {
          ...config.output,
          verbose: true,
          format: "detailed" as const,
          colors: config.output?.colors ?? true,
          errorsOnly: true,
        }
      };
      const verboseReporter = new TestReporter(verboseConfig, invocationDir);
      verboseReporter.reportResults(allResults);
    } else {
      reporter.reportResults(allResults);
    }
  }
}