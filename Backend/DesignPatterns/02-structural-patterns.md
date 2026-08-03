# Structural Patterns

## Overview

Structural patterns are about **composition**: how you put objects together so that a change in one place doesn't ripple everywhere else.

They all share one move — put something *between* the caller and the thing being called. What changes is why: to translate an interface (Adapter), to add behaviour (Decorator), to simplify (Facade), or to control access (Proxy).

> **The distinction interviewers press on:** Adapter, Decorator, Facade, and Proxy have nearly identical structure — an object wrapping another object. They differ only in **intent**. Being able to state the intent difference cleanly is most of the value of knowing them.

## Table of Contents

- [Quick Decision Table](#quick-decision-table)
- [Adapter](#adapter)
- [Decorator](#decorator)
- [Facade](#facade)
- [Proxy](#proxy)
- [Composite](#composite)
- [Bridge](#bridge)
- [Telling the Wrappers Apart](#telling-the-wrappers-apart)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## Quick Decision Table

| Problem | Pattern |
| ------- | ------- |
| Two interfaces don't line up | **Adapter** |
| Add behaviour without touching the class | **Decorator** |
| Five subsystems, one simple entry point | **Facade** |
| Same interface, but control *when* the real call happens | **Proxy** |
| A tree where leaves and branches behave alike | **Composite** |
| Two dimensions of variation multiplying into subclasses | **Bridge** |

## Adapter

### 💡 **Intent**

Translate one interface into another so code that expects the second can use the first.

**The classic use case:** you own the interface, a third party owns theirs, and you refuse to let their shape leak into your domain.

```typescript
// ── What our application decided it needs ─────────────────────────
interface EmailSender {
  send(message: { to: string; subject: string; html: string }): Promise<{ id: string }>;
}

// ── What a vendor SDK actually offers (different names, different units) ──
class SendGridClient {
  async post(payload: {
    personalizations: { to: { email: string }[] }[];
    subject: string;
    content: { type: string; value: string }[];
  }): Promise<{ messageId: string }> { /* … */ }
}

// ── The adapter: the only file that knows SendGrid's shape ────────
class SendGridAdapter implements EmailSender {
  constructor(private readonly client: SendGridClient) {}

  async send(message: { to: string; subject: string; html: string }) {
    const result = await this.client.post({
      personalizations: [{ to: [{ email: message.to }] }],
      subject: message.subject,
      content: [{ type: "text/html", value: message.html }],
    });
    return { id: result.messageId }; // translate the response too
  }
}
```

Swapping to Postmark means writing `PostmarkAdapter` and changing one line of wiring. Nothing in your domain moves.

> ✨ **Adapter is how you keep vendors out of your domain model.** Without it, `personalizations[0].to[0].email` ends up in a business service, and the vendor is now unremovable. Interviewers read this as maturity — it's the difference between using a library and depending on one.

**Two-way adapters** exist too: wrapping your own legacy API to satisfy a new interface while old callers keep working is the standard migration technique.

## Decorator

### 💡 **Intent**

Add behaviour to an object without changing its class, and let those additions stack.

**Same interface in, same interface out.** That's what makes decorators composable — each wrapper is invisible to the next.

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
}

class SqlUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> { /* hits the database */ }
}

// ── Decorator 1: caching ──────────────────────────────────────────
class CachedUserRepository implements UserRepository {
  constructor(
    private readonly inner: UserRepository, // ✅ wraps the same interface
    private readonly cache: Map<string, User> = new Map(),
  ) {}

  async findById(id: string): Promise<User | null> {
    const hit = this.cache.get(id);
    if (hit) return hit;

    const user = await this.inner.findById(id);
    if (user) this.cache.set(id, user);
    return user;
  }
}

// ── Decorator 2: instrumentation ──────────────────────────────────
class TimedUserRepository implements UserRepository {
  constructor(
    private readonly inner: UserRepository,
    private readonly metrics: Metrics,
  ) {}

  async findById(id: string): Promise<User | null> {
    const start = performance.now();
    try {
      return await this.inner.findById(id);
    } finally {
      this.metrics.observe("user.findById", performance.now() - start);
    }
  }
}

// ── Compose — order matters ───────────────────────────────────────
const repo: UserRepository = new TimedUserRepository(
  new CachedUserRepository(new SqlUserRepository()),
  metrics,
);
```

🔴 **Order is a design decision, not an accident.** In the composition above, timing wraps caching, so the metric measures the *cached* latency — which is what you want if you're reporting what users experience. Invert it and you're measuring only real database calls. Interviewers who know the pattern will ask which you meant.

**Where you already use this:**

| Real example | What's being decorated |
| ------------ | ---------------------- |
| Express middleware chain | The request handler |
| `fetch` wrapped with retry, auth, logging | The HTTP call |
| Node streams via `pipeline()` | The data flow |
| Higher-order React components | A component |

> ⚠️ **TypeScript's `@decorator` syntax is a different thing.** Those are language annotations applied at class-definition time — NestJS uses them heavily. The Decorator *pattern* is runtime composition of objects. Same word, unrelated mechanisms; conflating them is a common slip.

**In TypeScript, a function wrapper is often the lighter answer:**

```typescript
// Higher-order function: same idea, no class needed.
function withRetry<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  attempts = 3,
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn(...args);
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 2 ** i * 100)); // exponential backoff
      }
    }
    throw lastError;
  };
}
```

## Facade

### 💡 **Intent**

Put one simple interface in front of several complicated subsystems.

Facade **reduces** the surface area. It doesn't add behaviour (Decorator) or translate a mismatch (Adapter) — it hides how many moving parts there really are.

```typescript
// Four subsystems the caller shouldn't have to orchestrate.
class OrderFacade {
  constructor(
    private readonly inventory: InventoryService,
    private readonly payments: PaymentService,
    private readonly shipping: ShippingService,
    private readonly notifications: NotificationService,
  ) {}

