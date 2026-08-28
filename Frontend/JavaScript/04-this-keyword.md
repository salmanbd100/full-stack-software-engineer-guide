# The `this` Keyword {#ch-the-this-keyword}

> Work out what `this` will be from the call site alone, and fix it when it is wrong.

**In this chapter:** the four binding rules · losing an implicit binding · `call`, `apply` and `bind` · why arrows have no `this` · the mistakes interviewers probe

## Why 'this' Matters

**Interview Perspective:**
- One of the most frequently asked JavaScript concepts
- Tests deep understanding of execution context
- Common source of "gotcha" questions
- Essential for explaining object-oriented patterns

**Real-World Importance:**
- Critical for event handlers and callbacks
- Fundamental to understanding frameworks (React class components, Vue)
- Necessary for method borrowing and mixins
- Key to debugging context-related bugs

## 📚 Core Concepts

### The Four Binding Rules (In Priority Order)

JavaScript determines the value of `this` using these rules, checked in this specific order:

| Priority | Rule | Context | Example |
|----------|------|---------|---------|
| **1st** | `new` binding | Constructor call | `new Person()` |
| **2nd** | Explicit binding | call/apply/bind | `func.call(obj)` |
| **3rd** | Implicit binding | Method call | `obj.method()` |
| **4th** | Default binding | Standalone function | `func()` |

**Arrow functions** don't follow these rules - they inherit `this` lexically.

### Quick Decision Tree

```text
Is it an arrow function?
├─ Yes → Use lexical 'this' from enclosing scope
└─ No ↓

Was 'new' used?
├─ Yes → 'this' = new empty object
└─ No ↓

Was call/apply/bind used?
├─ Yes → 'this' = specified object
└─ No ↓

Was it called as a method (obj.func())?
├─ Yes → 'this' = object before the dot
└─ No ↓

Standalone function call
└─ 'this' = global object (or undefined in strict mode)
```

### 1. The Four Binding Rules

### 2. Default Binding

### 💡 **Default Binding - The Fallback Rule**

Default binding is the fallback when no other binding rules apply.

**When It Applies:**
- Standalone function call
- Not a method call (`obj.method()`)
- Not using `new`
- Not using `call`/`apply`/`bind`

**Behavior Depends on Strict Mode:**

**Non-Strict Mode (Dangerous):**
```typescript
// TypeScript models `this` as a fake first parameter. It is erased at
// compile time and exists purely so the call site can be checked
function showThis(this: unknown): void {
  console.log(this);
}
showThis(); // globalThis in a script, undefined in a module
```

- `this` → global object
- **Problem**: Can accidentally create global variables
- **Dangerous**: Silent bugs instead of errors

**Strict Mode (Safe):**
<!-- lint-allow-fence: javascript — the whole point is that `'use strict'` changes what the runtime binds to `this`; a TypeScript module is already strict, so the contrast disappears -->
```javascript
'use strict';
function showThisStrict() {
    console.log(this);
}
showThisStrict(); // undefined
```

- `this` → `undefined`
- **Benefit**: Throws errors instead of silent bugs
- **Recommended**: Catches mistakes early

**Why Strict Mode Matters:**

| Mode | `this` Value | Accidental Globals | Error Detection |
|------|-------------|-------------------|-----------------|
| **Non-Strict** | Global object | ✅ Possible | ❌ Silent bugs |
| **Strict** | `undefined` | ❌ Prevented | ✅ Immediate errors |

**Example of the Problem:**
<!-- lint-allow-fence: javascript — assigning to `this.name` in a plain function call is the mistake being shown, and TypeScript refuses to compile it -->
```javascript
// Without strict mode
function createUser(name) {
    this.name = name; // Oops! Creates window.name
}
createUser('Alice'); // Should use 'new'
console.log(window.name); // 'Alice' 🔴 Global pollution!

// With strict mode
'use strict';
function createUserStrict(name) {
    this.name = name; // TypeError: Cannot set property 'name' of undefined
}
```

