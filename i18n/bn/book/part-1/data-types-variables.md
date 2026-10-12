---
sourceHash: "04ba36700b447da155cd344db66493e6c8ed3ec87c05963dcf694fc6feb1d607"
title: "Data Type, Variable ও Built-in"
translatedAt: "2026-10-12T07:46:13.234Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Data Type, Variable ও Built-in {#ch-data-types-variables}

> চালানোর আগেই বলে দিন একটি value কী করবে — কোন type copy হয়, কোনটা share হয়, কোন তুলনা ভুল ফল দেয়, আর কোন built-in method mutate করে।

**এই অধ্যায়ে:** primitive বনাম reference · coercion, `??` আর equality · `var`, `let` আর `const` · `Map`, `Set` আর copy · যে array method-গুলো mutate করে

## 💡 মূল ধারণা

JavaScript-এ value দুই রকমের। এই ভাগটাই বেশিরভাগ type bug-এর ব্যাখ্যা দেয়। একটি **primitive** হলো value নিজেই:
assign করলে আপনি একটি copy পান। একটি **reference type** হলো একটি address: assign করলে দুটো নামই একই object-কে
নির্দেশ করে। এই একটি ভাগ চারটি অবাক করা ব্যাপার ব্যাখ্যা করে। এ কারণেই `===` আপনাকে অবাক করে, spread কেন deep
copy নয়, `const` মানে কেন immutable নয়, আর `sort` কেন একটি React prop-এর ক্রম বদলে দিতে পারে।

## কীভাবে কাজ করে

| দিক            | Primitive                                                             | Reference type                |
| -------------- | --------------------------------------------------------------------- | ----------------------------- |
| **Type**       | `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint` | `Object`, `Array`, `Function` |
| **Assignment** | Value copy করে                                                        | Address copy করে              |
| **Mutability** | Immutable — শুধু variable-টি আবার assign করা যায়                      | জায়গায় বসেই বদলানো যায়      |
| **তুলনা**      | Value তুলনা করে                                                       | Identity তুলনা করে            |

**Assignment হয় একটি value copy করে, নয়তো একটি address copy করে:**

```typescript
let a: number = 10;
let b: number = a; // copies the value
b = 20; // a is still 10

const obj1: { name: string } = { name: 'Alice' };
const obj2 = obj1; // copies the address
obj2.name = 'Bob'; // obj1.name is 'Bob' too — one object, two names
```

> ⚠️ Array-ও object। `const copy = original` আপনাকে একটি array-এর দ্বিতীয় একটি নাম দেয়, দ্বিতীয় একটি array নয়।
> React state-এ অজান্তে mutation হওয়ার সবচেয়ে সাধারণ উৎস এটাই।

### Coercion আর equality

Operand-গুলোর type আলাদা হলে JavaScript সেগুলোকে convert করে। দুই পাশের যেকোনো একটি string হলে `+` string-কেই
বেছে নেয়। বাকি সব arithmetic operator number বেছে নেয়।

<!-- lint-allow-fence: javascript — the subject is implicit coercion; TypeScript rejects `'5' - 3` and `5 == '5'`, which is exactly what this fence has to show -->
```javascript
'5' + 3; // '53'   — one side is a string, so both become strings
'5' - 3; // 2      — `-` has no string meaning, so both become numbers
5 == '5'; // true   — `==` coerces first
5 === '5'; // false  — `===` compares type and value
null == undefined; // true
```

ছয়টি value falsy: `0`, `''`, `null`, `undefined`, `NaN`, `false`। **বাকি সবকিছু truthy**, `'0'`, `[]` আর `{}`
সহ। এ কারণেই `0` যখন একটি আসল count, তখন `count || 10` একটি bug। এর বদলে `count ?? 10` ব্যবহার করুন: `??`
(ES2020) শুধু `null` আর `undefined`-এর ক্ষেত্রেই বিকল্প value নেয়।

### Declaration-এর তিনটি রূপ

| রূপ     | Scope    | Declaration-এর আগে                       | আবার assign | কখন ব্যবহার করবেন           |
| ------- | -------- | -------------------------------------- | ----------- | ------------------------- |
| `var`   | Function | `undefined` (hoisted)                  | ✅           | ❌ কখনো না — পুরোনো ধারা    |
| `let`   | Block    | ❌ `ReferenceError` (temporal dead zone) | ✅           | শুধু আবার assign করলে      |
| `const` | Block    | ❌ `ReferenceError`                     | ❌           | ✅ Default                 |

`const` **binding**-টিকে আটকে দেয়, value-টিকে নয়। `const user = {...}; user.name = 'Bob'` বৈধ। সত্যিকারের
immutable object চাইলে আপনার দরকার `Object.freeze` বা একটি `readonly` type। মনে রাখবেন, `Object.freeze` shallow:
ভেতরের nested object-গুলো তখনো mutable থাকে।

### Keyed collection

