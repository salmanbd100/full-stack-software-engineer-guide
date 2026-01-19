# Linux Networking for DevOps

## Overview

Networking is fundamental to DevOps. Understanding Linux networking enables you to troubleshoot connectivity issues, configure services, secure infrastructure, and design cloud architectures.

**Why Networking Matters in DevOps:**
- Troubleshoot connectivity issues
- Configure load balancers and proxies
- Secure infrastructure with firewalls
- Design AWS VPC architectures
- Debug microservice communication
- Optimize application performance

**Networking Layers:**

| Layer | Protocol | Tools | Use Case |
|-------|----------|-------|----------|
| **Layer 3** | IP | ip, route, ping | Routing, addressing |
| **Layer 4** | TCP/UDP | netstat, ss, tcpdump | Connections, ports |
| **Layer 7** | HTTP/HTTPS | curl, wget, openssl | Application protocols |
| **DNS** | DNS | dig, nslookup, host | Name resolution |
| **Security** | Firewall | iptables, ufw, firewalld | Access control |

## Network Configuration

### 💡 **Network Interfaces**

Network interfaces are the connection points between your system and the network. Understanding interface configuration is essential for troubleshooting.

**Interface Types:**
- `eth0`, `eth1` - Ethernet interfaces (traditional naming)
- `ens33`, `enp0s3` - Predictable network interface names
- `wlan0` - Wireless interfaces
- `lo` - Loopback interface (127.0.0.1)
- `docker0` - Docker bridge interface
- `veth*` - Virtual Ethernet (containers)

### ip Command

```bash
# ========================================
# Modern Network Configuration (ip command)
# ========================================

# Show all interfaces
ip addr show
ip a                            # Short form

# Show specific interface
ip addr show eth0

# Show interface statistics
ip -s link show eth0

# Show only IPv4
ip -4 addr

# Show only IPv6
ip -6 addr

# ========================================
# Configure IP Address
# ========================================

# Add IP address
sudo ip addr add 192.168.1.100/24 dev eth0

# Remove IP address
sudo ip addr del 192.168.1.100/24 dev eth0

# Bring interface up
sudo ip link set eth0 up

# Bring interface down
sudo ip link set eth0 down

# Change MAC address
sudo ip link set eth0 down
sudo ip link set eth0 address 00:11:22:33:44:55
sudo ip link set eth0 up

# Set MTU
sudo ip link set eth0 mtu 9000

# ========================================
# Routing
# ========================================

# Show routing table
ip route show
ip route                        # Short form

# Show routing for specific destination
ip route get 8.8.8.8

# Add default gateway
sudo ip route add default via 192.168.1.1 dev eth0

# Add static route
sudo ip route add 10.0.0.0/24 via 192.168.1.1 dev eth0

# Delete route
sudo ip route del 10.0.0.0/24

# ========================================
# ARP (Address Resolution Protocol)
# ========================================

# Show ARP cache
ip neigh show
ip neigh                        # Short form

# Add static ARP entry
sudo ip neigh add 192.168.1.1 lladdr 00:11:22:33:44:55 dev eth0

# Delete ARP entry
sudo ip neigh del 192.168.1.1 dev eth0

# Flush ARP cache
sudo ip neigh flush all
```

### Persistent Network Configuration

```bash
# ========================================
# Ubuntu/Debian - Netplan
# ========================================

# /etc/netplan/01-netcfg.yaml
cat > /etc/netplan/01-netcfg.yaml << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
        search:
          - example.com
EOF

# Apply configuration
sudo netplan apply

# Test configuration (will rollback after 120s)
sudo netplan try

# Debug configuration
sudo netplan --debug apply

# ========================================
# CentOS/RHEL - Network Scripts
# ========================================

# /etc/sysconfig/network-scripts/ifcfg-eth0
cat > /etc/sysconfig/network-scripts/ifcfg-eth0 << 'EOF'
TYPE=Ethernet
BOOTPROTO=static
NAME=eth0
DEVICE=eth0
ONBOOT=yes
IPADDR=192.168.1.100
NETMASK=255.255.255.0
GATEWAY=192.168.1.1
DNS1=8.8.8.8
DNS2=8.8.4.4
EOF

# Restart networking
sudo systemctl restart network

# Restart specific interface
sudo ifdown eth0 && sudo ifup eth0

# ========================================
# DNS Configuration
# ========================================

# /etc/resolv.conf
cat > /etc/resolv.conf << 'EOF'
nameserver 8.8.8.8
nameserver 8.8.4.4
search example.com
options timeout:2 attempts:3
EOF

# /etc/hosts - Static hostname resolution
cat > /etc/hosts << 'EOF'
127.0.0.1   localhost
192.168.1.10 web1.example.com web1
192.168.1.11 web2.example.com web2
192.168.1.20 db1.example.com db1
EOF
```

