# Network Troubleshooting

Network debugging questions are scenario-based. What interviewers want is a **method** — a repeatable order of elimination, not a list of tools.

## The Method

Work up the layers. Each step eliminates a whole class of cause.

```
1. Is there a ROUTE?           → route tables, peering, TGW
2. Is the packet ALLOWED?      → security groups, NACLs
3. Is DNS resolving?           → dig, resolver config
4. Is anything LISTENING?      → ss -tlnp
5. Is TLS negotiating?         → openssl s_client
6. Is the APPLICATION correct? → curl -v
```

✅ **Always start from the symptom, because it narrows the layer immediately:**

| Symptom | Layer | Most Likely Cause |
|---------|-------|------------------|
| **Timeout** | 3–4 | Security group, NACL, or missing route — packet dropped silently |
| **Connection refused** | 4 | ✅ Network is fine — nothing listening on that port |
| **DNS failure** | 7 | Resolver, record, or CoreDNS |
| **TLS error** | 6 | Certificate chain, expiry, or protocol version |
| **HTTP 502/503/504** | 7 | Backend health, timeouts, keep-alive mismatch |
| **Works one direction only** | 3 | NACL missing the return rule |
| **Intermittent** | any | One AZ or one instance misconfigured |

> 🔴 **Timeout versus refused is the single most useful distinction.** Timeout means something dropped the packet, so look at security groups, NACLs, and routes. Refused means the packet arrived and was rejected by the kernel, so the network path works and the application is not running or not bound correctly.

## AWS-Native Tools First

These answer questions faster than logging into instances.

### Reachability Analyzer

✅ **Start here.** It evaluates the actual configuration — no packets sent, no instance access needed — and names the component blocking the path.

```bash
aws ec2 create-network-insights-path \
  --source i-0abc123 \
  --destination i-0def456 \
  --destination-port 5432 \
  --protocol tcp

aws ec2 start-network-insights-analysis \
  --network-insights-path-id nip-0abc123

aws ec2 describe-network-insights-analyses \
  --network-insights-analysis-ids nia-0abc123 \
  --query 'NetworkInsightsAnalyses[0].[NetworkPathFound,Explanations]'
```

**What it tells you:**

```json
{
  "NetworkPathFound": false,
  "Explanations": [{
    "ExplanationCode": "MISSING_INGRESS_RULE",
    "SecurityGroup": { "Id": "sg-0abc123" },
    "Port": 5432
  }]
}
```

⚠️ It analyses **configuration**, not live traffic. A path it says works can still fail because nothing is listening, or because a host firewall inside the instance is blocking.

### VPC Flow Logs

The record of what actually happened at the ENI level.

```hcl
resource "aws_flow_log" "vpc" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "s3"                       # ✅ far cheaper than CloudWatch
  log_destination      = aws_s3_bucket.flow_logs.arn
  max_aggregation_interval = 60

  # Custom format — pkt-srcaddr is essential for EKS pod traffic
  log_format = join(" ", [
    "$${version}", "$${account-id}", "$${interface-id}",
    "$${srcaddr}", "$${dstaddr}", "$${srcport}", "$${dstport}",
    "$${protocol}", "$${packets}", "$${bytes}",
    "$${start}", "$${end}", "$${action}", "$${log-status}",
    "$${pkt-srcaddr}", "$${pkt-dstaddr}", "$${tcp-flags}",
  ])
}
```

🔴 **The `action` field is what you are looking for:** `ACCEPT` or `REJECT`.

```sql
-- Athena: what is being rejected to this instance?
SELECT srcaddr, dstaddr, dstport, protocol, COUNT(*) AS attempts
FROM vpc_flow_logs
WHERE action = 'REJECT'
  AND dstaddr = '10.0.32.15'
  AND day >= '2026/08/01'
GROUP BY 1,2,3,4
ORDER BY attempts DESC
LIMIT 20;
```

| Reading Flow Logs | Meaning |
|-------------------|---------|
| `REJECT` on inbound | Security group or NACL denied it |
| `ACCEPT` inbound, no matching outbound | 🔴 NACL blocking the return path |
| No records at all | Traffic never reached the ENI — routing or DNS |
| `tcp-flags = 2` (SYN only), repeated | Handshake never completing |

