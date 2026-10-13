---
sourceHash: "239b6475bfdcab11afd5809cf2ba34b961ec70a9cddeb1747e52ed203dcd24aa"
title: "Micro-Frontend"
translatedAt: "2026-10-12T12:18:19.970Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Micro-Frontend {#ch-micro-frontends}

> বলুন কখন স্বাধীন deploy coordination-এর খরচের যোগ্য, আর কখন নয়।

**এই অধ্যায়ে:** এটা আসলে যে সমস্যা সমাধান করে · integration-এর চারটি পদ্ধতি · Module Federation · shared dependency · app-গুলোর মধ্যে যোগাযোগ · ব্যর্থতার ধরন

## 💡 মূল ধারণা

Micro-frontend user-এর সামনের একটি application-কে টুকরো টুকরো করে, যেগুলো আলাদা আলাদা team বানায়, test করে আর
**নিজেদের schedule-এ deploy করে**। একটি shell application runtime-এ টুকরোগুলো জোড়া লাগায়, যাতে user একটিই product
দেখেন।

Interview-এ এ ব্যাপারে স্পষ্ট থাকুন: এটা একটি **প্রতিষ্ঠানগত** সমস্যা সমাধান করে, technical সমস্যা নয়। একটি
micro-frontend app-কে দ্রুত, ছোট বা বোঝা সহজ করে না। তিনটিকেই আরও খারাপ করে। এর বিনিময়ে যা পান, তা হলো checkout team
search team-এর release train-এর জন্য অপেক্ষা না করে মঙ্গলবারেই ship করতে পারে। কেউ যদি কোনো release train-এর জন্য
অপেক্ষা না করে, আপনি কিছু না পেয়েই খরচ দিচ্ছেন।

## কীভাবে কাজ করে

### Integration-এর চারটি পদ্ধতি

| পদ্ধতি | স্বাধীনতা | খরচ | মানায় |
| -------- | ------------ | ---- | ---- |
| **Build-time** — প্রতিটি app একটি npm package publish করে | কম। Shell-কে আবার build আর redeploy করতে হয় | কম | দুই-তিনটি team, যারা জোড়া release মেনে নেয় |
| **Runtime JavaScript** — Module Federation, single-spa, import map | বেশি। Remote deploy করুন, shell সেটা তুলে নেয় | মাঝারি | সত্যিকারের স্বাধীনতার জন্য default |
| **iframe** | সবচেয়ে বেশি। CSS, JS আর global-এর পূর্ণ বিচ্ছিন্নতা | বানাতে কম, ব্যবহারে বেশি | একটি legacy বা third-party app মুড়ে রাখা |
| **Web Component** | বেশি | মাঝারি | একটি shell-এর নিচে মিশ্র framework |

Build-time integration-কেই সবচেয়ে বেশি ভুল নাম দেওয়া হয়। `@acme/checkout-ui` publish করে shell থেকে সেটা ব্যবহার
করা হলো বাড়তি কয়েকটি ধাপসহ একটি shared component library। পরিবর্তনটি user-এর কাছে পৌঁছাতে shell-কে এখনো redeploy
করতে হয়, তাই deploy-এর স্বাধীনতা কখনো আসে না।

### Module Federation

Module Federation একটি build-কে runtime-এ, URL দিয়ে, অন্য একটি build থেকে code load করতে দেয়। প্রতিটি remote ঘোষণা
করে সে কী expose করে, আর shell ঘোষণা করে remote-গুলো কোথায় পাওয়া যাবে। Build-এর সময় কোনো পক্ষেরই অন্যটিকে লাগে না।

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

**Shell — একই plugin-এর আকৃতি, `exposes`-এর জায়গায় `remotes` আর একই `shared` block সহ:**

```typescript
// shell/webpack.config.ts
const remotes = {
  checkoutApp: "checkoutApp@https://checkout.example.com/remoteEntry.js",
  searchApp: "searchApp@https://search.example.com/remoteEntry.js",
};
```

**একটি remote ব্যবহার করা, এমন দুটি guard সহ, যেগুলো ঐচ্ছিক নয়:**

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

> ⚠️ **যা বদলাতে থাকে:** Module Federation একটি Webpack 5 feature। Rspack এটা native-ভাবে implement করে, আর Vite
> একটি plugin দিয়ে এটা cover করে। Federation 1.x আর 2.x জুড়ে runtime API বদলেছে। টেকসই নীতিটি হলো, runtime
> integration load-এর সময় URL দিয়ে code resolve করে। এতে অন্য একটি team-এর deploy আপনার একটি network dependency
> হয়ে যায়। Plugin-এর নামগুলো বদলাবে।

### single-spa বিকল্প

