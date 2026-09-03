---
title: Actions and Forms
part: 3
chapter: 0
slug: react-actions-and-forms
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-03
tags: [react, actions, forms, useActionState, useOptimistic, server-functions]
in_book: true
---

# Actions and Forms {#ch-react-actions-and-forms}

> Submit a form that works before hydration, reports its own pending state, and cannot be trusted by the server.

**In this chapter:** what an Action is · `<form action>` · `useActionState` · `useFormStatus` · `useOptimistic` · Server Functions and their security

## 💡 The Core Idea

Every mutation in a React application used to require the same four pieces of hand-written state:
submitting, error, result, and something optimistic while the request was in flight. Everyone wrote them,
everyone wrote them slightly differently, and most people got the race conditions wrong.

React 19 made it a first-class concept. **An Action is an async function that React runs inside a
transition**, tracking the pending state for you. Pass one to a form's `action` prop and the form
becomes a real submission again — one that works before your JavaScript has loaded.

> The senior point is not the hooks. It is that a form submitted at second one, before hydration
> finished, is replayed rather than lost.

## How It Works

### `<form action={fn}>`

Pass a function instead of a URL. React calls it with the `FormData`, inside a transition, with no
`preventDefault` needed. On success it resets an uncontrolled form for you.

```tsx
function Search() {
  async function search(formData: FormData): Promise<void> {
    const query: string = String(formData.get("query"));
    await router.push(`/results?q=${encodeURIComponent(query)}`);
  }

  return (
    <form action={search}>
      <input name="query" />
      <button type="submit">Search</button>
    </form>
  );
}
```

Individual buttons can override it with `formAction`, which is how one form gets a "Publish" and a
"Save draft" without a hidden field and a branch.

### `useActionState` — the result and the pending flag

Wraps an action so React keeps the last returned value. The signature is a reducer over submissions:
the function receives the previous state and the form data.

```tsx
interface FormState {
  error: string | null;
}

function UpdateName() {
  const [state, submitAction, isPending] = useActionState<FormState, FormData>(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await updateName(String(formData.get("name")));
      return result.ok ? { error: null } : { error: result.message };
    },
    { error: null },
  );

  return (
    <form action={submitAction}>
      <input name="name" disabled={isPending} />
      {state.error !== null && <p role="alert">{state.error}</p>}
      <button type="submit">Save</button>
    </form>
  );
}
```

Returning the error rather than throwing it is deliberate: a returned value survives serialisation from
the server, and it keeps the failure in the render tree rather than in an error boundary.

### `useFormStatus` — pending state from a child

Imported from `react-dom`, not `react`. It reads the status of the nearest `<form>` **above** it, which
is what makes a shared submit button possible.

```tsx
"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : children}</button>;
}
```

> ⚠️ `useFormStatus` must live in a **child** of the form, never in the component that renders the
> `<form>` element. In the same component it always reports `pending: false`, silently — there is no
> warning, and the button simply never disables.

### `useOptimistic` — show the result before it happens

Give React a temporary value to render while the action runs. When the action settles, React drops the
optimistic value and shows the real state.

```tsx
function Thread({ messages, sendMessage }: ThreadProps) {
  const [optimistic, addOptimistic] = useOptimistic<Message[], string>(
    messages,
    (current: Message[], text: string) => [...current, { id: "pending", text, sending: true }],
  );

  async function formAction(formData: FormData): Promise<void> {
    const text: string = String(formData.get("message"));
    addOptimistic(text);                 // Appears instantly
    await sendMessage(text);             // Real state arrives, optimistic value is discarded
  }

  return (
    <form action={formAction}>
      {optimistic.map((m: Message) => <p key={m.id} className={m.sending ? "dim" : ""}>{m.text}</p>)}
      <input name="message" />
    </form>
  );
}
```

Rollback is automatic — if the action throws, React reverts to the real state. What is *not* automatic is
telling the user, which is still your job.

### Progressive enhancement

A form with an action is a form. Before hydration, the browser submits it; React replays that submission
once hydration completes. Nothing is dropped in the window between HTML arriving and JavaScript running
— the window in which real users on real networks click things.

