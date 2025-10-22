/*
    Simple TCP server for health check testing
*/

const server = Bun.listen({
    hostname: 'localhost',
    port: 8898,
    socket: {
        data(socket, data) {
            socket.end()
        },
        open(socket) {
            // Connection accepted
        },
        close(socket) {
            // Connection closed
        },
        error(socket, error) {
            console.error('Socket error:', error)
        },
    },
})

console.log(`TCP server listening on localhost:${server.port}`)

// Keep process running
await new Promise(() => {})
