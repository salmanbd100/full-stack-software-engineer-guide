# Streams & Buffers

## Overview

Streams and Buffers are fundamental concepts in Node.js for handling data efficiently. They're essential for working with large files, network requests, and any scenario where data arrives in chunks rather than all at once.

**Why They Matter:**
- Handle large files without loading entire file into memory
- Process data as it arrives (real-time processing)
- Build efficient pipelines for data transformation
- Essential for production-grade applications

## Buffers

### 💡 **What is a Buffer?**

A Buffer is a temporary storage area for binary data - the raw bytes that computers work with.

**Key Characteristics:**
- **Fixed-size:** Cannot be resized after creation
- **Outside V8 heap:** Allocated in native memory
- **Binary data:** Raw bytes, not JavaScript strings
- **Similar to arrays:** Can access bytes by index

**When to Use:**
- ✅ Reading/writing files
- ✅ Network communication
- ✅ Cryptographic operations
- ✅ Binary data manipulation
- ✅ Image/video processing

```javascript
// Creating Buffers
const buf1 = Buffer.alloc(10);              // Allocate 10 bytes (filled with 0)
const buf2 = Buffer.allocUnsafe(10);        // Allocate 10 bytes (uninitialized, faster)
const buf3 = Buffer.from('Hello');          // From string
const buf4 = Buffer.from([72, 101, 108]);   // From array

console.log(buf3); // <Buffer 48 65 6c 6c 6f>
console.log(buf3.toString()); // 'Hello'
console.log(buf3.length); // 5
```

### Buffer Operations

```javascript
// Writing to Buffer
const buf = Buffer.alloc(26);
for (let i = 0; i < 26; i++) {
  buf[i] = i + 97; // ASCII 'a' = 97
}
console.log(buf.toString('ascii')); // 'abcdefghijklmnopqrstuvwxyz'

// Reading from Buffer
const buffer = Buffer.from('Hello World');
console.log(buffer[0]); // 72 (ASCII 'H')
console.log(buffer.toString('utf8', 0, 5)); // 'Hello'

// Slicing (creates a view, not a copy)
const slice = buffer.slice(0, 5);
slice[0] = 74; // Changes original buffer too!
console.log(buffer.toString()); // 'Jello World'

// Copying (creates a new buffer)
const copy = Buffer.from(buffer);
copy[0] = 72;
console.log(buffer.toString()); // Still 'Jello World'
console.log(copy.toString()); // 'Hello World'

// Concatenating Buffers
const buf1 = Buffer.from('Hello ');
const buf2 = Buffer.from('World');
const combined = Buffer.concat([buf1, buf2]);
console.log(combined.toString()); // 'Hello World'

// Comparing Buffers
const buf3 = Buffer.from('ABC');
const buf4 = Buffer.from('ABD');
console.log(buf3.compare(buf4)); // -1 (buf3 < buf4)
console.log(buf3.equals(buf4));  // false
```

### Buffer Encodings

```javascript
const buf = Buffer.from('Hello', 'utf8');

// Common encodings
console.log(buf.toString('utf8'));    // 'Hello'
console.log(buf.toString('hex'));     // '48656c6c6f'
console.log(buf.toString('base64'));  // 'SGVsbG8='
console.log(buf.toString('ascii'));   // 'Hello'

// Binary data
const binaryBuf = Buffer.from('SGVsbG8=', 'base64');
console.log(binaryBuf.toString()); // 'Hello'
```

### Practical Buffer Use Cases

```javascript
// 1. File operations with buffers
const fs = require('fs').promises;

async function readBinaryFile() {
  const buffer = await fs.readFile('image.png');
  console.log(`File size: ${buffer.length} bytes`);

  // Modify binary data
  const modifiedBuffer = Buffer.concat([
    Buffer.from('PNG_HEADER'),
    buffer
  ]);

  await fs.writeFile('modified-image.png', modifiedBuffer);
}

// 2. Network data handling
const net = require('net');

const server = net.createServer(socket => {
  socket.on('data', buffer => {
    console.log('Received bytes:', buffer.length);
    console.log('Data:', buffer.toString());
  });
});

// 3. Cryptography
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');

  return {
    salt: salt.toString('hex'),
    hash: hash.toString('hex')
  };
}
```

## Streams

### 💡 **What are Streams?**

Streams are collections of data that might not be available all at once and don't have to fit in memory.

**Why Streams?**
- **Memory efficient:** Process data in chunks, not all at once
- **Time efficient:** Start processing before all data arrives
- **Composable:** Chain streams together with pipes
- **Powerful:** Handle files larger than available RAM

**Stream Types:**

