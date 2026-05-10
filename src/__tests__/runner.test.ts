import { Action } from '../irunner.js';
import { Status } from '../irunner_broadcast.js';
import { Runner } from '../runner.js';
import { WeakPromise } from '../weak_promise.js';
import { delay } from '../delay.js';
import { describe, expect, test } from 'vitest';

describe('Runner', () => {
  test('Success', async () => {
    const statuses: Status[] = [];
    const runner = new Runner(0);

    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
    });

    const value = await runner.execute(() => {
      return Promise.resolve(1);
    });

    expect(runner.get()).toBe(1);
    expect(value).toBe(runner.get());
    expect(runner.stateBroadcast.get().error).toBe(null);
    expect(statuses).toEqual(['pending', 'success']);
  });

  test('Error', async () => {
    const statuses: Status[] = [];
    const runner = new Runner(0);
    const error = new Error('Bad');

    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
    });

    try {
      await runner.execute(() => {
        return Promise.reject(error);
      });
    } catch (error) {
      expect(runner.get()).toBe(0);
      expect(runner.stateBroadcast.get().error).toBe(error);
      expect(statuses).toEqual(['pending', 'error']);
    }
  });

  test('Reset', async () => {
    const statuses: Status[] = [];
    const runner = new Runner(0);
    const error = new Error('Bad');

    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
    });

    try {
      await runner.execute(() => {
        return Promise.reject(error);
      });
    } catch (error) {
      expect(runner.get()).toBe(0);
      expect(runner.stateBroadcast.get().error).toBe(error);
      expect(statuses).toEqual(['pending', 'error']);

      runner.set(5);
      expect(runner.get()).toBe(5);

      runner.reset();
      expect(runner.get()).toBe(0);
      expect(runner.stateBroadcast.get().error).toBe(null);
      expect(runner.stateBroadcast.get().status).toBe('initial');
    }
  });

  test('Retry', async () => {
    const statuses: Status[] = [];
    let count = 0;
    const runner = new Runner(0);
    const error = new Error('Bad');

    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
    });

    const action = () => {
      if (count === 0) {
        count++;
        return Promise.reject(error);
      } else {
        return Promise.resolve(1);
      }
    };

    try {
      await runner.execute(action);
    } catch (_e) {
      try {
        await runner.retry();
      } catch (_e) {}
    }

    expect(statuses).toEqual(['pending', 'error', 'pending', 'success']);
    expect(runner.get()).toBe(1);
  });

  test('Dispose', () => {
    const runner = new Runner(0);
    expect(runner.get()).toBe(0);
    runner.dispose();
  });

  test('Multiple executions.', async () => {
    const runner = new Runner(0);

    const action = () => {
      return Promise.resolve(runner.get() + 1);
    };

    let value = await runner.execute(action);
    expect(value).toBe(1);
    value = await runner.execute(action);
    expect(value).toBe(2);
  });

  test('Cancel.', async () => {
    const runner = new Runner(0);
    let isCancelled = false;
    const action = () => {
      return new Promise<number>(_ => {
        return () => {
          isCancelled = true;
        };
      });
    };

    try {
      runner.dispatch(action);
      runner.cancel();
    } catch (error: any) {
      expect(isCancelled).toBe(true);
      expect(error?.message).toBe('Cancelled');
    }
  });

  test('Execute when in error state.', async () => {
    const runner = new Runner(0);
    const action = () => {
      return new Promise<number>(resolve => {
        global.setTimeout(resolve, 1, 1);
        return () => {};
      });
    };

    let value: number = runner.get();

    try {
      value = await runner.execute(action);
    } catch (error) {
      expect(error).toBe('Bad News');
      try {
        value = await runner.execute(action);
      } catch (_error) {}
    }

    expect(value).toBe(1);
  });

  test('Task set value directly.', () => {
    const runner = new Runner(0);

    runner.set(1);
    expect(runner.get()).toBe(1);
  });

  test('Reset then execute.', () => {
    return new Promise<void>(resolve => {
      const statuses: string[] = [];
      let cancelledCount = 0;

      const runner = new Runner(0);
      runner.stateBroadcast.subscribe(state => {
        statuses.push(state.status);
      });

      const action: Action<number> = () => {
        return new WeakPromise<number>(resolve => {
          delay(100).then(() => resolve(cancelledCount));
          return () => {
            cancelledCount++;
          };
        });
      };

      runner.dispatch(action);
      runner.reset();
      runner.dispatch(action);
      runner.cancel();
      runner.waitForResponse().then(() => {
        expect(statuses[0]).toBe('pending');
        expect(statuses[1]).toBe('error');
        expect(statuses[2]).toBe('initial');
        expect(statuses[3]).toBe('pending');
        expect(statuses[4]).toBe('error');
        expect(statuses.length).toBe(5);
        expect(cancelledCount).toBe(2);
        resolve();
      });
    });
  });

  test('Throw error in action.', () => {
    return new Promise<void>(resolve => {
      let isResolved = false;
      let isError = false;
      const runner = new Runner(0);
      const action = () => {
        throw new Error();
      };

      runner
        .execute(action)
        .then(() => {
          isResolved = true;
        })
        .catch(() => {
          isError = true;
        })
        .finally(() => {
          expect(isError).toBe(true);
          expect(isResolved).toBe(false);
          resolve();
        });
    });
  });

  test('Check status on Success', async () => {
    const changeValues: Status[] = [];
    const runner = new Runner(0);
    runner.subscribe(() => {
      changeValues.push(runner.stateBroadcast.get().status);
    });

    await runner.execute(() => Promise.resolve(1));
    expect(changeValues[0]).toBe(Status.SUCCESS);
    expect(changeValues.length).toBe(1);
  });

  test('Check status on Error', async () => {
    const changeValues: Status[] = [];
    const runner = new Runner(0);
    runner.stateBroadcast.subscribe(() => {
      changeValues.push(runner.stateBroadcast.get().status);
    });

    try {
      await runner.execute(() => Promise.reject(new Error('Thrown Error')));
    } catch (_e) {
      expect(changeValues).toEqual([Status.PENDING, Status.ERROR]);
      expect(changeValues.length).toBe(2);
    }
  });

  test('Check status on Pending', async () => {
    const runner = new Runner(0);
    runner.execute(() => Promise.resolve(1));
    expect(runner.stateBroadcast.get().status).toBe(Status.PENDING);
  });

  test('Execute on a Pending Runner.', async () => {
    const statuses: Status[] = [];
    const values: number[] = [];
    const errors: (Error | null)[] = [];

    const runner = new Runner(0);
    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
      errors.push(runner.stateBroadcast.get().error);
      values.push(runner.get());
    });

    runner.dispatch(() => delay(100).then(() => 1));
    await runner.execute(() => Promise.resolve(2));

    expect(runner.stateBroadcast.get().error).toBe(null);
    expect(runner.get()).toBe(2);
    expect(statuses[0]).toBe('pending');
    expect(statuses[1]).toBe('success');
    expect(statuses[2]).toBe('pending');
    expect(statuses[3]).toBe('success');
    expect(errors[0]).toBe(null);
    expect(errors[1]).toBe(null);
    expect(errors[2]).toBe(null);
    expect(errors[3]).toBe(null);
    expect(values[0]).toBe(0);
    expect(values[1]).toBe(1);
    expect(values[2]).toBe(1);
    expect(values[3]).toBe(2);
  });

  test('Dispatch.', async () => {
    const statuses: Status[] = [];
    const values: number[] = [];
    const errors: (Error | null)[] = [];
    const runner = new Runner(0);

    const promise = new Promise(resolve => {
      runner.stateBroadcast.subscribe(state => {
        statuses.push(state.status);
        errors.push(runner.stateBroadcast.get().error);
        values.push(runner.get());

        if (state.status === 'success') {
          resolve(undefined);
        }
      });

      runner.dispatch(() => Promise.resolve(1));
    });

    await promise;

    expect(runner.stateBroadcast.get().error).toBe(null);
    expect(runner.get()).toBe(1);
    expect(statuses[0]).toBe('pending');
    expect(statuses[1]).toBe('success');
    expect(errors[0]).toBe(null);
    expect(errors[1]).toBe(null);
    expect(values[0]).toBe(0);
    expect(values[1]).toBe(1);
  });

  test('Return value on execute.', async () => {
    const runner = new Runner(0);
    const value = await runner.execute(() => 1);
    expect(value).toBe(1);
  });

  test('Is state correct on status change.', async () => {
    const statuses: Status[] = [];
    const values: number[] = [];
    const errors: (Error | null)[] = [];

    const runner = new Runner(0);
    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
      errors.push(state.error);
      values.push(runner.get());
    });

    try {
      await runner.execute(() => Promise.resolve(1));
      await runner.execute(() => Promise.reject('Bad'));
    } catch (_e) {}

    expect(statuses[0]).toBe(Status.PENDING);
    expect(values[0]).toBe(0);
    expect(errors[0]).toBe(null);

    expect(statuses[1]).toBe(Status.SUCCESS);
    expect(values[1]).toBe(1);
    expect(errors[1]).toBe(null);

    expect(statuses[2]).toBe(Status.PENDING);
    expect(values[2]).toBe(1);
    expect(errors[2]).toBe(null);

    expect(statuses[3]).toBe(Status.ERROR);
    expect(values[3]).toBe(1);
    expect(errors[3]).toBe('Bad');
  });

  test('Set value.', () => {
    const statuses: Status[] = [];
    const values: number[] = [];
    const errors: (Error | null)[] = [];

    const runner = new Runner(0);
    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
      errors.push(state.error);
      values.push(runner.get());
    });

    runner.set(2);

    expect(statuses[0]).toBe('success');
    expect(errors[0]).toBe(null);
    expect(values[0]).toBe(2);
  });

  test('Set value on pending runner.', () => {
    const statuses: Status[] = [];
    const values: number[] = [];
    const errors: (Error | null)[] = [];

    const runner = new Runner(0);
    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
      errors.push(state.error);
      values.push(state.value);
    });

    runner.dispatch(() => new Promise(() => {}));
    runner.set(1);

    expect(statuses[0]).toBe('pending');
    expect(statuses[1]).toBe('error');
    expect(statuses[2]).toBe('success');

    expect(errors[0]).toBe(null);
    expect(errors[1]?.message).toBe('Cancelled by setValue.');
    expect(errors[2]).toBe(null);

    expect(values[0]).toBe(0);
    expect(values[1]).toBe(0);
    expect(values[2]).toBe(1);
  });

  test('Set error.', () => {
    const statuses: Status[] = [];
    const values: number[] = [];
    const errors: (Error | null)[] = [];

    const runner = new Runner(0);
    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
      errors.push(state.error);
      values.push(state.value);
    });

    runner.setError(new Error('Error'));

    expect(statuses[0]).toBe('error');
    expect(errors[0]?.message).toBe('Error');
    expect(values[0]).toBe(0);
  });

  test('Dispatch and wait for it to finish.', async () => {
    const statuses: Status[] = [];
    const values: number[] = [];
    const errors: (Error | null)[] = [];

    const runner = new Runner(0);
    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
      errors.push(state.error);
      values.push(state.value);
    });

    await runner.dispatch(
      () =>
        new Promise(resolve => {
          resolve(1);
        })
    );

    expect(statuses[0]).toBe('pending');
    expect(statuses[1]).toBe('success');

    expect(errors[0]).toBe(null);
    expect(errors[1]).toBe(null);

    expect(values[0]).toBe(0);
    expect(values[1]).toBe(1);
  });

  test('Set error on pending runner.', () => {
    const statuses: Status[] = [];
    const values: number[] = [];
    const errors: (Error | null)[] = [];

    const runner = new Runner(0);
    runner.stateBroadcast.subscribe(state => {
      statuses.push(state.status);
      errors.push(state.error);
      values.push(state.value);
    });

    runner.dispatch(() => new Promise(() => {}));
    runner.setError(new Error('Error'));

    expect(statuses[0]).toBe('pending');
    expect(statuses[1]).toBe('error');
    expect(statuses[2]).toBe('error');

    expect(errors[0]).toBe(null);
    expect(errors[1]?.message).toBe('Cancelled by setError.');
    expect(errors[2]?.message).toBe('Error');

    expect(values[0]).toBe(0);
    expect(values[1]).toBe(0);
    expect(values[2]).toBe(0);
  });

  test('Feedback', async () => {
    const feedback: string[] = [];
    const runner = new Runner('Initial Value', {
      initial: 'Initialized',
      pending: 'Pending',
      success: 'Success',
      error: 'Error',
    });

    feedback.push(runner.stateBroadcast.get().feedback);
    runner.stateBroadcast.subscribe(state => {
      feedback.push(state.feedback);
    });

    runner.setFeedback('We Are About To Begin');

    const value = await runner.execute(() => {
      runner.setFeedback('Starting Async Action');

      return Promise.resolve('Value').then(value => {
        runner.setFeedback('Finished Retrieving');
        return value;
      });
    });

    runner.setFeedback('Completed Execution');

    runner.reset();

    expect(value).toBe('Value');
    expect(feedback.length).toBe(8);
    expect(feedback[0]).toBe('Initialized');
    expect(feedback[1]).toBe('We Are About To Begin');
    expect(feedback[2]).toBe('Pending');
    expect(feedback[3]).toBe('Starting Async Action');
    expect(feedback[4]).toBe('Finished Retrieving');
    expect(feedback[5]).toBe('Success');
    expect(feedback[6]).toBe('Completed Execution');
    expect(feedback[7]).toBe('Initialized');
  });

  test('Progress', async () => {
    const progress: number[] = [];
    const runner = new Runner('Initial Value');

    runner.stateBroadcast.subscribe(value => {
      progress.push(value.progress);
    });

    const value = await runner.execute(() => {
      runner.setProgress(0.1);

      return Promise.resolve('Value').then(value => {
        runner.setProgress(0.8);
        return value;
      });
    });

    runner.reset();

    expect(value).toBe('Value');
    expect(progress.length).toBe(5);
    expect(progress[0]).toBe(0);
    expect(progress[1]).toBe(0.1);
    expect(progress[2]).toBe(0.8);
    expect(progress[3]).toBe(1);
    expect(progress[4]).toBe(0);
  });

  test('Try to change progress before and after starting.', async () => {
    const progress: number[] = [];
    const runner = new Runner('Initial Value');

    runner.stateBroadcast.subscribe(value => {
      progress.push(value.progress);
    });

    runner.setProgress(1);

    const value = await runner.execute(() => {
      runner.setProgress(0.1);

      return Promise.resolve('Value').then(value => {
        runner.setProgress(0.8);
        return value;
      });
    });

    runner.setProgress(0);

    runner.reset();

    expect(value).toBe('Value');
    expect(progress.length).toBe(5);
    expect(progress[0]).toBe(0);
    expect(progress[1]).toBe(0.1);
    expect(progress[2]).toBe(0.8);
    expect(progress[3]).toBe(1);
    expect(progress[4]).toBe(0);
  });

  test('Resolve Promise After New Dispatch', async () => {
    const firstFulfillment = new WeakPromise<string>();
    const secondFulfillment = new WeakPromise<string>();

    const task = new Runner<string>('Initial Value');

    const first = task.dispatch(() => {
      return firstFulfillment;
    });

    const second = task.dispatch(() => {
      return secondFulfillment;
    });

    secondFulfillment.resolve('Second');
    firstFulfillment.resolve('First');

    await first;
    await second;

    expect(task.get()).toBe('Second');
  });

  test('Reject Promise After Retry', async () => {
    const firstFulfillment = new WeakPromise<string>();
    const secondFulfillment = new WeakPromise<string>();

    const task = new Runner<string>('Initial Value');

    const first = task.dispatch(() => {
      return firstFulfillment;
    });

    const second = task.dispatch(() => {
      return secondFulfillment;
    });

    secondFulfillment.reject(new Error('Second'));
    firstFulfillment.reject(new Error('First'));

    try {
      await first;
    } catch (_e) {}

    try {
      await second;
    } catch (_e) {}

    expect(task.error?.message).toEqual('Second');
  });

  test('Get State', async () => {
    const task = new Runner<string>('Initial Value');

    expect(task.feedback).toBe('Initialized');
    expect(task.progress).toBe(0);
    expect(task.status).toBe('initial');
    expect(task.broadcast.get()).toBe('Initial Value');
  });

  test('Retry No Pending', async () => {
    const task = new Runner<string>('Initial Value');
    await task.retry();

    expect(task.broadcast.get()).toBe('Initial Value');
  });

  test('WaitFor Response Blast', async () => {
    const task = new Runner<string>('Initial Value');
    const values: string[] = [];
    let count = 0;

    async function action() {
      await task.waitForResponse();
      return task.execute(
        () =>
          new Promise<string>(resolve => {
            let time = 1;
            if (count === 1) {
              time = 2;
            } else if (count === 2) {
              time = 1;
            }
            global.setTimeout(() => {
              values.push(String(count));
              resolve(String(count));
              count++;
            }, time);
          })
      );
    }

    const promise1 = action();
    const promise2 = action();
    const promise3 = action();

    const value1 = await promise1;
    expect(value1).toBe('0');
    const value2 = await promise2;
    expect(value2).toBe('1');
    const value3 = await promise3;
    expect(value3).toBe('2');

    expect(values).toEqual(['0', '1', '2']);
  });
});
