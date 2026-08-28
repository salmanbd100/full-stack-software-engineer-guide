# Array and Object Methods {#ch-array-and-object-methods}

> Pick the method that says what you mean, and know which ones mutate the thing you passed in.

**In this chapter:** `map`, `filter`, `reduce` · finding and testing · flattening · which methods mutate · `Object.entries`, `keys` and `values`

## Why Array & Object Methods Matter

**Interview Perspective:**
- Most common coding questions involve array manipulation
- Tests functional programming understanding
- Demonstrates knowledge of method chaining and composition
- `map`/`filter`/`reduce` appear in 70%+ of technical interviews

**Real-World Importance:**
- **Data Transformation**: API responses, state management, data processing
- **Performance**: Built-in methods are optimized by JavaScript engines
- **Readability**: Declarative code is easier to understand than imperative loops
- **Framework Integration**: React, Vue heavily use array methods for rendering lists

## Method Categories Overview

### **Transformation Methods** (Return new array)
- `map()` - Transform each element
- `filter()` - Select elements matching criteria
- `reduce()` - Reduce to single value
- `flatMap()` - Map and flatten

### **Search Methods** (Return element/index/boolean)
- `find()` / `findIndex()` - First match
- `includes()` / `indexOf()` - Check existence
- `some()` / `every()` - Test conditions

### **Mutation Methods** (Modify original)
- `push()` / `pop()` / `shift()` / `unshift()` - Add/remove
- `splice()` - Add/remove at index
- `sort()` / `reverse()` - Reorder

### **Iteration Methods**
- `forEach()` - Execute for each
- `for...of` - Iterate values

## Quick Reference Table

| Method | Returns | Mutates | Use When |
|--------|---------|---------|----------|
| `map()` | New array (same length) | No | Transform each element |
| `filter()` | New array (≤ length) | No | Select subset |
| `reduce()` | Single value | No | Aggregate data |
| `find()` | Element or undefined | No | Get first match |
| `some()` | Boolean | No | Check if any pass |
| `every()` | Boolean | No | Check if all pass |
| `forEach()` | undefined | No | Side effects only |
| `sort()` | Same array | **Yes** | Reorder elements |

## 📚 Array Methods

### 1. Transformation Methods

**map() - Transform Each Element**

### 💡 **Array Transformation with map()**

`map()` is the fundamental functional programming pattern for transforming arrays.

**How map() Works:**

```text
array.map(callback(element, index, array))
→ Returns: New array with transformed elements
→ Original array: Unchanged (immutable)
```

**Key Characteristics:**

**1. Creates New Array:**
- Same length as original
- Each element transformed by callback
- Original array untouched (immutable)

**2. Callback Parameters:**
```text
array.map((element, index, fullArray) => {
    // element: current item
    // index: current position
    // fullArray: reference to original array
    return transformedElement;
})
```

**3. Return Value:**
- **map()**: New array
- **forEach()**: `undefined` (side-effects only)

**Perfect Use Cases:**

✅ **Extract properties from objects:**
```typescript
const users: { name: string }[] = [{ name: 'Alice' }, { name: 'Bob' }];
const names: string[] = users.map((u): string => u.name); // ['Alice', 'Bob']
```

✅ **Convert types:**
```typescript
const strings: string[] = ['1', '2', '3'];
const numbers: number[] = strings.map(Number); // [1, 2, 3]
```

✅ **Reformat data:**
```typescript
const prices: number[] = [10, 20, 30];
const formatted: string[] = prices.map((p: number): string => `$${p}`); // ['$10', '$20', '$30']
```

✅ **Add computed properties:**
```typescript
interface Product {
  price: number;
}

const products: Product[] = [{ price: 10 }, { price: 20 }];
// The parentheses around the object are required — without them the braces
// read as a function body
const withTax = products.map((p: Product) => ({
  ...p,
  priceWithTax: p.price * 1.1,
}));
```

**When to Use map() vs forEach():**

