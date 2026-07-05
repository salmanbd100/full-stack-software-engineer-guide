# System Monitoring for DevOps

## Overview

System monitoring tells you what a server is doing right now. You use it to catch problems early, find bottlenecks, and debug live incidents.

The mental model: watch four resources, in order. CPU, memory, disk I/O, and network. Most incidents trace back to one of them being saturated.

| Resource | Go-to tools | What you're hunting for |
|----------|-------------|-------------------------|
| **CPU** | top, htop, mpstat | High usage, load > cores, %iowait, %steal |
| **Memory** | free, vmstat | Low available memory, active swapping, OOM kills |
| **Disk I/O** | iostat, iotop, df | High %util, slow await, full disks |
| **Network** | iftop, nethogs, ss | Bandwidth hogs, connection floods |
| **Process** | ps, /proc | Which process is doing the damage |

> **Key Insight:** Snapshots lie. A server at 90% CPU may be fine or dying — you can only tell by watching the trend over time.

## CPU Monitoring

### 💡 **Load Average vs CPU Usage**

These measure different things. CPU usage is how busy the CPU is right now. Load average is how many processes are waiting to run, averaged over 1, 5, and 15 minutes.

**Read load average against your core count:**

```bash
uptime
# ... load average: 1.50, 1.20, 0.95   (1min, 5min, 15min)

nproc   # how many cores you have -> 4
```

| Load (on 4 cores) | Meaning |
|-------------------|---------|
| 1.50 | ~37% used — healthy |
| 4.00 | Fully utilized |
| 8.00 | Overloaded — processes queuing |

The three numbers show direction. Rising (0.95 → 1.20 → 1.50) means load is building. Falling means the spike is passing.

> **Key Insight:** Load counts processes waiting on *anything*, including disk I/O — not just CPU. A high load with low CPU usage usually means an I/O bottleneck, not a CPU one.

### top — the default dashboard

**Launch top and read the header:**

```bash
top
# %Cpu(s): 12.5 us,  3.2 sy,  0.0 ni, 82.1 id,  1.8 wa,  0.0 st
# MiB Mem : 15892 total, 2134 free, 8456 used, 5301 buff/cache
```

The `us`/`sy`/`id`/`wa`/`st` breakdown is where the story is. High `wa` = disk bottleneck. High `st` = your VM's CPU is being stolen by a noisy neighbor.

**Key columns in the process list:**

| Column | Meaning |
|--------|---------|
| RES | Physical memory used (the number that matters) |
| VIRT | Virtual memory reserved (usually ignore) |
| S | State — R running, S sleeping, D disk-wait, Z zombie |
| %CPU / %MEM | Share of CPU / RAM |

**Interactive keys worth knowing:**

| Key | Action |
|-----|--------|
| `1` | Show each CPU core separately |
| `M` | Sort by memory |
| `P` | Sort by CPU (default) |
| `k` | Kill a process |
| `c` | Show full command path |

**Non-interactive snapshot (for scripts and logs):**

```bash
top -b -n 1 | head -20   # one batch snapshot, no live refresh
```

`htop` is the friendlier alternative — color bars, mouse, tree view (`F5`), search (`F3`). Same data, easier to read. Install with `apt install htop`.

### mpstat — per-CPU detail

**Show all cores, twice, 2 seconds apart:**

```bash
mpstat -P ALL 2 2   # needs the sysstat package
# CPU  %usr %sys %iowait %steal %idle
# all  12.3  3.2    1.4    0.0   82.5
```

| Column | High value means |
|--------|------------------|
| %iowait | CPU idle waiting on disk — I/O bottleneck |
| %sys | Heavy kernel/syscall work |
| %steal | Hypervisor is starving your VM (common on overcommitted cloud instances) |

## Memory Monitoring

### 💡 **Free vs Available**

The single most misread metric on Linux. Linux deliberately uses spare RAM for disk cache, so "free" is almost always low — that is normal and good.

**Read memory in human units:**

```bash
free -h
#         total    used    free   shared  buff/cache   available
# Mem:     15Gi   8.2Gi   2.0Gi    120Mi       5.3Gi       5.9Gi
# Swap:   2.0Gi    97Mi   1.9Gi
```

