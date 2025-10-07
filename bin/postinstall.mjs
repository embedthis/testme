#!/usr/bin/env node

import { execSync } from 'child_process';

// Note: This script may not run if Bun was used without --trust flag
// The actual installation happens in install.mjs

try {
    if (process.platform === 'win32') {
        execSync('powershell -ExecutionPolicy Bypass -File bin/install.ps1', { stdio: 'inherit' });
    } else {
        execSync('bun bin/install.mjs', { stdio: 'inherit' });
    }
} catch (error) {
    console.error('\n❌ Installation failed!');

    if (process.versions.bun && !process.env.BUN_INSTALL_TRUSTED) {
        console.error('   If using Bun, you need to use --trust flag:');
        console.error('   bun install -g --trust @embedthis/testme\n');
    } else {
        console.error('   Try running manually:');
        console.error('   cd node_modules/@embedthis/testme && bun bin/install.mjs\n');
    }

    process.exit(1);
}
