# State and Effects (React 18 Functional Components)

## Concept

**State** is a built-in React object used to store component data that can change over time. In modern React, we use the **useState** hook in functional components. **Effects** (side effects) are operations like data fetching, subscriptions, or DOM manipulation, managed with **useEffect** hook, which replaces lifecycle methods from class components.

### Key Points
- Use useState for component state in functional components
- State updates are asynchronous and batched (automatic in React 18)
- useEffect replaces componentDidMount, componentDidUpdate, and componentWillUnmount
- State updates trigger re-renders
- Never mutate state directly - always use setter functions
- **React 18** automatically batches all state updates for better performance

---

## Example 1: State with useState

**useState** - A hook that declares a state variable. Returns an array with the current state value and a setter function. The initial state is passed as an argument and can be a value or a function (lazy initialization).

```jsx
import { useState } from 'react';

function Counter() {
    // Declare state variable
    // useState returns [currentValue, setterFunction]
    const [count, setCount] = useState(0); // 0 is initial value
    const [message, setMessage] = useState('Hello');

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
            <p>{message}</p>
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
        console.log('Computing initial value...');
        return computeExpensiveValue();
    });

    return <div>{data.length} items</div>;
}

function computeExpensiveValue() {
    return Array.from({ length: 1000 }, (_, i) => i);
}
```

---

## Example 2: setState Patterns (React 18)

**useState with Batching** - Demonstrates different patterns for updating state. React 18 automatically batches all state updates (including in async functions) to optimize re-renders.

```jsx
import { useState } from 'react';

function StatePatterns() {
    const [count, setCount] = useState(0);
    const [user, setUser] = useState({ name: 'John', age: 30 });
    const [items, setItems] = useState(['apple', 'banana']);

    // Pattern 1: Simple update
    const updateSimple = () => {
        setCount(5);
    };

    // Pattern 2: Functional update (when using previous state)
    const incrementCount = () => {
        setCount(prevCount => prevCount + 1);
    };

    // Pattern 3: Multiple updates (automatically batched in React 18)
    const batchedUpdates = () => {
        setCount(count + 1); // Old value
        setCount(count + 1); // Same old value - won't work as expected

        // Use function form for correct batching
        setCount(prev => prev + 1); // Correctly uses latest
        setCount(prev => prev + 1); // Correctly increments twice
    };

    // Pattern 4: React 18 - Automatic batching in async
    const asyncBatchedUpdates = async () => {
        const data = await fetch('/api/data');

        // In React 18, these are batched automatically!
        setCount(c => c + 1);
        setUser({ name: 'Jane', age: 25 });
        setItems(['orange']);
        // Only 1 re-render in React 18 (would be 3 in React 17)
    };

    // Pattern 5: Updating nested state
    const updateUser = () => {
        setUser(prevUser => ({
            ...prevUser,
            age: 31
        }));
    };

    // Pattern 6: Updating arrays
    const addItem = () => {
        setItems(prevItems => [...prevItems, 'orange']);
    };

    const removeItem = (index) => {
        setItems(prevItems => prevItems.filter((_, i) => i !== index));
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

---

## Example 3: Effects with useEffect (Lifecycle Replacement)

**useEffect** - A hook for side effects in functional components. Accepts a function and an optional dependency array. Replaces componentDidMount, componentDidUpdate, and componentWillUnmount lifecycle methods.

```jsx
import { useState, useEffect } from 'react';

