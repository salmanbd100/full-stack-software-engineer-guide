---
sourceHash: "40c0cae4c884dce656fa9ba25a73f6ad9daafed0d0093400c59fd650c01a8e15"
title: "TypeScript-এর Advanced ও Utility Type"
translatedAt: "2026-10-14T04:31:24.388Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript-এর Advanced ও Utility Type {#ch-advanced-types}

> সব type একটি মূল উৎস থেকে বের করুন, এক type থেকে আরেক type হিসাব করে নিন, আর জেনে রাখুন কখন এই ক্ষমতা আর পোষায় না।

**এই অধ্যায়ে:** `Partial`, `Pick`, `Omit` আর `Record` · `ReturnType`, `Exclude` ও তাদের সঙ্গীরা · mapped type আর key remapping · conditional type আর `infer` · template literal type

## 💡 মূল ধারণা

যে type হাতে দুবার লেখেন, একদিন না একদিন দুটি আর মিলবে না। Utility type থাকলে একটি model-ই হয় মূল উৎস, বাকিগুলো
তা থেকে বের হয়: create-এর input, update-এর patch, public view। Model-এ একটি field যোগ করলে বাকি সব type নিজে
থেকেই সঙ্গে আসে।

ভেতরে ভেতরে type system নিজেই একটা ছোট ভাষা। Mapped type loop চালায়, conditional type branch করে, আর `infer`
pattern মিলিয়ে দেখে। প্রতিটি utility type এই ভাষায় লেখা এক line-এর একটা program। Syntax-এর পাশাপাশি শিখুন
**কোথায় থামতে হবে**। যে type পড়তে দশ মিনিট লাগে, তার খরচ সে যে bug আটকায় তার চেয়েও বেশি।

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

### একটি model থেকে নানা shape বের করা

```typescript
type PublicUser = Pick<User, 'id' | 'name' | 'email'>; // keep a few
type CreateUserInput = Omit<User, 'id' | 'passwordHash'> & { password: string }; // remove a few
type UpdateUserInput = Partial<CreateUserInput>; // every field optional — a PATCH body
type PublicProfile = Readonly<Omit<User, 'passwordHash'>>; // they compose
```

| Utility                        | কী করে                         | কোথায় সাবধান                                    |
| ------------------------------ | ----------------------------- | ---------------------------------------------- |
| `Partial`, `Required`, `Readonly` | প্রতিটি property-র modifier বদলায় | তিনটিই **shallow**                          |
| `Pick<T, K>`                   | তালিকার key-গুলো রাখে          | নেই এমন key দিলে error                         |
| `Omit<T, K>`                   | তালিকার key-গুলো বাদ দেয়        | নেই এমন key দিলে **চুপচাপ উপেক্ষা করে**          |
| `Record<K, V>`                 | `K` key-ওয়ালা object           | Literal union-এর ওপর হলে প্রতিটি member থাকতেই হবে |

`Pick` আর `Omit`-এর এই অসমতা গুরুত্বপূর্ণ। `Omit<User, 'pasword'>` compile হয়ে যায়, আর চুপচাপ কিছুই বাদ দেয়
না। তাই কোনো field-এর নাম বদলালে একটা ফাঁক থেকে যায়। একই typo `Pick` ধরে ফেলে। `passwordHash`-এর মতো কিছু
সরাতে হলে এটাকেই বেছে নেওয়ার কারণ সেটাই।

Literal union-এর ওপর `Record<Status, string>` বিনা খরচে exhaustiveness check দেয়। নতুন status যোগ করলে label map
আর compile হয় না। `Record<string, T>` ঠিক উল্টো, কারণ এতে key-র কোনো check থাকে না।

### বের করা আর ছেঁকে ফেলা

```typescript
type AuthPayload = ReturnType<typeof getAuthPayload>; // `typeof` turns a value into a type
type Args = Parameters<typeof createPost>; // a labelled tuple
type Fetched = Awaited<ReturnType<typeof fetchUser>>; // User, not Promise<User>

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Mutating = Exclude<HttpMethod, 'GET'>; // 'POST' | 'PUT' | 'DELETE'
type Definite = NonNullable<User | null>; // User
```

`Exclude` আর `Extract` কাজ করে **union member**-এর ওপর। `Omit` আর `Pick` কাজ করে **object key**-এর ওপর। এখানে
সবচেয়ে বেশি গোলমাল হয় ভুল জোড়াটা হাতে নিয়ে।

