# Advanced Hooks (React 18)

## Why Advanced Hooks Matter

**Interview Perspective:**
- Advanced hooks appear in 80% of senior React interviews
- Understanding useReducer vs useState demonstrates architectural knowledge
- Performance hooks (useCallback, useMemo) are critical for optimization discussions
- React 18 concurrent hooks show cutting-edge knowledge
- Custom hook patterns using advanced hooks test composition skills

**Real-World Importance:**
- **Global State Management**: useContext + useReducer powers medium-complexity apps without Redux
- **Performance Optimization**: useCallback/useMemo prevent unnecessary re-renders in large component trees
- **DOM Interactions**: useRef enables imperative operations (focus, animations, third-party libraries)
- **Concurrent Features**: useTransition/useDeferredValue keep UI responsive during heavy operations
- **Production Apps**: Every medium-to-large React app uses these hooks extensively

---

## Core Concepts Overview

| Hook | Purpose | When to Use | React 18 |
|------|---------|-------------|----------|
| **useContext** | Share data across component tree | Theme, auth, global state | Enhanced batching |
| **useReducer** | Complex state logic with actions | Multiple state values, complex updates | Enhanced batching |
| **useCallback** | Memoize function references | Passing callbacks to memoized children | - |
| **useMemo** | Memoize expensive calculations | Heavy computations, derived data | - |
| **useRef** | Mutable values, DOM access | Focus, animations, previous values | Cleanup support |
| **useId** | Generate unique IDs | Accessibility, form fields | ✅ New |
| **useTransition** | Mark updates as non-urgent | Search filters, tab switching | ✅ New |
| **useDeferredValue** | Defer expensive updates | Large lists, heavy components | ✅ New |
| **useSyncExternalStore** | Subscribe to external stores | Browser APIs, global stores | ✅ New |

---

## Example 1: useContext

### 💡 **Solving Prop Drilling with Context**

Context creates a "wormhole" for data through the component tree, eliminating the need to pass props through every intermediate component.

**The Prop Drilling Problem:**

❌ **Without Context** (Prop Drilling):
```jsx
<App user={user}>
  <Dashboard user={user}>
    <Sidebar user={user}>
      <UserMenu user={user}>
        <UserProfile user={user} />  // Finally uses it!
      </UserMenu>
    </Sidebar>
  </Dashboard>
</App>
```

✅ **With Context** (Direct Access):
```jsx
<UserContext.Provider value={user}>
  <App>
    <Dashboard>
      <Sidebar>
        <UserMenu>
          <UserProfile />  // Accesses user directly via useContext!
        </UserMenu>
      </Sidebar>
    </Dashboard>
  </App>
</UserContext.Provider>
```

**Key Characteristics:**

| Aspect | Details |
|--------|---------|
| **Purpose** | Share data across component tree without props |
| **Best For** | Themes, auth, language, user preferences |
| **Performance Note** | All consumers re-render when value changes |
| **Optimization** | Split contexts by concern to prevent unnecessary re-renders |
| **Alternative to** | Redux for medium-complexity state |

⚠️ **Critical Performance Consideration:**
> Any component using a context re-renders when that context value changes, **even if it doesn't use the changed part**. This is why separating contexts (theme vs. user data) prevents unnecessary re-renders.

```jsx
import React, { createContext, useContext, useState } from 'react';

// Create context
const ThemeContext = createContext();
const UserContext = createContext();

// Provider component
function App() {
    const [theme, setTheme] = useState('light');
    const [user, setUser] = useState({ name: 'John', role: 'admin' });

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <UserContext.Provider value={{ user, setUser }}>
                <Toolbar />
            </UserContext.Provider>
        </ThemeContext.Provider>
    );
}

// Deep nested component can access context directly
function Toolbar() {
    return (
        <div>
            <ThemedButton />
            <UserProfile />
        </div>
    );
}

function ThemedButton() {
    // No need to pass props through every level!
    const { theme, setTheme } = useContext(ThemeContext);

    return (
        <button
            style={{
                background: theme === 'light' ? '#fff' : '#333',
                color: theme === 'light' ? '#333' : '#fff'
            }}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
            Toggle Theme (Current: {theme})
        </button>
    );
}

function UserProfile() {
    const { user } = useContext(UserContext);
    const { theme } = useContext(ThemeContext);

    return (
        <div style={{ color: theme === 'light' ? '#333' : '#fff' }}>
            <h3>{user.name}</h3>
            <p>Role: {user.role}</p>
        </div>
    );
}
```

### How it works:
1. Create context with `createContext()`
2. Wrap components with Provider and pass value
3. Use `useContext()` in any nested component to access the value
4. No need to pass props through intermediate components

---

## Example 2: useReducer

### 💡 **useReducer - Redux Pattern for Complex State**

React's built-in implementation of the Redux pattern for managing complex state transitions.

**How It Works:**

```
Action Dispatched → Reducer Function → New State → Component Re-renders
```

**Key Characteristics:**

1. **Centralized State Logic:**
   - All state updates in one reducer function
   - Easier to reason about state changes
   - Test reducer independently from components
   - Avoid scattered setState calls

2. **Action-Based Updates:**
   - Descriptive action types as documentation
   - Payload for additional data
   - Predictable state transitions
   - Clear intent of each update

3. **Better for Complex State:**
   - Multiple sub-values that change together
   - Complex update logic
   - State depends on previous state
   - Multi-step workflows

**useState vs useReducer:**

| Scenario | Use useState | Use useReducer |
|----------|-------------|----------------|
| **Simple values** | ✅ Single toggle, counter | ❌ Overkill |
| **Related state** | ⚠️ Multiple setState calls | ✅ Single dispatch |
| **Complex logic** | ❌ Scattered conditions | ✅ Centralized reducer |
| **State history** | ❌ Hard to track | ✅ Action log |
| **Testing** | ⚠️ Test in component | ✅ Test reducer alone |

