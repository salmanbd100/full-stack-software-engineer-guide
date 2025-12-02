# React with TypeScript

## Table of Contents
- [Introduction](#introduction)
- [Typing React Components](#typing-react-components)
- [Props and Children](#props-and-children)
- [Event Handlers](#event-handlers)
- [Hooks with TypeScript](#hooks-with-typescript)
- [Custom Hooks](#custom-hooks)
- [Context API](#context-api)
- [Common Patterns](#common-patterns)
- [Advanced Patterns](#advanced-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Interview Questions](#interview-questions)

---

## Introduction

TypeScript enhances React development with type safety, better IDE support, and improved maintainability. This guide covers all essential patterns for using TypeScript with React.

### Benefits of TypeScript with React

**Compile-Time Safety vs Runtime Errors** - TypeScript catches type errors during development before code runs. Without TypeScript, invalid props pass undetected until runtime, causing errors in production.

```typescript
// Without TypeScript - runtime errors
function Button({ onClick, label }) {
  return <button onClick={onClick}>{label}</button>;
}

// Wrong usage - no error until runtime
<Button onClick="not a function" label={123} />;

// With TypeScript - compile-time safety
interface ButtonProps {
  onClick: () => void;
  label: string;
}

function Button({ onClick, label }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// Error caught at compile time!
<Button onClick="not a function" label={123} />;
```

**Key Benefits:**
- Catch errors during development
- Better autocomplete and IntelliSense
- Safer refactoring
- Self-documenting components
- Improved team collaboration

---

## Typing React Components

### Function Components

**Four Methods for Typing Function Components** - Choose between explicit JSX.Element return, React.FC type, inline props, or separate props interface. Props interface recommended for complex components.

```typescript
// Method 1: Explicit return type
function Welcome(props: { name: string }): JSX.Element {
  return <h1>Hello, {props.name}</h1>;
}

// Method 2: React.FC (Function Component)
import React from 'react';

const Welcome: React.FC<{ name: string }> = ({ name }) => {
  return <h1>Hello, {name}</h1>;
};

// Method 3: Inline props (most common)
function Welcome({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}

// Method 4: Props interface (recommended for complex props)
interface WelcomeProps {
  name: string;
  age?: number;
}

function Welcome({ name, age }: WelcomeProps) {
  return (
    <div>
      <h1>Hello, {name}</h1>
      {age && <p>Age: {age}</p>}
    </div>
  );
}
```

### React.FC vs Regular Function

**React.FC Auto-Includes Children** - React.FC type automatically includes children prop. Regular functions require explicit children typing. Modern best practice favors regular functions for explicit control.

```typescript
// React.FC includes children automatically
const Component1: React.FC<{ title: string }> = ({ title, children }) => {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
};

// Regular function - must explicitly type children
interface Props {
  title: string;
  children?: React.ReactNode;
}

function Component2({ title, children }: Props) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}

// Modern recommendation: Use regular functions
// React.FC has been falling out of favor
```

### Class Components

**Typing Class Component Props and State** - Class components use generic React.Component<Props, State> with separate interfaces for props and state. Constructor and methods follow standard TypeScript patterns.

```typescript
import React from 'react';

// Props interface
interface CounterProps {
  initialCount?: number;
}

// State interface
interface CounterState {
  count: number;
}

// Class component with typed props and state
class Counter extends React.Component<CounterProps, CounterState> {
  // Constructor
  constructor(props: CounterProps) {
    super(props);
    this.state = {
      count: props.initialCount || 0,
    };
  }

  // Method
  increment = (): void => {
    this.setState({ count: this.state.count + 1 });
  };

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.increment}>Increment</button>
      </div>
    );
  }
}

// Usage
<Counter initialCount={10} />;
```

---

## Props and Children

### Basic Props

**Simple Props with Optional Values and Defaults** - Define props interface with required and optional properties. Use literal types for variants. Provide default values in destructuring.

```typescript
// Simple props
interface ButtonProps {
  label: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

function Button({ label, disabled = false, variant = 'primary' }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} disabled={disabled}>
      {label}
    </button>
  );
}

// Usage
<Button label="Click me" />;
<Button label="Delete" variant="danger" disabled />;
```

### Children Props

**ReactNode for Flexible Children** - React.ReactNode accepts any renderable content (elements, strings, numbers, fragments). Use ReactElement for specific component type restrictions.

```typescript
// React.ReactNode - most flexible (recommended)
interface CardProps {
  title: string;
  children: React.ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </div>
  );
}

// Usage - accepts anything
<Card title="My Card">
  <p>Some text</p>
  <button>Click me</button>
  {[1, 2, 3].map((n) => <div key={n}>{n}</div>)}
</Card>;

// Specific children types
interface ListProps {
  children: React.ReactElement<ItemProps> | React.ReactElement<ItemProps>[];
}

// Only accepts specific component
function List({ children }: ListProps) {
  return <ul>{children}</ul>;
}
```

### Optional Children

```typescript
// Children optional
interface ContainerProps {
  title: string;
  children?: React.ReactNode;
}

function Container({ title, children }: ContainerProps) {
  return (
    <div>
      <h1>{title}</h1>
      {children && <div className="content">{children}</div>}
    </div>
  );
}

// Can be used with or without children
<Container title="Header" />;
<Container title="Header">
  <p>Content</p>
</Container>;
```

### Render Props

```typescript
// Render prop pattern
interface DataFetcherProps<T> {
  url: string;
  render: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode;
}

function DataFetcher<T>({ url, render }: DataFetcherProps<T>) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return <>{render(data, loading, error)}</>;
}

// Usage
interface User {
  id: number;
  name: string;
}

<DataFetcher<User>
  url="/api/user"
  render={(data, loading, error) => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (data) return <div>User: {data.name}</div>;
    return null;
  }}
/>;
```

### Component Props

```typescript
// Accept a component as prop
interface LayoutProps {
  Header: React.ComponentType<{ title: string }>;
  Sidebar: React.ComponentType;
  children: React.ReactNode;
}

function Layout({ Header, Sidebar, children }: LayoutProps) {
  return (
    <div>
      <Header title="My App" />
      <div className="container">
        <Sidebar />
        <main>{children}</main>
      </div>
    </div>
  );
}

// Usage
<Layout Header={MyHeader} Sidebar={MySidebar}>
  <p>Content</p>
</Layout>;
```

---

## Event Handlers

### Common Event Types

**React Synthetic Event Types** - Use React.MouseEvent for clicks, React.ChangeEvent for inputs, React.FormEvent for forms, and React.KeyboardEvent for keyboard. Always specify element type parameter.

```typescript
// Click events
function Button() {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Clicked at:', event.clientX, event.clientY);
  };

  return <button onClick={handleClick}>Click me</button>;
}

// Input events
function Input() {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Value:', event.target.value);
  };

  return <input onChange={handleChange} />;
}

// Form events
function Form() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Form submitted');
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit">Submit</button>
    </form>
  );
}

// Keyboard events
function Input() {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      console.log('Enter pressed');
    }
  };

  return <input onKeyDown={handleKeyDown} />;
}
```

### Event Handler Props

```typescript
// Passing event handlers as props
interface ButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function Button({ onClick, onDoubleClick }: ButtonProps) {
  return (
    <button onClick={onClick} onDoubleClick={onDoubleClick}>
      Click me
    </button>
  );
}

// Simplified handler (no event parameter)
interface ButtonProps2 {
  onClick: () => void;
}

function Button2({ onClick }: ButtonProps2) {
  return <button onClick={onClick}>Click me</button>;
}

// Generic handler
interface FormProps {
  onSubmit: (data: FormData) => void;
}

interface FormData {
  username: string;
  password: string;
}

function LoginForm({ onSubmit }: FormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit({
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="username" />
      <input name="password" type="password" />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Specific Element Types

```typescript
// Different element types
function EventExamples() {
  // Button
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Button clicked');
  };

  // Div
  const handleDivClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('Div clicked');
  };

  // Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input:', e.target.value);
  };

  // Textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('Textarea:', e.target.value);
  };

  // Select
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Selected:', e.target.value);
  };

  return (
    <div onClick={handleDivClick}>
      <button onClick={handleButtonClick}>Click</button>
      <input onChange={handleInputChange} />
      <textarea onChange={handleTextareaChange} />
      <select onChange={handleSelectChange}>
        <option>Option 1</option>
      </select>
    </div>
  );
}
```

---

## Hooks with TypeScript

### useState

**useState Type Inference and Explicit Types** - Simple types infer automatically. Use explicit types for unions, objects, nullable/undefined states, and arrays. Essential for complex state management.

```typescript
// Inferred type
const [count, setCount] = useState(0); // number
const [name, setName] = useState('Alice'); // string

// Explicit type
const [count, setCount] = useState<number>(0);

// Union type
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

// Object state
interface User {
  id: number;
  name: string;
  email: string;
}

const [user, setUser] = useState<User>({
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
});

// Nullable state
const [user, setUser] = useState<User | null>(null);

// Array state
const [items, setItems] = useState<string[]>([]);
const [users, setUsers] = useState<User[]>([]);

// Complex state with initial undefined
const [data, setData] = useState<User | undefined>();
```

### useEffect

```typescript
// Basic effect
useEffect(() => {
  console.log('Component mounted');

  // Cleanup function
  return () => {
    console.log('Component unmounted');
  };
}, []);

// Effect with dependencies
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// Async effect
useEffect(() => {
  const fetchData = async () => {
    const response = await fetch('/api/data');
    const data = await response.json();
    setData(data);
  };

  fetchData();
}, []);

// Effect with abort controller
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then((res) => res.json())
    .then((data) => setData(data))
    .catch((err) => {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    });

  return () => {
    controller.abort();
  };
}, []);
```

### useRef

**useRef for DOM Elements and Mutable Values** - Type DOM refs with specific HTMLElement. Use null initial value and optional chaining. Type mutable values explicitly for timers, counters, or storing previous values.

```typescript
// DOM element ref
function Input() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <>
      <input ref={inputRef} />
      <button onClick={focusInput}>Focus</button>
    </>
  );
}

