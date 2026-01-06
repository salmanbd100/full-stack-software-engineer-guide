# Performance Hooks (React 18)

## Understanding React Performance Optimization

**Performance hooks** are React's built-in tools for optimizing component rendering and preventing unnecessary computations. They're essential for building responsive applications that handle complex UIs and large datasets efficiently.

## Why Performance Optimization Matters

**Interview Perspective:**
- Frequently asked in mid to senior React interviews
- Demonstrates understanding of React's rendering model
- Tests knowledge of when and how to optimize (not just knowing the APIs)
- Critical for positions involving large-scale applications
- Shows ability to balance performance vs code complexity

**Real-World Importance:**
- **User Experience**: Fast, responsive UIs keep users engaged
- **Scalability**: Proper optimization prevents performance degradation as apps grow
- **Resource Efficiency**: Reduces CPU usage and battery drain on mobile devices
- **Business Impact**: Slow apps lead to higher bounce rates and lost revenue
- **Cost Savings**: Better performance means lower server costs and bandwidth usage

## Core Concepts Overview

### Performance Optimization Tools

| Tool | Purpose | Returns | When to Use |
|------|---------|---------|------------|
| `React.memo()` | Prevent component re-renders | Memoized component | Expensive components with stable props |
| `useMemo()` | Cache computed values | Memoized value | Complex calculations, object/array creation |
| `useCallback()` | Cache function references | Memoized function | Functions passed to memoized children |
| `useTransition()` | Mark updates as non-urgent | `[isPending, startTransition]` | Heavy UI updates (filters, tabs) |
| `useDeferredValue()` | Defer expensive updates | Deferred value | Expensive child components |

### React 18 Enhancements

**Automatic Batching:**
- All state updates are batched (even in async code)
- Reduces re-renders without code changes
- Backward compatible with React 17

**Concurrent Features:**
- `useTransition()` - Keep UI responsive during heavy updates
- `useDeferredValue()` - Automatically defer expensive computations
- Enables better user experience without complexity

## Key Principles

### ✅ Do:
- Profile before optimizing (use React DevTools Profiler)
- Optimize components that render frequently
- Optimize expensive calculations (loops, filtering large arrays)
- Memoize objects/arrays passed to memoized children
- Use React 18 concurrent features for heavy UIs

### ❌ Don't:
- Optimize prematurely (profile first!)
- Memoize simple arithmetic or string operations
- Use memo() on every component
- Forget to include all dependencies
- Micro-optimize at the cost of code readability

---

## Example 1: React.memo()

### 💡 **React.memo - Component Memoization**

React.memo() is a higher-order component that prevents re-renders when props haven't changed.

**How It Works:**

```
Parent renders
     ↓
React checks if Child's props changed
     ↓
Props same? → Reuse previous render (skip)
Props different? → Re-render component
```

**When to Use React.memo():**

**✅ Good Candidates:**
- Components that render often with same props
- Components with expensive rendering (complex JSX, many children)
- Leaf components in large component trees
- List items that rarely change

**❌ Poor Candidates:**
- Components that always receive different props
- Simple components (div with text)
- Components that rarely render
- Components where props change frequently

**Performance Impact:**

| Scenario | Without memo | With memo | Benefit |
|----------|-------------|-----------|---------|
| Props unchanged | Re-renders | Skips render | ✅ Significant |
| Props changed | Re-renders | Re-renders + comparison overhead | ❌ Slightly worse |
| Simple component | Fast re-render | Comparison overhead | ❌ Net negative |

**How Props Comparison Works:**

React.memo uses **shallow comparison** by default:
- Primitives: Compared by value (`5 === 5`, `'hi' === 'hi'`)
- Objects/Arrays: Compared by reference (same memory address)
- Functions: Compared by reference (recreated = different)