## Network Connectivity Testing

### ping - ICMP Echo

```bash
# ========================================
# ping - Test Connectivity
# ========================================

# Basic ping
ping google.com

# Limit to 4 packets
ping -c 4 google.com

# Ping with timestamp
ping -D google.com

# Set packet size
ping -s 1000 google.com

# Flood ping (requires root)
sudo ping -f google.com

# Ping specific interface
ping -I eth0 192.168.1.1

# Set timeout
ping -W 2 192.168.1.1          # 2 second timeout

# Ping interval
ping -i 0.5 google.com         # Every 0.5 seconds

# IPv6 ping
ping6 google.com

# ========================================
# Understanding ping Output
# ========================================

# ping 8.8.8.8
# PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.
# 64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=10.2 ms
# 64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=10.5 ms
#
# --- 8.8.8.8 ping statistics ---
# 2 packets transmitted, 2 received, 0% packet loss, time 1001ms
# rtt min/avg/max/mdev = 10.234/10.387/10.541/0.153 ms

# TTL (Time To Live):
# 64  - Linux/Unix
# 128 - Windows
# 255 - Network device (router, switch)

# Response time:
# < 1ms   - Excellent (local network)
# < 20ms  - Good (internet)
# < 100ms - Acceptable
# > 100ms - Slow (investigate)
```

### traceroute - Path Discovery

```bash
# ========================================
# traceroute - Trace Network Path
# ========================================

# Install traceroute
apt install traceroute          # Debian/Ubuntu
yum install traceroute          # CentOS/RHEL

# Basic traceroute
traceroute google.com

# Use ICMP instead of UDP
sudo traceroute -I google.com

# Use TCP (port 80)
sudo traceroute -T -p 80 google.com

# Maximum hops
traceroute -m 20 google.com

# Don't resolve hostnames (faster)
traceroute -n google.com

# ========================================
# mtr - Better traceroute
# ========================================

# Install mtr
apt install mtr                 # Debian/Ubuntu
yum install mtr                 # CentOS/RHEL

# Interactive mode
mtr google.com

# Report mode (10 cycles)
mtr -c 10 -r google.com

# No DNS resolution
mtr -n google.com

# Wide report format
mtr -w google.com

# Understanding mtr output:
# Loss%   - Packet loss at that hop
# Snt     - Packets sent
# Avg     - Average latency
# Best    - Best latency
# Wrst    - Worst latency
# StDev   - Standard deviation
```

### netcat - Network Swiss Army Knife

```bash
# ========================================
# netcat (nc) - Versatile Network Tool
# ========================================

# Test TCP port connectivity
nc -zv google.com 80
nc -zv google.com 443

# Test port range
nc -zv google.com 80-443

# Listen on port (server mode)
nc -l 8080

# Connect to port (client mode)
nc localhost 8080

# Send file over network
# Server:
nc -l 8080 > received_file.txt
# Client:
nc server_ip 8080 < file_to_send.txt

# Simple chat server
# Server:
nc -l 8080
# Client:
nc server_ip 8080

# UDP mode
nc -u server_ip 53

# Timeout
nc -w 5 google.com 80

# Keep listening after disconnect
nc -kl 8080

# ========================================
# Port Scanning (use responsibly!)
# ========================================

# Scan single port
nc -zv target 22

# Scan multiple ports
nc -zv target 22 80 443

# Scan port range
nc -zv -w 2 target 20-25

# Fast scan (1 second timeout)
nc -zv -w 1 target 1-1000
```

## DNS Tools

### dig - DNS Lookup

