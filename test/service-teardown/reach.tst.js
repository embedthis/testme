/*
    reach.tst.js -- Confirms the backgrounded server is up while the tests run

    Run only by ../service-teardown.tst.ts. See the sibling testme.json5: this directory is
    enable:'manual'.
 */

import {ttrue} from 'testme'

const socket = await Bun.connect({
    hostname: 'localhost',
    port: 18099,
    socket: {
        open(socket) {
            socket.end()
        },
        data(socket) {
            socket.end()
        },
        error(socket, error) {
            console.error('Connection error:', error)
        },
    },
})

ttrue(socket !== undefined, 'the backgrounded server is reachable during the run')
socket.end()
