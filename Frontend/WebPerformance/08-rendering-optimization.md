# Rendering Optimization

## Overview

Rendering optimization ensures smooth, responsive user interfaces by minimizing browser reflows, repaints, and layout shifts. This guide covers React optimization techniques, debouncing/throttling, requestAnimationFrame, and CSS containment.

## Table of Contents
- [React Performance Optimization](#react-performance-optimization)
- [Debouncing and Throttling](#debouncing-and-throttling)
- [requestAnimationFrame](#requestanimationframe)
- [CSS Containment](#css-containment)
- [Virtual Scrolling](#virtual-scrolling)
- [Interview Questions](#interview-questions)

## React Performance Optimization

### useMemo and useCallback

React re-renders components whenever props or state change, which can trigger expensive recalculations and unnecessary child component renders. useMemo caches the result of expensive computations, only recalculating when dependencies change - essential for operations like sorting, filtering, or complex calculations. useCallback caches function references, preventing child components from re-rendering when they receive the same logical function. Together, these hooks eliminate redundant work during renders, keeping your app responsive even with complex component trees. The key is using them strategically - premature optimization wastes effort.

```jsx
import { useMemo, useCallback, useState } from 'react';

function DataTable({ data, onRowClick }) {
  const [sortColumn, setSortColumn] = useState('name');

  // Expensive calculation - only recalculate when dependencies change
  const sortedData = useMemo(() => {
    console.log('Sorting data...');
    return [...data].sort((a, b) => {
      return a[sortColumn] > b[sortColumn] ? 1 : -1;
    });
  }, [data, sortColumn]); // Only re-sort when data or sortColumn changes

  // Prevent function recreation on every render
  const handleSort = useCallback((column) => {
    setSortColumn(column);
  }, []); // Function never changes

  const handleRowClick = useCallback((row) => {
    onRowClick(row);
  }, [onRowClick]); // Only recreate if onRowClick changes

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => handleSort('name')}>Name</th>
          <th onClick={() => handleSort('age')}>Age</th>
        </tr>
      </thead>
      <tbody>
        {sortedData.map(row => (
          <tr key={row.id} onClick={() => handleRowClick(row)}>
            <td>{row.name}</td>
            <td>{row.age}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### React.memo

React.memo is a higher-order component that prevents unnecessary re-renders by memoizing the component's output. When props haven't changed (using shallow comparison), React reuses the previous render result instead of rendering again. This is powerful for expensive components with complex render logic or large lists of child components. You can provide a custom comparison function for fine-grained control over when to re-render. However, memo adds overhead - only use it when re-renders are actually expensive or frequent. Profile first, optimize second.

```jsx
import { memo } from 'react';

// Expensive component
const ExpensiveComponent = memo(function ExpensiveComponent({ data, onAction }) {
  console.log('Rendering ExpensiveComponent');

  return (
    <div>
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      <button onClick={onAction}>Action</button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.data === nextProps.data && 
         prevProps.onAction === nextProps.onAction;
});

// Usage
function Parent() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState([]);

  const handleAction = useCallback(() => {
    console.log('Action performed');
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {/* ExpensiveComponent won't re-render when count changes */}
      <ExpensiveComponent data={data} onAction={handleAction} />
    </div>
  );
}
```

### Virtualization (React Window)

```jsx
import { FixedSizeList } from 'react-window';

// Render only visible items
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
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// Without virtualization: Renders 10,000 DOM nodes
// With virtualization: Renders ~12 DOM nodes (only visible ones)
```

### Code Splitting with React.lazy

```jsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function Dashboard({ isAdmin }) {
  return (
    <div>
      <Suspense fallback={<div>Loading chart...</div>}>
        <HeavyChart />
      </Suspense>

      {isAdmin && (
        <Suspense fallback={<div>Loading admin panel...</div>}>
          <AdminPanel />
        </Suspense>
      )}
    </div>
  );
}
```

### Avoiding Unnecessary Renders

```jsx
// ❌ Bad: Creates new object every render
function BadComponent() {
  return <ChildComponent style={{ color: 'red' }} />;
}

// ✅ Good: Reuse same object
const style = { color: 'red' };
function GoodComponent() {
  return <ChildComponent style={style} />;
}

// ❌ Bad: Inline function
<button onClick={() => handleClick(item.id)}>Click</button>

// ✅ Good: useCallback or separate handler
const handleClick = useCallback((id) => {
  // Handle click
}, []);

<button onClick={() => handleClick(item.id)}>Click</button>
```

## Debouncing and Throttling

### Debounce

Debouncing delays function execution until after a period of inactivity. It's perfect for search inputs where you want to wait until the user stops typing before making an API request. Without debouncing, you'd make hundreds of requests as the user types "performance optimization", one for each keystroke. With debouncing (typically 300ms), you only make the request after they pause, dramatically reducing server load and improving UI responsiveness. The pattern cancels the previous timer on each event, ensuring only the final value triggers execution.

```javascript
// Wait for user to stop typing before executing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage: Search input
const searchHandler = debounce((query) => {
  fetch(`/api/search?q=${query}`)
    .then(res => res.json())
    .then(data => displayResults(data));
}, 300);

input.addEventListener('input', (e) => searchHandler(e.target.value));
```

### Throttle

```javascript
// Execute at most once per interval
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage: Scroll handler
const scrollHandler = throttle(() => {
  console.log('Scroll position:', window.scrollY);
  updateScrollIndicator();
}, 100);

window.addEventListener('scroll', scrollHandler);
```

### React Hooks for Debounce/Throttle

```jsx
import { useEffect, useState, useCallback, useRef } from 'react';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // API call only after user stops typing for 300ms
      fetch(`/api/search?q=${debouncedSearchTerm}`)
        .then(res => res.json())
        .then(data => setResults(data));
    }
  }, [debouncedSearchTerm]);

  return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
}

// Throttle hook
function useThrottle(callback, delay) {
  const throttleRef = useRef(false);

  return useCallback((...args) => {
    if (!throttleRef.current) {
      callback(...args);
      throttleRef.current = true;
      setTimeout(() => {
        throttleRef.current = false;
      }, delay);
    }
  }, [callback, delay]);
}
```

## requestAnimationFrame

### Smooth Animations

requestAnimationFrame synchronizes JavaScript animations with the browser's repaint cycle, ensuring smooth 60fps animations. Unlike setTimeout/setInterval which run at fixed intervals regardless of browser rendering, rAF fires right before the browser paints, allowing your changes to be included in the next frame. It automatically pauses when the tab is inactive, saving CPU and battery. The browser can optimize rAF callbacks, potentially batching multiple animations together. This API is essential for all JavaScript animations - layout changes, canvas drawing, or WebGL rendering.

```javascript
// ❌ Bad: Using setTimeout/setInterval
let position = 0;
setInterval(() => {
  position += 5;
  element.style.transform = `translateX(${position}px)`;
}, 16); // ~60fps

// ✅ Good: Using requestAnimationFrame
let position = 0;
function animate() {
  position += 5;
  element.style.transform = `translateX(${position}px)`;

  if (position < 500) {
    requestAnimationFrame(animate);
  }
}
requestAnimationFrame(animate);
```

### Scroll-Based Animation

```javascript
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateParallax(window.scrollY);
      ticking = false;
    });
    ticking = true;
  }
});

