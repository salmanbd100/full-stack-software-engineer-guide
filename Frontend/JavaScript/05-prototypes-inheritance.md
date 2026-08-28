---
title: Prototypes and Inheritance
part: 1
chapter: 0
slug: prototypes-inheritance
level: intermediate # beginner | intermediate | advanced
reading_time: 33
updated: 2026-08-28
tags: [frontend, javascript, prototypes, inheritance]
in_book: true
---

# Prototypes and Inheritance {#ch-prototypes-and-inheritance}

> Follow a property lookup up the prototype chain and explain what `class` is actually doing underneath.

**In this chapter:** delegation vs classical inheritance · the prototype chain · `Object.create` · constructor functions · what `class` compiles to

## Why Prototypes Matter

**Interview Perspective:**
- Distinguishes candidates who truly understand JavaScript vs those who just know syntax
- Classic question: "Explain how prototypal inheritance works"
- Tests understanding of memory management and performance
- Foundation for understanding ES6 classes (which are syntactic sugar)

**Real-World Importance:**
- **Performance**: Shared methods save memory (vs creating copies for each instance)
- **Framework Understanding**: React, Vue all use prototypes under the hood
- **Debugging**: Understanding `__proto__` helps debug inheritance issues
- **Architecture**: Enables powerful patterns like mixins and composition

## Classical vs Prototypal Inheritance

| Aspect | Classical (Java/C++) | Prototypal (JavaScript) |
|--------|---------------------|------------------------|
| **Model** | Class blueprint → Instance copies | Object → Object delegation |
| **Inheritance** | Class extends class | Object links to object |
| **Properties** | Copied to instances | Shared via prototype chain |
| **Flexibility** | Fixed at class definition | Dynamic at runtime |
| **Syntax** | `class`, `extends`, `new` | Functions, `prototype`, `Object.create` |

## 📚 Core Concepts

### 1. What is a Prototype?

### 💡 **JavaScript's Inheritance Mechanism**

Prototypes are the foundation of JavaScript's inheritance system.

**Core Concept:**

Every object has a hidden internal property `[[Prototype]]` that references another object.

**How Prototype Lookup Works:**

```text
Access obj.property
    ↓
1. Check obj itself → Found? Return it
    ↓ Not found
2. Check obj.[[Prototype]] → Found? Return it
    ↓ Not found
3. Check [[Prototype]].[[Prototype]] → Found? Return it
    ↓ Not found
4. ... Continue up the chain
    ↓ Reached null
5. Return undefined
```

**Key Characteristics:**

**1. Delegation-Based Inheritance:**
- Objects inherit **directly** from other objects
- No classes as blueprints (unlike Java/C++)
- Properties are **shared**, not copied

**2. Prototype Chain:**
- Each object links to its prototype
- Forms a chain: `obj → prototype → prototype → ... → null`
- Property lookup traverses the chain

**3. Accessing Prototypes:**
<!-- lint-allow-fence: javascript — `__proto__` is a deprecated accessor that TypeScript does not put on the object type; the fence exists to compare it with `Object.getPrototypeOf` -->
```javascript
const obj = {};

// Method 1: __proto__ (non-standard but widely supported)
obj.__proto__

// Method 2: Object.getPrototypeOf() (preferred ✅)
Object.getPrototypeOf(obj)

// Method 3: Constructor's prototype
obj.constructor.prototype
```

**Comparison with Classical Inheritance:**

| JavaScript (Prototypal) | Java/C++ (Classical) |
|------------------------|---------------------|
| Object → Object links | Class → Instance copies |
| Delegation (shared) | Inheritance (copied) |
| Dynamic at runtime | Fixed at compile time |
| Prototype chain lookup | Hierarchical structure |

**Why This Matters:**

**Memory Efficiency:**
- Methods shared via prototype (not duplicated per instance)
- One method in memory, used by all instances

**Dynamic Behavior:**
- Add methods to prototype → all instances get them
- Modify prototype → affects all instances

