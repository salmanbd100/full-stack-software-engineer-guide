---
title: SAST — Static Application Security Testing
part: 8
chapter: 0
slug: sast
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-04
tags: [devops, devsecops, sast]
in_book: false
---

# SAST — Static Application Security Testing

SAST analyses **source code without running it**, looking for patterns that lead to vulnerabilities. It is the earliest place you can catch a security bug in your own code.

## How It Works

```
Source code
    ↓
Parse → Abstract Syntax Tree
    ↓
Build data flow / control flow graph
    ↓
Trace: does untrusted input (source)
       reach a dangerous operation (sink)
       without passing a sanitizer?
    ↓
Finding
```

**Source → sink is the core idea:**

| Term | Meaning | Example |
|------|---------|---------|
| **Source** | Where untrusted data enters | `req.query`, `req.body`, an env var |
| **Sink** | Where it becomes dangerous | SQL query, `exec()`, HTML output |
| **Sanitizer** | What makes it safe | Parameterized query, escaping, validation |

**What SAST catches well:**

```typescript
// ❌ SQL injection — SAST traces req.params.id (source) into the query (sink)
app.get("/users/:id", async (req: Request, res: Response) => {
  const result = await db.query(
    `SELECT * FROM users WHERE id = '${req.params.id}'`  // 🔴 flagged
  );
  res.json(result.rows);
});

// ✅ Parameterized — the sanitizer breaks the taint path
app.get("/users/:id", async (req: Request, res: Response) => {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [
    req.params.id,
  ]);
  res.json(result.rows);
});
```

```typescript
// ❌ Command injection
import { exec } from "node:child_process";

function convert(filename: string): void {
  exec(`convert ${filename} out.png`); // 🔴 filename could be "; rm -rf /"
}

// ✅ No shell involved — arguments are passed as an array
import { execFile } from "node:child_process";

function convert(filename: string): void {
  execFile("convert", [filename, "out.png"]);
}
```

## What SAST Can and Cannot Find

