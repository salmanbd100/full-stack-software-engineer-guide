---
title: Object-Oriented Programming
part: 1
chapter: 0
slug: oop-index
level: intermediate # beginner | intermediate | advanced
reading_time: 1
updated: 2026-08-28
tags: [oop, solid, composition, transitional]
in_book: false
---

# Object-Oriented Programming

> ⚠️ **This directory is transitional.** Improvement #26 merges it into
> [`Backend/DesignPatterns/`](../Backend/DesignPatterns/README.md), which becomes the single
> five-chapter section on OOP and patterns in Part I. `OOP/` stops existing as a top-level directory.
> No part-opener is written for a part that is being dissolved.

Four chapters on encapsulation, inheritance, polymorphism and abstraction is more than the topic
earns in a frontend-heavy book. They collapse into one. The two chapters that carry their weight —
composition versus inheritance, and the applied chapter — survive largely intact.

## Chapters

| #  | Chapter                                                          | Destination                                          |
| -- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| 01 | [OOP Fundamentals](./01-oop-fundamentals.md)                     | merges into one OOP core-concepts chapter            |
| 02 | [Encapsulation](./02-encapsulation.md)                           | merges into one OOP core-concepts chapter            |
| 03 | [Inheritance](./03-inheritance.md)                               | merges into one OOP core-concepts chapter            |
| 04 | [Polymorphism](./04-polymorphism.md)                             | merges into one OOP core-concepts chapter            |
| 05 | [Abstraction](./05-abstraction.md)                               | merges into one OOP core-concepts chapter            |
| 06 | [Composition vs Inheritance](./06-composition-vs-inheritance.md) | keeps its own chapter in `Backend/DesignPatterns/`   |
| 07 | [OOP in Practice](./07-oop-in-real-world.md)                     | folds into the architectural-patterns chapter        |

SOLID is not covered in this directory at all — it lives in
`Backend/DesignPatterns/05-solid-principles.md`, which is another reason the merge is the right
shape: the principles and the patterns they justify end up in the same section.
