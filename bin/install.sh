#!/bin/sh

# Wrapper script to run install with either bun or node

if command -v bun >/dev/null 2>&1; then
    exec bun bin/install.mjs
elif command -v node >/dev/null 2>&1; then
    exec node bin/install.mjs
else
    echo "Error: Either bun or node is required to install testme"
    exit 1
fi
