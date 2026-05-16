# Message Queues & Event Streaming

## 💡 **Concept**

A message queue decouples producers from consumers. Producers enqueue messages and return immediately. Consumers process messages at their own pace, independently of the producer.

**Use a message queue when:** a slow downstream step (email, video processing, payment) should not block the user-facing response.

---

## Queue vs Pub/Sub vs Event Streaming

| | Message Queue | Pub/Sub | Event Streaming |
|---|---|---|---|
| **Pattern** | Point-to-point | Broadcast | Log-based replay |
| **Consumers** | One consumer per message | All subscribers receive copy | Any consumer, any offset |
| **Ordering** | FIFO per queue | No guarantee | Ordered per partition |
| **Replay** | No | No | Yes (configurable retention) |
| **Example** | SQS, RabbitMQ | SNS, Google Pub/Sub | Kafka, Kinesis |
| **Use case** | Job queue, work distribution | Notifications, fanout | Audit log, event sourcing |

---

## How It Works

```
Producer (API)          Queue                Consumer (Worker)
     │                    │                        │
     │── enqueue ─────────▶│                        │
     │   (returns 201)    │                        │
     │                    │── dequeue ─────────────▶│
     │                    │   (message invisible)   │
     │                    │                        │── process
     │                    │                        │
     │                    │◀── ACK (delete) ────────│ success
     │                    │◀── NACK (retry) ────────│ failure
     │                    │                        │
     │               [3 retries fail]               │
     │                    │                        │
     │           Dead Letter Queue (DLQ)            │
```

**Visibility timeout:** after a consumer dequeues a message, it becomes invisible to other consumers for N seconds. If the consumer crashes without ACKing, the message reappears automatically.

---

## Delivery Guarantees

| Guarantee | Meaning | Risk | Use when |
|---|---|---|---|
| **At-most-once** | Message may be lost | Data loss possible | Metrics, telemetry |
| **At-least-once** | Message delivered ≥1 time | Duplicate processing possible | Most use cases |
| **Exactly-once** | Delivered exactly once | High overhead | Financial transactions |

> Most systems use at-least-once delivery. Make consumers **idempotent** — processing the same message twice should produce the same result.

---

## TypeScript Pattern

```typescript
interface Message<T = unknown> {
  id: string;
  payload: T;
  attemptCount: number;
  enqueuedAt: Date;
}

interface QueueClient {
  enqueue<T>(queueName: string, payload: T): Promise<string>;
  dequeue<T>(queueName: string, visibilityTimeoutMs: number): Promise<Message<T> | null>;
  ack(queueName: string, messageId: string): Promise<void>;
  nack(queueName: string, messageId: string): Promise<void>;
}

// Idempotent consumer pattern
async function processOrder(
  client: QueueClient,
  processedIds: Set<string>
): Promise<void> {
  const msg = await client.dequeue<{ orderId: string }>('orders', 30_000);
  if (!msg) return;

  if (processedIds.has(msg.id)) {
    await client.ack('orders', msg.id); // already handled
    return;
  }

  try {
    await fulfillOrder(msg.payload.orderId);
    processedIds.add(msg.id);
    await client.ack('orders', msg.id);
  } catch (err) {
    await client.nack('orders', msg.id); // retry or DLQ after max attempts
  }
}
```

---

## Tool Comparison

| | Kafka | RabbitMQ | AWS SQS | AWS SNS |
|---|---|---|---|---|
| **Type** | Event streaming | Message broker | Managed queue | Managed pub/sub |
| **Ordering** | Per partition | Per queue | Best-effort (FIFO queue: yes) | No |
| **Throughput** | Millions/sec | 20k–50k/sec | ~3k/sec standard | Very high |
| **Replay** | Yes (retention period) | No | No | No |
| **Consumer model** | Pull (consumer groups) | Push + Pull | Pull | Push |
| **Best for** | Event sourcing, analytics | Complex routing, RPC | Simple job queues | Fan-out to many services |

---

## Consumer Groups & Back-Pressure

**Consumer groups (Kafka):** multiple consumers share a topic's partitions. Each partition goes to exactly one consumer in the group. Scale consumers by adding group members — up to the number of partitions.

**Back-pressure:** when consumers fall behind, the queue grows. Solutions:
- Scale out consumers (add workers)
- Increase worker concurrency
- Rate-limit the producer
- Add circuit breaker to producer

---

## Dead Letter Queue (DLQ)

Messages that fail after N retries go to a DLQ. This prevents a poison message from blocking the queue forever.

```typescript
interface DLQConfig {
  maxReceiveCount: number;   // retries before DLQ routing
  dlqName: string;
}

// Alert when DLQ has messages
async function monitorDLQ(client: QueueClient, dlqName: string): Promise<void> {
  const msg = await client.dequeue(dlqName, 5_000);
  if (msg) {
    await alertOncall(`DLQ ${dlqName} has failed messages: ${msg.id}`);
  }
}
```

---

## When to Use

| Scenario | Pattern |
|---|---|
| Slow background job (email, PDF, video) | Queue + worker pool |
| Notify multiple services of one event | Pub/Sub (SNS → SQS) |
| Event sourcing / audit log | Kafka with retention |
| Rate mismatch (API: 50k RPS, DB: 5k RPS) | Queue as buffer |
| Retry on downstream failure | Queue with DLQ |

---

## Common Mistakes

❌ **Non-idempotent consumers** — at-least-once delivery causes duplicates. Always deduplicate on the consumer side.

❌ **Ignoring the DLQ** — failed messages silently accumulate. Alert when DLQ depth > 0.

❌ **Visibility timeout shorter than processing time** — message reappears and gets processed twice. Set timeout to 2× the expected processing time.

❌ **One partition in Kafka** — no parallelism. Partition count = max consumer parallelism.

✅ **Use message IDs as idempotency keys** — store processed IDs in Redis with TTL matching your processing window.

---

## Real-World Example

An e-commerce platform receives 500 orders/minute during a flash sale. The order API enqueues each order to SQS and returns 201 immediately. A pool of 20 worker processes dequeues messages, validates inventory, charges payment, and triggers shipping — each step taking 2–5 seconds. If payment fails, the message retries 3 times then lands in a DLQ, which pages on-call. No customer waits more than 200ms for the API response.

---

## Key Insight

> The queue is not just an async buffer — it is your system's shock absorber. It lets you scale consumers independently, survive downstream failures, and replay events without touching the producer.

**Related:** [Async Processing](../Scalability/07-async-processing.md) · [Notifications](./08-notifications.md)

---

[← Back to SystemDesign](../README.md)
