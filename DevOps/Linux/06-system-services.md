# System Services and Systemd

## Overview

Systemd is the init system and service manager on almost every modern Linux distro. It boots the machine, starts your apps, keeps them alive, and collects their logs.

If you deploy anything on a Linux server, you manage it through systemd.

> **Key Insight:** Systemd replaced older init systems (SysV, Upstart). It starts services in parallel, tracks dependencies, and gives you one tool for control (`systemctl`) and one for logs (`journalctl`).

---

## Systemd Basics

### 💡 **What is Systemd?**

The first process the kernel starts. It runs as **PID 1** and manages everything else.

Systemd manages **units** — the objects it knows how to control. A service is the most common unit type.

**Common unit types:**

| Unit Type | Extension | Purpose |
|-----------|-----------|---------|
| Service | `.service` | Daemons and background apps |
| Timer | `.timer` | Scheduled tasks (cron replacement) |
| Socket | `.socket` | Network or IPC sockets |
| Target | `.target` | Groups of units (like runlevels) |
| Mount | `.mount` | Filesystem mount points |

---

## systemctl — Controlling Services

`systemctl` is your main tool. It starts, stops, and inspects services.

**Lifecycle control:**

```bash
sudo systemctl start nginx      # start now
sudo systemctl stop nginx       # stop now
sudo systemctl restart nginx    # stop then start
sudo systemctl reload nginx     # reload config, no downtime
```

> **Restart vs reload:** `restart` kills and restarts the process (brief downtime). `reload` tells the running process to re-read its config (no downtime). Use `reload` when the service supports it.

**Boot behavior:**

```bash
sudo systemctl enable nginx        # start on every boot
sudo systemctl disable nginx       # don't start on boot
sudo systemctl enable --now nginx  # enable AND start right now
```

> **Key Insight:** `start` affects the current session only. `enable` affects future boots. They are independent — a service can be running but not enabled, or enabled but not running.

**Status and checks:**

```bash
systemctl status nginx        # health, PID, recent logs
systemctl is-active nginx     # running? -> active / inactive
systemctl is-enabled nginx    # starts on boot? -> enabled / disabled
```

**Listing services:**

```bash
systemctl list-units --type=service              # all active services
systemctl list-units --type=service --all        # include inactive
systemctl --failed                               # only failed units
```

---

## journalctl — Reading Logs

Systemd captures each service's stdout and stderr into the **journal**. `journalctl` queries it.

**The commands you actually use:**

```bash
journalctl -u nginx                  # logs for one service
journalctl -u nginx -f               # follow live (like tail -f)
journalctl -u nginx -n 50            # last 50 lines
journalctl -u nginx --since "1 hour ago"
journalctl -u nginx -p err           # errors and worse only
journalctl -b                        # logs since last boot
```

**Priority levels** for `-p` (0 = worst): `emerg`, `alert`, `crit`, `err`, `warning`, `notice`, `info`, `debug`.

> **Key Insight:** When a service misbehaves, `systemctl status` gives you the headline; `journalctl -u <service> -n 100` gives you the full story.

---

## Creating a Custom Service

### 💡 **Unit Files**

A unit file tells systemd how to run your app. Put custom ones in `/etc/systemd/system/`.

**`/etc/systemd/system/myapp.service`:**

```ini
[Unit]
Description=My Node.js Application
After=network.target          # start after networking is ready

[Service]
Type=simple                   # ExecStart process IS the service
User=nodeuser                 # drop root; run as a low-priv user
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node /opt/myapp/server.js
Restart=always                # revive the app if it crashes
RestartSec=10                 # wait 10s between restart attempts
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target    # enable = hook into normal boot
```

**The three sections:**

| Section | Answers | Key directives |
|---------|---------|----------------|
| `[Unit]` | What is it, what does it need? | `Description`, `After`, `Requires`, `Wants` |
| `[Service]` | How do I run it? | `Type`, `ExecStart`, `User`, `Restart` |
| `[Install]` | What happens on `enable`? | `WantedBy` |

**Load and start it:**

```bash
sudo systemctl daemon-reload      # re-read unit files from disk
sudo systemctl enable --now myapp
systemctl status myapp
```

> ⚠️ **Always run `daemon-reload` after editing a unit file.** Systemd caches unit files in memory. Without a reload it keeps using the old version and ignores your changes.

---

## Service Types

`Type=` tells systemd how to know the service is "started". Getting it wrong causes false failures.

| `Type=` | Meaning | Use for |
|---------|---------|---------|
| `simple` | ExecStart process is the service (default) | Most modern apps that stay in foreground |
| `forking` | Process forks and the parent exits | Traditional daemons (nginx, sshd) |
| `oneshot` | Runs, does its job, exits | Setup scripts, one-time tasks |
| `notify` | App signals systemd when truly ready | Apps needing accurate readiness |

> **simple vs forking:** With `simple`, systemd treats the process it launches as the service. With `forking`, systemd expects that process to fork a child and exit; the child is the real service. Pick `forking` for classic daemons that background themselves, and set `PIDFile=` so systemd can track the child.

**oneshot needs one extra flag if the effect should persist:**

```ini
[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup.sh
RemainAfterExit=yes    # report "active" even after the script exits
```

---

## Dependencies and Ordering

Two separate ideas: **requirement** (do I need this unit?) and **ordering** (when do I start relative to it?).

