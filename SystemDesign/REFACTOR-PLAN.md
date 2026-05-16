# SystemDesign Refactor — 5-Day Plan

A staged plan to bring every `SystemDesign/` markdown file in line with the `write-topic-docs` skill style guide.

## Why This Refactor?

Most files in `SystemDesign/` are **600–2,300 lines long** — far beyond the **150–400 line** target. They contain:

- Exhaustive edge cases instead of the common 80% of interviews
- Long paragraphs without scannable structure
- Mixed code languages (JS/Python alongside TypeScript)
- Repetition of the same idea across sections
- Historical or rarely-asked content that adds noise

**Goal:** every file becomes a tight, interview-grade reference a senior engineer can read in under 10 minutes.

## Ground Rules (apply to every day)

> Reference the `write-topic-docs` skill before each session — it is the authoritative style guide.

1. **Length:** 150–400 lines per topic (READMEs can be shorter).
2. **Code:** **TypeScript only** — convert any JS/Python/Bash code to typed TS.
3. **Tone:** short sentences, everyday words, active voice.
4. **Structure:** 💡 concept → How it works → When to use → Common mistakes → Key insight.
5. **Visual aids:** tables for comparisons, ❌/✅ for pitfalls, blockquotes for takeaways.
6. **Cut ruthlessly:** if a section doesn't help pass a senior interview, delete it.
7. **Preserve TOC** and update parent `README.md` indexes as files change.

## Day Allocation

| Day       | Focus                                      | Files | Est. effort |
| --------- | ------------------------------------------ | ----- | ----------- |
| **Day 1** | Fundamentals + Top-level README + Security | ~15   | Foundations |
| **Day 2** | BuildingBlocks + Scalability               | ~18   | Core blocks |
| **Day 3** | Database + Microservices                   | ~18   | Data + distributed |
| **Day 4** | Infrastructure + Frontend                  | ~20   | Infra + FE  |
| **Day 5** | InterviewQuestions (RADIO format)          | ~20   | Practice    |

---

## Day 1 — Fundamentals, Top-level README, Security

**Goal:** establish the conceptual base. These files are referenced by everything else, so they must be clean first.

**Files in scope:**

- `SystemDesign/README.md`
- `SystemDesign/Fundamentals/01-basics.md`
- `SystemDesign/Fundamentals/02-scalability.md`
- `SystemDesign/Fundamentals/03-reliability.md`
- `SystemDesign/Fundamentals/04-performance.md`
- `SystemDesign/Fundamentals/05-cap-theorem.md`
- `SystemDesign/Fundamentals/06-consistency.md`
- `SystemDesign/Fundamentals/07-calculations.md`
- `SystemDesign/Fundamentals/08-framework.md`
- `SystemDesign/Security/01-authentication.md`
- `SystemDesign/Security/02-authorization.md`
- `SystemDesign/Security/03-encryption.md`
- `SystemDesign/Security/04-api-security.md`
- `SystemDesign/Security/05-common-attacks.md`
- `SystemDesign/Security/06-compliance.md`

### Claude Code Prompt — Day 1

```text
Refactor every file in SystemDesign/Fundamentals/, SystemDesign/Security/,
and the top-level SystemDesign/README.md using the write-topic-docs skill.

For each file:
1. Invoke the write-topic-docs skill first — it is the style guide.
2. Read the current file end-to-end before editing.
3. Trim aggressively to 150–400 lines. Keep only the common 80% of
   interview content. Cut historical, exhaustive, or rarely-asked details.
4. Convert ALL non-TypeScript code blocks to typed TypeScript.
5. Restructure into the standard section flow:
   💡 Concept → How it works → When to use → Common mistakes → Key insight.
6. Replace dense paragraphs with tables, bullet lists, and ❌/✅ comparisons.
7. Add a one-line decision rule per topic ("Use X when Y").
8. Update SystemDesign/README.md so it points to the trimmed topic list
   accurately. Keep it under 200 lines.

Work file-by-file. After each file, report:
- Old line count vs new line count
- Major sections removed
- Anything you were unsure about cutting

Stop after each file for me to review before moving on.
```