**When to Use useReducer:**

- ✅ Form validation with multiple fields
- ✅ Multi-step wizards
- ✅ Undo/redo functionality
- ✅ State depends on previous state
- ✅ Complex state objects
- ❌ Simple counters or toggles

**Pattern with useContext:**

> **Key Insight:** Combine useReducer + useContext for Redux-like state management without external libraries. Perfect for medium-complexity apps.

```jsx
import { useReducer } from 'react';

// Define action types
const ACTIONS = {
    INCREMENT: 'increment',
    DECREMENT: 'decrement',
    RESET: 'reset',
    SET_COUNT: 'set-count'
};

// Reducer function
function counterReducer(state, action) {
    switch (action.type) {
        case ACTIONS.INCREMENT:
            return { count: state.count + 1 };
        case ACTIONS.DECREMENT:
            return { count: state.count - 1 };
        case ACTIONS.RESET:
            return { count: 0 };
        case ACTIONS.SET_COUNT:
            return { count: action.payload };
        default:
            throw new Error(`Unknown action: ${action.type}`);
    }
}

function Counter() {
    const [state, dispatch] = useReducer(counterReducer, { count: 0 });

    return (
        <div>
            <p>Count: {state.count}</p>
            <button onClick={() => dispatch({ type: ACTIONS.INCREMENT })}>
                +1
            </button>
            <button onClick={() => dispatch({ type: ACTIONS.DECREMENT })}>
                -1
            </button>
            <button onClick={() => dispatch({ type: ACTIONS.RESET })}>
                Reset
            </button>
            <button onClick={() => dispatch({ type: ACTIONS.SET_COUNT, payload: 10 })}>
                Set to 10
            </button>
        </div>
    );
}

// Complex state example
**useReducer for Async State** - Demonstrates managing loading, error, and data states in a single reducer. Each action type handles a different phase of the async operation.

const initialState = {
    user: null,
    loading: false,
    error: null
};

function userReducer(state, action) {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, loading: false, user: action.payload };
        case 'FETCH_ERROR':
            return { ...state, loading: false, error: action.payload };
        case 'LOGOUT':
            return { ...state, user: null };
        default:
            return state;
    }
}

function UserProfile() {
    const [state, dispatch] = useReducer(userReducer, initialState);

    const fetchUser = async () => {
        dispatch({ type: 'FETCH_START' });
        try {
            const res = await fetch('/api/user');
            const data = await res.json();
            dispatch({ type: 'FETCH_SUCCESS', payload: data });
        } catch (error) {
            dispatch({ type: 'FETCH_ERROR', payload: error.message });
        }
    };

    return (
        <div>
            {state.loading && <p>Loading...</p>}
            {state.error && <p>Error: {state.error}</p>}
            {state.user && <p>Welcome, {state.user.name}!</p>}
            <button onClick={fetchUser}>Fetch User</button>
            <button onClick={() => dispatch({ type: 'LOGOUT' })}>Logout</button>
        </div>
    );
}
```

---

## Example 3: useCallback

### 💡 **useCallback - Memoize Function References**

Preserves function identity across renders to prevent unnecessary child re-renders.

**The Problem It Solves:**

**Without useCallback:**
```
Parent renders → New function created → Child receives new prop → Child re-renders
```

**With useCallback:**
```
Parent renders → Same function returned → Child prop unchanged → Child skips render
```

**How It Works:**

1. **Function Memoization:**
   - Returns same function reference until dependencies change
   - Function identity stays stable
   - Prevents child component re-renders

2. **Works with React.memo:**
   - `memo()` does shallow comparison of props
   - New function = different reference = re-render
   - `useCallback` keeps reference stable

**When to Use:**

| Scenario | useCallback? | Why |
|----------|-------------|-----|
| **Function passed to memo'd child** | ✅ Yes | Prevents re-render |
| **Function passed to regular div** | ❌ No | No optimization benefit |
| **Dependency of useEffect** | ✅ Yes | Prevents effect re-run |
| **Simple onClick handler** | ❌ No | Premature optimization |
| **Expensive function** | ❌ No | Use useMemo for results |

**Common Pattern:**

```jsx
// Parent optimizes callback
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Child memoized to skip re-renders
const Child = memo(({ onClick }) => {
  return <button onClick={onClick}>Click</button>;
});
```

> **Key Rule:** Only use useCallback when passing functions to memoized children or as effect dependencies. Otherwise, it adds overhead without benefit.

```jsx
import { useState, useCallback, memo } from 'react';

// Child component that should only re-render when necessary
const ExpensiveChild = memo(({ onAction, label }) => {
    console.log(`Rendering ${label}`);

    return <button onClick={onAction}>{label}</button>;
});

function ParentComponent() {
    const [count, setCount] = useState(0);
    const [other, setOther] = useState(0);

    // WITHOUT useCallback - function is recreated on every render
    const handleClickBad = () => {
        console.log('Clicked');
    };

    // WITH useCallback - function is memoized
    const handleClickGood = useCallback(() => {
        console.log('Clicked', count);
    }, [count]); // Recreated only when count changes

    const handleOtherClick = useCallback(() => {
        setOther(prev => prev + 1);
    }, []); // Never recreated (no dependencies)

    return (
        <div>
            <p>Count: {count}</p>
            <p>Other: {other}</p>
            <button onClick={() => setCount(count + 1)}>Increment Count</button>

            {/* This re-renders every time parent renders (bad) */}
            <ExpensiveChild onAction={handleClickBad} label="Bad (always re-renders)" />

            {/* This only re-renders when count changes */}
            <ExpensiveChild onAction={handleClickGood} label="Good (optimized)" />

            {/* This never re-renders */}
            <ExpensiveChild onAction={handleOtherClick} label="Best (stable)" />
        </div>
    );
}

// Real-world example: Search with debounce
**useCallback with Debounce** - Combines useCallback with a debounced function to optimize API calls during user input. The memoized debounce function maintains its timeout state across renders.

function SearchComponent() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const debouncedSearch = useCallback(
        debounce((searchTerm) => {
            fetch(`/api/search?q=${searchTerm}`)
                .then(res => res.json())
                .then(setResults);
        }, 500),
        [] // Stable reference
    );

    const handleChange = useCallback((e) => {
        const value = e.target.value;
        setQuery(value);
        debouncedSearch(value);
    }, [debouncedSearch]);

    return (
        <div>
            <input value={query} onChange={handleChange} />
            {results.map(r => <div key={r.id}>{r.name}</div>)}
        </div>
    );
}

// Debounce helper
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
```