| Need | Use | Returns |
|------|-----|---------|
| Transform each element | `map()` | New array |
| Side effects only | `forEach()` | `undefined` |
| New array same length | `map()` | New array |
| Logging, DOM updates | `forEach()` | `undefined` |

**Common Mistakes:**

❌ **Using forEach for transformation:**
```typescript
// ❌ Imperative — a mutable accumulator and a side effect
const doubled: number[] = [];
numbers.forEach((n: number): void => {
  doubled.push(n * 2);
});
```

✅ **Use map instead:**
```typescript
// ✅ Declarative — one expression, and the result is a value
const doubled: number[] = numbers.map((n: number): number => n * 2);
```

**Why map() Matters:**

**For React/Vue:**
```tsx
// Rendering lists — `key` is what lets React match elements between renders
{users.map((user: User) => (
  <UserCard key={user.id} user={user} />
))}
```

**For Data Processing:**
```typescript
interface ApiItem {
  id: number;
  attributes: { name: string };
}

// Flattening an API shape at the boundary keeps the rest of the app clean
const simplified = apiResponse.map((item: ApiItem) => ({
  id: item.id,
  name: item.attributes.name,
}));
```

**Performance Note:**
> Built-in methods like `map()` are optimized by JavaScript engines. They're often faster than hand-written loops and always more readable.

```typescript
interface Person {
  name: string;
  age: number;
}

const numbers: number[] = [1, 2, 3, 4, 5];

// Transform each element. The original array is untouched
const doubled: number[] = numbers.map((n: number): number => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

const people: Person[] = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 },
];

const names: string[] = people.map((person: Person): string => person.name);
console.log(names); // ['Alice', 'Bob', 'Charlie']

// The second parameter is the index
const withIndex: string[] = numbers.map((num: number, index: number): string => `${index}: ${num}`);
console.log(withIndex); // ['0: 1', '1: 2', '2: 3', '3: 4', '4: 5']
```

**filter() - Select Elements**

**Array Filtering** - Creates a new array with elements that pass a test condition, perfect for data filtering and search.

```typescript
interface ActivePerson {
  name: string;
  age: number;
  active: boolean;
}

const numbers: number[] = [1, 2, 3, 4, 5, 6];

// filter keeps elements whose predicate is truthy; the length can change,
// the element type cannot
const evens: number[] = numbers.filter((n: number): boolean => n % 2 === 0);
console.log(evens); // [2, 4, 6]

const people: ActivePerson[] = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true },
];

const activeUsers: ActivePerson[] = people.filter((person: ActivePerson): boolean => person.active);
const adults: ActivePerson[] = people.filter((person: ActivePerson): boolean => person.age >= 30);
```

**reduce() - Reduce to Single Value**

### 💡 **Array Reduction - The Swiss Army Knife**

`reduce()` is the **most powerful and versatile** array method.

**How reduce() Works:**

```text
array.reduce(callback(accumulator, currentValue, index, array), initialValue)
→ Returns: Single value (any type)
```

**The Accumulator Pattern:**

```text
                    ┌─────────────┐
Initial Value  →   │ Accumulator  │
                    └──────┬───────┘
                           ↓
[1, 2, 3, 4].reduce  → Iteration 1: acc=0, val=1 → return 1
                     → Iteration 2: acc=1, val=2 → return 3
                     → Iteration 3: acc=3, val=3 → return 6
                     → Iteration 4: acc=6, val=4 → return 10
                           ↓
                    Final Result: 10
```

**Key Concepts:**

**1. Accumulator:**
- Carries state between iterations
- What you `return` becomes next accumulator
- Initialized by `initialValue`

**2. Parameters:**
```text
array.reduce((accumulator, currentValue, index, array) => {
    // accumulator: running total/result
    // currentValue: current element
    // index: current position
    // array: original array
    return newAccumulator;
}, initialValue);
```

**3. Initial Value:**
```typescript
// ✅ With an initial value — also the only form that survives an empty array
[1, 2, 3].reduce((sum: number, n: number): number => sum + n, 0);

// ⚠️ Without one, the first element becomes the accumulator and the callback
// runs one fewer time. On an empty array this throws
[1, 2, 3].reduce((sum: number, n: number): number => sum + n);
```

