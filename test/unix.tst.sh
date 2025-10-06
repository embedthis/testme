#!/bin/sh
# Unix-specific test - should only run on macOS and Linux
# test/unix.tst.sh

echo "Running Unix-specific test..."

# Verify we're on Unix (macOS or Linux)
case "$(uname -s)" in
    Darwin|Linux)
        echo "✓ Test running on Unix ($(uname -s)) as expected"
        exit 0
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo "✗ ERROR: Unix test running on Windows platform!"
        exit 1
        ;;
    *)
        echo "✗ ERROR: Unix test running on unknown platform: $(uname -s)"
        exit 1
        ;;
esac
