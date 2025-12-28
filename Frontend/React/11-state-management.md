# State Management

Managing state in complex React applications requires understanding various state management patterns and libraries.

## 📚 Core Concepts

### 1. Local State (useState)

**Local Component State** is React's simplest state management - state that belongs to a single component and doesn't need sharing. This should always be your first choice when state is genuinely local. The principle of colocation suggests keeping state as close as possible to where it's used, reducing complexity and making components easier to understand and test. Only lift state up when multiple components truly need to share it. Overusing global state creates unnecessary coupling between components and makes applications harder to reason about. Start local, lift only when necessary.

```jsx
function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### 2. Global State (Context + useReducer)

**Context + useReducer** is React's built-in solution for medium-complexity global state management, providing a Redux-like pattern without external dependencies. useReducer centralizes state update logic in a pure reducer function, making state changes predictable and testable, while Context distributes that state across the component tree. This combination is perfect for application-level state like themes, authentication, user preferences, or shopping carts. The pattern scales well to medium-sized applications but can become cumbersome in very large apps with complex state interactions, at which point dedicated state management libraries like Redux or Zustand become attractive.

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

**Redux** is the industry-standard state management library for complex React applications, providing a single immutable state tree, time-travel debugging, middleware support, and excellent developer tools. The unidirectional data flow (actions → reducers → store → components) makes state changes predictable and traceable. Redux excels in large applications with complex state interactions, extensive async logic requiring middleware (Redux Thunk, Saga), or teams needing strict conventions. However, Redux's boilerplate can be overkill for simpler applications - modern Redux Toolkit significantly reduces verbosity while maintaining Redux's core benefits. Choose Redux when you need its specific features, not just because it's popular.

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

**Zustand** represents the modern trend toward simpler state management - all the benefits of global state without Redux's ceremony. There's no Provider wrapper, no reducers or action creators, just a store hook that components can call. State updates are straightforward function calls, yet Zustand maintains immutability and predictable updates. It's perfect for applications that need global state but don't require Redux's advanced features like time-travel debugging or middleware. Zustand's minimalism makes it ideal for teams that find Redux too complex or applications where lightweight state sharing is the primary need.

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
