---
title: React with TypeScript
part: 1
chapter: 0
slug: react-typescript
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-31
tags: [frontend, typescript, react]
in_book: true
---

# React with TypeScript {#ch-react-typescript}

> Type a component, its props and its hooks so the compiler catches what a test would not.

**In this chapter:** typing components and children · event handlers · `useState` and `useReducer` · custom hooks · typed context

## 💡 The Core Idea

A React component is a function, so typing one is typing a function: name the props, name the return.
The value is not in the annotations themselves but in where they sit — a props interface is a
**contract between two files**, and a discriminated union of actions is a contract between a dispatch
and a reducer. Both catch at compile time the mistakes that otherwise need a test per case.

> ⚠️ **Moving target:** React 19 made `ref` an ordinary prop, so `forwardRef` is unnecessary and will
> be deprecated. Hook typings also shift between `@types/react` majors. The durable principle is that
> props are a typed contract and hooks are generic functions; the specific helper names move.

## How It Works

### Components and props

```tsx
interface UserCardProps {
  name: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
  onEdit: (id: number) => void;
}

function UserCard({ name, avatarUrl, onEdit }: UserCardProps): JSX.Element {
  return (
    <div>
      {avatarUrl !== undefined && <img src={avatarUrl} alt={name} />}
      <button onClick={() => onEdit(1)}>Edit</button>
    </div>
  );
}
```

Prefer a plain function with an explicit props interface over `React.FC`, which used to imply
`children` and adds nothing now that it does not.

| Need                            | Type                                                     |
| ------------------------------- | -------------------------------------------------------- |
| Anything renderable as a child   | `React.ReactNode`                                        |
| All the native attributes too    | `extends React.ButtonHTMLAttributes<HTMLButtonElement>`  |
| A ref to the underlying element  | `ref?: React.Ref<HTMLButtonElement>` — a normal prop in React 19 |

**Extending native props is the pattern that makes a design-system component usable:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger';
  loading?: boolean;
}

function Button({ variant = 'primary', loading, children, ...rest }: ButtonProps): JSX.Element {
  return (
    <button className={`btn-${variant}`} disabled={loading === true || rest.disabled} {...rest}>
      {loading === true ? 'Loading…' : children}
    </button>
  );
}
```

Every native attribute — `type`, `aria-label`, `onFocus` — keeps working and stays checked.

### Event handlers

| Event         | Type                                            |
| ------------- | ----------------------------------------------- |
| Click         | `React.MouseEvent<HTMLButtonElement>`           |
| Input change  | `React.ChangeEvent<HTMLInputElement>`           |
| Form submit   | `React.FormEvent<HTMLFormElement>`              |

`currentTarget` is the element the handler is attached to and is correctly typed. `target` is whatever
was actually clicked, so it is typed loosely — reach for `currentTarget` unless you genuinely mean
event delegation.

### Hooks

```tsx
const [count, setCount] = useState(0); // ✅ inferred: number
const [user, setUser] = useState<User | null>(null); // ✅ annotate when null hides the type
const [users, setUsers] = useState<User[]>([]); // ✅ [] infers never[] otherwise
const timer = useRef<ReturnType<typeof setInterval> | null>(null); // mutable ref
```

`useState([])` inferring `never[]` is the single most common annotation gap: the empty array reveals no
element type, so the first `setUsers([user])` fails.

**`useReducer` is where types earn the most, because the action union is checked at every dispatch:**

```tsx
type CartAction =
  | { type: 'add'; item: CartItem }
  | { type: 'remove'; itemId: string }
  | { type: 'clear' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add':
      return { items: [...state.items, action.item], total: state.total + action.item.price };
    case 'remove':
      return { ...state, items: state.items.filter((i) => i.id !== action.itemId) };
    case 'clear':
      return { items: [], total: 0 };
    default: {
      const exhaustive: never = action; // a new action type breaks the build here
      return exhaustive;
    }
  }
}
```

`dispatch({ type: 'add' })` without an `item` will not compile, and neither will a typo in `type`.

### Custom hooks

A generic hook keeps the caller's type all the way through: `useFetch<T>(url)` returning
`{ data: T | null; loading: boolean; error: string | null }` gives `data: User | null` at the call site
with no cast. Note what `useFetch<User>` does **not** do — it asserts the response shape rather than
checking it. Validate at the boundary; see [Chapter ?? — Type Guards](#ch-type-guards).

### Typed context

```tsx
// `undefined` as the default is deliberate — it makes "used outside the
// provider" a detectable state rather than a silently wrong default
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx; // narrowed, so consumers never see undefined
}
```

The throwing hook is what removes `| undefined` from every consumer. Without it, each component
handles a case that should be impossible.

## When to Use It

| Scenario                                     | Reach for                                | Why                                              |
| -------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| A component wrapping a native element         | `extends …HTMLAttributes<T>`             | Keeps every native prop typed and forwardable    |
| Several state values that change together      | `useReducer` with an action union        | Invalid dispatches fail to compile               |
| A hook reused across entity types              | A generic hook                            | The caller's type survives                       |
| Shared state read by many components           | Context with a throwing accessor hook     | Consumers never handle the undefined case        |
| A list component reused for any item type      | `function List<T>(props: ListProps<T>)`   | `renderItem` and `keyExtractor` infer from `items` |

## Common Mistakes

**❌ `useState([])` with no type argument.** It infers `never[]`, so nothing can ever be added.

**❌ `React.FC<Props>`.** It historically added an implicit `children`, blocks generic components, and
buys nothing a plain annotated function does not.

**❌ `createContext({} as AuthContextValue)`.** The cast makes a missing provider undetectable, so the
failure becomes `undefined is not a function` deep in a child. Default to `undefined` and throw in the
accessor.

**❌ Still writing `forwardRef` in React 19.** `ref` is a normal prop now; the wrapper adds a layer and
will be deprecated. In a codebase still on React 18, `forwardRef<HTMLInputElement, Props>` remains
correct — check the version before changing it.

## 🔑 Key Takeaways

- A props interface is a contract between files; annotate it explicitly and skip `React.FC`.
- `useState<T[]>([])` needs the type argument — an empty array infers `never[]`.
- An action union plus a `never` default makes every invalid dispatch a compile error.
- Default a context to `undefined` and throw in the accessor hook, so consumers never handle it.
- In React 19 `ref` is an ordinary prop; `forwardRef` is legacy.

## Interview Questions

**Q: Why does `useState([])` cause an error on the first update?**

The empty array gives the compiler nothing to infer an element type from, so it widens to `never[]`.
Pushing any value then fails, because nothing is assignable to `never`. Supply the type argument:
`useState<User[]>([])`.

**Q: What does typing `useReducer` actions as a discriminated union buy you?**

The compiler checks every dispatch against the union, so a missing field or a mistyped action name
fails at the call site. Inside the reducer, switching on `type` narrows the action so only that
variant's fields are accessible, and a `never` assignment in `default` turns a newly added action into
a build failure rather than a silent no-op.

**Q: Why default a context to `undefined` rather than an empty object cast?**

Because the cast makes an unprovided context indistinguishable from a provided one, so the failure
surfaces as a confusing runtime error inside a child. `undefined` is a state the accessor hook can
detect and turn into a clear message, and the narrowing means every consumer gets a non-optional value.

## What to Read Next

- [Chapter ?? — Generics](#ch-generics) — the mechanism behind generic hooks and components
- [Chapter ?? — Type Guards](#ch-type-guards) — validating what a typed fetch only assumes
- [Chapter ?? — Interfaces and Type Aliases](#ch-interfaces-types) — designing the props and state shapes
