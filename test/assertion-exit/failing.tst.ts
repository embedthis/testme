/*
    failing.tst.ts - A fixture that fails one traditional-API assertion.

    Deliberately failing. It is run only by ../assertion-exit.tst.ts, which asserts that the runner
    reports it as a failure. See the sibling testme.json5: this directory is enable:'manual'.
 */

import {ttrue} from 'testme'

ttrue(true, 'this one passes')
ttrue(false, 'this one is meant to fail')
ttrue(true, 'never reached -- treport exits at the failure above')
