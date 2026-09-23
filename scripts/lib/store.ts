/**
 * store.ts — improvement #91
 *
 * Where the book is sold, in one place.
 *
 * `#78` chose Leanpub and left `https://leanpub.com/` as a placeholder in three files:
 * the site's hero button, its nav, and the sample-chapter note the generator writes into
 * every published chapter. Three copies of a URL nobody has yet is three chances to ship
 * a dead "Buy the book" link on launch day.
 *
 * **Change `STORE_SLUG` here and nowhere else.** `build-site.ts` uses it directly for the
 * pages it generates, and *checks* the two hand-written files against it — the same
 * build-time guard `SAMPLE_CHAPTERS` gets, and for the same reason: the symptom of drift
 * is a link that looks fine and goes nowhere.
 */

/**
 * The store path, once the account exists. `null` until then, which is what makes the
 * guard say "still a placeholder" rather than "wrong URL" — see the launch checklist in
 * improvement #91.
 */
export const STORE_SLUG: string | null = null;

/** The URL every "Buy the book" link points at. */
export const STORE_URL: string = STORE_SLUG === null ? "https://leanpub.com/" : `https://leanpub.com/${STORE_SLUG}`;

/** True while the link is still the placeholder, which the build reports rather than hides. */
export const STORE_IS_PLACEHOLDER: boolean = STORE_SLUG === null;
