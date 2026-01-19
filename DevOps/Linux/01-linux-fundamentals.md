# Linux Fundamentals for DevOps

## Overview

### 💡 **Why Linux Dominates DevOps**

Linux is the foundation of modern infrastructure - from bare metal servers to cloud platforms to container orchestration.

**Linux in the DevOps Ecosystem:**

| Component | Linux Role | Examples |
|-----------|-----------|----------|
| **Servers** | 90%+ of production servers | AWS EC2, Azure VMs, GCP Compute |
| **Containers** | Foundation for containerization | Docker, Podman, containerd |
| **Orchestration** | Kernel features power K8s | cgroups, namespaces, iptables |
| **Cloud** | Default OS for cloud services | Lambda, Cloud Functions, Cloud Run |
| **DevOps Tools** | Linux-first development | Terraform, Ansible, Jenkins |

**Why Linux Wins:**

- ✅ Open source and highly customizable
- ✅ Powerful command-line interface
- ✅ Stable and secure
- ✅ Excellent package management
- ✅ Strong scripting and automation
- ✅ Vibrant community and ecosystem

> **Key Insight:** Mastering Linux fundamentals is non-negotiable for DevOps engineers. Everything else (Docker, Kubernetes, cloud platforms) builds on these basics.

---

**Skill Progression:**

| Skill | Beginner | Intermediate | Advanced |
|-------|----------|--------------|----------|
| **File System** | Navigation (`cd`, `ls`, `pwd`) | Permissions, links, searching | LVM, quotas, filesystem tuning |
| **Processes** | View processes (`ps`, `top`) | Kill/manage processes | Priorities, cgroups, namespaces |
| **Networking** | Connectivity (`ping`, `curl`) | Configure network, firewall | Advanced routing, tunneling, tc |
| **Package Mgmt** | Install packages (`apt`, `yum`) | Manage repos, dependencies | Build packages, custom repos |
| **Text Processing** | Read files (`cat`, `less`) | `grep`, `sed`, `awk` | Complex pipelines, data transformation |

---

## File System Hierarchy

### 💡 **Understanding the Linux Directory Tree**

Linux has a standardized directory structure defined by the Filesystem Hierarchy Standard (FHS).

**Root Directory Structure:**

```
/                    Root directory (top of hierarchy)
├── /bin            Essential user binaries (ls, cat, cp)
├── /sbin           System binaries (admin commands)
├── /etc            Configuration files
├── /home           User home directories
├── /root           Root user home
├── /var            Variable files (logs, cache, data)
│   ├── /log        Log files
│   ├── /tmp        Temporary files
│   └── /www        Web server files
├── /tmp            Temporary files (cleared on reboot)
├── /usr            User programs and data
│   ├── /bin        User binaries
│   ├── /local      Locally installed programs
│   └── /share      Shared data
├── /opt            Optional software packages
├── /proc           Virtual filesystem (process info)
├── /sys            Virtual filesystem (kernel/device info)
├── /dev            Device files
├── /mnt            Temporary mount points
└── /media          Removable media mount points
```

### 💡 **Key Directories for DevOps**

**Critical Locations:**

| Directory | Purpose | What You'll Find |
|-----------|---------|------------------|
| `/etc` | System configuration | nginx.conf, ssh config, systemd units |
| `/var/log` | System logs | syslog, auth.log, application logs |
| `/var/www` | Web application files | HTML, PHP, static assets |
| `/opt` | Third-party applications | Custom software installations |
| `/home` | User data | User files, configs, SSH keys |
| `/tmp` | Temporary files | Session data (cleared on boot) |
| `/proc` | Process information | CPU, memory, running processes |
| `/sys` | Hardware information | Kernel modules, device info |

**DevOps-Specific Paths:**

```bash
# System logs - Your first stop for troubleshooting
/var/log/syslog             # General system logs (Debian/Ubuntu)
/var/log/messages           # General system logs (RHEL/CentOS)
/var/log/auth.log           # Authentication/authorization
/var/log/nginx/             # Nginx web server logs
/var/log/apache2/           # Apache web server logs

# Application configurations
/etc/nginx/nginx.conf       # Nginx configuration
/etc/ssh/sshd_config        # SSH daemon config
/etc/systemd/system/        # Systemd service definitions
/etc/cron.d/                # Cron job definitions

# Application data
/var/www/html/              # Default web root
/opt/applications/          # Custom installed apps
```

> **Pro Tip:** Memorize `/etc` (configs), `/var/log` (logs), and `/home` (users). These three are where you'll spend most of your time.

---

## Essential Linux Commands

### 💡 **File Operations: Navigation and Management**

**Basic Navigation:**

```bash
# Where am I?
pwd                        # Print working directory

# Change directory
cd /path/to/dir           # Absolute path
cd ~                      # Home directory
cd -                      # Previous directory
cd ..                     # Parent directory
cd ../../                 # Two levels up
```

**Listing Files:**

```bash
# Basic listing
ls                        # List files
ls -l                     # Long format (permissions, owner, size)
ls -la                    # Include hidden files
ls -lh                    # Human-readable sizes
ls -lt                    # Sort by modification time (newest first)
ls -lS                    # Sort by size (largest first)
ls -lR                    # Recursive listing
```

**File Manipulation:**

```bash
# Copy
cp file1 file2            # Copy file
cp -r dir1 dir2           # Copy directory recursively
cp -p file1 file2         # Preserve permissions and timestamps

# Move/Rename
mv file1 file2            # Rename or move file
mv file1 dir/             # Move to directory

# Remove
rm file                   # Remove file
rm -r dir                 # Remove directory recursively
rm -rf dir                # Force remove (DANGEROUS - no confirmation!)

# Create
mkdir newdir              # Create directory
mkdir -p path/to/dir      # Create parent directories as needed
touch file                # Create empty file or update timestamp
```

**⚠️ Warning:** `rm -rf` is irreversible! Always double-check before running.

---

### File Viewing and Searching

**View File Content:**

```bash
# Display entire file
cat file                  # Output entire file
tac file                  # Output in reverse

# Page through file
less file                 # Scrollable viewer (recommended)
more file                 # Basic pager

# View parts of file
head -n 10 file           # First 10 lines
tail -n 10 file           # Last 10 lines
tail -f file              # Follow file in real-time (logs)
tail -f file | grep error # Follow and filter
```

**When to Use Each:**

| Command | Best For | Why |
|---------|----------|-----|
| `cat` | Small files, piping to other commands | Simple, fast |
| `less` | Large files, interactive browsing | Searchable, scrollable |
| `tail -f` | Monitoring logs | Real-time updates |
| `head` | Quick preview of file structure | See first few lines |

**Finding Files:**

