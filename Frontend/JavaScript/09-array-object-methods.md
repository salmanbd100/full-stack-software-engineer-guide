# Array & Object Methods

Mastering array and object methods is essential for efficient JavaScript programming and one of the most practical skills tested in interviews. These methods enable functional programming patterns, reduce code complexity, and are the foundation of modern JavaScript development.

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

**Array Transformation** - map() is the fundamental functional programming pattern for transforming arrays - it creates a new array with the same length, applying a transformation function to each element. This immutable approach (original array unchanged) is central to functional programming and frameworks like React. map() is perfect for data transformation: extracting properties from objects, converting types, reformatting values, or adding computed properties. The function receives element, index, and full array, enabling position-aware transformations. Always use map() when you need every element transformed - never use forEach for transformation as it returns undefined.

```javascript
const numbers = [1, 2, 3, 4, 5];

// Double each number
const doubled = numbers.map(n => n * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

// Extract property from objects
const users = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 },
    { name: 'Charlie', age: 35 }
];

const names = users.map(user => user.name);
console.log(names); // ['Alice', 'Bob', 'Charlie']

// With index
const withIndex = numbers.map((num, index) => `${index}: ${num}`);
console.log(withIndex); // ['0: 1', '1: 2', '2: 3', '3: 4', '4: 5']
```

**filter() - Select Elements**

**Array Filtering** - Creates a new array with elements that pass a test condition, perfect for data filtering and search.

```javascript
const numbers = [1, 2, 3, 4, 5, 6];

// Even numbers only
const evens = numbers.filter(n => n % 2 === 0);
console.log(evens); // [2, 4, 6]

// Filter objects
const users = [
    { name: 'Alice', age: 25, active: true },
    { name: 'Bob', age: 30, active: false },
    { name: 'Charlie', age: 35, active: true }
];

const activeUsers = users.filter(user => user.active);
const adults = users.filter(user => user.age >= 30);
```

**reduce() - Reduce to Single Value**

**Array Reduction** - reduce() is the most powerful and versatile array method - it can implement every other array operation (map, filter, find, etc.). It "reduces" an array to a single value by accumulating results through each iteration. The accumulator pattern enables complex aggregations: sums, products, grouping by properties, creating lookup objects, flattening nested arrays, or building entirely new data structures. The key is understanding the accumulator - it carries state between iterations, and what you return becomes the next iteration's accumulator. The initial value is crucial and often forgotten - without it, reduce uses the first element as initial accumulator, which can cause bugs.

```javascript
const numbers = [1, 2, 3, 4, 5];

// Sum
const sum = numbers.reduce((total, num) => total + num, 0);
console.log(sum); // 15

// Product
const product = numbers.reduce((result, num) => result * num, 1);
console.log(product); // 120

// Max value
const max = numbers.reduce((max, num) => num > max ? num : max);
console.log(max); // 5

// Count occurrences
const fruits = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple'];
const count = fruits.reduce((acc, fruit) => {
    acc[fruit] = (acc[fruit] || 0) + 1;
    return acc;
}, {});
console.log(count); // { apple: 3, banana: 2, orange: 1 }

// Group by property
const users = [
    { name: 'Alice', role: 'admin' },
    { name: 'Bob', role: 'user' },
    { name: 'Charlie', role: 'admin' }
];

const grouped = users.reduce((acc, user) => {
    const role = user.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
}, {});
// { admin: [{Alice}, {Charlie}], user: [{Bob}] }
```

**flatMap() - Map and Flatten**

**Map and Flatten Combined** - Maps each element and flattens the result one level, combining map() and flat() in a single operation.

```javascript
const sentences = ['Hello world', 'How are you'];

// Get all words
const words = sentences.flatMap(sentence => sentence.split(' '));
console.log(words); // ['Hello', 'world', 'How', 'are', 'you']

// Duplicate and flatten
const numbers = [1, 2, 3];
const duplicated = numbers.flatMap(n => [n, n]);
console.log(duplicated); // [1, 1, 2, 2, 3, 3]
```

