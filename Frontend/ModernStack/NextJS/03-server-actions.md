---
title: Server Actions
part: 3
chapter: 0
slug: server-actions
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-06
tags: [nextjs, server-actions, mutations, validation, security]
in_book: true
---

# Server Actions {#ch-server-actions}

> Write a mutation next to the form that triggers it, and treat it with exactly the suspicion you would give a public POST endpoint.

**In this chapter:** what `'use server'` actually creates · the four checks every action needs · validation · revalidation · when a Route Handler is the better tool

## 💡 The Core Idea

A Server Action looks like a function call and is not one. `'use server'` tells the bundler to leave the
function on the server and hand the client a **reference** — an opaque generated id. When the form
submits, the browser POSTs that id and its arguments to your application, and Next.js runs the matching
function.

Everything about how they should be written comes from that one sentence. The action is an HTTP
endpoint. It has a URL. It accepts whatever a caller sends. It does not care that the component next to
it was rendered for an administrator.

> Co-location is an ergonomics feature, not a security boundary. The file the action lives in tells you
> nothing about who is allowed to call it.

> ⚠️ **Moving target:** the ergonomics around actions move every release — `useActionState` replaced
> `useFormState`, and `forbidden()` and `unauthorized()` arrived with file conventions of their own. The
> durable principle does not move: an action is a public endpoint, and the checks belong inside it.

## How It Works

### The shape

```tsx
// app/actions.ts
"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";

export async function createPost(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  const parsed = PostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid post");

  await db.post.create({ data: { ...parsed.data, authorId: session.user.id } });
  updateTag("posts");
  redirect("/posts");
}
```

Pass it straight to a form and the form works before hydration, because the browser is doing a real
submission:

```tsx
<form action={createPost}>
  <input name="title" required />
  <button type="submit">Create</button>
</form>
```

