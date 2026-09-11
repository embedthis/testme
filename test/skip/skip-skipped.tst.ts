/*
    skip-skipped.tst.ts - A fixture that skips itself.

    Run only by ../skip-outcome.tst.ts. The assertion below is the sentinel: tskip() must stop the
    file, so a run that reaches it fails loudly and names itself in the output. See the sibling
    testme.json5: this directory is enable:'manual'.
 */

import {tskip, ttrue} from 'testme'

tskip('no kettle on this platform')

ttrue(false, 'NEVER-REACHED: code after tskip() must not run')
