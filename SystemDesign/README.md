# System Design - Interview Preparation Guide

## 🎯 Introduction

Welcome to the **System Design Interview Preparation Guide** tailored for engineers with **senior-level frontend**, **mid-level backend**, and **DevOps** expertise. This guide covers both **Frontend System Design** and **Backend System Design**, leveraging your full-stack and infrastructure knowledge.

### Who This Guide Is For

- **Senior Frontend Engineers** (5+ years) preparing for system design interviews
- **Mid-level Backend Engineers** (2-5 years) expanding to full system design
- **Full-Stack Engineers** with DevOps knowledge
- Engineers preparing for FAANG/tech company interviews
- Those transitioning to **Staff/Principal Engineer** roles

### What Makes This Different

✅ **Frontend System Design** - Building complex UIs, micro-frontends, state management at scale
✅ **Backend System Design** - APIs, databases, microservices, distributed systems
✅ **Infrastructure & DevOps** - Scalability, deployment, monitoring, AWS architecture
✅ **Real-World Scenarios** - Practical examples from production systems
✅ **Interview-Ready** - Framework for answering system design questions
✅ **Hands-On Projects** - Build real systems to demonstrate knowledge

---

## 📚 System Design Fundamentals

### Core Concepts Every Engineer Must Know

```
System Design Pillars
├── Scalability: Horizontal vs Vertical scaling
├── Reliability: Fault tolerance, redundancy
├── Availability: Uptime, SLAs (99.9%, 99.99%)
├── Performance: Latency, throughput optimization
├── Consistency: CAP theorem, eventual consistency
├── Maintainability: Code quality, monitoring
└── Security: Authentication, authorization, encryption
```

---

## 🗺️ Complete Curriculum (90+ Topics)

### 1. System Design Fundamentals (8 Topics)

**Core Principles**
- [01. System Design Basics](./Fundamentals/01-basics.md)
  - What is system design?
  - Design thinking process
  - Requirements gathering
  - Capacity estimation

- [02. Scalability](./Fundamentals/02-scalability.md)
  - Horizontal vs vertical scaling
  - Stateless vs stateful architecture
  - Scaling databases
  - Auto-scaling strategies

- [03. Reliability & Availability](./Fundamentals/03-reliability.md)
  - SLAs, SLOs, SLIs
  - Fault tolerance
  - Redundancy and replication
  - Disaster recovery

- [04. Performance Optimization](./Fundamentals/04-performance.md)
  - Latency vs throughput
  - Performance metrics
  - Bottleneck identification
  - Performance testing

- [05. CAP Theorem](./Fundamentals/05-cap-theorem.md)
  - Consistency, Availability, Partition tolerance
  - Trade-offs in distributed systems
  - Real-world examples
  - Choosing the right guarantees

- [06. Consistency Patterns](./Fundamentals/06-consistency.md)
  - Strong consistency
  - Eventual consistency
  - Read-after-write consistency
  - Causal consistency

- [07. Back-of-Envelope Calculations](./Fundamentals/07-calculations.md)
  - QPS (Queries Per Second) estimation
  - Storage calculations
  - Bandwidth estimation
  - Memory calculations

- [08. System Design Interview Framework](./Fundamentals/08-framework.md)
  - RADIO framework (Requirements, Architecture, Data model, Interface, Optimizations)
  - Asking clarifying questions
  - Drawing diagrams
  - Communicating trade-offs

---

### 2. Frontend System Design (12 Topics)

**Building Complex Frontend Systems**

- [01. Frontend Architecture Patterns](./Frontend/01-architecture.md)
  - MVC, MVP, MVVM
  - Component-based architecture
  - Micro-frontends
  - Module federation

- [02. State Management at Scale](./Frontend/02-state-management.md)
  - Redux architecture
  - Context API patterns
  - Zustand, Jotai
  - State synchronization
  - Optimistic updates

- [03. Rendering Strategies](./Frontend/03-rendering.md)
  - CSR, SSR, SSG, ISR
  - Hydration strategies
  - Streaming SSR
  - Islands architecture

- [04. Performance Optimization](./Frontend/04-performance.md)
  - Core Web Vitals (LCP, FID, CLS)
  - Code splitting and lazy loading
  - Bundle optimization
  - Image optimization
  - Caching strategies

- [05. Micro-Frontends](./Frontend/05-micro-frontends.md)
  - Micro-frontend architecture
  - Module federation
  - Independent deployments
  - Shared dependencies
  - Communication patterns

- [06. Real-Time Features](./Frontend/06-real-time.md)
  - WebSockets
  - Server-Sent Events (SSE)
  - Long polling
  - Real-time state sync
  - Collaborative editing

- [07. Offline-First Applications](./Frontend/07-offline-first.md)
  - Service Workers
  - IndexedDB
  - Cache strategies
  - Sync mechanisms
  - PWA architecture

- [08. Design Systems at Scale](./Frontend/08-design-systems.md)
  - Component libraries
  - Theming systems
  - Design tokens
  - Versioning strategies
  - Monorepo architecture

- [09. Asset Management](./Frontend/09-assets.md)
  - CDN strategies
  - Image optimization
  - Font loading
  - Video streaming
  - Static asset versioning

- [10. SEO & Analytics](./Frontend/10-seo-analytics.md)
  - SEO optimization
  - Meta tags and Open Graph
  - Analytics integration
  - A/B testing infrastructure
  - Performance monitoring

