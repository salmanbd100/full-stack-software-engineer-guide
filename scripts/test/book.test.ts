/**
 * book.test.ts — improvement #94
 *
 * `scripts/lib/book.ts` is the single answer to "what is in the book, and where does it
 * go". The PDF build, the EPUB build, the lint, the numberer, the question index, the
 * page measurer and the site generator all import it, so a wrong answer here is a wrong
 * book everywhere at once — and the only thing that noticed before this file existed was
 * somebody thinking a number looked off.
 *
 * These are unit tests over a fixture tree written to a temp directory, not over the
 * manuscript. The manuscript changes every session; the model's rules do not.
 *
 *   node --experimental-strip-types --test scripts/test/*.test.ts     # pnpm test
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  COMPANION_PART,
  EXCLUDED_DIRS,
  EXCLUDED_FILES,
  findMarkdown,
  loadBook,
  matterFor,
  orderDocs,
  partBudgets,
  partFor,
  readDoc,
  volumeOfPart,
  type Doc,
} from "../lib/book.ts";

const ROOT: string = process.cwd();

// ---------------------------------------------------------------------------
// A fixture repository, written once for the whole file
// ---------------------------------------------------------------------------

let fixture: string;

/** Write a chapter with front matter. `fm` lines are emitted verbatim. */
function chapter(rel: string, fm: string[], bodyLines = 3): void {
  const abs: string = join(fixture, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  const body: string = Array.from({ length: bodyLines }, (_, i) => `line ${i}`).join("\n");
  writeFileSync(abs, `---\n${fm.join("\n")}\n---\n\n# Title\n\n${body}\n`, "utf8");
}

before(() => {
  fixture = mkdtempSync(join(tmpdir(), "book-model-"));

  // partBudgets reads the real § 5 table, so the fixture borrows the real spec rather
  // than a hand-written copy that would drift away from it.
  cpSync(join(ROOT, "BOOK-SPEC.md"), join(fixture, "BOOK-SPEC.md"));

  chapter("Frontend/JavaScript/01-closures.md", [
    "title: Closures",
    "part: 1",
    "chapter: 7",
    "slug: closures",
    "in_book: true",
  ]);
  chapter("Frontend/JavaScript/README.md", ["title: JavaScript", "part: 1", "chapter: 0", "slug: js-index"]);
  chapter("DSA/01-two-pointers.md", ["title: Two Pointers", "part: 10", "chapter: 1", "slug: two-pointers"]);
  chapter("Preface.md", ["title: Preface", "part: 0", "chapter: 0", "slug: preface", "tags: [front-matter]"]);
  chapter("Glossary.md", ["title: Glossary", "part: 0", "chapter: 0", "slug: glossary", "tags: [back-matter]"]);
  chapter("Frontend/JavaScript/99-draft.md", [
    "title: Draft",
    "part: 1",
    "chapter: 99",
    "slug: draft",
    "in_book: false",
  ]);

  // Must never be walked.
  chapter("Archive/old/01-terraform.md", ["title: Terraform", "part: 8", "slug: terraform"]);
  chapter("site/book/copy.md", ["title: Copy", "part: 1", "slug: copy"]);
  writeFileSync(join(fixture, "CLAUDE.md"), "# agent instructions\n", "utf8");
  writeFileSync(join(fixture, "README.md"), "# repo landing page\n", "utf8");
});

after(() => {
  rmSync(fixture, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe("findMarkdown", () => {
  test("skips every excluded directory", () => {
    const found: string[] = findMarkdown(fixture);
    for (const dir of ["Archive", "site"]) {
      assert.ok(EXCLUDED_DIRS.includes(dir), `${dir} should be on the exclusion list`);
      assert.equal(
        found.some((f: string) => f.includes(`/${dir}/`)),
        false,
        `${dir}/ was walked`,
      );
    }
  });

  test("excludes the root files that are about the book rather than in it", () => {
    const found: string[] = findMarkdown(fixture).map((f: string) => f.replace(fixture + "/", ""));
    for (const name of EXCLUDED_FILES) assert.equal(found.includes(name), false, `${name} was collected`);
  });

  test("a README below the root is manuscript, not an exclusion", () => {
    // EXCLUDED_FILES holds README.md, and it must only apply at the repo root —
    // every section index below it is a real part opener.
    const found: string[] = findMarkdown(fixture).map((f: string) => f.replace(fixture + "/", ""));
    assert.ok(found.includes("Frontend/JavaScript/README.md"));
    assert.equal(found.includes("README.md"), false);
  });
});

describe("readDoc", () => {
  test("parses front matter and strips it from the body", () => {
    const doc: Doc = readDoc(join(fixture, "Frontend/JavaScript/01-closures.md"), fixture);
    assert.equal(doc.hasFrontMatter, true);
    assert.equal(doc.fm.slug, "closures");
    assert.equal(doc.fm.part, 1);
    assert.equal(doc.fm.chapter, 7);
    assert.equal(doc.fm.in_book, true);
    assert.ok(doc.body.startsWith("# Title"), "front matter leaked into the body");
  });

  test("counts the whole file, front matter included", () => {
    const doc: Doc = readDoc(join(fixture, "Frontend/JavaScript/01-closures.md"), fixture);
    const onDisk: number = readFileSync(doc.abs, "utf8").split("\n").length;
    // The budget rule in lint-docs and the § 5 table both count files this way. If this
    // ever became body-only, every part would silently come in under budget.
    assert.equal(doc.lines, onDisk);
    assert.ok(doc.lines > doc.body.split("\n").length, "front matter was not counted");
  });

  test("front-matter part wins over the path", () => {
    const doc: Doc = readDoc(join(fixture, "DSA/01-two-pointers.md"), fixture);
    assert.equal(doc.part, 10);
  });

  test("a file with no front matter is still readable", () => {
    const doc: Doc = readDoc(join(fixture, "README.md"), fixture);
    assert.equal(doc.hasFrontMatter, false);
    assert.deepEqual(doc.fm, {});
  });
});

describe("partFor", () => {
  test("maps the directories BOOK-SPEC § 4 names", () => {
    assert.equal(partFor("Frontend/JavaScript/01-closures.md"), 1);
    assert.equal(partFor("Frontend/ModernStack/React/01-react-mental-model.md"), 3);
    assert.equal(partFor("DSA/01-two-pointers.md"), COMPANION_PART);
  });

  test("the longest matching prefix wins", () => {
    // Frontend/ModernStack is Part III even though Frontend/ alone would be Part II.
    assert.notEqual(partFor("Frontend/ModernStack/React/01-x.md"), partFor("Frontend/HtmlCss/01-x.md"));
  });

  test("an unmapped path is 0 rather than a guess", () => {
    assert.equal(partFor("Nowhere/01-x.md"), 0);
  });
});

describe("loadBook", () => {
  test("drops in_book: false", () => {
    const docs: Doc[] = loadBook(fixture);
    assert.equal(
      docs.some((d: Doc) => d.fm.slug === "draft"),
      false,
    );
  });

  test("returns reading order: front matter, parts, appendix, back matter", () => {
    const slugs: string[] = loadBook(fixture).map((d: Doc) => d.fm.slug ?? d.rel);
    assert.deepEqual(slugs, ["preface", "js-index", "closures", "two-pointers", "glossary"]);
  });

  test("chapter: 0 leads its part — it means part opener, not unstamped", () => {
    const part1: Doc[] = loadBook(fixture).filter((d: Doc) => d.part === 1);
    assert.equal(part1[0].fm.slug, "js-index");
  });
});

describe("matterFor", () => {
  test("reads the front and back matter tags", () => {
    const docs: Doc[] = loadBook(fixture);
    const bySlug = (slug: string): Doc => docs.find((d: Doc) => d.fm.slug === slug)!;
    assert.equal(matterFor(bySlug("preface")), "front");
    assert.equal(matterFor(bySlug("glossary")), "back");
    assert.equal(matterFor(bySlug("closures")), null);
  });
});

describe("orderDocs", () => {
  test("is stable regardless of the order it is given", () => {
    const docs: Doc[] = loadBook(fixture);
    const reversed: string[] = orderDocs([...docs].reverse()).map((d: Doc) => d.rel);
    assert.deepEqual(reversed, docs.map((d: Doc) => d.rel));
  });
});

describe("volumeOfPart", () => {
  test("only the appendix is the companion", () => {
    assert.equal(volumeOfPart(COMPANION_PART), "companion");
    for (let part = 0; part <= 9; part++) assert.equal(volumeOfPart(part), "book");
  });
});

describe("partBudgets", () => {
  test("reads a budget for every named part out of BOOK-SPEC § 5", () => {
    const budgets: Map<number, number> = partBudgets(ROOT);
    for (let part = 1; part <= COMPANION_PART; part++) {
      assert.ok(budgets.has(part), `no budget parsed for part ${part}`);
      assert.ok(budgets.get(part)! > 0, `part ${part} has a non-positive budget`);
    }
  });

  test("throws rather than measuring against nothing if § 5 stops parsing", () => {
    const broken: string = mkdtempSync(join(tmpdir(), "book-spec-"));
    writeFileSync(join(broken, "BOOK-SPEC.md"), "# Spec\n\nNo budget table here.\n", "utf8");
    assert.throws(() => partBudgets(broken), /no budget row found/);
    rmSync(broken, { recursive: true, force: true });
  });
});
