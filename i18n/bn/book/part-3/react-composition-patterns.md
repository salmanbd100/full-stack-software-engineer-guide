---
sourceHash: "7ffda0f562f99ff2d8a3e19744a8aa177f34d8ee22d6176c5143b1d979fec805"
title: "Component Composition Pattern"
translatedAt: "2026-10-17T01:10:39.514Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Component Composition Pattern {#ch-react-composition-patterns}

> এমন component API design করুন, যা দশম feature request-এর পরেও টিকে থাকে, দশম boolean prop না গজিয়েই।

**এই অধ্যায়ে:** default হিসেবে `children` · compound component · slot · React 19-এ render prop · controlled বনাম uncontrolled

## 💡 মূল ধারণা

প্রতিটি reusable component একই আপস করে। Caller কতটুকু ঠিক করবেন, আর আপনি তাঁর হয়ে কতটুকু ঠিক করে দেবেন? এক দিকে ভুল করলে component
অনমনীয় হয়ে যায়, আর caller-রা তার fork বানান। অন্য দিকে ভুল করলে সেটা চল্লিশটি prop-এর একটি configuration format হয়ে দাঁড়ায়।

বেরোনোর পথ composition। প্রতিটি রকমফেরের জন্য একটি করে prop যোগ করবেন না। **যে অংশটা বদলায়, সেটা caller-কেই পাঠাতে দিন।**
Component নিজের কাছে রাখে আচরণ: state, keyboard সামলানো, accessibility। আর যে অংশগুলো আলাদা, সেগুলো ফিরিয়ে দেয়।

> Component-এর composition লাগবে, তার লক্ষণ হলো এমন boolean, যা আছে শুধু markup লুকানোর জন্য: `showIcon`, `withFooter`, `isCompact`।
> প্রতিটিই এমন একটি সিদ্ধান্ত, যা caller নিতে চেয়েছিলেন কিন্তু পারেননি।

## কীভাবে কাজ করে

### `children`-ই default উত্তর

Markup-কে `children` হিসেবে পাঠালে বেশিরভাগ ক্ষেত্রই মিটে যায়। এর performance-এর একটি গুণও আছে, যা মানুষ খেয়াল করে না। Children বানায়
*parent*, তাই wrapper-এর ভেতরের state বদলালে সেগুলো re-render হয় না।

**এমন wrapper, যার state তার মোড়ানো জিনিসে হাত দিতে পারে না:**

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

`open` toggle করলে `Collapsible` re-render হয়। কিন্তু `children` re-render হয় না, কারণ সেই element যিনি call করেছেন তিনিই আগে বানিয়ে
রেখেছেন। `memo`-র দিকে হাত বাড়ানোর চেয়ে এই কাঠামো বদলটাই বেশি কাজের।

### Compound component

যখন কয়েকটি অংশকে state ভাগ করে নিতে হয়, কিন্তু layout নিয়ন্ত্রণ করেন caller, তখন ছোট একটি component-পরিবার দিন, যারা context দিয়ে নিজেদের
মধ্যে কথা বলে।

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

Design যেমন চায়, caller markup সেভাবে সাজান। তবু কোন tab বাছাই করা, তার মালিক `Tabs`-ই থাকে। `useTabs`-এর throw করা error-টা জরুরি।
"Provider-এর বাইরে ব্যবহার" হলে চুপচাপ একটি `null` না পেয়ে ঠিক ভুলের জায়গাতেই একটি message পাওয়া যায়।

### Slot — নাম দেওয়া children

`children` দেয় একটিমাত্র ফাঁকা জায়গা। Component-এর দুই-তিনটি নির্দিষ্ট অংশ থাকলে সেগুলো prop হিসেবে নিন।

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

Svelte একে বলে snippet, Vue বলে named slot। React-এ এর জন্য কোনো API-ই লাগে না। Element নিজেই value, তাই একটি prop একটি element ধরে
রাখতে পারে।

### Hook আসার পরে render prop

*Logic* ভাগ করার কাজে hook render prop-এর জায়গা নিয়েছে। `<Hover>` component-এর চেয়ে একটি `useHover` hook সব দিক থেকে ভালো: tree-তে
বাড়তি কোনো node নেই, nesting নেই, আর type-ও পরিষ্কার আসে।

