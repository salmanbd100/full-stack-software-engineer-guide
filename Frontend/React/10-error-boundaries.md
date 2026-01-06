# Error Boundaries

## Understanding Error Boundaries in React

**Error Boundaries** are React's safety net for handling runtime errors gracefully - specialized components that catch JavaScript errors anywhere in their child component tree, log those errors, and display fallback UI instead of crashing the entire application.

**How They Work:**

Error boundaries act like a JavaScript try/catch block, but for React's declarative component tree. Instead of letting one broken component crash your entire app, they:

1. **Catch errors** during rendering, in lifecycle methods, and in constructors
2. **Display fallback UI** to keep the app partially functional
3. **Log error details** for debugging and monitoring
4. **Isolate failures** to specific app sections

## Why Error Boundaries Matter

**Interview Perspective:**
- Asked in 70%+ of React interviews for mid to senior positions
- Tests understanding of React's error handling model
- Demonstrates knowledge of production-ready patterns
- Shows awareness of user experience and resilience
- Critical for discussing application architecture and fault tolerance

**Real-World Importance:**
- **User Experience**: Shows friendly error messages instead of blank screens
- **Fault Isolation**: One broken component doesn't crash the entire app
- **Production Monitoring**: Integrates with error tracking services (Sentry, Bugsnag)
- **Graceful Degradation**: App remains partially functional despite errors
- **Developer Debugging**: Provides detailed error info in development

## Core Concepts Overview

### **Error Boundaries**
- Special React components that catch errors during rendering
- Must be class components (no functional equivalent yet)
- Use two lifecycle methods: `getDerivedStateFromError` and `componentDidCatch`
- Create isolation boundaries to contain failures

### **Error Catching Scope**
- ✅ Errors in rendering
- ✅ Lifecycle methods of child components
- ✅ Constructors of child components
- ❌ Event handlers (use try/catch)
- ❌ Asynchronous code (use try/catch)
- ❌ Server-side rendering
- ❌ Errors in the error boundary itself

### **Error Boundary Strategy**
- Place boundaries at different granularity levels
- Route-level boundaries for page isolation
- Component-level boundaries for critical features
- Combine with error reporting services

## Key Principles

| Principle | Description | Why It Matters |
|-----------|-------------|----------------|
| **Graceful Degradation** | App continues working despite errors | Better UX than complete crash |
| **Error Isolation** | Errors don't propagate to entire tree | Localized failures |
| **Informative Fallbacks** | Show helpful error messages | Users know what happened |
| **Error Reporting** | Log errors to monitoring services | Track and fix production issues |
| **Strategic Placement** | Boundaries at logical app sections | Balance granularity vs complexity |

### Modern Best Practices

✅ **Do:**
- Place error boundaries at route/page level
- Wrap critical features with dedicated boundaries
- Log errors to monitoring services (Sentry, LogRocket)
- Provide helpful, user-friendly error messages
- Include retry/reset functionality
- Test error boundaries thoroughly

❌ **Don't:**
- Wrap every single component (too granular)
- Catch errors in event handlers with boundaries
- Use for control flow (use if/else instead)
- Forget to handle async errors separately
- Display technical error details to users in production

---

## Example 1: Basic Error Boundary

### 💡 **Class-Based Error Boundary**

Error boundaries must be class components because they require lifecycle methods that don't yet have Hook equivalents.

**Two Key Lifecycle Methods:**

**1. `getDerivedStateFromError(error)`:**
- Static method called during the "render" phase
- Returns state object to update
- Used to render fallback UI
- Should be pure (no side effects)

**2. `componentDidCatch(error, errorInfo)`:**
- Called during the "commit" phase
- Used for logging errors
- Can have side effects
- Receives error details and component stack

**How It Works:**

```
Child Component Throws Error
         ↓
getDerivedStateFromError() → Update State → Render Fallback
         ↓
componentDidCatch() → Log Error → Report to Service
```

**Error Boundary Lifecycle:**

| Phase | Method | Purpose | Side Effects Allowed |
|-------|--------|---------|---------------------|
| **Render** | `getDerivedStateFromError` | Update state for fallback UI | ❌ No |
| **Commit** | `componentDidCatch` | Log and report errors | ✅ Yes |

