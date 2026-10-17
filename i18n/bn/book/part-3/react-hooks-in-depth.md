---
sourceHash: "358a5e24ec082ac75de3f44a0fcd8c33dc0c4311ee38db97e3e8ddd6e54384a8"
title: "Hook-এর গভীরে"
translatedAt: "2026-10-17T01:10:39.274Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Hook-এর গভীরে {#ch-react-hooks-in-depth}

> Hook-এর নিয়মগুলো কেন আছে তা ব্যাখ্যা করুন, ঠিকমতো cleanup করে এমন effect লিখুন, আর ship হওয়ার আগেই stale closure ধরে ফেলুন।

**এই অধ্যায়ে:** call-এর ক্রমই কেন নিয়ম · `useState` বনাম `useRef` · sync করার উপায় হিসেবে effect · stale closure · যে custom hook আলাদা করার মতো

## 💡 মূল ধারণা

Hook একটি component instance-এর সঙ্গে কিছু একটা জুড়ে দেয়: একটি value, একটি subscription, এক টুকরো কাজ। Component function নিজে
কোনো state রাখে না, প্রতিটি render-এ ওপর থেকে নিচ পর্যন্ত চলে। State থাকে এর বাইরে, React-এর রাখা একটি list-এ। **আপনার hook call-গুলো
React সেই list-এর সঙ্গে মেলায় call-এর ক্রম দেখে।**

Hook-এর যা কিছু অদ্ভুত, সবই আসে implementation-এর এই একটি খুঁটিনাটি থেকে। কোনো নাম নেই, কোনো key নেই। আছে শুধু "এই component
যে তৃতীয় hook call করেছে"। Render-এর মাঝে ক্রম বদলালে তৃতীয় call পেয়ে যায় দ্বিতীয় call-এর state।

> এজন্যই নিয়মগুলো style-এর পরামর্শ নয়। `if`-এর ভেতরে `useState` শুধু দেখতে খারাপ নয়। এটা একটি use-after-free bug, যা কোনো branch
> উল্টে যাওয়ার অপেক্ষায় বসে আছে।

## কীভাবে কাজ করে

### নিয়মগুলো, আর একমাত্র ব্যতিক্রম

| নিয়ম | না মানলে কী ভাঙে |
| ---- | --------------- |
| Hook call করুন একদম ওপরের level-এ, কখনো branch, loop বা আগেভাগে return-এর ভেতরে নয় | Call-এর ক্রম সরে যায়, আর state পড়া হয় ভুল slot থেকে |
| Hook call করুন শুধু component বা অন্য hook থেকে | State জুড়ে দেওয়ার মতো কোনো instance React-এর কাছে থাকে না |
| Custom hook-এর নাম দিন `useSomething` | Linter আর React Compiler দুটিই এর ওপর নির্ভর করে |

React 19 ইচ্ছে করে একটি ব্যতিক্রম যোগ করেছে: **`use` শর্তসাপেক্ষে call করা যায়।** এটা একটি promise বা একটি context পড়ে। `if` বা loop-এর
ভেতরেও থাকতে পারে, কারণ এর নিজের কোনো state slot নেই। বাকি প্রতিটি hook এখনো ওপরের নিয়ম মানে।

### `useState` বনাম `useRef`

দুটিই re-render পেরিয়ে টিকে থাকে। কিন্তু render ঘটায় শুধু একটি।

| দরকার | ব্যবহার করুন | কেন |
| ----- | ----------- | --- |
| এমন value, যা UI দেখায় | `useState` | বদলালে screen আবার আঁকতেই হবে |
| Focus, মাপজোখ বা play করার জন্য একটি DOM node | `useRef` | এটা render-এর output নয়, আর বদলালে render হওয়া চলবে না |
| Timer id, আগের value, scroll offset | `useRef` | ক্ষণস্থায়ী হিসাবনিকাশ, যা UI কখনো সরাসরি পড়ে না |
| দামি একটি শুরুর value | `useState(() => build())` | Lazy রূপে builder একবারই চলে, প্রতিটি render-এ নয় |

