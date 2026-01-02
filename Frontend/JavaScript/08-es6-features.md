# ES6+ Features

ES6 (ECMAScript 2015) and later versions introduced many features that fundamentally modernized JavaScript, transforming it from a "toy language" into a robust, modern programming language suitable for large-scale applications. These features are now considered essential knowledge for any JavaScript developer.

## Why ES6+ Features Matter

**Interview Perspective:**
- ES6+ is expected knowledge for mid to senior positions
- Demonstrates awareness of modern JavaScript practices
- Many questions assume ES6+ syntax (arrow functions, destructuring, etc.)
- Shows commitment to staying current with language evolution

**Real-World Importance:**
- **Readability**: Destructuring, template literals make code clearer
- **Productivity**: Arrow functions, default parameters reduce boilerplate
- **Safety**: `const`/`let`, modules prevent common bugs
- **Modern Frameworks**: React, Vue, Angular rely heavily on ES6+ features

## Feature Categories Overview

### **Syntax Improvements**
- Arrow functions, template literals, destructuring
- Classes, enhanced object literals
- Default parameters, rest/spread operators

### **New Capabilities**
- Promises, async/await
- Symbols, iterators, generators
- Maps, Sets, WeakMaps, WeakSets

### **Module System**
- import/export
- Dynamic imports
- Module namespaces

## ES6 vs ES5: Key Differences

| Feature | ES5 | ES6+ |
|---------|-----|------|
| **Variables** | `var` (function-scoped) | `let`, `const` (block-scoped) |
| **Functions** | `function() {}` | Arrow functions `() => {}` |
| **Strings** | Concatenation `'a' + b` | Template literals `` `a ${b}` `` |
| **Objects** | Verbose syntax | Destructuring, shorthand |
| **Async** | Callbacks | Promises, async/await |
| **Modules** | CommonJS, AMD | Native import/export |
| **Classes** | Constructor functions | Class syntax |

## 📚 Core Features

### 1. Let and Const

**Block-Scoped Variable Declarations** - ES6's let and const modernized JavaScript's variable system, fixing var's problematic behavior. let is block-scoped (respects curly braces), has temporal dead zone (no hoisting), and prevents accidental redeclaration. const works like let but prevents reassignment - crucial for preventing accidental mutation of references. However, const doesn't make objects/arrays immutable - it only prevents reassigning the variable to a different reference. Modern best practice: use const by default (signals intent that value won't change), let when reassignment is needed, never use var (it's kept only for backwards compatibility). This simple rule prevents many scoping bugs.

```javascript
// var: function-scoped, hoisted, can redeclare
var x = 1;
var x = 2; // OK
console.log(x); // 2

// let: block-scoped, not hoisted (TDZ), cannot redeclare
let y = 1;
// let y = 2; // SyntaxError
y = 2; // OK
console.log(y); // 2

// const: block-scoped, must initialize, cannot reassign
const z = 1;
// z = 2; // TypeError
// const w; // SyntaxError: Missing initializer

// But can mutate objects/arrays
const obj = { value: 1 };
obj.value = 2; // OK
// obj = {}; // TypeError

const arr = [1, 2, 3];
arr.push(4); // OK
// arr = []; // TypeError
```

### 2. Arrow Functions

**Concise Function Syntax** - Arrow functions provide shorter syntax and lexical 'this' binding, perfect for callbacks but unsuitable as methods or constructors.

```javascript
// Traditional
const add = function(a, b) {
    return a + b;
};

// Arrow
const addArrow = (a, b) => a + b;

// Single parameter
const double = n => n * 2;

// No parameters
const getRandom = () => Math.random();

// Multiple statements
const greet = name => {
    const message = `Hello, ${name}!`;
    return message;
};

// Returning object (wrap in parentheses)
const makePerson = (name, age) => ({ name, age });

// Key difference: No own 'this'
const obj = {
    value: 42,
    getValue: function() {
        // Arrow function inherits 'this'
        setTimeout(() => {
            console.log(this.value); // 42
        }, 100);
    }
};
```

### 3. Template Literals

### 💡 **String Interpolation and Multiline Strings**

Template literals (backticks) revolutionized string handling in JavaScript.

**Core Features:**

