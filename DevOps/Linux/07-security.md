# Linux Security for DevOps

## Overview

Security is paramount in DevOps. Linux provides robust security mechanisms, and understanding them is critical for protecting infrastructure, applications, and data.

**Why Security Matters:**
- Protect sensitive data and systems
- Prevent unauthorized access
- Comply with security standards (PCI-DSS, HIPAA, SOC 2)
- Detect and respond to threats
- Maintain system integrity
- Enable secure DevOps practices

**Security Layers:**

| Layer | Mechanism | Tools |
|-------|-----------|-------|
| **Access Control** | Users, SSH, sudo | passwd, ssh, visudo |
| **Network** | Firewall, encryption | iptables, ufw, openssl |
| **File System** | Permissions, ACLs | chmod, chown, setfacl |
| **Application** | SELinux, AppArmor | setenforce, aa-status |
| **Auditing** | Logging, monitoring | auditd, fail2ban, aide |

## User and Access Management

### 💡 **User Security**

Proper user management is the foundation of Linux security.

**Security Principles:**
- Principle of least privilege
- Use sudo instead of root
- Strong password policies
- Regular access reviews

### User Management

```bash
# ========================================
# User Creation and Management
# ========================================

# Create user with home directory
sudo useradd -m -s /bin/bash john

# Create user with specific UID
sudo useradd -m -u 1500 john

# Set password
sudo passwd john

# Change user shell
sudo usermod -s /bin/bash john

# Add user to group
sudo usermod -aG sudo john
sudo usermod -aG docker john

# Lock user account
sudo usermod -L john

# Unlock user account
sudo usermod -U john

# Set account expiration
sudo usermod -e 2026-12-31 john

# Delete user (keep home)
sudo userdel john

# Delete user (remove home)
sudo userdel -r john

# ========================================
# Password Security
# ========================================

# Set password expiration
sudo chage -M 90 john                    # Max 90 days
sudo chage -m 7 john                     # Min 7 days between changes
sudo chage -W 14 john                    # Warn 14 days before expiration

# Force password change on next login
sudo chage -d 0 john

# Show password aging info
sudo chage -l john

# Disable password login (key-only)
sudo passwd -l john

# ========================================
# Password Policy
# ========================================

# Install password quality checker
sudo apt install libpam-pwquality        # Ubuntu
sudo yum install pam_pwquality           # CentOS

# Configure password requirements
# /etc/security/pwquality.conf
minlen = 12                             # Minimum length
dcredit = -1                            # Require digit
ucredit = -1                            # Require uppercase
lcredit = -1                            # Require lowercase
ocredit = -1                            # Require special char
difok = 3                               # Characters different from old password
maxrepeat = 3                           # Max repeated characters
```

### sudo Configuration

```bash
# ========================================
# sudo Configuration
# ========================================

# Edit sudoers file (always use visudo!)
sudo visudo

# Grant sudo access
john ALL=(ALL:ALL) ALL

# Allow specific commands only
john ALL=(ALL) /usr/bin/systemctl restart nginx

# No password required
john ALL=(ALL) NOPASSWD: ALL

# No password for specific commands
john ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx

# Allow group
%developers ALL=(ALL:ALL) ALL

# Command aliases
Cmnd_Alias SERVICES = /usr/bin/systemctl restart nginx, /usr/bin/systemctl reload nginx
john ALL=(ALL) SERVICES

# Log sudo commands
Defaults logfile="/var/log/sudo.log"
Defaults log_input, log_output

# Require password every time
Defaults timestamp_timeout=0

# ========================================
# sudo Best Practices
# ========================================

# ✅ Good practices:
# - Use visudo (validates syntax)
# - Grant minimal permissions
# - Use command aliases
# - Enable logging
# - Set timeout

# ❌ Bad practices:
# - NOPASSWD: ALL (too permissive)
# - Editing /etc/sudoers directly
# - Allowing dangerous commands (rm, dd)
# - Not logging sudo usage
```

## SSH Security

### 💡 **SSH Hardening**

