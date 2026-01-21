# State and Effects (React 18 Functional Components)

## Understanding State and Side Effects

### 💡 **Core Concepts**

**State** is React's built-in mechanism for storing component data that changes over time.

**Effects** are operations that interact with the outside world.

**Key Distinctions:**

| Concept | Purpose | Examples |
|---------|---------|----------|
| **State** | Store changing data | User inputs, toggle states, counters |
| **Effects** | Interact with external systems | API calls, subscriptions, DOM updates |
| **Modern Tools** | Hooks-based management | `useState`, `useEffect` |

## Why This Matters

**Interview Perspective:**
- Core concept tested in 100% of React interviews
- Understanding state updates and batching demonstrates React 18 knowledge
- useEffect dependency arrays are frequently asked about
- Lifecycle equivalents (class vs functional) are common questions

**Real-World Importance:**
- **State Management**: Foundation for interactive UIs and data handling
- **Performance**: Understanding batching prevents unnecessary re-renders
- **Side Effects**: Proper cleanup prevents memory leaks in production
- **Modern Patterns**: useEffect replaces class lifecycle methods entirely

## Core Concepts Overview

| Aspect | useState | useEffect |
|--------|----------|-----------|
| **Purpose** | Manage component state | Handle side effects |
| **Trigger** | User interactions, events | After renders, on mount/unmount |
| **Updates** | Asynchronous, batched | After render committed |
| **Cleanup** | N/A | Return cleanup function |
| **Dependencies** | N/A | Dependency array controls execution |

### Key Principles

**State Management:**

✅ **Do:**
- Use setter functions for all updates
- Use functional updates for previous-state-dependent changes
- Leverage React 18 automatic batching
- Create new objects/arrays (immutability)

❌ **Don't:**
- Mutate state directly
- Assume state updates are synchronous
- Forget functional updates in closures

**Effect Management:**

✅ **Do:**
- Return cleanup functions for subscriptions/timers
- Include all dependencies in array
- Separate effects by concern
- Use empty `[]` for mount-only effects

❌ **Don't:**
- Ignore ESLint dependency warnings
- Combine unrelated logic in one effect
- Forget to cleanup resources
- Create infinite loops with missing conditions

---

## Example 1: State with useState

### 💡 **useState - Component State Management**

React's fundamental hook for adding local state to functional components.

**How useState Works:**

**Declaration:**
```javascript
const [value, setValue] = useState(initialValue);
```
- Returns array with 2 elements: [current value, setter function]
- Use array destructuring for clean syntax
- Can call useState multiple times for different state variables

**State Updates:**
- Calling setter triggers re-render with new value
- Updates are asynchronous (batched for performance)
- Functional updates guarantee you're using latest value

**Lazy Initialization:**
- Pass function to useState for expensive initial calculations
- Function runs only once on mount, not on every render

**When to Use:**
- Simple component-level state (counters, toggles, form inputs)
- Each state variable that changes independently
- Local UI state (open/closed, selected/unselected)

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Simple Value** | Direct state updates | `const [count, setCount] = useState(0)` |
| **Functional Update** | Update based on previous state | `setCount(prev => prev + 1)` |
| **Object State** | Related values grouped together | `useState({ name: '', age: 0 })` |
| **Lazy Initialization** | Expensive initial computation | `useState(() => expensiveCalc())` |

**Common Patterns:**

```jsx
import { useState } from 'react';

// Pattern 1: Simple state
function Counter() {
    const [count, setCount] = useState(0);
    const [message, setMessage] = useState('Hello');

    const increment = () => {
        setCount(count + 1); // Simple update
    };

    // ✅ Functional update (safer for async updates)
    const incrementSafe = () => {
        setCount(prevCount => prevCount + 1);
    };

    return (
        <div>
            <h1>Count: {count}</h1>
            <p>{message}</p>
            <button onClick={increment}>+</button>
            <button onClick={incrementSafe}>+ (Safe)</button>
        </div>
    );
}

// Pattern 2: Multiple separate state variables
function UserForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState(0);

    // Each state updates independently
}

// Pattern 3: Single object state (careful with updates!)
function UserFormObject() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        age: 0
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,           // ✅ Spread previous state
            [field]: value     // Update specific field
        }));
    };

    return (
        <form>
            <input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
            />
        </form>
    );
}

// Pattern 4: Lazy initialization (expensive computation)
function ExpensiveComponent() {
    const [data, setData] = useState(() => {
        // ✅ Only runs on initial render
        console.log('Computing initial value...');
        return computeExpensiveValue();
    });

    return <div>{data.length} items</div>;
}

function computeExpensiveValue() {
    return Array.from({ length: 1000 }, (_, i) => i);
}
```

