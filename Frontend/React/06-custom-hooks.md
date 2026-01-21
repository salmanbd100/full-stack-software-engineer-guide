# Custom Hooks (React 18)

## Understanding Custom Hooks

### 💡 **Custom Hooks - Reusable Stateful Logic**

Extract and share component logic without duplicating code.

**The Power of Custom Hooks:**

**Without Custom Hooks:**
```
Component A: useState + useEffect + logic
Component B: useState + useEffect + same logic (duplicated!)
Component C: useState + useEffect + same logic (duplicated!)
```

**With Custom Hooks:**
```
useCustomHook: useState + useEffect + logic (one place)
Component A: useCustomHook()
Component B: useCustomHook()
Component C: useCustomHook()
```

**Key Benefits:**

| Benefit | Impact |
|---------|--------|
| **Reusability** | Write once, use everywhere |
| **Maintainability** | Fix bugs in one place |
| **Testability** | Test logic independently |
| **Separation of Concerns** | Components focus on UI |
| **Team Sharing** | Common patterns across team |

> **Key Insight:** Custom hooks share logic, not state. Each component that uses a custom hook gets its own independent state instance.

## Why Custom Hooks Matter

**Interview Perspective:**
- Asked in 70%+ of mid to senior React interviews
- Demonstrates understanding of code reusability and abstraction
- Tests ability to identify common patterns and extract logic
- Shows knowledge of hook rules and composition
- Critical for senior roles where architectural decisions matter

**Real-World Importance:**
- **Code Reusability**: Write logic once, use everywhere
- **Maintainability**: Fix bugs in one place
- **Testability**: Test logic independently from UI
- **Separation of Concerns**: Keep components focused on rendering
- **Team Productivity**: Share patterns across team members

## Core Concepts Overview

### Custom Hook Characteristics

| Aspect | Description | Example |
|--------|-------------|---------|
| **Naming** | Must start with "use" | `useCounter`, `useFetch` |
| **Composition** | Can call other hooks | `useState`, `useEffect` inside |
| **Return Value** | Can return anything | Array, object, primitive, function |
| **Independence** | Each call is independent | Separate state instances |
| **Reusability** | Share logic, not state | Different components, different state |

### Common Custom Hook Patterns

| Pattern | Purpose | Returns |
|---------|---------|---------|
| **State Encapsulation** | Manage complex state logic | `[state, actions]` |
| **Side Effect** | Encapsulate subscriptions/effects | Cleanup function |
| **Data Fetching** | Standardize API calls | `{ data, loading, error }` |
| **Form Handling** | Simplify form state | `{ values, errors, handlers }` |
| **Browser API** | Wrap browser features | Responsive value |

## Key Principles

### ✅ Do:
- Start names with "use" prefix
- Follow all hook rules (top level, React functions only)
- Return values that make sense for consumers
- Keep hooks focused (single responsibility)
- Document what the hook does and its parameters
- Handle edge cases (cleanup, error states)

### ❌ Don't:
- Call hooks conditionally or in loops
- Use hooks outside React functions
- Share state between hook calls
- Make hooks do too many things
- Forget to include all dependencies
- Return inconsistent value types

---

## Example 1: useCounter Hook

### 💡 **useCounter - State Encapsulation Pattern**

A simple but illustrative example of extracting stateful logic into a reusable hook.

**What It Demonstrates:**
- State management encapsulation
- Exposing controlled actions (increment, decrement, reset)
- Customizable initial value
- Clean, predictable API

**Benefits:**
1. **Reusability**: Same counter logic across multiple components
2. **Testability**: Test counter logic without rendering components
3. **Simplicity**: Components don't need to know implementation details
4. **Maintainability**: Change counter behavior in one place

