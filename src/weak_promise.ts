import type { IWeakPromise } from './iweak_promise.js';

/**
 * A utility function that does nothing.
 * Used as a default callback for various operations.
 */
function noop() {}

/**
 * An enhanced Promise implementation that supports cancellation and manual resolution.
 * Extends the native Promise class to provide additional control over promise lifecycle.
 *
 * @template T - The type of value the promise resolves to
 *
 * @example
 * ```typescript
 * import { delay } from './delay.js';
 *
 * // Create a cancellable delay
 * const delayPromise = delay(5000);
 *
 * // Cancel the delay after 2 seconds
 * setTimeout(() => {
 *   delayPromise.cancel('User cancelled');
 * }, 2000);
 *
 * try {
 *   await delayPromise;
 *   console.log('Delay completed');
 * } catch (error) {
 *   console.log('Delay was cancelled:', error);
 * }
 *
 * // Example implementation of a delay function using WeakPromise
 * function delay(time: number) {
 *   return new WeakPromise<void>(resolve => {
 *     // Set up the timeout
 *     const id = window.setTimeout(resolve, time, undefined);
 *
 *     // Return cleanup callback that will be called if the promise is cancelled
 *     return () => {
 *       window.clearTimeout(id);
 *     };
 *   });
 * }
 *
 * // Usage example
 * const delayPromise = delay(5000);
 *
 * // If cancelled, the cleanup callback will clear the timeout
 * delayPromise.cancel('User cancelled');
 * ```
 */
export class WeakPromise<T> extends Promise<T> implements IWeakPromise<T> {
  private _cancelCallback: (reason: any) => void = noop;
  private _reject: (error: any) => void = noop;
  private _resolve: (value: T) => void = noop;

  /**
   * Creates a new WeakPromise instance.
   * @param callback - A function that receives resolve and reject callbacks and returns a cancel callback
   */
  constructor(
    callback: (resolve: any, reject: any) => (reason: any) => void = () => () => {}
  ) {
    let reject: (error: any) => void = noop;
    let resolve: (value: T) => void = noop;
    let cancelCallback: (reason: any) => void = noop;
    let fulfilled = false;
    let isInitialized = false;

    super((innerResolve, innerReject) => {
      resolve = (value: T) => {
        fulfilled = true;

        if (isInitialized) {
          this._cancelCallback = noop;
          this._reject = noop;
          this._resolve = noop;
        }

        innerResolve(value);
      };

      reject = (error: any) => {
        fulfilled = true;

        if (isInitialized) {
          this._cancelCallback = noop;
          this._reject = noop;
          this._resolve = noop;
        }

        innerReject(error);
      };

      cancelCallback = callback(resolve, reject);
    });

    isInitialized = true;

    if (!fulfilled) {
      this._cancelCallback = cancelCallback;
      this._reject = reject;
      this._resolve = resolve;
    }
  }

  /**
   * Cancels the promise with the given reason.
   * @param reason - The reason for cancellation
   */
  cancel(reason: any) {
    const reject = this._reject;
    const cancelCallback = this._cancelCallback;

    cancelCallback(reason);
    reject(reason);
  }

  /**
   * Manually resolves the promise with the given value.
   * @param value - The value to resolve the promise with
   */
  resolve(value: T) {
    this._resolve(value);
  }

  /**
   * Manually rejects the promise with the given error.
   * @param error - The error to reject the promise with
   */
  reject(error: any) {
    this._reject(error);
  }

  /**
   * Creates a WeakPromise from a regular Promise.
   * @param promise - The promise to convert or value to resolve with
   * @param onCancel - Optional callback to execute when the promise is cancelled
   * @returns A new WeakPromise instance
   */
  static from<T>(
    value: T | Promise<T> | IWeakPromise<T>,
    onCancel?: (reason: any) => void
  ): WeakPromise<T>;
  static from<T>(value: unknown, onCancel: (reason: any) => void = noop): WeakPromise<T> {
    if (!WeakPromise.isPromiseLike(value)) {
      return WeakPromise.resolve(value as T);
    }

    if (WeakPromise.isWeakPromise(value) && onCancel === noop) {
      return value as WeakPromise<T>;
    }

    return new WeakPromise<T>((resolve, reject) => {
      (value as Promise<T>).then(resolve).catch(reject);
      return onCancel;
    });
  }

  /**
   * Creates a WeakPromise that resolves with no value.
   * @returns A WeakPromise that resolves with void
   */
  static resolve(): WeakPromise<void>;
  /**
   * Creates a WeakPromise that resolves with the given value.
   * @param value - The value to resolve with
   * @returns A WeakPromise that resolves with the given value
   */
  static resolve<T>(value: T | PromiseLike<T>): WeakPromise<T>;
  static resolve<T>(value?: unknown): WeakPromise<void> | WeakPromise<T> {
    const isPromiseLike = value && typeof (value as any).then === 'function';

    if (isPromiseLike) {
      return new WeakPromise<T>((resolve, reject) => {
        (value as any).then(resolve).catch(reject);
        return noop;
      });
    }

    return new WeakPromise<T>(resolve => {
      resolve(value);
      return noop;
    });
  }

  /**
   * Creates a WeakPromise that rejects with the given reason.
   * @param reason - The reason for rejection
   * @returns A WeakPromise that rejects with the given reason
   */
  static reject<T = never>(reason?: any): WeakPromise<T> {
    return new WeakPromise((_resolve, reject) => {
      reject(reason);
      return noop;
    });
  }

  static isWeakPromise<T>(promise: any): promise is IWeakPromise<T> {
    return (
      WeakPromise.isPromiseLike(promise) &&
      typeof (promise as IWeakPromise<T>).cancel === 'function'
    );
  }

  static isPromiseLike<T>(value: any): value is Promise<T> {
    return (
      value != null &&
      typeof value.then === 'function' &&
      typeof value.catch === 'function'
    );
  }
}
