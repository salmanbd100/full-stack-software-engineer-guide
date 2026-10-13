---
sourceHash: "b594c4c9a1e77eae48399a17b1a1df205eacfcdf2d2b0a639489c4ef1063e373"
title: "TypeScript Type Guard"
translatedAt: "2026-10-12T07:45:28.905Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript Type Guard {#ch-type-guards}

> একটি চওড়া type-কে নিরাপদে narrow করুন, আর কোনো case বাদ পড়লে compile error পান।

**এই অধ্যায়ে:** `typeof` আর `instanceof` · `in` operator · `value is T` predicate · discriminated union · `never` দিয়ে exhaustiveness

## 💡 মূল ধারণা

Type guard হলো এমন একটি **runtime** check, যেটা compiler বোঝে। এই জোড়টাই আসল কথা।
`typeof value === 'string'` একটি সত্যিকারের check, যেটা compile হওয়ার পরেও থেকে যায়। TypeScript এটা ব্যবহার করে
branch-এর ভেতরে type-টিকে narrow করে। একটি চওড়া type হতে পারে `unknown`, একটি union, বা একটি API payload। সেখান
থেকে একটি নির্দিষ্ট type-এ যাওয়ার একমাত্র সৎ উপায় হলো guard, কারণ শুধু guard-ই আসলে কিছু যাচাই করে।
একটি `as` assertion type-কে narrow করে, কিন্তু কিছুই check করে না।

## কীভাবে কাজ করে

| Guard                     | কী narrow করে                                 | কখন ব্যবহার করবেন                         |
| ------------------------- | -------------------------------------------- | -------------------------------------- |
| `typeof x === 'string'`   | Primitive                                    | Primitive-এর union                     |
| `x instanceof Error`      | Class instance, `Date`, `Error`, `Array`      | Error handling, class hierarchy        |
| `'permissions' in user`   | Key আছে কি না দেখে object-এর shape            | Discriminant ছাড়া union                |
| `x.kind === 'circle'`     | Discriminated union                           | যে union-এর shape আপনার নিয়ন্ত্রণে       |
| `isUser(x)` যা `x is User` return করে | যেকোনো কিছু                        | Boundary, আর বারবার ব্যবহারযোগ্য check   |

### `typeof`, আর `null`-এর ফাঁদ

```typescript
function format(value: string | number): string {
  if (typeof value === 'string') return value.toUpperCase(); // string here
  return value.toFixed(2); // number here
}
```

`typeof null` হলো `'object'`, তাই একটি `null` যেকোনো object branch-এ ঢুকে পড়ে:

```typescript
if (typeof value === 'object') { /* ❌ null reaches here */ }
if (value !== null && typeof value === 'object') { /* ✅ */ }
```

### `instanceof`

সবচেয়ে বেশি ব্যবহার error handling-এ, কারণ একটি `catch` binding হলো `unknown`:

```typescript
function describe(err: unknown): string {
  if (err instanceof ApiError) return `API ${err.statusCode}: ${err.message}`;
  if (err instanceof Error) return err.message; // ApiError is also an Error, so order matters
  return 'Unknown error';
}
```

> ⚠️ `instanceof` prototype chain তুলনা করে, তাই আলাদা realm-এ (আলাদা JavaScript environment-এ) এটা ব্যর্থ হয়।
> একটি iframe বা একটি Node worker থেকে আসা `Date` আপনার `Date`-এর `instanceof` নয়। Built-in-কে extend করা
> class-এর ক্ষেত্রেও এটা ব্যর্থ হয়, যদি সেটা স্পষ্ট `Object.setPrototypeOf` ছাড়া ES5-এ compile করা হয়।

### `in`

`if ('permissions' in user)` key আছে কি না দেখে একটি union-কে narrow করে। Branch-এর ভেতরে
`user.permissions` পাওয়া যায়। যেখানে আপনি discriminant যোগ করতে পারেন না, সেখানে এটা কাজে লাগে। যেমন একটি
third-party union-এ। Type যদি আপনার নিজের হয়, তাহলে discriminant ভালো।

### Type predicate

যে function `value is T` return করে, সেটা একটি বারবার ব্যবহারযোগ্য guard হয়ে যায়। এভাবেই আপনি একটি বাইরের
payload একবার validate করেন, আর সব জায়গায় narrow করেন:

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

Predicate হলো **compiler-কে দেওয়া আপনার প্রতিশ্রুতি**, compiler এটা check করে না। যে guard-এর body ভুল, সেটা
একটি cast-এর মতোই অনিরাপদ। Body-টি type-এর সঙ্গে হুবহু মিলিয়ে লিখুন। অথবা এমন একটি schema library ব্যবহার করুন,
যেটা একটি declaration থেকেই দুটি বানায়।

**`filter`-কে narrow করায়ও predicate-ই:**

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

