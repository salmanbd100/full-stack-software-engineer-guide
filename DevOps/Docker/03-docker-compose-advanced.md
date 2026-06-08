# Docker Compose

## Core Structure

```yaml
services:    # Define containers
  web:
  db:

volumes:     # Persistent storage
  db-data:

networks:    # Custom networks
  backend:
```

## Service Configuration

```yaml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    image: myapp:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_URL=postgres://db:5432/myapp
    env_file:
      - .env
    volumes:
      - ./src:/app/src        # Bind mount (dev live reload)
      - uploads:/app/uploads  # Named volume (persistent data)
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

## Networking

```yaml
services:
  nginx:
    networks: [frontend]
  api:
    networks: [frontend, backend]   # Bridge between tiers
  db:
    networks: [backend]             # Isolated from internet

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true    # No external internet access
```

> Services on the same network reach each other **by service name** via Docker DNS. `api` connects to `postgres://db:5432` automatically.

## Volumes

```yaml
services:
  db:
    volumes:
      - db-data:/var/lib/postgresql/data            # Named (persistent)
      - ./init.sql:/docker-entrypoint-initdb.d:ro   # Bind (read-only config)

  web:
    volumes:
      - ./src:/app/src                              # Bind (dev live reload)
      - node_modules:/app/node_modules              # Named (avoid host override)

volumes:
  db-data:
  node_modules:
```

## Environment Variables

```yaml
# .env file
DB_PASS=secret
APP_VERSION=1.2.0

# docker-compose.yml
services:
  web:
    image: myapp:${APP_VERSION:-latest}
    environment:
      DATABASE_URL: postgres://admin:${DB_PASS}@db:5432/myapp
```

## Override Files (Dev vs Prod)

```yaml
# docker-compose.override.yml — auto-loaded in dev
services:
  web:
    build: .
    volumes:
      - ./src:/app/src
    environment:
      DEBUG: "true"
```

```bash
# Dev: auto-loads override file
docker compose up -d

# Prod: explicit file list
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Full-Stack Production Example

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks: [frontend]
    depends_on: [api]

  api:
    build: .
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASS}@db:5432/myapp
      REDIS_URL: redis://redis:6379
    networks: [frontend, backend]
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      retries: 3

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - db-data:/var/lib/postgresql/data
    networks: [backend]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks: [backend]

volumes:
  db-data:
  redis-data:

networks:
  frontend:
  backend:
    internal: true
```

## Essential Commands

```bash
docker compose up -d            # Start services
docker compose up -d --build    # Rebuild and start
docker compose down             # Stop and remove containers
docker compose down -v          # Also remove volumes
docker compose ps               # Service status
docker compose logs -f api      # Follow service logs
docker compose exec api bash    # Shell into service
docker compose restart api      # Restart one service
docker compose config           # Validate config
```

## Interview Q&A

**Q: `docker compose up` vs `docker compose start`?**
- `up` — creates containers, networks, volumes, then starts. Use for first run or after config changes.
- `start` — only starts existing stopped containers.

**Q: How does service discovery work?**
Docker Compose creates a default network. Each service name becomes a DNS hostname. No need to hardcode IPs.

**Q: What does `depends_on` with `condition: service_healthy` do?**
Waits for the dependency's health check to pass before starting the dependent service. Without a condition, it only waits for the container to start — not for the app inside to be ready.

**Q: Named volumes vs bind mounts?**
Named volumes are Docker-managed and portable — use in production. Bind mounts map a host path — use for dev live reload only.

---
[← Dockerfile Best Practices](./02-dockerfile-best-practices.md) | [Networking →](./04-docker-networking-deep-dive.md)
