---
title: Linux Networking for DevOps
part: 8
chapter: 0
slug: linux-networking
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-07-05
tags: [devops, linux, networking]
in_book: false
---

# Linux Networking for DevOps

## Overview

Networking is where most production incidents live. A service is down, a request hangs, DNS breaks. Your job is to find which layer failed and fix it fast.

This guide covers the tools that show up in real troubleshooting: `ip`, `ping`, `mtr`, `dig`, `ss`, `tcpdump`, `curl`, and firewalls. Learn to move down the stack: interface → routing → DNS → port → application.

**The layers you troubleshoot:**

| Layer | Deals with | Go-to tools |
|-------|-----------|-------------|
| **L3 (IP)** | Addressing, routing | `ip`, `ping` |
| **L4 (TCP/UDP)** | Ports, connections | `ss`, `tcpdump`, `nc` |
| **L7 (HTTP)** | App protocols | `curl`, `wget` |
| **DNS** | Name → IP | `dig` |
| **Security** | Access control | `ufw`, `iptables` |

## Network Configuration

### 💡 **The `ip` command**

The one tool for interfaces and routing. It replaces the old `ifconfig`, `route`, and `arp`.

| Task | Command |
|------|---------|
| Show all interfaces + IPs | `ip addr` (or `ip a`) |
| Show one interface | `ip addr show eth0` |
| IPv4 only | `ip -4 addr` |
| Bring interface up/down | `ip link set eth0 up` / `down` |
| Show routing table | `ip route` (or `ip r`) |
| Which route to an IP? | `ip route get 8.8.8.8` |
| Show ARP cache | `ip neigh` |

**Add an IP and default gateway (temporary, lost on reboot):**
```bash
sudo ip addr add 192.168.1.100/24 dev eth0
sudo ip route add default via 192.168.1.1 dev eth0
```

> **Key Insight:** Changes made with `ip` disappear on reboot. For permanent config, edit the distro's config files below.

### Persistent config

