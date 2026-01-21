# State Management

## Understanding State Management in React

### 💡 **State Management - Organizing App Data**

Organize, store, and coordinate data that changes over time in your application.

**The State Management Journey:**

| App Size | State Needs | Solution |
|----------|-------------|----------|
| **Small** | Few components | useState only |
| **Medium** | Some sharing | useState + Context |
| **Large** | Complex sharing | Context + useReducer or Zustand |
| **Enterprise** | Everything | Redux or similar |

**The Decision Tree:**

```
Does only one component need this data?
├─ Yes → useState (local state)
└─ No → Multiple components need it?
    ├─ Are they parent-child?
    │   └─ Yes → Props (lift state up)
    └─ No → Unrelated components?
        ├─ Changes rarely (theme, auth)?
        │   └─ Yes → Context API
        └─ Changes frequently?
            ├─ Server data?
            │   └─ Yes → React Query/SWR
            └─ Client data?
                └─ Yes → Zustand/Redux
```

> **Key Principle:** Start with local state. Only add complexity when you actually need it. Most apps don't need Redux.

## Why State Management Matters

**Interview Perspective:**
- Asked in 85%+ of React interviews for mid-senior positions
- Tests architectural decision-making skills
- Demonstrates understanding of data flow patterns
- Critical for discussing scalability and performance
- Shows knowledge of modern React ecosystem

**Real-World Importance:**
- **Scalability**: Wrong choice makes apps unmaintainable
- **Performance**: Poor state management causes unnecessary re-renders
- **Developer Experience**: Good patterns reduce bugs and improve velocity
- **Team Collaboration**: Clear state patterns enable parallel development
- **Debugging**: Predictable state makes bugs easier to track

## Core Concepts Overview

### **State Categories**
- **Local State**: Component-specific data (useState)
- **Shared State**: Data needed by multiple components (Context, props)
- **Global State**: Application-wide data (Redux, Zustand)
- **Server State**: Cached data from APIs (React Query, SWR)
- **URL State**: Data in the URL (React Router)

### **State Management Evolution**
| Era | Technology | Approach |
|-----|-----------|----------|
| **2013-2015** | Redux + React | Centralized global store |
| **2016-2018** | Context API | Built-in React solution |
| **2019-2021** | Hooks (useState, useReducer) | Local-first approach |
| **2022-Present** | Zustand, Jotai, React Query | Lightweight, specialized solutions |

### **The State Colocation Principle**

> "Keep state as close to where it's used as possible, lift it up only when necessary."

This fundamental principle prevents over-engineering and keeps components simple.

## Key Principles

| Principle | Description | Why It Matters |
|-----------|-------------|----------------|
| **Single Source of Truth** | Each piece of state has one authoritative source | Prevents sync bugs |
| **Unidirectional Data Flow** | Data flows one direction (parent → child) | Predictable, debuggable |
| **Immutability** | Never mutate state directly | Enables optimization, prevents bugs |
| **Separation of Concerns** | UI state ≠ server state ≠ form state | Clarity, maintainability |
| **Minimal State** | Derive values instead of storing duplicates | Reduces bugs, easier to maintain |

### Modern Best Practices

✅ **Do:**
- Start with local state (useState)
- Use Context for theme, auth, i18n
- Consider React Query for server state
- Use Zustand/Jotai for simple global state
- Choose Redux only when you need its features
- Normalize complex state shapes

❌ **Don't:**
- Put everything in global state
- Use Context for frequently changing data
- Store derived values in state
- Mutate state directly
- Mix server state with UI state
- Prematurely optimize state structure

---

## Example 1: Local State (useState)

### 💡 **Component-Level State Management**

Local state is the foundation - use it when state belongs to a single component.

**When to Use Local State:**

| Scenario | Example |
|----------|---------|
| **Form inputs** | Text fields, checkboxes, selects |
| **UI toggles** | Modals, dropdowns, accordions |
| **Temporary data** | Search filters, pagination |
| **Component-specific** | Hover state, focus state |

**Key Characteristics:**

✅ **Simplest solution** - No setup, built into React
✅ **Performant** - Only component re-renders
✅ **Isolated** - No coupling to other components
✅ **Type-safe** - Works perfectly with TypeScript

⚠️ **Limitations:**
- Can't be shared across components
- Doesn't persist across unmount/remount
- Can lead to prop drilling

**State Organization Strategies:**

**Strategy 1: Multiple useState (Recommended for Simple State)**
```javascript
// ✅ Clear, independent updates
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [age, setAge] = useState(0);
```

**Strategy 2: Object State (For Related Data)**
```javascript
// ⚠️ Must spread previous state
const [user, setUser] = useState({ name: '', email: '', age: 0 });
setUser(prev => ({ ...prev, name: 'John' }));
```

**Strategy 3: useReducer (For Complex State Logic)**
```javascript
// ✅ Centralized update logic
const [state, dispatch] = useReducer(reducer, initialState);
dispatch({ type: 'UPDATE_NAME', payload: 'John' });
```

