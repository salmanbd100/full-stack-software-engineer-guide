---
sourceHash: "23c60b55be56d49729cb4b920f2e00e78de6c85fe6f9511dca4f2eb084c368c1"
title: "TypeScript Generics"
translatedAt: "2026-10-12T07:46:50.349Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript Generics {#ch-generics}

> একটি function একবার লিখুন, আর caller-এর নিখুঁত type পুরো পথ জুড়ে ধরে রাখুন।

**এই অধ্যায়ে:** generic function · generic interface · `extends` দিয়ে constraint · inference · কখন generic বাড়াবাড়ি

## 💡 মূল ধারণা

Generic হলো type-গুলোর মধ্যে একটি **সম্পর্ক**, "যেকোনো type"-এর placeholder নয়। `T[] → T` বলে, যে element
type বেরিয়ে আসছে, সেটা ঢোকা element type-ই। পুরো মূল্যটাই এই সম্পর্কে। Caller-এর concrete type call-এর
পরেও টিকে থাকে, তাই `first([1, 2])` হয় `number | undefined`, `any` নয়। যে type parameter একটি signature-এ
মাত্র একবার আসে, সেটা কোনো সম্পর্ক প্রকাশ করে না। প্রায় নিশ্চিতভাবেই সেটা ভুল হাতিয়ার।

## কীভাবে কাজ করে

```typescript
// ❌ `any` loses the type on the way through
function firstAny(arr: any[]): any {
  return arr[0];
}
firstAny([1, 2]).toUpperCase(); // compiles; crashes

// ✅ the generic ties output to input
function first<T>(arr: readonly T[]): T | undefined {
  return arr[0];
}
first([1, 2]).toUpperCase(); // ❌ number has no toUpperCase — caught
```

দুই বা তার বেশি parameter একাধিক জায়গার মধ্যে সম্পর্ক প্রকাশ করে:

```typescript
function mapArray<T, U>(arr: readonly T[], transform: (item: T) => U): U[] {
  return arr.map(transform);
}

const names = mapArray(users, (u) => u.name); // string[] — U inferred from the callback
```

### Generic interface ও class

```typescript
interface Repository<T> {
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
}

class UserRepository implements Repository<User> {} // T is fixed once, for every member
```

Interface-এ parameter-এর নাম একবার দিলে প্রতিটি member সামঞ্জস্যপূর্ণ থাকে। `create` ভুল করে
`findById`-এর থেকে আলাদা কোনো entity নিতে পারে না।

### Constraint

`extends` ঠিক করে দেয়, একটি type parameter কী হতে পারে। এর জন্যই ভেতরে মানটা আসলে ব্যবহার করা যায়:

```typescript
// without the constraint, `item.name` would not compile
function logName<T extends { name: string }>(item: T): void {
  console.log(item.name);
}
```

দৈনন্দিন code-এ সবচেয়ে গুরুত্বপূর্ণ constraint হলো `keyof`, কারণ এটা property access-কে type-safe
করে:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'Alice' };
getProperty(user, 'name'); // string
getProperty(user, 'nope'); // ❌ not a key of user
```

Return type-টা খেয়াল করুন: `T[K]`, একটি **indexed access type**, সব value type-এর union নয়। এজন্যই
`getProperty(user, 'id')` হয় `number`, `number | string` নয়।

### Default

```typescript
interface FormField<T = string> {
  value: T;
  touched: boolean;
}

const email: FormField = { value: '', touched: false }; // T = string
const age: FormField<number> = { value: 0, touched: false };
```

### Inference

TypeScript call থেকেই type argument infer করে, তাই আপনাকে কদাচিৎ লিখতে হয়। স্পষ্টভাবে একটি দিন তখন, যখন
infer করার মতো কিছু নেই — যেমন একটি parameter, যেটা শুধু return type-এ আসে:

```typescript
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const user = await fetchJson<User>('/api/users/1'); // nothing in the args reveals T
```

এই signature কী **করে না**, সেটা পরিষ্কার জেনে রাখুন: body-টা যে একটি `User`, তা এটা validate করে না।
`fetchJson<T>` হলো generic-এর পোশাক পরা একটি assertion। যে সীমানা আপনার নিয়ন্ত্রণে নেই, সেখানে এর সঙ্গে
একটি runtime schema check জুড়ে দিন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                        | যা ব্যবহার করবেন              | কেন                                              |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------ |
| Return type একটি argument-এর type-এর ওপর নির্ভর করে | একটি generic function       | সম্পর্কটাই আসল কথা                               |
| একাধিক entity-তে পুনর্ব্যবহৃত একটি container বা wrapper | একটি generic interface বা class | একটি declaration প্রতিটি member-কে সামঞ্জস্যপূর্ণ রাখে |
| Key দিয়ে property access                         | `K extends keyof T`, ফেরত দেয় `T[K]` | Typo fail করে; ঠিক value type-টাই ফিরে আসে |
| একই shape নেয় এমন কয়েকটি function              | একটি সাধারণ `interface` parameter | প্রকাশ করার মতো কোনো সম্পর্ক নেই — generic শুধু গোলমাল বাড়ায় |
| Type-হীন বাইরের data                             | `unknown` আর validation       | এখানে generic শুধু assert করে, check করে না      |

**একটি `Result` type হলো সেই সাধারণ ক্ষেত্র, যেটা মুখস্থ রাখার মতো:**

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
```

