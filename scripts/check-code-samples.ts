/**
 * check-code-samples.ts — improvement #75
 *
 * Extracts every TypeScript fence in the manuscript and runs the real compiler over it.
 *
 *   pnpm check:code-samples                   # syntax gate + type gate against the baseline
 *   pnpm check:code-samples --strict          # fail on any type diagnostic at all
 *   pnpm check:code-samples --update-baseline # record today's counts as the ceiling
 *   pnpm check:code-samples --code=TS2304     # every occurrence of one diagnostic code
 *
 * ## Two gates, because a fence is not a program
 *
 * **Syntax, hard at zero.** A fence that does not parse is broken code on a printed page —
 * there is no reading of the book under which that is acceptable. Every `ts`/`typescript`
 * fence is written to a `.ts` file and every `tsx` fence to a `.tsx` file, so a fence
 * carrying JSX under a `typescript` label fails here rather than being quietly tolerated.
 * That is deliberate: the label is what the syntax highlighter reads in the PDF and EPUB.
 *
 * **Types, baselined.** Book fences are excerpts. They say `await db.query(...)` because the
 * chapter established `db` three paragraphs earlier, and demanding a self-contained program
 * from each one would turn 787 teaching examples into 787 boilerplate dumps. So the type
 * pass compiles each chapter's fences **together, in reading order** — the context a reader
 * actually has — and counts what is left per diagnostic code against
 * `.code-samples-baseline.json`, the same ratchet `lint:docs` uses. A count that goes up
 * fails; a count that goes down is committed as the new baseline.
 *
 * ## What the harness deliberately does not check
 *
 * `ambient.d.ts` declares `module "*"`, so every import resolves to `any`. The alternative is
 * pinning react, next, express, zod, vitest, playwright and a dozen more into this repo's
 * package.json and re-pinning them every time the book's version stamps move — a
 * maintenance cost with no reader-facing benefit. The consequence is honest and worth
 * stating: **this script proves the samples parse and are internally consistent; it does not
 * prove they match any library's current API.** That is what `check:versions` and the
 * Context7 lookups in CLAUDE.md are for.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { loadBook, type Doc } from "./lib/book.ts";

const ROOT: string = process.cwd();
const OUT_DIR: string = join(ROOT, "build", "code-samples");
const FENCE_DIR: string = join(OUT_DIR, "fences");
const CHAPTER_DIR: string = join(OUT_DIR, "chapters");
const BASELINE_FILE: string = join(ROOT, ".code-samples-baseline.json");
const TSC: string = join(ROOT, "node_modules", ".bin", "tsc");

const STRICT: boolean = process.argv.includes("--strict");
const UPDATE: boolean = process.argv.includes("--update-baseline");
const ONLY: string | undefined = process.argv
  .find((a: string) => a.startsWith("--code="))
  ?.slice("--code=".length)
  .toUpperCase();

/** Fence languages this script compiles. Everything else in ALLOWED_FENCES is not TypeScript. */
const TS_FENCES: Readonly<Record<string, "ts" | "tsx">> = {
  ts: "ts",
  typescript: "ts",
  tsx: "tsx",
};

/**
 * A fence may opt out with a marker on the line above it, carrying a reason — the same
 * shape as `lint-allow-fence` in lint-docs.ts, and for the same reason: an exception
 * nobody has to justify is an exception everybody takes.
 */
const SKIP_MARKER = /^\s*<!--\s*check-skip:\s+\S.*-->\s*$/;

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

interface Fence {
  /** Repo-relative markdown path. */
  rel: string;
  /** Line in the markdown file where the fence body starts. */
  line: number;
  kind: "ts" | "tsx";
  body: string[];
}

function extract(doc: Doc): Fence[] {
  const lines: string[] = doc.body.split("\n");
  const offset: number = doc.lines - lines.length;
  const out: Fence[] = [];

  let open: { char: string; lang: string; line: number; skip: boolean } | null = null;
  let body: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const fence = /^\s*(```+|~~~+)\s*([^\s`]*)/.exec(lines[i]);

    if (fence && open === null) {
      open = {
        char: fence[1][0],
        lang: fence[2].toLowerCase(),
        line: offset + i + 2,
        skip: SKIP_MARKER.test(lines[i - 1] ?? ""),
      };
      body = [];
      continue;
    }

    if (fence && open !== null && fence[1][0] === open.char) {
      const kind = TS_FENCES[open.lang];
      if (kind !== undefined && !open.skip) {
        out.push({ rel: doc.rel, line: open.line, kind, body });
      }
      open = null;
      continue;
    }

    if (open !== null) body.push(lines[i]);
  }

  return out;
}