```jsx
import { memo } from 'react';

// Basic memo usage
const ExpensiveComponent = memo(function ExpensiveComponent({ name, count }) {
    console.log('Rendering ExpensiveComponent');

    // Expensive operation
    const processedData = expensiveCalculation(count);

    return (
        <div>
            <h2>{name}</h2>
            <p>Count: {count}</p>
            <p>Processed: {processedData}</p>
        </div>
    );
});

function expensiveCalculation(num) {
    // Simulate expensive work
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
        result += num;
    }
    return result;
}

// With custom comparison function
const SmartComponent = memo(
    function SmartComponent({ user, metadata }) {
        return (
            <div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Return true if props are equal (skip render)
        // Return false if props are different (allow render)

        // Only compare user.id - ignore other changes
        return prevProps.user.id === nextProps.user.id;
    }
);

// Usage example
function ParentComponent() {
    const [count, setCount] = useState(0);
    const [text, setText] = useState('');
    const [user] = useState({ name: 'Alice', count: 5 });

    return (
        <div>
            {/* This input causes parent to re-render */}
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
            />

            {/* Without memo: ExpensiveComponent re-renders on every keystroke */}
            {/* With memo: Only re-renders when name or count change */}
            <ExpensiveComponent
                name={user.name}
                count={user.count}
            />

            <button onClick={() => setCount(count + 1)}>
                Parent Count: {count}
            </button>
        </div>
    );
}
```

**Custom Comparison Gotcha:**

⚠️ **Important:** The comparison function works opposite to most comparators:
- Return `true` = props are equal = **skip render**
- Return `false` = props are different = **allow render**

---

## Example 2: useMemo()

### 💡 **useMemo - Value Memoization**

Caches the result of expensive calculations, recalculating only when dependencies change.

**How It Works:**

```
Component renders
     ↓
Check if dependencies changed
     ↓
Dependencies same? → Return cached value
Dependencies changed? → Run calculation, cache and return new value
```

**When to Use useMemo():**

| Scenario | Use useMemo? | Reason |
|----------|--------------|--------|
| Filtering/sorting large arrays (100+ items) | ✅ Yes | Expensive operation |
| Complex calculations (nested loops) | ✅ Yes | CPU intensive |
| Creating objects passed to memoized children | ✅ Yes | Prevents unnecessary re-renders |
| Simple arithmetic (`a + b`) | ❌ No | Overhead not worth it |
| String concatenation | ❌ No | Very fast operation |
| Accessing object properties | ❌ No | Negligible cost |

**Performance Comparison:**

```javascript
// Without useMemo: Runs EVERY render
function SlowComponent({ items, filter }) {
    // This runs on EVERY render, even if items/filter unchanged!
    const filtered = items.filter(item => item.category === filter);
    // With 10,000 items, this is slow!

    return <List items={filtered} />;
}

// With useMemo: Runs only when dependencies change
function FastComponent({ items, filter }) {
    // Only recalculates when items or filter change
    const filtered = useMemo(() => {
        return items.filter(item => item.category === filter);
    }, [items, filter]);

    return <List items={filtered} />;
}
```

**Common Use Cases:**

1. **Expensive Calculations:**
   - Filtering/sorting large datasets
   - Complex mathematical operations
   - Data transformations

2. **Object/Array Creation for Memoized Components:**
   ```jsx
   // ❌ Bad: New object every render → Child re-renders
   <MemoizedChild config={{ theme: 'dark', size: 'large' }} />

   // ✅ Good: Same object → Child skips render
   const config = useMemo(() => ({ theme: 'dark', size: 'large' }), []);
   <MemoizedChild config={config} />
   ```

3. **Derived State:**
   ```jsx
   const total = useMemo(() => {
       return items.reduce((sum, item) => sum + item.price, 0);
   }, [items]);
   ```

```jsx
import { useState, useMemo } from 'react';

function ProductList() {
    const [products] = useState(generateProducts(10000)); // Large dataset
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });

    // Without useMemo, this would run on EVERY render
    // (including when typing in the search box)
    const filteredAndSortedProducts = useMemo(() => {
        console.log('Filtering and sorting...'); // Only logs when deps change

        let result = products;

        // Filter by search term
        if (searchTerm) {
            result = result.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by price range
        result = result.filter(p =>
            p.price >= priceRange.min && p.price <= priceRange.max
        );

        // Sort
        result = result.sort((a, b) => {
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            return a.price - b.price;
        });

        return result;
    }, [products, searchTerm, sortBy, priceRange]);

    // Derived value - also memoized
    const stats = useMemo(() => ({
        total: filteredAndSortedProducts.length,
        avgPrice: filteredAndSortedProducts.reduce((sum, p) => sum + p.price, 0)
            / filteredAndSortedProducts.length || 0,
        maxPrice: Math.max(...filteredAndSortedProducts.map(p => p.price)),
        minPrice: Math.min(...filteredAndSortedProducts.map(p => p.price))
    }), [filteredAndSortedProducts]);

    return (
        <div>
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
            />

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
            </select>

            <div>
                <p>Found: {stats.total} products</p>
                <p>Average Price: ${stats.avgPrice.toFixed(2)}</p>
                <p>Price Range: ${stats.minPrice} - ${stats.maxPrice}</p>
            </div>

            <ul>
                {filteredAndSortedProducts.map(product => (
                    <li key={product.id}>
                        {product.name} - ${product.price}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function generateProducts(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `Product ${i}`,
        price: Math.random() * 1000,
        category: ['electronics', 'clothing', 'food'][i % 3]
    }));
}
```

