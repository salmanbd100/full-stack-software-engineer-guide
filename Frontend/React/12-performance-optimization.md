# Performance Optimization

## Understanding Performance Optimization in React

Performance optimization in React is about delivering fast, responsive user experiences by minimizing unnecessary work. React's declarative nature is powerful but can lead to performance issues if not managed properly - components re-render when state or props change, and without optimization, this can cascade through your entire app.

## Why Performance Optimization Matters

**Interview Perspective:**
- Asked in 80%+ of senior React interviews
- Tests understanding of React internals and rendering behavior
- Demonstrates production experience and architectural thinking
- Critical for discussing scalability and user experience
- Shows knowledge of modern React patterns and tools

**Real-World Importance:**
- **User Experience**: Slow apps frustrate users and hurt conversion
- **Mobile Performance**: Limited CPU/memory on mobile devices
- **SEO & Core Web Vitals**: Google ranks fast sites higher
- **Business Impact**: 100ms delay can reduce conversion by 7%
- **Scalability**: Performance issues compound as apps grow

## Core Concepts Overview

### **React Rendering Behavior**

Understanding when and why React re-renders is fundamental to optimization.

**Render Triggers:**

| Trigger | Description | Scope |
|---------|-------------|-------|
| **State Change** | Component's useState or useReducer updates | Component + children |
| **Props Change** | Parent passes new props | Component + children |
| **Parent Re-render** | Parent re-renders, children re-render by default | All children recursively |
| **Context Change** | Context value updates | All consumers |
| **Force Update** | forceUpdate() called (class components) | Component + children |

**Key Insight:**
> React re-renders are cheap by design, but unnecessary re-renders at scale cause noticeable lag. Optimization is about preventing unnecessary work, not eliminating re-renders entirely.

### **Performance Optimization Categories**

| Category | Focus | Primary Tools |
|----------|-------|--------------|
| **Render Optimization** | Prevent unnecessary re-renders | React.memo, useMemo, useCallback |
| **Bundle Optimization** | Reduce JavaScript payload | Code splitting, lazy loading |
| **List Optimization** | Handle large datasets | Virtualization, pagination |
| **State Optimization** | Efficient state updates | Proper state structure, selectors |
| **Network Optimization** | Fast data fetching | Caching, prefetching, suspense |

---

## Example 1: Preventing Unnecessary Re-renders

### 💡 **React.memo for Component Memoization**

React.memo prevents a component from re-rendering when its props haven't changed - the single most effective optimization technique.

**How It Works:**

```
Parent Re-renders
       ↓
Props Changed? → NO → Skip Re-render (use cached result)
       ↓
      YES
       ↓
Re-render Component
```

**When to Use:**

| Scenario | Use React.memo? |
|----------|----------------|
| **Pure component** | ✅ Yes - renders same output for same props |
| **Expensive component** | ✅ Yes - takes >16ms to render |
| **Renders frequently** | ✅ Yes - parent re-renders often |
| **Props rarely change** | ✅ Yes - stable props, unstable parent |
| **Trivial component** | ❌ No - overhead exceeds benefit |
| **Props always change** | ❌ No - memo comparison is wasted work |

```jsx
import React, { useState, memo } from 'react';

// ❌ WITHOUT memo - Re-renders every time parent re-renders
function ExpensiveComponent({ data, onUpdate }) {
    console.log('ExpensiveComponent rendered');

    // Expensive computation
    const processedData = data.map(item => {
        // Complex processing...
        return heavyCalculation(item);
    });

    return (
        <div>
            {processedData.map(item => (
                <div key={item.id}>{item.value}</div>
            ))}
        </div>
    );
}

// ✅ WITH memo - Only re-renders when props actually change
const ExpensiveComponent = memo(function ExpensiveComponent({ data, onUpdate }) {
    console.log('ExpensiveComponent rendered');

    const processedData = data.map(item => {
        return heavyCalculation(item);
    });

    return (
        <div>
            {processedData.map(item => (
                <div key={item.id}>{item.value}</div>
            ))}
        </div>
    );
});

// Example: Parent that re-renders frequently
function ParentComponent() {
    const [count, setCount] = useState(0);
    const [data, setData] = useState([/* stable data */]);

    // Parent re-renders on every count change
    return (
        <div>
            <button onClick={() => setCount(c => c + 1)}>
                Count: {count}
            </button>

            {/* Without memo: Re-renders on every count change
                With memo: Only re-renders when data changes */}
            <ExpensiveComponent data={data} />
        </div>
    );
}
```

**Custom Comparison Function:**

