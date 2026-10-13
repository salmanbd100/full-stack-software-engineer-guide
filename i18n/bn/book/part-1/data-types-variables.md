---
sourceHash: "04ba36700b447da155cd344db66493e6c8ed3ec87c05963dcf694fc6feb1d607"
title: "Data Type, Variable ও Built-in"
translatedAt: "2026-10-13T12:10:31.000Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Data Type, Variable ও Built-in {#ch-data-types-variables}

> Code চালানোর আগেই বলে দিন একটি value কী করবে: কোন type copy হয়, কোনটা share হয়, কোন তুলনা ভুল উত্তর দেয়, আর কোন built-in method মূল জিনিসটাই বদলে দেয়।

**এই অধ্যায়ে:** primitive বনাম reference · coercion, `??` আর equality · `var`, `let` আর `const` · `Map`, `Set` আর copy · যে array method মূল array বদলে দেয়

## 💡 মূল ধারণা

JavaScript-এ value দুই রকম, আর type-এর বেশিরভাগ bug এই ভাগ থেকেই আসে। **Primitive** হলো value নিজেই: assign
করলে একটি copy পাবেন। **Reference type** হলো একটি ঠিকানা: assign করলে দুটি নামই একই object-এর দিকে দেখায়। এই
একটি ভাগ থেকেই চারটি চমকের ব্যাখ্যা আসে। `===` কেন অবাক করে, spread কেন deep copy নয়, `const` মানে কেন
immutable নয়, আর `sort` কেন একটি React prop-এর ক্রম বদলে দিতে পারে।

## কীভাবে কাজ করে

| দিক         | Primitive                                                            | Reference type               |
| -------------- | --------------------------------------------------------------------- | ----------------------------- |
| **Type**      | `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint` | `Object`, `Array`, `Function` |
| **Assign করলে** | Value-টা copy হয়                                                      | ঠিকানাটা copy হয়            |
| **বদলানো যায়?** | না, শুধু variable-টাকে নতুন value দেওয়া যায়                        | হ্যাঁ, জায়গায় দাঁড়িয়েই বদলায়              |
| **তুলনা** | Value মেলায়                                                      | Identity মেলায়, মানে একই object কি না             |

**Assign করলে হয় value copy হয়, নয়তো ঠিকানা:**

```typescript
let a: number = 10;
let b: number = a; // copies the value
b = 20; // a is still 10

const obj1: { name: string } = { name: 'Alice' };
const obj2 = obj1; // copies the address
obj2.name = 'Bob'; // obj1.name is 'Bob' too — one object, two names
```

> ⚠️ Array-ও object। `const copy = original` লিখলে আপনি একটি array-এর দ্বিতীয় একটি নাম পান, দ্বিতীয় কোনো array
> নয়। React state-এ না বুঝে mutation হওয়ার সবচেয়ে বড় উৎস এটাই।

### Coercion আর equality

দুই পাশের operand-এর type আলাদা হলে JavaScript একটিকে অন্যটায় বদলে নেয়। `+`-এর কোনো এক পাশে string থাকলে সে
string-এর দিকে যায়। বাকি সব arithmetic operator যায় number-এর দিকে।

<!-- lint-allow-fence: javascript — the subject is implicit coercion; TypeScript rejects `'5' - 3` and `5 == '5'`, which is exactly what this fence has to show -->
```javascript
'5' + 3; // '53'   — one side is a string, so both become strings
'5' - 3; // 2      — `-` has no string meaning, so both become numbers
5 == '5'; // true   — `==` coerces first
5 === '5'; // false  — `===` compares type and value
null == undefined; // true
```

ছয়টি value falsy: `0`, `''`, `null`, `undefined`, `NaN`, `false`। **বাকি সব truthy**, এমনকি `'0'`, `[]` আর
`{}`-ও। এ কারণেই `0` যখন সত্যিকারের একটি count, তখন `count || 10` একটি bug। তার বদলে লিখুন
`count ?? 10`: `??` (ES2020) শুধু `null` আর `undefined` পেলেই default-এ যায়।

