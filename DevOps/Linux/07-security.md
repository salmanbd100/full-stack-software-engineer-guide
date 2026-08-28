---
title: Linux Security for DevOps
part: 8
chapter: 0
slug: linux-security
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-07-05
tags: [devops, linux, security]
in_book: false
---

# Linux Security for DevOps

## Overview

Security in Linux is layered. No single control protects a system. You stack access control, network filtering, file permissions, and auditing so that one failure does not expose everything.

**Security Layers:**

| Layer | Mechanism | Tools |
|-------|-----------|-------|
| **Access Control** | Users, SSH, sudo | `passwd`, `ssh`, `visudo` |
| **Network** | Firewall, rate limits | `ufw`, `iptables` |
| **File System** | Permissions, ACLs | `chmod`, `chown`, `setfacl` |
| **Application** | SELinux, AppArmor | `setenforce`, `aa-status` |
| **Auditing** | Logging, intrusion detection | `auditd`, `fail2ban`, `aide` |

> **Key Insight:** Almost every hardening decision comes back to one idea — give each user and process only the access it needs, and nothing more.

## User and Access Management

### 💡 **Least Privilege**

Users and processes get the minimum permissions to do their job. This shrinks the attack surface and limits damage when an account is compromised.

**Create and manage users:**

```bash
sudo useradd -m -s /bin/bash john   # -m creates home, -s sets shell
sudo passwd john                     # set password
sudo usermod -aG sudo,docker john    # add to groups (append, don't overwrite)

sudo usermod -L john                 # lock account (blocks password login)
sudo usermod -U john                 # unlock
sudo usermod -e 2026-12-31 john      # expire account on a date
sudo userdel -r john                 # delete user and home
```

**Password aging with `chage`:**

```bash
sudo chage -M 90 john    # force change every 90 days
sudo chage -W 14 john    # warn 14 days before expiry
sudo chage -d 0 john     # force change at next login
sudo chage -l john       # show current aging settings
```

**Password strength (pwquality) — short version:**

```ini
# /etc/security/pwquality.conf
minlen = 12       # minimum length
dcredit = -1      # require at least one digit
ucredit = -1      # require one uppercase
ocredit = -1      # require one special char
```

### sudo Configuration

Always edit sudoers with `visudo`. It validates syntax before saving, so a typo cannot lock you out.

**Common sudoers entries:**

```bash
sudo visudo

john ALL=(ALL:ALL) ALL                                   # full sudo
john ALL=(ALL) /usr/bin/systemctl restart nginx          # one command only
%developers ALL=(ALL:ALL) ALL                            # grant to a group

# Command alias keeps rules readable
Cmnd_Alias SERVICES = /usr/bin/systemctl restart nginx, /usr/bin/systemctl reload nginx
john ALL=(ALL) SERVICES

Defaults logfile="/var/log/sudo.log"                     # log every sudo call
```

**sudo practices:**

| ✅ Good | ❌ Bad |
|--------|-------|
| Edit with `visudo` | Edit `/etc/sudoers` directly |
| Grant specific commands | `NOPASSWD: ALL` for a person |
| Use `Cmnd_Alias` groups | Allow `rm`, `dd`, or a shell |
| Enable logging | No audit trail |

> **Key Insight:** `NOPASSWD` is fine for a scoped automation command (a CI deploy step). It is dangerous when applied to `ALL` for an interactive user.

## SSH Security

### 💡 **SSH Hardening**

SSH is the main door into your servers. Lock it to keys, block root, and limit who can even attempt to log in.

**Key `sshd_config` settings:**

```ini
# /etc/ssh/sshd_config
PermitRootLogin no              # never log in directly as root
PasswordAuthentication no       # keys only, no passwords
PubkeyAuthentication yes        # allow key auth
PermitEmptyPasswords no
MaxAuthTries 3                  # drop after 3 failed tries
AllowUsers john jane            # only these users may connect
LoginGraceTime 30s
ClientAliveInterval 300         # disconnect idle sessions
```

Apply changes: `sudo systemctl restart sshd`

**Key management:**

```bash
ssh-keygen -t ed25519 -C "you@example.com"   # ed25519: modern, fast, secure
ssh-copy-id user@server                       # push public key to server

chmod 700 ~/.ssh                              # dir: owner-only
chmod 600 ~/.ssh/authorized_keys              # file: owner read/write only
```

> ⚠️ SSH refuses key auth if `~/.ssh` or `authorized_keys` are group- or world-writable. Wrong permissions are the most common "my key doesn't work" cause.

### fail2ban — Brute Force Protection