| Metric | What it means |
|--------|---------------|
| free | Truly untouched RAM (expect it to be low) |
| buff/cache | Kernel disk cache — reclaimed instantly when apps need it |
| **available** | free + reclaimable cache — **what a new process can actually get** |

> **Key Insight:** Judge memory health by `available`, not `free`. Low free is fine. Low available means you're genuinely running out.

### vmstat — is it swapping?

Swapping (pushing memory to disk) is the clearest sign of real memory pressure. It quietly destroys performance.

**Sample every 2 seconds:**

```bash
vmstat 2 5
# procs -----memory---- ---swap-- -----io---- --cpu--
#  r  b   swpd   free    si   so   bi   bo    wa
#  2  0      0  2134567   0    0  120  240     1
```

| Column | Watch for |
|--------|-----------|
| `si` / `so` | Swap in / out. **Non-zero and sustained = active swapping = trouble** |
| `r` | Runnable processes waiting on CPU. Consistently > cores = CPU bound |
| `b` | Processes blocked on I/O |
| `wa` | CPU time waiting on disk |

A one-off `si`/`so` blip during a burst is fine. Continuous swap traffic is the problem.

### Finding memory hogs and OOM kills

**Top 10 memory consumers:**

```bash
ps aux --sort=-%mem | head -10
```

**Per-process detail (RSS is real memory, VmSwap is what got swapped out):**

```bash
grep -E 'VmRSS|VmSwap' /proc/<PID>/status
```

**Check if the kernel OOM-killer struck:**

```bash
dmesg | grep -i 'out of memory'
grep -i 'killed process' /var/log/syslog
```

A process whose RSS climbs steadily and never plateaus is the classic memory-leak signature. Catch it by sampling `ps` over minutes or hours.

## Disk I/O Monitoring

### 💡 **iostat — where I/O bottlenecks show up**

`top` tells you the CPU is waiting on disk (`%iowait`). `iostat -x` tells you *which* disk and how bad.

**Extended stats every 2 seconds:**

```bash
iostat -x 2
# Device   r/s    w/s    rkB/s   wkB/s   await  %util
# sda    120.0   45.0   4800    1800    8.5    12.3
```

| Column | Meaning | Concern |
|--------|---------|---------|
| await | Avg ms per I/O request | Rising await = disk struggling |
| %util | How busy the device is | Near 100% = saturated |
| r/s, w/s | Reads/writes per second | Context for the above |

**Thresholds differ by disk type:**

| Disk | Worry when |
|------|-----------|
| SSD | %util > 90%, await > 10ms |
| HDD | %util > 60%, await > 20ms |

**Which process is doing the I/O?**

```bash
sudo iotop -o   # -o shows only processes actually doing I/O right now
```

### Disk space — df and du

**How full are the filesystems:**

```bash
df -h            # space per mount
df -i            # inode usage — a disk can be "full" on inodes with space left
```

**What's eating the space in a directory:**

```bash
du -h --max-depth=1 /var | sort -hr | head   # biggest subdirs, largest first
find /var/log -type f -size +1G               # find huge files
```

> **Key Insight:** "No space left on device" with `df -h` showing free space usually means inode exhaustion — check `df -i`.

## Network Monitoring

Two tools cover most needs. `iftop` shows bandwidth per connection (who is talking to whom). `nethogs` shows bandwidth per process (which app is the hog).

**Bandwidth by connection, and by process:**

```bash
sudo iftop -i eth0    # live traffic per remote host
sudo nethogs eth0     # live traffic per process
```

**Connection summary and states with ss:**

```bash
ss -s                                  # totals by socket type
ss -tan state established | wc -l      # count established connections
ss -tan state time-wait | wc -l        # TIME-WAIT pileups signal churn
```

A flood of connections in one state (many TIME-WAIT, or ESTABLISHED climbing) often points to a connection-leak or an app not reusing sockets.

## Process Monitoring

**Sort processes by CPU or memory with a custom format:**

```bash
ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | head
```

**Find a process fast:**

