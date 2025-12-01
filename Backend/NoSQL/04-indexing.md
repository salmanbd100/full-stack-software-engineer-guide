# Indexing & Performance

## Creating Indexes

```javascript
// Single field
db.users.createIndex({ email: 1 });  // Ascending

// Compound index
db.users.createIndex({ country: 1, city: 1 });

// Unique index
db.users.createIndex({ email: 1 }, { unique: true });

// Text index
db.articles.createIndex({ title: "text", content: "text" });

// List indexes
db.users.getIndexes();

// Drop index
db.users.dropIndex("email_1");
```

## Query Optimization

```javascript
// Use explain()
db.users.find({ email: "test@example.com" }).explain("executionStats");

// Index hints
db.users.find({ age: 25 }).hint({ age: 1 });
```

## Best Practices

✅ Index foreign keys
✅ Index frequently queried fields
✅ Use compound indexes wisely
✅ Monitor index usage
❌ Don't over-index
❌ Don't index low-cardinality fields

---

[← Previous: Aggregation](./03-aggregation.md) | [Next: Mongoose →](./05-mongoose.md)
