---
title: Streams and Buffers
part: 5
chapter: 0
slug: streams-buffers
level: intermediate
reading_time: 9
updated: 2026-09-01
tags: [nodejs, streams, buffers, backpressure]
in_book: true
---

# Streams and Buffers {#ch-streams-buffers}

> Move data through a Node process without ever holding all of it, and know why `pipe()` is the wrong default.

**In this chapter:** buffers and encodings · the four stream types · backpressure · transforms · the two patterns you will actually ship

## 💡 The Core Idea

A stream processes data in **chunks over time** instead of all at once. A 2 GB file read with
`fs.readFile` needs 2 GB of heap and blocks until the last byte lands. The same file read as a
stream needs 64 KB at a time and starts producing output immediately.

The reason this matters is not elegance, it is memory per concurrent request. Ten users each
downloading a 200 MB export is 2 GB of resident memory with buffering and about 1 MB with
streaming. Streaming is what makes the difference between a container that survives and one the
scheduler kills.

## How It Works

### Buffers hold bytes, not text

A `Buffer` is a fixed-length view over raw memory outside the V8 heap. Every byte that arrives
from a socket or a file is a `Buffer` until you decode it.

```typescript
const buf: Buffer = Buffer.from('héllo', 'utf8');
console.log(buf.length);          // 6 — 'é' is two bytes
console.log('héllo'.length);      // 5 — JavaScript counts code units
console.log(buf.toString('base64'));
```

The trap is decoding a chunk boundary. A UTF-8 character can be split across two chunks, so
`chunk.toString()` per chunk produces mojibake at the seam.

```typescript
// ❌ Corrupts multi-byte characters at chunk boundaries
stream.on('data', (chunk: Buffer): void => process.stdout.write(chunk.toString()));

// ✅ Holds partial characters until the next chunk completes them
stream.setEncoding('utf8');
```

> ⚠️ Never use `Buffer.allocUnsafe` for anything that leaves the process. It hands back
> uninitialised memory, which may contain fragments of previous requests. Use `Buffer.alloc`.

### The four stream types

| Type | Direction | Example |
| ---- | --------- | ------- |
| **Readable** | Out of a source | `fs.createReadStream`, an HTTP request |
| **Writable** | Into a sink | `fs.createWriteStream`, an HTTP response |
| **Duplex** | Both, independent | A TCP socket |
| **Transform** | Both, coupled | `zlib.createGzip`, a CSV encoder |

### Backpressure is the whole point

A readable can usually produce faster than a writable can consume. Backpressure is the signal
that says *stop*. `write()` returns `false` when the sink's internal buffer is full; you are
expected to wait for `'drain'` before writing again.

```typescript
// The manual version, so the mechanism is visible.
async function copy(src: Readable, dst: Writable): Promise<void> {
  for await (const chunk of src) {
    if (!dst.write(chunk)) {
      await once(dst, 'drain'); // Pause the source until the sink catches up.
    }
  }
  dst.end();
}
```

Ignore that return value and the buffer grows without limit — the memory problem you used
streams to avoid, reintroduced.

### `pipeline`, not `pipe`

`pipe()` handles backpressure but **not** error propagation or cleanup. If the destination
fails mid-transfer, the source stays open and its file descriptor leaks.

```typescript
// ❌ On a write error, readStream is never destroyed
readStream.pipe(gzip).pipe(writeStream);

// ✅ Destroys every stream in the chain on any failure
await pipeline(readStream, createGzip(), writeStream);
```

`pipeline` from `node:stream/promises` is the correct default. Reach for `pipe` only when you
genuinely want the source to survive the destination.

## When to Use It

| Scenario | Choose | Why |
| -------- | ------ | --- |
| File or export larger than a few MB | Stream | Memory stays flat as size grows |
| Response the client can start rendering early | Stream | Time to first byte drops |
| Data must be validated as a whole before any output | Buffer | You cannot un-send a bad chunk |
| Small JSON body, under ~100 KB | Buffer | Streaming adds complexity for nothing |

