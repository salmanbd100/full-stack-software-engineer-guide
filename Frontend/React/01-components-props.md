# Components and Props (React 18)

## Understanding React's Building Blocks

**Components** are the building blocks of React applications - independent, reusable pieces of UI that accept inputs (props) and return React elements describing what should appear on screen.

## Why Components and Props Matter

**Interview Perspective:**
- Fundamental concept tested in 100% of React interviews
- Understanding props flow demonstrates React architecture knowledge
- Composition patterns are key to senior-level positions
- React 18 concurrent features build on these fundamentals

**Real-World Importance:**
- **Reusability**: Build once, use everywhere
- **Maintainability**: Isolated components are easier to update
- **Scalability**: Compose complex UIs from simple pieces
- **Team Collaboration**: Clear component boundaries enable parallel development

## Core Concepts Overview

### **Components**
- Independent, reusable UI pieces
- Accept inputs (props) and return JSX
- Function-based (modern standard)

### **Props**
- Read-only data passed from parent to child
- Enable component customization
- Flow unidirectionally (one-way data flow)

### **React 18 Enhancements**
- Automatic batching for all updates
- Concurrent rendering for better performance
- Improved SSR and streaming

## Key Principles

| Principle | Description | Why It Matters |
|-----------|-------------|----------------|
| **Functional Components** | Always use functions, not classes | Modern, simpler, works with Hooks |
| **Unidirectional Data Flow** | Props flow parent → child only | Predictable, easier to debug |
| **Immutability** | Never modify props directly | Prevents bugs, enables optimization |
| **Composition** | Build complex UIs from simple parts | More flexible than inheritance |
| **Pure Functions** | Same props → same output | Predictable, testable |

### Modern Best Practices

✅ **Do:**
- Use functional components exclusively
- Destructure props for readability
- Provide default props for optional values
- Keep components small and focused
- Compose components together

❌ **Don't:**
- Use class components (legacy)
- Mutate props
- Mix logic and presentation in one component
- Pass too many props (use composition or context)
- Forget prop validation in production apps

---

## Example 1: Functional Components

### 💡 **Functional Components**

JavaScript functions that accept props and return JSX.

**What Makes Them Special:**

**Modern Standard:**
- ✅ Replaced class components entirely
- ✅ Work seamlessly with Hooks
- ✅ Simpler, easier to test
- ✅ Less boilerplate code

**Pure Function Pattern:**
```
Props (Input) → Component Function → JSX (Output)
```

**Key Characteristics:**

1. **Function-Based:**
   - Regular functions or arrow functions
   - Accept props as parameter
   - Return JSX

2. **Declarative:**
   - Output is predictable based on input
   - Same props → same rendered output
   - No hidden state (use Hooks for state)

3. **Composable:**
   - Can be nested and combined
   - Small, focused responsibilities
   - Easy to reason about

**Syntax Variations:**

| Style | When to Use |
|-------|-------------|
| Regular function | Top-level components, named exports |
| Arrow function | Inline components, callbacks |
| Destructured props | Clear prop dependencies |
| Typed props (TypeScript) | Production applications |

```jsx
// Simple functional component
function Welcome(props) {
    return <h1>Hello, {props.name}!</h1>;
}

// Arrow function component
const Greeting = (props) => {
    return <div>Welcome, {props.name}!</div>;
};

// With destructuring
const UserCard = ({ name, age, email }) => {
    return (
        <div className="user-card">
            <h2>{name}</h2>
            <p>Age: {age}</p>
            <p>Email: {email}</p>
        </div>
    );
};

// Usage
function App() {
    return (
        <div>
            <Welcome name="Alice" />
            <Greeting name="Bob" />
            <UserCard
                name="Charlie"
                age={30}
                email="charlie@example.com"
            />
        </div>
    );
}
```

**How It Works:**

**Step 1: Props Reception**
- Component receives props as object parameter
- Can destructure for direct access

**Step 2: Processing**
- Use props in JSX expressions with `{}`
- Apply logic if needed (conditionals, mapping)

**Step 3: Return JSX**
- Describe UI structure declaratively
- JSX compiles to React.createElement calls

**Step 4: Reusability**
- Same component, different props
- Different output each time

