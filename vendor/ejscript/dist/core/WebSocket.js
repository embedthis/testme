/**
 * WebSocket - WebSocket client
 *
 * Provides WebSocket networking functionality
 * @spec ejs
 * @stability evolving
 */
import { Emitter } from './async/Emitter';
export class WebSocket extends Emitter {
    ws;
    _url;
    _binaryType = 'blob';
    /**
     * Create a WebSocket client
     * @param url WebSocket URL (ws:// or wss://)
     */
    constructor(url) {
        super();
        this._url = url;
    }
    /**
     * Connect to the WebSocket server
     */
    connect() {
        this.ws = new globalThis.WebSocket(this._url);
        // Bun's WebSocket has 'nodebuffer' instead of 'blob'
        if (this._binaryType === 'blob') {
            this.ws.binaryType = 'nodebuffer';
        }
        else {
            this.ws.binaryType = this._binaryType;
        }
        this.ws.onopen = (event) => {
            this.emit('open', event);
        };
        this.ws.onmessage = (event) => {
            this.emit('message', event.data);
        };
        this.ws.onerror = (event) => {
            this.emit('error', event);
        };
        this.ws.onclose = (event) => {
            this.emit('close', event);
        };
    }
    /**
     * Send data through the WebSocket
     * @param data Data to send
     */
    send(data) {
        if (!this.ws) {
            throw new Error('WebSocket not connected');
        }
        this.ws.send(data);
    }
    /**
     * Close the WebSocket connection
     * @param code Close code
     * @param reason Close reason
     */
    close(code, reason) {
        if (this.ws) {
            this.ws.close(code, reason);
        }
    }
    /**
     * Get connection state
     */
    get readyState() {
        return this.ws?.readyState ?? 0;
    }
    /**
     * Get buffered amount
     */
    get bufferedAmount() {
        return this.ws?.bufferedAmount ?? 0;
    }
    /**
     * Get protocol
     */
    get protocol() {
        return this.ws?.protocol ?? '';
    }
    /**
     * Get URL
     */
    get url() {
        return this._url;
    }
    /**
     * Binary type for received binary data
     */
    get binaryType() {
        return this._binaryType;
    }
    set binaryType(type) {
        this._binaryType = type;
        if (this.ws) {
            // Bun's WebSocket has 'nodebuffer' instead of 'blob'
            if (type === 'blob') {
                this.ws.binaryType = 'nodebuffer';
            }
            else {
                this.ws.binaryType = type;
            }
        }
    }
    /**
     * Get negotiated extensions
     */
    get extensions() {
        return this.ws?.extensions ?? '';
    }
    /**
     * Send binary block data
     * @param data Binary data to send
     */
    sendBlock(data) {
        this.send(data);
    }
    /**
     * Wait for WebSocket to reach a specific state
     * @param state Target ready state (default: OPEN)
     * @param timeout Timeout in milliseconds (default: 30000)
     * @returns True if reached target state, false if timed out
     */
    async wait(state = WebSocket.OPEN, timeout = 30000) {
        if (this.readyState === state) {
            return true;
        }
        return new Promise((resolve) => {
            const startTime = Date.now();
            const checkState = () => {
                if (this.readyState === state) {
                    resolve(true);
                }
                else if (Date.now() - startTime >= timeout) {
                    resolve(false);
                }
                else {
                    setTimeout(checkState, 50);
                }
            };
            checkState();
        });
    }
    // WebSocket ready states
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
}
//# sourceMappingURL=WebSocket.js.map