  /** One call for the whole "place an order" workflow. */
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    const reservation = await this.inventory.reserve(input.items);

    try {
      const charge = await this.payments.charge(input.paymentToken, input.totalCents);
      const shipment = await this.shipping.schedule(reservation.id, input.address);
      // Fire and forget — a failed email must not fail the order.
      void this.notifications.orderConfirmed(input.userId, shipment.trackingId);
      return { id: reservation.id, chargeId: charge.id, status: "confirmed" };
    } catch (err) {
      await this.inventory.release(reservation.id); // ⚠️ compensate on failure
      throw err;
    }
  }
}
```

The controller calls `placeOrder`. It doesn't know reservations exist.

| Pros | Cons |
| ---- | ---- |
| ✅ Callers depend on one small interface | ❌ Can grow into a god object |
| ✅ Subsystems can be refactored freely behind it | ❌ Hides cost — one call, four network hops |
| ✅ A natural transaction/compensation boundary | ❌ Tempting to add "just one more method" |

**Facade vs Service Layer:** they're closely related, and in a typical backend the service layer *is* a facade over repositories and external clients. See [Service Layer](./04-architectural-patterns.md#service-layer).

## Proxy

### 💡 **Intent**

Stand in for another object with the **same interface**, controlling access to it.

The difference from Decorator is what you do with the call: a decorator always forwards and adds something; a proxy may delay it, block it, or serve it from somewhere else entirely.

| Proxy type | Purpose |
| ---------- | ------- |
| **Virtual** | Defer expensive creation until first use |
| **Protection** | Check permissions before forwarding |
| **Remote** | Make a network call look like a local one (gRPC stubs, RPC clients) |
| **Caching** | Return a stored result instead of calling through |

```typescript
interface ReportService {
  generate(range: DateRange): Promise<Buffer>;
}

/** Virtual proxy — the heavy engine isn't constructed until someone needs a report. */
class LazyReportService implements ReportService {
  private real: ReportService | null = null;

  generate(range: DateRange): Promise<Buffer> {
    this.real ??= new HeavyReportEngine(); // loads templates, fonts, a headless browser
    return this.real.generate(range);
  }
}

