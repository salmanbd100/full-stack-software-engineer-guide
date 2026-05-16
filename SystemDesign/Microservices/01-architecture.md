# Microservices Architecture

## 💡 **A microservice is a service that one team owns end-to-end.**

That's not a simplification — it's the design rule. Every other decision follows from it.

---

## Monolith vs Microservices

A **monolith** packages all features into one deployable unit. A **microservices** system splits features into independently deployable services. Neither is inherently better. The tradeoffs are real and significant.

| Dimension         | Monolith                          | Microservices                          |
| ----------------- | --------------------------------- | -------------------------------------- |
| **Deployment**    | One artifact, all-or-nothing      | Each service deploys independently     |
| **Testing**       | Easier — one process to run       | Harder — requires contract + e2e tests |
| **Scaling**       | Scale the whole app               | Scale only the bottleneck service      |
| **Team size**     | Works well up to ~10 engineers    | Necessary beyond ~30 engineers         |
| **Complexity**    | Low operational overhead          | High: networking, service mesh, tracing|
| **Failure blast** | One bug can take down everything  | Failures are isolated per service      |
| **Latency**       | In-process function calls         | Network hops add latency               |

---

## How It Works

Services communicate over the network — usually HTTP/REST or gRPC. Each service owns its own data store. No shared databases. No shared libraries that couple release cycles.

```
Client Request
    ↓
API Gateway
    ↓         ↓           ↓
Order Svc  User Svc   Inventory Svc
    ↓           ↓           ↓
 Orders DB   Users DB   Inventory DB
```

Each box is a separate process. Each database is private to its service. Other services cannot query it directly — they must call the API.

---

## Domain-Driven Design for Service Boundaries

**Domain-Driven Design (DDD)** gives a systematic way to find service boundaries. The key concept is the **bounded context** — a region of your system where a model is consistent and terms have clear meaning.

In an e-commerce system, "order" means something different to:
- The **checkout** team — a cart being converted
- The **fulfillment** team — a pick-pack-ship job
- The **finance** team — a billing record

Each meaning lives in a separate bounded context. Each bounded context becomes a service candidate.

```typescript
// Each bounded context owns its own Order model
// Checkout service model
interface CheckoutOrder {
  cartId: string;
  lineItems: LineItem[];
  paymentToken: string;
  status: "pending" | "processing";
}

// Fulfillment service model — same concept, different fields
interface FulfillmentOrder {
  orderId: string;
  warehouseId: string;
  pickingList: PickItem[];
  status: "queued" | "picked" | "dispatched";
}
```

They share `orderId` as a correlation key. They do not share a model or a database.

---

## Conway's Law

> "Organizations which design systems are constrained to produce designs which are copies of the communication structures of those organizations."

This law predicts your architecture. If three teams build a checkout flow together, you will get three tightly coupled services that behave like a distributed monolith.

**The inverse is powerful.** Design your teams first, then your services. Each team should own exactly one service — its API contract, its database, its deployment pipeline.

```
❌ Conway trap — two teams sharing one service
Team A ──┐
         ├── Checkout Service  ← conflicting ownership, slow deploys
Team B ──┘

✅ Inverse Conway — one team per service
Team A ── Checkout Service
Team B ── Payment Service
```

---

## When to Split a Monolith

Splitting early is expensive. Splitting late creates a distributed monolith. Use these signals:

**Split when:**
- ✅ A single team owns the new service end-to-end
- ✅ The service needs a different scaling profile (CPU-heavy vs IO-heavy)
- ✅ The service needs a different release cadence
- ✅ A compliance boundary requires data isolation (PCI, HIPAA)

**Do not split when:**
- ❌ The team is fewer than 5 engineers
- ❌ You cannot draw a clean data boundary between the services
- ❌ The services must always be deployed together
- ❌ You are splitting to look modern, not to solve a real problem

> **Decision rule:** Split when a team can own a service end-to-end — its code, its database, its on-call rotation.

---

## Common Mistakes

**❌ Shared database across services**

```typescript
// Two services hitting the same table — this is a monolith with network overhead
const orders = await sharedDb.query("SELECT * FROM orders WHERE user_id = ?", [userId]);
```

**✅ Each service owns its data. Cross-service reads go through an API.**

```typescript
// Order service exposes an endpoint. User service calls it.
const orders = await orderServiceClient.getOrdersByUser(userId);
```

---

**❌ Splitting by technical layer**

```
❌ UserController Service + UserModel Service + UserValidator Service
```

This creates chatty, coupled services. Split by **business capability** instead.

```
✅ User Service (auth, profile, preferences — owns everything about a user)
```

---

**❌ Distributed monolith**

Services that must deploy together, share a database, or make synchronous calls in a chain are a distributed monolith. You get the complexity of microservices with none of the independence.

---

## Key Insight

> Microservices are an organizational pattern as much as a technical one. The architecture works only when team ownership and service ownership align. Start with the team structure — the right service boundaries will follow.

---

[← Back to Microservices](./README.md) | [Next: Service Discovery →](./02-service-discovery.md)