```jsx
import { useState } from 'react';

// Custom hook for counter logic
function useCounter(initialValue = 0, { min, max, step = 1 } = {}) {
    const [count, setCount] = useState(initialValue);

    const increment = () => {
        setCount(prevCount => {
            const newValue = prevCount + step;
            return max !== undefined ? Math.min(newValue, max) : newValue;
        });
    };

    const decrement = () => {
        setCount(prevCount => {
            const newValue = prevCount - step;
            return min !== undefined ? Math.max(newValue, min) : newValue;
        });
    };

    const reset = () => setCount(initialValue);

    const set = (value) => {
        let newValue = value;
        if (min !== undefined) newValue = Math.max(newValue, min);
        if (max !== undefined) newValue = Math.min(newValue, max);
        setCount(newValue);
    };

    return {
        count,
        increment,
        decrement,
        reset,
        set
    };
}

// Usage in components
function ShoppingCart() {
    const { count, increment, decrement, reset } = useCounter(1, { min: 1, max: 10 });

    return (
        <div>
            <p>Quantity: {count}</p>
            <button onClick={decrement}>-</button>
            <button onClick={increment}>+</button>
            <button onClick={reset}>Reset</button>
        </div>
    );
}

function VolumeControl() {
    const { count: volume, increment, decrement, set } = useCounter(50, {
        min: 0,
        max: 100,
        step: 5
    });

    return (
        <div>
            <p>Volume: {volume}%</p>
            <button onClick={decrement}>-5</button>
            <button onClick={increment}>+5</button>
            <button onClick={() => set(0)}>Mute</button>
            <button onClick={() => set(100)}>Max</button>
        </div>
    );
}
```

---

## Example 2: useLocalStorage Hook

### 💡 **useLocalStorage - Browser API Integration**

Synchronizes React state with localStorage for persistence across sessions.

**How It Works:**

```
Component mounts
     ↓
Read from localStorage (lazy init)
     ↓
Initialize state with stored/default value
     ↓
User updates state
     ↓
Update React state AND localStorage
     ↓
Value persists across page refreshes!
```

**Key Features:**
- Lazy initialization (only reads localStorage once)
- JSON serialization/deserialization
- Error handling (quota exceeded, storage disabled)
- Function updater support (like regular useState)
- Works as drop-in useState replacement

**Common Use Cases:**
- User preferences (theme, language)
- Form draft saving
- Shopping cart persistence
- Recently viewed items
- User settings

```jsx
import { useState, useEffect, useCallback } from 'react';

function useLocalStorage(key, initialValue) {
    // Lazy initialization: only read localStorage once
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Return a wrapped version of useState's setter function that
    // persists the new value to localStorage
    const setValue = useCallback((value) => {
        try {
            // Allow value to be a function (like regular useState)
            const valueToStore = value instanceof Function
                ? value(storedValue)
                : value;

            // Save to state
            setStoredValue(valueToStore);

            // Save to localStorage
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Optional: Sync with other tabs/windows
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === key && e.newValue) {
                setStoredValue(JSON.parse(e.newValue));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue];
}

// Usage examples
function ThemeToggle() {
    const [theme, setTheme] = useLocalStorage('theme', 'light');

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    return (
        <button onClick={toggleTheme}>
            Current theme: {theme}
        </button>
    );
}

function UserSettings() {
    const [settings, setSettings] = useLocalStorage('user-settings', {
        notifications: true,
        language: 'en',
        fontSize: 16
    });

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div>
            <label>
                <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => updateSetting('notifications', e.target.checked)}
                />
                Enable Notifications
            </label>

            <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
            >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
            </select>
        </div>
    );
}
```

---

## Example 3: useFetch Hook

### 💡 **useFetch - Data Fetching Pattern**

Encapsulates the complete data fetching lifecycle with loading, error, and success states.

**The Problem It Solves:**

Without useFetch, every component needs:
- Loading state management
- Error handling
- Data storage
- Cleanup to prevent memory leaks
- Race condition handling

**How useFetch Helps:**

