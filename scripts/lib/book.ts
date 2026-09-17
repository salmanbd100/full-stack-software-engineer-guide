/**
 * book.ts — shared model of "what is in the book"
 *
 * Both the build (improvement #5) and the lint script (#6) need the same answers:
 * which files are manuscript, which part each belongs to, and what its front matter says.
 * Keeping that in one place means the build and the lint can never disagree.
 *
 * See BOOK-SPEC.md § 4 for the part definitions and § 6 for what is out of scope.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

// ---------------------------------------------------------------------------
// What counts as manuscript
// ---------------------------------------------------------------------------

/** Directories that hold repo tooling or archived material, never book content. */
export const EXCLUDED_DIRS: readonly string[] = [
  ".git",
  ".claude",
  ".github",
  "node_modules",
  "Archive",
  "scripts",
  "build",
];

/** Root-level files that are about the book rather than in it. */
export const EXCLUDED_FILES: readonly string[] = [
  "CLAUDE.md", // agent instructions
  "BOOK-SPEC.md", // the spec itself
  "IMPROVEMENT-PLAN.md", // the plan itself
  "REFERENCE-CHAPTER.md", // pointer at the exemplar chapter
  "README.md", // the repo landing page, not the book's opening — only at root
];

/**
 * Fences that may hold something other than TypeScript. BOOK-SPEC.md non-negotiable #1.
 *
 * Two groups, and the distinction matters. The first is TypeScript itself. The second is
 * declarative schema and configuration languages that have **no TypeScript form at all** —
 * you cannot write a Dockerfile or a GraphQL schema in TypeScript, so requiring it would
 * mean deleting the example rather than translating it. `sql`, `yaml` and `css` were
 * already on that footing; `graphql`, `dockerfile`, `nginx`, `prisma` and `http` are the
 * same category and were added by decision #10.
 *
 * A general-purpose language never belongs here. `javascript`, `python` and the rest opt
 * out one fence at a time, with a stated reason — see FENCE_EXEMPTION in lint-docs.ts.
 */
export const ALLOWED_FENCES: readonly string[] = [
  // TypeScript
  "typescript",
  "ts",
  "tsx",
  // Markup, style and data
  "html",
  "css",
  // Component templates — BOOK-SPEC.md decision 15. A .svelte file's markup has no
  // TypeScript form; the TypeScript in it lives inside <script lang="ts">.
  "svelte",
  "json",
  "yaml",
  "text",
  "mermaid",
  // Schema and configuration languages with no TypeScript equivalent
  "sql",
  "graphql",
  "prisma",
  "dockerfile",
  "nginx",
  "http",
  // Shell
  "bash",
];

// ---------------------------------------------------------------------------
// Part mapping — BOOK-SPEC.md § 4. Longest matching prefix wins.
// ---------------------------------------------------------------------------

export const PART_NAMES: Readonly<Record<number, string>> = {
  1: "Foundations",
  2: "The Browser Platform",
  3: "The Modern Frontend Stack",
  4: "Frontend at Scale",
  5: "Backend for Frontend Engineers",
  6: "System Design",
  7: "AI Engineering",
  8: "Ship and Operate",
  9: "The Human Layer",
  10: "Appendix — DSA Patterns",
};

const PART_BY_PREFIX: readonly [string, number][] = [
  ["Frontend/JavaScript", 1],
  ["Frontend/TypeScript", 1],
  ["Backend/DesignPatterns", 1],

  ["Frontend/HtmlCss", 2], // renamed from Html&CSS at #11
  ["Frontend/BrowserAPIs", 2],
  ["Frontend/Internationalization", 2],
  ["Frontend/PWA", 2],
  ["Frontend/CSSArchitecture", 2],
  ["Frontend/Accessibility", 2], // created by #54

  ["Frontend/ModernStack", 3], // created by #32–43

  ["Frontend/Architecture", 4], // created by #55
  ["Frontend/WebPerformance", 4],
  ["Frontend/Security", 4],
  ["Frontend/Testing", 4],

  ["Backend", 5],
  ["SystemDesign", 6],
  ["AI", 7], // created by #44–53

  ["ShipAndOperate", 8], // post-rename (#20)

  ["Behavioral", 9],
  ["Communication", 9],

  ["DSA", 10],
];

