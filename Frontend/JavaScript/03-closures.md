# Closures {#ch-closures}

> Use a function's captured scope on purpose — for privacy, for factories, and without leaking memory.

**In this chapter:** what a closure captures · private state · function factories · the loop-variable trap · memoisation and partial application

## Understanding Closures - JavaScript's Superpower

A **closure** is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned. This is one of JavaScript's most powerful and distinctive features, enabling patterns like data privacy, function factories, and module systems.

### What Makes Closures Special

Closures are unique because they:

1. **Preserve State**: Variables from outer scopes remain alive as long as the closure exists
2. **Enable Privacy**: Create truly private variables inaccessible from outside
3. **Power Functional Programming**: Enable partial application, currying, and memoization
4. **Underpin Modern Frameworks**: React Hooks are built entirely on closures

### The Mental Model

Think of closures as a backpack:

```
When a function is created → It packs a "backpack" with references to variables in its scope
When the function is called → It can still access variables from that "backpack"
Even if called elsewhere → The backpack travels with the function
```

This "backpack" persists in memory as long as the closure exists.

### Key Points
- **Lexical Scoping**: Functions "remember" where they were defined, not where they're called
- **Persistent References**: Inner functions keep **references** to outer scope variables (not copies)
- **Memory Implications**: Closures can prevent garbage collection if not managed properly
- **Creation Timing**: Created at function creation time, not invocation time
- **Common Use Cases**: Data privacy, event handlers, callbacks, partial application

---

## Example 1: Basic Closure

### 💡 **Closure Fundamentals**

Closures are one of JavaScript's most powerful and misunderstood features.

**How Closures Work:**

**1. Function Creation Phase:**
```
When a function is created → Captures references to variables in lexical scope
                           (where it was defined, not where it's called)
```

**2. Function Execution:**
```
Outer function completes → Execution context removed from call stack
                        ↓
Inner function retains → Access to outer variables via closure
                       ↓
Variables stay alive → As long as closure exists
```

**Key Mechanisms:**

**Lexical Scoping:**
- Functions "remember" where they were **defined**
- Not where they're **called**
- Scope determined at author-time, not runtime

**Variable Capture:**
- Closures capture **references**, not values
- Changes to variables affect all closures
- Variables kept alive in memory

**Lifetime:**
- Outer variables live as long as closure exists
- Prevents garbage collection
- Can cause memory leaks if not careful

**Powerful Patterns Enabled:**
- ✅ **Private variables**: True encapsulation
- ✅ **Function factories**: Generate customized functions
- ✅ **Callbacks with context**: Event handlers, async operations
- ✅ **Module pattern**: Organize code with private/public API
- ✅ **Partial application**: Pre-fill function arguments

**The Key Insight:**
> Even after the outer function has finished executing and returned, the inner function maintains a "live connection" to the outer scope's variables.

```typescript
function outerFunction(): () => void {
  const outerVariable: string = 'I am from outer scope';

  function innerFunction(): void {
    console.log(outerVariable);
  }

  return innerFunction;
}

const closure: () => void = outerFunction();
closure(); // "I am from outer scope"

// outerFunction has already returned, but innerFunction still holds
// its scope alive
```

### How it works:
1. `outerFunction` creates a variable `outerVariable`
2. `innerFunction` is defined inside `outerFunction`
3. `innerFunction` has access to `outerVariable` (lexical scoping)
4. `outerFunction` returns `innerFunction`
5. Even after `outerFunction` completes, the returned function maintains access to `outerVariable`

---

## Example 2: Counter with Closure (Data Privacy)

### 💡 **Data Encapsulation**

Before ES6 classes and private fields, closures were JavaScript's **primary mechanism for data privacy**.

**How Privacy Works:**

**The Pattern:**
```typescript
interface Counter {
  increment(): number;
  getCount(): number;
}

function createCounter(): Counter {
  let count: number = 0; // Private — the returned type does not expose it

  return {
    increment: (): number => ++count,
    getCount: (): number => count,
  };
}
```

**Privacy Mechanism:**