**Decision Guide:**

| Scenario | Use This |
|----------|----------|
| Independent values | Multiple useState calls |
| Related values | Single object with useState |
| Update depends on previous value | Functional update form |
| Expensive initial value | Lazy initialization |
| Complex state logic | Consider useReducer instead |

---

## Example 2: setState Patterns (React 18)

### 💡 **React 18 Automatic Batching**

**Critical React 18 Improvement:**
> React 18 automatically batches ALL state updates into a single re-render, even in async functions, promises, and timeouts. React 17 only batched in event handlers.

**The Batching Problem:**

```
❌ React 17: Multiple renders in async code
✅ React 18: Single render everywhere
```

**Why Functional Updates Matter:**

When calling setState multiple times, you might expect the state to update multiple times. However:

**Without Functional Update (Stale Values):**
```javascript
setCount(count + 1); // Uses count = 0
setCount(count + 1); // Still uses count = 0
// Result: count = 1 (not 2!)
```

**With Functional Update (Latest Values):**
```javascript
setCount(prev => prev + 1); // Uses latest (0 -> 1)
setCount(prev => prev + 1); // Uses latest (1 -> 2)
// Result: count = 2 ✅
```

**State Update Patterns:**

| Pattern | Use Case | Code |
|---------|----------|------|
| **Direct Update** | Setting to specific value | `setCount(5)` |
| **Functional Update** | Based on previous state | `setCount(prev => prev + 1)` |
| **Object Merge** | Updating nested state | `setUser(prev => ({ ...prev, age: 31 }))` |
| **Array Operations** | Immutable array updates | `setItems(prev => [...prev, newItem])` |

```jsx
import { useState } from 'react';

function StatePatterns() {
    const [count, setCount] = useState(0);
    const [user, setUser] = useState({ name: 'John', age: 30 });
    const [items, setItems] = useState(['apple', 'banana']);

    // Pattern 1: Simple update (set to specific value)
    const updateSimple = () => {
        setCount(5);
    };

    // Pattern 2: Functional update (when using previous state)
    const incrementCount = () => {
        setCount(prevCount => prevCount + 1);
    };

    // Pattern 3: Multiple updates (automatically batched in React 18)
    const batchedUpdates = () => {
        // ❌ Wrong - both use same stale value
        setCount(count + 1); // count = 0, sets to 1
        setCount(count + 1); // count still 0, sets to 1 again
        // Result: count = 1 (not 2!)

        // ✅ Correct - use function form
        setCount(prev => prev + 1); // 0 -> 1
        setCount(prev => prev + 1); // 1 -> 2
        // Result: count = 2 ✅
    };

    // Pattern 4: React 18 - Automatic batching in async
    const asyncBatchedUpdates = async () => {
        const data = await fetch('/api/data');

        // In React 18, these are batched automatically!
        setCount(c => c + 1);
        setUser({ name: 'Jane', age: 25 });
        setItems(['orange']);
        // ✅ Only 1 re-render in React 18
        // ❌ Would be 3 re-renders in React 17
    };

    // Pattern 5: Updating nested state (objects)
    const updateUser = () => {
        setUser(prevUser => ({
            ...prevUser,  // ✅ Spread existing properties
            age: 31       // Update specific property
        }));
    };

    // Pattern 6: Updating arrays
    const addItem = () => {
        setItems(prevItems => [...prevItems, 'orange']);
    };

    const removeItem = (index) => {
        setItems(prevItems => prevItems.filter((_, i) => i !== index));
    };

    const updateItem = (index, newValue) => {
        setItems(prevItems =>
            prevItems.map((item, i) => i === index ? newValue : item)
        );
    };

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={incrementCount}>Increment</button>
            <button onClick={batchedUpdates}>Batch Update</button>
            <button onClick={asyncBatchedUpdates}>Async Batch</button>
        </div>
    );
}
```

**React 18 Batching Comparison:**

```javascript
// REACT 17: Different batching behavior
function React17Behavior() {
    const [count, setCount] = useState(0);

    // ✅ Batched (in event handler)
    const handleClick = () => {
        setCount(1); // Batched
        setCount(2); // Batched
        // Only 1 render
    };

    // ❌ NOT batched (in setTimeout)
    const handleAsync = () => {
        setTimeout(() => {
            setCount(1); // Re-render #1
            setCount(2); // Re-render #2
            // 2 renders!
        }, 100);
    };
}

// REACT 18: Everything batched!
function React18Behavior() {
    const [count, setCount] = useState(0);

    // ✅ Batched
    const handleClick = () => {
        setCount(1);
        setCount(2);
        // 1 render
    };

    // ✅ Also batched now!
    const handleAsync = () => {
        setTimeout(() => {
            setCount(1);
            setCount(2);
            // 1 render!
        }, 100);
    };
}
```

