# Module System

## Overview

Node.js has two module systems: CommonJS (traditional) and ES Modules (modern). Understanding both and knowing when to use each is crucial for backend development.

**Why This Matters:**
- Module systems organize code into reusable pieces
- Different ecosystems prefer different systems
- Interoperability between systems is tricky
- Choice affects bundling, tree-shaking, and performance
- Essential for npm package development

**Key Differences at a Glance:**

| Feature | CommonJS (`require`) | ES Modules (`import`) |
|---------|---------------------|----------------------|
| **Syntax** | `require()` / `module.exports` | `import` / `export` |
| **Loading** | Synchronous | Asynchronous |
| **When** | Runtime | Parse time |
| **Tree-shaking** | ❌ No | ✅ Yes |
| **Browser** | ❌ No (needs bundler) | ✅ Native support |
| **Node.js** | ✅ Default | ✅ `.mjs` or `"type": "module"` |

## CommonJS Modules

### Basic Usage

```javascript
// math.js - Exporting
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// Export individual functions
exports.add = add;
exports.subtract = subtract;

// OR export an object
module.exports = {
  add,
  subtract
};

// app.js - Importing
const math = require('./math');
console.log(math.add(5, 3)); // 8

// Destructuring import
const { add, subtract } = require('./math');
console.log(add(5, 3)); // 8
```

### ⚠️ **module.exports vs exports**

Understanding the difference is crucial to avoid common bugs.

```javascript
// They reference the same object initially
console.log(module.exports === exports); // true

// CORRECT: Adding properties to exports
exports.foo = 'bar';
exports.hello = function() { return 'world'; };

// CORRECT: Replacing module.exports
module.exports = class User {
  constructor(name) {
    this.name = name;
  }
};

// WRONG: Reassigning exports breaks the reference
exports = { foo: 'bar' }; // This doesn't work!
// Use module.exports instead
module.exports = { foo: 'bar' }; // This works

// Real-world example
// user.js
class User {
  constructor(name) {
    this.name = name;
  }

  greet() {
    return `Hello, ${this.name}!`;
  }
}

module.exports = User; // Export the class

// app.js
const User = require('./user');
const user = new User('Alice');
console.log(user.greet()); // 'Hello, Alice!'
```

### Module Caching

```javascript
// counter.js
let count = 0;

module.exports = {
  increment() {
    return ++count;
  },
  getCount() {
    return count;
  }
};

// app.js
const counter1 = require('./counter');
const counter2 = require('./counter');

console.log(counter1.increment()); // 1
console.log(counter2.increment()); // 2 (same instance!)
console.log(counter1 === counter2); // true

// Cache location
console.log(require.cache);

// Clear cache (rarely needed)
delete require.cache[require.resolve('./counter')];
const counter3 = require('./counter');
console.log(counter3.getCount()); // 0 (new instance)
```

### require() Behavior

```javascript
// 1. Core modules (highest priority)
const fs = require('fs');
const path = require('path');

// 2. File modules (starts with ./, ../, or /)
const myModule = require('./myModule');       // ./myModule.js
const util = require('../utils/helper');      // ../utils/helper.js

// 3. Folder modules (looks for package.json or index.js)
const myPackage = require('./myPackage');
// Looks for:
// 1. ./myPackage/package.json (main field)
// 2. ./myPackage/index.js

// 4. node_modules (searches up directory tree)
const express = require('express');
// Searches:
// ./node_modules/express
// ../node_modules/express
// ../../node_modules/express
// etc.

// require.resolve() - Get full path without loading
const modulePath = require.resolve('express');
console.log(modulePath); // /path/to/node_modules/express/index.js
```

### Circular Dependencies

```javascript
// a.js
console.log('a starting');
exports.done = false;
const b = require('./b');
console.log('in a, b.done =', b.done);
exports.done = true;
console.log('a done');

// b.js
console.log('b starting');
exports.done = false;
const a = require('./a');
console.log('in b, a.done =', a.done);
exports.done = true;
console.log('b done');

// main.js
console.log('main starting');
const a = require('./a');
const b = require('./b');
console.log('in main, a.done=%j, b.done=%j', a.done, b.done);

/* Output:
main starting
a starting
b starting
in b, a.done = false  // Partial exports!
b done
in a, b.done = true
a done
in main, a.done=true, b.done=true
*/

// Best practice: Avoid circular dependencies
// Use dependency injection or restructure code
```

