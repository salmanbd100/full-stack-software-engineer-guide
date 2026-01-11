# Real-Time Features

## Overview
Real-time features enable instant data synchronization between server and client, critical for chat applications, collaborative editing, live dashboards, and notifications. Choosing the right technology depends on requirements, scale, and infrastructure.

## Technologies Comparison

Comparison of different real-time communication technologies to help choose the right approach based on requirements.

### Communication Protocols

| Protocol | Bi-directional | Full-duplex | Browser Support | Use Case |
|----------|---------------|-------------|-----------------|----------|
| WebSocket | Yes | Yes | Excellent | Chat, gaming, collaboration |
| SSE | No (server�client) | No | Good | Notifications, feeds |
| Long Polling | No | No | Universal | Fallback, simple updates |
| HTTP/2 Server Push | No | No | Limited | Asset optimization |

## 💡 **WebSockets**

Full-duplex communication protocol enabling persistent, bidirectional connections for low-latency real-time data exchange.

### Basic Implementation

**Why WebSockets?**
Traditional HTTP is request-response: client asks, server responds. For real-time features, this means constant polling (inefficient) or long-polling (complex). WebSockets establish a persistent, bidirectional connection allowing both client and server to send messages anytime.

**WebSocket Lifecycle:**
1. **Handshake**: HTTP upgrade request from client
2. **Connection**: Established WebSocket connection
3. **Communication**: Both sides send/receive messages freely
4. **Close**: Either side can close connection

**When to Use WebSockets:**
✅ Chat applications (instant messaging)
✅ Live collaboration (Google Docs-style)
✅ Real-time gaming
✅ Live dashboards (stock prices, analytics)
✅ Notifications requiring instant delivery

**When NOT to Use:**
❌ Simple one-way updates (use SSE)
❌ Infrequent updates (use polling)
❌ RESTful APIs (use HTTP)

**Production Considerations:**
For production, you need:
- Automatic reconnection on disconnect
- Exponential backoff to prevent server overload
- Heartbeat/ping to detect dead connections
- Message queuing for offline periods
- Authentication and authorization

Client-side WebSocket class with automatic reconnection and exponential backoff for production reliability.

```javascript
// Client-side WebSocket
class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = {};
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data.payload);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.emit('disconnected');
      this.reconnect();
    };
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max-reconnect-attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket not connected');
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage
const wsClient = new WebSocketClient('ws://localhost:8080');
wsClient.connect();

wsClient.on('message', (data) => {
  console.log('New message:', data);
});

wsClient.send('message', { text: 'Hello!' });
```

### React WebSocket Hook

Custom React hook encapsulating WebSocket connection lifecycle and event handling for reusable real-time functionality.

```javascript
import { useEffect, useRef, useCallback } from 'react';

function useWebSocket(url) {
  const ws = useRef(null);
  const listenersRef = useRef({});

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('Connected');
      emit('connected');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      emit(data.type, data.payload);
    };

    ws.current.onerror = (error) => {
      console.error('Error:', error);
      emit('error', error);
    };

    ws.current.onclose = () => {
      console.log('Disconnected');
      emit('disconnected');
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  const emit = (event, data) => {
    if (listenersRef.current[event]) {
      listenersRef.current[event].forEach(cb => cb(data));
    }
  };

  const on = useCallback((event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);
  }, []);

  const send = useCallback((type, payload) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  return { send, on };
}

// Usage in component
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  const { send, on } = useWebSocket(`ws://localhost:8080/chat/${roomId}`);

  useEffect(() => {
    on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    on('user-joined', (user) => {
      console.log(`${user.name} joined`);
    });
  }, [on]);

  const sendMessage = (text) => {
    send('message', { text, roomId });
  };

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### Server Implementation (Node.js)

Node.js server handling multiple WebSocket connections with heartbeat mechanism for detecting broken connections.

```javascript
// Using ws library
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = generateId();
  clients.set(clientId, ws);

  console.log(`Client ${clientId} connected`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(clientId, data);
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error(`Client ${clientId} error:`, error);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    payload: { clientId }
  }));
});

function handleMessage(clientId, data) {
  const { type, payload } = data;

  switch (type) {
    case 'message':
      // Broadcast to all clients
      broadcast({
        type: 'message',
        payload: {
          ...payload,
          from: clientId,
          timestamp: Date.now()
        }
      });
      break;

    case 'private-message':
      // Send to specific client
      const targetWs = clients.get(payload.to);
      if (targetWs) {
        targetWs.send(JSON.stringify({
          type: 'private-message',
          payload: {
            text: payload.text,
            from: clientId
          }
        }));
      }
      break;
  }
}

function broadcast(data, excludeId = null) {
  const message = JSON.stringify(data);

  clients.forEach((ws, clientId) => {
    if (clientId !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Heartbeat to detect broken connections
function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});
```

