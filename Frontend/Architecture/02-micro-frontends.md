---
title: Micro-Frontends
part: 4
chapter: 0
slug: micro-frontends
level: advanced # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-09
tags: [architecture, micro-frontends, module-federation, deployment, boundaries]
in_book: true
---

# Micro-Frontends {#ch-micro-frontends}

> Say when independent deploys are worth the coordination cost, and when they are not.

**In this chapter:** the problem it actually solves · the four integration approaches · Module Federation · shared dependencies · cross-app communication · the failure modes

## 💡 The Core Idea

Micro-frontends split one user-facing application into pieces that separate teams build, test and
**deploy on their own schedules**. A shell application stitches the pieces together at runtime so the
user sees one product.

The thing to be clear about in an interview: this solves an **organisational** problem, not a
technical one. Nothing about a micro-frontend makes the app faster, smaller or easier to reason about
— it makes all three worse. What it buys is that the checkout team can ship on Tuesday without
waiting for the search team's release train. If nobody is waiting on a release train, you are paying
the cost for nothing.

## How It Works

### The four integration approaches

| Approach | Independence | Cost | Fits |
| -------- | ------------ | ---- | ---- |
| **Build-time** — each app publishes an npm package | Low. The shell must rebuild and redeploy | Low | Two or three teams that tolerate coupled releases |
| **Runtime JavaScript** — Module Federation, single-spa, import maps | High. Deploy the remote, the shell picks it up | Medium | The default for genuine independence |
| **iframes** | Highest. Total isolation of CSS, JS and globals | Low to build, high to use | Wrapping a legacy or third-party app |
| **Web Components** | High | Medium | Mixed frameworks under one shell |

Build-time integration is the one most often mislabelled. Publishing `@acme/checkout-ui` and
consuming it from the shell is a shared component library with extra steps — the shell still has to
redeploy for the change to reach users, so the deploy independence never arrives.

### Module Federation

Each remote declares what it exposes; the shell declares where to find remotes. Neither side needs the
other at build time.

**The remote — the checkout team's build:**

```typescript
// checkout/webpack.config.ts
import { ModuleFederationPlugin } from "webpack/lib/container/ModuleFederationPlugin";

export default {
  plugins: [
    new ModuleFederationPlugin({
      name: "checkoutApp",
      filename: "remoteEntry.js",
      exposes: {
        "./CheckoutFlow": "./src/CheckoutFlow",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^19.0.0" },
      },
    }),
  ],
};
```

**The shell — resolves remotes by URL at runtime, with the same `shared` block:**

```typescript
remotes: {
  checkoutApp: "checkoutApp@https://checkout.example.com/remoteEntry.js",
  searchApp: "searchApp@https://search.example.com/remoteEntry.js",
}
```

**Consuming a remote, with the two guards that are not optional:**

```typescript
import { lazy, Suspense } from "react";

const CheckoutFlow = lazy(() => import("checkoutApp/CheckoutFlow"));

function CheckoutRoute() {
  return (
    // A remote is a network dependency: it can be slow, and it can be down.
    <ErrorBoundary fallback={<CheckoutUnavailable />}>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutFlow />
      </Suspense>
    </ErrorBoundary>
  );
}
```

> ⚠️ **Moving target:** Module Federation is a Webpack 5 feature that Rspack implements natively and
> Vite covers through a plugin, and the runtime API has changed across Federation 1.x and 2.x. The
> durable principle is that runtime integration means resolving code by URL at load time, which turns
> another team's deploy into a network dependency of yours. The plugin names will move.

### The single-spa alternative

Module Federation composes **modules**; single-spa composes **applications**. Its root config maps a
route predicate to a bundle through `registerApplication`, and each application exports `bootstrap`,
`mount` and `unmount` lifecycles the root calls as the route changes.

The trade is the unit of composition. single-spa owns routing and application lifecycle, so mixed
frameworks under one shell are straightforward — but a remote is a whole screen. Reach for Federation
when remotes have to interleave inside one page, and for single-spa when each remote owns a route.

### Shared dependencies

`singleton: true` on React is not an optimisation. Two React copies in one page means two independent
hook dispatchers, and any component crossing between them throws.

Leave `shared` out and the shell and every remote load their own React. Hooks throw the moment a
remote component renders inside a shell context, and the stack trace points at neither team's code.

