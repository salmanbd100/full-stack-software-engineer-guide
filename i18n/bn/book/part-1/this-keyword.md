---
sourceHash: "bc836b5478e79b3220f6a7d4a955eb29762510b4e3acf73a8b2f06eb969aca9a"
title: "`this` Keyword"
translatedAt: "2026-10-13T12:11:09.856Z"
model: "claude-opus-5-5 (Claude Code)"
---

# `this` Keyword {#ch-this-keyword}

> শুধু call site দেখেই বলে দিন `this` কী হবে, আর ভুল হলে ঠিক করে ফেলুন।

**এই অধ্যায়ে:** binding-এর চারটি নিয়ম · implicit binding কীভাবে হারায় · `call`, `apply` আর `bind` · arrow-এর কেন `this` নেই · interviewer-রা যে ভুলগুলো খোঁজেন

## 💡 মূল ধারণা

`this` ঠিক হয় **function-টা কীভাবে call করা হলো** তা দিয়ে, কোথায় লেখা হয়েছে তা দিয়ে নয়। `this` নিয়ে প্রায় সব প্রশ্নের
উত্তর এই একটি বাক্যেই। কোনো function-এর নির্দিষ্ট `this` থাকে না। Call site, মানে যেখানে function-টা call করা হচ্ছে,
সেখান থেকে একটি আসে, আর কোনটা আসবে তা ঠিক করে চারটি নিয়ম। ব্যতিক্রম arrow function। ওদের নিজের `this` নেই, তাই
ওরা চারপাশের scope-এর `this` ব্যবহার করে।

## কীভাবে কাজ করে

### Binding-এর চারটি নিয়ম, অগ্রাধিকারের ক্রমে

| অগ্রাধিকার | নিয়ম            | Call দেখতে যেমন       | `this` হয়                             |
| -------- | --------------- | --------------------- | ------------------------------------------ |
| প্রথম      | `new` binding   | `new Person()`        | সদ্য তৈরি হওয়া object                 |
| দ্বিতীয়      | Explicit        | `fn.call(obj)`        | আপনি যা পাঠিয়েছেন                        |
| তৃতীয়      | Implicit        | `obj.method()`        | Dot-এর ঠিক আগের object      |
| চতুর্থ      | Default         | `fn()`                | Strict mode-এ আর module-এ `undefined`; sloppy-mode script-এ `globalThis` |
| —        | Arrow           | যেকোনো call       | চারপাশের scope-এর `this`; ওপরের কোনো নিয়ম খাটে না |

নিয়মগুলো এই ক্রমেই মেলান, আর প্রথম যেটা মেলে সেখানেই থামুন। Arrow পুরো table-টাই পাশ কাটিয়ে যায়, কারণ তার এমন
কোনো `this`-এর জায়গাই নেই যা call site ভরে দেবে।

### Implicit binding, আর কীভাবে সেটা হারায়

Implicit binding নির্ভর করে **call-এর মুহূর্তে** dot-টা আছে কি না তার ওপর। এটা function-এর নিজের কোনো গুণ নয়।

```typescript
const user = {
  name: 'Alice',
  greet(): void {
    console.log(`Hello, I'm ${this.name}`);
  },
};

user.greet(); // ✅ 'Hello, I'm Alice'

const greet = user.greet; // the dot is gone
greet(); // ❌ this is undefined
```

গোনা হয় শুধু dot-এর ঠিক আগের object-টাকে। `company.department.show()`-এ `this` হলো
`department`, কখনোই `company` নয়।

| Call                                     | Binding থাকে? | সমাধান                        |
| ---------------------------------------- | ------------- | -------------------------- |
| `obj.method()`                           | ✅             | —                          |
| `const fn = obj.method`                  | ❌             | `.bind(obj)`               |
| `setTimeout(obj.method, 0)`              | ❌             | Arrow দিয়ে মুড়ে দিন, বা `.bind`   |
| `el.addEventListener('click', obj.method)` | ❌ — `this` হয়ে যায় element-টা | `.bind`, বা class-field arrow |
| `array.map(obj.method)`                  | ❌             | Arrow দিয়ে মুড়ে দিন              |

### Explicit binding

```typescript
// The `this` parameter is not a real argument. It exists so TypeScript can
// check what call, apply and bind are allowed to pass
function greet(this: { name: string }, greeting: string, punctuation: string): void {
  console.log(`${greeting}, I'm ${this.name}${punctuation}`);
}