Render prop টিকে আছে একটি কাজের জন্য। Component এমন কিছুর মালিক, যা caller-কে **ভিন্নভাবে render** করতে হয়, আর বদলানো অংশটা এমন value-র
ওপর নির্ভর করে যা শুধু component-এর কাছেই আছে।

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

Windowing-এর মালিক component (শুধু দৃশ্যমান row-গুলো render করা)। Row-এর মালিক caller। Hook দিয়ে এটা প্রকাশ করা যায় না, কারণ ভাগ করা
value-টা ভেতরের state থেকে বানানো markup।

### Controlled বনাম uncontrolled

Component **controlled**, যখন তার value-র মালিক parent আর সেটা prop হিসেবে ফিরিয়ে দেয়। **Uncontrolled**, যখন component নিজের state রাখে
আর শুধু বদলের খবর দেয়।

| প্রশ্ন | Uncontrolled | Controlled |
| ----- | ----------- | ---------- |
| Value কার কাছে থাকে | Component-এর | Parent-এর |
| Edit চলার মাঝখানে parent-এর পড়া দরকার | ❌ শুধু বদলের সময় | ✅ সবসময় |
| Parent-এর reset বা আগে থেকে বসানো দরকার | ❌ `key` লাগে | ✅ Prop বসিয়ে দিন |
| Caller-এর খরচ | কিছুই না | প্রতিবার state আর একটি handler |

Default রাখুন uncontrolled, আর controlled দিন বিকল্প হিসেবে। প্রচলিত চেহারায় uncontrolled ক্ষেত্রের জন্য নেওয়া হয় `defaultValue`, আর controlled-এর
জন্য `value`। `value` পাঠানো হয়েছে কি না, তা দিয়েই mode ঠিক হয়।

```tsx
function useControllable<T>(value: T | undefined, defaultValue: T): [T, (next: T) => void] {
  const [internal, setInternal] = useState<T>(defaultValue);
  const isControlled: boolean = value !== undefined;
  return [isControlled ? (value as T) : internal, setInternal];
}
```

> ⚠️ Runtime-এ component-কে mode বদলাতে দেবেন না। `undefined` থেকে সত্যিকারের একটি `value`-এ গেলে জীবনের মাঝপথে state-এর মালিক বদলে যায়,
> আর React এ নিয়ে warning দেয়। একবারই ঠিক করুন, প্রথম render-এ।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Pattern |
| --------- | ------- |
| একটি অংশ বদলায় | `children` |
| দুই-তিনটি নির্দিষ্ট অংশ বদলায় | Slot prop |
| কয়েকটি অংশ state ভাগ করে, layout caller-এর | Compound component |
| আচরণ ভাগ হয়, markup নয় | একটি custom hook |
| Markup বদলায়, আর সেটা component-এর নিজের state-এর ওপর নির্ভর করে | একটি render prop |
| Value বদলানোর সময়েই parent-কে পড়তে বা বসাতে হয় | Controlled |

## সাধারণ ভুল

**❌ প্রতিটি রকমফেরের জন্য একটি boolean।** `<Card compact bordered showFooter hideAvatar />` হলো চারটি সিদ্ধান্ত, যা caller markup হিসেবে
বলতে চেয়েছিলেন। **✅ একটি `footer` slot নিন, আর তাঁদের কিছু না পাঠানোর সুযোগ দিন।**

**❌ প্রথম tool হিসেবে context।** Context সেসব value-র জন্য, যা পুরো একটি subtree-র লাগে, যেমন theme, বর্তমান user, বা ওপরের tabs state।
দুটি component-এর ভেতর দিয়ে একটি prop পাঠানো prop drilling নয়। সেটা স্রেফ একটি prop। আগেভাগে context-এর দিকে হাত বাড়ালে এমন component তৈরি
হয়, যা অন্য কোথাও render করা যায় না।

**❌ Memoise না করা context value:**

```tsx
// A new object on every render of the provider
<TabsContext value={{ active, select: setActive }}>{children}</TabsContext>;
```

Parent-এর প্রতিটি render-এ প্রতিটি consumer re-render হয়। **✅ Value-তে `useMemo`**, যেমন `Tabs`-এর উদাহরণে। React Compiler চালু থাকলে
এই memo compiler নিজেই লিখে দেয়। দুই ক্ষেত্রেই জানুন এটা কেন আছে — দেখুন
[Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)।

