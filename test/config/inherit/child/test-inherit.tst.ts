import {ConfigManager} from '../../../../src/config.ts'
import {teq} from 'testme'

console.log('Testing configuration inheritance...')

// Load config from current directory (child)
const config = await ConfigManager.findConfig(import.meta.dir)

console.log('Config:', JSON.stringify(config, null, 2))

// Test that environment vars are inherited and merged
teq(config.environment?.PARENT_VAR, 'from_parent', 'Should inherit PARENT_VAR from parent')
teq(config.environment?.CHILD_VAR, 'from_child', 'Should have CHILD_VAR from child')
teq(config.environment?.SHARED_VAR, 'child_value', 'Child should override parent SHARED_VAR')

// Test that compiler flags are inherited and merged
const cFlags = config.compiler?.c?.flags || []
const hasParentFlag = cFlags.some((f: string) => f === '-DPARENT_FLAG')
const hasChildFlag = cFlags.some((f: string) => f === '-DCHILD_FLAG')
teq(hasParentFlag, true, 'Should inherit -DPARENT_FLAG from parent')
teq(hasChildFlag, true, 'Should have -DCHILD_FLAG from child')

// Test that compiler libraries are inherited
const cLibs = config.compiler?.c?.libraries || []
const hasM = cLibs.some((lib: string) => lib === 'm')
teq(hasM, true, 'Should inherit library "m" from parent')

// Test that execution is NOT inherited (not in inherit array)
teq(config.execution?.timeout, 10000, 'Should use child timeout, not parent (execution not inherited)')
teq(config.execution?.workers, 4, 'Should use default workers, not parent (execution not inherited)')

// Test that profile is NOT inherited (not in inherit array)
teq(config.profile, undefined, 'Should not inherit profile (not in inherit array)')

console.log('✓ All inheritance tests passed!')
