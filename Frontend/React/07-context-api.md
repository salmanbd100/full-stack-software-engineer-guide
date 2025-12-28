# Context API (React 18)

The Context API provides a way to pass data through the component tree without having to pass props down manually at every level. **React 18** enhances Context with automatic batching for better performance.

## 📚 Core Concepts

### 1. Creating and Using Context

**Context API Pattern** - The fundamental pattern involves three steps: create a context with createContext(), wrap components with a Provider passing a value, and consume that value anywhere in the tree with useContext(). This eliminates prop drilling - passing data through many component layers. The custom hook pattern (useTheme) is a best practice that provides a cleaner API and enables runtime validation (throwing an error if used outside the Provider). This pattern is essential for truly global data like themes, authentication state, or language preferences that many disconnected components need to access.

```jsx
import { createContext, useContext, useState } from 'react';

// Create context
const ThemeContext = createContext();

// Provider component
function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Custom hook for using context
function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }

    return context;
}

// Usage
function App() {
    return (
        <ThemeProvider>
            <Header />
            <Main />
        </ThemeProvider>
    );
}

function Header() {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className={theme}>
            <button onClick={toggleTheme}>
                Toggle Theme
            </button>
        </header>
    );
}
```

### 2. Auth Context Example

**Authentication Context** demonstrates a production-ready pattern for managing global auth state. The useEffect on mount checks localStorage for existing tokens and attempts to restore the user session - essential for maintaining login across page refreshes. The loading state prevents rendering protected content before authentication status is determined, avoiding flashes of unauthorized UI. This pattern centralizes all auth logic (login, logout, token management) in one place, making it easier to secure the application and update auth behavior. Any component can access user state and auth functions without prop drilling through potentially dozens of intermediate components.

```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            fetchUser(token).then(setUser).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (credentials) => {
        const user = await api.login(credentials);
        setUser(user);
        localStorage.setItem('token', user.token);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
    };

    const value = {
        user,
        login,
        logout,
        isAuthenticated: !!user
    };

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

// Usage
function Profile() {
    const { user, logout } = useAuth();

    return (
        <div>
            <h2>Welcome, {user.name}</h2>
            <button onClick={logout}>Logout</button>
        </div>
    );
}

async function fetchUser(token) {
    // API implementation
    return { name: 'User', token };
}

const api = {
    login: async (credentials) => {
        // API implementation
        return { name: 'User', token: 'token123' };
    }
};
```

## ⚡ React 18: Performance Optimization with Context

### 3. Memoized Context Values (Prevent Unnecessary Re-renders)

**Performance Optimization** for context is critical because context consumers re-render whenever the context value changes, even if they don't use the changed part. Creating a new object or function on every render creates a new reference, triggering re-renders in all consumers. useCallback memoizes function references so they remain stable across renders, while useMemo memoizes the entire context value object. This optimization is especially important for contexts with many consumers or frequently updating providers - without it, every state update in the provider causes all consumers to re-render unnecessarily, potentially causing performance issues in large applications.

```jsx
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const TodoContext = createContext();

export function TodoProvider({ children }) {
    const [todos, setTodos] = useState([]);

    // Memoize functions to prevent re-renders
    const addTodo = useCallback((text) => {
        setTodos(prev => [...prev, { id: Date.now(), text, completed: false }]);
    }, []);

    const toggleTodo = useCallback((id) => {
        setTodos(prev => prev.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    }, []);

    const deleteTodo = useCallback((id) => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
    }, []);

    // Memoize the context value
    const value = useMemo(() => ({
        todos,
        addTodo,
        toggleTodo,
        deleteTodo
    }), [todos, addTodo, toggleTodo, deleteTodo]);

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

// Usage
function TodoList() {
    const { todos, toggleTodo } = useTodos();

    return (
        <ul>
            {todos.map(todo => (
                <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} />
            ))}
        </ul>
    );
}

function TodoItem({ todo, onToggle }) {
    return (
        <li>
            <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
            />
            {todo.text}
        </li>
    );
}
```

### 4. Split Contexts for Better Performance

**createContext, useContext, useState, useMemo** - Separates data and actions into different contexts to optimize re-renders. Components only subscribing to actions won't re-render when data changes, and vice versa. This is a powerful optimization technique for large applications.

