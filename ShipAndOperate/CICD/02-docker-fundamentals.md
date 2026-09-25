---
title: "Container Images: Building and Hardening"
part: 8
chapter: 6
slug: docker-fundamentals
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-25
tags: [devops, docker, containers, dockerfile, security, supply-chain, cicd]
in_book: true
---

# Container Images: Building and Hardening {#ch-docker-fundamentals}

> Build the image your pipeline ships so that it rebuilds in seconds, carries nothing it does not need, and runs with no privileges.

**In this chapter:** what an image and a container really are · cache order and multi-stage builds · base image choice · non-root, read-only and build secrets · scanning and exit codes

## 💡 The Core Idea

A container is an ordinary process on the host's kernel with a **restricted view of the machine**.
Namespaces decide what it can see: its own process list, network and mount table. Control groups
(cgroups) decide how much CPU and memory it can use. There is no guest operating system and no
hypervisor. Nothing boots, so a container starts in milliseconds.

An **image** is an ordered stack of read-only layers, plus metadata that says which command to run and as
which user. A **container** is that image with one writable layer on top. Delete the container and only
the writable layer goes. The image is the artefact your pipeline builds, tags and promotes. Containers are
cheap and disposable copies of it.

Every Dockerfile instruction does two jobs at once. It **adds a cache key**, which decides build time. It
**adds content to the artefact**, which decides image size and attack surface. Most Dockerfile skill is
keeping those two jobs straight.

> Layers only add. A file deleted in a later layer is still inside the earlier one, and `docker history`
> shows how it got there.

## How It Works

### Containers Are Not Small Virtual Machines

A virtual machine boots its own kernel; a container shares the host's. So containers give you **packaging
and resource isolation**, not a strong security boundary. Untrusted code belongs in a microVM sandbox.

### Layers, and Why Order Sets Build Time

Each instruction produces one layer, addressed by a hash of its contents. Identical layers are stored once
and pulled once, however many images use them.

**The image is a stack of layers; only the top one is writable:**

```text
writable layer   ← the container's own; discarded on removal
COPY . .         ← your source
RUN pnpm install ← node_modules
COPY package*    ← the manifest
FROM node:24-alpine  ← the base, shared with every other image using it
```

A layer's hash covers every layer beneath it. Change one line of source and that layer, plus everything
after it, rebuilds. Nothing before it does. So order instructions from least to most often changed: copy
the manifest and lockfile alone, install, then copy the source. Reverse those two copies and a one-line
change to a component reinstalls the whole dependency tree.