**❌ `forwardRef`-এর দিকে হাত বাড়ানো।** React 19-এ `ref` একটি সাধারণ prop, আর `forwardRef` deprecation-এর পথে। Props-এর type-এ `ref`
ঘোষণা করুন, আর সেটা পাঠিয়ে দিন।

## 🔑 মূল শিক্ষা

- Composition configuration-এর বদলে markup নেয়: বদলানো অংশটা বর্ণনা করতে prop না দিয়ে caller-কে সেটাই পাঠাতে দিন।
- `children` হলো default tool, আর parent-এর বানানো children wrapper-এর state বদলালে re-render হয় না।
- Compound component context দিয়ে state ভাগ করে, আর layout-এর নিয়ন্ত্রণ caller-এর হাতে থাকে।
- Logic ভাগ করার কাজে hook render prop-এর জায়গা নিয়েছে; render prop টিকে আছে শুধু সেখানে, যেখানে markup নিজেই ভেতরের state-এর ওপর নির্ভর করে।
- Default uncontrolled রাখুন, controlled-এর সুযোগ দিন, আর runtime-এ component-কে কখনো দুটির মধ্যে বদলাতে দেবেন না।

## Interview-এর প্রশ্ন

**Q: একজন designer আপনার Card-এর পঞ্চম variant চাইলেন। কখন আরেকটি prop ভুল উত্তর?**

যখন prop-টা আছে শুধু markup চালু বা বন্ধ করতে। প্রতিটি `showX` boolean component-এর সম্ভাব্য অবস্থার সংখ্যা গুণ করে বাড়ায়। আবার design-এর
সিদ্ধান্তও যিনি নিচ্ছেন তাঁর কাছ থেকে সরিয়ে আনে। `header`, `footer` বা `actions`-এর মতো একটি slot এই সব variant একটি API-তে গুটিয়ে আনে।
তখন পরের variant-এর জন্য কিছুই বদলাতে হয় না। Props রাখুন আচরণ আর data-র জন্য, markup দিন caller-এর হাতে।

**Q: Compound component, নাকি একটি props object — কীভাবে বাছবেন?**

Props object ঠিক, যখন চেহারা নির্দিষ্ট আর layout নিয়ে caller-এর কোনো মত নেই। Compound component ঠিক, যখন অংশগুলো caller-কে সাজাতে হয়, বা
অংশের সংখ্যা খোলা, যেমন tabs, menu আর table। খরচ একটি context, আর ভুল ব্যবহারে একটি runtime error। লাভ হলো, design team API না বদলেই markup
নতুন করে সাজাতে পারে।

**Q: Render prop কি সেকেলে হয়ে গেছে?**

Logic ভাগ করার জন্য, হ্যাঁ। Hook একই কাজ করে কোনো বাড়তি element ছাড়া, nesting ছাড়া, আর আরও ভালো type দিয়ে। কিন্তু যখন component এমন state-এর
মালিক, যা caller-কে ভিন্নভাবে render করতে হয়, তখনো এটাই ঠিক tool। Virtualised list-এর কথা ধরুন: কোন row থাকবে তা ঠিক করে component, আর একটি
row দেখতে কেমন তা ঠিক করেন caller। Hook সেই value return করতে পারে না, কারণ সেটা ভেতরের state থেকে বানানো markup।

**Q: Memoise না করা context value সমস্যা কেন, আর কখন আর সমস্যা থাকে না?**

Provider প্রতিটি render-এ নতুন একটি object বানায়। ফলে প্রতিটি consumer value বদলেছে দেখে re-render হয়, নিচের data হুবহু এক হলেও। Value
memoise করলে এটা মিটে যায়। React Compiler ব্যবহার করলে compiler নিজেই সেই memoisation বসিয়ে দেয়, কিন্তু যুক্তিটা তবু আপনার জানা থাকতে হবে।
যে component compiler-এর আওতা থেকে বাদ পড়েছে, সেখানে compiler কিছু করতে পারে না, আর reviewer-রা এখনো জিজ্ঞেস করেন।

## এরপর কী পড়বেন

- [Chapter ?? — React-এর Mental Model](#ch-react-mental-model) — `children` কেন একটি re-render এড়িয়ে যায়
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — boundary পেরিয়ে composition, যেখানে `children` কাঠামোর অংশ হয়ে যায়
- [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) — generic component আর slot prop-এর type দেওয়া