The consequence is a constraint people underestimate: every remote must be on a compatible React
major. Micro-frontends give you independent **deploys**, not independent **upgrades** — which makes
the version policy in [Chapter ?? — Dependencies and Upgrades](#ch-dependencies-and-upgrades) a
prerequisite rather than a nicety.

### Cross-app communication

Keep the contract as small as the browser allows. Anything richer becomes a shared library, and a
shared library re-couples the deploys you just decoupled.

```typescript
// The URL is the best shared state: framework-agnostic, bookmarkable, already synchronised
function openProduct(id: string): void {
  history.pushState({}, "", `/products/${id}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// Custom events for the rest — a typed contract, no shared runtime
interface CartItemAdded {
  productId: string;
  quantity: number;
}

function addToCart(detail: CartItemAdded): void {
  window.dispatchEvent(new CustomEvent<CartItemAdded>("cart:item-added", { detail }));
}
```

The cart remote listens for `cart:item-added` and casts `event.detail` back to `CartItemAdded`. That
interface is the whole contract, and it is the only thing both teams have to agree a version for.

## When to Use It

| Situation | Verdict |
| --------- | ------- |
| Five or more teams, each blocked by a shared release train | ✅ The case it was built for |
| Domains with genuinely different release cadences | ✅ Strong fit |
| A legacy app that must be absorbed screen by screen | ✅ Use iframes or Web Components, not Federation |
| One to three teams in one repository | ❌ Use a monorepo — see [Chapter ?? — Monorepos](#ch-monorepos) |
| Startup or MVP | ❌ Premature; the coordination overhead outruns the benefit |
| Screens that share state constantly | ❌ The domain boundary is in the wrong place |

The last row is the one worth rehearsing. If two micro-frontends need to see each other's state on
every interaction, they are one application that has been cut along the wrong seam. Fix the seam before
reaching for more integration machinery.

## Common Mistakes

❌ **Adopting it for code reuse.** Reuse is what a package registry and a monorepo are for.
✅ Adopt it only when deploy independence is the bottleneck you can name.

❌ **No error boundary around a remote.** A remote that fails to load takes the whole shell with it.
✅ Wrap every remote in an error boundary with a usable fallback, and treat load failure as expected.

❌ **Different framework majors per remote.** Independent deploys do not mean independent React versions.
✅ Agree a shared-dependency version policy up front and enforce it in CI.

❌ **A shared state library across remotes.** The moment two remotes import the same store, their
deploys are coupled again through the store's shape.
✅ Communicate through the URL and typed custom events; keep the contract narrow enough to version.

❌ **No shared design system.** Independent teams produce five different buttons within a quarter.
✅ Ship tokens and components as a versioned package — see [Chapter ?? — Design Systems at Scale](#ch-design-systems-at-scale).

## 🔑 Key Takeaways

- Micro-frontends buy deploy independence and cost you bundle size, latency and debuggability.
- Build-time integration is a component library with extra steps; the independence needs runtime loading.
- `singleton: true` on the framework is mandatory, and it means every remote shares a framework major.
- Keep the cross-app contract to the URL plus typed custom events, or the deploys re-couple.
- Every remote is a network dependency, so every remote needs an error boundary and a fallback.

## Interview Questions

**Q: When would you turn down micro-frontends?**

Whenever the pain being described is code duplication or inconsistent UI, because neither is a deploy
problem. A monorepo with a shared component package solves both at a fraction of the operational cost.
The one thing micro-frontends uniquely solve is teams waiting on each other to release, so if nobody
is waiting, the answer is no.

**Q: Why must React be a singleton across remotes, and what breaks if it is not?**

Hooks are resolved through a module-level dispatcher inside the React copy that rendered the component.
With two copies loaded, a component from one copy rendering inside a tree owned by the other reads a
null dispatcher and throws. `singleton: true` makes the loaders negotiate a single instance, which is
also why remotes cannot be on incompatible React majors.

**Q: A remote is down in production. What does the user see?**

Whatever the shell's error boundary renders — and if there is no boundary, a blank page, because a
failed dynamic import rejects during render. The design question behind this is which remotes are
load-bearing: navigation and auth need to be in the shell, while a recommendations panel should
degrade to nothing and let the rest of the page work.

**Q: How do two micro-frontends share the current user?**

The shell owns authentication and passes the resolved user down as props or context to remotes it
mounts, or the remotes read a token the shell put in a well-known place. What they should not do is
each run their own auth flow, because then the user signs in twice and the session-expiry behaviour
differs per remote. Auth is the clearest example of something that belongs in the shell, not in a remote.

## What to Read Next

- [Chapter ?? — Frontend Architecture Patterns](#ch-frontend-architecture-patterns) — the cheaper boundaries to try first
- [Chapter ?? — Monorepos](#ch-monorepos) — the answer when the problem is code sharing rather than deploys
- [Chapter ?? — Design Systems at Scale](#ch-design-systems-at-scale) — what keeps independent teams visually coherent
