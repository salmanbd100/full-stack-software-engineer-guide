/**
 * cli.test.ts — improvement #94
 *
 * The rule scripts are programs rather than modules: they read `process.cwd()`, print a
 * report and choose an exit code. So they are tested the way they are used — spawned
 * against a fixture repository with deliberate faults in it, asserting on what they say
 * and what they exit with.
 *
 * Testing them through the CLI rather than by exporting their internals is deliberate.
 * The exit code is the contract CI depends on, and a refactor to make the rules
 * importable would change the thing under test into something CI never runs.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";

const ROOT: string = process.cwd();

/** Front matter with every key the standard requires, so only the intended rule fires. */
function matter(title: string, chapter: number, slug: string): string[] {
  return [
    "---",
    `title: ${title}`,
    "part: 1",
    `chapter: ${chapter}`,
    `slug: ${slug}`,
    "level: intermediate",
    "reading_time: 8",
    "updated: 2026-09-23",
    "tags: [javascript]",
    "in_book: true",
    "---",
  ];
}

interface Run {
  stdout: string;
  status: number | null;
}

/** Run one of the repo's scripts with a fixture directory as its working directory. */
function run(script: string, cwd: string, args: string[] = []): Run {
  const result: SpawnSyncReturns<string> = spawnSync(
    process.execPath,
    ["--experimental-strip-types", join(ROOT, "scripts", script), ...args],
    { cwd, encoding: "utf8" },
  );
  return { stdout: result.stdout + result.stderr, status: result.status };
}

/** The count lint-docs printed for one rule, by the text of its label. */
function count(stdout: string, label: string): number {
  const line: string | undefined = stdout.split("\n").find((l: string) => l.includes(label));
  assert.ok(line, `no line for rule "${label}" in:\n${stdout}`);
  return Number(/\s(\d+)\s/.exec(line!)![1]);
}

// ---------------------------------------------------------------------------
// lint:docs, against a repository built to fail
// ---------------------------------------------------------------------------

describe("lint-docs", () => {
  let fixture: string;

  before(() => {
    fixture = mkdtempSync(join(tmpdir(), "lint-fixture-"));
    cpSync(join(ROOT, "BOOK-SPEC.md"), join(fixture, "BOOK-SPEC.md"));
    writeFileSync(join(fixture, ".lint-baseline.json"), "{}", "utf8");

    const dir: string = join(fixture, "Frontend", "JavaScript");
    mkdirSync(dir, { recursive: true });

    writeFileSync(join(dir, "README.md"), [...matter("JavaScript", 0, "js-index"), "", "# JavaScript {#ch-js-index}", ""].join("\n"), "utf8");

    // Clean: full front matter, matching anchor, all six blocks, a resolvable
    // cross-reference. If the lint reports anything against this file, the rule is wrong.
    writeFileSync(
      join(dir, "01-good.md"),
      [
        ...matter("Good", 1, "good"),
        "",
        "# Good {#ch-good}",
        "",
        "> One sentence saying what the reader can do.",
        "",
        "**In this chapter:** one thing · another thing · a third",
        "",
        "## 💡 The Core Idea",
        "",
        "The mental model, in plain words.",
        "",
        "## How It Works",
        "",
        "See [Chapter ?? — JavaScript](#ch-js-index).",
        "",
        "```typescript",
        "const x: number = 1;",
        "```",
        "",
        "## 🔑 Key Takeaways",
        "",
        "- One sentence that stands alone.",
        "",
        "## Interview Questions",
        "",
        "**Q: Is this a question?**",
        "",
        "Yes, and this is the shape of the answer.",
        "",
        "## What to Read Next",
        "",
        "- [Chapter ?? — JavaScript](#ch-js-index) — the section index",
        "",
      ].join("\n"),
      "utf8",
    );

    // Faulty: no front matter at all.
    writeFileSync(join(dir, "02-no-front-matter.md"), "# Orphan\n\nNothing above.\n", "utf8");

    // Faulty: a fence language the allow-list rejects, a heading jump, a dead
    // cross-reference and a relative link where an anchor belongs.
    writeFileSync(
      join(dir, "03-faults.md"),
      [
        ...matter("Faults", 2, "faults"),
        "",
        "# Faults {#ch-faults}",
        "",
        "See [Chapter ?? — Nowhere](#ch-nowhere).",
        "",
        "See [the other one](../JavaScript/01-good.md).",
        "",
        "### A heading that skipped a level",
        "",
        "```python",
        "print('not typescript')",
        "```",
        "",
      ].join("\n"),
      "utf8",
    );
  });

  after(() => rmSync(fixture, { recursive: true, force: true }));

  test("catches a file with no front matter", () => {
    assert.equal(count(run("lint-docs.ts", fixture).stdout, "Missing or invalid front matter"), 1);
  });

  test("catches a fence outside the allow-list", () => {
    assert.equal(count(run("lint-docs.ts", fixture).stdout, "Code fence outside the allow-list"), 1);
  });

  test("catches a heading level jump", () => {
    assert.equal(count(run("lint-docs.ts", fixture).stdout, "Heading level jump"), 1);
  });

  test("catches a cross-reference to an anchor no chapter carries", () => {
    const stdout: string = run("lint-docs.ts", fixture).stdout;
    assert.equal(count(stdout, "anchor no chapter carries"), 1);
    assert.ok(stdout.includes("ch-nowhere"), "the dead anchor was not named");
  });

  test("catches a relative file link where a cross-reference belongs", () => {
    assert.equal(count(run("lint-docs.ts", fixture).stdout, "Relative file link"), 1);
  });

  test("does not flag the clean chapter", () => {
    // Matched at the start of a violation line, not anywhere in the output: the
    // relative-link violation in 03-faults quotes "01-good.md" as its target.
    const reported: boolean = run("lint-docs.ts", fixture)
      .stdout.split("\n")
      .some((l: string) => /^\s+Frontend\/JavaScript\/01-good\.md:/.test(l));
    assert.equal(reported, false, "a chapter that meets the standard was reported");
  });

  test("exits non-zero when a rule goes up against the baseline", () => {
    // The gate CI depends on. An empty baseline means every violation is a regression.
    assert.notEqual(run("lint-docs.ts", fixture).status, 0);
  });

  test("--rule narrows the report to one rule", () => {
    const stdout: string = run("lint-docs.ts", fixture, ["--rule=fence-language"]).stdout;
    assert.ok(/1 violation\(s\) of fence-language/.test(stdout), stdout);
  });
});