একটি object প্রতিটি key-কে string বানিয়ে ফেলে। একটি `Map` আপনার দেওয়া key-টিই রেখে দেয়।

```typescript
const cache = new Map<object, string>(); // any value as a key, insertion order, a real `.size`
const unique: string[] = [...new Set(['a', 'b', 'a'])]; // unique values, O(1) membership
```

| প্রয়োজন                          | `Object`                        | `Map`                         |
| ------------------------------ | ------------------------------- | ----------------------------- |
| String নয় এমন key                | ❌ String বানিয়ে ফেলা হয়         | ✅ যেকোনো value, object সহ     |
| ঘন ঘন যোগ আর মুছে ফেলা          | ধীর                              | ✅ এর জন্যই বানানো             |
| User input থেকে আসা key          | ❌ `__proto__`-এর সাথে মিলে যেতে পারে | ✅ ধাক্কা খাওয়ার মতো কোনো prototype chain নেই |

`WeakMap` তার key-গুলোকে weakly ধরে রাখে: garbage collector-কে সেগুলো free করতে বাধা দেয় না। Key-টিকে আর কেউ
reference না করলেই entry-টি হারিয়ে যায়। তাই একটি DOM node-এর সাথে জুড়ে দেওয়া metadata রাখার সঠিক জায়গা এটাই।

### Array method, আর যেগুলো mutate করে

আপনি কোন method বেছে নিলেন, সেটা দেখেই পাঠক callback পড়ার আগে ফলাফলের আকার বুঝে যান। `map` মানে "একই length,
নতুন value"। `filter` মানে "কম item"। `reduce` মানে "অনেকগুলো থেকে একটি value"।

| Method                          | কী return করে          | Mutate করে? |
| ------------------------------- | ---------------------- | -------- |
| `map`, `filter`, `flatMap`, `slice` | একটি নতুন array     | না       |
| `reduce`                        | যেকোনো আকারের একটি value | না       |
| `find` / `findIndex`            | Element বা `undefined` / index বা `-1` | না |
| `some` / `every`                | Boolean, short-circuit করে | না      |
| **`sort`, `reverse`, `splice`** | **একই** array          | **হ্যাঁ**  |
| **`push`, `pop`, `shift`, `unshift`** | Length বা element | **হ্যাঁ** |

`sort`, `reverse` আর `splice` মানুষকে অবাক করে, কারণ এগুলো দেখতে আশেপাশের নিরাপদ method-গুলোর মতোই। ES2023
এগুলোর copy করা version যোগ করেছে: `toSorted`, `toReversed`, `toSpliced`, আর একটি item বদলানোর জন্য
`with(index, value)`।

**Transform, filter, fold, group:**

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

Object-এর ক্ষেত্রে `Object.entries` → transform → `Object.fromEntries` হলো `map` আর `filter`-এর সমতুল্য। পুরো
`Object.keys` পরিবার inherited property বাদ দেয়। `for...in` বাদ দেয় না।

## কখন ব্যবহার করবেন

Value model-এর আসল কাজে লাগে copy করার সময়। পরিবর্তন কত গভীরে যাচ্ছে, সেই অনুযায়ী বেছে নিন।

| পরিস্থিতি                                  | কী ব্যবহার করবেন                     | কেন                                                  |
| ----------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Top-level-এর একটি field বদলানো              | `{ ...obj, field: next }`         | সবচেয়ে সস্তা; nested object share-ই থাকে, তাতে সমস্যা নেই |
| একটি nested field বদলানো                    | যে প্রতিটি level ছোঁবেন, সেখানে spread | Structural sharing বাকি অংশকে referentially equal রাখে |
| যেকোনো data-র snapshot (`Date`, `Map`)       | `structuredClone(obj)`            | Native, cycle সামলায়; function পেলে throw করে         |
| এমন list-এর ক্রম বদলানো, যেটা আপনার নয়        | `toSorted()`                      | গঠনগতভাবেই original-এ হাত পড়ে না                      |
| আগেভাগে বেরিয়ে যাওয়া, বা প্রতিটি item-এ `await` | `for...of`                        | `forEach` `break` করতে পারে না, await-ও করে না         |
| Primitive-এর duplicate সরানো                | `[...new Set(list)]`              | O(n), আর যা বোঝায় ঠিক তা-ই বলে                       |

**Immutable update, nested — path-এর প্রতিটি level-এ spread করুন:**

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

**❌ এমন argument mutate করা, যেটা caller-এর হাতে এখনো আছে:**

```typescript
function addItem<T>(arr: T[], item: T): T[] {
  arr.push(item); // the caller's array changed
  return arr;
}
```

**✅ `readonly` নিন আর একটি নতুন array return করুন — এখন type-ই এটা নিশ্চিত করে:**

```typescript
function addItem<T>(arr: readonly T[], item: T): T[] {
  return [...arr, item];
}
```

**❌ Spread-কে deep copy ভাবা।** `{ ...original }` একটি level copy করে। `copy.b.c = 3` `original.b.c`-কেও বদলে
দেয়, কারণ `b` কখনো copy হয়নি।