```bash
# ========================================
# dig - DNS Query Tool
# ========================================

# Basic lookup
dig google.com

# Short answer only
dig google.com +short

# Specific record type
dig google.com A                # IPv4 address
dig google.com AAAA             # IPv6 address
dig google.com MX               # Mail servers
dig google.com NS               # Name servers
dig google.com TXT              # Text records
dig google.com CNAME            # Canonical name
dig google.com SOA              # Start of authority

# Query specific DNS server
dig @8.8.8.8 google.com
dig @1.1.1.1 google.com

# Reverse DNS lookup
dig -x 8.8.8.8

# Trace DNS resolution path
dig google.com +trace

# Show TTL only
dig google.com +noall +answer

# Query multiple records
dig google.com A MX NS

# Save to file
dig google.com > dns-results.txt

# ========================================
# nslookup - Alternative DNS Tool
# ========================================

# Basic lookup
nslookup google.com

# Specific DNS server
nslookup google.com 8.8.8.8

# Interactive mode
nslookup
> set type=MX
> google.com
> exit

# Reverse lookup
nslookup 8.8.8.8

# ========================================
# host - Simple DNS Lookup
# ========================================

# Basic lookup
host google.com

# All record types
host -a google.com

# Specific record type
host -t MX google.com

# Reverse lookup
host 8.8.8.8
```

## Connection and Port Monitoring

### ss - Socket Statistics

```bash
# ========================================
# ss - Modern netstat Alternative
# ========================================

# All sockets
ss -a

# TCP sockets only
ss -t

# UDP sockets only
ss -u

# Listening sockets
ss -l

# Listening TCP ports
ss -tln

# Established connections
ss -tn state established

# Show process using socket
ss -tlnp

# Show all TCP connections with processes
ss -tanp

# Filter by port
ss -tan sport = :80
ss -tan dport = :3306

# Show socket memory
ss -tm

# Show socket statistics
ss -s

# ========================================
# Common ss Patterns
# ========================================

# Show listening services
ss -tlnp | grep LISTEN

# Show established connections
ss -tan | grep ESTAB

# Count connections per state
ss -tan | awk '{print $1}' | sort | uniq -c

# Find connections to specific IP
ss -tan | grep 192.168.1.100

# Show connections with high send queue
ss -tan | awk '$3 > 0 {print}'

# ========================================
# Connection States
# ========================================

# TCP states:
# ESTABLISHED  - Active connection
# SYN-SENT     - Actively trying to establish
# SYN-RECEIVED - Received SYN, sent SYN-ACK
# FIN-WAIT-1   - Closing connection
# FIN-WAIT-2   - Waiting for FIN
# TIME-WAIT    - Waiting to ensure remote closed
# CLOSE        - Connection closed
# CLOSE-WAIT   - Waiting for local close
# LAST-ACK     - Waiting for FIN ACK
# LISTEN       - Listening for connections

# Check TIME-WAIT connections (should be temporary)
ss -tan state time-wait | wc -l

# Too many TIME-WAIT connections may indicate:
# - High connection turnover
# - Need to tune TCP settings
# - Application not reusing connections
```

### lsof - List Open Files (Including Sockets)

```bash
# ========================================
# lsof - List Open Files and Network Connections
# ========================================

# Network connections only
lsof -i

# Specific port
lsof -i :80
lsof -i :3306

# Port range
lsof -i :8000-9000

# TCP connections only
lsof -i tcp

# UDP connections only
lsof -i udp

# Specific protocol and port
lsof -i tcp:80

# IPv4 only
lsof -i 4

# Connections to specific host
lsof -i @192.168.1.100

# What's using a port?
lsof -i :8080

# Which process has a file open?
lsof /var/log/syslog

# Files opened by specific process
lsof -p 1234

# Files opened by specific user
lsof -u nginx

# Files opened by specific command
lsof -c nginx

# Combine filters (AND)
lsof -u nginx -i tcp:80

# Files opened in directory
lsof +D /var/www/

# ========================================
# Practical lsof Examples
# ========================================

# Find what's using port 80
sudo lsof -i :80 -P

# Find deleted files still held open
lsof | grep deleted

# Find processes with most open files
lsof | awk '{print $1}' | sort | uniq -c | sort -rn | head

# Monitor file opens in real-time
lsof -r 1

# Network connections for nginx
lsof -i -a -c nginx
```

## Packet Capture and Analysis

### tcpdump - Packet Capture

