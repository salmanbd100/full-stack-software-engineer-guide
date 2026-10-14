---
sourceHash: "7b4b4356972ab2cbaeed5475c6dfbe414715fd865a322e8895af72f15aefb8f7"
title: "বড় পরিসরে TypeScript"
translatedAt: "2026-10-14T04:32:29.998Z"
model: "claude-opus-5-5 (Claude Code)"
---

# বড় পরিসরে TypeScript {#ch-typescript-at-scale}

> এমন codebase-এ `strict` চালু করুন, যেটা কখনো এর কথা ভেবে লেখা হয়নি। Annotation-এর জায়গায় `satisfies` ব্যবহার করুন। আর বুঝতে শিখুন, কখন একটি type যা দেয় তার চেয়ে বেশি খরচ করছে।

**এই অধ্যায়ে:** ভাষা বনাম engineering · একটি একটি flag করে `strict`-এ migrate করা · `satisfies` আর এটা কী সমস্যা মেটায় · module resolution আর `verbatimModuleSyntax` · কখন থামবেন

## 💡 মূল ধারণা

Chapter 01 থেকে 07 পর্যন্ত ছিল ভাষাটা নিয়ে। এই অধ্যায় **engineering** নিয়ে: codebase বড়, পুরনো আর অনেকের হাতে
থাকলে কী বদলায়। তখন প্রতিটি প্রশ্নই হয়ে দাঁড়ায় খরচের প্রশ্ন, কী কী প্রকাশ করা যায় তার নয়। আরও নিখুঁত type বেশি
bug ধরে, কিন্তু check হতে সময় বেশি নেয়। আরও চালাক type-ও বেশি bug ধরে, কিন্তু পরের মানুষটার পড়তে সময় বেশি লাগে।
Senior-এর উত্তর কখনো "যতটা সম্ভব নিখুঁত করো" নয়। Senior জানেন, একটি type কোন error-গুলো ধরে দেয়, আর তার দাম কত।

বাকি অর্ধেক কথা হলো, বড় codebase প্রায় কখনোই শুরু থেকে `strict` থাকে না। সেখানে পৌঁছাতে হয় migration করে। আর
interviewer-রা প্রায় নিয়ম করেই এমন একটা plan চান, যেটা "চালু করে 4,000 error ঠিক করো" নয়।

## কীভাবে কাজ করে

### `strict` আসলে সাতটি flag, আর এগুলো চালু হয় একটি একটি করে

`"strict": true` একটা পুরো দল চালু করে। পুরনো codebase-এ পুরো দলটা একসঙ্গে চালু করলে হাজার হাজার error আসে, আর
সেগুলো পার হওয়ার কোনো পথ থাকে না। একটি একটি করে চালু করলে পাওয়া যায় কয়েকটি আলাদা কাজ, যেগুলো শেষ করা যায়।

| Flag | কী ধরে | Migration-এর খরচ |
| ---- | --------------- | -------------- |
| `noImplicitAny` | Type ছাড়া parameter আর member | বেশি — তবে আসল লাভ এখানেই |
| `strictNullChecks` | `null` আর `undefined`, যেন ওরা নেই এমনভাবে ব্যবহার | সবচেয়ে বেশি, আর bug-ও সবচেয়ে বেশি ধরা পড়ে |
| `strictFunctionTypes` | Callback-এ ভুল parameter variance | কম |
| `strictBindCallApply` | `bind`/`call`/`apply` দিয়ে ভুল argument | কম |
| `strictPropertyInitialization` | কখনো assign না হওয়া class field | কম, মূলত পুরনো code-এ |
| `noImplicitThis` | অজানা type-এর `this` | কম |
| `useUnknownInCatchVariables` | `catch (e)`-কে `any` ধরা | কম, আর কাজটা যান্ত্রিক |

**যে ক্রমে কাজ হয়:** আগে কম খরচের চারটি flag, কারণ এগুলো দ্রুত জেতা যায় আর ভরসা বাড়ে। তারপর `noImplicitAny`।
সবশেষে আলাদা করে `strictNullChecks`, কারণ সত্যিকারের bug বের করে এটাই, তাই এতে মনোযোগ লাগে।

Codebase যদি এর জন্যও বেশি বড় হয়, তাহলে বেরোনোর পথ হলো `strict: true`, সঙ্গে file ধরে ধরে suppression। কিন্তু
এর সঙ্গে একটা ratchet থাকতেই হবে: এমন একটা সংখ্যা, যা কমতে পারে, কখনো বাড়তে পারে না। CI-তে একটা check যোগ
করুন, যা গোনে কতগুলো file-এ `// @ts-nocheck` বা `// @ts-expect-error` আছে, আর **সংখ্যা বাড়লে fail করে।** যে
সংখ্যা শুধু কমতেই পারে, সেটাই migration শেষ করায়। Gate ছাড়া suppression-এর তালিকা শুধু বাড়ে।

