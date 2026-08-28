---
title: Functions and Scope
part: 1
chapter: 0
slug: functions-scope
level: intermediate # beginner | intermediate | advanced
reading_time: 25
updated: 2026-08-28
tags: [frontend, javascript, functions, scope]
in_book: true
---

# Functions and Scope {#ch-functions-and-scope}

> Know where every variable lives, how long it lives, and which of the three declaration forms to reach for.

**In this chapter:** declarations vs expressions · arrow functions and what they lack · block vs function scope · hoisting and the temporal dead zone · default and rest parameters

## Why Functions and Scope Matter

**For Interviews:**
- Function behavior questions appear in 80%+ of JavaScript interviews
- Scope and hoisting are classic "gotcha" questions
- Understanding the call stack is essential for debugging
- Closure concepts build directly on scope understanding

**For Real-World Development:**
- Proper scoping prevents variable collisions and bugs
- Function patterns enable code reusability and modularity
- Understanding execution context is crucial for debugging
- Scope knowledge is foundational for frameworks like React

## 📚 Core Concepts

### 1. Function Declarations vs Expressions

**Function Declaration**

### 💡 **Hoisted Function Declaration**

Function declarations are the traditional way to define functions in JavaScript.

**Key Characteristics:**
- **Hoisting**: Both name AND implementation are hoisted to the top
- **Availability**: Can be called before the declaration appears in code
- **Naming**: Always creates a named function
- **Scope**: Function added to current scope

**When to Use:**
- ✅ Functions needed throughout a module
- ✅ Recursive functions (needs to reference itself)
- ✅ Top-level, reusable utilities
- ✅ When you prefer organizing code with main logic first, helpers below

**Pros:**
- Can organize code logically (call function, then define it below)
- Clear function name in stack traces
- Self-referencing for recursion

**Cons:**
- Hoisting can be confusing for some developers
- Less flexible than expressions

```typescript
// Hoisted to the top of the scope
function greet(name: string): string {
  return `Hello, ${name}!`;
}

console.log(greet('Alice')); // "Hello, Alice!"
```

**Function Expression**

**Non-Hoisted Function Expression** - Function expressions are not hoisted and must be defined before use, assigned to variables like any other value.

```typescript
// Not hoisted — the binding exists only from this line down
const greet = function (name: string): string {
  return `Hello, ${name}!`;
};

console.log(greet('Bob')); // "Hello, Bob!"
```

**Named Function Expression**

**Self-Referencing Function** - Named function expressions allow the function to reference itself by name, useful for recursion while keeping the name scoped internally.

```typescript
// The inner name `fact` is visible only inside the function body
const factorial = function fact(n: number): number {
  if (n <= 1) return 1;
  return n * fact(n - 1);
};

console.log(factorial(5)); // 120
```

### 2. Arrow Functions

**Basic Syntax**

### 💡 **Arrow Function Syntax Variants**

Arrow functions (ES6) provide concise syntax, especially useful for short functions and callbacks.

**Syntax Variations:**

```text
// 0 parameters
() => expression

// 1 parameter (parentheses optional)
param => expression
(param) => expression

// 2+ parameters (parentheses required)
(a, b) => expression

// Single expression (implicit return)
x => x * 2

// Multiple statements (explicit return needed)
x => {
    const result = x * 2;
    return result;
}

// Return object (wrap in parentheses)
() => ({ key: 'value' })
```

**When to Use Arrow Functions:**
- ✅ **Callbacks**: Array methods (map, filter, reduce)
- ✅ **Short functions**: 1-2 lines of logic
- ✅ **Preserving `this`**: Callbacks that need outer context
- ✅ **Inline functions**: Event handlers, promise chains

**When NOT to Use:**
- ❌ **Object methods**: Need their own `this` binding
- ❌ **Constructors**: Can't use `new` with arrows
- ❌ **Complex logic**: Readability suffers without function name
- ❌ **Need `arguments` object**: Use rest parameters instead

**Readability Trade-off:**
> Conciseness is great for simple operations, but use regular functions for non-trivial logic or when you need clear function names in stack traces.