function updateParallax(scrollY) {
  const parallax = document.querySelector('.parallax');
  parallax.style.transform = `translateY(${scrollY * 0.5}px)`;
}
```

### React with requestAnimationFrame

```jsx
import { useEffect, useRef } from 'react';

function AnimatedComponent() {
  const positionRef = useRef(0);
  const elementRef = useRef(null);

  useEffect(() => {
    let animationId;

    function animate() {
      positionRef.current += 2;
      if (elementRef.current) {
        elementRef.current.style.transform = 
          `translateX(${positionRef.current}px)`;
      }

      if (positionRef.current < 500) {
        animationId = requestAnimationFrame(animate);
      }
    }

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, []);

  return <div ref={elementRef}>Animated Element</div>;
}
```

## CSS Containment

### contain Property

CSS containment tells the browser that an element's internal layout is independent from the rest of the page, allowing aggressive rendering optimizations. With `contain: layout`, the browser knows changes inside the element won't affect outside layout, so it can skip recalculating layout for the entire page. `contain: paint` ensures the element doesn't paint outside its bounds, enabling optimization. Size containment makes the element's size independent of its children. These hints allow browsers to isolate and optimize rendering of independent components, crucial for complex web apps with many independent widgets.

```css
/* Layout containment */
.article {
  contain: layout;
  /* Layout changes inside won't affect outside */
}

/* Paint containment */
.widget {
  contain: paint;
  /* Element won't paint outside its bounds */
}

/* Size containment */
.card {
  contain: size;
  /* Size independent of children */
}

/* Full containment */
.independent-component {
  contain: layout paint size;
  /* Or shorthand: contain: strict; */
}

/* Content containment (layout + paint) */
.section {
  contain: content;
}
```

### content-visibility

```css
/* Lazy render off-screen content */
.lazy-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* Reserve space */
}

/* Hidden sections not rendered */
.hidden {
  content-visibility: hidden;
}
```

### Practical Example

```css
/* Product grid with containment */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.product-card {
  contain: layout paint;
  /* Each card is independent */
}

/* Infinite scroll with content-visibility */
.article-list {
  display: flex;
  flex-direction: column;
}

.article {
  content-visibility: auto;
  contain-intrinsic-size: 0 400px;
}
```

## Virtual Scrolling

### Basic Implementation

Virtual scrolling (also called windowing) is a technique that renders only visible items in a long list, dramatically improving performance for lists with thousands or millions of items. Instead of rendering all 10,000 items and letting most sit off-screen, virtual scrolling calculates which items are visible based on scroll position and only renders those (~10-20 items). This keeps DOM size small, reduces memory usage, and ensures consistent performance regardless of list length. The technique requires calculating visible range, maintaining total scroll height, and repositioning visible items as users scroll.

```jsx
import { useEffect, useRef, useState } from 'react';

