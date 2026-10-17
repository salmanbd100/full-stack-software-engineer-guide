---
sourceHash: "a79171aef5ef33818c61e58a7a2d5bcfe05196efd3e23fb789b3ba0610c97d6e"
title: "Design System, Dependency ও Upgrade"
translatedAt: "2026-10-17T01:37:35.489Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Design System, Dependency ও Upgrade {#ch-design-systems-at-scale}

> এমন shared code publish করুন, যা চল্লিশটি team নিতে পারে। আর নিজের codebase-কে বাকি সবার code-এর সঙ্গে upgrade করার মতো রাখুন।

**এই অধ্যায়ে:** token, component আর theming · নিজের publish করা code-এর version · ব্যবহার করা code-এর দাম · নিরাপদ update-গুলো automate করা · major upgrade-কে migration হিসেবে চালানো

## 💡 মূল ধারণা

প্রতিটি frontend shared code-এর একটি শিকলের মাঝখানে বসে থাকে। এর কিছুটা আপনি publish করেন, যেমন design system। আর
অনেক বেশি অংশ আপনি ব্যবহার করেন, যেমন React, একটি router, একটি form library। দুই দিকেই নিয়ম একটি: **অন্য পক্ষ
আপনার contract-এর ওপর নির্ভর করে, আর সেই contract হলো version number।**

Design system থাকলে brand বা focus style-এর বদল চল্লিশবার নয়, একবারই করতে হয়। এটা ব্যর্থ হয় যখন কেউ এতে upgrade
করে না, কিংবা যখন এটা migration-এর পথ না দিয়েই team-গুলোর code ভেঙে দেয়।

ব্যবহারের দিকে, upgrade-এর খরচ ঠিক হয় **আপনি কতদিন অপেক্ষা করেছেন** তা দিয়ে, diff কত বড় তা দিয়ে নয়। React-এর একটি
minor release যে সপ্তাহে আসে, সে সপ্তাহেই নিলে সেটা শুধু lockfile-এর বদল। তিন বছর পরে নিলে সেটা আসে bundler-এর একটি
major আর চারটি পরিত্যক্ত package সঙ্গে নিয়ে। Senior-এর দক্ষতা হলো upgrade-গুলো ছোট রাখা, নিয়মিত করা, আর কখনো সব
একসঙ্গে জমতে না দেওয়া।

## কীভাবে কাজ করে

Design system-এর তিনটি layer: **token** (value), **component** (code) আর **docs** (কখন কোনটা ব্যবহার করবেন)। এর মধ্যে
শুধু token-ই native app আর email template-ও ব্যবহার করতে পারে।

### Design token

Token design-এর সিদ্ধান্তগুলো data হিসেবে রাখে। **Primitive** token-এর নাম হয় সেটা কী, তা দিয়ে। **Semantic** token-এর
নাম হয় সেটা কীসের জন্য, তা দিয়ে।

**Primitive থেকে semantic তৈরি হয়, আর component দেখে শুধু semantic:**

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

কোনো sub-brand বা high-contrast theme-এর জন্য `actionPrimary`-কে অন্য একটি primitive-এর দিকে ঘুরিয়ে দিতে পারেন। কিন্তু
যে component সরাসরি `blue500` ব্যবহার করে, তার theme আর বদলানোই যায় না।

### Component-এর contract আর theming

ব্যবহারকারী নির্ভর করেন **props**-এর ওপর, markup-এর ওপর নয়। Surface ছোট আর typed রাখুন। Accessibility-র আচরণ
component-এর ভেতরেই রাখুন, যাতে কোনো ব্যবহারকারী সেটা ভুলে যেতে না পারেন।

**এমন একটি button, যার accessibility component-এর ভেতরেই থাকে:**

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

`ButtonHTMLAttributes` extend করলে ব্যবহারকারীরা `type`, `form` আর `onFocus` বিনা খরচে পেয়ে যান। Theme বদলায় semantic
token, component-এর code কখনো নয়। CSS custom property দিয়ে এটা হয় কোনো re-render ছাড়াই: `:root`-এ থাকে light theme, আর
`[data-theme="dark"]` সেটাকে override করে। Theme যদি React context-এ রাখা হয়, তবে theme বদলালেই theme ব্যবহার করা
প্রতিটি component re-render হয়।

