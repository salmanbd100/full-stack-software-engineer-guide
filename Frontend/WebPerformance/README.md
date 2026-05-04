# Web Performance

Learn how to make websites load fast and run smoothly. Performance is one of the most important topics in frontend interviews because **slow websites lose users and money**.

> **Quick Truth:**
> A 1-second delay in page load can drop sales by 7%. Performance is not optional.

---

## 📚 What You Will Learn

### 🎯 Performance Metrics

| File | Topic | What You Learn |
|------|-------|----------------|
| [01](./01-core-web-vitals.md) | **Core Web Vitals** | The 3 numbers Google uses to score your site |

### ⚡ Loading Optimization

| File | Topic | What You Learn |
|------|-------|----------------|
| [02](./02-lazy-loading.md) | **Lazy Loading** | Load things only when needed |
| [03](./03-code-splitting.md) | **Code Splitting** | Break your JavaScript into smaller pieces |
| [06](./06-bundle-optimization.md) | **Bundle Optimization** | Make your JavaScript file smaller |

### 🖼️ Resource Optimization

| File | Topic | What You Learn |
|------|-------|----------------|
| [05](./05-image-optimization.md) | **Image Optimization** | Make images load faster |
| [04](./04-caching-strategies.md) | **Caching Strategies** | Save files so they don't reload |

### 📊 Monitoring & Rendering

| File | Topic | What You Learn |
|------|-------|----------------|
| [07](./07-performance-monitoring.md) | **Performance Monitoring** | Measure how fast your site is |
| [08](./08-rendering-optimization.md) | **Rendering Optimization** | Make your UI feel smooth |

---

## 🎯 Interview Focus Areas

### 🔴 **Most Important (Must Know)**

1. **Core Web Vitals** - LCP, INP, CLS
2. **Lazy loading** - Images and components
3. **Code splitting** - Smaller JavaScript bundles
4. **Bundle optimization** - Tree shaking, minification
5. **Image optimization** - Modern formats, responsive

### 🟡 **Very Important**

6. Caching strategies
7. Performance measurement tools
8. Rendering optimization
9. Network optimization
10. Critical rendering path

### 🟢 **Good to Know**

11. Service workers
12. HTTP/2 and HTTP/3
13. Resource hints (preload, prefetch)
14. Performance budgets

---

## 💡 Common Interview Questions

| Question | Where to Look |
|----------|---------------|
| "What are Core Web Vitals?" | [01-core-web-vitals.md](./01-core-web-vitals.md) |
| "How do you optimize images?" | [05-image-optimization.md](./05-image-optimization.md) |
| "Explain code splitting and lazy loading" | [02](./02-lazy-loading.md), [03](./03-code-splitting.md) |
| "What caching strategies do you use?" | [04-caching-strategies.md](./04-caching-strategies.md) |
| "How do you measure performance?" | [07-performance-monitoring.md](./07-performance-monitoring.md) |
| "What is the critical rendering path?" | [01-core-web-vitals.md](./01-core-web-vitals.md) |
| "Difference between debounce and throttle?" | [08-rendering-optimization.md](./08-rendering-optimization.md) |
| "How to reduce bundle size?" | [06-bundle-optimization.md](./06-bundle-optimization.md) |

---

## ✨ Essential Code Patterns

### 💡 **Lazy Loading a React Component**

Load heavy components only when needed.

```javascript
// Wait until needed before downloading
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 💡 **Lazy Loading an Image**

The browser does the work for you.

```html
<img src="image.jpg" loading="lazy" alt="Description" />
```

### 💡 **Debounce Function**

Wait for the user to stop typing before searching.

```javascript
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

### 💡 **Measure Performance**

Track real loading times.

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry);
  }
});

observer.observe({ entryTypes: ['largest-contentful-paint'] });
```

### 💡 **Code Splitting with Dynamic Import**

Load code only when the user needs it.

```javascript
const loadModule = async () => {
  const module = await import('./heavyModule.js');
  module.doSomething();
};
```

---

## 📊 Performance Targets (Memorize These!)

### Core Web Vitals Thresholds

| Metric | ✅ Good | ⚠️ Needs Work | ❌ Poor |
|--------|---------|----------------|---------|
| **LCP** (Loading) | < 2.5s | 2.5s – 4s | > 4s |
| **INP** (Interactive) | < 200ms | 200ms – 500ms | > 500ms |
| **CLS** (Stable) | < 0.1 | 0.1 – 0.25 | > 0.25 |

### Other Important Metrics

| Metric | Target | What It Means |
|--------|--------|---------------|
| **FCP** (First Contentful Paint) | < 1.8s | When you first see something |
| **TTI** (Time to Interactive) | < 3.8s | When the page can be used |
| **TBT** (Total Blocking Time) | < 200ms | Time the page is frozen |
| **Bundle size** | < 200KB | Initial JavaScript download |

> **Key Insight:**
> If you only remember 3 numbers, remember **2.5s**, **200ms**, and **0.1** — the targets for the three Core Web Vitals.

---

## 🔗 External Resources

- [Web.dev Performance](https://web.dev/performance/) - Google's official guide
- [MDN Performance](https://developer.mozilla.org/en-US/docs/Web/Performance) - Browser API docs
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/) - Built-in browser tool
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Free performance auditing
- [WebPageTest](https://www.webpagetest.org/) - Detailed performance analysis
- [Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer) - See what's in your bundle

---

[← Back to Frontend](../README.md)