function LifecycleWithHooks() {
    const [count, setCount] = useState(0);
    const [data, setData] = useState(null);

    // Equivalent to componentDidMount + componentDidUpdate
    useEffect(() => {
        console.log('Component rendered or count changed');
        document.title = `Count: ${count}`;
        // Runs after every render (no dependency array)
    });

    // Equivalent to componentDidMount (runs once)
    useEffect(() => {
        console.log('Component mounted - runs once');

        // Setup subscriptions, fetch data, etc.
        fetchData();
        const timer = setInterval(() => {
            console.log('Timer tick');
        }, 1000);

        // Equivalent to componentWillUnmount (cleanup)
        return () => {
            console.log('Component will unmount or effect re-runs');
            clearInterval(timer);
        };
    }, []); // Empty dependency array = run once

    // Equivalent to componentDidUpdate (with condition)
    useEffect(() => {
        console.log('Count changed:', count);

        // Only runs when count changes
        if (count > 10) {
            console.log('Count exceeded 10!');
        }
    }, [count]); // Runs when count changes

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

### Lifecycle Mapping (Class → Hooks):

| Class Component | Functional Component (Hooks) |
|----------------|------------------------------|
| `constructor()` | `useState()` for initial state |
| `componentDidMount()` | `useEffect(() => {}, [])` |
| `componentDidUpdate()` | `useEffect(() => {}, [deps])` |
| `componentWillUnmount()` | `useEffect(() => { return cleanup }, [])` |
| `shouldComponentUpdate()` | `React.memo()` / `useMemo()` |
| `getDerivedStateFromProps()` | Update state directly in render |

---

## Example 4: Data Fetching (Modern Pattern)

**useState, useEffect, AbortController** - Combines useState for managing loading/error states and useEffect for fetching data. Uses AbortController to cancel requests when the component unmounts or URL changes.

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
                setError(null);

                const response = await fetch(url, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }

                const result = await response.json();

                // Only update if not cancelled
                if (!cancelled) {
                    setData(result);
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled && err.name !== 'AbortError') {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        fetchData();

        // Cleanup function
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [url]); // Re-fetch when URL changes

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}
```

---

## Example 5: Timer Component (Hooks)

**useState, useEffect with Cleanup** - Uses useState for timer state and useEffect to start/stop intervals. Demonstrates proper cleanup of timers to prevent memory leaks.

```jsx
import { useState, useEffect } from 'react';

function Timer() {
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let interval = null;

        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }

        // Cleanup on unmount or when isRunning changes
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isRunning]);

    // Log every 10 seconds
    useEffect(() => {
        if (seconds > 0 && seconds % 10 === 0) {
            console.log(`${seconds} seconds elapsed`);
        }
    }, [seconds]);

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

---

## Common Pitfalls

### Pitfall 1: Directly Mutating State

**useState** - Shows common mistake of mutating state directly. React uses shallow comparison for reference types, so mutations don't trigger re-renders. Always create new objects/arrays.

```jsx
import { useState } from 'react';

// WRONG - Direct mutation doesn't trigger re-render
function BadComponent() {
    const [items, setItems] = useState([1, 2, 3]);
    const [user, setUser] = useState({ name: 'John' });

    const addItem = () => {
        items.push(4); // WRONG! Direct mutation
        setItems(items); // Won't trigger re-render
    };

    const updateUser = () => {
        user.name = 'Jane'; // WRONG! Direct mutation
        setUser(user); // Won't work
    };

    return <div>{items.length}</div>;
}

// CORRECT - Create new references
function GoodComponent() {
    const [items, setItems] = useState([1, 2, 3]);
    const [user, setUser] = useState({ name: 'John' });

    const addItem = () => {
        setItems([...items, 4]); // New array
    };

    const updateUser = () => {
        setUser({ ...user, name: 'Jane' }); // New object
    };

    return <div>{items.length}</div>;
}
```

### Pitfall 2: Stale Closures in Effects

**useState, useEffect** - Demonstrates stale closure problem where the effect captures old state values. Solution is to use functional updates `setState(prev => prev + 1)` or include dependencies.

```jsx
import { useState, useEffect } from 'react';

// PROBLEM - Stale closure
function StaleClosureExample() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(count + 1); // Always uses initial count (0)!
        }, 1000);

        return () => clearInterval(interval);
    }, []); // Empty deps - count is stale

    return <div>{count}</div>;
}

// SOLUTION - Use functional update
function FixedExample() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCount(c => c + 1); // Uses current value
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return <div>{count}</div>;
}
```

### Pitfall 3: Infinite Loop in useEffect

**useState, useEffect** - Shows how incorrect dependencies cause infinite loops. When state in dependency array is updated inside the effect, it triggers another effect run.