Lazy initialiser সহজেই চোখ এড়িয়ে যায়। `useState(buildIndex(rows))` **প্রতিটি** render-এ `buildIndex` call করে, আর প্রথমটার পরে
result ফেলে দেয়। `useState(() => buildIndex(rows))` call করে একবারই।

**এমন value-র জন্য ref, যা render করার পক্ষে খুব ঘন ঘন বদলায়:**

```tsx
const lastScrollY = useRef<number>(0);

function handleScroll(event: UIEvent<HTMLDivElement>): void {
  // Sixty writes a second, zero re-renders.
  lastScrollY.current = event.currentTarget.scrollTop;
}
```

> ⚠️ Render-এর সময় কখনো `ref.current` পড়বেন না বা লিখবেন না। Render কখন চলবে, বা result রাখা হবে কি না, তা নিয়ে React কোনো কথা দেয়
> না। Event handler বা effect-এর ভেতরে পড়ুন।

### Effect sync করে; এগুলো lifecycle hook নয়

`useEffect`-কে বোঝার কাজের উপায় হলো: *বাইরের এই জিনিসটাকে এই state-এর সঙ্গে মিলিয়ে রাখো।* "Mount হলে চালাও" নয়। Dependency array
এমন trigger-এর তালিকা নয়, যা warning না যাওয়া পর্যন্ত ঘষামাজা করবেন। এটা সেই value-গুলোর তালিকা, যা effect ব্যবহার করে। এর যেকোনোটা
আলাদা হলেই React আবার sync করে।

যে effect কিছু শুরু করে, তাকে সেটা থামাতেও পারতে হবে। Cleanup চলে পরের sync-এর আগে, আর আবার unmount-এর সময়।

**Subscribe করুন, আর বেরোনোর পথে unsubscribe করুন:**

```tsx
useEffect(() => {
  const socket: RoomSocket = connect(roomId);
  socket.on("message", onMessage);
  return () => socket.close(); // Runs before the next roomId, and on unmount
}, [roomId, onMessage]);
```

Fetch করতেও একই শৃঙ্খলা লাগে, কারণ response আসে এলোমেলো ক্রমে। পাহারা না থাকলে user 1-এর জন্য পাঠানো ধীর request user 2-এর দ্রুত
request-এর ওপর লিখে দিতে পারে।

**যে response আর দরকার নেই, তা উপেক্ষা করুন:**

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

প্রতিটি render নতুন function বানায়, আর প্রতিটি function *সেই* render-এর value ধরে রাখে। কিছু function তাদের জন্ম দেওয়া render-এর
চেয়ে বেশিদিন বাঁচে, যেমন একটি interval, একটি subscription বা একটি event listener। সেগুলো চিরকাল পুরনো value-ই পড়তে থাকে।

**❌ যে counter এক-এ গিয়ে থেমে যায়:**

```tsx
useEffect(() => {
  const id: number = window.setInterval(() => {
    setCount(count + 1); // `count` is frozen at 0 from the first render
  }, 1000);
  return () => window.clearInterval(id);
}, []); // The empty array is what freezes it
```

**✅ Value-টা একদমই ধরে রাখবেন না:**

```tsx
useEffect(() => {
  const id: number = window.setInterval(() => {
    setCount((c: number) => c + 1); // React supplies the current value
  }, 1000);
  return () => window.clearInterval(id);
}, []);
```

সমাধান দুটি, নীতি একটি। হয় value-টা dependency array-তে রাখুন, যাতে effect নতুন closure নিয়ে আবার চলে। নয়তো value পড়া বন্ধ করে
বদলটা বর্ণনা করুন। Linter-কে চুপ করাতে dependency মুছে দিলে এর কোনোটাই হয় না, শুধু bug-টা লুকিয়ে যায়।

