---
sourceHash: "0d5639d1c54c5695c9f2faed56f329991cb0ecbf4db252c4445ef8d313e19909"
title: "Scope ও Closure"
translatedAt: "2026-10-13T11:37:05.424Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Scope ও Closure {#ch-closures}

> কোন variable কোথায় থাকে আর কতক্ষণ বাঁচে, সেটা আগে বুঝে নিন। তারপর function-এর ধরে রাখা scope জেনে-বুঝে কাজে লাগান: privacy-র জন্য, factory বানাতে, আর memory leak না করে।

**এই অধ্যায়ে:** lexical scope আর scope chain · hoisting আর temporal dead zone · declaration, expression আর arrow · closure আসলে কী ধরে রাখে · loop variable-এর ফাঁদ আর closure leak

## 💡 মূল ধারণা

JavaScript-এ scope হলো **lexical**। মানে, কোনো variable কোথা থেকে পড়া যাবে, তা ঠিক হয় code-টা কোথায় লেখা
আছে তা দেখে। কে function-টা call করছে, তাতে কিছু যায় আসে না। ভেতরের code বাইরের scope-এর variable দেখতে পায়,
কিন্তু বাইরের code ভেতরেরটা দেখতে পায় না।

**Closure** এই নিয়ম থেকেই আসে। Function যে scope-এর ভেতরে লেখা, সেই scope-টা সে সঙ্গে নিয়ে ঘোরে। যতদিন
function বেঁচে আছে, scope-ও ততদিন বেঁচে থাকে, বাইরের function return করে গেলেও। Closure-এর প্রায় সব প্রশ্নের
উত্তর একটা কথায় লুকিয়ে আছে: closure **value-র copy রাখে না, reference রাখে**। তাই একই variable-এর ওপর দুটো
closure থাকলে দুটোই একই value দেখে। পরে value বদলালে সেই বদল দুটোর কাছেই পৌঁছায়।

## কীভাবে কাজ করে

**Scope chain: খোঁজা শুরু হয় ভেতর থেকে, তারপর এক ধাপ এক ধাপ করে বাইরে:**

```typescript
function outer(): () => void {
  const message: string = 'still here';
  return function inner(): void {
    console.log(message); // own scope, then parent, then up to module scope
  };
}

const closure = outer();
closure(); // 'still here' — outer has returned, but its scope has not been collected
```

`outer`-এর call frame শেষ, তবু garbage collector `message`-কে মুছতে পারে না। কারণ return হওয়া function-টা সেই
scope-টা ধরে রেখেছে। পুরো ব্যাপারটা এটুকুই। এরপর যা আসছে, সবই এই একটা জিনিসের ব্যবহার।

### Hoisting আর temporal dead zone

তিন ধরনের declaration-ই engine hoist করে, মানে scope-এর একদম শুরুতেই binding তৈরি করে ফেলে। পার্থক্য দুই
জায়গায়: declaration-এর line চলার আগে binding-এ কী থাকে, আর কোন `{ }`-কে তাদের scope ধরা হয়।

| Declaration | Scope                    | Line চলার আগে               | ফল                                            |
| ----------- | ------------------------ | -------------------------- | --------------------------------------------- |
| `var`       | পুরো function            | `undefined`               | পড়া যায়, কোনো error নেই, কিন্তু value ভুল        |
| `let`       | সবচেয়ে কাছের block       | Uninitialised, মানে **TDZ** | পড়তে গেলেই `ReferenceError`                   |
| `const`     | সবচেয়ে কাছের block       | Uninitialised, মানে **TDZ** | পড়তে গেলেই `ReferenceError`                   |

> ⚠️ TDZ কোনো সীমাবদ্ধতা নয়, এটা ইচ্ছে করেই রাখা। Declare করার আগে `var` পড়লে `undefined` পাওয়া যায়, আর সেই
> ভুল value চুপচাপ পুরো code-এ ছড়িয়ে পড়ে। TDZ থাকলে সেখানেই error হয়, আর stack trace সরাসরি দোষী line-টা দেখিয়ে দেয়।

### Declaration, expression আর arrow

| ধরন             | কীভাবে লেখে                 | Hoist হয়?                 | নিজের `this` | `new` চলে  |
| --------------- | -------------------------- | ------------------------- | ---------- | ---------- |
| **Declaration** | `function f() {}`          | ✅ নাম **আর** body দুটোই    | ✅          | ✅          |
| **Expression**  | `const f = function () {}` | শুধু binding (TDZ-এ থাকে)  | ✅          | ✅          |
| **Arrow**       | `const f = () => {}`       | শুধু binding (TDZ-এ থাকে)  | ❌ Lexical  | ❌          |