```jsx
// Custom comparison for complex props
const ComplexComponent = memo(
    function ComplexComponent({ user, settings }) {
        return <div>{user.name} - {settings.theme}</div>;
    },
    (prevProps, nextProps) => {
        // Return true if props are equal (skip re-render)
        // Return false if props changed (re-render)
        return (
            prevProps.user.id === nextProps.user.id &&
            prevProps.settings.theme === nextProps.settings.theme
        );
    }
);
```

**Common Pitfall - Inline Object/Function Creation:**

```jsx
// ❌ WRONG - memo is useless because props are always new objects
function Parent() {
    return (
        <MemoizedChild
            config={{ theme: 'dark' }}  // New object every render!
            onClick={() => console.log('clicked')}  // New function every render!
        />
    );
}

// ✅ CORRECT - Stable references
function Parent() {
    const config = useMemo(() => ({ theme: 'dark' }), []);
    const handleClick = useCallback(() => console.log('clicked'), []);

    return (
        <MemoizedChild
            config={config}  // Same reference
            onClick={handleClick}  // Same reference
        />
    );
}
```

---

## Example 2: useMemo & useCallback

### 💡 **Memoizing Expensive Calculations and Functions**

useMemo caches computation results, useCallback caches function references - both prevent unnecessary work across re-renders.

**useMemo vs useCallback:**

| Hook | Caches | Returns | Use Case |
|------|--------|---------|----------|
| **useMemo** | Computation result | Any value | Expensive calculations, derived data |
| **useCallback** | Function reference | Function | Callbacks passed to memoized children |

**When to Use useMemo:**

✅ **Use for:**
- Expensive computations (array sorting, filtering large datasets)
- Derived data from props/state
- Creating objects/arrays for memoized children
- Preventing unnecessary child re-renders

❌ **Don't use for:**
- Simple calculations (a + b)
- Values that change every render anyway
- Premature optimization without profiling

```jsx
import { useState, useMemo, useCallback, memo } from 'react';

function ProductDashboard({ products }) {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [count, setCount] = useState(0);  // Unrelated state

    // ✅ GOOD - useMemo for expensive filtering/sorting
    const processedProducts = useMemo(() => {
        console.log('Processing products...');

        // Expensive filtering
        let filtered = products;
        if (filter !== 'all') {
            filtered = products.filter(p => p.category === filter);
        }

        // Expensive sorting
        const sorted = [...filtered].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'price') return a.price - b.price;
            return 0;
        });

        return sorted;
    }, [products, filter, sortBy]);  // Only recalculate when these change

    // ❌ BAD - Without useMemo, this runs on EVERY render (including count changes)
    // const processedProducts = products
    //     .filter(p => filter === 'all' || p.category === filter)
    //     .sort((a, b) => ...);

    // ✅ GOOD - useCallback for stable function reference
    const handleProductClick = useCallback((productId) => {
        console.log('Product clicked:', productId);
        // Handle click...
    }, []);  // No dependencies, function never changes

    // ✅ GOOD - useMemo for stable object reference
    const filterConfig = useMemo(() => ({
        filter,
        sortBy,
        count: processedProducts.length
    }), [filter, sortBy, processedProducts.length]);

    return (
        <div>
            {/* These setState calls cause re-renders, but processedProducts
                won't recalculate unless dependencies change */}
            <button onClick={() => setCount(c => c + 1)}>
                Unrelated count: {count}
            </button>

            <FilterControls
                config={filterConfig}  // Stable reference
                onFilterChange={setFilter}
                onSortChange={setSortBy}
            />

            {/* MemoizedProductList won't re-render if products/onClick haven't changed */}
            <MemoizedProductList
                products={processedProducts}
                onClick={handleProductClick}
            />
        </div>
    );
}

// Memoized child component
const MemoizedProductList = memo(function ProductList({ products, onClick }) {
    console.log('ProductList rendered');

    return (
        <div className="product-grid">
            {products.map(product => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onClick={onClick}
                />
            ))}
        </div>
    );
});

// Another memoized component
const ProductCard = memo(function ProductCard({ product, onClick }) {
    return (
        <div className="card" onClick={() => onClick(product.id)}>
            <h3>{product.name}</h3>
            <p>${product.price}</p>
        </div>
    );
});
```

**Real-World Example - Search with Debounce:**