---

## Example 3: Effects with useEffect (Lifecycle Replacement)

### 💡 **useEffect - Side Effects and Lifecycle**

**What are Side Effects?**

Operations that interact with the outside world:
- Data fetching (API calls)
- Subscriptions (WebSockets, event listeners)
- Timers (setTimeout, setInterval)
- DOM manipulation
- Logging, analytics

**useEffect replaces 3 class lifecycle methods:**

```
componentDidMount    → useEffect(() => {}, [])
componentDidUpdate   → useEffect(() => {}, [deps])
componentWillUnmount → useEffect(() => { return cleanup }, [])
```

**The Dependency Array:**

| Dependencies | When Effect Runs | Use Case |
|--------------|------------------|----------|
| **No array** | After every render | Rarely needed, usually a mistake |
| **Empty `[]`** | Once after mount | Setup subscriptions, fetch initial data |
| **`[a, b]`** | When `a` or `b` changes | React to specific changes |

**Cleanup Function:**

```javascript
useEffect(() => {
    // Setup code
    const timer = setInterval(() => {}, 1000);

    // Cleanup (runs before re-run or unmount)
    return () => {
        clearInterval(timer);
    };
}, []);
```

**When Cleanup Runs:**
1. Before effect re-runs (when dependencies change)
2. When component unmounts
3. NOT on initial mount

```jsx
import { useState, useEffect } from 'react';

function LifecycleWithHooks() {
    const [count, setCount] = useState(0);
    const [data, setData] = useState(null);

    // ❌ Runs after EVERY render (usually wrong)
    useEffect(() => {
        console.log('Component rendered');
        document.title = `Count: ${count}`;
        // No dependency array = runs every render
    });

    // ✅ Runs ONCE on mount (componentDidMount)
    useEffect(() => {
        console.log('Component mounted - runs once');

        // Setup subscriptions, fetch data, etc.
        fetchData();
        const timer = setInterval(() => {
            console.log('Timer tick');
        }, 1000);

        // ✅ Cleanup (componentWillUnmount)
        return () => {
            console.log('Component unmounting or effect re-running');
            clearInterval(timer);
        };
    }, []); // ✅ Empty array = run once

    // ✅ Runs when count changes (componentDidUpdate with condition)
    useEffect(() => {
        console.log('Count changed:', count);

        // Only runs when count changes
        if (count > 10) {
            console.log('Count exceeded 10!');
        }
    }, [count]); // ✅ Runs when count changes

    const fetchData = async () => {
        const response = await fetch('https://api.example.com/data');
        const result = await response.json();
        setData(result);
    };

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>Increment</button>
            {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
        </div>
    );
}
```

**Lifecycle Mapping (Class → Hooks):**

| Class Component | Functional Component (Hooks) | Code |
|----------------|------------------------------|------|
| `constructor()` | `useState()` for initial state | `const [state] = useState(init)` |
| `componentDidMount()` | `useEffect(() => {}, [])` | Empty deps array |
| `componentDidUpdate()` | `useEffect(() => {}, [deps])` | Specific deps |
| `componentWillUnmount()` | `useEffect(() => { return cleanup }, [])` | Return function |
| `shouldComponentUpdate()` | `React.memo()` / `useMemo()` | Memoization |
| `getDerivedStateFromProps()` | Update state directly in render | No hook needed |

**Flow Diagram:**

```
Mount:
  1. useState (initialize state)
  2. Render component
  3. Commit to DOM
  4. useEffect (run effects)

Update:
  1. State/props change
  2. Re-render component
  3. Commit changes to DOM
  4. Cleanup previous effects
  5. Run new effects

Unmount:
  1. Cleanup all effects
  2. Remove from DOM
```

---

## Example 4: Data Fetching (Modern Pattern)

### 💡 **Data Fetching with useState and useEffect**

**The Standard Pattern (Before React Query/SWR):**

Managing three states:
1. **data** - The fetched data
2. **loading** - Whether request is in progress
3. **error** - Any error that occurred

**Critical: Cleanup and Race Conditions**

**Problem:** Component unmounts or URL changes before fetch completes
**Solution:** AbortController + cancelled flag

```javascript
// ❌ Without cleanup: Memory leak!
useEffect(() => {
    fetch(url)
        .then(res => res.json())
        .then(setData); // ⚠️ Sets state on unmounted component!
}, [url]);

// ✅ With cleanup: Safe!
useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
            if (!cancelled) setData(data); // ✅ Check before setState
        });

    return () => {
        cancelled = true;
        controller.abort(); // ✅ Cancel in-flight request
    };
}, [url]);
```

