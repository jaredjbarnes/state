/**
 * Core state management utilities without React dependencies.
 * Use this entry point when you need state management in non-React contexts
 * or want to avoid bundling React.
 *
 * @example
 * ```typescript
 * import { Signal, Runner } from '@j13b/state/core';
 * ```
 */
export * from './ibroadcast.js';
export * from './isignal.js';
export * from './irunner_broadcast.js';
export * from './irunner.js';
export * from './iweak_promise.js';
export * from './poll_async.js';
export * from './signal.js';
export * from './runner.js';
export * from './weak_promise.js';
export * from './delay.js';
export * from './derived_signal.js';
export * from './events/async_event.js';
export * from './events/event.js';
export * from './events/base_event.js';
