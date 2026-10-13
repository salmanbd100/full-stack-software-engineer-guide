---
sourceHash: "a79171aef5ef33818c61e58a7a2d5bcfe05196efd3e23fb789b3ba0610c97d6e"
title: "Design System, Dependency ও Upgrade"
translatedAt: "2026-10-12T12:15:01.073Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Design System, Dependency ও Upgrade {#ch-design-systems-at-scale}

> এমন shared code publish করুন যা চল্লিশটি team গ্রহণ করতে পারে, আর বাকি সবার code-এর পাশাপাশি নিজের codebase-কে upgrade করার মতো অবস্থায় রাখুন।

**এই অধ্যায়ে:** token, component আর theming · যে code আপনি publish করেন তার versioning · যে code আপনি ব্যবহার করেন তার দাম · নিরাপদ update-গুলো automate করা · একটি major-কে migration হিসেবে চালানো

## 💡 মূল ধারণা

প্রতিটি frontend shared code-এর একটি শিকলের মাঝখানে বসে থাকে। এর কিছুটা আপনি publish করেন, যেমন একটি design
system। এর অনেক বেশি অংশ আপনি ব্যবহার করেন, যেমন React, একটি router আর একটি form library। দুই দিকই একটি নিয়ম মানে:
**অন্য পক্ষ আপনার contract-এর ওপর নির্ভর করে, আর সেই contract হলো version number।**

একটি design system brand বা focus-style-এর একটি পরিবর্তন একবারে করে দেয়, চল্লিশবার নয়। এটা ব্যর্থ হয় যখন কেউ
এতে upgrade করে না, অথবা যখন এটা migration-এর কোনো পথ না দিয়ে team-গুলোকে ভেঙে দেয়।

ব্যবহারকারীর দিকে, একটি upgrade-এর খরচ ঠিক হয় **আপনি কতদিন অপেক্ষা করেছেন** তা দিয়ে, diff-এর আকার দিয়ে নয়। React-এর
একটি minor, যে সপ্তাহে আসে সেই সপ্তাহেই নিলে, শুধু একটি lockfile পরিবর্তন। তিন বছর পরে সেটা আসে একটি bundler major
আর চারটি পরিত্যক্ত package সঙ্গে নিয়ে। Senior-দের দক্ষতা হলো upgrade-গুলোকে ছোট রাখা, নিয়মিত রাখা, আর কখনো সব
একসাথে জমতে না দেওয়া।

## কীভাবে কাজ করে

একটি design system-এর তিনটি স্তর: **token** (value-গুলো), **component** (code) আর **docs** (কখন কোনটা ব্যবহার
করবেন)। Token-ই একমাত্র স্তর যা native app আর email template-ও ব্যবহার করতে পারে।

### Design token

Token design-এর সিদ্ধান্তগুলোকে data হিসেবে রাখে। **Primitive** token-এর নাম হয় সেটা কী, তা দিয়ে। **Semantic**
token-এর নাম হয় সেটা কীসের জন্য, তা দিয়ে।

**Primitive থেকে semantic তৈরি হয়, আর component শুধু semantic দেখে:**

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

একটি sub-brand বা high-contrast theme-এর জন্য আপনি `actionPrimary`-কে অন্য একটি primitive-এর দিকে ঘুরিয়ে দিতে
পারেন। যে component সরাসরি `blue500`-কে reference করে, সেটাকে একেবারেই re-theme করা যায় না।

### Component contract আর theming

একজন consumer **props**-এর ওপর নির্ভর করে, markup-এর ওপর নয়। Surface ছোট আর typed রাখুন। Accessible behaviour
component-এর ভেতরেই রাখুন, যাতে কোনো consumer সেটা ভুলে যেতে না পারে।

**একটি button, যার accessibility component-এর ভেতরেই থাকে:**

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

