---
title: React
part: 3
chapter: 0
slug: modern-stack-react-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [react, hooks, rsc, suspense, actions, react-compiler]
in_book: true
---

# React

Twelve chapters, in three movements. Chapters 01–04 are the model: what React actually does when state
changes, and why most hook bugs are closure bugs wearing a hat. Chapters 05–08 are the concurrent era —
Server Components, Suspense, transitions and Actions — which is where the 2026–27 senior interview
lives. Chapters 09–12 are what production asks for once the feature works: performance under the React
Compiler, failure handling, types at scale, and tests that survive a refactor.

The section is written against **React 19**. Where a rule is older than that and will outlive it — keys
identify, effects synchronise, props flow down — the chapter says so, because those are the parts a
framework change cannot take away.

## Chapters

| #  | Chapter                                | What it answers                                                    |
| -- | -------------------------------------- | ------------------------------------------------------------------ |
| 01 | [The React Mental Model](./01-react-mental-model.md) | What happens between `setState` and the screen, and why keys matter |
| 02 | [Hooks in Depth](./02-hooks-in-depth.md) | Why the rules exist, and what a stale closure really captures       |
| 03 | [`useEffect` and When Not to Use It](./03-when-not-to-use-effect.md) | Which of these effects should have been derived state? |
| 04 | [Component Composition Patterns](./04-composition-patterns.md) | How do you give an API away without giving control away? |
| 05 | [Server Components and Client Components](./05-server-and-client-components.md) | Where is the boundary, and what is allowed to cross it? |
| 06 | [Suspense and Streaming](./06-suspense-and-streaming.md) | How does half a page arrive, and why did hydration mismatch?       |
| 07 | [Transitions and Concurrency](./07-transitions-and-concurrency.md) | Which updates are urgent, and who decides?               |
| 08 | [Actions and Forms](./08-actions-and-forms.md) | How does a mutation work without a client-side fetch handler?      |
| 09 | Performance and the React Compiler     | What does the compiler memoise, and what is still yours?           |
| 10 | Error boundaries and resilience        | What does the user see when a subtree throws?                      |
| 11 | React and TypeScript at scale          | How do you type props, refs, context and state without `any`?      |
| 12 | Testing React                          | What do you test when the component runs on the server?            |

> ⚠️ **Being written.** Chapters 01–08 are written (#33, #34). Improvement #35 fills 09–12; those titles
> link as each chapter lands. Chapter 11 absorbs the existing
> `Frontend/TypeScript/08-react-typescript.md`, which moves here rather than being copied.

## What Interviewers Probe For

Two React-specific questions, on top of the part-level signals in the Part III opener:

- **"Why is this component re-rendering?"** The weak answer reaches for `memo`. The strong one names the
  state that changed and the prop identity that broke — and, under the React Compiler, questions whether
  memoisation was ever the developer's job. This single question separates people who have profiled a
  React application from people who have read about profiling one.
- **"Why can't you pass that function to a Client Component?"** Props crossing the server/client boundary
  are serialised into the RSC payload, and a function has no serialised form. A candidate who can say
  that, and then reach for a Server Action as the exception, has understood the boundary rather than
  memorised the error message.

## Reading Order

01 → 04 in order; each builds on the one before. Chapter 03 is the one to read twice — unnecessary
effects are the most common senior red flag in a code review round, and the fix is usually deletion.

05 → 08 also read in order and assume 01–04. If time is short, 05 is non-negotiable and 08 is close
behind. Chapters 09–12 are independent and can be read in any order once 05 is done.

**Interview sprint:** 01 → 03 → 05 → 08 → 09.