### Mapped type

Mapped type কোনো type-এর key-গুলোর ওপর দিয়ে loop চালায়, আর প্রতিটিকে বদলে দেয়। `Partial` আক্ষরিক অর্থেই
`{ [K in keyof T]?: T[K] }`। এটা জানা থাকলে standard library-তে নেই এমন variant নিজেই লিখে নিতে পারবেন।

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

`T extends U ? X : Y` একটা branch। আর যে pattern মেলানো হচ্ছে, তার ভেতর থেকে একটি type ধরে আনে `infer`।

```typescript
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;
type Unpacked<T> = T extends Promise<infer U> ? U : T;

// This is how the standard library builds ReturnType
type MyReturnType<T> = T extends (...args: never[]) => infer R ? R : never;
```

Naked type parameter-এর ওপর (মানে অন্য কোনো type-এ মোড়ানো নয়, খালি `T`) conditional type **distribute** করে।
এটা অনেককেই অবাক করে। `ArrayElement<string[] | number[]>`-এর ফল `string | number`, কারণ condition-টা প্রতিটি
member-এর ওপর আলাদা করে চলে। `Exclude` কাজ করে এই কারণেই। Union-টাকে একটি জিনিস হিসেবে দেখতে চাইলে parameter-টা
tuple-এ মুড়ে দিন, যেমন `[T] extends [U]`।

### Template literal type

Pattern দিয়ে বানানো string type থাকলে, যে API আলগা string নেয়, সেটাও check হওয়া API হয়ে যায়:

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

তবে combination গুণ হয়ে বাড়ে। চারটি করে member-এর দুটি union থেকে ষোলোটি type হয়, তাতে সমস্যা নেই। দশটি করে
member-এর চারটি union থেকে হয় দশ হাজার, আর compiler তখন আপত্তি জানাবে।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                        | কী ব্যবহার করবেন                   | কেন                                          |
| ------------------------------------------------ | --------------------------------- | -------------------------------------------- |
| PATCH endpoint-এর body                           | `Partial<Model>`                  | সব field optional, বানানো কিছু নেই           |
| এমন API view, যেখান থেকে কোনো field ফাঁস হওয়া চলবে না | `Pick<Model, …>`              | Key-র তালিকায় typo থাকলে build ভাঙে           |
| এমন lookup, যাতে union-এর প্রতিটি member থাকতে হবে | `Record<Union, V>`                | কোনো member বাদ পড়লে compile error           |
| এমন wrapper, যার shape কোনো function-এর সঙ্গে মিলতে হবে | `Parameters` আর `ReturnType` | Wrapper মূল function থেকে সরে যেতে পারে না    |
| Event-এর নাম, route path, i18n key               | Template literal type             | String-এর typo compile error হয়ে যায়         |
| এমন shape, যা ঠিক এক জায়গায় লাগে                | পুরোটা হাতে লিখে ফেলুন              | হিসাব করে বানানো type পাঠকের সময় চিরকাল খায়   |

## সাধারণ ভুল

**❌ ভরসা করা যে `Omit` typo ধরবে।** নেই এমন key-ও এটা মেনে নেয়। যেখানে একটা ভুলে field ফাঁস হতে পারে, সেখানে
`Pick` নিন।

**❌ `typeof` দিতে ভুলে যাওয়া।** `ReturnType<getAuthPayload>` লিখলে error হয়। Argument-টা হতে হবে একটা *type*:
`ReturnType<typeof getAuthPayload>`।

**❌ ধরে নেওয়া যে `Readonly` বা `Partial` ভেতর পর্যন্ত যাবে।** এরা কাজ করে শুধু ওপরের স্তরে।
`Readonly<Config>` দিলেও `config.db.host` বদলানো যায়।

**❌ ভুলে যাওয়া যে conditional type distribute করে।** যে check পুরো union-এর জন্য ভেবেছিলেন, সেটা চলে প্রতিটি
member-এ আলাদা করে। একটিমাত্র check চাইলে `[T] extends [U]` লিখুন।

**❌ এত চালাক type বানানো যে পড়াই যায় না।** তিনটি `infer` সহ পাঁচ line-এর conditional type রক্ষণাবেক্ষণের একটা
খরচ। বিকল্প যদি হয় সামান্য duplication, তাহলে duplication-ই নিন।