**Ubuntu/Debian use Netplan (`/etc/netplan/*.yaml`):**
```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

**Apply it:**
```bash
sudo netplan try     # applies, auto-rolls back in 120s if you lose access
sudo netplan apply   # applies permanently
```

> **Note:** RHEL/CentOS use `nmcli` or ifcfg files under `/etc/sysconfig/network-scripts/`. Same idea, different syntax.

### DNS files to know

| File | Purpose |
|------|---------|
| `/etc/resolv.conf` | Which DNS servers to query (`nameserver 8.8.8.8`) |
| `/etc/hosts` | Static name → IP overrides, checked before DNS |
| `/etc/nsswitch.conf` | Order of lookup sources (files vs DNS) |

**`/etc/hosts` entry:**
```bash
192.168.1.10  web1.example.com web1
```

## Connectivity Testing

### 💡 **ping — is the host reachable?**

Sends ICMP echo packets. First test in almost every investigation.

**Essentials:**
```bash
ping -c 4 google.com    # send 4 packets then stop (always use -c)
ping -c 4 8.8.8.8       # test raw IP — skips DNS
ping -W 2 10.0.0.5      # 2-second timeout per packet
```

**Reading the output:**
```
64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=10.2 ms
```

| Field | Meaning |
|-------|---------|
| `time` | Round-trip latency. <1ms local, <30ms good, >100ms slow |
| `ttl` | Hops left. Start values: 64 = Linux, 128 = Windows, 255 = router |
| `packet loss` | Anything >0% points to a network problem |

> **Key Insight:** If `ping 8.8.8.8` works but `ping google.com` fails, your network is fine and DNS is broken.

### 💡 **traceroute / mtr — where does it break?**

Shows the path packets take, hop by hop. Prefer `mtr` — it is traceroute plus continuous packet-loss stats in one view.

```bash
mtr google.com          # live, interactive view
mtr -rn -c 10 google.com  # report mode, 10 cycles, no DNS (great for tickets)
```

Read the `Loss%` column. Loss that starts at one hop and continues points to a problem there. Loss at a single middle hop that clears up after is usually just a router de-prioritizing ICMP — ignore it.

### 💡 **nc — is a specific port open?**

`ping` uses ICMP and cannot test a port. `nc` (netcat) does a real TCP check.

```bash
nc -zv db.example.com 5432   # -z scan (no data), -v verbose
nc -zv -w 2 host 22 80 443   # test several ports, 2s timeout each
```

## DNS

### 💡 **dig — the DNS debugger**

The tool for inspecting name resolution. More detail than `nslookup` or `host`.

**Essentials:**
```bash
dig google.com +short          # just the answer, nothing else
dig @1.1.1.1 google.com        # query a specific resolver (bypass local DNS)
dig google.com MX +short       # look up a specific record type
dig -x 8.8.8.8                 # reverse lookup (IP → name)
```

**Record types you should recognize:**

| Type | Maps to | Example use |
|------|---------|-------------|
| `A` | IPv4 address | `example.com → 93.184.216.34` |
| `AAAA` | IPv6 address | IPv6 hosts |
| `CNAME` | Another name | `www → example.com` |
| `MX` | Mail servers | Email routing |
| `NS` | Name servers | Delegation |
| `TXT` | Free text | SPF, domain verification |

> **Key Insight:** `dig @8.8.8.8 name` vs `dig name` isolates the problem. If the public resolver works but your default does not, your local resolver or `/etc/resolv.conf` is at fault.

## Connections and Ports

### 💡 **ss — who is connected, what is listening?**

The modern replacement for `netstat`. Faster because it reads kernel netlink directly.

**The patterns you actually use:**
```bash
ss -tlnp              # listening TCP ports + owning process (the #1 command)
ss -tanp              # all TCP connections + process
ss -tn state established   # only established connections
ss -tan sport = :80   # filter by source port
```

Flag cheat sheet: `t`=TCP, `u`=UDP, `l`=listening, `n`=numeric (no DNS), `p`=process.

**ss vs netstat:**

| | `ss` | `netstat` |
|---|------|-----------|
| Source | Kernel netlink | Parses `/proc/net` |
| Speed | Fast on busy hosts | Slow |
| Status | Standard today | Deprecated |

### 💡 **lsof — what process owns a port?**

```bash
sudo lsof -i :8080     # what is using port 8080
sudo lsof -i tcp:80    # narrow to TCP
sudo lsof -p 1234      # everything a PID has open
```

**Finding a port hog three ways (know all three for interviews):**
```bash
sudo ss -tlnp | grep :80
sudo lsof -i :80
sudo netstat -tlnp | grep :80   # older systems
```

### TCP states worth knowing

| State | Meaning |
|-------|---------|
| `LISTEN` | Waiting for connections |
| `ESTABLISHED` | Active connection |
| `TIME-WAIT` | Closed, briefly held so the final ACK lands |
| `CLOSE-WAIT` | Remote closed; **your app has not** — often a bug |

> **Key Insight:** Piles of `CLOSE-WAIT` usually mean the application is not closing sockets. Piles of `TIME-WAIT` are normal under high connection churn.

## Packet Capture

### 💡 **tcpdump — see the actual packets**

The last resort when higher-level tools cannot explain the behavior. Capture, then analyze.

**The one-liners that cover most cases:**
```bash
sudo tcpdump -i eth0 -nn                    # capture, no DNS/port name lookup
sudo tcpdump -i eth0 host 10.0.0.5          # traffic to/from one host
sudo tcpdump -i eth0 port 80                # traffic on one port
sudo tcpdump -i eth0 'tcp and port 443'     # combine conditions
sudo tcpdump -i eth0 -nn port 53            # watch DNS queries
sudo tcpdump -i eth0 -A 'tcp port 80'       # print payload as ASCII (HTTP)
sudo tcpdump -i eth0 -w capture.pcap        # save to file for Wireshark
tcpdump -nn -r capture.pcap                 # read a saved capture
```

> **Tip:** Always add `-nn` when debugging live — reverse DNS on every packet makes output slow and misleading.

## HTTP Tools

### 💡 **curl — test any HTTP endpoint**

**The interview-relevant subset:**
```bash
curl https://api.example.com              # GET
curl -I https://example.com               # headers only (HEAD)
curl -i https://example.com               # body + response headers
curl -v https://example.com               # full request/response, TLS handshake
curl -L https://example.com               # follow redirects
curl -f https://api.example.com/health    # fail (exit 22) on HTTP errors — for health checks
```

**POST with JSON and a header:**
```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John"}'
```

**Where is the time going? (`-w` timing breakdown):**
```bash
curl -o /dev/null -s -w \
  "dns:%{time_namelookup} connect:%{time_connect} tls:%{time_appconnect} total:%{time_total}\n" \
  https://example.com
