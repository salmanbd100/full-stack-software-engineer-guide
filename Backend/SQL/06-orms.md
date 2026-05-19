# ORMs

## 💡 **What Is an ORM**

An ORM (Object-Relational Mapper) translates between database rows and language-level objects. You write queries in your language and the ORM generates SQL, handles parameter binding, parses result sets, and tracks changes.

ORMs trade fine-grained SQL control for productivity, type safety, and consistency across a codebase. The senior question is never "ORM or raw SQL" — it's "which parts of this codebase should use which, and why."

---

## 💡 **The Three Big Node ORMs**

| ORM           | Type            | Style                    | Strengths                                | Weaknesses                                      |
| ------------- | --------------- | ------------------------ | ---------------------------------------- | ----------------------------------------------- |
| **Prisma**    | Query builder + generated client | Schema-first (`.prisma` file) | Best-in-class DX, type-safe queries, great migrations | Limited raw escape hatches; opinionated         |
| **TypeORM**   | Full ORM        | Decorator-based entities | Active Record + Data Mapper, mature      | Inconsistent API surface, slower release cadence |
| **Sequelize** | Full ORM        | JS class definitions     | Most widely used, plenty of community    | Weaker TS types, more boilerplate               |

For new TypeScript projects in 2026, **Prisma** is the default pick. **TypeORM** is common in NestJS codebases. **Sequelize** survives in older Node apps.

---

## 💡 **Defining Entities**

**Prisma — schema-first:**

```prisma
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
  @@index([authorId])
}
```

Running `prisma generate` produces a fully typed client.

**TypeORM — decorators:**

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, Index } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) email!: string;
  @Column() name!: string;
  @OneToMany(() => Post, (p) => p.author) posts!: Post[];
  @CreateDateColumn() createdAt!: Date;
}

@Entity()
export class Post {
  @PrimaryGeneratedColumn() id!: number;
  @Column() title!: string;
  @Index() @ManyToOne(() => User, (u) => u.posts) author!: User;
}
```

---

## 💡 **Common Query Patterns**

**Prisma:**

```typescript
// Create
const user = await prisma.user.create({ data: { email, name } });

// Find with relations (eager load)
const users = await prisma.user.findMany({
  where: { createdAt: { gte: lastWeek } },
  include: { posts: true },
  orderBy: { createdAt: "desc" },
  take: 20,
});

// Transaction
await prisma.$transaction(async (tx) => {
  await tx.account.update({ where: { id: from }, data: { balance: { decrement: amount } } });
  await tx.account.update({ where: { id: to },   data: { balance: { increment: amount } } });
});
```

**TypeORM:**

```typescript
const repo = AppDataSource.getRepository(User);

const users = await repo.find({
  where: { country: "US" },
  relations: { posts: true },
  take: 20,
});

// Query builder for anything non-trivial
const stats = await repo.createQueryBuilder("u")
  .leftJoin("u.posts", "p")
  .select("u.id").addSelect("COUNT(p.id)", "postCount")
  .where("u.createdAt > :since", { since: lastWeek })
  .groupBy("u.id")
  .having("COUNT(p.id) > :min", { min: 5 })
  .getRawMany();
```

---

## 💡 **The N+1 Problem**

The single most important ORM pitfall.

```typescript
// ❌ 1 + N queries: one for users, one per user for their posts
const users = await prisma.user.findMany();
for (const u of users) {
  const posts = await prisma.post.findMany({ where: { authorId: u.id } });
}
```

**Fix 1 — eager load (one JOIN, or a second batched IN-query):**

```typescript
const users = await prisma.user.findMany({ include: { posts: true } });
```

**Fix 2 — DataLoader (batched, cached per request, the GraphQL standard):**

```typescript
import DataLoader from "dataloader";

const postsByUser = new DataLoader<number, Post[]>(async (userIds) => {
  const posts = await prisma.post.findMany({ where: { authorId: { in: [...userIds] } } });
  const byUser = new Map<number, Post[]>();
  for (const p of posts) {
    const arr = byUser.get(p.authorId) ?? [];
    arr.push(p);
    byUser.set(p.authorId, arr);
  }
  return userIds.map((id) => byUser.get(id) ?? []);
});

