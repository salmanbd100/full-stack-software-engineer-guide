# Child Processes

## Overview

Node.js can spawn child processes to execute external commands, run CPU-intensive tasks, or leverage multi-core systems. Understanding child processes is essential for building scalable Node.js applications.

## Child Process Types

Node.js provides four ways to create child processes:

1. **spawn()** - Spawns a child process
2. **exec()** - Spawns a shell and executes a command
3. **execFile()** - Similar to exec() but doesn't spawn a shell
4. **fork()** - Special case of spawn() for Node.js processes

## spawn()

Best for long-running processes or when dealing with large amounts of data.

```javascript
const { spawn } = require('child_process');

// Basic usage
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

// Piping data
const find = spawn('find', ['.', '-name', '*.js']);
const grep = spawn('grep', ['console']);

find.stdout.pipe(grep.stdin);

grep.stdout.on('data', (data) => {
  console.log(data.toString());
});

// Using spawn with options
const child = spawn('npm', ['install'], {
  cwd: '/path/to/project',
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit' // Inherit parent's stdin, stdout, stderr
});

// Real-world example: Video conversion
function convertVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-c:a', 'aac',
      outputPath
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data;
      // Parse ffmpeg progress from stderr
      const progress = parseProgress(data.toString());
      if (progress) {
        console.log(`Progress: ${progress}%`);
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`ffmpeg failed: ${stderr}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}
```

## exec()

Best for short-running commands when you need the entire output at once.

```javascript
const { exec } = require('child_process');

// Basic usage
exec('ls -lh /usr', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
});

// With options
exec('git status', {
  cwd: '/path/to/repo',
  maxBuffer: 1024 * 500 // 500KB
}, (error, stdout, stderr) => {
  if (error) {
    console.error(error);
    return;
  }
  console.log(stdout);
});

// Promisified version
const util = require('util');
const execPromise = util.promisify(exec);

async function getGitBranch() {
  try {
    const { stdout, stderr } = await execPromise('git branch --show-current');
    return stdout.trim();
  } catch (error) {
    console.error('Failed to get git branch:', error);
    throw error;
  }
}

// Real-world example: Run npm commands
async function runNpmInstall(projectPath) {
  try {
    const { stdout, stderr } = await execPromise('npm install', {
      cwd: projectPath,
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });

    console.log('Install output:', stdout);

    if (stderr) {
      console.warn('Install warnings:', stderr);
    }

    return true;
  } catch (error) {
    console.error('npm install failed:', error.message);
    throw error;
  }
}

// Security note: NEVER use user input directly in exec()
// BAD - Command injection vulnerability!
const userInput = req.query.file;
exec(`cat ${userInput}`, callback); // DANGEROUS!

// GOOD - Use execFile or validate input
const { execFile } = require('child_process');
execFile('cat', [userInput], callback);
```

## execFile()

Safer than exec() because it doesn't spawn a shell.

```javascript
const { execFile } = require('child_process');

// Basic usage
execFile('node', ['--version'], (error, stdout, stderr) => {
  if (error) {
    throw error;
  }
  console.log(stdout);
});

// Real-world example: Image optimization
const util = require('util');
const execFilePromise = util.promisify(execFile);

async function optimizeImage(inputPath, outputPath) {
  try {
    const { stdout, stderr } = await execFilePromise('convert', [
      inputPath,
      '-resize', '800x600',
      '-quality', '85',
      outputPath
    ]);

    console.log('Image optimized:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Image optimization failed:', error);
    throw error;
  }
}

// Batch processing
async function processImages(imagePaths) {
  const promises = imagePaths.map(async (path) => {
    const outputPath = path.replace(/\.(jpg|png)$/, '.optimized.$1');
    return optimizeImage(path, outputPath);
  });

  return Promise.all(promises);
}
```

## fork()

Creates a new Node.js process with IPC (Inter-Process Communication) channel.

```javascript
const { fork } = require('child_process');

// Parent process (main.js)
const child = fork('child.js');

// Send message to child
child.send({ type: 'START', data: { foo: 'bar' } });

// Receive messages from child
child.on('message', (message) => {
  console.log('Message from child:', message);
});

child.on('exit', (code) => {
  console.log(`Child exited with code ${code}`);
});

// Child process (child.js)
process.on('message', (message) => {
  console.log('Message from parent:', message);

  if (message.type === 'START') {
    // Do some work
    const result = processData(message.data);

    // Send result back to parent
    process.send({ type: 'RESULT', data: result });
  }
});

