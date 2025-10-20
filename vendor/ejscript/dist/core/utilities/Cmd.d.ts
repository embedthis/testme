/**
 * Cmd - Command execution
 *
 * The Cmd class supports invoking other programs as separate processes on the same system.
 * Implements Stream interface for reading/writing to command stdin/stdout.
 * @spec ejs
 * @stability evolving
 */
import { Path } from '../Path';
import { ByteArray } from '../streams/ByteArray';
import { Emitter } from '../async/Emitter';
export interface CmdOptions {
    /** Run the command and return immediately (detached mode) */
    detach?: boolean;
    /** Directory to set as current working directory */
    dir?: Path | string;
    /** Throw exceptions if command returns non-zero status */
    exceptions?: boolean;
    /** Default timeout in milliseconds */
    timeout?: number;
    /** Stream stdout to current standard output */
    stream?: boolean;
    /** Do not capture or redirect stdin/stdout/stderr */
    noio?: boolean;
}
/**
 * Cmd class for executing external commands with stream interface
 */
export declare class Cmd extends Emitter {
    private _response;
    private _errorResponse;
    private _env?;
    private _timeout;
    private _process;
    private _pid;
    private _status;
    private _stdoutData;
    private _stderrData;
    private _stdoutStream;
    private _stderrStream;
    private _finalized;
    private _stdoutReader;
    private _stderrReader;
    private _stdoutPromise;
    private _stderrPromise;
    private _readingStreams;
    /**
     * Create a Cmd object
     * @param command Optional command line to initialize with
     * @param options Command options
     */
    constructor(command?: string | string[] | null, options?: CmdOptions);
    /**
     * Close the command and free resources
     */
    close(): void;
    /**
     * Hash of environment strings to pass to the command
     */
    get env(): Record<string, string>;
    set env(values: Record<string, string>);
    /**
     * Command error output data as a string
     */
    get error(): string;
    /**
     * The error stream object for the command's standard error output
     */
    get errorStream(): any;
    /**
     * Signal the end of writing data to the command
     */
    finalize(): void;
    /**
     * Flush stream (no-op for commands)
     */
    flush(_dir?: number): void;
    /**
     * Process ID of the command
     */
    get pid(): number;
    /**
     * Read data from command output
     * @param buffer ByteArray to read into
     * @param offset Offset in buffer
     * @param count Number of bytes to read
     * @returns Number of bytes read or null if no data
     */
    read(buffer: ByteArray, offset?: number, count?: number): number | null;
    /**
     * Read the data from the command output as a string
     * @param count Number of bytes to read (-1 for all)
     * @returns String data
     */
    readString(count?: number): string | null;
    /**
     * Read the data from the command as an array of lines
     * @param count Number of lines to read (-1 for all)
     * @returns Array of lines
     */
    readLines(count?: number): string[] | null;
    /**
     * Command output data as a string (cached)
     */
    get response(): string | null;
    /**
     * Start the command
     * @param cmdline Command line (string or array)
     * @param options Command options
     */
    start(cmdline: string | string[], options?: CmdOptions): void;
    /**
     * Read from a stream into a ByteArray
     */
    private _readStream;
    /**
     * Get the command exit status (blocks until complete)
     * @returns Exit status code
     */
    get status(): number;
    /**
     * Stop the current command
     * @param signal Signal to send (default SIGINT = 2)
     * @returns True if successfully stopped
     */
    stop(signal?: number): boolean;
    /**
     * Default command timeout
     */
    get timeout(): number;
    set timeout(msec: number);
    /**
     * Wait for command to complete
     * @param timeout Time in milliseconds to wait
     * @returns True if command completed
     */
    wait(timeout?: number): Promise<boolean>;
    /**
     * Write data to command stdin
     * @param data Data to write
     * @returns Number of bytes written
     */
    write(...data: any[]): number;
    /**
     * Locate a program using the PATH
     * @param program Program to find
     * @param search Optional additional search paths
     * @returns Located path or null
     */
    static locate(program: Path | string, search?: string[]): Path | null;
    /**
     * Start a command as a daemon
     * @param cmdline Command line
     * @param options Command options
     * @returns Process ID
     */
    static daemon(cmdline: string | string[], options?: CmdOptions): number;
    /**
     * Execute a new program replacing current process
     * @param cmdline Command line
     * @param options Command options
     */
    static exec(cmdline?: string | null, options?: CmdOptions): void;
    /**
     * Kill a process by PID
     * @param pid Process ID
     * @param signal Signal number (default SIGINT = 2)
     * @returns True if successful
     */
    static kill(pid: number, signal?: number): boolean;
    /**
     * Execute a command and return output
     * @param command Command to execute
     * @param options Command options
     * @param data Optional data to write to stdin
     * @returns Command output
     */
    static run(command: string | string[], options?: CmdOptions, data?: any): string | null;
    /**
     * Run a command using the system shell
     * @param command Command to execute
     * @param options Command options
     * @param data Optional data to write to stdin
     * @returns Command output
     */
    static sh(command: string | string[], options?: CmdOptions, data?: any): string;
}
//# sourceMappingURL=Cmd.d.ts.map