# Docker Security

## Top 5 Security Rules

1. **Never run as root** — least privilege
2. **Use minimal base images** — fewer packages = fewer vulnerabilities
3. **Never store secrets in images** — visible in `docker history`
4. **Scan images regularly** — new CVEs appear daily
5. **Drop all Linux capabilities, add only what's needed**

## Non-Root User

```dockerfile
FROM node:18-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
COPY --chown=nodejs:nodejs . .

USER nodejs    # Switch before CMD
CMD ["node", "app.js"]
```

> If an attacker escapes the app, root inside the container can mean root on the host (without user namespaces enabled).

## Minimal Base Images

```dockerfile
FROM alpine:3.18          # ~5MB base
FROM node:18-alpine       # ~170MB
FROM gcr.io/distroless/nodejs18-debian11   # No shell or package manager
```

Smaller image = fewer packages = fewer potential CVEs.

## Secrets Management

```dockerfile
# ❌ Never — visible in docker history and docker inspect
ENV API_KEY=secret123
ARG DB_PASSWORD=pass

# ✅ BuildKit secret — not stored in any image layer
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm install
# Build: DOCKER_BUILDKIT=1 docker build --secret id=npmrc,src=$HOME/.npmrc .
```

**Docker Compose secrets:**
```yaml
services:
  db:
    image: postgres:14
    secrets:
      - db_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
# ⚠️ Add secrets/ to .gitignore
```

**For production:** Use AWS Secrets Manager or HashiCorp Vault. Fetch at runtime — never at build time.

## Runtime Security

```yaml
services:
  api:
    image: myapp
    cap_drop:
      - ALL                     # Drop every capability
    cap_add:
      - NET_BIND_SERVICE        # Only add what's truly needed
    security_opt:
      - no-new-privileges:true  # Block privilege escalation
    read_only: true             # Read-only root filesystem
    tmpfs:
      - /tmp
      - /var/run
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
          pids: 100             # Prevent fork bombs
```

## Image Scanning

```bash
# Trivy (recommended, open-source)
trivy image myapp:latest
trivy image --severity HIGH,CRITICAL myapp:latest

# Fail CI on critical vulnerabilities
trivy image --exit-code 1 --severity CRITICAL myapp:$TAG
```

**Always scan in CI/CD before pushing to production.**

## Docker Socket Warning

```bash
# ❌ NEVER mount Docker socket in untrusted containers
docker run -v /var/run/docker.sock:/var/run/docker.sock myapp
# This grants FULL ROOT ACCESS to the host
```

Mounting `/var/run/docker.sock` lets the container create privileged containers, mount the host filesystem, and fully escape.

## Network Security

```yaml
networks:
  backend:
    internal: true   # No internet access — use for databases
```

Only expose ports that need to be public. Use `expose` instead of `ports` for internal services.

## Interview Q&A

**Q: Top 5 Docker security practices?**
1. Non-root user (`USER nodejs`)
2. Minimal base image (Alpine or distroless)
3. No secrets in images (use Docker Secrets or Vault)
4. Drop all capabilities (`cap_drop: ALL`)
5. Scan images in CI/CD (`trivy --exit-code 1`)

**Q: Why is mounting the Docker socket dangerous?**
`/var/run/docker.sock` gives full Docker API access. An attacker inside the container can create privileged containers, mount the host filesystem, and take full control of the host.

**Q: What does `no-new-privileges` do?**
Prevents container processes from gaining extra privileges via setuid/setgid binaries — blocks privilege escalation even when running as non-root.

**Q: Defense in depth for containers?**
- **Build time:** Minimal image, no secrets in layers, scan for CVEs
- **Runtime:** Non-root, read-only FS, drop capabilities, resource limits
- **Network:** Segmentation, internal networks for databases
- **Host:** User namespaces, AppArmor/SELinux

---
[← Volumes](./05-docker-volumes-storage.md) | [Production →](./07-docker-in-production.md)
