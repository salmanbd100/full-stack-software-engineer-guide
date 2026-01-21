# React Hooks - Basics (React 18)

## Understanding React Hooks

**Hooks** are functions that let you "hook into" React state and lifecycle features from function components. They revolutionized React development by eliminating the need for class components.

## Why Hooks Matter

**Interview Perspective:**
- Asked in 90%+ of modern React interviews
- Demonstrates understanding of modern React patterns
- Tests knowledge of component lifecycle and state management
- Essential for any React position (junior to senior)

**Real-World Importance:**
- **Simpler Code**: No class syntax complexity
- **Better Reusability**: Extract logic into custom hooks
- **Easier Testing**: Pure functions are simpler to test
- **Better Performance**: React 18's automatic batching optimizes re-renders

## Hooks Evolution

| Era | Technology | State Management |
|-----|-----------|-----------------|
| **Pre-2019** | Class components | `this.state`, `this.setState()` |
| **2019 (React 16.8)** | Hooks introduced | `useState()`, `useEffect()` |
| **2022 (React 18)** | Concurrent features | `useTransition()`, `useDeferredValue()` |

## The Rules of Hooks

### 🔴 **Critical Rules (Breaking These Causes Bugs)**

**Rule 1: Only Call Hooks at the Top Level**

❌ **Wrong:**
```javascript
if (condition) {
  const [state, setState] = useState(0); // Conditional hook!
}
```

✅ **Right:**
```javascript
const [state, setState] = useState(0);
if (condition) {
  // Use state here
}
```

**Why:** React relies on call order to track hooks between renders.

**Rule 2: Only Call Hooks in React Functions**

✅ **Allowed:**
- Function components
- Custom hooks (functions starting with "use")

❌ **Not Allowed:**
- Regular JavaScript functions
- Class components
- Event handlers
- Callbacks

**Rule 3: Hook Names Must Start with "use"**

```javascript
// ✅ Correct
function useCustomHook() {}
function useCounter() {}

// ❌ Wrong
function customHook() {}  // Won't be recognized as hook
function getCounter() {}  // Linter won't enforce rules
```

## React 18 Enhancements

### **Automatic Batching**

**Before React 18:**
```javascript
// Only batched in event handlers
onClick={() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // ✅ Batched: 1 re-render
}}

// NOT batched in async
fetch('/api').then(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // ❌ Not batched: 2 re-renders
});
```

**React 18:**
```javascript
// ALL updates are batched!
fetch('/api').then(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // ✅ Batched: 1 re-render
});
```

### **New Hooks in React 18**

| Hook | Purpose |
|------|---------|
| `useId()` | Generate unique IDs for accessibility |
| `useTransition()` | Mark updates as non-urgent |
| `useDeferredValue()` | Defer expensive calculations |
| `useSyncExternalStore()` | Subscribe to external stores |

## Core Hooks Overview

| Hook | Purpose | Common Use Cases |
|------|---------|-----------------|
| `useState` | Add state to components | Counters, form inputs, toggles |
| `useEffect` | Side effects & lifecycle | API calls, subscriptions, DOM updates |
| `useContext` | Access context | Theme, auth, global state |
| `useRef` | Persist values, access DOM | DOM references, previous values |
| `useMemo` | Memoize expensive calculations | Filtering large lists, complex math |
| `useCallback` | Memoize functions | Prevent child re-renders, dependencies |

---

## Example 1: useState Hook

### 💡 **useState - Adding State to Components**

The cornerstone hook that brings stateful behavior to functional components.

**How useState Works:**

```
Call useState(initialValue)
         ↓
Returns: [currentState, setterFunction]
         ↓
Setter called → Component re-renders
         ↓
useState returns new state value
```

**Syntax:**

```javascript
const [state, setState] = useState(initialValue);
```

**Key Characteristics:**

1. **Independent State Variables:**
   - Each `useState` call is independent
   - Separate setters for fine-grained control
   - Only re-renders when that specific state changes

2. **Multiple useState Calls (Encouraged):**
   ```javascript
   const [count, setCount] = useState(0);
   const [name, setName] = useState('');
   const [loading, setLoading] = useState(false);
   // Separates concerns, easier to manage
   ```

