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
  ["OOP", 1],
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
  ["DevOps", 8],

  ["Behavioral", 9],
  ["Communication", 9],

  ["DSA", 10],
];

/** Files whose destination part is not their current directory (#25, #42). */
const PART_OVERRIDES: Readonly<Record<string, number>> = {
  "SystemDesign/Frontend/01-architecture.md": 4,
  "SystemDesign/Frontend/04-performance.md": 4,
  "SystemDesign/Frontend/05-micro-frontends.md": 4,
  "SystemDesign/Frontend/08-design-systems.md": 4,
  "SystemDesign/Frontend/09-assets.md": 4,
  "SystemDesign/Frontend/12-monitoring.md": 4,
};

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
 * Reading order: part, then chapter number, then path. Files that #3 has not
 * stamped yet fall back to their directory prefix, so the build still produces a
 * sensibly ordered book before the front-matter sweep runs.
 */
export function orderDocs(docs: Doc[]): Doc[] {
  return [...docs].sort((a: Doc, b: Doc) => {
    // Unmapped files (part 0) sort to the back rather than to the front.
    const partA: number = a.part === 0 ? 99 : a.part;
    const partB: number = b.part === 0 ? 99 : b.part;
    if (partA !== partB) return partA - partB;

    // A part opener always leads its part.
    const depthA: number = a.rel.split("/").length;
    const depthB: number = b.rel.split("/").length;
    if (a.isReadme !== b.isReadme && depthA === depthB) return a.isReadme ? -1 : 1;

    const chapA: number = a.fm.chapter ?? 0;
    const chapB: number = b.fm.chapter ?? 0;
    if (chapA !== chapB && chapA !== 0 && chapB !== 0) return chapA - chapB;

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
