---
sourceHash: "bc836b5478e79b3220f6a7d4a955eb29762510b4e3acf73a8b2f06eb969aca9a"
title: "`this` Keyword"
translatedAt: "2026-10-12T07:47:54.326Z"
model: "claude-opus-5-5 (Claude Code)"
---

# `this` Keyword {#ch-this-keyword}

> শুধু call site দেখেই বের করুন `this` কী হবে, আর ভুল হলে সেটা ঠিক করুন।

**এই অধ্যায়ে:** binding-এর চারটি নিয়ম · implicit binding হারিয়ে ফেলা · `call`, `apply` আর `bind` · arrow-এর কেন `this` নেই · interviewer-রা যে ভুলগুলো খোঁজেন

## 💡 মূল ধারণা

`this` ঠিক হয় **function-টি কীভাবে call করা হচ্ছে** তা দিয়ে, কোথায় লেখা হয়েছে তা দিয়ে নয়। এই একটি বাক্যই `this`
নিয়ে প্রায় প্রতিটি প্রশ্নের উত্তর দেয়। একটি function-এর কোনো নির্দিষ্ট `this` নেই। Call site (যে জায়গায়
function-টি call করা হয়) একটি জোগায়, আর চারটি নিয়ম ঠিক করে কোনটা। Arrow function ব্যতিক্রম। এদের নিজস্ব
কোনো `this` নেই, তাই এরা চারপাশের scope-এর `this` ব্যবহার করে।

## কীভাবে কাজ করে

### Binding-এর চারটি নিয়ম, অগ্রাধিকারের ক্রমে

| অগ্রাধিকার | নিয়ম            | Call দেখতে যেমন        | `this` হয়ে যায়                             |
| -------- | --------------- | --------------------- | ------------------------------------------ |
| 1ম       | `new` binding   | `new Person()`        | সদ্য তৈরি হওয়া object                      |
| 2য়       | Explicit        | `fn.call(obj)`        | আপনি যা পাঠিয়েছেন                           |
| 3য়       | Implicit        | `obj.method()`        | Dot-এর ঠিক আগের object                      |
| 4র্থ      | Default         | `fn()`                | Strict mode-এ আর module-এ `undefined`; sloppy-mode script-এ `globalThis` |
| —        | Arrow           | যেকোনো call           | চারপাশের scope-এর `this` — ওপরের কোনো নিয়ম খাটে না |

নিয়মগুলো এই ক্রমেই যাচাই করুন, আর প্রথম মিল পেলেই থামুন। Arrow পুরো table-টাকেই এড়িয়ে যায়, কারণ এর কোনো `this`
slot নেই, যেটা একটি call site পূরণ করবে।

### Implicit binding, আর সেটা হারিয়ে ফেলা

Implicit binding নির্ভর করে **call-এর মুহূর্তে** dot আছে কি না, তার ওপর। এটা function-এর কোনো বৈশিষ্ট্য নয়।

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

শুধু dot-এর ঠিক আগের object-টিই গণ্য হয়। `company.department.show()`-এ `this` হলো `department`, কখনো
`company` নয়।

| Call                                     | Binding থাকে? | সমাধান                      |
| ---------------------------------------- | ------------- | -------------------------- |
| `obj.method()`                           | ✅             | —                          |
| `const fn = obj.method`                  | ❌             | `.bind(obj)`               |
| `setTimeout(obj.method, 0)`              | ❌             | Arrow wrapper বা `.bind`   |
| `el.addEventListener('click', obj.method)` | ❌ — `this` হয়ে যায় element-টি | `.bind` বা একটি class-field arrow |
| `array.map(obj.method)`                  | ❌             | Arrow wrapper              |

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

`bind` স্থায়ী। একটি bound function-কে আবার bind করা যায় না, শুধু `new` দিয়ে call করলেই এটা override হয়। এটা
শুরুর দিকের argument-ও নেয়, তাই partial application-এর tool হিসেবেও কাজ করে: কিছু argument এখনই ঠিক করে দেয়, আর
বাকিগুলো পরে নেয়। `const logError = log.bind(null, 'ERROR')` প্রথম parameter ঠিক করে দেয়, আর এমন একটি function
return করে যেটা বাকিগুলো নেয়।

### Arrow function

একটি arrow-এর কোনো `this` slot নেই। তাই এর ভেতরের `this` অন্য যেকোনো variable-এর মতোই scope chain ধরে resolve হয়।
সেজন্য `call`, `apply` আর `bind` এর ওপর কোনো প্রভাব ফেলে না।

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

একই callback সমস্যার সমাধান তিনভাবে করা যায়। আজকের পছন্দের ক্রমে সেগুলো হলো একটি arrow (ওপরে), `fn.bind(this)`,
আর ES2015-এর আগের কৌশল `const self = this`। তিনটিই এখনো আসল code-এ দেখা যায়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                       | কী ব্যবহার করবেন                | কেন                                                  |
| ---------------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| Method-এর ভেতরে এমন callback, যার instance দরকার | Arrow function              | `this` পেয়ে যায়, bind করার কিছু নেই                  |
| একটি class থেকে `addEventListener`-এ দেওয়া handler | Class-field arrow           | প্রতিটি instance-এ একবার bound, আলাদা করে পাঠানো নিরাপদ |
| এমন object-এ method call করা, যেটা method-টির মালিক নয় | `fn.call(other)`         | Method copy না করেই ধার করা                          |
| `this` ছাড়া একটি function-এর শুরুর argument ঠিক করা | `fn.bind(null, arg)`       | একটি wrapper লেখার চেয়ে সস্তা                         |

