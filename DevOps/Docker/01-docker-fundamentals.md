# Docker Fundamentals for DevOps

## Overview

Docker is the de facto standard for containerization in DevOps. It enables consistent application deployment across environments, from development to production. This guide covers Docker essentials for DevOps engineers.

**Why Docker in DevOps:**
- "Works on my machine" problem solved
- Consistent environments (dev = staging = prod)
- Fast deployment (seconds vs minutes for VMs)
- Resource efficient (share OS kernel)
- Microservices architecture enabler
- CI/CD pipeline standard artifact

**Docker vs VMs:**

| Feature | Docker Containers | Virtual Machines |
|---------|------------------|------------------|
| **Start Time** | Seconds | Minutes |
| **Size** | MBs | GBs |
| **Resource Usage** | Low (shared kernel) | High (full OS) |
| **Isolation** | Process-level | Hardware-level |
| **Portability** | High | Medium |
| **Density** | 100s per host | 10s per host |

## Docker Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│                Docker Client                    │
│            (docker CLI commands)                │
└──────────────────┬──────────────────────────────┘
                   │ Docker API
┌──────────────────▼──────────────────────────────┐
│              Docker Daemon                      │
│           (dockerd - manages)                   │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Containers│  │  Images  │  │ Volumes  │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│  ┌──────────┐                                  │
│  │ Networks │                                  │
│  └──────────┘                                  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│           Container Runtime                     │
│         (containerd, runc)                      │
└─────────────────────────────────────────────────┘
```

### Key Concepts

**Image**: Read-only template with application code and dependencies
**Container**: Running instance of an image
**Dockerfile**: Instructions to build an image
**Registry**: Storage for images (Docker Hub, AWS ECR)
**Volume**: Persistent data storage
**Network**: Communication between containers

## Docker Installation

### Linux (Ubuntu/Debian)

```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Add user to docker group (avoid using sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker run hello-world
```

### Amazon Linux 2 (EC2)

```bash
# Update packages
sudo yum update -y

# Install Docker
sudo amazon-linux-extras install docker -y

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker ec2-user
newgrp docker

# Verify
docker --version
docker run hello-world
```

## Docker Commands

### Container Lifecycle

```bash
# Run container
docker run nginx                          # Run in foreground
docker run -d nginx                       # Run detached (background)
docker run -d --name webserver nginx      # Run with name
docker run -d -p 8080:80 nginx           # Port mapping (host:container)
docker run -d -p 8080:80 -p 8443:443 nginx  # Multiple ports
docker run -d -e ENV_VAR=value nginx     # Environment variable
docker run -d -v $(pwd):/app nginx       # Volume mount
docker run -d --restart always nginx     # Auto-restart policy
docker run -it ubuntu /bin/bash          # Interactive terminal
docker run --rm alpine echo "hello"      # Remove after exit
docker run -d --memory="512m" nginx      # Memory limit
docker run -d --cpus="1.5" nginx         # CPU limit

# List containers
docker ps                                # Running containers
docker ps -a                             # All containers
docker ps -q                             # Only container IDs
docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}"

# Container management
docker start container_id                # Start stopped container
docker stop container_id                 # Graceful stop (SIGTERM)
docker stop $(docker ps -q)              # Stop all running
docker kill container_id                 # Force stop (SIGKILL)
docker restart container_id              # Restart container
docker pause container_id                # Pause processes
docker unpause container_id              # Resume processes
docker rm container_id                   # Remove stopped container
docker rm -f container_id                # Force remove running
docker rm $(docker ps -aq)               # Remove all stopped

# Container inspection
docker logs container_id                 # View logs
docker logs -f container_id              # Follow logs (tail -f)
docker logs --tail 100 container_id      # Last 100 lines
docker logs --since 30m container_id     # Last 30 minutes
docker inspect container_id              # Detailed info (JSON)
docker stats                             # Live resource usage
docker stats --no-stream                 # One-time stats
docker top container_id                  # Running processes

# Execute commands in container
docker exec container_id ls              # Run command
docker exec -it container_id /bin/bash   # Interactive shell
docker exec -it container_id sh          # Alpine uses sh
docker exec -u root container_id whoami  # Run as root

# Copy files
docker cp file.txt container_id:/app/    # Copy to container
docker cp container_id:/app/file.txt .   # Copy from container

