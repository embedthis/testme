/**
 * Http - HTTP client
 *
 * Provides HTTP/HTTPS client functionality
 * @spec ejs
 * @stability evolving
 */
import { Stream } from './streams/Stream';
import { Uri } from './utilities/Uri';
import { Path } from './Path';
import { Emitter } from './async/Emitter';
export class Http extends Stream {
    // HTTP status code constants
    static Continue = 100;
    static Ok = 200;
    static Created = 201;
    static Accepted = 202;
    static NotAuthoritative = 203;
    static NoContent = 204;
    static Reset = 205;
    static PartialContent = 206;
    static MultipleChoice = 300;
    static MovedPermanently = 301;
    static MovedTemporarily = 302;
    static SeeOther = 303;
    static NotModified = 304;
    static UseProxy = 305;
    static BadRequest = 400;
    static Unauthorized = 401;
    static PaymentRequired = 402;
    static Forbidden = 403;
    static NotFound = 404;
    static BadMethod = 405;
    static NotAcceptable = 406;
    static ProxyAuthRequired = 407;
    static RequestTimeout = 408;
    static Conflict = 409;
    static Gone = 410;
    static LengthRequired = 411;
    static PrecondFailed = 412;
    static EntityTooLarge = 413;
    static UriTooLong = 414;
    static UnsupportedMedia = 415;
    static BadRange = 416;
    static ServerError = 500;
    static NotImplemented = 501;
    static BadGateway = 502;
    static ServiceUnavailable = 503;
    static GatewayTimeout = 504;
    static VersionNotSupported = 505;
    _uri = null;
    _method = 'GET';
    _headers = {};
    _response = '';
    _status = null;
    _statusMessage = '';
    _responseHeaders = {};
    _finalized = false;
    _followRedirects = false;
    _retries = 2;
    emitter = new Emitter();
    credentials;
    _ca;
    _certificate;
    _key;
    _verify = true;
    _verifyIssuer = true;
    _bodyLength = -1;
    _chunked = false;
    _encoding = 'utf-8';
    _limits = {
        chunk: 8192,
        connReuse: 5,
        headers: 4096,
        header: 32768,
        inactivityTimeout: 30,
        receive: 4194304,
        requestTimeout: 60,
        stageBuffer: 4096,
        transmission: 4194304
    };
    _readPosition = 0;
    /**
     * Create an Http client
     * @param uri Optional initial URI
     */
    constructor(uri) {
        super();
        if (uri) {
            this._uri = typeof uri === 'string' ? new Uri(uri) : uri;
        }
    }
    /**
     * Fetch a URL (convenience method)
     * @param uri URI to fetch
     * @param method HTTP method
     * @param ...data Data to send
     * @returns Response string
     */
    static async fetch(uri, method = 'GET', ...data) {
        const http = new Http();
        await http.connect(method, uri, ...data);
        http.finalize();
        return http.response;
    }
    /**
     * Async mode (deprecated - all operations are async)
     * @deprecated All HTTP operations are now async by default
     */
    get async() {
        return true;
    }
    set async(_enable) {
        // No-op: all operations are async
    }
    /**
     * CA certificate bundle file
     */
    get ca() {
        return this._ca || null;
    }
    set ca(bundle) {
        this._ca = bundle || undefined;
    }
    /**
     * Client certificate file
     */
    get certificate() {
        return this._certificate || null;
    }
    set certificate(certFile) {
        this._certificate = certFile || undefined;
    }
    /**
     * Private key file
     */
    get key() {
        return this._key || null;
    }
    set key(keyFile) {
        this._key = keyFile || undefined;
    }
    close() {
        // HTTP connections are managed by fetch API
    }
    /**
     * Response content length
     */
    get contentLength() {
        const length = this._responseHeaders['content-length'];
        return length ? parseInt(length) : -1;
    }
    /**
     * Response content type
     */
    get contentType() {
        return this._responseHeaders['content-type'] || '';
    }
    set contentType(value) {
        this._headers['Content-Type'] = value;
    }
    /**
     * Response date
     */
    get date() {
        const dateStr = this._responseHeaders['date'];
        return dateStr ? new Date(dateStr) : null;
    }
    /**
     * Request body length (for setting Content-Length)
     */
    get bodyLength() {
        return this._bodyLength;
    }
    set bodyLength(length) {
        this._bodyLength = length;
        if (length >= 0) {
            this.setHeader('Content-Length', String(length));
        }
    }
    /**
     * Use chunked transfer encoding
     */
    get chunked() {
        return this._chunked;
    }
    set chunked(enable) {
        this._chunked = enable;
        if (enable) {
            this.setHeader('Transfer-Encoding', 'chunked');
        }
    }
    /**
     * Character encoding for serializing strings
     */
    get encoding() {
        return this._encoding;
    }
    set encoding(enc) {
        this._encoding = enc;
    }
    /**
     * Response content encoding
     */
    get contentEncoding() {
        return this._responseHeaders['content-encoding'] || '';
    }
    /**
     * Expiration date from response
     */
    get expires() {
        const expiresStr = this._responseHeaders['expires'];
        return expiresStr ? new Date(expiresStr) : null;
    }
    /**
     * MIME type from content-type header
     */
    get mimeType() {
        const contentType = this.contentType;
        return contentType.split(';')[0].trim();
    }
    /**
     * Status code (alias for status)
     */
    get code() {
        return this._status;
    }
    /**
     * Status code as string
     */
    get codeString() {
        return this._status ? String(this._status) : '';
    }
    /**
     * Check if response data is available
     */
    get available() {
        return Math.max(0, this._response.length - this._readPosition);
    }
    /**
     * Get resource limits
     */
    get limits() {
        return { ...this._limits };
    }
    /**
     * Set resource limits
     * @param limits Limits object with properties like chunk, connReuse, etc.
     */
    setLimits(limits) {
        this._limits = { ...this._limits, ...limits };
    }
    /**
     * Get connection information
     */
    get info() {
        return {
            uri: this._uri?.toString(),
            method: this._method,
            status: this._status,
            statusMessage: this._statusMessage,
            contentLength: this.contentLength,
            contentType: this.contentType,
            isSecure: this.isSecure
        };
    }
    flush(_dir) {
        // Not applicable for HTTP
    }
    /**
     * Follow redirects automatically
     */
    get followRedirects() {
        return this._followRedirects;
    }
    set followRedirects(flag) {
        this._followRedirects = flag;
    }
    /**
     * Finalize the request
     */
    finalize() {
        this._finalized = true;
    }
    /**
     * Check if request is finalized
     */
    get finalized() {
        return this._finalized;
    }
    /**
     * Connect and make an HTTP request (async)
     * @param method HTTP method
     * @param uri URI to request
     * @param ...data Data to send
     * @returns Promise that resolves to this Http object for chaining
     */
    async connect(method, uri, ...data) {
        this._method = method;
        if (uri) {
            this._uri = typeof uri === 'string' ? new Uri(uri) : uri;
        }
        if (!this._uri) {
            throw new Error('No URI specified for HTTP request');
        }
        await this._performRequest(data);
        return this;
    }
    /**
     * Complete partial URLs for fetch API
     * Handles:
     * - '4100/index.html' -> 'http://127.0.0.1:4100/index.html'
     * - '127.0.0.1/index.html' -> 'http://127.0.0.1/index.html'
     * - ':4100/index.html' -> 'http://127.0.0.1:4100/index.html'
     * @param url URL string to complete
     * @returns Complete URL with scheme
     */
    _completeUrl(url) {
        // Already has a scheme (http:// or https://)
        if (/^https?:\/\//i.test(url)) {
            return url;
        }
        // Port number at start: '4100/path' -> 'http://127.0.0.1:4100/path'
        if (/^\d+\//.test(url)) {
            return `http://127.0.0.1:${url}`;
        }
        // Colon-port at start: ':4100/path' -> 'http://127.0.0.1:4100/path'
        if (/^:\d+/.test(url)) {
            return `http://127.0.0.1${url}`;
        }
        // IP address or hostname without scheme: '127.0.0.1/path' -> 'http://127.0.0.1/path'
        if (/^[\w\.\-]+[\/:]/.test(url)) {
            return `http://${url}`;
        }
        // Default case: assume localhost with path
        return `http://127.0.0.1/${url}`;
    }
    /**
     * Perform HTTP request
     */
    async _performRequest(data) {
        if (!this._uri)
            return;
        const fetchOptions = {
            method: this._method,
            headers: this._headers,
            redirect: this._followRedirects ? 'follow' : 'manual'
        };
        // Set timeout if configured
        const timeoutMs = this._limits.requestTimeout * 1000;
        if (timeoutMs > 0) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            fetchOptions.signal = controller.signal;
            try {
                await this._performFetchRequest(fetchOptions, data);
                clearTimeout(timeoutId);
            }
            catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${this._limits.requestTimeout}s`);
                }
                throw error;
            }
        }
        else {
            await this._performFetchRequest(fetchOptions, data);
        }
    }
    async _performFetchRequest(fetchOptions, data) {
        if (!this._uri)
            return;
        if (data.length > 0 && ['POST', 'PUT', 'PATCH'].includes(this._method)) {
            fetchOptions.body = this._formatData(data);
        }
        if (this.credentials) {
            const auth = btoa(`${this.credentials.username}:${this.credentials.password}`);
            this._headers['Authorization'] = `Basic ${auth}`;
        }
        // Complete partial URLs before passing to fetch
        const url = this._completeUrl(this._uri.toString());
        try {
            const response = await fetch(url, fetchOptions);
            this._status = response.status;
            this._statusMessage = response.statusText;
            response.headers.forEach((value, key) => {
                this._responseHeaders[key.toLowerCase()] = value;
            });
            this._response = await response.text();
            this._readPosition = 0;
            this.emitter.emit('complete', this);
        }
        catch (error) {
            this.emitter.emit('error', error);
            throw error;
        }
    }
    /**
     * Format data for request body
     */
    _formatData(data) {
        if (data.length === 1) {
            const item = data[0];
            if (typeof item === 'string') {
                return item;
            }
            else if (item instanceof Uint8Array) {
                return item;
            }
            else {
                return JSON.stringify(item);
            }
        }
        return data.map(d => String(d)).join('');
    }
    /**
     * POST request with form data
     * @param uri URI
     * @param data Form data object
     * @returns Promise that resolves to this Http object
     */
    async form(uri, data) {
        this.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        const encoded = Uri.encodeQuery(data);
        return this.connect('POST', uri, encoded);
    }
    /**
     * POST request with JSON data
     * @param uri URI
     * @param ...data Data objects
     * @returns Promise that resolves to this Http object
     */
    async jsonForm(uri, ...data) {
        this.setHeader('Content-Type', 'application/json');
        return this.connect('POST', uri, JSON.stringify(data.length === 1 ? data[0] : data));
    }
    /**
     * GET request
     * @param uri URI
     * @param ...data Optional data
     * @returns Promise that resolves to this Http object
     */
    async get(uri, ...data) {
        return this.connect('GET', uri, ...data);
    }
    /**
     * HEAD request
     * @param uri URI
     * @returns Promise that resolves to this Http object
     */
    async head(uri) {
        return this.connect('HEAD', uri);
    }
    /**
     * POST request
     * @param uri URI
     * @param ...data Data to post
     * @returns Promise that resolves to this Http object
     */
    async post(uri, ...data) {
        return this.connect('POST', uri, ...data);
    }
    /**
     * PUT request
     * @param uri URI
     * @param ...data Data to put
     * @returns Promise that resolves to this Http object
     */
    async put(uri, ...data) {
        return this.connect('PUT', uri, ...data);
    }
    /**
     * DELETE request
     * @param uri URI
     * @returns Promise that resolves to this Http object
     */
    async del(uri) {
        return this.connect('DELETE', uri);
    }
    /**
     * Get request headers that will be sent
     */
    getRequestHeaders() {
        return { ...this._headers };
    }
    /**
     * Get a single response header
     * @param key Header key
     * @returns Header value or null
     */
    header(key) {
        return this._responseHeaders[key.toLowerCase()] || null;
    }
    /**
     * Get all response headers
     */
    get headers() {
        return { ...this._responseHeaders };
    }
    /**
     * Check if connection is secure (HTTPS)
     */
    get isSecure() {
        return this._uri?.scheme === 'https';
    }
    /**
     * Last modified date
     */
    get lastModified() {
        const lastMod = this._responseHeaders['last-modified'];
        return lastMod ? new Date(lastMod) : null;
    }
    /**
     * HTTP method
     */
    get method() {
        return this._method;
    }
    set method(name) {
        this._method = name;
    }
    read(_buffer, _offset = 0, _count = -1) {
        // Simplified - would need streaming implementation
        return null;
    }
    /**
     * Read response as string
     * @param count Number of characters to read
     * @returns Response string
     */
    readString(count = -1) {
        if (count === -1) {
            const result = this._response.substring(this._readPosition);
            this._readPosition = this._response.length;
            return result;
        }
        const result = this._response.substring(this._readPosition, this._readPosition + count);
        this._readPosition += result.length;
        return result;
    }
    /**
     * Read response as lines
     * @param count Number of lines
     * @returns Array of lines
     */
    readLines(count = -1) {
        const lines = this._response.split(/\r?\n/);
        return count === -1 ? lines : lines.slice(0, count);
    }
    /**
     * Read response as XML
     * @returns XML object
     */
    readXml() {
        // Would need XML parser
        return this._response;
    }
    /**
     * Reset the HTTP object
     */
    reset() {
        this._headers = {};
        this._response = '';
        this._status = null;
        this._responseHeaders = {};
        this._finalized = false;
        this._readPosition = 0;
    }
    /**
     * Get response body
     */
    get response() {
        return this._response;
    }
    set response(data) {
        this._response = data;
    }
    /**
     * Get/set retry count
     */
    get retries() {
        return this._retries;
    }
    set retries(count) {
        this._retries = count;
    }
    /**
     * Get session cookie
     */
    get sessionCookie() {
        const cookie = this.header('Set-Cookie');
        if (cookie) {
            const match = cookie.match(/(-ejs-session-=[^;]*);/);
            return match ? match[1] : null;
        }
        return null;
    }
    /**
     * Set cookie header
     * @param cookie Cookie value
     */
    setCookie(cookie) {
        this.setHeader('Cookie', cookie);
    }
    /**
     * Set credentials
     * @param username Username
     * @param password Password
     * @param type Auth type (basic or digest)
     */
    setCredentials(username, password, type = null) {
        if (username === null || password === null) {
            this.credentials = undefined;
            // Clear the Authorization header when credentials are removed
            delete this._headers['Authorization'];
        }
        else {
            this.credentials = { username, password, type: type || undefined };
        }
    }
    /**
     * Set a request header
     * @param key Header key
     * @param value Header value
     * @param overwrite Overwrite existing header
     */
    setHeader(key, value, overwrite = true) {
        if (overwrite || !(key in this._headers)) {
            this._headers[key] = value;
        }
        else {
            this._headers[key] += ', ' + value;
        }
    }
    /**
     * Add a request header (Ejscript compatibility alias for setHeader)
     * @param key Header key
     * @param value Header value
     * @param overwrite Overwrite existing header (default true)
     */
    addHeader(key, value, overwrite = true) {
        this.setHeader(key, value, overwrite);
    }
    /**
     * Set multiple request headers
     * @param headers Headers object
     * @param overwrite Overwrite existing headers
     */
    setHeaders(headers, overwrite = true) {
        for (const [key, value] of Object.entries(headers)) {
            this.setHeader(key, value, overwrite);
        }
    }
    /**
     * Remove a request header
     * @param key Header key to remove
     */
    removeHeader(key) {
        delete this._headers[key];
    }
    /**
     * Get HTTP status code
     */
    get status() {
        return this._status;
    }
    /**
     * Get HTTP status message
     */
    get statusMessage() {
        return this._statusMessage;
    }
    /**
     * Check if request was successful (2xx status)
     */
    get success() {
        return this._status !== null && this._status >= 200 && this._status < 300;
    }
    /**
     * Configure request tracing
     * @param options Trace options
     */
    trace(_options) {
        // Would configure debug tracing
    }
    /**
     * Upload files
     * @param uri URI
     * @param files Files to upload
     * @param fields Form fields
     * @returns Promise that resolves to this Http object
     */
    async upload(uri, files, fields) {
        // Simplified multipart upload
        const boundary = '----FormBoundary' + Math.random().toString(36);
        this.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
        let body = '';
        // Add fields
        if (fields) {
            for (const [key, value] of Object.entries(fields)) {
                body += `--${boundary}\r\n`;
                body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
                body += `${value}\r\n`;
            }
        }
        // Add files (simplified)
        if (typeof files === 'object') {
            for (const [key, file] of Object.entries(files)) {
                const filePath = new Path(String(file));
                body += `--${boundary}\r\n`;
                body += `Content-Disposition: form-data; name="${key}"; filename="${filePath.basename}"\r\n`;
                body += `Content-Type: ${filePath.mimeType}\r\n\r\n`;
                body += filePath.readString() || '';
                body += '\r\n';
            }
        }
        body += `--${boundary}--\r\n`;
        return this.connect('POST', uri, body);
    }
    /**
     * Get/set URI
     */
    get uri() {
        return this._uri;
    }
    set uri(newUri) {
        this._uri = typeof newUri === 'string' ? new Uri(newUri) : newUri;
    }
    /**
     * Verify peer certificates
     */
    get verify() {
        return this._verify;
    }
    set verify(enable) {
        this._verify = enable;
        this._verifyIssuer = enable;
    }
    /**
     * Verify certificate issuer
     */
    get verifyIssuer() {
        return this._verifyIssuer;
    }
    set verifyIssuer(enable) {
        this._verifyIssuer = enable;
    }
    /**
     * Wait for request to complete
     * @param timeout Timeout in milliseconds
     * @returns True if completed successfully
     */
    wait(_timeout = -1) {
        // Would implement async waiting
        return this._status !== null;
    }
    write(..._data) {
        // HTTP write would buffer data for sending
        return 0;
    }
    on(name, observer) {
        this.emitter.on(name, observer);
        return this;
    }
    off(name, observer) {
        this.emitter.off(name, observer);
    }
}
//# sourceMappingURL=Http.js.map