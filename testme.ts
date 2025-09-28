#!/usr/bin/env bun

import { TestMeApp } from './src/index.ts';

async function main() {
    const app = new TestMeApp();
    const args = process.argv.slice(2);
    const exitCode = await app.run(args);
    process.exit(exitCode);
}

main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});