# Rendering Optimization

## Overview

Rendering optimization makes your UI **smooth and responsive**. The goal: 60 frames per second, no janky scrolling, no laggy clicks.

> **Real-Life Example:**
> When you scroll Instagram and it feels buttery smooth — that's good rendering. When you scroll an old website and it stutters — that's bad rendering.

---

## Table of Contents
- [React Performance Optimization](#react-performance-optimization)
- [Debouncing and Throttling](#debouncing-and-throttling)
- [requestAnimationFrame](#requestanimationframe)
- [CSS Containment](#css-containment)
- [Virtual Scrolling](#virtual-scrolling)
- [Interview Questions](#interview-questions)

---

## React Performance Optimization

### 💡 **The Problem: Unnecessary Re-renders**

React re-renders components whenever **props or state change**. This can cause:

- Slow expensive calculations
- Heavy child component re-renders
- Sluggish UI response

The fix: tell React **when re-rendering is unnecessary**.

### 💡 **useMemo and useCallback**

| Hook | Purpose |
|------|---------|
| **useMemo** | Cache the result of an expensive calculation |
| **useCallback** | Cache a function reference |

```jsx
import { useMemo, useCallback, useState } from 'react';

function DataTable({ data, onRowClick }) {
  const [sortColumn, setSortColumn] = useState('name');

  // ✅ Only re-sort when data or sortColumn changes
  const sortedData = useMemo(() => {
    console.log('Sorting data...');
    return [...data].sort((a, b) => {
      return a[sortColumn] > b[sortColumn] ? 1 : -1;
    });
  }, [data, sortColumn]);

  // ✅ Function reference stays stable
  const handleSort = useCallback((column) => {
    setSortColumn(column);
  }, []);

  const handleRowClick = useCallback((row) => {
    onRowClick(row);
  }, [onRowClick]);

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

### 💡 **React.memo**

`React.memo` prevents a component from re-rendering when its props haven't changed.

**When to Use React.memo:**

| Component Type | Use memo? |
|----------------|-----------|
| Expensive to render | ✅ Yes |
| Renders often with same props | ✅ Yes |
| Simple component | ❌ No (unnecessary overhead) |
| Props change every render | ❌ No (won't help) |

```jsx
import { memo } from 'react';

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
  // Optional custom comparison
  return prevProps.data === nextProps.data &&
         prevProps.onAction === nextProps.onAction;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState([]);

  const handleAction = useCallback(() => {
    console.log('Action performed');
  }, []);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {/* ExpensiveComponent does NOT re-render when count changes */}
      <ExpensiveComponent data={data} onAction={handleAction} />
    </div>
  );
}
```

### 💡 **Avoiding Unnecessary Renders**

Common pitfalls that cause re-renders.

**❌ Bad: Creates new object every render:**

```jsx
function BadComponent() {
  return <ChildComponent style={{ color: 'red' }} />;
  // New object → React thinks props changed → child re-renders
}
```

**✅ Good: Reuse the same object:**

```jsx
const style = { color: 'red' };

function GoodComponent() {
  return <ChildComponent style={style} />;
}
```

**❌ Bad: Inline function:**

```jsx
<button onClick={() => handleClick(item.id)}>Click</button>
// New function every render
```

**✅ Good: useCallback:**

```jsx
const handleClick = useCallback((id) => {
  // Handle click
}, []);

<button onClick={() => handleClick(item.id)}>Click</button>
```

### 💡 **React.lazy for Code Splitting**

```jsx
import { lazy, Suspense } from 'react';

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

---

## Debouncing and Throttling

### 💡 **The Problem**

Some events fire **many times per second**:

| Event | Frequency |
|-------|-----------|
| Typing | ~10 events/sec |
| Scrolling | ~60 events/sec |
| Window resize | ~30 events/sec |
| Mouse move | 60+ events/sec |

If your handler is heavy (API call, calculation), this causes lag.

### 💡 **Debounce vs Throttle**

| Pattern | Behavior | Use Case |
|---------|----------|----------|
| **Debounce** | Wait for events to stop, then run | Search inputs |
| **Throttle** | Run at most once per interval | Scroll handlers |

**Visual Comparison:**

```
Events:  X X X X X X X X X
         ^ ^ ^ ^ ^ ^ ^ ^ ^

Debounce (300ms):
                          X
                          ↑ runs only after pause

Throttle (300ms):
         X       X       X
         ↑       ↑       ↑ runs every 300ms max
```

### 💡 **Debounce Implementation**

```javascript
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

// Usage: search input
const searchHandler = debounce((query) => {
  fetch(`/api/search?q=${query}`)
    .then(res => res.json())
    .then(data => displayResults(data));
}, 300);

input.addEventListener('input', (e) => searchHandler(e.target.value));
```

### 💡 **Throttle Implementation**

```javascript
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage: scroll handler
const scrollHandler = throttle(() => {
  console.log('Scroll position:', window.scrollY);
  updateScrollIndicator();
}, 100);

window.addEventListener('scroll', scrollHandler);
```

### 💡 **React Hooks for Debounce/Throttle**

**Debounce Hook:**

```jsx
import { useEffect, useState } from 'react';

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
      // Only runs after user stops typing for 300ms
      fetch(`/api/search?q=${debouncedSearchTerm}`)
        .then(res => res.json())
        .then(data => setResults(data));
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
}
```

**Throttle Hook:**

```jsx
import { useCallback, useRef } from 'react';

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

---

## requestAnimationFrame

### 💡 **What is requestAnimationFrame?**

`requestAnimationFrame` (rAF) syncs your animations with the browser's repaint cycle. It runs your code **right before the browser paints the next frame**.

### 💡 **rAF vs setInterval**

| Feature | setInterval | requestAnimationFrame |
|---------|-------------|----------------------|
| Sync with browser | ❌ No | ✅ Yes |
| Pauses on tab switch | ❌ No | ✅ Yes |
| Smooth at 60fps | ⚠️ Sometimes | ✅ Always |
| Battery friendly | ❌ Drains | ✅ Saves |

**❌ Before (setInterval):**

```javascript
let position = 0;
setInterval(() => {
  position += 5;
  element.style.transform = `translateX(${position}px)`;
}, 16); // Trying to hit ~60fps
```

**Problems:**
- Not synced with paint
- Keeps running on hidden tab
- Janky on slow devices

**✅ After (requestAnimationFrame):**

```javascript
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

**Benefits:**
- ✅ Synced with browser
- ✅ Pauses when tab is hidden
- ✅ Smooth 60fps animation

### 💡 **Scroll-Based Animation**

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

### 💡 **React with rAF**

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

---

## CSS Containment

### 💡 **What is CSS contain?**

`contain` tells the browser **"changes inside this element won't affect anything outside."** This lets the browser optimize rendering.

**Without contain**: Browser might recalculate layout for the entire page when something inside changes.

**With contain**: Browser knows it can stop at the boundary.

### 💡 **The contain Values**

| Value | What It Promises |
|-------|------------------|
| `layout` | Layout changes inside don't affect outside |
| `paint` | Element doesn't paint outside its bounds |
| `size` | Size is independent of children |
| `content` | layout + paint (most common) |
| `strict` | All of the above |

```css
/* Layout containment */
.article {
  contain: layout;
}

/* Paint containment */
.widget {
  contain: paint;
}

/* Size containment */
.card {
  contain: size;
}

/* Full containment (shorthand: contain: strict) */
.independent-component {
  contain: layout paint size;
}

/* Most common: contain layout + paint */
.section {
  contain: content;
}
```

### 💡 **content-visibility (Powerful)**

`content-visibility: auto` tells the browser to **skip rendering off-screen content**. Massive performance win for long pages.

```css
/* Browser skips rendering until visible */
.lazy-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* Reserve space */
}

/* Hide and don't render */
.hidden {
  content-visibility: hidden;
}
```

> **Key Insight:**
> `content-visibility: auto` is like lazy loading for rendering — it can speed up initial page render by 50%+ on long pages, with zero JavaScript.

### 💡 **Practical Examples**

```css
/* Product grid — each card is independent */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.product-card {
  contain: layout paint;
}

/* Long article list with lazy rendering */
.article-list {
  display: flex;
  flex-direction: column;
}

.article {
  content-visibility: auto;
  contain-intrinsic-size: 0 400px;
}
```

---

## Virtual Scrolling

### 💡 **The Problem with Long Lists**

If you have 10,000 items in a list:

```
Render all 10,000 items
    ↓
DOM has 10,000 elements
    ↓
Browser slows down
    ↓
User has bad experience
```

### 💡 **The Solution: Virtual Scrolling**

Only render the items currently visible (~10-20). Show empty space for the rest.

```
Total items: 10,000
Visible: ~12 (rest of the list is just empty space)
    ↓
DOM only has ~12 elements
    ↓
Smooth performance
```

### 💡 **Custom Implementation**

```jsx
import { useEffect, useRef, useState } from 'react';

function VirtualScroll({ items, itemHeight, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate which items are visible
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

  // Add buffer above/below
  const visibleItems = items.slice(
    Math.max(0, visibleStart - 2),
    Math.min(items.length, visibleEnd + 2)
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
      {/* Total scroll area */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Only visible items */}
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

### 💡 **React Window (Production-Ready)**

In real apps, use the `react-window` library — it handles edge cases.

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
```

**Variable-Size Items:**

```jsx
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

---

## Interview Questions

**Q1: What's the difference between useMemo and useCallback?**

| Hook | Caches |
|------|--------|
| **useMemo** | A computed value |
| **useCallback** | A function reference |

```jsx
const value = useMemo(() => expensiveCalculation(), [deps]);
const callback = useCallback(() => handleClick(), [deps]);
```

**Q2: When should you use React.memo?**

✅ Use when:
- Component renders often with same props
- Re-renders are expensive
- Component is pure (same props = same output)

❌ Don't use for:
- Simple components
- Props that change frequently
- Premature optimization

**Q3: Difference between debounce and throttle?**

| Pattern | When It Runs | Use Case |
|---------|-------------|----------|
| **Debounce** | After events stop | Search input |
| **Throttle** | At most once per interval | Scroll handler |

```javascript
debounce(search, 300)        // After typing stops
throttle(updateScroll, 100)  // Max once per 100ms
```

**Q4: Why use requestAnimationFrame over setInterval?**

- ✅ Synced with browser repaint (60fps)
- ✅ Auto-pauses when tab is inactive
- ✅ Better performance and battery life
- ✅ Smoother animations

```javascript
// Bad: not synced
setInterval(() => animate(), 16);

// Good: synced with browser
requestAnimationFrame(animate);
```

**Q5: What is virtual scrolling?**

Only render items currently visible in long lists.

**Benefits:**
- ✅ Renders ~12 items instead of 10,000
- ✅ Constant performance
- ✅ Less memory

**Use when:**
- Lists > 100 items
- Each item has heavy DOM

**Q6: What does CSS contain do?**

```css
.component {
  contain: layout paint;
}
```

Tells browser the element's internals are independent.

**Benefits:**
- ✅ Skip layout calculations for unchanged containers
- ✅ Better paint performance
- ✅ Faster rendering

**Q7: What is content-visibility?**

```css
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}
```

Browser skips rendering off-screen content.

**Impact:**
- ✅ 50%+ faster initial render
- ✅ Better scroll performance
- ✅ Reduced memory

**Q8: How do you prevent unnecessary React re-renders?**

1. ✅ `React.memo` for components
2. ✅ `useMemo` for expensive calculations
3. ✅ `useCallback` for function references
4. ✅ Proper `key` props in lists
5. ✅ Move state down (component composition)
6. ✅ Split contexts to avoid wide re-renders

**Q9: What tools help find rendering issues?**

| Tool | Purpose |
|------|---------|
| **React DevTools Profiler** | Find slow renders |
| **Chrome Performance tab** | Paint/layout analysis |
| **Why Did You Render** | Debug unnecessary renders |
| **Lighthouse** | Performance audits |

**Q10: How do you optimize a large data table?**

```jsx
import { FixedSizeGrid } from 'react-window';

// 1. Virtualize
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

// 3. Paginate when possible
// 4. Debounce filters/sorts
// 5. Use CSS contain
```

---

## Summary

### React Optimization

- ✅ `useMemo` for expensive calculations
- ✅ `useCallback` for stable function references
- ✅ `React.memo` for component memoization
- ✅ Code splitting with `React.lazy`
- ✅ Virtualization for long lists

### Event Optimization

| Event Type | Best Pattern |
|-----------|--------------|
| Search input | Debounce |
| Scroll handler | Throttle |
| Animation | requestAnimationFrame |

### CSS Optimization

- ✅ `contain` property for independence
- ✅ `content-visibility` for lazy rendering
- ✅ `transform` and `opacity` for animations (GPU accelerated)

### Performance Impact

| Optimization | Improvement |
|--------------|-------------|
| Virtual scrolling | 50-90% faster rendering |
| `content-visibility` | 40-60% faster initial load |
| Proper memoization | 30-50% fewer re-renders |
| `requestAnimationFrame` | Smooth 60fps |

> **Key Insight:**
> Don't optimize prematurely. Profile first to find real bottlenecks, then apply targeted fixes.

---

[← Performance Monitoring](./07-performance-monitoring.md) | [Back to Web Performance](./README.md)
