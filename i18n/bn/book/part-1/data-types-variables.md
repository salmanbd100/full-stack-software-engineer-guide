---
sourceHash: "04ba36700b447da155cd344db66493e6c8ed3ec87c05963dcf694fc6feb1d607"
title: "Data Type, Variable ও Built-in"
translatedAt: "2026-10-13T11:51:52.626Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Data Type, Variable ও Built-in {#ch-data-types-variables}

> Code চালানোর আগেই বলে দিন value-টা কী করবে: কোন type copy হয়, কোনটা share হয়, কোন তুলনা ভুল বলে, আর কোন built-in method মূল জিনিসটাই বদলে দেয়।

**এই অধ্যায়ে:** primitive আর reference · coercion, `??` আর equality · `var`, `let` আর `const` · `Map`, `Set` আর copy · যে array method মূল array বদলে দেয়

## 💡 মূল ধারণা

JavaScript-এ value দুই ধরনের, আর type-এর বেশিরভাগ bug এই ভাগ থেকেই আসে। **Primitive** মানে value নিজেই: assign
করলে একটি copy পান। **Reference type** মানে একটি ঠিকানা: assign করলে দুটি নামই একই object-এর দিকে দেখায়। চারটি
অবাক করা ব্যাপারের ব্যাখ্যা এই একটি ভাগেই। এজন্যই `===` অবাক করে, spread মানে deep copy নয়, `const` মানে
immutable নয়, আর `sort` একটি React prop-এর ক্রম বদলে দিতে পারে।

## কীভাবে কাজ করে

| দিক            | Primitive                                                            | Reference type               |
| -------------- | --------------------------------------------------------------------- | ----------------------------- |
| **Type**      | `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint` | `Object`, `Array`, `Function` |
| **Assign করলে** | Value-টা copy হয়                                                      | ঠিকানাটা copy হয়            |
| **বদলানো যায়?** | না। শুধু variable-টা নতুন করে assign করা যায়                            | জায়গায় বসেই বদলানো যায়      |
| **তুলনা**      | Value মেলায়                                                           | Identity মেলায়               |

**Assign করলে হয় value copy হয়, নয়তো ঠিকানা:**

```typescript
let a: number = 10;
let b: number = a; // copies the value
b = 20; // a is still 10

const obj1: { name: string } = { name: 'Alice' };
const obj2 = obj1; // copies the address
obj2.name = 'Bob'; // obj1.name is 'Bob' too — one object, two names
```

> ⚠️ Array-ও object। `const copy = original` লিখলে আপনি একই array-এর আরেকটি নাম পান, দ্বিতীয় কোনো array নয়। React
> state-এ ভুল করে কিছু বদলে ফেলার সবচেয়ে চেনা কারণ এটাই।

### Coercion আর equality

দুই পাশের type আলাদা হলে JavaScript সেগুলো বদলে নেয়। `+`-এর যেকোনো এক পাশে string থাকলে সে string-ই পছন্দ করে।
বাকি সব arithmetic operator পছন্দ করে number।

<!-- lint-allow-fence: javascript — the subject is implicit coercion; TypeScript rejects `'5' - 3` and `5 == '5'`, which is exactly what this fence has to show -->
```javascript
'5' + 3; // '53'   — one side is a string, so both become strings
'5' - 3; // 2      — `-` has no string meaning, so both become numbers
5 == '5'; // true   — `==` coerces first
5 === '5'; // false  — `===` compares type and value
null == undefined; // true
```

ছয়টি value falsy: `0`, `''`, `null`, `undefined`, `NaN`, `false`। **বাকি সব truthy**, `'0'`, `[]` আর `{}`-ও। তাই
`0` যখন সত্যিকারের একটি count, তখন `count || 10` একটি bug। তার বদলে লিখুন `count ?? 10`: `??` (ES2020) শুধু
`null` আর `undefined` এলেই default-এ যায়।

### Declare করার তিনটি উপায়

| রূপ     | Scope    | Declaration-এর আগে                     | আবার assign | কখন ব্যবহার করবেন                |
| ------- | -------- | -------------------------------------- | -------- | --------------------- |
| `var`   | Function | `undefined` (hoist হয়)                  | ✅        | ❌ কখনো না, পুরনো জিনিস      |
| `let`   | Block    | ❌ `ReferenceError` (temporal dead zone) | ✅        | শুধু যখন আবার assign করবেন |
| `const` | Block    | ❌ `ReferenceError`                     | ❌        | ✅ Default             |

`const` আটকে দেয় **binding**-টা, value-টা নয়। `const user = {...}; user.name = 'Bob'` পুরোপুরি বৈধ। সত্যিকারের
immutable object চাইলে লাগবে `Object.freeze` বা একটি `readonly` type। মনে রাখবেন, `Object.freeze` shallow: ভেতরের
object-গুলো তখনো বদলানো যায়।

### Key দিয়ে রাখা collection