**Key Insight:**
> Default binding explains why arrow functions (which don't have their own `this`) behave differently - they skip default binding and inherit `this` lexically.

<!-- lint-allow-fence: javascript — same strict-mode contrast as above — two `'use strict'` directives in one fence, which a TypeScript module cannot express -->
```javascript
function showThis() {
    console.log(this);
}

showThis(); // window (in browser) or global (in Node.js)

// Strict mode
'use strict';
function showThisStrict() {
    console.log(this);
}

showThisStrict(); // undefined
```

### 3. Implicit Binding

### 💡 **Implicit Binding - Method Calls**

Implicit binding occurs when a function is invoked as an object method.

**The Rule:**
```text
obj.method() → this = obj (object before the dot)
```

**How It Works:**

**Simple Case:**
```typescript
const user = {
  name: 'Alice',
  greet: function (): void {
    // Inside an object-literal method, TypeScript infers `this` as the object
    console.log(`Hello, I'm ${this.name}`);
  },
};

user.greet(); // ✅ "Hello, I'm Alice" — this = user
```

**Multiple Levels:**
```typescript
const company = {
  name: 'TechCorp',
  department: {
    name: 'Engineering',
    show: function (): void {
      console.log(this.name);
    },
  },
};

company.department.show(); // "Engineering"
// `this` is whatever sits immediately before the dot — department, not company
```

**⚠️ Losing Implicit Binding:**

This is a **major source of bugs** in JavaScript:

**Problem 1: Extracting Methods**
```typescript
const user = {
  name: 'Alice',
  greet: function (): void {
    console.log(`Hello, I'm ${this.name}`);
  },
};

const greet = user.greet; // Extracting the method drops the object
greet(); // ❌ "Hello, I'm undefined" — a plain call, so no implicit binding
```

**Problem 2: Callback Functions**
```typescript
const user = {
  name: 'Alice',
  greet: function (): void {
    console.log(`Hello, I'm ${this.name}`);
  },
};

// Passing the function passes only the function. The dot is not carried with it
setTimeout(user.greet, 1000); // ❌ "Hello, I'm undefined"
```

**Problem 3: Event Handlers**
```typescript
button.addEventListener('click', user.greet);
// ❌ addEventListener calls the handler with `this` set to the element
```

**Solutions:**

**Solution 1: Arrow Function Wrapper**
```typescript
// ✅ The arrow defers the call, so the dot is still there when it happens
setTimeout((): void => user.greet(), 1000);
```

**Solution 2: bind()**
```typescript
// ✅ bind returns a new function with `this` fixed. It cannot be re-bound
setTimeout(user.greet.bind(user), 1000);
```

**Solution 3: Arrow Function Method (ES6)**
<!-- lint-allow-fence: javascript — an arrow used as an object-literal method takes `this` from the enclosing module, which TypeScript flags under `noImplicitThis` — the failure is the point -->
```javascript
const user = {
    name: 'Alice',
    greet: () => {
        console.log(`Hello, I'm ${this.name}`);
    }
};
// ⚠️ But this creates different problems - arrow inherits outer this!
```

**When Binding Is Lost:**

| Scenario | Binding Lost? | Fix |
|----------|--------------|-----|
| `obj.method()` | ❌ No | - |
| `const fn = obj.method` | ✅ Yes | Use `.bind()` |
| `setTimeout(obj.method, 1000)` | ✅ Yes | Wrapper or `.bind()` |
| `element.addEventListener('click', obj.method)` | ✅ Yes | `.bind()` or arrow |
| `array.map(obj.method)` | ✅ Yes | Wrapper or `.bind()` |

**Key Insight:**
> Implicit binding only works when the function is called **as a method** with the dot notation. Extracting or passing the method breaks this binding.

**Method Invocation** - Demonstrates implicit 'this' binding where 'this' refers to the object the method is called on, and how this binding can be lost.

```typescript
const user = {
  name: 'Alice',
  greet: function (): void {
    console.log(`Hello, I'm ${this.name}`);
  },
};

