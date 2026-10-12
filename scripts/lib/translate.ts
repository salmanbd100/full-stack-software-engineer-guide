/**
 * translate.ts — improvement #125, decision #25
 *
 * What a Bangla page must keep from its English source, and how the cache in `i18n/bn/`
 * records which English it was made from.
 *
 * `site:translate` (#126) hands each page to a model and writes back what it returns. A
 * model that translates prose well will also, now and then, translate a variable name,
 * "fix" a code sample, drop a cross-reference or merge two questions into one. None of
 * that shows in a skim of Bangla text the owner may not read fluently, so the rule is
 * mechanical: **everything that is not prose comes back byte-identical, or the page is
 * not written** and the site falls back to English.
 *
 * `validateTranslation` is pure — no file system, no network — so the tests can prove each
 * check on two strings.
 */

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Taking a page apart
// ---------------------------------------------------------------------------

interface Parts {
  /** Every fenced block, opening and closing lines included, in order. */
  fences: string[];
  /** The page with every fence removed — what a translator is allowed to change. */
  prose: string;
  /** The page with every fence replaced by a `<!-- fence N -->` line. */
  masked: string;
}

/**
 * A CommonMark fence: up to three spaces, then three or more backticks or tildes. It
 * closes on a run of the same character at least as long. The manuscript only uses
 * column-0 triple backticks, but a model's output cannot be trusted to.
 */
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;

function split(markdown: string): Parts {
  const fences: string[] = [];
  const prose: string[] = [];
  const masked: string[] = [];
  const lines: string[] = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const open = FENCE_OPEN.exec(lines[i]);
    if (!open) {
      prose.push(lines[i]);
      masked.push(lines[i]);
      continue;
    }

    const char: string = open[1][0];
    const close = new RegExp(`^ {0,3}\\${char}{${open[1].length},}\\s*$`);
    const block: string[] = [lines[i]];
    while (++i < lines.length) {
      block.push(lines[i]);
      if (close.test(lines[i])) break;
    }
    // An unclosed fence runs to the end of the page, as CommonMark says it does.
    fences.push(block.join("\n"));
    masked.push(`<!-- fence ${fences.length} -->`);
  }

  return { fences, prose: prose.join("\n"), masked: masked.join("\n") };
}

/**
 * The English page with its code taken out, for a translator. Fences are a seventh of the
 * book and must come back byte-identical, so the translator never sees them: it returns
 * the placeholders, and `unmaskFences` puts the English fences back.
 */
export function maskFences(en: string): string {
  return split(en).masked;
}

/**
 * Put `en`'s fences back where a translator left the placeholders. A placeholder that was
 * dropped or duplicated is not repaired — `validateTranslation` reports the fence count.
 */
export function unmaskFences(bn: string, en: string): string {
  const { fences } = split(en);
  return bn.replace(/^ {0,3}<!-- fence (\d+) -->[ \t]*$/gm, (line: string, n: string) => fences[Number(n) - 1] ?? line);
}

/** Inline code spans: a backtick run closed by a run of the same length. */
function codeSpans(prose: string): string[] {
  const spans: string[] = [];
  const re = /(`+)([\s\S]*?[^`])\1(?!`)/g;
  for (const m of prose.matchAll(re)) spans.push(m[2]);
  return spans;
}

/** Prose with its code spans blanked, so a URL or `##` inside one is not counted twice. */
function withoutSpans(prose: string): string {
  return prose.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, "");
}

/**
 * The targets a reader follows: cross-references, site routes and absolute URLs. Relative
 * file paths are left out — `lint:docs` already forbids them in the manuscript.
 */
