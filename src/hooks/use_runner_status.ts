import { IRunnerBroadcast } from '../irunner_broadcast.js';
import { useSignalValue } from './use_signal_value.js';

/**
 * A hook that subscribes to a runner's status changes and returns the current status.
 * The component will re-render whenever the runner's status changes.
 *
 * @template T - The type of the runner's value
 * @param broadcast - The broadcast interface of the runner to subscribe to
 * @returns The current status of the runner (INITIAL, PENDING, SUCCESS, ERROR)
 *
 * @example
 * ```tsx
 * const status = useRunnerStatus(runner.broadcast);
 *
 * return (
 *   <div>
 *     {status === 'PENDING' && <Spinner />}
 *     {status === 'ERROR' && <ErrorMessage />}
 *     {status === 'SUCCESS' && <SuccessMessage />}
 *   </div>
 * );
 * ```
 */
export function useRunnerStatus(broadcast: IRunnerBroadcast<any>) {
  return useSignalValue(broadcast.stateBroadcast).status;
}
