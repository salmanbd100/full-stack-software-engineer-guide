# System Design Basics

## Overview
System design is the process of defining architecture, components, modules, interfaces, and data for a system to satisfy specified requirements. It bridges the gap between business requirements and technical implementation.

## Core Principles

### 💡 **Functional Requirements**

What the system must do - specific features and capabilities.

**Examples:**
- **Twitter**: Users can post tweets, follow other users, view timeline
- **Uber**: Users can book rides, drivers can accept rides, track location
- **YouTube**: Users can upload videos, watch videos, like/comment
- **E-commerce**: Users can browse products, add to cart, checkout

**Questions to Ask:**
```
- What features are we building?
- Who are the users?
- What are the core use cases?
- What user actions should we support?
- What's the MVP vs nice-to-have features?
```

### 💡 **Non-Functional Requirements**

How the system should perform - quality attributes.

**Key Attributes:**

| Attribute | Description | Target Metrics |
|-----------|-------------|----------------|
| **Scalability** | Handle growing users/data | 1M → 100M users, GB → PB |
| **Performance** | Response time & throughput | < 200ms API, < 2s page load, 10K req/s |
| **Availability** | System uptime | 99.9% (43 min/month), 99.99% (4.3 min/month), 99.999% (26 sec/month) |
| **Reliability** | Correct under failures | No data loss, ACID transactions, graceful degradation |
| **Consistency** | Data correctness | Strong/Eventual/Causal consistency |
| **Maintainability** | Easy updates/debugging | Clear structure, good logging, easy deployment |

## Basic Components

### Client-Server Architecture

Foundation of most distributed systems.

```
┌──────────┐          ┌──────────┐
│  Client  │ ────────▶│  Server  │
│ (Browser)│ ◀────────│  (API)   │
└──────────┘          └──────────┘
     │                      │
     │                      │
     ▼                      ▼
  Request               Response
  (HTTP)                (JSON)
```

**Characteristics:**
- **Client**: Initiates requests (browser, mobile app)
- **Server**: Processes requests, returns responses
- **Stateless**: Each request is independent
- **Scalable**: Add more servers as needed

### Three-Tier Architecture

Separation of concerns into layers.

```
┌─────────────────────┐
│  Presentation Layer │  (UI/Frontend)
│  - Web/Mobile UI    │  React, Angular, iOS
└─────────────────────┘
         ↕
┌─────────────────────┐
│   Business Layer    │  (Application/Backend)
│  - Business Logic   │  Node.js, Java, Python
│  - API Endpoints    │
└─────────────────────┘
         ↕
┌─────────────────────┐
│     Data Layer      │  (Database)
│  - Data Storage     │  PostgreSQL, MongoDB
│  - Data Access      │  Redis, S3
└─────────────────────┘
```

**Benefits:**
- **Separation of Concerns**: Each layer has specific responsibility
- **Independent Scaling**: Scale layers independently
- **Maintainability**: Changes in one layer don't affect others
- **Reusability**: Business logic can serve multiple clients

### Load Balancer

Distributes traffic across multiple servers.

```
                    ┌──────────────┐
        ┌───────────│ Load Balancer│───────────┐
        │           └──────────────┘           │
        │                  │                   │
        ▼                  ▼                   ▼
   ┌─────────┐       ┌─────────┐         ┌─────────┐
   │ Server 1│       │ Server 2│         │ Server 3│
   └─────────┘       └─────────┘         └─────────┘
```

**Algorithms:**
- **Round Robin**: Distribute evenly in rotation
- **Least Connections**: Send to server with fewest connections
- **IP Hash**: Same client → same server
- **Weighted**: Based on server capacity

**Benefits:**
- **High Availability**: If one server fails, others handle traffic
- **Scalability**: Add more servers behind LB
- **Performance**: Distribute load evenly

### Database

Persistent data storage.

**Types:**

1. **Relational (SQL)**
   - Structured data with relationships
   - ACID transactions
   - Examples: PostgreSQL, MySQL

2. **NoSQL**
   - **Document**: JSON-like (MongoDB, CouchDB)
   - **Key-Value**: Simple lookups (Redis, DynamoDB)
   - **Column-Family**: Wide tables (Cassandra, HBase)
   - **Graph**: Relationships (Neo4j, Amazon Neptune)

