---
title: Design an Infinite Feed
part: 6
chapter: 23
slug: design-infinite-feed
level: advanced
reading_time: 9
updated: 2026-09-07
tags: [system-design, case-study, frontend, virtualisation, pagination, performance]
in_book: true
---

# Design an Infinite Feed {#ch-design-infinite-feed}

> Scroll for an hour on a three-year-old Android without the tab growing, stuttering, or losing your place.

**In this chapter:** the two budgets · cursor pagination · virtualisation and scroll anchoring · images without layout shift · restoring position after navigation

## 💡 The Core Idea

A feed has no end and a device has limits. Two separate budgets must hold at once, and mixing them up is
the classic mistake. The **network budget** is how much data you fetch. The **render budget** is how many
DOM nodes exist. "Load more" only deals with the first. After two thousand posts the page is slow because
there are two thousand posts *in the document*, not because the JSON was large. So the design keeps a
sliding window of rows in the DOM. It also treats scroll position as data it stores and restores on
purpose, not something the browser happens to get right.

> The senior signal here is naming the render budget before anyone asks about performance.

## How It Works

### Requirements

**Functional:** endless vertical scroll over mixed text and image posts. New posts appear while the user
reads. Opening a post and pressing back returns to the same row.

**Out of scope:** ranking, ads, comments, composing.

**Non-functional:** interaction stays under 200 ms (INP) during scroll, cumulative layout shift (CLS) under
0.1, and memory flat after two thousand items. First screen is usable in under 2 seconds on a mid-range phone.

**Scale:** a session is 200–3,000 items. Pages of 20. Assume a feed that changes while it is being read.

### Architecture

```mermaid
flowchart TD
  A["Feed API (cursor)"] --> B["Page cache<br/>(ordered, deduped by id)"]
  B --> C["Virtualiser<br/>window of ~30 rows"]
  C --> D["Row renderer"]
  B --> E["Scroll anchor store<br/>(cursor + item id + offset)"]
  E --> C
```

**The page cache grows; the DOM does not. The anchor store is what survives navigation.**

### Pagination: cursors, not offsets

Offsets are wrong the moment the feed changes underneath the reader.

| | **Offset** (`?page=3`) | **Cursor** (`?after=eyJzIjo...`) |
| --- | --- | --- |
| A post is inserted at the head | Every later page shifts — the user sees a duplicate | Unaffected: the cursor names a position, not a count |
| A post is deleted | One item is silently skipped | Unaffected |
| Cost on the server | `OFFSET 60` scans and discards 60 rows | Index seek from the cursor's key |

The cursor is opaque to the client. It encodes the sort key plus a tiebreaker id, so the order is total
and paging can never loop:

```typescript
interface FeedPage {
  readonly items: readonly FeedItem[];
  readonly nextCursor: string | null; // null means the end, not an error
}

interface FeedItem {
  readonly id: string;
  readonly kind: "text" | "image";
  readonly width: number;  // intrinsic media size, sent by the server
  readonly height: number; // so the client can reserve space before loading
}
```

`width` and `height` look like clutter, but they are why the feed does not jump. Without them the client
cannot reserve space, and every image that loads pushes the text the reader is looking at down the page.

### Virtualisation and the anchoring problem

Render roughly one viewport of rows, plus a screen of overscan (extra rows off screen) either side: around
30 in all. Give the scroller a spacer sized from measured heights, with an estimate for rows not yet seen.

The subtle part is what happens when an estimate turns out wrong. Correcting the height of a row **above**
the viewport moves everything below it, and the content under the reader's thumb jumps.

**Correct a height, then cancel the shift:**

```typescript
function applyHeightCorrection(el: HTMLElement, deltaAbove: number): void {
  if (deltaAbove === 0) return;
  // The row above grew or shrank; move the scroll by the same amount so the
  // visible content stays exactly where it was.
  el.scrollTop += deltaAbove;
}
```

