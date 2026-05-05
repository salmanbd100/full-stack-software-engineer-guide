# Docker Volumes & Storage

## Volume Types

| Type | Syntax | Best For |
|------|--------|----------|
| **Named volume** | `-v mydata:/data` | Production persistent data |
| **Bind mount** | `-v $(pwd)/src:/app/src` | Dev live reload |
| **Anonymous** | `-v /data` | Temporary, throwaway |
| **tmpfs** | `--tmpfs /tmp` | Sensitive/cache (RAM only) |

## Named Volumes (Production)

```bash
docker volume create mydata
docker run -d -v mydata:/var/lib/postgresql/data postgres
```

Docker manages the path (`/var/lib/docker/volumes/`). Portable, easy to back up, production-safe.

## Bind Mounts (Development)

```bash
docker run -d -v $(pwd)/src:/app/src myapp
docker run -d -v $(pwd)/config:/app/config:ro myapp   # read-only
```

Maps a host path directly. Changes on the host appear instantly in the container. Not portable between machines.

## tmpfs (In-Memory)

```bash
docker run -d --tmpfs /app/cache:rw,size=512m myapp
```

Fast, secure (no disk traces), auto-cleared on stop. Use for cache or sensitive temp data.

## Named vs Bind Mount

| Feature | Named Volume | Bind Mount |
|---------|-------------|------------|
| **Managed by** | Docker | You (host path) |
| **Portability** | ✅ Excellent | ❌ Host-specific |
| **Backup** | Easy | Manual |
| **Production** | ✅ Yes | ❌ No |
| **Dev live reload** | No | ✅ Yes |

## Volume Management

```bash
docker volume ls                    # List all volumes
docker volume inspect mydata        # Show path and details
docker volume rm mydata             # Remove volume
docker volume prune                 # Remove all unused volumes
docker rm -v container_name         # Remove container + its volumes
```

## Backup and Restore

```bash
# Backup named volume to tar.gz
docker run --rm \
  -v mydata:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/mydata-backup.tar.gz -C /data .

# Restore
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mydata-backup.tar.gz -C /data
```

**Database native backup (preferred):**
```bash
docker exec postgres pg_dump -U postgres mydb > backup.sql
docker exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} mydb > backup.sql
```

## Docker Compose Volumes

```yaml
services:
  db:
    image: postgres:14-alpine
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

## Sharing Volumes Between Containers

```yaml
services:
  writer:
    volumes:
      - shared:/data

  reader:
    volumes:
      - shared:/data:ro   # Read-only

volumes:
  shared:
```

## Interview Q&A

**Q: What happens to data when a container is removed?**
Container filesystem data is lost. Data in named or bind-mounted volumes persists. Anonymous volumes persist unless you use `docker rm -v`.

**Q: Named volume vs bind mount?**
Named volumes are Docker-managed, portable, and production-safe. Bind mounts use a host path — good for development but not portable between machines.

**Q: Why use tmpfs?**
Data lives in RAM only — fast, secure (no disk traces), and auto-cleared when the container stops. Use for cache, session data, or anything sensitive you don't want on disk.

**Q: How do you back up a volume?**
Run a temporary Alpine container, mount both the volume and a backup directory, and use `tar` to archive. For databases, use the native dump tool (`pg_dump`, `mysqldump`) instead.

---
[← Networking](./04-docker-networking-deep-dive.md) | [Security →](./06-docker-security.md)