**1. Expression Interpolation:**
- Syntax: `` `text ${expression} more text` ``
- Replaces ugly concatenation
- Evaluates any JavaScript expression

```javascript
// Old Way (concatenation)
const message = 'Hello, ' + name + '! You are ' + age + ' years old.';

// New Way (template literal ✅)
const message = `Hello, ${name}! You are ${age} years old.`;
```

**2. Multiline Strings:**
- Natural line breaks (no `\n` needed)
- Perfect for HTML, SQL, or formatted text

```javascript
// Old Way (ugly)
const html = '<div>\n' +
             '  <h1>' + title + '</h1>\n' +
             '  <p>' + content + '</p>\n' +
             '</div>';

// New Way (readable ✅)
const html = `
    <div>
        <h1>${title}</h1>
        <p>${content}</p>
    </div>
`;
```

**3. Expression Evaluation:**

Any JavaScript expression works inside `${}`:

```javascript
const price = 19.99;
const quantity = 3;

const total = `Total: $${(price * quantity).toFixed(2)}`;
// "Total: $59.97"

const status = `User is ${age >= 18 ? 'adult' : 'minor'}`;

const items = `Cart has ${cart.length} item${cart.length !== 1 ? 's' : ''}`;
```

**4. Tagged Templates (Advanced):**

Functions that process template literals with full control.

**How Tagged Templates Work:**

```javascript
function tag(strings, ...values) {
    // strings: array of string parts
    // values: array of interpolated values
    return processedString;
}

const result = tag`Hello ${name}, you are ${age}`;
```

**Practical Examples:**

**HTML Escaping:**
```javascript
function safeHTML(strings, ...values) {
    const escape = (str) => String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return strings.reduce((result, str, i) => {
        const value = values[i] ? escape(values[i]) : '';
        return result + str + value;
    }, '');
}

const userInput = '<script>alert("xss")</script>';
const safe = safeHTML`User said: ${userInput}`;
// "User said: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
```

**Styled-Components (CSS-in-JS):**
```javascript
const Button = styled.button`
    background: ${props => props.primary ? 'blue' : 'gray'};
    color: white;
    padding: 10px;
`;
```

**Localization:**
```javascript
function i18n(strings, ...values) {
    // Lookup translation, replace placeholders
    const key = strings.join('{}');
    return translate(key, values);
}

const greeting = i18n`Hello ${userName}, you have ${count} messages`;
```

**When to Use Template Literals:**

| Use Case | Technique |
|----------|-----------|
| Simple string interpolation | `` `text ${var}` `` |
| Multiline strings | Template literals |
| Complex string building | Template literals |
| HTML templates | Template literals |
| Dynamic styling | Tagged templates |
| Localization | Tagged templates |
| Custom string processing | Tagged templates |

**Benefits Over Concatenation:**

| Aspect | Concatenation | Template Literals |
|--------|--------------|-------------------|
| **Readability** | ❌ Hard to read | ✅ Clear and natural |
| **Multiline** | ❌ Requires `\n` or `+` | ✅ Natural |
| **Expressions** | ❌ Break into parts | ✅ Inline with `${}` |
| **Escaping** | ❌ Manual | ✅ Tagged templates |
| **Type coercion** | ❌ Implicit | ✅ Explicit with `${}` |

**Common Use Cases:**

**1. Dynamic HTML:**
```javascript
const renderCard = (user) => `
    <div class="card">
        <h2>${user.name}</h2>
        <p>${user.bio}</p>
        <span>Joined: ${user.joinDate}</span>
    </div>
`;
```

**2. SQL Queries:**
```javascript
const query = `
    SELECT *
    FROM users
    WHERE age > ${minAge}
    AND status = '${status}'
    LIMIT ${limit}
`;
```

**3. Logging:**
```javascript
console.log(`[${timestamp}] ${level}: ${message}`);
```

**4. URLs:**
```javascript
const apiUrl = `${baseUrl}/api/users/${userId}/posts?page=${page}`;
```

**Key Insight:**
> Tagged templates enable **domain-specific languages (DSLs)** embedded in JavaScript. Libraries like styled-components, GraphQL, and i18n use tagged templates to create powerful, type-safe APIs that feel native to JavaScript.

