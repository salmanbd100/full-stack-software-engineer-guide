# Linux Fundamentals for DevOps

## Overview

Linux is the backbone of modern DevOps. Understanding Linux fundamentals is essential for managing servers, containers, and cloud infrastructure. This guide covers essential Linux concepts for DevOps engineers.

**Why Linux for DevOps:**
- 90%+ of servers run Linux
- Docker and Kubernetes are built on Linux
- Cloud infrastructure (AWS, Azure, GCP) heavily uses Linux
- Most DevOps tools are Linux-first
- Open source and highly customizable

**Core Skills Comparison:**

| Skill | Beginner | Intermediate | Advanced |
|-------|----------|--------------|----------|
| **File System** | Basic navigation (cd, ls, pwd) | Permissions, links, finding files | LVM, disk quotas, filesystem tuning |
| **Processes** | View processes (ps, top) | Kill/manage processes | Process priorities, cgroups |
| **Networking** | Check connectivity (ping, curl) | Configure network, firewall | Advanced routing, tunneling |
| **Package Mgmt** | Install packages (apt, yum) | Manage repos, dependencies | Build packages, custom repos |
| **Text Processing** | Read files (cat, less) | grep, sed, awk | Complex text pipelines |

## File System Hierarchy

### Standard Linux Directory Structure

```
/                    Root directory
├── /bin            Essential user binaries (ls, cat, cp)
├── /sbin           System binaries (admin commands)
├── /etc            Configuration files
├── /home           User home directories
├── /root           Root user home
├── /var            Variable files (logs, cache)
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

### Important Directories for DevOps

```bash
# System logs
/var/log/syslog         # System logs
/var/log/auth.log       # Authentication logs
/var/log/nginx/         # Nginx logs
/var/log/apache2/       # Apache logs

# Application configurations
/etc/nginx/nginx.conf   # Nginx config
/etc/ssh/sshd_config   # SSH daemon config
/etc/systemd/system/   # Systemd service files

# Application data
/var/www/html/         # Web root
/opt/applications/     # Custom applications
```

## Essential Linux Commands

### File Operations

```bash
# Navigation
pwd                    # Print working directory
cd /path/to/dir       # Change directory
cd ~                  # Go to home directory
cd -                  # Go to previous directory

# Listing files
ls                    # List files
ls -la                # List all files with details
ls -lh                # Human-readable sizes
ls -lt                # Sort by modification time
ls -lS                # Sort by size

# File manipulation
cp file1 file2        # Copy file
cp -r dir1 dir2       # Copy directory recursively
mv file1 file2        # Move/rename file
rm file               # Remove file
rm -rf dir            # Remove directory recursively (dangerous!)
mkdir -p dir/subdir   # Create directory with parents

# File viewing
cat file              # Display entire file
less file             # Page through file
head -n 10 file       # First 10 lines
tail -n 10 file       # Last 10 lines
tail -f file          # Follow file (real-time)

# File searching
find /path -name "*.log"                    # Find files by name
find /var/log -type f -mtime -7             # Files modified in last 7 days
find /var/log -type f -size +100M           # Files larger than 100MB
grep "error" /var/log/syslog                # Search in file
grep -r "error" /var/log/                   # Recursive search
grep -i "error" file                        # Case-insensitive search
grep -v "info" file                         # Invert match (exclude)
grep -A 5 "error" file                      # Show 5 lines after match
grep -B 5 "error" file                      # Show 5 lines before match

# File content manipulation
sed 's/old/new/g' file                      # Replace text (output to stdout)
sed -i 's/old/new/g' file                   # Replace text in-place
awk '{print $1, $3}' file                   # Print columns 1 and 3
cut -d',' -f1,3 file.csv                    # Extract CSV columns
sort file                                   # Sort lines
sort -r file                                # Reverse sort
uniq file                                   # Remove duplicate lines
wc -l file                                  # Count lines
```

### File Permissions

```bash
# Understanding permissions: rwxrwxrwx (owner group others)
# r=4, w=2, x=1

