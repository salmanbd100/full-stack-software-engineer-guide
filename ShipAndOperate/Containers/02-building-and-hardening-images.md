---
title: Building and Hardening Images
part: 8
chapter: 0
slug: building-and-hardening-images
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-29
tags: [devops, docker, dockerfile, security, supply-chain]
in_book: true
---

# Building and Hardening Images {#ch-building-and-hardening-images}

> Write a Dockerfile that rebuilds in seconds, ships nothing it does not need, and runs as a user with no privileges.

**In this chapter:** cache order · multi-stage builds · base image choice · non-root and read-only · build-time secrets · scanning in the pipeline

## 💡 The Core Idea

Every instruction in a Dockerfile does two things at once: it **contributes a cache key** and it **adds
content to the artefact you ship**. Almost all Dockerfile skill is keeping those two straight.

The cache key covers the instruction and every layer beneath it, so instruction order decides your build
time — put the thing that changes on every commit last and the expensive step above it stays cached. The
content decides your image size and your attack surface: whatever sits in the final stage ships, including
the compiler you needed for thirty seconds and the token you thought you had deleted.

> Layers only add. A file deleted in a later layer is still present in the earlier one, and
> `docker history` will show how it got there.

## How It Works

### Order for the Cache

Instructions belong in order of how often they change — least to most.

```dockerfile
FROM node:24-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./     # changes only when dependencies change
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .                                # changes on every commit
RUN pnpm build
```

Copy the manifest and lockfile alone, install, and only then copy the source. Reverse those two and a
one-line change to a component reinstalls the entire dependency tree.

