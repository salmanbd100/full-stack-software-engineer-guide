/**
 * build-site.ts — improvement #78, whole book since decision #24
 *
 * Generates the web edition's pages from the manuscript.
 *
 *   pnpm site:pages     # write site/book/** and the sidebar, then stop
 *   pnpm site:dev       # the same, then VitePress in watch mode
 *   pnpm site:build     # the same, then a static build into site/.vitepress/dist
 *
 * ## What the site carries
 *
 * Every page `loadBook` returns: front matter, every part and chapter of both volumes, and
 * all the back matter. #78 published one sample chapter per part; BOOK-SPEC decision #24
 * made the whole book free to read at www.salmanrahman.com/handbook, so nothing is held
 * back and every cross-reference is a live link.
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
import { STORE_URL } from "./lib/store.ts";

const ROOT: string = process.cwd();
const SITE: string = join(ROOT, "site");
const PAGES: string = join(SITE, "book");

/** A part opener or section README: navigation rather than a chapter. */
function isIndex(doc: Doc): boolean {
  return doc.isReadme || PART_OPENERS[doc.part] === doc.rel;
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
 * `[Chapter ?? — Title](#ch-slug)` is an in-page anchor in the PDF and a route here. Every
 * chapter is published, so a slug with no route is a broken reference: it keeps its name
 * rather than shipping a dead link, and lint:docs is what catches it.
 */
function rewriteLinks(body: string, routes: Map<string, string>): string {
  return body.replace(XREF, (_match: string, text: string, slug: string) => {
    const route: string | undefined = routes.get(slug);
    return route === undefined ? `**${text}**` : `[${text}](${route})`;
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

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const docs: Doc[] = loadBook(ROOT);
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
const questionCount: number = docs.reduce(
  (n: number, d: Doc) => n + (d.body.match(/^\*\*Q: /gm)?.length ?? 0),
  0,
);
// Chapters that carry questions — the same population Interview-Question-Index.md counts,
// so the site and the index can never state two different numbers.
const chapterCount: number = docs.filter((d: Doc) => /^\*\*Q: /m.test(d.body)).length;

for (const doc of docs) {
  const slug: string = slugFor(doc);
  const route: string = routes.get(slug)!;
  const title: string = doc.fm.title ?? slug;

  let body: string = rewriteLinks(tidyChapterRefs(doc.body), routes);
  // The H1 is carried by the generated front matter, so drop the one in the source —
  // VitePress would otherwise render the title twice.
  body = body.replace(/^#\s+.*$/m, "").replace(/^\n+/, "");

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
// The hand-written files, guarded — improvement #91
// ---------------------------------------------------------------------------
//
// `site/index.md`, `site/building-this-book.md` and `site/.vitepress/config.ts` are hand-written.
// They also state three things the manuscript decides: the store URL, how many interview
// questions there are, and how many chapters. All three were wrong the moment #85 landed,
// and the symptom of a wrong store URL is a "Buy the book" button that goes nowhere on
// launch day. So they are not generated — they are checked.

const HAND_WRITTEN: readonly string[] = ["index.md", "building-this-book.md", ".vitepress/config.ts"];
const drift: string[] = [];

for (const rel of HAND_WRITTEN) {
  const text: string = readFileSync(join(SITE, rel), "utf8");
  // Both directions: the leftover placeholder is drift, and so is a file that has lost the
  // real address, since a guard that only looks for the old URL passes any new one.
  if (/https:\/\/leanpub\.com/.test(text)) drift.push(`${rel}: still links to the leanpub.com placeholder`);
  if (!text.includes(STORE_URL)) drift.push(`${rel}: has no link to ${STORE_URL}, the URL lib/store.ts names`);
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

// A landing page for /book/, so the section has a front door rather than only a sidebar.
const contents: string[] = [
  "---",
  'title: "Contents"',
  'description: "Every part and chapter of The Senior Full Stack Handbook and Book 2: DSA Patterns."',
  "---",
  "",
  "# Contents",
  "",
  "Nine parts, Book 2: DSA Patterns, and the reference pages. The whole book is free to read",
  `here — ${chapterCount} chapters and ${questionCount} interview questions.`,
  "",
];
for (const group of sidebar) {
  contents.push(`## ${group.text}`, "");
  for (const item of group.items) contents.push(`- [${item.text}](${item.link})`);
  contents.push("");
}
writeFileSync(join(PAGES, "index.md"), `${contents.join("\n")}\n`);

const chapters: number = docs.filter((d: Doc) => d.part !== 0 && !isIndex(d)).length;
console.log(
  `\n🌐 build-site — ${docs.length} pages into site/book/ ` +
    `(${chapters} chapters, ${sidebar.length} sidebar groups)\n`,
);
