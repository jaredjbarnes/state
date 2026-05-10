import { IBroadcast, ISubscription } from './ibroadcast.js';
import { ISignal } from './isignal.js';

/**
 * Type definition for an unsubscribe function that can be called to remove a subscription.
 */
export type Unsubscribe = () => void;

/**
 * A reactive state management class that implements the `ISignal<T>` interface.
 * Manages state, broadcasts changes to subscribers, and handles subscription lifecycle.
 *
 * @template T - The type of value stored in the signal
 *
 * @example
 * ```typescript
 * const signal = new Signal<string>("initial");
 * const subscription = signal.subscribe(value => console.log(value));
 * signal.set("updated"); // Logs: "updated"
 * subscription.unsubscribe();
 * ```
 */
export class Signal<T> implements ISignal<T> {
  private _valueQueue: T[] = [];

  /**
   * Array of internal subscriptions used by the signal.
   * These subscriptions are managed separately from the public subscriptions
   * and are typically used for internal signal operations like wait().
   */
  protected _internalSubscriptions: ISubscription<T>[] = [];

  /**
   * Internal version counter that increments with each value change.
   * Used to track state changes and optimize updates.
   */
  protected _version = 0;

  /**
   * The current value stored in the signal.
   */
  protected _value: T;

  /**
   * Collection of weak references to active subscriptions.
   * Using WeakRef allows subscriptions to be garbage collected when no longer referenced.
   */
  readonly subscriptions: WeakRef<ISubscription<T>>[] = [];

  /**
   * Gets the current version number of the signal.
   * Increments each time the value changes.
   */
  get version() {
    return this._version;
  }

  /**
   * Provides access to the broadcast interface of the signal.
   * This is the public interface that subscribers use to interact with the signal.
   */
  get broadcast(): IBroadcast<T> {
    return this;
  }

  /**
   * Creates a new Signal instance with the specified initial value.
   *
   * @param initialValue - The initial value to store in the signal
   */
  constructor(initialValue: T) {
    this._value = initialValue;
  }

  /**
   * Retrieves the current value stored in the signal.
   *
   * @returns The current value of type T
   */
  get() {
    return this._value;
  }

  /**
   * Updates the signal's value and notifies all subscribers of the change.
   *
   * @param value - The new value to store in the signal
   * @throws Error if any subscriber callback throws an error
   */
  set(value: T) {
    if (this._valueQueue.length > 0) {
      this._valueQueue.push(value);
    } else {
      this._valueQueue.push(value);
      this._processNextValue();
    }
  }

  /**
   * Notifies all subscribers of a value change.
   * Handles cleanup of invalid subscriptions and error propagation.
   *
   * @param value - The new value to broadcast to subscribers
   * @throws Error if any subscriber callback throws an error
   */
  protected _notify(value: T) {
    let potentialError: any | null = null;
    const invalidSubscriptions: WeakRef<ISubscription<T>>[] = [];
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

    this._valueQueue.shift();
    this._processNextValue();

    if (potentialError != null) {
      throw potentialError;
    }
  }

  private _processNextValue() {
    if (this._valueQueue.length > 0) {
      const value = this._valueQueue[0];

      this._value = value;
      this._version++;
      this._notify(value);
    }
  }

  /**
   * Transforms the current value using a callback function and updates the signal.
   * This method is particularly useful for memory-efficient updates of arrays and objects,
   * as it allows modifying the existing value in place rather than creating new instances.
   *
   * @param cb - A function that takes the current value and returns a new value
   *
   * @example
   * ```typescript
   * // Basic value transformation
   * const signal = new Signal<number>(1);
   * signal.transform(value => value * 2); // Value becomes 2
   *
   * // Memory-efficient array update
   * const arraySignal = new Signal<string[]>(['a', 'b', 'c']);
   * arraySignal.transform(array => {
   *   array.push('d'); // Modifies array in place
   *   return array;    // Returns same array reference
   * });
   *
   * // Memory-efficient object update
   * interface Person {
   *   firstName: string;
   *   lastName: string;
   * }
   * const personSignal = new Signal<Person>({ firstName: 'John', lastName: 'Doe' });
   * personSignal.transform(person => {
   *   person.firstName = 'Jane'; // Modifies object in place
   *   return person;             // Returns same object reference
   * });
   *
   * // Complex object update with nested properties
   * interface User {
   *   id: string;
   *   profile: {
   *     name: string;
   *     preferences: {
   *       theme: string;
   *       notifications: boolean;
   *     };
   *   };
   * }
   * const userSignal = new Signal<User>({
   *   id: '123',
   *   profile: {
   *     name: 'John',
   *     preferences: {
   *       theme: 'light',
   *       notifications: true
   *     }
   *   }
   * });
   * userSignal.transform(user => {
   *   user.profile.preferences.theme = 'dark'; // Modifies nested property in place
   *   return user;                             // Returns same object reference
   * });
   * ```
   */
  transform(cb: (val: T) => T) {
    const value = cb(this._value);
    this.set(value);
  }