1. **Private Variables:**
   - Declared in function scope
   - Inaccessible from outside
   - No direct access possible

2. **Public Methods (Closures):**
   - Returned from function
   - Retain access to private variables
   - Act as controlled interface

3. **True Encapsulation:**
   ```typescript
   const counter: Counter = createCounter();
   counter.increment(); // ✅ Works — the public method
   counter.count; // ❌ Not on the type, and not on the object
   ```

**Comparison with Object Properties:**

| Approach | Privacy | Access |
|----------|---------|--------|
| **Closure** | ✅ Truly private | Only via methods |
| **Object Property** | ❌ Always accessible | `obj.property` |
| **`_property` convention** | ❌ Just convention | Still accessible |
| **ES6 `#private`** | ✅ Private | Only in class |

**Multiple Independent Instances:**

Each call to `createCounter()` creates:
- New closure
- New private `count` variable
- Independent state

```typescript
const counter1: Counter = createCounter();
const counter2: Counter = createCounter();

counter1.increment(); // counter1: 1
counter2.increment(); // counter2: 1
// Each call to createCounter made its own `count`
```

**Why Still Relevant:**

Even with modern features (ES6 classes, `#private` fields):
- ✅ More flexible than classes
- ✅ Works with functional programming
- ✅ No `this` binding issues
- ✅ Fundamental to understanding module patterns

```typescript
interface FullCounter {
  increment(): number;
  decrement(): number;
  getCount(): number;
}

function createCounter(): FullCounter {
  let count: number = 0; // Private

  return {
    increment: function (): number {
      count++;
      return count;
    },
    decrement: function (): number {
      count--;
      return count;
    },
    getCount: function (): number {
      return count;
    },
  };
}

const counter: FullCounter = createCounter();

console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount()); // 1

// `count` is not reachable — there is no property to read
// Each call gets its own
const counter2: FullCounter = createCounter();
console.log(counter2.increment()); // 1, independent of `counter`
```

### Real-world Use Case:
Data encapsulation - `count` is private and can only be modified through defined methods.

---

## Example 3: Function Factory

**Function Factory with Closures** - Function factories leverage closures to generate customized functions programmatically. The factory function takes configuration parameters and returns a function that "remembers" those parameters via closure. Each generated function gets its own closure capturing its specific parameters, enabling the creation of many specialized variations from a single factory. This pattern is powerful for creating configurable utilities, partial application, currying, and dependency injection. It's the basis for many functional programming patterns and makes code highly reusable - one factory creates infinite specialized functions without code duplication.

```typescript
type UnaryNumberFn = (n: number) => number;

function createMultiplier(multiplier: number): UnaryNumberFn {
  return function (n: number): number {
    return n * multiplier;
  };
}

const double: UnaryNumberFn = createMultiplier(2);
const triple: UnaryNumberFn = createMultiplier(3);

console.log(double(5)); // 10
console.log(triple(5)); // 15

// Each returned function remembers its own `multiplier`
```

### Real-world Use Case:
Creating specialized functions from a generic function template.

---

## Common Pitfalls

### Pitfall 1: Closures in Loops with var

### 💡 **Loop Variable Capture Problem**

This is JavaScript's **most infamous closure gotcha** and a classic interview question.

**The Problem:**

```typescript
for (var i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// Output: 3, 3, 3 ❌ — not 0, 1, 2
```

**Why This Happens:**

**Step-by-Step Breakdown:**

1. **Loop Runs:**
   ```
   i = 0 → Create setTimeout with closure
   i = 1 → Create setTimeout with closure
   i = 2 → Create setTimeout with closure
   i = 3 → Loop ends
   ```

2. **Variable Capture:**
   - All closures capture **reference** to same `i` variable
   - NOT the value at each iteration
   - `var` is function-scoped → only ONE `i` exists

3. **Callbacks Execute:**
   - 100ms later, callbacks run
   - All reference the same `i`
   - `i` is now 3 (final value)
   - Result: 3, 3, 3

**Visualization:**
```
Closure 1 ──┐
Closure 2 ──┼──> Same 'i' variable → Final value: 3
Closure 3 ──┘
```

