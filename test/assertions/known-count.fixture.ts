/*
    known-count.fixture.ts - A fixture that emits a known number of passing assertions

    Driven by ../assertion-total.tst.ts. Every marker here comes from the real assertion helper, so
    the tally TestMe reports for this file is the number of ttrue() calls and nothing else. Keep
    ASSERTIONS in step with the expectation in the driver.
 */

import {ttrue} from 'testme'

const ASSERTIONS = 7

for (let i = 0; i < ASSERTIONS; i++) {
    ttrue(true, `known assertion ${i}`)
}
