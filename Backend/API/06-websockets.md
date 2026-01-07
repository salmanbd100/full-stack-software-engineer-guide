# WebSockets

## Overview

WebSockets provide full-duplex, bidirectional communication between client and server over a single TCP connection. Unlike HTTP request-response, WebSockets enable real-time, persistent connections.

**Key Principle:** Use WebSockets for real-time, bidirectional communication where server needs to push data to clients immediately.

---

## 🎯 WebSockets vs HTTP vs SSE

| Feature | HTTP | WebSockets | Server-Sent Events (SSE) |
|---------|------|------------|--------------------------|
| **Direction** | Request-Response only | Bidirectional | Server to Client only |
| **Connection** | New connection per request | Persistent connection | Persistent connection |
| **Overhead** | High (headers every request) | Low (single handshake) | Medium |
| **Browser Support** | Universal | Modern browsers | Modern browsers |
| **Complexity** | Simple | Complex | Simple |
| **Use Case** | CRUD operations | Chat, gaming, collaboration | Notifications, live feeds |
| **Scaling** | Easy (stateless) | Hard (stateful) | Medium |

**When to Use:**

**✅ WebSockets:**
- Chat applications
- Real-time multiplayer games
- Collaborative editing (Google Docs style)
- Live trading platforms
- Real-time dashboards with user interaction

**✅ HTTP (REST):**
- CRUD operations
- API calls
- File uploads/downloads
- Traditional web apps

**✅ Server-Sent Events (SSE):**
- Live notifications
- News feeds
- Stock price updates
- Server-to-client only updates

---

## 📐 WebSocket Protocol Basics

### Handshake (HTTP Upgrade)

**Client Request:**
```http
GET /ws HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

**Server Response:**
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

After handshake, connection stays open for bidirectional communication.

---

## 💻 Implementation

### 1. Native WebSocket (JavaScript)

**Server (Node.js + ws library):**
```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  console.log('Client connected');

  // Send welcome message
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }));

  // Receive messages
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Received:', message);

    // Echo back
    ws.send(JSON.stringify({ type: 'echo', data: message }));
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log('WebSocket server running on ws://localhost:8080');
```

**Client (Browser):**
```javascript
const ws = new WebSocket('ws://localhost:8080');

// Connection opened
ws.addEventListener('open', (event) => {
  console.log('Connected to server');
  ws.send(JSON.stringify({ type: 'greeting', message: 'Hello Server!' }));
});

// Listen for messages
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Message from server:', data);
});

// Connection closed
ws.addEventListener('close', (event) => {
  console.log('Disconnected from server');
});

// Handle errors
ws.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});

// Send message
function sendMessage(message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
```

---

### 2. Socket.io (Recommended for Production)

**Why Socket.io?**
- ✅ Automatic reconnection
- ✅ Fallback to HTTP long-polling
- ✅ Built-in rooms and namespaces
- ✅ Broadcasting
- ✅ Better error handling
- ✅ Acknowledgments

**Server (Express + Socket.io):**
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room ${room}`);

    // Notify others in room
    socket.to(room).emit('user_joined', {
      userId: socket.id,
      message: `User ${socket.id} joined the room`,
    });
  });

  // Receive message
  socket.on('send_message', (data) => {
    // Broadcast to room
    io.to(data.room).emit('receive_message', {
      userId: socket.id,
      message: data.message,
      timestamp: new Date(),
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

**Client (React + Socket.io):**
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

function Chat() {
  const [room, setRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Listen for messages
    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('user_joined', (data) => {
      setMessages((prev) => [...prev, { message: data.message, system: true }]);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_joined');
    };
  }, []);

  const joinRoom = () => {
    if (room) {
      socket.emit('join_room', room);
    }
  };

  const sendMessage = () => {
    if (message && room) {
      socket.emit('send_message', { room, message });
      setMessage('');
    }
  };

  return (
    <div>
      <input
        value={room}
        onChange={(e) => setRoom(e.target.value)}
        placeholder="Room name"
      />
      <button onClick={joinRoom}>Join Room</button>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.system ? 'system' : ''}>
            {msg.userId && <strong>{msg.userId}:</strong>} {msg.message}
          </div>
        ))}
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message"
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default Chat;
```

---

### 3. Python (FastAPI + WebSockets)

**Server:**
```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await manager.connect(websocket)
    try:
        # Send welcome message
        await manager.send_personal_message(f"Welcome #{client_id}!", websocket)

        # Broadcast join
        await manager.broadcast(f"Client #{client_id} joined the chat")

        # Listen for messages
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Client #{client_id}: {data}")

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"Client #{client_id} left the chat")
```

**Client (JavaScript):**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/123');

ws.onopen = () => {
  console.log('Connected');
  ws.send('Hello from client!');
};

ws.onmessage = (event) => {
  console.log('Message:', event.data);
};
```

---

## 🌐 Scaling WebSockets

### Problem: Sticky Sessions Required

**Issue:** WebSocket connections are stateful. With multiple servers, client must connect to same server each time.

```
Load Balancer
      ├── Server 1 (Client A connected)
      ├── Server 2 (Client B connected)
      └── Server 3 (Client C connected)

If Client A's message goes to Server 2, Server 2 can't deliver it!
```

### Solution 1: Sticky Sessions (IP Hash)

```nginx
# Nginx
upstream websocket {
    ip_hash;  # Same IP always goes to same server
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
```

**Pros:** Simple
**Cons:** Uneven load distribution, doesn't work behind proxies

### Solution 2: Redis Adapter (Recommended)

**Use Redis as message broker between servers:**

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});

