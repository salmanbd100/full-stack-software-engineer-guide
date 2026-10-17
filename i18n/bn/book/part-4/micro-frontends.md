---
sourceHash: "239b6475bfdcab11afd5809cf2ba34b961ec70a9cddeb1747e52ed203dcd24aa"
title: "Micro-Frontend"
translatedAt: "2026-10-17T01:36:33.292Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Micro-Frontend {#ch-micro-frontends}

> আলাদা আলাদা deploy কখন coordination-এর খরচের যোগ্য, আর কখন নয়, তা বলতে পারুন।

**এই অধ্যায়ে:** এটা আসলে কোন সমস্যা মেটায় · integration-এর চারটি পদ্ধতি · Module Federation · shared dependency · app-এর মধ্যে যোগাযোগ · কোথায় কোথায় ভাঙে

## 💡 মূল ধারণা

Micro-frontend মানে user যে একটি application দেখেন, সেটাকে কয়েকটি টুকরোয় ভাগ করা। প্রতিটি টুকরো আলাদা team বানায়,
test করে, আর **নিজের সময়মতো deploy করে**। একটি shell application runtime-এ টুকরোগুলো জোড়া দেয়, যাতে user একটিই
product দেখেন।

Interview-এ এটা পরিষ্কার করে বলুন: micro-frontend একটি **organisation-এর** সমস্যা মেটায়, technical সমস্যা নয়। এতে
app দ্রুত হয় না, ছোট হয় না, বোঝাও সহজ হয় না। বরং তিনটিই খারাপ হয়। বিনিময়ে যা পান, তা হলো checkout team মঙ্গলবারেই
ship করতে পারে, search team-এর release train-এর জন্য বসে থাকতে হয় না। কেউ যদি কোনো release train-এর জন্য অপেক্ষাই না
করে, তবে আপনি খরচটা দিচ্ছেন শুধু শুধু।

## কীভাবে কাজ করে

### Integration-এর চারটি পদ্ধতি

| পদ্ধতি | স্বাধীনতা | খরচ | কোথায় মানায় |
| -------- | ------------ | ---- | ---- |
| **Build-time** — প্রতিটি app একটি npm package publish করে | কম। Shell-কে আবার build আর deploy করতে হয় | কম | দুই-তিনটি team, যারা একসঙ্গে বাঁধা release মেনে নিতে পারে |
| **Runtime JavaScript** — Module Federation, single-spa, import map | বেশি। Remote deploy করলেই shell সেটা পেয়ে যায় | মাঝারি | সত্যিকারের স্বাধীনতার জন্য default |
| **iframe** | সবচেয়ে বেশি। CSS, JS আর global পুরোপুরি আলাদা | বানাতে কম, ব্যবহারে বেশি | পুরনো বা third-party app মুড়ে রাখতে |
| **Web Component** | বেশি | মাঝারি | এক shell-এর নিচে নানা framework |

সবচেয়ে বেশি ভুল নামে ডাকা হয় build-time integration-কে। `@acme/checkout-ui` publish করে shell থেকে ব্যবহার করা আসলে
একটি shared component library, শুধু কয়েকটি বাড়তি ধাপসহ। বদলটা user-এর কাছে পৌঁছাতে shell-কে তবুও আবার deploy করতে
হয়, তাই deploy-এর স্বাধীনতা কখনো আসেই না।

### Module Federation

Module Federation দিয়ে একটি build আরেকটি build-এর code runtime-এ load করতে পারে, URL দিয়ে। প্রতিটি remote জানিয়ে দেয়
তার কোন অংশ expose করা হচ্ছে, আর shell জানায় remote-গুলো কোথায় পাওয়া যাবে। Build-এর সময় কোনো পক্ষেরই অন্যজনকে দরকার হয় না।

**Remote — checkout team-এর build:**

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

**Shell — একই plugin-এর গঠন, শুধু `exposes`-এর জায়গায় `remotes` আর একই `shared` block:**

```typescript
// shell/webpack.config.ts
const remotes = {
  checkoutApp: "checkoutApp@https://checkout.example.com/remoteEntry.js",
  searchApp: "searchApp@https://search.example.com/remoteEntry.js",
};
```

**Remote ব্যবহার করা, সঙ্গে দুটি guard, যা বাদ দেওয়ার উপায় নেই:**

