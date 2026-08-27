/**
 * collect-chapters.ts — improvement #5
 *
 * Assembles every in-book markdown file into one manuscript at build/book.md,
 * in reading order, ready for pandoc.
 *
 *   node --experimental-strip-types scripts/collect-chapters.ts
 *   node --experimental-strip-types scripts/collect-chapters.ts --list   # paths only
 *
 * Two things happen to each chapter on the way in:
 *   1. Its front matter is stripped — pandoc would otherwise read it as book metadata
 *      and the last file to declare a `title` would win.
 *   2. Every heading is pushed down one level, so a chapter's `#` becomes `##`. That
 *      leaves level 1 free for the part dividers this script inserts, which is what
 *      pandoc's --top-level-division=part expects.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadBook, PART_NAMES, type Doc } from "./lib/book.ts";

const ROOT: string = process.cwd();
const LIST_ONLY: boolean = process.argv.includes("--list");
const OUT_DIR: string = join(ROOT, "build");
const OUT_FILE: string = join(OUT_DIR, "book.md");

/**
 * Add one `#` to every ATX heading, skipping anything inside a fenced code block —
 * a `# comment` line in a bash fence is not a heading.
 */
function demoteHeadings(body: string): string {
  let inFence = false;
  let fenceMarker = "";

  return body
    .split("\n")
    .map((line: string) => {
      const fence = /^\s*(```+|~~~+)/.exec(line);
      if (fence) {
        if (!inFence) {
          inFence = true;
          fenceMarker = fence[1][0];
        } else if (fence[1][0] === fenceMarker) {
          inFence = false;
        }
        return line;
      }

      if (inFence) return line;
      return /^#{1,5} /.test(line) ? "#" + line : line;
    })
    .join("\n");
}

/**
 * Give a chapter an anchor even when it has none. Cross-references target
 * `#ch-<slug>`, and a chapter #3 has not stamped yet would otherwise be unlinkable.
 */
function ensureAnchor(body: string, doc: Doc): string {
  const slug: string | undefined = doc.fm.slug;
  if (!slug) return body;

  const lines: string[] = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^## /.test(lines[i])) continue; // already demoted, so ## is the chapter title
    if (!/\{#[^}]+\}\s*$/.test(lines[i])) lines[i] = `${lines[i].trimEnd()} {#ch-${slug}}`;
    break;
  }
  return lines.join("\n");
}

const docs: Doc[] = loadBook(ROOT);

if (LIST_ONLY) {
  for (const doc of docs) console.log(doc.rel);
  process.exit(0);
}

const chunks: string[] = [];
let currentPart = -1;
let unmapped = 0;

for (const doc of docs) {
  if (doc.part !== currentPart) {
    currentPart = doc.part;
    const name: string = PART_NAMES[currentPart] ?? "Unsorted";
    const heading: string =
      currentPart === 0
        ? "# Unsorted {.unnumbered}"
        : currentPart === 10
          ? `# ${name}`
          : `# Part ${currentPart} — ${name}`;
    chunks.push(heading + "\n");
  }

  if (doc.part === 0) unmapped++;

  chunks.push(ensureAnchor(demoteHeadings(doc.body), doc).trimEnd() + "\n");
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, chunks.join("\n"), "utf8");

const totalLines: number = docs.reduce((n: number, d: Doc) => n + d.lines, 0);
console.log(`  ${docs.length} files · ${totalLines.toLocaleString()} lines → build/book.md`);
if (unmapped > 0) {
  console.log(`  ⚠️  ${unmapped} file(s) have no part mapping — collected under "Unsorted"`);
}
