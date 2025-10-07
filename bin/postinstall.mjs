#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log that postinstall is running (helps debug if it was skipped)
console.log('[testme] Running postinstall script...');

try {
    if (process.platform === 'win32') {
        execSync('powershell -ExecutionPolicy Bypass -File bin/install.ps1', { stdio: 'inherit' });
    } else {
        execSync('bun bin/install.mjs', { stdio: 'inherit' });
    }

    // Create marker file to indicate successful installation
    const markerPath = path.join(__dirname, '..', '.installed');
    fs.writeFileSync(markerPath, new Date().toISOString());
    console.log('[testme] ✅ Installation completed successfully');

} catch (error) {
    console.error('\n❌ TestMe installation FAILED!\n');

    if (process.versions.bun) {
        console.error('   If using Bun, you MUST use --trust flag:');
        console.error('   \x1b[1mbun install -g --trust @embedthis/testme\x1b[0m\n');
        console.error('   Without --trust, postinstall scripts are skipped and tm binary won\'t be built.\n');
    } else {
        console.error('   Try running manually:');
        console.error('   cd node_modules/@embedthis/testme && bun bin/install.mjs\n');
    }

    // Exit with error to fail the installation
    process.exit(1);
}