---

## Example 4: useMemo

### 💡 **useMemo - Memoize Expensive Calculations**

Caches computed values and only recalculates when dependencies change.

**The Problem It Solves:**

**Without useMemo:**
```
Component renders → Expensive calculation runs → Result used → Render completes
(Repeats on every render, even if inputs unchanged)
```

**With useMemo:**
```
Component renders → Check dependencies → Use cached result → Render completes
(Calculation only runs when dependencies change)
```

**How It Works:**

1. **Value Memoization:**
   - Calls the function and caches the result
   - Returns cached value on subsequent renders
   - Recalculates only when dependencies change

2. **Performance Optimization:**
   - Skips expensive operations
   - Reduces render time
   - Improves UI responsiveness

**useMemo vs useCallback:**

| Hook | Memoizes | Returns | Use For |
|------|----------|---------|---------|
| **useMemo** | Function result | Computed value | Expensive calculations |
| **useCallback** | Function itself | Function reference | Stable function identity |

**When to Use:**

| Operation | useMemo? | Why |
|-----------|----------|-----|
| **Filter 10,000 items** | ✅ Yes | Expensive operation |
| **Filter 10 items** | ❌ No | Faster without memoization |
| **Complex calculations** | ✅ Yes | Save computation time |
| **String concatenation** | ❌ No | Trivial operation |
| **Object/array creation** | ✅ Sometimes | Stabilize references for deps |

**Common Patterns:**

```jsx
// Heavy computation
const filtered = useMemo(() =>
  items.filter(i => i.active),
  [items]
);

// Stabilize object reference
const config = useMemo(() => ({
  theme,
  locale
}), [theme, locale]);
```

> **Key Insight:** useMemo is for expensive calculations. Don't memoize everything - measure first, optimize second. The memoization itself has overhead.

```jsx
import { useState, useMemo } from 'react';

function ExpensiveComputation() {
    const [count, setCount] = useState(0);
    const [input, setInput] = useState('');

    // Expensive calculation - only recalculated when count changes
    const expensiveValue = useMemo(() => {
        console.log('Computing expensive value...');
        let result = 0;
        for (let i = 0; i < 1000000000; i++) {
            result += count;
        }
        return result;
    }, [count]); // Only recompute when count changes

    // This would recalculate on every render (input change triggers re-render)
    // const expensiveValue = computeExpensiveValue(count);

    return (
        <div>
            <h3>Expensive Value: {expensiveValue}</h3>
            <button onClick={() => setCount(count + 1)}>Increment Count</button>

            {/* This causes re-render but doesn't recalculate expensiveValue */}
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type something..."
            />
        </div>
    );
}

// Example: Filtering and sorting large lists
**useMemo for Data Processing** - Memoizes filtered and sorted data to avoid reprocessing large lists on every render. Only recalculates when users, searchTerm, or sortBy changes.

function UserList({ users }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');

    // Memoize filtered and sorted results
    const processedUsers = useMemo(() => {
        console.log('Filtering and sorting users...');

        let filtered = users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'age') return a.age - b.age;
            return 0;
        });
    }, [users, searchTerm, sortBy]);

    return (
        <div>
            <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Sort by Name</option>
                <option value="age">Sort by Age</option>
            </select>

            {processedUsers.map(user => (
                <div key={user.id}>
                    {user.name} - {user.age}
                </div>
            ))}
        </div>
    );
}

// Memoizing object/array references
**useMemo for Reference Stability** - Memoizes object/array references to prevent child components from re-rendering unnecessarily when parent renders but the actual data hasn't changed.

function ObjectMemo({ items }) {
    const [count, setCount] = useState(0);

    // Without useMemo, new object on every render
    const config = useMemo(() => ({
        color: 'blue',
        size: 'large',
        items: items.filter(i => i.active)
    }), [items]);

    return <ChildComponent config={config} />;
}
```

---

## Example 5: useRef

### 💡 **useRef - Mutable Values Without Re-renders**

Creates a persistent mutable container that survives across renders without causing re-renders.

**How It Works:**

```
useRef returns: { current: initialValue }
Mutate: ref.current = newValue (no re-render)
Access: ref.current (always current value)
```

**Key Characteristics:**

1. **Persistence Without Re-renders:**
   - Value survives across renders
   - Updating doesn't trigger re-render
   - Same object reference always

2. **Mutable Container:**
   - Can modify `ref.current` directly
   - No setter function needed
   - Changes are immediate

**useRef vs useState:**

