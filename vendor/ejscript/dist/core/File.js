/**
 * File - File I/O class
 *
 * Provides file I/O services to interact with physical files
 * @spec ejs
 * @stability evolving
 */
import { Stream } from './streams/Stream';
import { Path } from './Path';
import { ByteArray } from './streams/ByteArray';
import * as fs from 'fs';
export class File extends Stream {
    _path;
    _fd = null;
    _mode = 'r';
    _permissions = 0o666;
    _position = 0;
    _async = false;
    _canRead = false;
    _canWrite = false;
    observers = new Map();
    /**
     * Create a File object and optionally open it
     * @param path Path to the file
     * @param options Open options (if provided, file is opened)
     */
    constructor(path, options) {
        super();
        this._path = path instanceof Path ? path : new Path(path);
        if (options) {
            this.open(options);
        }
    }
    get async() {
        return this._async;
    }
    set async(enable) {
        if (enable) {
            throw new Error('File class does not support async I/O');
        }
        this._async = enable;
    }
    /**
     * Can the file be read
     */
    get canRead() {
        return this._canRead;
    }
    /**
     * Can the file be written
     */
    get canWrite() {
        return this._canWrite;
    }
    /**
     * Close the file
     */
    close() {
        if (this._fd !== null) {
            fs.closeSync(this._fd);
            this._fd = null;
            this._canRead = false;
            this._canWrite = false;
        }
    }
    /**
     * Text encoding (currently always UTF-8)
     */
    get encoding() {
        return 'utf-8';
    }
    set encoding(_enc) {
        throw new Error('Encoding changes not yet implemented');
    }
    /**
     * Flush data (no-op for unbuffered I/O)
     */
    flush(_dir = Stream.BOTH) {
        // File I/O is currently unbuffered
    }
    /**
     * Is the file open
     */
    get isOpen() {
        return this._fd !== null;
    }
    /**
     * Open the file
     * @param options Open options
     * @returns This File object for chaining
     */
    open(options) {
        if (this._fd !== null) {
            throw new Error('File is already open');
        }
        // Parse options
        let mode = 'r';
        let permissions = 0o666;
        if (typeof options === 'string') {
            mode = options;
        }
        else if (options) {
            mode = options.mode || 'r';
            permissions = options.permissions ?? 0o666;
        }
        this._mode = mode;
        this._permissions = permissions;
        // Parse mode string into flags
        let flags = '';
        const hasRead = mode.includes('r');
        const hasWrite = mode.includes('w');
        const hasAppend = mode.includes('a');
        const hasCreate = mode.includes('c');
        const _hasLock = mode.includes('l');
        const hasNoTruncate = mode.includes('+');
        if (hasRead && hasWrite) {
            if (hasAppend) {
                flags = 'a+';
            }
            else if (hasNoTruncate) {
                flags = 'r+';
            }
            else {
                flags = 'w+';
            }
        }
        else if (hasRead) {
            flags = 'r';
        }
        else if (hasWrite) {
            if (hasAppend) {
                flags = 'a';
            }
            else {
                flags = 'w';
            }
        }
        else if (hasAppend) {
            flags = 'a';
        }
        // Create exclusive mode
        if (hasCreate) {
            if (this._path.exists) {
                throw new Error(`File ${this._path} already exists (create mode)`);
            }
            flags = flags.replace('w', 'wx');
        }
        try {
            this._fd = fs.openSync(this._path.name, flags, permissions);
            this._canRead = hasRead || (hasWrite && hasAppend);
            this._canWrite = hasWrite || hasAppend;
            this._position = hasAppend ? this.size : 0;
        }
        catch (error) {
            throw new Error(`Cannot open file ${this._path}: ${error}`);
        }
        return this;
    }
    /**
     * Get current file options
     */
    get options() {
        return {
            mode: this._mode,
            permissions: this._permissions
        };
    }
    /**
     * Get the file path
     */
    get path() {
        return this._path;
    }
    /**
     * Get/set current read/write position
     */
    get position() {
        return this._position;
    }
    set position(loc) {
        if (this._fd === null) {
            throw new Error('File is not open');
        }
        // Handle negative positions (relative to end)
        if (loc < 0) {
            const size = this.size;
            loc = size + loc;
            if (loc < 0)
                loc = 0;
        }
        this._position = loc;
    }
    /**
     * Read data from file into a buffer
     * @param buffer Destination byte array
     * @param offset Offset in buffer to write data
     * @param count Number of bytes to read (-1 for all)
     * @returns Number of bytes read, or null on EOF
     */
    read(buffer, offset = 0, count = -1) {
        if (this._fd === null) {
            throw new Error('File is not open');
        }
        if (!this._canRead) {
            throw new Error('File is not open for reading');
        }
        // Determine how many bytes to read
        if (count === -1) {
            // For ByteArray, use size (capacity) not length (writePosition)
            const ByteArray = require('./streams/ByteArray').ByteArray;
            if (buffer instanceof ByteArray) {
                count = buffer.size - offset;
            }
            else {
                count = buffer.length - offset;
            }
        }
        try {
            const bytesRead = fs.readSync(this._fd, buffer, offset, count, this._position);
            if (bytesRead === 0) {
                return null;
            }
            this._position += bytesRead;
            // If buffer is a ByteArray, update its writePosition
            if (buffer instanceof require('./streams/ByteArray').ByteArray) {
                const ba = buffer;
                if (offset + bytesRead > ba.writePosition) {
                    ba.writePosition = offset + bytesRead;
                }
            }
            return bytesRead;
        }
        catch (error) {
            throw new Error(`Cannot read from file ${this._path}: ${error}`);
        }
    }
    /**
     * Read bytes from file
     * @param count Number of bytes to read (-1 for entire file)
     * @returns ByteArray with data, or null on EOF
     */
    readBytes(count = -1) {
        if (count === -1) {
            count = this.size - this._position;
        }
        // Limit count to available bytes
        const remaining = this.size - this._position;
        if (count > remaining) {
            count = remaining;
        }
        const buffer = new ByteArray(count, false);
        const bytesRead = this.read(buffer, 0, count);
        if (bytesRead === null || bytesRead === 0) {
            return null;
        }
        // Buffer's writePosition has been updated by read(), so just return it
        return buffer;
    }
    /**
     * Read string from file
     * @param count Number of bytes to read (-1 for entire file)
     * @returns String data, or null on EOF
     */
    readString(count = -1) {
        const bytes = this.readBytes(count);
        if (!bytes)
            return null;
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
    }
    /**
     * Read file as array of lines
     * @returns Array of lines, or null on error
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
     * Seek to a specific position in the file
     * @param loc Position to seek to
     * @param whence Reference point (0=start, 1=current, 2=end)
     */
    seek(loc, whence = 0) {
        if (this._fd === null) {
            throw new Error('File is not open');
        }
        switch (whence) {
            case 0: // SEEK_SET - from start
                this._position = loc;
                break;
            case 1: // SEEK_CUR - from current
                this._position += loc;
                break;
            case 2: // SEEK_END - from end
                this._position = this.size + loc;
                break;
            default:
                throw new Error(`Invalid whence value: ${whence}`);
        }
        if (this._position < 0) {
            this._position = 0;
        }
    }
    /**
     * Remove the file
     * @returns True if successful
     */
    remove() {
        if (this.isOpen) {
            return false;
        }
        return this._path.remove();
    }
    /**
     * Get file size in bytes
     */
    get size() {
        if (this._fd !== null) {
            const stats = fs.fstatSync(this._fd);
            return stats.size;
        }
        return this._path.size;
    }
    /**
     * Truncate the file
     * @param value New file size
     */
    truncate(value) {
        if (this._fd !== null) {
            fs.ftruncateSync(this._fd, value);
        }
        else {
            // Truncate without opening
            fs.truncateSync(this._path.name, value);
        }
    }
    /**
     * Write data to file
     * @param ...items Data items to write
     * @returns Number of bytes written
     */
    write(...items) {
        if (this._fd === null) {
            throw new Error('File is not open');
        }
        if (!this._canWrite) {
            throw new Error('File is not open for writing');
        }
        let totalWritten = 0;
        for (const item of items) {
            let data;
            if (typeof item === 'string') {
                const encoder = new TextEncoder();
                data = encoder.encode(item);
            }
            else if (item instanceof ByteArray || item instanceof Uint8Array) {
                data = item;
            }
            else if (typeof item === 'number') {
                data = new Uint8Array([item]);
            }
            else {
                // Serialize other types
                const encoder = new TextEncoder();
                data = encoder.encode(JSON.stringify(item));
            }
            try {
                const written = fs.writeSync(this._fd, data, 0, data.length, this._position);
                this._position += written;
                totalWritten += written;
            }
            catch (error) {
                throw new Error(`Cannot write to file ${this._path}: ${error}`);
            }
        }
        return totalWritten;
    }
    /**
     * Write line to file (with newline)
     * @param ...items Data items to write
     * @returns Number of bytes written
     */
    writeLine(...items) {
        const written = this.write(...items);
        const newlineWritten = this.write('\n');
        return written + newlineWritten;
    }
    /**
     * Iterator - yields file positions
     */
    *[Symbol.iterator]() {
        const size = this.size;
        for (let i = 0; i < size; i++) {
            yield i;
        }
    }
    on(name, observer) {
        if (!this.observers.has(name)) {
            this.observers.set(name, []);
        }
        this.observers.get(name).push(observer);
        return this;
    }
    off(name, observer) {
        const observers = this.observers.get(name);
        if (observers) {
            const index = observers.indexOf(observer);
            if (index >= 0) {
                observers.splice(index, 1);
            }
        }
    }
    _emit(name, ...args) {
        const observers = this.observers.get(name);
        if (observers) {
            for (const observer of observers) {
                observer.call(this, ...args);
            }
        }
    }
}
//# sourceMappingURL=File.js.map