**Comparison: Function Styles**

| Feature | Regular Function | Arrow Function | Destructured |
|---------|-----------------|----------------|--------------|
| **Syntax** | `function Comp(props)` | `const Comp = (props) =>` | `function Comp({ name })` |
| **Hoisting** | ✅ Yes | ❌ No | ✅ Yes |
| **Clarity** | Good | Good | ✅ Best |
| **Use Case** | General purpose | Inline/short | Clear dependencies |

---

## Example 2: Props and Default Props

### 💡 **Default Props - Predictable Component Behavior**

Ensure components work correctly when optional props aren't provided.

**Why Default Props Matter:**

**Problems They Solve:**
- ❌ Undefined errors when props missing
- ❌ Excessive prop passing from parents
- ❌ Unclear which props are required vs optional
- ❌ Repetitive fallback logic

**Modern Approach vs Legacy:**

| Approach | Syntax | Type Safety | Visibility |
|----------|--------|-------------|------------|
| **Modern (Destructuring)** | `{ text = "Click" }` | ✅ Works with TS | ✅ In signature |
| **Legacy (defaultProps)** | `Button.defaultProps = {...}` | ⚠️ Separate | ❌ Below component |

**Modern Best Practice:**

Use parameter destructuring with default values:

```jsx
// ✅ Modern: Defaults in function signature
function Button({ text = "Click me", variant = "primary" }) {
  // Immediately clear what props exist and their defaults
}

// ❌ Legacy: Separate defaultProps (avoid)
function Button(props) {
  // ...
}
Button.defaultProps = {
  text: "Click me",
  variant: "primary"
};
```

**Benefits of Modern Approach:**

1. **Type Safety:**
   - Works perfectly with TypeScript
   - Intellisense shows defaults

2. **Clarity:**
   - Defaults visible in function signature
   - No need to scroll to see defaults

3. **Conciseness:**
   - Less boilerplate code
   - Easier to maintain

**Required vs Optional Props:**

```jsx
// Clear distinction
function UserCard({
  name,           // Required (no default)
  email,          // Required
  age = 18,       // Optional (has default)
  role = "user"   // Optional
}) {
  // If name/email missing → component breaks (intentional)
  // age/role always have values
}
```

```jsx
// Default props with destructuring
function Button({ text = "Click me", variant = "primary", onClick }) {
    return (
        <button
            className={`btn btn-${variant}`}
            onClick={onClick}
        >
            {text}
        </button>
    );
}

// Using defaultProps (older approach)
function Card(props) {
    return (
        <div className={`card ${props.className}`}>
            <h3>{props.title}</h3>
            <p>{props.description}</p>
        </div>
    );
}

Card.defaultProps = {
    title: "Default Title",
    description: "Default description",
    className: ""
};

// Usage
function App() {
    return (
        <div>
            <Button text="Submit" variant="success" onClick={() => alert('Clicked!')} />
            <Button /> {/* Uses defaults */}
            <Card title="My Card" description="This is a card" />
            <Card /> {/* Uses defaults */}
        </div>
    );
}
```

### Real-world Use Case:
Setting sensible defaults prevents undefined errors and makes components easier to use.

---

## Example 3: Children Prop and Composition

**Children Prop** is React's powerful composition mechanism, allowing components to wrap and render arbitrary content passed between their tags. Unlike traditional props which pass specific data, children can include any valid JSX - text, elements, components, or combinations thereof. This enables flexible, reusable container components like layouts, modals, and cards that don't need to know their content in advance. Composition through children is React's answer to inheritance in object-oriented programming - instead of extending classes, you compose components. This pattern promotes loosely coupled, highly reusable components that can be combined in infinite ways.

```jsx
// Container component using children
function Card({ children, title }) {
    return (
        <div className="card">
            {title && <h2 className="card-title">{title}</h2>}
            <div className="card-content">
                {children}
            </div>
        </div>
    );
}

// Layout component
function Container({ children, maxWidth = "1200px" }) {
    return (
        <div style={{ maxWidth, margin: "0 auto", padding: "20px" }}>
            {children}
        </div>
    );
}

// Composition pattern
function Dashboard() {
    return (
        <Container maxWidth="1400px">
            <Card title="User Stats">
                <p>Users: 1,234</p>
                <p>Active: 890</p>
            </Card>

            <Card title="Revenue">
                <h3>$45,678</h3>
                <p>This month</p>
            </Card>

            <Card>
                <p>Content without a title</p>
            </Card>
        </Container>
    );
}
```

