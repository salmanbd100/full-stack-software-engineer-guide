---
sourceHash: "89301ca7f4edee2d3dbd512ff4dc25ce7b968c535d7e6cd0e9ef7cc5b2089bcd"
title: "Interface ও Type Alias"
translatedAt: "2026-10-14T04:29:17.188Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Interface ও Type Alias {#ch-interfaces-types}

> `interface` আর `type`-এর মধ্যে বাছাই করুন সেই দুটি জায়গা দেখে, যেখানে এরা সত্যিই আলাদা। পছন্দ দিয়ে নয়।

**এই অধ্যায়ে:** declaration merging · union আর primitive · extend বনাম intersect · optional বনাম `undefined`

## 💡 মূল ধারণা

Object-এর shape লেখার বেলায় `interface` আর `type` প্রায় পুরোপুরি একই কাজ করে। আসল পার্থক্য মাত্র দুটি।
দুবার declare করলে **merge হয় শুধু `interface`**। আর object নয় এমন কিছুকে নাম দিতে পারে **শুধু `type`**, যেমন
union, primitive, tuple বা function signature। লোকে আর যত পার্থক্যের কথা বলে, সেগুলো হয় style-এর ব্যাপার, নয়তো
পুরনো version-এর খুঁটিনাটি। এই দুটি দেখে সিদ্ধান্ত নিন, তর্ক ওখানেই থামান।

## কীভাবে কাজ করে

```typescript
interface User {
  id: number;
  name: string;
  role: 'admin' | 'user';
  avatar?: string; // may be absent entirely
  readonly createdAt: Date; // assignable at creation, never after
}
```

যে দুটি modifier সত্যিই কাজের, সেগুলো হলো `readonly` আর `?`। `readonly` থাকলে পরে আর assign করা যায় না, আর
`?` key-টাকে optional করে দেয়। দুটিই শুধু compile-time-এ কাজ করে।

### যা শুধু `type` পারে

```typescript
type ID = string | number; // a union
type Status = 'pending' | 'active'; // literal union
type Pagination = [page: number, limit: number]; // a tuple
type Middleware = (req: Request, next: () => void) => void; // a call signature
type Admin = User & { permissions: string[] }; // an intersection
```

### যা শুধু `interface` পারে

```typescript
// Two declarations of one name merge. This is how you add a field to a
// third-party type you do not own — Express's Request, for example
interface Request {
  user?: User;
}
interface Request {
  requestId: string;
}
// Request now has both
```

Library-র boundary-তে declaration merging একটা সুবিধা। কিন্তু নিজের code-এ এটা বিপদ: দুটি file চুপচাপ একই
type-এ কিছু যোগ করলে debug করা কঠিন হয়ে যায়। একই নামে দুবার `type` লিখলে error হয়, আর নিজের code-এ সাধারণত
সেটাই চাওয়া।

| ক্ষমতা                           | `interface` | `type` |
| --------------------------------- | ----------- | ------ |
| Object shape                       | ✅           | ✅      |
| Union, primitive, tuple            | ❌           | ✅      |
| Mapped আর conditional type        | ❌           | ✅      |
| Declaration merging                | ✅           | ❌      |
| `extends`                          | ✅           | `&` দিয়ে |
| Class-এ `implements`              | ✅           | ✅      |

### Extend বনাম intersect

`interface Product extends BaseEntity` আর `type Product = BaseEntity & { … }` দুটিই একই shape-এ পৌঁছায়, তবে আলাদা
পথে। `extends` চলতে চলতেই মিল আছে কিনা যাচাই করে, তাই কোনো property-তে গরমিল থাকলে error হয় declaration-এই।
`&` তা করে না। গরমিল হলে চুপচাপ সেই member-এর type হয়ে যায় `never`, আর error আসে পরে, assign করার সময়। তাই
`extends`-এর error message ভালো, আর object shape-এর জন্য একে বেছে নেওয়ার কারণও এটাই।

### Discriminated union

ভাষাটার সবচেয়ে কাজের pattern এটাই। এটা এমন একটি union, যার প্রতিটি member-এ একটি করে literal type-এর field
থাকে, আর compiler সেই field দেখে type narrow করে।

```typescript
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function render(state: RequestState<User>): string {
  if (state.status === 'success') return state.data.name; // `data` exists only here
  if (state.status === 'error') return state.error; // `error` exists only here
  return 'Loading…';
}
```

Optional field দিয়ে বানানো object-এর চেয়ে এটা সবদিক থেকে ভালো। `{ data?: T; error?: string }`-এ দুটিই থাকতে পারে,
আবার কোনোটাই না-ও থাকতে পারে। আপনি এখন কোন state-এ আছেন, compiler তা বলতে পারে না।

### Optional বনাম `| undefined`

```typescript
interface A {
  age?: number; // the key may be missing
}
interface B {
  age: number | undefined; // the key must be present; the value may be undefined
}

const a: A = {}; // ✅
const b: B = {}; // ❌ Property 'age' is missing
const b2: B = { age: undefined }; // ✅
```