```jsx
import { createContext, useContext, useState, useMemo } from 'react';

// Separate contexts for data and actions
const UserDataContext = createContext();
const UserActionsContext = createContext();

export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [preferences, setPreferences] = useState({});

    // Data context value (changes when user or preferences change)
    const dataValue = useMemo(() => ({
        user,
        preferences
    }), [user, preferences]);

    // Actions context value (stable - never changes)
    const actionsValue = useMemo(() => ({
        updateUser: (newUser) => setUser(newUser),
        updatePreferences: (newPrefs) => setPreferences(prev => ({
            ...prev,
            ...newPrefs
        }))
    }), []); // Empty deps - functions never change

    return (
        <UserDataContext.Provider value={dataValue}>
            <UserActionsContext.Provider value={actionsValue}>
                {children}
            </UserActionsContext.Provider>
        </UserDataContext.Provider>
    );
}

// Separate hooks for data and actions
export function useUserData() {
    const context = useContext(UserDataContext);
    if (!context) {
        throw new Error('useUserData must be used within UserProvider');
    }
    return context;
}

export function useUserActions() {
    const context = useContext(UserActionsContext);
    if (!context) {
        throw new Error('useUserActions must be used within UserProvider');
    }
    return context;
}

// Usage - Component only re-renders when user data changes
function UserProfile() {
    const { user } = useUserData();
    return <div>{user?.name}</div>;
}

// Usage - Component never re-renders (actions are stable)
function UserForm() {
    const { updateUser } = useUserActions();

    const handleSubmit = (e) => {
        e.preventDefault();
        updateUser({ name: 'New Name' });
    };

    return <form onSubmit={handleSubmit}>...</form>;
}
```

### 5. Context with Reducer (Complex State)

**createContext, useContext, useReducer, useMemo** - Combines Context API with useReducer for managing complex shopping cart state. The reducer pattern provides predictable state updates through actions, and memoization prevents unnecessary re-renders.

```jsx
import { createContext, useContext, useReducer, useMemo } from 'react';

const CartContext = createContext();

// Action types
const ACTIONS = {
    ADD_ITEM: 'add_item',
    REMOVE_ITEM: 'remove_item',
    UPDATE_QUANTITY: 'update_quantity',
    CLEAR_CART: 'clear_cart'
};

// Reducer
function cartReducer(state, action) {
    switch (action.type) {
        case ACTIONS.ADD_ITEM:
            const existing = state.items.find(item => item.id === action.payload.id);
            if (existing) {
                return {
                    ...state,
                    items: state.items.map(item =>
                        item.id === action.payload.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    )
                };
            }
            return {
                ...state,
                items: [...state.items, { ...action.payload, quantity: 1 }]
            };

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
            return { ...state, items: [] };

        default:
            return state;
    }
}

export function CartProvider({ children }) {
    const [state, dispatch] = useReducer(cartReducer, { items: [] });

    // Memoize the context value
    const value = useMemo(() => ({
        items: state.items,
        dispatch,
        totalItems: state.items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }), [state]);

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

// Custom hook for cart actions
export function useCartActions() {
    const { dispatch } = useCart();

    return useMemo(() => ({
        addItem: (item) => dispatch({ type: ACTIONS.ADD_ITEM, payload: item }),
        removeItem: (id) => dispatch({ type: ACTIONS.REMOVE_ITEM, payload: id }),
        updateQuantity: (id, quantity) =>
            dispatch({ type: ACTIONS.UPDATE_QUANTITY, payload: { id, quantity } }),
        clearCart: () => dispatch({ type: ACTIONS.CLEAR_CART })
    }), [dispatch]);
}

// Usage
function ProductCard({ product }) {
    const { addItem } = useCartActions();

    return (
        <div>
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <button onClick={() => addItem(product)}>Add to Cart</button>
        </div>
    );
}

function CartSummary() {
    const { items, totalItems, totalPrice } = useCart();

    return (
        <div>
            <h2>Cart ({totalItems} items)</h2>
            <p>Total: ${totalPrice.toFixed(2)}</p>
            {items.map(item => (
                <div key={item.id}>
                    {item.name} x {item.quantity}
                </div>
            ))}
        </div>
    );
}
```

## 🎯 Common Interview Questions

### Q1: When should you use Context?

**Answer:** Use Context for global data that many components need (theme, auth, language). Don't use it for local state.

### Q2: Context vs Props?

**Answer:**
- **Props**: Explicit, good for direct parent-child
- **Context**: Implicit, good for deeply nested components

## 🎓 Best Practices

1. **Create custom hooks** for consuming context - makes error handling easier
2. **Split contexts** by concern - separate data from actions for better performance
3. **Memoize context values** with `useMemo` to prevent unnecessary re-renders
4. **Memoize callback functions** with `useCallback` for stable references
5. **Provide default values** to make context more predictable
6. **Don't overuse** - sometimes props are better for direct parent-child communication
7. **Use TypeScript** for type-safe context values (when applicable)
8. **React 18**: Leverage automatic batching for multiple state updates

### Performance Tips:
- **Split large contexts** into smaller, focused ones
- **Use selectors** or split data/actions to prevent unnecessary renders
- **Combine with useReducer** for complex state logic
- **Memoize derived values** in context provider

---

[← Back to React](./README.md)
