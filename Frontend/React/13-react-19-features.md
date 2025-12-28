# React 19 New Features

React 19 introduces groundbreaking features that simplify development, improve performance, and enhance the developer experience. This guide covers all major features introduced in React 19.

## 📚 Major New Features

### 1. React Compiler (Automatic Optimization)

**React Compiler** is React 19's game-changing feature - an automatic optimization compiler that eliminates the need for manual memoization with useMemo, useCallback, and memo(). The compiler analyzes your code at build time, identifying which parts can be safely memoized and automatically applying optimizations. This represents a fundamental shift in React development: you write clean, straightforward code without performance concerns, and the compiler ensures it runs efficiently. No more deciding which components to memoize or debugging stale closures - the compiler handles optimization automatically while preserving React's declarative programming model and making applications performant by default.

**Before React 19 (Manual Memoization):**
```jsx
import { useMemo, useCallback } from 'react';

function TodoList({ todos, tab }) {
  // Manual memoization required
  const visibleTodos = useMemo(() => {
    return todos.filter(todo => todo.status === tab);
  }, [todos, tab]);

  const handleClick = useCallback((id) => {
    // Handler logic
  }, []);

  return (
    <ul>
      {visibleTodos.map(todo => (
        <li key={todo.id} onClick={() => handleClick(todo.id)}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**React 19 (Automatic Optimization):**
```jsx
// No useMemo or useCallback needed!
function TodoList({ todos, tab }) {
  // Compiler automatically optimizes this
  const visibleTodos = todos.filter(todo => todo.status === tab);

  const handleClick = (id) => {
    // Handler logic
  };

  return (
    <ul>
      {visibleTodos.map(todo => (
        <li key={todo.id} onClick={() => handleClick(todo.id)}>
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

**Key Benefits:**
- ✅ No need for `useMemo`, `useCallback`, or `memo`
- ✅ Compiler automatically detects and optimizes re-renders
- ✅ Cleaner, more readable code
- ✅ Better performance by default

---

### 2. Actions and useActionState Hook

**Actions and useActionState** revolutionize form handling by providing built-in async state management, eliminating the boilerplate of manually tracking loading/error states. Actions are async functions that can be passed directly to form actions or called programmatically. useActionState wraps these actions, automatically managing pending state and handling state transitions. This pattern integrates seamlessly with Server Actions in React Server Components, enabling form submissions that work even before JavaScript loads. The automatic pending state management and error handling reduce common bugs and make form interactions feel instant with optimistic updates, while the progressive enhancement ensures basic functionality without JavaScript.

**HTML Structure:**
```jsx
import { useActionState } from 'react';

function CommentForm({ postId }) {
  async function submitComment(prevState, formData) {
    const comment = formData.get('comment');

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) throw new Error('Failed to post comment');

      return { success: true, message: 'Comment posted!' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  const [state, action, isPending] = useActionState(submitComment, {
    success: null,
    message: '',
  });

  return (
    <form action={action}>
      <textarea
        name="comment"
        placeholder="Write a comment..."
        disabled={isPending}
      />

      <button type="submit" disabled={isPending}>
        {isPending ? 'Posting...' : 'Post Comment'}
      </button>

      {state.message && (
        <p style={{ color: state.success ? 'green' : 'red' }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

**Key Features:**
- `useActionState` returns: `[state, action, isPending]`
- Automatic pending state management
- Built-in error handling
- Works with Server Actions

---

### 3. useOptimistic Hook

**useOptimistic** enables optimistic UI updates - immediately updating the UI to reflect expected results while the actual operation completes in the background. This creates an instant, responsive feel even for operations requiring server communication. The hook automatically handles rollback if the operation fails, returning the UI to its previous state. This pattern is crucial for modern applications where users expect immediate feedback - clicking "like" should instantly update the UI, not wait for the server. useOptimistic makes implementing this pattern trivial, handling the complex state synchronization that was previously error-prone and required careful manual coordination between local and server state.

```jsx
import { useOptimistic, useActionState } from 'react';

function TodoList({ todos }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, newTodo]
  );

  async function createTodo(formData) {
    const title = formData.get('title');

    // Optimistically add todo to UI
    const tempTodo = {
      id: Date.now(),
      title,
      completed: false
    };
    addOptimisticTodo(tempTodo);

    // Send to server
    const response = await fetch('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      // Automatically rolls back on error
      throw new Error('Failed to create todo');
    }

    return await response.json();
  }

  const [state, action, isPending] = useActionState(createTodo, null);

  return (
    <>
      <form action={action}>
        <input
          type="text"
          name="title"
          placeholder="New todo..."
          disabled={isPending}
        />
        <button type="submit" disabled={isPending}>
          Add Todo
        </button>
      </form>

      <ul>
        {optimisticTodos.map(todo => (
          <li
            key={todo.id}
            style={{
              opacity: todo.id === Date.now() ? 0.5 : 1
            }}
          >
            {todo.title}
          </li>
        ))}
      </ul>
    </>
  );
}
```

**Key Benefits:**
- Instant UI feedback
- Automatic rollback on errors
- Better user experience
- No complex state management needed

---

### 4. use() Hook - Async Data Loading

The `use()` hook can unwrap Promises and Context, making async operations simpler.

**Reading Promises:**
```jsx
import { use, Suspense } from 'react';

// This can be a promise from any source
const userPromise = fetch('/api/user').then(res => res.json());

function UserProfile() {
  // use() unwraps the promise
  const user = use(userPromise);

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserProfile />
    </Suspense>
  );
}
```

**Reading Context (Alternative to useContext):**
```jsx
import { createContext, use } from 'react';

const ThemeContext = createContext('light');

function ThemedButton() {
  // Can be used conditionally!
  const shouldUseTheme = true;

  if (shouldUseTheme) {
    const theme = use(ThemeContext);
    return <button className={theme}>Themed Button</button>;
  }

  return <button>Regular Button</button>;
}
```

**Key Differences from useContext:**
- ✅ Can be used conditionally (inside if statements)
- ✅ Can be used in loops
- ✅ More flexible than hooks rules
- ✅ Works with Promises

---

### 5. Document Metadata (Built-in)

No more external libraries for managing `<title>`, `<meta>`, and `<link>` tags!

```jsx
function BlogPost({ post }) {
  return (
    <>
      {/* These automatically hoist to <head> */}
      <title>{post.title} | My Blog</title>
      <meta name="description" content={post.excerpt} />
      <meta property="og:title" content={post.title} />
      <meta property="og:image" content={post.coverImage} />
      <link rel="canonical" href={`https://myblog.com/posts/${post.slug}`} />

      {/* Regular component content */}
      <article>
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </>
  );
}
```

**Async Scripts and Stylesheets:**
```jsx
function ProductPage({ productId }) {
  return (
    <>
      <title>Product Details</title>

      {/* Async script loading */}
      <script async src="https://analytics.example.com/script.js" />

      {/* Stylesheet with precedence */}
      <link
        rel="stylesheet"
        href="/styles/product.css"
        precedence="high"
      />

      <div className="product">
        {/* Product content */}
      </div>
    </>
  );
}
```

**Key Benefits:**
- No need for React Helmet or Next.js Head
- Automatic deduplication
- Proper ordering with `precedence` attribute
- SSR-friendly

---

### 6. Ref as Props (Simplified)

No more `forwardRef`! Refs can now be passed as regular props.

**Before React 19:**
```jsx
import { forwardRef } from 'react';

const Input = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});