```jsx
function SearchableList({ items }) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // ✅ Only recalculate when debouncedQuery or items change
    const filteredItems = useMemo(() => {
        if (!debouncedQuery) return items;

        return items.filter(item =>
            item.name.toLowerCase().includes(debouncedQuery.toLowerCase())
        );
    }, [items, debouncedQuery]);

    // ✅ Stable callback for child components
    const handleSelect = useCallback((item) => {
        console.log('Selected:', item);
    }, []);

    return (
        <div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
            />

            <p>Found: {filteredItems.length} items</p>

            <ItemList items={filteredItems} onSelect={handleSelect} />
        </div>
    );
}
```

**Performance Trade-offs:**

```jsx
// ⚠️ OVER-OPTIMIZATION - More harm than good
function SimpleComponent({ a, b }) {
    // ❌ Unnecessary - addition is faster than useMemo overhead
    const sum = useMemo(() => a + b, [a, b]);

    // ❌ Unnecessary - string concatenation is trivial
    const fullName = useMemo(() => `${a} ${b}`, [a, b]);

    return <div>{sum} - {fullName}</div>;
}

// ✅ APPROPRIATE - Just calculate directly
function SimpleComponent({ a, b }) {
    const sum = a + b;
    const fullName = `${a} ${b}`;

    return <div>{sum} - {fullName}</div>;
}
```

---

## Example 3: Code Splitting & Lazy Loading

### 💡 **Load Code On-Demand**

Code splitting is the **single most impactful** performance optimization - users only download code for features they actually use.

**Impact:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Initial Bundle** | 500 KB | 150 KB | 70% smaller |
| **Time to Interactive** | 4.5s | 1.2s | 3.3s faster |
| **First Load** | All routes | One route | Much faster |

**When to Code Split:**

| Location | Priority | Impact |
|----------|----------|--------|
| **Routes** | 🔴 Critical | Huge - most users visit 2-3 routes |
| **Modals/Dialogs** | ✅ High | High - not always shown |
| **Heavy Libraries** | ✅ High | High - defer chart libs, editors |
| **Admin Features** | ✅ Medium | Medium - small user subset |
| **Small Components** | ❌ Low | Negative - overhead exceeds benefit |

```jsx
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// ❌ BAD - Load everything upfront
// import Dashboard from './Dashboard';
// import Profile from './Profile';
// import Settings from './Settings';
// import Analytics from './Analytics';

// ✅ GOOD - Lazy load routes
const Dashboard = lazy(() => import('./Dashboard'));
const Profile = lazy(() => import('./Profile'));
const Settings = lazy(() => import('./Settings'));

// ✅ BETTER - Lazy load with retry logic
const Analytics = lazy(() =>
    import('./Analytics').catch(() => {
        // Retry failed chunk load
        return import('./Analytics');
    })
);

// Shared loading fallback
function LoadingFallback() {
    return (
        <div className="loading-container">
            <div className="spinner" />
            <p>Loading...</p>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <nav>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/profile">Profile</Link>
                <Link to="/settings">Settings</Link>
                <Link to="/analytics">Analytics</Link>
            </nav>

            {/* Wrap lazy components in Suspense */}
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/analytics" element={<Analytics />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
```

**Advanced: Component-Level Code Splitting:**

```jsx
function ProductPage() {
    const [showReviews, setShowReviews] = useState(false);

    // Lazy load heavy review component only when needed
    const Reviews = lazy(() => import('./Reviews'));

    return (
        <div>
            <ProductInfo />
            <ProductImages />

            <button onClick={() => setShowReviews(true)}>
                Show Reviews
            </button>

            {showReviews && (
                <Suspense fallback={<div>Loading reviews...</div>}>
                    <Reviews productId={productId} />
                </Suspense>
            )}
        </div>
    );
}
```

**Lazy Loading Heavy Libraries:**

```jsx
function ChartComponent({ data }) {
    const [ChartLib, setChartLib] = useState(null);

    useEffect(() => {
        // Load heavy chart library only when component mounts
        import('chart.js').then(module => {
            setChartLib(() => module.default);
        });
    }, []);

    if (!ChartLib) {
        return <div>Loading chart...</div>;
    }

    return <ChartLib data={data} />;
}
```

**Preloading Routes:**

```jsx
import { lazy } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));

// Preload on hover
function NavLink() {
    const preloadDashboard = () => {
        // Start loading before navigation
        import('./Dashboard');
    };

    return (
        <Link
            to="/dashboard"
            onMouseEnter={preloadDashboard}  // Preload on hover
            onFocus={preloadDashboard}  // Preload on focus
        >
            Dashboard
        </Link>
    );
}
```

---

## Example 4: List Virtualization

### 💡 **Render Only Visible Items**

