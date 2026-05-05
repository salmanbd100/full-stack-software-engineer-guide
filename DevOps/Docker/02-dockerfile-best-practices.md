# Dockerfile Best Practices

## Choose the Right Base Image

```dockerfile
# ❌ Bad: unpredictable, security risk
FROM node:latest

# ✅ Good: specific version + small image
FROM node:18.17.1-alpine3.18
```

| Variant | Size | Use |
|---------|------|-----|
| `node:18` | ~1GB | Avoid in production |
| `node:18-slim` | ~200MB | When Alpine breaks |
| `node:18-alpine` | ~170MB | ✅ Default choice |
| `distroless/nodejs18` | ~150MB | Minimal attack surface |

## Minimize Layers in RUN

```dockerfile
# ❌ Bad: multiple layers, no cleanup
RUN apt-get update
RUN apt-get install -y curl git

# ✅ Good: single layer, cleanup included
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

## Never Run as Root

```dockerfile
# ❌ Bad: root user by default
FROM node:18-alpine
CMD ["node", "app.js"]

# ✅ Good: create and use non-root user
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
WORKDIR /app
COPY --chown=nodejs:nodejs . .
USER nodejs
CMD ["node", "app.js"]
```

## Layer Caching Strategy

Order instructions from **least to most frequently changing:**

```dockerfile
FROM node:18-alpine
WORKDIR /app

# ✅ Dependencies change rarely — cached until package.json changes
COPY package*.json ./
RUN npm ci --only=production

# Source changes often — put last so cache above stays valid
COPY . .
```

> If you `COPY . .` before installing dependencies, every code change triggers a full `npm install`. Put source copy last.

## CMD vs ENTRYPOINT

```dockerfile
# ✅ Best pattern: ENTRYPOINT + CMD together
ENTRYPOINT ["node"]
CMD ["server.js"]
# docker run myapp           → node server.js
# docker run myapp other.js  → node other.js  (CMD overridden)
```

**Always use exec form** (array syntax), not shell form:
```dockerfile
CMD ["node", "server.js"]  # ✅ PID 1, receives signals correctly
CMD node server.js          # ❌ Runs via /bin/sh — SIGTERM never reaches app
```

## HEALTHCHECK

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

`start_period` gives slow-starting apps time before failed checks count as retries.

## Multi-Stage Builds

Removes build tools from the final image. Reduces size by 10x+.

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (build tools gone)
FROM node:18-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s CMD node healthcheck.js || exit 1
CMD ["node", "dist/server.js"]
```

```bash
# Build for a specific stage
docker build --target builder -t myapp:debug .
docker build --target production -t myapp:prod .
```

## .dockerignore

Always create this file next to your Dockerfile:
```
node_modules
.git
.env
*.log
dist
build
coverage
.DS_Store
```

## Interview Q&A

**Q: How do you reduce Docker image size?**
1. Use Alpine or slim base images
2. Multi-stage builds (removes build tools)
3. Combine `RUN` commands (fewer layers)
4. Clean up in the same `RUN` (`rm -rf /var/lib/apt/lists/*`)
5. Use `.dockerignore` to exclude large directories

**Q: Why not store secrets in ENV or ARG?**
Both are visible in `docker history` and `docker inspect`. Use BuildKit secrets for build time, or Docker Secrets / Vault for runtime.

**Q: What is layer caching?**
Docker caches each layer. If nothing changed, Docker reuses the cached version. Order matters — put slow, stable steps first so fast, frequent changes only invalidate later layers.

**Q: Exec form vs shell form?**
```dockerfile
CMD ["node", "server.js"]   # ✅ Exec form — PID 1, handles SIGTERM
CMD node server.js           # ❌ Shell form — /bin/sh gets SIGTERM, not your app
```

---
[← Docker Fundamentals](./01-docker-fundamentals.md) | [Docker Compose →](./03-docker-compose-advanced.md)