⚠️ A cache is only reused if the **builder still has the layers**. A fresh CI runner has none, so the
pipeline must import a cache explicitly — see [Chapter ?? — GitHub Actions and Pipeline Security](#ch-github-actions).
Fast local rebuilds and fast pipeline builds are two different problems with two different fixes.

### Multi-Stage Builds Decide What Ships

A build needs a toolchain, dev dependencies and source. A runtime needs none of them. Stages separate the
two, and only the last stage becomes the image.

**Build in one stage, ship only the output from another:**

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./        # changes only when dependencies change
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .                                   # changes on every commit
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

Four details in that file matter more than they look:

- `--from=build` copies **files, not layers**, so none of the build stage's history reaches the result.
- `--chown` during the copy avoids a later `RUN chown -R`, which would duplicate every file in a new layer.
- `USER` comes after the copies. The build needs write access; the runtime does not.
- `CMD` uses the array form. The shell form, `CMD node server.js`, makes a shell PID 1, and that shell
  does not pass SIGTERM on to Node.

Add a `.dockerignore` that lists `node_modules`, `.git` and every local environment file. It is a security
control as much as a size control, because it stops secrets being copied in by `COPY . .`.

### Choosing a Base Image

| Base | Size | Choose when |
| ---------------------------- | ------- | --------------------------------------------- |
| `node:24` | ~1.1 GB | Never in production — a full Debian userland |
| `node:24-slim` | ~200 MB | A native module will not build against musl |
| `node:24-alpine` | ~130 MB | The default for a Node service |
| `gcr.io/distroless/nodejs24` | ~110 MB | Hardening matters more than logging in |

Distroless images ship no shell and no package manager. That removes most of what an attacker reaches for
after getting in. It also removes `docker exec … sh`, so you debug through logs, metrics and a temporary
debug container instead.

**Pin by digest when you need to reproduce a build exactly:**

```dockerfile
FROM node:24-alpine@sha256:9e2f...   # exact bytes, not a pointer someone can move
```

A tag is mutable. `node:24-alpine` is rebuilt often, which is good for security patches and bad for
rebuilding last Tuesday's image. Tag your own images with the commit SHA, never only `latest`.

### Hardening the Runtime

The controls below belong to whatever runs the image: Compose for a local stack, or the orchestrator,
which is usually another team's platform and uses the same settings under different names.

**Take away everything the process does not need:**

```yaml
services:
  api:
    image: api:1.4.2
    user: "1000:1000"            # an escape does not land as root
    read_only: true              # a dropped web shell has nowhere to be written
    tmpfs: [/tmp]                # hand back only what genuinely needs writing
    cap_drop: [ALL]              # drop every Linux capability…
    cap_add: [NET_BIND_SERVICE]  # …then add back only what is needed
    security_opt: [no-new-privileges:true]   # no escalation through a setuid binary
    deploy:
      resources:
        limits: { cpus: "2", memory: 1G, pids: 200 }   # pids stops a fork bomb
```

⚠️ **Never mount the Docker socket into a container you do not fully trust.** `/var/run/docker.sock` is the
whole Docker API. A process holding it can start a privileged container that mounts the host filesystem.

### Secrets Never Belong in a Layer

`ARG` and `ENV` values are stored in the image metadata, and `docker history` shows them. When a build
really needs a credential — for example, to upload source maps — mount it for one instruction only.

**Mount the secret for one `RUN`, then pass it at build time:**

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=sourcemap_token,env=SENTRY_AUTH_TOKEN \
    pnpm build
```

```bash
docker build --secret id=sourcemap_token,env=SENTRY_AUTH_TOKEN -t api:1.4.2 .
```

The value is visible to that one `RUN` and lands in no layer. Runtime secrets are a different problem.
Inject them from a secret store when the container starts, so rotating one does not mean rebuilding.

### Scan, and Keep Scanning

New vulnerabilities are published against images you shipped last month. So scanning is a scheduled job
as well as a build gate.

**Fail the pipeline on high and critical findings:**

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 api:1.4.2
```

Run it before the push, and again on a schedule against what is deployed. Also generate a software bill
of materials (SBOM) with `docker buildx build --sbom=true`. Then, when the next widely exploited library
lands, "are we affected?" is a query, not a rebuild.

### When a Container Will Not Stay Up

The exit code is the first diagnosis.

**Read the exit code and the out-of-memory flag:**

```bash
docker inspect api --format='{{.State.ExitCode}} {{.State.OOMKilled}}'
```

| Code | Means | Where to look |
| ----- | -------------------------------- | ------------------------------------------------ |
| `1` | The application threw | `docker logs`, first ten lines |
| `137` | SIGKILL — usually the OOM killer | The memory limit, or a leak |
| `139` | Segmentation fault | A native module built for the wrong architecture |

Then read `docker logs`, and check `docker inspect` for the environment and mounts. If the logs are empty,
`docker run -it --entrypoint sh <image>` gives you the filesystem without the process that keeps dying.

## When to Use It

| Situation | Do this | Why |
| ------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| A Node service you deploy yourself | A multi-stage image in a registry, SHA-tagged | The same artefact runs in CI, staging and production |
| A frontend on a managed platform | No Dockerfile | The platform builds and runs it; a Dockerfile adds upkeep |
| A reproducible build for an audit | Pin the base by digest, commit the lockfile | Tags move; digests do not |
| A credential needed at build time | A BuildKit secret mount, never `ARG` | `ARG` is readable in `docker history` |
| Running someone else's untrusted code | A microVM sandbox | A shared kernel is not a boundary to bet on |

## Common Mistakes

❌ **`COPY . .` above the install.** Every commit invalidates the dependency layer and the build takes
minutes. ✅ Manifest and lockfile first, install, then source.

❌ **`ARG NPM_TOKEN` for a private registry.** It stays readable in `docker history` for the life of the
image. ✅ Mount it as a BuildKit secret.

❌ **Running as root because "it is only a container".** The kernel is shared, so root inside is one bug
away from root outside. ✅ `USER node`, plus `read_only` with a `tmpfs` where writes are needed.

❌ **Deploying `latest`.** Two machines pull it a week apart and get different images. ✅ Tag with the
commit SHA, and promote that exact tag through each environment.

❌ **Scanning once, at build time.** The image was clean when it shipped; the advisory landed on Thursday.
✅ Scan the deployed set on a schedule and keep an SBOM you can query.

## 🔑 Key Takeaways

- A container is a host process with a restricted view of the machine, so it gives packaging and resource
  isolation but not a strong security boundary.
- An image is a stack of read-only layers and is the artefact the pipeline ships; containers are
  disposable copies of it.
- Instruction order sets build time, and the content of the final stage sets image size and attack surface.
- Layers only add, so a build secret must be mounted for one instruction rather than copied in and deleted.
- A non-root user, a read-only filesystem, dropped capabilities and scheduled scanning cover most of what an
  image audit asks about.

## Interview Questions

**Q: What is the difference between an image and a container, and why is a container not a small virtual machine?**

An image is a read-only stack of layers plus metadata about how to start the process. A container is one
instance of it with a thin writable layer on top. Nothing is virtualised: the container is a host process
limited by namespaces and cgroups, so it starts in milliseconds. The cost is a shared kernel, which is why
untrusted code belongs in a virtual machine.

**Q: An image takes nine minutes to build and the only change was one line of application code. What is wrong?**

The source is copied above the dependency install, so any code change invalidates the `node_modules` layer.
Copy the manifest and lockfile first, install, then copy the source. On CI there is a second half: a fresh
runner has no layer cache, so the pipeline must import one from a registry or a cache backend.

**Q: Why can't you pass a build secret with `ARG`?**

`ARG` values are recorded in the image's build metadata, and anyone who can pull the image can read them
with `docker history`. Deleting the file in a later layer does not help, because layers only add. A
BuildKit secret mount gives the value to the one `RUN` that needs it and writes it into no layer.

**Q: Would you use a distroless base image?**

For a service where the security review matters, yes. No shell and no package manager removes most
post-exploitation tooling and a chunk of the CVE surface. The cost is debuggability: you cannot exec into a
shell that does not exist. If the team's only debugging technique is logging into the container, distroless
will hurt before it helps.

**Q: A container exited with 137. What happened, and what do you check?**

137 is 128 plus 9, so the process was SIGKILLed — in practice, almost always by the OOM killer. Confirm with
`State.OOMKilled` in `docker inspect`. Then decide whether the limit is too low or the process leaks:
`docker stats` during a normal run shows memory that climbs and never falls if it leaks.

**Q: How would you find out whether a newly announced vulnerability affects you?**

By generating an SBOM at build time and storing it with the image, so the question is a query across what
is deployed. Scheduled scanning of running images covers the same risk from the other side. An image that
passed its build-time scan can become vulnerable later without changing at all.

## What to Read Next

- [Chapter ?? — GitHub Actions and Pipeline Security](#ch-github-actions) — building, caching, scanning and
  signing this image in the pipeline
- [Chapter ?? — Deployment Strategies, Rollback and Feature Flags](#ch-deployment-strategies) — promoting the SHA-tagged
  image safely, and rolling it back