```jsx
import { useState } from 'react';

// Simple local state
function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
            <button onClick={() => setCount(count - 1)}>Decrement</button>
            <button onClick={() => setCount(0)}>Reset</button>
        </div>
    );
}

// Form with multiple state variables
function UserForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        const newErrors = {};
        if (!name.trim()) newErrors.name = 'Name is required';
        if (!email.includes('@')) newErrors.email = 'Invalid email';
        if (age < 18) newErrors.age = 'Must be 18+';
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            await submitUser({ name, email, age });
            // Reset form
            setName('');
            setEmail('');
            setAge('');
            setErrors({});
        } catch (error) {
            setErrors({ submit: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                />
                {errors.name && <span className="error">{errors.name}</span>}
            </div>

            <div>
                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                />
                {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div>
                <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Age"
                />
                {errors.age && <span className="error">{errors.age}</span>}
            </div>

            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>

            {errors.submit && <div className="error">{errors.submit}</div>}
        </form>
    );
}

// Object state (use sparingly)
function ProductFilter() {
    const [filters, setFilters] = useState({
        category: 'all',
        priceMin: 0,
        priceMax: 1000,
        inStock: false
    });

    const updateFilter = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <div>
            <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
            >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
            </select>

            <input
                type="range"
                min="0"
                max="1000"
                value={filters.priceMax}
                onChange={(e) => updateFilter('priceMax', parseInt(e.target.value))}
            />

            <label>
                <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) => updateFilter('inStock', e.target.checked)}
                />
                In Stock Only
            </label>

            <div>
                <p>Active Filters:</p>
                <pre>{JSON.stringify(filters, null, 2)}</pre>
            </div>
        </div>
    );
}
```

**Real-world Use Case:**
Form handling, UI toggles, search filters - any state that doesn't need to be shared.

---

## Example 2: Global State (Context + useReducer)

### 💡 **React's Built-in Global State Solution**

Context + useReducer provides Redux-like state management without external dependencies.

**When to Use Context + useReducer:**

| Use Case | Why Context Works |
|----------|------------------|
| **Theme** | Rarely changes, many consumers |
| **Authentication** | Shared across many components |
| **User preferences** | Language, settings, etc. |
| **Shopping cart** | Needs to be accessed everywhere |
| **Notifications** | Global notification system |

**Architecture Pattern:**

```
State (useReducer)
         ↓
    Provider (Context)
         ↓
   App Component Tree
         ↓
Consumers (useContext)
```

**Benefits:**

✅ **Built-in** - No external dependencies
✅ **Simple** - Familiar React patterns
✅ **Powerful** - Handles complex state logic
✅ **Predictable** - Pure reducer functions

⚠️ **Limitations:**
- Performance issues with frequent updates
- No built-in dev tools
- No middleware support
- Can cause unnecessary re-renders

```jsx
import { createContext, useContext, useReducer } from 'react';

// 1. Define state shape
const initialState = {
    user: null,
    theme: 'light',
    language: 'en',
    notifications: []
};

// 2. Create context
const AppContext = createContext();

// 3. Define reducer
function appReducer(state, action) {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload };

        case 'LOGOUT':
            return { ...state, user: null };

        case 'TOGGLE_THEME':
            return {
                ...state,
                theme: state.theme === 'light' ? 'dark' : 'light'
            };

        case 'SET_LANGUAGE':
            return { ...state, language: action.payload };

        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [...state.notifications, action.payload]
            };

        case 'REMOVE_NOTIFICATION':
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.payload)
            };

        case 'CLEAR_NOTIFICATIONS':
            return { ...state, notifications: [] };

        default:
            return state;
    }
}

// 4. Provider component
function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Optional: Add helper functions
    const value = {
        state,
        dispatch,
        // Convenience methods
        setUser: (user) => dispatch({ type: 'SET_USER', payload: user }),
        logout: () => dispatch({ type: 'LOGOUT' }),
        toggleTheme: () => dispatch({ type: 'TOGGLE_THEME' }),
        setLanguage: (lang) => dispatch({ type: 'SET_LANGUAGE', payload: lang }),
        addNotification: (notification) => dispatch({
            type: 'ADD_NOTIFICATION',
            payload: { ...notification, id: Date.now() }
        }),
        removeNotification: (id) => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

// 5. Custom hook for consuming context
function useAppState() {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error('useAppState must be used within AppProvider');
    }

    return context;
}

// 6. Usage in app
function App() {
    return (
        <AppProvider>
            <Header />
            <Main />
            <Notifications />
        </AppProvider>
    );
}

// Consuming context in components
function Header() {
    const { state, toggleTheme, logout } = useAppState();

    return (
        <header>
            <h1>My App</h1>
            {state.user && <p>Welcome, {state.user.name}!</p>}
            <button onClick={toggleTheme}>
                Switch to {state.theme === 'light' ? 'dark' : 'light'} mode
            </button>
            {state.user && <button onClick={logout}>Logout</button>}
        </header>
    );
}

function Main() {
    const { state } = useAppState();

    return (
        <main className={`theme-${state.theme}`}>
            {state.user ? (
                <Dashboard />
            ) : (
                <Login />
            )}
        </main>
    );
}

function Login() {
    const { setUser } = useAppState();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        const user = await loginUser(email, password);
        setUser(user);
    };

    return (
        <form onSubmit={handleLogin}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Login</button>
        </form>
    );
}

function Notifications() {
    const { state, removeNotification } = useAppState();

    return (
        <div className="notifications">
            {state.notifications.map(notification => (
                <div key={notification.id} className={`notification ${notification.type}`}>
                    <p>{notification.message}</p>
                    <button onClick={() => removeNotification(notification.id)}>×</button>
                </div>
            ))}
        </div>
    );
}
```

