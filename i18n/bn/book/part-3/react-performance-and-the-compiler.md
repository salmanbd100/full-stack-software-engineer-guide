---
sourceHash: "a0d8fd75f30de1606404f9af074eb546c2124ec63db5dc9d6d8d533638fed71d"
title: "Performance, Transition ও Compiler"
translatedAt: "2026-10-17T01:39:53.562Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Performance, Transition ও Compiler {#ch-react-performance-and-the-compiler}

> ধীর React screen-এর কারণ আগে খুঁজে বের করুন, তারপর ঠিক lever-টা টানুন: হয় কাজ কমান, নয়তো যে কাজ এড়ানো যায় না তাকে schedule করুন।

**এই অধ্যায়ে:** একটি re-render-এর খরচ · compiler আর তা কী memoise করে · transition আর deferred value · যা কোনো lever-ই ঠিক করে না · আগে profiling

## 💡 মূল ধারণা

"React ধীর" কখনো একটি সমস্যা নয়। দুটি কারণ React-এর বাইরে: বেশি JavaScript আসা, আর একটির পর একটি অপেক্ষা
করা request। React-এর ভেতরে আপনার হাতে দুটি lever আছে, আর দুটির কাজ আলাদা।

| Lever                   | কী করে                                              | কোন tool                                     |
| ----------------------- | -------------------------------------------------- | -------------------------------------------- |
| **কাজ কমানো**           | যে render-এর output বদলাবে না, সেটা বাদ দেওয়া        | Memoisation — এখন compiler নিজেই লেখে          |
| **কাজ schedule করা**    | জরুরি update-কে দামি update থামিয়ে আগে যেতে দেওয়া   | `useTransition`, `useDeferredValue`         |

কাজ কমালে render সস্তা হয়। Schedule করলে কিছুই সস্তা হয় না, শুধু বদলায় *কোনটা আটকে রাখে*। Senior engineer
কোনো lever ছোঁয়ার আগেই বলতে পারেন, এই ধীরগতির জন্য কোনটা দরকার।

> ⚠️ **যা বদলাতে থাকে:** React Compiler 1.0 এসেছে October 2025-এ, React 17 আর তার পরের version-এর জন্য। এর
> default, directive আর lint packaging এখনো থিতু হচ্ছে। টেকসই নীতি: memoisation একটি cache, cache কাজ করতে
> stable identity লাগে, আর যে cache মেপে দেখেননি সেটা শুধুই খরচ। Cache-টা আপনি লিখলেন নাকি compiler, সেটা
> implementation-এর খুঁটিনাটি।

## কীভাবে কাজ করে

### একটি re-render-এর খরচ

Re-render-এর তিনটি ধাপ। Render ধাপে component call হয়, reconcile ধাপে নতুন tree-কে পুরনোটার সঙ্গে মেলানো হয়, আর
commit ধাপে পার্থক্যগুলো DOM-এ বসানো হয়। একই output নিয়ে re-render হওয়া component-ও প্রথম দুটি ধাপের দাম দেয়।
সাধারণত সেটা সস্তা। দামি হয়ে যায় যখন প্রতিটি keystroke-এ শত শত component এটা করে, অথবা তাদের একটি পথে দশ হাজার
row sort করে।

### প্রথম lever: compiler দিয়ে কাজ কমানো

Compiler build-এর সময় আপনার component পড়ে। যে value আবার ব্যবহার করা যায়, তার প্রতিটির চারপাশে compiler একটি cache
বসায়: return করা JSX, তৈরি হওয়া object আর callback, আর derived result। ফলটা প্রতিটি component-কে `memo`-তে আর
প্রতিটি derived value-কে `useMemo`-তে মোড়ার মতোই, কিন্তু আপনার source-এ এর কিছুই থাকে না।

**Compiler-এর আগে এই child প্রতিটি click-এ re-render হতো:**

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

**Compiler চালু থাকলে source একই থাকে, কিন্তু child-এর re-render বন্ধ হয়ে যায়।** Compiler দেখে `name` বদলায়নি।
তাই `ExpensiveChild` call না করে আগের বার বানানো element-টাই আবার ব্যবহার করে।

