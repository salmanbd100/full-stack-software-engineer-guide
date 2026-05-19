# Mongoose ODM

## 💡 What Is Mongoose?

Mongoose is an **Object-Document Mapper** for MongoDB in Node.js. It adds three things on top of the raw driver:

1. **Schemas** — enforce a shape even though MongoDB is schemaless
2. **Validation** — reject bad data before it hits the database
3. **Middleware (hooks)** — pre/post lifecycle handlers (e.g., hash passwords on save)

> Use Mongoose when you want safety and ergonomics. Use the raw driver when you need maximum performance and full control.

---

## Schema and Model

```typescript
import { Schema, model, Document } from "mongoose";

interface IUser extends Document {
  email: string;
  name: string;
  age?: number;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, min: 18 },
  createdAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);
```

> Define interfaces alongside schemas — Mongoose returns `any` otherwise, defeating TypeScript.

---

## CRUD Essentials

```typescript
// Create
const user = await User.create({ email: "ada@example.com", name: "Ada" });

// Find
const all = await User.find({ age: { $gte: 18 } });
const one = await User.findById(id);
const byEmail = await User.findOne({ email });

// Update
await User.findByIdAndUpdate(
  id,
  { name: "Ada Lovelace" },
  { new: true, runValidators: true },  // return updated doc, re-run schema validation
);

// Delete
await User.findByIdAndDelete(id);

// Bulk
await User.updateMany({ tier: "free" }, { $set: { tier: "trial" } });
```

> Always pass `{ new: true }` when updating, otherwise you get the pre-update document.

---

## `.lean()` — The Performance Switch

By default Mongoose hydrates results into full document instances (getters, virtuals, save methods). For read-only queries, `.lean()` returns plain JS objects — 5–10× faster, smaller memory footprint.

```typescript
// ❌ Slow when reading many docs
const posts = await Post.find({ status: "published" });

// ✅ Fast — plain objects, no hydration
const posts = await Post.find({ status: "published" }).lean();
```

> Reach for `.lean()` whenever you're not going to call `.save()` on the result.

---

## Validation

```typescript
const userSchema = new Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    validate: {
      validator: (v: string) => /\S+@\S+\.\S+/.test(v),
      message: "Invalid email format",
    },
  },
  password: {
    type: String,
    required: true,
    minlength: [8, "Password must be at least 8 characters"],
  },
});

try {
  await User.create({ email: "bad", password: "short" });
} catch (err) {
  if (err instanceof Error && err.name === "ValidationError") {
    // handle field-level errors
  }
}
```

---

## Middleware (Hooks)

Pre/post hooks run around schema operations. Most useful for: hashing passwords, audit fields, cascading deletes.

```typescript
import bcrypt from "bcrypt";

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.post("save", function (doc) {
  console.log(`User saved: ${doc._id}`);
});
```

⚠️ **Gotcha:** Hooks **don't run** on `findByIdAndUpdate` by default — they only fire on `.save()` and certain operations. Set `runValidators: true` and use the document-style update if you need them.

---

## Population (Joins)

Mongoose's answer to `JOIN`.

```typescript
interface IPost extends Document {
  title: string;
  author: Schema.Types.ObjectId;
}

const postSchema = new Schema<IPost>({
  title: String,
  author: { type: Schema.Types.ObjectId, ref: "User" },
});

const Post = model<IPost>("Post", postSchema);

// Auto-load the author document
const posts = await Post.find()
  .populate("author", "name email")     // only project name and email
  .lean();
```

⚠️ **Watch the N+1 trap.** `populate` issues a second query — fine for one document, expensive in loops.

```typescript
// ❌ N+1
for (const post of posts) {
  const fullPost = await Post.findById(post._id).populate("author");
}

// ✅ Single batched call
const posts = await Post.find().populate("author");
```

---

## Transactions

For multi-document atomic operations (requires replica set):

```typescript
import mongoose from "mongoose";

const session = await mongoose.startSession();
try {
  await session.withTransaction(async () => {
    await Account.updateOne({ _id: fromId }, { $inc: { balance: -100 } }, { session });
    await Account.updateOne({ _id: toId },   { $inc: { balance:  100 } }, { session });
  });
} finally {
  session.endSession();
}
```

---

## Virtuals

Computed fields that don't persist to the database.

```typescript
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.set("toJSON", { virtuals: true });
```

---

## When NOT to Use Mongoose

- High-throughput pipelines where hydration overhead matters → use the raw driver
- Aggregations — Mongoose's `Model.aggregate` returns plain objects anyway; raw driver is fine
- Quick scripts and ETL — Mongoose's startup time isn't worth it

---

## Interview Q&A

**Q: What does `.lean()` do and when do you use it?**
A: It skips Mongoose's document hydration and returns plain JavaScript objects. Use it for read-only queries — it's 5–10× faster and uses less memory. Don't use it when you need to call `.save()` or use schema methods on the result.

**Q: Why didn't my `pre('save')` hook run?**
A: `findByIdAndUpdate` and `updateOne` don't trigger document middleware by default. Either switch to `findById` + `save()`, or set `runValidators: true` and use `pre('findOneAndUpdate')` hooks.

**Q: How do you avoid N+1 with population?**
A: Populate at the query that returns the parent set, not in a loop. Mongoose batches the foreign-key lookups into a single `$in` query.

---

## Best Practices

✅ Define a TypeScript interface alongside every schema
✅ Use `.lean()` for read-only queries
✅ Add `runValidators: true` on updates
✅ Hash sensitive fields in `pre('save')`
✅ Populate at the top of the query, not in loops
❌ Don't forget `{ new: true }` on updates
❌ Don't run multi-document logic without a transaction in critical flows
❌ Don't ignore Mongoose hydration cost on high-traffic endpoints

---

[← Previous: Indexing](./04-indexing.md) | [Next: Redis →](./06-redis.md)
