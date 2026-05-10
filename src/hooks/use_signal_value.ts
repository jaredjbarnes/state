import { useLayoutEffect, useRef } from 'react';
import { IBroadcast } from '../ibroadcast.js';
import { useUpdate } from './use_update.js';

/**
 * A hook that subscribes to a signal's value changes and returns the current value.
 * The component will re-render whenever the signal's value changes.
 *
 * @template TValue - The type of the signal's value
 * @param broadcast - The broadcast interface of the signal to subscribe to
 * @returns The current value of the signal
 *
 * @example
 * ```tsx
 * const value = useSignalValue(signal.broadcast);
 *
 * return <div>Current value: {value}</div>;
 * ```
 */
export function useSignalValue<TValue>(broadcast: IBroadcast<TValue>) {
  const update = useUpdate();
  const versionRef = useRef(broadcast.version);

  useLayoutEffect(() => {
    const subscription = broadcast.subscribe(update);
    if (versionRef.current !== broadcast.version) {
      update();
    }
    return () => subscription.unsubscribe();
  }, [broadcast, update]);

  return broadcast.get();
}
