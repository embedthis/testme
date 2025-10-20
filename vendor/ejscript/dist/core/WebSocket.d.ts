/**
 * WebSocket - WebSocket client
 *
 * Provides WebSocket networking functionality
 * @spec ejs
 * @stability evolving
 */
import { Emitter } from './async/Emitter';
export declare class WebSocket extends Emitter {
    private ws?;
    private _url;
    private _binaryType;
    /**
     * Create a WebSocket client
     * @param url WebSocket URL (ws:// or wss://)
     */
    constructor(url: string);
    /**
     * Connect to the WebSocket server
     */
    connect(): void;
    /**
     * Send data through the WebSocket
     * @param data Data to send
     */
    send(data: string | ArrayBuffer | Uint8Array): void;
    /**
     * Close the WebSocket connection
     * @param code Close code
     * @param reason Close reason
     */
    close(code?: number, reason?: string): void;
    /**
     * Get connection state
     */
    get readyState(): number;
    /**
     * Get buffered amount
     */
    get bufferedAmount(): number;
    /**
     * Get protocol
     */
    get protocol(): string;
    /**
     * Get URL
     */
    get url(): string;
    /**
     * Binary type for received binary data
     */
    get binaryType(): 'blob' | 'arraybuffer';
    set binaryType(type: 'blob' | 'arraybuffer');
    /**
     * Get negotiated extensions
     */
    get extensions(): string;
    /**
     * Send binary block data
     * @param data Binary data to send
     */
    sendBlock(data: ArrayBuffer | Uint8Array): void;
    /**
     * Wait for WebSocket to reach a specific state
     * @param state Target ready state (default: OPEN)
     * @param timeout Timeout in milliseconds (default: 30000)
     * @returns True if reached target state, false if timed out
     */
    wait(state?: number, timeout?: number): Promise<boolean>;
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
}
//# sourceMappingURL=WebSocket.d.ts.map