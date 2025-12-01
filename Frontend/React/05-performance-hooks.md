# Performance Hooks (React 18)

React 18 provides several hooks and techniques to optimize component performance and prevent unnecessary re-renders. **React 18** enhances performance with automatic batching and concurrent features.

## 📚 Core Concepts

### 1. React.memo()

**memo** - Higher-order component that prevents re-renders when props haven't changed. Uses shallow comparison by default, or accepts a custom comparison function for complex props.

```jsx
import { memo } from 'react';

// Prevents re-render if props haven't changed
const MyComponent = memo(function MyComponent({ name, count }) {
    console.log('Rendering MyComponent');
    return <div>{name}: {count}</div>;
});

// With custom comparison
**memo with Custom Comparison** - Provides custom equality function to control when component should re-render. Return true to skip render, false to allow it.

const MyComponent = memo(
    function MyComponent(props) {
        return <div>{props.data.value}</div>;
    },
    (prevProps, nextProps) => {
        // Return true if props are equal (skip render)
        return prevProps.data.id === nextProps.data.id;
    }
);
```

### 2. useMemo()

**useMemo** - Memoizes expensive computation results. Only recalculates when dependencies change, preventing unnecessary work on every render.

```jsx
import { useMemo } from 'react';

function ExpensiveComponent({ items, filter }) {
    // Memoize expensive calculation
    const filteredItems = useMemo(() => {
        console.log('Filtering items...');
        return items.filter(item => item.category === filter);
    }, [items, filter]); // Only recalculate when these change

    return (
        <ul>
            {filteredItems.map(item => (
                <li key={item.id}>{item.name}</li>
            ))}
        </ul>
    );
}

// Without useMemo (recalculates on every render)
**Without Memoization** - Shows the problem: without useMemo, filtering runs on every render, even when items and filter haven't changed, causing performance issues.

function SlowComponent({ items, filter }) {
    const filteredItems = items.filter(item => item.category === filter);
    return <ul>...</ul>;
}
```

### 3. useCallback()

**useCallback, memo** - `useCallback` memoizes function references to work with `memo()`. Without it, functions are recreated on every render, causing memoized children to re-render unnecessarily.

```jsx
import { useState, useCallback, memo } from 'react';

// Child component wrapped in memo
const ChildComponent = memo(({ onClick }) => {
    console.log('Child rendered');
    return <button onClick={onClick}>Click</button>;
});

function ParentComponent() {
    const [count, setCount] = useState(0);
    const [text, setText] = useState('');

    // Without useCallback - new function on every render
    // const handleClick = () => {
    //     setCount(c => c + 1);
    // };

    // With useCallback - same function reference
    const handleClick = useCallback(() => {
        setCount(c => c + 1);
    }, []); // Dependencies

    return (
        <div>
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <ChildComponent onClick={handleClick} />
            <p>Count: {count}</p>
        </div>
    );
}
```

### 4. When to Use Each

**useMemo, useCallback, memo** - Quick reference for choosing the right optimization tool: useMemo for values, useCallback for functions, and memo for components.

```jsx
import { useMemo, useCallback, memo } from 'react';

// useMemo - for expensive calculations
const expensiveValue = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);

// useCallback - for stable function references
const handleSubmit = useCallback((data) => {
    api.submit(data);
}, []);

// memo - for components that re-render often with same props
const ListItem = memo(({ item }) => {
    return <li>{item.name}</li>;
});
```

## 💡 Practical Examples

### Example 1: Optimized List

**useState, useCallback, memo** - Real-world list optimization. Combines memo for list items and useCallback for the delete handler to prevent unnecessary re-renders of unchanged items.

```jsx
import { useState, useCallback, memo } from 'react';

const ListItem = memo(({ item, onDelete }) => {
    console.log(`Rendering item ${item.id}`);

    return (
        <li>
            {item.name}
            <button onClick={() => onDelete(item.id)}>Delete</button>
        </li>
    );
});

function TodoList() {
    const [todos, setTodos] = useState([
        { id: 1, name: 'Task 1' },
        { id: 2, name: 'Task 2' }
    ]);

    const handleDelete = useCallback((id) => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
    }, []);

    return (
        <ul>
            {todos.map(todo => (
                <ListItem
                    key={todo.id}
                    item={todo}
                    onDelete={handleDelete}
                />
            ))}
        </ul>
    );
}
```

### Example 2: Search with Expensive Filter

**useState, useMemo** - Optimizes expensive filtering and sorting operations. Only recalculates when products, searchTerm, or sortBy changes, not on every keystroke or render.

```jsx
import { useState, useMemo } from 'react';

function ProductSearch() {
    const [products] = useState(/* large array */);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');

    const filteredAndSortedProducts = useMemo(() => {
        console.log('Filtering and sorting...');

        return products
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
    }, [products, searchTerm, sortBy]);

    return (
        <div>
            <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Name</option>
                <option value="price">Price</option>
            </select>

            <ul>
                {filteredAndSortedProducts.map(product => (
                    <li key={product.id}>{product.name}</li>
                ))}
            </ul>
        </div>
    );
}
```

