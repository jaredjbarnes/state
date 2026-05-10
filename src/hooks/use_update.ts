import { useReducer } from 'react';

const updateReducer = (num: number): number => (num + 1) % 1_000_000;

/**
 * A hook that provides a way to force component re-renders.
 *
 * @returns A function that triggers a re-render when called
 *
 * @example
 * ```tsx
 * const update = useUpdate();
 *
 * // Force a re-render
 * update();
 * ```
 */
export const useUpdate = () => {
  const [, update] = useReducer(updateReducer, 0);
  return update as () => void;
};