**Data Fetching States:**

| State | Loading | Error | Data | What to Show |
|-------|---------|-------|------|--------------|
| **Initial** | true | null | null | Loading spinner |
| **Success** | false | null | {...} | Display data |
| **Error** | false | "..." | null | Error message |
| **Refetch** | true | null | {...} | Data + spinner |

```jsx
import { useState, useEffect } from 'react';

function DataFetcher({ url }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null); // Clear previous errors

                const response = await fetch(url, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }

                const result = await response.json();

                // ✅ Only update if not cancelled
                if (!cancelled) {
                    setData(result);
                    setLoading(false);
                }
            } catch (err) {
                // ✅ Ignore AbortError (expected on cleanup)
                if (!cancelled && err.name !== 'AbortError') {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        fetchData();

        // ✅ Cleanup function
        return () => {
            cancelled = true;      // Prevent state updates
            controller.abort();    // Cancel fetch request
        };
    }, [url]); // Re-fetch when URL changes

    // Render based on state
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}
```

**Why Two Safety Mechanisms?**

1. **`cancelled` flag**: Prevents state updates on unmounted component
2. **`AbortController`**: Cancels network request to save bandwidth

**Step-by-Step Flow:**

```
1. Component mounts
   → loading: true, error: null, data: null

2. Fetch starts
   → Request sent to server

3a. Success path:
    → Response received
    → Check: !cancelled? ✅
    → setData(result), setLoading(false)

3b. Error path:
    → Error thrown
    → Check: !cancelled && not AbortError? ✅
    → setError(message), setLoading(false)

4. Component unmounts OR url changes:
   → Cleanup runs
   → cancelled = true (stops state updates)
   → controller.abort() (cancels request)
```

---

## Example 5: Timer Component (Hooks)

### 💡 **Managing Intervals with useEffect**

**Why Cleanup Matters for Timers:**

```
❌ Without cleanup: Timer keeps running after unmount → Memory leak
✅ With cleanup: Timer cleared on unmount → No leak
```

**Timer Lifecycle:**

```
Mount:
  → isRunning true? Start interval

Update (isRunning changes):
  → Cleanup runs (clear old interval)
  → New effect runs (start new interval if isRunning)

Unmount:
  → Cleanup runs (clear interval)
  → Component removed
```

```jsx
import { useState, useEffect } from 'react';

function Timer() {
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    // Effect runs when isRunning changes
    useEffect(() => {
        let interval = null;

        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(s => s + 1); // ✅ Functional update
            }, 1000);
        }

        // ✅ Cleanup on unmount or when isRunning changes
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isRunning]); // Only re-run when isRunning changes

    // Separate effect for logging (different concern)
    useEffect(() => {
        if (seconds > 0 && seconds % 10 === 0) {
            console.log(`${seconds} seconds elapsed`);
        }
    }, [seconds]); // Runs when seconds changes

    const startTimer = () => setIsRunning(true);
    const stopTimer = () => setIsRunning(false);
    const resetTimer = () => {
        setIsRunning(false);
        setSeconds(0);
    };

    return (
        <div>
            <h1>{seconds}s</h1>
            <button onClick={startTimer} disabled={isRunning}>
                Start
            </button>
            <button onClick={stopTimer} disabled={!isRunning}>
                Stop
            </button>
            <button onClick={resetTimer}>Reset</button>
        </div>
    );
}
```

**Common Timer Patterns:**

| Pattern | Code | Use Case |
|---------|------|----------|
| **Simple interval** | `setInterval(() => setCount(c => c + 1), 1000)` | Auto-incrementing counter |
| **Conditional interval** | `if (isRunning) { setInterval(...) }` | Start/stop functionality |
| **Timeout** | `setTimeout(() => setShow(false), 3000)` | Auto-hide notifications |
| **Animation frame** | `requestAnimationFrame(...)` | Smooth animations |

---

## Common Mistakes

### ❌ Mistake 1: Directly Mutating State

**The Problem:**

React uses shallow comparison to detect changes. Mutating existing objects/arrays doesn't create new references, so React doesn't detect the change.

**Why This Breaks:**
- Same reference = React thinks nothing changed
- No re-render triggered
- UI doesn't update despite data changing
- Breaks React's optimization strategies

