# Clustering & Scalability

## Overview

Node.js runs on a single thread, but modern servers have multiple CPU cores. Clustering allows Node.js to utilize all available CPU cores by creating multiple worker processes, dramatically improving application performance and scalability.

## The Cluster Module

### Basic Clustering

```javascript
const cluster = require('cluster');
const http = require('http');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  console.log(`Master process ${process.pid} is running`);

  // Fork workers (one per CPU core)
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Replace dead worker
    cluster.fork();
  });
} else {
  // Workers share the same server port
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`Hello from worker ${process.pid}\n`);
  }).listen(8000);

  console.log(`Worker ${process.pid} started`);
}
```

### How Clustering Works

```
┌─────────────────────────────────┐
│       Master Process             │
│         (PID: 1234)              │
└───────────┬─────────────────────┘
            │
            ├─────────┬─────────┬─────────┐
            │         │         │         │
      ┌─────▼──┐ ┌───▼────┐ ┌──▼─────┐ ┌─▼──────┐
      │Worker 1│ │Worker 2│ │Worker 3│ │Worker 4│
      │PID:1235│ │PID:1236│ │PID:1237│ │PID:1238│
      └────────┘ └────────┘ └────────┘ └────────┘
            │         │         │         │
            └─────────┴─────────┴─────────┘
                      │
                 Port 8000
                (Shared listening)
```

### Express with Clustering

```javascript
const cluster = require('cluster');
const express = require('express');
const os = require('os');

const numWorkers = process.env.WORKERS || os.cpus().length;

if (cluster.isMaster) {
  masterProcess();
} else {
  workerProcess();
}

function masterProcess() {
  console.log(`Master ${process.pid} is running`);
  console.log(`Forking ${numWorkers} workers`);

  // Create workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  // Handle worker events
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died with code ${code}`);

    // Don't restart if shutdown was intentional
    if (!worker.exitedAfterDisconnect) {
      console.log('Starting a new worker');
      cluster.fork();
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Master received SIGTERM, shutting down gracefully');

    for (const id in cluster.workers) {
      cluster.workers[id].send('shutdown');
      cluster.workers[id].disconnect();

      setTimeout(() => {
        if (!cluster.workers[id].isDead()) {
          cluster.workers[id].kill();
        }
      }, 10000); // Force kill after 10s
    }
  });
}

function workerProcess() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Middleware
  app.use(express.json());

  // Routes
  app.get('/', (req, res) => {
    res.json({
      message: 'Hello from cluster',
      pid: process.pid,
      worker: cluster.worker.id
    });
  });

  app.get('/heavy', async (req, res) => {
    // Simulate CPU-intensive task
    const result = await heavyComputation();
    res.json({ result, pid: process.pid });
  });

  // Start server
  app.listen(port, () => {
    console.log(`Worker ${process.pid} listening on port ${port}`);
  });

  // Handle shutdown message
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      console.log(`Worker ${process.pid} shutting down`);

      // Close server gracefully
      server.close(() => {
        console.log(`Worker ${process.pid} closed all connections`);
        process.exit(0);
      });

      // Force exit after timeout
      setTimeout(() => {
        console.error(`Worker ${process.pid} forced shutdown`);
        process.exit(1);
      }, 10000);
    }
  });
}

async function heavyComputation() {
  // Simulate work
  let result = 0;
  for (let i = 0; i < 1e9; i++) {
    result += Math.sqrt(i);
  }
  return result;
}
```

## Load Balancing

The cluster module uses round-robin load balancing (default on all platforms except Windows).

```javascript
// Customize load balancing
cluster.schedulingPolicy = cluster.SCHED_RR; // Round-robin
// or
cluster.schedulingPolicy = cluster.SCHED_NONE; // OS handles it

// Monitor load distribution
const workerStats = {};

cluster.on('online', (worker) => {
  workerStats[worker.id] = {
    requests: 0,
    errors: 0,
    startTime: Date.now()
  };
});

// In worker process
app.use((req, res, next) => {
  process.send({ type: 'request', workerId: cluster.worker.id });
  next();
});

// In master process
cluster.on('message', (worker, message) => {
  if (message.type === 'request') {
    workerStats[message.workerId].requests++;
  }
});