| ✅ Finds Reliably | ❌ Cannot Find |
|------------------|---------------|
| SQL / command / LDAP injection | **Broken access control** (needs intent) |
| XSS from unescaped output | Business logic flaws |
| Hard-coded secrets and weak crypto | Misconfigured infrastructure |
| Path traversal | Vulnerabilities in dependencies (that's SCA) |
| Unsafe deserialization | Anything requiring a running system |
| Missing TLS verification | Authentication bypass by design |

🔴 **The biggest blind spot is authorization.** SAST cannot know that `getOrder(id)` should verify the order belongs to the caller — that is intent, not a pattern.

```typescript
// SAST sees nothing wrong here. It is a critical IDOR vulnerability.
app.get("/api/orders/:id", async (req: AuthedRequest, res: Response) => {
  const order = await orders.findById(req.params.id);
  res.json(order); // 🔴 any user can read any order
});

// ✅ Ownership check — a human or a test must catch this
app.get("/api/orders/:id", async (req: AuthedRequest, res: Response) => {
  const order = await orders.findById(req.params.id);
  if (order?.userId !== req.user.id) return res.sendStatus(404);
  res.json(order);
});
```

> Access control is the number one category in the OWASP Top 10 and the category SAST is worst at. Cover it with code review and integration tests.

## Tool Landscape

| Tool | Type | Strength |
|------|------|----------|
| **Semgrep** | OSS + commercial | ✅ Fast, readable custom rules, great CI fit |
| **CodeQL** (GitHub) | Free for public repos | Deep data flow, query language, strong for OSS |
| **SonarQube** | Self-host / cloud | Quality **and** security, coverage gates |
| **Snyk Code** | Commercial | Fast, good IDE integration |
| **Checkmarx / Fortify** | Enterprise | Compliance reporting, deep but slow and noisy |
| **ESLint security plugins** | Linter | ⚠️ Not real SAST — no data flow analysis |

✅ For most teams: **Semgrep** for custom rules plus **CodeQL** if you are on GitHub. Both give strong results without enterprise licensing.

**A custom Semgrep rule — how you encode your own standards:**

```yaml
# .semgrep/no-raw-sql.yml
rules:
  - id: no-string-interpolated-sql
    languages: [typescript]
    severity: ERROR
    message: >
      Use parameterized queries. String interpolation into SQL allows injection.
    patterns:
      - pattern: $DB.query(`...${$X}...`)
      - pattern-not: $DB.query(`...`, [...])
```

✨ Custom rules are where SAST earns its keep. Encode the mistake your team actually made last quarter, so it can never merge again.

## Wiring It Into CI

```yaml
name: sast
on:
  pull_request:

# Least privilege — only what's needed to comment on the PR
permissions:
  contents: read
  security-events: write

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Semgrep scan
        run: |
          pip install semgrep
          # Only fail on findings the scanner is confident about
          semgrep scan \
            --config p/typescript \
            --config p/owasp-top-ten \
            --config .semgrep/ \
            --severity ERROR \
            --sarif --output semgrep.sarif

      # Upload results so they appear inline on the PR diff
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif
```

**Two settings that decide whether the team accepts SAST:**

| Setting | Why |
|---------|-----|
| **Diff-aware scanning** | Only scan changed code. A 10-year-old repo has thousands of pre-existing findings |
| **Results on the PR diff** | A finding shown as an inline comment gets fixed; one in a separate portal does not |

⚠️ Never introduce SAST by failing the build on a full-repo scan of a legacy codebase. Baseline the existing findings, then block only **new** ones.

## Managing Findings

**The triage decision tree:**

```
New finding
    ↓
Is the source genuinely untrusted?  ── no ──► false positive, suppress with reason
    ↓ yes
Is the sink reachable in production? ── no ──► low priority
    ↓ yes
Is there a sanitizer the tool missed? ── yes ──► false positive, suppress
    ↓ no
🔴 Real. Fix it.
```

**Suppressing correctly:**

```typescript
// ✅ Documented, specific, reviewable
// nosemgrep: no-string-interpolated-sql
// Table name comes from a hard-coded allowlist above, not user input.
const rows = await db.query(`SELECT * FROM ${validatedTableName}`);
```

❌ A blanket `// nosemgrep` at the top of a file disables everything, forever, invisibly.
✅ Suppress one rule, on one line, with a reason. Require review of suppressions in the PR.

## Common Mistakes

| Mistake | Consequence |
|---------|------------|
| Turning on every ruleset at once | Thousands of findings, tool abandoned |
| Failing the build on all severities | `|| true` appears within a week |
| Scanning only on merge to `main` | Feedback arrives after review is done |
| No custom rules | Misses the flaws specific to your codebase |
| Treating SAST as sufficient | Misses access control, logic, dependencies, config |
| Results only in a separate dashboard | Nobody looks |

## Interview Q&A

**Q: What is SAST and how does it differ from DAST?**

SAST analyses source code or bytecode without executing it, tracing how untrusted input flows through the program to reach a dangerous operation. Because it works on the code itself, it runs early — on a pull request — and it can point at the exact line to fix. DAST instead attacks a running application from the outside with no knowledge of the source, so it finds what is actually exploitable through real HTTP requests, including configuration and deployment problems that do not exist in code. The trade-off is coverage versus certainty: SAST sees every code path but produces false positives because it cannot know runtime context, while DAST has few false positives but only tests the paths it can reach and cannot tell you which line is wrong. They are complementary, and a mature pipeline runs both.

**Q: What kinds of vulnerabilities does SAST miss?**

The main one is broken access control, which is the top category in the OWASP Top 10. A handler that fetches a record by ID and returns it looks perfectly correct to a scanner; the fact that it should first check the record belongs to the caller is intent, not a detectable pattern. Business logic flaws are the same — applying a discount twice, or a negative quantity producing a refund. SAST also cannot see infrastructure misconfiguration, vulnerabilities in third-party dependencies, which is what software composition analysis covers, or anything that depends on runtime state such as an environment variable set incorrectly in production. So SAST needs pairing with code review and authorization tests for access control, SCA for dependencies, IaC scanning for configuration, and DAST or runtime detection for the rest.

**Q: How would you introduce SAST into a large existing codebase?**

Not by turning it on and failing the build, because a mature repository will produce thousands of pre-existing findings and the team will disable the tool. I would start by running a full scan to establish a baseline, then configure diff-aware scanning so only code changed in the pull request is evaluated. That way the build only fails on newly introduced problems, which are the ones the author has context to fix. I would enable a narrow, high-confidence ruleset first — injection, hard-coded secrets, unsafe deserialization — and expand it as trust builds. Results should appear as inline comments on the diff rather than in a separate portal, because location drives whether they get fixed. The historical backlog then becomes a separate, prioritized piece of work rather than a blocker on delivery.

**Q: Why do custom SAST rules matter more than the built-in ones?**

Built-in rules cover the well-known generic patterns, which every scanner already does reasonably well. Custom rules let you encode the standards and mistakes specific to your organization — that all database access must go through the repository layer, that a particular internal HTTP client must be used because it enforces mutual TLS, that a deprecated crypto helper must never appear again, or the exact mistake that caused last quarter's incident. This turns a postmortem action item into a control that cannot regress, which is far more durable than documentation or tribal knowledge. Tools like Semgrep make this practical because rules are written as code patterns in YAML rather than requiring a proprietary query language, so the developers who understand the codebase can write them.

**Q: A developer says a SAST finding is a false positive. How do you handle it?**

I would ask them to explain why, specifically: is the source actually trusted, is there a sanitizer the tool did not recognize, or is the sink unreachable? Frequently they are right, because static analysis lacks runtime context — a value that looks user-controlled might come from a hard-coded allowlist. If it is genuinely a false positive, the resolution is a narrowly scoped suppression on that single line, naming the specific rule and including a comment explaining the reasoning, so the next reader can re-evaluate it. What I would not accept is a file-level or repository-level suppression, because that silently disables the rule for future code as well. I would also feed the pattern back into the rule configuration, since a false positive that recurs across the codebase is a tuning problem rather than something to suppress repeatedly.

---

[← Fundamentals](./01-fundamentals.md) | [Index](./README.md) | [DAST →](./03-dast.md)