**Common Patterns:**

**Pattern 1: Sum/Product**
```typescript
const sum: number = numbers.reduce((total: number, n: number): number => total + n, 0);
const product: number = numbers.reduce((total: number, n: number): number => total * n, 1);
```

**Pattern 2: Group by Property**
```typescript
// The initial value's type is the accumulator's type, so annotate it there
const grouped = users.reduce<Record<string, User[]>>((acc, user: User) => {
  const role: string = user.role;
  acc[role] ??= [];
  acc[role].push(user);
  return acc;
}, {});
// { admin: [...], user: [...] }
```

**Pattern 3: Create Lookup Object**
```typescript
// Turning a list into a lookup is the reduce that earns its keep — it turns
// an O(n) find into an O(1) read
const lookup = users.reduce<Record<number, User>>((acc, user: User) => {
  acc[user.id] = user;
  return acc;
}, {});
```

**Pattern 4: Flatten Array**
```typescript
const flattened: number[] = [
  [1, 2],
  [3, 4],
].reduce<number[]>((acc, arr: number[]) => acc.concat(arr), []);
// [1, 2, 3, 4] — though `.flat()` says this more directly
```

**Pattern 5: Count Occurrences**
```typescript
const counts = items.reduce<Record<string, number>>((acc, item: string) => {
  acc[item] = (acc[item] ?? 0) + 1;
  return acc;
}, {});
// { apple: 3, banana: 2, … }
```

**Why reduce() is Powerful:**

| Capability | Example |
|------------|---------|
| Can implement `map()` | `reduce((acc, n) => [...acc, n*2], [])` |
| Can implement `filter()` | `reduce((acc, n) => n>5 ? [...acc, n] : acc, [])` |
| Can implement `find()` | `reduce((acc, n) => acc || (n>5 ? n : null), null)` |
| Transform to any type | Array → Object, Object → Array, etc. |

**Common Mistakes:**

❌ **Forgetting initial value:**
```typescript
// ⚠️ Without an initial value the first element *is* the accumulator, so 'a'
// is never uppercased — the result is 'aBC', not 'ABC'
['a', 'b', 'c'].reduce((acc: string, char: string): string => acc + char.toUpperCase());
```

✅ **Always provide initial value:**
```typescript
// ✅ Starting from '' means every element goes through the callback: 'ABC'
['a', 'b', 'c'].reduce((acc: string, char: string): string => acc + char.toUpperCase(), '');
```

❌ **Forgetting to return:**
```typescript
// ❌ The block computes and discards. The accumulator becomes undefined
const sum = numbers.reduce((total: number, n: number): number => {
  total + n;
}, 0);
```

✅ **Always return accumulator:**
```typescript
// ✅ Return it — or drop the braces for an implicit return
const sum: number = numbers.reduce((total: number, n: number): number => {
  return total + n;
}, 0);
```

**When to Use reduce():**

| Use Case | Best Method |
|----------|-------------|
| Sum/product/aggregation | `reduce()` |
| Transform data structure | `reduce()` |
| Group/categorize | `reduce()` |
| Simple transformation | `map()` (clearer) |
| Filtering | `filter()` (clearer) |

**Pro Tip:**
> While `reduce()` can do anything, prefer `map()`/`filter()` when they're clearer. Use `reduce()` for true aggregation and data structure transformation.

