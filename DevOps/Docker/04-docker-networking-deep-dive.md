# Docker Networking

## Network Drivers

| Driver | Use Case | Auto DNS | Multi-Host |
|--------|----------|----------|------------|
| `bridge` | Default, single host | ✅ (custom only) | No |
| `host` | Maximum performance | N/A | No |
| `none` | Complete isolation | No | No |
| `overlay` | Swarm / Kubernetes | ✅ | Yes |

## Default Bridge vs Custom Bridge

### 💡 Default Bridge — Avoid

```bash
docker run -d --name web1 nginx
docker run -d --name web2 nginx

# Inside web1:
ping web2         # ❌ No DNS — fails
ping 172.17.0.3   # ✅ Works but fragile (IPs change)
```

### 💡 Custom Bridge — Always Use This

```bash
docker network create mynetwork

docker run -d --name web --network mynetwork nginx
docker run -d --name api --network mynetwork node-app

# Inside web:
curl http://api:3000   # ✅ DNS resolves automatically
```

**Custom bridge benefits:**
- Automatic DNS resolution by container name
- Better isolation between apps
- Dynamic connect/disconnect at runtime

## Host Network

```bash
docker run -d --network host nginx
# Container shares host's IP and port space
# No port mapping needed — or respected
# ❌ No isolation — use only for max-performance tools
```

## Port Publishing

```bash
docker run -d -p 8080:80 nginx                 # host:container
docker run -d -p 127.0.0.1:8080:80 nginx       # bind to localhost only
docker run -d -p 80 nginx                      # random host port
docker port container_name                     # show all mappings
```

## DNS and Service Discovery

Custom bridge networks include a DNS server at `127.0.0.11`. Containers find each other by name:

```bash
curl http://db:5432       # resolves to db container's IP
curl http://redis:6379    # resolves to redis container's IP
```

Docker Compose handles this automatically — services discover each other by their service name in the YAML.

## Network Isolation Pattern

Keep databases off the public internet:

```yaml
services:
  nginx:
    networks: [frontend]
    ports: ["80:80"]

  api:
    networks: [frontend, backend]   # Bridge between tiers

  db:
    networks: [backend]             # No direct external access

networks:
  frontend:
  backend:
    internal: true    # ❌ Blocks internet access
```

## Useful Commands

```bash
docker network ls                        # List networks
docker network create mynetwork          # Create custom bridge
docker network inspect mynetwork         # Containers, IPs, config
docker network connect mynetwork app     # Connect container to network
docker network disconnect mynetwork app  # Disconnect container
docker network rm mynetwork              # Remove network
docker network prune                     # Remove unused networks
```

## Troubleshoot Network Issues

```bash
docker network inspect mynetwork                    # Check connected containers
docker exec container nslookup servicename          # Test DNS
docker exec container ping servicename             # Test reachability
docker exec container curl http://api:3000/health  # Test HTTP
docker port container_name                         # Check port mappings
```

## Interview Q&A

**Q: Default bridge vs custom bridge?**
Default bridge has no DNS — containers reach each other only by IP. Custom bridge has automatic DNS so containers resolve each other by name. Always use custom bridge.

**Q: What is `internal: true`?**
Prevents the network from routing to the external internet. Use for databases and sensitive services that should only talk within the cluster.

**Q: `expose` vs `ports` in Compose?**
- `expose` — makes a port reachable to other containers only (not the host)
- `ports` — publishes the port to the host machine

**Q: Container can't reach another container — where do you start?**
1. Check both are on the same network: `docker network inspect`
2. Test DNS: `docker exec c1 nslookup c2`
3. Test connectivity: `docker exec c1 ping c2`
4. Check for typos in service name

---
[← Docker Compose](./03-docker-compose-advanced.md) | [Volumes →](./05-docker-volumes-storage.md)
