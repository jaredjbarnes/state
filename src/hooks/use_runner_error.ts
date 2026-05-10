import { IRunnerBroadcast } from '../irunner_broadcast.js';
import { useSignalValue } from './use_signal_value.js';

/**
 * A React hook that subscribes to the error state of a runner.
 *
 * @template T - The type of value that the runner manages
 * @param {IRunnerBroadcast<T>} task - The runner broadcast interface to subscribe to
 * @returns {Error | null} The current error state of the runner, or null if there is no error
 *
 * @example
 * ```tsx
 * const error = useRunnerError(saveRunner.broadcast);
 * if (error) {
 *   return <ErrorMessage error={error} />;
 * }
 * ```
 *
 * @remarks
 * This hook is useful for:
 * - Displaying error messages in the UI
 * - Conditionally rendering error states
 * - Triggering error handling logic
 *
 * The hook will automatically unsubscribe when the component unmounts.
 */
export function useRunnerError(task: IRunnerBroadcast<any>) {
  return useSignalValue(task.stateBroadcast).error;
}
