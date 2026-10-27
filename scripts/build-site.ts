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
 *
 * ## The Bangla edition — #127
 *
 * After the English pass, every page is written again under `site/bn/book/`. The body comes
 * from the translation cache in `i18n/bn/` when its `sourceHash` still matches the English;
 * otherwise the page carries the English with a notice on top. So the switch works for every
 * page whatever the cache holds, and an edited chapter never shows a translation of the old text.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  COMPANION_PART,
  loadBook,
  matterFor,
  PART_NAMES,
  volumeOf,
  type Doc,
} from "./lib/book.ts";
import { isIndex, routeFor, slugFor } from "./lib/site.ts";
import { STORE_URL } from "./lib/store.ts";
import { hashSource, readTranslation } from "./lib/translate.ts";

const ROOT: string = process.cwd();
const SITE: string = join(ROOT, "site");
const PAGES: string = join(SITE, "book");
const PAGES_BN: string = join(SITE, "bn", "book");
const CACHE_BN: string = join(ROOT, "i18n", "bn");
const TITLES_BN: Record<string, string> = JSON.parse(readFileSync(join(ROOT, "i18n", "titles.bn.json"), "utf8"));

// The part names the Bangla sidebar groups under, worded as the part openers in
// i18n/titles.bn.json word them.
const PART_NAMES_BN: Readonly<Record<number, string>> = {
  1: "ভিত্তি",
  2: "Browser Platform",
  3: "আধুনিক Frontend Stack",
  4: "বড় পরিসরে Frontend",
  5: "Frontend Engineer-দের জন্য Backend",
  6: "System Design",
  7: "AI Engineering",
  8: "Ship ও Operate",
  9: "মানুষের স্তর",
  10: "পরিশিষ্ট — DSA Pattern",
};