// Usage
function Form() {
  const inputRef = useRef(null);

  return <Input ref={inputRef} />;
}
```

**React 19 (Simplified):**
```jsx
// Just use ref as a prop!
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// Usage - exactly the same
function Form() {
  const inputRef = useRef(null);

  return <Input ref={inputRef} />;
}
```

**Cleanup Function in Refs:**
```jsx
function VideoPlayer({ src }) {
  return (
    <video
      src={src}
      ref={(node) => {
        if (node) {
          node.play();

          // Return cleanup function
          return () => {
            node.pause();
          };
        }
      }}
    />
  );
}
```

---

### 7. useFormStatus Hook

Access parent form's submission state from any child component.

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? (
        <>
          <span className="spinner" />
          Submitting...
        </>
      ) : (
        'Submit'
      )}
    </button>
  );
}

function SearchForm() {
  async function search(formData) {
    const query = formData.get('query');
    const results = await fetch(`/api/search?q=${query}`);
    return results.json();
  }

  return (
    <form action={search}>
      <input type="text" name="query" placeholder="Search..." />

      {/* SubmitButton automatically knows form's pending state */}
      <SubmitButton />
    </form>
  );
}
```

---

### 8. Context Provider Shorthand

Simpler syntax for Context Providers.

**Before React 19:**
```jsx
const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Page />
    </ThemeContext.Provider>
  );
}
```

