/**
 * number-chapters.ts — improvement #70
 *
 * Stamps front-matter `chapter` on every in-book file so the build produces the
 * intended reading order instead of an alphabetical one.
 *
 *   node --experimental-strip-types scripts/number-chapters.ts --check   # report only
 *   node --experimental-strip-types scripts/number-chapters.ts           # rewrite
 *
 * The order comes from SECTION_ORDER and PART_OPENERS in lib/book.ts, which are read
 * from BOOK-SPEC.md § 4 and from each part opener's own Sections table. Within a
 * section: the README first, then files by name — which is what the `01-` prefixes
 * already encode.
 *
 * Numbers restart at 0 in each part. `chapter: 0` is the part opener; everything
 * else in the part is 1..N in reading order.
 *
 * Back matter at the repository root is left alone. `Glossary.md`, `Further-Reading.md`
 * and `About-the-Author.md` carry deliberately high numbers so they sort last, and #63
 * explains why the first two also sit at `part: 0`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadBook, PART_NAMES, PART_OPENERS, SECTION_ORDER, type Doc } from "./lib/book.ts";

const ROOT: string = process.cwd();
const CHECK_ONLY: boolean = process.argv.includes("--check");

/** Chapters per section above which BOOK-SPEC § 4 says to split. The appendix is exempt. */
const SECTION_CEILING = 12;

function parentDir(rel: string): string {
  const cut: number = rel.lastIndexOf("/");
  return cut === -1 ? "." : rel.slice(0, cut);
}

/**
 * Sort key inside a part: section index, then README-before-chapters, then filename.
 * The part opener gets -1 so it always leads; a file sitting loose in a part's top
 * directory gets a large index so it trails, which is where `AI/07-ai-in-interviews.md`
 * belongs — its own part opener calls it "a closing chapter".
 */
/** An index page rather than a chapter: a section README, or one of the part openers. */
function isIndex(doc: Doc): boolean {
  return doc.isReadme || PART_OPENERS[doc.part] === doc.rel;
}

function sectionIndex(doc: Doc, sections: readonly string[]): number {
  if (PART_OPENERS[doc.part] === doc.rel) return -1;
  const idx: number = sections.indexOf(parentDir(doc.rel));
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

const docs: Doc[] = loadBook(ROOT);
const rewritten: string[] = [];
const problems: string[] = [];

const byPart = new Map<number, Doc[]>();
for (const doc of docs) {
  // Root-level back matter is numbered by hand and sorts last by design. The four
  // root-level part openers written at #76 are the exception: they are the `chapter: 0`
  // of their part, so they have to take part in its numbering rather than sit outside it.
  if (parentDir(doc.rel) === "." && PART_OPENERS[doc.part] !== doc.rel) continue;
  if (!byPart.has(doc.part)) byPart.set(doc.part, []);
  byPart.get(doc.part)!.push(doc);
}

for (const part of [...byPart.keys()].sort((a: number, b: number) => a - b)) {
  const sections: readonly string[] = SECTION_ORDER[part] ?? [];
  const list: Doc[] = byPart.get(part)!;

  for (const doc of list) {
    if (sectionIndex(doc, sections) === Number.MAX_SAFE_INTEGER && !doc.isReadme) continue;
    if (sectionIndex(doc, sections) === Number.MAX_SAFE_INTEGER && doc.isReadme) {
      problems.push(`${doc.rel} — directory is not in SECTION_ORDER[${part}]; place it deliberately`);
    }
  }

  list.sort((a: Doc, b: Doc) => {
    const secA: number = sectionIndex(a, sections);
    const secB: number = sectionIndex(b, sections);
    if (secA !== secB) return secA - secB;
    if (a.isReadme !== b.isReadme) return a.isReadme ? -1 : 1;
    return a.rel.localeCompare(b.rel);
  });

  // Chapters per section, for the BOOK-SPEC § 4 "split it if it is bigger" check.
  const perSection = new Map<string, number>();
  for (const doc of list) {
    if (isIndex(doc)) continue;
    const dir: string = parentDir(doc.rel);
    perSection.set(dir, (perSection.get(dir) ?? 0) + 1);
  }
  for (const [dir, count] of perSection) {
    if (count > SECTION_CEILING && part !== 10) {
      problems.push(`${dir} — ${count} chapters, over the ${SECTION_CEILING} ceiling in BOOK-SPEC § 4`);
    }
  }

  const hasOpener: boolean = PART_OPENERS[part] !== undefined;
  let n: number = hasOpener ? 0 : 1;

  for (const doc of list) {
    const want: number = n++;
    if (doc.fm.chapter === want) continue;

    const abs: string = join(ROOT, doc.rel);
    const source: string = readFileSync(abs, "utf8");
    const next: string = source.replace(/^(---\n[\s\S]*?)^chapter:[ \t]*\d+[ \t]*$/m, `$1chapter: ${want}`);

    if (next === source) {
      problems.push(`${doc.rel} — no \`chapter:\` line in the front matter to rewrite`);
      continue;
    }

    rewritten.push(`  ${String(doc.fm.chapter).padStart(3)} → ${String(want).padStart(3)}  ${doc.rel}`);
    if (!CHECK_ONLY) writeFileSync(abs, next);
  }
}

console.log(`\n🔢 number-chapters — ${docs.length} in-book files, ${byPart.size} parts\n`);

for (const part of [...byPart.keys()].sort((a: number, b: number) => a - b)) {
  const list: Doc[] = byPart.get(part)!;
  const chapters: number = list.filter((d: Doc) => !isIndex(d)).length;
  console.log(
    `  Part ${String(part).padStart(2)} — ${(PART_NAMES[part] ?? "Unsorted").padEnd(32)} ${String(chapters).padStart(3)} chapters · ${String(list.length).padStart(3)} files`,
  );
}

if (rewritten.length > 0) {
  console.log(`\n  ${CHECK_ONLY ? "would renumber" : "renumbered"} ${rewritten.length} file(s):\n`);
  for (const line of rewritten) console.log(line);
} else {
  console.log(`\n  ✅ every file already carries its reading-order number.`);
}

if (problems.length > 0) {
  console.log(`\n  ⚠️  ${problems.length} problem(s):\n`);
  for (const line of problems) console.log(`   - ${line}`);
  process.exit(1);
}

console.log("");
