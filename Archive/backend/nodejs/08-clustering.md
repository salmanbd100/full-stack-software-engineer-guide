---
title: Clustering and Scaling
part: 5
chapter: 0
slug: clustering
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-08-28
tags: [backend, nodejs, clustering]
in_book: true
---

# Clustering and Scaling {#ch-clustering-and-scaling}

> Use every core on the box, and know what breaks the moment there is more than one process.

**In this chapter:** the cluster module · what forking breaks — sessions, caches, timers · zero-downtime restarts · PM2 · cluster vs container replicas

## 💡 One Process Uses One Core

A Node process runs your JavaScript on a single thread. On an 8-core machine, a single process leaves 7 cores idle.

**Clustering** forks one worker per core. They all share a listening port, so the OS spreads incoming connections across them.

```text
                  ┌── worker (core 1)
Port 3000 ────────┼── worker (core 2)
  primary         ├── worker (core 3)
                  └── worker (core 4)
```

> ⚠️ **Clustering multiplies throughput, not speed.** One slow request is exactly as slow with 8 workers. It buys you *concurrency* across cores, and only helps when you're CPU-bound.

---

## The Cluster Module

```typescript
import cluster from "node:cluster";
import { availableParallelism } from "node:os";

if (cluster.isPrimary) {
  const count = availableParallelism();       // ✅ container-aware, unlike cpus().length
  for (let i = 0; i < count; i++) cluster.fork();

  cluster.on("exit", (worker, code, signal) => {
    logger.warn({ pid: worker.process.pid, code, signal }, "worker died");
    if (!worker.exitedAfterDisconnect) cluster.fork();   // don't respawn during shutdown
  });
} else {
  startServer();                               // each worker is a full app instance
}
```

⚠️ **Use `availableParallelism()`, not `os.cpus().length`.** In a container limited to 2 CPUs, `cpus()` still reports the host's 64 — so you'd fork 64 workers that fight over 2 cores.

⚠️ **The `exitedAfterDisconnect` check matters.** Without it, a deliberate shutdown triggers respawns and the process never exits.

🔴 **A worker that crash-loops respawns forever.** Add a backoff and a circuit breaker, or a bad deploy becomes a fork bomb.

---

## What Breaks When You Fork

Workers are **separate processes**. Nothing in memory is shared. Code that quietly worked with one process now misbehaves.

| Broken | Why | Fix |
| --- | --- | --- |
| In-memory sessions | Worker 2 doesn't have worker 1's login | Redis session store |
| In-memory cache | Each worker has its own copy | Redis |
| Rate limit counters | Limit becomes N × your limit | Redis store |
| `setInterval` cron | Runs N times | Elect one worker, or a real scheduler |
| WebSockets | Broadcast reaches one worker's clients | Redis pub/sub adapter |

```typescript
// ❌ Every worker runs this — 4 workers means 4 emails per user
setInterval(sendDigestEmails, 60 * 60_000);

// ✅ Only the first worker
if (cluster.worker?.id === 1) setInterval(sendDigestEmails, 60 * 60_000);
```

> ✨ Better still: move scheduled work out of the web process entirely, into a dedicated job runner.

---

## Zero-Downtime Restarts

Restart workers one at a time so the service never fully drops.

```typescript
async function rollingRestart(): Promise<void> {
  for (const worker of Object.values(cluster.workers ?? {})) {
    if (!worker) continue;

    await new Promise<void>((resolve) => {
      worker.disconnect();                      // stop taking new connections
      worker.once("exit", () => {
        cluster.fork().once("listening", () => resolve());  // wait for the replacement
      });
      setTimeout(() => worker.kill("SIGKILL"), 10_000).unref();
    });
  }
}
```

Each worker also needs to drain properly:

```typescript
process.on("SIGTERM", async () => {
  server.close();                          // finish in-flight requests
  await Promise.allSettled([db.close(), redis.quit()]);
  process.exit(0);
});
```

⚠️ Without `server.close()` and a drain step, in-flight requests are severed mid-response on every deploy.

---

## PM2

In practice most teams use PM2 rather than writing the primary process themselves.

`ecosystem.json`:

```json
{
  "apps": [
    {
      "name": "api",
      "script": "./dist/server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "max_memory_restart": "500M",
      "kill_timeout": 10000
    }
  ]
}
```

| Setting | Why it matters |
| --- | --- |
| `instances: "max"` | One worker per core |
| `exec_mode: "cluster"` | Share the port; `fork` mode doesn't |
| `max_memory_restart` | Recycles a worker that's leaking |
| `kill_timeout` | Grace period to drain before `SIGKILL` |

```bash
pm2 start ecosystem.json
pm2 reload api      # ✅ zero-downtime rolling restart
pm2 restart api     # ❌ kills everything at once
```

> `reload` and `restart` differ in exactly the way that matters during a deploy.

---

## Cluster or Container Replicas?

If you already run Kubernetes, clustering is often redundant — the orchestrator restarts and load-balances for you.

| | **Cluster in one container** | **N single-process containers** |
| --- | --- | --- |
| **Restart on crash** | You write it | Orchestrator handles it |
| **Scaling unit** | Whole machine | One process |
| **Rollout control** | Manual | Built in |
| **Memory** | Lower (shared base) | Higher per replica |
| **Fits** | VMs, bare metal, PM2 | Kubernetes, ECS, Cloud Run |

> **Common answer:** one process per container, sized to one CPU, and scale with replicas. Reach for `cluster` on a big VM where you'd otherwise waste cores.

---

## Beyond One Machine

Clustering ends at the machine boundary. Past that you need **stateless** application servers.

```text
        ┌── load balancer ──┐
        ▼         ▼         ▼
     server    server    server        ← no local state
        └─────────┼─────────┘
              Redis + DB                ← all shared state lives here
```

**Stateless means:** no in-memory sessions, no local file uploads (use S3), no sticky-session requirement, no local cache assumed authoritative.

**When you genuinely need sticky sessions** — WebSockets being the main case — prefer a Redis adapter so any node can serve any client:

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
io.adapter(createAdapter(pubClient, subClient));   // broadcasts reach every node
```

---

## Interview Q&A

**Q: When does clustering not help?**
A: When you're I/O-bound. If workers spend their time waiting on the database, adding workers just adds database connections — the bottleneck moves, it doesn't shrink. Check event loop delay first: low delay with slow responses means the problem is downstream, and clustering won't touch it.

**Q: How are connections distributed across workers?**
A: By default the primary accepts and distributes round-robin (on every platform except Windows). The alternative is letting all workers accept on the shared socket, which the OS balances — faster, but unevenly, because a worker that's already busy can still win the race.

**Q: What breaks when you move from one process to four?**
A: Everything relying on shared memory. Sessions, caches, and rate-limit counters silently become per-worker — a 100/min limit becomes 400/min. Scheduled timers fire once per worker. The fix is to externalise state into Redis and pull scheduling out of the web process.

**Q: How do you deploy without dropping requests?**
A: Rolling restart. Take one worker out, wait for its in-flight requests to finish via `server.close()`, start its replacement, wait for it to listen, then move to the next. `pm2 reload` does this; `pm2 restart` does not. A hard kill timeout stops one stuck connection from blocking the rollout.

**Q: Cluster module or Kubernetes replicas?**
A: If you have an orchestrator, prefer one process per container — you get restarts, health checks, and rolling deploys for free, and the scaling unit is finer-grained. The cluster module earns its place on a single large VM where replicas aren't an option and you'd otherwise leave cores idle.

---

## Best Practices

✅ Size the pool with `availableParallelism()`, not `os.cpus().length`
✅ Respawn dead workers — with backoff to survive crash loops
✅ Externalise sessions, caches, and rate limits to Redis
✅ Run scheduled jobs in one place, not in every worker
✅ Drain with `server.close()` before exit; use `pm2 reload` to deploy
✅ Prefer one process per container when you have an orchestrator
❌ Don't cluster to fix I/O-bound slowness
❌ Don't assume in-memory state is shared
❌ Don't fork more workers than you have cores

---

[← Previous: Child Processes](./07-child-processes.md) | [Back to NodeJS](./README.md)