```typescript
interface RoledUser {
  name: string;
  role: string;
}

const numbers: number[] = [1, 2, 3, 4, 5];

const sum: number = numbers.reduce((total: number, num: number): number => total + num, 0);
console.log(sum); // 15

const product: number = numbers.reduce((result: number, num: number): number => result * num, 1);
console.log(product); // 120

// No initial value, which is fine here — but it throws on an empty array
const max: number = numbers.reduce((acc: number, num: number): number => (num > acc ? num : acc));
console.log(max); // 5

const fruits: string[] = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple'];
const count = fruits.reduce<Record<string, number>>((acc, fruit: string) => {
  acc[fruit] = (acc[fruit] ?? 0) + 1;
  return acc;
}, {});
console.log(count); // { apple: 3, banana: 2, orange: 1 }

const roledUsers: RoledUser[] = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob', role: 'user' },
  { name: 'Charlie', role: 'admin' },
];

const grouped = roledUsers.reduce<Record<string, RoledUser[]>>((acc, user: RoledUser) => {
  acc[user.role] ??= [];
  acc[user.role].push(user);
  return acc;
}, {});
// { admin: [Alice, Charlie], user: [Bob] }
```

**flatMap() - Map and Flatten**

**Map and Flatten Combined** - Maps each element and flattens the result one level, combining map() and flat() in a single operation.

```typescript
// flatMap is map followed by flat(1). Returning [] from the callback is also
// how you filter and map in one pass
const sentences: string[] = ['Hello world', 'How are you'];

const words: string[] = sentences.flatMap((sentence: string): string[] => sentence.split(' '));
console.log(words); // ['Hello', 'world', 'How', 'are', 'you']

const flatNumbers: number[] = [1, 2, 3];
const duplicated: number[] = flatNumbers.flatMap((n: number): number[] => [n, n]);
console.log(duplicated); // [1, 1, 2, 2, 3, 3]
```

### 2. Search Methods

**find() - First Matching Element**

**Finding Single Element** - Returns the first element that satisfies a condition or undefined, ideal for finding specific items.

```typescript
interface IdName {
  id: number;
  name: string;
}

const users: IdName[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

// The return type is `IdName | undefined`, so TypeScript forces you to handle
// the miss — which is the whole advantage over filter()[0]
const user: IdName | undefined = users.find((u: IdName): boolean => u.id === 2);
console.log(user); // { id: 2, name: 'Bob' }

const notFound: IdName | undefined = users.find((u: IdName): boolean => u.id === 999);
console.log(notFound); // undefined
```

**findIndex() - Index of First Match**
```typescript
const numbers: number[] = [10, 20, 30, 40];

const index: number = numbers.findIndex((n: number): boolean => n > 25);
console.log(index); // 2

// -1, not undefined. Check with `=== -1`, never with a truthiness test —
// index 0 is falsy
const notFound: number = numbers.findIndex((n: number): boolean => n > 100);
console.log(notFound); // -1
```

**includes() - Check if Element Exists**
```typescript
const fruits: string[] = ['apple', 'banana', 'orange'];

console.log(fruits.includes('banana')); // true
console.log(fruits.includes('grape')); // false

// Optional start index
console.log(fruits.includes('apple', 1)); // false

// includes uses SameValueZero, indexOf uses strict equality — which is why
// only one of them can find NaN
const values: number[] = [1, 2, NaN, 4];
console.log(values.includes(NaN)); // true
console.log(values.indexOf(NaN)); // -1
```

**indexOf() / lastIndexOf()**
```typescript
const numbers: number[] = [1, 2, 3, 2, 1];

console.log(numbers.indexOf(2)); // 1 — first occurrence
console.log(numbers.lastIndexOf(2)); // 3 — last occurrence
console.log(numbers.indexOf(99)); // -1 — not found
```

**some() - Test if Any Match**

**Existence Check** - Returns true if at least one element passes the test, useful for checking if any condition is met.

```typescript
const numbers: number[] = [1, 2, 3, 4, 5];

// some short-circuits on the first true
const hasEven: boolean = numbers.some((n: number): boolean => n % 2 === 0);
console.log(hasEven); // true

const hasLarge: boolean = numbers.some((n: number): boolean => n > 100);
console.log(hasLarge); // false

const roleUsers: RoledUser[] = [
  { name: 'Alice', role: 'user' },
  { name: 'Bob', role: 'admin' },
];

const hasAdmin: boolean = roleUsers.some((u: RoledUser): boolean => u.role === 'admin');
console.log(hasAdmin); // true
```

**every() - Test if All Match**