```

> **Key Insight:** `-f` makes curl return a non-zero exit code on 4xx/5xx. Without it, curl exits 0 even on a 500 — health-check scripts silently pass.

### wget — download files

```bash
wget https://example.com/file.zip     # download
wget -c https://example.com/big.iso   # resume an interrupted download
```

Rule of thumb: `curl` to test and script APIs, `wget` to fetch files.

## Firewalls

### 💡 **ufw — the simple front-end**

On Ubuntu/Debian, `ufw` handles most needs with readable commands.

```bash
sudo ufw default deny incoming    # deny by default
sudo ufw default allow outgoing
sudo ufw allow 22/tcp             # SSH — allow BEFORE enabling or you lock yourself out
sudo ufw allow 443/tcp            # HTTPS
sudo ufw allow from 192.168.1.0/24 to any port 3306   # restrict by source
sudo ufw status numbered          # list rules with numbers
sudo ufw delete 3                 # delete rule 3
sudo ufw enable
```

> ⚠️ Over SSH? Allow port 22 **before** `ufw enable`, or the firewall drops your session.

### iptables — the layer underneath

`ufw` and `firewalld` are front-ends for `iptables` (nftables on newer kernels). You rarely write raw rules, but you must read them.

```bash
sudo iptables -L -n --line-numbers   # list rules, numeric, numbered
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT   # allow SSH
sudo iptables -A INPUT -s 1.2.3.4 -j DROP            # block an IP
```

Rules are evaluated top to bottom; first match wins. `-A` appends, `-D` deletes, `-j` sets the target (`ACCEPT`/`DROP`).

## Network Troubleshooting Checklist

Work up the stack, stopping at the first failure.

**Systematic path:**
```bash
# 1. Interface up and has an IP?
ip addr show

# 2. Route out exists?
ip route get 8.8.8.8

# 3. Reach the gateway, then the internet by IP?
ping -c4 $(ip route | awk '/default/{print $3}')
ping -c4 8.8.8.8

# 4. DNS resolving? (works by IP but not by name = DNS)
dig +short google.com @8.8.8.8

# 5. Is the target port actually open?
nc -zv host 443

# 6. Is the local service even listening?
ss -tlnp | grep :443

# 7. Firewall blocking it?
sudo ufw status

# 8. Still stuck? Watch the wire.
sudo tcpdump -i eth0 -nn host <target>
```

## Interview Questions

**Q1: TCP vs UDP — when do you use each?**
TCP is connection-oriented: reliable, ordered, error-checked, but slower. UDP is connectionless: fast, no delivery guarantee. Use TCP where correctness matters (HTTP, SSH, databases). Use UDP where speed beats completeness (DNS, video, VoIP, metrics).

**Q2: Walk through the TCP three-way handshake.**
Client sends `SYN`. Server replies `SYN-ACK`. Client sends `ACK`. Now both sides have agreed on sequence numbers and the connection is established. Teardown is a separate four-way `FIN`/`ACK` exchange.

**Q3: "Connection refused" vs "connection timed out" — what's the difference?**
Refused means the packet reached the host but nothing is listening on that port (host actively rejects with RST) — check the service is running. Timed out means no reply at all — usually a firewall silently dropping packets or a routing problem. Refused = service issue; timeout = network/firewall issue.

**Q4: Why prefer `ss` over `netstat`?**
`ss` reads socket data straight from the kernel via netlink, so it is much faster on busy hosts and shows more detail. `netstat` parses files under `/proc/net`, which is slow, and it is deprecated on modern distros. `ss -tlnp` is the standard "what's listening" command.

**Q5: A port is in use and you need the process. How do you find it?**
```bash
sudo ss -tlnp | grep :8080
sudo lsof -i :8080
```
Both show the owning PID and command. From there `ps -p <pid>` or `kill` as needed.

## Summary

> **Move down the stack.** Interface (`ip addr`) → route (`ip route get`) → DNS (`dig`) → port (`nc`, `ss`) → app (`curl`). Stop at the first thing that fails.

> **Know the modern tools.** `ip` over ifconfig, `ss` over netstat, `mtr` over traceroute, `dig` over nslookup. Interviewers notice.

> **Read the signals.** `ping` by IP working but by name failing = DNS. "Refused" = nothing listening. "Timeout" = firewall or routing. Piles of `CLOSE-WAIT` = an app not closing sockets.

---
[← Back: System Monitoring](./03-system-monitoring.md) | [Next: Package Management →](./05-package-management.md)
