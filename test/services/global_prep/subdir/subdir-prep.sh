#!/bin/bash
# Subdirectory prep script

# Look for marker file - could be in parent dir or multiple levels up
marker_file=""
if [ -f ../.testme/global-prep-ran.txt ]; then
    marker_file="../.testme/global-prep-ran.txt"
elif [ -f ../../.testme/global-prep-ran.txt ]; then
    marker_file="../../.testme/global-prep-ran.txt"
elif [ -f ../../../.testme/global-prep-ran.txt ]; then
    marker_file="../../../.testme/global-prep-ran.txt"
fi

if [ -z "$marker_file" ]; then
    echo "FAIL: Global prep should have run before subdir prep"
    exit 1
fi

echo "Subdir prep completed (found marker at $marker_file)"
exit 0
