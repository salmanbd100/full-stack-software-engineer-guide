# Linux Fundamentals for DevOps

## Overview

Linux runs most production infrastructure - cloud servers, containers, and CI runners all sit on it. Docker, Kubernetes, and Terraform all build on Linux kernel features and command-line skills. Master these fundamentals first; everything else assumes them.

| Skill area | What you use it for |
|-----------|---------------------|
| **Filesystem & permissions** | Find configs, read logs, secure files |
| **Processes** | Inspect, kill, and prioritize running programs |
| **Disks** | Mount volumes, diagnose "disk full" |
| **Text processing** | Analyze logs with `grep`, `awk`, `sed`, pipes |

> **Key Insight:** The 20% of Linux you use daily is navigation, permissions, processes, disks, and text pipelines. This file covers exactly that.

For deeper topics, see [Networking](./04-networking.md), [Package Management](./05-package-management.md), and [System Services](./06-system-services.md).

---

## Filesystem Hierarchy

### 💡 **The Linux Directory Tree**

Linux follows the Filesystem Hierarchy Standard (FHS), so paths are the same across distros.

**Directory layout:**

```
/           Root of everything
├── bin     Essential binaries (ls, cp, bash)
├── sbin    System admin binaries
├── etc     Configuration files
├── home    User home directories
├── root    Root user's home
├── var     Variable data (logs, cache)
│   └── log Log files
├── tmp     Temp files (cleared on reboot)
├── usr     User programs and data
├── opt     Third-party software
├── proc    Virtual: process info
├── sys     Virtual: kernel/device info
├── dev     Device files
└── mnt     Mount points
```

**The paths DevOps engineers touch most:**

| Directory | What lives there |
|-----------|------------------|
| `/etc` | Configs: `nginx.conf`, `sshd_config`, systemd units |
| `/var/log` | Logs: `syslog`, `auth.log`, app logs - your first stop for debugging |
| `/home` | User files, SSH keys |
| `/opt` | Custom-installed apps |
| `/proc`, `/sys` | Live process and hardware info |

**Log files you check first when troubleshooting:**

```bash
/var/log/syslog          # General logs (Debian/Ubuntu)
/var/log/messages        # General logs (RHEL/CentOS)
/var/log/auth.log        # Auth and SSH activity
/var/log/nginx/          # Web server logs
```

> **Key Insight:** Memorize three: `/etc` (configs), `/var/log` (logs), `/home` (users). You will live in these.

---

## Navigation and File Operations

**Moving around:**

```bash
pwd              # Where am I?
cd /path/to/dir  # Absolute path
cd ~             # Home
cd -             # Previous directory
cd ..            # Up one level
```

**Listing files:**

```bash
ls -lh           # Long format, human-readable sizes
ls -la           # Include hidden files
ls -lt           # Newest first
```

**Creating, copying, moving, deleting:**

```bash
mkdir -p a/b/c   # Create nested dirs in one shot
touch file       # Create empty file or bump timestamp
cp -r src/ dst/  # Copy directory recursively
mv old new       # Rename or move
rm -r dir        # Remove directory
rm -rf dir       # Force remove - no confirmation
```

> ⚠️ **`rm -rf` is irreversible.** There is no trash bin. Double-check the path before you hit Enter.

---

## Viewing and Searching Files

**Reading file content:**

```bash
cat file            # Print whole file (good for piping)
less file           # Scrollable viewer (/ to search, q to quit)
head -n 20 file     # First 20 lines
tail -n 20 file     # Last 20 lines
tail -f file        # Follow in real time - the log-watching command
```

| Command | Best for |
|---------|----------|
| `cat` | Small files, piping into other commands |
| `less` | Large files, searchable browsing |
| `tail -f` | Watching logs live |

**Finding files with `find`:**

```bash
find /var/log -name "*.log"            # By name
find /var/log -type f -mtime -7        # Files modified in last 7 days
find /var/log -size +100M              # Larger than 100MB
find /tmp -type f -atime +7 -delete    # Delete temp files older than 7 days
```

**Searching content with `grep`:**

```bash
grep -i "error" file        # Case-insensitive match
grep -r "error" /var/log/   # Recursive search
grep -v "info" file         # Invert - lines WITHOUT "info"
grep -C 3 "error" file      # 3 lines of context around each match
grep -E "error|warn" file   # Multiple patterns (extended regex)
```

---

## Permissions and Ownership

### 💡 **Reading a Permission String**

Permissions decide who can read, write, or run a file. Every file has them, and misconfigured permissions are a common security bug.

```
-rwxr-xr--
│└┬┘└┬┘└┬┘
│ │  │  └── others: read
│ │  └───── group: read + execute
│ └──────── owner: read + write + execute
└────────── type: - file, d directory, l symlink
```

