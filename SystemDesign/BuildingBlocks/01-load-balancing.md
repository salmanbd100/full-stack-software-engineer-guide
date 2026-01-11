# Load Balancing

## 💡 **Problem → Solution**

| Aspect | Details |
|--------|---------|
| **Problem** | Traffic + Reliability |
| **Solution** | Load Balancer |
| **Scale** | > 10,000 requests/sec |
| **Uptime Target** | 99.9%+ |

**When to Use:**

| Scenario | Reason |
|----------|--------|
| ✅ High traffic volume | Single server can't handle > 10K req/sec |
| ✅ High availability needed | Eliminate single points of failure |
| ✅ Horizontal scaling | Distribute across multiple servers |
| ✅ Zero-downtime deploys | Rolling updates without downtime |

---

## Pattern Overview

### What is Load Balancing?

A **load balancer** is a critical infrastructure component that distributes incoming network traffic across multiple backend servers (also called a server pool or server farm). Think of it as a traffic director at a busy intersection - it ensures no single server gets overwhelmed while others sit idle, maximizing throughput and minimizing response times.

Load balancers operate at different layers of the OSI model (Layer 4 or Layer 7) and use various algorithms to decide which server should handle each request. They continuously monitor server health and automatically route traffic away from failed servers, providing both performance optimization and fault tolerance.

In modern cloud architectures, load balancers are essential for achieving horizontal scalability - the ability to handle increased load by adding more servers rather than upgrading existing ones (vertical scaling).

### Key Characteristics

| Feature | Description | Benefit |
|---------|-------------|---------|
| **Traffic Distribution** | Millions of requests/sec across servers | Balanced load |
| **High Availability** | Auto-routes from failed servers | No downtime |
| **Health Monitoring** | Checks every 5-30 seconds | Quick failure detection |
| **Session Persistence** | Sticky sessions support | Stateful apps work |
| **SSL Termination** | Offloads encryption | Better performance |
| **Complexity** | O(1) time, O(n) space | Efficient routing |

### Real-World Applications

- **Netflix**: Uses AWS Elastic Load Balancer (ELB) to distribute 250+ million subscriber requests across thousands of microservices, handling over 1 billion requests per day
- **LinkedIn**: Employs custom load balancers to route 100+ million daily active users across global data centers, achieving 99.99% availability
- **Uber**: Distributes 15+ million trips per day across geographically distributed servers using multi-layer load balancing (edge → region → zone)

---

## Core Concepts

### Architecture Pattern

```
                        ┌──────────────────┐
                        │   Load Balancer  │
                        │  (Health Checks) │
                        └────────┬─────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
    ┌──────────────┐     ┌──────────────┐    ┌──────────────┐
    │   Server 1   │     │   Server 2   │    │   Server 3   │
    │  (Healthy)   │     │  (Healthy)   │    │   (Failed)   │
    └──────────────┘     └──────────────┘    └──────────────┘
         Active               Active              Removed from pool
```

### Key Components

1. **Load Balancer (Frontend)**: Receives all incoming traffic and distributes it based on configured algorithm
2. **Backend Server Pool**: Collection of identical servers that handle actual requests
3. **Health Check Mechanism**: Periodic probes (HTTP, TCP, or custom) to verify server availability
4. **Routing Algorithm**: Logic that determines which server receives each request (round-robin, least connections, etc.)
5. **Session Store** (optional): Maintains session affinity for stateful applications

### How It Works

**Step 1**: Client sends request to load balancer's public IP address (e.g., `api.example.com`)

**Step 2**: Load balancer receives request and checks its routing algorithm:
- **Round-robin**: Next server in rotation
- **Least connections**: Server with fewest active connections
- **IP hash**: Same client → same server (based on client IP)

**Step 3**: Load balancer performs health check lookup:
- Checks cached health status (updated every 5-30 seconds)
- Skips any servers marked as unhealthy

**Step 4**: Forwards request to selected healthy server

**Step 5**: Server processes request and returns response through load balancer (or directly to client for DSR - Direct Server Return)

**Step 6**: Load balancer updates connection metrics and routing state

---

## Example 1: Basic Round-Robin Load Balancer - JavaScript

### Scenario

You're building a REST API that needs to handle 50,000 requests/second. A single Node.js server can handle ~10,000 req/sec, so you need at least 5 servers with a load balancer to distribute traffic evenly.

