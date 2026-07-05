# Linux Troubleshooting for DevOps

## Overview

Troubleshooting is one of the most tested DevOps skills. Interviewers want to see a **systematic method**, not lucky guesses. The goal is to reduce mean time to resolution (MTTR) and find root causes, not just symptoms.

**Troubleshooting methodology:**

| Step | Action | Tools |
|------|--------|-------|
| **1. Identify** | Gather symptoms and errors | logs, monitoring |
| **2. Reproduce** | Recreate the issue reliably | test scripts |
| **3. Isolate** | Narrow down the cause | divide and conquer |
| **4. Resolve** | Apply a fix and verify | the actual change |
| **5. Document** | Record the finding | runbooks, wiki |
| **6. Prevent** | Add alerts so it does not recur | automation |

> **Key Insight:** Almost every problem follows a pattern of **symptom → diagnose → fix**. Learn the common patterns and you can solve most incidents fast.

Match the symptom to the right first tool:

| Symptom | Likely area | Start with |
|---------|-------------|-----------|
| Slow, high load | CPU / memory / I/O | `top`, `uptime` |
| Out of memory, killed process | Memory | `free -h`, `dmesg` |
| Slow reads/writes | Disk I/O | `iostat -x`, `iotop` |
| Cannot reach a host | Network | `ping`, `dig`, `traceroute` |
| Service down | systemd unit | `systemctl status`, `journalctl -u` |
| App keeps crashing | Application | core dump, `strace`, `gdb` |

## System Won't Boot

The boot chain is **BIOS/UEFI → GRUB → kernel → systemd → services**. A failure at any stage stops the next one, so knowing the order tells you where to look.

**Boot into rescue/emergency mode (via GRUB):**

```bash
# At the GRUB menu (hold Shift/Esc during boot):
# 1. Highlight the kernel entry, press 'e' to edit
# 2. Find the line starting with 'linux'
# 3. Append ONE of these to the end, then press Ctrl+X:
systemd.unit=rescue.target      # minimal, root shell + local FS
systemd.unit=emergency.target   # most minimal, read-only root
single                          # legacy single-user mode
```

**Common boot failures → fixes:**

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| GRUB not found | Bootloader corrupted | Reinstall GRUB from live USB |
| Kernel panic | Bad kernel / driver | Boot older kernel (GRUB advanced) |
| Can't mount root | Wrong UUID in fstab | `blkid` then fix `/etc/fstab` |
| Boot loop | Service fails at start | Disable the failed unit |

**Reinstall GRUB from a live USB:**

```bash
sudo mount /dev/sda1 /mnt                     # mount the root partition
for d in dev proc sys; do sudo mount --bind /$d /mnt/$d; done
sudo chroot /mnt                              # enter the broken system
grub-install /dev/sda && update-grub
exit && sudo reboot
```

**Check boot logs after a failure:**

```bash
journalctl -b            # logs from the current boot
journalctl -b -1         # logs from the previous boot (why did it fail?)
journalctl -k            # kernel messages only
dmesg | grep -iE 'error|fail'
```

## Performance: High CPU

**Diagnose — find the hog:**

```bash
uptime                                 # load average vs nproc (cores)
nproc                                  # load > cores means CPU-bound
top -o %CPU                            # sort live by CPU
ps aux --sort=-%cpu | head -10         # top 10 consumers
mpstat -P ALL 2 5                      # per-core; is ONE core pinned?
```

> **Key Insight:** Compare load average to core count. Load of 8 on an 8-core box is fine; on a 2-core box it is badly overloaded.

**Profile a specific process (if the cause is unclear):**

```bash
perf record -p PID -g -- sleep 30      # sample 30s of the process
perf report                            # see hot functions
```

**Fix:**

```bash
renice +10 -p PID                              # de-prioritize, don't kill
kill PID                                       # graceful stop; kill -9 as last resort
systemctl set-property myapp.service CPUQuota=50%   # cap it going forward
```

## Performance: High Memory

**Diagnose:**

```bash
free -h                                # is available memory near zero?
top -o %MEM                            # sort live by memory
ps aux --sort=-%mem | head -10         # top consumers
vmstat 2 5                             # watch 'si'/'so' — active swapping is bad
swapon --show                          # swap in use?
```

