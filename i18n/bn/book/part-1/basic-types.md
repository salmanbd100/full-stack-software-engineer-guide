---
sourceHash: "ce9627be0ace90ca2ef1025889569b5b7c05f951bd80bb043e67fe3bb597a381"
title: "TypeScript-এর Basic Type, Literal ও Enum"
translatedAt: "2026-10-13T12:14:19.998Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript-এর Basic Type, Literal ও Enum {#ch-basic-types}

> Inference যেখানে পৌঁছায় না, শুধু সেখানেই annotate করুন। `any`, `unknown` আর `never`-এর প্রতিটির দাম জানুন। আর কেউ চায়নি এমন runtime object ship না করেই কয়েকটি নির্দিষ্ট value-এর একটি set model করুন।

**এই অধ্যায়ে:** annotation বনাম inference · `any` বনাম `unknown` বনাম `never` · array, tuple আর function · literal union বনাম `as const` বনাম `enum` · runtime-এ আসলে কী থাকে

## 💡 মূল ধারণা

TypeScript-এর type system থাকে compile time-এ, আর runtime-এ মুছে যায়। এর গড়নটা এই একটি তথ্য থেকেই বোঝা যায়।
Code চলার আগে সে আপনার code নিয়ে অনেক কিছু প্রমাণ করতে পারে, কিন্তু চলা শুরু হলে আর কিছুই নয়। তাই ভালো TypeScript
type বসায় সেখানে, যেখানে compiler নিজে বের করতে পারে না: function-এর boundary-তে আর বাইরে থেকে আসা data-য়। বাকি
জায়গায় চুপ থাকে, কারণ উত্তরটা inference আগেই জানে।

"এই পাঁচটি value-এর একটি" কীভাবে model করবেন, সেটাও ঠিক হয় এই তথ্য দিয়ে। Literal union থাকে শুধু compile time-এ।
`as const` object একটি সাধারণ object, যার ওপর iterate করা যায়। `enum` হলো generate করা code। Runtime-এ value-গুলো
লাগবে কি না, তা দেখে বেছে নিন।

## কীভাবে কাজ করে

`number` integer আর float দুটিই ধরে। `bigint` এর সঙ্গে মেশে না। `null` মানে ইচ্ছে করে কিছু নেই, আর `undefined` মানে
এখনো কিছু বসানো হয়নি। এই দুটির আলাদা মানে তৈরি করে `strictNullChecks`। এটা না থাকলে দুটিই যেকোনো type-এ ঢুকে পড়ে,
আর runtime-এর সবচেয়ে সাধারণ error-টাই compiler ধরতে পারে না।

### Annotation বনাম inference

```typescript
// ✅ let inference do it — the value states the type
let count = 0; // number
const status = 'pending'; // 'pending', a literal type, because it is const

// ✅ annotate where inference cannot reach
function createUser(name: string, role: 'admin' | 'user' = 'user'): User { /* … */ }
const parsed: unknown = JSON.parse(raw); // external data has no knowable type
```

Annotate করুন **function-এর parameter আর export করা return type**, local variable inference-এর হাতে ছেড়ে দিন।
Public function-এ return annotation থাকলে contract-টা স্থির থাকে। ফলে body-র ভেতরে কিছু বদলালে error আসে সেখানেই,
প্রতিটি call site-এ ছড়িয়ে নয়।

### `any`, `unknown`, `never`

|                   | `any`                               | `unknown`               | `never`                              |
| ----------------- | ----------------------------------- | ----------------------- | ------------------------------------ |
| কী নেয়           | সবকিছু                          | সবকিছু              | কিছুই না                              |
| আপনি যা করতে পারেন             | যা খুশি                         | Narrow করার আগে কিছুই না  | —                                    |
| মানে             | "যাচাই বন্ধ করো"                     | "পরে যাচাই হবে"         | "এটা ঘটতেই পারে না"                 |
| কখন ব্যবহার করবেন | JavaScript থেকে migrate করার সময়, অনিচ্ছায় | বাইরের data parse করতে   | Exhaustiveness, যে function throw করে |

`never`-এর আসল কাজ **exhaustiveness check**-এ। Union-ওয়ালা codebase-এ compile time-এর সবচেয়ে কাজের পাহারা এটাই:

```typescript
type Status = 'active' | 'inactive' | 'banned';

function label(status: Status): string {
  switch (status) {
    case 'active':
      return 'Welcome back';
    case 'inactive':
      return 'Paused';
    case 'banned':
      return 'Access denied';
    default: {
      // A fourth Status makes this line fail to compile, instead of falling through at runtime
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
```

### Array, tuple আর function

