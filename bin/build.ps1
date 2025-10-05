# PowerShell build script for TestMe on Windows
# Usage: .\build.ps1

param(
    [switch]$Clean,
    [switch]$Install,
    [switch]$Test,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

function Show-Help {
    Write-Host ""
    Write-Host "TestMe Build Script for Windows" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\build.ps1 [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Clean     Clean build artifacts"
    Write-Host "  -Install   Install TestMe to local bin directory"
    Write-Host "  -Test      Run tests"
    Write-Host "  -Help      Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\build.ps1              # Build TestMe"
    Write-Host "  .\build.ps1 -Clean       # Clean and build"
    Write-Host "  .\build.ps1 -Install     # Build and install"
    Write-Host "  .\build.ps1 -Test        # Build and run tests"
    Write-Host ""
}

function Clean-Artifacts {
    Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow

    if (Test-Path "tm.exe") {
        Remove-Item "tm.exe" -Force
        Write-Host "  Removed tm.exe" -ForegroundColor Gray
    }

    Get-ChildItem -Filter ".*.bun-build" -File | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "  Removed $($_.Name)" -ForegroundColor Gray
    }

    Write-Host "✓ Clean complete" -ForegroundColor Green
}

function Build-TestMe {
    Write-Host "Building TestMe..." -ForegroundColor Yellow

    # Check if Bun is installed
    try {
        $bunVersion = bun --version
        Write-Host "  Using Bun version: $bunVersion" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Error: Bun is not installed" -ForegroundColor Red
        Write-Host "  Install Bun from: https://bun.sh" -ForegroundColor Yellow
        exit 1
    }

    # Build the executable
    bun build .\testme.ts --compile --outfile tm

    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Build failed" -ForegroundColor Red
        exit 1
    }

    if (Test-Path "tm.exe") {
        Write-Host "✓ Build complete: tm.exe" -ForegroundColor Green
    } else {
        Write-Host "✗ Build output not found" -ForegroundColor Red
        exit 1
    }
}

function Install-TestMe {
    Write-Host "Installing TestMe..." -ForegroundColor Yellow

    # Determine installation directory
    $installDir = "$env:USERPROFILE\.local\bin"

    # Create installation directory if it doesn't exist
    if (-not (Test-Path $installDir)) {
        New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        Write-Host "  Created directory: $installDir" -ForegroundColor Gray
    }

    # Copy tm.exe
    Copy-Item "tm.exe" -Destination "$installDir\tm.exe" -Force
    Write-Host "  Installed tm.exe to $installDir" -ForegroundColor Gray

    # Copy testme.h header
    $includeDir = "$env:USERPROFILE\.local\include"
    if (-not (Test-Path $includeDir)) {
        New-Item -ItemType Directory -Path $includeDir -Force | Out-Null
    }

    if (Test-Path "test\testme.h") {
        Copy-Item "test\testme.h" -Destination "$includeDir\testme.h" -Force
        Write-Host "  Installed testme.h to $includeDir" -ForegroundColor Gray
    }

    # Check if install directory is in PATH
    if ($env:PATH -notlike "*$installDir*") {
        Write-Host ""
        Write-Host "⚠ Warning: $installDir is not in your PATH" -ForegroundColor Yellow
        Write-Host "  Add it to PATH to use 'tm' from anywhere:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  `$env:PATH += `";$installDir`"" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Or permanently add it via System Properties > Environment Variables" -ForegroundColor Yellow
        Write-Host ""
    }

    Write-Host "✓ Installation complete" -ForegroundColor Green
}

function Run-Tests {
    Write-Host "Running tests..." -ForegroundColor Yellow

    if (-not (Test-Path "tm.exe")) {
        Write-Host "✗ tm.exe not found. Build first." -ForegroundColor Red
        exit 1
    }

    # Run tests
    .\tm.exe test\

    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Tests failed" -ForegroundColor Red
        exit 1
    }

    Write-Host "✓ Tests passed" -ForegroundColor Green
}

# Main script
if ($Help) {
    Show-Help
    exit 0
}

if ($Clean) {
    Clean-Artifacts
}

if (-not $Test -and -not $Install) {
    # Default action: build
    Build-TestMe
}

if ($Install) {
    if (-not (Test-Path "tm.exe")) {
        Build-TestMe
    }
    Install-TestMe
}

if ($Test) {
    if (-not (Test-Path "tm.exe")) {
        Build-TestMe
    }
    Run-Tests
}

Write-Host ""
Write-Host "All done! ✨" -ForegroundColor Green