// Real-world example: CPU-intensive task
// fibonacci-worker.js
process.on('message', ({ type, number }) => {
  if (type === 'CALCULATE') {
    function fibonacci(n) {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    }

    const result = fibonacci(number);
    process.send({ type: 'RESULT', result });
  }
});

// main.js
const express = require('express');
const app = express();

app.get('/fibonacci/:n', (req, res) => {
  const worker = fork('./fibonacci-worker.js');

  worker.send({
    type: 'CALCULATE',
    number: parseInt(req.params.n)
  });

  worker.on('message', ({ type, result }) => {
    if (type === 'RESULT') {
      res.json({ result });
      worker.kill();
    }
  });

  worker.on('error', (err) => {
    res.status(500).json({ error: err.message });
    worker.kill();
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    worker.kill();
    res.status(408).json({ error: 'Calculation timeout' });
  }, 10000);
});
```

## Worker Threads vs Child Processes

Worker Threads (added in Node.js 10.5.0) are often better for CPU-intensive tasks.

```javascript
const { Worker } = require('worker_threads');

// Worker thread example
// worker.js
const { parentPort, workerData } = require('worker_threads');

function heavyComputation(data) {
  // CPU-intensive work
  let result = 0;
  for (let i = 0; i < data.iterations; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

const result = heavyComputation(workerData);
parentPort.postMessage(result);

// main.js
function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// Usage
app.get('/compute', async (req, res) => {
  try {
    const result = await runWorker({
      iterations: 1000000
    });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Comparison: Worker Threads vs Child Processes

| Feature | Worker Threads | Child Processes |
|---------|---------------|-----------------|
| Memory | Shared memory | Separate memory |
| Communication | Fast (shared memory) | Slower (IPC) |
| Startup | Fast | Slower |
| Use case | CPU-intensive tasks | External commands, isolation |
| Isolation | Less isolated | Fully isolated |
| Node.js version | 10.5.0+ | All versions |

## Process Pool

Managing multiple child processes efficiently:

```javascript
class ProcessPool {
  constructor(scriptPath, poolSize = 4) {
    this.scriptPath = scriptPath;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];

    this.init();
  }

  init() {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    const worker = fork(this.scriptPath);
    worker.busy = false;

    worker.on('exit', () => {
      // Remove dead worker
      const index = this.workers.indexOf(worker);
      if (index !== -1) {
        this.workers.splice(index, 1);
      }

      // Create replacement
      if (this.workers.length < this.poolSize) {
        this.createWorker();
      }
    });

    this.workers.push(worker);
  }

  async execute(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };

      // Find available worker
      const worker = this.workers.find(w => !w.busy);

      if (worker) {
        this.runTask(worker, task);
      } else {
        // Queue task
        this.queue.push(task);
      }
    });
  }

  runTask(worker, task) {
    worker.busy = true;

    const messageHandler = (result) => {
      worker.busy = false;
      worker.removeListener('message', messageHandler);
      worker.removeListener('error', errorHandler);

      task.resolve(result);

      // Process queued tasks
      if (this.queue.length > 0) {
        const nextTask = this.queue.shift();
        this.runTask(worker, nextTask);
      }
    };

    const errorHandler = (error) => {
      worker.busy = false;
      worker.removeListener('message', messageHandler);
      worker.removeListener('error', errorHandler);

      task.reject(error);
    };

    worker.on('message', messageHandler);
    worker.on('error', errorHandler);
    worker.send(task.data);
  }

  destroy() {
    this.workers.forEach(worker => worker.kill());
    this.workers = [];
  }
}

// Usage
const pool = new ProcessPool('./worker.js', 4);

app.post('/process', async (req, res) => {
  try {
    const result = await pool.execute(req.body);
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## Stream Communication

Efficiently transferring large amounts of data:

```javascript
const { spawn } = require('child_process');
const fs = require('fs');

// Compress file using gzip
function compressFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    const gzip = spawn('gzip', ['-c']);

    input.pipe(gzip.stdin);
    gzip.stdout.pipe(output);

    output.on('finish', () => resolve(outputPath));
    gzip.on('error', reject);
    output.on('error', reject);
  });
}

// Process large CSV file
function processLargeCSV(inputPath) {
  const readline = require('readline');
  const child = spawn('node', ['csv-processor.js']);

  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    child.stdin.write(line + '\n');
  });

  rl.on('close', () => {
    child.stdin.end();
  });

  child.stdout.on('data', (data) => {
    console.log('Processed:', data.toString());
  });
}
```

## Error Handling & Monitoring

```javascript
const { spawn } = require('child_process');

