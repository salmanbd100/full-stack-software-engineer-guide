---
title: Web Workers and the Main Thread
part: 2
chapter: 12
slug: web-workers
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-23
tags: [web-workers, performance, inp, concurrency, browser-apis]
in_book: true
---

# Web Workers and the Main Thread {#ch-web-workers}

> Move the work that blocks input off the thread that handles it, and know what it costs to send data across.

**In this chapter:** what actually blocks · the worker model · structured clone and transferables · Comlink · when a worker is the wrong answer · the INP connection

## 💡 The Core Idea

The main thread does three jobs: run your JavaScript, calculate layout and paint, and respond to input.
It does them one at a time. A function that runs for 300 milliseconds is 300 milliseconds in which a tap
does nothing, an animation holds a frame, and the page looks broken — because it is.

A worker is a second thread with its own JavaScript engine and no access to the DOM. You send it a
message, it does the work, it sends a result back. The main thread stays free for the two jobs only it
can do: rendering, and responding to the user.

> Workers do not make anything faster. They make the expensive thing happen somewhere that nobody is
> waiting on.

## How It Works

A worker is a separate script with a separate global scope. Nothing is shared except what you send.

**Starting one and talking to it:**

```typescript
// The module worker form — `type: "module"` allows `import` inside the worker.
const worker = new Worker(new URL("./parse.worker.ts", import.meta.url), { type: "module" });

worker.postMessage({ csv: rawText });

worker.onmessage = (event: MessageEvent<{ rows: number }>) => {
  render(event.data.rows);
};
```

```typescript
// parse.worker.ts — no `window`, no `document`, no DOM.
self.onmessage = (event: MessageEvent<{ csv: string }>) => {
  const rows: number = parseCsv(event.data.csv); // Takes 400ms. Nobody is blocked by it.
  self.postMessage({ rows });
};
```

### What crossing the boundary costs

Messages are copied, not shared, using the **structured clone algorithm**. That copy is real work on
both sides and it happens on the main thread, so sending a 50 MB array to a worker can cost more than
the calculation you moved.

| Mechanism | Cost | Use when |
| --------- | ---- | -------- |
| `postMessage(object)` | Full structured clone, both sides | Small messages — parameters and results |
| Transferables (`ArrayBuffer`, `ImageBitmap`) | Near zero; ownership moves | Large binary payloads |
| `SharedArrayBuffer` | Zero copy, genuinely shared memory | Heavy numeric work, and only with the right COOP/COEP headers |

**Transferring instead of copying:**

```typescript
// The second argument lists what to transfer. `buffer` is unusable here afterwards.
worker.postMessage({ buffer }, [buffer]);
```

Structured clone handles most things — objects, arrays, `Map`, `Set`, `Date`, `ArrayBuffer`, even cyclic
references. It cannot handle functions, class identity, or DOM nodes. A class instance arrives as a
plain object with its methods gone, which is the failure people hit first.

### Making it bearable

Raw `postMessage` turns a function call into a protocol: an id, a message type, a listener, a map of
pending promises. Comlink wraps that in a proxy so the worker looks like an async module.

```typescript
import * as Comlink from "comlink";

// The worker's exported API, callable as if it were local.
const api = Comlink.wrap<{ parseCsv(csv: string): number }>(
  new Worker(new URL("./parse.worker.ts", import.meta.url), { type: "module" }),
);

const rows: number = await api.parseCsv(rawText);
```

## When to Use It

The test is not "is this slow" but **"does this block a frame, and can it leave the DOM behind"**.

| Work | Worker? | Why |
| ---- | ------- | --- |
| Parsing a large CSV, JSON or log file | ✅ | Pure computation over a string, no DOM |
| Image resizing, canvas filters, video frames | ✅ | Transferable payloads, genuinely expensive |
| Search indexing, fuzzy matching, diffing | ✅ | CPU-bound and interruptible |
| Cryptography, compression, WASM workloads | ✅ | The classic case |
| Fetching data | ❌ | `fetch` is already off the main thread; only the parsing is yours |
| Anything that touches the DOM | ❌ | There is no DOM in a worker |
| Work under ~5ms | ❌ | The message round trip costs more than the work |