⚠️ **`srcaddr` versus `pkt-srcaddr`:** with EKS, `srcaddr` may be the node while `pkt-srcaddr` is the pod. Without the packet fields in your log format, pod-level traffic is invisible.

✅ Send Flow Logs to **S3, not CloudWatch Logs**. The volume is high and CloudWatch ingestion charges add up fast.

## Command-Line Diagnosis

### Layer 3 — reachability

```bash
ping -c 4 10.0.32.15                # ⚠️ ICMP is often blocked; failure ≠ unreachable
traceroute -n -T -p 5432 10.0.32.15 # TCP traceroute — works where ICMP is blocked
mtr --report --report-cycles 20 10.0.32.15   # ✅ best tool: continuous, shows per-hop loss
```

⚠️ **A failed ping proves nothing in AWS.** Security groups commonly permit TCP while dropping ICMP, so the host may be perfectly reachable on its actual port.

### Layer 4 — is the port open

```bash
nc -zv 10.0.32.15 5432              # ✅ fastest port check
nc -zv -w 3 10.0.32.15 5432         # with a timeout

ss -tlnp                            # what is listening locally
ss -tan state established | wc -l   # connection count
ss -tan state close-wait | wc -l    # 🔴 leaked sockets = app bug

# Is it bound correctly?
ss -tlnp | grep 3000
# 127.0.0.1:3000  🔴 localhost only — unreachable from outside
# 0.0.0.0:3000    ✅ all interfaces
```

🔴 **Binding to `127.0.0.1` instead of `0.0.0.0` is a classic.** The service works when you `curl localhost` on the box and is unreachable from anywhere else, including the load balancer.

### DNS

```bash
dig +short api.acme.com
dig +trace api.acme.com             # ✅ follow the full delegation chain
dig @10.0.0.2 api.acme.com          # query the VPC resolver directly
dig @8.8.8.8 api.acme.com           # compare with a public resolver

# Inside a pod
cat /etc/resolv.conf
nslookup payments.production.svc.cluster.local
```

**Kubernetes DNS specifics:**

```bash
kubectl -n kube-system get pods -l k8s-app=kube-dns
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=50

# 🔴 Egress NetworkPolicy must allow UDP 53 — a common self-inflicted outage
kubectl get networkpolicy -A
```

⚠️ **A restrictive egress NetworkPolicy that forgets UDP port 53 breaks all DNS in the namespace.** Everything then fails with resolution errors that look like application bugs.

### TLS

```bash
openssl s_client -connect api.acme.com:443 -servername api.acme.com

# Expiry and issuer, quickly
echo | openssl s_client -connect api.acme.com:443 -servername api.acme.com 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer

# Force a version to test what is supported
openssl s_client -connect api.acme.com:443 -tls1_2
```

| Error | Cause |
|-------|-------|
| `unable to get local issuer certificate` | 🔴 Missing intermediate certificate |
| `certificate has expired` | Expiry — check renewal, not just the cert |
| `wrong version number` | Plain HTTP on a TLS port, or vice versa |
| `handshake failure` | No cipher or protocol version in common |
| `Hostname mismatch` | Certificate does not cover the requested name |

### Layer 7 — the timing breakdown

```bash
curl -w '@-' -o /dev/null -s https://api.acme.com/health <<'EOF'
  dns_lookup:  %{time_namelookup}s
  tcp_connect: %{time_connect}s
  tls_done:    %{time_appconnect}s
  ttfb:        %{time_starttransfer}s
  total:       %{time_total}s
  http_code:   %{http_code}
EOF
```

> ✨ **This is the highest-value command in the file.** It splits "the API is slow" into four distinct problems with four different owners — DNS, network, TLS, or the application.

### Packet capture — last resort

```bash
# Are SYNs arriving at all?
tcpdump -i any -nn 'tcp[tcpflags] & tcp-syn != 0 and port 5432' -c 20

# Are resets being sent, and by whom?
tcpdump -i any -nn 'tcp[tcpflags] & tcp-rst != 0' -c 20

# Capture for offline analysis
tcpdump -i any -nn -s 0 -w /tmp/capture.pcap 'host 10.0.32.15'
```