**Each permission has a number - add them up per group:**

| Symbol | Value | Meaning |
|--------|-------|---------|
| `r` | 4 | Read |
| `w` | 2 | Write |
| `x` | 1 | Execute |

So `rwx` = 7, `rw-` = 6, `r-x` = 5, `r--` = 4.

**Common permission sets:**

| Number | Symbolic | Use case |
|--------|----------|----------|
| **644** | `rw-r--r--` | Regular files, configs |
| **755** | `rwxr-xr-x` | Scripts, executables, directories |
| **700** | `rwx------` | Private directories |
| **600** | `rw-------` | Secrets, SSH private keys |
| **777** | `rwxrwxrwx` | ❌ Never in production - security hole |

**Changing permissions with `chmod`:**

```bash
chmod 755 script.sh       # Numeric - exact, precise
chmod 600 ~/.ssh/id_rsa   # SSH keys require this
chmod +x script.sh        # Symbolic - add execute for all
chmod g-w file            # Remove write from group
chmod -R 755 /var/www/    # Recursive
```

**Changing ownership with `chown`:**

```bash
chown user:group file                     # Set owner and group
chown -R www-data:www-data /var/www/html/ # Recursive
chgrp group file                          # Group only
```

### 💡 **Special Permission Bits**

Three extra bits change how files and directories behave.

| Bit | Numeric | Effect | Example |
|-----|---------|--------|---------|
| **SUID** | 4755 | Runs as the file's owner, not the caller | `passwd` |
| **SGID** | 2755 | New files inherit the directory's group | Shared team dirs |
| **Sticky** | 1777 | Only the file owner can delete it | `/tmp` |

> **Key Insight:** Follow least privilege. Give the minimum permission that works. `chmod 777` almost always means you have the wrong owner or group.

---

## Users and Groups

**Creating and modifying users:**

```bash
useradd -m -s /bin/bash alice   # Create with home dir and shell
passwd alice                    # Set password

usermod -aG docker alice        # Add to group (-a appends, don't forget it)
usermod -aG sudo alice          # Grant sudo
usermod -L alice                # Lock account
```

> ⚠️ Always use `-aG` when adding groups. Plain `-G` **replaces** all supplementary groups and can lock a user out of `sudo` or `docker`.

**Groups and deletion:**

```bash
groupadd developers
userdel -r alice     # Delete user AND their home directory
```

**Inspecting users:**

```bash
whoami               # Current username
id                   # UID, GID, and group membership
groups alice         # Alice's groups
w                    # Who is logged in and what they run
cat /etc/passwd      # All user accounts
```

**Switching users and running as root:**

```bash
su - alice           # Switch to alice, load her environment
sudo command         # Run one command as root
sudo -i              # Start a root shell
```

> ✅ **Best practice:** Use `sudo` for admin tasks instead of logging in as root. It keeps an audit trail.

---

## Process Management

### 💡 **Viewing Processes**

A process is a running program with a PID (process ID) that belongs to a user.

```bash
ps aux                # All processes, detailed
ps aux | grep nginx   # Find a specific process
top                   # Live view (P = sort by CPU, M = memory, q = quit)
htop                  # Friendlier top (usually installed separately)
pgrep -f "python app" # Find PID by command pattern
```

### 💡 **Signals and Killing Processes**

You control processes by sending them signals. The two that matter most:

| Signal | Number | Behavior |
|--------|--------|----------|
| **SIGTERM** | 15 | Graceful shutdown - lets the process clean up |
| **SIGKILL** | 9 | Force kill - immediate, no cleanup |
| **SIGHUP** | 1 | Often means "reload config" |

**Killing processes:**

```bash
kill PID           # SIGTERM (15) - always try this first
kill -9 PID        # SIGKILL (9) - last resort
killall nginx      # Kill all nginx processes by name
pkill -f "python app"  # Kill by command pattern
```

> ⚠️ Try `kill` (SIGTERM) first and give the process a few seconds. Jump to `kill -9` only when it hangs - SIGKILL skips cleanup and can corrupt data or leave stale locks.

### 💡 **Background Jobs and Priority**

```bash
command &                 # Run in the background
nohup command &           # Keep running after you log out
jobs                      # List background jobs
fg %1                     # Bring job 1 to foreground
Ctrl+Z                    # Suspend the current process

nice -n 10 command        # Start with lower priority (-20 high, 19 low)
renice -n 5 -p PID        # Change priority of a running process
```

---

## Disk Management

### 💡 **Checking Disk Space**

The most common production alert is "disk full." These two commands diagnose it.

