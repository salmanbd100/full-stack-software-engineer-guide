/**
 * add-frontmatter.ts — improvement #3
 *
 * Adds the book build's YAML front matter block to every content markdown file.
 *
 *   node --experimental-strip-types scripts/add-frontmatter.ts --dry-run
 *   node --experimental-strip-types scripts/add-frontmatter.ts
 *   node --experimental-strip-types scripts/add-frontmatter.ts --force   # overwrite derived keys
 *
 * Idempotent. On a file that already has front matter it fills in missing keys and
 * leaves everything you have hand-corrected alone, unless --force is passed.
 *
 * See BOOK-SPEC.md for what the fields mean and where the in_book decisions come from.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, relative, basename, dirname, sep } from "node:path";

const ROOT: string = process.cwd();
const DRY_RUN: boolean = process.argv.includes("--dry-run");
const FORCE: boolean = process.argv.includes("--force");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Level = "beginner" | "intermediate" | "advanced";

interface FrontMatter {
  title: string;
  part: number;
  chapter: number;
  slug: string;
  level: Level;
  reading_time: number;
  updated: string;
  tags: string[];
  in_book: boolean;
}

/** Order matters — this is the order keys are written to the file. */
const FIELD_ORDER: readonly (keyof FrontMatter)[] = [
  "title",
  "part",
  "chapter",
  "slug",
  "level",
  "reading_time",
  "updated",
  "tags",
  "in_book",
];

// ---------------------------------------------------------------------------
// Exclusions — repo tooling, not manuscript. These get no front matter at all.
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS: readonly string[] = [".git", ".claude", "node_modules", "Archive", "scripts", "build"];

const EXCLUDED_FILES: readonly string[] = [
  "CLAUDE.md", // agent instructions
  "BOOK-SPEC.md", // the spec itself
  "IMPROVEMENT-PLAN.md", // the plan itself
  "REFERENCE-CHAPTER.md", // pointer at the exemplar chapter, not a chapter itself
];

// ---------------------------------------------------------------------------
// Part mapping — BOOK-SPEC.md § 4. Longest matching prefix wins.
// ---------------------------------------------------------------------------

const PART_BY_PREFIX: readonly [string, number][] = [
  // Part I — Foundations
  ["Frontend/JavaScript", 1],
  ["Frontend/TypeScript", 1],
  ["OOP", 1],
  ["Backend/DesignPatterns", 1],

  // Part II — The Browser Platform
  ["Frontend/HtmlCss", 2],
  ["Frontend/HtmlCss", 2], // post-rename (#11)
  ["Frontend/BrowserAPIs", 2],
  ["Frontend/Internationalization", 2],
  ["Frontend/PWA", 2],
  ["Frontend/CSSArchitecture", 2],
  ["Frontend/Accessibility", 2], // created by #54

  // Part III — The Modern Frontend Stack (created by #32–43)
  ["Frontend/ModernStack", 3],

  // Part IV — Frontend at Scale
  ["Frontend/Architecture", 4], // created by #55
  ["Frontend/WebPerformance", 4],
  ["Frontend/Security", 4],
  ["Frontend/Testing", 4],

  // Part V — Backend for Frontend Engineers
  ["Backend", 5],

  // Part VI — System Design
  ["SystemDesign", 6],

  // Part VII — AI Engineering (created by #44–53)
  ["AI", 7],

  // Part VIII — Ship and Operate
  ["ShipAndOperate", 8], // post-rename (#20)
  ["DevOps", 8],

  // Part IX — The Human Layer
  ["Behavioral", 9],
  ["Communication", 9],

  // Appendix
  ["DSA", 10],
];

/**
 * Files whose destination part is not their current directory.
 * Improvement #42 moves the architecture half of SystemDesign/Frontend into Part IV;
 * #25 moves Agile into Part IX.
 */
const PART_OVERRIDES: Readonly<Record<string, number>> = {
  // #42 — the architecture half of frontend system design belongs beside the stack chapters
  "SystemDesign/Frontend/01-architecture.md": 4,
  "SystemDesign/Frontend/04-performance.md": 4,
  "SystemDesign/Frontend/05-micro-frontends.md": 4,
  "SystemDesign/Frontend/08-design-systems.md": 4,
  "SystemDesign/Frontend/09-assets.md": 4,
  "SystemDesign/Frontend/12-monitoring.md": 4,

  // Back matter (#19) — root-level, so no prefix can reach it
  "About-the-Author.md": 9,

  // #25 — ways of working is the human layer, not DevOps
  "DevOps/Agile/01-fundamentals.md": 9,
  "DevOps/Agile/03-devops-culture.md": 9,
  "DevOps/Agile/07-metrics.md": 9,
  "DevOps/Agile/README.md": 9,
};