# View permissions
ls -l file
# -rwxr-xr-- 1 user group 1024 Jan 01 12:00 file
# - = file type (-, d, l)
# rwx = owner permissions (read, write, execute)
# r-x = group permissions (read, execute)
# r-- = other permissions (read only)

# Change permissions
chmod 755 file          # rwxr-xr-x
chmod 644 file          # rw-r--r--
chmod +x script.sh      # Add execute permission
chmod -w file           # Remove write permission
chmod u+x file          # Add execute for user
chmod g-w file          # Remove write for group
chmod o=r file          # Set read-only for others

# Change ownership
chown user:group file   # Change owner and group
chown -R user:group dir # Recursive ownership change
chgrp group file        # Change group only

# Special permissions
chmod 4755 file         # SUID (runs as owner)
chmod 2755 dir          # SGID (files inherit group)
chmod 1777 dir          # Sticky bit (only owner can delete)
```

### Users and Groups

```bash
# User management
useradd username                    # Create user
useradd -m -s /bin/bash username   # Create with home dir and shell
usermod -aG docker username        # Add user to group
userdel username                   # Delete user
userdel -r username                # Delete user and home dir
passwd username                    # Change user password

# Group management
groupadd groupname                 # Create group
groupdel groupname                 # Delete group
groups username                    # List user's groups

# View users
whoami                             # Current user
id                                 # User ID and groups
w                                  # Who is logged in
last                               # Login history
cat /etc/passwd                    # All users
cat /etc/group                     # All groups

# Switch users
su - username                      # Switch user
sudo command                       # Run as root
sudo -u username command           # Run as specific user
sudo -i                            # Root shell
```

## Process Management

### Process Operations

```bash
# View processes
ps                      # Current shell processes
ps aux                  # All processes
ps aux | grep nginx     # Find nginx processes
ps -ef                  # Full format listing
pstree                  # Process tree

# Process details
top                     # Interactive process viewer
htop                    # Better interactive viewer
pidof nginx             # Get PID of process
pgrep -f "python app"   # Find process by name

# Process control
kill PID                # Terminate process (SIGTERM)
kill -9 PID             # Force kill (SIGKILL)
killall nginx           # Kill all nginx processes
pkill -f "python app"   # Kill by name pattern

# Background processes
command &               # Run in background
nohup command &         # Run immune to hangups
jobs                    # List background jobs
fg %1                   # Bring job 1 to foreground
bg %1                   # Resume job 1 in background
disown %1               # Remove job from shell

# Process priority
nice -n 10 command      # Start with priority 10
renice -n 5 -p PID      # Change priority of running process
```

### Systemd Service Management

```bash
# Service control
systemctl start nginx           # Start service
systemctl stop nginx            # Stop service
systemctl restart nginx         # Restart service
systemctl reload nginx          # Reload configuration
systemctl status nginx          # Check status
systemctl enable nginx          # Enable at boot
systemctl disable nginx         # Disable at boot

# Service information
systemctl list-units --type=service     # List all services
systemctl list-unit-files               # List installed services
systemctl is-active nginx               # Check if active
systemctl is-enabled nginx              # Check if enabled

# View logs
journalctl -u nginx                     # View service logs
journalctl -u nginx -f                  # Follow logs
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx -n 100              # Last 100 lines

# Create custom service
# /etc/systemd/system/myapp.service
cat > /etc/systemd/system/myapp.service << 'EOF'
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/start.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload                 # Reload systemd
systemctl start myapp                   # Start service
```

## Networking Basics

### Network Commands

```bash
# Network interfaces
ip addr show                    # Show IP addresses
ip link show                    # Show network interfaces
ifconfig                        # Legacy network config

# Network connectivity
ping google.com                 # Test connectivity
ping -c 4 8.8.8.8              # Ping 4 times
traceroute google.com           # Trace route
mtr google.com                  # Better traceroute

