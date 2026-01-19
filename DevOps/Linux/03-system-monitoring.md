# System Monitoring for DevOps

## Overview

System monitoring is critical for maintaining healthy infrastructure, identifying performance bottlenecks, and troubleshooting issues. DevOps engineers must master both real-time monitoring and long-term analysis.

**Why System Monitoring Matters:**
- Detect issues before users notice
- Identify performance bottlenecks
- Capacity planning and scaling
- Troubleshoot production incidents
- Optimize resource utilization
- Meet SLA/SLO requirements

**Monitoring Categories:**

| Category | Tools | Metrics | Use Case |
|----------|-------|---------|----------|
| **CPU** | top, htop, mpstat | Usage, load average | Performance analysis |
| **Memory** | free, vmstat | Used, available, swap | Memory leaks, OOM |
| **Disk** | df, iostat, iotop | Space, I/O, throughput | Storage issues |
| **Network** | iftop, nethogs | Bandwidth, connections | Network bottlenecks |
| **Process** | ps, pstree | Status, resources | Application health |

## CPU Monitoring

### 💡 **Understanding CPU Metrics**

CPU monitoring reveals how well your system handles computational workload.

**Key Metrics:**
- **CPU Usage (%)**: Time CPU spends executing processes
- **Load Average**: Number of processes waiting for CPU over 1, 5, 15 minutes
- **Context Switches**: How often CPU switches between processes
- **Wait I/O**: Time CPU waits for disk I/O

**Load Average Interpretation:**
```
Load Average: 1.50, 2.30, 3.10 (1min, 5min, 15min)

For 4-core system:
- 1.50 → 37.5% utilized (healthy)
- 4.00 → 100% utilized (maxed out)
- 8.00 → 200% overloaded (processes waiting)

Rule of thumb:
- Load < cores: System healthy
- Load = cores: Fully utilized
- Load > cores: Overloaded (bottleneck)
```

### top Command

```bash
# ========================================
# Basic top Usage
# ========================================

# Launch top
top

# Top output:
# top - 14:30:45 up 10 days,  3:42,  2 users,  load average: 1.50, 1.20, 0.95
# Tasks: 245 total,   2 running, 243 sleeping,   0 stopped,   0 zombie
# %Cpu(s): 12.5 us,  3.2 sy,  0.0 ni, 82.1 id,  1.8 wa,  0.2 hi,  0.2 si,  0.0 st
# MiB Mem :  15892.2 total,   2134.5 free,   8456.7 used,   5301.0 buff/cache
# MiB Swap:   2048.0 total,   1948.5 free,     99.5 used.   6234.8 avail Mem

#   PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
#  1234 root      20   0 1234567 123456  12345 R  25.3   5.2  10:23.45 node
#  5678 www-data  20   0 2345678 234567  23456 S  12.1   8.3  45:12.34 nginx

# Understanding columns:
# PID     - Process ID
# USER    - Process owner
# PR      - Priority
# NI      - Nice value (-20 to 19)
# VIRT    - Virtual memory
# RES     - Physical memory (Resident Set Size)
# SHR     - Shared memory
# S       - Status (R=Running, S=Sleeping, D=Disk wait, Z=Zombie)
# %CPU    - CPU percentage
# %MEM    - Memory percentage
# TIME+   - Total CPU time
# COMMAND - Process name

# ========================================
# Interactive Commands in top
# ========================================

# While top is running:
# 1     - Show individual CPU cores
# P     - Sort by CPU usage (default)
# M     - Sort by memory usage
# T     - Sort by running time
# k     - Kill a process (prompts for PID)
# r     - Renice a process (change priority)
# u     - Filter by user
# c     - Show full command path
# f     - Field management (select columns)
# W     - Save configuration
# q     - Quit

# ========================================
# top Command Options
# ========================================

# Batch mode (non-interactive)
top -b -n 1                     # Single snapshot

# Monitor specific user
top -u nginx

# Update every 2 seconds
top -d 2

# Show specific number of processes
top -n 1 -b | head -20

# Output to file
top -b -n 1 > top-snapshot.txt

# Monitor specific process
top -p 1234                     # Single PID
top -p 1234,5678,9012           # Multiple PIDs

# Custom output format
top -b -n 1 -o +%CPU | head -15  # Top CPU consumers
```

### htop - Enhanced top