function createResilientProcess(command, args, options = {}) {
  let child = null;
  let restartCount = 0;
  const maxRestarts = options.maxRestarts || 3;
  const restartDelay = options.restartDelay || 1000;

  function start() {
    child = spawn(command, args, options);

    child.on('error', (err) => {
      console.error('Process error:', err);

      if (options.onError) {
        options.onError(err);
      }
    });

    child.on('exit', (code, signal) => {
      console.log(`Process exited with code ${code}, signal ${signal}`);

      if (code !== 0 && restartCount < maxRestarts) {
        restartCount++;
        console.log(`Restarting process (attempt ${restartCount}/${maxRestarts})`);

        setTimeout(start, restartDelay);
      } else if (options.onExit) {
        options.onExit(code, signal);
      }
    });

    if (options.onStart) {
      options.onStart(child);
    }

    return child;
  }

  return start();
}

// Usage
const child = createResilientProcess('node', ['long-running-service.js'], {
  maxRestarts: 5,
  restartDelay: 2000,
  onStart: (proc) => {
    console.log('Process started:', proc.pid);
  },
  onError: (err) => {
    console.error('Process error:', err);
  },
  onExit: (code, signal) => {
    console.log('Process ended permanently');
  }
});
```

## Common Interview Questions

### Q1: When should you use spawn() vs exec()?

**Answer:**
- **spawn()**: Long-running processes, large data streams, real-time output
  - Streams data (event-driven)
  - Better for large output
  - No shell overhead

- **exec()**: Short commands, small output, need shell features
  - Buffers entire output
  - Maximum buffer size limit
  - Uses a shell

### Q2: What's the difference between fork() and spawn()?

**Answer:**
- **fork()**: Creates a new Node.js process with IPC channel
  - Built-in message passing
  - Runs Node.js code
  - Easier communication between parent and child

- **spawn()**: Creates any child process
  - No built-in IPC
  - Can run any command
  - Communication via stdin/stdout/stderr

### Q3: How do you handle CPU-intensive tasks in Node.js?

**Answer:**
1. **Worker Threads** - Best for CPU-intensive JavaScript
2. **Child Processes** - For external commands or complete isolation
3. **Clustering** - Utilize multiple CPU cores
4. **Task Queues** - Offload to background workers

### Q4: How do you prevent command injection vulnerabilities?

**Answer:**
1. Never use `exec()` with user input
2. Use `execFile()` instead
3. Validate and sanitize all input
4. Use argument arrays instead of string concatenation

```javascript
// NEVER DO THIS
exec(`ping ${userInput}`); // VULNERABLE!

// DO THIS
execFile('ping', [userInput]); // SAFE
```

## Best Practices

```javascript
// 1. Always handle errors
const child = spawn('command');

child.on('error', (err) => {
  console.error('Failed to start child process:', err);
});

// 2. Set timeouts for long-running processes
const timeout = setTimeout(() => {
  child.kill('SIGTERM');
  console.log('Process killed due to timeout');
}, 30000);

child.on('exit', () => {
  clearTimeout(timeout);
});

// 3. Limit buffer size for exec()
exec('command', { maxBuffer: 1024 * 500 }, callback);

// 4. Clean up child processes
process.on('exit', () => {
  if (child) {
    child.kill();
  }
});

// 5. Use detached processes when needed
const child = spawn('command', {
  detached: true,
  stdio: 'ignore'
});
child.unref(); // Allow parent to exit independently
```

## Summary

**Key Takeaways:**
- `spawn()` for long-running processes and streams
- `exec()` for short commands with small output
- `execFile()` for security (no shell)
- `fork()` for Node.js processes with IPC
- Worker Threads often better than child processes for CPU tasks
- Always handle errors and timeouts
- Never use user input directly in exec()
- Clean up processes on exit

## Related Topics
- [Event Loop & Async](./01-event-loop-async.md)
- [Clustering](./08-clustering.md)
- [Performance Optimization](./05-performance.md)

## Resources
- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html)
- [Worker Threads Documentation](https://nodejs.org/api/worker_threads.html)
