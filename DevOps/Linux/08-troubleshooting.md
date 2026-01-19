# Linux Troubleshooting for DevOps

## Overview

Troubleshooting is a critical DevOps skill. Systematic approaches to identifying and resolving issues minimize downtime and improve system reliability.

**Why Troubleshooting Skills Matter:**
- Reduce mean time to resolution (MTTR)
- Minimize production downtime
- Identify root causes, not symptoms
- Prevent recurring issues
- Build reliable systems

**Troubleshooting Methodology:**

| Step | Action | Tools |
|------|--------|-------|
| **1. Identify** | Gather symptoms and error messages | logs, monitoring |
| **2. Reproduce** | Consistently recreate the issue | test scripts |
| **3. Isolate** | Narrow down possible causes | divide and conquer |
| **4. Resolve** | Apply fix and verify | implement solution |
| **5. Document** | Record findings and solution | runbooks, wiki |
| **6. Prevent** | Implement monitoring/alerts | automation |

## System Won't Boot

### 💡 **Boot Process Issues**

Understanding the Linux boot process helps diagnose boot failures.

**Boot Sequence:**
1. BIOS/UEFI → Hardware initialization
2. Bootloader (GRUB) → Loads kernel
3. Kernel → Initializes hardware, mounts root
4. Init system (systemd) → Starts services

### Emergency Boot and Recovery

```bash
# ========================================
# Boot into Emergency/Rescue Mode
# ========================================

# Method 1: GRUB menu
# 1. Reboot and press Shift/Esc to show GRUB menu
# 2. Select kernel entry
# 3. Press 'e' to edit
# 4. Find line starting with 'linux'
# 5. Add to end: systemd.unit=rescue.target
# 6. Press Ctrl+X to boot

# Method 2: Single user mode
# Add to kernel line: single

# Method 3: Emergency mode
# Add to kernel line: systemd.unit=emergency.target

# ========================================
# Common Boot Issues
# ========================================

# Issue: GRUB not found
# Cause: Bootloader corrupted or wrong disk
# Solution: Reinstall GRUB
# Boot from live USB
sudo mount /dev/sda1 /mnt
sudo mount --bind /dev /mnt/dev
sudo mount --bind /proc /mnt/proc
sudo mount --bind /sys /mnt/sys
sudo chroot /mnt
grub-install /dev/sda
update-grub
exit
sudo umount /mnt/dev /mnt/proc /mnt/sys /mnt
sudo reboot

# Issue: Kernel panic
# Cause: Corrupted kernel, driver issue, filesystem error
# Solution: Boot with older kernel (from GRUB advanced options)
# Or boot from live USB and repair filesystem

# Issue: Can't mount root filesystem
# Cause: Wrong UUID in /etc/fstab, filesystem corruption
# Solution: Boot to emergency mode
# Check /etc/fstab
cat /etc/fstab
# Fix UUID
blkid                                  # Find correct UUID
nano /etc/fstab                        # Update UUID
# Or run filesystem check
fsck /dev/sda1

# Issue: Infinite boot loop
# Cause: Service failing at startup
# Solution: Check failed services
systemctl list-units --failed
systemctl status service-name
# Disable problematic service
systemctl disable service-name
reboot

# ========================================
# Check Boot Logs
# ========================================

# View boot messages
dmesg | less
dmesg | grep -i error
dmesg | grep -i fail

# Journal from current boot
journalctl -b

# Journal from previous boot
journalctl -b -1

# Kernel messages only
journalctl -k
```

## Performance Issues

### 💡 **Systematic Performance Analysis**

Follow the USE method: Utilization, Saturation, Errors for each resource.

### High CPU Usage