প্রতিটি component-এ দুটি directive দিয়ে একে নিয়ন্ত্রণ করা যায়। `"use memo"` একটি component বা hook-কে এর আওতায়
আনে, file ধরে ধরে চালু করার জন্য। `"use no memo"` একটিকে বাদ দেয়, compiler-এর সন্দেহজনক bug আলাদা করার অস্থায়ী
উপায় হিসেবে।

Compiler শুধু সেটুকুই memoise করে, যা নিরাপদ বলে প্রমাণ করতে পারে। তার প্রমাণ হলো Rules of React: component pure,
props আর state mutate হয় না, আর hook সবসময় শর্ত ছাড়াই চলে। একটি নিয়ম ভাঙলে compiler **ওই component-টা চুপচাপ
বাদ দেয়**। বাকি সব optimise হয়। ওই component কোনো গতি পায় না, error-ও পায় না।

> ⚠️ যে component prop mutate করে, বা render-এর সময় `ref` পড়ে, সেটা test পাস করে, ship হয়, আর চুপচাপ compiler-এর
> কোনো সুবিধাই পায় না। `eslint-plugin-react-hooks` এই bail-out-গুলো জানায়, আর compiler চালুর আগেও কাজ করে। আগে
> সেটা চালু করুন।

### দ্বিতীয় lever: transition দিয়ে কাজ schedule করা

আগে rendering ছিল একটানা একটি block, যাকে থামানো যেত না। Concurrent rendering-এ React কাজ শুরু করতে পারে, কোনো
event-এর জন্য থামতে পারে, তারপর আবার চালাতে বা কাজটা ফেলে দিতে পারে। এটা নিজে থেকে কিছুই ব্যবহার করে না। **কোন
update অপেক্ষা করতে পারবে, তা আপনি চিহ্নিত করেন**, আর চিহ্ন ছাড়া update জরুরি থেকে যায়। আপনি নিজে যে update
চালান, `useTransition` সেটা চিহ্নিত করে।

**এমন tab switch, যেখানে button সাড়া দিতেই থাকে:**

```tsx
const [isPending, startTransition] = useTransition();
const [tab, setTab] = useState<TabId>("about");

function selectTab(next: TabId): void {
  startTransition(() => {
    setTab(next); // Non-urgent: the old tab stays on screen until the new one is ready
  });
}
```

Button সঙ্গে সঙ্গে সাড়া দেয়, পুরনো tab দেখা যেতে থাকে, আর `isPending` দিয়ে সেটা হালকা করে দেওয়া যায়। React 19
এখানে async function-ও নেয়, আর Action এর ওপরেই দাঁড়িয়ে।

`useDeferredValue` চিহ্নিত করে আপনার হাতে আসা একটি value। যখন `setState` আপনার হাতে নেই, তখন এটা ব্যবহার করুন।
React আগে পুরনো value দিয়ে একবার render করে, তারপর নতুনটা দিয়ে কম priority-তে আরেকবার।

**এমন search box, যার result ইচ্ছে করেই একটু পিছিয়ে থাকে:**

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

এখানে দুই lever মিলে যায়: deferral কাজে লাগে শুধু তখনই, যখন `Results` memoised, হাতে বা compiler দিয়ে।

| প্রশ্ন                              | `useTransition`              | `useDeferredValue`                    |
| ---------------------------------- | ---------------------------- | ------------------------------------- |
| State update কি আপনার হাতে?        | ✅ হ্যাঁ — আপনি `setState` call করেন | ❌ না — value আসে prop হিসেবে      |
| কী চিহ্নিত করেন?                    | Update                       | Value                                 |
| Pending flag                       | ভেতরেই আছে — `isPending`     | দুটি value তুলনা করে বের করতে হয়      |

মোটা দাগের নিয়ম: **setter আপনার হাতে থাকলে transition, শুধু value হাতে থাকলে defer।**

### যা কোনো lever-ই ঠিক করে না

| লক্ষণ                                        | কেন memoisation বা scheduling কাজে আসে না                          |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Page interactive হতে চার সেকেন্ড লাগে          | JavaScript তো download আর parse হতেই হবে                         |
| প্রতিটি request আগেরটার জন্য অপেক্ষা করে       | Waterfall network-এর সমস্যা, render-এর নয়                         |
| একটি render-এ 300 ms লাগে                   | প্রথম render কখনো cache হয় না; transition শুধু সেটা সরিয়ে দেয়      |
| 5,000 row scroll করতে গেলে আটকায়           | কাজটা সত্যিই আছে; সমাধান হলো কাজটা না করা (virtualisation)         |

