---
title: URL as State
part: 3
chapter: 0
slug: url-as-state
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [url-state, search-params, nuqs, routing, shareable-state]
in_book: true
---

# URL as State {#ch-url-as-state}

> Put every view input a user would share into the address bar, typed, with a deliberate history policy.

**In this chapter:** what the URL is good at · parsing and serialising params · push against replace · throttling updates · reading params on the server · what must never go in a URL

## 💡 The Core Idea

The URL is a state container that already has a user interface. It has a back button, a forward button,
a share action, a bookmark, and an edit field. No store you write will ever get those for free.

It is also the only piece of application state the user can *see*. That is a feature and a constraint:
anything you put there is public, editable, and permanent enough to end up in a support ticket.

The test for whether a value belongs in it is one sentence: **if someone pasted this link into a message,
should the recipient see the same view?** Filters, sort order, page number, the open tab, the selected
row — yes. A hover state, a scroll position, a half-open menu — no.

## How It Works

### Everything in a URL is a string

Search params have no types. Every value needs a parser on the way in and a serialiser on the way out,
and every parse can fail because users edit URLs.

**Typed params, with defaults, using `nuqs`:**

```typescript
import { useQueryStates, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs';

const sortOptions = ['newest', 'oldest', 'popular'] as const;

const [filters, setFilters] = useQueryStates({
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(sortOptions).withDefault('newest'),
  q: parseAsString.withDefault(''),
});

// filters.page is number, filters.sort is 'newest' | 'oldest' | 'popular'
setFilters({ page: 2 }); // updates only `page`, leaves the rest of the URL alone
```

Two design rules follow.

**Defaults should not appear in the URL.** `?page=1&sort=newest` on a first visit is noise, it makes two
URLs for one view, and it splits caching and search-engine signals. Clear a param when it equals its
default.

**Unknown values must fall back, not crash.** `?sort=banana` is one keystroke away from `?sort=newest`.
Parse against a literal union and fall back to the default rather than trusting the string.

### Push or replace

Every URL update is a history entry or an overwrite, and choosing wrongly breaks the back button in one
of two directions.

| Change | Mode | Why |
| ------ | ---- | --- |
| Page number, tab, opening a detail view | **push** | The user thinks of it as navigation and expects back to undo it |
| Dragging a slider, typing in a search box | **replace** | Otherwise back has to be pressed forty times |
| Applying a filter from a dropdown | **push** | One deliberate action, one history entry |
| Restoring state on mount | **replace** | It was never a navigation |

The failure everyone has met: a search box that pushes on every keystroke, so leaving the page means
pressing back once per character typed.

### Throttling the writes

Even with `replace`, writing the URL on every keystroke is expensive — it touches the router, and in
frameworks where a param change triggers a server round trip, it triggers one per character.

The fix is to keep the input controlled locally and throttle or debounce the URL write:

```typescript
const [q, setQ] = useQueryState('q', {
  defaultValue: '',
  limitUrlUpdates: { method: 'debounce', timeMs: 300 },
});
```

The input stays responsive because the DOM value updates immediately; the URL — and any fetch it drives —
catches up when the user pauses.

### Shallow or not: does this refetch?

A URL update can be handled entirely on the client, or it can go back to the server to re-render the
route with new params. Frameworks expose this as a `shallow` flag, and it is a genuine decision:

- **Shallow** — the client already has what it needs, so the update is just a re-render. Right for a
  client-side filter over data already loaded.
- **Not shallow** — the server re-renders with the new params. Right when the params drive the query,
  which is the usual case for search, pagination and filtering over a real dataset.

