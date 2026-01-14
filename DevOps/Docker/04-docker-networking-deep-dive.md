# Docker Networking Deep Dive

## Overview

Docker networking enables containers to communicate with each other and the outside world. Understanding Docker networking is crucial for building distributed applications, microservices, and production deployments.

### 💡 **Why Docker Networking Matters**

**In Modern Architectures:**
- Microservices need secure, isolated communication channels
- Service discovery must be automatic (no hardcoded IPs)
- Network segmentation is critical for security (defense in depth)
- Container orchestration relies on dynamic networking

**Key Value:**
> Docker networking transforms containers from isolated processes into a coordinated application ecosystem with built-in service discovery, network isolation, and flexible communication patterns.

## Table of Contents
- [Network Drivers](#network-drivers)
- [Bridge Networks](#bridge-networks)
- [Host and None Networks](#host-and-none-networks)
- [Container Communication](#container-communication)
- [DNS and Service Discovery](#dns-and-service-discovery)
- [Network Security](#network-security)
- [Advanced Patterns](#advanced-patterns)
- [Interview Questions](#interview-questions)

## Network Drivers

### Available Drivers

```bash
# List network drivers
docker network ls

# Common drivers:
# - bridge: Default, isolated network on single host
# - host: Share host's network stack
# - none: No networking
# - overlay: Multi-host networking (Swarm/Kubernetes)
# - macvlan: Assign MAC address, appears as physical device
```

### Driver Comparison

| Driver | Use Case | Isolation | Performance | Multi-Host |
|--------|----------|-----------|-------------|------------|
| bridge | Default, single host | Container-level | Good | No |
| host | Maximum performance | None (shares host) | Excellent | No |
| none | Complete isolation | Full | N/A | No |
| overlay | Swarm/K8s multi-host | Service-level | Good | Yes |
| macvlan | Legacy apps, VLAN integration | Physical-like | Excellent | No |

## Bridge Networks

### Default Bridge

```bash
# Containers on default bridge can communicate by IP only
docker run -d --name web1 nginx
docker run -d --name web2 nginx

# Inside web1:
# ping web2  # ❌ Fails - no DNS on default bridge
# ping 172.17.0.3  # ✅ Works - by IP only

# Inspect default bridge
docker network inspect bridge
```

### Custom Bridge (Recommended)

```bash
# Create custom bridge network
docker network create mynetwork

# Run containers on custom network
docker run -d --name web1 --network mynetwork nginx
docker run -d --name web2 --network mynetwork nginx

# Inside web1:
# ping web2  # ✅ Works - automatic DNS resolution!

# Benefits:
# - Automatic DNS resolution
# - Better isolation
# - User-defined IP addressing
# - Dynamic container connection/disconnection
```

### Bridge Network Configuration

```bash
# Create bridge with custom subnet
docker network create \
  --driver bridge \
  --subnet=172.20.0.0/16 \
  --gateway=172.20.0.1 \
  --ip-range=172.20.240.0/20 \
  --opt "com.docker.network.bridge.name"="docker1" \
  mynetwork

# Assign static IP to container
docker run -d \
  --name web \
  --network mynetwork \
  --ip 172.20.0.10 \
  nginx

# Verify
docker inspect web | grep IPAddress
```

### Bridge Network Example

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: nginx
    networks:
      frontend:
        ipv4_address: 172.20.0.10
      backend:
        ipv4_address: 172.30.0.10

  app:
    image: myapp
    networks:
      - backend

  db:
    image: postgres
    networks:
      - backend

networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1

  backend:
    driver: bridge
    internal: true  # No external access
    ipam:
      config:
        - subnet: 172.30.0.0/16
```

## Host and None Networks

### Host Network

```bash
# Share host's network namespace
docker run -d --network host nginx

# Container uses host's:
# - IP address
# - Port space
# - Network interfaces

# Benefits:
# - Maximum performance (no NAT overhead)
# - Direct access to host services

# Drawbacks:
# - No port isolation
# - Reduced security
# - Port conflicts possible

# Use cases:
# - High-performance networking
# - Network monitoring tools
# - Development/testing
```

**Host Network Example:**
```bash
# Container binds directly to host's port 80
docker run -d --network host nginx
# Accessible at: http://host-ip:80

# No port mapping needed (ignored)
docker run -d --network host -p 8080:80 nginx
# Still uses port 80, -p flag ignored
```

### None Network

```bash
# Completely isolated, no network
docker run -d --network none alpine sleep 1000

# Use cases:
# - Maximum security
# - Batch processing
# - Testing
# - Air-gapped containers

# Only loopback interface available
docker exec container ifconfig
# lo: 127.0.0.1
```

## Container Communication

### Same Network Communication

```bash
# Create network
docker network create app-net

# Run containers
docker run -d --name db --network app-net postgres
docker run -d --name api --network app-net myapi
docker run -d --name web --network app-net nginx

# Automatic DNS resolution:
# api can connect to: postgres://db:5432
# web can connect to: http://api:3000
```

### Multi-Network Communication

```bash
# Create multiple networks
docker network create frontend
docker network create backend

# Connect services to multiple networks
docker run -d --name app --network frontend myapp
docker network connect backend app

# Now app is on both frontend and backend networks
docker inspect app --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

**Multi-Network Example:**
```yaml
services:
  nginx:
    networks:
      - frontend
    # Can only reach services on 'frontend'

  api:
    networks:
      - frontend
      - backend
    # Bridge between frontend and backend

  db:
    networks:
      - backend
    # Isolated from frontend

networks:
  frontend:
  backend:
    internal: true
```

### Port Publishing

```bash
# Publish to random host port
docker run -d -p 80 nginx
# Host: 0.0.0.0:32768 -> Container: 80

# Publish to specific host port
docker run -d -p 8080:80 nginx
# Host: 0.0.0.0:8080 -> Container: 80

# Bind to specific interface
docker run -d -p 127.0.0.1:8080:80 nginx
# Host: 127.0.0.1:8080 -> Container: 80

# Multiple ports
docker run -d -p 80:80 -p 443:443 nginx

# UDP port
docker run -d -p 53:53/udp dns-server

# View port mappings
docker port container_name
```

## DNS and Service Discovery

### Automatic DNS

```bash
# Custom bridge networks have built-in DNS
docker network create mynet
docker run -d --name web --network mynet nginx
docker run -d --name api --network mynet node-app

# From any container on mynet:
curl http://web      # Resolves to web container's IP
curl http://api:3000 # Resolves to api container's IP

# DNS resolution flow:
# 1. Container queries Docker's embedded DNS server (127.0.0.11)
# 2. DNS server looks up service name in network
# 3. Returns container's IP address
```

### Network Aliases

```bash
# Add multiple DNS names to container
docker run -d \
  --name web \
  --network mynet \
  --network-alias webapp \
  --network-alias www \
  nginx

# Now accessible via:
# - web
# - webapp
# - www

# All resolve to same container
```

**Docker Compose Aliases:**
```yaml
services:
  web:
    image: nginx
    networks:
      frontend:
        aliases:
          - webapp
          - www
          - nginx-server

  api:
    image: myapi
    # Can connect to: http://web, http://webapp, http://www
```

### Round-Robin DNS

```bash
# Multiple containers with same alias
docker run -d --name web1 --network mynet --network-alias web nginx
docker run -d --name web2 --network mynet --network-alias web nginx
docker run -d --name web3 --network mynet --network-alias web nginx

# DNS returns all IPs in round-robin
nslookup web
# Returns: 172.18.0.2, 172.18.0.3, 172.18.0.4

# Basic load balancing without load balancer!
```

### Custom DNS Configuration

```bash
# Custom DNS servers
docker run -d \
  --dns 8.8.8.8 \
  --dns 8.8.4.4 \
  --dns-search example.com \
  nginx

# Add hosts entries
docker run -d \
  --add-host=api.local:192.168.1.100 \
  --add-host=db.local:192.168.1.200 \
  myapp

# /etc/hosts inside container:
# 192.168.1.100 api.local
# 192.168.1.200 db.local
```

**Docker Compose DNS:**
```yaml
services:
  web:
    image: myapp
    dns:
      - 8.8.8.8
      - 8.8.4.4
    dns_search:
      - example.com
    extra_hosts:
      - "api.local:192.168.1.100"
      - "db.local:192.168.1.200"
```

## Network Security

### Network Isolation

```bash
# Internal network (no external access)
docker network create \
  --internal \
  backend-net

docker run -d --name db --network backend-net postgres
# db cannot access internet, only other containers on backend-net

# Use case: Database isolation
```

**Isolation Pattern:**
```yaml
services:
  # Public-facing
  nginx:
    networks:
      - public
    ports:
      - "80:80"

  # Application layer
  api:
    networks:
      - public
      - private

  # Data layer (isolated)
  db:
    networks:
      - private  # No direct external access

networks:
  public:
    driver: bridge
  private:
    driver: bridge
    internal: true  # Isolated from external network
```

### Firewall Rules

```bash
# Docker automatically creates iptables rules

# View Docker iptables rules
sudo iptables -L DOCKER -n

# Block external access to specific port
iptables -I DOCKER-USER -p tcp --dport 5432 -j DROP

# Allow specific IP to database
iptables -I DOCKER-USER -s 192.168.1.0/24 -p tcp --dport 5432 -j ACCEPT
iptables -A DOCKER-USER -p tcp --dport 5432 -j DROP

# Persist rules (depends on OS)
# Ubuntu/Debian: iptables-save > /etc/iptables/rules.v4
# RHEL/CentOS: iptables-save > /etc/sysconfig/iptables
```

### Network Encryption

```bash
# For overlay networks (Swarm mode)
docker network create \
  --driver overlay \
  --opt encrypted \
  secure-network

# Encrypts traffic between containers on different hosts
# Uses IPSEC in transport mode
```

## Advanced Patterns

### Reverse Proxy Pattern

```yaml
version: '3.8'

services:
  # Nginx reverse proxy (public)
  proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - frontend
    depends_on:
      - app

  # Application (private)
  app:
    image: myapp
    networks:
      - frontend
      - backend
    # Not exposed to host, only via proxy

  # Database (isolated)
  db:
    image: postgres
    networks:
      - backend
    # Completely isolated from external access

networks:
  frontend:
  backend:
    internal: true
```

**Nginx Configuration:**
```nginx
upstream app_servers {
    server app:3000;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Service Mesh Pattern

```yaml
# Using Envoy as sidecar proxy
services:
  app:
    image: myapp
    networks:
      - app-net

  app-proxy:
    image: envoyproxy/envoy:v1.24-latest
    volumes:
      - ./envoy.yaml:/etc/envoy/envoy.yaml
    networks:
      - app-net
      - mesh
    # Handles: Load balancing, TLS, observability

  db:
    image: postgres
    networks:
      - mesh

networks:
  app-net:
  mesh:
```

### Load Balancer Pattern

```yaml
services:
  # HAProxy load balancer
  lb:
    image: haproxy:alpine
    ports:
      - "80:80"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    networks:
      - frontend
    depends_on:
      - app

  # Multiple app instances
  app:
    image: myapp
    deploy:
      replicas: 3
    networks:
      - frontend
      - backend

networks:
  frontend:
  backend:
```

### Cross-Host Networking (Overlay)

```bash
# Initialize Swarm mode
docker swarm init

# Create overlay network
docker network create \
  --driver overlay \
  --attachable \
  multi-host-net

# Deploy services
docker service create \
  --name web \
  --network multi-host-net \
  --replicas 3 \
  nginx

# Automatic load balancing across hosts!
```

## Interview Questions

**Q1: What's the difference between bridge and host network?**
A:
- **Bridge**: Default, isolated network with NAT. Containers have own IP, port mapping required
- **Host**: Shares host's network. No isolation, maximum performance, no port mapping
- **Use bridge** for: Most applications, isolation needed
- **Use host** for: Network monitoring, performance-critical apps

**Q2: How does DNS work in Docker networks?**
A:
- Custom bridge networks have embedded DNS server (127.0.0.11)
- Containers can reach each other by name (automatic service discovery)
- Default bridge has no DNS, must use IPs or --link (deprecated)
- DNS queries are resolved to container IPs automatically

**Q3: What's the purpose of internal networks?**
A: Internal networks have no route to external internet, providing isolation:
```yaml
networks:
  backend:
    internal: true
```
Use for databases, sensitive services that shouldn't access external networks.

**Q4: How do you connect a container to multiple networks?**
```bash
# Method 1: At creation
docker run -d --name app --network net1 myapp
docker network connect net2 app

# Method 2: Docker Compose
services:
  app:
    networks:
      - net1
      - net2
```

**Q5: What are network aliases used for?**
A: Provide additional DNS names for containers:
```bash
docker run --network mynet --network-alias webapp nginx
# Reachable via: nginx (name) and webapp (alias)
```
**Use cases:** Multiple DNS names, load balancing (same alias for multiple containers)

**Q6: How do you troubleshoot Docker networking?**
```bash
# 1. Inspect network
docker network inspect mynetwork

# 2. Check container network settings
docker inspect container | grep -A 20 NetworkSettings

# 3. Test DNS resolution
docker exec container nslookup service-name

# 4. Test connectivity
docker exec container ping other-container
docker exec container curl http://service:port

# 5. Check port mappings
docker port container

# 6. View iptables rules
sudo iptables -L DOCKER -n
```

**Q7: What's the difference between expose and ports in Docker Compose?**
A:
- `expose`: Documents ports, makes available to other containers only (not to host)
- `ports`: Publishes to host machine
```yaml
services:
  api:
    expose:
      - "3000"    # Only containers can access
    ports:
      - "8080:80" # Host can access on 8080
```

**Q8: How do you implement service-to-service communication securely?**
A:
1. Use internal networks for sensitive services
2. Implement network segmentation (frontend/backend separation)
3. Use TLS for encrypted communication
4. Limit port exposure with `expose` instead of `ports`
5. Use network policies (Swarm/Kubernetes)

**Q9: What's the overhead of Docker networking?**
A:
- **Bridge**: Minimal (~5% overhead due to NAT)
- **Host**: No overhead (direct host networking)
- **Overlay**: Moderate overhead (encryption, multi-host routing)
- **Performance hierarchy**: host > bridge > overlay (encrypted)

## Summary

**Core Concepts:**

1. **Network Drivers:**
   - **Bridge**: Default, single-host, isolated network with automatic DNS (custom networks only)
   - **Host**: Maximum performance, shares host network namespace, no isolation
   - **Overlay**: Multi-host networking for Swarm/Kubernetes clusters
   - **Macvlan**: Assigns MAC addresses, appears as physical devices on network
   - **None**: Complete isolation, no networking (air-gapped containers)

2. **Network Features:**
   - ✅ **Automatic DNS**: Custom bridge networks resolve container names to IPs (via 127.0.0.11)
   - ✅ **Network Isolation**: Containers can only communicate within same network(s)
   - ✅ **Port Publishing**: Map container ports to host with `-p` flag
   - ✅ **Network Aliases**: Multiple DNS names per container for load balancing
   - ✅ **Multi-Network**: Containers can connect to multiple networks (act as bridges)

3. **Network Patterns:**
   - ✅ **Frontend/Backend Isolation**: Separate networks for web tier and data tier
   - ✅ **Internal Networks**: Use `internal: true` to block external access (databases)
   - ✅ **Reverse Proxy**: Nginx/Traefik on public network, apps on private networks
   - ✅ **Service Discovery**: DNS-based automatic discovery by container name
   - ✅ **Load Balancing**: Same network alias for multiple containers (round-robin DNS)

4. **Security Practices:**
   - ✅ Use custom bridge networks (not default bridge - it has no DNS)
   - ✅ Segment networks by tier (public/private/data)
   - ✅ Use internal networks for databases and sensitive services
   - ✅ Minimize port exposure (use `expose` instead of `ports` when possible)
   - ✅ Implement network encryption for overlay networks (`--opt encrypted`)
   - ❌ Avoid default bridge network (no automatic DNS resolution)
   - ❌ Don't use host network unless necessary (removes network isolation)
   - ❌ Don't expose database ports directly to host
   - ⚠️ Host network cannot use port mapping and has no isolation

**Key Insights:**
> - **Default bridge has NO DNS** - always use custom bridge networks for automatic service discovery
> - **Containers on same network communicate by name** - DNS resolves service names to container IPs automatically
> - **Host network = maximum performance but zero isolation** - use only for performance-critical workloads
> - **Network segmentation is defense in depth** - isolate frontend/backend/database layers
> - **Internal networks prevent external access** - ideal for databases that should never reach the internet

**Production Checklist:**
- [ ] Custom bridge networks configured (not default bridge)
- [ ] Internal networks for databases (`internal: true`)
- [ ] DNS resolution tested between services
- [ ] Firewall rules configured (iptables/DOCKER-USER chain)
- [ ] Port exposure minimized (only essential ports published)
- [ ] Network segmentation implemented (frontend/backend/data tiers)
- [ ] Reverse proxy configured (Nginx/Traefik/HAProxy)
- [ ] Network monitoring in place (connection tracking, bandwidth)

---

[← Docker Compose Advanced](./03-docker-compose-advanced.md) | [Docker Volumes & Storage →](./05-docker-volumes-storage.md)
