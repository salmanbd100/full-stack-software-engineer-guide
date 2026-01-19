# Package Management for DevOps

## Overview

Package management is essential for installing, updating, and maintaining software on Linux systems. Understanding different package managers and their ecosystems is critical for DevOps automation and infrastructure management.

**Why Package Management Matters:**
- Install and update software consistently
- Manage dependencies automatically
- Ensure security patches are applied
- Automate infrastructure provisioning
- Maintain reproducible environments
- Troubleshoot package conflicts

**Package Manager Comparison:**

| Distribution | Package Manager | Package Format | Repository |
|--------------|----------------|----------------|------------|
| **Ubuntu/Debian** | APT | .deb | Ubuntu/Debian repos |
| **CentOS/RHEL 7** | YUM | .rpm | CentOS/EPEL repos |
| **CentOS/RHEL 8+** | DNF | .rpm | CentOS/EPEL repos |
| **Fedora** | DNF | .rpm | Fedora repos |
| **Arch Linux** | Pacman | .pkg.tar.xz | Arch repos |
| **Alpine** | APK | .apk | Alpine repos |

## APT (Advanced Package Tool) - Debian/Ubuntu

### 💡 **APT Overview**

APT is the high-level package manager for Debian-based systems. It handles dependencies, downloads, and configuration automatically.

**Key Concepts:**
- **Packages**: Software bundles (.deb files)
- **Repositories**: Software sources (/etc/apt/sources.list)
- **Cache**: Local package database
- **Dependencies**: Required packages

### Basic APT Commands

```bash
# ========================================
# Package Installation and Removal
# ========================================

# Update package lists (always do this first!)
sudo apt update

# Upgrade all packages
sudo apt upgrade                # Safe upgrade (doesn't remove packages)
sudo apt full-upgrade           # Full upgrade (may remove packages)

# Install package
sudo apt install nginx
sudo apt install nginx apache2 mysql-server  # Multiple packages

# Install specific version
sudo apt install nginx=1.18.0-0ubuntu1

# Install without prompts
sudo apt install -y nginx

# Remove package (keep config files)
sudo apt remove nginx

# Remove package and config files
sudo apt purge nginx

# Remove unused dependencies
sudo apt autoremove

# Remove package, configs, and dependencies
sudo apt purge nginx && sudo apt autoremove

# ========================================
# Package Information
# ========================================

# Search for package
apt search nginx
apt search --names-only nginx   # Search names only

# Show package details
apt show nginx

# List installed packages
apt list --installed
apt list --installed | grep nginx

# List upgradable packages
apt list --upgradable

# Show package dependencies
apt depends nginx

# Show reverse dependencies (what depends on this)
apt rdepends nginx

# Check if package is installed
dpkg -l | grep nginx
apt list nginx

# ========================================
# Repository Management
# ========================================

# Add repository
sudo add-apt-repository ppa:nginx/stable
sudo apt update

# Remove repository
sudo add-apt-repository --remove ppa:nginx/stable

# Edit sources list
sudo nano /etc/apt/sources.list

# ========================================
# Cache Management
# ========================================

# Clear package cache
sudo apt clean                  # Remove all cached packages
sudo apt autoclean              # Remove only old cached packages

# Show cache statistics
sudo du -sh /var/cache/apt/archives

# ========================================
# Troubleshooting
# ========================================

# Fix broken dependencies
sudo apt --fix-broken install
sudo apt -f install             # Short form

# Reconfigure package
sudo dpkg-reconfigure package-name

# Force reconfigure all packages
sudo dpkg-reconfigure -a

# Check for held packages
apt-mark showhold

# Hold package (prevent upgrade)
sudo apt-mark hold nginx

# Unhold package
sudo apt-mark unhold nginx
```

### Advanced APT Usage