## Server-Sent Events (SSE)

Lightweight unidirectional protocol for server-to-client real-time updates using standard HTTP connections.

### Client Implementation

SSE client wrapper providing event subscription and automatic reconnection with minimal browser API complexity.

```javascript
class SSEClient {
  constructor(url) {
    this.url = url;
    this.eventSource = null;
    this.listeners = {};
  }

  connect() {
    this.eventSource = new EventSource(this.url);

    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.emit('connected');
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      this.emit('error', error);

      // EventSource automatically reconnects
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  on(event, callback) {
    // Custom event types
    if (event !== 'message' && event !== 'connected' && event !== 'error') {
      this.eventSource.addEventListener(event, (e) => {
        callback(JSON.parse(e.data));
      });
      return;
    }

    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// Usage
const sseClient = new SSEClient('/api/events');
sseClient.connect();

sseClient.on('notification', (notification) => {
  console.log('New notification:', notification);
});

sseClient.on('stock-update', (stock) => {
  console.log('Stock price:', stock);
});
```

### React SSE Hook

React hook for consuming server-sent events with automatic cleanup and state management.

```javascript
import { useEffect, useState } from 'react';

function useSSE(url, eventType = 'message') {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = (err) => {
      setError(err);
      setIsConnected(false);
    };

    const handleEvent = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
      } catch (err) {
        setError(err);
      }
    };

    if (eventType === 'message') {
      eventSource.onmessage = handleEvent;
    } else {
      eventSource.addEventListener(eventType, handleEvent);
    }

    return () => {
      eventSource.close();
    };
  }, [url, eventType]);

  return { data, error, isConnected };
}

// Usage
function StockTicker() {
  const { data, error, isConnected } = useSSE('/api/stock-prices', 'price-update');

  if (error) return <div>Error: {error.message}</div>;
  if (!isConnected) return <div>Connecting...</div>;

  return (
    <div>
      <h3>{data?.symbol}</h3>
      <p>${data?.price}</p>
    </div>
  );
}
```

### Server Implementation (Express)

Express server streaming events to clients with proper SSE headers and connection management.

```javascript
const express = require('express');
const app = express();

app.get('/api/events', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial message
  res.write(`data: ${JSON.stringify({ message: 'Connected' })}\n\n`);

  // Send updates every 5 seconds
  const interval = setInterval(() => {
    const data = {
      timestamp: Date.now(),
      value: Math.random()
    };

    res.write(`event: update\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 5000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

// Notification stream
const subscribers = new Set();

app.get('/api/notifications', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  subscribers.add(res);

  req.on('close', () => {
    subscribers.delete(res);
  });
});

function sendNotification(notification) {
  const message = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;

  subscribers.forEach(res => {
    res.write(message);
  });
}

app.listen(3000);
```

## Long Polling

Fallback technique simulating real-time updates through sequential HTTP requests with server-side waiting.

```javascript
class LongPollingClient {
  constructor(url) {
    this.url = url;
    this.isPolling = false;
    this.abortController = null;
    this.listeners = {};
  }

