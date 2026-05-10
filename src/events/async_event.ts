import { Runner } from '../runner.js';
import {
  BaseEvent,
  type IEventBroadcast,
  type IEventSubscription,
} from './base_event.js';

export enum NotificationStrategy {
  Sequential = 'sequential',
  Parallel = 'parallel',
}

export class AsyncEvent<T = void> extends BaseEvent<T, Promise<void> | void> {
  protected _notificationStrategy: NotificationStrategy;
  protected _eventNotificationRunner: Runner<void>;

  get notificationRunnerBroadcast(): IEventBroadcast<void> {
    return this._eventNotificationRunner.broadcast;
  }

  constructor(
    notificationStrategy: NotificationStrategy = NotificationStrategy.Sequential
  ) {
    super();
    this._notificationStrategy = notificationStrategy;
    this._eventNotificationRunner = new Runner<void>(undefined);
  }

  async notify(value: T) {
    await this._eventNotificationRunner.waitForResponse();
    return this._eventNotificationRunner.execute(() => this._notify(value));
  }

  async dispatch(value: T): Promise<void> {
    await this._eventNotificationRunner.waitForResponse();
    return this._eventNotificationRunner.dispatch(() => this._notify(value));
  }

  protected async _notify(value: T) {
    if (this._notificationStrategy === NotificationStrategy.Sequential) {
      return await this._notifySequentially(value);
    } else {
      return await this._notifyInParallel(value);
    }
  }

  protected async _notifyInParallel(value: T) {
    let potentialError: any | null = null;
    const promises: Promise<void>[] = [];
    const invalidSubscriptions: WeakRef<IEventSubscription<T>>[] = [];
    const subscriptions = this.subscriptions.slice(0);

    for (const subscriptionRef of subscriptions) {
      const subscription = subscriptionRef.deref();
      if (subscription != null) {
        const promise = this._notifyCallback(subscription.callback, value).catch(e => {
          if (potentialError == null) {
            potentialError = e;
          }
        });
        promises.push(promise);
      } else {
        invalidSubscriptions.push(subscriptionRef);
      }
    }

    await Promise.all(promises);
    invalidSubscriptions.forEach(s => this._unsubscribe(s));

    if (potentialError != null) {
      throw potentialError;
    }
  }

  protected async _notifyCallback(
    callback: (value: T) => Promise<void> | void,
    value: T
  ) {
    try {
      await callback(value);
    } catch (e) {
      throw e;
    }
  }

  protected async _notifySequentially(value: T) {
    let potentialError: any | null = null;
    const invalidSubscriptions: WeakRef<IEventSubscription<T>>[] = [];
    const subscriptions = this.subscriptions.slice(0);

    for (const subscriptionRef of subscriptions) {
      const subscription = subscriptionRef.deref();
      if (subscription != null) {
        try {
          await this._notifyCallback(subscription.callback, value);
        } catch (e) {
          if (potentialError == null) {
            potentialError = e;
          }
        }
      } else {
        invalidSubscriptions.push(subscriptionRef);
      }
    }

    invalidSubscriptions.forEach(s => this._unsubscribe(s));

    if (potentialError != null) {
      throw potentialError;
    }
  }
}
