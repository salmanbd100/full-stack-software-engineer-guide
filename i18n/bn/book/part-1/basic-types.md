---
sourceHash: "ce9627be0ace90ca2ef1025889569b5b7c05f951bd80bb043e67fe3bb597a381"
title: "TypeScript-এর Basic Type, Literal ও Enum"
translatedAt: "2026-10-12T07:46:49.899Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript-এর Basic Type, Literal ও Enum {#ch-basic-types}

> Annotation দিন শুধু সেখানে, যেখানে inference পৌঁছাতে পারে না। `any`, `unknown` আর `never` — প্রতিটির দাম কী, জেনে রাখুন। একটি নির্দিষ্ট মানের সেট model করুন, এমন কোনো runtime object ship না করে যেটা কেউ চায়নি।

**এই অধ্যায়ে:** annotation বনাম inference · `any` বনাম `unknown` বনাম `never` · array, tuple ও function · literal union বনাম `as const` বনাম `enum` · runtime-এ আসলে কী থাকে

## 💡 মূল ধারণা

TypeScript-এর type system থাকে compile time-এ, আর runtime-এ মিলিয়ে যায়। এই একটা তথ্যই এর গড়ন
ব্যাখ্যা করে। Code চলার আগে এটা আপনার code সম্পর্কে অনেক কিছু প্রমাণ করতে পারে। চলার সময় কিছুই না।
তাই ভালো TypeScript type বসায় সেখানে, যেখানে compiler নিজে সেটা বের করতে পারে না: function-এর সীমানায়
আর বাইরে থেকে আসা data-য়। বাকি জায়গায় এটা চুপ থাকে, কারণ inference উত্তরটা আগেই জানে।

"এই পাঁচটা মানের একটা" — এটা কীভাবে model করবেন, সেটাও ঠিক করে এই একই তথ্য। একটি literal union থাকে
শুধু compile time-এ। একটি `as const` object হলো সাধারণ একটা object, যার ওপর iterate করা যায়। একটি
`enum` হলো generate করা code। বেছে নিন এই প্রশ্নে: runtime-এ মানগুলো আপনার লাগবে কি না।

## কীভাবে কাজ করে

`number` integer আর float দুটোই ধরে। `bigint` এর সঙ্গে মেশে না। `null` মানে ইচ্ছাকৃত অনুপস্থিতি, আর
`undefined` মানে এখনো set হয়নি। এই দুটোর কোনো অর্থ থাকে `strictNullChecks`-এর কারণেই। এটা ছাড়া এরা
সব type-এ বসে যায়, আর compiler সবচেয়ে সাধারণ runtime error-টাই ধরতে পারে না।

### Annotation বনাম inference

```typescript
// ✅ let inference do it — the value states the type
let count = 0; // number
const status = 'pending'; // 'pending', a literal type, because it is const

// ✅ annotate where inference cannot reach
function createUser(name: string, role: 'admin' | 'user' = 'user'): User { /* … */ }
const parsed: unknown = JSON.parse(raw); // external data has no knowable type
```

Annotation দিন **function parameter আর export করা return type-এ**। Local variable-গুলো inference-এর হাতে
ছেড়ে দিন। একটি public function-এর return annotation contract-টা বেঁধে দেয়। ফলে body-র ভেতরে কোনো
পরিবর্তন হলে error আসে সেখানেই, প্রতিটি call site-এ নয়।

### `any`, `unknown`, `never`

|                   | `any`                               | `unknown`               | `never`                              |
| ----------------- | ----------------------------------- | ----------------------- | ------------------------------------ |
| কী গ্রহণ করে      | সবকিছু                              | সবকিছু                  | কিছুই না                             |
| আপনি যা করতে পারেন | যা খুশি                             | narrow না করা পর্যন্ত কিছুই না | —                              |
| মানে              | "Check করা বন্ধ করো"                | "পরে check হবে"         | "এটা ঘটতেই পারে না"                  |
| কখন ব্যবহার করবেন | JavaScript migrate করার সময়, অনিচ্ছায় | বাইরের data parse করতে | Exhaustiveness, যে function throw করে |

`never` তার জায়গা অর্জন করে **exhaustiveness check**-এ। Union-ভরা codebase-এ এটাই সবচেয়ে কাজের
compile-time পাহারা:

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

### Array, tuple ও function

```typescript
const frozen: readonly string[] = ['a']; // no push, no sort, no splice — free, and enforced

// A tuple fixes the length and the type at each position
function parseRow(row: string): [id: number, name: string] {
  const [id, name] = row.split(',');
  return [Number(id), name];
}

type EventHandler<T = void> = (event: T) => void; // a named function type keeps prop signatures readable
```

