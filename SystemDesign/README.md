# System Design

Interview prep for **senior frontend** and **mid-to-senior backend** engineers. Covers fundamentals, building blocks, scaling patterns, security, and 20 classic interview questions.

## How to Use This Guide

1. Start with **Fundamentals** — the language every system design answer needs.
2. Move to **BuildingBlocks** — the Lego pieces (load balancers, caches, queues, etc.).
3. Pick a track based on your strength:
   - **Frontend-heavy** → `Frontend/` then `InterviewQuestions/`
   - **Backend-heavy** → `Database/`, `Microservices/`, `Scalability/`
   - **Full-stack** → cover both, then practice with `InterviewQuestions/`
4. Wrap with **Security** and **Infrastructure** before mocks.

> Every topic file is short (150–400 lines), TypeScript-only for code, and follows the RADIO framework where relevant.

## RADIO Framework — Use It Every Interview

| Step | What | Time |
| ---- | ---- | ---- |
| **R**equirements | Functional + non-functional + scale numbers | 5–10 min |
| **A**rchitecture | High-level boxes and arrows | 10–15 min |
| **D**ata model | Core entities + relationships | 5–10 min |
| **I**nterface | 4–6 APIs with request/response shapes | 5–10 min |
| **O**ptimizations | Scaling levers + tradeoffs | 15–20 min |

Full walkthrough: [Fundamentals/08-framework.md](./Fundamentals/08-framework.md).

## Curriculum

### 1. Fundamentals

- [01. Basics](./Fundamentals/01-basics.md) — what is system design, requirements gathering
- [02. Scalability](./Fundamentals/02-scalability.md) — horizontal vs vertical, stateless design
- [03. Reliability & Availability](./Fundamentals/03-reliability.md) — SLAs, redundancy, failover
- [04. Performance](./Fundamentals/04-performance.md) — latency vs throughput, bottlenecks
- [05. CAP Theorem](./Fundamentals/05-cap-theorem.md) — consistency vs availability tradeoffs
- [06. Consistency Patterns](./Fundamentals/06-consistency.md) — strong, eventual, read-after-write
- [07. Back-of-Envelope Calculations](./Fundamentals/07-calculations.md) — QPS, storage, bandwidth
- [08. RADIO Framework](./Fundamentals/08-framework.md) — how to answer an interview question

### 2. Building Blocks

- [01. Load Balancing](./BuildingBlocks/01-load-balancing.md)
- [02. Caching](./BuildingBlocks/02-caching.md)
- [03. CDN](./BuildingBlocks/03-cdn.md)
- [04. Databases](./BuildingBlocks/04-databases.md)
- [05. Message Queues](./BuildingBlocks/05-message-queues.md)
- [06. WebSockets](./BuildingBlocks/06-websockets.md)
- [07. Search](./BuildingBlocks/07-search.md)
- [08. Notifications](./BuildingBlocks/08-notifications.md)
- [09. File Storage](./BuildingBlocks/09-file-storage.md)
- [10. Monitoring](./BuildingBlocks/10-monitoring.md)

### 3. Database

- [README](./Database/README.md)
- [01. SQL Design](./Database/01-sql-design.md)
- [02. NoSQL Design](./Database/02-nosql-design.md)
- [03. Sharding](./Database/03-sharding.md)
- [04. Replication](./Database/04-replication.md)
- [05. Indexing](./Database/05-indexing.md)
- [06. Transactions](./Database/06-transactions.md)
- [07. CAP Theorem (data view)](./Database/07-cap-theorem.md)
- [08. Consistency (data view)](./Database/08-consistency.md)
- [09. Data Modeling](./Database/09-data-modeling.md)
- [10. Query Optimization](./Database/10-query-optimization.md)

### 4. Scalability

- [01. Horizontal Scaling](./Scalability/01-horizontal-scaling.md)
- [02. Vertical Scaling](./Scalability/02-vertical-scaling.md)
- [03. Load Balancing Strategies](./Scalability/03-load-balancing.md)
- [04. Caching Strategies](./Scalability/04-caching-strategies.md)
- [05. Database Scaling](./Scalability/05-database-scaling.md)
- [06. CDN as Scaling Lever](./Scalability/06-cdn.md)
- [07. Async Processing](./Scalability/07-async-processing.md)
- [08. Partitioning](./Scalability/08-partitioning.md)

### 5. Microservices

- [01. Architecture](./Microservices/01-architecture.md)
- [02. Service Discovery](./Microservices/02-service-discovery.md)
- [03. API Gateway](./Microservices/03-api-gateway.md)
- [04. Communication](./Microservices/04-communication.md)
- [05. Data Management](./Microservices/05-data-management.md)
- [06. Deployment](./Microservices/06-deployment.md)
- [07. Monitoring (tracing + mesh)](./Microservices/07-monitoring.md)
- [08. Resilience](./Microservices/08-resilience.md)

