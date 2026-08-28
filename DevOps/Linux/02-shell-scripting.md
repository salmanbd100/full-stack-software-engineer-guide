---
title: Shell Scripting for DevOps
part: 8
chapter: 0
slug: shell-scripting
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-07-05
tags: [devops, linux, shell, scripting]
in_book: false
---

# Shell Scripting for DevOps

## Overview

Shell scripting is the glue of DevOps automation. Bash scripts wire tools together, run deploys, back up data, and drive CI/CD steps. You reach for Bash when a task is a short sequence of shell commands. For anything with complex data structures or heavy logic, use Python instead.

| Good fit for Bash | Reach for Python instead |
|-------------------|--------------------------|
| Chaining CLI tools (aws, kubectl, git) | Parsing JSON/XML, math-heavy logic |
| File and log wrangling | Anything over ~200 lines |
| Deploy, backup, health-check scripts | Complex data structures |

---

## Script Structure

### 💡 **Shebang + strict mode**
Every script starts with a shebang and a safety header. This turns silent failures into loud ones.

**Standard header for every script**

```bash
#!/usr/bin/env bash   # find bash on PATH — portable across distros/macOS
set -euo pipefail     # the "unofficial strict mode"
```

`set -euo pipefail` bundles three separate safety flags:

| Flag | Without it | With it |
|------|-----------|---------|
| `set -e` | Script keeps running after a command fails | Exits on first non-zero exit code |
| `set -u` | Typo in a var name expands to empty string | Errors on any undefined variable |
| `set -o pipefail` | `cmd1 \| cmd2` only reports cmd2's status | Fails if any command in the pipe fails |

> **Key Insight:** Without `pipefail`, `false | true` returns success. That hides broken pipelines like `curl ... | grep ...` where `curl` failed but `grep` ran fine.

**A well-structured script defines functions first, then calls `main`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Resolve script's own dir so it works no matter where it's called from
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_NAME="my-app"

main() {
  check_prerequisites
  deploy_application
}

check_prerequisites() { echo "Checking..."; }
deploy_application()  { echo "Deploying..."; }

main "$@"   # pass all script args to main
```

> **Key Insight:** `# set -x` prints each command before running it. Uncomment it for a temporary trace when debugging a misbehaving script.

---

## Variables and Quoting

### 💡 **Always brace and quote: `"${var}"`**
Braces disambiguate names, quotes stop word-splitting on spaces. This one habit prevents most Bash bugs.

**Assignment and command substitution**

```bash
name="DevOps"                 # no spaces around =
today=$(date +%Y-%m-%d)       # capture command output
readonly MAX_RETRIES=3        # constant — cannot be reassigned
export AWS_REGION="us-east-1" # visible to child processes
```

**Why quoting matters**

```bash
file="my report.txt"
rm $file      # ❌ deletes "my" and "report.txt" — two files
rm "$file"    # ✅ deletes one file "my report.txt"
```

**Default values guard against unset variables**

```bash
env="${1:-staging}"                  # use "staging" if $1 is unset
echo "${API_URL:?API_URL is required}"  # exit with error if unset
```

**Arrays hold lists safely (spaces preserved)**

```bash
servers=("web-1" "web-2" "web-3")
echo "${servers[0]}"        # first element
echo "${#servers[@]}"       # count = 3
for s in "${servers[@]}"; do echo "$s"; done  # quote to keep items intact
```

### Special variables

| Variable | Meaning |
|----------|---------|
| `$0` | Script name |
| `$1`, `$2` | Positional arguments |
| `$#` | Number of arguments |
| `"$@"` | All args as **separate** quoted words (almost always what you want) |
| `$*` | All args as one string |
| `$?` | Exit status of the last command |
| `$$` | Current process ID |

> **Key Insight:** `"$@"` becomes `"web-1" "web-2"` while `"$*"` becomes `"web-1 web-2"`. Use `"$@"` to forward arguments to another command without mangling spaces.

---

## Control Structures

### 💡 **Prefer `[[ ]]` over `[ ]`**
`[[ ]]` is a Bash keyword with safer parsing, pattern matching, and regex. `[ ]` is the old POSIX command that word-splits its arguments.

