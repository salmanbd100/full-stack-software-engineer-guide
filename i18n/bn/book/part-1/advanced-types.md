---
sourceHash: "40c0cae4c884dce656fa9ba25a73f6ad9daafed0d0093400c59fd650c01a8e15"
title: "TypeScript-এর Advanced ও Utility Type"
translatedAt: "2026-10-12T07:46:23.368Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript-এর Advanced ও Utility Type {#ch-advanced-types}

> প্রতিটি type একটিমাত্র উৎস থেকে বের করুন, এক type থেকে আরেক type হিসাব করুন, আর জানুন কখন এই ক্ষমতার দাম আর পোষায় না।

**এই অধ্যায়ে:** `Partial`, `Pick`, `Omit` আর `Record` · `ReturnType`, `Exclude` ও এদের সঙ্গীরা · mapped type আর key remapping · conditional type আর `infer` · template literal type

## 💡 মূল ধারণা

যে type আপনি হাতে দুবার লেখেন, একদিন না একদিন সেটা নিজের সঙ্গেই অমিল হবে। Utility type একটি model-কে
একমাত্র সত্যের উৎস বানায়, আর বাকিগুলো সেখান থেকে বের করে: create input, update patch আর public view। Model-এ
একটি field যোগ করুন, আর বের করা প্রতিটি type সেটা অনুসরণ করবে।

ভেতরে ভেতরে type system নিজেই একটি ছোট ভাষা। Mapped type iterate করে, conditional type branch করে, আর `infer`
pattern-match করে। প্রতিটি utility type সেই ভাষায় লেখা এক লাইনের একটি program। Syntax-এর পাশাপাশি শিখুন
**কখন থামতে হবে**। যে type পড়তে দশ মিনিট লাগে, সেটার খরচ সেই bug-এর চেয়ে বেশি, যেটা সে আটকায়।

## কীভাবে কাজ করে

পুরো অধ্যায়ে একটিই model ধরে নিন:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  bio?: string;
}
```

### একটি model থেকে shape বের করা

```typescript
type PublicUser = Pick<User, 'id' | 'name' | 'email'>; // keep a few
type CreateUserInput = Omit<User, 'id' | 'passwordHash'> & { password: string }; // remove a few
type UpdateUserInput = Partial<CreateUserInput>; // every field optional — a PATCH body
type PublicProfile = Readonly<Omit<User, 'passwordHash'>>; // they compose
```

| Utility                        | ফল                            | যেদিকে খেয়াল রাখবেন                              |
| ------------------------------ | ----------------------------- | ---------------------------------------------- |
| `Partial`, `Required`, `Readonly` | প্রতিটি property-এর modifier বদলায় | তিনটিই **shallow**                      |
| `Pick<T, K>`                   | তালিকার key-গুলো রাখে          | যে key নেই, সেটা দিলে error                       |
| `Omit<T, K>`                   | তালিকার key-গুলো সরায়          | যে key নেই, সেটা **চুপচাপ উপেক্ষা করা হয়**         |
| `Record<K, V>`                 | `K` key-ওয়ালা একটি object     | Literal union-এর ওপর হলে, প্রতিটি member থাকতেই হবে |

`Pick`/`Omit`-এর এই অসমতা গুরুত্বপূর্ণ। `Omit<User, 'pasword'>` compile হয়, আর নিঃশব্দে কিছুই বাদ দেয় না। তাই
একটি field-এর নাম বদলালে একটি ফাঁক থেকে যায়। `Pick` একই typo ধরে ফেলে। `passwordHash`-এর মতো কিছু সরাতে চাইলে
এজন্যই এটা বেছে নেওয়া ভালো।

একটি literal union-এর ওপর `Record<Status, string>` বিনা খরচে একটি exhaustiveness check। একটি status যোগ করুন,
আর label map compile হবে না। `Record<string, T>` ঠিক উল্টো, কারণ এটা key check করা ছেড়ে দেয়।

### বের করে আনা আর ছেঁকে নেওয়া

```typescript
type AuthPayload = ReturnType<typeof getAuthPayload>; // `typeof` turns a value into a type
type Args = Parameters<typeof createPost>; // a labelled tuple
type Fetched = Awaited<ReturnType<typeof fetchUser>>; // User, not Promise<User>

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Mutating = Exclude<HttpMethod, 'GET'>; // 'POST' | 'PUT' | 'DELETE'
type Definite = NonNullable<User | null>; // User
```

`Exclude` আর `Extract` কাজ করে **union member**-এর ওপর। `Omit` আর `Pick` কাজ করে **object key**-এর ওপর। ভুল
জোড়াটা ধরা এখানে সবচেয়ে সাধারণ গুলিয়ে ফেলা।

### Mapped type

একটি mapped type একটি type-এর key-গুলোর ওপর iterate করে, আর প্রতিটিকে বদলে দেয়। `Partial` আক্ষরিক অর্থেই
`{ [K in keyof T]?: T[K] }`। এটা জানা থাকলে আপনি সেই variant-টি লিখতে পারবেন, যেটা standard library-তে নেই।

```typescript
// Per-field form state — one rule instead of a hand-written twin type
type FormFields<T> = {
  [K in keyof T]: { value: T[K]; dirty: boolean; error?: string };
};

