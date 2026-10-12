---
sourceHash: "0d5639d1c54c5695c9f2faed56f329991cb0ecbf4db252c4445ef8d313e19909"
title: "Scope ও Closure"
translatedAt: "2026-10-12T07:47:05.042Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Scope ও Closure {#ch-closures}

> প্রতিটি variable কোথায় থাকে আর কতক্ষণ থাকে, তা জানুন — তারপর একটি function-এর capture করা scope ইচ্ছাকৃতভাবে ব্যবহার করুন, privacy আর factory-র জন্য, memory leak না করে।

**এই অধ্যায়ে:** lexical scope আর scope chain · hoisting আর temporal dead zone · declaration, expression আর arrow · একটি closure কী capture করে · loop variable-এর ফাঁদ আর closure leak

## 💡 মূল ধারণা

JavaScript-এ scope **lexical**। একটি variable কোথা থেকে পড়া যাবে, সেটা ঠিক হয় variable-টি কোথায় লেখা হয়েছে তা
দিয়ে, কে function-টি call করছে তা দিয়ে নয়। ভেতরের code বাইরের parent-দের কাছে পৌঁছায়, উল্টোটা কখনো নয়।

**Closure** সরাসরি এখান থেকেই আসে। একটি function যে scope-এ লেখা হয়েছে, সেটার একটি reference ধরে রাখে। Function
যতক্ষণ বেঁচে থাকে, scope-ও ততক্ষণ বেঁচে থাকে, বাইরের function return করে ফেলার পরেও। একটি খুঁটিনাটিই প্রতিটি
closure প্রশ্নের উত্তর ঠিক করে: closure **reference capture করে, copy নয়**। একই variable-এর ওপর দুটো closure একই
value দেখে, আর পরে কোনো পরিবর্তন হলে সেটা দুটোর কাছেই পৌঁছায়।

## কীভাবে কাজ করে

**Scope chain — খোঁজ বাইরের দিকে যায়, একবারে এক ধাপ:**

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

`outer`-এর call frame চলে গেছে, কিন্তু garbage collector `message`-কে free করতে পারে না। Return করা function-টি
সেই scope ধরে রাখে, যার ভেতরে এটা আছে। পুরো mechanism এটুকুই। নিচের সবকিছু এরই ব্যবহার।

### Hoisting আর temporal dead zone

Engine declaration-এর তিনটি রূপকেই hoist করে: সে binding-টি তার scope-এর একেবারে ওপরে তৈরি করে। রূপগুলোর পার্থক্য
দুই জায়গায়। Declaration-এর line চলার আগে binding-এ কী থাকে, আর কোন `{ }` তাদের scope হিসেবে গণ্য হয়।

| Declaration | Scope                 | Line চলার আগে                 | ফলাফল                                        |
| ----------- | --------------------- | ---------------------------- | ------------------------------------------- |
| `var`       | চারপাশের function      | `undefined`                 | Read চুপচাপ সফল হয়, কিন্তু ভুল value নিয়ে       |
| `let`       | সবচেয়ে কাছের block     | Uninitialised — **TDZ**      | Read করলে `ReferenceError` throw হয়          |
| `const`     | সবচেয়ে কাছের block     | Uninitialised — **TDZ**      | Read করলে `ReferenceError` throw হয়          |

> ⚠️ TDZ একটি feature, সীমাবদ্ধতা নয়। `var`-এর `undefined` declare করার আগে ব্যবহারের bug-কে এমন একটি value-তে
> পরিণত করে, যেটা ছড়িয়ে পড়ে। TDZ সেটাকে একটি stack trace-এ পরিণত করে, যেটা ঠিক দোষী line-টি দেখিয়ে দেয়।

### Declaration, expression আর arrow

| রূপ              | যেভাবে লেখা হয়              | Hoisted?                  | নিজস্ব `this` | `new` করা যায় |
| --------------- | -------------------------- | ------------------------- | ---------- | ---------- |
| **Declaration** | `function f() {}`          | ✅ নাম **আর** body         | ✅          | ✅          |
| **Expression**  | `const f = function () {}` | শুধু binding (TDZ-এ)       | ✅          | ✅          |
| **Arrow**       | `const f = () => {}`       | শুধু binding (TDZ-এ)       | ❌ Lexical  | ❌          |

