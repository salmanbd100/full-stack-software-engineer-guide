---
title: Design Patterns in TypeScript
part: 1
chapter: 0
slug: design-patterns-in-typescript
level: intermediate # beginner | intermediate | advanced
reading_time: 15
updated: 2026-08-29
tags: [patterns, typescript, strategy, observer, factory, adapter, decorator]
in_book: true
---

# Design Patterns in TypeScript {#ch-design-patterns-in-typescript}

> Name the problem before the pattern, and know which classic patterns collapse into a function here.

**In this chapter:** strategy · observer · factory · adapter · decorator · builder · the patterns TypeScript already gives you

## 💡 The Core Idea

A pattern is a name for a recurring problem and one known-good response to it. The name is the least
valuable part — what earns marks is stating the problem first: *"this switch gains a branch every time
we add a payment provider, and each branch touches the same function."*

The second half of the answer, and the one most candidates miss, is that **TypeScript is not Java**.
Several Gang of Four patterns exist to work around a limitation this language does not have. A singleton
is a module. A strategy is usually a function. An observer is often an `EventTarget`. Building a class
hierarchy where the language already has the mechanism is a mid-level tell.

## Which Problem, Which Pattern

| The problem you actually have | Pattern | TypeScript-native form |
| --- | --- | --- |
| Several interchangeable algorithms | **Strategy** | `Record<Kind, Fn>` |
| Many things must react to one event | **Observer** | `EventTarget`, an emitter, a signal |
| Which class to build depends on input | **Factory** | A function returning a union |
| An external API has the wrong shape | **Adapter** | A wrapper module |
| Add behaviour without editing the original | **Decorator** | A higher-order function |
| A constructor has grown eight parameters | **Builder** | An options object, usually |
| One instance, shared | **Singleton** | A module-level `const` |

The right-hand column is not a dismissal — it is the answer to "how would you implement it here", and
having it ready separates knowing the catalogue from having used it.

## Strategy

Wrap each algorithm so the caller can swap them without knowing which is which.

A `shippingCost` function branching on a `method` string is the starting point: every new option edits
it, and every edit risks the branches already there.

```typescript
// ✅ One algorithm per entry. Adding a method adds a key, not an edit.
type ShippingRate = (order: Order) => number;

const rates = {
  standard: (o: Order) => o.weightKg * 2,
  express: (o: Order) => o.weightKg * 5 + 10,
  freight: (o: Order) => Math.max(50, o.weightKg * 1.2),
} satisfies Record<string, ShippingRate>;

type Method = keyof typeof rates;

function shippingCost(order: Order, method: Method): number {
  return rates[method](order); // no default branch — the type covers it
}
```

`satisfies` is doing real work: it checks every entry against `ShippingRate` while keeping the literal
key names, so `Method` is a union of the actual methods rather than `string`, and an unknown method is a
compile error instead of a thrown one.

> ⚠️ **Two branches that never change do not need this.** The `if` is clearer than a map, and the
> pattern earns its keep only when the set grows or the choice comes from configuration.

## Observer

Let many things react to an event without the source knowing who they are.

```typescript
class TypedEmitter<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<(p: never) => void>>();

  on<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(fn as (p: never) => void);
    this.listeners.set(event, set);
    return () => set.delete(fn as (p: never) => void); // unsubscribe, returned by design
  }
}
```

Returning the unsubscribe function from `on` is the detail worth copying. Observers that cannot be
removed are the most common memory leak in long-lived front ends, and handing back the disposal at
subscription time makes forgetting it visible in review.

> ⚠️ **Emitting synchronously means one slow listener blocks the publisher.** Decide deliberately
> whether listeners run in sequence, in parallel, or on a queue, and say which in the type's name.

## Factory

Move the decision about which implementation to build into one place.

A `createExporter(format)` function switching over `'csv' | 'xlsx' | 'pdf'` and returning an `Exporter`
is the whole pattern: callers ask for a format and never see a class name.


