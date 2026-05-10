import { Signal } from '../signal.js';
import { describe, expect, test } from 'vitest';

describe('Signal', () => {
  test('Default', () => {
    const s = new Signal(1);
    let nextValue = 0;

    s.subscribe(value => {
      nextValue = value;
    });

    s.set(1);
    expect(s.version).toBe(1);
    expect(nextValue).toBe(1);
  });

  test('Dispose', () => {
    const s = new Signal(0);
    expect(s.get()).toBe(0);
    s.dispose();
  });

  test('Using Transform Value', () => {
    const s = new Signal('hello');

    s.transform(o => {
      return o + ' world';
    });

    expect(s.get()).toBe('hello world');
  });

  test('Errors Thrown In Subscription Callbacks', () => {
    const reports: string[] = [];
    const s = new Signal('hello');

    s.subscribe(() => {
      reports.push('1');
    });

    s.subscribe(() => {
      throw new Error('Bad');
    });

    s.subscribe(() => {
      reports.push('2');
    });

    expect(() => {
      s.set('Boo');
    }).toThrow('Bad');

    expect(reports).toEqual(['1', '2']);
  });

  test('Multiple Subscriptions', () => {
    const s = new Signal(0);
    const values: number[] = [];

    const sub1 = s.subscribe(value => values.push(value));
    const sub2 = s.subscribe(value => values.push(value * 2));

    s.set(1);
    expect(values).toEqual([1, 2]);

    sub1.unsubscribe();
    s.set(2);
    expect(values).toEqual([1, 2, 4]);

    sub2.unsubscribe();
    s.set(3);
    expect(values).toEqual([1, 2, 4]);
  });

  test('Transform with Complex Objects', () => {
    interface User {
      name: string;
      age: number;
      preferences: {
        theme: string;
        notifications: boolean;
      };
    }

    const initialUser: User = {
      name: 'John',
      age: 30,
      preferences: {
        theme: 'light',
        notifications: true,
      },
    };

    const s = new Signal(initialUser);

    s.transform(user => {
      user.preferences.theme = 'dark';
      return user;
    });

    expect(s.get().preferences.theme).toBe('dark');
    expect(s.get().name).toBe('John'); // Other properties unchanged
  });

  test('Version Increments on Value Changes', () => {
    const s = new Signal(0);
    expect(s.version).toBe(0);

    s.set(1);
    expect(s.version).toBe(1);

    s.transform(v => v + 1);
    expect(s.version).toBe(2);
  });

  test('Broadcast Interface', () => {
    const s = new Signal(0);
    const values: number[] = [];

    s.broadcast.subscribe(value => values.push(value));
    s.set(1);
    expect(values).toEqual([1]);
  });

  test('Sweep Subscriptions', () => {
    const s = new Signal(0);
    let callbackCount = 0;

    const sub = s.subscribe(() => callbackCount++);
    s.set(1);
    expect(callbackCount).toBe(1);

    // Force garbage collection simulation
    s.sweepSubscriptions();
    s.set(2);
    expect(callbackCount).toBe(2);

    // Unsubscribe and sweep
    sub.unsubscribe();
    s.sweepSubscriptions();
    s.set(3);
    expect(callbackCount).toBe(2);
  });

  test('Dispose Cleans Up Resources', () => {
    const s = new Signal(0);
    let callbackCount = 0;

    s.subscribe(() => callbackCount++);
    s.set(1);
    expect(callbackCount).toBe(1);

    s.dispose();
    s.set(2);
    expect(callbackCount).toBe(1);
  });

  test('Multiple Transform Operations', () => {
    const s = new Signal(0);

    s.transform(v => v + 1);
    s.transform(v => v * 2);
    s.transform(v => v + 3);

    expect(s.get()).toBe(5); // ((0 + 1) * 2) + 3
  });

  test('Subscription Order', () => {
    const s = new Signal(0);
    const order: number[] = [];

    s.subscribe(() => order.push(1));
    s.subscribe(() => order.push(2));
    s.subscribe(() => order.push(3));

    s.set(1);
    expect(order).toEqual([1, 2, 3]);
  });

  test('Next', async () => {
    const s = new Signal(0);
    const p = s.wait();
    s.set(1);
    const value = await p;
    expect(value).toBe(1);
  });

  test('WaitFor', async () => {
    let resolved = false;
    const s = new Signal(0);
    const p = s.waitFor(value => value > 10);
    p.then(() => (resolved = true));
    s.set(10);
    await Promise.resolve(); // Flush microtask queue to ensure promise resolution is processed
    expect(resolved).toBe(false); // Should not resolve when value is 10 (not > 10)
    s.set(11);
    await Promise.resolve(); // Flush microtask queue to ensure promise resolution is processed
    expect(resolved).toBe(true); // Should resolve when value is 11 (> 10)
    const value = await p; // Verify the resolved value
    expect(value).toBe(11);
    expect(s.subscriptions.length).toBe(0);
  });

  // This test a set happening within a subscription callback.
  // This is bad practice because could lead to infinite loops.
  test('Test Value Queue', () => {
    const s = new Signal(0);
    const values: number[] = [];
    const otherValues: number[] = [];

    s.subscribe(value => {
      values.push(value);
      if (value === 1) s.set(value + 1);
    });

    s.subscribe(value => {
      otherValues.push(value);
    });

    s.set(1);
    s.set(2);
    expect(values).toEqual([1, 2, 2]);
    expect(otherValues).toEqual([1, 2, 2]);
  });
});