### "এই মানগুলোর একটা" বলার তিনটি উপায়

**একটি literal union-এর কোনো খরচ নেই, আর আপনার API যে string পাঠায় তার সঙ্গে মিলে যায়:**

```typescript
type UserRole = 'admin' | 'user' | 'guest';
setRole(1, 'admin'); // ✅
setRole(1, 'superuser'); // ❌ not a valid role
```

**একটি `as const` object একটাই declaration থেকে list আর type দুটোই দেয়:**

```typescript
const OrderStatus = {
  Pending: 'pending',
  Shipped: 'shipped',
} as const;

type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]; // 'pending' | 'shipped'

Object.values(OrderStatus); // ✅ iterable — for a dropdown or a validation list
setStatus('ord_1', 'shipped'); // ✅ the raw string from JSON works too
```

**একটি `enum` হলো generate করা code, আর একটি string enum কাঁচা মান গ্রহণ করে না:**

```typescript
enum LogLevel {
  Error = 'ERROR',
  Info = 'INFO',
}
log(LogLevel.Info, 'started'); // ✅
log('INFO', 'started'); // ❌ string enums are nominal
```

| বৈশিষ্ট্য                                        | Literal union | `as const` object | `enum`                   |
| ------------------------------------------------ | ------------- | ----------------- | ------------------------ |
| Runtime output                                   | কিছু না       | একটি সাধারণ object | একটি generate করা object |
| মানগুলোর ওপর iterate                             | ❌             | ✅                 | ✅                        |
| কাঁচা string গ্রহণ করে                           | ✅             | ✅                 | ❌                        |
| Type-stripping runtime-এ চলে                     | ✅             | ✅                 | ❌                        |

> ⚠️ **যা বদলাতে থাকে:** যে syntax code emit করে, ecosystem তার বিপরীতে সরে যাচ্ছে। TypeScript 5.8
> `erasableSyntaxOnly` যোগ করেছে, আর Node.js type compile না করে strip করে। তাই `enum`-এর support কমছে।
> স্থায়ী নিয়মটা এই flag-গুলোর চেয়ে বেশিদিন টিকবে। যে রূপ build time-এ মিলিয়ে যায়, সেটাই বেছে নিন।
> Runtime object-এর দাম দিন শুধু তখন, যখন মানগুলোর ওপর iterate করা দরকার।

একটি numeric enum এখনো একটা ক্ষেত্রে মানায়: **bitwise flag**, যেমন `Permission.Read | Permission.Write`।
সেখানে type-টা ইচ্ছা করেই খোলা রাখা হয়। অন্য সব জায়গায় এই খোলা থাকাটা একটা bug। যেকোনো number বসে যায়,
তাই `setStatus(99)` compile হয়ে যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                         | যা ব্যবহার করবেন               | কেন                                                   |
| ------------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| একটি local, যার মান নিজেই তার type বলে দেয়        | কোনো annotation নয়            | Inference নিখুঁত, আর মান বদলালে সেটাও সঙ্গে বদলায়     |
| একটি parameter, বা export করা return type        | স্পষ্ট annotation              | এটাই contract; inference থাকলে এটা সরে যেতে পারে       |
| একটি `fetch` body, `JSON.parse`, `postMessage`    | `unknown` আর একটি type guard   | Shape-টা runtime-এর তথ্য, compile time-এর নয়          |
| একটি ছোট নির্দিষ্ট সেট, শুধু type-এর জায়গায় ব্যবহৃত | Literal union                  | কোনো runtime খরচ নেই, আর API-র string-এর সঙ্গে মেলে   |
| যে মানগুলোর ওপর iterate করতে হবে                  | `as const` object              | দুই স্তরের জন্য একটাই source of truth                 |
| আগে থেকেই enum-ভরা একটি codebase                  | বিদ্যমান style-টাই রাখুন       | অর্ধেক-শেষ migration-এর চেয়ে সামঞ্জস্য ভালো          |

## সাধারণ ভুল

**❌ Error চুপ করাতে `any` ব্যবহার করা।** `any` যে expression ছোঁয়, তার সবটায় ছড়িয়ে পড়ে। ফলে একটি
annotation পুরো একটা call path জুড়ে checking বন্ধ করে দিতে পারে। Type না জানলে `unknown` ব্যবহার করুন।

**❌ ভুল করে একটি literal-কে widen করা:**

```typescript
let method = 'GET'; // ❌ inferred as string, so it will not fit 'GET' | 'POST'
const method = 'GET'; // ✅ inferred as 'GET'
```

