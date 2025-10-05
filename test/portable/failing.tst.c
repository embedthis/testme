#include <stdio.h>
#include <assert.h>
#include <stdlib.h>

int buggy_add(int a, int b) {
    // This function has a bug - it adds 1 extra
    return a + b + 1;
}

int main(void) {
    char *depth;

    printf("Running failing C test example...\n");

    // Check for verbose mode
    if (getenv("TESTME_VERBOSE")) {
        printf("VERBOSE MODE: This test will demonstrate a failure\n");
        printf("VERBOSE MODE: Testing buggy_add function\n");
    }
    // Check for depth mode
    if ((depth = getenv("TESTME_DEPTH")) != NULL) {
        printf("DEPTH: %s\n", depth);
    }

    printf("Testing buggy_add(2, 3) - expecting 5...\n");

    // This will fail because buggy_add returns 6 instead of 5
    int result = buggy_add(2, 3);
    printf("buggy_add(2, 3) returned: %d\n", result);

#if EXPECT_TO_FAIL
    // This assertion will fail
    assert(result == 5);
    printf("This line should not be reached\n");
#endif

    return 0;
}
