---
title: Part VIII — Containers
part: 8
chapter: 0
slug: ship-containers-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-29
tags: [docker, containers, dockerfile, kubernetes, deployment]
in_book: true
---

# Part VIII — Containers

A container is the unit your application ships in, so the questions here are about packaging and about
what happens to that package once something else runs it. You are not being asked to operate a cluster.
You are being asked whether you can build an image that starts fast, stays small, runs as something other
than root, and behaves the same on a laptop as it does in the pipeline — and whether you know what your
service owes the thing that schedules it.

Four chapters, in dependency order. Three are Docker, where you do the work. The fourth is the smallest
useful amount of Kubernetes: enough to reason about where your container ended up, why it restarted, and
what your pod spec has to promise for a rollout to be safe.

> ⚠️ Kubernetes *operations* — cluster networking, autoscaling, RBAC, Helm, node pools — is a platform
> engineering career and is deliberately out of scope. See `BOOK-SPEC.md` § 6. The material is still in
> `Archive/devops/kubernetes/` if you need it.

## Chapters

| #  | Chapter                                                                   | What it answers                                                |
| -- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Docker Fundamentals](./01-docker-fundamentals.md)                        | What is a container really, and why did this one exit?         |
| 02 | [Building and Hardening Images](./02-building-and-hardening-images.md)    | How do you get a small image that rebuilds fast and is not root? |
| 03 | [Docker Compose](./03-docker-compose.md)                                  | How do you run the whole stack locally without a cluster?      |
| 04 | [Kubernetes Essentials](./04-kubernetes-essentials.md)                    | What does a rolling update do to your in-flight requests?      |

## What Interviewers Probe For

The senior signal for this part is **owns the change all the way to production, including the way back.**
For containers, three things carry the weight:

- **Do you understand layer caching?** "Your image takes nine minutes to build and the only change was one
  line of application code." The answer is about `COPY` ordering, and it separates people who have tuned a
  pipeline from people who have copied a Dockerfile.
- **Can you say what isolation buys and what it does not?** Containers share the host kernel. Running as
  root inside one is not safe. That single fact shapes every base image, capability and probe decision you
  make.
- **Can you debug without logging in?** Distroless images have no shell. Exit code 137 means the kernel
  killed the process for memory. `CrashLoopBackOff` is a symptom, not a cause. Knowing where to look when
  you cannot get a prompt is the practical test.

## Reading Order

01 → 02 → 03 in order. Chapter 02 assumes 01, because image hygiene only makes sense once you know what a
layer is. Chapter 04 stands alone and is worth reading whether or not you touch Kubernetes — the probe,
resource and shutdown decisions in it are the same ones every container platform asks you to make.

**Interview sprint:** 01 → 02, then chapter 04's probes and shutdown sections. That covers the container
round almost completely. Read 03 if the role mentions local developer experience.