Virtualization solves the performance problem of rendering thousands of items by only rendering what's visible in the viewport.

**The Problem:**

```jsx
// ❌ BAD - Renders ALL 10,000 items (creates 10,000 DOM nodes!)
function LargeList({ items }) {
    return (
        <div>
            {items.map(item => (
                <div key={item.id} className="item">
                    {item.name}
                </div>
            ))}
        </div>
    );
}

// Result: Slow initial render, janky scrolling, high memory usage
```

**Performance Impact:**

| List Size | DOM Nodes | Render Time | Scroll FPS |
|-----------|-----------|-------------|------------|
| **100 items** | 100 | ~50ms | 60 FPS ✅ |
| **1,000 items** | 1,000 | ~500ms | 30 FPS ⚠️ |
| **10,000 items** | 10,000 | ~5s | <10 FPS 🔴 |
| **10,000 virtualized** | ~20 | ~50ms | 60 FPS ✅ |

**When to Virtualize:**

✅ **Use for:**
- Lists with 100+ items
- Infinite scroll feeds
- Large tables/grids
- Chat message history
- Search results

```jsx
import { FixedSizeList, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Example 1: Fixed-size list items
function VirtualizedList({ items }) {
    // Render function for each row
    const Row = ({ index, style }) => (
        <div style={style} className="list-item">
            <div className="item-content">
                <h3>{items[index].name}</h3>
                <p>{items[index].description}</p>
            </div>
        </div>
    );

    return (
        <FixedSizeList
            height={600}  // Container height
            itemCount={items.length}  // Total items
            itemSize={80}  // Height of each item
            width="100%"
        >
            {Row}
        </FixedSizeList>
    );
}

// Example 2: Variable-size items
function VariableSizeVirtualList({ items }) {
    // Dynamic height based on content
    const getItemSize = (index) => {
        const item = items[index];
        // Calculate height based on content
        return item.type === 'header' ? 100 : 50;
    };

    const Row = ({ index, style }) => (
        <div style={style}>
            {items[index].content}
        </div>
    );

    return (
        <VariableSizeList
            height={600}
            itemCount={items.length}
            itemSize={getItemSize}
            width="100%"
        >
            {Row}
        </VariableSizeList>
    );
}

// Example 3: Responsive with AutoSizer
function ResponsiveVirtualList({ items }) {
    const Row = ({ index, style }) => (
        <div style={style}>
            {items[index].name}
        </div>
    );

    return (
        <AutoSizer>
            {({ height, width }) => (
                <FixedSizeList
                    height={height}
                    width={width}
                    itemCount={items.length}
                    itemSize={35}
                >
                    {Row}
                </FixedSizeList>
            )}
        </AutoSizer>
    );
}

// Example 4: Virtualized Grid
import { FixedSizeGrid } from 'react-window';

function VirtualizedGrid({ data }) {
    const Cell = ({ columnIndex, rowIndex, style }) => {
        const item = data[rowIndex * 5 + columnIndex];

        return (
            <div style={style} className="grid-cell">
                {item?.name}
            </div>
        );
    };

    return (
        <FixedSizeGrid
            columnCount={5}
            columnWidth={200}
            height={600}
            rowCount={Math.ceil(data.length / 5)}
            rowHeight={100}
            width={1000}
        >
            {Cell}
        </FixedSizeGrid>
    );
}
```

**Real-World Example - Chat Application:**

```jsx
import { FixedSizeList } from 'react-window';

function ChatMessages({ messages }) {
    const listRef = useRef();

    // Scroll to bottom on new message
    useEffect(() => {
        listRef.current?.scrollToItem(messages.length - 1);
    }, [messages.length]);

    const MessageRow = ({ index, style }) => {
        const message = messages[index];

        return (
            <div style={style} className={`message ${message.isMine ? 'mine' : 'theirs'}`}>
                <div className="avatar">{message.author.avatar}</div>
                <div className="content">
                    <div className="author">{message.author.name}</div>
                    <div className="text">{message.text}</div>
                    <div className="timestamp">{message.timestamp}</div>
                </div>
            </div>
        );
    };

    return (
        <FixedSizeList
            ref={listRef}
            height={600}
            itemCount={messages.length}
            itemSize={80}
            width="100%"
        >
            {MessageRow}
        </FixedSizeList>
    );
}
```

**Alternative: react-virtuoso (Easier API):**

```jsx
import { Virtuoso } from 'react-virtuoso';

function SimpleVirtualList({ items }) {
    return (
        <Virtuoso
            style={{ height: '600px' }}
            data={items}
            itemContent={(index, item) => (
                <div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                </div>
            )}
        />
    );
}
```

