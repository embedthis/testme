/*
    cache-header.tst.c -- A fixture whose shared C lives in a header

    Run only by ../compile-cache.tst.ts. See the sibling testme.json5: this directory is
    enable:'manual'.
 */
#include "../../src/modules/c/testme.h"
#include "cachedep.h"

int main(int argc, char **argv) {
    teqi(CACHE_PROBE, 1, "the header supplied its value");
    return 0;
}