  /**
   * Subscribes to value changes in the signal.
   *
   * @param callback - Function to be called when the value changes
   * @returns An ISubscription object that can be used to unsubscribe
   *
   * @remarks
   * Subscription Management:
   * - The subscription must be stored in a variable or property to prevent garbage collection
   * - If the subscription reference is lost, the callback will stop receiving updates
   * - The signal uses WeakRef to allow garbage collection of subscriptions when their references are lost
   *
   * @example
   * ```typescript
   * // Correct usage - storing subscription
   * const signal = new Signal<string>("hello");
   * const subscription = signal.subscribe(value => console.log(value));
   * signal.set("world"); // Logs: "world"
   *
   * // Incorrect usage - subscription will be garbage collected
   * signal.subscribe(value => console.log(value)); // Callback will stop working
   * signal.set("world"); // Will not log anything when GC is triggered
   *
   * // Presenter with derived signals example
   * interface User {
   *   firstName: string;
   *   lastName: string;
   *   email: string;
   * }
   *
   * class UserPresenter {
   *   private _userSignal: Signal<User>;
   *   private _fullNameSignal: Signal<string>;
   *   private _subscription: ISubscription<User>;
   *
   *   constructor(initialUser: User) {
   *     // Primary signal for user data
   *     this._userSignal = new Signal<User>(initialUser);
   *
   *     // Derived signal for full name
   *     this._fullNameSignal = new Signal<string>(
   *       `${initialUser.firstName} ${initialUser.lastName}`
   *     );
   *
   *     // Subscribe to user changes to update derived full name
   *     this._subscription = this._userSignal.subscribe(user => {
   *       this._fullNameSignal.set(`${user.firstName} ${user.lastName}`);
   *     });
   *   }
   *
   *   // Public interface for components
   *   get userBroadcast() {
   *     return this._userSignal.broadcast;
   *   }
   *
   *   get fullNameBroadcast() {
   *     return this._fullNameSignal.broadcast;
   *   }
   *
   *   updateFirstName(firstName: string) {
   *     this._userSignal.transform(user => {
   *       user.firstName = firstName;
   *       return user;
   *     });
   *   }
   *
   *   updateLastName(lastName: string) {
   *     this._userSignal.transform(user => {
   *       user.lastName = lastName;
   *       return user;
   *     });
   *   }
   *
   *   dispose() {
   *     this._subscription.unsubscribe();
   *     this._userSignal.dispose();
   *     this._fullNameSignal.dispose();
   *   }
   * }
   *
   * // Usage in a React component
   * function UserProfile() {
   *   const presenter = useMemo(() => new UserPresenter({
   *     firstName: 'John',
   *     lastName: 'Doe',
   *     email: 'john@example.com'
   *   }), []);
   *
   *   const user = useSignalValue(presenter.userBroadcast);
   *   const fullName = useSignalValue(presenter.fullNameBroadcast);
   *
   *   useEffect(() => {
   *     return () => presenter.dispose();
   *   }, []);
   *
   *   return (
   *     <div>
   *       <h1>{fullName}</h1>
   *       <input
   *         value={user.firstName}
   *         onChange={e => presenter.updateFirstName(e.target.value)}
   *       />
   *       <input
   *         value={user.lastName}
   *         onChange={e => presenter.updateLastName(e.target.value)}
   *       />
   *     </div>
   *   );
   * }
   * ```
   */
  subscribe(callback: (value: T) => void): ISubscription<T> {
    const subscription: ISubscription<T> = {
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

  /**
   * Returns a Promise that resolves with the next value emitted by the signal.
   * Creates a one-time subscription that automatically unsubscribes after receiving the value.
   *
   * @returns Promise that resolves with the next emitted value
   * @example
   * ```typescript
   * const signal = new Signal(0);
   * const nextValue = await signal.wait();
   * signal.set(1); // nextValue will be 1
   * ```
   */
  wait(): Promise<T> {
    return new Promise(resolve => {
      const subscription = this.subscribe(value => {
        subscription.unsubscribe();
        resolve(value);
      });

      this._internalSubscriptions.push(subscription);
    });
  }

  /**
   * Waits for the next value to be broadcasted that satisfies the predicate.
   * If the predicate is satisfied with the current value, the promise resolves immediately.
   * @param predicate A function to be called with the value.
   * @returns A promise that resolves with the next value.
   */
  waitFor(predicate: (value: T) => boolean): Promise<T> {
    if (predicate(this._value)) {
      return Promise.resolve(this._value);
    }

    return new Promise(resolve => {
      const subscription = this.subscribe(value => {
        if (predicate(value)) {
          subscription.unsubscribe();
          resolve(value);
        }
      });

      this._internalSubscriptions.push(subscription);
    });
  }

  /**
   * Removes a subscription from the signal's subscription list.
   *
   * @param subscriptionRef - The WeakRef to the subscription to remove
   */
  protected _unsubscribe(subscriptionRef: WeakRef<ISubscription<T>>): void {
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

  /**
   * Cleans up any invalid subscriptions (where the WeakRef target has been garbage collected).
   * This helps maintain memory efficiency by removing references to no-longer-existing subscriptions.
   */
  sweepSubscriptions() {
    const invalidSubscriptions = this.subscriptions.filter(s => s.deref() == null);
    invalidSubscriptions.forEach(s => this._unsubscribe(s));
  }

  /**
   * Disposes of the signal by cleaning up all subscriptions.
   * This should be called when the signal is no longer needed to prevent memory leaks.
   */
  dispose() {
    this.disposeCallbacks();
  }

  /**
   * Internal method to clear all subscriptions.
   */
  protected disposeCallbacks() {
    this.subscriptions.length = 0;
    this._internalSubscriptions.length = 0;
  }
}
