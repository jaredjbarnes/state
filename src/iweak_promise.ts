/**
 * Interface for an enhanced Promise that supports cancellation and manual resolution.
 * Extends the native Promise interface to provide additional control over promise lifecycle.
 *
 * @template T - The type of value the promise resolves to
 */
export interface IWeakPromise<T> extends Promise<T> {
  /**
   * Cancels the promise with the given reason.
   * @param reason - The reason for cancellation
   */
  cancel(reason: any): void;

  /**
   * Manually resolves the promise with the given value.
   * @param value - The value to resolve the promise with
   */
  resolve(value: T): void;

  /**
   * Manually rejects the promise with the given error.
   * @param error - The error to reject the promise with
   */
  reject(error: any): void;
}
