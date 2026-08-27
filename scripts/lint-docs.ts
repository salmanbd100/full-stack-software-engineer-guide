/**
 * lint-docs.ts — improvement #6
 *
 * Checks every manuscript file against the Book Chapter Standard.
 *
 *   pnpm lint:docs                      # report, exit 0 unless a rule regressed
 *   pnpm lint:docs --strict             # exit 1 on any violation at all
 *   pnpm lint:docs --rule=fence-language  # one rule, every occurrence
 *   pnpm lint:docs --update-baseline    # record today's counts as the ceiling
 *
 * ## Why there is a baseline
 *
 * Most of this repo predates the standard, so a plain fail-on-any-violation gate would
 * leave CI red until improvement #19 and stay red for months — which trains everyone to
 * ignore it. `.lint-baseline.json` records the current count per rule. CI fails when a
 * count goes **up**, so the standard is enforced from today forward while the backlog
 * burns down. Each rule flips to hard-fail on its own the moment its baseline reaches 0.
 *
 * The rule list comes from IMPROVEMENT-PLAN.md #6; the allow-lists come from
 * BOOK-SPEC.md § 7.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ALLOWED_FENCES, EXCLUDED_DIRS, loadBook, type Doc } from "./lib/book.ts";

const ROOT: string = process.cwd();
const BASELINE_FILE: string = join(ROOT, ".lint-baseline.json");

const STRICT: boolean = process.argv.includes("--strict");
const UPDATE: boolean = process.argv.includes("--update-baseline");
const ONLY: string | undefined = process.argv
  .find((a: string) => a.startsWith("--rule="))
  ?.slice("--rule=".length);

const MAX_LINES = 400;
const MIN_LINES = 150;

const REQUIRED_KEYS: readonly string[] = [
  "title",
  "part",
  "chapter",
  "slug",
  "level",
  "updated",
  "in_book",
];

type RuleId =
  | "front-matter"
  | "broken-link"
  | "fence-language"
  | "too-long"
  | "missing-readme"
  | "heading-jump";

const RULE_TITLES: Readonly<Record<RuleId, string>> = {
  "front-matter": "Missing or invalid front matter",
  "broken-link": "Broken relative link",
  "fence-language": "Code fence outside the allow-list",
  "too-long": `File over ${MAX_LINES} lines with in_book: true`,
  "missing-readme": "Content directory with no README.md",
  "heading-jump": "Heading level jump",
};

interface Violation {
  rule: RuleId;
  file: string;
  line: number;
  message: string;
}

const violations: Violation[] = [];

function report(rule: RuleId, file: string, line: number, message: string): void {
  violations.push({ rule, file, line, message });
}

// ---------------------------------------------------------------------------
// Per-file rules
// ---------------------------------------------------------------------------

/** Line numbers are reported against the whole file, so offset past the front matter. */
function bodyOffset(doc: Doc): number {
  return doc.lines - doc.body.split("\n").length;
}

function checkFrontMatter(doc: Doc, slugsSeen: Map<string, string>): void {
  if (!doc.hasFrontMatter) {
    report("front-matter", doc.rel, 1, "no front matter block");
    return;
  }

  const missing: string[] = REQUIRED_KEYS.filter(
    (k: string) => (doc.fm as Record<string, unknown>)[k] === undefined,
  );
  if (missing.length > 0) {
    report("front-matter", doc.rel, 1, `missing key(s): ${missing.join(", ")}`);
  }

  const slug: string | undefined = doc.fm.slug;
  if (slug !== undefined) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      report("front-matter", doc.rel, 1, `slug "${slug}" is not lowercase-hyphen`);
    }
    const owner: string | undefined = slugsSeen.get(slug);
    if (owner) {
      report("front-matter", doc.rel, 1, `slug "${slug}" already used by ${owner}`);
    } else {
      slugsSeen.set(slug, doc.rel);
    }
  }

  // The build trusts the H1 for the printed title and the front matter for ordering.
  // If they disagree, one of them is wrong and nobody can tell which.
  const h1 = /^#\s+(.+?)(\s*\{#[^}]*\})?\s*$/m.exec(doc.body);
  if (h1 && doc.fm.title && h1[1].trim() !== doc.fm.title.trim()) {
    report("front-matter", doc.rel, 1, `H1 "${h1[1].trim()}" does not match title "${doc.fm.title}"`);
  }
}

/**
 * Walk a file line by line, tracking fence state, and apply every rule that needs to
 * know whether it is inside a code block.
 */
function checkBody(doc: Doc): void {
  const lines: string[] = doc.body.split("\n");
  const offset: number = bodyOffset(doc);

  let inFence = false;
  let fenceChar = "";
  let lastHeadingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line: string = lines[i];
    const lineNo: number = offset + i + 1;

    const fence = /^\s*(```+|~~~+)\s*([^\s`]*)/.exec(line);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceChar = fence[1][0];
        const lang: string = fence[2].toLowerCase().replace(/^\{\.?/, "").replace(/\}$/, "");
        if (lang === "") {
          report("fence-language", doc.rel, lineNo, "unlabelled code fence");
        } else if (!ALLOWED_FENCES.includes(lang)) {
          report("fence-language", doc.rel, lineNo, `\`${lang}\` — allowed: ${ALLOWED_FENCES.join(", ")}`);
        }
      } else if (fence[1][0] === fenceChar) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    const heading = /^(#{1,6})\s/.exec(line);
    if (heading) {
      const level: number = heading[1].length;
      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        report(
          "heading-jump",
          doc.rel,
          lineNo,
          `${"#".repeat(lastHeadingLevel)} → ${"#".repeat(level)}`,
        );
      }
      lastHeadingLevel = level;
    }

    checkLinks(doc, line, lineNo);
  }
}

