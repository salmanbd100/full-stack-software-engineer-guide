# Frontend System Design Interview Strategy

## 💡 **Concept**

Frontend system design interviews test architectural thinking at scale — not framework knowledge. The interviewer wants to see that you gather requirements, design with trade-offs, and think about the whole system.

**How to answer in an interview:** "Before I start designing, I want to understand the scale and constraints. Let me ask a few questions about users, performance targets, and real-time requirements. Then I'll walk through the architecture layer by layer."

---

## The 60-Minute Framework

```
1. Requirements (10 min)   — ask before drawing anything
2. High-Level Architecture (15 min) — rendering, state, API strategy
3. Component Design (10 min) — hierarchy, data flow, reuse
4. Performance (10 min)    — code splitting, caching, images
5. Deep Dive (10 min)      — real-time, offline, auth, error handling
6. Trade-offs (5 min)      — justify every major decision
```

---

## What to Ask First (Requirements)

Ask before touching the whiteboard.

```typescript
interface RequirementsChecklist {
  scale: {
    dau: string;              // "10K vs 10M changes the architecture"
    targetCWV: string;        // LCP < 2.5s? FCP targets?
  };
  userFlows: {
    coreJourneys: string[];   // what must work perfectly
    mustHave: string[];       // vs nice-to-have
  };
  constraints: {
    platform: "mobile" | "desktop" | "both";
    browserSupport: string;   // IE11? Safari 14+?
    offline: boolean;
    seo: boolean;             // drives rendering strategy
  };
}
```

**Example — Design a Twitter feed:**

❌ **Bad:** "I'll use React with Redux and a list component…"

✅ **Good:** "Before I start — how many DAUs? Do we need real-time updates or is polling acceptable? Mobile or desktop or both? Is SEO required? What's the LCP target for the feed?"

---

## The 5 Mistakes That Fail Interviews

### ❌ Mistake 1: Skipping requirements

Assumptions lead to wrong architectures. Spend 10 minutes asking questions — interviewers reward it.

### ❌ Mistake 2: Ignoring performance

"I'll optimize later" is an instant red flag. Mention code splitting, caching strategy, and Core Web Vitals proactively.

| Topic | What to mention |
|-------|----------------|
| **Bundles** | Route-based code splitting with `React.lazy` |
| **Images** | WebP/AVIF, `loading="lazy"`, responsive `srcset` |
| **Caching** | CDN for static assets, React Query for server state |
| **Rendering** | SSG/ISR for public pages, CSR for dashboards |

### ❌ Mistake 3: Treating frontend as an island

Show full-stack awareness:
- REST vs GraphQL trade-offs for your data shape
- Where auth tokens live (memory vs httpOnly cookie)
- How real-time data flows (WebSocket vs SSE vs polling)
- Optimistic updates and rollback on failure

### ❌ Mistake 4: Weak component architecture

Don't just draw boxes. Explain *why*:

```typescript
type StateLocation = "local" | "context" | "global" | "server";

const stateDecision: Record<string, StateLocation> = {
  "form input":            "local",       // useState
  "theme / locale":        "context",     // Context API
  "user session / cart":   "global",      // Zustand / Redux
  "server data (users)":   "server",      // React Query / SWR
};
```

### ❌ Mistake 5: No trade-offs

Every decision has a trade-off. Say it out loud:

| Decision | Trade-off to state |
|----------|--------------------|
| SSG | Fastest delivery, but stale without ISR |
| Redux | Predictable, but boilerplate overhead |
| Micro-frontends | Team independence, but coordination cost |
| Monorepo | Code sharing, but slower CI at scale |

---

## Common Interview Problems

| Problem | Key topics | Difficulty |
|---------|-----------|------------|
| Twitter feed | Virtualization, real-time, pagination | Medium |
| Google Docs | CRDT, WebSocket, conflict resolution | Hard |
| Netflix player | Adaptive bitrate, DRM, performance | Hard |
| E-commerce PDP | SSR vs ISR, image optimization, cart state | Medium |
| Design system | Tokens, Storybook, versioning, a11y | Medium |

---

## Common Mistakes

❌ **Jumping to solutions** — always clarify requirements first  
❌ **Single rendering strategy for everything** — use SSG/CSR/SSR per page type  
❌ **Forgetting error states** — every API call needs loading, error, and empty states  
❌ **Ignoring accessibility** — WCAG 2.1 AA compliance is a real constraint in enterprise

**Key insight:**

> Success in frontend system design is about the process, not the answer. Show systematic thinking: gather requirements, make decisions with trade-offs, and communicate your reasoning at every step.

---
[← Back to SystemDesign](../README.md)
