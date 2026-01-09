# Database System Design

Comprehensive guide to database concepts, design patterns, and best practices for system design interviews.

## 📚 Topics Covered

| # | Topic | Description | Key Concepts |
|---|-------|-------------|--------------|
| **01** | [SQL Database Design](./01-sql-design.md) | Relational database fundamentals | Normalization, relationships, constraints, schema patterns |
| **02** | [NoSQL Design Patterns](./02-nosql-design.md) | Non-relational database strategies | Document, Key-Value, Column-Family, Graph databases |
| **03** | [Database Sharding](./03-sharding.md) | Horizontal data partitioning | Range, hash, geographic, directory-based sharding |
| **04** | [Database Replication](./04-replication.md) | Data redundancy and availability | Primary-replica, multi-primary, failover, conflict resolution |
| **05** | [Database Indexing](./05-indexing.md) | Query performance optimization | B-Tree, Hash, Bitmap, Full-Text, Spatial indexes |
| **06** | [Transactions & ACID](./06-transactions.md) | Data integrity guarantees | ACID properties, isolation levels, distributed transactions |
| **07** | [CAP Theorem](./07-cap-theorem.md) | Distributed system trade-offs | Consistency, Availability, Partition tolerance |
| **08** | [Consistency Models](./08-consistency.md) | Data consistency guarantees | Linearizable, sequential, causal, eventual consistency |
| **09** | [Data Modeling](./09-data-modeling.md) | Schema design best practices | SQL vs NoSQL modeling, access patterns, denormalization |
| **10** | [Query Optimization](./10-query-optimization.md) | Query performance tuning | EXPLAIN plans, indexing strategies, anti-patterns |

---

## 🎯 Study Plan

### Week 1: Foundations
- **Day 1-2**: SQL Database Design (normalization, relationships)
- **Day 3-4**: NoSQL Design Patterns (document, key-value stores)
- **Day 5**: Practice: Design schemas for e-commerce, social media

### Week 2: Scalability
- **Day 1-2**: Database Sharding (strategies, shard key selection)
- **Day 3-4**: Database Replication (failover, conflict resolution)
- **Day 5**: Practice: Design distributed database architecture

### Week 3: Performance
- **Day 1-2**: Database Indexing (B-Tree, covering indexes)
- **Day 3-4**: Query Optimization (EXPLAIN, performance tuning)
- **Day 5**: Practice: Optimize slow queries, design indexes

### Week 4: Distributed Systems
- **Day 1-2**: Transactions & ACID (isolation levels, 2PC, Saga)
- **Day 3-4**: CAP Theorem & Consistency Models
- **Day 5**: Practice: System design interviews (Twitter, Uber, etc.)

---

## 🔑 Key Concepts

### SQL vs NoSQL

| Aspect | SQL | NoSQL |
|--------|-----|-------|
| **Data Model** | Relational (tables) | Document, Key-Value, Column, Graph |
| **Schema** | Fixed schema | Flexible schema |
| **Scaling** | Vertical (scale up) | Horizontal (scale out) |
| **Transactions** | ACID guarantees | Eventual consistency (typically) |
| **Queries** | SQL (structured) | API-specific |
| **Best For** | Complex queries, transactions | High scalability, flexible data |

### When to Use Each

**Use SQL When:**
- Complex queries with JOINs
- ACID transactions required
- Well-defined schema
- Examples: PostgreSQL, MySQL

**Use NoSQL When:**
- High scalability needed
- Flexible schema
- Simple queries (key-value lookups)
- Examples: MongoDB, Cassandra, Redis, DynamoDB

---

## 🏆 Interview Patterns

### Pattern 1: High-Scale Read-Heavy System

**Example:** Netflix, YouTube

**Database Choice:**
- Primary: SQL (PostgreSQL) for user accounts, metadata
- Cache: Redis for hot data
- Replication: Multiple read replicas

**Key Techniques:**
- Read replicas for scaling reads
- Caching layer (Redis)
- CDN for static content
- Denormalized views for analytics

---

### Pattern 2: High-Write Throughput

**Example:** IoT sensors, logging systems

**Database Choice:**
- Time-series: InfluxDB, TimescaleDB
- Or: Cassandra for write-heavy workload

**Key Techniques:**
- Append-only data model
- Time-based partitioning
- Batch writes
- Asynchronous replication

---

### Pattern 3: Strong Consistency Required

**Example:** Banking, inventory management

**Database Choice:**
- SQL with ACID transactions (PostgreSQL)
- Or: MongoDB with majority write concern

**Key Techniques:**
- Synchronous replication
- Serializable isolation level
- Optimistic or pessimistic locking
- Saga pattern for distributed transactions

---

### Pattern 4: Global Distribution

**Example:** Social media, gaming

**Database Choice:**
- Multi-region: Cassandra, DynamoDB
- Or: MongoDB with geo-distributed replicas

**Key Techniques:**
- Geographic sharding
- Eventual consistency
- Conflict resolution (last-write-wins, CRDTs)
- Read from nearest replica

---

## 📖 Common Interview Questions

### SQL Design

1. **Design a schema for Twitter**
   - Users, tweets, follows, likes, retweets
   - Fan-out on write vs fan-out on read
   - Indexing strategy

2. **Design a schema for Uber**
   - Drivers, riders, trips, locations
   - Spatial indexing
   - Real-time updates

3. **Design a schema for e-commerce**
   - Products, orders, inventory, users
   - Handle inventory consistency
   - Order fulfillment workflow

