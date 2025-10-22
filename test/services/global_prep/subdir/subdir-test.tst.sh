#!/bin/bash
# Test in subdirectory

if [ ! -f ../.testme/global-prep-ran.txt ]; then
    echo "FAIL: Global prep marker file not found"
    exit 1
fi

count=$(cat ../.testme/global-prep-count.txt)
if [ "$count" != "1" ]; then
    echo "FAIL: Global prep ran $count times, expected 1"
    exit 1
fi

echo "PASS: Global prep ran once (shared with root)"
exit 0
