/**
 * A React hook that subscribes to the progress state of a Runner.
 *
 * @template T - The type of the Runner's value
 * @param {IRunnerBroadcast<T>} task - The Runner broadcast interface to subscribe to
 * @returns {number} A number between 0 and 1 representing the current progress of the task
 *
 * @example
 * ```tsx
 * const progress = useRunnerProgress(saveRunner.broadcast);
 * // progress will be a number between 0 and 1
 * // 0 = not started, 1 = complete
 * ```
 *
 * @remarks
 * This hook is useful for tracking the progress of long-running operations
 * such as file uploads, data processing, or any task that can report progress.
 * The component will automatically re-render when the progress value changes.
 */
import { IRunnerBroadcast } from '../irunner_broadcast.js';
import { useSignalValue } from './use_signal_value.js';

export function useRunnerProgress(task: IRunnerBroadcast<any>) {
  return useSignalValue(task.stateBroadcast).progress;
}
