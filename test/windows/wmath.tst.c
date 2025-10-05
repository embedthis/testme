// C test example for Windows
// This test should work with MSVC, MinGW, or Clang on Windows

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Simple test macros
#define TEST_EQ(a, b, msg) do { \
    if ((a) != (b)) { \
        printf("✗ FAIL: %s (expected %d, got %d)\n", msg, (int)(b), (int)(a)); \
        return 1; \
    } else { \
        printf("✓ PASS: %s\n", msg); \
    } \
} while(0)

#define TEST_TRUE(expr, msg) do { \
    if (!(expr)) { \
        printf("✗ FAIL: %s\n", msg); \
        return 1; \
    } else { \
        printf("✓ PASS: %s\n", msg); \
    } \
} while(0)

int add(int a, int b) {
    return a + b;
}

int main() {
    printf("Running C math tests on Windows...\n");

    // Test basic arithmetic
    TEST_EQ(add(2, 3), 5, "Addition test");
    TEST_EQ(add(10, -5), 5, "Addition with negative");
    TEST_TRUE(add(5, 0) == 5, "Identity test");

    // Test environment variable access
    const char *verbose = getenv("TESTME_VERBOSE");
    if (verbose != NULL) {
        printf("Verbose mode enabled: %s\n", verbose);
    }

    printf("✓ All C tests passed\n");
    return 0;
}