SSH is the primary remote access method—securing it is critical.

### SSH Configuration

```bash
# ========================================
# SSH Server Configuration
# ========================================

# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:

# Change default port (security through obscurity)
Port 2222

# Disable root login
PermitRootLogin no

# Disable password authentication (key-only)
PasswordAuthentication no
ChallengeResponseAuthentication no

# Enable public key authentication
PubkeyAuthentication yes

# Disable empty passwords
PermitEmptyPasswords no

# Limit users
AllowUsers john jane
AllowGroups ssh-users

# Disable X11 forwarding (if not needed)
X11Forwarding no

# Limit authentication attempts
MaxAuthTries 3

# Login grace time
LoginGraceTime 30s

# Client alive interval (prevent idle disconnect)
ClientAliveInterval 300
ClientAliveCountMax 2

# Use strong ciphers only
Ciphers aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512,hmac-sha2-256
KexAlgorithms curve25519-sha256,diffie-hellman-group18-sha512

# Restart SSH
sudo systemctl restart sshd

# ========================================
# SSH Key Management
# ========================================

# Generate SSH key pair
ssh-keygen -t ed25519 -C "your_email@example.com"
# Or RSA 4096
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to server
ssh-copy-id user@server

# Manual copy
cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Set proper permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# ========================================
# SSH Agent
# ========================================

# Start SSH agent
eval "$(ssh-agent -s)"

# Add key to agent
ssh-add ~/.ssh/id_ed25519

# List loaded keys
ssh-add -l

# Remove all keys
ssh-add -D

# ========================================
# SSH Config File
# ========================================

# ~/.ssh/config
cat > ~/.ssh/config << 'EOF'
Host production
    HostName prod.example.com
    User deployer
    Port 2222
    IdentityFile ~/.ssh/prod_key
    ForwardAgent no
    StrictHostKeyChecking yes

Host *.example.com
    User admin
    IdentityFile ~/.ssh/work_key
    ServerAliveInterval 60

Host *
    ServerAliveInterval 120
    Compression yes
EOF

chmod 600 ~/.ssh/config
```

### fail2ban - Brute Force Protection

```bash
# ========================================
# Install and Configure fail2ban
# ========================================

# Install fail2ban
sudo apt install fail2ban              # Ubuntu
sudo yum install fail2ban              # CentOS

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local

[DEFAULT]
# Ban for 1 hour
bantime = 3600

# Check for failures in 10 minutes
findtime = 600

# Allow 3 attempts
maxretry = 3

# Email notifications
destemail = admin@example.com
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status

# Check SSH jail
sudo fail2ban-client status sshd

# Unban IP
sudo fail2ban-client set sshd unbanip 192.168.1.100

# View banned IPs
sudo iptables -L -n | grep "DROP"
```

## Firewall Configuration

### UFW (Uncomplicated Firewall)

```bash
# ========================================
# Basic UFW Setup
# ========================================

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (before enabling!)
sudo ufw allow 22/tcp
# Or custom port
sudo ufw allow 2222/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow from specific IP
sudo ufw allow from 192.168.1.100

# Allow from specific IP to specific port
sudo ufw allow from 192.168.1.100 to any port 22

# Allow subnet
sudo ufw allow from 192.168.1.0/24

# Enable UFW
sudo ufw enable

# Check status
sudo ufw status verbose

# ========================================
# Advanced UFW Rules
# ========================================

# Limit connections (rate limiting)
sudo ufw limit 22/tcp

# Delete rule
sudo ufw delete allow 80/tcp
sudo ufw delete 1                      # By number

# Deny specific IP
sudo ufw deny from 192.168.1.100

# Application profiles
sudo ufw app list
sudo ufw allow 'Nginx Full'
sudo ufw allow 'OpenSSH'

# Logging
sudo ufw logging on
sudo ufw logging medium                # low, medium, high, full

# Reset firewall
sudo ufw reset
```

### iptables - Advanced Firewall