---

## Example 5: Profiling & Measuring Performance

### 💡 **Measure Before Optimizing**

"Premature optimization is the root of all evil" - always profile before optimizing.

**React DevTools Profiler:**

```jsx
import { Profiler } from 'react';

function App() {
    const onRenderCallback = (
        id,              // Component identifier
        phase,           // "mount" or "update"
        actualDuration,  // Time spent rendering
        baseDuration,    // Estimated time without memoization
        startTime,       // When render started
        commitTime,      // When render committed
        interactions     // Set of interactions
    ) => {
        console.log(`${id} (${phase}) took ${actualDuration.toFixed(2)}ms`);

        // Log slow renders
        if (actualDuration > 16) {  // 60fps = 16.67ms per frame
            console.warn(`Slow render detected in ${id}`);
        }

        // Send to analytics
        sendToAnalytics({
            component: id,
            duration: actualDuration,
            phase
        });
    };

    return (
        <Profiler id="App" onRender={onRenderCallback}>
            <Dashboard />
            <Profiler id="UserList" onRender={onRenderCallback}>
                <UserList />
            </Profiler>
        </Profiler>
    );
}
```

**Using Chrome DevTools:**

**1. Performance Tab:**
```
1. Open Chrome DevTools
2. Go to Performance tab
3. Click Record
4. Interact with app
5. Stop recording
6. Analyze flame graph for slow functions
```

**2. React DevTools Profiler:**
```
1. Install React DevTools extension
2. Open Profiler tab
3. Click Record
4. Interact with app
5. Stop recording
6. View component render times
```

**Custom Performance Monitoring:**

```jsx
// Hook to measure render time
function useRenderTime(componentName) {
    const renderCount = useRef(0);

    useEffect(() => {
        renderCount.current += 1;
    });

    useEffect(() => {
        const startTime = performance.now();

        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(
                `${componentName} render #${renderCount.current}: ${duration.toFixed(2)}ms`
            );
        };
    });
}

// Usage
function ExpensiveComponent() {
    useRenderTime('ExpensiveComponent');

    // Component logic...
}
```

**Why Component Re-renders:**

```jsx
import { useWhyDidYouUpdate } from './hooks';

function MyComponent({ data, onUpdate, config }) {
    // Debug why component re-renders
    useWhyDidYouUpdate('MyComponent', { data, onUpdate, config });

    return <div>...</div>;
}

// Hook implementation
function useWhyDidYouUpdate(name, props) {
    const previousProps = useRef();

    useEffect(() => {
        if (previousProps.current) {
            const allKeys = Object.keys({ ...previousProps.current, ...props });
            const changedProps = {};

            allKeys.forEach(key => {
                if (previousProps.current[key] !== props[key]) {
                    changedProps[key] = {
                        from: previousProps.current[key],
                        to: props[key]
                    };
                }
            });

            if (Object.keys(changedProps).length > 0) {
                console.log('[why-did-you-update]', name, changedProps);
            }
        }

        previousProps.current = props;
    });
}
```

---

## Common Mistakes

### ❌ Mistake 1: Premature Optimization

**Problem:**
Optimizing without measuring, adding complexity without benefit.

```jsx
// ❌ OVER-OPTIMIZATION
function SimpleCounter({ initialCount }) {
    // Unnecessary useMemo for trivial calculation
    const count = useMemo(() => initialCount, [initialCount]);

    // Unnecessary useCallback for simple onClick
    const increment = useCallback(() => {
        setCount(c => c + 1);
    }, []);

    return <button onClick={increment}>{count}</button>;
}

// ✅ CORRECT - Keep it simple
function SimpleCounter({ initialCount }) {
    const [count, setCount] = useState(initialCount);

    return (
        <button onClick={() => setCount(c => c + 1)}>
            {count}
        </button>
    );
}
```

**When to Optimize:**

1. **Profile first** - Use React DevTools Profiler
2. **Measure impact** - Does it actually slow the app?
3. **Optimize** - Apply specific optimizations
4. **Verify** - Measure again to confirm improvement

---

### ❌ Mistake 2: Breaking Memoization with Inline Objects

**Problem:**
Creating new objects/functions every render defeats memoization.

```jsx
// ❌ WRONG - Creates new object every render
function Parent() {
    return (
        <MemoizedChild
            config={{ theme: 'dark', size: 'large' }}  // New object!
            onClick={() => console.log('clicked')}  // New function!
        />
    );
}

// MemoizedChild re-renders every time despite being memoized!

