# ES2015 and Later Features {#ch-es2015-and-later-features}

> Reach for the modern form of each pattern, and say what it replaced and why that matters.

**In this chapter:** destructuring · spread and rest · template literals · modules · `Map`, `Set` and `Symbol` · optional chaining and nullish coalescing

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

```typescript
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

```typescript
// Traditional
const add = function (a: number, b: number): number {
  return a + b;
};

// Arrow
const addArrow = (a: number, b: number): number => a + b;

// Single parameter — TypeScript needs the parentheses to hold the annotation
const double = (n: number): number => n * 2;

// No parameters
const getRandom = (): number => Math.random();

// Multiple statements need braces and a return
const greet = (name: string): string => {
  const message = `Hello, ${name}!`;
  return message;
};

// Returning an object literal — wrap it, or the braces read as a body
const makePerson = (name: string, age: number): { name: string; age: number } => ({ name, age });

// The difference that matters: an arrow has no `this` of its own
const obj = {
  value: 42,
  getValue: function (): void {
    setTimeout((): void => {
      console.log(this.value); // 42 — inherited from getValue
    }, 100);
  },
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

```typescript
// ❌ Concatenation
const messageOld: string = 'Hello, ' + name + '! You are ' + age + ' years old.';

// ✅ Template literal
const message: string = `Hello, ${name}! You are ${age} years old.`;
```

**2. Multiline Strings:**
- Natural line breaks (no `\n` needed)
- Perfect for HTML, SQL, or formatted text

```typescript
// ❌ Manual newlines and concatenation
const htmlOld: string =
  '<div>\n' + '  <h1>' + title + '</h1>\n' + '  <p>' + content + '</p>\n' + '</div>';

// ✅ A template literal keeps its own line breaks
const html: string = `
    <div>
        <h1>${title}</h1>
        <p>${content}</p>
    </div>
`;
```

**3. Expression Evaluation:**

Any JavaScript expression works inside `${}`:

```typescript
const price: number = 19.99;
const quantity: number = 3;

// Any expression goes inside ${}, not just a variable
const total: string = `Total: $${(price * quantity).toFixed(2)}`;
// "Total: $59.97"

const status: string = `User is ${age >= 18 ? 'adult' : 'minor'}`;

const items: string = `Cart has ${cart.length} item${cart.length !== 1 ? 's' : ''}`;
```

**4. Tagged Templates (Advanced):**

Functions that process template literals with full control.

**How Tagged Templates Work:**

```typescript
// A tag function receives the literal parts and the interpolated values
// separately, which is what makes escaping and translation possible
function tag(strings: TemplateStringsArray, ...values: unknown[]): string {
  return processedString;
}

const result: string = tag`Hello ${name}, you are ${age}`;
```

**Practical Examples:**

**HTML Escaping:**
```typescript
// The interpolated values are escaped; the literal parts are not. That split
// is the whole reason tagged templates can be safe
function safeHTML(strings: TemplateStringsArray, ...values: unknown[]): string {
  const escape = (str: unknown): string =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return strings.reduce(
    (result: string, str: string, i: number): string =>
      result + str + (values[i] !== undefined ? escape(values[i]) : ''),
    '',
  );
}

const userInput = '<script>alert("xss")</script>';
const safe: string = safeHTML`User said: ${userInput}`;
```

**Styled-Components (CSS-in-JS):**
```typescript
interface ButtonProps {
  primary?: boolean;
}

const Button = styled.button<ButtonProps>`
  background: ${(props: ButtonProps): string => (props.primary ? 'blue' : 'gray')};
  color: white;
  padding: 10px;
`;
```

**Localization:**
```typescript
function i18n(strings: TemplateStringsArray, ...values: unknown[]): string {
  // The literal parts form a stable lookup key; the values fill the gaps
  const key: string = strings.join('{}');
  return translate(key, values);
}

const greeting: string = i18n`Hello ${userName}, you have ${count} messages`;
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
```typescript
interface CardUser {
  name: string;
  bio: string;
  joinDate: string;
}

const renderCard = (user: CardUser): string => `
    <div class="card">
        <h2>${user.name}</h2>
        <p>${user.bio}</p>
        <span>Joined: ${user.joinDate}</span>
    </div>
`;
```

**2. SQL Queries:**
```typescript
// ⚠️ Interpolating values straight into SQL is an injection hole. Keep the
// template for the shape and pass the values as parameters
const query: string = `
    SELECT *
    FROM users
    WHERE age > $1
    AND status = $2
    LIMIT $3
`;
```

**3. Logging:**
```typescript
console.log(`[${timestamp}] ${level}: ${message}`);
```

**4. URLs:**
```typescript
const apiUrl: string = `${baseUrl}/api/users/${userId}/posts?page=${page}`;
```

**Key Insight:**
> Tagged templates enable **domain-specific languages (DSLs)** embedded in JavaScript. Libraries like styled-components, GraphQL, and i18n use tagged templates to create powerful, type-safe APIs that feel native to JavaScript.

```typescript
const name: string = 'Alice';
const age: number = 25;

// ❌ Old way
const message1: string = 'Hello, ' + name + '! You are ' + age + ' years old.';

// ✅ Template literal
const message2: string = `Hello, ${name}! You are ${age} years old.`;

// Expressions, not just variables
const total: string = `Total: ${10 + 20}`;

// Multiline
const html: string = `
    <div>
        <h1>${name}</h1>
        <p>Age: ${age}</p>
    </div>
`;

// Tagged template
function highlight(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce(
    (result: string, str: string, i: number): string =>
      result + str + (values[i] !== undefined ? `<strong>${String(values[i])}</strong>` : ''),
    '',
  );
}

const highlighted: string = highlight`Name: ${name}, Age: ${age}`;
// "Name: <strong>Alice</strong>, Age: <strong>25</strong>"
```

### 4. Destructuring

**Array Destructuring**

### 💡 **Array Pattern Matching**

Destructuring extracts values from arrays into variables based on position.

**Basic Pattern:**

```typescript
const [first, second, third] = array;
// Unpacks by position
```

**Key Features:**

**1. Position-Based Extraction:**
```typescript
const numbers: number[] = [1, 2, 3, 4, 5];

// ❌ Old way
const firstOld: number = numbers[0];
const secondOld: number = numbers[1];

// ✅ Destructuring
const [first, second] = numbers;
```

**2. Skipping Elements:**
```typescript
const [first, , third] = [1, 2, 3, 4, 5];
// first = 1, third = 3
// Leave empty slot to skip
```

**3. Rest Pattern (Gather Remaining):**
```typescript
const [head, ...tail] = [1, 2, 3, 4, 5];
// head = 1
// tail = [2, 3, 4, 5]
```

**4. Default Values:**
```typescript
const [a, b, c = 0] = [1, 2];
// a = 1, b = 2, c = 0 (default)
```

**5. Variable Swapping:**
```typescript
let x: number = 1;
let y: number = 2;
[x, y] = [y, x]; // Swap with no temporary
// x = 2, y = 1
```

**Perfect Use Cases:**

**React Hooks:**
```typescript
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);
```

**Function Returns:**
```typescript
// The tuple return type is what makes the destructuring typed — without it
// TypeScript infers number[] and both bindings become number | undefined
function getCoordinates(): [number, number] {
  return [10, 20];
}
const [x, y] = getCoordinates();
```

**Iterables:**
```typescript
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
```typescript
const matrix: number[][] = [
  [1, 2],
  [3, 4],
];
const [[a, b], [c, d]] = matrix;
// a=1, b=2, c=3, d=4
```

