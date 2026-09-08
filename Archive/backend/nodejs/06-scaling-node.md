---
title: Scaling a Node Process
part: 5
chapter: 0
slug: scaling-node
level: advanced
reading_time: 9
updated: 2026-09-01
tags: [nodejs, cluster, worker-threads, scaling, deployment]
in_book: true
---

# Scaling a Node Process {#ch-scaling-node}

> Use every core without pretending your process is stateless, and pick the right off-thread tool for the work.

**In this chapter:** worker threads against child processes · pooling workers · the cluster module · what breaks when you fork · cluster or container replicas

## 💡 The Core Idea

One Node process uses one core for JavaScript. A 16-core machine running a single process leaves
fifteen cores idle. There are two ways to use them, and they solve different problems.

**Worker threads** move **CPU work** off the main thread inside one process. They share memory
cheaply and start in a few milliseconds.

**Cluster or container replicas** run **many copies of the whole server**, each accepting
connections. This is how you scale throughput.

The mistake is reaching for the second when the problem is the first. Four replicas of a server
that blocks for 300 ms per request still block for 300 ms per request — you have four blocked
event loops instead of one.

## How It Works

### Choosing an off-thread mechanism

| Tool | Use for | Cost | Data transfer |
| ---- | ------- | ---- | ------------- |
| `worker_threads` | CPU-bound JavaScript — parsing, hashing, image work | ~2 ms start, ~5 MB | Structured clone, or `SharedArrayBuffer` with zero copy |
| `child_process.spawn` | An external binary — `ffmpeg`, `pdftk` | ~30 ms start | Streams over stdio |
| `child_process.fork` | Another Node script needing isolation | ~30 ms start, full V8 | JSON over IPC |
| `cluster` | More concurrent requests | One full process per worker | Shared listening socket |

> ⚠️ `child_process.exec` runs its argument through a shell. Any user-controlled value in that
> string is a command injection. Use `spawn` with an argument array — the shell is never involved.

**`spawn` with an argument array:**

```typescript
const proc = spawn('ffmpeg', ['-i', inputPath, '-vf', 'scale=640:-1', outputPath]);
proc.stderr.on('data', (d: Buffer): void => log.debug(d.toString()));
const code: number = await once(proc, 'close').then(([c]) => c as number);
```

### Worker threads

```typescript
// hash.worker.ts — receives a job, returns a result, exits when told.
import { parentPort } from 'node:worker_threads';

parentPort?.on('message', (payload: string): void => {
  parentPort?.postMessage(createHash('sha256').update(payload).digest('hex'));
});
```

```typescript
// The caller. Note the timeout — a worker can hang on bad input.
function hashInWorker(payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./hash.worker.js', import.meta.url));
    const timer = setTimeout((): void => {
      void worker.terminate();
      reject(new Error('worker timeout'));
    }, 5_000);

    worker.once('message', (digest: string): void => {
      clearTimeout(timer);
      resolve(digest);
      void worker.terminate(); // Always terminate, or the process never exits.
    });
    worker.once('error', reject);
    worker.postMessage(payload);
  });
}
```

**Pool them.** Spawning a worker per request costs more than the work for anything under ~50 ms,
and 200 concurrent requests means 200 threads and a gigabyte of memory. Node ships
`AsyncResource`-friendly pooling in `piscina`; the shape is a fixed set of workers and a queue of
jobs, sized to `availableParallelism() - 1`.

### The cluster module

One primary process binds the port and hands accepted connections to workers.

```typescript
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';

if (cluster.isPrimary) {
  for (let i = 0; i < availableParallelism(); i++) cluster.fork();

  cluster.on('exit', (worker, code, signal): void => {
    log.warn({ pid: worker.process.pid, code, signal }, 'worker died');
    cluster.fork(); // Replace it, or capacity decays with every crash.
  });
} else {
  startServer();
}
```

### What breaks when you fork

Every worker is a separate process with separate memory. Anything you kept in a variable is now
per-worker and inconsistent.