function checkLinks(doc: Doc, line: string, lineNo: number): void {
  // Skip inline code so a link inside backticks is not treated as a real one.
  const stripped: string = line.replace(/`[^`]*`/g, "");

  for (const match of stripped.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target: string = match[1];

    if (/^(https?:|mailto:|#|data:)/.test(target)) continue;

    const [path] = target.split("#");
    if (path === "") continue;

    const abs: string = resolve(ROOT, dirname(doc.rel), decodeURIComponent(path));
    if (!existsSync(abs)) {
      report("broken-link", doc.rel, lineNo, `${target} does not exist`);
    }
  }
}

function checkLength(doc: Doc): void {
  if (doc.fm.in_book === false) return;
  if (doc.lines > MAX_LINES) {
    report("too-long", doc.rel, 1, `${doc.lines} lines (limit ${MAX_LINES})`);
  }
}

// ---------------------------------------------------------------------------
// Directory rule
// ---------------------------------------------------------------------------

function checkReadmes(): void {
  const walk = (dir: string): void => {
    const entries: string[] = readdirSync(dir);
    const hasMarkdown: boolean = entries.some(
      (e: string) => e.endsWith(".md") && e !== "README.md" && !statSync(join(dir, e)).isDirectory(),
    );

    if (hasMarkdown && dir !== ROOT && !entries.includes("README.md")) {
      const rel: string = dir.slice(ROOT.length + 1).split("\\").join("/");
      report("missing-readme", rel, 1, "content directory has no README.md");
    }

    for (const entry of entries) {
      const abs: string = join(dir, entry);
      if (statSync(abs).isDirectory() && !EXCLUDED_DIRS.includes(entry)) walk(abs);
    }
  };

  walk(ROOT);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const docs: Doc[] = loadBook(ROOT);
const slugsSeen = new Map<string, string>();

for (const doc of docs) {
  checkFrontMatter(doc, slugsSeen);
  checkBody(doc);
  checkLength(doc);
}
checkReadmes();

const counts: Record<string, number> = {};
for (const rule of Object.keys(RULE_TITLES)) counts[rule] = 0;
for (const v of violations) counts[v.rule]++;

const baseline: Record<string, number> = existsSync(BASELINE_FILE)
  ? (JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Record<string, number>)
  : {};

if (UPDATE) {
  writeFileSync(BASELINE_FILE, JSON.stringify(counts, null, 2) + "\n", "utf8");
  console.log(`Baseline written to .lint-baseline.json — ${violations.length} violation(s) recorded.`);
  process.exit(0);
}

// --- output ----------------------------------------------------------------

if (ONLY) {
  const shown: Violation[] = violations.filter((v: Violation) => v.rule === ONLY);
  for (const v of shown) console.log(`  ${v.file}:${v.line}  ${v.message}`);
  console.log(`\n${shown.length} violation(s) of ${ONLY}`);
  process.exit(shown.length > 0 && STRICT ? 1 : 0);
}

console.log(`\n📚 lint:docs — ${docs.length} files\n`);

let regressed = false;

for (const rule of Object.keys(RULE_TITLES) as RuleId[]) {
  const count: number = counts[rule];
  const limit: number = baseline[rule] ?? 0;
  const over: boolean = count > limit;
  if (over) regressed = true;

  const mark: string = count === 0 ? "✅" : over ? "❌" : "•";
  const budget: string = count === 0 ? "" : over ? `  (baseline ${limit} — REGRESSED)` : `  (baseline ${limit})`;
  console.log(`  ${mark} ${String(count).padStart(4)}  ${RULE_TITLES[rule]}${budget}`);

  // Three examples per rule keeps the report readable; --rule=<id> prints them all.
  for (const v of violations.filter((x: Violation) => x.rule === rule).slice(0, 3)) {
    console.log(`         ${v.file}:${v.line}  ${v.message}`);
  }
  if (count > 3) console.log(`         … ${count - 3} more — pnpm lint:docs --rule=${rule}`);
}

// Advisory, not a rule: the standard's lower bound is a merge prompt, not a failure.
const short: Doc[] = docs.filter(
  (d: Doc) => !d.isReadme && d.lines < MIN_LINES && d.fm.in_book !== false,
);

console.log(`\n  ${violations.length} violation(s) total.`);
if (short.length > 0) {
  console.log(`  ${short.length} file(s) under ${MIN_LINES} lines — sections, not chapters (advisory).`);
}

if (STRICT && violations.length > 0) {
  console.log("\n❌ --strict: failing on any violation.\n");
  process.exit(1);
}
if (regressed) {
  console.log("\n❌ A rule went up against .lint-baseline.json.\n");
  process.exit(1);
}
console.log("\n✅ No rule regressed against .lint-baseline.json.\n");
