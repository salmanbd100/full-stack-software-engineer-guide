---
sourceHash: "a0d8fd75f30de1606404f9af074eb546c2124ec63db5dc9d6d8d533638fed71d"
title: "Performance, Transition ও Compiler"
translatedAt: "2026-10-12T12:10:16.840Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Performance, Transition ও Compiler {#ch-react-performance-and-the-compiler}

> একটি ধীর React screen-এর কারণ খুঁজে বের করুন, তারপর সঠিক lever টানুন: কম কাজ করুন, অথবা যে কাজ এড়ানো যায় না তার schedule ঠিক করুন।

**এই অধ্যায়ে:** একটি re-render-এর খরচ · compiler আর সে কী memoise করে · transition আর deferred value · যা কোনো lever-ই ঠিক করে না · আগে profiling

## 💡 মূল ধারণা

"React ধীর" কখনো একটি সমস্যা নয়। দুটি কারণ React-এর বাইরে থাকে: অতিরিক্ত JavaScript আসা, আর এমন request যেগুলো
একে অপরের জন্য অপেক্ষা করে। React-এর ভেতরে আপনার হাতে দুটি lever আছে, আর সেগুলো আলাদা কাজ করে।

| Lever                   | কী করে                                     | Tool                                  |
| ----------------------- | ------------------------------------------------ | ------------------------------------------ |
| **কম কাজ করা**        | যে render-এর output বদলাত না, সেগুলো বাদ দেয়        | Memoisation — এখন compiler লেখে   |
| **কাজের schedule ঠিক করা**   | জরুরি update-কে ভারী update থামিয়ে দিতে দেয়       | `useTransition`, `useDeferredValue`         |

কম কাজ করলে render সস্তা হয়। Schedule কিছুই সস্তা করে না। এটা বদলায় *কী block করে*। একজন senior engineer কোনো
lever ছোঁয়ার আগেই বলতে পারেন, একটি slowdown-এর জন্য কোন lever দরকার।

> ⚠️ **যা বদলাতে থাকে:** React Compiler 1.0 October 2025-এ ship হয়েছে, React 17 ও পরের version-এর জন্য। এর
> default, directive আর lint packaging এখনো থিতু হচ্ছে। স্থায়ী নীতিটি হলো: memoisation একটি cache, একটি cache-এর
> কাজ করতে stable identity লাগে, আর যে cache আপনি measure করেননি সেটা একটি খরচ। Cache-টি আপনি লেখেন নাকি compiler,
> সেটা implementation-এর খুঁটিনাটি।

## কীভাবে কাজ করে

### একটি re-render-এর খরচ

একটি re-render-এর তিনটি phase। Render component-টিকে call করে, reconcile নতুন tree-কে পুরোনোটার সাথে diff করে, আর
commit পার্থক্যগুলো DOM-এ বসায়। যে component একই output নিয়ে re-render হয়, সে তবু প্রথম দুটির দাম দেয়। সেটা
সাধারণত সস্তা। ব্যয়বহুল হয়, যখন শত শত component প্রতিটি keystroke-এ এটা করে, বা যখন তাদের একটি পথে দশ হাজার row
sort করে।

### প্রথম lever: compiler দিয়ে কম কাজ

Compiler build-এর সময় আপনার component-গুলো পড়ে। যে value আবার ব্যবহার করা যেতে পারে, তার প্রতিটির চারপাশে সে একটি
cache বসায়: return করা JSX, তৈরি হওয়া object আর callback, আর derived result। ফলটা প্রতিটি component-কে `memo`-তে
আর প্রতিটি derived value-কে `useMemo`-তে wrap করার মতোই, অথচ এর কিছুই আপনার source-এ নেই।

**Compiler-এর আগে, এই child প্রতিটি click-এ re-render হতো:**

```tsx
function Parent({ name }: { name: string }) {
  const [count, setCount] = useState<number>(0);
  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <ExpensiveChild name={name} /> {/* re-rendered on every click */}
    </>
  );
}
```

**Compiler চালু থাকলে source একই থাকে, আর child-টি re-render হওয়া বন্ধ করে।** Compiler দেখে যে `name` বদলায়নি।
সে `ExpensiveChild` call না করে আগের বার বানানো element-টিই আবার ব্যবহার করে।

প্রতিটি component-এর জন্য দুটি directive এটা নিয়ন্ত্রণ করে। `"use memo"` একটি component বা hook-কে opt in করায়,
file ধরে ধরে গ্রহণ করার জন্য। `"use no memo"` একটিকে বাদ দেয়, compiler-এর সন্দেহজনক কোনো bug আলাদা করার সাময়িক
উপায় হিসেবে।

