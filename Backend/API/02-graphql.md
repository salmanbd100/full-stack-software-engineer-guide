# GraphQL

## Overview

GraphQL is a query language and runtime for APIs that provides a more efficient, powerful alternative to REST. Developed by Facebook in 2012 and open-sourced in 2015.

**Key Advantage:** Clients can request exactly the data they need, nothing more, nothing less.

## 🎯 Core Concepts

### 1. Schema Definition Language (SDL)

The GraphQL schema defines the API contract using a type system.

```graphql
# Define types
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String!
  published: Boolean!
  author: User!
  comments: [Comment!]!
}

type Comment {
  id: ID!
  content: String!
  author: User!
  post: Post!
}

# Root types
type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
  post(id: ID!): Post
  posts(published: Boolean): [Post!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
  updateUser(id: ID!, name: String, email: String): User!
  deleteUser(id: ID!): Boolean!
  createPost(title: String!, content: String!, authorId: ID!): Post!
  publishPost(id: ID!): Post!
}

type Subscription {
  postCreated: Post!
  commentAdded(postId: ID!): Comment!
}
```

**Type Modifiers:**
- `String!` - Non-null (required)
- `[String]` - Array of strings (can be null)
- `[String!]!` - Non-null array of non-null strings

---

### 2. Queries

Request specific data from the server.

```graphql
# Simple query
query {
  user(id: "1") {
    id
    name
    email
  }
}

# Response
{
  "data": {
    "user": {
      "id": "1",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Nested Queries:**
```graphql
query {
  user(id: "1") {
    id
    name
    posts {
      id
      title
      comments {
        id
        content
        author {
          name
        }
      }
    }
  }
}
```

**With Variables:**
```graphql
query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    name
    email
  }
}

# Variables
{
  "userId": "1"
}
```

---

### 3. Mutations

Modify server-side data.

```graphql
mutation {
  createUser(name: "Jane Doe", email: "jane@example.com") {
    id
    name
    email
    createdAt
  }
}

# Response
{
  "data": {
    "createUser": {
      "id": "2",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2024-12-08T10:00:00Z"
    }
  }
}
```

**Multiple Mutations:**
```graphql
mutation {
  user1: createUser(name: "Alice", email: "alice@example.com") {
    id
    name
  }
  user2: createUser(name: "Bob", email: "bob@example.com") {
    id
    name
  }
}
```

---

### 4. Subscriptions

Real-time updates via WebSocket.

```graphql
subscription {
  postCreated {
    id
    title
    author {
      name
    }
  }
}

# Client receives real-time updates when posts are created
```

---

## 💻 Implementation (Node.js + Apollo Server)

### Setup

```bash
npm install apollo-server graphql
```

### Basic Server

```javascript
const { ApolloServer, gql } = require('apollo-server');

// 1. Define schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
  }
`;

// 2. In-memory data (replace with database)
let users = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
];

// 3. Define resolvers
const resolvers = {
  Query: {
    users: () => users,
    user: (parent, args) => {
      return users.find(user => user.id === args.id);
    },
  },
  Mutation: {
    createUser: (parent, args) => {
      const newUser = {
        id: String(users.length + 1),
        name: args.name,
        email: args.email,
      };
      users.push(newUser);
      return newUser;
    },
  },
};

// 4. Create server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// 5. Start server
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

---

### With Database (MongoDB + Mongoose)

```javascript
const { ApolloServer, gql } = require('apollo-server');
const mongoose = require('mongoose');

// Mongoose models
const User = mongoose.model('User', {
  name: String,
  email: String,
});

const Post = mongoose.model('Post', {
  title: String,
  content: String,
  published: Boolean,
  authorId: mongoose.Schema.Types.ObjectId,
});

const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    posts: [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createPost(
      title: String!
      content: String!
      authorId: ID!
    ): Post!
  }
