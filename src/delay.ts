import type { IWeakPromise } from './iweak_promise.js';
import { WeakPromise } from './weak_promise.js';

/**
 * Creates a promise that resolves after a specified delay.
 *
 * @param time - The delay time in milliseconds before the promise resolves
 * @returns An IWeakPromise that resolves after the specified delay
 *
 * @example
 * ```typescript
 * // Wait for 1 second
 * await delay(1000);
 *
 * // Use with async/await
 * async function example() {
 *   console.log('Start');
 *   await delay(2000);
 *   console.log('After 2 seconds');
 * }
 * ```
 *
 * @remarks
 * This function uses WeakPromise which provides automatic cleanup of resources
 * when the promise is no longer needed. The timeout is automatically cleared
 * if the promise is disposed of before it resolves.
 */
export function delay(time: number): IWeakPromise<void> {
  return new WeakPromise<void>(resolve => {
    const id = globalThis.setTimeout(resolve, time, undefined);
    return () => {
      globalThis.clearTimeout(id);
    };
  });
}
