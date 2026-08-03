# Advanced Bash Scripting

Bash is the language your automation actually runs in. This file covers the patterns that make a script safe to run in production and the pitfalls that cause outages.

> For basics — variables, loops, conditionals — see [Shell Scripting](../Linux/02-shell-scripting.md).

## 🔴 The Safety Header

Every production script starts with this. It is the highest-value four lines in the file.

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
```

| Option | Without It |
|--------|-----------|
| `-e` | 🔴 The script continues after a command fails |
| `-u` | A typo'd variable expands to empty, silently |
| `-o pipefail` | 🔴 A failure mid-pipeline is invisible |
| `-E` | `ERR` traps do not fire inside functions |
| `IFS=$'\n\t'` | Word splitting on spaces breaks filenames |

**Why `pipefail` matters — this is the classic disaster:**

```bash
# ❌ Without pipefail: exit status is grep's, so a curl failure is INVISIBLE
curl -s https://api.acme.com/servers | grep -o 'i-[a-z0-9]*' > instances.txt
# curl fails → empty file → grep finds nothing → exit 0 → script continues

while read -r id; do
  aws ec2 terminate-instances --instance-ids "$id"   # 🔴 or worse, an empty loop
done < instances.txt
```

⚠️ `set -e` has real exceptions you must know:

```bash
# -e does NOT trigger in these contexts
if failing_command; then :; fi      # condition context
failing_command || true             # explicitly handled
failing_command && other            # part of a list

# 🔴 Command substitution in an assignment loses the exit status
output=$(failing_command)           # -e DOES fire here (bash 4.4+)
local output=$(failing_command)     # 🔴 but NOT with local/declare/export
```

✅ Split the declaration from the assignment:

```bash
local output
output=$(failing_command)   # now -e fires correctly
```

## Error Handling and Cleanup

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_NAME="${0##*/}"
readonly TMPDIR_PATH="$(mktemp -d)"

log()  { printf '[%s] %s: %s\n' "$(date -u +%FT%TZ)" "$1" "${*:2}" >&2; }
info() { log INFO "$@"; }
err()  { log ERROR "$@"; }

# ✅ Runs on ANY exit — success, failure, or interrupt
cleanup() {
  local exit_code=$?
  rm -rf "$TMPDIR_PATH"
  [[ $exit_code -ne 0 ]] && err "exited with status $exit_code"
  exit "$exit_code"
}
trap cleanup EXIT

# ✅ Report exactly where it failed
on_error() {
  err "failed at line $1: command was '$2'"
}
trap 'on_error "$LINENO" "$BASH_COMMAND"' ERR

main() {
  info "starting $SCRIPT_NAME"
  # ... work ...
}

# ✅ Only run main when executed, not when sourced (makes the script testable)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
```

✅ **`trap cleanup EXIT` is what makes a script safe to interrupt.** Temporary files, lock files, and partially-applied changes get cleaned up even on Ctrl-C.

## 🔴 Quoting — the Source of Most Bugs

```bash
files="my file.txt"

rm $files      # 🔴 rm "my" "file.txt" — deletes the wrong things
rm "$files"    # ✅ one argument

# Arrays: "${arr[@]}" vs "${arr[*]}"
args=("--tags" "Key=Name,Value=my server")
aws ec2 create-tags "${args[@]}"   # ✅ each element stays one argument
aws ec2 create-tags "${args[*]}"   # 🔴 collapses into one string
```

**The catastrophic pattern:**