`;

const resolvers = {
  Query: {
    users: async () => await User.find(),
    user: async (parent, { id }) => await User.findById(id),
    posts: async () => await Post.find(),
    post: async (parent, { id }) => await Post.findById(id),
  },

  Mutation: {
    createUser: async (parent, { name, email }) => {
      const user = new User({ name, email });
      await user.save();
      return user;
    },
    createPost: async (parent, { title, content, authorId }) => {
      const post = new Post({
        title,
        content,
        published: false,
        authorId,
      });
      await post.save();
      return post;
    },
  },

  // Field resolvers
  User: {
    posts: async (parent) => {
      return await Post.find({ authorId: parent.id });
    },
  },

  Post: {
    author: async (parent) => {
      return await User.findById(parent.authorId);
    },
  },
};

// Connect to MongoDB and start server
mongoose.connect('mongodb://localhost:27017/graphql-demo')
  .then(() => {
    const server = new ApolloServer({ typeDefs, resolvers });
    return server.listen();
  })
  .then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
```

---

## 🔍 Advanced Patterns

### 1. DataLoader (N+1 Problem Solution)

**Problem:** Without DataLoader, nested queries cause multiple database calls.

```javascript
// ❌ BAD: N+1 queries
Post: {
  author: async (parent) => {
    // Called once for EACH post - N+1 problem!
    return await User.findById(parent.authorId);
  }
}

// For 100 posts, makes 100+ database queries!
```

**Solution:** Use DataLoader to batch and cache requests.

```javascript
const DataLoader = require('dataloader');

// Batch function
async function batchUsers(ids) {
  const users = await User.find({ _id: { $in: ids } });
  // Return users in same order as ids
  return ids.map(id => users.find(user => user.id.equals(id)));
}

// Create loader
const userLoader = new DataLoader(batchUsers);

// Use in resolver
Post: {
  author: async (parent) => {
    return await userLoader.load(parent.authorId);
  }
}

// For 100 posts, makes only 1 database query!
```

---

### 2. Context & Authentication

```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // Get token from header
    const token = req.headers.authorization || '';

    // Verify token and get user
    const user = verifyToken(token);

    // Add to context
    return { user, userLoader };
  },
});

// Use in resolvers
const resolvers = {
  Query: {
    me: (parent, args, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.user;
    },
  },

  Mutation: {
    createPost: (parent, args, context) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }

      const post = new Post({
        ...args,
        authorId: context.user.id,
      });

      return post.save();
    },
  },
};
```

---

### 3. Error Handling

```javascript
const { ApolloError, UserInputError, AuthenticationError } = require('apollo-server');

const resolvers = {
  Query: {
    user: async (parent, { id }) => {
      const user = await User.findById(id);

      if (!user) {
        throw new UserInputError('User not found', {
          invalidArgs: { id },
        });
      }

      return user;
    },
  },

  Mutation: {
    createUser: async (parent, { email, name }, context) => {
      // Check auth
      if (!context.user) {
        throw new AuthenticationError('Must be logged in');
      }

      // Validate input
      if (!email.includes('@')) {
        throw new UserInputError('Invalid email format', {
          invalidArgs: { email },
        });
      }

      // Check duplicates
      const existing = await User.findOne({ email });
      if (existing) {
        throw new ApolloError('Email already exists', 'DUPLICATE_EMAIL');
      }

      const user = new User({ email, name });
      await user.save();
      return user;
    },
  },
};
```

---

### 4. Pagination

**Offset-based:**
```graphql
type Query {
  posts(limit: Int, offset: Int): PostConnection!
}

type PostConnection {
  posts: [Post!]!
  totalCount: Int!
  hasMore: Boolean!
}
```

```javascript
Query: {
  posts: async (parent, { limit = 10, offset = 0 }) => {
    const posts = await Post.find()
      .skip(offset)
      .limit(limit);

    const totalCount = await Post.countDocuments();

    return {
      posts,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  },
}
```

**Cursor-based (Relay-style):**
```graphql
type Query {
  posts(first: Int, after: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

---

### 5. Subscriptions with WebSocket

```javascript
const { ApolloServer, gql, PubSub } = require('apollo-server');

const pubsub = new PubSub();
const POST_CREATED = 'POST_CREATED';