`strict`-এর বাইরেও দুটি কাজের flag আছে। `noUncheckedIndexedAccess` দিলে `arr[i]`-এর type হয় `T | undefined`।
সেটাই সত্যি, কিন্তু loop-ভরা code-এ বড্ড কোলাহল করে। `exactOptionalPropertyTypes` "নেই" আর "আছে, কিন্তু
`undefined`"-কে আলাদা করে, আর এতে spread-এর চেনা pattern-গুলো ভাঙে। দুটিই নিজে থেকে চালু করতে হয়, কারণ খরচটা
সত্যি।

### `satisfies` যাচাই করে, কিন্তু type চওড়া করে না

`satisfies` এসেছে TypeScript 4.9-এ, আর configuration object-এর type লেখার ধরনটাই বদলে দিয়েছে। Interviewer-রা
এটা জিজ্ঞেস করেন, কারণ এটা কেন আছে সেই কারণটা সূক্ষ্ম।

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

পার্থক্যটা এক কথায়: **annotation হলো variable-টা কী, সে সম্পর্কে একটা দাবি; `satisfies` হলো value-টা নিয়ম মানছে
কিনা তার যাচাই।** Annotation দিলে validation পান, কিন্তু key-গুলো হারান। `satisfies` দিলে দুটিই পান, আর
`keyof typeof` একটা কাজে লাগার মতো union হয়ে যায়। তাই route table, theme token, feature-flag map আর permission
list-এর জন্য এটাই ঠিক জিনিস। শুধু `as const`-এর বিরুদ্ধেও একই যুক্তি: এটা literal রাখে, কিন্তু কিছুই যাচাই করে
না। Readonly-ও চাইলে `as const satisfies T` একটা ঠিকঠাক জোড়া।

### Module resolution, আর যে flag চমক থামায়

Local-এ compile হওয়া project CI-তে ভাঙে, বা bundler-এ কাজ করা import `tsc`-তে করে না, এসবের জায়গা module
resolution।

| `moduleResolution` | কোথায় ব্যবহার করবেন |
| ------------------ | ------- |
| `bundler` | Vite, esbuild, webpack দিয়ে build হওয়া সবকিছু — bundler আসলে যা করে, তার সঙ্গে মেলে |
| `nodenext` | যে code Node সরাসরি চালায়, যেখানে `package.json`-এর `exports` আর extension মানতেই হয় |
| `node10` | শুধু পুরনো code-এ। `exports` map আসার আগের জিনিস এটা |

যে flag-টা ব্যাখ্যা করতে পারা দরকার, সেটা `verbatimModuleSyntax`, এসেছে TypeScript 5.0-তে। শুধু type হিসেবে
ব্যবহার হওয়া সবকিছুর জন্য এটা `import type` বাধ্যতামূলক করে, তারপর import-গুলো ঠিক যেমন লেখা তেমনই emit করে। এটা
না থাকলে কোন import elide হবে (মানে output থেকে বাদ পড়বে), তা compiler নিজে ঠিক করে। যে value import ঘটনাচক্রে
শুধু type-এর জায়গায় ব্যবহার হয়েছে, সেটা উধাও হয়ে যায়, সঙ্গে তার side effect-ও। এই flag মুছে ফেলার সিদ্ধান্তটা
source-এ নিয়ে আসে, যেখানে review-এ সেটা চোখে পড়ে।

