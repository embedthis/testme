/*
 TTY (TeleTYpewriter) utilities for terminal interaction
 Provides functions to detect interactive terminals and control cursor/line output
 */

/*
 Checks if the output is an interactive terminal (TTY)
 @returns true if stdout is a TTY, false otherwise
 */
export function isInteractiveTTY(): boolean {
    // First check process.stdout.isTTY (works in Node.js)
    if (typeof process !== 'undefined' && process.stdout && process.stdout.isTTY === true) {
        return true
    }

    // In Bun compiled binaries, isTTY may be undefined
    // Check if TERM environment variable is set (indicates terminal)
    // and CI is not set (not running in CI environment)
    if (process.env.TERM && process.env.TERM !== 'dumb' && !process.env.CI) {
        return true
    }

    // Default to false for safety (file redirection, pipes, etc.)
    return false
}

/*
 Checks if ANSI escape codes are supported
 On Windows, older terminals (cmd.exe, some PowerShell versions) may not support ANSI
 @returns true if ANSI codes should work
 */
export function supportsANSI(): boolean {
    // Not a TTY? No ANSI support
    if (!isInteractiveTTY()) {
        return false
    }

    // Windows detection - check for Windows Terminal, VS Code, or modern PowerShell
    if (process.platform === 'win32') {
        // Windows Terminal, VS Code terminal, and modern shells set WT_SESSION or TERM_PROGRAM
        if (process.env.WT_SESSION || process.env.TERM_PROGRAM) {
            return true
        }
        // ConEmu sets this
        if (process.env.ConEmuANSI === 'ON') {
            return true
        }
        // If TERM is set on Windows, assume ANSI support (e.g., Git Bash, WSL)
        if (process.env.TERM && process.env.TERM !== 'dumb') {
            return true
        }
        // Default to no ANSI on Windows (older cmd.exe/PowerShell)
        return false
    }

    // Unix-like systems generally support ANSI
    return true
}

/*
 ANSI escape codes for terminal control
 */
export const ANSI = {
    // Clear the current line
    clearLine: '\x1b[2K',

    // Move cursor to beginning of line
    cursorToStart: '\r',

    // Clear line and move cursor to start (combined operation)
    clearLineAndReset: '\x1b[2K\r',

    // Hide cursor
    hideCursor: '\x1b[?25l',

    // Show cursor
    showCursor: '\x1b[?25h',
}

/*
 Writes text that can be overwritten on the next write
 Used for showing progress/status that updates in place
 @param text Text to write
 */
export function writeOverwritable(text: string): void {
    if (isInteractiveTTY() && supportsANSI()) {
        Bun.write(Bun.stdout, ANSI.clearLineAndReset + text)
    } else if (isInteractiveTTY()) {
        // Fallback for terminals without ANSI: just write normally with newline
        console.log(text)
    }
}

/*
 Clears the current line and moves cursor to start
 Windows terminals sometimes don't process ANSI codes correctly,
 so we check for ANSI support first
 */
export function clearCurrentLine(): void {
    if (isInteractiveTTY() && supportsANSI()) {
        Bun.write(Bun.stdout, ANSI.clearLineAndReset)
    } else if (isInteractiveTTY()) {
        // Fallback for non-ANSI terminals: just move to new line
        process.stdout.write('\n')
    }
}

/*
 Writes text and moves to a new line (standard output)
 @param text Text to write
 */
export function writeLine(text: string): void {
    console.log(text)
}
