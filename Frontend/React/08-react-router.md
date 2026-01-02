# React Router

## Understanding Client-Side Routing

React Router enables navigation and routing in single-page React applications, providing the foundation for multi-page user experiences without full page reloads.

## Why This Matters

**Interview Perspective:**
- React Router tested in 80%+ of React interviews
- Understanding routing demonstrates SPA architecture knowledge
- Protected routes and navigation patterns are senior-level topics
- Modern v6+ API changes are frequently discussed

**Real-World Importance:**
- **User Experience**: Instant navigation without page reloads
- **Deep Linking**: Shareable URLs to specific app states
- **SEO**: Proper URL structure for search engines
- **Code Organization**: Route-based code splitting

## Core Concepts Overview

### React Router Flow

```
URL Change → Router Matches Path → Renders Component
     ↑                                      ↓
     └──────── User clicks Link ────────────┘
```

### Key Principles

| Concept | Description | Why It Matters |
|---------|-------------|----------------|
| **BrowserRouter** | Wraps app, uses HTML5 History API | Enables clean URLs (/about, not /#/about) |
| **Routes** | Container for all Route components | Matches first matching route |
| **Route** | Maps URL path to component | Defines what renders where |
| **Link** | Client-side navigation | No page reload, instant navigation |
| **useNavigate** | Programmatic navigation | Navigate from code (after form submit, etc.) |

---

## Example 1: Basic Setup

### 💡 **Basic Router Configuration**

The foundation of any React Router application - setting up routes and navigation.

**Core Components:**

**BrowserRouter:**
- Provides routing context to entire app
- Uses HTML5 History API
- Must wrap entire application
- Enables clean URLs

**Routes:**
- Container for all Route definitions
- Renders first matching Route
- Order matters (specific before general)

**Route:**
- Maps path to component
- `path` prop defines URL pattern
- `element` prop defines what to render

**Link:**
- Replaces `<a>` tags
- Prevents full page reload
- Updates URL and triggers route change
- Maintains SPA behavior

**404 Handling:**
```
path="*" → Matches any unmatched route
```

```jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function Home() {
    return <h1>Home Page</h1>;
}

function About() {
    return <h1>About Page</h1>;
}

function Users() {
    return <h1>Users Page</h1>;
}

function NotFound() {
    return (
        <div>
            <h1>404 - Page Not Found</h1>
            <Link to="/">Go Home</Link>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            {/* Navigation */}
            <nav>
                <Link to="/">Home</Link>
                <Link to="/about">About</Link>
                <Link to="/users">Users</Link>
            </nav>

            {/* Routes */}
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

**How It Works:**

**Step 1: Setup**
- BrowserRouter wraps entire app
- Provides routing context

**Step 2: Navigation**
- User clicks Link component
- URL updates without page reload

**Step 3: Route Matching**
- Routes examines current URL
- Finds first matching Route

**Step 4: Render**
- Matching Route renders its element
- Component displays in place of Routes

**Common Navigation Patterns:**

| Pattern | Code | Use Case |
|---------|------|----------|
| **Home link** | `<Link to="/">` | Back to homepage |
| **Relative link** | `<Link to="about">` | Within current section |
| **Absolute link** | `<Link to="/users">` | Any page from anywhere |
| **External link** | `<a href="...">` | Outside your app |

---

## Example 2: Dynamic Routes

### 💡 **URL Parameters and Programmatic Navigation**

Dynamic routes enable creating pages that respond to URL parameters - essential for detail pages, user profiles, and any content accessed by ID.

**useParams Hook:**

Extracts parameters from URL:
- `:id` in path → accessible via `useParams()`
- Returns object with all parameters
- Updates when URL changes

**Common URL Patterns:**

```
/users/:id              → Single parameter
/posts/:postId/comments/:commentId  → Multiple parameters
/products/:category/:id → Nested parameters
```

**useNavigate Hook:**

Programmatic navigation from code:
- Returns navigate function
- Call with path to navigate
- Pass state between routes
- Navigate back/forward in history

**Navigation Methods:**

| Method | Example | Use Case |
|--------|---------|----------|
| **Navigate to path** | `navigate('/home')` | Go to specific route |
| **Navigate with state** | `navigate('/user', { state: {...} })` | Pass data between routes |
| **Go back** | `navigate(-1)` | Browser back button |
| **Go forward** | `navigate(1)` | Browser forward button |
| **Replace history** | `navigate('/home', { replace: true })` | Don't add to history |

```jsx
import { useParams, useNavigate, useLocation } from 'react-router-dom';

function App() {
    return (
        <Routes>
            {/* Single parameter */}
            <Route path="/users/:id" element={<UserDetail />} />

            {/* Multiple parameters */}
            <Route path="/posts/:postId/comments/:commentId" element={<Comment />} />

            {/* Optional parameter with query string */}
            <Route path="/search" element={<Search />} />
        </Routes>
    );
}

// Single parameter example
function UserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const handleEdit = () => {
        // Navigate with state
        navigate(`/users/${id}/edit`, {
            state: { from: location.pathname }
        });
    };

    return (
        <div>
            <h2>User ID: {id}</h2>
            <button onClick={handleEdit}>Edit User</button>
            <button onClick={() => navigate('/users')}>
                Back to Users List
            </button>
            <button onClick={() => navigate(-1)}>
                Go Back
            </button>
        </div>
    );
}

