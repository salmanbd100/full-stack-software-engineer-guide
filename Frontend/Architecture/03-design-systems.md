---
title: Design Systems, Dependencies and Upgrades
part: 4
chapter: 4
slug: design-systems-at-scale
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-24
tags: [architecture, design-systems, design-tokens, theming, versioning, dependencies, upgrades, semver, renovate, migration]
in_book: true
---

# Design Systems, Dependencies and Upgrades {#ch-design-systems-at-scale}

> Publish shared code that forty teams can adopt, and keep your own codebase upgradable against everyone else's.

**In this chapter:** tokens, components and theming · versioning the code you publish · pricing the code you consume · automating the safe updates · running a major as a migration

## 💡 The Core Idea

Every frontend sits in the middle of a chain of shared code. You publish some of it, like a design
system. You consume far more of it, like React, a router and a form library. Both sides follow one rule:
**the other side depends on your contract, and the contract is the version number.**

A design system makes a brand or focus-style change happen once, not forty times. It fails when nobody
upgrades to it, or when it breaks teams without a migration path.

On the consuming side, an upgrade costs **how long you waited**, not the size of the diff. A React minor
taken the week it ships is a lockfile change. Three years later it arrives with a bundler major and four
abandoned packages. The senior skill is keeping upgrades small, continuous and never all due at once.

## How It Works

A design system has three layers: **tokens** (the values), **components** (the code) and **docs** (when
to use which). Tokens are the only layer that native apps and email templates can consume too.

### Design tokens

Tokens store design decisions as data. **Primitive** tokens are named after what they are. **Semantic**
tokens are named after what they are for.

**Primitives feed semantics, and components see only semantics:**

```typescript
const palette = {
  blue500: "#2196f3",
  grey0: "#ffffff",
  grey900: "#212121",
} as const;

export const tokens = {
  colour: {
    surface: palette.grey0,
    text: palette.grey900,
    actionPrimary: palette.blue500,
  },
  space: { sm: "0.5rem", md: "1rem", lg: "1.5rem" },
} as const;
```

You can re-point `actionPrimary` at a different primitive for a sub-brand or a high-contrast theme. A
component that references `blue500` directly cannot be re-themed at all.

### The component contract and theming

A consumer depends on the **props**, not the markup. Keep the surface small and typed. Keep the
accessible behaviour inside the component, so no consumer can forget it.

**A button whose accessibility lives in the component:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

