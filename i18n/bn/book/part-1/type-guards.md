---
sourceHash: "b594c4c9a1e77eae48399a17b1a1df205eacfcdf2d2b0a639489c4ef1063e373"
title: "TypeScript Type Guard"
translatedAt: "2026-10-14T04:30:28.202Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript Type Guard {#ch-type-guards}

> চওড়া type-কে নিরাপদে narrow করুন, আর কোনো case বাদ পড়লে compile error পান।

**এই অধ্যায়ে:** `typeof` আর `instanceof` · `in` operator · `value is T` predicate · discriminated union · `never` দিয়ে exhaustiveness

## 💡 মূল ধারণা

Type guard হলো এমন একটি **runtime** check, যেটা compiler বোঝে। পুরো ব্যাপারটা এই জোড়ের মধ্যেই।
`typeof value === 'string'` একটা সত্যিকারের check, compile হওয়ার পরেও সেটা থেকে যায়। আর TypeScript এটা দেখে
branch-এর ভেতরে type narrow করে। চওড়া type হতে পারে `unknown`, কোনো union, বা কোনো API payload। সেখান থেকে
নির্দিষ্ট type-এ যাওয়ার একমাত্র সৎ পথ guard, কারণ যাচাই করে শুধু guard-ই। `as` assertion type narrow করে ঠিকই,
কিন্তু কিছুই যাচাই করে না।

## কীভাবে কাজ করে

| Guard                     | কী narrow করে                                  | কখন ব্যবহার করবেন                      |
| ------------------------- | -------------------------------------------- | -------------------------------------- |
| `typeof x === 'string'`   | Primitive                                     | Primitive-এর union-এ                  |
| `x instanceof Error`      | Class instance, `Date`, `Error`, `Array`       | Error handling, class hierarchy        |
| `'permissions' in user`   | Key আছে কিনা দেখে object shape                  | Discriminant নেই এমন union-এ           |
| `x.kind === 'circle'`     | Discriminated union                            | যে union-এর shape আপনার হাতে           |
| `x is User` return করা `isUser(x)` | যেকোনো কিছু                          | Boundary-তে, আর বারবার ব্যবহারের check-এ |

### `typeof`, আর `null`-এর ফাঁদ

```typescript
function format(value: string | number): string {
  if (typeof value === 'string') return value.toUpperCase(); // string here
  return value.toFixed(2); // number here
}
```

`typeof null`-এর ফল `'object'`, তাই `null` যেকোনো object branch-এ ঢুকে পড়ে:

```typescript
if (typeof value === 'object') { /* ❌ null reaches here */ }
if (value !== null && typeof value === 'object') { /* ✅ */ }
```

### `instanceof`

সবচেয়ে বেশি লাগে error handling-এ, কারণ `catch`-এর binding হয় `unknown`:

```typescript
function describe(err: unknown): string {
  if (err instanceof ApiError) return `API ${err.statusCode}: ${err.message}`;
  if (err instanceof Error) return err.message; // ApiError is also an Error, so order matters
  return 'Unknown error';
}
```

> ⚠️ `instanceof` prototype chain মিলিয়ে দেখে, তাই আলাদা realm-এ (আলাদা JavaScript environment-এ) এটা কাজ করে
> না। Iframe বা Node worker থেকে আসা `Date` আপনার `Date`-এর `instanceof` নয়। Built-in-কে extend করা class ES5-এ
> compile হলে, আলাদা করে `Object.setPrototypeOf` না দিলে, সেখানেও এটা ব্যর্থ হয়।

### `in`

`if ('permissions' in user)` key আছে কিনা দেখে union narrow করে, আর branch-এর ভেতরে
`user.permissions` পাওয়া যায়। যেখানে discriminant যোগ করার উপায় নেই, যেমন third-party কোনো union-এ, সেখানে
এটা কাজে আসে। Type যদি আপনার নিজের হয়, তাহলে discriminant-ই ভালো।

### Type predicate

যে function `value is T` return করে, সেটা বারবার ব্যবহার করার মতো guard হয়ে যায়। বাইরের payload একবার যাচাই করে
সব জায়গায় narrow করার উপায় এটাই:

```typescript
function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.name === 'string';
}

const raw: unknown = await fetchJson('/api/users/1');
if (!isUser(raw)) throw new Error('Unexpected response shape');
raw.name; // User
```

Predicate হলো **compiler-কে দেওয়া আপনার কথা**, compiler সেটা যাচাই করে না। Guard-এর body ভুল হলে সেটা cast-এর
মতোই অনিরাপদ। হয় body-টা type-এর সঙ্গে হুবহু মিলিয়ে লিখুন, নয়তো এমন schema library নিন, যেটা একটি declaration
থেকেই দুটি বানিয়ে দেয়।

**`filter`-ও narrow করে predicate-এর জোরেই:**

```typescript
const items: (User | null)[] = [/* … */];

const stillMaybe = items.filter((i) => i !== null); // ❌ (User | null)[]

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}
const users: User[] = items.filter(isNotNull); // ✅
```

### Discriminated union আর exhaustiveness

