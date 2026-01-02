# Data Types & Variables

## Understanding JavaScript Type System

JavaScript has **dynamic typing**, which means variables can hold values of any type without explicit type declaration. Unlike statically-typed languages (Java, C++, TypeScript), JavaScript determines types at runtime, offering flexibility but requiring careful handling to avoid type-related bugs.

### Why This Matters for Interviews

Understanding JavaScript's type system is fundamental because:

1. **Type-related bugs** are among the most common in JavaScript applications
2. **Type coercion** behavior is frequently tested in interviews
3. **Memory management** differences between primitives and references affect performance
4. **Variable scoping** (var vs let vs const) is a classic interview topic

### Core Concepts at a Glance

| Aspect | Primitives | Reference Types |
|--------|-----------|-----------------|
| **Storage** | Stored by value | Stored by reference |
| **Mutability** | Immutable | Mutable |
| **Comparison** | Compares values | Compares references |
| **Types** | string, number, boolean, null, undefined, symbol, bigint | Object, Array, Function |
| **Memory** | Stack | Heap |

### Key Points
- **Two categories**: Primitives (7 types) and Reference types (objects)
- **Primitives are immutable**: You can't change a primitive value, only reassign the variable
- **Objects are mutable**: Properties can be added, modified, or deleted
- **Type coercion** can lead to unexpected behavior (especially with `==`)
- **Variables**: `var` (function-scoped, hoisted), `let` & `const` (block-scoped, temporal dead zone)

---

## Example 1: Primitive vs Reference Types

**Primitive vs Reference Types** - Understanding the fundamental difference between primitive and reference types is crucial for avoiding bugs and understanding JavaScript's memory model. Primitives (number, string, boolean, null, undefined, symbol, bigint) are immutable and stored by value - when you assign or pass them, JavaScript copies the actual value. Reference types (objects, arrays, functions) store a reference (memory address) to the data - copying them copies only the reference, not the data itself. This means multiple variables can point to the same object, and modifying it through one variable affects all others. This is one of JavaScript's most common sources of bugs - accidentally mutating shared objects.

```javascript
// PRIMITIVE TYPES (stored by value)
// string, number, boolean, undefined, null, symbol, bigint

let a = 10;
let b = a;  // Copy value
b = 20;
console.log(a); // 10 (unchanged)
console.log(b); // 20

// REFERENCE TYPES (stored by reference)
// objects, arrays, functions

let obj1 = { name: 'Alice' };
let obj2 = obj1;  // Copy reference, not value
obj2.name = 'Bob';
console.log(obj1.name); // 'Bob' (changed!)
console.log(obj2.name); // 'Bob'

// Arrays are objects
let arr1 = [1, 2, 3];
let arr2 = arr1;
arr2.push(4);
console.log(arr1); // [1, 2, 3, 4] (changed!)
console.log(arr2); // [1, 2, 3, 4]
```

---

## Example 2: Type Coercion

**Type Coercion** - JavaScript's automatic type conversion is both powerful and dangerous. When operators encounter mixed types, JavaScript attempts to convert them to compatible types - sometimes with surprising results. The `+` operator with strings triggers string concatenation, converting numbers to strings, while `-`, `*`, `/` trigger numeric conversion. Boolean values coerce to numbers (true=1, false=0). The loose equality operator `==` performs type coercion before comparison, leading to confusing results like `'0' == false` being true. Always use strict equality `===` to avoid this. Understanding falsy values (0, '', null, undefined, NaN, false) is essential for conditional logic - everything else is truthy, including '0', 'false', [], and {}.

```javascript
// Implicit type coercion
console.log('5' + 3);      // '53' (number to string)
console.log('5' - 3);      // 2 (string to number)
console.log('5' * '2');    // 10 (both to numbers)
console.log(true + 1);     // 2 (true = 1)
console.log(false + 1);    // 1 (false = 0)

// Comparison coercion
console.log(5 == '5');     // true (loose equality, coerces)
console.log(5 === '5');    // false (strict equality, no coercion)
console.log(null == undefined);  // true
console.log(null === undefined); // false

// Falsy values
console.log(Boolean(0));        // false
console.log(Boolean(''));       // false
console.log(Boolean(null));     // false
console.log(Boolean(undefined)); // false
console.log(Boolean(NaN));      // false
console.log(Boolean(false));    // false

// Everything else is truthy
console.log(Boolean('0'));      // true
console.log(Boolean('false'));  // true
console.log(Boolean([]));       // true
console.log(Boolean({}));       // true
```

---

## Example 3: Variable Declarations

**var, let, const** - The evolution from var to let/const represents a major improvement in JavaScript. var is function-scoped and hoisted, creating confusing behavior - variables are accessible before declaration (as undefined) and variables declared in blocks leak to the surrounding function. let and const are block-scoped (respecting curly braces) and have a temporal dead zone - accessing them before declaration throws an error, catching bugs early. const prevents reassignment but doesn't make objects immutable - you can still modify object properties or array contents. Modern JavaScript strongly favors const by default (for values that won't be reassigned), let when reassignment is needed, and avoids var entirely.

```javascript
// VAR (function-scoped, hoisted)
function varExample() {
    console.log(x); // undefined (hoisted)
    var x = 10;

    if (true) {
        var x = 20; // Same variable!
    }
    console.log(x); // 20
}

// LET (block-scoped)
function letExample() {
    // console.log(y); // ReferenceError (temporal dead zone)
    let y = 10;

    if (true) {
        let y = 20; // Different variable
        console.log(y); // 20
    }
    console.log(y); // 10
}

// CONST (block-scoped, cannot reassign)
const PI = 3.14159;
// PI = 3.14; // TypeError

// But can mutate objects/arrays
const person = { name: 'Alice' };
person.name = 'Bob'; // OK
person.age = 30;     // OK
// person = {};      // TypeError

const arr = [1, 2, 3];
arr.push(4);  // OK
// arr = [];  // TypeError
```