| Type | Direction | Use Case | Example |
|------|-----------|----------|---------|
| **Readable** | Data source (read from) | File reading, HTTP requests | `fs.createReadStream()` |
| **Writable** | Data destination (write to) | File writing, HTTP responses | `fs.createWriteStream()` |
| **Duplex** | Both directions | TCP sockets, bidirectional | `net.Socket` |
| **Transform** | Modify data in pipeline | Compression, encryption | `zlib.createGzip()` |

**Key Insight:**
> Streams let you process 1GB files with just 64KB of memory. Without streams, you'd need 1GB of RAM!

### Readable Streams

```javascript
const fs = require('fs');

// Creating a readable stream
const readStream = fs.createReadStream('large-file.txt', {
  encoding: 'utf8',
  highWaterMark: 16 * 1024 // 16KB chunks (default: 64KB)
});

// Reading data - Event-based approach
readStream.on('data', chunk => {
  console.log(`Received ${chunk.length} bytes`);
  console.log(chunk);
});

readStream.on('end', () => {
  console.log('Finished reading file');
});

readStream.on('error', err => {
  console.error('Error:', err);
});

// Pausing and resuming
readStream.on('data', chunk => {
  console.log('Chunk received');
  readStream.pause();

  setTimeout(() => {
    console.log('Resuming...');
    readStream.resume();
  }, 1000);
});

// Reading data - Async iteration (Node.js 10+)
async function readFileWithAsyncIterator() {
  const stream = fs.createReadStream('large-file.txt', 'utf8');

  for await (const chunk of stream) {
    console.log(chunk);
  }
}
```

### Writable Streams

```javascript
const fs = require('fs');

// Creating a writable stream
const writeStream = fs.createWriteStream('output.txt', {
  encoding: 'utf8'
});

// Writing data
writeStream.write('First line\n');
writeStream.write('Second line\n');
writeStream.end('Final line\n'); // Signals end of writing

writeStream.on('finish', () => {
  console.log('All writes completed');
});

writeStream.on('error', err => {
  console.error('Error:', err);
});

// Handling backpressure
function writeMillionLines() {
  const stream = fs.createWriteStream('big-file.txt');

  function write(data, callback) {
    if (!stream.write(data)) {
      // Buffer is full, wait for drain event
      stream.once('drain', callback);
    } else {
      // Can continue writing
      process.nextTick(callback);
    }
  }

  function writeLines(i, callback) {
    if (i === 1000000) {
      stream.end(callback);
      return;
    }

    write(`Line ${i}\n`, () => {
      writeLines(i + 1, callback);
    });
  }

  writeLines(0, () => {
    console.log('Finished writing 1 million lines');
  });
}
```

### Piping Streams

Piping automatically handles backpressure and errors.

```javascript
const fs = require('fs');
const zlib = require('zlib');

// Simple pipe - Copy file
const readStream = fs.createReadStream('input.txt');
const writeStream = fs.createWriteStream('output.txt');

readStream.pipe(writeStream);

writeStream.on('finish', () => {
  console.log('File copied successfully');
});

// Chaining pipes - Compress file
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('input.txt.gz'))
  .on('finish', () => {
    console.log('File compressed');
  });

// Multiple destinations
const readable = fs.createReadStream('input.txt');
const dest1 = fs.createWriteStream('output1.txt');
const dest2 = fs.createWriteStream('output2.txt');

readable.pipe(dest1);
readable.pipe(dest2);

// Error handling in pipes
const { pipeline } = require('stream');

pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz'),
  err => {
    if (err) {
      console.error('Pipeline failed:', err);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);
```

### Transform Streams

Transform streams modify data as it passes through.

```javascript
const { Transform } = require('stream');

// Custom transform stream - Convert to uppercase
class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    // Transform the chunk
    const upperChunk = chunk.toString().toUpperCase();
    // Push transformed data
    this.push(upperChunk);
    // Signal completion
    callback();
  }
}

// Usage
fs.createReadStream('input.txt')
  .pipe(new UpperCaseTransform())
  .pipe(fs.createWriteStream('output.txt'));

// Simpler transform with stream.Transform
const upperTransform = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  }
});

// CSV parser transform
class CSVParser extends Transform {
  constructor(options) {
    super({ ...options, objectMode: true });
    this.headers = null;
  }

  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const values = line.split(',');

      if (!this.headers) {
        this.headers = values;
      } else {
        const obj = {};
        this.headers.forEach((header, i) => {
          obj[header] = values[i];
        });
        this.push(obj);
      }
    }

    callback();
  }
}

// Usage
fs.createReadStream('data.csv')
  .pipe(new CSVParser())
  .on('data', row => {
    console.log('Row:', row);
  });
```

### Duplex Streams

Duplex streams are both readable and writable.