const resolvers = {
  Mutation: {
    createPost: async (parent, args) => {
      const post = new Post(args);
      await post.save();

      // Publish event
      pubsub.publish(POST_CREATED, { postCreated: post });

      return post;
    },
  },

  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator([POST_CREATED]),
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  subscriptions: {
    path: '/subscriptions',
    onConnect: (connectionParams) => {
      // Authenticate WebSocket connection
      const token = connectionParams.authorization;
      const user = verifyToken(token);
      return { user };
    },
  },
});
```

---

## 🆚 GraphQL vs REST

| Feature | GraphQL | REST |
|---------|---------|------|
| **Data Fetching** | Single request for all data | Multiple endpoints |
| **Over-fetching** | Request only needed fields | Returns all fields |
| **Under-fetching** | Get related data in one query | Multiple requests needed |
| **Versioning** | No versioning needed | /v1/, /v2/ |
| **Type System** | Strong typing with schema | No built-in typing |
| **Tooling** | GraphQL Playground, introspection | Swagger, Postman |
| **Caching** | More complex (need libs) | HTTP caching built-in |
| **Learning Curve** | Steeper | Gentler |
| **Best For** | Complex, related data | Simple CRUD, public APIs |

---

## 🎯 GraphQL Best Practices

### 1. Schema Design

```graphql
# ✅ GOOD: Descriptive, specific types
type Product {
  id: ID!
  name: String!
  price: Money!  # Custom scalar
  category: Category!
  reviews(limit: Int): [Review!]!
}

type Money {
  amount: Float!
  currency: String!
}

# ❌ BAD: Generic, unclear types
type Product {
  id: ID!
  name: String!
  price: Float!  # What currency?
  cat: String!   # Unclear abbreviation
}
```

### 2. Naming Conventions

```graphql
# ✅ GOOD: Clear, consistent naming
type Query {
  user(id: ID!): User          # Singular for single item
  users(limit: Int): [User!]!  # Plural for lists
  searchUsers(query: String!): [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

input CreateUserInput {
  name: String!
  email: String!
}
```

### 3. Input Types for Mutations

```graphql
# ✅ GOOD: Use input types
input CreatePostInput {
  title: String!
  content: String!
  tags: [String!]
  published: Boolean
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
}

# ❌ BAD: Many individual arguments
type Mutation {
  createPost(
    title: String!
    content: String!
    tags: [String!]
    published: Boolean
  ): Post!
}
```

### 4. Error Handling

```javascript
// ✅ GOOD: Detailed error responses
{
  "errors": [
    {
      "message": "User not found",
      "extensions": {
        "code": "USER_NOT_FOUND",
        "userId": "123"
      }
    }
  ]
}

// Use custom error classes
class UserNotFoundError extends ApolloError {
  constructor(userId) {
    super('User not found', 'USER_NOT_FOUND', { userId });
  }
}
```

---

## 📊 Performance Optimization

### 1. Query Complexity Analysis

```javascript
const { createComplexityLimitRule } = require('graphql-validation-complexity');

const server = new ApolloServer({
  validationRules: [
    createComplexityLimitRule(1000, {
      onCost: (cost) => console.log('Query cost:', cost),
    }),
  ],
});
```

### 2. Query Depth Limiting

```javascript
const depthLimit = require('graphql-depth-limit');

const server = new ApolloServer({
  validationRules: [depthLimit(5)],  // Max depth of 5
});
```

### 3. Batch Resolvers

```javascript
// Use DataLoader for all one-to-many relationships
const loaders = {
  user: new DataLoader(ids => batchGetUsers(ids)),
  post: new DataLoader(ids => batchGetPosts(ids)),
  comment: new DataLoader(ids => batchGetComments(ids)),
};

// Add to context
context: () => ({ loaders })
```

---

## 🔒 Security

### 1. Disable Introspection in Production

```javascript
const server = new ApolloServer({
  introspection: process.env.NODE_ENV !== 'production',
  playground: process.env.NODE_ENV !== 'production',
});
```

### 2. Rate Limiting

```javascript
const { RateLimitDirective } = require('graphql-rate-limit-directive');

const typeDefs = gql`
  directive @rateLimit(
    limit: Int!
    duration: Int!
  ) on FIELD_DEFINITION

  type Query {
    users: [User!]! @rateLimit(limit: 100, duration: 60)
    user(id: ID!): User @rateLimit(limit: 1000, duration: 60)
  }
`;
```

### 3. Validate Input

```javascript
const Joi = require('joi');

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
});

