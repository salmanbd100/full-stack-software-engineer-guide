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
  n: number;
  title: string;
  done: boolean;
  line: number;
  body: string;
}

interface ModelRule {
  items: Set<number>;
  model: string;
  id: string;
  effort: string;
}

const raw: string = readFileSync(PLAN, "utf8");
const lines: string[] = raw.split("\n");

// ---------------------------------------------------------------------------
// Parse items
// ---------------------------------------------------------------------------

const items: Item[] = [];
lines.forEach((l: string, i: number) => {
  const m = l.match(/^### - \[([ x])\] (\d+)\.\s+(.+?)(?:\s+`[SML]`)?(?:\s+—.*)?$/);
  if (m) items.push({ n: Number(m[2]), title: m[3].trim(), done: m[1] === "x", line: i + 1, body: "" });
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

/** Expands "3, 6–12, 14–16" into a set. Handles both en-dash and hyphen ranges. */
function expandRanges(spec: string): Set<number> {
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const m = part.trim().match(/^(\d+)\s*[–-]\s*(\d+)$/);
    if (m) {
      for (let i = Number(m[1]); i <= Number(m[2]); i++) out.add(i);
    } else if (/^\d+$/.test(part.trim())) {
      out.add(Number(part.trim()));
    }
  }
  return out;
}

const modelRules: ModelRule[] = [];
for (const l of lines) {
  // | 3, 6–12, ... | **Sonnet 5** `claude-sonnet-5` | `low`–`medium` | why |
  const m = l.match(/^\|\s*([\d,–\s-]+?)\s*\|\s*\*\*([^*]+)\*\*\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/);
  if (m) modelRules.push({ items: expandRanges(m[1]), model: m[2].trim(), id: m[3].trim(), effort: m[4].trim() });
}

function modelFor(n: number): ModelRule | undefined {
  return modelRules.find((r: ModelRule) => r.items.has(n));
}

// ---------------------------------------------------------------------------
// --next
// ---------------------------------------------------------------------------

if (want("--next")) {
  if (!next) {
    console.log("\n🎉 Every item is checked. The plan is complete.\n");
  } else {
    console.log(`\n▶ NEXT ITEM — #${next.n}: ${next.title}`);
    console.log(`  IMPROVEMENT-PLAN.md:${next.line}\n`);

    const rec = modelFor(next.n);
    if (rec) console.log(`  🧠 Use ${rec.model} (${rec.id}) at effort ${rec.effort}\n`);
    else console.log(`  ⚠️  no model mapping for #${next.n} — add it to the "Model per item" table\n`);

    const doneWhen = next.body.match(/\*\*Done when:\*\*\s*([\s\S]*?)(?:\n\n|$)/);
    console.log(`  Done when: ${doneWhen ? doneWhen[1].replace(/\s+/g, " ").trim() : "⚠️  no 'Done when' line — add one"}`);

    // Ordering constraints, from this item's own body and from any other item that names it.
    const constraints: string[] = [];
    if (/🔴\s*\*?\*?Ordering/i.test(next.body)) {
      const m = next.body.match(/🔴[^\n]*\n?([\s\S]{0,320})/);
      if (m) constraints.push(`in #${next.n}: ${m[0].replace(/\s+/g, " ").slice(0, 260)}…`);
    }
    for (const other of items) {
      if (other.n === next.n) continue;
      const re = new RegExp(`(before|after)\\s+#${next.n}\\b`, "i");
      if (re.test(other.body)) constraints.push(`#${other.n} references it: "…${other.body.match(re)![0]}…"`);
    }
    if (constraints.length) {
      console.log(`\n  🔴 ORDERING — check before starting:`);
      for (const c of constraints) console.log(`     ${c}`);
    }

    const blockers: Item[] = items.filter((i: Item) => !i.done && i.n < next.n);
    if (blockers.length) console.log(`\n  ⚠️  earlier unchecked items: ${blockers.map((b: Item) => "#" + b.n).join(", ")}`);
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
    const m = l.match(/^\|\s*(\d)\s*\|\s*\d+[–-]\d+\s*\|\s*(\d+)\/(\d+)\s*\|/);
    if (m) rows.push({ phase: m[1], done: Number(m[2]), of: Number(m[3]) });
  }
  const phaseSum: number = rows.reduce((a, r) => a + r.done, 0);

  const unmapped: number[] = items.filter((i: Item) => !modelFor(i.n)).map((i: Item) => i.n);

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