**Foundation of Everything:**
- ES6 classes are syntactic sugar over prototypes
- Understanding prototypes = understanding JavaScript objects

**The Hidden Truth:**
> Every object in JavaScript (except `null`) has a prototype. Even ES6 classes use prototypes under the hood - `class` syntax is just a cleaner way to work with the prototype system.

<!-- lint-allow-fence: javascript — same `__proto__` accessor — reads or rewrites the prototype chain at runtime, which the static type does not follow; TypeScript reports the inherited property as missing -->
```javascript
const obj = {};

console.log(obj.__proto__ === Object.prototype); // true
console.log(Object.getPrototypeOf(obj) === Object.prototype); // true

// All objects inherit from Object.prototype
console.log(obj.toString); // [Function: toString] (inherited)
console.log(obj.hasOwnProperty); // [Function: hasOwnProperty] (inherited)
```

### 2. Prototype Chain

When you access a property, JavaScript searches:
1. The object itself
2. Its prototype
3. The prototype's prototype
4. ... until it reaches `null`

**Prototype Chain Lookup** - Demonstrates how JavaScript traverses the prototype chain to find properties, inheriting from ancestors.

<!-- lint-allow-fence: javascript — `Object.setPrototypeOf` builds the chain at runtime, so `child.age` and `child.surname` — reads or rewrites the prototype chain at runtime, which the static type does not follow; TypeScript reports the inherited property as missing -->
```javascript
const grandparent = {
    surname: 'Smith'
};

const parent = {
    age: 50
};

const child = {
    name: 'Alice'
};

// Set up prototype chain
Object.setPrototypeOf(parent, grandparent);
Object.setPrototypeOf(child, parent);

// Property lookup
console.log(child.name);    // 'Alice' (own property)
console.log(child.age);     // 50 (from parent)
console.log(child.surname); // 'Smith' (from grandparent)

// Prototype chain: child -> parent -> grandparent -> Object.prototype -> null
```

### 3. Constructor Functions

### 💡 **Pre-ES6 Object "Classes"**

Constructor functions are the traditional way to create object templates in JavaScript.

**The Pattern:**

**Instance Properties** (unique per object):
- Defined inside constructor with `this.property`
- Each instance gets its own copy

**Shared Methods** (shared across all instances):
- Defined on `Constructor.prototype`
- All instances reference the same function

**Why Use Prototypes for Methods:**

**❌ Without Prototype (Inefficient):**
<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Person(name) {
    this.name = name;
    // Each instance gets its own copy of greet
    this.greet = function() {
        console.log(`Hi, I'm ${this.name}`);
    };
}

const p1 = new Person('Alice');
const p2 = new Person('Bob');

console.log(p1.greet === p2.greet); // false ❌
// Two separate functions in memory!
```

**Memory Cost:**
- 1 instance = 1 method copy
- 1000 instances = 1000 method copies 🔴
- Wastes memory

**✅ With Prototype (Efficient):**
<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Person(name) {
    this.name = name; // Instance property
}

// Method on prototype (shared)
Person.prototype.greet = function() {
    console.log(`Hi, I'm ${this.name}`);
};

const p1 = new Person('Alice');
const p2 = new Person('Bob');

console.log(p1.greet === p2.greet); // true ✅
// Same function reference!
```

**Memory Cost:**
- 1 method in memory
- 1000 instances = still 1 method copy ✅
- Memory efficient

**The Prototype Pattern Benefits:**

| Benefit | Description |
|---------|-------------|
| **Memory Efficiency** | Methods shared, not duplicated |
| **Dynamic Updates** | Change prototype → affects all instances |
| **Inheritance** | Easy to set up prototype chains |
| **Performance** | Less memory = better performance |

**Memory Comparison:**

```text
Without Prototype:
Person Instance 1: { name: 'Alice', greet: function() {...} }
Person Instance 2: { name: 'Bob',   greet: function() {...} }
Person Instance 3: { name: 'Carol', greet: function() {...} }
→ 3 greet functions in memory

