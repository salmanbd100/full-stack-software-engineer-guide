# React Hooks - Basics (React 18)

## Concept

**Hooks** are functions that let you "hook into" React state and lifecycle features from function components. They were introduced in React 16.8 to enable state and other React features without writing class components. **React 18** enhances hooks with concurrent features and automatic batching.

### Key Points
- Hooks only work in function components
- Must be called at the top level (not in loops, conditions, or nested functions)
- Names must start with "use"
- useState and useEffect are the most commonly used hooks
- Hooks enable cleaner, more reusable code
- **React 18** introduces automatic batching for all updates (including async)
- New hooks in React 18: useId, useTransition, useDeferredValue, useSyncExternalStore

---

## Example 1: useState Hook

**useState** - The primary hook for adding state to functional components. Returns a pair: current state value and a function to update it. Supports lazy initialization for expensive computations.

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

**useEffect** - Hook for performing side effects in functional components. Runs after render and can optionally clean up. Dependency array controls when it re-runs.

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

**Hooks Rules** - Hooks must be called at the top level (not in loops, conditions, or nested functions) and only from React functions. This ensures hooks are called in the same order each render.

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

### Pitfall 1: Stale Closure in useEffect

**useState, useEffect** - Common issue where closures capture stale state values. Use functional updates or add dependencies to avoid this problem.

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

### Pitfall 2: Infinite Loop

**useState, useEffect** - Occurs when state updates inside useEffect trigger the effect again. Fix by adjusting dependencies or effect logic.

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

### Pitfall 3: Missing Cleanup

**useEffect** - Forgetting to return a cleanup function causes memory leaks with subscriptions, timers, or event listeners. Always clean up side effects.

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

React 18 automatically batches all state updates, including those in async functions, timeouts, and native event handlers. This improves performance by reducing re-renders.

**Automatic Batching** - All state updates are automatically batched together, even in async code, promises, and timeouts. Reduces re-renders without code changes. Use `flushSync` to opt-out if needed.

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

**useState** - Real-world form with multiple state variables for form data, errors, and submission status. Demonstrates controlled inputs and form validation.

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

**useState, useEffect** - Complete data fetching pattern with loading, error, and success states. Includes cleanup to prevent state updates on unmounted components.

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
