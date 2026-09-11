/*
    server.js -- The background server a setup script starts

    Started by setup.js as a child, so it is a grandchild of tm. That is the shape the teardown
    used to miss: a signal to the setup script never reached it, and it outlived the run still
    holding its port.

    Records its pid so ../service-teardown.tst.ts can check it is gone, and records that it was
    asked to stop before it stopped, so the graceful path is checked as well as the forceful one.
 */

import {writeFileSync} from 'fs'
import {join} from 'path'

const PORT = 18099
const stateDir = import.meta.dir

const server = Bun.listen({
    hostname: 'localhost',
    port: PORT,
    socket: {
        open(socket) {
            socket.end()
        },
        data(socket) {
            socket.end()
        },
        error(socket, error) {
            console.error('Socket error:', error)
        },
    },
})

writeFileSync(join(stateDir, 'server.pid'), String(process.pid))
console.log(`Background server listening on localhost:${server.port}`)

process.on('SIGTERM', () => {
    writeFileSync(join(stateDir, 'graceful'), 'SIGTERM')
    server.stop(true)
    process.exit(0)
})

//  Keep running until torn down
await new Promise(() => {})