```bash
df -h                   # Free space per filesystem
df -i                   # Inode usage (files can fail even with free space)
du -sh /var/log         # Total size of a directory
du -h --max-depth=1 /var | sort -hr   # Biggest subdirectories first
```

| Symptom | Check | Likely fix |
|---------|-------|-----------|
| "No space left on device" | `df -h` | Delete or rotate large files |
| No space but `df` shows free | `df -i` | Out of inodes - too many small files |
| `/var/log` huge | `du -sh /var/log/*` | `journalctl --vacuum-time=7d` |

**Listing disks and partitions:**

```bash
lsblk           # Tree of disks and partitions
lsblk -f        # Include filesystem type and UUID
blkid           # UUIDs and filesystem types
```

**Mounting:**

```bash
mount /dev/sdb1 /mnt/data   # Temporary mount
umount /mnt/data            # Unmount
mount -a                    # Mount everything in /etc/fstab
findmnt                     # See what is mounted (tree view)
```

**Persistent mounts live in `/etc/fstab`:**

```ini
# <device>     <mount point> <type> <options>        <dump> <pass>
UUID=abc123    /data         ext4   defaults,nofail  0      2
```

| Option | Why it matters |
|--------|----------------|
| `defaults` | Standard read-write mount |
| `nofail` | Boot continues even if the device is missing - important for AWS EBS |

### 💡 **Mounting an AWS EBS Volume**

A classic real-world task: you attach a new EBS volume and need it mounted and persistent.

**1. Find the new device and check for a filesystem:**

```bash
lsblk               # New volume shows up with no mountpoint, such as xvdf
file -s /dev/xvdf   # "data" means it is blank (no filesystem yet)
```

**2. Format it (new volumes only - this erases data):**

```bash
mkfs -t ext4 /dev/xvdf
```

**3. Mount and make it survive reboots:**

```bash
mkdir /data
mount /dev/xvdf /data

# Use the UUID, not the device name - device names can change on reboot
UUID=$(blkid -s UUID -o value /dev/xvdf)
echo "UUID=$UUID  /data  ext4  defaults,nofail  0  2" >> /etc/fstab
mount -a            # Test fstab; errors here beat a failed boot
```

> **Pro Tip:** Always reference volumes by `UUID` in `/etc/fstab`. Device names like `/dev/xvdf` can shuffle between reboots; UUIDs never do.

---

## Text Processing

### 💡 **The Log-Analysis Toolkit**

Chaining small tools with pipes (`|`) is how you dig through logs fast. Master `grep`, `sed`, `awk`, `sort`, and `uniq`.

**`sed` - stream editor for find and replace:**

```bash
sed 's/old/new/g' file      # Replace all occurrences per line
sed -i 's/old/new/g' file   # Edit the file in place
sed '/^#/d; /^$/d' file     # Strip comments and blank lines
```

**`awk` - column-aware processing:**

```bash
awk '{print $1}' access.log            # First column (the IP address)
awk '{print $NF}' file                 # Last column
awk -F',' '{print $1,$3}' data.csv     # CSV columns 1 and 3
awk '$3 > 100' file                    # Rows where column 3 > 100
awk '{sum+=$1} END {print sum}' file   # Sum a column
```

**`cut`, `sort`, `uniq` - slice and count:**

```bash
cut -d':' -f1 /etc/passwd    # First field, colon-delimited
sort -n file                 # Numeric sort
sort file | uniq -c          # Count occurrences of each unique line
```

### 💡 **Pipes and Redirection**

**Real pipelines you will actually run:**

```bash
# Top 10 largest items in the current directory
du -sh * | sort -hr | head -10

# Count unique IPs hitting a web server
awk '{print $1}' access.log | sort | uniq | wc -l

# Most common errors in a log
grep ERROR app.log | awk '{print $5}' | sort | uniq -c | sort -nr | head

# Failed SSH logins by source
grep "Failed password" /var/log/auth.log | awk '{print $11}' | sort | uniq -c | sort -nr
```

**Redirection:**

```bash
command > file      # Overwrite stdout to file
command >> file     # Append
command 2> file     # Redirect stderr only
command > file 2>&1 # Both stdout and stderr
```

> **Key Insight:** Any log question - "top errors", "unique IPs", "who is hammering us" - is a `grep | awk | sort | uniq -c | sort -nr` pipeline. Learn that shape once.

---

## Archive and Compression

### 💡 **`tar` - Bundle Files Together**

`tar` packs many files into one archive, usually with compression. It is the standard for backups and moving directories between servers.

```bash
tar -czvf backup.tar.gz files/    # Create a gzipped archive
tar -xzvf backup.tar.gz           # Extract it
tar -xzvf backup.tar.gz -C /dst/  # Extract to a specific directory
tar -tzvf backup.tar.gz           # List contents without extracting
```

