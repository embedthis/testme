/**
 * TypeScript type definitions for testme testing utilities
 */

// Test depth functions
export function tdepth(): number;

// Test verbose functions
export function tverbose(): boolean;

// Assertion functions
export function tcontains(
    string: string,
    pattern: string,
    message?: string
): void;
export function ttrue(condition: boolean, message?: string): void;
export function tfalse(condition: boolean, message?: string): void;
export function teq<T>(actual: T, expected: T, message?: string): void;
export function tmatch(string: string, pattern: string, message?: string): void;
export function tneq<T>(actual: T, expected: T, message?: string): void;

// Default export interface
interface TestMe {
    tdepth(): number;
    tcontains(string: string, pattern: string, message?: string): void;
    ttrue(condition: boolean, message?: string): void;
    tfalse(condition: boolean, message?: string): void;
    teq<T>(actual: T, expected: T, message?: string): void;
    tneq<T>(actual: T, expected: T, message?: string): void;
    tmatch(string: string, pattern: string, message?: string): void;
}

declare const testme: TestMe;
export default testme;