Object প্রতিটি key-কে string বানিয়ে ফেলে। `Map` আপনার দেওয়া key-টাই রাখে।

```typescript
const cache = new Map<object, string>(); // any value as a key, insertion order, a real `.size`
const unique: string[] = [...new Set(['a', 'b', 'a'])]; // unique values, O(1) membership
```

| দরকার                           | `Object`                        | `Map`                         |
| ------------------------------ | ------------------------------- | ----------------------------- |
| String নয় এমন key              | ❌ String হয়ে যায়                 | ✅ যেকোনো value, object-ও   |
| ঘনঘন যোগ আর মোছা               | ধীর                              | ✅ এর জন্যই বানানো           |
| User input থেকে আসা key         | ❌ `__proto__`-এর সঙ্গে ধাক্কা লাগতে পারে | ✅ ধাক্কা খাওয়ার মতো prototype chain নেই |

`WeakMap` তার key-গুলো দুর্বলভাবে ধরে রাখে: garbage collector-কে সেগুলো free করতে বাধা দেয় না। Key-টাকে আর কেউ
reference না করলেই entry-টা উধাও হয়ে যায়। তাই DOM node-এর সঙ্গে metadata জুড়ে রাখার ঠিক জায়গা এটাই।

### Array method, আর যেগুলো মূল array বদলে দেয়

কোন method বেছে নিলেন, সেটা দেখেই পাঠক callback পড়ার আগে বুঝে যান result দেখতে কেমন হবে। `map` মানে "একই
length, নতুন value"। `filter` মানে "কম item"। `reduce` মানে "অনেকগুলো থেকে একটি value"।

| Method                          | কী return করে                | মূল array বদলায়? |
| ------------------------------- | ---------------------- | -------- |
| `map`, `filter`, `flatMap`, `slice` | নতুন একটি array        | না       |
| `reduce`                        | যেকোনো চেহারার একটি value | না       |
| `find` / `findIndex`            | Element বা `undefined` / index বা `-1` | না |
| `some` / `every`                | Boolean, উত্তর মিলে গেলেই থামে | না      |
| **`sort`, `reverse`, `splice`** | **একই** array     | **হ্যাঁ**  |
| **`push`, `pop`, `shift`, `unshift`** | Length বা element | **হ্যাঁ** |

`sort`, `reverse` আর `splice` মানুষকে অবাক করে, কারণ এদের দেখতে চারপাশের নিরাপদ method-গুলোর মতোই। ES2023 এদের
copy করা version এনেছে: `toSorted`, `toReversed`, `toSpliced`, আর একটি item বদলানোর জন্য `with(index, value)`।

**রূপ বদলানো, ছাঁকা, এক করা, ভাগ করা:**

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

Object-এর বেলায় `map` আর `filter`-এর সমান হলো `Object.entries` → রূপ বদলানো → `Object.fromEntries`। পুরো
`Object.keys` পরিবার inherit করা property বাদ দেয়। `for...in` বাদ দেয় না।

## কখন ব্যবহার করবেন

Value model-এর আসল কাজ বোঝা যায় copy করার সময়। বদলটা কত গভীরে যাচ্ছে, সেটা দেখে বেছে নিন।

| পরিস্থিতি                                  | কী ব্যবহার করবেন                         | কেন                                                  |
| ----------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| ওপরের স্তরের একটি field বদলানো                | `{ ...obj, field: next }`         | সবচেয়ে সস্তা। ভেতরের object share-ই থাকে, তাতে সমস্যা নেই  |
| ভেতরের কোনো field বদলানো                     | যে যে স্তর ছুঁচ্ছেন, প্রতিটিতে spread   | Structural sharing বাকি অংশকে referentially equal রাখে |
| যেকোনো data-র snapshot (`Date`, `Map`)   | `structuredClone(obj)`            | Native, cycle সামলায়। Function পেলে throw করে          |
| অন্যের list-এর ক্রম বদলানো                  | `toSorted()`                      | গঠনগতভাবেই মূল list-এ হাত পড়ে না            |
| মাঝপথে বেরিয়ে যাওয়া, বা প্রতিটি item-এ `await` | `for...of`                        | `forEach` `break` করতে পারে না, await-ও করে না          |
| Primitive-এর duplicate সরানো              | `[...new Set(list)]`              | O(n), আর পড়লেই বোঝা যায় কী করছে                         |

**ভেতরের স্তরে immutable update: পথের প্রতিটি স্তরে spread:**

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

**❌ Caller-এর এখনো দরকার এমন argument বদলে ফেলা:**

```typescript
function addItem<T>(arr: T[], item: T): T[] {
  arr.push(item); // the caller's array changed
  return arr;
}
```

**✅ `readonly` নিন আর নতুন array return করুন। এখন type নিজেই নিয়মটা চাপিয়ে দেয়:**

```typescript
function addItem<T>(arr: readonly T[], item: T): T[] {
  return [...arr, item];
}
```