- [11. Authentication & Authorization](./Frontend/11-auth.md)
  - JWT vs sessions
  - OAuth 2.0 / OpenID Connect
  - Token refresh strategies
  - Role-based access control (RBAC)
  - Secure storage

- [12. Error Handling & Monitoring](./Frontend/12-monitoring.md)
  - Error boundaries
  - Logging strategies
  - Sentry, DataDog RUM
  - Performance monitoring
  - User session replay

---

### 3. Building Blocks (10 Topics)

**Essential Components of Distributed Systems**

- [01. Load Balancers](./BuildingBlocks/01-load-balancers.md)
  - Layer 4 vs Layer 7
  - Load balancing algorithms
  - AWS ALB, NLB
  - Health checks
  - Session persistence

- [02. Caching](./BuildingBlocks/02-caching.md)
  - Cache strategies (read-through, write-through, write-back)
  - Redis, Memcached
  - CDN caching (CloudFront)
  - Browser caching
  - Cache invalidation

- [03. Databases - SQL](./BuildingBlocks/03-sql-databases.md)
  - ACID properties
  - Indexing strategies
  - Normalization vs denormalization
  - Sharding and partitioning
  - Replication (master-slave, master-master)
  - PostgreSQL, MySQL, AWS RDS

- [04. Databases - NoSQL](./BuildingBlocks/04-nosql-databases.md)
  - Document stores (MongoDB)
  - Key-value stores (Redis, DynamoDB)
  - Column-family (Cassandra)
  - Graph databases (Neo4j)
  - When to use NoSQL

- [05. Message Queues](./BuildingBlocks/05-message-queues.md)
  - RabbitMQ, Apache Kafka
  - AWS SQS, SNS
  - Pub/Sub patterns
  - Event-driven architecture
  - Message ordering and delivery guarantees

- [06. API Gateway](./BuildingBlocks/06-api-gateway.md)
  - Rate limiting
  - Authentication
  - Request routing
  - API versioning
  - AWS API Gateway, Kong

- [07. CDN (Content Delivery Network)](./BuildingBlocks/07-cdn.md)
  - Edge locations
  - Cache strategies
  - CloudFront, Cloudflare
  - Origin shielding
  - Dynamic content acceleration

- [08. Blob Storage](./BuildingBlocks/08-blob-storage.md)
  - Object storage (AWS S3)
  - File storage (AWS EFS)
  - Block storage (AWS EBS)
  - Storage classes
  - Lifecycle policies

- [09. Search Engines](./BuildingBlocks/09-search.md)
  - Elasticsearch
  - Amazon OpenSearch
  - Full-text search
  - Indexing strategies
  - Search relevance

- [10. Monitoring & Logging](./BuildingBlocks/10-monitoring.md)
  - Metrics (Prometheus, CloudWatch)
  - Logging (ELK stack)
  - Distributed tracing (Jaeger, X-Ray)
  - Alerting strategies
  - Observability

---

### 4. API Design (8 Topics)

**Designing Scalable APIs**

- [01. REST API Design](./API/01-rest.md)
  - REST principles
  - Resource naming
  - HTTP methods and status codes
  - Pagination, filtering, sorting
  - Versioning strategies

- [02. GraphQL](./API/02-graphql.md)
  - GraphQL vs REST
  - Schema design
  - Resolvers and data loaders
  - N+1 problem
  - Subscriptions

- [03. gRPC](./API/03-grpc.md)
  - Protocol Buffers
  - gRPC vs REST
  - Streaming
  - Service mesh integration

- [04. WebSockets & Real-Time APIs](./API/04-websockets.md)
  - WebSocket protocol
  - Socket.io
  - Real-time data sync
  - Scaling WebSockets

- [05. API Security](./API/05-security.md)
  - Authentication (JWT, OAuth)
  - Authorization (RBAC, ABAC)
  - Rate limiting
  - CORS
  - API keys and secrets

- [06. API Versioning](./API/06-versioning.md)
  - URI versioning
  - Header versioning
  - Deprecation strategies
  - Backward compatibility

- [07. API Documentation](./API/07-documentation.md)
  - OpenAPI/Swagger
  - API documentation tools
  - Interactive documentation
  - Code generation

- [08. API Rate Limiting & Throttling](./API/08-rate-limiting.md)
  - Token bucket algorithm
  - Leaky bucket algorithm
  - Fixed window vs sliding window
  - Distributed rate limiting

---

### 5. Database Design (10 Topics)

**Data Modeling & Optimization**

- [01. Database Schema Design](./Database/01-schema-design.md)
  - Entity-relationship diagrams
  - Normalization (1NF, 2NF, 3NF)
  - Denormalization for performance
  - Schema versioning

- [02. Indexing Strategies](./Database/02-indexing.md)
  - B-tree vs Hash indexes
  - Composite indexes
  - Covering indexes
  - Index optimization
  - When to avoid indexes

- [03. Sharding & Partitioning](./Database/03-sharding.md)
  - Horizontal sharding
  - Vertical partitioning
  - Sharding keys
  - Consistent hashing
  - Cross-shard queries

- [04. Replication](./Database/04-replication.md)
  - Master-slave replication
  - Master-master replication
  - Read replicas
  - Replication lag
  - Conflict resolution