```jsx
import React, { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    // Update state to render fallback UI
    static getDerivedStateFromError(error) {
        // This runs during render phase
        return { hasError: true };
    }

    // Log error details
    componentDidCatch(error, errorInfo) {
        // This runs during commit phase
        console.error('Error caught by boundary:', error, errorInfo);

        // Log to error reporting service
        this.logErrorToService(error, errorInfo);

        // Update state with error details (optional, for dev mode)
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    logErrorToService(error, errorInfo) {
        // Example: Send to Sentry
        // Sentry.captureException(error, { extra: errorInfo });

        // Example: Send to custom API
        // fetch('/api/log-error', {
        //     method: 'POST',
        //     body: JSON.stringify({ error: error.toString(), errorInfo })
        // });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="error-boundary">
                    <h2>Something went wrong</h2>
                    <p>We're sorry for the inconvenience. Please try refreshing the page.</p>

                    {/* Show details in development */}
                    {process.env.NODE_ENV === 'development' && (
                        <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                            <summary>Error Details (Dev Only)</summary>
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                    )}
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
            <AnotherComponent />
        </ErrorBoundary>
    );
}

// Component that might throw an error
function MyComponent() {
    const [count, setCount] = React.useState(0);

    if (count > 5) {
        throw new Error('Count exceeded maximum!');
    }

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
```

**Real-world Use Case:**
Every production React app should have at least one root-level error boundary to prevent complete crashes.

---

## Example 2: Multiple Error Boundaries for Isolation

### 💡 **Strategic Error Boundary Placement**

Using multiple error boundaries at different levels isolates failures to specific app sections.

**Granularity Levels:**

**1. App-Level Boundary (Coarse):**
- Wraps entire application
- Last line of defense
- Catches any uncaught errors

**2. Route-Level Boundary (Medium):**
- Wraps each route/page
- Other routes remain functional
- Common in React Router apps

**3. Feature-Level Boundary (Fine):**
- Wraps critical features
- Rest of page stays functional
- Best user experience

**Trade-offs:**

| Level | Isolation | Complexity | UX Impact |
|-------|-----------|------------|-----------|
| **App-Level** | ❌ Low | ✅ Simple | 🔴 Whole app down |
| **Route-Level** | ⚠️ Medium | ✅ Moderate | ⚠️ Page down |
| **Feature-Level** | ✅ High | ⚠️ More code | ✅ Minimal |

```jsx
// App-level error boundary (top level)
function App() {
    return (
        <ErrorBoundary fallback={<AppCrashScreen />}>
            <Router>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Routes>
            </Router>
        </ErrorBoundary>
    );
}

// Route-level error boundaries
function DashboardPage() {
    return (
        <ErrorBoundary fallback={<PageErrorFallback pageName="Dashboard" />}>
            <Dashboard />
        </ErrorBoundary>
    );
}

// Feature-level error boundaries
function Dashboard() {
    return (
        <div className="dashboard">
            <h1>Dashboard</h1>

            {/* If UserStats crashes, other widgets still work */}
            <ErrorBoundary fallback={<WidgetError widgetName="User Stats" />}>
                <UserStats />
            </ErrorBoundary>

            <ErrorBoundary fallback={<WidgetError widgetName="Revenue Chart" />}>
                <RevenueChart />
            </ErrorBoundary>

            <ErrorBoundary fallback={<WidgetError widgetName="Recent Activity" />}>
                <RecentActivity />
            </ErrorBoundary>
        </div>
    );
}

// Reusable fallback components
function AppCrashScreen() {
    return (
        <div className="app-crash">
            <h1>Application Error</h1>
            <p>Something went wrong. Please refresh the page.</p>
            <button onClick={() => window.location.reload()}>
                Refresh Page
            </button>
        </div>
    );
}

function PageErrorFallback({ pageName }) {
    const navigate = useNavigate();

    return (
        <div className="page-error">
            <h2>{pageName} Unavailable</h2>
            <p>We couldn't load this page. Please try again.</p>
            <button onClick={() => navigate('/')}>Go Home</button>
            <button onClick={() => window.location.reload()}>Retry</button>
        </div>
    );
}

function WidgetError({ widgetName }) {
    return (
        <div className="widget-error">
            <p>⚠️ {widgetName} failed to load</p>
        </div>
    );
}
```

**Benefits of Multiple Boundaries:**

✅ **Better Isolation** - One broken widget doesn't break the page
✅ **Better UX** - Users can still use working features
✅ **Easier Debugging** - Errors scoped to specific components
✅ **Flexible Recovery** - Different recovery strategies per level

