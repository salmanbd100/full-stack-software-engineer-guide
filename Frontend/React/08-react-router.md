# React Router

React Router enables navigation and routing in single-page React applications.

## 📚 Core Concepts

### 1. Basic Setup

**React Router Fundamentals** enable building single-page applications (SPAs) with multiple views while maintaining browser history and deep linking capabilities. BrowserRouter uses the HTML5 History API to keep the UI in sync with the URL, providing the routing context for the entire app. Routes acts as a switch, rendering only the first matching Route. Link components replace `<a>` tags to enable client-side navigation without full page reloads - critically important for SPAs. The catch-all route (`path="*"`) handles 404s gracefully. This architecture allows complex multi-page user experiences while maintaining the fast, app-like feel of a SPA.

```jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/about">About</Link>
                <Link to="/users">Users</Link>
            </nav>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/users" element={<Users />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
```

### 2. Dynamic Routes

**Dynamic Routing** enables creating routes that respond to URL parameters, essential for detail pages, user profiles, or any content accessed by ID. The colon syntax (`:id`) creates a parameter placeholder that React Router extracts and provides via useParams. This pattern enables RESTful URL structures like `/users/123` or `/posts/abc/comments/456`. useNavigate provides programmatic navigation for actions like redirecting after form submission, going back in history, or navigating based on business logic. The `navigate(-1)` pattern mimics a browser back button, while passing state enables sharing data between routes without URL parameters.

```jsx
import { useParams, useNavigate } from 'react-router-dom';

function App() {
    return (
        <Routes>
            <Route path="/users/:id" element={<UserDetail />} />
            <Route path="/posts/:postId/comments/:commentId" element={<Comment />} />
        </Routes>
    );
}

function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div>
            <h2>User {id}</h2>
            <button onClick={() => navigate('/users')}>
                Back to Users
            </button>
        </div>
    );
}
```

### 3. Nested Routes

**Nested Routing** enables hierarchical URL structures and shared layouts - a dashboard layout that wraps profile and settings pages, for example. The parent route renders once, providing a consistent wrapper (navigation, headers, sidebars), while the Outlet component marks where child route content should appear. This architecture eliminates code duplication and creates intuitive URL hierarchies like `/dashboard/profile` and `/dashboard/settings`. Nested routes are fundamental to complex applications where different sections share common UI elements but vary in their main content area.

```jsx
function App() {
    return (
        <Routes>
            <Route path="/dashboard" element={<Dashboard />}>
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    );
}

function Dashboard() {
    return (
        <div>
            <h1>Dashboard</h1>
            <nav>
                <Link to="profile">Profile</Link>
                <Link to="settings">Settings</Link>
            </nav>
            <Outlet /> {/* Renders child routes */}
        </div>
    );
}
```

### 4. Protected Routes

**Route Protection** is essential for securing application areas that require authentication or specific permissions. The ProtectedRoute wrapper component checks authentication status before rendering children, redirecting unauthorized users to login. The `replace` prop on Navigate replaces the current history entry instead of adding a new one, preventing users from navigating back to protected routes they can't access. This pattern centralizes authorization logic, making it easy to protect multiple routes consistently. In production applications, you'd extend this with role-based access control (RBAC) and more sophisticated permission checks.

```jsx
function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
```

## 🎯 Common Interview Questions

### Q1: How to navigate programmatically?

**Answer:** Use the `useNavigate` hook:

**useNavigate** - Provides programmatic navigation capabilities. Can navigate to paths, pass state, or go back in history.

```jsx
const navigate = useNavigate();

// Navigate to path
navigate('/home');

// Navigate with state
navigate('/user', { state: { from: 'login' } });

// Go back
navigate(-1);
```

### Q2: How to access URL parameters?

**Answer:** Use `useParams`, `useSearchParams`, or `useLocation`:

**useParams, useSearchParams, useLocation** - Three different hooks for accessing URL information. useParams extracts dynamic route parameters, useSearchParams handles query strings, and useLocation provides the complete location object.

```jsx
// Path params: /users/:id
const { id } = useParams();

// Query params: /search?q=test
const [searchParams] = useSearchParams();
const query = searchParams.get('q');

// Full location
const location = useLocation();
```

## 🎓 Best Practices

1. **Use Links for navigation** (not <a> tags)
2. **Protect sensitive routes**
3. **Use nested routes** for layouts
4. **Handle 404s** with catch-all route
5. **Use lazy loading** for code splitting

---

[← Back to React](./README.md)