**Solutions:**

**Solution 1: Use `let` (Modern, Best):**
```typescript
for (let i = 0; i < 3; i++) {
  setTimeout((): void => console.log(i), 100);
}
// Output: 0, 1, 2 ✅
```
- `let` is block-scoped
- **New `i` created for each iteration**
- Each closure captures its own `i`

**Solution 2: IIFE (Pre-ES6):**
```typescript
for (var i = 0; i < 3; i++) {
  (function (j: number): void {
    setTimeout((): void => console.log(j), 100);
  })(i);
}
// Output: 0, 1, 2 ✅ — the IIFE copies `i` into a fresh scope
```
- Creates new function scope per iteration
- `j` parameter captures current `i` value
- Each closure gets its own `j`

**Comparison:**

| Approach | How It Works | Modern? |
|----------|-------------|---------|
| `var` | ❌ One shared variable | Broken |
| `let` | ✅ New variable each iteration | Best ✅ |
| IIFE | ✅ New scope each iteration | Pre-ES6 |

**Interview Tip:**
> Understanding this demonstrates deep knowledge of closures, scoping, and the difference between capturing references vs values. Always use `let` in loops with closures!

```typescript
// ❌ The classic mistake
for (var i = 0; i < 3; i++) {
  setTimeout(function (): void {
    console.log(i); // Prints 3, 3, 3
  }, 1000);
}

// `var` is function-scoped, so all three callbacks close over the same `i`,
// and they read it after the loop has finished

// ✅ Solution 1 — `let` is block-scoped
for (let i = 0; i < 3; i++) {
  setTimeout(function (): void {
    console.log(i); // Prints 0, 1, 2
  }, 1000);
}

// ✅ Solution 2 — an IIFE makes a new scope per iteration
for (var j = 0; j < 3; j++) {
  (function (index: number): void {
    setTimeout(function (): void {
      console.log(index); // Prints 0, 1, 2
    }, 1000);
  })(j);
}
```

### Pitfall 2: Memory Leaks

### 💡 **Closure Memory Management**

Closures can inadvertently create memory leaks by keeping references to large data structures.

**The Problem:**

**How Closures Hold Memory:**
```typescript
function createHugeArray(): () => void {
  const hugeArray: string[] = new Array<string>(1_000_000).fill('data');

  return function (): void {
    console.log('Function created');
    // The closure keeps the whole scope alive, including hugeArray,
    // even though nothing here reads it
  };
}

const func: () => void = createHugeArray();
// hugeArray cannot be collected while `func` is reachable
```

**Why This Happens:**

1. **Scope Retention:**
   - Closure references **any** outer variable
   - JavaScript keeps **entire scope** alive
   - Not just the variables you use

2. **Garbage Collection Blocked:**
   - GC can't free memory still referenced
   - Large arrays/objects persist
   - Accumulates over time

3. **Common Scenarios:**
   - Large arrays/datasets
   - DOM nodes (especially removed ones)
   - Cached data
   - Event handlers
   - Long-lived closures

**Problematic Patterns:**

```typescript
interface CacheItem {
  id: string;
}

// ❌ The handler holds the element, so removing it from the DOM is not enough
element.addEventListener('click', function (): void {
  // ...
});

// ❌ The returned function pins the whole cache in memory
function processData(largeCache: CacheItem[]): (id: string) => CacheItem | undefined {
  return function (id: string): CacheItem | undefined {
    return largeCache.find((item: CacheItem): boolean => item.id === id);
  };
}
```

**Solutions:**

**Solution 1: Extract Only What You Need:**
```typescript
function createOptimized(): () => void {
  const hugeArray: string[] = new Array<string>(1_000_000).fill('data');
  const needed: string = hugeArray[0]; // ✅ Take only the value you want

  // Nothing in the returned function references hugeArray, so it can go
  return function (): void {
    console.log(needed);
  };
}
```