```javascript
const name = 'Alice';
const age = 25;

// Old way
const message1 = 'Hello, ' + name + '! You are ' + age + ' years old.';

// Template literal
const message2 = `Hello, ${name}! You are ${age} years old.`;

// Expressions
const total = `Total: ${10 + 20}`;

// Multiline strings
const html = `
    <div>
        <h1>${name}</h1>
        <p>Age: ${age}</p>
    </div>
`;

// Tagged templates (advanced)
function highlight(strings, ...values) {
    return strings.reduce((result, str, i) => {
        const value = values[i] ? `<strong>${values[i]}</strong>` : '';
        return result + str + value;
    }, '');
}

const highlighted = highlight`Name: ${name}, Age: ${age}`;
// "Name: <strong>Alice</strong>, Age: <strong>25</strong>"
```

### 4. Destructuring

**Array Destructuring**

### 💡 **Array Pattern Matching**

Destructuring extracts values from arrays into variables based on position.

**Basic Pattern:**

```javascript
const [first, second, third] = array;
// Unpacks by position
```

**Key Features:**

**1. Position-Based Extraction:**
```javascript
const numbers = [1, 2, 3, 4, 5];

// Old way
const first = numbers[0];
const second = numbers[1];

// Destructuring way ✅
const [first, second] = numbers;
```

**2. Skipping Elements:**
```javascript
const [first, , third] = [1, 2, 3, 4, 5];
// first = 1, third = 3
// Leave empty slot to skip
```

**3. Rest Pattern (Gather Remaining):**
```javascript
const [head, ...tail] = [1, 2, 3, 4, 5];
// head = 1
// tail = [2, 3, 4, 5]
```

**4. Default Values:**
```javascript
const [a, b, c = 0] = [1, 2];
// a = 1, b = 2, c = 0 (default)
```

**5. Variable Swapping:**
```javascript
let x = 1, y = 2;
[x, y] = [y, x]; // Swap without temp variable
// x = 2, y = 1
```

**Perfect Use Cases:**

**React Hooks:**
```javascript
const [count, setCount] = useState(0);
const [user, setUser] = useState(null);
```

**Function Returns:**
```javascript
function getCoordinates() {
    return [10, 20];
}
const [x, y] = getCoordinates();
```

**Iterables:**
```javascript
const [first, second] = new Set([1, 2, 3]);
const [char1, char2] = 'hello';
```

**Array vs Object Destructuring:**

| Feature | Array | Object |
|---------|-------|--------|
| **Matching** | By position | By property name |
| **Order** | ✅ Matters | ❌ Doesn't matter |
| **Renaming** | Automatic (use any name) | Explicit `{name: newName}` |
| **Skipping** | Empty slots `,` | Just omit property |
| **Use for** | Tuples, returns, iterables | API responses, configs |

**Advanced Patterns:**

**Nested Destructuring:**
```javascript
const matrix = [[1, 2], [3, 4]];
const [[a, b], [c, d]] = matrix;
// a=1, b=2, c=3, d=4
```

**With Default + Rest:**
```javascript
const [first = 0, ...rest] = [];
// first = 0 (default)
// rest = []
```

**Common Patterns:**

**1. Tuple Returns:**
```javascript
function getMinMax(arr) {
    return [Math.min(...arr), Math.max(...arr)];
}
const [min, max] = getMinMax([1, 5, 3]);
```

**2. Splitting Strings:**
```javascript
const [firstName, lastName] = 'John Doe'.split(' ');
```

**3. Pagination:**
```javascript
const [first, second, ...remaining] = items;
```

**Key Insight:**
> Array destructuring is **position-based** - order matters. This makes it perfect for tuple-like data (coordinates, ranges) and function returns where order is meaningful.

```javascript
const numbers = [1, 2, 3, 4, 5];

// Traditional
const first = numbers[0];
const second = numbers[1];

// Destructuring
const [a, b, c] = numbers;
console.log(a, b, c); // 1 2 3

// Skip elements
const [x, , z] = numbers;
console.log(x, z); // 1 3

// Rest pattern
const [head, ...tail] = numbers;
console.log(head); // 1
console.log(tail); // [2, 3, 4, 5]

// Default values
const [p, q, r = 0] = [1, 2];
console.log(r); // 0

// Swapping
let m = 1, n = 2;
[m, n] = [n, m];
console.log(m, n); // 2 1
```