**❌ List দুবার declare করা।** আলাদা একটি `ROLES` array-এর পাশে একটি `type Role = 'admin' | 'user'`
রাখলে দুটো একসময় আলাদা হয়ে যাবে। একটা থেকে অন্যটা derive করুন:
`const ROLES = ['admin', 'user'] as const; type Role = (typeof ROLES)[number];`

**❌ `as const` ভুলে যাওয়া।** এটা ছাড়া `{ Pending: 'pending' }`-এর property type হয় `string`, আর
derive করা union ভেঙে `string` হয়ে যায়।

**❌ Type assertion-কে check ভাবা।** `data as User` compiler-কে শুধু তর্ক থামাতে বলে। এটা কিছুই যাচাই
করে না। Shape নিশ্চিত করতে পারে কেবল একটি runtime guard।

> ⚠️ Build time-এ type মুছে যায়। `instanceof MyInterface` বলে কিছু নেই। ভুল shape-এর JSON payload বা
> অবৈধ role string-কে সীমানায় কেউ আটকায় না। বাইরের input runtime-এ validate করুন — একটি schema library
> দিয়ে, অথবা একটি `as const` array-এর বিপরীতে `ROLES.includes(value)` দিয়ে।

## 🔑 মূল শিক্ষা

- Type থাকে শুধু compile time-এ, তাই বাইরের data-র জন্য সবসময় একটি runtime check লাগে।
- Function parameter আর export করা return type-এ annotation দিন; local-গুলো inference-এর হাতে ছাড়ুন।
- `any` checking বন্ধ করে আর ছড়িয়ে পড়ে; যাচাই-না-করা data-র নিরাপদ পাত্র হলো `unknown`।
- `never` দিয়ে exhaustiveness check চলে, যা union-এর বাদ পড়া একটি member-কে build failure বানিয়ে দেয়।
- `enum`-এর বদলে literal union বা `as const` object বেছে নিন: এগুলো build time-এ মিলিয়ে যায় আর কাঁচা string গ্রহণ করে।

## Interview-এর প্রশ্ন

**Q: `any` আর `unknown`-এর পার্থক্য কী?**

দুটোই যেকোনো মান গ্রহণ করে। `any` যেকোনো operation-ও করতে দেয়। ফলে সেই মান আর তা থেকে আসা সবকিছুর
type checking বন্ধ হয়ে যায়। `unknown` narrow না করা পর্যন্ত কিছুই করতে দেয় না। সীমানায় ঠিক এটাই চান।
যে validation আপনার এমনিতেই লেখা উচিত, compiler সেটা লিখতে বাধ্য করে।

**Q: TypeScript কোনো error ছাড়াই compile হয়েছে। Runtime-এ তবু কী ভুল হতে পারে?**

Compiler যে সীমানা দেখতে পায় না, তার ওপারের যেকোনো কিছু: অন্য shape ফেরত দেওয়া একটি API,
`localStorage`, `JSON.parse`, ভুল type-ওয়ালা একটি library, অথবা মিথ্যা বলা একটি `as` assertion। Type
erasure-এর কারণে এগুলোর কোনোটাই check হয় না। এজন্যই validation-এর জায়গা হলো কিনারায়।

**Q: নতুন TypeScript-এ কি `enum` ব্যবহার করা উচিত?**

সাধারণত না। এটা runtime code emit করে, আর bundler এটাকে tree-shake করতে পারে না। এর string রূপ API
থেকে আসা কাঁচা মান গ্রহণ করে না, আর type-stripping runtime-এ এটা চলে না। বেশিরভাগ প্রয়োজন একটি literal
union মেটায়। বাকিটা মেটায় একটি `as const` object, iterate করার সুবিধাসহ।

**Q: যে codebase-এ আগে থেকে enum আছে, সেখানে কখন সেগুলো রেখে দেবেন?**

যখন সেগুলো সামঞ্জস্য রেখে আর ব্যাপকভাবে ব্যবহৃত হচ্ছে। আংশিক migration একটা ধারণার জন্য দুটো convention
রেখে যায়। তাতে যে বিভ্রান্তি হয়, তার দাম enum-এর byte-এর চেয়ে বেশি। কোনো module এমনিতেই নতুন করে লেখা
হলে তখন migrate করুন।

## এরপর কী পড়বেন

- [Chapter ?? — Interface ও Type Alias](#ch-interfaces-types) — object-এর shape ঠিকভাবে বর্ণনা করা
- [Chapter ?? — TypeScript Type Guard](#ch-type-guards) — `unknown`-কে কীভাবে ব্যবহারযোগ্য কিছুতে পরিণত করবেন
- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — `as const` আর indexed access-এর পুরো কলকবজা
