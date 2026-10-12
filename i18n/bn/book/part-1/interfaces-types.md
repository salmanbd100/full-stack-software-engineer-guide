---
sourceHash: "89301ca7f4edee2d3dbd512ff4dc25ce7b968c535d7e6cd0e9ef7cc5b2089bcd"
title: "Interface ও Type Alias"
translatedAt: "2026-10-12T07:46:50.125Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Interface ও Type Alias {#ch-interfaces-types}

> `interface` আর `type`-এর মধ্যে বেছে নিন সেই দুটি ভিত্তিতে, যেখানে এরা সত্যিই আলাদা — পছন্দের ভিত্তিতে নয়।

**এই অধ্যায়ে:** declaration merging · union ও primitive · extend বনাম intersect · optional বনাম `undefined`

## 💡 মূল ধারণা

Object-এর shape-এর ক্ষেত্রে `interface` আর `type` প্রায় পুরোপুরি একই কাজ করে। সত্যিকারের পার্থক্য শুধু
দুটো: **দুবার declare করলে merge হয় শুধু `interface`**, আর **object নয় এমন কিছুর নাম দিতে পারে শুধু
`type`** — যেমন একটি union, primitive, tuple বা function signature। লোকে আর যত পার্থক্যের কথা বলে, তার
সবই হয় style, নয়তো পুরোনো কোনো version-এর খুঁটিনাটি। এই দুটোর ভিত্তিতে সিদ্ধান্ত নিন, আর তর্ক থামান।

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

যে দুটো modifier সত্যিই ভার বহন করে, সেগুলো হলো `readonly` আর `?`। `readonly` পরে assign করা আটকায়, আর
`?` key-টাকে optional করে। দুটোই শুধু compile time-এর।

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

Library-র সীমানায় declaration merging একটা feature, আর আপনার নিজের code-এর ভেতরে একটা বিপদ। সেখানে দুটো
file যদি চুপচাপ একই type-এ জিনিস যোগ করে, সেটা debug করা কঠিন। একটি duplicate `type` হলো error, আর নিজের
code-এ সাধারণত আপনি ঠিক এটাই চান।

| ক্ষমতা                            | `interface` | `type` |
| --------------------------------- | ----------- | ------ |
| Object shape                       | ✅           | ✅      |
| Union, primitive, tuple            | ❌           | ✅      |
| Mapped ও conditional type          | ❌           | ✅      |
| Declaration merging                | ✅           | ❌      |
| `extends`                          | ✅           | `&` দিয়ে |
| Class-এ `implements`               | ✅           | ✅      |

### Extend বনাম intersect

`interface Product extends BaseEntity` আর `type Product = BaseEntity & { … }` আলাদা পথে একই shape-এ
পৌঁছায়। `extends` চলতে চলতেই compatibility check করে, তাই একটি সংঘর্ষপূর্ণ property declaration-এই error
দেয়। `&` তা করে না। সংঘর্ষ হলে চুপচাপ `never` type-এর একটি member তৈরি হয়, যেটা পরে fail করে assignment-এ।
তাই `extends`-এর error message ভালো, আর object shape-এর জন্য এটাকে বেছে নেওয়ার কারণও এটাই।

### Discriminated union

এটাই এই language-এর সবচেয়ে মূল্যবান pattern। এটা এমন একটি union, যার member-গুলোর একটা field-এ literal
type থাকে। Compiler সেই field দিয়েই narrow করে।

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

Optional field-ওয়ালা object-এর চেয়ে এটা নিঃসন্দেহে ভালো। `{ data?: T; error?: string }` দুটোই থাকতে দেয়,
অথবা কোনোটাই না। আর আপনি কোন state-এ আছেন, compiler সেটা বলতে পারে না।

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

সত্যিই optional data-র জন্য `?` ব্যবহার করুন। `| undefined` ব্যবহার করুন তখন, যখন caller-কে field-টা
স্বীকার করতেই হবে — যেমন একটি patch object-এ, যেখানে "পাঠানো হয়নি" আর "ফাঁকা পাঠানো হয়েছে" আলাদা জিনিস।
`exactOptionalPropertyTypes` আরও এক ধাপ এগোয়: এটা `?` field-কে স্পষ্টভাবে দেওয়া `undefined` গ্রহণ করতে
দেয় না।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                      | যা ব্যবহার করবেন                | কেন                                              |
| ---------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| একটি object shape, বিশেষ করে যেটা অন্যরা extend করে | `interface`                  | সংঘর্ষে ভালো error; library augmentation-এর জন্য merge হয় |
| একটি union, tuple, primitive alias বা function type | `type`                       | `interface` এগুলো প্রকাশ করতে পারে না            |
| পরস্পরকে বাদ দেয় এমন state                      | `type`-গুলোর একটি discriminated union | কোন field আছে, compiler তা প্রমাণ করে      |
| Third-party type-এ একটি field যোগ করা            | `interface` declaration merging  | একমাত্র পদ্ধতি যেটা কাজ করে                     |
| একটি derive করা shape — omit, pick, partial      | utility type-সহ `type`           | Source type-এর সঙ্গে তাল মিলিয়ে চলে             |