### Progress Tracker — Day 1

- [x] `SystemDesign/README.md` (1531 → 165 lines)
- [x] `Fundamentals/01-basics.md` (500 → 188 lines)
- [x] `Fundamentals/02-scalability.md` (625 → 257 lines)
- [x] `Fundamentals/03-reliability.md` (503 → 272 lines)
- [x] `Fundamentals/04-performance.md` (694 → 350 lines)
- [x] `Fundamentals/05-cap-theorem.md` (449 → 138 lines)
- [x] `Fundamentals/06-consistency.md` (1022 → 233 lines)
- [x] `Fundamentals/07-calculations.md` (657 → 200 lines)
- [x] `Fundamentals/08-framework.md` (805 → 272 lines)
- [x] `Security/01-authentication.md` (57 stub → 345 lines)
- [x] `Security/02-authorization.md` (57 stub → 366 lines)
- [x] `Security/03-encryption.md` (57 stub → 388 lines)
- [x] `Security/04-api-security.md` (57 stub → 435 lines)
- [x] `Security/05-common-attacks.md` (57 stub → 410 lines)
- [x] `Security/06-compliance.md` (57 stub → 408 lines)

---

## Day 2 — BuildingBlocks + Scalability

**Goal:** the core "Lego pieces" of any system design answer. These are the most cited topics in interviews.

**Files in scope:**

- `SystemDesign/BuildingBlocks/01-load-balancing.md`
- `SystemDesign/BuildingBlocks/02-caching.md`
- `SystemDesign/BuildingBlocks/03-cdn.md`
- `SystemDesign/BuildingBlocks/04-databases.md`
- `SystemDesign/BuildingBlocks/05-message-queues.md`
- `SystemDesign/BuildingBlocks/06-websockets.md`
- `SystemDesign/BuildingBlocks/07-search.md`
- `SystemDesign/BuildingBlocks/08-notifications.md`
- `SystemDesign/BuildingBlocks/09-file-storage.md`
- `SystemDesign/BuildingBlocks/10-monitoring.md`
- `SystemDesign/Scalability/01-horizontal-scaling.md`
- `SystemDesign/Scalability/02-vertical-scaling.md`
- `SystemDesign/Scalability/03-load-balancing.md`
- `SystemDesign/Scalability/04-caching-strategies.md`
- `SystemDesign/Scalability/05-database-scaling.md`
- `SystemDesign/Scalability/06-cdn.md`
- `SystemDesign/Scalability/07-async-processing.md`
- `SystemDesign/Scalability/08-partitioning.md`

### Claude Code Prompt — Day 2

```text
Refactor every file in SystemDesign/BuildingBlocks/ and
SystemDesign/Scalability/ using the write-topic-docs skill.

Special handling for this day:
- BuildingBlocks/03-cdn.md and Scalability/06-cdn.md overlap. Make
  BuildingBlocks the deep dive; Scalability/06-cdn.md should be ~150 lines
  focused on CDN as a scaling lever, linking to BuildingBlocks for detail.
- Same for load-balancing (BuildingBlocks/01 vs Scalability/03) and
  caching (BuildingBlocks/02 vs Scalability/04). Deduplicate aggressively.

For each file:
1. Invoke the write-topic-docs skill first.
2. Read the current file fully.
3. Trim to 150–400 lines. Keep the 80% interview content.
4. Convert all code to TypeScript with types.
5. Use the standard section flow (Concept → How it works → When to use →
   Common mistakes → Key insight).
6. Add a comparison table when there are multiple strategies (e.g.
   round-robin vs least-connections, cache-aside vs write-through).
7. Include "Real-world example" — pick one enterprise scenario per file
   (dashboard, e-commerce, video platform, etc.).
8. Update parent README files if they exist.

Report old vs new line count after each file. Pause for review between
files.
```