### Implementation

```javascript
// Simple in-memory round-robin load balancer
class LoadBalancer {
    constructor(servers) {
        this.servers = servers;
        this.currentIndex = 0;
        this.healthyServers = new Set(servers);

        // Start health checks every 10 seconds
        this.startHealthChecks();
    }

    // Round-robin algorithm: distribute requests evenly
    getNextServer() {
        if (this.healthyServers.size === 0) {
            throw new Error('No healthy servers available');
        }

        const healthyServerList = Array.from(this.healthyServers);

        // Find next healthy server in rotation
        let attempts = 0;
        while (attempts < this.servers.length) {
            const server = this.servers[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.servers.length;

            if (this.healthyServers.has(server)) {
                return server;
            }
            attempts++;
        }

        // Fallback: return first healthy server
        return healthyServerList[0];
    }

    // Health check: ping each server every 10 seconds
    async startHealthChecks() {
        setInterval(async () => {
            for (const server of this.servers) {
                try {
                    const response = await fetch(`${server}/health`, {
                        timeout: 2000 // 2 second timeout
                    });

                    if (response.ok) {
                        if (!this.healthyServers.has(server)) {
                            console.log(`Server ${server} is back online`);
                            this.healthyServers.add(server);
                        }
                    } else {
                        throw new Error('Unhealthy response');
                    }
                } catch (error) {
                    if (this.healthyServers.has(server)) {
                        console.log(`Server ${server} failed health check`);
                        this.healthyServers.delete(server);
                    }
                }
            }
        }, 10000);
    }

    // Proxy incoming request to selected server
    async handleRequest(req, res) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const targetServer = this.getNextServer();
                const response = await fetch(`${targetServer}${req.url}`, {
                    method: req.method,
                    headers: req.headers,
                    body: req.body,
                    timeout: 30000 // 30 second timeout
                });

                // Forward response back to client
                res.status(response.status);
                return response.body;

            } catch (error) {
                lastError = error;
                console.log(`Request failed on attempt ${attempt + 1}: ${error.message}`);
                // Retry with different server
            }
        }

        // All retries failed
        throw new Error(`Request failed after ${maxRetries} attempts: ${lastError.message}`);
    }
}

// Usage
const servers = [
    'http://server1.example.com:3000',
    'http://server2.example.com:3000',
    'http://server3.example.com:3000',
    'http://server4.example.com:3000',
    'http://server5.example.com:3000'
];

const lb = new LoadBalancer(servers);

// Handle incoming requests
app.use(async (req, res) => {
    try {
        const response = await lb.handleRequest(req, res);
        res.send(response);
    } catch (error) {
        res.status(503).send('Service temporarily unavailable');
    }
});
```

### Explanation

**Why Round-Robin**: Simplest algorithm, works well when all servers have equal capacity and requests have similar processing time.

**Health Checks**: Every 10 seconds, we ping each server's `/health` endpoint. Failed servers are removed from the pool immediately, preventing failed requests.

**Retry Logic**: If a request fails (network error, timeout), we automatically retry with a different server up to 3 times.

**Connection Tracking**: We maintain a `currentIndex` to ensure even distribution across servers.

### Trade-offs

- ✅ **Pros**: Simple to implement, evenly distributes load, no state required, predictable behavior
- ✅ **Pros**: Works well for stateless applications (REST APIs, static content)
- ❌ **Cons**: Doesn't account for server capacity differences (treats all servers equally)
- ❌ **Cons**: Doesn't consider current server load (a busy server gets same traffic as idle one)
- ❌ **Cons**: Not ideal for long-lived connections (WebSockets) - can create uneven distribution

---

## Example 2: Least Connections Algorithm - Python

### Scenario

You're running a video processing service where requests have highly variable processing times (1 second to 5 minutes). Round-robin creates uneven load because some servers get stuck with long-running jobs. Least connections ensures new requests go to the least busy server.

### Implementation

