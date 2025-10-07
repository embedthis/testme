#!/usr/bin/env bun

import { TestMeApp } from './src/index.ts';

async function main() {
    // Bun compiled binaries change cwd to the embedded source directory
    // Check if TM_INVOCATION_DIR was set by wrapper script
    const invocationDir = process.env.TM_INVOCATION_DIR;
    if (invocationDir) {
        try {
            process.chdir(invocationDir);
        } catch (error) {
            console.error(`Failed to change to invocation directory ${invocationDir}: ${error}`);
            process.exit(1);
        }
    }

    const app = new TestMeApp();
    const args = process.argv.slice(2);
    const exitCode = await app.run(args);
    process.exit(exitCode);
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});