**Object Destructuring**

**Object Pattern Matching** - Extracts properties from objects with support for renaming, default values, nested destructuring, and function parameter destructuring.

```javascript
const user = {
    name: 'Alice',
    age: 25,
    email: 'alice@example.com',
    address: {
        city: 'New York',
        country: 'USA'
    }
};

// Basic
const { name, age } = user;
console.log(name, age); // "Alice" 25

// Rename variables
const { name: userName, age: userAge } = user;
console.log(userName, userAge); // "Alice" 25

// Default values
const { name, role = 'user' } = user;
console.log(role); // "user"

// Nested destructuring
const { address: { city, country } } = user;
console.log(city, country); // "New York" "USA"

// Rest properties
const { name: n, ...rest } = user;
console.log(rest); // { age: 25, email: "alice@example.com", address: {...} }

// Function parameters
function greet({ name, age }) {
    console.log(`Hello ${name}, you are ${age}`);
}

greet(user); // "Hello Alice, you are 25"
```

### 5. Spread and Rest Operators

**Spread Operator (...)**

**Expanding Iterables** - Spreads array/object elements for concatenation, copying, merging objects, and passing multiple arguments to functions.

```javascript
// Arrays
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];

// Concatenate
const combined = [...arr1, ...arr2];
console.log(combined); // [1, 2, 3, 4, 5, 6]

// Copy array
const copy = [...arr1];

// Add elements
const extended = [0, ...arr1, 4];
console.log(extended); // [0, 1, 2, 3, 4]

// Objects
const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };

// Merge objects
const merged = { ...obj1, ...obj2 };
console.log(merged); // { a: 1, b: 2, c: 3, d: 4 }

// Override properties
const updated = { ...obj1, b: 99 };
console.log(updated); // { a: 1, b: 99 }

// Function calls
const numbers = [1, 2, 3];
console.log(Math.max(...numbers)); // 3
```

**Rest Parameters**

**Gathering Remaining Arguments** - Collects remaining function arguments into an array, replacing the need for the arguments object with clearer syntax.

```javascript
// Gather remaining arguments
function sum(...numbers) {
    return numbers.reduce((total, num) => total + num, 0);
}

console.log(sum(1, 2, 3)); // 6
console.log(sum(1, 2, 3, 4, 5)); // 15

// Mixed parameters
function greet(greeting, ...names) {
    return `${greeting} ${names.join(' and ')}!`;
}

console.log(greet('Hello', 'Alice', 'Bob', 'Charlie'));
// "Hello Alice and Bob and Charlie!"
```

### 6. Default Parameters

**Function Parameter Defaults** - Sets default values for function parameters including expressions and references to other parameters, eliminating manual checks.

```javascript
// Old way
function greetOld(name) {
    name = name || 'Guest';
    return `Hello, ${name}`;
}

// ES6
function greet(name = 'Guest') {
    return `Hello, ${name}`;
}

console.log(greet()); // "Hello, Guest"
console.log(greet('Alice')); // "Hello, Alice"

// Expressions as defaults
function createUser(name, id = Date.now()) {
    return { name, id };
}

// Use previous parameters
function greetFull(name, greeting = `Hello ${name}`) {
    return greeting;
}

console.log(greetFull('Alice')); // "Hello Alice"
```

### 7. Object Literals (Enhanced)

**Enhanced Object Syntax** - Property shorthand, method shorthand, and computed property names make object creation more concise and dynamic.

```javascript
const name = 'Alice';
const age = 25;

// Property shorthand
const user = {
    name,  // same as name: name
    age    // same as age: age
};

// Method shorthand
const calculator = {
    // Old way
    add: function(a, b) {
        return a + b;
    },

    // New way
    subtract(a, b) {
        return a - b;
    }
};

// Computed property names
const prop = 'email';
const person = {
    name: 'Bob',
    [prop]: 'bob@example.com',      // email: 'bob@example.com'
    [`${prop}Verified`]: true       // emailVerified: true
};
```

### 8. Classes

**Class Syntax** - Modern class syntax with constructors, instance methods, getters/setters, static methods, and inheritance through extends/super keywords.