**Comparison:**
```
Use SQL when:
- Structured data with relationships
- Need ACID transactions
- Complex queries and joins
- Data integrity is critical

Use NoSQL when:
- Flexible schema needed
- Horizontal scaling required
- High write throughput
- Simple query patterns
```

### Cache

Fast, temporary storage layer.

```
Client → Cache → Database
         ✓ Hit     ✗ Miss
         (fast)    (slow)
```

**Strategies:**

1. **Cache-Aside (Lazy Loading)**
   ```
   if (data in cache):
       return cached data
   else:
       fetch from DB
       store in cache
       return data
   ```

2. **Write-Through**
   ```
   write to cache
   write to database (sync)
   ```

3. **Write-Back**
   ```
   write to cache
   write to database (async, batched)
   ```

**Popular Solutions:**
- **Redis**: In-memory key-value store
- **Memcached**: Distributed memory cache
- **CDN**: Geographic content caching (Cloudflare, CloudFront)

### Message Queue

Asynchronous communication between services.

```
Producer → Queue → Consumer
(Service A)  ↓   (Service B)
           Buffer
         (decoupling)
```

**Use Cases:**
- **Email Sending**: Don't block user registration
- **Image Processing**: Resize uploads asynchronously
- **Order Processing**: Handle payment, inventory, shipping separately
- **Analytics**: Log events without slowing requests

**Popular Tools:**
- **RabbitMQ**: Flexible routing
- **Apache Kafka**: High throughput, event streaming
- **AWS SQS**: Managed queue service
- **Redis Pub/Sub**: Simple messaging

## Data Flow Patterns

### Request-Response

Synchronous communication.

```
Client ──request──▶ Server
       ◀─response──
```

**Characteristics:**
- **Synchronous**: Client waits for response
- **Direct**: Point-to-point communication
- **Simple**: Easy to understand and debug

**Use Cases:**
- REST APIs
- GraphQL queries
- Database queries

### Event-Driven

Asynchronous, loosely coupled.

```
Service A ──event──▶ Event Bus ──▶ Service B
                          │         Service C
                          └───────▶ Service D
```

**Characteristics:**
- **Asynchronous**: Fire and forget
- **Decoupled**: Services don't know about each other
- **Scalable**: Easy to add new consumers

**Use Cases:**
- Microservices communication
- Real-time notifications
- Analytics pipelines

### Streaming

Continuous data flow.

```
Producer ──stream──▶ Processor ──▶ Consumer
         (real-time)    (transform)
```

**Use Cases:**
- Real-time analytics
- Log aggregation
- IoT data processing
- Stock price updates

## API Design Patterns

### REST (Representational State Transfer)

Resource-based API design.

```
GET    /users          # List users
GET    /users/123      # Get user
POST   /users          # Create user
PUT    /users/123      # Update user
DELETE /users/123      # Delete user
```

**Principles:**
- **Stateless**: Each request is independent
- **Resource-Based**: URLs represent resources
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Status Codes**: 200 OK, 404 Not Found, 500 Error

### GraphQL

Query language for APIs.

```graphql
query {
  user(id: "123") {
    name
    email
    posts {
      title
      comments {
        text
      }
    }
  }
}
```

**Advantages:**
- **Flexible Queries**: Client specifies exactly what it needs
- **No Over-fetching**: Get only required data
- **Single Endpoint**: One URL for all queries
- **Strong Typing**: Schema defines structure

**Disadvantages:**
- **Complexity**: More complex than REST
- **Caching**: Harder to cache than REST
- **Learning Curve**: New paradigm

### gRPC

High-performance RPC framework.

```protobuf
service UserService {
  rpc GetUser(UserId) returns (User) {}
  rpc ListUsers(Empty) returns (UserList) {}
}
```

**Advantages:**
- **Performance**: Binary protocol (Protocol Buffers)
- **Type Safety**: Strongly typed
- **Streaming**: Built-in support
- **Code Generation**: Auto-generate client/server code

**Use Cases:**
- Microservices communication
- Internal APIs
- Mobile to backend (efficient bandwidth)

