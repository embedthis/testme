#!/bin/bash
#
# Skip Windows-specific tests if not running on Windows
#

if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Running on Windows - run the tests
    exit 0
fi

# Not on Windows - skip these tests
echo "Skipping Windows-specific tests (not running on Windows)"
exit 1
