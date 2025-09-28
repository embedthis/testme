#include "testme.h"

static void api() {
    // Expect to pass
    int v = 3;

    printf("Using testme.h (api) ...\n");
    // Without message
    ttrue(v == 3);
    // With message
    ttrue(v == 3, "Should be 3");
    tfalse(v == 5, "Should not be 5");
    tcontains("Hello World", "World", "Message for the world");
    tmatch("World", "World", "Message for the world");

#if EXPECT_TO_FAIL
    // Expect to fail
    v = 5;
    ttrue(v == 3, "Should not be 3");
    tfalse(v == 3, "Should be 3");
    tcontains("Hello World", "Cruel", "Message for the cruel world");
    tmatch("Hello", "World", "Message for the world");
#endif
}

int main() {
    api();
    printf("All C tests complete!\n");
    return 0;
}