```bash
# ========================================
# tcpdump - Capture Network Traffic
# ========================================

# Capture on interface
sudo tcpdump -i eth0

# Capture specific count
sudo tcpdump -c 100 -i eth0

# Write to file
sudo tcpdump -i eth0 -w capture.pcap

# Read from file
tcpdump -r capture.pcap

# Show in ASCII
sudo tcpdump -A -i eth0

# Show in hex and ASCII
sudo tcpdump -X -i eth0

# Don't resolve hostnames (faster)
sudo tcpdump -n -i eth0

# Don't resolve hostnames or ports
sudo tcpdump -nn -i eth0

# Verbose output
sudo tcpdump -v -i eth0
sudo tcpdump -vv -i eth0          # More verbose
sudo tcpdump -vvv -i eth0         # Maximum verbosity

# ========================================
# Filtering Traffic
# ========================================

# Specific host
sudo tcpdump -i eth0 host 192.168.1.100

# Specific source
sudo tcpdump -i eth0 src 192.168.1.100

# Specific destination
sudo tcpdump -i eth0 dst 192.168.1.100

# Specific port
sudo tcpdump -i eth0 port 80

# Specific protocol
sudo tcpdump -i eth0 tcp
sudo tcpdump -i eth0 udp
sudo tcpdump -i eth0 icmp

# Multiple conditions (AND)
sudo tcpdump -i eth0 'tcp and port 80'

# Multiple conditions (OR)
sudo tcpdump -i eth0 'tcp port 80 or tcp port 443'

# Exclude traffic (NOT)
sudo tcpdump -i eth0 'not port 22'

# Specific network
sudo tcpdump -i eth0 net 192.168.1.0/24

# ========================================
# Advanced Filters
# ========================================

# HTTP GET requests
sudo tcpdump -i eth0 -A 'tcp port 80 and (tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420)'

# SYN packets (connection attempts)
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0'

# All packets except SSH
sudo tcpdump -i eth0 'not port 22'

# Traffic between two hosts
sudo tcpdump -i eth0 'host 192.168.1.100 and host 192.168.1.200'

# Packets larger than 1000 bytes
sudo tcpdump -i eth0 'greater 1000'

# ========================================
# Practical tcpdump Examples
# ========================================

# Capture HTTP traffic
sudo tcpdump -i eth0 -A -s0 'tcp port 80'

# Capture DNS queries
sudo tcpdump -i eth0 -nn port 53

# Monitor traffic to specific server
sudo tcpdump -i eth0 -nn host db.example.com

# Capture for 5 minutes
sudo timeout 300 tcpdump -i eth0 -w 5min-capture.pcap

# Rotate capture files (100MB each)
sudo tcpdump -i eth0 -w capture.pcap -C 100
```

## HTTP/HTTPS Tools

### curl - Transfer Data

```bash
# ========================================
# curl - HTTP Client
# ========================================

# Basic GET request
curl https://api.example.com

# Save to file
curl -o output.html https://example.com
curl -O https://example.com/file.zip     # Use remote filename

# Follow redirects
curl -L https://example.com

# Show headers only
curl -I https://example.com
curl --head https://example.com

# Include response headers
curl -i https://example.com

# Verbose output
curl -v https://example.com

# Silent mode (no progress)
curl -s https://example.com

# POST request
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# POST form data
curl -X POST https://example.com/login \
  -d "username=admin&password=secret"

# Upload file
curl -X POST https://api.example.com/upload \
  -F "file=@document.pdf"

# Custom headers
curl -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json" \
  https://api.example.com

# PUT request
curl -X PUT https://api.example.com/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane"}'

# DELETE request
curl -X DELETE https://api.example.com/users/123

# Basic authentication
curl -u username:password https://api.example.com

# Bearer token
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com

# Timeout
curl --connect-timeout 5 --max-time 10 https://example.com

# Retry on failure
curl --retry 3 --retry-delay 2 https://example.com

# Show timing
curl -w "@-" -o /dev/null -s https://example.com << 'EOF'
    time_namelookup:  %{time_namelookup}s\n
       time_connect:  %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
   time_pretransfer:  %{time_pretransfer}s\n
      time_redirect:  %{time_redirect}s\n
 time_starttransfer:  %{time_starttransfer}s\n
                    ----------\n
         time_total:  %{time_total}s\n
EOF

# Test API health
curl -f https://api.example.com/health || echo "API is down"

# ========================================
# SSL/TLS Testing
# ========================================

# Show SSL certificate
curl -vI https://example.com 2>&1 | grep -A 10 "Server certificate"

# Ignore SSL errors (not recommended for production)
curl -k https://self-signed.example.com

# Use specific SSL version
curl --tlsv1.2 https://example.com

# Show SSL handshake timing
curl -w "SSL handshake: %{time_appconnect}s\n" -o /dev/null -s https://example.com
```