fail2ban watches log files and bans IPs after repeated failed logins.

**Minimal `jail.local`:**

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600      # ban for 1 hour
findtime = 600      # window to count failures
maxretry = 3        # ban after 3 failures

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
```

**Operate it:**

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd                     # see banned IPs
sudo fail2ban-client set sshd unbanip 192.168.1.100  # release an IP
```

## Firewall Configuration

### UFW (Uncomplicated Firewall)

UFW is the simple front end to iptables on Ubuntu. Set default-deny, then open only what you need.

**Common rules:**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow 22/tcp                          # SSH (open BEFORE enabling!)
sudo ufw allow 80,443/tcp                       # web
sudo ufw allow from 192.168.1.0/24 to any port 22  # SSH from LAN only

sudo ufw limit 22/tcp                          # rate-limit to slow brute force
sudo ufw enable
sudo ufw status verbose
```

> ⚠️ Always allow your SSH port *before* running `ufw enable` on a remote box, or you lock yourself out.

### iptables — Short Hardening Set

When you need low-level control, iptables gives it. Default-drop input, allow loopback and established traffic, then rate-limit SSH.

```bash
sudo iptables -P INPUT DROP                      # default: block inbound
sudo iptables -P OUTPUT ACCEPT
sudo iptables -A INPUT -i lo -j ACCEPT           # allow loopback
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Rate-limit new SSH: max 4 attempts per 60s per source
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent \
  --update --seconds 60 --hitcount 4 -j DROP

sudo iptables-save > /etc/iptables/rules.v4      # persist across reboots
```

## File System Security

### Secure Permissions

**Recommended permissions for sensitive files:**

| Path | Mode | Meaning |
|------|------|---------|
| `/etc/passwd` | `644` | world-readable user list |
| `/etc/shadow` | `640` | password hashes, restricted |
| `/etc/ssh/sshd_config` | `600` | owner only |
| `~/.ssh` | `700` | private directory |
| `~/.ssh/authorized_keys` | `600` | owner read/write |

**Hunt down risky files:**

```bash
find / -type f -perm -002 -ls 2>/dev/null   # world-writable (anyone can edit)
find / -type f -perm -4000 -ls 2>/dev/null  # SUID (runs as file owner)

sudo chmod u-s /path/to/file                 # strip SUID if not needed
```

> **Key Insight:** SUID binaries run with the owner's privileges (often root). A vulnerable SUID-root binary is a direct privilege-escalation path, so audit them.

**ACLs** give finer-grained access than owner/group/other:

```bash
setfacl -m u:john:rw /path/to/file    # grant john read/write on top of base perms
getfacl /path/to/file                 # view all ACL entries
```

### File Integrity Monitoring (AIDE)

AIDE snapshots file hashes, then reports what changed. Useful for spotting tampering with system binaries.

```bash
sudo apt install aide
sudo aideinit                                          # build baseline database
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
sudo aide --check                                      # compare current state to baseline
```

> ⚠️ After any legitimate update, run `aide --update` and promote the new database, or you drown in false alerts.

## SELinux vs AppArmor

Both are Mandatory Access Control (MAC) systems. They confine what a process can do even if it runs as root. The difference is how they define rules.

| | **SELinux** | **AppArmor** |
|-|-------------|--------------|
| **Model** | Labels on every object | Path-based rules |
| **Complexity** | Powerful, steeper learning curve | Simpler, easier to read |
| **Default on** | RHEL, CentOS, Fedora | Ubuntu, Debian, SUSE |
| **Modes** | enforcing / permissive / disabled | enforce / complain |

**SELinux — commands you actually use:**

```bash
getenforce                                     # current mode
sudo setenforce 0                              # switch to permissive (debug)
ls -Z /var/www/html                            # view security context
sudo restorecon -Rv /var/www/html              # reset to default context
sudo setsebool -P httpd_can_network_connect on # toggle a policy boolean
```

**AppArmor — commands you actually use:**

```bash
sudo aa-status                    # list profiles and their modes
sudo aa-complain /usr/sbin/nginx  # log-only mode for debugging
sudo aa-enforce /usr/sbin/nginx   # enforce the profile
sudo aa-logprof                   # update profile from logged events
sudo systemctl reload apparmor    # reload profiles
```

> **Key Insight:** When an app breaks under MAC, switch to permissive/complain mode, reproduce the issue, read the denials, then fix the policy. Never just disable SELinux — that removes a whole security layer.

## Security Auditing

### auditd — Audit Daemon

auditd records who did what: file changes, syscalls, logins. Essential for compliance and incident forensics.

```bash
sudo systemctl enable --now auditd