// Multiple parameters example
function Comment() {
    const { postId, commentId } = useParams();
    const navigate = useNavigate();

    return (
        <div>
            <h2>Post: {postId}</h2>
            <h3>Comment: {commentId}</h3>
            <button onClick={() => navigate(`/posts/${postId}`)}>
                View Full Post
            </button>
        </div>
    );
}

// Query parameters example
function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q');
    const filter = searchParams.get('filter');

    const handleSearch = (newQuery) => {
        setSearchParams({ q: newQuery, filter: filter || 'all' });
    };

    return (
        <div>
            <h2>Search Results for: {query}</h2>
            <p>Filter: {filter}</p>
        </div>
    );
}
```

**URL Parameter Patterns:**

```
URL: /users/123
Path: /users/:id
Result: { id: "123" }

URL: /posts/456/comments/789
Path: /posts/:postId/comments/:commentId
Result: { postId: "456", commentId: "789" }

URL: /search?q=react&filter=popular
Query: searchParams.get('q')
Result: "react"
```

---

## Example 3: Nested Routes

### 💡 **Hierarchical Routing with Layouts**

Nested routes enable shared layouts and hierarchical URL structures - a parent component that stays rendered while child routes change.

**The Outlet Component:**

Marks where child route content should appear:
- Parent renders once (layout, navigation)
- Outlet replaced with child content
- Creates consistent layout structure

**Benefits:**

**Code Reuse:**
- Shared navigation, headers, sidebars
- No duplication across pages

**URL Hierarchy:**
```
/dashboard           → Dashboard layout only
/dashboard/profile   → Dashboard + Profile
/dashboard/settings  → Dashboard + Settings
```

**Visual Structure:**
```
┌─────────────────────────────┐
│   Dashboard Layout          │
│   ┌─────────────────────┐  │
│   │  <Outlet />         │  │ ← Child route renders here
│   │  (Profile/Settings) │  │
│   └─────────────────────┘  │
└─────────────────────────────┘
```

```jsx
import { Outlet } from 'react-router-dom';

