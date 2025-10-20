/**
 * BinaryStream - Binary stream I/O with endian control
 *
 * Provides binary data reading/writing with byte order control
 * @spec ejs
 * @stability evolving
 */
import { Stream } from './Stream';
export declare enum Endian {
    LittleEndian = "little",
    BigEndian = "big"
}
export declare class BinaryStream extends Stream {
    private stream;
    private _endian;
    private _async;
    /**
     * Little endian constant
     */
    static readonly LittleEndian = Endian.LittleEndian;
    /**
     * Big endian constant
     */
    static readonly BigEndian = Endian.BigEndian;
    /**
     * Create a BinaryStream wrapping another stream
     * @param stream Underlying stream to wrap
     * @param endian Byte order (default: little endian)
     */
    constructor(stream: Stream, endian?: Endian);
    get async(): boolean;
    set async(enable: boolean);
    /**
     * Get/set the byte order
     */
    get endian(): Endian;
    set endian(value: Endian);
    close(): void;
    flush(dir?: number): void;
    read(buffer: Uint8Array, offset?: number, count?: number): number | null;
    write(...args: any[]): number;
    /**
     * Read a single byte
     * @returns Byte value (0-255) or null on EOF
     */
    readByte(): number | null;
    /**
     * Read a 16-bit integer
     * @returns Integer value or null on EOF
     */
    readInteger16(): number | null;
    /**
     * Alias for readInteger16
     */
    readShort(): number | null;
    /**
     * Read a string of specified length
     * @param count Number of bytes to read
     * @returns String or null on EOF
     */
    readString(count: number): string | null;
    /**
     * Read a 32-bit integer
     * @returns Integer value or null on EOF
     */
    readInteger32(): number | null;
    /**
     * Read a 64-bit integer
     * @returns BigInt value or null on EOF
     */
    readInteger64(): bigint | null;
    /**
     * Read a 64-bit double
     * @returns Double value or null on EOF
     */
    readDouble(): number | null;
    /**
     * Read a 32-bit float
     * @returns Float value or null on EOF
     */
    readFloat(): number | null;
    /**
     * Write a single byte
     * @param value Byte value (0-255)
     * @returns Number of bytes written
     */
    writeByte(value: number): number;
    /**
     * Write a 16-bit integer
     * @param value Integer value
     * @returns Number of bytes written
     */
    writeInteger16(value: number): number;
    /**
     * Alias for writeInteger16
     */
    writeShort(value: number): number;
    /**
     * Write a 32-bit integer
     * @param value Integer value
     * @returns Number of bytes written
     */
    writeInteger32(value: number): number;
    /**
     * Write a 64-bit integer
     * @param value BigInt value
     * @returns Number of bytes written
     */
    writeInteger64(value: bigint): number;
    /**
     * Write a 64-bit double
     * @param value Double value
     * @returns Number of bytes written
     */
    writeDouble(value: number): number;
    /**
     * Write a 32-bit float
     * @param value Float value
     * @returns Number of bytes written
     */
    writeFloat(value: number): number;
    on(name: string, observer: Function): this;
    off(name: string, observer: Function): void;
}
//# sourceMappingURL=BinaryStream.d.ts.map