```typescript
const frozen: readonly string[] = ['a']; // no push, no sort, no splice — free, and enforced

// A tuple fixes the length and the type at each position
function parseRow(row: string): [id: number, name: string] {
  const [id, name] = row.split(',');
  return [Number(id), name];
}

type EventHandler<T = void> = (event: T) => void; // a named function type keeps prop signatures readable
```

### "এই value-গুলোর একটি" বলার তিনটি উপায়

**Literal union-এর কোনো দাম নেই, আর আপনার API যে string পাঠায় তার সঙ্গে হুবহু মেলে:**

```typescript
type UserRole = 'admin' | 'user' | 'guest';
setRole(1, 'admin'); // ✅
setRole(1, 'superuser'); // ❌ not a valid role
```

**`as const` object থেকে একটিই declaration-এ list আর type দুটিই পাওয়া যায়:**

```typescript
const OrderStatus = {
  Pending: 'pending',
  Shipped: 'shipped',
} as const;

type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]; // 'pending' | 'shipped'

Object.values(OrderStatus); // ✅ iterable — for a dropdown or a validation list
setStatus('ord_1', 'shipped'); // ✅ the raw string from JSON works too
```

**`enum` হলো generate করা code, আর string enum কাঁচা value নেয় না:**

```typescript
enum LogLevel {
  Error = 'ERROR',
  Info = 'INFO',
}
log(LogLevel.Info, 'started'); // ✅
log('INFO', 'started'); // ❌ string enums are nominal
```

| বৈশিষ্ট্য                                         | Literal union | `as const` object | `enum`                   |
| ------------------------------------------------ | ------------- | ----------------- | ------------------------ |
| Runtime-এ কী তৈরি হয়                                   | কিছুই না          | একটি সাধারণ object    | Generate করা একটি object       |
| Value-গুলোর ওপর iterate করা                               | ❌             | ✅                 | ✅                        |
| কাঁচা string নেয়                           | ✅             | ✅                 | ❌                        |
| Type মুছে দেওয়া runtime-এ চলে              | ✅             | ✅                 | ❌                        |

> ⚠️ **যা বদলাতে থাকে:** যে syntax code তৈরি করে, ecosystem তার থেকে সরে যাচ্ছে। TypeScript 5.8 যোগ করেছে
> `erasableSyntaxOnly`, আর Node.js type compile না করে শুধু মুছে ফেলে, তাই `enum`-এর সমর্থন কমছে। Flag-গুলো বদলাবে,
> কিন্তু নিয়মটা টিকে থাকবে। Build-এর সময় মুছে যায় এমন রূপটাই বেছে নিন, আর runtime object-এর দাম দিন শুধু তখনই,
> যখন value-গুলোর ওপর iterate করতে হবে।

একটি ক্ষেত্রে numeric enum এখনো মানায়: **bitwise flag**, যেমন `Permission.Read | Permission.Write`। সেখানে type-টা
ইচ্ছে করেই খোলা রাখা। অন্য সব জায়গায় এই খোলা থাকাটাই bug। যেকোনো number ঢুকে পড়ে, তাই
`setStatus(99)`-ও compile হয়ে যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                          | কী ব্যবহার করবেন                      | কেন                                                   |
| ------------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| Local variable, যার value দেখেই type বোঝা যায়               | কোনো annotation নয়                  | Inference নিখুঁত, আর value বদলালে সেও সঙ্গে বদলায় |
| Parameter, বা export করা return type           | স্পষ্ট annotation         | এটাই contract; inference-এর হাতে ছাড়লে সেটা সরে যেতে পারে      |
| `fetch`-এর body, `JSON.parse`, `postMessage`       | `unknown`, সঙ্গে একটি type guard    | আকারটা runtime-এর তথ্য, compile time-এর নয়   |
| ছোট একটি নির্দিষ্ট set, যা শুধু type-এর জায়গায় লাগে     | Literal union                  | Runtime-এ কোনো দাম নেই, আর API-র string-এর সঙ্গে মেলে              |
| এমন value, যার ওপর iterate করতে হবে                           | `as const` object              | দুই স্তরের জন্যই সত্যের একটিমাত্র উৎস                   |
| Codebase আগে থেকেই enum-এ ভরা                | আগের ধরনটাই রাখুন        | অর্ধেক করা migration-এর চেয়ে ধারাবাহিকতা ভালো           |

## সাধারণ ভুল

**❌ Error চুপ করাতে `any` ব্যবহার করা।** `any` যে expression-এ হাত দেয় সেখানেই ছড়িয়ে পড়ে, তাই একটি annotation পুরো
call path-এর যাচাই বন্ধ করে দিতে পারে। Type না জানলে `unknown` ব্যবহার করুন।

**❌ না বুঝে literal-কে চওড়া করে ফেলা:**

