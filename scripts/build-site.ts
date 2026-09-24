/**
 * build-site.ts — improvement #78
 *
 * Generates the companion site's pages from the manuscript.
 *
 *   pnpm site:pages     # write site/book/** and the sidebar, then stop
 *   pnpm site:dev       # the same, then VitePress in watch mode
 *   pnpm site:build     # the same, then a static build into site/.vitepress/dist
 *
 * ## What the companion carries, and what it does not
 *
 * The site is free and the book is not, so it cannot be the book. It carries the pages that
 * are **useful without the book and better with it**: the front matter, every back-matter
 * page — the glossary, the further-reading list and every interview question — and one
 * **sample chapter per part**, chosen as that part's strongest opening argument.
 *
 * That split is the marketing decision, not a technical one. The question index is the
 * page people will link to; the sample chapters are what convince someone the answers are
 * worth paying for; the remaining 236 chapters are the product.
 *
 * Nothing here is hand-maintained. Every page is copied from the manuscript at build time,
 * so a chapter edit reaches the site on the next run and the two can never drift.
 */

import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  COMPANION_PART,
  loadBook,
  matterFor,
  PART_NAMES,
  PART_OPENERS,
  volumeOf,
  type Doc,
} from "./lib/book.ts";
import { STORE_URL, STORE_IS_PLACEHOLDER } from "./lib/store.ts";

const ROOT: string = process.cwd();
const SITE: string = join(ROOT, "site");
const PAGES: string = join(SITE, "book");

/**
 * One chapter per part, by slug.
 *
 * Each is the chapter that makes its part's argument in the fewest pages — the one worth
 * reading cold by somebody deciding whether to buy. Part openers and section indexes come
 * across automatically, so a visitor always sees the shape of the part around the sample.
 */
const SAMPLE_CHAPTERS: readonly string[] = [
  "closures", // I — the question every loop still opens with
  "accessibility-and-the-law", // II — the part's sharpest "you did not know this" chapter
  "four-kinds-of-state", // III — the framing the whole part hangs off
  "core-web-vitals", // IV — a budget somebody is held to, made concrete
  "rest-best-practices", // V — the strongest voice in the book
  "driving-the-round", // VI — the chapter that changes how a design round sounds
  "when-rag-when-fine-tune-when-neither", // VII — the decision people get wrong first
  "deployment-strategies", // VIII — the way back, which is the senior half
  "star-framework", // IX — the container every other answer goes in
];

/** A part opener or section README: navigation, and always published. */
function isIndex(doc: Doc): boolean {
  return doc.isReadme || PART_OPENERS[doc.part] === doc.rel;
}

