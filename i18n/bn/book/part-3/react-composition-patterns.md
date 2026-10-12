---
sourceHash: "7ffda0f562f99ff2d8a3e19744a8aa177f34d8ee22d6176c5143b1d979fec805"
title: "Component Composition Pattern"
translatedAt: "2026-10-12T12:09:19.726Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Component Composition Pattern {#ch-react-composition-patterns}

> এমন একটি component API design করুন, যেটা দশম feature request-এর পরেও টিকে থাকে, দশম boolean prop না বাড়িয়ে।

**এই অধ্যায়ে:** default হিসেবে `children` · compound component · slot · React 19-এ render prop · controlled বনাম uncontrolled

## 💡 মূল ধারণা

প্রতিটি reusable component একই দর-কষাকষি করে। Caller কতটা ঠিক করবে, আর আপনি তার হয়ে কতটা ঠিক করে দেবেন? এক দিকে
ভুল করলে component-টি অনমনীয় হয়ে যায়, তাই caller-রা এটাকে fork করে। অন্য দিকে ভুল করলে এটা চল্লিশটা prop-ওয়ালা
একটি configuration format হয়ে দাঁড়ায়।

Composition এখান থেকে বের হওয়ার পথ। প্রতিটি variation-এর জন্য prop যোগ করবেন না। **যে অংশটা বদলায়, সেটা caller-কেই
পাঠাতে দিন।** Component behaviour নিজের কাছে রাখে: state, keyboard handling, accessibility। যে অংশগুলো আলাদা,
সেগুলো সে caller-এর হাতে ফিরিয়ে দেয়।

> একটি component-এর composition লাগবে, তার লক্ষণ হলো এমন একটি boolean, যেটা শুধু markup লুকানোর জন্যই আছে:
> `showIcon`, `withFooter`, `isCompact`। প্রতিটি এমন একটি সিদ্ধান্ত, যেটা caller নিতে চেয়েছিল কিন্তু পারেনি।

## কীভাবে কাজ করে

### `children`-ই default উত্তর

`children` হিসেবে markup পাঠালে বেশিরভাগ case-এর সমাধান হয়ে যায়। এর একটি performance-এর দিকও আছে, যেটা মানুষ
খেয়াল করে না। Children তৈরি করে *parent*, তাই wrapper-এর ভেতরে state বদলালে সেগুলো re-render হয় না।

**একটি wrapper, যার state সে যা wrap করে তা ছুঁতে পারে না:**

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

`open` toggle করলে `Collapsible` re-render হয়। `children` re-render হয় না, কারণ সেই element-টি যে call করেছে
সে আগেই বানিয়ে রেখেছে। `memo`-র দিকে হাত বাড়ানোর চেয়ে এই restructuring ভালো কাজ করে।

### Compound component

যখন কয়েকটি অংশকে state share করতে হয় কিন্তু layout caller নিয়ন্ত্রণ করে, তখন component-এর একটি ছোট পরিবার
expose করুন, যারা context-এর মাধ্যমে একে অপরের সাথে কথা বলে।

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

Design যেভাবে চায়, caller markup সেভাবে সাজায়। কোন tab selected, সেটা তবু `Tabs`-এর হাতেই থাকে। `useTabs`-এ
throw করা error-টি গুরুত্বপূর্ণ। এটা "provider-এর বাইরে ব্যবহার"-কে একটি নীরব `null` থেকে ভুলের জায়গাতেই একটি
message-এ পরিণত করে।

### Slot — নামওয়ালা children

`children` আপনাকে একটি ফাঁকা জায়গা দেয়। একটি component-এ যখন দুটো বা তিনটি নির্দিষ্ট region থাকে, সেগুলো prop
হিসেবে নিন।

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

Svelte একে বলে snippet, Vue বলে named slot। React-এ এর জন্য কোনো API-ই লাগে না। Element হলো value, তাই একটি
prop একটি element ধরে রাখতে পারে।

### Hook আসার পরে render prop

*Logic* share করার জন্য hook render prop-কে সরিয়ে দিয়েছে। একটি `useHover` hook সব দিক থেকেই একটি `<Hover>`
component-এর চেয়ে ভালো: বাড়তি কোনো tree node নেই, nesting নেই, আর type-গুলো পরিষ্কারভাবে বেরিয়ে আসে।

