# Bundle Optimization

## Overview

JavaScript bundle size directly impacts page load time. Optimizing your bundles reduces download time, parse time, and execution time. This guide covers tree shaking, minification, compression, and bundle analysis techniques.

## Table of Contents
- [Tree Shaking](#tree-shaking)
- [Minification](#minification)
- [Compression](#compression)
- [Bundle Analysis](#bundle-analysis)
- [Code Splitting](#code-splitting)
- [Interview Questions](#interview-questions)

## Tree Shaking

### What is Tree Shaking?

Tree shaking is dead code elimination for JavaScript bundles - it removes exported code that's never imported or used anywhere in your application. The name comes from the metaphor of shaking a tree to remove dead leaves. Modern bundlers analyze your dependency graph and include only the code paths actually used. This requires ES6 modules (`import`/`export`) because their static structure allows tools to determine what's used at build time. Tree shaking can reduce bundle size by 20-40% in typical applications by eliminating unused library functions, React components, and utility modules.

```javascript
// utils.js - Library with many functions
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }
export function divide(a, b) { return a / b; }

// app.js - Only imports what's needed
import { add } from './utils.js';

console.log(add(5, 3));

// Bundle only includes 'add' function
// subtract, multiply, divide are tree-shaken (removed)
```

### Enabling Tree Shaking

```javascript
// package.json
{
  "sideEffects": false  // All files are side-effect free
}

// Or specify files with side effects
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}

// webpack.config.js
module.exports = {
  mode: 'production',  // Enables tree shaking
  optimization: {
    usedExports: true,
    minimize: true
  }
};
```

### Writing Tree-Shakeable Code

```javascript
// ❌ Bad: CommonJS (not tree-shakeable)
const utils = require('./utils');
module.exports = { add, subtract };

// ✅ Good: ES6 modules
export function add(a, b) { }
export function subtract(a, b) { }

// ❌ Bad: Default export with object
export default {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};

// ✅ Good: Named exports
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;

// ❌ Bad: Side effects
console.log('Module loaded');  // Prevents tree shaking
export function add(a, b) { }

// ✅ Good: Pure functions
export function add(a, b) { return a + b; }
```

### Lodash Tree Shaking

```javascript
// ❌ Bad: Imports entire lodash
import _ from 'lodash';
_.debounce(fn, 300);
// Bundle: +70 KB

// ✅ Better: Import specific function
import debounce from 'lodash/debounce';
// Bundle: +2 KB

// ✅ Best: Use lodash-es (ES modules)
import { debounce } from 'lodash-es';
// With tree shaking: +2 KB
```

## Minification

### JavaScript Minification

Minification compresses JavaScript by removing whitespace, shortening variable names, simplifying expressions, and removing comments - all without changing functionality. This reduces file size by 30-50%, directly improving download time. Modern minifiers like Terser also perform advanced optimizations like function inlining, dead code removal, and constant folding. The `drop_console` option removes console.log statements from production builds, preventing both bloat and potential information leakage. Minification is essential for production - never ship unminified code.

```javascript
// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,  // Remove console.log
            dead_code: true,
            unused: true
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false  // Remove comments
          }
        },
        extractComments: false
      })
    ]
  }
};

// Vite (uses esbuild by default)
export default {
  build: {
    minify: 'esbuild',  // or 'terser'
    target: 'es2015'
  }
};
```

### CSS Minification

```javascript
// PostCSS with cssnano
module.exports = {
  plugins: [
    require('cssnano')({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: true
      }]
    })
  ]
};

// Webpack
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new CssMinimizerPlugin()
    ]
  }
};
```

### HTML Minification

```javascript
// html-minifier
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        minifyCSS: true,
        minifyJS: true
      }
    })
  ]
};
```

## Compression

### Gzip Compression

Gzip compression is the most widely-deployed HTTP compression method, reducing text-based assets (HTML, CSS, JavaScript) by 60-80%. It works by finding and replacing repeated patterns in files - highly effective for code with common keywords and structures. Modern servers and CDNs handle compression automatically, but you can configure the compression level (1-9) to balance compression ratio versus CPU usage. Level 6 is usually optimal. Enable compression for all text assets but not for already-compressed formats like images and videos. The transfer savings dramatically improve load times on slow connections.

```javascript
// Express server
const compression = require('compression');

app.use(compression({
  level: 6,  // 0-9, higher = better compression but slower
  threshold: 1024  // Only compress files > 1KB
}));

// Static file compression (build time)
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,  // Only compress files > 10KB
      minRatio: 0.8
    })
  ]
};

// Nginx configuration
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1024;
gzip_comp_level 6;
```

### Brotli Compression

```javascript
// Better compression than gzip (20-25% smaller)
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  plugins: [
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: {
        level: 11  // 0-11, higher = better compression
      },
      threshold: 10240,
      minRatio: 0.8
    })
  ]
};

// Nginx with brotli
brotli on;
brotli_types text/plain text/css application/json application/javascript;
```

### Compression Comparison

```javascript
// File size comparison (same file)
const compressionSizes = {
  original: '1000 KB',
  gzip: '300 KB',      // 70% reduction
  brotli: '250 KB'     // 75% reduction
};

// Serve brotli with gzip fallback
app.get('*', (req, res) => {
  const acceptEncoding = req.headers['accept-encoding'];

  if (acceptEncoding.includes('br')) {
    res.set('Content-Encoding', 'br');
    res.sendFile('bundle.js.br');
  } else if (acceptEncoding.includes('gzip')) {
    res.set('Content-Encoding', 'gzip');
    res.sendFile('bundle.js.gz');
  } else {
    res.sendFile('bundle.js');
  }
});
```

## Bundle Analysis

### Webpack Bundle Analyzer

```bash
npm install --save-dev webpack-bundle-analyzer
```

```javascript
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: true,
      generateStatsFile: true,
      statsFilename: 'stats.json'
    })
  ]
};
```

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "analyze": "webpack --mode production && webpack-bundle-analyzer dist/stats.json"
  }
}
```

### Source Map Explorer

```bash
npm install --save-dev source-map-explorer
```

```json
{
  "scripts": {
    "analyze": "source-map-explorer 'build/static/js/*.js' 'build/static/css/*.css'"
  }
}
```

### Identifying Large Dependencies

```javascript
// Check package sizes before installing
npm install -g package-size

package-size moment
// moment: 288 KB

package-size date-fns
// date-fns: 78 KB (with tree shaking: ~2 KB per function)

package-size dayjs
// dayjs: 2 KB

// Alternative to large libraries
const alternatives = {
  'moment': 'date-fns or dayjs',
  'lodash': 'lodash-es or native ES6',
  'axios': 'fetch API',
  'jquery': 'native DOM APIs'
};
```

## Code Splitting

### Entry Point Splitting

```javascript
// webpack.config.js
module.exports = {
  entry: {
    main: './src/index.js',
    vendor: './src/vendor.js',
    admin: './src/admin.js'
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist')
  }
};
```

### Vendor Bundle Splitting

```javascript
module.exports = {
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

### Dynamic Imports

```javascript
// Load on demand
button.addEventListener('click', async () => {
  const { heavyFunction } = await import('./heavy-module.js');
  heavyFunction();
});

// React lazy loading
const AdminPanel = lazy(() => import('./AdminPanel'));

<Suspense fallback={<Loading />}>
  <AdminPanel />
</Suspense>
```

## Interview Questions

**Q1: What is tree shaking?**
A: Eliminating dead code (unused exports) from bundle.

Requirements:
- ES6 modules (import/export)
- Production mode
- No side effects

```javascript
// Only imported functions included
import { used } from './utils';
// 'unused' function removed from bundle
```

**Q2: How do you enable tree shaking?**
```json
// package.json
{
  "sideEffects": false
}

// webpack.config.js
mode: 'production'
```

**Q3: Difference between gzip and brotli?**
A:
- **Gzip**: Universal support, 70% compression
- **Brotli**: Better compression (75%), slower encoding, newer browser support

Serve brotli with gzip fallback.

**Q4: How do you analyze bundle size?**
```bash
# Webpack Bundle Analyzer
webpack-bundle-analyzer dist/stats.json

# Source Map Explorer
source-map-explorer 'build/static/js/*.js'

# Lighthouse
# Bundle size in report
```

**Q5: What's the ideal bundle size?**
A:
- **Initial bundle**: < 200 KB (gzipped)
- **Individual chunks**: 30-50 KB
- **Total JavaScript**: < 500 KB

Larger bundles delay Time to Interactive.

**Q6: How do you reduce bundle size?**
1. Tree shaking (remove unused code)
2. Code splitting (load on demand)
3. Minification (remove whitespace, shorten names)
4. Compression (gzip/brotli)
5. Remove unused dependencies
6. Use smaller alternatives (date-fns vs moment)

**Q7: What are common bundle bloat causes?**
- Unused dependencies
- Duplicate packages (lodash + lodash-es)
- Large libraries for small features
- Not code splitting
- Images/fonts in bundle

**Q8: How does minification work?**
```javascript
// Before minification
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}

// After minification
function c(t){let e=0;for(const r of t)e+=r.price;return e}
```
Removes whitespace, shortens variable names, simplifies code.

**Q9: What's the role of package.json sideEffects?**
```json
{
  "sideEffects": false
}
```
Tells bundler that all files are side-effect free (can tree shake safely).

If some files have side effects:
```json
{
  "sideEffects": ["*.css", "./src/polyfills.js"]
}
```

**Q10: How do you optimize third-party libraries?**
- Use CDN for popular libraries
- Import only what you need
- Use lighter alternatives
- Lazy load non-critical libraries
- Check bundle impact before adding

```javascript
// ❌ Bad
import _ from 'lodash';  // +70 KB

// ✅ Good
import { debounce } from 'lodash-es';  // +2 KB
```

## Summary

**Optimization Checklist:**
- [ ] Enable tree shaking (ES6 modules)
- [ ] Configure minification (Terser)
- [ ] Enable compression (gzip + brotli)
- [ ] Implement code splitting
- [ ] Remove unused dependencies
- [ ] Use bundle analyzer
- [ ] Target < 200 KB initial bundle

**Key Tools:**
- Webpack Bundle Analyzer
- Source Map Explorer
- Terser (minification)
- CompressionPlugin
- Lighthouse

**Performance Impact:**
- Tree shaking: 10-30% reduction
- Minification: 30-50% reduction
- Compression: 70-75% reduction
- Combined: 80-90% size reduction

**Best Practices:**
- Measure before optimizing
- Set performance budgets
- Analyze bundle regularly
- Use modern build tools (Vite, esbuild)
- Prefer native over libraries when possible

---

[← Image Optimization](./05-image-optimization.md) | [Next: Performance Monitoring →](./07-performance-monitoring.md)