// Mutable value ref
function Timer() {
  const intervalRef = useRef<number | null>(null);

  const startTimer = () => {
    intervalRef.current = window.setInterval(() => {
      console.log('Tick');
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <>
      <button onClick={startTimer}>Start</button>
      <button onClick={stopTimer}>Stop</button>
    </>
  );
}

// Previous value ref
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```

### useCallback

```typescript
// Basic callback
function Parent() {
  const [count, setCount] = useState(0);

  // Inferred types
  const increment = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  // Explicit types
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Clicked');
  }, []);

  // With parameters
  const updateUser = useCallback((id: number, name: string) => {
    console.log(`Updating user ${id} with name ${name}`);
  }, []);

  return <Child onIncrement={increment} onClick={handleClick} />;
}

// Generic callback
function useToggle(initialValue: boolean): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  return [value, toggle];
}
```

### useMemo

```typescript
// Basic memoization
function ExpensiveComponent({ items }: { items: string[] }) {
  // Inferred type
  const sortedItems = useMemo(() => {
    return [...items].sort();
  }, [items]);

  // Explicit type
  const itemCount = useMemo<number>(() => {
    return items.length;
  }, [items]);

  return (
    <ul>
      {sortedItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

// Complex computation
interface User {
  id: number;
  name: string;
  age: number;
}

function UserList({ users }: { users: User[] }) {
  const averageAge = useMemo<number>(() => {
    if (users.length === 0) return 0;
    const sum = users.reduce((acc, user) => acc + user.age, 0);
    return sum / users.length;
  }, [users]);

  return <div>Average age: {averageAge}</div>;
}
```

### useReducer

**Discriminated Union for Action Types** - Define State interface and Action discriminated union. Reducer function provides type-safe state transitions. TypeScript validates action types and payloads.

```typescript
// State and action types
interface State {
  count: number;
  error: string | null;
}

type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset' }
  | { type: 'setError'; payload: string };

// Reducer function
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'decrement':
      return { ...state, count: state.count - 1 };
    case 'reset':
      return { ...state, count: 0 };
    case 'setError':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// Component
function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0, error: null });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
    </div>
  );
}
```

---

## Custom Hooks

### Basic Custom Hook

**Custom Hook with Tuple Return Type** - Define explicit return type as tuple for array destructuring. Follow hook naming convention (use prefix). Return state and setter/toggle functions.

```typescript
// Toggle hook
function useToggle(initialValue: boolean = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  return [value, toggle];
}

