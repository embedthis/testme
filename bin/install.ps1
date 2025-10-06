# PowerShell wrapper script to run install with either bun or node

$ErrorActionPreference = "Stop"

# Check for bun first
if (Get-Command bun -ErrorAction SilentlyContinue) {
    & bun bin/install.mjs
    exit $LASTEXITCODE
}

# Fall back to node
if (Get-Command node -ErrorAction SilentlyContinue) {
    & node bin/install.mjs
    exit $LASTEXITCODE
}

# Neither found
Write-Error "Error: Either bun or node is required to install testme"
exit 1