// Display stats
setInterval(() => {
  console.log('Worker Stats:', workerStats);
}, 10000);
```

## PM2 - Production Process Manager

PM2 is the most popular production process manager for Node.js.

### Basic PM2 Usage

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start app.js

# Start with cluster mode
pm2 start app.js -i max  # max = number of CPUs

# Start with specific number of instances
pm2 start app.js -i 4

# List running processes
pm2 list

# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart app

# Stop application
pm2 stop app

# Delete from PM2
pm2 delete app

# Reload with zero downtime
pm2 reload app

# Save process list
pm2 save

# Startup script (auto-restart on reboot)
pm2 startup

# Update PM2
pm2 update
```

### PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './app.js',
      instances: 'max', // Use all CPUs
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 3000,
      kill_timeout: 5000
    },
    {
      name: 'worker',
      script: './worker.js',
      instances: 2,
      exec_mode: 'cluster',
      cron_restart: '0 0 * * *', // Restart at midnight
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};

// Start with ecosystem file
// pm2 start ecosystem.config.js
// pm2 start ecosystem.config.js --env production
```

### PM2 Advanced Features

```javascript
// Zero-downtime deployment
pm2 reload app  // Graceful reload

// Graceful shutdown in app
process.on('SIGINT', () => {
  console.log('Graceful shutdown...');

  server.close(() => {
    console.log('Server closed');

    // Close database connections
    db.close(() => {
      console.log('Database closed');
      process.exit(0);
    });
  });
});

// Memory monitoring
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    pid: process.pid,
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`
    }
  });
});

// PM2 Programmatic API
const pm2 = require('pm2');

pm2.connect((err) => {
  if (err) {
    console.error(err);
    process.exit(2);
  }

  pm2.start({
    script: 'app.js',
    name: 'api',
    instances: 4,
    exec_mode: 'cluster'
  }, (err, apps) => {
    pm2.disconnect();
    if (err) throw err;
  });
});

// Monitor PM2 metrics
const pmx = require('@pm2/io');

const counter = pmx.counter({
  name: 'Request count'
});

app.use((req, res, next) => {
  counter.inc();
  next();
});

const meter = pmx.meter({
  name: 'req/min',
  samples: 60
});

app.use((req, res, next) => {
  meter.mark();
  next();
});
```

## Sticky Sessions

For WebSocket or session-based applications:

```javascript
// Using sticky-session package
const cluster = require('cluster');
const sticky = require('sticky-session');
const express = require('express');

if (cluster.isMaster) {
  for (let i = 0; i < 4; i++) {
    cluster.fork();
  }
} else {
  const app = express();
  const server = require('http').createServer(app);

  // WebSocket setup
  const io = require('socket.io')(server);

  io.on('connection', (socket) => {
    console.log(`Client connected to worker ${process.pid}`);

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  if (!sticky.listen(server, 3000)) {
    server.once('listening', () => {
      console.log(`Worker ${process.pid} is listening on 3000`);
    });
  }
}

// PM2 with sticky sessions
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'app',
    script: 'app.js',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_APP_INSTANCE: 0 // PM2 sets this automatically
    }
  }]
};

// In your app
const port = process.env.PORT || 3000;
const instance = process.env.NODE_APP_INSTANCE || 0;
app.listen(port + parseInt(instance));
```

## Horizontal Scaling

Scaling across multiple servers:

```javascript
// Using Redis for shared state
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Shared session store
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Shared cache
async function getCachedData(key) {
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const data = await fetchFromDatabase(key);
  await redis.setex(key, 3600, JSON.stringify(data));

  return data;
}

// Pub/Sub for inter-server communication
const subscriber = new Redis();
const publisher = new Redis();

subscriber.subscribe('notifications');

subscriber.on('message', (channel, message) => {
  console.log(`Received message from ${channel}:`, message);
  io.emit('notification', JSON.parse(message));
});

// Publish from any server
function notifyAllServers(data) {
  publisher.publish('notifications', JSON.stringify(data));
}
```

## Load Balancers

### NGINX Load Balancer

```nginx
# nginx.conf
http {
  upstream backend {
    least_conn;  # Load balancing method

    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
  }

  server {
    listen 80;
    server_name example.com;

    location / {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
  }
}
```

### AWS Application Load Balancer

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  // Check database connection
  db.ping((err) => {
    if (err) {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected'
      });
    }

    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  });
});