| Flag | Meaning |
|------|---------|
| `c` / `x` / `t` | Create / eXtract / lisT |
| `v` | Verbose |
| `f` | File (must come last, before the filename) |
| `z` | gzip (`.tar.gz`) |

**Memory aid:** "eXtract Zee File" = `xzf`.

**Standalone compression:**

```bash
gzip file          # Compress to file.gz (removes original)
gzip -k file       # Keep the original too
gunzip file.gz     # Decompress

zip -r out.zip dir/   # Zip a directory (cross-platform friendly)
unzip out.zip -d /dst/
```

| Tool | Compression | Use case |
|------|-------------|----------|
| **gzip** | Good, fast | Default for `.tar.gz` |
| **xz** | Best, slow | When archive size really matters |
| **zip** | Good | Sharing with Windows users |

---

## Interview Questions

### Q1: What are permissions 644, 755, and 600?

Each digit is owner/group/others, summed from read (4), write (2), execute (1).

| Number | Symbolic | Typical use |
|--------|----------|-------------|
| **644** | `rw-r--r--` | Config and data files |
| **755** | `rwxr-xr-x` | Scripts and directories |
| **600** | `rw-------` | Secrets and SSH private keys |

`chmod 777` gives everyone full control and is a security hole - avoid it in production.

### Q2: What is the difference between a hard link and a soft link?

| Feature | Hard link | Soft link (symlink) |
|---------|-----------|---------------------|
| Points to | The inode directly | A file path |
| Survives source deletion | ✅ Yes | ❌ No (breaks) |
| Can link directories | ❌ No | ✅ Yes |
| Can cross filesystems | ❌ No | ✅ Yes |
| Command | `ln src link` | `ln -s src link` |

Use hard links to keep data alive under multiple names; use symlinks as shortcuts or to point across filesystems.

### Q3: What is the difference between `kill` and `kill -9`?

`kill PID` sends SIGTERM (15) - a polite request to shut down that lets the process flush buffers and release locks. `kill -9 PID` sends SIGKILL (9), which the process cannot catch; it dies instantly with no cleanup. Always try `kill` first and reserve `-9` for hung processes, since SIGKILL can corrupt data.

### Q4: How do you find files larger than 100MB modified in the last 7 days?

```bash
find /path -type f -size +100M -mtime -7
```

`-type f` limits to files, `-size +100M` means larger than 100MB, and `-mtime -7` means changed within the last 7 days. Add `-exec ls -lh {} \;` to see sizes, or `-delete` to remove them.

### Q5: What is the difference between `/bin` and `/usr/bin`?

`/bin` holds essential binaries needed to boot and repair the system (`ls`, `cp`, `bash`). `/usr/bin` holds the bulk of user programs that are not required for early boot (`git`, `python`, `vim`). On modern distros `/bin` is usually a symlink to `/usr/bin`, so the historical split matters mostly for older systems and interviews.

---

## Summary

**Filesystem:** FHS gives every distro the same layout. Live in `/etc` (configs), `/var/log` (logs), `/home` (users). Navigate with `cd`, `ls`, `find`.

**Permissions:** `rwx` = 4/2/1 per owner/group/other. `chmod`/`chown` set them. Special bits: SUID, SGID, sticky. Never `chmod 777` in production.

**Processes:** Inspect with `ps aux`, `top`, `htop`. Control with signals - SIGTERM (`kill`) first, SIGKILL (`kill -9`) as a last resort.

**Disks:** `df -h` for space, `du -sh` for directories, `lsblk` for devices. Mount persistently via `/etc/fstab` using UUIDs.

**Text:** Chain `grep | awk | sed | sort | uniq` with pipes for fast log analysis.

> **Everything in Linux is a file** - devices, processes, and hardware all appear under `/dev`, `/proc`, and `/sys`.

> **Permissions are security.** Least privilege beats convenience every time.

> **Prefer SIGTERM over SIGKILL.** Graceful shutdown protects your data.

**Cheat sheet:**

```bash
# Files    ls -lah, cd, cp, mv, rm, find, chmod, chown
# Text     cat, less, tail -f, grep, sed, awk, sort, uniq
# Process  ps aux, top, htop, kill, nice
# Disk     df -h, du -sh, lsblk, mount, blkid
# Archive  tar -czvf, tar -xzvf, gzip, zip
```

---

**Next Steps:**
- [Shell Scripting →](./02-shell-scripting.md) - Automate tasks with Bash
- [System Monitoring →](./03-system-monitoring.md) - Advanced monitoring techniques
- [Networking →](./04-networking.md) - Deep dive into Linux networking

---

[← Back to DevOps](../README.md)