The second option is what makes URL state pair naturally with server rendering: the params are inputs to
the server render, so a pasted link produces the correct page on the very first response with no client
fetch at all. That also makes those routes indexable — see
[Chapter ?? — SEO and Rendering](#ch-seo-and-rendering).

### Reading params on the server

Because params arrive with the request, the first render can be correct. There is no flash of the default
view followed by a jump to the filtered one.

The cost is that reading search parameters makes a route dynamic in most frameworks — the response now
depends on the request, so it cannot be fully static. That is the right tradeoff for a search page and
the wrong one for a marketing page with a tracking parameter, which is a case for
[Chapter ?? — Choosing Per Route, Not Per App](#ch-choosing-per-route).

### What must never go in a URL

URLs travel further than people expect. They are written to server logs, proxy logs and analytics; sent
in the `Referer` header to third-party scripts; stored in browser history on shared machines; and pasted
into tickets.

| Never | Because |
| ----- | ------- |
| Tokens, session identifiers, password reset codes | Logged, forwarded, and cached everywhere |
| Personal data — email addresses, account numbers | The same, and it is usually a compliance breach |
| Large payloads — a whole result set, a serialised form | Length limits, and the link stops working when the data moves |
| Anything derivable from other params | A second source of truth in a place users can edit |

The practical limit on URL length is a few thousand characters across browsers, proxies and servers, and
the first thing to break is usually a CDN rather than the browser. Keep params to identifiers and
enumerations.

## When to Use It

| State | In the URL? |
| ----- | ----------- |
| Search query, filters, sort, pagination | **Yes** |
| Active tab, selected row, open detail panel | **Yes** |
| Date range on a report | **Yes** |
| Map centre and zoom | **Yes**, throttled |
| Sidebar collapsed, theme | No — client state, persisted per device |
| Draft form values | No — form state |
| The fetched results themselves | No — server state, keyed by the params |

## Common Mistakes

**❌ Pushing a history entry on every keystroke.**
✅ Replace, and throttle. The back button is not a keystroke log.

**❌ Reading params without parsing them.**
✅ Users and bots will send anything. Parse to a union or a number with a fallback.

**❌ Writing defaults into the URL.**
✅ Two URLs for one view splits caching and search signals, and looks careless.

**❌ Keeping the same value in the URL and in a store.**
✅ Two sources of truth that disagree after a back-button press. The URL wins; derive everything else.

**❌ Putting an identifier that leaks information into a shareable link.**
✅ Anything in a URL is logged by every hop it passes through. Treat it as public.

## 🔑 Key Takeaways

- The URL is shared, editable, persistent state with a back button already attached.
- Every param is a string, so each one needs a parser, a default, and a fallback for junk.
- Push for deliberate navigation, replace for continuous adjustment, and throttle the writes.
- Reading params on the server makes the first render correct, at the cost of making the route dynamic.
- URLs are logged everywhere — never put tokens, personal data or large payloads in one.

## Interview Questions

**Q: Which state belongs in the URL?**

Anything a user would reasonably share, bookmark or reach with the back button: search query, filters,
sort, pagination, the active tab, the selected item. The test is whether pasting the link should
reproduce the sender's view. Transient interface state and anything sensitive stay out.

**Q: How do you stop a search box from destroying the back button?**

Use replace rather than push for the URL update, so typing overwrites the current entry instead of adding
one per character, and debounce the write by a few hundred milliseconds. Keep the input value local so it
stays responsive while the URL catches up.

**Q: What breaks when the same value lives in both the URL and a store?**

They disagree. A back-button press changes the URL without going through your setter, so the store keeps
the old value and the page shows a mixture of both. Make the URL the source of truth and derive
everything else from it, or keep the value out of the URL entirely.

**Q: What is the cost of reading search params on the server?**

The route becomes dynamic — the response now depends on the request, so it cannot be served from a static
cache. That is correct for a search or filter page, where the params are the query anyway. It is a
mistake on a mostly-static page that happens to receive a campaign tracking parameter.

## What to Read Next

- [Chapter ?? — The Four Kinds of State](#ch-four-kinds-of-state) — where this category sits among the others
- [Chapter ?? — SEO and Rendering](#ch-seo-and-rendering) — param variants, canonical URLs and duplicate indexing
- [Chapter ?? — SvelteKit Routing and Loading](#ch-sveltekit-routing-and-loading) — params as inputs to a server load function