### Real-world Use Case:
Children prop enables flexible composition where components can wrap any content.

---

## Example 4: PropTypes for Type Checking

**PropTypes** provide runtime type validation for component props, catching type mismatches during development before they cause runtime errors in production. While TypeScript offers compile-time type checking, PropTypes remain useful in JavaScript codebases or as an additional runtime safety net. They serve as living documentation, making it immediately clear what props a component expects and whether they're required. PropTypes can validate primitive types, object shapes, arrays, functions, and even custom validation logic. The warnings appear only in development mode, so there's no performance cost in production builds.

```jsx
import PropTypes from 'prop-types';

function UserProfile({
    name,
    age,
    email,
    role,
    isActive,
    tags,
    onEdit
}) {
    return (
        <div className="user-profile">
            <h2>{name}</h2>
            <p>Age: {age}</p>
            <p>Email: {email}</p>
            <p>Role: {role}</p>
            <span className={isActive ? 'active' : 'inactive'}>
                {isActive ? 'Active' : 'Inactive'}
            </span>
            <div>
                {tags.map(tag => <span key={tag}>{tag}</span>)}
            </div>
            <button onClick={onEdit}>Edit</button>
        </div>
    );
}

UserProfile.propTypes = {
    name: PropTypes.string.isRequired,
    age: PropTypes.number.isRequired,
    email: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['admin', 'user', 'moderator']).isRequired,
    isActive: PropTypes.bool,
    tags: PropTypes.arrayOf(PropTypes.string),
    onEdit: PropTypes.func
};

UserProfile.defaultProps = {
    isActive: false,
    tags: [],
    onEdit: () => {}
};

// Usage
function App() {
    return (
        <UserProfile
            name="John Doe"
            age={28}
            email="john@example.com"
            role="admin"
            isActive={true}
            tags={['developer', 'react']}
            onEdit={() => console.log('Edit clicked')}
        />
    );
}
```

---

## Example 5: Advanced Prop Patterns

**Render Props** is an advanced pattern where a prop (typically named `render` or `children`) is a function that returns JSX. This enables sharing component logic while giving consumers full control over rendering. Before Hooks, render props were the primary way to share stateful logic between components. The component handles the complex logic (like data fetching, subscriptions, or state management) while delegating rendering to the consumer via the function prop. This inversion of control makes components extremely flexible - the same data fetching logic can render completely different UIs. While custom Hooks often replace render props in modern React, the pattern remains valuable for certain use cases.

```jsx
// Render props pattern
import { useState, useEffect } from 'react';

function DataFetcher({ url, render }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setData(data);
                setLoading(false);
            });
    }, [url]);

    return render({ data, loading });
}

// Usage
function App() {
    return (
        <DataFetcher
            url="https://api.example.com/users"
            render={({ data, loading }) => (
                loading ? <p>Loading...</p> : <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>
            )}
        />
    );
}

// Function as children pattern
function Toggle({ children }) {
    const [on, setOn] = useState(false);

    return children({
        on,
        toggle: () => setOn(!on)
    });
}

// Usage
function ToggleExample() {
    return (
        <Toggle>
            {({ on, toggle }) => (
                <div>
                    <button onClick={toggle}>
                        {on ? 'ON' : 'OFF'}
                    </button>
                    {on && <p>Content is visible!</p>}
                </div>
            )}
        </Toggle>
    );
}
```

---

## Common Pitfalls

### Pitfall 1: Mutating Props

```jsx
// WRONG - Never mutate props
function BadComponent(props) {
    props.user.name = "Modified"; // DON'T DO THIS
    props.items.push("new item"); // DON'T DO THIS

    return <div>{props.user.name}</div>;
}

// CORRECT - Create new objects/arrays
function GoodComponent(props) {
    const updatedUser = { ...props.user, name: "Modified" };
    const updatedItems = [...props.items, "new item"];

    return <div>{updatedUser.name}</div>;
}
```

