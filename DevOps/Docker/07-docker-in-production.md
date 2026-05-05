# Docker in Production

## Health Checks

Health checks let orchestrators know if your container is actually working — not just running.

```dockerfile
# In Dockerfile
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=40s \
            --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

```yaml
# In docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s   # Grace period before checks count
```

| Exit Code | Meaning |
|-----------|---------|
| `0` | Healthy |
| `1` | Unhealthy |

> `start_period` prevents restart loops for apps that take time to start (DB migrations, warmup).

## Resource Limits

Always set limits so one container can't starve others:

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 1G
      pids: 100         # Prevent fork bombs
    reservations:
      cpus: '1'
      memory: 512M
```

## Logging

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"    # Rotate after 10MB
        max-file: "3"      # Keep 3 files
```

**AWS CloudWatch logs:**
```yaml
logging:
  driver: "awslogs"
  options:
    awslogs-region: "us-east-1"
    awslogs-group: "/myapp/api"
    awslogs-stream-prefix: "ecs"
```

## Restart Policy

```yaml
restart: unless-stopped   # ✅ Production default
restart: always           # Restarts even after `docker stop`
restart: on-failure       # Only on non-zero exit code
restart: "no"             # Never restart
```

## Graceful Shutdown

Your app must handle `SIGTERM` to finish in-flight requests before stopping.

```yaml
stop_signal: SIGTERM
stop_grace_period: 30s    # Wait before sending SIGKILL
```

⚠️ Use exec form for `CMD` — shell form means `SIGTERM` goes to `/bin/sh`, not your app.

## Production docker-compose Example

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    networks: [frontend]

  api:
    image: myapp:${VERSION:-latest}
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/myapp
    networks: [frontend, backend]
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      retries: 3
      start_period: 60s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  db:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
    networks: [backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      retries: 5

volumes:
  db-data:

networks:
  frontend:
  backend:
    internal: true
```

## Deployment Strategies

### Rolling Update (Zero Downtime)
```bash
# Pull new image
docker pull myapp:v2

# Update service without downtime
VERSION=v2 docker-compose up -d --no-deps api
```

New container starts, passes health checks, then old one stops.

### Blue-Green Deployment
```
1. Run new version on a different port
2. Test the new version
3. Switch load balancer to new version
4. Keep old version briefly for rollback
5. Remove old version
```

## Interview Q&A

**Q: How do health checks help in production?**
Orchestrators route traffic only to healthy containers and restart unhealthy ones. Without health checks, traffic goes to containers that are running but broken.

**Q: Why set resource limits?**
Without limits, one container can consume all CPU/memory and crash the host. Limits also prevent memory leaks from spreading.

**Q: What is `start_period` in a health check?**
A grace period before failed health checks count toward the retry limit. Prevents slow-starting apps (running DB migrations) from being killed in a restart loop.

**Q: How do you do zero-downtime deployment?**
Rolling update: bring up new containers, wait for health checks to pass, then remove old ones. Never remove old before new is healthy.

---
[← Security](./06-docker-security.md) | [Docker with AWS →](./08-docker-with-aws.md)
