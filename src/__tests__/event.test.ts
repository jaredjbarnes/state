import { describe, expect, test } from 'vitest';
import { Event } from '../events/event.js';

describe('Event', () => {
  test('Notify', () => {
    const event = new Event<string>();
    let receivedValue: string | undefined;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    event.notify('test');
    expect(receivedValue).toBe('test');
    expect(subscription.unsubscribe).toBeDefined();
  });

  test('Dispatch', () => {
    const event = new Event<string>();
    let receivedValue: string | undefined;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    event.dispatch('test');
    expect(receivedValue).toBe('test');
    expect(subscription.unsubscribe).toBeDefined();
  });

  test('Notify with error', () => {
    const event = new Event<string>();
    let receivedValue: string | undefined;
    let errorReceived = false;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    const errorSubscription = event.subscribe(() => {
      throw new Error('Error');
    });

    try {
      event.notify('test');
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

  test('Dispatch with error', () => {
    const event = new Event<string>();
    let receivedValue: string | undefined;
    let errorReceived = false;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    const errorSubscription = event.subscribe(() => {
      throw new Error('Error');
    });

    try {
      event.dispatch('test');
    } catch {
      errorReceived = true;
    }
    expect(errorReceived).toBe(false);
    expect(receivedValue).toBe('test');
    expect(errorSubscription.unsubscribe).toBeDefined();
    expect(subscription.unsubscribe).toBeDefined();
  });

  test('Unsubscribe', () => {
    const event = new Event<string>();
    let receivedValue: string | undefined;

    const subscription = event.subscribe(value => {
      receivedValue = value;
    });

    subscription.unsubscribe();
    event.notify('test');
    expect(receivedValue).toBe(undefined);
  });

  test('Test Event Queue', () => {
    const s = new Event<number>();
    const values: number[] = [];
    const otherValues: number[] = [];

    s.subscribe(value => {
      values.push(value);
      if (value === 1) s.notify(value + 1);
    });

    s.subscribe(value => {
      otherValues.push(value);
    });

    s.notify(1);
    s.notify(2);
    expect(values).toEqual([1, 2, 2]);
    expect(otherValues).toEqual([1, 2, 2]);
  });
});