**Universal Check** - Returns true only if all elements pass the test, useful for validation and condition checking.

```typescript
const numbers: number[] = [2, 4, 6, 8];

// every short-circuits on the first false, and returns true for an empty array
const allEven: boolean = numbers.every((n: number): boolean => n % 2 === 0);
console.log(allEven); // true

const allPositive: boolean = numbers.every((n: number): boolean => n > 0);
console.log(allPositive); // true

const allLarge: boolean = numbers.every((n: number): boolean => n > 5);
console.log(allLarge); // false
```

### 3. Array Manipulation

**slice() - Extract Portion (Doesn't Modify)**
```typescript
// slice does not mutate. splice does. The names are one letter apart and the
// behaviour is opposite, which is why this trips people up
const fruits: string[] = ['apple', 'banana', 'orange', 'grape', 'melon'];

const someOf: string[] = fruits.slice(1, 3); // end is exclusive
console.log(someOf); // ['banana', 'orange']

const fromIndex: string[] = fruits.slice(2);
console.log(fromIndex); // ['orange', 'grape', 'melon']

const copy: string[] = fruits.slice(); // Shallow copy
console.log(copy);

// Negative counts back from the end
const last: string[] = fruits.slice(-2);
console.log(last); // ['grape', 'melon']
```

**splice() - Add/Remove Elements (Modifies Original)**
```typescript
// ⚠️ splice mutates in place and returns what it removed
const fruits: string[] = ['apple', 'banana', 'orange'];

const removed: string[] = fruits.splice(1, 1);
console.log(fruits); // ['apple', 'orange'] — the original changed
console.log(removed); // ['banana']

// Insert without removing: deleteCount of 0
fruits.splice(1, 0, 'grape', 'melon');
console.log(fruits); // ['apple', 'grape', 'melon', 'orange']

// Remove and insert in one call
fruits.splice(1, 2, 'kiwi');
console.log(fruits); // ['apple', 'kiwi', 'orange']
```

**concat() - Merge Arrays**
```typescript
const arr1: number[] = [1, 2];
const arr2: number[] = [3, 4];
const arr3: number[] = [5, 6];

const merged: number[] = arr1.concat(arr2, arr3);
console.log(merged); // [1, 2, 3, 4, 5, 6]

// ✅ Spread says the same thing more directly
const merged2: number[] = [...arr1, ...arr2, ...arr3];
```

**flat() - Flatten Nested Arrays**
```typescript
const nested: (number | (number | number[])[])[] = [1, [2, 3], [4, [5, 6]]];

console.log(nested.flat()); // depth 1 by default
console.log(nested.flat(2)); // [1, 2, 3, 4, 5, 6]
console.log(nested.flat(Infinity)); // Fully flattened

// flat also drops holes in a sparse array
const sparse: number[] = [1, , 3, , 5];
console.log(sparse.flat()); // [1, 3, 5]
```

### 4. Ordering Methods

**sort() - Sort Array (Modifies Original)**

**Array Sorting** - Sorts array in place using comparator function, crucial for numerical and custom sorting beyond alphabetical.

```typescript
// ⚠️ sort mutates. Use `[...arr].sort()` or `arr.toSorted()` to keep the original
const fruits: string[] = ['banana', 'apple', 'orange'];
fruits.sort();
console.log(fruits); // ['apple', 'banana', 'orange']

const numbers: number[] = [10, 5, 40, 25, 1000, 1];

// ❌ The default comparator converts to string first
numbers.sort();
console.log(numbers); // [1, 10, 1000, 25, 40, 5]

// ✅ A numeric comparator
numbers.sort((a: number, b: number): number => a - b);
console.log(numbers); // [1, 5, 10, 25, 40, 1000]

// Descending
numbers.sort((a: number, b: number): number => b - a);
console.log(numbers); // [1000, 40, 25, 10, 5, 1]

const people: Person[] = [
  { name: 'Charlie', age: 35 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
];

people.sort((a: Person, b: Person): number => a.age - b.age);
// Alice (25), Bob (30), Charlie (35)

// localeCompare, not `<` — `<` gets accents and case wrong
people.sort((a: Person, b: Person): number => a.name.localeCompare(b.name));
```

**reverse() - Reverse Array (Modifies Original)**
```typescript
// ⚠️ Also mutates. `toReversed()` is the non-mutating version
const numbers: number[] = [1, 2, 3, 4, 5];
numbers.reverse();
console.log(numbers); // [5, 4, 3, 2, 1]
```

### 5. Iteration Methods

**forEach() - Execute Function for Each**
```typescript
const fruits: string[] = ['apple', 'banana', 'orange'];

fruits.forEach((fruit: string, index: number): void => {
  console.log(`${index}: ${fruit}`);
});
// 0: apple
// 1: banana
// 2: orange

// `break` is not available, and `return` only exits the callback. Use for…of
// when you need to stop early, and note that `await` inside forEach is not
// awaited by the loop
```

**for...of - Iterate Values**
```typescript
const fruits: string[] = ['apple', 'banana', 'orange'];

for (const fruit of fruits) {
  console.log(fruit);
  if (fruit === 'banana') break; // Works, unlike inside forEach
}
```

### 6. Creation and Conversion

**Array.from() - Create from Iterable**

**Creating Arrays** - Creates arrays from array-like objects, iterables, with optional mapping function for transformation during creation.

```typescript
// Array.from takes anything iterable *or* array-like. Spread only takes iterables
const str: string = 'hello';
const chars: string[] = Array.from(str);
console.log(chars); // ['h', 'e', 'l', 'l', 'o']

const set = new Set<number>([1, 2, 3]);
const arr: number[] = Array.from(set);

// Array-like — has `length` and numeric keys, but no Symbol.iterator
const arrayLike: ArrayLike<string> = { 0: 'a', 1: 'b', 2: 'c', length: 3 };
const array: string[] = Array.from(arrayLike);
console.log(array); // ['a', 'b', 'c']

// The second argument maps as it builds, avoiding an intermediate array
const numbers: number[] = Array.from([1, 2, 3], (n: number): number => n * 2);
console.log(numbers); // [2, 4, 6]

// The idiomatic range
const range: number[] = Array.from({ length: 5 }, (_, i: number): number => i + 1);
console.log(range); // [1, 2, 3, 4, 5]
```

**Array.of() - Create from Arguments**
```typescript
const arr1: number[] = Array.of(1, 2, 3);
console.log(arr1); // [1, 2, 3]

// Array(3) means "length 3", Array.of(3) means "containing 3". Array.of exists
// only to remove that ambiguity
const arr2: number[] = Array(3); // [empty × 3]
const arr3: number[] = Array.of(3); // [3]
```

**join() - Array to String**
```typescript
const fruits: string[] = ['apple', 'banana', 'orange'];

console.log(fruits.join()); // 'apple,banana,orange' — comma by default
console.log(fruits.join(' ')); // 'apple banana orange'
console.log(fruits.join(' - ')); // 'apple - banana - orange'
```

## 📚 Object Methods

### 1. Object.keys() / values() / entries()

**Object Iteration Methods** - Extract keys, values, or key-value pairs from objects for iteration and transformation.

```typescript
const user = {
  name: 'Alice',
  age: 25,
  email: 'alice@example.com',
};

// All three skip inherited and symbol-keyed properties
const keys: string[] = Object.keys(user);
console.log(keys); // ['name', 'age', 'email']

const values: (string | number)[] = Object.values(user);
console.log(values); // ['Alice', 25, 'alice@example.com']

const entries: [string, string | number][] = Object.entries(user);
console.log(entries);
// [['name', 'Alice'], ['age', 25], ['email', 'alice@example.com']]

for (const [key, value] of Object.entries(user)) {
  console.log(`${key}: ${String(value)}`);
}
```

### 2. Object.assign()

**Object Merging** - Copies properties from source objects to target, useful for merging and shallow cloning (spread operator preferred).

```typescript
// ⚠️ Object.assign mutates its first argument
const target = { a: 1, b: 2 };
const source = { b: 3, c: 4 };

const result = Object.assign(target, source);
console.log(result); // { a: 1, b: 3, c: 4 }
console.log(target); // Also { a: 1, b: 3, c: 4 } — the original changed

// Passing {} first avoids that
const copy = Object.assign({}, user);

// ✅ Spread does the same thing and reads better
const copy2 = { ...user };

const merged = { ...obj1, ...obj2, ...obj3 };
```

### 3. Object.freeze() / seal()

**Object Immutability** - freeze() makes objects completely immutable, seal() prevents additions/deletions but allows modifications.

```typescript
// Both are shallow, and both fail silently outside strict mode. In a module —
// which is always strict — these assignments throw instead
const frozenUser: { name: string; age: number } = { name: 'Alice', age: 25 };

Object.freeze(frozenUser); // No adding, deleting or modifying
frozenUser.age = 30; // Throws in strict mode
console.log(frozenUser); // { name: 'Alice', age: 25 }

const product: { name: string; price: number } = { name: 'Phone', price: 500 };

Object.seal(product); // No adding or deleting, but modifying is fine
product.price = 600; // OK
console.log(product); // { name: 'Phone', price: 600 }

console.log(Object.isFrozen(frozenUser)); // true
console.log(Object.isSealed(product)); // true
```

### 4. Object.create()

```typescript
interface Greeter {
  name: string;
  greet(): void;
}

const personPrototype = {
  greet(this: Greeter): void {
    console.log(`Hello, I'm ${this.name}`);
  },
};