**React 19:**
```jsx
const ThemeContext = createContext('light');

function App() {
  // Context can be used directly as a provider!
  return (
    <ThemeContext value="dark">
      <Page />
    </ThemeContext>
  );
}
```

---

### 9. Improved Error Reporting

Better error messages with component stacks and hydration errors.

```jsx
// React 19 provides detailed error information
function BuggyComponent({ user }) {
  // If user is null, you get a detailed error with:
  // - Exact line number
  // - Component stack trace
  // - Suggestions for fixing
  return <div>{user.name}</div>;
}

// Hydration mismatch errors now show:
// - What was expected vs. what was rendered
// - Where the mismatch occurred
// - Suggestions to fix the issue
```

---

## 💡 Real-World Examples

### Example 1: Shopping Cart with Optimistic Updates

```jsx
import { useOptimistic, useActionState } from 'react';

function ShoppingCart({ items }) {
  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (state, { action, item }) => {
      if (action === 'add') {
        return [...state, item];
      }
      if (action === 'remove') {
        return state.filter(i => i.id !== item.id);
      }
      return state;
    }
  );

  async function addToCart(formData) {
    const productId = formData.get('productId');
    const product = { id: productId, name: formData.get('name'), price: formData.get('price') };

    // Optimistically add to cart
    updateOptimistic({ action: 'add', item: product });

    // Send to server
    const response = await fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify(product),
    });

    if (!response.ok) throw new Error('Failed to add item');
    return await response.json();
  }

  const [state, action, isPending] = useActionState(addToCart, null);

  return (
    <div className="cart">
      <h2>Shopping Cart ({optimisticItems.length})</h2>

      <ul>
        {optimisticItems.map(item => (
          <li key={item.id}>
            {item.name} - ${item.price}
          </li>
        ))}
      </ul>

      {state?.error && <p className="error">{state.error}</p>}
    </div>
  );
}
```

---

### Example 2: Blog Post with SEO Metadata

```jsx
import { use, Suspense } from 'react';

function BlogPost({ postPromise }) {
  const post = use(postPromise);

  return (
    <>
      {/* SEO metadata - automatically goes to <head> */}
      <title>{post.title} | My Blog</title>
      <meta name="description" content={post.excerpt} />
      <meta name="author" content={post.author.name} />

      {/* Open Graph tags */}
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.excerpt} />
      <meta property="og:image" content={post.coverImage} />
      <meta property="og:type" content="article" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={post.title} />
      <meta name="twitter:description" content={post.excerpt} />
      <meta name="twitter:image" content={post.coverImage} />

      {/* Canonical URL */}
      <link rel="canonical" href={`https://myblog.com/posts/${post.slug}`} />

      {/* Structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          author: { "@type": "Person", name: post.author.name },
          datePublished: post.publishedAt,
        })}
      </script>

      {/* Article content */}
      <article>
        <header>
          <h1>{post.title}</h1>
          <p className="meta">
            By {post.author.name} on {new Date(post.publishedAt).toLocaleDateString()}
          </p>
        </header>

        <img src={post.coverImage} alt={post.title} />

        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </>
  );
}

function BlogPostPage({ postId }) {
  const postPromise = fetch(`/api/posts/${postId}`).then(res => res.json());

  return (
    <Suspense fallback={<div>Loading post...</div>}>
      <BlogPost postPromise={postPromise} />
    </Suspense>
  );
}
```

---

### Example 3: Form with Actions and Status

```jsx
import { useActionState, useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={pending ? 'loading' : ''}
    >
      {pending ? (
        <>
          <span className="spinner" />
          Creating account...
        </>
      ) : (
        'Sign Up'
      )}
    </button>
  );
}

