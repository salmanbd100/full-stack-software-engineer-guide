# Package Management for DevOps

## Overview

Package managers install, update, and remove software while resolving dependencies for you. You reach for them to keep servers patched, reproducible, and consistent across a fleet.

Two families dominate interviews: Debian-based (APT) and Red Hat-based (YUM/DNF).

| Distribution | Package Manager | Format | Low-Level Tool |
|--------------|-----------------|--------|----------------|
| **Ubuntu / Debian** | APT | `.deb` | `dpkg` |
| **RHEL / CentOS 7** | YUM | `.rpm` | `rpm` |
| **RHEL / CentOS 8+, Fedora** | DNF | `.rpm` | `rpm` |
| **Arch** | Pacman | `.pkg.tar.zst` | — |
| **Alpine** | APK | `.apk` | — |

> **Key Insight:** High-level tools (apt, dnf) resolve dependencies from remote repos. Low-level tools (dpkg, rpm) act on a single local file and do NOT fetch dependencies.

## APT (Debian / Ubuntu)

### 💡 **APT**
The high-level package manager for Debian systems. It reads repositories from `/etc/apt/sources.list` and resolves dependencies automatically.

**Update and upgrade**

```bash
sudo apt update          # Refresh package lists first — always
sudo apt upgrade         # Install updates; never removes packages
sudo apt full-upgrade    # Allows removals to satisfy new dependencies
```

**Install and remove**

```bash
sudo apt install nginx
sudo apt install nginx=1.18.0-0ubuntu1   # Pin an exact version

sudo apt remove nginx        # Uninstall, keep config files
sudo apt purge nginx         # Uninstall AND delete config files
sudo apt autoremove          # Drop orphaned dependencies
```

> **Key Insight:** `remove` keeps `/etc` config so a reinstall picks up where you left off. `purge` wipes it for a clean slate.

**Search and inspect**

```bash
apt search nginx         # Find packages by keyword
apt show nginx           # Version, size, dependencies, description
apt list --installed     # What is on the box
apt list --upgradable    # What has pending updates
```

**Hold a package (freeze its version)**

```bash
sudo apt-mark hold nginx     # Skip nginx during upgrades
sudo apt-mark unhold nginx   # Resume normal upgrades
apt-mark showhold            # List frozen packages
```

### dpkg (Low-Level)

Use `dpkg` when you have a downloaded `.deb` or need file-level queries.

```bash
sudo dpkg -i package.deb          # Install a local .deb (no dep resolution)
sudo apt install -f               # Then fix any missing dependencies

dpkg -S /usr/sbin/nginx           # Which package owns this file?
dpkg -L nginx                     # List all files a package installed
dpkg -l | grep nginx              # Is it installed?
```

> ⚠️ `dpkg -i` fails or leaves broken deps if the `.deb` needs other packages. Follow with `apt install -f` to pull them in.

## APT Repositories

A repository line lives in `/etc/apt/sources.list` or a file under `/etc/apt/sources.list.d/`.

**Format**

```ini
# deb [options] <uri> <suite> <components>
deb http://archive.ubuntu.com/ubuntu focal main restricted universe
```

Adding a third-party repo securely means verifying its GPG signature. The old `apt-key add` is deprecated — it trusts a key for every repo on the system. Use a dedicated keyring plus `signed-by` instead.

**Add a third-party repo (modern, secure)**

```bash
# 1. Download the key and convert it to a binary keyring
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg

# 2. Add the repo, scoping trust to that one keyring
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu focal stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list

# 3. Refresh so APT sees the new repo
sudo apt update
```

> **Key Insight:** `signed-by=` binds a key to a single repo. A compromised third-party key can no longer forge packages for the whole system — the big win over `apt-key`.

## YUM / DNF (RHEL / CentOS / Fedora)

### 💡 **DNF**
DNF is the modern successor to YUM on RHEL 8+ and Fedora — faster, lower memory, better dependency solving. The command syntax is nearly identical, so `yum` still works as an alias on new systems.

**Core commands (yum and dnf share this syntax)**

```bash
sudo dnf check-update            # List available updates
sudo dnf upgrade                 # Apply all updates (was 'yum update')

sudo dnf install nginx
sudo dnf remove nginx
sudo dnf autoremove              # Drop orphaned dependencies

dnf search nginx                 # Find by keyword
dnf info nginx                   # Package details
dnf provides /usr/sbin/nginx     # Which package provides this file?
dnf repolist                     # List enabled repositories

sudo dnf install epel-release    # Add the common EPEL repo
```

Swap `dnf` for `yum` on RHEL/CentOS 7 — every command above still applies.

**rpm (Low-Level)**

```bash
sudo rpm -ivh package.rpm    # Install a local .rpm
sudo rpm -Uvh package.rpm    # Upgrade (or install) from a local .rpm
rpm -qf /usr/sbin/nginx      # Which package owns this file?
rpm -ql nginx                # List files a package installed
rpm -qa | grep nginx         # Is it installed?
```

### History and Rollback

DNF/YUM log every transaction, so you can undo a bad upgrade — a real advantage over APT.

