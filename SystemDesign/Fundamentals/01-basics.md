# System Design Basics

## Overview

System design turns business needs into a working architecture. You pick components, define how they talk, and choose data stores — all while balancing speed, cost, and reliability.

## Requirements

### 💡 **Functional Requirements**

What the system must do — the features users see.

**How It Works:**

Ask three questions before drawing any boxes:

- Who are the users?
- What actions must they perform?
- What is the minimum viable feature set?

**Example — admin dashboard:** users sign in, view metrics, export reports, manage permissions.

### 💡 **Non-Functional Requirements**

How the system must behave — the quality bar.

| Attribute        | What it Means              | Typical Target                  |
| ---------------- | -------------------------- | ------------------------------- |
| **Scalability**  | Handle more users and data | 1M users, 10K req/s             |
| **Performance**  | Response time              | API < 200ms, page load < 2s     |
| **Availability** | Uptime                     | 99.9% (8.76 hrs downtime/year)  |
| **Reliability**  | Correctness under failure  | No data loss, ACID transactions |
| **Consistency**  | Data correctness model     | Strong vs eventual              |

**Key Insight:**

> Pin down non-functional requirements early. They drive most architecture choices — caching, sharding, replication.

## Core Components

### 💡 **Client-Server**

The base of every web system. Client sends a request, server returns a response.

```
Client ──HTTP request──▶ Server
       ◀──JSON response──
```

**When to Use:** every system. It is the starting point of any design.

### 💡 **Three-Tier Architecture**

Split the system into presentation, business, and data layers.

```
[ UI / React ]  ←→  [ API / Node.js ]  ←→  [ DB / Postgres ]
```

**Benefits:**

- Each layer scales on its own.
- Changes in one layer rarely break another.
- Same backend can serve web, mobile, and partner APIs.

### 💡 **Load Balancer**

Spreads traffic across many servers.

**Common algorithms:**

| Algorithm             | Use When                            |
| --------------------- | ----------------------------------- |
| **Round Robin**       | Servers have equal capacity         |
| **Least Connections** | Requests have variable duration     |
| **IP Hash**           | You need sticky sessions            |
| **Weighted**          | Servers have different capacities   |

**Use a load balancer when** you have more than one application server or need failover.

### 💡 **Database**

Where data lives. Pick SQL or NoSQL based on the data shape and query patterns.

| Need                              | Pick              | Example       |
| --------------------------------- | ----------------- | ------------- |
| Strong relationships, ACID        | Relational (SQL)  | PostgreSQL    |
| Flexible schema, horizontal scale | Document (NoSQL)  | MongoDB       |
| Fast lookups by key               | Key-value         | Redis, DynamoDB |
| Wide tables, write-heavy          | Column-family     | Cassandra     |
| Graph traversal                   | Graph             | Neo4j         |

**Use SQL when** data is structured, joins matter, and transactions must be ACID.
**Use NoSQL when** schema changes often, scale is huge, or queries are simple key lookups.

### 💡 **Cache**

A fast layer in front of the database. Most reads should never touch the DB.

```typescript
async function getUser(id: string): Promise<User> {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached) as User;

  const user = await db.users.findById(id);
  await redis.set(`user:${id}`, JSON.stringify(user), "EX", 3600);
  return user;
}
```

**Use a cache when** the same data is read many times and rarely changes (user profiles, product catalog).

### 💡 **Message Queue**

Lets services talk asynchronously. The producer drops a job, the consumer processes it later.

```
Producer ──▶ Queue ──▶ Consumer
```

**When to Use:**

- Sending emails after sign-up.
- Resizing uploaded images.
- Decoupling order, payment, and shipping in checkout.

Tools: RabbitMQ, Kafka, AWS SQS.

## Communication Patterns

| Pattern              | Style         | Use Case                         |
| -------------------- | ------------- | -------------------------------- |
| **Request-Response** | Synchronous   | REST and GraphQL APIs            |
| **Event-Driven**     | Async pub/sub | Microservices, notifications     |
| **Streaming**        | Continuous    | Real-time analytics, IoT, logs   |

## API Styles

| Style       | Best For                              | Trade-off                       |
| ----------- | ------------------------------------- | ------------------------------- |
| **REST**    | Public APIs, simple CRUD              | Over-fetching, many endpoints   |
| **GraphQL** | Mobile apps, complex client needs     | Hard to cache, learning curve   |
| **gRPC**    | Internal microservices, low latency   | Not browser-friendly, binary    |

**Key Insight:**

> Use REST for public APIs. Use GraphQL when clients need flexible queries. Use gRPC between internal services.

## The Interview Process

A senior system design interview usually follows five phases.

| Phase                  | Time     | What to Do                                       |
| ---------------------- | -------- | ------------------------------------------------ |
| **Requirements**       | 5 min    | Clarify features, scale, and constraints         |
| **Capacity Estimation**| 5 min    | Compute storage, bandwidth, server count         |
| **High-Level Design**  | 10–15 min| Draw client, LB, app, DB, cache, queue           |
| **Detailed Design**    | 15–20 min| Schema, APIs, sharding, caching, hot paths       |
| **Trade-offs**         | 5–10 min | SPOFs, consistency, cost, bottlenecks            |

## Common Mistakes

❌ **Bad:** jumping to a solution before clarifying requirements.
✅ **Good:** ask about scale, traffic patterns, and read/write ratio first.

❌ **Bad:** over-engineering — adding Kafka, Kubernetes, and microservices to a 100-user app.
✅ **Good:** start with the simplest design that meets the requirements, then add complexity.

❌ **Bad:** ignoring failure scenarios.
✅ **Good:** call out single points of failure and explain how the system degrades.

## Vertical vs Horizontal Scaling

| Aspect           | Vertical (Scale Up)          | Horizontal (Scale Out)         |
| ---------------- | ---------------------------- | ------------------------------ |
| **Method**       | Bigger machine               | More machines                  |
| **Cost**         | Grows fast                   | Linear, commodity hardware     |
| **Limit**        | Hardware ceiling             | Practically unlimited          |
| **Availability** | Single point of failure      | Built-in redundancy            |
| **Use When**     | Early stage, ACID database   | High traffic, global users     |

## Key Insight

> Every system design boils down to three trade-offs: consistency vs availability, latency vs throughput, and cost vs reliability. Name them out loud during the interview.

---

[← Back to SystemDesign](../README.md)