3. **Functional Updates (Important!):**
   ```javascript
   // ❌ Can be wrong with batching
   setCount(count + 1);

   // ✅ Always correct
   setCount(prevCount => prevCount + 1);
   ```

**Why Functional Updates Matter:**

| Scenario | Direct Update | Functional Update |
|----------|--------------|-------------------|
| Multiple updates in same event | ❌ May use stale value | ✅ Always current |
| React 18 batching | ⚠️ Can lose updates | ✅ Safe |
| Concurrent rendering | ❌ Race conditions | ✅ Guaranteed |

**Lazy Initialization:**

```javascript
// ❌ Expensive calculation runs every render
const [state, setState] = useState(expensiveCalculation());

// ✅ Calculation runs only once
const [state, setState] = useState(() => expensiveCalculation());
```

**When to Use:**

| Use Case | Example |
|----------|---------|
| Simple values | Numbers, strings, booleans |
| Form inputs | Input values, checkboxes, selections |
| UI state | Loading, errors, modals open/closed |
| Counters/toggles | Likes, votes, expand/collapse |

**State Organization Strategies:**

**Option 1: Multiple useState (Recommended for simple state)**
```javascript
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [age, setAge] = useState(0);
// ✅ Clear, independent updates
```

**Option 2: Object State (For related data)**
```javascript
const [form, setForm] = useState({ name: '', email: '', age: 0 });
// ⚠️ Must spread previous state
setForm(prev => ({ ...prev, name: 'John' }));
```

**Common Mistakes:**

❌ **Forgetting to use functional update:**
```javascript
setCount(count + 1);
setCount(count + 1); // Still only increments by 1!
```

✅ **Using functional update:**
```javascript
setCount(c => c + 1);
setCount(c => c + 1); // Correctly increments by 2
```

❌ **Mutating state directly:**
```javascript
const [user, setUser] = useState({ name: 'John' });
user.name = 'Jane'; // ❌ Doesn't trigger re-render
```

✅ **Creating new object:**
```javascript
setUser({ ...user, name: 'Jane' }); // ✅ Triggers re-render
```

```javascript
import { useState } from 'react';

function Counter() {
    // Declare state variable
    // useState returns [currentValue, setterFunction]
    const [count, setCount] = useState(0); // 0 is initial value

    const increment = () => {
        setCount(count + 1);
    };

    const decrement = () => {
        setCount(count - 1);
    };

    // Functional update (safer for async updates)
    const incrementSafe = () => {
        setCount(prevCount => prevCount + 1);
    };

    return (
        <div>
            <h1>Count: {count}</h1>
            <button onClick={increment}>+</button>
            <button onClick={decrement}>-</button>
            <button onClick={incrementSafe}>+ (Safe)</button>
        </div>
    );
}

// Multiple state variables
function UserForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState(0);

    // Or use single object (be careful with updates!)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        age: 0
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <form>
            <input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
            />
            {/* ... other inputs */}
        </form>
    );
}

// Lazy initialization (expensive computation)
function ExpensiveComponent() {
    const [data, setData] = useState(() => {
        // Only runs on initial render
        return computeExpensiveValue();
    });

    return <div>{data}</div>;
}

function computeExpensiveValue() {
    console.log('Computing...');
    return Array.from({ length: 1000 }, (_, i) => i);
}
```

---

## Example 2: useEffect Hook

### 💡 **useEffect - Synchronizing with External Systems**

Connect React components to external systems and handle side effects.

**How It Works:**

Effects run asynchronously after React commits changes to the DOM, keeping rendering fast and responsive.

**Key Characteristics:**

1. **Handles Impure Operations:**
   - API calls and data fetching
   - Browser APIs (localStorage, DOM manipulation)
   - Third-party integrations
   - Logging and analytics
   - Subscriptions and event listeners

2. **Non-Blocking Execution:**
   - Runs after render commits
   - Doesn't block painting
   - Keeps UI responsive

3. **Dependency-Driven:**
   - Dependencies control when effect runs
   - React tracks changes automatically
   - Proper management prevents bugs

**Dependency Array Patterns:**

