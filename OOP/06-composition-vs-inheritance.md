[← README](./README.md) | [← 05 Abstraction](./05-abstraction.md) | [Next: 07 OOP in the Real World →](./07-oop-in-real-world.md)

---

# 06 — Composition vs Inheritance

## 💡 **"Favor Composition Over Inheritance" — The Most Important OOP Principle**

The Gang of Four (GoF) *Design Patterns* book established this as a core guideline in 1994, and it remains the single most impactful piece of OOP advice. Inheritance creates rigid hierarchies; composition builds flexible systems from interchangeable parts.

---

## 🧩 The Analogy: LEGO Blocks vs Russian Dolls

**LEGO Blocks (Composition):**
- You pick individual pieces (abilities, behaviors) and snap them together
- Build exactly what you need — nothing more, nothing less
- Reconfigure at any time by swapping pieces in and out

**Russian Dolls (Inheritance):**
- Each doll contains the one inside it — fixed nesting order
- Can't rearrange the hierarchy without breaking the structure
- Every outer doll carries the weight of all inner dolls

> **Key Insight:**
> LEGO lets you build a spaceship today and a castle tomorrow with the same pieces. Russian dolls are always the same dolls in the same order.

---

## 📐 ASCII Diagram

```
INHERITANCE (rigid tree):              COMPOSITION (mix and match):

       Animal                              Character
      /      \                            has: [abilities]
    Dog       Cat                    +------------------------+
   /    \                            |  CanSwim               |
Poodle  Labrador                     |  CanFly                |
                                     |  CanAttack             |
Can't make a flying dog              |  CanHeal               |
without restructuring                +------------------------+
the entire tree.                     Attach any combo to any character!
```

---

## ⚠️ The Problem with Deep Inheritance

### 1. **Fragile Base Class Problem**

Changing a parent class can silently break all descendants.

```typescript
// Base class change ripples through every subclass
class BaseRepository {
  save(entity: unknown): void {
    this.validate(entity); // ← Adding this line breaks subclasses
    // ... save logic       //   that override validate() differently
  }

  validate(entity: unknown): boolean {
    return entity !== null;
  }
}

class UserRepository extends BaseRepository {
  // This worked before, but now save() calls validate()
  // in an order we didn't expect
  validate(entity: unknown): boolean {
    // Calls external service — now called during save() too!
    return this.externalValidation(entity);
  }
}
```

### 2. **Tight Coupling**

Subclasses are bound to the internal details of their parent.

```
ParentClass (changes here)
    | breaks
  ChildClass (changes here)
      | breaks
    GrandchildClass (changes here)
        | breaks
      GreatGrandchildClass  <-- !!
```

### 3. **The Gorilla-Banana Problem**

> *"You wanted a banana, but you got a gorilla holding the banana and the entire jungle."*
> — Joe Armstrong (creator of Erlang)

```typescript
// ❌ You just want logging, but you inherit everything
class MyService extends FrameworkBaseService {
  // Inherits: HTTP handling, config management, lifecycle hooks,
  // event system, error handling, telemetry, caching...
  // All you wanted was: this.logger.log("hello")
}
```

---

## ✅ The Composition Pattern

Objects contain other objects and delegate behavior to them.

### 💡 **Game Character Abilities**

**❌ Inheritance Approach (Combinatorial Explosion):**

```typescript
// Every combination needs its own class — this doesn't scale
class Character {}
class AttackingCharacter extends Character {}
class SwimmingAttackingCharacter extends AttackingCharacter {}
class FlyingSwimmingAttackingCharacter extends SwimmingAttackingCharacter {}
class HealingFlyingSwimmingAttackingCharacter extends FlyingSwimmingAttackingCharacter {}
// 😱 With N abilities you need 2^N classes
```

**✅ Composition Approach (Flexible and Clean):**