// Usage
function Component() {
  const [isOpen, toggleOpen] = useToggle(false);

  return (
    <div>
      <button onClick={toggleOpen}>{isOpen ? 'Close' : 'Open'}</button>
      {isOpen && <div>Content</div>}
    </div>
  );
}
```

### Generic Custom Hook

**Generic Hook for Type-Safe Reusability** - Use generics to create hooks that work with any data type. Enables localStorage, fetch, or form hooks with full type inference at usage site.

```typescript
// Local storage hook
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// Usage
function App() {
  const [name, setName] = useLocalStorage<string>('name', 'Guest');
  const [settings, setSettings] = useLocalStorage<{ theme: string }>('settings', {
    theme: 'light',
  });

  return <div>Name: {name}</div>;
}
```

### Fetch Hook

```typescript
// Fetch hook with loading and error states
interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data: T) => {
        setData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Usage
interface User {
  id: number;
  name: string;
}

function UserProfile({ userId }: { userId: number }) {
  const { data, loading, error, refetch } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Form Hook

```typescript
// Form hook
interface UseFormResult<T> {
  values: T;
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (callback: (values: T) => void) => (event: React.FormEvent) => void;
  reset: () => void;
}

function useForm<T extends Record<string, any>>(initialValues: T): UseFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (callback: (values: T) => void) => (event: React.FormEvent) => {
    event.preventDefault();
    callback(values);
  };

  const reset = () => {
    setValues(initialValues);
  };

  return { values, handleChange, handleSubmit, reset };
}

// Usage
interface LoginFormData {
  username: string;
  password: string;
}

function LoginForm() {
  const { values, handleChange, handleSubmit } = useForm<LoginFormData>({
    username: '',
    password: '',
  });

  const onSubmit = (data: LoginFormData) => {
    console.log('Login:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input name="username" value={values.username} onChange={handleChange} />
      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## Context API

### Basic Context

**Type-Safe Context with Custom Hook** - Create context with undefined default, define context type interface, provide custom hook that validates provider usage. Pattern prevents accessing context outside provider.

```typescript
// Create context
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

// Provider component
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook for using context
function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Usage
function App() {
  return (
    <ThemeProvider>
      <Header />
      <Main />
    </ThemeProvider>
  );
}

function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={theme}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </header>
  );
}
```

### Complex Context with Reducer

```typescript
// State and actions
interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { user: action.payload, loading: false, error: null };
    case 'LOGIN_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
      return { user: null, loading: false, error: null };
    default:
      return state;
  }
}

