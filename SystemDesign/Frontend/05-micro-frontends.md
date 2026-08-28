# Micro-Frontends {#ch-micro-frontends}

> Say when independent deploys are worth the coordination cost, and when they are not.

**In this chapter:** when to use and when not to · the implementation approaches · Module Federation · cross-app communication · shared dependencies

## 💡 **Concept**

Micro-frontends extend microservices thinking to the UI. Each team owns a business domain end-to-end — from database to user interface — and deploys independently. The container application stitches them into one user experience.

**How to answer in an interview:** "I'd use micro-frontends only when team independence is the bottleneck — typically 5+ teams with different release cadences. For a smaller org, a well-structured monolith with clear module boundaries is faster and simpler. If we do go micro-frontends, I'd use Module Federation so teams share React as a singleton and can deploy without coordinating."

---

## When to Use (and Not Use)

| Scenario | Recommendation |
|----------|----------------|
| 5+ teams, independent deployments | ✅ Strong fit |
| Different tech stacks per domain | ✅ Strong fit |
| Teams need separate CI/CD pipelines | ✅ Strong fit |
| 1–3 teams, shared codebase | ❌ Use a modular monorepo |
| MVP or startup | ❌ Premature — adds too much overhead |
| Tightly coupled UI (shared state everywhere) | ❌ Wrong tool |

---

## Implementation Approaches

| Approach | Independence | Complexity | Best For |
|----------|--------------|------------|----------|
| **Build-time** (npm packages) | Low — coupled deploys | Low | 2–3 teams |
| **Runtime JS** (Module Federation) | High | Medium | 5+ teams, modern apps |
| **iframes** | Highest | Low | Legacy system integration |
| **Web Components** | High | Medium | Mixed tech stacks |

---

## Module Federation (Webpack 5)

Each app exposes components. The host loads them at runtime without a shared build step.

```typescript
// remote/webpack.config.ts — Product team
import { ModuleFederationPlugin } from "webpack/lib/container/ModuleFederationPlugin";

const config = {
  plugins: [
    new ModuleFederationPlugin({
      name: "productApp",
      filename: "remoteEntry.js",
      exposes: {
        "./ProductList": "./src/ProductList",
        "./ProductDetail": "./src/ProductDetail",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true },
      },
    }),
  ],
};

// host/webpack.config.ts — Shell / Container app
const hostConfig = {
  plugins: [
    new ModuleFederationPlugin({
      name: "host",
      remotes: {
        productApp: "productApp@https://products.example.com/remoteEntry.js",
        checkoutApp: "checkoutApp@https://checkout.example.com/remoteEntry.js",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
  ],
};
```

```typescript
// Host — lazy-loads remote component at runtime
import React from "react";

const ProductList = React.lazy(() => import("productApp/ProductList"));

function App() {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <ProductList />
    </React.Suspense>
  );
}
```

---

## Cross-App Communication

Micro-frontends should be loosely coupled. Prefer browser-native mechanisms over shared libraries.

```typescript
// Custom Events — no shared library needed
// In Product app
function addToCart(productId: string, quantity: number): void {
  window.dispatchEvent(
    new CustomEvent("cart:item-added", { detail: { productId, quantity } })
  );
}

// In Cart app
window.addEventListener("cart:item-added", (event: Event) => {
  const { productId, quantity } = (event as CustomEvent).detail;
  cartStore.addItem(productId, quantity);
});

// Shared state via URL (navigation events)
// Works across any framework
function navigateToProduct(id: string): void {
  history.pushState({}, "", `/products/${id}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
```

---

## Shared Dependencies

React must be a singleton. Duplicate React instances break hooks.

```typescript
// ✅ Correct — singleton ensures one React instance
shared: {
  react: {
    singleton: true,
    requiredVersion: "^18.0.0",  // version range, not exact
  },
}

// ❌ Wrong — host and remote each load their own React
// (no shared config → hooks throw on cross-app component use)
```

---

## Deployment Architecture

```text
CDN / Edge
├── host.example.com      → Shell app (routes, nav, auth)
│     remoteEntry.js      → Module Federation manifest
│
├── products.example.com  → Product team app
│     remoteEntry.js
│
└── checkout.example.com  → Checkout team app
      remoteEntry.js

Each team: separate repo → separate CI/CD → separate CDN origin
Container app references remotes by URL → teams deploy independently
```

---

## Common Mistakes

❌ **Micro-frontends for a small team** — the coordination overhead exceeds the benefit  
❌ **Shared global state** — if teams need shared state constantly, the domain split is wrong  
❌ **Different React versions** — always enforce `singleton: true` for shared React  
❌ **No error boundaries around remote apps** — one failing remote should not crash the shell

**Key insight:**

> Micro-frontends solve an organizational problem, not a technical one. If your team isn't large enough that coordination is the bottleneck, a well-structured monorepo gives you all the code-sharing benefits at a fraction of the operational cost.

---
[← Back to SystemDesign](../README.md)
