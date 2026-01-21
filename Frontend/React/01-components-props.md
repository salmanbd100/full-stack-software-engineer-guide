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

### 💡 **Children Prop - React's Composition Superpower**

The `children` prop enables components to wrap and render arbitrary content passed between their opening and closing tags.

**How It Works:**

Unlike traditional props that pass specific data, `children` accepts any valid JSX:
- Text content
- React elements
- Other components
- Combinations of all above

**Key Characteristics:**

1. **Flexible Container Pattern:**
   - Component doesn't need to know its content in advance
   - Perfect for layouts, modals, cards, and wrappers
   - Enables "slots" for different content areas

2. **Composition Over Inheritance:**
   - React's answer to object-oriented inheritance
   - Compose components instead of extending classes
   - More flexible and maintainable

3. **Loose Coupling:**
   - Container logic separate from content
   - Components can be combined infinitely
   - Promotes reusability

**When to Use:**

| Use Case | Example Component |
|----------|------------------|
| **Layout wrappers** | Container, Grid, Section |
| **UI containers** | Card, Modal, Dialog |
| **Content wrappers** | ErrorBoundary, Suspense |
| **HOC patterns** | WithAuth, WithLoading |

**Composition vs Props:**

| Approach | When to Use | Flexibility |
|----------|-------------|-------------|
| **Children prop** | Unknown/varying content | ✅ High |
| **Regular props** | Known structure | ⚠️ Medium |
| **Multiple slots** | Complex layouts | ✅ Highest |

> **Key Insight:** The children prop transforms rigid components into flexible containers that can adapt to any content structure.

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

**Real-World Benefits:**
- ✅ Write container components once, reuse everywhere
- ✅ Parent controls content, child handles structure
- ✅ Easy to test and maintain
- ✅ No need for multiple prop variations

---

## Example 4: PropTypes for Type Checking

### 💡 **PropTypes - Runtime Type Safety**

PropTypes provide runtime validation for component props, catching type errors during development.

**How It Works:**

PropTypes validate props when the component receives them:
1. Check each prop against its defined type
2. Log warnings to console in development mode
3. No warnings or performance cost in production

**Key Characteristics:**

1. **Runtime Validation:**
   - Catches type errors during development
   - Warns about missing required props
   - Validates prop shapes and types

2. **Living Documentation:**
   - Makes prop expectations explicit
   - Self-documenting component interface
   - Easier onboarding for team members

3. **Flexible Validation:**
   - Primitive types (string, number, bool)
   - Complex types (object, array, function)
   - Custom validation functions
   - Shape validation for nested objects

**PropTypes vs TypeScript:**

| Feature | PropTypes | TypeScript |
|---------|-----------|------------|
| **Validation** | Runtime | Compile-time |
| **Setup** | Simple (just import) | Requires configuration |
| **Type Safety** | Warns at runtime | Prevents compilation |
| **Performance** | Dev-only warnings | No runtime cost |
| **Use Case** | JS codebases | Full type safety |

**When to Use PropTypes:**

- ✅ JavaScript codebases without TypeScript
- ✅ Additional runtime safety net
- ✅ Library/component development
- ✅ Quick prop documentation
- ❌ TypeScript projects (use TS types instead)

> **Key Insight:** PropTypes catch errors at runtime when TypeScript can't (like API responses or dynamic data), making them complementary tools rather than replacements.

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

### 💡 **Render Props - Logic Sharing Pattern**

A pattern where a prop is a function that returns JSX, enabling logic reuse with full rendering control.

**How It Works:**

**Step 1: Component Handles Logic**
- Manages state, side effects, or data fetching
- Encapsulates complex behavior

**Step 2: Delegates Rendering**
- Calls the render function prop
- Passes data/functions as arguments

**Step 3: Consumer Controls UI**
- Receives data from component
- Renders custom UI with that data

```
Component Logic → Render Function → Consumer UI
```

**Key Characteristics:**

1. **Separation of Concerns:**
   - Logic in one component
   - Presentation in another
   - Reusable logic with different UIs

2. **Inversion of Control:**
   - Component controls when to render
   - Consumer controls what to render
   - Maximum flexibility

3. **Pattern Evolution:**
   - Pre-Hooks: Primary logic sharing pattern
   - Post-Hooks: Custom Hooks often preferred
   - Still useful for specific scenarios

**Render Props vs Custom Hooks:**

| Feature | Render Props | Custom Hooks |
|---------|-------------|--------------|
| **Syntax** | JSX-based | JavaScript-based |
| **Readability** | Can nest deeply | Flat, cleaner |
| **Use Case** | Visual logic sharing | Any logic sharing |
| **Modern Usage** | ⚠️ Less common | ✅ Preferred |

**When to Use Render Props:**

- ✅ Sharing visual component logic
- ✅ Animation/transition libraries
- ✅ Complex conditional rendering
- ❌ Simple state logic (use custom hooks)
- ❌ Non-visual logic (use custom hooks)