The React side — `useActionState` for the returned value and the pending flag, `useOptimistic` for the
in-flight state, `useFormStatus` inside the submit button — is the same everywhere React 19 runs and is
covered in [Chapter ?? — Actions and Forms](#ch-react-actions-and-forms). This chapter is about the
server half.

### The four checks

Every action does these four things, in this order, before it touches anything.

| Check          | Question                                      | Missing it means                              |
| -------------- | --------------------------------------------- | --------------------------------------------- |
| **Authenticate** | Who is calling?                              | Anyone on the internet can run your mutation   |
| **Authorise**    | Are they allowed to do *this*?                | Any logged-in user can act as an administrator |
| **Validate**     | Is the input the right shape?                 | Malformed data reaches the database            |
| **Scope**        | Do they own the record they named?             | Any user can edit any row by changing an id    |

The fourth is the one that gets missed, and it produces the most common finding in App Router code
review.

```typescript
// ❌ Unsafe: the whole item, including its id, came from the client
export async function completeItemUnsafe(item: Item): Promise<void> {
  await db.item.update({ where: { id: item.id }, data: { completed: true } });
}

// ✅ Safe: take only the change, derive identity from the session, look up by ownership
export async function completeItem(itemId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) unauthorized();

  const item = await db.item.findFirst({ where: { id: itemId, ownerId: session.user.id } });
  if (!item) forbidden(); // not "not found" — they are not allowed to know

  await db.item.update({ where: { id: item.id }, data: { completed: true } });
}
```

`unauthorized()` and `forbidden()` from `next/navigation` throw to the matching `unauthorized.tsx` and
`forbidden.tsx` files, which keeps the failure UI out of the action.

### Validation is not the form

`FormData` values are `string | File | null`. A required attribute on an input is a hint to the browser
and is absent from a hand-crafted POST. The only validation that counts runs inside the action, with a
runtime schema.

```typescript
const PostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  publishAt: z.coerce.date().optional(),
});
```

Return the failure as state rather than throwing, so the form can render it — that is what the
`useActionState` state parameter is for.

### What Next.js does for you

Two protections come for free, and knowing their limits matters more than knowing they exist.

- **CSRF.** Next.js compares the `Origin` header with `Host` and rejects the request when they differ.
  Behind a reverse proxy that rewrites the host, `serverActions.allowedOrigins` is what makes it work
  again. This checks the request's origin — it is not authentication.
- **Closure encryption.** Variables an action captures from its enclosing component are encrypted before
  they are sent to the client, so a closed-over user id is not readable in the page source. Across
  several server instances the key must be shared, via `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` at build
  time, or decryption fails on whichever instance did not create the payload.

Encrypted is not the same as trustworthy for authorisation. The closure is a value from the render that
produced the form; treat it as an input, and re-check it:

```tsx
export default async function Page() {
  const publishVersion = await getLatestVersion();

  async function publish(): Promise<void> {
    "use server";
    // The version the user saw. Re-read the current one — the form may be minutes old.
    if (publishVersion !== (await getLatestVersion())) throw new Error("Version has changed");
    await publishDraft();
  }

  return <form><button formAction={publish}>Publish</button></form>;
}
```

### After the mutation

An action that changes data and does not invalidate anything leaves the user looking at the old value.
Invalidate by tag, then redirect if the flow moves on — `updateTag` when the same user must see the
result, `revalidateTag` when the next visitor is soon enough. That distinction is
[Chapter ?? — Data Fetching and Caching](#ch-nextjs-data-and-caching).

## When to Use It

| Situation                                        | Reach for                                   |
| ------------------------------------------------ | ------------------------------------------- |
| A form in your own application                    | A Server Action                             |
| A mutation from a Client Component button         | A Server Action, imported and called        |
| A read that a CDN should be able to cache         | A Route Handler — actions are always POST   |
| A mobile client or a third-party integration      | A Route Handler with a documented contract  |
| A webhook from a payment provider                 | A Route Handler — it needs signature checks |
| A long-running job                                | Enqueue from the action; do not block it    |

## Common Mistakes

**❌ Sending the whole object from the client.** `completeItem(item)` lets the caller choose the id, the
owner and the price. Send the minimum — usually one identifier and one change — and look the rest up.

**❌ Assuming the action is private because the component was.** The endpoint exists whether or not any
UI renders. An action reachable only from an admin page is reachable from `curl`.

**❌ Trusting `required`, `maxlength` or a disabled button.** All three are client-side, and none of them
exist in a replayed request. Validate inside the action, always.

**❌ Using an action for a cacheable read.** Server Actions are POST, so no HTTP cache, no CDN, and calls
are serialised one after another. A Route Handler or a Server Component fetch is the right tool.

**❌ No revalidation after a write.** The mutation succeeds, the page shows the previous value, and the
bug report says "saving does not work".

**❌ Exporting helpers from a `'use server'` file.** Every export in that file becomes a callable
endpoint. Keep actions in their own module and helpers somewhere else.

## 🔑 Key Takeaways

- `'use server'` creates a public POST endpoint with a generated id; the client holds a reference, not the code.
- Every action authenticates, authorises, validates and scopes by ownership — in that order, inside the action.
- `FormData` is untyped and client-controlled; a runtime schema parse is the only validation that counts.
- Next.js checks Origin against Host and encrypts closures, but neither is authorisation.
- Actions are POST-only: use a Route Handler for cacheable reads and for callers you do not control.

## Interview Questions

**Q: What stops a user calling a Server Action directly?**

Nothing. It is an HTTP endpoint with a generated identifier, and the identifier is in the page the user
already has. The only protections are the ones written inside the action: check the session, check the
permission, validate the input, and look up the record by owner rather than by the id you were handed.

**Q: Every export in your actions file is reachable. What follows from that?**

That the file is an API surface and should be treated like one. Helpers, constants and formatting
functions do not belong in a `'use server'` module, because each one becomes a callable endpoint. Keep
the file to actions, and give each one the four checks.

**Q: A Server Action closes over a value from the page it was rendered in. Can you trust it?**

Not for authorisation. Next.js encrypts closure variables so they are not readable in the page source,
which protects confidentiality, but the value still originates from a render that may be minutes old and
arrives with the request. Use it as an input — re-read the current state and compare — rather than as a
fact.

**Q: When would you write a Route Handler instead?**

When the caller is not your own UI, or when the request should be a GET. Mobile clients, third-party
integrations and webhooks need a stable, documented contract and their own authentication; cacheable
reads need HTTP semantics that a POST-only action cannot provide. Actions are for mutations initiated by
your own application.

## What to Read Next

- [Chapter ?? — Actions and Forms](#ch-react-actions-and-forms) — the React hooks that drive the client half
- [Chapter ?? — Data Fetching and Caching](#ch-nextjs-data-and-caching) — invalidating correctly after a write
- [Chapter ?? — Input Validation and Injection](#ch-backend-input-validation) — designing the schema the action parses with
