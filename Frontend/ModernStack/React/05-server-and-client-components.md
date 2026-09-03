---
title: Server Components and Client Components
part: 3
chapter: 0
slug: server-components-vs-client-components
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-03
tags: [react, rsc, use-client, serialisation, boundary]
in_book: true
---

# Server Components and Client Components {#ch-server-components-vs-client-components}

> Draw the boundary, say exactly what is allowed to cross it, and explain why `'use client'` is not a per-file switch.

**In this chapter:** two environments, one tree · what serialises · the module graph against the render tree · passing children across · passing promises across

## 💡 The Core Idea

A React tree can now be rendered in two places. **Server Components run once, on the server, and never
re-render.** They can read a database, hold a secret, and `await` directly. They ship no JavaScript to
the browser — only the result. **Client Components** are ordinary React: state, effects, event handlers,
browser APIs, and a bundle the user downloads.

The two are not alternatives. They compose into one tree, and the interesting engineering is all at the
seam. This is the single most asked frontend question in a 2026–27 senior loop, and the answers that
score are about *the boundary*, not about which one is faster.

> ⚠️ **Moving target.** The Server Component payload format, and how a framework spells the directives,
> have moved between React releases. The durable principle does not move: two environments, one tree,
> and everything crossing between them has to survive being written down and sent.

## How It Works

### `'use client'` marks a boundary in the module graph

This is the sentence most explanations get wrong. `'use client'` at the top of a file does not mean
"this component is a Client Component". It means **this module is an entry point into the client
bundle** — and every module it *imports* joins the client bundle with it.

The directive applies to the **module dependency graph**, not to the render tree. That distinction has
a consequence people find surprising:

```tsx
// app/page.tsx — a Server Component, no directive
import Sidebar from "./Sidebar";      // Client Component
import Footer from "./Footer";        // No directive — stays a Server Component

export default async function Page() {
  const user: User = await db.users.current();
  return (
    <Sidebar user={user}>
      <Footer />   {/* Rendered on the server, passed to a client component as children */}
    </Sidebar>
  );
}
```

`Footer` is rendered *inside* `Sidebar`, a Client Component — and it is still a Server Component. It
never enters the client bundle, because `Sidebar` does not import it. `Page` imports it, renders it, and
hands the finished element across as `children`. A parent–child relationship in the render tree says
nothing about where a component ran.

This is the escape hatch for the rule people repeat as "Client Components cannot render Server
Components". They cannot *import* one. They can happily render one they were handed.

### What is allowed to cross

Props from a Server Component to a Client Component are serialised into the payload and sent over the
wire. Only things with a serialised form can go.

| Crosses the boundary                                    | Does not cross                                      |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Primitives — string, number, bigint, boolean, `null`, `undefined` | Ordinary functions and closures               |
| Arrays, `Map`, `Set`, typed arrays, plain objects        | Classes, and any instance of one                     |
| `Date`                                                   | Objects with a `null` prototype                      |
| JSX elements — including Server Component output          | Symbols not registered with `Symbol.for`             |
| Promises                                                  | Anything holding a database handle or a request object |
| Server Functions — those marked `'use server'`            | —                                                    |

A function fails because code has no serialised form. React throws at render, which is the right
behaviour and a confusing error the first time. There are two correct responses: pass the data down and
define the handler inside the Client Component, or pass a **Server Function**, which React serialises as
a reference rather than as code.

### Passing a promise across

A Server Component does not have to await everything before it responds. It can start a slow query, pass
the unresolved promise as a prop, and let the client resolve it with `use` inside a Suspense boundary.

```tsx
// Server Component
export default async function Page({ id }: { id: string }) {
  const note: Note = await db.notes.get(id);         // Awaited — blocks the shell
  const commentsPromise: Promise<Comment[]> = db.comments.get(id); // Not awaited

  return (
    <article>
      <NoteBody note={note} />
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments commentsPromise={commentsPromise} />
      </Suspense>
    </article>
  );
}
```