---

## Example 3: Error Boundary with Reset Capability

### 💡 **Resettable Error Boundaries**

Allow users to recover from errors without full page refresh.

**Why Reset Matters:**

❌ **Without Reset:**
- User stuck on error screen
- Must refresh entire page
- Loses application state

✅ **With Reset:**
- User can retry the action
- No page refresh needed
- Better user experience

**Reset Strategies:**

| Strategy | When to Use | Implementation |
|----------|-------------|----------------|
| **Manual Reset** | User clicks "Try Again" | Button calls reset method |
| **Automatic Reset** | Transient errors | Reset after timeout |
| **Key-Based Reset** | Props change | Use `key` prop to remount |

```jsx
class ResettableErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error:', error, errorInfo);
    }

    // Reset error state
    resetErrorBoundary = () => {
        this.setState({
            hasError: false,
            error: null
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-container">
                    <h2>Oops! Something went wrong</h2>
                    <p>{this.state.error?.message}</p>

                    {/* Allow user to retry */}
                    <button onClick={this.resetErrorBoundary}>
                        Try Again
                    </button>

                    {/* Alternative: Go back */}
                    <button onClick={() => window.history.back()}>
                        Go Back
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Usage with reset callback
function DataDisplay() {
    const [resetKey, setResetKey] = React.useState(0);

    return (
        <ResettableErrorBoundary key={resetKey}>
            <FlakyComponent />
            <button onClick={() => setResetKey(k => k + 1)}>
                Reset Component
            </button>
        </ResettableErrorBoundary>
    );
}

// Using react-error-boundary library (recommended)
import { ErrorBoundary } from 'react-error-boundary';

function FallbackComponent({ error, resetErrorBoundary }) {
    return (
        <div role="alert">
            <h2>Something went wrong</h2>
            <pre style={{ color: 'red' }}>{error.message}</pre>
            <button onClick={resetErrorBoundary}>Try again</button>
        </div>
    );
}

function App() {
    const handleError = (error, errorInfo) => {
        // Log to error reporting service
        console.error('Logged error:', error, errorInfo);
    };

    return (
        <ErrorBoundary
            FallbackComponent={FallbackComponent}
            onError={handleError}
            onReset={() => {
                // Reset app state if needed
                console.log('Error boundary reset');
            }}
        >
            <MyComponent />
        </ErrorBoundary>
    );
}
```

**Library Recommendation:**

🌟 **react-error-boundary** - Production-ready error boundary library:
- Reset functionality built-in
- Declarative API
- TypeScript support
- Battle-tested in production

---

## Example 4: Handling Async Errors

### 💡 **Async Error Handling Pattern**

Error boundaries DON'T catch async errors - you need try/catch for those.

**What Error Boundaries Don't Catch:**

| Error Source | Caught by Boundary? | Solution |
|-------------|-------------------|----------|
| **Rendering errors** | ✅ Yes | Error boundary |
| **Lifecycle methods** | ✅ Yes | Error boundary |
| **Event handlers** | ❌ No | try/catch |
| **Async code (setTimeout)** | ❌ No | try/catch |
| **Promises (.then/.catch)** | ❌ No | .catch() or try/catch |
| **async/await** | ❌ No | try/catch |

**Why Async Errors Aren't Caught:**

Error boundaries catch errors during React's render phase. Async errors happen outside this phase, in callbacks that execute later.

**Complete Error Handling Strategy:**

✅ **Error Boundaries** → Rendering errors
✅ **try/catch** → Async errors, event handlers
✅ **Combination** → Comprehensive coverage