```bash
# ========================================
# apt-get vs apt
# ========================================

# apt is the modern, user-friendly interface
# apt-get is the older, script-friendly tool

# Equivalent commands:
apt update          = apt-get update
apt upgrade         = apt-get upgrade
apt install         = apt-get install
apt remove          = apt-get remove
apt autoremove      = apt-get autoremove
apt purge           = apt-get purge

# apt-get has more options for scripting

# ========================================
# Low-Level Package Management (dpkg)
# ========================================

# Install .deb file
sudo dpkg -i package.deb

# Remove package
sudo dpkg -r package-name

# Purge package
sudo dpkg -P package-name

# List all installed packages
dpkg -l

# List files in package
dpkg -L nginx

# Find which package owns a file
dpkg -S /usr/sbin/nginx

# Show package status
dpkg -s nginx

# Verify package installation
dpkg -V nginx

# ========================================
# Unattended Upgrades (Automatic Updates)
# ========================================

# Install unattended-upgrades
sudo apt install unattended-upgrades

# Configure automatic updates
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Configuration file
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Enable security updates only
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};

# Automatic reboot if required
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

# Test configuration
sudo unattended-upgrade --dry-run --debug

# ========================================
# APT Pinning (Priority Management)
# ========================================

# /etc/apt/preferences.d/custom-pins
cat > /etc/apt/preferences.d/nginx-pin << 'EOF'
Package: nginx
Pin: version 1.18.*
Pin-Priority: 1001
EOF

# Pin package to specific repository
Package: *
Pin: release o=Ubuntu,a=focal
Pin-Priority: 500

Package: *
Pin: release o=Ubuntu,a=focal-security
Pin-Priority: 990
```

### APT Repository Management

```bash
# ========================================
# sources.list Format
# ========================================

# /etc/apt/sources.list
# deb [options] uri distribution components

# Standard Ubuntu repos
deb http://archive.ubuntu.com/ubuntu focal main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu focal-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu focal-security main restricted universe multiverse

# Add custom repository
cat > /etc/apt/sources.list.d/custom.list << 'EOF'
deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable
EOF

# Add GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Modern way (using signed-by)
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

cat > /etc/apt/sources.list.d/docker.list << 'EOF'
deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu focal stable
EOF

sudo apt update
```

## YUM (Yellowdog Updater Modified) - CentOS/RHEL 7

### 💡 **YUM Overview**

YUM is the traditional package manager for Red Hat-based systems. It manages RPM packages and dependencies.

### Basic YUM Commands

```bash
# ========================================
# Package Installation and Removal
# ========================================

# Update package lists
sudo yum check-update

# Update all packages
sudo yum update
sudo yum update -y              # No prompts

# Install package
sudo yum install nginx
sudo yum install nginx httpd    # Multiple packages

# Install specific version
sudo yum install nginx-1.18.0

# Remove package
sudo yum remove nginx

# Remove with dependencies
sudo yum autoremove nginx

# ========================================
# Package Information
# ========================================

# Search for package
yum search nginx

# Show package details
yum info nginx

# List installed packages
yum list installed
yum list installed | grep nginx

# List available packages
yum list available

# List all packages
yum list all

# Show package dependencies
yum deplist nginx

# Find which package provides a file
yum provides /usr/sbin/nginx
yum whatprovides nginx

# ========================================
# Repository Management
# ========================================

# List enabled repositories
yum repolist

# List all repositories
yum repolist all

# Enable repository
sudo yum-config-manager --enable repository-name

# Disable repository
sudo yum-config-manager --disable repository-name

# Add repository
sudo yum-config-manager --add-repo https://example.com/repo

# Install EPEL repository
sudo yum install epel-release

# ========================================
# Cache Management
# ========================================

# Clean cache
sudo yum clean all

# Make cache
sudo yum makecache

# ========================================
# Troubleshooting
# ========================================

# Check for problems
sudo yum check

# Fix broken dependencies
sudo yum -y install yum-utils
sudo package-cleanup --problems
sudo package-cleanup --dupes

# Clear history
sudo yum history

# Undo last transaction
sudo yum history undo last

# View specific transaction
sudo yum history info 5

# Rollback to specific transaction
sudo yum history rollback 5
```