```bash
# ========================================
# Basic iptables Rules
# ========================================

# Save current rules
sudo iptables-save > /tmp/iptables-backup

# Clear all rules
sudo iptables -F
sudo iptables -X
sudo iptables -t nat -F
sudo iptables -t nat -X

# Default policies
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Rate limit SSH connections
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

# Allow ping (ICMP)
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# Log dropped packets
sudo iptables -A INPUT -j LOG --log-prefix "IPTables-Dropped: " --log-level 4

# Save rules
sudo iptables-save > /etc/iptables/rules.v4

# Restore rules on boot
sudo apt install iptables-persistent
```

## File System Security

### File Permissions

```bash
# ========================================
# Secure File Permissions
# ========================================

# Important file permissions:
chmod 600 /etc/ssh/sshd_config         # SSH config
chmod 644 /etc/passwd                  # User database
chmod 640 /etc/shadow                  # Password hashes
chmod 755 /usr/bin/*                   # Binaries
chmod 700 ~/.ssh                       # SSH directory
chmod 600 ~/.ssh/authorized_keys       # SSH keys

# Find world-writable files (security risk!)
find / -type f -perm -002 -ls 2>/dev/null

# Find files with SUID bit (potential security risk)
find / -type f -perm -4000 -ls 2>/dev/null

# Find files with SGID bit
find / -type f -perm -2000 -ls 2>/dev/null

# Remove SUID/SGID if not needed
sudo chmod u-s /path/to/file
sudo chmod g-s /path/to/file

# ========================================
# Access Control Lists (ACLs)
# ========================================

# Install ACL tools
sudo apt install acl

# View ACLs
getfacl /path/to/file

# Grant user read/write access
setfacl -m u:john:rw /path/to/file

# Grant group access
setfacl -m g:developers:rx /path/to/directory

# Remove ACL
setfacl -x u:john /path/to/file

# Set default ACL for directory
setfacl -d -m u:john:rw /path/to/directory

# Copy ACLs
getfacl file1 | setfacl --set-file=- file2

# Remove all ACLs
setfacl -b /path/to/file
```

### File Integrity Monitoring

```bash
# ========================================
# AIDE (Advanced Intrusion Detection Environment)
# ========================================

# Install AIDE
sudo apt install aide                  # Ubuntu
sudo yum install aide                  # CentOS

# Initialize AIDE database
sudo aideinit
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Run check
sudo aide --check

# Update database after legitimate changes
sudo aide --update
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Configure AIDE
# /etc/aide/aide.conf
# Monitor specific directories
/etc p+i+n+u+g+s+b+m+c+md5+sha256
/bin p+i+n+u+g+s+b+m+c+md5+sha256
/sbin p+i+n+u+g+s+b+m+c+md5+sha256
/usr/bin p+i+n+u+g+s+b+m+c+md5+sha256

# Exclude directories
!/tmp
!/var/log

# Automate checks
cat > /etc/cron.daily/aide << 'EOF'
#!/bin/bash
/usr/bin/aide --check | mail -s "AIDE Report" admin@example.com
EOF

chmod +x /etc/cron.daily/aide
```

## SELinux and AppArmor

### SELinux (Security-Enhanced Linux)

```bash
# ========================================
# SELinux Basics
# ========================================

# Check SELinux status
sestatus
getenforce

# SELinux modes:
# Enforcing - Enforces SELinux policy
# Permissive - Logs violations, doesn't enforce
# Disabled - SELinux is off

# Set mode temporarily
sudo setenforce 0                      # Permissive
sudo setenforce 1                      # Enforcing

# Set mode permanently
# /etc/selinux/config
SELINUX=enforcing
SELINUXTYPE=targeted

# View contexts
ls -Z /var/www/html
ps auxZ | grep httpd

# Change file context
sudo chcon -t httpd_sys_content_t /var/www/html/index.html

# Restore default context
sudo restorecon -v /var/www/html/index.html

# Make context change permanent
sudo semanage fcontext -a -t httpd_sys_content_t "/var/www/html/custom(/.*)?"
sudo restorecon -Rv /var/www/html/custom

# Check for SELinux denials
sudo ausearch -m avc -ts recent
sudo grep "denied" /var/log/audit/audit.log

# Generate policy module from denials
sudo audit2allow -a -M mypolicy
sudo semodule -i mypolicy.pp

# List SELinux booleans
getsebool -a | grep httpd

# Set boolean
sudo setsebool -P httpd_can_network_connect on
```

