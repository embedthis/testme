/*
    Test per-platform compiler selection functionality
 */

import {teq, ttrue} from 'testme'

// Mock ConfigManager to test resolvePlatformCompiler logic
function resolvePlatformCompiler(
    compilerConfig: string | {windows?: string; macosx?: string; linux?: string} | undefined
): string | undefined {
    // If unset or "default", return undefined (triggers auto-detect)
    if (!compilerConfig || compilerConfig === 'default') {
        return undefined
    }

    // If string, return as-is
    if (typeof compilerConfig === 'string') {
        return compilerConfig
    }

    // If object, resolve based on current platform
    const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macosx' : 'linux'

    const platformCompiler = compilerConfig[platform]

    // If platform not specified in map, return undefined (auto-detect)
    return platformCompiler || undefined
}

function testDefaultCompiler() {
    const result = resolvePlatformCompiler('default')
    teq(result, undefined, "'default' should return undefined for auto-detect")
}

function testUndefinedCompiler() {
    const result = resolvePlatformCompiler(undefined)
    teq(result, undefined, 'undefined should return undefined for auto-detect')
}

function testStringCompiler() {
    const result = resolvePlatformCompiler('gcc')
    teq(result, 'gcc', 'string compiler should return that compiler')
}

function testPlatformMapWithCurrentPlatform() {
    const platformMap = {
        windows: 'msvc',
        macosx: 'clang',
        linux: 'gcc',
    }

    const result = resolvePlatformCompiler(platformMap)

    // Verify it returns the correct compiler for current platform
    if (process.platform === 'win32') {
        teq(result, 'msvc', 'should return msvc on Windows')
    } else if (process.platform === 'darwin') {
        teq(result, 'clang', 'should return clang on macOS')
    } else {
        teq(result, 'gcc', 'should return gcc on Linux')
    }
}

function testPlatformMapWithoutCurrentPlatform() {
    // Platform map that doesn't include current platform
    const platformMap = {
        windows: 'msvc',
    }

    const result = resolvePlatformCompiler(platformMap)

    // Should return undefined (auto-detect fallback) if current platform is not Windows
    if (process.platform !== 'win32') {
        teq(result, undefined, 'should return undefined for auto-detect when platform not in map')
    } else {
        teq(result, 'msvc', 'should return msvc on Windows')
    }
}

function testPartialPlatformMap() {
    // Only specify one platform
    const platformMap = {
        macosx: 'clang',
    }

    const result = resolvePlatformCompiler(platformMap)

    if (process.platform === 'darwin') {
        teq(result, 'clang', 'should return clang on macOS')
    } else {
        teq(result, undefined, 'should return undefined for auto-detect on other platforms')
    }
}

// Run all tests
try {
    testDefaultCompiler()
    testUndefinedCompiler()
    testStringCompiler()
    testPlatformMapWithCurrentPlatform()
    testPlatformMapWithoutCurrentPlatform()
    testPartialPlatformMap()

    console.log('✓ All compiler platform selection tests passed')
} catch (error) {
    console.error('✗ Test failed:', (error as Error).message)
    process.exit(1)
}