## ⚡ React 18: Concurrent Performance Features

React 18 introduces concurrent features that improve performance for expensive operations without blocking the UI.

### Example 3: useTransition for Non-Urgent Updates

**useState, useTransition** - React 18 concurrent feature that keeps input responsive while filtering large datasets. Urgent updates (input) happen immediately, non-urgent (filtering) can be interrupted.

```jsx
import { useState, useTransition } from 'react';

function SearchWithTransition() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isPending, startTransition] = useTransition();

    const handleSearch = (e) => {
        const value = e.target.value;
        setQuery(value); // Urgent: update input immediately

        // Non-urgent: filter large list (can be interrupted)
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
                placeholder="Search..."
            />
            {isPending && <span>Updating...</span>}
            <div style={{ opacity: isPending ? 0.5 : 1 }}>
                {results.map(item => (
                    <div key={item.id}>{item.name}</div>
                ))}
            </div>
        </div>
    );
}

const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
}));
```

### Example 4: useDeferredValue for Expensive Components

**useState, useDeferredValue, memo** - Alternative to useTransition. Creates a deferred version of the query that updates after urgent renders, keeping input responsive.

```jsx
import { useState, useDeferredValue, memo } from 'react';

function SearchWithDeferred() {
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    // query updates immediately, deferredQuery updates after urgent updates

    return (
        <div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
            />
            {/* Uses deferred value - won't block typing */}
            <ExpensiveList query={deferredQuery} />
        </div>
    );
}

const ExpensiveList = memo(({ query }) => {
    const items = largeDataset.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <ul>
            {items.map(item => (
                <li key={item.id}>{item.name}</li>
            ))}
        </ul>
    );
});

const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
}));
```

### Comparison: useTransition vs useDeferredValue

| Feature | useTransition | useDeferredValue |
|---------|--------------|------------------|
| **Use Case** | You control when to defer | React defers the value automatically |
| **isPending** | Provides loading state | Check if value is stale manually |
| **Best For** | Tab switching, navigation | Expensive child components |

**useState, useTransition, useDeferredValue** - Side-by-side comparison showing when to use each concurrent feature. useTransition for explicit control, useDeferredValue for automatic deferral.

```jsx
import { useState, useTransition, useDeferredValue } from 'react';

// useTransition - You decide what's non-urgent
function TabsWithTransition() {
    const [tab, setTab] = useState('home');
    const [isPending, startTransition] = useTransition();

    const switchTab = (newTab) => {
        startTransition(() => setTab(newTab));
    };

    return (
        <div>
            <button onClick={() => switchTab('home')}>Home</button>
            <button onClick={() => switchTab('profile')}>Profile</button>
            {isPending && <div>Loading...</div>}
            <TabContent tab={tab} />
        </div>
    );
}

// useDeferredValue - React defers updates automatically
function SearchWithDeferred() {
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);

    return (
        <div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <ExpensiveResults query={deferredQuery} />
        </div>
    );
}

function TabContent({ tab }) {
    return <div>{tab} content</div>;
}

const ExpensiveResults = memo(({ query }) => {
    return <div>Results for: {query}</div>;
});
```

## 🎯 Common Interview Questions

### Q1: When should you use useMemo?

**Answer:** Use useMemo for expensive calculations that don't need to run on every render. Don't overuse it for simple operations.

**useMemo for Expensive Operations** - Good use case: reduces huge arrays or complex calculations. Bad use case: simple arithmetic where memoization overhead isn't worth it.

```jsx
// Good use case
const expensiveValue = useMemo(() => {
    return hugeArray.reduce((sum, item) => sum + item.value, 0);
}, [hugeArray]);

// Bad use case (overhead not worth it)
const simple = useMemo(() => a + b, [a, b]);
```

### Q2: Difference between useMemo and useCallback?

**Answer:**
- **useMemo**: Memoizes a VALUE (result of a function)
- **useCallback**: Memoizes a FUNCTION itself

**useMemo vs useCallback** - useMemo calls the function and caches the result, useCallback caches the function itself. useCallback is essentially useMemo that returns a function.

```jsx
const value = useMemo(() => expensiveCalc(), [dep]); // Returns result
const callback = useCallback(() => doSomething(), [dep]); // Returns function

// useCallback(fn, deps) is equivalent to:
// useMemo(() => fn, deps)
```

## 🚨 Common Pitfalls

1. **Premature optimization** - Don't use these hooks everywhere
2. **Wrong dependencies** - Always include all dependencies
3. **Micro-optimizing** - Profile first, optimize second
4. **Missing React.memo** - useCallback alone doesn't prevent re-renders

## 🎓 Best Practices

1. **Profile before optimizing** - Use React DevTools Profiler
2. **Start with useMemo** for expensive calculations
3. **Use useCallback** for callbacks passed to memoized children
4. **Wrap expensive child components** in React.memo
5. **Include all dependencies** to avoid bugs

---

[← Back to React](./README.md)
