---
title: Archive — Foundations
part: 0
chapter: 0
slug: archive-foundations-index
level: intermediate # beginner | intermediate | advanced
reading_time: 1
updated: 2026-08-29
tags: [archive, oop, patterns]
in_book: false
---

# Archive — Foundations

> Archived by improvement **#26**, which merged `OOP/` and `Backend/DesignPatterns/` into a single
> five-chapter section on OOP and patterns in Part I.

Nothing here is wrong. It is the long version of material the book now covers in a fifth of the space,
kept because a reader who wants the full Gang of Four catalogue or a chapter-per-pillar treatment of
OOP should still be able to find it.

| Directory   | Was                          | Where it went                                                     |
| ----------- | ---------------------------- | ----------------------------------------------------------------- |
| `oop/`      | `OOP/` — 7 chapters + README | Chapters 01–05 became one core-concepts chapter; 06 became the composition chapter; 07 folded into architectural patterns |
| `patterns/` | 3 of 5 `DesignPatterns/` chapters | Creational, structural and behavioural condensed into one chapter on the patterns that appear in TypeScript |

What the book kept from `patterns/`: strategy, observer, factory, adapter, decorator and builder, plus
a table mapping the rest to the TypeScript form that replaces them. What it dropped: abstract factory,
prototype, proxy, composite, bridge, command, state, chain of responsibility and template method as
worked examples — nine patterns that are real, and that a frontend-heavy full stack interview does not
ask about by name.