```bash
# ========================================
# htop - Better Alternative to top
# ========================================

# Install htop
apt install htop        # Debian/Ubuntu
yum install htop        # CentOS/RHEL

# Launch htop
htop

# Features:
# - Color-coded interface
# - Mouse support
# - Visual CPU/memory bars
# - Process tree view
# - Easy sorting and filtering
# - Built-in process management

# Interactive keys:
# F1    - Help
# F2    - Setup (configuration)
# F3    - Search process
# F4    - Filter processes
# F5    - Tree view
# F6    - Sort by column
# F9    - Kill process
# F10   - Quit
# Space - Tag process
# u     - Show processes for user
# t     - Tree view toggle
# H     - Hide/show user threads
# K     - Hide/show kernel threads
# /     - Search

# Command-line options
htop -u nginx                   # Show only nginx user
htop -p 1234,5678               # Monitor specific PIDs
htop -t                         # Start in tree view
htop -d 50                      # Update delay (0.5 seconds)

# Save CPU snapshot
htop -C                         # No colors (for logging)
```

### mpstat - CPU Statistics

```bash
# ========================================
# mpstat - Multi-Processor Statistics
# ========================================

# Install sysstat package
apt install sysstat             # Debian/Ubuntu
yum install sysstat             # CentOS/RHEL

# View all CPU statistics
mpstat

# Output:
# Linux 5.4.0 (hostname)    01/19/2026    _x86_64_    (4 CPU)
#
# 02:30:45 PM  CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest  %gnice   %idle
# 02:30:45 PM  all   12.34    0.00    3.21    1.43    0.12    0.34    0.00    0.00    0.00   82.56

# Show all individual CPUs
mpstat -P ALL

# Continuous monitoring (every 2 seconds, 10 times)
mpstat 2 10

# Monitor specific CPU
mpstat -P 0 2 5                 # CPU 0, every 2 seconds, 5 times

# Understanding output:
# %usr    - User space (applications)
# %nice   - Low priority processes
# %sys    - Kernel/system processes
# %iowait - Waiting for I/O (disk/network)
# %irq    - Hardware interrupts
# %soft   - Software interrupts
# %steal  - Time stolen by hypervisor (VMs)
# %idle   - Idle time

# High %iowait → Disk bottleneck
# High %sys    → Kernel overhead (syscalls)
# High %steal  → Hypervisor overcommit (AWS, VMs)
```

### uptime and Load Average

```bash
# ========================================
# uptime - System Load
# ========================================

# Show system uptime and load
uptime
# 14:30:45 up 10 days,  3:42,  2 users,  load average: 1.50, 1.20, 0.95

# Just load average
cat /proc/loadavg
# 1.50 1.20 0.95 2/245 12345
# (1min 5min 15min running/total last_PID)

# Watch load over time
watch -n 1 uptime

# ========================================
# Interpreting Load Average
# ========================================

# Get number of CPU cores
nproc
# 4

# Calculate load percentage
# Load 1.50 on 4 cores = 1.50/4 = 37.5% utilized

# Load trends:
# Increasing (0.95 → 1.20 → 1.50): Load rising
# Decreasing (1.50 → 1.20 → 0.95): Load falling
# Stable:     (1.20 → 1.20 → 1.20): Consistent load

# Healthy load thresholds:
# Load < (cores * 0.7)   → Healthy
# Load < cores           → Acceptable
# Load > cores           → Overloaded
# Load > (cores * 1.5)   → Severe bottleneck
```

## Memory Monitoring

### 💡 **Understanding Memory Metrics**

Memory monitoring helps detect leaks, optimize usage, and prevent OOM (Out Of Memory) kills.

**Key Metrics:**
- **Total**: Physical RAM installed
- **Used**: Memory in use
- **Free**: Completely unused memory
- **Available**: Memory available for new processes (free + reclaimable cache)
- **Buffers/Cache**: Kernel cache (can be freed if needed)
- **Swap**: Disk-based virtual memory

### free Command