| Breaks | Why | Fix |
| ------ | --- | --- |
| In-memory sessions | Request 2 lands on another worker | Redis, or a signed cookie |
| In-memory rate limit counters | Each worker counts a fraction | Shared counter in Redis |
| In-memory cache | N caches, N stampedes, N× memory | Shared cache, or accept per-worker |
| `setInterval` cron jobs | Runs N times per tick | One scheduler, or a lock |
| WebSocket rooms | A broadcast reaches one worker's clients | Redis pub/sub adapter |

This is the real content of the topic. The `cluster.fork()` call is four lines; the state audit
is the work.

### Zero-downtime restarts

Because workers are independent, you can replace them one at a time. Each worker must stop
accepting connections, finish in-flight requests, then exit.

```typescript
process.on('SIGTERM', (): void => {
  server.close((): void => process.exit(0));            // Stop accepting, drain.
  setTimeout((): void => process.exit(1), 15_000).unref(); // Backstop for a stuck request.
});
```

The primary then forks a replacement, waits for its `'listening'` event, and only then signals
the next worker. A process manager such as PM2 implements this loop; so does a container
orchestrator's rolling update.

## When to Use It

| Situation | Choose |
| --------- | ------ |
| Occasional CPU-heavy request, containerised deployment | Worker thread pool, one process per container |
| Bare metal or a VM with many cores | `cluster`, or PM2 in cluster mode |
| Kubernetes or a serverless platform | Container replicas — the platform already does this |
| Long-running background jobs | A separate worker service with a queue, not the web process |

Under an orchestrator, clustering inside the container is usually redundant and makes resource
limits harder to reason about: one process per container gives per-instance metrics, independent
restarts, and CPU limits the scheduler can honour. Cluster earns its place when you own the host.

## Common Mistakes

**❌ Not replacing dead workers.** Without the `'exit'` handler, capacity silently halves after a
few crashes and the service looks merely "a bit slow".

**❌ Forking more workers than cores.** They contend for the same CPUs and add context switching.
`availableParallelism()` respects container CPU limits; `os.cpus().length` does not.

**❌ Leaving workers running.** A worker thread or child process that is never terminated keeps
the event loop alive and the container never exits.

**❌ Doing CPU work in the cluster primary.** The primary distributes connections; block it and
every worker starves.

## 🔑 Key Takeaways

- Worker threads fix blocking; replicas fix throughput. They are not substitutes.
- Pool workers — one per request costs more than the work for short jobs.
- Forking turns every in-memory piece of state into a correctness bug; audit sessions, counters, caches and cron.
- Always replace a dead worker and always drain on `SIGTERM`.
- Under an orchestrator, prefer one process per container over clustering inside it.

## Interview Questions

**Q: Worker threads or cluster — how do you choose?**

By what is saturated. If the event loop is blocked by your own CPU work, a worker thread moves
that work off the loop and one process is still enough. If the loop is idle and you simply have
more requests than one core can serve, add processes. Adding processes to a blocking handler just
multiplies the blocked loops.

**Q: What breaks when you turn on clustering in an app that worked fine as one process?**

Anything held in memory. Sessions stop resolving because the second request lands on a different
worker, rate limits under-count by a factor of N, in-memory caches multiply, `setInterval` jobs
run once per worker, and WebSocket broadcasts reach only the clients on one worker. The fix is to
move that state to Redis or a database.

**Q: Why `availableParallelism()` rather than `os.cpus().length`?**

`os.cpus()` reports the host's cores, so in a container limited to 0.5 CPU it might report 64 and
you would fork 64 workers onto half a core. `availableParallelism()` accounts for the cgroup
limit and returns a number you can actually use.

## What to Read Next

- [Chapter ?? — Node.js Performance](#ch-nodejs-performance) — measuring before you add processes
- [Chapter ?? — The Event Loop and Async Node](#ch-event-loop-async) — what "blocking" actually means
- [Chapter ?? — Redis](#ch-redis) — where the state that cannot stay in memory goes
