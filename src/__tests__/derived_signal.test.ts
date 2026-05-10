import { DerivedSignal, derive } from '../derived_signal.js';
import { Signal } from '../signal.js';
import { describe, expect, test } from 'vitest';

/** Flush pending microtasks so DerivedSignal recalculations complete. */
const flush = () => new Promise<void>(resolve => queueMicrotask(resolve));

describe('DerivedSignal', () => {
  test('Single Signal Derivation', async () => {
    const source = new Signal(42);
    const derived = new DerivedSignal([source], a => a * 2);

    expect(derived.get()).toBe(84);

    source.set(10);
    await flush();
    expect(derived.get()).toBe(20);
  });

  test('Two Signal Derivation', async () => {
    const sourceA = new Signal('Hello');
    const sourceB = new Signal('World');
    const derived = new DerivedSignal([sourceA, sourceB], (a, b) => `${a} ${b}`);

    expect(derived.get()).toBe('Hello World');

    sourceA.set('Goodbye');
    await flush();
    expect(derived.get()).toBe('Goodbye World');

    sourceB.set('Universe');
    await flush();
    expect(derived.get()).toBe('Goodbye Universe');
  });

  test('Three Signal Derivation', async () => {
    const sourceA = new Signal(1);
    const sourceB = new Signal(2);
    const sourceC = new Signal(3);
    const derived = new DerivedSignal(
      [sourceA, sourceB, sourceC],
      (a, b, c) => a + b + c
    );

    expect(derived.get()).toBe(6);

    sourceA.set(10);
    await flush();
    expect(derived.get()).toBe(15);

    sourceB.set(20);
    await flush();
    expect(derived.get()).toBe(33);

    sourceC.set(30);
    await flush();
    expect(derived.get()).toBe(60);
  });

  test('Four Signal Derivation', async () => {
    const sourceA = new Signal('A');
    const sourceB = new Signal('B');
    const sourceC = new Signal('C');
    const sourceD = new Signal('D');
    const derived = new DerivedSignal(
      [sourceA, sourceB, sourceC, sourceD],
      (a, b, c, d) => `${a}${b}${c}${d}`
    );

    expect(derived.get()).toBe('ABCD');

    sourceA.set('X');
    await flush();
    expect(derived.get()).toBe('XBCD');

    sourceD.set('Z');
    await flush();
    expect(derived.get()).toBe('XBCZ');
  });

  test('Five Signal Derivation', async () => {
    const sourceA = new Signal(1);
    const sourceB = new Signal(2);
    const sourceC = new Signal(3);
    const sourceD = new Signal(4);
    const sourceE = new Signal(5);
    const derived = new DerivedSignal(
      [sourceA, sourceB, sourceC, sourceD, sourceE],
      (a, b, c, d, e) => a * b * c * d * e
    );

    expect(derived.get()).toBe(120);

    sourceA.set(2);
    await flush();
    expect(derived.get()).toBe(240);

    sourceE.set(10);
    await flush();
    expect(derived.get()).toBe(480);
  });

  test('Complex Object Derivation', async () => {
    interface User {
      name: string;
      age: number;
    }

    const nameSignal = new Signal('John');
    const ageSignal = new Signal(30);
    const derived = new DerivedSignal(
      [nameSignal, ageSignal],
      (name, age): User => ({ name, age })
    );

    expect(derived.get()).toEqual({ name: 'John', age: 30 });

    nameSignal.set('Jane');
    await flush();
    expect(derived.get()).toEqual({ name: 'Jane', age: 30 });

    ageSignal.set(25);
    await flush();
    expect(derived.get()).toEqual({ name: 'Jane', age: 25 });
  });

  test('Array Derivation', async () => {
    const sourceA = new Signal([1, 2, 3]);
    const sourceB = new Signal([4, 5, 6]);
    const derived = new DerivedSignal([sourceA, sourceB], (a, b) => [...a, ...b]);

    expect(derived.get()).toEqual([1, 2, 3, 4, 5, 6]);

    sourceA.set([10, 20]);
    await flush();
    expect(derived.get()).toEqual([10, 20, 4, 5, 6]);
  });

  test('Conditional Derivation', async () => {
    const conditionSignal = new Signal(true);
    const valueSignal = new Signal('active');
    const derived = new DerivedSignal(
      [conditionSignal, valueSignal],
      (condition, value) => (condition ? value : 'inactive')
    );

    expect(derived.get()).toBe('active');

    conditionSignal.set(false);
    await flush();
    expect(derived.get()).toBe('inactive');

    valueSignal.set('ready');
    await flush();
    expect(derived.get()).toBe('inactive');

    conditionSignal.set(true);
    await flush();
    expect(derived.get()).toBe('ready');
  });

  test('Dispose Cleans Up Subscriptions', async () => {
    const source = new Signal(42);
    const derived = new DerivedSignal([source], a => a * 2);

    let callbackCount = 0;
    derived.subscribe(() => callbackCount++);

    source.set(10);
    await flush();
    expect(callbackCount).toBe(1);

    derived.dispose();
    source.set(20);
    await flush();
    expect(callbackCount).toBe(1); // Should not trigger after dispose
  });

  test('Multiple Derived Signals from Same Source', async () => {
    const source = new Signal(10);
    const derived1 = new DerivedSignal([source], a => a * 2);
    const derived2 = new DerivedSignal([source], a => a + 5);

    expect(derived1.get()).toBe(20);
    expect(derived2.get()).toBe(15);

    source.set(20);
    await flush();
    expect(derived1.get()).toBe(40);
    expect(derived2.get()).toBe(25);
  });

  test('Nested Derived Signals', async () => {
    const source = new Signal(5);
    const derived1 = new DerivedSignal([source], a => a * 2);
    const derived2 = new DerivedSignal([derived1], a => a + 10);

    expect(derived1.get()).toBe(10);
    expect(derived2.get()).toBe(20);

    source.set(10);
    await flush();
    expect(derived1.get()).toBe(20);
    // derived2 needs another microtask since derived1's update triggers it
    await flush();
    expect(derived2.get()).toBe(30);
  });

  test('Version Increments on Source Changes', async () => {
    const source = new Signal(42);
    const derived = new DerivedSignal([source], a => a * 2);

    expect(derived.version).toBe(0);

    source.set(10);
    await flush();
    expect(derived.version).toBe(1);

    source.set(20);
    await flush();
    expect(derived.version).toBe(2);
  });

  test('Subscription Order', async () => {
    const source = new Signal(0);
    const derived = new DerivedSignal([source], a => a * 2);
    const order: number[] = [];

    derived.subscribe(() => order.push(1));
    derived.subscribe(() => order.push(2));
    derived.subscribe(() => order.push(3));

    source.set(1);
    await flush();
    expect(order).toEqual([1, 2, 3]);
  });
});

