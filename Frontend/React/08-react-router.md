# React Router

React Router enables navigation and routing in single-page React applications.

## 📚 Core Concepts

### 1. Basic Setup

**BrowserRouter, Routes, Route, Link** - Sets up basic client-side routing with React Router. BrowserRouter provides the routing context, Routes defines route matching logic, Route maps paths to components, and Link enables navigation without page refreshes.

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

**useParams, useNavigate** - Demonstrates dynamic route parameters and programmatic navigation. useParams extracts URL parameters (like :id), while useNavigate provides a function to navigate between routes programmatically.

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

**Outlet** - Shows how to create nested routes with a parent-child relationship. The Outlet component acts as a placeholder where child route components will be rendered, enabling shared layouts and nested navigation structures.

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

**Navigate, useAuth** - Implements route protection by checking authentication status and redirecting unauthorized users to login. Uses a custom useAuth hook to access authentication context and Navigate component for redirection.

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