Mutation: {
  createUser: async (parent, { input }) => {
    const { error } = createUserSchema.validate(input);
    if (error) {
      throw new UserInputError(error.message);
    }
    // Proceed with creation
  }
}
```

---

## 📚 Common Interview Questions

### Q1: Explain the N+1 problem in GraphQL and how to solve it.

**Answer:**

The N+1 problem occurs when fetching related data results in 1 query to fetch parent records + N queries to fetch related child records.

**Example:**
```graphql
query {
  posts {          # 1 query to get 100 posts
    title
    author {       # 100 queries (one per post) = N+1 problem!
      name
    }
  }
}
```

**Without DataLoader:**
```javascript
// ❌ BAD: Causes N+1 queries
Post: {
  author: async (parent) => {
    // Called 100 times for 100 posts!
    return await User.findById(parent.authorId); // 100 DB queries
  }
}
```

**Solutions:**

**1. DataLoader (Primary Solution):**
```javascript
const DataLoader = require('dataloader');

// Batch function - receives array of IDs
async function batchGetUsers(userIds) {
  console.log('Fetching users:', userIds); // Called ONCE for all IDs

  // Single database query for all users
  const users = await User.find({ _id: { $in: userIds } });

  // Return in same order as input IDs
  return userIds.map(id =>
    users.find(user => user._id.toString() === id.toString())
  );
}

// Create loader in context
const userLoader = new DataLoader(batchGetUsers);

// Use in resolver
Post: {
  author: (post, args, { userLoader }) => {
    return userLoader.load(post.authorId); // Batched automatically!
  }
}

// Result: 1 query to get posts + 1 batched query to get all authors = 2 queries total!
```

**2. Field Selection (GraphQL Specific):**
```javascript
// Only query author if requested
const resolveFieldList = (info) => {
  return info.fieldNodes[0].selectionSet.selections.map(s => s.name.value);
};

Query: {
  posts: (parent, args, context, info) => {
    const fields = resolveFieldList(info);
    if (fields.includes('author')) {
      // Fetch with author join
      return Post.find().populate('author');
    }
    return Post.find(); // Without author
  }
}
```

**3. Query Optimization (Database Level):**
```javascript
// Use database joins/aggregations
Query: {
  posts: async () => {
    return await Post.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' }
    ]);
  }
}
```

**Interview Tip:** Always mention DataLoader as the standard solution. Explain that it batches requests within a single event loop tick and caches results for the duration of the request.

---

### Q2: When would you choose GraphQL over REST?

**Answer:**

| Scenario | GraphQL | REST |
|----------|---------|------|
| **Mobile apps** (bandwidth limited) | ✅ Perfect - fetch only needed fields | ❌ Over-fetching wastes bandwidth |
| **Complex UIs** (many data relationships) | ✅ Single query for nested data | ❌ Multiple round trips needed |
| **Rapid frontend changes** | ✅ No backend changes needed | ❌ Need new endpoints |
| **Microservices** (aggregate data) | ✅ GraphQL as API gateway | ❌ Client calls multiple services |
| **Public APIs** | ❌ Less familiar, harder to cache | ✅ Standard, well-understood |
| **File uploads** | ❌ Complex, needs special handling | ✅ Simple multipart/form-data |
| **Simple CRUD** | ❌ Overkill | ✅ Straightforward |

**Real-World Examples:**

**GraphQL Perfect For:**
```graphql
# E-commerce: User + Orders + Products in ONE request
query {
  user(id: "123") {
    name
    email
    orders(limit: 5) {
      id
      total
      items {
        product {
          name
          price
          images(size: THUMBNAIL)
        }
        quantity
      }
    }
    recommendedProducts(limit: 10) {
      name
      price
    }
  }
}

# REST would need: /users/123, /users/123/orders, /orders/*/items, /products/*, etc.
```

**REST Perfect For:**
```
GET /health              // Simple status check
POST /auth/login         // Standard authentication
GET /download/file.pdf   // File downloads
POST /upload             // File uploads
GET /products?page=1     // Simple list with caching
```

**Interview Tip:** Mention that many companies use both - GraphQL for complex client-facing APIs, REST for simple microservice communication.

---

### Q3: How do you handle authentication and authorization in GraphQL?

**Answer:**

**Authentication (Who are you?):**

**JavaScript:**
```javascript
const { ApolloServer, AuthenticationError } = require('apollo-server');
const jwt = require('jsonwebtoken');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // 1. Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');

    // 2. Verify and decode token
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        // Token invalid/expired - return null user
        console.error('Invalid token:', error.message);
      }
    }

    // 3. Return context with user
    return {
      user,
      req,
      // Add DataLoaders here
      userLoader: createUserLoader(),
    };
  },
});

