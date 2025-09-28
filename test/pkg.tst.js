/*
    pkg.tst.js - JavaScript test file using testme.js
 */

import { tcontains, ttrue, tfalse, tmatch, teq, tneq } from "./testme.js";

console.log("Running JavaScript array tests...");

function testArrayOperations() {
    const arr = [1, 2, 3, 4, 5];

    // Test array length
    ttrue(arr.length === 5, "Array length should be 5");
    tfalse(arr.length !== 5, "Array length should be 5");
    tmatch("Hello", "Hello", "Hello should match Hello");
    tcontains("Hello World", "Hello", "Hello World should contain Hello");
    teq(1, 1, "1 should be equal to 1");
    tneq(2, 1, "2 should not be equal to 1");

    /*
        ttrue(false, "SHOULD BE TRUE");
     */
}

try {
    testArrayOperations();
    console.log("All JavaScript tests passed!");
} catch (error) {
    console.error("Test failed:", error.message);
    process.exit(1);
}