`skipLibCheck` আর project reference build-time-এর আলোচনার অংশ, সেটা আছে
[Chapter ?? — বড় পরিসরে Type-Checking ও Linting](#ch-type-checking-and-linting)-এ। Type checking কেন parallel
হয় না, আর project graph তাতে কী করে, সেই অধ্যায় সেটা ব্যাখ্যা করে।

### Declaration file, যখন নিজেকেই লিখতে হয়

নিজে যত `.d.ts` file লিখবেন, তার বেশিরভাগই হবে type ছাড়া কোনো dependency বা code নয় এমন কোনো import-এর জন্য।

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

Shim-এর নিয়ম: **শুধু যা call করেন তার type দিন, আর সেটা নির্ভুল দিন।** যে shim আন্দাজে পুরো library declare করে,
সেটা type না থাকার চেয়েও খারাপ। কারণ compiler তখন আত্মবিশ্বাসের সঙ্গে একটা ভুলকে সমর্থন করে। যাচাই না করা এক
জায়গায় `any` রাখা বানানো signature-এর চেয়ে বেশি সৎ। Wildcard module, যেমন `string` export করা
`declare module "*.svg"`, asset-এর বেলায় একই নিয়ম খাটায়।

### যখন type যা দেয় তার চেয়ে বেশি খরচ করতে শুরু করে

Type-এর স্তরে হিসাবও সত্যিকারের হিসাব। এটা single-threaded, আর প্রতিটি check-এ আবার চলে।

```typescript
// ❌ A recursive conditional over a large union: compiles, and slowly.
type DeepPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? DeepPaths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
    : `${Prefix}${K}`;
}[keyof T & string];
// ✅ Generate the union from the runtime source instead, or accept `string`.
```

তিনটি লক্ষণ বলে দেয় একটি type তার মূল্য ছাড়িয়ে গেছে, আর প্রতিটির একটা সস্তা সমাধান আছে:

| লক্ষণ | সস্তা সমাধান |
| ------ | ------------------ |
| একটি file-এ editor-এর autocomplete আসতে কয়েক second লাগে | Type সহজ করুন, বা file ভাগ করুন |
| Team-এ শুধু একজনই এটা বদলাতে পারেন | যাচাই করা runtime schema, type বের হবে তা থেকে |
| Error message চল্লিশ line-এর nested conditional | আরও সরু type, আর boundary-তে runtime check |

শেষ row-টাই সাধারণ মুক্তির পথ। Schema validator একটি declaration থেকেই runtime check **আর** inference করা type
দুটিই দেয়। Type system-এ একই জিনিস প্রমাণ করার চেয়ে সেটা সাধারণত ভালো। কোন type ধীর, তা আন্দাজে নয়, প্রমাণ দিয়ে
জানতে চাইলে `tsc --generateTrace` ব্যবহার করুন।

> ⚠️ **যা বদলাতে থাকে:** কয়েকটি release পরপরই TypeScript compiler flag যোগ করে বা নাম বদলায়, আর native port এই
> অংশের performance-এর হিসাবটাই বদলে দিচ্ছে। তবে টেকসই নীতিটা থাকে: type-এর স্তরের কাজ single-threaded আর প্রতিটি
> check-এ আবার চলে, তাই নিখুঁততার একটা মাপা যায় এমন দাম আছে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী করবেন | কেন |
| --------- | -- | --- |
| বড় codebase, `strict`-এ নেই | সস্তা চারটি flag, তারপর `noImplicitAny`, তারপর `strictNullChecks` | প্রতিটি ধাপ শেষ হয়; পুরো দল একসঙ্গে হয় না |
| মাসের পর মাস চলবে এমন migration | `strict`, সঙ্গে গোনা হয় এমন opt-out তালিকা, যা শুধু ছোট হতে পারে | Ratchet না থাকলে তালিকা চিরস্থায়ী হয়ে যায় |
| Route table, theme বা flag map | `satisfies` | Validation আর literal key দুটিই |
| এমন discriminated union, যা সব জায়গায় narrow করতে চান | Annotation | এখানে চওড়া type-টাই চাই |
| Network বা file-এর boundary পার হওয়া data | Runtime schema, type বের হবে তা থেকে | Compiler যা দেখেনি, তা যাচাই করতে পারে না |
| Type ছাড়া dependency | শুধু যা call করেন, ততটুকুর shim | বানানো signature `any`-এর চেয়েও খারাপ |
| এমন type, যা আর কেউ বদলাতে পারে না | মুছে ফেলুন, runtime-এ যাচাই করুন | যত bug ধরেছে, রক্ষণাবেক্ষণের খরচ তার চেয়ে বেশি |

## সাধারণ ভুল

❌ **বড় codebase-এ এক commit-এই `strict: true` চালু করা।** হাজার হাজার error, পার হওয়ার কোনো পথ নেই, শেষে
branch-টাই ফেলে রাখা হয়।
✅ একটি একটি flag, সবচেয়ে সস্তাটা আগে, `strictNullChecks` সবশেষে আর আলাদা করে।

❌ **Gate ছাড়া `@ts-nocheck`-এর suppression তালিকা।** এটা শুধু বাড়তেই থাকে।
✅ CI-তে suppression গুনুন, সংখ্যা বাড়লে fail করান।

❌ **Configuration object-এ `Record<string, T>` annotation দেওয়া।** Key-গুলো চওড়া হয়ে `string` হয়ে যায়, আর
typo আর error থাকে না।
✅ `satisfies`, যেটা নিয়ম মানছে কিনা যাচাই করে আর literal key-গুলো রেখে দেয়।

❌ **Type ছাড়া পুরো library-র জন্য হাতে লেখা `.d.ts`।** Compiler তখন আন্দাজের জামিনদার হয়ে যায়।
✅ শুধু যতটুকু call করেন, ততটুকু declare করুন; বাকিটা সত্যিই unknown থাকুক।

❌ **Data network থেকে আসছে, অথচ invariant প্রমাণ করছেন type system-এ।** Type মুছে যায়, তাই runtime-এ সেই
নিশ্চয়তার কোনো অস্তিত্বই নেই।
✅ Boundary-তে যাচাই করুন, আর type বের করুন schema থেকে।

## 🔑 মূল শিক্ষা

- `strict` আসলে সাতটি flag, আর পুরনো codebase migrate করে এগুলো একটি একটি করে চালু করে।
- Migration-এ এমন suppression count লাগে, যা শুধু কমতে পারে; gate না থাকলে opt-out তালিকা চিরস্থায়ী হয়।
- Annotation variable সম্পর্কে একটা দাবি, আর তা type চওড়া করে; `satisfies` একটা check, যা literal type রেখে দেয়।
- `verbatimModuleSyntax` থাকলে type-only import মুছে ফেলার ব্যাপারটা compiler-এর সিদ্ধান্ত না থেকে source-এ স্পষ্ট হয়।
- Type-এর স্তরের হিসাব single-threaded আর প্রতিটি check-এ আবার চলে, তাই চালাক type-এর একটা মাপা যায় এমন দাম আছে।

## Interview-এর প্রশ্ন

**Q: 200,000 line-এর একটি codebase-কে কীভাবে `strict`-এ আনবেন?**

এক commit-এ নয়। `strict` হলো সাতটি flag, তাই আমি আগে সস্তা চারটি চালু করব:
`strictFunctionTypes`, `strictBindCallApply`, `noImplicitThis` আর `useUnknownInCatchVariables`। তারপর
`noImplicitAny`, তারপর আলাদা করে `strictNullChecks`, কারণ সত্যিকারের bug বের করে এটাই।
এটাও যদি বেশি বড় হয়, তাহলে `strict: true` দেব, সঙ্গে file ধরে suppression, আর CI-তে একটা check, যাতে সংখ্যাটা
শুধু কমে। আসল জিনিস হলো gate। এটা না থাকলে বাদ দেওয়ার তালিকা চিরস্থায়ী হয়ে যায়।

**Q: Type annotation যা করে না, `satisfies` তা কী করে?**

Type চওড়া না করেই value-টাকে type-এর সঙ্গে মিলিয়ে দেখে। Annotation বলে variable-টা *কী*, তাই
`Record<string, Route>` entry-গুলো যাচাই করে, তারপর নির্দিষ্ট key-গুলো ফেলে দেয়। Lookup-এ typo থাকলে সেটা আর
error থাকে না। `satisfies` একইভাবে যাচাই করে, কিন্তু literal type রেখে দেয়, তাই
`keyof typeof` থেকে key-গুলোর সত্যিকারের union পাওয়া যায়। এজন্যই route table আর permission map-এ এটা মানানসই।

**Q: কখন বুঝবেন type বেশি খরুচে হয়ে গেছে?**

যখন একটি file-এ editor ধীর হয়ে যায়, যখন শুধু একজনই কোনো type নিরাপদে বদলাতে পারেন, বা যখন একটা অমিলের জন্য
চল্লিশ line-এর error আসে যা কেউ পড়তে পারে না। তিনটিই বলে, type যা দেয় তা ছাড়িয়ে গেছে। সাধারণত এর বদলে আসে
runtime schema। একটি declaration থেকেই runtime check আর inference করা type দুটিই পাওয়া যায়। Boundary পার হওয়া
যেকোনো কিছুর জন্য এটা বেশি নিরাপদ, আর রক্ষণাবেক্ষণও অনেক সস্তা।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — type-এর স্তরের যে feature-গুলোর দাম এই অধ্যায় হিসাব করেছে
- [Chapter ?? — বড় পরিসরে Type-Checking ও Linting](#ch-type-checking-and-linting) — project reference, আর পুরো program-এর check-কে critical path থেকে সরিয়ে রাখা
- [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) — একই নিয়ম props, state আর server boundary-তে
