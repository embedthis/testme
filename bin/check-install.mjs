#!/usr/bin/env node

/**
 * Check if TestMe is properly installed and provide helpful instructions if not
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const homeDir = os.homedir();
const platform = os.platform();
const binaryName = platform === 'win32' ? 'tm.exe' : 'tm';
const binaryPath = path.join(homeDir, '.bun', 'bin', binaryName);

console.log('🔍 Checking TestMe installation...\n');

if (fs.existsSync(binaryPath)) {
    console.log('✅ TestMe is installed correctly!');
    console.log(`   Binary location: ${binaryPath}`);
    console.log('\nYou can now use: tm --version\n');
} else {
    console.log('❌ TestMe binary not found!\n');
    console.log('This usually happens when the postinstall script did not run.');
    console.log('Common causes:\n');

    if (process.versions.bun) {
        console.log('🔧 If using Bun:');
        console.log('   Bun requires --trust flag to run postinstall scripts');
        console.log('   Solution: bun install -g --trust @embedthis/testme\n');
    } else {
        console.log('🔧 If using npm:');
        console.log('   Solution: npm install -g @embedthis/testme\n');
    }

    console.log('📝 Manual installation:');
    console.log('   1. cd node_modules/@embedthis/testme');
    console.log('   2. bun bin/install.mjs\n');

    console.log('💡 For more help, see: https://github.com/embedthis/testme\n');
    process.exit(1);
}