```bash
# ========================================
# free - Memory Usage
# ========================================

# Basic memory info
free
#               total        used        free      shared  buff/cache   available
# Mem:       16341264     8654321     2134567      123456     5552376     6234567
# Swap:       2097152       99456     1997696

# Human-readable format
free -h
#               total        used        free      shared  buff/cache   available
# Mem:           15Gi        8.2Gi       2.0Gi       120Mi        5.3Gi       5.9Gi
# Swap:         2.0Gi        97Mi       1.9Gi

# Continuous monitoring (every 2 seconds)
free -h -s 2

# Wide format (easier to read)
free -h -w
#               total        used        free      shared     buffers       cache   available
# Mem:           15Gi        8.2Gi       2.0Gi       120Mi       234Mi       5.1Gi       5.9Gi
# Swap:         2.0Gi        97Mi       1.9Gi

# ========================================
# Understanding Memory Output
# ========================================

# Key concepts:
# 1. Linux uses "free" memory for cache (buff/cache)
# 2. Cache is automatically freed when needed
# 3. "available" is what matters, not "free"

# Memory pressure indicators:
# available < 10% of total    → Low memory
# swap used > 25% of total    → Memory pressure
# swap in/out increasing      → Active swapping (bad!)

# Check if system is swapping
vmstat 1 5
# Watch "si" (swap in) and "so" (swap out) columns
# Non-zero values = active swapping = performance problem
```

### vmstat - Virtual Memory Statistics

```bash
# ========================================
# vmstat - Comprehensive System Stats
# ========================================

# Single snapshot
vmstat
# procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
#  r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
#  2  0  99456 2134567 234567 5317809    0    0   120   240 1234 5678 12  3 84  1  0

# Continuous monitoring (every 2 seconds)
vmstat 2

# 10 samples, every 2 seconds
vmstat 2 10

# Show memory stats in MB
vmstat -S M 2

# Active/inactive memory
vmstat -a

# ========================================
# Understanding vmstat Columns
# ========================================

# Procs:
# r  - Processes waiting for CPU (runnable)
# b  - Processes in uninterruptible sleep (I/O wait)

# Memory (in KB):
# swpd  - Virtual memory used
# free  - Free memory
# buff  - Buffer cache
# cache - Page cache

# Swap:
# si - Memory swapped in from disk (KB/s)
# so - Memory swapped out to disk (KB/s)

# I/O:
# bi - Blocks received from disk (blocks/s)
# bo - Blocks sent to disk (blocks/s)

# System:
# in - Interrupts per second
# cs - Context switches per second

# CPU (percentage):
# us - User time
# sy - System time
# id - Idle time
# wa - Wait I/O
# st - Stolen time (VMs)

# ========================================
# Problem Indicators
# ========================================

# High r (> number of cores)  → CPU bottleneck
# High b (> 1)                → I/O bottleneck
# si/so > 0 consistently      → Memory pressure (swapping)
# High wa (> 20%)             → Disk bottleneck
# High cs (> 100k)            → Too much context switching
```

### Finding Memory Hogs

```bash
# ========================================
# Identify Memory-Consuming Processes
# ========================================

# Top memory consumers
ps aux --sort=-%mem | head -10

# Show memory usage per process
ps aux --sort=-%mem | awk 'NR<=10{printf "%-8s %-8s %s\n", $2, $4, $11}'

# Detailed memory info for process
cat /proc/PID/status | grep -E 'VmSize|VmRSS|VmSwap'

# Memory map for process
pmap -x PID

# Find processes using swap
for pid in /proc/[0-9]*; do
    swap=$(awk '/^Swap:/ {sum+=$2} END {print sum}' $pid/smaps 2>/dev/null)
    if [ "$swap" -gt 0 ]; then
        echo "PID: $(basename $pid) Swap: $swap kB"
    fi
done | sort -k4 -nr | head

# Check OOM (Out Of Memory) kills
grep -i 'killed process' /var/log/syslog
dmesg | grep -i 'out of memory'
```

## Disk I/O Monitoring

### iostat - I/O Statistics

```bash
# ========================================
# iostat - Disk I/O Performance
# ========================================

# Basic disk statistics
iostat

# Extended statistics
iostat -x

# Output:
# Device            r/s     w/s     rkB/s   wkB/s  %util
# sda            120.00   45.00   4800.00  1800.00  12.34

# Continuous monitoring (every 2 seconds)
iostat -x 2

# Show in MB and with timestamps
iostat -xm -t 2

# Monitor specific device
iostat -x sda 2 10

# ========================================
# Understanding iostat Columns
# ========================================

# r/s, w/s    - Reads/writes per second
# rkB/s, wkB/s - KB read/written per second
# await       - Average time for I/O requests (ms)
# svctm       - Service time (ms)
# %util       - Device utilization (percentage)

# Performance indicators:
# await > 20ms          → Slow disk response
# %util > 80%           → Disk saturated
# r/s + w/s > 500       → High I/O (SSD can handle)
# await increasing      → Disk getting slower

# SSD vs HDD thresholds:
# SSD:  %util > 90% concerning, await > 10ms slow
# HDD:  %util > 60% concerning, await > 20ms slow
```

