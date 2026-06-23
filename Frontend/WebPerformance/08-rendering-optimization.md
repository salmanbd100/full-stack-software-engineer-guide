# Rendering Optimization

## Overview

Rendering optimization keeps your UI **smooth and responsive** — 60 frames per second, no janky scrolling, no laggy clicks.

> **Real-Life Example:**
> Buttery-smooth scrolling on a good app vs the stutter of an old, heavy page. The difference is rendering work.

---

## Table of Contents
- [Avoiding Unnecessary Re-renders](#avoiding-unnecessary-re-renders)
- [Debouncing and Throttling](#debouncing-and-throttling)
- [requestAnimationFrame](#requestanimationframe)
- [CSS Containment](#css-containment)
- [Virtual Scrolling](#virtual-scrolling)
- [Interview Questions](#interview-questions)

---

## Avoiding Unnecessary Re-renders

React re-renders a component when its props or state change. Expensive renders triggered by unrelated updates cause lag.

### 💡 **`useMemo`, `useCallback`, `React.memo`**

| Tool | Caches |
|------|--------|
| `useMemo` | The result of an expensive calculation |
| `useCallback` | A function reference (so children don't re-render) |
| `React.memo` | A component's render when its props are unchanged |

```tsx
import { memo, useCallback, useMemo, useState } from 'react';

interface Row { id: string; name: string; }

const ExpensiveRow = memo(function ExpensiveRow({
  row,
  onSelect,
}: {
  row: Row;
  onSelect: (id: string) => void;
}) {
  return <li onClick={() => onSelect(row.id)}>{row.name}</li>;
});

function List({ rows }: { rows: Row[] }): JSX.Element {
  const [query, setQuery] = useState('');

  // Re-filter only when rows or query change
  const filtered = useMemo<Row[]>(
    () => rows.filter((r) => r.name.includes(query)),
    [rows, query],
  );

  // Stable reference → memoized rows don't re-render needlessly
  const handleSelect = useCallback((id: string) => console.log(id), []);

  return (
    <ul>
      {filtered.map((row) => (
        <ExpensiveRow key={row.id} row={row} onSelect={handleSelect} />
      ))}
    </ul>
  );
}
```

> **When to use `React.memo`:** the component is expensive *and* renders often with the same props. Skip it for cheap components — the comparison costs more than it saves.

> ✨ **React 19 note:** the React Compiler can auto-memoize components and values at build time, removing most manual `useMemo`/`useCallback`. Reach for them by hand only where profiling shows a real hotspot.

---

## Debouncing and Throttling

Some events fire constantly: scroll (~60/s), mousemove (60+/s), typing (~10/s). Running heavy work on every one causes lag.

| Pattern | Behavior | Use Case |
|---------|----------|----------|
| **Debounce** | Wait until events stop, then run once | Search input |
| **Throttle** | Run at most once per interval | Scroll / resize handler |

```
Events:    X X X X X X X X X
Debounce:                    X   ← runs after the pause
Throttle:  X      X      X       ← runs on a fixed interval
```

```typescript
function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const search = debounce((q: string) => fetchResults(q), 300);
input.addEventListener('input', (e) => search((e.target as HTMLInputElement).value));
```

In React, a `useDebounce` hook is the cleanest form:

```tsx
import { useEffect, useState } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

---

## requestAnimationFrame

`requestAnimationFrame` (rAF) runs your code right before the browser paints the next frame — the right way to animate.

| Feature | `setInterval` | `requestAnimationFrame` |
|---------|---------------|-------------------------|
| Synced with paint | ❌ | ✅ |
| Pauses on hidden tab | ❌ | ✅ |
| Smooth 60fps | ⚠️ sometimes | ✅ |

```typescript
// ❌ Not synced with paint; keeps running on a hidden tab
setInterval(() => move(5), 16);

// ✅ Synced, pauses when hidden, smooth
function animate(): void {
  move(5);
  if (notDone()) requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

Use rAF to batch expensive work triggered by scroll, so it runs once per frame instead of per event:

```typescript
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
```

---

## CSS Containment

`contain` promises the browser that **changes inside an element won't affect anything outside**, so it can skip recalculating the rest of the page.

| Value | Promise |
|-------|---------|
| `layout` | Inner layout changes don't affect outside |
| `paint` | Nothing paints beyond the element's bounds |
| `content` | `layout` + `paint` (most common) |

```css
.card {
  contain: content; /* the browser can stop layout/paint at this boundary */
}
```

### 💡 **content-visibility for Long Pages**

`content-visibility: auto` tells the browser to skip rendering off-screen sections — like lazy loading for rendering.

```css
.section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* reserve space so the scrollbar is stable */
}
```

> **Key Insight:**
> `content-visibility: auto` can dramatically speed up first paint on long pages with zero JavaScript. Always pair it with `contain-intrinsic-size` to avoid layout shift.

---

## Virtual Scrolling

Rendering 10,000 list items creates 10,000 DOM nodes and grinds the browser down. Virtual scrolling renders only the ~12 items currently visible and fakes the rest with spacer height.

```
10,000 items → render ~12 visible → DOM stays small → smooth
```

Use a library — it handles scroll math and edge cases:

```tsx
import { FixedSizeList } from 'react-window';

interface Item { id: string; name: string; }

function LargeList({ items }: { items: Item[] }): JSX.Element {
  return (
    <FixedSizeList height={600} width="100%" itemCount={items.length} itemSize={50}>
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>
      )}
    </FixedSizeList>
  );
}
```

Use virtual scrolling when lists exceed ~100 items or each row has heavy DOM.

---

## Interview Questions

**Q1: `useMemo` vs `useCallback`?**

`useMemo` caches a computed *value*; `useCallback` caches a *function reference*. `useCallback(fn, deps)` is essentially `useMemo(() => fn, deps)`. Use the stable function to stop memoized children from re-rendering.

**Q2: When should you use `React.memo`?**

When a component is expensive to render *and* often receives the same props. Avoid it for cheap components or props that change every render — the prop comparison then costs more than it saves.

**Q3: Debounce vs throttle?**

Debounce waits until events stop and runs once (search inputs). Throttle runs at most once per interval (scroll/resize handlers). Both limit how often a heavy handler runs.

**Q4: Why `requestAnimationFrame` over `setInterval` for animation?**

rAF is synced to the browser's paint cycle (smooth 60fps), pauses automatically on hidden tabs (saves battery), and avoids the drift and jank of a fixed timer.

**Q5: What does `content-visibility: auto` do and its trade-off?**

It skips rendering off-screen content, speeding up first paint on long pages. The trade-off: without `contain-intrinsic-size`, the scrollbar jumps as sections render, so always give an estimated size.

**Q6: How do you optimize a list of 10,000 rows?**

Virtualize it (render only visible rows with `react-window`), memoize row components, apply `contain` to rows, and debounce filters/sorts. This keeps the DOM small and rendering constant-time.

**Q7: Does React 19 change re-render optimization?**

Yes — the React Compiler auto-memoizes components and values at build time, so most manual `useMemo`/`useCallback`/`memo` becomes unnecessary. You still profile and optimize real hotspots, but with far less boilerplate.

---

## Summary

| Area | Technique |
|------|-----------|
| React renders | `useMemo`, `useCallback`, `React.memo` (or React Compiler) |
| Frequent events | Debounce (search), throttle (scroll) |
| Animation | `requestAnimationFrame`, animate `transform`/`opacity` |
| Long pages | `contain`, `content-visibility: auto` |
| Long lists | Virtual scrolling |

> **Key Insight:**
> Don't optimize blindly. Profile with the React DevTools Profiler and the Chrome Performance tab, find the real bottleneck, then apply the targeted fix.

---

[← Performance Monitoring](./07-performance-monitoring.md) | [Back to Web Performance](./README.md)