Compiler শুধু সেটুকুই memoise করে, যেটা নিরাপদ বলে সে প্রমাণ করতে পারে। তার প্রমাণ হলো Rules of React: component
pure, props আর state mutate করা হয় না, আর hook শর্ত ছাড়াই চলে। একটি ভাঙলে compiler **সেই component-টি চুপচাপ বাদ
দেয়**। বাকি সবকিছু তবু optimise হয়। সেই component কোনো speed-up পায় না, কোনো error-ও না।

> ⚠️ যে component একটি prop mutate করে, বা render-এর সময় একটি `ref` পড়ে, সেটা test পাস করবে, ship হবে, আর
> নিঃশব্দে compiler-এর কোনো সুবিধাই পাবে না। `eslint-plugin-react-hooks` এই bail-out-গুলো report করে, আর compiler
> গ্রহণ করার আগেও এটা কাজ করে। আগে এটা চালু করুন।

### দ্বিতীয় lever: transition দিয়ে কাজের schedule

আগে rendering ছিল একটি block, যেটা থামানো যেত না। Concurrent rendering React-কে শুরু করতে, একটি event-এর জন্য
থামতে, তারপর আবার চালু করতে বা কাজটা ফেলে দিতে দেয়। কোনো কিছুই এটা নিজে থেকে ব্যবহার করে না। **কোন update অপেক্ষা
করতে পারে, তা আপনি চিহ্নিত করেন**, আর চিহ্ন ছাড়া update-গুলো জরুরিই থাকে। `useTransition` এমন একটি update চিহ্নিত
করে, যেটা আপনি trigger করেন।

**একটি tab switch, যেটা button-কে responsive রাখে:**

```tsx
const [isPending, startTransition] = useTransition();
const [tab, setTab] = useState<TabId>("about");

function selectTab(next: TabId): void {
  startTransition(() => {
    setTab(next); // Non-urgent: the old tab stays on screen until the new one is ready
  });
}
```

Button সাথে সাথে সাড়া দেয়, পুরোনো tab দেখা যেতে থাকে, আর `isPending` দিয়ে আপনি সেটা dim করতে পারেন। React 19
এখানে একটি async function-ও নেয়, আর Action-গুলো এর ওপরেই তৈরি।

`useDeferredValue` এমন একটি value চিহ্নিত করে, যেটা আপনার হাতে দেওয়া হয়েছে। যখন `setState` আপনার নয়, তখন এটা
ব্যবহার করুন। React একবার পুরোনো value দিয়ে render করে, তারপর কম priority-তে নতুনটা দিয়ে আবার করে।

**একটি search box, যার result ইচ্ছা করেই পিছিয়ে থাকে:**

```tsx
const [query, setQuery] = useState<string>("");
const deferredQuery: string = useDeferredValue(query);
const isStale: boolean = query !== deferredQuery;

return (
  <>
    <input value={query} onChange={(e) => setQuery(e.target.value)} />
    {/* Results must be memoised, or it re-renders on the urgent pass anyway */}
    <div style={{ opacity: isStale ? 0.6 : 1 }}>
      <Results query={deferredQuery} />
    </div>
  </>
);
```

এখানে দুটি lever মিলে যায়: deferral তখনই কাজে আসে, যখন `Results` memoise করা থাকে, হাতে বা compiler দিয়ে।

| প্রশ্ন                          | `useTransition`              | `useDeferredValue`                    |
| --------------------------------- | ---------------------------- | ------------------------------------- |
| State update কি আপনার হাতে?      | ✅ হ্যাঁ — আপনি `setState` call করেন  | ❌ না — value একটি prop হিসেবে আসে    |
| আপনি কী চিহ্নিত করেন?                 | Update                   | Value                             |
| Pending flag                      | Built in — `isPending`       | দুটি value তুলনা করে বের করুন |

মোটা দাগের নিয়ম: **setter আপনার হলে transition ব্যবহার করুন; শুধু value আপনার হলে সেটা defer করুন।**

### যা কোনো lever-ই ঠিক করে না