### Progress Tracker — Day 2

- [x] `BuildingBlocks/01-load-balancing.md` (712 → 183 lines)
- [x] `BuildingBlocks/02-caching.md` (1534 → 207 lines)
- [x] `BuildingBlocks/03-cdn.md` (1501 → 203 lines)
- [x] `BuildingBlocks/04-databases.md` (48 stub → 183 lines)
- [x] `BuildingBlocks/05-message-queues.md` (1966 → 187 lines)
- [x] `BuildingBlocks/06-websockets.md` (48 stub → 224 lines)
- [x] `BuildingBlocks/07-search.md` (48 stub → 231 lines)
- [x] `BuildingBlocks/08-notifications.md` (48 stub → 205 lines)
- [x] `BuildingBlocks/09-file-storage.md` (48 stub → 210 lines)
- [x] `BuildingBlocks/10-monitoring.md` (48 stub → 214 lines)
- [x] `Scalability/01-horizontal-scaling.md` (55 stub → 193 lines)
- [x] `Scalability/02-vertical-scaling.md` (55 stub → 134 lines)
- [x] `Scalability/03-load-balancing.md` (55 stub → 123 lines, scaling-lever summary)
- [x] `Scalability/04-caching-strategies.md` (55 stub → 166 lines, scaling-lever summary)
- [x] `Scalability/05-database-scaling.md` (55 stub → 217 lines)
- [x] `Scalability/06-cdn.md` (55 stub → 161 lines, scaling-lever summary)
- [x] `Scalability/07-async-processing.md` (55 stub → 255 lines)
- [x] `Scalability/08-partitioning.md` (55 stub → 250 lines)

---

## Day 3 — Database + Microservices

**Goal:** data layer and distributed systems — the second-most-asked area after building blocks.

**Files in scope:**

- `SystemDesign/Database/README.md`
- `SystemDesign/Database/01-sql-design.md`
- `SystemDesign/Database/02-nosql-design.md`
- `SystemDesign/Database/03-sharding.md`
- `SystemDesign/Database/04-replication.md`
- `SystemDesign/Database/05-indexing.md`
- `SystemDesign/Database/06-transactions.md`
- `SystemDesign/Database/07-cap-theorem.md`
- `SystemDesign/Database/08-consistency.md`
- `SystemDesign/Database/09-data-modeling.md`
- `SystemDesign/Database/10-query-optimization.md`
- `SystemDesign/Microservices/01-architecture.md`
- `SystemDesign/Microservices/02-service-discovery.md`
- `SystemDesign/Microservices/03-api-gateway.md`
- `SystemDesign/Microservices/04-communication.md`
- `SystemDesign/Microservices/05-data-management.md`
- `SystemDesign/Microservices/06-deployment.md`
- `SystemDesign/Microservices/07-monitoring.md`
- `SystemDesign/Microservices/08-resilience.md`

### Claude Code Prompt — Day 3

```text
Refactor every file in SystemDesign/Database/ and
SystemDesign/Microservices/ using the write-topic-docs skill.

Watch for these overlaps and deduplicate:
- Database/07-cap-theorem.md vs Fundamentals/05-cap-theorem.md → make
  Database version focus on the data-store implications only.
- Database/08-consistency.md vs Fundamentals/06-consistency.md → same.
- Microservices/07-monitoring.md vs BuildingBlocks/10-monitoring.md →
  Microservices version focuses on tracing + service-mesh; BuildingBlocks
  covers metrics + logging.

For each file:
1. Invoke the write-topic-docs skill first.
2. Read the current file fully.
3. Trim to 150–400 lines. Database/05-indexing.md (2306 lines) and
   Database/06-transactions.md (2089 lines) need the heaviest cuts —
   focus on B-tree, hash, composite indexes for indexing; on ACID and
   isolation levels for transactions.
4. Convert all code to TypeScript with types. SQL stays as SQL where it
   appears.
5. Use the standard section flow.
6. Add an "Interview answer template" snippet at the end of each Database
   file: 3–5 lines a candidate can speak verbatim.
7. Update Database/README.md.

Report old vs new line count after each file. Pause for review.
```

