---
sourceHash: "7b4b4356972ab2cbaeed5475c6dfbe414715fd865a322e8895af72f15aefb8f7"
title: "বড় পরিসরে TypeScript"
translatedAt: "2026-10-12T07:47:23.741Z"
model: "claude-opus-5-5 (Claude Code)"
---

# বড় পরিসরে TypeScript {#ch-typescript-at-scale}

> এমন codebase-এ `strict` চালু করুন, যেটা কখনো এর জন্য লেখা হয়নি। Annotation-এর বদলে `satisfies` ব্যবহার করুন। জানুন কখন একটি type যা দেয়, তার চেয়ে বেশি খরচ করছে।

**এই অধ্যায়ে:** ভাষা বনাম engineering · এক flag করে `strict`-এ migrate করা · `satisfies` আর এটা কী ঠিক করে · module resolution আর `verbatimModuleSyntax` · কখন থামবেন

## 💡 মূল ধারণা

অধ্যায় 01 থেকে 07 হলো ভাষা। এই অধ্যায়টি **engineering**: codebase যখন বড়, পুরোনো আর অনেকের মধ্যে ভাগ করা,
তখন কী বদলায়। সেই অবস্থায় প্রতিটি প্রশ্ন expressiveness নিয়ে নয়, খরচ নিয়ে।
একটি বেশি নিখুঁত type বেশি bug ধরে, আর check করতে বেশি সময় নেয়। একটি বেশি চালাক type বেশি bug ধরে, আর পরের
মানুষটির পড়তে বেশি সময় নেয়। একটি senior উত্তর কখনো "যতটা সম্ভব নিখুঁত করো" নয়। Senior উত্তর হলো জানা যে একটি
type কোন error-গুলো কিনে দেয়, আর কত দামে।

বাকি অর্ধেক হলো, একটি বড় codebase প্রায় কখনোই শুরু থেকে `strict` থাকে না। সেখানে পৌঁছায় migration-এর মাধ্যমে।
Interviewer-রা প্রায় নিশ্চিতভাবেই এমন একটি plan চান, যেটা "চালু করে 4,000 error ঠিক করো" নয়।

## কীভাবে কাজ করে

### `strict` হলো সাতটি flag, আর এগুলো এক এক করে চালু হয়

`"strict": true` একটি group চালু করে। একটি চলমান codebase-এ পুরো group একসঙ্গে চালু করলে হাজার হাজার error আসে,
আর সেগুলো পার হওয়ার কোনো পথ থাকে না। Flag-গুলো এক এক করে চালু করলে এমন কয়েকটি কাজ তৈরি হয়, যেগুলো আপনি শেষ
করতে পারবেন।

| Flag | কী ধরে | Migration-এর খরচ |
| ---- | --------------- | -------------- |
| `noImplicitAny` | Type ছাড়া parameter আর member | বেশি — কিন্তু আসল লাভ এখানেই |
| `strictNullChecks` | `null` আর `undefined`, এমনভাবে ব্যবহার করা যেন তারা নেই | সবচেয়ে বেশি, আর সবচেয়ে বেশি bug ধরা পড়ে |
| `strictFunctionTypes` | Callback-এ unsound parameter variance | কম |
| `strictBindCallApply` | `bind`/`call`/`apply` দিয়ে ভুল argument | কম |
| `strictPropertyInitialization` | Class field, যেগুলো কখনো assign হয়নি | কম, আর বেশিরভাগ পুরোনো code-এ |
| `noImplicitThis` | অজানা type-এর `this` | কম |
| `useUnknownInCatchVariables` | `catch (e)`-কে `any` হিসেবে ধরা | কম, আর যান্ত্রিক কাজ |

**যে ক্রম কাজ করে:** আগে কম খরচের চারটি flag, কারণ এগুলো দ্রুত জয়, আর আত্মবিশ্বাস তৈরি করে। তারপর
`noImplicitAny`। তারপর সবশেষে `strictNullChecks`, একা, কারণ এটাই আসল bug সামনে আনে, আর মনোযোগ চায়।

যে codebase এর জন্যও বেশি বড়, তার বেরোনোর পথ হলো `strict: true`, সঙ্গে প্রতিটি file-এ suppression। কিন্তু এর সঙ্গে
একটি ratchet থাকতেই হবে: এমন একটি সংখ্যা, যেটা কমতে পারে, কখনো বাড়তে পারে না। একটি CI check যোগ করুন, যেটা
`// @ts-nocheck` বা `// @ts-expect-error` থাকা file-গুলো গোনে, আর **সংখ্যা বাড়লে fail করে।** যে সংখ্যা শুধু কমতে
পারে, সেটাই একটি migration শেষ করায়। Gate ছাড়া একটি suppression তালিকা শুধু বাড়তেই থাকে।