greet.call(user, 'Hello', '!'); // arguments listed
greet.apply(user, ['Hi', '.']); // arguments in an array — the only difference
const bound: () => void = greet.bind(user, 'Hey', '!'); // returns a new function
```

`bind` স্থায়ী। Bound function-কে আবার bind করা যায় না, শুধু `new` দিয়ে call করলেই সেটা উল্টে যায়। এটা শুরুর
দিকের argument-ও নেয়, তাই partial application-এর tool হিসেবেও চলে: কিছু argument এখনই বসিয়ে দেয়, বাকিগুলো পরে
নেয়। `const logError = log.bind(null, 'ERROR')` প্রথম parameter বসিয়ে দেয়, আর এমন একটি function return করে যা বাকি
argument-গুলো নেয়।

### Arrow function

Arrow-এর `this`-এর কোনো জায়গা নেই। তাই তার ভেতরের `this` অন্য যেকোনো variable-এর মতোই scope chain ধরে খোঁজা হয়।
এ কারণে `call`, `apply` আর `bind` এর ওপর কোনো প্রভাব ফেলে না।

```typescript
const timer = {
  seconds: 0,
  start(): void {
    // ✅ the arrow keeps start()'s `this`
    setInterval((): void => {
      this.seconds++;
    }, 1000);
  },
};
```

একই callback-এর সমস্যা তিনভাবে মেটানো যায়। আজকের পছন্দের ক্রমে: arrow (ওপরে যেমন), `fn.bind(this)`, আর ES2015-এর
আগের কৌশল `const self = this`। তিনটিই এখনো বাস্তব code-এ দেখা যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                       | কী ব্যবহার করবেন                     | কেন                                                  |
| ---------------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| Method-এর ভেতরের callback-এ instance-টা দরকার | Arrow function              | `this` উত্তরাধিকারে পায়, bind করার কিছু নেই                     |
| Class থেকে `addEventListener`-এ handler পাঠানো | Class-field arrow           | প্রতিটি instance-এ একবার bind হয়, খুলে নিয়ে যেখানে খুশি পাঠানো নিরাপদ |
| এমন object-এ method call করা, method-টা যার নিজের নয় | `fn.call(other)`           | Method copy না করেই ধার নেওয়া          |
| `this` লাগে না এমন function-এর শুরুর argument বসিয়ে দেওয়া | `fn.bind(null, arg)`       | Wrapper লেখার চেয়ে সস্তা                       |

## সাধারণ ভুল

**❌ Object-এর method হিসেবে arrow।** এটা কখনো object-এর সঙ্গে bind হয় না, তাই `this.name` পড়ে চারপাশের scope থেকে:

<!-- lint-allow-fence: javascript — an arrow as an object-literal method is the mistake; TypeScript flags it rather than letting it return undefined at runtime -->
```javascript
const person = {
    name: 'Alice',
    greet: () => console.log(`Hello, ${this.name}`) // 'Hello, undefined'
};
```

**✅ Method-এর জন্য method shorthand; arrow শুধু তার ভেতরে।**

**❌ Method-কে callback হিসেবে পাঠানো।** `setTimeout(user.greet, 1000)` function-টা পাঠায়, dot-টা ফেলে দেয়।
Arrow দিয়ে মুড়ে দিন, যেমন `setTimeout(() => user.greet(), 1000)`, অথবা bind করুন।

**❌ ধরে নেওয়া যে prototype method আলাদা করে নিলেও ঠিক থাকবে:**

```typescript
class Button {
  private count = 0;