/** Protection proxy — the real service never sees an unauthorized call. */
class AuthorizedReportService implements ReportService {
  constructor(
    private readonly inner: ReportService,
    private readonly user: { permissions: string[] },
  ) {}

  generate(range: DateRange): Promise<Buffer> {
    if (!this.user.permissions.includes("report:read")) {
      throw new Error("FORBIDDEN"); // ← doesn't forward; a decorator always would
    }
    return this.inner.generate(range);
  }
}
```

**JavaScript has the pattern built into the language:**

```typescript
// A Proxy object intercepts property access itself — no interface to reimplement.
const strictConfig = new Proxy<Record<string, string>>(
  { port: "3000" },
  {
    get(target, prop: string) {
      if (!(prop in target)) throw new Error(`Missing config: ${prop}`);
      return target[prop];
    },
  },
);

strictConfig.port;    // "3000"
// strictConfig.host; // throws instead of returning undefined
```

> ✨ **This is how modern frameworks feel magical.** Vue's reactivity, Prisma's client, and most mocking libraries use `Proxy` to intercept access at runtime. Being able to say "that's a `Proxy` trap, not code generation" is a strong signal.

## Composite

### 💡 **Intent**

Let a single object and a group of objects be used through the same interface, so callers stop caring which they hold.

The test for whether you need it: **your data is a tree, and you're writing `if (isLeaf)` everywhere.**

```typescript
interface FsNode {
  readonly name: string;
  size(): number; // both leaves and branches answer this
}

class FileNode implements FsNode {
  constructor(readonly name: string, private readonly bytes: number) {}
  size(): number {
    return this.bytes;
  }
}

class DirectoryNode implements FsNode {
  private readonly children: FsNode[] = [];

  constructor(readonly name: string) {}

  add(child: FsNode): this {
    this.children.push(child);
    return this;
  }

  // Recursion is the whole pattern — a directory doesn't know child types.
  size(): number {
    return this.children.reduce((total, child) => total + child.size(), 0);
  }
}

const root = new DirectoryNode("src")
  .add(new FileNode("index.ts", 1_200))
  .add(new DirectoryNode("api").add(new FileNode("users.ts", 3_400)));

root.size(); // 4600 — the caller never checks whether a node is a file
```

**Real examples:** the DOM, React element trees, file systems, org charts, nested permission groups, and a query AST where `AND`/`OR` nodes contain other conditions.

> ⚠️ **Watch recursion depth and cycles.** A deep tree can overflow the stack, and a graph that isn't actually acyclic will loop forever. For untrusted input, cap the depth or track visited nodes.

## Bridge

### 💡 **Intent**

Split an abstraction from its implementation so the two can vary independently.

**The problem it solves is a class explosion.** Two dimensions of variation multiply:

```
❌ Inheritance:  EmailAlert, EmailReport, SmsAlert, SmsReport,
                 SlackAlert, SlackReport …           (3 × 2 = 6 classes)

✅ Bridge:       Alert, Report          (abstraction — what to say)
                 × Email, Sms, Slack    (implementation — how to send)
                                        (3 + 2 = 5, and adding either is +1)
```

```typescript
// Implementation side — the "how".
interface Channel {
  deliver(to: string, body: string): Promise<void>;
}

class EmailChannel implements Channel { /* … */ }
class SlackChannel implements Channel { /* … */ }

// Abstraction side — the "what". Holds a Channel; doesn't extend one.
abstract class Message {
  constructor(protected readonly channel: Channel) {}
  abstract send(to: string, data: Record<string, unknown>): Promise<void>;
}

class AlertMessage extends Message {
  async send(to: string, data: Record<string, unknown>): Promise<void> {
    await this.channel.deliver(to, `🚨 ALERT: ${data.summary}`);
  }
}

class WeeklyReportMessage extends Message {
  async send(to: string, data: Record<string, unknown>): Promise<void> {
    await this.channel.deliver(to, renderReport(data));
  }
}