Arrow function-এর নিজের `this` নেই, `arguments` নেই, `prototype`-ও নেই, আর `new` দিয়ে একে call করা যায় না।
`this` না থাকাটাই এর আসল সুবিধা: method-এর ভেতরে লেখা callback ওই method-এর `this`-ই দেখে।
[Chapter ?? — `this` Keyword](#ch-this-keyword) দেখুন। আরেকটা কথা: default parameter কাজ করে শুধু
`undefined` এলে, `null` এলে নয়।

### Private state

Closure দিয়ে সত্যিকারের privacy পাওয়া যায়। বাইরে থেকে পড়ার মতো কোনো property-ই থাকে না।

```typescript
function createCounter(): { increment(): number; getCount(): number } {
  let count: number = 0; // no property exposes this
  return { increment: (): number => ++count, getCount: (): number => count };
}

const a = createCounter();
const b = createCounter();
a.increment(); // 1
b.increment(); // 1 — each call made its own `count`
```

### Factory আর memoisation

**Factory** এমন একটা function return করে, যে তার configuration আগে থেকেই ধরে রেখেছে। **Memoiser** তার cache
রাখে closure-এর ভেতরে, তাই বাইরে থেকে কেউ সেটা নষ্ট করতে পারে না।

```typescript
function createMultiplier(multiplier: number): (n: number) => number {
  return (n: number): number => n * multiplier; // remembers `multiplier`
}

function memoize<Args extends unknown[], R>(fn: (...args: Args) => R): (...args: Args) => R {
  const cache = new Map<string, R>();
  return (...args: Args): R => {
    const key: string = JSON.stringify(args);
    // `has`, not a truthiness check — a cached `0` or `false` is still a hit
    if (cache.has(key)) return cache.get(key) as R;
    const result: R = fn(...args);
    cache.set(key, result);
    return result;
  };
}
```

React hooks আসলে এই pattern-ই, সঙ্গে একটা scheduler জুড়ে দেওয়া। Component-এর ভেতরের handler সেই render-এর props
আর state ধরে রাখে, যে render-এ সে তৈরি হয়েছিল। এ কারণেই `useEffect`-এর ভেতরে stale closure পুরনো value পড়ে।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                          | কী ব্যবহার করবেন      | কেন                                                    |
| ------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| `map`, `filter`, `then`-এ callback               | Arrow                 | ছোট করে লেখা যায়, আর `this` আসে যেখানে লিখেছেন সেখান থেকে |
| Object বা class-এর method                         | Method shorthand      | নিজের `this` লাগে, যেটা receiver-এর সঙ্গে বাঁধা        |
| এমন state, যা বাইরে থেকে ধরা যাবে না               | Closure variable      | Property-ই নেই, তাই নিয়ম ভাঙার সুযোগও নেই              |
| প্রায় একই রকম অনেক function, শুধু config আলাদা      | Factory               | Config একবার ধরে রাখা হয়, প্রতিবার পাঠাতে হয় না         |
| `class`-এর ভেতরে privacy                          | `#private` field      | পড়তে সহজ, আর devtools-এ class member হিসেবেই দেখায়     |

## সাধারণ ভুল

**❌ এমন loop-এ `var`, যেখানে কাজটা পরে চলে।** Interview-এ closure নিয়ে এটাই সবচেয়ে বেশি জিজ্ঞেস করা হয়:

```typescript
for (var i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// 3, 3, 3
```

`var` function-scoped, তাই পুরো loop-এ `i` আছে মাত্র একটা। তিনটে closure-ই সেই একটা i-এর reference ধরে রাখে।
আর তিনটেই চলে loop শেষ হওয়ার পরে, যখন i ইতিমধ্যে 3 হয়ে গেছে।

**✅ `let` প্রতিটা iteration-এ নতুন binding বানায়, তাই প্রতিটা closure পায় নিজের আলাদা i:**

```typescript
for (let i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// 0, 1, 2
```

**❌ Object-এর method হিসেবে arrow function।** Arrow তার `this` নেয় চারপাশের scope থেকে, আর সেটা object নয়।
Method shorthand লিখুন, যেমন `onClick(): void { ... }`, তাহলে `this` হবে receiver নিজেই।

**❌ দরকার একটা value, অথচ closure ধরে রেখেছে পুরো container।** Closure শুধু তার পড়া variable-গুলো নয়, *পুরো*
scope-টাই বাঁচিয়ে রাখে:

```typescript
function leaky(): () => void {
  const hugeArray: string[] = new Array<string>(1_000_000).fill('data');
  return (): void => console.log('done'); // hugeArray may stay pinned
}

function tidy(): () => void {
  const needed: string = new Array<string>(1_000_000).fill('data')[0];
  return (): void => console.log(needed); // ✅ nothing reaches the array
}
```

**❌ Inline arrow দিয়ে listener যোগ করে পরে সেটা remove করার আশা করা।**
`removeEventListener` function-কে চেনে identity দিয়ে, তাই inline function কখনোই remove করা যায় না। আর তার
closure element-টাকে DOM থেকে সরে যাওয়ার পরেও memory-তে আটকে রাখে।

> ⚠️ Closure leak সবচেয়ে বেশি ভোগায় অনেকক্ষণ খোলা থাকা single-page app-এ। সেখানে component হাজারবার mount আর
> unmount হয়, আর প্রতিটা আটকে থাকা handler একটা করে পুরো scope ধরে রাখে। অনুমান না করে heap snapshot নিয়ে profile করুন।

## 🔑 মূল শিক্ষা

- Scope lexical: কে call করছে তা নয়, code কোথায় লেখা সেটাই আসল। খোঁজ সবসময় ভেতর থেকে বাইরের দিকে যায়।
- `var` function-scoped, আর আগে পড়লে `undefined` দেয়। `let` আর `const` block-scoped, TDZ-এ পড়লে error throw করে।
- Closure মানে একটা function আর তার জন্মের scope, যে scope function return করার পরেও বেঁচে থাকে।
- Closure value নয়, reference ধরে রাখে। এজন্যই একটা shared `var` থেকে loop-এর bug-টা হয়।
- Closure পুরো scope আটকে রাখতে পারে, তাই container না ধরে শুধু দরকারি value-টা আলাদা করে নিন।

## Interview-এর প্রশ্ন

**Q: Scope chain ব্যাপারটা বুঝিয়ে বলুন।**

প্রতিটা function যে scope-এ define হয়েছে, তার একটা reference রাখে। কোনো নাম খুঁজতে engine আগে দেখে বর্তমান
scope-এ, তারপর parent-এ, এভাবে ওপরে module scope পর্যন্ত। প্রথম যেখানে পায়, সেটাই নেয়। Chain-টা ঠিক হয়ে যায়
function যেখানে লেখা, সেখানেই। তাই function-টা অন্য কেউ call করলেও সে পড়ে তার পাশে লেখা variable-গুলোই।

**Q: Temporal dead zone কী, আর এটা কাজে লাগে কেন?**

Block-এ ঢোকা থেকে শুরু করে সেখানকার `let` বা `const` declaration চলা পর্যন্ত সময়টাই TDZ। এ সময় binding থাকে,
কিন্তু initialise হয়নি, তাই পড়তে গেলে `ReferenceError` হয়। ফলে `var`-এর চুপচাপ `undefined`-এর জায়গায় ঠিক
সেই line-এ error পাওয়া যায়। Debug করা অনেক সহজ হয়।

**Q: `setTimeout` দেওয়া `var` loop কেন শেষ value-টা তিনবার print করে?**

`var` function-scoped, তাই loop-এ `i` মাত্র একটা। প্রতিটা callback সেই i-এর reference ধরে রাখে, copy নয়।
Callback-গুলো চলে loop শেষ হওয়ার পরে, তাই তিনটেই পড়ে 3। `let` দিলে প্রতিটা iteration-এ নতুন binding তৈরি হয়,
আর সমস্যাটা থাকে না।

**Q: Closure থেকে memory leak হয় কীভাবে?**

Closure যে variable-গুলো পড়ে, engine শুধু সেগুলো নয়, পুরো চারপাশের scope-টাই বাঁচিয়ে রাখতে পারে। বড় কোনো array
বা DOM node-এর পাশে তৈরি হওয়া দীর্ঘজীবী function সেই object-টাকে আটকে রাখে। সমাধান হলো closure যা দেখতে পায়
তা ছোট করে আনা, অথবা closure-এর reference-টাই ছেড়ে দেওয়া।

**Q: Closure-এর বদলে কখন `#private` class field ব্যবহার করবেন?**

যখন object-টা আগে থেকেই class, তাতে কয়েকটা method আছে, আর instance তৈরি হয় অনেক। Closure দিয়ে privacy নিলে
প্রতিটা instance-এর প্রতিটা method-এর জন্য আলাদা function object লাগে। Class না থাকলে, কিংবা `this` পুরোপুরি
এড়াতে চাইলে, closure-ই ভালো।

## এরপর কী পড়বেন

- [Chapter ?? — `this` Keyword](#ch-this-keyword) — "এই function কী দেখতে পায়" প্রশ্নের বাকি অর্ধেক
- [Chapter ?? — Data Type, Variable ও Built-in](#ch-data-types-variables) — এই binding-গুলো যে value ধরে রাখে, তার model
- [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) — architecture-এর সিদ্ধান্ত হিসেবে factory