- [05. Transactions & ACID](./Database/05-transactions.md)
  - ACID properties
  - Isolation levels
  - Two-phase commit
  - Distributed transactions
  - Saga pattern

- [06. Database Optimization](./Database/06-optimization.md)
  - Query optimization
  - Explain plans
  - Connection pooling
  - Prepared statements
  - Database tuning

- [07. Data Warehousing](./Database/07-warehousing.md)
  - OLTP vs OLAP
  - Data lakes
  - ETL pipelines
  - Amazon Redshift
  - BigQuery

- [08. Time-Series Databases](./Database/08-timeseries.md)
  - InfluxDB, TimescaleDB
  - Use cases
  - Data retention
  - Aggregations

- [09. Data Consistency](./Database/09-consistency.md)
  - Strong vs eventual consistency
  - Vector clocks
  - Conflict-free replicated data types (CRDTs)
  - Consistency patterns

- [10. Database Migration](./Database/10-migration.md)
  - Zero-downtime migrations
  - Schema changes
  - Data migration strategies
  - Rollback plans

---

### 6. Microservices Architecture (8 Topics)

**Distributed Systems Design**

- [01. Microservices Fundamentals](./Microservices/01-fundamentals.md)
  - Monolith vs microservices
  - Service boundaries
  - Domain-driven design
  - Decomposition strategies

- [02. Service Communication](./Microservices/02-communication.md)
  - Synchronous (REST, gRPC)
  - Asynchronous (message queues)
  - Service mesh (Istio, AWS App Mesh)
  - Circuit breaker pattern

- [03. Service Discovery](./Microservices/03-service-discovery.md)
  - Client-side vs server-side
  - Consul, Eureka
  - Kubernetes service discovery
  - AWS Cloud Map

- [04. API Gateway Pattern](./Microservices/04-api-gateway.md)
  - Backend for Frontend (BFF)
  - Request aggregation
  - Authentication/authorization
  - Rate limiting

- [05. Event-Driven Architecture](./Microservices/05-event-driven.md)
  - Event sourcing
  - CQRS (Command Query Responsibility Segregation)
  - Kafka, AWS EventBridge
  - Event schemas

- [06. Data Management](./Microservices/06-data-management.md)
  - Database per service
  - Shared database anti-pattern
  - Distributed transactions
  - Saga pattern

- [07. Resilience Patterns](./Microservices/07-resilience.md)
  - Circuit breaker
  - Retry with exponential backoff
  - Bulkhead pattern
  - Timeout strategies

- [08. Observability](./Microservices/08-observability.md)
  - Distributed tracing
  - Centralized logging
  - Metrics aggregation
  - Service health checks

---

### 7. Scalability & Performance (8 Topics)

**Building Systems That Scale**

- [01. Horizontal vs Vertical Scaling](./Scalability/01-scaling-strategies.md)
  - Scale-up vs scale-out
  - Stateless architecture
  - Auto-scaling
  - Cost considerations

- [02. Caching Strategies](./Scalability/02-caching.md)
  - Cache-aside
  - Read-through, write-through
  - Write-behind (write-back)
  - Cache eviction policies (LRU, LFU)

- [03. Database Scaling](./Scalability/03-database-scaling.md)
  - Read replicas
  - Sharding
  - Connection pooling
  - Query optimization

- [04. Asynchronous Processing](./Scalability/04-async-processing.md)
  - Task queues
  - Background jobs
  - Worker pools
  - Job scheduling

- [05. CDN & Edge Computing](./Scalability/05-cdn-edge.md)
  - Edge caching
  - Edge functions (Lambda@Edge)
  - Geographic distribution
  - Origin shielding

- [06. Load Balancing Strategies](./Scalability/06-load-balancing.md)
  - Round robin
  - Least connections
  - IP hash
  - Consistent hashing

- [07. Rate Limiting](./Scalability/07-rate-limiting.md)
  - Token bucket
  - Leaky bucket
  - Fixed/sliding window
  - Distributed rate limiting

- [08. Content Optimization](./Scalability/08-content-optimization.md)
  - Compression (Gzip, Brotli)
  - Image optimization
  - Video streaming
  - Lazy loading

---

### 8. Security & Compliance (6 Topics)

**Building Secure Systems**

- [01. Authentication & Authorization](./Security/01-auth.md)
  - OAuth 2.0 / OpenID Connect
  - JWT vs sessions
  - Multi-factor authentication
  - SSO (Single Sign-On)

- [02. Data Security](./Security/02-data-security.md)
  - Encryption at rest
  - Encryption in transit
  - Key management (AWS KMS)
  - PII protection

- [03. API Security](./Security/03-api-security.md)
  - HTTPS/TLS
  - API authentication
  - CORS
  - Input validation

- [04. Network Security](./Security/04-network-security.md)
  - Firewalls and security groups
  - DDoS protection (AWS Shield)
  - WAF (Web Application Firewall)
  - VPC design

- [05. Compliance](./Security/05-compliance.md)
  - GDPR, CCPA
  - HIPAA, PCI-DSS
  - Audit logging
  - Data retention policies

- [06. Security Best Practices](./Security/06-best-practices.md)
  - Principle of least privilege
  - Defense in depth
  - Security monitoring
  - Incident response

---

### 9. Infrastructure & DevOps (8 Topics)

**Deployment & Operations**