  handleWrong(): void {
    this.count++; // ❌ prototype method — loses `this` when passed as a handler
  }

  handle = (): void => {
    this.count++; // ✅ class field arrow — bound at construction, safe to pass
  };
}
```

Class field-এর দাম প্রতিটি instance-এ একটি করে closure, class-প্রতি একটি function নয়। যে handler এদিক-ওদিক পাঠান,
তার জন্য এই দাম দেওয়াই ঠিক। যে method সবসময় dot দিয়ে call করেন, তার জন্য এটা অপচয়।

**❌ Constructor function `new` ছাড়া call করা।** Sloppy mode-এ `this` হয়ে যায় `globalThis`, আর assignment-গুলো
চুপচাপ সেটাকে নোংরা করে। `class` ব্যবহার করুন, সেটা এই অবস্থায় throw করে।

> ⚠️ Strict mode চতুর্থ নিয়মটা বদলে দেয়: default binding-এ `globalThis`-এর বদলে আসে `undefined`। প্রতিটি
> ES module strict। তাই যেকোনো আধুনিক codebase-এ ভুল জায়গার `this` global-এ লেখার বদলে throw করে, আর আপনি
> ঠিক সেটাই চান।

## 🔑 মূল শিক্ষা

- `this` ঠিক করে call site, function কোথায় define হয়েছে তা নয়।
- চারটি নিয়ম এই ক্রমে খাটে: `new`, তারপর explicit, তারপর implicit, তারপর default।
- Function-টা dot থেকে আলাদা হওয়ার মুহূর্তেই implicit binding হারিয়ে যায়।
- `bind` স্থায়ী, আর শুরুর argument-ও বসিয়ে দেয়; `call` আর `apply`-এর তফাত শুধু argument পাঠানোর ধরনে।
- Arrow-এর `this` নেই, তাই সে lexical ভাবে পায়, আর তাকে আবার bind করা যায় না।

## Interview-এর প্রশ্ন

**Q: `const fn = obj.method; fn();` — এখানে `this` কী, আর কেন?**

Strict mode-এ `undefined`। Implicit binding আসে call site থেকে, আর এখানে call site হলো receiver ছাড়া একটি সাধারণ
function call। Method বের করে আনার সময় শুধু function-এর value copy হয়েছে, object-টা পেছনে পড়ে আছে।
`obj.method.bind(obj)` সেটা ফিরিয়ে আনে।

**Q: `call`, `apply` আর `bind`-এর পার্থক্য কী?**

`call` আর `apply` দুটিই নির্দিষ্ট একটি `this` দিয়ে function-টা তখনই call করে। তফাত শুধু argument পাঠানোর ধরনে:
একটা একটা করে, নাকি একটি array-তে। `bind` কিছুই call করে না। সে `this` স্থায়ীভাবে বসানো একটি নতুন function return
করে, আর শুরুর argument-ও আগে থেকে ভরে দিতে পারে।

**Q: Event handler-এর জন্য কখন class-field arrow-এর বদলে `bind` বেছে নেবেন?**

যখন handler-টা prototype-এ একবারই থাকা উচিত, প্রতিটি instance-এ copy হয়ে নয়। যেমন হাজার হাজার instance-ওয়ালা
class, বা এমন class যার method subclass override করবে। Class-field arrow prototype-এ থাকে না। তাই subclass-এর
method সেটাকে override করতে পারে না, আর test-ও prototype দিয়ে তার ওপর spy বসাতে পারে না।

## এরপর কী পড়বেন

- [Chapter ?? — Prototype ও Inheritance](#ch-prototypes-inheritance) — `new` binding তার object কোথা থেকে পায়
- [Chapter ?? — Scope ও Closure](#ch-closures) — lexical `this`-এর জন্য arrow কী ছেড়ে দেয়, আর function প্রসঙ্গ মনে রাখার অন্য উপায়টা