Render prop টিকে আছে একটি কাজের জন্য। Component এমন কিছুর মালিক, যেটা caller-কে **আলাদাভাবে render** করতে হবে,
আর যে অংশটা বদলায়, সেটা এমন value-র ওপর নির্ভর করে যা শুধু component-এর কাছেই আছে।

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

Windowing (শুধু দৃশ্যমান row-গুলো render করা) component-এর হাতে। Row caller-এর হাতে। একটি hook এটা প্রকাশ করতে
পারে না, কারণ share করা value-টি internal state থেকে তৈরি markup।

### Controlled বনাম uncontrolled

একটি component **controlled**, যখন তার value-র মালিক parent, আর সে value-টি prop হিসেবে ফিরিয়ে দেয়। Component
**uncontrolled**, যখন সে নিজের state নিজেই রাখে আর শুধু পরিবর্তনগুলো জানায়।

| প্রশ্ন                              | Uncontrolled           | Controlled                        |
| ------------------------------------- | ---------------------- | --------------------------------- |
| Value কার কাছে থাকে                   | Component          | Parent                        |
| Edit চলাকালীন parent-কে এটা পড়তে হবে      | ❌ শুধু change-এ      | ✅ সবসময়                          |
| Parent-কে এটা reset বা preset করতে হবে    | ❌ একটি `key` লাগে       | ✅ Prop set করুন                    |
| Caller-এর খরচ                    | কিছুই নয়                   | প্রতিবার state আর একটি handler   |

Default হিসেবে uncontrolled রাখুন, আর controlled একটি option হিসেবে দিন। সাধারণ রূপটি uncontrolled case-এর জন্য
`defaultValue` নেয়, আর controlled case-এর জন্য `value`। `value` পাঠানো হয়েছে কি না, সেটাই mode ঠিক করে।

```tsx
function useControllable<T>(value: T | undefined, defaultValue: T): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled: boolean = value !== undefined;
  return [isControlled ? (value as T) : internal, setInternal];
}
```

> ⚠️ একটি component-কে runtime-এ mode বদলাতে দেবেন না। `undefined` থেকে একটি আসল `value`-তে গেলে জীবনের
> মাঝপথে state-এর মালিক বদলে যায়, আর React এ নিয়ে warning দেয়। প্রথম render-এ একবারই ঠিক করুন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                              | Pattern              |
| ------------------------------------------------------- | -------------------- |
| একটি region বদলায়                                       | `children`           |
| দুটো বা তিনটি নির্দিষ্ট region বদলায়                         | Slot prop           |
| কয়েকটি অংশ state share করে, layout caller-এর       | Compound component  |
| Behaviour share হয়, markup নয়                      | একটি custom hook        |
| Markup বদলায় আর component-এর নিজের state-এর ওপর নির্ভর করে  | একটি render prop        |
| Value বদলানোর সাথে সাথে parent-কে সেটা পড়তে বা set করতে হবে     | Controlled           |

## সাধারণ ভুল

**❌ প্রতিটি variation-এর জন্য একটি boolean।** `<Card compact bordered showFooter hideAvatar />` হলো চারটি সিদ্ধান্ত,
যেগুলো caller markup হিসেবে প্রকাশ করতে চেয়েছিল। **✅ একটি `footer` slot নিন, আর তাদের কিছুই না পাঠাতে দিন।**

**❌ প্রথম tool হিসেবে context।** Context সেই value-র জন্য, যেটা পুরো একটি subtree-র দরকার, যেমন theme, বর্তমান
user, বা ওপরের tabs state। দুটো component-এর মধ্য দিয়ে একটি prop পাঠানো prop drilling নয়। সেটা একটি prop মাত্র।
শুরুতেই context ধরলে এমন component তৈরি হয়, যেগুলো অন্য কোথাও render করা যায় না।

**❌ Memoise না করা context value:**

```tsx
// A new object on every render of the provider
<TabsContext value={{ active, select: setActive }}>{children}</TabsContext>;
```

প্রতিটি parent render-এ প্রতিটি consumer re-render হয়। **✅ Value-টির ওপর `useMemo`**, যেমন `Tabs`-এর উদাহরণে।
যেখানে React Compiler চালু আছে, সেখানে এই memo সে আপনার হয়ে লিখে দেয়। যেভাবেই হোক, এটা কেন আছে তা জানুন —
[Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) দেখুন।

