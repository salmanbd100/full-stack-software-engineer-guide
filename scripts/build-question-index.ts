/**
 * build-question-index.ts — improvement #73
 *
 * Writes one question index per volume: `Interview-Question-Index.md` for the handbook and
 * `DSA-Question-Index.md` for Book 2 (#95a). Each is every `## Interview Questions` entry
 * in its volume, grouped by part and chapter, each chapter carrying a `#ch-` cross-reference.
 *
 *   node --experimental-strip-types scripts/build-question-index.ts           # write
 *   node --experimental-strip-types scripts/build-question-index.ts --check   # verify only
 *
 * ## Why this is generated rather than written
 *
 * The index is ~1,000 questions over ~250 chapters, and it is a *second* copy of text whose
 * canonical home is the chapter — which BOOK-SPEC.md non-negotiable #7 only tolerates
 * because nothing here is authored. Hand-maintaining it would put it one chapter edit away
 * from being wrong, silently, with no check. #74 and #76 both rewrite chapters after this
 * item, so "silently" would have meant "immediately".
 *
 * `--check` is what keeps it honest: it regenerates into memory and diffs, so a stale index
 * is a failed command rather than a wrong page — for either volume's index. Same shape as `number-chapters.ts --check`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  COMPANION_PART,
  loadBook,
  matterFor,
  PART_NAMES,
  volumeOf,
  type Doc,
  type Volume,
} from "./lib/book.ts";

const ROOT: string = process.cwd();
const CHECK_ONLY: boolean = process.argv.includes("--check");

/** Part numbers as the book prints them — the part openers all use roman. */
const ROMAN: Readonly<Record<number, string>> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
};

/**
 * Pull the questions out of one chapter.
 *
 * A question is a `**Q: …**` paragraph. Most sit on one line; a few wrap, so the scan
 * accumulates until the closing `**`. Fenced code is skipped — a `**Q:` inside a sample
 * would not be a question.
 */
function questionsIn(doc: Doc): string[] {
  const lines: string[] = doc.body.split("\n");
  const out: string[] = [];

  let inFence = false;
  let fenceChar = "";
  let buffer: string | null = null;

  for (const line of lines) {
    const fence = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceChar = fence[1][0];
      } else if (fence[1][0] === fenceChar) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    if (buffer === null) {
      const start = /^\*\*Q:\s*(.*)$/.exec(line);
      if (!start) continue;
      buffer = start[1];
    } else {
      buffer += " " + line.trim();
    }

    if (/\*\*\s*$/.test(buffer)) {
      out.push(buffer.replace(/\*\*\s*$/, "").replace(/\s+/g, " ").trim());
      buffer = null;
    }
  }

  return out;
}

interface Entry {
  readonly title: string;
  readonly slug: string;
  readonly questions: readonly string[];
}

/**
 * One index per volume — #95a.
 *
 * Until #95a there was one index, bound into the handbook, and it carried Book 2's 87
 * questions under an `Appendix — DSA Patterns` heading. None of those 16 chapter links
 * could resolve in the handbook: `collect-chapters.ts` quietly demoted every one to plain
 * text, so the handbook listed questions it did not answer and Book 2 shipped with no
 * index at all. Each volume now indexes its own chapters, and `volumeOf` decides which is
 * which — there is no second rule here for what counts as DSA.
 */
interface IndexSpec {
  readonly volume: Volume;
  readonly file: string;
  readonly slug: string;
  readonly tags: string;
  /** What the opening paragraph calls the chapters being indexed. */
  readonly source: string;
  readonly readNext: string;
}

const INDEXES: readonly IndexSpec[] = [
  {
    volume: "book",
    file: "Interview-Question-Index.md",
    slug: "interview-question-index",
    tags: "[back-matter, interview, index]",
    source: "the **Interview Questions** block that closes a chapter",
    readNext: `- [Chapter ?? — Glossary](#ch-glossary) — a term you met in a question, in one line
- [Chapter ?? — How to Read This Book](#ch-how-to-read-this-book) — where this index sits in the six-week plan
- [Chapter ?? — Further Reading](#ch-further-reading) — what to read when a whole part came back blank`,
  },
  {
    volume: "companion",
    file: "DSA-Question-Index.md",
    slug: "dsa-question-index",
    tags: "[back-matter, companion, interview, index]",
    source: "the **Interview Questions** block that closes each pattern in Book 2",
    readNext: `- [Chapter ?? — DSA Patterns](#ch-dsa-index) — the sixteen patterns, and the order to learn them in
- [Chapter ?? — Time and Space Complexity](#ch-time-and-space-complexity) — the vocabulary every answer above is scored in`,
  },
];

const all: Doc[] = loadBook(ROOT);
const today: string = new Date().toISOString().slice(0, 10);

interface Built {
  readonly spec: IndexSpec;
  readonly output: string;
  readonly total: number;
  readonly chapters: number;
  readonly parts: number;
}

