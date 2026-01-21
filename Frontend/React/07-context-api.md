# Context API (React 18)

## Understanding React Context

### 💡 **Context API - Escape Prop Drilling**

Pass data through the component tree without manually threading props through every level.

**The Prop Drilling Problem:**

❌ **Without Context:**
```jsx
<App userData={user}>
  <Layout userData={user}>
    <Sidebar userData={user}>
      <Nav userData={user}>
        <UserMenu userData={user}>
          <Avatar user={user} /> // Finally uses it!
        </UserMenu>
      </Nav>
    </Sidebar>
  </Layout>
</App>
```

✅ **With Context:**
```jsx
<UserContext.Provider value={user}>
  <App>
    <Layout>
      <Sidebar>
        <Nav>
          <UserMenu>
            <Avatar /> // Direct access via useContext!
          </UserMenu>
        </Nav>
      </Sidebar>
    </Layout>
  </App>
</UserContext.Provider>
```

**Benefits:**

| Benefit | Impact |
|---------|--------|
| **No prop drilling** | Cleaner intermediate components |
| **Loose coupling** | Components don't know about passed-through data |
| **Easy refactoring** | Move components without prop chain updates |
| **Global access** | Any component can access the data |

> **Key Insight:** Context creates a "wormhole" through your component tree - data goes in at the top (Provider) and comes out wherever needed (useContext).

## Why Context API Matters

**Interview Perspective:**
- Asked in 80%+ of mid to senior React interviews
- Tests understanding of state management and prop drilling
- Demonstrates knowledge of performance optimization
- Essential for discussing architecture decisions
- Often compared to Redux, MobX, and other state libraries

**Real-World Importance:**
- **Eliminates Prop Drilling**: No more passing props through 5+ components
- **Global State Management**: Share data across unrelated components
- **Theming**: Consistent UI themes across entire app
- **Authentication**: User state accessible everywhere
- **Localization**: Language preferences throughout app

## Core Concepts Overview

### Context API Components

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `createContext()` | Creates context object | Once per context |
| `Context.Provider` | Supplies value to tree | Wrap components that need access |
| `useContext()` | Consumes context value | In components needing the data |
| Custom Hook | Encapsulates useContext | Best practice for cleaner API |

### Context vs Props

| Aspect | Props | Context |
|--------|-------|---------|
| **Data Flow** | Explicit (parent → child) | Implicit (provider → consumers) |
| **Coupling** | Tight (intermediate components know about it) | Loose (only provider and consumers know) |
| **Performance** | No re-render overhead | All consumers re-render on change |
| **Use Case** | Direct parent-child | Deep or cross-tree data |
| **Debugging** | Easy to trace | Can be harder to track |

## Key Principles

### ✅ Do:
- Use Context for truly global data (theme, auth, language)
- Create custom hooks for consuming context
- Memoize context values to prevent unnecessary re-renders
- Split large contexts into smaller, focused ones
- Provide default values for better developer experience

### ❌ Don't:
- Use Context for all state (leads to performance issues)
- Create new objects/functions in Provider value
- Put rapidly changing state in Context
- Forget to memoize expensive context values
- Use Context when props would be simpler

---

## Example 1: Basic Context Pattern

### 💡 **Context API Basics - Theme Example**

The fundamental pattern: Create context, provide value, consume with hook.

**The Three Steps:**

```
1. Create Context
   createContext(defaultValue)
        ↓
2. Provide Value
   <Context.Provider value={...}>
        ↓
3. Consume Value
   useContext(Context)
```

**Why Custom Hook Pattern:**

Instead of using `useContext(ThemeContext)` directly, create `useTheme()`:
- ✅ Cleaner API for consumers
- ✅ Runtime validation (throw error if used outside Provider)
- ✅ Single place to add logic
- ✅ Better TypeScript support