### তিন রকম declaration

| ধরন    | Scope    | Declaration-এর আগে পড়লে                     | নতুন value দেওয়া যায় | কখন ব্যবহার করবেন                |
| ------- | -------- | -------------------------------------- | -------- | --------------------- |
| `var`   | Function | `undefined` (hoisted)                  | ✅        | ❌ কখনো না, এটা পুরনো জিনিস      |
| `let`   | Block    | ❌ `ReferenceError` (temporal dead zone) | ✅        | শুধু যখন নতুন value দিতে হবে |
| `const` | Block    | ❌ `ReferenceError`                     | ❌        | ✅ সাধারণভাবে এটাই             |

`const` আটকে দেয় **binding**-কে, value-কে নয়। `const user = {...}; user.name = 'Bob'` পুরোপুরি বৈধ। সত্যিকারের
immutable object চাইলে লাগবে `Object.freeze` বা একটি `readonly` type। মনে রাখবেন, `Object.freeze` অগভীর: ভেতরের
object-গুলো তখনো বদলানো যায়।

### Key দিয়ে রাখা collection

Object প্রতিটি key-কে string বানিয়ে ফেলে। `Map` আপনি যে key দিয়েছেন, সেটাই রাখে।

```typescript
const cache = new Map<object, string>(); // any value as a key, insertion order, a real `.size`
const unique: string[] = [...new Set(['a', 'b', 'a'])]; // unique values, O(1) membership
```

| দরকার                           | `Object`                        | `Map`                         |
| ------------------------------ | ------------------------------- | ----------------------------- |
| String নয় এমন key                     | ❌ String হয়ে যায়           | ✅ যেকোনো value, object-ও |
| ঘন ঘন যোগ করা আর মোছা        | ধীর                          | ✅ এর জন্যই বানানো                |
| User-এর input থেকে আসা key | ❌ `__proto__`-এর সঙ্গে ধাক্কা লাগতে পারে  | ✅ ধাক্কা লাগার মতো prototype chain-ই নেই   |

`WeakMap` তার key-গুলো দুর্বলভাবে ধরে রাখে: garbage collector-কে সেগুলো মুছে ফেলতে বাধা দেয় না। অন্য কোথাও key-টার
আর কোনো reference না থাকলে entry-টাও হারিয়ে যায়। তাই কোনো DOM node-এর সঙ্গে metadata জুড়ে রাখার ঠিক জায়গা এটাই।

### Array method, আর যেগুলো মূল array বদলে দেয়

কোন method বেছে নিচ্ছেন, তা দেখেই পাঠক callback পড়ার আগে বুঝে যান ফলটা কেমন হবে। `map` মানে "একই length,
নতুন value"। `filter` মানে "কম item"। `reduce` মানে "অনেকগুলো থেকে একটি value"।

| Method                          | কী return করে                | মূল array বদলায়? |
| ------------------------------- | ---------------------- | -------- |
| `map`, `filter`, `flatMap`, `slice` | নতুন একটি array        | না       |
| `reduce`                        | যেকোনো আকারের একটি value | না       |
| `find` / `findIndex`            | Element বা `undefined` / index বা `-1` | না |
| `some` / `every`                | Boolean, উত্তর মিললেই থেমে যায় | না      |
| **`sort`, `reverse`, `splice`** | **সেই একই** array     | **হ্যাঁ**  |
| **`push`, `pop`, `shift`, `unshift`** | Length বা element | **হ্যাঁ** |

`sort`, `reverse` আর `splice` মানুষকে চমকে দেয়, কারণ দেখতে পাশের নিরাপদ method-গুলোর মতোই। ES2023 এদের copy
করা রূপ এনেছে: `toSorted`, `toReversed`, `toSpliced`, আর একটি item বদলানোর জন্য `with(index, value)`।

**বদলানো, ছাঁকা, ভাঁজ করা, দলে ভাগ করা:**