With Prototype:
Person Instance 1: { name: 'Alice' } ──┐
Person Instance 2: { name: 'Bob' }   ──┼──> Person.prototype.greet: function() {...}
Person Instance 3: { name: 'Carol' } ──┘
→ 1 greet function in memory
```

**ES6 Classes Build on This:**

This exact pattern is what ES6 `class` syntax uses under the hood:

```typescript
class Person {
  name: string;

  constructor(name: string) {
    this.name = name; // Instance property — lives on the object
  }

  greet(): void {
    // Methods land on Person.prototype automatically, shared by every instance
    console.log(`Hi, I'm ${this.name}`);
  }
}

// Exactly the constructor-function-plus-prototype pattern above, with syntax
```

**Key Insight:**
> The prototype pattern isn't just a legacy feature - it's the efficient, scalable way to create objects with shared behavior. ES6 classes are syntactic sugar that make this pattern cleaner to write.

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Person(name, age) {
    // Instance properties
    this.name = name;
    this.age = age;
}

// Methods on prototype (shared by all instances)
Person.prototype.greet = function() {
    console.log(`Hello, I'm ${this.name}, ${this.age} years old`);
};

Person.prototype.celebrate = function() {
    this.age++;
    console.log(`Happy birthday! Now ${this.age}`);
};

// Create instances
const alice = new Person('Alice', 25);
const bob = new Person('Bob', 30);

alice.greet(); // "Hello, I'm Alice, 25 years old"
bob.celebrate(); // "Happy birthday! Now 31"

// All instances share the same prototype
console.log(alice.greet === bob.greet); // true (same function)
```

**What `new` Does:**

**'new' Operator Mechanics** - Breaks down what happens when 'new' is used: object creation, prototype linking, 'this' binding, and return.

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Person(name) {
    // 1. Creates new empty object: const this = {}
    // 2. Sets prototype: this.__proto__ = Person.prototype
    this.name = name;
    // 3. Returns this (implicit)
}

// Equivalent manual creation
function createPerson(name) {
    const obj = Object.create(Person.prototype);
    obj.name = name;
    return obj;
}
```

### 4. ES6 Classes

**ES6 Classes** provide cleaner, more familiar syntax for creating constructor functions and prototypes, making JavaScript more accessible to developers from classical OOP backgrounds. Despite the class keyword, JavaScript doesn't have true classes - they're syntactic sugar over the same prototype mechanism. The class syntax automatically puts methods on the prototype, handles constructor setup, and provides clearer inheritance syntax with extends. Static methods attach to the class itself (like factory methods), while regular methods go on the prototype. Understanding that classes are just functions with special syntax is crucial - typeof Person is still "function", and the prototype chain works identically.

**ES6 Class Syntax** - Modern class syntax that compiles to prototype-based code, offering cleaner syntax for inheritance and methods.

```typescript
class Person {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  // Goes on Person.prototype
  greet(): void {
    console.log(`Hello, I'm ${this.name}`);
  }

  // Static — on the constructor itself, not the prototype
  static species(): string {
    return 'Homo sapiens';
  }
}

const alice = new Person('Alice', 25);
alice.greet(); // "Hello, I'm Alice"
console.log(Person.species()); // "Homo sapiens"

// `class` is syntax. Underneath it is still a function and a prototype
console.log(typeof Person); // "function"
console.log(Object.getPrototypeOf(alice) === Person.prototype); // true
```

### 5. Inheritance with Prototypes

**Constructor Function Inheritance**

**Classical Inheritance Pattern** - Shows pre-ES6 inheritance using constructor functions, Object.create(), and fixing constructor references.

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
// Parent constructor
function Animal(name) {
    this.name = name;
}

Animal.prototype.eat = function() {
    console.log(`${this.name} is eating`);
};

// Child constructor
function Dog(name, breed) {
    Animal.call(this, name); // Call parent constructor
    this.breed = breed;
}

// Set up prototype chain
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog; // Fix constructor reference

Dog.prototype.bark = function() {
    console.log(`${this.name} says woof!`);
};

const buddy = new Dog('Buddy', 'Golden Retriever');
buddy.eat();  // "Buddy is eating" (inherited)
buddy.bark(); // "Buddy says woof!" (own method)

console.log(buddy instanceof Dog);    // true
console.log(buddy instanceof Animal); // true
```