**Dependencies Array Rules:**

✅ **Include all values used in the calculation:**
```javascript
const filtered = useMemo(() => {
    return items.filter(item => item.price > minPrice);
}, [items, minPrice]); // Both items and minPrice must be in deps
```

❌ **Don't omit dependencies:**
```javascript
const filtered = useMemo(() => {
    return items.filter(item => item.price > minPrice);
}, [items]); // ❌ Missing minPrice - stale closure bug!
```

---

## Example 3: useCallback()

### 💡 **useCallback - Function Memoization**

Memoizes function references to prevent child component re-renders.

**Why useCallback Exists:**

JavaScript creates a **new function instance** on every render:

```javascript
function Parent() {
    // Every render: NEW function, different reference
    const handleClick = () => console.log('clicked');

    // This causes memoized children to re-render!
    return <MemoizedChild onClick={handleClick} />;
}
```

**useCallback vs useMemo:**

| Feature | useCallback | useMemo |
|---------|-------------|---------|
| **What it memoizes** | The function itself | The return value |
| **Returns** | Function reference | Any value |
| **Syntax** | `useCallback(fn, deps)` | `useMemo(() => value, deps)` |
| **Equivalent to** | `useMemo(() => fn, deps)` | - |
| **Use case** | Passing to memoized components | Expensive calculations |

**When to Use useCallback:**

✅ **Good Use Cases:**
- Functions passed to memoized child components
- Functions used in dependency arrays of other hooks
- Event handlers in optimized lists
- Callbacks passed to third-party libraries

❌ **Poor Use Cases:**
- Simple inline event handlers (not passed to children)
- Functions that don't cause performance issues
- Every function (premature optimization)

```jsx
import { useState, useCallback, memo } from 'react';

// Memoized child component
const TodoItem = memo(function TodoItem({ todo, onToggle, onDelete }) {
    console.log('Rendering TodoItem:', todo.id);

    return (
        <li>
            <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
            />
            <span style={{
                textDecoration: todo.completed ? 'line-through' : 'none'
            }}>
                {todo.text}
            </span>
            <button onClick={() => onDelete(todo.id)}>Delete</button>
        </li>
    );
});

function TodoList() {
    const [todos, setTodos] = useState([
        { id: 1, text: 'Learn React', completed: false },
        { id: 2, text: 'Master hooks', completed: false },
        { id: 3, text: 'Build projects', completed: false }
    ]);
    const [newTodo, setNewTodo] = useState('');

    // ❌ WITHOUT useCallback:
    // New function every render → All TodoItems re-render
    // const handleToggle = (id) => {
    //     setTodos(prev => prev.map(todo =>
    //         todo.id === id ? { ...todo, completed: !todo.completed } : todo
    //     ));
    // };

    // ✅ WITH useCallback:
    // Same function reference → Only changed TodoItems re-render
    const handleToggle = useCallback((id) => {
        setTodos(prev => prev.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    }, []); // No dependencies - function never changes

    const handleDelete = useCallback((id) => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
    }, []);

    const handleAdd = useCallback(() => {
        if (newTodo.trim()) {
            setTodos(prev => [...prev, {
                id: Date.now(),
                text: newTodo,
                completed: false
            }]);
            setNewTodo('');
        }
    }, [newTodo]); // Depends on newTodo

    return (
        <div>
            <h2>Todo List</h2>

            <div>
                <input
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="Add new todo..."
                />
                <button onClick={handleAdd}>Add</button>
            </div>

            <ul>
                {todos.map(todo => (
                    <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                    />
                ))}
            </ul>
        </div>
    );
}
```

**Performance Impact:**