`strict`-এর বাইরে দুটি কাজের flag আছে। `noUncheckedIndexedAccess` দিলে `arr[i]` থেকে `T | undefined` আসে।
এটাই সত্য, কিন্তু loop-ভরা code-এ এটা অনেক গোলমাল করে। `exactOptionalPropertyTypes` "নেই" আর "আছে, কিন্তু
`undefined`"-কে আলাদা করে, আর এটা সাধারণ spread pattern ভেঙে দেয়। দুটোই opt-in, কারণ খরচটা সত্যিকারের।

### `satisfies` widen না করে check করে

`satisfies` এসেছে TypeScript 4.9-এ, আর configuration object-এর type কীভাবে দেওয়া হয়, সেটা বদলে দিয়েছে।
Interviewer-রা এটা নিয়ে প্রশ্ন করেন, কারণ এটা কেন আছে, সেই কারণটা সূক্ষ্ম।

```typescript
type Route = { path: string; auth: boolean };

// ❌ An annotation checks the value, then throws the specifics away.
const routesAnnotated: Record<string, Route> = {
  home: { path: "/", auth: false },
  admin: { path: "/admin", auth: true },
};
routesAnnotated.hoem; // no error — the key type is `string`

// ✅ `satisfies` checks against the type and keeps the literal type.
const routes = {
  home: { path: "/", auth: false },
  admin: { path: "/admin", auth: true },
} satisfies Record<string, Route>;

routes.hoem; // Error: property does not exist
type RouteName = keyof typeof routes; // "home" | "admin"
```

এক লাইনে পার্থক্য: **annotation হলো variable-টি কী, সেই বিষয়ে একটি দাবি; `satisfies` হলো value-টি মানছে কি না,
সেই check।** Annotation দিলে আপনি validation পান, আর key-গুলো হারান। `satisfies` দিলে দুটোই পান, আর
`keyof typeof` একটি ব্যবহারযোগ্য union হয়ে যায়। তাই route table, theme token, feature-flag map আর permission
তালিকার জন্য এটাই ঠিক হাতিয়ার। একই যুক্তি শুধু `as const`-এর বিরুদ্ধেও খাটে, যেটা literal রাখে কিন্তু কিছুই check
করে না। Readonly-ও চাইলে `as const satisfies T` একটি সঠিক জোড়া।

### Module resolution, আর যে flag চমক থামায়

Module resolution হলো সেই জায়গা, যেখানে locally compile হওয়া একটি project CI-তে fail করে। অথবা যেখানে একটি
import bundler-এ কাজ করে, কিন্তু `tsc`-এ করে না।

| `moduleResolution` | কীসের জন্য |
| ------------------ | ------- |
| `bundler` | Vite, esbuild, webpack দিয়ে build হওয়া যেকোনো কিছু — bundler-রা আসলে যা করে, তার সঙ্গে মেলে |
| `nodenext` | যে code Node সরাসরি চালায়, যেখানে `package.json` `exports` আর extension বাধ্যতামূলক |
| `node10` | শুধু legacy। এটা `exports` map-এর পুরোপুরি আগের |

`verbatimModuleSyntax`, যেটা TypeScript 5.0-তে যোগ হয়েছে, সেটা ব্যাখ্যা করতে পারা দরকার। শুধু type হিসেবে ব্যবহার
হওয়া যেকোনো কিছুর জন্য এটা `import type` বাধ্যতামূলক করে, তারপর import-গুলো হুবহু যেমন লেখা, তেমনই emit করে। এটা
ছাড়া compiler নিজে ঠিক করে কোন import elide করবে (output থেকে বাদ দেবে)। একটি value import, যেটা ঘটনাচক্রে শুধু
একটি type position-এ ব্যবহার হয়েছে, সেটা উধাও হয়ে যায়, আর তার side effect-ও সঙ্গে যায়। এই flag সেই বাদ দেওয়াকে
source-এ নিয়ে আসে, যেখানে review-তে সেটা চোখে পড়ে।