```javascript
const { Duplex } = require('stream');

class MyDuplex extends Duplex {
  constructor(options) {
    super(options);
    this.data = [];
  }

  _write(chunk, encoding, callback) {
    // Write side
    this.data.push(chunk);
    callback();
  }

  _read(size) {
    // Read side
    if (this.data.length === 0) {
      this.push(null); // Signal end
    } else {
      this.push(this.data.shift());
    }
  }
}

// Socket is a common duplex stream
const net = require('net');

const client = net.connect({ port: 8080 }, () => {
  // Writable side
  client.write('Hello Server');
});

// Readable side
client.on('data', data => {
  console.log('Received:', data.toString());
});
```

## Practical Examples

### Example 1: File Upload Handler

```javascript
const http = require('http');
const fs = require('fs');
const { pipeline } = require('stream');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    const writeStream = fs.createWriteStream('uploaded-file.dat');

    pipeline(req, writeStream, err => {
      if (err) {
        res.statusCode = 500;
        res.end('Upload failed');
      } else {
        res.statusCode = 200;
        res.end('Upload successful');
      }
    });
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(3000);
```

### Example 2: Log File Processing

```javascript
const fs = require('fs');
const { Transform } = require('stream');
const readline = require('readline');

// Filter logs by level
class LogFilter extends Transform {
  constructor(level) {
    super({ objectMode: true });
    this.level = level;
  }

  _transform(line, encoding, callback) {
    if (line.includes(this.level)) {
      this.push(line + '\n');
    }
    callback();
  }
}

// Process large log file
async function processLogs() {
  const input = fs.createReadStream('app.log');
  const output = fs.createWriteStream('errors.log');

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity
  });

  const filter = new LogFilter('ERROR');

  for await (const line of rl) {
    filter.write(line);
  }

  filter.end();
  filter.pipe(output);
}
```

### Example 3: Video Streaming Server

```javascript
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  if (req.url === '/video') {
    const stat = fs.statSync('video.mp4');
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Partial content request
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4'
      });

      const stream = fs.createReadStream('video.mp4', { start, end });
      stream.pipe(res);
    } else {
      // Full content
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      });

      fs.createReadStream('video.mp4').pipe(res);
    }
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(3000);
```

### Example 4: Data Processing Pipeline

```javascript
const { Transform, pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

// Parse JSON lines
class JSONParser extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(chunk, encoding, callback) {
    try {
      const obj = JSON.parse(chunk.toString());
      this.push(obj);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

// Filter data
class DataFilter extends Transform {
  constructor(predicate) {
    super({ objectMode: true });
    this.predicate = predicate;
  }

  _transform(obj, encoding, callback) {
    if (this.predicate(obj)) {
      this.push(obj);
    }
    callback();
  }
}

// Convert back to JSON
class JSONStringify extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(obj, encoding, callback) {
    const json = JSON.stringify(obj) + '\n';
    callback(null, json);
  }
}

// Complete pipeline
pipeline(
  fs.createReadStream('data.json.gz'),
  zlib.createGunzip(),
  new JSONParser(),
  new DataFilter(obj => obj.age > 18),
  new JSONStringify(),
  zlib.createGzip(),
  fs.createWriteStream('filtered-data.json.gz'),
  err => {
    if (err) {
      console.error('Pipeline failed:', err);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);
```

## Backpressure

### ⚠️ **What is Backpressure?**

Backpressure occurs when a writable stream can't process data as fast as it's being sent.

**The Problem:**
- Readable stream produces data faster than writable can consume
- Memory buffer fills up
- Can cause memory exhaustion and crashes

**The Solution:**
- Pause readable stream when buffer is full
- Resume when buffer has space
- `.pipe()` handles this automatically

```javascript
// BAD: No backpressure handling
const readStream = fs.createReadStream('large-file.txt');
const writeStream = fs.createWriteStream('output.txt');

readStream.on('data', chunk => {
  writeStream.write(chunk); // May overflow buffer!
});

// GOOD: Using pipe (handles backpressure automatically)
readStream.pipe(writeStream);

// GOOD: Manual backpressure handling
readStream.on('data', chunk => {
  const canContinue = writeStream.write(chunk);

  if (!canContinue) {
    readStream.pause();
  }
});

writeStream.on('drain', () => {
  readStream.resume();
});
```

## Common Interview Questions

### Q1: What's the difference between Buffer and Stream?

**Short Answer:**
Buffers hold complete data in memory, while Streams process data piece-by-piece as it arrives.

**Detailed Comparison:**

| Feature | Buffer | Stream |
|---------|--------|--------|
| **Data Availability** | All at once | Chunk by chunk |
| **Memory Usage** | Entire data in memory | Small chunks in memory |
| **Best For** | Small data (<100MB) | Large data (100MB+) |
| **Processing** | After complete load | As data arrives |
| **Size Limit** | Limited by available RAM | No limit (processes incrementally) |
| **Performance** | Fast for small files | Fast for large files |

