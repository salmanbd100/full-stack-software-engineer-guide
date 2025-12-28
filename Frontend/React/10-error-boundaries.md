# Error Boundaries

Error boundaries catch JavaScript errors in component tree and display fallback UI.

## 📚 Core Concepts

### 1. Class Component Error Boundary

**Error Boundaries** are React's mechanism for gracefully handling JavaScript errors in component trees, preventing the entire application from crashing when a single component fails. They work like try/catch but for React component rendering, using two special lifecycle methods: getDerivedStateFromError (for rendering fallback UI) and componentDidCatch (for logging/reporting errors). Error boundaries must be class components - functional components can't implement this pattern yet. Place error boundaries strategically to isolate failures - wrapping individual features prevents one broken component from taking down the entire app, while showing users a helpful error message instead of a blank screen.

```jsx
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught:', error, errorInfo);
        // Log to error reporting service
        logErrorToService(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div>
                    <h2>Something went wrong</h2>
                    <details>
                        {this.state.error && this.state.error.toString()}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

// Usage
function App() {
    return (
        <ErrorBoundary>
            <MyComponent />
        </ErrorBoundary>
    );
}
```

### 2. Error Boundaries Don't Catch

- Event handlers (use try/catch)
- Asynchronous code
- Server-side rendering errors
- Errors in error boundary itself

### 3. Handling Async Errors

**Async Error Handling** requires a different approach because error boundaries only catch synchronous rendering errors - they don't catch errors in event handlers, setTimeout, promises, or async functions. For async operations like data fetching, you need traditional try/catch blocks combined with local error state. The pattern captures errors in the catch block, stores them in state, and conditionally renders error UI. This is why production apps combine error boundaries (for rendering errors) with try/catch blocks (for async errors) to create comprehensive error handling that covers all failure scenarios.

```jsx
function AsyncComponent() {
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData()
            .catch(err => setError(err));
    }, []);

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    return <div>Content</div>;
}
```

## 🎯 Common Interview Questions

### Q1: What are error boundaries?

**Answer:** React components that catch errors in their child component tree and display fallback UI.

### Q2: What errors don't they catch?

**Answer:** Event handlers, async code, SSR errors, errors in error boundary itself.

## 🎓 Best Practices

1. **Use multiple error boundaries** for different sections
2. **Log errors** to monitoring service
3. **Provide helpful error messages**
4. **Reset error state** when needed
5. **Handle async errors separately**

---

[← Back to React](./README.md)