// Context type
interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Create context
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Provider
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: false,
    error: null,
  });

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const user = await response.json();
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Login failed' });
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Usage
function LoginButton() {
  const { state, login, logout } = useAuth();

  if (state.user) {
    return (
      <div>
        <span>Welcome, {state.user.name}</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={() => login('user@example.com', 'password')}>Login</button>
  );
}
```

---

## Common Patterns

### Conditional Rendering

```typescript
// With optional children
interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Card({ title, subtitle, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {subtitle && <h3>{subtitle}</h3>}
      <div>{children}</div>
    </div>
  );
}

// With render prop
interface DataDisplayProps<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  renderData: (data: T) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: Error) => React.ReactNode;
}

function DataDisplay<T>({
  data,
  loading,
  error,
  renderData,
  renderLoading,
  renderError,
}: DataDisplayProps<T>) {
  if (loading) {
    return <>{renderLoading ? renderLoading() : <div>Loading...</div>}</>;
  }

  if (error) {
    return <>{renderError ? renderError(error) : <div>Error: {error.message}</div>}</>;
  }

  if (data) {
    return <>{renderData(data)}</>;
  }

  return null;
}
```

### HOC (Higher-Order Components)

```typescript
// HOC that adds loading state
interface WithLoadingProps {
  loading: boolean;
}

function withLoading<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & WithLoadingProps> {
  return ({ loading, ...props }: WithLoadingProps) => {
    if (loading) {
      return <div>Loading...</div>;
    }
    return <Component {...(props as P)} />;
  };
}