| Feature | useRef | useState |
|---------|--------|----------|
| **Triggers re-render** | ❌ No | ✅ Yes |
| **Persists across renders** | ✅ Yes | ✅ Yes |
| **Mutable** | ✅ Direct mutation | ❌ Use setter |
| **Use for UI** | ❌ No | ✅ Yes |
| **Use for side effects** | ✅ Yes | ❌ No |

**Common Use Cases:**

| Use Case | Example | Why useRef |
|----------|---------|-----------|
| **DOM access** | Focus input, measure size | Need DOM reference |
| **Interval/timeout IDs** | Store timer ID | Need to clear later |
| **Previous values** | Track prev props/state | Compare changes |
| **Animation frames** | Store requestAnimationFrame ID | Need to cancel |
| **Third-party instances** | Store library objects | Persist across renders |

**Critical Rules:**

✅ **Safe to mutate:**
- Inside useEffect
- Inside event handlers
- Inside async callbacks

❌ **Never mutate during render:**
- Violates React purity
- Unpredictable in Concurrent Mode
- Causes bugs

> **Key Insight:** useRef is your escape hatch from React's declarative model. Use it for imperative operations (DOM manipulation, timers) that don't affect the rendered output.

```jsx
import { useRef, useState, useEffect } from 'react';

// Use case 1: Accessing DOM elements
**useRef for DOM Access** - Stores a reference to a DOM element, allowing direct manipulation like focusing an input without causing re-renders.

function FocusInput() {
    const inputRef = useRef(null);

    const handleFocus = () => {
        inputRef.current.focus();
    };

    useEffect(() => {
        // Auto-focus on mount
        inputRef.current.focus();
    }, []);

    return (
        <div>
            <input ref={inputRef} type="text" />
            <button onClick={handleFocus}>Focus Input</button>
        </div>
    );
}

// Use case 2: Storing mutable values that don't cause re-renders
**useRef for Mutable Values** - Stores interval IDs or other values that need to persist but shouldn't trigger re-renders. Essential for cleanup of timers and subscriptions.

function Timer() {
    const [count, setCount] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef(null);

    const startTimer = () => {
        if (!isRunning) {
            setIsRunning(true);
            intervalRef.current = setInterval(() => {
                setCount(c => c + 1);
            }, 1000);
        }
    };

    const stopTimer = () => {
        setIsRunning(false);
        clearInterval(intervalRef.current);
    };

    useEffect(() => {
        // Cleanup on unmount
        return () => clearInterval(intervalRef.current);
    }, []);

    return (
        <div>
            <h2>{count}s</h2>
            <button onClick={startTimer} disabled={isRunning}>Start</button>
            <button onClick={stopTimer} disabled={!isRunning}>Stop</button>
        </div>
    );
}

// Use case 3: Previous value tracking
**useRef for Previous Values** - Custom hook that tracks the previous value of a prop or state. Updates the ref in useEffect after render, so it always holds the previous value.

function usePrevious(value) {
    const ref = useRef();

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

function Counter() {
    const [count, setCount] = useState(0);
    const prevCount = usePrevious(count);

    return (
        <div>
            <p>Current: {count}</p>
            <p>Previous: {prevCount}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}

// Use case 4: Measuring element dimensions
**useRef with getBoundingClientRect** - Accesses DOM element dimensions using getBoundingClientRect(). Useful for responsive layouts and positioning calculations.

function MeasureExample() {
    const divRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (divRef.current) {
            const { width, height } = divRef.current.getBoundingClientRect();
            setDimensions({ width, height });
        }
    }, []);

    return (
        <div ref={divRef}>
            <p>Width: {dimensions.width}px</p>
            <p>Height: {dimensions.height}px</p>
        </div>
    );
}

// Use case 5: Avoiding stale closures
**useRef to Avoid Stale Closures** - Maintains a reference to the latest value for use in async operations or event handlers, avoiding stale closures in setTimeout or callbacks.

function LatestValue() {
    const [count, setCount] = useState(0);
    const latestCount = useRef(count);

    useEffect(() => {
        latestCount.current = count;
    }, [count]);

    const handleAsyncAction = () => {
        setTimeout(() => {
            // Uses latest value, not stale closure
            console.log('Latest count:', latestCount.current);
        }, 3000);
    };

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>Increment</button>
            <button onClick={handleAsyncAction}>Log after 3s</button>
        </div>
    );
}
```

---

## React 18: New Concurrent Hooks

### Example 6: useId

**useId** - Generates unique, stable IDs for accessibility attributes. IDs are consistent between server and client renders, preventing SSR hydration mismatches.

```jsx
import { useId } from 'react';

// Generate unique IDs for accessibility
function FormField({ label, type = 'text' }) {
    const id = useId(); // Generates unique ID like ":r1:"

    return (
        <div>
            <label htmlFor={id}>{label}</label>
            <input id={id} type={type} />
        </div>
    );
}

// Multiple fields in same component
**Multiple useId Calls** - Each call to useId generates a unique ID. Use multiple calls in the same component for different form fields.

function RegistrationForm() {
    const nameId = useId();
    const emailId = useId();
    const passwordId = useId();

    return (
        <form>
            <label htmlFor={nameId}>Name</label>
            <input id={nameId} type="text" />

            <label htmlFor={emailId}>Email</label>
            <input id={emailId} type="email" />

            <label htmlFor={passwordId}>Password</label>
            <input id={passwordId} type="password" />
        </form>
    );
}

// Related elements with same base ID
**useId with aria-describedby** - Demonstrates using a single base ID with suffixes for related elements like labels, inputs, and hint text for better accessibility.

function AccessibleField({ label }) {
    const id = useId();

    return (
        <div>
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                type="text"
                aria-describedby={`${id}-hint`}
            />
            <span id={`${id}-hint`}>
                Enter your information here
            </span>
        </div>
    );
}

// Why useId? Solves SSR hydration mismatches
**SSR Hydration Safety** - Shows why useId is necessary: Math.random() generates different IDs on server and client, causing hydration errors. useId ensures consistency.

// BAD - Math.random() causes hydration mismatch
function BadUniqueId() {
    const id = `field-${Math.random()}`;
    return <input id={id} />;
}

// GOOD - useId is consistent between server and client
function GoodUniqueId() {
    const id = useId();
    return <input id={id} />;
}
```