// ✅ CORRECT - Stable references
function Parent() {
    const config = useMemo(() => ({ theme: 'dark', size: 'large' }), []);
    const handleClick = useCallback(() => console.log('clicked'), []);

    return (
        <MemoizedChild
            config={config}  // Same reference
            onClick={handleClick}  // Same reference
        />
    );
}

// ✅ ALTERNATIVE - Extract to constants
const CONFIG = { theme: 'dark', size: 'large' };

function Parent() {
    const handleClick = useCallback(() => console.log('clicked'), []);

    return <MemoizedChild config={CONFIG} onClick={handleClick} />;
}
```

---

### ❌ Mistake 3: Not Using Keys Properly

**Problem:**
Missing or non-unique keys cause React to destroy and recreate components.

```jsx
// ❌ WRONG - Using index as key
function TodoList({ todos }) {
    return (
        <ul>
            {todos.map((todo, index) => (
                <TodoItem key={index} todo={todo} />  // Breaks on reorder!
            ))}
        </ul>
    );
}

// ✅ CORRECT - Use stable, unique IDs
function TodoList({ todos }) {
    return (
        <ul>
            {todos.map(todo => (
                <TodoItem key={todo.id} todo={todo} />
            ))}
        </ul>
    );
}
```

**Why Index Keys Are Bad:**

```
Initial: [A, B, C]  → keys: [0, 1, 2]
Delete B: [A, C]    → keys: [0, 1]

React thinks:
- Key 0 (A) stayed the same ✓
- Key 1 changed from B to C ✗ (re-renders C unnecessarily)
- Key 2 was removed

With proper IDs:
Initial: [A, B, C]  → keys: ['id-a', 'id-b', 'id-c']
Delete B: [A, C]    → keys: ['id-a', 'id-c']

React correctly identifies:
- id-a stayed ✓
- id-b removed ✓
- id-c stayed ✓
```

---

## Best Practices

### 1. Start Simple, Optimize When Needed

**Development Process:**

```
1. Build feature working correctly
2. Profile in production mode
3. Identify bottlenecks
4. Apply targeted optimizations
5. Verify improvement
6. Repeat if needed
```

**Don't optimize:**
- During initial development
- Without profiling data
- Components that render <5 times/second
- Trivial calculations

### 2. Use Production Build for Testing

```bash
# Development build - includes debugging tools, slower
npm start

# Production build - optimized, minified
npm run build
npm install -g serve
serve -s build
```

**Performance difference:**
- Development: React includes warnings, PropTypes, extra checks
- Production: 3-5x faster, much smaller bundle

### 3. Optimize State Structure

```jsx
// ❌ BAD - Deeply nested state
const [state, setState] = useState({
    users: {
        1: { name: 'Alice', posts: { ... } },
        2: { name: 'Bob', posts: { ... } }
    }
});

// Hard to update, causes unnecessary re-renders

// ✅ GOOD - Normalized, flat state
const [users, setUsers] = useState({ 1: { name: 'Alice' }, 2: { name: 'Bob' } });
const [posts, setPosts] = useState({ ... });

// Easy to update, minimal re-renders
```

### 4. Use Web Workers for Heavy Computations

```jsx
// Move CPU-intensive work off main thread
function DataProcessor({ data }) {
    const [result, setResult] = useState(null);

    useEffect(() => {
        const worker = new Worker(new URL('./worker.js', import.meta.url));

        worker.postMessage(data);

        worker.onmessage = (e) => {
            setResult(e.data);
        };

        return () => worker.terminate();
    }, [data]);

    return <div>{result}</div>;
}

// worker.js
self.onmessage = (e) => {
    const data = e.data;

    // Heavy computation
    const result = processLargeDataset(data);

    self.postMessage(result);
};
```

### 5. Implement Pagination or Infinite Scroll

```jsx
// Instead of loading all data at once
function InfiniteScrollList() {
    const [page, setPage] = useState(1);
    const { data, hasMore, isLoading } = useInfiniteQuery(page);

    const loadMore = () => {
        if (hasMore && !isLoading) {
            setPage(p => p + 1);
        }
    };

    return (
        <div>
            {data.map(item => <Item key={item.id} data={item} />)}

            {hasMore && (
                <button onClick={loadMore} disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Load More'}
                </button>
            )}
        </div>
    );
}
```

---

## Real-World Scenarios

### Scenario 1: E-commerce Product Catalog

**Optimizing a large product listing with filters:**

```jsx
import { memo, useState, useMemo, useCallback } from 'react';
import { FixedSizeGrid } from 'react-window';