// Auto scaling based on metrics
const cloudwatch = new AWS.CloudWatch();

function reportMetrics() {
  const memUsage = process.memoryUsage();

  cloudwatch.putMetricData({
    Namespace: 'MyApp',
    MetricData: [
      {
        MetricName: 'MemoryUsage',
        Value: memUsage.heapUsed / memUsage.heapTotal * 100,
        Unit: 'Percent',
        Timestamp: new Date()
      }
    ]
  }, (err) => {
    if (err) console.error('Failed to report metrics:', err);
  });
}

setInterval(reportMetrics, 60000); // Every minute
```

## Performance Monitoring

```javascript
const cluster = require('cluster');

if (cluster.isMaster) {
  const workers = new Map();

  cluster.on('online', (worker) => {
    workers.set(worker.id, {
      pid: worker.process.pid,
      requests: 0,
      errors: 0,
      memory: 0,
      cpu: 0
    });
  });

  cluster.on('message', (worker, message) => {
    if (message.type === 'stats') {
      const stats = workers.get(worker.id);
      Object.assign(stats, message.data);
    }
  });

  // Display stats periodically
  setInterval(() => {
    console.log('\n=== Worker Stats ===');
    for (const [id, stats] of workers) {
      console.log(`Worker ${id}:`, stats);
    }
  }, 10000);
} else {
  // Worker reports stats
  let requestCount = 0;
  let errorCount = 0;

  app.use((req, res, next) => {
    requestCount++;
    next();
  });

  app.use((err, req, res, next) => {
    errorCount++;
    next(err);
  });

  setInterval(() => {
    const memUsage = process.memoryUsage();

    process.send({
      type: 'stats',
      data: {
        requests: requestCount,
        errors: errorCount,
        memory: Math.round(memUsage.heapUsed / 1024 / 1024)
      }
    });
  }, 5000);
}
```

## Common Interview Questions

### Q1: How does clustering improve Node.js performance?

**Answer:**
- Node.js is single-threaded, limited to one CPU core
- Clustering creates multiple worker processes
- Each worker runs on a different CPU core
- Load is distributed across workers
- Utilizes full server capacity
- Improves throughput and handles more concurrent requests

### Q2: What happens if a worker process crashes?

**Answer:**
The master process can detect the crash and automatically spawn a new worker:

```javascript
cluster.on('exit', (worker, code, signal) => {
  console.log(`Worker ${worker.process.pid} died`);
  cluster.fork(); // Spawn replacement
});
```

### Q3: How do you share state across cluster workers?

**Answer:**
Workers don't share memory. Use external state management:
- **Redis** for sessions and cache
- **Database** for persistent data
- **Message queues** for task coordination
- **IPC** for master-worker communication

### Q4: PM2 vs Cluster module - when to use each?

**Answer:**
- **Cluster module**: Fine-grained control, custom logic, small deployments
- **PM2**: Production-ready, zero-downtime deploys, monitoring, enterprise features

## Best Practices

```javascript
// 1. Match workers to CPU cores
const numWorkers = os.cpus().length;

// 2. Implement graceful shutdown
process.on('SIGTERM', gracefulShutdown);

// 3. Auto-restart crashed workers
cluster.on('exit', (worker) => {
  if (!worker.exitedAfterDisconnect) {
    cluster.fork();
  }
});

// 4. Use PM2 in production
// pm2 start app.js -i max

// 5. Monitor worker health
setInterval(checkWorkerHealth, 30000);

// 6. Implement health checks
app.get('/health', healthCheckHandler);

// 7. Use load balancer for multiple servers
// NGINX, AWS ALB, etc.
```

## Summary

**Key Takeaways:**
- Clustering utilizes multiple CPU cores
- Each worker is an independent process
- Master process manages workers
- Round-robin load balancing by default
- PM2 recommended for production
- Use Redis for shared state
- Implement graceful shutdown
- Monitor worker health
- Use load balancers for horizontal scaling

## Related Topics
- [Child Processes](./07-child-processes.md)
- [Performance Optimization](./05-performance.md)
- [Deployment](../DevOps/09-deployment.md)

## Resources
- [Node.js Cluster Documentation](https://nodejs.org/api/cluster.html)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Scaling Node.js Applications](https://nodejs.org/en/docs/guides/scaling-node-apps/)