// ---------------------------------------------------------------------------
// Reading order within a part — improvement #70
// ---------------------------------------------------------------------------

/**
 * The README that opens each part, where one exists.
 *
 * Parts I, II, IV and IX have none: their content is spread across two or more
 * top-level directories with no single file above them, and `collect-chapters.ts`
 * inserts the `# Part N` divider itself. That is a gap for a later item, not a bug.
 */
export const PART_OPENERS: Readonly<Record<number, string>> = {
  3: "Frontend/ModernStack/README.md",
  5: "Backend/README.md",
  6: "SystemDesign/README.md",
  7: "AI/README.md",
  8: "ShipAndOperate/README.md",
  10: "DSA/README.md",
};

/**
 * Section order within each part — **the reading order of the book**, and the input
 * `number-chapters.ts` turns into front-matter `chapter` values.
 *
 * Alphabetical order by path is wrong almost everywhere: it opens Part I on design
 * patterns and Part II on accessibility, when BOOK-SPEC.md § 4 says JavaScript and
 * HTML/CSS come first. Every list below is taken from that part's "Covers:" line, or
 * from the Sections table in its own part opener where it has one.
 *
 * A directory missing from this map is a hard error in `number-chapters.ts` rather
 * than a silent fallback — a new section must be placed deliberately.
 */
export const SECTION_ORDER: Readonly<Record<number, readonly string[]>> = {
  1: ["Frontend/JavaScript", "Frontend/TypeScript", "Backend/DesignPatterns"],
  2: [
    "Frontend/HtmlCss",
    "Frontend/BrowserAPIs",
    "Frontend/Accessibility",
    "Frontend/Internationalization",
    "Frontend/PWA",
  ],
  3: [
    "Frontend/ModernStack/React",
    "Frontend/ModernStack/NextJS",
    "Frontend/ModernStack/Svelte",
    "Frontend/ModernStack/Rendering",
    "Frontend/ModernStack/StateManagement",
    "Frontend/ModernStack/Tooling",
  ],
  4: [
    "Frontend/Architecture",
    "Frontend/WebPerformance",
    "Frontend/Security",
    "Frontend/Testing",
  ],
  5: [
    "Backend/NodeJS",
    "Backend/Frameworks",
    "Backend/API",
    "Backend/SQL",
    "Backend/NoSQL",
    "Backend/Security",
    "Backend/Testing",
  ],
  6: [
    "SystemDesign/Fundamentals",
    "SystemDesign/BuildingBlocks",
    "SystemDesign/Database",
    "SystemDesign/Frontend",
    "SystemDesign/CaseStudies",
  ],
  7: [
    "AI/Foundations",
    "AI/Integration",
    "AI/RAG",
    "AI/Agents",
    "AI/Production",
    "AI/AIUX",
  ],
  8: [
    "ShipAndOperate/Git",
    "ShipAndOperate/Containers",
    "ShipAndOperate/CICD",
    "ShipAndOperate/Observability",
    "ShipAndOperate/Cloud",
    "ShipAndOperate/Deployment",
  ],
  9: ["Behavioral", "Communication"],
  10: ["DSA"],
};

// ---------------------------------------------------------------------------
// Line budgets — BOOK-SPEC.md § 5
// ---------------------------------------------------------------------------

const ROMAN: Readonly<Record<string, number>> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
};

/** A budget-summary row: `| **III — Modern Stack** 🆕 | ~46 | **12,000** | **21%** |` */
const BUDGET_ROW =
  /^\|\s*\**\s*(I{1,3}|IV|VI{0,3}|IX|Appendix)\s*—[^|]*\|[^|]*\|\s*\**\s*([\d,]+)\s*\**\s*\|/;