- [01. Cloud Architecture (AWS)](./Infrastructure/01-cloud-architecture.md)
  - Multi-region deployments
  - High availability
  - Disaster recovery
  - Cost optimization

- [02. Containerization](./Infrastructure/02-containers.md)
  - Docker architecture
  - Container orchestration
  - EKS, ECS, Fargate
  - Container security

- [03. CI/CD Pipelines](./Infrastructure/03-cicd.md)
  - Build pipelines
  - Deployment strategies
  - Blue-green, canary
  - GitOps

- [04. Infrastructure as Code](./Infrastructure/04-iac.md)
  - Terraform
  - CloudFormation
  - Configuration management
  - Immutable infrastructure

- [05. Monitoring & Observability](./Infrastructure/05-monitoring.md)
  - CloudWatch, Prometheus
  - Distributed tracing
  - Log aggregation
  - Alerting strategies

- [06. Auto-Scaling](./Infrastructure/06-autoscaling.md)
  - Application auto-scaling
  - Database auto-scaling
  - Kubernetes HPA
  - Predictive scaling

- [07. Service Mesh](./Infrastructure/07-service-mesh.md)
  - Istio, Linkerd
  - AWS App Mesh
  - Traffic management
  - Security policies

- [08. Disaster Recovery](./Infrastructure/08-disaster-recovery.md)
  - Backup strategies
  - RPO and RTO
  - Multi-region failover
  - Chaos engineering

---

### 10. Common System Design Questions (20 Topics)

**Real Interview Questions**

#### Frontend-Heavy Systems
- [01. Design Twitter Feed](./Questions/01-twitter-feed.md)
  - Infinite scroll
  - Real-time updates
  - Optimistic UI
  - State management

- [02. Design Facebook News Feed](./Questions/02-facebook-feed.md)
  - Personalized feed
  - Ranking algorithm
  - Real-time notifications
  - Media rendering

- [03. Design Google Docs (Collaborative Editor)](./Questions/03-google-docs.md)
  - Real-time collaboration
  - Operational transformation
  - Conflict resolution
  - Offline support

- [04. Design Netflix Video Player](./Questions/04-video-player.md)
  - Adaptive bitrate streaming
  - Video buffering
  - Analytics
  - DRM

- [05. Design Instagram Stories](./Questions/05-instagram-stories.md)
  - Media upload/processing
  - Progressive image loading
  - Real-time viewers
  - Ephemeral content

#### Full-Stack Systems
- [06. Design URL Shortener (Bit.ly)](./Questions/06-url-shortener.md)
  - Short URL generation
  - Redirection service
  - Analytics
  - Rate limiting

- [07. Design Pastebin](./Questions/07-pastebin.md)
  - Text storage
  - Expiration
  - Syntax highlighting
  - Public/private pastes

- [08. Design Chat Application (WhatsApp/Slack)](./Questions/08-chat-app.md)
  - Real-time messaging
  - Group chats
  - Message delivery guarantees
  - Media sharing

- [09. Design E-commerce System (Amazon)](./Questions/09-ecommerce.md)
  - Product catalog
  - Shopping cart
  - Order processing
  - Inventory management
  - Payment integration

- [10. Design Search Autocomplete](./Questions/10-autocomplete.md)
  - Trie data structure
  - Search suggestions
  - Caching
  - Personalization

#### Backend-Heavy Systems
- [11. Design Rate Limiter](./Questions/11-rate-limiter.md)
  - Token bucket algorithm
  - Distributed rate limiting
  - Redis implementation
  - Per-user/per-IP limits

- [12. Design Notification System](./Questions/12-notifications.md)
  - Push notifications
  - Email/SMS
  - Delivery guarantees
  - User preferences

- [13. Design Uber/Lyft](./Questions/13-ride-sharing.md)
  - Location tracking
  - Matching algorithm
  - ETA calculation
  - Real-time updates

- [14. Design Web Crawler](./Questions/14-web-crawler.md)
  - URL frontier
  - Distributed crawling
  - Politeness policy
  - Content deduplication

- [15. Design Distributed Cache](./Questions/15-distributed-cache.md)
  - Consistent hashing
  - Cache eviction
  - Replication
  - Cache invalidation

#### Data-Heavy Systems
- [16. Design News Feed Ranking System](./Questions/16-feed-ranking.md)
  - Machine learning integration
  - Real-time scoring
  - A/B testing
  - Personalization

- [17. Design Analytics System](./Questions/17-analytics.md)
  - Event collection
  - Real-time processing
  - Data warehousing
  - Dashboards

- [18. Design Search Engine (Google)](./Questions/18-search-engine.md)
  - Indexing
  - Ranking algorithm
  - Distributed search
  - Auto-complete

- [19. Design Dropbox/Google Drive](./Questions/19-file-storage.md)
  - File upload/download
  - Synchronization
  - Conflict resolution
  - Version control

- [20. Design YouTube](./Questions/20-video-streaming.md)
  - Video upload and processing
  - CDN distribution
  - Adaptive streaming
  - Recommendation system

---

## 🎓 12-Week Study Plan

### Weeks 1-2: Fundamentals & Framework
**Master the basics and interview approach**

