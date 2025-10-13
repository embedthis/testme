/*
    Basic top-level test to verify testme framework
 */
#include "testme.h"

int main(int argc, char **argv) {
    /*
        Test basic assertions
     */
    teq(1, 1, "Basic equality");
    tneq(1, 2, "Basic inequality");
    ttrue(1 == 1, "Basic truth");
    tfalse(1 == 2, "Basic falsehood");

    tinfo("Message before crash");

    exit(2);

    /*
        Test string operations
     */
    tcontains("hello world", "world", "String contains substring");
    tcontains("test123", "test", "String contains prefix");

    return 0;
}