const alice = Object.create(personPrototype) as Greeter;
alice.name = 'Alice';
alice.greet(); // "Hello, I'm Alice"

// The second argument takes property descriptors, not plain values
const bob = Object.create(personPrototype, {
  name: { value: 'Bob', writable: true, enumerable: true },
}) as Greeter;
```

### 5. Object.hasOwnProperty() / in

```typescript
const ownUser = { name: 'Alice' };

// Own properties only. `Object.hasOwn(obj, key)` is the modern form and is
// safe on objects created with a null prototype
console.log(Object.hasOwn(ownUser, 'name')); // true
console.log(Object.hasOwn(ownUser, 'toString')); // false

// `in` walks the prototype chain
console.log('name' in ownUser); // true
console.log('toString' in ownUser); // true — from Object.prototype
```

### 6. Object.fromEntries()

**Creating Objects from Entries** - Converts key-value pair arrays or Maps into objects, inverse of Object.entries(), useful for transformations.

```typescript
// fromEntries is the inverse of entries, which is what makes the
// entries → transform → fromEntries round trip work on objects
const entryList: [string, string | number][] = [
  ['name', 'Alice'],
  ['age', 25],
  ['email', 'alice@example.com'],
];

const fromEntriesUser = Object.fromEntries(entryList);
console.log(fromEntriesUser);

