---
sourceHash: "358a5e24ec082ac75de3f44a0fcd8c33dc0c4311ee38db97e3e8ddd6e54384a8"
title: "Hook-এর গভীরে"
translatedAt: "2026-10-12T07:53:46.753Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Hook-এর গভীরে {#ch-react-hooks-in-depth}

> Hook-এর নিয়মগুলো কেন আছে তা ব্যাখ্যা করুন, এমন একটি effect লিখুন যেটা ঠিকমতো cleanup করে, আর ship হওয়ার আগেই stale closure ধরে ফেলুন।

**এই অধ্যায়ে:** call order-ই কেন নিয়ম · `useState` বনাম `useRef` · synchronisation হিসেবে effect · stale closure · যে custom hook আলাদা করার মতো

## 💡 মূল ধারণা

একটি hook একটি component instance-এর সাথে কিছু একটি যুক্ত করে: একটি value, একটি subscription, এক টুকরো কাজ।
Component function নিজে কোনো state রাখে না, আর প্রতিটি render-এ ওপর থেকে নিচে চলে। State থাকে এর বাইরে, একটি
list-এ, যেটা React ধরে রাখে। **React আপনার hook call-গুলোকে ওই list-এর সাথে মেলায় call order দিয়ে।**

Hook-এর সব অদ্ভুত দিক এই একটি implementation detail থেকেই আসে। কোনো নাম নেই, কোনো key নেই। আছে শুধু "এই
component-এর call করা তৃতীয় hook"। Render থেকে render-এ ক্রম বদলান, তৃতীয় call দ্বিতীয় call-এর state পেয়ে যাবে।

> এ কারণেই নিয়মগুলো style-এর পরামর্শ নয়। একটি `if`-এর ভেতরে `useState` শুধু দেখতে খারাপ নয়। এটা একটি
> use-after-free bug, যেটা শুধু একটি branch উল্টে যাওয়ার অপেক্ষায় আছে।

## কীভাবে কাজ করে

### নিয়মগুলো, আর একমাত্র ব্যতিক্রম

| নিয়ম                                          | এটা না মানলে কী ভাঙে                             |
| --------------------------------------------- | --------------------------------------------------- |
| Hook call করুন top level-এ, কখনো branch, loop বা early return-এর ভেতরে নয় | Call order সরে যায়, আর state ভুল slot থেকে পড়া হয় |
| Hook call করুন শুধু component বা অন্য hook থেকে | State যুক্ত করার মতো কোনো instance React-এর কাছে থাকে না        |
| Custom hook-এর নাম দিন `useSomething`               | Linter আর React Compiler দুটিই এর ওপর নির্ভর করে   |

React 19 একটি ইচ্ছাকৃত ব্যতিক্রম যোগ করে: **`use` শর্তসাপেক্ষে call করা যায়।** এটা একটি promise বা একটি context
পড়ে। এটা একটি `if` বা loop-এর ভেতরে থাকতে পারে, কারণ এর নিজের কোনো state slot নেই। বাকি প্রতিটি hook এখনও ওপরের
নিয়মগুলো মেনে চলে।

### `useState` বনাম `useRef`

দুটিই re-render পার হয়ে টিকে থাকে। কিন্তু render ঘটায় শুধু একটি।

| দরকার                                       | ব্যবহার করুন        | কেন                                            |
| ------------------------------------------ | ---------- | ----------------------------------------------- |
| এমন একটি value, যেটা UI দেখায়                       | `useState` | এটা বদলালে screen আবার paint হতেই হবে              |
| Focus, মাপা বা play করার জন্য একটি DOM node       | `useRef`   | এটা render output নয়, আর এটা mutate করলে render হওয়া চলবে না |
| একটি timer id, আগের একটি value, একটি scroll offset | `useRef` | ক্ষণস্থায়ী হিসাব-নিকাশ, যেটা UI সরাসরি কখনো পড়ে না |
| দামি একটি initial value                 | `useState(() => build())` | Lazy রূপটা builder-কে একবার চালায়, প্রতি render-এ নয় |