```typescript
interface User {
  name: string;
}

// Traditional function
const add = function (a: number, b: number): number {
  return a + b;
};

// Arrow function
const addArrow = (a: number, b: number): number => a + b;

// Single parameter — TypeScript needs the parentheses to hold the annotation
const double = (n: number): number => n * 2;

// No parameters
const getRandom = (): number => Math.random();

// Multiple statements need braces and an explicit return
const processUser = (user: User): string => {
  const name: string = user.name.toUpperCase();
  return `User: ${name}`;
};
```

**Key Differences from Regular Functions**

### 💡 **Arrow Function Limitations**

Arrow functions sacrifice flexibility for conciseness. Here's what they **don't** have:

**1. No Own `this` Binding:**
- **Behavior**: Inherits `this` lexically from surrounding scope
- **Perfect for**: Callbacks (no need for `.bind(this)`)
- **Bad for**: Object methods (can't bind to the object)

**2. Cannot Be Constructors:**
- **Behavior**: Lack `[[Construct]]` internal method
- **Result**: `new ArrowFunc()` throws TypeError
- **Use Instead**: Regular functions or ES6 classes

**3. No `arguments` Object:**
- **Behavior**: No automatic `arguments` array-like object
- **Solution**: Use rest parameters `(...args)` instead
- **Example**: `const sum = (...args) => args.reduce((a, b) => a + b, 0)`

**4. No `prototype` Property:**
- **Behavior**: Arrow functions don't have `.prototype`
- **Impact**: Can't be used as base for inheritance

**5. Cannot Be Generators:**
- **Behavior**: Can't use `function*` syntax with arrows
- **Use Instead**: Regular generator functions

**Decision Guide:**

| Use Case | Function Type |
|----------|---------------|
| Callbacks, array methods | Arrow ✅ |
| Short utilities (1-2 lines) | Arrow ✅ |
| Preserve outer `this` | Arrow ✅ |
| Object methods | Regular ✅ |
| Constructors | Regular ✅ |
| Need `arguments` | Regular ✅ |
| Generators | Regular ✅ |

<!-- lint-allow-fence: javascript — the point is that arrows have no own `this` and no `arguments`; TypeScript rejects `this.value` in an object-literal arrow and `arguments` in an arrow, so the errors would replace the lesson -->
```javascript
// 1. No 'this' binding
const obj = {
    value: 42,
    regular: function() {
        console.log(this.value); // 42
    },
    arrow: () => {
        console.log(this.value); // undefined (inherits this from outer scope)
    }
};

// 2. Cannot be used as constructors
const Person = (name) => {
    this.name = name;
};
// new Person('Alice'); // TypeError: Person is not a constructor

// 3. No arguments object
function regularFunc() {
    console.log(arguments); // [1, 2, 3]
}
regularFunc(1, 2, 3);

const arrowFunc = () => {
    console.log(arguments); // ReferenceError
};
// arrowFunc(1, 2, 3);

// Use rest parameters instead
const arrowWithRest = (...args) => {
    console.log(args); // [1, 2, 3]
};
arrowWithRest(1, 2, 3);
```

### 3. Scope in JavaScript

**Global Scope**

**Global Variables** - Variables declared outside any function are globally scoped and accessible everywhere in the code.

```typescript
// Accessible everywhere in this module
var globalVar: string = 'I am global';
let globalLet: string = 'Also global';
const globalConst: string = 'Global constant';

function showGlobal(): void {
  console.log(globalVar); // Accessible
}
```

**Function Scope**

**Function-Scoped Variables** - Variables declared with var are scoped to their containing function, accessible throughout the entire function regardless of block.

```typescript
function outer(): void {
  var functionScoped: string = 'Only in function';

  if (true) {
    var stillFunctionScoped: string = 'Still accessible';
  }

  console.log(stillFunctionScoped); // Works — var is function-scoped
}

// console.log(functionScoped); // Error — not in scope here
```

**Block Scope (let & const)**

### 💡 **Block-Scoped Variables**

Block scoping (enabled by `let` and `const`) treats any curly braces `{ }` as a scope boundary.

**What Counts as a Block:**
- `if`, `else` statements
- `for`, `while`, `do-while` loops
- `switch` cases
- Standalone blocks `{ /* code */ }`
- Function bodies

**Key Benefits:**

**1. Prevents Variable Leaking:**
```typescript
if (true) {
  let x: number = 10;
  const y: number = 20;
}
console.log(x); // ❌ Error — `x` does not leak out of the block
```

**2. Loop Variables - The Classic Example:**

**With `var` (Broken):**
```typescript
for (var i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// Output: 3, 3, 3 ❌
// All three closures capture the same `i`, and read it after the loop ends
```

**With `let` (Fixed):**
```typescript
for (let i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// Output: 0, 1, 2 ✅
// `let` creates a fresh binding per iteration
```

**Why This Happens:**
- `var`: Function-scoped → only ONE `i` variable
- `let`: Block-scoped → NEW `i` for each iteration

**3. More Intuitive Scoping:**

Makes JavaScript's scoping model similar to other languages (Java, C, C++):
- Variables only exist where they're declared
- No unexpected hoisting confusion
- Easier to reason about variable lifetime

**Comparison:**

| Feature | var | let/const |
|---------|-----|-----------|
| **Scope** | Function | Block |
| **Leaking** | ✅ Leaks out of blocks | ❌ Contained |
| **Loop closures** | ❌ Broken | ✅ Works correctly |
| **Intuitive** | ❌ Confusing | ✅ Predictable |

```typescript
{
  let blockScoped: string = 'In block';
  const alsoBlockScoped: string = 'Also in block';
  var notBlockScoped: string = 'Function scoped';
}

// console.log(blockScoped); // Error
// console.log(alsoBlockScoped); // Error
console.log(notBlockScoped); // Works — var ignores the block

// Where it bites: loops
for (let i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// Prints: 0, 1, 2 — each closure has its own `i`

for (var j = 0; j < 3; j++) {
  setTimeout((): void => console.log(j), 100);
}
// Prints: 3, 3, 3 — all three share one `j`
```

**Lexical Scope**

**Scope Chain** - Inner functions can access variables from outer functions through lexical scoping, but not vice versa.

```typescript
function outer(): void {
  const outerVar: string = 'outer';

  function inner(): void {
    const innerVar: string = 'inner';
    console.log(outerVar); // Reaches out to the parent scope
    console.log(innerVar); // Its own
  }

  inner();
  // console.log(innerVar); // Error — scope only looks outward, never inward
}

outer();
```

### 4. Hoisting

**Function Hoisting**

**Function vs Expression Hoisting** - Function declarations are fully hoisted and can be called before definition, unlike function expressions which behave like variables.

```typescript
// Function declarations are hoisted, body and all
greet('Alice'); // Works — "Hello, Alice!"

function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Function expressions are not
// sayHi('Bob'); // Error — used before assignment

const sayHi = function (name: string): string {
  return `Hi, ${name}!`;
};
```

**Variable Hoisting**

**Temporal Dead Zone** - var declarations are hoisted but initialized as undefined, while let/const are hoisted but remain in temporal dead zone until declaration.

```typescript
console.log(x); // undefined — the declaration hoists, the assignment does not
var x: number = 5;

// Equivalent to:
// var x;
// console.log(x);
// x = 5;

// let and const hoist too, but into the temporal dead zone
// console.log(y); // Error
let y: number = 10;

// console.log(z); // Error
const z: number = 15;
```

### 5. Default Parameters

**Default Parameter Values** - ES6 allows setting default values for function parameters, including expressions and references to previous parameters.

```typescript
// A default makes the parameter optional; the type is inferred from it
function greet(name = 'Guest', greeting = 'Hello'): string {
  return `${greeting}, ${name}!`;
}

console.log(greet()); // "Hello, Guest!"
console.log(greet('Alice')); // "Hello, Alice!"
console.log(greet('Bob', 'Hi')); // "Hi, Bob!"

// Defaults are expressions, evaluated on every call
function createUser(name: string, id: number = Date.now()): { name: string; id: number } {
  return { name, id };
}

// A default can read parameters declared before it, but not after
function greetWithTime(name: string, greeting: string = `Hello ${name}`): string {
  return greeting;
}
```

### 6. Rest Parameters

**Rest Parameters** - Collects multiple arguments into an array using the spread operator, replacing the need for the arguments object.

```typescript
// A rest parameter is typed as an array
function sum(...numbers: number[]): number {
  return numbers.reduce((total: number, num: number): number => total + num, 0);
}

console.log(sum(1, 2, 3)); // 6
console.log(sum(1, 2, 3, 4, 5)); // 15

// Rest must be last — anything after it could never be filled
function logInfo(action: string, ...details: string[]): void {
  console.log(`Action: ${action}`);
  console.log('Details:', details);
}

logInfo('update', 'user', 'profile', 'email');
// Action: update
// Details: ['user', 'profile', 'email']
```

## 🎯 Common Interview Questions

### Q1: What's the difference between function declaration and expression?

**Answer:**

**Declaration vs Expression Comparison** - Shows the key difference in hoisting behavior between function declarations and expressions.

```typescript
// Function declaration — hoisted, callable before its definition
sayHello(); // Works

function sayHello(): void {
  console.log('Hello!');
}

// Function expression — not hoisted, must be defined before use
// sayGoodbye(); // Error

const sayGoodbye = function (): void {
  console.log('Goodbye!');
};
```

### Q2: Explain scope chain

**Answer:**

**Scope Chain Demonstration** - Illustrates how JavaScript searches for variables through nested scopes from inner to outer until found or reaching global scope.

```typescript
const outermost: string = 'global';

function outer(): void {
  const outerVar: string = 'outer';

  function middle(): void {
    const middleVar: string = 'middle';

    function inner(): void {
      const innerVar: string = 'inner';

      // Scope chain: inner → middle → outer → module
      console.log(innerVar); // 'inner' (own scope)
      console.log(middleVar); // 'middle' (parent)
      console.log(outerVar); // 'outer' (grandparent)
      console.log(outermost); // 'global' (module scope)
    }

    inner();
  }

  middle();
}

outer();
```

### Q3: What is the temporal dead zone?

**Answer:**

**Temporal Dead Zone Example** - Shows the period between entering scope and variable initialization where let/const variables exist but cannot be accessed.

```typescript
// Temporal dead zone — the gap between entering a scope and initialising

{
  // TDZ starts here
  // console.log(x); // Error — cannot access before initialisation
  // console.log(y); // Error

  let x: number = 5; // TDZ ends for x
  const y: number = 10; // TDZ ends for y

  console.log(x); // 5
  console.log(y); // 10
}

// var has no TDZ — it is initialised to undefined on entry
{
  console.log(z); // undefined, not an error
  var z: number = 15;
}
```

## 💡 Practical Examples

### Example 1: Counter with Private Variable

**Private Variables with Closures** - Uses function scope to create truly private variables that can only be accessed through returned methods, demonstrating encapsulation.

```typescript
interface Counter {
  increment(): number;
  decrement(): number;
  getCount(): number;
}

function createCounter(): Counter {
  let count: number = 0; // Private — nothing outside can reach it

  return {
    increment: (): number => ++count,
    decrement: (): number => --count,
    getCount: (): number => count,
  };
}

const counter: Counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount()); // 1
// counter.count — not on the type, and not on the object either
```

### Example 2: Function Factory

**Function Factory Pattern** - Creates specialized functions by capturing parameters in closure, enabling function customization and reusability.

```typescript
function createMultiplier(multiplier: number): (n: number) => number {
  return function (n: number): number {
    return n * multiplier;
  };
}

const double: (n: number) => number = createMultiplier(2);
const triple: (n: number) => number = createMultiplier(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

### Example 3: Callback with Correct Scope

**Arrow Functions Preserve 'this'** - Demonstrates how arrow functions inherit 'this' from their enclosing scope, solving common callback context issues.

<!-- lint-allow-fence: javascript — the wrong half of this ❌/✅ pair relies on `this` being undefined inside a `function` callback — TypeScript's `noImplicitThis` flags it, which is the behaviour the fence exists to demonstrate -->
```javascript
const user = {
    name: 'Alice',
    hobbies: ['reading', 'coding', 'gaming'],

    // Using arrow function to preserve 'this'
    printHobbies() {
        this.hobbies.forEach(hobby => {
            console.log(`${this.name} likes ${hobby}`);
        });
    },

    // Wrong way (regular function)
    printHobbiesWrong() {
        this.hobbies.forEach(function(hobby) {
            // this is undefined or window
            console.log(`${this.name} likes ${hobby}`);
        });
    }
};

user.printHobbies();
// Alice likes reading
// Alice likes coding
// Alice likes gaming
```

## 🚨 Common Pitfalls

### 1. Variable Leaking to Global Scope

**Implicit Global Variables** - Shows how forgetting var/let/const accidentally creates global variables, polluting the global namespace.

<!-- lint-allow-fence: javascript — the mistake is an undeclared assignment creating an implicit global; TypeScript refuses to compile it, so the fence has to stay untyped to show it -->
```javascript
function createUser() {
    // Missing var/let/const - creates global variable!
    userName = 'Alice';
}

createUser();
console.log(userName); // 'Alice' (global pollution)

// Solution: Always use let/const
function createUserCorrect() {
    const userName = 'Alice'; // Properly scoped
}
```

### 2. Loop Closure Issue

**Classic var Loop Bug** - Illustrates the famous closure-in-loop problem with var and two solutions: let for block scope or IIFE to create new scope.

```typescript
type Logger = () => void;

// ❌ Problem — one `i`, captured three times
const funcs: Logger[] = [];
for (var i = 0; i < 3; i++) {
  funcs.push(function (): void {
    console.log(i);
  });
}

funcs[0](); // 3, not 0
funcs[1](); // 3, not 1
funcs[2](); // 3, not 2

// ✅ Solution 1 — `let` scopes `i` to the iteration
const funcsFixed: Logger[] = [];
for (let i = 0; i < 3; i++) {
  funcsFixed.push(function (): void {
    console.log(i);
  });
}

funcsFixed[0](); // 0
funcsFixed[1](); // 1
funcsFixed[2](); // 2

// ✅ Solution 2 — an IIFE copies the value into a new scope. This is what
// everyone did before `let` existed
const funcsIIFE: Logger[] = [];
for (var j = 0; j < 3; j++) {
  funcsIIFE.push(
    (function (index: number): Logger {
      return function (): void {
        console.log(index);
      };
    })(j),
  );
}
```

### 3. Arrow Function 'this' Gotcha

**Arrow Functions as Methods** - Shows why arrow functions shouldn't be used as object methods since they don't bind their own 'this' context.

<!-- lint-allow-fence: javascript — an object-literal arrow reading `this.text` is the mistake being shown; TypeScript types that `this` as the module scope and errors, hiding the runtime behaviour -->
```javascript
const button = {
    text: 'Click me',

    // Wrong: arrow function doesn't bind 'this'
    clickArrow: () => {
        console.log(this.text); // undefined
    },

    // Correct: regular function
    clickRegular: function() {
        console.log(this.text); // 'Click me'
    }
};
```

## 🎓 Best Practices

1. **Use `const` by default, `let` when needed, avoid `var`**
2. **Prefer arrow functions for callbacks** (unless you need `this` binding)
3. **Use meaningful function names** (even for expressions)
4. **Keep functions small and focused** (single responsibility)
5. **Avoid global variables** (use modules or IIFE)
6. **Use default parameters** instead of manual checks

## 🔗 Related Topics

- [Closures](./03-closures.md)
- [This Keyword](./04-this-keyword.md)
- [ES6+ Features](./08-es6-features.md)

---

[← Back to JavaScript](./README.md) | [Next: Closures →](./03-closures.md)