// ---------------------------------------------------------------------------
// The scratch project
// ---------------------------------------------------------------------------

const AMBIENT = `// Generated by scripts/check-code-samples.ts — do not edit.
//
// Every import in the manuscript resolves to \`any\` through this wildcard. See the
// script's header for why the alternative was rejected.
declare module "*";

// Test-runner globals. A fence showing a vitest or jest test is correct TypeScript in the
// project it belongs to; it is only undeclared here because this scratch project has no
// runner installed.
declare const describe: any;
declare const it: any;
declare const test: any;
declare const expect: any;
declare const vi: any;
declare const jest: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const beforeAll: any;
declare const afterAll: any;
`;

/**
 * `strict: false` is the point, not an oversight. Strict mode's value is in a codebase
 * where every symbol is declared; over excerpts it fires almost entirely on the excerpting
 * — implicit `any` on a parameter the surrounding prose already typed. The checks worth
 * having here are the structural ones, which run regardless.
 */
function tsconfig(patterns: readonly string[]): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "esnext",
        lib: ["esnext", "dom", "dom.iterable"],
        module: "preserve",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: false,
        noEmit: true,
        skipLibCheck: true,
        types: ["node"],
      },
      include: [...patterns, "ambient.d.ts"],
    },
    null,
    2,
  );
}

function prepare(dir: string, patterns: readonly string[]): void {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "ambient.d.ts"), AMBIENT);
  writeFileSync(join(dir, "tsconfig.json"), tsconfig(patterns));
}

/** Markdown path → scratch filename stem. Flat, because a nested tree buys nothing here. */
function stemFor(rel: string): string {
  return rel.replace(/\.md$/, "").replace(/[^A-Za-z0-9]+/g, "_");
}

// ---------------------------------------------------------------------------
// Running the compiler
// ---------------------------------------------------------------------------