### Example 7: useTransition

### 💡 **useTransition - Keep UI Responsive**

Marks state updates as non-urgent, allowing React to prioritize more important updates.

**How It Works:**

```
User types → Urgent update (input) renders immediately
           → Non-urgent update (results) can be interrupted
           → UI stays responsive
```

**Returns:**
```jsx
const [isPending, startTransition] = useTransition();
```

**Key Characteristics:**

1. **Update Prioritization:**
   - Urgent updates (user input) happen immediately
   - Non-urgent updates (heavy rendering) can be interrupted
   - React decides optimal scheduling

2. **Pending State:**
   - `isPending` tells you when transition is happening
   - Show loading indicators
   - Reduce opacity of updating content

3. **Better UX:**
   - Input stays responsive during heavy operations
   - No frozen UI
   - Smooth interactions

**Urgent vs Non-Urgent:**

| Update Type | Priority | Example |
|-------------|----------|---------|
| **Urgent** | Immediate | Input field, button click response |
| **Non-Urgent** | Deferred | Search results, filtered lists, tab content |

**When to Use:**

| Scenario | useTransition? | Why |
|----------|---------------|-----|
| **Tab switching** | ✅ Yes | Keep tabs responsive |
| **Search filtering** | ✅ Yes | Keep input responsive |
| **Large list updates** | ✅ Yes | Prevent UI freeze |
| **Simple state toggle** | ❌ No | Already fast |
| **Form submission** | ✅ Sometimes | Show pending state |

> **Key Insight:** useTransition tells React "this update can wait if something more important happens." Perfect for keeping UI responsive during expensive operations.

```jsx
import { useState, useTransition } from 'react';

// Mark updates as non-urgent (won't block UI)
function SearchWithTransition() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isPending, startTransition] = useTransition();

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value); // Urgent: update input immediately

        // Non-urgent: update results (can be interrupted)
        startTransition(() => {
            const filtered = hugeDataset.filter(item =>
                item.name.toLowerCase().includes(value.toLowerCase())
            );
            setResults(filtered);
        });
    };

    return (
        <div>
            <input
                type="text"
                value={query}
                onChange={handleChange}
                placeholder="Search..."
            />
            {isPending && <span>Updating results...</span>}
            <div style={{ opacity: isPending ? 0.5 : 1 }}>
                {results.map(item => (
                    <div key={item.id}>{item.name}</div>
                ))}
            </div>
        </div>
    );
}

// Tab switching example
**useTransition for Tab Navigation** - Defers expensive tab content rendering to keep tab buttons responsive. Shows loading indicator while transition is pending.

function TabContainer() {
    const [activeTab, setActiveTab] = useState('home');
    const [isPending, startTransition] = useTransition();

    const switchTab = (tab) => {
        startTransition(() => {
            setActiveTab(tab); // Non-urgent update
        });
    };

    return (
        <div>
            <button onClick={() => switchTab('home')}>Home</button>
            <button onClick={() => switchTab('profile')}>Profile</button>
            <button onClick={() => switchTab('settings')}>Settings</button>

            {isPending && <div>Loading...</div>}

            <div style={{ opacity: isPending ? 0.6 : 1 }}>
                {activeTab === 'home' && <ExpensiveHomeTab />}
                {activeTab === 'profile' && <ExpensiveProfileTab />}
                {activeTab === 'settings' && <ExpensiveSettingsTab />}
            </div>
        </div>
    );
}

// Real-world: Form submission
**useTransition for Async Operations** - Wraps async form submissions in transitions to show loading states and keep the form interactive during submission.

function FormWithTransition() {
    const [name, setName] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e) => {
        e.preventDefault();

        startTransition(async () => {
            await submitForm({ name });
            // Navigate or update UI
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
            />
            <button disabled={isPending}>
                {isPending ? 'Submitting...' : 'Submit'}
            </button>
        </form>
    );
}

const hugeDataset = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
}));

function ExpensiveHomeTab() {
    return <div>Home content with expensive rendering...</div>;
}
function ExpensiveProfileTab() {
    return <div>Profile content with expensive rendering...</div>;
}
function ExpensiveSettingsTab() {
    return <div>Settings content with expensive rendering...</div>;
}
```

### Example 8: useDeferredValue

### 💡 **useDeferredValue - Defer Expensive Updates**

Creates a "lagged" version of a value that updates after more urgent updates.

**How It Works:**

```
User types "a" → query = "a" (immediate)
             → deferredQuery = "" (still old)
             → Expensive list renders with ""

Next frame    → deferredQuery = "a" (catches up)
             → Expensive list renders with "a"
```

**Key Difference from useTransition:**

| Feature | useTransition | useDeferredValue |
|---------|--------------|------------------|
| **Control** | You wrap the setState | React defers the value |
| **Returns** | [isPending, startTransition] | deferred value |
| **Use When** | You own the setState | Value from props/state |

**When to Use:**

| Scenario | Best Choice | Why |
|----------|------------|-----|
| **Control the update** | useTransition | Wrap setState directly |
| **Value from parent** | useDeferredValue | Can't wrap parent's setState |
| **Multiple consumers** | useDeferredValue | One deferred value, many uses |

**Pattern:**

```jsx
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);

// query updates immediately (input stays responsive)
// deferredQuery updates after (list updates when React has time)
```