| Observation | Conclusion |
|-------------|-----------|
| No SYN arriving | Blocked upstream — security group, NACL, or routing |
| SYN arrives, no SYN-ACK | Nothing listening, or a host firewall |
| SYN, SYN-ACK, then RST | Application accepted then closed — often a TLS or protocol mismatch |
| Retransmissions | Packet loss or MTU problem |

## Scenario Playbooks

### "Pods cannot reach RDS"

```
1. Reachability Analyzer: pod ENI → RDS ENI on 5432
2. Is the RDS security group allowing the node/pod security group?
3. Is RDS in the isolated subnet with a route the pod subnet can use?
4. DNS: does the RDS endpoint resolve inside the pod?
5. Egress NetworkPolicy — allowing 5432 AND UDP 53?
6. Is the connection pool exhausted rather than the network broken?
```

### "Intermittent 502s from the ALB"

```
1. ALB access logs: target_status_code and target_processing_time
   → -1 means the request never reached a target
2. Backend keep-alive timeout vs ALB idle timeout (60s)  ← most common
3. deregistration_delay too low, killing in-flight requests
4. Target health flapping — check the health check thresholds
5. Is the health check hitting the database? One blip removes every target
```

### "It works from one AZ but not another"

```
1. Compare route tables per subnet — they are frequently not identical
2. Compare NACLs per subnet
3. Is there a NAT gateway in that AZ, or only in one?
4. Interface VPC endpoints — present in all AZs?
5. Flow logs filtered to the failing subnet
```

### "Suddenly slow, nothing changed"

```
1. Was it DNS? curl -w timing breakdown
2. Cross-AZ traffic introduced by a rescheduled pod?
3. NAT gateway port exhaustion — ErrorPortAllocation metric
4. Connection pool exhausted — CLOSE_WAIT count
5. Certificate chain being re-fetched — slow time_appconnect
```

## Metrics That Explain Network Problems

| Metric | Watch For |
|--------|----------|
| `ErrorPortAllocation` (NAT) | 🔴 Port exhaustion — over 55,000 concurrent connections to one destination |
| `PacketsDropCount` (NAT) | NAT gateway saturation |
| `HTTPCode_ELB_5XX_Count` | ✅ The load balancer's own errors, not the backend's |
| `UnHealthyHostCount` | Targets failing health checks |
| `TargetResponseTime` | Backend latency |
| `ActiveFlowCount` (NLB) | Connection volume |
| `coredns_dns_request_duration_seconds` | DNS latency inside the cluster |

🔴 **NAT gateway port exhaustion** is an easily-missed failure. A single NAT gateway supports about 55,000 simultaneous connections **to the same destination IP and port**. A service polling one external API from thousands of pods hits this, and the symptom is intermittent connection timeouts that look random.

✅ Fix by adding NAT gateways per AZ, or by using VPC endpoints so the traffic never traverses NAT at all.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Concluding "unreachable" from a failed ping | Wrong diagnosis | ICMP is often blocked; test the real port |
| Skipping Reachability Analyzer | 20 minutes of guessing | Run it first |
| Flow Logs without `pkt-srcaddr` | Pod traffic invisible on EKS | Custom log format |
| Flow Logs to CloudWatch | Large bill | Send to S3, query with Athena |
| Forgetting UDP 53 in egress NetworkPolicy | 🔴 All DNS fails in the namespace | Allow UDP 53 to kube-dns |
| Service bound to 127.0.0.1 | Unreachable from the LB | Bind 0.0.0.0 |
| Assuming subnets are identical | One-AZ failures | Compare route tables and NACLs |
| Ignoring `CLOSE_WAIT` growth | FD exhaustion, service stops accepting | Fix connection closing |

## Interview Q&A

**Q: A service cannot connect to a database. Walk me through your approach.**

