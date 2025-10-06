#!/bin/sh
#
#   Skip script for Ejscript tests
#   Exit 0 to run tests, non-zero to skip
#

if ! command -v ejsc >/dev/null 2>&1; then
    echo "Ejscript compiler 'ejsc' not found - skipping Ejscript tests"
    exit 1
fi

exit 0
