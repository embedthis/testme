/*
    unasserted-skipping.tst.ts - A fixture that skips itself before asserting anything.

    Run only by ../../unasserted.tst.ts. See the sibling testme.json5: this directory is enable:'manual'.
 */

import {tskip} from 'testme'

tskip('nothing to do here')