```jsx
// Async errors are NOT caught by error boundaries
function AsyncComponent() {
    const [data, setData] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    // Pattern 1: Promise with .catch()
    const fetchDataPromise = () => {
        setLoading(true);
        setError(null);

        fetch('https://api.example.com/data')
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    // Pattern 2: async/await with try/catch
    const fetchDataAsync = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('https://api.example.com/data');

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            setData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Pattern 3: Event handler errors
    const handleClick = () => {
        try {
            // Code that might throw
            riskyOperation();
        } catch (err) {
            setError(err.message);
        }
    };

    // Render error state
    if (error) {
        return (
            <div className="error">
                <p>Error: {error}</p>
                <button onClick={() => setError(null)}>Dismiss</button>
            </div>
        );
    }

    if (loading) return <div>Loading...</div>;
    if (!data) return <button onClick={fetchDataAsync}>Load Data</button>;

    return <div>{JSON.stringify(data)}</div>;
}

// Combining error boundary with async error handling
function CompleteErrorHandling() {
    return (
        <ErrorBoundary fallback={<div>Rendering Error!</div>}>
            <AsyncComponent /> {/* Handles its own async errors */}
        </ErrorBoundary>
    );
}

// Custom hook for async error handling
function useAsyncError() {
    const [, setError] = React.useState();

    return React.useCallback(
        (error) => {
            setError(() => {
                throw error; // This triggers error boundary!
            });
        },
        [setError]
    );
}

// Usage
function AsyncComponentWithBoundary() {
    const [data, setData] = React.useState(null);
    const throwError = useAsyncError();

    React.useEffect(() => {
        fetch('/api/data')
            .then(res => res.json())
            .then(setData)
            .catch(throwError); // Async error will trigger boundary
    }, [throwError]);

    return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>;
}
```

**Best Practice Pattern:**

```jsx
// Complete error handling
function DataFetcher() {
    const [state, setState] = React.useState({
        data: null,
        loading: false,
        error: null
    });

    const fetchData = async () => {
        setState({ data: null, loading: true, error: null });

        try {
            const response = await fetch('/api/data');
            if (!response.ok) throw new Error('Network error');

            const data = await response.json();
            setState({ data, loading: false, error: null });
        } catch (error) {
            setState({ data: null, loading: false, error: error.message });
        }
    };

    return (
        <ErrorBoundary fallback={<div>Component Error</div>}>
            {state.error ? (
                <div>Fetch Error: {state.error}</div>
            ) : state.loading ? (
                <div>Loading...</div>
            ) : (
                <div>{state.data ? 'Loaded!' : <button onClick={fetchData}>Load</button>}</div>
            )}
        </ErrorBoundary>
    );
}
```

---

## Common Mistakes

### ❌ Mistake 1: Using Error Boundaries for Event Handlers

**Problem:**
Error boundaries don't catch errors in event handlers.

```jsx
// ❌ WRONG - Error boundary won't catch this
function BadButton() {
    const handleClick = () => {
        throw new Error('Button error!'); // NOT CAUGHT
    };

    return <button onClick={handleClick}>Click</button>;
}

// ✅ CORRECT - Use try/catch
function GoodButton() {
    const [error, setError] = React.useState(null);

    const handleClick = () => {
        try {
            riskyOperation();
        } catch (err) {
            setError(err.message);
        }
    };

    if (error) return <div>Error: {error}</div>;

    return <button onClick={handleClick}>Click</button>;
}
```

### ❌ Mistake 2: Not Providing Recovery Options

**Problem:**
Users are stuck on error screen with no way to recover.

```jsx
// ❌ BAD - No recovery option
function BadFallback({ error }) {
    return <div>Error: {error.message}</div>;
}

// ✅ GOOD - Multiple recovery options
function GoodFallback({ error, resetErrorBoundary }) {
    const navigate = useNavigate();

    return (
        <div>
            <h2>Something went wrong</h2>
            <p>{error.message}</p>

            <button onClick={resetErrorBoundary}>Try Again</button>
            <button onClick={() => navigate('/')}>Go Home</button>
            <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
    );
}
```

### ❌ Mistake 3: Exposing Error Details in Production

**Problem:**
Showing technical error details to end users is bad UX and a security risk.

```jsx
// ❌ BAD - Exposing stack traces in production
class BadErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div>
                    <pre>{this.state.error.stack}</pre> {/* Security risk! */}
                </div>
            );
        }
        return this.props.children;
    }
}

// ✅ GOOD - User-friendly messages, log details
class GoodErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, errorInfo) {
        // Log to service
        logErrorToMonitoring(error, errorInfo);
    }

    render() {
        if (this.state.error) {
            return (
                <div>
                    <h2>We're experiencing technical difficulties</h2>
                    <p>Our team has been notified. Please try again later.</p>

                    {/* Only in development */}
                    {process.env.NODE_ENV === 'development' && (
                        <details>
                            <summary>Error Details (Dev Only)</summary>
                            <pre>{this.state.error.stack}</pre>
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
```

---

## Best Practices

### 1. Use Multiple Granular Error Boundaries