---

## Common Pitfalls

### Pitfall 1: Type Coercion Surprises

**Type Coercion Edge Cases** - Demonstrates unexpected results from implicit type conversion, especially with arrays and objects, highlighting why strict equality is essential.

```javascript
// Array to string coercion
console.log([1, 2] + [3, 4]); // '1,23,4'

// Object coercion
console.log({} + []);  // '[object Object]'
console.log([] + {});  // '[object Object]'

// Comparison gotchas
console.log([] == ![]);    // true (complex coercion)
console.log('' == 0);      // true
console.log('0' == 0);     // true
console.log('0' == false); // true

// SOLUTION: Always use strict equality
console.log([] === ![]);   // false
console.log('' === 0);     // false
```

### Pitfall 2: Reference Type Mutations

**Unintended Mutations** - Shows how modifying objects or arrays passed to functions affects the original, and how to create copies to avoid this.

```javascript
// Unexpected mutation
function addItem(arr, item) {
    arr.push(item);
    return arr;
}

const original = [1, 2, 3];
const modified = addItem(original, 4);
console.log(original); // [1, 2, 3, 4] - Mutated!

// SOLUTION: Create copy
function addItemSafe(arr, item) {
    return [...arr, item]; // Spread operator
}

const original2 = [1, 2, 3];
const modified2 = addItemSafe(original2, 4);
console.log(original2); // [1, 2, 3] - Unchanged
console.log(modified2); // [1, 2, 3, 4]
```

### Pitfall 3: var Hoisting Issues

**var Scope Problems in Loops** - Illustrates the classic closure problem with var in loops and why let is the solution for block-scoped variables.

```javascript
// Problem with var in loops
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// Prints: 3, 3, 3 (var is function-scoped)

// SOLUTION: Use let
for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// Prints: 0, 1, 2 (let is block-scoped)
```

---

## Best Practices

### 1. Use const by default, let when needed, avoid var

**Modern Variable Declaration** - Demonstrates the recommended approach of using const for immutable bindings and let for reassignable values.

```javascript
// Good
const MAX_SIZE = 100;
const user = { name: 'Alice' };

let counter = 0;
counter++;

// Avoid
var x = 10; // Don't use var in modern JavaScript
```

### 2. Always use strict equality (===)

**Strict vs Loose Equality** - Shows why strict equality (===) prevents unexpected type coercion bugs compared to loose equality (==).

```javascript
// Good
if (value === 0) { }
if (user !== null) { }

// Avoid
if (value == 0) { }
if (user != null) { }

// Exception: checking for null or undefined
if (value == null) { } // Checks both null and undefined
```

### 3. Be explicit with type conversions

**Explicit Type Conversion** - Demonstrates clear, readable type conversions using built-in constructors instead of relying on implicit coercion.

```javascript
// Good - explicit conversion
const num = Number(str);
const str2 = String(num);
const bool = Boolean(value);

// Avoid - implicit coercion
const num2 = +str;
const str3 = num + '';
const bool2 = !!value;
```

---

## Real-world Scenarios

### Scenario 1: Deep Cloning Objects

**Deep vs Shallow Copying** - Compares different techniques for cloning objects, from shallow spread operators to deep cloning with JSON or recursive functions.

```javascript
// Shallow copy (only top level)
const original = { a: 1, b: { c: 2 } };
const shallow = { ...original };
shallow.b.c = 3;
console.log(original.b.c); // 3 (nested object still shared!)

// Deep copy solutions
// 1. JSON method (limited)
const deep1 = JSON.parse(JSON.stringify(original));

// 2. structuredClone (modern browsers)
const deep2 = structuredClone(original);

// 3. Recursive function
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);

    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}
```

### Scenario 2: Type Checking

**Runtime Type Checking** - Shows how to properly check types using typeof, Array.isArray, and strict equality for null, avoiding common typeof quirks.

```javascript
function processValue(value) {
    // Check primitive types
    if (typeof value === 'string') {
        return value.toUpperCase();
    }
    if (typeof value === 'number') {
        return value * 2;
    }
    if (typeof value === 'boolean') {
        return !value;
    }

    // Check for null (typeof null === 'object')
    if (value === null) {
        return 'Value is null';
    }

    // Check for array
    if (Array.isArray(value)) {
        return value.length;
    }

    // Check for object
    if (typeof value === 'object') {
        return Object.keys(value).length;
    }
}
```

### Scenario 3: Immutable Updates

**Immutable Data Patterns** - Demonstrates techniques for updating nested objects and arrays without mutation, essential for state management in React and Redux.

```javascript
// State update pattern (React-style)
const state = {
    user: { name: 'Alice', age: 30 },
    settings: { theme: 'dark' }
};

// Update nested property immutably
const newState = {
    ...state,
    user: {
        ...state.user,
        age: 31
    }
};

// Array immutable operations
const numbers = [1, 2, 3, 4, 5];

// Add item
const added = [...numbers, 6];

// Remove item
const removed = numbers.filter(n => n !== 3);

// Update item
const updated = numbers.map(n => n === 3 ? 30 : n);
```

---

## External Resources

- [MDN: JavaScript data types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)
- [MDN: var, let, const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements)
- [JavaScript.info: Data types](https://javascript.info/types)
- [Equality comparisons](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)

---

[← Back to JavaScript](./README.md) | [Next: Functions & Scope →](./02-functions-scope.md)