## সাধারণ ভুল

**❌ Object method হিসেবে arrow।** এটা কখনো object-এর সাথে bind হয় না, তাই `this.name` চারপাশের scope থেকে পড়ে:

<!-- lint-allow-fence: javascript — an arrow as an object-literal method is the mistake; TypeScript flags it rather than letting it return undefined at runtime -->
```javascript
const person = {
    name: 'Alice',
    greet: () => console.log(`Hello, ${this.name}`) // 'Hello, undefined'
};
```

**✅ Method-এর জন্য method shorthand; arrow শুধু তাদের ভেতরে।**

**❌ একটি method-কে callback হিসেবে পাঠানো।** `setTimeout(user.greet, 1000)` function-টি পাঠায় আর dot-টি ফেলে
দেয়। এটাকে একটি arrow-এ মুড়ে দিন, যেমন `setTimeout(() => user.greet(), 1000)`, অথবা bind করুন।

**❌ ধরে নেওয়া যে একটি prototype method আলাদা করার পরেও ঠিক থাকবে:**

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

Class field-এর খরচ প্রতিটি instance-এ একটি closure, প্রতিটি class-এ একটি function নয়। যে handler আপনি এদিক-ওদিক
পাঠান, তার জন্য এই বিনিময় ঠিক আছে। যে method আপনি সবসময় dot দিয়েই call করেন, তার জন্য এটা অপচয়।

**❌ একটি constructor function `new` ছাড়া call করা।** Sloppy mode-এ `this` হয়ে যায় `globalThis`, আর
assignment-গুলো চুপচাপ এটাকে নোংরা করে ফেলে। `class` ব্যবহার করুন, যেটা এর বদলে throw করে।

> ⚠️ Strict mode নিয়ম 4 বদলে দেয়: default binding `globalThis`-এর বদলে `undefined` দেয়। প্রতিটি ES module strict।
> তাই যেকোনো আধুনিক codebase-এ একটি বিপথগামী `this` একটি global-এ লেখার বদলে throw করে, আর আপনি সেটাই চান।

## 🔑 মূল শিক্ষা

- `this` ঠিক করে call site, function কোথায় define হয়েছে তা নয়।
- চারটি নিয়ম এই ক্রমে খাটে: `new`, তারপর explicit, তারপর implicit, তারপর default।
- Function-টি dot থেকে আলাদা হওয়ার মুহূর্তেই implicit binding হারিয়ে যায়।
- `bind` স্থায়ী, আর শুরুর argument-ও ঠিক করে দেয়; `call` আর `apply`-এর পার্থক্য শুধু argument-এর আকারে।
- Arrow-এর `this` নেই, তাই এরা lexically পায় আর এদের আবার bind করা যায় না।

## Interview-এর প্রশ্ন

**Q: `const fn = obj.method; fn();` — `this` কী, আর কেন?**

Strict mode-এ `undefined`। Implicit binding আসে call site থেকে, আর এখানে call site হলো receiver ছাড়া একটি সাধারণ
function call। Method-টি বের করে নেওয়ার সময় function-এর value copy হয়েছে, object-টি পেছনে রয়ে গেছে।
`obj.method.bind(obj)` সেটা ফিরিয়ে আনে।

**Q: `call`, `apply` আর `bind`-এর মধ্যে পার্থক্য কী?**

`call` আর `apply` দুটোই একটি নির্দিষ্ট `this` দিয়ে function-টি সঙ্গে সঙ্গে call করে। এদের পার্থক্য শুধু argument
কীভাবে পাঠাবেন তাতে: একটার পর একটা লিখে, নাকি একটি array-তে। `bind` কিছুই call করে না। এটা এমন একটি নতুন function
return করে, যার `this` স্থায়ীভাবে ঠিক করা, আর এটা শুরুর argument আগে থেকেই বসিয়ে দিতে পারে।

**Q: একটি event handler-এর জন্য class-field arrow-এর বদলে কখন `bind` বেছে নেবেন?**

যখন handler-টি prototype-এ একবারই থাকা উচিত, প্রতিটি instance-এ copy হওয়া নয়। উদাহরণ: হাজার হাজার instance-ওয়ালা
একটি class, অথবা এমন একটি class যার method subclass-গুলোর override করা উচিত। Class-field arrow prototype-এ থাকে না।
তাই কোনো subclass method এটাকে override করতে পারে না, আর test-ও prototype দিয়ে এটার ওপর spy করতে পারে না।

## এরপর কী পড়বেন

- [Chapter ?? — Prototype ও Inheritance](#ch-prototypes-inheritance) — `new` binding তার object কোথা থেকে পায়
- [Chapter ?? — Scope ও Closure](#ch-closures) — lexical `this`-এর জন্য arrow কী ছেড়ে দেয়, আর একটি function context মনে রাখার অন্য উপায়