const FALLBACK_NOTICE_BN: string =
  "> ⚠️ এই অধ্যায়ের বাংলা অনুবাদ এখনও হালনাগাদ হয়নি — নিচে ইংরেজি সংস্করণ দেওয়া হলো।";

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toBnDigits = (n: number | string): string => String(n).replace(/\d/g, (d: string) => BN_DIGITS[Number(d)]);
const fromBnDigits = (s: string): string => s.replace(/[০-৯]/g, (d: string) => String(BN_DIGITS.indexOf(d)));

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
function rewriteLinks(body: string, routes: Map<string, string>, prefix = ""): string {
  return body.replace(XREF, (_match: string, text: string, slug: string) => {
    const route: string | undefined = routes.get(slug);
    return route === undefined ? `**${text}**` : `[${text}](${prefix}${route})`;
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
rmSync(PAGES_BN, { recursive: true, force: true });

interface SidebarItem {
  text: string;
  link: string;
}
interface SidebarGroup {
  text: string;
  collapsed: boolean;
  items: SidebarItem[];
}

// Counted, not typed — every number the site states about the book comes from here.
const questionCount: number = docs.reduce(
  (n: number, d: Doc) => n + (d.body.match(/^\*\*Q: /gm)?.length ?? 0),
  0,
);
// Chapters that carry questions — the same population Interview-Question-Index.md counts,
// so the site and the index can never state two different numbers.
const chapterCount: number = docs.filter((d: Doc) => /^\*\*Q: /m.test(d.body)).length;

interface Locale {
  dir: string;
  prefix: string;
  front: string;
  back: string;
  overview: string;
  // Sidebar-only labels, by slug — for a title that is right inside its own volume but
  // collides with another entry once both volumes share one sidebar.
  labels: Readonly<Record<string, string>>;
  part: (n: number) => string;
}

const LOCALES: Record<"en" | "bn", Locale> = {
  en: {
    dir: PAGES,
    prefix: "",
    front: "Before You Start",
    back: "Reference",
    overview: "Overview",
    labels: { "dsa-question-index": "DSA Question Index" },
    part: (n: number) => (n === COMPANION_PART ? PART_NAMES[n] : `Part ${n} — ${PART_NAMES[n]}`),
  },
  bn: {
    dir: PAGES_BN,
    prefix: "/bn",
    front: "শুরুর আগে",
    back: "রেফারেন্স",
    overview: "পরিচিতি",
    labels: { "dsa-question-index": "DSA প্রশ্নের সূচি" },
    part: (n: number) => (n === COMPANION_PART ? PART_NAMES_BN[n] : `Part ${toBnDigits(n)} — ${PART_NAMES_BN[n]}`),
  },
};

function writePage(locale: Locale, doc: Doc, title: string, source: string): void {
  let body: string = rewriteLinks(tidyChapterRefs(source), routes, locale.prefix);
  // VitePress's doc layout sets the tab title from front matter but draws no heading, so the
  // page needs its own H1. It is rebuilt from `title` rather than kept from the source, because
  // the source H1 carries the print-only `{#ch-…}` anchor and a cached Bangla body may not have one.
  body = `# ${title}\n\n${body.replace(/^#\s+.*$/m, "").replace(/^\n+/, "")}`;

  const file: string = join(locale.dir, `${routes.get(slugFor(doc))!.slice("/book/".length)}.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${frontMatterFor(doc, title)}\n${body}`);
}

// The group heading already names the part, so "Part I — " on every entry under it is noise,
// and the part opener — whose title is the heading itself — reads as the part's overview.
function sidebarLabel(locale: Locale, title: string, heading: string): string {
  const bare: string = title.replace(/^Part [IVX]+ — /, "");
  return heading === bare || heading.endsWith(` — ${bare}`) ? locale.overview : bare;
}

function sidebarFor(locale: Locale, titleOf: (doc: Doc) => string): SidebarGroup[] {
  const groups = new Map<string, SidebarGroup>();
  for (const doc of docs) {
    // Book 2's question index is back matter of Book 2 (#95a), so it sits with the DSA
    // pages rather than as a second "Interview Question Index" under Reference.
    const part: number = doc.part === 0 && volumeOf(doc) === "companion" ? COMPANION_PART : doc.part;
    const key: string = part === 0 ? (matterFor(doc) === "front" ? "front" : "back") : `part-${part}`;
    const heading: string = part === 0 ? (key === "front" ? locale.front : locale.back) : locale.part(part);

    if (!groups.has(key)) groups.set(key, { text: heading, collapsed: true, items: [] });
    groups.get(key)!.items.push({
      text: locale.labels[slugFor(doc)] ?? sidebarLabel(locale, titleOf(doc), heading),
      link: `${locale.prefix}${routes.get(slugFor(doc))!}`,
    });
  }
  const order: string[] = ["front", ...Object.keys(PART_NAMES).map((p: string) => `part-${p}`), "back"];
  return order.filter((k: string) => groups.has(k)).map((k: string) => groups.get(k)!);
}

const enTitle = (doc: Doc): string => doc.fm.title ?? slugFor(doc);

for (const doc of docs) writePage(LOCALES.en, doc, enTitle(doc), doc.body);

// The Bangla pass. A page is translated only while its cache entry was made from the English
// that is in the manuscript now; anything else falls back, with the notice saying so.
const bnState = { translated: 0, stale: 0, missing: 0 };
const bnTitles = new Map<Doc, string>();

for (const doc of docs) {
  const route: string = routes.get(slugFor(doc))!;
  const cacheFile: string = join(CACHE_BN, `${route.slice(1)}.md`);
  const cached = existsSync(cacheFile) ? readTranslation(readFileSync(cacheFile, "utf8")) : null;

  if (cached && cached.meta.sourceHash === hashSource(doc.body)) {
    bnState.translated++;
    const title: string = TITLES_BN[slugFor(doc)] ?? cached.meta.title;
    bnTitles.set(doc, title);
    writePage(LOCALES.bn, doc, title, cached.body);
  } else {
    bnState[cached ? "stale" : "missing"]++;
    const title: string = TITLES_BN[slugFor(doc)] ?? enTitle(doc);
    bnTitles.set(doc, title);
    const body: string = doc.body.replace(/^(#\s+.*\n)/m, `$1\n${FALLBACK_NOTICE_BN}\n`);
    writePage(LOCALES.bn, doc, title, body);
  }
}

const sidebar = {
  en: sidebarFor(LOCALES.en, enTitle),
  bn: sidebarFor(LOCALES.bn, (doc: Doc) => bnTitles.get(doc)!),
};

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

const HAND_WRITTEN: readonly string[] = ["index.md", "bn/index.md", "building-this-book.md", ".vitepress/config.ts"];
const drift: string[] = [];

for (const rel of HAND_WRITTEN) {
  // Bengali digits are read as their values, so "৭৩৪টি" is checked like "734".
  const text: string = fromBnDigits(readFileSync(join(SITE, rel), "utf8"));
  // Both directions: the leftover placeholder is drift, and so is a file that has lost the
  // real address, since a guard that only looks for the old URL passes any new one.
  if (/https:\/\/leanpub\.com/.test(text)) drift.push(`${rel}: still links to the leanpub.com placeholder`);
  if (!text.includes(STORE_URL)) drift.push(`${rel}: has no link to ${STORE_URL}, the URL lib/store.ts names`);
  for (const stated of text.match(/(\d[\d,]{2,})(\s+interview questions|টি (ইন্টারভিউ|Interview-এর) প্রশ্ন)/g) ?? []) {
    if (Number(stated.replace(/\D/g, "")) !== questionCount) {
      drift.push(`${rel}: says "${stated}", the manuscript has ${questionCount}`);
    }
  }
  for (const stated of text.match(/(\d[\d,]{2,})(\s+chapters|টি অধ্যায়)/g) ?? []) {
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
function writeContents(dir: string, groups: SidebarGroup[], head: string[]): void {
  const lines: string[] = [...head];
  for (const group of groups) {
    lines.push(`## ${group.text}`, "");
    for (const item of group.items) lines.push(`- [${item.text}](${item.link})`);
    lines.push("");
  }
  writeFileSync(join(dir, "index.md"), `${lines.join("\n")}\n`);
}

writeContents(PAGES, sidebar.en, [
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
]);

writeContents(PAGES_BN, sidebar.bn, [
  "---",
  'title: "সূচিপত্র"',
  'description: "The Senior Full Stack Handbook আর Book 2: DSA Patterns-এর প্রতিটি part ও অধ্যায়।"',
  "---",
  "",
  "# সূচিপত্র",
  "",
  "নয়টি part, Book 2: DSA Patterns, আর রেফারেন্সের পাতাগুলো। পুরো বইটা এখানে বিনামূল্যে পড়া যায় —",
  `${toBnDigits(chapterCount)}টি অধ্যায় আর ${toBnDigits(questionCount)}টি Interview-এর প্রশ্ন।`,
  "",
]);

const chapters: number = docs.filter((d: Doc) => d.part !== 0 && !isIndex(d)).length;
console.log(
  `\n🌐 build-site — ${docs.length} pages into site/book/ and site/bn/book/ ` +
    `(${chapters} chapters, ${sidebar.en.length} sidebar groups)` +
    `\n   বাংলা: ${bnState.translated} translated / ${bnState.stale} stale / ${bnState.missing} missing\n`,
);