```typescript
interface Order {
  id: number;
  total: number;
  status: 'paid' | 'pending';
}

const paid: Order[] = orders.filter((o) => o.status === 'paid');
const sum: number = orders.reduce((acc: number, o: Order) => acc + o.total, 0); // always pass the initial value
const byStatus = Object.groupBy(orders, (o: Order) => o.status); // ES2024 — replaces a grouping reduce
const next: Order[] = orders.with(0, { ...orders[0], status: 'paid' }); // a new array, one item replaced
```

Object-এর বেলায় `map` আর `filter`-এর সমান কাজ হলো `Object.entries` → বদলানো → `Object.fromEntries`। পুরো
`Object.keys` পরিবার inherited property বাদ দেয়। `for...in` দেয় না।

## কখন ব্যবহার করবেন

Value model সবচেয়ে বেশি কাজে আসে copy করার সময়। বদলটা কত গভীরে যাচ্ছে, তা দেখে বেছে নিন।

| পরিস্থিতি                                  | কী ব্যবহার করবেন                         | কেন                                                  |
| ----------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| ওপরের স্তরের একটি field বদলানো                | `{ ...obj, field: next }`         | সবচেয়ে সস্তা; ভেতরের object-গুলো shared থাকে, তাতে সমস্যা নেই  |
| ভেতরের কোনো field বদলানো                     | যে যে স্তরে হাত দিচ্ছেন, প্রতিটিতে spread   | Structural sharing-এ বাকি অংশ reference হিসেবে একই থাকে |
| যেকোনো data-র snapshot (`Date`, `Map`)   | `structuredClone(obj)`            | Native, cycle সামলায়; function পেলে throw করে          |
| অন্যের দেওয়া list-এর ক্রম বদলানো             | `toSorted()`                      | গঠনগতভাবেই মূল list-এ হাত পড়ে না            |
| মাঝপথে থামা, বা প্রতিটি item-এ `await`           | `for...of`                        | `forEach` `break` করতে পারে না, await-ও করে না          |
| Primitive থেকে duplicate বাদ দেওয়া                    | `[...new Set(list)]`              | O(n), আর যা বোঝাতে চায় ঠিক তা-ই বলে                         |

**ভেতরের field-এর immutable update: path-এর প্রতিটি স্তরে spread:**

```typescript
interface AppState {
  user: { name: string; age: number };
  settings: { theme: 'light' | 'dark' };
}

const nextState: AppState = {
  ...state,
  user: { ...state.user, age: 31 }, // `settings` is reused by reference
};
```

## সাধারণ ভুল

**❌ যে argument এখনো caller-এর, সেটাকেই বদলে দেওয়া:**

```typescript
function addItem<T>(arr: T[], item: T): T[] {
  arr.push(item); // the caller's array changed
  return arr;
}
```

**✅ `readonly` নিন আর নতুন array return করুন। এখন type নিজেই নিয়মটা মানতে বাধ্য করে:**

```typescript
function addItem<T>(arr: readonly T[], item: T): T[] {
  return [...arr, item];
}
```

**❌ Spread-কে deep copy ভাবা।** `{ ...original }` শুধু এক স্তর copy করে। `copy.b.c = 3` লিখলে
`original.b.c`-ও বদলে যায়, কারণ `b` কখনো copy-ই হয়নি।

**❌ Comparator ছাড়া number-এ `sort`।** Default অবস্থায় সে value-গুলোকে string বানিয়ে সাজায়:

```typescript
[10, 5, 40, 1000].sort(); // ❌ [10, 1000, 40, 5]
[10, 5, 40, 1000].toSorted((a, b) => a - b); // ✅ [5, 10, 40, 1000], and the original is untouched
```

**❌ `forEach`-এর ভেতরে `await`।** প্রতিটি callback যে promise return করে, `forEach` সেটা ফেলে দেয়। ফলে কাজ
শেষ হওয়ার আগেই loop শেষ। পরপর কাজের জন্য `for...of` লিখুন, একসঙ্গে কাজের জন্য `await Promise.all(items.map(save))`।