# Container networking
docker port container_id                 # Show port mappings
docker network ls                        # List networks
docker network inspect bridge            # Network details
```

### Image Management

```bash
# Pull images
docker pull nginx                        # Pull latest
docker pull nginx:1.21                   # Specific version
docker pull nginx:1.21-alpine            # Alpine variant
docker pull public.ecr.aws/nginx/nginx   # From ECR Public

# Build images
docker build -t myapp:v1.0 .             # Build from Dockerfile
docker build -t myapp:v1.0 -f Dockerfile.prod .  # Specific Dockerfile
docker build --no-cache -t myapp:v1.0 .  # Build without cache
docker build --build-arg VERSION=1.0 .   # Pass build arguments

# List images
docker images                            # List all images
docker images -q                         # Only image IDs
docker images --filter "dangling=true"   # Untagged images
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Image inspection
docker history nginx                     # Image layers
docker inspect nginx                     # Image details

# Tag images
docker tag myapp:v1.0 myapp:latest       # Add tag
docker tag myapp:v1.0 myrepo/myapp:v1.0  # Tag for registry

# Push to registry
docker login                             # Login to Docker Hub
docker push myrepo/myapp:v1.0            # Push to Docker Hub

# AWS ECR
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin \
    123456789012.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0

# Remove images
docker rmi image_id                      # Remove image
docker rmi $(docker images -q)           # Remove all images
docker image prune                       # Remove dangling images
docker image prune -a                    # Remove unused images

# Save/Load images
docker save myapp:v1.0 -o myapp.tar      # Export to file
docker load -i myapp.tar                 # Import from file
docker export container_id -o container.tar  # Export container
docker import container.tar              # Import container
```

## Dockerfile

### Dockerfile Basics

```dockerfile
# Base image
FROM ubuntu:20.04
# or
FROM node:16-alpine

# Metadata
LABEL maintainer="dev@example.com"
LABEL version="1.0"
LABEL description="My application"

# Environment variables
ENV NODE_ENV=production
ENV APP_PORT=3000
ENV PATH="/app/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy files
COPY package.json package-lock.json ./
COPY src/ ./src/
COPY . .

# Run commands (build time)
RUN apt-get update && apt-get install -y curl
RUN npm install
RUN npm run build

# Expose ports (documentation only)
EXPOSE 3000
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Volume mount point
VOLUME ["/data"]

# User to run as (non-root)
USER node

# Default command (runtime)
CMD ["node", "server.js"]
# or
ENTRYPOINT ["node"]
CMD ["server.js"]
```

### Real-World Examples

#### Node.js Application

```dockerfile
# Multi-stage build
FROM node:16-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:16-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built assets from build stage
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start application
CMD ["node", "dist/server.js"]
```

#### Python Application

```dockerfile
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "app:app"]
```

#### Go Application

```dockerfile
# Build stage
FROM golang:1.19-alpine AS builder

WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary from builder
COPY --from=builder /build/main .

# Expose port
EXPOSE 8080

# Run binary
CMD ["./main"]
```

## Docker Compose

### docker-compose.yml Structure

```yaml
version: '3.8'

services:
  # Web application
  web:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - VERSION=1.0
    image: myapp:latest
    container_name: myapp-web
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://db:5432/myapp
    env_file:
      - .env
    volumes:
      - ./src:/app/src
      - /app/node_modules
      - uploads:/app/uploads
    depends_on:
      - db
      - redis
    networks:
      - app-network
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
        reservations:
          cpus: '1'
          memory: 512M

  # Database
  db:
    image: postgres:14-alpine
    container_name: myapp-db
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: admin
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - app-network
    restart: unless-stopped
    secrets:
      - db_password

  # Redis cache
  redis:
    image: redis:7-alpine
    container_name: myapp-redis
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - app-network
    restart: unless-stopped

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: myapp-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - web
    networks:
      - app-network
    restart: unless-stopped

volumes:
  db-data:
    driver: local
  redis-data:
    driver: local
  uploads:
    driver: local

networks:
  app-network:
    driver: bridge

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Docker Compose Commands

