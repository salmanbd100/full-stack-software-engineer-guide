# Asynchronous Processing

## 💡 **Concept**

Async processing moves slow or non-critical work out of the user-facing request path. Instead of making the user wait for a 3-second email send or a 30-second video transcode, the API returns immediately and a background worker does the heavy lifting.

**Use async processing when:** an operation takes > 200ms, is not critical to the immediate user response, or needs to survive downstream failures.

---

## Sync vs Async

| | Synchronous | Asynchronous |
|---|---|---|
| **User waits for** | Full operation | Only job queuing (~5ms) |
| **API response time** | Operation duration (200ms–30s) | < 50ms (always) |
| **Failure handling** | User sees error immediately | Retry in background, no user impact |
| **Scale** | Throughput limited by operation speed | Throughput limited by queue capacity |
| **Complexity** | Low | Medium (queue, workers, polling/webhooks) |
| **Best for** | Fast reads, critical synchronous ops | Emails, reports, video processing, notifications |

---

## Task Queue Architecture

```
User Request
  │
  ▼
API Server
  │── Enqueue job (5ms) → Message Queue
  │── Return 202 Accepted + jobId
  │
  ▼
User gets response immediately

(background)
Queue → Worker Pool → Process job → Update DB status
                                 → Notify user (webhook/push/email)
```

```typescript
interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  status: "pending" | "processing" | "done" | "failed";
  createdAt: Date;
  attempts: number;
}

interface JobQueue {
  enqueue<T>(type: string, payload: T): Promise<string>; // returns jobId
  dequeue<T>(type: string): Promise<Job<T> | null>;
  complete(jobId: string): Promise<void>;
  fail(jobId: string, error: string): Promise<void>;
}

// API endpoint — enqueue and return immediately
async function submitReport(
  queue: JobQueue,
  db: DatabaseClient,
  userId: string,
  reportConfig: ReportConfig
): Promise<{ jobId: string; status: string }> {
  const jobId = await queue.enqueue("generate_report", { userId, reportConfig });

  await db.query(
    "INSERT INTO jobs (id, user_id, type, status) VALUES ($1, $2, $3, $4)",
    [jobId, userId, "generate_report", "pending"]
  );

  return { jobId, status: "pending" };
}
```

---

## Idempotent Workers

Workers must be idempotent — processing the same job twice must produce the same result. At-least-once delivery means duplicates can happen.

```typescript
interface ReportJob {
  userId: string;
  reportConfig: ReportConfig;
}

async function processReportJob(
  queue: JobQueue,
  db: DatabaseClient,
  storage: StorageClient,
  job: Job<ReportJob>
): Promise<void> {
  // Check if already processed (idempotency check)
  const existing = await db.query(
    "SELECT file_key FROM reports WHERE job_id = $1",
    [job.id]
  );
  if (existing.rows.length > 0) {
    await queue.complete(job.id); // already done — just ACK
    return;
  }

  try {
    const report = await generateReport(job.payload.reportConfig);
    const fileKey = await storage.upload(`reports/${job.id}.pdf`, report);

    await db.query(
      "UPDATE jobs SET status = $1, file_key = $2 WHERE id = $3",
      ["done", fileKey, job.id]
    );

    await queue.complete(job.id);
  } catch (err) {
    await queue.fail(job.id, String(err));
  }
}
```

---

## Saga Pattern

For workflows spanning multiple services where each step can fail, use a saga: a sequence of local transactions with compensating actions if a step fails.

```typescript
type SagaStep<T> = {
  execute: (ctx: T) => Promise<T>;
  compensate: (ctx: T) => Promise<void>; // rollback if later step fails
};

async function runSaga<T>(steps: SagaStep<T>[], initialCtx: T): Promise<T> {
  const completed: SagaStep<T>[] = [];
  let ctx = initialCtx;

  for (const step of steps) {
    try {
      ctx = await step.execute(ctx);
      completed.push(step);
    } catch (err) {
      // Compensate in reverse order
      for (const done of completed.reverse()) {
        await done.compensate(ctx).catch(() => {}); // best effort
      }
      throw err;
    }
  }

  return ctx;
}

// Order processing saga:
// 1. Reserve inventory → compensate: release inventory
// 2. Charge payment   → compensate: refund payment
// 3. Create shipment  → compensate: cancel shipment
```

---

## Back-Pressure

When producers enqueue faster than workers consume, the queue grows. Uncontrolled growth leads to memory exhaustion or massive processing delays.

**Strategies:**

| Strategy | How | Trade-off |
|---|---|---|
| **Scale workers** | Add more consumer instances | Cost |
| **Rate-limit producers** | Throttle enqueue rate | Slower user response |
| **Circuit breaker** | Pause enqueuing when queue depth > threshold | Job loss risk |
| **Priority queues** | Critical jobs process first | Low-priority jobs may starve |

```typescript
interface QueueMetrics {
  depth: number;
  processingRate: number; // jobs/sec
  enqueueRate: number;    // jobs/sec
}

function isBackPressured(metrics: QueueMetrics): boolean {
  return metrics.depth > 10_000 || metrics.enqueueRate > metrics.processingRate * 1.5;
}
```

---

## Rate Limiting Workers

Protect downstream services (APIs, databases) from worker floods:

```typescript
interface RateLimiter {
  acquire(): Promise<void>; // blocks until rate limit allows
}

async function workerLoop(
  queue: JobQueue,
  rateLimiter: RateLimiter
): Promise<void> {
  while (true) {
    const job = await queue.dequeue("send_email");
    if (!job) {
      await new Promise(r => setTimeout(r, 1_000)); // idle wait
      continue;
    }

    await rateLimiter.acquire(); // e.g., 100 emails/sec max
    await processEmailJob(job);
  }
}
```

---

## When to Use

| Scenario | Pattern |
|---|---|
| Send email / SMS | Enqueue + worker |
| Generate PDF report | Enqueue + worker + poll endpoint |
| Video transcoding | Enqueue + worker + webhook callback |
| Fan-out notifications (1M users) | Queue + worker pool with fan-out |
| Distributed transaction (order + payment + inventory) | Saga pattern |
| Rate-mismatch (API: 50k/s, DB: 5k/s) | Queue as buffer |

---

## Common Mistakes

❌ **Non-idempotent workers** — at-least-once delivery causes duplicate effects. Always check before processing.

❌ **No status endpoint** — users submit a job and have no way to know if it succeeded. Expose a job status endpoint.

❌ **Infinite retries** — a poison message loops forever and blocks the queue. Set max retries (3–5) then route to DLQ.

✅ **Separate queues per job type** — mixing fast (email) and slow (video) jobs in one queue means slow jobs block fast ones.

---

## Real-World Example

An analytics platform allows users to export large datasets (up to 10M rows) as CSV. The export API enqueues a job and returns a 202 with a `jobId`. The client polls `/jobs/{jobId}` every 5 seconds. A worker pool (auto-scaled to 20 instances) processes export jobs with an idempotency check — if the job already has a file key in the DB, it skips processing and marks it done. Generated files are uploaded to S3; the status endpoint returns a pre-signed download URL when complete. Average export time: 45 seconds for 10M rows.

---

## Key Insight

> Async processing is a reliability pattern, not just a performance trick. It decouples your API response time from your operation completion time. Users get fast responses; the system gets time to do the work right.

**Related:** [Message Queues](../BuildingBlocks/05-message-queues.md) · [Notifications](../BuildingBlocks/08-notifications.md)

---

[← Back to SystemDesign](../README.md)