```typescript
// Define ability contracts
interface Ability {
  use(character: Character): void;
}

class CanSwim implements Ability {
  use(character: Character): void {
    console.log(`${character.name} swims through water!`);
  }
}

class CanFly implements Ability {
  use(character: Character): void {
    console.log(`${character.name} soars through the sky!`);
  }
}

class CanAttack implements Ability {
  constructor(private damage: number) {}

  use(character: Character): void {
    console.log(`${character.name} attacks for ${this.damage} damage!`);
  }
}

class CanHeal implements Ability {
  constructor(private healAmount: number) {}

  use(character: Character): void {
    console.log(`${character.name} heals for ${this.healAmount} HP!`);
  }
}

// Character composes abilities — mix and match freely
class Character {
  private abilities: Ability[] = [];

  constructor(public name: string) {}

  addAbility(ability: Ability): this {
    this.abilities.push(ability);
    return this; // Fluent API
  }

  useAbilities(): void {
    this.abilities.forEach((ability) => ability.use(this));
  }
}

// Build any combination without new classes
const warrior = new Character("Warrior")
  .addAbility(new CanAttack(50))
  .addAbility(new CanSwim());

const mage = new Character("Mage")
  .addAbility(new CanAttack(30))
  .addAbility(new CanFly())
  .addAbility(new CanHeal(40));
```

**Benefits:**
- ✅ Add new abilities without touching existing code (Open/Closed Principle)
- ✅ Abilities can be added or removed at runtime
- ✅ No combinatorial explosion — N abilities = N classes, not 2^N

---

## 💉 Dependency Injection (DI)

### 💡 **Pass Dependencies In — Don't Create Them Internally**

DI is composition's best friend. Instead of a class creating its own dependencies, they are provided from outside.

**❌ Before (Hard-Coded Dependency):**

```typescript
class OrderService {
  // Tightly coupled — can't swap, can't test
  private payment = new StripeGateway();
  private mailer = new SendGridMailer();

  async placeOrder(order: Order): Promise<void> {
    await this.payment.charge(order.total);
    await this.mailer.send(order.customerEmail, "Order placed!");
  }
}
```

**Problems:**
- ❌ Can't swap Stripe for PayPal without editing OrderService
- ❌ Can't test without real Stripe/SendGrid calls
- ❌ OrderService knows about concrete implementations

**✅ After (Dependency Injection):**

```typescript
// Define contracts (interfaces)
interface PaymentGateway {
  charge(amount: number): Promise<void>;
}

interface Mailer {
  send(to: string, body: string): Promise<void>;
}

// OrderService depends on abstractions, not concretions
class OrderService {
  constructor(
    private payment: PaymentGateway,
    private mailer: Mailer
  ) {}

  async placeOrder(order: Order): Promise<void> {
    await this.payment.charge(order.total);
    await this.mailer.send(order.customerEmail, "Order placed!");
  }
}

// Production: inject real implementations
const orderService = new OrderService(
  new StripeGateway(),
  new SendGridMailer()
);

// Testing: inject mocks
const testService = new OrderService(
  new MockPaymentGateway(), // No real charges
  new MockMailer()          // No real emails
);
```

**Benefits:**
- ✅ Swap implementations freely (Stripe → PayPal)
- ✅ Test with mocks — fast, isolated, no side effects
- ✅ Follows Interface Segregation and Dependency Inversion principles

---

## 🏗️ NestJS Module Composition (Real-World DI)

NestJS is built entirely on composition and dependency injection.

```typescript
// payment.service.ts — depends on an interface
@Injectable()
class PaymentService {
  constructor(
    @Inject("PAYMENT_GATEWAY") private gateway: PaymentGateway
  ) {}

  async processPayment(amount: number): Promise<PaymentResult> {
    return this.gateway.charge(amount);
  }
}

// payment.module.ts — wires dependencies together
@Module({
  providers: [
    PaymentService,
    {
      provide: "PAYMENT_GATEWAY",
      useClass:
        process.env.NODE_ENV === "test"
          ? MockPaymentGateway
          : StripeGateway,
    },
  ],
  exports: [PaymentService],
})
class PaymentModule {}

// order.module.ts — composes modules together
@Module({
  imports: [PaymentModule, NotificationModule, InventoryModule],
  providers: [OrderService],
})
class OrderModule {}
```

