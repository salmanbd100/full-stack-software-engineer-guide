/**
 * site.ts — improvement #124
 *
 * Where every page of the web edition lives, in one place.
 *
 * `build-site.ts` writes each page to its route, and `translate-site.ts` (#126) caches the
 * Bangla copy of the same page under the same route in `i18n/bn/`. Two copies of these
 * rules would let an English page and its translation drift onto different paths, and the
 * symptom — a language switch that lands on the English fallback for a page that *was*
 * translated — would look like a missing translation rather than a routing bug.
 */

import { matterFor, PART_OPENERS, type Doc } from "./book.ts";

/** A part opener or section README: navigation rather than a chapter. */
export function isIndex(doc: Doc): boolean {
  return doc.isReadme || PART_OPENERS[doc.part] === doc.rel;
}

/** `/book/part-4/core-web-vitals` — stable, and independent of where the file sits. */
export function routeFor(doc: Doc, slug: string): string {
  const matter = matterFor(doc);
  if (doc.part === 0) return `/book/${matter === "front" ? "front" : "back"}/${slug}`;
  return `/book/part-${doc.part}/${slug}`;
}

/** Fallback for a file with no front-matter slug, which lint:docs should never allow. */
export function slugFor(doc: Doc): string {
  return doc.fm.slug ?? doc.rel.replace(/\.md$/, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
}
