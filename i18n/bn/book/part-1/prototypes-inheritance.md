---
sourceHash: "84c272bc82306e6b1063673030e5f2c08c1024234a6b43f2dc17dbef8f0832c4"
title: "Prototype ও Inheritance"
translatedAt: "2026-10-13T12:11:48.051Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Prototype ও Inheritance {#ch-prototypes-inheritance}

> Prototype chain ধরে একটি property কীভাবে খোঁজা হয় তা অনুসরণ করুন, আর `class` ভেতরে ভেতরে আসলে কী করছে তা বুঝিয়ে বলুন।

**এই অধ্যায়ে:** delegation বনাম classical inheritance · prototype chain · `Object.create` · constructor function · `class` compile হয়ে কী হয়

## 💡 মূল ধারণা

Runtime-এ JavaScript-এর কোনো class নেই। আছে object, যারা অন্য object-এর ওপর কাজ **ছেড়ে দেয়**, মানে delegate করে।
প্রতিটি object-এর ভেতরে লুকানো একটি link থাকে, `[[Prototype]]`, যা আরেকটি object-এর দিকে দেখায়। Object-এর নিজের নেই
এমন property পড়তে গেলে JavaScript সেই link ধরে এগোয়, তারপর পরেরটা ধরে। কিছু মিলে গেলে, অথবা chain `null`-এ পৌঁছালে,
খোঁজা থামে। `class` ঠিক এর ওপরেই একটি syntax: একই link বানানোর একটু সুন্দর উপায়।

## কীভাবে কাজ করে

