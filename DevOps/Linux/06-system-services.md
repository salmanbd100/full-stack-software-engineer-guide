# System Services and Systemd for DevOps

## Overview

System services are the backbone of Linux infrastructure. Understanding systemd, the modern init system and service manager, is essential for managing applications, troubleshooting, and automating DevOps workflows.

**Why Services Matter:**
- Manage application lifecycle (start, stop, restart)
- Ensure services start on boot
- Monitor service health
- View service logs
- Configure resource limits
- Handle dependencies

**Service Management Evolution:**

| Init System | Used By | Year | Complexity |
|-------------|---------|------|------------|
| **SysV init** | Older systems | 1983 | Scripts in /etc/init.d/ |
| **Upstart** | Ubuntu (old) | 2006 | Event-based |
| **systemd** | Most modern distros | 2010 | Unit files, parallel startup |

## Systemd Basics

### 💡 **What is Systemd?**

Systemd is a system and service manager that runs as PID 1, initializing the system and managing services throughout the system lifecycle.

**Key Concepts:**
- **Units**: Basic objects systemd manages (services, sockets, devices, mounts)
- **Targets**: Groups of units (like runlevels in SysV)
- **Dependencies**: Order and requirement relationships
- **Timers**: Systemd's alternative to cron

**Unit Types:**

| Unit Type | Extension | Purpose |
|-----------|-----------|---------|
| **Service** | .service | System services (daemons) |
| **Socket** | .socket | IPC or network sockets |
| **Target** | .target | Unit groups (like runlevels) |
| **Mount** | .mount | Filesystem mount points |
| **Timer** | .timer | Scheduled tasks |
| **Path** | .path | Path-based activation |

### systemctl - Service Control

```bash
# ========================================
# Basic Service Management
# ========================================

# Start service
sudo systemctl start nginx

# Stop service
sudo systemctl stop nginx

# Restart service (stop then start)
sudo systemctl restart nginx

# Reload configuration (without restart)
sudo systemctl reload nginx

# Restart if running, start if stopped
sudo systemctl try-restart nginx

# Reload or restart
sudo systemctl reload-or-restart nginx

# ========================================
# Service Status
# ========================================

# Check service status
systemctl status nginx

# Output example:
# ● nginx.service - A high performance web server
#    Loaded: loaded (/lib/systemd/system/nginx.service; enabled)
#    Active: active (running) since Mon 2026-01-19 10:00:00 UTC
#      Docs: man:nginx(8)
#  Main PID: 1234 (nginx)
#     Tasks: 2 (limit: 4915)
#    Memory: 5.2M
#    CGroup: /system.slice/nginx.service
#            ├─1234 nginx: master process
#            └─1235 nginx: worker process

# Check if service is active
systemctl is-active nginx

# Check if service is enabled
systemctl is-enabled nginx

# Check if service failed
systemctl is-failed nginx

# ========================================
# Boot Management
# ========================================

# Enable service (start on boot)
sudo systemctl enable nginx

# Disable service (don't start on boot)
sudo systemctl disable nginx

# Enable and start immediately
sudo systemctl enable --now nginx

# Disable and stop immediately
sudo systemctl disable --now nginx

# Check if service is enabled
systemctl is-enabled nginx

# ========================================
# Service Listing
# ========================================

# List all services
systemctl list-units --type=service

# List all services (including inactive)
systemctl list-units --type=service --all

# List running services only
systemctl list-units --type=service --state=running

# List failed services
systemctl list-units --type=service --state=failed

# List enabled services
systemctl list-unit-files --type=service --state=enabled

# Show service dependencies
systemctl list-dependencies nginx

# Show reverse dependencies (what depends on this)
systemctl list-dependencies --reverse nginx
```

### Service Logs with journalctl