# DNS
nslookup google.com             # DNS lookup
dig google.com                  # Detailed DNS query
host google.com                 # Simple DNS lookup
cat /etc/resolv.conf            # DNS configuration

# Network connections
netstat -tuln                   # Listening ports
netstat -tupn                   # All connections
ss -tuln                        # Modern netstat
ss -tunlp                       # With process names
lsof -i :80                     # What's using port 80
lsof -i TCP                     # All TCP connections

# Network testing
telnet host 80                  # Test TCP connection
nc -zv host 80                  # Test port connectivity
curl -I https://example.com     # HTTP headers
wget https://example.com        # Download file
curl -X POST -d "data" url      # POST request

# Firewall
ufw status                      # UFW firewall status
ufw allow 80/tcp                # Allow port 80
ufw deny 22/tcp                 # Deny port 22
ufw enable                      # Enable firewall

iptables -L                     # List rules
iptables -A INPUT -p tcp --dport 80 -j ACCEPT  # Allow port 80
```

### Network Configuration Files

```bash
# DNS
/etc/resolv.conf                # DNS servers
/etc/hosts                      # Static hostname mapping

# Network interfaces (Ubuntu/Debian)
/etc/netplan/*.yaml             # Netplan configuration

# Network interfaces (CentOS/RHEL)
/etc/sysconfig/network-scripts/ # Network scripts
```

## Package Management

### APT (Debian/Ubuntu)

```bash
# Update package lists
apt update                      # Update package index
apt upgrade                     # Upgrade all packages
apt full-upgrade                # Upgrade with dependency resolution

# Package operations
apt install package             # Install package
apt install package1 package2   # Install multiple
apt remove package              # Remove package
apt purge package               # Remove with configs
apt autoremove                  # Remove unused dependencies

# Package information
apt search keyword              # Search packages
apt show package                # Show package details
apt list --installed            # List installed packages
apt list --upgradable           # List upgradable packages

# Cache management
apt clean                       # Clear cache
apt autoclean                   # Clear old cache
```

### YUM/DNF (CentOS/RHEL/Fedora)

```bash
# Update packages
yum update                      # Update all packages (RHEL 7)
dnf update                      # Update all packages (RHEL 8+)

# Package operations
yum install package             # Install package
yum remove package              # Remove package
yum autoremove                  # Remove unused dependencies

# Package information
yum search keyword              # Search packages
yum info package                # Package details
yum list installed              # List installed packages

# Repository management
yum repolist                    # List repositories
yum-config-manager --add-repo URL  # Add repository
```

## Disk Management

### Disk Operations

```bash
# Disk usage
df -h                           # Disk space usage
df -i                           # Inode usage
du -sh /var/log                 # Directory size
du -h --max-depth=1 /var        # Subdirectory sizes
du -sh * | sort -hr             # Largest directories

# Disk information
lsblk                           # List block devices
fdisk -l                        # List disks and partitions
blkid                           # Block device attributes

# Partition management
fdisk /dev/sdb                  # Partition disk
parted /dev/sdb                 # Advanced partitioning

# Filesystem operations
mkfs.ext4 /dev/sdb1             # Create ext4 filesystem
mkfs.xfs /dev/sdb1              # Create XFS filesystem

# Mount operations
mount /dev/sdb1 /mnt/data       # Mount filesystem
umount /mnt/data                # Unmount
mount -a                        # Mount all from /etc/fstab

# /etc/fstab - Persistent mounts
cat >> /etc/fstab << EOF
/dev/sdb1  /mnt/data  ext4  defaults  0  2
UUID=xxx   /mnt/data  ext4  defaults  0  2
EOF

# Check filesystem
fsck /dev/sdb1                  # Check and repair
e2fsck -f /dev/sdb1             # Force check ext filesystems
```

### AWS EBS Volume Operations

```bash
# List block devices
lsblk

# Check if volume has filesystem
file -s /dev/xvdf

# Create filesystem (if new volume)
mkfs -t ext4 /dev/xvdf

# Mount volume
mkdir /data
mount /dev/xvdf /data

# Persistent mount
echo "/dev/xvdf  /data  ext4  defaults,nofail  0  2" >> /etc/fstab

# Verify mount
df -h /data
```

## Text Processing

### Common Text Operations

```bash
# View file content
cat file.txt                    # Display file
tac file.txt                    # Display reverse
less file.txt                   # Page through
head -n 20 file.txt             # First 20 lines
tail -n 20 file.txt             # Last 20 lines
tail -f /var/log/syslog         # Follow log file

# Search and replace
sed 's/old/new/' file           # Replace first occurrence
sed 's/old/new/g' file          # Replace all occurrences
sed -i 's/old/new/g' file       # In-place replacement
sed -n '10,20p' file            # Print lines 10-20

# Column extraction
awk '{print $1}' file           # Print first column
awk -F',' '{print $1,$3}' file  # CSV columns 1 and 3
awk '$3 > 100' file             # Filter rows
cut -d',' -f1,3 file            # Cut columns 1 and 3

# Sorting and unique
sort file                       # Sort lines
sort -n file                    # Numeric sort
sort -k2 file                   # Sort by column 2
sort -r file                    # Reverse sort
uniq file                       # Remove duplicates
sort file | uniq -c             # Count occurrences

# Combining commands
grep "error" /var/log/syslog | awk '{print $5}' | sort | uniq -c
```

## Archive and Compression

### Tar Archives

```bash
# Create archives
tar -cvf archive.tar files/     # Create tar archive
tar -czvf archive.tar.gz files/ # Create compressed (gzip)
tar -cjvf archive.tar.bz2 files/ # Create compressed (bzip2)

# Extract archives
tar -xvf archive.tar            # Extract tar
tar -xzvf archive.tar.gz        # Extract gzip
tar -xjvf archive.tar.bz2       # Extract bzip2
tar -xvf archive.tar -C /dest   # Extract to directory

# View archive contents
tar -tvf archive.tar            # List contents
tar -tzvf archive.tar.gz        # List gzip archive

# Flags explained:
# c = create
# x = extract
# v = verbose
# f = file
# z = gzip
# j = bzip2
# t = list
```

### Compression Tools

```bash
# gzip
gzip file                       # Compress file
gzip -d file.gz                 # Decompress
gunzip file.gz                  # Decompress
gzip -k file                    # Keep original

# zip/unzip
zip archive.zip files           # Create zip
zip -r archive.zip directory/   # Recursive zip
unzip archive.zip               # Extract
unzip -l archive.zip            # List contents
```

## Interview Questions

**Q1: What is the difference between /bin and /usr/bin?**
A: `/bin` contains essential binaries needed for system boot and repair (like `ls`, `cp`, `mv`), while `/usr/bin` contains user programs and utilities. Modern Linux systems often symlink `/bin` to `/usr/bin`.

**Q2: How do you find files larger than 100MB modified in the last 7 days?**
```bash
find /path -type f -size +100M -mtime -7
```

**Q3: What's the difference between `kill` and `kill -9`?**
A: `kill` (SIGTERM) gracefully terminates a process, allowing cleanup. `kill -9` (SIGKILL) forcefully terminates immediately without cleanup. Always try `kill` first.

**Q4: How do you check disk I/O usage?**
```bash
iostat -x 1        # Extended I/O statistics every 1 second
iotop              # Top-like I/O monitor
```

**Q5: How do you find which process is using a specific port?**
```bash
lsof -i :80
# or
ss -tulpn | grep :80
# or
netstat -tulpn | grep :80
```

**Q6: What are the permission numbers 644, 755, and 777?**
```
644 = rw-r--r-- (owner: read+write, group: read, others: read)
755 = rwxr-xr-x (owner: all, group: read+execute, others: read+execute)
777 = rwxrwxrwx (all permissions for everyone - generally bad practice)
```

**Q7: How do you check system resource usage?**
```bash
# CPU and Memory
top
htop

# Memory details
free -h
cat /proc/meminfo

# CPU details
lscpu
cat /proc/cpuinfo

# Load average
uptime
w

# Disk I/O
iostat

# All together
vmstat 1        # Virtual memory statistics every 1 second
```

**Q8: How do you monitor a log file in real-time?**
```bash
tail -f /var/log/syslog
# or with filtering
tail -f /var/log/syslog | grep "error"
```

## Best Practices

### Security

✅ **Do:**
- Use SSH keys instead of passwords
- Disable root SSH login
- Keep systems updated: `apt update && apt upgrade`
- Use `sudo` instead of root user
- Set proper file permissions
- Enable firewall (UFW or iptables)
- Use fail2ban for SSH protection

❌ **Don't:**
- Use `chmod 777` unless absolutely necessary
- Run services as root
- Store passwords in plain text
- Leave default ports open
- Ignore security updates

### Performance

```bash
# Monitor system performance
# CPU
top -bn1 | head -20
mpstat 1

# Memory
free -h
vmstat 1

# Disk
iostat -x 1
iotop

# Network
iftop
nethogs
```

### System Maintenance

```bash
# Regular tasks
apt update && apt upgrade           # Update packages
apt autoremove                      # Remove unused packages
journalctl --vacuum-time=7d         # Clean old logs
find /tmp -type f -atime +7 -delete # Clean temp files

# Check system health
systemctl --failed                  # Failed services
df -h                               # Disk space
free -h                             # Memory usage
uptime                              # System load
```

## Summary

**Core Concepts:**

1. **File System:**
   - ✅ Hierarchy: `/` (root), `/etc` (config), `/var/log` (logs)
   - ✅ Navigation: `cd`, `ls`, `pwd`, `find`
   - ✅ Permissions: `chmod`, `chown`, user/group/other (rwx)
   - ✅ Links: Hard links vs symbolic links

2. **Processes:**
   - ✅ View: `ps aux`, `top`, `htop`
   - ✅ Manage: `kill`, `systemctl`, `service`
   - ✅ Background: `&`, `nohup`, `screen`, `tmux`
   - ✅ Signals: SIGTERM (15), SIGKILL (9)

3. **Networking:**
   - ✅ Connectivity: `ping`, `curl`, `wget`, `nc`
   - ✅ Debug: `netstat`, `ss`, `tcpdump`, `traceroute`
   - ✅ Configure: `ip`, `ifconfig`, `route`
   - ✅ DNS: `/etc/hosts`, `/etc/resolv.conf`

4. **Package Management:**
   - **Debian/Ubuntu**: `apt`, `dpkg`
   - **RHEL/CentOS**: `yum`, `dnf`, `rpm`
   - ✅ Update: `apt update && apt upgrade`
   - ✅ Search: `apt search`, `yum search`

5. **Text Processing:**
   - ✅ View: `cat`, `less`, `head`, `tail`
   - ✅ Search: `grep`, `egrep`, `ag`
   - ✅ Transform: `sed`, `awk`, `cut`, `tr`
   - ✅ Combine: Pipes (`|`), redirects (`>`, `>>`)

6. **Disk Management:**
   - ✅ Check: `df -h`, `du -sh`
   - ✅ Mount: `mount`, `/etc/fstab`
   - ✅ Partitions: `fdisk`, `lsblk`
   - ✅ LVM: Logical Volume Management

**Key Insights:**
> - Everything in Linux is a file (devices, processes, sockets)
> - Permissions are critical for security (principle of least privilege)
> - Understanding processes is essential for troubleshooting
> - Text processing skills = log analysis superpowers
> - Master these basics before Docker, Kubernetes, and Terraform

---
[← Back to DevOps](../README.md) | [Next: Shell Scripting →](./02-shell-scripting.md)