### নিজের publish করা code-এর version

Design system হলো API-সহ একটি publish করা package। Semantic versioning হলো contract। আর major version-এর সঙ্গে তিনটি
জিনিস লাগে, নইলে team-গুলো সেটা নেবে না।

| Version bump | মানে | ব্যবহারকারীদের যা দিতে হবে |
| ------------ | ----- | ---------------------- |
| Patch | Bug fix, API-তে কোনো বদল নেই | কিছুই না |
| Minor | নতুন component বা নতুন optional prop | Changelog-এ একটি entry |
| Major | Prop-এর নাম বদল, component বাদ, default বদল | Migration guide, একটি codemod, আর deprecation-এর একটি সময়সীমা |

React রাখতে হবে `peerDependencies`-এ, যাতে tree-তে React বলতে থাকে শুধু ব্যবহারকারীর copy-টা।
[Chapter ?? — Micro-Frontend](#ch-micro-frontends) একই singleton নিয়মে পৌঁছায়, অন্য দিক থেকে।

### ব্যবহার করা code-এর দাম

Dependency মানে অন্য কারো release-এর সময়সূচির সঙ্গে তাল রাখার একটি স্থায়ী প্রতিশ্রুতি। প্রতিটি package কোনো একটি
স্তরে পড়ে, আর প্রতিটি স্তরের policy আলাদা।

| স্তর | উদাহরণ | বদলানোর খরচ | Policy |
| ---- | -------- | ---------------- | ------ |
| **Framework** | React, router, bundler, Node | কয়েক মাস | কখনো এক major-এর বেশি পিছিয়ে পড়বেন না |
| **ভার বহনকারী** | Data fetching, form, chart, auth SDK | কয়েক সপ্তাহ | Wrap করুন, যাতে বদলাতে হলে একটি file-এ হাত দিতে হয় |
| **Leaf utility** | Date formatting, `clsx` | কয়েক ঘণ্টা | Automatically update করুন, নয়তো মুছে ফেলুন |
| **নিজের** | Design system, shared config | আপনার নিয়ন্ত্রণে | ওপরের versioning contract মেনে চলুন |

ঝামেলা বাধায় মাঝের স্তরটা। যে form library কেউ wrap করেনি, সেটা প্রতিটি screen-এ ঢুকে পড়ে। বাস্তবে সেটা একটি
framework হয়ে যায়, অথচ framework-এর কোনো support-এর নিশ্চয়তা তাতে নেই।

**ভার বহনকারী dependency wrap করুন, যাতে ক্ষতির সীমা একটি file:**

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

এখন দুশোটি call site নির্ভর করে `AnalyticsEvent`-এর ওপর, যার মালিক আপনি। Vendor বদলালে নতুন করে লিখতে হয় একটি file।

### নিরাপদ update-গুলো automate করা

Update-এর বেশিরভাগই patch আর minor, আর এদের ঝুঁকি সামান্য। হাতে review করলে এগুলো জমে পাহাড় হয়। তাই যা কিছু ভাঙে না,
সব automate করুন, group করুন, আর major-গুলো পাঠান একজন মানুষের কাছে।

**এমন একটি Renovate policy, যা update-এর ধরন আর dependency-র ধরন দেখে পথ ঠিক করে:**

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

Dev dependency production-এ পৌঁছাতে পারে না, তাই এদের group করলে ত্রিশটি pull request একটিতে নেমে আসে। Release-age-এর
দেরিটুকু supply-chain-এর ঝুঁকি কমায় ([Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions))।

> ⚠️ **যা বদলাতে থাকে:** এগুলো Renovate 41-এর configuration key, আর Dependabot তার grouping option-গুলো অন্যভাবে লেখে।
> টেকসই নীতি হলো: automation সিদ্ধান্ত নেয় **update-এর ধরন আর dependency-র ধরন** দেখে, আর automerge তখনই নিরাপদ, যখন
> test suite তাকে পাহারা দেয়। Key-এর এখনকার নাম মিলিয়ে নিন।

### Major upgrade-কে migration হিসেবে চালানো

Framework-এর major upgrade একটি project, শুধু version বাড়ানো নয়। দুই সপ্তাহে শেষ হওয়া migration আর পরিত্যক্ত branch-এর
মধ্যে পার্থক্য গড়ে দেয় তিনটি অভ্যাস:

- **Code লেখার আগে peer dependency audit করুন।** পুরনো major-এ আটকে থাকা, রক্ষণাবেক্ষণহীন একটি package-ই সবকিছু আটকে
  দেয়। তৃতীয় সপ্তাহে নয়, প্রথম দিনেই সেটা খুঁজে বের করুন।
- **ধাপে ধাপে merge করুন।** প্রথমে একটি route-এ ship করুন, একটি flag-এর পেছনে, কিংবা একটি workspace package-এ। সব-নয়তো-কিছুই-না
  ধরনের branch-এ যত দ্রুত কাজ এগোয়, তার চেয়ে দ্রুত conflict জমে।
- **Cleanup-এর সময় আগেই ঠিক করে রাখুন।** "সাময়িক" shim-এর কারণেই একটি codebase বছরের পর বছর একই library-র দুটি version
  চালায়।

তারপর upgrade-এর ঋণকে একটি সংখ্যা দিন। Track করুন **কতগুলো major পিছিয়ে**, **dependency-র median বয়স**, আর **কতগুলো
direct dependency-র 18 মাসে কোনো release নেই**। এগুলো রাখুন error budget-এর পাশে, যেখানে এদের জন্য বাজেট মেলে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী করবেন | কেন |
| --------- | ------- | --- |
| একটি product, একটি team | একটি shared components folder | Publish করা package এখানে বাড়তি বোঝা |
| কয়েকটি product বা brand | Publish করা package, theme হিসেবে token set | একটি বদল সব জায়গায় পৌঁছায় |
| Design language এখনো বদলাচ্ছে | আগে token ship করুন, component আটকে রাখুন | Value বদলানো সস্তা, component নয় |
| যেকোনো dependency-র patch বা minor | Automate করুন | Review-এর খরচ ঝুঁকির চেয়ে বেশি |
| Framework major, দুটি পিছিয়ে | Feature-এর কাজ থামিয়ে এর সময় ঠিক করুন | প্রতিটি নতুন release দূরত্বটা আরও বাড়ায় |
| বড়, রক্ষণাবেক্ষণহীন dependency | Wrap করুন, তারপর বদলানোর পরিকল্পনা করুন | বড় package-এর fork চিরকালের জন্য থেকে যায় |

## সাধারণ ভুল

❌ **Component-এ primitive token ব্যবহার।** Button-এ `blue500` থাকা মানে button-টার theme আর বদলানো যাবে না।
✅ Component পড়বে শুধু semantic token। Semantic token দেখাবে primitive-এর দিকে।

❌ **Accessibility-কে ব্যবহারকারীর দায়িত্ব ভাবা।** যে `Dialog` focus আটকে রাখে না, সেটা প্রতিটি app-এ ভাঙা অবস্থায় ship হয়।
✅ Focus, keyboard handling আর role থাকবে component-এর ভেতরে, আর test-ও হবে সেখানেই।

❌ **Minor version-এ breaking change।** একটি prop-এর নাম বদলালেই সব ব্যবহারকারীর code ভাঙে, আর upgrade-এর ওপর আস্থা চলে যায়।
✅ Major version, deprecation-এর সময়সীমা, codemod।

❌ **তিন মাস পরপর একটি "dependency সপ্তাহ"।** Upgrade জমিয়ে একসঙ্গে করলে সেই জট আবার তৈরি হয়, যা upgrade-কে ব্যয়বহুল করে।
✅ Automation দিয়ে নিয়মিত ছোট update, আর প্রতিটি major-এর জন্য আলাদা সময়।

❌ **Pipeline সবুজ হলেই upgrade শেষ ধরে নেওয়া।** Shim আর skip করা test তখনো রয়ে গেছে।
✅ প্রতিটি migration শেষ করুন একটি cleanup pull request দিয়ে, যা নাম ধরে ধরে shim-গুলো মুছে দেয়।

## 🔑 মূল শিক্ষা

- Design system মানে token, component আর docs, আর component দেখতে পারে শুধু semantic token।
- Publish করা API হলো props, তাই আসল contract হলো semantic versioning আর সঙ্গে migration-এর পথ।
- Upgrade-এর খরচ ঠিক করে আপনি কতদিন অপেক্ষা করেছেন, বদলটা কত বড় তা নয়।
- প্রতিটি dependency কোনো একটি স্তরে পড়ে, আর leaf utility-র ওপরের যেকোনো কিছু আপনার নিজের wrapper-এর পেছনে থাকা উচিত।
- Patch automerge করার পক্ষে যুক্তি টেকে তখনই, যখন merge-এর পাহারায় থাকে test suite।

## Interview-এর প্রশ্ন

**Q: চল্লিশটি team, যাদের প্রত্যেকের নিজের component আছে, তাদের মধ্যে design system আনবেন কীভাবে?**

একবারে সব নয়। আগে CSS variable হিসেবে token ship করুন। Team-গুলো এক বিকেলেই এগুলো নিতে পারে, আর এতে colour আর spacing-এর
এলোমেলো ভাব ঠিক হয়ে যায়। তারপর সবচেয়ে বেশি ব্যবহার হওয়া component-গুলো একটি একটি করে publish করুন: button, input,
dialog। Team-গুলো migrate করে component ধরে, পুরো app ধরে নয়। এক ধাক্কায় সব বদলাতে হলে চল্লিশটি team-কে একই sprint বেছে
নিতে হয়, তাই সেটা কখনো ঘটে না।

**Q: সবচেয়ে বেশি ব্যবহার হওয়া component-এর একটি prop-এর নাম বদলাতে হবে। কীভাবে ship করবেন?**

পুরো একটি major version ধরে দুটি নামই নিন। পুরনো নামটা development-এ warning দেবে, আর type-এ `@deprecated` থাকবে, যাতে
editor সেটা চিহ্নিত করে। একটি codemod আর একটি migration guide ship করুন, আর আগের major কতদিন support পাবে তা জানিয়ে দিন।
এক ঝটকায় ভেঙে দেওয়া technically ঠিক, কিন্তু তাতে লোকে আপনার system fork করে নেয়।

**Q: কখন design system ভুল বিনিয়োগ?**

যখন design language এখনো বদলাচ্ছে। Component সিদ্ধান্তগুলো ধরে রাখে, তাই আগেভাগে বানালে team-গুলো প্রথম version-কে পাশ
কাটিয়ে কাজ চালানোর পরে আবার বানাতে হয়। Token আগে ship করুন, কারণ value বদলানো সস্তা। Component-এর জন্য অপেক্ষা করুন,
যতদিন না language-টা স্থির করার মতো হয়।

**Q: একটি team বলছে তারা React upgrade করতে পারবে না, কারণ "অনেক কিছু ভেঙে যাবে"। আসল অবস্থা বের করবেন কীভাবে?**

Code দিয়ে নয়, শুরু করুন peer dependency audit দিয়ে। দেখুন কোন direct dependency-গুলোর target major-এর জন্য release আছে।
সাধারণত দুই-তিনটি package সত্যিই আটকায়, বাকিটা codemod-এর কাজ। এতে সীমাহীন একটি ভয় হয়ে যায় নাম দেওয়া কিছু কাজের
তালিকা, যার সময় ঠিক করা যায়।

## এরপর কী পড়বেন

- [Chapter ?? — Micro-Frontend](#ch-micro-frontends) — যেখানে shared system-ই পাঁচটি team-কে আলাদা পথে যেতে দেয় না
- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) — lockfile, provenance আর supply-chain-এর নিয়ন্ত্রণ, যার ওপর automation নির্ভর করে
- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — একটি dependency-র একটিই version রাখা আদৌ সম্ভব কি না
