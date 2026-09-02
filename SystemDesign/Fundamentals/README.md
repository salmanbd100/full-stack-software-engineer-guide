---
title: Part VI — System Design Fundamentals
part: 6
chapter: 0
slug: part-system-design-fundamentals
level: intermediate
reading_time: 2
updated: 2026-09-02
tags: [system-design, scalability, cap, consistency, estimation]
in_book: true
---

# Part VI — System Design Fundamentals

Everything else in Part VI assumes this section. These are the ideas a design round keeps returning to
whatever you are asked to build: how to run the forty-five minutes, how to size a system in your head,
what scaling costs, what availability buys, where the time goes, and what you give up when copies of
your data disagree.

Chapter 01 is the one to read twice. A design round is a performance as much as a technical exercise,
and the framework in it is what stops a strong engineer from rambling.

## Chapters

| #  | Chapter                                                        | What it answers                                              |
| -- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Driving the Design Round](./01-driving-the-round.md)          | How do you run the forty-five minutes?                        |
| 02 | [Back-of-Envelope Estimation](./02-estimation.md)              | How big is this, roughly, before anyone builds it?            |
| 03 | [Scalability](./03-scalability.md)                             | Which lever does this bottleneck actually call for?           |
| 04 | [Reliability and Availability](./04-reliability.md)            | What does "three nines" cost, and what does it buy?           |
| 05 | [Latency and Throughput](./05-latency-and-throughput.md)       | Which one are you optimising, and where does the time go?     |
| 06 | [Consistency and CAP](./06-consistency-and-cap.md)             | Which read may be stale, and what happens if it is?           |

## What Interviewers Probe For

The senior signal for Part VI is **drives the round — clarifies requirements, states assumptions,
defends tradeoffs.** Fundamentals is where three of those four are decided:

- **Do you clarify before designing?** The strongest signal available in the first five minutes.
  Read/write ratio, scale, latency budget, consistency requirement. A candidate who starts drawing
  immediately has already lost points that are hard to win back.
- **Can you estimate out loud?** Not precisely — plausibly, and showing the arithmetic. "A million
  daily users, ten actions each, so roughly a hundred writes a second average and three hundred at
  peak" is worth more than a correct number with no working.
- **Do you name the tradeoff, or just the choice?** Every answer in a design round is a trade. Saying
  what you gave up is what separates a senior answer from a confident one.
- **Is CAP a slogan or a tool?** "CP or AP" recited from memory reads badly. Applying it to the
  system on the whiteboard, per feature, reads well.

## Reading Order

01 and 02 are the interview mechanics and are worth revisiting the day before a round. 03 → 04 → 05
build the vocabulary for the optimisation step. 06 is the hardest and the most examined; read it in
one sitting.

**Interview sprint:** 01 → 02 first, then 03 and 06.
