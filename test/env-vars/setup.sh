#!/bin/bash
# Test that environment variables are properly exported to setup scripts

echo "Setup: TESTME_VERBOSE=${TESTME_VERBOSE}"
echo "Setup: TESTME_QUIET=${TESTME_QUIET}"
echo "Setup: TESTME_KEEP=${TESTME_KEEP}"
echo "Setup: TESTME_DEPTH=${TESTME_DEPTH}"
echo "Setup: TESTME_ITERATIONS=${TESTME_ITERATIONS}"

# Verify variables are set
if [ -z "$TESTME_VERBOSE" ]; then
    echo "ERROR: TESTME_VERBOSE not set in setup"
    exit 1
fi

# Note: DEPTH and ITERATIONS may not be set if flags weren't used
echo "Setup completed successfully"

# Keep running until killed
sleep 1000
