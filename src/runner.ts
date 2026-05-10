import type { IWeakPromise } from './iweak_promise.js';
import { WeakPromise } from './weak_promise.js';
import type { Action, IRunner } from './irunner.js';
import { type IRunnerBroadcast, type IRunnerState, Status } from './irunner_broadcast.js';
import { Signal } from './signal.js';

/**
 * Interface defining feedback messages for different runner states.
 */
export interface FeedbackMessages {
  /** Message displayed when runner is in initial state */
  initial: string;
  /** Message displayed when runner is executing an action */
  pending: string;
  /** Message displayed when runner has completed successfully */
  success: string;
  /** Message displayed when runner has encountered an error */
  error: string;
}

const defaultFeedbackMessages: FeedbackMessages = {
  initial: 'Initialized',
  pending: 'Pending',
  success: 'Success',
  error: 'Error',
};

/**
 * A specialized Signal class for handling asynchronous operations with state management.
 * Extends Signal<T> to provide additional functionality for tracking operation status,
 * progress, and error states.
 *
 * @template T - The type of value managed by this runner
 */
export class Runner<T = void> extends Signal<T> implements IRunner<T> {
  private _initialValue: T;
  private _feedbackMessages: FeedbackMessages;
  private _action: Action<T>;
  private _actionResult: IWeakPromise<T>;
  private _state: Signal<IRunnerState<T>>;

  /**
   * Gets the broadcast interface for the runner's state.
   * @returns {IRunnerBroadcast<T>} The broadcast interface for subscribing to state changes
   */
  get stateBroadcast() {
    return this._state.broadcast;
  }

  /**
   * Gets the broadcast interface for the runner.
   * @returns {IRunnerBroadcast<T>} The broadcast interface for subscribing to value changes
   */
  get broadcast(): IRunnerBroadcast<T> {
    return this;
  }

  /**
   * Gets the current status of the runner.
   * @returns {Status} The current status (INITIAL, PENDING, SUCCESS, or ERROR)
   */
  get status() {
    return this._state.get().status;
  }

  /**
   * Gets the current feedback message.
   * @returns {string} The current feedback message based on the runner's state
   */
  get feedback() {
    return this._state.get().feedback;
  }

  /**
   * Gets the current progress of the operation.
   * @returns {number} A number between 0 and 1 representing the operation's progress
   */
  get progress() {
    return this._state.get().progress;
  }

  /**
   * Gets the current error, if any.
   * @returns {Error | null} The current error or null if no error exists
   */
  get error() {
    return this._state.get().error;
  }

  /**
   * Creates a new Runner instance.
   * @param {T} initialValue - The initial value for the runner
   * @param {FeedbackMessages} [feedbackMessages=defaultFeedbackMessages] - Custom feedback messages for different states
   */
  constructor(initialValue: T, feedbackMessages = defaultFeedbackMessages) {
    super(initialValue);

    this._feedbackMessages = feedbackMessages;
    this._initialValue = initialValue;
    this._actionResult = WeakPromise.resolve(initialValue);
    this._version = 0;
    this._action = () => WeakPromise.resolve(initialValue);
    this._state = new Signal<IRunnerState<T>>({
      value: initialValue,
      status: Status.INITIAL,
      error: null,
      feedback: this._feedbackMessages.initial,
      progress: 0,
    });
  }

  /**
   * Executes an asynchronous action and manages its state.
   * @param {Action<T>} action - The asynchronous action to execute
   * @returns {Promise<T>} A promise that resolves with the action's result
   * @throws {Error} If the action fails, the error is propagated
   */
  execute(action: Action<T>): Promise<T> {
    const lastActionResult = this._actionResult.catch(() => this._value);

    const notifiedPending = this._notifyPending();
    let actionResult: T | IWeakPromise<T> | Promise<T> | null = null;
    let cancelledError: any = null;

    this._actionResult = WeakPromise.from(
      lastActionResult.then((prevValue: T) => {
        if (!notifiedPending) {
          this._notifyPending();
        }
        this._action = action;
        actionResult = action(this);

        if (WeakPromise.isPromiseLike(actionResult)) {
          actionResult.catch(() => {});
        }

        if (cancelledError != null) {
          if (WeakPromise.isWeakPromise(actionResult)) {
            actionResult.cancel(cancelledError);
          }
          return prevValue;
        }

        return Promise.resolve(actionResult)
          .then(value => {
            this._notifyValue(value);
            return value;
          })
          .catch((error: any) => {
            this._notifyError(error);
            throw error;
          });
      }),
      (error: any) => {
        cancelledError = error;
        if (WeakPromise.isWeakPromise(actionResult)) {
          actionResult.cancel(error);
        }
      }
    );
    return this._actionResult;
  }

