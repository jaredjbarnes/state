import { IBroadcast, ISubscription } from './ibroadcast.js';
import { Signal } from './signal.js';

export class DerivedSignal<TValue> extends Signal<TValue> {
  private _subscriptions: ISubscription<any>[];
  private _sources: IBroadcast<any>[];
  private _mapFn: (...args: any[]) => TValue;
  private _recalcScheduled = false;

  constructor(sources: IBroadcast<any>[], mapFn: (...args: any[]) => TValue) {
    super(mapFn(...sources.map(source => source.get())));

    this._sources = sources;
    this._mapFn = mapFn;

    this._subscriptions = sources.map(source =>
      source.subscribe(() => this._scheduleRecalc())
    );
  }

  /**
   * Schedules a recalculation on the microtask queue. If multiple sources
   * change in the same synchronous tick, only one recalculation runs.
   * This prevents redundant derivations in diamond dependency graphs.
   */
  private _scheduleRecalc() {
    if (!this._recalcScheduled) {
      this._recalcScheduled = true;
      queueMicrotask(() => {
        this._recalcScheduled = false;
        this.set(this._mapFn(...this._sources.map(source => source.get())));
      });
    }
  }

  dispose() {
    super.dispose();
    this._subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}

// Factory functions for type-safe creation
export function derive<A, TValue>(
  source: IBroadcast<A>,
  mapFn: (a: A) => TValue
): DerivedSignal<TValue>;

export function derive<A, B, TValue>(
  sourceA: IBroadcast<A>,
  sourceB: IBroadcast<B>,
  mapFn: (a: A, b: B) => TValue
): DerivedSignal<TValue>;

export function derive<A, B, C, TValue>(
  sourceA: IBroadcast<A>,
  sourceB: IBroadcast<B>,
  sourceC: IBroadcast<C>,
  mapFn: (a: A, b: B, c: C) => TValue
): DerivedSignal<TValue>;

export function derive<A, B, C, D, TValue>(
  sourceA: IBroadcast<A>,
  sourceB: IBroadcast<B>,
  sourceC: IBroadcast<C>,
  sourceD: IBroadcast<D>,
  mapFn: (a: A, b: B, c: C, d: D) => TValue
): DerivedSignal<TValue>;

export function derive<A, B, C, D, E, TValue>(
  sourceA: IBroadcast<A>,
  sourceB: IBroadcast<B>,
  sourceC: IBroadcast<C>,
  sourceD: IBroadcast<D>,
  sourceE: IBroadcast<E>,
  mapFn: (a: A, b: B, c: C, d: D, e: E) => TValue
): DerivedSignal<TValue>;

export function derive(...args: any[]): DerivedSignal<any> {
  const sources = args.slice(0, -1) as IBroadcast<any>[];
  const mapFn = args[args.length - 1];
  return new DerivedSignal(sources, mapFn);
}
