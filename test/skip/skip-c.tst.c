/*
    skip-c.tst.c - A C fixture that skips itself.

    Run only by ../skip-outcome.tst.ts. The assertion below is the sentinel: tskip() must stop the
    test, so a run that reaches it fails loudly and names itself in the output.

    Includes the header by path rather than by -I so the fixture always exercises the header in the
    working tree, never a copy installed under ~/.local/include.
 */
#include "../../src/modules/c/testme.h"

int main(int argc, char **argv) {
    tskip("no kettle on this platform");

    ttrue(0, "NEVER-REACHED: code after tskip() must not run");
    return 0;
}