**Performance Optimization:**

```jsx
// Split contexts to prevent unnecessary re-renders
const ThemeContext = createContext();
const UserContext = createContext();

function AppProvider({ children }) {
    const [theme, setTheme] = useState('light');
    const [user, setUser] = useState(null);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <UserContext.Provider value={{ user, setUser }}>
                {children}
            </UserContext.Provider>
        </ThemeContext.Provider>
    );
}

// Now components only re-render when their specific context changes
function ThemeToggle() {
    const { theme, setTheme } = useContext(ThemeContext);
    // Only re-renders when theme changes
}

function UserProfile() {
    const { user } = useContext(UserContext);
    // Only re-renders when user changes
}
```

**Real-world Use Case:**
Authentication state, theme preferences, shopping cart, application-wide settings.

---

## Example 3: Redux Pattern

### 💡 **Industry-Standard State Management**

Redux provides a predictable, centralized state container with powerful dev tools and middleware.

**When to Use Redux:**

| Scenario | Why Redux Shines |
|----------|-----------------|
| **Large apps** | 20+ components sharing state |
| **Complex state logic** | Multi-step workflows, undo/redo |
| **Time-travel debugging** | Need to replay actions |
| **Middleware needs** | Async logic, logging, analytics |
| **Team conventions** | Strict patterns for large teams |

**Redux Architecture:**

```
Component → Action → Reducer → Store → Component
                         ↑
                    Middleware
```

**Comparison: Redux vs Context:**

| Feature | Redux | Context + useReducer |
|---------|-------|---------------------|
| **Boilerplate** | ⚠️ More | ✅ Less |
| **Dev Tools** | ✅ Excellent | ❌ Basic |
| **Middleware** | ✅ Built-in | ❌ Manual |
| **Performance** | ✅ Optimized | ⚠️ Can be slow |
| **Learning Curve** | ⚠️ Steeper | ✅ Gentler |
| **Community** | ✅ Huge | ✅ Good |

```jsx
// MODERN REDUX WITH REDUX TOOLKIT (Recommended)
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';

// 1. Create slice (combines actions + reducer)
const counterSlice = createSlice({
    name: 'counter',
    initialState: {
        value: 0,
        history: []
    },
    reducers: {
        increment: (state) => {
            state.value += 1; // Redux Toolkit uses Immer, allows "mutations"
            state.history.push({ action: 'increment', timestamp: Date.now() });
        },
        decrement: (state) => {
            state.value -= 1;
            state.history.push({ action: 'decrement', timestamp: Date.now() });
        },
        incrementByAmount: (state, action) => {
            state.value += action.payload;
            state.history.push({
                action: 'incrementByAmount',
                amount: action.payload,
                timestamp: Date.now()
            });
        },
        reset: (state) => {
            state.value = 0;
            state.history = [];
        }
    }
});

// 2. Create user slice
const userSlice = createSlice({
    name: 'user',
    initialState: {
        currentUser: null,
        isAuthenticated: false,
        loading: false,
        error: null
    },
    reducers: {
        loginStart: (state) => {
            state.loading = true;
            state.error = null;
        },
        loginSuccess: (state, action) => {
            state.currentUser = action.payload;
            state.isAuthenticated = true;
            state.loading = false;
        },
        loginFailure: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        logout: (state) => {
            state.currentUser = null;
            state.isAuthenticated = false;
        }
    }
});

// 3. Export actions
export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;
export const { loginStart, loginSuccess, loginFailure, logout } = userSlice.actions;

// 4. Configure store
const store = configureStore({
    reducer: {
        counter: counterSlice.reducer,
        user: userSlice.reducer
    },
    // Middleware, dev tools automatically included
});

// 5. Provide store to app
function App() {
    return (
        <Provider store={store}>
            <CounterComponent />
            <UserProfile />
        </Provider>
    );
}

// 6. Use in components
function CounterComponent() {
    // Select state
    const count = useSelector(state => state.counter.value);
    const history = useSelector(state => state.counter.history);

    // Get dispatch
    const dispatch = useDispatch();

    return (
        <div>
            <h2>Count: {count}</h2>

            <button onClick={() => dispatch(increment())}>+1</button>
            <button onClick={() => dispatch(decrement())}>-1</button>
            <button onClick={() => dispatch(incrementByAmount(5))}>+5</button>
            <button onClick={() => dispatch(reset())}>Reset</button>

            <div>
                <h3>History:</h3>
                <ul>
                    {history.map((entry, i) => (
                        <li key={i}>
                            {entry.action}
                            {entry.amount && ` (${entry.amount})`}
                            - {new Date(entry.timestamp).toLocaleTimeString()}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function UserProfile() {
    const { currentUser, isAuthenticated, loading, error } = useSelector(state => state.user);
    const dispatch = useDispatch();

    const handleLogin = async () => {
        dispatch(loginStart());
        try {
            const user = await fetchUser();
            dispatch(loginSuccess(user));
        } catch (error) {
            dispatch(loginFailure(error.message));
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return isAuthenticated ? (
        <div>
            <h2>Welcome, {currentUser.name}!</h2>
            <button onClick={() => dispatch(logout())}>Logout</button>
        </div>
    ) : (
        <button onClick={handleLogin}>Login</button>
    );
}

// ASYNC ACTIONS WITH THUNKS
import { createAsyncThunk } from '@reduxjs/toolkit';

// Create async thunk
export const fetchUserData = createAsyncThunk(
    'user/fetchUserData',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await fetch(`/api/users/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// Handle in slice