### Pitfall 2: Using Props in Initial State Incorrectly

**useState, useEffect** - Demonstrates how `useState` initializes state and how `useEffect` synchronizes state with prop changes when needed.

```jsx
// PROBLEM - State won't update when props change
import { useState, useEffect } from 'react';

function Counter({ initialCount }) {
    const [count, setCount] = useState(initialCount);
    // count will always be the initial value, even if initialCount prop changes

    return <div>{count}</div>;
}

// SOLUTION 1 - If you truly want to initialize only
function CounterWithReset({ initialCount }) {
    const [count, setCount] = useState(initialCount);

    // Provide a way to reset
    const reset = () => setCount(initialCount);

    return (
        <div>
            {count}
            <button onClick={reset}>Reset</button>
        </div>
    );
}

// SOLUTION 2 - If you need to sync with prop changes
function SyncedCounter({ count: propCount }) {
    const [count, setCount] = useState(propCount);

    useEffect(() => {
        setCount(propCount);
    }, [propCount]);

    return <div>{count}</div>;
}
```

### Pitfall 3: Not Destructuring Props Early

```jsx
// Less readable
function UserCard(props) {
    return (
        <div>
            <h2>{props.user.name}</h2>
            <p>{props.user.email}</p>
            <p>{props.user.age}</p>
        </div>
    );
}

// Better - destructure early
function UserCard({ user }) {
    const { name, email, age } = user;

    return (
        <div>
            <h2>{name}</h2>
            <p>{email}</p>
            <p>{age}</p>
        </div>
    );
}

// Best - destructure in parameters
function UserCard({ user: { name, email, age } }) {
    return (
        <div>
            <h2>{name}</h2>
            <p>{email}</p>
            <p>{age}</p>
        </div>
    );
}
```

---

## Best Practices

### 1. Keep Components Small and Focused

**useState** - Used to manage component-level state. Breaking large components into smaller ones improves maintainability and reusability.

```jsx
// BAD - Component does too much
import { useState } from 'react';

function UserDashboard({ userId }) {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [comments, setComments] = useState([]);

    // Lots of logic...

    return (
        <div>
            {/* Lots of JSX */}
        </div>
    );
}

// GOOD - Break into smaller components
function UserDashboard({ userId }) {
    return (
        <div>
            <UserProfile userId={userId} />
            <UserPosts userId={userId} />
            <UserComments userId={userId} />
        </div>
    );
}

function UserProfile({ userId }) {
    // Only user profile logic
}

function UserPosts({ userId }) {
    // Only posts logic
}

function UserComments({ userId }) {
    // Only comments logic
}
```

### 2. Use Composition Over Conditionals

```jsx
// Less flexible
function Button({ isPrimary, isSecondary, isDanger }) {
    let className = 'btn';
    if (isPrimary) className += ' btn-primary';
    if (isSecondary) className += ' btn-secondary';
    if (isDanger) className += ' btn-danger';

    return <button className={className}>Click</button>;
}

// More flexible - composition
function Button({ variant = 'primary', children, ...props }) {
    return (
        <button className={`btn btn-${variant}`} {...props}>
            {children}
        </button>
    );
}

// Even better - separate components
function PrimaryButton({ children, ...props }) {
    return <Button variant="primary" {...props}>{children}</Button>;
}

function DangerButton({ children, ...props }) {
    return <Button variant="danger" {...props}>{children}</Button>;
}
```

### 3. Spread Props Carefully

```jsx
// Specific props with spread for extras
function Input({ label, error, ...inputProps }) {
    return (
        <div className="input-group">
            <label>{label}</label>
            <input {...inputProps} />
            {error && <span className="error">{error}</span>}
        </div>
    );
}

// Usage - all other props passed to input
<Input
    label="Username"
    type="text"
    placeholder="Enter username"
    required
    maxLength={20}
/>
```

---

## Real-world Scenarios

### Scenario 1: Reusable Form Components

**Reusable Form Inputs** demonstrate practical composition where a wrapper component enhances a basic HTML input with labels, error messages, and styling while remaining flexible through prop spreading. This pattern creates a consistent form UI across an entire application without duplicating markup. The `...props` spread operator forwards all additional props (type, placeholder, value, onChange, etc.) directly to the underlying input, maintaining full HTML input functionality while adding custom behavior. The separation between presentation (FormInput) and state management (LoginForm) follows best practices and makes both components easier to test and modify independently.

