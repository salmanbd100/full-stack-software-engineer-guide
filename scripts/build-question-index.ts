/**
 * build-question-index.ts — improvement #73
 *
 * Writes `Interview-Question-Index.md`: every `## Interview Questions` entry in the book,
 * grouped by part and chapter, each chapter carrying a `#ch-` cross-reference.
 *
 *   node --experimental-strip-types scripts/build-question-index.ts           # write
 *   node --experimental-strip-types scripts/build-question-index.ts --check   # verify only
 *
 * ## Why this is generated rather than written
 *
 * The index is 961 questions over 229 chapters, and it is a *second* copy of text whose
 * canonical home is the chapter — which BOOK-SPEC.md non-negotiable #7 only tolerates
 * because nothing here is authored. Hand-maintaining it would put it one chapter edit away
 * from being wrong, silently, with no check. #74 and #76 both rewrite chapters after this
 * item, so "silently" would have meant "immediately".
 *
 * `--check` is what keeps it honest: it regenerates into memory and diffs, so a stale index
 * is a failed command rather than a wrong page. Same shape as `number-chapters.ts --check`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadBook, matterFor, PART_NAMES, type Doc } from "./lib/book.ts";

const ROOT: string = process.cwd();
const CHECK_ONLY: boolean = process.argv.includes("--check");
const OUT_FILE: string = join(ROOT, "Interview-Question-Index.md");
const SLUG = "interview-question-index";

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

const docs: Doc[] = loadBook(ROOT).filter(
  (d: Doc) => d.fm.slug !== SLUG && matterFor(d) === null && d.part !== 0,
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
const today: string = new Date().toISOString().slice(0, 10);

const head = `---
title: Interview Question Index
part: 0
chapter: 101
slug: ${SLUG}
level: intermediate # beginner | intermediate | advanced
reading_time: 40
updated: ${today}
tags: [back-matter, interview, index]
in_book: true
---

# Interview Question Index {#ch-${SLUG}}

> Test yourself on a part in twenty minutes, and find out which chapters you actually have to reread.

**In this index:** how to use it · every question in the book · grouped by part and chapter · each chapter linked

Every question below is taken from the **Interview Questions** block that closes a chapter. There are
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
    part === 10 ? `## ${name}` : `## Part ${ROMAN[part] ?? part} — ${name}`;
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

- [Chapter ?? — Glossary](#ch-glossary) — a term you met in a question, in one line
- [Chapter ?? — How to Read This Book](#ch-how-to-read-this-book) — where this index sits in the six-week plan
- [Chapter ?? — Further Reading](#ch-further-reading) — what to read when a whole part came back blank
`;

const output: string = head + body.join("\n") + "\n" + tail;

if (CHECK_ONLY) {
  let current = "";
  try {
    current = readFileSync(OUT_FILE, "utf8");
  } catch {
    console.log("\n❌ Interview-Question-Index.md does not exist. Run pnpm index:questions.\n");
    process.exit(1);
  }
  // `updated:` moves on its own; everything below the front matter is what has to match.
  const strip = (s: string): string => s.slice(s.indexOf("\n---", 4));
  if (strip(current) !== strip(output)) {
    console.log(
      `\n❌ Interview-Question-Index.md is stale — ${total} questions in the tree. Run pnpm index:questions.\n`,
    );
    process.exit(1);
  }
  console.log(`\n✅ Interview-Question-Index.md is current — ${total} questions, ${chapters} chapters.\n`);
  process.exit(0);
}

writeFileSync(OUT_FILE, output, "utf8");
console.log(
  `\n📇 build-question-index — ${total} questions from ${chapters} chapters across ${parts.length} parts`,
);
console.log(`   → Interview-Question-Index.md (${output.split("\n").length} lines)\n`);