**❌ `null` দেখার আগে object কি না দেখা।** `typeof null === 'object'`, তাই `null` গিয়ে পড়ে object-এর branch-এ, আর
পরের property পড়তেই throw হয়। আগে `value === null` দেখে নিন।

**❌ অভ্যাসের বশে `==` লেখা।** এর একমাত্র যুক্তিসঙ্গত ব্যবহার `value == null`, যা `null` আর `undefined`
দুটিকে একসঙ্গে ধরে। বাকি সব জায়গায় `===`।

## 🔑 মূল শিক্ষা

- Primitive assign হয় value হিসেবে। Object, array আর function assign হয় ঠিকানা হিসেবে।
- `const` শুধু binding-এ নতুন value দেওয়া আটকায়, আর কিছু নয়। Object-টা তখনো বদলানো যায়।
- Falsy value মাত্র ছয়টি, তাই number বা string-এর default বসবে `??`-এর পেছনে, `||`-এর পেছনে নয়।
- `sort`, `reverse`, `splice` আর `push` পরিবার মূল array বদলে দেয়। `toSorted` আর `with` হলো copy করা রূপ।
- Spread এক স্তর copy করে। আরও গভীরে যেতে লাগবে `structuredClone`, বা প্রতিটি স্তরে আলাদা spread।

## Interview-এর প্রশ্ন

**Q: একটি variable দিয়ে property বদলালে অন্য variable-এও কেন বদল দেখা যায়?**

দুটি variable একই data ধরে না, ধরে একই ঠিকানা। Assign করার সময় reference-টা copy হয়েছে, তাই object একটিই, শুধু নাম
দুটি। আলাদা object চাইলে নিজে copy করতে হবে। সমতল object-এর জন্য spread, ভেতরে ভেতরে object থাকলে
`structuredClone`।

**Q: `const arr = [1, 2]; arr.push(3);` — এটা বৈধ কেন?**

`const` বাঁধে binding-কে, value-কে নয়। `push` বদলায় binding যে array-র দিকে দেখাচ্ছে সেটাকে, binding নিজে একই
থাকে। Error হতো `arr = []` লিখলে।

**Q: `map` আর `forEach`-এর পার্থক্য কী?**

`map` callback-এর return value দিয়ে একই length-এর নতুন array বানিয়ে return করে। `forEach` return করে `undefined`,
এর কাজ শুধু side effect। `map` call করে ফল ফেলে দিলে অকারণে একটি array তৈরি হয়। আর দুটির কোনোটাই প্রতিটি item-এ
await করতে পারে না।

**Q: Object-এর array থেকে `id` ধরে duplicate কীভাবে বাদ দেবেন?**

`Set` object মেলায় identity দিয়ে, তাই এখানে কাজে আসে না। তার বদলে field-টাকে key বানান:
`[...new Map(items.map((i) => [i.id, i])).values()]`। এতে O(n)-এ শেষবার যেটা এসেছে সেটা থাকে।

**Q: কখন `reduce` ভুল পছন্দ?**

যখনই নাম-ওয়ালা কোনো method কথাটা আরও পরিষ্কার করে বলে। যে `reduce` একই length-এর array return করে, সেটা আসলে
`map`। যেটা একটি অংশ return করে সেটা `filter`, আর যেটা boolean দেয় সেটা `some` বা `every`। `reduce` রাখুন আকার
সত্যিই বদলানোর জন্য, যেমন যোগফল বা lookup table। দলে ভাগ করতে `Object.groupBy` ভালো।

## এরপর কী পড়বেন

- [Chapter ?? — Scope ও Closure](#ch-closures) — `let` আর `const` binding কোথায় জন্মায় আর কোথায় মরে
- [Chapter ?? — TypeScript-এর Basic Type, Literal ও Enum](#ch-basic-types) — একই value model, এবার compiler পাহারা দিচ্ছে
- [Chapter ?? — Promise, Async/Await ও Error](#ch-promises-async) — asynchronous ভাবে iterate করার ঠিক উপায়
