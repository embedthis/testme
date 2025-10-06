#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function updateVersion() {
    try {
        // Read package.json
        const packageJsonPath = join(__dirname, '../package.json');
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
        const version = packageJson.version;

        // Update src/version.ts
        const versionFilePath = join(__dirname, '../src/version.ts');
        const versionFileContent = `/*
    Version information - auto-generated from package.json
 */

// This will be replaced at build time with the actual version from package.json
export const VERSION = "${version}";
`;

        await writeFile(versionFilePath, versionFileContent, 'utf-8');
        console.log(`✓ Updated version to ${version}`);
    } catch (error) {
        console.error('Failed to update version:', error);
        process.exit(1);
    }
}

updateVersion();
