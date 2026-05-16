# Service Communication

## 💡 **Sync communication waits for a response. Async communication does not.**

The choice between the two shapes reliability, latency, and coupling across your entire system.

---

## Synchronous Communication

The caller sends a request and **blocks until it gets a response**. The callee must be available right now.

**Protocols:**
- **REST** — HTTP + JSON, wide tooling support, easy to debug
- **gRPC** — HTTP/2 + Protocol Buffers, lower latency, strong typing, ideal for internal service calls

```typescript
// REST contract — loose, string-based, easy to version
interface CreateOrderRequest {
  userId: string;
  lineItems: { productId: string; quantity: number }[];
}

interface CreateOrderResponse {
  orderId: string;
  status: "pending" | "confirmed";
  estimatedDelivery: string; // ISO date
}

// gRPC-equivalent TypeScript interface — strict, generated from .proto
interface OrderService {
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;
  getOrder(request: { orderId: string }): Promise<FullOrder>;
  cancelOrder(request: { orderId: string; reason: string }): Promise<void>;
}
```

**REST** is the right default for public APIs and cross-team boundaries. **gRPC** is the right choice for high-throughput internal calls — order service calling inventory service thousands of times per second.

---

## Asynchronous Communication

The caller sends a message and **continues immediately**. The callee processes it later.

**Patterns:**
- **Message queues** — one sender, one consumer (RabbitMQ, AWS SQS)
- **Event streaming** — one publisher, many consumers (Kafka, AWS EventBridge)

```typescript
// Event published by checkout service when order is confirmed
interface OrderConfirmedEvent {
  eventType: "ORDER_CONFIRMED";
  eventId: string;
  timestamp: string;
  orderId: string;
  userId: string;
  totalAmount: number;
  lineItems: OrderLineItem[];
}

// Inventory service subscribes to this event and decrements stock
// Email service subscribes and sends confirmation
// Analytics service subscribes and records the transaction
// — none of these are coupled to checkout service
```

The checkout service does not know about email, inventory, or analytics. It just publishes. New consumers add themselves without changing the publisher.

---

## Sync vs Async Decision Table

| Scenario                                      | Use          | Why                                               |
| --------------------------------------------- | ------------ | ------------------------------------------------- |
| User needs an immediate response              | Sync (REST)  | Caller blocks until result is ready               |
| Payment authorization                         | Sync (REST)  | Must know success or failure before continuing    |
| Read a product catalogue                      | Sync (REST)  | Simple query-response                             |
| Internal high-throughput service calls        | Sync (gRPC)  | Lower overhead, streaming support                 |
| Order placed → notify email, inventory, audit | Async        | Caller doesn't need those results                 |
| User uploads a report → process in background | Async        | Processing takes 30 seconds — don't block the UI  |
| Broadcast an event to multiple consumers      | Async        | Fan-out is natural with a message broker          |
| Workflows with retries and failure tolerance  | Async        | Queue retries automatically on consumer failure   |

---

## Choreography vs Orchestration

Both handle multi-step workflows across services. They differ in **who controls the flow**.

### Choreography — no central coordinator

Each service reacts to events. Services are fully decoupled. No single service knows the full workflow.

```
Checkout publishes ORDER_CONFIRMED
    ↓ (async)
Inventory reacts → decrements stock → publishes STOCK_RESERVED
    ↓ (async)
Fulfillment reacts → creates pick list → publishes ORDER_DISPATCHED
    ↓ (async)
Email reacts → sends "Your order has shipped" email
```

**Pros:** Loose coupling, easy to add new steps.
**Cons:** Hard to visualize the full workflow. Debugging requires tracing across all events.

### Orchestration — central coordinator

One service (the orchestrator) drives the workflow. It calls each step and reacts to success or failure.

```typescript
interface WorkflowStep<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
  compensate(input: TInput): Promise<void>; // undo on failure
}

// Order orchestrator drives the checkout workflow
class OrderWorkflow {
  constructor(
    private readonly inventory: WorkflowStep<ReserveStockInput, ReserveStockOutput>,
    private readonly payment: WorkflowStep<ChargeInput, ChargeOutput>,
    private readonly fulfillment: WorkflowStep<FulfillInput, FulfillOutput>
  ) {}

  async execute(order: Order): Promise<void> {
    const reservation = await this.inventory.execute({ orderId: order.id });

    let charge: ChargeOutput | undefined;
    try {
      charge = await this.payment.execute({ orderId: order.id, amount: order.total });
    } catch {
      await this.inventory.compensate({ orderId: order.id, reservationId: reservation.id });
      throw new Error("Payment failed — stock reservation reversed");
    }

    try {
      await this.fulfillment.execute({ orderId: order.id, chargeId: charge.chargeId });
    } catch {
      await this.payment.compensate({ chargeId: charge.chargeId });
      await this.inventory.compensate({ orderId: order.id, reservationId: reservation.id });
      throw new Error("Fulfillment failed — charge and reservation reversed");
    }
  }
}
```

**Pros:** Workflow is visible in one place. Easy to trace and debug.
**Cons:** The orchestrator becomes a single point of coupling. Changes to the workflow require changing it.

---

## Common Mistakes

**❌ Long synchronous call chains**

```
API → Order Svc → Inventory Svc → Warehouse Svc → Shipping Svc
```

Each hop adds latency. One slow service stalls the entire chain. If any service is down, the whole request fails.

**✅ Break chains with async events. Emit ORDER_CONFIRMED and let each service react independently.**

---

**❌ Using async when the user needs an immediate answer**

```typescript
// Checkout placed an order — async event published
// User sees "processing..." for 10 seconds waiting for inventory check
```

**✅ Inventory check must be sync — user cannot proceed without knowing stock is available.**

---

## Key Insight

> Use async when the caller doesn't need an immediate response. Use sync when it does. The mistake is using sync everywhere for simplicity, then discovering that one unavailable service can cascade failures across your entire system.

---

[← API Gateway](./03-api-gateway.md) | [Next: Data Management →](./05-data-management.md)
