#!/usr/bin/env node

import { execSync } from 'child_process';
import { rmSync } from 'fs';

// Clean common directories
rmSync('dist', { recursive: true, force: true });
rmSync('.testme', { recursive: true, force: true });

// Platform-specific cleanup
if (process.platform === 'win32') {
    try {
        execSync('if exist dist\\tm.exe del dist\\tm.exe', { stdio: 'inherit' });
        execSync('for /f %i in (\'dir /b /a .*.bun-build 2^>nul\') do del %i', { stdio: 'inherit' });
    } catch (e) {
        // Ignore errors if files don't exist
    }
} else {
    try {
        execSync('rm -f dist/tm', { stdio: 'inherit' });
    } catch (e) {
        // Ignore errors if files don't exist
    }
}
