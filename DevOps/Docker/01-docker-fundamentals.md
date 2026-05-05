# Docker Fundamentals

## Overview

Docker packages apps into **containers** — isolated, lightweight units that run the same way everywhere.

**Docker vs Virtual Machines:**

| Feature | Docker | VM |
|---------|--------|----|
| **Start Time** | Seconds | Minutes |
| **Size** | MBs | GBs |
| **Isolation** | Process-level | Hardware-level |
| **Resource Use** | Low (shared kernel) | High (full OS) |

## Core Concepts

| Term | What It Is |
|------|------------|
| **Image** | Read-only template (like a class) |
| **Container** | Running instance of an image (like an object) |
| **Dockerfile** | Instructions to build an image |
| **Registry** | Storage for images (Docker Hub, AWS ECR) |
| **Volume** | Persistent data storage |
| **Network** | Communication between containers |

## Essential Commands

**Container lifecycle:**
```bash
docker run -d -p 8080:80 --name web nginx    # Run detached with port mapping
docker run -it ubuntu /bin/bash              # Interactive terminal
docker run --rm alpine echo "hello"          # Remove after exit

docker ps                    # Running containers
docker ps -a                 # All containers
docker stop container_id     # Graceful stop (SIGTERM)
docker rm container_id       # Remove stopped container
docker rm -f container_id    # Force remove running container
```

**Logs and debug:**
```bash
docker logs -f container_id           # Follow logs
docker exec -it container_id /bin/sh  # Shell into container
docker inspect container_id           # Detailed config (JSON)
docker stats                          # Live CPU/memory usage
```

**Image management:**
```bash
docker build -t myapp:v1 .            # Build image
docker images                         # List images
docker pull nginx:alpine              # Pull image
docker push myrepo/myapp:v1           # Push to registry
docker rmi image_id                   # Remove image
docker system prune                   # Clean up unused resources
```

## Basic Dockerfile

```dockerfile
FROM node:18-alpine                   # Use specific version
WORKDIR /app                          # Set working directory
COPY package*.json ./                 # Copy package files first (cache)
RUN npm ci --only=production          # Install dependencies
COPY . .                              # Copy source code last
EXPOSE 3000                           # Document port (informational)
USER node                             # Run as non-root
CMD ["node", "server.js"]             # Start command
```

## Docker Compose Basics

```yaml
version: '3.8'
services:
  web:
    build: .
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=production
    depends_on: [db]

  db:
    image: postgres:14-alpine
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

**Compose commands:**
```bash
docker-compose up -d          # Start detached
docker-compose down           # Stop and remove
docker-compose logs -f web    # Follow service logs
docker-compose exec web bash  # Shell into service
```

## Interview Q&A

**Q: Image vs Container?**
Image = read-only template. Container = running instance. Like a class vs an object.

**Q: CMD vs ENTRYPOINT?**
- `CMD` — default command, easily overridden by `docker run` args
- `ENTRYPOINT` — the main executable, harder to override
- Best practice: use both — `ENTRYPOINT ["node"]` + `CMD ["server.js"]`

**Q: How do you debug a failing container?**
```bash
docker logs container_id                    # Check logs first
docker inspect container_id                 # Check configuration
docker exec -it container_id sh             # Access shell
docker run -it --entrypoint sh myimage      # Override entrypoint to explore
```

**Q: COPY vs ADD?**
Use `COPY` always. `ADD` has extra features (auto-extract tar, fetch URLs) that can cause unexpected behavior.

---
[← DevOps](../README.md) | [Dockerfile Best Practices →](./02-dockerfile-best-practices.md)