```bash
# ========================================
# Diagnose High CPU
# ========================================

# 1. Identify CPU-heavy processes
top -o %CPU                            # Sort by CPU
htop                                   # Interactive viewer
ps aux --sort=-%cpu | head -10         # Top 10 CPU consumers

# 2. Check load average
uptime
# Compare to number of cores
nproc

# 3. Detailed CPU stats
mpstat -P ALL 2 10                     # Per-CPU stats
sar -u 2 10                            # CPU utilization

# 4. Find CPU-intensive threads
ps -eLf | head -1; ps -eLf | sort -k 4 -r | head -10

# 5. Profile running process
perf top                               # Real-time profiling
perf record -p PID -g -- sleep 30      # Record for 30 seconds
perf report                            # Analyze recording

# 6. Check for runaway processes
# Look for:
# - Processes at 100% CPU consistently
# - Many processes in running state
# - Zombie processes

# ========================================
# Solutions
# ========================================

# Temporary: Reduce process priority
renice +10 -p PID

# Kill runaway process
kill PID
kill -9 PID                            # Force kill

# Limit CPU with systemd
systemctl set-property myapp.service CPUQuota=50%

# Limit CPU with cgroups
cgcreate -g cpu:/limitcpu
cgset -r cpu.cfs_quota_us=50000 limitcpu
cgexec -g cpu:limitcpu command
```

### High Memory Usage

```bash
# ========================================
# Diagnose High Memory Usage
# ========================================

# 1. Check memory overview
free -h
free -h --si                           # Use 1000 instead of 1024

# 2. Identify memory-heavy processes
top -o %MEM
ps aux --sort=-%mem | head -10

# 3. Detailed memory info
vmstat 2 10
cat /proc/meminfo

# 4. Check for memory leaks
# Monitor process memory over time
watch -n 5 'ps aux | grep process-name'

# 5. Check swap usage
swapon --show
cat /proc/swaps

# 6. Check for Out Of Memory (OOM) kills
grep -i 'out of memory' /var/log/syslog
dmesg | grep -i 'killed process'
journalctl -k | grep -i 'oom'

# ========================================
# Solutions
# ========================================

# Free memory cache (safe)
sudo sync
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'

# Adjust swappiness (lower = less swap)
cat /proc/sys/vm/swappiness
sudo sysctl vm.swappiness=10
# Make permanent in /etc/sysctl.conf
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf

# Limit process memory with systemd
systemctl set-property myapp.service MemoryLimit=1G
systemctl set-property myapp.service MemoryMax=1G

# Limit with ulimit
ulimit -v 1048576                      # 1GB in KB
ulimit -m 1048576

# Add more swap (temporary fix)
sudo dd if=/dev/zero of=/swapfile bs=1G count=2
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Disk I/O Issues

```bash
# ========================================
# Diagnose Disk I/O Problems
# ========================================

# 1. Check I/O wait
top                                    # Look at %wa
vmstat 2 10                            # Look at wa column

# 2. Disk performance stats
iostat -x 2 10
# Look for:
# - High %util (>80% saturated)
# - High await (>20ms slow)
# - High r/s or w/s

# 3. Which processes doing I/O
sudo iotop
sudo iotop -o                          # Only show active

# 4. Check disk usage
df -h
df -i                                  # Check inodes

# 5. Find large files
du -ah / | sort -rh | head -20
find / -type f -size +100M -exec ls -lh {} \;

# 6. Check for disk errors
dmesg | grep -i 'I/O error'
smartctl -a /dev/sda

# ========================================
# Solutions
# ========================================

# Identify and stop I/O-heavy process
sudo iotop -o
kill PID

# Adjust I/O scheduling
cat /sys/block/sda/queue/scheduler
echo 'deadline' | sudo tee /sys/block/sda/queue/scheduler

# Reduce write operations
sudo sync                              # Flush buffers
# Increase commit interval
sudo sysctl -w vm.dirty_writeback_centisecs=3000

# Clear cache to free up space
journalctl --vacuum-time=7d
apt clean
yum clean all

# Find and delete old logs
find /var/log -type f -name "*.log" -mtime +30 -delete
```

## Network Issues

### 💡 **Network Troubleshooting**

Use a layered approach: Physical → Data Link → Network → Transport → Application

### Connection Problems

```bash
# ========================================
# Systematic Network Troubleshooting
# ========================================

# 1. Check interface status
ip link show
ip addr show

# 2. Check IP configuration
ip addr
ip route

# 3. Test local connectivity
ping -c 4 127.0.0.1                    # Loopback
ping -c 4 $(ip route | awk '/default/ {print $3}')  # Gateway

# 4. Test external connectivity
ping -c 4 8.8.8.8                      # Google DNS (IP)
ping -c 4 google.com                   # Name resolution

# 5. Test DNS
dig google.com
nslookup google.com
cat /etc/resolv.conf

