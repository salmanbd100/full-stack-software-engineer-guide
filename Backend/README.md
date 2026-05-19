# Backend Engineering — Interview Prep

Senior-level reference covering the backend topics that show up in MNC and FAANG interviews: Node.js internals, SQL and NoSQL databases, API design, security, design patterns, and testing.

> Target audience: Senior / Staff engineers (5+ years). Focus is **depth on common topics**, not exhaustive reference.

---

## 📁 Sections

### [NodeJS/](./NodeJS/)

Runtime internals and production patterns.

| #   | Topic                                                     |
| --- | --------------------------------------------------------- |
| 01  | [Event Loop & Async Programming](./NodeJS/01-event-loop-async.md) |
| 02  | [Streams & Buffers](./NodeJS/02-streams-buffers.md)       |
| 03  | [Module System](./NodeJS/03-module-system.md)             |
| 04  | [Error Handling](./NodeJS/04-error-handling.md)           |
| 05  | [Performance](./NodeJS/05-performance.md)                 |
| 06  | [Security](./NodeJS/06-security.md)                       |
| 07  | [Child Processes](./NodeJS/07-child-processes.md)         |
| 08  | [Clustering](./NodeJS/08-clustering.md)                   |

### [SQL/](./SQL/)

Relational databases — PostgreSQL focus.

| #   | Topic                                                     |
| --- | --------------------------------------------------------- |
| 01  | [Fundamentals](./SQL/01-fundamentals.md)                  |
| 02  | [Database Design](./SQL/02-database-design.md)            |
| 03  | [Indexes](./SQL/03-indexes.md)                            |
| 04  | [Transactions & ACID](./SQL/04-transactions.md)           |
| 05  | [PostgreSQL](./SQL/05-postgresql.md)                      |
| 06  | [ORMs](./SQL/06-orms.md)                                  |
| 07  | [Migrations](./SQL/07-migrations.md)                      |
| 08  | [Query Optimization](./SQL/08-optimization.md)            |

### [NoSQL/](./NoSQL/)

MongoDB document modeling and Redis.

| #   | Topic                                                     |
| --- | --------------------------------------------------------- |
| 01  | [MongoDB Fundamentals](./NoSQL/01-mongodb.md)             |
| 02  | [Document Design Patterns](./NoSQL/02-design-patterns.md) |
| 03  | [Aggregation Pipeline](./NoSQL/03-aggregation.md)         |
| 04  | [Indexing & Performance](./NoSQL/04-indexing.md)          |
| 05  | [Mongoose ODM](./NoSQL/05-mongoose.md)                    |
| 06  | [Redis](./NoSQL/06-redis.md)                              |

### [API/](./API/)

REST, GraphQL, and real-time.

| #   | Topic                                                     |
| --- | --------------------------------------------------------- |
| 01  | [REST Best Practices](./API/01-rest-best-practices.md)    |
| 02  | [GraphQL](./API/02-graphql.md)                            |
| 03  | [Versioning](./API/03-versioning.md)                      |
| 04  | [Rate Limiting](./API/04-rate-limiting.md)                |
| 05  | [Documentation](./API/05-documentation.md)                |
| 06  | [WebSockets](./API/06-websockets.md)                      |

### [Security/](./Security/)

Authentication, authorization, transport, and input safety.

| #   | Topic                                                     |
| --- | --------------------------------------------------------- |
| 01  | [JWT Authentication](./Security/01-jwt.md)                |
| 02  | [OAuth 2.0](./Security/02-oauth.md)                       |
| 03  | [Password Security](./Security/03-passwords.md)           |
| 04  | [HTTPS / TLS](./Security/04-https.md)                     |
| 05  | [CORS & CSRF](./Security/05-cors-csrf.md)                 |
| 06  | [Input Validation](./Security/06-validation.md)           |
| 07  | [SQL Injection Prevention](./Security/07-sql-injection.md)|
| 08  | [Security Headers](./Security/08-security-headers.md)     |

### [DesignPatterns/](./DesignPatterns/)

Gang of Four patterns and SOLID principles in TypeScript.

| #   | Topic                                                                 |
| --- | --------------------------------------------------------------------- |
| 01  | [Creational Patterns](./DesignPatterns/01-creational-patterns.md)     |
| 02  | [Structural Patterns](./DesignPatterns/02-structural-patterns.md)     |
| 03  | [Behavioral Patterns](./DesignPatterns/03-behavioral-patterns.md)     |
| 04  | [Architectural Patterns](./DesignPatterns/04-architectural-patterns.md)|
| 05  | [SOLID Principles](./DesignPatterns/05-solid-principles.md)           |

### [Testing/](./Testing/)

Unit → integration → E2E, TDD, and mocking.

| #   | Topic                                                     |
| --- | --------------------------------------------------------- |
| 01  | [Unit Testing](./Testing/01-unit-testing.md)              |
| 02  | [Integration Testing](./Testing/02-integration.md)        |
| 03  | [E2E Testing](./Testing/03-e2e.md)                        |
| 04  | [Test-Driven Development](./Testing/04-tdd.md)            |
| 05  | [Mocking & Stubbing](./Testing/05-mocking.md)             |
| 06  | [Testing Best Practices](./Testing/06-best-practices.md)  |

---

## 🎯 What Interviewers Probe For

| Theme                  | Senior-level signal                                                |
| ---------------------- | ------------------------------------------------------------------ |
| **Node.js internals**  | Event loop phases, microtasks vs macrotasks, worker threads        |
| **Database design**    | Indexing strategy, transactions, N+1, denormalization tradeoffs    |
| **API design**         | REST conventions, idempotency, pagination, versioning              |
| **Security**           | OWASP top 10, JWT tradeoffs, password hashing, CSRF vs CORS        |
| **Scalability**        | Caching layers, queue patterns, horizontal scaling, statelessness  |
| **Testing**            | Pyramid, dependency injection, flake hunting, what *not* to mock   |

---

## 📚 Recommended Resources

- **Designing Data-Intensive Applications** — Martin Kleppmann
- **Node.js Design Patterns** — Mario Casciaro
- **System Design Interview** — Alex Xu (Vol 1 & 2)
- **PostgreSQL docs** — go straight to the source
- **MongoDB University** — free courses on modeling and aggregation

---

[← Back to root](../README.md)