function App() {
    return (
        <Routes>
            {/* Parent route with nested children */}
            <Route path="/dashboard" element={<DashboardLayout />}>
                {/* Index route - renders at /dashboard */}
                <Route index element={<DashboardHome />} />

                {/* Child routes */}
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
                <Route path="analytics" element={<Analytics />} />
            </Route>

            {/* Another nested structure */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="reports" element={<Reports />} />
            </Route>
        </Routes>
    );
}

// Parent layout component
function DashboardLayout() {
    return (
        <div className="dashboard">
            <header>
                <h1>Dashboard</h1>
            </header>

            {/* Navigation stays visible for all child routes */}
            <nav className="dashboard-nav">
                <Link to="/dashboard">Home</Link>
                <Link to="/dashboard/profile">Profile</Link>
                <Link to="/dashboard/settings">Settings</Link>
                <Link to="/dashboard/analytics">Analytics</Link>
            </nav>

            {/* Child route content renders here */}
            <main>
                <Outlet />
            </main>

            <footer>Dashboard Footer</footer>
        </div>
    );
}

// Child components
function DashboardHome() {
    return <h2>Welcome to Dashboard</h2>;
}

function Profile() {
    return (
        <div>
            <h2>User Profile</h2>
            <p>Profile information here...</p>
        </div>
    );
}

function Settings() {
    return (
        <div>
            <h2>Settings</h2>
            <p>User settings here...</p>
        </div>
    );
}
```

**Nested Route Patterns:**

| URL | Rendered Components |
|-----|-------------------|
| `/dashboard` | DashboardLayout + DashboardHome (index) |
| `/dashboard/profile` | DashboardLayout + Profile |
| `/dashboard/settings` | DashboardLayout + Settings |

**Index Routes:**

```jsx
// Index route renders at parent path
<Route path="/dashboard" element={<Layout />}>
    <Route index element={<Home />} />  // Renders at /dashboard
    <Route path="profile" element={<Profile />} />
</Route>
```

---

## Example 4: Protected Routes

### 💡 **Authentication-Based Route Protection**

Protected routes ensure only authenticated users can access certain pages - essential for any application with user accounts.

**Pattern:**

Wrapper component that:
1. Checks authentication status
2. Renders children if authenticated
3. Redirects to login if not

**Navigate Component:**

Declarative redirection:
- `to` prop specifies destination
- `replace` prop replaces history entry
- Prevents back button to protected route

**Why `replace`?**

```
❌ Without replace:
Login → Dashboard → (not auth) → Login
User clicks back → Dashboard → Redirected to Login (loop!)

✅ With replace:
Login → (replaces with) Login
User clicks back → Previous page before Dashboard
```

**Common Protection Patterns:**

| Pattern | Use Case |
|---------|----------|
| **Authentication** | User must be logged in |
| **Authorization** | User must have specific role |
| **Subscription** | User must have active subscription |
| **Onboarding** | User must complete setup |

```jsx
import { Navigate, useLocation } from 'react-router-dom';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth(); // Custom auth hook
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirect to login, save attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}

// Role-based protection
function AdminRoute({ children }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'admin') {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}

// App with protected routes
function App() {
    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes - require authentication */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                }
            />

            {/* Admin-only routes */}
            <Route
                path="/admin"
                element={
                    <AdminRoute>
                        <AdminPanel />
                    </AdminRoute>
                }
            />

            {/* Error routes */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

// Login component that redirects after success
function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // Where to redirect after login
    const from = location.state?.from?.pathname || '/dashboard';

    const handleSubmit = async (credentials) => {
        const success = await login(credentials);

        if (success) {
            // Redirect to original destination or dashboard
            navigate(from, { replace: true });
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Login form fields */}
        </form>
    );
}

// Custom auth hook example
function useAuth() {
    const [user, setUser] = useState(null);

    return {
        user,
        isAuthenticated: !!user,
        login: async (credentials) => {
            // Login logic
            const user = await api.login(credentials);
            setUser(user);
            return true;
        },
        logout: () => setUser(null)
    };
}
```

**Protection Flow:**

```
User navigates to /dashboard
         ↓
   ProtectedRoute checks authentication
         ↓
   ┌─────────────┬─────────────┐
   │             │             │