```javascript
class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }

    // Instance method
    greet() {
        return `Hello, I'm ${this.name}`;
    }

    // Getter
    get info() {
        return `${this.name}, ${this.age} years old`;
    }

    // Setter
    set birthYear(year) {
        this.age = new Date().getFullYear() - year;
    }

    // Static method
    static species() {
        return 'Homo sapiens';
    }
}

const alice = new Person('Alice', 25);
console.log(alice.greet()); // "Hello, I'm Alice"
console.log(alice.info); // "Alice, 25 years old"
console.log(Person.species()); // "Homo sapiens"

// Inheritance
class Student extends Person {
    constructor(name, age, grade) {
        super(name, age);
        this.grade = grade;
    }

    study() {
        return `${this.name} is studying`;
    }
}

const bob = new Student('Bob', 20, 'A');
console.log(bob.greet()); // Inherited method
console.log(bob.study()); // Own method
```

### 9. Modules

**Exporting**

**ES6 Module Exports** - Named exports for multiple values and default export for primary value, enabling modular code organization.

```javascript
// math.js

// Named exports
export const PI = 3.14159;
export function add(a, b) {
    return a + b;
}

// Or export later
const subtract = (a, b) => a - b;
const multiply = (a, b) => a * b;

export { subtract, multiply };

// Default export (one per file)
export default class Calculator {
    // ...
}
```

**Importing**

**ES6 Module Imports** - Import named exports, default exports, rename imports, or import all exports with various import syntax options.

```javascript
// app.js

// Named imports
import { PI, add, subtract } from './math.js';

// Rename imports
import { PI as pi, add as sum } from './math.js';

// Import all
import * as Math from './math.js';
console.log(Math.PI);
console.log(Math.add(1, 2));

// Default import
import Calculator from './math.js';

// Mixed
import Calculator, { PI, add } from './math.js';
```

### 10. Promises

**Promise-Based Async** - Handles asynchronous operations with promises using then/catch/finally, Promise.all, and Promise.race for multiple operations.

```javascript
// Creating a promise
const fetchData = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const success = true;
            if (success) {
                resolve({ data: 'Hello' });
            } else {
                reject(new Error('Failed'));
            }
        }, 1000);
    });
};

// Using promise
fetchData()
    .then(result => console.log(result))
    .catch(error => console.error(error))
    .finally(() => console.log('Done'));

// Promise.all - wait for all
Promise.all([
    fetch('/api/user'),
    fetch('/api/posts'),
    fetch('/api/comments')
])
.then(([user, posts, comments]) => {
    // All resolved
})
.catch(error => {
    // Any one rejected
});

// Promise.race - first to resolve
Promise.race([
    fetchData(),
    fetchDataFromCache()
])
.then(result => console.log('Fastest:', result));
```

### 11. Async/Await

**Synchronous-Looking Async Code** - Async/await syntax makes promise-based code look synchronous with try/catch error handling, improving readability.

```javascript
// Traditional promise chain
function getUserData() {
    return fetch('/api/user')
        .then(response => response.json())
        .then(user => fetch(`/api/posts/${user.id}`))
        .then(response => response.json())
        .then(posts => console.log(posts))
        .catch(error => console.error(error));
}

// Async/await (cleaner!)
async function getUserDataAsync() {
    try {
        const response = await fetch('/api/user');
        const user = await response.json();

        const postsResponse = await fetch(`/api/posts/${user.id}`);
        const posts = await postsResponse.json();

        console.log(posts);
    } catch (error) {
        console.error(error);
    }
}

// Parallel async operations
async function fetchMultiple() {
    try {
        // Sequential (slow)
        const user = await fetch('/api/user');
        const posts = await fetch('/api/posts'); // Waits for user

        // Parallel (fast)
        const [userRes, postsRes] = await Promise.all([
            fetch('/api/user'),
            fetch('/api/posts')
        ]);

        const userData = await userRes.json();
        const postsData = await postsRes.json();
    } catch (error) {
        console.error(error);
    }
}
```

### 12. Symbols

**Unique Identifiers** - Symbols create unique, non-enumerable property keys, useful for meta-programming and avoiding property name collisions.

```javascript
// Create unique identifiers
const id1 = Symbol('id');
const id2 = Symbol('id');

