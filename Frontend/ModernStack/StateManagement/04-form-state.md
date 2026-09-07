---
title: Form State
part: 3
chapter: 0
slug: form-state
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [forms, react-hook-form, zod, validation, server-actions]
in_book: true
---

# Form State {#ch-form-state}

> Keep one schema, validate on both sides of the wire, and stop re-rendering the whole form on every keystroke.

**In this chapter:** the draft lifecycle · controlled against uncontrolled · one schema, two runtimes · when to show an error · server-action forms · multi-step drafts

## 💡 The Core Idea

Form state is the only category that is **invalid on purpose**. A user typing an email address passes
through "a", "al", "ali" — none of which are email addresses — and telling them so at each step is
hostile.

That single property is why forms do not belong in application state. Application state is supposed to be
valid; a form is a draft that becomes valid at the end, if it becomes valid at all.

A form has a lifecycle, and every decision in this chapter attaches to a point in it:

```text
pristine → dirty → validated → submitting → submitted or failed
```

## How It Works

### Controlled against uncontrolled

| | Controlled | Uncontrolled |
| --- | --- | --- |
| **Where the value lives** | React state | The DOM node |
| **Re-render on keystroke** | Yes, every one | No |
| **Reading the value** | Always available | On submit, or via a ref |
| **Needed for** | Live formatting, dependent fields, live preview | Everything else |

A large controlled form re-renders on every character. With twenty fields and a validation pass per
render, that is measurable input lag on a mid-range phone — and it is the most common performance problem
in enterprise forms.

React Hook Form is popular because it is uncontrolled underneath. Inputs register with the DOM, the
library subscribes to what it needs, and components re-render only when their own error state changes.

### One schema, two runtimes

The rule that matters more than any library choice: **write the validation rules once and run them in
both places.** Client validation is a user-experience feature. Server validation is correctness. A rule
that exists on only one side is either a security hole or a broken form.

```typescript
import { z } from 'zod';

// Shared by the form and the endpoint. Zod 4 promotes formats to top level: z.email(), not z.string().email().
export const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(['viewer', 'editor', 'admin']),
  message: z.string().max(500).optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;
```

`z.infer` means the TypeScript type is derived from the runtime rules rather than declared beside them.
One definition, no drift.

> ⚠️ **Moving target:** Zod 4 moved string formats to top-level functions (`z.email()` replacing
> `z.string().email()`) and reorganised the error-issue types. The durable idea is a single schema that
> produces both runtime validation and a static type; the specific call syntax will keep moving, and
> other validators implementing the same contract are interchangeable behind a resolver.

**The form side:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState } = useForm<InviteInput>({
  resolver: zodResolver(inviteSchema),
  mode: 'onTouched', // validate after first blur, then on change
});

