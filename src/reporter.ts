import { TestResult, TestStatus, TestConfig } from './types.ts';
import { relative } from 'path';

export class TestReporter {
  private config: TestConfig;
  private invocationDir: string;

  constructor(config: TestConfig, invocationDir?: string) {
    this.config = config;
    this.invocationDir = invocationDir || process.cwd();
  }

  reportResults(results: TestResult[], elapsedTime?: number): void {
    if (this.config.output?.format === 'json') {
      this.reportJson(results, elapsedTime);
    } else if (this.config.output?.format === 'detailed') {
      this.reportDetailed(results, elapsedTime);
    } else {
      this.reportSimple(results, elapsedTime);
    }
  }

  reportDiscoveredTests(results: TestResult[]): void {
    if (!results.length) {
      console.log('No tests discovered');
      return;
    }

    console.log(`\nDiscovered ${results.length} test(s):`);

    for (const result of results) {
      const typeIcon = this.getTypeIcon(result.file.type);
      const relativePath = this.getRelativePath(result.file.path);
      console.log(`  ${typeIcon}  ${relativePath}`);
    }
  }

  reportProgress(result: TestResult): void {
    const status = this.formatStatus(result.status);
    const duration = this.formatDuration(result.duration);
    const relativePath = this.getRelativePath(result.file.path);
    console.log(`${status} ${relativePath} (${duration})`);
  }

  reportTestsStarting(): void {
    console.log('\nRunning tests...\n');
  }

  reportSummary(results: TestResult[], elapsedTime?: number): void {
    const stats = this.calculateStats(results);

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    if (this.config.output?.colors) {
      console.log(`${this.green('✓ Passed:')} ${stats.passed}`);
      console.log(`${this.red('✗ Failed:')} ${stats.failed}`);
      console.log(`${this.yellow('! Errors:')} ${stats.errors}`);
      console.log(`${this.blue('- Skipped:')} ${stats.skipped}`);
    } else {
      console.log(`Passed:  ${stats.passed}`);
      console.log(`Failed:  ${stats.failed}`);
      console.log(`Errors:  ${stats.errors}`);
      console.log(`Skipped: ${stats.skipped}`);
    }

    console.log(`Total:   ${stats.total}`);
    console.log(`Duration: ${this.formatDuration(stats.totalDuration)}`);
    if (elapsedTime !== undefined) {
      console.log(`Elapsed:  ${this.formatDuration(elapsedTime)}`);
    }

    if (stats.failed > 0 || stats.errors > 0) {
      console.log(`\nResult: ${this.red('FAILED')}`);
    } else {
      console.log(`\nResult: ${this.green('PASSED')}`);
    }

    // Add trailing blank line to separate from user commands (except in quiet mode)
    if (!this.config.output?.quiet) {
      console.log();
    }
  }

  private reportJson(results: TestResult[], elapsedTime?: number): void {
    const resultsToShow = this.config.output?.errorsOnly ? this.getFailingTests(results) : results;

    const output = {
      summary: {
        ...this.calculateStats(results),
        ...(elapsedTime !== undefined && { elapsedTime })
      },
      tests: resultsToShow.map(result => ({
        file: result.file.path,
        type: result.file.type,
        status: result.status,
        duration: result.duration,
        exitCode: result.exitCode,
        error: result.error
      }))
    };

    console.log(JSON.stringify(output, null, 2));

    // Add trailing blank line (JSON mode always has colors disabled, so check manually)
    if (!this.config.output?.quiet) {
      console.log();
    }
  }

  private reportDetailed(results: TestResult[], elapsedTime?: number): void {
    console.log('\nTEST RESULTS');
    console.log('='.repeat(60));

    const resultsToShow = this.config.output?.errorsOnly ? this.getFailingTests(results) : results;

    if (this.config.output?.errorsOnly && resultsToShow.length === 0) {
      console.log('\n✓ No failing tests found!');
    } else {
      for (const result of resultsToShow) {
        this.reportDetailedTest(result);
      }
    }

    this.reportSummary(results, elapsedTime);
  }

  private reportSimple(results: TestResult[], elapsedTime?: number): void {
    // Only show summary - tests are already printed via reportProgress as they run
    this.reportSummary(results, elapsedTime);
  }