**With Default + Rest:**
```typescript
const [first = 0, ...rest]: number[] = [];
// first = 0, rest = []
```

**Common Patterns:**

**1. Tuple Returns:**
```typescript
function getMinMax(arr: readonly number[]): [number, number] {
  return [Math.min(...arr), Math.max(...arr)];
}
const [min, max] = getMinMax([1, 5, 3]);
```

**2. Splitting Strings:**
```typescript
const [firstName, lastName] = 'John Doe'.split(' ');
```

**3. Pagination:**
```typescript
const [first, second, ...remaining] = items;
```

**Key Insight:**
> Array destructuring is **position-based** - order matters. This makes it perfect for tuple-like data (coordinates, ranges) and function returns where order is meaningful.

```typescript
const numbers: number[] = [1, 2, 3, 4, 5];

// Traditional
const firstIndexed: number = numbers[0];
const secondIndexed: number = numbers[1];

// Destructuring
const [a, b, c] = numbers;
console.log(a, b, c); // 1 2 3

// Skip
const [x, , z] = numbers;
console.log(x, z); // 1 3

// Rest
const [head, ...tail] = numbers;
console.log(head); // 1
console.log(tail); // [2, 3, 4, 5]

// Defaults
const [p, q, r = 0] = [1, 2];
console.log(r); // 0

// Swap
let m: number = 1;
let n: number = 2;
[m, n] = [n, m];
console.log(m, n); // 2 1
```