const onSubmit = handleSubmit(async (values: InviteInput) => {
  await sendInvite(values); // values are already parsed and typed
});
```

**The endpoint side runs the same schema:**

```typescript
const parsed = inviteSchema.safeParse(await request.json());
if (!parsed.success) {
  return Response.json({ errors: parsed.error.flatten() }, { status: 400 });
}
```

### When to show an error

Validation *timing* is a user-experience decision, and getting it wrong is what makes forms feel
aggressive.

| Mode | Behaviour | Verdict |
| ---- | --------- | ------- |
| `onSubmit` | Errors appear only after submitting | Safe default; poor for long forms |
| `onChange` | Errors while typing | Hostile — flags every partial value |
| `onBlur` | Errors when leaving a field | Good |
| `onTouched` | Blur first, then live once touched | **Best for most forms** |

`onTouched` is the pattern users expect: say nothing until they have finished with a field, then correct
them live while they fix it.

Whichever mode you choose, the error must reach assistive technology. Link the message to the input with
`aria-describedby`, mark the field `aria-invalid`, and move focus to the first error on a failed submit —
see [Chapter ?? — Accessibility](#ch-accessibility).

### Server-action forms

Server actions change where the submit handler lives, not what validation needs to be. The form posts to
a server function, which runs the same schema and returns field errors as data.

Two properties come with the pattern. The form **works without JavaScript**, because it is a real form
posting to a real endpoint. And the errors it renders are the server's, so there is no possibility of the
two sides disagreeing.

The cost is a round trip for every validation pass, so most production forms run the schema on the client
too and treat the server as the authority. The mechanics — pending state, returned errors, progressive
enhancement — are in [Chapter ?? — Actions and Forms](#ch-react-actions-and-forms) and
[Chapter ?? — Server Actions](#ch-server-actions); the equivalent in another framework is
[Chapter ?? — SvelteKit Form Actions](#ch-sveltekit-form-actions).

### Multi-step forms and where the draft lives

A wizard raises a question a single form does not: what happens when the user refreshes on step three?

| Approach | Survives refresh | Right for |
| -------- | ---------------- | --------- |
| One form, steps as views | No | Short flows finished in one sitting |
| Step in the URL, values in memory | Step only | Flows where restarting is acceptable |
| Draft persisted to `sessionStorage` | Yes, on that device | Long flows, no account needed |
| Draft saved to the server per step | Yes, everywhere | Applications, onboarding, anything long |

Validate each step against a slice of the whole schema, and validate the whole schema again on final
submit. A user who reaches the last step through a restored draft has not necessarily passed step one
under the current rules.

## When to Use It

| Situation | Approach |
| --------- | -------- |
| Two or three simple fields | Uncontrolled inputs and a schema on submit |
| A typical business form | React Hook Form plus a shared schema, `onTouched` |
| Live formatting or dependent fields | Controlled, for those fields only |
| Progressive enhancement is required | A server-action form, schema on both sides |
| A long application flow | Persisted draft, per-step validation, full validation at the end |

## Common Mistakes

**❌ Holding form values in a global store.**
✅ Every keystroke then re-renders anything subscribed to it. Form state is local by nature; only the
*submitted result* belongs anywhere else.

**❌ Writing the validation rules twice.**
✅ They drift within a release. Export one schema and import it on both sides.

**❌ Trusting client validation.**
✅ It is a convenience for honest users. The endpoint must revalidate every field — see
[Chapter ?? — Input Validation](#ch-backend-input-validation).

**❌ Validating on every change from the first keystroke.**
✅ Users see an error before they have finished typing the first word. Use `onTouched`.

**❌ Rendering an error message with no programmatic link to its input.**
✅ A screen reader announces the field with no idea why it failed. Wire `aria-describedby` and
`aria-invalid`.

**❌ Resetting the form when fresh server data arrives mid-edit.**
✅ You have discarded the user's work. Compare against the dirty fields and ask, or merge only the
untouched ones.

## 🔑 Key Takeaways

- Form state is invalid by design, which is why it does not belong in application state.
- Uncontrolled inputs avoid a re-render per keystroke; use controlled fields only where you need the value live.
- One schema, imported by the form and the endpoint, produces both the runtime check and the static type.
- Validate after first blur, then live — `onTouched` is the mode users expect.
- Client validation is user experience; server validation is correctness, and it is never optional.

## Interview Questions

**Q: Why are uncontrolled inputs the default in modern form libraries?**

Because a controlled input re-renders the component on every keystroke, and a large form re-renders on
every character typed anywhere in it. Uncontrolled inputs leave the value in the DOM and let the library
subscribe only to what changes — usually a single field's error state — so typing costs nothing.

**Q: Where does validation belong when the server also validates?**

Both places, from one schema. The client copy exists so the user gets immediate feedback without a round
trip; the server copy exists because the client can be bypassed entirely. Sharing one schema module is
what stops the two from disagreeing, and inferring the TypeScript type from it removes a third copy.

**Q: How do you decide when to show a validation error?**

Not while the user is first typing a field — every partial value is invalid, so live errors read as
nagging. Validate on blur, then switch that field to live validation so corrections are confirmed
immediately. On submit, show everything and move focus to the first error.

**Q: A user is halfway through editing a record and a background refetch returns new server data. What do you do?**

Do not overwrite the fields they have touched. Compare the incoming data with the dirty field set: merge
untouched fields silently, and for touched ones either leave them alone or surface a conflict the user
can resolve. Resetting the whole form is the common bug and it destroys their work.

## What to Read Next

- [Chapter ?? — Actions and Forms](#ch-react-actions-and-forms) — the submit half, with pending state and progressive enhancement
- [Chapter ?? — Input Validation](#ch-backend-input-validation) — why the server copy is not negotiable
- [Chapter ?? — URL as State](#ch-url-as-state) — the other category that survives a refresh
