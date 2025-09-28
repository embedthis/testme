# tm - Multi-language Test Runner

A powerful, multi-language test runner built with Bun that can discover, compile, and execute tests across different programming languages with configurable patterns and parallel execution.

## 🚀 Features

- **Multi-language Support**: Shell (`.tst.sh`), C (`.tst.c`), JavaScript (`.tst.js`), TypeScript (`.tst.ts`)
- **Automatic Compilation**: C programs are compiled automatically before execution
- **Recursive Discovery**: Finds test files at any depth in directory trees
- **Pattern Matching**: Filter tests using glob patterns
- **Parallel Execution**: Run tests concurrently for better performance
- **Artifact Management**: Organized build artifacts in `.testme` directories
- **Hierarchical Configuration**: `testme.json` files with tree traversal lookup
- **Multiple Output Formats**: Simple, detailed, and JSON reporting
- **Cross-platform**: Works on Windows, macOS, and Linux

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Test File Types](#test-file-types)
- [Usage](#usage)
- [Configuration](#configuration)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Development](#development)
- [Contributing](#contributing)

## 🔧 Installation

### Prerequisites

- [Bun](https://bun.sh) - JavaScript runtime (required)
- GCC or Clang - C compiler (for C tests)

### Local Installation

1. Clone or download the tm project
2. Install dependencies:
   ```bash
   bun install
   ```
3. Build the project:
   ```bash
   bun run build
   ```

## 🚀 Quick Start

1. **Create test files** in your project with the appropriate extensions:
   - `math.tst.c` - C test
   - `utils.tst.js` - JavaScript test
   - `helpers.tst.ts` - TypeScript test
   - `setup.tst.sh` - Shell test

2. **Run all tests**:
   ```bash
   tm
   ```

3. **List discovered tests**:
   ```bash
   tm --list
   ```

4. **Run specific test types**:
   ```bash
   tm "*.tst.c"
   ```

## 📝 Test File Types

### Shell Tests (`.tst.sh`)
Shell script tests that are executed directly. Exit code 0 indicates success.

```bash
#!/bin/bash
# test_example.tst.sh

echo "Running shell test..."
result=$((2 + 2))
if [ $result -eq 4 ]; then
    echo "✓ Math test passed"
    exit 0
else
    echo "✗ Math test failed"
    exit 1
fi
```

### C Tests (`.tst.c`)
C programs that are compiled automatically before execution. Use assertions or exit codes to indicate test results.

```c
// test_math.tst.c
#include <stdio.h>
#include <assert.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    printf("Running C math tests...\\n");

    assert(add(2, 3) == 5);
    printf("✓ Addition test passed\\n");

    return 0;
}
```

### JavaScript Tests (`.tst.js`)
JavaScript tests executed with Bun runtime.

```javascript
// test_array.tst.js
console.log("Running JavaScript tests...");

const arr = [1, 2, 3];
const sum = arr.reduce((a, b) => a + b, 0);

if (sum === 6) {
    console.log("✓ Array sum test passed");
} else {
    console.error("✗ Array sum test failed");
    process.exit(1);
}
```

### TypeScript Tests (`.tst.ts`)
TypeScript tests executed with Bun runtime (includes automatic transpilation).

```typescript
// test_types.tst.ts
console.log("Running TypeScript tests...");

interface User {
    name: string;
    age: number;
}

const user: User = { name: "John", age: 30 };

if (user.name === "John" && user.age === 30) {
    console.log("✓ TypeScript interface test passed");
} else {
    console.error("✗ TypeScript interface test failed");
    process.exit(1);
}
```

## 🎯 Usage

### Command Line Interface

```bash
tm [OPTIONS] [PATTERNS...]
```

### Arguments

- `<PATTERNS>` - Optional glob patterns to filter tests (e.g., `"*.tst.c"`, `"**/math*"`)

### Options

- `-c, --config <FILE>` - Use specific configuration file
- `-l, --list` - List discovered tests without running them
- `-v, --verbose` - Enable verbose output
- `--clean` - Clean all `.testme` artifact directories
- `-h, --help` - Show help message

### Examples

```bash
# Run all tests in current directory tree
tm

# Run only C tests
tm "*.tst.c"

# Run tests with 'math' in their name
tm "**/math*"

# List all discoverable tests
tm --list

# Clean all test artifacts
tm --clean

# Run integration tests with verbose output
tm -v "integration*"

# Use specific configuration file
tm --config ./config/test-config.json
```

## ⚙️ Configuration

### Configuration File (`testme.json`)

testme looks for `testme.json` configuration files starting from the current directory and walking up the directory tree.

```json
{
    "compiler": {
        "c": {
            "compiler": "gcc",
            "flags": ["-std=c99", "-Wall", "-Wextra", "-O2"]
        }
    },
    "execution": {
        "timeout": 30000,
        "parallel": true,
        "workers": 4
    },
    "output": {
        "verbose": false,
        "format": "simple",
        "colors": true
    },
    "patterns": {
        "include": ["**/*.tst.sh", "**/*.tst.c", "**/*.tst.js", "**/*.tst.ts"],
        "exclude": ["**/node_modules/**", "**/.testme/**", "**/.*/**"]
    }
}
```

### Configuration Options

#### Compiler Settings
- `compiler.c.compiler` - C compiler command (default: "gcc")
- `compiler.c.flags` - Compiler flags array (default: ["-std=c99", "-Wall", "-Wextra"])

#### Execution Settings
- `execution.timeout` - Test timeout in milliseconds (default: 30000)
- `execution.parallel` - Enable parallel execution (default: true)
- `execution.workers` - Number of parallel workers (default: 4)

#### Output Settings
- `output.verbose` - Enable verbose output (default: false)
- `output.format` - Output format: "simple", "detailed", "json" (default: "simple")
- `output.colors` - Enable colored output (default: true)

#### Pattern Settings
- `patterns.include` - Array of include patterns (default: all test types)
- `patterns.exclude` - Array of exclude patterns (default: node_modules, .testme, hidden dirs)

## 📁 Artifact Management

tm automatically creates `.testme` directories alongside test files to store:

- **C compilation artifacts** (object files, binaries)
- **Build logs** and error output
- **Temporary files** generated during test execution

### Artifact Directory Structure
```
project/
├── tests/
│   ├── math.tst.c
│   ├── .testme/           # Artifact directory
│   │   ├── math           # Compiled binary
│   │   └── compile.log    # Compilation log
│   └── utils.tst.js
```

### Cleaning Artifacts

Remove all artifact directories:
```bash
tm --clean
```

## 🔍 Output Formats

### Simple Format (Default)
```
🧪 Test runner starting in: /path/to/project

Running tests...

✓ PASS string.tst.ts (11ms)
✓ PASS array.tst.js (10ms)
✓ PASS hello.tst.sh (4ms)
✓ PASS math.tst.c (204ms)

============================================================
TEST SUMMARY
============================================================
✓ Passed: 4
✗ Failed: 0
! Errors: 0
- Skipped: 0
Total: 4
Duration: 229ms

Result: PASSED
```

### Detailed Format
Shows full output from each test including compilation details for C tests.

### JSON Format
Machine-readable output for integration with other tools:
```json
{
    "summary": {
        "total": 4,
        "passed": 4,
        "failed": 0,
        "errors": 0,
        "skipped": 0,
        "totalDuration": 229
    },
    "tests": [
        {
            "file": "/path/to/test.tst.js",
            "type": "javascript",
            "status": "passed",
            "duration": 10,
            "exitCode": 0
        }
    ]
}
```

## 🏗️ Architecture

### Core Components

- **TestDiscovery** - Recursively finds test files using glob patterns
- **ConfigManager** - Loads and merges configuration files with defaults
- **TestRunner** - Orchestrates test execution with parallel support
- **TestHandlers** - Language-specific execution engines:
  - `ShellTestHandler` - Executes shell scripts
  - `CTestHandler` - Compiles and runs C programs
  - `JavaScriptTestHandler` - Runs JavaScript with Bun
  - `TypeScriptTestHandler` - Runs TypeScript with Bun
- **ArtifactManager** - Manages build artifacts and cleanup
- **TestReporter** - Formats and displays test results

### Project Structure
```
src/
├── index.ts              # Main entry point and CLI
├── types.ts              # TypeScript type definitions
├── config.ts             # Configuration management
├── discovery.ts          # Test file discovery
├── runner.ts             # Test execution orchestration
├── reporter.ts           # Result reporting and formatting
├── cli.ts                # Command-line interface
├── artifacts.ts          # Artifact management
└── handlers/             # Language-specific handlers
    ├── base.ts           # Abstract base handler
    ├── shell.ts          # Shell script handler
    ├── c.ts              # C program handler
    ├── javascript.ts     # JavaScript handler
    ├── typescript.ts     # TypeScript handler
    └── index.ts          # Handler factory
```

## 🧪 Development

### Building
```bash
bun run build
```

### Running Tests
```bash
bun test
```

### Development Mode
```bash
bun --hot src/index.ts
```

### Code Style
- 4-space indentation
- TypeScript with strict mode
- ESLint and Prettier configured
- Comprehensive JSDoc comments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the coding standards
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage
- Update documentation for new features
- Use descriptive commit messages
- Ensure cross-platform compatibility

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Issue Tracker](https://github.com/your-org/testme/issues)

## 💡 Tips and Best Practices

### Writing Effective Tests

1. **Use descriptive names**: `user_authentication.tst.ts` vs `test1.tst.ts`
2. **Keep tests focused**: One concept per test file
3. **Use appropriate assertions**: Exit with code 0 for success, non-zero for failure
4. **Include setup/cleanup**: Initialize test data, clean up afterward
5. **Document test purpose**: Add comments explaining what each test validates

### Performance Optimization

- Use parallel execution for independent tests
- Keep C compilation flags optimized but informative
- Consider test ordering (quick tests first)
- Clean artifacts regularly to save disk space

### Troubleshooting

**Tests not discovered?**
- Check file extensions match `.tst.sh`, `.tst.c`, `.tst.js`, `.tst.ts`
- Verify files aren't in excluded directories
- Use `--list` to see what tm finds

**C compilation failing?**
- Ensure GCC or Clang is installed and in PATH
- Check compiler flags in configuration
- Review compilation logs in `.testme/compile.log`

**Permission errors?**
- Make sure shell scripts are executable (`chmod +x`)
- Check directory permissions
- Verify artifact directories can be created