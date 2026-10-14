---
sourceHash: "23c60b55be56d49729cb4b920f2e00e78de6c85fe6f9511dca4f2eb084c368c1"
title: "TypeScript Generics"
translatedAt: "2026-10-14T04:29:52.180Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript Generics {#ch-generics}

> Function একবার লিখুন, আর caller-এর আসল type-টা শুরু থেকে শেষ পর্যন্ত অটুট রাখুন।

**এই অধ্যায়ে:** generic function · generic interface · `extends` দিয়ে constraint · inference · কখন generic বাড়াবাড়ি

## 💡 মূল ধারণা

Generic হলো type-গুলোর মধ্যে একটা **সম্পর্ক**, "যেকোনো type"-এর জায়গা ভরাট করার কিছু নয়। `T[] → T` বলছে, যে
element type ভেতরে ঢুকেছে, বেরোবেও সেই type। পুরো লাভটা এই সম্পর্কেই। Call-এর পরেও caller-এর আসল type টিকে
থাকে, তাই `first([1, 2])`-এর type হয় `number | undefined`, `any` নয়। Signature-এ কোনো type parameter মাত্র একবার
এলে সেটা কোনো সম্পর্কই বোঝায় না। তখন প্রায় নিশ্চিতভাবেই আপনি ভুল জিনিস হাতে নিয়েছেন।

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

দুই বা ততোধিক parameter থাকলে একাধিক জায়গার মধ্যে সম্পর্ক বোঝানো যায়:

```typescript
function mapArray<T, U>(arr: readonly T[], transform: (item: T) => U): U[] {
  return arr.map(transform);
}

const names = mapArray(users, (u) => u.name); // string[] — U inferred from the callback
```

### Generic interface আর class

```typescript
interface Repository<T> {
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
}

class UserRepository implements Repository<User> {} // T is fixed once, for every member
```

Parameter-এর নাম interface-এ একবার দিলে প্রতিটি member একই type মেনে চলে। ফলে `create` ভুল করেও `findById`-এর
থেকে আলাদা কোনো entity নিতে পারে না।

### Constraint

`extends` ঠিক করে দেয় type parameter কী কী হতে পারবে। এটা থাকলেই function-এর ভেতরে value-টা সত্যিকারভাবে কাজে
লাগানো যায়:

```typescript
// without the constraint, `item.name` would not compile
function logName<T extends { name: string }>(item: T): void {
  console.log(item.name);
}
```

