import { useLayoutEffect, useRef } from 'react';
import type { IBroadcast } from '../ibroadcast.js';

/**
 * A hook that runs an effect whenever a signal's value changes.
 * This is useful for side effects that need to respond to signal value changes
 * without causing a re-render.
 *
 * @template T - The type of the signal's value
 * @param callback - The effect to run when the signal's value changes
 * @param broadcast - The broadcast interface of the signal to subscribe to
 *
 * @example
 * ```tsx
 * useSignalValueEffect(
 *   value => {
 *     // Do something with the new value
 *     console.log('Value changed:', value);
 *   },
 *   signal.broadcast
 * );
 * ```
 */
export function useSignalValueEffect<T>(
  callback: (value: T) => void,
  broadcast: IBroadcast<T>
) {
  const callbackRef = useRef(callback);
  const version = useRef(broadcast.version);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useLayoutEffect(() => {
    const subscription = broadcast.subscribe(value => {
      callbackRef.current(value);
    });

    if (version.current !== broadcast.version) {
      callbackRef.current(broadcast.get());
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [broadcast]);

  useLayoutEffect(() => {
    callbackRef.current(broadcast.get());
  }, [broadcast]);
}