```jsx
import { useState } from 'react';

// ❌ WRONG - Direct mutation doesn't trigger re-render
function BadComponent() {
    const [items, setItems] = useState([1, 2, 3]);
    const [user, setUser] = useState({ name: 'John' });

    const addItem = () => {
        items.push(4);        // ❌ Mutates array
        setItems(items);      // ❌ Same reference, no re-render!
    };

    const updateUser = () => {
        user.name = 'Jane';   // ❌ Mutates object
        setUser(user);        // ❌ Same reference, no re-render!
    };

    return <div>{items.length}</div>; // Won't update!
}

// ✅ CORRECT - Create new references
function GoodComponent() {
    const [items, setItems] = useState([1, 2, 3]);
    const [user, setUser] = useState({ name: 'John' });

    const addItem = () => {
        setItems([...items, 4]); // ✅ New array
    };

    const updateUser = () => {
        setUser({ ...user, name: 'Jane' }); // ✅ New object
    };

    return <div>{items.length}</div>; // Updates correctly!
}
```

**Why This Happens:**

```javascript
const obj = { name: 'John' };
obj.name = 'Jane';        // Object mutated
console.log(obj === obj); // true (same reference!)

const newObj = { ...obj, name: 'Jane' };
console.log(newObj === obj); // false (new reference!)
```

**Immutable Update Patterns:**

| Operation | ❌ Wrong (Mutation) | ✅ Right (New Reference) |
|-----------|---------------------|--------------------------|
| **Add to array** | `arr.push(item)` | `[...arr, item]` |
| **Remove from array** | `arr.splice(index, 1)` | `arr.filter((_, i) => i !== index)` |
| **Update array item** | `arr[i] = newValue` | `arr.map((item, idx) => idx === i ? newValue : item)` |
| **Update object** | `obj.prop = value` | `{ ...obj, prop: value }` |
| **Update nested** | `obj.nested.prop = val` | `{ ...obj, nested: { ...obj.nested, prop: val }}` |

---

### ❌ Mistake 2: Stale Closures in Effects

**The Problem:**

Effects capture values from when they were created. If dependencies are missing, the effect uses old (stale) values forever.

**How It Happens:**
1. Effect runs with current values (e.g., `count = 0`)
2. Creates closure capturing those values
3. Values change but effect doesn't re-run (empty deps)
4. Effect continues using stale values

```jsx
import { useState, useEffect } from 'react';

// ❌ PROBLEM - Stale closure
function StaleClosureExample() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(count + 1); // ❌ Always uses initial count (0)!
        }, 1000);

        return () => clearInterval(interval);
    }, []); // Empty deps - count is stale

    return <div>{count}</div>; // Stuck at 1!
}

// ✅ SOLUTION 1 - Use functional update
function FixedExample() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(c => c + 1); // ✅ Uses current value
        }, 1000);

        return () => clearInterval(interval);
    }, []); // Can keep empty deps

    return <div>{count}</div>; // Increments correctly!
}

// ✅ SOLUTION 2 - Include dependency (creates new interval each time)
function AlternativeExample() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(count + 1); // Uses current count
        }, 1000);

        return () => clearInterval(interval);
    }, [count]); // ⚠️ Re-creates interval on each count change

    return <div>{count}</div>;
}
```

**Why Stale Closures Happen:**

```javascript
// When effect runs, it captures current count value
useEffect(() => {
    // count is 0 here (captured at mount)
    setInterval(() => {
        setCount(count + 1); // Always 0 + 1 = 1
    }, 1000);
}, []); // Never updates because deps are empty
```

**Decision Guide:**

| Scenario | Solution |
|----------|----------|
| State update in timer/interval | Use functional update `setState(prev => ...)` |
| Need current prop/state value | Include in dependencies |
| Function doesn't need latest value | Keep empty deps, use ref for mutable values |

---

### ❌ Mistake 3: Infinite Loop in useEffect

**The Problem:**

Effect modifies its own dependency, creating an endless cycle.

**The Infinite Loop:**
```
Effect runs → Updates state → State in deps → Effect runs → Updates state → ...
```

**Common Causes:**
- State updated inside effect is also in dependency array
- Objects/arrays recreated every render in dependencies
- Functions recreated every render in dependencies

```jsx
import { useState, useEffect } from 'react';

// ❌ WRONG - Infinite loop
function InfiniteLoop() {
    const [data, setData] = useState([]);

    useEffect(() => {
        setData([...data, 'new']); // ❌ Causes re-render
    }, [data]); // ❌ data changes → effect runs → data changes...

    return <div>{data.length}</div>; // App crashes!
}

// ✅ CORRECT - Fix dependencies or logic
function Fixed() {
    const [data, setData] = useState([]);

    useEffect(() => {
        // Only run once on mount
        fetch('/api/data')
            .then(res => res.json())
            .then(setData);
    }, []); // ✅ Empty array = run once

    return <div>{data.length}</div>;
}

// ✅ CORRECT - Conditional update
function ConditionalUpdate() {
    const [data, setData] = useState([]);
    const [shouldFetch, setShouldFetch] = useState(false);

    useEffect(() => {
        if (shouldFetch) {
            fetch('/api/data')
                .then(res => res.json())
                .then(newData => {
                    setData(newData);
                    setShouldFetch(false); // ✅ Reset flag
                });
        }
    }, [shouldFetch]); // Runs when flag changes

    return <div>{data.length}</div>;
}
```

