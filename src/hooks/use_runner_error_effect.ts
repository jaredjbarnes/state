import { IRunnerBroadcast } from '../irunner_broadcast.js';
import { useSignalValueEffect } from './use_signal_value_effect.js';

/**
 * A React hook that executes a callback whenever the error state of a Runner changes.
 * This hook is useful for handling side effects that need to respond to error states
 * in async operations managed by a Runner.
 *
 * @template T - The type of value managed by the Runner
 * @param callback - A function that will be called with the current error state
 * @param task - The Runner instance to monitor for error changes
 * @returns void
 *
 * @example
 * ```tsx
 * useRunnerErrorEffect((error) => {
 *   if (error) {
 *     // Handle the error, e.g., show a notification
 *     showErrorNotification(error.message);
 *   }
 * }, myRunner);
 * ```
 *
 * @remarks
 * - The callback will be called immediately with the current error state
 * - The callback will be called whenever the error state changes
 * - The hook automatically handles cleanup on component unmount
 * - This hook is built on top of useSignalValueEffect for efficient state tracking
 */
export function useRunnerErrorEffect(
  callback: (error: Error | null) => void,
  task: IRunnerBroadcast<any>
) {
  return useSignalValueEffect(state => {
    callback(state.error);
  }, task.stateBroadcast);
}