```bash
# ========================================
# journalctl - View Systemd Logs
# ========================================

# View all logs
sudo journalctl

# View logs for specific service
sudo journalctl -u nginx

# Follow logs (like tail -f)
sudo journalctl -u nginx -f

# View logs since boot
sudo journalctl -b

# View logs from previous boot
sudo journalctl -b -1

# View logs from specific time
sudo journalctl --since "2026-01-19 10:00:00"
sudo journalctl --since "1 hour ago"
sudo journalctl --since "yesterday"

# Time range
sudo journalctl --since "2026-01-19" --until "2026-01-20"

# Last N lines
sudo journalctl -u nginx -n 50

# Show in reverse (newest first)
sudo journalctl -u nginx -r

# Output format
sudo journalctl -u nginx -o json-pretty
sudo journalctl -u nginx -o short-iso

# Filter by priority
sudo journalctl -p err              # Errors only
sudo journalctl -p warning          # Warnings and above

# Priority levels:
# 0: emerg    - Emergency
# 1: alert    - Alert
# 2: crit     - Critical
# 3: err      - Error
# 4: warning  - Warning
# 5: notice   - Notice
# 6: info     - Info
# 7: debug    - Debug

# Follow logs from multiple services
sudo journalctl -u nginx -u mysql -f

# Show kernel messages
sudo journalctl -k

# Show only this boot
sudo journalctl -b 0

# ========================================
# Journal Management
# ========================================

# Check journal disk usage
sudo journalctl --disk-usage

# Vacuum old logs (keep last 2 days)
sudo journalctl --vacuum-time=2d

# Vacuum by size (keep last 500M)
sudo journalctl --vacuum-size=500M

# Verify journal integrity
sudo journalctl --verify

# Rotate journals
sudo systemctl kill --kill-who=main --signal=SIGUSR2 systemd-journald.service

# Configuration
# /etc/systemd/journald.conf
[Journal]
SystemMaxUse=500M
SystemMaxFileSize=50M
RuntimeMaxUse=100M
MaxRetentionSec=2week
```

## Creating Custom Services

### 💡 **Service Unit Files**

Service unit files define how systemd manages your application. Located in `/etc/systemd/system/` or `/lib/systemd/system/`.

### Simple Service Example

```bash
# ========================================
# Create Simple Service
# ========================================

# Example: Node.js application service
sudo nano /etc/systemd/system/myapp.service

[Unit]
Description=My Node.js Application
Documentation=https://myapp.com/docs
After=network.target                    # Start after network is up

[Service]
Type=simple                             # Service type
User=nodeuser                           # Run as this user
WorkingDirectory=/opt/myapp             # Working directory
ExecStart=/usr/bin/node /opt/myapp/server.js  # Start command
Restart=always                          # Always restart on failure
RestartSec=10                           # Wait 10s before restart

# Environment variables
Environment="NODE_ENV=production"
Environment="PORT=3000"

# Standard output/error to journal
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target              # Enable in multi-user mode

# ========================================
# Reload and Start Service
# ========================================

# Reload systemd daemon (after creating/editing unit)
sudo systemctl daemon-reload

# Start service
sudo systemctl start myapp

# Enable on boot
sudo systemctl enable myapp

# Check status
sudo systemctl status myapp

# View logs
sudo journalctl -u myapp -f
```

### Service Types

```bash
# ========================================
# Service Type= Options
# ========================================

# Type=simple (default)
# Process specified in ExecStart is the main process
[Service]
Type=simple
ExecStart=/usr/bin/myapp

# Type=forking
# Process forks and parent exits (traditional daemon)
[Service]
Type=forking
ExecStart=/usr/sbin/nginx
PIDFile=/var/run/nginx.pid

# Type=oneshot
# Process exits after execution (useful for scripts)
[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-script.sh
RemainAfterExit=yes                     # Consider active even after exit

# Type=notify
# Service sends notification when ready
[Service]
Type=notify
ExecStart=/usr/bin/myapp
NotifyAccess=main

# Type=dbus
# Service is ready when it takes a name on D-Bus
[Service]
Type=dbus
BusName=org.example.myapp
ExecStart=/usr/bin/myapp

# Type=idle
# Execution delayed until all jobs finished
[Service]
Type=idle
ExecStart=/usr/bin/myapp
```

### Advanced Service Configuration