  private reportDetailedTest(result: TestResult): void {
    const typeIcon = this.getTypeIcon(result.file.type);
    const status = this.formatStatus(result.status);
    const duration = this.formatDuration(result.duration);
    const relativePath = this.getRelativePath(result.file.path);

    console.log(`\n${typeIcon}  ${relativePath}`);
    console.log(`   Path:     ${relativePath}`);
    console.log(`   Status:   ${status}`);
    console.log(`   Duration: ${duration}`);

    if (result.exitCode !== undefined) {
      console.log(`   Exit Code: ${result.exitCode}`);
    }

    if (result.output) {
      console.log('   Output:');
      const convertedOutput = this.convertPathsToRelative(result.output);
      this.printIndented(convertedOutput, '     ');
    }

    if (result.error) {
      console.log('   Error:');
      const convertedError = this.convertPathsToRelative(result.error);
      this.printIndented(convertedError, '     ');
    }

    // If test failed/errored but has no output or error message, show diagnostic help
    if ((result.status === TestStatus.Failed || result.status === TestStatus.Error) &&
        !result.output && !result.error && result.exitCode !== 0) {
      console.log('   Note:');
      console.log('     Test failed with no output captured.');
      console.log('     This may indicate:');
      console.log('     - Program crashed or encountered an access violation');
      console.log('     - Missing DLL or shared library dependency');
      console.log('     - Segmentation fault or other fatal error');
      console.log('     Try running the test binary directly to see native error messages.');
    }
  }

  private printIndented(text: string, indent: string): void {
    const lines = text.split('\n');
    for (const line of lines) {
      console.log(indent + line);
    }
  }

  private formatStatus(status: TestStatus): string {
    if (!this.config.output?.colors) {
      return status.toUpperCase();
    }

    switch (status) {
      case TestStatus.Passed:
        return this.green('✓ PASS');
      case TestStatus.Failed:
        return this.red('✗ FAIL');
      case TestStatus.Error:
        return this.red('! ERROR');
      case TestStatus.Skipped:
        return this.yellow('- SKIP');
      case TestStatus.Running:
        return this.blue('⟳ RUNNING');
      default:
        return status.toUpperCase();
    }
  }

  private formatDuration(duration: number): string {
    if (duration < 1000) {
      return `${Math.round(duration)}ms`;
    } else {
      return `${(duration / 1000).toFixed(2)}s`;
    }
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'shell':
        return '🐚';
      case 'c':
        return '⚙️';
      case 'javascript':
        return '🟨';
      case 'typescript':
        return '🔷';
      case 'ejscript':
        return '⚡';
      default:
        return '📄';
    }
  }

  private calculateStats(results: TestResult[]) {
    return results.reduce(
      (stats, result) => {
        stats.total++;
        stats.totalDuration += result.duration;

        switch (result.status) {
          case TestStatus.Passed:
            stats.passed++;
            break;
          case TestStatus.Failed:
            stats.failed++;
            break;
          case TestStatus.Error:
            stats.errors++;
            break;
          case TestStatus.Skipped:
            stats.skipped++;
            break;
        }

        return stats;
      },
      {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        skipped: 0,
        totalDuration: 0
      }
    );
  }

  // Color helper methods
  private green(text: string): string {
    return this.config.output?.colors ? `\x1b[32m${text}\x1b[0m` : text;
  }

  private red(text: string): string {
    return this.config.output?.colors ? `\x1b[31m${text}\x1b[0m` : text;
  }

  private yellow(text: string): string {
    return this.config.output?.colors ? `\x1b[33m${text}\x1b[0m` : text;
  }

  private blue(text: string): string {
    return this.config.output?.colors ? `\x1b[34m${text}\x1b[0m` : text;
  }

  private getFailingTests(results: TestResult[]): TestResult[] {
    return results.filter(result =>
      result.status === TestStatus.Failed || result.status === TestStatus.Error
    );
  }

  /*
   Gets the relative path from the invocation directory
   @param absolutePath Absolute path to make relative
   @returns Relative path or just the filename if relative path is too long
   */
  private getRelativePath(absolutePath: string): string {
    const relativePath = relative(this.invocationDir, absolutePath);

    // If the relative path goes up too many levels or is longer than the absolute path,
    // just show the filename
    if (relativePath.startsWith('../../..') || relativePath.length > absolutePath.length) {
      return absolutePath.split('/').pop() || absolutePath;
    }

    return relativePath;
  }

  /*
   Converts absolute paths in text to relative paths
   @param text Text containing potential absolute paths
   @returns Text with absolute paths converted to relative paths
   */
  private convertPathsToRelative(text: string): string {
    // Match absolute paths (starting with / on Unix or drive letter on Windows)
    // Negative lookbehind to avoid matching URLs like http://
    const pathRegex = /(?:^|[\s,(])(?<!\w:)(\/[^\s:,)]+)/g;

    return text.replace(pathRegex, (match, path) => {
      const prefix = match.substring(0, match.length - path.length);
      const relativePath = this.getRelativePath(path);
      return prefix + relativePath;
    });
  }

}