// Key remapping rewrites the key itself
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// Getters<{ name: string }> is { getName: () => string }
```

### Conditional type আর `infer`

`T extends U ? X : Y` হলো একটি branch। যে pattern মেলানো হচ্ছে, `infer` তার ভেতর থেকে একটি type ধরে আনে।

```typescript
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;
type Unpacked<T> = T extends Promise<infer U> ? U : T;

// This is how the standard library builds ReturnType
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never;
```

Conditional type একটি naked type parameter-এর (খালি `T`, অন্য type-এ মোড়ানো নয়) ওপর **distribute** করে, আর এটা
মানুষকে অবাক করে।
`ArrayElement<string[] | number[]>` হলো `string | number`, কারণ condition-টি প্রতিটি member-এর ওপর আলাদাভাবে চলে।
এটাই `Exclude`-কে কাজ করায়। Union-টিকে একটি জিনিস হিসেবে দেখতে চাইলে parameter-টিকে একটি tuple-এ মুড়ে দিন,
যেমন `[T] extends [U]`।

### Template literal type

Pattern থেকে বানানো string type, ঢিলেঢালা string পাঠানো API-গুলোকে checked API-তে বদলে দেয়:

```typescript
type Route = `/${'users' | 'posts'}` | `/${'users' | 'posts'}/:id`;

type AppEvents = {
  'user:login': { userId: number };
  'order:placed': { orderId: string; total: number };
};

function emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {}