export function Button({ variant = "primary", loading = false, disabled, children, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn--${variant}`} disabled={disabled ?? loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner aria-hidden="true" /> : children}
    </button>
  );
}
```

Extending `ButtonHTMLAttributes` gives consumers `type`, `form` and `onFocus` for free. Themes swap
semantic tokens, never component code. CSS custom properties do it with no re-render: `:root` holds the
light theme and `[data-theme="dark"]` overrides it. A theme held in React context re-renders every
themed component on a switch.

### Versioning the code you publish

A design system is a published package with an API. Semantic versioning is the contract, and a major
version needs three things or teams will not take it.

| Version bump | Means | What you owe consumers |
| ------------ | ----- | ---------------------- |
| Patch | Bug fix, no API change | Nothing |
| Minor | New component or new optional prop | A changelog entry |
| Major | Renamed prop, removed component, changed default | A migration guide, a codemod, and a deprecation period |

React belongs in `peerDependencies`, so the consumer's copy is the only React in the tree.
[Chapter ?? — Micro-Frontends](#ch-micro-frontends) meets the same singleton rule from the other side.

### Pricing the code you consume

A dependency is a standing promise to track someone else's release schedule. Each package belongs to a
tier, and each tier gets a different policy.

| Tier | Examples | Replacement cost | Policy |
| ---- | -------- | ---------------- | ------ |
| **Framework** | React, the router, the bundler, Node | Months | Never drift more than one major behind |
| **Load-bearing** | Data fetching, forms, charts, auth SDK | Weeks | Wrap it, so replacing it touches one file |
| **Leaf utility** | Date formatting, `clsx` | Hours | Update automatically, or delete it |
| **Your own** | The design system, shared config | Yours to control | Honour the versioning contract above |

The middle tier causes the trouble. A form library that nobody wrapped reaches into every screen. It
becomes a framework in practice, with none of a framework's support guarantees.

**Wrap a load-bearing dependency so the blast radius is one file:**

```typescript
import { track as vendorTrack } from "@vendor/analytics";

export interface AnalyticsEvent {
  name: string;
  props?: Record<string, string | number | boolean>;
}

// The only file in the app that knows the vendor's argument shape.
export function track(event: AnalyticsEvent): void {
  vendorTrack(event.name, event.props ?? {});
}
```

Two hundred call sites now depend on `AnalyticsEvent`, which you own. A vendor swap rewrites one file.

### Automating the safe updates

Patch and minor updates are most of the volume and little of the risk. Review them by hand and they
pile up. So automate everything non-breaking, group it, and send majors to a person.

**A Renovate policy that routes by update type and dependency type:**

```json
{
  "extends": ["config:recommended"],
  "packageRules": [
    { "matchDepTypes": ["devDependencies"], "matchUpdateTypes": ["patch", "minor"], "groupName": "dev (non-major)", "automerge": true },
    { "matchUpdateTypes": ["patch"], "automerge": true },
    { "matchUpdateTypes": ["major"], "dependencyDashboardApproval": true }
  ],
  "minimumReleaseAge": "3 days"
}
```

Dev dependencies cannot reach production, so grouping them turns thirty pull requests into one. The
release-age delay limits supply-chain exposure ([Chapter ?? — GitHub Actions and Pipeline Security](#ch-github-actions)).

> ⚠️ **Moving target:** these are Renovate 41's configuration keys, and Dependabot spells its grouping
> options differently. The durable principle is that automation decides by **update type and dependency
> type**, and that automerge is only safe when the test suite gates it. Check the current key names.

### Running a major as a migration

A framework major is a project, not a bump. Three habits separate a two-week migration from an
abandoned branch:

- **Audit peer dependencies before writing code.** One unmaintained package pinned to the old major
  blocks everything. Find it on day one, not in week three.
- **Land it incrementally.** Ship it to one route, behind a flag, or in one workspace package. An
  all-or-nothing branch gathers conflicts faster than it makes progress.
- **Book the cleanup.** "Temporary" shims are how a codebase runs two versions of one library for years.

Then give upgrade debt a number. Track **majors behind**, **median dependency age** and **direct
dependencies with no release in 18 months**. Put them beside the error budget, where they get funded.

## When to Use It

| Situation | Do this | Why |
| --------- | ------- | --- |
| One product, one team | A shared components folder | A published package is overhead |
| Several products or brands | A published package, with themes as token sets | One change lands everywhere |
| Design language still changing | Ship tokens first, hold components back | Values are cheap to change; components are not |
| Patch or minor on any dependency | Automate it | Review costs more than the risk |
| Framework major, two behind | Stop feature work and schedule it | Each further release widens the gap |
| Large unmaintained dependency | Wrap it, then plan a replacement | A fork of a large package is permanent |

## Common Mistakes

❌ **Components referencing primitive tokens.** `blue500` in a button means the button cannot be re-themed.
✅ Components read semantic tokens only; semantics point at primitives.

❌ **Accessibility as the consumer's job.** A `Dialog` that does not trap focus ships broken in every app.
✅ Focus, keyboard handling and roles live inside the component and are tested there.

❌ **Breaking changes in a minor version.** One renamed prop breaks every consumer and kills trust in upgrades.
✅ Major version, deprecation period, codemod.

❌ **A quarterly "dependency week".** Batching upgrades recreates the coupling that makes them expensive.
✅ Continuous small updates through automation, with each major scheduled on its own.

❌ **Calling the upgrade done when the pipeline goes green.** The shims and skipped tests are still there.
✅ Close every migration with a cleanup pull request that deletes the shims by name.

## 🔑 Key Takeaways

- A design system is tokens, components and docs, and components may see only semantic tokens.
- The published API is the props, so semantic versioning plus a migration path is the real contract.
- The cost of an upgrade is driven by how long you waited, not by the size of the change.
- Every dependency has a tier, and anything above a leaf utility should sit behind your own wrapper.
- Automerging patches is only defensible when the test suite is what gates the merge.

## Interview Questions

**Q: How would you introduce a design system into forty teams that all have their own components?**

Not all at once. Ship tokens first as CSS variables, because teams can adopt them in an afternoon and
they fix colour and spacing drift. Then publish the busiest components one at a time: button, input,
dialog. Teams migrate per component, not per app. A big-bang cutover needs forty teams to pick the same
sprint, so it never happens.

**Q: You need to rename a prop on your most-used component. How do you ship it?**

Accept both names for a full major version. The old one warns in development and carries `@deprecated`
in the types, so editors flag it. Ship a codemod and a migration guide, and state a support window for
the previous major. A clean break is technically correct and gets your system forked.

**Q: When is a design system the wrong investment?**

When the design language is still moving. Components encode decisions, so building them early means
rebuilding them after teams have worked around the first version. Ship tokens early, because values are
cheap to change, and wait on components until the language is worth freezing.

**Q: A team says they cannot upgrade React because "too much would break". How do you find out?**

Start with the peer-dependency audit, not the code. Check which direct dependencies have a release for
the target major. Usually two or three packages truly block, and the rest is codemod work. That turns
an unbounded fear into a list of named tasks you can schedule.

## What to Read Next

- [Chapter ?? — Micro-Frontends](#ch-micro-frontends) — where a shared system is what stops five teams diverging
- [Chapter ?? — GitHub Actions and Pipeline Security](#ch-github-actions) — lockfiles, provenance and the supply-chain controls automation relies on
- [Chapter ?? — Branching, Review and Repository Strategy](#ch-branching-and-review-workflow) — whether one version of a dependency is even an option
