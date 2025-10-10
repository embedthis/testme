/*
    Test file to demonstrate new type-specific test macros
 */
#include "testme.h"
#include <stddef.h>

int main(int argc, char **argv) {
    int i_val = 42;
    long l_val = 1234567L;
    long long ll_val = 9876543210LL;
    size_t z_val = 1024;
    unsigned int u_val = 0xFF;
    void *ptr = &i_val;
    void *null_ptr = NULL;

    //  Integer equality tests
    teqi(i_val, 42, "Integer equality test");
    tneqi(i_val, 0, "Integer inequality test");

    //  Long equality tests
    teql(l_val, 1234567L, "Long equality test");
    tneql(l_val, 0L, "Long inequality test");

    //  Long long equality tests
    teqll(ll_val, 9876543210LL, "Long long equality test");
    tneqll(ll_val, 0LL, "Long long inequality test");

    //  Size equality tests
    teqz(z_val, 1024, "Size_t equality test");
    tneqz(z_val, 0, "Size_t inequality test");

    //  Unsigned equality tests
    tequ(u_val, 0xFF, "Unsigned int equality test");
    tnequ(u_val, 0, "Unsigned int inequality test");

    //  Pointer equality tests
    teqp(null_ptr, NULL, "Pointer NULL equality test");
    tneqp(ptr, NULL, "Pointer non-NULL inequality test");

    //  NULL checking macros
    tnull(null_ptr, "Pointer should be NULL");
    tnotnull(ptr, "Pointer should not be NULL");

    //  Comparison tests - greater than
    tgti(i_val, 0, "Integer greater than test");
    tgtl(l_val, 1000000L, "Long greater than test");
    tgtz(z_val, 512, "Size greater than test");

    //  Comparison tests - greater than or equal
    tgtei(i_val, 42, "Integer greater than or equal test");
    tgtel(l_val, 1234567L, "Long greater than or equal test");
    tgtez(z_val, 1024, "Size greater than or equal test");

    //  Comparison tests - less than
    tlti(i_val, 100, "Integer less than test");
    tltl(l_val, 10000000L, "Long less than test");
    tltz(z_val, 2048, "Size less than test");

    //  Comparison tests - less than or equal
    tltei(i_val, 42, "Integer less than or equal test");
    tltel(l_val, 1234567L, "Long less than or equal test");
    tltez(z_val, 1024, "Size less than or equal test");

    //  String tests
    tmatch("hello", "hello", "String match test");
    tcontains("hello world", "world", "String contains test");

    //  Boolean tests
    ttrue(1, "True test");
    tfalse(0, "False test");

    //  Test legacy teq/tneq (should work via aliases)
    teq(i_val, 42, "Legacy teq test");
    tneq(i_val, 0, "Legacy tneq test");

    return 0;
}
