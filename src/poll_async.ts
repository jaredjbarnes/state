import { Runner } from './runner.js';
import { Signal } from './signal.js';

/**
 * Options for configuring PollAsync behavior
 */
export interface PollAsyncOptions {
  /** Whether to start polling immediately upon instantiation */
  startImmediately?: boolean;
  /** Whether to delay the first polling tick by the specified delay */
  delayFirstTick?: boolean;
}

type Action<T> = (currentValue: T) => Promise<T> | T;

/**
 * A class that manages periodic polling of an async action.
 * Provides reactive state management for the polled value and polling status.
 *
 * @template TResponse - The type of the value being polled
 *
 * @example
 * ```typescript
 * const poller = new PollAsync(
 *   initialValue,
 *   () => fetchData(),
 *   5000, // poll every 5 seconds
 *   { startImmediately: true }
 * );
 *
 * // Subscribe to value changes
 * poller.valueBroadcast.subscribe(value => {
 *   console.log('New value:', value);
 * });
 *
 * // Start/stop polling
 * poller.start();
 * poller.stop();
 *
 * // Clean up when done
 * poller.dispose();
 * ```
 */
export class PollAsync<TResponse> {
  private _timeoutId: number | undefined;
  private _action: Action<TResponse>;
  private _isActive = new Signal(false);
  private _delay: number;
  private _valueRunner: Runner<TResponse>;
  private _generation = 0;

  /** Configuration options for the poller */
  readonly options: PollAsyncOptions = {
    startImmediately: true,
    delayFirstTick: false,
  };

  /**
   * Gets the broadcast interface for subscribing to value changes
   * @returns {IBroadcast<TResponse>} The broadcast interface
   */
  get valueBroadcast() {
    return this._valueRunner.broadcast;
  }

  /**
   * Gets the current polled value
   * @returns {TResponse} The current value
   */
  get value() {
    return this._valueRunner.get();
  }

  /**
   * Gets the broadcast interface for subscribing to active status changes
   * @returns {IBroadcast<boolean>} The broadcast interface
   */
  get isActiveBroadcast() {
    return this._isActive.broadcast;
  }

  /**
   * Gets whether the poller is currently active
   * @returns {boolean} True if polling is active
   */
  get isActive() {
    return this._isActive.get();
  }

  /**
   * Gets the current polling delay in milliseconds
   * @returns {number} The delay in milliseconds
   */
  get delay() {
    return this._delay;
  }

  /**
   * Creates a new PollAsync instance
   * @param {TResponse} initialValue - The initial value before polling starts
   * @param {Action<TResponse>} action - The async action to poll
   * @param {number} delay - The delay between polls in milliseconds
   * @param {PollAsyncOptions} [options] - Optional configuration
   */
  constructor(
    initialValue: TResponse,
    action: Action<TResponse>,
    delay: number,
    options?: PollAsyncOptions
  ) {
    this._valueRunner = new Runner<TResponse>(initialValue);
    this._action = action;
    this._delay = delay;
    this.options = {
      ...this.options,
      ...options,
    };
    if (this.options.startImmediately) {
      this.start();
    }
  }

  /**
   * Internal method that executes the polling action and schedules the next tick
   * @private
   */
  private tick = () => {
    const gen = this._generation;
    this._valueRunner
      .execute(() => {
        const currentValue = this._valueRunner.get();
        return Promise.resolve(this._action(currentValue)).then(result => {
          if (gen !== this._generation) {
            throw new Error('Polling stopped');
          }
          return result;
        });
      })
      .catch(() => {})
      .finally(() => {
        if (gen === this._generation && this._isActive.get()) {
          globalThis.clearTimeout(this._timeoutId);
          this._timeoutId = globalThis.setTimeout(
            this.tick,
            this._delay
          ) as unknown as number;
        }
      });
  };

  /**
   * Starts the polling process
   * @returns {PollAsync<TResponse>} This instance for chaining
   */
  start = () => {
    if (!this._isActive.get()) {
      this._isActive.set(true);
      this._timeoutId = globalThis.setTimeout(
        this.tick,
        this.options.delayFirstTick ? this._delay : 0
      ) as unknown as number;
    }
    return this;
  };

  /**
   * @deprecated Use stop() instead
   * @returns {PollAsync<TResponse>} This instance for chaining
   */
  pause = () => {
    return this.stop();
  };

  /**
   * Stops the polling process
   * @returns {PollAsync<TResponse>} This instance for chaining
   */
  stop = () => {
    this._isActive.set(false);
    this._generation++;
    globalThis.clearTimeout(this._timeoutId);
    this._valueRunner.cancel('Polling stopped');
    return this;
  };

  /**
   * Cleans up resources and stops polling
   * Should be called when the poller is no longer needed
   */
  dispose = () => {
    this.stop();
    this._isActive.dispose();
    this._valueRunner.dispose();
  };

  /**
   * Executes a single poll immediately and returns a promise with the result
   * @returns {Promise<TResponse>} A promise that resolves with the polled value
   */
  poll(): Promise<TResponse> {
    return this._valueRunner
      .execute(() => {
        const currentValue = this._valueRunner.get();
        return Promise.resolve(this._action(currentValue));
      })
      .catch(() => {
        return this._valueRunner.get();
      });
  }

  /**
   * Manually sets the current value
   * @param {TResponse} value - The new value
   */
  set(value: TResponse) {
    this._valueRunner.set(value);
  }

  /**
   * Updates the polling delay
   * @param {number} value - The new delay in milliseconds
   */
  setDelay(value: number) {
    this._delay = value;

    globalThis.clearTimeout(this._timeoutId);

    if (this.isActive) {
      this._timeoutId = globalThis.setTimeout(
        this.tick,
        this._delay
      ) as unknown as number;
    }
  }

  /**
   * Static factory method to create and start a new PollAsync instance
   * @param {T} initialValue - The initial value before polling starts
   * @param {Action<T>} action - The async action to poll
   * @param {number} delay - The delay between polls in milliseconds
   * @param {PollAsyncOptions} [options] - Optional configuration
   * @returns {PollAsync<T>} A new PollAsync instance
   */
  static start<T>(
    initialValue: T,
    action: Action<T>,
    delay: number,
    options?: PollAsyncOptions
  ) {
    return new PollAsync(initialValue, action, delay, options);
  }
}
