---
title: ORMs and Migrations
part: 5
chapter: 0
slug: orms
level: intermediate
reading_time: 9
updated: 2026-09-01
tags: [sql, orm, prisma, migrations, connection-pool]
in_book: true
---

# ORMs and Migrations {#ch-orms}

> Use an ORM without losing control of the SQL, and change a live schema without taking the service down.

**In this chapter:** what an ORM buys and costs · the N+1 it creates · connection pooling · expand-then-contract migrations · the four changes that need care

## 💡 The Core Idea

An ORM maps rows to objects and generates SQL. That saves a great deal of boilerplate and hides
one thing you cannot afford to lose sight of: **how many queries your code issues, and what they
cost.**

Every serious ORM problem is a variation on that. A property access that looks free is a round
trip. A convenient `include` becomes a five-table join returning duplicated rows. The migration
tool writes correct SQL that happens to take a lock the size of your table.

So the working rule is: let the ORM write the routine 90% of queries, keep raw SQL available for
the rest, and always be able to see the SQL that ran.

> ⚠️ **Moving target:** Prisma, Drizzle and TypeORM all change their query APIs across major
> versions, and Prisma has moved its engine architecture more than once. The durable principle is
> that generated SQL must be observable and the schema change must be reversible. The method names
> will move.

## What You Get and What You Pay

| Gain | Cost |
| ---- | ---- |
| Types derived from the schema, so a renamed column breaks the build | The query you can express is limited by the API |
| Parameterisation by default, so injection is hard to write | Generated SQL is sometimes far from optimal |
| Migrations, seeds and a change history in the repository | Another abstraction to debug at 3am |
| Portability across engines | You lose engine-specific features you probably wanted |

**The three Node options, honestly:**

| Tool | Shape | Fits |
| ---- | ----- | ---- |
| **Prisma** | Its own schema language, generated client | Application teams who want the strongest types and do not mind the codegen step |
| **Drizzle** | Schema in TypeScript, SQL-shaped query builder | Teams who want the SQL visible and a thin layer |
| **TypeORM** | Decorators, Active Record or Data Mapper | Existing codebases; the newest work rarely starts here |

For a frontend-heavy engineer, the honest answer in an interview is that the choice matters less
than knowing what SQL comes out.

## The N+1, Again

```typescript
// ❌ One query for posts, then one per post. 21 round trips for a page of 20.
const posts = await prisma.post.findMany({ take: 20 });
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// ✅ One query, or two — the ORM batches it
const posts = await prisma.post.findMany({ take: 20, include: { author: true } });
```

`include` is the fix and also the next trap. Including three one-to-many relations produces a
join whose row count is the product of them, and the ORM then deduplicates in memory — a page that
should return 20 rows fetches 4,000. When that happens, issue separate queries and stitch them,
which is what a `DataLoader` does in GraphQL.

**Select only what you need.** `findMany` returns every column by default, which defeats covering
indexes and inflates payloads.

```typescript
const rows = await prisma.post.findMany({
  select: { id: true, title: true, author: { select: { name: true } } },
  take: 20,
});
```

**Turn on query logging in development.** If you cannot see the SQL, you cannot review it — and
this is the single highest-value ORM setting.

## Connection Pooling

The database has a hard connection limit — a few hundred, and each connection costs memory. The
pool exists so your application reuses a small number of them.

| Setting | Rule |
| ------- | ---- |
| Pool size | Roughly `(cores × 2) + effective spindles`; small is usually right — 10–20 per instance |
| Total connections | Pool size × instance count must stay under the database limit |
| Idle timeout | Release connections so a scaled-down instance does not hold them |
| Statement timeout | Set one, or a runaway query holds a connection forever |

The arithmetic is what catches people: 40 serverless instances with a pool of 10 each is 400
connections against a limit of 100. Serverless or heavily autoscaled deployments need an external
pooler — PgBouncer, or a managed equivalent — in transaction mode. Note that transaction-mode
pooling breaks session-level features such as prepared statements and `LISTEN`/`NOTIFY`.

## Migrations

A migration is a versioned, ordered, committed change to the schema. Three rules make them safe:

1. **Every migration is in version control and applied in order.** The database's applied-migration
   table is the source of truth for what has run.
2. **Forward-only in production.** A `down` migration is useful locally and dangerous live — rolling
   back a column drop does not bring the data back. Fix forward with a new migration.