function build(spec: IndexSpec): Built {
  const docs: Doc[] = all.filter(
    (d: Doc) => matterFor(d) === null && d.part !== 0 && volumeOf(d) === spec.volume,
  );

  const byPart = new Map<number, Entry[]>();
  let total = 0;

  for (const doc of docs) {
    const questions: string[] = questionsIn(doc);
    if (questions.length === 0) continue;
    if (!doc.fm.slug || !doc.fm.title) continue;

    if (!byPart.has(doc.part)) byPart.set(doc.part, []);
    byPart.get(doc.part)!.push({ title: doc.fm.title, slug: doc.fm.slug, questions });
    total += questions.length;
  }

  const parts: number[] = [...byPart.keys()].sort((a: number, b: number) => a - b);
  const chapters: number = [...byPart.values()].reduce((n: number, e: Entry[]) => n + e.length, 0);

  const head = `---
title: Interview Question Index
part: 0
chapter: 101
slug: ${spec.slug}
level: intermediate # beginner | intermediate | advanced
reading_time: ${spec.volume === "book" ? 40 : 5}
updated: ${today}
tags: ${spec.tags}
in_book: true
---

# Interview Question Index {#ch-${spec.slug}}

> Test yourself on a part in twenty minutes, and find out which chapters you actually have to reread.

**In this index:** how to use it · every question in the book · grouped by part and chapter · each chapter linked

Every question below is taken from ${spec.source}. There are
**${total.toLocaleString()} of them across ${chapters} chapters**. The answers are not repeated here — they are in the chapter,
which is what the link on each heading is for.

## How to Use It

Answer out loud, then check. Those are the two halves, and skipping the first one is what makes a
reader feel ready and then stall in the room.

1. **Answer it aloud, in under ninety seconds.** The gap between what you recognise and what you can
   say is the whole thing the loop measures, and reading silently hides it.
2. **Mark it fluent, shaky, or blank.** Three buckets is enough. A finer scale is procrastination.
3. **Open the chapter only for the shaky and the blank.** Rereading what you already know is the most
   comfortable way to waste a week.
4. **Come back to the same part three days later.** Recall decays fastest in the first seventy-two
   hours, so the second pass is where the revision actually happens.

A part you can answer at eighty per cent aloud is a part you can stop revising. One that scores below
half is a part to read properly, not to skim again.

> ⚠️ **These are not the questions you will be asked.** They are the questions the book answers, which
> is a different set. Memorising the list would be the wrong use of it. Each one is a prompt to
> reconstruct an explanation, and the interview version will arrive with different words around it.
`;

  const body: string[] = [];

  for (const part of parts) {
    const name: string = PART_NAMES[part] ?? "Unsorted";
    const heading: string =
      part === COMPANION_PART ? `## ${name}` : `## Part ${ROMAN[part] ?? part} — ${name}`;
    const entries: Entry[] = byPart.get(part)!;
    const count: number = entries.reduce((n: number, e: Entry) => n + e.questions.length, 0);

    body.push("");
    body.push(heading);
    body.push("");
    body.push(`_${count} questions across ${entries.length} chapters._`);
    body.push("");

    for (const entry of entries) {
      body.push(`- **[${entry.title}](#ch-${entry.slug})**`);
      for (const q of entry.questions) body.push(`  - ${q}`);
    }
  }

  const tail = `
## What to Read Next

${spec.readNext}
`;

  return { spec, output: head + body.join("\n") + "\n" + tail, total, chapters, parts: parts.length };
}

const built: Built[] = INDEXES.map(build);

if (CHECK_ONLY) {
  // `updated:` moves on its own; everything below the front matter is what has to match.
  const strip = (s: string): string => s.slice(s.indexOf("\n---", 4));
  let stale = false;

  for (const { spec, output, total, chapters } of built) {
    let current: string | null = null;
    try {
      current = readFileSync(join(ROOT, spec.file), "utf8");
    } catch {
      console.log(`\n❌ ${spec.file} does not exist. Run pnpm index:questions.`);
      stale = true;
      continue;
    }
    if (strip(current) !== strip(output)) {
      console.log(`\n❌ ${spec.file} is stale — ${total} questions in the tree. Run pnpm index:questions.`);
      stale = true;
      continue;
    }
    console.log(`\n✅ ${spec.file} is current — ${total} questions, ${chapters} chapters.`);
  }

  console.log("");
  process.exit(stale ? 1 : 0);
}

console.log("\n📇 build-question-index");
for (const { spec, output, total, chapters, parts } of built) {
  writeFileSync(join(ROOT, spec.file), output, "utf8");
  console.log(
    `   ${spec.volume.padEnd(9)} ${total} questions from ${chapters} chapters across ${parts} part(s) → ${spec.file} (${output.split("\n").length} lines)`,
  );
}
console.log("");