ডেটা সত্যিই optional হলে `?` দিন। আর caller-কে field-টার কথা মাথায় রাখতে বাধ্য করতে চাইলে দিন `| undefined`।
যেমন patch object-এ "পাঠানোই হয়নি" আর "খালি পাঠানো হয়েছে" দুটি আলাদা কথা। `exactOptionalPropertyTypes` আরও
এক ধাপ এগোয়: এটা চালু থাকলে `?` field-এ সরাসরি `undefined` বসানো যায় না।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                      | কী ব্যবহার করবেন                 | কেন                                              |
| ---------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| Object shape, বিশেষ করে যেটা অন্যরা extend করবে  | `interface`                     | গরমিলে error ভালো আসে; library augment করতে merge হয় |
| Union, tuple, primitive alias বা function type   | `type`                          | `interface` এগুলো লিখতেই পারে না                  |
| এমন state, যেগুলো একসঙ্গে থাকতে পারে না         | `type` দিয়ে discriminated union | কোন field আছে, compiler তা প্রমাণ করে দেয়         |
| Third-party type-এ field যোগ করা                | `interface` declaration merging  | কাজ করে শুধু এই একটি উপায়েই                     |
| অন্য type থেকে বানানো shape — omit, pick, partial | Utility type সহ `type`          | মূল type বদলালে এটাও সঙ্গে সঙ্গে বদলায়          |

**Input-এর type আবার নতুন করে না লিখে model থেকে বের করে নেওয়া:**

```typescript
type CreateUserInput = Omit<User, 'id' | 'createdAt'> & { password: string };
type UpdateUserInput = Partial<CreateUserInput>;
```

## সাধারণ ভুল

**❌ Optional field দিয়ে state বানানো।** `{ loading?: boolean; data?: T; error?: string }` আটটি combination মেনে
নেয়, যার বেশিরভাগেরই কোনো মানে নেই। Discriminated union শুধু সেই state-গুলোই মানে, যেগুলো আসলে আছে।

**❌ Key-র নাম না দিতে index signature লেখা।** `{ [key: string]: string }` লিখলে সেই object-এ autocomplete আর
typo ধরার সুবিধা পুরোটাই হারান। `Record<'submit' | 'cancel', string>` লিখলে দুটিই থাকে।

**❌ ধরে নেওয়া যে interface বাড়তি property ধরবেই।** Excess-property check চলে শুধু সদ্য লেখা object literal-এ।
আগে একটি variable-এ রেখে তারপর assign করলে বাড়তি field কারও চোখে না পড়েই পার হয়ে যায়:

```typescript
const input = { id: 1, name: 'a', typo: true };
const user: User = input; // ✅ compiles — no literal, no excess check
```

**❌ অভ্যাসবশে object shape-এ `&` লেখা।** গরমিল থাকা property হয়ে যায় `never`, আর error দেখা দেয় declaration
থেকে অনেক দূরে। `extends` error দেখায় ঠিক যেখানে লিখেছেন, সেখানেই।

**❌ ভুল করে নিজের interface merge করে ফেলা।** একই scope-এ দুটি file `interface Config` declare করলে সেগুলো
চুপচাপ একটি type হয়ে যায়। এটা ইচ্ছাকৃত না হলে `type` লিখুন, তাহলে merge না হয়ে error হবে।

## 🔑 মূল শিক্ষা

- একাধিক declaration merge হয় শুধু `interface`-এর; union, tuple, primitive বা function-কে নাম দিতে পারে শুধু `type`।
- Object shape-এ `&`-এর চেয়ে `extends` ভালো, কারণ গরমিল ধরা পড়ে declaration-এই।
- Discriminated union থাকলে compiler প্রমাণ করে দিতে পারে, কোন state-এ কোন field আছে।
- `?` মানে key-টা না-ও থাকতে পারে; `| undefined` মানে key থাকতেই হবে, শুধু তার value set না-ও হতে পারে।
- Excess-property check চলে শুধু সদ্য লেখা object literal-এ, variable হয়ে assign হলে চলে না।

## Interview-এর প্রশ্ন

**Q: কখন `type`-এর বদলে `interface` ব্যবহার করবেন?**

Object shape-এর জন্য, বিশেষ করে যেটা অন্য code extend করবে বা library-র user augment করবে। `extends`-এ গরমিলের
error পরিষ্কার আসে, আর third-party type-এ field যোগ করার একমাত্র উপায় declaration merging। Object shape নয় এমন
সবকিছুর জন্য `type` ব্যবহার করুন: union, tuple, function signature, mapped আর conditional type।

**Q: Discriminated union কী, আর optional field-এর চেয়ে এটা ভালো কেন?**

এটা এমন একটি union, যার member-গুলোর একটি করে common field আছে, আর সেই field-এর literal type প্রতিটিতে আলাদা।
TypeScript সেটা দেখেই narrow করে। Optional field আসলে সব combination-এর union বোঝায়, তাই compiler
`{ loading: true, error: 'x' }`-কে বাদ দিতে পারে না। Discriminated union-এ অসম্ভব state লেখাই যায় না। তারপর
narrow করলে প্রতিটি branch-এ ঠিক field-গুলো পাওয়া যায়, কোনো cast লাগে না।

**Q: TypeScript এই বাড়তি property-টা ধরল না কেন?**

Excess-property check একটা বিশেষ নিয়ম। এটা চলে শুধু তখন, যখন object literal সরাসরি কোনো typed target-এ assign
হয়। মাঝখানে একটি variable থাকলে সেটা সাধারণ structural check হয়ে যায়, আর সেখানে বাড়তি property আটকায় না। Check
রাখতে চাইলে object যেখানে তৈরি করছেন, সেখানেই type annotate করুন।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript Generics](#ch-generics) — এই shape-গুলোকে নানা type-এ আবার ব্যবহার করা
- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — `Omit`, `Pick` আর `Partial` বিস্তারিত
- [Chapter ?? — TypeScript Type Guard](#ch-type-guards) — boundary-তে discriminated union narrow করা