### YUM Configuration

```bash
# ========================================
# YUM Configuration
# ========================================

# Main configuration file
# /etc/yum.conf
[main]
cachedir=/var/cache/yum/$basearch/$releasever
keepcache=1                     # Keep downloaded packages
gpgcheck=1                      # Verify package signatures
installonly_limit=3             # Keep 3 old kernels
clean_requirements_on_remove=1

# Repository configuration
# /etc/yum.repos.d/custom.repo
[custom-repo]
name=Custom Repository
baseurl=https://example.com/repo/
enabled=1
gpgcheck=1
gpgkey=https://example.com/repo/RPM-GPG-KEY

# ========================================
# YUM Groups
# ========================================

# List available groups
yum grouplist

# Install group
sudo yum groupinstall "Development Tools"

# Remove group
sudo yum groupremove "Development Tools"

# Show group info
yum groupinfo "Development Tools"

# ========================================
# Low-Level RPM Commands
# ========================================

# Install RPM file
sudo rpm -ivh package.rpm

# Upgrade RPM
sudo rpm -Uvh package.rpm

# Remove RPM
sudo rpm -e package-name

# List installed packages
rpm -qa

# List files in package
rpm -ql nginx

# Find which package owns a file
rpm -qf /usr/sbin/nginx

# Show package info
rpm -qi nginx

# Verify package installation
rpm -V nginx
```

## DNF (Dandified YUM) - CentOS/RHEL 8+

### 💡 **DNF Overview**

DNF is the next-generation package manager for Red Hat-based systems, replacing YUM. It's faster, uses less memory, and has better dependency resolution.

### Basic DNF Commands

```bash
# ========================================
# Package Installation and Removal
# ========================================

# DNF commands are mostly compatible with YUM

# Update package lists and upgrade
sudo dnf check-update
sudo dnf upgrade                # Same as 'update' in DNF

# Install package
sudo dnf install nginx

# Remove package
sudo dnf remove nginx

# Autoremove unused dependencies
sudo dnf autoremove

# ========================================
# Package Information
# ========================================

# Search package
dnf search nginx

# Show package info
dnf info nginx

# List installed packages
dnf list installed

# List available packages
dnf list available

# Show dependencies
dnf repoquery --requires nginx

# Show what provides
dnf provides /usr/sbin/nginx

# ========================================
# Repository Management
# ========================================

# List repositories
dnf repolist

# Enable repository
sudo dnf config-manager --enable repository-name

# Disable repository
sudo dnf config-manager --disable repository-name

# Add repository
sudo dnf config-manager --add-repo https://example.com/repo

# Install EPEL
sudo dnf install epel-release

# ========================================
# DNF Modules
# ========================================

# List available modules
dnf module list

# List specific module streams
dnf module list nginx

# Install specific module stream
sudo dnf module install nginx:1.18

# Enable module stream
sudo dnf module enable nginx:1.18

# Reset module
sudo dnf module reset nginx

# Show enabled modules
dnf module list --enabled

# ========================================
# History and Rollback
# ========================================

# Show history
dnf history

# Show transaction details
dnf history info 5

# Undo transaction
sudo dnf history undo 5

# Rollback to transaction
sudo dnf history rollback 5

# ========================================
# Performance
# ========================================

# Makecache (faster than YUM)
sudo dnf makecache

# Clean cache
sudo dnf clean all

# Check for updates (fast)
dnf check-update --refresh
```

## Package Management Best Practices

### Automation Scripts

