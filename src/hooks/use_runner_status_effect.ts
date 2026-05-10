import { IRunnerBroadcast, Status } from '../irunner_broadcast.js';
import { useSignalValueEffect } from './use_signal_value_effect.js';

/**
 * A hook that runs an effect whenever a runner's status changes.
 * This is useful for side effects that need to respond to runner status changes
 * without causing a re-render.
 *
 * @template T - The type of the runner's value
 * @param callback - The effect to run when the runner's status changes
 * @param task - The broadcast interface of the runner to subscribe to
 *
 * @example
 * ```tsx
 * useRunnerStatusEffect(
 *   status => {
 *     if (status === 'ERROR') {
 *       // Handle error state
 *       showErrorToast();
 *     }
 *   },
 *   runner.broadcast
 * );
 * ```
 */
export function useRunnerStatusEffect(
  callback: (value: Status) => void,
  task: IRunnerBroadcast<any>
) {
  return useSignalValueEffect(state => {
    callback(state.status);
  }, task.stateBroadcast);
}
