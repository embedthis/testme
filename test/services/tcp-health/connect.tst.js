/*
    Test TCP connection to server
*/

try {
    const socket = await Bun.connect({
        hostname: 'localhost',
        port: 8898,
        socket: {
            data(socket, data) {
                socket.end();
            },
            open(socket) {
                console.log('✓ Successfully connected to TCP server');
                socket.end();
            },
            close(socket) {
                process.exit(0);
            },
            error(socket, error) {
                console.error('Connection error:', error);
                process.exit(1);
            },
        },
    });
} catch (error) {
    console.error('Failed to connect:', error);
    process.exit(1);
}