Lazy initialiser সহজেই চোখ এড়িয়ে যায়। `useState(buildIndex(rows))` **প্রতিটি** render-এ `buildIndex` call করে, আর
প্রথমবারের পর ফলাফল ফেলে দেয়। `useState(() => buildIndex(rows))` এটা একবার call করে।

**এমন value-এর জন্য ref, যেটা render করার পক্ষে খুব ঘনঘন বদলায়:**

```tsx
const lastScrollY = useRef<number>(0);

function handleScroll(event: UIEvent<HTMLDivElement>): void {
  // Sixty writes a second, zero re-renders.
  lastScrollY.current = event.currentTarget.scrollTop;
}
```

> ⚠️ Render-এর সময় কখনো `ref.current` পড়বেন না বা লিখবেন না। Render কখন চলবে, বা ফলাফল রাখা হবে কি না, সে বিষয়ে
> React কোনো কথা দেয় না। এটা পড়ুন একটি event handler বা একটি effect-এ।

### Effect synchronise করে; এগুলো lifecycle hook নয়

`useEffect` বোঝার কাজের উপায় হলো: *এই বাইরের জিনিসটাকে এই state-এর সাথে মিলিয়ে রাখো।* "Mount-এ চালাও" নয়।
Dependency array এমন trigger-এর list নয়, যেটা warning চলে না যাওয়া পর্যন্ত আপনি tune করবেন। এটা সেই value-গুলোর
list, যেগুলো effect ব্যবহার করে। এর কোনোটা আলাদা হলেই React আবার synchronise করে।

যে effect কিছু শুরু করে, তাকে সেটা থামাতেও পারতে হবে। Cleanup চলে পরের synchronisation-এর আগে, আর আবার unmount-এ।

**Subscribe করুন, আর বেরোনোর সময় unsubscribe করুন:**

```tsx
useEffect(() => {
  const socket: RoomSocket = connect(roomId);
  socket.on("message", onMessage);
  return () => socket.close(); // Runs before the next roomId, and on unmount
}, [roomId, onMessage]);
```

Fetching-এও একই শৃঙ্খলা লাগে, কারণ response ক্রম ভেঙে আসে। Guard না থাকলে user 1-এর একটি ধীর request user 2-এর
একটি দ্রুত request-কে overwrite করে দিতে পারে।

**যে response আর দরকার নেই, সেটা উপেক্ষা করুন:**

```tsx
useEffect(() => {
  const controller = new AbortController();

  void (async () => {
    const res: Response = await fetch(`/api/users/${userId}`, { signal: controller.signal });
    setUser((await res.json()) as User);
  })();

  return () => controller.abort();
}, [userId]);
```

### Stale closure

প্রতিটি render নতুন function তৈরি করে, আর প্রতিটি function *সেই* render-এর value-গুলোর ওপর close করে। কিছু
function তাদের তৈরি করা render-এর চেয়ে বেশি দিন বাঁচে, যেমন একটি interval, একটি subscription বা একটি event
listener। সেগুলো চিরকাল পুরনো value-গুলোই পড়তে থাকে।

**❌ যে counter এক-এ গিয়ে থেমে যায়:**

```tsx
useEffect(() => {
  const id: number = window.setInterval(() => {
    setCount(count + 1); // `count` is frozen at 0 from the first render
  }, 1000);
  return () => window.clearInterval(id);
}, []); // The empty array is what freezes it
```

**✅ Value-টির ওপর একেবারেই close করবেন না:**

```tsx
useEffect(() => {
  const id: number = window.setInterval(() => {
    setCount((c: number) => c + 1); // React supplies the current value
  }, 1000);
  return () => window.clearInterval(id);
}, []);
```

দুটি সমাধান, একটি নীতি। হয় value-টি dependency array-তে দিন, যাতে effect একটি নতুন closure নিয়ে আবার চলে। নয়তো
value পড়া বন্ধ করে পরিবর্তনটা বর্ণনা করুন। Linter-কে চুপ করাতে একটি dependency মুছে ফেলা এর কোনোটাই বাছে না, আর
bug-টা লুকিয়ে রাখে।

### Custom hook