| লক্ষণ                                    | Memoisation আর scheduling কেন সাহায্য করে না                        |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Page interactive হতে চার সেকেন্ড লাগে | JavaScript-কে তবু download আর parse হতে হবে                    |
| প্রতিটি request আগেরটার জন্য অপেক্ষা করে    | Waterfall একটি network সমস্যা, render সমস্যা নয়            |
| একটি render-এ 300 ms লাগে                     | প্রথম render কখনো cache হয় না; transition শুধু এটাকে সরিয়ে দেয়      |
| 5,000 row scroll করলে আটকে আটকে চলে               | কাজটা সত্যিকারের; সমাধান হলো কাজটা না করা (virtualisation)        |

বাস্তব application-এ প্রথম দুটিরই আধিপত্য। আগে এগুলো ঠিক করুন: bundle ভাগ করুন, request parallel করুন।

### সবকিছুর আগে profiling

Page নয়, যে interaction-টি ধীর লাগে সেটা profile করুন। **React DevTools Profiler** এটাকে একটি flamegraph হিসেবে
record করে। প্রতিটি bar component-এর নাম, তার render time আর *কেন এটা render হলো* তা দেখায়: props, state, নাকি
parent। **Browser performance panel** commit-এর পরের সময় দেখায়। React-এর commit যদি 4 ms নেয় আর frame নেয়
200 ms, তাহলে সমস্যা layout, paint, বা React-এর বাইরের কোনো long task। প্রতিটি উন্নতি production build-এ নিশ্চিত
করুন: development-এ 40 ms-এর একটি render production-এ হয়তো 4 ms।

## কখন ব্যবহার করবেন

| লক্ষণ                                             | কী ব্যবহার করবেন                                            |
| --------------------------------------------------- | ---------------------------------------------------- |
| ধীর first paint, বড় JavaScript payload           | Server-side-এ সরিয়ে নিন; বাকিটা dynamic import করুন          |
| Spinner-এর chain — একটি request, তারপর পরেরটা         | Request-গুলো parallel-এ শুরু করুন; Suspense দিয়ে stream করুন  |
| প্রতিটি keystroke-এ শত শত component re-render হয়  | Compiler — ঠিক এটাই তার কাজ                |
| একটি component পুরো page re-render করায়              | State নিচে নামান, বা context ভাগ করুন             |
| বড় একটি list filter হওয়ার সময় typing পিছিয়ে পড়ে                 | Query-তে `useDeferredValue`, তারপর virtualisation  |
| এমন একটি tab-এ যাওয়া, যেটা ভারী কিছু render করে  | Setter-এর চারপাশে `useTransition`                     |
| এমন content, যেটা এখনো নেই                      | একটি Suspense boundary, transition নয়             |

## সাধারণ ভুল

**❌ "নিরাপদ থাকতে" সবকিছু `memo`-তে wrap করা।** প্রতিটি `memo` প্রতিটি render-এ একটি props তুলনা যোগ করে, আর
পুরোনো props memory-তে রেখে দেয়। সবখানে লাগালে এর খরচ আছে, লাভ নেই। Compiler চালু থাকলে এটা অপ্রয়োজনীয়ও।

**❌ Input-এর নিজের value defer করা:**

```tsx
<input value={deferredQuery} onChange={(e) => setQuery(e.target.value)} />;
```

টাইপ করা character এখন keyboard-এর পিছনে পড়ে থাকে। Input-কে সবসময় জরুরি থাকতে হবে। এটা যা *চালায়*, সেটা defer
করুন, এটা যা দেখায় তা কখনো নয়।

**❌ ধীর একটি request লুকাতে transition ব্যবহার করা।** `isPending` দুই সেকেন্ড ধরে true থাকে, আর user কোনো
ব্যাখ্যা ছাড়া একটি dim screen দেখে। একটি Suspense fallback বা skeleton অনেক বেশি কিছু বলে।

**❌ একটি component-এর ভেতরে আরেকটি component define করা:**

```tsx
function Page() {
  function Row({ item }: { item: Item }) { /* new function identity every render */ }
  return <List renderRow={Row} />;
}
```

React প্রতিটি render-এ একটি নতুন component type দেখে, তাই সে subtree-টি unmount করে আবার mount করে। State আর DOM
ফেলে দেওয়া হয়। কোনো memoisation এটাকে বাঁচাতে পারে না। `Row`-কে module level-এ সরিয়ে নিন।

## 🔑 মূল শিক্ষা