```bash
# Start services
docker-compose up                        # Start in foreground
docker-compose up -d                     # Start detached
docker-compose up --build                # Rebuild images
docker-compose up -d --scale web=3       # Scale service

# Stop services
docker-compose stop                      # Stop services
docker-compose down                      # Stop and remove containers
docker-compose down -v                   # Also remove volumes
docker-compose down --rmi all            # Also remove images

# Service management
docker-compose start                     # Start stopped services
docker-compose restart                   # Restart services
docker-compose pause                     # Pause services
docker-compose unpause                   # Unpause services

# View status
docker-compose ps                        # List containers
docker-compose ps -a                     # All containers
docker-compose top                       # Running processes
docker-compose logs                      # View logs
docker-compose logs -f                   # Follow logs
docker-compose logs -f web               # Follow specific service
docker-compose logs --tail=100 web       # Last 100 lines

# Execute commands
docker-compose exec web bash             # Shell in web service
docker-compose exec web npm test         # Run command
docker-compose run web npm install       # Run one-off command

# Build and pull
docker-compose build                     # Build images
docker-compose build --no-cache          # Build without cache
docker-compose pull                      # Pull images

# Validate configuration
docker-compose config                    # Validate and view config
docker-compose config --services         # List services
docker-compose config --volumes          # List volumes
```

## Docker Networking

### Network Types

```bash
# Bridge (default)
docker network create mybridge           # Custom bridge
docker run -d --network mybridge nginx

# Host (share host network)
docker run -d --network host nginx       # No port mapping needed

# None (no networking)
docker run -d --network none alpine

# Create custom network
docker network create --driver bridge \
    --subnet=172.20.0.0/16 \
    --gateway=172.20.0.1 \
    mynetwork

# Connect container to network
docker network connect mynetwork container_id
docker network disconnect mynetwork container_id

# Inspect network
docker network inspect bridge
docker network ls

# Remove network
docker network rm mynetwork
docker network prune                     # Remove unused networks
```

### Container Communication

```bash
# Containers on same network can communicate by name
# docker-compose.yml automatically creates network

# Example: web container connects to db
# Database URL: postgres://db:5432/myapp
# "db" is the service name, resolved by Docker DNS

# Manual network creation
docker network create app-net
docker run -d --name db --network app-net postgres
docker run -d --name web --network app-net -p 80:80 nginx

# Inside web container:
curl http://db:5432  # Connects to postgres container
```

## Docker Volumes

### Volume Types

```bash
# Named volumes (managed by Docker)
docker volume create mydata
docker run -d -v mydata:/data nginx

# Bind mounts (host directory)
docker run -d -v $(pwd)/data:/data nginx
docker run -d -v /host/path:/container/path nginx

# Anonymous volumes
docker run -d -v /data nginx

# Read-only volumes
docker run -d -v $(pwd)/config:/config:ro nginx

# Volume management
docker volume ls                         # List volumes
docker volume inspect mydata             # Volume details
docker volume rm mydata                  # Remove volume
docker volume prune                      # Remove unused volumes

# Backup volume
docker run --rm \
    -v mydata:/data \
    -v $(pwd):/backup \
    alpine tar czf /backup/data-backup.tar.gz -C /data .

# Restore volume
docker run --rm \
    -v mydata:/data \
    -v $(pwd):/backup \
    alpine tar xzf /backup/data-backup.tar.gz -C /data
```

### AWS EBS Volumes with Docker

```bash
# On EC2 instance
# 1. Attach EBS volume to instance
# 2. Format and mount
sudo mkfs -t ext4 /dev/xvdf
sudo mkdir /data
sudo mount /dev/xvdf /data

# 3. Use bind mount
docker run -d -v /data:/app/data myapp
```

## Docker Best Practices

### Security

```dockerfile
# ✅ Good practices

# 1. Use official base images
FROM node:16-alpine
# Not: FROM random-image-from-internet

# 2. Minimize image layers
RUN apt-get update && apt-get install -y \
    package1 \
    package2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
# Not: Multiple RUN commands

# 3. Don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
# Not: Running as root

# 4. Use multi-stage builds
FROM node:16 AS builder
# ... build steps ...
FROM node:16-alpine
COPY --from=builder /app/dist ./dist

# 5. Scan for vulnerabilities
# docker scan myimage:latest
# trivy image myimage:latest

# 6. Use specific versions
FROM node:16.14-alpine
# Not: FROM node:latest

# 7. Minimize attack surface
FROM alpine:3.15
RUN apk add --no-cache nodejs
# Better than full Ubuntu image
```

### .dockerignore

```bash
# .dockerignore file
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
*.md
.vscode
.idea
.DS_Store
dist
build
coverage
.terraform
*.log
```