### Progress Tracker — Day 3

- [x] `Database/README.md` (352 → 71 lines)
- [x] `Database/01-sql-design.md` (1456 → 247 lines)
- [x] `Database/02-nosql-design.md` (1517 → 227 lines)
- [x] `Database/03-sharding.md` (1551 → 218 lines)
- [x] `Database/04-replication.md` (1357 → 223 lines)
- [x] `Database/05-indexing.md` (2306 → 234 lines)
- [x] `Database/06-transactions.md` (2089 → 307 lines)
- [x] `Database/07-cap-theorem.md` (1070 → 192 lines, data-store focus)
- [x] `Database/08-consistency.md` (436 → 250 lines, storage-level focus)
- [x] `Database/09-data-modeling.md` (543 → 293 lines)
- [x] `Database/10-query-optimization.md` (354 → 276 lines)
- [x] `Microservices/01-architecture.md` (55 stub → 162 lines)
- [x] `Microservices/02-service-discovery.md` (55 stub → 204 lines)
- [x] `Microservices/03-api-gateway.md` (55 stub → 203 lines)
- [x] `Microservices/04-communication.md` (55 stub → 184 lines)
- [x] `Microservices/05-data-management.md` (55 stub → 227 lines)
- [x] `Microservices/06-deployment.md` (55 stub → 212 lines)
- [x] `Microservices/07-monitoring.md` (55 stub → 236 lines, tracing + service-mesh focus)
- [x] `Microservices/08-resilience.md` (55 stub → 328 lines)

---

## Day 4 — Infrastructure + Frontend System Design

**Goal:** cloud + frontend architecture — the part that most distinguishes a senior frontend candidate.

**Files in scope:**

- `SystemDesign/Infrastructure/01-aws-basics.md`
- `SystemDesign/Infrastructure/02-compute.md`
- `SystemDesign/Infrastructure/03-storage.md`
- `SystemDesign/Infrastructure/04-networking.md`
- `SystemDesign/Infrastructure/05-containers.md`
- `SystemDesign/Infrastructure/06-ci-cd.md`
- `SystemDesign/Infrastructure/07-monitoring.md`
- `SystemDesign/Infrastructure/08-disaster-recovery.md`
- `SystemDesign/Frontend/00-interview-strategy.md`
- `SystemDesign/Frontend/01-architecture.md`
- `SystemDesign/Frontend/02-state-management.md`
- `SystemDesign/Frontend/03-rendering.md`
- `SystemDesign/Frontend/04-performance.md`
- `SystemDesign/Frontend/05-micro-frontends.md`
- `SystemDesign/Frontend/06-real-time.md`
- `SystemDesign/Frontend/07-offline-first.md`
- `SystemDesign/Frontend/08-design-systems.md`
- `SystemDesign/Frontend/09-assets.md`
- `SystemDesign/Frontend/10-seo-analytics.md`
- `SystemDesign/Frontend/11-auth.md`
- `SystemDesign/Frontend/12-monitoring.md`

### Claude Code Prompt — Day 4