  /**
   * Waits for the current operation to complete and returns its result.
   * If no operation is pending, returns the current value immediately.
   * @returns {Promise<T>} A promise that resolves with the operation result
   */
  waitForResponse(): Promise<T> {
    if (WeakPromise.isPromiseLike(this._actionResult)) {
      return this._actionResult.then(() => this._value).catch(() => this._value);
    } else {
      return Promise.resolve(this._actionResult).catch(() => this._value);
    }
  }

  /**
   * Dispatches an action without waiting for its result or handling errors.
   * This is a fire-and-forget operation that:
   * - Swallows any errors that occur during execution
   * - Ignores the return value of the action
   * - Returns a Promise that resolves to void
   *
   * Use this method when you want to trigger an action but don't need to:
   * - Handle the result value
   * - Handle potential errors
   * - Chain operations together
   *
   * For operations where you need the result or error handling, use {@link execute} instead.
   *
   * @param {Action<T>} action - The action to execute
   * @returns {Promise<void>} A promise that resolves when the action is complete
   * @see execute
   */
  dispatch(action: Action<T>): Promise<void> {
    return this.execute(action)
      .catch(() => {})
      .then(() => {});
  }

  /**
   * Retries the last failed operation.
   * @returns {Promise<T>} A promise that resolves with the retry result
   * @throws {Error} If the retry fails, the error is propagated
   */
  async retry(): Promise<T> {
    await this.waitForResponse();
    return this.execute(this._action);
  }

  /**
   * Cancels the current operation.
   * @param {string} [reason='Cancelled'] - The reason for cancellation
   */
  cancel(reason = 'Cancelled'): void {
    const status = this._state.get().status;

    if (status === Status.PENDING) {
      const error = new Error(reason);

      this._actionResult.catch(() => {});
      this._actionResult.cancel(error);

      this._state.transform(s => {
        s.status = Status.ERROR;
        s.feedback = this._feedbackMessages.error;
        s.progress = 1;
        s.error = error;
        return s;
      });
    }
  }

  /**
   * Resets the runner to its initial state.
   */
  reset(): void {
    const status = this._state.get().status;

    if (status === Status.PENDING) {
      this.cancel('Cancelled by reset.');
    }

    this._value = this._initialValue;
    this._version++;

    this._state.transform(s => {
      s.value = this._initialValue;
      s.status = Status.INITIAL;
      s.feedback = this._feedbackMessages.initial;
      s.progress = 0;
      s.error = null;
      return s;
    });

    this._notify(this._value);
  }

  /**
   * Sets an error state for the runner.
   * @param {Error | null} error - The error to set, or null to clear errors
   */
  setError(error: Error | null): void {
    const status = this._state.get().status;

    if (status === Status.PENDING) {
      this.cancel('Cancelled by setError.');
    }

    this._state.transform(s => {
      s.status = Status.ERROR;
      s.feedback = this._feedbackMessages.error;
      s.progress = 1;
      s.error = error;
      return s;
    });
  }

  /**
   * Sets the current value of the runner.
   * @param {T} value - The new value to set
   */
  set(value: T) {
    const status = this._state.get().status;

    if (status === Status.PENDING) {
      this.cancel('Cancelled by setValue.');
    }

    this._value = value;
    this._version++;

    this._state.transform(s => {
      s.value = value;
      s.status = Status.SUCCESS;
      s.feedback = this._feedbackMessages.success;
      s.progress = 1;
      s.error = null;
      return s;
    });

    this._notify(this._value);
  }

  /**
   * Sets a custom feedback message.
   * @param {string} feedback - The feedback message to display
   */
  setFeedback(feedback: string): void {
    this._state.transform(s => {
      s.feedback = feedback;
      return s;
    });
  }

  /**
   * Sets the progress of the current operation.
   * @param {number} progress - A number between 0 and 1 representing progress
   */
  setProgress(progress: number): void {
    const status = this._state.get().status;

    if (status === Status.PENDING) {
      this._state.transform(s => {
        s.progress = progress;
        return s;
      });
    }
  }

  /**
   * Disposes of the runner and its resources.
   */
  dispose(): void {
    super.dispose();
    this._state.dispose();
  }

  private _notifyValue(value: T) {
    this._value = value;
    this._version++;

    this._state.transform(s => {
      s.value = value;
      s.status = Status.SUCCESS;
      s.feedback = this._feedbackMessages.success;
      s.progress = 1;
      s.error = null;
      return s;
    });

    this._notify(value);
  }

  private _notifyError(error: any) {
    this._state.transform(s => {
      s.status = Status.ERROR;
      s.feedback = this._feedbackMessages.error;
      s.progress = 1;
      s.error = error;
      return s;
    });
  }

  private _notifyPending() {
    if (this._state.get().status !== Status.PENDING) {
      this._state.transform(s => {
        s.status = Status.PENDING;
        s.feedback = this._feedbackMessages.pending;
        s.progress = 0;
        s.error = null;
        return s;
      });
      return true;
    }
    return false;
  }
}
