# Advanced Hooks (React 18)

## Concept

Advanced hooks like **useContext**, **useReducer**, **useCallback**, **useMemo**, and **useRef** provide powerful ways to manage complex state, optimize performance, share data, and interact with DOM elements. **React 18** introduces new concurrent hooks like **useId**, **useTransition**, **useDeferredValue**, and **useSyncExternalStore** for better performance and user experience.

### Key Points
- useContext: Access context values without prop drilling
- useReducer: Manage complex state logic with actions
- useCallback: Memoize functions to prevent recreations
- useMemo: Memoize expensive calculations
- useRef: Store mutable values and access DOM elements
- **useId (React 18)**: Generate unique IDs for accessibility
- **useTransition (React 18)**: Mark updates as non-urgent
- **useDeferredValue (React 18)**: Defer re-rendering of non-urgent parts
- **useSyncExternalStore (React 18)**: Subscribe to external stores safely

---

## Example 1: useContext

**useContext** - Provides access to context values without prop drilling. Accepts a context object (created by createContext) and returns the current context value from the nearest Provider.

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

**useReducer** - Manages complex state logic using a reducer function. Takes a reducer and initial state, returns current state and dispatch function. Ideal for state with multiple sub-values or complex update logic.

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

**useCallback, memo** - `useCallback` memoizes function references to prevent unnecessary re-renders. Works with `memo()` to optimize child components by keeping function identity stable across renders.

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

**useMemo** - Memoizes expensive computed values, only recalculating when dependencies change. Prevents unnecessary recalculations on every render, improving performance for heavy operations.

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

**useRef** - Creates a mutable reference object that persists across renders without triggering re-renders. Used for DOM access, storing mutable values, and avoiding stale closures.

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

**useTransition** - Marks state updates as non-urgent transitions. Returns isPending flag and startTransition function. Keeps UI responsive by allowing urgent updates to interrupt non-urgent ones.

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

**useDeferredValue** - Creates a deferred version of a value that lags behind the actual value. Keeps urgent UI updates responsive while deferring expensive updates.

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

**useSyncExternalStore** - Safely subscribes to external stores (browser APIs, global state) with concurrent rendering support. Takes subscribe, getSnapshot, and optional getServerSnapshot functions.

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

## Common Pitfalls

### Pitfall 1: useCallback/useMemo Overuse

**Premature Optimization** - Shows common mistake of over-using useCallback/useMemo for simple operations. Memoization has overhead; only use for expensive computations or preventing child re-renders.

```jsx
// BAD - Unnecessary memoization
function SimpleComponent({ name }) {
    // Overkill for simple operations
    const greeting = useMemo(() => `Hello, ${name}`, [name]);

    const handleClick = useCallback(() => {
        console.log('Clicked');
    }, []);

    return <button onClick={handleClick}>{greeting}</button>;
}

// GOOD - Only memoize when needed
function SimpleComponent({ name }) {
    // Simple string concatenation doesn't need memoization
    const greeting = `Hello, ${name}`;

    // If not passing to memoized child, no need for useCallback
    const handleClick = () => console.log('Clicked');

    return <button onClick={handleClick}>{greeting}</button>;
}
```

### Pitfall 2: Missing Dependencies

**Stale Closures from Missing Dependencies** - Common bug where useCallback/useMemo dependencies are incomplete, causing stale values. Always include all variables used inside the callback.

```jsx
// BAD - Missing dependencies
function BadExample() {
    const [count, setCount] = useState(0);
    const [multiplier, setMultiplier] = useState(2);

    const calculate = useCallback(() => {
        return count * multiplier; // Uses both count and multiplier
    }, [count]); // Missing multiplier in dependencies!

    return <div>{calculate()}</div>;
}

// GOOD - All dependencies included
function GoodExample() {
    const [count, setCount] = useState(0);
    const [multiplier, setMultiplier] = useState(2);

    const calculate = useCallback(() => {
        return count * multiplier;
    }, [count, multiplier]); // All dependencies included

    return <div>{calculate()}</div>;
}
```

### Pitfall 3: Mutating useRef in Render

**useRef, useEffect** - Mutating ref.current during render is a side effect and violates React's rules. Always update refs in useEffect or event handlers, not during render.

```jsx
// BAD - Mutating ref during render
function BadRef() {
    const renderCount = useRef(0);
    renderCount.current++; // Side effect in render!

    return <div>Renders: {renderCount.current}</div>;
}

// GOOD - Mutate in useEffect
function GoodRef() {
    const renderCount = useRef(0);

    useEffect(() => {
        renderCount.current++;
    });

    return <div>Renders: {renderCount.current}</div>;
}
```

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
**Answer:** Use useReducer when state logic is complex, involves multiple sub-values, or next state depends on previous state. Also when you want to centralize state update logic.

### Q2: What's the difference between useCallback and useMemo?
**Answer:** useCallback memoizes functions, useMemo memoizes values. useCallback returns the function itself, useMemo calls the function and returns its result.

### Q3: Why use useRef instead of useState for some values?
**Answer:** useRef doesn't trigger re-renders when updated. Use it for values that need to persist across renders but don't affect the UI.

### Q4: Can you update useRef in render?
**Answer:** No, it's a side effect. Refs should be updated in useEffect or event handlers, not during render.

### Q5: How does useContext prevent prop drilling?
**Answer:** It allows deeply nested components to access shared data directly without passing props through every intermediate component.

---

## External Resources

- [React Docs: Hooks API Reference](https://react.dev/reference/react)
- [useHooks - Collection of Hooks](https://usehooks.com/)
- [React Hooks Cheat Sheet](https://react-hooks-cheatsheet.com/)

---

[← Previous: Hooks Basics](./03-hooks-basics.md) | [Next: Performance Hooks →](./05-performance-hooks.md)