```
Component mounts
     ↓
useFetch starts loading (loading = true)
     ↓
Fetch API call initiated
     ↓
Success → data populated, loading = false
Failure → error set, loading = false
Unmount → Cleanup, prevent state updates
```

**Advanced Features:**
- AbortController for request cancellation
- Race condition prevention
- Memory leak prevention
- Flexible error handling
- Easy to extend (caching, retries, etc.)

```jsx
import { useState, useEffect, useRef } from 'react';

function useFetch(url, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Use ref to track if component is mounted
    const isMountedRef = useRef(true);

    useEffect(() => {
        // Reset states when URL changes
        setLoading(true);
        setError(null);

        // Create AbortController for this request
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const json = await response.json();

                // Only update state if component is still mounted
                if (isMountedRef.current) {
                    setData(json);
                    setError(null);
                }
            } catch (e) {
                // Ignore abort errors (from cleanup)
                if (e.name !== 'AbortError' && isMountedRef.current) {
                    setError(e.message);
                    setData(null);
                }
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        // Cleanup function
        return () => {
            isMountedRef.current = false;
            controller.abort();
        };
    }, [url]); // Re-run when URL changes

    return { data, loading, error };
}

// Advanced version with manual refetch
function useFetchAdvanced(url, options = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const json = await response.json();
            setData(json);
            return json;
        } catch (e) {
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, refetch: fetchData };
}

// Usage examples
function UserProfile({ userId }) {
    const { data: user, loading, error } = useFetch(
        `https://api.example.com/users/${userId}`
    );

    if (loading) return <div>Loading user...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!user) return null;

    return (
        <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
        </div>
    );
}

function PostsList() {
    const { data: posts, loading, error, refetch } = useFetchAdvanced(
        'https://api.example.com/posts'
    );

    if (loading) return <div>Loading posts...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <button onClick={refetch}>Refresh</button>
            {posts?.map(post => (
                <article key={post.id}>
                    <h3>{post.title}</h3>
                    <p>{post.body}</p>
                </article>
            ))}
        </div>
    );
}
```

---

## Example 4: useDebounce Hook

### 💡 **useDebounce - Performance Optimization**

Delays updating a value until after a period of inactivity.

**The Problem:**

**Without Debouncing:**
```
User types "react" (5 keystrokes)
→ 5 API calls
→ Wasted bandwidth
→ Race conditions
→ Poor performance
```

**With Debouncing:**
```
User types "react" (5 keystrokes)
→ Wait for pause
→ 1 API call
→ Efficient
→ Better UX
```

**Expensive Operations to Debounce:**

| Operation | Why Debounce | Typical Delay |
|-----------|--------------|---------------|
| **Search API calls** | Reduce requests | 300-500ms |
| **Auto-save** | Reduce writes | 1000-2000ms |
| **Filter large lists** | Reduce calculations | 200-300ms |
| **Validation** | Reduce checks | 300-500ms |

**The Solution:**

```
User types "hello"
     ↓
'h'   → Start timer
'he'  → Reset timer
'hel' → Reset timer
'hell'→ Reset timer
'hello'→ Reset timer
     ↓
(500ms of silence)
     ↓
Debounced value updates to "hello"
     ↓
Trigger expensive operation once!
```

**Use Cases:**
- Search inputs
- Auto-save functionality
- Resize event handlers
- Scroll listeners
- Form validation

```jsx
import { useState, useEffect } from 'react';

function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set up timer to update debounced value
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup: cancel timer if value changes before delay expires
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Advanced version with callback
function useDebouncedCallback(callback, delay = 500) {
    const [timeoutId, setTimeoutId] = useState(null);

    const debouncedCallback = (...args) => {
        // Clear existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Set new timeout
        const newTimeoutId = setTimeout(() => {
            callback(...args);
        }, delay);

        setTimeoutId(newTimeoutId);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [timeoutId]);

    return debouncedCallback;
}

