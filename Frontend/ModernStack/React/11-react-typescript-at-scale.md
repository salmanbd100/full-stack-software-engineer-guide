---
title: React and TypeScript at Scale
part: 3
chapter: 0
slug: react-typescript-at-scale
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-06
tags: [react, typescript, props, generics, context, discriminated-unions]
in_book: true
---

# React and TypeScript at Scale {#ch-react-typescript-at-scale}

> Type props, state, refs and context so that the wrong state cannot be written down, and a hundred components stay refactorable.

**In this chapter:** props as a contract · state that cannot be invalid · generic components · refs and context · typing the server boundary

## 💡 The Core Idea

A React component is a function, so typing one is typing a function: name the props, name the return.
That much is mechanical. What separates a codebase that scales from one that merely compiles is *what
you choose to model*.

The high-leverage move is to make invalid states unrepresentable. `{ loading, data, error }` as three
independent fields describes eight combinations, six of which are nonsense — loading with an error and
data, for example — and every consumer has to defend against all eight. A discriminated union describes
three, and the compiler narrows to exactly one. That single change removes more defensive branches from
a large React codebase than any other typing decision.

> ⚠️ **Moving target:** React 19 made `ref` an ordinary prop, so `forwardRef` is redundant and heading
> for deprecation. Hook typings also shift between `@types/react` majors. The durable principle is that
> props are a typed contract and hooks are generic functions; the helper names move around it.

## How It Works

### Props are a contract between two files

```tsx
interface UserCardProps {
  name: string;
  role: "admin" | "editor" | "viewer";
  avatarUrl?: string;
  onEdit: (id: number) => void;
}

function UserCard({ name, avatarUrl, onEdit }: UserCardProps) {
  return (
    <div>
      {avatarUrl !== undefined && <img src={avatarUrl} alt={name} />}
      <button onClick={() => onEdit(1)}>Edit</button>
    </div>
  );
}
```

Prefer a plain function with an explicit props interface over `React.FC`. It used to imply `children`,
it blocks generic components, and it adds nothing now that it does not.

| Need                                | Type                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| Anything renderable as a child       | `React.ReactNode`                                       |
| A render prop or a slot              | `(item: T) => React.ReactNode`                          |
| All the native attributes too        | `extends React.ButtonHTMLAttributes<HTMLButtonElement>` |
| A ref to the underlying element      | `ref?: React.Ref<HTMLButtonElement>` — a normal prop in React 19 |

**Extending native props is what makes a design-system component usable:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger";
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>; // React 19 — no forwardRef wrapper
}

function Button({ variant = "primary", loading, children, ...rest }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} disabled={loading === true || rest.disabled} {...rest}>
      {loading === true ? "Loading…" : children}
    </button>
  );
}
```

Every native attribute — `type`, `aria-label`, `onFocus` — keeps working and stays checked.

For events, reach for `React.MouseEvent<HTMLButtonElement>`, `React.ChangeEvent<HTMLInputElement>` and
`React.FormEvent<HTMLFormElement>`. Read `currentTarget`, which is typed as the element the handler is
attached to; `target` is whatever was actually clicked and is typed loosely for that reason.

### State that cannot be invalid

```tsx
// ❌ Eight combinations, six of them meaningless
interface BadState { loading: boolean; data: User | null; error: string | null }

// ✅ Three, and the compiler narrows to one
type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; message: string };
```

With the union, `state.data` does not exist until `status === "success"`, so the "render the data while
loading" bug becomes a compile error rather than a code review comment.

`useReducer` is where the same idea pays twice, because the action union is checked at every dispatch:

```tsx
type CartAction =
  | { type: "add"; item: CartItem }
  | { type: "remove"; itemId: string }
  | { type: "clear" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add":
      return { items: [...state.items, action.item], total: state.total + action.item.price };
    case "remove":
      return { ...state, items: state.items.filter((i) => i.id !== action.itemId) };
    case "clear":
      return { items: [], total: 0 };
    default: {
      const exhaustive: never = action; // a new action type breaks the build here
      return exhaustive;
    }
  }
}
```

`dispatch({ type: "add" })` without an `item` will not compile, and neither will a typo in `type`.

The two annotations worth knowing for `useState`: annotate when `null` hides the real type, and annotate
an empty array, because `useState([])` widens to `never[]` and nothing can ever be added to it.

```tsx
const [count, setCount] = useState(0);                 // inferred: number
const [user, setUser] = useState<User | null>(null);   // null alone tells the compiler nothing
const [users, setUsers] = useState<User[]>([]);        // [] alone infers never[]
const timer = useRef<ReturnType<typeof setInterval> | null>(null);
```

### Generic components

A generic component keeps the caller's exact type all the way through, which is what makes one `List`
serve every entity in the application.

```tsx
interface ListProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>;
}