### Custom hook

Custom hook হলো এমন একটি function, যা hook call করে। পুরো কৌশল এটুকুই। কোনো registry নেই, কোনো sharing নেই। দুটি component
`useOnlineStatus()` call করলে দুটি আলাদা, স্বাধীন state পায়।

আলাদা করুন তখন, যখন *logic* বারবার আসে, শুধু code দেখতে একই রকম লাগলে নয়। ভালো custom hook একটি subscription, একটি sync, বা পরস্পর
যুক্ত state বদলের একটি ক্রম লুকিয়ে রাখে। এর নাম বলে দেয় এটা কী করে।

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

Data যখনই React-এর বাইরে থাকে, যেমন browser API, third-party store বা media query, তখন ঠিক tool হলো `useSyncExternalStore`। এটা value
পড়ে render-এর সময়েই, পরে নয়। তাই ভুল state-এর কোনো ঝলক দেখা যায় না, আর React concurrent ভাবে render করলেও tearing হয় না (screen-এর দুই
অংশে দুই রকম value দেখানো)।

## কখন ব্যবহার করবেন

| আপনার দরকার | কী ব্যবহার করবেন | কী নয় |
| ----------- | --------------- | ----- |
| এমন value, যা UI চালায় | `useState` | `useRef` — কিছুই আবার আঁকা হবে না |
| এমন value, যা UI চালাবে না | `useRef` | `useState` — প্রতিটি বদলে একটি render |
| Browser API বা বাইরের store থেকে data | `useSyncExternalStore` | `useEffect` + `useState` |
| এমন constant, যা কখনো props-এর ওপর নির্ভর করে না | Module scope | কোনো hook-ই নয় |
| পরস্পর যুক্ত state, যা একসঙ্গে বদলায় | `useReducer` | হাতে মিলিয়ে রাখা পাঁচটি `useState` |

## সাধারণ ভুল

**❌ Effect যাতে আবার না চলে, তার জন্য dependency array ছেঁটে ফেলা:**

```tsx
useEffect(() => {
  subscribe(roomId, onMessage);
}, []); // roomId and onMessage are used but not declared
```

Effect এখন এমন একটি sync বর্ণনা করছে, যা আসলে হয়ই না। **✅ Effect যত value পড়ে, সবগুলো ঘোষণা করুন**, তারপর অস্থিরগুলোকে স্থির
করুন। Function-টা effect-এর ভেতরে নিয়ে যান, component-এর বাইরে তুলে দিন, অথবা `useCallback` দিয়ে মুড়ে দিন।

**❌ দুটি `useState`, যাদের সবসময় মিলে থাকতে হবে।** একটি বদলে অন্যটি না বদলানো যদি bug হয়, তাহলে দুটি আসলে একটিই state।
**✅ `useReducer` ব্যবহার করুন, অথবা render-এর সময় প্রথমটা থেকে দ্বিতীয়টা বের করে নিন।**

**❌ Effect দিয়ে subscribe করে state-এ copy রাখা।** দুটি render, পুরনো value-র চোখে পড়ার মতো ঝলক, আর প্রতিটি dependency বদলে নতুন করে
subscribe। **✅ `useSyncExternalStore`।**

**❌ এমন custom hook, যা শুধু সম্পর্কহীন call-গুলো এক জায়গায় জড়ো করে।** সম্পর্কহীন চারটি hook মুড়ে রাখা `usePageSetup()` কিছুই
সরল করে না, শুধু dependency-গুলো লুকিয়ে ফেলে। Line নয়, আচরণ আলাদা করুন।

## 🔑 মূল শিক্ষা

