#!/bin/bash
# Test that environment variables are properly exported to cleanup scripts

echo "Cleanup: TESTME_VERBOSE=${TESTME_VERBOSE}"
echo "Cleanup: TESTME_QUIET=${TESTME_QUIET}"
echo "Cleanup: TESTME_KEEP=${TESTME_KEEP}"
echo "Cleanup: TESTME_DEPTH=${TESTME_DEPTH}"
echo "Cleanup: TESTME_ITERATIONS=${TESTME_ITERATIONS}"
echo "Cleanup: TESTME_SUCCESS=${TESTME_SUCCESS}"

# Verify variables are set
if [ -z "$TESTME_VERBOSE" ]; then
    echo "ERROR: TESTME_VERBOSE not set in cleanup"
    exit 1
fi

if [ -z "$TESTME_SUCCESS" ]; then
    echo "ERROR: TESTME_SUCCESS not set in cleanup"
    exit 1
fi

echo "Cleanup completed successfully"