```tsx
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

> ⚠️ **যা বদলাতে থাকে:** Module Federation হলো Webpack 5-এর feature। Rspack এটা নিজেই implement করে, আর Vite এটা পায়
> একটি plugin দিয়ে। Federation 1.x আর 2.x-এর মধ্যে runtime API বদলেছে। টেকসই নীতি হলো: runtime integration load-এর
> সময় URL দিয়ে code খুঁজে আনে। ফলে অন্য team-এর deploy আপনার জন্য একটি network dependency হয়ে যায়। Plugin-এর নাম
> বদলাবে।

### single-spa বিকল্প

Module Federation জোড়া দেয় **module**। single-spa জোড়া দেয় **application**। এর root config
`registerApplication` দিয়ে একটি route predicate-কে একটি bundle-এর সঙ্গে map করে। প্রতিটি application `bootstrap`,
`mount` আর `unmount` lifecycle export করে, আর route বদলালে root সেগুলো call করে।

পার্থক্যটা হলো কোন একককে জোড়া দেওয়া হচ্ছে। Routing আর application lifecycle-এর মালিক single-spa, তাই এক shell-এর নিচে
নানা framework রাখা সহজ। কিন্তু একটি remote মানে পুরো একটি screen। Remote-গুলোকে একই page-এর ভেতরে মিশে থাকতে হলে
Federation নিন। প্রতিটি remote নিজের route-এর মালিক হলে single-spa।

### Shared dependency

React-এ `singleton: true` কোনো optimisation নয়। এক page-এ React-এর দুটি copy মানে দুটি আলাদা hook dispatcher, আর
যেকোনো component এদের মধ্যে পার হলেই throw করে।

`shared` বাদ দিলে shell আর প্রতিটি remote নিজের নিজের React load করে। Shell-এর context-এর ভেতরে remote component render
হওয়া মাত্র hook throw করে। আর stack trace কোনো team-এর code-ই দেখায় না।

এখান থেকে একটি সীমা আসে, যাকে লোকে ছোট করে দেখে: প্রতিটি remote-কে compatible React major-এ থাকতে হবে।
Micro-frontend আপনাকে আলাদা **deploy** দেয়, আলাদা **upgrade** নয়। তাই
[Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)-এর version policy এখানে পূর্বশর্ত,
বাড়তি সুবিধা নয়।

### App-এর মধ্যে যোগাযোগ

Contract-টা যতটা ছোট রাখা যায়, browser যতটা দেয়, ততটাই রাখুন। এর চেয়ে বড় কিছু হলেই সেটা shared library হয়ে যায়, আর
shared library সেই deploy-গুলোকে আবার বেঁধে ফেলে, যাদের আপনি এইমাত্র আলাদা করলেন।

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

Cart remote `cart:item-added` শোনে, আর `event.detail`-কে আবার `CartItemAdded`-এ cast করে। পুরো contract বলতে ওই
interface-টুকুই, আর দুই team-কে version নিয়ে একমত হতে হয় শুধু এটার ওপরেই।

## কখন ব্যবহার করবেন

| পরিস্থিতি | রায় |
| --------- | ------- |
| পাঁচ বা তার বেশি team, প্রত্যেকে একটি shared release train-এ আটকে | ✅ ঠিক এই কাজের জন্যই এটা বানানো |
| এমন domain, যাদের release-এর ছন্দ সত্যিই আলাদা | ✅ খুব মানায় |
| পুরনো app, যাকে screen ধরে ধরে ভেতরে আনতে হবে | ✅ iframe বা Web Component নিন, Federation নয় |
| এক repository-তে এক থেকে তিনটি team | ❌ Monorepo নিন — দেখুন [Chapter ?? — Monorepo](#ch-monorepos) |
| Startup বা MVP | ❌ সময়ের আগে; coordination-এর বোঝা লাভকে ছাড়িয়ে যায় |
| যে screen-গুলো সারাক্ষণ state ভাগ করে | ❌ Domain boundary ভুল জায়গায় বসানো |

শেষ row-টাই অনুশীলন করে রাখার মতো। দুটি micro-frontend-কে হয়তো প্রতিটি interaction-এ একে অপরের state দেখতে হয়। তাহলে
এরা আসলে একটিই application, ভুল জায়গায় কাটা। আরও integration-এর যন্ত্রপাতি আনার আগে কাটার জায়গাটা ঠিক করুন।

## সাধারণ ভুল

❌ **Code reuse-এর জন্য এটা নেওয়া।** Reuse-এর জন্য আছে package registry আর monorepo।
✅ নিন শুধু তখন, যখন deploy-এর স্বাধীনতাই সেই আটক, যার নাম আপনি বলতে পারেন।

❌ **Remote-এর চারপাশে কোনো error boundary নেই।** যে remote load হতে ব্যর্থ হয়, সেটা পুরো shell-কে সঙ্গে নিয়ে পড়ে।
✅ প্রতিটি remote-কে কাজের মতো fallback-সহ একটি error boundary-তে মুড়ে দিন। Load ব্যর্থ হওয়াকে স্বাভাবিক ঘটনা ধরে নিন।

❌ **প্রতিটি remote-এ আলাদা framework major।** আলাদা deploy মানে আলাদা React version নয়।
✅ শুরুতেই shared dependency-র version policy ঠিক করুন, আর CI-তে সেটা enforce করুন।

❌ **Remote-গুলোর মধ্যে একটি shared state library।** দুটি remote একই store import করা মাত্র store-এর shape দিয়ে তাদের
deploy আবার বাঁধা পড়ে যায়।
✅ যোগাযোগ করুন URL আর typed custom event দিয়ে। Contract এতটা সরু রাখুন, যাতে version দেওয়া যায়।

❌ **কোনো shared design system নেই।** আলাদা আলাদা team এক quarter-এর মধ্যেই পাঁচ রকম button বানিয়ে ফেলে।
✅ Token আর component একটি versioned package হিসেবে ship করুন — দেখুন [Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)।

## 🔑 মূল শিক্ষা

- Micro-frontend দেয় deploy-এর স্বাধীনতা, আর দাম নেয় bundle size, latency আর debug করার সহজতা দিয়ে।
- Build-time integration হলো বাড়তি ধাপসহ একটি component library। স্বাধীনতার জন্য runtime-এ load করা লাগে।
- Framework-এ `singleton: true` বাধ্যতামূলক, আর এর মানে প্রতিটি remote একই framework major-এ থাকে।
- App-এর মধ্যে contract রাখুন শুধু URL আর typed custom event-এ, নইলে deploy আবার বাঁধা পড়ে।
- প্রতিটি remote একটি network dependency, তাই প্রতিটি remote-এর error boundary আর fallback লাগে।

## Interview-এর প্রশ্ন

**Q: কখন micro-frontend-কে না বলবেন?**

যখনই সমস্যাটা code duplication বা অসামঞ্জস্যপূর্ণ UI, কারণ এর কোনোটাই deploy-এর সমস্যা নয়। Shared component package-সহ
একটি monorepo দুটিই মেটায়, operation-এর খরচের সামান্য অংশে। শুধু micro-frontend-ই মেটাতে পারে এমন জিনিস একটিই: release-এর
জন্য team-গুলোর একে অপরের অপেক্ষায় বসে থাকা। কেউ অপেক্ষা না করলে উত্তর হলো না।

**Q: Remote-গুলোর মধ্যে React কেন singleton হতেই হবে, আর না হলে কী ভাঙে?**

React hook resolve করে module-level একটি dispatcher দিয়ে, যেটা থাকে সেই copy-র ভেতরে, যে copy component-টা render করেছে।
দুটি copy load হলে এক copy-র component হয়তো অন্য copy-র tree-র ভেতরে render হয়। তখন সেটা একটি null dispatcher পড়ে, আর
throw করে। `singleton: true` দিলে loader-গুলো একটি instance-এ একমত হয়। এ কারণেই remote-গুলো incompatible React major-এ
থাকতে পারে না।

**Q: Production-এ একটি remote down। User কী দেখেন?**

Shell-এর error boundary যা render করে, তা-ই। Boundary না থাকলে একটি ফাঁকা page, কারণ dynamic import ব্যর্থ হলে render-এর
মধ্যেই reject করে। এর পেছনের design প্রশ্ন হলো কোন remote-গুলো ভার বহন করে। Navigation আর auth থাকতে হবে shell-এ। একটি
recommendation panel ব্যর্থ হলে চুপচাপ কিছুই না দেখিয়ে সরে যাবে, আর বাকি page কাজ করবে।

**Q: দুটি micro-frontend বর্তমান user-কে ভাগ করে নেয় কীভাবে?**

Authentication-এর মালিক shell। যে remote-গুলো shell mount করে, তাদের কাছে resolve করা user-টা পাঠায় props বা context
হিসেবে। নয়তো shell একটি পরিচিত জায়গায় token রেখে দেয়, আর remote-গুলো সেখান থেকে পড়ে। প্রতিটি remote-এর নিজস্ব auth
flow চালানো উচিত নয়। তাহলে user-কে দুবার sign in করতে হবে, আর session-expiry-র আচরণ remote ভেদে আলাদা হবে। কোনটা
remote-এ নয়, shell-এ থাকা উচিত, তার সবচেয়ে পরিষ্কার উদাহরণ auth।

## এরপর কী পড়বেন

- [Chapter ?? — Frontend Architecture Pattern](#ch-frontend-architecture-patterns) — আগে চেষ্টা করার মতো সস্তা boundary-গুলো
- [Chapter ?? — Monorepo](#ch-monorepos) — সমস্যা যখন deploy নয়, code ভাগ করা, তখনকার উত্তর
- [Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) — যা আলাদা আলাদা team-এর UI-কে দেখতে এক রকম রাখে
