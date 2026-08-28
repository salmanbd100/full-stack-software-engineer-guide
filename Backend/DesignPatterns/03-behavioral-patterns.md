---
title: Behavioural Patterns
part: 1
chapter: 0
slug: behavioral-patterns
level: advanced # beginner | intermediate | advanced
reading_time: 19
updated: 2026-08-28
tags: [backend, design, patterns, behavioral]
in_book: true
---

# Behavioural Patterns {#ch-behavioural-patterns}

> Move branching logic out of a growing conditional and into something you can extend.

**In this chapter:** strategy · observer · command · state · chain of responsibility

## Overview

Behavioral patterns are about **who decides what, and how objects talk to each other**. Creational patterns handle construction, structural patterns handle composition — these handle the flow of control.

They're the patterns you actually reach for most often in backend code, because the recurring problems are behavioural: a growing `switch`, an object that means five different things depending on a status column, a workflow that needs undo.

> **The one heuristic:** most behavioural patterns replace a conditional with polymorphism. If you're staring at a `switch` that grows every quarter, one of these is probably the fix — and if it never grows, none of them are.

## Table of Contents

- [Quick Decision Table](#quick-decision-table)
- [Strategy](#strategy)
- [Observer](#observer)
- [Command](#command)
- [State](#state)
- [Chain of Responsibility](#chain-of-responsibility)
- [Template Method](#template-method)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## Quick Decision Table

| Problem | Pattern |
| ------- | ------- |
| Several interchangeable algorithms | **Strategy** |
| Many things must react to one event | **Observer** |
| An action needs to be queued, retried, or undone | **Command** |
| Behaviour changes with an object's status | **State** |
| A request passes through optional handlers | **Chain of Responsibility** |
| Same steps every time, different details | **Template Method** |

## Strategy

### 💡 **Intent**

Wrap each algorithm in its own object so the caller can swap them at runtime.

**The smell it fixes:**

```typescript
// ❌ Every new shipping option edits this function. Every edit risks the others.
function shippingCost(order: Order, method: string): number {
  if (method === "standard") return order.weightKg * 2;
  if (method === "express") return order.weightKg * 5 + 10;
  if (method === "freight") return Math.max(50, order.weightKg * 1.2);
  throw new Error("Unknown method");
}
```

```typescript
// ✅ Strategy: one algorithm per unit, added without touching the others.
interface ShippingStrategy {
  readonly code: string;
  cost(order: Order): number;
}

const standard: ShippingStrategy = {
  code: "standard",
  cost: (order) => order.weightKg * 2,
};

const express: ShippingStrategy = {
  code: "express",
  cost: (order) => order.weightKg * 5 + 10,
};

class ShippingCalculator {
  constructor(private strategy: ShippingStrategy) {}

  use(strategy: ShippingStrategy): void {
    this.strategy = strategy; // swappable at runtime — the point of the pattern
  }

  quote(order: Order): number {
    return this.strategy.cost(order);
  }
}
```

**In TypeScript a strategy is usually just a function**, and that's fine — the pattern is the substitutability, not the class:

```typescript
type ShippingRate = (order: Order) => number;

const rates: Record<string, ShippingRate> = {
  standard: (o) => o.weightKg * 2,
  express: (o) => o.weightKg * 5 + 10,
};

const quote = rates[method]?.(order) ?? rates.standard(order);
```

**When it's worth it:** the set of algorithms grows, they're independently testable, or the choice comes from configuration. **When it isn't:** two branches that never change — the `if` is clearer than three files.

> ✨ **Strategy is the cleanest illustration of Open/Closed.** Adding a shipping method means adding a file, not editing a working one. That connection is worth making explicitly in an interview. See [SOLID](./05-solid-principles.md#openclosed-ocp).

## Observer

### 💡 **Intent**

Let many objects react to something happening, without the source knowing who they are.

```typescript
type Listener<T> = (payload: T) => void | Promise<void>;

class EventBus<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as Listener<never>);
    this.listeners.set(event, set);
    // ✅ Return an unsubscribe function — forgetting to remove listeners is the classic leak.
    return () => set.delete(listener as Listener<never>);
  }

  async emit<K extends keyof Events>(event: K, payload: Events[K]): Promise<void> {
    const set = this.listeners.get(event);
    if (!set) return;

    // 🔴 One throwing listener must not stop the others, or cancel the emit.
    const results = await Promise.allSettled([...set].map((fn) => (fn as Listener<Events[K]>)(payload)));
    for (const r of results) if (r.status === "rejected") logger.error({ err: r.reason, event });
  }
}

// Typed event map — the compiler checks payloads at both ends.
interface AppEvents {
  "order.placed": { orderId: string; userId: string };
  "user.deleted": { userId: string };
}

const bus = new EventBus<AppEvents>();

const off = bus.on("order.placed", async ({ orderId }) => sendReceipt(orderId));
await bus.emit("order.placed", { orderId: "o_1", userId: "u_1" });
off(); // unsubscribe
```

**Node has this built in** — `EventEmitter` is Observer, and so is every `stream.on("data")` call. Reach for the standard class before writing your own.

| Pros | Cons |
| ---- | ---- |
| ✅ Publisher doesn't know subscribers | ❌ Flow becomes hard to trace — who handled this? |
| ✅ New reactions need no change to the publisher | ❌ Listener leaks if you never unsubscribe |
| ✅ Natural fit for cross-cutting side effects | ❌ Errors and ordering are easy to get wrong |

🔴 **In-process events are not a message queue.** They vanish on crash, don't retry, and don't cross processes. If the reaction *must* happen — charging a card, sending an invoice — persist it and process it from a real queue. Getting this distinction wrong is how "the email sometimes doesn't send" bugs are born.

## Command

### 💡 **Intent**

Turn an action into an object, so it can be stored, passed around, queued, retried, or undone.

**The payoff is not encapsulation for its own sake** — it's that an action you can hold as data is an action you can put in a queue or an undo stack.

```typescript
interface Command {
  readonly name: string;
  execute(): Promise<void>;
  undo(): Promise<void>;
}

class RenameDocumentCommand implements Command {
  readonly name = "document.rename";
  private previousTitle?: string; // state needed to reverse the change

  constructor(
    private readonly docs: DocumentRepository,
    private readonly id: string,
    private readonly newTitle: string,
  ) {}

  async execute(): Promise<void> {
    const doc = await this.docs.findById(this.id);
    if (!doc) throw new Error("Not found");
    this.previousTitle = doc.title; // capture before mutating
    await this.docs.update(this.id, { title: this.newTitle });
  }

  async undo(): Promise<void> {
    if (this.previousTitle === undefined) return; // never executed
    await this.docs.update(this.id, { title: this.previousTitle });
  }
}

/** The invoker owns history; it knows nothing about what any command does. */
class CommandBus {
  private readonly history: Command[] = [];

  async run(command: Command): Promise<void> {
    await command.execute();
    this.history.push(command);
  }

  async undoLast(): Promise<void> {
    await this.history.pop()?.undo();
  }
}
```

**Where this earns its keep:**

- **Undo/redo** — the history stack is the pattern's original motivation.
- **Job queues** — a serialized command *is* a queue message.
- **CQRS** — commands (write intent) modelled separately from queries.
- **Audit logs** — a command log is a record of intent, not just of resulting state.

> ⚠️ **Undo is harder than it looks.** Reversing a database write is fine; reversing a charged card or a sent email is not. For irreversible effects the honest answer is a *compensating* command — issue a refund, send a correction — not an undo.

## State

### 💡 **Intent**

Give an object different behaviour depending on its current state, by making each state its own object.

**The smell:** the same `switch (status)` appearing in five methods.

```typescript
// ❌ Every method re-derives what's legal in each status.
class Order {
  status: "draft" | "paid" | "shipped" | "cancelled" = "draft";

  cancel(): void {
    if (this.status === "draft") { this.status = "cancelled"; return; }
    if (this.status === "paid") { this.refund(); this.status = "cancelled"; return; }
    if (this.status === "shipped") throw new Error("Too late to cancel");
    throw new Error("Already cancelled");
  }
  // …and pay(), ship(), refund() each repeat the same shape
}
```

```typescript
// ✅ State: each state knows only its own legal transitions.
interface OrderState {
  readonly name: string;
  pay(order: Order): OrderState;
  ship(order: Order): OrderState;
  cancel(order: Order): OrderState;
}

const illegal = (action: string, state: string): never => {
  throw new Error(`Cannot ${action} an order that is ${state}`);
};

const draft: OrderState = {
  name: "draft",
  pay: () => paid,
  ship: () => illegal("ship", "draft"),
  cancel: () => cancelled,
};

const paid: OrderState = {
  name: "paid",
  pay: () => illegal("pay", "paid"),
  ship: () => shipped,
  cancel: (order) => {
    order.refund(); // ✅ transition side effect lives with the state that owns it
    return cancelled;
  },
};

// Terminal states: every transition is illegal, except an idempotent re-cancel.
const shipped: OrderState = {
  name: "shipped",
  pay: () => illegal("pay", "shipped"),
  ship: () => illegal("ship", "shipped"),
  cancel: () => illegal("cancel", "shipped"),
};

const cancelled: OrderState = {
  name: "cancelled",
  pay: () => illegal("pay", "cancelled"),
  ship: () => illegal("ship", "cancelled"),
  cancel: () => cancelled,
};

class Order {
  private state: OrderState = draft;

  pay(): void {
    this.state = this.state.pay(this);
  }

  get status(): string {
    return this.state.name;
  }

  refund(): void { /* … */ }
}
```

**The win is that illegal transitions become impossible rather than merely guarded.** Adding a `refunded` state means writing one object; the compiler then tells you every place that must handle it.

**State vs Strategy** — identical structure, different reason:

| | **Strategy** | **State** |
| --- | --- | --- |
| Who chooses | The caller, from outside | The object itself, by transitioning |
| Do the options know each other? | No, independent | Yes — each returns the next state |
| Changes over an object's life | Usually once | Constantly |

## Chain of Responsibility

### 💡 **Intent**

Pass a request along a line of handlers until one deals with it — or let each contribute and hand it on.

**You use this every day:** Express middleware is exactly this pattern.

```typescript
type Context = { request: Request; response: Response };
type Next = () => Promise<void>;
type Middleware = (ctx: Context, next: Next) => Promise<void>;

/** Composes handlers into a single chain, Koa-style. */
function chain(middlewares: Middleware[]): (ctx: Context) => Promise<void> {
  return function run(ctx: Context, index = 0): Promise<void> {
    const current = middlewares[index];
    if (!current) return Promise.resolve();
    // Each handler decides whether the rest of the chain runs at all.
    return current(ctx, () => run(ctx, index + 1));
  };
}

const authenticate: Middleware = async (ctx, next) => {
  const user = await verify(ctx.request.headers.authorization);
  if (!user) {
    ctx.response.status = 401; // ✅ short-circuit — next() is never called
    return;
  }
  ctx.request.user = user;
  await next();
};

const timing: Middleware = async (ctx, next) => {
  const start = performance.now();
  await next();                       // everything downstream runs inside here
  metrics.observe("request", performance.now() - start);
};

const handle = chain([timing, authenticate, routeHandler]);
```

> ✨ **The key detail is who controls `next()`.** Because each handler wraps the rest of the chain, it can run code before *and* after — which is how timing, transactions, and error boundaries work as middleware. That's the difference between a chain and a plain list of callbacks.

**Other real uses:** validation pipelines, approval workflows where the required approver depends on amount, and log processors that each enrich a record.

⚠️ **The cost is that order is invisible and load-bearing.** Auth after the route handler is a security hole with no compile error. Keep registration in one file and comment why the order is what it is.

## Template Method

### 💡 **Intent**

Put the fixed sequence of steps in a base class, and let subclasses fill in the parts that differ.

```typescript
/** The algorithm is written once; only the hooks vary. */
abstract class ImportJob<Row> {
  /** The template — subclasses can't reorder these steps. */
  async run(file: string): Promise<{ imported: number; failed: number }> {
    const rows = await this.parse(file);
    let imported = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        if (!this.validate(row)) { failed++; continue; }
        await this.persist(row);
        imported++;
      } catch (err) {
        failed++;
        this.onError(row, err); // hook with a default — override only if you care
      }
    }

    await this.afterImport(imported, failed);
    return { imported, failed };
  }

  protected abstract parse(file: string): Promise<Row[]>;
  protected abstract validate(row: Row): boolean;
  protected abstract persist(row: Row): Promise<void>;

  // Hooks: optional, with sensible defaults.
  protected onError(_row: Row, err: unknown): void {
    logger.warn({ err }, "row failed");
  }
  protected async afterImport(_imported: number, _failed: number): Promise<void> {}
}

class CsvCustomerImport extends ImportJob<CustomerRow> {
  protected async parse(file: string): Promise<CustomerRow[]> { /* … */ }
  protected validate(row: CustomerRow): boolean {
    return Boolean(row.email);
  }
  protected async persist(row: CustomerRow): Promise<void> { /* … */ }
}
```

**Template Method vs Strategy:** Template Method uses inheritance and fixes the *order* of steps at compile time. Strategy uses composition and swaps a whole algorithm at runtime. Template Method is the right call when the sequence genuinely must not change — the "don't forget to call `super`" class of bug disappears.

⚠️ **Inheritance is the cost.** A subclass can only extend one template, and a change to a protected method breaks every subclass. If you find yourself wanting two templates, that's the signal to switch to composition.

## Interview Questions

**Q1: Strategy vs State?**

Same structure — an object delegating to a swappable collaborator — but the control differs. With Strategy the *caller* picks the algorithm and the options don't know about each other. With State the *object* transitions itself, and each state knows which states can follow it. If your states return the next state, you have State; if a caller injects the behaviour, you have Strategy.

**Q2: When would you not use Strategy?**

When the set of options is stable and small. Two branches that haven't changed in two years are clearer as an `if` than as an interface plus two files plus a registry. The pattern earns its keep when new algorithms arrive regularly or the choice is configuration-driven.

**Q3: Observer's downsides?**

Traceability and lifetime. You emit an event and can't tell from the call site what runs, in what order, or whether anything failed — so you need `Promise.allSettled` and per-listener error logging, or one throwing listener breaks the rest. And every subscription is a potential leak, which is why `on()` should return an unsubscribe function.

**Q4: In-process events or a message queue?**

Events are fine for optional side effects inside one process — cache invalidation, metrics, a nice-to-have notification. Anything that must survive a crash needs a queue: persistence, retries, dead-lettering, and delivery across processes. The test I use is "if the process dies right here, is losing this acceptable?" If not, it isn't an event.

**Q5: Why bother with Command?**

Because an action represented as data can be stored, moved, and replayed. That's what makes undo/redo, job queues, audit logs of *intent* rather than outcome, and CQRS possible. A plain method call is gone the moment it returns. The caveat is that undo only works for reversible effects — for a charged card you need a compensating command, not an undo.

**Q6: Where does Chain of Responsibility show up in Node?**

Express and Koa middleware. Each handler receives the context and a `next` function, and because it *awaits* `next()` it can run logic on the way in and on the way out — that's how timing, transactions, and error handling work. It also means any handler can short-circuit by simply not calling `next`, which is how auth rejects a request.

**Q7: Template Method or Strategy?**

Template Method when the sequence of steps is fixed and only the details vary — an import pipeline that must always parse, validate, persist, then report. Strategy when the whole algorithm is interchangeable at runtime. Template Method buys you the guarantee that nobody reorders the steps; it costs you the flexibility of inheritance, since a subclass gets exactly one parent.

## Summary

**Checklist:**

- [ ] Growing `switch` statements replaced with Strategy or State, not extended
- [ ] Strategies are functions unless they need state
- [ ] `on()` returns an unsubscribe function
- [ ] Event emission uses `allSettled` and logs per-listener failures
- [ ] Must-happen side effects go through a queue, not an in-process event
- [ ] State objects return the next state; illegal transitions throw in one place
- [ ] Commands capture the data needed to undo, before mutating
- [ ] Irreversible actions get compensating commands, not `undo()`
- [ ] Middleware order registered in one file, with the reasoning written down
- [ ] Template Method used only where step order genuinely must be fixed

**Best practices:**

1. **Replace conditionals with polymorphism** — but only conditionals that keep growing.
2. **Prefer composition to inheritance** — Strategy over Template Method by default.
3. **Events for optional, queues for required.**
4. **Make illegal states unrepresentable** — that's the real win of State.

---

[← Structural Patterns](./02-structural-patterns.md) | [Design Patterns Index](./README.md) | [Architectural Patterns →](./04-architectural-patterns.md)