Variable-height rows without this fix are the single most common reason a hand-rolled virtual list feels
broken.

> ⚠️ CSS `content-visibility: auto` skips rendering work but does not remove nodes. It lowers the render
> budget without lowering the memory one, so it complements virtualisation rather than replacing it.

### Images

Reserve the box before the bytes arrive, with `aspect-ratio` from the server-sent dimensions. Load below
the fold with `loading="lazy"`, and set `fetchpriority="high"` on the first one or two only. Together these
give a CLS near zero, not a stream of small shifts that add up.

### Restoring position

Browser scroll restoration works on a fixed-height document, and a virtualised feed is not one. Store the
anchor instead: the cursor that was loaded, the id of the top visible item, and the pixel offset within it.
On return, refetch that page, scroll to the **item**, then apply the offset. An id anchor, unlike a pixel
one, still works if the feed changed while the user was away.

### Optimisations

**Prefetch one page early.** Start the next fetch when the last loaded row is about two screens away, not
when it enters the viewport. The loader is then never seen on a normal scroll.

**Never inject above the viewport.** New posts go into the cache and surface as a "12 new posts" pill.
Inserting them into the DOM above the reader moves the page under them, which reads as a bug.

## When to Use It

| If the requirement says…                | The design changes to…                                       |
| --------------------------------------- | ------------------------------------------------------------- |
| The list must be crawlable or linkable  | Numbered pages with real URLs — infinite scroll has no SEO story |
| Rows are a fixed height                 | Drop measurement entirely; the maths becomes multiplication      |
| Fewer than ~200 rows, all text          | Render them all — virtualisation is complexity you do not need   |

## Common Mistakes

**❌ Paginating with `page` and `limit` on a live feed**

> `GET /feed?page=3&limit=20`

One insert at the head and page 3 now repeats an item from page 2. Users report it as "the same post
twice", and it is never reproducible on a quiet test account.

**✅ Reserve space from intrinsic dimensions**

> Send `width` and `height` with every media item, set `aspect-ratio` from them, and layout shift stops
> being a problem you have to chase later.

## 🔑 Key Takeaways

- Network cost and DOM cost are separate budgets. Loading less data does not make a long list fast.
- Cursor pagination is required, not preferred, once the underlying list can change while it is read.
- Height corrections above the viewport must be cancelled with an equal scroll adjustment, or the page jumps.
- Server-sent media dimensions are what make layout shift a solved problem rather than a chased one.
- Scroll restoration anchors to an item id, never to a pixel offset in a virtualised document.

## Interview Questions

**Q: Users say posts appear twice as they scroll. What is happening?**

The API is almost certainly paginating by offset while the feed is changing. A new post at the head pushes
everything down by one, so the next page starts one row earlier and repeats an item. A deletion causes the
mirror-image bug: a silently skipped post. Cursor pagination fixes it, and deduplicating by id in the page
cache is the cheap safety net.

**Q: The list is virtualised and still janky on Android. Where do you look?**

At what each row does, not how many exist. One common cause is images without reserved space, which force
layout on every load. Another is a row that re-renders on every scroll frame because the handler updates
state. A third is costly work, such as date formatting, done per render instead of once at cache time.
Profile a scroll and check whether the long frames are layout or script, because the fix differs.

**Q: When would you not build infinite scroll at all?**

When the content has to be findable (search results, documentation, anything crawlable), or when users
need the footer. Infinite scroll trades linkable, reachable pages for engagement. That is a product
decision, not a technical one. Saying so is the answer the interviewer is listening for.

## What to Read Next

- [Chapter ?? — Performance, Transitions and the Compiler](#ch-react-performance-and-the-compiler) — the frame budget the virtualiser is protecting
- [Chapter ?? — Caching and Asset Delivery](#ch-asset-delivery) — formats, sizing and priority for the media in these rows
- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — where the INP and CLS numbers in the requirements come from