**Detecting Stale State:**

```jsx
const isStale = query !== deferredQuery;
// true when deferred value hasn't caught up yet
```

> **Key Insight:** useDeferredValue is like useTransition but for values instead of updates. Use it when you receive a value from props or can't control the setState.

```jsx
import { useState, useDeferredValue, memo } from 'react';

// Defer updates to non-urgent parts of UI
function SearchWithDeferred() {
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);

    // query updates immediately (input stays responsive)
    // deferredQuery updates after urgent updates

    return (
        <div>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
            />
            {/* Uses deferred value for expensive list */}
            <ExpensiveList query={deferredQuery} />
        </div>
    );
}

const ExpensiveList = memo(({ query }) => {
    // This component re-renders only when deferredQuery changes
    const items = hugeDataset.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <ul>
            {items.map(item => (
                <li key={item.id}>{item.name}</li>
            ))}
        </ul>
    );
});

// Show stale content indicator
**useDeferredValue with Stale Indicator** - Detects when deferred value lags behind actual value to show loading indicators or reduce opacity during updates.

function SearchWithIndicator() {
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);

    const isStale = query !== deferredQuery;

    return (
        <div>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div style={{ opacity: isStale ? 0.5 : 1 }}>
                {isStale && <span>Updating...</span>}
                <ExpensiveList query={deferredQuery} />
            </div>
        </div>
    );
}

// Comparison: useTransition vs useDeferredValue
**useTransition vs useDeferredValue** - useTransition gives you control over when to defer (wrap state update), while useDeferredValue automatically defers the value itself.

function ComparisonExample() {
    // useTransition - you control when to defer
    const [isPending, startTransition] = useTransition();
    const [tab, setTab] = useState('home');

    const switchTab = (newTab) => {
        startTransition(() => setTab(newTab));
    };

    // useDeferredValue - React defers the value automatically
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);

    return <div>Both achieve similar results, use what fits your use case</div>;
}
```

### Example 9: useSyncExternalStore

### 💡 **useSyncExternalStore - Subscribe to External Stores**

Safely subscribes to external data sources with React 18 concurrent rendering support.

**How It Works:**

```
Component mounts → Subscribe to external store
External store changes → React gets snapshot
React detects change → Component re-renders
Component unmounts → Unsubscribe (cleanup)
```

**Three Functions Required:**

| Function | Purpose | Returns |
|----------|---------|---------|
| **subscribe** | Setup listener, return cleanup | Unsubscribe function |
| **getSnapshot** | Get current value | Current state |
| **getServerSnapshot** | SSR fallback value | Server-side state |

**Why This Hook Exists:**

**The Problem:**
- External stores (browser APIs, global state) update outside React
- React 18 concurrent rendering can cause tearing (inconsistent UI)
- Need safe way to subscribe to external data

**The Solution:**
- React manages subscriptions safely
- Prevents tearing in concurrent mode
- Consistent snapshots across component tree

**When to Use:**

| External Store | Use Case |
|----------------|----------|
| **Browser APIs** | navigator.onLine, window size, media queries |
| **Global stores** | Redux, MobX, Zustand (if not using React bindings) |
| **Event emitters** | WebSocket, EventEmitter |
| **Third-party state** | Non-React state management |

**Pattern:**

```jsx
function useExternalStore() {
  return useSyncExternalStore(
    subscribe,        // How to listen
    getSnapshot,      // Get current value
    getServerSnapshot // SSR fallback
  );
}
```

> **Key Insight:** Use this hook when integrating React with external state systems. Most apps don't need it directly - libraries like Redux provide React-specific hooks that use this internally.

```jsx
import { useSyncExternalStore } from 'react';

// Subscribe to external stores (e.g., browser APIs, global state)
function useOnlineStatus() {
    const isOnline = useSyncExternalStore(
        subscribe,   // Subscribe function
        getSnapshot, // Get current value
        getServerSnapshot // Server-side value (SSR)
    );

    return isOnline;
}

function subscribe(callback) {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);

    // Cleanup function
    return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
    };
}

function getSnapshot() {
    return navigator.onLine;
}

function getServerSnapshot() {
    return true; // Assume online during SSR
}

// Usage
function OnlineStatusIndicator() {
    const isOnline = useOnlineStatus();

    return (
        <div>
            {isOnline ? (
                <span style={{ color: 'green' }}>● Online</span>
            ) : (
                <span style={{ color: 'red' }}>● Offline</span>
            )}
        </div>
    );
}

// Custom store example: Window dimensions
**useSyncExternalStore for Window Events** - Subscribes to window resize events safely. Provides SSR fallback to avoid errors during server rendering.

function useWindowDimensions() {
    const dimensions = useSyncExternalStore(
        (callback) => {
            window.addEventListener('resize', callback);
            return () => window.removeEventListener('resize', callback);
        },
        () => ({
            width: window.innerWidth,
            height: window.innerHeight
        }),
        () => ({ width: 0, height: 0 }) // SSR fallback
    );

    return dimensions;
}

function WindowSize() {
    const { width, height } = useWindowDimensions();

    return (
        <div>
            Window: {width} x {height}
        </div>
    );
}

// External store with selector
**useSyncExternalStore with Selector** - Demonstrates custom store implementation with selector pattern for subscribing to specific parts of state, optimizing re-renders.

function useStore(selector) {
    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getServerState())
    );
}

const store = {
    state: { count: 0, user: null },
    listeners: new Set(),

    getState() {
        return this.state;
    },

    getServerState() {
        return { count: 0, user: null };
    },

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.listeners.forEach(listener => listener());
    },

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
};

// Usage with selector
function Counter() {
    const count = useStore(state => state.count);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => store.setState({ count: count + 1 })}>
                Increment
            </button>
        </div>
    );
}
```

