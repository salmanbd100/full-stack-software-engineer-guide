# Docker Volumes & Storage

## Overview

Docker volumes provide persistent storage for containers, allowing data to survive container lifecycle events. This guide covers volume types, storage drivers, backup strategies, and best practices for production data management.

### 💡 **Why Docker Volumes & Storage Matter**

**The Persistent Data Challenge:**
- Containers are **ephemeral by design** - data inside container filesystem is lost when container is removed
- Databases, user uploads, logs, and configuration need to **survive container restarts**
- Development requires **live code reloading** without rebuilding images
- Production requires **reliable backup and disaster recovery** strategies

**Key Value:**
> Docker volumes decouple data lifecycle from container lifecycle, enabling stateful applications in an ephemeral container world with portable, manageable, and production-ready persistent storage.

## Table of Contents
- [Volume Types](#volume-types)
- [Volume Management](#volume-management)
- [Bind Mounts vs Volumes](#bind-mounts-vs-volumes)
- [Storage Drivers](#storage-drivers)
- [Backup and Restore](#backup-and-restore)
- [Production Patterns](#production-patterns)
- [AWS Storage Integration](#aws-storage-integration)
- [Interview Questions](#interview-questions)

## Volume Types

### Named Volumes

```bash
# Create named volume
docker volume create mydata

# Use in container
docker run -d \
  --name postgres \
  -v mydata:/var/lib/postgresql/data \
  postgres:14-alpine

# Volume managed by Docker
docker volume ls
docker volume inspect mydata

# Benefits:
# - Docker managed (stored in /var/lib/docker/volumes/)
# - Easy backup/restore
# - Can use volume drivers
# - Platform independent
# - Best for production
```

### Anonymous Volumes

```bash
# Created automatically (no name specified)
docker run -d -v /data nginx

# Docker generates random name
docker volume ls
# VOLUME NAME
# a1b2c3d4e5f6...

# Removed with container (unless --rm not used)

# Use cases:
# - Temporary data
# - Testing
# - Cache directories
```

### Bind Mounts

```bash
# Mount host directory
docker run -d \
  -v /host/path:/container/path \
  -v $(pwd)/src:/app/src \
  nginx

# Benefits:
# - Direct access to host filesystem
# - Real-time development
# - Familiar file paths

# Drawbacks:
# - Host-specific paths
# - Security concerns
# - Performance on Mac/Windows
```

### tmpfs Mounts

```bash
# Temporary filesystem in memory
docker run -d \
  --tmpfs /app/temp \
  --tmpfs /app/cache:rw,size=1g,mode=1777 \
  myapp

# Benefits:
# - Fast (in-memory)
# - Secure (no disk traces)
# - Automatic cleanup

# Use cases:
# - Sensitive data
# - Cache
# - Temporary files
```

## Volume Management

### Creating Volumes

```bash
# Simple creation
docker volume create mydata

# With driver options
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=192.168.1.1,rw \
  --opt device=:/path/to/dir \
  nfs-volume

# With labels
docker volume create \
  --label environment=production \
  --label backup=daily \
  prod-data
```

### Inspecting Volumes

```bash
# Detailed information
docker volume inspect mydata

# Output:
[
    {
        "CreatedAt": "2024-01-15T10:30:00Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/mydata/_data",
        "Name": "mydata",
        "Options": {},
        "Scope": "local"
    }
]

# List volumes with filters
docker volume ls --filter label=environment=production
docker volume ls --filter dangling=true
```

### Removing Volumes

```bash
# Remove specific volume
docker volume rm mydata

# Remove volume with force (even if in use)
docker volume rm -f mydata

# Remove all unused volumes
docker volume prune

# Remove with filter
docker volume prune --filter label=environment=staging

# Remove container and its volumes
docker rm -v container_name
```

### Volume Drivers

```bash
# Local driver (default)
docker volume create \
  --driver local \
  myvolume

# NFS driver
docker volume create \
  --driver local \
  --opt type=nfs \
  --opt o=addr=nfs.example.com,rw,nfsvers=4 \
  --opt device=:/exports/data \
  nfs-volume

# AWS EBS (using plugin)
docker plugin install rexray/ebs

docker volume create \
  --driver rexray/ebs \
  --opt size=10 \
  ebs-volume

# Azure File Storage
docker volume create \
  --driver azure-file \
  azure-volume
```

## Bind Mounts vs Volumes

### Comparison Table

| Feature | Volumes | Bind Mounts |
|---------|---------|-------------|
| Storage Location | Docker managed | User specified |
| Path | /var/lib/docker/volumes/ | Any host path |
| Performance | Good | Good (native on Linux) |
| Portability | Excellent | Poor |
| Backup | Easy | Manual |
| Security | Better | Requires host access |
| Production Use | ✅ Recommended | ⚠️ Development only |

### When to Use Each

```yaml
# docker-compose.yml
services:
  # Production: Use named volumes
  db:
    image: postgres:14
    volumes:
      - postgres-data:/var/lib/postgresql/data  # ✅ Named volume
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro  # Config file

  # Development: Bind mounts for live reload
  web:
    build: ./web
    volumes:
      - ./web/src:/app/src  # ✅ Live code changes
      - node_modules:/app/node_modules  # ✅ Keep node_modules in volume

volumes:
  postgres-data:  # Persistent data
  node_modules:   # Dependencies cache
```

### Volume Options

```yaml
services:
  db:
    image: postgres:14
    volumes:
      # Short syntax
      - postgres-data:/var/lib/postgresql/data

      # Long syntax (more options)
      - type: volume
        source: postgres-data
        target: /var/lib/postgresql/data
        volume:
          nocopy: false  # Copy data from container to volume

      - type: bind
        source: ./config
        target: /app/config
        read_only: true  # Read-only mount

      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 1000000000  # 1GB

volumes:
  postgres-data:
```

## Storage Drivers

### Available Storage Drivers

```bash
# Check current storage driver
docker info | grep "Storage Driver"

# Common storage drivers:
# - overlay2: Default, recommended for most use cases
# - aufs: Legacy, deprecated
# - btrfs: For btrfs filesystems
# - zfs: For ZFS filesystems
# - devicemapper: Legacy, for older systems
```

### Overlay2 (Recommended)

```bash
# /etc/docker/daemon.json
{
  "storage-driver": "overlay2"
}

# Benefits:
# - Best performance
# - Efficient disk space usage
# - Good caching
# - Default on modern systems

# Requirements:
# - Linux kernel 4.0+
# - Supported filesystem (ext4, xfs)
```

### Storage Driver Selection

| Driver | Use Case | Performance | Stability |
|--------|----------|-------------|-----------|
| overlay2 | General purpose | Excellent | Excellent |
| aufs | Legacy systems | Good | Good |
| btrfs | Btrfs filesystem | Good | Good |
| zfs | ZFS filesystem | Excellent | Excellent |
| devicemapper | RHEL 7 | Fair | Good |

## Backup and Restore

### Volume Backup

```bash
# Method 1: Using tar
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mydata-backup.tar.gz -C /data .

# Method 2: With date stamp
BACKUP_NAME="mydata-$(date +%Y%m%d-%H%M%S).tar.gz"
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/$BACKUP_NAME -C /data .

# Method 3: Backup running container
docker exec container tar czf /tmp/backup.tar.gz /data
docker cp container:/tmp/backup.tar.gz ./backup.tar.gz
```

### Volume Restore

```bash
# Method 1: Restore from tar
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mydata-backup.tar.gz -C /data

# Method 2: Create volume and restore
docker volume create mydata-restored
docker run --rm \
  -v mydata-restored:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/mydata-backup.tar.gz --strip 1"
```

### Automated Backup Script

```bash
#!/bin/bash
# backup-volumes.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d-%H%M%S)

# Backup all volumes
for volume in $(docker volume ls -q); do
  echo "Backing up volume: $volume"

  docker run --rm \
    -v $volume:/data:ro \
    -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/${volume}-${DATE}.tar.gz -C /data .

  echo "Backup completed: ${volume}-${DATE}.tar.gz"
done

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Database-Specific Backups

```bash
# PostgreSQL backup
docker exec postgres pg_dumpall -U postgres > backup.sql

# Or with volume
docker run --rm \
  -v postgres-data:/var/lib/postgresql/data \
  -v $(pwd):/backup \
  postgres:14 pg_dumpall -U postgres > /backup/backup.sql

# MongoDB backup
docker exec mongo mongodump --out /backup
docker cp mongo:/backup ./mongodb-backup

# MySQL backup
docker exec mysql mysqldump -u root -p$MYSQL_ROOT_PASSWORD --all-databases > backup.sql
```

## Production Patterns

### Database with Persistent Storage

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      # Data volume (persistent)
      - postgres-data:/var/lib/postgresql/data

      # Init scripts (read-only)
      - ./init:/docker-entrypoint-initdb.d:ro

      # Configuration (read-only)
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/data/postgres

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Application with Cache and Logs

```yaml
services:
  app:
    image: myapp:latest
    volumes:
      # Application logs
      - app-logs:/var/log/app

      # Upload directory
      - app-uploads:/app/uploads

      # Cache (tmpfs for speed)
      - type: tmpfs
        target: /app/cache
        tmpfs:
          size: 2147483648  # 2GB

      # Config (read-only)
      - ./config:/app/config:ro

  # Log aggregator
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.0.0
    volumes:
      - app-logs:/logs:ro
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro

volumes:
  app-logs:
  app-uploads:
```

### Multi-Container Data Sharing

```yaml
services:
  # Data processor
  processor:
    image: data-processor
    volumes:
      - shared-data:/data
    command: process

  # Data analyzer
  analyzer:
    image: data-analyzer
    volumes:
      - shared-data:/data:ro  # Read-only
    depends_on:
      - processor

  # Data exporter
  exporter:
    image: data-exporter
    volumes:
      - shared-data:/data:ro
      - export-results:/results

volumes:
  shared-data:
  export-results:
```

## AWS Storage Integration

### EBS Volumes

```yaml
# On EC2 instance

# 1. Attach EBS volume to instance (via AWS Console/CLI)
# 2. Format and mount
# sudo mkfs -t ext4 /dev/xvdf
# sudo mkdir /data
# sudo mount /dev/xvdf /data

services:
  db:
    image: postgres:14
    volumes:
      - /data/postgres:/var/lib/postgresql/data
```

### EFS (Elastic File System)

```bash
# Install EFS utilities
sudo yum install -y amazon-efs-utils

# Mount EFS
sudo mount -t efs fs-12345678:/ /mnt/efs

# docker-compose.yml
services:
  app:
    image: myapp
    volumes:
      - /mnt/efs/app-data:/app/data
```

### S3 for Backups

```bash
# Backup volume to S3
docker run --rm \
  -v mydata:/data:ro \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  amazon/aws-cli \
  s3 sync /data s3://my-bucket/backups/mydata/

# Restore from S3
docker volume create mydata
docker run --rm \
  -v mydata:/data \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  amazon/aws-cli \
  s3 sync s3://my-bucket/backups/mydata/ /data/
```

## Interview Questions

**Q1: What's the difference between volumes and bind mounts?**
A:
- **Volumes**: Docker-managed, portable, best for production
  - Location: /var/lib/docker/volumes/
  - Easy backup/restore
  - Platform independent
- **Bind Mounts**: User-specified host paths, good for development
  - Location: Any host path
  - Direct access to host filesystem
  - Less portable

**Q2: What happens to data when a container is removed?**
A:
- **Without volumes**: Data is lost (container filesystem is ephemeral)
- **With volumes**: Data persists
- **With anonymous volumes**: Data persists unless `docker rm -v` used
- **Always use volumes for persistent data**

**Q3: How do you backup Docker volumes?**
```bash
# Mount volume and backup with tar
docker run --rm \
  -v myvolume:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz -C /data .

# For databases, use native tools
docker exec postgres pg_dump -U user dbname > backup.sql
```

**Q4: What's the purpose of tmpfs mounts?**
A: Temporary filesystem in RAM:
- Fast access (memory speed)
- No disk I/O
- Automatic cleanup on container stop
- Secure (no disk traces)
**Use for:** Cache, temporary files, sensitive data

**Q5: Can multiple containers share the same volume?**
A: Yes!
```yaml
services:
  writer:
    volumes:
      - shared-data:/data

  reader1:
    volumes:
      - shared-data:/data:ro  # Read-only

  reader2:
    volumes:
      - shared-data:/data:ro

volumes:
  shared-data:
```

**Q6: What are volume drivers used for?**
A: Enable different storage backends:
- **NFS**: Network file system
- **AWS EBS**: Block storage
- **Azure Files**: Cloud storage
- **GlusterFS**: Distributed filesystem
**Default**: local driver (host filesystem)

**Q7: How do you migrate volumes between hosts?**
```bash
# Host A: Backup
docker run --rm -v mydata:/data \
  -v $(pwd):/backup alpine \
  tar czf /backup/mydata.tar.gz -C /data .

# Transfer to Host B
scp mydata.tar.gz user@hostb:/tmp/

# Host B: Restore
docker volume create mydata
docker run --rm -v mydata:/data \
  -v /tmp:/backup alpine \
  tar xzf /backup/mydata.tar.gz -C /data
```

**Q8: What's the best practice for database storage in production?**
A:
1. Use named volumes (not bind mounts)
2. Regular backups to external storage (S3, etc.)
3. Use volume drivers for network storage if needed
4. Monitor disk usage
5. Implement backup retention policies
6. Test restore procedures regularly

**Q9: How do you troubleshoot volume issues?**
```bash
# 1. List volumes
docker volume ls

# 2. Inspect volume
docker volume inspect mydata

# 3. Check mountpoint
docker volume inspect mydata | grep Mountpoint

# 4. Check container mounts
docker inspect container | grep -A 20 Mounts

# 5. Access volume data
sudo ls -la /var/lib/docker/volumes/mydata/_data

# 6. Check disk space
df -h
docker system df
```

## Summary

**Core Concepts:**

1. **Volume Types:**
   - **Named Volumes**: Docker-managed (e.g., `mydata:/var/lib/postgresql/data`), best for production
   - **Anonymous Volumes**: Auto-generated names, temporary data, removed with container
   - **Bind Mounts**: Direct host path mapping (e.g., `./src:/app/src`), best for development
   - **tmpfs Mounts**: In-memory storage, fast and secure for temporary/sensitive data

2. **Volume vs Bind Mount:**
   - **Volumes**: Docker-managed (/var/lib/docker/volumes/), portable, easy backup, production-ready
   - **Bind Mounts**: User-specified paths, host-dependent, development/configuration only
   - **Performance**: Native Linux (equal), Docker Desktop Mac/Windows (volumes faster)
   - **Security**: Volumes = better isolation, Bind mounts = require host filesystem access

3. **Storage Management:**
   - **Volume Drivers**: local (default), NFS, AWS EBS, Azure Files, GlusterFS
   - **Storage Driver**: overlay2 (recommended), controls how images/containers are stored
   - **Backup**: Use `tar` in temporary container mounting volume + backup location
   - **Restore**: Create volume, mount in temporary container, extract backup archive
   - **AWS Integration**: EBS (block storage), EFS (network filesystem), S3 (backup destination)

4. **Production Patterns:**
   - ✅ **Database Storage**: Named volumes with health checks and init scripts
   - ✅ **Shared Data**: Multiple containers can mount same volume (use `:ro` for read-only)
   - ✅ **Log Collection**: App writes to volume, log aggregator (Filebeat) reads from it
   - ✅ **Backup Automation**: Scheduled backups to external storage (S3, NFS)
   - ✅ **Disaster Recovery**: Regular backup testing and documented restore procedures

**Best Practices:**
- ✅ Use named volumes for production data (databases, uploads, persistent state)
- ✅ Use bind mounts only for development (live code reload) and read-only config files
- ✅ Implement automated backup strategies with retention policies
- ✅ Use read-only mounts (`:ro`) where data shouldn't be modified
- ✅ Monitor disk usage with `docker system df` and host monitoring
- ✅ Use volume drivers (NFS, EFS) for shared storage across hosts
- ✅ Test restore procedures regularly (backup without tested restore = no backup)
- ❌ Don't rely on container filesystem for persistent data (ephemeral by design)
- ❌ Don't use anonymous volumes in production (hard to manage and backup)
- ❌ Don't use bind mounts in production (not portable, host-dependent paths)
- ⚠️ Always backup before major upgrades or migrations

**Key Insights:**
> - **Container filesystem is ephemeral** - data is lost when container is removed unless stored in volumes
> - **Volumes decouple data from containers** - data persists independently of container lifecycle
> - **Named volumes = production, bind mounts = development** - don't confuse the two
> - **Backup without tested restore = no backup** - disaster recovery requires regular testing
> - **Use volume drivers for cloud storage** - integrate with EBS, EFS, Azure Files for production

**Production Checklist:**
- [ ] Named volumes configured for all persistent data
- [ ] Backup strategy implemented (schedule, retention, destination)
- [ ] Backup automation in place (scripts, cron jobs, CI/CD)
- [ ] Restore procedures documented and tested quarterly
- [ ] Disk monitoring configured (alerts for >80% usage)
- [ ] Volume permissions set correctly (least privilege)
- [ ] Data encryption configured (encryption at rest if needed)
- [ ] Retention policies defined (compliance, cost optimization)
- [ ] Volume labels used for organization and automation
- [ ] AWS/cloud integration configured (EBS, EFS, S3)

---

[← Docker Networking Deep Dive](./04-docker-networking-deep-dive.md) | [Docker Security →](./06-docker-security.md)