**Common Variations:**

| Pattern | Syntax | Use Case |
|---------|--------|----------|
| **render prop** | `<Comp render={() => <UI />} />` | Explicit render |
| **children as function** | `<Comp>{() => <UI />}</Comp>` | Cleaner syntax |
| **named slots** | `<Comp header={() => <H />} />` | Multiple renders |

> **Key Insight:** While custom Hooks have largely replaced render props for logic sharing, render props remain valuable when you need to control rendering timing or share visual component patterns.

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

### ❌ Pitfall 1: Mutating Props

**The Problem:**

Props are read-only and should never be modified directly.

**Why This Breaks:**
- Violates React's unidirectional data flow
- Causes unpredictable re-renders
- Makes debugging extremely difficult
- Breaks React's optimization strategies

**❌ Wrong Approach:**

```jsx
function BadComponent(props) {
    // DON'T - Direct mutation
    props.user.name = "Modified";
    props.items.push("new item");

    return <div>{props.user.name}</div>;
}
```

**Problems:**
- Mutates parent's data
- Side effects outside component
- React won't detect changes
- Other components using same data break

**✅ Correct Approach:**

```jsx
function GoodComponent(props) {
    // Create new objects/arrays
    const updatedUser = { ...props.user, name: "Modified" };
    const updatedItems = [...props.items, "new item"];

    return <div>{updatedUser.name}</div>;
}
```

**Benefits:**
- ✅ Preserves original data
- ✅ Predictable behavior
- ✅ React detects changes properly
- ✅ Easy to debug

> **Key Rule:** Treat all props as immutable. Always create new objects/arrays rather than modifying existing ones.

### ⚠️ Pitfall 2: Using Props in Initial State Incorrectly

**The Problem:**

`useState` only uses its initial value on first render - subsequent prop changes are ignored.

**Common Mistake:**

```jsx
import { useState, useEffect } from 'react';

// ❌ Problem - State won't update when props change
function Counter({ initialCount }) {
    const [count, setCount] = useState(initialCount);
    // count stays at first initialCount value forever

    return <div>{count}</div>;
}
```

**Why This Happens:**
- `useState` initializes only once (on mount)
- Changing `initialCount` prop won't update `count` state
- Creates a "stale state" problem

**Solutions (Pick Based on Intent):**

**✅ Solution 1: Truly One-Time Initialization**

When you want to initialize once and let internal state diverge:

```jsx
function CounterWithReset({ initialCount }) {
    const [count, setCount] = useState(initialCount);

    // Provide explicit reset functionality
    const reset = () => setCount(initialCount);

    return (
        <div>
            {count}
            <button onClick={reset}>Reset</button>
        </div>
    );
}
```

**Use When:**
- ✅ Initial value is just a starting point
- ✅ Component manages its own state afterward
- ✅ Parent doesn't control subsequent values

**✅ Solution 2: Sync with Prop Changes**

When you need state to update with prop changes:

```jsx
function SyncedCounter({ count: propCount }) {
    const [count, setCount] = useState(propCount);

    useEffect(() => {
        setCount(propCount);
    }, [propCount]);

    return <div>{count}</div>;
}
```

**Use When:**
- ✅ Parent controls the value
- ✅ Need local state for transitions/animations
- ✅ Temporary state before committing

**✅ Solution 3: No State Needed (Best)**

Often, you don't need state at all:

```jsx
function Counter({ count }) {
    // Just use the prop directly
    return <div>{count}</div>;
}
```

**Decision Guide:**

| Scenario | Solution |
|----------|----------|
| Value changes, UI must sync | Use prop directly (no state) |
| Initialize once, then independent | useState with initial prop |
| Sync with prop changes | useState + useEffect |
| Parent fully controls | Controlled component pattern |

> **Key Insight:** Most of the time, you don't need to copy props to state. Use state only when you need to modify or manipulate the value independently.

### ⚠️ Pitfall 3: Not Destructuring Props Early

**The Problem:**

Repetitive `props.` prefix makes code verbose and harder to read.

**❌ Less Readable:**

```jsx
function UserCard(props) {
    return (
        <div>
            <h2>{props.user.name}</h2>
            <p>{props.user.email}</p>
            <p>{props.user.age}</p>
        </div>
    );
}
```

**Issues:**
- Verbose and repetitive
- Harder to see what props are used
- More typing, more mistakes

**✅ Better - Destructure Early:**

```jsx
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
```

**✅ Best - Destructure in Parameters:**