```jsx
import { createContext, useContext, useState } from 'react';

// Step 1: Create context with default value
const ThemeContext = createContext();

// Step 2: Create Provider component
function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const value = {
        theme,
        toggleTheme
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

// Step 3: Create custom hook for consuming context
function useTheme() {
    const context = useContext(ThemeContext);

    // Runtime validation
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }

    return context;
}

// Usage in components
function App() {
    return (
        <ThemeProvider>
            <Header />
            <Main />
            <Footer />
        </ThemeProvider>
    );
}

function Header() {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className={`header-${theme}`}>
            <h1>My App</h1>
            <button onClick={toggleTheme}>
                Switch to {theme === 'light' ? 'dark' : 'light'} mode
            </button>
        </header>
    );
}

function Main() {
    const { theme } = useTheme();

    return (
        <main className={`main-${theme}`}>
            <p>Current theme: {theme}</p>
        </main>
    );
}

function Footer() {
    const { theme } = useTheme();

    return (
        <footer className={`footer-${theme}`}>
            <p>Footer in {theme} mode</p>
        </footer>
    );
}
```

---

## Example 2: Authentication Context

### 💡 **Auth Context - Production Pattern**

Real-world authentication with loading states, persistence, and error handling.

**Features:**
- Initial authentication check (localStorage)
- Loading state (prevent flash of wrong UI)
- Login/logout functionality
- Protected route logic
- Automatic token management

**How It Works:**

```
App Loads
     ↓
Check localStorage for token
     ↓
Token exists? → Fetch user data
     ↓
Set loading = false
     ↓
Render authenticated or unauthenticated UI
```

```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');

            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    setUser(userData);
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem('auth_token');
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (credentials) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const { user, token } = await response.json();

            localStorage.setItem('auth_token', token);
            setUser(user);

            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setUser(null);
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user
    };

    // Show loading screen while checking auth
    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}

// Usage: Protected Route
function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    return children;
}

// Usage: Login Form
function LoginForm() {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const { login, error } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(credentials);

        if (result.success) {
            // Redirect to dashboard
            window.location.href = '/dashboard';
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}

            <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                placeholder="Email"
            />

            <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="Password"
            />

            <button type="submit">Login</button>
        </form>
    );
}

// Usage: User Profile
function UserProfile() {
    const { user, logout } = useAuth();

    return (
        <div>
            <h2>Welcome, {user.name}!</h2>
            <p>Email: {user.email}</p>
            <button onClick={logout}>Logout</button>
        </div>
    );
}

// Mock API for demonstration
const Navigate = ({ to }) => {
    window.location.href = to;
    return null;
};
```

---

## Example 3: Performance Optimization

### 💡 **Memoized Context Values - Prevent Re-renders**

Without memoization, every state update creates new object/function references, causing ALL consumers to re-render.

**The Problem:**