| Directive | Type | Effect |
|-----------|------|--------|
| `Requires=` | Requirement | Hard need. If it fails to start, this unit fails too. |
| `Wants=` | Requirement | Soft need. This unit starts even if the other fails. |
| `After=` | Ordering | Start this unit *after* the named units. |
| `Before=` | Ordering | Start this unit *before* the named units. |
| `Conflicts=` | Requirement | Cannot run at the same time as the named unit. |
| `BindsTo=` | Requirement | Like `Requires`, but also stops if the other stops. |

> **Key Insight:** `Requires`/`Wants` control *whether*; `After`/`Before` control *when*. They are independent. `Requires=db.service` without `After=db.service` may start both at once — you usually want both directives together.

**Prefer `Wants` in practice.** `Requires` cascades failures: one dependency dies and your service dies with it. Use `Wants` unless the service is truly useless without the dependency.

---

## Timers (Cron Replacement)

### 💡 **Timers vs Cron**

Systemd timers schedule tasks like cron, but with real logging (`journalctl`), dependency support, and the ability to catch up on missed runs.

A timer needs **two files**: a `.service` (the work) and a `.timer` (the schedule).

**`backup.service`:**

```ini
[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup.sh
```

**`backup.timer`:**

```ini
[Unit]
Description=Run backup daily

[Timer]
OnCalendar=daily        # every day at 00:00
Persistent=true         # if machine was off, run at next boot
RandomizedDelaySec=1h   # spread load: jitter up to 1 hour

[Install]
WantedBy=timers.target
```

**Enable the timer (not the service):**

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now backup.timer
systemctl list-timers        # show next run times
```

**`OnCalendar` quick reference:**

| Value | Runs |
|-------|------|
| `hourly` | Top of every hour |
| `daily` | Every day at 00:00 |
| `*-*-* 02:00:00` | Every day at 02:00 |
| `Mon..Fri *-*-* 09:00:00` | Weekdays at 09:00 |
| `*:0/15` | Every 15 minutes |

```bash
systemd-analyze calendar "Mon *-*-* 12:00:00"   # test an expression
```

---

## Targets (Runlevels)

Targets group units to define system states, replacing SysV runlevels.

| Target | Old runlevel | Meaning |
|--------|--------------|---------|
| `multi-user.target` | 3 | Full system, no GUI (typical server) |
| `graphical.target` | 5 | Multi-user with GUI |
| `rescue.target` | 1 | Single-user, minimal recovery |
| `reboot.target` | 6 | Reboot |
| `poweroff.target` | 0 | Shut down |

```bash
systemctl get-default                        # current default target
sudo systemctl set-default multi-user.target # change boot target
sudo systemctl isolate rescue.target         # switch now
```

Power commands: `systemctl reboot`, `poweroff`, `suspend`, `hibernate`.

---

## Multi-Instance Services (brief)

A template unit uses `@` and `%i` so one file serves many instances. Name it `worker@.service`, use `ExecStart=/usr/bin/worker --id=%i`, then run `systemctl start worker@1` and `worker@2`. Useful for identical workers per queue, port, or shard.

---

## Troubleshooting a Failing Service

Work through this checklist when a service won't start:

```bash
systemctl status myapp -l              # 1. read the headline + error
journalctl -u myapp -n 100             # 2. read the full logs
systemd-analyze verify myapp.service   # 3. check unit file syntax
sudo -u nodeuser /usr/bin/node /opt/myapp/server.js   # 4. run ExecStart by hand
```

**Common causes:**

| Symptom | Likely cause |
|---------|--------------|
| Fails instantly | Bad `ExecStart` path, wrong `User`, missing `WorkingDirectory` |
| Starts then dies | App crashes — check logs; add `Restart=on-failure` |
| Enabled but not on boot | A dependency failed — check `systemctl --failed` |
| Changes ignored | Forgot `daemon-reload` after editing the unit |

---

## Interview Questions

**Q1: What's the difference between `systemctl start` and `systemctl enable`?**
`start` runs the service now, for this session only. `enable` configures it to start automatically on every boot. They are independent. Use `enable --now` to do both at once.

**Q2: How do you view logs for a specific service?**
`journalctl -u <service>`. Add `-f` to follow live, `-n 50` for the last 50 lines, `--since "1 hour ago"` to filter by time, and `-p err` to see only errors.

**Q3: `Requires=` vs `Wants=` — what's the difference?**
`Requires=` is a hard dependency: if the required unit fails, your service fails too. `Wants=` is soft: your service starts even if the wanted unit fails. Prefer `Wants` for optional dependencies to avoid cascading failures.

**Q4: What does `daemon-reload` do and when do you need it?**
Systemd caches unit files in memory. `systemctl daemon-reload` re-reads them from disk. Run it after creating or editing any unit file, otherwise systemd keeps using the old version.

**Q5: `Type=simple` vs `Type=forking`?**
With `simple`, the process in `ExecStart` is the service itself. With `forking`, systemd expects that process to fork a child and exit; the child is the real daemon. Use `simple` for modern foreground apps, `forking` for classic daemons that background themselves (set `PIDFile=` so systemd can track them).

---

## Summary

> **Control with `systemctl`:** `start`/`stop`/`restart`/`reload` for the running session, `enable`/`disable` for boot. `enable --now` does both. `start` and `enable` are independent.

> **Logs live in the journal:** `journalctl -u <service>` is your first stop when debugging. Combine with `-f`, `-n`, `--since`, and `-p`.

> **Unit files have three sections:** `[Unit]` (dependencies), `[Service]` (how to run), `[Install]` (boot hook). Always `daemon-reload` after editing, prefer `Wants` over `Requires`, and reach for timers instead of cron.

---
[← Back: Package Management](./05-package-management.md) | [Next: Security →](./07-security.md)