### Optimization

```dockerfile
# ✅ Optimize build speed and image size

# 1. Order layers by change frequency
FROM node:16-alpine
WORKDIR /app

# Dependencies change less frequently - cache this layer
COPY package*.json ./
RUN npm ci --only=production

# Code changes frequently - put last
COPY . .

# 2. Use .dockerignore
# Excludes unnecessary files from build context

# 3. Minimize layers
RUN apk add --no-cache git && \
    git clone repo && \
    apk del git
# Single layer instead of 3

# 4. Use specific COPY
COPY package*.json ./          # Specific files
# Not: COPY . .                # Everything
```

## Interview Questions

**Q1: What's the difference between Docker Image and Container?**
A: An **image** is a read-only template with application code and dependencies. A **container** is a running instance of an image. Analogy: Image is like a class, container is like an object.

**Q2: What's the difference between CMD and ENTRYPOINT?**
A:
- `CMD`: Provides defaults, can be overridden by `docker run` arguments
- `ENTRYPOINT`: Defines the container's executable, harder to override
- Best practice: Use `ENTRYPOINT` for the executable, `CMD` for default parameters

```dockerfile
ENTRYPOINT ["python"]
CMD ["app.py"]

# docker run myimage        -> python app.py
# docker run myimage test.py -> python test.py
```

**Q3: How do you reduce Docker image size?**
A:
1. Use Alpine base images
2. Multi-stage builds
3. Minimize layers (combine RUN commands)
4. Remove unnecessary files
5. Use .dockerignore
6. Use `--no-cache` with package managers

**Q4: What's the difference between COPY and ADD?**
A: `COPY` simply copies files. `ADD` has additional features (auto-extract tar, fetch from URL). **Best practice**: Use `COPY` unless you specifically need ADD features.

**Q5: How do you persist data in Docker?**
A: Use Docker volumes:
- Named volumes: Managed by Docker, best for production
- Bind mounts: Direct host path mapping, good for development
- Volumes persist even when containers are removed

**Q6: What are the benefits of multi-stage builds?**
A:
1. Smaller final image (only runtime dependencies)
2. Separate build and runtime environments
3. Better security (no build tools in production)
4. Single Dockerfile for entire pipeline

**Q7: How do you debug a failing container?**
```bash
# 1. Check logs
docker logs container_id

# 2. Check exit code
docker ps -a  # Look at STATUS

# 3. Inspect container
docker inspect container_id

# 4. Access shell
docker exec -it container_id /bin/sh

# 5. Override entrypoint
docker run -it --entrypoint /bin/sh myimage

# 6. Check resource usage
docker stats container_id
```

## Summary

**Core Concepts:**

1. **Docker Architecture:**
   - ✅ Client → Daemon → Container Runtime
   - ✅ Images (templates) → Containers (running instances)
   - ✅ Dockerfile (build instructions)
   - ✅ Registry (Docker Hub, ECR, GCR)

2. **Essential Commands:**
   - **Images**: `docker build`, `docker pull`, `docker push`, `docker images`
   - **Containers**: `docker run`, `docker ps`, `docker stop`, `docker rm`
   - **Debug**: `docker logs`, `docker exec`, `docker inspect`
   - **Cleanup**: `docker system prune`

3. **Key Features:**
   - ✅ Layered filesystem (efficient storage)
   - ✅ Copy-on-write (fast container creation)
   - ✅ Volumes for persistent data
   - ✅ Networks for container communication
   - ✅ Port mapping for external access

4. **Best Practices:**
   - ✅ Use official base images
   - ✅ Multi-stage builds for smaller images
   - ✅ One process per container
   - ✅ Use .dockerignore
   - ✅ Don't run as root
   - ✅ Tag images properly (not just `latest`)

5. **DevOps Integration:**
   - ✅ CI/CD: Build → Test → Push → Deploy
   - ✅ Artifact: Docker image is deployable unit
   - ✅ Environment parity: Same image everywhere
   - ✅ Microservices: One service per container

**Key Insights:**
> - Containers share the host OS kernel (lightweight)
> - Images are immutable, containers are ephemeral
> - Volumes persist data beyond container lifecycle
> - Multi-stage builds reduce final image size by 10x+
> - Docker is the foundation for Kubernetes and cloud container services

---
[← Back to DevOps](../README.md) | [Next: Dockerfile Best Practices →](./02-dockerfile.md)