**❌ Spread-কে deep copy ভাবা।** `{ ...original }` শুধু এক স্তর copy করে। `copy.b.c = 3` লিখলে
`original.b.c`-ও বদলে যায়, কারণ `b` কখনো copy-ই হয়নি।

**❌ Comparator ছাড়া number-এর ওপর `sort`।** Default অবস্থায় value-গুলো string হয়ে যায়:

```typescript
[10, 5, 40, 1000].sort(); // ❌ [10, 1000, 40, 5]
[10, 5, 40, 1000].toSorted((a, b) => a - b); // ✅ [5, 10, 40, 1000], and the original is untouched
```

**❌ `forEach`-এর ভেতরে `await`।** প্রতিটি callback যে promise return করে, `forEach` সেটা ফেলে দেয়। ফলে কাজ শেষ হওয়ার
আগেই loop শেষ। একটির পর একটি কাজের জন্য `for...of` লিখুন, আর একসঙ্গে চালাতে `await Promise.all(items.map(save))`।

**❌ `null` দেখার আগে object কি না দেখা।** `typeof null === 'object'`, তাই `null` গিয়ে পড়ে object-এর branch-এ, আর
পরের property access-এই throw হয়। আগে `value === null` দেখে নিন।

**❌ অভ্যাসবশে `==` লেখা।** এর একটিই যুক্তিসঙ্গত ব্যবহার আছে: `value == null`, যেটা `null` আর `undefined` দুটিই
একসঙ্গে ধরে। বাকি সব জায়গায় `===` লিখুন।

## 🔑 মূল শিক্ষা

- Primitive assign হয় value দিয়ে। Object, array আর function assign হয় ঠিকানা দিয়ে।
- `const` শুধু binding-টা নতুন করে assign করা আটকায়, আর কিছু না। Object-টা তখনো বদলানো যায়।
- Falsy value মাত্র ছয়টি, তাই number বা string-এর default বসবে `??`-এর পেছনে, `||`-এর নয়।
- `sort`, `reverse`, `splice` আর `push` পরিবার মূল জিনিসটা বদলে দেয়। `toSorted` আর `with` হলো এদের copy করা version।
- Spread এক স্তর copy করে। তার চেয়ে গভীরে লাগলে `structuredClone`, নয়তো প্রতিটি স্তরে একটি করে spread।

## Interview-এর প্রশ্ন

**Q: এক variable দিয়ে property বদলালে আরেকটি variable-এ কেন তার প্রভাব পড়ে?**

দুটি variable-এ একই data নেই, আছে একই ঠিকানা। Assign করার সময় reference copy হয়েছে, তাই object আসলে একটিই, নাম
দুটি। আলাদা একটি object চাইলে নিজে copy করতে হবে। Flat object-এর জন্য spread, nested-এর জন্য `structuredClone`।

**Q: `const arr = [1, 2]; arr.push(3);` — এটা বৈধ কেন?**

`const` বাঁধে binding-কে, value-কে নয়। Binding যে array-এর দিকে দেখায়, `push` সেই array-টা বদলায়। Binding নিজে কখনো
বদলায় না। Error হতো `arr = []` লিখলে।

**Q: `map` আর `forEach`-এর পার্থক্য কী?**

`map` callback-এর return value দিয়ে একই length-এর নতুন array বানিয়ে return করে। `forEach` return করে `undefined`, এর
কাজ শুধু side effect। `map` call করে result ফেলে দিলে অকারণে একটি array তৈরি হয়। আর কোনোটাতেই প্রতিটি item-এ await
করা যায় না।

**Q: `id` দেখে object-এর array থেকে duplicate কীভাবে সরাবেন?**

`Set` object তুলনা করে identity দিয়ে, তাই এখানে কাজে আসে না। তার বদলে field-টাকে key বানান:
`[...new Map(items.map((i) => [i.id, i])).values()]`। এতে O(n)-এ শেষবার যেটা এসেছে, সেটা থাকে।

**Q: কখন `reduce` ভুল পছন্দ?**

যখনই কোনো নামওয়ালা method কথাটা আরও পরিষ্কার বলে। যে `reduce` একই length-এর array return করে, সে আসলে `map`।
যে কিছু অংশ return করে, সে `filter`, আর যে boolean return করে, সে `some` বা `every`। `reduce` রাখুন সত্যিকারের রূপ
বদলের জন্য, যেমন যোগফল বা lookup table। ভাগ করার জন্য `Object.groupBy` ভালো।

## এরপর কী পড়বেন

- [Chapter ?? — Scope ও Closure](#ch-closures) — `let` আর `const` binding কোথায় জন্মায় আর কোথায় মরে
- [Chapter ?? — TypeScript-এর Basic Type, Literal ও Enum](#ch-basic-types) — একই value model, এবার compiler পাহারায়
- [Chapter ?? — Promise, Async/Await ও Error](#ch-promises-async) — async-ভাবে loop চালানোর ঠিক উপায়