```bash
# Both work, but [[ ]] is safer and more capable
if [[ "$NODE_ENV" == "production" ]]; then
  echo "Production"
elif [[ "$NODE_ENV" == "staging" ]]; then
  echo "Staging"
else
  echo "Unknown env"; exit 1
fi

# [[ ]] extras you don't get with [ ]
[[ "$file" == *.log ]]                 # glob pattern match
[[ "$email" =~ ^[^@]+@[^@]+$ ]]        # regex match
[[ "$a" -gt 5 && "$b" -lt 10 ]]        # && / || inside the test
```

### Common test operators

| Test | True when |
|------|-----------|
| `[[ "$a" == "$b" ]]` | Strings equal |
| `[[ -z "$a" ]]` / `[[ -n "$a" ]]` | String empty / not empty |
| `[[ "$a" -eq "$b" ]]` | Numbers equal (also `-ne -lt -le -gt -ge`) |
| `[[ -f path ]]` / `[[ -d path ]]` | Regular file / directory exists |
| `[[ -e path ]]` | Path exists (any type) |
| `[[ -r/-w/-x path ]]` | Readable / writable / executable |
| `[[ -s path ]]` | File exists and is non-empty |

**Loops — the ones you actually use**

```bash
for i in {1..5}; do echo "$i"; done          # range
for f in /var/log/*.log; do echo "$f"; done  # glob over files

# Read a file or command output line by line (safest pattern)
while IFS= read -r line; do
  echo "Line: $line"
done < /etc/hosts
```

> ⚠️ Always use `while IFS= read -r` to read lines. Without `-r`, backslashes get mangled; without `IFS=`, leading/trailing spaces are stripped.

**`case` is cleaner than long if/elif chains**

```bash
case "$1" in
  start)   systemctl start myapp ;;
  stop)    systemctl stop myapp ;;
  restart) systemctl restart myapp ;;
  *)       echo "Usage: $0 {start|stop|restart}"; exit 1 ;;
esac
```

---

## Functions

### 💡 **`local` variables and status vs output**
Bash functions "return" in two ways: an **exit status** (0–255, for success/failure) and **stdout** (for actual values you capture).

```bash
# Return a VALUE via stdout — capture with $(...)
add() {
  local a="$1" b="$2"   # local = don't leak into global scope
  echo $((a + b))
}
result=$(add 5 10)       # result=15

# Return a STATUS for use in if — 0 = success, non-zero = failure
file_exists() {
  [[ -f "$1" ]]          # the test's exit code becomes the return status
}
if file_exists /etc/hosts; then echo "found"; fi
```

> **Key Insight:** `return` only sets a status code (0–255). To hand back a string or number, `echo` it and capture with `$(...)`. Send errors to stderr with `>&2` so they don't pollute captured output.

**Default parameters and validation**

```bash
deploy() {
  local env="${1:-staging}"     # default when arg omitted
  local version="${2:-latest}"
  echo "Deploying $version to $env"
}
```

---

## Error Handling

### 💡 **`trap` for cleanup, retry for flaky ops**
`set -e` exits on failure, but you often need cleanup to run and transient failures to be retried.

**Guarantee cleanup runs, even on failure**

```bash
set -euo pipefail

tmpfile=$(mktemp)
cleanup() { rm -f "$tmpfile"; }
trap cleanup EXIT   # runs on normal exit AND on error

# ... work with $tmpfile; it's always removed afterward
```

**Retry transient failures (network calls, health checks)**

```bash
retry() {
  local max=3 delay=5 attempt=1
  until "$@"; do                 # "$@" = the command + its args
    if (( attempt >= max )); then
      echo "Failed after $max attempts" >&2
      return 1
    fi
    echo "Attempt $attempt failed, retrying in ${delay}s..." >&2
    sleep "$delay"
    ((attempt++))
  done
}

retry curl -sf https://api.example.com/health
```

**A reusable logging helper**

```bash
log()       { echo "[$(date '+%F %T')] [$1] ${*:2}"; }
log_info()  { log INFO  "$@"; }
log_error() { log ERROR "$@" >&2; }   # errors go to stderr

log_info  "Starting deployment"
log_error "Deployment failed"
```

**Quick failure patterns**

```bash
command || { echo "failed" >&2; exit 1; }   # run-or-die on one line

if ! aws sts get-caller-identity &>/dev/null; then
  echo "AWS credentials not configured" >&2; exit 1
fi
```

---

## Real-World Example: Deploy Script

