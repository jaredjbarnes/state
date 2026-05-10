import { BaseEvent, type IEventSubscription } from './base_event.js';

export class Event<T = void> extends BaseEvent<T> {
  protected _eventQueue: T[] = [];

  notify(value: T) {
    if (this._eventQueue.length > 0) {
      this._eventQueue.push(value);
    } else {
      this._eventQueue.push(value);
      this._processNextEvent();
    }
  }

  protected _notify(value: T) {
    let potentialError: any | null = null;
    const invalidSubscriptions: WeakRef<IEventSubscription<T>>[] = [];
    const subscriptions = this.subscriptions.slice(0);

    for (const subscriptionRef of subscriptions) {
      const subscription = subscriptionRef.deref();
      if (subscription != null) {
        try {
          subscription.callback(value);
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

    this._eventQueue.shift();
    this._processNextEvent();

    if (potentialError != null) {
      throw potentialError;
    }
  }

  private _processNextEvent() {
    if (this._eventQueue.length > 0) {
      const value = this._eventQueue[0];
      this._notify(value);
    }
  }

  dispatch(value: T) {
    try {
      this.notify(value);
    } catch {}
  }
}
