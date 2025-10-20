/**
 * Cmd - Command execution
 *
 * The Cmd class supports invoking other programs as separate processes on the same system.
 * Implements Stream interface for reading/writing to command stdin/stdout.
 * @spec ejs
 * @stability evolving
 */
import { App } from '../App';
import { Path } from '../Path';
import { Config } from '../Config';
import { ByteArray } from '../streams/ByteArray';
import { TextStream } from '../streams/TextStream';
import { Emitter } from '../async/Emitter';
/**
 * Cmd class for executing external commands with stream interface
 */
export class Cmd extends Emitter {
    _response = null;
    _errorResponse = null;
    _env;
    _timeout = 30000;
    _process = null;
    _pid = null;
    _status = null;
    _stdoutData = new ByteArray();
    _stderrData = new ByteArray();
    _stdoutStream = null;
    _stderrStream = null;
    _finalized = false;
    _stdoutReader = null;
    _stderrReader = null;
    _stdoutPromise = null;
    _stderrPromise = null;
    _readingStreams = false;
    /**
     * Create a Cmd object
     * @param command Optional command line to initialize with
     * @param options Command options
     */
    constructor(command = null, options = {}) {
        super();
        if (options.timeout) {
            this._timeout = options.timeout;
        }
        if (command) {
            this.start(command, options);
        }
    }
    /**
     * Close the command and free resources
     */
    close() {
        // Cancel stream readers first to stop async reading
        if (this._stdoutReader) {
            try {
                this._stdoutReader.cancel();
            }
            catch { }
            this._stdoutReader = null;
        }
        if (this._stderrReader) {
            try {
                this._stderrReader.cancel();
            }
            catch { }
            this._stderrReader = null;
        }
        this._readingStreams = false;
        if (this._process) {
            try {
                this._process.kill();
                // Unref the process so it doesn't keep event loop alive
                this._process.unref();
            }
            catch { }
            this._process = null;
        }
        this._pid = null;
        // Remove all event listeners to prevent memory leaks
        this.removeAllListeners();
    }
    /**
     * Hash of environment strings to pass to the command
     */
    get env() {
        return this._env || {};
    }
    set env(values) {
        this._env = values;
    }
    /**
     * Command error output data as a string
     */
    get error() {
        if (!this._errorResponse) {
            this._errorResponse = this._stderrData.toString();
        }
        return this._errorResponse;
    }
    /**
     * The error stream object for the command's standard error output
     */
    get errorStream() {
        if (!this._stderrStream) {
            this._stderrStream = {
                toString: () => this._stderrData.toString(),
                read: (buffer, offset = 0, count = -1) => {
                    const data = this._stderrData;
                    if (count === -1)
                        count = data.length;
                    for (let i = 0; i < count && i < data.length; i++) {
                        buffer[offset + i] = data[i];
                    }
                    return Math.min(count, data.length);
                }
            };
        }
        return this._stderrStream;
    }
    /**
     * Signal the end of writing data to the command
     */
    finalize() {
        this._finalized = true;
        if (this._process && this._process.stdin) {
            try {
                if (typeof this._process.stdin === 'object' && 'end' in this._process.stdin) {
                    this._process.stdin.end();
                }
            }
            catch { }
        }
    }
    /**
     * Flush stream (no-op for commands)
     */
    flush(_dir = 0) {
        // No-op for commands
    }
    /**
     * Process ID of the command
     */
    get pid() {
        if (this._pid === null) {
            throw new Error('Command not started or already closed');
        }
        return this._pid;
    }
    /**
     * Read data from command output
     * @param buffer ByteArray to read into
     * @param offset Offset in buffer
     * @param count Number of bytes to read
     * @returns Number of bytes read or null if no data
     */
    read(buffer, offset = 0, count = -1) {
        const data = this._stdoutData;
        if (data.length === 0)
            return null;
        if (count === -1)
            count = data.length;
        let bytesRead = 0;
        for (let i = 0; i < count && i < data.length; i++) {
            buffer[offset + i] = data[i];
            bytesRead++;
        }
        // Remove read data from buffer
        const remaining = data.slice(bytesRead);
        const newBuffer = new ByteArray(remaining.length);
        newBuffer.write(remaining);
        this._stdoutData = newBuffer;
        return bytesRead;
    }
    /**
     * Read the data from the command output as a string
     * @param count Number of bytes to read (-1 for all)
     * @returns String data
     */
    readString(count = -1) {
        const data = this._stdoutData.toString();
        if (count === -1) {
            this._stdoutData = new ByteArray();
            return data;
        }
        const result = data.substring(0, count);
        const remaining = Buffer.from(data.substring(count));
        const newBuffer = new ByteArray(remaining.length);
        newBuffer.write(remaining);
        this._stdoutData = newBuffer;
        return result;
    }
    /**
     * Read the data from the command as an array of lines
     * @param count Number of lines to read (-1 for all)
     * @returns Array of lines
     */
    readLines(count = -1) {
        const stream = new TextStream(this);
        return stream.readLines();
    }
    /**
     * Command output data as a string (cached)
     */
    get response() {
        if (!this._response) {
            this._response = this.readString();
        }
        return this._response;
    }
    /**
     * Start the command
     * @param cmdline Command line (string or array)
     * @param options Command options
     */
    start(cmdline, options = {}) {
        const detach = options.detach || false;
        const cwd = options.dir ? (options.dir instanceof Path ? options.dir.name : options.dir) : undefined;
        const timeout = options.timeout || this._timeout;
        // Parse command line
        let cmd;
        let args = [];
        if (typeof cmdline === 'string') {
            // Simple string command - let shell handle it
            cmd = cmdline;
        }
        else {
            // Array of args
            cmd = cmdline[0];
            args = cmdline.slice(1);
        }
        // Spawn process
        this._process = Bun.spawn(typeof cmdline === 'string' ? ['/bin/sh', '-c', cmd] : [cmd, ...args], {
            cwd,
            env: this._env ? { ...process.env, ...this._env } : process.env,
            stdin: detach ? 'pipe' : 'inherit',
            stdout: 'pipe',
            stderr: 'pipe',
        });
        this._pid = this._process.pid;
        // Set up stdout reading - STORE the promise so we can wait for it
        if (this._process.stdout && typeof this._process.stdout === 'object' && 'getReader' in this._process.stdout) {
            this._stdoutReader = this._process.stdout.getReader();
            this._readingStreams = true;
            this._stdoutPromise = this._readStream(this._stdoutReader, this._stdoutData, 'readable');
        }
        // Set up stderr reading - STORE the promise so we can wait for it
        if (this._process.stderr && typeof this._process.stderr === 'object' && 'getReader' in this._process.stderr) {
            this._stderrReader = this._process.stderr.getReader();
            this._readingStreams = true;
            this._stderrPromise = this._readStream(this._stderrReader, this._stderrData, 'error');
        }
        // Handle completion
        this._process.exited.then((exitCode) => {
            this._status = exitCode;
            this.emit('complete', this);
            if (options.exceptions !== false && exitCode !== 0) {
                throw new Error(`Command failed with status ${exitCode}\n${this.error}`);
            }
        }).catch(() => {
            // Silently ignore errors during cleanup (e.g., killed processes)
        });
    }
    /**
     * Read from a stream into a ByteArray
     */
    async _readStream(reader, buffer, event) {
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                // Append to buffer
                for (const byte of value) {
                    buffer.writeByte(byte);
                }
                // Emit event
                this.emit(event, this);
            }
        }
        catch (err) {
            // Silently ignore cancellation and other stream errors
            // This is expected when close() cancels the reader
        }
    }
    /**
     * Get the command exit status (blocks until complete)
     * @returns Exit status code
     */
    get status() {
        if (this._status === null && this._process) {
            // Block until complete - not ideal but matches ejscript API
            // In real usage, use wait() instead
            while (this._status === null) {
                // Busy wait (not ideal, but matches synchronous API)
            }
        }
        return this._status || 0;
    }
    /**
     * Stop the current command
     * @param signal Signal to send (default SIGINT = 2)
     * @returns True if successfully stopped
     */
    stop(signal = 2) {
        if (!this._process)
            return false;
        // Cancel stream readers to stop async operations
        if (this._stdoutReader) {
            try {
                this._stdoutReader.cancel();
            }
            catch { }
        }
        if (this._stderrReader) {
            try {
                this._stderrReader.cancel();
            }
            catch { }
        }
        try {
            this._process.kill(signal);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Default command timeout
     */
    get timeout() {
        return this._timeout;
    }
    set timeout(msec) {
        this._timeout = msec;
    }
    /**
     * Wait for command to complete
     * @param timeout Time in milliseconds to wait
     * @returns True if command completed
     */
    async wait(timeout = -1) {
        if (!this._process)
            return false;
        const timeoutMs = timeout === -1 ? this._timeout : timeout;
        let timeoutId = null;
        try {
            const result = await Promise.race([
                this._process.exited,
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
                })
            ]);
            return true;
        }
        catch {
            return false;
        }
        finally {
            // CRITICAL: Clear the timeout to prevent keeping event loop alive
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
        }
    }
    /**
     * Write data to command stdin
     * @param data Data to write
     * @returns Number of bytes written
     */
    write(...data) {
        if (!this._process || !this._process.stdin) {
            throw new Error('Command not started in detached mode');
        }
        const str = data.map(d => String(d)).join('');
        if (typeof this._process.stdin === 'object' && 'getWriter' in this._process.stdin) {
            const writer = this._process.stdin.getWriter();
            const encoded = new TextEncoder().encode(str);
            writer.write(encoded);
            writer.releaseLock();
            return encoded.length;
        }
        return 0;
    }
    /* Static Helper Methods */
    /**
     * Locate a program using the PATH
     * @param program Program to find
     * @param search Optional additional search paths
     * @returns Located path or null
     */
    static locate(program, search = []) {
        const searchPaths = [...search, ...(App.getenv('PATH') || '').split(Config.OS === 'windows' ? ';' : ':')];
        for (const dir of searchPaths) {
            const path = new Path(dir).join(program instanceof Path ? program.name : program);
            if (path.exists && !path.isDir) {
                return path;
            }
        }
        // Windows extensions
        if (Config.OS === 'windows' || Config.OS === 'cygwin') {
            const prog = program instanceof Path ? program : new Path(program);
            if (!prog.extension) {
                for (const ext of ['exe', 'bat', 'cmd']) {
                    const result = Cmd.locate(prog.joinExt(ext), search);
                    if (result)
                        return result;
                }
            }
        }
        return null;
    }
    /**
     * Start a command as a daemon
     * @param cmdline Command line
     * @param options Command options
     * @returns Process ID
     */
    static daemon(cmdline, options = {}) {
        const cmd = new Cmd();
        cmd.start(cmdline, { ...options, detach: true });
        cmd.finalize();
        return cmd.pid;
    }
    /**
     * Execute a new program replacing current process
     * @param cmdline Command line
     * @param options Command options
     */
    static exec(cmdline = null, options = {}) {
        if (!cmdline) {
            throw new Error('Command line required');
        }
        // Note: This cannot truly replace the process in Bun like it can in C
        // We'll simulate by running and exiting
        const result = Cmd.run(cmdline, options);
        console.log(result);
        process.exit(0);
    }
    /**
     * Kill a process by PID
     * @param pid Process ID
     * @param signal Signal number (default SIGINT = 2)
     * @returns True if successful
     */
    static kill(pid, signal = 2) {
        try {
            process.kill(pid, signal);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Execute a command and return output
     * @param command Command to execute
     * @param options Command options
     * @param data Optional data to write to stdin
     * @returns Command output
     */
    static run(command, options = {}, data = null) {
        const cmd = new Cmd();
        const results = new ByteArray();
        cmd.on('readable', (event, c) => {
            const buf = new ByteArray();
            c.read(buf, 0, -1);
            if (options.stream) {
                process.stdout.write(buf.toString());
            }
            results.write(buf);
        });
        cmd.start(command, { ...options, detach: true });
        if (options.detach) {
            return null;
        }
        if (data) {
            cmd.write(data);
        }
        cmd.finalize();
        // Note: wait is async, but run should be sync - this is a limitation
        // In practice, use async version or instance methods
        return results.toString();
    }
    /**
     * Run a command using the system shell
     * @param command Command to execute
     * @param options Command options
     * @param data Optional data to write to stdin
     * @returns Command output
     */
    static sh(command, options = {}, data = null) {
        const shell = Cmd.locate('sh') || new Path('/bin/sh');
        if (Array.isArray(command)) {
            // Quote arguments with spaces
            const quotedArgs = command.map(arg => {
                const s = String(arg).trimEnd();
                if (s.includes(' ') || s.includes('"') || s.includes("'")) {
                    return `'${s.replace(/'/g, "\\'")}'`;
                }
                return s;
            });
            return Cmd.run([shell.name, '-c', quotedArgs.join(' ')], options, data)?.trimEnd() || '';
        }
        return Cmd.run([shell.name, '-c', String(command).trimEnd()], options, data)?.trimEnd() || '';
    }
}
//# sourceMappingURL=Cmd.js.map