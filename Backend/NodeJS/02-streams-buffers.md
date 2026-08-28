---
title: Streams and Buffers
part: 5
chapter: 0
slug: streams-buffers
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [backend, nodejs, streams, buffers]
in_book: true
---

# Streams and Buffers {#ch-streams-and-buffers}

> Process a file larger than your memory, and handle backpressure instead of ignoring it.

**In this chapter:** buffers · the four stream types · why `pipe()` is the wrong default · backpressure · transform streams

## 💡 Process Data You Can't Hold in Memory

Reading a 5 GB file with `readFile` needs 5 GB of RAM. Ten users doing it at once needs 50 GB, and your process dies.

A **stream** moves that data in small chunks, so memory stays flat no matter how big the source is. A **buffer** is the chunk itself — a fixed block of raw bytes.

> Buffers are *what* the bytes are. Streams are *how* they flow. Constant memory, and the first byte reaches the client before the last one is read.

---

## Buffers

JavaScript strings are UTF-16 text. Files, sockets, and images are raw bytes. `Buffer` is Node's fixed-length byte array for that.

```typescript
const fromText = Buffer.from("héllo", "utf8");  // 6 bytes — é takes 2
const fromHex = Buffer.from("deadbeef", "hex");
const empty = Buffer.alloc(1024);               // zero-filled

console.log(fromText.length);      // 6 — BYTES, not characters
console.log("héllo".length);       // 5 — characters
```

⚠️ **`.length` is bytes.** Every "why is my byte count wrong?" bug starts by assuming otherwise.

🔴 **Never use `Buffer.allocUnsafe` for data you return.** It skips zero-filling for speed, so it hands you whatever was in that memory before — potentially another request's data.

```typescript
Buffer.alloc(1024);        // ✅ zeroed, safe
Buffer.allocUnsafe(1024);  // 🔴 old memory contents — only if you overwrite it all immediately
```

| Encoding  | Use for                              |
| --------- | ------------------------------------ |
| `utf8`    | Text (default)                       |
| `base64`  | Embedding binary in JSON or a header |
| `hex`     | Hashes, signatures                   |
| `ascii`   | Legacy protocols                     |

**Compare secrets in constant time** — a normal `===` leaks information through timing:

```typescript
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
```

---

## The Four Stream Types

| Type          | Direction        | Example                        |
| ------------- | ---------------- | ------------------------------ |
| **Readable**  | Source           | `fs.createReadStream`, HTTP request |
| **Writable**  | Destination      | `fs.createWriteStream`, HTTP response |
| **Duplex**    | Both, independent | TCP socket                     |
| **Transform** | Both, chunk in → chunk out | `zlib.createGzip`, a parser |

An HTTP handler is already two streams: `req` is Readable, `res` is Writable.

---

## Piping — and Why `pipe()` Is the Wrong Default

`pipe()` connects a readable to a writable and handles backpressure. What it does **not** do is forward errors or clean up.

```typescript
// ❌ If the write fails, the read stream stays open — a file descriptor leak
source.pipe(destination);
```

Use `pipeline` instead. It propagates errors and destroys every stream in the chain:

```typescript
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { createGzip } from "node:zlib";

await pipeline(
  createReadStream("access.log"),
  createGzip(),
  createWriteStream("access.log.gz"),
);
```

> ✨ **Rule: always `pipeline`, never bare `pipe`.** The promise version gives you `try/catch` for free. This is a common senior-level interview probe.

---

## Backpressure

A fast reader plus a slow writer means chunks pile up in memory — the exact problem streams were meant to solve.

```text
read 100 MB/s  ──▶  [ buffer grows ]  ──▶  write 10 MB/s   🔴 memory climbs
```

`write()` returns `false` when the destination's internal buffer is full. Honouring that signal *is* backpressure handling:

```typescript
// ❌ Ignores the signal — unbounded memory growth
readable.on("data", (chunk) => destination.write(chunk));

// ✅ Pause until the destination drains
readable.on("data", (chunk) => {
  if (!destination.write(chunk)) {
    readable.pause();
    destination.once("drain", () => readable.resume());
  }
});
```

`pipe()` and `pipeline()` do all of this for you — which is the main reason to never hand-roll the loop above.

---

## Transform Streams

A Transform is where your logic goes: parse, filter, encrypt, redact.