function VirtualScroll({ items, itemHeight, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

  const visibleItems = items.slice(
    Math.max(0, visibleStart - 2), // Buffer above
    Math.min(items.length, visibleEnd + 2) // Buffer below
  );

  const offsetY = visibleStart * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={visibleStart + index} style={{ height: itemHeight }}>
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### React Window (Production-Ready)

```jsx
import { FixedSizeList } from 'react-window';

function LargeList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          Item {index}: {items[index].name}
        </div>
      )}
    </FixedSizeList>
  );
}

// Variable size items
import { VariableSizeList } from 'react-window';

function VariableList({ items }) {
  const getItemSize = (index) => items[index].height;

  return (
    <VariableSizeList
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          {items[index].content}
        </div>
      )}
    </VariableSizeList>
  );
}
```

## Interview Questions

**Q1: What's the difference between useMemo and useCallback?**
A:
- **useMemo**: Memoizes computed value
- **useCallback**: Memoizes function reference

```jsx
const value = useMemo(() => expensiveCalculation(), [deps]);
const callback = useCallback(() => handleClick(), [deps]);
```

**Q2: When should you use React.memo?**
A: Use when:
- Component renders often with same props
- Re-renders are expensive
- Component is pure (same props = same output)

Don't use for:
- Simple components
- Props change frequently
- Premature optimization

**Q3: What's the difference between debounce and throttle?**
A:
- **Debounce**: Wait for pause in events (search input)
- **Throttle**: Execute at regular intervals (scroll handler)

```javascript
// Debounce: Only after user stops typing
debounce(search, 300)

// Throttle: Maximum once per 100ms
throttle(updateScroll, 100)
```

**Q4: Why use requestAnimationFrame over setInterval?**
A:
- Synchronized with browser repaint (~60fps)
- Automatically pauses when tab inactive
- Better performance and battery life
- Smoother animations

```javascript
// Bad: setTimeout (not synced)
setInterval(() => animate(), 16);

// Good: requestAnimationFrame
requestAnimationFrame(animate);
```

**Q5: What is virtual scrolling and when to use it?**
A: Only render visible items in long lists.

**Benefits:**
- Renders 10-20 items instead of 10,000
- Constant performance regardless of list size
- Better memory usage

**Use when:**
- Lists > 100 items
- Each item has significant DOM

**Q6: What does CSS contain property do?**
```css
.component {
  contain: layout paint;
}
```
Tells browser that element's internals are independent, allowing optimization.

**Benefits:**
- Skip layout calculations for unchanged containers
- Improved rendering performance
- Better paint performance

**Q7: What is content-visibility?**
```css
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```
Browser skips rendering off-screen content.

**Impact:**
- 50%+ faster initial rendering
- Better scroll performance
- Reduced memory usage

**Q8: How do you prevent unnecessary React re-renders?**
1. React.memo for components
2. useMemo for expensive calculations
3. useCallback for function references
4. Proper key props in lists
5. Split components (move state down)
6. Use context wisely (split contexts)

**Q9: What tools help identify rendering issues?**
- **React DevTools Profiler**: Find slow renders
- **Chrome Performance tab**: Paint/layout analysis
- **Why Did You Render**: Debug unnecessary renders
- **Lighthouse**: Performance audits

**Q10: How do you optimize a large data table in React?**
```jsx
import { FixedSizeGrid } from 'react-window';

// 1. Virtualization
<FixedSizeGrid
  height={600}
  width={1000}
  rowCount={1000}
  columnCount={10}
  rowHeight={50}
  columnWidth={100}
>
  {Cell}
</FixedSizeGrid>

// 2. Memoize cells
const Cell = memo(({ rowIndex, columnIndex }) => {
  return <div>{data[rowIndex][columnIndex]}</div>;
});

// 3. Paginate if possible
// 4. Debounce filters/sorts
// 5. Use CSS contain
```

## Summary

**React Optimization:**
- useMemo for expensive calculations
- useCallback for function stability
- React.memo for component memoization
- Code splitting with React.lazy
- Virtualization for long lists

**Event Optimization:**
- Debounce for search inputs
- Throttle for scroll handlers
- requestAnimationFrame for animations

**CSS Optimization:**
- contain property for independence
- content-visibility for lazy rendering
- Transform/opacity for animations (GPU accelerated)

**Performance Impact:**
- Virtual scrolling: 50-90% faster rendering
- content-visibility: 40-60% faster initial load
- Proper memoization: 30-50% fewer re-renders
- requestAnimationFrame: 60fps smooth animations

---

[← Performance Monitoring](./07-performance-monitoring.md) | [Back to Web Performance](./README.md)