```
Without useCallback:
- Type in newTodo input
- Parent re-renders
- New handleToggle function created
- All TodoItems re-render (even though their data unchanged)

With useCallback:
- Type in newTodo input
- Parent re-renders
- Same handleToggle reference (memoized)
- TodoItems skip re-render (props haven't changed)
```

---

## Example 4: useTransition (React 18)

### 💡 **useTransition - Non-Urgent Updates**

Mark state updates as non-urgent, keeping the UI responsive during heavy operations.

**The Problem:**

Heavy state updates (filtering 10,000 items) block the UI:
- Input becomes laggy
- User can't interact
- App feels frozen

**The Solution:**

```
User types → Update input immediately (urgent)
          ↓
          Filter data in background (non-urgent)
          ↓
          UI stays responsive!
```

**How useTransition Works:**

```javascript
const [isPending, startTransition] = useTransition();

// Urgent update (happens immediately)
setQuery(value);

// Non-urgent update (can be interrupted)
startTransition(() => {
    setResults(filtered);
});
```

**When to Use:**

| Scenario | Use useTransition? |
|----------|-------------------|
| Heavy filtering/sorting | ✅ Yes |
| Tab switching with slow content | ✅ Yes |
| Complex UI updates | ✅ Yes |
| Simple state updates | ❌ No |
| API calls | ❌ No (use loading state) |

```jsx
import { useState, useTransition } from 'react';

function SearchWithTransition() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isPending, startTransition] = useTransition();

    const largeDataset = generateLargeDataset(10000);

    const handleSearch = (e) => {
        const value = e.target.value;

        // URGENT: Update input immediately
        // This happens synchronously - input stays responsive
        setQuery(value);

        // NON-URGENT: Filter in background
        // This can be interrupted if user types again
        startTransition(() => {
            const filtered = largeDataset.filter(item =>
                item.name.toLowerCase().includes(value.toLowerCase())
            );
            setResults(filtered);
        });
    };

    return (
        <div>
            <input
                type="text"
                value={query}
                onChange={handleSearch}
                placeholder="Search 10,000 items..."
            />

            {/* Show pending state */}
            {isPending && <span style={{ color: 'gray' }}>Updating...</span>}

            {/* Visual feedback during transition */}
            <div style={{ opacity: isPending ? 0.6 : 1 }}>
                <p>Found {results.length} results</p>
                {results.slice(0, 50).map(item => (
                    <div key={item.id}>{item.name}</div>
                ))}
            </div>
        </div>
    );
}

// Tab switching example
function TabsWithTransition() {
    const [tab, setTab] = useState('home');
    const [isPending, startTransition] = useTransition();

    const switchTab = (newTab) => {
        // Mark tab switch as non-urgent
        // Button click is responsive even if content is slow
        startTransition(() => {
            setTab(newTab);
        });
    };

    return (
        <div>
            <button onClick={() => switchTab('home')}>Home</button>
            <button onClick={() => switchTab('profile')}>Profile</button>
            <button onClick={() => switchTab('settings')}>Settings</button>

            {isPending && <div>Loading tab...</div>}

            {/* Slow tab content won't block button clicks */}
            <div style={{ opacity: isPending ? 0.5 : 1 }}>
                {tab === 'home' && <SlowHomeTab />}
                {tab === 'profile' && <SlowProfileTab />}
                {tab === 'settings' && <SlowSettingsTab />}
            </div>
        </div>
    );
}

function SlowHomeTab() {
    // Simulate slow rendering
    const items = Array.from({ length: 1000 }, (_, i) => i);
    return <div>{items.map(i => <p key={i}>Item {i}</p>)}</div>;
}

function SlowProfileTab() {
    return <div>Profile Content</div>;
}

function SlowSettingsTab() {
    return <div>Settings Content</div>;
}

function generateLargeDataset(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`
    }));
}
```

---

## Example 5: useDeferredValue (React 18)

### 💡 **useDeferredValue - Automatic Deferral**

Automatically defer expensive updates while keeping the UI responsive.

**useTransition vs useDeferredValue:**

| Feature | useTransition | useDeferredValue |
|---------|---------------|------------------|
| **Control** | You decide what to defer | React defers automatically |
| **Loading State** | `isPending` provided | Check manually (`value !== deferredValue`) |
| **Use Case** | Actions (clicks, form submit) | Values (search input) |
| **Syntax** | Wrap setState in startTransition | Wrap the value |

**How It Works:**

```
User types "hello"
     ↓
