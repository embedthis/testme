import { describe, it, expect, beforeAll, afterAll } from 'testme'
import { Http } from '../src/core/Http'
import { TestServer } from './helpers/test-server'

const TEST_PORT = 4403
let server: TestServer

await describe('Async Stream Debug', async () => {
    beforeAll(async () => {
        server = new TestServer({ port: TEST_PORT })
        await server.start()
    })

    afterAll(async () => {
        if (server) {
            await server.stop()
        }
    })

    it('should handle async data generation in stream', async () => {
        const stream = new ReadableStream({
            async start(controller) {
                console.log('[stream] Starting...')
                for (let i = 0; i < 5; i++) {
                    await new Promise(resolve => setTimeout(resolve, 10))
                    const chunk = `Async${i} `
                    console.log('[stream] Enqueuing:', chunk)
                    controller.enqueue(new TextEncoder().encode(chunk))
                }
                console.log('[stream] Closing')
                controller.close()
            }
        })

        const http = new Http()
        console.log('[http] Posting stream...')
        http.post(`127.0.0.1:${TEST_PORT}/echo`, stream)
        console.log('[http] Waiting...')
        await http.wait()

        console.log('[http] Status:', http.status)
        console.log('[http] Response:', http.response)
        
        expect(http.status).toBe(200)
        const response = JSON.parse(http.response)
        expect(response.body).toBe('Async0 Async1 Async2 Async3 Async4 ')
    })
})
