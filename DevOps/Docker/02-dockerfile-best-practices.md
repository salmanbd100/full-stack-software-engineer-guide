# Dockerfile Best Practices

## Overview

Writing efficient, secure, and maintainable Dockerfiles is crucial for production deployments. This guide covers advanced Dockerfile techniques, optimization strategies, and industry best practices used at scale.

## Table of Contents
- [Dockerfile Instructions Deep Dive](#dockerfile-instructions-deep-dive)
- [Multi-Stage Builds](#multi-stage-builds)
- [Layer Optimization](#layer-optimization)
- [Build Arguments and Secrets](#build-arguments-and-secrets)
- [Security Best Practices](#security-best-practices)
- [Language-Specific Patterns](#language-specific-patterns)
- [Interview Questions](#interview-questions)

## Dockerfile Instructions Deep Dive

### FROM - Base Image Selection

```dockerfile
# ❌ Bad: Using 'latest' tag
FROM node:latest

# ✅ Good: Specific version and variant
FROM node:18.17.1-alpine3.18

# ✅ Better: Multi-stage with specific versions
FROM node:18.17.1-alpine3.18 AS base
FROM node:18.17.1-alpine3.18 AS builder
FROM node:18.17.1-alpine3.18 AS production

# Image size comparison
# node:18 (full) → ~1GB
# node:18-slim → ~200MB
# node:18-alpine → ~170MB
```

**Best Practices:**
- Always use specific version tags, never `latest`
- Prefer Alpine variants for smaller size (use `-alpine`)
- Use `-slim` variants if Alpine compatibility issues arise
- Consider security: Official images from verified publishers

### WORKDIR - Set Working Directory

```dockerfile
# ❌ Bad: Using cd and absolute paths
RUN cd /app
COPY package.json /app/package.json

# ✅ Good: Use WORKDIR
WORKDIR /app
COPY package.json ./

# ✅ Multiple WORKDIR
WORKDIR /app
WORKDIR src
# Now at /app/src
```

**Why WORKDIR Matters:**
- Sets context for RUN, CMD, COPY, ADD instructions
- Creates directory if doesn't exist
- Better than `cd` in RUN commands
- Makes paths relative and cleaner

### COPY vs ADD

```dockerfile
# ✅ Use COPY for simple file copying
COPY package*.json ./
COPY src/ ./src/
COPY --chown=node:node . .

# ⚠️ Use ADD only for special features
ADD app.tar.gz /app/          # Auto-extracts tar
ADD https://example.com/file.txt /app/  # Downloads from URL

# ❌ Don't use ADD for regular copies
ADD package.json ./           # Use COPY instead
```

**COPY Best Practices:**
```dockerfile
# Copy specific files first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code last (changes frequently)
COPY src/ ./src/
COPY public/ ./public/

# Set ownership during copy
COPY --chown=node:node . .

# Copy from previous stage
COPY --from=builder /app/dist ./dist
```

### RUN - Execute Commands

```dockerfile
# ❌ Bad: Multiple layers, no cleanup
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get install -y vim

# ✅ Good: Single layer, with cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        git \
        vim && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ✅ Alpine: Use apk
RUN apk add --no-cache \
        curl \
        git \
        vim

# ✅ Use heredoc syntax (Docker 23+)
RUN <<EOF
apt-get update
apt-get install -y curl git
apt-get clean
rm -rf /var/lib/apt/lists/*
EOF
```

**RUN Command Optimization:**
```dockerfile
# Combine related commands
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Use build cache effectively
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Security: Don't store secrets in layers
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install
```

### ENV - Environment Variables

```dockerfile
# ✅ Good: Set multiple ENV in one layer
ENV NODE_ENV=production \
    APP_PORT=3000 \
    LOG_LEVEL=info \
    PATH="/app/bin:${PATH}"

# Use ENV for build-time and runtime
ENV PYTHON_VERSION=3.11.4
RUN curl -O https://python.org/downloads/${PYTHON_VERSION}

# ❌ Don't store secrets in ENV
ENV API_KEY=secret123  # Visible in image

# ✅ Use build args for build-time only
ARG BUILD_VERSION
ENV VERSION=${BUILD_VERSION}
```

### ARG - Build Arguments

```dockerfile
# Define before FROM to use in FROM
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine

# Define after FROM for build stage
ARG BUILD_ENV=production
ARG BUILD_DATE
ARG GIT_COMMIT

# Use in RUN commands
RUN echo "Building version ${GIT_COMMIT}"

# Pass to ENV for runtime
ENV BUILD_VERSION=${GIT_COMMIT}

# Build with arguments
# docker build --build-arg NODE_VERSION=20 --build-arg GIT_COMMIT=$(git rev-parse HEAD) .
```

### EXPOSE - Document Ports

```dockerfile
# Document ports (doesn't actually publish)
EXPOSE 3000
EXPOSE 443/tcp
EXPOSE 53/udp

# Still need -p flag when running
# docker run -p 8080:3000 myapp
```

### VOLUME - Mount Points

```dockerfile
# Declare volume mount points
VOLUME ["/data"]
VOLUME ["/var/log/app"]

# Anonymous volumes created at runtime
# docker run myapp
# Creates anonymous volume for /data

# Named volumes better for production
# docker run -v mydata:/data myapp
```

### USER - Non-Root User

```dockerfile
# ❌ Bad: Running as root
FROM node:18-alpine
COPY . .
CMD ["node", "server.js"]

# ✅ Good: Create and use non-root user
FROM node:18-alpine

# Create user (Alpine)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create user (Debian/Ubuntu)
RUN groupadd -r nodejs && \
    useradd -r -g nodejs nodejs

# Set ownership
COPY --chown=nodejs:nodejs . .

# Switch to non-root
USER nodejs

CMD ["node", "server.js"]

# ⚠️ Some operations need root
USER root
RUN apt-get update && apt-get install -y package
USER nodejs
```

### CMD vs ENTRYPOINT

```dockerfile
# Pattern 1: CMD only (can be fully overridden)
CMD ["node", "server.js"]
# docker run myapp → node server.js
# docker run myapp npm test → npm test

# Pattern 2: ENTRYPOINT only (fixed executable)
ENTRYPOINT ["node", "server.js"]
# docker run myapp → node server.js
# docker run myapp npm test → ERROR

# Pattern 3: ENTRYPOINT + CMD (best)
ENTRYPOINT ["node"]
CMD ["server.js"]
# docker run myapp → node server.js
# docker run myapp app.js → node app.js

# Pattern 4: Shell form (avoid)
CMD node server.js
# Creates /bin/sh -c "node server.js"
# PID 1 is shell, not node (problematic for signals)

# ✅ Exec form best practice
CMD ["node", "server.js"]
```

**Real-World ENTRYPOINT + CMD:**
```dockerfile
# Python app
ENTRYPOINT ["python"]
CMD ["app.py"]

# Docker image
ENTRYPOINT ["docker"]
CMD ["--help"]

# Script with arguments
COPY entrypoint.sh /
ENTRYPOINT ["/entrypoint.sh"]
CMD ["start"]
```

### HEALTHCHECK - Container Health

```dockerfile
# Basic healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3000/health || exit 1

# Advanced configuration
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=40s \
            --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Custom script
HEALTHCHECK CMD /health-check.sh

# Disable inherited healthcheck
HEALTHCHECK NONE

# Exit codes
# 0: healthy
# 1: unhealthy
```

**Healthcheck Examples:**
```dockerfile
# Node.js with curl
HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/ || exit 1

# Node.js without curl
HEALTHCHECK --interval=30s CMD node healthcheck.js || exit 1

# PostgreSQL
HEALTHCHECK CMD pg_isready -U postgres || exit 1

# Redis
HEALTHCHECK CMD redis-cli ping || exit 1

# Custom endpoint
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1
```

## Multi-Stage Builds

### Why Multi-Stage Builds?

**Benefits:**
1. Smaller final images (no build tools)
2. Separate build and runtime dependencies
3. Better security (less attack surface)
4. Single Dockerfile for entire pipeline
5. No need for build scripts

### Basic Pattern

```dockerfile
# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
USER node
CMD ["node", "dist/server.js"]

# Result: Builder stage discarded, only production stage shipped
# Size reduction: ~1GB → ~170MB
```

### Advanced Multi-Stage Patterns

#### Development vs Production

```dockerfile
# Base stage (shared)
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development dependencies
FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]

# Build for dev:  docker build --target development -t myapp:dev .
# Build for prod: docker build --target production -t myapp:prod .
```

#### Testing Stage

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dependencies
FROM base AS dependencies
RUN npm ci

# Testing
FROM dependencies AS test
COPY . .
RUN npm run lint
RUN npm run test
RUN npm run test:integration

# Build (only runs if tests pass)
FROM dependencies AS builder
COPY . .
RUN npm run build

# Production
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]

# CI Pipeline:
# docker build --target test .        # Run tests
# docker build --target production .  # Build if tests pass
```

#### Language-Specific Multi-Stage

**Go (Static Binary):**
```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Minimal production (scratch)
FROM scratch
COPY --from=builder /build/main /main
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080
ENTRYPOINT ["/main"]

# Final image: ~10MB (just the binary!)
```

**Java (Spring Boot):**
```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

# Production stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
RUN addgroup -S spring && adduser -S spring -G spring
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Python:**
```dockerfile
# Build stage (compile dependencies)
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser
CMD ["python", "app.py"]
```

## Layer Optimization

### Understanding Image Layers

```bash
# View image layers
docker history myapp:latest

# Each instruction creates a layer
FROM node:18-alpine      # Layer 1: ~170MB
RUN apk add curl         # Layer 2: +5MB
COPY package*.json ./    # Layer 3: +1KB
RUN npm install          # Layer 4: +100MB
COPY . .                 # Layer 5: +10MB
# Total: ~285MB
```

### Layer Caching Strategy

```dockerfile
# ❌ Bad: Source changes invalidate all layers
FROM node:18-alpine
COPY . .                    # Changes every commit
RUN npm install             # Reinstalls every time
RUN npm run build

# ✅ Good: Dependencies cached separately
FROM node:18-alpine
COPY package*.json ./       # Only changes when deps change
RUN npm install             # Cached unless package.json changes
COPY . .                    # Source changes don't affect install
RUN npm run build

# Order matters: Least frequently changing → Most frequently changing
```

### Minimize Layer Count

```dockerfile
# ❌ Bad: Too many layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN curl -O https://example.com/file
RUN tar -xzf file
RUN rm file

# ✅ Good: Combined into fewer layers
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    curl -O https://example.com/file && \
    tar -xzf file && \
    rm file && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### Remove Build Artifacts

```dockerfile
# ❌ Bad: Artifacts remain in layer
RUN wget https://example.com/large-file.tar.gz && \
    tar -xzf large-file.tar.gz
RUN rm large-file.tar.gz  # File still in previous layer!

# ✅ Good: Remove in same layer
RUN wget https://example.com/large-file.tar.gz && \
    tar -xzf large-file.tar.gz && \
    rm large-file.tar.gz

# ✅ Better: Multi-stage build
FROM alpine AS downloader
RUN wget https://example.com/large-file.tar.gz && \
    tar -xzf large-file.tar.gz

FROM alpine
COPY --from=downloader /extracted /app
# large-file.tar.gz not in final image
```

## Build Arguments and Secrets

### Using Build Arguments

```dockerfile
# Define arguments with defaults
ARG NODE_VERSION=18
ARG BUILD_ENV=production

FROM node:${NODE_VERSION}-alpine

ARG BUILD_DATE
ARG GIT_COMMIT
ARG VERSION

# Use in labels
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.version="${VERSION}"

# Pass to environment
ENV APP_VERSION=${VERSION}

# Use in RUN
RUN echo "Building version ${VERSION} for ${BUILD_ENV}"

# Build command
docker build \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --build-arg VERSION=1.2.3 \
  -t myapp:1.2.3 .
```

### Handling Secrets Securely

```dockerfile
# ❌ NEVER: Secrets in ENV or ARG
ENV API_KEY=secret123              # Visible in image!
ARG DATABASE_PASSWORD=pass123      # Visible in history!

# ❌ NEVER: Secrets in layers
RUN echo "password123" > /config/secret
RUN rm /config/secret              # Still in previous layer!

# ✅ Method 1: Build secrets (Docker BuildKit)
# syntax=docker/dockerfile:1
FROM alpine
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install

# Build command:
# DOCKER_BUILDKIT=1 docker build --secret id=npmrc,src=$HOME/.npmrc .

# ✅ Method 2: Multi-stage with secrets
FROM alpine AS builder
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > /root/.npmrc && \
    npm install && \
    rm /root/.npmrc

FROM alpine
COPY --from=builder /app/node_modules ./node_modules
# NPM_TOKEN not in final image

# ✅ Method 3: Runtime secrets (volume mount)
# docker run -v $(pwd)/secrets:/run/secrets myapp
# App reads from /run/secrets/api-key
```

### SSH Keys in Builds

```dockerfile
# ❌ Never copy SSH keys into image
COPY ~/.ssh/id_rsa /root/.ssh/
RUN git clone git@github.com:private/repo.git
RUN rm /root/.ssh/id_rsa  # Still in layer!

# ✅ Use SSH mount (BuildKit)
# syntax=docker/dockerfile:1
FROM alpine
RUN apk add git openssh-client
RUN --mount=type=ssh \
    git clone git@github.com:private/repo.git

# Build command:
# DOCKER_BUILDKIT=1 docker build --ssh default .
```

## Security Best Practices

### Non-Root User

```dockerfile
# Always run as non-root user
FROM node:18-alpine

# Alpine
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Debian/Ubuntu
# RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app
COPY --chown=appuser:appgroup . .

USER appuser
CMD ["node", "server.js"]

# Verify:
# docker run myapp whoami
# Output: appuser
```

### Minimize Attack Surface

```dockerfile
# ✅ Use minimal base images
FROM alpine:3.18           # ~5MB
# Not: FROM ubuntu:22.04   # ~80MB

FROM node:18-alpine        # ~170MB
# Not: FROM node:18         # ~1GB

# ✅ Remove unnecessary tools
FROM ubuntu:22.04
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl && \
    apt-get purge -y --auto-remove && \
    rm -rf /var/lib/apt/lists/*

# ✅ Use distroless for ultimate minimal
FROM gcr.io/distroless/nodejs18-debian11
COPY --from=builder /app /app
CMD ["index.js"]
# No shell, no package manager, just runtime
```

### Image Scanning

```dockerfile
# Scan for vulnerabilities
docker scan myapp:latest

# Using Trivy
trivy image myapp:latest

# Using Snyk
snyk container test myapp:latest

# In CI/CD
docker build -t myapp:latest .
docker scan --severity high myapp:latest
if [ $? -ne 0 ]; then
  echo "Security vulnerabilities found!"
  exit 1
fi
```

### Read-Only Filesystem

```dockerfile
# Design app for read-only root filesystem
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN chown -R node:node /app
USER node

# Run with read-only root
# docker run --read-only --tmpfs /tmp myapp
```

## Language-Specific Patterns

### Node.js Production Dockerfile

```dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dependencies
FROM base AS dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Build
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build && \
    npm run test

# Production
FROM node:18-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s CMD node healthcheck.js || exit 1
CMD ["node", "dist/server.js"]
```

### Python Production Dockerfile

```dockerfile
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Build stage
FROM base AS builder
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Production stage
FROM base AS production
WORKDIR /app

RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

COPY --from=builder --chown=appuser:appuser /root/.local /home/appuser/.local
COPY --chown=appuser:appuser . .

USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH

EXPOSE 8000
HEALTHCHECK CMD python healthcheck.py || exit 1
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "app:app"]
```

### Go Production Dockerfile

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

# Install git for go mod download
RUN apk add --no-cache git ca-certificates

WORKDIR /build

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o main .

# Production stage - minimal image
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /build/main /main

EXPOSE 8080
ENTRYPOINT ["/main"]

# Final image: ~10-15MB
```

## Interview Questions

**Q1: What's the difference between COPY and ADD?**
A: `COPY` simply copies files/directories. `ADD` has extra features (auto-extract tar, fetch URLs). **Best practice**: Always use `COPY` unless you specifically need ADD's features. ADD can introduce unexpected behavior and security risks.

**Q2: Explain multi-stage builds and their benefits.**
A: Multi-stage builds use multiple FROM statements in one Dockerfile. Benefits:
- Smaller images (only runtime dependencies in final stage)
- Better security (no build tools in production)
- Cleaner separation of concerns
- No need for separate build scripts
Example: Build stage compiles code, production stage only has compiled artifacts.

**Q3: How do you reduce Docker image size?**
A:
1. Use Alpine or slim base images
2. Multi-stage builds
3. Combine RUN commands (fewer layers)
4. Remove build artifacts in same layer
5. Use .dockerignore
6. Use `--no-install-recommends` (apt)
7. Clean package manager caches
8. Don't include dev dependencies

**Q4: What's the difference between CMD and ENTRYPOINT?**
A:
- `CMD`: Provides default command, easily overridden by `docker run` args
- `ENTRYPOINT`: Sets the main executable, harder to override
- Best practice: Use `ENTRYPOINT` for the main executable, `CMD` for default arguments
```dockerfile
ENTRYPOINT ["python"]
CMD ["app.py"]
```

**Q5: How do you handle secrets in Docker builds?**
A:
1. **Never** use ENV or ARG for secrets (visible in image)
2. Use BuildKit secrets: `RUN --mount=type=secret,id=mysecret`
3. Multi-stage builds (secrets in build stage only)
4. Runtime secrets via volume mounts or orchestration (Docker Swarm, Kubernetes)
5. Secret management tools (AWS Secrets Manager, HashiCorp Vault)

**Q6: Why run containers as non-root users?**
A: Security principle of least privilege:
- Limits damage if container is compromised
- Prevents privilege escalation attacks
- Industry best practice and compliance requirement
- Many orchestration platforms enforce non-root

**Q7: What is layer caching and how does it work?**
A: Docker caches each layer. If instruction and context haven't changed, Docker reuses the cached layer. This speeds up builds significantly.

**Strategy:**
```dockerfile
# Copy dependencies first (change less often)
COPY package.json ./
RUN npm install    # Cached unless package.json changes

# Copy source code last (changes often)
COPY . .           # Doesn't invalidate install cache
```

**Q8: How do you debug a Dockerfile that fails to build?**
```bash
# 1. Build with specific stage
docker build --target builder -t debug .

# 2. Run intermediate stage
docker run -it debug /bin/sh

# 3. Add RUN commands to debug
RUN ls -la
RUN pwd
RUN cat file.txt

# 4. Use --progress=plain for detailed output
docker build --progress=plain .

# 5. Check build history
docker history myapp:latest
```

## Summary

**Core Best Practices:**

1. **Image Size:**
   - ✅ Multi-stage builds (10x+ reduction)
   - ✅ Alpine or slim base images
   - ✅ Combine RUN commands
   - ✅ Clean up in same layer (`rm -rf`)

2. **Caching:**
   - ✅ Order by change frequency (dependencies before code)
   - ✅ Copy package files first, then install
   - ✅ Copy application code last
   - ✅ Use .dockerignore

3. **Security:**
   - ✅ Non-root user (USER directive)
   - ✅ Specific version tags (not `latest`)
   - ✅ Never store secrets in layers
   - ✅ Security scanning (Trivy, Snyk)

4. **Production Readiness:**
   - ✅ HEALTHCHECK for monitoring
   - ✅ LABEL for metadata
   - ✅ EXPOSE for documentation
   - ✅ ENTRYPOINT + CMD pattern

**Key Insights:**
> - Layer order matters: dependencies change less than code
> - Multi-stage builds = smaller images = faster deployments
> - Non-root user prevents privilege escalation
> - `latest` tag is dangerous in production - always use specific versions

---

[← Docker Fundamentals](./01-docker-fundamentals.md) | [Docker Compose Advanced →](./03-docker-compose-advanced.md)
