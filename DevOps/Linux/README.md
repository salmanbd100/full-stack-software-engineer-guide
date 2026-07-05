# Linux - Interview Preparation

Linux runs almost every production server, container, and cloud workload. This guide covers the fundamentals through real troubleshooting, focused on senior DevOps interview preparation.

## Table of Contents

1. [Linux Fundamentals](./01-linux-fundamentals.md) — filesystem hierarchy, permissions, users, processes, text processing
2. [Shell Scripting](./02-shell-scripting.md) — Bash structure, variables, functions, error handling, automation
3. [System Monitoring](./03-system-monitoring.md) — CPU, memory, disk I/O, network; load average, swapping, OOM
4. [Networking](./04-networking.md) — `ip`, DNS, `ss`/`lsof`, `tcpdump`, `curl`, firewalls, troubleshooting
5. [Package Management](./05-package-management.md) — APT, YUM/DNF, repositories, GPG keys, security updates
6. [System Services](./06-system-services.md) — systemd units, `systemctl`, `journalctl`, timers, dependencies
7. [Security Hardening](./07-security.md) — SSH, sudo, fail2ban, firewalls, SELinux/AppArmor, auditing
8. [Troubleshooting](./08-troubleshooting.md) — boot, performance, network, service, and application debugging

## Top 10 Interview Questions

1. What do the permission numbers 644, 755, and 600 mean?
2. What's the difference between `kill` and `kill -9` (SIGTERM vs SIGKILL)?
3. Hard link vs soft link — how do they differ?
4. What does `set -euo pipefail` do in a Bash script?
5. Load average vs CPU usage — what's the difference?
6. Free vs available memory — which one matters, and why?
7. How do you find which process is using a port?
8. `systemctl start` vs `systemctl enable` — what's the difference?
9. How do you secure an SSH server?
10. How would you troubleshoot a server that's running slow?

## Study Path

**Start here →** [Linux Fundamentals](./01-linux-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundation | 01–02: fundamentals, shell scripting | 4–6 hours |
| Operations | 03–05: monitoring, networking, packages | 5–7 hours |
| Production | 06–08: services, security, troubleshooting | 5–7 hours |

> **Key Insight:** Everything in DevOps — Docker, Kubernetes, cloud — builds on these Linux basics. Master them first.

---
[← DevOps](../README.md)