```bash
# ========================================
# Advanced Service Features
# ========================================

cat > /etc/systemd/system/advanced-app.service << 'EOF'
[Unit]
Description=Advanced Application Service
Documentation=https://example.com/docs
After=network.target mysql.service      # Start after these units
Requires=mysql.service                  # Requires mysql (hard dependency)
Wants=redis.service                     # Wants redis (soft dependency)

[Service]
Type=simple
User=appuser
Group=appgroup
WorkingDirectory=/opt/app

# Start command
ExecStart=/usr/bin/python3 /opt/app/main.py

# Pre-start setup
ExecStartPre=/usr/bin/mkdir -p /var/run/app
ExecStartPre=/usr/bin/chown appuser:appgroup /var/run/app

# Post-start validation
ExecStartPost=/usr/bin/curl -f http://localhost:8080/health

# Reload command
ExecReload=/bin/kill -HUP $MAINPID

# Pre-stop cleanup
ExecStopPost=/usr/bin/rm -rf /var/run/app

# Restart policy
Restart=on-failure                      # on-failure, always, on-abnormal
RestartSec=10                           # Wait before restart
StartLimitInterval=200                  # Within this interval...
StartLimitBurst=5                       # ...allow 5 restarts

# Environment
Environment="APP_ENV=production"
EnvironmentFile=/etc/app/config         # Load from file

# Security options
PrivateTmp=true                         # Private /tmp
NoNewPrivileges=true                    # Can't gain new privileges
ProtectSystem=full                      # Read-only /usr, /boot, /efi
ProtectHome=true                        # /home inaccessible

# Resource limits
LimitNOFILE=65536                       # Max open files
LimitNPROC=512                          # Max processes
MemoryLimit=1G                          # Memory limit
CPUQuota=50%                            # CPU quota

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=advanced-app

# Timeout
TimeoutStartSec=60                      # Max start time
TimeoutStopSec=30                       # Max stop time

[Install]
WantedBy=multi-user.target
Alias=app.service                       # Additional name
EOF

sudo systemctl daemon-reload
sudo systemctl start advanced-app
```

### Multi-Instance Services

```bash
# ========================================
# Template Units (@ in filename)
# ========================================

# Create template
cat > /etc/systemd/system/worker@.service << 'EOF'
[Unit]
Description=Worker Instance %i
After=network.target

[Service]
Type=simple
User=worker
ExecStart=/usr/bin/worker --instance=%i
Restart=always

# Instance-specific environment
Environment="INSTANCE=%i"

[Install]
WantedBy=multi-user.target
EOF

# Start multiple instances
sudo systemctl start worker@1
sudo systemctl start worker@2
sudo systemctl start worker@3

# Enable instances
sudo systemctl enable worker@1
sudo systemctl enable worker@2

# Check all instances
systemctl list-units 'worker@*'

# Stop specific instance
sudo systemctl stop worker@2
```

## Service Dependencies

### Understanding Dependencies

```bash
# ========================================
# Dependency Directives
# ========================================

# Requires= (hard dependency)
# If the required unit fails, this unit fails too
[Unit]
Requires=mysql.service

# Wants= (soft dependency)
# If the wanted unit fails, this unit continues
[Unit]
Wants=redis.service

# After= (ordering)
# Start this unit after the specified units
[Unit]
After=network.target mysql.service

# Before= (ordering)
# Start this unit before the specified units
[Unit]
Before=nginx.service

# Conflicts=
# This unit cannot run simultaneously with specified units
[Unit]
Conflicts=apache2.service

# BindsTo=
# Like Requires but also stops if the bound unit stops
[Unit]
BindsTo=nginx.service

# PartOf=
# When specified unit deactivates, this unit deactivates too
[Unit]
PartOf=nginx.service

# ========================================
# Example: Web Application with Dependencies
# ========================================

# Database service (no dependencies)
# /etc/systemd/system/myapp-db.service
[Unit]
Description=MyApp Database
After=network.target

[Service]
Type=forking
ExecStart=/usr/bin/mongod --fork --config /etc/mongod.conf
PIDFile=/var/run/mongodb/mongod.pid
Restart=always

[Install]
WantedBy=multi-user.target

# Backend service (requires database)
# /etc/systemd/system/myapp-backend.service
[Unit]
Description=MyApp Backend API
After=network.target myapp-db.service
Requires=myapp-db.service

[Service]
Type=simple
ExecStart=/usr/bin/node /opt/myapp/backend/server.js
Restart=always
User=appuser

[Install]
WantedBy=multi-user.target

# Frontend service (requires backend)
# /etc/systemd/system/myapp-frontend.service
[Unit]
Description=MyApp Frontend
After=myapp-backend.service
Requires=myapp-backend.service

[Service]
Type=forking
ExecStart=/usr/sbin/nginx
PIDFile=/var/run/nginx.pid
Restart=always

[Install]
WantedBy=multi-user.target

# Master service to manage all together
# /etc/systemd/system/myapp.service
[Unit]
Description=MyApp Complete Stack
Requires=myapp-db.service myapp-backend.service myapp-frontend.service
After=myapp-frontend.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/true

[Install]
WantedBy=multi-user.target

# Now you can:
sudo systemctl start myapp          # Starts all components
sudo systemctl stop myapp           # Stops all components
```