### 2. Search Methods

**find() - First Matching Element**

**Finding Single Element** - Returns the first element that satisfies a condition or undefined, ideal for finding specific items.

```javascript
const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' }
];

const user = users.find(u => u.id === 2);
console.log(user); // { id: 2, name: 'Bob' }

const notFound = users.find(u => u.id === 999);
console.log(notFound); // undefined
```

**findIndex() - Index of First Match**
```javascript
const numbers = [10, 20, 30, 40];

const index = numbers.findIndex(n => n > 25);
console.log(index); // 2 (30 is at index 2)

const notFound = numbers.findIndex(n => n > 100);
console.log(notFound); // -1
```

**includes() - Check if Element Exists**
```javascript
const fruits = ['apple', 'banana', 'orange'];

console.log(fruits.includes('banana')); // true
console.log(fruits.includes('grape')); // false

// From index
console.log(fruits.includes('apple', 1)); // false (starts from index 1)

// NaN handling (unlike indexOf)
const values = [1, 2, NaN, 4];
console.log(values.includes(NaN)); // true
console.log(values.indexOf(NaN));  // -1
```

**indexOf() / lastIndexOf()**
```javascript
const numbers = [1, 2, 3, 2, 1];

console.log(numbers.indexOf(2));     // 1 (first occurrence)
console.log(numbers.lastIndexOf(2)); // 3 (last occurrence)
console.log(numbers.indexOf(99));    // -1 (not found)
```

**some() - Test if Any Match**

**Existence Check** - Returns true if at least one element passes the test, useful for checking if any condition is met.

```javascript
const numbers = [1, 2, 3, 4, 5];

const hasEven = numbers.some(n => n % 2 === 0);
console.log(hasEven); // true

const hasLarge = numbers.some(n => n > 100);
console.log(hasLarge); // false

// Check if any user is admin
const users = [
    { name: 'Alice', role: 'user' },
    { name: 'Bob', role: 'admin' }
];

const hasAdmin = users.some(u => u.role === 'admin');
console.log(hasAdmin); // true
```

**every() - Test if All Match**

**Universal Check** - Returns true only if all elements pass the test, useful for validation and condition checking.

```javascript
const numbers = [2, 4, 6, 8];

const allEven = numbers.every(n => n % 2 === 0);
console.log(allEven); // true

const allPositive = numbers.every(n => n > 0);
console.log(allPositive); // true

const allLarge = numbers.every(n => n > 5);
console.log(allLarge); // false
```

### 3. Array Manipulation