// ---------------------------------------------------------------------------
// in_book decisions — BOOK-SPEC.md § 6 and improvement-plan items #20–#31.
//
// `false` means: stays in the repo, moves to Archive/, out of the manuscript.
// Nothing here is a deletion. Every entry is reviewable and reversible.
// ---------------------------------------------------------------------------

/** Whole directories that leave the book. */
const OUT_OF_BOOK_DIRS: readonly string[] = [
  // Spec § 6 — platform-engineering scope
  "DevOps/Terraform",
  "DevOps/Linux",
  "DevOps/Scripting",
  "DevOps/Networking",
  "DevOps/CostOptimization",
  "DevOps/IaC",
  // #24 — security consolidates into Frontend/ and Backend/
  "DevOps/DevSecOps",
  "DevOps/Security",
  "SystemDesign/Security",
  // #21 — replaced by the real AI/ part
  "DevOps/GenAI",
  // #23 — dissolved into Fundamentals/ and BuildingBlocks/
  "SystemDesign/Scalability",
  "SystemDesign/Infrastructure",
];

/** Individual files that leave the book, keyed by repo-relative path. */
const OUT_OF_BOOK_FILES: readonly string[] = [
  // #8 — planning and marketing artefacts moved to Archive/planning/, which
  // EXCLUDED_DIRS already skips. No entry needed here.

  // Repo navigation, not manuscript. The book's own front matter (#72) replaces these.
  // Frontend/ is the one domain index that maps to no single part — it spans II, III and IV.
  "README.md",
  "Frontend/README.md",

  // #20 — incident response is documented three times (here, DevOps/Security/08,
  // DevOps/DevSecOps/10); Observability keeps 4 chapters
  "DevOps/Monitoring/08-incident-response.md",

  // #20 — Docker keeps 5 of 9
  "DevOps/Docker/04-docker-networking-deep-dive.md",
  "DevOps/Docker/05-docker-volumes-storage.md",
  "DevOps/Docker/07-docker-in-production.md",
  "DevOps/Docker/08-docker-with-aws.md",

  // #20 — CI/CD keeps 5 of 8; the vendor-specific pipelines go
  "DevOps/CICD/02-aws-codepipeline.md",
  "DevOps/CICD/04-gitlab-ci.md",
  "DevOps/CICD/05-jenkins.md",

  // #20 — Observability keeps 4; the AWS-specific tooling goes
  "DevOps/Monitoring/02-cloudwatch.md",
  "DevOps/Monitoring/05-xray.md",
  "DevOps/Monitoring/06-elk-aws.md",

  // #20 — AWS condenses to 4: fundamentals, serverless, storage, CDN
  "DevOps/AWS/02-iam.md",
  "DevOps/AWS/03-vpc.md",
  "DevOps/AWS/04-ec2.md",
  "DevOps/AWS/05-ecs.md",
  "DevOps/AWS/08-storage.md",
  "DevOps/AWS/09-rds.md",
  "DevOps/AWS/10-dynamodb.md",
  "DevOps/AWS/11-route53.md",
  "DevOps/AWS/13-load-balancers.md",
  "DevOps/AWS/14-cloudwatch.md",
  "DevOps/AWS/15-security.md",

  // #20 — Kubernetes condenses to 2: "my service runs in a pod somewhere"
  "DevOps/Kubernetes/02-eks.md",
  "DevOps/Kubernetes/04-services-networking.md",
  "DevOps/Kubernetes/05-configmaps-secrets.md",
  "DevOps/Kubernetes/06-storage.md",
  "DevOps/Kubernetes/07-rbac-security.md",
  "DevOps/Kubernetes/08-helm.md",
  "DevOps/Kubernetes/09-monitoring.md",
  "DevOps/Kubernetes/10-autoscaling.md",

  // #25 — Agile condenses to 2 chapters in Part IX
  "DevOps/Agile/02-scrum.md",
  "DevOps/Agile/04-cicd-agile.md",
  "DevOps/Agile/05-jira.md",
  "DevOps/Agile/06-collaboration.md",
  "DevOps/Agile/08-team-practices.md",

  // #28 — case studies keep 10 of 20; these are the backend-heaviest
  "SystemDesign/InterviewQuestions/01-twitter.md",
  "SystemDesign/InterviewQuestions/04-uber.md",
  "SystemDesign/InterviewQuestions/05-whatsapp.md",
  "SystemDesign/InterviewQuestions/06-youtube.md",
  "SystemDesign/InterviewQuestions/07-netflix.md",
  "SystemDesign/InterviewQuestions/08-amazon.md",
  "SystemDesign/InterviewQuestions/09-google-search.md",
  "SystemDesign/InterviewQuestions/10-dropbox.md",
  "SystemDesign/InterviewQuestions/15-web-crawler.md",
  "SystemDesign/InterviewQuestions/19-parking-lot.md",

  // #29 — personal ESL practice, not book content
  "Communication/03-english-fluency.md",
];

