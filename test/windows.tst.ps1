# Windows-specific test - should only run on Windows
# test/windows.tst.ps1

Write-Host "Running Windows-specific test..."

# Verify we're on Windows
if ($IsWindows -or $PSVersionTable.PSVersion.Major -le 5) {
    Write-Host "✓ Test running on Windows as expected"
    exit 0
} else {
    Write-Host "✗ ERROR: Windows test running on non-Windows platform!"
    exit 1
}