### wget - Download Files

```bash
# ========================================
# wget - Web Downloader
# ========================================

# Download file
wget https://example.com/file.zip

# Save with custom filename
wget -O myfile.zip https://example.com/file.zip

# Continue interrupted download
wget -c https://example.com/largefile.zip

# Download in background
wget -b https://example.com/largefile.zip

# Mirror entire website
wget --mirror --convert-links --page-requisites https://example.com

# Download all PDFs from page
wget -r -l1 -A.pdf https://example.com

# Limit download speed
wget --limit-rate=1m https://example.com/file.zip

# Retry on failure
wget --tries=3 --retry-connrefused https://example.com/file.zip

# User agent
wget --user-agent="Mozilla/5.0" https://example.com

# Basic authentication
wget --user=username --password=password https://example.com

# Timestamping (only download if newer)
wget -N https://example.com/file.zip

# Quiet mode
wget -q https://example.com/file.zip

# Show progress bar
wget --progress=bar:force https://example.com/file.zip
```

## Firewall Configuration

### UFW (Uncomplicated Firewall)

```bash
# ========================================
# UFW - Simple Firewall (Ubuntu/Debian)
# ========================================

# Install UFW
sudo apt install ufw

# Enable UFW
sudo ufw enable

# Disable UFW
sudo ufw disable

# Check status
sudo ufw status
sudo ufw status verbose
sudo ufw status numbered         # Show rule numbers

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow specific port
sudo ufw allow 22                # SSH
sudo ufw allow 80/tcp            # HTTP
sudo ufw allow 443/tcp           # HTTPS

# Allow port range
sudo ufw allow 8000:9000/tcp

# Allow from specific IP
sudo ufw allow from 192.168.1.100

# Allow from specific IP to specific port
sudo ufw allow from 192.168.1.100 to any port 22

# Allow subnet
sudo ufw allow from 192.168.1.0/24

# Deny specific port
sudo ufw deny 3306

# Delete rule
sudo ufw delete allow 80
sudo ufw delete 1                # By rule number

# Application profiles
sudo ufw app list
sudo ufw allow 'Nginx Full'
sudo ufw allow 'OpenSSH'

# Logging
sudo ufw logging on
sudo ufw logging medium          # Low, medium, high, full

# Reset UFW (remove all rules)
sudo ufw reset
```

### iptables - Advanced Firewall

```bash
# ========================================
# iptables - Low-Level Firewall
# ========================================

# List all rules
sudo iptables -L
sudo iptables -L -v              # Verbose
sudo iptables -L -n              # No DNS resolution
sudo iptables -L -n --line-numbers

# List rules for specific chain
sudo iptables -L INPUT
sudo iptables -L OUTPUT
sudo iptables -L FORWARD

# Allow incoming SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow incoming HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow from specific IP
sudo iptables -A INPUT -s 192.168.1.100 -j ACCEPT

# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Drop all other incoming
sudo iptables -A INPUT -j DROP

# Delete rule
sudo iptables -D INPUT 1         # By rule number
sudo iptables -D INPUT -p tcp --dport 80 -j ACCEPT  # By specification

# Flush all rules
sudo iptables -F

# Save rules
sudo iptables-save > /etc/iptables/rules.v4

# Restore rules
sudo iptables-restore < /etc/iptables/rules.v4

# ========================================
# Common iptables Patterns
# ========================================

# Block specific IP
sudo iptables -A INPUT -s 192.168.1.100 -j DROP

# Rate limit connections
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

# Log dropped packets
sudo iptables -A INPUT -j LOG --log-prefix "IPTables-Dropped: "

# NAT (Network Address Translation)
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Port forwarding
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
```

## Network Troubleshooting Checklist