Arrow-এর নিজস্ব `this` নেই, `arguments` নেই, `prototype` নেই, আর `new` দিয়ে এদের call করা যায় না। `this` না
থাকাটাই আসল উদ্দেশ্য: একটি method-এর ভেতরে লেখা callback সেই method-এর `this` দেখে।
[Chapter ?? — `this` Keyword](#ch-this-keyword) দেখুন। Default parameter শুধু `undefined`-এর ক্ষেত্রে খাটে,
`null`-এর ক্ষেত্রে কখনো নয়।

### Private state

Closure সত্যিকারের privacy দেয়, এমন কোনো property ছাড়াই যেটা কেউ পড়তে পারে।

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

একটি **factory** এমন একটি function return করে, যেটা তার configuration capture করে রেখেছে। একটি **memoiser** তার
cache closure-এর ভেতরে রাখে, তাই বাইরের কিছু সেটা নষ্ট করতে পারে না।

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

React hook হলো এই একই pattern, সাথে একটি scheduler জোড়া। একটি component-এর ভেতরের handler সেই render-এর props আর
state-এর ওপর close করে, যে render তাকে তৈরি করেছে। এ কারণেই একটি `useEffect`-এর ভেতরে stale closure একটি stale
value পড়ে।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                          | কী ব্যবহার করবেন        | কেন                                                  |
| ------------------------------------------------- | --------------------- | ---------------------------------------------------- |
| `map`, `filter`, `then`-এ callback                 | Arrow                 | সংক্ষিপ্ত, আর যেখানে লিখেছেন সেখান থেকে `this` পায়     |
| একটি object বা class-এর method                     | Method shorthand      | নিজস্ব `this` লাগে, যেটা receiver-এর সাথে bound      |
| এমন state, যেটা বাইরে থেকে নাগালে পাওয়া যাবে না       | Closure variable      | কোনো property-ই নেই, তাই ভাঙার মতো কোনো convention-ও নেই |
| প্রায় একই রকম অনেক function, শুধু config-এ আলাদা     | Factory               | Configuration একবার capture হয়, প্রতিটি call-এ পাঠাতে হয় না |
| একটি `class`-এর ভেতরে privacy                     | `#private` field      | পড়তে সহজ, আর devtools এটাকে class member হিসেবে দেখায় |

## সাধারণ ভুল

**❌ এমন loop-এ `var`, যেটা কাজ পরে করার জন্য রেখে দেয়।** Interview-এ closure নিয়ে সবচেয়ে বেশি জিজ্ঞেস করা প্রশ্ন
এটাই:

```typescript
for (var i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// 3, 3, 3
```

`var` function-scoped, তাই `i` ঠিক একটিই। তিনটি closure-ই এটার একটি reference capture করে। তিনটিই loop শেষ
হওয়ার পর এটা পড়ে, যখন এর মান ইতিমধ্যে 3।

**✅ `let` প্রতিটি iteration-এ একটি নতুন binding তৈরি করে, তাই প্রতিটি closure নিজেরটা capture করে:**

```typescript
for (let i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// 0, 1, 2
```

**❌ Object method হিসেবে arrow।** এটা `this` নেয় চারপাশের scope থেকে, যেটা object-টি নয়। Method shorthand
ব্যবহার করুন, যেমন `onClick(): void { ... }`, যাতে `this` হয় receiver।

**❌ দরকার একটি value, অথচ পুরো container-এর ওপর close করা।** একটি closure *পুরো* scope-টাকে বাঁচিয়ে রাখে, শুধু
যে variable-গুলো পড়ে সেগুলো নয়:

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

**❌ Inline arrow দিয়ে listener যোগ করে পরে সেটা সরানোর আশা করা।** `removeEventListener` identity দিয়ে মেলায়, তাই
একটি inline function কখনোই সরানো যায় না। DOM থেকে বেরিয়ে যাওয়ার পরেও এর closure element-টিকে বাঁচিয়ে রাখে।

> ⚠️ দীর্ঘক্ষণ চলা single-page app-এই closure leak সবচেয়ে বেশি ভোগায়। Component হাজার হাজার বার mount আর
> unmount হয়, আর ধরে রাখা প্রতিটি handler একটি পুরো scope আটকে রাখে। আন্দাজ না করে heap snapshot দিয়ে profile করুন।

## 🔑 মূল শিক্ষা

- Scope lexical: এটা মানে code কোথায় লেখা হয়েছে, কে call করছে তা নয়। খোঁজ শুধু বাইরের দিকে যায়।
- `var` function-scoped, আর আগেভাগে পড়লে `undefined` দেয়। `let` আর `const` block-scoped, আর TDZ-এ throw করে।
- একটি closure হলো একটি function আর সেটা যে scope-এ define হয়েছে সেই scope, যেটা ওই scope return করার পরেও বেঁচে থাকে।
- Closure reference capture করে, value নয়। এ কারণেই share করা একটি `var` loop-এর bug তৈরি করে।
- একটি closure চারপাশের পুরো scope ধরে রাখতে পারে, তাই container নয়, দরকারি value-টি আলাদা করে বের করে নিন।

## Interview-এর প্রশ্ন

**Q: Scope chain ব্যাখ্যা করুন।**

প্রতিটি function যে scope-এ define হয়েছে, সেটার একটি reference রাখে। একটি নাম resolve করতে engine আগে বর্তমান
scope-এ খোঁজে, তারপর তার parent-এ, তারপর ওপরের দিকে module scope পর্যন্ত। প্রথম যে মিল পায়, সেটাই নেয়। Function
যেখানে লেখা হয়, chain সেখানেই স্থির হয়ে যায়। অন্য কোনো caller-কে দেওয়া function-ও সেই variable-গুলোই পড়ে, যেগুলোর
পাশে সেটা লেখা হয়েছিল।

**Q: Temporal dead zone কী, আর এটা কেন কাজের?**

একটি block-এ ঢোকা থেকে শুরু করে তার ভেতরের `let` বা `const` declaration চলা পর্যন্ত সময়টাই TDZ। Binding-টি আছে,
কিন্তু uninitialised, তাই পড়তে গেলে `ReferenceError` throw হয়। এটা `var`-এর নীরব `undefined`-কে ঠিক সেই line-এ
একটি error-এ পরিণত করে, যেটা debug করা সহজ।

**Q: `setTimeout` সহ একটি `var` loop কেন শেষ value-টি তিনবার print করে?**

`var` function-scoped, তাই loop-এ `i` একটিই। প্রতিটি callback এটার একটি reference-এর ওপর close করে, copy-র ওপর নয়।
Callback-গুলো চলে loop শেষ হওয়ার পর, তাই তিনটিই 3 পড়ে। `let` প্রতিটি iteration-এ নতুন binding তৈরি করে এটা ঠিক
করে দেয়।

**Q: Closure কীভাবে memory leak ঘটায়?**

Engine চারপাশের পুরো scope বাঁচিয়ে রাখতে পারে, শুধু closure যে variable-গুলো পড়ে সেগুলো নয়। একটি বড় array বা DOM
node-এর পাশে তৈরি হওয়া দীর্ঘজীবী function সেই object-টিকে আটকে রাখে। সমাধান হলো closure যা দেখে সেটা সীমিত করা,
অথবা closure-টির reference-ই ছেড়ে দেওয়া।

**Q: Closure-এর বদলে কখন একটি `#private` class field ব্যবহার করবেন?**

যখন object-টি ইতিমধ্যে একটি class, যার কয়েকটি method আর অনেকগুলো instance আছে। Closure দিয়ে privacy-র খরচ হলো
প্রতিটি instance-এ প্রতিটি method-এর জন্য একটি করে function object। Closure জেতে তখন, যখন কোনো class নেই, অথবা আপনি
`this` পুরোপুরি এড়াতে চান।

## এরপর কী পড়বেন

- [Chapter ?? — `this` Keyword](#ch-this-keyword) — "এই function কী দেখে" প্রশ্নের অন্য অর্ধেক
- [Chapter ?? — Data Type, Variable ও Built-in](#ch-data-types-variables) — এই binding-গুলো যে value model ধরে রাখে
- [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) — architecture-এর একটি সিদ্ধান্ত হিসেবে factory