3. **Separate schema changes from data backfills.** A backfill inside a schema migration holds a
   lock for the duration of the backfill.

### Expand, then contract

The pattern for any breaking change, and the reason a deploy can be zero-downtime: old and new code
must both work against the intermediate schema.

```sql
-- 1. EXPAND — add the new column, nullable, no default rewrite
ALTER TABLE users ADD COLUMN full_name text;

-- 2. BACKFILL — in batches, outside the migration, so no long lock
UPDATE users SET full_name = first_name || ' ' || last_name
WHERE full_name IS NULL AND id IN (SELECT id FROM users WHERE full_name IS NULL LIMIT 5000);

-- 3. Deploy code that writes both columns and reads the new one.

-- 4. CONTRACT — only once no running code references the old columns
ALTER TABLE users DROP COLUMN first_name, DROP COLUMN last_name;
```

Rename is the same shape: never `ALTER TABLE … RENAME COLUMN` on a live table, because the old code
still running will break the instant it commits.

### The four changes that need care

| Change | Hazard | Safe route |
| ------ | ------ | ---------- |
| Add a `NOT NULL` column with a default | Older engines rewrite the whole table | Add nullable, backfill, then set `NOT NULL` |
| Add an index | `CREATE INDEX` locks writes | `CREATE INDEX CONCURRENTLY`, outside a transaction |
| Add a foreign key | Validation scans and locks both tables | `ADD CONSTRAINT … NOT VALID`, then `VALIDATE CONSTRAINT` |
| Change a column type | Full table rewrite under an exclusive lock | New column, backfill, swap, drop |

> ⚠️ Set a short `lock_timeout` before a DDL statement on a live table. A migration that cannot get
> its lock immediately will otherwise queue — and every query behind it queues too, which is how a
> one-line `ALTER TABLE` becomes an outage.

**Seeds are not migrations.** Reference data that the application requires — currencies, roles,
plan definitions — belongs in an idempotent seed script using `INSERT … ON CONFLICT DO NOTHING`, so
running it twice is harmless. Test fixtures belong with the tests, never in the migration history.

## Common Mistakes

**❌ Editing a migration that has already run somewhere.** Environments diverge silently. Write a
new one.

**❌ A backfill in one statement on a large table.** It holds a lock, bloats the WAL and can time
out halfway. Batch it, with a bounded loop and a sleep.

**❌ Trusting the ORM to be efficient because it is typed.** Types say nothing about round trips.
Log the SQL.

**❌ Sharing one connection across concurrent requests to save pool slots.** Transactions
interleave and you get errors that look impossible.

## 🔑 Key Takeaways

- An ORM's real cost is hidden round trips, so make the generated SQL visible in development.
- `include` fixes N+1 and can create a row explosion; separate queries plus stitching is sometimes correct.
- Pool size × instance count must stay under the database's connection limit — check the arithmetic before autoscaling.
- Expand, backfill, deploy, contract is the only safe order for a breaking schema change.
- Index, foreign key, `NOT NULL` and type changes all need the non-blocking variant on a live table.

## Interview Questions

**Q: When do you drop out of the ORM into raw SQL?**

For analytical queries with window functions or recursive CTEs, for bulk operations where the ORM
issues per-row statements, and whenever the generated plan is bad and the API gives no way to
influence it. The rule is that the ORM owns the routine 90% and raw SQL stays available for the
rest — parameterised, and behind a typed function.

**Q: How do you rename a column with zero downtime?**

Expand and contract. Add the new column, deploy code that writes both and reads the new one,
backfill in batches, verify nothing reads the old column, then drop it in a later release. A direct
rename breaks every instance of the old code still running during the deploy.

**Q: Why is `ALTER TABLE ADD COLUMN … NOT NULL DEFAULT` dangerous?**

On older engines it rewrites every row while holding an exclusive lock, so the table is unavailable
for the duration — minutes on a large table. Postgres 11 and later optimise a constant default to a
metadata-only change, but a volatile default still rewrites. The portable route is nullable, then
backfill, then `SET NOT NULL`.

## What to Read Next

- [Chapter ?? — Database Design](#ch-database-design) — the schema these migrations change
- [Chapter ?? — Indexes and Query Plans](#ch-indexes) — checking what the ORM actually issued
- [Chapter ?? — API Versioning and Contracts](#ch-versioning) — expand-and-contract at the API layer