```tsx
"use client";

export function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments: Comment[] = use(commentsPromise); // Resumes the server's promise
  return <ul>{comments.map((c: Comment) => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

The note arrives in the first flush; the comments stream in when the query finishes. Nothing waits for
everything.

### Where the boundary belongs

Push it **down and outward** — as deep in the tree and as narrow as the interactivity requires. A page
whose only interactive element is a like button should send one button's worth of JavaScript, not the
page's.

```tsx
// ❌ The whole article becomes client code because of one button
"use client";
export function Article({ post }: { post: Post }) {
  const [liked, setLiked] = useState<boolean>(false);
  return (
    <article>
      {/* a great deal of static markup, now all shipped to the browser */}
      <button onClick={() => setLiked(true)}>{liked ? "Liked" : "Like"}</button>
    </article>
  );
}
```

```tsx
// ✅ Server Component, with one small client leaf
export function Article({ post }: { post: Post }) {
  return (
    <article>
      {/* the same static markup, zero JavaScript */}
      <LikeButton postId={post.id} />
    </article>
  );
}
```

## When to Use It

Server is the default. Move to the client when you need something the server cannot give you.

| You need                                    | Component type | Why                                          |
| -------------------------------------------- | -------------- | --------------------------------------------- |
| Data from a database or an internal service  | Server         | No round trip, no exposed credentials         |
| A large dependency used only to format output | Server        | The library never reaches the browser         |
| `useState`, `useReducer`, `useEffect`        | Client         | There is no state on a component that renders once |
| An event handler — `onClick`, `onChange`     | Client         | Handlers are code, and code does not serialise |
| `window`, `localStorage`, `IntersectionObserver` | Client     | The APIs do not exist on the server           |
| A secret — an API key, a signing token       | Server         | Anything in the payload is public             |

## Common Mistakes

**❌ `'use client'` at the top of every file.** It compounds: each directive drags its whole import
subtree into the bundle. One at the root of a layout can turn an entire application back into a
client-rendered one, silently, with no error.

**❌ Passing a callback down to make a child interactive:**

```tsx
<ClientList onSelect={(id: string) => db.select(id)} />  // Throws — a function cannot serialise
```

**✅ Give the client a Server Function instead**, or pass the id and let the Client Component own the
handler.

**❌ Serialising far more than the UI needs.** Every prop crossing the boundary is bytes in the HTML
response *and* work for the client to parse. Passing a 200-field record so a component can read two
fields is a payload problem hiding as a convenience.

**❌ Assuming a Server Component can be interactive later.** It has no state and never re-renders. There
is no "hydrate this one" — the interactive part has to be a Client Component from the start.

## 🔑 Key Takeaways

- Server Components render once on the server, ship no JavaScript, and cannot hold state.
- `'use client'` marks an entry point in the **module graph**, so everything that module imports joins the client bundle.
- A Client Component can render a Server Component it was handed as `children`; it just cannot import one.
- Only serialisable values cross the boundary — functions fail, and Server Functions are the exception because they cross as a reference.
- Push the boundary down to the smallest interactive leaf; a directive near the root undoes the whole model.

## Interview Questions

**Q: Why can't you pass a function as a prop from a Server Component to a Client Component?**

Props crossing the boundary are serialised into the payload and sent over the wire, and a function has
no serialised form, so React throws at render. The two fixes are to pass the data down and define the
handler inside the Client Component, or to pass a Server Function, which React serialises as a reference
the client can call rather than as code.

**Q: A colleague says Client Components cannot render Server Components. Are they right?**

Half right. A Client Component cannot *import* a Server Component, because importing it would pull the
module into the client bundle. It can render one that was passed to it as `children` or as any other
element prop, since the parent — a Server Component — already rendered it. The directive draws its line
on the module graph, not on the render tree.

**Q: Where do you put the `'use client'` boundary, and what happens if you get it wrong?**

As deep and as narrow as the interactivity requires — ideally on the smallest leaf that needs state or a
handler. Put it too high and every module below it joins the client bundle, so a page that should have
shipped one button's worth of JavaScript ships the whole article. There is no error for this; it shows
up only as a bundle that grew.

**Q: When is a Server Component the wrong choice?**

When the thing genuinely belongs to the user's session on the device: a controlled input, a drag
interaction, anything reading `window` or `localStorage`, anything that needs to respond without a round
trip. Server Components render once and never again, so any state that has to change after the response
has to live on the client.

## What to Read Next

- [Chapter ?? — Suspense and Streaming](#ch-suspense-and-streaming) — how the payload arrives in pieces
- [Chapter ?? — Actions and Forms](#ch-react-actions-and-forms) — the Server Function that crosses the boundary as a reference
- [Chapter ?? — The Rendering Spectrum](#ch-rendering-spectrum) — where this sits next to SSR, SSG and PPR