## সাধারণ ভুল

**❌ একবার ব্যবহৃত একটি type parameter।** এটা কিছুর সঙ্গে কিছুর সম্পর্ক তৈরি করে না:

```typescript
function log<T>(value: T): void {} // ❌ identical to (value: unknown): void
```

**❌ `any` দিয়ে constrain করা।** `<T extends any>` কিছুই constrain করে না। হয় constraint ছাড়া রাখুন,
নয়তো যে shape আসলে ব্যবহার করেন, সেটা দিয়ে constrain করুন।

**❌ Union-এর বদলে generic ব্যবহার করা।** Function যদি ঠিক তিনটি জানা type সামলায়, তাহলে
`string | number | Date` সেটা সোজাসুজি বলে দেয়। Generic বোঝায় যে এটা যেকোনো কিছুর জন্য চলে।

**❌ `fetchJson<User>()`-কে validation ভাবা।** Type argument compiler-কে বলে কী ধরে নিতে হবে, আর payload
কেউ check করে না। একটি "পুরোপুরি typed" codebase-ও production-এ `undefined is not an object` throw করে —
সবচেয়ে সাধারণ কারণ এটাই।

**❌ অতিরিক্ত parameter দেওয়া।** একটি function-এ চারটি type parameter মানে signature খুব বেশি কাজ করছে।
একে ভাগ করুন, অথবা একটি concrete type নিন।

> ⚠️ Compile time-এ generic মুছে যায়। Runtime-এ `T`-এর ওপর branch করার কোনো উপায় নেই, `new T()` নেই,
> `typeof T`-ও নেই। Runtime-এ যা থাকতেই হবে, সেটা একটি value হিসেবে পাঠাতে হবে।

## 🔑 মূল শিক্ষা

- Generic type-গুলোর মধ্যে একটি সম্পর্ক প্রকাশ করে; একবার ব্যবহৃত parameter কিছুই প্রকাশ করে না।
- Function body-র ভেতরে type parameter-কে ব্যবহারযোগ্য করে তোলে `extends`।
- `T[K]` ফেরত দেওয়া `K extends keyof T` হলো type-safe property access-এর pattern।
- Type argument infer হয় argument থেকে — লিখুন শুধু সেখানে, যেখানে কিছুই infer হয় না।
- Generic return type একটি assertion, validation নয়; বাইরের data runtime-এ check করুন।

## Interview-এর প্রশ্ন

**Q: একটি generic-কে কীভাবে constrain করবেন, আর কেন সেটা দরকার হতে পারে?**

`extends` দিয়ে। Constraint ছাড়া compiler `T` সম্পর্কে কিছুই জানে না, তাই এর কোনো property পড়তে বা
method call করতে পারবেন না। `T extends { id: number }` `item.id` ব্যবহার করতে দেয়;
`K extends keyof T` একটি key argument-কে শুধু বিদ্যমান key-তে সীমাবদ্ধ রাখে।

**Q: কখন generic ভুল হাতিয়ার?**

যখন type parameter একবারই আসে — মানে এটা কোনো সম্পর্ক প্রকাশ করে না, আর `unknown`-ই যথেষ্ট। যখন
type-গুলোর সেট ছোট আর জানা — সেখানে union বেশি পরিষ্কার। আর যখন আসল প্রয়োজন runtime validation, কারণ
generic return type compiler-কে শুধু বলে কী ধরে নিতে হবে।

**Q: `(obj: object, key: string): unknown`-এর তুলনায় `function getProperty<T, K extends keyof T>(obj: T, key: K): T[K]` কী সুবিধা দেয়?**

দুটি জিনিস। Object-এ নেই এমন একটি key runtime-এ `undefined` ফেরত না দিয়ে compile-এই fail করে। আর return
type হয় ঠিক সেই property-র type, তাই call site-এ কোনো cast বা narrowing লাগে না।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — standard library যে generic-গুলো আগে থেকেই দেয়, আর তাদের পেছনের conditional ও mapped type
- [Chapter ?? — TypeScript Type Guard](#ch-type-guards) — generic যা শুধু ধরে নেয়, সেটা validate করা