⚠️ A cache is only reused if the **builder still has the layers**. A fresh CI runner has none, so pipeline
caching is a separate, explicit import — see [Chapter ?? — GitHub Actions](#ch-github-actions). Fast local
rebuilds and fast pipeline builds are two different problems with two different fixes.

### Multi-Stage Builds Decide What Ships

A build needs a toolchain, dev dependencies and source. A runtime needs none of them. Stages separate the
two, and only the last stage becomes the image.

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod        # drop dev dependencies from node_modules

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node                                  # the official image already provides this user
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Three details in that file matter more than they look:

- `--from=build` copies **files, not layers**, so none of the build stage's history reaches the result.
- `--chown` during the copy avoids a later `RUN chown -R`, which would duplicate every file in a new layer.
- `USER` comes after the copies, because the build needs write access and the runtime does not.

### Choosing a Base Image

| Base | Size | Choose when |
| ---------------------------- | ------- | ------------------------------------------------- |
| `node:24` | ~1.1 GB | Never in production — a full Debian userland |
| `node:24-slim` | ~200 MB | A native module will not build against musl |
| `node:24-alpine` | ~130 MB | Default choice for a Node service |
| `gcr.io/distroless/nodejs24` | ~110 MB | Hardening matters more than being able to log in |

Distroless images ship no shell and no package manager, which removes most of what an attacker reaches for
after getting in — and removes `docker exec … sh` as well. Take that trade knowingly: you debug distroless
containers through logs, metrics and an ephemeral debug container.

**Pin by digest when reproducibility matters:**

```dockerfile
FROM node:24-alpine@sha256:9e2f...   # exact bytes, not a pointer someone can move
```

A tag is mutable. `node:24-alpine` is rebuilt regularly, which is what you want for security patches and
not what you want for reproducing last Tuesday's build.

### Hardening the Runtime

The Dockerfile controls the image. These controls belong to whatever runs it — Compose locally, a pod spec
in a cluster, a task definition on a managed platform.

```yaml
services:
  api:
    image: api:1.4.2
    user: "1000:1000"
    read_only: true              # the writable layer becomes read-only
    tmpfs: [/tmp]                # hand back only what genuinely needs writing
    cap_drop: [ALL]              # drop every Linux capability…
    cap_add: [NET_BIND_SERVICE]  # …then add back only what is needed
    security_opt: [no-new-privileges:true]
    deploy:
      resources:
        limits: { cpus: "2", memory: 1G, pids: 200 }
```

| Control | Stops |
| ---------------------- | ------------------------------------------------------------- |
| Non-root user | An escape landing as root on a shared kernel |
| `read_only` + `tmpfs` | A dropped web shell being written anywhere it can be executed |
| `cap_drop: ALL` | Raw sockets, mounting filesystems, changing the clock |
| `no-new-privileges` | Escalation through a setuid binary |
| `pids` limit | A fork bomb taking the whole host with it |

⚠️ **Never mount the Docker socket into a container you do not fully trust.** `/var/run/docker.sock` is the
entire Docker API, so a process holding it can start a privileged container that mounts the host
filesystem. It is root on the host with extra steps.

### Secrets Never Belong in a Layer

`ARG` and `ENV` values are recorded in image metadata and readable with `docker history`. When a build
genuinely needs a credential — uploading source maps, pulling a private package — mount it for the life of
one instruction:

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=sourcemap_token,env=SENTRY_AUTH_TOKEN \
    pnpm build
```

```bash
docker build --secret id=sourcemap_token,env=SENTRY_AUTH_TOKEN -t api:1.4.2 .
```

The value is visible to that one `RUN` and lands in no layer. Runtime secrets are a different problem with
a different answer: inject them from a secret store when the container starts, so rotating one does not
mean rebuilding an image.

### Scan, and Keep Scanning

Vulnerabilities are published against images you shipped last month, so scanning is a scheduled job as
well as a build gate.

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 api:1.4.2
```

Run it in the pipeline before the push, and again on a schedule against what is actually deployed. Pair it
with a generated software bill of materials — `docker buildx build --sbom=true` — so that when the next
widely-exploited library lands, "are we affected?" is a query rather than a rebuild.

### Keeping the Image Small, Measurably

```bash
docker history api:1.4.2          # per-layer sizes; find the one that surprised you
docker build --progress=plain .   # which step is actually slow
```

Two files do most of the size work. A multi-stage build keeps the toolchain out of the result, and a
`.dockerignore` keeps junk out of the build context:

```text
node_modules
.git
.env*
dist
coverage
*.log
```

**A `.dockerignore` is a security control as much as a size control** — it is what stops a local
environment file being copied in by a wildcard.

## When to Use It

| Requirement | Do this |
| ------------------------------------ | -------------------------------------------------- |
| Fastest possible local rebuild | Manifest and lockfile copied above the source |
| Smallest artefact and attack surface | Multi-stage into distroless, non-root |
| A reproducible build for an audit | Pin the base by digest, commit the lockfile |
| A native module that fails on Alpine | `-slim` rather than the full image |
| A credential needed at build time | A BuildKit secret mount, never `ARG` |

## Common Mistakes

❌ **`COPY . .` above the install.** Every commit invalidates the dependency layer and the build takes
minutes. ✅ Manifest and lockfile first, install, then source.

❌ **`ARG NPM_TOKEN` for a private registry.** It stays readable in `docker history` for the life of the
image. ✅ Mount it as a BuildKit secret.

❌ **Running as root because "it is only a container".** The kernel is shared, so root inside is one bug
away from root outside. ✅ `USER node`, plus `read_only` with a `tmpfs` where writes are needed.

❌ **Shell-form `CMD node server.js`.** A shell becomes PID 1 and swallows SIGTERM, so every stop takes the
full grace period and drops in-flight requests. ✅ Use the array form.

❌ **Scanning once, at build time.** The image was clean when it shipped and the advisory landed on
Thursday. ✅ Scan the deployed set on a schedule and keep an SBOM you can query.

## 🔑 Key Takeaways

- Instruction order sets build time; final-stage content sets image size and attack surface.
- Layers only add, so a secret must be mounted for one instruction rather than copied and deleted.
- Multi-stage, a non-root user, and `read_only` cover most of what an image audit asks about.
- Pin by digest for reproducibility and by tag for automatic patches — know which one you chose and why.

## Interview Questions

**Q: An image takes nine minutes to build and the only change was one line of application code. What is wrong?**

The source is being copied above the dependency install, so any code change invalidates the layer holding
`node_modules` and the install runs from scratch. Copy the manifest and lockfile first, install, then copy
the source, and that layer survives every commit that does not change dependencies. There is a second half
on CI: a fresh runner has no local layer cache at all, so the pipeline has to import one explicitly from a
registry or a build cache backend.

**Q: Why can't you pass a build secret with `ARG`?**

Because `ARG` values are recorded in the image's build metadata and anyone who can pull the image can read
them with `docker history`. Deleting the file in a later layer does not help, since layers are additive and
the earlier one still contains it. A BuildKit secret mount makes the value available to the single `RUN`
that needs it and writes it into no layer.

**Q: What does a container actually isolate, and what does it not?**

It isolates what the process can see and how much it can use — process table, network stack, mount
namespace, and CPU and memory through cgroups. It does not isolate the kernel, which is shared with every
other container on the host. So a container protects you from a noisy neighbour and from filesystem
collisions, and not from a kernel exploit. That is the reasoning behind non-root users, dropped
capabilities and `no-new-privileges`: each one shrinks what a compromised process can reach before it gets
near that shared kernel.

**Q: Would you use a distroless base image?**

For a service where the security review matters, yes — no shell and no package manager removes most
post-exploitation tooling and a chunk of the CVE surface. The cost is debuggability: you cannot exec into a
shell that does not exist, so the team needs logs, metrics and traces already in place, plus a way to
attach an ephemeral debug container. If a team's only production debugging technique is logging into the
container, distroless will hurt before it helps.

**Q: How would you find out whether a newly announced vulnerability affects you?**

By having generated an SBOM at build time and stored it alongside the image, so the question becomes a
query across what is deployed rather than a rebuild of everything. Scheduled scanning of running images
catches the same class of problem from the other side, because an image that passed its build-time scan can
become vulnerable later without changing at all.

## What to Read Next

- [Chapter ?? — CI/CD Security](#ch-cicd-security) — where scanning, signing and registry credentials sit
  in the pipeline
- [Chapter ?? — Kubernetes Essentials](#ch-kubernetes-essentials) — the same runtime controls as a pod
  spec, plus who decides to restart the container