Custom hook হলো এমন একটি function, যেটা hook call করে। পুরো mechanism এটুকুই। কোনো registry নেই, কোনো sharing নেই।
দুটি component `useOnlineStatus()` call করলে দুটি স্বাধীন state পায়।

একটি আলাদা করুন যখন *logic* পুনরাবৃত্তি হয়, শুধু code দেখতে একই রকম হলে নয়। একটি ভালো custom hook একটি
subscription, একটি synchronisation বা পরস্পর সম্পর্কিত কয়েকটি state পরিবর্তনের একটি ক্রম লুকিয়ে রাখে। এর নামই বলে
এটা কী করে।

```tsx
function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange: () => void) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine, // Value on the client
    () => true,             // Value on the server, so SSR and hydration agree
  );
}
```

Data যখনই React-এর বাইরে থাকে, তখন `useSyncExternalStore`-ই সঠিক tool: একটি browser API, একটি third-party store,
একটি media query। এটা value পড়ে render-এর সময়, পরে নয়। তাই ভুল state-এর কোনো ঝলক দেখা যায় না, আর React concurrent
ভাবে render করলে কোনো tearing (screen-এর দুই অংশে দুই রকম value দেখানো) হয় না।

## কখন ব্যবহার করবেন

| আপনার দরকার                                   | কী ব্যবহার করবেন                | কী নয়                                     |
| ------------------------------------------- | ------------------------ | ---------------------------------------- |
| এমন value, যেটা UI চালায়                    | `useState`               | `useRef` — কিছুই আবার paint হবে না          |
| এমন value, যেটা UI চালাবে না            | `useRef`                 | `useState` — প্রতিটি পরিবর্তনে একটি render         |
| একটি browser API বা external store থেকে data   | `useSyncExternalStore`   | `useEffect` + `useState`                 |
| এমন একটি constant, যেটা কখনো props-এর ওপর নির্ভর করে না      | Module scope             | কোনো hook-ই নয়                          |
| সম্পর্কিত state, যেগুলো একসাথে বদলায়         | `useReducer`             | পাঁচটি `useState` call, হাতে হাতে মিলিয়ে রাখা |

## সাধারণ ভুল

**❌ Effect-এর আবার চলা থামাতে dependency array ছেঁটে ফেলা:**

```tsx
useEffect(() => {
  subscribe(roomId, onMessage);
}, []); // roomId and onMessage are used but not declared
```

Effect এখন এমন একটি synchronisation বর্ণনা করে, যেটা সে করে না। **✅ Effect যে প্রতিটি value পড়ে, সেটা declare
করুন**, তারপর অস্থিরগুলোকে স্থির করুন। Function-টিকে effect-এর ভেতরে নিন, component-এর বাইরে hoist করুন, অথবা
`useCallback`-এ wrap করুন।

**❌ দুটি `useState` call, যাদের সবসময় মিল থাকতে হবে।** একটিকে set করে অন্যটিকে না করা যদি bug হয়, তাহলে এরা আসলে
একটিই state। **✅ `useReducer` ব্যবহার করুন, অথবা render-এর সময় প্রথমটা থেকে দ্বিতীয়টা derive করুন।**

**❌ Effect দিয়ে subscribe করে state-এ mirror করা।** দুটি render, stale value-এর একটি চোখে পড়ার মতো ঝলক, আর প্রতিটি
dependency পরিবর্তনে আবার subscribe। **✅ `useSyncExternalStore`।**

**❌ এমন custom hook, যেটা শুধু অসম্পর্কিত কয়েকটি call একসাথে জড়ো করে।** চারটি অসম্পর্কিত hook-কে wrap করা
`usePageSetup()` কিছুই সহজ না করে dependency-গুলো লুকিয়ে ফেলে। Line নয়, আচরণ আলাদা করুন।

## 🔑 মূল শিক্ষা