function published(doc: Doc): boolean {
  if (doc.part === 0) return true; // front and back matter
  if (isIndex(doc)) return true;
  return doc.fm.slug !== undefined && SAMPLE_CHAPTERS.includes(doc.fm.slug);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** `/book/part-4/core-web-vitals` — stable, and independent of where the file sits. */
function routeFor(doc: Doc, slug: string): string {
  const matter = matterFor(doc);
  if (doc.part === 0) return `/book/${matter === "front" ? "front" : "back"}/${slug}`;
  return `/book/part-${doc.part}/${slug}`;
}

/** Fallback for a file with no front-matter slug, which lint:docs should never allow. */
function slugFor(doc: Doc): string {
  return doc.fm.slug ?? doc.rel.replace(/\.md$/, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
}

// ---------------------------------------------------------------------------
// Page bodies
// ---------------------------------------------------------------------------

const XREF = /\[([^\]]+)\]\(#ch-([a-z0-9-]+)\)/g;

/**
 * Rewrite the book's own cross-references for the web.
 *
 * `[Chapter ?? — Title](#ch-slug)` is an in-page anchor in the PDF and a route here. A
 * reference to a chapter the site does not publish loses its link and keeps its name: a
 * dead link to a page that exists only in the book is worse than no link, and "in the
 * book" is the site's actual job. Four out of five references land in that branch, which
 * is what the sampling means.
 */
function rewriteLinks(body: string, routes: Map<string, string>): string {
  return body.replace(XREF, (_match: string, text: string, slug: string) => {
    const route: string | undefined = routes.get(slug);
    return route === undefined ? `**${text}** *(in the book)*` : `[${text}](${route})`;
  });
}

/** Strip the `Chapter ?? — ` prefix: the site has no page numbers to resolve it against. */
function tidyChapterRefs(body: string): string {
  return body.replace(/\[Chapter \?\? — /g, "[").replace(/\[Chapter (\d+) — /g, "[");
}

function frontMatterFor(doc: Doc, title: string): string {
  const description: string = doc.fm.tags?.length
    ? `${title} — ${doc.fm.tags.slice(0, 4).join(", ")}`
    : title;
  return ["---", `title: ${JSON.stringify(title)}`, `description: ${JSON.stringify(description)}`, "---", ""].join(
    "\n",
  );
}

/**
 * The note at the top of every sample chapter. Both numbers in it are counted from the
 * manuscript rather than typed — #85 added seven chapters and the hand-written "245"
 * was wrong the moment it landed — and the store URL comes from lib/store.ts (#91).
 */
function sampleNote(unpublished: number): string {
  return `
::: tip This is a sample chapter
The Senior Full Stack Handbook has ${unpublished} more of these. The rest of the book is on
[Leanpub](${STORE_URL}), and buying it while it is in progress gets you every
update as it lands.
:::
`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const all: Doc[] = loadBook(ROOT);
const docs: Doc[] = all.filter(published);

// A sample slug that matches nothing is a page silently missing from the site, and the
// only symptom is one fewer entry in a sidebar nobody counts. Fail instead.
const knownSlugs = new Set<string>(all.map((d: Doc) => d.fm.slug ?? ""));
const missing: string[] = SAMPLE_CHAPTERS.filter((slug: string) => !knownSlugs.has(slug));
if (missing.length > 0) {
  console.error(
    `\nbuild-site: SAMPLE_CHAPTERS names ${missing.length} slug(s) no chapter carries — ` +
      `${missing.join(", ")}.\nA chapter was renamed, or the slug is a typo.\n`,
  );
  process.exit(1);
}
const routes = new Map<string, string>();

for (const doc of docs) routes.set(slugFor(doc), routeFor(doc, slugFor(doc)));

rmSync(PAGES, { recursive: true, force: true });

interface SidebarItem {
  text: string;
  link: string;
}
interface SidebarGroup {
  text: string;
  collapsed: boolean;
  items: SidebarItem[];
}

const groups = new Map<string, SidebarGroup>();

// Counted, not typed — every number the site states about the book comes from here.
const unpublished: number = all.filter((d: Doc) => !published(d)).length;
const questionCount: number = all.reduce(
  (n: number, d: Doc) => n + (d.body.match(/^\*\*Q: /gm)?.length ?? 0),
  0,
);
// Chapters that carry questions — the same population Interview-Question-Index.md counts,
// so the site and the index can never state two different numbers.
const chapterCount: number = all.filter((d: Doc) => /^\*\*Q: /m.test(d.body)).length;
const note: string = sampleNote(unpublished);

for (const doc of docs) {
  const slug: string = slugFor(doc);
  const route: string = routes.get(slug)!;
  const title: string = doc.fm.title ?? slug;

  let body: string = rewriteLinks(tidyChapterRefs(doc.body), routes);
  // The H1 is carried by the generated front matter, so drop the one in the source —
  // VitePress would otherwise render the title twice.
  body = body.replace(/^#\s+.*$/m, "").replace(/^\n+/, "");
  if (!isIndex(doc) && doc.part !== 0) body = `${note}\n${body}`;

  const file: string = join(PAGES, `${route.slice("/book/".length)}.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${frontMatterFor(doc, title)}\n${body}`);

  // Book 2's question index is back matter of Book 2 (#95a), so it sits with the DSA
  // pages rather than as a second "Interview Question Index" under Reference.
  const part: number = doc.part === 0 && volumeOf(doc) === "companion" ? COMPANION_PART : doc.part;
  const key: string =
    part === 0 ? (matterFor(doc) === "front" ? "front" : "back") : `part-${part}`;
  const heading: string =
    part === 0
      ? matterFor(doc) === "front"
        ? "Before You Start"
        : "Reference"
      : part === COMPANION_PART
        ? PART_NAMES[part]
        : `Part ${part} — ${PART_NAMES[part]}`;

  if (!groups.has(key)) groups.set(key, { text: heading, collapsed: true, items: [] });
  groups.get(key)!.items.push({ text: title, link: route });
}

const order: string[] = ["front", ...Object.keys(PART_NAMES).map((p: string) => `part-${p}`), "back"];
const sidebar: SidebarGroup[] = order
  .filter((k: string) => groups.has(k))
  .map((k: string) => groups.get(k)!);

writeFileSync(join(SITE, ".vitepress", "sidebar.json"), `${JSON.stringify(sidebar, null, 2)}\n`);

// ---------------------------------------------------------------------------
// The two hand-written files, guarded — improvement #91
// ---------------------------------------------------------------------------
//
// BOOK-SPEC decision #17 keeps `site/index.md` and `site/.vitepress/config.ts` hand-written.
// They also state three things the manuscript decides: the store URL, how many interview
// questions there are, and how many chapters. All three were wrong the moment #85 landed,
// and the symptom of a wrong store URL is a "Buy the book" button that goes nowhere on
// launch day. So they are not generated — they are checked, the same way SAMPLE_CHAPTERS is.

const HAND_WRITTEN: readonly string[] = ["index.md", ".vitepress/config.ts"];
const drift: string[] = [];

for (const rel of HAND_WRITTEN) {
  const text: string = readFileSync(join(SITE, rel), "utf8");
  for (const url of text.match(/https:\/\/leanpub\.com[^"'\s)]*/g) ?? []) {
    if (url !== STORE_URL) drift.push(`${rel}: store URL is ${url}, lib/store.ts says ${STORE_URL}`);
  }
  for (const stated of text.match(/(\d[\d,]{2,})\s+interview questions/g) ?? []) {
    if (Number(stated.replace(/\D/g, "")) !== questionCount) {
      drift.push(`${rel}: says "${stated}", the manuscript has ${questionCount}`);
    }
  }
  for (const stated of text.match(/(\d[\d,]{2,})\s+chapters/g) ?? []) {
    if (Number(stated.replace(/\D/g, "")) !== chapterCount) {
      drift.push(`${rel}: says "${stated}", the manuscript has ${chapterCount}`);
    }
  }
}

if (drift.length > 0) {
  console.error(`\nbuild-site: ${drift.length} hand-written value(s) no longer match the book:`);
  for (const d of drift) console.error(`  ${d}`);
  console.error("");
  process.exit(1);
}

if (STORE_IS_PLACEHOLDER) {
  console.log("  ·  store URL is still the placeholder — set STORE_SLUG in scripts/lib/store.ts");
}

// A landing page for /book/, so the section has a front door rather than only a sidebar.
const contents: string[] = [
  "---",
  'title: "Contents"',
  'description: "What is in The Senior Full Stack Handbook, and what of it is readable here."',
  "---",
  "",
  "# Contents",
  "",
  "Nine parts and an appendix. Everything listed below is on this site; the chapters that are",
  `not listed — ${unpublished} of them — are the book.`,
  "",
];
for (const group of sidebar) {
  contents.push(`## ${group.text}`, "");
  for (const item of group.items) contents.push(`- [${item.text}](${item.link})`);
  contents.push("");
}
writeFileSync(join(PAGES, "index.md"), `${contents.join("\n")}\n`);

const samples: number = docs.filter((d: Doc) => d.part !== 0 && !isIndex(d)).length;
console.log(
  `\n🌐 build-site — ${docs.length} pages into site/book/ ` +
    `(${samples} sample chapters, ${sidebar.length} sidebar groups)\n`,
);
