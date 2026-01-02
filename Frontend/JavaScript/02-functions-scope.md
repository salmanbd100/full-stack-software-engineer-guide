# Functions & Scope

Understanding functions and scope is fundamental to JavaScript mastery. Functions are first-class citizens in JavaScript - they can be assigned to variables, passed as arguments, returned from other functions, and have properties and methods. Scope determines variable accessibility and lifetime, forming the foundation for closures, modules, and encapsulation.

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

**Hoisted Function Declaration** - Function declarations are the traditional way to define functions in JavaScript, featuring complete hoisting - both the name and implementation are hoisted to the top of their scope. This means you can call a function before it appears in the code, which some consider helpful for organizing code (putting main logic at top, helper functions below) while others view as confusing. Function declarations create named functions in the current scope, making them suitable for functions that need to be available throughout a module or need to call themselves recursively.

```javascript
// Hoisted to top of scope
function greet(name) {
    return `Hello, ${name}!`;
}

console.log(greet('Alice')); // "Hello, Alice!"
```

**Function Expression**

**Non-Hoisted Function Expression** - Function expressions are not hoisted and must be defined before use, assigned to variables like any other value.

```javascript
// Not hoisted, assigned to variable
const greet = function(name) {
    return `Hello, ${name}!`;
};

console.log(greet('Bob')); // "Hello, Bob!"
```

**Named Function Expression**

**Self-Referencing Function** - Named function expressions allow the function to reference itself by name, useful for recursion while keeping the name scoped internally.

```javascript
const factorial = function fact(n) {
    if (n <= 1) return 1;
    return n * fact(n - 1); // Can call itself by name
};

console.log(factorial(5)); // 120
```

### 2. Arrow Functions

**Basic Syntax**

**Arrow Function Syntax Variants** - Arrow functions, introduced in ES6, provide concise syntax especially useful for short functions and callbacks. Single-expression arrows implicitly return the expression result (no `return` keyword needed), while multi-statement bodies require explicit return. Single parameters don't need parentheses. The conciseness makes arrow functions ideal for array methods like map, filter, and reduce. However, the brevity can hurt readability for complex operations - use regular functions when the logic is non-trivial or when you need function naming for stack traces and debugging.

```javascript
// Traditional function
const add = function(a, b) {
    return a + b;
};

// Arrow function
const addArrow = (a, b) => a + b;

// Single parameter (no parentheses needed)
const double = n => n * 2;

// No parameters
const getRandom = () => Math.random();

// Multiple statements (need curly braces and return)
const processUser = (user) => {
    const name = user.name.toUpperCase();
    return `User: ${name}`;
};
```

**Key Differences from Regular Functions**

**Arrow Function Limitations** - Arrow functions sacrifice flexibility for conciseness. They don't have their own `this` - they inherit it lexically from the surrounding scope. This is perfect for callbacks (avoiding `.bind(this)`) but makes them unsuitable for object methods or constructors. They can't be used with `new` because they lack a `[[Construct]]` internal method. They don't have an `arguments` object - use rest parameters (...args) instead for variable arguments. Understanding when to use arrow functions versus regular functions is crucial: arrows for callbacks and short utilities, regular functions for methods and constructors.

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

```javascript
// Variables accessible everywhere
var globalVar = 'I am global';
let globalLet = 'Also global';
const globalConst = 'Global constant';

function showGlobal() {
    console.log(globalVar); // Accessible
}
```

**Function Scope**

**Function-Scoped Variables** - Variables declared with var are scoped to their containing function, accessible throughout the entire function regardless of block.

```javascript
function outer() {
    var functionScoped = 'Only in function';

    if (true) {
        var stillFunctionScoped = 'Still accessible';
    }

    console.log(stillFunctionScoped); // Works! var is function-scoped
}

// console.log(functionScoped); // ReferenceError
```

**Block Scope (let & const)**

**Block-Scoped Variables** - Block scoping, enabled by let and const, treats any curly braces as a scope boundary - if statements, loops, even standalone blocks. This prevents variables from leaking outside their intended scope, a major improvement over var. The classic example is loop variables: with let, each iteration gets its own copy of the variable, so closures capture the correct value. With var, all iterations share the same variable, leading to the classic closure bug where all callbacks reference the final loop value. Block scoping makes JavaScript's scoping model more intuitive and closer to other languages like Java or C.

```javascript
{
    let blockScoped = 'In block';
    const alsoBlockScoped = 'Also in block';
    var notBlockScoped = 'Function scoped';
}

// console.log(blockScoped); // ReferenceError
// console.log(alsoBlockScoped); // ReferenceError
console.log(notBlockScoped); // Works!

// Common use case: for loops
for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// Prints: 0, 1, 2 (each closure gets own 'i')

for (var j = 0; j < 3; j++) {
    setTimeout(() => console.log(j), 100);
}
// Prints: 3, 3, 3 (all closures share same 'j')
```

**Lexical Scope**

**Scope Chain** - Inner functions can access variables from outer functions through lexical scoping, but not vice versa.

```javascript
function outer() {
    const outerVar = 'outer';

    function inner() {
        const innerVar = 'inner';
        console.log(outerVar); // Can access outer variable
        console.log(innerVar); // Can access own variable
    }

    inner();
    // console.log(innerVar); // ReferenceError: Can't access inner variable
}

outer();
```

### 4. Hoisting

**Function Hoisting**

