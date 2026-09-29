---
title: SvelteKit Form Actions
part: 3
chapter: 22
slug: sveltekit-form-actions
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-06
tags: [sveltekit, forms, progressive-enhancement, validation, actions]
in_book: true
---

# SvelteKit Form Actions {#ch-sveltekit-form-actions}

> Write a form that works before your JavaScript arrives, then let SvelteKit make it feel like an application.

**In this chapter:** the default action · named actions · returning validation errors with `fail` · what `use:enhance` does for you · where the security check goes

## 💡 The Core Idea

A SvelteKit 2 form action is a **real HTML form submission**. The browser posts `multipart/form-data` to
the route, the server handles it, and the response is a page. That is the baseline. It works with
JavaScript off, on a slow connection, and for a request that arrives before your bundle has finished
downloading.

`use:enhance` then upgrades the same form to a `fetch` with no page reload. Nothing on the server
changes. This order is the point: **the enhanced path is an optimisation of the working path**, not the
other way round. So you never have to answer "what happens without JavaScript" later.

> ⚠️ **Moving target:** SvelteKit 2.27 added **remote functions** behind the experimental
> `kit.experimental.remoteFunctions` flag. These are `query`, `form`, `command` and `prerender`, exported
> from `.remote.ts` files and imported directly into components. They are a different shape for the same
> job, and they are not stable yet. The durable principle holds either way: a mutation is a server-side
> function with its own authorisation and validation.

## How It Works

### The default action

```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "");

    const user = await authenticate(email, String(data.get("password") ?? ""));
    if (!user) {
      // 4xx plus the data the form needs to re-render itself
      return fail(400, { email, incorrect: true });
    }

    cookies.set("session", await createSession(user.id), { path: "/", httpOnly: true });
    redirect(303, "/dashboard");
  },
} satisfies Actions;
```

```svelte
<script lang="ts">
  let { form } = $props(); // whatever the action returned
</script>

<form method="POST">
  <input name="email" value={form?.email ?? ""} />
  <input name="password" type="password" />
  {#if form?.incorrect}<p class="error">Those details did not match.</p>{/if}
  <button>Sign in</button>
</form>
```

Three things are worth naming. `fail(status, data)` returns a **4xx with a body**. That lets the page
re-render with the user's input still in the fields. `redirect(303, …)` uses the See Other status, so
the browser follows with a `GET` and a refresh does not re-post. And the returned value arrives as the
`form` prop, typed from the action.

### Named actions

One route often needs several verbs. Name them, and target one from the form:

```typescript
export const actions = {
  create: async ({ request }) => {
    /* … */
  },
  archive: async ({ request }) => {
    /* … */
  },
} satisfies Actions;
```

```svelte
<form method="POST" action="?/create">…</form>

<!-- or a second button inside one form -->
<button formaction="?/archive">Archive</button>
```

A route has either a `default` action or named ones, never both. The plain HTML path picks between them
with the `?/name` query parameter. That is why it works without JavaScript.

### `use:enhance`

```svelte
<script lang="ts">
  import { enhance } from "$app/forms";
</script>

<form method="POST" use:enhance>…</form>
```

Added bare, it intercepts the submission and sends it with `fetch`. Then it does what the browser would
have done. It updates the `form` prop and the page status, resets the form on success, **invalidates
all load data**, and follows redirects. The result behaves like the plain version, without the reload.

Pass a function to take over the parts you care about:

```svelte
<script lang="ts">
  import { enhance } from "$app/forms";
  let saving = $state(false);
</script>

<form
  method="POST"
  use:enhance={() => {
    saving = true;
    return async ({ update }) => {
      await update(); // the default behaviour — keep it unless you mean not to
      saving = false;
    };
  }}
>
  <button disabled={saving}>{saving ? "Saving…" : "Save"}</button>
</form>
```

> ⚠️ Returning a callback **replaces** the default handling. Forget to call `update()` and the form stops
> resetting, the `form` prop stops arriving, and loads stop re-running. No error tells you.

### Where the security check goes

An action is a public endpoint. Anyone can reach it with a `POST`, so sitting next to the page proves
nothing:

```typescript
export const actions = {
  archive: async ({ request, locals, params }) => {
    if (!locals.user) return fail(401, { message: "Sign in first." });

    const parsed = archiveSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { errors: parsed.error.flatten().fieldErrors });

    // Ownership is part of the query, not a check after it
    const updated = await db.invoice.updateMany({
      where: { id: params.id, ownerId: locals.user.id },
      data: { archived: true },
    });
    if (updated.count === 0) return fail(403, { message: "Not yours to archive." });
  },
} satisfies Actions;
```

Check session, validation and ownership every time, inside the action. Schema design belongs to
[Chapter ?? — Input Validation](#ch-backend-input-validation). This is where you call it.

By default, SvelteKit checks the `Origin` header on form posts. That covers the classic cross-site form
submission. It is a floor, not a substitute for the authorisation check above it.

## When to Use It

| Situation                                   | Use                                       |
| ------------------------------------------- | ----------------------------------------- |
| A form the user submits                      | A form action                              |
| Several verbs on one page                    | Named actions                              |
| A mutation with no form — a "like" button    | A `+server.ts` endpoint, or a command      |
| A webhook or a public API                    | `+server.ts`                               |
| Optimistic UI                                | `use:enhance` with a custom callback       |
| A file upload                                | A form action — `formData` handles it      |

## Common Mistakes

**❌ Returning `fail()` without the submitted values.** The page re-renders empty and the user retypes
everything. Send back what they entered, minus the password.

**❌ A 302 redirect after a POST.** Use `redirect(303, …)` so the browser follows with a `GET`.
Otherwise a refresh re-submits.

**❌ A custom `enhance` callback that never calls `update()`.** You have silently lost resetting, the
`form` prop, and invalidation.

**❌ Trusting the action because it sits next to the page.** It is a URL. Check the session, validate the
body, and put ownership in the query.

**❌ Building the JavaScript path first.** Write the plain form, confirm it works with scripting off, then
add `use:enhance`. Done the other way round, the no-JavaScript path quietly stops working.

**❌ Throwing a bare `Error` for a validation failure.** That is a 500 and an error page. Validation
failures are `fail(400, …)` and belong in the form.

## 🔑 Key Takeaways

- A form action is a real HTML form post, so the route works before any JavaScript loads.
- `fail(status, data)` re-renders the page with the user's input. `redirect(303, …)` prevents a re-post.
- `use:enhance` upgrades the same form to `fetch`. A custom callback replaces its defaults unless you call `update()`.
- Actions are public endpoints. Session, validation and ownership checks all belong inside them.
- Named actions plus `?/name` keep multiple verbs on one route working without scripting.

## Interview Questions

**Q: How does a SvelteKit form behave before hydration?**

Exactly as an HTML form does: the browser posts to the route, the action runs, and the server returns a
page. That is the default path, not a fallback. Later, `use:enhance` intercepts the same submission and
sends it by `fetch` instead. So progressive enhancement here costs no extra code. The working version is
the one you wrote first.

**Q: What is the difference between `fail` and throwing an error in an action?**

`fail` returns a 4xx with a body, so the page re-renders with the user's data and your validation
messages in the `form` prop. Throwing produces an error page and loses the submission. Validation
problems are expected outcomes and belong in `fail`. A thrown error should mean something really went
wrong.

**Q: What does `use:enhance` do if you pass it a callback?**

It hands you control before the request and, through the returned function, after the response. It also
stops doing its own work. `update()` performs the default behaviour: it resets the form, updates the
`form` prop, invalidates loads and follows redirects. A callback that never calls it has silently turned
off all four.

**Q: What stops someone posting directly to your form action?**

Nothing, and that is the point. The action is a URL that accepts a `POST` from any client. SvelteKit
checks the `Origin` header, which handles classic cross-site submissions. But authorisation and
validation are your job. Verify the session, parse the body against a schema, and put ownership into
the query instead of checking it afterwards.

## What to Read Next

- [Chapter ?? — SvelteKit Routing and Loading](#ch-sveltekit-routing-and-loading) — the read half of the same model
- [Chapter ?? — Server Actions](#ch-server-actions) — Next.js answering the same question
- [Chapter ?? — Input Validation](#ch-backend-input-validation) — designing the schema the action parses