```jsx
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

**Comparison:**

| Approach | Readability | Clarity | Best For |
|----------|-------------|---------|----------|
| **props.x** | ❌ Poor | ⚠️ Low | Never use |
| **Early destructure** | ✅ Good | ✅ Clear | Complex logic |
| **Parameter destructure** | ✅ Best | ✅ Explicit | Simple components |

**Benefits of Destructuring:**
- ✅ Cleaner, more readable code
- ✅ Clear prop dependencies at a glance
- ✅ Easier to spot unused props
- ✅ Better IDE autocomplete
- ✅ Less typing

> **Key Tip:** Destructure props in the function signature for simple components, or early in the function body when you need to do additional processing first.

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

### 💡 **Pattern: Composable Form Inputs**

Build consistent form UIs by wrapping native inputs with enhanced functionality.

**How This Pattern Works:**

**Step 1: Wrapper Component**
- Adds labels, error messages, styling
- Uses prop spreading for flexibility
- Maintains native input functionality

**Step 2: Prop Spreading**
- `...props` forwards all additional props
- Keeps full HTML input capabilities
- No need to list every possible prop

**Step 3: State Management**
- Parent (LoginForm) manages state
- Child (FormInput) handles presentation
- Clean separation of concerns

**Benefits:**
- ✅ Consistent UI across entire app
- ✅ No duplicated markup
- ✅ Easy to test components separately
- ✅ Change styling in one place
- ✅ Add new features without breaking existing forms

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

### 💡 **Pattern: Flexible Alert Component**

Build adaptive components that render different UIs based on props.

**How This Pattern Works:**

**Step 1: Type-Based Rendering**
- Accept `type` prop (success, error, warning, info)
- Map types to icons and styles
- Data-driven UI decisions

**Step 2: Optional Features**
- Render `onClose` button only when provided
- Show `actions` section conditionally
- Component adapts to available props

**Step 3: State-Driven Visibility**
- `useState` controls show/hide
- `&&` operator for conditional rendering
- Clean, declarative logic

**Key Patterns:**

| Pattern | Syntax | Use Case |
|---------|--------|----------|
| **Conditional render** | `{condition && <Component />}` | Show/hide element |
| **Ternary** | `{condition ? <A /> : <B />}` | Either/or choice |
| **Map-based** | `icons[type]` | Multiple options |
| **Optional chaining** | `{actions && <div>{actions}</div>}` | Optional content |

**Benefits:**
- ✅ One component, multiple use cases
- ✅ No code duplication
- ✅ Easy to extend with new types
- ✅ Props control all behavior
- ✅ Testable in isolation

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

**Answer:**

| Aspect | Props | State |
|--------|-------|-------|
| **Mutability** | ❌ Read-only (immutable) | ✅ Mutable (via setState) |
| **Source** | Passed from parent | Managed within component |
| **Purpose** | External configuration | Internal data that changes |
| **Changes** | Parent re-renders | setState triggers re-render |
| **Ownership** | Owned by parent | Owned by component |

**Key Difference:** Props are external inputs controlled by the parent, while state is internal data that the component manages itself.

### Q2: Can you modify props inside a component?

**Answer:** No, props are immutable and must never be modified.

**❌ Wrong:**
```jsx
function Bad({ user }) {
    user.name = "Changed"; // NEVER do this
}
```

**✅ Correct:**
```jsx
function Good({ user }) {
    const updated = { ...user, name: "Changed" }; // Create new object
}
```

**Why:** Mutating props breaks React's unidirectional data flow, causes unpredictable re-renders, and makes debugging impossible.

### Q3: What are children props?

**Answer:** The `children` prop is a special prop containing content between component tags.

**How It Works:**
```jsx
<Card>
    <h1>Title</h1>     {/* This becomes children */}
    <p>Content</p>
</Card>

function Card({ children }) {
    return <div className="card">{children}</div>;
}
```

**Use Cases:**
- Layout components (Container, Grid)
- Wrapper components (Modal, Card)
- Composition patterns (HOCs, Providers)

### Q4: How do you pass a function as a prop?

**Answer:** Pass the function reference, don't invoke it.

**✅ Correct:**
```jsx
<Button onClick={handleClick} />        // Pass reference
<Button onClick={() => handleClick()} /> // Arrow function wrapper
```

**❌ Wrong:**
```jsx
<Button onClick={handleClick()} />  // Invokes immediately!
```

**Why:** `handleClick()` calls the function during render, not on click. You want to pass the function to be called later.

### Q5: What is prop drilling and how to avoid it?

**Answer:** Prop drilling is passing props through multiple component levels that don't use them.

**The Problem:**
```jsx
<App> → <Page> → <Section> → <Component>
         ↓         ↓            ↓
      (unused)  (unused)    (uses data)
```

**Solutions:**

| Solution | When to Use | Example |
|----------|-------------|---------|
| **Context API** | Global app state | Theme, auth |
| **Composition** | UI structure | Children pattern |
| **State Management** | Complex state | Redux, Zustand |
| **Component Colocation** | Move component closer | Reduce nesting |

**Best Practice:** If props pass through more than 2-3 levels unused, consider refactoring.

---

## External Resources

- [React Docs: Components and Props](https://react.dev/learn/passing-props-to-a-component)
- [React Docs: Children](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [PropTypes Documentation](https://github.com/facebook/prop-types)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

[← Back to React](./README.md) | [Next: State and Lifecycle →](./02-state-lifecycle.md)