- React hook-কে তার state-এর সঙ্গে মেলায় call-এর ক্রম দেখে, তাই hook branch-এর ভেতরে বসতে পারে না — React 19-এ একমাত্র ব্যতিক্রম `use`।
- `useRef` render না ঘটিয়েই render পেরিয়ে একটি value ধরে রাখে; `useState`-এর কাজই render ঘটানো।
- Dependency array-তে থাকে effect যা পড়ে; যে effect কিছু শুরু করে, তাকে সেটা থামানোর cleanup-ও return করতে হবে।
- Stale closure মানে এমন একটি function, যা যে render-এর value ধরেছিল তার চেয়ে বেশিদিন বাঁচে — নতুন dependency বা updater function দিয়ে ঠিক করুন।
- React-এর বাইরে থাকা data-র জায়গা `useSyncExternalStore`, state-এ copy করা কোনো effect নয়।

## Interview-এর প্রশ্ন

**Q: Hook কেন শর্তসাপেক্ষে call করা যায় না?**

React প্রতিটি component instance-এর জন্য hook-এর state রাখে একটি list-এ। Hook call-এর কোনো নাম বা key নেই, তাই React call আর entry
মেলায় ক্রম দেখে। শর্তসাপেক্ষ একটি call পরের প্রতিটি hook-কে এক slot করে সরিয়ে দেয়, ফলে একটি `useState` অন্য hook-এর value পড়ে ফেলে।
React 19-এর `use` এর আওতার বাইরে, কারণ এর কোনো slot নেই। এটা একটি promise বা context পড়ে, কিছুই জমা রাখে না।

**Q: এই `setInterval` counter-কে 1 পর্যন্ত বাড়িয়ে থেমে যায়। ভুলটা কোথায়?**

Callback-টা `count` ধরে রেখেছে সেই render থেকে, যে render-এ effect চলেছিল। ফাঁকা dependency array মানে effect আর কখনো চলে না। ফলে
সেই closure চিরকাল বেঁচে থাকে, আর `count` আটকে থাকে প্রথম value-তে। সমাধান হলো `setCount`-এ একটি updater function দেওয়া। তাতে ধরে
রাখা value-র ওপর নির্ভরতা চলে যায়, আর প্রতি second-এ interval ভেঙে আবার বানাতেও হয় না।

**Q: বদলায় এমন value-র জন্য কখন `useState`-এর বদলে `useRef` বেছে নেবেন?**

যখন render-এর সময় UI সেটা পড়ে না। যেমন প্রতিটি pointer move-এ update হওয়া drag offset, একটি timer id, বা কোনো prop-এর আগের value।
এগুলো সবই ক্ষণস্থায়ী হিসাবনিকাশ। এগুলো state-এ রাখলে প্রতিটি বদলে একটি render হয়, এমন output-এর জন্য যা কেউ দেখে না। যাচাইটা সহজ:
JSX থেকে value-টা সরালে যদি screen-এ কিছুই না বদলায়, তাহলে এর জায়গা state-এ নয়।

**Q: কখন custom hook আলাদা করা ভুল সিদ্ধান্ত?**

যখন এটা শুধু line সরায়। সম্পর্কহীন চারটি call মুড়ে রাখা hook লুকিয়ে ফেলে component কোন props আর state-এর ওপর নির্ভর করে। তাতে
effect নিয়ে ভাবা সহজ হয় না, কঠিন হয়। আলাদা করুন তখন, যখন *logic* সত্যিই বারবার ব্যবহার হয় বা নিজে সম্পূর্ণ, যেমন একটি subscription,
একটি sync বা একটি state machine। শুধু দুটি component ঘটনাচক্রে একই তিনটি hook call করে বলে আলাদা করবেন না।

## এরপর কী পড়বেন

- [Chapter ?? — `useEffect` and When Not to Use It](#ch-when-not-to-use-effect) — এই অধ্যায়ের কৌশল যে বিচারবুদ্ধির সুযোগ দেয়
- [Chapter ?? — React-এর Mental Model](#ch-react-mental-model) — call-এর ক্রম আদৌ কেন কাজ করে
- [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) — state, ref আর custom hook-এর return-এর type দেওয়া
