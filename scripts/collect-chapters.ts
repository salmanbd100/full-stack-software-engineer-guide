/**
 * collect-chapters.ts — improvement #5
 *
 * Assembles every in-book markdown file into one manuscript in reading order, ready for
 * pandoc.
 *
 *   node --experimental-strip-types scripts/collect-chapters.ts
 *   node --experimental-strip-types scripts/collect-chapters.ts --list   # paths only
 *   node --experimental-strip-types scripts/collect-chapters.ts --volume=companion
 *
 * ## Two volumes, since #86
 *
 * `--volume=book` (the default) writes build/book.md — Parts I–IX, the front matter and
 * the back matter. `--volume=companion` writes build/companion.md, which is the DSA
 * appendix alone. BOOK-SPEC.md § 5 has always excluded the appendix from the book's
 * 57,200 lines "because it ships as a companion"; before #86 the build bound it in
 * anyway, so the spec's arithmetic described a book the build did not produce.
 *
 * **A cross-reference that points at the other volume keeps its title and loses its
 * link**, with the volume named in brackets. That is the same rule build-site.ts (#78)
 * applies to a chapter the site does not publish, and it is what stops the book shipping
 * a `(p. ??)` where a page number should be. #86 counted 17 of them; 16 were the question
 * index's DSA section, which #95a moved into Book 2's own index. One is left, in the front
 * matter, and `lint:docs` allows it only because it names Book 2 as a whole — see its
 * `cross-volume-xref` rule.
 *
 * Back matter binds into whichever volume `volumeOf` says, so Book 2 closes on its own
 * question index (#95a) rather than on none.
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
import {
  COMPANION_PART,
  loadBook,
  matterFor,
  PART_NAMES,
  volumeOf,
  type Doc,
  type Matter,
  type Volume,
} from "./lib/book.ts";

const ROOT: string = process.cwd();
const LIST_ONLY: boolean = process.argv.includes("--list");
const OUT_DIR: string = join(ROOT, "build");

const VOLUME: Volume = process.argv.includes("--volume=companion") ? "companion" : "book";
const OUT_FILE: string = join(OUT_DIR, VOLUME === "companion" ? "companion.md" : "book.md");

/**
 * What a cross-reference into the other volume says instead of linking. The reader sees
 * these words, so they use the names on the title pages — "Book 2" since #95a.
 */
const OTHER_VOLUME: Readonly<Record<Volume, string>> = {
  book: "Book 2",
  companion: "Book 1",
};

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

const all: Doc[] = loadBook(ROOT);
const docs: Doc[] = all.filter((d: Doc) => volumeOf(d) === VOLUME);

/**
 * Every `#ch-` anchor this volume carries. Anything else a link points at is in the other
 * volume, and a link to a page that is not in the reader's hands is worse than no link:
 * in print it resolves to nothing and xref.lua reports it, in EPUB it is a dead internal
 * href.
 */
const anchors: Set<string> = new Set(
  docs.map((d: Doc) => d.fm.slug).filter((s): s is string => Boolean(s)),
);

/** `[Two Pointers](#ch-two-pointers)` → `Two Pointers (companion volume)`. */
function demoteForeignRefs(body: string): string {
  return body.replace(
    /\[([^\]]+)\]\(#ch-([a-z0-9-]+)\)/g,
    (whole: string, text: string, slug: string) =>
      anchors.has(slug) ? whole : `${text.replace(/^Chapter \?\? — /, "")} (${OTHER_VOLUME[VOLUME]})`,
  );
}

if (LIST_ONLY) {
  for (const doc of docs) console.log(doc.rel);
  process.exit(0);
}

/**
 * The level-1 divider a run of files sits under, or `null` for no divider at all.
 *
 * Front matter gets `null` deliberately — improvement #72. It is the first thing in the
 * book, so there is no part above it to escape from, and a `\part*{Front Matter}` page
 * before the preface is not how a book opens. Back matter is the opposite case: without
 * a divider the glossary would sit inside Part IX in the generated contents, so it gets
 * one. "Unsorted" now means only what it says — a `part: 0` file with neither matter tag,
 * which is a mistake rather than a placement.
 */
function dividerFor(part: number, matter: Matter | null): string | null {
  if (part === 0) {
    if (matter === "front") return null;
    return matter === "back" ? "# Back Matter {.unnumbered}" : "# Unsorted {.unnumbered}";
  }
  const name: string = PART_NAMES[part] ?? "Unsorted";
  return part === COMPANION_PART ? `# ${name}` : `# Part ${part} — ${name}`;
}

const chunks: string[] = [];
let currentGroup = "";
let unmapped = 0;

for (const doc of docs) {
  const matter: Matter | null = matterFor(doc);
  const group: string = doc.part === 0 ? `matter-${matter ?? "none"}` : `part-${doc.part}`;

  if (group !== currentGroup) {
    currentGroup = group;
    const divider: string | null = dividerFor(doc.part, matter);
    if (divider !== null) chunks.push(divider + "\n");
  }

  if (doc.part === 0 && matter === null) unmapped++;

  chunks.push(demoteForeignRefs(ensureAnchor(demoteHeadings(doc.body), doc)).trimEnd() + "\n");
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, chunks.join("\n"), "utf8");

const totalLines: number = docs.reduce((n: number, d: Doc) => n + d.lines, 0);
const outName: string = VOLUME === "companion" ? "companion.md" : "book.md";
console.log(
  `  ${VOLUME} · ${docs.length} files · ${totalLines.toLocaleString()} lines → build/${outName}`,
);
if (unmapped > 0) {
  console.log(`  ⚠️  ${unmapped} file(s) have no part mapping — collected under "Unsorted"`);
}
