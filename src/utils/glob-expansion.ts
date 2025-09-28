import { glob } from 'glob';

/*
 Expands ${...} references in strings using glob patterns
 Supports expanding ${path/pattern} to matching file paths
 */
export class GlobExpansion {
    /*
     Expands a single string that may contain ${...} references
     @param input String potentially containing ${...} patterns
     @param baseDir Base directory for relative path resolution
     @returns Promise resolving to array of expanded strings
     */
    static async expandString(input: string, baseDir: string = process.cwd()): Promise<string[]> {
        // If no ${...} pattern found, return input as-is
        if (!input.includes('${')) {
            return [input];
        }

        // Find all ${...} patterns in the string
        const patterns = this.extractPatterns(input);
        if (patterns.length === 0) {
            return [input];
        }

        // For simplicity, handle strings with a single ${...} pattern
        // Multiple patterns in one string would require more complex expansion logic
        if (patterns.length === 1) {
            return await this.expandSinglePattern(input, patterns[0], baseDir);
        }

        // For multiple patterns, we'd need to generate all combinations
        // For now, just expand the first pattern found
        return await this.expandSinglePattern(input, patterns[0], baseDir);
    }

    /*
     Expands an array of strings that may contain ${...} references
     @param inputs Array of strings potentially containing ${...} patterns
     @param baseDir Base directory for relative path resolution
     @returns Promise resolving to flattened array of expanded strings
     */
    static async expandArray(inputs: string[], baseDir: string = process.cwd()): Promise<string[]> {
        const results: string[] = [];

        for (const input of inputs) {
            const expanded = await this.expandString(input, baseDir);
            results.push(...expanded);
        }

        return results;
    }

    /*
     Extracts all ${...} patterns from a string
     @param input String to search for patterns
     @returns Array of extracted patterns (without ${} wrapper)
     */
    private static extractPatterns(input: string): string[] {
        const patterns: string[] = [];
        const regex = /\$\{([^}]+)\}/g;
        let match;

        while ((match = regex.exec(input)) !== null) {
            patterns.push(match[1]);
        }

        return patterns;
    }

    /*
     Expands a string containing a single ${...} pattern
     @param input Original string with ${...} pattern
     @param pattern The glob pattern inside ${...}
     @param baseDir Base directory for relative path resolution
     @returns Promise resolving to array of expanded strings
     */
    private static async expandSinglePattern(input: string, pattern: string, baseDir: string): Promise<string[]> {
        try {
            // Use glob to find matching paths
            const matches = await glob(pattern, {
                cwd: baseDir,
                absolute: false,
                nodir: false // Allow directories to match too
            });

            if (matches.length === 0) {
                // If no matches found, return the original string with ${...} removed
                // This allows graceful degradation
                const fallback = input.replace(`\${${pattern}}`, pattern);
                return [fallback];
            }

            // Replace ${pattern} with each match
            return matches.map(match => input.replace(`\${${pattern}}`, match));

        } catch (error) {
            // If glob fails, return original string with ${...} removed
            const fallback = input.replace(`\${${pattern}}`, pattern);
            return [fallback];
        }
    }
}