**Object Destructuring**

**Object Pattern Matching** - Extracts properties from objects with support for renaming, default values, nested destructuring, and function parameter destructuring.

```typescript
interface Address {
  city: string;
  country: string;
}

interface Profile {
  name: string;
  age: number;
  email: string;
  address: Address;
  role?: string;
}

const user: Profile = {
  name: 'Alice',
  age: 25,
  email: 'alice@example.com',
  address: { city: 'New York', country: 'USA' },
};

// Basic
const { name, age } = user;
console.log(name, age); // "Alice" 25

// Rename
const { name: userName, age: userAge } = user;
console.log(userName, userAge); // "Alice" 25

// Default — fires only when the property is `undefined`
const { role = 'user' } = user;
console.log(role); // "user"

// Nested. Note this binds `city` and `country`, not `address`
const {
  address: { city, country },
} = user;
console.log(city, country); // "New York" "USA"

// Rest properties
const { name: justName, ...rest } = user;
console.log(rest); // { age, email, address }

// In a parameter list — the annotation goes on the whole pattern
function greetProfile({ name, age }: Pick<Profile, 'name' | 'age'>): void {
  console.log(`Hello ${name}, you are ${age}`);
}

greetProfile(user); // "Hello Alice, you are 25"
```

### 5. Spread and Rest Operators

**Spread Operator (...)**

**Expanding Iterables** - Spreads array/object elements for concatenation, copying, merging objects, and passing multiple arguments to functions.

```typescript
const arr1: number[] = [1, 2, 3];
const arr2: number[] = [4, 5, 6];

// Concatenate
const combined: number[] = [...arr1, ...arr2];
console.log(combined); // [1, 2, 3, 4, 5, 6]

// Copy — shallow. Nested objects are still shared
const copy: number[] = [...arr1];

// Insert
const extended: number[] = [0, ...arr1, 4];
console.log(extended); // [0, 1, 2, 3, 4]

const obj1 = { a: 1, b: 2 };
const obj2 = { c: 3, d: 4 };

// Merge
const merged = { ...obj1, ...obj2 };
console.log(merged); // { a: 1, b: 2, c: 3, d: 4 }

// Later keys win, which is how you "update" immutably
const updated = { ...obj1, b: 99 };
console.log(updated); // { a: 1, b: 99 }

// Spreading into a call
const spreadNumbers: number[] = [1, 2, 3];
console.log(Math.max(...spreadNumbers)); // 3
```

**Rest Parameters**

**Gathering Remaining Arguments** - Collects remaining function arguments into an array, replacing the need for the arguments object with clearer syntax.