Authenticated  Not Authenticated
   │             │
   ↓             ↓
Render      Navigate to /login
Dashboard   (save /dashboard in state)
   │             │
   │             ↓
   │        User logs in
   │             │
   │             ↓
   └─────→ Redirect to /dashboard
```

---

## Common Mistakes

### ❌ Mistake 1: Using `<a>` Tags Instead of `<Link>`

```jsx
// ❌ WRONG - Causes full page reload
function Navigation() {
    return (
        <nav>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
        </nav>
    );
}

// ✅ CORRECT - Client-side navigation
function Navigation() {
    return (
        <nav>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
        </nav>
    );
}
```

**Why It Matters:**
- `<a>` tags cause full page reload
- Lose all React state
- Slower navigation
- Break SPA experience

---

### ❌ Mistake 2: Route Order Issues

```jsx
// ❌ WRONG - Catch-all route first
function App() {
    return (
        <Routes>
            <Route path="*" element={<NotFound />} />  {/* Matches everything! */}
            <Route path="/users" element={<Users />} />  {/* Never reached */}
            <Route path="/about" element={<About />} />  {/* Never reached */}
        </Routes>
    );
}

// ✅ CORRECT - Specific routes first, catch-all last
function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/users" element={<Users />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />  {/* Last */}
        </Routes>
    );
}
```

**Rule:** Specific → General → Catch-all

---

### ❌ Mistake 3: Not Handling 404s

```jsx
// ❌ WRONG - No 404 handler
function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            {/* User sees blank page on invalid URL */}
        </Routes>
    );
}

// ✅ CORRECT - Catch-all 404 route
function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
```

---

### ❌ Mistake 4: Inline Functions in Navigate

```jsx
// ❌ WRONG - Creates new function every render
function UserList() {
    const navigate = useNavigate();

    return users.map(user => (
        <button onClick={() => navigate(`/users/${user.id}`)}>
            View {user.name}
        </button>
    ));
}

// ✅ CORRECT - Use Link for navigation lists
function UserList() {
    return users.map(user => (
        <Link to={`/users/${user.id}`}>
            View {user.name}
        </Link>
    ));
}

// ✅ ALSO CORRECT - If you need button behavior
function UserList() {
    const navigate = useNavigate();

    const handleUserClick = (userId) => {
        // Can add logic before navigation
        trackClick(userId);
        navigate(`/users/${userId}`);
    };

    return users.map(user => (
        <button onClick={() => handleUserClick(user.id)}>
            View {user.name}
        </button>
    ));
}
```

---

## Best Practices

### 1. Use Link for Navigation, useNavigate for Logic

```jsx
// ✅ Link - user-initiated navigation
<Link to="/about">About</Link>

// ✅ useNavigate - logic-driven navigation
const navigate = useNavigate();

const handleSubmit = async (data) => {
    await saveData(data);
    navigate('/success');
};
```

### 2. Protect Sensitive Routes

```jsx
// ✅ Wrap protected content
<Route
    path="/dashboard"
    element={
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    }
/>
```

### 3. Use Nested Routes for Layouts

```jsx
// ✅ Shared layout pattern
<Route path="/dashboard" element={<DashboardLayout />}>
    <Route index element={<Home />} />
    <Route path="profile" element={<Profile />} />
</Route>
```

### 4. Handle Loading States

```jsx
// ✅ Show loading during navigation
function App() {
    return (
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </Suspense>
    );
}
```

### 5. Code Split by Route

```jsx
// ✅ Lazy load route components
const Dashboard = lazy(() => import('./Dashboard'));
const Profile = lazy(() => import('./Profile'));

function App() {
    return (
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </Suspense>
    );
}
```

---

## Real-World Scenarios

### Scenario 1: Multi-Step Form with Route State

**useLocation, useNavigate** - Passing state between routes enables sharing data without URL parameters or global state.

```jsx
function Step1() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '' });

    const handleNext = () => {
        navigate('/signup/step2', { state: { step1: formData } });
    };

    return (
        <form onSubmit={handleNext}>
            <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <button type="submit">Next</button>
        </form>
    );
}