**Example Scenario:**
```javascript
// 1GB file processing

// Buffer approach: Needs 1GB RAM
const buffer = fs.readFileSync('1gb-file.dat'); // Loads entire 1GB!

// Stream approach: Needs ~64KB RAM
const stream = fs.createReadStream('1gb-file.dat'); // Processes in 64KB chunks
```

**Key Insight:**
> Use Buffers for small data you need all at once. Use Streams for large data or when you want to start processing immediately.

---

### Q2: When would you use streams over reading entire files?

**Short Answer:**
Use streams when working with large files, processing data incrementally, or when memory is constrained.

```javascript
// Without streams - Loads entire file into memory
const fs = require('fs');

function copyFileBad(source, dest) {
  const data = fs.readFileSync(source); // 1GB file = 1GB memory!
  fs.writeFileSync(dest, data);
}

// With streams - Processes in chunks
function copyFileGood(source, dest) {
  fs.createReadStream(source)
    .pipe(fs.createWriteStream(dest)); // ~64KB memory at a time
}
```

**Answer:** Use streams when:
- Working with large files
- Processing data as it arrives (network)
- Memory constraints
- Real-time processing needed

### Q3: Explain the different types of streams

**Answer:**
1. **Readable**: Source of data (file read, HTTP request)
2. **Writable**: Destination for data (file write, HTTP response)
3. **Duplex**: Both readable and writable (TCP socket)
4. **Transform**: Duplex that modifies data (compression, encryption)

### Q4: How do you handle errors in streams?

```javascript
// Method 1: Individual error handlers
readStream.on('error', err => console.error('Read error:', err));
writeStream.on('error', err => console.error('Write error:', err));

// Method 2: pipeline (recommended)
const { pipeline } = require('stream');

pipeline(
  readStream,
  transformStream,
  writeStream,
  err => {
    if (err) {
      console.error('Pipeline error:', err);
    }
  }
);

// Method 3: finished utility
const { finished } = require('stream');

finished(stream, err => {
  if (err) {
    console.error('Stream error:', err);
  } else {
    console.log('Stream finished successfully');
  }
});
```

## Performance Tips

```javascript
// 1. Set appropriate highWaterMark
const stream = fs.createReadStream('file.txt', {
  highWaterMark: 256 * 1024 // 256KB chunks
});

// 2. Use pipeline for automatic cleanup
pipeline(source, transform, destination, err => {});

// 3. Object mode for structured data
const stream = new Transform({
  objectMode: true,
  transform(obj, encoding, callback) {
    callback(null, processObject(obj));
  }
});

// 4. Async iteration for cleaner code
async function process() {
  for await (const chunk of readableStream) {
    await processChunk(chunk);
  }
}
```

## Summary

**Core Concepts:**

1. **Buffers:**
   - ✅ Fixed-size binary data storage
   - ✅ Allocated outside V8 heap (native memory)
   - ✅ Support multiple encodings (utf8, hex, base64)
   - ⚠️ Slicing creates views, not copies
   - ✅ Essential for file I/O, network operations, crypto

2. **Streams:**
   - ✅ Process data in chunks (memory efficient)
   - ✅ Four types: Readable, Writable, Duplex, Transform
   - ✅ Use `.pipe()` for automatic backpressure
   - ✅ Use `pipeline()` for better error handling
   - ✅ Handle files larger than available RAM

3. **Backpressure:**
   - ⚠️ Occurs when writer is faster than reader
   - ✅ `.pipe()` handles automatically
   - ✅ Manual handling: pause/resume pattern
   - ⚠️ Ignoring backpressure causes memory issues

4. **Best Practices:**
   - ✅ Streams for files >10% of available RAM
   - ✅ Always use `pipeline()` for multi-stream operations
   - ✅ Set appropriate `highWaterMark` for chunk size
   - ✅ Use object mode for structured data
   - ✅ Handle errors on every stream

**Key Insights:**
> - Streams are Node.js's superpower for handling large data efficiently
> - Always use `.pipe()` or `pipeline()` - never manually pump data
> - Backpressure handling is critical for production applications
> - Buffer slicing creates views (shared memory) - use carefully

## Related Topics
- [Event Loop & Async Programming](./01-event-loop-async.md)
- [File Handling](../../Express/07-file-handling.md)
- [Performance Optimization](./05-performance.md)

## Practice Problems

1. Create a custom transform stream for CSV to JSON conversion
2. Implement a file chunking utility using streams
3. Build a log rotation system using writable streams
4. Create a stream multiplexer (fan-out pattern)
5. Implement rate limiting for stream processing

## Resources
- [Node.js Streams Documentation](https://nodejs.org/api/stream.html)
- [Node.js Buffer Documentation](https://nodejs.org/api/buffer.html)
- [Stream Handbook](https://github.com/substack/stream-handbook)