// Use in resolvers
const resolvers = {
  Query: {
    me: (parent, args, { user }) => {
      if (!user) {
        throw new AuthenticationError('You must be logged in');
      }
      return User.findById(user.id);
    },
  },
};
```

**Python:**
```python
from ariadne import make_executable_schema, QueryType
from jose import jwt, JWTError

def get_context_value(request):
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")

    user = None
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user = payload
        except JWTError:
            pass

    return {"user": user, "request": request}

# Use in resolvers
@query.field("me")
def resolve_me(obj, info):
    user = info.context["user"]
    if not user:
        raise Exception("Not authenticated")
    return get_user_by_id(user["id"])
```

---

**Authorization (What can you do?):**

**1. Field-Level Authorization:**
```javascript
const resolvers = {
  User: {
    email: (parent, args, { user }) => {
      // Only owner or admin can see email
      if (!user || (user.id !== parent.id && user.role !== 'admin')) {
        return null; // or throw error
      }
      return parent.email;
    },
    ssn: (parent, args, { user }) => {
      // Only admins can see SSN
      if (!user || user.role !== 'admin') {
        throw new ForbiddenError('Insufficient permissions');
      }
      return parent.ssn;
    },
  },
};
```

**2. Directive-Based Authorization:**
```graphql
directive @auth(requires: Role = USER) on OBJECT | FIELD_DEFINITION

enum Role {
  ADMIN
  USER
  GUEST
}

type Query {
  users: [User!]! @auth(requires: ADMIN)
  me: User @auth(requires: USER)
  publicPosts: [Post!]!
}

type Mutation {
  deleteUser(id: ID!): Boolean! @auth(requires: ADMIN)
  updateProfile(input: ProfileInput!): User! @auth(requires: USER)
}
```

**Implementation:**
```javascript
const { SchemaDirectiveVisitor } = require('graphql-tools');
const { ForbiddenError } = require('apollo-server');

class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field;
    const requiredRole = this.args.requires;

    field.resolve = async function(...args) {
      const context = args[2];
      const user = context.user;

      if (!user) {
        throw new AuthenticationError('Not authenticated');
      }

      if (user.role !== requiredRole) {
        throw new ForbiddenError(`Requires ${requiredRole} role`);
      }

      return resolve.apply(this, args);
    };
  }
}
```

**3. Resolver-Level Guards:**
```javascript
// Guard middleware
const requireAuth = (next) => (parent, args, context, info) => {
  if (!context.user) {
    throw new AuthenticationError('Not authenticated');
  }
  return next(parent, args, context, info);
};