console.log(id1 === id2); // false (unique!)

// Use as object keys
const user = {
    name: 'Alice',
    [id1]: 123
};

console.log(user[id1]); // 123
console.log(user.name); // 'Alice'

// Symbols are not enumerable
console.log(Object.keys(user)); // ['name'] (no symbol!)

// Built-in symbols
const arr = [1, 2, 3];
const iterator = arr[Symbol.iterator]();
console.log(iterator.next()); // { value: 1, done: false }
```

### 13. Iterators and Generators

**Iterators**

**Custom Iteration Protocol** - Implements the iterator protocol with Symbol.iterator and next() method for custom iterable objects.

```javascript
// Custom iterator
const range = {
    from: 1,
    to: 5,

    [Symbol.iterator]() {
        return {
            current: this.from,
            last: this.to,

            next() {
                if (this.current <= this.last) {
                    return { value: this.current++, done: false };
                } else {
                    return { done: true };
                }
            }
        };
    }
};

for (let num of range) {
    console.log(num); // 1, 2, 3, 4, 5
}
```

**Generators**

**Generator Functions** - Functions that can pause and resume execution using yield, creating iterators more easily than manual iterator protocol.

```javascript
// Generator function (easier than iterators)
function* numberGenerator() {
    yield 1;
    yield 2;
    yield 3;
}

const gen = numberGenerator();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { done: true }

// Infinite generator
function* idGenerator() {
    let id = 1;
    while (true) {
        yield id++;
    }
}

const ids = idGenerator();
console.log(ids.next().value); // 1
console.log(ids.next().value); // 2

// Practical example
function* fibonacci() {
    let [a, b] = [0, 1];
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}

const fib = fibonacci();
for (let i = 0; i < 10; i++) {
    console.log(fib.next().value);
}
// 0, 1, 1, 2, 3, 5, 8, 13, 21, 34
```

### 14. Maps and Sets

**Map**

**Key-Value Collections** - Map provides a proper key-value data structure accepting any type as key, with size property and iteration methods.

```javascript
// Better than objects for key-value pairs
const map = new Map();

map.set('name', 'Alice');
map.set('age', 25);
map.set(1, 'one'); // Any type as key!

console.log(map.get('name')); // 'Alice'
console.log(map.size); // 3
console.log(map.has('age')); // true

// Objects as keys
const obj = { id: 1 };
map.set(obj, 'value');
console.log(map.get(obj)); // 'value'

// Iteration
for (let [key, value] of map) {
    console.log(`${key}: ${value}`);
}

// Conversion
const mapFromArray = new Map([
    ['a', 1],
    ['b', 2]
]);
```

**Set**

**Unique Value Collections** - Set stores unique values of any type, perfect for removing duplicates and membership testing.

```javascript
// Unique values only
const set = new Set();

set.add(1);
set.add(2);
set.add(2); // Duplicate, ignored
set.add(3);

console.log(set.size); // 3
console.log(set.has(2)); // true

// Array to Set (remove duplicates)
const numbers = [1, 2, 2, 3, 3, 4];
const unique = [...new Set(numbers)];
console.log(unique); // [1, 2, 3, 4]

// Iteration
for (let value of set) {
    console.log(value);
}
```

## 🎯 Common Interview Questions

### Q1: What's the difference between let, const, and var?

**Answer:**
- `var`: Function-scoped, hoisted, can redeclare
- `let`: Block-scoped, TDZ, cannot redeclare
- `const`: Block-scoped, TDZ, cannot reassign (but can mutate objects/arrays)

### Q2: When should you use arrow functions vs regular functions?

**Answer:**
- **Arrow functions**: Callbacks, short functions, when you want lexical `this`
- **Regular functions**: Methods, constructors, when you need `arguments` object

### Q3: Explain async/await

**Answer:** Syntactic sugar over promises that makes async code look synchronous. `async` functions always return a promise. `await` pauses execution until promise resolves.

## 🔗 Related Topics

- [Functions & Scope](./02-functions-scope.md)
- [Promises & Async/Await](./06-promises-async.md)
- [Array & Object Methods](./09-array-object-methods.md)

---

[← Back to JavaScript](./README.md)
