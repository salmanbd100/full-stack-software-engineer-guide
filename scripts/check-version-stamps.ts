/**
 * check-version-stamps.ts — improvement #67
 *
 * BOOK-SPEC.md non-negotiable #5 says "version-stamp every claim: 'React 19', not 'modern React'",
 * and success criterion #7 makes that an editorial pass rather than a lint gate. This script is the
 * repeatable half of that pass: it finds the two failures a reader would actually notice.
 *
 *   1. A chapter that names version-gated vocabulary — Server Components, the App Router, runes,
 *      `satisfies` — and never names a version anywhere in its prose.
 *   2. Vague modernity standing in for a version: "modern React", "the latest Next.js",
 *      "recent versions of".
 *
 * Deliberately NOT wired into `lint:docs` or CI. It reports judgement calls, not violations, and
 * `.lint-baseline.json` should not have to carry them. Run it by hand:
 *
 *   node --experimental-strip-types scripts/check-version-stamps.ts
 *
 * Exit code is always 0. Read the output and decide.
 */

import { loadBook } from "./lib/book.ts";

const ROOT = new URL("..", import.meta.url).pathname;

/** Naming any of these is a version-specific claim. */
const GATED =
  /(?:\b(?:Server Components?|Client Components?|Server Actions?|useActionState|useOptimistic|useFormStatus|React Compiler|App Router|Pages Router|Partial Prerendering|PPR|cacheLife|cacheTag|Turbopack|Rolldown|Rspack|oxlint|Biome|runes?)\b|\$state|\$derived|\$effect|\$props|`use client`|'use client'|`use server`|`use cache`|`satisfies`|`verbatimModuleSyntax`)/g;

/** Any explicit version stamp, in any of the forms the book uses. */
const STAMP =
  /\b(?:React|Next\.js|Svelte|SvelteKit|TypeScript|Node|Node\.js|Vite|Express|NestJS|Angular|Vue|Rollup|Webpack|Zod|Zustand|Astro|Nuxt|Vitest|Playwright|Jest|AI SDK|MCP|OAuth)\s*(?:revision\s*)?v?\d+(?:\.\d+|\.x)?\b|\bES\d{4}\b/;

/** Vague phrasing that should have been a version number. */
const VAGUE: readonly (readonly [string, RegExp])[] = [
  ["modern <framework>", /\bmodern\s+(?:React|Next\.?js|Svelte|TypeScript|Node|Angular|Vue|framework|bundler|tooling|stack)/gi],
  ["latest <framework>", /\blatest\s+(?:React|Next\.js|Svelte|TypeScript|Node|version of)/gi],
  // "the current version of the question" is not a version claim — require a tool after "of"
  ["recent versions of", /\b(?:recent|newer|newest|current|the new)\s+versions?\s+of\s+(?:[A-Z]|the\s+(?:library|framework|SDK|compiler|spec|runtime|bundler))/g],
  ["in newer releases", /\b(?:in|since)\s+(?:newer|recent|later|the latest)\s+(?:React|Next\.js|Svelte|TypeScript|releases?|versions?)\b/gi],
  ["nowadays", /\b(?:nowadays|these days|as of writing|at the time of writing)\b/gi],
];

/**
 * Chapters that carry gated vocabulary on purpose without a version.
 *
 * `Rendering/` is framework-agnostic by design — it has to still read correctly after the next major
 * release of anything, so PPR and the rest appear there as spectrum vocabulary. `Rendering/01`
 * defines and stamps them for the whole section. The other two are a product name in a reading-order
 * note and a cross-reference title; neither is a claim.
 */
const EXEMPT: ReadonlyMap<string, string> = new Map([
  ["Frontend/ModernStack/Rendering/README.md", "framework-agnostic section; 01 carries the stamp"],
  ["Frontend/ModernStack/Rendering/04-choosing-per-route.md", "framework-agnostic section; 01 carries the stamp"],
  ["Frontend/ModernStack/Rendering/05-seo-and-rendering.md", "framework-agnostic section; 01 carries the stamp"],
  ["Frontend/ModernStack/Tooling/README.md", "product name in a reading-order note, not a claim"],
  ["Frontend/Testing/03-react-testing-library.md", "gated words appear only in a cross-reference title"],
]);

/** Prose only: no code fences, and no chapter titles borrowed from cross-references. */
function prose(body: string): string[] {
  let inFence = false;
  return body
    .split("\n")
    .filter((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return false;
      }
      return !inFence;
    })
    .map((line) => line.replace(/\[[^\]]*\]\(#ch-[^)]*\)/g, "[xref]"));
}

const docs = loadBook(ROOT);
const unstamped: string[] = [];
const vague: string[] = [];

for (const doc of docs) {
  const lines = prose(doc.body);
  const text = lines.join("\n");

  if (!STAMP.test(text) && !EXEMPT.has(doc.rel)) {
    const hits = lines.filter((line) => {
      GATED.lastIndex = 0;
      return GATED.test(line);
    });
    if (hits.length > 0) {
      unstamped.push(`  ${doc.rel} — ${hits.length} gated line(s), first: ${hits[0]!.trim().slice(0, 90)}`);
    }
  }

  lines.forEach((line, i) => {
    for (const [label, pattern] of VAGUE) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) vague.push(`  ${doc.rel}:${i + 1} [${label}] ${line.trim().slice(0, 100)}`);
    }
  });
}

console.log(`\n🔖 check-version-stamps — ${docs.length} files, ${EXEMPT.size} exempt\n`);

console.log(`  ${unstamped.length === 0 ? "✅" : "⚠️ "}  ${unstamped.length}  Chapter makes a version-gated claim and names no version`);
unstamped.forEach((l) => console.log(l));

console.log(`  ${vague.length === 0 ? "✅" : "⚠️ "}  ${vague.length}  Vague modernity where a version belongs`);
vague.forEach((l) => console.log(l));

console.log();
