# MongoDB Fundamentals

## Overview
MongoDB is a document-oriented NoSQL database that stores data in flexible JSON-like documents.

## Core Concepts

**Document**: JSON-like record (BSON format)
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  address: {
    street: "123 Main St",
    city: "NYC"
  },
  hobbies: ["reading", "coding"]
}
```

**Collection**: Group of documents (like SQL table)
**Database**: Container for collections

## CRUD Operations

```javascript
// Insert
db.users.insertOne({ name: "John", email: "john@example.com" });
db.users.insertMany([{ name: "Jane" }, { name: "Bob" }]);

// Find
db.users.find();
db.users.find({ age: { $gt: 18 } });
db.users.findOne({ email: "john@example.com" });

// Update
db.users.updateOne({ _id: id }, { $set: { name: "Jane" } });
db.users.updateMany({ status: "pending" }, { $set: { status: "active" } });

// Delete
db.users.deleteOne({ _id: id });
db.users.deleteMany({ status: "inactive" });
```

## Query Operators

```javascript
// Comparison
{ age: { $eq: 25 } }   // Equal
{ age: { $gt: 18 } }   // Greater than
{ age: { $gte: 18 } }  // Greater than or equal
{ age: { $lt: 65 } }   // Less than
{ age: { $in: [25, 30, 35] } }  // In array

// Logical
{ $and: [{ age: { $gte: 18 } }, { country: "USA" }] }
{ $or: [{ age: { $lt: 18 } }, { age: { $gt: 65 } }] }
{ $not: { age: { $gte: 18 } } }

// Element
{ phone: { $exists: true } }
{ score: { $type: "number" } }

// Array
{ hobbies: "reading" }  // Contains element
{ hobbies: { $all: ["reading", "coding"] } }  // Contains all
{ hobbies: { $size: 3 } }  // Array size
```

## Projection

```javascript
// Include specific fields
db.users.find({}, { name: 1, email: 1, _id: 0 });

// Exclude specific fields
db.users.find({}, { password: 0 });
```

## Sorting & Limiting

```javascript
db.users.find().sort({ name: 1 });  // Ascending
db.users.find().sort({ age: -1 });  // Descending
db.users.find().limit(10).skip(20);  // Pagination
```

## Interview Questions

**Q: SQL vs MongoDB?**
A: SQL is structured/relational, MongoDB is flexible/document-based. Use SQL for complex relations, MongoDB for flexible schemas.

**Q: When to use MongoDB?**
A: Rapid development, flexible schemas, hierarchical data, horizontal scaling needs.

**Q: What is BSON?**
A: Binary JSON - MongoDB's data format. Supports more data types than JSON (Date, Binary, ObjectId).

---

[← Back to Backend](../README.md) | [Next: Design Patterns →](./02-design-patterns.md)