`ButtonHTMLAttributes` extend করলে consumer-রা `type`, `form` আর `onFocus` বিনা খরচে পেয়ে যায়। Theme semantic
token বদলায়, component code কখনো নয়। CSS custom property এটা কোনো re-render ছাড়াই করে: `:root` light theme ধরে রাখে
আর `[data-theme="dark"]` সেটাকে override করে। React context-এ রাখা theme বদলালে প্রতিটি themed component re-render
হয়।

### যে code আপনি publish করেন তার versioning

একটি design system হলো একটি published package, যার একটি API আছে। Semantic versioning-ই contract, আর একটি major
version-এর তিনটি জিনিস লাগে, নইলে team-রা সেটা নেবে না।

| Version bump | অর্থ | Consumer-দের প্রতি আপনার দায় |
| ------------ | ----- | ---------------------- |
| Patch | Bug fix, API-তে কোনো পরিবর্তন নেই | কিছু না |
| Minor | নতুন component বা নতুন optional prop | Changelog-এ একটি entry |
| Major | Prop-এর নাম বদল, component সরানো, default বদল | একটি migration guide, একটি codemod, আর একটি deprecation period |

React থাকবে `peerDependencies`-এ, যাতে tree-তে consumer-এর copy-টিই একমাত্র React হয়।
[Chapter ?? — Micro-Frontend](#ch-micro-frontends) একই singleton নিয়মের মুখোমুখি হয় অন্য দিক থেকে।

### যে code আপনি ব্যবহার করেন তার দাম

একটি dependency হলো অন্য কারো release schedule অনুসরণ করার একটি স্থায়ী প্রতিশ্রুতি। প্রতিটি package একটি tier-এ
পড়ে, আর প্রতিটি tier-এর policy আলাদা।

| Tier | উদাহরণ | বদলানোর খরচ | Policy |
| ---- | -------- | ---------------- | ------ |
| **Framework** | React, router, bundler, Node | কয়েক মাস | কখনো এক major-এর বেশি পিছিয়ে পড়বেন না |
| **Load-bearing** | Data fetching, form, chart, auth SDK | কয়েক সপ্তাহ | Wrap করুন, যাতে বদলাতে গেলে একটি file-এ হাত পড়ে |
| **Leaf utility** | Date formatting, `clsx` | কয়েক ঘণ্টা | Automatically update করুন, অথবা মুছে ফেলুন |
| **আপনার নিজের** | Design system, shared config | আপনার নিয়ন্ত্রণে | ওপরের versioning contract মেনে চলুন |

ঝামেলা বাধায় মাঝের tier। যে form library কেউ wrap করেনি, সেটা প্রতিটি screen-এ ঢুকে পড়ে। বাস্তবে সেটা একটি
framework হয়ে যায়, কিন্তু framework-এর কোনো support guarantee ছাড়াই।

**একটি load-bearing dependency wrap করুন, যাতে ক্ষতির পরিধি একটি file-এ সীমিত থাকে:**

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

এখন দুশো call site নির্ভর করে `AnalyticsEvent`-এর ওপর, যেটা আপনার নিজের। Vendor বদলালে শুধু একটি file নতুন করে লিখতে
হয়।

### নিরাপদ update-গুলো automate করা

Patch আর minor update-ই সংখ্যায় সবচেয়ে বেশি, কিন্তু ঝুঁকিতে সবচেয়ে কম। হাতে review করলে এগুলো জমে যায়। তাই যা কিছু
non-breaking, সব automate করুন, group করুন, আর major-গুলো একজন মানুষের কাছে পাঠান।

**একটি Renovate policy, যা update type আর dependency type দেখে route করে:**

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

Dev dependency production-এ পৌঁছাতে পারে না, তাই এগুলো group করলে ত্রিশটি pull request একটিতে নেমে আসে।
Release-age delay supply-chain ঝুঁকি সীমিত রাখে ([Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions))।

> ⚠️ **যা বদলাতে থাকে:** এগুলো Renovate 41-এর configuration key, আর Dependabot তার grouping option-গুলো অন্যভাবে
> লেখে। টেকসই নীতি হলো, automation সিদ্ধান্ত নেয় **update type আর dependency type** দেখে, আর automerge তখনই নিরাপদ
> যখন test suite সেটাকে আটকে রাখে। বর্তমান key-এর নামগুলো যাচাই করে নিন।

### একটি major-কে migration হিসেবে চালানো

একটি framework major একটি project, শুধু একটি bump নয়। তিনটি অভ্যাস দুই সপ্তাহের একটি migration-কে একটি পরিত্যক্ত
branch থেকে আলাদা করে:

- **Code লেখার আগে peer dependency audit করুন।** পুরনো major-এ pin করা একটি unmaintained package সবকিছু আটকে দেয়।
  সেটা প্রথম দিনেই খুঁজে বের করুন, তৃতীয় সপ্তাহে নয়।
- **ধাপে ধাপে land করুন।** একটি route-এ, একটি flag-এর পেছনে, বা একটি workspace package-এ ship করুন। সব-বা-কিছুই-না
  ধরনের branch যত দ্রুত এগোয়, তার চেয়ে দ্রুত conflict জমায়।
- **Cleanup-এর জন্য সময় রাখুন।** "অস্থায়ী" shim-এর কারণেই একটি codebase বছরের পর বছর একই library-র দুটি version
  চালায়।

তারপর upgrade debt-কে একটি সংখ্যা দিন। Track করুন **কত major পিছিয়ে**, **dependency-র median বয়স**, আর **যেসব direct
dependency-র 18 মাসে কোনো release নেই**। এগুলো error budget-এর পাশে রাখুন, যেখানে এগুলোর জন্য বাজেট মেলে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | যা করবেন | কেন |
| --------- | ------- | --- |
| একটি product, একটি team | একটি shared components folder | Published package বাড়তি বোঝা |
| কয়েকটি product বা brand | একটি published package, token set হিসেবে theme | একটি পরিবর্তন সব জায়গায় পৌঁছায় |
| Design language এখনো বদলাচ্ছে | আগে token ship করুন, component পরে | Value বদলানো সস্তা; component নয় |
| যেকোনো dependency-র patch বা minor | Automate করুন | Review-এর খরচ ঝুঁকির চেয়ে বেশি |
| Framework major, দুটি পিছিয়ে | Feature-এর কাজ থামিয়ে এটা schedule করুন | প্রতিটি নতুন release ফাঁক আরো বাড়ায় |
| বড় একটি unmaintained dependency | Wrap করুন, তারপর বদলানোর পরিকল্পনা করুন | বড় package-এর fork চিরস্থায়ী হয়ে যায় |

## সাধারণ ভুল

❌ **Component-এ primitive token reference করা।** একটি button-এ `blue500` থাকা মানে button-টিকে re-theme করা যাবে না।
✅ Component শুধু semantic token পড়ে। Semantic token primitive-এর দিকে নির্দেশ করে।

❌ **Accessibility-কে consumer-এর কাজ ধরে নেওয়া।** যে `Dialog` focus trap করে না, সেটা প্রতিটি app-এ ভাঙা অবস্থায় ship হয়।
✅ Focus, keyboard handling আর role component-এর ভেতরে থাকে, আর সেখানেই test করা হয়।

❌ **Minor version-এ breaking change।** একটি prop-এর নাম বদলালে প্রতিটি consumer ভেঙে যায়, আর upgrade-এর ওপর আস্থা নষ্ট হয়।
✅ Major version, deprecation period, codemod।

❌ **তিন মাস পরপর একটি "dependency week"।** Upgrade একসাথে জমিয়ে করলে সেই coupling আবার তৈরি হয়, যা এগুলোকে দামি করে।
✅ Automation দিয়ে নিয়মিত ছোট update, আর প্রতিটি major আলাদা করে schedule করা।

❌ **Pipeline সবুজ হলেই upgrade শেষ ধরে নেওয়া।** Shim আর skip করা test তখনো রয়ে গেছে।
✅ প্রতিটি migration একটি cleanup pull request দিয়ে শেষ করুন, যা shim-গুলো নাম ধরে মুছে দেয়।

## 🔑 মূল শিক্ষা

- একটি design system হলো token, component আর docs, আর component শুধু semantic token দেখতে পারে।
- Published API হলো props, তাই semantic versioning আর একটি migration path মিলেই আসল contract।
- Upgrade-এর খরচ ঠিক হয় আপনি কতদিন অপেক্ষা করেছেন তা দিয়ে, পরিবর্তনের আকার দিয়ে নয়।
- প্রতিটি dependency-র একটি tier আছে, আর leaf utility-র ওপরের যেকোনো কিছু আপনার নিজের wrapper-এর পেছনে থাকা উচিত।
- Patch automerge করা তখনই যুক্তিসঙ্গত, যখন merge আটকে রাখে test suite।

## Interview-এর প্রশ্ন

**Q: চল্লিশটি team, যাদের প্রত্যেকের নিজস্ব component আছে, তাদের মধ্যে আপনি কীভাবে একটি design system চালু করবেন?**

একবারে সব নয়। আগে token ship করুন CSS variable হিসেবে, কারণ team-রা এক বিকেলেই এগুলো গ্রহণ করতে পারে, আর এগুলো
colour আর spacing-এর অমিল ঠিক করে দেয়। তারপর সবচেয়ে বেশি ব্যবহৃত component-গুলো একটি একটি করে publish করুন: button,
input, dialog। Team-রা migrate করে component ধরে, app ধরে নয়। একবারে সব বদলের জন্য চল্লিশটি team-কে একই sprint বেছে
নিতে হয়, তাই সেটা কখনো ঘটে না।

**Q: আপনার সবচেয়ে বেশি ব্যবহৃত component-এর একটি prop-এর নাম বদলাতে হবে। আপনি এটা কীভাবে ship করবেন?**

পুরো একটি major version ধরে দুটি নামই গ্রহণ করুন। পুরনোটি development-এ warning দেয় আর type-এ `@deprecated` বহন করে,
যাতে editor সেটা চিহ্নিত করে। একটি codemod আর একটি migration guide ship করুন, আর আগের major-এর জন্য একটি support
window ঘোষণা করুন। একটি পরিষ্কার break technically ঠিক, কিন্তু তাতে আপনার system fork হয়ে যায়।

**Q: কখন একটি design system ভুল বিনিয়োগ?**

যখন design language এখনো বদলাচ্ছে। Component সিদ্ধান্তগুলোকে code-এ বেঁধে ফেলে, তাই আগেভাগে বানালে team-রা প্রথম
version-কে পাশ কাটানোর পরে সেগুলো আবার বানাতে হয়। Token আগে ship করুন, কারণ value বদলানো সস্তা। Language স্থির করার
মতো হলে তবেই component বানান।

**Q: একটি team বলছে তারা React upgrade করতে পারবে না, কারণ "অনেক কিছু ভেঙে যাবে"। আপনি কীভাবে আসল অবস্থা বের করবেন?**

Code দিয়ে নয়, peer-dependency audit দিয়ে শুরু করুন। দেখুন কোন direct dependency-গুলোর target major-এর জন্য release
আছে। সাধারণত দুই-তিনটি package সত্যিই আটকায়, বাকিটা codemod-এর কাজ। এতে একটি সীমাহীন ভয় নাম দেওয়া কিছু task-এর
তালিকায় পরিণত হয়, যেগুলো schedule করা যায়।

## এরপর কী পড়বেন

- [Chapter ?? — Micro-Frontend](#ch-micro-frontends) — যেখানে একটি shared system-ই পাঁচটি team-কে আলাদা পথে যেতে দেয় না
- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) — lockfile, provenance আর সেই supply-chain control, যার ওপর automation নির্ভর করে
- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — একটি dependency-র একটিমাত্র version রাখা আদৌ সম্ভব কিনা