**Solution 2: Nullify References:**
```typescript
function createWithCleanup(): () => ProcessedResult {
  let hugeArray: string[] | null = new Array<string>(1_000_000).fill('data');
  const result: ProcessedResult = processArray(hugeArray);

  hugeArray = null; // ✅ Drop the reference explicitly

  return function (): ProcessedResult {
    return result;
  };
}
```

**Solution 3: Remove Event Listeners:**
```typescript
// Keep the reference — removeEventListener matches by identity, so an
// inline arrow can never be removed
const handler = function (): void {
  /* ... */
};
element.addEventListener('click', handler);

// Later, when the element goes away
element.removeEventListener('click', handler);
```

**Best Practices:**

| Practice | Benefit |
|----------|---------|
| Extract needed values | Only keep what's used |
| Nullify large refs | Help garbage collector |
| Remove event listeners | Free DOM nodes |
| Use WeakMap/WeakSet | Auto garbage collection |
| Profile memory | Find leaks early |

**When to Worry:**
- Long-running single-page apps (SPAs)
- Many event listeners
- Large datasets in closures
- Frequently created/destroyed components

```typescript
// ❌ Potential memory leak
function createHugeArray(): () => void {
  const hugeArray: string[] = new Array<string>(1_000_000).fill('data');

  return function (): void {
    console.log('Function created');
    // The closure holds hugeArray whether or not it is read
  };
}

const func: () => void = createHugeArray(); // hugeArray stays in memory

// ✅ Close over the value, not the container
function createOptimized(): () => void {
  const hugeArray: string[] = new Array<string>(1_000_000).fill('data');
  const needed: string = hugeArray[0];

  return function (): void {
    console.log(needed);
  };
}
```

### Pitfall 3: Unexpected Behavior with this

**'this' Binding in Closures** - Shows how arrow functions capture 'this' from outer scope while regular functions have their own 'this' binding.

<!-- lint-allow-fence: javascript — the contrast depends on a `function` expression having its own undefined `this`; under `noImplicitThis` TypeScript rejects the second half, which is the half the reader needs to see fail -->
```javascript
const obj = {
    value: 42,
    getValue: function() {
        // Arrow function captures 'this' from surrounding scope
        const innerArrow = () => {
            console.log(this.value); // 42 - works as expected
        };

        // Regular function has its own 'this'
        const innerRegular = function() {
            console.log(this.value); // undefined (or global value)
        };

        innerArrow();
        innerRegular();
    }
};

obj.getValue();
```

---

## Best Practices

### 1. Use Closures for Data Privacy

**Private State Management** - Implements a bank account with private balance using closures, demonstrating secure state management with controlled access.

```typescript
interface BankAccount {
  deposit(amount: number): number | undefined;
  withdraw(amount: number): number | string;
  getBalance(): number;
}

// The balance is unreachable from outside — no convention, no underscore,
// no way in at all
function createBankAccount(initialBalance: number): BankAccount {
  let balance: number = initialBalance;

  return {
    deposit: (amount: number): number | undefined => {
      if (amount > 0) {
        balance += amount;
        return balance;
      }
      return undefined;
    },
    withdraw: (amount: number): number | string => {
      if (amount > 0 && amount <= balance) {
        balance -= amount;
        return balance;
      }
      return 'Insufficient funds';
    },
    getBalance: (): number => balance,
  };
}

const account: BankAccount = createBankAccount(1000);
console.log(account.deposit(500)); // 1500
console.log(account.withdraw(200)); // 1300
console.log(account.getBalance()); // 1300
```

### 2. Module Pattern

**Module Pattern with IIFE** - Uses immediately-invoked function expression with closures to create modules with private variables and public API.

```typescript
interface Calculator {
  add(a: number, b: number): number;
  multiply(a: number, b: number): number;
  getResult(): number;
}

const calculator: Calculator = (function (): Calculator {
  // Private state and helpers
  let result: number = 0;

  function log(message: string): void {
    console.log(`Calculator: ${message}`);
  }

  // Public API — the interface is the whole contract
  return {
    add: function (a: number, b: number): number {
      result = a + b;
      log(`${a} + ${b} = ${result}`);
      return result;
    },
    multiply: function (a: number, b: number): number {
      result = a * b;
      log(`${a} * ${b} = ${result}`);
      return result;
    },
    getResult: function (): number {
      return result;
    },
  };
})();

calculator.add(5, 3); // Calculator: 5 + 3 = 8
calculator.multiply(4, 2); // Calculator: 4 * 2 = 8
// calculator.result — not on the type; the module pattern hid it
```