**slice() - Extract Portion (Doesn't Modify)**
```javascript
const fruits = ['apple', 'banana', 'orange', 'grape', 'melon'];

const some = fruits.slice(1, 3);
console.log(some); // ['banana', 'orange']

const fromIndex = fruits.slice(2);
console.log(fromIndex); // ['orange', 'grape', 'melon']

const copy = fruits.slice();
console.log(copy); // Full shallow copy

// Negative indices
const last = fruits.slice(-2);
console.log(last); // ['grape', 'melon']
```

**splice() - Add/Remove Elements (Modifies Original)**
```javascript
const fruits = ['apple', 'banana', 'orange'];

// Remove 1 element at index 1
const removed = fruits.splice(1, 1);
console.log(fruits);  // ['apple', 'orange']
console.log(removed); // ['banana']

// Add elements
fruits.splice(1, 0, 'grape', 'melon');
console.log(fruits); // ['apple', 'grape', 'melon', 'orange']

// Replace elements
fruits.splice(1, 2, 'kiwi');
console.log(fruits); // ['apple', 'kiwi', 'orange']
```

**concat() - Merge Arrays**
```javascript
const arr1 = [1, 2];
const arr2 = [3, 4];
const arr3 = [5, 6];

const merged = arr1.concat(arr2, arr3);
console.log(merged); // [1, 2, 3, 4, 5, 6]

// ES6 spread (preferred)
const merged2 = [...arr1, ...arr2, ...arr3];
```

**flat() - Flatten Nested Arrays**
```javascript
const nested = [1, [2, 3], [4, [5, 6]]];

console.log(nested.flat());    // [1, 2, 3, 4, [5, 6]] (default depth: 1)
console.log(nested.flat(2));   // [1, 2, 3, 4, 5, 6]
console.log(nested.flat(Infinity)); // Fully flattened

// Remove empty slots
const sparse = [1, , 3, , 5];
console.log(sparse.flat()); // [1, 3, 5]
```

### 4. Ordering Methods

**sort() - Sort Array (Modifies Original)**

**Array Sorting** - Sorts array in place using comparator function, crucial for numerical and custom sorting beyond alphabetical.

```javascript
// Alphabetical (default)
const fruits = ['banana', 'apple', 'orange'];
fruits.sort();
console.log(fruits); // ['apple', 'banana', 'orange']

// Numbers (need comparator!)
const numbers = [10, 5, 40, 25, 1000, 1];

// Wrong!
numbers.sort();
console.log(numbers); // [1, 10, 1000, 25, 40, 5] (alphabetical)

// Correct!
numbers.sort((a, b) => a - b);
console.log(numbers); // [1, 5, 10, 25, 40, 1000]

// Descending
numbers.sort((a, b) => b - a);
console.log(numbers); // [1000, 40, 25, 10, 5, 1]

// Sort objects
const users = [
    { name: 'Charlie', age: 35 },
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 30 }
];

users.sort((a, b) => a.age - b.age);
// Sorted by age: Alice(25), Bob(30), Charlie(35)

users.sort((a, b) => a.name.localeCompare(b.name));
// Sorted by name: Alice, Bob, Charlie
```

**reverse() - Reverse Array (Modifies Original)**
```javascript
const numbers = [1, 2, 3, 4, 5];
numbers.reverse();
console.log(numbers); // [5, 4, 3, 2, 1]
```

### 5. Iteration Methods

**forEach() - Execute Function for Each**
```javascript
const fruits = ['apple', 'banana', 'orange'];

fruits.forEach((fruit, index) => {
    console.log(`${index}: ${fruit}`);
});
// 0: apple
// 1: banana
// 2: orange

// Cannot break or return (use for...of if needed)
```

**for...of - Iterate Values**
```javascript
const fruits = ['apple', 'banana', 'orange'];

for (const fruit of fruits) {
    console.log(fruit);
    if (fruit === 'banana') break; // Can break!
}
```

### 6. Creation and Conversion

**Array.from() - Create from Iterable**

**Creating Arrays** - Creates arrays from array-like objects, iterables, with optional mapping function for transformation during creation.

```javascript
// String to array
const str = 'hello';
const chars = Array.from(str);
console.log(chars); // ['h', 'e', 'l', 'l', 'o']

// Set to array
const set = new Set([1, 2, 3]);
const arr = Array.from(set);

// Array-like to array
const arrayLike = { 0: 'a', 1: 'b', 2: 'c', length: 3 };
const array = Array.from(arrayLike);
console.log(array); // ['a', 'b', 'c']

// With mapping
const numbers = Array.from([1, 2, 3], n => n * 2);
console.log(numbers); // [2, 4, 6]

// Generate range
const range = Array.from({ length: 5 }, (_, i) => i + 1);
console.log(range); // [1, 2, 3, 4, 5]
```

**Array.of() - Create from Arguments**
```javascript
const arr1 = Array.of(1, 2, 3);
console.log(arr1); // [1, 2, 3]

// Difference from Array constructor
const arr2 = Array(3);    // [empty × 3]
const arr3 = Array.of(3); // [3]
```

**join() - Array to String**
```javascript
const fruits = ['apple', 'banana', 'orange'];

console.log(fruits.join());      // 'apple,banana,orange'
console.log(fruits.join(' '));   // 'apple banana orange'
console.log(fruits.join(' - ')); // 'apple - banana - orange'
```

## 📚 Object Methods

### 1. Object.keys() / values() / entries()

**Object Iteration Methods** - Extract keys, values, or key-value pairs from objects for iteration and transformation.

```javascript
const user = {
    name: 'Alice',
    age: 25,
    email: 'alice@example.com'
};

// Get keys
const keys = Object.keys(user);
console.log(keys); // ['name', 'age', 'email']

// Get values
const values = Object.values(user);
console.log(values); // ['Alice', 25, 'alice@example.com']

// Get entries (key-value pairs)
const entries = Object.entries(user);
console.log(entries);
// [['name', 'Alice'], ['age', 25], ['email', 'alice@example.com']]

// Iterate
for (const [key, value] of Object.entries(user)) {
    console.log(`${key}: ${value}`);
}
```

### 2. Object.assign()

**Object Merging** - Copies properties from source objects to target, useful for merging and shallow cloning (spread operator preferred).

```javascript
// Merge objects
const target = { a: 1, b: 2 };
const source = { b: 3, c: 4 };

const result = Object.assign(target, source);
console.log(result); // { a: 1, b: 3, c: 4 }
console.log(target); // Modified! { a: 1, b: 3, c: 4 }

// Shallow copy (prefer spread operator)
const copy = Object.assign({}, user);

// ES6 spread (better)
const copy2 = { ...user };

// Merge multiple
const merged = Object.assign({}, obj1, obj2, obj3);
```

### 3. Object.freeze() / seal()

**Object Immutability** - freeze() makes objects completely immutable, seal() prevents additions/deletions but allows modifications.

```javascript
const user = {
    name: 'Alice',
    age: 25
};

// freeze - Cannot add, delete, or modify
Object.freeze(user);
user.age = 30;           // Ignored
user.email = 'a@b.com';  // Ignored
delete user.name;        // Ignored
console.log(user);       // { name: 'Alice', age: 25 }

// seal - Cannot add or delete, but can modify
const product = {
    name: 'Phone',
    price: 500
};

Object.seal(product);
product.price = 600;     // OK
product.color = 'black'; // Ignored
delete product.name;     // Ignored
console.log(product);    // { name: 'Phone', price: 600 }

// Check if frozen/sealed
console.log(Object.isFrozen(user));  // true
console.log(Object.isSealed(product)); // true
```

### 4. Object.create()

```javascript
const personPrototype = {
    greet() {
        console.log(`Hello, I'm ${this.name}`);
    }
};

