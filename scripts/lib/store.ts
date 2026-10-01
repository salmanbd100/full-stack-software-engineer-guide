/**
 * store.ts — improvements #91 and #115
 *
 * Where the book is sold, in one place.
 *
 * `#78` chose Leanpub and left `https://leanpub.com/` as a placeholder in three files:
 * the site's hero button, its nav, and the sample-chapter note the generator writes into
 * every published chapter. Three copies of a URL nobody has yet is three chances to ship
 * a dead "Buy the book" link on launch day.
 *
 * #115 replaced the placeholder with the author's own address, the one the back cover
 * (`\coverurl` in `scripts/cover.tex`) and the book's rights line
 * (`scripts/book-meta.yaml`) already print. The site links there, and the store is
 * reached from it.
 *
 * **Change `STORE_URL` here and nowhere else.** `build-site.ts` *checks* the two
 * hand-written site files against it, because the
 * symptom of drift is a link that looks fine and goes nowhere. Since decision #24 the book
 * is free on the web, so this is the author's address the site links back to.
 */

/** The author's address — the back cover, the rights line, and the site's link home. */
export const STORE_URL: string = "https://www.salmanrahman.com/";

/** The same address as a reader sees it printed — on the back cover and in the sample note. */
export const STORE_LABEL: string = "www.salmanrahman.com";
