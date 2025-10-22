#!/bin/bash
# Global prep script - runs once before all test groups

mkdir -p .testme
echo "Global prep ran" > .testme/global-prep-ran.txt

if [ -f .testme/global-prep-count.txt ]; then
    count=$(cat .testme/global-prep-count.txt)
    count=$((count + 1))
else
    count=1
fi
echo "$count" > .testme/global-prep-count.txt

echo "Global prep completed"
exit 0