```text
Refactor every file in SystemDesign/Infrastructure/ and
SystemDesign/Frontend/ using the write-topic-docs skill.

Special handling:
- Infrastructure/01-aws-basics.md should NOT become an AWS encyclopedia.
  Keep it focused on the 6–8 AWS primitives that show up in system design
  interviews (EC2, S3, RDS, DynamoDB, SQS, CloudFront, Route 53, Lambda).
- Frontend/00-interview-strategy.md is the entry point — make sure it
  reads as a clean "how to answer a frontend SD interview" guide.
- For Frontend files, follow the author profile in write-topic-docs:
  Senior Frontend Engineer, 9+ years. Examples should sound like real
  enterprise work (dashboards, portals, public-sector apps).

For each file:
1. Invoke the write-topic-docs skill first.
2. Use Context7 MCP for any framework-specific content (React 19,
   Next.js 15, AWS SDK v3) — training data may be stale.
3. Trim to 150–400 lines. Frontend files are currently 600–1300 lines.
4. Convert all code to TypeScript with types and interfaces.
5. Use the standard section flow.
6. For each Frontend file, include "How to answer in an interview" — a
   3-sentence framing the candidate can lead with.
7. Use Context7 MCP for any specific library examples.

Report old vs new line count after each file. Pause for review.
```

### Progress Tracker — Day 4

- [x] `Infrastructure/01-aws-basics.md` (57 stub → 165 lines)
- [x] `Infrastructure/02-compute.md` (57 stub → 170 lines)
- [x] `Infrastructure/03-storage.md` (57 stub → 170 lines)
- [x] `Infrastructure/04-networking.md` (57 stub → 158 lines)
- [x] `Infrastructure/05-containers.md` (57 stub → 183 lines)
- [x] `Infrastructure/06-ci-cd.md` (57 stub → 191 lines)
- [x] `Infrastructure/07-monitoring.md` (57 stub → 225 lines)
- [x] `Infrastructure/08-disaster-recovery.md` (57 stub → 193 lines)
- [x] `Frontend/00-interview-strategy.md` (1342 → 145 lines)
- [x] `Frontend/01-architecture.md` (627 → 175 lines)
- [x] `Frontend/02-state-management.md` (671 → 185 lines)
- [x] `Frontend/03-rendering.md` (644 → 183 lines)
- [x] `Frontend/04-performance.md` (972 → 190 lines)
- [x] `Frontend/05-micro-frontends.md` (754 → 175 lines)
- [x] `Frontend/06-real-time.md` (989 → 165 lines)
- [x] `Frontend/07-offline-first.md` (888 → 200 lines)
- [x] `Frontend/08-design-systems.md` (928 → 205 lines)
- [x] `Frontend/09-assets.md` (745 → 175 lines)
- [x] `Frontend/10-seo-analytics.md` (810 → 185 lines)
- [x] `Frontend/11-auth.md` (874 → 210 lines)
- [x] `Frontend/12-monitoring.md` (871 → 175 lines)

---

## Day 5 — InterviewQuestions (RADIO format)

**Goal:** every classic interview question becomes a tight RADIO walkthrough a candidate can rehearse in 30 minutes.

**Files in scope:**

- `SystemDesign/InterviewQuestions/01-twitter.md`
- `SystemDesign/InterviewQuestions/02-instagram.md`
- `SystemDesign/InterviewQuestions/03-facebook-newsfeed.md`
- `SystemDesign/InterviewQuestions/04-uber.md`
- `SystemDesign/InterviewQuestions/05-whatsapp.md`
- `SystemDesign/InterviewQuestions/06-youtube.md`
- `SystemDesign/InterviewQuestions/07-netflix.md`
- `SystemDesign/InterviewQuestions/08-amazon.md`
- `SystemDesign/InterviewQuestions/09-google-search.md`
- `SystemDesign/InterviewQuestions/10-dropbox.md`
- `SystemDesign/InterviewQuestions/11-url-shortener.md`
- `SystemDesign/InterviewQuestions/12-rate-limiter.md`
- `SystemDesign/InterviewQuestions/13-notification-system.md`
- `SystemDesign/InterviewQuestions/14-chat-system.md`
- `SystemDesign/InterviewQuestions/15-web-crawler.md`
- `SystemDesign/InterviewQuestions/16-typeahead.md`
- `SystemDesign/InterviewQuestions/17-api-gateway.md`
- `SystemDesign/InterviewQuestions/18-distributed-cache.md`
- `SystemDesign/InterviewQuestions/19-parking-lot.md`
- `SystemDesign/InterviewQuestions/20-ticketmaster.md`

