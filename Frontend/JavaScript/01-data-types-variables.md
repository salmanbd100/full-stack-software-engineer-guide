# Data Types and Variables {#ch-data-types-and-variables}

> Predict what a value will do before you run it — which types copy, which share, and which comparisons lie.

**In this chapter:** primitives vs references · type coercion · `var`, `let` and `const` · shallow vs deep copies · narrowing `unknown`

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

### 💡 **Primitive vs Reference Types**

Understanding the fundamental difference between these types is crucial for avoiding bugs and mastering JavaScript's memory model.

**Primitive Types (Stored by Value):**
- **Types**: `number`, `string`, `boolean`, `null`, `undefined`, `symbol`, `bigint`
- **Behavior**: Immutable - values cannot be changed, only reassigned
- **Memory**: When assigned or passed, JavaScript **copies the actual value**
- **Result**: Each variable has its own independent copy

**Reference Types (Stored by Reference):**
- **Types**: `Object`, `Array`, `Function`, `Date`, `RegExp`, etc.
- **Behavior**: Mutable - properties/elements can be modified
- **Memory**: Variables store a **reference (memory address)**, not the data itself
- **Result**: Multiple variables can point to the same object

**⚠️ Critical Implication:**
> When you copy a reference type, you're copying the **pointer**, not the data. Modifying the object through one variable affects **all** variables pointing to it.

**Common Bug Source:**
This is one of JavaScript's most frequent sources of bugs - accidentally mutating shared objects when you intended to create independent copies.

```typescript
// PRIMITIVE TYPES (stored by value)
// string, number, boolean, undefined, null, symbol, bigint

let a: number = 10;
let b: number = a; // Copies the value
b = 20;
console.log(a); // 10 (unchanged)
console.log(b); // 20

// REFERENCE TYPES (stored by reference)
// objects, arrays, functions

interface Person {
  name: string;
}

let obj1: Person = { name: 'Alice' };
let obj2: Person = obj1; // Copies the reference, not the object
obj2.name = 'Bob';
console.log(obj1.name); // 'Bob' (changed!)
console.log(obj2.name); // 'Bob'

// Arrays are objects, so the same rule applies
let arr1: number[] = [1, 2, 3];
let arr2: number[] = arr1;
arr2.push(4);
console.log(arr1); // [1, 2, 3, 4] (changed!)
console.log(arr2); // [1, 2, 3, 4]
```

---

## Example 2: Type Coercion

### 💡 **Type Coercion**

JavaScript's automatic type conversion is both **powerful** and **dangerous**.

**How Type Coercion Works:**

When operators encounter mixed types, JavaScript attempts to convert them to compatible types - sometimes with surprising results:

**String Coercion (+ operator):**
- `'5' + 3` → `'53'` (number converted to string for concatenation)
- **Rule**: If either operand is a string, convert both to strings

**Numeric Coercion (-, *, / operators):**
- `'5' - 3` → `2` (string converted to number)
- `'5' * '2'` → `10` (both strings converted to numbers)
- **Rule**: Convert both operands to numbers

**Boolean to Number:**
- `true` → `1`
- `false` → `0`
- Example: `true + 1` → `2`

**⚠️ The == vs === Problem:**

**Loose Equality (==)** - Performs type coercion before comparison:
- `'0' == false` → `true` (both coerced to 0)
- `null == undefined` → `true`
- `5 == '5'` → `true`

**Strict Equality (===)** - No coercion, compares type AND value:
- `'0' === false` → `false`
- `null === undefined` → `false`
- `5 === '5'` → `false`

**✅ Best Practice:** Always use `===` and `!==` to avoid unexpected coercion bugs.

**Falsy vs Truthy Values:**

**Falsy (6 values only):**
- `0`, `''` (empty string), `null`, `undefined`, `NaN`, `false`

**Truthy (everything else):**
- `'0'`, `'false'`, `[]`, `{}`, any non-zero number, any function

<!-- lint-allow-fence: javascript — the subject is implicit coercion; TypeScript rejects `'5' - 3` and `5 == '5'`, which is exactly what this fence has to show -->
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

### 💡 **var, let, const - Evolution of JavaScript Variables**