**❌ Comparator ছাড়া number-এর ওপর `sort`।** Default আচরণ value-গুলোকে string বানিয়ে ফেলে:

```typescript
[10, 5, 40, 1000].sort(); // ❌ [10, 1000, 40, 5]
[10, 5, 40, 1000].toSorted((a, b) => a - b); // ✅ [5, 10, 40, 1000], and the original is untouched
```

**❌ `forEach`-এর ভেতরে `await`।** প্রতিটি callback যে promise return করে, `forEach` সেটা ফেলে দেয়। তাই কাজ শেষ
হওয়ার আগেই loop শেষ হয়ে যায়। পরপর কাজের জন্য `for...of` ব্যবহার করুন, আর একসাথে চালানোর জন্য
`await Promise.all(items.map(save))`।

**❌ `null` যাচাইয়ের আগে object যাচাই করা।** `typeof null === 'object'`, তাই `null` object-এর branch-এ ঢুকে পড়ে,
আর পরের property access throw করে। আগে `value === null` যাচাই করুন।

**❌ অভ্যাসবশে `==` ব্যবহার করা।** একমাত্র যুক্তিসঙ্গত ব্যবহার হলো `value == null`, যা `null` আর `undefined`
দুটোকেই একসাথে ধরে। বাকি সব জায়গায় `===` ব্যবহার করুন।

## 🔑 মূল শিক্ষা

- Primitive value হিসেবে assign হয়। Object, array আর function assign হয় address হিসেবে।
- `const` আপনাকে শুধু binding আবার assign করতে বাধা দেয়, আর কিছু নয়। Object-টি mutable-ই থাকে।
- মাত্র ছয়টি value falsy। তাই একটি number বা string-এর default-এর জায়গা `??`-এর পেছনে, `||`-এর পেছনে নয়।
- `sort`, `reverse`, `splice` আর `push` পরিবার mutate করে। `toSorted` আর `with` হলো copy করা version।
- Spread একটি level copy করে। এর চেয়ে গভীরে যেতে হলে লাগবে `structuredClone`, বা প্রতিটি level-এ একটি করে spread।

## Interview-এর প্রশ্ন

**Q: একটি variable দিয়ে একটি property বদলালে আরেকটি variable-এর ওপর কেন প্রভাব পড়ে?**

দুটো variable একই address ধরে রাখে, একই data নয়। Assignment reference-টি copy করেছে, তাই object একটিই, নাম দুটি।
আলাদা একটি object চাইলে স্পষ্টভাবে copy করতে হবে। Flat object-এর জন্য spread, আর nested object-এর জন্য
`structuredClone` ব্যবহার করুন।

**Q: `const arr = [1, 2]; arr.push(3);` — এটা বৈধ কেন?**

`const` binding-কে বাঁধে, value-কে নয়। Binding যে array-কে নির্দেশ করে, `push` সেটাকে বদলায়, binding নিজে কখনো
বদলায় না। Error হতো `arr = []` লিখলে।

**Q: `map` আর `forEach`-এর মধ্যে পার্থক্য কী?**

`map` callback-এর return value দিয়ে একই length-এর একটি নতুন array return করে। `forEach` `undefined` return করে,
এর অস্তিত্ব শুধু side effect-এর জন্য। `map` call করে ফলাফল উপেক্ষা করলে অকারণে একটি array allocate হয়। এদের
কোনোটাতেই প্রতিটি item-এ await করা যায় না।

**Q: Object-এর একটি array থেকে `id` অনুযায়ী duplicate কীভাবে সরাবেন?**

`Set` object-গুলোকে identity দিয়ে তুলনা করে, তাই এখানে কাজে আসে না। বরং field-টিকে key বানান:
`[...new Map(items.map((i) => [i.id, i])).values()]`। এটা O(n)-এ শেষ occurrence-টি রাখে।

**Q: `reduce` কখন ভুল পছন্দ?**

যখনই একটি নামওয়ালা method কথাটা আরও স্পষ্ট করে বলে। একই length-এর array return করা `reduce` আসলে একটি `map`।
একটি অংশ return করলে সেটা `filter`, আর একটি boolean return করলে সেটা `some` বা `every`। `reduce` রাখুন আকারের
সত্যিকারের পরিবর্তনের জন্য, যেমন একটি যোগফল বা একটি lookup table। Group করার জন্য `Object.groupBy` বেছে নিন।

## এরপর কী পড়বেন

- [Chapter ?? — Scope ও Closure](#ch-closures) — `let` আর `const` binding কোথায় জন্মায় আর কোথায় মরে
- [Chapter ?? — TypeScript-এর Basic Type, Literal ও Enum](#ch-basic-types) — একই value model, সাথে একটি compiler যেটা যাচাই করে
- [Chapter ?? — Promise, Async/Await ও Error](#ch-promises-async) — asynchronously iterate করার সঠিক উপায়