```bash
# Find by name
find /path -name "*.log"
find /path -iname "*.LOG"              # Case-insensitive

# Find by type
find /var/log -type f                  # Files only
find /var/log -type d                  # Directories only

# Find by time
find /var/log -mtime -7                # Modified in last 7 days
find /var/log -mtime +30               # Modified more than 30 days ago

# Find by size
find /var/log -size +100M              # Larger than 100MB
find /var/log -size -1M                # Smaller than 1MB

# Find and execute
find /var/log -name "*.log" -exec rm {} \;  # Find and delete
find /tmp -type f -atime +7 -delete         # Delete old temp files
```

**Searching File Content:**

```bash
# Basic search
grep "error" file                      # Search for "error"
grep -i "error" file                   # Case-insensitive
grep -v "info" file                    # Invert match (exclude lines with "info")
grep -r "error" /var/log/              # Recursive search
grep -l "error" *.log                  # List files containing match

# Context
grep -A 5 "error" file                 # Show 5 lines after match
grep -B 5 "error" file                 # Show 5 lines before match
grep -C 5 "error" file                 # Show 5 lines before and after

# Advanced patterns
grep -E "error|warning" file           # Multiple patterns (extended regex)
grep "^error" file                     # Lines starting with "error"
grep "error$" file                     # Lines ending with "error"
```

---

### 💡 **File Permissions: The Security Foundation**

**Understanding Permission Structure:**

```
-rwxr-xr--  1 user group 1024 Jan 01 12:00 file.txt
│││││││││
│└┴┴┴┴┴┴┴─── Permissions
└────────────  File type
```

**Permission Breakdown:**

| Position | Meaning | Values |
|----------|---------|--------|
| 1st character | File type | `-` (file), `d` (directory), `l` (link) |
| 2-4 | Owner permissions | `rwx` (read, write, execute) |
| 5-7 | Group permissions | `r-x` (read, execute) |
| 8-10 | Other permissions | `r--` (read only) |

**Permission Values:**

| Symbol | Numeric | Meaning |
|--------|---------|---------|
| `r` | 4 | Read |
| `w` | 2 | Write |
| `x` | 1 | Execute |
| `-` | 0 | No permission |

### 💡 **Common Permission Patterns**

**Numeric Permissions:**

| Number | Permissions | Meaning | Use Case |
|--------|------------|---------|----------|
| **644** | `rw-r--r--` | Owner: read+write, Others: read | Regular files, configs |
| **755** | `rwxr-xr-x` | Owner: all, Others: read+execute | Scripts, executables |
| **700** | `rwx------` | Owner: all, Others: none | Private files, SSH keys |
| **600** | `rw-------` | Owner: read+write, Others: none | Credentials, private keys |
| **777** | `rwxrwxrwx` | Everyone: all permissions | **Avoid! Security risk** |

**Changing Permissions:**

```bash
# Numeric method (recommended for precision)
chmod 755 script.sh        # rwxr-xr-x
chmod 644 config.txt       # rw-r--r--
chmod 600 ~/.ssh/id_rsa    # rw------- (required for SSH keys)

# Symbolic method (recommended for modifications)
chmod +x script.sh         # Add execute for all
chmod -w file              # Remove write for all
chmod u+x file             # Add execute for user
chmod g-w file             # Remove write for group
chmod o=r file             # Set read-only for others
chmod a+r file             # Add read for all (a=all)

# Recursive
chmod -R 755 /var/www/html/
```

**Changing Ownership:**

```bash
# Change owner and group
chown user:group file

# Change owner only
chown user file

# Change group only
chgrp group file

# Recursive
chown -R www-data:www-data /var/www/html/
```

**Special Permissions:**

| Permission | Numeric | Symbol | Effect |
|------------|---------|--------|--------|
| **SUID** | 4755 | `rwsr-xr-x` | Runs as file owner (e.g., `passwd`) |
| **SGID** | 2755 | `rwxr-sr-x` | Files inherit directory group |
| **Sticky Bit** | 1777 | `rwxrwxrwt` | Only owner can delete (e.g., `/tmp`) |

```bash
# Set special permissions
chmod 4755 binary          # SUID
chmod 2755 shared-dir      # SGID
chmod 1777 /tmp            # Sticky bit
```

> **Key Insight:** Never use `chmod 777` in production! It's a security hole. Use the principle of least privilege - give only necessary permissions.

---

## Users and Groups

### 💡 **User Management**

**Creating Users:**

```bash
# Basic user creation
useradd username

# Create with home directory and shell (recommended)
useradd -m -s /bin/bash username

# Create with specific UID and group
useradd -m -u 1500 -g developers username

# Set password
passwd username
```

**Modifying Users:**

```bash
# Add user to group (common for Docker, sudo)
usermod -aG docker username
usermod -aG sudo username

# Change user shell
usermod -s /bin/zsh username

# Lock/unlock account
usermod -L username        # Lock
usermod -U username        # Unlock
```

**Deleting Users:**

```bash
# Delete user (keep home directory)
userdel username

# Delete user and home directory
userdel -r username
```

**Group Management:**

```bash
# Create group
groupadd developers

# Delete group
groupdel developers

# View user's groups
groups username
id username
```

**Viewing User Information:**

```bash
# Current user
whoami                     # Username
id                         # UID, GID, groups

# Logged in users
w                          # Who is logged in, what they're doing
who                        # Who is logged in
last                       # Login history

# User database
cat /etc/passwd            # All users
cat /etc/group             # All groups
cat /etc/shadow            # Encrypted passwords (root only)
```

**Switching Users:**

```bash
# Switch user
su - username              # Switch user (load environment)
su username                # Switch user (keep current environment)

# Run as root
sudo command               # Run single command as root
sudo -u username command   # Run as specific user
sudo -i                    # Start root shell
```

**✅ Best Practice:** Always use `sudo` for administrative tasks instead of logging in as root directly.

---

## Process Management

### 💡 **Understanding Processes**

Processes are running instances of programs. Every process has a PID (Process ID) and belongs to a user.

**Viewing Processes:**

```bash
# Basic process listing
ps                         # Current shell processes
ps aux                     # All processes (BSD style)
ps -ef                     # All processes (Unix style)
ps aux | grep nginx        # Find specific process

# Process tree
pstree                     # Visual process hierarchy
pstree -p                  # With PIDs
```

**Interactive Process Viewers:**

```bash
# Top-like tools
top                        # Classic process viewer
htop                       # Better interactive viewer (install with apt/yum)

# In top/htop:
# P = sort by CPU
# M = sort by memory
# k = kill process
# q = quit
```

**Finding Process Information:**

```bash
# Get PID
pidof nginx                # PID of nginx
pgrep nginx                # Search by name
pgrep -f "python app.py"   # Search by full command

# Process details
ps -p PID -o comm,pid,ppid,user,%cpu,%mem
cat /proc/PID/cmdline      # Full command line
cat /proc/PID/status       # Process status
```

