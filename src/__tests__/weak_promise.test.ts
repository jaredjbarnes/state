import { WeakPromise } from '../weak_promise.js';
import { describe, expect, test } from 'vitest';

describe('WeakPromise', () => {
  test('Immediately Resolve', async () => {
    const promise = new WeakPromise(resolve => {
      resolve('Hello World!');
      return () => {};
    });

    const result = await promise;

    expect(result).toBe('Hello World!');
  });

  test('Immediately Reject', async () => {
    const promise = new WeakPromise((_, reject) => {
      reject(new Error('Bad'));
      return () => {};
    });

    try {
      await promise;
    } catch (e: any) {
      expect(e.message).toBe('Bad');
    }
  });

  test('Cancel on a fulfilled promise', async () => {
    let cleaned = false;
    const promise = new WeakPromise(resolve => {
      resolve('Hello World!');
      return () => {
        cleaned = true;
      };
    });

    const result = await promise;
    promise.cancel('Too Late!');

    expect(cleaned).toBe(false);
    expect(result).toBe('Hello World!');
  });

  test('Cancel on a rejected promise', async () => {
    let cleaned = false;
    const promise = new WeakPromise((_, reject) => {
      reject(new Error('Bad'));
      return () => {
        cleaned = true;
      };
    });

    try {
      await promise;
      promise.cancel('Too Late!');
    } catch (e: any) {
      expect(cleaned).toBe(false);
      expect(e.message).toBe('Bad');
    }
  });

  test('Cancel Promise', async () => {
    let cancelled = false;

    const promise = new WeakPromise(() => {
      return () => {
        cancelled = true;
      };
    });

    global.setTimeout(() => {
      promise.cancel(new Error('Stopped'));
    }, 0);

    try {
      await promise;
    } catch (e: any) {
      expect(e.message).toBe('Stopped');
    }

    expect(cancelled).toBe(true);
  });

  test('All Success,', async () => {
    const p1 = WeakPromise.resolve(1);
    const p2 = WeakPromise.resolve('One');
    const all = WeakPromise.all([p1, p2]);

    const results = await all;

    expect(results[0]).toBe(1);
    expect(results[1]).toBe('One');
  });

  test('All settled successfully runs.', async () => {
    const p1 = WeakPromise.resolve(1);
    const p2 = WeakPromise.resolve('One');
    const all = WeakPromise.allSettled([p1, p2]);

    const results = await all;

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
    expect((results[0] as any).value).toBe(1);
    expect((results[1] as any).value).toBe('One');
  });

  test('Using all settled fail one.', async () => {
    const p1 = WeakPromise.resolve(1);
    const p2 = WeakPromise.reject('Error');
    const all = WeakPromise.allSettled([p1, p2]);

    const results = await all;

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect((results[0] as any).value).toBe(1);
    expect((results[1] as any).reason).toBe('Error');
  });

  test('Using mixed values with all.', async () => {
    const p1 = WeakPromise.resolve(1);
    const p2 = Promise.resolve('Two');
    const all = WeakPromise.all([p1, p2, 3]);

    const results = await all;

    expect(results[0]).toBe(1);
    expect(results[1]).toBe('Two');
    expect(results[2]).toBe(3);
  });

  test('Using mixed values with all settled.', async () => {
    const p1 = WeakPromise.resolve(1);
    const p2 = Promise.resolve('Two');
    const all = WeakPromise.allSettled([p1, p2, 3]);

    const results = await all;

    expect((results[0] as any).value).toBe(1);
    expect((results[1] as any).value).toBe('Two');
    expect((results[2] as any).value).toBe(3);
  });

  test('Multiple WeakPromises types with all.', async () => {
    const values = [false, null, undefined, 1, 'Two', {}];
    const weakPromises = values.map((v, index: number) => {
      return new WeakPromise(resolve => {
        global.setTimeout(resolve, index, v);
        return () => {};
      });
    });

    const all = WeakPromise.all(weakPromises);
    const results = await all;

    expect(results.every((v, index) => values[index] === v)).toBe(true);
  });

  test('Multiple WeakPromises types with allSettled.', async () => {
    const values = [false, null, undefined, 1, 'Two', {}];
    const weakPromises = values.map((v, index: number) => {
      return new WeakPromise(resolve => {
        global.setTimeout(resolve, index, v);
        return () => {};
      });
    });

    const all = WeakPromise.allSettled(weakPromises);
    const results = await all;

    const allMatch = results.every((v, index) => {
      const result = (v as any).value === values[index];
      return result;
    });

    expect(allMatch).toBe(true);
  });
});
