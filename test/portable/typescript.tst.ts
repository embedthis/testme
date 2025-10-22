// TypeScript test file
console.log('Running TypeScript string tests...')

interface TestResult {
    name: string
    passed: boolean
    message?: string
}

function testStringOperations(): TestResult[] {
    const results: TestResult[] = []

    // Test string concatenation
    const str1 = 'Hello'
    const str2 = 'World'
    const combined = `${str1} ${str2}`
    results.push({
        name: 'String concatenation',
        passed: combined === 'Hello World',
        message: `Expected "Hello World", got "${combined}"`,
    })

    // Test string length
    const testStr = 'TypeScript'
    results.push({
        name: 'String length',
        passed: testStr.length === 10,
        message: `Expected length 10, got ${testStr.length}`,
    })

    // Test string includes
    results.push({
        name: 'String includes',
        passed: testStr.includes('Script'),
        message: `Expected "${testStr}" to include "Script"`,
    })

    // Test string uppercase
    const upperStr = testStr.toUpperCase()
    results.push({
        name: 'String uppercase',
        passed: upperStr === 'TYPESCRIPT',
        message: `Expected "TYPESCRIPT", got "${upperStr}"`,
    })

    return results
}

function runTests(): void {
    const results = testStringOperations()
    let passed = 0
    let failed = 0

    for (const result of results) {
        if (result.passed) {
            console.log(`✓ ${result.name} test passed`)
            passed++
        } else {
            console.error(`✗ ${result.name} test failed: ${result.message}`)
            failed++
        }
    }

    console.log(`\nTypeScript tests completed: ${passed} passed, ${failed} failed`)

    if (failed > 0) {
        process.exit(1)
    }
}

runTests()
