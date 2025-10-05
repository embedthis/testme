# Contributing to TestMe

Thank you for your interest in contributing to TestMe! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

Be respectful, professional, and constructive in all interactions. We're building a tool to help developers, so let's maintain a positive and collaborative environment.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Git
- A C compiler (GCC, Clang, or MSVC) for testing C-related features

### Setup

1. **Fork and clone the repository**
   ```bash
   git fork https://github.com/embedthis/testme
   cd testme
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Build the project**
   ```bash
   make build
   # or
   bun run build
   ```

4. **Run tests**
   ```bash
   make test
   # or
   cd test && tm
   ```

## Development Workflow

### Running in Development

```bash
# Run with hot reload
bun --hot src/index.ts

# Run specific test
bun src/index.ts test/basic.tst.c

# Run with options
bun src/index.ts --verbose --list
```

### Building

```bash
# Development build
make build

# Clean build artifacts
make clean

# Install locally
make install
```

### Project Structure

```
testme/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── cli.ts             # Command-line parsing
│   ├── config.ts          # Configuration management
│   ├── discovery.ts       # Test file discovery
│   ├── runner.ts          # Test execution orchestration
│   ├── reporter.ts        # Output formatting
│   ├── artifacts.ts       # Build artifact management
│   ├── types.ts           # TypeScript type definitions
│   ├── handlers/          # Test type handlers
│   │   ├── base.ts        # Base handler class
│   │   ├── c.ts           # C test handler
│   │   ├── shell.ts       # Shell test handler
│   │   ├── javascript.ts  # JavaScript test handler
│   │   ├── typescript.ts  # TypeScript test handler
│   │   └── ...
│   ├── platform/          # Platform abstraction
│   │   ├── detector.ts    # OS/compiler detection
│   │   ├── compiler.ts    # Compiler management
│   │   └── permissions.ts # File permissions
│   └── utils/             # Utility functions
│       └── glob-expansion.ts # Variable expansion
├── test/                  # Test suite
│   ├── testme.json5       # Test configuration
│   └── portable/          # Portable unit tests
└── doc/                   # Documentation
    ├── DESIGN.md          # Architecture overview
    ├── PLAN.md            # Development roadmap
    └── CHANGELOG.md       # Change history
```

## Coding Standards

### TypeScript Style

- **Indentation**: 4 spaces (configured in `.editorconfig`)
- **Line length**: 120 characters maximum
- **Naming conventions**:
  - `camelCase` for functions and variables
  - `PascalCase` for classes and types
  - `UPPER_CASE` for constants
- **Comments**:
  - Use `//` for single-line comments
  - Use JSDoc `/* */` for multi-line comments
  - Don't prefix each line with `*` in multi-line comments

### Code Quality

- Use TypeScript strict mode
- Prefer `type` over `interface` where possible
- Use type-only imports: `import type { ... }`
- Add JSDoc comments to all public methods
- Keep functions focused and small
- Avoid complex nesting (max 3 levels)

### Example

```typescript
/*
 Executes a test file and returns the result
 @param file Test file to execute
 @param config Test configuration
 @returns Promise resolving to test result
 */
async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
    const { result, duration } = await this.measureExecution(async () => {
        return await this.runCommand(file.path, [], {
            cwd: file.directory,
            timeout: config.execution?.timeout || 30000,
        });
    });

    return this.createTestResult(
        file,
        result.exitCode === 0 ? TestStatus.Passed : TestStatus.Failed,
        duration,
        result.stdout,
        result.stderr
    );
}
```

## Testing Guidelines

### Writing Tests

TestMe uses itself for testing! Tests are located in the `test/` directory.

**Test File Naming:**
- C tests: `*.tst.c`
- Shell tests: `*.tst.sh`
- JavaScript tests: `*.tst.js`
- TypeScript tests: `*.tst.ts`

**Test Structure:**