### iotop - I/O by Process

```bash
# ========================================
# iotop - Top-like I/O Monitor
# ========================================

# Install iotop
apt install iotop               # Debian/Ubuntu
yum install iotop               # CentOS/RHEL

# Basic iotop
sudo iotop

# Show only processes doing I/O
sudo iotop -o

# Show accumulated I/O (not current)
sudo iotop -a

# Batch mode (non-interactive)
sudo iotop -b -n 3

# Monitor specific processes
sudo iotop -p 1234,5678

# Understanding iotop output:
# DISK READ  - Current disk read rate
# DISK WRITE - Current disk write rate
# SWAPIN     - Swap read percentage
# IO>        - I/O priority

# Interactive commands:
# r  - Reverse sort
# o  - Toggle showing only active processes
# p  - Toggle between processes and threads
# a  - Toggle accumulated/current stats
# q  - Quit
```

### Disk Space Monitoring

```bash
# ========================================
# df - Disk Space Usage
# ========================================

# Human-readable disk space
df -h
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        20G   15G   4.2G  79% /
# /dev/sdb1       100G   45G    50G  48% /data

# Show inode usage
df -i
# Filesystem      Inodes  IUsed   IFree IUse% Mounted on
# /dev/sda1      1310720 245678 1065042   19% /

# Show filesystem type
df -T

# Exclude specific filesystem types
df -h -x tmpfs -x devtmpfs

# ========================================
# du - Directory Space Usage
# ========================================

# Size of current directory
du -sh .

# Size of subdirectories
du -sh *

# Show top-level directories only
du -h --max-depth=1 | sort -hr

# Top 10 largest directories
du -sh /* 2>/dev/null | sort -hr | head -10

# Find large files
find /var -type f -size +100M -exec ls -lh {} \;

# Find files larger than 1GB in /var/log
find /var/log -type f -size +1G -exec du -h {} \; | sort -hr

# ========================================
# Disk Space Alerts
# ========================================

# Check disk usage and alert if > 80%
df -h | awk '+$5 >= 80 {print "WARNING: " $0}'

# Monitor disk space script
cat > /usr/local/bin/check-disk-space.sh << 'EOF'
#!/bin/bash
THRESHOLD=80

df -h | grep -vE '^Filesystem|tmpfs|cdrom' | awk '{ print $5 " " $1 }' | while read output;
do
  usage=$(echo $output | awk '{ print $1}' | cut -d'%' -f1)
  partition=$(echo $output | awk '{ print $2 }')

  if [ $usage -ge $THRESHOLD ]; then
    echo "WARNING: Disk usage on $partition is at ${usage}%"
  fi
done
EOF

chmod +x /usr/local/bin/check-disk-space.sh
```

## Network Monitoring

### iftop - Network Bandwidth

```bash
# ========================================
# iftop - Network Traffic by Connection
# ========================================

# Install iftop
apt install iftop               # Debian/Ubuntu
yum install iftop               # CentOS/RHEL

# Monitor default interface
sudo iftop

# Monitor specific interface
sudo iftop -i eth0

# Show port numbers (not service names)
sudo iftop -n

# No DNS resolution (faster)
sudo iftop -N

# Show bandwidth in bytes
sudo iftop -B

# Interactive commands:
# n  - Toggle DNS resolution
# s  - Toggle source host display
# d  - Toggle destination host display
# p  - Toggle port display
# P  - Pause display
# q  - Quit
```

### nethogs - Bandwidth by Process

```bash
# ========================================
# nethogs - Network Usage by Process
# ========================================

# Install nethogs
apt install nethogs             # Debian/Ubuntu
yum install nethogs             # CentOS/RHEL

# Monitor all interfaces
sudo nethogs

# Monitor specific interface
sudo nethogs eth0

# Monitor multiple interfaces
sudo nethogs eth0 eth1

# Trace mode (show all processes)
sudo nethogs -t

# Update delay (seconds)
sudo nethogs -d 2
```

### Network Statistics