// Usage: Search with API calls
function SearchUsers() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // Effect runs only when debounced value changes
    useEffect(() => {
        if (!debouncedSearchTerm) {
            setResults([]);
            return;
        }

        const searchUsers = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `https://api.example.com/users?search=${debouncedSearchTerm}`
                );
                const data = await response.json();
                setResults(data);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        };

        searchUsers();
    }, [debouncedSearchTerm]); // Only when debounced value changes

    return (
        <div>
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
            />

            {loading && <div>Searching...</div>}

            <ul>
                {results.map(user => (
                    <li key={user.id}>{user.name}</li>
                ))}
            </ul>

            <p>
                Typing: "{searchTerm}"<br />
                Searching for: "{debouncedSearchTerm}"
            </p>
        </div>
    );
}

// Usage: Auto-save with debounced callback
function AutoSaveEditor() {
    const [content, setContent] = useState('');
    const [saveStatus, setSaveStatus] = useState('');

    const saveToServer = async (text) => {
        setSaveStatus('Saving...');
        try {
            await fetch('/api/save', {
                method: 'POST',
                body: JSON.stringify({ content: text })
            });
            setSaveStatus('Saved!');
        } catch (error) {
            setSaveStatus('Save failed');
        }
    };

    const debouncedSave = useDebouncedCallback(saveToServer, 1000);

    const handleChange = (e) => {
        const newContent = e.target.value;
        setContent(newContent);
        debouncedSave(newContent);
    };

    return (
        <div>
            <textarea
                value={content}
                onChange={handleChange}
                placeholder="Start typing... (auto-saves after 1 second)"
            />
            <div>Status: {saveStatus}</div>
        </div>
    );
}
```

---

## Example 5: useForm Hook

### 💡 **useForm - Complex State Management**

Simplifies form handling by managing values, errors, validation, and submission.

**Features:**
- Centralized form state
- Built-in validation
- Error handling
- Submit handling
- Reset functionality
- Field change tracking

```jsx
import { useState, useCallback } from 'react';