```
Week 1: System Design Fundamentals
├─ Days 1-2: Scalability, reliability, availability
├─ Days 3-4: CAP theorem, consistency patterns
├─ Days 5-6: Back-of-envelope calculations
└─ Day 7: Interview framework (RADIO)

Week 2: Building Blocks
├─ Days 1-2: Load balancers, caching
├─ Days 3-4: Databases (SQL, NoSQL)
├─ Days 5-6: Message queues, API gateways
└─ Day 7: Practice: Design URL Shortener
```

### Weeks 3-4: Frontend System Design
**Leverage your senior frontend expertise**

```
Week 3: Frontend Architecture
├─ Days 1-2: Frontend patterns, state management
├─ Days 3-4: Rendering strategies, performance
├─ Days 5-6: Micro-frontends, real-time features
└─ Day 7: Practice: Design Twitter Feed

Week 4: Advanced Frontend
├─ Days 1-2: Offline-first, PWA architecture
├─ Days 3-4: Design systems, asset management
├─ Days 5-6: Auth, monitoring, error handling
└─ Day 7: Practice: Design Google Docs
```

### Weeks 5-6: Backend System Design
**Build on your mid-level backend knowledge**

```
Week 5: API & Database Design
├─ Days 1-2: REST, GraphQL, gRPC
├─ Days 3-4: Database schema, indexing
├─ Days 5-6: Sharding, replication
└─ Day 7: Practice: Design Chat Application

Week 6: Distributed Systems
├─ Days 1-2: Microservices fundamentals
├─ Days 3-4: Service communication, discovery
├─ Days 5-6: Event-driven, resilience patterns
└─ Day 7: Practice: Design Uber
```

### Weeks 7-8: Scalability & Performance
**Apply your DevOps knowledge**

```
Week 7: Scaling Strategies
├─ Days 1-2: Horizontal/vertical scaling, caching
├─ Days 3-4: Database scaling, async processing
├─ Days 5-6: CDN, load balancing
└─ Day 7: Practice: Design Instagram

Week 8: Infrastructure & DevOps
├─ Days 1-2: Cloud architecture, containers
├─ Days 3-4: CI/CD, IaC
├─ Days 5-6: Monitoring, auto-scaling
└─ Day 7: Practice: Design Netflix
```

### Weeks 9-10: Security & Advanced Topics
**Production-ready systems**

```
Week 9: Security & Compliance
├─ Days 1-2: Authentication, authorization
├─ Days 3-4: Data security, API security
├─ Days 5-6: Network security, compliance
└─ Day 7: Practice: Design E-commerce System

Week 10: Advanced Patterns
├─ Days 1-2: Service mesh, disaster recovery
├─ Days 3-4: Data warehousing, analytics
├─ Days 5-6: Search engines, distributed cache
└─ Day 7: Practice: Design YouTube
```

### Weeks 11-12: Mock Interviews & Review
**Interview preparation**

```
Week 11: Practice Interview Questions
├─ Day 1: Design Twitter Feed (Frontend focus)
├─ Day 2: Design Google Docs (Collaboration)
├─ Day 3: Design Uber (Backend focus)
├─ Day 4: Design E-commerce (Full-stack)
├─ Day 5: Design YouTube (Data-heavy)
├─ Day 6: Design Search Engine
└─ Day 7: Review and self-assessment

Week 12: Final Preparation
├─ Days 1-2: Mock interviews with peers
├─ Days 3-4: Review weak areas
├─ Days 5-6: Practice whiteboarding
└─ Day 7: Final review and confidence building
```

---

## 💼 System Design Interview Framework

### RADIO Framework

Use this structured approach for every system design interview:

#### **R** - Requirements Clarification (5-10 minutes)

**Functional Requirements:**
- What features are in scope?
- Who are the users?
- What are the core use cases?

**Non-Functional Requirements:**
- Scale (DAU, QPS)
- Performance (latency requirements)
- Availability (uptime requirements)
- Consistency needs

**Example Questions:**
```
- How many daily active users?
- What's the expected QPS?
- Is it a read-heavy or write-heavy system?
- What's the acceptable latency?
- Do we need strong or eventual consistency?
- What's the data retention policy?
```

#### **A** - Architecture / High-Level Design (10-15 minutes)

**Components:**
- Client (Web/Mobile)
- Load Balancer
- API Gateway
- Application Servers
- Databases
- Cache
- Message Queues
- Storage (S3, CDN)

**Draw box diagrams:**
```
Client → Load Balancer → API Servers → Database
                              ↓
                           Cache
                              ↓
                        Message Queue
```

#### **D** - Data Model (5-10 minutes)

**Database Schema:**
- Tables and relationships
- Key fields
- Indexes
- Partitioning strategy

**Example (URL Shortener):**
```sql
CREATE TABLE urls (
  id BIGINT PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE,
  original_url TEXT,
  user_id BIGINT,
  created_at TIMESTAMP,
  expires_at TIMESTAMP,
  click_count INT
);

CREATE INDEX idx_short_code ON urls(short_code);
CREATE INDEX idx_user_id ON urls(user_id);
```

#### **I** - Interface Design (5-10 minutes)

**API Endpoints:**
```
POST /api/v1/shorten
  Request: { "url": "https://example.com" }
  Response: { "short_url": "https://bit.ly/abc123" }

GET /api/v1/{short_code}
  Response: 302 redirect to original URL

GET /api/v1/analytics/{short_code}
  Response: { "clicks": 1000, "created_at": "..." }
```

#### **O** - Optimizations & Deep Dive (15-20 minutes)