This one script pulls together everything above — strict mode, functions, `case`, health checks with retry, and logging. Backup and cloud-provisioning scripts follow the same shape.

**`deploy.sh` — deploy a version to each server with health checks**

```bash
#!/usr/bin/env bash
set -euo pipefail

readonly APP_NAME="myapp"
readonly DEPLOY_USER="deploy"

log_info()  { echo "[INFO]  $*"; }
log_error() { echo "[ERROR] $*" >&2; }

# Return the server list for an environment (value via stdout)
get_servers() {
  case "$1" in
    staging)    echo "staging-web-1 staging-web-2" ;;
    production) echo "prod-web-1 prod-web-2 prod-web-3" ;;
    *)          log_error "Unknown env: $1"; exit 1 ;;
  esac
}

# Poll /health until it responds or we give up (status, not value)
health_check() {
  local server="$1" attempt=1
  until curl -sf "http://$server/health" >/dev/null; do
    (( attempt >= 10 )) && { log_error "$server unhealthy"; return 1; }
    log_info "waiting on $server ($attempt/10)..."
    sleep 5; ((attempt++))
  done
  log_info "$server is healthy"
}

deploy_to_server() {
  local server="$1" version="$2"
  log_info "Deploying $version to $server"
  scp "build/$APP_NAME-$version.tar.gz" "$DEPLOY_USER@$server:/tmp/"
  ssh "$DEPLOY_USER@$server" "cd /opt/$APP_NAME && \
    tar -xzf /tmp/$APP_NAME-$version.tar.gz && \
    systemctl restart $APP_NAME"
  health_check "$server"   # non-zero here trips set -e and aborts
}

main() {
  [[ $# -eq 2 ]] || { echo "Usage: $0 <env> <version>"; exit 1; }
  local env="$1" version="$2"
  for server in $(get_servers "$env"); do
    deploy_to_server "$server" "$version"
  done
  log_info "Deployment complete"
}

main "$@"
```

---

## Interview Questions

**Q1: What is the shebang and why does it matter?**
A: The first line, like `#!/usr/bin/env bash`, tells the OS which interpreter runs the script. Using `env bash` finds Bash on the `PATH`, so it works across Linux distros and macOS where Bash may live in different locations. Without a shebang, the script runs under whatever shell the caller happens to use, which can break Bash-specific syntax.

**Q2: What is the difference between `$@` and `$*`?**
A: Both expand to all positional arguments. Quoted, `"$@"` expands to each argument as a separate word (`"a" "b c"`), preserving spaces. `"$*"` joins them into one string (`"a b c"`). Almost always use `"$@"` to forward arguments to another command safely.

**Q3: Explain `set -euo pipefail`.**
A: Three safety flags. `-e` exits on the first command that fails. `-u` treats any unset variable as an error (catches typos). `-o pipefail` makes a pipeline fail if any command in it fails, not just the last one. Together they turn silent failures into immediate, visible errors.

**Q4: What is the difference between `[ ]` and `[[ ]]`?**
A: `[ ]` is the POSIX `test` command; it word-splits and needs careful quoting. `[[ ]]` is a Bash keyword with no word-splitting, plus glob pattern matching (`==`), regex (`=~`), and `&&`/`||` inside the test. Prefer `[[ ]]` in Bash scripts; use `[ ]` only when you need POSIX `sh` portability.

**Q5: How do you handle errors and ensure cleanup in a Bash script?**
A: Start with `set -euo pipefail`. Use `trap cleanup EXIT` so temp files and locks are removed whether the script succeeds or fails. Send error messages to stderr with `>&2`, check exit codes, and wrap flaky network calls in a retry loop with backoff. For a function returning a value, `echo` the result and capture with `$(...)`; use `return` only for status codes.

---

## Summary

> **Strict mode is non-negotiable.** Start every script with `#!/usr/bin/env bash` and `set -euo pipefail` to fail loud and early.

> **Quote everything.** `"${var}"` and `"$@"` prevent the word-splitting bugs that cause most shell script failures.

> **Structure for reliability.** Small functions with `local` vars, `trap` for cleanup, retry for transient failures, and logging to stderr make automation you can trust.

---
[← Back: Linux Fundamentals](./01-linux-fundamentals.md) | [Next: System Monitoring →](./03-system-monitoring.md)
