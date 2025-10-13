/*
    iterations.tst.ts - Test that TESTME_ITERATIONS is exported (defaults to 1)
 */

console.log('Testing TESTME_ITERATIONS environment variable...\n');

const iterations = process.env.TESTME_ITERATIONS;

if (iterations === undefined) {
    console.error('✗ TESTME_ITERATIONS is not defined');
    process.exit(1);
}

console.log(`✓ TESTME_ITERATIONS = ${iterations}`);

const iterCount = parseInt(iterations, 10);
if (isNaN(iterCount) || iterCount < 1) {
    console.error(`✗ TESTME_ITERATIONS should be a positive number: ${iterations}`);
    process.exit(1);
}

console.log(`✓ TESTME_ITERATIONS is a valid positive number: ${iterCount}`);
console.log('\n✓ TESTME_ITERATIONS test passed!');
process.exit(0);