Module Federation **module** জোড়া দেয়। single-spa জোড়া দেয় **application**। এর root config `registerApplication`
দিয়ে একটি route predicate-কে একটি bundle-এর সাথে map করে। প্রতিটি application `bootstrap`, `mount` আর `unmount`
lifecycle export করে, আর route বদলানোর সাথে root সেগুলো call করে।

বিনিময়টা হলো জোড়া দেওয়ার একক। single-spa routing আর application lifecycle-এর মালিক, তাই একটি shell-এর নিচে মিশ্র
framework রাখা সহজ। কিন্তু একটি remote হলো পুরো একটি screen। Remote-গুলোকে একটি page-এর ভেতরে মিশে থাকতে হলে
Federation বাছুন, আর প্রতিটি remote একটি route-এর মালিক হলে single-spa।

### Shared dependency

React-এ `singleton: true` কোনো optimisation নয়। একটি page-এ React-এর দুটি copy মানে দুটি স্বাধীন hook dispatcher,
আর এদের মাঝে পার হওয়া যেকোনো component throw করে।

`shared` বাদ দিলে shell আর প্রতিটি remote নিজের নিজের React load করে। একটি remote component একটি shell context-এর ভেতরে
render হওয়ামাত্র hook throw করে। Stack trace কোনো team-এর code-কেই দেখায় না।

এখান থেকে এমন একটি সীমাবদ্ধতা আসে, যেটা মানুষ কম গুরুত্ব দেয়: প্রতিটি remote-কে একটি compatible React major-এ থাকতে
হবে। Micro-frontend আপনাকে স্বাধীন **deploy** দেয়, স্বাধীন **upgrade** নয়। এতে
[Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)-এর version policy একটি
পূর্বশর্ত হয়ে যায়, বাড়তি সৌজন্য নয়।

### App-গুলোর মধ্যে যোগাযোগ

Browser যতটা ছোট রাখতে দেয়, চুক্তিটা ততটাই ছোট রাখুন। এর চেয়ে সমৃদ্ধ যেকোনো কিছু একটি shared library হয়ে যায়, আর
একটি shared library সেই deploy-গুলোকে আবার জুড়ে দেয়, যেগুলো আপনি এইমাত্র আলাদা করলেন।

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