describe('derive function', () => {
  test('Single Signal with derive', async () => {
    const source = new Signal(42);
    const derived = derive(source, a => a * 2);

    expect(derived.get()).toBe(84);
    expect(derived).toBeInstanceOf(DerivedSignal);

    source.set(10);
    await flush();
    expect(derived.get()).toBe(20);
  });

  test('Two Signals with derive', async () => {
    const sourceA = new Signal('Hello');
    const sourceB = new Signal('World');
    const derived = derive(sourceA, sourceB, (a, b) => `${a} ${b}`);

    expect(derived.get()).toBe('Hello World');
    expect(derived).toBeInstanceOf(DerivedSignal);

    sourceA.set('Goodbye');
    await flush();
    expect(derived.get()).toBe('Goodbye World');
  });

  test('Three Signals with derive', async () => {
    const sourceA = new Signal(1);
    const sourceB = new Signal(2);
    const sourceC = new Signal(3);
    const derived = derive(sourceA, sourceB, sourceC, (a, b, c) => a + b + c);

    expect(derived.get()).toBe(6);
    expect(derived).toBeInstanceOf(DerivedSignal);

    sourceA.set(10);
    await flush();
    expect(derived.get()).toBe(15);
  });

  test('Four Signals with derive', async () => {
    const sourceA = new Signal('A');
    const sourceB = new Signal('B');
    const sourceC = new Signal('C');
    const sourceD = new Signal('D');
    const derived = derive(
      sourceA,
      sourceB,
      sourceC,
      sourceD,
      (a, b, c, d) => `${a}${b}${c}${d}`
    );

    expect(derived.get()).toBe('ABCD');
    expect(derived).toBeInstanceOf(DerivedSignal);

    sourceA.set('X');
    await flush();
    expect(derived.get()).toBe('XBCD');
  });

  test('Five Signals with derive', async () => {
    const sourceA = new Signal(1);
    const sourceB = new Signal(2);
    const sourceC = new Signal(3);
    const sourceD = new Signal(4);
    const sourceE = new Signal(5);
    const derived = derive(
      sourceA,
      sourceB,
      sourceC,
      sourceD,
      sourceE,
      (a, b, c, d, e) => a * b * c * d * e
    );

    expect(derived.get()).toBe(120);
    expect(derived).toBeInstanceOf(DerivedSignal);

    sourceA.set(2);
    await flush();
    expect(derived.get()).toBe(240);
  });

  test('Type Safety with derive', () => {
    const stringSignal = new Signal('hello');
    const numberSignal = new Signal(42);
    const booleanSignal = new Signal(true);

    const derived = derive(
      stringSignal,
      numberSignal,
      booleanSignal,
      (str, num, bool) => ({
        message: str,
        count: num,
        active: bool,
      })
    );

    expect(derived.get()).toEqual({
      message: 'hello',
      count: 42,
      active: true,
    });
  });

  test('Complex Derivation Chain', async () => {
    const baseSignal = new Signal(10);
    const multiplierSignal = new Signal(2);
    const offsetSignal = new Signal(5);

    const derived1 = derive(baseSignal, multiplierSignal, (base, mult) => base * mult);
    const derived2 = derive(derived1, offsetSignal, (result, offset) => result + offset);

    expect(derived1.get()).toBe(20);
    expect(derived2.get()).toBe(25);

    baseSignal.set(15);
    await flush();
    expect(derived1.get()).toBe(30);
    // derived2 needs another tick since derived1's recalc triggers it
    await flush();
    expect(derived2.get()).toBe(35);
  });

  test('Async-like Behavior with Multiple Updates', async () => {
    const signal1 = new Signal(0);
    const signal2 = new Signal(0);
    const signal3 = new Signal(0);

    const derived = derive(signal1, signal2, signal3, (a, b, c) => a + b + c);

    // Simulate rapid updates — all in the same synchronous tick
    signal1.set(1);
    signal2.set(2);
    signal3.set(3);

    await flush();
    expect(derived.get()).toBe(6);

    // Update all signals again
    signal1.set(10);
    signal2.set(20);
    signal3.set(30);

    await flush();
    expect(derived.get()).toBe(60);
  });

  test('Memory Management with derive', async () => {
    const source = new Signal(42);
    const derived = derive(source, a => a * 2);

    let callbackCount = 0;
    const subscription = derived.subscribe(() => callbackCount++);

    source.set(10);
    await flush();
    expect(callbackCount).toBe(1);

    subscription.unsubscribe();
    source.set(20);
    await flush();
    expect(callbackCount).toBe(1); // Should not trigger after unsubscribe

    derived.dispose();
    source.set(30);
    await flush();
    expect(callbackCount).toBe(1); // Should not trigger after dispose
  });
});

