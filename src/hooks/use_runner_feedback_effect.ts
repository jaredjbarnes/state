/**
 * @module hooks/use_runner_feedback_effect
 *
 * This module provides a React hook for handling feedback messages from a Runner.
 * It allows components to react to changes in the feedback state of async operations.
 */

import { IRunnerBroadcast } from '../irunner_broadcast.js';
import { useSignalValueEffect } from './use_signal_value_effect.js';

/**
 * A React hook that executes a callback whenever the feedback message of a Runner changes.
 *
 * This hook is useful for displaying operation feedback to users, such as loading messages,
 * progress updates, or error notifications. It automatically handles cleanup when the
 * component unmounts.
 *
 * @example
 * ```tsx
 * useRunnerFeedbackEffect(
 *   (feedback) => {
 *     // Update UI with feedback message
 *     setMessage(feedback);
 *   },
 *   myRunner.broadcast
 * );
 * ```
 *
 * @param callback - A function that will be called with the new feedback message whenever it changes
 * @param task - The Runner's broadcast interface to subscribe to
 * @returns void
 */
export function useRunnerFeedbackEffect(
  callback: (feedback: string) => void,
  task: IRunnerBroadcast<any>
) {
  return useSignalValueEffect(state => {
    callback(state.feedback);
  }, task.stateBroadcast);
}
