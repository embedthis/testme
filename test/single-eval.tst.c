/*
    single-eval.tst.c -- Verify assertion macros evaluate each operand exactly once

    Regression test for issue #10000. The two-operand macros used to expand each operand twice --
    once for the comparison and once for the report call -- so any operand with a side effect ran
    twice and the assertion still passed.
 */
#include "testme.h"
#include <stddef.h>

static int calls = 0;

static int bumpInt(int value) {
    calls++;
    return value;
}

static long bumpLong(long value) {
    calls++;
    return value;
}

static long long bumpLongLong(long long value) {
    calls++;
    return value;
}

static size_t bumpSize(size_t value) {
    calls++;
    return value;
}

static unsigned int bumpUnsigned(unsigned int value) {
    calls++;
    return value;
}

static void *bumpPtr(void *value) {
    calls++;
    return value;
}

static char *bumpString(char *value) {
    calls++;
    return value;
}

/*
    Run one assertion with every operand wrapped in a counting call, then verify the counter.
    The assertion is passed as __VA_ARGS__ so its own commas survive macro expansion.
 */
#define CHECK(label, expected, ...) \
    if (1) { \
        calls = 0; \
        __VA_ARGS__; \
        teqi(calls, expected, "%s evaluates its operands exactly once", label); \
    } else

int main(int argc, char **argv) {
    int  value = 42;
    char text[8];
    char abc[] = "abc";
    char abcdef[] = "abcdef";
    char cde[] = "cde";

    //  The reproducer from the issue: the assertion passes and the operand ran once
    calls = 0;
    teqi(bumpInt(7), 7, "bumpInt returns 7");
    teqi(calls, 1, "bumpInt was called once");

    //  Equality families, both operands counted
    CHECK("teqi", 2, teqi(bumpInt(1), bumpInt(1)));
    CHECK("teql", 2, teql(bumpLong(1L), bumpLong(1L)));
    CHECK("teqll", 2, teqll(bumpLongLong(1LL), bumpLongLong(1LL)));
    CHECK("teqz", 2, teqz(bumpSize(1), bumpSize(1)));
    CHECK("tequ", 2, tequ(bumpUnsigned(1u), bumpUnsigned(1u)));
    CHECK("teqp", 2, teqp(bumpPtr(&value), bumpPtr(&value)));

    //  Inequality families
    CHECK("tneqi", 2, tneqi(bumpInt(1), bumpInt(2)));
    CHECK("tneql", 2, tneql(bumpLong(1L), bumpLong(2L)));
    CHECK("tneqll", 2, tneqll(bumpLongLong(1LL), bumpLongLong(2LL)));
    CHECK("tneqz", 2, tneqz(bumpSize(1), bumpSize(2)));
    CHECK("tnequ", 2, tnequ(bumpUnsigned(1u), bumpUnsigned(2u)));
    CHECK("tneqp", 2, tneqp(bumpPtr(&value), bumpPtr(NULL)));

    //  Ordering families
    CHECK("tgti", 2, tgti(bumpInt(2), bumpInt(1)));
    CHECK("tgtl", 2, tgtl(bumpLong(2L), bumpLong(1L)));
    CHECK("tgtll", 2, tgtll(bumpLongLong(2LL), bumpLongLong(1LL)));
    CHECK("tgtz", 2, tgtz(bumpSize(2), bumpSize(1)));
    CHECK("tgtei", 2, tgtei(bumpInt(2), bumpInt(2)));
    CHECK("tgtel", 2, tgtel(bumpLong(2L), bumpLong(2L)));
    CHECK("tgtell", 2, tgtell(bumpLongLong(2LL), bumpLongLong(2LL)));
    CHECK("tgtez", 2, tgtez(bumpSize(2), bumpSize(2)));
    CHECK("tlti", 2, tlti(bumpInt(1), bumpInt(2)));
    CHECK("tltl", 2, tltl(bumpLong(1L), bumpLong(2L)));
    CHECK("tltll", 2, tltll(bumpLongLong(1LL), bumpLongLong(2LL)));
    CHECK("tltz", 2, tltz(bumpSize(1), bumpSize(2)));
    CHECK("tltei", 2, tltei(bumpInt(2), bumpInt(2)));
    CHECK("tltel", 2, tltel(bumpLong(2L), bumpLong(2L)));
    CHECK("tltell", 2, tltell(bumpLongLong(2LL), bumpLongLong(2LL)));
    CHECK("tltez", 2, tltez(bumpSize(2), bumpSize(2)));

    //  Deprecated aliases resolve to the fixed macros
    CHECK("teq", 2, teq(bumpInt(1), bumpInt(1)));
    CHECK("tneq", 2, tneq(bumpInt(1), bumpInt(2)));

    //  String and pointer macros
    CHECK("tmatch", 2, tmatch(bumpString(abc), bumpString(abc)));
    CHECK("tcontains", 2, tcontains(bumpString(abcdef), bumpString(cde)));
    CHECK("tnull", 1, tnull(bumpPtr(NULL)));
    CHECK("tnotnull", 1, tnotnull(bumpPtr(&value)));

    //  Single-operand macros were already correct; guard against regression
    CHECK("ttrue", 1, ttrue(bumpInt(1)));
    CHECK("tfalse", 1, tfalse(bumpInt(0)));

    /*
        The case from the issue history: a call that appends and returns the new length must append
        once. tmatch on the buffer afterwards proves the buffer holds one copy, not two.
     */
    text[0] = '\0';
    calls = 0;
    teqz(bumpSize(strlen(strcat(text, "abc"))), 3, "strcat returns a length of 3");
    teqi(calls, 1, "the appending call ran once");
    tmatch(text, "abc", "the buffer holds one copy of the appended text");

    return 0;
}
