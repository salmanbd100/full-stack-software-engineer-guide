/**
 * translate.test.ts — improvement #125
 *
 * `validateTranslation` is the only thing standing between a model's output and a page in
 * `i18n/bn/`. Each test below breaks one thing a translation must not touch and checks the
 * validator says so in words a person can act on.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  hashSource,
  maskFences,
  readTranslation,
  unmaskFences,
  validateTranslation,
  writeTranslation,
} from "../lib/translate.ts";

const FENCE = "```typescript\nconst total = items.reduce((sum, x) => sum + x.price, 0);\n```";

const EN: string = [
  "# Closures",
  "",
  "A closure keeps the `scope` it was created in. See [Chapter 8 — Scope](#ch-scope).",
  "",
  "## How it works",
  "",
  FENCE,
  "",
  "### A trap",
  "",
  "Read more at https://developer.mozilla.org/docs/Web/JavaScript/Closures.",
  "",
  "## Interview Questions",
  "",
  "**Q: What does a closure capture?** The variables, not their values. Use `let` in loops.",
].join("\n");

const BN: string = [
  "# ক্লোজার",
  "",
  "একটি closure যে `scope`-এ তৈরি হয়, সেটি ধরে রাখে। দেখুন [অধ্যায় ৮ — Scope](#ch-scope)।",
  "",
  "## এটি কীভাবে কাজ করে",
  "",
  FENCE,
  "",
  "### একটি ফাঁদ",
  "",
  "আরও পড়ুন https://developer.mozilla.org/docs/Web/JavaScript/Closures এ।",
  "",
  "## ইন্টারভিউ প্রশ্ন",
  "",
  "**Q: একটি closure কী ধরে রাখে?** ভেরিয়েবল, তাদের মান নয়। লুপে `let` ব্যবহার করুন।",
].join("\n");

/** Assert exactly one problem, and that it mentions every fragment given. */
function failsWith(bn: string, ...fragments: string[]): void {
  const problems: string[] = validateTranslation(EN, bn);
  assert.equal(problems.length >= 1, true, "expected the validator to reject this page");
  const all: string = problems.join("\n");
  for (const f of fragments) assert.ok(all.includes(f), `expected a message mentioning "${f}", got:\n${all}`);
}

describe("validateTranslation", () => {
  test("a faithful translation passes", () => {
    assert.deepEqual(validateTranslation(EN, BN), []);
  });

  test("a dropped fence fails", () => {
    failsWith(BN.replace(FENCE, ""), "fenced blocks: English has 1, Bangla has 0");
  });

  test("an edited fence fails, and the message shows both versions", () => {
    const edited: string = BN.replace("const total", "const মোট");
    failsWith(edited, "fenced block 1 changed", "const total", "const মোট");
  });

  test("a lost #ch- link fails", () => {
    failsWith(BN.replace("(#ch-scope)", ""), "link target lost: #ch-scope");
  });

  test("a lost absolute URL fails", () => {
    failsWith(BN.replace("https://developer.mozilla.org/docs/Web/JavaScript/Closures", "MDN"), "link target lost: https://");
  });

  test("a missing Q marker fails", () => {
    failsWith(BN.replace("**Q: ", "**প্রশ্ন: "), "**Q: markers: English has 1, Bangla has 0");
  });

  test("an edited inline code span fails", () => {
    failsWith(BN.replace("`let`", "`লেট`"), "inline code lost or changed: `let`", "inline code added or changed: `লেট`");
  });

  test("a lost heading fails", () => {
    failsWith(BN.replace("### একটি ফাঁদ", "একটি ফাঁদ"), "### headings: English has 1, Bangla has 0");
  });

  test("inline code may move within a sentence", () => {
    const moved: string = BN.replace("লুপে `let` ব্যবহার করুন", "`let` লুপে ব্যবহার করুন");
    assert.deepEqual(validateTranslation(EN, moved), []);
  });

  test("a URL inside a fence is the fence's business, not the link check's", () => {
    const en = "Text.\n\n```bash\ncurl https://example.com\n```\n";
    const bn = "লেখা।\n\n```bash\ncurl https://example.com\n```\n";
    assert.deepEqual(validateTranslation(en, bn), []);
  });
});

describe("the cache file", () => {
  test("hashSource is a stable SHA-256 and changes with one character", () => {
    assert.match(hashSource(EN), /^[0-9a-f]{64}$/);
    assert.equal(hashSource(EN), hashSource(EN));
    assert.notEqual(hashSource(EN), hashSource(`${EN} `));
  });

  test("front matter round-trips, including a title with a colon and a quote", () => {
    const meta = {
      sourceHash: hashSource(EN),
      title: 'ক্লোজার: "স্কোপ" ধরে রাখা',
      translatedAt: "2026-10-12T09:00:00.000Z",
      model: "claude-opus-5-5",
    };
    const back = readTranslation(writeTranslation(meta, BN));
    assert.deepEqual(back, { meta, body: BN });
  });

  test("a file missing a key is not a cache entry", () => {
    assert.equal(readTranslation('---\nsourceHash: "abc"\ntitle: "x"\n---\n\nbody'), null);
    assert.equal(readTranslation("no front matter"), null);
  });
});

describe("masking fences for a translator", () => {
  test("the masked page holds no code, and unmasking a faithful translation passes", () => {
    const masked: string = maskFences(EN);
    assert.equal(masked.includes("const total"), false);
    assert.ok(masked.includes("<!-- fence 1 -->"));
    const bn: string = unmaskFences(maskFences(BN), EN);
    assert.equal(bn, BN);
    assert.deepEqual(validateTranslation(EN, bn), []);
  });

  test("a dropped placeholder is not repaired, so the validator still catches it", () => {
    const bn: string = unmaskFences(maskFences(BN).replace("<!-- fence 1 -->", ""), EN);
    assert.ok(validateTranslation(EN, bn).some((p: string) => p.startsWith("fenced blocks:")));
  });
});