- React hook-গুলোকে তাদের state-এর সাথে মেলায় call order দিয়ে, এ কারণেই এরা কোনো branch-এর ভেতরে বসতে পারে না — `use` হলো React 19-এর একমাত্র ব্যতিক্রম।
- `useRef` render না ঘটিয়ে render পার হয়ে একটি value ধরে রাখে; `useState`-এর অস্তিত্বই render ঘটানোর জন্য।
- Dependency array-তে থাকে effect যা পড়ে; যে effect কিছু শুরু করে, তাকে সেটা থামানোর cleanup return করতে হবে।
- Stale closure হলো এমন একটি function, যেটা সেই render-এর চেয়ে বেশি দিন বাঁচে যার value সে capture করেছিল — একটি নতুন dependency বা updater function দিয়ে এটা ঠিক করুন।
- যে data React-এর বাইরে থাকে, তার জায়গা `useSyncExternalStore`-এ, এমন effect-এ নয় যেটা তাকে state-এ copy করে।

## Interview-এর প্রশ্ন

**Q: Hook শর্তসাপেক্ষে call করা যায় না কেন?**

React প্রতিটি component instance-এর জন্য hook state একটি list-এ রাখে। একটি hook call-এর কোনো নাম বা key নেই, তাই
React call-গুলোকে entry-র সাথে মেলায় ক্রম দিয়ে। একটি শর্তসাপেক্ষ call পরের প্রতিটি hook-কে এক slot সরিয়ে দেয়, ফলে
একটি `useState` অন্য hook-এর value পড়ে ফেলবে। React 19-এর `use` এর বাইরে, কারণ এর কোনো slot নেই। এটা একটি promise
বা context পড়ে, আর কিছুই store করে না।

**Q: এই `setInterval` counter-কে 1 পর্যন্ত বাড়ায়, তারপর থেমে যায়। সমস্যা কী?**

Callback-টি `count`-এর ওপর close করে সেই render থেকে, যে render-এ effect চলেছিল। Empty dependency array মানে effect
আর কখনো চলে না। তাই ওই closure চিরকাল বেঁচে থাকে, আর `count` আটকে থাকে তার প্রথম value-তে। সমাধান হলো `setCount`-এ
একটি updater function পাঠানো। এটা capture করা value-এর ওপর নির্ভরতা সরিয়ে দেয়, আর interval-কে প্রতি সেকেন্ডে ভেঙে
আবার তৈরি হওয়া থেকেও বাঁচায়।

**Q: বদলায় এমন একটি value-এর জন্য কখন `useState`-এর বদলে `useRef` বাছবেন?**

যখন UI render-এর সময় সেটা পড়ে না। উদাহরণ: প্রতিটি pointer move-এ update হওয়া একটি drag offset, একটি timer id, বা
একটি prop-এর আগের value। এগুলো সবই ক্ষণস্থায়ী হিসাব-নিকাশ। এগুলো state-এ রাখলে প্রতিটি পরিবর্তনে একটি render হয়,
এমন output-এর জন্য যেটা কেউ দেখে না। পরীক্ষাটা সহজ: JSX থেকে value-টি সরালে যদি screen-এ কিছুই না বদলায়, তাহলে এর
জায়গা state-এ নয়।

**Q: কখন একটি custom hook আলাদা করা ভুল সিদ্ধান্ত?**

যখন এটা শুধু line সরায়। চারটি অসম্পর্কিত call wrap করা একটি hook লুকিয়ে ফেলে component কোন props আর state-এর ওপর
নির্ভর করে। এতে effect-গুলো বোঝা কঠিন হয়, সহজ নয়। আলাদা করুন যখন *logic* সত্যিই বারবার ব্যবহার হয় বা নিজে
সম্পূর্ণ, যেমন একটি subscription, একটি synchronisation বা একটি state machine। শুধু দুটি component ঘটনাচক্রে একই
তিনটি hook call করে বলে আলাদা করবেন না।

## এরপর কী পড়বেন

- [Chapter ?? — `useEffect`, আর কখন এটা ব্যবহার করবেন না](#ch-when-not-to-use-effect) — এই অধ্যায়ের mechanism যে বিচারবুদ্ধি সম্ভব করে
- [Chapter ?? — React-এর Mental Model](#ch-react-mental-model) — call order আদৌ কেন কাজ করে
- [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) — state, ref আর custom hook-এর return-এর type দেওয়া