Cart remote `cart:item-added` শোনে, আর `event.detail`-কে আবার `CartItemAdded`-এ cast করে। ওই interface-ই পুরো চুক্তি,
আর এটাই একমাত্র জিনিস, যার একটি version নিয়ে দুই team-কে একমত হতে হয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | রায় |
| --------- | ------- |
| পাঁচ বা তার বেশি team, প্রত্যেকে একটি shared release train-এ আটকে | ✅ যে ক্ষেত্রের জন্য এটা বানানো |
| সত্যিই আলাদা release cadence-এর domain | ✅ ভালো মানায় |
| একটি legacy app, যেটা screen ধরে ধরে শুষে নিতে হবে | ✅ Federation নয়, iframe বা Web Component ব্যবহার করুন |
| একটি repository-তে এক থেকে তিনটি team | ❌ একটি monorepo ব্যবহার করুন — [Chapter ?? — Monorepo](#ch-monorepos) দেখুন |
| Startup বা MVP | ❌ অকালপক্ব; coordination-এর বাড়তি খরচ লাভকে ছাড়িয়ে যায় |
| যে screen-গুলো সারাক্ষণ state share করে | ❌ Domain-এর সীমানা ভুল জায়গায় |

শেষ row-টাই অনুশীলন করার মতো। দুটি micro-frontend-কে হয়তো প্রতিটি interaction-এ একে অপরের state দেখতে হয়। তাহলে
এরা একটিই application, ভুল জোড়া বরাবর কাটা। আরও integration-এর যন্ত্রপাতির দিকে হাত বাড়ানোর আগে জোড়াটা ঠিক করুন।

## সাধারণ ভুল

❌ **Code reuse-এর জন্য এটা গ্রহণ করা।** Reuse-এর জন্যই তো package registry আর monorepo আছে।
✅ শুধু তখনই গ্রহণ করুন, যখন deploy-এর স্বাধীনতাই সেই বাধা, যার নাম আপনি বলতে পারেন।

❌ **একটি remote-এর চারপাশে কোনো error boundary নেই।** যে remote load হতে ব্যর্থ হয়, সে পুরো shell-কে সাথে নিয়ে পড়ে।
✅ প্রতিটি remote-কে একটি ব্যবহারযোগ্য fallback সহ error boundary-তে মুড়ে দিন। Load ব্যর্থতাকে প্রত্যাশিত ধরে নিন।

❌ **প্রতিটি remote-এ আলাদা framework major।** স্বাধীন deploy মানে স্বাধীন React version নয়।
✅ আগেভাগেই একটি shared-dependency version policy-তে একমত হোন, আর CI-তে সেটা বলবৎ করুন।

❌ **Remote-গুলোর মধ্যে একটি shared state library।** দুটি remote একই store import করামাত্র, store-এর আকৃতির মধ্য দিয়ে
এদের deploy আবার জুড়ে যায়।
✅ URL আর typed custom event দিয়ে যোগাযোগ করুন। চুক্তিটা এতটা সরু রাখুন, যাতে version করা যায়।

❌ **কোনো shared design system নেই।** স্বাধীন team-গুলো এক quarter-এর মধ্যে পাঁচ রকম button বানিয়ে ফেলে।
✅ Token আর component একটি versioned package হিসেবে ship করুন — [Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) দেখুন।

## 🔑 মূল শিক্ষা

- Micro-frontend deploy-এর স্বাধীনতা দেয়, আর বিনিময়ে নেয় bundle size, latency আর debug করার সহজতা।
- Build-time integration হলো বাড়তি কয়েকটি ধাপসহ একটি component library। স্বাধীনতার জন্য runtime loading লাগে।
- Framework-এ `singleton: true` বাধ্যতামূলক, আর এর মানে প্রতিটি remote একই framework major share করে।
- App-গুলোর মধ্যকার চুক্তি URL আর typed custom event-এ সীমিত রাখুন, নইলে deploy আবার জুড়ে যায়।
- প্রতিটি remote একটি network dependency, তাই প্রতিটি remote-এর একটি error boundary আর একটি fallback লাগে।

## Interview-এর প্রশ্ন

**Q: কখন আপনি micro-frontend ফিরিয়ে দেবেন?**

যখনই কষ্টটা code duplication বা অসংগত UI, কারণ দুটির কোনোটাই deploy-এর সমস্যা নয়। Shared component package সহ একটি
monorepo দুটিই সমাধান করে, operational খরচের সামান্য অংশে। একমাত্র যে জিনিসটা শুধু micro-frontend-ই সমাধান করে, তা
হলো release-এর জন্য team-গুলোর একে অপরের অপেক্ষায় থাকা। কেউ অপেক্ষা না করলে উত্তর হলো না।

**Q: Remote-গুলো জুড়ে React-কে কেন singleton হতে হবে, আর না হলে কী ভাঙে?**

React hook resolve করে একটি module-level dispatcher দিয়ে, যেটা থাকে component-টি যে copy render করেছে তার ভেতরে। দুটি
copy load হলে, একটি copy-র component অন্য copy-র মালিকানার tree-র ভেতরে render হতে পারে। এটা একটি null dispatcher পড়ে
আর throw করে। `singleton: true` loader-গুলোকে একটিমাত্র instance-এ একমত করায়। এ কারণেই remote-গুলো incompatible React
major-এ থাকতে পারে না।

**Q: Production-এ একটি remote down। User কী দেখেন?**

Shell-এর error boundary যা render করে। কোনো boundary না থাকলে একটি ফাঁকা page, কারণ ব্যর্থ একটি dynamic import render-এর
সময় reject করে। এর পেছনের design প্রশ্নটা হলো, কোন remote-গুলো ভার বহন করে। Navigation আর auth-কে shell-এ থাকতে হবে।
একটি recommendation panel কিছুই না দেখিয়ে নেমে যাওয়া উচিত, আর page-এর বাকিটাকে কাজ করতে দেওয়া উচিত।

**Q: দুটি micro-frontend কীভাবে current user share করে?**

Shell authentication-এর মালিক, আর যে remote-গুলো mount করে, তাদের কাছে resolve করা user-কে props বা context হিসেবে পাঠায়।
নয়তো remote-গুলো একটি token পড়ে, যেটা shell একটি সুপরিচিত জায়গায় রেখেছে। প্রতিটি remote-এর নিজের auth flow চালানো উচিত
নয়। তাহলে user-কে দুবার sign in করতে হবে, আর session-expiry-র আচরণ প্রতিটি remote-এ আলাদা হবে। Remote-এ নয়, shell-এ
থাকা উচিত এমন জিনিসের সবচেয়ে স্পষ্ট উদাহরণ হলো auth।

## এরপর কী পড়বেন

- [Chapter ?? — Frontend Architecture Pattern](#ch-frontend-architecture-patterns) — আগে চেষ্টা করার মতো সস্তা সীমানাগুলো
- [Chapter ?? — Monorepo](#ch-monorepos) — যখন সমস্যাটা deploy নয়, code share করা, তখনকার উত্তর
- [Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) — স্বাধীন team-গুলোকে দেখতে সামঞ্জস্যপূর্ণ রাখে যা