```python
import asyncio
import aiohttp
from collections import defaultdict
from typing import List
import time

class LeastConnectionsLoadBalancer:
    def __init__(self, servers: List[str]):
        self.servers = servers
        self.active_connections = defaultdict(int)  # Track connections per server
        self.healthy_servers = set(servers)
        self.lock = asyncio.Lock()

        # Start background health checks
        asyncio.create_task(self.health_check_loop())

    async def get_least_loaded_server(self) -> str:
        """
        Select server with fewest active connections.
        Time complexity: O(n) where n = number of servers
        """
        async with self.lock:
            if not self.healthy_servers:
                raise Exception("No healthy servers available")

            # Find healthy server with minimum connections
            min_connections = float('inf')
            selected_server = None

            for server in self.healthy_servers:
                connections = self.active_connections[server]
                if connections < min_connections:
                    min_connections = connections
                    selected_server = server

            if selected_server:
                # Increment connection count
                self.active_connections[selected_server] += 1
                return selected_server

            # Fallback to first healthy server
            server = list(self.healthy_servers)[0]
            self.active_connections[server] += 1
            return server

    async def release_connection(self, server: str):
        """Decrement connection count when request completes"""
        async with self.lock:
            if self.active_connections[server] > 0:
                self.active_connections[server] -= 1

    async def health_check_loop(self):
        """Check server health every 15 seconds"""
        while True:
            await asyncio.sleep(15)

            for server in self.servers:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(
                            f"{server}/health",
                            timeout=aiohttp.ClientTimeout(total=3)
                        ) as response:
                            if response.status == 200:
                                if server not in self.healthy_servers:
                                    print(f"✅ Server {server} is healthy again")
                                    self.healthy_servers.add(server)
                            else:
                                raise Exception(f"Unhealthy status: {response.status}")

                except Exception as e:
                    if server in self.healthy_servers:
                        print(f"❌ Server {server} failed: {e}")
                        async with self.lock:
                            self.healthy_servers.discard(server)
                            # Reset connection count for failed server
                            self.active_connections[server] = 0

    async def proxy_request(self, path: str, method: str = 'GET', **kwargs):
        """Forward request to least loaded server with automatic retries"""
        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            server = None
            try:
                server = await self.get_least_loaded_server()

                async with aiohttp.ClientSession() as session:
                    async with session.request(
                        method,
                        f"{server}{path}",
                        timeout=aiohttp.ClientTimeout(total=300),  # 5 min timeout
                        **kwargs
                    ) as response:
                        body = await response.read()
                        return {
                            'status': response.status,
                            'body': body,
                            'headers': response.headers
                        }

            except Exception as e:
                last_error = e
                print(f"Request failed (attempt {attempt + 1}/{max_retries}): {e}")

            finally:
                # Always release connection count
                if server:
                    await self.release_connection(server)

        raise Exception(f"Request failed after {max_retries} attempts: {last_error}")

# Usage
async def main():
    servers = [
        'http://10.0.1.10:8000',
        'http://10.0.1.11:8000',
        'http://10.0.1.12:8000'
    ]

    lb = LeastConnectionsLoadBalancer(servers)

    # Example request
    result = await lb.proxy_request('/api/process-video', method='POST', json={
        'video_id': '12345',
        'quality': '1080p'
    })
    print(f"Response: {result['status']}")

if __name__ == '__main__':
    asyncio.run(main())
```

### Explanation

**Why Least Connections**: Perfect for workloads with variable request processing times. Ensures servers with long-running requests don't receive new work.

**Connection Tracking**: We maintain a counter for each server, incrementing when a request starts and decrementing when it completes (in the `finally` block to handle errors).

**Thread Safety**: We use `asyncio.Lock()` to prevent race conditions when multiple requests access connection counters simultaneously.

### Trade-offs

- ✅ **Pros**: Better load distribution for variable request times
- ✅ **Pros**: Prevents overloading busy servers
- ✅ **Pros**: Ideal for long-lived connections (WebSockets, video processing)
- ❌ **Cons**: More complex than round-robin (requires connection tracking)
- ❌ **Cons**: Slight overhead from locking mechanism
- ❌ **Cons**: Doesn't account for actual server CPU/memory usage (only connection count)

---

## Example 3: AWS Application Load Balancer - Terraform

### AWS Services

- **Application Load Balancer (ALB)**: Layer 7 load balancer with advanced routing (path-based, host-based)
- **Target Groups**: Define backend server pools with health check configuration
- **Auto Scaling Group**: Automatically adds/removes servers based on load
- **CloudWatch**: Monitoring and alerting

### Infrastructure as Code

