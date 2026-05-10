export interface IEventSubscription<T = unknown> {
  /**
   * The timestamp when the subscription started.
   */
  startTime: number;
  /**
   * The callback function to be invoked on value changes.
   */
  callback: (value: T) => Promise<void> | void;
  /**
   * Unsubscribes from the broadcast, preventing the callback from being called in the future.
   */
  unsubscribe(): void;
}

export type EventCallbackReturnType = (void | Promise<void>) | void;

export interface IEventBroadcast<
  T = void,
  TReturn extends EventCallbackReturnType = void,
> {
  readonly subscriptions: WeakRef<IEventSubscription<T>>[];
  subscribe(callback: (value: T) => TReturn): IEventSubscription<T>;
}

export interface IEvent<T = void, TReturn extends EventCallbackReturnType = void>
  extends IEventBroadcast<T, TReturn> {
  notify(value: T): TReturn;
}

export abstract class BaseEvent<T = void, TReturn extends EventCallbackReturnType = void>
  implements IEvent<T, TReturn>
{
  protected _internalSubscriptions: IEventSubscription<T>[] = [];
  readonly subscriptions: WeakRef<IEventSubscription<T>>[] = [];

  get broadcast(): IEventBroadcast<T, TReturn> {
    return this;
  }

  abstract notify(value: T): TReturn;
  abstract dispatch(value: T): TReturn;

  subscribe(callback: (value: T) => TReturn): IEventSubscription<T> {
    const subscription: IEventSubscription<T> = {
      startTime: Date.now(),
      callback: callback,
      unsubscribe: () => {
        this._unsubscribe(subscriptionRef);
      },
    };

    const subscriptionRef = new WeakRef(subscription);

    this.subscriptions.push(subscriptionRef);
    return subscription;
  }

  wait(): Promise<T> {
    return this.waitFor(() => true);
  }

  waitFor(predicate: (value: T) => boolean): Promise<T> {
    return new Promise(resolve => {
      // The generic type is not working as expected, so we need to cast to any
      const subscription = (this as any).subscribe((value: T) => {
        if (predicate(value)) {
          subscription.unsubscribe();
          resolve(value);
        }
      });

      this._internalSubscriptions.push(subscription);
    });
  }

  protected _unsubscribe(subscriptionRef: WeakRef<IEventSubscription<T>>): void {
    const index = this.subscriptions.indexOf(subscriptionRef);
    if (index > -1) {
      this.subscriptions.splice(index, 1);
    }

    const subscription = subscriptionRef.deref();

    if (subscription == null) {
      return;
    }

    const internalIndex = this._internalSubscriptions.indexOf(subscription);
    if (internalIndex > -1) {
      this._internalSubscriptions.splice(internalIndex, 1);
    }
  }

  sweepSubscriptions() {
    const invalidSubscriptions = this.subscriptions.filter(s => s.deref() == null);
    invalidSubscriptions.forEach(s => this._unsubscribe(s));
  }

  dispose() {
    this.disposeCallbacks();
  }

  protected disposeCallbacks() {
    this.subscriptions.length = 0;
    this._internalSubscriptions.length = 0;
  }
}
