# Document Design Patterns

## Embedding vs Referencing

### Embedding (Denormalization)
Store related data in single document.

```javascript
// ✅ Good for: 1-to-few, data read together
{
  _id: 1,
  name: "John",
  address: {
    street: "123 Main",
    city: "NYC"
  },
  hobbies: ["reading", "coding"]
}
```

### Referencing (Normalization)
Store references to other documents.

```javascript
// ✅ Good for: 1-to-many, many-to-many
// User
{ _id: 1, name: "John", posts: [101, 102, 103] }

// Posts
{ _id: 101, title: "Post 1", authorId: 1 }
{ _id: 102, title: "Post 2", authorId: 1 }
```

## When to Embed vs Reference

**Embed when:**
- 1-to-few relationships
- Data accessed together
- Data doesn't change often
- Need atomic updates

**Reference when:**
- 1-to-many with many being large
- Many-to-many relationships
- Data changes frequently
- Need to query independently

## Common Patterns

### 1. Subset Pattern
Store most-used fields, reference for full data.

```javascript
{
  _id: 1,
  title: "Movie",
  topReviews: [/* 10 most recent */],
  reviewCount: 1500
}
```

### 2. Extended Reference
Denormalize frequently accessed fields.

```javascript
{
  _id: 1,
  title: "Post",
  author: {
    id: 123,
    name: "John",  // Denormalized
    avatar: "url"  // Denormalized
  }
}
```

## Interview Questions

**Q: Embed or reference for blog posts and comments?**
A: Reference. Many comments per post, comments queried independently, grow unbounded.

**Q: Embed or reference for user profile?**
A: Embed. 1-to-1, accessed together, rarely changes separately.

---

[← Previous: MongoDB](./01-mongodb.md) | [Next: Aggregation →](./03-aggregation.md)
