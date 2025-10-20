/**
 * Path - File path manipulation and operations
 *
 * Paths represent files in a file system. The file may or may not exist.
 * Once created, Paths are immutable and their path value cannot be changed.
 * @spec ejs
 * @stability evolving
 */
import * as path from 'path';
import * as fs from 'fs';
import { statSync } from 'fs';
export class Path {
    _path;
    /**
     * Create a new Path object
     * @param pathString Path string (default: current directory)
     */
    constructor(pathString = '.') {
        this._path = pathString;
    }
    /**
     * Get the path string value
     */
    get name() {
        return this._path;
    }
    /**
     * Get an absolute path equivalent
     * The path is normalized and uses the native system directory separator
     */
    get absolute() {
        return new Path(path.resolve(this._path));
    }
    /**
     * When the file was last accessed
     * Returns null if the file does not exist
     */
    get accessed() {
        try {
            const stats = statSync(this._path);
            return stats.atime;
        }
        catch {
            return null;
        }
    }
    /**
     * File security attributes
     * @returns Object with user, group, uid, gid, permissions
     */
    get attributes() {
        try {
            const stats = statSync(this._path);
            return {
                uid: stats.uid,
                gid: stats.gid,
                permissions: stats.mode & 0o777
            };
        }
        catch {
            return {};
        }
    }
    /**
     * Set file security attributes
     * @param attributes Object with optional user, group, uid, gid, permissions
     */
    setAttributes(attributes) {
        if (attributes.permissions !== undefined) {
            fs.chmodSync(this._path, attributes.permissions);
        }
        if (attributes.uid !== undefined || attributes.gid !== undefined) {
            const uid = attributes.uid ?? statSync(this._path).uid;
            const gid = attributes.gid ?? statSync(this._path).gid;
            fs.chownSync(this._path, uid, gid);
        }
    }
    /**
     * The base portion of the path (trailing portion without directory)
     */
    get basename() {
        return new Path(path.basename(this._path));
    }
    /**
     * Test if this path is a child of a given directory
     * @param dir Parent directory to test
     * @returns True if this path is a child of dir
     */
    childOf(dir) {
        return this.absolute.name.startsWith(dir.absolute.name);
    }
    /**
     * Path components array
     * The path is normalized and broken into components for each directory level
     */
    get components() {
        const normalized = path.normalize(this._path);
        const parts = normalized.split(path.sep).filter(p => p !== '');
        // Handle absolute paths - preserve root
        if (path.isAbsolute(this._path)) {
            if (process.platform === 'win32') {
                // Windows: first component includes drive letter
                return parts;
            }
            else {
                // Unix: prepend empty string for root
                return ['', ...parts];
            }
        }
        return parts;
    }
    /**
     * Test if the path contains a substring
     * @param pattern String pattern to search for (in portable format)
     * @returns True if found
     */
    contains(pattern) {
        return this.portable.name.includes(pattern);
    }
    /**
     * Copy a file to the destination
     * @param destination New file location
     * @param options Options object (permissions, user, group)
     */
    copy(destination, options) {
        const dest = destination instanceof Path ? destination.name : destination;
        // If destination ends with separator or is a directory, append basename
        if (dest.endsWith(path.sep) || (fs.existsSync(dest) && statSync(dest).isDirectory())) {
            const fullDest = path.join(dest, this.basename.name);
            fs.copyFileSync(this._path, fullDest);
            if (options) {
                new Path(fullDest).setAttributes(options);
            }
        }
        else {
            fs.copyFileSync(this._path, dest);
            if (options) {
                new Path(dest).setAttributes(options);
            }
        }
    }
    /**
     * When the file was created
     * Returns null if the file does not exist
     */
    get created() {
        try {
            const stats = statSync(this._path);
            return stats.birthtime;
        }
        catch {
            return null;
        }
    }
    /**
     * The directory portion of the path
     * Includes all directory elements, excluding the base name
     */
    get dirname() {
        return new Path(path.dirname(this._path));
    }
    /**
     * Test if the path ends with the given suffix
     * @param suffix String suffix to compare
     * @returns True if the path ends with suffix
     */
    endsWith(suffix) {
        return this.portable.name.endsWith(new Path(suffix).portable.name);
    }
    /**
     * Check if the file exists
     */
    get exists() {
        try {
            fs.accessSync(this._path, fs.constants.F_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * File extension portion of the path
     * Returns the portion after (and not including) the last '.'
     */
    get extension() {
        const ext = path.extname(this._path);
        return ext.startsWith('.') ? ext.substring(1) : ext;
    }
    /**
     * Find a file above the current directory
     * @param name File or directory name to find
     * @returns Path to found file, or null if not found
     */
    findAbove(name) {
        let dir = this.isDir ? this : this.dirname;
        while (true) {
            const candidate = dir.join(name);
            if (candidate.exists) {
                return candidate;
            }
            const parent = dir.parent;
            if (parent.name === dir.name) {
                // Reached root
                break;
            }
            dir = parent;
        }
        return null;
    }
    /**
     * Get a list of matching files using glob patterns
     * @param patterns Pattern or array of patterns
     * @param options Options for file matching
     * @returns Array of matching paths
     */
    files(patterns, options) {
        // This is a complex method - implementing basic version
        // Full implementation would include glob matching, exclusions, etc.
        if (!patterns) {
            patterns = '**';
        }
        if (typeof patterns === 'string') {
            patterns = [patterns];
        }
        const results = [];
        // Simple recursive directory traversal for now
        if (this.isDir) {
            this._filesRecursive(this._path, results, options);
        }
        return results;
    }
    _filesRecursive(dir, results, options) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                // Skip hidden files unless options.hidden is true
                if (!options?.hidden && entry.name.startsWith('.')) {
                    continue;
                }
                results.push(new Path(fullPath));
                if (entry.isDirectory()) {
                    this._filesRecursive(fullPath, results, options);
                }
            }
        }
        catch {
            // Ignore permission errors
        }
    }
    /**
     * Check if path has a drive spec (Windows)
     */
    get hasDrive() {
        return process.platform === 'win32' && /^[a-zA-Z]:/.test(this._path);
    }
    /**
     * Check if the path is absolute
     */
    get isAbsolute() {
        return path.isAbsolute(this._path);
    }
    /**
     * Check if the path is a directory
     */
    get isDir() {
        try {
            return statSync(this._path).isDirectory();
        }
        catch {
            return false;
        }
    }
    /**
     * Check if the path is a symbolic link
     */
    get isLink() {
        try {
            return fs.lstatSync(this._path).isSymbolicLink();
        }
        catch {
            return false;
        }
    }
    /**
     * Check if the path is a regular file
     */
    get isRegular() {
        try {
            return statSync(this._path).isFile();
        }
        catch {
            return false;
        }
    }
    /**
     * Check if the path is relative
     */
    get isRelative() {
        return !this.isAbsolute;
    }
    /**
     * Join paths together
     * @param ...other Path segments to join
     * @returns New joined, normalized Path
     */
    join(...other) {
        const parts = other.map(p => p instanceof Path ? p.name : p);
        return new Path(path.join(this._path, ...parts));
    }
    /**
     * Join an extension to a path
     * @param ext Extension to add
     * @param force Always add extension even if one exists
     * @returns New Path with extension
     */
    joinExt(ext, force = false) {
        if (!force && this.extension) {
            return this;
        }
        const extWithDot = ext.startsWith('.') ? ext : '.' + ext;
        return new Path(this._path + extWithDot);
    }
    /**
     * Length of the path name in bytes
     */
    get length() {
        return this._path.length;
    }
    /**
     * Create a link to refer to this path
     * @param target Target path where link will be created
     * @param hard Create a hard link instead of symbolic
     */
    link(target, hard = false) {
        const targetPath = target instanceof Path ? target.name : target;
        if (hard) {
            fs.linkSync(this._path, targetPath);
        }
        else {
            fs.symlinkSync(this._path, targetPath);
        }
    }
    /**
     * Get symbolic link target
     * Returns null if not a symbolic link
     */
    get linkTarget() {
        try {
            if (this.isLink) {
                return new Path(fs.readlinkSync(this._path));
            }
        }
        catch {
        }
        return null;
    }
    /**
     * Create directory and all required intervening directories
     * @param options Options (permissions, user, group)
     * @returns True if successful or already exists
     */
    makeDir(options) {
        try {
            const mode = options?.permissions ?? 0o755;
            fs.mkdirSync(this._path, { recursive: true, mode });
            if (options?.user || options?.group) {
                this.setAttributes(options);
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Create a temporary file
     * @returns New Path for the temp file
     */
    temp() {
        const tmpDir = this._path || require('os').tmpdir();
        const tmpName = `tmp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return new Path(path.join(tmpDir, tmpName));
    }
    /**
     * Map path directory separator
     * @param sep Separator to use
     * @returns New Path with mapped separators
     */
    map(sep = path.sep) {
        return new Path(this._path.replace(/[\/\\]/g, sep));
    }
    /**
     * Match the path to a regular expression
     * @param pattern Regular expression pattern
     * @returns Array of matching substrings
     */
    match(pattern) {
        return this.toString().match(pattern);
    }
    /**
     * Get MIME type for the path's extension
     */
    get mimeType() {
        // Basic MIME type mapping
        const ext = this.extension.toLowerCase();
        const mimeTypes = {
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'txt': 'text/plain',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'zip': 'application/zip',
            'gz': 'application/gzip'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    /**
     * When the file was last modified
     */
    get modified() {
        try {
            return statSync(this._path).mtime;
        }
        catch {
            return null;
        }
    }
    /**
     * Normalized representation of the path
     */
    get normalize() {
        return new Path(path.normalize(this._path));
    }
    /**
     * Natural (native) representation for the platform
     */
    get natural() {
        return new Path(path.normalize(this._path));
    }
    /**
     * Parent directory of the path
     */
    get parent() {
        const parentPath = path.dirname(this._path);
        return new Path(parentPath);
    }
    /**
     * File permissions (Posix style)
     */
    get perms() {
        try {
            const stats = statSync(this._path);
            return stats.mode & 0o777;
        }
        catch {
            return null;
        }
    }
    set perms(perms) {
        fs.chmodSync(this._path, perms);
    }
    /**
     * Portable (Unix-style) representation with '/' separators
     */
    get portable() {
        return new Path(this._path.replace(/\\/g, '/'));
    }
    /**
     * Path relative to current working directory
     */
    get relative() {
        return new Path(path.relative(process.cwd(), this._path));
    }
    /**
     * Get path relative to an origin
     * @param origin Origin path (defaults to current directory)
     * @returns Relative path from origin to this path
     */
    relativeTo(origin) {
        const originPath = origin ? (origin instanceof Path ? origin.name : origin) : process.cwd();
        return new Path(path.relative(originPath, this._path));
    }
    /**
     * Remove the file or empty directory
     * @returns True if successful or doesn't exist
     */
    remove() {
        try {
            if (!this.exists) {
                return true;
            }
            if (this.isDir) {
                fs.rmdirSync(this._path);
            }
            else {
                fs.unlinkSync(this._path);
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Remove directory and all its contents recursively
     * @returns True if successful
     */
    removeAll() {
        try {
            if (!this.exists) {
                return true;
            }
            if (this.name === '' || this.name === '/') {
                throw new Error('Cannot removeAll on root directory');
            }
            fs.rmSync(this._path, { recursive: true, force: true });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Rename/move the file
     * @param target New path
     */
    rename(target) {
        const targetPath = target instanceof Path ? target.name : target;
        // Remove target if it exists
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }
        fs.renameSync(this._path, targetPath);
    }
    /**
     * Replace the file extension
     * @param ext New extension
     * @returns New Path with replaced extension
     */
    replaceExt(ext) {
        if (ext && !ext.startsWith('.')) {
            ext = '.' + ext;
        }
        return new Path(this.trimExt().name + ext);
    }
    /**
     * Search and replace in path
     * @param pattern Pattern to search for (string or RegExp)
     * @param replacement Replacement string or function
     * @returns New Path with replacements
     */
    replace(pattern, replacement) {
        return new Path(this.name.replace(pattern, replacement));
    }
    /**
     * Resolve paths in the neighborhood of this path
     * @param ...otherPaths Paths to resolve
     * @returns Resolved path
     */
    resolve(...otherPaths) {
        const parts = otherPaths.map(p => p instanceof Path ? p.name : p);
        return new Path(path.resolve(this.dirname.name, ...parts));
    }
    /**
     * Root directory component of the path
     */
    get root() {
        const parsed = path.parse(this._path);
        return new Path(parsed.root || '/');
    }
    /**
     * Compare two paths to test if they represent the same file
     * @param other Other path to compare
     * @returns True if paths represent the same file
     */
    same(other) {
        const otherPath = other instanceof Path ? other : new Path(other);
        return this.absolute.name === otherPath.absolute.name;
    }
    /**
     * Path separator for this path
     */
    get separator() {
        return this._path.includes('\\') ? '\\' : '/';
    }
    /**
     * File size in bytes
     */
    get size() {
        try {
            return statSync(this._path).size;
        }
        catch {
            return -1;
        }
    }
    /**
     * Test if path starts with the given prefix
     * @param prefix String prefix to compare
     * @returns True if path starts with prefix
     */
    startsWith(prefix) {
        return this.portable.name.startsWith(new Path(prefix).portable.name);
    }
    /**
     * Convert to JSON string
     */
    toJSON() {
        return JSON.stringify(this._path);
    }
    /**
     * Convert to lowercase
     */
    toLowerCase() {
        return new Path(this._path.toLowerCase());
    }
    /**
     * Convert to string
     */
    toString() {
        return this._path;
    }
    /**
     * Trim path components
     * @param count Number of components to trim (negative trims from end)
     * @returns Trimmed path
     */
    trimComponents(count) {
        const comps = this.components;
        const trimmed = count < 0 ? comps.slice(0, count) : comps.slice(count);
        return new Path(trimmed.join(this.separator));
    }
    /**
     * Trim pattern from end of path
     * @param pat Pattern to trim
     * @returns Path with pattern trimmed
     */
    trimEnd(pat) {
        const portablePat = new Path(pat).portable.name;
        const portableName = this.portable.name;
        if (portableName.endsWith(portablePat)) {
            const loc = portableName.lastIndexOf(portablePat);
            if (loc >= 0) {
                return new Path(portableName.substring(0, loc));
            }
        }
        return this;
    }
    /**
     * Trim file extension
     * @returns Path without extension
     */
    trimExt() {
        const parsed = path.parse(this._path);
        return new Path(path.join(parsed.dir, parsed.name));
    }
    /**
     * Trim pattern from start of path
     * @param pat Pattern to trim
     * @returns Path with pattern trimmed
     */
    trimStart(pat) {
        if (this.name.startsWith(pat)) {
            return new Path(this.name.substring(pat.length));
        }
        return this;
    }
    /**
     * Truncate the file to specified size
     * @param size New file size
     */
    truncate(size) {
        fs.truncateSync(this._path, size);
    }
    /**
     * Windows path representation
     */
    get windows() {
        if (process.platform === 'win32') {
            return new Path(path.normalize(this._path));
        }
        // Convert Unix path to Windows style
        return new Path(this._path.replace(/\//g, '\\'));
    }
    /**
     * Append data to a file
     * @param data Data to append
     * @param options File open options
     */
    append(data, _options = 'atw') {
        fs.appendFileSync(this._path, data);
    }
    /**
     * Write data to file (overwrites existing content)
     * @param ...args Data to write
     */
    write(...args) {
        const content = args.map(arg => {
            if (typeof arg === 'string') {
                return arg;
            }
            else if (arg instanceof Uint8Array) {
                return arg;
            }
            else {
                return JSON.stringify(arg);
            }
        }).join('');
        fs.writeFileSync(this._path, content, { mode: 0o644 });
    }
    /**
     * Read file contents as a ByteArray
     * @returns ByteArray containing file data
     */
    readBytes() {
        try {
            return fs.readFileSync(this._path);
        }
        catch {
            return null;
        }
    }
    /**
     * Read file contents as a string
     * @returns File contents as string
     */
    readString() {
        try {
            return fs.readFileSync(this._path, 'utf-8');
        }
        catch {
            return null;
        }
    }
    /**
     * Read file as JSON and deserialize
     * @returns Parsed JSON object
     */
    readJSON() {
        const content = this.readString();
        return content ? JSON.parse(content) : null;
    }
    /**
     * Read file as array of lines
     * @returns Array of lines
     */
    readLines() {
        const content = this.readString();
        if (!content)
            return null;
        const lines = content.split(/\r?\n/);
        // Remove trailing empty line if present
        if (lines.length > 0 && lines[lines.length - 1] === '') {
            lines.pop();
        }
        return lines;
    }
    /**
     * Read file as XML
     * @returns XML object (simplified - returns parsed structure)
     */
    readXML() {
        // Simplified - would need XML parser
        const content = this.readString();
        return content;
    }
    /**
     * Open a file and return a File object
     * @param options Open options
     * @returns File object
     */
    open(_options) {
        // Will be implemented when File class is created
        throw new Error('File class not yet implemented');
    }
    /**
     * Open a binary stream for reading or writing
     * @param mode File mode: 'r' (read), 'w' (write), 'a' (append)
     * @returns BinaryStream instance
     */
    openBinaryStream(mode) {
        const { BinaryStream } = require('./streams/BinaryStream');
        const { ByteArray } = require('./streams/ByteArray');
        if (mode === 'r') {
            // Read mode: load file into ByteArray
            const content = fs.readFileSync(this._path);
            const ba = new ByteArray(content.length, false);
            ba.set(content);
            ba.writePosition = content.length;
            return new BinaryStream(ba);
        }
        else if (mode === 'w' || mode === 'a') {
            // Write/append mode: create empty ByteArray, save on close
            const ba = new ByteArray(4096, true);
            const stream = new BinaryStream(ba);
            if (mode === 'a' && this.exists) {
                // Append mode: load existing content first
                const content = fs.readFileSync(this._path);
                ba.write(content);
            }
            // Override close to save to file
            const filePath = this._path;
            // Save function that writes current buffer to file
            const saveToFile = () => {
                const data = ba.toArray();
                fs.writeFileSync(filePath, data);
            };
            const originalClose = stream.close;
            stream.close = function () {
                saveToFile(); // Save before closing
                if (originalClose)
                    originalClose.call(this);
            };
            // Override flush to save to file
            const originalFlush = stream.flush;
            stream.flush = function (dir) {
                saveToFile(); // Save before flushing
                // Don't call originalFlush as it would reset the ByteArray buffer
            };
            return stream;
        }
        else {
            throw new Error(`Invalid mode: ${mode}. Use 'r', 'w', or 'a'`);
        }
    }
    /**
     * Open a text stream for reading or writing
     * @param mode File mode: 'rt' (read text), 'wt' (write text), 'at' (append text)
     * @returns TextStream instance
     */
    openTextStream(mode) {
        const { TextStream } = require('./streams/TextStream');
        const { ByteArray } = require('./streams/ByteArray');
        if (mode === 'rt') {
            // Read mode: load file into ByteArray
            const content = fs.readFileSync(this._path);
            const ba = new ByteArray(content.length, false);
            ba.set(content);
            ba.writePosition = content.length;
            return new TextStream(ba);
        }
        else if (mode === 'wt' || mode === 'at') {
            // Write/append mode: create empty ByteArray, save on close
            const ba = new ByteArray(4096, true);
            const stream = new TextStream(ba);
            if (mode === 'at' && this.exists) {
                // Append mode: load existing content first
                const content = fs.readFileSync(this._path);
                ba.write(content);
            }
            // Override close to save to file
            const filePath = this._path;
            // Save function that writes current buffer to file
            const saveToFile = () => {
                const data = ba.toArray();
                fs.writeFileSync(filePath, data);
            };
            const originalClose = stream.close;
            stream.close = function () {
                saveToFile(); // Save before closing
                if (originalClose)
                    originalClose.call(this);
            };
            // Override flush to save to file
            const originalFlush = stream.flush;
            stream.flush = function (dir) {
                saveToFile(); // Save before flushing
                // Don't call originalFlush as it would reset the ByteArray buffer
            };
            return stream;
        }
        else {
            throw new Error(`Invalid mode: ${mode}. Use 'rt', 'wt', or 'at'`);
        }
    }
    /**
     * Compact a path by removing '.' and '..' segments
     * @returns Compacted path
     */
    compact() {
        return new Path(path.normalize(this._path));
    }
    /**
     * Test if path matches glob pattern
     * @param patterns Pattern or array of patterns
     * @returns True if matches
     */
    glob(patterns) {
        const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
        const name = this.portable.name;
        for (const pattern of patternsArray) {
            let pat = pattern;
            let negate = false;
            if (pat.startsWith('!')) {
                negate = true;
                pat = pat.substring(1);
            }
            // Convert glob to regex
            let regexPattern = pat
                .replace(/\./g, '\\.')
                .replace(/\*\*/g, '§DOUBLESTAR§')
                .replace(/\*/g, '[^/]*')
                .replace(/§DOUBLESTAR§/g, '.*')
                .replace(/\?/g, '[^/]');
            const regex = new RegExp(`^${regexPattern}$`);
            const matches = regex.test(name);
            if (negate ? matches : !matches) {
                return false;
            }
        }
        return true;
    }
    /**
     * Create a link to this path
     * @param target Target path for the link
     * @param hard Create hard link if true, symbolic link if false
     */
    makeLink(target, hard = false) {
        const targetPath = target instanceof Path ? target.name : target;
        // Remove existing target if it exists
        const targetPathObj = new Path(targetPath);
        if (targetPathObj.exists) {
            targetPathObj.remove();
        }
        if (hard) {
            fs.linkSync(this._path, targetPath);
        }
        else {
            fs.symlinkSync(this._path, targetPath);
        }
    }
    /**
     * Create a symbolic link (alias for makeLink with hard=false)
     * @param target Target path for the symbolic link
     */
    symlink(target) {
        this.makeLink(target, false);
    }
    /**
     * Create a temporary file or directory
     * @param template Template for temp name (e.g., 'tmp-XXXXXX')
     * @returns Path to created temp file/directory
     */
    static makeTemp(template = 'tmp-XXXXXX') {
        const tmpDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
        const random = Math.random().toString(36).substring(2, 8);
        const filename = template.replace(/X+/, random);
        const tmpPath = new Path(tmpDir).join(filename);
        // Create the file
        fs.writeFileSync(tmpPath.name, '');
        return tmpPath;
    }
    /**
     * Remove drive specifier from path (Windows)
     * @returns Path without drive
     */
    removeDrive() {
        const sep = this.separator;
        if (this.hasDrive) {
            const comps = this.components;
            return new Path(sep + comps.slice(1).join(sep));
        }
        return this;
    }
    /**
     * Apply an operation to files matching a pattern
     * @param pattern Glob pattern
     * @param operation Function to apply to each matching file
     */
    operate(pattern, operation) {
        const matches = this.files(pattern);
        for (const file of matches) {
            operation(file);
        }
    }
    /**
     * Iterator for paths in a directory
     */
    *[Symbol.iterator]() {
        if (this.isDir) {
            const entries = fs.readdirSync(this._path);
            for (const entry of entries) {
                yield new Path(path.join(this._path, entry));
            }
        }
    }
}
//# sourceMappingURL=Path.js.map