**Strategic Placement** - Place error boundaries at different levels for maximum fault isolation.

```jsx
// ✅ Multi-level strategy
function App() {
    return (
        // App-level: Last resort
        <ErrorBoundary fallback={<AppCrash />}>
            <Router>
                {/* Route-level: Isolate pages */}
                <ErrorBoundary fallback={<PageError />}>
                    <Routes>
                        <Route path="/" element={
                            // Feature-level: Isolate widgets
                            <>
                                <ErrorBoundary fallback={<WidgetError />}>
                                    <Header />
                                </ErrorBoundary>
                                <ErrorBoundary fallback={<WidgetError />}>
                                    <Content />
                                </ErrorBoundary>
                            </>
                        } />
                    </Routes>
                </ErrorBoundary>
            </Router>
        </ErrorBoundary>
    );
}
```

### 2. Always Log Errors to Monitoring Service

**Error Tracking** - Integrate with services like Sentry, LogRocket, or Bugsnag.

```jsx
import * as Sentry from '@sentry/react';

class MonitoredErrorBoundary extends Component {
    componentDidCatch(error, errorInfo) {
        // Log to Sentry
        Sentry.captureException(error, {
            extra: errorInfo,
            tags: {
                component: this.props.componentName,
                severity: 'high'
            }
        });

        // Also log locally
        console.error('Error caught:', error, errorInfo);
    }

    // ... rest of error boundary
}

// Or use Sentry's built-in error boundary
import { ErrorBoundary } from '@sentry/react';

function App() {
    return (
        <ErrorBoundary
            fallback={({ error, resetError }) => (
                <div>
                    <p>An error occurred: {error.message}</p>
                    <button onClick={resetError}>Try again</button>
                </div>
            )}
            onError={(error, errorInfo) => {
                console.log('Error logged to Sentry');
            }}
        >
            <YourApp />
        </ErrorBoundary>
    );
}
```

### 3. Provide User-Friendly Error Messages

**Clear Communication** - Show helpful, actionable messages instead of technical details.

```jsx
// ✅ Good error messages
const errorMessages = {
    network: {
        title: 'Connection Problem',
        message: 'Please check your internet connection and try again.',
        actions: ['Retry', 'Go Offline']
    },
    auth: {
        title: 'Session Expired',
        message: 'Please log in again to continue.',
        actions: ['Log In']
    },
    notFound: {
        title: 'Page Not Found',
        message: 'The page you're looking for doesn't exist.',
        actions: ['Go Home', 'Go Back']
    },
    default: {
        title: 'Something Went Wrong',
        message: 'We're working on fixing this. Please try again.',
        actions: ['Retry', 'Go Home']
    }
};

function SmartErrorFallback({ error, resetErrorBoundary }) {
    const errorType = classifyError(error);
    const config = errorMessages[errorType] || errorMessages.default;

    return (
        <div className="error-fallback">
            <h2>{config.title}</h2>
            <p>{config.message}</p>
            <div className="actions">
                {config.actions.map(action => (
                    <button key={action} onClick={() => handleAction(action, resetErrorBoundary)}>
                        {action}
                    </button>
                ))}
            </div>
        </div>
    );
}
```

### 4. Test Error Boundaries

**Testing Strategy** - Ensure error boundaries work as expected.

```jsx
// Test component
import { render, screen } from '@testing-library/react';

describe('ErrorBoundary', () => {
    // Suppress console.error in tests
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    test('catches errors and displays fallback', () => {
        const ThrowError = () => {
            throw new Error('Test error');
        };

        render(
            <ErrorBoundary fallback={<div>Error occurred</div>}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Error occurred')).toBeInTheDocument();
    });

    test('calls error handler', () => {
        const onError = jest.fn();
        const ThrowError = () => {
            throw new Error('Test error');
        };

        render(
            <ErrorBoundary onError={onError}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(onError).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({ componentStack: expect.any(String) })
        );
    });
});

// Manual testing in development
function TestErrorBoundary() {
    const [shouldThrow, setShouldThrow] = React.useState(false);

    if (shouldThrow) {
        throw new Error('Test error boundary!');
    }

    return (
        <div>
            <button onClick={() => setShouldThrow(true)}>
                Trigger Error
            </button>
        </div>
    );
}
```

---

## Real-world Scenarios

### Scenario 1: E-commerce Product Page

**Isolated Widget Failures** - Product page with multiple independent sections that can fail independently.