**Scalability:**
- How to handle 10x traffic?
- Database sharding strategy
- Caching layer
- CDN for static assets

**Performance:**
- Query optimization
- Connection pooling
- Async processing
- Read replicas

**Reliability:**
- Replication
- Failover strategies
- Backup and recovery

**Monitoring:**
- Metrics to track
- Alerting
- Logging

---

## 🎯 Example: Design Twitter Feed

Let's walk through a complete example using the RADIO framework.

### Requirements (R)

**Functional:**
- Users can post tweets (280 characters)
- Users can follow other users
- Users can see a feed of tweets from people they follow
- Real-time updates (new tweets appear automatically)

**Non-Functional:**
- 500M daily active users
- 200M tweets per day
- Average user follows 200 people
- Feed should load in < 500ms
- High availability (99.99%)

**Scale Calculations:**
```
Tweets per second: 200M / 86400 ≈ 2,300 TPS (write)
Feed requests: 500M users × 10 feeds/day = 5B requests/day ≈ 58,000 QPS (read)
Read:Write ratio = 58,000:2,300 ≈ 25:1 (read-heavy)

Storage:
- Tweet size: 280 chars × 2 bytes + metadata ≈ 1KB
- Daily: 200M × 1KB = 200GB/day
- Annual: 200GB × 365 ≈ 73TB/year
```

### Architecture (A)

```
┌──────────┐
│  Client  │ (React SPA)
│ (Browser)│
└─────┬────┘
      │
┌─────▼────────┐
│ CloudFront   │ (CDN for static assets)
│    (CDN)     │
└─────┬────────┘
      │
┌─────▼────────┐
│Load Balancer │ (AWS ALB)
└─────┬────────┘
      │
┌─────▼────────┐
│  API Gateway │ (Authentication, rate limiting)
└─────┬────────┘
      │
      ├──────────────────────┬──────────────┐
      │                      │              │
┌─────▼────────┐  ┌─────────▼─────┐  ┌─────▼──────┐
│ Tweet Service│  │ Feed Service  │  │User Service│
│  (Write)     │  │  (Read)       │  │            │
└─────┬────────┘  └─────┬─────────┘  └─────┬──────┘
      │                  │                   │
      ├──────────────────┼───────────────────┤
      │                  │                   │
┌─────▼────────┐  ┌──────▼────────┐  ┌──────▼─────┐
│ PostgreSQL   │  │  Redis Cache  │  │ PostgreSQL │
│(Tweets DB)   │  │  (Feed Cache) │  │ (Users DB) │
│ (Sharded)    │  │               │  │            │
└──────────────┘  └───────────────┘  └────────────┘
      │
      │
┌─────▼────────┐
│ Kafka Queue  │ (Async feed fanout)
└─────┬────────┘
      │
┌─────▼────────┐
│Feed Generator│ (Worker service)
│   Workers    │
└──────────────┘
```

### Data Model (D)

```sql
-- Users table
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100),
  created_at TIMESTAMP
);

-- Tweets table (sharded by user_id)
CREATE TABLE tweets (
  id BIGINT PRIMARY KEY,
  user_id BIGINT,
  content VARCHAR(280),
  created_at TIMESTAMP,
  likes_count INT DEFAULT 0,
  retweets_count INT DEFAULT 0,
  INDEX idx_user_created (user_id, created_at DESC)
);

-- Followers table (who follows whom)
CREATE TABLE followers (
  follower_id BIGINT,
  followee_id BIGINT,
  created_at TIMESTAMP,
  PRIMARY KEY (follower_id, followee_id),
  INDEX idx_followee (followee_id)
);

-- Feed cache (Redis)
Key: "feed:{user_id}"
Value: List of tweet IDs (sorted by timestamp)
TTL: 15 minutes
```

### Interface (I)

```typescript
// Frontend API calls

// 1. Post a tweet
POST /api/v1/tweets
Request: {
  content: "Hello Twitter!",
  media_urls: ["https://cdn.example.com/image.jpg"]
}
Response: {
  tweet_id: "123456789",
  created_at: "2024-01-15T10:30:00Z"
}

// 2. Get user feed
GET /api/v1/feed?user_id=100&limit=20&cursor=xyz
Response: {
  tweets: [
    {
      id: "123",
      user: { id: "1", username: "john" },
      content: "Hello!",
      created_at: "2024-01-15T10:30:00Z",
      likes: 10,
      retweets: 2
    }
  ],
  next_cursor: "abc"
}

// 3. Real-time updates (WebSocket)
ws://api.example.com/feed/subscribe?user_id=100

Message: {
  type: "new_tweet",
  tweet: { ... }
}
```

### Optimizations (O)

**1. Feed Generation Strategies**

**Fan-out on Write (Push Model):**
```
When user posts tweet:
1. Write tweet to database
2. Publish to Kafka
3. Worker fetches followers
4. Write tweet to each follower's feed cache (Redis)

Pros: Fast reads (feed pre-computed)
Cons: Slow writes (celebrities with millions of followers)
```

**Fan-out on Read (Pull Model):**
```
When user requests feed:
1. Fetch list of followees
2. Fetch recent tweets from each followee
3. Merge and sort
4. Cache result

Pros: Fast writes
Cons: Slow reads (expensive merge operation)
```

