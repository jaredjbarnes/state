/**
 * @fileoverview Defines the core interfaces for asynchronous operation management in the state management system.
 * This module provides the foundation for handling async operations with progress tracking, error handling,
 * and feedback mechanisms.
 */

import type { IWeakPromise } from './iweak_promise.js';
import type { IRunnerBroadcast } from './irunner_broadcast.js';
import type { ISignal } from './isignal.js';

/**
 * Represents an asynchronous action that can be executed by a Runner.
 * The action receives the runner instance as a parameter, allowing it to update
 * progress, set feedback messages, and handle errors during execution.
 *
 * @template T - The type of value that the action will resolve to
 * @param runner - The runner instance executing the action
 * @returns A Promise or IWeakPromise that resolves to the result of the action
 */
export type Action<T> = (runner: IRunner<T>) => T | Promise<T> | IWeakPromise<T>;

/**
 * Interface for managing asynchronous operations with state tracking.
 * Extends both IRunnerBroadcast and ISignal to provide a complete interface
 * for handling async operations with progress tracking, error handling,
 * and feedback mechanisms.
 *
 * @template T - The type of value that the runner manages
 */
export interface IRunner<T> extends IRunnerBroadcast<T>, ISignal<T> {
  /**
   * Executes an asynchronous action and returns its result.
   * This method is used when you need to wait for the result of the operation.
   *
   * @param action - The async action to execute
   * @returns A Promise that resolves to the result of the action
   * @throws Will throw if the action fails
   */
  execute(action: Action<T>): Promise<T>;

  /**
   * Dispatches an asynchronous action without waiting for its result.
   * This method is used when you want to trigger an async operation
   * but don't need to wait for its completion.
   *
   * @param action - The async action to execute
   * @returns A Promise that resolves when the action is dispatched
   */
  dispatch(action: Action<T>): Promise<void>;

  /**
   * Sets the error state of the runner.
   *
   * @param error - The error to set, or null to clear the error state
   */
  setError(error: Error | null): void;

  /**
   * Sets a feedback message for the current operation.
   *
   * @param feedback - The feedback message to display
   */
  setFeedback(feedback: string): void;

  /**
   * Sets the progress of the current operation.
   *
   * @param progress - A number between 0 and 1 representing the operation's progress
   */
  setProgress(progress: number): void;
}
