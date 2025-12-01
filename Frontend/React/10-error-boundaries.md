# Error Boundaries

Error boundaries catch JavaScript errors in component tree and display fallback UI.

## 📚 Core Concepts

### 1. Class Component Error Boundary

**getDerivedStateFromError, componentDidCatch** - Implements an error boundary using class component lifecycle methods. getDerivedStateFromError updates state to display fallback UI, while componentDidCatch logs error details for debugging or reporting.

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

**useState, useEffect** - Demonstrates error handling for asynchronous operations that error boundaries cannot catch. Uses local state to capture and display errors from async operations like API calls.

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
