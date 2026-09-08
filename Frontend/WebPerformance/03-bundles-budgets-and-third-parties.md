---
title: Bundles, Budgets and Third Parties
part: 4
chapter: 0
slug: bundle-optimisation
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [bundle-size, tree-shaking, performance-budget, ci, third-party-scripts]
in_book: true
---

# Bundles, Budgets and Third Parties {#ch-bundle-optimisation}

> Cut the bytes you control, enforce a limit in CI so they stay cut, and govern the bytes you do not control.

**In this chapter:** what defeats tree shaking · import style as a size decision · measuring the compressed number · a budget that fails the build · third-party scripts and the bytes you do not own

## 💡 The Core Idea

Bundle size is not a state you reach. It is a **ratchet that only turns one way** unless something
stops it, because every feature adds code and nobody's pull request is individually the problem.

That reframes the work. A one-off optimisation week takes 400 kB out and the following quarter puts
500 kB back, so the durable part of this chapter is not the tree-shaking technique — it is the budget
in CI that makes the next regression somebody's problem before it merges.

And the second half of the number is not yours at all. On a typical commercial page, third-party
scripts — analytics, tag managers, chat widgets, consent tooling — are a large share of the JavaScript
and all of the risk you cannot fix by refactoring. Governing those is a performance skill, not a
procurement detail.

## How It Works

### Tree shaking, and the three things that defeat it

Tree shaking drops exports you import but never use. It needs static analysis to prove the removal is
safe, so anything that obscures the module graph turns it off.

| Requirement | What breaks it |
| ----------- | -------------- |
| ES modules | A CommonJS build — `require` is dynamic, so nothing can be proved unused |
| A production build | Development builds skip it entirely |
| No import-time side effects | A module that mutates globals on import cannot be dropped |

```json
{
  "sideEffects": ["*.css", "./src/polyfills.ts"]
}
```

That field is the one people miss when publishing a package. `"sideEffects": false` tells bundlers
that dropping any unused module is safe; listing exceptions is the honest version when a stylesheet or
a polyfill genuinely must run on import.

### Import style is a size decision

```typescript
// ❌ The default import pulls the whole CommonJS build — around 70 kB
import _ from "lodash";
_.debounce(fn, 300);

// ✅ Named import from the ES module build — around 2 kB
import { debounce } from "lodash-es";
```

Same function, thirty-five times the cost. The general rule: **prefer a library's ES module build and
import named exports.** Two habits follow from it — check what a dependency costs before installing
it, and re-check after, because a transitive upgrade can change the answer.

The four that show up most in real bundle analyses:

| Instead of | Use | Saving |
| ---------- | --- | ------ |
| `moment` (~290 kB) | `date-fns`, or the platform's `Intl` and `Temporal` APIs | Nearly all of it |
| `lodash` full build | `lodash-es` named imports, or a three-line local helper | ~68 kB |
| `axios` | `fetch`, which every target browser has | ~15 kB |
| `chart.js` imported eagerly | The same library, lazily — [Chapter ?? — Loading and Code Splitting](#ch-loading-and-code-splitting) | Off the initial bundle entirely |

### Measure the compressed number, because that is what ships

```text
1,000 kB raw → minify → 700 kB → Brotli → ~180 kB over the wire
```

Minification removes what only humans need; compression removes redundancy in what is left. Together
they take 80–90% off JavaScript, and every hosting platform and CDN does Brotli with a gzip fallback
automatically now.

The consequence for how you work: **an uncompressed size is not a number to make decisions with.**
Configure your analyser to report compressed sizes, or you will spend time on a dependency that
compresses well and ignore one that does not.

Every analyser has a flag for this — `rollup-plugin-visualizer` takes `gzipSize` and `brotliSize`, and
the Webpack equivalent has the same option. Read the treemap before optimising anything. It routinely shows one dependency accounting for a third
of the bundle, and it is almost never the one the team assumed.

### A budget is only a budget if it fails the build

A number in a document is a wish. Two kinds of check turn it into a constraint, and they catch
different regressions.

**Asset size, per entry point — fast, deterministic, runs on every pull request:**

```json
{
  "size-limit": [
    { "path": "dist/assets/index-*.js", "limit": "170 kB" },
    { "path": "dist/assets/react-vendor-*.js", "limit": "45 kB" }
  ]
}
```

**Metric budgets, against a real load — slower, needs a deployed preview:**

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 200000 }]
      }
    }
  }
}
```

Three practical rules for making a budget survive contact with a team:

| Rule | Why |
| ---- | --- |
| Set the limit slightly above today's number | A budget that is already red gets disabled in a week |
| Fail the build, do not warn | A warning in a log is not a budget |
| Report the delta on the pull request | "+14 kB" in a comment changes behaviour; a red cross invites a retry |

And be honest about what each catches. Asset-size limits catch a dependency someone added; metric
budgets catch a change in *how* things load — a newly render-blocking script, a font that started
reflowing — which no size check can see.

> ⚠️ **Moving target:** the tooling here churns — Lighthouse's assertion names, the bundle-size
> actions, the CDN's compression defaults. The durable principle is two gates: **a deterministic size
> check on every pull request, and a metric check against a real deployed load.** Verify the current
> configuration format before copying one.

### The bytes you do not control

Third-party scripts are where a page's performance is usually lost, and the usual technical
optimisations do not apply — you cannot tree-shake a tag manager. What you can do is govern.

| Control | What it prevents |
| ------- | ---------------- |
| An owner and a review for every new tag | The tag manager becoming an unreviewed deploy channel |
| A recorded reason and expiry date per script | Scripts nobody remembers, still loading three years on |
| Load after interaction or on idle, never in the head | A vendor's script blocking your first paint |
| A separate budget line for third-party bytes | First-party work being spent to pay for vendor growth |
| `preconnect` for the ones that must be early | The connection cost being serial with the request |

The two structural moves worth naming in an interview:

- **Nothing third-party goes in the critical path.** Analytics, chat and consent tooling do not need to
  run before the first paint. Deferring them to idle costs the vendor nothing and gets your LCP back.
- **A tag manager is a production deploy with no code review.** Marketing can ship arbitrary
  JavaScript to every user without a pull request. Treat container changes as releases, with an owner
  and a rollback, or accept that your performance budget is advisory.

```html
<!-- The connection is opened early; the script itself is not on the critical path -->
<link rel="preconnect" href="https://analytics.example.com" />
<script src="https://analytics.example.com/a.js" defer></script>
```

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| The bundle grew and nobody knows why | Read the treemap, compressed | It is usually one dependency, and usually a surprise |
| A dependency used for one function | Delete it and write the function | Fewer things to track is the only permanent fix |
| A large library needed on one route | Split it, do not shrink it | Deferral beats optimisation here |
| Size creeping up release after release | A size limit in CI | The only fix that survives staff changes |
| Good asset sizes, bad field metrics | A metric budget on a preview deploy | The problem is load order, not bytes |
| A vendor script added last quarter | Owner, expiry, and defer it | This is where most commercial pages lose |

## Common Mistakes

❌ **Optimising uncompressed sizes.** You will chase a dependency that compresses to nothing.
✅ Report gzip or Brotli sizes and decide on those.

❌ **A default import from a library with an ES build.** Pulls the whole thing, defeating tree shaking.
✅ Named imports from the ES module build.

❌ **A budget that only warns.** It is a log line nobody reads.
✅ Fail the build, and post the delta on the pull request.

❌ **Setting the budget at the aspirational number.** It is red from day one and gets switched off.
✅ Set it just above today, then ratchet it down deliberately.

❌ **Treating third-party scripts as somebody else's problem.** They are frequently most of the
JavaScript on the page.
✅ A separate budget line, an owner per script, and nothing vendor-supplied in the head.

## 🔑 Key Takeaways

- Bundle size only ratchets upward, so the durable fix is a CI gate rather than an optimisation week.
- Tree shaking needs ES modules, a production build and no import-time side effects — any of the three missing turns it off.
- Only the compressed size is a number worth deciding on; minification plus Brotli removes 80–90%.
- Two gates catch different regressions: deterministic asset sizes per pull request, metric budgets against a real load.
- Third-party scripts are often most of the page's JavaScript, and the only levers are ownership, expiry and deferral.

## Interview Questions

**Q: You import one function from a library and the bundle grows by 70 kB. What happened?**

Almost certainly a default import against a CommonJS build. Tree shaking needs a statically analysable
module graph, and `require` is dynamic, so the bundler cannot prove any part of the library is unused
and keeps all of it. The fix is a named import from the ES module build, and the general lesson is
that import style is a size decision rather than a style one.

**Q: How do you stop bundle size regressing over a year?**

A size limit per entry point that fails the build, set just above the current number, plus a comment
on each pull request reporting the delta. The delta is the part that changes behaviour — a red cross
gets retried, whereas "+14 kB" gets a question in review. I would pair it with a metric budget against
a preview deploy, because a size check cannot see a script that became render-blocking.

**Q: A page has a 2 MB JavaScript payload and half of it is third-party. How do you approach it?**

The first-party half is refactoring and splitting work. The third-party half is governance: every
script gets a named owner and a stated reason, anything unclaimed comes out, and nothing vendor-supplied
loads in the head — defer it to idle, which costs the vendor nothing. I would also give third-party
bytes their own budget line, otherwise first-party effort silently funds vendor growth.

## What to Read Next

- [Chapter ?? — Loading and Code Splitting](#ch-loading-and-code-splitting) — deferring bytes rather than removing them
- [Chapter ?? — Measuring in Production](#ch-measuring-in-production) — the field data a metric budget should be calibrated against
- [Chapter ?? — Rust-Based Bundlers](#ch-rust-bundlers) — the build-speed side of the same tooling
