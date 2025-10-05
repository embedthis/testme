#!/bin/bash

# Simple shell test
echo "Hello from shell test!"

# Test basic arithmetic
result=$((2 + 2))
if [ $result -eq 4 ]; then
    echo "✓ Arithmetic test passed"
    exit 0
else
    echo "✗ Arithmetic test failed"
    exit 1
fi