### AppArmor

```bash
# ========================================
# AppArmor Basics
# ========================================

# Check AppArmor status
sudo aa-status

# List profiles
sudo aa-status | grep profiles

# Modes:
# enforce - Enforce profile rules
# complain - Log violations, don't enforce

# Set profile to complain mode
sudo aa-complain /usr/sbin/nginx

# Set profile to enforce mode
sudo aa-enforce /usr/sbin/nginx

# Disable profile
sudo aa-disable /usr/sbin/nginx

# Create profile
sudo aa-genprof /usr/sbin/myapp

# Update profile
sudo aa-logprof

# View profile
cat /etc/apparmor.d/usr.sbin.nginx

# Reload profiles
sudo systemctl reload apparmor
```

## Security Auditing

### System Auditing (auditd)

```bash
# ========================================
# auditd - Linux Audit Daemon
# ========================================

# Install auditd
sudo apt install auditd                # Ubuntu
sudo yum install audit                 # CentOS

# Start auditd
sudo systemctl enable auditd
sudo systemctl start auditd

# Audit rules
# /etc/audit/rules.d/audit.rules

# Monitor file access
-w /etc/passwd -p wa -k passwd_changes
-w /etc/shadow -p wa -k shadow_changes
-w /etc/sudoers -p wa -k sudoers_changes

# Monitor syscalls
-a always,exit -F arch=b64 -S execve -k exec_tracking

# Monitor network connections
-a always,exit -F arch=b64 -S connect -k network_connections

# Load rules
sudo augenrules --load

# Search audit logs
sudo ausearch -k passwd_changes
sudo ausearch -ua john
sudo ausearch -ts today

# Generate report
sudo aureport
sudo aureport --failed
sudo aureport --authentication

# View raw logs
sudo ausearch -i | less
```

### Vulnerability Scanning

```bash
# ========================================
# Lynis - Security Auditing Tool
# ========================================

# Install Lynis
sudo apt install lynis                 # Ubuntu

# Run audit
sudo lynis audit system

# Save report
sudo lynis audit system --report-file /tmp/lynis-report.txt

# Specific tests
sudo lynis show groups
sudo lynis show tests

# Common findings:
# - Disable USB storage
# - Harden kernel parameters
# - Install security updates
# - Configure NTP
# - Implement password policy

# ========================================
# OpenVAS - Vulnerability Scanner
# ========================================

# Install OpenVAS
sudo apt install openvas

# Setup OpenVAS
sudo gvm-setup

# Access web interface
# https://localhost:9392

# ========================================
# Check for Rootkits
# ========================================

# Install rkhunter
sudo apt install rkhunter

# Update database
sudo rkhunter --update

# Run check
sudo rkhunter --check

# Install chkrootkit
sudo apt install chkrootkit

# Run check
sudo chkrootkit
```

## Security Best Practices

### System Hardening Checklist

```bash
# ========================================
# Essential Security Measures
# ========================================

# 1. Keep system updated
sudo apt update && sudo apt upgrade -y

# 2. Disable root login
sudo passwd -l root

# 3. Configure SSH securely
# - Disable root login
# - Use key authentication
# - Change default port
# - Limit users

# 4. Configure firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw allow 22/tcp

# 5. Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban

# 6. Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# 7. Disable unnecessary services
systemctl list-units --type=service
sudo systemctl disable unused-service

# 8. Set password policies
# Configure /etc/security/pwquality.conf

# 9. Monitor logs
sudo journalctl -f

# 10. Regular backups
# Implement automated backup solution

# 11. File integrity monitoring
sudo apt install aide
sudo aideinit

# 12. Security auditing
sudo apt install lynis
sudo lynis audit system
```