function useForm(initialValues, validate) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setValues(prev => ({
            ...prev,
            [name]: newValue
        }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    }, [errors]);

    const handleBlur = useCallback((e) => {
        const { name } = e.target;

        setTouched(prev => ({
            ...prev,
            [name]: true
        }));

        // Validate field on blur
        if (validate) {
            const fieldErrors = validate(values);
            if (fieldErrors[name]) {
                setErrors(prev => ({
                    ...prev,
                    [name]: fieldErrors[name]
                }));
            }
        }
    }, [values, validate]);

    const handleSubmit = useCallback((onSubmit) => async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Validate all fields
        if (validate) {
            const validationErrors = validate(values);
            setErrors(validationErrors);

            if (Object.keys(validationErrors).length > 0) {
                setIsSubmitting(false);
                return;
            }
        }

        try {
            await onSubmit(values);
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [values, validate]);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    const setFieldValue = useCallback((name, value) => {
        setValues(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const setFieldError = useCallback((name, error) => {
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    }, []);

    return {
        values,
        errors,
        touched,
        isSubmitting,
        handleChange,
        handleBlur,
        handleSubmit,
        reset,
        setFieldValue,
        setFieldError
    };
}

// Usage
function RegistrationForm() {
    const validate = (values) => {
        const errors = {};

        if (!values.email) {
            errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(values.email)) {
            errors.email = 'Email is invalid';
        }

        if (!values.password) {
            errors.password = 'Password is required';
        } else if (values.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        if (values.password !== values.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        return errors;
    };

    const {
        values,
        errors,
        touched,
        isSubmitting,
        handleChange,
        handleBlur,
        handleSubmit,
        reset
    } = useForm(
        {
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false
        },
        validate
    );

    const onSubmit = async (formData) => {
        console.log('Submitting:', formData);
        // API call here
        await new Promise(resolve => setTimeout(resolve, 1000));
        alert('Registration successful!');
        reset();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
                {touched.email && errors.email && (
                    <span className="error">{errors.email}</span>
                )}
            </div>

            <div>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
                {touched.password && errors.password && (
                    <span className="error">{errors.password}</span>
                )}
            </div>

            <div>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                />
                {touched.confirmPassword && errors.confirmPassword && (
                    <span className="error">{errors.confirmPassword}</span>
                )}
            </div>

            <div>
                <label>
                    <input
                        name="acceptTerms"
                        type="checkbox"
                        checked={values.acceptTerms}
                        onChange={handleChange}
                    />
                    I accept the terms and conditions
                </label>
            </div>

            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Register'}
            </button>
            <button type="button" onClick={reset}>
                Reset
            </button>
        </form>
    );
}
```

---

## Example 6: useMediaQuery Hook (React 18)

### 💡 **useMediaQuery - Responsive Design**

Subscribe to CSS media query changes for responsive React components.

```jsx
import { useState, useEffect } from 'react';

function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        // Check on initial render
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        // Create media query list
        const mediaQuery = window.matchMedia(query);

        // Update state when media query changes
        const handler = (e) => setMatches(e.matches);

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            // Legacy browsers
            mediaQuery.addListener(handler);
            return () => mediaQuery.removeListener(handler);
        }
    }, [query]);

    return matches;
}

// Multiple breakpoint hook
function useBreakpoint() {
    const isMobile = useMediaQuery('(max-width: 767px)');
    const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const isWidescreen = useMediaQuery('(min-width: 1440px)');

    return {
        isMobile,
        isTablet,
        isDesktop,
        isWidescreen,
        // Convenience properties
        isSmallScreen: isMobile,
        isMediumScreen: isTablet,
        isLargeScreen: isDesktop || isWidescreen
    };
}

// Usage
function ResponsiveNav() {
    const isMobile = useMediaQuery('(max-width: 767px)');

    return (
        <nav>
            {isMobile ? (
                <MobileMenu />
            ) : (
                <DesktopMenu />
            )}
        </nav>
    );
}

function Dashboard() {
    const { isMobile, isTablet, isDesktop } = useBreakpoint();

    return (
        <div className="dashboard">
            {isMobile && <MobileLayout />}
            {isTablet && <TabletLayout />}
            {isDesktop && <DesktopLayout />}
        </div>
    );
}

function MobileMenu() {
    return <div>Mobile Menu</div>;
}

function DesktopMenu() {
    return <div>Desktop Menu</div>;
}

function MobileLayout() {
    return <div>Mobile Layout</div>;
}

function TabletLayout() {
    return <div>Tablet Layout</div>;
}

function DesktopLayout() {
    return <div>Desktop Layout</div>;
}
```

---

## Common Mistakes

### Mistake 1: Not Following Hook Rules

**The Problem:** Breaking hook rules causes bugs and errors.

```jsx
// ❌ Bad: Conditional hook call
function BadComponent({ shouldFetch }) {
    if (shouldFetch) {
        const data = useFetch('/api/data'); // DON'T DO THIS
    }

    return <div>...</div>;
}

// ✅ Good: Hooks at top level, conditional logic inside
function GoodComponent({ shouldFetch }) {
    const { data, loading } = useFetch(shouldFetch ? '/api/data' : null);

    if (!shouldFetch) return null;
    if (loading) return <div>Loading...</div>;

    return <div>{data}</div>;
}
```

### Mistake 2: Sharing State Between Hooks

**The Problem:** Expecting custom hooks to share state.

```jsx
// ❌ Wrong expectation
function ComponentA() {
    const { count } = useCounter(0);
    return <div>{count}</div>; // 0
}

function ComponentB() {
    const { count, increment } = useCounter(0);
    increment(); // This only affects ComponentB!
    return <div>{count}</div>; // 1
}

// ✅ Correct: Each hook call is independent
// If you need shared state, use Context or state management
```

### Mistake 3: Forgetting Dependencies

**The Problem:** Missing dependencies in custom hooks.

```jsx
// ❌ Bad: Missing dependencies in useEffect
function useBadFetch(url, query) {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch(`${url}?q=${query}`)
            .then(res => res.json())
            .then(setData);
    }, [url]); // Missing 'query'!

    return data;
}

