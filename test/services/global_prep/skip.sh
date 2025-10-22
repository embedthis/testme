#!/bin/bash
# Skip script - only run this test when invoked from within the global_prep directory

# Get the absolute path of the current directory
current_dir=$(pwd)

# Check if we're running from the global_prep directory
if [[ ! "$current_dir" =~ test/services/global_prep$ ]]; then
    echo "Skipping: This test must be run from test/services/global_prep directory"
    exit 1
fi

# Run the tests
exit 0