# /etc/audit/rules.d/audit.rules
-w /etc/passwd -p wa -k passwd_changes     # watch writes/attrs, tag as passwd_changes
-w /etc/sudoers -p wa -k sudoers_changes
-a always,exit -F arch=b64 -S execve -k exec_tracking

sudo augenrules --load                     # load rules
sudo ausearch -k passwd_changes            # search by tag
sudo aureport --failed                     # summary of failed events
```

### Vulnerability Scanning (Lynis)

Lynis audits the host and gives a hardening score with concrete suggestions.

```bash
sudo apt install lynis
sudo lynis audit system     # full audit with recommendations
```

For deeper scans, other tools exist: `rkhunter` and `chkrootkit` (rootkit detection), and `OpenVAS` (network vulnerability scanning).

## Hardening Checklist

```bash
# 1. Patch the system
sudo apt update && sudo apt upgrade -y

# 2. Lock direct root login
sudo passwd -l root

# 3. Harden SSH: keys only, no root, limit users, fail2ban

# 4. Firewall: default deny inbound, open only needed ports
sudo ufw default deny incoming && sudo ufw allow 22/tcp && sudo ufw enable

# 5. Automatic security updates
sudo apt install unattended-upgrades && sudo dpkg-reconfigure unattended-upgrades

# 6. Disable services you don't use
sudo systemctl disable --now <service>

# 7. File integrity + auditing
sudo apt install aide && sudo aideinit
sudo systemctl enable --now auditd

# 8. Periodic audit
sudo lynis audit system
```

### Kernel Security (sysctl)

The kernel network stack has safer defaults you should set explicitly.

```ini
# /etc/sysctl.d/99-security.conf
net.ipv4.tcp_syncookies = 1              # SYN flood protection
net.ipv4.conf.all.accept_redirects = 0   # ignore ICMP redirects (MITM)
net.ipv4.conf.all.accept_source_route = 0 # drop source-routed packets
net.ipv4.conf.all.rp_filter = 1          # reverse-path filter (anti-spoof)
net.ipv4.conf.all.log_martians = 1       # log impossible addresses
kernel.randomize_va_space = 2            # full ASLR
kernel.dmesg_restrict = 1               # hide kernel log from non-root
kernel.kptr_restrict = 2                # hide kernel pointers in /proc
```

Apply: `sudo sysctl -p /etc/sysctl.d/99-security.conf`

## Interview Questions

**Q1: What is the principle of least privilege?**
Every user and process gets only the permissions needed for its task, nothing more. It shrinks the attack surface and limits blast radius when an account or service is compromised. In practice: scoped sudo rules, per-service users, and tight file permissions.

**Q2: How do you secure an SSH server?**
Disable root login (`PermitRootLogin no`), require keys and turn off `PasswordAuthentication`, limit `AllowUsers`, cap `MaxAuthTries`, and add fail2ban to ban brute-force sources. Optionally move off port 22. Keys should be ed25519 with `~/.ssh` at `700` and `authorized_keys` at `600`.

**Q3: What is the difference between `chmod 644` and `755`?**
`644` is `rw-r--r--`: owner reads/writes, everyone else reads only — use it for regular files. `755` is `rwxr-xr-x`: owner has full access, others read and execute — use it for directories and executables. The extra `1` is the execute bit needed to enter a directory or run a program.

**Q4: How do you find and remove SUID files?**
```bash
find / -type f -perm -4000 -ls 2>/dev/null   # list SUID files
sudo chmod u-s /path/to/file                  # remove the SUID bit
```
SUID files run with the owner's privileges (often root). Any unneeded SUID-root binary is a privilege-escalation risk, so audit and strip the ones you don't require.

**Q5: SELinux vs AppArmor — what is the difference?**
Both are MAC systems that confine processes beyond standard permissions. SELinux uses labels on every object; it is powerful but complex and ships on RHEL/CentOS. AppArmor uses simpler path-based rules and ships on Ubuntu/Debian. When something breaks, use permissive/complain mode to diagnose rather than disabling the whole layer.

## Summary

> **Layered defense:** Access control, network firewall, file permissions, MAC, and auditing each catch what the others miss. Assume any single layer can fail.

> **Least privilege everywhere:** Scoped sudo, key-only SSH, no direct root, tight permissions, and no stray SUID or world-writable files.

> **Detect and automate:** Turn on automatic security updates, run fail2ban and auditd, and scan regularly with Lynis. Disable what you don't use.

---
[← Back: System Services](./06-system-services.md) | [Next: Troubleshooting →](./08-troubleshooting.md)