```bash
# ========================================
# Network Interface Statistics
# ========================================

# Show interface statistics
ip -s link

# Continuous monitoring
watch -n 1 'ip -s link show eth0'

# Detailed interface stats
cat /proc/net/dev

# Network connections summary
ss -s

# TCP connection states
ss -tan state established | wc -l    # Established connections
ss -tan state time-wait | wc -l      # TIME-WAIT connections

# ========================================
# Bandwidth Calculation
# ========================================

# Calculate bandwidth usage
#!/bin/bash
INTERFACE="eth0"
INTERVAL=1

# Get initial values
RX1=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes)
TX1=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes)

sleep $INTERVAL

# Get new values
RX2=$(cat /sys/class/net/$INTERFACE/statistics/rx_bytes)
TX2=$(cat /sys/class/net/$INTERFACE/statistics/tx_bytes)

# Calculate bandwidth (bytes per second)
RX_BPS=$((($RX2 - $RX1) / $INTERVAL))
TX_BPS=$((($TX2 - $TX1) / $INTERVAL))

# Convert to MB/s
RX_MBPS=$(echo "scale=2; $RX_BPS / 1048576" | bc)
TX_MBPS=$(echo "scale=2; $TX_BPS / 1048576" | bc)

echo "RX: $RX_MBPS MB/s"
echo "TX: $TX_MBPS MB/s"
```

## Process Monitoring

### ps Command Advanced Usage

```bash
# ========================================
# Advanced ps Usage
# ========================================

# All processes with full details
ps aux

# Process tree
ps auxf                         # Forest view
pstree                          # Tree visualization
pstree -p                       # With PIDs

# Custom format
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head

# Processes for specific user
ps -u nginx

# Threads for process
ps -T -p PID

# Find process by name
ps aux | grep nginx
pgrep nginx                     # Better way
pidof nginx                     # Even better

# Full command with arguments
ps -p PID -o command

# ========================================
# Process Information
# ========================================

# Detailed process info
cat /proc/PID/status

# Open files for process
lsof -p PID

# Network connections for process
lsof -i -p PID

# Process command line
cat /proc/PID/cmdline | tr '\0' ' '

# Process environment
cat /proc/PID/environ | tr '\0' '\n'

# Process limits
cat /proc/PID/limits
```

## System-Wide Monitoring

### Comprehensive Monitoring Script

```bash
#!/bin/bash
#################################################
# Script: system-monitor.sh
# Description: Comprehensive system monitoring
#################################################

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly NC='\033[0m'

# Thresholds
readonly CPU_THRESHOLD=80
readonly MEM_THRESHOLD=80
readonly DISK_THRESHOLD=80
readonly LOAD_MULTIPLIER=0.7

log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $*"; }

# Check CPU usage
check_cpu() {
    echo "=== CPU Check ==="

    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    local cpu_usage_int=${cpu_usage%.*}

    if [ "$cpu_usage_int" -gt "$CPU_THRESHOLD" ]; then
        log_error "CPU usage is ${cpu_usage}% (threshold: ${CPU_THRESHOLD}%)"
    else
        log_ok "CPU usage: ${cpu_usage}%"
    fi

    # Check load average
    local cores=$(nproc)
    local load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
    local threshold=$(echo "$cores * $LOAD_MULTIPLIER" | bc)

    if (( $(echo "$load > $threshold" | bc -l) )); then
        log_warn "Load average $load exceeds threshold $threshold (${cores} cores)"
    else
        log_ok "Load average: $load (${cores} cores)"
    fi
}

# Check memory usage
check_memory() {
    echo -e "\n=== Memory Check ==="

    local mem_total=$(free | grep Mem | awk '{print $2}')
    local mem_used=$(free | grep Mem | awk '{print $3}')
    local mem_percent=$((mem_used * 100 / mem_total))

    if [ "$mem_percent" -gt "$MEM_THRESHOLD" ]; then
        log_error "Memory usage is ${mem_percent}% (threshold: ${MEM_THRESHOLD}%)"
    else
        log_ok "Memory usage: ${mem_percent}%"
    fi

    # Check swap
    local swap_total=$(free | grep Swap | awk '{print $2}')
    if [ "$swap_total" -gt 0 ]; then
        local swap_used=$(free | grep Swap | awk '{print $3}')
        local swap_percent=$((swap_used * 100 / swap_total))

        if [ "$swap_percent" -gt 25 ]; then
            log_warn "Swap usage is ${swap_percent}%"
        else
            log_ok "Swap usage: ${swap_percent}%"
        fi
    fi
}

# Check disk space
check_disk() {
    echo -e "\n=== Disk Space Check ==="

    df -h | grep -vE '^Filesystem|tmpfs|cdrom' | while read output; do
        local usage=$(echo $output | awk '{ print $5}' | cut -d'%' -f1)
        local partition=$(echo $output | awk '{ print $1 }')

        if [ "$usage" -ge "$DISK_THRESHOLD" ]; then
            log_error "Disk usage on $partition is ${usage}% (threshold: ${DISK_THRESHOLD}%)"
        else
            log_ok "Disk usage on $partition: ${usage}%"
        fi
    done
}

# Check I/O wait
check_io() {
    echo -e "\n=== I/O Check ==="

    local iowait=$(iostat -c 1 2 | tail -1 | awk '{print $4}')
    local iowait_int=${iowait%.*}

    if [ "$iowait_int" -gt 20 ]; then
        log_warn "I/O wait is ${iowait}% (high disk activity)"
    else
        log_ok "I/O wait: ${iowait}%"
    fi
}

# Check top processes
check_top_processes() {
    echo -e "\n=== Top CPU Processes ==="
    ps aux --sort=-%cpu | head -6 | tail -5

    echo -e "\n=== Top Memory Processes ==="
    ps aux --sort=-%mem | head -6 | tail -5
}

# Main execution
main() {
    echo "System Monitor - $(date)"
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime -p)"
    echo ""

    check_cpu
    check_memory
    check_disk
    check_io
    check_top_processes
}

main
```

