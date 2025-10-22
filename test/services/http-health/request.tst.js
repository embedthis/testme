/*
    Test that server is responding
*/

const response = await fetch('http://localhost:8899/health')
const text = await response.text()

if (response.status !== 200) {
    console.error(`Expected status 200, got ${response.status}`)
    process.exit(1)
}

if (text !== 'OK') {
    console.error(`Expected body 'OK', got '${text}'`)
    process.exit(1)
}

console.log('✓ Server is healthy and responding correctly')
process.exit(0)
