# Custom Hooks (React 18)

Custom hooks allow you to extract and reuse stateful logic across multiple components. **React 18** enhances custom hooks with better performance through automatic batching and concurrent features.

## 📚 Core Concepts

### 1. Creating Custom Hooks

**useState** - Basic custom hook example that encapsulates counter logic. Custom hooks must start with "use" and can call other hooks to extract reusable stateful logic.

```jsx
import { useState } from 'react';

// Custom hook must start with "use"
function useCounter(initialValue = 0) {
    const [count, setCount] = useState(initialValue);

    const increment = () => setCount(c => c + 1);
    const decrement = () => setCount(c => c - 1);
    const reset = () => setCount(initialValue);

    return { count, increment, decrement, reset };
}

// Usage
function Counter() {
    const { count, increment, decrement, reset } = useCounter(0);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={increment}>+</button>
            <button onClick={decrement}>-</button>
            <button onClick={reset}>Reset</button>
        </div>
    );
}
```

### 2. useLocalStorage Hook

**useState, useCallback** - Custom hook that syncs state with localStorage. Uses lazy initialization to read from storage on mount, and useCallback to memoize the setter function.

```jsx
import { useState, useCallback } from 'react';

function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function
                ? value(storedValue)
                : value;

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
    const [name, setName] = useLocalStorage('name', 'Guest');

    return (
        <input
            value={name}
            onChange={(e) => setName(e.target.value)}
        />
    );
}
```

### 3. useFetch Hook

**useState, useEffect, AbortController** - Custom hook for data fetching with loading, error, and data states. Includes cleanup with AbortController to prevent memory leaks and race conditions.

```jsx
import { useState, useEffect } from 'react';

function useFetch(url) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(url, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const json = await response.json();

                if (!cancelled) {
                    setData(json);
                    setError(null);
                }
            } catch (e) {
                if (!cancelled && e.name !== 'AbortError') {
                    setError(e.message);
                    setData(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [url]);

    return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
    const { data, loading, error } = useFetch(`/api/users/${userId}`);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return <div>{data.name}</div>;
}
```

### 4. useToggle Hook

**useState, useCallback** - Simple custom hook for boolean toggle state. Returns a stable toggle function using useCallback, useful for modals, dropdowns, and visibility toggles.

```jsx
import { useState, useCallback } from 'react';

function useToggle(initialValue = false) {
    const [value, setValue] = useState(initialValue);

    const toggle = useCallback(() => {
        setValue(v => !v);
    }, []);

    return [value, toggle];
}

// Usage
function Modal() {
    const [isOpen, toggleOpen] = useToggle(false);

    return (
        <>
            <button onClick={toggleOpen}>Open Modal</button>
            {isOpen && <div className="modal">...</div>}
        </>
    );
}
```

### 5. useDebounce Hook

**useState, useEffect** - Custom hook that delays updating a value until after a specified delay. Essential for optimizing search inputs and API calls by reducing unnecessary requests.

```jsx
import { useState, useEffect } from 'react';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Usage
function SearchInput() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (debouncedSearchTerm) {
            // API call here
            console.log('Searching for:', debouncedSearchTerm);
        }
    }, [debouncedSearchTerm]);

    return (
        <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
        />
    );
}
```

## 💡 Practical Examples

### Example 1: useForm Hook

**useState** - Custom hook for form state management. Handles form values, errors, changes, submission, and reset logic in a reusable way across different forms.

```jsx
import { useState } from 'react';

function useForm(initialValues) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (callback) => (e) => {
        e.preventDefault();
        callback(values);
    };

    const reset = () => {
        setValues(initialValues);
        setErrors({});
    };

    return {
        values,
        errors,
        handleChange,
        handleSubmit,
        reset,
        setErrors
    };
}

// Usage
function LoginForm() {
    const { values, handleChange, handleSubmit } = useForm({
        email: '',
        password: ''
    });

    const onSubmit = (formData) => {
        console.log('Submitting:', formData);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <input
                name="email"
                value={values.email}
                onChange={handleChange}
            />
            <input
                name="password"
                type="password"
                value={values.password}
                onChange={handleChange}
            />
            <button type="submit">Login</button>
        </form>
    );
}
```

### Example 2: useMediaQuery Hook

**useState, useEffect** - Custom hook for responsive design. Subscribes to CSS media query changes and updates state when screen size changes, enabling responsive React components.

```jsx
import { useState, useEffect } from 'react';

function useMediaQuery(query) {
    const [matches, setMatches] = useState(
        () => window.matchMedia(query).matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

// Usage
function ResponsiveComponent() {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
    const isDesktop = useMediaQuery('(min-width: 1025px)');

    if (isMobile) return <MobileView />;
    if (isTablet) return <TabletView />;
    return <DesktopView />;
}

function MobileView() {
    return <div>Mobile View</div>;
}

function TabletView() {
    return <div>Tablet View</div>;
}

function DesktopView() {
    return <div>Desktop View</div>;
}
```

