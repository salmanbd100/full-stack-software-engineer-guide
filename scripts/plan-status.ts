/**
 * plan-status.ts — reads IMPROVEMENT-PLAN.md and answers two questions the
 * `continue-plan` skill needs answered correctly every session:
 *
 *   1. Which item is next?          node --experimental-strip-types scripts/plan-status.ts --next
 *   2. Do the counters still agree?  node --experimental-strip-types scripts/plan-status.ts --check
 *
 * With no flag it prints both. Read-only — it never edits the plan.
 *
 * Why this exists: the item number, the header counter, the Phase Map row and the
 * Progress Tracker row all have to move together when an item is ticked off. Doing
 * that by eye across a 1,400-line file is how a plan silently loses its place.
 */

import { readFileSync } from "node:fs";

const PLAN = "IMPROVEMENT-PLAN.md";
const argv: string[] = process.argv.slice(2);
const want = (f: string): boolean => argv.length === 0 || argv.includes(f);

interface Item {
  /** Item id as written: "29", or "31a" for a sub-item. */
  id: string;
  /** Sort key — 31a falls between 31 and 32. */
  order: number;
  title: string;
  done: boolean;
  line: number;
  body: string;
}

interface ModelRule {
  items: Set<string>;
  model: string;
  id: string;
  effort: string;
}

/**
 * Sub-items — improvement #29.
 *
 * Items #31a–#31e were added to Phase 2 after the plan was numbered. Inserting them as
 * 32–36 would have renumbered forty-seven items and every `#N` reference between them,
 * for no gain; appending them as 79–83 would have put a Phase 2 item at the far end of
 * Phase 7. A letter suffix keeps an item physically and numerically where it belongs.
 */
function orderOf(id: string): number {
  const m = /^(\d+)([a-z]?)$/.exec(id);
  if (!m) return Number.POSITIVE_INFINITY;
  return Number(m[1]) + (m[2] ? (m[2].charCodeAt(0) - 96) / 100 : 0);
}

const raw: string = readFileSync(PLAN, "utf8");
const lines: string[] = raw.split("\n");

// ---------------------------------------------------------------------------
// Parse items
// ---------------------------------------------------------------------------

