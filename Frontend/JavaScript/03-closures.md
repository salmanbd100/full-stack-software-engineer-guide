# Closures

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

```javascript
function outerFunction() {
    const outerVariable = 'I am from outer scope';

    function innerFunction() {
        console.log(outerVariable); // Can access outer variable
    }

    return innerFunction;
}

const closure = outerFunction();
closure(); // Output: "I am from outer scope"

// Even though outerFunction has finished executing,
// innerFunction still has access to outerVariable
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
```javascript
function createCounter() {
    let count = 0;  // ← Private variable (function scope)

    return {
        // Public methods (closures) that access private state
        increment: () => ++count,
        getCount: () => count
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
   ```javascript
   const counter = createCounter();
   counter.increment(); // ✅ Works - uses public method
   counter.count;       // ❌ undefined - truly private!
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

```javascript
const counter1 = createCounter();
const counter2 = createCounter();

counter1.increment(); // counter1: 1
counter2.increment(); // counter2: 1
// Completely separate!
```

**Why Still Relevant:**

Even with modern features (ES6 classes, `#private` fields):
- ✅ More flexible than classes
- ✅ Works with functional programming
- ✅ No `this` binding issues
- ✅ Fundamental to understanding module patterns

```javascript
function createCounter() {
    let count = 0; // Private variable

    return {
        increment: function() {
            count++;
            return count;
        },
        decrement: function() {
            count--;
            return count;
        },
        getCount: function() {
            return count;
        }
    };
}

const counter = createCounter();

console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.getCount());  // 1

// Cannot directly access or modify count
console.log(counter.count); // undefined

// Each counter instance has its own private count
const counter2 = createCounter();
console.log(counter2.increment()); // 1 (independent from counter)
```

### Real-world Use Case:
Data encapsulation - `count` is private and can only be modified through defined methods.

---

## Example 3: Function Factory

**Function Factory with Closures** - Function factories leverage closures to generate customized functions programmatically. The factory function takes configuration parameters and returns a function that "remembers" those parameters via closure. Each generated function gets its own closure capturing its specific parameters, enabling the creation of many specialized variations from a single factory. This pattern is powerful for creating configurable utilities, partial application, currying, and dependency injection. It's the basis for many functional programming patterns and makes code highly reusable - one factory creates infinite specialized functions without code duplication.

```javascript
function createMultiplier(multiplier) {
    return function(number) {
        return number * multiplier;
    };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5));  // 10
console.log(triple(5));  // 15

// Each function "remembers" its own multiplier value
```

### Real-world Use Case:
Creating specialized functions from a generic function template.

---

## Common Pitfalls

### Pitfall 1: Closures in Loops with var

### 💡 **Loop Variable Capture Problem**

This is JavaScript's **most infamous closure gotcha** and a classic interview question.

**The Problem:**

```javascript
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3 ❌ (Not 0, 1, 2!)
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
```javascript
for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2 ✅
```
- `let` is block-scoped
- **New `i` created for each iteration**
- Each closure captures its own `i`

**Solution 2: IIFE (Pre-ES6):**
```javascript
for (var i = 0; i < 3; i++) {
    (function(j) {
        setTimeout(() => console.log(j), 100);
    })(i);
}
// Output: 0, 1, 2 ✅
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

```javascript
// WRONG - Common mistake
for (var i = 0; i < 3; i++) {
    setTimeout(function() {
        console.log(i); // Prints: 3, 3, 3
    }, 1000);
}

// Why? Because var is function-scoped, all callbacks share
// the same 'i' variable, which is 3 after the loop ends

// SOLUTION 1: Use let (block-scoped)
for (let i = 0; i < 3; i++) {
    setTimeout(function() {
        console.log(i); // Prints: 0, 1, 2
    }, 1000);
}

// SOLUTION 2: Use IIFE to create new scope
for (var i = 0; i < 3; i++) {
    (function(j) {
        setTimeout(function() {
            console.log(j); // Prints: 0, 1, 2
        }, 1000);
    })(i);
}
```

### Pitfall 2: Memory Leaks

### 💡 **Closure Memory Management**

Closures can inadvertently create memory leaks by keeping references to large data structures.

**The Problem:**

**How Closures Hold Memory:**
```javascript
function createHugeArray() {
    const hugeArray = new Array(1000000).fill('data'); // 🔴 Large data

    return function() {
        console.log('Function created');
        // Closure exists → hugeArray stays in memory
        // Even though we don't use it!
    };
}

const func = createHugeArray();
// ⚠️ hugeArray cannot be garbage collected
// Closure keeps entire scope alive
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

```javascript
// ❌ Bad: Keeps entire DOM tree in memory
element.addEventListener('click', function() {
    // Even if element is removed, event handler keeps it alive
});

// ❌ Bad: Keeps large cache in memory
function processData(largeCache) {
    return function(id) {
        // Closure keeps entire largeCache alive
        return largeCache.find(item => item.id === id);
    };
}
```

**Solutions:**

**Solution 1: Extract Only What You Need:**
```javascript
function createOptimized() {
    const hugeArray = new Array(1000000).fill('data');
    const needed = hugeArray[0]; // ✅ Extract specific value

    // hugeArray can now be garbage collected
    return function() {
        console.log(needed); // Only 'needed' stays in memory
    };
}
```

**Solution 2: Nullify References:**
```javascript
function createWithCleanup() {
    let hugeArray = new Array(1000000).fill('data');
    const result = processArray(hugeArray);

    hugeArray = null; // ✅ Help GC by clearing reference

    return function() {
        return result;
    };
}
```

**Solution 3: Remove Event Listeners:**
```javascript
const handler = function() { /* ... */ };
element.addEventListener('click', handler);

// Later, when element is removed:
element.removeEventListener('click', handler); // ✅ Allow GC
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

```javascript
// Potential memory leak
function createHugeArray() {
    const hugeArray = new Array(1000000).fill('data');

    return function() {
        console.log('Function created');
        // The closure keeps reference to hugeArray even if not used
    };
}

const func = createHugeArray(); // hugeArray stays in memory

// SOLUTION: Only close over what you need
function createOptimized() {
    const hugeArray = new Array(1000000).fill('data');
    const needed = hugeArray[0]; // Extract only what's needed

    return function() {
        console.log(needed); // Only 'needed' is in closure
        // hugeArray can be garbage collected
    };
}
```

### Pitfall 3: Unexpected Behavior with this

**'this' Binding in Closures** - Shows how arrow functions capture 'this' from outer scope while regular functions have their own 'this' binding.

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

```javascript
// Good: Encapsulated state
function createBankAccount(initialBalance) {
    let balance = initialBalance;

    return {
        deposit: (amount) => {
            if (amount > 0) {
                balance += amount;
                return balance;
            }
        },
        withdraw: (amount) => {
            if (amount > 0 && amount <= balance) {
                balance -= amount;
                return balance;
            }
            return 'Insufficient funds';
        },
        getBalance: () => balance
    };
}

const account = createBankAccount(1000);
console.log(account.deposit(500));    // 1500
console.log(account.withdraw(200));   // 1300
console.log(account.getBalance());    // 1300
```

### 2. Module Pattern

**Module Pattern with IIFE** - Uses immediately-invoked function expression with closures to create modules with private variables and public API.

```javascript
const calculator = (function() {
    // Private variables and functions
    let result = 0;

    function log(message) {
        console.log(`Calculator: ${message}`);
    }

    // Public API
    return {
        add: function(a, b) {
            result = a + b;
            log(`${a} + ${b} = ${result}`);
            return result;
        },
        multiply: function(a, b) {
            result = a * b;
            log(`${a} * ${b} = ${result}`);
            return result;
        },
        getResult: function() {
            return result;
        }
    };
})();

calculator.add(5, 3);      // Calculator: 5 + 3 = 8
calculator.multiply(4, 2); // Calculator: 4 * 2 = 8
console.log(calculator.result); // undefined (private)
```

### 3. Memoization with Closures

**Caching Function Results** - Creates a memoization wrapper using closures to cache expensive function results, improving performance through result reuse.

```javascript
function memoize(fn) {
    const cache = {};

    return function(...args) {
        const key = JSON.stringify(args);

        if (cache[key]) {
            console.log('Returning from cache');
            return cache[key];
        }

        console.log('Calculating...');
        const result = fn.apply(this, args);
        cache[key] = result;
        return result;
    };
}

// Example: Expensive fibonacci calculation
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

const memoizedFib = memoize(fibonacci);

console.log(memoizedFib(10)); // Calculating... 55
console.log(memoizedFib(10)); // Returning from cache 55
```

---

## Real-world Scenarios

### Scenario 1: Event Handlers with Dynamic Data

**Dynamic Event Handlers** - Creates event handlers that capture specific data through closures, enabling unique behavior for each handler instance.

```javascript
function createButtonHandler(buttonId, message) {
    return function() {
        console.log(`Button ${buttonId} clicked: ${message}`);
        // Can access buttonId and message even after setup
    };
}

// Setup multiple buttons
const buttons = ['btn1', 'btn2', 'btn3'];
buttons.forEach((id, index) => {
    const handler = createButtonHandler(id, `Message ${index}`);
    // In real code: document.getElementById(id).addEventListener('click', handler);
});
```

### Scenario 2: Partial Application

**Partial Function Application** - Uses closures to pre-fill function arguments, creating specialized versions of generic functions for reusability.

```javascript
function partial(fn, ...fixedArgs) {
    return function(...remainingArgs) {
        return fn.apply(this, [...fixedArgs, ...remainingArgs]);
    };
}

function greet(greeting, name) {
    return `${greeting}, ${name}!`;
}

const sayHello = partial(greet, 'Hello');
const sayHi = partial(greet, 'Hi');

console.log(sayHello('Alice')); // Hello, Alice!
console.log(sayHi('Bob'));      // Hi, Bob!
```

### Scenario 3: React Hooks Pattern

**useState Implementation Concept** - Simplified version showing how React's useState uses closures to maintain state between function calls.

```javascript
// Simplified version of how useState works internally
function createUseState() {
    let state = null;

    function useState(initialValue) {
        if (state === null) {
            state = initialValue;
        }

        function setState(newValue) {
            state = newValue;
            // In React, this would trigger re-render
        }

        return [state, setState];
    }

    return useState;
}

// Usage
const useState = createUseState();
const [count, setCount] = useState(0);
console.log(count); // 0
setCount(5);
const [newCount] = useState(); // Gets current state
console.log(newCount); // 5
```

---

## External Resources

- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [JavaScript.info: Closure](https://javascript.info/closure)
- [You Don't Know JS: Scope & Closures](https://github.com/getify/You-Dont-Know-JS/blob/2nd-ed/scope-closures/README.md)

---

[← Back to JavaScript](./README.md) | [Next: This Keyword →](./04-this-keyword.md)
