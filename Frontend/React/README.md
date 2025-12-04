# React

Master React fundamentals and advanced concepts for modern frontend interviews. React is the most in-demand frontend library and is tested extensively in technical interviews at major companies.

## 📚 Topics Covered

### Core Concepts
1. **[Components & Props](./01-components-props.md)**
   - Functional vs class components
   - Props and PropTypes
   - Component composition

2. **[State & Lifecycle](./02-state-lifecycle.md)**
   - State management basics
   - Component lifecycle
   - Derived state

### Hooks
3. **[Hooks Basics](./03-hooks-basics.md)**
   - useState hook
   - useEffect hook
   - Rules of hooks

4. **[Advanced Hooks](./04-advanced-hooks.md)**
   - useContext
   - useReducer
   - useRef

5. **[Performance Hooks](./05-performance-hooks.md)**
   - useMemo
   - useCallback
   - React.memo

6. **[Custom Hooks](./06-custom-hooks.md)**
   - Creating reusable hooks
   - Hook patterns
   - Testing custom hooks

### State Management
7. **[Context API](./07-context-api.md)**
   - Creating context
   - Providers and consumers
   - When to use Context

8. **[State Management](./11-state-management.md)**
   - Redux fundamentals
   - Zustand
   - Recoil
   - Comparison and when to use each

### Routing & Forms
9. **[React Router](./08-react-router.md)**
   - Routing basics
   - Dynamic routes
   - Nested routes
   - Navigation

10. **[Forms & Validation](./09-forms-validation.md)**
    - Controlled components
    - Form handling
    - Validation strategies

### Advanced Topics
11. **[Error Boundaries](./10-error-boundaries.md)**
    - Error handling in React
    - Fallback UI
    - Error reporting

12. **[Performance Optimization](./12-performance-optimization.md)**
    - Code splitting
    - Lazy loading
    - React Profiler
    - Virtual DOM optimization

13. **[React 19 Features](./13-react-19-features.md)**
    - React Compiler (automatic optimization)
    - Actions and useActionState
    - useOptimistic hook
    - use() hook for async data
    - Built-in document metadata
    - Ref as props (no forwardRef)
    - Context provider shorthand

---

## 🎯 Interview Focus Areas

### Must Know
1. Component lifecycle and hooks
2. State management (useState, useReducer, Context)
3. useEffect and side effects
4. Props and component composition
5. Event handling

### Very Important
6. Performance optimization (useMemo, useCallback)
7. Custom hooks
8. React Router
9. Forms and controlled components
10. Error handling

### Good to Know
11. Redux or state management library
12. Code splitting and lazy loading
13. Server-side rendering basics
14. Testing React components
15. React 19 new features (Compiler, Actions, use hook)

---

## 💡 Quick Reference

### Common Interview Questions
1. "Explain the component lifecycle"
2. "What are hooks? Why use them?"
3. "Difference between useMemo and useCallback?"
4. "How does useEffect work?"
5. "When to use Context vs Redux?"
6. "What is prop drilling? How to avoid it?"
7. "How to optimize React performance?"
8. "Controlled vs uncontrolled components?"
9. "What's new in React 19?"
10. "How does the React Compiler work?"
11. "When to use useOptimistic vs regular state?"

### Essential Patterns
```javascript
// Custom Hook
function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        return localStorage.getItem(key) || initialValue;
    });

    useEffect(() => {
        localStorage.setItem(key, value);
    }, [key, value]);

    return [value, setValue];
}

// Context Provider Pattern
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('light');
    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Performance Optimization
const MemoizedComponent = React.memo(({ data }) => {
    const processedData = useMemo(() => {
        return expensiveOperation(data);
    }, [data]);

    const handleClick = useCallback(() => {
        console.log(processedData);
    }, [processedData]);

    return <div onClick={handleClick}>{processedData}</div>;
});
```

---

## 🔗 External Resources

- [React Official Docs](https://react.dev/)
- [React Hooks Documentation](https://react.dev/reference/react)
- [React Router](https://reactrouter.com/)
- [Redux](https://redux.js.org/)
- [React Testing Library](https://testing-library.com/react)

---

[← Back to Frontend](../README.md)
