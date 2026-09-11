/*
    setup.js -- A setup service that backgrounds its server, as a real one does

    Stays alive itself so TestMe sees a running setup service, while the server that holds the port
    is a separate process. Nothing here kills the server: tearing it down is TestMe's job, and the
    point of the fixture is that it does.
 */

import {writeFileSync} from 'fs'
import {join} from 'path'

const child = Bun.spawn(['bun', join(import.meta.dir, 'server.js')], {
    cwd: import.meta.dir,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'ignore',
})

writeFileSync(join(import.meta.dir, 'setup.pid'), String(process.pid))
console.log(`Setup service ${process.pid} started server ${child.pid}`)

//  Keep running until torn down
await new Promise(() => {})