### 6. Frontend System Design

- [00. Interview Strategy](./Frontend/00-interview-strategy.md)
- [01. Architecture](./Frontend/01-architecture.md)
- [02. State Management](./Frontend/02-state-management.md)
- [03. Rendering](./Frontend/03-rendering.md)
- [04. Performance](./Frontend/04-performance.md)
- [05. Micro-Frontends](./Frontend/05-micro-frontends.md)
- [06. Real-Time](./Frontend/06-real-time.md)
- [07. Offline-First](./Frontend/07-offline-first.md)
- [08. Design Systems](./Frontend/08-design-systems.md)
- [09. Assets](./Frontend/09-assets.md)
- [10. SEO & Analytics](./Frontend/10-seo-analytics.md)
- [11. Auth](./Frontend/11-auth.md)
- [12. Monitoring](./Frontend/12-monitoring.md)

### 7. Infrastructure

- [01. AWS Basics](./Infrastructure/01-aws-basics.md)
- [02. Compute](./Infrastructure/02-compute.md)
- [03. Storage](./Infrastructure/03-storage.md)
- [04. Networking](./Infrastructure/04-networking.md)
- [05. Containers](./Infrastructure/05-containers.md)
- [06. CI/CD](./Infrastructure/06-ci-cd.md)
- [07. Monitoring](./Infrastructure/07-monitoring.md)
- [08. Disaster Recovery](./Infrastructure/08-disaster-recovery.md)

### 8. Security

- [01. Authentication](./Security/01-authentication.md)
- [02. Authorization](./Security/02-authorization.md)
- [03. Encryption](./Security/03-encryption.md)
- [04. API Security](./Security/04-api-security.md)
- [05. Common Attacks](./Security/05-common-attacks.md)
- [06. Compliance](./Security/06-compliance.md)

### 9. Interview Questions (RADIO walkthroughs)

| # | Question | # | Question |
| -- | -------- | -- | -------- |
| 01 | [Twitter](./InterviewQuestions/01-twitter.md) | 11 | [URL Shortener](./InterviewQuestions/11-url-shortener.md) |
| 02 | [Instagram](./InterviewQuestions/02-instagram.md) | 12 | [Rate Limiter](./InterviewQuestions/12-rate-limiter.md) |
| 03 | [Facebook Newsfeed](./InterviewQuestions/03-facebook-newsfeed.md) | 13 | [Notification System](./InterviewQuestions/13-notification-system.md) |
| 04 | [Uber](./InterviewQuestions/04-uber.md) | 14 | [Chat System](./InterviewQuestions/14-chat-system.md) |
| 05 | [WhatsApp](./InterviewQuestions/05-whatsapp.md) | 15 | [Web Crawler](./InterviewQuestions/15-web-crawler.md) |
| 06 | [YouTube](./InterviewQuestions/06-youtube.md) | 16 | [Typeahead](./InterviewQuestions/16-typeahead.md) |
| 07 | [Netflix](./InterviewQuestions/07-netflix.md) | 17 | [API Gateway](./InterviewQuestions/17-api-gateway.md) |
| 08 | [Amazon](./InterviewQuestions/08-amazon.md) | 18 | [Distributed Cache](./InterviewQuestions/18-distributed-cache.md) |
| 09 | [Google Search](./InterviewQuestions/09-google-search.md) | 19 | [Parking Lot](./InterviewQuestions/19-parking-lot.md) |
| 10 | [Dropbox](./InterviewQuestions/10-dropbox.md) | 20 | [Ticketmaster](./InterviewQuestions/20-ticketmaster.md) |

## Common Mistakes

| ❌ Mistake | ✅ Do Instead |
| ---------- | -------------- |
| Jump into the solution | Spend 5 minutes on requirements first |
| Overengineer for day 1 | Start simple, scale as the interviewer pushes |
| Skip non-functional needs | Always cover latency, availability, consistency |
| Ignore tradeoffs | "X is faster, but we lose Y" — say both sides |
| Draw messy diagrams | Clean boxes, labeled arrows, top-down flow |
| Memorize architectures | Learn patterns, then derive the design live |

> Interviewers don't grade the final diagram. They grade your **reasoning**.

## Recommended Resources

- **Designing Data-Intensive Applications** — Martin Kleppmann
- **System Design Interview Vol 1 & 2** — Alex Xu
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
- [ByteByteGo](https://bytebytego.com/)
- [High Scalability blog](http://highscalability.com/)

---

[← Back to Interview Preparation](../README.md)
