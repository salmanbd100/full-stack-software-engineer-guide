---
title: Component Composition Patterns
part: 3
chapter: 0
slug: react-composition-patterns
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-03
tags: [react, composition, compound-components, render-props, controlled]
in_book: true
---

# Component Composition Patterns {#ch-react-composition-patterns}

> Design a component API that survives the tenth feature request without growing a tenth boolean prop.

**In this chapter:** `children` as the default · compound components · slots · render props in React 19 · controlled against uncontrolled

## 💡 The Core Idea

Every reusable component makes the same trade: how much does the caller get to decide, and how much do
you decide for them? Get it wrong in one direction and the component is rigid, so callers fork it. Get
it wrong in the other and it is a configuration format with forty props.

Composition is the way out. Instead of adding a prop for each variation, **let the caller pass the
varying part in.** The component keeps the behaviour — the state, the keyboard handling, the
accessibility — and hands back the parts that differ.

> The tell that a component needs composition is a boolean that only exists to hide markup:
> `showIcon`, `withFooter`, `isCompact`. Each one is a decision the caller wanted to make and could not.

## How It Works

### `children` is the default answer

Passing markup as `children` solves most cases, and it has a performance property people miss: the
children are created by the *parent*, so a state change inside the wrapper does not re-render them.

**A wrapper whose state cannot touch what it wraps:**

```tsx
interface CollapsibleProps {
  title: string;
  children: ReactNode;
}

function Collapsible({ title, children }: CollapsibleProps) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <section>
      <button onClick={() => setOpen((o: boolean) => !o)}>{title}</button>
      {open && children}
    </section>
  );
}
```

Toggling `open` re-renders `Collapsible`. It does not re-render `children`, because that element was
already built by whoever called it. This is the restructuring that beats reaching for `memo`.

### Compound components

When several pieces must share state but the caller controls the layout, expose a small family of
components that talk to each other through context.

```tsx
interface TabsContextValue {
  active: string;
  select: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (ctx === null) throw new Error("Tabs.* must be used inside <Tabs>");
  return ctx;
}

export function Tabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [active, setActive] = useState<string>(defaultTab);
  const value: TabsContextValue = useMemo(
    () => ({ active, select: setActive }),
    [active],
  );
  // React 19: the context itself is the provider — no `.Provider` needed.
  return <TabsContext value={value}>{children}</TabsContext>;
}

Tabs.Tab = function Tab({ id, children }: { id: string; children: ReactNode }) {
  const { active, select } = useTabs();
  return (
    <button role="tab" aria-selected={active === id} onClick={() => select(id)}>
      {children}
    </button>
  );
};

Tabs.Panel = function Panel({ id, children }: { id: string; children: ReactNode }) {
  const { active } = useTabs();
  return active === id ? <div role="tabpanel">{children}</div> : null;
};
```

The caller arranges the markup however the design needs it; `Tabs` still owns which tab is selected.
The thrown error in `useTabs` matters — it turns "used outside the provider" from a silent `null` into
a message at the point of the mistake.

### Slots — named children

`children` gives you one hole. When a component has two or three fixed regions, take them as props.

```tsx
interface PageProps {
  header: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
}

function Page({ header, sidebar, children }: PageProps) {
  return (
    <div className="page">
      <header>{header}</header>
      {sidebar !== undefined && <aside>{sidebar}</aside>}
      <main>{children}</main>
    </div>
  );
}
```

This is what Svelte calls snippets and what Vue calls named slots. In React it needs no API at all —
elements are values, so a prop can hold one.

### Render props, now that hooks exist

Hooks replaced render props for sharing *logic*. A `useHover` hook is better than a `<Hover>` component
in every way: no extra tree node, no nesting, and the types come out cleanly.

Render props survive for one job — when the component owns something the caller must **render
differently**, and the varying part depends on values only the component has.

```tsx
interface VirtualListProps<T> {
  items: readonly T[];
  rowHeight: number;
  renderRow: (item: T, index: number) => ReactNode;
}

function VirtualList<T>({ items, rowHeight, renderRow }: VirtualListProps<T>) {
  const visible: readonly T[] = useVisibleWindow(items, rowHeight);
  return <>{visible.map((item: T, i: number) => renderRow(item, i))}</>;
}
```

The component owns windowing; the caller owns the row. A hook cannot express that, because the value
being shared is markup produced from internal state.

### Controlled against uncontrolled

A component is **controlled** when the parent owns its value and hands it back as a prop, and
**uncontrolled** when the component keeps its own state and only reports changes.

