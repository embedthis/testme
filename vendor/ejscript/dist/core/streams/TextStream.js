/**
 * TextStream - Text-based stream I/O
 *
 * Wraps a binary stream to provide text-based reading and writing
 * @spec ejs
 * @stability evolving
 */
import { Stream } from './Stream';
import { ByteArray } from './ByteArray';
export class TextStream extends Stream {
    stream;
    encoding;
    _async = false;
    /**
     * Create a TextStream wrapping another stream
     * @param stream Underlying stream to wrap
     * @param encoding Text encoding (default 'utf-8')
     */
    constructor(stream, encoding = 'utf-8') {
        super();
        this.stream = stream;
        this.encoding = encoding;
    }
    get async() {
        return this._async;
    }
    set async(enable) {
        this._async = enable;
        this.stream.async = enable;
    }
    close() {
        this.stream.close();
    }
    flush(dir = Stream.WRITE) {
        this.stream.flush(dir);
    }
    /**
     * Read data into a buffer
     * @param buffer Buffer to read into
     * @param offset Offset in buffer
     * @param count Number of bytes to read
     * @returns Number of bytes read, or null on EOF
     */
    read(buffer, offset = 0, count = -1) {
        return this.stream.read(buffer, offset, count);
    }
    /**
     * Read a single line of text
     * @returns Line of text without newline, or null on EOF
     */
    readLine() {
        const buffer = new ByteArray(1024);
        let line = '';
        let byte;
        while (true) {
            const tempBuffer = new Uint8Array(1);
            const bytesRead = this.stream.read(tempBuffer, 0, 1);
            if (bytesRead === null || bytesRead === 0) {
                return line.length > 0 ? line : null;
            }
            byte = tempBuffer[0];
            if (byte === 0x0A) { // \n
                break;
            }
            if (byte === 0x0D) { // \r
                // Peek ahead for \n
                const nextBuffer = new Uint8Array(1);
                const nextRead = this.stream.read(nextBuffer, 0, 1);
                if (nextRead && nextBuffer[0] !== 0x0A) {
                    // Not a \r\n pair, this is unusual but handle it
                    line += String.fromCharCode(byte);
                    line += String.fromCharCode(nextBuffer[0]);
                }
                break;
            }
            line += String.fromCharCode(byte);
        }
        return line;
    }
    /**
     * Read all lines from the stream
     * @returns Array of lines
     */
    readLines() {
        const lines = [];
        let line;
        while ((line = this.readLine()) !== null) {
            lines.push(line);
        }
        return lines;
    }
    /**
     * Read a string of specified length
     * @param count Number of characters to read (-1 for all)
     * @returns String read from stream, or null on EOF
     */
    readString(count = -1) {
        if (count === 0)
            return '';
        const buffer = new ByteArray(count > 0 ? count : 4096);
        const bytesRead = this.stream.read(buffer, 0, count);
        if (bytesRead === null || bytesRead === 0) {
            return null;
        }
        const decoder = new TextDecoder(this.encoding);
        return decoder.decode(buffer.subarray(0, bytesRead));
    }
    /**
     * Write data to the stream
     * @param ...args Data items to write (converted to strings)
     * @returns Number of bytes written
     */
    write(...args) {
        let totalWritten = 0;
        for (const arg of args) {
            const str = String(arg);
            const encoder = new TextEncoder();
            const bytes = encoder.encode(str);
            const written = this.stream.write(bytes);
            totalWritten += written;
        }
        return totalWritten;
    }
    /**
     * Write lines of text (each arg becomes a separate line)
     * @param ...args Data items to write (each followed by newline)
     * @returns Number of bytes written
     */
    writeLine(...args) {
        let totalWritten = 0;
        for (const arg of args) {
            totalWritten += this.write(arg);
            totalWritten += this.write('\n');
        }
        return totalWritten;
    }
    on(name, observer) {
        this.stream.on(name, observer);
        return this;
    }
    off(name, observer) {
        this.stream.off(name, observer);
    }
}
//# sourceMappingURL=TextStream.js.map