`default`-এর ভেতরের `never` assignment-টি এই অধ্যায়ের সবচেয়ে দামি চারটি লাইন। "কেউ একটি case যোগ করেছে কিন্তু
handle করতে ভুলে গেছে" — এই সমস্যাকে এটা production bug থেকে build failure বানিয়ে দেয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                         | কী ব্যবহার করবেন                     | কেন                                              |
| ----------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| Primitive-এর একটি union                          | `typeof`                         | সরাসরি, আর compiler এটা বোঝে                      |
| একটি `catch` binding                             | `instanceof`, সবচেয়ে নির্দিষ্টটা আগে | Binding-টি `unknown`; আর কিছু এটাকে narrow করে না |
| একটি API response, `localStorage`, `postMessage`  | একটি predicate, বা একটি schema library | Shape-টি একটি runtime সত্য                   |
| আপনার নিজের design করা union                       | একটি literal discriminant field   | `switch` narrowing আর exhaustiveness সম্ভব করে   |
| একটি array থেকে null বাদ দেওয়া                      | একটি generic `value is T` predicate | সাধারণ `filter` narrow করে না                  |

## সাধারণ ভুল

**❌ যেখানে check দরকার ছিল, সেখানে `as` ব্যবহার করা।** `data as User` compiler-কে চুপ করায়, কিছুই যাচাই করে না।
একটি "পুরোপুরি typed" codebase-এ প্রতিটি runtime shape bug এখান থেকেই শুরু হয়।

**❌ `null` বাদ দেওয়ার আগে `typeof x === 'object'` check করা।**

**❌ এমন predicate লেখা, যার body তার দাবির সঙ্গে মেলে না।** একটি `is User` guard-এর ভেতরে
`return typeof v === 'object'` যতটা check করে, তার চেয়ে অনেক বেশি দাবি করে। আর compiler সেটা বিশ্বাস করে।

**❌ `instanceof` check-গুলো সাধারণ থেকে নির্দিষ্ট ক্রমে সাজানো।** আগে `err instanceof Error` থাকলে
`ApiError` branch-টি dead code হয়ে যায়।

**❌ ধরে নেওয়া যে narrowing একটি callback-এর ভেতরেও টিকে থাকবে।** Function boundary পার হলে TypeScript narrowing
ফেলে দেয়, কারণ মাঝখানে value বদলে যেতে পারে:

```typescript
if (user.avatar !== undefined) {
  setTimeout(() => load(user.avatar)); // ❌ possibly undefined again
}
const avatar = user.avatar; // ✅ capture in a const first
```

## 🔑 মূল শিক্ষা

- Type guard হলো এমন runtime check, যেটা compiler বোঝে; একটি `as` assertion এর কোনোটাই নয়।
- `typeof null` হলো `'object'`, তাই object-এ narrow করার আগে `null` বাদ দিন।
- একটি `value is T` predicate আপনার দেওয়া প্রতিশ্রুতি, compiler এটা যাচাই করে না — body-টি মিলিয়ে লিখুন।
- সাধারণ `filter` narrow করে না; একটি predicate করে।
- `default`-এ একটি `never` assignment, handle না করা union member-কে compile error বানিয়ে দেয়।

## Interview-এর প্রশ্ন

**Q: Type predicate কী, আর এর প্রধান ঝুঁকি কী?**

এমন একটি function, যার return type হলো `value is T`। এটা `true` return করলে compiler calling branch-এ argument-টিকে
narrow করে। ঝুঁকি হলো, compiler body check না করেই signature বিশ্বাস করে। একটি অসম্পূর্ণ check আপনাকে একটি
cast-এর মতোই মিথ্যা আত্মবিশ্বাস দেয়। এজন্যই schema থেকে generate করা guard হাতে লেখা guard-এর চেয়ে নিরাপদ।

**Q: Exhaustiveness checking কীভাবে কাজ করে?**

Narrowing একটি union থেকে handle করা member-গুলো সরিয়ে দেয়। তাই `default` branch-এ value-এর type হলো যা যা
handle হয়নি, তাদের union। এটাকে `never`-এ assign করা তখনই সফল হয়, যখন কিছুই বাকি থাকে না। একটি member যোগ
করুন, আর ঠিক সেই লাইনে assignment-টি compile হবে না। Error-টি সরাসরি সেই switch-টি দেখিয়ে দেয়, যেটা update করতে হবে।

**Q: Narrowing কেন একটি callback-এর ভেতরে টিকে থাকে না?**

কারণ check আর callback চলার মাঝখানে value-টি যে বদলায়নি, compiler সেটা প্রমাণ করতে পারে না। অন্য কোনো function
property-টি আবার assign করে দিতে পারে। Narrow করা value-টি একটি `const`-এ ধরে রাখলে সমস্যা মিটে যায়: একটি
`const` আবার assign করা যায় না, তাই narrowing টিকে থাকে।

## এরপর কী পড়বেন

- [Chapter ?? — Interface ও Type Alias](#ch-interfaces-types) — narrow করার মতো union design করা
- [Chapter ?? — TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) — conditional type, branch-এর type-স্তরের রূপ
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — একটি সত্যিকারের boundary-তে schema validation
