---
title: Part VIII — Containers
part: 8
chapter: 0
slug: ship-containers-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [docker, containers, dockerfile, kubernetes, deployment]
in_book: true
---

# Part VIII — Containers

A container is the unit your application ships in, so the questions here are about packaging and
about what happens to that package once someone else runs it. You are not being asked to operate a
cluster. You are being asked whether you can build an image that starts fast, stays small, runs as
something other than root, and behaves the same on a laptop as it does in the pipeline.

The section is two unequal halves. Chapters 01–05 are Docker, where you do the work. Chapters 06–07
are the smallest useful amount of Kubernetes: enough to reason about where your container ends up
and why it restarted, and no further.

> ⚠️ Kubernetes *operations* — Helm charts, RBAC, autoscaling, cluster networking — is a platform
> engineering career and is deliberately out of scope. See `BOOK-SPEC.md` § 6. The material still
> exists in `Archive/devops/kubernetes/` if you need it.

## Chapters

| #  | Chapter                                                                    | What it answers                                              |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Docker Fundamentals](./01-docker-fundamentals.md)                         | What is an image, a layer, and a container really?           |
| 02 | [Dockerfile Best Practices](./02-dockerfile-best-practices.md)             | How do you get a small image that rebuilds fast?             |
| 03 | [Docker Compose](./03-docker-compose-advanced.md)                          | How do you run the whole stack locally without a cluster?    |
| 04 | [Docker Security](./04-docker-security.md)                                 | What does a container actually isolate, and what does it not?|
| 05 | [Docker Troubleshooting](./05-docker-troubleshooting.md)                   | The container exited — how do you find out why?              |
| 06 | [Kubernetes Architecture](./06-kubernetes-architecture.md)                 | What are the moving parts, and which one made this decision? |
| 07 | [Pods and Deployments](./07-pods-and-deployments.md)                       | What does a rolling update do to your running requests?      |

## What Interviewers Probe For

The senior signal for this part is **owns the change all the way to production, including the way
back.** For containers, three things carry the weight:

- **Do you understand layer caching?** "Your image takes nine minutes to build and the only change
  was one line of application code." The answer is about `COPY` ordering and dependency installation
  sitting above source code — and it separates people who have tuned a pipeline from people who have
  copied a Dockerfile.
- **Can you name what isolation buys and what it does not?** Containers share the host kernel.
  Running as root inside one is not the same as being safe. Knowing that shapes every base-image and
  capability decision you make.
- **Can you debug without a shell?** Distroless images have no `bash`. Exit code 137 means the kernel
  killed the process for memory. Knowing where to look when you cannot log in is the practical test.

## Reading Order

01 → 02 → 03 in order; the rest can be read as needed. Chapter 04 assumes 02, because most container
security is decided in the Dockerfile.

**Interview sprint:** 01 → 02 → 05. Fundamentals, image hygiene, and debugging cover the container
round almost completely. Read 06–07 only if the role mentions Kubernetes.
