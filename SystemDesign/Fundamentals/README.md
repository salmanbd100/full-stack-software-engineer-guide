---
title: Part VI — System Design Fundamentals
part: 6
chapter: 0
slug: part-system-design-fundamentals
level: intermediate
reading_time: 4
updated: 2026-08-28
tags: [system-design, scalability, cap, consistency, estimation]
in_book: true
---

# Part VI — System Design Fundamentals

Everything else in Part VI assumes this section. These are the concepts a design round keeps
returning to no matter what you are asked to build: what scaling actually costs, what availability
actually means, what you give up when the network partitions, and how to size a system in your head
before you draw a single box.

The last chapter is the one to read twice. A design round is a performance as much as a technical
exercise, and the framework in chapter 08 is what stops a strong engineer from rambling for
forty-five minutes.

## Chapters

| #  | Chapter                                                        | What it answers                                              |
| -- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [System Design Basics](./01-basics.md)                         | What are the moving parts, and what is each one for?          |
| 02 | [Scalability](./02-scalability.md)                             | Vertical or horizontal, and when does the choice flip?        |
| 03 | [Reliability and Availability](./03-reliability.md)            | What does "three nines" cost, and what does it buy?           |
| 04 | [Performance Optimization](./04-performance.md)                | Latency or throughput — which are you actually optimising?    |
| 05 | [CAP Theorem](./05-cap-theorem.md)                             | What do you give up when the network splits?                  |
| 06 | [Consistency Models](./06-consistency.md)                      | Which weaker guarantee is good enough here?                   |
| 07 | [Back-of-Envelope Calculations](./07-calculations.md)          | How big is this, roughly, before anyone builds it?            |
| 08 | [System Design Interview Framework](./08-framework.md)         | How do you drive the forty-five minutes?                      |

## What Interviewers Probe For

The senior signal for Part VI is **drives the round — clarifies requirements, states assumptions,
defends tradeoffs.** Fundamentals is where three of those four are decided:

- **Do you clarify before designing?** The single strongest signal available in the first five
  minutes. Read/write ratio, scale, latency budget, consistency requirement. A candidate who starts
  drawing immediately has already lost points that are hard to win back.
- **Can you estimate out loud?** Not precisely — plausibly, and showing the arithmetic. "A million
  daily users, ten actions each, so a hundred and fifteen writes a second average, call it a thousand
  at peak" is worth more than a correct number with no working.
- **Do you name the tradeoff, or just the choice?** Every answer in a design round is a trade. Saying
  what you gave up is what separates a senior answer from a confident one.
- **Is CAP a slogan or a tool?** "CP or AP" recited from memory reads badly. Applying it to the
  specific system on the whiteboard reads well.

## Reading Order

01 → 02 → 03 → 04 build the vocabulary. 05 and 06 belong together and are best read in one sitting.
07 and 08 are the interview mechanics and are worth revisiting the day before a round.

**Interview sprint:** 07 → 08 first, then 02 and 06. The framework and the arithmetic are what you
will actually use under time pressure.