// `item` is User inside both callbacks — no annotation at the call site
<List items={users} getKey={(u) => u.id} renderItem={(u) => u.name} />;
```

The same reasoning applies to custom hooks. `useFetch<User>(url)` returning
`{ data: User | null; status: RequestState["status"] }` gives the caller a typed value with no cast.
Note what it does **not** do: the type argument asserts the response shape, it does not check it.
Validate at the boundary — see [Chapter ?? — Type Guards](#ch-type-guards).

### Context without `| undefined` in every consumer

```tsx
// `undefined` as the default is deliberate: it makes "used outside the
// provider" a detectable state rather than a silently wrong default
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx; // narrowed, so consumers never see undefined
}
```

The throwing accessor hook is what removes `| undefined` from every consumer. Without it, each component
handles a case that should be impossible. In React 19 the provider is the context itself —
`<AuthContext value={auth}>`, with `.Provider` now optional.

### Typing across the server boundary

Two React 19 concepts have typing rules that only exist because of the server/client split.

**Props crossing into a Client Component must be serialisable.** TypeScript will happily accept
`onSave: () => void` on a Client Component rendered from a Server Component, and it fails at runtime.
The type system does not model the boundary, so the discipline is yours: props that cross it are data,
plus Server Functions.

**Actions have a fixed shape,** and typing the state is what makes the error path safe:

```tsx
interface FormState {
  error: string | null;
}

const [state, submitAction, isPending] = useActionState<FormState, FormData>(
  async (_prev: FormState, formData: FormData): Promise<FormState> => {
    const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: "Check the highlighted fields" };
    await updateProfile(parsed.data); // parsed.data is typed and validated
    return { error: null };
  },
  { error: null },
);
```

`FormData` values are `string | File | null`, never the shape you want. A runtime schema parse is what
turns them into a typed object — and it is the same parse that stops a hand-crafted request reaching
your database.

## When to Use It

| Scenario                                       | Reach for                                | Why                                            |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| A component wrapping a native element           | `extends …HTMLAttributes<T>`             | Every native prop stays typed and forwardable   |
| Async data with loading and error states        | A discriminated union on `status`        | The impossible combinations stop existing       |
| Several values that change together             | `useReducer` with an action union         | Invalid dispatches fail to compile              |
| One component reused across entity types        | A generic component or hook               | The caller's type survives to the callbacks     |
| Shared state read by many components            | Context plus a throwing accessor hook     | Consumers never handle the undefined case       |
| Data arriving from a network or a form          | A runtime schema, then the type            | Types erase; the boundary needs a real check    |

## Common Mistakes

**❌ `useState([])` with no type argument.** It infers `never[]`, so nothing can ever be added.

**❌ `React.FC<Props>`.** It historically added an implicit `children`, blocks generic components, and
buys nothing a plain annotated function does not.

**❌ `createContext({} as AuthContextValue)`.** The cast makes a missing provider undetectable, so the
failure surfaces as `undefined is not a function` deep inside a child. Default to `undefined` and throw
in the accessor.

**❌ Boolean flags where a union belongs:**

```tsx
// ❌ isLoading && isError && data — what does that mean?
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState<User | null>(null);
```

Every consumer now writes its own guess about which combinations are real. One union replaces all of
them.

**❌ Still writing `forwardRef` in React 19.** `ref` is a normal prop now; the wrapper adds a layer and
will be deprecated. In a codebase still on React 18, `forwardRef<HTMLInputElement, Props>` remains
correct — check the version before changing anything.

**❌ Treating a type argument as validation.** `await res.json() as User` is an assertion, not a check.
The compiler stops asking questions and the runtime finds out later, in a component that cannot explain
itself.

## 🔑 Key Takeaways

- A props interface is a contract between files; annotate it explicitly and skip `React.FC`.
- A discriminated union on `status` removes the impossible combinations that boolean flags create.
- An action union plus a `never` default turns every invalid dispatch into a compile error.
- Default a context to `undefined` and throw in the accessor hook, so consumers never handle it.
- Types erase at runtime — validate data crossing a network or form boundary with a real schema parse.

## Interview Questions

**Q: Why model async state as a union rather than `loading`, `data` and `error` fields?**

Three independent fields describe eight combinations and only three are meaningful, so every consumer
writes defensive branches for states that cannot happen — and eventually one of them gets it wrong. A
union on `status` narrows to a single variant, so `data` is only reachable once the request succeeded.
The invalid states stop being handled because they stop being expressible.

**Q: What does typing `useReducer` actions as a discriminated union buy you?**

Every dispatch is checked against the union, so a missing field or a mistyped action name fails at the
call site. Inside the reducer, switching on `type` narrows the action so only that variant's fields are
accessible, and assigning the action to `never` in the `default` branch turns a newly added action into
a build failure rather than a silent no-op.

**Q: Why default a context to `undefined` rather than casting an empty object?**

The cast makes an unprovided context indistinguishable from a provided one, so the failure surfaces as a
confusing runtime error inside a child component. `undefined` is a state the accessor hook can detect
and turn into a clear message, and the narrowing means every consumer receives a non-optional value.

**Q: Does TypeScript stop you passing a function to a Client Component from a Server Component?**

No, and that is the trap. The type system has no model of the server/client boundary, so the code
compiles and then fails at render when React tries to serialise the prop. The rule has to be held by the
author: what crosses that boundary is data, or a Server Function, and nothing else.

## What to Read Next

- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — what the boundary allows through
- [Chapter ?? — TypeScript Generics](#ch-generics) — the mechanism behind generic components and hooks
- [Chapter ?? — TypeScript Type Guards](#ch-type-guards) — validating what a typed fetch only assumes