// One DB call no matter how many users you ask for in this request
await postsByUser.load(42);
```

> Always inspect ORM-generated SQL during development — most ORMs have a `logging: true` option. If you see the same table being hit in a loop, you have N+1.

---

## 💡 **Migrations**

Schema changes are version-controlled SQL files. Generate them from model changes, review the SQL, commit to git, run in CI.

**Prisma:**

```bash
# After editing schema.prisma
npx prisma migrate dev --name add_user_status

# Production deploy
npx prisma migrate deploy
```

**TypeORM:**

```bash
npm run typeorm migration:generate -- -n AddUserStatus
npm run typeorm migration:run
npm run typeorm migration:revert
```

⚠️ **Never use `synchronize: true` outside of throwaway dev DBs.** It drops and recreates schema to match entities — fine on day one, catastrophic when you have real data.

---

## 💡 **When ORMs Help vs Hurt**

**ORMs help:**

- ✅ CRUD and simple finders — less boilerplate, type-safe, SQL-injection-safe by default.
- ✅ Refactoring — rename a column, regenerate types, fix compile errors.
- ✅ Multi-statement transactions with cleanup guaranteed.
- ✅ Schema as code with diffable migrations.

**ORMs hurt:**

- ❌ Complex analytics (window functions, recursive CTEs, multi-CTE pipelines) — write SQL.
- ❌ Bulk operations — use raw `COPY` or `INSERT ... SELECT`, not `for (...) await create()`.
- ❌ Performance-critical hot paths where every allocated object matters.
- ❌ Database-specific features (`JSONB` operators, full-text search, geo) — often need raw SQL anyway.

**The hybrid approach** is correct: ORM for 80% of CRUD, raw SQL via the ORM's escape hatch for the 20% that needs it.

```typescript
// Prisma raw escape hatch — still parameterized
const rows = await prisma.$queryRaw<{ month: string; revenue: number }[]>`
  SELECT date_trunc('month', order_date) AS month, SUM(total) AS revenue
  FROM "Order" WHERE order_date > ${since}
  GROUP BY 1 ORDER BY 1
`;
```

---

## 📚 **Interview Q&A**

**Q1. What's the N+1 problem and how do you fix it in an ORM?**
You query a parent collection of N rows, then for each row issue another query for its children — 1 + N round-trips. Fix by eager-loading the relation (`include` in Prisma, `relations` or `leftJoinAndSelect` in TypeORM), which produces a single JOIN or a second batched query. In GraphQL, layer DataLoader on top to batch + cache within a request.

**Q2. When would you bypass the ORM and write raw SQL?**
For complex analytics (window functions, recursive CTEs, multi-stage aggregations) where the ORM API hurts more than it helps, for bulk inserts where you want `COPY`, and for database-specific features the ORM doesn't model well (`JSONB`, full-text search, geometry). Always use the ORM's parameterized escape hatch (`$queryRaw`, `queryRunner.query`) so you keep injection safety.

**Q3. What's the difference between Active Record and Data Mapper patterns?**
Active Record puts persistence methods on the entity itself (`user.save()`, `user.posts`). Data Mapper keeps entities as plain objects and isolates persistence in repositories (`userRepo.save(user)`). Active Record is faster to write; Data Mapper is cleaner for testability and domain modeling. TypeORM supports both; Prisma is essentially Data Mapper via its client; Sequelize is Active Record.

---

## ✅ **Best Practices**

- ✅ Eager-load relations you'll use. Lazy load only when ratio is low and the relation is large.
- ✅ Turn on query logging in development; watch for N+1.
- ✅ Always run real migrations in production. Never `synchronize: true`.
- ✅ Wrap multi-step writes in transactions using the ORM's helper (`prisma.$transaction`, `dataSource.transaction`).
- ✅ Use the ORM's raw escape hatch for analytics — keep it parameterized.
- ❌ Don't fetch the world. Project only the columns you need (`select` in Prisma).
- ❌ Don't `for (...) await create()`. Batch inserts or use raw `COPY`.

---

[← Previous: PostgreSQL](./05-postgresql.md) | [Next: Migrations →](./07-migrations.md)
