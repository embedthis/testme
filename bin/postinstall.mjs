#!/usr/bin/env node

import { execSync } from 'child_process';

if (process.platform === 'win32') {
    execSync('powershell -ExecutionPolicy Bypass -File bin/install.ps1', { stdio: 'inherit' });
} else {
    execSync('bun bin/install.mjs', { stdio: 'inherit' });
}