The evolution from `var` to `let`/`const` represents a major improvement in JavaScript's variable system.

**var (The Old Way - Avoid):**
- **Scope**: Function-scoped (ignores block boundaries)
- **Hoisting**: Declaration hoisted, initialized as `undefined`
- **Re-declaration**: Allowed (can redeclare same variable)
- **Problems**:
  - Variables leak out of blocks (`if`, `for`, etc.)
  - Accessible before declaration (returns `undefined`)
  - Easy to accidentally create bugs

**let (Block-Scoped, Reassignable):**
- **Scope**: Block-scoped (respects `{ }` boundaries)
- **Hoisting**: Declaration hoisted, but in **Temporal Dead Zone (TDZ)**
- **Re-declaration**: Not allowed in same scope
- **Benefits**:
  - Variables stay within their blocks
  - Accessing before declaration → Error (catches bugs early)
  - Each loop iteration gets fresh variable

**const (Block-Scoped, Immutable Binding):**
- **Scope**: Block-scoped (same as `let`)
- **Reassignment**: ❌ Not allowed
- **Mutation**: ✅ Objects/arrays CAN be mutated
- **Initialization**: Must be initialized at declaration
- **Key Point**:
  ```typescript
  const obj: { a: number } = { a: 1 };
  obj.a = 2; // ✅ OK — mutating a property
  obj = {}; // ❌ Error — reassigning the binding

  const arr: number[] = [1, 2];
  arr.push(3); // ✅ OK — mutating the array
  arr = []; // ❌ Error — reassigning the binding
  ```

**✅ Modern Best Practice:**

1. **Default to `const`** - Use for all variables that won't be reassigned
2. **Use `let`** - Only when reassignment is needed (counters, accumulators)
3. **Never use `var`** - Kept only for backward compatibility

This simple rule prevents many scoping bugs and signals your intent clearly.

```typescript
// VAR — function-scoped, hoisted
function varExample(): void {
  console.log(x); // undefined — the declaration hoists, the assignment does not
  var x: number = 10;

  if (true) {
    var x = 20; // The same variable, not a new one
  }
  console.log(x); // 20
}

// LET — block-scoped
function letExample(): void {
  // console.log(y); // ReferenceError — temporal dead zone
  let y: number = 10;

  if (true) {
    let y: number = 20; // A different variable
    console.log(y); // 20
  }
  console.log(y); // 10
}

// CONST — block-scoped, cannot be reassigned
const PI: number = 3.14159;
// PI = 3.14; // Error

// The binding is constant; the object it points at is not
interface Person {
  name: string;
  age?: number;
}

const person: Person = { name: 'Alice' };
person.name = 'Bob'; // OK
person.age = 30; // OK
// person = {};      // Error

const arr: number[] = [1, 2, 3];
arr.push(4); // OK
// arr = [];  // Error
```

---

## Common Pitfalls

### Pitfall 1: Type Coercion Surprises

**Type Coercion Edge Cases** - Demonstrates unexpected results from implicit type conversion, especially with arrays and objects, highlighting why strict equality is essential.

<!-- lint-allow-fence: javascript — every line here is a coercion TypeScript refuses to compile; annotating them would delete the lesson -->
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

```typescript
// ❌ Unexpected mutation — the caller's array is changed
function addItem<T>(arr: T[], item: T): T[] {
  arr.push(item);
  return arr;
}

const original: number[] = [1, 2, 3];
const modified: number[] = addItem(original, 4);
console.log(original); // [1, 2, 3, 4] — mutated!

// ✅ Return a copy. `readonly T[]` makes the intent enforceable
function addItemSafe<T>(arr: readonly T[], item: T): T[] {
  return [...arr, item];
}

const original2: number[] = [1, 2, 3];
const modified2: number[] = addItemSafe(original2, 4);
console.log(original2); // [1, 2, 3] — unchanged
console.log(modified2); // [1, 2, 3, 4]
```

### Pitfall 3: var Hoisting Issues

**var Scope Problems in Loops** - Illustrates the classic closure problem with var in loops and why let is the solution for block-scoped variables.