```typescript
// Rest gathers; spread scatters. Same `...`, opposite directions
function sum(...numbers: number[]): number {
  return numbers.reduce((total: number, num: number): number => total + num, 0);
}

console.log(sum(1, 2, 3)); // 6
console.log(sum(1, 2, 3, 4, 5)); // 15

function greetAll(greeting: string, ...names: string[]): string {
  return `${greeting} ${names.join(' and ')}!`;
}

console.log(greetAll('Hello', 'Alice', 'Bob', 'Charlie'));
// "Hello Alice and Bob and Charlie!"
```

### 6. Default Parameters

**Function Parameter Defaults** - Sets default values for function parameters including expressions and references to other parameters, eliminating manual checks.

```typescript
// ❌ `||` also replaces '' and 0. A default does not
function greetOld(name: string): string {
  name = name || 'Guest';
  return `Hello, ${name}`;
}

// ✅ A default fires only on `undefined`
function greetDefault(name = 'Guest'): string {
  return `Hello, ${name}`;
}

console.log(greetDefault()); // "Hello, Guest"
console.log(greetDefault('Alice')); // "Hello, Alice"

// Defaults are expressions, evaluated per call
function createUser(name: string, id: number = Date.now()): { name: string; id: number } {
  return { name, id };
}

// A default can read parameters to its left, but not to its right
function greetFull(name: string, greeting: string = `Hello ${name}`): string {
  return greeting;
}

console.log(greetFull('Alice')); // "Hello Alice"
```

### 7. Object Literals (Enhanced)

**Enhanced Object Syntax** - Property shorthand, method shorthand, and computed property names make object creation more concise and dynamic.

```typescript
const personName: string = 'Alice';
const personAge: number = 25;

// Property shorthand
const shorthandUser = {
  name: personName,
  age: personAge,
};

// Method shorthand
const calculator = {
  // Old way
  add: function (a: number, b: number): number {
    return a + b;
  },

  // Shorthand
  subtract(a: number, b: number): number {
    return a - b;
  },
};

// Computed keys. `as const` keeps the literal type, so `person` gets real
// `email` and `emailVerified` properties rather than an index signature
const prop = 'email' as const;
const person = {
  name: 'Bob',
  [prop]: 'bob@example.com',
  [`${prop}Verified`]: true,
};
```

### 8. Classes

**Class Syntax** - Modern class syntax with constructors, instance methods, getters/setters, static methods, and inheritance through extends/super keywords.

```typescript
class Person {
  name: string;
  age: number;

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  // Instance method — lives on the prototype, shared by every instance
  greet(): string {
    return `Hello, I'm ${this.name}`;
  }

  // Getter — read as a property, recomputed on each access
  get info(): string {
    return `${this.name}, ${this.age} years old`;
  }

  // Setter — assigned as a property
  set birthYear(year: number) {
    this.age = new Date().getFullYear() - year;
  }

  // Static — on the class itself, not on instances
  static species(): string {
    return 'Homo sapiens';
  }
}

const alice = new Person('Alice', 25);
console.log(alice.greet()); // "Hello, I'm Alice"
console.log(alice.info); // "Alice, 25 years old" — no parentheses
console.log(Person.species()); // "Homo sapiens"

// Inheritance
class Student extends Person {
  grade: string;

  constructor(name: string, age: number, grade: string) {
    super(name, age); // Must run before any use of `this`
    this.grade = grade;
  }

  study(): string {
    return `${this.name} is studying`;
  }
}

const bob = new Student('Bob', 20, 'A');
console.log(bob.greet()); // Inherited
console.log(bob.study()); // Its own
```

### 9. Modules

**Exporting**

**ES6 Module Exports** - Named exports for multiple values and default export for primary value, enabling modular code organization.

```typescript
// math.ts

// Named exports
export const PI = 3.14159;
export function add(a: number, b: number): number {
  return a + b;
}