const items: Item[] = [];
lines.forEach((l: string, i: number) => {
  // The trailing group strips only the completion marker (" — ✅ **done …**"), not any em
  // dash — several titles contain one ("Write `React/` chapters 01–04 — the model").
  const m = l.match(/^### - \[([ x])\] (\d+[a-z]?)\.\s+(.+?)(?:\s+`[SML]`)?(?:\s+—\s+✅.*)?$/);
  if (m) {
    items.push({
      id: m[2],
      order: orderOf(m[2]),
      title: m[3].trim(),
      done: m[1] === "x",
      line: i + 1,
      body: "",
    });
  }
});

// Body = everything up to the next item heading, so "Done when" and ordering notes come with it.
items.forEach((it: Item, idx: number) => {
  const end: number = idx + 1 < items.length ? items[idx + 1].line - 1 : lines.length;
  it.body = lines.slice(it.line, end).join("\n");
});

const doneCount: number = items.filter((i: Item) => i.done).length;
const next: Item | undefined = items.find((i: Item) => !i.done);

// ---------------------------------------------------------------------------
// Model recommendation, read from the "Model per item" table so the plan stays
// the single source of truth — edit the table, not this script.
// ---------------------------------------------------------------------------

/**
 * Expands "3, 6–12, 31a–31e, 14–16" into a set of item ids.
 *
 * Ranges work on plain numbers and on same-number letter suffixes ("31a–31e"). Handles
 * both en-dash and hyphen, because the plan uses both.
 */
function expandRanges(spec: string): Set<string> {
  const out = new Set<string>();
  for (const raw of spec.split(",")) {
    const part: string = raw.trim();

    const numeric = part.match(/^(\d+)\s*[–-]\s*(\d+)$/);
    if (numeric) {
      for (let i = Number(numeric[1]); i <= Number(numeric[2]); i++) out.add(String(i));
      continue;
    }

    const lettered = part.match(/^(\d+)([a-z])\s*[–-]\s*(?:\1)?([a-z])$/);
    if (lettered) {
      for (let c = lettered[2].charCodeAt(0); c <= lettered[3].charCodeAt(0); c++) {
        out.add(lettered[1] + String.fromCharCode(c));
      }
      continue;
    }

    if (/^\d+[a-z]?$/.test(part)) out.add(part);
  }
  return out;
}

const modelRules: ModelRule[] = [];
for (const l of lines) {
  // | 3, 6–12, ... | **Sonnet 5** `claude-sonnet-5` | `low`–`medium` | why |
  const m = l.match(/^\|\s*([\da-z,–\s-]+?)\s*\|\s*\*\*([^*]+)\*\*\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/);
  if (m) modelRules.push({ items: expandRanges(m[1]), model: m[2].trim(), id: m[3].trim(), effort: m[4].trim() });
}

function modelFor(id: string): ModelRule | undefined {
  return modelRules.find((r: ModelRule) => r.items.has(id));
}

// ---------------------------------------------------------------------------
// --next
// ---------------------------------------------------------------------------

if (want("--next")) {
  if (!next) {
    console.log("\n🎉 Every item is checked. The plan is complete.\n");
  } else {
    console.log(`\n▶ NEXT ITEM — #${next.id}: ${next.title}`);
    console.log(`  IMPROVEMENT-PLAN.md:${next.line}\n`);

    const rec = modelFor(next.id);
    if (rec) console.log(`  🧠 Use ${rec.model} (${rec.id}) at effort ${rec.effort}\n`);
    else console.log(`  ⚠️  no model mapping for #${next.id} — add it to the "Model per item" table\n`);

    const doneWhen = next.body.match(/\*\*Done when:\*\*\s*([\s\S]*?)(?:\n\n|$)/);
    console.log(`  Done when: ${doneWhen ? doneWhen[1].replace(/\s+/g, " ").trim() : "⚠️  no 'Done when' line — add one"}`);

    // Ordering constraints, from this item's own body and from any other item that names it.
    const constraints: string[] = [];
    if (/🔴\s*\*?\*?Ordering/i.test(next.body)) {
      const m = next.body.match(/🔴[^\n]*\n?([\s\S]{0,320})/);
      if (m) constraints.push(`in #${next.id}: ${m[0].replace(/\s+/g, " ").slice(0, 260)}…`);
    }
    for (const other of items) {
      if (other.id === next.id) continue;
      const re = new RegExp(`(before|after)\\s+#${next.id}\\b`, "i");
      if (re.test(other.body)) constraints.push(`#${other.id} references it: "…${other.body.match(re)![0]}…"`);
    }
    if (constraints.length) {
      console.log(`\n  🔴 ORDERING — check before starting:`);
      for (const c of constraints) console.log(`     ${c}`);
    }

    const blockers: Item[] = items.filter((i: Item) => !i.done && i.order < next.order);
    if (blockers.length) console.log(`\n  ⚠️  earlier unchecked items: ${blockers.map((b: Item) => "#" + b.id).join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// --check — the three counters must agree with the checkboxes
// ---------------------------------------------------------------------------

if (want("--check")) {
  const total: number = items.length;
  const header = raw.match(/\*\*Progress:\*\*\s*(\d+)\s*\/\s*(\d+)/);
  const tracker = raw.match(/\|\s*\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\/(\d+)\*\*/);

  const rows: { phase: string; done: number; of: number }[] = [];
  for (const l of lines) {
    // The Items cell is prose once a phase holds sub-items ("20–31 · 31a–31e"), so it is
    // matched loosely. The done/of pair in the next cell is what this check reads.
    const m = l.match(/^\|\s*(\d)\s*\|\s*[^|]+?\s*\|\s*(\d+)\/(\d+)\s*\|/);
    if (m) rows.push({ phase: m[1], done: Number(m[2]), of: Number(m[3]) });
  }
  const phaseSum: number = rows.reduce((a, r) => a + r.done, 0);

  const unmapped: string[] = items.filter((i: Item) => !modelFor(i.id)).map((i: Item) => i.id);

  const checks: [string, boolean, string][] = [
    ["checkboxes ticked", true, `${doneCount} / ${total}`],
    ["model mapping", unmapped.length === 0,
      unmapped.length ? `unmapped: ${unmapped.join(", ")}` : `all ${total} items mapped`],
    ["header counter", !!header && Number(header[1]) === doneCount && Number(header[2]) === total,
      header ? `${header[1]} / ${header[2]}` : "NOT FOUND"],
    ["progress tracker", !!tracker && Number(tracker[2]) === doneCount && Number(tracker[1]) === total,
      tracker ? `${tracker[2]}/${tracker[3]}` : "NOT FOUND"],
    ["phase map rows", phaseSum === doneCount, `${phaseSum} across ${rows.length} phases`],
  ];

  console.log(`\n📊 COUNTER CHECK`);
  for (const [name, ok, val] of checks) console.log(`  ${ok ? "✅" : "❌"} ${name.padEnd(20)} ${val}`);
  const bad = checks.filter(([, ok]) => !ok);
  console.log(bad.length ? `\n  ❌ ${bad.length} counter(s) out of sync with the checkboxes — fix before continuing.\n`
                         : `\n  ✅ all counters agree.\n`);
  if (bad.length) process.exitCode = 1;
}