```typescript
// ❌ One `i` shared by all three callbacks
for (var i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// Prints: 3, 3, 3 — var is function-scoped

// ✅ `let` gives each iteration its own binding
for (let i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// Prints: 0, 1, 2
```

---

## Best Practices

### 1. Use const by default, let when needed, avoid var

**Modern Variable Declaration** - Demonstrates the recommended approach of using const for immutable bindings and let for reassignable values.

```typescript
// ✅ Good
const MAX_SIZE: number = 100;
const user: Person = { name: 'Alice' };

let counter: number = 0;
counter++;

// ❌ Avoid — `var` has no block scope and hoists
var x: number = 10;
```

### 2. Always use strict equality (===)

**Strict vs Loose Equality** - Shows why strict equality (===) prevents unexpected type coercion bugs compared to loose equality (==).

```typescript
// ✅ Good
if (value === 0) {
}
if (user !== null) {
}

// ❌ Avoid — loose equality coerces before comparing
if (value == 0) {
}
if (user != null) {
}

// The one defensible use: `== null` catches null and undefined together
if (value == null) {
}
```

### 3. Be explicit with type conversions

**Explicit Type Conversion** - Demonstrates clear, readable type conversions using built-in constructors instead of relying on implicit coercion.

```typescript
// ✅ Explicit conversion — the reader sees the intent and the type
const num: number = Number(str);
const str2: string = String(num);
const bool: boolean = Boolean(value);

// ❌ Implicit coercion — same result, no signal
const num2: number = +str;
const str3: string = num + '';
const bool2: boolean = !!value;
```

---

## Real-world Scenarios

### Scenario 1: Deep Cloning Objects

**Deep vs Shallow Copying** - Compares different techniques for cloning objects, from shallow spread operators to deep cloning with JSON or recursive functions.

```typescript
interface Nested {
  a: number;
  b: { c: number };
}

// Shallow copy — top level only
const original: Nested = { a: 1, b: { c: 2 } };
const shallow: Nested = { ...original };
shallow.b.c = 3;
console.log(original.b.c); // 3 — the nested object is still shared

// 1. JSON round trip. Loses Date, Map, Set, undefined and functions
const deep1: Nested = JSON.parse(JSON.stringify(original)) as Nested;

// 2. structuredClone — handles Date, Map and Set; throws on functions
const deep2: Nested = structuredClone(original);

// 3. By hand, when you need control over what is cloned
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone) as T;

  const cloned: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  return cloned as T;
}
```

### Scenario 2: Type Checking

**Runtime Type Checking** - Shows how to properly check types using typeof, Array.isArray, and strict equality for null, avoiding common typeof quirks.

```typescript
// TypeScript narrows `unknown` on each check, so `value` has the right
// methods inside each branch with no casting
function processValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  if (typeof value === 'number') {
    return value * 2;
  }
  if (typeof value === 'boolean') {
    return !value;
  }

  // typeof null === 'object', so null must be checked before objects
  if (value === null) {
    return 'Value is null';
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length;
  }

  return undefined;
}
```

### Scenario 3: Immutable Updates

**Immutable Data Patterns** - Demonstrates techniques for updating nested objects and arrays without mutation, essential for state management in React and Redux.

```typescript
interface AppState {
  user: { name: string; age: number };
  settings: { theme: 'light' | 'dark' };
}

const state: AppState = {
  user: { name: 'Alice', age: 30 },
  settings: { theme: 'dark' },
};

// Spread is shallow — every level you change needs its own spread
const newState: AppState = {
  ...state,
  user: {
    ...state.user,
    age: 31,
  },
};

const numbers: readonly number[] = [1, 2, 3, 4, 5];

const added: number[] = [...numbers, 6];
const removed: number[] = numbers.filter((n: number): boolean => n !== 3);
const updated: number[] = numbers.map((n: number): number => (n === 3 ? 30 : n));
```

---

## External Resources

- [MDN: JavaScript data types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)
- [MDN: var, let, const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements)
- [JavaScript.info: Data types](https://javascript.info/types)
- [Equality comparisons](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)

---

[← Back to JavaScript](./README.md) | [Next: Functions & Scope →](./02-functions-scope.md)