### Kernel Security Parameters

```bash
# ========================================
# Kernel Security (sysctl)
# ========================================

# /etc/sysctl.d/99-security.conf
cat > /etc/sysctl.d/99-security.conf << 'EOF'
# IP forwarding (disable unless router)
net.ipv4.ip_forward = 0

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore source-routed packets
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Log Martians (packets with impossible addresses)
net.ipv4.conf.all.log_martians = 1

# Ignore ICMP pings
net.ipv4.icmp_echo_ignore_all = 0

# Enable SYN cookies (DDoS protection)
net.ipv4.tcp_syncookies = 1

# Increase TCP backlog
net.ipv4.tcp_max_syn_backlog = 2048

# Disable IPv6 (if not used)
net.ipv6.conf.all.disable_ipv6 = 1

# Randomize memory addresses (ASLR)
kernel.randomize_va_space = 2

# Restrict dmesg to root
kernel.dmesg_restrict = 1

# Restrict kernel pointers in /proc
kernel.kptr_restrict = 2
EOF

# Apply settings
sudo sysctl -p /etc/sysctl.d/99-security.conf
```

## Interview Questions

**Q1: What's the principle of least privilege?**
A: Users and processes should have only the minimum permissions required to perform their tasks. Reduces attack surface and limits damage from compromised accounts.

**Q2: How do you secure SSH?**
A:
1. Disable root login
2. Use key-based authentication
3. Change default port
4. Limit users (AllowUsers)
5. Use fail2ban
6. Strong ciphers only
7. Disable password authentication

**Q3: What's the difference between chmod 644 and 755?**
A:
- 644: rw-r--r-- (owner read/write, others read)
- 755: rwxr-xr-x (owner all, others read/execute)
Use 644 for files, 755 for directories/executables.

**Q4: How do you find and remove SUID files?**
A:
```bash
find / -type f -perm -4000 -ls 2>/dev/null
sudo chmod u-s /path/to/file
```
SUID files run with owner's privileges—potential security risk if unnecessary.

**Q5: What's the difference between SELinux and AppArmor?**
A: Both are Mandatory Access Control (MAC) systems. SELinux uses labels and is more complex but powerful. AppArmor uses path-based rules and is simpler. SELinux on RHEL/CentOS, AppArmor on Ubuntu/Debian.

**Q6: How do you automate security updates?**
A:
```bash
# Ubuntu
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# CentOS
sudo yum install yum-cron
# Configure /etc/yum/yum-cron.conf
```

## Summary

**Linux Security Essentials:**

1. **Access Control:**
   - ✅ Strong passwords + key-based SSH
   - ✅ Principle of least privilege
   - ✅ sudo instead of root
   - ✅ Regular access reviews

2. **Network Security:**
   - ✅ Firewall (UFW/iptables) configured
   - ✅ fail2ban for brute force protection
   - ✅ SSH hardened (keys, non-default port)
   - ✅ Unnecessary ports closed

3. **File System:**
   - ✅ Proper permissions (644 files, 755 dirs)
   - ✅ No world-writable files
   - ✅ Monitor SUID/SGID files
   - ✅ File integrity monitoring (AIDE)

4. **Mandatory Access Control:**
   - ✅ SELinux (RHEL/CentOS) or AppArmor (Ubuntu)
   - ✅ Configure, don't disable
   - ✅ Review audit logs
   - ✅ Create custom policies as needed

5. **Monitoring & Auditing:**
   - ✅ auditd for system auditing
   - ✅ Regular security scans (Lynis)
   - ✅ Log monitoring
   - ✅ Vulnerability assessments

**Key Insights:**
> - Security is layered—no single solution
> - Automate security updates
> - Monitor logs and audit trails
> - Regular security assessments
> - Disable what you don't need

---
[← Back: System Services](./06-system-services.md) | [Next: Troubleshooting →](./08-troubleshooting.md)