```bash
# ========================================
# Systematic Network Troubleshooting
# ========================================

# 1. Check interface status
ip addr show
ip link show

# 2. Check routing
ip route show
ip route get 8.8.8.8

# 3. Test local connectivity
ping -c 4 127.0.0.1              # Loopback
ping -c 4 192.168.1.1            # Gateway

# 4. Test external connectivity
ping -c 4 8.8.8.8                # Google DNS
ping -c 4 google.com             # Name resolution

# 5. Check DNS
dig google.com
cat /etc/resolv.conf

# 6. Check specific service
nc -zv google.com 80
curl -I https://google.com

# 7. Check listening services
ss -tlnp

# 8. Check firewall
sudo ufw status
sudo iptables -L

# 9. Check for packet loss
mtr -c 10 -r google.com

# 10. Capture traffic
sudo tcpdump -i eth0 -c 100

# ========================================
# Common Issues and Solutions
# ========================================

# Issue: Can't reach internet
# Solution:
ip route show                    # Check default gateway
ping -c 4 $(ip route | awk '/default/ {print $3}')  # Test gateway
cat /etc/resolv.conf             # Check DNS

# Issue: DNS not working
# Solution:
ping -c 4 8.8.8.8                # Test IP (works = network OK)
ping -c 4 google.com             # Test DNS (fails = DNS issue)
dig google.com @8.8.8.8          # Test with Google DNS
sudo systemctl restart systemd-resolved

# Issue: Port not accessible
# Solution:
ss -tlnp | grep :80              # Check if service listening
sudo ufw status                  # Check firewall
curl -v http://localhost         # Test locally first
curl -v http://server_ip         # Test remotely

# Issue: Slow connection
# Solution:
mtr google.com                   # Check for packet loss
ping -c 100 google.com | grep loss  # Test packet loss
iperf3 -c server_ip              # Test bandwidth
```

## Interview Questions

**Q1: What's the difference between TCP and UDP?**
A: TCP is connection-oriented, reliable, ordered, with error-checking. UDP is connectionless, faster, no guarantees. Use TCP for reliability (HTTP, SSH), UDP for speed (DNS, streaming).

**Q2: Explain the TCP three-way handshake.**
A:
1. Client sends SYN (synchronize)
2. Server responds with SYN-ACK (synchronize-acknowledge)
3. Client sends ACK (acknowledge)
Connection established.

**Q3: What do TIME-WAIT connections indicate?**
A: TIME-WAIT ensures the remote end received the final ACK. Too many TIME-WAIT connections indicate high connection turnover. Tune `net.ipv4.tcp_tw_reuse` or implement connection pooling.

**Q4: How do you troubleshoot "connection refused" vs "timeout"?**
A:
- **Connection refused**: Port is closed (nothing listening). Check service status.
- **Timeout**: Firewall blocking or no route. Check firewall rules and routing.

**Q5: What's the difference between ss and netstat?**
A: `ss` is faster and more efficient (uses netlink). `netstat` parses `/proc/net` files (slower). Both show network connections, but `ss` is the modern replacement.

**Q6: How do you find which process is using a port?**
A:
```bash
sudo lsof -i :80
sudo ss -tlnp | grep :80
sudo netstat -tlnp | grep :80
```

## Summary

**Linux Networking Essentials:**

1. **Configuration:**
   - ✅ `ip` command for interfaces and routing
   - ✅ Netplan (Ubuntu) or network-scripts (CentOS)
   - ✅ `/etc/resolv.conf` for DNS
   - ✅ `/etc/hosts` for static resolution

2. **Connectivity Testing:**
   - ✅ `ping` for basic connectivity
   - ✅ `traceroute`/`mtr` for path analysis
   - ✅ `nc` for port testing
   - ✅ `curl`/`wget` for HTTP testing

3. **Monitoring:**
   - ✅ `ss` for connections (replaces netstat)
   - ✅ `lsof` for open files and sockets
   - ✅ `tcpdump` for packet capture
   - ✅ `iftop`/`nethogs` for bandwidth

4. **DNS:**
   - ✅ `dig` for detailed queries
   - ✅ `nslookup` for simple lookups
   - ✅ `host` for quick checks
   - ✅ Test multiple DNS servers

5. **Firewall:**
   - ✅ `ufw` for simple rules (Ubuntu)
   - ✅ `iptables` for advanced rules
   - ✅ `firewalld` for zones (CentOS 7+)
   - ✅ Always test before production

**Key Insights:**
> - Master `ip` command—replaces ifconfig, route, arp
> - Use `ss` instead of netstat (faster, more info)
> - DNS issues are common—test with multiple servers
> - Understand TCP states for troubleshooting
> - Firewall rules: test locally first, then remote

---
[← Back: System Monitoring](./03-system-monitoring.md) | [Next: Package Management →](./05-package-management.md)