**Check for an OOM kill (the kernel killed a process to survive):**

```bash
dmesg | grep -i 'killed process'
journalctl -k | grep -i 'oom'
grep -i 'out of memory' /var/log/syslog
```

**Fix:**

```bash
# Adjust swappiness (lower = prefer RAM, avoid swap)
sudo sysctl vm.swappiness=10
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf   # make permanent

# Cap a process so it can't starve the box
systemctl set-property myapp.service MemoryMax=1G
ulimit -v 1048576                      # per-shell virtual memory cap (KB)

# Add swap as a stopgap (fix the leak or add RAM for real)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

⚠️ Adding swap masks a memory leak; it does not fix it. Find the growing process.

## Performance: Disk I/O

**Diagnose:**

```bash
top                                    # watch %wa (I/O wait) — high means blocked on disk
iostat -x 2 5                          # %util >80 = saturated; await >20ms = slow
sudo iotop -o                          # which processes are actually doing I/O
df -h && df -i                         # out of space? out of inodes?
dmesg | grep -i 'I/O error'            # failing disk?
```

**Fix:**

```bash
du -ah / | sort -rh | head -20                 # find the space eaters
journalctl --vacuum-time=7d                    # trim old journals
find /var/log -name "*.log" -mtime +30 -delete # clear stale logs
sudo iotop -o                                  # then throttle or stop the culprit
```

## Network Issues

Work **bottom-up through the layers**: interface → IP → gateway → DNS → the service. Test each rung before climbing to the next.

**Systematic checklist:**

```bash
# 1. Interface up and has an IP?
ip addr show

# 2. Can we reach the gateway (local network OK)?
ping -c 4 $(ip route | awk '/default/ {print $3}')

# 3. Internet reachable by IP (routing OK)?
ping -c 4 8.8.8.8

# 4. Name resolution working (DNS OK)?
ping -c 4 google.com                   # fails here but #3 works = DNS problem
dig google.com

# 5. Is the target service/port open?
nc -zv google.com 443
curl -I https://google.com

