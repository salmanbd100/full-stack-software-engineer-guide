# Docker Compose Advanced

## Overview

Docker Compose is the standard tool for defining and running multi-container Docker applications. This guide covers advanced patterns, production configurations, and real-world architectures used in microservices and full-stack applications.

**Why Docker Compose:**
- Multi-container orchestration with single command
- Declarative configuration (YAML)
- Service discovery via DNS (automatic)
- Development environment reproducibility
- Perfect for local dev and small deployments
- Foundation before Kubernetes

**Compose vs Alternatives:**

| Feature | Docker Compose | Kubernetes | Docker Swarm |
|---------|---------------|------------|--------------|
| **Complexity** | Simple | Complex | Medium |
| **Scale** | Single host | Multi-host cluster | Multi-host cluster |
| **Use Case** | Dev, small prod | Production at scale | Small-medium prod |
| **Learning Curve** | Easy | Steep | Medium |
| **Setup** | Instant | Complex | Medium |

## Table of Contents
- [Docker Compose Syntax](#docker-compose-syntax)
- [Service Configuration](#service-configuration)
- [Networking Strategies](#networking-strategies)
- [Volume Management](#volume-management)
- [Environment Management](#environment-management)
- [Production Patterns](#production-patterns)
- [Real-World Examples](#real-world-examples)
- [Interview Questions](#interview-questions)

## Docker Compose Syntax

### Version and Structure

```yaml
version: '3.8'  # Compose file format version

services:   # Define containers
  web:
    # service configuration
  db:
    # service configuration

volumes:    # Named volumes
  data:

networks:   # Custom networks
  frontend:
  backend:

secrets:    # Secrets (Swarm mode)
  db_password:

configs:    # Configs (Swarm mode)
  nginx_config:
```

### Compose File Versions

```yaml
# Version 3.8 (latest for standalone Docker Compose)
version: '3.8'  # Requires Docker Engine 19.03.0+

# Version 3.9 - with profiles
version: '3.9'  # Profiles support

# Features by version:
# 3.0: Basic orchestration
# 3.1: Secrets support
# 3.4: Long syntax for configs
# 3.7: init option
# 3.8: Max service replicas
```

## Service Configuration

### Image vs Build

```yaml
services:
  # Using pre-built image
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"

  # Building from Dockerfile
  web:
    build:
      context: ./web
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
        - BUILD_DATE=${BUILD_DATE}
      target: production
      cache_from:
        - myapp:cache
    image: myapp:latest  # Tag built image
```

### Container Configuration

```yaml
services:
  web:
    image: nginx:alpine
    container_name: my-nginx  # Custom name (not recommended for scaling)

    # Hostname and networking
    hostname: webserver
    domainname: example.com

    # Restart policy
    restart: unless-stopped  # no|always|on-failure|unless-stopped

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M

    # Security options
    cap_add:
      - NET_ADMIN
    cap_drop:
      - ALL

    privileged: false
    read_only: true

    # User
    user: "1000:1000"

    # Working directory
    working_dir: /app

    # Command override
    command: ["nginx", "-g", "daemon off;"]

    # Entrypoint override
    entrypoint: ["/docker-entrypoint.sh"]

    # Init process
    init: true

    # Stop signal and timeout
    stop_signal: SIGTERM
    stop_grace_period: 30s
```

### Depends On and Health Checks

```yaml
services:
  web:
    image: myapp:latest
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:14-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:alpine
    # No healthcheck, just wait for start
```

### Environment Variables

```yaml
services:
  web:
    image: myapp:latest

    # Method 1: Direct definition
    environment:
      NODE_ENV: production
      API_URL: https://api.example.com
      DEBUG: "false"
      PORT: 3000

    # Method 2: Array format
    environment:
      - NODE_ENV=production
      - API_URL=https://api.example.com

    # Method 3: Environment file
    env_file:
      - .env
      - .env.production

    # Variable substitution
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}
```

### Ports and Expose

```yaml
services:
  web:
    image: nginx:alpine

    # Publish ports (host:container)
    ports:
      - "8080:80"        # Short syntax
      - "8443:443"
      - "127.0.0.1:8080:80"  # Bind to specific IP

    # Long syntax
    ports:
      - target: 80       # Container port
        published: 8080  # Host port
        protocol: tcp
        mode: host

    # Expose to other services only (not to host)
    expose:
      - "3000"
      - "3001"
```

## Networking Strategies

### Default Network

```yaml
# Services automatically join default network
services:
  web:
    image: nginx
  db:
    image: postgres
# web can reach db at: http://db:5432
```

### Custom Networks

```yaml
version: '3.8'

services:
  frontend:
    image: react-app
    networks:
      - frontend-net

  backend:
    image: node-api
    networks:
      - frontend-net
      - backend-net

  db:
    image: postgres
    networks:
      - backend-net

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
    internal: true  # No external access

# frontend → backend → db
# frontend ⤬ db (isolated)
```

### Network Configuration

```yaml
networks:
  app-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: app-br0
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
    labels:
      environment: production

  host-network:
    external: true
    name: host

services:
  web:
    networks:
      app-network:
        ipv4_address: 172.20.0.10
        aliases:
          - webapp
          - api.example.com
```

### Service Discovery

```yaml
services:
  web:
    image: myapp
    environment:
      # Services discoverable by name
      DATABASE_URL: postgres://db:5432/mydb
      REDIS_URL: redis://cache:6379
      API_URL: http://api:3000
    depends_on:
      - db
      - cache
      - api

  db:
    image: postgres:14-alpine
    # Accessible at: db, db:5432

  cache:
    image: redis:alpine
    # Accessible at: cache, cache:6379

  api:
    image: api-service
    # Accessible at: api, api:3000
```

## Volume Management

### Volume Types

```yaml
services:
  web:
    image: myapp
    volumes:
      # Named volume
      - db-data:/var/lib/postgresql/data

      # Bind mount (host path)
      - ./src:/app/src
      - /host/logs:/app/logs

      # Anonymous volume
      - /app/node_modules

      # Read-only
      - ./config:/app/config:ro

      # Long syntax
      - type: volume
        source: db-data
        target: /var/lib/postgresql/data
        volume:
          nocopy: true

      - type: bind
        source: ./src
        target: /app/src
        bind:
          propagation: shared

      - type: tmpfs
        target: /app/temp
        tmpfs:
          size: 1000000  # bytes

volumes:
  db-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/on/host
```

### Volume Configurations

```yaml
volumes:
  # Simple named volume
  db-data:

  # With driver options
  postgres-data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=10.0.0.1,rw
      device: ":/path/to/dir"

  # External volume (pre-created)
  existing-data:
    external: true
    name: my-existing-volume

  # NFS volume
  nfs-volume:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs.example.com,rw,soft
      device: ":/exports/data"
```

## Environment Management

### Multiple Environment Files

```yaml
# docker-compose.yml (base)
version: '3.8'
services:
  web:
    image: myapp:latest
    env_file:
      - .env
      - .env.${ENVIRONMENT}

# docker-compose.override.yml (development - auto-loaded)
services:
  web:
    build: .
    volumes:
      - ./src:/app/src
    environment:
      DEBUG: "true"

# docker-compose.prod.yml (production)
services:
  web:
    restart: always
    environment:
      NODE_ENV: production
    deploy:
      replicas: 3

# Run commands:
# Development: docker-compose up
# Production:  docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### Variable Substitution

```yaml
# .env file
DB_USER=admin
DB_PASS=secret
DB_NAME=myapp
APP_VERSION=1.0.0

# docker-compose.yml
services:
  web:
    image: myapp:${APP_VERSION:-latest}
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}
      VERSION: ${APP_VERSION}

  db:
    image: postgres:${POSTGRES_VERSION:-14}-alpine
```

### Profiles (Docker Compose 1.28+)

```yaml
version: '3.9'

services:
  # Core services (always run)
  web:
    image: myapp
    ports:
      - "3000:3000"

  db:
    image: postgres:14-alpine

  # Development tools
  pgadmin:
    image: dpage/pgadmin4
    profiles:
      - dev
    ports:
      - "5050:80"

  # Testing services
  test-runner:
    image: myapp:test
    profiles:
      - test
    command: npm test

  # Production monitoring
  prometheus:
    image: prom/prometheus
    profiles:
      - prod
      - monitoring

# Run specific profiles:
# docker-compose --profile dev up       # web, db, pgadmin
# docker-compose --profile test up      # web, db, test-runner
# docker-compose --profile prod up      # web, db, prometheus
# docker-compose --profile dev --profile test up  # Multiple profiles
```

## Production Patterns

### Full-Stack Application

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    build:
      context: ./frontend
      target: production
    image: myapp-frontend:latest
    restart: unless-stopped
    networks:
      - frontend-net
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API
  backend:
    build:
      context: ./backend
      target: production
    image: myapp-backend:latest
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/myapp
      REDIS_URL: redis://redis:6379
    networks:
      - frontend-net
      - backend-net
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Database
  db:
    image: postgres:14-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - backend-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - backend-net

  # Reverse Proxy
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
      - ./nginx/html:/usr/share/nginx/html:ro
    networks:
      - frontend-net
    depends_on:
      - frontend
      - backend
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
    internal: true
```

### Microservices Architecture

```yaml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: ./gateway
    ports:
      - "8080:8080"
    environment:
      USER_SERVICE_URL: http://user-service:3000
      ORDER_SERVICE_URL: http://order-service:3000
      PRODUCT_SERVICE_URL: http://product-service:3000
    networks:
      - frontend-net
    depends_on:
      - user-service
      - order-service
      - product-service

  # User Service
  user-service:
    build: ./services/user
    environment:
      DATABASE_URL: postgres://postgres:pass@user-db:5432/users
      REDIS_URL: redis://redis:6379/0
    networks:
      - frontend-net
      - user-net
    depends_on:
      - user-db
      - redis

  user-db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: users
      POSTGRES_PASSWORD: pass
    volumes:
      - user-db-data:/var/lib/postgresql/data
    networks:
      - user-net

  # Order Service
  order-service:
    build: ./services/order
    environment:
      DATABASE_URL: postgres://postgres:pass@order-db:5432/orders
      REDIS_URL: redis://redis:6379/1
    networks:
      - frontend-net
      - order-net
    depends_on:
      - order-db
      - redis

  order-db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_PASSWORD: pass
    volumes:
      - order-db-data:/var/lib/postgresql/data
    networks:
      - order-net

  # Product Service
  product-service:
    build: ./services/product
    environment:
      DATABASE_URL: postgres://postgres:pass@product-db:5432/products
      REDIS_URL: redis://redis:6379/2
    networks:
      - frontend-net
      - product-net
    depends_on:
      - product-db
      - redis

  product-db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: products
      POSTGRES_PASSWORD: pass
    volumes:
      - product-db-data:/var/lib/postgresql/data
    networks:
      - product-net

  # Shared Redis
  redis:
    image: redis:7-alpine
    networks:
      - user-net
      - order-net
      - product-net
    volumes:
      - redis-data:/data

volumes:
  user-db-data:
  order-db-data:
  product-db-data:
  redis-data:

networks:
  frontend-net:
  user-net:
  order-net:
  product-net:
```

## Real-World Examples

### MERN Stack

```yaml
version: '3.8'

services:
  # MongoDB
  mongo:
    image: mongo:6
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo-data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - backend
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  # Express Backend
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongo:27017/myapp?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      PORT: 5000
    networks:
      - frontend
      - backend
    depends_on:
      mongo:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # React Frontend
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        REACT_APP_API_URL: http://localhost/api
    restart: always
    networks:
      - frontend
    depends_on:
      - api

  # Nginx
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - frontend
    depends_on:
      - web
      - api

volumes:
  mongo-data:

networks:
  frontend:
  backend:
    internal: true
```

### Laravel with MySQL

```yaml
version: '3.8'

services:
  # Nginx
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./:/var/www
      - ./docker/nginx/conf.d:/etc/nginx/conf.d
    networks:
      - laravel
    depends_on:
      - php

  # PHP-FPM
  php:
    build:
      context: .
      dockerfile: ./docker/php/Dockerfile
    restart: unless-stopped
    volumes:
      - ./:/var/www
    environment:
      DB_HOST: mysql
      DB_DATABASE: ${DB_DATABASE}
      DB_USERNAME: ${DB_USERNAME}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
    networks:
      - laravel
    depends_on:
      mysql:
        condition: service_healthy

  # MySQL
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${DB_DATABASE}
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_USER: ${DB_USERNAME}
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - laravel
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:alpine
    restart: unless-stopped
    networks:
      - laravel

  # Queue Worker
  queue:
    build:
      context: .
      dockerfile: ./docker/php/Dockerfile
    restart: unless-stopped
    command: php artisan queue:work
    volumes:
      - ./:/var/www
    networks:
      - laravel
    depends_on:
      - php
      - redis

volumes:
  mysql-data:

networks:
  laravel:
    driver: bridge
```

## Interview Questions

**Q1: What's the difference between `docker-compose up` and `docker-compose start`?**
A:
- `docker-compose up`: Creates and starts containers, networks, volumes
- `docker-compose start`: Only starts existing stopped containers
- Use `up` for first run or after config changes
- Use `start` to restart stopped services

**Q2: How does service discovery work in Docker Compose?**
A: Docker Compose creates a default network where services can reach each other by service name. DNS resolution is automatic:
```yaml
services:
  web:
    # Can connect to: postgres://db:5432
  db:
    image: postgres
```
Service name becomes hostname on the network.

**Q3: What's the purpose of `depends_on`?**
A: Controls startup order and dependencies:
```yaml
web:
  depends_on:
    db:
      condition: service_healthy  # Wait for health check
```
**Note**: Doesn't wait for service to be "ready," only for container to start (unless health check specified).

**Q4: How do you scale services with Docker Compose?**
```bash
# Scale to 3 instances
docker-compose up -d --scale web=3

# Requirements:
# - No container_name (must be auto-generated)
# - No fixed host ports (use random: "80" not "8080:80")
```

**Q5: What's the difference between volumes and bind mounts?**
A:
- **Volumes**: Managed by Docker, stored in Docker area, best for production
  ```yaml
  volumes:
    - db-data:/var/lib/postgresql/data
  ```
- **Bind mounts**: Direct host path mapping, good for development
  ```yaml
  volumes:
    - ./src:/app/src
  ```

**Q6: How do you manage secrets in Docker Compose?**
A:
```yaml
# Docker Swarm secrets
secrets:
  db_password:
    file: ./secrets/db_password.txt

services:
  db:
    secrets:
      - db_password
    # Available at: /run/secrets/db_password

# For non-Swarm: use environment variables
services:
  db:
    environment:
      DB_PASSWORD: ${DB_PASSWORD}  # From .env file
```

**Q7: What are Docker Compose profiles used for?**
A: Selectively enable services:
```yaml
services:
  web:
    # Always runs

  debug:
    profiles: ["debug"]
    # Only runs with: docker-compose --profile debug up

# Use cases:
# - Development tools
# - Testing services
# - Monitoring stack
# - Database admin tools
```

**Q8: How do you debug Docker Compose issues?**
```bash
# 1. Validate config
docker-compose config

# 2. View logs
docker-compose logs -f
docker-compose logs -f service_name

# 3. Check service status
docker-compose ps

# 4. Inspect networks
docker network ls
docker network inspect myapp_default

# 5. Check volumes
docker volume ls
docker volume inspect myapp_db-data

# 6. Execute commands
docker-compose exec web bash

# 7. Recreate services
docker-compose up -d --force-recreate
```

## Summary

**Core Concepts:**

1. **Compose File Structure:**
   - ✅ `services`: Define containers
   - ✅ `networks`: Custom networks
   - ✅ `volumes`: Persistent storage
   - ✅ `configs`/`secrets`: Configuration management
   - ✅ Version 3.8+ recommended

2. **Service Configuration:**
   - ✅ `image` or `build`: Container source
   - ✅ `ports`: Expose to host
   - ✅ `environment`: Environment variables
   - ✅ `depends_on`: Service dependencies
   - ✅ `healthcheck`: Health monitoring
   - ✅ `restart`: Restart policy

3. **Networking:**
   - ✅ Default bridge network created automatically
   - ✅ Service discovery via service name (DNS)
   - ✅ Multiple networks for isolation
   - ✅ `networks` key for custom configuration

4. **Volume Management:**
   - ✅ Named volumes for persistence
   - ✅ Bind mounts for development
   - ✅ Volume drivers for advanced storage
   - ✅ Volumes survive container removal

5. **Environment Management:**
   - ✅ `.env` file for variables
   - ✅ `docker-compose.override.yml` for local dev
   - ✅ Multiple files: `-f file1.yml -f file2.yml`
   - ✅ Profiles for conditional services

6. **Essential Commands:**
   - `docker-compose up -d`: Start services
   - `docker-compose down`: Stop and remove
   - `docker-compose ps`: List services
   - `docker-compose logs -f`: View logs
   - `docker-compose exec`: Execute commands
   - `docker-compose pull`: Update images

**Key Insights:**
> - Service discovery is automatic - use service names to connect
> - Override files enable dev-specific configurations without modifying base
> - Health checks are critical for production deployments
> - Resource limits prevent single service consuming all resources
> - Compose is perfect for dev; use Kubernetes for production scale

---

[← Dockerfile Best Practices](./02-dockerfile-best-practices.md) | [Docker Networking Deep Dive →](./04-docker-networking-deep-dive.md)
