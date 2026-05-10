/**
 * @module hooks/use_runner_progress_effect
 *
 * This module provides a React hook for tracking the progress of a Runner operation.
 * It allows components to react to progress changes in long-running operations.
 */

import { IRunnerBroadcast } from '../irunner_broadcast.js';
import { useSignalValueEffect } from './use_signal_value_effect.js';

/**
 * Hook that executes a callback whenever the progress of a Runner operation changes.
 *
 * @template T - The type of the Runner's value
 * @param callback - Function to be called when progress changes. Receives the current progress value (0-1)
 * @param task - The Runner broadcast interface to track progress from
 * @returns void
 *
 * @example
 * ```tsx
 * useRunnerProgressEffect(
 *   (progress) => {
 *     console.log(`Operation is ${progress * 100}% complete`);
 *   },
 *   myRunner.broadcast
 * );
 * ```
 *
 * @remarks
 * - The callback will be called with a number between 0 and 1 representing progress
 * - The effect is automatically cleaned up when the component unmounts
 * - This hook is built on top of useSignalValueEffect for efficient state tracking
 */
export function useRunnerProgressEffect(
  callback: (progress: number) => void,
  task: IRunnerBroadcast<any>
) {
  return useSignalValueEffect(state => {
    callback(state.progress);
  }, task.stateBroadcast);
}
