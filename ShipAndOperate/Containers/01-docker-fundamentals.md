---
title: Docker Fundamentals
part: 8
chapter: 0
slug: docker-fundamentals
level: beginner # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-29
tags: [devops, docker, containers, fundamentals]
in_book: true
---

# Docker Fundamentals {#ch-docker-fundamentals}

> Explain what a container really is, run and inspect one, and work out why one exited.

**In this chapter:** what the isolation actually is · images, layers and registries · the commands you need daily · exit codes · stopping a container properly

## 💡 The Core Idea

A container is an ordinary process on the host's kernel that has been given a **restricted view of the
machine**. Three kernel features do all the work. Namespaces decide what the process can see — its own
process list, network interfaces, hostname and mount table. Control groups (cgroups) decide how much it
can use — CPU shares, memory, process count. A layered filesystem decides what its root directory looks
like. There is no guest operating system and no hypervisor anywhere in that sentence.

That is why a container starts in milliseconds: nothing boots. It is also why "root inside the
container" is uncomfortably close to "root on the host" — the kernel is shared, and only the view is
private.

An **image** is an ordered stack of read-only layers plus metadata saying which command to run and as
which user. A **container** is that image with one writable layer on top and the kernel restrictions
applied. Delete the container and only the writable layer goes.

> Every surprising thing Docker does follows from those two facts: the layers are cached and shared, and
> the writable layer is disposable.

## How It Works

### Containers Are Not Small Virtual Machines

| | Container | Virtual machine |
| ---------------- | ---------------------------- | ---------------------------- |
| **Boots** | Nothing — a process starts | A full guest kernel and init |
| **Start time** | Milliseconds | Tens of seconds |
| **Size** | Tens to hundreds of MB | Gigabytes |
| **Isolation** | Kernel features, shared kernel | Hardware-level, own kernel |
| **Breaks when** | A kernel exploit escapes | The hypervisor is exploited |

The practical consequence: containers give you **packaging and resource isolation**, not a security
boundary strong enough for hostile code. Running untrusted code needs a virtual machine or a
microVM sandbox, not a container on a shared node.

### Layers, and Why the Build Order Matters

Each instruction in a Dockerfile produces one layer, addressed by the hash of its contents. Identical
layers are stored once and pulled once, however many images use them.

```text
writable layer   ← the container's own; discarded on removal
COPY . .         ← your source
RUN npm ci       ← node_modules
COPY package*    ← the manifest
FROM node:24-alpine  ← the base, shared with every other image using it
```

**The image is a stack of layers; only the top one is writable.**

Because a layer's hash covers every layer beneath it, changing one line of source invalidates that layer
and everything after it — never anything before. That single rule is what makes build caching
predictable, and it is the subject of the next chapter.

### The Vocabulary

| Term | What it is |
| ------------ | -------------------------------------------------------------------- |
| **Image** | Read-only stack of layers plus run metadata |
| **Container** | A running (or stopped) instance of an image, with one writable layer |
| **Registry** | Where images are stored and versioned — Docker Hub, ECR, GHCR |
| **Volume** | Storage that lives outside the writable layer, so it survives removal |
| **Network** | A virtual network; containers on it resolve each other by name |

### Running and Reading a Container

```bash
docker run -d -p 8080:3000 --name api myapp:1.4   # detached, host 8080 → container 3000
docker run -it --rm alpine sh                     # interactive, delete on exit
docker ps -a                                      # every container, with status and exit code
docker stop api                                   # SIGTERM, then SIGKILL after 10 seconds
```

Four commands answer almost every question about a running container:

```bash
docker logs -f --tail 100 api   # what the process wrote to stdout and stderr
docker inspect api              # resolved config: env, mounts, ports, exit code
docker exec -it api sh          # a shell inside the namespaces, if the image has one
docker stats api                # live CPU and memory against the limits
```

> Log to stdout and stderr, never to a file inside the container. The writable layer is disposable, and
> every log collector in every platform reads the container's streams.

### Exit Codes Are the First Diagnosis

```bash
docker inspect api --format='{{.State.ExitCode}} {{.State.OOMKilled}}'
```

| Code | Means | Where to look |
| ----- | -------------------------------- | ------------------------------------- |
| `0` | Clean exit | Normal — or the process was never meant to stay up |
| `1` | The application threw | `docker logs`, first ten lines |
| `125` | Docker rejected the run | The flags, not the image |
| `137` | SIGKILL — usually the OOM killer | Memory limit, or a leak |
| `139` | Segmentation fault | Native module built for the wrong architecture |
| `143` | SIGTERM — a graceful stop | Normal shutdown |

**The order to work in when a container will not stay up:**