// Usage
interface UserListProps {
  users: User[];
}

function UserList({ users }: UserListProps) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

const UserListWithLoading = withLoading(UserList);

// Use component
<UserListWithLoading loading={false} users={users} />;
```

### Forwarding Refs

```typescript
// Forward ref to DOM element
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} {...props} />
      </div>
    );
  }
);

// Usage
function Form() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <>
      <Input ref={inputRef} label="Name" />
      <button onClick={focusInput}>Focus Input</button>
    </>
  );
}
```

---

## Advanced Patterns

### Generic Components

```typescript
// Generic list component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// Usage
interface User {
  id: number;
  name: string;
}

function UserList({ users }: { users: User[] }) {
  return (
    <List
      items={users}
      renderItem={(user) => <div>{user.name}</div>}
      keyExtractor={(user) => user.id}
    />
  );
}
```

### Polymorphic Components

```typescript
// Component that can render as different elements
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<E>;

function Text<E extends React.ElementType = 'span'>({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || 'span';
  return <Component {...props}>{children}</Component>;
}

// Usage
<Text>Default span</Text>;
<Text as="h1">Heading</Text>;
<Text as="a" href="/home">
  Link
</Text>;
```

### Discriminated Union Props

```typescript
// Either-or props pattern
type ButtonProps =
  | {
      variant: 'link';
      href: string;
      onClick?: never;
    }
  | {
      variant: 'button';
      href?: never;
      onClick: () => void;
    };

function Button(props: ButtonProps) {
  if (props.variant === 'link') {
    return <a href={props.href}>Link</a>;
  }

  return <button onClick={props.onClick}>Button</button>;
}

// Usage
<Button variant="link" href="/home" />; // OK
<Button variant="button" onClick={() => {}} />; // OK
// <Button variant="link" onClick={() => {}} /> // Error
```

---

## Common Pitfalls

### Pitfall 1: Not Typing Event Handlers

```typescript
// ❌ Wrong - any type
function Button() {
  const handleClick = (e) => {
    // e is any
    console.log(e);
  };

  return <button onClick={handleClick}>Click</button>;
}

// ✅ Correct
function Button() {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log(e.clientX, e.clientY);
  };

  return <button onClick={handleClick}>Click</button>;
}
```

### Pitfall 2: useState with Complex Types

```typescript
// ❌ Wrong - type not inferred correctly
const [user, setUser] = useState(null); // null type

// ✅ Correct - explicit type
const [user, setUser] = useState<User | null>(null);
```

### Pitfall 3: useRef Initial Value

```typescript
// ❌ Wrong - ref can't be null
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current.focus(); // Error - possibly null

// ✅ Correct - check for null
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();

// Or assert non-null if you're sure
inputRef.current!.focus();
```

### Pitfall 4: Children Type

```typescript
// ❌ Wrong - too restrictive
interface Props {
  children: JSX.Element;
}

// ✅ Correct - use React.ReactNode
interface Props {
  children: React.ReactNode;
}
```

---

## Interview Questions

### Q1: How do you type a React functional component?

**Answer:**
```typescript
// Method 1: Inline props (recommended)
function Welcome({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}

// Method 2: Props interface (better for complex props)
interface WelcomeProps {
  name: string;
  age?: number;
}

function Welcome({ name, age }: WelcomeProps) {
  return (
    <div>
      <h1>Hello, {name}</h1>
      {age && <p>Age: {age}</p>}
    </div>
  );
}

// Method 3: React.FC (falling out of favor)
const Welcome: React.FC<{ name: string }> = ({ name }) => {
  return <h1>Hello, {name}</h1>;
};

// Recommendation: Use method 2 for most cases
// Pros: Clear, explicit, no magic types
// React.FC was popular but has issues (children implicitly included, etc.)
```

---

### Q2: How do you type useState with complex types?

**Answer:**
```typescript
// Simple types - infer
const [count, setCount] = useState(0); // number
const [name, setName] = useState('Alice'); // string

// Complex types - explicit type
interface User {
  id: number;
  name: string;
  email: string;
}

// With initial value
const [user, setUser] = useState<User>({
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
});

// Nullable/optional
const [user, setUser] = useState<User | null>(null);
const [data, setData] = useState<User | undefined>();

// Array
const [users, setUsers] = useState<User[]>([]);

// Union types
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

// Updating complex state
setUser({ ...user, name: 'Bob' }); // OK
setUser((prev) => ({ ...prev, name: 'Bob' })); // OK with prev value
```

---

### Q3: How do you type event handlers in React?

**Answer:**
```typescript
// Common event types:

// Mouse events
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log('Clicked at', e.clientX, e.clientY);
};