// Or declare first and export in one statement
const subtract = (a: number, b: number): number => a - b;
const multiply = (a: number, b: number): number => a * b;

export { subtract, multiply };

// One default export per module. A named export renames loudly across a
// codebase; a default renames silently at every import site
export default class Calculator {
  // ...
}
```

**Importing**

**ES6 Module Imports** - Import named exports, default exports, rename imports, or import all exports with various import syntax options.

```typescript
// app.ts

// Named imports — these are what a bundler can tree-shake
import { PI, add, subtract } from './math.js';

// Rename on import
import { PI as pi, add as sum } from './math.js';

// Namespace import. Convenient, but usually defeats tree-shaking
import * as MathUtils from './math.js';
console.log(MathUtils.PI);
console.log(MathUtils.add(1, 2));

// Default import — the local name is yours to choose
import Calculator from './math.js';

// Both at once
import CalculatorClass, { PI as piValue, add as addFn } from './math.js';
```

### 10. Promises

**Promise-Based Async** - Handles asynchronous operations with promises using then/catch/finally, Promise.all, and Promise.race for multiple operations.

```typescript
interface Payload {
  data: string;
}

const fetchData = (): Promise<Payload> =>
  new Promise<Payload>((resolve, reject): void => {
    setTimeout((): void => {
      const success = true;
      if (success) {
        resolve({ data: 'Hello' });
      } else {
        reject(new Error('Failed'));
      }
    }, 1000);
  });

fetchData()
  .then((result: Payload): void => console.log(result))
  .catch((error: unknown): void => console.error(error))
  .finally((): void => console.log('Done'));

// Promise.all — all must succeed, and the tuple type is preserved
void Promise.all([fetch('/api/user'), fetch('/api/posts'), fetch('/api/comments')])
  .then(([user, posts, comments]): void => {
    // Every one resolved
  })
  .catch((error: unknown): void => {
    // Any one rejected
  });

// Promise.race — first to settle, which includes first to reject
void Promise.race([fetchData(), fetchDataFromCache()]).then((result: Payload): void =>
  console.log('Fastest:', result),
);
```

### 11. Async/Await

**Synchronous-Looking Async Code** - Async/await syntax makes promise-based code look synchronous with try/catch error handling, improving readability.

```typescript
interface ApiUser {
  id: number;
}

// Promise chain
function getUserData(): Promise<void> {
  return fetch('/api/user')
    .then((response: Response) => response.json() as Promise<ApiUser>)
    .then((user: ApiUser) => fetch(`/api/posts/${user.id}`))
    .then((response: Response) => response.json())
    .then((posts: unknown): void => console.log(posts))
    .catch((error: unknown): void => console.error(error));
}

// ✅ Same thing, linear
async function getUserDataAsync(): Promise<void> {
  try {
    const response: Response = await fetch('/api/user');
    const user = (await response.json()) as ApiUser;

    const postsResponse: Response = await fetch(`/api/posts/${user.id}`);
    const posts: unknown = await postsResponse.json();

    console.log(posts);
  } catch (error: unknown) {
    console.error(error);
  }
}

async function fetchMultiple(): Promise<void> {
  try {
    // ❌ Sequential — the second request waits on the first for no reason
    const user: Response = await fetch('/api/user');
    const posts: Response = await fetch('/api/posts');

    // ✅ Parallel — both start before either is awaited
    const [userRes, postsRes] = await Promise.all([fetch('/api/user'), fetch('/api/posts')]);

    const userData: unknown = await userRes.json();
    const postsData: unknown = await postsRes.json();
  } catch (error: unknown) {
    console.error(error);
  }
}
```

### 12. Symbols

**Unique Identifiers** - Symbols create unique, non-enumerable property keys, useful for meta-programming and avoiding property name collisions.

```typescript
// Every Symbol() call returns a value equal to nothing but itself. The string
// is a description for debugging, not an identity
const id1: symbol = Symbol('id');
const id2: symbol = Symbol('id');