## Common Interview Questions

**Q: What's the difference between horizontal and vertical scaling?**

A:
- **Vertical Scaling (Scale Up)**: Add more power to existing machine (CPU, RAM)
  - Pros: Simple, no code changes
  - Cons: Hardware limits, expensive, single point of failure
  - Example: Upgrade from 8GB RAM → 64GB RAM

- **Horizontal Scaling (Scale Out)**: Add more machines
  - Pros: No limits, cheaper commodity hardware, redundancy
  - Cons: Complexity, need load balancer, data consistency
  - Example: Add 10 more servers

**Q: What is a CDN and why use it?**

A: Content Delivery Network - globally distributed servers that cache static content.

**Benefits:**
- **Performance**: Serve from nearest location
- **Reduced Load**: Less traffic to origin server
- **DDoS Protection**: Distribute attack across network
- **Cost**: Cheaper bandwidth

**Use Cases:**
- Images, videos, CSS, JavaScript
- Streaming content
- API responses (with proper headers)

**Q: Explain the difference between SQL and NoSQL databases.**

A:
**SQL (Relational):**
- Structured schema
- ACID transactions
- Vertical scaling
- Complex joins
- Examples: PostgreSQL, MySQL

**NoSQL:**
- Flexible schema
- BASE (Basically Available, Soft state, Eventually consistent)
- Horizontal scaling
- Denormalized data
- Examples: MongoDB, Cassandra, Redis

**Choose SQL for:** Banking, e-commerce transactions, complex reporting
**Choose NoSQL for:** Social media feeds, real-time analytics, user profiles

**Q: What is database sharding?**

A: Splitting database into smaller, faster pieces across multiple servers.

```
Users 1-1M    → Shard 1
Users 1M-2M   → Shard 2
Users 2M-3M   → Shard 3
```

**Sharding Strategies:**
- **Range-based**: ID ranges
- **Hash-based**: Hash(user_id) % num_shards
- **Geographic**: By region
- **Directory-based**: Lookup table

**Challenges:**
- **Joins**: Across shards are difficult
- **Rebalancing**: Moving data between shards
- **Consistency**: Distributed transactions

## System Design Process

### 1. Requirements (5 minutes)

**Functional:**
- What features?
- What user actions?
- What's the core use case?

**Non-Functional:**
- Scale (users, requests, data)?
- Performance requirements?
- Availability requirements?

### 2. Capacity Estimation (5 minutes)

Calculate:
- **Storage**: Data size × number of records
- **Bandwidth**: Requests/sec × payload size
- **Memory**: Cache requirements
- **Servers**: Requests/sec ÷ server capacity

### 3. High-Level Design (10-15 minutes)

Draw boxes and arrows:
- Clients
- Load balancer
- Application servers
- Databases
- Caches
- Queues

### 4. Detailed Design (15-20 minutes)

Deep dive into:
- Database schema
- API endpoints
- Caching strategy
- Scaling approach
- Data flow

### 5. Trade-offs & Bottlenecks (5-10 minutes)

Discuss:
- Single points of failure
- Scalability limits
- Consistency vs availability
- Cost considerations

## Best Practices

**During Interview:**
✅ Start with clarifying questions
✅ State assumptions clearly
✅ Think out loud
✅ Draw diagrams
✅ Discuss trade-offs
✅ Consider scale from start
✅ Ask for feedback

**Common Mistakes:**
❌ Jumping to solution without requirements
❌ Ignoring scale and performance
❌ Over-engineering simple problems
❌ Not discussing trade-offs
❌ Forgetting about failure scenarios
❌ Poor communication

**Red Flags:**
- Single point of failure
- No caching strategy
- Ignoring network latency
- Not considering data consistency
- No monitoring/logging

## Summary

- System design requires understanding both functional and non-functional requirements
- Start simple with client-server, then add complexity as needed
- Core components: Load balancer, application servers, database, cache, message queue
- Choose SQL vs NoSQL based on data structure and query patterns
- Horizontal scaling is preferred for large-scale systems
- Always discuss trade-offs and failure scenarios
- Practice with real-world examples (Twitter, Uber, YouTube)

---
[← Back to SystemDesign](../README.md)