const userSlice = createSlice({
    name: 'user',
    initialState: { data: null, loading: false, error: null },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUserData.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchUserData.fulfilled, (state, action) => {
                state.data = action.payload;
                state.loading = false;
            })
            .addCase(fetchUserData.rejected, (state, action) => {
                state.error = action.payload;
                state.loading = false;
            });
    }
});

// Usage
function UserDataComponent({ userId }) {
    const dispatch = useDispatch();
    const { data, loading, error } = useSelector(state => state.user);

    useEffect(() => {
        dispatch(fetchUserData(userId));
    }, [userId, dispatch]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!data) return null;

    return <div>{data.name}</div>;
}
```

**Redux Dev Tools Benefits:**

✅ **Time-travel debugging** - Replay actions
✅ **Action history** - See all state changes
✅ **State inspection** - Examine state at any point
✅ **Action dispatch** - Manually dispatch actions

**Real-world Use Case:**
Large e-commerce apps, complex dashboards, applications requiring undo/redo, apps with extensive async logic.

---

## Example 4: Lightweight Alternatives (Zustand)

### 💡 **Modern Minimal State Management**

Zustand represents the trend toward simpler, more ergonomic state management.

**Why Zustand:**

| Feature | Zustand | Redux | Context |
|---------|---------|-------|---------|
| **Bundle Size** | ✅ 1KB | ⚠️ 10KB+ | ✅ 0KB (built-in) |
| **Boilerplate** | ✅ Minimal | ❌ Significant | ✅ Moderate |
| **TypeScript** | ✅ Excellent | ✅ Good | ✅ Good |
| **Dev Tools** | ✅ Yes | ✅ Excellent | ❌ No |
| **Learning Curve** | ✅ Easy | ⚠️ Moderate | ✅ Easy |
| **Performance** | ✅ Optimized | ✅ Optimized | ⚠️ Can be slow |

**When to Use Zustand:**

✅ **Medium-sized apps** - Don't need Redux complexity
✅ **Global UI state** - Modals, notifications, sidebar state
✅ **Simple data sharing** - No complex middleware needed
✅ **Fast prototyping** - Quick to set up and use

```jsx
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// 1. Create store (that's it!)
const useStore = create((set, get) => ({
    // State
    count: 0,
    user: null,
    todos: [],

    // Actions
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),

    // Async action
    fetchUser: async (userId) => {
        const response = await fetch(`/api/users/${userId}`);
        const user = await response.json();
        set({ user });
    },

    // Actions on nested state
    addTodo: (todo) => set((state) => ({
        todos: [...state.todos, { id: Date.now(), ...todo }]
    })),

    removeTodo: (id) => set((state) => ({
        todos: state.todos.filter(t => t.id !== id)
    })),

    toggleTodo: (id) => set((state) => ({
        todos: state.todos.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        )
    })),

    // Computed values (using get)
    completedTodos: () => get().todos.filter(t => t.completed),
    incompleteTodos: () => get().todos.filter(t => !t.completed)
}));

// 2. Use in components (no Provider needed!)
function Counter() {
    const count = useStore(state => state.count);
    const increment = useStore(state => state.increment);
    const decrement = useStore(state => state.decrement);

    // Or destructure (but watch for re-renders)
    // const { count, increment, decrement } = useStore();

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={increment}>+</button>
            <button onClick={decrement}>-</button>
        </div>
    );
}