```bash
pgrep -a nginx      # PIDs + command line
pstree -p           # tree view with PIDs
```

**The /proc files worth remembering** — every process exposes live state under `/proc/<PID>/`:

| File | Tells you |
|------|-----------|
| `status` | Memory (VmRSS, VmSwap), state, threads |
| `limits` | ulimits (open files, etc.) — culprit for "too many open files" |
| `cmdline` | Full command with arguments |

**Open files and sockets held by a process:**

```bash
lsof -p <PID>       # all open files
lsof -i -a -p <PID> # just network connections
```

## A Quick Health-Check Script

You rarely need a heavy monitoring stack to triage a box. This checks the four resources and flags anything over threshold.

**health-check.sh:**

```bash
#!/bin/bash
set -euo pipefail

check() { [ "$1" -ge "$2" ] && echo "WARN: $3 at ${1}%" || echo "OK: $3 ${1}%"; }

# Memory: use total vs available, not "free"
read total avail < <(free -m | awk '/Mem:/{print $2, $7}')
check $(( (total - avail) * 100 / total )) 80 "memory"

# Disk: flag any mount over 80%
df -h --output=pcent,target | tail -n +2 | while read pct mnt; do
  check "${pct%\%}" 80 "disk $mnt"
done

# Load vs cores
cores=$(nproc)
load=$(awk '{print $1}' /proc/loadavg)
awk -v l="$load" -v c="$cores" \
  'BEGIN{ printf (l>c ? "WARN" : "OK"); printf ": load %s (%d cores)\n", l, c }'
```

For fleets, ship metrics to a real system instead. On AWS that's the CloudWatch agent (`amazon-cloudwatch-agent`, configured via JSON, sends CPU/mem/disk/log data to CloudWatch). Elsewhere it's usually Prometheus node_exporter plus Grafana.

## Interview Questions

**Q1: What's the difference between load average and CPU usage?**
CPU usage is how busy the CPU is at this instant. Load average is the number of processes waiting to run, averaged over 1/5/15 minutes. Crucially, load also counts processes blocked on I/O — so high load with low CPU usage points to a disk bottleneck, not a CPU one. Compare load against `nproc`; sustained load above the core count means overload.

**Q2: How do you detect a memory leak?**
Sample a process's memory over time and look for RSS that climbs steadily and never plateaus. Use `ps aux --sort=-%mem` and `grep VmRSS /proc/<PID>/status` repeatedly, or watch in `htop`. Confirm the damage by checking for OOM kills with `dmesg | grep -i 'out of memory'`.

**Q3: What does high I/O wait mean?**
High `%iowait` (in `top` or `vmstat`'s `wa`) means the CPU is idle because it's waiting on disk. It's a disk bottleneck, not a CPU problem. Drill down with `iostat -x` to find the slow device (high `await`, `%util` near 100%), then `iotop -o` to find the process responsible.

**Q4: How do you tell if a system is swapping?**
Run `vmstat 2` and watch `si` (swap in) and `so` (swap out). Sustained non-zero values mean active swapping, which cripples performance. A brief blip under a burst is fine; continuous swap traffic is the red flag. `free -h` shows how much swap is used but not whether it's active right now.

**Q5: What's the difference between free and available memory?**
"Free" is RAM that's completely untouched — normally low, because Linux uses spare RAM for disk cache. "Available" is free memory plus cache the kernel can reclaim instantly, so it reflects what a new process can actually get. Always judge memory health by available, not free.

## Summary

> **The four-resource sweep:** CPU (`top`, load vs cores), memory (`free -h` available, `vmstat` swap), disk (`iostat -x` await/%util), network (`iftop`/`nethogs`). Most incidents live in one of these.

> **The metrics people misread:** low "free" memory is normal — watch "available"; high load can mean I/O not CPU; a "full" disk may be out of inodes (`df -i`), not space.

> **Snapshots lie, trends don't.** Watch `si`/`so`, `await`, and RSS *change over time* — a single reading rarely tells you whether a box is healthy or failing.

---
[← Back: Shell Scripting](./02-shell-scripting.md) | [Next: Networking →](./04-networking.md)
