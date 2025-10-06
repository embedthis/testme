# GitHub Actions Workflows

This directory contains GitHub Actions workflows for TestMe continuous integration and deployment.

## Workflows

### CI Workflow (ci.yml)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual workflow dispatch

**Jobs:**

1. **Test** - Multi-platform testing
   - Runs on: Ubuntu, macOS, Windows
   - Steps:
     - Checkout code
     - Setup Bun runtime
     - Install dependencies
     - Install C compiler (GCC on Ubuntu, Clang on macOS, MSVC on Windows)
     - Build TestMe binary
     - Verify binary exists and runs
     - Execute full test suite
     - Upload test artifacts on failure (for debugging)

2. **Lint** - Code quality checks
   - Runs on: Ubuntu
   - Steps:
     - Format checking (if format script exists)

3. **Build Packages** - Distribution package creation
   - Runs on: Ubuntu
   - Triggers: Only on push to `main` branch
   - Steps:
     - Build binary
     - Create npm package
     - Upload package artifact (30-day retention)

**Status Badge:**
```markdown
[![CI Status](https://github.com/embedthis/testme/actions/workflows/ci.yml/badge.svg)](https://github.com/embedthis/testme/actions/workflows/ci.yml)
```

### Release Workflow (release.yml)

**Triggers:**
- Push of version tags (e.g., `v1.0.0`)
- Manual workflow dispatch with version input

**Jobs:**

1. **Create Release** - GitHub release creation
   - Steps:
     - Build binary
     - Create npm package
     - Create GitHub release with:
       - Auto-generated release notes
       - Package artifact attachment
       - Version tag

2. **Publish NPM** - Automated npm publishing
   - Triggers: Only on version tag push (not manual dispatch)
   - Requires: `NPM_TOKEN` secret
   - Steps:
     - Build binary
     - Publish to npm registry

## Secrets Required

To use the release workflow, configure these secrets in repository settings:

- `NPM_TOKEN` - NPM authentication token for publishing packages
  - Create at: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
  - Type: Automation token
  - Scope: Read and write

## Usage

### Running CI Manually

You can trigger the CI workflow manually from the GitHub Actions tab:

1. Go to Actions → CI
2. Click "Run workflow"
3. Select branch
4. Click "Run workflow"

### Creating a Release

**Option 1: Tag-based (recommended)**
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

**Option 2: Manual dispatch**
1. Go to Actions → Release
2. Click "Run workflow"
3. Enter version (e.g., `1.0.0`)
4. Click "Run workflow"

## Platform Support

The CI workflow tests on:

- **Ubuntu Latest** - Tests with GCC
- **macOS Latest** - Tests with Clang
- **Windows Latest** - Tests with MSVC (via Visual Studio)

All platforms use the latest stable version of Bun.

## Test Artifacts

When tests fail, artifacts are automatically uploaded:

- **Name:** `test-results-{os}`
- **Path:** `test/.testme/` (build artifacts and logs)
- **Retention:** 7 days

Download artifacts from the workflow run page to debug failures.

## Troubleshooting

### CI Failing on Specific Platform

Check the workflow logs for the specific platform:
1. Go to failed workflow run
2. Click on the failing job (e.g., "Test on windows-latest")
3. Review build and test output
4. Download test artifacts if needed

### Release Not Publishing to NPM

Ensure:
1. `NPM_TOKEN` secret is configured correctly
2. Token has write permissions
3. Package version in `package.json` is unique (not already published)
4. Token hasn't expired

### Badge Not Showing

The badge URL depends on repository location:
- Update `embedthis/testme` in badge URL to match your repo
- Ensure workflow file is named exactly `ci.yml`
- Wait a few minutes after first workflow run
