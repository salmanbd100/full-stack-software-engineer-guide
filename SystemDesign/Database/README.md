# Database — System Design

Core database topics for senior engineering interviews. Focus on tradeoffs, scaling decisions, and the ability to justify your choices.

---

## Topics

| # | File | What It Covers |
|---|------|----------------|
| 01 | [SQL Design](./01-sql-design.md) | Normalization (1NF–3NF), JOIN types, when SQL wins |
| 02 | [NoSQL Design](./02-nosql-design.md) | Document, key-value, column-family, graph — when to pick each |
| 03 | [Sharding](./03-sharding.md) | Range, hash, directory partitioning; hotspot problem |
| 04 | [Replication](./04-replication.md) | Primary-replica, sync vs async, read scaling |
| 05 | [Indexing](./05-indexing.md) | B-tree, hash, composite indexes; selection rules |
| 06 | [Transactions & ACID](./06-transactions.md) | Isolation levels, distributed transactions, Saga pattern |
| 07 | [CAP Theorem](./07-cap-theorem.md) | CP vs AP tradeoffs, real-world examples |
| 08 | [Consistency Models](./08-consistency.md) | Linearizable, causal, eventual consistency |
| 09 | [Data Modeling](./09-data-modeling.md) | Access-pattern-first design, SQL vs NoSQL modeling |
| 10 | [Query Optimization](./10-query-optimization.md) | EXPLAIN plans, slow query analysis, anti-patterns |

---

## Recommended Study Order

**Week 1 — Foundations**
- Day 1: SQL Design → understand normalization and JOIN types
- Day 2: NoSQL Design → learn the 4 types and when to pick each
- Day 3: Indexing → B-tree and composite index rules
- Day 4–5: Practice designing schemas for Twitter, e-commerce

**Week 2 — Scaling**
- Day 1: Replication → primary-replica pattern and lag tradeoffs
- Day 2: Sharding → strategies and shard key selection
- Day 3: CAP Theorem + Consistency Models
- Day 4–5: Practice distributed database design problems

**Week 3 — Depth**
- Transactions & ACID
- Data Modeling (access-pattern-first)
- Query Optimization
- Full mock interview: "Design Instagram's database layer"

---

## Quick Decision Guide

| Requirement | Reach For |
|-------------|-----------|
| Complex JOINs, transactions | PostgreSQL / MySQL |
| Flexible schema, JSON documents | MongoDB |
| Sub-millisecond key lookup, caching | Redis / DynamoDB |
| High write throughput, time-series | Cassandra |
| Relationship traversal | Neo4j |
| Global distribution, strong consistency | CockroachDB / Spanner |

---

## Key Numbers to Know

| Operation | Typical Latency |
|-----------|----------------|
| Indexed point lookup | 1–5 ms |
| Range scan (indexed) | 10–50 ms |
| Full table scan (1M rows) | 500–2000 ms |
| Local transaction | 1–10 ms |
| Distributed 2PC | 50–200 ms |

---

[← Back to SystemDesign](../README.md)