// ✅ Good: All dependencies included
function useGoodFetch(url, query) {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch(`${url}?q=${query}`)
            .then(res => res.json())
            .then(setData);
    }, [url, query]); // All dependencies

    return data;
}
```

---

## Best Practices

### 1. Use Meaningful Names

```jsx
// ✅ Good: Clear, descriptive names
useUserAuthentication()
useShoppingCart()
useFormValidation()
useWindowSize()

// ❌ Bad: Vague or unclear
useData()
useHelper()
useStuff()
```

### 2. Return Consistent Types

```jsx
// ✅ Good: Consistent return types
function useCounter() {
    return { count, increment, decrement }; // Always object
}

function useFetch() {
    return { data, loading, error }; // Always object
}

function useToggle() {
    return [value, toggle]; // Always array (like useState)
}

// ❌ Bad: Inconsistent returns
function useBadHook(condition) {
    if (condition) {
        return { data: value }; // Sometimes object
    }
    return value; // Sometimes primitive
}
```

### 3. Handle Edge Cases

```jsx
function useRobustFetch(url) {
    const [state, setState] = useState({
        data: null,
        loading: false,
        error: null
    });

    useEffect(() => {
        // Don't fetch if no URL
        if (!url) {
            setState({ data: null, loading: false, error: null });
            return;
        }

        const controller = new AbortController();
        setState(prev => ({ ...prev, loading: true, error: null }));

        fetch(url, { signal: controller.signal })
            .then(res => res.json())
            .then(data => setState({ data, loading: false, error: null }))
            .catch(error => {
                // Ignore abort errors
                if (error.name !== 'AbortError') {
                    setState({ data: null, loading: false, error: error.message });
                }
            });

        return () => controller.abort();
    }, [url]);

    return state;
}
```

### 4. Document Your Hooks

```jsx
/**
 * Custom hook for managing pagination state
 *
 * @param {number} totalItems - Total number of items
 * @param {number} itemsPerPage - Items to display per page
 * @returns {Object} Pagination state and controls
 * @returns {number} currentPage - Current page number (1-indexed)
 * @returns {number} totalPages - Total number of pages
 * @returns {function} nextPage - Go to next page
 * @returns {function} prevPage - Go to previous page
 * @returns {function} goToPage - Go to specific page
 *
 * @example
 * const { currentPage, totalPages, nextPage, prevPage } = usePagination(100, 10);
 */
function usePagination(totalItems, itemsPerPage) {
    // Implementation...
}
```

---

## Interview Questions

### Q1: What are custom hooks and why use them?

**Structured Answer:**

**Definition:**
Custom hooks are reusable functions that encapsulate stateful logic using built-in React hooks. They must start with "use" and follow hook rules.

**Why Use Them:**
1. **Code Reusability**: Share logic across components without duplication
2. **Separation of Concerns**: Extract business logic from UI
3. **Testability**: Test logic independently from components
4. **Maintainability**: Update behavior in one place
5. **Composition**: Combine hooks to create complex behaviors

**Example:**
```jsx
// Extract form logic into custom hook
function useForm(initialValues) {
    const [values, setValues] = useState(initialValues);

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    return { values, handleChange };
}

// Use in multiple components
function LoginForm() {
    const { values, handleChange } = useForm({ email: '', password: '' });
    // ...
}

