/**
 * Ejscript Core API for Bun
 *
 * Main entry point for the Ejscript core module.
 * Exports all core classes and utilities.
 */
export { App } from './core/App';
export { System } from './core/System';
export { Config } from './core/Config';
export { Args } from './core/Args';
export { JSON } from './core/JSON';
export { Path } from './core/Path';
export { File } from './core/File';
export { FileSystem } from './core/FileSystem';
export { Stream } from './core/streams/Stream';
export { TextStream } from './core/streams/TextStream';
export { BinaryStream } from './core/streams/BinaryStream';
export { ByteArray } from './core/streams/ByteArray';
export { Http } from './core/Http';
export { Socket } from './core/Socket';
export { WebSocket as EjsWebSocket } from './core/WebSocket';
export { Uri } from './core/utilities/Uri';
export { Logger } from './core/utilities/Logger';
export { MprLog } from './core/utilities/MprLog';
export { Timer } from './core/utilities/Timer';
export { Cmd } from './core/utilities/Cmd';
export { Cache } from './core/utilities/Cache';
export { LocalCache } from './core/utilities/LocalCache';
export { Memory } from './core/utilities/Memory';
export { GC } from './core/utilities/GC';
export { Inflector } from './core/utilities/Inflector';
export { Worker } from './core/async/Worker';
export { Emitter } from './core/async/Emitter';
export * from './core/types/StringExtensions';
export * from './core/types/ArrayExtensions';
export * from './core/types/ObjectExtensions';
export * from './core/types/DateExtensions';
export * from './core/types/NumberExtensions';
export { blend, clone, format, md5, sha256, dump, dumpAll, dumpDef, print, prints, printf, printHash, hashcode, assert, base64, base64Decode, parse, parseFloat, parseInt, isNaN, isFinite, instanceOf, evalScript, load, setIntervalTimer, clearIntervalTimer, setTimeoutTimer, clearTimeoutTimer } from './core/utilities/Global';
export { serialize, deserialize } from './core/JSON';
export { ejs } from './globals';
//# sourceMappingURL=index.d.ts.map