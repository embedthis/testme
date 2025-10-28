#!/bin/bash
# Test that environment variables are visible in tests

echo "Test: TESTME_VERBOSE=${TESTME_VERBOSE}"
echo "Test: TESTME_QUIET=${TESTME_QUIET}"
echo "Test: TESTME_KEEP=${TESTME_KEEP}"
echo "Test: TESTME_DEPTH=${TESTME_DEPTH}"
echo "Test: TESTME_ITERATIONS=${TESTME_ITERATIONS}"

# Verify TESTME_VERBOSE is set (always set to 0 or 1)
if [ -z "$TESTME_VERBOSE" ]; then
    echo "ERROR: TESTME_VERBOSE not set in test"
    exit 1
fi

echo "Environment variables test passed"
exit 0