# 6. Test specific service
nc -zv google.com 80
curl -I https://google.com
telnet google.com 80

# 7. Check routing
traceroute google.com
mtr google.com

# 8. Check firewall
sudo ufw status
sudo iptables -L -n

# ========================================
# Common Issues and Fixes
# ========================================

# Issue: Interface down
sudo ip link set eth0 up

# Issue: No IP address
# DHCP:
sudo dhclient eth0
# Static: Check /etc/netplan/ or /etc/network/interfaces

# Issue: Wrong gateway
sudo ip route add default via 192.168.1.1 dev eth0

# Issue: DNS not working
# Temporary:
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
# Permanent: Update /etc/netplan/ or /etc/systemd/resolved.conf

# Issue: Can't reach specific IP
# Check ARP
ip neigh show
# Clear ARP cache
sudo ip neigh flush all

# Issue: Firewall blocking
sudo ufw status
sudo ufw allow port/tcp
# Or
sudo iptables -L -n
sudo iptables -I INPUT -p tcp --dport PORT -j ACCEPT

# ========================================
# Packet Capture for Debug
# ========================================

# Capture traffic to/from specific host
sudo tcpdump -i eth0 host 192.168.1.100 -w capture.pcap

# Capture specific port
sudo tcpdump -i eth0 port 80 -w http.pcap

# Analyze capture
tcpdump -r capture.pcap | less
```

### Slow Network Performance

```bash
# ========================================
# Diagnose Network Performance
# ========================================

# 1. Check bandwidth usage
sudo iftop -i eth0
sudo nethogs eth0

# 2. Check interface statistics
ip -s link show eth0
netstat -i

# 3. Test bandwidth
# Install iperf3
sudo apt install iperf3

# Server side:
iperf3 -s

# Client side:
iperf3 -c server-ip

# 4. Check packet loss
ping -c 100 server-ip | grep loss

# 5. Check MTU
ip link show eth0 | grep mtu

# 6. Check TCP connections
ss -tan | wc -l                        # Total connections
ss -tan state established | wc -l      # Established
ss -tan state time-wait | wc -l        # TIME-WAIT

# ========================================
# Performance Tuning
# ========================================

# Increase TCP buffer sizes
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.wmem_max=16777216
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"

# Enable TCP window scaling
sudo sysctl -w net.ipv4.tcp_window_scaling=1

# Reduce TIME-WAIT connections
sudo sysctl -w net.ipv4.tcp_tw_reuse=1

# Increase connection backlog
sudo sysctl -w net.core.somaxconn=4096
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=8096

# Test MTU
ping -M do -s 1472 google.com          # Should work (1500 MTU)
ping -M do -s 8972 google.com          # Should work if jumbo frames

# Set MTU
sudo ip link set eth0 mtu 9000         # Jumbo frames
```

## Service Issues

### Service Won't Start

```bash
# ========================================
# Troubleshoot Service Failures
# ========================================

# 1. Check service status
systemctl status nginx

# 2. View recent logs
journalctl -u nginx -n 50
journalctl -u nginx --since "5 minutes ago"

# 3. Check for errors
journalctl -u nginx -p err

# 4. Verify configuration
nginx -t                               # Nginx
apachectl configtest                   # Apache
systemctl show nginx | grep ExecStart

# 5. Check dependencies
systemctl list-dependencies nginx
systemctl --failed

# 6. Check permissions
ls -la /var/log/nginx
ls -la /etc/nginx
ps aux | grep nginx

# 7. Check port availability
sudo lsof -i :80
sudo ss -tlnp | grep :80

# 8. Check disk space
df -h

# 9. Test manually
sudo -u www-data /usr/sbin/nginx -t

# ========================================
# Common Issues
# ========================================

# Issue: Port already in use
# Find what's using it
sudo lsof -i :80
sudo kill PID

# Issue: Permission denied
# Check service user
systemctl show nginx | grep User
# Fix permissions
sudo chown -R nginx:nginx /var/log/nginx

# Issue: Configuration error
# Check config syntax
nginx -t
# View exact error
journalctl -u nginx -n 20

# Issue: Missing dependencies
# For systemd service
systemctl status nginx
systemctl list-dependencies nginx --failed