**Input-গুলো আবার না লিখে model থেকে derive করা:**

```typescript
type CreateUserInput = Omit<User, 'id' | 'createdAt'> & { password: string };
type UpdateUserInput = Partial<CreateUserInput>;
```

## সাধারণ ভুল

**❌ Optional field দিয়ে state model করা।** `{ loading?: boolean; data?: T; error?: string }` আটটা
combination অনুমোদন করে, যার বেশিরভাগই অর্থহীন। একটি discriminated union ঠিক সেই state-গুলোই অনুমোদন
করে, যেগুলো আসলে আছে।

**❌ Key-এর নাম না দিতে index signature ব্যবহার করা।** `{ [key: string]: string }` সেই object-এর সব
autocomplete আর typo check ছেড়ে দেয়। `Record<'submit' | 'cancel', string>` সেগুলো রেখে দেয়।

**❌ ধরে নেওয়া যে interface বাড়তি property ধরবে।** Excess-property checking খাটে শুধু একটি নতুন object
literal-এ। আগে একটি variable-এর মধ্য দিয়ে assign করুন, বাড়তি field কারও নজরে না পড়েই পার হয়ে যাবে:

```typescript
const input = { id: 1, name: 'a', typo: true };
const user: User = input; // ✅ compiles — no literal, no excess check
```

**❌ অভ্যাসবশত object shape-এ `&` ব্যবহার করা।** একটি সংঘর্ষপূর্ণ property `never` হয়ে যায়, আর error
দেখা দেয় declaration থেকে অনেক দূরে। `extends` সেটা জানায় ঠিক যেখানে আপনি লিখেছেন।

**❌ ভুল করে নিজের interface-গুলো merge করে ফেলা।** একই scope-এ দুটো file `interface Config` declare
করলে চুপচাপ একটাই type হয়ে যায়। এটা ইচ্ছাকৃত না হলে `type` ব্যবহার করুন, সেটা বরং error দেয়।

## 🔑 মূল শিক্ষা

- Declaration জুড়ে merge হয় শুধু `interface`; union, tuple, primitive বা function-এর নাম দিতে পারে শুধু `type`।
- Object shape-এর জন্য `&`-এর বদলে `extends` বেছে নিন — সংঘর্ষ ধরা পড়ে declaration-এই।
- একটি discriminated union দিয়ে compiler প্রমাণ করতে পারে, প্রতিটি state-এ কোন field আছে।
- `?` মানে key-টা না-ও থাকতে পারে; `| undefined` মানে key-টা থাকতেই হবে, কিন্তু তার মান set না-ও হতে পারে।
- Excess-property checking চলে শুধু নতুন object literal-এ, variable-এর মধ্য দিয়ে assign করলে নয়।

## Interview-এর প্রশ্ন

**Q: কখন `type`-এর বদলে `interface` ব্যবহার করবেন?**

Object shape-এর জন্য, বিশেষ করে যেগুলো অন্য code extend করে বা কোনো library-র ব্যবহারকারী augment করে।
`extends` সংঘর্ষের error আরও পরিষ্কারভাবে দেয়। আর third-party type-এ field যোগ করার একমাত্র উপায় হলো
declaration merging। Object shape নয় এমন সবকিছুর জন্য `type` ব্যবহার করুন: union, tuple, function
signature, mapped আর conditional type।

**Q: Discriminated union কী, আর optional field-এর চেয়ে একে কেন বেছে নেবেন?**

এটা এমন একটি union, যার member-গুলোর একটা field-এ আলাদা আলাদা literal type থাকে। TypeScript সেটা দিয়ে
narrow করে। Optional field সব combination-এর union বর্ণনা করে, তাই compiler
`{ loading: true, error: 'x' }`-কে বাদ দিতে পারে না। Discriminated রূপে অসম্ভব state লেখাই অসম্ভব হয়ে
যায়। তারপর narrowing প্রতিটি branch-এ ঠিক field-গুলো দেয়, কোনো cast ছাড়াই।

**Q: TypeScript এই বাড়তি property-টা ধরল না কেন?**

Excess-property checking একটা বিশেষ ক্ষেত্র। এটা খাটে শুধু তখন, যখন একটি object literal সরাসরি একটি
typed target-এ assign হয়। মাঝখানে একটি variable-এর মধ্য দিয়ে assign করলে এটা সাধারণ structural check হয়ে
যায়, আর বাড়তি property সেই check পার হয়ে যায়। Check-টা রাখতে তৈরির জায়গাতেই annotation দিন।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript Generics](#ch-generics) — এই shape-গুলোকে বিভিন্ন type-এ পুনর্ব্যবহারযোগ্য করা
- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — `Omit`, `Pick` আর `Partial` বিস্তারিত
- [Chapter ?? — TypeScript Type Guard](#ch-type-guards) — সীমানায় একটি discriminated union narrow করা
