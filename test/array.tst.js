// JavaScript test file
console.log("Running JavaScript array tests...");

function testArrayOperations() {
    const arr = [1, 2, 3, 4, 5];

    // Test array length
    if (arr.length !== 5) {
        throw new Error("Array length test failed");
    }
    console.log("✓ Array length test passed");

    // Test array sum
    const sum = arr.reduce((acc, val) => acc + val, 0);
    if (sum !== 15) {
        throw new Error("Array sum test failed");
    }
    console.log("✓ Array sum test passed");

    // Test array filter
    const evens = arr.filter((n) => n % 2 === 0);
    if (evens.length !== 2 || !evens.includes(2) || !evens.includes(4)) {
        throw new Error("Array filter test failed");
    }
    console.log("✓ Array filter test passed");
}

try {
    testArrayOperations();
    console.log("All JavaScript tests passed!");
} catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
}