---

### 💡 **Process Control: Signals**

Processes respond to signals for control and communication.

**Common Signals:**

| Signal | Number | Meaning | Use Case |
|--------|--------|---------|----------|
| **SIGTERM** | 15 | Graceful termination | Normal shutdown, allows cleanup |
| **SIGKILL** | 9 | Force kill | Immediate termination, no cleanup |
| **SIGHUP** | 1 | Hangup | Reload configuration |
| **SIGINT** | 2 | Interrupt | Ctrl+C in terminal |
| **SIGSTOP** | 19 | Pause process | Suspend execution |
| **SIGCONT** | 18 | Continue | Resume suspended process |

**Killing Processes:**

```bash
# Graceful termination (preferred)
kill PID                   # Sends SIGTERM (15)
kill -15 PID               # Explicit SIGTERM

# Force kill (last resort)
kill -9 PID                # Sends SIGKILL
kill -KILL PID             # Same as above

# Kill by name
killall nginx              # Kill all nginx processes
pkill -f "python app"      # Kill by command pattern

# Kill user's processes
pkill -u username          # Kill all processes of user
```

**⚠️ Important:** Always try `kill` (SIGTERM) first to allow graceful shutdown. Only use `kill -9` as a last resort.

---

### Background Processes

**Running Processes in Background:**

```bash
# Run in background
command &                  # Run with &

# Prevent hangup
nohup command &            # Immune to terminal closure
nohup command > output.log 2>&1 &  # Redirect output

# Job control
jobs                       # List background jobs
fg %1                      # Bring job 1 to foreground
bg %1                      # Resume job 1 in background
disown %1                  # Remove job from shell
Ctrl+Z                     # Suspend current process
```

**Process Priority:**

```bash
# Start with priority (-20 = highest, 19 = lowest)
nice -n 10 command         # Start with nice value 10

# Change priority of running process
renice -n 5 -p PID         # Set priority to 5
renice -n -10 -p PID       # Higher priority (requires root)
```

---

### 💡 **Systemd Service Management**

Systemd is the modern init system for managing services.

**Service Control:**

```bash
# Start/Stop/Restart
systemctl start nginx      # Start service
systemctl stop nginx       # Stop service
systemctl restart nginx    # Stop then start
systemctl reload nginx     # Reload config (no downtime)

# Enable/Disable at boot
systemctl enable nginx     # Start at boot
systemctl disable nginx    # Don't start at boot
systemctl enable --now nginx  # Enable and start immediately

# Check status
systemctl status nginx     # Detailed status
systemctl is-active nginx  # Check if running
systemctl is-enabled nginx # Check if enabled at boot
```

**Service Information:**

```bash
# List services
systemctl list-units --type=service              # Active services
systemctl list-unit-files --type=service         # All services
systemctl list-units --type=service --state=failed  # Failed services
```

**Service Logs:**

```bash
# View logs
journalctl -u nginx                    # All logs for service
journalctl -u nginx -f                 # Follow logs (like tail -f)
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx --since "2024-01-01"
journalctl -u nginx -n 100             # Last 100 lines
journalctl -u nginx -p err             # Error level and above
```

**Creating Custom Service:**

```bash
# Create service file
sudo vi /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=My Application
Documentation=https://example.com/docs
After=network.target

[Service]
Type=simple
User=appuser
Group=appgroup
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/start.sh
ExecStop=/opt/myapp/stop.sh
Restart=always
RestartSec=10

# Environment
Environment="NODE_ENV=production"
EnvironmentFile=/etc/myapp/env

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Reload and Start:**

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Start service
sudo systemctl start myapp
sudo systemctl enable myapp
sudo systemctl status myapp
```

> **Key Insight:** Systemd services restart automatically on failure, handle dependencies, and provide centralized logging - essential for production workloads.

---

## Networking Basics

### 💡 **Network Interface Management**

**Viewing Network Information:**

```bash
# Modern command (recommended)
ip addr show               # Show all IP addresses
ip link show               # Show network interfaces
ip -s link                 # Show statistics

# Legacy command (still common)
ifconfig                   # Show network configuration
ifconfig eth0              # Specific interface
```

**Checking Connectivity:**

```bash
# Ping (ICMP)
ping google.com            # Continuous ping (Ctrl+C to stop)
ping -c 4 8.8.8.8         # Ping 4 times
ping -c 1 -W 1 host       # 1 ping, 1 second timeout

# Traceroute
traceroute google.com      # Trace route to destination
mtr google.com             # Better traceroute (combines ping + traceroute)
```

---

### DNS Resolution

**DNS Lookup Tools:**

```bash
# Simple lookup
nslookup google.com        # Basic DNS query
host google.com            # Simple DNS lookup

# Detailed lookup (recommended)
dig google.com             # Detailed DNS query
dig google.com +short      # Just the IP
dig @8.8.8.8 google.com    # Use specific DNS server
dig -x 8.8.8.8             # Reverse lookup
dig google.com ANY         # All records
```

**DNS Configuration:**

```bash
# DNS servers
cat /etc/resolv.conf       # DNS configuration
# Example content:
# nameserver 8.8.8.8
# nameserver 8.8.4.4

# Static hostname mapping
cat /etc/hosts             # Local hostname resolution
# Example: 192.168.1.100 server1.local
```

---

### 💡 **Network Connections and Ports**

**Viewing Active Connections:**

| Command | Purpose | Best For |
|---------|---------|----------|
| `netstat` | Legacy network stats | Older systems, compatibility |
| `ss` | Modern socket stats | Performance, detailed info |
| `lsof` | List open files/sockets | Process-specific investigation |

**Common Usage:**

```bash
# Listening ports
netstat -tuln              # TCP/UDP listening ports
ss -tuln                   # Modern alternative (faster)
ss -tulnp                  # Include process names (requires root)

# All connections
netstat -tupn              # All TCP/UDP connections
ss -tupn                   # Modern alternative

# Specific port
lsof -i :80                # What's using port 80?
lsof -i TCP:3000           # What's using TCP port 3000?
ss -tulpn | grep :80       # Port 80 listeners

# Specific process
lsof -p PID                # All connections for PID
lsof -c nginx              # All connections for nginx
```

**Flag Meanings:**