emit('user:login', { userId: 1 }); // ✅
emit('user:login', { userId: '1' }); // ❌ wrong payload for this event
```

Combination গুণ হয়ে বাড়ে। চারটি করে member-এর দুটি union দেয় ষোলোটি type, সেটা ঠিক আছে। দশটি করে member-এর
চারটি union দেয় দশ হাজার, আর compiler সেটা জানিয়ে দেবে।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                          | কী ব্যবহার করবেন                     | কেন                                          |
| ------------------------------------------------ | --------------------------------- | -------------------------------------------- |
| একটি PATCH endpoint-এর body                       | `Partial<Model>`                  | প্রতিটি field optional, কোনোটা বানানো নয়      |
| এমন API view, যেটা কোনো field leak করতে পারবে না    | `Pick<Model, …>`                  | Key তালিকায় typo হলে build fail করে           |
| এমন lookup, যেটা প্রতিটি union member ঢাকতে হবে     | `Record<Union, V>`                | কোনো member বাদ পড়লে compile error           |
| এমন wrapper, যেটা একটি function-এর shape মেলাতে হবে | `Parameters` আর `ReturnType`      | Wrapper মূলটা থেকে সরে যেতে পারে না            |
| Event-এর নাম, route path, i18n key                | Template literal type             | String-এর typo compile error হয়ে যায়          |
| ঠিক এক জায়গায় ব্যবহার হওয়া একটি shape              | পুরোটা হাতে লিখে ফেলুন              | হিসাব করা type চিরকাল পাঠকের সময় খায়          |

## সাধারণ ভুল

**❌ Typo ধরার জন্য `Omit`-এর ওপর ভরসা করা।** এটা এমন key-ও মেনে নেয়, যেগুলো নেই। যেখানে ভুল হলে একটি field leak
হয়, সেখানে `Pick` বেছে নিন।

**❌ `typeof` ভুলে যাওয়া।** `ReturnType<getAuthPayload>` একটি error। Argument-টি অবশ্যই একটি *type* হতে হবে:
`ReturnType<typeof getAuthPayload>`।

**❌ ধরে নেওয়া যে `Readonly` বা `Partial` গভীরে যায়।** এগুলো শুধু ওপরের স্তরে কাজ করে।
`Readonly<Config>` দিলেও `config.db.host` লেখা যায়।

**❌ ভুলে যাওয়া যে conditional type distribute করে।** যে check আপনি পুরো union-এর জন্য চেয়েছিলেন, সেটা প্রতিটি
member-এর জন্য আলাদা চলে। একটিমাত্র check চাইলে `[T] extends [U]` ব্যবহার করুন।

**❌ এত চালাক type বানানো যে সেটা পড়াই যায় না।** তিনটি `infer` অবস্থানওয়ালা পাঁচ লাইনের একটি conditional type
হলো maintenance-এর খরচ। বিকল্প যদি একটু duplication হয়, duplication-টাই নিন।

> ⚠️ একটি update object-এ `Partial<T>` একটি সত্যিকারের অস্পষ্টতা লুকিয়ে রাখে। `{ bio: undefined }` মানে "field-টি
> খালি করো", আর `{}` মানে "এটা যেমন আছে থাক"। `Partial` দুটোকে একই type দেয়। API-র কাছে পার্থক্যটা জরুরি হলে,
> সেটা স্পষ্টভাবে model করুন।

> ⚠️ গভীরভাবে recursive type compiler-এর instantiation limit-এ গিয়ে ঠেকে। এগুলো প্রতিটি build আর editor-এর
> প্রতিটি keystroke ধীর করে দেয়। `tsc --generateTrace` যদি আপনার কোনো helper-এর দিকে আঙুল তোলে, limit না বাড়িয়ে
> helper-টি সরল করুন।

## 🔑 মূল শিক্ষা

- একটি model থেকে type বের করলে create, update আর view shape-গুলো একে অপরের থেকে সরে যায় না।
- `Pick` অস্তিত্বহীন key প্রত্যাখ্যান করে, আর `Omit` সেটা উপেক্ষা করে — যেখানে ভুল হলে data leak হয়, সেখানে `Pick` নিন।
- `Exclude` আর `Extract` union member ছাঁকে; `Omit` আর `Pick` object key ছাঁকে।
- Mapped type iterate করে, conditional type branch করে, আর `infer` pattern-match করে — প্রতিটি utility type এগুলো দিয়েই তৈরি।
- Conditional type একটি naked type parameter-এর ওপর distribute করে; থামাতে চাইলে সেটাকে একটি tuple-এ মুড়ে দিন।

## Interview-এর প্রশ্ন

**Q: দিক ছাড়া `Pick` আর `Omit`-এর মধ্যে পার্থক্য কী?**

`Pick` তার key-গুলোকে `keyof T`-তে সীমাবদ্ধ রাখে, তাই বানান ভুল হলে compile error হয়। `Omit` যেকোনো key মেনে নেয়,
তাই বানান ভুল হলে কিছুই বাদ পড়ে না। দিক ঠিক করে কোনটা লিখতে ছোট। আর অসমতা ঠিক করে কোনটা বেশি নিরাপদ, যখন
ঝুঁকি হলো এমন একটি field বেরিয়ে যাওয়া, যেটা আপনি সরাতে চেয়েছিলেন।

**Q: `infer` কী করে?**

এটা একটি conditional type-এর pattern-এর ভেতর থেকে একটি type ধরে আনে, আর true branch-এর জন্য সেটার একটি নাম দেয়।
`T extends Promise<infer U> ? U : T` যেকোনো promise মেলায়, আর তার resolved type ফেরত দেয়।
`ReturnType`, `Parameters` আর `Awaited` — সবগুলোই এর ওপর তৈরি।

**Q: Conditional type-এ distribution কী, আর এটা কখন বিপদে ফেলে?**

যখন check করা type একটি naked type parameter, আর argument একটি union, তখন condition-টি প্রতিটি member-এর ওপর চলে।
তারপর ফলগুলো জোড়া লাগে। এটাই `Exclude` আর `NonNullable`-কে কাজ করায়। বিপদে ফেলে তখন, যখন আপনি পুরো union-এর
ওপর একটিমাত্র check চেয়েছিলেন। `[T] extends [U]` এটা বন্ধ করে।

**Q: কখন আপনি একটি update type-এর জন্য `Partial` ব্যবহার করবেন না?**

যখন "field নেই" আর "field খালি করা হয়েছে" আলাদা করে চেনা দরকার, কারণ `Partial` দুটোকে মিশিয়ে দেয়। আর যখন
update-এ কিছু field আবশ্যিক, যেমন optimistic locking-এর জন্য একটি version number।
`Partial<Pick<T, …>> & { version: number }` সেটা বলে, `Partial<T>` বলে না।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript Generics](#ch-generics) — এই হিসাবগুলো যে constraint-এর ওপর নির্ভর করে
- [Chapter ?? — Interface ও Type Alias](#ch-interfaces-types) — যে model থেকে আপনি type বের করেন
- [Chapter ?? — বড় পরিসরে TypeScript](#ch-typescript-at-scale) — যখন একটি type যা দেয়, তার চেয়ে বেশি খরচ করতে শুরু করে