```tsx
type RequestState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function render(state: RequestState<User>): JSX.Element {
  switch (state.status) {
    case 'loading':
      return <Spinner />;
    case 'success':
      return <UserCard user={state.data} />; // `data` exists only here
    case 'error':
      return <ErrorBanner message={state.error} />;
    default: {
      // Add a fourth state and this line fails to compile
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
```

এই অধ্যায়ের সবচেয়ে দামি চারটি line হলো `default`-এ `never`-এ assign করা। "কেউ নতুন case যোগ করেছে, কিন্তু
handle করতে ভুলে গেছে", এই production bug-টা এতে build failure হয়ে যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                       | কী ব্যবহার করবেন                  | কেন                                              |
| ----------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| Primitive-এর union                               | `typeof`                         | সরাসরি, আর compiler এটা চেনে                     |
| `catch`-এর binding                               | `instanceof`, সবচেয়ে নির্দিষ্টটা আগে | Binding-টা `unknown`; আর কিছু একে narrow করে না |
| API response, `localStorage`, `postMessage`       | Predicate, বা schema library     | Shape-টা runtime-এর ব্যাপার                      |
| আপনার নিজের বানানো union                          | Literal discriminant field       | `switch`-এ narrowing আর exhaustiveness দুটিই পাওয়া যায় |
| Array থেকে null ছেঁকে ফেলা                         | Generic `value is T` predicate   | শুধু `filter` narrow করে না                     |

## সাধারণ ভুল

**❌ যেখানে check দরকার, সেখানে `as` লেখা।** `data as User` compiler-কে চুপ করায়, কিছুই যাচাই করে না। "পুরোপুরি
typed" codebase-এ runtime-এ shape-এর যত bug, সবগুলোর শুরু এখান থেকেই।

**❌ `null` বাদ না দিয়েই `typeof x === 'object'` check করা।**

**❌ এমন predicate, যার body তার দাবির সঙ্গে মেলে না।** `is User` guard-এর ভেতরে `return typeof v === 'object'`
যতটা যাচাই করে, দাবি করে তার চেয়ে অনেক বেশি। আর compiler সেটাই বিশ্বাস করে।

**❌ `instanceof` check সাধারণ থেকে নির্দিষ্টের দিকে সাজানো।** `err instanceof Error` আগে থাকলে
`ApiError`-এর branch-এ কখনো পৌঁছানোই যায় না।

**❌ ধরে নেওয়া যে callback-এর ভেতরেও narrowing টিকে থাকবে।** Function-এর boundary পার হলে TypeScript narrowing
ফেলে দেয়, কারণ মাঝখানে value বদলে যেতে পারে:

```typescript
if (user.avatar !== undefined) {
  setTimeout(() => load(user.avatar)); // ❌ possibly undefined again
}
const avatar = user.avatar; // ✅ capture in a const first
```

## 🔑 মূল শিক্ষা

- Type guard এমন runtime check, যা compiler বোঝে; `as` assertion এর কোনোটাই নয়।
- `typeof null`-এর ফল `'object'`, তাই object-এ narrow করার আগে `null` বাদ দিন।
- `value is T` predicate আপনার দেওয়া কথা, compiler তা যাচাই করে না — body মিলিয়ে লিখুন।
- শুধু `filter` narrow করে না; predicate দিলে করে।
- `default`-এ `never`-এ assign করলে handle না করা union member compile error হয়ে যায়।

## Interview-এর প্রশ্ন

**Q: Type predicate কী, আর এর প্রধান ঝুঁকি কোথায়?**

এমন function, যার return type `value is T`। এটা `true` return করলে compiler call করা branch-এ argument-টা narrow
করে। ঝুঁকি হলো, compiler body না দেখেই signature বিশ্বাস করে। Check অসম্পূর্ণ হলে cast-এর মতোই ভুল ভরসা তৈরি হয়।
এজন্যই হাতে লেখা guard-এর চেয়ে schema থেকে বানানো guard বেশি নিরাপদ।

**Q: Exhaustiveness check কীভাবে কাজ করে?**

Narrowing handle হয়ে যাওয়া member-গুলোকে union থেকে সরিয়ে দেয়। ফলে `default` branch-এ value-র type হয় যা যা
handle হয়নি, তাদের union। `never`-এ assign করা সফল হয় শুধু তখনই, যখন আর কিছু বাকি নেই। নতুন member যোগ করলে
ঠিক ওই line-এ compile হয় না। Error সরাসরি দেখিয়ে দেয় কোন switch বদলাতে হবে।

**Q: Callback-এর ভেতরে narrowing টেকে না কেন?**

কারণ check আর callback চলার মাঝখানে value যে বদলায়নি, compiler তা প্রমাণ করতে পারে না। অন্য কোনো function
property-টা আবার assign করে দিতে পারে। Narrow হওয়া value-টা একটি `const`-এ ধরে রাখলেই সমাধান: `const` আবার
assign করা যায় না, তাই narrowing টিকে থাকে।

## এরপর কী পড়বেন

- [Chapter ?? — Interface ও Type Alias](#ch-interfaces-types) — narrow করার মতো union ডিজাইন করা
- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — conditional type, মানে type-এর স্তরে branch
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — সত্যিকারের boundary-তে schema validation