function ProductCatalog({ products }) {
    const [filters, setFilters] = useState({
        category: 'all',
        priceRange: [0, 1000],
        inStock: false
    });
    const [sortBy, setSortBy] = useState('name');

    // ✅ Memoize expensive filtering and sorting
    const filteredProducts = useMemo(() => {
        let result = products;

        // Filter
        if (filters.category !== 'all') {
            result = result.filter(p => p.category === filters.category);
        }
        if (filters.inStock) {
            result = result.filter(p => p.stock > 0);
        }
        result = result.filter(p =>
            p.price >= filters.priceRange[0] &&
            p.price <= filters.priceRange[1]
        );

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'price') return a.price - b.price;
            if (sortBy === 'rating') return b.rating - a.rating;
            return 0;
        });

        return result;
    }, [products, filters, sortBy]);

    // ✅ Stable callbacks
    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    // ✅ Virtualized grid for thousands of products
    const ProductCell = useCallback(({ columnIndex, rowIndex, style }) => {
        const index = rowIndex * 4 + columnIndex;
        const product = filteredProducts[index];

        if (!product) return null;

        return (
            <div style={style}>
                <MemoizedProductCard product={product} />
            </div>
        );
    }, [filteredProducts]);

    return (
        <div className="catalog">
            <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                sortBy={sortBy}
                onSortChange={setSortBy}
            />

            <div className="results-count">
                {filteredProducts.length} products found
            </div>

            <FixedSizeGrid
                columnCount={4}
                columnWidth={250}
                height={800}
                rowCount={Math.ceil(filteredProducts.length / 4)}
                rowHeight={350}
                width={1000}
            >
                {ProductCell}
            </FixedSizeGrid>
        </div>
    );
}

const MemoizedProductCard = memo(function ProductCard({ product }) {
    return (
        <div className="product-card">
            <img src={product.image} alt={product.name} />
            <h3>{product.name}</h3>
            <p>${product.price}</p>
            <div className="rating">⭐ {product.rating}</div>
            <button>Add to Cart</button>
        </div>
    );
});
```

### Scenario 2: Real-Time Dashboard

**Optimizing a dashboard with live-updating widgets:**

```jsx
function Dashboard() {
    // ✅ Split contexts to prevent unnecessary re-renders
    return (
        <ThemeProvider>
            <UserProvider>
                <DashboardLayout>
                    {/* Each widget independently subscribes to its data */}
                    <SalesWidget />
                    <TrafficWidget />
                    <UsersWidget />
                    <RevenueWidget />
                </DashboardLayout>
            </UserProvider>
        </ThemeProvider>
    );
}

const SalesWidget = memo(function SalesWidget() {
    // ✅ Only subscribes to sales data
    const { data, isLoading } = useSalesData();

    // ✅ Memoize chart configuration
    const chartConfig = useMemo(() => ({
        type: 'line',
        data: data,
        options: { responsive: true }
    }), [data]);

    if (isLoading) return <WidgetSkeleton />;

    return (
        <Widget title="Sales">
            <Chart config={chartConfig} />
        </Widget>
    );
});

// Custom hook with selective updates
function useSalesData() {
    const [data, setData] = useState([]);

    useEffect(() => {
        // WebSocket connection for real-time data
        const ws = new WebSocket('wss://api.example.com/sales');

        ws.onmessage = (event) => {
            const newData = JSON.parse(event.data);

            // ✅ Only update if data actually changed
            setData(prev => {
                if (JSON.stringify(prev) === JSON.stringify(newData)) {
                    return prev;  // Return same reference, no re-render
                }
                return newData;
            });
        };

        return () => ws.close();
    }, []);

    return { data, isLoading: data.length === 0 };
}
```

---

## Interview Questions

### Q1: How do you optimize React performance?

**Answer:**

**Top Optimization Techniques:**

1. **Code Splitting** - Lazy load routes and heavy components
2. **Memoization** - React.memo, useMemo, useCallback
3. **Virtualization** - For lists with 100+ items
4. **Production Build** - Always test with optimized build
5. **Proper Keys** - Use stable, unique IDs
6. **State Structure** - Normalize and colocate state

**Example:**
```jsx
// Route-based code splitting
const Dashboard = lazy(() => import('./Dashboard'));