# Issue: Resource limits
# Check limits
systemctl show nginx | grep -i limit
# Increase limits in service file
[Service]
LimitNOFILE=65536
sudo systemctl daemon-reload
sudo systemctl restart nginx

# ========================================
# Debug Service Startup
# ========================================

# Enable debug logging
SYSTEMD_LOG_LEVEL=debug systemctl start nginx

# Run service manually
sudo /usr/sbin/nginx -g 'daemon off;'

# Check service file
systemctl cat nginx
# Validate service file
systemd-analyze verify /etc/systemd/system/myapp.service
```

## Application Issues

### Application Crashes

```bash
# ========================================
# Debug Application Crashes
# ========================================

# 1. Check core dumps
ulimit -c                              # Check if enabled
ulimit -c unlimited                    # Enable core dumps
# Core dumps location
cat /proc/sys/kernel/core_pattern

# 2. Enable core dumps system-wide
echo '/tmp/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern

# 3. Analyze core dump
gdb /path/to/program /tmp/core.program.PID
# In gdb:
(gdb) bt                               # Backtrace
(gdb) info threads                     # Thread info
(gdb) quit

# 4. Check system logs
journalctl -xe
grep -i segfault /var/log/syslog
dmesg | grep -i "segfault"

# 5. Run with debugging
strace -f -o trace.log /path/to/program
ltrace -o ltrace.log /path/to/program

# 6. Check for resource exhaustion
ulimit -a                              # View all limits
cat /proc/PID/limits                   # Check process limits

# ========================================
# Debug Running Process
# ========================================

# Attach debugger to running process
gdb -p PID

# System call tracing
sudo strace -p PID -f

# Library call tracing
sudo ltrace -p PID

# File access tracing
sudo inotifywait -m /path/to/watch

# Check open files
lsof -p PID

# Check process threads
ps -T -p PID
top -H -p PID

# Memory map
pmap -x PID
cat /proc/PID/maps
```

### Container Issues

```bash
# ========================================
# Troubleshoot Docker Containers
# ========================================

# 1. Check container status
docker ps -a
docker inspect container-name

# 2. View container logs
docker logs container-name
docker logs -f container-name          # Follow
docker logs --since 10m container-name # Last 10 minutes

# 3. Execute commands in container
docker exec -it container-name /bin/bash
docker exec container-name ps aux
docker exec container-name df -h

# 4. Check resource usage
docker stats
docker stats container-name

# 5. Check container events
docker events --since 1h

# 6. Inspect container details
docker inspect container-name | jq '.[0].State'
docker inspect container-name | jq '.[0].NetworkSettings'

# 7. Check container network
docker network ls
docker network inspect bridge

# 8. Debug failing container
docker run --rm -it image-name /bin/bash

# ========================================
# Common Container Issues
# ========================================

# Issue: Container exits immediately
docker logs container-name
docker start -a container-name         # Start attached

# Issue: Can't connect to container
docker inspect container-name | grep IPAddress
docker port container-name
docker network inspect bridge

# Issue: Permission denied in container
# Check user in Dockerfile
docker exec container-name id
# Run as root temporarily
docker exec -u 0 -it container-name /bin/bash

# Issue: Out of disk space
docker system df
docker system prune -a                 # Clean up
docker volume prune
```

## Common Troubleshooting Patterns

### Systematic Approach

```bash
# ========================================
# General Troubleshooting Workflow
# ========================================

# 1. Gather information
# - What is the problem?
# - When did it start?
# - What changed recently?
# - Can you reproduce it?

# 2. Check basics
uptime                                 # System load and uptime
df -h                                  # Disk space
free -h                                # Memory
top                                    # Resource usage

# 3. Check logs
journalctl -xe                         # Recent system logs
tail -f /var/log/syslog               # Follow system log
dmesg | tail                           # Kernel messages

# 4. Check specific service
systemctl status service-name
journalctl -u service-name -n 50

# 5. Check network
ip addr                                # IP configuration
ip route                               # Routing
ping gateway                           # Connectivity

# 6. Check for recent changes
last                                   # Login history
history                                # Command history
journalctl --since "1 hour ago"        # Recent events

# 7. Check for errors
grep -i error /var/log/syslog
systemctl --failed
docker ps -a --filter "status=exited"