const alice = Object.create(personPrototype);
alice.name = 'Alice';
alice.greet(); // "Hello, I'm Alice"

// With properties
const bob = Object.create(personPrototype, {
    name: {
        value: 'Bob',
        writable: true,
        enumerable: true
    }
});
```

### 5. Object.hasOwnProperty() / in

```javascript
const user = {
    name: 'Alice'
};

// Own property
console.log(user.hasOwnProperty('name'));     // true
console.log(user.hasOwnProperty('toString')); // false

// in operator (own + inherited)
console.log('name' in user);     // true
console.log('toString' in user); // true (inherited from Object.prototype)
```

### 6. Object.fromEntries()

**Creating Objects from Entries** - Converts key-value pair arrays or Maps into objects, inverse of Object.entries(), useful for transformations.

```javascript
// Entries to object
const entries = [
    ['name', 'Alice'],
    ['age', 25],
    ['email', 'alice@example.com']
];

const user = Object.fromEntries(entries);
console.log(user);
// { name: 'Alice', age: 25, email: 'alice@example.com' }

// Convert Map to object
const map = new Map([
    ['a', 1],
    ['b', 2]
]);

const obj = Object.fromEntries(map);
console.log(obj); // { a: 1, b: 2 }

// Filter object properties
const user2 = {
    name: 'Bob',
    age: 30,
    password: 'secret'
};

