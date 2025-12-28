# Performance Optimization

Optimizing React applications involves understanding rendering behavior and using appropriate optimization techniques.

## 📚 Core Techniques

### 1. Code Splitting & Lazy Loading

**Code Splitting** is the single most impactful performance optimization for React applications - breaking your bundle into smaller chunks that load on demand. Users only download code for routes and features they actually use, dramatically reducing initial load time. React.lazy() handles the dynamic import, while Suspense provides fallback UI during loading. This pattern is especially powerful for route-based splitting - most users only visit a handful of routes in any session, so loading all routes upfront wastes bandwidth. Combine with Suspense boundaries at route and feature boundaries to create a fast, progressive loading experience where the app becomes interactive quickly even as additional features load in the background.

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

**Memoization** prevents redundant work by caching results and reusing them when inputs haven't changed. React.memo prevents component re-renders when props are unchanged, useMemo caches expensive computation results, and useCallback preserves function references across renders. These tools are essential for performance but must be used judiciously - memoization itself has overhead. Profile before optimizing to identify actual bottlenecks. Memoize expensive computations (array sorting, filtering thousands of items), leaf components that render frequently, or functions passed to memoized children. Don't memoize everything - premature optimization wastes effort and can actually hurt performance by adding unnecessary comparison overhead.

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

**List Virtualization** solves the performance problem of rendering thousands of list items by only rendering what's visible in the viewport, plus a small buffer. As users scroll, items are recycled - DOM nodes get reused with new data instead of creating new nodes. This keeps the DOM size constant regardless of list length, preventing the exponential performance degradation that occurs when rendering thousands of DOM nodes. Virtualization is essential for lists with 100+ items - the performance gains are dramatic. react-window and react-virtualized are popular libraries handling the complex math and scroll handling, while maintaining smooth 60fps scrolling even with massive datasets.

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