| Flag | Meaning |
|------|---------|
| `-t` | TCP |
| `-u` | UDP |
| `-l` | Listening |
| `-n` | Numeric (don't resolve names) |
| `-p` | Process/program |

---

### Network Testing

**HTTP/HTTPS Testing:**

```bash
# cURL (recommended for APIs)
curl https://example.com                    # GET request
curl -I https://example.com                 # Headers only
curl -X POST -d "data" https://api.com      # POST request
curl -H "Authorization: Bearer token" url   # With headers
curl -o file.html https://example.com       # Save to file
curl -w "%{http_code}\n" url                # Show status code

# wget (recommended for downloads)
wget https://example.com/file.zip           # Download file
wget -O custom-name.zip url                 # Save with custom name
wget -c url                                 # Resume interrupted download
```

**Port Testing:**

```bash
# Netcat (Swiss Army knife)
nc -zv host 80             # Test port 80 (verbose)
nc -zv host 20-100         # Scan port range
nc -l 8080                 # Listen on port 8080

# Telnet
telnet host 80             # Test TCP connection
# Then type: GET / HTTP/1.1
```

---

### 💡 **Firewall Management**

**UFW (Uncomplicated Firewall) - Ubuntu/Debian:**

```bash
# Status
ufw status                 # Check status
ufw status verbose         # Detailed status

# Enable/Disable
ufw enable                 # Enable firewall
ufw disable                # Disable firewall

# Allow/Deny rules
ufw allow 22/tcp           # Allow SSH
ufw allow 80/tcp           # Allow HTTP
ufw allow 443/tcp          # Allow HTTPS
ufw allow from 192.168.1.0/24  # Allow from subnet
ufw deny 3306/tcp          # Deny MySQL

# Delete rules
ufw delete allow 80/tcp    # Delete rule
ufw reset                  # Reset all rules
```

**iptables (Low-level firewall):**

```bash
# List rules
iptables -L                # List all rules
iptables -L -v -n          # Verbose, numeric

# Allow traffic
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Block traffic
iptables -A INPUT -s 192.168.1.100 -j DROP

# Save rules (Ubuntu/Debian)
iptables-save > /etc/iptables/rules.v4
```

---

## Package Management

### 💡 **APT vs YUM/DNF**

Different Linux distributions use different package managers.

**Distribution Package Managers:**

| Distribution | Package Manager | Package Format |
|-------------|----------------|----------------|
| Ubuntu, Debian | APT/apt-get | `.deb` |
| RHEL, CentOS 7 | YUM | `.rpm` |
| RHEL 8+, Fedora | DNF | `.rpm` |
| Arch Linux | pacman | `.pkg.tar.zst` |
| Alpine Linux | apk | `.apk` |

---

### APT (Debian/Ubuntu)

**Update System:**

```bash
# Update package lists
apt update                 # Refresh package index

# Upgrade packages
apt upgrade                # Upgrade installed packages
apt full-upgrade           # Upgrade with dependency resolution
apt dist-upgrade           # Upgrade distribution (old command)
```

**Package Operations:**

```bash
# Install
apt install nginx          # Install package
apt install nginx=1.18.0-0ubuntu1  # Install specific version
apt install nginx apache2  # Install multiple packages

# Remove
apt remove nginx           # Remove package (keep configs)
apt purge nginx            # Remove package and configs
apt autoremove             # Remove unused dependencies
```

**Package Information:**

```bash
# Search
apt search nginx           # Search packages
apt list --installed       # List installed packages
apt list --upgradable      # List upgradable packages

# Details
apt show nginx             # Show package details
apt policy nginx           # Show versions available
apt-cache depends nginx    # Show dependencies
```

**Cache Management:**

```bash
apt clean                  # Delete downloaded packages
apt autoclean              # Delete old versions only
```

**✅ Best Practice:** Always run `apt update` before `apt install` to ensure you get the latest versions.

---

### YUM/DNF (RHEL/CentOS/Fedora)

**Update System:**

```bash
# RHEL 7 / CentOS 7
yum update                 # Update all packages
yum check-update           # Check for updates

# RHEL 8+ / CentOS 8+ / Fedora
dnf update                 # Update all packages
dnf check-update           # Check for updates
```

**Package Operations:**

```bash
# Install
yum install nginx          # Install package
yum install nginx-1.18.0   # Specific version
dnf install nginx          # DNF version

# Remove
yum remove nginx           # Remove package
yum autoremove             # Remove unused dependencies
```

**Package Information:**

```bash
# Search
yum search nginx           # Search packages
yum list installed         # List installed packages
yum list available         # List available packages

# Details
yum info nginx             # Show package details
yum deplist nginx          # Show dependencies
```

**Repository Management:**

```bash
# List repositories
yum repolist               # List enabled repos
yum repolist all           # List all repos

# Add repository
yum-config-manager --add-repo https://repo.url
dnf config-manager --add-repo https://repo.url

# Enable/disable repo
yum-config-manager --enable repo-name
yum-config-manager --disable repo-name
```

**Common Package Manager Commands:**

| Task | APT (Debian/Ubuntu) | YUM/DNF (RHEL/CentOS) |
|------|---------------------|----------------------|
| Update index | `apt update` | `yum check-update` |
| Upgrade packages | `apt upgrade` | `yum update` |
| Install | `apt install pkg` | `yum install pkg` |
| Remove | `apt remove pkg` | `yum remove pkg` |
| Search | `apt search keyword` | `yum search keyword` |
| Info | `apt show pkg` | `yum info pkg` |
| List installed | `apt list --installed` | `yum list installed` |
| Clean cache | `apt clean` | `yum clean all` |

---

## Disk Management

### 💡 **Disk Usage Monitoring**

**Check Disk Space:**

```bash
# Filesystem usage
df -h                      # Human-readable disk usage
df -i                      # Inode usage
df -h /var                 # Specific filesystem

# Directory usage
du -sh /var/log            # Total size of directory
du -h --max-depth=1 /var   # Size of each subdirectory
du -sh * | sort -hr        # Largest directories first
```

**When to Use Each:**

| Command | Use Case | What It Shows |
|---------|----------|---------------|
| `df -h` | Check free space | Filesystem capacity, used, available |
| `df -i` | Out of inodes | Inode usage (file count limits) |
| `du -sh` | Find large directories | Actual disk usage by directory |

**Common Disk Issues:**

| Problem | Symptom | Solution |
|---------|---------|----------|
| Disk full | "No space left on device" | `df -h`, `du -sh * \| sort -hr` |
| Out of inodes | "No space" but `df` shows free space | `df -i`, delete many small files |
| Large log files | `/var/log` consuming space | Rotate logs, `journalctl --vacuum-time=7d` |

---

### Disk Information

**Listing Disks:**

```bash
# List block devices
lsblk                      # Tree view of disks/partitions
lsblk -f                   # Include filesystem type

# Disk partitions
fdisk -l                   # List all disks and partitions
parted -l                  # Alternative (GPT support)

# Block device IDs
blkid                      # UUID and filesystem types
```

**Partition Management:**

```bash
# Create partitions
fdisk /dev/sdb             # Interactive partitioning (MBR)
parted /dev/sdb            # Interactive partitioning (GPT)
```

---

### Filesystem Operations

**Creating Filesystems:**

```bash
# Format partition
mkfs.ext4 /dev/sdb1        # Create ext4 filesystem
mkfs.xfs /dev/sdb1         # Create XFS filesystem
mkfs -t ext4 /dev/sdb1     # Specify type explicitly
```

**Mounting Filesystems:**

```bash
# Temporary mount
mount /dev/sdb1 /mnt/data  # Mount filesystem
mount -o ro /dev/sdb1 /mnt # Mount read-only
umount /mnt/data           # Unmount

# Mount all from fstab
mount -a                   # Mount all filesystems in /etc/fstab

# Check what's mounted
mount                      # List mounted filesystems
findmnt                    # Better mount listing (tree view)
```

**Persistent Mounts (/etc/fstab):**

```bash
# /etc/fstab format:
# <device>  <mount point>  <type>  <options>  <dump>  <pass>

# Example entries:
/dev/sdb1     /data        ext4    defaults   0       2
UUID=abc123   /backup      xfs     defaults   0       2
```

**fstab Options:**

| Option | Meaning |
|--------|---------|
| `defaults` | Default mount options (rw, suid, dev, exec, auto, nouser, async) |
| `nofail` | Don't fail boot if device is missing (important for AWS EBS) |
| `noauto` | Don't mount automatically at boot |
| `ro` | Read-only |
| `rw` | Read-write |

---

### 💡 **AWS EBS Volume Setup**

**Attaching and Mounting EBS Volume:**

**Step 1: List available devices**

```bash
lsblk
# Output:
# NAME    MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
# xvda    202:0    0  8G  0 disk
# └─xvda1 202:1    0  8G  0 part /
# xvdf    202:80   0  100G  0 disk    <- New EBS volume
```

**Step 2: Check if volume has filesystem**

```bash
file -s /dev/xvdf
# If output is "data", it's a new volume without filesystem
```

**Step 3: Create filesystem (only for new volumes)**

```bash
# ⚠️ This erases all data!
mkfs -t ext4 /dev/xvdf
```

**Step 4: Create mount point and mount**

```bash
mkdir /data
mount /dev/xvdf /data
```

**Step 5: Make mount persistent**

```bash
# Add to /etc/fstab (use UUID for reliability)
UUID=$(blkid -s UUID -o value /dev/xvdf)
echo "UUID=$UUID  /data  ext4  defaults,nofail  0  2" >> /etc/fstab

# Test fstab
mount -a
```

**Step 6: Verify**

```bash
df -h /data
mount | grep /data
```

> **Pro Tip:** Always use `UUID` instead of device names in `/etc/fstab`. Device names (`/dev/xvdf`) can change, but UUIDs are persistent.

---

### Filesystem Health

**Checking Filesystems:**

```bash
# Check filesystem (must be unmounted!)
fsck /dev/sdb1             # Generic check
e2fsck -f /dev/sdb1        # Force check (ext2/3/4)
xfs_repair /dev/sdb1       # XFS repair
```

**⚠️ Warning:** Never run `fsck` on a mounted filesystem! Unmount first or risk data corruption.

---

## Text Processing

### 💡 **Text Processing Power Tools**

Mastering text processing = log analysis superpowers.

**Viewing Files:**

```bash
# Display content
cat file.txt               # Entire file
tac file.txt               # Reverse order
head -n 20 file.txt        # First 20 lines
tail -n 20 file.txt        # Last 20 lines

# Interactive viewing
less file.txt              # Scrollable viewer
# In less: / to search, n for next match, q to quit

# Real-time monitoring
tail -f /var/log/syslog    # Follow file (logs)
tail -f log | grep error   # Follow and filter
```

---

### Search and Replace

### 💡 **sed: Stream Editor**

```bash
# Replace text
sed 's/old/new/' file      # Replace first occurrence per line
sed 's/old/new/g' file     # Replace all occurrences (global)
sed -i 's/old/new/g' file  # In-place edit (modifies file)

# Delete lines
sed '/pattern/d' file      # Delete lines matching pattern
sed '10,20d' file          # Delete lines 10-20

# Print lines
sed -n '10,20p' file       # Print lines 10-20 only
sed -n '/error/p' file     # Print lines with "error"
```

**Real-World Examples:**

```bash
# Change IP address in config
sed -i 's/192.168.1.100/192.168.1.200/g' /etc/hosts

# Remove comments and blank lines
sed '/^#/d; /^$/d' file

# Add text before/after pattern
sed '/pattern/a New line after' file
sed '/pattern/i New line before' file
```

---

### 💡 **awk: Text Processing Language**

```bash
# Print columns
awk '{print $1}' file              # First column
awk '{print $1, $3}' file          # Columns 1 and 3
awk '{print $NF}' file             # Last column

# CSV processing
awk -F',' '{print $1,$3}' file.csv # Columns 1 and 3

# Filtering
awk '$3 > 100' file                # Rows where column 3 > 100
awk '/error/ {print $0}' file      # Lines containing "error"

# Math operations
awk '{sum+=$1} END {print sum}' file  # Sum of column 1
awk '{avg+=$1; count++} END {print avg/count}' file  # Average
```

**Real-World Examples:**

```bash
# Sum disk usage
du -sh * | awk '{sum+=$1} END {print sum}'

# Count HTTP status codes
awk '{print $9}' access.log | sort | uniq -c

# Extract IPs from log
awk '{print $1}' access.log | sort | uniq

# Filter by time range
awk '$4 > "01/Jan/2024" && $4 < "31/Jan/2024"' log
```

---

### Column Extraction

```bash
# cut - Extract columns by delimiter
cut -d',' -f1,3 file.csv           # CSV columns 1 and 3
cut -d':' -f1,3 /etc/passwd        # User and UID
cut -c1-10 file                    # Characters 1-10

# tr - Transform characters
tr '[:lower:]' '[:upper:]' < file  # Lowercase to uppercase
tr -d ' ' < file                   # Delete spaces
tr -s ' ' < file                   # Squeeze repeated spaces
```

---

### Sorting and Unique

```bash
# Sort
sort file                          # Alphabetical sort
sort -n file                       # Numeric sort
sort -r file                       # Reverse sort
sort -k2 file                      # Sort by column 2
sort -t',' -k3 file.csv            # Sort CSV by column 3

# Unique
uniq file                          # Remove adjacent duplicates
sort file | uniq                   # Sort then unique
sort file | uniq -c                # Count occurrences
sort file | uniq -d                # Only show duplicates
```

---

### 💡 **Combining Commands with Pipes**

The real power comes from chaining commands together.

**Common Patterns:**

```bash
# Find top 10 largest files
du -sh * | sort -hr | head -10

# Count unique IPs in log
awk '{print $1}' access.log | sort | uniq | wc -l

# Find most common errors
grep "ERROR" application.log | awk '{print $5}' | sort | uniq -c | sort -nr | head -10

# Top memory-consuming processes
ps aux | sort -k4 -nr | head -10

# Find failed SSH login attempts
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -nr
```

**Redirection:**

```bash
# Output redirection
command > file                # Overwrite file
command >> file               # Append to file
command 2> file               # Redirect stderr
command > file 2>&1           # Redirect stdout and stderr
command &> file               # Redirect both (bash shortcut)

# Input redirection
command < input.txt           # Read from file

# Here document
cat << EOF > file
Line 1
Line 2
EOF
```

> **Key Insight:** Mastering pipes (`|`) and combining `grep`, `awk`, `sed`, `sort`, and `uniq` will make you incredibly productive at log analysis and troubleshooting.

---

## Archive and Compression

### 💡 **tar: The Tape Archive**

**Creating Archives:**

```bash
# Create tar archive
tar -cvf archive.tar files/

# Create compressed archives
tar -czvf archive.tar.gz files/    # gzip compression (most common)
tar -cjvf archive.tar.bz2 files/   # bzip2 compression (better compression)
tar -cJvf archive.tar.xz files/    # xz compression (best compression)
```

**Extracting Archives:**

```bash
# Extract
tar -xvf archive.tar               # Extract tar
tar -xzvf archive.tar.gz           # Extract gzip
tar -xjvf archive.tar.bz2          # Extract bzip2

# Extract to specific directory
tar -xzvf archive.tar.gz -C /dest/

# Extract single file
tar -xzvf archive.tar.gz path/to/file
```

**Viewing Archive Contents:**

```bash
tar -tvf archive.tar               # List contents
tar -tzvf archive.tar.gz           # List gzip archive
```

**tar Flags Explained:**

| Flag | Meaning |
|------|---------|
| `c` | Create archive |
| `x` | Extract archive |
| `t` | List contents |
| `v` | Verbose output |
| `f` | File (must be last flag) |
| `z` | gzip compression (.tar.gz) |
| `j` | bzip2 compression (.tar.bz2) |
| `J` | xz compression (.tar.xz) |

**Memory Aid:** "eXtract Zee File" = `xzf`

---

### Compression Tools

**gzip (most common):**

```bash
gzip file                          # Compress (removes original)
gzip -k file                       # Keep original
gzip -d file.gz                    # Decompress
gunzip file.gz                     # Decompress (same as above)
gzip -9 file                       # Maximum compression
```

**zip/unzip:**

```bash
# Create zip
zip archive.zip file1 file2
zip -r archive.zip directory/      # Recursive

# Extract
unzip archive.zip
unzip archive.zip -d /dest/        # Extract to directory
unzip -l archive.zip               # List contents
```

**Compression Comparison:**

| Tool | Speed | Compression | Extension | Use Case |
|------|-------|------------|-----------|----------|
| **gzip** | Fast | Good | `.gz` | General purpose, default |
| **bzip2** | Slow | Better | `.bz2` | When size matters more than speed |
| **xz** | Slowest | Best | `.xz` | Maximum compression needed |
| **zip** | Fast | Good | `.zip` | Cross-platform compatibility |

---

## Best Practices

### 💡 **Security Hardening**

**Essential Security Measures:**

✅ **Do:**

- **SSH Keys over Passwords:**
  ```bash
  # Generate SSH key
  ssh-keygen -t ed25519 -C "your_email@example.com"

  # Copy to server
  ssh-copy-id user@server
  ```

- **Disable Root SSH Login:**
  ```bash
  # /etc/ssh/sshd_config
  PermitRootLogin no
  PasswordAuthentication no  # Use keys only
  ```

- **Keep Systems Updated:**
  ```bash
  # Debian/Ubuntu
  apt update && apt upgrade
  apt autoremove

  # RHEL/CentOS
  yum update
  yum autoremove
  ```

- **Use sudo Instead of Root:**
  ```bash
  # Add user to sudo group
  usermod -aG sudo username
  ```

- **Enable Firewall:**
  ```bash
  # UFW (Ubuntu)
  ufw enable
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw status
  ```

- **Install fail2ban (SSH Protection):**
  ```bash
  apt install fail2ban
  systemctl enable fail2ban
  systemctl start fail2ban
  ```

- **Set Proper File Permissions:**
  ```bash
  # Never 777 in production
  chmod 644 configs       # Read for all, write for owner
  chmod 600 secrets       # Owner only
  chmod 700 ~/.ssh        # SSH directory
  chmod 600 ~/.ssh/id_rsa # Private key
  ```

❌ **Don't:**

- ❌ Use `chmod 777` unless absolutely necessary (almost never)
- ❌ Run services as root user
- ❌ Store passwords in plain text files
- ❌ Leave default ports open (change SSH from 22)
- ❌ Ignore security updates
- ❌ Use weak passwords
- ❌ Disable SELinux/AppArmor without good reason

---

### 💡 **Performance Monitoring**

**System Resource Monitoring:**

```bash
# CPU monitoring
top -bn1 | head -20        # Snapshot
htop                       # Interactive
mpstat 1                   # CPU stats every 1 second
lscpu                      # CPU information

# Memory monitoring
free -h                    # Human-readable
free -h -s 1               # Update every 1 second
vmstat 1                   # Virtual memory stats
cat /proc/meminfo          # Detailed memory info

# Disk I/O monitoring
iostat -x 1                # Extended stats every 1 second
iotop                      # Top-like I/O monitor
df -h                      # Disk space

# Network monitoring
iftop                      # Interface traffic
nethogs                    # Per-process network usage
ss -s                      # Socket statistics
```

**Quick Performance Check:**

```bash
# All-in-one commands
top                        # CPU and memory
htop                       # Better top
glances                    # Comprehensive system monitor
```

**Load Average Interpretation:**

```bash
uptime
# Output: 13:24:01 up 10 days, 2:15, 2 users, load average: 0.15, 0.25, 0.30
#                                                          1min  5min  15min
```

| Load Average | Meaning (4-core CPU) |
|--------------|---------------------|
| < 4.0 | System is fine |
| 4.0 - 8.0 | Getting busy |
| > 8.0 | Overloaded |

> **Formula:** Load average should be < number of CPU cores for healthy system.

---

### System Maintenance

**Regular Maintenance Tasks:**

```bash
# Weekly tasks
apt update && apt upgrade                    # Update packages (Debian/Ubuntu)
yum update                                   # Update packages (RHEL/CentOS)
apt autoremove                               # Remove unused packages

# Monthly tasks
journalctl --vacuum-time=30d                 # Keep only 30 days of logs
find /tmp -type f -atime +7 -delete          # Clean old temp files
find /var/log -name "*.gz" -mtime +90 -delete  # Remove old compressed logs

# Check system health
systemctl --failed                           # Check for failed services
df -h                                        # Check disk space
free -h                                      # Check memory
uptime                                       # Check system load

# Verify backups
# (Your backup verification script here)
```

**Automation with Cron:**

```bash
# Edit crontab
crontab -e
```

```bash
# Cron format: minute hour day month weekday command
# Example cron jobs:

# Daily at 3 AM - Update packages
0 3 * * * apt update && apt upgrade -y

# Weekly on Sunday at 2 AM - Clean logs
0 2 * * 0 journalctl --vacuum-time=30d

# Every 6 hours - Check disk space and alert if >90%
0 */6 * * * df -h | awk '$5+0 > 90 {print $0}' | mail -s "Disk Alert" admin@example.com
```

**Maintenance Checklist:**

| Task | Frequency | Command |
|------|-----------|---------|
| Update packages | Weekly | `apt update && apt upgrade` |
| Remove unused packages | Weekly | `apt autoremove` |
| Clean logs | Monthly | `journalctl --vacuum-time=30d` |
| Check failed services | Daily | `systemctl --failed` |
| Check disk space | Daily | `df -h` |
| Check backups | Daily | Verify backup completion |
| Review security logs | Weekly | `grep "Failed" /var/log/auth.log` |
| Update SSL certificates | Before expiry | `certbot renew` |

---

## Interview Questions

### Q1: What is the difference between /bin and /usr/bin?

**Answer:**

| Directory | Purpose | Examples |
|-----------|---------|----------|
| `/bin` | Essential binaries for system boot and single-user mode | `ls`, `cp`, `mv`, `cat`, `bash` |
| `/usr/bin` | User programs and utilities (not needed for boot) | `vim`, `git`, `python`, `gcc` |

**Modern Linux:** Many distributions now symlink `/bin` → `/usr/bin` for simplicity (merged `/usr`).

---

### Q2: How do you find files larger than 100MB modified in the last 7 days?

**Answer:**

```bash
find /path -type f -size +100M -mtime -7
```

**Flags explained:**
- `-type f` = files only (not directories)
- `-size +100M` = larger than 100MB
- `-mtime -7` = modified in last 7 days

**Variations:**

```bash
# Find and list with sizes
find /var/log -type f -size +100M -mtime -7 -exec ls -lh {} \;

# Find and delete
find /tmp -type f -size +1G -mtime +30 -delete
```

---

### Q3: What's the difference between `kill` and `kill -9`?

**Answer:**

| Command | Signal | Behavior | When to Use |
|---------|--------|----------|-------------|
| `kill PID` | SIGTERM (15) | Graceful shutdown, allows cleanup | **Always try first** |
| `kill -9 PID` | SIGKILL (9) | Immediate termination, no cleanup | **Last resort only** |

**Process:**

```bash
# 1. Try graceful shutdown
kill 1234

# 2. Wait a few seconds, check if process is still running
ps -p 1234

# 3. If still running, force kill
kill -9 1234
```

> **Key Point:** SIGTERM allows the process to clean up (close files, save state). SIGKILL immediately terminates with no cleanup, potentially causing data corruption.

---

### Q4: How do you check disk I/O usage?

**Answer:**

```bash
# Basic I/O stats
iostat -x 1               # Extended stats every 1 second

# Interactive I/O monitoring
iotop                     # Shows processes by I/O usage (requires root)

# Specific device
iostat -x /dev/sda 1      # Monitor specific disk
```

**Interpreting `iostat` output:**

| Metric | Meaning | Concern If |
|--------|---------|-----------|
| `%util` | Percentage of time device was busy | > 80% consistently |
| `await` | Average wait time (ms) | > 20ms for SSDs, > 10ms for NVMe |
| `r/s`, `w/s` | Reads/writes per second | Very high or very low |

---

### Q5: How do you find which process is using a specific port?

**Answer:**

Multiple methods:

```bash
# Method 1: lsof (most detailed)
lsof -i :80
# Output: Shows process name, PID, user

# Method 2: ss (modern, fast)
ss -tulpn | grep :80

# Method 3: netstat (legacy)
netstat -tulpn | grep :80

# Method 4: fuser
fuser 80/tcp
```

**Best practice:** Use `ss` on modern systems (faster than netstat), or `lsof` for detailed information.

---

### Q6: What are the permission numbers 644, 755, and 777?

**Answer:**

| Number | Symbolic | Owner | Group | Others | Use Case |
|--------|----------|-------|-------|--------|----------|
| **644** | `rw-r--r--` | read+write | read | read | Config files, data files |
| **755** | `rwxr-xr-x` | all | read+execute | read+execute | Scripts, executables, directories |
| **700** | `rwx------` | all | none | none | Private directories, SSH keys |
| **600** | `rw-------` | read+write | none | none | Credentials, private keys |
| **777** | `rwxrwxrwx` | all | all | all | **❌ Avoid! Security risk** |

**Calculation:**

```
rwx = 4 + 2 + 1 = 7
rw- = 4 + 2 + 0 = 6
r-- = 4 + 0 + 0 = 4

644 = rw- r-- r--
755 = rwx r-x r-x
```

---

### Q7: How do you check system resource usage?

**Answer:**

```bash
# Quick overview
top                       # Interactive, real-time
htop                      # Better top (install first)

# CPU
lscpu                     # CPU information
mpstat 1                  # CPU stats per core
top -bn1 | head -20       # CPU snapshot

# Memory
free -h                   # Simple memory usage
vmstat 1                  # Virtual memory stats
cat /proc/meminfo         # Detailed memory info

# Disk
df -h                     # Disk space
du -sh /var/*             # Directory sizes
iostat -x 1               # Disk I/O

# Network
iftop                     # Network traffic by interface
nethogs                   # Network usage by process

# All-in-one
glances                   # Comprehensive system monitor
dstat                     # Versatile stats tool

# Load average
uptime                    # System uptime and load
w                         # Who's logged in + load
```

---

### Q8: How do you monitor a log file in real-time?

**Answer:**

```bash
# Basic following
tail -f /var/log/syslog

# Follow with filtering
tail -f /var/log/syslog | grep "error"
tail -f /var/log/syslog | grep -E "error|warning"

# Multiple files
tail -f /var/log/nginx/*.log

# With line numbers
tail -fn 50 /var/log/syslog

# Systemd logs
journalctl -u nginx -f    # Follow service logs
journalctl -f             # Follow all logs
```

**Advanced monitoring:**

```bash
# Highlight matches (GNU grep)
tail -f /var/log/syslog | grep --color=always "error"

# Multiple patterns with colors
tail -f log | grep -E --color=always 'error|warning|$'
```

---

### Q9: What's the difference between hard links and soft links?

**Answer:**

| Feature | Hard Link | Soft Link (Symlink) |
|---------|-----------|---------------------|
| **Points to** | Inode directly | File path |
| **Survives source deletion** | ✅ Yes | ❌ No (becomes broken link) |
| **Can link directories** | ❌ No | ✅ Yes |
| **Can cross filesystems** | ❌ No | ✅ Yes |
| **Inode number** | Same as original | Different |
| **Creation** | `ln source link` | `ln -s source link` |

**Examples:**

```bash
# Hard link
ln original.txt hardlink.txt
# Both files point to same inode, deleting one doesn't affect the other

# Soft link (symlink)
ln -s /path/to/original.txt symlink.txt
# Symlink points to path, breaks if original is deleted
```

**When to use:**

- **Hard links:** Backups, ensuring file survives even if one reference is deleted
- **Soft links:** Shortcuts, aliasing, linking across filesystems

---

### Q10: How do you troubleshoot high CPU usage?

**Answer:**

**Step-by-step process:**

**Step 1: Identify high CPU processes**

```bash
top                       # Interactive view (press 'P' to sort by CPU)
ps aux --sort=-%cpu | head -10  # Top 10 CPU consumers
```

**Step 2: Get process details**

```bash
# Process command line
ps -p PID -o comm,pid,ppid,user,cmd

# Process threads
ps -T -p PID

# System calls
strace -p PID -c          # Summary of system calls

# Open files
lsof -p PID
```

**Step 3: Investigate application**

```bash
# Application logs
journalctl -u service-name -f

# Check for deadlocks, infinite loops
# Review application metrics
```

**Step 4: Take action**

```bash
# Lower priority (nice)
renice -n 10 -p PID       # Lower priority (higher nice value = lower priority)

# Restart service
systemctl restart service-name

# Kill if necessary
kill PID                  # Graceful
kill -9 PID               # Force (last resort)
```

**Common causes:**

- ✅ Infinite loops in code
- ✅ Memory leaks triggering GC thrashing
- ✅ Inefficient queries (database)
- ✅ Too many threads/processes
- ✅ Cryptomining malware

---

## Summary

### Core Concepts

**1. File System:**

```
/ (root) → /etc (configs) → /var/log (logs) → /home (users)
```

- ✅ Hierarchy: FHS defines standard directory structure
- ✅ Navigation: `cd`, `ls`, `pwd`, `find`, `locate`
- ✅ Permissions: `chmod`, `chown` (rwx = read, write, execute)
- ✅ Three permission groups: owner, group, others

**2. Processes:**

```
Process = Running program with PID, belongs to user
```

- ✅ View: `ps aux`, `top`, `htop`, `pstree`
- ✅ Manage: `kill`, `systemctl`, `nice`, `renice`
- ✅ Signals: SIGTERM (15) = graceful, SIGKILL (9) = force
- ✅ Services: Systemd manages services with `systemctl`

**3. Networking:**

- ✅ Connectivity: `ping`, `curl`, `wget`, `nc`, `traceroute`
- ✅ Debug: `ss`, `lsof`, `tcpdump`, `netstat`
- ✅ Configure: `ip`, `ifconfig` (legacy)
- ✅ DNS: `/etc/hosts`, `/etc/resolv.conf`, `dig`, `nslookup`
- ✅ Firewall: `ufw` (simple), `iptables` (advanced)

**4. Package Management:**

| Distribution | Commands |
|-------------|----------|
| **Ubuntu/Debian** | `apt update`, `apt install`, `apt upgrade` |
| **RHEL/CentOS 7** | `yum update`, `yum install` |
| **RHEL 8+/Fedora** | `dnf update`, `dnf install` |

- ✅ Always `apt update` before `apt install`
- ✅ Clean with `apt autoremove`, `apt clean`

**5. Text Processing:**

```bash
# The power combo:
grep → filter lines
sed → transform text
awk → process columns
sort → order data
uniq → remove duplicates
```

- ✅ View: `cat`, `less`, `head`, `tail -f`
- ✅ Search: `grep`, `egrep`, `ag`
- ✅ Transform: `sed`, `awk`, `cut`, `tr`
- ✅ Pipes: Chain commands with `|`

**6. Disk Management:**

- ✅ Check space: `df -h`, `du -sh`
- ✅ Mount: `mount`, `/etc/fstab`
- ✅ Partitions: `fdisk`, `parted`, `lsblk`
- ✅ Filesystem: `mkfs.ext4`, `mkfs.xfs`

**7. Performance:**

| Resource | Commands |
|----------|----------|
| CPU | `top`, `htop`, `mpstat` |
| Memory | `free -h`, `vmstat` |
| Disk I/O | `iostat`, `iotop` |
| Network | `iftop`, `nethogs` |
| Overall | `uptime`, `glances` |

### Key Insights

> **Everything in Linux is a file** - devices (`/dev`), processes (`/proc`), hardware (`/sys`). Understanding this simplifies Linux.

> **Permissions are security** - Follow the principle of least privilege. Never use `chmod 777` in production.

> **Process signals matter** - Always try SIGTERM (`kill`) before SIGKILL (`kill -9`). Graceful shutdown prevents data corruption.

> **Text processing = superpowers** - Mastering `grep | awk | sed | sort | uniq` makes you 10x faster at log analysis.

> **Learn these first** - Master Linux fundamentals before Docker, Kubernetes, and Terraform. Everything builds on these basics.

### Essential Commands Cheat Sheet

```bash
# Files
ls -lah, cd, pwd, cp, mv, rm, find, chmod, chown

# Text
cat, less, head, tail -f, grep, sed, awk, sort, uniq

# Processes
ps aux, top, htop, kill, systemctl, journalctl

# Network
ip addr, ping, curl, ss, lsof, dig, ufw

# Disk
df -h, du -sh, mount, lsblk, fdisk

# Packages
apt update/install/upgrade, yum update/install

# System
uptime, free -h, iostat, vmstat, dmesg
```

### Best Practices Checklist

- ✅ Use SSH keys, not passwords
- ✅ Disable root SSH login
- ✅ Keep systems updated (`apt update && apt upgrade`)
- ✅ Use `sudo` instead of root user
- ✅ Set proper permissions (644 for files, 755 for scripts, 600 for secrets)
- ✅ Enable firewall (`ufw enable`)
- ✅ Install fail2ban for SSH protection
- ✅ Monitor logs (`tail -f`, `journalctl`)
- ✅ Automate maintenance with cron
- ✅ Regular backups (and verify them!)

---

**Next Steps:**
- [Shell Scripting →](./02-shell-scripting.md) - Automate tasks with Bash
- [System Monitoring →](./03-system-monitoring.md) - Advanced monitoring techniques
- [Networking →](./04-networking.md) - Deep dive into Linux networking

---

[← Back to DevOps](../README.md)