```typescript
let method = 'GET'; // ❌ inferred as string, so it will not fit 'GET' | 'POST'
const method = 'GET'; // ✅ inferred as 'GET'
```

**❌ List দুবার declare করা।** একটি আলাদা `ROLES` array-এর পাশে `type Role = 'admin' | 'user'` রাখলে দুটি একসময়
আলাদা হয়ে যাবে। একটি থেকে আরেকটি বানিয়ে নিন:
`const ROLES = ['admin', 'user'] as const; type Role = (typeof ROLES)[number];`

**❌ `as const` ভুলে যাওয়া।** এটা ছাড়া `{ Pending: 'pending' }`-এর property-র type হয় `string`, আর তা থেকে বানানো
union চুপসে `string` হয়ে যায়।

**❌ Type assertion-কে যাচাই ভাবা।** `data as User` compiler-কে শুধু তর্ক থামাতে বলে। কিছুই যাচাই করে না। আকারটা
নিশ্চিত করতে পারে শুধু runtime guard।

> ⚠️ Build-এর সময় type মুছে যায়। `instanceof MyInterface` বলে কিছু নেই, আর ভুল আকারের JSON payload বা ভুল
> role string-কে boundary-তে কেউ আটকায় না। বাইরের input runtime-এ যাচাই করুন, schema library দিয়ে, কিংবা
> `as const` array-এর বিপরীতে `ROLES.includes(value)` দিয়ে।

## 🔑 মূল শিক্ষা

- Type থাকে শুধু compile time-এ, তাই বাইরের data-র জন্য সবসময় runtime check লাগে।
- Function-এর parameter আর export করা return type annotate করুন; local variable inference-এর হাতে ছাড়ুন।
- `any` যাচাই বন্ধ করে দেয় আর ছড়িয়ে পড়ে; যাচাই না হওয়া data-র নিরাপদ পাত্র হলো `unknown`।
- `never` দিয়ে চলে exhaustiveness check, যা union-এর বাদ পড়া member-কে build failure-এ বদলে দেয়।
- `enum`-এর চেয়ে literal union বা `as const` object ভালো: build-এর সময় মুছে যায়, আর কাঁচা string নেয়।

## Interview-এর প্রশ্ন

**Q: `any` আর `unknown`-এর পার্থক্য কী?**

দুটিই যেকোনো value নেয়। `any` যেকোনো operation-ও করতে দেয়, তাই ওই value আর তা থেকে আসা সবকিছুর type check বন্ধ
হয়ে যায়। `unknown` narrow না করা পর্যন্ত কিছুই করতে দেয় না। Boundary-তে ঠিক এটাই চাই। যে validation আপনার এমনিতেই
লেখা উচিত, compiler সেটা লিখতে বাধ্য করে।

**Q: TypeScript কোনো error ছাড়াই compile হলো। তবু runtime-এ কী ভুল হতে পারে?**

Compiler যে boundary দেখতে পায় না, তা পেরিয়ে আসা যেকোনো কিছু: অন্য আকারের response দেওয়া API,
`localStorage`, `JSON.parse`, ভুল type-ওয়ালা কোনো library, কিংবা মিথ্যা বলা একটি `as` assertion। Type মুছে যায়
বলে এগুলোর কোনোটাই যাচাই হয় না। এ কারণেই validation-এর জায়গা প্রান্তে।

**Q: নতুন TypeScript code-এ কি `enum` ব্যবহার করা উচিত?**

সাধারণত না। এটা runtime code তৈরি করে, আর bundler একে tree-shake করতে পারে না। এর string রূপ API থেকে আসা কাঁচা
value নেয় না, আর type মুছে দেওয়া runtime-এ এটা চলে না। বেশিরভাগ প্রয়োজন literal union-এই মেটে, আর বাকিটা মেটায়
`as const` object, iterate করার সুবিধাসহ।

**Q: যে codebase-এ enum আছে, সেখানে কখন সেগুলো রেখে দেবেন?**

যখন সেগুলো ধারাবাহিকভাবে আর ব্যাপকভাবে ব্যবহার হচ্ছে। অর্ধেক migration করলে একটি ধারণার জন্য দুটি রীতি থেকে যায়, আর
তাতে যে বিভ্রান্তি হয় তার দাম enum-এর byte-এর চেয়ে বেশি। কোনো module এমনিতেই নতুন করে লেখা হলে তখন migrate করুন।

## এরপর কী পড়বেন

- [Chapter ?? — Interface ও Type Alias](#ch-interfaces-types) — object-এর আকার ঠিকমতো বর্ণনা করা
- [Chapter ?? — TypeScript Type Guard](#ch-type-guards) — `unknown`-কে কাজে লাগানোর মতো কিছুতে বদলানো
- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — `as const` আর indexed access-এর পুরো কলকবজা