| Pattern | Behavior | Use Case |
|---------|----------|----------|
| **No array** | Runs every render | ❌ Usually wrong |
| **Empty `[]`** | Runs once on mount | Setup subscriptions, timers |
| **`[a, b]`** | Runs when a or b changes | Data fetching, sync with props |

**Critical Rules:**
- ✅ Include all dependencies used in effect
- ✅ Return cleanup for subscriptions/timers
- ✅ Handle race conditions in async effects
- ❌ Don't ignore ESLint warnings about dependencies

> **Key Insight:** The dependency array is not optional configuration - it's a declaration of what your effect depends on. React uses it to determine when to re-run your effect.

```javascript
import { useState, useEffect } from 'react';

// Basic useEffect - runs after every render
function BasicEffect() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        document.title = `Count: ${count}`;
    }); // No dependency array = runs after every render

    return <button onClick={() => setCount(count + 1)}>Click</button>;
}

// useEffect with dependencies
function DataFetcher({ userId }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Only runs when userId changes
        setLoading(true);

        fetch(`https://api.example.com/users/${userId}`)
            .then(res => res.json())
            .then(data => {
                setUser(data);
                setLoading(false);
            })
            .catch(error => {
                console.error(error);
                setLoading(false);
            });
    }, [userId]); // Dependency array

    if (loading) return <div>Loading...</div>;
    return <div>{user?.name}</div>;
}

// useEffect with cleanup
function WindowSize() {
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup function (runs before re-run and on unmount)
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []); // Empty array = run once on mount

    return <div>Window width: {width}px</div>;
}

// Multiple useEffects for separation of concerns
function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);

    // Effect 1: Fetch user data
    useEffect(() => {
        fetch(`/api/users/${userId}`)
            .then(res => res.json())
            .then(setUser);
    }, [userId]);

    // Effect 2: Fetch user posts
    useEffect(() => {
        fetch(`/api/users/${userId}/posts`)
            .then(res => res.json())
            .then(setPosts);
    }, [userId]);

    // Effect 3: Update document title
    useEffect(() => {
        if (user) {
            document.title = `${user.name}'s Profile`;
        }
    }, [user]);

    return <div>{/* render user and posts */}</div>;
}
```

---

## Example 3: Rules of Hooks

### 💡 **Rules of Hooks - Why They Exist**

Fundamental constraints that enable React's hooks to work correctly.

**How React Tracks Hooks:**

React relies on **call order** to match hook calls with their internal state:

```
First render:
  useState() → slot 1
  useEffect() → slot 2
  useState() → slot 3

Second render:
  useState() → slot 1 (matches!)
  useEffect() → slot 2 (matches!)
  useState() → slot 3 (matches!)
```

**What Breaks This:**

If call order changes between renders, React matches the wrong state to the wrong hook:

```
First render:
  useState() → slot 1
  if (condition) useState() → slot 2  // conditional!
  useEffect() → slot 3

Second render (condition false):
  useState() → slot 1
  // Missing slot 2!
  useEffect() → slot 2 (should be 3!) ❌ MISMATCH
```

**Why These Rules Enable Elegance:**

Alternative: Explicit IDs for each hook
```javascript
// What we'd need without call order:
useState('count', 0);  // Manual ID required
useState('name', '');  // More verbose
```

Current API (thanks to rules):
```javascript
// Clean, simple API:
const [count, setCount] = useState(0);
const [name, setName] = useState('');
```

**Automatic Enforcement:**

Install `eslint-plugin-react-hooks` to catch violations automatically:
- Warns about conditional hooks
- Catches hooks in loops
- Enforces dependency arrays

> **Key Insight:** These rules seem restrictive but they're what make the hooks API simple and elegant. The alternative would be requiring explicit IDs for every hook call.

```javascript
// ✅ CORRECT - Hooks at top level
function GoodComponent() {
    const [count, setCount] = useState(0);
    const [name, setName] = useState('');

    useEffect(() => {
        console.log('Effect runs');
    }, [count]);

    return <div>{count}</div>;
}