আসল app-এ প্রথম দুটিই সবচেয়ে বেশি ভোগায়। আগে সেগুলো ঠিক করুন: bundle ভাগ করুন, request একসঙ্গে চালান।

### সবকিছুর আগে profiling

পুরো page নয়, যে interaction ধীর লাগছে সেটা profile করুন। **React DevTools Profiler** সেটা flamegraph হিসেবে
record করে। প্রতিটি bar-এ থাকে component-এর নাম, তার render time, আর *কেন render হলো*: props, state, নাকি parent।
**Browser-এর performance panel** দেখায় commit-এর পরের সময়। React-এর commit যদি 4 ms নেয় আর frame নেয় 200 ms,
তাহলে সমস্যা layout, paint, অথবা React-এর বাইরের কোনো long task। প্রতিটি উন্নতি production build-এ যাচাই করুন:
development-এ 40 ms-এর render production-এ হয়তো 4 ms।

## কখন ব্যবহার করবেন

| লক্ষণ                                                 | কী ব্যবহার করবেন                                      |
| ---------------------------------------------------- | ---------------------------------------------------- |
| ধীর first paint, ভারী JavaScript payload             | Server-এ সরিয়ে দিন; বাকিটা dynamic import            |
| Spinner-এর শিকল — একটি request, তারপর আরেকটি         | Request-গুলো একসঙ্গে শুরু করুন; Suspense দিয়ে stream |
| প্রতিটি keystroke-এ শত শত component re-render হয়     | Compiler — ঠিক এটাই তার কাজ                          |
| একটি component পুরো page re-render করায়              | State নিচে নামান, অথবা context ভাগ করুন               |
| বড় list filter হওয়ার সময় টাইপ করতে দেরি হয়        | Query-তে `useDeferredValue`, তারপর virtualisation  |
| এমন tab-এ যাওয়া, যা দামি কিছু render করে             | Setter-এর চারপাশে `useTransition`                    |
| যে content এখনো তৈরিই হয়নি                         | Suspense boundary, transition নয়                    |

## সাধারণ ভুল

**❌ "নিরাপদ থাকতে" সবকিছু `memo`-তে মোড়া।** প্রতিটি `memo` প্রতিবার render-এ একটি props তুলনা যোগ করে, আর পুরনো
props memory-তে রেখে দেয়। সব জায়গায় দিলে খরচ হয়, লাভ হয় না। Compiler চালু থাকলে এটা বাড়তিও।

**❌ Input-এর নিজের value defer করা:**

```tsx
<input value={deferredQuery} onChange={(e) => setQuery(e.target.value)} />;
```

এখন টাইপ করা অক্ষর keyboard-এর চেয়ে পিছিয়ে পড়ে। Input সবসময় জরুরি থাকতে হবে। Input যা *চালায়* সেটা defer
করুন, input যা দেখায় সেটা কখনো নয়।

**❌ ধীর request লুকাতে transition ব্যবহার করা।** `isPending` দুই সেকেন্ড true থাকে, আর user দেখে কোনো ব্যাখ্যা
ছাড়া একটি ঝাপসা screen। Suspense fallback বা skeleton এর চেয়ে অনেক বেশি কথা বলে।

**❌ এক component-এর ভেতরে আরেকটি component define করা:**

```tsx
function Page() {
  function Row({ item }: { item: Item }) { /* new function identity every render */ }
  return <List renderRow={Row} />;
}
```

React প্রতিটি render-এ নতুন একটি component type দেখে, তাই subtree unmount করে আবার mount করে। State আর DOM
ফেলে দেওয়া হয়। কোনো memoisation এটাকে বাঁচাতে পারে না। `Row`-কে module level-এ সরিয়ে নিন।

## 🔑 মূল শিক্ষা

