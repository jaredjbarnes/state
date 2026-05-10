import { IBroadcast } from './ibroadcast.js';

/**
 * Represents the possible states of a Runner operation.
 * @enum {string}
 */
export enum Status {
  /** Initial state before any operation has been executed */
  INITIAL = 'initial',
  /** Operation is currently in progress */
  PENDING = 'pending',
  /** Operation has failed with an error */
  ERROR = 'error',
  /** Operation has completed successfully */
  SUCCESS = 'success',
}

/**
 * Represents the complete state of a Runner operation.
 * @template T - The type of the value being managed by the Runner
 */
export interface IRunnerState<T> {
  /** The current value of the Runner */
  value: T;
  /** The current status of the operation */
  status: Status;
  /** The error that occurred, if any */
  error: Error | null;
  /** A message providing feedback about the current operation */
  feedback: string;
  /** Progress of the operation as a number between 0 and 1 */
  progress: number;
}

/**
 * Extends IBroadcast to provide additional functionality for managing async operations.
 * This interface provides methods to control and monitor the state of async operations.
 * @template T - The type of the value being managed by the Runner
 */
export interface IRunnerBroadcast<T> extends IBroadcast<T> {
  /** Broadcast interface for the complete Runner state */
  stateBroadcast: IBroadcast<IRunnerState<T>>;

  /**
   * Retries the last failed operation.
   * @returns {Promise<T>} A promise that resolves with the operation result
   */
  retry(): Promise<T>;

  /**
   * Cancels the current operation.
   * @param {string} reason - The reason for cancellation
   */
  cancel(reason: string): void;

  /**
   * Resets the Runner to its initial state.
   * This clears any errors, progress, and feedback messages.
   */
  reset(): void;

  /**
   * Waits for the Runner to complete and returns the final value.
   * @returns {Promise<T>} A promise that resolves with the final value
   */
  waitForResponse(): Promise<T>;
}