// Mix freely at runtime.
new AlertMessage(new SlackChannel()).send("#ops", { summary: "Disk 95% full" });
```

**Bridge vs Adapter:** Bridge is planned up front, when you know both sides will vary. Adapter is retrofitted, when two things you didn't design together must now cooperate. Same shape, opposite timing.

## Telling the Wrappers Apart

The table interviewers are fishing for:

| Pattern | Interface | Intent | Signature move |
| ------- | --------- | ------ | -------------- |
| **Adapter** | **Changes** it | Make incompatible things fit | Renames and reshapes calls |
| **Decorator** | **Keeps** it | Add behaviour, stackably | Always forwards, plus extra |
| **Facade** | **Simplifies** it | Hide subsystem complexity | One method → many calls |
| **Proxy** | **Keeps** it | Control access | May *not* forward |

Two quick tests: **does the interface change?** If yes, it's an Adapter. **Does the call always go through?** If no, it's a Proxy.

## Interview Questions

**Q1: Decorator vs Proxy — they look identical.**

Structurally they are: both wrap an object with the same interface. The intent differs. A decorator always forwards the call and adds something around it — caching, logging, retry — and is designed to stack. A proxy controls whether the call happens at all: it might refuse it on permissions, defer construction until first use, or answer from a cache without touching the real object. Decorator enhances; proxy gates.

**Q2: Adapter vs Facade?**

An adapter converts one interface into another because a caller expects a shape the callee doesn't have. A facade invents a simpler interface over several subsystems that were never trying to match anything. Adapter is about mismatch, facade is about volume — and a facade typically fans out to multiple objects while an adapter wraps exactly one.

**Q3: Where do you use Decorator in a Node backend?**

Repository wrappers are the cleanest example — the same `UserRepository` interface implemented by a SQL version, a caching wrapper, and a metrics wrapper, composed at wiring time. Express middleware is the same idea in function form, and so is wrapping `fetch` with retry and auth. In TypeScript the higher-order-function version is often better than a class: less ceremony, same composition.

**Q4: When does Composite pay for itself?**

When the data is genuinely a tree *and* callers keep branching on node type. A file system, a rendered UI tree, or a query AST where `AND` nodes contain other conditions. It's the wrong tool for flat collections, and for untrusted input you need a depth cap so a deeply nested payload can't overflow the stack.

**Q5: Adapter or Bridge?**

Timing. Bridge is deliberate: you know upfront that both the abstraction and its implementation will vary, so you separate them and avoid the class explosion. Adapter is remedial: two existing things need to cooperate and you weren't there when either was designed.

**Q6: How does JavaScript's `Proxy` relate to the pattern?**

It's the pattern as a language primitive. Instead of reimplementing an interface, you install traps — `get`, `set`, `has` — that intercept operations on the target. It's what makes Vue's reactivity and Prisma's fluent client work, and it's ideal for validation or lazy loading with no boilerplate. The cost is that a `Proxy` isn't free at runtime and adds a layer that stack traces and debuggers have to see through.

**Q7: What's the risk with these patterns?**

Depth. Each wrapper is another frame in the stack trace and another indirection to hold in your head, and none of them are visible at the call site — you see `repo.findById(id)` and can't tell whether four layers just ran. That's why I keep composition explicit at a single wiring point rather than scattered, so the layering is readable in one file.

## Summary

**Checklist:**

- [ ] Vendor SDK shapes stay behind an adapter, never inside domain code
- [ ] Decorators implement the same interface and always forward
- [ ] Decorator composition order is deliberate, and documented where it isn't obvious
- [ ] Facades hide subsystems without accumulating unrelated methods
- [ ] Proxies used for access control, laziness, or remoting — not for adding behaviour
- [ ] Composite has a depth guard for untrusted input
- [ ] Bridge chosen only when two dimensions really do vary
- [ ] All wrapping happens at one wiring point, so the stack is readable

**Best practices:**

1. **Same structure, different intent** — say the intent out loud when you choose.
2. **Prefer functions to classes** in TypeScript when the wrapper has no state.
3. **Compose in one place** — the composition root, not scattered through the app.
4. **Don't stack for its own sake** — every layer is a frame someone will debug.

---

[← Creational Patterns](./01-creational-patterns.md) | [Design Patterns Index](./README.md) | [Behavioral Patterns →](./03-behavioral-patterns.md)