function TodoList() {
    const todos = useStore(state => state.todos);
    const addTodo = useStore(state => state.addTodo);
    const toggleTodo = useStore(state => state.toggleTodo);
    const removeTodo = useStore(state => state.removeTodo);

    const [input, setInput] = useState('');

    const handleAdd = () => {
        if (input.trim()) {
            addTodo({ text: input, completed: false });
            setInput('');
        }
    };

    return (
        <div>
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button onClick={handleAdd}>Add</button>

            <ul>
                {todos.map(todo => (
                    <li key={todo.id}>
                        <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                        />
                        <span style={{
                            textDecoration: todo.completed ? 'line-through' : 'none'
                        }}>
                            {todo.text}
                        </span>
                        <button onClick={() => removeTodo(todo.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Advanced: With middleware
const useAdvancedStore = create(
    devtools(
        persist(
            (set) => ({
                theme: 'light',
                toggleTheme: () => set((state) => ({
                    theme: state.theme === 'light' ? 'dark' : 'light'
                }))
            }),
            {
                name: 'app-storage', // localStorage key
                getStorage: () => localStorage
            }
        )
    )
);

// Advanced: Slices pattern (like Redux)
const createCounterSlice = (set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 }))
});

const createUserSlice = (set) => ({
    user: null,
    setUser: (user) => set({ user }),
    logout: () => set({ user: null })
});

const useSlicedStore = create((set) => ({
    ...createCounterSlice(set),
    ...createUserSlice(set)
}));

// Selecting specific state (prevents unnecessary re-renders)
function OptimizedComponent() {
    // ✅ Only re-renders when count changes
    const count = useStore(state => state.count);

    // ❌ Re-renders on ANY state change
    // const { count } = useStore();

    return <div>{count}</div>;
}

// Custom selectors
const useCompletedTodos = () => useStore(
    state => state.todos.filter(t => t.completed)
);

function CompletedTodos() {
    const completed = useCompletedTodos();
    return <div>Completed: {completed.length}</div>;
}
```

**Comparison with Other Libraries:**

**Zustand vs Jotai:**
- Zustand: Single store, similar to Redux
- Jotai: Atomic state, similar to Recoil

**Zustand vs Valtio:**
- Zustand: Immutable updates
- Valtio: Proxy-based, mutable updates

**Real-world Use Case:**
Mid-sized apps, UI state management, when you want global state without Redux complexity.

---

## Comparison Table: State Management Solutions

| Solution | Size | Complexity | Performance | Use Case |
|----------|------|-----------|-------------|----------|
| **useState** | ✅ Built-in | ✅ Simple | ✅ Excellent | Local component state |
| **Context + useReducer** | ✅ Built-in | ⚠️ Moderate | ⚠️ Can be slow | Auth, theme, i18n |
| **Redux Toolkit** | ⚠️ 10KB | ⚠️ Moderate | ✅ Excellent | Large apps, complex logic |
| **Zustand** | ✅ 1KB | ✅ Simple | ✅ Excellent | Medium apps, global UI |
| **Jotai** | ✅ 3KB | ⚠️ Moderate | ✅ Excellent | Atomic state needs |
| **React Query** | ⚠️ 12KB | ⚠️ Moderate | ✅ Excellent | Server state only |
| **Recoil** | ⚠️ 15KB | ⚠️ Complex | ✅ Good | Facebook-scale apps |

---

## Common Mistakes

### ❌ Mistake 1: Storing Derived State

**Problem:**
Storing values that can be calculated from other state.

```jsx
// ❌ BAD - Storing derived values
function ProductList({ products }) {
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // Manually keeping filtered list in sync
        const filtered = products.filter(p =>
            filter === 'all' || p.category === filter
        );
        setFilteredProducts(filtered);
    }, [products, filter]);

    return <div>{filteredProducts.map(...)}</div>;
}

// ✅ GOOD - Calculate on render
function ProductList({ products }) {
    const [filter, setFilter] = useState('all');

    // Derive value during render
    const filteredProducts = products.filter(p =>
        filter === 'all' || p.category === filter
    );

    return <div>{filteredProducts.map(...)}</div>;
}

// ✅ BETTER - Use useMemo if expensive
function ProductList({ products }) {
    const [filter, setFilter] = useState('all');

    const filteredProducts = useMemo(() =>
        products.filter(p => filter === 'all' || p.category === filter),
        [products, filter]
    );

    return <div>{filteredProducts.map(...)}</div>;
}
```

### ❌ Mistake 2: Prop Drilling

**Problem:**
Passing props through many intermediate components.

```jsx
// ❌ BAD - Prop drilling
function App() {
    const [user, setUser] = useState(null);

    return <Dashboard user={user} setUser={setUser} />;
}

function Dashboard({ user, setUser }) {
    return <Sidebar user={user} setUser={setUser} />;
}

function Sidebar({ user, setUser }) {
    return <UserMenu user={user} setUser={setUser} />;
}

function UserMenu({ user, setUser }) {
    // Finally used here, but passed through 3 components!
    return <div>{user?.name}</div>;
}

// ✅ GOOD - Use Context
const UserContext = createContext();

function App() {
    const [user, setUser] = useState(null);

    return (
        <UserContext.Provider value={{ user, setUser }}>
            <Dashboard />
        </UserContext.Provider>
    );
}

function UserMenu() {
    const { user } = useContext(UserContext);
    return <div>{user?.name}</div>;
}
```

### ❌ Mistake 3: Mutating State Directly

**Problem:**
Modifying state objects/arrays directly.

```jsx
// ❌ WRONG - Direct mutation
function TodoList() {
    const [todos, setTodos] = useState([]);

    const addTodo = (text) => {
        todos.push({ id: Date.now(), text }); // Mutation!
        setTodos(todos); // Won't trigger re-render properly
    };

    const toggleTodo = (id) => {
        const todo = todos.find(t => t.id === id);
        todo.completed = !todo.completed; // Mutation!
        setTodos(todos); // Won't work
    };
}

// ✅ CORRECT - Immutable updates
function TodoList() {
    const [todos, setTodos] = useState([]);

    const addTodo = (text) => {
        setTodos([...todos, { id: Date.now(), text, completed: false }]);
    };

    const toggleTodo = (id) => {
        setTodos(todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    };

    const removeTodo = (id) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };
}
```

---

## Best Practices

### 1. Choose the Right Tool for the Job

**Decision Tree:**

```
Is the state local to one component?
    ├─ YES → useState
    └─ NO → Is it shared by a few nearby components?
        ├─ YES → Lift state up
        └─ NO → Is it shared across many distant components?
            ├─ YES → Is it server data?
            │   ├─ YES → React Query / SWR
            │   └─ NO → Is it frequently changing?
            │       ├─ YES → Zustand / Jotai
            │       └─ NO → Context
            └─ Complex app with middleware needs?
                └─ YES → Redux Toolkit
```

### 2. Normalize Complex State

**State Normalization** - Store entities in normalized shape for easier updates.

```jsx
// ❌ Nested arrays - hard to update
const state = {
    users: [
        {
            id: 1,
            name: 'Alice',
            posts: [
                { id: 101, title: 'Post 1', comments: [...] },
                { id: 102, title: 'Post 2', comments: [...] }
            ]
        }
    ]
};

// ✅ Normalized - easy to update
const state = {
    users: {
        1: { id: 1, name: 'Alice', postIds: [101, 102] }
    },
    posts: {
        101: { id: 101, userId: 1, title: 'Post 1', commentIds: [...] },
        102: { id: 102, userId: 1, title: 'Post 2', commentIds: [...] }
    },
    comments: {
        // ...
    }
};

// Easy updates
function updatePost(postId, updates) {
    setState(state => ({
        ...state,
        posts: {
            ...state.posts,
            [postId]: { ...state.posts[postId], ...updates }
        }
    }));
}
```

### 3. Separate Server State from Client State

**Why Separate:**
- Different concerns (caching vs UI)
- Different update patterns
- Different libraries optimize each

```jsx
// ✅ Use React Query for server state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function UserProfile({ userId }) {
    // Server state - handled by React Query
    const { data: user, isLoading } = useQuery(['user', userId], () =>
        fetch(`/api/users/${userId}`).then(r => r.json())
    );

    // Client state - handled by useState
    const [isEditing, setIsEditing] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const queryClient = useQueryClient();

    const mutation = useMutation(
        (updates) => fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        }),
        {
            onSuccess: () => {
                // Invalidate and refetch
                queryClient.invalidateQueries(['user', userId]);
            }
        }
    );

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            {user.name}
            <button onClick={() => setIsEditing(!isEditing)}>Edit</button>
        </div>
    );
}
```

### 4. Use Selectors to Optimize Renders

**Selector Pattern** - Select only the state you need to prevent unnecessary re-renders.

```jsx
// ❌ BAD - Re-renders on any state change
function UserName() {
    const state = useStore(); // Gets entire state
    return <div>{state.user.name}</div>;
}

