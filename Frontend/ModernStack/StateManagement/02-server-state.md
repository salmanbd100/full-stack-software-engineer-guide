---
title: Server State with TanStack Query
part: 3
chapter: 0
slug: server-state
level: advanced # beginner | intermediate | advanced
reading_time: 13
updated: 2026-09-07
tags: [tanstack-query, server-state, caching, mutations, optimistic-updates]
in_book: true
---

# Server State with TanStack Query {#ch-server-state}

> Treat fetched data as a cache with an explicit staleness policy, and invalidate it rather than reassigning it.

**In this chapter:** query keys as cache addresses · `staleTime` against `gcTime` · invalidation · optimistic updates and rollback · where server rendering changes the picture

## 💡 The Core Idea

A query cache is a map from a **key** to a **value plus two clocks**.

The key is the address of the data. The first clock decides when the value is *stale* — old enough that
the next component to ask for it should trigger a background refetch. The second decides when the value
is *garbage* — unused for long enough that it can be dropped from memory.

Everything else the library does — deduplication, retries, refetch on window focus, optimistic updates —
follows from that shape. Learn the shape and the API is obvious. Learn the API first and you will spend a
year confused about why data refetched.

> ⚠️ **Moving target:** TanStack Query v5 renamed enough of v4 to break search results — `cacheTime` is
> `gcTime`, `isLoading` is `isPending`, keys must be arrays — and later v5 releases renamed mutation
> callback arguments again. The durable model is key, staleness clock, garbage clock, invalidation. Check
> the version in your `package.json` before copying any example, including these.

## How It Works

### The two clocks

| | `staleTime` | `gcTime` |
| --- | --- | --- |
| **Default** | `0` — stale immediately | 5 minutes |
| **Question it answers** | May I serve this without refetching? | May I forget this? |
| **While it holds** | Cached data served, no request | Data kept even with no subscribers |
| **When it expires** | Background refetch on next mount, focus or reconnect | Entry removed from memory |

The default `staleTime: 0` surprises people: data is considered stale the instant it arrives, so mounting
a component refetches. That is deliberate — freshness by default, and you opt out per query with a number
you can defend.

**Setting it from the data's own change rate:**

```typescript
// A currency rate changes constantly.
useQuery({ queryKey: ['rates'], queryFn: fetchRates, staleTime: 10_000 });

// A country list changes approximately never.
useQuery({ queryKey: ['countries'], queryFn: fetchCountries, staleTime: Infinity });
```

An invalidated query is stale regardless of `staleTime`, so a long window never blocks a refresh you
asked for explicitly.

### Query keys are the cache address

Keys are arrays, and they are matched by **prefix**. That single fact drives the whole invalidation
design.

```typescript
['todos']                              // the list
['todos', { status: 'done', page: 2 }] // one filtered page of it
['todos', todoId]                      // one item
```

`invalidateQueries({ queryKey: ['todos'] })` matches all three, because every one starts with `todos`.
Structure keys from **general to specific** and invalidation becomes a design decision rather than a
search-and-replace.

Every value that changes the response must be in the key. A key of `['todos']` for a request that reads a
`page` variable from a closure is the classic bug: page two overwrites page one in the cache, and neither
component knows.

**A key factory keeps them honest:**

```typescript
export const todoKeys = {
  all: ['todos'] as const,
  list: (filters: TodoFilters) => [...todoKeys.all, 'list', filters] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
};
```

The `as const` matters: it makes the key literal types, so a typo in a call site is a type error rather
than a silent cache miss.

### Mutations, and why you invalidate rather than assign

After a write, the cache is wrong. There are two ways to fix it and they are not equivalent.

**Invalidate** — mark the affected keys stale and let the library refetch. The server stays the source of
truth, so derived fields, computed totals and other users' concurrent changes all come back correct.

**Write directly** with `setQueryData` — faster, and correct only if you can reproduce the server's
result exactly. Any field the server computes (a slug, a timestamp, a total) will be wrong until
something else refetches.

**Invalidate by default:**

```typescript
const queryClient = useQueryClient();

const { mutate } = useMutation({
  mutationFn: (input: NewTodo) => createTodo(input),
  onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
});
```

`onSettled` rather than `onSuccess`, so the cache is reconciled after a failure too.

### Optimistic updates and the rollback

An optimistic update writes the expected result immediately and undoes it if the request fails. Three
steps, and skipping any one of them produces a flicker or a wrong value:

```typescript
useMutation({
  mutationFn: toggleTodo,
  onMutate: async (todoId: string) => {
    // 1. Stop in-flight refetches — one could land after the optimistic write and undo it.
    await queryClient.cancelQueries({ queryKey: todoKeys.all });

    // 2. Snapshot for rollback, then write the expected result.
    const previous = queryClient.getQueryData<Todo[]>(todoKeys.all);
    queryClient.setQueryData<Todo[]>(todoKeys.all, (old = []) =>
      old.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)),
    );

    return { previous }; // handed to onError as the third argument
  },
  onError: (_error, _todoId, rollback) => {
    queryClient.setQueryData(todoKeys.all, rollback?.previous);
  },
  // 3. Reconcile with the server either way.
  onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
});
```

The `cancelQueries` call is the step everyone forgets. Without it, a refetch that was already in flight
returns the pre-mutation data and silently reverts the optimistic write.

Reserve optimism for actions that almost always succeed and are cheap to undo — a toggle, a like, a
reorder. Never for a payment.

### Where server rendering changes this

When a route fetches on the server and passes the result down, that data does not need a client cache at
all. What still does:

| Behaviour | Still needs a client cache? |
| --------- | -------------------------- |
| Render once from server data | No |
| Refetch on focus, poll, or subscribe | Yes |
| Mutate and update in place | Yes |
| Infinite scroll or paginate client-side | Yes |
| Share one fetch across distant components | Yes |

The pattern that combines them is to fetch on the server, hydrate the cache with that result, and let the
client take over — so the first paint costs no request and everything afterwards behaves normally. See
[Chapter ?? — Data Fetching and Caching](#ch-nextjs-data-and-caching) for the framework side.

## When to Use It

| Situation | Use a query cache? |
| --------- | ------------------ |
| Any client-side fetching beyond a single component | **Yes** |
| Data read in several unrelated places | **Yes** — deduplication alone pays for it |
| Mutations that must reflect immediately | **Yes** |
| One fetch, one component, no refetching | No — a server component or an effect is enough |
| Live data pushed over a socket | Partly — use the cache as the store, the socket as the writer |

## Common Mistakes

**❌ Leaving a variable out of the query key.**
✅ Every input to the request belongs in the key. Otherwise two different requests share one cache entry
and overwrite each other.

**❌ Copying query results into local state to edit them.**
✅ That fork stops tracking invalidation. Keep the cached value and hold only the pending edits.

**❌ Setting a long `staleTime` to "reduce requests", then reporting stale data as a bug.**
✅ `staleTime` is a promise about freshness. Set it from how stale the data may be, and invalidate
explicitly when you know it changed.

**❌ Using `setQueryData` after every mutation because it feels faster.**
✅ You are re-implementing the server's write logic on the client. Invalidate unless you can reproduce the
response exactly.

**❌ Optimistic updates without `cancelQueries`.**
✅ An in-flight refetch lands after your optimistic write and reverts it. The bug is intermittent, which
makes it expensive to find.

## 🔑 Key Takeaways

- A query cache is a key, a staleness clock and a garbage clock; everything else follows.
- Keys are arrays matched by prefix, so key structure is invalidation design.
- Every input to a request must appear in its key.
- Invalidate after a mutation by default; write to the cache only when you can reproduce the server exactly.
- Optimistic updates need three steps — cancel, snapshot and write, reconcile — and cancelling is the one that gets skipped.

## Interview Questions

**Q: What is the difference between `staleTime` and `gcTime`?**

`staleTime` is how long cached data may be served without a background refetch. `gcTime` is how long an
entry stays in memory after nothing is using it. One controls freshness, the other controls memory, and
they are independent: data can be stale and still cached, or fresh and about to be collected because the
last subscriber unmounted.

**Q: How do you structure query keys in a large application?**

General to specific, in arrays, behind a key factory per feature. Prefix matching means
`['todos']` invalidates every list and detail underneath it, so key structure is how you decide what a
mutation refreshes. The factory with `as const` keeps call sites type-checked, which catches the typos
that would otherwise be silent cache misses.

**Q: Walk me through an optimistic update.**

Cancel in-flight queries for the affected keys, snapshot the current data, write the expected result to
the cache, and return the snapshot. If the request fails, restore the snapshot. Either way, invalidate on
settle so the server reconciles it. Cancelling first is essential — otherwise a refetch already in flight
overwrites the optimistic value.

**Q: With server components fetching data, do you still need a client query cache?**

For the initial render, often not. You still need one for anything the client drives afterwards:
refetching on focus, polling, mutations with optimistic updates, infinite scroll, or sharing one fetch
across distant components. The common pattern is to fetch on the server, hydrate the cache with that
result, and let the client take over.

## What to Read Next

- [Chapter ?? — The Four Kinds of State](#ch-four-kinds-of-state) — why this category is separate at all
- [Chapter ?? — Client State](#ch-client-state) — what is left once the cache has taken the server data
- [Chapter ?? — Caching](#ch-caching) — the same ideas one layer down, on the server