> **Key Insight:**
> NestJS modules are LEGO blocks. Each module encapsulates a capability, and you snap them together to build your application.

---

## 🔀 Mixins — Behavior Sharing Without Inheritance

Mixins add behavior to classes without creating an inheritance chain.

```typescript
// Define mixin types
type Constructor<T = {}> = new (...args: any[]) => T;

// Mixin: adds timestamping behavior
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
    updatedAt = new Date();

    touch(): void {
      this.updatedAt = new Date();
    }
  };
}

// Mixin: adds soft-delete behavior
function SoftDeletable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    deletedAt: Date | null = null;

    softDelete(): void {
      this.deletedAt = new Date();
    }

    restore(): void {
      this.deletedAt = null;
    }

    get isDeleted(): boolean {
      return this.deletedAt !== null;
    }
  };
}

// Mixin: adds validation behavior
function Validatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    errors: string[] = [];

    validate(): boolean {
      this.errors = [];
      // Override in consuming class
      return this.errors.length === 0;
    }
  };
}

// Compose mixins onto a base class
class BaseEntity {
  constructor(public id: string) {}
}

class User extends Timestamped(SoftDeletable(Validatable(BaseEntity))) {
  constructor(id: string, public email: string) {
    super(id);
  }
}

const user = new User("1", "test@example.com");
user.touch();        // From Timestamped
user.softDelete();   // From SoftDeletable
user.validate();     // From Validatable
```

---

## 🔧 Higher-Order Functions — Composition for Logic

Compose behavior through functions, not class hierarchies.

```typescript
// Middleware-style composition
type Middleware<T> = (context: T, next: () => Promise<void>) => Promise<void>;

function compose<T>(...middlewares: Middleware<T>[]): Middleware<T> {
  return async (context, next) => {
    let index = -1;

    async function dispatch(i: number): Promise<void> {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      const fn = i === middlewares.length ? next : middlewares[i];
      await fn(context, () => dispatch(i + 1));
    }

    await dispatch(0);
  };
}

// Individual behaviors — each is independent and testable
const logging: Middleware<RequestContext> = async (ctx, next) => {
  console.log(`→ ${ctx.method} ${ctx.path}`);
  await next();
  console.log(`← ${ctx.status}`);
};

const auth: Middleware<RequestContext> = async (ctx, next) => {
  if (!ctx.headers.authorization) {
    ctx.status = 401;
    return;
  }
  await next();
};

const rateLimit: Middleware<RequestContext> = async (ctx, next) => {
  if (await isRateLimited(ctx.ip)) {
    ctx.status = 429;
    return;
  }
  await next();
};

// Compose them — order matters, easy to rearrange
const pipeline = compose(logging, auth, rateLimit);
```

---

## 📊 Comparison Table

| Aspect | Inheritance | Composition |
|--------|------------|-------------|
| **Relationship** | "is-a" | "has-a" |
| **Coupling** | Tight (parent ↔ child) | Loose (interface-based) |
| **Flexibility** | Low — fixed at compile time | High — changeable at runtime |
| **Reuse direction** | Vertical (up the parent chain) | Horizontal (any object to any object) |
| **Testing** | Harder — need parent context | Easier — mock individual pieces |
| **Adding behavior** | New subclass or modify parent | Attach a new component |
| **Breaking changes** | Ripple through all descendants | Isolated to the changed component |
| **Scaling** | Combinatorial explosion (2^N) | Linear growth (N components) |
| **When to use** | Clear hierarchies, shared impl. | Most other cases |

---

## 🧭 Decision Framework

Use this decision tree to choose the right approach:

```
Is there a clear, natural "is-a" relationship?
|
+-- YES --> Is the hierarchy shallow (1-2 levels max)?
|           |
|           +-- YES --> Do subclasses need the FULL parent implementation?
|           |           |
|           |           +-- YES --> Use INHERITANCE
|           |           |
|           |           +-- NO  --> Use COMPOSITION
|           |
|           +-- NO  --> Use COMPOSITION (deep hierarchies are fragile)
|
+-- NO  --> Use COMPOSITION
```