This only holds if the form is a real `<form>` with named inputs. A `<div>` with an `onClick` has none
of it.

### Server Functions

A function marked `'use server'` runs on the server and can be handed to the client as a prop. React
serialises it as a **reference**; the client gets a generated endpoint to call.

```tsx
"use server";

export async function updateName(name: string): Promise<Result> {
  const session = await getSession();
  if (session === null) return { ok: false, message: "Not signed in" };
  if (name.trim().length < 2) return { ok: false, message: "Name is too short" };

  await db.users.update(session.userId, { name });
  return { ok: true };
}
```

Note what those first three lines are. **A Server Function is a public HTTP endpoint with a generated
name.** Anyone can call it with any arguments. Authentication, authorisation and validation belong
inside it, every time — being co-located with a component is not access control.

## When to Use It

| Situation                                        | Reach for                                    |
| ------------------------------------------------- | --------------------------------------------- |
| Any form that mutates something                   | `<form action>` — never `onSubmit` plus fetch |
| The result or error has to be displayed           | `useActionState`                              |
| A reusable submit button in a design system       | `useFormStatus` in the button                 |
| Chat, likes, toggles — where latency is felt      | `useOptimistic`                               |
| Complex client-side validation before submit      | A form library, with an action underneath      |
| A mutation with no form — a delete icon           | `startTransition` around the async call        |

## Common Mistakes

**❌ Trusting the caller of a Server Function.** It is an endpoint. Validate the arguments and check the
session inside the function, not in the component that renders the button.

**❌ `useFormStatus` beside the form.** It reads the form *above* it. In the same component it returns
`false` forever and nothing disables.

**❌ Keeping `onSubmit` and `preventDefault` out of habit.** That path gives up the pre-hydration
replay and the automatic reset, and puts you back to hand-rolling the pending state.

**❌ Optimistic updates with no failure story.** The rollback is automatic; the explanation is not. A
message that silently vanishes is worse than one that took a second to send.

**❌ Controlled inputs everywhere by reflex.** Actions read `FormData`, so uncontrolled inputs with
`name` attributes are enough — and they are what makes the form work before hydration.

## 🔑 Key Takeaways

- An Action is an async function React runs in a transition, tracking pending state for you.
- `<form action>` needs no `preventDefault`, resets on success, and is replayed if submitted before hydration.
- `useActionState` returns the last result and a pending flag; `useFormStatus` reads that pending state from a child.
- `useOptimistic` rolls back automatically on failure, but telling the user is still your job.
- A Server Function is a public endpoint — authenticate, authorise and validate inside it.

## Interview Questions

**Q: What does React 19 give you that `onSubmit` plus `fetch` did not?**

Pending state, automatic reset, and the transition semantics that keep the page responsive — but the one
that matters is progressive enhancement. A form with an `action` works before hydration, and React
replays a submission made in that window instead of losing it. On a slow device that window is seconds
long, and it is exactly when impatient users click.

**Q: How would you build a submit button for a design system that knows when it is submitting?**

`useFormStatus` inside the button component. It reads the nearest form above it in the tree, so the
button needs no props and no wiring from the form. The trap is that it must be a child of the `<form>`:
called in the same component that renders the form element it reports `pending: false` forever, with no
warning at all.

**Q: What stops a user calling your Server Function directly with arbitrary arguments?**

Nothing. It compiles to a public endpoint with a generated name, and the client is handed a reference to
it. Every Server Function needs its own session check, authorisation check and input validation, exactly
like a route handler would. Co-location with the component that calls it is an ergonomics feature, not a
security boundary.

**Q: When is an optimistic update the wrong choice?**

When being wrong is expensive or hard to explain. Showing a sent message or a toggled like is fine —
the user understands a message that failed. Showing a completed payment, a confirmed booking or a
deleted record before the server agreed is not, because the correction arrives after the user has moved
on and acted on what they saw.

## What to Read Next

- [Chapter ?? — Transitions and Concurrency](#ch-transitions-and-concurrency) — the mechanism Actions are built on
- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — how a function reference crosses the boundary
- [Chapter ?? — Form State](#ch-form-state) — validation, schemas and where they run