## ⚡ React 18: Advanced Custom Hooks

### Example 3: useTransitionState (React 18)

**useState, useTransition** - Custom hook combining state with React 18 transitions. Wraps setState in startTransition to mark updates as non-urgent, keeping UI responsive during heavy operations.

```jsx
import { useState, useTransition } from 'react';

// Custom hook combining useState with useTransition
function useTransitionState(initialValue) {
    const [state, setState] = useState(initialValue);
    const [isPending, startTransition] = useTransition();

    const setTransitionState = (newValue) => {
        startTransition(() => {
            setState(newValue);
        });
    };

    return [state, setTransitionState, isPending];
}

// Usage
function SearchResults() {
    const [query, setQuery, isPending] = useTransitionState('');
    const [results, setResults] = useState([]);

    const handleSearch = (e) => {
        setQuery(e.target.value);
        // Filter large dataset without blocking UI
        const filtered = largeDataset.filter(item =>
            item.name.toLowerCase().includes(e.target.value.toLowerCase())
        );
        setResults(filtered);
    };

    return (
        <div>
            <input onChange={handleSearch} placeholder="Search..." />
            {isPending && <span>Updating...</span>}
            <div style={{ opacity: isPending ? 0.5 : 1 }}>
                {results.map(item => <div key={item.id}>{item.name}</div>)}
            </div>
        </div>
    );
}

const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
}));
```

### Example 4: useDeferredSearch (React 18)

**useDeferredValue, useMemo** - Custom hook for search with deferred updates. Combines useDeferredValue to delay filtering and useMemo to optimize computation, detecting stale state for loading indicators.

```jsx
import { useState, useDeferredValue, useMemo } from 'react';

// Custom hook for deferred search
function useDeferredSearch(items, searchTerm) {
    const deferredSearchTerm = useDeferredValue(searchTerm);

    const filteredItems = useMemo(() => {
        if (!deferredSearchTerm) return items;

        return items.filter(item =>
            item.name.toLowerCase().includes(deferredSearchTerm.toLowerCase())
        );
    }, [items, deferredSearchTerm]);

    const isStale = searchTerm !== deferredSearchTerm;

    return { filteredItems, isStale };
}

// Usage
function ProductList() {
    const [products] = useState(largeDataset);
    const [searchTerm, setSearchTerm] = useState('');
    const { filteredItems, isStale } = useDeferredSearch(products, searchTerm);

    return (
        <div>
            <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
            />
            {isStale && <span>Updating...</span>}
            <div style={{ opacity: isStale ? 0.6 : 1 }}>
                {filteredItems.map(item => (
                    <div key={item.id}>{item.name}</div>
                ))}
            </div>
        </div>
    );
}

const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
}));
```

### Example 5: useId Hook (React 18)

**useId** - Custom hook for accessible form fields. Uses React 18's useId to generate unique, SSR-safe IDs for labels, inputs, and hint text with proper ARIA attributes.

```jsx
import { useId } from 'react';

// Custom hook for form field with accessibility
function useFormField(label) {
    const id = useId();

    const getInputProps = () => ({
        id,
        'aria-describedby': `${id}-hint`
    });

    const getLabelProps = () => ({
        htmlFor: id
    });

    const getHintProps = () => ({
        id: `${id}-hint`
    });

    return {
        id,
        label,
        getInputProps,
        getLabelProps,
        getHintProps
    };
}

// Usage
function AccessibleForm() {
    const emailField = useFormField('Email Address');
    const passwordField = useFormField('Password');

    return (
        <form>
            <div>
                <label {...emailField.getLabelProps()}>
                    {emailField.label}
                </label>
                <input {...emailField.getInputProps()} type="email" />
                <span {...emailField.getHintProps()}>
                    We'll never share your email
                </span>
            </div>

            <div>
                <label {...passwordField.getLabelProps()}>
                    {passwordField.label}
                </label>
                <input {...passwordField.getInputProps()} type="password" />
                <span {...passwordField.getHintProps()}>
                    Must be at least 8 characters
                </span>
            </div>
        </form>
    );
}
```

## 🎯 Common Interview Questions

### Q1: What are custom hooks and why use them?

**Answer:** Custom hooks extract reusable stateful logic. They let you share logic between components without changing component hierarchy.

### Q2: Rules of custom hooks?

**Answer:**
1. Must start with "use"
2. Can call other hooks
3. Only call at top level
4. Only call from React functions

## 🎓 Best Practices

1. **Name with "use" prefix**
2. **Extract reusable logic**
3. **Return arrays or objects**
4. **Keep hooks focused** (single responsibility)
5. **Document dependencies** clearly

---

[← Back to React](./README.md)
