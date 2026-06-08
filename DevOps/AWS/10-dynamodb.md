# DynamoDB

AWS fully managed NoSQL database — single-digit millisecond latency at any scale, zero infrastructure to manage.

## What DynamoDB Is

DynamoDB is a **key-value and document database**. AWS handles everything: hardware, replication, patching, and scaling. You just define a table and start writing data.

It is not a relational database. There are no JOINs. There is no SQL. You query by key — fast. You scan the whole table — slow and expensive.

> DynamoDB is designed for **access patterns, not data relationships**. Know your queries before you design your table.

## Data Model

```
Table
└── Items (rows — each item is a JSON document)
    └── Attributes (fields — no fixed schema, each item can differ)
```

Every item must have a **primary key**. Everything else is optional.

| Concept | DynamoDB | SQL Equivalent |
|---------|----------|----------------|
| Table | Table | Table |
| Item | Item | Row |
| Attribute | Attribute | Column |
| Primary Key | Partition Key (+ optional Sort Key) | Primary Key |

## Primary Keys

### Partition Key (Hash Key)

- Required. Uniquely identifies each item when used alone.
- DynamoDB hashes this value to decide which physical partition stores the item.
- Choose a high-cardinality attribute: user IDs, order IDs, session tokens.

### Sort Key (Range Key)

- Optional. Combined with the partition key to form a **composite primary key**.
- Enables range queries: greater than, begins with, between.
- Many items can share the same partition key — they are distinguished by sort key.

**Example — Users table:**

```
Partition Key: userId       Sort Key: createdAt
─────────────────────────────────────────────────
user#001                    2024-01-15T09:00:00Z
user#001                    2024-03-22T14:30:00Z   ← same user, two events
user#002                    2024-02-10T11:00:00Z
```

This lets you query: "give me all events for user#001, sorted by time."

## Capacity Modes

| Feature | On-Demand | Provisioned |
|---------|-----------|-------------|
| **Billing** | Pay per request | Pay for RCU/WCU you set |
| **Scaling** | Instant, automatic | Manual or auto-scaling |
| **Cost (steady traffic)** | Higher | Lower |
| **Cost (unpredictable traffic)** | Lower | Higher (over-provisioning) |
| **Cold start / spike handling** | ✅ No throttling | ⚠️ Can throttle |
| **Best for** | New apps, spiky workloads | Known traffic, cost optimization |

**RCU** = Read Capacity Unit — reads 4 KB per second (strongly consistent) or 8 KB (eventually consistent).  
**WCU** = Write Capacity Unit — writes 1 KB per second.

✅ Start with On-Demand. Switch to Provisioned once traffic is predictable.

❌ Don't use Provisioned without auto-scaling — you will throttle during traffic spikes.

## Secondary Indexes

### GSI (Global Secondary Index)

- Query on **any attribute** — not just the primary key.
- Has its own partition key and optional sort key (different from the base table).
- Stores a copy of selected attributes — has its own RCU/WCU capacity.
- Can be added or deleted after table creation.

```bash
# Query a GSI: find all orders by status
aws dynamodb query \
  --table-name Orders \
  --index-name StatusIndex \
  --key-condition-expression "#s = :status" \
  --expression-attribute-names '{"#s": "status"}' \
  --expression-attribute-values '{":status": {"S": "PENDING"}}'
```

### LSI (Local Secondary Index)

- Same partition key as the base table — **different sort key**.
- Lets you sort or filter on a second attribute within the same partition.
- **Must be defined at table creation** — cannot add later.
- Shares capacity with the base table.

### GSI vs LSI

| Feature | GSI | LSI |
|---------|-----|-----|
| **Partition key** | Different from base table | Same as base table |
| **Sort key** | Optional, any attribute | Required, different attribute |
| **Add after creation** | ✅ Yes | ❌ No |
| **Capacity** | Separate RCU/WCU | Shared with table |
| **Query scope** | Entire table | Single partition |
| **Use case** | Query on non-key attributes | Alternate sort within partition |

> Use a GSI when you need a completely different access pattern. Use an LSI when you need to sort the same partition differently.

## Access Pattern Design

DynamoDB is **write-once, query-many**. You must know how you will query data before you design the table. This is the opposite of relational databases where you normalize first and query flexibly.