const map = new Map<string, number>([
  ['a', 1],
  ['b', 2],
]);

const obj: Record<string, number> = Object.fromEntries(map);
console.log(obj); // { a: 1, b: 2 }

// Removing a key without mutating
const user2 = { name: 'Bob', age: 30, password: 'secret' };

const filtered = Object.fromEntries(
  Object.entries(user2).filter(([key]: [string, unknown]): boolean => key !== 'password'),
);
console.log(filtered); // { name: 'Bob', age: 30 }
```

## 🎯 Common Interview Questions

### Q1: What's the difference between map() and forEach()?

**Answer:**

**map vs forEach** - map() returns new array with transformed values, forEach() only iterates with no return value.

```typescript
const numbers: number[] = [1, 2, 3];

// forEach returns undefined. If you are assigning its result, you wanted map
const result1: void = numbers.forEach((n: number): number => n * 2);
console.log(result1); // undefined

const result2: number[] = numbers.map((n: number): number => n * 2);
console.log(result2); // [2, 4, 6]
```

### Q2: How to remove duplicates from an array?

**Answer: Multiple ways**

**Deduplication Techniques** - Three approaches using Set (best), filter with indexOf, or reduce with includes.

```typescript
const numbers: number[] = [1, 2, 2, 3, 3, 4];