// Now messages broadcast across all servers
io.emit('message', 'This reaches all clients on all servers!');
```

**How it works:**
```
Server 1 ──┐
Server 2 ──┼──> Redis Pub/Sub ──> All Servers receive message
Server 3 ──┘
```

**Python (FastAPI with Redis):**
```python
import redis
import json
from fastapi import WebSocket

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
pubsub = redis_client.pubsub()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        pubsub.subscribe('broadcast_channel')

    async def broadcast_via_redis(self, message: str):
        redis_client.publish('broadcast_channel', message)

    async def listen_to_redis(self):
        for message in pubsub.listen():
            if message['type'] == 'message':
                await self.broadcast(message['data'])
```

---

## 🔒 Security Best Practices

### 1. Authentication

**Socket.io with JWT:**
```javascript
// Server
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = user; // Attach user to socket
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.id} connected`);
});
```

**Client:**
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your_jwt_token_here',
  },
});
```

### 2. Rate Limiting

```javascript
const rateLimit = new Map();

io.on('connection', (socket) => {
  socket.on('send_message', (data) => {
    const userId = socket.user.id;
    const now = Date.now();

    // Allow 10 messages per 10 seconds
    if (!rateLimit.has(userId)) {
      rateLimit.set(userId, []);
    }

    const timestamps = rateLimit.get(userId);
    const recentMessages = timestamps.filter(ts => now - ts < 10000);

    if (recentMessages.length >= 10) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    recentMessages.push(now);
    rateLimit.set(userId, recentMessages);

    // Process message
    io.to(data.room).emit('receive_message', data);
  });
});
```

### 3. Input Validation

```javascript
const Joi = require('joi');

const messageSchema = Joi.object({
  room: Joi.string().alphanum().min(3).max(30).required(),
  message: Joi.string().max(500).required(),
});

