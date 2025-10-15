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
        return true;
    }

    // In Bun compiled binaries, isTTY may be undefined
    // Check if TERM environment variable is set (indicates terminal)
    // and CI is not set (not running in CI environment)
    if (process.env.TERM && process.env.TERM !== 'dumb' && !process.env.CI) {
        return true;
    }

    // Default to false for safety (file redirection, pipes, etc.)
    return false;
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
};

/*
 Writes text that can be overwritten on the next write
 Used for showing progress/status that updates in place
 @param text Text to write
 */
export function writeOverwritable(text: string): void {
    if (isInteractiveTTY()) {
        Bun.write(Bun.stdout, ANSI.clearLineAndReset + text);
    }
}

/*
 Clears the current line and moves cursor to start
 */
export function clearCurrentLine(): void {
    if (isInteractiveTTY()) {
        Bun.write(Bun.stdout, ANSI.clearLineAndReset);
    }
}

/*
 Writes text and moves to a new line (standard output)
 @param text Text to write
 */
export function writeLine(text: string): void {
    console.log(text);
}