describe('Diamond dependency batching (#209)', () => {
  test('Diamond: two sources changing in same tick causes single recalculation', async () => {
    //     root
    //    /    \
    //   A      B
    //    \    /
    //     leaf
    const root = new Signal(1);
    const a = new DerivedSignal([root], x => x + 1);
    const b = new DerivedSignal([root], x => x * 10);

    let leafCallCount = 0;
    const leaf = new DerivedSignal([a, b], (aVal, bVal) => {
      leafCallCount++;
      return aVal + bVal;
    });

    // Initial: a=2, b=10, leaf=12, leafCallCount=1 (from constructor)
    expect(leaf.get()).toBe(12);
    expect(leafCallCount).toBe(1);

    // Changing root triggers both a and b in the same tick
    root.set(2);
    await flush(); // a and b recalculate
    await flush(); // leaf recalculates once (batched)

    expect(a.get()).toBe(3);
    expect(b.get()).toBe(20);
    expect(leaf.get()).toBe(23);
    // The key assertion: leaf should only recalculate once, not twice
    expect(leafCallCount).toBe(2); // 1 initial + 1 batched recalc
  });

  test('Diamond: deep dependency graph does not cause exponential recalculation', async () => {
    // Build a 3-level diamond:
    //        root
    //       /    \
    //      a1     a2
    //       \    /
    //        mid
    //       /    \
    //      b1     b2
    //       \    /
    //       bottom
    const root = new Signal(1);
    const a1 = new DerivedSignal([root], x => x + 1);
    const a2 = new DerivedSignal([root], x => x + 2);

    let midCount = 0;
    const mid = new DerivedSignal([a1, a2], (v1, v2) => {
      midCount++;
      return v1 + v2;
    });

    const b1 = new DerivedSignal([mid], x => x * 2);
    const b2 = new DerivedSignal([mid], x => x * 3);

    let bottomCount = 0;
    const bottom = new DerivedSignal([b1, b2], (v1, v2) => {
      bottomCount++;
      return v1 + v2;
    });

    // Initial values
    // a1=2, a2=3, mid=5 (midCount=1)
    // b1=10, b2=15, bottom=25 (bottomCount=1)
    expect(bottom.get()).toBe(25);
    expect(midCount).toBe(1);
    expect(bottomCount).toBe(1);

    // Change root — propagates through the whole diamond
    root.set(10);

    // Flush multiple levels of microtask propagation
    await flush(); // a1, a2 recalculate
    await flush(); // mid recalculates (once, batched)
    await flush(); // b1, b2 recalculate
    await flush(); // bottom recalculates (once, batched)

    expect(a1.get()).toBe(11);
    expect(a2.get()).toBe(12);
    expect(mid.get()).toBe(23);
    expect(b1.get()).toBe(46);
    expect(b2.get()).toBe(69);
    expect(bottom.get()).toBe(115);

    // Mid and bottom should each only recalculate once per root change
    expect(midCount).toBe(2); // 1 initial + 1
    expect(bottomCount).toBe(2); // 1 initial + 1
  });

  test('Multiple synchronous source changes batch into single recalc', async () => {
    const a = new Signal(1);
    const b = new Signal(2);

    let calcCount = 0;
    const derived = new DerivedSignal([a, b], (aVal, bVal) => {
      calcCount++;
      return aVal + bVal;
    });

    expect(derived.get()).toBe(3);
    expect(calcCount).toBe(1);

    // Both change in same synchronous tick
    a.set(10);
    b.set(20);

    await flush();
    expect(derived.get()).toBe(30);
    // Should only recalculate once despite two source changes
    expect(calcCount).toBe(2); // 1 initial + 1 batched
  });
});
