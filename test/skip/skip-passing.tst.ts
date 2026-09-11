/*
    skip-passing.tst.ts - A fixture that passes.

    Run only by ../skip-outcome.tst.ts, to make up the passing third of a one-pass, one-fail,
    one-skip suite. See the sibling testme.json5: this directory is enable:'manual'.
 */

import {ttrue} from 'testme'

ttrue(true, 'this one passes')