user.greet(); // "Hello, I'm Alice" — this = user

// The binding lives at the call site, not on the function
const greetFunc = user.greet;
greetFunc(); // "Hello, I'm undefined"
```

**Nested Objects**

**'this' in Nested Objects** - Shows that 'this' only refers to the immediate parent object, not ancestors in the chain.

```typescript
const company = {
  name: 'TechCorp',
  department: {
    name: 'Engineering',
    show: function (): void {
      console.log(this.name); // Only the immediate parent
    },
  },
};

company.department.show(); // "Engineering", not "TechCorp"
```

### 4. Explicit Binding

**Explicit Binding** gives you direct control over `this` using call(), apply(), or bind(). These methods override implicit and default binding, letting you call a function with any object as `this`. call() and apply() invoke the function immediately with a specified `this` and arguments (call takes individual args, apply takes an array). bind() creates a new function with `this` permanently bound - it doesn't execute immediately but returns a new function that will always use your specified `this`. These methods are essential for borrowing methods, setting callback context, and partial application. Understanding explicit binding is crucial for advanced JavaScript patterns.

**call()**

**call() Method** - Explicitly sets 'this' value and passes arguments individually, allowing functions to borrow methods from other objects.

```typescript
interface Named {
  name: string;
}

// The `this` parameter comes first and is not a real argument — it tells
// TypeScript what `call`, `apply` and `bind` are allowed to pass
function greet(this: Named, greeting: string, punctuation: string): void {
  console.log(`${greeting}, I'm ${this.name}${punctuation}`);
}

const user: Named = { name: 'Alice' };

greet.call(user, 'Hello', '!'); // "Hello, I'm Alice!"
// First argument is the `this` value; the rest are the real arguments
```

**apply()**

**apply() Method** - Similar to call() but accepts arguments as an array, useful when argument count varies or comes from array source.

```typescript
function greet(this: Named, greeting: string, punctuation: string): void {
  console.log(`${greeting}, I'm ${this.name}${punctuation}`);
}

const user: Named = { name: 'Bob' };

// apply is call with the arguments in an array. That is the only difference
greet.apply(user, ['Hi', '.']); // "Hi, I'm Bob."
```

**bind()**

**bind() Method** - Creates a new function with permanently bound 'this' value, essential for event handlers and callbacks where context must be preserved.

```typescript
function greet(this: Named, greeting: string): void {
  console.log(`${greeting}, I'm ${this.name}`);
}

const user: Named = { name: 'Charlie' };

// bind returns a new function; it does not call the original
const boundGreet: () => void = greet.bind(user, 'Hey');

boundGreet(); // "Hey, I'm Charlie"

// The common use: event handlers
const button = {
  text: 'Click me',
  click: function (): void {
    console.log(`Button text: ${this.text}`);
  },
};

// ❌ document.addEventListener('click', button.click) — `this` becomes the element
// ✅ bind first
document.addEventListener('click', button.click.bind(button));
```

### 5. new Binding

When function is called with `new`, a new object is created and `this` refers to it.

**Constructor Function 'this'** - Shows how 'new' operator creates a new object, sets 'this' to it, and returns the object automatically.

<!-- lint-allow-fence: javascript — a constructor function assigning to `this` before `new` is applied has no TypeScript equivalent; `class` is the equivalent, and using it would remove the mechanism the fence explains -->
```javascript
function User(name, age) {
    this.name = name;
    this.age = age;
    this.greet = function() {
        console.log(`I'm ${this.name}, ${this.age} years old`);
    };
}

const alice = new User('Alice', 25);
alice.greet(); // "I'm Alice, 25 years old"