Construction knowledge lives once: nobody calling `createExporter` knows that PDFs need fonts, and when
that changes, one function changes. The missing `default` is deliberate — add a format to the union and
TypeScript flags the function as non-exhaustive, at compile time.

## Adapter

Make an interface you do not control fit the one your code expects.

```typescript
// The shape your application wants.
interface PaymentGateway {
  charge(amountPence: number, token: string): Promise<{ id: string }>;
}

// The vendor ships different names and different units.
export const vendorGateway: PaymentGateway = {
  async charge(amountPence, token) {
    const res = await vendor.createTransaction({ amount_in_cents: amountPence, source: token });
    return { id: res.txn_id };
  },
};
```

One file now holds every assumption about that vendor. Replacing them means a second adapter and one
wiring line — and the unit tests never touched the vendor, because they were written against
`PaymentGateway`.

## Decorator

Add behaviour around something without editing it. In TypeScript this is usually a function, not a
class.

```typescript
type Handler = (req: Request) => Promise<Response>;

const withTiming =
  (name: string) =>
  (next: Handler): Handler =>
  async (req) => {
    const started = performance.now();
    try {
      return await next(req);
    } finally {
      metrics.observe(name, performance.now() - started);
    }
  };

// withRetry has the same shape: a Handler in, a Handler out.
const handler = withTiming('report')(withRetry(3)(fetchReport));
```

Order matters and reads inside out: retry wraps the fetch and timing wraps the retry, so the metric
covers all three attempts. Swap them for per-attempt timings — being able to say why is the follow-up.

## Builder

Worth knowing, and worth using less often than it is taught. A builder earns its place when construction
is genuinely stepwise and the intermediate object is invalid — a query being assembled, a multipart
request. For "this constructor has too many parameters", a destructured options object with defaults is
simpler, named, optional and checked, with no builder class to maintain.

## Common Mistakes

❌ **Naming the pattern before the problem.** "I'd use a strategy" answers a question nobody asked.
✅ Describe the change that keeps happening, then propose the structure that absorbs it.

❌ **A singleton class with a static `getInstance`.** ES modules are already singletons — the module
body runs once and the export is shared.
✅ Export a `const`. Reach for a class only when the instance genuinely needs to be replaced in tests.

## 🔑 Key Takeaways

- State the recurring change first; the pattern is the second half of the answer, never the first.
- Strategy in TypeScript is usually a typed record of functions, and `satisfies` keeps the keys as a checked union.
- Return the unsubscribe function from an observer's `on`, because forgotten listeners are the standard leak.
- Several classic patterns — singleton, decorator, facade — are a module, a function and an export in this language.

## Interview Questions

**Q: This `switch` on payment provider keeps growing. What do you do?**

First say what the growth costs: every provider edits the same function, so each change risks the
others and the file becomes a merge conflict magnet. Then propose a strategy — a record keyed by
provider, one entry per implementation — so adding a provider adds an entry. In TypeScript I would use
`satisfies` so the key union is derived from the record and the caller cannot pass an unknown
provider.

**Q: What is the difference between a decorator, a proxy and an adapter? They all wrap something.**

Intent, and it is the intent that is being tested. A decorator adds behaviour while keeping the same
interface. A proxy keeps the same interface and controls *access* — lazily, remotely, or with a cache.
An adapter deliberately *changes* the interface so an incompatible thing fits. Same shape, three
different reasons.

**Q: When is a pattern the wrong answer?**

When there is one implementation and no evidence of a second. Every pattern buys flexibility with
indirection, and indirection is paid for on every read. The honest version of the answer is that I
would write the direct code, and introduce the structure when the second case arrives — which is also
when I finally know what the abstraction should look like.

## What to Read Next

- [Chapter ?? — SOLID Principles](#ch-solid-principles) — open/closed and dependency inversion, which most of these patterns implement
- [Chapter ?? — Architectural Patterns](#ch-architectural-patterns) — the same ideas at the scale of a service
- [Chapter ?? — Composition over Inheritance](#ch-composition-over-inheritance) — why the function forms above beat the class forms here
