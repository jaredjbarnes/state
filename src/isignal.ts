import { IBroadcast } from './ibroadcast.js';

/**
 * Extends `IBroadcast<T>` to include methods for modifying the broadcast value.
 */
export interface ISignal<T> extends IBroadcast<T> {
  /**
   * A reference to the broadcast mechanism.
   */
  readonly broadcast: IBroadcast<T>;

  /**
   * Updates the broadcast value.
   * @param value The new value of type `T` to be broadcast.
   */
  set(value: T): void;

  /**
   * Transforms the current value using a given function and updates the broadcast.
   * @param transformer A function that takes the current value and returns the transformed value.
   */
  transform(transformer: (val: T) => T): void;

  /**
   * Cleans up resources, such as removing all subscriptions.
   */
  dispose(): void;
}