**ES6 Class Inheritance**

**extends and super Keywords** - Modern inheritance using 'extends' for subclassing and 'super' for calling parent constructors and methods.

```typescript
class Animal {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  eat(): void {
    console.log(`${this.name} is eating`);
  }
}

class Dog extends Animal {
  breed: string;

  constructor(name: string, breed: string) {
    super(name); // Must run before any use of `this`
    this.breed = breed;
  }

  bark(): void {
    console.log(`${this.name} says woof!`);
  }

  // Overriding replaces the prototype method; `super` reaches the original
  override eat(): void {
    super.eat();
    console.log(`${this.name} is a good dog!`);
  }
}

const buddy = new Dog('Buddy', 'Golden Retriever');
buddy.eat();
// "Buddy is eating"
// "Buddy is a good dog!"
buddy.bark(); // "Buddy says woof!"
```

### 6. Object.create()

Create objects with specific prototype without constructor functions.

**Object.create() for Prototypal Inheritance** - Creates objects directly with specified prototypes, offering simpler inheritance without constructors.

```typescript
interface PersonLike {
  name: string;
  greet(): void;
}

const personPrototype = {
  greet(this: PersonLike): void {
    console.log(`Hello, I'm ${this.name}`);
  },
};

// Object.create is the direct way to say "this object delegates to that one".
// No constructor, no `new`, no class
const alice = Object.create(personPrototype) as PersonLike;
alice.name = 'Alice';
alice.greet(); // "Hello, I'm Alice"

// The second argument takes property descriptors, not plain values
const bob = Object.create(personPrototype, {
  name: {
    value: 'Bob',
    writable: true,
    enumerable: true,
    configurable: true,
  },
}) as PersonLike;
```

### 7. Checking Prototypes and Properties

**Property and Prototype Checking** - Methods to distinguish own properties from inherited ones, check prototype chain, and verify instances.

<!-- lint-allow-fence: javascript — mixes own-vs-inherited property checks with a constructor function; reads or rewrites the prototype chain at runtime, which the static type does not follow; TypeScript reports the inherited property as missing -->
```javascript
const obj = { own: 'property' };

// hasOwnProperty - checks own properties
console.log(obj.hasOwnProperty('own')); // true
console.log(obj.hasOwnProperty('toString')); // false (inherited)

// in operator - checks own + inherited
console.log('own' in obj); // true
console.log('toString' in obj); // true (inherited)

// getOwnPropertyNames
console.log(Object.getOwnPropertyNames(obj)); // ['own']

// instanceof - checks prototype chain
function Person(name) {
    this.name = name;
}

const alice = new Person('Alice');
console.log(alice instanceof Person); // true
console.log(alice instanceof Object); // true

// isPrototypeOf
console.log(Person.prototype.isPrototypeOf(alice)); // true
console.log(Object.prototype.isPrototypeOf(alice)); // true
```

## 🎯 Common Interview Questions

### Q1: What's the difference between `__proto__` and `prototype`?

**Answer:**

**__proto__ vs prototype** - Clarifies that 'prototype' is a property of constructor functions while '__proto__' is the actual prototype reference of objects.

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Person(name) {
    this.name = name;
}

const alice = new Person('Alice');

// 'prototype' is a property of constructor functions
console.log(Person.prototype); // { constructor: Person }

// '__proto__' is the actual prototype of an object
console.log(alice.__proto__ === Person.prototype); // true

// Visualization:
// alice.__proto__ -----> Person.prototype
// Person.prototype.constructor -----> Person
```

### Q2: How does prototypal inheritance work?

**Answer:**