```jsx
import { useState, useEffect } from 'react';

// WRONG - Infinite loop
function InfiniteLoop() {
    const [data, setData] = useState([]);

    useEffect(() => {
        setData([...data, 'new']); // Causes re-render
    }, [data]); // data changes → effect runs → data changes...

    return <div>{data.length}</div>;
}

// CORRECT - Fix dependencies or logic
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

### Pitfall 4: Missing Dependencies

**useState, useEffect** - Common mistake of not including all dependencies in the dependency array. Can lead to stale data and bugs. Use ESLint plugin to catch these issues.

```jsx
import { useState, useEffect } from 'react';

// WRONG - Missing dependencies
function MissingDeps({ userId }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchUser(userId); // Uses userId but not in deps
    }, []); // Missing userId!

    return <div>{user?.name}</div>;
}

// CORRECT - Include all dependencies
function CorrectDeps({ userId }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchUser(userId);
    }, [userId]); // userId included

    return <div>{user?.name}</div>;
}

function fetchUser(id) {
    // fetch implementation
}
```

---

## Best Practices

### 1. Use Functional Updates for State

**useState with Functional Updates** - Best practice for updating state based on previous state. Ensures you're always working with the latest state value, especially important with batching.

```jsx
import { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);

    // Good - Using function form
    const increment = () => {
        setCount(prevCount => prevCount + 1);
    };

    // Multiple updates work correctly
    const incrementMultiple = () => {
        setCount(c => c + 1);
        setCount(c => c + 1);
        setCount(c => c + 1);
        // Correctly increments by 3
    };

    return (
        <div>
            <p>{count}</p>
            <button onClick={increment}>+1</button>
            <button onClick={incrementMultiple}>+3</button>
        </div>
    );
}
```

### 2. Separate Effects by Concern

**useState, useEffect** - Best practice to split related logic into separate useEffect calls. Makes code more maintainable and easier to understand. Each effect handles one concern.

```jsx
import { useState, useEffect } from 'react';

function UserDashboard({ userId }) {
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

    // Effect 3: Page title (another separate concern)
    useEffect(() => {
        if (user) {
            document.title = `${user.name}'s Dashboard`;
        }
    }, [user]);

    return <div>{/* ... */}</div>;
}

function fetchUser(id) { /* implementation */ }
function fetchAnalytics(id) { /* implementation */ }
```

### 3. Cleanup Subscriptions and Timers

**useState, useEffect** - Best practice to always return a cleanup function from useEffect to prevent memory leaks. Cleanup runs before re-running the effect or when the component unmounts.

```jsx
import { useState, useEffect } from 'react';

function ProperCleanup() {
    const [data, setData] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => {
            console.log('Tick');
        }, 1000);

        const handleResize = () => {
            console.log('Resized');
        };

        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
            clearInterval(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <div>Component content</div>;
}
```

---

## Real-world Scenarios

### Scenario 1: Form with Validation

**useState, useEffect** - Real-world form handling with validation. useEffect validates form data whenever it changes, while useState manages form state, errors, and submission status.

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

### Scenario 2: Infinite Scroll

**useState, useEffect** - Real-world infinite scroll implementation. One useEffect handles scroll events and updates page number, another effect loads data when page changes.

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
**Answer:** State is internal, mutable data owned by a component, managed with useState. Props are external, immutable data passed from parent. State can change via setter functions, props cannot be modified by the component.

### Q2: Why are state updates asynchronous?
**Answer:** For performance optimization. React batches multiple state updates into a single re-render. React 18 automatically batches all updates, including those in async functions, timeouts, and promises.

### Q3: When does useEffect run?
**Answer:**
- No deps: After every render
- Empty array []: Once after mount
- With deps [a, b]: After mount and when a or b changes

### Q4: How do you update state based on previous state?
**Answer:** Use the functional update form: `setState(prevState => prevState + 1)` to ensure you're working with the latest state value.

### Q5: What's the cleanup function in useEffect?
**Answer:** The function returned from useEffect runs before the effect re-runs or when the component unmounts. Use it for cleanup like clearing timers, canceling requests, or removing event listeners.

---

## External Resources

- [React Docs: useState](https://react.dev/reference/react/useState)
- [React Docs: useEffect](https://react.dev/reference/react/useEffect)
- [React 18: Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching)
- [useEffect Complete Guide](https://overreacted.io/a-complete-guide-to-useeffect/)

---

[← Previous: Components and Props](./01-components-props.md) | [Next: Hooks Basics →](./03-hooks-basics.md)