**Common Infinite Loop Causes:**

| Cause | Why It Loops | Solution |
|-------|--------------|----------|
| **Object in deps** | New object each render | Use primitive values or useMemo |
| **Array in deps** | New array each render | Use primitive values or useMemo |
| **Function in deps** | New function each render | Use useCallback |
| **State update in effect** | Updates own dependency | Remove from deps or add condition |

---

### ❌ Mistake 4: Missing Dependencies

**The Problem:**

Ignoring ESLint warnings about missing dependencies leads to stale values and hard-to-debug issues.

**Why ESLint Warns:**
- Effect uses a value from component scope
- Value not in dependency array
- Effect won't re-run when value changes
- Creates bugs and stale data

**The Rule:**
> If you use it in the effect, it must be in the dependencies (with specific exceptions).

```jsx
import { useState, useEffect } from 'react';

// ❌ WRONG - Missing dependencies
function MissingDeps({ userId }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchUser(userId); // ❌ Uses userId but not in deps
    }, []); // ⚠️ Missing userId!

    return <div>{user?.name}</div>;
    // Bug: Won't re-fetch when userId prop changes!
}

// ✅ CORRECT - Include all dependencies
function CorrectDeps({ userId }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchUser(userId);
    }, [userId]); // ✅ userId included

    return <div>{user?.name}</div>;
}

function fetchUser(id) {
    // fetch implementation
}
```

**ESLint Rule:**

```javascript
// Install and configure
// eslint-plugin-react-hooks

// It will warn:
useEffect(() => {
    console.log(count); // Uses 'count'
}, []); // ⚠️ React Hook useEffect has a missing dependency: 'count'
```

**Safe to Omit from Dependencies:**

| Type | Reason | Example |
|------|--------|---------|
| **Imported functions** | Stable reference | `import { api } from './api'` |
| **setState functions** | Guaranteed stable by React | `const [x, setX] = useState()` |
| **useRef values** | Mutable, don't trigger renders | `const ref = useRef()` |

**Must Include in Dependencies:**

| Type | Reason | Example |
|------|--------|---------|
| **Props** | Can change on re-render | `function Comp({ userId })` |
| **State values** | Change triggers re-render | `const [count, setCount]` |
| **Derived values** | Computed from props/state | `const doubled = count * 2` |
| **Component functions** | Recreated each render | `const handleClick = () => {}` |

---

## Best Practices

### ✅ 1. Use Functional Updates for State

**When updating state based on previous state, always use functional form.**

```jsx
import { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);

    // ❌ Bad - Uses stale value
    const increment = () => {
        setCount(count + 1);
    };

    // ✅ Good - Uses latest value
    const incrementGood = () => {
        setCount(prevCount => prevCount + 1);
    };

    // ✅ Multiple updates work correctly
    const incrementMultiple = () => {
        setCount(c => c + 1);
        setCount(c => c + 1);
        setCount(c => c + 1);
        // Correctly increments by 3
    };

    return (
        <div>
            <p>{count}</p>
            <button onClick={incrementGood}>+1</button>
            <button onClick={incrementMultiple}>+3</button>
        </div>
    );
}
```

**Why It Matters:**

```javascript
// Scenario: React batches these updates
setCount(count + 1);  // count = 0, sets to 1
setCount(count + 1);  // count still 0, sets to 1
// Result: 1 (expected 2!)

// With functional update:
setCount(c => c + 1); // 0 -> 1
setCount(c => c + 1); // 1 -> 2
// Result: 2 ✅
```

---

### ✅ 2. Separate Effects by Concern

**Each useEffect should handle ONE concern. Don't combine unrelated logic.**