```c
// test/feature.tst.c
#include "testme.h"

int main() {
    // Test something
    teq(add(2, 3), 5, "Addition works");
    ttrue(add(0, 0) == 0, "Zero identity");

    return 0;  // 0 = success, non-zero = failure
}
```

**Test Organization:**
- Keep tests in `test/portable/` for portable unit tests
- Use subdirectories for feature-specific tests
- Tests must be able to run in parallel
- Use `getpid()` for unique temporary filenames
- Clean up any files created during tests

### Running Tests

```bash
# Run all tests
cd test && tm

# Run specific test
cd test && tm basic.tst.c

# Run with verbose output
cd test && tm -v

# List available tests
cd test && tm --list

# Clean artifacts
cd test && tm --clean
```

### Test Configuration

Tests use `test/testme.json5` for configuration. Keep test-specific configs minimal and inherit from parent where possible.

## Documentation

### Required Documentation

When adding features, update:

1. **README.md** - User-facing features and options
2. **doc/DESIGN.md** - Architecture and implementation details
3. **doc/PLAN.md** - Add to "Recently Completed" and update roadmap
4. **doc/CHANGELOG.md** - Document all changes with date and category
5. **Code comments** - JSDoc for all public APIs

### Documentation Style

- Use clear, concise language
- Include practical examples
- Update all relevant sections
- Keep documentation in sync with code

## Commit Messages

Follow the conventional commit format with prefixes:

- `FIX:` - Bug fixes
- `DEV:` - New features or refactoring
- `CHORE:` - Build, formatting, or infrastructure
- `TEST:` - Test additions or modifications
- `DOC:` - Documentation changes

**Examples:**

```
FIX: Handle missing compiler gracefully
DEV: Add support for Python tests
CHORE: Update dependencies to latest versions
TEST: Add edge case tests for glob expansion
DOC: Update README with new CLI options
```

**Format:**
- Single line describing the change
- Imperative mood ("Add" not "Added")
- No period at the end
- Keep under 72 characters

## Pull Request Process

### Before Submitting

1. **Run tests**: Ensure all tests pass
   ```bash
   make test
   ```

2. **Build successfully**: Verify clean build
   ```bash
   make clean && make build
   ```

3. **Update documentation**: Add/update relevant docs

4. **Follow code style**: Check formatting
   ```bash
   bun run format
   ```

### Submitting a PR

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make focused commits**
   - Keep commits atomic and focused
   - Use proper commit message format
   - Avoid mixing unrelated changes

3. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

4. **PR Description**
   - Clearly describe what and why
   - Link related issues
   - Include examples if applicable
   - List any breaking changes

### PR Template

```markdown
## Description
Brief description of changes

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2

## Testing
How was this tested?

## Documentation
- [ ] Updated README.md
- [ ] Updated DESIGN.md if architecture changed
- [ ] Updated CHANGELOG.md
- [ ] Added/updated code comments

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or documented if required)
```

### Review Process

- Maintainers will review your PR
- Address feedback promptly
- Keep discussions professional
- Be patient - reviews may take time

## Adding New Features

### Adding a New Test Type

If you want to add support for a new language (e.g., Python):

1. **Create handler**: `src/handlers/python.ts`
   ```typescript
   export class PythonTestHandler extends BaseTestHandler {
       canHandle(file: TestFile): boolean {
           return file.type === TestType.Python;
       }

       async execute(file: TestFile, config: TestConfig): Promise<TestResult> {
           // Implementation
       }
   }
   ```

2. **Register handler**: Add to `src/handlers/index.ts`

3. **Update discovery**: Add pattern to `src/discovery.ts`

4. **Add tests**: Create example `.tst.py` tests

5. **Update docs**: Document in README and man page

### Adding CLI Options

1. Update `src/cli.ts` with new option
2. Add to `TestConfig` type in `src/types.ts`
3. Implement feature
4. Update man page
5. Update README

## Getting Help

- **Issues**: Check existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Review DESIGN.md for architecture details

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to TestMe! Your efforts help make testing easier for developers everywhere.