### Claude Code Prompt — Day 5

```text
Refactor every file in SystemDesign/InterviewQuestions/ using the
write-topic-docs skill and the RADIO framework.

Every file MUST follow this exact structure (target 250–400 lines):

1. **Problem statement** — 2–3 sentences.
2. **R — Requirements** (functional + non-functional, max 8 bullets total).
3. **A — Architecture** — high-level diagram in ASCII + 1 paragraph.
4. **D — Data model** — 2–4 core entities, TypeScript interfaces.
5. **I — Interface (APIs)** — 4–6 endpoints, REST or GraphQL, with
   request/response shapes in TypeScript.
6. **O — Optimizations & tradeoffs** — 3–5 scaling concerns + how to
   address them (caching, sharding, queues, CDN, etc.).
7. **Common follow-up questions** — 3–5 with one-line answers.

For each file:
1. Invoke the write-topic-docs skill first.
2. Read the current file fully — most are 700–1600 lines and contain
   massive amounts of unused detail. Cut hard.
3. Convert all code to TypeScript with types.
4. Use the standard visual elements (tables, ❌/✅, blockquotes).
5. Link to relevant BuildingBlocks/, Database/, Scalability/ files
   instead of re-explaining concepts.
6. Add a "How to open this answer" — 2 sentences a candidate can say in
   the first 30 seconds of the interview.

Report old vs new line count after each file. Pause for review.
```

### Progress Tracker — Day 5

- [ ] `InterviewQuestions/01-twitter.md`
- [ ] `InterviewQuestions/02-instagram.md`
- [ ] `InterviewQuestions/03-facebook-newsfeed.md`
- [ ] `InterviewQuestions/04-uber.md`
- [ ] `InterviewQuestions/05-whatsapp.md`
- [ ] `InterviewQuestions/06-youtube.md`
- [ ] `InterviewQuestions/07-netflix.md`
- [ ] `InterviewQuestions/08-amazon.md`
- [ ] `InterviewQuestions/09-google-search.md`
- [ ] `InterviewQuestions/10-dropbox.md`
- [ ] `InterviewQuestions/11-url-shortener.md`
- [ ] `InterviewQuestions/12-rate-limiter.md`
- [ ] `InterviewQuestions/13-notification-system.md`
- [ ] `InterviewQuestions/14-chat-system.md`
- [ ] `InterviewQuestions/15-web-crawler.md`
- [ ] `InterviewQuestions/16-typeahead.md`
- [ ] `InterviewQuestions/17-api-gateway.md`
- [ ] `InterviewQuestions/18-distributed-cache.md`
- [ ] `InterviewQuestions/19-parking-lot.md`
- [ ] `InterviewQuestions/20-ticketmaster.md`

---

## Quality Checklist (run after every day)

- [ ] Every refactored file is 150–400 lines (RADIO files: up to 400)
- [ ] All code blocks are ` ```typescript ` — no JS/Python/Bash sneakthroughs
- [ ] Every file uses the standard section flow (💡 → How → When → Mistakes → Key insight)
- [ ] Tables, ❌/✅, blockquotes used instead of long paragraphs
- [ ] Parent `README.md` in each subfolder reflects the new content
- [ ] No paragraph longer than 3–4 lines
- [ ] Sentences average 15–20 words
- [ ] Cross-references link to other repo files instead of re-explaining

## How to Use This Plan Each Day

1. Open Claude Code in this repo.
2. Copy the **Claude Code Prompt** for the current day verbatim into the chat.
3. Review each refactor as Claude pauses between files.
4. Check the box in the **Progress Tracker** once you accept the change.
5. Commit at the end of the day with `feat(system-design): day N refactor`.

> Keep this file open as your single source of truth for the week.