/**
 * Per-part line ceilings, **read from `BOOK-SPEC.md` § 5** rather than copied here.
 *
 * The spec is the contract. A second copy of these numbers inside a script is a second
 * thing to forget to update, and improvement #29 found exactly that failure: the plan's
 * budget table claimed cuts that six completed items had not delivered, and nothing
 * compared either number to the tree. Edit § 5; this follows.
 *
 * Throws rather than guessing if § 5 stops being parseable — a budget check that silently
 * measures against nothing is worse than no budget check.
 */
export function partBudgets(root: string): Map<number, number> {
  const spec: string = readFileSync(join(root, "BOOK-SPEC.md"), "utf8");
  const budgets = new Map<number, number>();

  for (const line of spec.split("\n")) {
    const m = BUDGET_ROW.exec(line);
    if (!m) continue;
    const part: number = m[1] === "Appendix" ? 10 : ROMAN[m[1]];
    if (part === undefined) continue;
    budgets.set(part, Number(m[2].replace(/,/g, "")));
  }

  const missing: number[] = Object.keys(PART_NAMES)
    .map(Number)
    .filter((p: number) => !budgets.has(p));
  if (missing.length > 0) {
    throw new Error(
      `BOOK-SPEC.md § 5: no budget row found for part(s) ${missing.join(", ")}. ` +
        `The budget summary table has changed shape — update BUDGET_ROW in scripts/lib/book.ts.`,
    );
  }

  return budgets;
}

/**
 * Files whose destination part is not their current directory (#25, #42).
 *
 * Empty since #42: the six `SystemDesign/Frontend/` files this held have moved to the
 * Part IV directories that own them — `Frontend/Architecture/` and
 * `Frontend/WebPerformance/` — so `PART_BY_PREFIX` maps them correctly on path alone.
 * Leaving a stale entry here would double-count a file's lines against its part.
 */
const PART_OVERRIDES: Readonly<Record<string, number>> = {};

