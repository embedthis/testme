#!/bin/bash
# Global cleanup script - runs once after all test groups

# Check if tests passed via TESTME_SUCCESS env var
if [ "$TESTME_SUCCESS" = "1" ]; then
    echo "Global cleanup completed (all tests passed)"
else
    echo "Global cleanup completed (some tests failed)"
fi

# Remove all marker files
rm -f .testme/global-prep-ran.txt
rm -f .testme/global-prep-count.txt
rm -f .testme/global-cleanup-ran.txt

exit 0