const filtered = Object.fromEntries(
    Object.entries(user2).filter(([key]) => key !== 'password')
);
console.log(filtered); // { name: 'Bob', age: 30 }
```

## 🎯 Common Interview Questions

### Q1: What's the difference between map() and forEach()?

**Answer:**

**map vs forEach** - map() returns new array with transformed values, forEach() only iterates with no return value.

```javascript
const numbers = [1, 2, 3];

// forEach - no return value, just iterates
const result1 = numbers.forEach(n => n * 2);
console.log(result1); // undefined

// map - returns new array
const result2 = numbers.map(n => n * 2);
console.log(result2); // [2, 4, 6]
```

### Q2: How to remove duplicates from an array?

**Answer: Multiple ways**

**Deduplication Techniques** - Three approaches using Set (best), filter with indexOf, or reduce with includes.

```javascript
const numbers = [1, 2, 2, 3, 3, 4];

// 1. Set (best)
const unique1 = [...new Set(numbers)];

// 2. filter
const unique2 = numbers.filter((n, i) => numbers.indexOf(n) === i);

// 3. reduce
const unique3 = numbers.reduce((acc, n) =>
    acc.includes(n) ? acc : [...acc, n], []
);
```

### Q3: How to group array of objects by property?

**Answer:**

**Grouping with reduce** - Uses reduce to group objects into categories based on a property value.

```javascript
const users = [
    { name: 'Alice', role: 'admin' },
    { name: 'Bob', role: 'user' },
    { name: 'Charlie', role: 'admin' }
];

const grouped = users.reduce((acc, user) => {
    const role = user.role;
    acc[role] = acc[role] || [];
    acc[role].push(user);
    return acc;
}, {});

console.log(grouped);
// { admin: [{Alice}, {Charlie}], user: [{Bob}] }
```

## 💡 Practical Examples

### Example 1: Data Transformation Pipeline

**Method Chaining** - Chains multiple array methods (filter, map) to create data processing pipelines.

```javascript
const users = [
    { name: 'Alice', age: 25, active: true, score: 85 },
    { name: 'Bob', age: 17, active: false, score: 92 },
    { name: 'Charlie', age: 30, active: true, score: 78 }
];

// Get names of active adult users with score > 80
const result = users
    .filter(u => u.active)
    .filter(u => u.age >= 18)
    .filter(u => u.score > 80)
    .map(u => u.name);

console.log(result); // ['Alice']
```

### Example 2: Calculate Statistics

**Aggregation with reduce** - Uses reduce to calculate multiple statistics (sum, count, min, max, average) in one pass.

```javascript
const scores = [85, 92, 78, 95, 88];

const stats = scores.reduce((acc, score) => {
    acc.sum += score;
    acc.count++;
    acc.min = Math.min(acc.min, score);
    acc.max = Math.max(acc.max, score);
    return acc;
}, { sum: 0, count: 0, min: Infinity, max: -Infinity });

stats.average = stats.sum / stats.count;
console.log(stats);
// { sum: 438, count: 5, min: 78, max: 95, average: 87.6 }
```

### Example 3: Deep Clone Object

**Deep vs Shallow Cloning** - Compares shallow cloning with spread operator versus deep cloning with JSON or structuredClone.

```javascript
// Shallow clone (nested objects are references)
const user = {
    name: 'Alice',
    address: { city: 'NYC' }
};

const shallow = { ...user };
shallow.address.city = 'LA';
console.log(user.address.city); // 'LA' (modified!)

// Deep clone
const deep = JSON.parse(JSON.stringify(user));
deep.address.city = 'Chicago';
console.log(user.address.city); // 'LA' (not modified)

// Note: JSON method has limitations (no functions, dates, etc.)
```

## 🔗 Related Topics

- [ES6+ Features](./08-es6-features.md)
- [Functions & Scope](./02-functions-scope.md)

---

[← Back to JavaScript](./README.md)