function Step2() {
    const location = useLocation();
    const navigate = useNavigate();
    const step1Data = location.state?.step1;

    const [step2Data, setStep2Data] = useState({ phone: '' });

    const handleSubmit = async () => {
        await submitForm({ ...step1Data, ...step2Data });
        navigate('/success');
    };

    return (
        <form onSubmit={handleSubmit}>
            <p>Name: {step1Data?.name}</p>
            <input
                value={step2Data.phone}
                onChange={(e) => setStep2Data({ phone: e.target.value })}
            />
            <button type="submit">Submit</button>
        </form>
    );
}
```

### Scenario 2: Breadcrumb Navigation

```jsx
import { useMatches } from 'react-router-dom';

function Breadcrumbs() {
    const matches = useMatches();

    return (
        <nav className="breadcrumbs">
            {matches
                .filter(match => match.handle?.crumb)
                .map((match, index) => (
                    <span key={index}>
                        <Link to={match.pathname}>
                            {match.handle.crumb}
                        </Link>
                        {index < matches.length - 1 && ' > '}
                    </span>
                ))}
        </nav>
    );
}

function App() {
    return (
        <Routes>
            <Route path="/" handle={{ crumb: 'Home' }} element={<Home />} />
            <Route path="/products" handle={{ crumb: 'Products' }} element={<Products />} />
            <Route path="/products/:id" handle={{ crumb: 'Product Detail' }} element={<ProductDetail />} />
        </Routes>
    );
}
```

---

## Interview Questions

### Q1: What's the difference between Link and useNavigate?

**Answer:**

| Feature | Link | useNavigate |
|---------|------|-------------|
| **Use Case** | User-initiated navigation | Programmatic navigation |
| **Type** | Component | Hook |
| **When** | Render in JSX | Call in event handlers/effects |
| **Example** | `<Link to="/about">` | `navigate('/about')` |

**Use Link when:** User clicks to navigate
**Use useNavigate when:** Navigate after logic (form submit, auth check)

---

### Q2: How to access URL parameters?

**Answer:**

Three main hooks:

```jsx
// 1. Path parameters: /users/:id
const { id } = useParams();

// 2. Query parameters: /search?q=test
const [searchParams] = useSearchParams();
const query = searchParams.get('q');

// 3. Full location object
const location = useLocation();
// location.pathname, location.search, location.state
```

---

### Q3: How to protect routes?

**Answer:**

Create a wrapper component that checks authentication:

```jsx
function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

// Usage
<Route
    path="/dashboard"
    element={
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    }
/>
```

---

### Q4: What's the purpose of Outlet?

**Answer:**

Outlet marks where child routes should render in nested route layouts:

```jsx
function Layout() {
    return (
        <div>
            <nav>Navigation</nav>
            <Outlet />  {/* Child routes render here */}
        </div>
    );
}
```

Enables shared layouts without duplicating navigation/header/footer code.

---

### Q5: Why use replace in Navigate?

**Answer:**

`replace` replaces the current history entry instead of adding a new one:

```jsx
<Navigate to="/login" replace />
```

**Prevents:**
- User clicking back to protected route
- Redirect loops
- Cluttered browser history

**Use when:**
- Redirecting from protected routes
- After authentication
- Permanent redirects

---

## External Resources

- [React Router Official Docs](https://reactrouter.com/)
- [React Router v6 Migration Guide](https://reactrouter.com/en/main/upgrading/v5)
- [Nested Routes Tutorial](https://reactrouter.com/en/main/start/tutorial#nested-routes)
- [Protected Routes Pattern](https://ui.dev/react-router-protected-routes)

---

[← Back to React](./README.md) | [Next: Forms & Validation →](./09-forms-validation.md)