### The INP connection

INP measures the worst delay between an interaction and the next frame, and long tasks are the main
cause. The two fixes are the same fix at different scales: **yield**, or **move it**. Splitting a task
with `scheduler.yield()` lets the browser interleave input handling; moving it to a worker removes it
from the main thread entirely. Use a worker when the work is big enough that yielding would take dozens
of slices.

> ⚠️ **A worker is not free.** Each one is a real thread with its own heap — a few megabytes before it
> does anything. Spawn one per kind of work and keep it, or use a small pool; do not create one per
> call.

## Common Mistakes

**❌ Moving work that was never the problem.** Profile first. Most "slow" pages are slow because of
rendering, layout thrash or a 2 MB bundle, and a worker helps with none of those. The trace tells you
whether the long task is your function or the browser's layout.

**❌ Sending the whole object graph.** Send what the worker needs and return what the caller needs. A
worker that receives the full application state and returns a full copy pays the clone cost twice on the
main thread, which is the thread you were trying to protect.

**❌ Expecting class instances to survive.** Structured clone copies data, not prototypes. Send plain
objects and rehydrate on the other side if you need methods.

**❌ Forgetting `terminate()`.** A worker lives until it is terminated or the page unloads. A component
that spawns one per mount and never terminates leaks a thread each time.

**❌ Assuming `SharedArrayBuffer` is available.** It requires cross-origin isolation — `COOP` and `COEP`
headers — and turning those on can break third-party embeds and analytics. It is a deployment decision,
not a code decision.

## 🔑 Key Takeaways

- The main thread runs your JavaScript, does layout and paint, and handles input, one at a time — so a
  long function is a frozen interface.
- A worker has no DOM, so it suits pure computation: parsing, indexing, image and crypto work.
- Messages are structured-cloned, which costs real time on the main thread; transfer `ArrayBuffer`s
  instead of copying them for large payloads.
- Class instances lose their prototypes crossing the boundary, and functions cannot cross at all.
- Every worker is a thread with its own heap: pool them, reuse them, and terminate them in teardown.

## Interview Questions

**Q: A table freezes for half a second when a 20 MB CSV is uploaded. Walk through the fix.**

Profile first to confirm the long task is the parse rather than rendering 50,000 rows — those need
different fixes, and doing the wrong one wastes a day. If it is the parse, move it into a module worker,
send the file as an `ArrayBuffer` transferable so the main thread does not pay a clone cost, and return
only what the view needs: the visible page of rows, not the parsed whole. If rendering is the real
problem, virtualise the table and the worker changes nothing.

**Q: What can and cannot cross the worker boundary?**

Structured clone handles plain data — objects, arrays, `Map`, `Set`, `Date`, typed arrays, and cyclic
references. It cannot carry functions, and it drops prototypes, so a class instance arrives as a plain
object with no methods. DOM nodes cannot cross at all. Large binary data should be transferred rather
than cloned, which moves ownership and makes the buffer unusable on the sending side.

**Q: When is a worker the wrong answer to a slow interaction?**

When the work is short, when it touches the DOM, or when the bottleneck is rendering rather than
scripting. Under about five milliseconds the round trip costs more than the work. And a great many
"janky" pages are janky because of layout thrash or an oversized bundle — a worker cannot help with
either, and adding one hides the real cause behind a more complicated architecture.

**Q: How does moving work to a worker relate to INP?**

INP is the delay between an interaction and the frame that responds to it, and the usual cause is a long
task holding the main thread. A worker removes the task from that thread entirely, so the interaction is
handled at the next frame. The alternative for shorter work is yielding, which breaks one long task into
slices the browser can interleave input between. Same goal, two scales.

## What to Read Next

- [Chapter ?? — The Event Loop](#ch-event-loop) — why one long function blocks everything, in detail
- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — INP, and what a long task does to the number
- [Chapter ?? — The Observer APIs](#ch-observer-apis) — the other way to stop doing work on every frame
