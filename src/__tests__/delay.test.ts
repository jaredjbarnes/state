import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { delay } from '../delay.js';

describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should resolve after specified delay', async () => {
    const delayTime = 1000;
    const delayPromise = delay(delayTime);

    vi.advanceTimersByTime(delayTime);
    await expect(delayPromise).resolves.toBeUndefined();
  });

  test('should be cancellable before delay completes', async () => {
    const delayTime = 1000;
    const delayPromise = delay(delayTime);

    delayPromise.cancel('Cancelled by user');

    await expect(delayPromise).rejects.toThrow('Cancelled by user');
  });

  test('should not be cancellable after delay completes', async () => {
    const delayTime = 1000;
    const delayPromise = delay(delayTime);

    vi.advanceTimersByTime(delayTime);
    await delayPromise;

    // Cancelling after resolution should not affect anything
    delayPromise.cancel('Too late');
    await expect(delayPromise).resolves.toBeUndefined();
  });

  test('should handle multiple delays', async () => {
    const delayTime = 1000;
    const delayPromise1 = delay(delayTime);
    const delayPromise2 = delay(delayTime * 2);

    vi.advanceTimersByTime(delayTime);
    await expect(delayPromise1).resolves.toBeUndefined();

    vi.advanceTimersByTime(delayTime);
    await expect(delayPromise2).resolves.toBeUndefined();
  });

  test('should handle zero delay', async () => {
    const delayPromise = delay(0);
    vi.advanceTimersByTime(0);
    await expect(delayPromise).resolves.toBeUndefined();
  });

  test('should handle negative delay', async () => {
    const delayPromise = delay(-1000);
    vi.advanceTimersByTime(0);
    await expect(delayPromise).resolves.toBeUndefined();
  });
});