```jsx
import { useState, useEffect } from 'react';

// ❌ Bad - Multiple concerns in one effect
function BadExample({ userId }) {
    const [user, setUser] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        // Concern 1: User data
        fetchUser(userId).then(setUser);

        // Concern 2: Analytics (different!)
        fetchAnalytics(userId).then(setAnalytics);

        // Concern 3: Page title (different!)
        document.title = `User ${userId}`;
    }, [userId]);
}

// ✅ Good - Separate effects
function GoodExample({ userId }) {
    const [user, setUser] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    // Effect 1: User data
    useEffect(() => {
        fetchUser(userId).then(setUser);
    }, [userId]);

    // Effect 2: Analytics (separate concern)
    useEffect(() => {
        fetchAnalytics(userId).then(setAnalytics);
    }, [userId]);

    // Effect 3: Page title (separate concern)
    useEffect(() => {
        if (user) {
            document.title = `${user.name}'s Dashboard`;
        }
    }, [user]); // Different dependency!

    return <div>{/* ... */}</div>;
}

function fetchUser(id) { /* implementation */ }
function fetchAnalytics(id) { /* implementation */ }
```

**Benefits:**
- ✅ Easier to understand
- ✅ Easier to debug
- ✅ Effects can have different dependencies
- ✅ Easier to add/remove features

---

### ✅ 3. Cleanup Subscriptions and Timers

**Always return a cleanup function to prevent memory leaks.**

```jsx
import { useState, useEffect } from 'react';

function ProperCleanup() {
    const [data, setData] = useState(null);

    useEffect(() => {
        // Setup: Create timer
        const timer = setInterval(() => {
            console.log('Tick');
        }, 1000);

        // Setup: Add event listener
        const handleResize = () => {
            console.log('Resized');
        };
        window.addEventListener('resize', handleResize);

        // ✅ Cleanup function (CRITICAL!)
        return () => {
            clearInterval(timer);                           // Clear timer
            window.removeEventListener('resize', handleResize); // Remove listener
        };
    }, []);

    return <div>Component content</div>;
}
```

**What Needs Cleanup:**

| Resource | Setup | Cleanup |
|----------|-------|---------|
| **Timers** | `setInterval`, `setTimeout` | `clearInterval`, `clearTimeout` |
| **Event Listeners** | `addEventListener` | `removeEventListener` |
| **Subscriptions** | `subscribe()` | `unsubscribe()` |
| **WebSockets** | `new WebSocket()` | `socket.close()` |
| **Fetch Requests** | `fetch()` | `controller.abort()` |

**Memory Leak Example:**

```javascript
// ❌ Memory leak - timer keeps running after unmount
useEffect(() => {
    setInterval(() => console.log('Tick'), 1000);
}, []); // No cleanup!

// ✅ Properly cleaned up
useEffect(() => {
    const timer = setInterval(() => console.log('Tick'), 1000);
    return () => clearInterval(timer);
}, []);
```

---

## Real-world Scenarios

### Scenario 1: Form with Validation

### 💡 **Pattern: Real-Time Form Validation**

Validate form inputs as users type using state and effects together.

**How This Works:**

**Step 1: State Management**
- `formData` stores all input values
- `errors` tracks validation messages
- `isSubmitting` handles loading state

**Step 2: Automatic Validation**
- `useEffect` watches `formData` changes
- Runs validation on every update
- Updates errors state

**Step 3: User Feedback**
- Display errors immediately
- Disable submit if errors exist
- Show loading state during submission

**Benefits:**
- ✅ Immediate user feedback
- ✅ Prevent invalid submissions
- ✅ Clear separation of concerns
- ✅ Easy to add new fields

```jsx
import { useState, useEffect } from 'react';