```bash
#!/bin/bash
#################################################
# Script: package-manager.sh
# Description: Unified package management
#################################################

set -euo pipefail

# Detect package manager
detect_pm() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v yum &> /dev/null; then
        echo "yum"
    else
        echo "unknown"
    fi
}

# Update packages
update_packages() {
    local pm=$(detect_pm)

    echo "Updating packages with $pm..."

    case "$pm" in
        apt)
            sudo apt update && sudo apt upgrade -y
            sudo apt autoremove -y
            ;;
        dnf)
            sudo dnf upgrade -y
            sudo dnf autoremove -y
            ;;
        yum)
            sudo yum update -y
            sudo yum autoremove -y
            ;;
        *)
            echo "Error: Unknown package manager"
            exit 1
            ;;
    esac

    echo "Package update complete!"
}

# Install package
install_package() {
    local pm=$(detect_pm)
    local package="$1"

    echo "Installing $package with $pm..."

    case "$pm" in
        apt)
            sudo apt install -y "$package"
            ;;
        dnf)
            sudo dnf install -y "$package"
            ;;
        yum)
            sudo yum install -y "$package"
            ;;
        *)
            echo "Error: Unknown package manager"
            exit 1
            ;;
    esac

    echo "$package installed successfully!"
}

# Check if package is installed
is_installed() {
    local pm=$(detect_pm)
    local package="$1"

    case "$pm" in
        apt)
            dpkg -l | grep -qw "$package"
            ;;
        dnf|yum)
            rpm -q "$package" &> /dev/null
            ;;
        *)
            return 1
            ;;
    esac
}

# Usage
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 {update|install <package>|check <package>}"
    exit 1
fi

case "$1" in
    update)
        update_packages
        ;;
    install)
        if [ "$#" -lt 2 ]; then
            echo "Usage: $0 install <package>"
            exit 1
        fi
        install_package "$2"
        ;;
    check)
        if [ "$#" -lt 2 ]; then
            echo "Usage: $0 check <package>"
            exit 1
        fi
        if is_installed "$2"; then
            echo "$2 is installed"
        else
            echo "$2 is not installed"
        fi
        ;;
    *)
        echo "Unknown command: $1"
        exit 1
        ;;
esac
```

### Security Updates

```bash
# ========================================
# Automate Security Updates
# ========================================

# Ubuntu/Debian - Automatic Security Updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configuration
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# CentOS/RHEL - yum-cron
sudo yum install yum-cron

# Configuration
sudo nano /etc/yum/yum-cron.conf
# Set:
# update_cmd = security
# apply_updates = yes

sudo systemctl enable yum-cron
sudo systemctl start yum-cron

# CentOS 8+ - dnf-automatic
sudo dnf install dnf-automatic
sudo nano /etc/dnf/automatic.conf
# Set:
# apply_updates = yes

sudo systemctl enable --now dnf-automatic.timer
```

### Package Auditing

```bash
# ========================================
# Security Auditing
# ========================================

# Check for security updates (Ubuntu/Debian)
sudo apt update
apt list --upgradable | grep -i security

# Show security updates
sudo unattended-upgrade --dry-run

# Check for vulnerable packages (CentOS/RHEL)
sudo yum updateinfo list security
sudo yum updateinfo info security

# Install only security updates
sudo yum update --security

# DNF security updates
sudo dnf updateinfo list security
sudo dnf upgrade --security

# ========================================
# Package Verification
# ========================================

# Verify package integrity (Debian/Ubuntu)
debsums -c

# Verify all packages
debsums -a

# Verify specific package
debsums nginx

# RPM verification
rpm -Va                         # Verify all packages
rpm -V nginx                    # Verify specific package

# Check for modified config files
rpm -V nginx | grep '^..5'
```

## Alternative Package Managers

### Snap

```bash
# ========================================
# Snap - Universal Package Manager
# ========================================

# Install snapd
sudo apt install snapd          # Ubuntu
sudo yum install snapd          # CentOS

# Find snaps
snap find package-name

# Install snap
sudo snap install package-name

# Install from specific channel
sudo snap install --classic code
sudo snap install --beta package-name

# List installed snaps
snap list

# Update snap
sudo snap refresh package-name

# Update all snaps
sudo snap refresh

# Remove snap
sudo snap remove package-name

# Show snap info
snap info package-name
```

