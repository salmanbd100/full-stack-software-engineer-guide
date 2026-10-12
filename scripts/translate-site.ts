/**
 * translate-site.ts — improvement #126, decision #25
 *
 * The Bangla web edition's cache in `i18n/bn/`: what is missing, what is stale, and the one
 * door a translation goes through to get in.
 *
 *   pnpm site:translate                          # missing / stale / fresh, with counts
 *   pnpm site:translate --list                   # the same, one route per line
 *   pnpm site:translate --only=part-1            # scope any command: front, back, part-N, a slug
 *   pnpm site:translate --source=<route>         # the English body, fences masked, for a translator
 *   pnpm site:translate --write=<route> --from=<file> --title="<Bangla title>"
 *   pnpm site:translate --check                  # exit 1 if a cached page is stale or invalid
 *
 * ## No API
 *
 * The translating is done by Claude in Claude Code sessions, not by a script calling the
 * API: the owner's call when #126 was amended, so the edition costs no API spend and needs
 * no key anywhere. This script never calls a model. It hands a translator the English with
 * its code fences masked (`--source`), and takes the Bangla back (`--write`): it puts the
 * fences back from the English, runs `validateTranslation`, and writes the file only if the
 * list of problems is empty. A translation that skipped `--write` is not in the cache.
 *
 * The cache key is `hashSource` of the English body. Edit a chapter and its Bangla page goes
 * stale; the site falls back to English for it until it is translated again.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadBook, type Doc } from "./lib/book.ts";
import { routeFor, slugFor } from "./lib/site.ts";
import {
  hashSource,
  maskFences,
  readTranslation,
  unmaskFences,
  validateTranslation,
  writeTranslation,
} from "./lib/translate.ts";

const ROOT: string = process.cwd();
const CACHE: string = join(ROOT, "i18n", "bn");
const MODEL = "claude-opus-5-5 (Claude Code)";

const argv: string[] = process.argv.slice(2);
const flag = (name: string): string | undefined =>
  argv.find((a: string) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const only: string[] = argv.filter((a: string) => a.startsWith("--only=")).map((a: string) => a.slice(7));

interface Page {
  doc: Doc;
  route: string;
  /** `front`, `back` or `part-N` — the second segment of the route. */
  group: string;
  file: string;
}

const pages: Page[] = loadBook(ROOT).map((doc: Doc) => {
  const route: string = routeFor(doc, slugFor(doc));
  return { doc, route, group: route.split("/")[2], file: join(CACHE, `${route.slice(1)}.md`) };
});

const inScope = (p: Page): boolean =>
  only.length === 0 || only.some((o: string) => o === p.group || o === slugFor(p.doc) || o === p.route);

function find(route: string): Page {
  const page: Page | undefined = pages.find((p: Page) => p.route === route || slugFor(p.doc) === route);
  if (!page) {
    console.error(`❌ no page at ${route}`);
    process.exit(2);
  }
  return page;
}

// ---------------------------------------------------------------------------
// --source: the English, fences masked
// ---------------------------------------------------------------------------

const source: string | undefined = flag("source");
if (source) {
  const page: Page = find(source);
  process.stdout.write(`<!-- title: ${page.doc.fm.title ?? ""} -->\n${maskFences(page.doc.body)}`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// --write: validate, then cache
// ---------------------------------------------------------------------------

const write: string | undefined = flag("write");
if (write) {
  const page: Page = find(write);
  const from: string | undefined = flag("from");
  const title: string | undefined = flag("title");
  if (!from || !title) {
    console.error("❌ --write needs --from=<file> and --title=<Bangla title>");
    process.exit(2);
  }

  // A translator may hand back the title line `--source` put on top; it is not the body.
  const raw: string = readFileSync(from, "utf8").replace(/^<!-- title:.*-->\n/, "");
  const body: string = unmaskFences(raw, page.doc.body);
  const problems: string[] = validateTranslation(page.doc.body, body);
  if (problems.length > 0) {
    console.error(`❌ ${page.route} — not written, ${problems.length} problem(s):`);
    for (const p of problems) console.error(`   - ${p}`);
    process.exit(1);
  }

  mkdirSync(dirname(page.file), { recursive: true });
  const meta = { sourceHash: hashSource(page.doc.body), title, translatedAt: new Date().toISOString(), model: MODEL };
  writeFileSync(page.file, writeTranslation(meta, body.endsWith("\n") ? body : `${body}\n`), "utf8");
  console.log(`✅ ${page.route} → ${page.file.slice(ROOT.length + 1)}`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Status, --list and --check
// ---------------------------------------------------------------------------

type State = "fresh" | "stale" | "invalid" | "missing";

function stateOf(page: Page): { state: State; problems: string[] } {
  if (!existsSync(page.file)) return { state: "missing", problems: [] };
  const cached = readTranslation(readFileSync(page.file, "utf8"));
  if (!cached) return { state: "invalid", problems: ["front matter is not a complete cache entry"] };
  if (cached.meta.sourceHash !== hashSource(page.doc.body)) return { state: "stale", problems: [] };
  const problems: string[] = validateTranslation(page.doc.body, cached.body);
  return problems.length > 0 ? { state: "invalid", problems } : { state: "fresh", problems: [] };
}

const scoped: Page[] = pages.filter(inScope);
const counts: Record<State, number> = { fresh: 0, stale: 0, invalid: 0, missing: 0 };
const mark: Record<State, string> = { fresh: "✅", stale: "🟡", invalid: "❌", missing: "⬜" };

for (const page of scoped) {
  const { state, problems } = stateOf(page);
  counts[state]++;
  if (state === "invalid" || (argv.includes("--list") && state !== "fresh")) {
    console.log(`${mark[state]} ${state.padEnd(7)} ${page.route}`);
    for (const p of problems) console.log(`     - ${p}`);
  }
}

console.log(
  `\n🌐 site:translate — ${scoped.length} pages: ${counts.fresh} fresh, ${counts.stale} stale, ` +
    `${counts.invalid} invalid, ${counts.missing} missing`,
);

// Missing pages fall back to English by design; a stale or invalid one is a cache that lies.
if (argv.includes("--check") && counts.stale + counts.invalid > 0) process.exit(1);