console.log(id1 === id2); // false

// As a key — a symbol key cannot collide with anyone else's
const symbolUser = {
  name: 'Alice',
  [id1]: 123,
};

console.log(symbolUser[id1]); // 123
console.log(symbolUser.name); // 'Alice'

// Symbol keys are skipped by Object.keys, JSON.stringify and for…in
console.log(Object.keys(symbolUser)); // ['name']

// Well-known symbols hook into language behaviour
const symbolArr: number[] = [1, 2, 3];
const iterator: Iterator<number> = symbolArr[Symbol.iterator]();
console.log(iterator.next()); // { value: 1, done: false }
```

### 13. Iterators and Generators

**Iterators**

**Custom Iteration Protocol** - Implements the iterator protocol with Symbol.iterator and next() method for custom iterable objects.

```typescript
// Implementing Symbol.iterator is what makes an object work with for…of,
// spread and array destructuring
function makeRange(from: number, to: number): Iterable<number> {
  return {
    [Symbol.iterator](): Iterator<number> {
      let current: number = from;

      return {
        next(): IteratorResult<number> {
          return current <= to
            ? { value: current++, done: false }
            : { value: undefined, done: true };
        },
      };
    },
  };
}

for (const num of makeRange(1, 5)) {
  console.log(num); // 1, 2, 3, 4, 5
}
```

**Generators**

**Generator Functions** - Functions that can pause and resume execution using yield, creating iterators more easily than manual iterator protocol.

```typescript
// A generator writes the same iterator in a fraction of the code
function* numberGenerator(): Generator<number, void, undefined> {
  yield 1;
  yield 2;
  yield 3;
}

const gen = numberGenerator();
console.log(gen.next()); // { value: 1, done: false }
console.log(gen.next()); // { value: 2, done: false }
console.log(gen.next()); // { value: 3, done: false }
console.log(gen.next()); // { value: undefined, done: true }

// Infinite is fine — nothing is computed until it is asked for
function* idGenerator(): Generator<number, never, undefined> {
  let id: number = 1;
  while (true) {
    yield id++;
  }
}

const ids = idGenerator();
console.log(ids.next().value); // 1
console.log(ids.next().value); // 2

function* fibonacci(): Generator<number, never, undefined> {
  let [a, b]: [number, number] = [0, 1];
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

```typescript
// Map beats a plain object for three reasons: any value can be a key,
// insertion order is guaranteed, and `size` is O(1)
const map = new Map<unknown, unknown>();

map.set('name', 'Alice');
map.set('age', 25);
map.set(1, 'one'); // A number key stays a number, not '1'

console.log(map.get('name')); // 'Alice'
console.log(map.size); // 3
console.log(map.has('age')); // true

// Object identity as a key — impossible with a plain object
const keyObj = { id: 1 };
map.set(keyObj, 'value');
console.log(map.get(keyObj)); // 'value'

for (const [key, value] of map) {
  console.log(`${String(key)}: ${String(value)}`);
}

// Constructing from entries
const mapFromArray = new Map<string, number>([
  ['a', 1],
  ['b', 2],
]);
```

**Set**

**Unique Value Collections** - Set stores unique values of any type, perfect for removing duplicates and membership testing.

```typescript
// A Set holds each value once, compared by SameValueZero — so objects are
// deduplicated by identity, not by shape
const set = new Set<number>();

set.add(1);
set.add(2);
set.add(2); // Ignored
set.add(3);

console.log(set.size); // 3
console.log(set.has(2)); // true — O(1), unlike Array.includes

// The idiomatic deduplication
const dupNumbers: number[] = [1, 2, 2, 3, 3, 4];
const unique: number[] = [...new Set(dupNumbers)];
console.log(unique); // [1, 2, 3, 4]

for (const value of set) {
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
