/**
 * measure-pages.ts — improvement #77
 *
 * What the book actually costs in pages, measured off the typeset PDF rather than
 * estimated from a lines-per-page rate somebody wrote down once.
 *
 *   node --experimental-strip-types scripts/measure-pages.ts        # pnpm book:pages
 *   node --experimental-strip-types scripts/measure-pages.ts --json
 *
 * 🔴 **Why this script exists at all.** `BOOK-SPEC.md` § 5 assumed ~55 markdown lines per
 * typeset page and projected a 950–1,050 page book; decision #13 then set a hard ceiling
 * of 700. Neither number was ever measured, and the one real build produced **36 lines
 * per page** — optimistic by half. Every page decision in this book was therefore being
 * taken against a figure nobody had checked. This reports the real one, per part, so the
 * next decision is taken against the tree.
 *
 * **How a page is attributed to a part.** The part openers are found in the PDF's own
 * text: the `book` class gives `\part` a page to itself, and `structure.tex` sets it as a
 * grey numeral over the part name with nothing else on the leaf but the running footer.
 * A part then runs from its opener to the page before the next one. That is the
 * typesetter's own answer rather than a second model of the book — the alternative,
 * multiplying line counts by a global rate, would produce a per-part breakdown that could
 * not disagree with the rate it was derived from, and so could never be wrong in a way
 * anybody noticed.
 *
 * The blank verso the class inserts before an opener is counted against the part that
 * ends on it, because that is where it physically is.
 *
 * Line counts come from `loadBook`, the same model `lint-docs.ts` measures § 5's budgets
 * with, so a part's lines here and its budget overage there cannot disagree.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  loadBook,
  matterFor,
  partBudgets,
  PART_NAMES,
  volumeOf,
  type Doc,
} from "./lib/book.ts";

const ROOT: string = process.cwd();
const PDF: string = join(ROOT, "build", "handbook.pdf");

/**
 * The companion volume (#86). Measured separately and reported on its own line, because
 * BOOK-SPEC.md § 5 has always kept the DSA appendix outside the book's budget — and
 * because a ceiling argued about a figure that included a second volume was being argued
 * about the wrong number.
 */
const COMPANION_PDF: string = join(ROOT, "build", "companion.pdf");
const AS_JSON: boolean = process.argv.includes("--json");

/** BOOK-SPEC decision #13. A hard ceiling on the edition, not an editorial preference. */
const PAGE_CEILING = 700;

/** Part numbers used for the two runs of pages that are not a numbered part. */
const FRONT = -1;
const BACK = 98;

// ---------------------------------------------------------------------------
// The PDF
// ---------------------------------------------------------------------------

/**
 * Every page of the PDF as text, in order.
 *
 * `pdftotext` rather than a PDF library: it is already a dependency of the build, which
 * uses it to prove that no cross-reference printed as "(p. ??)". One tool for both checks
 * is one tool to install.
 */