### Decision Table

| Scenario | Use | Why |
|----------|-----|-----|
| Dog **is-a** Animal, 1 level deep | Inheritance | Clear hierarchy, shared implementation |
| Character **has** abilities | Composition | Flexible, combinable behaviors |
| Service **uses** a logger | Composition + DI | Swappable, testable dependency |
| React component **wraps** another | Composition | HOC / render props pattern |
| Entity **needs** timestamps + soft-delete | Mixins | Cross-cutting concerns, no hierarchy |
| Handler **chains** middleware | Composition | Order-flexible pipeline |
| Square "is-a" Rectangle? | ⚠️ Neither naively | Liskov Substitution violation — redesign |

---

## ⚠️ When Inheritance Is Still the Right Call

Inheritance is not evil — it is just overused. These are legitimate use cases:

```typescript
// ✅ Good: Shallow hierarchy with genuinely shared implementation
abstract class HttpError {
  constructor(
    public message: string,
    public statusCode: number
  ) {}

  toJSON(): { error: string; status: number } {
    return { error: this.message, status: this.statusCode };
  }
}

class NotFoundError extends HttpError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

class UnauthorizedError extends HttpError {
  constructor() {
    super("Authentication required", 401);
  }
}

// ✅ Why this works:
// - Clear "is-a" (NotFoundError IS an HttpError)
// - Shallow (1 level)
// - Shared implementation (toJSON, statusCode)
// - Subclasses don't fight the parent
```

---

## 🎯 Key Interview Questions

**Q1: Why does the Gang of Four say "favor composition over inheritance"?**

> Inheritance creates tight coupling between parent and child classes. Changes to a parent can break all descendants (Fragile Base Class problem). Composition provides the same code reuse with looser coupling, easier testing, and runtime flexibility.

**Q2: What is the Gorilla-Banana problem?**

> When you inherit from a class, you get everything it carries — not just the method you wanted. You wanted a banana (one method) but got the gorilla (entire class) and the jungle (its dependencies and ancestors).

**Q3: Give a real-world example where inheritance fails.**

> A game with characters that can swim, fly, and attack. With inheritance, you need 2^N subclasses for N abilities. With composition, you create N ability classes and attach any combination to any character.

**Q4: How does Dependency Injection relate to composition?**

> DI is the mechanism that makes composition practical. Instead of a class creating its own dependencies (tight coupling), dependencies are injected from outside through constructor parameters, usually typed as interfaces. This allows swapping implementations for testing or different environments.

**Q5: When IS inheritance the right choice?**

> When there is a clear, natural "is-a" relationship with a shallow hierarchy (1-2 levels), and subclasses genuinely need the parent's full implementation. Error hierarchies and event type hierarchies are common valid examples.

**Q6: What are mixins and when do you use them?**

> Mixins add behavior to classes without creating an inheritance chain. Use them for cross-cutting concerns (timestamps, soft-delete, validation) that apply to unrelated classes. In TypeScript, they are implemented as functions that take a base class and return an extended class.

---

## 📝 Summary

| Principle | Takeaway |
|-----------|----------|
| **Default to composition** | Start with composition; only use inheritance when it is clearly better |
| **Depend on abstractions** | Program to interfaces, inject dependencies |
| **Keep hierarchies shallow** | If you must inherit, stay at 1-2 levels max |
| **Mixins for cross-cutting** | Use mixins when multiple unrelated classes need the same behavior |
| **Test as a signal** | If it is hard to test, you probably need more composition |

> **Key Insight:**
> Inheritance answers "what is this thing?" — Composition answers "what can this thing do?" In most real-world software, what an object *does* matters more than what it *is*.

---

[← 05 Abstraction](./05-abstraction.md) | [Next: 07 OOP in the Real World →](./07-oop-in-real-world.md)
