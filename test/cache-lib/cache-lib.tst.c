/*
    cache-lib.tst.c -- A fixture that exercises a library rather than a header

    Run only by ../compile-cache.tst.ts, which builds build/libcacheprobe.a before running it and
    then rebuilds it to return a different value. See the sibling testme.json5: this directory is
    enable:'manual'.
 */
#include "../../src/modules/c/testme.h"
#include "probe.h"

int main(int argc, char **argv) {
    teqi(probeValue(), 1, "the library supplied its value");
    return 0;
}