function SignupForm() {
  async function signup(prevState, formData) {
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');

    // Validation
    if (!email || !password || !name) {
      return {
        error: 'All fields are required',
        success: false,
      };
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          error: error.message || 'Signup failed',
          success: false,
        };
      }

      return {
        success: true,
        message: 'Account created successfully!',
      };
    } catch (error) {
      return {
        error: 'Network error. Please try again.',
        success: false,
      };
    }
  }

  const [state, action] = useActionState(signup, {
    error: null,
    success: false,
  });

  return (
    <form action={action} className="signup-form">
      <h2>Create Account</h2>

      {state.error && (
        <div className="error-message">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="success-message">
          {state.message}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="name">Full Name</label>
        <input
          type="text"
          id="name"
          name="name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          required
        />
      </div>

      <SubmitButton />
    </form>
  );
}
```

---

## 🎯 Common Interview Questions

### Q1: What is the React Compiler and how does it work?

**Answer:**
The React Compiler automatically optimizes your components by:
- Detecting which values change and which don't
- Automatically memoizing expensive computations
- Preventing unnecessary re-renders
- Eliminating the need for manual `useMemo`, `useCallback`, and `memo`

**Benefits:**
- Cleaner code (no manual memoization)
- Better performance by default
- Fewer bugs from incorrect dependencies

---

### Q2: When should you use useOptimistic?

**Answer:**
Use `useOptimistic` when:
- Creating/updating/deleting items (todos, comments, likes)
- User actions should feel instant
- You want to show immediate feedback before server confirmation
- You can easily rollback if the action fails

**Example:** Like button, add to cart, post comment

---

### Q3: What's the difference between use() and useContext?

**Answer:**

| Feature | useContext | use() |
|---------|-----------|-------|
| Conditional usage | ❌ No | ✅ Yes |
| Inside loops | ❌ No | ✅ Yes |
| Works with Promises | ❌ No | ✅ Yes |
| Follows hooks rules | ✅ Yes | ✅ Partially |

---

### Q4: How do Actions differ from regular event handlers?

**Answer:**

**Actions:**
- Async by default
- Built-in pending states
- Automatic error handling
- Work with forms natively
- Server Actions support

**Event Handlers:**
- Manual async handling
- Manual loading states
- Manual error handling
- Requires `preventDefault()`

---

## 🚨 Breaking Changes & Migration

### 1. React 19 requires modern JavaScript

```jsx
// React 19 requires these features:
// - Promise.all
// - Symbol
// - Object.assign
// Target: ES2015+ browsers
```

### 2. Automatic batching everywhere

```jsx
// In React 18, only events were batched
// In React 19, ALL updates are batched (including setTimeout, promises)

setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // Both updates batched into single re-render
}, 1000);
```

### 3. Cleanup functions in refs

```jsx
// React 19 calls cleanup when component unmounts
<div ref={(node) => {
  if (node) {
    return () => {
      // Cleanup logic
    };
  }
}} />
```

---

## 🎓 Best Practices

### 1. Let the Compiler Do the Work
```jsx
// ❌ Don't manually optimize
const memoized = useMemo(() => expensiveCalc(data), [data]);

// ✅ Let compiler optimize automatically
const result = expensiveCalc(data);
```

### 2. Use Actions for Server Operations
```jsx
// ✅ Good - Built-in pending state
async function createTodo(formData) {
  const response = await fetch('/api/todos', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

const [state, action, isPending] = useActionState(createTodo, null);
```

### 3. Leverage use() for Async Data
```jsx
// ✅ Simple and clean
function UserProfile() {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}
```

### 4. Use Built-in Metadata
```jsx
// ✅ No external libraries needed
<>
  <title>My Page</title>
  <meta name="description" content="..." />
</>
```

---

## 🔗 Related Topics

- [Hooks Basics](./03-hooks-basics.md)
- [Advanced Hooks](./04-advanced-hooks.md)
- [Performance Optimization](./12-performance-optimization.md)
- [State Management](./11-state-management.md)

---

## 📚 External Resources

- [React 19 Official Release Notes](https://react.dev/blog/2024/04/25/react-19)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Actions and Form Actions](https://react.dev/reference/react-dom/components/form)
- [use() Hook Documentation](https://react.dev/reference/react/use)

---

[← Back to React](./README.md) | [Next: Performance Optimization →](./12-performance-optimization.md)
