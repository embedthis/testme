import {GlobExpansion} from '../../src/utils/glob-expansion.ts'
import {teq} from 'testme'

console.log('Testing environment variable expansion in glob-expansion...')

// Test 1: Expand ${PATH} environment variable
const pathTest = 'someDir:${PATH}'
const expandedPath = await GlobExpansion.expandSingle(pathTest, '/tmp')

// Should contain the actual PATH value
if (process.env.PATH) {
    teq(expandedPath.includes(process.env.PATH), true, '${PATH} should be expanded to actual PATH value')
    console.log('✓ ${PATH} expansion works')
} else {
    console.log('⚠ PATH not set in environment (unusual but not an error)')
}

// Test 2: Expand ${HOME} environment variable
const homeTest = '${HOME}/mydir'
const expandedHome = await GlobExpansion.expandSingle(homeTest, '/tmp')

if (process.env.HOME) {
    teq(expandedHome.startsWith(process.env.HOME), true, '${HOME} should be expanded')
    console.log('✓ ${HOME} expansion works')
} else {
    console.log('⚠ HOME not set in environment')
}

// Test 3: Non-existent environment variable should be kept as-is for glob expansion
const nonExistent = 'test/${NONEXISTENT_VAR}/path'
const expandedNonExistent = await GlobExpansion.expandSingle(nonExistent, '/tmp')

// Should still contain the pattern since it doesn't exist in env
teq(
    expandedNonExistent.includes('NONEXISTENT_VAR'),
    true,
    'Non-existent env vars should be preserved for glob matching'
)
console.log('✓ Non-existent env var handling works')

// Test 4: Multiple environment variables
if (process.env.PATH && process.env.HOME) {
    const multiTest = '${HOME}/bin:${PATH}'
    const expandedMulti = await GlobExpansion.expandSingle(multiTest, '/tmp')

    teq(expandedMulti.includes(process.env.HOME), true, 'First env var should be expanded')
    teq(expandedMulti.includes(process.env.PATH), true, 'Second env var should be expanded')
    console.log('✓ Multiple env var expansion works')
}

console.log('All environment variable expansion tests passed!')
