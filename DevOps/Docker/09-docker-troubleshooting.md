# Docker Troubleshooting

## Overview

Troubleshooting Docker issues is a critical skill for DevOps engineers. This guide covers common problems, debugging techniques, performance optimization, and systematic approaches to diagnosing and resolving Docker issues.

### 💡 **Why Docker Troubleshooting Skills Matter**

**The Debugging Challenge:**
- **Containers are ephemeral** - logs and state disappear when containers are removed
- **Layered complexity** - issues can originate from image, network, volume, host, or orchestration layers
- **Production incidents are costly** - downtime, data loss, security breaches require fast diagnosis
- **Interview focus** - troubleshooting questions test real-world experience and systematic thinking

**Common Production Incidents:**
- **Exit 137 (OOM killed)** - Memory leak or insufficient limits causing cascading failures
- **Port conflicts** - "Address already in use" preventing deployments
- **Network isolation** - Containers can't communicate due to network misconfiguration
- **Permission denied** - Volume ownership mismatches blocking reads/writes
- **Image bloat** - 2GB+ images causing slow deployments and storage exhaustion
- **DNS resolution failures** - Default bridge network has no DNS, causing connectivity issues

**Key Value:**
> Docker troubleshooting requires systematic diagnosis - check logs first, inspect configuration, test connectivity, profile resources - moving from symptoms to root cause while understanding container lifecycle, networking, storage, and security models.