```typescript
import { Transform, TransformCallback } from "node:stream";

class RedactEmails extends Transform {
  private tail = "";

  _transform(chunk: Buffer, _enc: BufferEncoding, done: TransformCallback): void {
    const text = this.tail + chunk.toString("utf8");
    const lines = text.split("\n");
    this.tail = lines.pop() ?? "";     // last line may be cut mid-way

    const clean = lines.map((l) => l.replace(/[\w.]+@[\w.]+/g, "[redacted]"));
    done(null, clean.join("\n") + "\n");
  }

  _flush(done: TransformCallback): void {
    done(null, this.tail);             // don't lose the final partial line
  }
}
```

⚠️ **Chunks do not respect your record boundaries.** A 64 KB chunk will land mid-line, mid-JSON, mid-UTF-8-character. Buffer the remainder in `_transform` and emit it in `_flush` — forgetting `_flush` silently drops the last record.

### Async generators — usually simpler

Any async iterable works as a pipeline stage, with no class needed:

```typescript
await pipeline(
  createReadStream("users.csv"),
  async function* (source: AsyncIterable<Buffer>) {
    for await (const chunk of source) {
      yield chunk.toString().toUpperCase();
    }
  },
  createWriteStream("out.csv"),
);
```

> Reach for the generator form first. Drop to a `Transform` class when you need object mode, custom watermarks, or reusable stream objects.

---

## Real-World Patterns

### Stream a large query to the client

```typescript
import { Readable } from "node:stream";

app.get("/export", async (_req, res) => {
  res.setHeader("Content-Type", "application/x-ndjson");

  await pipeline(
    Readable.from(db.query("SELECT * FROM events").stream()),
    async function* (rows: AsyncIterable<EventRow>) {
      for await (const row of rows) yield JSON.stringify(row) + "\n";
    },
    res,
  );
});
```

Memory stays flat whether the table has 100 rows or 100 million, and the browser starts receiving immediately.

### Video with range requests

```typescript
app.get("/video/:id", (req, res) => {
  const size = statSync(filePath).size;
  const range = req.headers.range;

  if (!range) return createReadStream(filePath).pipe(res);

  const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
  const start = Number(startStr);
  const end = endStr ? Number(endStr) : size - 1;

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": "video/mp4",
  });

  createReadStream(filePath, { start, end }).pipe(res);
});
```

> `206 Partial Content` plus `Accept-Ranges` is what makes seeking work. Without it the browser must download the whole file to jump to the middle.

---

## Interview Q&A

**Q: Buffer or stream — how do you choose?**
A: Size and predictability. If the data is small and bounded (a config file, a JSON body under a few MB), buffering is simpler and faster. If it's large, unbounded, or user-supplied, stream it — memory then depends on chunk size rather than payload size. The tipping point in practice is a few megabytes, or any point where concurrent requests multiply the cost.

**Q: What is backpressure and who handles it?**
A: It's the signal that a destination can't keep up — `write()` returning `false`. Ignore it and chunks queue in memory until the process dies. `pipe()` and `pipeline()` handle it automatically by pausing the source until `drain`. You only handle it manually if you're consuming `data` events yourself, which you generally shouldn't.

**Q: Why `pipeline()` over `pipe()`?**
A: `pipe()` doesn't forward errors and doesn't destroy the other streams when one fails, so a mid-chain error leaks file descriptors and sockets. `pipeline()` propagates the error and tears the whole chain down. The `stream/promises` version also makes it awaitable.

**Q: How do you handle a chunk that splits a record in half?**
A: Keep the trailing partial in instance state, emit only complete records in `_transform`, and flush the remainder in `_flush`. Missing `_flush` is the classic bug — the last line of every file quietly disappears.

**Q: What is object mode?**
A: By default streams carry buffers or strings. With `objectMode: true` each chunk can be any JavaScript value, so you can pipe parsed records between stages. The watermark then counts objects rather than bytes.

---

## Best Practices

✅ Always use `pipeline()` from `node:stream/promises`
✅ Stream anything user-supplied or unbounded in size
✅ Handle partial records with `_flush`
✅ Prefer async generators for simple transforms
✅ Use `Buffer.alloc`, not `allocUnsafe`, for anything you return
✅ Compare secrets with `timingSafeEqual`
❌ Don't `readFile` a file whose size you don't control
❌ Don't ignore the return value of `write()` in hand-rolled loops
❌ Don't concatenate stream chunks into one big buffer — that defeats the point

---

[← Previous: Event Loop](./01-event-loop-async.md) | [Next: Module System →](./03-module-system.md)