// ✅ GOOD - Only re-renders when user.name changes
function UserName() {
    const userName = useStore(state => state.user.name);
    return <div>{userName}</div>;
}

// ✅ BETTER - Memoized selector
import { createSelector } from 'reselect';

const selectUserName = createSelector(
    state => state.user,
    user => user.name
);

function UserName() {
    const userName = useSelector(selectUserName);
    return <div>{userName}</div>;
}
```

---

## Real-world Scenarios

### Scenario 1: E-commerce Shopping Cart

**Multi-source State Management** - Combining different state management approaches.

```jsx
// Global cart state (Zustand)
const useCartStore = create((set, get) => ({
    items: [],
    addItem: (product) => set((state) => ({
        items: [...state.items, { ...product, quantity: 1 }]
    })),
    removeItem: (productId) => set((state) => ({
        items: state.items.filter(item => item.id !== productId)
    })),
    updateQuantity: (productId, quantity) => set((state) => ({
        items: state.items.map(item =>
            item.id === productId ? { ...item, quantity } : item
        )
    })),
    clearCart: () => set({ items: [] }),
    total: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
}));

// Product list with filters (Local state)
function ProductList() {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');

    // Server state (React Query)
    const { data: products, isLoading } = useQuery('products', fetchProducts);

    // Derived state
    const filteredAndSorted = useMemo(() => {
        let result = products || [];

        if (filter !== 'all') {
            result = result.filter(p => p.category === filter);
        }

        result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'price') return a.price - b.price;
            return 0;
        });

        return result;
    }, [products, filter, sortBy]);

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <FilterControls filter={filter} setFilter={setFilter} />
            <SortControls sortBy={sortBy} setSortBy={setSortBy} />

            <div className="product-grid">
                {filteredAndSorted.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

// Product card uses cart store
function ProductCard({ product }) {
    const addItem = useCartStore(state => state.addItem);
    const cartItems = useCartStore(state => state.items);

    const inCart = cartItems.some(item => item.id === product.id);

    return (
        <div className="product-card">
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <button
                onClick={() => addItem(product)}
                disabled={inCart}
            >
                {inCart ? 'In Cart' : 'Add to Cart'}
            </button>
        </div>
    );
}

// Cart component
function ShoppingCart() {
    const items = useCartStore(state => state.items);
    const removeItem = useCartStore(state => state.removeItem);
    const updateQuantity = useCartStore(state => state.updateQuantity);
    const total = useCartStore(state => state.total());

    return (
        <div className="cart">
            <h2>Shopping Cart</h2>

            {items.length === 0 ? (
                <p>Cart is empty</p>
            ) : (
                <>
                    {items.map(item => (
                        <div key={item.id} className="cart-item">
                            <span>{item.name}</span>
                            <span>${item.price}</span>
                            <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                            />
                            <button onClick={() => removeItem(item.id)}>Remove</button>
                        </div>
                    ))}

                    <div className="cart-total">
                        <strong>Total: ${total}</strong>
                    </div>

                    <button>Checkout</button>
                </>
            )}
        </div>
    );
}
```

**State Breakdown:**
- ✅ **Cart items** → Zustand (global, persists)
- ✅ **Product list** → React Query (server state)
- ✅ **Filters/sort** → useState (local UI state)
- ✅ **Filtered results** → useMemo (derived state)

### Scenario 2: Social Media Feed

**Infinite Scroll with State Management** - Handling paginated server state.

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';

function SocialFeed() {
    // Server state with pagination
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading
    } = useInfiniteQuery(
        ['posts'],
        ({ pageParam = 1 }) => fetchPosts(pageParam),
        {
            getNextPageParam: (lastPage, pages) => lastPage.nextPage ?? undefined
        }
    );

    // Local UI state
    const [filter, setFilter] = useState('all');
    const [showNewPostModal, setShowNewPostModal] = useState(false);

    // Flatten pages into single array
    const posts = data?.pages.flatMap(page => page.posts) ?? [];

    // Filter posts
    const filteredPosts = useMemo(() => {
        if (filter === 'all') return posts;
        return posts.filter(post => post.category === filter);
    }, [posts, filter]);

    return (
        <div>
            <button onClick={() => setShowNewPostModal(true)}>
                New Post
            </button>

            <FilterBar filter={filter} setFilter={setFilter} />

            <div className="feed">
                {filteredPosts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>

            {hasNextPage && (
                <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </button>
            )}

            {showNewPostModal && (
                <NewPostModal onClose={() => setShowNewPostModal(false)} />
            )}
        </div>
    );
}
```

---

## Interview Questions

### Q1: When would you use Context vs Redux?

**Answer:**

**Use Context when:**
- ✅ State changes infrequently (theme, auth, language)
- ✅ Small to medium app
- ✅ Want to avoid external dependencies
- ✅ Don't need middleware or dev tools

**Use Redux when:**
- ✅ Large app with complex state
- ✅ Need time-travel debugging
- ✅ Require middleware (logging, analytics)
- ✅ Team needs strict conventions
- ✅ State changes frequently and in complex ways

**Example Comparison:**

```jsx
// Context - Good for auth
const AuthContext = createContext();

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // Auth doesn't change frequently
    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// Redux - Good for complex shopping cart
const cartSlice = createSlice({
    name: 'cart',
    initialState: { items: [], total: 0, discounts: [] },
    reducers: {
        addItem: (state, action) => { /* complex logic */ },
        removeItem: (state, action) => { /* complex logic */ },
        applyDiscount: (state, action) => { /* complex logic */ },
        // Many more actions...
    }
});
```

### Q2: How do you prevent unnecessary re-renders with Context?

**Answer:**

**Problem:** Context causes all consumers to re-render when any value changes.

**Solutions:**

**1. Split Contexts:**
```jsx
// ❌ BAD - Single context
const AppContext = createContext();

function Provider({ children }) {
    const [user, setUser] = useState(null);
    const [theme, setTheme] = useState('light');

    // Any change re-renders all consumers
    return (
        <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
            {children}
        </AppContext.Provider>
    );
}

// ✅ GOOD - Separate contexts
const UserContext = createContext();
const ThemeContext = createContext();

function Provider({ children }) {
    const [user, setUser] = useState(null);
    const [theme, setTheme] = useState('light');

    return (
        <UserContext.Provider value={{ user, setUser }}>
            <ThemeContext.Provider value={{ theme, setTheme }}>
                {children}
            </ThemeContext.Provider>
        </UserContext.Provider>
    );
}
```

**2. Memoize Context Value:**
```jsx
function Provider({ children }) {
    const [user, setUser] = useState(null);

    // Memoize value to prevent re-creating on every render
    const value = useMemo(() => ({ user, setUser }), [user]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}
```

**3. Use Selectors:**
```jsx
// Custom hook with selector
function useUser(selector) {
    const { user } = useContext(UserContext);
    return selector(user);
}

// Only re-renders when name changes
function UserName() {
    const name = useUser(user => user?.name);
    return <div>{name}</div>;
}
```

### Q3: What's the difference between useState and useReducer?

**Answer:**

| Feature | useState | useReducer |
|---------|----------|-----------|
| **Complexity** | Simple state | Complex state logic |
| **Updates** | Direct setter | Dispatch actions |
| **Logic location** | Inline | Centralized in reducer |
| **Testing** | Test component | Test reducer separately |
| **Use case** | Simple values | Complex objects, multiple related values |

**useState - Simple State:**
```jsx
const [count, setCount] = useState(0);

// Simple updates
setCount(count + 1);
setCount(prev => prev + 1);
```

**useReducer - Complex State:**
```jsx
const initialState = { count: 0, history: [], error: null };

function reducer(state, action) {
    switch (action.type) {
        case 'increment':
            return {
                ...state,
                count: state.count + 1,
                history: [...state.history, 'increment']
            };
        case 'decrement':
            return {
                ...state,
                count: state.count - 1,
                history: [...state.history, 'decrement']
            };
        case 'reset':
            return initialState;
        default:
            throw new Error('Unknown action');
    }
}

const [state, dispatch] = useReducer(reducer, initialState);

// Dispatching actions
dispatch({ type: 'increment' });
dispatch({ type: 'decrement' });
```

**When to use useReducer:**
- ✅ Multiple related state variables
- ✅ Complex update logic
- ✅ Next state depends on previous
- ✅ Want to test logic separately

### Q4: How would you structure state for a large application?

**Answer:**

**Recommended Architecture:**

```jsx
// 1. Server State - React Query
import { useQuery, useMutation } from '@tanstack/react-query';

function Products() {
    const { data } = useQuery('products', fetchProducts);
    // React Query handles caching, refetching, etc.
}

// 2. Global UI State - Zustand
import create from 'zustand';

const useUIStore = create((set) => ({
    sidebarOpen: false,
    theme: 'light',
    modals: {},
    toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
    openModal: (id) => set(state => ({
        modals: { ...state.modals, [id]: true }
    }))
}));

// 3. Auth State - Context (infrequent changes)
const AuthContext = createContext();

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // ...
}

// 4. Form State - useState (local)
function CheckoutForm() {
    const [formData, setFormData] = useState({});
    // Local form state
}

// 5. URL State - React Router
function ProductPage() {
    const { category, sortBy } = useParams();
    const [searchParams] = useSearchParams();
    // URL as source of truth
}
```

**Benefits:**
- ✅ Each type of state handled optimally
- ✅ Clear separation of concerns
- ✅ Easy to reason about
- ✅ Performant

### Q5: What is state normalization and why is it important?

**Answer:**

**State Normalization** is structuring data in a flat, relational format instead of nested objects.

**Problem with Nested Data:**
```jsx
// ❌ Nested - hard to update
const state = {
    posts: [
        {
            id: 1,
            author: { id: 1, name: 'Alice' },
            comments: [
                { id: 1, author: { id: 2, name: 'Bob' }, text: 'Great!' },
                { id: 2, author: { id: 1, name: 'Alice' }, text: 'Thanks!' }
            ]
        }
    ]
};

// To update Alice's name, you need to update it in multiple places!
```

**Normalized Structure:**
```jsx
// ✅ Normalized - easy to update
const state = {
    users: {
        1: { id: 1, name: 'Alice' },
        2: { id: 2, name: 'Bob' }
    },
    posts: {
        1: { id: 1, authorId: 1, commentIds: [1, 2] }
    },
    comments: {
        1: { id: 1, authorId: 2, postId: 1, text: 'Great!' },
        2: { id: 2, authorId: 1, postId: 1, text: 'Thanks!' }
    }
};

// Update Alice's name once
function updateUserName(userId, name) {
    setState(state => ({
        ...state,
        users: {
            ...state.users,
            [userId]: { ...state.users[userId], name }
        }
    }));
}
```

**Benefits:**
- ✅ Single source of truth
- ✅ Easy updates
- ✅ No data duplication
- ✅ Prevents inconsistencies
- ✅ Easier to reason about

**Tools:** `normalizr` library, Redux Toolkit's `createEntityAdapter`

---

## External Resources

- [React Docs: Managing State](https://react.dev/learn/managing-state)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Jotai Documentation](https://jotai.org/)
- [State Management Comparison](https://2021.stateofjs.com/en-US/libraries/data-loading/)

---

[← Back to React](./README.md) | [Next: Performance Optimization →](./12-performance-optimization.md)
