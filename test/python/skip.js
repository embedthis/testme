#!/usr/bin/env bun
// Skip Python tests if Python is not installed
let pythonFound = false;

try {
    const proc = Bun.spawnSync(['python3', '--version']);
    if (proc.exitCode === 0) {
        pythonFound = true;
    }
} catch (e) {
    // Try python command
}

if (!pythonFound) {
    try {
        const proc = Bun.spawnSync(['python', '--version']);
        if (proc.exitCode === 0) {
            pythonFound = true;
        }
    } catch (e) {
        // Python not found
    }
}

if (!pythonFound) {
    console.log('Python not installed - skipping Python tests');
    process.exit(1);
}

process.exit(0);