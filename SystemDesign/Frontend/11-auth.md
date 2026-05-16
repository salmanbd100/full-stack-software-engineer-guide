# Authentication and Authorization

## 💡 **Concept**

Authentication proves who you are. Authorization determines what you can do. On the frontend, auth design affects security (where tokens live), UX (redirect flows), and code organization (route guards, permission checks).

**How to answer in an interview:** "I'd use JWT with short-lived access tokens stored in memory and long-lived refresh tokens in httpOnly cookies. The cookie is inaccessible to JavaScript — that eliminates XSS risk. An Axios interceptor transparently refreshes the access token on 401, so users never see a login redirect mid-session."

---

## JWT vs Session-Based Auth

| | JWT | Session |
|--|-----|---------|
| **Storage** | Client (memory/cookie) | Server (DB/Redis) |
| **Scalability** | Stateless — no server storage | Requires session store |
| **Revocation** | Hard — must wait for expiry | Instant (delete session) |
| **Payload** | Claims embedded in token | Opaque ID, data on server |
| **Best for** | APIs, microservices | Traditional web apps |

---

## JWT Authentication Flow

```typescript
// Store access token in memory only — not localStorage (XSS risk)
let accessToken: string | null = null;

// lib/auth.ts
interface AuthTokens {
  accessToken: string;
  expiresIn: number;  // seconds
}

async function login(email: string, password: string): Promise<void> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",   // server sets refreshToken as httpOnly cookie
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error("Login failed");

  const { accessToken: token, expiresIn } = await response.json() as AuthTokens;
  accessToken = token;

  // Auto-refresh before token expires
  setTimeout(() => refreshAccessToken(), (expiresIn - 60) * 1000);
}

async function refreshAccessToken(): Promise<boolean> {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",   // sends httpOnly refresh token cookie automatically
  });

  if (!response.ok) {
    accessToken = null;
    return false;
  }

  const { accessToken: token, expiresIn } = await response.json() as AuthTokens;
  accessToken = token;
  setTimeout(() => refreshAccessToken(), (expiresIn - 60) * 1000);
  return true;
}

async function logout(): Promise<void> {
  accessToken = null;
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}
```

---

## Axios Interceptor for Silent Refresh

```typescript
import axios from "axios";

const apiClient = axios.create({ baseURL: "/api", withCredentials: true });

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    original._retry = true;

    if (isRefreshing) {
      // Queue requests while refresh is in flight
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    isRefreshing = true;
    const refreshed = await refreshAccessToken();
    isRefreshing = false;

    if (!refreshed) {
      window.location.href = "/login";
      return Promise.reject(error);
    }

    queue.forEach((cb) => cb(accessToken!));
    queue = [];
    original.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient(original);
  }
);
```

---

## React Auth Context

```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    // On app load, try to restore session via refresh token
    refreshAccessToken()
      .then((ok) => { if (ok) return fetchCurrentUser(); })
      .then((u) => u && setUser(u))
      .catch(() => {});
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    const u = await fetchCurrentUser();
    setUser(u);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
```

---

## Route Guards

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}

// Usage
<Routes>
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
</Routes>
```

---

## RBAC (Role-Based Access Control)

```typescript
type Role = "admin" | "editor" | "viewer";
type Permission = "read" | "write" | "delete";

const rolePermissions: Record<Role, Permission[]> = {
  admin:  ["read", "write", "delete"],
  editor: ["read", "write"],
  viewer: ["read"],
};

function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return rolePermissions[user.role as Role]?.includes(permission) ?? false;
}

// Component-level permission check
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const canDelete = usePermission("delete");
  if (!canDelete) return null;
  return <Button variant="danger" onClick={onDelete}>Delete</Button>;
}
```

---

## Common Mistakes

❌ **Storing JWT in localStorage** — accessible by any JavaScript; XSS can steal it  
❌ **Long-lived access tokens** — short TTL (15 min) + refresh token is the right pattern  
❌ **Trusting client-side role checks alone** — always validate permissions on the server  
❌ **Not handling concurrent 401 responses** — without the queue pattern, multiple requests all try to refresh simultaneously

**Key insight:**

> Access tokens in memory + refresh tokens in httpOnly cookies is the gold-standard browser auth pattern. It combines XSS protection (httpOnly cookie) with CSRF protection (the access token in the Authorization header can't be sent by a form).

---
[← Back to SystemDesign](../README.md)