const requireRole = (...roles) => (next) => (parent, args, context, info) => {
  if (!context.user || !roles.includes(context.user.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  return next(parent, args, context, info);
};

// Apply to resolvers
const resolvers = {
  Query: {
    users: requireAuth(requireRole('admin')(async () => {
      return await User.find();
    })),
  },
  Mutation: {
    deleteUser: requireAuth(requireRole('admin', 'moderator')(
      async (parent, { id }) => {
        await User.findByIdAndDelete(id);
        return true;
      }
    )),
  },
};
```

**Interview Tip:** Mention that authentication happens in the context function (once per request), while authorization happens in resolvers (per field). Also mention field-level authorization for sensitive data.

---

### Q4: How do you implement pagination in GraphQL?

**Answer:**

**Three Approaches:**

**1. Offset-Based (Simple but Limited):**
```graphql
type Query {
  posts(limit: Int, offset: Int): PostConnection!
}

type PostConnection {
  posts: [Post!]!
  totalCount: Int!
  hasMore: Boolean!
}
```

```javascript
Query: {
  posts: async (parent, { limit = 20, offset = 0 }) => {
    const posts = await Post.find().skip(offset).limit(limit);
    const totalCount = await Post.countDocuments();

    return {
      posts,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  }
}

// Usage
query {
  posts(limit: 20, offset: 40) {
    posts { id title }
    totalCount
    hasMore
  }
}
```

**Pros:** Simple, can jump to any page
**Cons:** Slow for large offsets, inconsistent if data changes

---

**2. Cursor-Based (Relay-Style - Recommended):**
```graphql
type Query {
  posts(first: Int, after: String, last: Int, before: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type PostEdge {
  cursor: String!
  node: Post!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

```javascript
Query: {
  posts: async (parent, { first = 20, after }) => {
    let query = Post.find().sort({ _id: -1 });

    // Apply cursor filter
    if (after) {
      const decodedCursor = Buffer.from(after, 'base64').toString();
      query = query.where('_id').lt(decodedCursor);
    }

    // Fetch one extra to check if there's more
    const posts = await query.limit(first + 1).exec();
    const hasMore = posts.length > first;

    if (hasMore) {
      posts.pop(); // Remove extra
    }

    // Generate edges with cursors
    const edges = posts.map(post => ({
      cursor: Buffer.from(post._id.toString()).toString('base64'),
      node: post,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: hasMore,
        hasPreviousPage: !!after,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
      totalCount: await Post.countDocuments(),
    };
  }
}

// Usage
query {
  posts(first: 20, after: "Y3Vyc29yMTIz") {
    edges {
      cursor
      node {
        id
        title
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Pros:** Fast, consistent, standard (Relay spec)
**Cons:** More complex, can't jump to specific page

---

**3. Hybrid Approach (Page + Cursor):**
```graphql
type Query {
  posts(page: Int, pageSize: Int, cursor: String): PostConnection!
}
```

**Comparison Table:**

| Feature | Offset | Cursor | Hybrid |
|---------|--------|--------|--------|
| **Complexity** | Low | High | Medium |
| **Performance** | Slow (large offset) | Fast | Fast |
| **Jump to page** | ✅ Yes | ❌ No | ✅ Yes |
| **Real-time data** | ❌ Inconsistent | ✅ Consistent | ⚠️ Partial |
| **Use Case** | Admin panels | Infinite scroll | Hybrid UIs |

**Interview Tip:** Mention that for public-facing apps with infinite scroll (Twitter, Instagram), cursor-based is standard. For admin dashboards with page numbers, offset-based is acceptable.

---

### Q5: What are the main performance challenges with GraphQL and how do you solve them?

**Answer:**

**1. N+1 Problem → DataLoader**
```javascript
// Problem: 1 + N queries
// Solution: DataLoader batches into 1 + 1 queries
const userLoader = new DataLoader(batchGetUsers);
```

**2. Deep/Complex Queries → Query Depth/Complexity Limiting**
```javascript
const depthLimit = require('graphql-depth-limit');
const { createComplexityLimitRule } = require('graphql-validation-complexity');

const server = new ApolloServer({
  validationRules: [
    depthLimit(5), // Max depth: 5 levels
    createComplexityLimitRule(1000), // Max cost: 1000 points
  ],
});

// Prevent: query { user { posts { comments { user { posts... }}}}}
```

**3. Over-fetching from Database → Field-Level Resolvers**
```javascript
// ❌ BAD: Fetch all fields even if not requested
Query: {
  user: (parent, { id }) => User.findById(id)
}

// ✅ GOOD: Only fetch requested fields
const getRequestedFields = (info) => {
  const fields = {};
  info.fieldNodes[0].selectionSet.selections.forEach(field => {
    fields[field.name.value] = 1;
  });
  return fields;
};

Query: {
  user: (parent, { id }, context, info) => {
    const projection = getRequestedFields(info);
    return User.findById(id).select(projection);
  }
}
```

**4. Slow Queries → Query Caching**
```javascript
// Response caching (Apollo)
const { ApolloServer } = require('apollo-server');
const { InMemoryLRUCache } = require('apollo-server-caching');

const server = new ApolloServer({
  cache: new InMemoryLRUCache({
    maxSize: Math.pow(2, 20) * 100, // 100MB
    ttl: 300, // 5 minutes
  }),
  resolvers: {
    Query: {
      posts: async () => {
        // Results cached automatically
        return await Post.find();
      },
    },
  },
});

// Or use Redis for distributed caching
const RedisCache = require('apollo-server-cache-redis').default;
const cache = new RedisCache({
  host: 'redis-server',
  ttl: 600,
});
```

**5. Large Payloads → Pagination + Field Limiting**
```javascript
// Force pagination
posts: (parent, { limit = 20, offset = 0 }) => {
  const maxLimit = 100;
  const safeLimit = Math.min(limit, maxLimit);
  return Post.find().skip(offset).limit(safeLimit);
}
```

**Interview Tip:** Explain that GraphQL gives clients power, but you must protect your API with query complexity analysis, depth limiting, and pagination.

---

### Q6: How would you handle file uploads in GraphQL?

**Answer:**

**Option 1: GraphQL Upload (multipart/form-data)**

```javascript
const { GraphQLUpload } = require('graphql-upload');
const { createWriteStream } = require('fs');
const { finished } = require('stream/promises');
const path = require('path');

const typeDefs = gql`
  scalar Upload

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    url: String!
  }

  type Mutation {
    uploadFile(file: Upload!): File!
    uploadMultiple(files: [Upload!]!): [File!]!
  }
`;

const resolvers = {
  Upload: GraphQLUpload,

  Mutation: {
    uploadFile: async (parent, { file }) => {
      const { createReadStream, filename, mimetype, encoding } = await file;

      // Save to local filesystem
      const stream = createReadStream();
      const filePath = path.join(__dirname, 'uploads', filename);
      const writeStream = createWriteStream(filePath);

      stream.pipe(writeStream);
      await finished(writeStream);

      // Or upload to S3
      // await s3.upload({ Body: stream, Key: filename }).promise();

      return {
        filename,
        mimetype,
        encoding,
        url: `/uploads/${filename}`,
      };
    },

    uploadMultiple: async (parent, { files }) => {
      return Promise.all(files.map(file => resolvers.Mutation.uploadFile(null, { file })));
    },
  },
};
```

**Client Usage:**
```javascript
// React + Apollo Client
import { gql, useMutation } from '@apollo/client';

const UPLOAD_FILE = gql`
  mutation UploadFile($file: Upload!) {
    uploadFile(file: $file) {
      filename
      url
    }
  }
`;

function FileUpload() {
  const [uploadFile] = useMutation(UPLOAD_FILE);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const { data } = await uploadFile({ variables: { file } });
      console.log('Uploaded:', data.uploadFile.url);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return <input type="file" onChange={handleFileChange} />;
}
```

---

**Option 2: Signed URL Approach (Recommended for Production)**

```graphql
type Mutation {
  getUploadUrl(filename: String!, contentType: String!): UploadUrl!
}

type UploadUrl {
  uploadUrl: String!
  fileUrl: String!
}
```

```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const resolvers = {
  Mutation: {
    getUploadUrl: async (parent, { filename, contentType }) => {
      const key = `uploads/${Date.now()}_${filename}`;

      // Generate presigned URL for upload
      const uploadUrl = await s3.getSignedUrlPromise('putObject', {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: contentType,
        Expires: 300, // 5 minutes
      });

      const fileUrl = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;

      return { uploadUrl, fileUrl };
    },
  },
};
```

**Client Usage:**
```javascript
// 1. Get signed URL from GraphQL
const { data } = await getUploadUrl({
  variables: {
    filename: file.name,
    contentType: file.type,
  },
});

// 2. Upload directly to S3
await fetch(data.getUploadUrl.uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file,
});

// 3. File now available at data.getUploadUrl.fileUrl
```

**Comparison:**

| Method | Pros | Cons | Use Case |
|--------|------|------|----------|
| **GraphQL Upload** | Simple, all in one request | Large files block GraphQL | Small files, simple apps |
| **Signed URL** | Scalable, doesn't block API | Two-step process | Production, large files |

**Interview Tip:** Mention that for production apps with large files, signed URLs are preferred because they don't route files through your API server, reducing load and allowing parallel uploads.

---

## ✅ Key Takeaways

1. **GraphQL solves over/under-fetching** by allowing clients to request exactly what they need
2. **N+1 problem** is the most common performance issue - use DataLoader to batch requests
3. **Schema-first development** with strong typing catches errors early and improves tooling
4. **Authentication via context** - verify JWT in context function, check permissions in resolvers
5. **Pagination: cursor-based > offset-based** for large datasets and real-time data
6. **Query complexity limits** are essential to prevent malicious queries
7. **Disable introspection and playground** in production for security
8. **GraphQL complements REST** - doesn't always replace it (use REST for file operations)
9. **Field-level authorization** provides fine-grained security control
10. **Caching is more complex** than REST - requires careful planning with tools like DataLoader

---

[← Back to Backend](../README.md) | [Next: API Versioning →](./03-versioning.md)