// ✅ O(n), and says what it means
const unique1: number[] = [...new Set(numbers)];

// O(n²) — indexOf scans the array on every element
const unique2: number[] = numbers.filter((n: number, i: number): boolean => numbers.indexOf(n) === i);

// O(n²) and allocates a new array per element. Correct, but do not ship it
const unique3: number[] = numbers.reduce<number[]>(
  (acc, n: number) => (acc.includes(n) ? acc : [...acc, n]),
  [],
);
```

### Q3: How to group array of objects by property?

**Answer:**

**Grouping with reduce** - Uses reduce to group objects into categories based on a property value.

```typescript
const groupUsers: RoledUser[] = [
  { name: 'Alice', role: 'admin' },
  { name: 'Bob', role: 'user' },
  { name: 'Charlie', role: 'admin' },
];

const grouped = groupUsers.reduce<Record<string, RoledUser[]>>((acc, user: RoledUser) => {
  acc[user.role] ??= [];
  acc[user.role].push(user);
  return acc;
}, {});

console.log(grouped);
// { admin: [Alice, Charlie], user: [Bob] }
```

## 💡 Practical Examples

### Example 1: Data Transformation Pipeline

**Method Chaining** - Chains multiple array methods (filter, map) to create data processing pipelines.

```typescript
interface Candidate {
  name: string;
  age: number;
  active: boolean;
  score: number;
}

const candidates: Candidate[] = [
  { name: 'Alice', age: 25, active: true, score: 85 },
  { name: 'Bob', age: 17, active: false, score: 92 },
  { name: 'Charlie', age: 30, active: true, score: 78 },
];

// Three filters read better than one compound predicate, and cost three passes.
// At this size that is free; at a million elements, combine them
const result: string[] = candidates
  .filter((u: Candidate): boolean => u.active)
  .filter((u: Candidate): boolean => u.age >= 18)
  .filter((u: Candidate): boolean => u.score > 80)
  .map((u: Candidate): string => u.name);

console.log(result); // ['Alice']
```

### Example 2: Calculate Statistics

**Aggregation with reduce** - Uses reduce to calculate multiple statistics (sum, count, min, max, average) in one pass.

```typescript
interface Stats {
  sum: number;
  count: number;
  min: number;
  max: number;
  average?: number;
}

const scores: number[] = [85, 92, 78, 95, 88];

// One pass for four statistics — this is where reduce beats four separate calls
const stats: Stats = scores.reduce<Stats>(
  (acc, score: number) => {
    acc.sum += score;
    acc.count++;
    acc.min = Math.min(acc.min, score);
    acc.max = Math.max(acc.max, score);
    return acc;
  },
  { sum: 0, count: 0, min: Infinity, max: -Infinity },
);

stats.average = stats.sum / stats.count;
console.log(stats);
// { sum: 438, count: 5, min: 78, max: 95, average: 87.6 }
```

### Example 3: Deep Clone Object

**Deep vs Shallow Cloning** - Compares shallow cloning with spread operator versus deep cloning with JSON or structuredClone.

```typescript
interface WithAddress {
  name: string;
  address: { city: string };
}

// Shallow clone — the nested object is still shared
const cloneUser: WithAddress = {
  name: 'Alice',
  address: { city: 'NYC' },
};

const shallow: WithAddress = { ...cloneUser };
shallow.address.city = 'LA';
console.log(cloneUser.address.city); // 'LA' — the original changed

// ✅ structuredClone handles Date, Map, Set and cycles. The JSON round trip
// silently drops functions and undefined, and turns Dates into strings
const deep: WithAddress = structuredClone(cloneUser);
deep.address.city = 'Chicago';
console.log(cloneUser.address.city); // 'LA' — unchanged
```

## 🔗 Related Topics

- [ES6+ Features](./08-es6-features.md)
- [Functions & Scope](./02-functions-scope.md)

---

[← Back to JavaScript](./README.md)