### When to Use React 18 Hooks:

- **useId**: Form fields, accessibility, SSR-safe unique IDs
- **useTransition**: Tab switching, search filters, non-urgent updates
- **useDeferredValue**: Expensive lists, search results, derived values
- **useSyncExternalStore**: Browser APIs, external stores, global state

---

## Common Mistakes

### ❌ Mistake 1: Premature Optimization with useCallback/useMemo

**The Problem:**

Adding useCallback/useMemo everywhere creates overhead without performance benefits for simple operations.

**Why It's Wrong:**
- Memoization itself costs memory and CPU
- Simple operations are faster without memoization
- Makes code harder to read
- No actual performance gain

**The Overhead:**
```
useMemo overhead:
1. Store dependencies
2. Compare dependencies on each render
3. Store cached value
4. Sometimes slower than just recalculating!
```

| Scenario | Should Memoize? | Reason |
|----------|----------------|---------|
| Simple string concatenation | ❌ No | Faster than memoization overhead |
| Function passed to regular div | ❌ No | No child optimization to preserve |
| Function passed to memo'd child | ✅ Yes | Prevents child re-render |
| Filtering 10 items | ❌ No | Very fast operation |
| Filtering 10,000 items | ✅ Yes | Expensive operation |
| Simple arithmetic | ❌ No | Memoization costs more |

❌ **Wrong - Premature Optimization:**
```jsx
function SimpleComponent({ name }) {
    // Unnecessary - string concatenation is cheap
    const greeting = useMemo(() => `Hello, ${name}`, [name]);

    // Unnecessary - not passed to memoized child
    const handleClick = useCallback(() => {
        console.log('Clicked');
    }, []);

    return <button onClick={handleClick}>{greeting}</button>;
}
```

✅ **Correct - Optimize Only When Needed:**
```jsx
function SimpleComponent({ name }) {
    // Simple operations don't need memoization
    const greeting = `Hello, ${name}`;
    const handleClick = () => console.log('Clicked');

    return <button onClick={handleClick}>{greeting}</button>;
}

// ONLY memoize for expensive operations or memoized children
const ExpensiveList = memo(({ items, onItemClick }) => {
    // Child is memoized, so parent should use useCallback
    const handleClick = useCallback((id) => {
        onItemClick(id);
    }, [onItemClick]);

    // Expensive calculation, use useMemo
    const sortedItems = useMemo(() => {
        return items.sort((a, b) => a.value - b.value);
    }, [items]);

    return <div>{sortedItems.map(...)}</div>;
});
```

**Rule of Thumb:**
> Profile first, optimize second. Don't memoize until you've measured that it's actually a problem.

### ❌ Mistake 2: Missing Dependencies (Stale Closures)

**The Problem:** Incomplete dependency arrays cause functions to capture stale values.

**What Happens:**
1. useCallback/useMemo "closes over" variables from when it was created
2. If dependencies are incomplete, it keeps using old values
3. Results in bugs where UI doesn't update or shows wrong data

❌ **Wrong - Missing Dependencies:**
```jsx
function BadExample() {
    const [count, setCount] = useState(0);
    const [multiplier, setMultiplier] = useState(2);

    // BUG: Missing 'multiplier' in dependencies!
    const calculate = useCallback(() => {
        return count * multiplier; // Uses both values
    }, [count]); // Only includes count

    // If multiplier changes to 3, calculate still uses 2!
    return <div>{calculate()}</div>; // Shows wrong result
}
```

✅ **Correct - Complete Dependencies:**
```jsx
function GoodExample() {
    const [count, setCount] = useState(0);
    const [multiplier, setMultiplier] = useState(2);

    const calculate = useCallback(() => {
        return count * multiplier;
    }, [count, multiplier]); // ✅ All dependencies included

    return <div>{calculate()}</div>; // Always correct
}
```

**How to Avoid:**
- ✅ Use ESLint plugin: `eslint-plugin-react-hooks`
- ✅ Enable the exhaustive-deps rule (warns about missing dependencies)
- ✅ Include ALL variables used inside the callback
- ✅ Use `useRef` for values that shouldn't trigger updates

🔴 **Critical Rule:**
> Every variable used inside useCallback/useMemo/useEffect must be in the dependency array, or you'll get stale closures.

### ❌ Mistake 3: Mutating useRef During Render

**The Problem:** Mutating `ref.current` during render is a side effect that violates React's purity rules.

**Why It's Wrong:**
- Renders should be **pure** (no side effects)
- React may call your component multiple times during rendering
- Mutating during render makes behavior unpredictable
- Can cause bugs in Concurrent Mode (React 18+)

❌ **Wrong - Side Effect During Render:**
```jsx
function BadRef() {
    const renderCount = useRef(0);

    renderCount.current++; // 🔴 WRONG: Side effect in render!

    // In React 18 Concurrent Mode, this might run multiple times
    // giving incorrect counts

    return <div>Renders: {renderCount.current}</div>;
}
```

✅ **Correct - Mutate in useEffect:**
```jsx
function GoodRef() {
    const renderCount = useRef(0);

    useEffect(() => {
        renderCount.current++; // ✅ Safe: Side effect in effect
    });

    return <div>Renders: {renderCount.current}</div>;
}
```

✅ **Also Correct - Mutate in Event Handlers:**
```jsx
function VideoPlayer({ src }) {
    const videoRef = useRef(null);

    const handlePlay = () => {
        videoRef.current.play(); // ✅ Safe: Side effect in event handler
    };

    const handlePause = () => {
        videoRef.current.pause(); // ✅ Safe: Side effect in event handler
    };

    return (
        <>
            <video ref={videoRef} src={src} />
            <button onClick={handlePlay}>Play</button>
            <button onClick={handlePause}>Pause</button>
        </>
    );
}
```