- ধীর একটি React screen-এর দুটি lever-এর একটি লাগে: memoisation দিয়ে কম কাজ, অথবা transition দিয়ে কাজের schedule।
- React Compiler memoisation automate করে, কিন্তু Rules of React ভাঙে এমন যেকোনো component সে চুপচাপ বাদ দেয়।
- `useTransition` এমন একটি update চিহ্নিত করে, যেটা আপনি trigger করেন। `useDeferredValue` এমন একটি value চিহ্নিত করে, যেটা আপনার হাতে দেওয়া হয়েছে।
- কোনো lever-ই bundle size বা network waterfall ছোঁয় না, অথচ বাস্তবের বেশিরভাগ ধীরগতির কারণ এগুলোই।
- নির্দিষ্ট interaction-টি profile করুন, production build-এ নিশ্চিত করুন, আর ওপর দিয়ে cache না চাপিয়ে কারণটা ঠিক করুন।

## Interview-এর প্রশ্ন

**Q: React Compiler কী করে, আর এর কারণে আপনি কী লেখা বন্ধ করেন?**

এটা build-এর সময় component analyse করে, আর সেগুলো যা তৈরি করে তা cache করে: return করা JSX, object, callback আর
derived value। `memo`, `useMemo` আর `useCallback` হাতে যা করত, সেটা এতে চলে আসে, তাই এদের বেশিরভাগ application
code থেকে বিদায় নেয়। Bundle size, waterfall, বা একটি ভারী render-এর খরচের জন্য এটা কিছুই করে না।

**Q: আপনি compiler চালু করলেন, অথচ একটি component এখনো অনবরত re-render হচ্ছে। কোথায় খুঁজবেন?**

প্রথমে দেখুন এটা আদৌ compile হয়েছে কি না। Rules of React ভাঙে এমন যেকোনো component compiler বাদ দেয়, আর সেটা
চুপচাপই করে। `eslint-plugin-react-hooks` এই case-গুলো report করে। Compile হয়ে থাকলে, এমন একটি value খুঁজুন যেটা
React-এর বাইরে থেকে প্রতিবার নতুন identity নিয়ে ঢোকে।

**Q: `useTransition` নাকি `useDeferredValue`?**

নির্ভর করে state update আপনার হাতে কি না তার ওপর। আপনি যদি `setState` call করেন, সেটা `startTransition`-এ wrap
করুন আর `isPending` ব্যবহার করুন। Value যদি parent বা একটি store থেকে আসে, সেটা defer করুন আর দুটি value তুলনা
করে pending state বের করুন। যেভাবেই হোক, ভারী child-টিকে memoise করা থাকতে হবে, নইলে জরুরি pass এটাকে এমনিতেই
render করে।

**Q: Transition যোগ করার পরেও list-টি ধীর লাগছে। এখন কী?**

Transition কখনো কিছুই দ্রুত করেনি, তাই সময়টা কোথায় যাচ্ছে খুঁজে বের করুন। Commit profile করুন। সাধারণত এটা হয়
একটি অপ্রয়োজনীয় render, একটি unstable prop যেটা memo-কে ব্যর্থ করছে, বা প্রতিটি keystroke-এ বড় একটি array-র ওপর
filter। সত্যিই বড় একটি list-এর virtualisation লাগে। অপেক্ষাটা যদি একটি request হয়, তাহলে এটা শুরু থেকেই data-র
সমস্যা ছিল।

**Q: একটি page interactive হতে চার সেকেন্ড নেয়। কোথা থেকে শুরু করবেন?**

Memoisation বা transition দিয়ে নয়। চার সেকেন্ড প্রায় সবসময় payload আর waterfall। আগে bundle-এর গঠন আর network
waterfall দেখুন। Render-এর কাজ গুরুত্বপূর্ণ interaction-এর সময়ের jank-এর জন্য, যেটা আলাদা একটি লক্ষণ, আলাদা
measurement-সহ।

**Q: কখন এখনো আপনি হাতে `useMemo` লিখবেন?**

যখন value-টি কোনো render-এর অংশ নয়, যেমন একটি non-React library-কে দেওয়া একটি stable object, বা এমন একটি ভারী
result যেটা একটি effect-কে খাওয়ায়। আর এমন একটি component-এ, যেটা compiler compile করতে পারে না আর আপনি এখনো ঠিক
করতে পারছেন না। দুটিতেই কারণ জানিয়ে একটি comment থাকা উচিত, কারণ default উত্তর এখন "লিখবেন না"।

## এরপর কী পড়বেন

- [Chapter ?? — Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming) — যে content এখনো নেই, তার tool
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — bundle কমানোর সবচেয়ে বড় lever
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — code splitting আর কী measure করবেন