# 8. Test in isolation
# Isolate the problem:
# - Does it happen on other systems?
# - Does it happen with different data?
# - Does it happen at specific times?

# 9. Make one change at a time
# Test and verify after each change

# 10. Document solution
# Record what fixed it for future reference
```

### Essential Troubleshooting Commands

```bash
# ========================================
# Quick Reference
# ========================================

# System overview
uptime && free -h && df -h

# Process overview
ps auxf | head -30

# Network overview
ss -tunlp && ip addr && ip route

# Service overview
systemctl list-units --failed && systemctl list-units --type=service --state=running

# Log overview
journalctl -p err --since today

# Disk I/O
iostat -x 2 3 && iotop -o -b -n 1

# Network activity
iftop -t -s 5

# Full system check
{
  echo "=== System Info ==="
  uptime
  free -h
  df -h
  echo ""
  echo "=== Failed Services ==="
  systemctl --failed
  echo ""
  echo "=== Recent Errors ==="
  journalctl -p err --since "1 hour ago" | tail -20
  echo ""
  echo "=== Network ==="
  ip addr | grep "inet "
  ss -tulnp | grep LISTEN
  echo ""
  echo "=== Top Processes ==="
  ps aux --sort=-%cpu | head -10
} | tee system-report.txt
```

## Interview Questions

**Q1: How would you troubleshoot a server that's running slow?**
A: Systematic approach:
1. Check load average and compare to CPU count
2. Check memory usage and swap activity
3. Check disk I/O wait
4. Identify resource-heavy processes (top/htop)
5. Check logs for errors
6. Review recent changes

**Q2: What would you do if a service won't start?**
A:
1. `systemctl status service-name` - Check status
2. `journalctl -u service-name` - View logs
3. Test configuration file syntax
4. Check dependencies and required services
5. Verify permissions and ownership
6. Check port availability
7. Test manually to isolate issue

**Q3: How do you troubleshoot high disk I/O?**
A:
1. Use `iostat -x` to check disk utilization
2. Use `iotop` to find I/O-heavy processes
3. Check for low free disk space
4. Look for large log files
5. Check for disk errors in dmesg
6. Consider filesystem fragmentation
7. Review application queries/operations

**Q4: Server can reach some websites but not others. How do you troubleshoot?**
A:
1. Test with IP address vs hostname (DNS issue?)
2. `traceroute` to see where connection fails
3. Check firewall rules
4. Check routing table
5. Test from different network (ISP issue?)
6. Check if specific ports blocked
7. Review security group rules (if cloud)

**Q5: How would you investigate an OOM (Out Of Memory) kill?**
A:
1. Check logs: `grep -i 'out of memory' /var/log/syslog`
2. Check dmesg: `dmesg | grep -i 'killed process'`
3. Identify killed process and PID
4. Check memory usage patterns for that process
5. Review process configuration and limits
6. Add monitoring to catch memory growth
7. Consider adding memory or fixing leak

## Summary

**Troubleshooting Essentials:**

1. **Methodology:**
   - ✅ Systematic approach (don't guess)
   - ✅ Gather information first
   - ✅ Check basics (space, memory, CPU)
   - ✅ Isolate the problem
   - ✅ Make one change at a time

2. **Key Tools:**
   - **System**: top, htop, uptime, free, df
   - **Logs**: journalctl, dmesg, tail
   - **Network**: ping, traceroute, ss, tcpdump
   - **Process**: ps, lsof, strace
   - **Service**: systemctl, service

3. **Common Issues:**
   - **Performance**: High CPU/memory/disk I/O
   - **Network**: Connectivity, DNS, firewall
   - **Services**: Won't start, crashes, resource limits
   - **Boot**: GRUB, kernel panic, filesystem

4. **Best Practices:**
   - ✅ Check logs first
   - ✅ Understand what changed
   - ✅ Document solutions
   - ✅ Implement monitoring
   - ✅ Create runbooks

5. **Prevention:**
   - Monitor proactively
   - Implement alerting
   - Regular health checks
   - Capacity planning
   - Automated testing

**Key Insights:**
> - Most issues have patterns—learn common ones
> - Logs are your best friend
> - Reproduce issues in non-prod first
> - One change at a time for debugging
> - Document everything for next time

---
[← Back: Security](./07-security.md) | [Back to DevOps →](../README.md)
