# Child Processes and Worker Threads {#ch-child-processes-and-worker-threads}

> Move CPU-bound work off the main thread, and choose the right mechanism for it.

**In this chapter:** the four ways to spawn · worker threads · pooling workers · `fork` and IPC · cleaning up so you do not leak processes

## 💡 Getting Work Off the Main Thread

Node runs your JavaScript on one thread. Two escape hatches exist, and picking the wrong one is a common interview stumble.

| | **Worker Threads** | **Child Processes** |
| --- | --- | --- |
| **Runs** | JavaScript, same runtime | Any program |
| **Memory** | Same process; can **share** buffers | Fully separate |
| **Startup** | ~1–5 ms | ~30–50 ms |
| **Messaging** | Fast (structured clone / shared memory) | Slower (serialised IPC) |
| **A crash kills** | Just the worker | Just the child |
| **Use for** | CPU work in *your* JS | Running *other programs* |

> **The rule:** CPU-heavy JavaScript → worker thread. Invoking `ffmpeg`, `git`, or a Python script → child process.

---

## The Four Ways to Spawn

| Function     | Shell | Output      | Use for                        |
| ------------ | ----- | ----------- | ------------------------------ |
| `spawn`      | ❌ No | Streamed    | Long output, large files       |
| `execFile`   | ❌ No | Buffered    | Short output, user input       |
| `exec`       | ✅ **Yes** | Buffered | Trusted, fixed commands only |
| `fork`       | ❌ No | Streamed + IPC | A Node script you talk to  |

🔴 **`exec` runs a shell.** Any user-controlled substring can inject a second command with `;` or `|`. See [Security](./06-security.md).

```typescript
exec(`convert ${req.query.file} out.png`);          // 🔴 injectable
execFile("convert", [validated, "out.png"]);        // ✅ no shell
```

⚠️ **`exec` and `execFile` buffer all output in memory** (`maxBuffer`, 1 MB default). Exceed it and the child is killed mid-run. For anything large, use `spawn` and stream.

### `spawn` — the default choice

```typescript
import { spawn } from "node:child_process";

const child = spawn("ffmpeg", ["-i", input, "-vcodec", "h264", output]);

child.stdout.on("data", (chunk: Buffer) => logger.debug(chunk.toString()));
child.stderr.on("data", (chunk: Buffer) => logger.warn(chunk.toString()));

child.on("close", (code) => {
  if (code !== 0) logger.error({ code }, "ffmpeg failed");
});
```

⚠️ **`error` and `close` are different events.** `error` fires when the process couldn't start (binary missing); `close` fires when it ran and exited. Handle both, or a missing binary throws an unhandled error and takes the process down.

### Promise-wrapped, with a timeout

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const { stdout } = await run("git", ["rev-parse", "HEAD"], {
  timeout: 5_000,       // ✅ SIGTERM after 5s — never let a child hang forever
  maxBuffer: 1024 * 1024,
});
```

---

## Worker Threads

For CPU-bound JavaScript, this is nearly always the right tool.

```typescript
// worker.ts
import { parentPort, workerData } from "node:worker_threads";

interface Job { rows: number[] }

const total = (workerData as Job).rows.reduce((a, b) => a + b, 0);
parentPort?.postMessage(total);
```

```typescript
// main.ts
import { Worker } from "node:worker_threads";

function runWorker<T>(file: string, data: unknown, timeoutMs = 30_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(file, { workerData: data });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("Worker timed out"));
    }, timeoutMs);

    worker.on("message", (value: T) => { clearTimeout(timer); resolve(value); });
    worker.on("error", (err) => { clearTimeout(timer); reject(err); });
    worker.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`Worker exited with ${code}`));
    });
  });
}
```

> Always clear the timer in **every** handler. A dangling timer keeps the event loop alive and delays shutdown.

### What crosses the boundary

Messages are **structured-cloned**, not shared. Functions, classes, and closures don't survive.

```typescript
worker.postMessage({ fn: () => 1 });   // ❌ DataCloneError
```

**Real sharing** needs `SharedArrayBuffer` — no copy, at any size:

```typescript
const shared = new SharedArrayBuffer(1024 * 1024);
const view = new Int32Array(shared);

