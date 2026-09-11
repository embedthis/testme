/*
    skip-failing.tst.ts - A fixture that fails one assertion.

    Deliberately failing. Run only by ../skip-outcome.tst.ts, to make up the failing third of a
    one-pass, one-fail, one-skip suite. See the sibling testme.json5: this directory is
    enable:'manual'.
 */

import {ttrue} from 'testme'

ttrue(false, 'this one is meant to fail')
