/**
 * Represents a subscription to a `IBroadcast<T>`.
 */
export interface ISubscription<T = unknown> {
  /**
   * The timestamp when the subscription started.
   */
  startTime: number;
  /**
   * The callback function to be invoked on value changes.
   */
  callback: (value: T) => void;
  /**
   * Unsubscribes from the broadcast, preventing the callback from being called in the future.
   */
  unsubscribe(): void;
}

/**
 * Interface for broadcasting changes of a generic type `T`.
 */
export interface IBroadcast<T> {
  /**
   * The current version number of the broadcast data.
   */
  readonly version: number;
  /**
   * An array of weak references to subscriptions.
   */
  readonly subscriptions: WeakRef<ISubscription<T>>[];

  /**
   * Retrieves the current value being broadcasted.
   * @returns The current value of type `T`.
   */
  get(): T;

  /**
   * Subscribes to changes in the broadcasted value.
   * @param callback A function to be called with the new value whenever it changes.
   * @returns An `ISubscription<T>` object to manage the subscription.
   */
  subscribe(callback: (value: T) => void): ISubscription<T>;

  /**
   * Waits for the next value to be broadcasted.
   * @returns A promise that resolves with the next value.
   */
  wait(): Promise<T>;

  /**
   * Waits for the next value to be broadcasted that satisfies the predicate.
   * @param predicate A function to be called with the new value whenever it changes.
   * @returns A promise that resolves with the next value.
   */
  waitFor(predicate: (value: T) => boolean): Promise<T>;
}
