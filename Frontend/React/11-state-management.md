# State Management

Managing state in complex React applications requires understanding various state management patterns and libraries.

## 📚 Core Concepts

### 1. Local State (useState)

**useState** - Basic local component state for a simple counter. Best for component-specific state that doesn't need to be shared with other components.

```jsx
function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### 2. Global State (Context + useReducer)

**createContext, useContext, useReducer** - Combines Context API with useReducer for global state management. The reducer centralizes state logic with actions, while Context distributes state across the component tree without prop drilling.

```jsx
const AppContext = createContext();

const initialState = {
    user: null,
    theme: 'light',
    notifications: []
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload };
        case 'TOGGLE_THEME':
            return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
        case 'ADD_NOTIFICATION':
            return { ...state, notifications: [...state.notifications, action.payload] };
        default:
            return state;
    }
}

function AppProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
}

function useAppState() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppState must be used within AppProvider');
    return context;
}
```

### 3. Redux Pattern

**useSelector, useDispatch** - Demonstrates Redux state management with selectors to read state and dispatch to trigger actions. Redux provides a predictable state container with a single source of truth for the entire application.

```jsx
// Store
import { createStore } from 'redux';

const initialState = { count: 0 };

function counterReducer(state = initialState, action) {
    switch (action.type) {
        case 'INCREMENT':
            return { count: state.count + 1 };
        case 'DECREMENT':
            return { count: state.count - 1 };
        default:
            return state;
    }
}

const store = createStore(counterReducer);

// Component
import { useSelector, useDispatch } from 'react-redux';

function Counter() {
    const count = useSelector(state => state.count);
    const dispatch = useDispatch();

    return (
        <div>
            <p>{count}</p>
            <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
        </div>
    );
}
```

### 4. Zustand (Lightweight Alternative)

**Zustand create** - Shows Zustand's simplified state management approach. Actions are defined directly in the store, and components can consume state without providers or boilerplate, making it more lightweight than Redux.

```jsx
import create from 'zustand';

const useStore = create((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 }))
}));

function Counter() {
    const { count, increment, decrement } = useStore();

    return (
        <div>
            <p>{count}</p>
            <button onClick={increment}>+</button>
            <button onClick={decrement}>-</button>
        </div>
    );
}
```

## 🎯 Common Interview Questions

### Q1: When to use global state?

**Answer:** Use global state when data is needed by many components at different levels. Otherwise, keep state local.

### Q2: Redux vs Context?

**Answer:**
- **Context**: Built-in, simpler, good for small-medium apps
- **Redux**: More features (middleware, dev tools, time travel), better for large apps

## 🎓 Best Practices

1. **Keep state local** when possible
2. **Use Context** for theme, auth, etc.
3. **Consider Redux** for complex state
4. **Normalize state shape**
5. **Use selectors** to derive data

---

[← Back to React](./README.md)