// Input change
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log('Value:', e.target.value);
};

// Form submit
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  console.log('Submitted');
};

// Keyboard events
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    console.log('Enter pressed');
  }
};

// Focus events
const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  console.log('Focused');
};

// Generic element (when you don't care about specific element)
const handleClick = (e: React.MouseEvent<HTMLElement>) => {
  console.log('Clicked');
};

// Simplified (no event parameter needed)
interface ButtonProps {
  onClick: () => void; // No event parameter
}

function Button({ onClick }: ButtonProps) {
  return <button onClick={onClick}>Click</button>;
}
```

---

### Q4: How do you type useRef?

**Answer:**
```typescript
// DOM element ref (most common)
const inputRef = useRef<HTMLInputElement>(null);

// Must use optional chaining or non-null assertion
inputRef.current?.focus(); // Safe
inputRef.current!.focus(); // Assert non-null (use carefully)

// Different element types
const divRef = useRef<HTMLDivElement>(null);
const buttonRef = useRef<HTMLButtonElement>(null);
const videoRef = useRef<HTMLVideoElement>(null);

// Mutable value (not DOM element)
const intervalRef = useRef<number | null>(null);
const countRef = useRef<number>(0);

// Example with timer
function Timer() {
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    intervalRef.current = window.setInterval(() => {
      console.log('Tick');
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </>
  );
}

// Store previous value
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```

---

### Q5: How do you create a custom hook with TypeScript?

**Answer:**
```typescript
// Simple hook with explicit return type
function useToggle(initialValue: boolean = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  return [value, toggle];
}

// Generic hook
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// Hook with object return
interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data: T) => {
        setData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}

// Usage
const [isOpen, toggle] = useToggle();
const [name, setName] = useLocalStorage<string>('name', 'Guest');
const { data, loading, error } = useFetch<User>('/api/user');
```

---

### Q6: How do you type the Context API?

**Answer:**
```typescript
// 1. Define context type
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// 2. Create context with undefined (recommended)
const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

// 3. Create provider
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 4. Create custom hook (recommended)
function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// 5. Usage
function App() {
  return (
    <ThemeProvider>
      <Header />
    </ThemeProvider>
  );
}

function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={theme}>
      <button onClick={toggleTheme}>Toggle</button>
    </header>
  );
}

// Why undefined in context?
// - Forces you to use provider
// - Custom hook can throw error if used outside provider
// - Type-safe without null checks
```

---

## Key Takeaways

1. **Function components** - Use props interface for complex props
2. **useState** - Explicit types for complex/nullable state
3. **Event handlers** - Use `React.MouseEvent`, `React.ChangeEvent`, etc.
4. **useRef** - Specify element type: `useRef<HTMLInputElement>(null)`
5. **Custom hooks** - Use generics for reusable hooks
6. **Context** - Create custom hook for type-safe context usage
7. **Children** - Use `React.ReactNode` for maximum flexibility
8. **Avoid React.FC** - Prefer regular functions with explicit props

---

## Best Practices

1. **Define props interfaces separately**
```typescript
interface Props {
  name: string;
  age: number;
}

function Component({ name, age }: Props) {
  // ...
}
```

2. **Use explicit types for state**
```typescript
const [user, setUser] = useState<User | null>(null);
```

3. **Create custom hooks for reusable logic**
```typescript
function useAuth() {
  // ...
}
```

4. **Use discriminated unions for component variants**
```typescript
type ButtonProps =
  | { variant: 'link'; href: string }
  | { variant: 'button'; onClick: () => void };
```

---

## Next Steps

- [Type Guards](./05-type-guards.md)
- [Advanced Types](./06-advanced-types.md)
- [Utility Types](./04-utility-types.md)

---

[← Back to TypeScript](./README.md)