```bash
dnf history                  # Numbered list of past transactions
dnf history info 5           # What changed in transaction 5
sudo dnf history undo 5      # Reverse a single transaction
sudo dnf history rollback 5  # Return system to its state at #5
```

> **Key Insight:** `undo` reverses one transaction. `rollback` reverts everything back to a chosen point. Both make risky upgrades recoverable.

## Command Equivalence

The single most useful reference across distros.

| Task | APT (Debian/Ubuntu) | YUM/DNF (RHEL/CentOS) |
|------|---------------------|-----------------------|
| Refresh package lists | `apt update` | `dnf check-update` |
| Upgrade all packages | `apt upgrade` | `dnf upgrade` |
| Install a package | `apt install pkg` | `dnf install pkg` |
| Remove a package | `apt remove pkg` | `dnf remove pkg` |
| Remove + config | `apt purge pkg` | `dnf remove pkg` |
| Remove orphaned deps | `apt autoremove` | `dnf autoremove` |
| Search | `apt search term` | `dnf search term` |
| Package details | `apt show pkg` | `dnf info pkg` |
| Which package owns a file | `dpkg -S /path` | `rpm -qf /path` |
| Which package provides a file | `apt-file search /path` | `dnf provides /path` |
| List files in a package | `dpkg -L pkg` | `rpm -ql pkg` |
| Freeze a version | `apt-mark hold pkg` | `dnf versionlock add pkg` |
| Install local file | `dpkg -i file.deb` | `rpm -ivh file.rpm` |
| List installed | `apt list --installed` | `rpm -qa` |

## Security and Automation

Automatic security updates keep servers patched without manual work.

**Ubuntu / Debian — unattended-upgrades**

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # Enable interactively
```

```ini
# /etc/apt/apt.conf.d/50unattended-upgrades — security origin only
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
```

**RHEL / CentOS 8+ — dnf-automatic**

```bash
sudo dnf install dnf-automatic
# Set apply_updates = yes in /etc/dnf/automatic.conf
sudo systemctl enable --now dnf-automatic.timer
```

**Apply only security updates on demand**

```bash
sudo dnf upgrade --security                # RHEL family
apt list --upgradable | grep -i security   # Debian family (inspect first)
```

## Universal Packages (Snap / Flatpak)

Snap and Flatpak ship apps with their dependencies bundled, so one package runs on any distro. The tradeoff is larger size and slower startup than native packages. Reach for them for desktop apps or when a native package is unavailable.

```bash
sudo snap install code --classic     # Snap (Canonical)
flatpak install flathub org.gimp.GIMP   # Flatpak (needs Flathub remote)
```

> **Key Insight:** Prefer native packages (apt/dnf) on servers — they are smaller, faster, and patched by the distro. Use Snap/Flatpak mainly for desktop or cross-distro convenience.

## APT Pinning (Brief)

Pinning sets version priorities in `/etc/apt/preferences.d/` to keep a package on a chosen version even when a newer one exists. Useful for pinning a database or holding back a flaky release. Reach for `apt-mark hold` for simple freezes; use pinning only when you need repo-level priority control.

## Interview Questions

**Q1: What is the difference between `apt` and `apt-get`?**
`apt` is the modern, user-friendly front end that merges the most-used `apt-get` and `apt-cache` commands and adds a progress bar. `apt-get` is older with a stable, scriptable interface. Use `apt` interactively; prefer `apt-get` in scripts where the output contract must not change.

**Q2: What is the difference between `remove` and `purge`?**
`apt remove` uninstalls the package but leaves its config files under `/etc`. `apt purge` removes the package and its config. Use `purge` for a truly clean removal; add `apt autoremove` to drop leftover dependencies.

**Q3: How do you find which package provides a file?**
For an installed file: `dpkg -S /path` (Debian) or `rpm -qf /path` (RHEL). To search packages you have not installed: `apt-file search /path` or `dnf provides /path`, which query repo metadata.

**Q4: How do you stop a package from being upgraded?**
`sudo apt-mark hold nginx` freezes it on Debian; `sudo apt-mark unhold nginx` releases it. On RHEL use `dnf versionlock add nginx`. This is common when a newer version breaks compatibility and you need to pin the working one.

**Q5: How do you add a third-party repository securely?**
Download the GPG key and store it as a dedicated keyring with `gpg --dearmor`, then add the repo line with `signed-by=` pointing at that keyring, and run `apt update`. Avoid the deprecated `apt-key add` — it trusts the key for every repo, so a single compromised key can forge packages system-wide. Scoping with `signed-by` limits trust to that one repo.

## Summary

> **Debian:** `apt update` before anything. `remove` keeps config, `purge` deletes it, `autoremove` cleans orphans. Freeze with `apt-mark hold`.

> **RHEL:** DNF replaces YUM with the same syntax. Its killer feature is `dnf history undo/rollback` — recover from a bad upgrade in one command.

> **Security:** Add third-party repos with `signed-by=` keyrings, never `apt-key`. Automate patches with unattended-upgrades or dnf-automatic.

---
[← Back: Networking](./04-networking.md) | [Next: System Services →](./06-system-services.md)