// ---------------------------------------------------------------------------
// Level heuristics
// ---------------------------------------------------------------------------

// Scoped to the FILENAME, never the directory. Matching on the path made every file under
// Security/ or WebPerformance/ "advanced", including their READMEs.
const BEGINNER_HINTS: readonly string[] = ["fundamentals", "basics", "introduction", "getting-started"];
const ADVANCED_HINTS: readonly string[] = [
  "advanced",
  "optimization",
  "optimisation",
  "internals",
  "deep-dive",
  "architecture",
  "scaling",
  "patterns",
  "performance",
  "security",
  "concurrency",
  "resilience",
];

const TAG_STOPWORDS: ReadonlySet<string> = new Set([
  "the", "and", "for", "with", "vs", "to", "in", "of", "a", "an", "best", "practices", "guide", "intro", "deep", "dive",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full: string = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRS.includes(entry)) continue;
      walk(full, out);
    } else if (entry.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/** One git pass for every file's last-commit date, rather than 400 subprocess calls. */
function gitDates(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const raw: string = execSync("git log --name-only --format=%x00%ad --date=short", {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    let current = "";
    for (const line of raw.split("\n")) {
      if (line.startsWith("\0")) current = line.slice(1).trim();
      else if (line.trim() && current && !map.has(line.trim())) map.set(line.trim(), current);
    }
  } catch {
    // Not a git repo, or git unavailable — fall back to today for everything.
  }
  return map;
}

function splitFrontMatter(raw: string): { existing: Record<string, string> | null; body: string } {
  if (!raw.startsWith("---\n")) return { existing: null, body: raw };
  const end: number = raw.indexOf("\n---", 4);
  if (end === -1) return { existing: null, body: raw };

  const block: string = raw.slice(4, end);
  const existing: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) existing[m[1]] = m[2].replace(/\s*#.*$/, "").trim();
  }
  // Strip ALL leading newlines, not just one — serialise() re-adds exactly one blank line.
  // Stripping a single \n made the script non-idempotent: every re-run grew the gap by a line.
  return { existing, body: raw.slice(end + 4).replace(/^\n+/, "") };
}

function deriveTitle(body: string, file: string): string {
  const h1 = body.match(/^#\s+(.+?)(?:\s*\{#.*\})?\s*$/m);
  // Backticks are kept: the lint requires `title` to match the H1 verbatim, and a code-span
  // heading like "The `this` Keyword" fails that check if they are stripped. YAML treats them
  // as ordinary characters in a plain scalar.
  if (h1) return h1[1].replace(/[*_]/g, "").trim();
  const name: string = basename(file, ".md").replace(/^\d+-/, "");
  return name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function derivePart(rel: string): number {
  if (PART_OVERRIDES[rel] !== undefined) return PART_OVERRIDES[rel];
  const posix: string = rel.split(sep).join("/");
  let best = 0;
  let bestLen = -1;
  for (const [prefix, part] of PART_BY_PREFIX) {
    if ((posix === prefix || posix.startsWith(prefix + "/")) && prefix.length > bestLen) {
      best = part;
      bestLen = prefix.length;
    }
  }
  return best;
}

function deriveLevel(rel: string): Level {
  const name: string = basename(rel, ".md").toLowerCase();
  if (name === "readme") return "intermediate";
  if (BEGINNER_HINTS.some((h: string) => name.includes(h))) return "beginner";
  if (ADVANCED_HINTS.some((h: string) => name.includes(h))) return "advanced";
  return "intermediate";
}

function deriveReadingTime(body: string): number {
  const prose: string = body.replace(/```[\s\S]*?```/g, " ");
  const words: number = prose.split(/\s+/).filter(Boolean).length;
  const codeLines: number = (body.match(/```[\s\S]*?```/g) ?? []).join("\n").split("\n").length;
  // 220 wpm for prose. Code in a technical book is skimmed rather than read line by line —
  // 25 lines a minute matches how a reader actually moves through an annotated example.
  return Math.max(1, Math.round(words / 220 + codeLines / 25));
}

function deriveTags(rel: string): string[] {
  const posix: string = rel.split(sep).join("/");
  const segs: string[] = posix.replace(/\.md$/, "").split("/");
  const dirTags: string[] = segs.slice(0, -1).flatMap((s) => normaliseSegment(s).split("-"));
  const fileTags: string[] = basename(posix, ".md").replace(/^\d+-/, "").toLowerCase().split("-");
  const all: string[] = [...dirTags, ...fileTags]
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !TAG_STOPWORDS.has(t) && t !== "readme");
  return [...new Set(all)].slice(0, 5);
}

function deriveInBook(rel: string): boolean {
  const posix: string = rel.split(sep).join("/");
  if (OUT_OF_BOOK_FILES.includes(posix)) return false;
  if (OUT_OF_BOOK_DIRS.some((d) => posix.startsWith(d + "/"))) return false;
  return true;
}

/**
 * Directory names that camelCase splitting would mangle — `dev-ops`, `no-sql`, `ia-c`,
 * and worst of all `JavaScript` → `java` + `script`.
 */
const ACRONYM_SEGMENTS: Readonly<Record<string, string>> = {
  JavaScript: "javascript",
  TypeScript: "typescript",
  DevOps: "devops",
  DevSecOps: "devsecops",
  NodeJS: "nodejs",
  NoSQL: "nosql",
  GenAI: "genai",
  IaC: "iac",
  CICD: "cicd",
  AWS: "aws",
  SQL: "sql",
  PWA: "pwa",
  OOP: "oop",
  DSA: "dsa",
  API: "api",
  AI: "ai",
};

function normaliseSegment(s: string): string {
  if (ACRONYM_SEGMENTS[s]) return ACRONYM_SEGMENTS[s];
  return s.replace(/&/g, "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function baseSlug(rel: string): string {
  const posix: string = rel.split(sep).join("/");
  const name: string = basename(posix, ".md");
  if (name === "README") {
    const dir: string = dirname(posix);
    if (dir === ".") return "book-index";
    return dir.split("/").map(normaliseSegment).join("-") + "-index";
  }
  return name.replace(/^\d+-/, "").toLowerCase();
}

/**
 * Qualify a slug with `depth` parent directory names.
 * `Backend/Testing/06-best-practices.md` at depth 1 → `testing-best-practices`,
 * at depth 2 → `backend-testing-best-practices`.
 */
function qualifiedSlug(rel: string, depth: number): string {
  const base: string = baseSlug(rel);
  if (depth === 0) return base;
  const dirs: string[] = dirname(rel.split(sep).join("/"))
    .split("/")
    .filter((d: string) => d !== ".");
  const prefix: string[] = dirs.slice(Math.max(0, dirs.length - depth)).map(normaliseSegment);
  return [...prefix, base].join("-");
}

function serialise(fm: FrontMatter): string {
  const lines: string[] = ["---"];
  for (const key of FIELD_ORDER) {
    const v = fm[key];
    if (key === "tags") lines.push(`tags: [${(v as string[]).join(", ")}]`);
    else if (key === "level") lines.push(`level: ${v} # beginner | intermediate | advanced`);
    else if (typeof v === "string") lines.push(`${key}: ${/[:#]/.test(v) ? JSON.stringify(v) : v}`);
    else lines.push(`${key}: ${v}`);
  }
  lines.push("---", "", "");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files: string[] = walk(ROOT)
  .map((f) => relative(ROOT, f))
  .filter((f) => !EXCLUDED_FILES.includes(f))
  .sort();

const dates: Map<string, string> = gitDates();
const today: string = new Date().toISOString().slice(0, 10);

// Pass 1 — resolve slug collisions before writing anything.
// Every cross-reference in the book resolves through the slug, so uniqueness is not optional.
// Qualify with as few parent directories as it takes: `websockets` stays `websockets` where it
// can, and becomes `api-websockets` / `building-blocks-websockets` only where it must.
const finalSlug = new Map<string, string>();
{
  const groups = new Map<string, string[]>();
  for (const rel of files) {
    const s: string = baseSlug(rel);
    groups.set(s, [...(groups.get(s) ?? []), rel]);
  }

  for (const owners of groups.values()) {
    if (owners.length === 1) {
      finalSlug.set(owners[0], baseSlug(owners[0]));
      continue;
    }
    let depth = 1;
    let resolved: Map<string, string> | null = null;
    while (depth <= 4) {
      const attempt = new Map<string, string>(owners.map((r) => [r, qualifiedSlug(r, depth)]));
      if (new Set(attempt.values()).size === owners.length) {
        resolved = attempt;
        break;
      }
      depth++;
    }
    // Last resort: numeric suffix. Ugly, but a duplicate slug is worse than an ugly one.
    if (!resolved) {
      resolved = new Map(owners.map((r, i) => [r, `${qualifiedSlug(r, 4)}-${i + 1}`]));
    }
    for (const [rel, slug] of resolved) finalSlug.set(rel, slug);
  }

  // Cross-group safety net: a qualified slug could collide with another group's plain slug.
  const claimed = new Set<string>();
  for (const rel of files) {
    let s: string = finalSlug.get(rel) ?? baseSlug(rel);
    let n = 2;
    while (claimed.has(s)) s = `${finalSlug.get(rel)}-${n++}`;
    claimed.add(s);
    finalSlug.set(rel, s);
  }
}

let written = 0;
let skipped = 0;
const report: string[] = [];
const outOfBook: string[] = [];
const noPart: string[] = [];
const inBookParts: number[] = [];

for (const rel of files) {
  const raw: string = readFileSync(rel, "utf8");
  const { existing, body } = splitFrontMatter(raw);

  const derived: FrontMatter = {
    title: deriveTitle(body, rel),
    part: derivePart(rel),
    chapter: 0, // improvement #70 assigns real numbers
    slug: finalSlug.get(rel) ?? baseSlug(rel),
    level: deriveLevel(rel),
    reading_time: deriveReadingTime(body),
    updated: dates.get(rel.split(sep).join("/")) ?? today,
    tags: deriveTags(rel),
    in_book: deriveInBook(rel),
  };

  // Preserve hand-corrections unless --force.
  const fm: FrontMatter = { ...derived };
  if (existing && !FORCE) {
    if (existing.title) fm.title = existing.title.replace(/^["']|["']$/g, "");
    if (existing.part) fm.part = Number(existing.part);
    if (existing.chapter) fm.chapter = Number(existing.chapter);
    if (existing.slug) fm.slug = existing.slug;
    if (existing.level) fm.level = existing.level as Level;
    if (existing.tags) fm.tags = existing.tags.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim()).filter(Boolean);
    if (existing.in_book) fm.in_book = existing.in_book === "true";
  }

  const next: string = serialise(fm) + body;
  if (next === raw) {
    skipped++;
  } else {
    if (!DRY_RUN) writeFileSync(rel, next, "utf8");
    written++;
  }

  if (!fm.in_book) outOfBook.push(rel);
  else inBookParts.push(fm.part);
  // part: 0 is only a problem for a file that is actually in the book.
  if (fm.part === 0 && fm.in_book) noPart.push(rel);
  report.push(`P${fm.part} ${fm.in_book ? "  " : "✗ "} ${fm.slug.padEnd(42)} ${rel}`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${DRY_RUN ? "DRY RUN — nothing written" : "Front matter written"}\n`);
console.log(`  files processed : ${files.length}`);
console.log(`  changed         : ${written}`);
console.log(`  already correct : ${skipped}`);
console.log(`  in_book: true   : ${files.length - outOfBook.length}`);
console.log(`  in_book: false  : ${outOfBook.length}`);

// Counted from the values actually written, not re-derived — a hand-corrected `part`
// used to be reported under its derived value, so the table disagreed with the files.
const byPart = new Map<number, number>();
for (const p of inBookParts) byPart.set(p, (byPart.get(p) ?? 0) + 1);
console.log(`\n  In-book chapters by part:`);
for (const p of [...byPart.keys()].sort((a, b) => a - b)) {
  console.log(`    Part ${String(p).padStart(2)} : ${byPart.get(p)}`);
}

if (noPart.length) {
  console.log(`\n  ⚠️  ${noPart.length} in-book file(s) with part: 0 — add a PART_BY_PREFIX mapping:`);
  for (const f of noPart) console.log(`      ${f}`);
} else {
  console.log(`\n  ✅ every in-book file has a part`);
}

// Slug uniqueness is what every cross-reference in the book depends on.
const seen = new Map<string, string>();
const dupes: string[] = [];
for (const rel of files) {
  const s: string = finalSlug.get(rel) ?? baseSlug(rel);
  if (seen.has(s)) dupes.push(`${s}  →  ${seen.get(s)}  |  ${rel}`);
  else seen.set(s, rel);
}
console.log(dupes.length ? `\n  ⚠️  duplicate slugs:\n      ${dupes.join("\n      ")}` : `  ✅ all ${seen.size} slugs unique`);

if (process.argv.includes("--list")) {
  console.log(`\n${report.join("\n")}`);
}