## ES Modules (ESM)

### Basic Syntax

```javascript
// math.mjs (or .js with "type": "module" in package.json)

// Named exports
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export const PI = 3.14159;

// Export list
function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  return a / b;
}

export { multiply, divide };

// Default export
export default class Calculator {
  add(a, b) {
    return a + b;
  }
}

// Combination
export default class Calculator {}
export const version = '1.0.0';

// app.mjs
// Named imports
import { add, subtract, PI } from './math.mjs';
console.log(add(5, 3)); // 8

// Import all
import * as math from './math.mjs';
console.log(math.add(5, 3)); // 8

// Default import
import Calculator from './math.mjs';
const calc = new Calculator();

// Combined
import Calculator, { version } from './math.mjs';

// Rename imports
import { add as sum, subtract as diff } from './math.mjs';
console.log(sum(5, 3)); // 8
```

### Dynamic Imports

```javascript
// CommonJS-style dynamic import
async function loadModule() {
  const module = await import('./module.mjs');
  console.log(module.default);
}

// Conditional import
async function loadEnvironmentConfig() {
  if (process.env.NODE_ENV === 'production') {
    const config = await import('./config.prod.mjs');
    return config.default;
  } else {
    const config = await import('./config.dev.mjs');
    return config.default;
  }
}

// Lazy loading
async function handleRequest(req, res) {
  if (req.url === '/heavy-feature') {
    const { processHeavyFeature } = await import('./heavy-feature.mjs');
    await processHeavyFeature(req, res);
  }
}

// Top-level await (Node.js 14.8+)
const data = await fetch('https://api.example.com/data');
const json = await data.json();
console.log(json);
```

### package.json Configuration

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "exports": {
    ".": "./index.js",
    "./utils": "./utils/index.js",
    "./package.json": "./package.json"
  }
}
```

```javascript
// With "type": "module", .js files are ESM
import { something } from './module.js'; // ESM

// Use .cjs extension for CommonJS
const something = require('./module.cjs'); // CommonJS

// Without "type": "module", .js files are CommonJS
const something = require('./module.js'); // CommonJS

// Use .mjs extension for ES modules
import { something } from './module.mjs'; // ESM
```

## CommonJS vs ES Modules

| Feature | CommonJS | ES Modules |
|---------|----------|------------|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | Synchronous | Asynchronous |
| When evaluated | Runtime | Parse time |
| Dynamic imports | Native | Via `import()` |
| Tree shaking | No | Yes |
| Browser support | No | Yes |
| File extension | `.js` (default), `.cjs` | `.mjs`, `.js` (with "type": "module") |
| `__dirname`, `__filename` | Available | Not available (use `import.meta.url`) |
| Exports | Can be reassigned | Cannot be reassigned |

### Interoperability

```javascript
// Import CommonJS from ESM
import pkg from './commonjs-module.js';
const { named } = pkg;

// Import ESM from CommonJS (async)
async function loadESM() {
  const { namedExport } = await import('./esm-module.mjs');
  return namedExport;
}