| দিক        | Classical (Java, C#)             | Prototypal (JavaScript)           |
| ------------- | -------------------------------- | --------------------------------- |
| **Model**     | Class-এর নকশা → instance তার copy | Object → object-এর ওপর delegation        |
| **Method**   | প্রতিটি instance-এর type-এ copy হয়  | Shared, chain ধরে হেঁটে খুঁজে পাওয়া যায় |
| **কখন ঠিক হয়**    | Class compile হওয়ার সময়ই, তারপর স্থির  | Runtime-এও বদলানো যায়                |
| **কী দিয়ে বানানো** | `class`, `extends`               | `[[Prototype]]` link, `Object.create` |

### খোঁজার প্রক্রিয়া

```mermaid
flowchart TD
    A["read obj.prop"] --> B{own property?}
    B -->|Yes| C[return it]
    B -->|No| D["follow [[Prototype]]"]
    D --> E{found here?}
    E -->|Yes| C
    E -->|No| F{prototype is null?}
    F -->|No| D
    F -->|Yes| G[return undefined]
```

**Property পড়ার সময় chain ধরে এক এক link করে এগোনো হয়, আর প্রথম মিল পেলেই থামে।**

`Dog extends Animal` হলে `const buddy = new Dog()`-এর chain দাঁড়ায়
`buddy → Dog.prototype → Animal.prototype → Object.prototype → null`। এ কারণেই কেউ define না করলেও প্রতিটি
object-এ `toString` থাকে।

**Link পড়া আর বসানো:**

<!-- lint-allow-fence: javascript — `__proto__` is a deprecated accessor that TypeScript does not put on the object type; the fence exists to compare it with `Object.getPrototypeOf` -->
```javascript
const obj = {};

obj.__proto__;               // deprecated accessor — recognise it, don't write it
Object.getPrototypeOf(obj);  // ✅ the standard read
Object.setPrototypeOf(a, b); // ✅ the standard write — slow, so avoid it in hot paths
```

### Method কেন prototype-এ রাখা হয়

Instance property প্রতিটি object-এ নিজের আলাদা copy রাখে। Prototype method হলো একটিই function, যা সব instance
ভাগ করে নেয়।

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
// ❌ assigning in the constructor: one greet function per instance
function PersonBad(name) { this.name = name; this.greet = function () {}; }
new PersonBad('a').greet === new PersonBad('b').greet; // false

// ✅ on the prototype: one greet function, shared
function Person(name) { this.name = name; }
Person.prototype.greet = function () { console.log(this.name); };
new Person('a').greet === new Person('b').greet; // true
```

হাজারটা instance হলে প্রথম ধরনে হাজারটা closure, দ্বিতীয় ধরনে একটিই function।

### `new` কী করে

`new` চারটি ধাপে কাজ করে:

1. একটি খালি object তৈরি করে।
2. তার `[[Prototype]]` বসায় constructor-এর `.prototype`-এ।
3. `this`-কে সেই object-এ bind করে constructor-এর body চালায়।
4. Object-টা return করে, যদি না body নিজে অন্য কোনো object return করে।

`Object.create(Person.prototype)` শুধু প্রথম দুটি ধাপ করে। তাই কোনো constructor ছাড়াই delegation বোঝানোর সরাসরি
উপায় এটাই।

```typescript
const personPrototype = {
  greet(this: { name: string }): void {
    console.log(`Hello, I'm ${this.name}`);
  },
};

const alice = Object.create(personPrototype) as { name: string; greet(): void };
alice.name = 'Alice';
alice.greet(); // 'Hello, I'm Alice' — found by delegation, not ownership
```

### `class`, আর এটা আসলে কিসের মোড়ক

```typescript
class Animal {
  constructor(public name: string) {}

  eat(): void {
    console.log(`${this.name} is eating`);
  }
}

class Dog extends Animal {
  // `extends` is what wires Dog.prototype → Animal.prototype
  override eat(): void {
    super.eat(); // reaches the shadowed prototype method
    console.log('and wagging');
  }
}

typeof Animal; // 'function' — still a function, still a prototype
Object.getPrototypeOf(new Dog('a')) === Dog.prototype; // true
```

2015-এর আগে একই ফল পেতে তিন লাইনের হাতের কাজ লাগত। Child constructor call করত
`Animal.call(this, name)`। তারপর `Dog.prototype = Object.create(Animal.prototype)` chain-টা জুড়ত। শেষে
`Dog.prototype.constructor = Dog` সেই reference ঠিক করত, যা আগের assignment মুছে দিয়েছিল। পুরনো code-এ এটা চিনে
রাখুন, কিন্তু নিজে কখনো লিখবেন না।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                        | কী ব্যবহার করবেন                | কেন                                             |
| ----------------------------------------------- | ------------------------ | ----------------------------------------------- |
| একই আচরণের অনেক instance-ওয়ালা type  | `class`                  | Method আপনা থেকেই prototype-এ গিয়ে বসে      |
| একটি object, যে আরেকটির ওপর delegate করবে       | `Object.create(proto)`   | নতুন class না বানিয়েই delegation বোঝায়  |
| কয়েকটি স্বাধীন উৎস থেকে জোড়া লাগানো আচরণ | Composition, বা mixin class expression | Single inheritance দিয়ে এটা বোঝানো যায় না |
| Array বা string-এ একটি helper যোগ করা             | আলাদা একটি function    | Built-in prototype-এ patch করলে অন্যের code ভাঙে |

## সাধারণ ভুল

**❌ Instance তৈরির পরে prototype object বদলে ফেলা।** পুরনো instance-গুলো আগের link-ই ধরে রাখে, নতুন method পায় না:

```typescript
Person.prototype = { greet() {} }; // ❌ old instances are stranded
Person.prototype.greet = function () {}; // ✅ add to the existing object
```

**❌ Built-in prototype-এ patch করা।** `Array.prototype.first = ...` page-এর প্রতিটি library দেখতে পায়। এটা
`for...in`-এও হাজির হয়, আর ভবিষ্যতের standard method-এর সঙ্গে নামে ধাক্কা খায়। তার বদলে `first(arr)`
লিখুন।

**❌ ধরে নেওয়া যে ঢেকে যাওয়া property মুছে গেছে।** `alice.age = 25` assign করলে একটি *নিজস্ব* property তৈরি হয়,
যা prototype-এরটাকে আড়াল করে। `delete alice.age` করলে prototype-এর value আবার দেখা যায়।

**❌ `super()`-এর আগে `this` ব্যবহার করা।** Derived constructor-এ `super` return না করা পর্যন্ত `this`-এর
অস্তিত্বই নেই। TypeScript এটা ধরে ফেলে। সাধারণ JavaScript runtime-এ `ReferenceError` throw করে।

> ⚠️ চালু থাকা object-এর ওপর `Object.setPrototypeOf` চালালে প্রতিটি বড় engine-এ সেটা ধীর হয়ে যায়। তার বদলে
> তৈরির সময়েই `Object.create` বা `class` দিয়ে prototype বসিয়ে দিন।

## 🔑 মূল শিক্ষা

- Property খোঁজা `[[Prototype]]` chain ধরে হাঁটে, প্রথম মিলে থামে, আর শেষ হয় `null`-এ।
- `class` শুধু syntax: class-এর `typeof` হলো `'function'`, আর তার method থাকে `.prototype`-এ।
- Prototype-এর method সবাই ভাগ করে নেয়; constructor-এ assign করা method প্রতিটি instance-এ আলাদা copy হয়।
- `Fn.prototype` হলো সেই object, যার ওপর instance-গুলো delegate করে; `obj.__proto__` হলো তার দিকে দেখানো link।
- Property assign করলে prototype-এরটা বদলায় না, শুধু ঢাকা পড়ে।

## Interview-এর প্রশ্ন

**Q: `prototype` আর `__proto__`-এর পার্থক্য কী?**

`prototype` হলো constructor function-এর একটি property। এতে থাকে সেই object, যার ওপর তার instance-গুলো delegate করবে।
`__proto__` হলো instance-এর ওপরের delegation link। `const a = new Person()` হলে
`a.__proto__ === Person.prototype`। Link-টা পড়ুন `Object.getPrototypeOf` দিয়ে, কারণ `__proto__` একটি
deprecated accessor।

**Q: ES2015-এর class কি সত্যিকারের class?**

না। `class` হলো constructor function আর prototype-এর ওপর একটি syntax। Class তখনো একটি function, তার method তখনো
`.prototype`-এ বসানো হয়, আর `extends` তখনো শুধু একটি prototype-কে আরেকটির সঙ্গে জোড়ে। তবে এটা ওপরে কিছু সত্যিকারের
নিয়ম যোগ করে। Declaration চলার আগ পর্যন্ত class-এর নাম TDZ-এ (temporal dead zone) থাকে, আর `this`-এর আগে
`super()` আসতেই হবে। এর method-গুলো non-enumerable, আর সেগুলো `new` দিয়ে call করা যায় না। কিন্তু নিচের object
model একই আছে।

**Q: কখন `class`-এর বদলে `Object.create` পছন্দ করবেন?**

যখন একটি object আরেকটির ওপর delegate করবে, আর নতুন একটি type বানিয়ে কিছু যোগ হয় না। যেমন এমন config object, যা
না পেলে default-এ ফিরে যায়, কিংবা এমন test double, যা আসল implementation-এর ওপর delegate করে। আরেকটি উদাহরণ:
data থেকে runtime-এ বানানো prototype chain। Property descriptor দিয়ে সূক্ষ্ম নিয়ন্ত্রণও এতে পাওয়া যায়, যা class
syntax দেয় না।

## এরপর কী পড়বেন

- [Chapter ?? — `this` Keyword](#ch-this-keyword) — `new` binding কীভাবে object-টা জোগায়
- [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) — এই model-এর ওপর encapsulation, আর chain যখন আর কাজে আসে না তখন কী করবেন
