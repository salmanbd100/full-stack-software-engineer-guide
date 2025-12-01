# Redis Caching

## Overview
Redis is an in-memory data structure store used as cache, message broker, and database.

## Data Types

```javascript
// String
await redis.set('key', 'value', 'EX', 3600);  // Expires in 1 hour
const value = await redis.get('key');

// Hash
await redis.hset('user:1', 'name', 'John', 'email', 'john@example.com');
const user = await redis.hgetall('user:1');

// List
await redis.lpush('queue', 'task1');
const task = await redis.rpop('queue');

// Set
await redis.sadd('tags', 'nodejs', 'javascript');
const tags = await redis.smembers('tags');

// Sorted Set
await redis.zadd('leaderboard', 100, 'player1', 200, 'player2');
const top = await redis.zrange('leaderboard', 0, 9, 'WITHSCORES');
```

## Caching Strategies

### 1. Cache-Aside
```javascript
async function getUser(id) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);
  
  const user = await User.findById(id);
  await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
  return user;
}
```

### 2. Write-Through
```javascript
async function updateUser(id, data) {
  const user = await User.findByIdAndUpdate(id, data, { new: true });
  await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
  return user;
}
```

## Pub/Sub

```javascript
// Publisher
await redis.publish('notifications', JSON.stringify({ message: 'Hello' }));

// Subscriber
redis.subscribe('notifications');
redis.on('message', (channel, message) => {
  console.log(`Received: ${message}`);
});
```

## Use Cases

- Session storage
- Rate limiting
- Real-time analytics
- Leaderboards
- Message queues
- Caching

---

[← Previous: Mongoose](./05-mongoose.md) | [Back to Backend →](../README.md)