রোজকার code-এ সবচেয়ে কাজের constraint হলো `keyof`, কারণ এটা property পড়াকে type-safe করে দেয়:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'Alice' };
getProperty(user, 'name'); // string
getProperty(user, 'nope'); // ❌ not a key of user
```

Return type-টা খেয়াল করুন: `T[K]`, যাকে বলে **indexed access type**। এটা সব value type-এর union নয়। এজন্যই
`getProperty(user, 'id')`-এর type হয় `number`, `number | string` নয়।

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

TypeScript call দেখেই type argument বের করে নেয়, তাই এগুলো খুব কমই নিজে লিখতে হয়। নিজে দিতে হয় তখন, যখন বের
করার মতো কিছু নেই। যেমন, parameter-টা শুধু return type-এ আছে:

```typescript
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const user = await fetchJson<User>('/api/users/1'); // nothing in the args reveals T
```

তবে এই signature যা করে **না**, সেটা পরিষ্কার জেনে রাখুন: body-টা সত্যিই `User` কিনা, তা এটা যাচাই করে না।
`fetchJson<T>` আসলে generic-এর পোশাক পরা একটা assertion। যে boundary আপনার নিয়ন্ত্রণে নেই, সেখানে এর সঙ্গে
runtime-এ schema check জুড়ে দিন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                        | কী ব্যবহার করবেন               | কেন                                              |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------ |
| Return type নির্ভর করে argument-এর type-এর ওপর    | Generic function              | সম্পর্কটাই তো আসল কথা                            |
| নানা entity-তে বারবার ব্যবহার হওয়া container বা wrapper | Generic interface বা class | একটি declaration-এ সব member একই নিয়মে চলে       |
| Key দিয়ে property পড়া                           | `K extends keyof T`, return করে `T[K]` | Typo থাকলে compile হয় না; value-র আসল type ফেরত আসে |
| একই shape নেয় এমন কয়েকটি function               | সাধারণ `interface` parameter  | বোঝানোর মতো কোনো সম্পর্ক নেই — generic শুধু ঝামেলা বাড়ায় |
| Type ছাড়া বাইরের data                           | `unknown`, সঙ্গে validation   | এখানে generic শুধু ধরে নেয়, যাচাই করে না          |

**`Result` type সবচেয়ে বেশি কাজে আসে, এটা মনে রাখার মতো:**

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

**❌ একবারই ব্যবহার হওয়া type parameter।** এটা কোনো কিছুর সঙ্গে কোনো কিছুর সম্পর্ক বোঝায় না:

```typescript
function log<T>(value: T): void {} // ❌ identical to (value: unknown): void
```

**❌ `any` দিয়ে constraint দেওয়া।** `<T extends any>` আসলে কিছুই আটকায় না। হয় constraint ছাড়াই রাখুন, নয়তো
যে shape সত্যিই ব্যবহার করছেন, সেটাই constraint হিসেবে দিন।

**❌ Union-এর জায়গায় generic লেখা।** Function যদি ঠিক তিনটি জানা type সামলায়, তাহলে `string | number | Date`
সোজাসুজি সেটাই বলে। Generic দেখলে মনে হয়, এটা যেকোনো type-এর জন্য চলবে।

**❌ `fetchJson<User>()`-কে validation ভাবা।** Type argument compiler-কে শুধু বলে কী ধরে নিতে হবে, payload কেউ
যাচাই করে না। "পুরোপুরি typed" codebase-ও production-এ `undefined is not an object` throw করে সবচেয়ে বেশি
এই কারণেই।

**❌ অতিরিক্ত parameter।** একটি function-এ চারটি type parameter মানে signature-টা বেশি কাজ করছে। হয় ভেঙে ফেলুন,
নয়তো একটা নির্দিষ্ট type নিন।

> ⚠️ Compile-এর সময় generic মুছে যায়। Runtime-এ `T` দেখে branch করার উপায় নেই, `new T()` নেই,
> `typeof T`-ও নেই। Runtime-এ যা লাগবে, তা value হিসেবে পাঠাতেই হবে।

## 🔑 মূল শিক্ষা

- Generic type-গুলোর মধ্যে সম্পর্ক বোঝায়; একবার ব্যবহার হওয়া parameter কিছুই বোঝায় না।
- `extends` থাকলেই function-এর body-তে type parameter কাজে লাগানো যায়।
- `K extends keyof T` দিয়ে `T[K]` return করাই type-safe ভাবে property পড়ার pattern।
- Type argument আসে argument থেকে inference করে — নিজে লিখুন শুধু যেখানে inference হয় না।
- Generic return type একটা assertion, validation নয়; বাইরের data runtime-এ যাচাই করুন।

## Interview-এর প্রশ্ন

**Q: Generic-এ constraint কীভাবে দেন, আর এটা দরকার হয় কেন?**

`extends` দিয়ে। Constraint না থাকলে compiler `T` সম্পর্কে কিছুই জানে না, তাই তার কোনো property পড়া বা method
call করা যায় না। `T extends { id: number }` দিলে `item.id` পড়া যায়।
`K extends keyof T` দিলে key argument শুধু সেই key-গুলোই নিতে পারে, যেগুলো আসলে আছে।

**Q: কখন generic ভুল সমাধান?**

যখন type parameter মাত্র একবার আসে। তখন এটা কোনো সম্পর্ক বোঝায় না, `unknown` দিয়েই কাজ চলে। যখন type-এর
সংখ্যা কম আর জানা, তখন union বেশি পরিষ্কার। আর যখন আসল দরকার runtime validation, কারণ generic return type
compiler-কে শুধু বলে কী ধরে নিতে হবে।

**Q: `(obj: object, key: string): unknown`-এর চেয়ে `function getProperty<T, K extends keyof T>(obj: T, key: K): T[K]` বাড়তি কী দেয়?**

দুটি জিনিস। Object-এ নেই এমন key দিলে runtime-এ `undefined` ফেরত না এসে compile-ই হয় না। আর return type হয় ঠিক
সেই property-র type, তাই call-এর জায়গায় কোনো cast বা narrowing লাগে না।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — standard library যে generic আগে থেকেই দিয়ে রেখেছে, আর তাদের পেছনের conditional ও mapped type
- [Chapter ?? — TypeScript Type Guard](#ch-type-guards) — generic যা শুধু ধরে নেয়, তা যাচাই করা