```bash
docker logs --tail 50 api                    # 1. the application's own account
docker ps -a                                 # 2. exit code and restart count
docker inspect api                           # 3. did it get the env and mounts you meant?
docker run -it --entrypoint sh myapp:1.4     # 4. explore the image with the app out of the way
```

Step 4 is the one people forget. Overriding the entrypoint gives you the filesystem without the process
that keeps dying.

### Stopping Is a Contract

`docker stop` sends SIGTERM, waits ten seconds, then sends SIGKILL. If your process ignores SIGTERM,
every stop takes the full ten seconds and every in-flight request dies with it.

**The application has to close the server itself:**

```typescript
import { createServer } from "node:http";

const server = createServer(app);
server.listen(3000);

process.on("SIGTERM", () => {
  // Stop accepting connections, let in-flight requests finish, then release the pool
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
});
```

⚠️ Signals only reach your process if it is PID 1. `CMD node server.js` runs through a shell, which
becomes PID 1 and does not forward SIGTERM. Use the array form — `CMD ["node", "server.js"]`.

## When to Use It

| Situation | Reach for | Why |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Local Postgres, Redis, a message broker | Compose | Same versions as production, deleted with one command |
| A Node or Python service you deploy yourself | An image in a registry | The artefact is the same everywhere it runs |
| A frontend on a managed platform | Neither | The platform builds and runs it; a Dockerfile adds nothing |
| Running someone else's untrusted code | A microVM sandbox | Shared kernel is not a boundary you can bet on |

The honest answer for a frontend-heavy stack: you containerise the **backend and the dependencies**, and
you read Dockerfiles far more often than you write them.

## Common Mistakes

❌ **Tagging with `latest`.** Two machines pull `latest` a week apart and get different images, and the
one that broke is unreproducible. ✅ Tag with the commit SHA, and let `latest` be an alias nobody deploys.

❌ **Keeping data in the writable layer.** Uploads and database files vanish the moment the container is
replaced, which is every deploy. ✅ Mount a volume, or use a managed service.

❌ **Fixing a container with `docker exec`.** The change lives in one writable layer and is gone at the
next restart, and now nothing describes production. ✅ Change the Dockerfile, rebuild, redeploy.

❌ **Two processes in one container.** An app plus its own nginx means one crash is invisible and neither
can be scaled alone. ✅ One process per container, wired together by Compose or a scheduler.

## 🔑 Key Takeaways

- A container is a process with a restricted view of the machine, sharing the host kernel — packaging and
  resource isolation, not a security boundary.
- An image is a stack of read-only layers; a container adds one writable layer that is thrown away.
- Exit code plus `docker logs` diagnoses most failures, and overriding the entrypoint gets you into an
  image whose process will not stay up.
- `docker stop` sends SIGTERM first, so the process must be PID 1 and must handle it.

## Interview Questions

**Q: What is the difference between an image and a container?**

An image is a read-only stack of layers plus metadata about how to start the process. A container is one
running or stopped instance of that image with a thin writable layer on top. The useful consequence is
that containers are cheap and disposable while images are the versioned artefact — you ship the image,
and you never care about a particular container's filesystem.

**Q: Why is a container not just a lightweight virtual machine?**

Because nothing is virtualised. A virtual machine runs its own kernel on top of a hypervisor; a container
is a normal host process whose visibility is limited by namespaces and whose resource use is capped by
cgroups. That gives millisecond start times and much smaller artefacts, at the cost of a weaker
boundary — a kernel vulnerability is shared by every container on the host, which is why untrusted code
belongs in a virtual machine.

**Q: A container exited with 137. What happened, and what do you check?**

137 is 128 plus 9, so the process was SIGKILLed, and in practice that almost always means the OOM killer.
Confirm with `docker inspect` — `State.OOMKilled` is a boolean — then decide whether the memory limit was
simply too low for the workload or whether the process leaks. `docker stats` during a normal run tells
you which, because a leak shows as memory that climbs and never falls.

**Q: How do you inspect a container that crashes on startup?**

Read `docker logs` first, since the application usually says what it could not find. Then check the exit
code and `docker inspect` for the environment and mounts, because a missing variable or an unmounted
volume produces a confident-looking crash. If the logs are empty, override the entrypoint with
`docker run -it --entrypoint sh` to get a shell in the image without starting the failing process.

**Q: When would you not containerise something?**

When a platform already owns the runtime. Deploying a frontend to a managed platform means the build and
the runtime are defined by the framework, and adding a Dockerfile takes on maintenance — base image
updates, CVE patching, build caching — for no gain. Containers earn their place when you own the process
and need the artefact to be identical in CI, staging and production.

## What to Read Next

- [Chapter ?? — Building and Hardening Images](#ch-building-and-hardening-images) — the Dockerfile that
  builds fast, ships small, and does not run as root
- [Chapter ?? — Docker Compose](#ch-docker-compose) — the same containers wired into a local stack
