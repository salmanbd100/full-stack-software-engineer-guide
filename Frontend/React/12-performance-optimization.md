# Performance Optimization

Optimizing React applications involves understanding rendering behavior and using appropriate optimization techniques.

## 📚 Core Techniques

### 1. Code Splitting & Lazy Loading

**lazy, Suspense** - Implements code splitting to load components on demand rather than in the initial bundle. Suspense provides a fallback UI while lazy-loaded components are being fetched, reducing initial load time.

```jsx
import { lazy, Suspense } from 'react';

// Lazy load components
const Dashboard = lazy(() => import('./Dashboard'));
const Profile = lazy(() => import('./Profile'));

function App() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </Suspense>
    );
}
```

### 2. Memoization

**React.memo, useMemo, useCallback** - Demonstrates three memoization techniques to prevent unnecessary re-renders. React.memo memoizes component rendering, useMemo caches expensive calculations, and useCallback memoizes function references.

```jsx
// React.memo for components
const ExpensiveComponent = React.memo(({ data }) => {
    return <div>{data.value}</div>;
});

// useMemo for expensive calculations
function ProductList({ products, filter }) {
    const filteredProducts = useMemo(() => {
        return products.filter(p => p.category === filter);
    }, [products, filter]);

    return <div>{filteredProducts.map(...)}</div>;
}

// useCallback for stable callbacks
function Parent() {
    const handleClick = useCallback(() => {
        console.log('clicked');
    }, []);

    return <Child onClick={handleClick} />;
}
```

### 3. Virtualization (Large Lists)

**react-window** - Implements list virtualization to render only visible items in large lists. Instead of rendering thousands of items, it renders only what fits in the viewport, dramatically improving performance for long lists.

```jsx
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
    const Row = ({ index, style }) => (
        <div style={style}>
            {items[index].name}
        </div>
    );

    return (
        <FixedSizeList
            height={600}
            itemCount={items.length}
            itemSize={35}
            width="100%">
            {Row}
        </FixedSizeList>
    );
}
```

### 4. Profiling with React DevTools

**Profiler** - Uses React's built-in Profiler component to measure rendering performance. The onRender callback receives detailed timing information for each render, helping identify performance bottlenecks.

```jsx
import { Profiler } from 'react';

function onRenderCallback(
    id, // component id
    phase, // "mount" or "update"
    actualDuration, // time spent rendering
    baseDuration, // estimated time without memoization
    startTime,
    commitTime
) {
    console.log(`${id} took ${actualDuration}ms`);
}

function App() {
    return (
        <Profiler id="App" onRender={onRenderCallback}>
            <MyComponent />
        </Profiler>
    );
}
```

## 🎯 Common Interview Questions

### Q1: How to optimize React performance?

**Answer:**
1. Use React.memo, useMemo, useCallback
2. Code splitting with lazy()
3. Virtualize long lists
4. Avoid inline object/function creation
5. Use production build

### Q2: When to use useMemo vs useCallback?

**Answer:**
- **useMemo**: Cache expensive calculation results
- **useCallback**: Cache function references

## 🎓 Best Practices

1. **Profile first, optimize second**
2. **Use production builds** for testing
3. **Lazy load** routes and heavy components
4. **Virtualize** lists with >100 items
5. **Memoize** expensive operations
6. **Avoid premature optimization**

---

[← Back to React](./README.md)
