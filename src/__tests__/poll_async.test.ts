import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Mock } from 'vitest';
import { PollAsync } from '../poll_async.js';

describe('PollAsync', () => {
  let mockAction: Mock<(currentValue: number) => Promise<number>>;
  let poller: PollAsync<number>;
  const initialValue = 0;
  const pollDelay = 100;

  beforeEach(() => {
    vi.useFakeTimers();
    mockAction = vi.fn().mockResolvedValue(42);
    poller = new PollAsync(initialValue, mockAction, pollDelay);
  });

  afterEach(() => {
    vi.useRealTimers();
    poller.dispose();
  });

  test('should initialize with correct initial value', () => {
    expect(poller.value).toBe(initialValue);
  });

  test('should start polling immediately by default', () => {
    expect(poller.isActive).toBe(true);
  });

  test('should not start polling when startImmediately is false', () => {
    const customPoller = new PollAsync(initialValue, mockAction, pollDelay, {
      startImmediately: false,
    });
    expect(customPoller.isActive).toBe(false);
    customPoller.dispose();
  });

  test('should execute action after delay', async () => {
    expect(mockAction).not.toHaveBeenCalled();

    vi.advanceTimersByTime(pollDelay);
    await poller.valueBroadcast.waitForResponse();

    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(poller.value).toBe(42);
  });

  test('should stop polling when stop() is called', async () => {
    poller.stop();
    expect(poller.isActive).toBe(false);

    vi.advanceTimersByTime(pollDelay * 2);

    expect(mockAction).not.toHaveBeenCalled();
  });

  test('should resume polling when start() is called', async () => {
    poller.stop();
    poller.start();

    vi.advanceTimersByTime(pollDelay);
    await poller.valueBroadcast.waitForResponse();

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('should handle action errors gracefully', async () => {
    const error = new Error('Test error');
    mockAction.mockRejectedValueOnce(error);

    vi.advanceTimersByTime(pollDelay);

    // Value should remain unchanged
    expect(poller.value).toBe(initialValue);
    // Polling should continue
    expect(poller.isActive).toBe(true);
  });

  test('should update delay when setDelay is called', async () => {
    const newDelay = 200;
    poller.setDelay(newDelay);

    vi.advanceTimersByTime(newDelay);
    await poller.valueBroadcast.waitForResponse();

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('should handle manual value updates', () => {
    const newValue = 99;
    poller.set(newValue);
    expect(poller.value).toBe(newValue);
  });

  test('should execute single poll when poll() is called', async () => {
    const result = await poller.poll();
    expect(result).toBe(42);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  test('should clean up resources on dispose', () => {
    poller.dispose();
    expect(poller.isActive).toBe(false);

    vi.advanceTimersByTime(pollDelay);
    expect(mockAction).not.toHaveBeenCalled();
  });

  test('should handle delayFirstTick option', async () => {
    const customPoller = new PollAsync(initialValue, mockAction, pollDelay, {
      delayFirstTick: false,
      startImmediately: false,
    });

    expect(mockAction).not.toHaveBeenCalled();

    vi.advanceTimersByTime(pollDelay);
    await poller.valueBroadcast.waitForResponse();
    expect(mockAction).toHaveBeenCalledTimes(1);
    customPoller.dispose();
  });

  test('should notify subscribers of value changes', async () => {
    const subscriber = vi.fn();
    poller.valueBroadcast.subscribe(subscriber);

    vi.advanceTimersByTime(pollDelay);
    await poller.valueBroadcast.waitForResponse();

    expect(subscriber).toHaveBeenCalledWith(42);
  });

  test('should notify subscribers of active status changes', () => {
    const subscriber = vi.fn();
    poller.isActiveBroadcast.subscribe(subscriber);

    poller.stop();
    expect(subscriber).toHaveBeenCalledWith(false);

    poller.start();
    expect(subscriber).toHaveBeenCalledWith(true);
  });

  test('should handle synchronous actions', async () => {
    const syncAction = vi.fn().mockReturnValue(123);
    const syncPoller = new PollAsync(initialValue, syncAction, pollDelay);

    vi.advanceTimersByTime(pollDelay);
    await syncPoller.valueBroadcast.waitForResponse();

    expect(syncAction).toHaveBeenCalledTimes(1);
    expect(syncPoller.value).toBe(123);
    syncPoller.dispose();
  });

  test('should handle static start method', () => {
    const staticPoller = PollAsync.start(initialValue, mockAction, pollDelay);
    expect(staticPoller.isActive).toBe(true);
    staticPoller.dispose();
  });

  test('stop() should prevent in-flight request from updating value (#208)', async () => {
    let resolveAction: (value: number) => void = () => {};
    const slowAction = vi.fn().mockImplementation(
      () =>
        new Promise<number>(resolve => {
          resolveAction = resolve;
        })
    );
    const slowPoller = new PollAsync(0, slowAction, pollDelay, {
      startImmediately: false,
    });

    // Start polling — first tick fires immediately (delayFirstTick defaults to false)
    slowPoller.start();
    await vi.advanceTimersByTimeAsync(0);

    // Action is now in-flight
    expect(slowAction).toHaveBeenCalledTimes(1);

    // Stop while the request is still pending
    slowPoller.stop();

    // Resolve the in-flight request after stop
    resolveAction(999);
    await vi.advanceTimersByTimeAsync(0);

    // Value should NOT have been updated — stop() cancelled the in-flight request
    expect(slowPoller.value).toBe(0);

    slowPoller.dispose();
  });
});