```hcl
# Application Load Balancer (Public-facing)
resource "aws_lb" "main" {
  name               = "production-api-alb"
  internal           = false
  load_balancer_type = "application"

  # Deploy across 3 availability zones
  subnets = [
    aws_subnet.public_us_east_1a.id,
    aws_subnet.public_us_east_1b.id,
    aws_subnet.public_us_east_1c.id
  ]

  security_groups = [aws_security_group.alb.id]
  enable_deletion_protection = true

  tags = {
    Name = "production-api-alb"
  }
}

# Target Group - Backend server pool
resource "aws_lb_target_group" "api_servers" {
  name     = "api-servers-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  # Health check configuration
  health_check {
    enabled             = true
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 30
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api_servers.arn
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "api_servers" {
  name = "api-servers-asg"
  vpc_zone_identifier = [
    aws_subnet.private_us_east_1a.id,
    aws_subnet.private_us_east_1b.id,
    aws_subnet.private_us_east_1c.id
  ]

  target_group_arns = [aws_lb_target_group.api_servers.arn]

  min_size         = 3
  max_size         = 20
  desired_capacity = 5

  health_check_type = "ELB"

  launch_template {
    id      = aws_launch_template.api_server.id
    version = "$Latest"
  }
}
```

### Cost Considerations

**AWS ALB Pricing (us-east-1)**:
- Load Balancer: $0.0225/hour = ~$16/month
- LCU: $0.008/hour per LCU
- Example (100k req/min): ~$521/month total

---

## Interview Deep Dive

### Common Interview Questions

**Q1: What is a load balancer and when would you use it?**

**A**: A load balancer distributes incoming network traffic across multiple backend servers. You use it when:

1. **Horizontal Scaling**: Single server can't handle peak traffic (e.g., 10k → 100k req/sec)
2. **High Availability**: Need 99.9%+ uptime, can't afford server failures
3. **Zero-Downtime Deployments**: Rolling updates require routing traffic away from updating servers

Real-world: Netflix uses AWS ALB to distribute 250M+ subscribers across thousands of microservices, handling 1B+ requests/day.

**Q2: How does a load balancer scale to handle 10 million requests per second?**

**A**: Multi-layered approach:

**Layer 1 - DNS Load Balancing**: Distribute across regions (us-east, us-west, eu-west, ap-southeast)

**Layer 2 - Regional Load Balancers**: Each region handles 2-3M req/sec

**Layer 3 - Server Auto-Scaling**: 500 servers × 20k req/sec = 10M req/sec capacity

**Bottleneck Mitigation**: Use read replicas, caching (Redis), database sharding

**Q3: What are the failure modes of a load balancer?**

**A**: Common failures:

1. **Cascading Failure During Deployment**: New servers fail health checks, old servers get overwhelmed
   - **Solution**: Blue-green deployment, increase unhealthy_threshold

2. **Uneven Load with Sticky Sessions**: Power users overload one server
   - **Solution**: Store sessions in Redis, use least-connections

3. **Connection Limit Exhaustion**: Hit 65k connection limit
   - **Solution**: Reduce keep-alive timeout, add more LB nodes

**Q4: Load Balancer vs API Gateway - when to use each?**

**A**:

| Aspect | Load Balancer | API Gateway |
|--------|---------------|-------------|
| Purpose | Traffic distribution | API management + routing |
| Features | Health checks, SSL | Rate limiting, auth, transformations |
| Latency | <1ms | 10-50ms |
| Use Case | Microservices | External APIs |

**When Load Balancer**: Internal microservices, simple HTTP distribution
**When API Gateway**: External APIs with authentication, rate limiting

**Q5: How would you implement load balancing for 50 million daily active users?**

**A**: For 50M DAU (1B requests/day, peak 40k req/sec):

**Global DNS**: Route to 4 regions (US-East 40%, US-West 30%, EU 20%, APAC 10%)

**Regional ALBs**: Each handles appropriate traffic share

**Auto Scaling**: US-East needs ~16k req/sec capacity = 10 instances (c5.xlarge)

**Caching**: CloudFront + Redis reduces load 80% → only 8k req/sec hits servers

**Monthly Cost**: ~$5,760 (with caching) vs $18,000 (without)

---

## Tools & Technologies

### Industry Standard Solutions