interface Diagnostic {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

const TSC_LINE = /^(.*?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/;

function runTsc(dir: string): Diagnostic[] {
  let output = "";
  try {
    output = execFileSync(TSC, ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: string };
    if (e.code === "ENOENT") {
      console.error(
        "check:code-samples needs the TypeScript compiler.\n" +
          "  pnpm install   # typescript is a devDependency\n",
      );
      process.exit(2);
    }
    output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  const out: Diagnostic[] = [];
  for (const raw of output.split("\n")) {
    const m = TSC_LINE.exec(raw.trim());
    if (!m) continue;
    out.push({
      file: m[1].split("/").pop() ?? m[1],
      line: Number(m[2]),
      column: Number(m[3]),
      code: m[4],
      message: m[5],
    });
  }
  return out;
}

/**
 * Grammar errors, as against type errors.
 *
 * Everything below TS2000 is the parser. The 17xxx block is the JSX structural family, and
 * TS2657 ("JSX expressions must have one parent element") sits in the 2xxx range but is the
 * same kind of fault — the fence is not a well-formed element, not merely ill-typed.
 */
function isSyntax(code: string): boolean {
  const n: number = Number(code.slice(2));
  return n < 2000 || (n >= 17000 && n < 18000) || n === 2657;
}

// ---------------------------------------------------------------------------
// Pass A — syntax, one file per fence
// ---------------------------------------------------------------------------

interface Located {
  rel: string;
  line: number;
  code: string;
  message: string;
}

/**
 * TS1108 — `return` outside a function body.
 *
 * A chapter explaining `try`/`catch`/`finally` excerpts the inside of a function, because the
 * function around it is not what the section is about. Eighteen fences do that, and all of
 * them are correct TypeScript in the place the prose puts them. So a fence whose **only**
 * complaint is this one is re-checked inside a function body — the context the surrounding
 * paragraph supplies — rather than being rewritten to carry boilerplate the reader does not
 * need. Anything else it is hiding still surfaces on the second run.
 */
const FRAGMENT_CODES: ReadonlySet<string> = new Set<string>(["TS1108"]);

const WRAPPER_OPEN = "async function __fragment(): Promise<unknown> {";

function writeFence(dir: string, name: string, fence: Fence, wrap: boolean): void {
  // `export {}` goes last so it cannot shift a reported line number. It makes each file a
  // module, which is what keeps 787 fences from colliding in one global scope.
  const body: string = fence.body.join("\n");
  const source: string = wrap ? `${WRAPPER_OPEN}\n${body}\n}\nexport {};\n` : `${body}\nexport {};\n`;
  writeFileSync(join(dir, name), source);
}

function syntaxPass(fences: Fence[]): Located[] {
  prepare(FENCE_DIR, ["*.ts", "*.tsx"]);

  const index = new Map<string, Fence>();
  fences.forEach((f: Fence, i: number) => {
    const name = `f${String(i + 1).padStart(4, "0")}.${f.kind}`;
    index.set(name, f);
    writeFence(FENCE_DIR, name, f, false);
  });

  const first: Diagnostic[] = runTsc(FENCE_DIR).filter((d: Diagnostic) => isSyntax(d.code));

  const byFile = new Map<string, Diagnostic[]>();
  for (const d of first) {
    const list: Diagnostic[] = byFile.get(d.file) ?? [];
    list.push(d);
    byFile.set(d.file, list);
  }

  const retry: string[] = [...byFile.entries()]
    .filter(([, ds]: [string, Diagnostic[]]) => ds.every((d: Diagnostic) => FRAGMENT_CODES.has(d.code)))
    .map(([file]: [string, Diagnostic[]]) => file);

  const located = (file: string, d: Diagnostic, wrapped: boolean): Located[] => {
    const fence = index.get(file);
    if (!fence) return [];
    return [
      {
        rel: fence.rel,
        line: fence.line + d.line - (wrapped ? 2 : 1),
        code: d.code,
        message: d.message,
      },
    ];
  };

  const out: Located[] = first
    .filter((d: Diagnostic) => !retry.includes(d.file))
    .flatMap((d: Diagnostic) => located(d.file, d, false));

  if (retry.length === 0) return out;

  prepare(FENCE_DIR, ["*.ts", "*.tsx"]);
  for (const file of retry) writeFence(FENCE_DIR, file, index.get(file)!, true);

  return out.concat(
    runTsc(FENCE_DIR)
      .filter((d: Diagnostic) => isSyntax(d.code))
      .flatMap((d: Diagnostic) => located(d.file, d, true)),
  );
}

// ---------------------------------------------------------------------------
// Pass B — types, one file per chapter
// ---------------------------------------------------------------------------

/** Where each fence landed inside its chapter's scratch file, for mapping diagnostics back. */
interface Segment {
  rel: string;
  /** First line of the fence body in the scratch file. */
  at: number;
  /** First line of the fence body in the markdown file. */
  line: number;
}

function typePass(byChapter: Map<string, Fence[]>): Located[] {
  prepare(CHAPTER_DIR, ["*.tsx"]);

  const index = new Map<string, Segment[]>();

  for (const [rel, fences] of byChapter) {
    const name = `${stemFor(rel)}.tsx`;
    const lines: string[] = [];
    const segments: Segment[] = [];

    for (const f of fences) {
      lines.push(`// ${f.rel}:${f.line}`);
      segments.push({ rel: f.rel, at: lines.length + 1, line: f.line });
      lines.push(...f.body, "");
    }
    lines.push("export {};", "");

    index.set(name, segments);
    writeFileSync(join(CHAPTER_DIR, name), lines.join("\n"));
  }

  return runTsc(CHAPTER_DIR).flatMap((d: Diagnostic) => {
    const segments = index.get(d.file);
    if (!segments) return [];
    let seg: Segment | undefined;
    for (const s of segments) {
      if (s.at <= d.line) seg = s;
      else break;
    }
    if (!seg) return [];
    return [{ rel: seg.rel, line: seg.line + (d.line - seg.at), code: d.code, message: d.message }];
  });
}

// ---------------------------------------------------------------------------
// Baseline
// ---------------------------------------------------------------------------

function readBaseline(): Record<string, number> {
  if (!existsSync(BASELINE_FILE)) return {};
  return JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Record<string, number>;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const docs: Doc[] = loadBook(ROOT);
const byChapter = new Map<string, Fence[]>();
const all: Fence[] = [];

for (const doc of docs) {
  const fences: Fence[] = extract(doc);
  if (fences.length === 0) continue;
  byChapter.set(doc.rel, fences);
  all.push(...fences);
}

const tsxCount: number = all.filter((f: Fence) => f.kind === "tsx").length;
console.log(
  `check:code-samples — ${all.length} TypeScript fences ` +
    `(${all.length - tsxCount} ts, ${tsxCount} tsx) in ${byChapter.size} files\n`,
);

const chapterDiagnostics: Located[] = typePass(byChapter);
const types: Located[] = chapterDiagnostics.filter((d: Located) => !isSyntax(d.code));

/**
 * The chapter pass can find a grammar fault the fence pass cannot — two adjacent fences that
 * each parse alone but not one after the other, which is how the reader meets them. It has to
 * be reported rather than filtered, and it has to be reported *here*: a syntactic diagnostic
 * anywhere in the program stops the compiler before it type-checks, so leaving one in place
 * would silently zero the type gate.
 */
const syntax: Located[] = syntaxPass(all).concat(
  chapterDiagnostics.filter((d: Located) => isSyntax(d.code) && !FRAGMENT_CODES.has(d.code)),
);

// --- the syntax gate -------------------------------------------------------

if (syntax.length > 0) {
  console.log(`✖ Syntax — ${syntax.length} fence${syntax.length === 1 ? "" : "s"} do not parse\n`);
  for (const d of syntax) {
    console.log(`  ${d.rel}:${d.line}  ${d.code} ${d.message}`);
  }
  console.log(
    "\n  A fence labelled `typescript` must be TypeScript; JSX belongs in a `tsx` fence.\n" +
      "  A fence that is a deliberate fragment can opt out with `<!-- check-skip: reason -->`\n" +
      "  on the line above it.\n",
  );
} else {
  console.log("✔ Syntax — every fence parses\n");
}

// --- the type gate ---------------------------------------------------------

const counts: Record<string, number> = {};
for (const d of types) counts[d.code] = (counts[d.code] ?? 0) + 1;

if (ONLY) {
  const hits: Located[] = types.filter((d: Located) => d.code === ONLY);
  console.log(`${ONLY} — ${hits.length} occurrence${hits.length === 1 ? "" : "s"}\n`);
  for (const d of hits) console.log(`  ${d.rel}:${d.line}  ${d.message}`);
  process.exit(syntax.length > 0 ? 1 : 0);
}

if (UPDATE) {
  // Commonest first, so a diff of this file reads as "what is left to burn down".
  const sorted: Record<string, number> = Object.fromEntries(
    Object.entries(counts).sort(
      (a: [string, number], b: [string, number]) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
  writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Baseline written: ${Object.keys(counts).length} codes, ${types.length} diagnostics.`);
  process.exit(syntax.length > 0 ? 1 : 0);
}

const baseline: Record<string, number> = readBaseline();
const codes: string[] = [...new Set([...Object.keys(counts), ...Object.keys(baseline)])].sort(
  (a: string, b: string) => (counts[b] ?? 0) - (counts[a] ?? 0),
);

let regressed = false;
console.log("Types — diagnostic  now  baseline");
for (const code of codes) {
  const now: number = counts[code] ?? 0;
  const was: number = baseline[code] ?? 0;
  const mark: string = now > was ? "✖" : now < was ? "↓" : " ";
  if (now > was) regressed = true;
  if (now === 0 && was === 0) continue;
  console.log(`  ${mark} ${code.padEnd(10)} ${String(now).padStart(5)}  ${String(was).padStart(5)}`);
}
console.log(`\n  total ${types.length} (baseline ${Object.values(baseline).reduce((a, b) => a + b, 0)})`);

if (regressed) {
  console.log("\n✖ A diagnostic count went up. Run with --code=TSxxxx to see where.");
} else if (types.length > 0) {
  console.log(
    "\n✔ No count went up. These are excerpt diagnostics, not broken code — see the\n" +
      "  script header. Burn them down and commit the lower baseline.",
  );
}

const failed: boolean = syntax.length > 0 || regressed || (STRICT && types.length > 0);
process.exit(failed ? 1 : 0);