## Systemd Timers

### 💡 **Timers vs Cron**

Systemd timers are the modern replacement for cron jobs, with better logging, dependencies, and integration.

### Creating Timers

```bash
# ========================================
# Timer Example: Backup Service
# ========================================

# Create service unit
cat > /etc/systemd/system/backup.service << 'EOF'
[Unit]
Description=Backup Service
Wants=backup.timer

[Service]
Type=oneshot
User=backup
ExecStart=/usr/local/bin/backup.sh

[Install]
WantedBy=multi-user.target
EOF

# Create timer unit
cat > /etc/systemd/system/backup.timer << 'EOF'
[Unit]
Description=Backup Timer
Requires=backup.service

[Timer]
OnCalendar=daily                        # Every day at 00:00
# Alternative schedules:
# OnCalendar=hourly                     # Every hour
# OnCalendar=weekly                     # Every Monday 00:00
# OnCalendar=*-*-* 02:00:00             # Every day at 02:00
# OnCalendar=Mon,Tue *-*-* 12:00:00     # Mon and Tue at 12:00
# OnCalendar=*-*-01 00:00:00            # First day of month

# Wait 5 minutes after boot
OnBootSec=5min

# Randomize by up to 1 hour
RandomizedDelaySec=1h

# Persistent (run if missed during downtime)
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable backup.timer
sudo systemctl start backup.timer

# Check timer status
systemctl status backup.timer

# List all timers
systemctl list-timers

# Show next run time
systemctl list-timers backup.timer
```

### OnCalendar Syntax

```bash
# ========================================
# OnCalendar Format
# ========================================

# Format: DayOfWeek Year-Month-Day Hour:Minute:Second

# Examples:
OnCalendar=*-*-* *:00:00                # Every hour
OnCalendar=*-*-* 00,12:00:00            # Twice daily (00:00 and 12:00)
OnCalendar=Mon *-*-* 12:00:00           # Every Monday at noon
OnCalendar=Mon,Fri *-*-* 15:30:00       # Mon and Fri at 15:30
OnCalendar=*-*-01 00:00:00              # First day of month at midnight
OnCalendar=Mon..Fri *-*-* 09:00:00      # Weekdays at 09:00

# Test calendar specification
systemd-analyze calendar "Mon *-*-* 12:00:00"
systemd-analyze calendar "daily"
systemd-analyze calendar "*:0/15"       # Every 15 minutes
```

## Targets (Runlevels)

### Understanding Targets

```bash
# ========================================
# System Targets (like SysV runlevels)
# ========================================

# View current target
systemctl get-default

# Common targets:
# poweroff.target     - Shutdown (runlevel 0)
# rescue.target       - Single-user mode (runlevel 1)
# multi-user.target   - Multi-user, no GUI (runlevel 3)
# graphical.target    - Multi-user with GUI (runlevel 5)
# reboot.target       - Reboot (runlevel 6)

# Set default target
sudo systemctl set-default multi-user.target

# Change to target immediately
sudo systemctl isolate multi-user.target

# List all targets
systemctl list-units --type=target

# Show what's in a target
systemctl list-dependencies multi-user.target
```

## System Control

### System State Management

```bash
# ========================================
# System Power Management
# ========================================

# Reboot system
sudo systemctl reboot

# Power off system
sudo systemctl poweroff

# Halt system
sudo systemctl halt

# Suspend system
sudo systemctl suspend

# Hibernate system
sudo systemctl hibernate

# Hybrid sleep
sudo systemctl hybrid-sleep

# ========================================
# Reload Systemd
# ========================================

# Reload systemd daemon (after unit file changes)
sudo systemctl daemon-reload

# Reload systemd configuration
sudo systemctl daemon-reexec

# ========================================
# Emergency Mode
# ========================================

# Enter rescue mode
sudo systemctl rescue

# Enter emergency mode (minimal environment)
sudo systemctl emergency
```