**Prototypal Inheritance Mechanism** - Explains property lookup through the prototype chain and how adding to prototypes affects all instances.

<!-- lint-allow-fence: javascript — reading `obj.b` where `b` does not exist is the lookup being traced; TypeScript refuses to compile the access -->
```javascript
// When you access a property:
const obj = {
    a: 1
};

obj.b; // undefined

// JavaScript looks up:
// 1. obj.b (not found)
// 2. obj.__proto__.b (Object.prototype.b, not found)
// 3. obj.__proto__.__proto__ (null)
// Returns undefined

// Adding to prototype affects all instances
function Person(name) {
    this.name = name;
}

const alice = new Person('Alice');
const bob = new Person('Bob');

Person.prototype.greet = function() {
    console.log(`Hi, I'm ${this.name}`);
};

alice.greet(); // Works!
bob.greet();   // Works too!
```

### Q3: How do you implement inheritance?

**Answer: Three Ways**

**1. Constructor Functions**

**Pre-ES6 Inheritance Setup** - Manual inheritance using constructor functions with Object.create() to establish prototype chain.

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Animal(name) {
    this.name = name;
}

Animal.prototype.eat = function() {
    console.log('eating');
};

function Dog(name, breed) {
    Animal.call(this, name);
    this.breed = breed;
}

Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
```

**2. ES6 Classes**

**Modern Class-Based Inheritance** - Clean ES6 syntax for inheritance using extends and super, replacing manual prototype manipulation.

```typescript
class Animal {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  eat(): void {
    console.log('eating');
  }
}

class Dog extends Animal {
  breed: string;

  constructor(name: string, breed: string) {
    super(name);
    this.breed = breed;
  }
}
```

**3. Object.create()**

**Prototypal Inheritance Without Constructors** - Simple object-based inheritance creating new objects with existing objects as prototypes.

```typescript
interface Animalish {
  eat(): void;
}

interface Dogish extends Animalish {
  bark(): void;
}

const animal: Animalish = {
  eat(): void {
    console.log('eating');
  },
};

// Objects delegating to objects — no constructor in sight
const dog = Object.create(animal) as Dogish;
dog.bark = function (): void {
  console.log('woof');
};
```

## 💡 Practical Examples

### Example 1: Method Sharing (Memory Efficiency)

**Prototype vs Instance Methods** - Compares memory usage of instance methods versus shared prototype methods, highlighting efficiency benefits.

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
// Bad: Each instance gets its own copy
function PersonBad(name) {
    this.name = name;
    this.greet = function() { // New function for each instance!
        console.log(`Hi, I'm ${this.name}`);
    };
}

const p1 = new PersonBad('Alice');
const p2 = new PersonBad('Bob');
console.log(p1.greet === p2.greet); // false (wasteful!)

// Good: Shared method on prototype
function PersonGood(name) {
    this.name = name;
}

PersonGood.prototype.greet = function() {
    console.log(`Hi, I'm ${this.name}`);
};

const p3 = new PersonGood('Alice');
const p4 = new PersonGood('Bob');
console.log(p3.greet === p4.greet); // true (efficient!)
```

### Example 2: Extending Built-in Objects (Be Careful!)

**Modifying Built-in Prototypes** - Shows how to extend native objects (discouraged) and why utility functions are safer alternatives.

<!-- lint-allow-fence: javascript — extending a built-in prototype needs a `declare global` interface merge in TypeScript, which is a different lesson from the one here — and the fence's own advice is not to do this -->
```javascript
// Generally not recommended, but shows prototype power

// Add custom method to all arrays
Array.prototype.first = function() {
    return this[0];
};

const arr = [1, 2, 3];
console.log(arr.first()); // 1

