# Error Handling Examples

This directory contains **manual tests** that demonstrate error handling in the describe/test API. These tests are **intentionally designed to fail** to show how errors are caught and reported.

## Purpose

These tests serve as:
- **Documentation** - Shows how test failures are displayed
- **Examples** - Demonstrates error message formatting
- **Manual Testing** - Can be run explicitly to verify error handling works correctly

## Important Notes

⚠️ **These tests will fail when run** - this is intentional!

- These tests are marked with `enable: 'manual'` so they don't run automatically in CI/CD
- They will **not** run with `tm` or `tm test/api` commands
- They **must** be explicitly named to run

## Running These Tests

To run the error examples explicitly:

```bash
# Run specific error test
tm test/api/error-examples/describe-error.tst.js

# Or from test directory
cd test
tm api/error-examples/describe-error.tst.js
```

## Expected Behavior

When you run these tests, you should see:
- ✓ Some tests pass (to verify normal operation)
- ✗ Some tests fail (to demonstrate error handling)
- Clear error messages showing what went wrong
- Exit code 1 (failure)

This is **correct behavior** - the tests are designed to fail to demonstrate error handling!