## Troubleshooting Services

### Debug Service Issues

```bash
# ========================================
# Service Troubleshooting
# ========================================

# Check service status
systemctl status nginx

# View full status (no truncation)
systemctl status nginx -l

# Show service properties
systemctl show nginx

# Show specific property
systemctl show nginx -p ExecStart

# Check service dependencies
systemctl list-dependencies nginx

# Check which units failed
systemctl --failed

# View recent logs
sudo journalctl -u nginx -n 100

# Follow logs
sudo journalctl -u nginx -f

# Check for errors
sudo journalctl -u nginx -p err

# Verify unit file syntax
systemd-analyze verify /etc/systemd/system/myapp.service

# Check startup time
systemd-analyze blame                   # List by time
systemd-analyze critical-chain          # Show critical path

# Test service start
sudo systemctl start nginx
sudo journalctl -u nginx --since "1 minute ago"

# ========================================
# Common Issues
# ========================================

# Issue: Service fails to start
# Debug steps:
sudo systemctl status service-name -l
sudo journalctl -u service-name -n 50
# Check ExecStart command manually:
sudo -u service-user /path/to/command

# Issue: Service starts but stops immediately
# Check:
# - ExecStart command validity
# - User permissions
# - Working directory existence
# - Environment variables

# Issue: Service enabled but doesn't start on boot
# Check:
systemctl is-enabled service-name
systemctl list-dependencies service-name
# Look for dependency failures:
systemctl --failed
```

## Interview Questions

**Q1: What's the difference between systemctl start and systemctl enable?**
A: `start` starts the service immediately. `enable` configures the service to start automatically on boot. Use `enable --now` to both enable and start.

**Q2: How do you view logs for a specific service?**
A: `sudo journalctl -u service-name`. Add `-f` to follow, `-n 50` for last 50 lines, `--since "1 hour ago"` for time-based filtering.

**Q3: Explain service dependencies: Requires vs Wants.**
A: `Requires=` is a hard dependency—if the required service fails, this service fails. `Wants=` is a soft dependency—this service starts even if the wanted service fails. Use `Wants` for optional dependencies.

**Q4: What's the purpose of daemon-reload?**
A: `systemctl daemon-reload` reloads systemd's configuration after creating or modifying unit files. Required for systemd to recognize changes.

**Q5: How do you create a service that runs on schedule?**
A: Create two units: a `.service` file (the task) and a `.timer` file (the schedule). Timer uses `OnCalendar=` for schedule and triggers the service.

**Q6: What's the difference between Type=simple and Type=forking?**
A: `Type=simple` - Process in ExecStart is the main process. `Type=forking` - Process forks and parent exits (traditional daemon). Use `simple` for modern applications, `forking` for legacy daemons.

## Summary

**Systemd Essentials:**

1. **Service Management:**
   - ✅ `systemctl start/stop/restart` for control
   - ✅ `systemctl enable/disable` for boot config
   - ✅ `systemctl status` for health check
   - ✅ `systemctl reload` for config refresh

2. **Logs:**
   - ✅ `journalctl -u service-name` for service logs
   - ✅ `-f` to follow in real-time
   - ✅ `--since` for time-based filtering
   - ✅ `-p` for priority filtering

3. **Unit Files:**
   - ✅ Located in `/etc/systemd/system/`
   - ✅ `[Unit]` section: Description, dependencies
   - ✅ `[Service]` section: ExecStart, restart policy
   - ✅ `[Install]` section: WantedBy target

4. **Dependencies:**
   - `Requires=` - Hard dependency
   - `Wants=` - Soft dependency
   - `After=` - Ordering (start after)
   - `Before=` - Ordering (start before)

5. **Best Practices:**
   - ✅ Always `daemon-reload` after unit changes
   - ✅ Use `Restart=on-failure` for resilience
   - ✅ Set resource limits (CPU, memory)
   - ✅ Use systemd timers instead of cron
   - ✅ Test services before enabling

**Key Insights:**
> - Systemd is the modern standard (replace SysV/Upstart)
> - journalctl provides centralized logging
> - Unit files are more powerful than init scripts
> - Timers are better than cron (logging, dependencies)
> - Understanding dependencies prevents startup issues

---
[← Back: Package Management](./05-package-management.md) | [Next: Security →](./07-security.md)