function pdfPages(path: string): string[] {
  let raw: string;
  try {
    raw = execFileSync("pdftotext", ["-layout", path, "-"], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (err: unknown) {
    throw new Error(
      "measure-pages: pdftotext failed. Install poppler with `brew install poppler`.\n  " +
        String(err),
    );
  }
  // pdftotext separates pages with a form feed and appends one after the last page.
  const pages: string[] = raw.split("\f");
  if (pages.length > 0 && pages[pages.length - 1].trim() === "") pages.pop();
  return pages;
}

/** The running footer, which is on every page including the otherwise-empty ones. */
const FOOTER = /©\s*Salman Rahman|www\.salmanrahman\.com/g;

/** Collapse a page to the words on it, with the furniture removed. */
function bareText(page: string): string {
  return page
    .replace(FOOTER, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function normalise(s: string): string {
  return s
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

interface Divider {
  part: number;
  /** 1-based index of the page the part opener is printed on. */
  page: number;
}

/**
 * Find the page each part opens on.
 *
 * A part opener is the only page in the book whose entire content is a numeral and a part
 * name. Matching on "the page says nothing else" rather than on "the page mentions the
 * part name" is what keeps the running head — which carries the same name on every verso
 * of the part — from being read as ten more openers.
 */
function findDividers(pages: string[]): Divider[] {
  const wanted: [number, string][] = [
    ...Object.entries(PART_NAMES).map(
      ([p, name]): [number, string] => [Number(p), normalise(name)],
    ),
    [BACK, normalise("Back Matter")],
  ];

  const found: Divider[] = [];
  const seen = new Set<number>();

  for (let i = 0; i < pages.length; i++) {
    const text: string = bareText(pages[i]);
    if (text === "") continue;

    for (const [part, name] of wanted) {
      if (seen.has(part)) continue;
      // What may precede the name, and why each case is here:
      //   a Roman numeral — `\bookpartnum` is `\thepart`, and the book class sets that
      //     with \Roman, so Part I's opener reads "I Foundations";
      //   digits — the back matter is a `\part*`, which keeps the running head, so the
      //     folio lands on the same line as the title;
      //   nothing — #80's \setpartname suppresses the numeral for anything not named
      //     "Part N — …", which is the appendix.
      const pattern = new RegExp(`^([ivxlcdm]+\\s+|\\d{1,4}\\s+)?${escape(name)}$`);
      if (pattern.test(text)) {
        found.push({ part, page: i + 1 });
        seen.add(part);
        break;
      }
    }
  }

  return found.sort((a: Divider, b: Divider) => a.page - b.page);
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// The manuscript
// ---------------------------------------------------------------------------

interface PartRow {
  part: number;
  name: string;
  chapters: number;
  lines: number;
  budget: number | null;
  pages: number;
}

function manuscript(docs: Doc[]): Map<number, { chapters: number; lines: number }> {
  const byPart = new Map<number, { chapters: number; lines: number }>();

  for (const doc of docs) {
    let key: number = doc.part;
    if (key === 0) {
      // Book 2's question index is back matter of Book 2, not of this PDF (#95a).
      if (volumeOf(doc) === "companion") continue;
      const matter = matterFor(doc);
      if (matter === "front") key = FRONT;
      else if (matter === "back") key = BACK;
      else continue; // unmapped — lint:docs already fails the build for it
    }
    const row = byPart.get(key) ?? { chapters: 0, lines: 0 };
    row.chapters += 1;
    row.lines += doc.lines;
    byPart.set(key, row);
  }

  return byPart;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function lpad(s: string, n: number): string {
  return s.length >= n ? s : " ".repeat(n - s.length) + s;
}

function main(): void {
  if (!existsSync(PDF)) {
    console.error(`✗ build/handbook.pdf not found. Run \`pnpm book:pdf\` first.`);
    process.exit(1);
  }

  const pages: string[] = pdfPages(PDF);
  const total: number = pages.length;
  const dividers: Divider[] = findDividers(pages);

  const docs: Doc[] = loadBook(ROOT);
  const byPart = manuscript(docs);
  const budgets: Map<number, number> = partBudgets(ROOT);

  // Front matter is whatever comes before the first divider. It has no divider of its
  // own by design — #72: a \part*{Front Matter} page before the preface is not how a book
  // opens — so it is measured as the remainder rather than found.
  const firstDivider: number = dividers.length > 0 ? dividers[0].page : total + 1;

  const rows: PartRow[] = [];

  if (firstDivider > 1) {
    const m = byPart.get(FRONT) ?? { chapters: 0, lines: 0 };
    rows.push({
      part: FRONT,
      name: "Front matter",
      chapters: m.chapters,
      lines: m.lines,
      budget: null,
      pages: firstDivider - 1,
    });
  }

  for (let i = 0; i < dividers.length; i++) {
    const d: Divider = dividers[i];
    const end: number = i + 1 < dividers.length ? dividers[i + 1].page - 1 : total;
    const m = byPart.get(d.part) ?? { chapters: 0, lines: 0 };
    rows.push({
      part: d.part,
      name: d.part === BACK ? "Back matter" : (PART_NAMES[d.part] ?? `Part ${d.part}`),
      chapters: m.chapters,
      lines: m.lines,
      budget: budgets.get(d.part) ?? null,
      pages: end - d.page + 1,
    });
  }

  const bookLines: number = rows.reduce((n: number, r: PartRow) => n + r.lines, 0);
  const rate: number = bookLines / total;

  // The nine numbered parts, which is what § 5's budget total and the spine rule are
  // about. The appendix ships as a companion and the matter is not budgeted.
  const numbered: PartRow[] = rows.filter((r: PartRow) => r.part >= 1 && r.part <= 9);
  const spine: number = numbered
    .filter((r: PartRow) => r.part <= 4)
    .reduce((n: number, r: PartRow) => n + r.lines, 0);
  const bookOnly: number = numbered.reduce((n: number, r: PartRow) => n + r.lines, 0);

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        { totalPages: total, linesPerPage: rate, spineShare: spine / bookOnly, rows },
        null,
        2,
      ),
    );
    return;
  }

  console.log("");
  console.log("📐 book:pages — the page budget, measured off build/handbook.pdf");
  console.log("");
  console.log(
    `  ${pad("Part", 34)}${lpad("Ch", 5)}${lpad("Lines", 9)}${lpad("Budget", 9)}` +
      `${lpad("Pages", 8)}${lpad("L/page", 9)}`,
  );
  console.log(`  ${"─".repeat(74)}`);

  for (const r of rows) {
    const label: string =
      r.part >= 1 && r.part <= 9 ? `${roman(r.part)} — ${r.name}` : r.name;
    const perPage: string = r.pages > 0 ? (r.lines / r.pages).toFixed(1) : "—";
    console.log(
      `  ${pad(label, 34)}${lpad(String(r.chapters), 5)}` +
        `${lpad(r.lines.toLocaleString(), 9)}` +
        `${lpad(r.budget === null ? "—" : r.budget.toLocaleString(), 9)}` +
        `${lpad(String(r.pages), 8)}${lpad(perPage, 9)}`,
    );
  }

  console.log(`  ${"─".repeat(74)}`);
  console.log(
    `  ${pad("Total", 34)}${lpad(String(docs.length), 5)}` +
      `${lpad(bookLines.toLocaleString(), 9)}${lpad("", 9)}` +
      `${lpad(String(total), 8)}${lpad(rate.toFixed(1), 9)}`,
  );
  console.log("");

  // --- the two numbers the spec is amended with -----------------------------

  console.log(`  Measured rate    ${rate.toFixed(1)} markdown lines per typeset page`);
  console.log(
    `  Chapter openings ${docs.length} files, each starting a fresh page` +
      ` (${((docs.length / total) * 100).toFixed(0)}% of the book's pages)`,
  );
  console.log("");

  const over: number = total - PAGE_CEILING;
  const ceilingMark: string = over > 0 ? "❌" : "✅";
  console.log(
    `  ${ceilingMark} ${total} pages against decision #13's ${PAGE_CEILING}-page ceiling` +
      (over > 0 ? `  (+${over}, ${((over / PAGE_CEILING) * 100).toFixed(0)}% over)` : ""),
  );

  reportCompanion(docs);

  const share: number = (spine / bookOnly) * 100;
  const spineMark: string = share >= 50 ? "✅" : "❌";
  console.log(
    `  ${spineMark} Frontend spine (I–IV) ${spine.toLocaleString()} of ` +
      `${bookOnly.toLocaleString()} = ${share.toFixed(1)}%` +
      `  (decision #2's floor: 50%)`,
  );
  console.log("");

  // Nothing here exits non-zero. It is a measurement, and the two figures above are
  // decisions for BOOK-SPEC to record rather than gates for a build to fail on — the
  // ceiling is met by choosing a trim and a chapter-opening rule, not by a script.
}

/**
 * The companion, in one line. It has no budget rule of its own beyond § 4's 5,600 lines,
 * and no share of the book's page count — the whole point of #86 is that it is not in it.
 */
function reportCompanion(docs: Doc[]): void {
  const lines: number = docs
    .filter((d: Doc) => volumeOf(d) === "companion")
    .reduce((n: number, d: Doc) => n + d.lines, 0);
  if (lines === 0) return;

  if (!existsSync(COMPANION_PDF)) {
    console.log(
      `  ·  Book 2 ${lines.toLocaleString()} lines, not measured:` +
        ` build/companion.pdf not found (run \`pnpm book:companion\`)`,
    );
    console.log("");
    return;
  }

  const pages: number = pdfPages(COMPANION_PDF).length;
  console.log(
    `  ·  Book 2 ${lines.toLocaleString()} lines over ${pages} pages` +
      ` (${(lines / pages).toFixed(1)} l/page), built and counted separately since #86`,
  );
  console.log("");
}

function roman(part: number): string {
  return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][part] ?? String(part);
}

main();