| Tool | Use Case | Pros | Cons | Scale |
|------|----------|------|------|-------|
| **AWS ALB** | HTTP/HTTPS apps | Auto-scaling, managed, Layer 7 | Higher cost | 10M+ req/sec |
| **AWS NLB** | Low-latency TCP/UDP | Ultra-low latency, static IPs | No Layer 7 | 25M+ req/sec |
| **Nginx** | Self-hosted | Free, configurable | Manual management | 50k-500k req/sec |
| **HAProxy** | Self-hosted TCP/HTTP | Free, powerful ACLs | Complex config | 100k-1M req/sec |
| **Envoy** | Service mesh | Modern, dynamic config | Complex setup | 100k+ req/sec |

### Cloud Provider Solutions

**AWS**:
- Application Load Balancer (ALB): Layer 7 HTTP/HTTPS
- Network Load Balancer (NLB): Layer 4 TCP/UDP, ultra-low latency
- Classic Load Balancer (CLB): Legacy, not recommended

**GCP**:
- Global HTTP(S) Load Balancer: Anycast IP, global distribution
- Regional Network Load Balancer: Low-latency TCP/UDP

**Azure**:
- Azure Load Balancer: Layer 4
- Application Gateway: Layer 7 with WAF

---

## Best Practices

### Do's ✅

- **Enable Health Checks on Critical Dependencies**: Check database and cache connectivity, not just HTTP 200

```javascript
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        await redis.ping();
        res.status(200).send('OK');
    } catch (error) {
        res.status(503).send('Unavailable');
    }
});
```

- **Use Cross-Zone Load Balancing**: Distribute evenly across all availability zones

- **Implement Connection Draining**: Allow in-flight requests to complete (30-300s delay)

- **Monitor P95/P99 Latency**: Not just averages

- **Use Multiple Load Balancers Across Regions**: Never rely on single LB/region

### Don'ts ❌

- **Don't Store Session State on Application Servers**: Use Redis/DynamoDB for sessions

- **Don't Use IP Hash for Mobile Apps**: IPs change frequently (WiFi ↔ cellular)

- **Don't Forget SSL Termination at Load Balancer**: Reduces CPU load 20-30%

- **Don't Ignore Connection Limits**: Monitor and plan for 65k TCP limit

- **Don't Use Round-Robin for WebSockets**: Use least-connections for long-lived connections

### Monitoring & Observability

**Key Metrics**:
- Target Response Time: P95 < 200ms, P99 < 500ms
- Request Count: Alert on 3x spike
- 5xx Error Rate: < 0.1%
- Unhealthy Target Count: Alert if > 20%

**Alerting**:
```
Critical: 5xx > 1% for 5 min, all targets unhealthy
Warning: P99 > 1s for 10 min, unhealthy count > 2
```

---

## Common Failure Modes

### Failure 1: Cascading Failure During Deployment

**Symptom**: New servers fail health checks, old servers overwhelmed, site goes down

**Solution**: Rollback, increase unhealthy_threshold=3, blue-green deployment

### Failure 2: Uneven Load with Sticky Sessions

**Symptom**: Server 1 at 90% CPU, others at 20%

**Solution**: Disable sticky sessions, store sessions in Redis, use least-connections

### Failure 3: Connection Limit Hit

**Symptom**: "Connection refused" at 65k connections

**Solution**: Reduce keep-alive timeout (10s), enable HTTP/2, add more LB nodes

---

## Summary

### Key Takeaways

- **Core Concept**: Distributes traffic across servers for scalability and high availability
- **When to Use**: > 10k req/sec, need 99.9%+ uptime, zero-downtime deployments
- **Scaling Strategy**: DNS → Regional LBs → Auto-scaling → Caching (80-90% reduction)
- **Main Trade-off**: Complexity and cost vs massive scalability

### Related Patterns

- **Auto Scaling**: Works with LB to add/remove servers
- **Service Discovery**: Dynamic backend registration
- **Circuit Breaker**: Prevents traffic to failing services
- **CDN**: Caches content upstream, reduces LB traffic 70-90%

### Interview Checklist

- [ ] Can explain in 2 minutes
- [ ] Can draw architecture diagram
- [ ] Know 2-3 real examples (Netflix, LinkedIn, Uber)
- [ ] Understand failure modes
- [ ] Can compare LB vs API Gateway
- [ ] Know scaling to 10M req/sec
- [ ] Understand algorithms (round-robin, least connections, IP hash)
- [ ] Can explain health checks
- [ ] Know cost implications
- [ ] Understand Layer 4 vs Layer 7

---

[← Back to SystemDesign](../README.md)