# 6. Where does the path break?
traceroute google.com
mtr google.com
```

> **Key Insight:** If `ping 8.8.8.8` works but `ping google.com` fails, it is DNS — not connectivity. This is the single most common network trap in interviews.

**Common issues → fixes:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Interface down | Link not up | `sudo ip link set eth0 up` |
| No IP | DHCP not run | `sudo dhclient eth0` |
| DNS fails | Bad resolver | `echo "nameserver 8.8.8.8" \| sudo tee /etc/resolv.conf` |
| Wrong route | Missing default | `sudo ip route add default via GATEWAY` |
| Port blocked | Firewall | `sudo ufw allow PORT/tcp` |

**Capture packets when you need proof:**

```bash
sudo tcpdump -i eth0 host 10.0.0.5 -w cap.pcap   # capture traffic to a host
tcpdump -r cap.pcap | less                       # read it back
```

## Service Won't Start

**Checklist — status first, then logs, then config:**

```bash
systemctl status nginx                 # 1. is it failed? what's the exit code?
journalctl -u nginx -n 50              # 2. the actual error is almost always here
nginx -t                               # 3. validate config syntax (app-specific)
sudo ss -tlnp | grep :80               # 4. port already taken?
df -h                                  # 5. out of disk? (a silent killer)
systemctl list-dependencies nginx --failed   # 6. a dependency down?
```

**Common issues → fixes:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| Port in use | Another process | `sudo lsof -i :80` then stop it |
| Permission denied | Wrong owner | `sudo chown -R nginx:nginx /var/log/nginx` |
| Config error | Bad syntax | `nginx -t`, read `journalctl -u nginx` |
| Hits resource limit | Low `LimitNOFILE` | Raise it in the unit, `daemon-reload` |

**Debug a stubborn startup:**

```bash
systemctl cat nginx                            # view the effective unit file
sudo /usr/sbin/nginx -g 'daemon off;'          # run in foreground to see errors
systemd-analyze verify /etc/systemd/system/myapp.service   # validate a custom unit
```

## Application Crashes

**Diagnose with core dumps:**

```bash
ulimit -c unlimited                            # enable core dumps for this shell
cat /proc/sys/kernel/core_pattern              # where do cores go?
gdb /path/to/program /tmp/core.program.PID     # load the dump
(gdb) bt                                        # backtrace — where it crashed
(gdb) info threads
```

**Trace a running or starting process:**

```bash
sudo strace -f -p PID                  # system calls — stuck on a file? a socket?
sudo strace -f -o trace.log ./program  # trace from launch
lsof -p PID                            # what files/sockets does it hold?
cat /proc/PID/limits                   # hit an fd or memory limit?
dmesg | grep -i segfault               # kernel-side crash record
```

> **Key Insight:** `strace` shows the last syscall before a hang or crash. That single line often names the exact file, port, or permission at fault.

## Container Issues

Containers have their own dedicated guide. Start with logs and status:

```bash
docker ps -a                           # exited? what code?
docker logs --since 10m container      # the error is usually here
docker inspect container | jq '.[0].State'
docker stats container                 # resource pressure
```

For the full container playbook (immediate exits, networking, disk, image debugging), see **[Docker Troubleshooting](../Docker/09-docker-troubleshooting.md)**.

## General Workflow and Quick Reference

**The workflow that works under pressure:**

1. **Gather** — what broke, when, what changed recently?
2. **Check basics** — `uptime`, `free -h`, `df -h`, `top`.
3. **Read logs** — `journalctl -xe`, `dmesg | tail`.
4. **Narrow to the service** — `systemctl status`, `journalctl -u`.
5. **Change one thing at a time** — verify after each.
6. **Document** — record what fixed it.

⚠️ Never change several things at once. If it works, you won't know which change did it.

**Full-system health check (one snapshot):**

```bash
{
  echo "=== System ===";        uptime; free -h; df -h
  echo "=== Failed Services ==="; systemctl --failed
  echo "=== Recent Errors ===";   journalctl -p err --since "1 hour ago" | tail -20
  echo "=== Network ===";         ip addr | grep "inet "; ss -tulnp | grep LISTEN
  echo "=== Top CPU ===";         ps aux --sort=-%cpu | head -10
} | tee system-report.txt
```

## Interview Questions

**Q1: How would you troubleshoot a server that is running slow?**
Go by resource. Check load vs core count (`uptime`, `nproc`), then memory and swap (`free -h`, `vmstat`), then I/O wait (`top` %wa, `iostat -x`). Identify the heavy process with `top`/`ps`. Read logs for errors and ask what changed recently. Fix the specific bottleneck, don't guess.

**Q2: A service won't start. What do you do?**
`systemctl status` for the exit code, then `journalctl -u <svc>` — the real error is almost always there. Validate the config (`nginx -t`). Check the obvious killers: port already in use (`ss -tlnp`), permissions, out of disk (`df -h`), and failed dependencies. As a last step, run it in the foreground to see raw output.

**Q3: How do you troubleshoot high disk I/O?**
Confirm it with `top` (%wa) and `iostat -x` (%util near 100, high await). Find the culprit with `iotop -o`. Check for low free space or inodes (`df -h`, `df -i`) and large or runaway logs (`du -ah | sort -rh`). Look for hardware errors in `dmesg`. Then throttle or fix the offending process.

**Q4: A server reaches some sites but not others. How do you debug?**
Test IP vs hostname first — if `ping 8.8.8.8` works but names fail, it is DNS. Use `traceroute`/`mtr` to see where the path breaks. Check routing (`ip route`), firewall rules, and blocked ports (`nc -zv`). Try from another network to rule out the ISP, and check cloud security groups if applicable.

**Q5: How would you investigate an OOM (out-of-memory) kill?**
Confirm it in the kernel log: `dmesg | grep -i 'killed process'` or `journalctl -k | grep oom`. Identify which process was killed and why it was the biggest target. Look at its memory trend over time to spot a leak. Fix the root cause (leak, missing limit) and add monitoring; adding swap only masks the problem.

## Summary

> **The method beats the tool.** Symptom → diagnose → fix, one change at a time. Interviewers reward a structured approach far more than memorized commands.

> **Logs answer most questions.** `journalctl -u`, `journalctl -xe`, and `dmesg` reveal the root cause before you touch anything else.

> **Prevent the repeat.** Every incident should end with a documented fix and an alert so it never surprises you twice.

---
[← Back: Security](./07-security.md) | [Back to DevOps →](../README.md)
