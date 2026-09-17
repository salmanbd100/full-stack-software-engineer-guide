/**
 * check-stale-terms.ts — improvement #68
 *
 * #68 is a staleness sweep: find content that a 2027 reader would read as simply wrong. The six
 * signals the item names — FID for INP, `getServerSideProps` as the default, Jest and Cypress as
 * defaults, Redux as the default store, Webpack config as a required skill, runtime CSS-in-JS as a
 * recommendation — were all already closed by #32–43 and #65–66, each one discussed in the book as
 * the previous generation rather than the current one. So a plain grep for them is useless: it
 * matches the corrections, not the mistakes.
 *
 * What is worth guarding is narrower. These are terms with no correct present-tense use left: a
 * browser nobody supports, a format that was wound down, a library that was renamed. Every one of
 * them was fixed by #68, and this script is what stops them coming back. Where a term legitimately
 * appears as history ("X was renamed to Y"), the file is exempt with a reason.
 *
 *   node --experimental-strip-types scripts/check-stale-terms.ts
 *
 * Exit code is always 0. It reports judgement calls, not violations, so it is deliberately NOT
 * wired into `lint:docs` or CI and `.lint-baseline.json` does not carry it. See also
 * `check-version-stamps.ts`, the same shape of check for improvement #67.
 */

import { loadBook } from "./lib/book.ts";

const ROOT = new URL("..", import.meta.url).pathname;

interface Term {
  /** What to look for. */
  readonly pattern: RegExp;
  /** What to say instead. */
  readonly instead: string;
  /** Files where a present-tense-free mention is correct, and why. */
  readonly exempt?: ReadonlyMap<string, string>;
}

const STALE: readonly Term[] = [
  {
    pattern: /\bIE ?11\b|Internet Explorer/g,
    instead: "Baseline Widely Available, or a named Safari/Chrome floor",
  },
  {
    pattern: /\bAMP\b/g,
    instead: "nothing — AMP was wound down and no longer earns a ranking preference",
  },
  {
    pattern: /React Query/g,
    instead: "TanStack Query — the library was renamed",
    exempt: new Map([
      ["Backend/API/06-trpc-typed-apis.md", "states the history: the React Query integration moved to TanStack Query's own package"],
    ]),
  },
  {
    pattern: /\bonFID\b/g,
    instead: "onINP — onFID was removed from web-vitals",
    exempt: new Map([
      ["Frontend/WebPerformance/07-measuring-in-production.md", "the chapter's point is that `onFID` no longer exists"],
    ]),
  },
  {
    pattern: /\bEnzyme\b|\bPhantomJS\b|\bProtractor\b|\bTSLint\b|\bBower\b/g,
    instead: "Testing Library, Playwright, or typescript-eslint",
  },
  {
    pattern: /Create React App|\bCRA\b/g,
    instead: "Vite, or a framework's own scaffolder",
  },
  {
    pattern: /Universal Analytics|\bUA-\d/g,
    instead: "GA4",
  },
  {
    pattern: /\bmoment\.js\b|\bMoment\.js\b/g,
    instead: "Temporal, `Intl`, or date-fns",
  },
  {
    pattern: /ReactDOM\.render\b|componentWillMount|componentWillReceiveProps/g,
    instead: "createRoot, and the hook equivalents",
  },
];

/** Prose and code both count here — a stale library name in a sample is still wrong. */
const docs = loadBook(ROOT);
let found = 0;

console.log(`\n🗑️  check-stale-terms — ${docs.length} files\n`);

for (const term of STALE) {
  for (const doc of docs) {
    if (term.exempt?.has(doc.rel)) continue;
    doc.body.split("\n").forEach((line, i) => {
      term.pattern.lastIndex = 0;
      if (term.pattern.test(line)) {
        console.log(`  ⚠️  ${doc.rel}:${i + 1}`);
        console.log(`      ${line.trim().slice(0, 100)}`);
        console.log(`      → use ${term.instead}`);
        found++;
      }
    });
  }
}

const exemptions = STALE.reduce((n, t) => n + (t.exempt?.size ?? 0), 0);
console.log(`  ${found === 0 ? "✅" : "⚠️ "}  ${found}  Term with no correct present-tense use left (${exemptions} exempt)\n`);