worker.postMessage({ shared });   // both threads see the same memory
Atomics.add(view, 0, 1);          // use Atomics — plain writes race
```

Or **transfer** ownership, which moves a buffer without copying (the sender loses access):

```typescript
worker.postMessage(buffer, [buffer]);   // zero-copy handoff
```

---

## Pool Your Workers

🔴 **Never spawn a worker per request.** Startup cost plus unbounded memory under load is a guaranteed outage.

```typescript
import { Piscina } from "piscina";

const pool = new Piscina({
  filename: new URL("./worker.js", import.meta.url).href,
  maxThreads: 4,          // roughly your core count, not your request rate
});

app.post("/render", async (req, res) => {
  res.json(await pool.run(req.body));
});
```

> Use `piscina` rather than hand-rolling. Queueing, idle timeouts, and worker recycling after a crash are all things you'd otherwise reimplement badly.

⚠️ **More threads than cores makes things slower.** They compete for the same CPUs and add context-switching overhead.

---

## `fork` and IPC

`fork` spawns a **Node** script with a message channel already wired up.

```typescript
// parent
import { fork } from "node:child_process";

const child = fork("./jobs/report.js");
child.send({ type: "start", reportId });
child.on("message", (msg) => logger.info({ msg }, "child update"));

// child
process.on("message", (msg) => {
  process.send?.({ type: "done", result: run(msg) });
});
```

This is the mechanism behind [clustering](./08-clustering.md).

---

## Always Clean Up

An orphaned child keeps running after its parent dies — leaking memory, ports, and CPU.

```typescript
function shutdown(): void {
  child.kill("SIGTERM");                 // ask nicely
  setTimeout(() => child.kill("SIGKILL"), 5_000).unref();  // then insist
}

process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
```

| Signal    | Meaning                     |
| --------- | --------------------------- |
| `SIGTERM` | Please exit — catchable     |
| `SIGKILL` | Immediate, cannot be caught |
| `SIGINT`  | Ctrl-C                      |

---

## Interview Q&A

**Q: Worker thread or child process?**
A: Worker threads for CPU-bound JavaScript — they start faster, communicate faster, and can share memory through `SharedArrayBuffer`. Child processes for running a different program, or when you need genuine isolation so a segfault can't take down the parent. Neither helps with I/O-bound work; that's already non-blocking.

**Q: Does a worker thread give you real parallelism?**
A: Yes. Each worker has its own V8 isolate and event loop and runs on a separate OS thread, so N workers genuinely use N cores. That's the difference from async I/O, which is concurrency on one thread.

**Q: Why is `exec` dangerous?**
A: It runs the command through a shell, so shell metacharacters in user input become new commands — `; rm -rf /` appended to a hostname. `execFile` and `spawn` pass an argument array directly to the OS with no shell, so arguments can never be reinterpreted as commands.

**Q: How do you stop a runaway child process?**
A: Set `timeout` on `exec`/`execFile`, or track it yourself and send `SIGTERM`, escalating to `SIGKILL` after a grace period. Register handlers on parent shutdown too, otherwise children survive as orphans.

**Q: Why does `postMessage` fail on some objects?**
A: It uses the structured clone algorithm, which handles plain data, `Map`, `Set`, `Date`, and typed arrays — but not functions, class instances with methods, or anything holding a closure. Pass plain data and reconstruct behaviour on the other side.

---

## Best Practices

✅ Worker threads for CPU-bound JS; child processes for other programs
✅ Pool workers with `piscina` — never one per request
✅ Cap pool size at roughly your core count
✅ `spawn` for large output; `execFile` when input comes from users
✅ Handle `error` *and* `close`/`exit` on every child
✅ Always set a timeout, and kill orphans on shutdown
❌ Don't pass user input to `exec`
❌ Don't exceed `maxBuffer` — stream instead
❌ Don't expect functions to survive `postMessage`

---

[← Previous: Security](./06-security.md) | [Next: Clustering →](./08-clustering.md)