```jsx
function FormInput({ label, error, touched, ...props }) {
    const showError = error && touched;

    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <input
                className={`form-input ${showError ? 'error' : ''}`}
                {...props}
            />
            {showError && <span className="error-message">{error}</span>}
        </div>
    );
}

function LoginForm() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleBlur = (e) => {
        setTouched({ ...touched, [e.target.name]: true });
    };

    return (
        <form>
            <FormInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.email}
                touched={touched.email}
            />
            <FormInput
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
                touched={touched.password}
            />
        </form>
    );
}
```

### Scenario 2: Layout Components with Slots

```jsx
function PageLayout({ header, sidebar, children, footer }) {
    return (
        <div className="page-layout">
            <header className="page-header">
                {header}
            </header>
            <div className="page-content">
                {sidebar && (
                    <aside className="page-sidebar">
                        {sidebar}
                    </aside>
                )}
                <main className="page-main">
                    {children}
                </main>
            </div>
            {footer && (
                <footer className="page-footer">
                    {footer}
                </footer>
            )}
        </div>
    );
}

// Usage
function App() {
    return (
        <PageLayout
            header={<h1>My App</h1>}
            sidebar={<nav><a href="/">Home</a></nav>}
            footer={<p>&copy; 2024</p>}
        >
            <h2>Main Content</h2>
            <p>This is the main area</p>
        </PageLayout>
    );
}
```

### Scenario 3: Conditional Component Rendering

**Conditional Rendering** showcases how components can adapt their UI based on props, demonstrating React's flexibility. The Alert component accepts different `type` props to render contextually appropriate icons and styles - success, error, warning, or info. Optional props like `onClose` and `actions` enable features only when provided, making the component work in multiple scenarios without code duplication. The pattern of mapping prop values to display elements (like the icons object) is common in React for creating flexible, data-driven UIs. useState controls when to show/hide the alert, demonstrating state-driven conditional rendering with the `&&` operator.

```jsx
function Alert({ type = 'info', message, onClose, actions }) {
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    return (
        <div className={`alert alert-${type}`}>
            <span className="alert-icon">{icons[type]}</span>
            <div className="alert-content">
                <p>{message}</p>
                {actions && (
                    <div className="alert-actions">
                        {actions}
                    </div>
                )}
            </div>
            {onClose && (
                <button className="alert-close" onClick={onClose}>×</button>
            )}
        </div>
    );
}

// Usage
function App() {
    const [showAlert, setShowAlert] = useState(true);

    return (
        <div>
            {showAlert && (
                <Alert
                    type="success"
                    message="Operation completed successfully!"
                    onClose={() => setShowAlert(false)}
                    actions={
                        <>
                            <button>Undo</button>
                            <button>View Details</button>
                        </>
                    }
                />
            )}
        </div>
    );
}
```

---

## Interview Questions

### Q1: What is the difference between props and state?
**Answer:** Props are read-only data passed from parent to child, while state is mutable data managed within a component. Props are external configuration, state is internal data that can change over time.

### Q2: Can you modify props inside a component?
**Answer:** No, props are immutable. You should never modify props directly. If you need to work with prop values, either use them as-is or derive new values from them.

### Q3: What are children props?
**Answer:** The `children` prop is a special prop that contains the content between opening and closing tags of a component. It enables composition patterns.

### Q4: How do you pass a function as a prop?
**Answer:** Functions are passed like any other value: `<Component onClick={handleClick} />`. Be careful not to invoke the function: `onClick={handleClick}` not `onClick={handleClick()}`.

### Q5: What is prop drilling and how to avoid it?
**Answer:** Prop drilling is passing props through multiple levels of components. Avoid it using Context API, composition, or state management libraries.

---

## External Resources

- [React Docs: Components and Props](https://react.dev/learn/passing-props-to-a-component)
- [React Docs: Children](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [PropTypes Documentation](https://github.com/facebook/prop-types)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

[← Back to React](./README.md) | [Next: State and Lifecycle →](./02-state-lifecycle.md)
