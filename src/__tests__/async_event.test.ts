import { describe, expect, test } from 'vitest';
import { AsyncEvent } from '../events/async_event.js';
import { delay } from '../delay.js';
import type { IEventSubscription } from '../events/base_event.js';

describe('AsyncEvent', () => {
  test('Notify', async () => {
    const event = new AsyncEvent<string>();
    let receivedValue: string | undefined;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    await event.notify('test');
    expect(receivedValue).toBe('test');
    expect(subscription.unsubscribe).toBeDefined();
  });

  test('Dispatch', async () => {
    const event = new AsyncEvent<string>();
    let receivedValue: string | undefined;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    await event.dispatch('test');
    expect(receivedValue).toBe('test');
    expect(subscription.unsubscribe).toBeDefined();
  });

  test('Notify with error', async () => {
    const event = new AsyncEvent<string>();
    let receivedValue: string | undefined;
    let errorReceived = false;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    const errorSubscription = event.subscribe(() => {
      throw new Error('Error');
    });

    try {
      await event.notify('test');
    } catch (error: any) {
      errorReceived = true;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Error');
    }
    expect(errorReceived).toBe(true);
    expect(receivedValue).toBe('test');
    expect(errorSubscription.unsubscribe).toBeDefined();
    expect(subscription.unsubscribe).toBeDefined();
  });

  test('Dispatch with error', async () => {
    const event = new AsyncEvent<string>();
    let receivedValue: string | undefined;
    let errorReceived = false;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    const errorSubscription = event.subscribe(() => {
      throw new Error('Error');
    });

    try {
      await event.dispatch('test');
    } catch {
      errorReceived = true;
    }
    expect(errorReceived).toBe(false);
    expect(receivedValue).toBe('test');
    expect(errorSubscription.unsubscribe).toBeDefined();
    expect(subscription.unsubscribe).toBeDefined();
  });

  test('Unsubscribe', async () => {
    const event = new AsyncEvent<string>();
    let receivedValue: string | undefined;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    subscription.unsubscribe();
    await event.notify('test');
    expect(receivedValue).toBe(undefined);
  });

  test('Test Async Event Queue', async () => {
    const s = new AsyncEvent<number>();
    const values: number[] = [];
    const otherValues: number[] = [];
    const subscriptions: IEventSubscription<number>[] = [];

    subscriptions.push(
      s.subscribe(async value => {
        await delay(1);
        values.push(value);
        if (value === 1) s.notify(value + 1);
      })
    );

    subscriptions.push(
      s.subscribe(async value => {
        await delay(1);
        otherValues.push(value);
      })
    );

    await s.notify(1);
    await s.notify(2);

    expect(values).toEqual([1, 2, 2]);
    expect(otherValues).toEqual([1, 2, 2]);
    subscriptions.forEach(subscription => subscription.unsubscribe());
  });
});
