# Bundle Optimization

## Overview

The JavaScript bundle is the file users download to run your app. **The bigger it is, the slower the page** — to download, parse, and execute.

> **Why It Matters:**
> Every kilobyte of JavaScript costs download + parse + execute time. A 1 MB bundle on a mid-range phone can mean 5–10 seconds before the page is usable.

---

## Table of Contents
- [Tree Shaking](#tree-shaking)
- [Minification](#minification)
- [Compression](#compression)
- [Bundle Analysis](#bundle-analysis)
- [Interview Questions](#interview-questions)

---

## Tree Shaking

Tree shaking removes code you import but never use. The name comes from shaking dead leaves off a tree.

```
Library exports: add, subtract, multiply, divide
You import: only `add`
   ↓ tree shaking
Bundle contains: only `add`
```

### 💡 **Requirements**

| Requirement | Why |
|-------------|-----|
| ES modules (`import`/`export`) | Static structure can be analyzed |
| Production build | Dev builds skip tree shaking |
| No import-time side effects | Code that runs on import can't be safely dropped |

Mark your package side-effect free so bundlers can prune aggressively:

```typescript
// package.json
{
  "sideEffects": false
}
// or list the exceptions:
{
  "sideEffects": ["*.css", "./src/polyfills.ts"]
}
```

### 💡 **Import Style Decides Bundle Size**

```typescript
// ❌ Pulls in the entire library (~70 KB)
import _ from 'lodash';
_.debounce(fn, 300);

// ✅ Tree-shakeable ES module version (~2 KB for one function)
import { debounce } from 'lodash-es';
```

| Import | Added Size |
|--------|-----------|
| `import _ from 'lodash'` | ~70 KB |
| `import { debounce } from 'lodash-es'` | ~2 KB |

> **Key Insight:**
> Named ES exports + a production build let the bundler drop everything you don't use. Careful imports alone can cut 20–40%.

---

## Minification

Minification removes what humans need but computers don't: whitespace, long names, comments.

```typescript
// Before
function calculateTotal(items: Item[]): number {
  let total = 0;
  for (const item of items) total += item.price;
  return total;
}

// After (~70% smaller)
function c(t){let e=0;for(const r of t)e+=r.price;return e}
```

Modern bundlers minify automatically in production:

```typescript
// vite.config.ts — esbuild is the default minifier (very fast)
export default {
  build: {
    minify: 'esbuild',
    target: 'es2020',
  },
};
```

Webpack uses Terser by default; you only configure it for extras like dropping `console` calls in production.

---

## Compression

After minifying, the server compresses files before sending. The browser decompresses on arrival.

```
1000 KB  →  minify  →  700 KB  →  Brotli  →  ~180 KB sent over the wire
```

| Method | Reduction | Support |
|--------|-----------|---------|
| **Gzip** | ~70% | Universal |
| **Brotli** | ~75% | All modern browsers |

Serve Brotli with a gzip fallback. Most CDNs and hosts (Vercel, Netlify, Cloudflare, Nginx) do this automatically — you rarely configure it by hand today.

```nginx
# Nginx example
brotli on;
brotli_types text/css application/javascript application/json;
gzip on;
gzip_types text/css application/javascript application/json;
```

> **Key Insight:**
> Minification + Brotli together cut JavaScript by 80–90%. Always measure the **compressed** size — that's what users download.

---

## Bundle Analysis

You can't shrink what you can't see. A bundle analyzer shows your bundle as a treemap — big rectangles are big files.

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [visualizer({ filename: 'stats.html', gzipSize: true })],
};
```

For Webpack, `webpack-bundle-analyzer` does the same. `source-map-explorer` works with any bundler that emits source maps.

### 💡 **Common Bundle Bloat**

| Library | Size | Lighter Choice |
|---------|------|----------------|
| `moment` | ~290 KB | `date-fns` or `dayjs` (~2 KB) |
| `lodash` (full) | ~70 KB | `lodash-es` with tree shaking |
| `axios` | ~15 KB | native `fetch` |
| `chart.js` | ~260 KB | lazy load it |

Check a package's cost before installing it (for example with [bundlephobia.com](https://bundlephobia.com)).

---

## Interview Questions

**Q1: What is tree shaking and what does it require?**

Removing unused exports from the bundle. It requires ES modules (statically analyzable), a production build, and no import-time side effects (declared via `sideEffects` in `package.json`).

**Q2: Why does `import { debounce } from 'lodash-es'` beat `import _ from 'lodash'`?**

The default `lodash` build is CommonJS and pulls the whole library (~70 KB). `lodash-es` ships ES modules, so the bundler tree-shakes everything except the one function you use (~2 KB).

**Q3: Minification vs compression — what's the difference?**

Minification rewrites the source smaller (strip whitespace, shorten names) at build time. Compression (gzip/Brotli) encodes the bytes smaller in transit and is reversed by the browser. They stack.

**Q4: Gzip vs Brotli?**

Brotli compresses ~5–25% better than gzip and is supported by all modern browsers; gzip is the universal fallback. Most hosts serve Brotli automatically and fall back to gzip.

**Q5: What's a good bundle-size target?**

Initial bundle under ~200 KB gzipped, individual chunks ~30–50 KB. Larger bundles delay parse/execute and push out Time to Interactive.

**Q6: How do you find and fix bundle bloat?**

Run a bundle analyzer (treemap), spot oversized dependencies, then tree-shake, swap for lighter libraries (`date-fns` over `moment`), lazy-load heavy ones, and drop unused packages.

---

## Summary

### Checklist
- [ ] ES modules + `sideEffects` for tree shaking
- [ ] Production minification (esbuild/Terser)
- [ ] Brotli + gzip compression
- [ ] Code splitting (see [03](./03-code-splitting.md))
- [ ] Run a bundle analyzer
- [ ] Target < 200 KB gzipped initial bundle

### Impact
| Technique | Reduction |
|-----------|-----------|
| Tree shaking | 10–30% |
| Minification | 30–50% |
| Compression | 70–75% |
| **Combined** | **80–90%** |

> **Key Insight:**
> Modern toolchains (Vite, esbuild, Next.js) handle most of this automatically. Your real job is keeping dependencies small and imports specific.

---

[← Image Optimization](./05-image-optimization.md) | [Next: Performance Monitoring →](./07-performance-monitoring.md)