query = "h" → deferredQuery = "" (old)
     ↓
query = "he" → deferredQuery = "h" (catching up)
     ↓
query = "hel" → deferredQuery = "he" (catching up)
     ↓
User stops typing
     ↓
deferredQuery = "hel" (synced)
```

```jsx
import { useState, useDeferredValue, memo } from 'react';

function SearchWithDeferred() {
    const [query, setQuery] = useState('');

    // Deferred version lags behind actual query
    // Updates after urgent renders complete
    const deferredQuery = useDeferredValue(query);

    // Check if deferred value is stale
    const isStale = query !== deferredQuery;

    return (
        <div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
            />

            {isStale && <span style={{ color: 'gray' }}>Updating...</span>}

            {/* ExpensiveList uses deferred query */}
            {/* Won't block input from being responsive */}
            <ExpensiveList query={deferredQuery} isStale={isStale} />
        </div>
    );
}

// Memoized to prevent unnecessary re-renders
const ExpensiveList = memo(function ExpensiveList({ query, isStale }) {
    const items = generateLargeDataset(10000);

    const filtered = items.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div style={{ opacity: isStale ? 0.6 : 1 }}>
            <p>Found {filtered.length} results</p>
            {filtered.slice(0, 50).map(item => (
                <div key={item.id}>{item.name}</div>
            ))}
        </div>
    );
});

function generateLargeDataset(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `Product ${i}`
    }));
}
```

---

## Common Mistakes

### Mistake 1: Premature Optimization

**The Problem:** Using performance hooks everywhere without measuring impact.

```jsx
// ❌ Bad: Unnecessary memoization
function SimpleComponent({ name }) {
    // Memoizing simple string concatenation - overhead not worth it!
    const greeting = useMemo(() => `Hello, ${name}!`, [name]);

    return <div>{greeting}</div>;
}

// ✅ Good: No optimization needed
function SimpleComponent({ name }) {
    // This is so fast, memoization just adds overhead
    const greeting = `Hello, ${name}!`;

    return <div>{greeting}</div>;
}
```

**Solution:** Profile first, optimize second. Use React DevTools Profiler to identify actual bottlenecks.

### Mistake 2: Missing Dependencies

**The Problem:** Omitting values from dependency arrays causes stale closures.

```jsx
// ❌ Bad: Missing dependency
function Counter({ increment }) {
    const [count, setCount] = useState(0);

    const handleClick = useCallback(() => {
        setCount(count + increment); // Uses stale 'count'!
    }, [increment]); // Missing 'count' in deps

    return <button onClick={handleClick}>{count}</button>;
}

// ✅ Good: Use functional update
function Counter({ increment }) {
    const [count, setCount] = useState(0);

    const handleClick = useCallback(() => {
        setCount(prev => prev + increment); // Always current value
    }, [increment]);

    return <button onClick={handleClick}>{count}</button>;
}
```

**Solution:** Always include all dependencies or use ESLint plugin `eslint-plugin-react-hooks`.

### Mistake 3: Using useCallback Without memo

**The Problem:** useCallback alone doesn't prevent re-renders.

```jsx
// ❌ Bad: useCallback without memo - child still re-renders!
const Child = ({ onClick }) => {
    console.log('Child rendered');
    return <button onClick={onClick}>Click</button>;
};

function Parent() {
    const [count, setCount] = useState(0);

    // This doesn't help if Child isn't memoized!
    const handleClick = useCallback(() => {
        setCount(c => c + 1);
    }, []);

    return <Child onClick={handleClick} />;
}

// ✅ Good: Child is memoized
const Child = memo(({ onClick }) => {
    console.log('Child rendered');
    return <button onClick={onClick}>Click</button>;
});