## Table of Contents
- [Container Issues](#container-issues)
- [Image Issues](#image-issues)
- [Network Issues](#network-issues)
- [Volume Issues](#volume-issues)
- [Performance Issues](#performance-issues)
- [Build Issues](#build-issues)
- [Security Issues](#security-issues)
- [Debugging Techniques](#debugging-techniques)
- [Interview Questions](#interview-questions)

## Container Issues

### Container Won't Start

```bash
# Check container status
docker ps -a

# Common statuses:
# - Exited (0): Normal exit
# - Exited (1): Error exit
# - Exited (137): Killed (OOM or SIGKILL)
# - Exited (139): Segmentation fault
# - Restarting: Continuous restart loop

# Check logs
docker logs container_name
docker logs --tail 100 container_name
docker logs --since 30m container_name

# Inspect container
docker inspect container_name

# Check exit code
docker inspect container_name --format='{{.State.ExitCode}}'

# Common exit codes:
# 0: Success
# 1: Application error
# 137: SIGKILL (OOM killer)
# 139: SIGSEGV (segmentation fault)
# 143: SIGTERM (graceful shutdown)
```

**Common Causes:**
```bash
# 1. Application crashed
# Solution: Check logs, fix application code

# 2. Port already in use
# Error: "bind: address already in use"
docker ps | grep <port>
lsof -i :<port>
# Solution: Stop conflicting process or use different port

# 3. Out of memory
# Error: "Exited (137)"
docker stats container_name
# Solution: Increase memory limit or optimize application

# 4. Missing dependencies
# Error: "ModuleNotFoundError", "Cannot find module"
# Solution: Fix Dockerfile, ensure all dependencies installed

# 5. Permission denied
# Error: "permission denied"
docker exec container_name ls -la /problematic/path
# Solution: Fix file permissions, run as correct user
```

### Container Keeps Restarting

```bash
# Check restart count
docker inspect container_name --format='{{.RestartCount}}'

# View events
docker events --filter container=container_name

# Check restart policy
docker inspect container_name --format='{{.HostConfig.RestartPolicy}}'

# Disable restart to debug
docker update --restart=no container_name

# Run without restart
docker run --rm -it myimage /bin/sh
```

**Crash Loop Debugging:**
```bash
# Override entrypoint to prevent immediate crash
docker run -it --entrypoint /bin/sh myimage

# Or use bash
docker run -it --entrypoint /bin/bash myimage

# Check what command is running
docker inspect container_name --format='{{.Config.Cmd}}'

# Test command manually
docker run -it myimage <command>

# Check health
docker inspect container_name --format='{{.State.Health.Status}}'
```

### Container Exits Immediately

```bash
# Common cause: No foreground process
# ❌ Bad: Process runs in background
CMD ["nginx"]  # Exits immediately

# ✅ Good: Process runs in foreground
CMD ["nginx", "-g", "daemon off;"]

# ❌ Bad: Shell exits after script
CMD ["./script.sh"]
# script.sh runs background process and exits

# ✅ Good: Keep process in foreground
CMD ["./script.sh", "&&", "tail", "-f", "/dev/null"]

# Or use exec form
CMD ["python", "app.py"]  # Python runs in foreground
```

## Image Issues

### Image Build Failures

```bash
# Build with detailed output
docker build --progress=plain --no-cache -t myapp .

# Check specific layer
docker build --target <stage-name> -t debug .

# Inspect build context
docker build -t myapp . 2>&1 | grep "Sending build context"
# Large context? Add to .dockerignore

# Common build errors:

# 1. COPY/ADD file not found
# Error: "COPY failed: file not found"
# Solution: Ensure file exists, check .dockerignore
ls -la path/to/file
cat .dockerignore

# 2. RUN command fails
# Error: "The command '/bin/sh -c apt-get install' returned non-zero code: 100"
# Solution: Debug by running layer
docker build --target <previous-stage> -t debug .
docker run -it debug /bin/sh
# Try command manually

# 3. Out of disk space
# Error: "no space left on device"
docker system df
docker system prune -a
df -h

# 4. Network timeout
# Error: "Could not resolve host"
# Solution: Check network, use --network host
docker build --network host -t myapp .
```

### Image Too Large

```bash
# Check image size
docker images myapp

# Analyze layers
docker history myapp:latest

# Find large layers
docker history myapp:latest --no-trunc --format "{{.Size}}\t{{.CreatedBy}}" | sort -hr | head -20

# Use dive tool for detailed analysis
dive myapp:latest

# Solutions:
# 1. Use multi-stage builds
# 2. Use Alpine base images
# 3. Combine RUN commands
# 4. Remove build artifacts in same layer
# 5. Use .dockerignore
```

### Image Pull Failures

```bash
# Error: "manifest unknown"
# Cause: Image doesn't exist or wrong tag
docker pull myimage:tag

# Error: "denied: access forbidden"
# Cause: Authentication required
docker login
docker login registry.example.com

# Error: "TLS handshake timeout"
# Cause: Network issues, registry unreachable
ping registry.example.com
curl https://registry.example.com/v2/

# Error: "Error response from daemon: Get ... net/http: request canceled"
# Cause: Slow network, timeout
# Solution: Increase timeout, use better network
docker pull --platform linux/amd64 myimage:tag
```

## Network Issues

### Container Can't Connect to Another Container

```bash
# Check if containers on same network
docker network inspect bridge
docker network inspect custom-network

# Check container IPs
docker inspect container1 --format='{{.NetworkSettings.Networks}}'
docker inspect container2 --format='{{.NetworkSettings.Networks}}'

# Test connectivity from container
docker exec container1 ping container2
docker exec container1 curl http://container2:port

# Check DNS resolution
docker exec container1 nslookup container2
docker exec container1 cat /etc/hosts

# Common issues:

# 1. Different networks
# Solution: Connect to same network
docker network connect my-network container1

# 2. No DNS on default bridge
# Solution: Use custom bridge network
docker network create my-network
docker run --network my-network container1

# 3. Wrong port
# Solution: Check exposed ports
docker port container2

# 4. Firewall rules
# Solution: Check iptables
sudo iptables -L DOCKER -n
```

### Port Binding Failures

```bash
# Error: "bind: address already in use"
docker run -p 8080:80 nginx

# Find what's using the port
lsof -i :8080
netstat -tulpn | grep 8080

# Solutions:
# 1. Stop conflicting process
sudo kill <PID>

# 2. Use different port
docker run -p 8081:80 nginx

# 3. Use host network (not recommended)
docker run --network host nginx

# Check all port bindings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### Cannot Access Container from Host

```bash
# Check container is running
docker ps

# Check port mapping
docker port container_name

# Test from host
curl http://localhost:8080
telnet localhost 8080

# Check if container listening
docker exec container_name netstat -tulpn
docker exec container_name ss -tulpn

# Common issues:

# 1. Container listening on 127.0.0.1
# Solution: Listen on 0.0.0.0
# Node.js: app.listen(3000, '0.0.0.0')
# Python: app.run(host='0.0.0.0', port=5000)

# 2. Wrong port mapped
docker run -p 8080:3000 myapp  # Container must listen on 3000

# 3. Firewall blocking
sudo ufw status
sudo firewall-cmd --list-all
```

## Volume Issues

### Data Not Persisting

```bash
# Check volumes
docker volume ls

# Check container mounts
docker inspect container_name --format='{{.Mounts}}'

# Common issues:

# 1. Anonymous volume used
docker run -v /data myapp  # Creates anonymous volume
# Solution: Use named volume
docker run -v mydata:/data myapp

# 2. Removed with -v flag
docker rm -v container_name  # Removes volumes!
# Solution: Don't use -v when removing containers

# 3. Wrong mount point
# Check if path matches in container
docker exec container_name ls -la /data
```

### Permission Denied on Volume

```bash
# Error: "permission denied"

# Check volume ownership
docker exec container_name ls -la /data

# Check container user
docker exec container_name id

# Solutions:

# 1. Fix ownership in Dockerfile
RUN chown -R appuser:appuser /data
USER appuser

# 2. Fix at runtime
docker run -v mydata:/data myapp
docker exec -u root container_name chown -R appuser:appuser /data

# 3. Match host and container UIDs
# Create user with specific UID
RUN useradd -u 1000 appuser

# 4. Use volume options
docker run -v mydata:/data:rw,uid=1000,gid=1000 myapp
```

### Volume Not Found

```bash
# Error: "volume not found"

# List volumes
docker volume ls

# Create volume first
docker volume create mydata

# Or let Docker create it
docker run -v mydata:/data myapp

# Check volume location
docker volume inspect mydata --format='{{.Mountpoint}}'

# Access volume data
sudo ls -la /var/lib/docker/volumes/mydata/_data
```

## Performance Issues

### High CPU Usage

```bash
# Monitor resource usage
docker stats

# Check specific container
docker stats container_name --no-stream

# Check processes in container
docker top container_name

# CPU profiling
docker exec container_name top
docker exec container_name ps aux --sort=-%cpu | head

# Solutions:

# 1. Set CPU limits
docker run --cpus=1.5 myapp
docker run --cpu-shares=512 myapp

# 2. Optimize application
# Use profiling tools
# Node.js: node --prof app.js
# Python: python -m cProfile app.py

# 3. Scale horizontally
docker-compose up --scale web=3
```

### High Memory Usage

```bash
# Check memory usage
docker stats container_name

# Check for memory leaks
docker exec container_name free -h
docker exec container_name ps aux --sort=-%mem | head

# Check OOM kills
dmesg | grep -i "killed process"
journalctl -u docker | grep -i "oom"

# Solutions:

# 1. Set memory limits
docker run -m 512m myapp
docker run -m 512m --memory-swap 1g myapp

# 2. Increase memory limit
docker update -m 1g container_name

# 3. Fix memory leaks
# Profile application
# Node.js: node --inspect app.js (use Chrome DevTools)
# Python: memory_profiler

# 4. Prevent OOM killer
docker run --oom-kill-disable -m 512m myapp
```

### Slow Container Startup

```bash
# Check startup time
time docker run --rm myapp echo "Ready"

# Check image size
docker images myapp

# Profile startup
docker run myapp time <startup-command>

# Solutions:

# 1. Reduce image size
# Use Alpine
# Multi-stage builds
# Remove unnecessary files

# 2. Optimize application startup
# Lazy load modules
# Reduce initial connections
# Use health checks with start_period

# 3. Use volume for dependencies
docker run -v node_modules:/app/node_modules myapp

# 4. Pre-pull images
docker pull myapp:latest
```

### Disk I/O Issues

```bash
# Check I/O stats
docker stats --format "table {{.Container}}\t{{.BlockIO}}"

# Check disk usage
docker system df
docker system df -v

# Check container disk usage
docker exec container_name df -h

# Solutions:

# 1. Clean up
docker system prune -a
docker volume prune

# 2. Use tmpfs for temporary data
docker run --tmpfs /tmp myapp

# 3. Use faster storage driver
# Check current driver
docker info | grep "Storage Driver"
# Consider overlay2 or zfs

# 4. Use volumes instead of bind mounts
docker run -v mydata:/data myapp
```

## Build Issues

### Build Cache Not Working

```bash
# Clear build cache
docker builder prune

# Build without cache
docker build --no-cache -t myapp .

# Check cache usage
docker build -t myapp .
# Look for "CACHED" in output

# Solutions:

# 1. Order instructions by change frequency
# Dependencies first, code last
COPY package*.json ./
RUN npm install
COPY . .

# 2. Use .dockerignore
# Exclude files that change frequently
node_modules
.git
*.log

# 3. Use BuildKit
export DOCKER_BUILDKIT=1
docker build -t myapp .
```

### BuildKit Issues

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Disable BuildKit
export DOCKER_BUILDKIT=0

# BuildKit cache issues
docker buildx prune

# BuildKit secrets not working
# Use syntax directive
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=npm,target=/root/.npmrc npm install

# Build with secrets
DOCKER_BUILDKIT=1 docker build --secret id=npm,src=$HOME/.npmrc .
```

### Multi-Stage Build Issues

```bash
# Check which stage failed
docker build --target <stage-name> -t debug .

# Test intermediate stage
docker build --target builder -t builder-debug .
docker run -it builder-debug /bin/sh

# COPY --from stage not working
# Ensure stage name matches
FROM node:18 AS builder  # Name: builder
FROM node:18-alpine
COPY --from=builder /app/dist ./dist  # Must match name
```

## Security Issues

### Vulnerable Images

```bash
# Scan for vulnerabilities
docker scan myapp:latest
trivy image myapp:latest
grype myapp:latest

# Check base image
docker inspect myapp --format='{{.Config.Image}}'

# Solutions:

# 1. Update base image
FROM node:18-alpine  # Latest patch version

# 2. Use minimal images
FROM gcr.io/distroless/nodejs18

# 3. Multi-stage builds
# Build with full image, run with minimal

# 4. Regular scanning in CI/CD
```

### Secrets Exposed

```bash
# Check for secrets in environment
docker inspect container_name --format='{{.Config.Env}}'

# Check for secrets in layers
docker history myapp:latest --no-trunc

# Solutions:

# 1. Use Docker secrets (Swarm)
docker secret create my_secret secret.txt

# 2. Use BuildKit secrets
RUN --mount=type=secret,id=npm npm install

# 3. Use external secret management
# AWS Secrets Manager, Vault, etc.

# 4. Never commit secrets
# Use .env files in .gitignore
# Use environment variables at runtime
```

### Container Running as Root

```bash
# Check user
docker exec container_name whoami
docker exec container_name id

# Solutions:

# 1. Create non-root user in Dockerfile
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# 2. Run with --user flag
docker run --user 1001:1001 myapp

# 3. Use security options
docker run --security-opt=no-new-privileges:true myapp
```

## Debugging Techniques

### Interactive Debugging

```bash
# Start container with shell
docker run -it myimage /bin/sh
docker run -it myimage /bin/bash

# Override entrypoint
docker run -it --entrypoint /bin/sh myimage

# Exec into running container
docker exec -it container_name /bin/sh
docker exec -it container_name bash

# Run as root (for debugging only)
docker exec -it -u root container_name bash

# Install debugging tools
docker exec -u root container_name apt-get update
docker exec -u root container_name apt-get install -y curl vim netcat
```

### Log Analysis

```bash
# Follow logs
docker logs -f container_name

# Last N lines
docker logs --tail 100 container_name

# Logs since specific time
docker logs --since 2024-01-15T10:00:00 container_name
docker logs --since 30m container_name

# Logs with timestamps
docker logs -t container_name

# Search logs
docker logs container_name 2>&1 | grep ERROR
docker logs container_name 2>&1 | grep -i "exception"

# Export logs
docker logs container_name > container.log 2>&1
```

### Network Debugging

```bash
# Check network connectivity
docker exec container_name ping google.com
docker exec container_name curl http://example.com

# Check DNS resolution
docker exec container_name nslookup example.com
docker exec container_name dig example.com

# Check listening ports
docker exec container_name netstat -tulpn
docker exec container_name ss -tulpn

# Check network interfaces
docker exec container_name ifconfig
docker exec container_name ip addr

# Trace route
docker exec container_name traceroute google.com

# Test specific port
docker exec container_name telnet hostname port
docker exec container_name nc -zv hostname port
```

### Process Debugging

```bash
# List processes
docker top container_name
docker exec container_name ps aux

# Process tree
docker exec container_name ps auxf

# Check specific process
docker exec container_name ps aux | grep nginx

# Send signal to process
docker exec container_name kill -USR1 <PID>

# Check process file descriptors
docker exec container_name ls -la /proc/<PID>/fd

# Check process environment
docker exec container_name cat /proc/<PID>/environ
```

### File System Debugging

```bash
# Check file system
docker exec container_name df -h
docker exec container_name du -sh /app

# Find large files
docker exec container_name du -ah /app | sort -hr | head -20

# Check file permissions
docker exec container_name ls -la /app

# Find files
docker exec container_name find /app -name "*.log"

# Check file contents
docker exec container_name cat /app/config.json

# Copy files from container
docker cp container_name:/app/logs ./local-logs

# Copy files to container
docker cp local-file.txt container_name:/app/
```

### System-Level Debugging

```bash
# Check Docker daemon
systemctl status docker
journalctl -u docker -f

# Docker system info
docker info
docker version

# Check disk usage
docker system df
docker system df -v

# Events
docker events
docker events --filter container=mycontainer

# Inspect everything
docker inspect container_name
docker inspect --format='{{json .State}}' container_name | jq

# Check resource limits
cat /sys/fs/cgroup/memory/docker/<container-id>/memory.limit_in_bytes
cat /sys/fs/cgroup/cpu/docker/<container-id>/cpu.shares
```

## Interview Questions

**Q1: Container keeps exiting with code 137. What does this mean?**
A: Exit code 137 = SIGKILL (Signal 9)
- **Cause**: OOM (Out of Memory) killer terminated the container
- **Diagnosis**: `docker logs container` and `dmesg | grep oom`
- **Solutions**: Increase memory limit, optimize application, fix memory leaks

**Q2: How do you debug a container that exits immediately?**
A:
```bash
# 1. Check logs
docker logs container_name

# 2. Override entrypoint
docker run -it --entrypoint /bin/sh myimage

# 3. Check what command runs
docker inspect myimage --format='{{.Config.Cmd}}'

# 4. Ensure foreground process
CMD ["nginx", "-g", "daemon off;"]
```

**Q3: Container can't resolve DNS. How do you fix this?**
A:
```bash
# 1. Check DNS settings
docker exec container cat /etc/resolv.conf

# 2. Use custom DNS
docker run --dns 8.8.8.8 --dns 8.8.4.4 myapp

# 3. Use custom network (has DNS)
docker network create mynet
docker run --network mynet myapp

# 4. Check /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```

**Q4: Image build is very slow. How do you optimize?**
A:
1. **Layer caching**: Order by change frequency
2. **.dockerignore**: Exclude unnecessary files
3. **Multi-stage builds**: Reduce final image size
4. **Combine RUN**: Fewer layers
5. **BuildKit**: Parallel builds (`DOCKER_BUILDKIT=1`)

**Q5: How do you find which layer is making the image large?**
```bash
# Method 1: docker history
docker history myimage --no-trunc --format "{{.Size}}\t{{.CreatedBy}}" | sort -hr

# Method 2: dive tool
dive myimage

# Method 3: docker inspect
docker inspect myimage --format='{{.Size}}'
```

**Q6: Container has high CPU usage. How do you investigate?**
```bash
# 1. Check stats
docker stats container_name

# 2. Check processes
docker top container_name
docker exec container ps aux --sort=-%cpu

# 3. Set CPU limits
docker update --cpus=1 container_name

# 4. Profile application
# Use language-specific profiling tools
```

**Q7: How do you debug networking between containers?**
```bash
# 1. Check if on same network
docker network inspect bridge

# 2. Test connectivity
docker exec container1 ping container2
docker exec container1 curl http://container2:port

# 3. Check DNS
docker exec container1 nslookup container2

# 4. Use custom network
docker network create mynet
docker run --network mynet container1
```

**Q8: Volume permission issues. How do you fix?**
```bash
# 1. Check ownership
docker exec container ls -la /data

# 2. Fix in Dockerfile
RUN chown -R appuser:appuser /data
USER appuser

# 3. Fix at runtime
docker exec -u root container chown -R appuser /data

# 4. Match UIDs
RUN useradd -u 1000 appuser
docker run -v mydata:/data myapp
```

**Q9: What tools do you use for Docker debugging?**
A:
- **Logs**: `docker logs`, CloudWatch, ELK
- **Monitoring**: `docker stats`, Prometheus, Grafana
- **Scanning**: Trivy, Grype, Snyk
- **Analysis**: `dive`, `docker history`
- **Inspection**: `docker inspect`, `docker events`
- **Network**: `tcpdump`, `netcat`, `curl`

**Q10: How do you troubleshoot a failing health check?**
```bash
# 1. Check health status
docker inspect container --format='{{.State.Health}}'

# 2. Run health check manually
docker exec container curl -f http://localhost/health

# 3. Check health check definition
docker inspect container --format='{{.Config.Healthcheck}}'

# 4. Increase timeout/start period
healthcheck:
  start_period: 60s  # Give more time to start
  timeout: 10s       # More time for check
```

## Summary

**Core Concepts:**

1. **Exit Codes (Systematic Diagnosis):**
   - **Exit 0**: Successful completion (normal)
   - **Exit 1**: Application error (check logs for stack trace)
   - **Exit 137**: SIGKILL = OOM killer (out of memory) - increase `memory` limit or fix leak
   - **Exit 139**: SIGSEGV = segmentation fault (memory corruption in code)
   - **Exit 143**: SIGTERM = graceful shutdown (normal during updates)
   - **Diagnosis**: `docker inspect container --format='{{.State.ExitCode}}'`

2. **Container Issues:**
   - **Won't Start**: Check logs (`docker logs`), inspect (`docker inspect`), verify port availability
   - **Keeps Restarting**: Crash loop - override entrypoint (`docker run -it --entrypoint /bin/sh`), test manually
   - **Exits Immediately**: No foreground process - use `CMD ["nginx", "-g", "daemon off;"]` not `CMD ["nginx"]`
   - **Port Conflicts**: "Address already in use" - use `lsof -i :8080` or `netstat -tulpn | grep 8080`
   - **OOM Killed**: Exit 137 - check `docker stats`, increase limit, or optimize application

3. **Network Issues:**
   - **Container-to-Container**: Check same network (`docker network inspect`), use custom network (not default bridge)
   - **DNS Resolution**: Default bridge has NO DNS - use custom network with automatic DNS
   - **Host-to-Container**: Check port mapping (`docker port`), ensure listening on 0.0.0.0 (not 127.0.0.1)
   - **Firewall**: Check `iptables -L DOCKER -n`, security groups (AWS), or host firewall rules
   - **Diagnosis**: `docker exec container1 ping container2`, `curl`, `nslookup`

4. **Volume Issues:**
   - **Data Not Persisting**: Anonymous volume or removed with `-v` flag - use named volumes
   - **Permission Denied**: UID/GID mismatch - fix with `chown` in Dockerfile or match UIDs
   - **Volume Not Found**: Create explicitly (`docker volume create`) or let Docker create on first use
   - **Diagnosis**: `docker volume ls`, `docker inspect container --format='{{.Mounts}}'`

5. **Performance Issues:**
   - **High CPU**: Check `docker stats`, `docker top`, set `--cpus` limit, profile application
   - **High Memory**: Check `docker stats`, look for leaks, set `-m` limit, check OOM kills in `dmesg`
   - **Slow Startup**: Reduce image size (Alpine, multi-stage), optimize app init, use health checks with `start_period`
   - **Disk I/O**: Check `docker system df`, use tmpfs for temp data, prune unused resources

6. **Image Issues:**
   - **Build Failures**: Use `--progress=plain --no-cache`, test stages with `--target`, check .dockerignore
   - **Image Too Large**: Use `docker history` to find large layers, `dive` tool, multi-stage builds, Alpine
   - **Pull Failures**: Authentication (`docker login`), network issues, manifest not found (wrong tag)
   - **Cache Not Working**: Order by change frequency, use .dockerignore, enable BuildKit

**Systematic Debugging Approach:**

**Step 1: Check Logs**
```bash
docker logs -f container_name
docker logs --tail 100 container_name
docker logs --since 30m container_name
```

**Step 2: Check Status & Resources**
```bash
docker ps -a  # Status, exit code, uptime
docker stats container_name  # CPU, memory, network, disk I/O
docker inspect container_name  # Full configuration
```

**Step 3: Interactive Debugging**
```bash
docker exec -it container_name /bin/sh
docker run -it --entrypoint /bin/sh image_name
docker exec -it -u root container_name bash  # Debug as root
```

**Step 4: Test Connectivity**
```bash
docker exec container ping google.com
docker exec container curl http://other-container:port
docker exec container nslookup service-name
```

**Step 5: Profile & Diagnose**
```bash
docker top container_name  # Process list
docker exec container ps aux --sort=-%cpu  # CPU usage
docker exec container ps aux --sort=-%mem  # Memory usage
docker exec container netstat -tulpn  # Listening ports
```

**Essential Debugging Commands:**

```bash
# === Logs & Status ===
docker logs -f container              # Follow logs in real-time
docker ps -a                          # All containers (including stopped)
docker inspect container              # Full container config/state
docker inspect container --format='{{.State.ExitCode}}'  # Exit code

# === Resource Monitoring ===
docker stats                          # Live resource usage
docker stats --no-stream container    # One-time snapshot
docker system df                      # Disk usage summary
docker system df -v                   # Verbose disk usage

# === Interactive Debugging ===
docker exec -it container sh          # Shell into running container
docker run -it --entrypoint sh image  # Override entrypoint
docker run -it --rm image /bin/bash   # Temporary debug container
docker exec -it -u root container sh  # Shell as root

# === Network Debugging ===
docker network inspect network_name   # Network configuration
docker exec container ping host       # Test connectivity
docker exec container curl http://api:3000  # Test HTTP
docker exec container nslookup service  # DNS resolution

# === Volume Debugging ===
docker volume ls                      # List volumes
docker inspect container --format='{{.Mounts}}'  # Volume mounts
docker volume inspect volume_name     # Volume details
docker exec container ls -la /data    # Check permissions

# === Build Debugging ===
docker build --progress=plain --no-cache .  # Detailed build output
docker history image --no-trunc       # Layer history
docker system prune -a                # Clean up everything

# === Cleanup ===
docker system prune -a --volumes      # Remove all unused resources
docker volume prune                   # Remove unused volumes
docker image prune -a                 # Remove unused images
```

**Best Practices:**

**Do:**
- ✅ Always check logs first (`docker logs`) - most issues are evident in logs
- ✅ Use `docker inspect` for complete container state and configuration
- ✅ Test manually with `docker exec -it container sh` before assuming root cause
- ✅ Check resource usage with `docker stats` for performance issues
- ✅ Use custom networks (not default bridge) for DNS resolution
- ✅ Set resource limits (`--cpus`, `-m`) to prevent runaway containers
- ✅ Implement health checks to detect failures automatically
- ✅ Use structured JSON logging for better searchability
- ✅ Monitor with Prometheus/Grafana/CloudWatch
- ✅ Scan images regularly with Trivy/Grype
- ✅ Document troubleshooting steps in runbooks

**Don't:**
- ❌ Never assume root cause without checking logs
- ❌ Never skip `docker ps -a` (stopped containers provide clues)
- ❌ Never ignore exit codes (137 = OOM, 1 = error, 143 = SIGTERM)
- ❌ Never use default bridge for production (no DNS)
- ❌ Never skip resource limits (containers can exhaust host)
- ❌ Never debug without understanding container lifecycle
- ❌ Never ignore health check failures
- ⚠️ Never modify production containers directly (exec changes are ephemeral)

**Key Insights:**
> - **Logs are the starting point** - `docker logs` reveals 80% of issues immediately
> - **Exit 137 = OOM** - most common production failure, always set memory limits
> - **Default bridge has no DNS** - use custom networks for automatic service discovery
> - **Containers are ephemeral** - changes via `docker exec` are lost on restart
> - **Systematic approach wins** - logs → status → resources → interactive → profile
> - **Health checks enable self-healing** - without them, orchestrators can't detect failures
> - **Prevention > debugging** - proper limits, health checks, logging prevent most issues

**Common Issues Quick Reference:**

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| **Exit 137 (OOM)** | `docker stats`, `dmesg \| grep oom` | Increase memory limit or fix leak |
| **Exit 1 (Error)** | `docker logs container` | Fix application error in logs |
| **Restart Loop** | `docker logs`, `docker events` | Fix app or health check, disable restart to debug |
| **Port Conflict** | `lsof -i :8080`, `netstat -tulpn` | Stop conflicting process or use different port |
| **Network Issues** | `docker network inspect`, `ping`, `curl` | Use custom network, check DNS, verify same network |
| **Permission Denied** | `docker exec container ls -la /data` | Fix ownership with `chown`, match UIDs |
| **High CPU/Memory** | `docker stats`, `docker top` | Set limits, profile app, optimize code |
| **DNS Failure** | `docker exec container nslookup host` | Use custom network (not default bridge) |
| **Image Too Large** | `docker history`, `dive image` | Multi-stage builds, Alpine, .dockerignore |
| **Slow Build** | Build output, layer cache | Order by change frequency, use BuildKit |

**Prevention Best Practices:**
- ✅ Configure health checks (catch failures before user impact)
- ✅ Set resource limits (prevent resource exhaustion)
- ✅ Implement structured logging (JSON format for searchability)
- ✅ Use monitoring tools (Prometheus, Grafana, CloudWatch)
- ✅ Regular security scanning (Trivy, Grype in CI/CD)
- ✅ Test in staging first (catch issues before production)
- ✅ Document runbooks (common issues and solutions)
- ✅ Use custom networks (automatic DNS resolution)
- ✅ Version images properly (not `latest`, use semantic versioning)
- ✅ Centralize logs (ELK, CloudWatch, Fluentd)

---

[← Docker with AWS](./08-docker-with-aws.md) | [Back to Docker README](./README.md)