// What 'new' does:
// 1. Creates empty object
// 2. Sets prototype
// 3. Binds 'this' to new object
// 4. Returns the object (unless function returns object explicitly)
```

### 6. Arrow Functions and 'this'

Arrow functions DON'T have their own `this` - they inherit from enclosing scope (lexical `this`).

**Lexical 'this' in Arrow Functions** - Arrow functions inherit 'this' from their enclosing scope, solving callback context issues but making them unsuitable as methods.

<!-- lint-allow-fence: javascript — the ❌ half relies on `this` being undefined inside a `function` callback passed to forEach — `this` here is bound dynamically at the call site; TypeScript either rejects it or annotates the surprise away, and the surprise is the lesson -->
```javascript
const user = {
    name: 'Alice',
    hobbies: ['reading', 'coding'],

    // Regular function
    showHobbiesRegular: function() {
        this.hobbies.forEach(function(hobby) {
            // 'this' is undefined (or window)
            console.log(`${this.name} likes ${hobby}`);
        });
    },

    // Arrow function
    showHobbiesArrow: function() {
        this.hobbies.forEach(hobby => {
            // 'this' inherited from showHobbiesArrow
            console.log(`${this.name} likes ${hobby}`);
        });
    }
};

// user.showHobbiesRegular(); // Error
user.showHobbiesArrow();
// Alice likes reading
// Alice likes coding
```

**Arrow Functions Can't Be Bound**

**Arrow Functions Ignore Binding** - Demonstrates that call, apply, and bind have no effect on arrow functions since they don't have their own 'this'.

<!-- lint-allow-fence: javascript — showing that `call` cannot rebind an arrow requires an arrow whose `this` is the module scope, which TypeScript rejects under `noImplicitThis` -->
```javascript
const user = { name: 'Alice' };

const greet = () => {
    console.log(`Hello, ${this.name}`);
};

// call, apply, bind have NO effect on arrow functions
greet.call(user); // "Hello, undefined" (this from outer scope)
```

**When NOT to Use Arrow Functions**

**Arrow Functions as Methods Antipattern** - Shows why arrow functions fail as object methods - they don't bind 'this' to the object.

<!-- lint-allow-fence: javascript — an arrow as an object-literal method is the mistake; TypeScript flags it rather than letting it return undefined at runtime -->
```javascript
const obj = {
    value: 42,

    // Wrong: arrow function as method
    getValue: () => {
        return this.value; // 'this' is NOT obj
    },

    // Correct: regular function
    getValueCorrect: function() {
        return this.value;
    }
};

console.log(obj.getValue()); // undefined
console.log(obj.getValueCorrect()); // 42
```

## 🎯 Common Interview Questions

### Q1: What will this code output?

**Lost Context Problem** - Classic interview question showing how method references lose their 'this' binding when extracted from objects.

```typescript
const obj = {
  name: 'Object',
  getName: function (): string {
    return this.name;
  },
};

const getName = obj.getName;
console.log(getName()); // ?
```

**Answer:** `undefined` (or error in strict mode)
**Reason:** Lost implicit binding. `getName` is called standalone, so `this` is global/undefined.

**Fix:**

**Fixing Lost Context** - Two solutions to restore 'this' binding: using bind() or calling the method directly on the object.

```typescript
const getName: () => string = obj.getName.bind(obj);
console.log(getName()); // "Object"

// Or simply keep the dot
console.log(obj.getName()); // "Object"
```

### Q2: Fix this code

**Timer Context Problem** - Shows a common bug where callback functions lose 'this' context in setTimeout/setInterval.

<!-- lint-allow-fence: javascript — the broken version needs `this` inside a `function` callback to be the timer's caller rather than the object — `this` here is bound dynamically at the call site; TypeScript either rejects it or annotates the surprise away, and the surprise is the lesson -->
```javascript
const timer = {
    seconds: 0,
    start: function() {
        setInterval(function() {
            this.seconds++;
            console.log(this.seconds);
        }, 1000);
    }
};