```jsx
function ProductPage({ productId }) {
    return (
        <div className="product-page">
            {/* Main product info - critical */}
            <ErrorBoundary
                fallback={<ProductUnavailable productId={productId} />}
                onError={(error) => logError('product-info', error)}
            >
                <ProductInfo productId={productId} />
            </ErrorBoundary>

            {/* Reviews - non-critical */}
            <ErrorBoundary
                fallback={<div>Reviews temporarily unavailable</div>}
                onError={(error) => logError('reviews', error)}
            >
                <ProductReviews productId={productId} />
            </ErrorBoundary>

            {/* Recommendations - non-critical */}
            <ErrorBoundary
                fallback={null} // Silently fail
                onError={(error) => logError('recommendations', error)}
            >
                <RecommendedProducts productId={productId} />
            </ErrorBoundary>
        </div>
    );
}

function ProductUnavailable({ productId }) {
    const navigate = useNavigate();

    return (
        <div className="product-unavailable">
            <h2>Product Unavailable</h2>
            <p>We couldn't load this product. It may have been removed.</p>
            <button onClick={() => navigate('/products')}>
                Browse All Products
            </button>
            <button onClick={() => window.location.reload()}>
                Try Again
            </button>
        </div>
    );
}
```

**Benefits:**
- ✅ If reviews fail, product info still shows
- ✅ If recommendations fail, page is still usable
- ✅ Different fallback strategies per criticality

### Scenario 2: Social Media Feed

**Infinite Scroll with Error Recovery** - Handle errors in paginated content gracefully.

```jsx
function SocialFeed() {
    const [page, setPage] = React.useState(1);
    const [resetKey, setResetKey] = React.useState(0);

    return (
        <div className="feed">
            <h1>Your Feed</h1>

            <ErrorBoundary
                key={resetKey} // Reset on key change
                fallback={({ error, resetErrorBoundary }) => (
                    <div className="feed-error">
                        <p>Couldn't load your feed</p>
                        <button onClick={() => {
                            resetErrorBoundary();
                            setResetKey(k => k + 1);
                        }}>
                            Refresh Feed
                        </button>
                    </div>
                )}
            >
                <FeedContent page={page} />
                <button onClick={() => setPage(p => p + 1)}>
                    Load More
                </button>
            </ErrorBoundary>
        </div>
    );
}
```

### Scenario 3: Dashboard with Multiple Data Sources

**Partial Failure Handling** - Allow dashboard to remain functional even if some widgets fail.

```jsx
function Dashboard() {
    const widgets = [
        { id: 'sales', Component: SalesWidget, title: 'Sales' },
        { id: 'traffic', Component: TrafficWidget, title: 'Traffic' },
        { id: 'users', Component: UsersWidget, title: 'Users' },
        { id: 'revenue', Component: RevenueWidget, title: 'Revenue' }
    ];

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>

            <div className="widgets-grid">
                {widgets.map(({ id, Component, title }) => (
                    <ErrorBoundary
                        key={id}
                        fallback={
                            <div className="widget-error">
                                <h3>{title}</h3>
                                <p>Failed to load</p>
                                <button onClick={() => window.location.reload()}>
                                    Retry
                                </button>
                            </div>
                        }
                        onError={(error) => {
                            // Log which widget failed
                            console.error(`Widget ${id} failed:`, error);
                            analytics.track('widget_error', { widget: id, error: error.message });
                        }}
                    >
                        <Component />
                    </ErrorBoundary>
                ))}
            </div>
        </div>
    );
}
```

---

## Interview Questions

### Q1: What are error boundaries and how do they work?

**Answer:**

Error boundaries are React components that catch JavaScript errors in their child component tree, log those errors, and display fallback UI instead of crashing the entire component tree.

**How they work:**
1. Must be class components (no Hook equivalent yet)
2. Use `getDerivedStateFromError(error)` to update state and render fallback UI
3. Use `componentDidCatch(error, errorInfo)` to log errors
4. Wrap sections of component tree to create error isolation

**Example:**
```jsx
class ErrorBoundary extends Component {
    state = { hasError: false };

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        logToService(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <h1>Something went wrong</h1>;
        }
        return this.props.children;
    }
}
```

### Q2: What errors do error boundaries NOT catch?

**Answer:**

Error boundaries **DO NOT** catch:

1. **Event handlers** - Errors in onClick, onChange, etc. (use try/catch)
2. **Asynchronous code** - setTimeout, promises, async/await (use try/catch)
3. **Server-side rendering** - Errors during SSR
4. **Errors in error boundary itself** - Would cause infinite loop

**Why:** Error boundaries only catch errors during the render phase. Event handlers and async code execute outside the render phase.

**Solution:** Combine error boundaries with traditional try/catch:

```jsx
function MyComponent() {
    const [error, setError] = useState(null);

    const handleClick = async () => {
        try {
            await riskyAsyncOperation();
        } catch (err) {
            setError(err.message);
        }
    };

    if (error) return <div>Error: {error}</div>;

    return <button onClick={handleClick}>Click</button>;
}
```

### Q3: How would you implement error boundary reset functionality?

**Answer:**

**Approach 1: Manual Reset Method**
```jsx
class ErrorBoundary extends Component {
    state = { hasError: false };

    resetError = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div>
                    <h1>Error!</h1>
                    <button onClick={this.resetError}>Try Again</button>
                </div>
            );
        }
        return this.props.children;
    }
}
```

**Approach 2: Key-Based Reset**
```jsx
function Parent() {
    const [resetKey, setResetKey] = useState(0);

    return (
        <ErrorBoundary key={resetKey}>
            <Child />
            <button onClick={() => setResetKey(k => k + 1)}>Reset</button>
        </ErrorBoundary>
    );
}
```

**Approach 3: Use react-error-boundary Library**
```jsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
    FallbackComponent={({ resetErrorBoundary }) => (
        <button onClick={resetErrorBoundary}>Try Again</button>
    )}
    onReset={() => console.log('Reset!')}
>
    <MyComponent />
</ErrorBoundary>
```

### Q4: Where should you place error boundaries in your app?

**Answer:**

Use a **multi-level strategy** for best fault isolation:

**1. App-Level (Required):**
```jsx
<ErrorBoundary fallback={<AppCrashScreen />}>
    <App />
</ErrorBoundary>
```
- Catches any uncaught errors
- Last line of defense
- Prevents white screen of death

**2. Route-Level (Recommended):**
```jsx
<Route path="/dashboard" element={
    <ErrorBoundary fallback={<PageError />}>
        <Dashboard />
    </ErrorBoundary>
} />
```
- Isolates failures to specific pages
- Other routes remain functional

**3. Feature-Level (Optional but Best UX):**
```jsx
<ErrorBoundary fallback={<WidgetError />}>
    <ExpensiveWidget />
</ErrorBoundary>
```
- Isolates individual features/widgets
- Best user experience
- Rest of page stays functional

**Don't overdo it:** Wrapping every component is excessive. Focus on logical boundaries.

### Q5: How do you integrate error boundaries with error monitoring services?

**Answer:**

Use `componentDidCatch` to send errors to monitoring services like Sentry, LogRocket, or Bugsnag.

**Manual Integration:**
```jsx
import * as Sentry from '@sentry/react';

class ErrorBoundary extends Component {
    componentDidCatch(error, errorInfo) {
        // Send to Sentry
        Sentry.captureException(error, {
            extra: errorInfo,
            tags: {
                component: this.props.componentName,
                userId: this.props.userId
            },
            level: 'error'
        });

        // Also log locally
        console.error('Error:', error, errorInfo);
    }

    // ... rest of implementation
}
```

**Using Sentry's Built-in Error Boundary:**
```jsx
import * as Sentry from '@sentry/react';

Sentry.init({
    dsn: 'your-dsn',
    environment: 'production'
});

function App() {
    return (
        <Sentry.ErrorBoundary
            fallback={({ error, resetError }) => (
                <div>
                    <p>Error: {error.message}</p>
                    <button onClick={resetError}>Try again</button>
                </div>
            )}
            showDialog // Shows user feedback dialog
        >
            <YourApp />
        </Sentry.ErrorBoundary>
    );
}
```

**Benefits:**
- ✅ Automatic error tracking
- ✅ Stack traces and context
- ✅ User impact metrics
- ✅ Email/Slack notifications
- ✅ Source maps for debugging

---

## External Resources

- [React Docs: Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [react-error-boundary Library](https://github.com/bvaughn/react-error-boundary)
- [Sentry React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Error Handling in React](https://react.dev/learn/error-boundaries)

---

[← Back to React](./README.md) | [Next: State Management →](./11-state-management.md)