### Flatpak

```bash
# ========================================
# Flatpak - Another Universal Package Manager
# ========================================

# Install flatpak
sudo apt install flatpak        # Ubuntu
sudo yum install flatpak        # CentOS

# Add Flathub repository
flatpak remote-add --if-not-exists flathub \
  https://flathub.org/repo/flathub.flatpakrepo

# Search applications
flatpak search package-name

# Install application
flatpak install flathub app-id

# List installed
flatpak list

# Run application
flatpak run app-id

# Update applications
flatpak update

# Remove application
flatpak uninstall app-id
```

## Interview Questions

**Q1: What's the difference between apt and apt-get?**
A: `apt` is the modern, user-friendly interface combining `apt-get` and `apt-cache` functionality. `apt-get` is older, more stable, better for scripting. `apt` has progress bars and is recommended for interactive use.

**Q2: How do you hold a package to prevent upgrades?**
A:
```bash
# Debian/Ubuntu
sudo apt-mark hold package-name
sudo apt-mark unhold package-name

# CentOS/RHEL
sudo yum versionlock add package-name
sudo yum versionlock delete package-name
```

**Q3: What's the difference between remove and purge?**
A: `remove` uninstalls the package but keeps configuration files. `purge` removes everything including config files. Use `purge` for complete removal.

**Q4: How do you find which package provides a file?**
A:
```bash
# Debian/Ubuntu
dpkg -S /path/to/file
apt-file search /path/to/file

# CentOS/RHEL
rpm -qf /path/to/file
yum provides /path/to/file
dnf provides /path/to/file
```

**Q5: What's the purpose of package pinning?**
A: Package pinning controls package version priority, preventing unwanted upgrades. Useful for keeping specific versions, testing, or when newer versions have issues. Set via `/etc/apt/preferences.d/` on Debian/Ubuntu.

**Q6: How do you add a third-party repository securely?**
A:
1. Import GPG key: `curl -fsSL url | sudo apt-key add -`
2. Add repository with `signed-by`: Include keyring path in sources.list
3. Update: `sudo apt update`
4. Verify: Check package signature before installing

## Summary

**Package Management Essentials:**

1. **APT (Ubuntu/Debian):**
   - ✅ `apt update` before installing/upgrading
   - ✅ `apt upgrade` for safe upgrades
   - ✅ `apt full-upgrade` for major upgrades
   - ✅ `apt autoremove` to clean dependencies

2. **YUM/DNF (CentOS/RHEL):**
   - ✅ `yum update` / `dnf upgrade` for updates
   - ✅ DNF faster and more efficient than YUM
   - ✅ Modules in DNF for version management
   - ✅ `yum history` for rollback capability

3. **Best Practices:**
   - ✅ Update regularly (security patches)
   - ✅ Use unattended-upgrades for automation
   - ✅ Test updates in staging first
   - ✅ Keep package lists updated
   - ✅ Clean cache periodically

4. **Security:**
   - ✅ Enable automatic security updates
   - ✅ Verify package signatures
   - ✅ Audit installed packages
   - ✅ Use official repositories
   - ✅ Check for vulnerable packages

5. **Troubleshooting:**
   - ✅ Fix broken dependencies: `apt -f install`
   - ✅ Clear cache if issues persist
   - ✅ Check repository configuration
   - ✅ Verify package integrity
   - ✅ Use history for rollback

**Key Insights:**
> - Always `apt update` before operations
> - Automate security updates for production
> - Use package manager abstraction in automation
> - DNF is the future of Red Hat-based systems
> - Snap/Flatpak for cross-distribution packages

---
[← Back: Networking](./04-networking.md) | [Next: System Services →](./06-system-services.md)