// ❌ WRONG - Conditional hook
function BadComponent({ condition }) {
    if (condition) {
        const [count, setCount] = useState(0); // DON'T DO THIS
    }

    return <div>Bad</div>;
}

// ✅ CORRECT - Conditional logic inside hook
function GoodConditional({ condition }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (condition) {
            // Conditional logic is fine inside the hook
            console.log(count);
        }
    }, [condition, count]);

    return <div>{count}</div>;
}

// ❌ WRONG - Hook in loop
function BadLoop() {
    const items = [1, 2, 3];

    items.forEach(item => {
        const [value, setValue] = useState(item); // DON'T DO THIS
    });

    return <div>Bad</div>;
}

// ✅ CORRECT - Use array for multiple values
function GoodLoop() {
    const [values, setValues] = useState([1, 2, 3]);

    return <div>{values.map(v => <div key={v}>{v}</div>)}</div>;
}
```

---

## Common Pitfalls

### ❌ Pitfall 1: Stale Closure in useEffect

**The Problem:**

Effects create closures that capture values at the time the effect was created. With empty dependencies, the effect never updates and uses stale values forever.

**Why It Happens:**

```
1. Effect runs with count = 0
2. Interval callback captures count = 0
3. Count changes to 1, 2, 3...
4. Interval still uses count = 0 (stale!)
```

**Common Scenario:**
- Timer/interval that updates state
- Event listener that reads state
- Subscription callback that uses props

```javascript
// PROBLEM
function Counter() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(count + 1); // Always uses initial count (0)!
        }, 1000);

        return () => clearInterval(interval);
    }, []); // Empty deps = count is stale

    return <div>{count}</div>;
}

// SOLUTION 1: Functional update
function CounterFixed1() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(prev => prev + 1); // Uses current value
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return <div>{count}</div>;
}

// SOLUTION 2: Include in dependencies
function CounterFixed2() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(count + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [count]); // Effect re-runs when count changes

    return <div>{count}</div>;
}
```

### ❌ Pitfall 2: Infinite Loop

**The Problem:**

Effect modifies state that's in its dependency array, creating an endless loop.

**The Cycle:**
```
Effect runs → Updates state → State in deps → Effect runs → ...
```

**Common Causes:**

| Cause | Why It Loops | Solution |
|-------|--------------|----------|
| **State in deps updated in effect** | Direct circular dependency | Remove from deps or add condition |
| **Object/array in deps** | New reference every render | Use primitive values or useMemo |
| **Function in deps** | Recreated each render | Use useCallback or move outside |

```javascript
// PROBLEM - Infinite loop
function InfiniteLoop() {
    const [data, setData] = useState([]);

    useEffect(() => {
        setData([...data, 'new']); // Causes re-render
    }, [data]); // data changes -> effect runs -> data changes...

    return <div>{data.length}</div>;
}

// SOLUTION - Fix dependencies or logic
function Fixed() {
    const [data, setData] = useState([]);

    useEffect(() => {
        // Only run once on mount
        fetch('/api/data')
            .then(res => res.json())
            .then(setData);
    }, []); // Empty array = run once

    return <div>{data.length}</div>;
}
```

### ⚠️ Pitfall 3: Missing Cleanup

**The Problem:**

Effects that create subscriptions, timers, or listeners keep running after component unmounts, causing memory leaks.

**What Needs Cleanup:**

| Resource | Setup | Cleanup Required |
|----------|-------|-----------------|
| **Timers** | `setInterval`, `setTimeout` | `clearInterval`, `clearTimeout` |
| **Event Listeners** | `addEventListener` | `removeEventListener` |
| **Subscriptions** | WebSocket, Firebase | `.close()`, `.unsubscribe()` |
| **API Requests** | `fetch()` | `AbortController.abort()` |

**Memory Leak Impact:**
- Timers continue firing
- Event handlers pile up
- Memory usage grows
- App slows down over time
- Potential crashes in long sessions

> **Critical Rule:** If your effect sets something up, it must clean it up. No exceptions.

```javascript
// PROBLEM - Memory leak
function BadSubscription({ userId }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        const subscription = subscribeToUser(userId, setData);
        // Missing cleanup!
    }, [userId]);

    return <div>{data}</div>;
}