## Transform Streams

A transform is where your logic goes. Implement `_transform`, push whatever you want downstream,
call the callback.

**A line-delimited JSON parser:**

```typescript
class JsonLines extends Transform {
  private tail = '';

  constructor() {
    super({ readableObjectMode: true }); // Emits objects, consumes bytes.
  }

  _transform(chunk: Buffer, _enc: string, done: (e?: Error) => void): void {
    const lines = (this.tail + chunk.toString('utf8')).split('\n');
    this.tail = lines.pop() ?? ''; // Last element may be a partial line.
    try {
      for (const line of lines) {
        if (line.trim()) this.push(JSON.parse(line) as unknown);
      }
      done();
    } catch (err) {
      done(err as Error); // Surfaces through pipeline and destroys the chain.
    }
  }

  _flush(done: () => void): void {
    if (this.tail.trim()) this.push(JSON.parse(this.tail) as unknown);
    done();
  }
}
```

The `tail` field is the part people forget. Chunk boundaries do not respect your record
boundaries, and `_flush` is what handles a final line with no trailing newline.

## The Two Patterns You Will Ship

**Streaming a large export to an HTTP response:**

```typescript
app.get('/exports/orders.csv', async (req, res) => {
  res.type('text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');

  // A database cursor, not a full result set — the query never materialises in memory.
  const cursor = db.query(new QueryStream('SELECT * FROM orders'));
  await pipeline(cursor, new CsvTransform(), res);
});
```

## Common Mistakes

**❌ `await pipeline(...)` without a client-disconnect guard.** If the browser aborts a
download, the source keeps reading. Listen for `res.on('close')` and destroy the source, or let
`pipeline` do it by passing an `AbortSignal`.

**❌ Mixing `'data'` handlers with `pipe` on the same stream.** Both consume; you get half the
chunks in each place.

**❌ Object mode everywhere.** `objectMode: true` sets `highWaterMark` to 16 *objects*. If each
object is a 5 MB row, that is 80 MB buffered. Set `highWaterMark` explicitly for large objects.

## 🔑 Key Takeaways

- Streaming keeps memory flat as payload size grows — that is its only real argument.
- A `Buffer` holds bytes; decode with `setEncoding`, never per chunk, or multi-byte characters break at seams.
- `write()` returning `false` is backpressure, and ignoring it recreates unbounded buffering.
- Use `pipeline` over `pipe`: it propagates errors and destroys the whole chain.
- A transform must carry partial records across chunk boundaries and drain them in `_flush`.

## Interview Questions

**Q: What is backpressure and what happens if you ignore it?**

It is the writable side telling the readable side to slow down, signalled by `write()` returning
`false` and lifted by the `'drain'` event. Ignoring it means chunks accumulate in the writable's
internal buffer, which has no hard ceiling, so a fast source and a slow sink grow the heap until
the process is killed. `pipe` and `pipeline` handle it for you; manual loops do not.

**Q: Why is `pipeline` preferred over `pipe`?**

`pipe` only wires data and backpressure. On an error in any stream it leaves the others open, so
file descriptors and sockets leak, and the error is emitted on a stream nobody is listening to.
`pipeline` propagates the error to a single callback or promise and destroys every stream in the
chain.

**Q: A stream of JSON lines occasionally throws "Unexpected end of JSON input". Why?**

Because a chunk boundary landed inside a record. Each chunk is an arbitrary number of bytes, not
a whole line, so parsing per chunk will eventually split one. The fix is to keep the trailing
partial line in state, prepend it to the next chunk, and handle the final fragment in `_flush`.

## What to Read Next

- [Chapter ?? — The Event Loop and Async Node](#ch-event-loop-async) — why chunked work keeps the loop responsive
- [Chapter ?? — Real-Time and Streaming APIs](#ch-realtime-streaming) — streaming over HTTP and WebSockets
- [Chapter ?? — Node.js Performance](#ch-nodejs-performance) — spotting the buffered response in a memory profile