/** Part number for a repo-relative path. 0 means "no part mapped yet". */
export function partFor(rel: string): number {
  const posix: string = toPosix(rel);
  if (PART_OVERRIDES[posix] !== undefined) return PART_OVERRIDES[posix];

  let best = 0;
  let bestLength = -1;
  for (const [prefix, part] of PART_BY_PREFIX) {
    if ((posix === prefix || posix.startsWith(prefix + "/")) && prefix.length > bestLength) {
      best = part;
      bestLength = prefix.length;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Front matter
// ---------------------------------------------------------------------------

export interface FrontMatter {
  title?: string;
  part?: number;
  chapter?: number;
  slug?: string;
  level?: string;
  reading_time?: number;
  updated?: string;
  tags?: string[];
  in_book?: boolean;
}

export interface Doc {
  /** Repo-relative path, forward slashes. */
  rel: string;
  /** Absolute path on disk. */
  abs: string;
  /** Parsed front matter, empty if the file has none. */
  fm: FrontMatter;
  /** True when a `---` block was found at the very top of the file. */
  hasFrontMatter: boolean;
  /** File body with the front matter block removed. */
  body: string;
  /** Line count of the whole file, front matter included. */
  lines: number;
  /** Effective part: front matter wins, then the path prefix. */
  part: number;
  /** True when this file is the part opener for its directory. */
  isReadme: boolean;
}

/**
 * A deliberately small YAML reader. The front matter block is generated by
 * scripts/add-frontmatter.ts and only ever holds scalars, a flat string list, and
 * booleans — so a real YAML dependency would buy nothing and cost a package.json entry.
 */
function parseFrontMatter(raw: string): FrontMatter {
  const fm: FrontMatter = {};

  for (const line of raw.split("\n")) {
    const match = /^([a-z_]+):\s*(.*)$/.exec(line.trim());
    if (!match) continue;

    const key = match[1];
    // Strip a trailing `# beginner | intermediate | advanced` style comment.
    let value = match[2].replace(/\s+#.*$/, "").trim();
    if (value === "") continue;

    if (value.startsWith("[")) {
      fm.tags = value
        .slice(1, value.endsWith("]") ? -1 : undefined)
        .split(",")
        .map((t: string) => t.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      continue;
    }

    value = value.replace(/^["']|["']$/g, "");

    switch (key) {
      case "part":
      case "chapter":
      case "reading_time":
        (fm as Record<string, unknown>)[key] = Number(value);
        break;
      case "in_book":
        fm.in_book = value === "true";
        break;
      default:
        (fm as Record<string, unknown>)[key] = value;
    }
  }

  return fm;
}

export function readDoc(abs: string, root: string): Doc {
  const source: string = readFileSync(abs, "utf8");
  const rel: string = toPosix(relative(root, abs));

  let fm: FrontMatter = {};
  let body: string = source;
  let hasFrontMatter = false;

  if (source.startsWith("---\n")) {
    const end: number = source.indexOf("\n---", 4);
    if (end !== -1) {
      hasFrontMatter = true;
      fm = parseFrontMatter(source.slice(4, end));
      body = source.slice(source.indexOf("\n", end + 1) + 1);
    }
  }

  return {
    rel,
    abs,
    fm,
    hasFrontMatter,
    body: body.replace(/^\n+/, ""),
    lines: source.split("\n").length,
    part: fm.part && fm.part > 0 ? fm.part : partFor(rel),
    isReadme: rel.endsWith("README.md"),
  };
}

// ---------------------------------------------------------------------------
// Walking the tree
// ---------------------------------------------------------------------------

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

/** Every markdown file that is manuscript, in filesystem order. */
export function findMarkdown(root: string): string[] {
  const out: string[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const abs: string = join(dir, entry);

      if (statSync(abs).isDirectory()) {
        if (!EXCLUDED_DIRS.includes(entry)) walk(abs);
        continue;
      }

      if (!entry.endsWith(".md")) continue;
      // The exclusion list only applies at the repo root — every directory below it
      // has a README.md that is a real part opener.
      if (dir === root && EXCLUDED_FILES.includes(entry)) continue;
      out.push(abs);
    }
  };

  walk(root);
  return out;
}

/**
 * Reading order: part, then chapter number, then path.
 *
 * **Changed at #70, and the two changes are related.** `chapter` is now stamped on every
 * in-book file by `number-chapters.ts`, so it is authoritative and is compared first.
 * Before that sweep almost every file sat at `chapter: 0`, and the two rules written to
 * cope with that both produced the wrong book:
 *
 *   - Skipping the comparison when either side was 0 meant a part full of zeroes fell
 *     through to `localeCompare`, so Part III opened on `ModernStack/NextJS/README.md`
 *     rather than on the part opener above it (found at #44).
 *   - Preferring a README ahead of the chapter comparison meant any section index
 *     outranked every chapter at the same depth — `Backend/API/README.md` would have
 *     sorted above `Backend/NodeJS/01-event-loop-async.md` once real numbers arrived.
 *
 * So: `chapter: 0` now means **part opener**, and leads its part. The README and path
 * rules survive only as tiebreaks for equal numbers, which is a state a new unstamped
 * file passes through — and `lint:docs` fails it for the missing key while it does.
 */
export function orderDocs(docs: Doc[]): Doc[] {
  return [...docs].sort((a: Doc, b: Doc) => {
    // Unmapped files (part 0) sort to the back rather than to the front.
    const partA: number = a.part === 0 ? 99 : a.part;
    const partB: number = b.part === 0 ? 99 : b.part;
    if (partA !== partB) return partA - partB;

    const chapA: number = a.fm.chapter ?? 0;
    const chapB: number = b.fm.chapter ?? 0;
    if (chapA !== chapB) return chapA - chapB;

    const depthA: number = a.rel.split("/").length;
    const depthB: number = b.rel.split("/").length;
    if (a.isReadme !== b.isReadme && depthA === depthB) return a.isReadme ? -1 : 1;

    return a.rel.localeCompare(b.rel);
  });
}

/** Load every manuscript file, in reading order, dropping `in_book: false`. */
export function loadBook(root: string): Doc[] {
  const docs: Doc[] = findMarkdown(root)
    .map((abs: string) => readDoc(abs, root))
    .filter((d: Doc) => d.fm.in_book !== false);

  return orderDocs(docs);
}
