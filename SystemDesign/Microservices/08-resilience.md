# Resilience Patterns

## 💡 **In a distributed system, failures are not exceptional — they are expected. Design for them.**

A service that handles 99.9% uptime still fails once every ~8.7 hours. When you have 50 services, one is failing at any given moment. Resilience patterns limit the blast radius.

---

## The Core Problem: Cascade Failures

When Service A calls Service B and B is slow, A's threads pile up waiting. A runs out of threads. A stops responding. Service C, which calls A, now piles up threads. C stops responding. The failure spreads upstream through every caller.

```
Payment Service (slow)
    ↑ threads pile up
Order Service (degraded)
    ↑ threads pile up
API Gateway (unresponsive)
    ↑
All users see 503
```

Resilience patterns break this cascade.

---

## Pattern Comparison

| Pattern               | What It Prevents                     | When to Use                                    |
| --------------------- | ------------------------------------ | ---------------------------------------------- |
| **Circuit Breaker**   | Cascade failures from slow services  | Every synchronous service call                 |
| **Retry + Backoff**   | Transient network errors             | Idempotent operations, brief outages           |
| **Bulkhead**          | One service killing all thread pools | Services with very different traffic patterns  |
| **Timeout**           | Indefinite blocking on slow calls    | Every external call — always set a timeout     |

---

## Circuit Breaker

A circuit breaker wraps a service call. It tracks failure rates. When failures exceed a threshold, it **opens** — calls fail immediately without hitting the downstream service. After a wait period, it allows a test call through. If it succeeds, it closes again.

```
CLOSED → tracks errors → error threshold exceeded → OPEN
OPEN → fail immediately (no downstream call) → wait → HALF-OPEN
HALF-OPEN → test one call → success → CLOSED / failure → OPEN
```

```typescript
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
  failureThreshold: number;    // open after this many consecutive failures
  successThreshold: number;    // close after this many consecutive successes in HALF_OPEN
  timeout: number;             // ms to wait in OPEN before trying HALF_OPEN
  callTimeout: number;         // ms before a single call is considered failed
}

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < this.config.timeout) {
        throw new Error(`Circuit ${this.name} is OPEN — failing fast`);
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await this.withTimeout(fn, this.config.callTimeout);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = "CLOSED";
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (
      this.state === "HALF_OPEN" ||
      this.failureCount >= this.config.failureThreshold
    ) {
      this.state = "OPEN";
      this.failureCount = 0;
      this.successCount = 0;
    }
  }

  private withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Call timed out after ${ms}ms`)), ms)
      ),
    ]);
  }
}

// Usage in Order Service calling Inventory Service
const inventoryCircuit = new CircuitBreaker("inventory-service", {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30_000,   // wait 30s in OPEN state
  callTimeout: 3_000, // each call must complete in 3s
});

async function checkStock(productId: string): Promise<number> {
  return inventoryCircuit.call(() =>
    inventoryClient.getStock(productId)
  );
}
```

---

## Retry with Exponential Backoff

Retrying immediately after a failure often hits the service while it is still overwhelmed. **Exponential backoff** adds increasing delays between retries. **Jitter** randomizes the delay to prevent thundering herd.

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;    // initial delay
  maxDelayMs: number;     // cap on delay growth
  retryOn?: (error: Error) => boolean; // only retry on specific errors
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const shouldRetry = config.retryOn ? config.retryOn(lastError) : true;
      if (!shouldRetry || attempt === config.maxAttempts) throw lastError;

      const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * config.baseDelayMs; // prevents thundering herd
      const delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Only retry on network errors, not on 400 Bad Request
const result = await withRetry(
  () => inventoryClient.reserve(orderId),
  {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 5_000,
    retryOn: (err) => err.message.includes("ECONNREFUSED") || err.message.includes("timeout"),
  }
);
```

---

## Bulkhead Pattern

A **bulkhead** isolates thread pools (or connection pools) by service. When one downstream service is slow, it consumes only its own thread pool — leaving other service calls unaffected.

```typescript
class BulkheadPool {
  private activeCount = 0;

  constructor(
    private readonly name: string,
    private readonly maxConcurrent: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      throw new Error(`Bulkhead ${this.name} is full (${this.maxConcurrent} concurrent calls)`);
    }

    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
    }
  }
}

// Inventory calls get their own pool — a slow inventory service
// cannot starve payment service calls
const inventoryPool = new BulkheadPool("inventory", 10);
const paymentPool = new BulkheadPool("payment", 20);

async function placeOrder(order: Order): Promise<void> {
  // These pools are independent — exhausting one does not affect the other
  const [stockResult, paymentResult] = await Promise.all([
    inventoryPool.execute(() => inventoryService.reserve(order)),
    paymentPool.execute(() => paymentService.charge(order)),
  ]);
}
```

---

## Timeout Configuration

**Every external call must have a timeout.** No exceptions. The default for most HTTP clients is no timeout — meaning a slow service can block your thread indefinitely.

```typescript
// Always set a timeout. The specific value depends on your SLA.
const response = await fetch(upstreamUrl, {
  signal: AbortSignal.timeout(3_000), // 3 seconds — fail fast
});
```

**Guidelines:**

- ✅ Set timeouts at the **gateway** (e.g. 10s for client-facing requests)
- ✅ Set **shorter timeouts** on internal service calls than on client-facing calls
- ✅ Make the timeout **shorter than the caller's timeout** — otherwise the caller times out first, but downstream work continues wasting resources

---

## Combining Patterns

In production, these patterns layer together.

```typescript
// Timeout → Bulkhead → Circuit Breaker → Retry
// Outermost: the bulkhead limits concurrency
// Inside: circuit breaker tracks failures and fast-fails
// Inside: each call has a timeout
// Inside: transient failures trigger retries

async function resilientInventoryCall(orderId: string): Promise<InventoryResult> {
  return inventoryBulkhead.execute(() =>
    inventoryCircuit.call(() =>
      withRetry(
        () => inventoryClient.reserve(orderId), // 3s timeout inside inventoryClient
        { maxAttempts: 2, baseDelayMs: 50, maxDelayMs: 500 }
      )
    )
  );
}
```

---

## Common Mistakes

**❌ Retrying non-idempotent operations**

```typescript
// POST /orders — creates a new order
// Retrying this creates duplicate orders
await withRetry(() => orderService.createOrder(order), { maxAttempts: 3 });
```

**✅ Only retry idempotent operations (GET, PUT with the same payload). Use an idempotency key for POST retries.**

---

**❌ Circuit breaker threshold too sensitive**

```typescript
failureThreshold: 1 // Opens after just 1 failure
// Every brief network blip opens the circuit. Users see constant degradation.
```

**✅ Set thresholds based on measured baseline failure rates. 5 failures in 10 seconds is a reasonable starting point.**

---

**❌ No fallback when circuit is open**

```typescript
// Circuit open → throw error → user sees 500
throw new Error("Circuit OPEN");
```

**✅ Return a cached response, a default value, or a graceful degraded result.**

```typescript
try {
  return await inventoryCircuit.call(() => inventoryService.getStock(productId));
} catch {
  return { available: true, count: null }; // Show "In Stock" optimistically — better than error page
}
```

---

## Key Insight

> Use circuit breakers to prevent cascade failures. A circuit breaker that opens fast and fails gracefully keeps the rest of your system running. A missing circuit breaker turns one slow service into a full system outage.

---

[← Monitoring](./07-monitoring.md) | [Back to Microservices](./README.md)