```bash
# 🔴 If BASE is unset, this is `rm -rf /*`
rm -rf "$BASE/"*

# ✅ Guard it
: "${BASE:?BASE must be set}"          # fail immediately if unset or empty
[[ -d "$BASE" ]] || { err "not a directory: $BASE"; exit 1; }
rm -rf -- "${BASE:?}/"*
```

✅ `${VAR:?message}` aborts with a clear error if the variable is unset or empty. Use it for every path you are about to delete.

| Expansion | Meaning |
|-----------|---------|
| `${VAR:-default}` | Use `default` if unset/empty (does not assign) |
| `${VAR:=default}` | Use and **assign** the default |
| `${VAR:?msg}` | ✅ Abort with `msg` if unset/empty |
| `${VAR:+alt}` | Use `alt` only if VAR **is** set |
| `${#VAR}` | Length |
| `${VAR%.txt}` | Strip shortest suffix match |
| `${VAR##*/}` | ✅ Strip longest prefix — basename |
| `${VAR//old/new}` | Replace all |

## Loops That Do Not Break

```bash
# 🔴 Word-splits on spaces, glob-expands, breaks on empty output
for f in $(ls *.log); do ...; done

# ✅ Glob directly, and handle the no-match case
shopt -s nullglob
for f in ./*.log; do
  process "$f"
done

# ✅ Null-delimited — the only fully safe way with find
while IFS= read -r -d '' f; do
  process "$f"
done < <(find . -name '*.log' -print0)
```

🔴 **A pipeline creates a subshell, so variables do not persist:**

```bash
count=0
find . -name '*.log' | while read -r f; do
  ((count++))
done
echo "$count"   # 🔴 prints 0 — the loop ran in a subshell

# ✅ Process substitution keeps the loop in the current shell
count=0
while IFS= read -r f; do
  ((count++))
done < <(find . -name '*.log')
echo "$count"   # ✅ correct
```

## AWS CLI in Scripts

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

readonly REGION="${AWS_REGION:?AWS_REGION must be set}"
readonly CLUSTER="${1:?usage: $0 <cluster-name>}"

# ✅ Always check the identity before doing anything destructive
verify_account() {
  local expected="$1" actual
  actual=$(aws sts get-caller-identity --query Account --output text)
  if [[ "$actual" != "$expected" ]]; then
    err "wrong account: expected $expected, got $actual"
    exit 1
  fi
  info "verified account $actual"
}

# ✅ Retry with exponential backoff for throttling
aws_retry() {
  local max=5 attempt=1 delay=2
  until "$@"; do
    if (( attempt >= max )); then
      err "failed after $max attempts: $*"
      return 1
    fi
    info "attempt $attempt failed, retrying in ${delay}s"
    sleep "$delay"
    (( attempt++, delay *= 2 ))
  done
}

# ✅ --query for server-side filtering, jq only when you need real logic
get_unhealthy_targets() {
  aws elbv2 describe-target-health \
    --target-group-arn "$1" \
    --query 'TargetHealthDescriptions[?TargetHealth.State!=`healthy`].Target.Id' \
    --output text
}

main() {
  verify_account "111122223333"
  aws_retry aws eks describe-cluster --name "$CLUSTER" --region "$REGION" >/dev/null
  info "cluster $CLUSTER is reachable"
}

main "$@"
```

> ✅ **`aws sts get-caller-identity` before any destructive action is the single best habit in AWS scripting.** It is what prevents running the staging teardown script against production.

⚠️ **`--output text` with `--query` returning nothing produces an empty string, not an error.** Always check whether the result is empty before looping over it.

```bash
targets=$(get_unhealthy_targets "$ARN")
if [[ -z "$targets" ]]; then
  info "no unhealthy targets"
  exit 0
fi
```

## Concurrency

```bash
# ✅ Bounded parallelism with xargs — simplest correct approach
printf '%s\n' "${INSTANCE_IDS[@]}" | \
  xargs -P 8 -I {} aws ec2 create-tags --resources {} --tags Key=Patched,Value=true

# ✅ Wait for background jobs and collect failures
pids=()
for id in "${INSTANCE_IDS[@]}"; do
  process_instance "$id" &
  pids+=("$!")
done

failed=0
for pid in "${pids[@]}"; do
  wait "$pid" || { err "pid $pid failed"; (( failed++ )); }
done
(( failed == 0 )) || exit 1
```

⚠️ `xargs -P` without `-n` or `-I` can batch arguments unexpectedly. `-I {}` guarantees one invocation per line.

## Locking

Prevent two copies of a cron job running at once.

```bash
readonly LOCKFILE="/var/lock/$(basename "$0").lock"

exec 9>"$LOCKFILE"
if ! flock -n 9; then
  info "another instance is running; exiting"
  exit 0
fi
# Lock is released automatically when the script exits
```

✅ `flock` on a file descriptor is race-free and self-releasing, unlike checking for a PID file.

## Idempotency

A script that can safely run twice is worth far more than one that cannot.

```bash
# ❌ Fails on the second run
aws s3 mb "s3://$BUCKET"

# ✅ Check first
if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  aws s3 mb "s3://$BUCKET"
  info "created bucket $BUCKET"
else
  info "bucket $BUCKET already exists"
fi
```

✅ **Every automation script should be safe to re-run**, because it will be — after a partial failure, from a retry, or by someone unsure whether it worked.

## Dry Run

```bash
DRY_RUN="${DRY_RUN:-false}"

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    info "[dry-run] $*"
  else
    "$@"
  fi
}

