# Docker Troubleshooting

## Exit Codes

| Code | Cause | Action |
|------|-------|--------|
| `0` | Clean exit | Normal |
| `1` | App error | Check logs |
| `137` | OOM killed (SIGKILL) | Increase memory limit |
| `139` | Segfault | Check binary/app |
| `143` | SIGTERM (graceful stop) | Normal shutdown |

## Container Won't Start

```bash
# Step 1: Check status and exit code
docker ps -a                              # See status and exit code
docker logs container_name               # App error output
docker logs --tail 50 container_name     # Last 50 lines

# Step 2: Inspect the config
docker inspect container_name            # Full config, env vars, mounts

# Step 3: Override entrypoint to explore
docker run -it --entrypoint /bin/sh myimage
```

**Common causes:**
```bash
# Port already in use
docker ps | grep 8080          # What container uses it?
lsof -i :8080                  # What host process uses it?

# OOM killed (exit 137)
docker stats container_name    # Live memory usage
# Solution: increase memory limit or fix memory leak

# Permission denied on volume
docker exec container ls -la /mounted/path
# Solution: fix file ownership (chown) in Dockerfile
```

## Network Issues

```bash
# Test DNS resolution
docker exec container nslookup servicename

# Test connectivity
docker exec container ping servicename
docker exec container curl http://api:3000/health

# Inspect network
docker network inspect mynetwork    # Connected containers and IPs

# Check port mappings
docker port container_name
```

**Common causes:**
- Containers not on the same network — check `networks` in Compose
- Using default bridge (no DNS) — switch to a custom bridge network
- Typo in service name — names are case-sensitive

## Volume Issues

```bash
# Check mounts
docker inspect container_name | grep -A 20 Mounts

# Check permissions inside container
docker exec container ls -la /mounted/path

# Check disk space
docker system df    # Docker disk usage
df -h               # Host disk usage
```

## Image Size Issues

```bash
# View layers and sizes
docker history myapp:latest

# Analyze interactively
docker run --rm -it wagoodman/dive myapp:latest
```

**To reduce size:**
1. Alpine base image: `node:18-alpine`
2. Multi-stage build — remove build tools
3. Combine `RUN` commands
4. Clean in same layer: `&& rm -rf /var/lib/apt/lists/*`
5. Add `.dockerignore`

## Build Cache Issues

```bash
# Force full rebuild
docker build --no-cache -t myapp .

# Verbose build output
docker build --progress=plain .

# Debug a specific stage
docker build --target builder -t debug .
docker run -it debug /bin/sh
```

## System Cleanup

```bash
docker system prune               # Remove stopped containers + unused images
docker system prune -a            # Also removes all unused images
docker system prune -a --volumes  # Also removes volumes ⚠️ data loss
docker system df                  # Show disk usage breakdown
```

## Debugging Checklist

```
1. docker logs container_name           → app errors
2. docker ps -a                         → exit code + status
3. docker inspect container_name        → config, env vars, mounts
4. docker exec -it container sh         → interactive shell
5. docker stats                         → CPU/memory usage
6. docker network inspect mynetwork     → connectivity + IPs
7. docker system df                     → disk usage
```

## Interview Q&A

**Q: Container exits immediately — how do you debug?**
```bash
docker logs container_name                           # Error output
docker inspect container_name --format='{{.State.ExitCode}}'
docker run -it --entrypoint /bin/sh myimage          # Explore interactively
```

**Q: Two containers can't communicate — where do you start?**
1. Check they're on the same custom network: `docker network inspect`
2. Test DNS: `docker exec c1 nslookup c2`
3. Test connectivity: `docker exec c1 ping c2`
4. Verify service names match exactly (case-sensitive)

**Q: Exit code 137 — what happened?**
The OOM killer terminated the container. Either the memory limit is too low or there's a memory leak. Check `docker stats` and increase the `memory` limit or fix the leak.

**Q: How do you inspect a container that won't start?**
Override the entrypoint: `docker run -it --entrypoint /bin/sh myimage`. This skips the app and gives you a shell to explore the filesystem and test commands manually.

---
[← Docker with AWS](./08-docker-with-aws.md) | [Back to DevOps](../README.md)