### 3. Memoization with Closures

**Caching Function Results** - Creates a memoization wrapper using closures to cache expensive function results, improving performance through result reuse.

```typescript
// The cache lives in the closure, so it is per-wrapped-function and cannot
// be inspected or corrupted from outside
function memoize<Args extends unknown[], R>(fn: (...args: Args) => R): (...args: Args) => R {
  const cache = new Map<string, R>();

  return function (...args: Args): R {
    const key: string = JSON.stringify(args);

    // Map.has, not a truthiness check — a cached `0` or `false` is still a hit
    if (cache.has(key)) {
      return cache.get(key) as R;
    }

    const result: R = fn(...args);
    cache.set(key, result);
    return result;
  };
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const memoizedFib: (n: number) => number = memoize(fibonacci);

console.log(memoizedFib(10)); // Calculated: 55
console.log(memoizedFib(10)); // From cache: 55
```

---

## Real-world Scenarios

### Scenario 1: Event Handlers with Dynamic Data

**Dynamic Event Handlers** - Creates event handlers that capture specific data through closures, enabling unique behavior for each handler instance.

```typescript
function createButtonHandler(buttonId: string, message: string): () => void {
  return function (): void {
    // Both values are still here long after setup finished
    console.log(`Button ${buttonId} clicked: ${message}`);
  };
}

const buttons: readonly string[] = ['btn1', 'btn2', 'btn3'];
buttons.forEach((id: string, index: number): void => {
  const handler: () => void = createButtonHandler(id, `Message ${index}`);
  document.getElementById(id)?.addEventListener('click', handler);
});
```

### Scenario 2: Partial Application

**Partial Function Application** - Uses closures to pre-fill function arguments, creating specialized versions of generic functions for reusability.

```typescript
// The fixed arguments live in the closure, not in a wrapper object
function partial<Fixed extends unknown[], Rest extends unknown[], R>(
  fn: (...args: [...Fixed, ...Rest]) => R,
  ...fixedArgs: Fixed
): (...rest: Rest) => R {
  return function (...remainingArgs: Rest): R {
    return fn(...fixedArgs, ...remainingArgs);
  };
}

function greet(greeting: string, name: string): string {
  return `${greeting}, ${name}!`;
}

const sayHello = partial(greet, 'Hello');
const sayHi = partial(greet, 'Hi');

console.log(sayHello('Alice')); // Hello, Alice!
console.log(sayHi('Bob')); // Hi, Bob!
```

### Scenario 3: React Hooks Pattern

**useState Implementation Concept** - Simplified version showing how React's useState uses closures to maintain state between function calls.

```typescript
// A stripped-down model of how React 19's useState holds state between
// renders. The real one keys state by hook position on the fiber; the
// closure is the part worth understanding
function createUseState<T>(): (initialValue?: T) => [T, (newValue: T) => void] {
  let state: T | null = null;

  return function useState(initialValue?: T): [T, (newValue: T) => void] {
    if (state === null && initialValue !== undefined) {
      state = initialValue;
    }

    function setState(newValue: T): void {
      state = newValue;
      // In React this schedules a re-render
    }

    return [state as T, setState];
  };
}

const useState = createUseState<number>();
const [count, setCount] = useState(0);
console.log(count); // 0
setCount(5);
const [newCount] = useState(); // Reads the current state
console.log(newCount); // 5
```

---

## External Resources

- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [JavaScript.info: Closure](https://javascript.info/closure)
- [You Don't Know JS: Scope & Closures](https://github.com/getify/You-Dont-Know-JS/blob/2nd-ed/scope-closures/README.md)

---

[← Back to JavaScript](./README.md) | [Next: This Keyword →](./04-this-keyword.md)
