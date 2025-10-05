# PowerShell test example
# Tests basic PowerShell script execution

Write-Host "Running PowerShell test..."

# Test basic arithmetic
$result = 2 + 2
if ($result -eq 4) {
    Write-Host "✓ Math test passed"
} else {
    Write-Host "✗ Math test failed"
    exit 1
}

# Test environment variable access
if ($env:TESTME_VERBOSE) {
    Write-Host "Verbose mode enabled"
}

Write-Host "✓ All PowerShell tests passed"
exit 0
