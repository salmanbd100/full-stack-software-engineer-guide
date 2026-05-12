# React with TypeScript

## Table of Contents
- [Function Components](#function-components)
- [Props and Children](#props-and-children)
- [Event Handlers](#event-handlers)
- [Hooks with TypeScript](#hooks-with-typescript)
- [Custom Hooks](#custom-hooks)
- [Context API](#context-api)
- [Common Patterns](#common-patterns)
- [Interview Questions](#interview-questions)

---

## Function Components

Define an interface for props, then destructure in the function signature.

```typescript
interface UserCardProps {
  name: string;
  email: string;
  role: "admin" | "user";
  avatarUrl?: string;           // optional
  onEdit: (id: number) => void; // callback
}

function UserCard({ name, email, role, avatarUrl, onEdit }: UserCardProps) {
  return (
    <div className="card">
      {avatarUrl && <img src={avatarUrl} alt={name} />}
      <h2>{name}</h2>
      <p>{email}</p>
      <span className={`badge ${role}`}>{role}</span>
      <button onClick={() => onEdit(1)}>Edit</button>
    </div>
  );
}
```

> Avoid `React.FC` — it implicitly includes `children` and has other quirks. Prefer a plain function with an explicit props interface.

---

## Props and Children

### `React.ReactNode` — accept anything renderable

```typescript
interface CardProps {
  title: string;
  children: React.ReactNode; // strings, elements, arrays, fragments
  footer?: React.ReactNode;  // optional section
}

function Card({ title, children, footer }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="body">{children}</div>
      {footer && <div className="footer">{footer}</div>}
    </div>
  );
}

// Accepts text, elements, fragments — anything
<Card title="Users" footer={<button>See all</button>}>
  <UserList users={users} />
</Card>
```

### Extending native HTML props

```typescript
// Button that adds your custom props + all native <button> attributes
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

function Button({ variant = "primary", loading, children, ...rest }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}

// All native button props (type, onClick, disabled, etc.) still work
<Button variant="danger" onClick={handleDelete} type="button">
  Delete
</Button>
```

---

## Event Handlers

| Event | Type |
|-------|------|
| Click | `React.MouseEvent<HTMLButtonElement>` |
| Input change | `React.ChangeEvent<HTMLInputElement>` |
| Select change | `React.ChangeEvent<HTMLSelectElement>` |
| Form submit | `React.FormEvent<HTMLFormElement>` |
| Key press | `React.KeyboardEvent<HTMLInputElement>` |
| Focus/Blur | `React.FocusEvent<HTMLInputElement>` |

```typescript
function LoginForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    console.log(form.get("email"));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" onChange={handleEmailChange} onKeyDown={handleKeyDown} />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Hooks with TypeScript

### `useState`

```typescript
// Simple types — let TypeScript infer
const [count, setCount] = useState(0);      // number
const [name, setName] = useState("Alice");  // string

// Complex types — be explicit
const [user, setUser] = useState<User | null>(null);
const [users, setUsers] = useState<User[]>([]);
const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
```

### `useRef`

```typescript
function SearchInput() {
  // DOM ref — always null initially
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus(); // ✅ use optional chaining
  };

  return (
    <>
      <input ref={inputRef} type="search" />
      <button onClick={focusInput}>Focus</button>
    </>
  );
}

// Mutable ref — store interval/timeout IDs
function Poller() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(poll, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
```

### `useReducer`

```typescript
interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: "add_item"; item: CartItem }
  | { type: "remove_item"; itemId: string }
  | { type: "clear" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add_item":
      return {
        items: [...state.items, action.item],
        total: state.total + action.item.price,
      };
    case "remove_item":
      const removed = state.items.find(i => i.id === action.itemId);
      return {
        items: state.items.filter(i => i.id !== action.itemId),
        total: state.total - (removed?.price ?? 0),
      };
    case "clear":
      return { items: [], total: 0 };
    default:
      return state;
  }
}

function Cart() {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return (
    <div>
      <p>Total: ${state.total}</p>
      <button onClick={() => dispatch({ type: "clear" })}>Clear cart</button>
    </div>
  );
}
```

---

## Custom Hooks

### Generic data fetching hook

```typescript
interface UseFetch<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useFetch<T>(url: string): UseFetch<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: T = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Usage
function UserProfile({ userId }: { userId: number }) {
  const { data, loading, error } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  return <h1>{data.name}</h1>;
}
```

### Local storage hook

```typescript
function useLocalStorage<T>(key: string, initialValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setAndStore = (newValue: T) => {
    setValue(newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setAndStore];
}

// Usage — fully type-safe
const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
const [prefs, setPrefs] = useLocalStorage<UserPreferences>("prefs", defaultPrefs);
```

---

## Context API

```typescript
interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// Always use undefined as default — forces you to use the provider
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetchJson<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(res);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — throws a helpful error if used outside provider
function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

// Usage in any component
function Header() {
  const { user, logout } = useAuth();
  return user ? (
    <nav>
      <span>{user.name}</span>
      <button onClick={logout}>Sign out</button>
    </nav>
  ) : <a href="/login">Sign in</a>;
}
```

---

## Common Patterns

### Forwarding Refs

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FormInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => (
    <div className="field">
      <label>{label}</label>
      <input ref={ref} {...props} />
      {error && <span className="error">{error}</span>}
    </div>
  )
);

// Usage — parent can control focus
function SignupForm() {
  const emailRef = useRef<HTMLInputElement>(null);

  return (
    <form>
      <FormInput ref={emailRef} label="Email" type="email" />
    </form>
  );
}
```

### Generic List Component

```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyState?: React.ReactNode;
}

function List<T>({ items, renderItem, keyExtractor, emptyState }: ListProps<T>) {
  if (items.length === 0) return <>{emptyState ?? <p>No items</p>}</>;

  return (
    <ul>
      {items.map((item, i) => (
        <li key={keyExtractor(item)}>{renderItem(item, i)}</li>
      ))}
    </ul>
  );
}

// Usage with full type inference
<List
  items={users}
  keyExtractor={(u) => u.id}
  renderItem={(u) => <UserCard user={u} />}
  emptyState={<p>No users found</p>}
/>
```

---

## Interview Questions

### Q: How do you type a React functional component?

Define a `Props` interface, then destructure in the function signature. Avoid `React.FC` — it's falling out of favor.

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

function Button({ label, onClick, variant = "primary" }: ButtonProps) {
  return <button onClick={onClick} className={variant}>{label}</button>;
}
```

### Q: How do you type `useState` with an object or null?

Always provide an explicit type parameter when the initial value doesn't reveal the full type.

```typescript
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<Product[]>([]);
```

### Q: How do you type event handlers?

Use React's synthetic event types with the element type in the generic.

```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.value;
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => e.preventDefault();
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget;
```

### Q: When should you use `useReducer` instead of `useState`?

When you have **multiple related state values** that update together, or when the next state depends on the previous state in complex ways. The discriminated union action type catches invalid dispatches at compile time.

---

[← Enums & Literals](./07-enums-literals.md) | [Back to TypeScript](./README.md)
