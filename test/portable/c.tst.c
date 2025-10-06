#include <stdio.h>
#include <assert.h>
#include <stdlib.h>
#include <unistd.h>

int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}

int divide(int a, int b) {
    if (b == 0) {
        fprintf(stderr, "Error: Division by zero\n");
        return -1;
    }
    return a / b;
}

int subtract(int a, int b) {
    return a - b;
}

int main() {
    printf("Running C math tests...\n");

    // Check for verbose mode
    if (getenv("TESTME_VERBOSE")) {
        printf("VERBOSE MODE: Running detailed math tests\n");
    }

    // Test addition
    int sum = add(2, 3);
    assert(sum == 5);
    printf("✓ Addition test passed: 2 + 3 = %d\n", sum);

    // Test multiplication
    int product = multiply(4, 5);
    assert(product == 20);
    printf("✓ Multiplication test passed: 4 * 5 = %d\n", product);

    // Test subtraction
    int difference = subtract(10, 4);
    assert(difference == 6);
    printf("✓ Subtraction test passed: 10 - 4 = %d\n", difference);

    // Test division - this should pass
    int quotient = divide(15, 3);
    assert(quotient == 5);
    printf("✓ Division test passed: 15 / 3 = %d\n", quotient);

    // Test division by zero - this should handle error gracefully
    int zero_div = divide(10, 0);
    assert(zero_div == -1);
    printf("✓ Division by zero handled correctly\n");

    // FAILING TEST - This will cause the test to fail
    // Uncomment the line below to see a failing test example:
    // assert(add(2, 2) == 5); // This will fail since 2+2=4, not 5

    printf("All C tests passed!\n");
    return 0;
}