function Parent() {
    const [count, setCount] = useState(0);

    const handleClick = useCallback(() => {
        setCount(c => c + 1);
    }, []);

    return <Child onClick={handleClick} />;
}
```

**Solution:** Only use useCallback for functions passed to memoized components.

---

## Best Practices

### 1. Profile Before Optimizing

**Use React DevTools Profiler** to identify actual performance issues.

```jsx
// 1. Open React DevTools
// 2. Click "Profiler" tab
// 3. Click record button
// 4. Interact with your app
// 5. Stop recording
// 6. Analyze which components render most/slowest
```

**Look for:**
- Components that render frequently
- Components with long render times
- Unnecessary re-renders
- Components deep in the tree that render often

### 2. Start with Component Structure

**Before reaching for performance hooks, consider:**

```jsx
// ❌ Poor structure: Single large component
function Dashboard() {
    const [users, setUsers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [comments, setComments] = useState([]);
    // ... lots of state

    return (
        <div>
            {/* Lots of JSX */}
        </div>
    );
}

// ✅ Better structure: Split into focused components
function Dashboard() {
    return (
        <div>
            <UserSection />
            <PostsSection />
            <CommentsSection />
        </div>
    );
}

// Each section manages its own state
// Changes in UserSection don't affect PostsSection
```

### 3. Use the Right Tool for the Job

**Decision Tree:**

```
Need to prevent component re-render?
├─ Yes → Use React.memo()
└─ No
   ├─ Expensive calculation?
   │  └─ Yes → Use useMemo()
   └─ Function passed to memoized child?
      └─ Yes → Use useCallback()
```

### 4. Memoize Objects/Arrays Passed to Memoized Children

```jsx
// ❌ Bad: New object every render
const MemoizedChild = memo(Child);

function Parent() {
    return <MemoizedChild config={{ theme: 'dark' }} />; // New object!
}

// ✅ Good: Stable object reference
function Parent() {
    const config = useMemo(() => ({ theme: 'dark' }), []);
    return <MemoizedChild config={config} />;
}
```

---

## Real-World Scenario

### Optimized Data Table

**Complete example combining all performance techniques:**

```jsx
import { useState, useMemo, useCallback, memo } from 'react';

// Memoized table row component
const TableRow = memo(function TableRow({ row, onEdit, onDelete }) {
    console.log('Rendering row:', row.id);

    return (
        <tr>
            <td>{row.name}</td>
            <td>{row.email}</td>
            <td>{row.role}</td>
            <td>
                <button onClick={() => onEdit(row.id)}>Edit</button>
                <button onClick={() => onDelete(row.id)}>Delete</button>
            </td>
        </tr>
    );
});

function DataTable() {
    const [data] = useState(generateData(1000)); // Large dataset
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [filterRole, setFilterRole] = useState('all');

    // Memoize expensive filtering and sorting
    const filteredData = useMemo(() => {
        console.log('Filtering data...');

        let result = data;

        // Filter by search
        if (searchTerm) {
            result = result.filter(row =>
                row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by role
        if (filterRole !== 'all') {
            result = result.filter(row => row.role === filterRole);
        }

        // Sort
        result = result.sort((a, b) =>
            a[sortBy].localeCompare(b[sortBy])
        );

        return result;
    }, [data, searchTerm, sortBy, filterRole]);

    // Memoize callbacks for stable references
    const handleEdit = useCallback((id) => {
        console.log('Edit:', id);
        // Edit logic here
    }, []);

    const handleDelete = useCallback((id) => {
        console.log('Delete:', id);
        // Delete logic here
    }, []);

    return (
        <div>
            <div className="filters">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                />

                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="name">Sort by Name</option>
                    <option value="email">Sort by Email</option>
                    <option value="role">Sort by Role</option>
                </select>

                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="guest">Guest</option>
                </select>
            </div>

            <p>Showing {filteredData.length} of {data.length} rows</p>

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredData.map(row => (
                        <TableRow
                            key={row.id}
                            row={row}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function generateData(count) {
    const roles = ['admin', 'user', 'guest'];
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: roles[i % 3]
    }));
}
```

---

## Interview Questions

### Q1: When should you use useMemo?

**Structured Answer:**

**Definition:**
useMemo caches the result of expensive calculations, recalculating only when dependencies change.

**When to Use:**
- ✅ Filtering/sorting large arrays (100+ items)
- ✅ Complex calculations (nested loops, heavy math)
- ✅ Creating objects/arrays passed to memoized children
- ❌ Simple arithmetic or string operations
- ❌ Values that change frequently anyway

**Example:**
```jsx
// Good use case: Expensive calculation
const total = useMemo(() => {
    return largeArray.reduce((sum, item) => sum + item.value, 0);
}, [largeArray]);

// Bad use case: Simple operation
const sum = useMemo(() => a + b, [a, b]); // Overhead not worth it
```

**Key Point:**
Always profile first - memoization has overhead and should only be used when the cost of recalculation exceeds the cost of memoization.

### Q2: What's the difference between useMemo and useCallback?

**Structured Answer:**

**useMemo:**
- Memoizes the **return value** of a function
- Returns any type of value
- `useMemo(() => computeValue(), deps)`

**useCallback:**
- Memoizes the **function itself**
- Returns a function
- `useCallback(fn, deps)`
- Equivalent to `useMemo(() => fn, deps)`

**Comparison:**
```jsx
// useMemo - caches the result
const value = useMemo(() => expensiveCalc(), [dep]);

// useCallback - caches the function
const callback = useCallback(() => doSomething(), [dep]);

// They're related!
const callback = useMemo(() => () => doSomething(), [dep]); // Same as useCallback
```

**When to Use Each:**
- **useMemo:** Expensive calculations, derived values
- **useCallback:** Functions passed to memoized children

### Q3: How does React.memo() work?

**Structured Answer:**

**How It Works:**
1. Component renders with new props
2. React.memo() performs shallow comparison of props
3. If props are equal → Skip render, reuse previous output
4. If props differ → Re-render component

**Shallow Comparison:**
- Primitives: Compared by value (`5 === 5`)
- Objects/Arrays: Compared by reference (must be same instance)
- Functions: Compared by reference (recreated = different)

**Custom Comparison:**
```jsx
const Component = memo(MyComponent, (prevProps, nextProps) => {
    // Return true if props are equal (skip render)
    // Return false if props differ (allow render)
    return prevProps.id === nextProps.id;
});
```

**Important:**
React.memo is a **performance optimization**, not a guarantee. React may still re-render in some cases for other reasons.

### Q4: Explain useTransition and when to use it

**Structured Answer:**

**Purpose:**
useTransition marks state updates as non-urgent, allowing React to keep the UI responsive during heavy operations.

**How It Works:**
```jsx
const [isPending, startTransition] = useTransition();

// Urgent update (immediate)
setQuery(value);

// Non-urgent update (interruptible)
startTransition(() => {
    setResults(filterData(value));
});
```

**When to Use:**
- ✅ Heavy filtering/sorting (1000+ items)
- ✅ Tab switching with slow content
- ✅ Complex UI updates
- ❌ Simple state updates
- ❌ Network requests (use loading state instead)

**Benefits:**
- Input stays responsive during heavy updates
- Can interrupt non-urgent updates if user acts again
- Better user experience without setTimeout hacks

**React 18 Feature:**
Part of concurrent React - enables better performance without blocking the main thread.

### Q5: What are common performance pitfalls in React?

**Structured Answer:**

**1. Creating New Objects/Arrays in Render:**
```jsx
// ❌ Bad: New array every render
<Component items={[1, 2, 3]} />

// ✅ Good: Stable reference
const items = [1, 2, 3];
<Component items={items} />
```

**2. Forgetting to Memoize Callbacks:**
```jsx
// ❌ Bad: New function every render
<MemoChild onClick={() => doSomething()} />

// ✅ Good: Stable function reference
const handleClick = useCallback(() => doSomething(), []);
<MemoChild onClick={handleClick} />
```

**3. Missing Dependencies:**
```jsx
// ❌ Bad: Stale closure
useCallback(() => {
    console.log(count); // Might be stale
}, []); // Missing 'count'

// ✅ Good: Include all dependencies
useCallback(() => {
    console.log(count);
}, [count]);
```

**4. Over-Optimization:**
- Using memo() everywhere
- Memoizing simple calculations
- Not profiling before optimizing

**5. Large Component Trees:**
- Not splitting components
- Lifting state too high
- Not using composition

---

## External Resources

- [React Docs: useMemo](https://react.dev/reference/react/useMemo)
- [React Docs: useCallback](https://react.dev/reference/react/useCallback)
- [React Docs: memo](https://react.dev/reference/react/memo)
- [React Docs: useTransition](https://react.dev/reference/react/useTransition)
- [React Docs: useDeferredValue](https://react.dev/reference/react/useDeferredValue)
- [React 18: Automatic Batching](https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching)

---

[← Back to React](./README.md) | [Next: Custom Hooks →](./06-custom-hooks.md)
