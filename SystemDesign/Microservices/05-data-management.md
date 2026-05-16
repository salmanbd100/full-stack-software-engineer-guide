# Data Management

## 💡 **Each service owns its data. No service reads another service's database directly.**

This is the hardest rule to enforce — and the most important. Shared databases create invisible coupling that defeats independent deployment.

---

## Database-per-Service Pattern

Every service has its own dedicated data store. Other services access data only through the owning service's API.

```
Order Service     → orders_db (PostgreSQL)
User Service      → users_db (PostgreSQL)
Product Service   → products_db (MongoDB — document model suits catalogue data)
Search Service    → search_idx (Elasticsearch)
Session Service   → sessions_cache (Redis)
```

Services choose the database that best fits their data model. This is **polyglot persistence**.

**Why this matters:**

- ✅ Services deploy independently — no shared schema migrations
- ✅ Each service scales its database separately
- ✅ A database failure in one service doesn't cascade
- ❌ Cross-service queries require API calls — more latency
- ❌ No joins across service boundaries — must denormalize or aggregate in code

---

## The Distributed Transaction Problem

In a monolith, you wrap multiple operations in a database transaction. They all commit or all roll back.

In microservices, a single business action spans multiple services, each with their own database. You cannot use a single transaction.

```
Place Order:
1. Charge payment    (Payment Service  → payments_db)
2. Reserve stock     (Inventory Service → inventory_db)
3. Create order      (Order Service    → orders_db)
4. Send confirmation (Email Service)

If step 3 fails, how do you undo steps 1 and 2?
```

Two-phase commit (2PC) is theoretically possible but rarely used. It is slow, fragile, and ties services together at the database level. The practical answer is the **Saga pattern**.

---

## Saga Pattern

A saga breaks a distributed transaction into a sequence of local transactions. Each local transaction publishes an event or message. If one step fails, **compensating transactions** undo the previous steps.

### Choreography Saga

No central coordinator. Services react to events and publish their own.

```
ORDER_PLACED
    ↓
Payment Service → charges card → publishes PAYMENT_CHARGED
    ↓
Inventory Service → reserves stock → publishes STOCK_RESERVED
    ↓
Order Service → confirms order → publishes ORDER_CONFIRMED
    ↓ (failure path)
If STOCK_RESERVATION_FAILED:
    Payment Service listens → refunds charge
```

### Orchestration Saga

One orchestrator drives the steps and handles failures.

```typescript
type SagaStatus = "pending" | "completed" | "compensating" | "failed";

interface SagaStep<TData> {
  name: string;
  execute(data: TData): Promise<void>;
  compensate(data: TData): Promise<void>;
}

interface SagaContext {
  sagaId: string;
  orderId: string;
  userId: string;
  amount: number;
  completedSteps: string[];
}

class OrderSaga {
  private readonly steps: SagaStep<SagaContext>[] = [
    {
      name: "charge-payment",
      execute: async (ctx) => {
        await this.paymentService.charge({ userId: ctx.userId, amount: ctx.amount });
      },
      compensate: async (ctx) => {
        await this.paymentService.refund({ userId: ctx.userId, sagaId: ctx.sagaId });
      },
    },
    {
      name: "reserve-stock",
      execute: async (ctx) => {
        await this.inventoryService.reserve({ orderId: ctx.orderId });
      },
      compensate: async (ctx) => {
        await this.inventoryService.release({ orderId: ctx.orderId });
      },
    },
    {
      name: "create-order",
      execute: async (ctx) => {
        await this.orderService.confirm({ orderId: ctx.orderId, sagaId: ctx.sagaId });
      },
      compensate: async (ctx) => {
        await this.orderService.cancel({ orderId: ctx.orderId });
      },
    },
  ];

  async run(context: SagaContext): Promise<void> {
    for (const step of this.steps) {
      try {
        await step.execute(context);
        context.completedSteps.push(step.name);
      } catch (error) {
        await this.compensate(context);
        throw new Error(`Saga failed at step: ${step.name}`);
      }
    }
  }

  private async compensate(context: SagaContext): Promise<void> {
    // Compensate in reverse order — only completed steps
    const toCompensate = this.steps
      .filter((s) => context.completedSteps.includes(s.name))
      .reverse();

    for (const step of toCompensate) {
      await step.compensate(context); // Best-effort — log failures, alert on-call
    }
  }
}
```

---

## Saga Tradeoffs

| Dimension              | Choreography Saga                     | Orchestration Saga                    |
| ---------------------- | ------------------------------------- | ------------------------------------- |
| **Coupling**           | Low — services only know events       | Medium — services know the orchestrator |
| **Visibility**         | Hard — workflow is implicit           | Easy — one class shows the full flow  |
| **Debugging**          | Requires event tracing                | Straightforward — one log trail       |
| **Adding steps**       | Easy — new service subscribes         | Requires orchestrator change          |
| **Compensation**       | Each service handles its own          | Orchestrator drives compensation      |
| **Best for**           | Simple, well-known event flows        | Complex workflows with many branches  |

---

## Event Sourcing

Instead of storing current state, **event sourcing** stores every event that led to the current state. Current state is derived by replaying events.

```typescript
type OrderEvent =
  | { type: "ORDER_CREATED"; orderId: string; userId: string; timestamp: string }
  | { type: "ITEM_ADDED"; orderId: string; productId: string; quantity: number }
  | { type: "PAYMENT_RECEIVED"; orderId: string; amount: number }
  | { type: "ORDER_SHIPPED"; orderId: string; trackingNumber: string };

function replayOrder(events: OrderEvent[]): OrderState {
  return events.reduce<OrderState>((state, event) => {
    switch (event.type) {
      case "ORDER_CREATED":
        return { ...state, id: event.orderId, status: "created", items: [] };
      case "ITEM_ADDED":
        return { ...state, items: [...state.items, { productId: event.productId, quantity: event.quantity }] };
      case "PAYMENT_RECEIVED":
        return { ...state, status: "paid", amountPaid: event.amount };
      case "ORDER_SHIPPED":
        return { ...state, status: "shipped", trackingNumber: event.trackingNumber };
      default:
        return state;
    }
  }, {} as OrderState);
}
```

Event sourcing gives you a complete audit trail. It pairs naturally with CQRS (Command Query Responsibility Segregation) — commands write events, queries read from a projected read model.

---

## Common Mistakes

**❌ Cross-service database joins**

```typescript
// Inventory service joining against orders table — breaks isolation
const result = await db.query(`
  SELECT o.id, p.stock FROM orders o
  JOIN inventory.products p ON o.product_id = p.id
`);
```

**✅ Call the owning service's API. Accept the latency — it enforces the boundary.**

---

**❌ Treating sagas like ACID transactions**

Sagas are **eventually consistent**. Between steps, the system is in an intermediate state. Design your UX to handle this — show "processing" instead of instant confirmation.

---

## Key Insight

> Use sagas when a business transaction spans multiple services. Orchestration sagas are easier to debug. Choreography sagas scale better. Both require idempotent compensating transactions — the same compensation applied twice must produce the same result.

---

[← Communication](./04-communication.md) | [Next: Deployment →](./06-deployment.md)
