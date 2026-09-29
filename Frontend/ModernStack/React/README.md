---
title: React
part: 3
chapter: 1
slug: modern-stack-react-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [react, hooks, rsc, suspense, actions, react-compiler]
in_book: true
---

# React

Nine chapters, in three groups. Chapters 01–04 are the model: what React does when state changes, and
why most hook bugs are really closure bugs. Chapters 05–07 cover the concurrent era: Server Components,
Suspense and Actions. That is where the 2026–27 senior interview lives. Chapters 08–09 cover what
production needs once the feature works: performance under the React Compiler, and types at scale.
Testing React components lives in Part IV, with the rest of testing.

The section is written against **React 19**. Some rules are older than React 19 and will outlive it:
keys identify, effects synchronise, props flow down. The chapter says so when it meets one, because a
framework change cannot take those away.

## Chapters

| #  | Chapter                                | What it answers                                                    |
| -- | -------------------------------------- | ------------------------------------------------------------------ |
| 01 | [The React Mental Model](#ch-react-mental-model) | What happens between `setState` and the screen, and why keys matter |
| 02 | [Hooks in Depth](#ch-react-hooks-in-depth) | Why the rules exist, and what a stale closure really captures       |
| 03 | [`useEffect` and When Not to Use It](#ch-when-not-to-use-effect) | Which of these effects should have been derived state? |
| 04 | [Component Composition Patterns](#ch-react-composition-patterns) | How do you give an API away without giving control away? |
| 05 | [Server Components and Client Components](#ch-server-components-vs-client-components) | Where is the boundary, and what is allowed to cross it? |
| 06 | [Suspense, Streaming and Error Boundaries](#ch-suspense-and-streaming) | How does half a page arrive, and what does the user see when a subtree throws? |
| 07 | [Actions and Forms](#ch-react-actions-and-forms) | How does a mutation work without a client-side fetch handler?      |
| 08 | [Performance, Transitions and the Compiler](#ch-react-performance-and-the-compiler) | Do less work or schedule it — which does this slowdown need? |
| 09 | [React and TypeScript at Scale](#ch-react-typescript-at-scale) | How do you type props, refs, context and state without `any`? |

Chapter 09 is where `Frontend/TypeScript`'s React chapter now lives. It moved here rather than being
copied. It also gained the parts that only matter at scale: unions for async state, generic components,
and the typing rules the server/client boundary sets.

## What Interviewers Probe For

Two React-specific questions, on top of the part-level signals in the Part III opener:

- **"Why is this component re-rendering?"** The weak answer reaches for `memo`. The strong one names the
  state that changed and the prop identity that broke. Under the React Compiler, it also asks whether
  memoisation was ever the developer's job. This one question separates people who have profiled a
  React application from people who have only read about profiling one.
- **"Why can't you pass that function to a Client Component?"** Props that cross the server/client
  boundary are serialised into the RSC payload, and a function has no serialised form. A candidate who
  says that, then names a Server Action as the exception, has understood the boundary. They have not
  just memorised the error message.

## Reading Order

Read 01 → 04 in order, because each builds on the one before. Read Chapter 03 twice. Unnecessary effects
are the most common senior red flag in a code review round, and the fix is usually to delete them.

05 → 07 also read in order and assume 01–04. If time is short, 05 is non-negotiable and 07 is close
behind. Chapters 08 and 09 are independent and can be read in either order once 05 is done.

**Interview sprint:** 01 → 03 → 05 → 07 → 08.
