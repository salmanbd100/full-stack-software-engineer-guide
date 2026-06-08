# Docker - Interview Preparation

Docker is the industry standard for containerization. This guide covers fundamentals through production deployment, focused on senior DevOps interview preparation.

## Table of Contents

1. [Docker Fundamentals](./01-docker-fundamentals.md) — architecture, images, essential commands
2. [Dockerfile Best Practices](./02-dockerfile-best-practices.md) — multi-stage builds, caching, security
3. [Docker Compose](./03-docker-compose-advanced.md) — multi-container apps, networking, volumes
4. [Docker Networking](./04-docker-networking-deep-dive.md) — network drivers, DNS, service discovery
5. [Docker Volumes & Storage](./05-docker-volumes-storage.md) — volume types, persistence, backup
6. [Docker Security](./06-docker-security.md) — non-root users, secrets, capabilities, scanning
7. [Docker in Production](./07-docker-in-production.md) — health checks, resources, deployment strategies
8. [Docker with AWS](./08-docker-with-aws.md) — ECR, ECS, Fargate, CI/CD pipelines
9. [Docker Troubleshooting](./09-docker-troubleshooting.md) — exit codes, debugging, common fixes

## Top 10 Interview Questions

1. Docker vs VMs — what's the architectural difference?
2. Explain Docker architecture (daemon, client, registry, image layers)
3. COPY vs ADD in Dockerfile
4. How do you reduce Docker image size?
5. What are multi-stage builds and why use them?
6. Default bridge vs custom bridge network
7. Named volumes vs bind mounts — when to use each?
8. How do you handle secrets in Docker?
9. CMD vs ENTRYPOINT — how and when to combine them
10. How do you debug a container that exits immediately?

## Study Path

**Start here →** [Docker Fundamentals](./01-docker-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01–03: fundamentals, Dockerfile, Compose | 4–6 hours |
| Intermediate | 04–06: networking, volumes, security | 4–6 hours |
| Production | 07–09: production patterns, AWS, troubleshooting | 4–6 hours |

---
[← DevOps](../README.md)