socket.on('send_message', (data) => {
  const { error } = messageSchema.validate(data);

  if (error) {
    socket.emit('error', { message: error.details[0].message });
    return;
  }

  // Process valid message
  io.to(data.room).emit('receive_message', data);
});
```

### 4. CORS Configuration

```javascript
const io = new Server(server, {
  cors: {
    origin: ['https://myapp.com', 'https://admin.myapp.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

---

## 🎤 Common Interview Questions

### Q1: Explain how WebSockets work and how they differ from HTTP.

**Answer:**

**HTTP (Request-Response):**
```
Client → Request → Server
Client ← Response ← Server
(Connection closes)
```

**WebSocket (Persistent Connection):**
```
Client → HTTP Upgrade Request → Server
Client ← 101 Switching Protocols ← Server
(Connection stays open)
Client ⇄ Bidirectional messages ⇄ Server
```

**Key Differences:**

| Aspect | HTTP | WebSocket |
|--------|------|-----------|
| **Connection** | New connection per request | Single persistent connection |
| **Direction** | Client initiates | Either can initiate |
| **Overhead** | ~800 bytes headers per request | ~2 bytes per message |
| **Latency** | Higher (new TCP/TLS handshake) | Lower (connection reused) |
| **State** | Stateless | Stateful |

**Interview Tip:** Mention that WebSockets start with HTTP upgrade handshake, then switch to WebSocket protocol.

---

### Q2: How do you scale WebSocket servers across multiple instances?

**Answer:**

**Challenge:** WebSocket connections are stateful and tied to specific server instance.

**Solutions:**

**1. Sticky Sessions (Simple but Limited)**
```nginx
upstream ws {
    ip_hash;  # Same client IP → same server
    server app1:3000;
    server app2:3000;
}
```

**Pros:** Simple
**Cons:** Uneven distribution, fails if server goes down

**2. Redis Adapter (Production Solution)**
```javascript
// All servers subscribe to Redis pub/sub
io.adapter(createAdapter(pubClient, subClient));

// Message sent on Server 1
io.emit('message', 'Hello');

// Redis broadcasts to all servers
// All connected clients receive message
```

**How it works:**
```
Server 1 (Client A, B) ──┐
Server 2 (Client C, D) ──┼─→ Redis Pub/Sub
Server 3 (Client E, F) ──┘
         ↓
All clients A-F receive message
```

**3. Message Queue (RabbitMQ, Kafka)**
- Similar to Redis but more features
- Better for high-volume systems

**Interview Tip:** Emphasize that Redis adapter is industry standard for Socket.io scaling.

---

### Q3: When would you choose WebSockets vs Server-Sent Events (SSE)?

**Answer:**

| Feature | WebSockets | SSE |
|---------|------------|-----|
| **Direction** | Bidirectional | Server → Client only |
| **Use Case** | Chat, gaming, collaboration | Notifications, live feeds |
| **Complexity** | More complex | Simpler |
| **Connection** | WebSocket protocol | Regular HTTP |
| **Reconnection** | Manual (or use Socket.io) | Automatic |
| **Browser Support** | All modern | All modern (no IE) |

**Choose WebSockets when:**
- ✅ Need client-to-server real-time messages
- ✅ Building chat, gaming, collaboration tools
- ✅ High-frequency bidirectional communication

**Choose SSE when:**
- ✅ Only server needs to push to client
- ✅ Live notifications, stock tickers, news feeds
- ✅ Simpler implementation preferred
- ✅ HTTP infrastructure (easier to scale)

**Example Comparison:**

**WebSocket (Chat):**
```javascript
// Client sends and receives
socket.emit('message', 'Hello');
socket.on('message', (data) => { /* ... */ });
```

**SSE (Notifications):**
```javascript
// Client only receives
const es = new EventSource('/api/notifications');
es.onmessage = (event) => {
  console.log('Notification:', event.data);
};
```

**Interview Tip:** Mention that SSE is often overlooked but perfect for one-way communication.

---

### Q4: How do you handle WebSocket reconnection?

**Answer:**

**Problem:** Network issues cause disconnections. Need automatic reconnection.

**Socket.io (Built-in):**
```javascript
const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('connect', () => {
  console.log('Connected');
});

socket.on('disconnect', () => {
  console.log('Disconnected - will auto-reconnect');
});
```

**Native WebSocket (Manual):**
```javascript
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = () => {
      console.log('Disconnected');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts; // Exponential backoff

      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket not connected');
    }
  }

  handleMessage(data) {
    console.log('Message received:', JSON.parse(data));
  }
}

const client = new WebSocketClient('ws://localhost:8080');
```

**Interview Tip:** Mention exponential backoff to avoid overwhelming the server during reconnection storms.

---

## ✅ Key Takeaways

1. **WebSockets enable bidirectional real-time communication** - unlike HTTP request-response
2. **Use Socket.io for production** - auto-reconnection, rooms, broadcasting, fallbacks
3. **Scaling requires Redis adapter** - synchronize messages across multiple servers
4. **Authenticate on connection** - verify JWT before accepting WebSocket
5. **Rate limit messages** - prevent abuse (e.g., 10 messages per 10 seconds)
6. **Choose wisely:** WebSockets for bidirectional, SSE for server-to-client only
7. **Handle reconnection gracefully** - exponential backoff, max attempts
8. **Validate all input** - treat WebSocket messages like HTTP requests
9. **CORS matters** - configure allowed origins properly
10. **Monitor connection count** - WebSockets are stateful and consume memory

---

[← Back: API Documentation](./05-documentation.md) | [Back to Backend](../README.md)