  async startPolling() {
    this.isPolling = true;

    while (this.isPolling) {
      try {
        this.abortController = new AbortController();

        const response = await fetch(this.url, {
          signal: this.abortController.signal
        });

        if (response.ok) {
          const data = await response.json();
          this.emit('data', data);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Polling error:', error);
          this.emit('error', error);

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
  }

  stopPolling() {
    this.isPolling = false;
    this.abortController?.abort();
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

// Server implementation
app.get('/api/poll', async (req, res) => {
  const timeout = 30000; // 30 seconds
  const startTime = Date.now();

  // Wait for new data or timeout
  while (Date.now() - startTime < timeout) {
    const newData = await checkForNewData(req.query.lastId);

    if (newData) {
      return res.json(newData);
    }

    // Wait briefly before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Timeout - send empty response
  res.json({ data: [] });
});
```

## Socket.IO

Popular real-time library providing WebSocket-like API with automatic fallbacks and enhanced features like rooms and namespaces.

```javascript
// Client
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],  // Try WebSocket first
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

socket.on('message', (data) => {
  console.log('Message:', data);
});

// Emit event
socket.emit('send-message', { text: 'Hello!' });

// Join room
socket.emit('join-room', 'room-123');

// Server
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    // Notify room
    io.to(roomId).emit('user-joined', {
      userId: socket.id
    });
  });

  socket.on('send-message', (data) => {
    // Broadcast to room
    socket.to(data.roomId).emit('message', {
      ...data,
      from: socket.id,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(3000);
```

## Real-Time Use Cases

Practical implementations of real-time features for common application scenarios like chat, notifications, and collaboration.

### Live Chat

Complete chat room implementation with WebSocket connections, message history, and user presence tracking.

```javascript
// React chat component
function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io('http://localhost:3000');

    socketRef.current.emit('join-room', roomId);

    socketRef.current.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socketRef.current.on('user-joined', (user) => {
      setMessages(prev => [...prev, {
        type: 'system',
        text: `${user.name} joined`
      }]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId]);

  const sendMessage = () => {
    if (!input.trim()) return;

    socketRef.current.emit('send-message', {
      roomId,
      text: input
    });

    setMessages(prev => [...prev, {
      text: input,
      from: 'me',
      timestamp: Date.now()
    }]);

    setInput('');
  };

  return (
    <div className="chat-room">
      <div className="messages">
        {messages.map((msg, i) => (
          <Message key={i} {...msg} />
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

### Live Notifications

Real-time notification center using SSE to push updates and browser notifications for desktop alerts.

```javascript
function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/notifications');

    eventSource.addEventListener('notification', (e) => {
      const notification = JSON.parse(e.data);
      setNotifications(prev => [notification, ...prev]);

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon.png'
        });
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      {notifications.map(notif => (
        <div key={notif.id} className="notification">
          <h4>{notif.title}</h4>
          <p>{notif.message}</p>
        </div>
      ))}
    </div>
  );
}
```

### Collaborative Editing

Google Docs-style collaborative editor using operational transforms to merge concurrent edits from multiple users.

```javascript
// Operational Transform for collaborative editing
function CollaborativeEditor({ documentId }) {
  const [content, setContent] = useState('');
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io('http://localhost:3000');

    socketRef.current.emit('join-document', documentId);

    socketRef.current.on('document-update', (operation) => {
      // Apply operation to local content
      const newContent = applyOperation(content, operation);
      setContent(newContent);
    });

    socketRef.current.on('initial-content', (initialContent) => {
      setContent(initialContent);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [documentId]);

  const handleChange = (newContent) => {
    const operation = generateOperation(content, newContent);

    // Optimistic update
    setContent(newContent);

    // Send to server
    socketRef.current.emit('edit', {
      documentId,
      operation
    });
  };

  return (
    <textarea
      value={content}
      onChange={e => handleChange(e.target.value)}
    />
  );
}
```

## Interview Questions

**Q: When would you use WebSockets vs SSE?**

A:
- **WebSockets**: Bidirectional communication needed (chat, gaming, collaboration)
- **SSE**: Server-to-client only (notifications, live feeds, dashboards)

WebSockets have more overhead but support bidirectional messaging. SSE is simpler for one-way communication and automatically reconnects.

**Q: How do you handle reconnection in WebSockets?**

A: Implement exponential backoff:
1. Track reconnection attempts
2. Increase delay exponentially (1s, 2s, 4s, 8s...)
3. Cap maximum delay (e.g., 30s)
4. Set maximum attempts limit
5. Resume state after reconnection

**Q: What are the challenges with real-time at scale?**

A:
- **Connection management**: Thousands of concurrent connections
- **Message ordering**: Ensure messages arrive in order
- **State synchronization**: Keep clients in sync
- **Server resources**: WebSockets keep connections open
- **Load balancing**: Sticky sessions or pub/sub

Solutions: Redis pub/sub, horizontal scaling, WebSocket gateways

**Q: How do you optimize real-time performance?**

A:
1. **Message batching**: Combine multiple updates
2. **Throttling**: Limit update frequency
3. **Binary protocols**: Use MessagePack vs JSON
4. **Compression**: Enable WebSocket compression
5. **CDN for static**: Reduce server load
6. **Connection pooling**: Reuse connections

## Best Practices

**Connection Management:**
- Implement heartbeat/ping-pong
- Handle reconnection gracefully
- Clean up on component unmount
- Manage connection state

**Message Handling:**
- Validate message format
- Handle malformed messages
- Implement message acknowledgment
- Use unique message IDs

**Performance:**
- Batch updates when possible
- Throttle high-frequency events
- Use binary protocols for large data
- Implement message compression

**Security:**
- Authenticate connections
- Validate message origin
- Sanitize user input
- Rate limit messages

## Summary

- WebSockets: Bidirectional, full-duplex, best for chat/collaboration
- SSE: Server-to-client, simpler, auto-reconnect, best for notifications
- Long Polling: Fallback, highest latency, widest compatibility
- Socket.IO: High-level abstraction with fallbacks
- Choose based on: direction of data flow, scale, latency requirements
- Always handle reconnection and error cases

---
[� Back to SystemDesign](../README.md)