**Safe Places to Mutate Refs:**
- ✅ Inside useEffect
- ✅ Inside event handlers (onClick, onChange, etc.)
- ✅ Inside async callbacks (setTimeout, fetch callbacks)
- ❌ NOT during render (function body)

---

## Best Practices

### 1. Combine useReducer with useContext

**useReducer, useContext** - Best practice for global state management. useReducer manages complex state, useContext shares it across components without prop drilling. Similar pattern to Redux.

```jsx
const TaskContext = createContext();

function taskReducer(state, action) {
    switch (action.type) {
        case 'ADD_TASK':
            return [...state, action.payload];
        case 'REMOVE_TASK':
            return state.filter(task => task.id !== action.payload);
        case 'TOGGLE_TASK':
            return state.map(task =>
                task.id === action.payload
                    ? { ...task, completed: !task.completed }
                    : task
            );
        default:
            return state;
    }
}

function TaskProvider({ children }) {
    const [tasks, dispatch] = useReducer(taskReducer, []);

    return (
        <TaskContext.Provider value={{ tasks, dispatch }}>
            {children}
        </TaskContext.Provider>
    );
}

function useTasks() {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTasks must be used within TaskProvider');
    }
    return context;
}

// Usage
function TaskList() {
    const { tasks, dispatch } = useTasks();

    return (
        <div>
            {tasks.map(task => (
                <div key={task.id}>
                    <span>{task.title}</span>
                    <button onClick={() => dispatch({ type: 'TOGGLE_TASK', payload: task.id })}>
                        Toggle
                    </button>
                </div>
            ))}
        </div>
    );
}
```

### 2. Custom Hooks with Advanced Hooks

**useState, useCallback** - Custom hook that combines multiple hooks to create reusable logic. useLocalStorage syncs state with localStorage, demonstrating composition of built-in hooks.

```jsx
// Custom hook combining multiple advanced hooks
function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
}

// Usage
function App() {
    const [name, setName] = useLocalStorage('name', 'John');

    return (
        <input
            value={name}
            onChange={(e) => setName(e.target.value)}
        />
    );
}
```

---

## Interview Questions

### Q1: When should you use useReducer instead of useState?

**Answer:**

Use useReducer when state management becomes complex:

| Scenario | useState | useReducer |
|----------|----------|------------|
| **Single value** | ✅ Better | ❌ Overkill |
| **Multiple related values** | ⚠️ Possible | ✅ Better |
| **Complex update logic** | ❌ Scattered | ✅ Centralized |
| **State depends on previous** | ⚠️ Functional updates | ✅ Natural pattern |

**Use useReducer when:**
- State has multiple sub-values
- Complex update logic
- Need to track state changes (action log)
- Want to separate state logic from component
- Building something Redux-like

### Q2: What's the difference between useCallback and useMemo?

**Answer:**

| Hook | Memoizes | Returns | Syntax |
|------|----------|---------|--------|
| **useCallback** | Function itself | Function reference | `useCallback(fn, deps)` |
| **useMemo** | Function result | Computed value | `useMemo(() => value, deps)` |

**Examples:**
```jsx
// useCallback - returns the function
const handleClick = useCallback(() => {
  doSomething();
}, []);

// useMemo - calls function, returns result
const value = useMemo(() => {
  return expensiveCalculation();
}, []);
```

**Rule of Thumb:**
- useCallback = Save the function
- useMemo = Save the result

### Q3: Why use useRef instead of useState for some values?

**Answer:**

| Feature | useRef | useState |
|---------|--------|----------|
| **Re-renders** | ❌ No | ✅ Yes |
| **Updates** | Immediate | Async/batched |
| **Use for** | Side effects | UI state |

**Use useRef for:**
- DOM references
- Timer/interval IDs
- Previous values
- Mutable values that don't affect UI
- Avoiding stale closures

**Use useState for:**
- Anything that affects the rendered output

### Q4: Can you update useRef in render?

**Answer:** No, it's a side effect that violates React's purity rules.

**❌ Wrong:**
```jsx
function Bad() {
  const ref = useRef(0);
  ref.current++; // Side effect during render!
  return <div>{ref.current}</div>;
}
```

**✅ Correct:**
```jsx
function Good() {
  const ref = useRef(0);

  useEffect(() => {
    ref.current++; // Side effect in effect
  });

  return <div>{ref.current}</div>;
}
```

**Safe places to mutate refs:**
- useEffect
- Event handlers
- Async callbacks

### Q5: How does useContext prevent prop drilling?

**Answer:**

**Prop Drilling (Problem):**
```jsx
<App data={data}>
  <Page data={data}>      // Just passing through
    <Section data={data}> // Just passing through
      <Component data={data} /> // Finally uses it!
    </Section>
  </Page>
</App>
```

**Context (Solution):**
```jsx
<DataContext.Provider value={data}>
  <App>
    <Page>
      <Section>
        <Component /> // Accesses data via useContext!
      </Section>
    </Page>
  </App>
</DataContext.Provider>
```

**Benefits:**
- No props through intermediate components
- Cleaner component APIs
- Easier refactoring
- Central data source

---

## External Resources

- [React Docs: Hooks API Reference](https://react.dev/reference/react)
- [useHooks - Collection of Hooks](https://usehooks.com/)
- [React Hooks Cheat Sheet](https://react-hooks-cheatsheet.com/)

---

[← Previous: Hooks Basics](./03-hooks-basics.md) | [Next: Performance Hooks →](./05-performance-hooks.md)
