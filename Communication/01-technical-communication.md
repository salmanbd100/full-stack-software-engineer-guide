# Technical Communication

Explain code, architecture decisions, and trade-offs clearly in senior technical interviews.

## 💡 The Core Rule

Every technical explanation answers three questions: **What** are you doing? **Why** this approach? **What are the trade-offs?**

---

## Code Explanation

### Explain WHY, Not What

**❌ Weak:**
```
"I use map to transform the array."
```

**✅ Strong:**
```
"I'm using map() instead of forEach() because it returns a new array —
functional, immutable, easier to test. O(n) time — acceptable since we
need to process every element anyway."
```

**Key Phrases:**
- "I chose X over Y because..."
- "The time complexity is O(n) since..."
- "This trades space for time by..."
- "The alternative would be..., but that has the drawback of..."

**Complexity Statements:**
- "Linear time O(n) — one pass through the array"
- "Hash map gives O(1) lookup at the cost of O(n) space"
- "Binary search cuts this to O(log n) because the array is sorted"

---

## Architecture Discussion

### Framework

1. High-level overview (30 sec)
2. Key components and their responsibilities
3. Data flow
4. Rationale for major decisions
5. Trade-offs considered

**Example — Large React app:**
```
"I'd organize by feature, not by type — features/auth, features/dashboard.
Scales better as the codebase grows. For state: Context for auth/theme,
React Query for server state. Code splitting at route level using
React.lazy() — critical for users on slower connections."
```

---

## Technology Justification

**Template:**
```
"I chose [X] for [primary reason]. The key benefit is [specific metric
or outcome]. The trade-off is [downside] — acceptable because [reason]."
```

**Example — Next.js vs Vite:**
```
"I chose Next.js because marketing pages need SSR for SEO. Auto code
splitting improved LCP from 3.2s to 1.8s. Trade-off: framework lock-in,
but the performance and DX gains outweigh that for our use case."
```

---

## Trade-off Discussion

State options, compare them, pick one with clear reasoning.

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| Redux Toolkit | DevTools, ecosystem | Boilerplate | Large teams, complex state |
| Zustand | Minimal API | Smaller ecosystem | Small-medium apps |
| Context + useReducer | Built-in, no deps | Performance issues with frequent updates | Auth, theme |

**Decision language:**
- "The trade-off is..."
- "We're optimizing for X at the expense of Y..."
- "For our requirements, this makes sense because..."

---

## Performance Explanation

Use metrics at every step.

**Framework:**

```
Problem:       [metric showing the issue]
Investigation: [tools used and what you found]
Solution:      [what you changed and why it works]
Impact:        [before/after metrics]
```

**Example:**
```
"Dashboard TTI was 4s — causing a 30% bounce rate.

Investigation: Chrome DevTools showed two issues:
- 800KB JS bundle blocking the main thread
- 500+ re-renders per interaction

Solution:
1. React.lazy() at route level → 800KB reduced to 250KB initial bundle
2. React.memo on ListItem → 500 renders reduced to 50 per interaction

Impact: TTI 4s → 1.6s. Bounce rate 30% → 12%. Lighthouse score 45 → 92."
```

---

## Common Mistakes

### ❌ Starting with details, not the big picture

```
"So I import useState, initialize an empty array, then forEach over items..."
```

### ✅ State purpose first, then drill down

```
"Building a filterable list. useState for local filter state,
useMemo to avoid re-filtering on every render. Let me show the key parts..."
```

---

### ❌ Jargon without explanation

```
"We use SSR with ISR and configure OST on the CDN."
```

### ✅ Define acronyms on first use

```
"We use Server-Side Rendering (SSR) with Incremental Static Regeneration (ISR)
— Next.js's feature for updating static pages without a full rebuild.
For caching, we configure Stale-While-Revalidate on the CDN."
```

---

### ❌ Monologuing without checking in

```
[5 minutes of talking without pause]
```

### ✅ Check in every 2–3 minutes

```
"Does this make sense? Should I dive deeper into the caching strategy,
or move on to the API design?"
```

---

### ❌ Pretending to know something you don't

```
"GraphQL uses... uh... some kind of protocol... for queries..."
```

### ✅ Be honest, then pivot to what you know

```
"I haven't worked with GraphQL internals deeply, but I understand it uses
a schema to validate and resolve queries. I can tell you how I've used it
to reduce over-fetching in production APIs."
```

---

## Whiteboard / Coding Session

**Before writing code:**
```
"My approach: two pointers since the array is sorted.
O(n) time vs O(n²) brute force. Let me write that out..."
```

**While writing code:**
```
"I'm initializing left at 0, right at n-1...
Moving them inward until they meet...
Edge case: if no pair exists, I'll return null."
```

**After writing:**
```
"To recap: two-pointer, O(n) time, O(1) space.
Let me trace through the example to verify..."
```

---

## Key Vocabulary

**Introducing ideas:**
- "One approach would be to..."
- "Let me walk you through..."

**Explaining reasoning:**
- "The rationale here is..."
- "What this gives us is..."

**Acknowledging trade-offs:**
- "One downside to consider is..."
- "We're optimizing for X at the expense of Y..."

**Handling disagreement:**
- "I see your point. Let me address that..."
- "That's a valid concern. My reasoning was..."

> **Key insight:** Interviewers evaluate *how you think*, not just what you produce. Narrate every decision.

---

**Related:** [Behavioral Interview](./02-behavioral-interview.md) | [System Design Communication](./04-system-design-communication.md) | [Problem-Solving Communication](./05-problem-solving-communication.md)