**Hybrid Approach:**
```
- Fan-out on write for normal users (< 100K followers)
- Fan-out on read for celebrities
- Cache aggressively
```

**2. Caching Strategy**

```
L1 Cache: Redis (Feed cache)
  - Key: feed:{user_id}
  - Value: List of tweet IDs
  - TTL: 15 minutes

L2 Cache: Tweet objects in Redis
  - Key: tweet:{tweet_id}
  - Value: Tweet JSON
  - TTL: 1 hour

L3 Cache: CDN (CloudFront)
  - Static assets (images, videos)
  - Edge caching
```

**3. Database Sharding**

```
Shard tweets by user_id:
  shard = user_id % num_shards

Shard followers by follower_id:
  shard = follower_id % num_shards

This ensures:
- User's tweets are on same shard
- Follower list queries hit single shard
```

**4. Frontend Optimizations**

```typescript
// React component with optimizations
function Feed() {
  const [tweets, setTweets] = useState([]);
  const [socket, setSocket] = useState(null);

  // Infinite scroll with pagination
  const { data, fetchNextPage } = useInfiniteQuery(
    'feed',
    ({ pageParam = null }) => fetchFeed(pageParam),
    {
      getNextPageParam: (lastPage) => lastPage.next_cursor,
      staleTime: 60000, // Cache for 1 minute
    }
  );

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://api.example.com/feed');

    ws.onmessage = (event) => {
      const newTweet = JSON.parse(event.data);
      setTweets(prev => [newTweet, ...prev]);
    };

    return () => ws.close();
  }, []);

  // Optimistic UI for likes
  const handleLike = async (tweetId) => {
    // Update UI immediately
    setTweets(prev => prev.map(t =>
      t.id === tweetId ? { ...t, likes: t.likes + 1 } : t
    ));

    try {
      await api.likeTweet(tweetId);
    } catch (error) {
      // Rollback on error
      setTweets(prev => prev.map(t =>
        t.id === tweetId ? { ...t, likes: t.likes - 1 } : t
      ));
    }
  };

  return (
    <VirtualizedList
      items={tweets}
      renderItem={(tweet) => <TweetCard tweet={tweet} />}
    />
  );
}
```

**5. Monitoring & Metrics**

```
Key Metrics:
- Feed load time (P50, P95, P99)
- Tweet post latency
- WebSocket connection count
- Cache hit rate
- Database query performance
- Error rates

Alerts:
- Feed load time > 1s
- Cache hit rate < 80%
- Error rate > 1%
- Database replication lag > 5s
```

---

## 📊 Interview Preparation Checklist

### Technical Readiness

**Fundamentals:**
- [ ] Understand scalability patterns
- [ ] Know CAP theorem and consistency models
- [ ] Master back-of-envelope calculations
- [ ] Practice RADIO framework

**Frontend System Design:**
- [ ] Design micro-frontends architecture
- [ ] Explain rendering strategies (CSR, SSR, SSG)
- [ ] Design state management at scale
- [ ] Optimize Core Web Vitals
- [ ] Implement real-time features

**Backend System Design:**
- [ ] Design RESTful and GraphQL APIs
- [ ] Design database schemas with sharding
- [ ] Implement caching strategies
- [ ] Design event-driven systems
- [ ] Understand microservices patterns

**Infrastructure:**
- [ ] Design for high availability
- [ ] Implement auto-scaling
- [ ] Design CI/CD pipelines
- [ ] Monitor and alert effectively

### Practice Questions

**Frontend-Heavy (Do 5+):**
- [ ] Twitter Feed
- [ ] Facebook News Feed
- [ ] Google Docs (Collaborative Editor)
- [ ] Netflix Video Player
- [ ] Instagram Stories

**Full-Stack (Do 8+):**
- [ ] URL Shortener
- [ ] Chat Application
- [ ] E-commerce System
- [ ] Search Autocomplete
- [ ] Ride-sharing (Uber)

**Backend-Heavy (Do 5+):**
- [ ] Rate Limiter
- [ ] Notification System
- [ ] Distributed Cache
- [ ] Web Crawler
- [ ] Analytics System

**Data-Heavy (Do 2+):**
- [ ] Search Engine
- [ ] YouTube
- [ ] Dropbox/Google Drive

### Communication Skills

- [ ] Practice explaining trade-offs
- [ ] Draw clear diagrams
- [ ] Ask clarifying questions
- [ ] Think out loud
- [ ] Acknowledge limitations
- [ ] Discuss alternatives

---

## 💡 Common Mistakes to Avoid

### ❌ Jumping Into Solutions
```
Bad: "We'll use microservices and Kubernetes!"
Good: "Let me first understand the requirements and scale..."
```

### ❌ Overengineering
```
Bad: Complex architecture for 1000 users
Good: Start simple, discuss scaling as needed
```

### ❌ Ignoring Trade-offs
```
Bad: "We'll use NoSQL because it's fast"
Good: "NoSQL gives us better write performance, but we lose ACID guarantees..."
```

### ❌ Not Asking Questions
```
Bad: Assuming requirements
Good: "What's the expected QPS? Read or write-heavy?"
```

### ❌ Ignoring Non-Functional Requirements
```
Bad: Only focusing on features
Good: Discussing latency, availability, consistency
```

### ❌ Poor Diagram Drawing
```
Bad: Messy, unclear diagrams
Good: Clear boxes, labeled arrows, clean layout
```