**❌ `forwardRef`-এর দিকে হাত বাড়ানো।** React 19-এ `ref` একটি সাধারণ prop, আর `forwardRef` deprecation-এর পথে।
Props type-এ `ref` declare করুন, আর সেটা পাস করে দিন।

## 🔑 মূল শিক্ষা

- Composition configuration-এর বদলে markup নেয়: বদলানো অংশটা বর্ণনা করতে prop না দিয়ে, caller-কে অংশটাই পাঠাতে দিন।
- `children` default tool, আর parent-এর তৈরি children wrapper-এর state বদলালে re-render হয় না।
- Compound component context-এর মাধ্যমে state share করে, আর layout-এর নিয়ন্ত্রণ caller-এর হাতে থাকে।
- Logic share করার জন্য hook render prop-কে সরিয়ে দিয়েছে। Render prop টিকে আছে শুধু সেখানে, যেখানে markup নিজেই internal state-এর ওপর নির্ভর করে।
- Default হিসেবে uncontrolled রাখুন, controlled-এর option দিন, আর কখনো একটি component-কে runtime-এ দুটোর মধ্যে বদলাতে দেবেন না।

## Interview-এর প্রশ্ন

**Q: একজন designer আপনার Card-এর পঞ্চম একটি variant চাইলেন। কখন আরেকটি prop ভুল উত্তর?**

যখন prop-টি শুধু markup চালু বা বন্ধ করার জন্যই আছে। প্রতিটি `showX` boolean component-এর সম্ভাব্য state-এর
সংখ্যা গুণ করে বাড়ায়। এটা design-এর একটি সিদ্ধান্তকে, যে সিদ্ধান্তটা নিচ্ছে তার কাছ থেকে সরিয়েও নেয়। `header`,
`footer` বা `actions`-এর মতো একটি slot ওই সব variant-কে একটি API-তে গুটিয়ে আনে। তখন পরের variant-এর জন্য কোনো
পরিবর্তনই লাগে না। Prop রাখুন behaviour আর data-র জন্য, আর markup দিন caller-কে।

**Q: Compound component নাকি একটি props object — কীভাবে বেছে নেন?**

Props object ঠিক, যখন shape নির্দিষ্ট আর layout নিয়ে caller-এর কোনো মত নেই। Compound component ঠিক, যখন caller-কে
অংশগুলো সাজাতে হয়, বা অংশের set-টি খোলা, যেমন tab, menu আর table-এ। খরচ হলো একটি context, আর ভুল ব্যবহারে একটি
runtime error। লাভ হলো, design team API পরিবর্তন ছাড়াই markup নতুন করে সাজাতে পারে।

**Q: Render prop কি অচল হয়ে গেছে?**

Logic share করার জন্য, হ্যাঁ। একটি hook একই কাজ করে বাড়তি element ছাড়া, nesting ছাড়া, আর আরও ভালো type দিয়ে।
কিন্তু এখনো এটাই সঠিক tool, যখন component এমন state-এর মালিক যেটা caller-কে আলাদাভাবে render করতে হয়। একটি
virtualised list ধরুন: কোন row-গুলো থাকবে, তা component ঠিক করে, আর একটি row দেখতে কেমন, তা caller ঠিক করে।
একটি hook সেই value return করতে পারে না, কারণ এটা internal state থেকে বানানো markup।

**Q: Memoise না করা context value কেন সমস্যা, আর কখন এটা আর সমস্যা থাকে না?**

Provider প্রতিটি render-এ একটি নতুন object তৈরি করে। তাই প্রতিটি consumer একটি বদলে যাওয়া value দেখে আর
re-render হয়, এমনকি ভেতরের data হুবহু এক হলেও। Value-টি memoise করলে এটা ঠিক হয়ে যায়। React Compiler ব্যবহার
করলে সে এই memoisation আপনার হয়ে বসিয়ে দেয়, কিন্তু যুক্তিটা তবু আপনার নিজের হতে হবে। যে component থেকে compiler
opt out করেছে, সেটায় সে সাহায্য করতে পারে না, আর reviewer-রা এখনো এটা জিজ্ঞেস করেন।

## এরপর কী পড়বেন

- [Chapter ?? — React-এর Mental Model](#ch-react-mental-model) — `children` কেন একটি re-render এড়িয়ে যায়
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — boundary পেরিয়ে composition, যেখানে `children` কাঠামোর অংশ হয়ে যায়
- [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) — generic component আর slot prop-এ type দেওয়া
