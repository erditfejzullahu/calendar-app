/**
 * RN's TS lib bundle intentionally omits some web globals, but the JS runtime provides
 * `queueMicrotask` in modern Hermes JSC targets. Declare it here so shared code typechecks cleanly.
 */
declare function queueMicrotask(callback: () => void): void;