---

## 🛠️ Essential Tools & Technologies

### Frontend Stack
```
Frameworks: React, Next.js, Vue.js
State: Redux, Zustand, Jotai
Performance: Lighthouse, Web Vitals
Real-time: WebSockets, Socket.io
Build: Webpack, Vite, Turbopack
CDN: CloudFront, Cloudflare
```

### Backend Stack
```
Languages: Node.js, Python, Go, Java
APIs: REST, GraphQL, gRPC
Databases: PostgreSQL, MySQL, MongoDB, Redis
Queues: Kafka, RabbitMQ, SQS
Search: Elasticsearch, OpenSearch
```

### Infrastructure Stack
```
Cloud: AWS (primary)
Containers: Docker, Kubernetes (EKS)
IaC: Terraform, CloudFormation
CI/CD: GitHub Actions, GitLab CI
Monitoring: CloudWatch, Prometheus, Grafana
```

---

## 📚 Recommended Resources

### Books
- **"Designing Data-Intensive Applications"** - Martin Kleppmann (Essential!)
- **"System Design Interview"** - Alex Xu (Vol 1 & 2)
- **"Web Scalability for Startup Engineers"** - Artur Ejsmont
- **"Building Microservices"** - Sam Newman
- **"Site Reliability Engineering"** - Google

### Online Resources
- [System Design Primer](https://github.com/donnemartin/system-design-primer)
- [ByteByteGo](https://bytebytego.com/)
- [Grokking the System Design Interview](https://www.educative.io/)
- [High Scalability Blog](http://highscalability.com/)
- [AWS Architecture Blog](https://aws.amazon.com/blogs/architecture/)

### YouTube Channels
- Gaurav Sen (System Design)
- Tech Dummies (Narendra L)
- ByteByteGo
- System Design Interview
- Hussein Nasser

### Practice Platforms
- [LeetCode System Design](https://leetcode.com/)
- [Pramp](https://www.pramp.com/)
- [Interviewing.io](https://interviewing.io/)
- [Exponent](https://www.tryexponent.com/)

### Company Engineering Blogs
- Netflix Tech Blog
- Uber Engineering
- Airbnb Engineering
- Meta Engineering
- AWS Architecture Blog

---

## 🎯 Interview Success Tips

### Before the Interview
1. **Research the company** - Understand their tech stack and scale
2. **Practice whiteboarding** - Draw diagrams on paper/whiteboard
3. **Review common questions** - Have a few designs ready to discuss
4. **Prepare questions** - Ask about their architecture challenges

### During the Interview
1. **Clarify requirements** - Don't assume, ask questions
2. **Start high-level** - Big picture before details
3. **Think out loud** - Share your thought process
4. **Discuss trade-offs** - Every decision has pros/cons
5. **Be collaborative** - Treat it as a discussion, not interrogation
6. **Manage time** - Don't spend 40 minutes on requirements

### After Presenting Design
1. **Ask for feedback** - "What would you change?"
2. **Discuss alternatives** - "We could also do X, but..."
3. **Handle criticism well** - Be open to suggestions
4. **Deep dive if asked** - Be ready to go deeper on any component

### What Interviewers Look For
✅ **Problem-solving approach** - Structured thinking
✅ **Communication** - Clear explanation of ideas
✅ **Trade-off analysis** - Understanding pros/cons
✅ **Scalability thinking** - Can the system grow?
✅ **Real-world experience** - Practical knowledge
✅ **Collaboration** - Working with the interviewer

---

## 🚀 Next Steps

1. **Start with fundamentals** - Master the basics first
2. **Leverage your strengths** - Use frontend expertise for frontend questions
3. **Practice regularly** - Do 2-3 system designs per week
4. **Draw diagrams** - Practice on whiteboard/paper
5. **Mock interviews** - Practice with peers
6. **Review real systems** - Study how Netflix, Uber, Twitter work
7. **Build projects** - Implement simplified versions

---

## 📈 Progress Tracker

### Fundamentals
- [ ] Scalability & availability concepts
- [ ] CAP theorem & consistency
- [ ] Back-of-envelope calculations
- [ ] Interview framework (RADIO)

### Frontend System Design
- [ ] Rendering strategies
- [ ] State management at scale
- [ ] Micro-frontends
- [ ] Real-time features
- [ ] Performance optimization

### Backend System Design
- [ ] API design (REST, GraphQL)
- [ ] Database design & sharding
- [ ] Microservices architecture
- [ ] Event-driven systems
- [ ] Caching strategies

### Infrastructure
- [ ] AWS architecture
- [ ] Container orchestration
- [ ] CI/CD pipelines
- [ ] Monitoring & observability

### Practice
- [ ] 5+ Frontend-heavy questions
- [ ] 8+ Full-stack questions
- [ ] 5+ Backend-heavy questions
- [ ] 2+ Data-heavy questions

---

**Ready to start?** Begin with:
- [System Design Fundamentals →](./Fundamentals/)
- [Frontend System Design →](./Frontend/)
- [Common Interview Questions →](./Questions/)

---

**Status**: 📚 **Comprehensive Guide Ready**

This guide contains **90+ topics** covering frontend, backend, and infrastructure system design. Work through the 12-week plan, practice the common questions, and you'll be ready for any system design interview!

Good luck! 🚀

---

[← Back to Interview Preparation](../README.md)