**Function vs Expression Hoisting** - Function declarations are fully hoisted and can be called before definition, unlike function expressions which behave like variables.

```javascript
// Function declarations are hoisted
greet('Alice'); // Works! "Hello, Alice!"

function greet(name) {
    return `Hello, ${name}!`;
}

// Function expressions are NOT hoisted
// sayHi('Bob'); // ReferenceError

const sayHi = function(name) {
    return `Hi, ${name}!`;
};
```

**Variable Hoisting**

**Temporal Dead Zone** - var declarations are hoisted but initialized as undefined, while let/const are hoisted but remain in temporal dead zone until declaration.

```javascript
console.log(x); // undefined (declaration hoisted, not initialization)
var x = 5;

// Equivalent to:
// var x;
// console.log(x);
// x = 5;

// let and const are hoisted but in "temporal dead zone"
// console.log(y); // ReferenceError
let y = 10;

// console.log(z); // ReferenceError
const z = 15;
```

### 5. Default Parameters

**Default Parameter Values** - ES6 allows setting default values for function parameters, including expressions and references to previous parameters.

```javascript
// ES6 default parameters
function greet(name = 'Guest', greeting = 'Hello') {
    return `${greeting}, ${name}!`;
}

console.log(greet()); // "Hello, Guest!"
console.log(greet('Alice')); // "Hello, Alice!"
console.log(greet('Bob', 'Hi')); // "Hi, Bob!"

// Default can be expressions
function createUser(name, id = Date.now()) {
    return { name, id };
}

// Previous parameters can be used
function greetWithTime(name, greeting = `Hello ${name}`) {
    return greeting;
}
```

### 6. Rest Parameters

**Rest Parameters** - Collects multiple arguments into an array using the spread operator, replacing the need for the arguments object.

```javascript
function sum(...numbers) {
    return numbers.reduce((total, num) => total + num, 0);
}

console.log(sum(1, 2, 3)); // 6
console.log(sum(1, 2, 3, 4, 5)); // 15

// Rest must be last parameter
function logInfo(action, ...details) {
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

```javascript
// Function Declaration
// - Hoisted to top
// - Can be called before definition
sayHello(); // Works!

function sayHello() {
    console.log('Hello!');
}

// Function Expression
// - Not hoisted
// - Must be defined before use
// sayGoodbye(); // ReferenceError

const sayGoodbye = function() {
    console.log('Goodbye!');
};
```

### Q2: Explain scope chain

**Answer:**

**Scope Chain Demonstration** - Illustrates how JavaScript searches for variables through nested scopes from inner to outer until found or reaching global scope.

```javascript
const global = 'global';

function outer() {
    const outerVar = 'outer';

    function middle() {
        const middleVar = 'middle';

        function inner() {
            const innerVar = 'inner';

            // Scope chain: inner -> middle -> outer -> global
            console.log(innerVar);   // 'inner' (own scope)
            console.log(middleVar);  // 'middle' (parent scope)
            console.log(outerVar);   // 'outer' (grandparent scope)
            console.log(global);     // 'global' (global scope)
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

```javascript
// Temporal Dead Zone (TDZ)
// Period between entering scope and variable initialization

{
    // TDZ starts
    // console.log(x); // ReferenceError: Cannot access before initialization
    // console.log(y); // ReferenceError

    let x = 5; // TDZ ends for x
    const y = 10; // TDZ ends for y

    console.log(x); // 5
    console.log(y); // 10
}

// var has no TDZ
{
    console.log(z); // undefined (not ReferenceError)
    var z = 15;
}
```

## 💡 Practical Examples

### Example 1: Counter with Private Variable

**Private Variables with Closures** - Uses function scope to create truly private variables that can only be accessed through returned methods, demonstrating encapsulation.

```javascript
function createCounter() {
    let count = 0; // Private variable (function scope)

    return {
        increment: () => ++count,
        decrement: () => --count,
        getCount: () => count
    };
}

const counter = createCounter();
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount());  // 1
// console.log(counter.count); // undefined (truly private)
```

### Example 2: Function Factory

**Function Factory Pattern** - Creates specialized functions by capturing parameters in closure, enabling function customization and reusability.

```javascript
function createMultiplier(multiplier) {
    return function(number) {
        return number * multiplier;
    };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15
```

### Example 3: Callback with Correct Scope

**Arrow Functions Preserve 'this'** - Demonstrates how arrow functions inherit 'this' from their enclosing scope, solving common callback context issues.

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

```javascript
// Problem
var funcs = [];
for (var i = 0; i < 3; i++) {
    funcs.push(function() {
        console.log(i);
    });
}

funcs[0](); // 3 (not 0!)
funcs[1](); // 3 (not 1!)
funcs[2](); // 3 (not 2!)

// Solution 1: Use let
var funcsFixed = [];
for (let i = 0; i < 3; i++) {
    funcsFixed.push(function() {
        console.log(i);
    });
}

funcsFixed[0](); // 0
funcsFixed[1](); // 1
funcsFixed[2](); // 2

// Solution 2: IIFE
var funcsIIFE = [];
for (var i = 0; i < 3; i++) {
    funcsIIFE.push((function(index) {
        return function() {
            console.log(index);
        };
    })(i));
}
```

### 3. Arrow Function 'this' Gotcha

**Arrow Functions as Methods** - Shows why arrow functions shouldn't be used as object methods since they don't bind their own 'this' context.

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
