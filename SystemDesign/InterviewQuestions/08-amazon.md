# Design Amazon (E-Commerce Platform)

## How to Open This Answer

"I'll design Amazon's core e-commerce platform — product catalogue, cart, order processing, inventory, and payment flow. This is a read-heavy system with strict consistency requirements on inventory and payments."

## Problem Statement

Amazon handles 1.6 million orders per day and 300 million product listings. The system must show real-time inventory, process payments atomically, and scale to 10x traffic on Prime Day without degradation.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Users can browse, search, and view product detail pages
- Users can add items to a cart and modify quantities
- Checkout reserves inventory, processes payment, and creates an order
- Sellers can update product listings and inventory counts
- Users and admins can track order status through fulfilment

### Non-Functional (pick 3-4)

- Availability: 99.99% — one hour of downtime costs ~$34M in GMV
- Consistency: inventory reservation must be strongly consistent (no overselling)
- Latency: product page loads under 100 ms at P99 globally
- Scale: 10x traffic spikes on Prime Day without manual intervention

## A — Architecture

### High-Level Diagram

```
┌──────────┐      ┌───────────────┐      ┌────────────────────────────────┐
│  Browser │─────▶│  API Gateway  │─────▶│          Microservices         │
│  Mobile  │      │  + CDN (edge) │      │                                │
└──────────┘      └───────────────┘      │  ┌────────────┐ ┌───────────┐ │
                                         │  │ Product    │ │  Search   │ │
                                         │  │ Catalogue  │ │  Service  │ │
                                         │  │ (DynamoDB) │ │ (OpenSrch)│ │
                                         │  └────────────┘ └───────────┘ │
                                         │  ┌────────────┐ ┌───────────┐ │
                                         │  │   Cart     │ │ Inventory │ │
                                         │  │  Service   │ │  Service  │ │
                                         │  │  (Redis)   │ │ (Postgres)│ │
                                         │  └────────────┘ └───────────┘ │
                                         │  ┌────────────┐ ┌───────────┐ │
                                         │  │   Order    │ │  Payment  │ │
                                         │  │  Service   │ │  Service  │ │
                                         │  │ (Postgres) │ │ (Stripe)  │ │
                                         │  └────────────┘ └───────────┘ │
                                         └────────────────────────────────┘
                                                        │
                                              ┌─────────▼──────────┐
                                              │  Message Bus       │
                                              │  (SQS / Kafka)     │
                                              │  order events →    │
                                              │  fulfilment, email │
                                              └────────────────────┘
```

Each domain (catalogue, cart, inventory, order, payment) is a separate microservice with its own database. The checkout flow coordinates across services using a Saga pattern — no distributed transactions. See [../BuildingBlocks/](../BuildingBlocks/) for Saga and [../Database/](../Database/) for polyglot persistence.

## D — Data Model

```typescript
interface Product {
  productId: string;
  sellerId: string;
  title: string;
  description: string;
  categoryPath: string[];      // e.g. ["Electronics", "Laptops"]
  brand: string;
  attributes: Record<string, string>;  // color, size, weight …
  imageUrls: string[];
  basePrice: number;
  currency: string;
  status: "active" | "inactive" | "deleted";
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryItem {
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  quantityReserved: number;     // held during checkout
  quantityAvailable: number;    // = onHand - reserved
  reorderThreshold: number;
  lastUpdatedAt: Date;
}

interface CartItem {
  userId: string;
  productId: string;
  quantity: number;
  addedAt: Date;
  savedForLater: boolean;
}

interface Order {
  orderId: string;
  userId: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "refunded";
  items: Array<{
    productId: string;
    quantity: number;
    unitPriceCents: number;
    warehouseId: string;
  }>;
  shippingAddress: Address;
  totalAmountCents: number;
  paymentIntentId: string;    // Stripe reference
  placedAt: Date;
  estimatedDeliveryAt: Date | null;
}

interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}
```

## I — Interface (APIs)