function linkTargets(text: string): string[] {
  const targets: string[] = [];
  for (const m of text.matchAll(/\]\(([^)\s]+)/g)) {
    if (/^(#ch-|\/book\/|https?:\/\/)/.test(m[1])) targets.push(m[1]);
  }
  // A bare URL in running text, not already the target of a `[text](url)` link. Trailing
  // punctuation is the sentence's, not the URL's — GFM's autolink rule — and the Bangla
  // full stop `।` is on the list, or moving a URL to mid-sentence would read as a new link.
  for (const m of text.matchAll(/(?<!\]\()https?:\/\/[^\s)>\]।]+/g)) {
    targets.push(m[0].replace(/[.,:;!?'"*_~]+$/, ""));
  }
  return targets;
}

function headings(text: string, level: number): number {
  return (text.match(new RegExp(`^#{${level}}\\s`, "gm")) ?? []).length;
}

function questions(text: string): number {
  return (text.match(/\*\*Q: /g) ?? []).length;
}

// ---------------------------------------------------------------------------
// The validator
// ---------------------------------------------------------------------------

/** Show the start of a block or span in a message, on one line. */
function excerpt(s: string, max = 60): string {
  const flat: string = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** What is in one multiset and not the other, each entry with its surplus count. */
function difference(a: string[], b: string[]): string[] {
  const counts = new Map<string, number>();
  for (const x of a) counts.set(x, (counts.get(x) ?? 0) + 1);
  for (const x of b) counts.set(x, (counts.get(x) ?? 0) - 1);
  return [...counts].filter(([, n]) => n > 0).map(([x, n]) => (n > 1 ? `${x} (×${n})` : x));
}

/**
 * Every way `bn` fails to carry `en`'s code, links and structure across. An empty list
 * means the page is safe to write.
 */
export function validateTranslation(en: string, bn: string): string[] {
  const problems: string[] = [];
  const src: Parts = split(en);
  const out: Parts = split(bn);

  if (src.fences.length !== out.fences.length) {
    problems.push(`fenced blocks: English has ${src.fences.length}, Bangla has ${out.fences.length}`);
  }
  const shared: number = Math.min(src.fences.length, out.fences.length);
  for (let i = 0; i < shared; i++) {
    if (src.fences[i] !== out.fences[i]) {
      problems.push(
        `fenced block ${i + 1} changed: English "${excerpt(src.fences[i])}", Bangla "${excerpt(out.fences[i])}"`,
      );
    }
  }

  const srcText: string = withoutSpans(src.prose);
  const outText: string = withoutSpans(out.prose);

  const srcLinks: string[] = linkTargets(srcText);
  const outLinks: string[] = linkTargets(outText);
  for (const t of difference(srcLinks, outLinks)) problems.push(`link target lost: ${t}`);
  for (const t of difference(outLinks, srcLinks)) problems.push(`link target added: ${t}`);

  for (const level of [2, 3]) {
    const a: number = headings(srcText, level);
    const b: number = headings(outText, level);
    if (a !== b) problems.push(`${"#".repeat(level)} headings: English has ${a}, Bangla has ${b}`);
  }

  const qa: number = questions(srcText);
  const qb: number = questions(outText);
  if (qa !== qb) problems.push(`**Q: markers: English has ${qa}, Bangla has ${qb}`);

  const srcSpans: string[] = codeSpans(src.prose);
  const outSpans: string[] = codeSpans(out.prose);
  if (srcSpans.length !== outSpans.length) {
    problems.push(`inline code spans: English has ${srcSpans.length}, Bangla has ${outSpans.length}`);
  }
  // Compared as multisets, not in order: Bangla word order can legitimately move a span.
  for (const s of difference(srcSpans, outSpans)) problems.push(`inline code lost or changed: \`${excerpt(s)}\``);
  for (const s of difference(outSpans, srcSpans)) problems.push(`inline code added or changed: \`${excerpt(s)}\``);

  return problems;
}

// ---------------------------------------------------------------------------
// The cache file
// ---------------------------------------------------------------------------

/** SHA-256 of an English page body — the key that says whether its translation is stale. */
export function hashSource(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

/** The front matter of an `i18n/bn/**` page. */
export interface TranslationMeta {
  /** `hashSource` of the English body this page was translated from. */
  sourceHash: string;
  /** The translated title, for the sidebar. */
  title: string;
  /** ISO 8601 timestamp of when the translation was written. */
  translatedAt: string;
  /** The model id that produced it. */
  model: string;
}

const META_KEYS: readonly (keyof TranslationMeta)[] = ["sourceHash", "title", "translatedAt", "model"];

/**
 * Values are written as JSON strings. A JSON string is a valid YAML double-quoted scalar,
 * so VitePress reads the same file, and a Bangla title holding a colon or a quote needs
 * no escaping rules of its own.
 */
export function writeTranslation(meta: TranslationMeta, body: string): string {
  const lines: string[] = META_KEYS.map((k) => `${k}: ${JSON.stringify(meta[k])}`);
  return `---\n${lines.join("\n")}\n---\n\n${body.replace(/^\n+/, "")}`;
}

/** The inverse of `writeTranslation`. `null` when the file is not a complete cache entry. */
export function readTranslation(source: string): { meta: TranslationMeta; body: string } | null {
  if (!source.startsWith("---\n")) return null;
  const end: number = source.indexOf("\n---", 4);
  if (end === -1) return null;

  const meta: Partial<TranslationMeta> = {};
  for (const line of source.slice(4, end).split("\n")) {
    const m = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (!m || !(META_KEYS as readonly string[]).includes(m[1])) continue;
    try {
      meta[m[1] as keyof TranslationMeta] = m[2].startsWith('"') ? JSON.parse(m[2]) : m[2];
    } catch {
      return null;
    }
  }
  if (META_KEYS.some((k) => typeof meta[k] !== "string")) return null;

  const body: string = source.slice(source.indexOf("\n", end + 1) + 1).replace(/^\n+/, "");
  return { meta: meta as TranslationMeta, body };
}