function RegistrationForm() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validate when form data changes
    useEffect(() => {
        validateForm();
    }, [formData]);

    const validateForm = () => {
        const newErrors = {};

        if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }
        if (!formData.email.includes('@')) {
            newErrors.email = 'Invalid email';
        }
        if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (Object.keys(errors).length === 0) {
            setIsSubmitting(true);
            try {
                await submitForm(formData);
                // Success handling
            } catch (error) {
                console.error(error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                name="username"
                value={formData.username}
                onChange={handleChange}
            />
            {errors.username && <span>{errors.username}</span>}

            <input
                name="email"
                value={formData.email}
                onChange={handleChange}
            />
            {errors.email && <span>{errors.email}</span>}

            <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
            />
            {errors.password && <span>{errors.password}</span>}

            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
        </form>
    );
}

async function submitForm(data) {
    // API call implementation
}
```

---

### Scenario 2: Infinite Scroll

### 💡 **Pattern: Infinite Scroll Implementation**

Load more content automatically as user scrolls to bottom.

**How This Works:**

**Step 1: State Tracking**
- `items` - currently loaded items
- `page` - current page number
- `loading` - prevent duplicate requests
- `hasMore` - stop loading when done

**Step 2: Scroll Detection**
- Event listener watches scroll position
- Detects when user near bottom
- Triggers page increment

**Step 3: Data Loading**
- Effect watches `page` changes
- Fetches new data
- Appends to existing items

**Step 4: Cleanup**
- Remove scroll listener on unmount
- Prevent memory leaks

**Key Pattern:**
```
Scroll → Near bottom? → Increment page → Load data → Append items
```

**Benefits:**
- ✅ Better UX than pagination
- ✅ Loads data on demand
- ✅ Proper cleanup prevents leaks
- ✅ Loading state prevents duplicate requests

```jsx
import { useState, useEffect } from 'react';

function InfiniteScroll() {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Load items when page changes
    useEffect(() => {
        loadItems();
    }, [page]);

    // Setup scroll listener
    useEffect(() => {
        const handleScroll = () => {
            const scrolledToBottom =
                window.innerHeight + window.scrollY >=
                document.body.offsetHeight - 500;

            if (scrolledToBottom && !loading && hasMore) {
                setPage(p => p + 1);
            }
        };

        window.addEventListener('scroll', handleScroll);

        // ✅ Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [loading, hasMore]);

    const loadItems = async () => {
        setLoading(true);

        try {
            const response = await fetch(`/api/items?page=${page}`);
            const newItems = await response.json();

            setItems(prev => [...prev, ...newItems]);
            setHasMore(newItems.length > 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {items.map(item => (
                <div key={item.id}>{item.name}</div>
            ))}
            {loading && <div>Loading...</div>}
            {!hasMore && <div>No more items</div>}
        </div>
    );
}
```

---

## Interview Questions

### Q1: What is the difference between state and props?

**Answer:**

| Aspect | State | Props |
|--------|-------|-------|
| **Ownership** | Internal to component | External, from parent |
| **Mutability** | Mutable (via setState) | Immutable (read-only) |
| **Management** | Managed with useState/useReducer | Passed down from parent |
| **Changes** | Can change over time | Can change when parent re-renders |
| **Purpose** | Component's own data | Component configuration |

**Example:**
```javascript
// State - internal
const [count, setCount] = useState(0); // Can modify with setCount

// Props - external
function Child({ name }) {
    // name = "new"; ❌ Can't modify props!
    return <div>{name}</div>;
}
```

---

### Q2: Why are state updates asynchronous?

**Answer:**

**Performance Optimization:**
- React batches multiple state updates into a single re-render
- Prevents unnecessary re-renders
- Improves performance

**React 18 Enhancement:**
- **React 17**: Only batched in event handlers
- **React 18**: Batches everywhere (async, promises, timeouts)

**Example:**
```javascript
// Both updates batched into 1 re-render
setCount(1);
setUser({ name: 'John' });
// Only renders once ✅
```

---

### Q3: When does useEffect run?

**Answer:**

| Dependencies | When Effect Runs | Example |
|--------------|------------------|---------|
| **No array** | After every render | `useEffect(() => {})` |
| **Empty `[]`** | Once after mount | `useEffect(() => {}, [])` |
| **`[a, b]`** | After mount and when a or b changes | `useEffect(() => {}, [a, b])` |

**Timing:**
1. Component renders
2. Changes committed to DOM
3. Browser paints screen
4. useEffect runs

---

### Q4: How do you update state based on previous state?

**Answer:** Use the functional update form.

```javascript
// ❌ Wrong - uses stale value
setCount(count + 1);

// ✅ Right - uses latest value
setCount(prevCount => prevCount + 1);
```

**Why:**
```javascript
// Multiple updates
setCount(count + 1); // Uses stale count
setCount(count + 1); // Uses same stale count
// Result: Only increments once!

// Functional updates
setCount(c => c + 1); // 0 -> 1
setCount(c => c + 1); // 1 -> 2
// Result: Increments twice ✅
```

---

### Q5: What's the cleanup function in useEffect?

**Answer:**

The function returned from useEffect that runs:
1. Before the effect re-runs (when dependencies change)
2. When component unmounts

**Purpose:** Clean up resources to prevent memory leaks.

```javascript
useEffect(() => {
    // Setup
    const timer = setInterval(() => {}, 1000);
    const listener = () => {};
    window.addEventListener('resize', listener);

    // Cleanup
    return () => {
        clearInterval(timer);
        window.removeEventListener('resize', listener);
    };
}, []);
```

---

## External Resources

- [React Docs: useState](https://react.dev/reference/react/useState)
- [React Docs: useEffect](https://react.dev/reference/react/useEffect)
- [React 18: Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching)
- [useEffect Complete Guide](https://overreacted.io/a-complete-guide-to-useeffect/)

---

[← Previous: Components and Props](./01-components-props.md) | [Next: Hooks Basics →](./03-hooks-basics.md)