```typescript
// 1. Search products
// GET /api/v1/products/search?q=&category=&page=&sort=price_asc
interface ProductSearchResponse {
  products: Array<{
    productId: string;
    title: string;
    thumbnailUrl: string;
    priceCents: number;
    rating: number;
    reviewCount: number;
    prime: boolean;
    inStock: boolean;
  }>;
  totalCount: number;
  facets: Record<string, Array<{ value: string; count: number }>>;
  nextPageToken: string | null;
}

// 2. Get product detail page
// GET /api/v1/products/:productId
interface ProductDetailResponse {
  product: Product;
  inventory: { available: number; warehouseIds: string[] };
  pricing: { priceCents: number; wasPrice: number | null; deals: string[] };
  reviews: { averageRating: number; totalCount: number; topReviews: Review[] };
  recommendations: Array<{ productId: string; reason: string }>;
}

// 3. Add item to cart
// POST /api/v1/cart/items
interface AddToCartRequest {
  userId: string;
  productId: string;
  quantity: number;
}
interface AddToCartResponse {
  cartItemId: string;
  cart: { itemCount: number; estimatedTotalCents: number };
}

// 4. Checkout — reserves inventory and creates payment intent
// POST /api/v1/orders/checkout
interface CheckoutRequest {
  userId: string;
  cartItems: Array<{ productId: string; quantity: number }>;
  shippingAddressId: string;
  paymentMethodId: string;   // Stripe payment method
}
interface CheckoutResponse {
  orderId: string;
  status: "confirmed" | "payment_failed" | "out_of_stock";
  paymentIntentId: string;
  estimatedDeliveryAt: Date;
  totalAmountCents: number;
}

// 5. Get order status
// GET /api/v1/orders/:orderId
interface OrderStatusResponse {
  order: Order;
  trackingEvents: Array<{
    status: string;
    location: string;
    timestamp: Date;
  }>;
}

// 6. Update inventory (seller/warehouse system)
// PUT /api/v1/inventory/:productId/:warehouseId
interface InventoryUpdateRequest {
  quantityDelta: number;   // positive = restock, negative = adjustment
  reason: "restock" | "damage" | "audit" | "return";
}
interface InventoryUpdateResponse {
  productId: string;
  warehouseId: string;
  newQuantityOnHand: number;
  newQuantityAvailable: number;
}
```

## O — Optimizations & Trade-offs

### Scaling Concerns

| Concern | Naive Approach | Production Approach |
|---|---|---|
| Inventory overselling | Application-level check | Optimistic locking with DB constraints |
| Product page latency | DB read per request | Redis cache + CDN for static product data |
| Search at 300M products | SQL LIKE query | OpenSearch with inverted index + facets |
| Prime Day traffic spikes | Over-provision always | Auto-scaling + pre-warming CDN/cache |
| Payment double-charge | Simple charge call | Idempotency key on payment intent |

### Checkout Saga — Inventory + Payment Coordination

> Distributed transactions across inventory and payment databases are avoided. The Saga pattern chains compensating transactions instead.

Checkout saga steps:
1. Reserve inventory (Inventory Service) — rollback: release reservation
2. Create payment intent (Payment Service) — rollback: void intent
3. Confirm payment (Payment Service)
4. Create order record (Order Service)
5. Publish `order.confirmed` event → fulfilment queue

- ❌ Two-phase commit across services — coupling, deadlocks, latency
- ✅ Choreography-based saga with compensating transactions

### Inventory Consistency

- ❌ Read inventory → check → update (three separate DB calls, race condition)
- ✅ Single atomic `UPDATE inventory SET reserved = reserved + ? WHERE available >= ?` with row-level lock

### Cart Storage

| Option | Trade-off |
|---|---|
| Database per user | Durable but slow for high-frequency updates |
| Redis session store | Fast but volatile — TTL-based expiry |
| Redis + async DB sync | ✅ Recommended — fast reads, durable on checkout |

### Search Ranking

> Simple full-text search misses intent. Amazon's A9 algorithm weights purchase likelihood, relevance, and seller performance. Personalisation layer re-ranks results per user. See [../BuildingBlocks/](../BuildingBlocks/) for search architecture.

## Common Follow-up Questions

**Q: How do you prevent overselling during flash sales?**
Use Redis atomic `DECRBY` with a Lua script to decrement and check atomically. Back it with an Inventory Service that uses optimistic locking (`WHERE version = ?`) on write. Queue excess requests behind a virtual waiting room.

**Q: How does payment idempotency work?**
The client generates a UUID idempotency key before calling checkout. The Payment Service stores `(idempotencyKey, result)` in a KV store. On retry, the stored result is returned without re-charging.

**Q: How do you scale for Prime Day (10x traffic)?**
Three-phase prep: (1) Pre-scale auto-scaling groups 30 minutes before event. (2) Pre-warm CDN with product images and static assets. (3) Increase Redis cluster size and read replicas. Load-shed non-critical features (recommendations) under sustained overload.

**Q: How is the product catalogue stored?**
DynamoDB for hot product reads (partition key: `productId`). A separate write path updates DynamoDB and streams changes via DynamoDB Streams → Lambda → OpenSearch for search indexing.

**Q: How do you handle refunds?**
A `refund.requested` event triggers a compensating saga: update order status → issue Stripe refund → release inventory if not yet shipped → notify user. Each step is idempotent.

---
[← Back to InterviewQuestions](../README.md)