timer.start(); // NaN, NaN, NaN... (this.seconds is undefined)
```

**Solution 1: Arrow Function**

**Arrow Function Solution** - Uses arrow function's lexical 'this' to maintain context inside callbacks.

```typescript
const timer = {
  seconds: 0,
  start: function (): void {
    // ✅ The arrow has no `this` of its own, so it keeps start()'s
    setInterval((): void => {
      this.seconds++;
      console.log(this.seconds);
    }, 1000);
  },
};
```

**Solution 2: bind()**

**bind() Solution** - Explicitly binds 'this' to the callback function for consistent context.

```typescript
const timer = {
  seconds: 0,
  start: function (): void {
    // ✅ bind, for when you need a real function rather than an arrow
    setInterval(
      function (this: typeof timer): void {
        this.seconds++;
        console.log(this.seconds);
      }.bind(this),
      1000,
    );
  },
};
```

**Solution 3: Store 'this'**

**Storing 'this' Reference** - Old-school pattern of storing 'this' in a variable (self/that) to access in callbacks, still seen in legacy code.

```typescript
const timer = {
  seconds: 0,
  start: function (): void {
    // ✅ The pre-arrow idiom. Still readable, and it survives minification
    const self = this;
    setInterval(function (): void {
      self.seconds++;
      console.log(self.seconds);
    }, 1000);
  },
};
```

### Q3: Predict the output

**Arrow Function Method Problem** - Quiz showing why arrow functions as object methods don't work - they don't bind 'this' to the object.

<!-- lint-allow-fence: javascript — a quiz fence whose answer is that the arrow's `this` is not the object; TypeScript answers it at compile time and spoils the question -->
```javascript
const person = {
    name: 'Alice',
    greet: () => {
        console.log(`Hello, ${this.name}`);
    }
};

person.greet(); // ?
```

**Answer:** `"Hello, undefined"`
**Reason:** Arrow function doesn't bind `this` to the object. It uses `this` from outer scope (global).

## 💡 Practical Examples

### Example 1: Event Handler

**Class Event Handlers** - Shows proper way to handle 'this' in DOM event handlers using arrow function class properties or bind().

```typescript
class Button {
  private text: string;
  private clickCount: number;

  constructor(text: string) {
    this.text = text;
    this.clickCount = 0;
  }

  // ❌ A prototype method. Detaching it loses the instance
  handleClickWrong(): void {
    this.clickCount++;
    console.log(`${this.text} clicked ${this.clickCount} times`);
  }

  // ✅ A class field holding an arrow. Created per instance, bound on creation,
  // so it can be passed anywhere. The cost is one closure per instance
  handleClick = (): void => {
    this.clickCount++;
    console.log(`${this.text} clicked ${this.clickCount} times`);
  };
}

const btn = new Button('Submit');

const domButton = document.querySelector<HTMLButtonElement>('#myButton');
// ❌ domButton?.addEventListener('click', btn.handleClickWrong);
domButton?.addEventListener('click', btn.handleClick);
// ✅ Or bind explicitly: btn.handleClickWrong.bind(btn)
```

### Example 2: Method Borrowing

**Borrowing Methods with call()** - Demonstrates using call() to borrow methods from other objects and work with array-like objects.

```typescript
const person1 = {
  name: 'Alice',
  greet: function (this: Named): void {
    console.log(`Hello, I'm ${this.name}`);
  },
};

const person2: Named = { name: 'Bob' };

// Borrowing: person2 never had a greet method
person1.greet.call(person2); // "Hello, I'm Bob"

// The classic case — an array-like object with no array methods
const arrayLike: ArrayLike<string> = { 0: 'a', 1: 'b', 2: 'c', length: 3 };

const arr: string[] = Array.prototype.slice.call(arrayLike) as string[];
console.log(arr); // ['a', 'b', 'c']

// Since ES2015 there is no need to borrow
const arr2: string[] = Array.from(arrayLike);
```

### Example 3: Function Currying with bind

**Partial Application with bind** - Uses bind to create specialized functions by pre-filling arguments, useful for logging and utilities.

```typescript
function multiply(a: number, b: number): number {
  return a * b;
}

// `null` for `this` because the function never uses it — bind is being used
// purely to fix the first argument
const double: (b: number) => number = multiply.bind(null, 2);
const triple: (b: number) => number = multiply.bind(null, 3);

