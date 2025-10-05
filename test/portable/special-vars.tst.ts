/*
    special-vars.tst.ts - Test special variable expansion
    Tests ${PLATFORM}, ${OS}, ${ARCH}, ${CC}, ${PROFILE}, ${CONFIGDIR}, ${TESTDIR}
 */

import { GlobExpansion } from '../../src/utils/glob-expansion.ts';

async function testSpecialVariables() {
    console.log('Testing special variable expansion...');

    // Create test special variables
    const specialVars = GlobExpansion.createSpecialVariables(
        '/path/to/artifact',
        '/path/to/test',
        '/path/to/config',
        'gcc',
        'debug'
    );

    console.log('Special variables:', specialVars);

    // Test PLATFORM expansion
    const platformTest = '${PLATFORM}';
    const platformExpanded = await GlobExpansion.expandString(platformTest, '/tmp', specialVars);
    console.log(`✓ PLATFORM: ${platformExpanded[0]}`);
    if (!platformExpanded[0].includes('-')) {
        throw new Error(`PLATFORM should contain hyphen: ${platformExpanded[0]}`);
    }

    // Test OS expansion
    const osTest = '${OS}';
    const osExpanded = await GlobExpansion.expandString(osTest, '/tmp', specialVars);
    console.log(`✓ OS: ${osExpanded[0]}`);
    if (!['macosx', 'linux', 'windows'].includes(osExpanded[0])) {
        throw new Error(`OS should be macosx/linux/windows: ${osExpanded[0]}`);
    }

    // Test ARCH expansion
    const archTest = '${ARCH}';
    const archExpanded = await GlobExpansion.expandString(archTest, '/tmp', specialVars);
    console.log(`✓ ARCH: ${archExpanded[0]}`);
    if (!['arm64', 'x64', 'x86'].includes(archExpanded[0])) {
        throw new Error(`ARCH should be arm64/x64/x86: ${archExpanded[0]}`);
    }

    // Test CC expansion
    const ccTest = '${CC}';
    const ccExpanded = await GlobExpansion.expandString(ccTest, '/tmp', specialVars);
    console.log(`✓ CC: ${ccExpanded[0]}`);
    if (ccExpanded[0] !== 'gcc') {
        throw new Error(`CC should be gcc: ${ccExpanded[0]}`);
    }

    // Test PROFILE expansion
    const profileTest = '${PROFILE}';
    const profileExpanded = await GlobExpansion.expandString(profileTest, '/tmp', specialVars);
    console.log(`✓ PROFILE: ${profileExpanded[0]}`);
    if (profileExpanded[0] !== 'debug') {
        throw new Error(`PROFILE should be debug: ${profileExpanded[0]}`);
    }

    // Test CONFIGDIR expansion
    const configDirTest = '${CONFIGDIR}';
    const configDirExpanded = await GlobExpansion.expandString(configDirTest, '/tmp', specialVars);
    console.log(`✓ CONFIGDIR: ${configDirExpanded[0]}`);

    // Test TESTDIR expansion
    const testDirTest = '${TESTDIR}';
    const testDirExpanded = await GlobExpansion.expandString(testDirTest, '/tmp', specialVars);
    console.log(`✓ TESTDIR: ${testDirExpanded[0]}`);

    // Test combined expansion
    const combinedTest = 'build/${PLATFORM}-${PROFILE}/bin';
    const combinedExpanded = await GlobExpansion.expandString(combinedTest, '/tmp', specialVars);
    console.log(`✓ Combined: ${combinedExpanded[0]}`);
    if (!combinedExpanded[0].includes('build/') || !combinedExpanded[0].includes('-debug/bin')) {
        throw new Error(`Combined expansion failed: ${combinedExpanded[0]}`);
    }

    // Test multiple variable types
    const multiTest = '${OS}/${ARCH}/${CC}/${PROFILE}';
    const multiExpanded = await GlobExpansion.expandString(multiTest, '/tmp', specialVars);
    console.log(`✓ Multiple vars: ${multiExpanded[0]}`);
    const parts = multiExpanded[0].split('/');
    if (parts.length !== 4) {
        throw new Error(`Multiple expansion should have 4 parts: ${multiExpanded[0]}`);
    }

    // Test array expansion
    const arrayTest = [
        'include/${PLATFORM}',
        'lib/${PLATFORM}-${PROFILE}',
        '${CC}/bin'
    ];
    const arrayExpanded = await GlobExpansion.expandArray(arrayTest, '/tmp', specialVars);
    console.log(`✓ Array expansion: ${arrayExpanded.length} items`);
    if (arrayExpanded.length !== 3) {
        throw new Error(`Array should have 3 items: ${arrayExpanded.length}`);
    }
    for (const item of arrayExpanded) {
        if (item.includes('${')) {
            throw new Error(`Array item not fully expanded: ${item}`);
        }
    }

    // Test no expansion when no variables
    const noVarTest = 'plain/path/no/vars';
    const noVarExpanded = await GlobExpansion.expandString(noVarTest, '/tmp', specialVars);
    console.log(`✓ No vars: ${noVarExpanded[0]}`);
    if (noVarExpanded[0] !== noVarTest) {
        throw new Error(`Plain path should not change: ${noVarExpanded[0]}`);
    }

    console.log('\n✓ All special variable expansion tests passed!');
}

// Run the test
testSpecialVariables()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Test failed:', error.message);
        process.exit(1);
    });