```javascript
// ❌ Bad: New object every render
function BadProvider({ children }) {
    const [todos, setTodos] = useState([]);

    // New object and functions on EVERY render!
    const value = {
        todos,
        addTodo: (text) => { /* ... */ },
        deleteTodo: (id) => { /* ... */ }
    };

    return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

**The Solution:**

```javascript
// ✅ Good: Stable references
function GoodProvider({ children }) {
    const [todos, setTodos] = useState([]);

    // Functions memoized - same reference across renders
    const addTodo = useCallback((text) => { /* ... */ }, []);
    const deleteTodo = useCallback((id) => { /* ... */ }, []);

    // Object memoized - only changes when todos change
    const value = useMemo(() => ({
        todos,
        addTodo,
        deleteTodo
    }), [todos, addTodo, deleteTodo]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

**Performance Comparison:**

| Scenario | Without Memoization | With Memoization |
|----------|-------------------|------------------|
| Parent re-renders | All consumers re-render | No re-renders |
| State changes | All consumers re-render | Only affected consumers |
| Functions change | All consumers re-render | No re-renders |

```jsx
import { createContext, useContext, useState, useMemo, useCallback, memo } from 'react';

const TodoContext = createContext();

export function TodoProvider({ children }) {
    const [todos, setTodos] = useState([]);
    const [filter, setFilter] = useState('all'); // Causes Provider to re-render

    // Memoize functions to prevent re-creation
    const addTodo = useCallback((text) => {
        setTodos(prev => [
            ...prev,
            {
                id: Date.now(),
                text,
                completed: false
            }
        ]);
    }, []); // No dependencies - stable forever

    const toggleTodo = useCallback((id) => {
        setTodos(prev => prev.map(todo =>
            todo.id === id
                ? { ...todo, completed: !todo.completed }
                : todo
        ));
    }, []); // Uses functional update - no dependencies needed

    const deleteTodo = useCallback((id) => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
    }, []);

    // Memoize the entire context value
    // Only creates new object when dependencies change
    const value = useMemo(() => ({
        todos,
        filter,
        addTodo,
        toggleTodo,
        deleteTodo,
        setFilter
    }), [todos, filter, addTodo, toggleTodo, deleteTodo]);

    return (
        <TodoContext.Provider value={value}>
            {children}
        </TodoContext.Provider>
    );
}

export function useTodos() {
    const context = useContext(TodoContext);

    if (!context) {
        throw new Error('useTodos must be used within TodoProvider');
    }

    return context;
}

// Memoized component - only re-renders when props change
const TodoItem = memo(function TodoItem({ todo, onToggle, onDelete }) {
    console.log('Rendering TodoItem:', todo.id);

    return (
        <li>
            <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
            />
            <span style={{
                textDecoration: todo.completed ? 'line-through' : 'none'
            }}>
                {todo.text}
            </span>
            <button onClick={() => onDelete(todo.id)}>Delete</button>
        </li>
    );
});

function TodoList() {
    const { todos, toggleTodo, deleteTodo } = useTodos();

    return (
        <ul>
            {todos.map(todo => (
                <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                />
            ))}
        </ul>
    );
}

function AddTodoForm() {
    const [text, setText] = useState('');
    const { addTodo } = useTodos();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            addTodo(text);
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add todo..."
            />
            <button type="submit">Add</button>
        </form>
    );
}

function FilterButtons() {
    const { filter, setFilter } = useTodos();

    return (
        <div>
            <button
                onClick={() => setFilter('all')}
                disabled={filter === 'all'}
            >
                All
            </button>
            <button
                onClick={() => setFilter('active')}
                disabled={filter === 'active'}
            >
                Active
            </button>
            <button
                onClick={() => setFilter('completed')}
                disabled={filter === 'completed'}
            >
                Completed
            </button>
        </div>
    );
}
```

---

## Example 4: Split Contexts

### 💡 **Context Splitting - Advanced Performance**

Separate data and actions into different contexts to minimize re-renders.

**The Strategy:**

```
Single Context Problem:
UserContext = { user, preferences, updateUser, updatePreferences }
    ↓
Change preferences → ALL consumers re-render

Split Context Solution:
UserDataContext = { user, preferences }
UserActionsContext = { updateUser, updatePreferences }
    ↓
Change preferences → Only data consumers re-render
Action-only consumers never re-render!
```

**When to Split:**
- ✅ Frequent state updates
- ✅ Many consumers
- ✅ Some components only need actions
- ✅ Clear separation of data vs behavior

```jsx
import { createContext, useContext, useState, useMemo } from 'react';

// Separate contexts for data and actions
const UserDataContext = createContext();
const UserActionsContext = createContext();

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [preferences, setPreferences] = useState({
        theme: 'light',
        language: 'en',
        notifications: true
    });

    // Data context value
    // Changes whenever user or preferences change
    const dataValue = useMemo(() => ({
        user,
        preferences
    }), [user, preferences]);

    // Actions context value
    // NEVER changes - completely stable!
    const actionsValue = useMemo(() => ({
        updateUser: (newUser) => setUser(newUser),
        updatePreferences: (updates) => setPreferences(prev => ({
            ...prev,
            ...updates
        })),
        logout: () => setUser(null)
    }), []); // Empty deps - stable forever

    return (
        <UserDataContext.Provider value={dataValue}>
            <UserActionsContext.Provider value={actionsValue}>
                {children}
            </UserActionsContext.Provider>
        </UserDataContext.Provider>
    );
}

// Hook for reading user data
// Components using this will re-render when data changes
export function useUserData() {
    const context = useContext(UserDataContext);

    if (!context) {
        throw new Error('useUserData must be used within UserProvider');
    }

    return context;
}

// Hook for user actions
// Components using ONLY this will NEVER re-render!
export function useUserActions() {
    const context = useContext(UserActionsContext);

    if (!context) {
        throw new Error('useUserActions must be used within UserProvider');
    }

    return context;
}

// Usage: Component that only reads data
// Re-renders when user/preferences change
function UserProfile() {
    const { user, preferences } = useUserData();
    console.log('UserProfile rendered'); // Logs when data changes

    if (!user) return <div>Not logged in</div>;

    return (
        <div>
            <h2>{user.name}</h2>
            <p>Theme: {preferences.theme}</p>
            <p>Language: {preferences.language}</p>
        </div>
    );
}

// Usage: Component that only uses actions
// NEVER re-renders (actions are stable)!
function LogoutButton() {
    const { logout } = useUserActions();
    console.log('LogoutButton rendered'); // Only logs on mount!

    return <button onClick={logout}>Logout</button>;
}

// Usage: Component that uses both
// Re-renders when data changes
function SettingsForm() {
    const { preferences } = useUserData();
    const { updatePreferences } = useUserActions();

    return (
        <div>
            <label>
                <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) => updatePreferences({
                        notifications: e.target.checked
                    })}
                />
                Enable Notifications
            </label>

            <select
                value={preferences.theme}
                onChange={(e) => updatePreferences({
                    theme: e.target.value
                })}
            >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </div>
    );
}
```

---

## Example 5: Context with Reducer

### 💡 **Context + useReducer - Complex State**

For complex state logic, combine Context with useReducer for predictable updates.

**Why useReducer + Context:**
- ✅ Centralized state logic
- ✅ Predictable state updates
- ✅ Easier testing
- ✅ Better for complex state
- ✅ Action-based updates

**Pattern:**

```
Component dispatches action
        ↓
Reducer processes action
        ↓
State updates
        ↓
Context notifies consumers
        ↓
Components re-render
```

```jsx
import { createContext, useContext, useReducer, useMemo } from 'react';

const CartContext = createContext();

// Action types
const ACTIONS = {
    ADD_ITEM: 'add_item',
    REMOVE_ITEM: 'remove_item',
    UPDATE_QUANTITY: 'update_quantity',
    CLEAR_CART: 'clear_cart',
    APPLY_COUPON: 'apply_coupon'
};

// Reducer function - pure, testable logic
function cartReducer(state, action) {
    switch (action.type) {
        case ACTIONS.ADD_ITEM: {
            const existingItem = state.items.find(
                item => item.id === action.payload.id
            );

            if (existingItem) {
                // Item exists, increment quantity
                return {
                    ...state,
                    items: state.items.map(item =>
                        item.id === action.payload.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    )
                };
            }

            // New item, add to cart
            return {
                ...state,
                items: [...state.items, { ...action.payload, quantity: 1 }]
            };
        }

        case ACTIONS.REMOVE_ITEM:
            return {
                ...state,
                items: state.items.filter(item => item.id !== action.payload)
            };

        case ACTIONS.UPDATE_QUANTITY:
            return {
                ...state,
                items: state.items.map(item =>
                    item.id === action.payload.id
                        ? { ...item, quantity: action.payload.quantity }
                        : item
                )
            };

        case ACTIONS.CLEAR_CART:
            return {
                ...state,
                items: [],
                coupon: null
            };

        case ACTIONS.APPLY_COUPON:
            return {
                ...state,
                coupon: action.payload
            };

        default:
            return state;
    }
}

// Initial state
const initialState = {
    items: [],
    coupon: null
};

export function CartProvider({ children }) {
    const [state, dispatch] = useReducer(cartReducer, initialState);

    // Derived values (computed from state)
    const derived = useMemo(() => {
        const subtotal = state.items.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
        );

        const discount = state.coupon
            ? subtotal * (state.coupon.percent / 100)
            : 0;

        const total = subtotal - discount;

        const totalItems = state.items.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        return {
            subtotal,
            discount,
            total,
            totalItems
        };
    }, [state.items, state.coupon]);

    // Memoize context value
    const value = useMemo(() => ({
        items: state.items,
        coupon: state.coupon,
        ...derived,
        dispatch
    }), [state.items, state.coupon, derived]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }

    return context;
}

// Custom hooks for specific actions
export function useCartActions() {
    const { dispatch } = useCart();

    return useMemo(() => ({
        addItem: (item) => dispatch({
            type: ACTIONS.ADD_ITEM,
            payload: item
        }),
        removeItem: (id) => dispatch({
            type: ACTIONS.REMOVE_ITEM,
            payload: id
        }),
        updateQuantity: (id, quantity) => dispatch({
            type: ACTIONS.UPDATE_QUANTITY,
            payload: { id, quantity }
        }),
        clearCart: () => dispatch({
            type: ACTIONS.CLEAR_CART
        }),
        applyCoupon: (coupon) => dispatch({
            type: ACTIONS.APPLY_COUPON,
            payload: coupon
        })
    }), [dispatch]);
}

// Usage: Product Card
function ProductCard({ product }) {
    const { addItem } = useCartActions();

    return (
        <div className="product-card">
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <button onClick={() => addItem(product)}>
                Add to Cart
            </button>
        </div>
    );
}

// Usage: Cart Summary
function CartSummary() {
    const { items, subtotal, discount, total, totalItems } = useCart();

    return (
        <div className="cart-summary">
            <h2>Cart ({totalItems} items)</h2>

            {items.map(item => (
                <CartItem key={item.id} item={item} />
            ))}

            <div className="totals">
                <p>Subtotal: ${subtotal.toFixed(2)}</p>
                {discount > 0 && (
                    <p>Discount: -${discount.toFixed(2)}</p>
                )}
                <p><strong>Total: ${total.toFixed(2)}</strong></p>
            </div>
        </div>
    );
}

function CartItem({ item }) {
    const { updateQuantity, removeItem } = useCartActions();

    return (
        <div className="cart-item">
            <h4>{item.name}</h4>
            <p>${item.price} × {item.quantity}</p>

            <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
            />

            <button onClick={() => removeItem(item.id)}>
                Remove
            </button>
        </div>
    );
}

// Usage: Coupon Form
function CouponForm() {
    const [code, setCode] = useState('');
    const { applyCoupon } = useCartActions();

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate coupon (API call in real app)
        if (code === 'SAVE10') {
            applyCoupon({ code, percent: 10 });
            alert('Coupon applied!');
        } else {
            alert('Invalid coupon');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Coupon code"
            />
            <button type="submit">Apply</button>
        </form>
    );
}
```

---

## Common Mistakes

### Mistake 1: Creating New Objects in Provider

**The Problem:** New object reference on every render causes all consumers to re-render.

```jsx
// ❌ Bad: New object every render
function BadProvider({ children }) {
    const [count, setCount] = useState(0);
    const [user, setUser] = useState(null);

    // This creates a NEW object on EVERY render!
    // Even if count and user haven't changed
    const value = {
        count,
        user,
        increment: () => setCount(c => c + 1)
    };

    return <Context.Provider value={value}>{children}</Context.Provider>;
}

// ✅ Good: Memoized value
function GoodProvider({ children }) {
    const [count, setCount] = useState(0);
    const [user, setUser] = useState(null);

    const increment = useCallback(() => setCount(c => c + 1), []);

    const value = useMemo(() => ({
        count,
        user,
        increment
    }), [count, user, increment]);

    return <Context.Provider value={value}>{children}</Context.Provider>;
}
```

**Impact:**

```
Without memoization:
- Parent state changes
- Provider re-renders
- New value object created
- All consumers re-render (even if they don't use changed values)

With memoization:
- Parent state changes
- Provider re-renders
- Same value object (if deps unchanged)
- Consumers skip re-render
```

### Mistake 2: Using Context for Everything

**The Problem:** Overusing Context leads to performance issues and complexity.

```jsx
// ❌ Bad: Everything in Context
const AppContext = createContext();

function AppProvider({ children }) {
    const [user, setUser] = useState(null);
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('en');
    const [notifications, setNotifications] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    // ... 20 more state variables

    // Massive context value
    const value = { /* everything */ };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ✅ Good: Multiple focused contexts
<AuthProvider>
    <ThemeProvider>
        <LanguageProvider>
            <CartProvider>
                <App />
            </CartProvider>
        </LanguageProvider>
    </ThemeProvider>
</AuthProvider>
```

**Guidelines:**

| State Type | Use Context? | Alternative |
|------------|--------------|-------------|
| Truly global (theme, auth) | ✅ Yes | - |
| Frequently changing | ❌ No | Component state |
| Used by 1-2 components | ❌ No | Props |
| Complex business logic | ⚠️ Maybe | State library (Redux, Zustand) |

### Mistake 3: Forgetting Cleanup

**The Problem:** Memory leaks from subscriptions in Context.

```jsx
// ❌ Bad: No cleanup
function BadWebSocketProvider({ children }) {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080');

        ws.onmessage = (event) => {
            setMessages(prev => [...prev, event.data]);
        };

        // Missing cleanup!
    }, []);

    return <Context.Provider value={messages}>{children}</Context.Provider>;
}

// ✅ Good: Proper cleanup
function GoodWebSocketProvider({ children }) {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080');

        ws.onmessage = (event) => {
            setMessages(prev => [...prev, event.data]);
        };

        // Cleanup on unmount
        return () => {
            ws.close();
        };
    }, []);

    return <Context.Provider value={messages}>{children}</Context.Provider>;
}
```

---

## Best Practices

### 1. Always Memoize Context Values

```jsx
// ✅ Memoize functions
const increment = useCallback(() => setCount(c => c + 1), []);
const decrement = useCallback(() => setCount(c => c - 1), []);

// ✅ Memoize the entire value object
const value = useMemo(() => ({
    count,
    increment,
    decrement
}), [count, increment, decrement]);
```

### 2. Create Custom Hooks for Context

```jsx
// ✅ Good: Custom hook with validation
function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }

    return context;
}

// ❌ Bad: Direct useContext everywhere
function Component() {
    const theme = useContext(ThemeContext); // No validation
}
```

### 3. Split Large Contexts

```jsx
// Instead of one large context:
const AppContext = { user, theme, language, cart, ... }

// Split into focused contexts:
<UserProvider>
    <ThemeProvider>
        <LanguageProvider>
            <CartProvider>
                <App />
            </CartProvider>
        </LanguageProvider>
    </ThemeProvider>
</UserProvider>
```

### 4. Provide Default Values

```jsx
// ✅ Good: Useful default value
const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => {
        console.warn('toggleTheme called outside ThemeProvider');
    }
});

// ❌ Bad: Undefined default
const ThemeContext = createContext();
```

---

## Interview Questions

### Q1: When should you use Context vs Props?

**Structured Answer:**

**Use Props When:**
- ✅ Data flows parent → child (direct relationship)
- ✅ Only 1-2 levels deep
- ✅ Relationship is explicit and important
- ✅ Component reusability matters

**Use Context When:**
- ✅ Data needed by many components at different levels
- ✅ Prop drilling through 3+ levels
- ✅ Truly global data (theme, auth, language)
- ✅ Cross-cutting concerns

**Example:**

```jsx
// Props: Direct parent-child
function UserCard({ user }) {
    return <UserAvatar user={user} />;
}

// Context: Deep or cross-tree
function App() {
    return (
        <ThemeProvider>
            <Header /> {/* Uses theme */}
            <Sidebar /> {/* Uses theme */}
            <Main /> {/* Uses theme */}
            <Footer /> {/* Uses theme */}
        </ThemeProvider>
    );
}
```

### Q2: How do you prevent unnecessary re-renders with Context?

**Structured Answer:**

**Techniques:**

1. **Memoize Context Value:**
   ```jsx
   const value = useMemo(() => ({ state, actions }), [state, actions]);
   ```

2. **Memoize Functions:**
   ```jsx
   const increment = useCallback(() => setState(s => s + 1), []);
   ```

3. **Split Contexts:**
   ```jsx
   // Separate data and actions
   <DataContext.Provider>
       <ActionsContext.Provider>
   ```

4. **Memo Components:**
   ```jsx
   const Child = memo(({ data }) => { /* ... */ });
   ```

**Comparison:**

| Technique | When to Use | Benefit |
|-----------|-------------|---------|
| Memoize value | Always | Prevents new object creation |
| Memoize functions | Always | Stable function references |
| Split contexts | Frequent updates | Only relevant consumers re-render |
| Memo components | Expensive children | Skip render if props unchanged |

### Q3: What's the difference between Context and Redux?

**Structured Answer:**

| Feature | Context API | Redux |
|---------|------------|-------|
| **Purpose** | Share state across tree | Centralized state management |
| **Boilerplate** | Minimal | More setup required |
| **Performance** | All consumers re-render | Optimized with selectors |
| **DevTools** | Limited | Excellent time-travel debugging |
| **Middleware** | None | Rich ecosystem (thunks, sagas) |
| **Learning Curve** | Easy | Steeper |
| **Best For** | Simple global state | Complex state logic |

**When to Use Each:**

```jsx
// Context: Simple theme switching
<ThemeProvider>
    <App />
</ThemeProvider>

// Redux: Complex e-commerce app
// - Product catalog
// - Shopping cart
// - User management
// - Order history
// - Complex business logic
```

### Q4: How do you test components that use Context?

**Structured Answer:**

**Strategy:**

1. **Wrap in Provider for tests**
2. **Provide test-specific values**
3. **Test Provider and Consumer separately**

**Example:**

```jsx
// Component using Context
function Counter() {
    const { count, increment } = useCounter();
    return <button onClick={increment}>{count}</button>;
}

// Test wrapper
function TestWrapper({ children, value }) {
    return (
        <CounterContext.Provider value={value}>
            {children}
        </CounterContext.Provider>
    );
}

// Test
test('increments count on click', () => {
    const mockIncrement = jest.fn();

    render(
        <TestWrapper value={{ count: 5, increment: mockIncrement }}>
            <Counter />
        </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockIncrement).toHaveBeenCalled();
});
```

### Q5: What are the limitations of Context API?

**Structured Answer:**

**Limitations:**

1. **Performance:**
   - All consumers re-render when value changes
   - No built-in selector mechanism
   - Can cause cascading re-renders

2. **Structure:**
   - Provider hell with many contexts
   - No standardized patterns for async logic
   - Limited middleware support

3. **Debugging:**
   - Harder to trace data flow than props
   - No time-travel debugging (unlike Redux)
   - Limited DevTools support

**Solutions:**

```jsx
// Problem: Provider hell
<Auth><Theme><Language><Cart><App /></Cart></Language></Theme></Auth>

// Solution: Combine providers
function Providers({ children }) {
    return (
        <Auth>
            <Theme>
                <Language>
                    <Cart>
                        {children}
                    </Cart>
                </Language>
            </Theme>
        </Auth>
    );
}

<Providers><App /></Providers>
```

**When to Move to Redux:**
- State logic becomes complex
- Need middleware (async, logging)
- Require time-travel debugging
- Performance issues with Context
- Team prefers Redux patterns

---

## External Resources

- [React Docs: Context](https://react.dev/reference/react/createContext)
- [React Docs: useContext](https://react.dev/reference/react/useContext)
- [React Docs: Passing Data Deeply](https://react.dev/learn/passing-data-deeply-with-context)
- [React 18: Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching)

---

[← Back to React](./README.md) | [Next: Advanced Patterns →](./08-advanced-patterns.md)
