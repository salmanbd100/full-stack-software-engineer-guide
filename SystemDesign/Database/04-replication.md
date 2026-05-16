# Database Replication

## 💡 What Replication Is

Replication copies data from one database server to one or more other servers. Every write on the primary automatically propagates to the replicas.

Replication solves two problems:
1. **Availability** — if the primary fails, a replica takes over
2. **Read scaling** — route read queries to replicas, freeing the primary for writes

---

## Primary-Replica Pattern

One server (the primary) accepts all writes. One or more replicas receive those writes and serve read queries.

```
         Application
           ↙      ↘
      Writes       Reads
        ↙             ↘
    Primary       Replica 1
       │           Replica 2
       └──(replication)──┘
```

**How replication works:**
1. App writes to the primary
2. Primary records the change in a replication log (WAL in PostgreSQL, binlog in MySQL, oplog in MongoDB)
3. Replicas stream the log and apply changes locally
4. Replicas serve read queries from their local copy

```typescript
// Route reads to replicas, writes to primary
class DatabaseCluster {
  private primary: DbConnection;
  private replicas: DbConnection[];
  private index = 0;

  async write<T>(query: string, params: unknown[]): Promise<T> {
    return this.primary.execute(query, params);
  }

  async read<T>(query: string, params: unknown[]): Promise<T> {
    // Round-robin across replicas
    const replica = this.replicas[this.index % this.replicas.length];
    this.index++;
    return replica.execute(query, params);
  }

  // Use primary for reads that must be fresh (post-write)
  async readFresh<T>(query: string, params: unknown[]): Promise<T> {
    return this.primary.execute(query, params);
  }
}
```

---

## Synchronous vs Asynchronous Replication

This is the core tradeoff in replication.

### Synchronous Replication

The primary waits for the replica to confirm the write before returning success to the client.

```
Client → Primary (write)
             ↓ wait
         Replica (write confirmed)
             ↑
Primary → Client (success)
```

**Properties:**
- ✅ Zero data loss — replica is always in sync
- ✅ Reads from replica are always fresh
- ❌ Higher write latency — every write pays a network round-trip
- ❌ Primary is blocked if replica is slow or unavailable

**Use when:** Financial transactions, inventory systems — anywhere data loss is unacceptable.

### Asynchronous Replication

The primary acknowledges the write immediately. The replica catches up in the background.

```
Client → Primary (write)
Primary → Client (success immediately)
             ↓ later
         Replica (write applied)
```

**Properties:**
- ✅ Low write latency — primary doesn't wait
- ✅ Replica failure doesn't block primary
- ❌ Replication lag — replica may be seconds or minutes behind
- ❌ Data loss possible if primary fails before replica catches up

**Use when:** Read-heavy apps, social media feeds, analytics — where slight staleness is acceptable.

---

## Replication Tradeoffs Table

| Factor | Synchronous | Asynchronous |
|--------|-------------|--------------|
| Write latency | Higher (waits for replica) | Lower (fire and forget) |
| Data loss on failure | None | Possible (lag window) |
| Read freshness | Always fresh | May be stale |
| Primary availability | Depends on replica | Independent |
| Typical use | Banking, payments | Social feeds, analytics |

---

## Replication Lag

With async replication, replicas fall behind. Reading from a replica after a write may return stale data.

**The read-your-writes problem:**

```typescript
// User updates their profile, then reads it back
await db.write("UPDATE users SET name = $1 WHERE id = $2", ["Alice", userId]);

// If this reads from a lagging replica, it might return the old name
const user = await db.read("SELECT * FROM users WHERE id = $1", [userId]);
// user.name might still be "Bob"
```

**Solution — sticky reads after writes:**

```typescript
class LagAwareCluster {
  private writeTimestamps = new Map<string, number>();

  async write(userId: string, query: string, params: unknown[]): Promise<void> {
    await this.primary.execute(query, params);
    this.writeTimestamps.set(userId, Date.now()); // record when this user last wrote
  }

  async read(userId: string, query: string, params: unknown[]): Promise<unknown> {
    const lastWrite = this.writeTimestamps.get(userId);
    const recentWrite = lastWrite && Date.now() - lastWrite < 5000; // within 5s

    // Route to primary if user wrote recently
    const db = recentWrite ? this.primary : this.getReplica();
    return db.execute(query, params);
  }
}
```

---

## Failover

When the primary fails, a replica must be promoted to become the new primary.

**Automatic failover steps:**
1. Health checks detect primary is unreachable
2. Replicas elect a new primary (usually the most up-to-date replica)
3. Application redirects all writes to the new primary
4. Old replicas now replicate from the new primary
5. Old primary rejoins as a replica when it recovers

**Failover risks:**

| Risk | Description | Mitigation |
|------|-------------|------------|
| Split-brain | Two nodes think they're primary | Use a majority quorum or fencing |
| Data loss | Async replica behind at failover | Use semi-sync or acknowledge loss window |
| Connection storm | All apps reconnect at once | Retry with exponential backoff |

```typescript
// Semi-synchronous: wait for at least one replica before acknowledging
// PostgreSQL: synchronous_standby_names = 'ANY 1 (replica1, replica2)'
// This gives durability without requiring ALL replicas to confirm
```

---

## Read Replicas for Scaling

Adding replicas scales read capacity linearly. Each replica handles a share of read traffic.

**Common pattern — separate read-heavy features onto replicas:**

```typescript
interface DbConfig {
  primary: string;    // writes + critical reads
  analytics: string;  // heavy reporting queries
  replica: string;    // general reads
}

function getConnection(queryType: "write" | "read" | "analytics"): DbConnection {
  switch (queryType) {
    case "write":    return connections.primary;
    case "analytics": return connections.analytics; // dedicated replica for reports
    case "read":     return connections.replica;
  }
}
```

> Run slow analytical queries on a dedicated replica. Never run them on the primary — they hold locks and hurt write performance.

---

## Common Mistakes

❌ **Reading from a replica immediately after a critical write** — replication lag means the read may be stale. For money or inventory, read from primary.

❌ **Only one replica** — if the replica fails, you have no read scaling and no standby. Run at least two replicas.

❌ **Ignoring replication lag monitoring** — alert when lag exceeds your SLA. Unchecked lag can grow to hours.

❌ **Not testing failover** — practice failover in staging. The first time it happens in production should not also be the first time you've seen it.

---

## Interview Answer Template

> "I'd use a primary-replica setup with asynchronous replication. Writes go to the primary, reads go to replicas. For a read-heavy system this scales well — each additional replica increases read capacity. The main risk is replication lag causing stale reads. I'd handle that by reading from the primary for a short window after a user writes — 'read-your-writes' consistency. For failure scenarios, I'd run at least two replicas with automatic failover via a consensus mechanism like Raft, and I'd monitor replication lag with an alert threshold."