// ---------------------------------------------------------------------------
// plan:check — the counters that decide where the next session starts
// ---------------------------------------------------------------------------

describe("plan-status --check", () => {
  let fixture: string;

  /** A plan with `done` of `total` items ticked, and the counters it claims. */
  function plan(done: number, total: number, claims: { header: number; tracker: number }): string {
    const items: string[] = [];
    for (let i = 1; i <= total; i++) {
      const box: string = i <= done ? "x" : " ";
      items.push(`### - [${box}] ${i}. Item ${i} \`S\`\n\n**Done when:** it is done.\n`);
    }
    return [
      "# Plan",
      "",
      `**Last updated:** 2026-09-23 · **Progress:** ${claims.header} / ${total}`,
      "",
      "| Items | Model | Effort | Why |",
      "| ----- | ----- | ------ | --- |",
      `| 1–${total} | **Opus 5** \`claude-opus-5\` | \`high\` | judgement |`,
      "",
      ...items,
      "## Progress Tracker",
      "",
      "| Phase | Items | Done | Status |",
      "| ----- | ----- | ---- | ------ |",
      `| 0     | 1–${total}   | ${claims.tracker}/${total}  | in progress |`,
      `| **Total** | **${total}** | **${claims.tracker}/${total}** | **50%**  |`,
      "",
    ].join("\n");
  }

  before(() => {
    fixture = mkdtempSync(join(tmpdir(), "plan-fixture-"));
  });

  after(() => rmSync(fixture, { recursive: true, force: true }));

  test("agrees when every counter matches the checkboxes", () => {
    writeFileSync(join(fixture, "IMPROVEMENT-PLAN.md"), plan(2, 4, { header: 2, tracker: 2 }), "utf8");
    const result: Run = run("plan-status.ts", fixture, ["--check"]);
    assert.equal(result.status, 0, result.stdout);
    assert.ok(result.stdout.includes("all counters agree"));
  });

  test("fails when the header counter drifts from the checkboxes", () => {
    // The failure this script exists for: an item ticked without its counters moved,
    // which sends the next session to the wrong item.
    writeFileSync(join(fixture, "IMPROVEMENT-PLAN.md"), plan(3, 4, { header: 2, tracker: 3 }), "utf8");
    const result: Run = run("plan-status.ts", fixture, ["--check"]);
    assert.notEqual(result.status, 0);
    assert.ok(result.stdout.includes("header counter"));
  });

  test("fails when an item has no model mapping", () => {
    const raw: string = plan(1, 4, { header: 1, tracker: 1 }).replace("| 1–4 |", "| 1–2 |");
    writeFileSync(join(fixture, "IMPROVEMENT-PLAN.md"), raw, "utf8");
    const result: Run = run("plan-status.ts", fixture, ["--check"]);
    assert.notEqual(result.status, 0);
    assert.ok(/unmapped: 3, 4/.test(result.stdout), result.stdout);
  });

  test("--next finds the first unchecked item, letters sorted in place", () => {
    const raw: string = plan(2, 4, { header: 2, tracker: 2 }).replace(
      "### - [ ] 3. Item 3",
      "### - [ ] 2a. Lettered item",
    );
    writeFileSync(join(fixture, "IMPROVEMENT-PLAN.md"), raw, "utf8");
    const stdout: string = run("plan-status.ts", fixture, ["--next"]).stdout;
    assert.ok(stdout.includes("#2a"), stdout);
  });
});
