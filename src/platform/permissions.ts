import { PlatformDetector } from "./detector.ts";
import { chmod } from "node:fs/promises";
import { extname } from "path";

/*
 Cross-platform file permission and executable handling
 */
export class PermissionManager {
    /*
     Makes a file executable using platform-appropriate method
     @param filePath Path to file to make executable
     @returns Promise that resolves when operation completes
     */
    static async makeExecutable(filePath: string): Promise<void> {
        if (PlatformDetector.isWindows()) {
            // On Windows, executability is determined by file extension
            // No chmod needed - files with .exe, .bat, .cmd, .ps1 are executable
            return;
        } else {
            // On Unix, set executable permission
            try {
                await chmod(filePath, 0o755);
            } catch (error) {
                throw new Error(`Failed to make file executable: ${error}`);
            }
        }
    }

    /*
     Checks if a file is executable
     @param filePath Path to file to check
     @returns Promise resolving to true if file is executable
     */
    static async isExecutable(filePath: string): Promise<boolean> {
        if (PlatformDetector.isWindows()) {
            // On Windows, check file extension
            return this.isExecutableExtension(filePath);
        } else {
            // On Unix, check executable permission
            try {
                const file = Bun.file(filePath);
                const exists = await file.exists();
                if (!exists) {
                    return false;
                }

                // Use stat to check permissions
                const proc = Bun.spawn(["test", "-x", filePath], {
                    stdout: "pipe",
                    stderr: "pipe"
                });

                const result = await proc.exited;
                return result === 0;
            } catch {
                return false;
            }
        }
    }

    /*
     Checks if a file has an executable extension (Windows)
     @param filePath Path to file to check
     @returns true if file extension indicates executable
     */
    private static isExecutableExtension(filePath: string): boolean {
        const ext = extname(filePath).toLowerCase();
        const executableExtensions = [
            ".exe", ".bat", ".cmd", ".ps1",
            ".com", ".vbs", ".wsf", ".msi"
        ];

        return executableExtensions.includes(ext);
    }

    /*
     Gets the appropriate binary extension for the platform
     @returns Binary extension (e.g., '.exe' on Windows, '' on Unix)
     */
    static getBinaryExtension(): string {
        return PlatformDetector.isWindows() ? ".exe" : "";
    }

    /*
     Adds the appropriate binary extension to a filename if needed
     @param filename Base filename
     @returns Filename with platform-appropriate extension
     */
    static addBinaryExtension(filename: string): string {
        const ext = this.getBinaryExtension();
        if (ext && !filename.endsWith(ext)) {
            return filename + ext;
        }
        return filename;
    }

    /*
     Checks if a script file needs a shebang (Unix) or is self-executable (Windows)
     @param filePath Path to script file
     @returns true if file can be executed directly
     */
    static async canExecuteDirectly(filePath: string): Promise<boolean> {
        if (PlatformDetector.isWindows()) {
            // On Windows, check if it has an executable extension
            return this.isExecutableExtension(filePath);
        } else {
            // On Unix, check if it has a shebang and is executable
            try {
                const file = Bun.file(filePath);
                const content = await file.text();
                const hasShebang = content.startsWith("#!");
                const isExec = await this.isExecutable(filePath);

                return hasShebang && isExec;
            } catch {
                return false;
            }
        }
    }
}
