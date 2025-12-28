# Closures

## Concept

A **closure** is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned. Closures are created every time a function is created, and they "remember" the environment in which they were created.

### Key Points
- Functions have access to variables from their outer scope
- Inner functions keep references to outer scope variables
- Closures enable data privacy and function factories
- Created at function creation time, not invocation time

---

## Example 1: Basic Closure

**Closure Fundamentals** - Closures are one of JavaScript's most powerful and misunderstood features. When a function is created, it captures references to variables in its lexical scope (the scope where it was defined). Even after the outer function completes and its execution context is removed from the call stack, the inner function maintains access to those variables through the closure. This happens because JavaScript uses lexical scoping - functions "remember" where they were defined, not where they're called. The closure keeps the outer scope variables alive in memory as long as the inner function exists. This enables powerful patterns like private variables, function factories, and callbacks that need access to surrounding context.

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

**Data Encapsulation** - Before ES6 classes and private fields, closures were JavaScript's primary mechanism for data privacy. Variables declared in a function's scope are inaccessible from outside, but functions returned from that scope (closures) can access and modify them. This creates truly private state - there's no way to access `count` directly from outside, unlike object properties which can always be accessed. Each call to `createCounter` creates a new, independent closure with its own private `count`, enabling multiple instances with separate state. This pattern is fundamental to module patterns and is still relevant even with modern JavaScript features.

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

**Loop Variable Capture Problem** - This is JavaScript's most infamous closure gotcha and a common interview question. When creating closures in a loop with var, all closures capture the same variable (not its value at each iteration, but the actual variable reference). After the loop completes, that variable has its final value, so all closures reference that final value. The issue stems from var being function-scoped - there's only one `i` variable shared across all iterations. Using let creates a new variable for each iteration (block-scoped), so each closure captures its own copy. The IIFE solution works by creating a new function scope per iteration, capturing the current value. This bug is less common with modern JavaScript (use let), but understanding it demonstrates deep knowledge of closures and scoping.

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

**Closure Memory Management** - Closures can inadvertently create memory leaks by keeping references to large data structures. When a closure references any variable from an outer scope, JavaScript must keep that entire scope alive - even if the closure only uses a tiny fraction of it. This is especially problematic with large arrays, DOM nodes, or cached data. The garbage collector can't free memory that closures still reference. The solution is to extract only the specific values needed before creating the closure, allowing the large structure to be garbage collected. This is a subtle but important consideration for long-running applications where closures might persist for extended periods.

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