// Problem: Can break libraries expecting standard behavior
// Better: Create utility function
function first(arr) {
    return arr[0];
}
```

### Example 3: Mixins Pattern

**Multiple Inheritance with Mixins** - Uses Object.assign() to copy properties from multiple sources, achieving mixin-style multiple inheritance.

<!-- lint-allow-fence: javascript — `Object.assign(Duck.prototype, …)` adds methods the class type does not know about, so every call site errors; TypeScript's mixin pattern uses class expressions instead -->
```javascript
// Multiple inheritance via mixins
const canEat = {
    eat() {
        console.log('eating');
    }
};

const canWalk = {
    walk() {
        console.log('walking');
    }
};

const canSwim = {
    swim() {
        console.log('swimming');
    }
};

// Duck can do all three
class Duck {
    constructor(name) {
        this.name = name;
    }
}

// Mix in capabilities
Object.assign(Duck.prototype, canEat, canWalk, canSwim);

const duck = new Duck('Donald');
duck.eat();  // "eating"
duck.walk(); // "walking"
duck.swim(); // "swimming"
```

### Example 4: Private Properties Pattern

**Privacy Through Closures** - Creates private variables using closures in constructors, trading memory efficiency for data privacy.

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Counter() {
    let count = 0; // Private variable

    this.increment = function() {
        count++;
    };

    this.getCount = function() {
        return count;
    };
}

const counter = new Counter();
counter.increment();
console.log(counter.getCount()); // 1
console.log(counter.count); // undefined (private!)

// Note: These methods are NOT on prototype (less memory efficient)
// Trade-off: privacy vs efficiency
```

## 🚨 Common Pitfalls

### 1. Forgetting to Call Parent Constructor

```typescript
class Animal {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

// ❌ TypeScript reports this at compile time; plain JavaScript waits until
// the constructor runs and throws a ReferenceError
class Dog extends Animal {
  breed: string;

  constructor(name: string, breed: string) {
    this.breed = breed; // Error — `super` must be called first
  }
}

// ✅ Fixed
class DogFixed extends Animal {
  breed: string;

  constructor(name: string, breed: string) {
    super(name);
    this.breed = breed;
  }
}
```

### 2. Modifying Prototype Directly

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Person(name) {
    this.name = name;
}

const alice = new Person('Alice');

// Bad: Replaces entire prototype
Person.prototype = {
    greet() {
        console.log('Hello');
    }
};

// alice still uses old prototype!
// alice.greet(); // TypeError

// Good: Add to existing prototype
Person.prototype.greet = function() {
    console.log('Hello');
};
```

### 3. Shadowing Properties

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` and hanging methods off `.prototype` has no TypeScript form — `class` is the TypeScript form, and using it here would hide the mechanism the chapter exists to explain -->
```javascript
function Person(name) {
    this.name = name;
}

Person.prototype.age = 0;

const alice = new Person('Alice');
console.log(alice.age); // 0 (from prototype)

alice.age = 25; // Creates own property, shadows prototype
console.log(alice.age); // 25 (own property)

delete alice.age; // Remove own property
console.log(alice.age); // 0 (back to prototype)
```

## 🎓 Best Practices

1. **Use ES6 classes** for clearer syntax (still prototypes underneath)
2. **Put methods on prototype** (memory efficiency)
3. **Don't modify built-in prototypes** (can break code)
4. **Use `Object.create()` for simple inheritance**
5. **Prefer composition over inheritance** when possible
6. **Always call `super()` first** in child constructors

## 📊 Prototype Chain Visualization

```typescript
class Animal {
  eat(): void {}
}

class Dog extends Animal {
  bark(): void {}
}

const buddy = new Dog();

// The chain a property lookup walks, in order:
// buddy
//   ↓
// Dog.prototype { bark, constructor }
//   ↓
// Animal.prototype { eat, constructor }
//   ↓
// Object.prototype { toString, hasOwnProperty, … }
//   ↓
// null — lookup ends, the result is undefined
```

## 🔗 Related Topics

- [This Keyword](./04-this-keyword.md)
- [Functions & Scope](./02-functions-scope.md)
- [ES6+ Features](./08-es6-features.md)

---

[← Back to JavaScript](./README.md) | [Next: Promises →](./06-promises-async.md)