I start by establishing whether it is a timeout or a connection refused, because that splits the problem in half. A timeout means packets are being dropped, so the cause is in routing, security groups, or NACLs. Connection refused means the packet arrived and the kernel rejected it, so the network path is fine and the problem is that nothing is listening or the process is bound to localhost. Then I would run Reachability Analyzer between the two ENIs on the database port, because it evaluates the real configuration and names the exact blocking component without needing access to either host. If it reports a path exists, I move to what configuration analysis cannot see: whether the process is listening on the right interface, whether DNS resolves the endpoint correctly from inside the pod, and whether a host firewall or an egress NetworkPolicy is involved. VPC Flow Logs confirm what actually happened, with the `action` field showing ACCEPT or REJECT.

**Q: Why can a failed `ping` be misleading in AWS?**

Because ping uses ICMP, and security groups very commonly permit TCP on application ports while never allowing ICMP at all. So a host can be entirely healthy and reachable on port 443 while every ping times out. People treat a failed ping as proof of unreachability and start debugging routing that is perfectly fine. The correct test is against the actual port the application uses, with `nc -zv host port`, or a TCP traceroute using `traceroute -T -p`, which works where ICMP is blocked. It cuts the other way too: a successful ping only proves layer 3 reachability and tells you nothing about whether the application port is open or the service is running.

**Q: What are VPC Flow Logs useful for, and what is the configuration detail people miss?**

They record accepted and rejected traffic at the ENI level, so they are the record of what actually happened rather than what the configuration implies. The `action` field is the key one: a REJECT tells you a security group or NACL denied the traffic, while seeing an inbound ACCEPT with no corresponding outbound record points at a NACL blocking the return path. The detail people miss is the log format. The default fields give you `srcaddr` and `dstaddr`, but on EKS those can be the node address rather than the pod, so pod-to-pod and pod-to-service traffic is effectively invisible — you need `pkt-srcaddr` and `pkt-dstaddr` in a custom format to see it. The other practical point is destination: Flow Logs are high volume, so sending them to CloudWatch Logs is expensive and S3 with Athena queries is far cheaper.

**Q: How do you determine whether "the API is slow" is a network or application problem?**

`curl -w` with a timing format string, which breaks a single request into named phases: DNS lookup, TCP connect, TLS handshake, and time to first byte. Those four numbers point at four completely different problems. A slow `time_namelookup` is DNS — a resolver issue, or in Kubernetes often CoreDNS under pressure. A slow `time_connect` is network distance or SYN retransmission due to loss. A slow `time_appconnect` is TLS negotiation, frequently because the certificate chain is incomplete and the client is fetching the intermediate. A slow `time_starttransfer` with everything else fast means the application itself, and the network is exonerated. Without that breakdown people guess, and "the network is slow" gets escalated to the wrong team while the actual cause is a missing database index.

**Q: What is NAT gateway port exhaustion and how would you spot it?**

A NAT gateway can maintain roughly 55,000 simultaneous connections to a single destination IP and port combination, because it multiplexes many private sources onto its own address using source ports. If a large number of pods all connect to the same external endpoint — a third-party API, a payment provider, a metrics vendor — you can exhaust that space. The symptom is nasty: intermittent connection timeouts that appear random and unreproducible, because most connections succeed and a fraction fail. The signal to look for is the `ErrorPortAllocation` metric on the NAT gateway, which is non-zero when this is happening and is otherwise easy to overlook. Fixes are running a NAT gateway per availability zone to spread the load, connection pooling and keep-alive in the application so it opens fewer connections, and where the destination is an AWS service, a VPC endpoint so the traffic bypasses NAT entirely.

**Q: Something works from one availability zone but not another. Where do you look?**

Per-subnet configuration, because the usual cause is that the subnets are not actually identical even though everyone assumes they are. I would compare the route tables first — it is common for one subnet to be associated with a different route table, or for a NAT gateway to exist in only one AZ so the other has no working egress path. Then NACLs, since those are per-subnet and can easily diverge. Then interface VPC endpoints, which are created per subnet, so an endpoint present in two AZs and missing in the third produces exactly this symptom for AWS API calls. Flow Logs filtered to the failing subnet will confirm whether traffic is being rejected or never arriving. The underlying lesson is that this class of bug comes from creating subnets by hand or with `count`-based Terraform where one iteration diverged, which is an argument for generating all subnets from one `for_each` over the AZ list.

---
[Networking Index](./README.md) | [← Service Mesh](./07-service-mesh.md)
