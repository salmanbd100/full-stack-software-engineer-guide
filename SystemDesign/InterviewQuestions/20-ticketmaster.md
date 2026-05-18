# Design Ticketmaster

## How to Open This Answer

"I'll design a ticket booking platform that handles both steady-state browsing and flash-sale spikes. The hardest problem is preventing double-booking under extreme concurrency — I'll solve that with optimistic locking and a virtual waiting queue for high-demand events."

## Problem Statement

Ticketmaster serves two very different traffic patterns: casual event browsing (low load) and on-sale moments when millions of fans attempt to buy the same limited seats simultaneously (extreme spike). The system must guarantee no seat is sold twice, complete payment within a reasonable hold window (10 minutes), and remain available even when a single event generates 100x normal traffic.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Users can browse events and view seating maps with real-time availability
- Users can select seats and hold them for up to 10 minutes while paying
- Payment confirms the booking; failed or expired holds release seats
- Prevent double-booking — two users must never receive the same seat
- High-demand events use a virtual queue so traffic is metered fairly

### Non-Functional (pick 3-4)

- Seat hold and payment confirmation in under 3 seconds for p99
- Handle 500k concurrent users at peak on-sale for a major event
- Booking data is durable — a payment confirmation must never be lost
- 99.99% availability for browsing; 99.9% for checkout (brief degradation acceptable)

## A — Architecture

### High-Level Diagram

```
Users (browser / app)
      │
      ▼
CDN (static assets, event pages)
      │
      ▼
API Gateway (auth, rate limiting)
      │
      ├─────────────────────────────┐
      ▼                             ▼
Event Browse Service          Queue Service
(read-only, cached)           (virtual waiting room)
                                    │
                                    ▼ (metered tokens)
                              Booking Service
                                    │          │
                                    ▼          ▼
                              Seat Lock DB   Payment Service
                              (PostgreSQL,   (Stripe / internal)
                               row-level     │
                               lock)         ▼
                                        Notification Service
                                        (email, SMS, push)
      │
      ▼
Seat Inventory Cache (Redis)
      │ async sync
      ▼
Seat Inventory DB (PostgreSQL)
```

The Queue Service issues time-limited tokens to users waiting to buy. Tokens are processed in FIFO order, throttled to a rate the Booking Service can handle. The Booking Service holds a seat using a DB row lock for up to 10 minutes. Payment must complete within the hold window. On payment success, the booking is committed and a confirmation event published to Kafka. On timeout or failure, the hold is released and the seat returns to inventory.

### Seat Hold — Optimistic Locking Flow

```typescript
// Booking Service — seat reservation with optimistic locking
async function holdSeat(
  seatId: string,
  userId: string,
  bookingId: string
): Promise<boolean> {
  // Atomic update — only succeeds if seat is still available
  const result = await db.query(`
    UPDATE seats
    SET
      status       = 'held',
      hold_user_id  = $1,
      hold_expiry   = NOW() + INTERVAL '10 minutes',
      version       = version + 1
    WHERE
      seat_id = $2
      AND status  = 'available'
      AND version = $3
    RETURNING seat_id
  `, [userId, seatId, currentVersion]);

  return result.rowCount === 1; // false = another user won the race
}
```

If `rowCount` is 0, the seat was taken. The Booking Service returns a 409 Conflict and the client must select a different seat. This is non-blocking — no long-lived DB lock, no queue inside the database.

### Hold Expiry — Two-Layer Safety Net

| Layer | Mechanism | Recovery Time |
|---|---|---|
| Primary: Redis TTL | `EXPIRE hold:{bookingId} 600` fires a keyspace event | ~1 second after expiry |
| Fallback: DB cron | `UPDATE seats SET status='available' WHERE hold_expiry < NOW()` | Every 30 seconds |

The Redis layer handles the normal case. The DB cron is the safety net if Redis keyspace notifications are missed or delayed.

## D — Data Model

```typescript
interface Event {
  eventId: string;
  name: string;
  venue: string;
  startsAt: Date;
  onSaleAt: Date;
  status: "upcoming" | "on-sale" | "sold-out" | "cancelled";
  totalSeats: number;
  availableSeats: number;   // denormalised, updated on each booking
}

interface Seat {
  seatId: string;
  eventId: string;
  section: string;
  row: string;
  number: string;
  tier: "general" | "floor" | "vip";
  priceCents: number;
  status: "available" | "held" | "sold";
  holdExpiry?: Date;        // non-null when status = "held"
  holdUserId?: string;
  version: number;          // optimistic lock version counter
}

interface Booking {
  bookingId: string;
  userId: string;
  eventId: string;
  seatIds: string[];
  status: "pending" | "confirmed" | "cancelled" | "refunded";
  totalAmountCents: number;
  paymentIntentId?: string; // Stripe PaymentIntent ID
  createdAt: Date;
  confirmedAt?: Date;
  expiresAt: Date;          // hold window end — 10 min from createdAt
}

interface QueueToken {
  tokenId: string;
  userId: string;
  eventId: string;
  issuedAt: Date;
  expiresAt: Date;          // token is valid for 15 min after issue
  position: number;         // position in queue at time of issue
}
```

## I — Interface (APIs)

