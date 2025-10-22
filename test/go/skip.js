#!/usr/bin/env bun
// Skip Go tests if Go is not installed
try {
    const proc = Bun.spawnSync(['go', 'version'])
    if (proc.exitCode !== 0) {
        console.log('Go not installed - skipping Go tests')
        process.exit(1)
    }
} catch (e) {
    console.log('Go not installed - skipping Go tests')
    process.exit(1)
}
process.exit(0)