// SOLUTION - Always cleanup
function GoodSubscription({ userId }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        const subscription = subscribeToUser(userId, setData);

        return () => {
            subscription.unsubscribe(); // Cleanup
        };
    }, [userId]);

    return <div>{data}</div>;
}
```

---

## Best Practices

### 1. Name Custom Hooks with "use" Prefix

**Custom Hooks Convention** - Custom hooks must start with "use" to follow React conventions and enable linting rules. This signals it's a hook and follows hook rules.

```javascript
// Good - custom hook
function useWindowSize() {
    const [size, setSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    useEffect(() => {
        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return size;
}

// Usage
function Component() {
    const { width, height } = useWindowSize();
    return <div>{width} x {height}</div>;
}
```

### 2. Separate Concerns with Multiple useEffects

**useEffect** - Best practice to use multiple useEffect hooks for different concerns rather than one complex effect. Makes code more maintainable and easier to debug.

```javascript
// Good - each effect has one responsibility
function UserDashboard({ userId }) {
    const [user, setUser] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    // Effect 1: User data
    useEffect(() => {
        fetchUser(userId).then(setUser);
    }, [userId]);

    // Effect 2: Analytics
    useEffect(() => {
        fetchAnalytics(userId).then(setAnalytics);
    }, [userId]);

    // Effect 3: Page title
    useEffect(() => {
        if (user) {
            document.title = user.name;
        }
    }, [user]);

    return <div>{/* ... */}</div>;
}
```

### 3. Use Functional Updates for State Based on Previous State

**useState** - When new state depends on previous state, always use the functional update form `setState(prev => ...)` to ensure correctness.

```javascript
// Good
function Counter() {
    const [count, setCount] = useState(0);

    const increment = () => {
        setCount(prev => prev + 1);
    };

    const incrementByTen = () => {
        // All updates use current value
        for (let i = 0; i < 10; i++) {
            setCount(prev => prev + 1);
        }
    };

    return <button onClick={incrementByTen}>+10</button>;
}
```

---

## React 18: Automatic Batching

### 💡 **Automatic Batching - Major Performance Win**

React 18 batches ALL state updates into single re-renders, everywhere.

**The Evolution:**

**React 17 - Partial Batching:**
```javascript
// ✅ Batched in event handlers
onClick={() => {
  setState1();
  setState2();
  // 1 render
}}

// ❌ NOT batched in async
fetch().then(() => {
  setState1();  // Render #1
  setState2();  // Render #2
  // 2 renders!
});
```

**React 18 - Universal Batching:**
```javascript
// ✅ Batched everywhere!
fetch().then(() => {
  setState1();
  setState2();
  setState3();
  // 1 render!
});

setTimeout(() => {
  setState1();
  setState2();
  // 1 render!
}, 1000);
```

**Impact on Data Fetching:**

Common pattern with 3 state updates:
```javascript
setLoading(false);
setData(result);
setError(null);
```

| React Version | Re-renders | Performance |
|---------------|-----------|-------------|
| **React 17** | 3 separate renders | ❌ Slower |
| **React 18** | 1 batched render | ✅ Faster |

**Benefits:**

- ✅ **Zero code changes** - automatic upgrade
- ✅ **Better performance** - fewer re-renders
- ✅ **Consistent behavior** - works everywhere
- ✅ **Especially impactful** - data fetching, async operations

**Opt-Out (Rare Cases):**

Use `flushSync` when you need synchronous updates:
- Measuring DOM after state change
- Third-party library integration
- Specific timing requirements

**Warning:** `flushSync` hurts performance. Use sparingly.

> **Key Insight:** React 18's automatic batching is a free performance boost for existing code. Your React 17 app automatically runs faster in React 18.

```javascript
import { useState } from 'react';

// React 17 - Multiple renders in async
function React17Behavior() {
    const [count, setCount] = useState(0);
    const [flag, setFlag] = useState(false);

    const handleClick = () => {
        setTimeout(() => {
            setCount(c => c + 1); // Causes re-render in React 17
            setFlag(f => !f);      // Causes another re-render in React 17
            // In React 17: 2 re-renders
            // In React 18: 1 re-render (automatic batching)
        }, 1000);
    };

    console.log('Rendered'); // Logs once in React 18, twice in React 17

    return (
        <div>
            <p>Count: {count}</p>
            <p>Flag: {flag.toString()}</p>
            <button onClick={handleClick}>Update</button>
        </div>
    );
}

// React 18 - All updates are batched
function AutoBatchingExample() {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setData(null);
        // Both updates batched - only 1 render

        const response = await fetch('/api/data');
        const result = await response.json();

        setData(result);
        setLoading(false);
        setCount(c => c + 1);
        // All 3 updates batched - only 1 render!
    };

    return (
        <div>
            <button onClick={fetchData}>Fetch</button>
            {loading && <p>Loading...</p>}
            {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
            <p>Fetch count: {count}</p>
        </div>
    );
}

// Opt-out of batching (rare cases)
import { flushSync } from 'react-dom';

**flushSync** - Forces React to flush updates synchronously, opting out of automatic batching. Use sparingly as it can hurt performance.

function OptOutExample() {
    const [count, setCount] = useState(0);
    const [flag, setFlag] = useState(false);

    const handleClick = () => {
        flushSync(() => {
            setCount(c => c + 1); // Forces immediate render
        });
        // DOM updated here
        flushSync(() => {
            setFlag(f => !f); // Forces another render
        });
        // DOM updated again
    };

    return <button onClick={handleClick}>Click</button>;
}
```

### Benefits of Automatic Batching:
- Fewer re-renders = better performance
- Works everywhere (async, timeouts, promises, native events)
- No code changes needed - automatic upgrade
- Consistent behavior across all event handlers

---

## Real-world Scenarios

### Scenario 1: Form Handling

### 💡 **Pattern: Controlled Form with Validation**

Manage form state, validation, and submission with multiple coordinated state variables.

**State Architecture:**

| State | Purpose | Type |
|-------|---------|------|
| **formData** | Input values | Object |
| **errors** | Validation messages | Object |
| **isSubmitting** | Submission status | Boolean |

**Flow:**
```
User types → Update formData → Clear error → Show validation
Submit → Set isSubmitting → API call → Update states → Reset form
```

**Key Patterns:**
- ✅ Object state for related form fields
- ✅ Spread operator for immutable updates
- ✅ Clear errors on user input
- ✅ Loading state prevents double submission

```javascript
function ContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await submitForm(formData);
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            setErrors(error.fieldErrors);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                name="name"
                value={formData.name}
                onChange={handleChange}
            />
            {errors.name && <span>{errors.name}</span>}
            {/* ... */}
        </form>
    );
}
```

### Scenario 2: Data Fetching with Loading and Error States

### 💡 **Pattern: Safe Data Fetching**

Complete data fetching with proper state management and cleanup.

**Three-State Pattern:**

| State | Purpose | Initial Value |
|-------|---------|---------------|
| **data** | Fetched data | `[]` or `null` |
| **loading** | Request in progress | `true` |
| **error** | Error message | `null` |

**State Transitions:**

```
Initial: loading=true, error=null, data=null
   ↓
Success: loading=false, error=null, data={...}
   ↓ OR
Error: loading=false, error="...", data=null
```

**Critical: Cleanup Pattern**

Why we need `cancelled` flag:
1. Component unmounts during fetch
2. Without cleanup: setState on unmounted component
3. Result: Memory leak and console warnings

**Benefits:**
- ✅ Handles all fetch states
- ✅ Prevents memory leaks
- ✅ User sees loading/error feedback
- ✅ Safe unmounting

```javascript
function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/users');

                if (!response.ok) throw new Error('Failed to fetch');

                const data = await response.json();

                if (!cancelled) {
                    setUsers(data);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchUsers();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <ul>
            {users.map(user => (
                <li key={user.id}>{user.name}</li>
            ))}
        </ul>
    );
}
```

---

## External Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)
- [useState Hook](https://react.dev/reference/react/useState)
- [useEffect Hook](https://react.dev/reference/react/useEffect)

---

[← Back to React](./README.md) | [Next: Advanced Hooks →](./04-advanced-hooks.md)