console.log(double(5)); // 10
console.log(triple(5)); // 15

// The version you actually write
type Level = 'ERROR' | 'WARN' | 'INFO';

function log(level: Level, message: string): void {
  console.log(`[${level}] ${message}`);
}

const logError: (message: string) => void = log.bind(null, 'ERROR');
const logInfo: (message: string) => void = log.bind(null, 'INFO');

logError('Something went wrong'); // [ERROR] Something went wrong
logInfo('App started'); // [INFO] App started
```

## 🚨 Common Pitfalls

### 1. Callback Functions

**Callback 'this' Problem** - Shows multiple solutions for maintaining 'this' context in array method callbacks like forEach.

<!-- lint-allow-fence: javascript — the two fixes are shown as bare `printFriends: function() {…}` fragments outside any object, so the fence is illustrative rather than runnable in either language -->
```javascript
const user = {
    name: 'Alice',
    friends: ['Bob', 'Charlie'],

    printFriends: function() {
        // Wrong
        this.friends.forEach(function(friend) {
            console.log(`${this.name} is friends with ${friend}`);
            // TypeError: Cannot read 'name' of undefined
        });
    }
};

// Solutions:
// 1. Arrow function
printFriends: function() {
    this.friends.forEach(friend => {
        console.log(`${this.name} is friends with ${friend}`);
    });
}

// 2. forEach second parameter
printFriends: function() {
    this.friends.forEach(function(friend) {
        console.log(`${this.name} is friends with ${friend}`);
    }, this); // Pass 'this' as second argument
}
```

### 2. Constructor Functions Without 'new'

**Missing 'new' Operator** - Demonstrates the danger of calling constructor functions without 'new', polluting global scope, and defensive solution.

<!-- lint-allow-fence: javascript — forgetting `new` on a constructor function is the mistake; TypeScript will not compile the constructor function in the first place -->
```javascript
function User(name) {
    this.name = name;
}

const user1 = new User('Alice'); // Correct
console.log(user1.name); // "Alice"

const user2 = User('Bob'); // Forgot 'new'!
console.log(user2); // undefined
console.log(window.name); // "Bob" (polluted global!)

// Solution: Use class or check
function UserSafe(name) {
    if (!(this instanceof UserSafe)) {
        return new UserSafe(name);
    }
    this.name = name;
}

const user3 = UserSafe('Charlie'); // Works without 'new'
```

### 3. Method Extraction

**Method Reference Problem** - Shows how extracting methods from objects loses 'this' binding and how to fix with bind().

```typescript
const calculator = {
  value: 0,
  add: function (n: number): typeof calculator {
    this.value += n;
    return this; // Returning `this` is what makes chaining work
  },
};

const add = calculator.add;
add(5); // ❌ Detached — `this` is no longer the calculator

// ✅ Bind, or keep the dot
const addBound = calculator.add.bind(calculator);
addBound(5);
console.log(calculator.value); // 5
```

## 🎓 Best Practices

1. **Use arrow functions for callbacks** (preserves `this`)
2. **Use regular functions for methods** (needs `this` binding)
3. **Use `bind` for event handlers** (or class properties with arrow functions)
4. **Be careful with method extraction** (use `bind` or keep context)
5. **Use strict mode** (catches `this` mistakes early)
6. **In classes, use arrow functions for event handlers**

## 📊 Quick Reference Chart

| Call Type | this Value |
|-----------|------------|
| `func()` | global / undefined (strict) |
| `obj.method()` | obj |
| `func.call(obj)` | obj |
| `func.apply(obj)` | obj |
| `func.bind(obj)()` | obj |
| `new Func()` | new object |
| `() => {}` | lexical (outer scope) |

## 🔗 Related Topics

- [Functions & Scope](./02-functions-scope.md)
- [Closures](./03-closures.md)
- [Prototypes & Inheritance](./05-prototypes-inheritance.md)

---

[← Back to JavaScript](./README.md) | [Next: Prototypes →](./05-prototypes-inheritance.md)