// __dirname and __filename in ESM
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__filename); // /path/to/file.mjs
console.log(__dirname);  // /path/to
```

## Creating NPM Packages

### Package Structure

```
my-package/
├── package.json
├── README.md
├── LICENSE
├── src/
│   ├── index.js
│   └── utils.js
├── dist/           # Compiled code
├── test/
└── .npmignore      # Files to exclude from npm
```

### package.json Essentials

```json
{
  "name": "@username/my-package",
  "version": "1.0.0",
  "description": "A useful package",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["utility", "helper"],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-package"
  },
  "bugs": {
    "url": "https://github.com/username/my-package/issues"
  },
  "homepage": "https://github.com/username/my-package#readme",
  "dependencies": {
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Publishing Workflow

```bash
# 1. Create account
npm adduser

# 2. Verify package name is available
npm search my-package

# 3. Build and test
npm run build
npm test

# 4. Check what will be published
npm pack --dry-run

# 5. Publish
npm publish

# For scoped packages (first time)
npm publish --access public

# Update version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Publish update
npm publish

# Deprecate a version
npm deprecate my-package@1.0.0 "Use version 1.1.0 instead"

# Unpublish (only within 72 hours)
npm unpublish my-package@1.0.0
```

## Module Patterns

### Singleton Pattern

```javascript
// database.js
class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.connection = this.connect();
    Database.instance = this;
    return this;
  }

  connect() {
    // Establish connection
    return { connected: true };
  }

  query(sql) {
    return this.connection.query(sql);
  }
}

module.exports = new Database(); // Export instance

// Usage
const db1 = require('./database');
const db2 = require('./database');
console.log(db1 === db2); // true
```

### Factory Pattern

```javascript
// logger.js
function createLogger(options = {}) {
  const level = options.level || 'info';
  const prefix = options.prefix || '';

  return {
    info(message) {
      if (level === 'info' || level === 'debug') {
        console.log(`[INFO] ${prefix}${message}`);
      }
    },
    error(message) {
      console.error(`[ERROR] ${prefix}${message}`);
    },
    debug(message) {
      if (level === 'debug') {
        console.log(`[DEBUG] ${prefix}${message}`);
      }
    }
  };
}

module.exports = createLogger;

// Usage
const logger1 = require('./logger')({ level: 'debug', prefix: 'App: ' });
const logger2 = require('./logger')({ level: 'info' });
```

### Revealing Module Pattern

```javascript
// calculator.js
const Calculator = (() => {
  // Private variables and functions
  let result = 0;

  function log(operation, value) {
    console.log(`${operation}: ${value}`);
  }

  // Public API
  return {
    add(value) {
      result += value;
      log('Added', value);
      return this;
    },
    subtract(value) {
      result -= value;
      log('Subtracted', value);
      return this;
    },
    getResult() {
      return result;
    },
    reset() {
      result = 0;
      return this;
    }
  };
})();

module.exports = Calculator;

// Usage
const calc = require('./calculator');
calc.add(5).subtract(2).add(10);
console.log(calc.getResult()); // 13
```

## Common Interview Questions

### Q1: What's the difference between require() and import?

**Short Answer:**
`require()` is CommonJS (synchronous, runtime), `import` is ES Modules (asynchronous, parse-time).

**Detailed Comparison:**

| Feature | require() (CommonJS) | import (ES Modules) |
|---------|---------------------|---------------------|
| **Loading** | Synchronous, blocking | Asynchronous, non-blocking |
| **When Evaluated** | Runtime (dynamic) | Parse time (static) |
| **Conditional Loading** | ✅ Yes | ❌ No (except dynamic import) |
| **Tree Shaking** | ❌ No | ✅ Yes |
| **Caching** | ✅ Yes | ✅ Yes |
| **Top-Level Await** | ❌ No | ✅ Yes |
| **Default in Node.js** | ✅ Yes | Need `.mjs` or `"type": "module"` |

**Key Insight:**
> ES Modules are the future (standardized), but CommonJS is still dominant in Node.js ecosystem. Most modern code uses ESM.

### Q2: How does module caching work?

```javascript
// Module is cached after first require
const mod1 = require('./module');
const mod2 = require('./module');
console.log(mod1 === mod2); // true

// Cache is stored in require.cache
console.log(require.cache);

// Clear cache (for testing, not production)
delete require.cache[require.resolve('./module')];

// Get fresh instance
const mod3 = require('./module');
console.log(mod1 === mod3); // false
```

**Short Answer:**
Modules are cached after first `require()`. Subsequent calls return the cached version.

**How It Works:**
1. Module is required for the first time
2. Module code executes and exports are created
3. Module object is stored in `require.cache`
4. Future `require()` calls return cached object
5. Same instance shared across entire application

**Key Insight:**
> Module caching means modules are singletons by default - perfect for shared state like database connections or configuration.

---

### Q3: How do you handle circular dependencies?

**Short Answer:**
Avoid them when possible. If unavoidable, restructure code or extract shared logic to a separate module.

```javascript
// BAD: Circular dependency
// a.js
const b = require('./b');
module.exports = { fromA: true, b };

// b.js
const a = require('./a');
module.exports = { fromB: true, a };

// GOOD: Restructure or use dependency injection
// shared.js
module.exports = {
  sharedFunction() {}
};

// a.js
const shared = require('./shared');
module.exports = { useShared: shared.sharedFunction };

// b.js
const shared = require('./shared');
module.exports = { alsoUseShared: shared.sharedFunction };
```

**Answer:**
- Avoid circular dependencies when possible
- Restructure code to remove cycles
- Use dependency injection
- Extract shared code to separate module

### Q4: What are the benefits of ES modules over CommonJS?

**Answer:**
1. **Static analysis**: Imports/exports determined at parse time
2. **Tree shaking**: Remove unused code
3. **Better performance**: Async loading, parallel downloads
4. **Browser native**: Works in browsers without bundlers
5. **Strict mode**: Always in strict mode
6. **Better future**: Modern JavaScript standard

## Best Practices

```javascript
// 1. Use const for require
const express = require('express'); // GOOD
let express = require('express');   // BAD

// 2. Organize imports
// Core modules
const fs = require('fs');
const path = require('path');

// Third-party modules
const express = require('express');
const mongoose = require('mongoose');

// Local modules
const config = require('./config');
const utils = require('./utils');

// 3. Named exports for utilities
// utils.js
exports.formatDate = (date) => {};
exports.formatCurrency = (amount) => {};

// 4. Default export for classes
// User.js
module.exports = class User {};

// 5. Use index.js for barrel exports
// models/index.js
module.exports = {
  User: require('./User'),
  Post: require('./Post'),
  Comment: require('./Comment')
};

// Usage
const { User, Post } = require('./models');

// 6. Handle optional dependencies
let optional;
try {
  optional = require('optional-package');
} catch (err) {
  console.log('Optional package not available');
}
```

## Summary

**Core Concepts:**

1. **CommonJS:**
   - ✅ Node.js default, synchronous loading
   - ✅ `require()` / `module.exports` syntax
   - ✅ Runtime evaluation (dynamic)
   - ❌ No tree-shaking
   - ✅ Perfect for server-side Node.js

2. **ES Modules:**
   - ✅ Modern standard, asynchronous loading
   - ✅ `import` / `export` syntax
   - ✅ Parse-time evaluation (static)
   - ✅ Tree-shaking enabled
   - ✅ Browser-native support

3. **Module Caching:**
   - ✅ Modules cached after first load
   - ✅ Same instance shared across app
   - ✅ Stored in `require.cache`
   - ⚠️ Can clear for testing (rarely needed)

4. **Best Practices:**
   - ✅ Use ES Modules for new projects
   - ✅ Avoid circular dependencies
   - ✅ Use `module.exports` for single export
   - ✅ Use `exports.x` for multiple exports
   - ✅ Configure package.json properly

**Key Insights:**
> - ES Modules are the future - use them for new code
> - CommonJS still dominates Node.js ecosystem
> - Module caching creates singletons automatically
> - Tree-shaking with ESM reduces bundle size significantly

## Related Topics
- [NPM Package Development](./npm-packages.md)
- [Module Bundling](../DevOps/06-build-tools.md)
- [TypeScript Modules](../../Frontend/TypeScript/09-modules.md)

## Practice Problems

1. Create a module that exports both named and default exports
2. Build a simple plugin system using modules
3. Implement module hot reloading for development
4. Create a monorepo with shared modules
5. Build a module loader with dependency injection

## Resources
- [Node.js Modules Documentation](https://nodejs.org/api/modules.html)
- [ES Modules Documentation](https://nodejs.org/api/esm.html)
- [NPM Package Guide](https://docs.npmjs.com/packages-and-modules)