// Memoize expensive components
const ProductList = memo(({ products }) => {
    const sorted = useMemo(() =>
        products.sort((a, b) => a.price - b.price),
        [products]
    );

    return <VirtualList items={sorted} />;
});
```

---

### Q2: When should you use React.memo?

**Answer:**

**Use React.memo when:**

✅ Component is **pure** (same props → same output)
✅ Component is **expensive** to render (>16ms)
✅ Props are **stable** but parent re-renders frequently
✅ Component renders **many times** with same props

❌ **Don't use when:**
- Props change on every render
- Component is trivial (renders <1ms)
- You haven't profiled (premature optimization)

**Example:**
```jsx
// ✅ Good use case
const ExpensiveChart = memo(function Chart({ data }) {
    // Expensive rendering logic...
    return <canvas>...</canvas>;
});

function Dashboard() {
    const [count, setCount] = useState(0);
    const [chartData] = useState([/* stable data */]);

    return (
        <>
            <button onClick={() => setCount(c => c + 1)}>{count}</button>
            {/* Chart won't re-render when count changes */}
            <ExpensiveChart data={chartData} />
        </>
    );
}
```

---

### Q3: What's the difference between useMemo and useCallback?

**Answer:**

| Hook | Caches | Returns | Use Case |
|------|--------|---------|----------|
| **useMemo** | Result of computation | Any value | Expensive calculations, objects/arrays |
| **useCallback** | Function itself | Function | Callbacks for memoized children |

**Examples:**

```jsx
// useMemo - Cache computation result
const sortedData = useMemo(() =>
    data.sort((a, b) => a.price - b.price),
    [data]
);

// useCallback - Cache function reference
const handleClick = useCallback((id) => {
    console.log('Clicked:', id);
}, []);

// Equivalent:
const handleClick = useMemo(() =>
    (id) => console.log('Clicked:', id),
    []
);
```

**When to use each:**

```jsx
function Parent() {
    const [items, setItems] = useState([]);

    // ✅ useMemo for derived data
    const expensiveValue = useMemo(() => {
        return items.reduce((sum, item) => sum + item.price, 0);
    }, [items]);

    // ✅ useCallback for functions passed to children
    const handleItemClick = useCallback((itemId) => {
        console.log('Item clicked:', itemId);
    }, []);

    return (
        <div>
            <Total value={expensiveValue} />
            <MemoizedList items={items} onClick={handleItemClick} />
        </div>
    );
}
```

---

### Q4: How do you handle large lists in React?

**Answer:**

**Three Strategies:**

**1. Virtualization (Best for 100+ items):**
```jsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
    height={600}
    itemCount={items.length}
    itemSize={35}
>
    {Row}
</FixedSizeList>
```

**2. Pagination:**
```jsx
const itemsPerPage = 50;
const currentItems = items.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
);
```

**3. Infinite Scroll:**
```jsx
const { data, fetchMore, hasMore } = useInfiniteQuery();

<InfiniteScroll loadMore={fetchMore} hasMore={hasMore}>
    {data.map(item => <Item key={item.id} {...item} />)}
</InfiniteScroll>
```

**Comparison:**

| Strategy | Best For | Pros | Cons |
|----------|----------|------|------|
| **Virtualization** | Very long lists | Best performance | Complex setup |
| **Pagination** | Search results | Simple, SEO-friendly | Breaks scrolling |
| **Infinite Scroll** | Social feeds | Great UX | Can be overwhelming |

---

### Q5: How do you profile React applications?

**Answer:**

**Profiling Tools:**

**1. React DevTools Profiler:**
```
1. Install React DevTools extension
2. Open Profiler tab
3. Click record button
4. Interact with app
5. Stop recording
6. Analyze flame graph:
   - Yellow = slow renders
   - Gray = didn't render (memo)
   - Bars = component render time
```

**2. Profiler Component:**
```jsx
import { Profiler } from 'react';

<Profiler id="App" onRender={(id, phase, duration) => {
    if (duration > 16) {
        console.warn(`${id} slow render: ${duration}ms`);
    }
}}>
    <App />
</Profiler>
```

**3. Chrome Performance Tab:**
```
1. Open DevTools > Performance
2. Record interaction
3. Look for:
   - Long tasks (>50ms)
   - Jank (dropped frames)
   - Memory leaks
```

**What to Look For:**
- ✅ Components rendering unnecessarily
- ✅ Expensive computations without useMemo
- ✅ Large re-render cascades
- ✅ Long lists without virtualization

---

## External Resources

- [React Docs: Optimizing Performance](https://react.dev/learn/render-and-commit#optimizing-performance)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools#profiler)
- [react-window Documentation](https://react-window.vercel.app/)
- [Web.dev: React Performance](https://web.dev/react/)
- [useMemo vs useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)

---

[← Back to React](./README.md)