## CloudWatch Agent for AWS

```bash
# ========================================
# Install CloudWatch Agent
# ========================================

# Download agent (Amazon Linux 2/Ubuntu)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Configure agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Example configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "metrics": {
    "namespace": "CWAgent",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/aws/ec2/syslog",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

## Interview Questions

**Q1: What's the difference between load average and CPU usage?**
A: CPU usage shows current CPU utilization percentage. Load average shows the average number of processes waiting for CPU over 1, 5, and 15 minutes. Load > number of cores indicates overload.

**Q2: How do you identify a memory leak?**
A: Monitor process memory over time with `ps aux --sort=-%mem`, check `/proc/PID/status`, watch for steadily increasing RSS (Resident Set Size), and check for OOM kills in system logs.

**Q3: What does high I/O wait indicate?**
A: High I/O wait (`wa` in `top` or `vmstat`) means CPU is idle waiting for disk operations. Indicates disk bottleneck. Use `iostat` to identify which disks, and `iotop` to find which processes.

**Q4: How do you check if a system is swapping?**
A: Use `vmstat` and watch `si` (swap in) and `so` (swap out) columns. Non-zero values indicate active swapping. Also check `free -h` for swap usage and `/proc/vmstat` for swap statistics.

**Q5: What's the difference between free and available memory?**
A: "Free" is completely unused memory. "Available" includes free memory plus cache/buffers that can be reclaimed. "Available" is what matters for new processes—Linux uses free memory for cache automatically.

## Summary

**System Monitoring Essentials:**

1. **CPU Monitoring:**
   - ✅ `top`/`htop` for interactive monitoring
   - ✅ `mpstat` for per-CPU statistics
   - ✅ Load average interpretation (< cores = healthy)
   - ✅ Watch for high %iowait (disk bottleneck)

2. **Memory Monitoring:**
   - ✅ `free -h` for memory overview
   - ✅ `vmstat` for swap and memory stats
   - ✅ Available memory matters, not free
   - ✅ Active swapping (si/so > 0) is bad

3. **Disk I/O:**
   - ✅ `iostat -x` for disk performance
   - ✅ `iotop` for per-process I/O
   - ✅ Watch await times and %util
   - ✅ SSD vs HDD have different thresholds

4. **Network:**
   - ✅ `iftop` for bandwidth by connection
   - ✅ `nethogs` for bandwidth by process
   - ✅ Monitor interface statistics
   - ✅ Track connection states

5. **Best Practices:**
   - Monitor proactively, not just during incidents
   - Set up alerts for thresholds
   - Understand baseline performance
   - Use CloudWatch for AWS instances
   - Keep historical data for trend analysis

**Key Insights:**
> - Linux caches aggressively—"used" memory is normal
> - Load average should be < number of CPU cores
> - High I/O wait indicates disk bottleneck
> - Active swapping kills performance
> - Monitor trends over time, not just snapshots

---
[← Back: Shell Scripting](./02-shell-scripting.md) | [Next: Networking →](./04-networking.md)