**Step 1:** List all the queries your app needs.  
**Step 2:** Design the partition key and sort key to satisfy those queries directly.  
**Step 3:** Add GSIs for access patterns that don't fit the primary key.

✅ One table design can handle multiple entity types (Users, Orders, Sessions) — this is called **single-table design**.

❌ Don't create a separate table for every entity. You lose the ability to fetch related data in one request.

## DynamoDB Streams

Streams capture **every change** to a table — inserts, updates, deletes — in order, per partition.

```
Item written → Stream record (old image + new image) → Lambda trigger
```

**Common uses:**
- Trigger a Lambda on data change (event-driven processing)
- Replicate data to another region (cross-region replication)
- Send changes to Elasticsearch for full-text search
- Audit logs

⚠️ Stream records are retained for **24 hours** only. Process them promptly.

## DAX (DynamoDB Accelerator)

DAX is an **in-memory cache** that sits in front of DynamoDB.

- Read latency drops from single-digit milliseconds to **microseconds**.
- API-compatible — no code changes to query pattern, just point to DAX endpoint.
- Works for read-heavy, repeated-key workloads.

| | DynamoDB | DAX |
|---|----------|-----|
| **Latency** | ~1–10 ms | ~microseconds |
| **Best for** | Any access | Hot keys, read-heavy |
| **Cost** | Table-based | Extra cluster cost |
| **Write-through** | Yes | Yes |

❌ DAX does not help write-heavy workloads or access patterns that hit different keys every time.

## Key CLI Commands

```bash
# Create a table with composite primary key
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# Write an item
aws dynamodb put-item \
  --table-name Users \
  --item '{"userId": {"S": "user#001"}, "createdAt": {"S": "2024-01-15"}, "name": {"S": "Alice"}}'

# Read a single item (fast — uses primary key)
aws dynamodb get-item \
  --table-name Users \
  --key '{"userId": {"S": "user#001"}, "createdAt": {"S": "2024-01-15"}}'

# Query by partition key (fast — targeted)
aws dynamodb query \
  --table-name Users \
  --key-condition-expression "userId = :uid" \
  --expression-attribute-values '{":uid": {"S": "user#001"}}'

# Scan — reads entire table (EXPENSIVE — avoid in production)
aws dynamodb scan --table-name Users
```

⚠️ **Scan** reads every item. Costs full table read capacity. Only use for migrations or admin tasks.

## Interview Q&A

**Q: RDS vs DynamoDB — when do you choose each?**

Choose RDS when your data has complex relationships (foreign keys, JOINs), you need ACID transactions across tables, or your schema is fixed. Choose DynamoDB when you need massive scale, predictable single-digit millisecond latency, your access patterns are simple (get by key, query by range), or you want zero database ops.

---

**Q: What is a partition key and why does it matter for performance?**

The partition key is hashed by DynamoDB to determine which physical partition stores the item. A bad partition key concentrates writes on one partition — this is a **hot partition**. All traffic hits one shard, you get throttled, and latency spikes. A good partition key distributes traffic evenly across all partitions.

---

**Q: What is the difference between a GSI and an LSI?**

An LSI uses the same partition key as the base table but a different sort key. It must be defined at creation and shares table capacity. A GSI has a completely different partition key — it is essentially a copy of the table organized differently. GSIs can be added after creation and have separate capacity. Use LSI for alternate sort within a partition. Use GSI for entirely different access patterns.

---

**Q: What is a scan and why should you avoid it?**

A scan reads every single item in the table. It uses full read capacity and gets slower as the table grows. It does not use the primary key or any index. In production this causes high cost and latency spikes. Always prefer `query` (which uses the primary key or an index) over `scan`. If you need full-table reads, do them off-peak and use pagination.

---

**Q: What is the hot partition problem and how do you avoid it?**

A hot partition happens when too many reads or writes go to a single partition. This causes throttling errors even if overall capacity is sufficient. It happens when the partition key has low cardinality (for example, using a `status` field with values like "ACTIVE" / "INACTIVE"). Fix it by choosing a high-cardinality key (user ID, UUID), adding a random suffix to spread writes, or using write sharding (append a random number 1–10 to the key and aggregate on read).

---

[← RDS](./09-rds.md) | [Route 53 →](./11-route53.md)