run aws ec2 terminate-instances --instance-ids "$id"
```

✅ Make destructive scripts default to dry-run and require an explicit flag to act. The cost is one extra invocation; the benefit is not deleting production.

## Testing and Linting

```bash
# ✅ ShellCheck catches the majority of real bash bugs statically
shellcheck -x -S warning scripts/*.sh
```

```bash
# bats-core — unit tests for shell
@test "verify_account rejects the wrong account" {
  aws() { echo "999999999999"; }
  export -f aws
  run verify_account "111122223333"
  [ "$status" -eq 1 ]
  [[ "$output" == *"wrong account"* ]]
}
```

🔴 **Run ShellCheck in CI.** It finds unquoted variables, useless `cat`, and subshell scoping bugs that pass review because they look fine.

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| No `set -euo pipefail` | Failures pass silently | The safety header |
| Missing `pipefail` | 🔴 A failed `curl` in a pipeline is invisible | Include it |
| Unquoted variables | Word splitting, glob expansion | Quote everything |
| `rm -rf "$VAR/"*` unguarded | 🔴 `rm -rf /*` if unset | `${VAR:?}` |
| `for f in $(ls)` | Breaks on spaces | Glob or `find -print0` |
| Counting inside a piped loop | Subshell loses the variable | Process substitution |
| `local x=$(cmd)` | `set -e` does not fire | Declare, then assign |
| No account verification | Ran against the wrong environment | `sts get-caller-identity` |
| No lock on a cron script | Overlapping runs | `flock` |
| Not idempotent | Second run fails or duplicates | Check state first |

## Interview Q&A

**Q: What does `set -euo pipefail` do and why does every script need it?**

`-e` exits on any command failure, which stops a script blindly continuing after something broke. `-u` treats an unset variable as an error, which catches typos that would otherwise silently expand to an empty string — dangerous when that string is part of a path you are deleting. `-o pipefail` makes a pipeline return the exit status of the first failing command rather than the last, which is the one people miss and the one that causes real damage: without it, `curl ... | grep ...` returns grep's status, so a failed API call produces an empty result and the script proceeds as though everything is fine. I would add `-E` so that ERR traps fire inside functions. Together they turn bash from a language that hides failure into one that surfaces it. The exceptions worth knowing are that `-e` does not fire in a condition context, when a failure is explicitly handled with `||`, or in a `local x=$(cmd)` assignment — which is why you declare and assign on separate lines.

**Q: Why is `rm -rf "$BASE/"*` dangerous, and how do you make it safe?**

If `BASE` is unset or empty, the expansion becomes `rm -rf /*`, and you have deleted the filesystem. Even with `set -u` this can slip through if the variable is set but empty. The fix is `${BASE:?BASE must be set}`, which aborts with a clear error message when the variable is unset or empty, so the destructive command never runs. I would also verify it is actually a directory before proceeding, and use `--` to terminate option parsing so a path beginning with a hyphen cannot be interpreted as a flag. More generally, destructive scripts should default to dry-run mode and require an explicit flag to act, and any script touching AWS should verify the account with `sts get-caller-identity` first — the most expensive scripting mistakes are usually running the right script against the wrong environment rather than a logic bug.

**Q: Why does a counter incremented inside a piped `while` loop stay at zero?**

Because each stage of a pipeline runs in its own subshell, so the loop body executes in a child process. Variables it modifies are local to that child, and when the pipeline ends the child exits and the changes are lost — the parent shell's counter was never touched. It catches people constantly because the code reads correctly and the loop genuinely executes. The fix is process substitution: `while read ...; do ...; done < <(command)` keeps the loop in the current shell, so variable assignments persist. Alternatives are accumulating output and processing it after the loop, or using `shopt -s lastpipe` in bash, though process substitution is clearer and more portable in practice.

**Q: How do you make an automation script safe to re-run?**

By making every action check state before acting rather than assuming a clean starting point. Creating a bucket becomes checking whether it exists first; adding a tag is naturally idempotent; adding a rule to a security group needs a check because the API errors on duplicates. This matters because scripts do get re-run — after a partial failure, from an automatic retry, or by someone who is not sure whether the first run worked. A script that fails on the second run turns a recoverable partial failure into a manual cleanup job. I would pair that with a `trap cleanup EXIT` so temporary files and lock files are removed on any exit path including interruption, and `flock` on anything running from cron so two copies cannot overlap. Declarative tools like Terraform give you this property for free, which is a good argument for using them rather than scripting infrastructure changes.

**Q: What is the difference between `"${arr[@]}"` and `"${arr[*]}"`?**

`"${arr[@]}"` expands to each element as a separate quoted word, while `"${arr[*]}"` joins all elements into a single string separated by the first character of IFS. For passing arguments to a command you almost always want `[@]`, because `[*]` collapses an array of arguments into one argument. The difference becomes visible as soon as any element contains a space: an array holding `--tags` and `Key=Name,Value=my server` passed with `[*]` arrives at the command as one mangled string, whereas `[@]` preserves the two distinct arguments. The same distinction applies to `"$@"` versus `"$*"` for a script's own parameters, which is why `main "$@"` is the correct way to forward arguments.

**Q: How do you handle AWS API throttling in a shell script?**

With a retry wrapper implementing exponential backoff, because throttling is expected rather than exceptional — the AWS APIs rate-limit per account and region, and a script iterating over a few hundred resources will hit it. The wrapper attempts the command, and on failure sleeps for a delay that doubles each attempt up to a maximum retry count, logging each attempt so the behaviour is visible rather than looking like a hang. I would also reduce the need for retries: use `--query` for server-side filtering so you make fewer calls returning less data, use paginated bulk APIs rather than a call per resource where one exists, and bound parallelism with `xargs -P` rather than launching hundreds of concurrent requests. The AWS CLI has some built-in retry behaviour configurable through `max_attempts` and `retry_mode` set to adaptive, which is worth enabling, but explicit backoff in the script gives you logging and control over what counts as fatal.

---
[Scripting Index](./README.md) | [Python for AWS →](./02-python-aws.md)
