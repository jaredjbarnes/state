/**
 * @module hooks/use_runner_feedback
 *
 * This module provides a hook for accessing the feedback message from a Runner's state.
 * It is useful for displaying status messages to users during async operations.
 */

import { IRunnerBroadcast } from '../irunner_broadcast.js';
import { useSignalValue } from './use_signal_value.js';

/**
 * Hook that provides access to the feedback message from a Runner's state.
 *
 * @template T - The type of the Runner's value
 * @param {IRunnerBroadcast<T>} task - The Runner broadcast interface to subscribe to
 * @returns {string | undefined} The current feedback message, or undefined if no feedback is set
 *
 * @example
 * ```tsx
 * const feedback = useRunnerFeedback(saveRunner.broadcast);
 * return <div>{feedback}</div>;
 * ```
 *
 * @remarks
 * This hook is useful for displaying status messages to users during async operations.
 * The feedback message is typically set using the Runner's setFeedback method.
 * The component will automatically re-render when the feedback message changes.
 */
export function useRunnerFeedback(task: IRunnerBroadcast<any>) {
  return useSignalValue(task.stateBroadcast).feedback;
}
