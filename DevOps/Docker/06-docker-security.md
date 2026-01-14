# Docker Security

## Overview

Container security is critical for production deployments. This guide covers Docker security best practices, vulnerability scanning, runtime security, secrets management, and compliance requirements.

### 💡 **Why Docker Security Matters**

**The Container Security Challenge:**
- Containers **share the host kernel** - compromised container can impact host and other containers
- **Images can contain vulnerabilities** - inherited from base images and dependencies
- **Secrets exposure** - environment variables, build layers, and config files can leak credentials
- **Attack surface** - default configurations often run as root with unnecessary capabilities

**Real-World Impact:**
- Cryptominers exploiting exposed Docker APIs and vulnerable images
- Data breaches from exposed secrets in public registries
- Container breakouts gaining host access through misconfigurations
- Supply chain attacks through compromised base images

**Key Value:**
> Docker security requires defense in depth - securing images, build process, runtime configuration, network isolation, secrets management, and continuous vulnerability scanning across the entire container lifecycle.

## Table of Contents
- [Image Security](#image-security)
- [Container Runtime Security](#container-runtime-security)
- [Secrets Management](#secrets-management)
- [Network Security](#network-security)
- [Access Control](#access-control)
- [Vulnerability Scanning](#vulnerability-scanning)
- [Compliance and Auditing](#compliance-and-auditing)
- [Interview Questions](#interview-questions)

## Image Security

### Base Image Selection

```dockerfile
# ❌ Bad: Untrusted, unverified images
FROM random-user/nodejs

# ❌ Bad: Latest tag (unpredictable)
FROM node:latest

# ✅ Good: Official image with specific version
FROM node:18.17.1-alpine3.18

# ✅ Better: Verified publisher
FROM docker.io/library/node:18.17.1-alpine3.18

# ✅ Best: With digest for immutability
FROM node:18.17.1-alpine3.18@sha256:abc123...

# ✅ Minimal base images
FROM alpine:3.18
FROM gcr.io/distroless/nodejs18-debian11
FROM scratch  # For static binaries
```

### Minimize Attack Surface

```dockerfile
# ❌ Bad: Full OS with many packages
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    nodejs npm git curl wget vim

# ✅ Good: Minimal Alpine with only needed packages
FROM alpine:3.18
RUN apk add --no-cache nodejs npm

# ✅ Better: Multi-stage to remove build tools
FROM node:18-alpine AS builder
RUN apk add --no-cache python3 make g++
COPY . .
RUN npm install && npm run build

FROM node:18-alpine
COPY --from=builder /app/dist ./dist
# Build tools not in final image
```

### Non-Root User

```dockerfile
# ❌ Bad: Running as root
FROM node:18-alpine
COPY . .
CMD ["node", "app.js"]

# ✅ Good: Create and use non-root user
FROM node:18-alpine

# Alpine
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Debian/Ubuntu
# RUN groupadd -r appgroup && \
#     useradd -r -g appgroup -u 1001 appuser

WORKDIR /app
COPY --chown=appuser:appgroup . .

USER appuser
CMD ["node", "app.js"]

# Verify:
# docker run myapp id
# uid=1001(appuser) gid=1001(appgroup)
```

### Remove Sensitive Data

```dockerfile
# ❌ Bad: Secrets in layers
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc && \
    npm install
RUN rm ~/.npmrc  # Still in previous layer!

# ✅ Good: Single layer with cleanup
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install

# ✅ Good: Multi-stage without secrets
FROM node:18-alpine AS builder
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc && \
    npm install && \
    rm ~/.npmrc

FROM node:18-alpine
COPY --from=builder /app/node_modules ./node_modules
# NPM_TOKEN not in final image
```

### Reduce Image Size

```dockerfile
# Smaller images = fewer vulnerabilities

# Size comparison:
# node:18            → ~1GB   (Full Debian)
# node:18-slim       → ~200MB (Minimal Debian)
# node:18-alpine     → ~170MB (Alpine Linux)
# distroless/nodejs18 → ~150MB (No shell/package manager)

FROM gcr.io/distroless/nodejs18-debian11
COPY --from=builder /app /app
WORKDIR /app
CMD ["index.js"]
# No shell, no package manager, minimal attack surface
```

## Container Runtime Security

### Security Options

```bash
# Run with security options
docker run -d \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --read-only \
  --tmpfs /tmp \
  --user 1001:1001 \
  nginx

# --security-opt=no-new-privileges: Prevent privilege escalation
# --cap-drop=ALL: Remove all capabilities
# --cap-add: Add only needed capabilities
# --read-only: Read-only root filesystem
# --tmpfs: Writable temp directory
# --user: Non-root user
```

### Linux Capabilities

```yaml
# docker-compose.yml
services:
  web:
    image: nginx
    cap_drop:
      - ALL  # Drop all capabilities
    cap_add:
      - NET_BIND_SERVICE  # Only allow binding to ports < 1024
      - CHOWN             # Allow chown operations

    security_opt:
      - no-new-privileges:true

# Common capabilities:
# NET_BIND_SERVICE: Bind to privileged ports (< 1024)
# CHOWN: Change file ownership
# DAC_OVERRIDE: Bypass file permissions
# SETUID/SETGID: Change UID/GID
```

### Read-Only Filesystem

```yaml
services:
  api:
    image: myapi
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
      - /var/cache

# Benefits:
# - Prevents malware from modifying files
# - Immutable infrastructure
# - Easier auditing

# Requires: App must write only to specified tmpfs mounts
```

### Resource Limits

```yaml
services:
  app:
    image: myapp
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
          pids: 100  # Prevent fork bombs
        reservations:
          cpus: '1'
          memory: 512M

# Prevents:
# - Resource exhaustion attacks
# - CPU-based DoS
# - Memory bombs
# - Fork bombs
```

### AppArmor and SELinux

```bash
# AppArmor (Ubuntu/Debian)
docker run --security-opt apparmor=docker-default nginx

# Custom AppArmor profile
docker run --security-opt apparmor=my-profile nginx

# SELinux (RHEL/CentOS)
docker run --security-opt label=type:container_runtime_t nginx

# Disable (not recommended)
docker run --security-opt apparmor=unconfined nginx
```

## Secrets Management

### Environment Variables (Least Secure)

```bash
# ❌ Bad: Secrets in command line (visible in docker inspect, logs)
docker run -e DB_PASSWORD=secret123 myapp

# ❌ Bad: Secrets in docker-compose.yml (committed to git)
services:
  db:
    environment:
      POSTGRES_PASSWORD: secret123

# ⚠️ Better: Environment file (still not ideal)
# .env file (add to .gitignore)
DB_PASSWORD=secret123

docker run --env-file .env myapp
```

### Docker Secrets (Swarm Mode)

```bash
# Create secret
echo "mysecretpassword" | docker secret create db_password -

# Or from file
docker secret create db_password ./password.txt

# Use in service
docker service create \
  --name db \
  --secret db_password \
  postgres

# Inside container:
# Secret available at: /run/secrets/db_password
```

**Docker Compose Secrets:**
```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    secrets:
      - db_password
      - db_user
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_USER_FILE: /run/secrets/db_user

secrets:
  db_password:
    file: ./secrets/db_password.txt
  db_user:
    file: ./secrets/db_user.txt

# Secrets directory not committed to git!
```

### Build Secrets (BuildKit)

```dockerfile
# syntax=docker/dockerfile:1

FROM node:18-alpine

# Use secret during build
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm install

# Secret not stored in image!

# Build command:
# DOCKER_BUILDKIT=1 docker build \
#   --secret id=npmrc,src=$HOME/.npmrc \
#   -t myapp .
```

### External Secret Management

```yaml
# AWS Secrets Manager
services:
  app:
    image: myapp
    environment:
      AWS_REGION: us-east-1
      SECRET_ARN: arn:aws:secretsmanager:us-east-1:123456:secret:myapp

# Application fetches secrets at runtime
# Never stored in environment variables
```

**Vault Integration:**
```yaml
services:
  app:
    image: myapp
    environment:
      VAULT_ADDR: https://vault.example.com
      VAULT_TOKEN_FILE: /run/secrets/vault-token
    secrets:
      - vault-token

secrets:
  vault-token:
    external: true
```

## Network Security

### Network Segmentation

```yaml
services:
  # Public-facing (DMZ)
  nginx:
    networks:
      - dmz
    ports:
      - "80:80"
      - "443:443"

  # Application tier
  api:
    networks:
      - dmz
      - app-tier

  # Data tier (isolated)
  db:
    networks:
      - app-tier  # No direct external access

networks:
  dmz:
    driver: bridge
  app-tier:
    driver: bridge
    internal: true  # No internet access
```

### TLS/SSL

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    command: >
      sh -c "openssl dhparam -out /etc/nginx/dhparam.pem 2048 &&
             nginx -g 'daemon off;'"

# nginx.conf
# server {
#     listen 443 ssl http2;
#     ssl_certificate /etc/nginx/certs/cert.pem;
#     ssl_certificate_key /etc/nginx/certs/key.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
# }
```

### Firewall Rules

```bash
# Allow only specific IPs to database
iptables -I DOCKER-USER -s 192.168.1.0/24 -p tcp --dport 5432 -j ACCEPT
iptables -A DOCKER-USER -p tcp --dport 5432 -j DROP

# Allow only from specific container
iptables -I DOCKER-USER -i docker0 -s 172.18.0.5 -p tcp --dport 5432 -j ACCEPT
iptables -A DOCKER-USER -p tcp --dport 5432 -j DROP
```

## Access Control

### Docker Daemon Socket

```bash
# ❌ NEVER: Mount Docker socket in untrusted containers
docker run -v /var/run/docker.sock:/var/run/docker.sock myapp
# This gives FULL ROOT ACCESS to host!

# ✅ If absolutely necessary: Use read-only, with restrictions
docker run \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  limited-app
```

### User Namespaces

```bash
# Enable user namespace remapping
# /etc/docker/daemon.json
{
  "userns-remap": "default"
}

# Restart Docker
sudo systemctl restart docker

# Now container root (UID 0) maps to unprivileged host user
# Container UID 0 → Host UID 100000
# Container UID 1 → Host UID 100001
```

### Docker Content Trust

```bash
# Enable content trust (signed images only)
export DOCKER_CONTENT_TRUST=1

# Pull images (must be signed)
docker pull nginx:alpine
# Verifies signature automatically

# Push signed images
docker push myrepo/myapp:v1.0
# Signs image automatically

# Disable for specific operation
DOCKER_CONTENT_TRUST=0 docker pull untrusted-image
```

## Vulnerability Scanning

### Docker Scan

```bash
# Scan image for vulnerabilities
docker scan myapp:latest

# Scan with severity threshold
docker scan --severity high myapp:latest

# Example output:
# Tested 200 dependencies for known vulnerabilities
# Found 15 vulnerabilities
# - 3 high severity
# - 8 medium severity
# - 4 low severity
```

### Trivy

```bash
# Install Trivy
# macOS: brew install aquasecurity/trivy/trivy
# Linux: See https://github.com/aquasecurity/trivy

# Scan image
trivy image myapp:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Output formats
trivy image --format json -o results.json myapp:latest
trivy image --format table myapp:latest

# Scan filesystem
trivy fs ./project

# Scan in CI/CD
trivy image --exit-code 1 --severity CRITICAL myapp:latest
# Fails if critical vulnerabilities found
```

### Snyk

```bash
# Install Snyk CLI
npm install -g snyk

# Authenticate
snyk auth

# Scan Docker image
snyk container test myapp:latest

# Monitor image
snyk container monitor myapp:latest

# Test Dockerfile
snyk iac test Dockerfile
```

### Grype

```bash
# Install Grype
# macOS: brew tap anchore/grype && brew install grype

# Scan image
grype myapp:latest

# Scan with severity threshold
grype myapp:latest --fail-on high

# Output formats
grype myapp:latest -o json
grype myapp:latest -o table
```

### CI/CD Integration

```yaml
# GitLab CI example
stages:
  - build
  - scan
  - deploy

build:
  stage: build
  script:
    - docker build -t myapp:$CI_COMMIT_SHA .

scan:
  stage: scan
  image: aquasec/trivy:latest
  script:
    - trivy image --exit-code 1 --severity CRITICAL myapp:$CI_COMMIT_SHA
  allow_failure: false

deploy:
  stage: deploy
  script:
    - docker push myapp:$CI_COMMIT_SHA
  only:
    - main
```

## Compliance and Auditing

### Docker Bench Security

```bash
# Run Docker Bench Security
docker run --rm --net host --pid host --userns host --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /var/lib:/var/lib \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc:/etc:ro \
  docker/docker-bench-security

# Checks:
# - Host configuration
# - Docker daemon configuration
# - Docker daemon files
# - Container images
# - Container runtime
# - Docker security operations
# - Docker Swarm configuration
```

### CIS Docker Benchmark

Key recommendations:
1. Run containers with non-root user
2. Use trusted base images
3. Don't install unnecessary packages
4. Scan images for vulnerabilities
5. Enable Docker Content Trust
6. Use user namespace remapping
7. Limit container resources
8. Enable logging
9. Rotate logs
10. Implement network segmentation

### Logging and Monitoring

```yaml
services:
  app:
    image: myapp
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "production"

  # Centralized logging
  logstash:
    image: logstash:8.0.0
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro

# AWS CloudWatch
services:
  app:
    logging:
      driver: "awslogs"
      options:
        awslogs-region: "us-east-1"
        awslogs-group: "myapp"
        awslogs-stream: "container"
```

## Interview Questions

**Q1: What are the top 5 Docker security best practices?**
A:
1. **Use non-root users** - Never run as root
2. **Scan images** - Regular vulnerability scanning
3. **Minimal base images** - Alpine/distroless
4. **No secrets in images** - Use secrets management
5. **Resource limits** - Prevent DoS attacks

**Q2: How do you secure Docker secrets?**
A:
1. **Never** use environment variables for sensitive data
2. Use Docker Secrets (Swarm mode) - stored in `/run/secrets/`
3. Use BuildKit secrets for build-time secrets
4. External secret management (Vault, AWS Secrets Manager)
5. Encrypt secrets at rest

**Q3: What's the purpose of `--security-opt=no-new-privileges`?**
A: Prevents privilege escalation. Container processes cannot gain additional privileges through setuid/setgid binaries.
```bash
docker run --security-opt=no-new-privileges:true myapp
```
**Essential** for production containers running as non-root.

**Q4: How do you implement defense in depth for containers?**
A:
1. **Image level**: Minimal images, vulnerability scanning
2. **Build level**: Multi-stage builds, no secrets in layers
3. **Runtime level**: Non-root, read-only FS, capabilities
4. **Network level**: Segmentation, internal networks
5. **Host level**: User namespaces, AppArmor/SELinux
6. **Orchestration level**: RBAC, network policies

**Q5: What capabilities should you drop from containers?**
```yaml
services:
  app:
    cap_drop:
      - ALL  # Drop everything
    cap_add:
      - NET_BIND_SERVICE  # Only add what's needed
```
**Default approach**: Drop ALL, add only required capabilities.

**Q6: How do you scan Docker images for vulnerabilities?**
```bash
# Docker Scan (Snyk)
docker scan myapp:latest

# Trivy
trivy image myapp:latest

# Grype
grype myapp:latest

# In CI/CD: Fail build on critical vulnerabilities
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

**Q7: Why shouldn't you mount the Docker socket in containers?**
A: Mounting `/var/run/docker.sock` gives **full root access** to the host:
- Can create privileged containers
- Can mount host filesystem
- Can break out of container
**Only mount** for trusted container management tools, read-only if possible.

**Q8: What's the purpose of read-only filesystems?**
A:
```yaml
read_only: true
tmpfs:
  - /tmp
```
**Benefits:**
- Prevents malware from modifying files
- Immutable infrastructure
- Easier compliance auditing
- Requires tmpfs for writable directories

**Q9: How do you implement network segmentation?**
```yaml
services:
  web:
    networks:
      - frontend  # Public-facing

  api:
    networks:
      - frontend
      - backend

  db:
    networks:
      - backend  # Isolated

networks:
  backend:
    internal: true  # No external access
```

**Q10: What's Docker Content Trust?**
A: Image signing and verification:
```bash
export DOCKER_CONTENT_TRUST=1
```
- Only allows pulling/running signed images
- Prevents tampered images
- Verifies image publisher
- Uses Notary for signature verification

## Summary

**Core Concepts:**

1. **Image Security (Build Time):**
   - ✅ **Base Images**: Use official images with specific versions (not `latest`), verify with digest
   - ✅ **Minimal Images**: Alpine (~170MB), distroless (~150MB) - fewer packages = fewer vulnerabilities
   - ✅ **Non-Root User**: Create and use non-root user (UID 1001+), never run as root
   - ✅ **Multi-Stage Builds**: Remove build tools from final image, secrets stay in builder stage only
   - ✅ **Vulnerability Scanning**: Trivy, Grype, Docker Scan - fail CI/CD on CRITICAL vulnerabilities
   - ❌ Never commit secrets to image layers (visible in `docker history`)

2. **Runtime Security (Execution Time):**
   - ✅ **Drop Capabilities**: `cap_drop: ALL`, then `cap_add` only what's needed (NET_BIND_SERVICE)
   - ✅ **Read-Only Filesystem**: `read_only: true` with `tmpfs` for writable directories
   - ✅ **No New Privileges**: `--security-opt=no-new-privileges:true` prevents escalation
   - ✅ **Resource Limits**: CPU, memory, PIDs - prevent DoS, cryptominers, fork bombs
   - ✅ **AppArmor/SELinux**: Mandatory Access Control profiles for additional isolation
   - ⚠️ Never mount Docker socket (`/var/run/docker.sock`) - grants full root access to host

3. **Secrets Management:**
   - ✅ **Docker Secrets**: Swarm mode, stored in `/run/secrets/`, encrypted at rest and in transit
   - ✅ **BuildKit Secrets**: `--mount=type=secret` for build-time secrets (not stored in image)
   - ✅ **External Secret Stores**: AWS Secrets Manager, HashiCorp Vault - fetch at runtime
   - ❌ Never use environment variables for secrets (visible in `docker inspect`, logs, process list)
   - ❌ Never hardcode secrets in Dockerfile or docker-compose.yml

4. **Network Security:**
   - ✅ **Network Segmentation**: Frontend/backend/data tiers on separate networks
   - ✅ **Internal Networks**: `internal: true` for databases (no external internet access)
   - ✅ **TLS/SSL**: Encrypt traffic with proper certificates (TLS 1.2+)
   - ✅ **Firewall Rules**: Use `iptables DOCKER-USER` chain for custom rules
   - ✅ **Minimal Port Exposure**: Only expose required ports, use `expose` instead of `ports` when possible

5. **Access Control & Compliance:**
   - ✅ **User Namespaces**: Map container root (UID 0) to unprivileged host user (UID 100000+)
   - ✅ **Docker Content Trust**: `DOCKER_CONTENT_TRUST=1` - only signed images allowed
   - ✅ **Logging & Monitoring**: Centralized logging (CloudWatch, ELK), audit container events
   - ✅ **CIS Docker Benchmark**: Run Docker Bench Security for compliance checks
   - ✅ **Regular Audits**: Scan images weekly, rotate secrets quarterly, review access controls

**Best Practices:**

**Do:**
- ✅ Run as non-root user with specific UID/GID
- ✅ Use minimal base images (Alpine, distroless, scratch for static binaries)
- ✅ Scan images in CI/CD and fail on CRITICAL vulnerabilities
- ✅ Use Docker Secrets or external secret managers (Vault, AWS Secrets Manager)
- ✅ Drop all capabilities, add only what's needed
- ✅ Implement read-only filesystem with tmpfs for writable directories
- ✅ Use network segmentation with internal networks for databases
- ✅ Set resource limits (CPU, memory, PIDs)
- ✅ Enable Docker Content Trust for image verification
- ✅ Centralize logging and monitor container events

**Don't:**
- ❌ Never run containers as root (default in many images)
- ❌ Never use `latest` tag (unpredictable, no version control)
- ❌ Never store secrets in environment variables, images, or docker-compose.yml
- ❌ Never mount Docker socket in untrusted containers (grants root access)
- ❌ Never skip vulnerability scanning before production deployment
- ❌ Never expose unnecessary ports to host or internet
- ❌ Never trust unverified images from unknown sources
- ❌ Never run containers with full capabilities or privileged mode
- ⚠️ Never ignore HIGH/CRITICAL vulnerabilities - patch or find alternatives

**Key Insights:**
> - **Defense in depth is required** - secure every layer: image, build, runtime, network, host
> - **Container root = host root without user namespaces** - always run as non-root user
> - **Secrets in environment variables are NOT secret** - visible in logs, inspect, process list
> - **Smaller images = smaller attack surface** - Alpine (170MB) vs Full OS (1GB+)
> - **Mounting Docker socket = full root access** - container can create privileged containers and escape
> - **Scanning must be continuous** - new vulnerabilities discovered daily, scan on build and schedule
> - **Read-only filesystem prevents malware persistence** - attackers can't modify binaries or install backdoors

**Production Security Checklist:**
- [ ] Non-root user configured (UID 1001+, verified with `docker run myapp id`)
- [ ] Minimal base image (Alpine/distroless, <200MB)
- [ ] Multi-stage builds implemented (build tools not in final image)
- [ ] Vulnerability scanning in CI/CD (Trivy `--exit-code 1 --severity CRITICAL`)
- [ ] No secrets in images/environment (use Docker Secrets or Vault)
- [ ] Docker Content Trust enabled (`DOCKER_CONTENT_TRUST=1`)
- [ ] Resource limits configured (CPU, memory, PIDs)
- [ ] Read-only filesystem where possible (`read_only: true` + tmpfs)
- [ ] Capabilities dropped (`cap_drop: ALL`, add only needed)
- [ ] Network segmentation implemented (frontend/backend/data tiers)
- [ ] Internal networks for databases (`internal: true`)
- [ ] TLS/SSL configured for external traffic
- [ ] Logging and monitoring configured (CloudWatch, ELK, Prometheus)
- [ ] Regular security audits (Docker Bench Security monthly)
- [ ] User namespaces enabled (container UID 0 → host UID 100000+)
- [ ] No Docker socket mounted in containers
- [ ] Secrets rotation policy implemented (quarterly minimum)
- [ ] Incident response plan documented

---

[← Docker Volumes & Storage](./05-docker-volumes-storage.md) | [Docker in Production →](./07-docker-in-production.md)