function RegisterForm() {
    const { values, handleChange } = useForm({ email: '', password: '', name: '' });
    // ...
}
```

### Q2: What are the rules of custom hooks?

**Structured Answer:**

**The Rules:**

1. **Naming Convention:**
   - Must start with "use" prefix
   - Signals to React and linters that hook rules apply
   - Examples: `useCounter`, `useFetch`, `useForm`

2. **Top-Level Calls Only:**
   - Can't call hooks in conditions, loops, or nested functions
   - Same rules as built-in hooks

3. **React Functions Only:**
   - Call only from React function components
   - Call only from other custom hooks

4. **Can Call Other Hooks:**
   - Custom hooks can use built-in hooks
   - Custom hooks can call other custom hooks

**Examples:**

```jsx
// ✅ Good: Follows all rules
function useCounter(initialValue) {
    const [count, setCount] = useState(initialValue); // Top level
    return { count, increment: () => setCount(c => c + 1) };
}

// ❌ Bad: Breaks rules
function useBadCounter(shouldCount) {
    if (shouldCount) {
        const [count, setCount] = useState(0); // Conditional hook!
    }
}
```

### Q3: How do custom hooks differ from utility functions?

**Structured Answer:**

| Aspect | Custom Hook | Utility Function |
|--------|-------------|------------------|
| **Can use hooks** | ✅ Yes | ❌ No |
| **Has own state** | ✅ Yes | ❌ No |
| **Naming** | Must start with "use" | Any valid name |
| **Re-renders** | Triggers re-renders | Doesn't affect renders |
| **Use case** | Stateful logic | Pure computations |

**Example:**

```jsx
// Custom Hook - manages state
function useSearch(items) {
    const [query, setQuery] = useState('');

    const results = items.filter(item =>
        item.name.includes(query)
    );

    return { query, setQuery, results };
}

// Utility Function - pure computation
function filterItems(items, query) {
    return items.filter(item => item.name.includes(query));
}

// Usage
function SearchComponent({ items }) {
    // Hook manages state and returns filtered results
    const { query, setQuery, results } = useSearch(items);

    // Function is called with explicit parameters
    const results2 = filterItems(items, query);
}
```

### Q4: Can custom hooks share state?

**Structured Answer:**

**Short Answer:** No. Each hook call creates its own independent state.

**Explanation:**

Custom hooks create **new instances** of state on each call. If you need shared state, use:

1. **Lift state up** to a common parent
2. **Context API** for global state
3. **State management library** (Redux, Zustand)

**Example:**

```jsx
// Each component gets INDEPENDENT state
function Counter1() {
    const { count, increment } = useCounter(0);
    return <div>{count}</div>; // Independent count
}

function Counter2() {
    const { count, increment } = useCounter(0);
    return <div>{count}</div>; // Different count!
}

// To share state, use Context
const CountContext = createContext();

function SharedCounterProvider({ children }) {
    const counter = useCounter(0); // Single instance
    return (
        <CountContext.Provider value={counter}>
            {children}
        </CountContext.Provider>
    );
}

function useSharedCounter() {
    return useContext(CountContext); // Shared state!
}
```

### Q5: When should you create a custom hook vs using a utility function?

**Structured Answer:**

**Create a Custom Hook When:**
- ✅ Logic needs React state
- ✅ Logic uses other hooks (useEffect, useContext)
- ✅ Logic triggers re-renders
- ✅ Logic involves component lifecycle

**Use a Utility Function When:**
- ✅ Pure computation (no side effects)
- ✅ No state management needed
- ✅ Doesn't interact with React lifecycle
- ✅ Can be tested without React

**Examples:**

```jsx
// Custom Hook - needs state and effects
function useWindowSize() {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            setSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return size;
}

// Utility Function - pure calculation
function calculateDiscount(price, discountPercent) {
    return price * (1 - discountPercent / 100);
}

// Utility Function - data transformation
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
    }).format(amount);
}
```

---

## External Resources

- [React Docs: Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React Docs: Custom Hooks](https://react.dev/reference/react)
- [useHooks.com: Collection of Hooks](https://usehooks.com/)
- [React Hooks Cheatsheet](https://react-hooks-cheatsheet.com/)

---

[← Back to React](./README.md) | [Next: Context API →](./07-context-api.md)