- ধীর React screen-এর জন্য দুটির একটি lever লাগে: memoisation দিয়ে কাজ কমানো, অথবা transition দিয়ে schedule করা।
- React Compiler memoisation নিজে করে দেয়, কিন্তু Rules of React ভাঙা যেকোনো component চুপচাপ বাদ দেয়।
- `useTransition` চিহ্নিত করে আপনার চালানো update। `useDeferredValue` চিহ্নিত করে আপনার হাতে আসা value।
- কোনো lever-ই bundle size বা network waterfall ছোঁয় না, আর আসল ধীরগতির বেশিরভাগ ওখান থেকেই আসে।
- নির্দিষ্ট interaction-টা profile করুন, production build-এ যাচাই করুন, আর cache দিয়ে ঢেকে না দিয়ে কারণটা ঠিক করুন।

## Interview-এর প্রশ্ন

**Q: React Compiler কী করে, আর এর কারণে আপনি কী লেখা বন্ধ করেন?**

এটা build-এর সময় component বিশ্লেষণ করে, আর component যা তৈরি করে তা cache করে: return করা JSX, object, callback
আর derived value। `memo`, `useMemo` আর `useCallback` হাতে যা করত, তার সবটাই এতে চলে আসে, তাই এগুলোর বেশিরভাগ
application code থেকে বিদায় নেয়। Bundle size, waterfall, বা একটি দামি render-এর খরচ নিয়ে এটা কিছুই করে না।

**Q: Compiler চালু করলেন, তবু একটি component বারবার re-render হচ্ছে। কোথায় খুঁজবেন?**

প্রথমে দেখুন সেটা আদৌ compile হয়েছে কি না। Rules of React ভাঙা যেকোনো component compiler বাদ দেয়, আর চুপচাপই দেয়।
`eslint-plugin-react-hooks` এই ঘটনাগুলো জানায়। Compile হয়ে থাকলে খুঁজুন এমন কোনো value, যা React-এর বাইরে থেকে
প্রতিবার নতুন identity নিয়ে ঢুকছে।

**Q: `useTransition` নাকি `useDeferredValue`?**

নির্ভর করে state update আপনার হাতে কি না তার ওপর। আপনি `setState` call করলে সেটা `startTransition`-এ মুড়ে দিন,
আর `isPending` ব্যবহার করুন। Value যদি parent বা store থেকে আসে, তাহলে defer করুন, আর দুটি value তুলনা করে pending
state বের করুন। যেভাবেই করুন, দামি child-টা memoised হতে হবে। নইলে জরুরি pass-টাই সেটা render করে ফেলে।

**Q: Transition দেওয়ার পরেও list ধীর লাগছে। এখন কী?**

Transition কখনো কিছু দ্রুত করেনি, তাই খুঁজে বের করুন সময়টা কোথায় যাচ্ছে। Commit profile করুন। সাধারণত পাওয়া যায়
অদরকারি render, memo ভেস্তে দেওয়া unstable prop, অথবা প্রতিটি keystroke-এ বড় array filter। সত্যিই বড় list হলে
virtualisation লাগে। অপেক্ষাটা যদি request-এর হয়, তাহলে সমস্যাটা শুরু থেকেই data-র ছিল।

**Q: একটি page interactive হতে চার সেকেন্ড নেয়। কোথা থেকে শুরু করবেন?**

Memoisation বা transition দিয়ে নয়। চার সেকেন্ড প্রায় সবসময় payload আর waterfall-এর কারণে। আগে bundle-এ কী আছে
আর network waterfall দেখুন। Render-এর কাজ গুরুত্বপূর্ণ interaction-এর সময়ের jank-এর জন্য। সেটা আলাদা লক্ষণ,
মাপার উপায়ও আলাদা।

**Q: কখন এখনো হাতে `useMemo` লিখবেন?**

যখন value-টা render-এর অংশ নয়। যেমন non-React library-কে দেওয়া stable object, বা এমন দামি result যা effect-কে
খাওয়ায়। আর এমন component-এ, যা compiler compile করতে পারে না আর আপনি এখনই ঠিক করতে পারছেন না। দুই ক্ষেত্রেই কেন
লিখলেন, তা comment-এ লিখে রাখুন। কারণ এখন default উত্তর হলো "লিখবেন না"।

## এরপর কী পড়বেন

- [Chapter ?? — Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming) — যে content এখনো তৈরি হয়নি, তার tool
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — bundle কমানোর সবচেয়ে বড় lever
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — code splitting আর কী মাপবেন
