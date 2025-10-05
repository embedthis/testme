import { TestHandler } from '../types.ts';
import { ShellTestHandler } from './shell.ts';
import { CTestHandler } from './c.ts';
import { JavaScriptTestHandler } from './javascript.ts';
import { TypeScriptTestHandler } from './typescript.ts';
import { EjscriptTestHandler } from './ejscript.ts';
import { PythonTestHandler } from './python.ts';
import { GoTestHandler } from './go.ts';

/*
 Creates and returns all available test handlers
 @returns Array of test handler instances
 */
export const createHandlers = (): TestHandler[] => {
    return [
        new ShellTestHandler(),
        new CTestHandler(),
        new JavaScriptTestHandler(),
        new TypeScriptTestHandler(),
        new EjscriptTestHandler(),
        new PythonTestHandler(),
        new GoTestHandler()
    ];
};

// Re-export handler classes for direct use
export {
    ShellTestHandler,
    CTestHandler,
    JavaScriptTestHandler,
    TypeScriptTestHandler,
    EjscriptTestHandler,
    PythonTestHandler,
    GoTestHandler
};