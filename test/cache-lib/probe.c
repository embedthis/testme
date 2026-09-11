/*
    probe.c -- The library under test for cache-lib.tst.c

    Rewritten and rebuilt into build/libcacheprobe.a by ../compile-cache.tst.ts, to prove that a
    rebuilt library invalidates the cached test binary that linked it.
 */
#include "probe.h"

int probeValue(void) {
    return 1;
}
