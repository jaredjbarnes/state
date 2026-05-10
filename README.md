# @jjb/state

Reactive state primitives for TypeScript — `Signal`s, `Runner`s, and broadcast subscriptions, with optional React bindings.

## Install

```bash
npm install @jjb/state
```

React is an optional peer dependency — only required if you import from `@jjb/state/react`.

## Quick start

```ts
import { Signal } from "@jjb/state";

const counter = new Signal(0);

const subscription = counter.subscribe((value) => {
  console.log("counter is now", value);
});

counter.set(1); // logs: counter is now 1
counter.set(2); // logs: counter is now 2

subscription.unsubscribe();
```

## Entry points

The package ships three entry points so you can pull in only what you need:

| Import path | Use when |
|---|---|
| `@jjb/state` | You want everything (signals, runners, React hooks). |
| `@jjb/state/core` | You want the framework-agnostic primitives — no React. |
| `@jjb/state/react` | You want the React-specific hooks and bindings. |

```ts
// Framework-agnostic (Node, workers, vanilla TS)
import { Signal, Runner } from "@jjb/state/core";

// React app
import { useSignalValue, useRunnerStatus } from "@jjb/state/react";
```

## What's in the box

- **`Signal<T>`** — reactive value with weakly-held subscriptions, `set` / `transform` / `wait` / `waitFor`.
- **`DerivedSignal`** — values computed from one or more upstream signals.
- **`Runner`** — async-task lifecycle abstraction with status broadcasting.
- **`Broadcast` / `Subscription`** — the underlying interfaces that signals and runners implement.
- **Events** — `Event`, `AsyncEvent`, `BaseEvent` for fire-and-forget messaging.
- **Helpers** — `pollAsync`, `WeakPromise`, `delay`.
- **React hooks** — `useSignalValue`, `useSignalValueEffect`, `useRunnerStatus`, `useRunnerStatusEffect`, `useRunnerError`, `useUpdate`.

## Subscription lifecycle

Subscriptions are tracked via `WeakRef` — if you don't keep a reference to the returned subscription, the garbage collector will eventually drop it and your callback will stop firing. **Always store the subscription** (in a variable, instance field, or hook ref) for as long as you want to receive updates.

```ts
// Wrong — subscription gets GC'd, callback stops working
counter.subscribe((v) => console.log(v));

// Right — held by `sub`, lives until you unsubscribe
const sub = counter.subscribe((v) => console.log(v));
sub.unsubscribe();
```

## Scripts

```bash
npm run build         # vite + dts → dist/
npm run check:types   # tsc --noEmit
npm test              # vitest watch
npm run test:run      # vitest run (CI)
```

## License

MIT — see [LICENSE](./LICENSE).