```typescript
// GET /v1/events/:eventId/seats  — fetch seating map with availability
interface SeatsResponse {
  eventId: string;
  sections: Array<{
    section: string;
    seats: Array<{
      seatId: string;
      row: string;
      number: string;
      tier: string;
      priceCents: number;
      available: boolean;   // held seats shown as unavailable
    }>;
  }>;
  fetchedAt: string;        // client uses this to detect stale maps
}

// POST /v1/queue/join  — enter virtual queue for high-demand event
interface JoinQueueRequest {
  eventId: string;
}
interface JoinQueueResponse {
  tokenId: string;
  estimatedWaitSeconds: number;
  position: number;
}

// POST /v1/bookings  — hold seats (requires valid queue token for hot events)
interface CreateBookingRequest {
  eventId: string;
  seatIds: string[];        // max 8 seats per booking
  queueToken?: string;
}
interface CreateBookingResponse {
  bookingId: string;
  status: "pending";
  totalAmountCents: number;
  paymentClientSecret: string;  // Stripe client secret for frontend
  expiresAt: string;
}

// POST /v1/bookings/:bookingId/confirm  — called after payment succeeds
interface ConfirmBookingRequest {
  paymentIntentId: string;
}
interface ConfirmBookingResponse {
  bookingId: string;
  status: "confirmed";
  confirmationCode: string;
  tickets: Array<{ seatId: string; ticketUrl: string }>;
}

// DELETE /v1/bookings/:bookingId  — cancel hold before payment
interface CancelBookingResponse {
  bookingId: string;
  status: "cancelled";
  seatsReleased: string[];
}
```

## O — Optimizations & Trade-offs

### Scaling concerns

| Concern | Problem | Solution |
|---|---|---|
| Double-booking | Two users hold the same seat | Use `UPDATE seats SET status='held', version=version+1 WHERE seatId=? AND version=? AND status='available'`; reject if 0 rows updated |
| Flash sale spike | 1M users hit "on sale" simultaneously | Virtual queue issues metered tokens (e.g. 5000/min); only token holders can create bookings |
| Seat availability reads | Millions poll seating map every second | Serve from Redis cache with 5s TTL; publish invalidation events when seats are held/released |
| Hold expiry | Held seats must be released if payment fails in 10 min | Redis TTL triggers a release job; also a Postgres cron job scans `holdExpiry < NOW()` every 30s |
| Payment failure surge | 30% of holds fail at payment — seats must return quickly | Stripe webhook → release seat within 2s; background reaper as safety net |

### Pitfalls

| Pitfall | Verdict |
|---|---|
| Using application-level locking (in-process mutex) | ❌ Does not work across multiple Booking Service instances |
| Pessimistic locking for the full 10-minute hold | ❌ Locks DB row for 10 minutes — blocks other transactions on same row |
| Showing available seat count from DB on every request | ❌ Too slow at scale — cache in Redis, refresh async |
| No queue for normal events | ✅ Queue adds latency — only enable for events flagged as "high demand" |
| Allowing unlimited seats per booking | ❌ Bot abuse — cap at 8 seats per booking, 1 booking per user per event |

### Locking strategy comparison

| Strategy | Consistency | Throughput | Complexity |
|---|---|---|---|
| Optimistic locking (version counter) | ✅ Strong | ✅ High | Low |
| Pessimistic locking (`SELECT FOR UPDATE`) | ✅ Strong | ❌ Low | Low |
| Redis SETNX distributed lock | ✅ Strong | ✅ High | Medium |
| Application-level check + insert | ❌ Race condition | ✅ High | Low |

> The virtual queue is the architectural difference that separates Ticketmaster-scale systems from naive ones. Without it, 1M simultaneous users all reach the database and either crash it or starve each other out. The queue converts chaos into a controlled, metered flow.

See [../Database/sql-transactions.md](../Database/sql-transactions.md) for optimistic locking patterns, [../Scalability/rate-limiting.md](../Scalability/rate-limiting.md) for token bucket algorithms, and [../BuildingBlocks/message-queues.md](../BuildingBlocks/message-queues.md) for the Kafka confirmation event pipeline.

## Common Follow-up Questions

**Q: How do you prevent bots from buying all tickets instantly?**
A: Layer three controls. First, the queue enforces FIFO with a per-user single position. Second, CAPTCHAs are shown when queue joins spike anomalously. Third, a fraud model checks purchase velocity per device fingerprint and flags bulk buyers for manual review.

**Q: How do you handle the Stripe webhook arriving before the `confirm` API call?**
A: Use idempotency keys on Stripe PaymentIntent creation. Store the `paymentIntentId` on the Booking at creation time. The webhook handler looks up the booking by `paymentIntentId` and confirms it directly, making the `confirm` endpoint a no-op if the webhook already fired.

**Q: What happens if the Booking Service crashes mid-payment?**
A: The hold expiry timer is stored in the database, not in-process. If the service crashes, the hold eventually expires and the seat is released. The user's Stripe payment is captured only after we confirm the booking in DB — so no charge occurs without a confirmed booking.

**Q: How do you support refunds?**
A: Booking status moves to "refunded". Stripe refund is initiated via API. Seats return to "available" status. If the event is cancelled, a batch job refunds all confirmed bookings and sends notifications via Kafka consumer.

**Q: How do you scale the queue service globally?**
A: Each event has its own queue, sharded by `eventId`. Use Redis Sorted Sets (score = join timestamp) for O(log n) position tracking. Each region runs its own queue instance, but token issuance is coordinated through a global Redis cluster to maintain global position fairness.

---
[← Back to InterviewQuestions](../README.md)