### Scaling

4. **How would you scale a database to handle 10x traffic?**
   - Read replicas
   - Caching
   - Sharding
   - Query optimization

5. **Explain database sharding strategies**
   - Range-based, hash-based, geographic
   - Shard key selection
   - Rebalancing

6. **How does database replication work?**
   - Primary-replica setup
   - Synchronous vs asynchronous
   - Failover mechanism
   - Replication lag

### Performance

7. **How would you optimize a slow query?**
   - EXPLAIN analysis
   - Index creation
   - Query rewriting
   - Denormalization

8. **Explain different types of indexes**
   - B-Tree, Hash, Bitmap, Full-Text, Spatial
   - When to use each
   - Covering indexes

### Distributed Systems

9. **Explain CAP theorem with examples**
   - Consistency, Availability, Partition tolerance
   - CP vs AP systems
   - Real-world examples

10. **How do distributed transactions work?**
    - Two-phase commit (2PC)
    - Saga pattern
    - Trade-offs

---

## 🛠️ Technology Stack

### SQL Databases

| Database | Best For | Key Features |
|----------|----------|--------------|
| **PostgreSQL** | General purpose, complex queries | ACID, JSON support, extensions |
| **MySQL** | Web applications, read-heavy | Replication, InnoDB engine |
| **SQL Server** | Enterprise applications | Integration with MS stack |

### NoSQL Databases

| Database | Type | Best For |
|----------|------|----------|
| **MongoDB** | Document | Flexible schema, JSON data |
| **Cassandra** | Column-family | Write-heavy, time-series |
| **Redis** | Key-value | Caching, sessions, real-time |
| **DynamoDB** | Key-value | Serverless, auto-scaling |
| **Neo4j** | Graph | Social networks, recommendations |

### Cloud Solutions

| Provider | Service | Description |
|----------|---------|-------------|
| **AWS** | RDS, Aurora, DynamoDB | Managed relational and NoSQL |
| **Google Cloud** | Cloud SQL, Spanner, Bigtable | Global distribution, strong consistency |
| **Azure** | SQL Database, Cosmos DB | Multi-model, global distribution |

---

## 💡 Pro Tips

1. **Start with Requirements**
   - Read vs write ratio
   - Consistency requirements
   - Scale expectations
   - Query patterns

2. **Choose the Right Tool**
   - Don't force SQL for everything
   - Don't force NoSQL for everything
   - Polyglot persistence is okay

3. **Plan for Scale**
   - Design for 10x current load
   - Consider partitioning strategy early
   - Plan for data growth

4. **Monitor and Optimize**
   - Track slow queries
   - Monitor replication lag
   - Analyze query plans
   - Adjust indexes based on usage

5. **Test Failure Scenarios**
   - Primary failure → failover
   - Network partition → split-brain
   - Replication lag → stale reads
   - Shard rebalancing → downtime

---

## 📈 Performance Benchmarks

### Typical Latencies

| Operation | Latency |
|-----------|---------|
| **L1 cache reference** | 0.5 ns |
| **L2 cache reference** | 7 ns |
| **Main memory reference** | 100 ns |
| **SSD random read** | 150 μs |
| **HDD seek** | 10 ms |
| **Network: Same DC** | 500 μs |
| **Network: CA to Netherlands** | 150 ms |

### Database Operations

| Operation | Typical Performance |
|-----------|-------------------|
| **Point lookup (indexed)** | 1-5 ms |
| **Range scan (indexed)** | 10-50 ms |
| **Full table scan (1M rows)** | 500-2000 ms |
| **Transaction (local)** | 1-10 ms |
| **Transaction (distributed 2PC)** | 50-200 ms |

---

## 🎓 Additional Resources

### Books
- "Designing Data-Intensive Applications" by Martin Kleppmann
- "Database Internals" by Alex Petrov
- "High Performance MySQL" by Baron Schwartz

### Online Courses
- MIT 6.824: Distributed Systems
- Stanford CS245: Database System Principles
- MongoDB University: M001 MongoDB Basics

### Tools
- **PostgreSQL**: pgAdmin, psql
- **MongoDB**: Compass, mongo shell
- **Redis**: RedisInsight, redis-cli
- **Cassandra**: cqlsh, DataStax Studio

### Practice Platforms
- LeetCode Database Problems
- HackerRank SQL Challenges
- System Design Interview practice (Pramp, interviewing.io)

---

## 📝 Interview Preparation Checklist

- [ ] Understand SQL normalization (1NF, 2NF, 3NF)
- [ ] Know when to denormalize
- [ ] Understand different types of indexes
- [ ] Practice EXPLAIN query analysis
- [ ] Know CAP theorem and trade-offs
- [ ] Understand ACID properties
- [ ] Know sharding strategies
- [ ] Understand replication types
- [ ] Practice designing schemas for common systems
- [ ] Be able to explain trade-offs for your design choices

---

## 🌟 Success Criteria

By completing this guide, you should be able to:

1. **Design** scalable database schemas for various applications
2. **Choose** appropriate database types (SQL vs NoSQL)
3. **Optimize** query performance using indexes and query rewriting
4. **Scale** databases horizontally (sharding) and vertically (replication)
5. **Explain** trade-offs between consistency, availability, and partition tolerance
6. **Implement** transactions with appropriate isolation levels
7. **Handle** distributed system challenges (partitions, failures)
8. **Communicate** design decisions clearly in interviews

---

**Good luck with your interviews! 🚀**

[← Back to SystemDesign](../README.md)