> ⚠️ Update object-এ `Partial<T>` একটা সত্যিকারের দ্ব্যর্থতা লুকিয়ে ফেলে। `{ bio: undefined }` মানে "field-টা
> খালি করে দাও", আর `{}` মানে "যেমন আছে থাক"। অথচ `Partial`-এর চোখে দুটি একই type। API-র কাছে এই পার্থক্যের
> মানে থাকলে সেটা আলাদা করে model করুন।

> ⚠️ খুব গভীর recursive type compiler-এর instantiation limit ছুঁয়ে ফেলে। প্রতিটি build আর editor-এ প্রতিটি
> keystroke তাতে ধীর হয়ে যায়। `tsc --generateTrace` যদি আপনার কোনো helper-এর দিকে আঙুল তোলে, limit না বাড়িয়ে
> helper-টাকে সহজ করুন।

## 🔑 মূল শিক্ষা

- একটি model থেকে type বের করলে create, update আর view-এর shape আলাদা হয়ে যায় না।
- নেই এমন key `Pick` বাতিল করে আর `Omit` উপেক্ষা করে — যেখানে ভুলে data ফাঁস হয়, সেখানে `Pick` নিন।
- `Exclude` আর `Extract` union member ছাঁকে; `Omit` আর `Pick` ছাঁকে object key।
- Mapped type loop চালায়, conditional type branch করে, `infer` pattern মেলায় — প্রতিটি utility type এগুলো দিয়েই তৈরি।
- Naked type parameter-এর ওপর conditional type distribute করে; বন্ধ করতে tuple-এ মুড়ে দিন।

## Interview-এর প্রশ্ন

**Q: দিক ছাড়া `Pick` আর `Omit`-এর মধ্যে পার্থক্য কী?**

`Pick` তার key-গুলোকে `keyof T`-এর মধ্যে আটকে রাখে, তাই বানান ভুল হলে compile error হয়। `Omit` যেকোনো key নেয়,
তাই বানান ভুল হলে কিছুই বাদ পড়ে না। কোনটা লিখতে ছোট হবে, তা ঠিক করে দিক। কিন্তু যেখানে ঝুঁকি হলো সরাতে চাওয়া
field বাইরে চলে যাওয়া, সেখানে কোনটা নিরাপদ, তা ঠিক করে এই অসমতা।

**Q: `infer` কী করে?**

Conditional type-এর pattern-এর ভেতর থেকে একটি type ধরে আনে, আর true branch-এর জন্য তাকে একটি নাম দেয়।
`T extends Promise<infer U> ? U : T` যেকোনো promise মেলায় আর তার resolve হওয়া type ফেরত দেয়।
`ReturnType`, `Parameters` আর `Awaited` সবগুলো এর ওপরেই তৈরি।

**Q: Conditional type-এ distribution কী, আর এটা কখন বিপদে ফেলে?**

যাচাই করা type যদি naked type parameter হয় আর argument হয় union, তাহলে condition প্রতিটি member-এ চলে, আর
ফলগুলো জোড়া লাগে। `Exclude` আর `NonNullable` কাজ করে এভাবেই। বিপদ হয় তখন, যখন আপনি পুরো union-এর ওপর একটিমাত্র
check চেয়েছিলেন। `[T] extends [U]` লিখলে distribution বন্ধ হয়।

**Q: কখন update type-এর জন্য `Partial` ব্যবহার করবেন না?**

যখন "field নেই" আর "field খালি করা হয়েছে" আলাদা করে চিনতে হবে, কারণ `Partial` দুটিকে মিলিয়ে ফেলে। আর যখন update-এ
কিছু field বাধ্যতামূলক, যেমন optimistic locking-এর জন্য version number।
`Partial<Pick<T, …>> & { version: number }` সেটা বলে, `Partial<T>` বলে না।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript Generics](#ch-generics) — এই হিসাবগুলো যে constraint-এর ওপর দাঁড়িয়ে
- [Chapter ?? — Interface ও Type Alias](#ch-interfaces-types) — যে model থেকে type বের করবেন
- [Chapter ?? — বড় পরিসরে TypeScript](#ch-typescript-at-scale) — কখন একটি type যা দেয় তার চেয়ে বেশি খরচ করতে শুরু করে