| Question                              | Uncontrolled           | Controlled                        |
| ------------------------------------- | ---------------------- | --------------------------------- |
| Who holds the value                   | The component          | The parent                        |
| Parent needs to read it mid-edit      | ❌ Only on change      | ✅ Always                          |
| Parent needs to reset or preset it    | ❌ Needs a `key`       | ✅ Set the prop                    |
| Cost to the caller                    | None                   | State plus a handler, every time   |

Default to uncontrolled and offer controlled as an option. The usual shape takes `defaultValue` for the
uncontrolled case and `value` for the controlled one, deciding by whether `value` was passed.

```tsx
function useControllable<T>(value: T | undefined, defaultValue: T): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled: boolean = value !== undefined;
  return [isControlled ? (value as T) : internal, setInternal];
}
```

> ⚠️ Do not let a component switch modes at runtime. Going from `undefined` to a real `value` swaps who
> owns the state mid-life, and React warns about it. Decide once, at the first render.

## When to Use It

| Situation                                              | Pattern              |
| ------------------------------------------------------- | -------------------- |
| One region varies                                       | `children`           |
| Two or three fixed regions vary                         | Slot props           |
| Several parts share state, layout is the caller's       | Compound components  |
| Behaviour is shared, markup is not                      | A custom hook        |
| Markup varies and depends on the component's own state  | A render prop        |
| The parent must read or set the value as it changes     | Controlled           |

## Common Mistakes

**❌ A boolean per variation.** `<Card compact bordered showFooter hideAvatar />` is four decisions the
caller wanted to express as markup. **✅ Take a `footer` slot and let them pass nothing.**

**❌ Context as the first tool.** Context is for values a whole subtree needs — theme, current user,
the tabs state above. Passing one prop through two components is not prop drilling; it is a prop.
Reaching for context early makes components that cannot be rendered anywhere else.

**❌ An unmemoised context value:**

```tsx
<TabsContext value={{ active, select: setActive }}>  // New object every render
```

Every consumer re-renders on every parent render. **✅ `useMemo` on the value**, as in the `Tabs`
example — until the React Compiler is doing it for you, and even then, know why it is there.

**❌ Reaching for `forwardRef`.** In React 19 `ref` is an ordinary prop and `forwardRef` is on its way
to deprecation. Declare `ref` in the props type and pass it through.

## 🔑 Key Takeaways

- Composition trades configuration for markup: let the caller pass the varying part instead of a prop to describe it.
- `children` is the default tool, and children created by the parent do not re-render when the wrapper's state changes.
- Compound components share state through context while the caller keeps control of the layout.
- Hooks replaced render props for sharing logic; render props survive only where the markup itself depends on internal state.
- Default to uncontrolled, offer controlled, and never let a component switch between the two at runtime.

## Interview Questions

**Q: A designer asks for a fifth variant of your Card. When is another prop the wrong answer?**

When the prop exists only to switch markup on or off. Each `showX` boolean multiplies the states the
component can be in and moves a design decision away from the person making it. A slot — `header`,
`footer`, `actions` — collapses all of those variants into one API, and the next variant needs no change
at all. Keep props for behaviour and data; give markup to the caller.

**Q: Compound components or a props object — how do you choose?**

A props object is right when the shape is fixed and the caller has no layout opinion. Compound
components are right when the caller must arrange the parts, or the set of parts is open-ended, as with
tabs, menus and tables. The cost is a context and a runtime error for misuse; the benefit is that the
design team can rearrange the markup without an API change.

**Q: Are render props obsolete?**

For sharing logic, yes — a hook does the same job with no extra element, no nesting and better types.
They are still the right tool when a component owns state that the caller must render differently, such
as a virtualised list where the component decides which rows exist and the caller decides what a row
looks like. That is a value a hook cannot return, because it is markup built from internal state.

**Q: Why is an unmemoised context value a problem, and when does it stop being one?**

The provider creates a new object every render, so every consumer sees a changed value and re-renders,
even when the underlying data is identical. Memoising the value fixes it. Under the React Compiler that
memoisation is inserted for you, but the reasoning still has to be yours — the compiler cannot help with
a component it has opted out of, and reviewers still ask.

## What to Read Next

- [Chapter ?? — The React Mental Model](#ch-react-mental-model) — why `children` sidesteps a re-render
- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — composition across the boundary, where `children` becomes structural
- [Chapter ?? — React with TypeScript](#ch-react-typescript) — typing generic components and slot props
