/*
    Simple HTTP server for health check testing
    Responds to /health endpoint
*/

const server = Bun.serve({
    port: 8899,
    fetch(req) {
        const url = new URL(req.url)

        if (url.pathname === '/health') {
            return new Response('OK', {status: 200})
        }

        return new Response('Not Found', {status: 404})
    },
})

console.log(`Server running on ${server.url}`)