`skipLibCheck` আর project reference হলো build-time আলোচনার অংশ, যেটা আছে
[Chapter ?? — বড় পরিসরে Type-Checking ও Linting](#ch-type-checking-and-linting)-এ। সেই অধ্যায় ব্যাখ্যা করে, type
checking কেন parallel হয় না, আর একটি project graph এ নিয়ে কী করে।

### Declaration file, যখন একটি লিখতেই হয়

আপনি যত `.d.ts` file লেখেন, তার বেশিরভাগ একটি untyped dependency বা একটি non-code import-এর জন্য।

```typescript
// types/untyped-lib.d.ts — a minimal, honest shim
declare module "legacy-charts" {
  export interface ChartOptions {
    data: number[];
    labels?: string[];
  }
  export function render(el: HTMLElement, options: ChartOptions): void;
}
```

একটি shim-এর নিয়ম: **শুধু যা call করেন, সেটুকুরই type দিন, আর সঠিকভাবে দিন।** যে shim আন্দাজে পুরো library
declare করে, সেটা type না থাকার চেয়েও খারাপ। কারণ এখন compiler আত্মবিশ্বাসের সঙ্গে একটি ভুল জিনিসে সায় দেয়।
যাচাই না করা এক জায়গায় `any` একটি বানানো signature-এর চেয়ে বেশি সৎ। একটি wildcard module, যেমন
`declare module "*.svg"` যেটা একটি `string` export করে, asset-এর ক্ষেত্রে একই নিয়ম খাটায়।

### যখন type যা দেয়, তার চেয়ে বেশি খরচ করতে শুরু করে

Type-স্তরের হিসাব সত্যিকারের হিসাব। এটা single-threaded, আর প্রতিটি check-এ আবার চলে।

```typescript
// ❌ A recursive conditional over a large union: compiles, and slowly.
type DeepPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? DeepPaths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
    : `${Prefix}${K}`;
}[keyof T & string];
// ✅ Generate the union from the runtime source instead, or accept `string`.
```

তিনটি লক্ষণ দেখায় যে একটি type তার মূল্য পেরিয়ে গেছে, আর প্রতিটির একটি সস্তা উত্তর আছে:

| লক্ষণ | সস্তা উত্তর |
| ------ | ------------------ |
| একটি file-এ editor autocomplete কয়েক সেকেন্ড নেয় | Type-টি সরল করুন, বা file-টি ভাগ করুন |
| Team-এ শুধু একজনই এটা বদলাতে পারেন | একটি validated runtime schema, যেখান থেকে type infer করা হয় |
| Error message হলো চল্লিশ লাইনের nested conditional | একটি সরু type, আর boundary-তে একটি runtime check |

শেষ সারিটিই সাধারণ বেরোনোর পথ। একটি schema validator একটিমাত্র declaration থেকে আপনাকে একটি runtime check **আর**
একটি inferred type দেয়। সাধারণত সেটা type system-এ একই জিনিস প্রমাণ করার চেয়ে ভালো। কোন type ধীর, সেটা নিয়ে
আন্দাজ নয়, প্রমাণ দরকার হলে `tsc --generateTrace` ব্যবহার করুন।

> ⚠️ **বদলাতে থাকা বিষয়:** TypeScript প্রতি কয়েকটি release-এ compiler flag যোগ করে আর নাম বদলায়। আর native
> port এই section-এর পেছনের performance-এর হিসাব বদলে দেয়। স্থায়ী নীতিটা টিকে থাকে: type-স্তরের কাজ
> single-threaded, আর প্রতিটি check-এ আবার চলে, তাই নিখুঁততার একটি মাপা যায় এমন দাম আছে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী করবেন | কেন |
| --------- | -- | --- |
| একটি বড় codebase, যেটা `strict`-এ নেই | সস্তা চারটি flag, তারপর `noImplicitAny`, তারপর `strictNullChecks` | প্রতিটি ধাপ শেষ হয়; পুরো group হয় না |
| এমন migration, যেটা কয়েক মাস চলবে | `strict`, সঙ্গে গোনা একটি opt-out তালিকা, যেটা শুধু ছোট হতে পারে | Ratchet ছাড়া তালিকাটি স্থায়ী হয়ে যায় |
| একটি route table, theme বা flag map | `satisfies` | Validation, আর literal key-গুলোও |
| এমন discriminated union, যেটা সব জায়গায় narrow করতে চান | একটি annotation | এখানে আপনি চওড়া type-টিই চান |
| Network বা file boundary পার হওয়া data | Type infer করা একটি runtime schema | Compiler যা দেখেনি, তা check করতে পারে না |
| একটি untyped dependency | শুধু যা call করেন, সেটুকু ঢাকা একটি shim | বানানো signature `any`-এর চেয়েও খারাপ |
| এমন type, যেটা আর কেউ edit করতে পারে না | মুছে ফেলুন, আর runtime-এ validate করুন | Maintenance-এর খরচ ধরা bug-এর চেয়ে বেশি হয়ে গেছে |

## সাধারণ ভুল

❌ **একটি বড় codebase জুড়ে এক commit-এ `strict: true` চালু করা।** হাজার হাজার error, পার হওয়ার কোনো পথ নেই, আর
branch-টি পরিত্যক্ত হয়।
✅ এক সময়ে একটি flag, সবচেয়ে সস্তাটা আগে, `strictNullChecks` সবশেষে আর একা।

❌ **Gate ছাড়া একটি `@ts-nocheck` suppression তালিকা।** এটা শুধু বাড়তেই থাকে।
✅ CI-তে suppression-গুলো গুনুন, আর সংখ্যা বাড়লে fail করুন।

❌ **একটি configuration object-কে `Record<string, T>` দিয়ে annotate করা।** Key-গুলো `string`-এ widen হয়ে যায়, আর
typo আর error থাকে না।
✅ `satisfies`, যেটা মানছে কি না check করে, আর literal key-গুলো রেখে দেয়।

❌ **একটি পুরো untyped library ঢেকে হাতে লেখা একটি `.d.ts`।** এখন compiler আন্দাজের পক্ষে সাক্ষী দেয়।
✅ শুধু যে অংশটুকু call করেন, সেটুকু declare করুন; বাকিটা সত্যিই unknown থাকুক।

❌ **Data যখন network থেকে আসে, তখন type system-এ একটি invariant প্রমাণ করা।** Type মুছে যায়, তাই runtime-এ সেই
নিশ্চয়তা থাকেই না।
✅ Boundary-তে validate করুন, আর schema থেকে type infer করুন।

## 🔑 মূল শিক্ষা

- `strict` হলো সাতটি flag, আর একটি চলমান codebase সেগুলো এক এক করে চালু করে migrate করে।
- একটি migration-এর এমন একটি suppression সংখ্যা দরকার, যেটা শুধু কমতে পারে; gate ছাড়া opt-out তালিকা স্থায়ী হয়ে যায়।
- Annotation হলো variable সম্পর্কে একটি দাবি, আর এটা variable-কে widen করে; `satisfies` হলো একটি check, যেটা literal type রেখে দেয়।
- `verbatimModuleSyntax` শুধু-type বাদ দেওয়াকে compiler-এর সিদ্ধান্ত না রেখে source-এ স্পষ্ট করে।
- Type-স্তরের হিসাব single-threaded, আর প্রতিটি check-এ আবার চলে, তাই একটি চালাক type-এর মাপা যায় এমন দাম আছে।

## Interview-এর প্রশ্ন

**Q: একটি 200,000 লাইনের codebase-কে আপনি কীভাবে `strict`-এ নেবেন?**

এক commit-এ নয়। `strict` হলো সাতটি flag, তাই আমি আগে সস্তা চারটি চালু করব:
`strictFunctionTypes`, `strictBindCallApply`, `noImplicitThis` আর `useUnknownInCatchVariables`। তারপর
`noImplicitAny`, তারপর একা `strictNullChecks`, কারণ এটাই আসল bug সামনে আনে।
এটাও যদি বেশি বড় হয়, তাহলে আমি প্রতিটি file-এ suppression সহ `strict: true` ব্যবহার করব, সঙ্গে একটি CI check, যাতে
সংখ্যাটা শুধু কমে। Gate-টাই আসল অংশ। এটা ছাড়া বাদ দেওয়ার তালিকা স্থায়ী হয়ে যায়।

**Q: `satisfies` এমন কী করে, যা একটি type annotation করে না?**

এটা value-টিকে type-এর সঙ্গে check করে, widen না করে। একটি annotation বলে variable-টি *কী*, তাই
`Record<string, Route>` entry-গুলো validate করে, তারপর নির্দিষ্ট key-গুলো ফেলে দেয়। একটি lookup-এ typo তখন আর
error থাকে না। `satisfies` একইভাবে validate করে, আর literal type রেখে দেয়, তাই `keyof typeof` key-গুলোর একটি
সত্যিকারের union দেয়। এজন্যই এটা route table আর permission map-এর সঙ্গে মানায়।

**Q: Type কখন বেশি দামি হয়ে গেছে?**

যখন একটি file-এ editor ধীর হয়ে যায়, যখন শুধু একজনই একটি type নিরাপদে বদলাতে পারেন, বা যখন একটি অমিল থেকে
চল্লিশ লাইনের এমন error আসে, যেটা কেউ পড়তে পারে না। তিনটিই বলে, type-টি যা কিনে দেয়, তার সীমা পেরিয়ে গেছে।
সাধারণ বিকল্প হলো একটি runtime schema। একটিমাত্র declaration একটি runtime check আর একটি inferred type দুটোই
দেয়। Boundary পার হওয়া যেকোনো কিছুর জন্য সেটা বেশি নিরাপদ, আর maintain করা অনেক সস্তা।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — type-স্তরের সেই feature-গুলো, যাদের দাম এই অধ্যায় হিসাব করে
- [Chapter ?? — বড় পরিসরে Type-Checking ও Linting](#ch-type-checking-and-linting) — project reference, আর whole-program check-কে critical path থেকে দূরে রাখা
- [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) — একই শৃঙ্খলা props, state আর server boundary-তে প্রয়োগ
