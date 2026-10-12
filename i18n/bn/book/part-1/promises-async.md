---
sourceHash: "8868d3f1347e396c7d5fa4dda9b88f9d9fcb05005c7079fcafa3d1f37d014884"
title: "Promise, Async/Await ও Error"
translatedAt: "2026-10-12T07:46:05.034Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Promise, Async/Await ও Error {#ch-promises-async}

> Asynchronous কাজ nest না করে জুড়ুন। আর failure path-কে success path-এর মতোই ভেবেচিন্তে handle করুন।

**এই অধ্যায়ে:** promise-এর state ও chaining · `async`/`await` · `all`, `allSettled`, `race` ও `any` · throw করবেন, নাকি typed result return করবেন · custom error ও unhandled rejection

## 💡 মূল ধারণা

Promise হলো এমন একটি মানের পাত্র, যা এখনো তৈরি হয়নি। এর তিনটি state: pending, fulfilled আর rejected। একবার
settle হলে এটা **immutable**। `async`/`await` নতুন কোনো ক্ষমতা যোগ করে না। এটা promise-এর code-কে সাধারণ
statement হিসেবে লিখতে দেয়, আর failure path-এর জন্য দেয় `try`/`catch`।

আসল design-টা থাকে failure path-এ। একটি **প্রত্যাশিত** failure, যেমন একটি খালি form field বা না-পাওয়া record,
function-এর contract-এরই অংশ। এটা type-এর মধ্যে return করুন। একটি **ব্যতিক্রমী** failure, যেমন database হারিয়ে
যাওয়া বা কোনো invariant ভেঙে যাওয়া, throw করা উচিত। বেশিরভাগ খারাপ error handling এর একটিকে অন্যটি ভেবে ভুল
করে।

## কীভাবে কাজ করে

```text
pending ──resolve(value)──> fulfilled  (settled, immutable)
   │
   └─────reject(reason)───> rejected   (settled, immutable)
```

Promise **eager**। আপনি `new Promise` call করার মুহূর্তেই executor চলে, handler জোড়ার সময় নয়। কেউ শুনুক বা না
শুনুক, promise তৈরি করলেই কাজ শুরু হয়ে যায়।

### Chaining সমতল করে

প্রতিটি `.then` একটি **নতুন** promise return করে। কোনো handler একটি promise return করলে chain সেটাকে nest না করে
নিজের করে নেয়। এভাবে callback-এর পিরামিড একটি সমতল তালিকা হয়ে যায়। শেষে একটি `.catch` আগের যেকোনো ধাপের
rejection handle করে।

```typescript
fetchUser(1)
  .then((user: User): Promise<Post[]> => fetchPosts(user.id)) // adopted, not nested
  .then((posts: Post[]): Post => posts[0]) // a plain value is wrapped for you
  .catch((error: unknown): void => console.error(error)) // covers every step above
  .finally((): void => console.log('cleanup'));
```

### `async` আর `await`

`async` return value-কে একটি promise-এ মুড়ে দেয়। `await` একটি promise খোলে, আর **শুধু সেই function-টিকেই**
থামিয়ে রাখে। Event loop বাকি সবকিছু চালাতে থাকে। `finally` প্রতিটি exit path-এ চলে, তাই cleanup-এর জায়গা এটাই।

```typescript
async function saveRecord(record: Draft): Promise<Saved | null> {
  try {
    return await save(record);
  } catch (error: unknown) {
    // `unknown` is correct — a `throw` can carry any value
    if (error instanceof ValidationError) return null; // expected: handled here
    throw error; // not ours to handle
  } finally {
    setSaving(false); // runs on all three paths above
  }
}
```

### Combinator

| Combinator           | কখন settle হয়              | Rejection হলে                      | কীসের জন্য                               |
| -------------------- | ------------------------- | ---------------------------------- | -------------------------------------- |
| `Promise.all`        | সবগুলো fulfil হলে          | সঙ্গে সঙ্গে reject করে (fail-fast)    | স্বাধীন কাজ, যার সবগুলোই আপনার দরকার      |
| `Promise.allSettled` | সবগুলো settle হলে          | প্রতিটি entry-তে আলাদা করে জানায়      | এমন কাজ, যেখানে আংশিক failure চলে        |
| `Promise.race`       | প্রথমটি **settle** হলে      | সেটা reject হলে reject করে           | Timeout                                |
| `Promise.any`        | প্রথমটি **fulfil** হলে      | সবগুলো reject হলেই কেবল reject করে   | একাধিক mirror-এর মধ্যে fallback          |

```typescript
// `all` keeps tuple types, so destructuring is fully typed
const [user, posts] = await Promise.all([fetchUser(1), fetchPosts(1)]);

// `allSettled` returns a discriminated union — `status` narrows it
for (const result of await Promise.allSettled([fetchUser(1), fetchPosts(1)])) {
  if (result.status === 'fulfilled') console.log(result.value);
  else console.error(result.reason);
}
```

`race` হেরে যাওয়াটিকে cancel করে না। যে request-কে সত্যিই থামাতে হবে, তাতে একটি signal দিন।
`AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)])` এক লাইনেই caller-এর cancellation আর একটি
deadline জুড়ে দেয়।

### Throw করবেন, নাকি typed result return করবেন

| পদ্ধতি                  | কোথায় মানায়                              | খরচ                                                    |
| --------------------- | -------------------------------------- | ------------------------------------------------------ |
| `throw` / reject      | ভাঙা invariant, যে state থেকে ফেরা যায় না | Signature-এ দেখা যায় না। Catch করতে ভুলে যাওয়া সহজ      |
| Typed result return   | যে failure caller-কে handle করতেই হবে     | প্রতিটি call site-কে check করতে হয়                       |

**একটি typed result প্রত্যাশিত failure-কে উপেক্ষা করা অসম্ভব করে তোলে:**

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response: Response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`); // fetch does not reject on a 500
    return { ok: true, data: (await response.json()) as T };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
```

`.ok` check করলে union narrow হয়। তাই failure branch-এ `.data` পড়লে compile হবে না।

### Custom error, আর cause ধরে রাখা

একটি custom class দিয়ে caller "input ভুল ছিল" আর "network বন্ধ ছিল" আলাদা করতে পারে। তখন আর message string
মেলাতে হয় না। আরও ভালো message দিয়ে আবার throw করার সময় `cause` (ES2022) আসল error-টা ধরে রাখে।

```typescript
class APIError extends Error {
  constructor(message: string, readonly statusCode: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'APIError';
  }
}

try {
  await saveOrder(order);
} catch (err: unknown) {
  throw new APIError(`Could not save order ${order.id}`, 500, { cause: err }); // the stack survives
}
```

`JSON.stringify(new Error('x'))` দেয় `'{}'`, কারণ `name`, `message` আর `stack` enumerable নয়। একটি `toJSON`
method যোগ করুন, নইলে আপনার log-এ কিছুই রেকর্ড হবে না।

### Unhandled rejection

একটি `await`-এর চারপাশের `try`/`catch` একটি rejection-কে synchronous throw-এর মতোই ধরে। কিন্তু যে promise আপনি
কখনো await করেননি, তার rejection এটা ধরে **না**। সেই rejection একটি **unhandled rejection** হয়ে যায়। Browser
এটা `window.onunhandledrejection`-এর মাধ্যমে জানায়। Node.js একটি process event তোলে, আর default-ভাবে process-টি
crash করে। দুটোকেই আপনার monitoring-এর সঙ্গে জুড়ে দিন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                       | কী বেছে নেবেন                      | কেন                                                  |
| ---------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| এমন ধাপ, যার প্রতিটির আগেরটার ফল দরকার            | ক্রমানুসারে `await`                 | Dependency-টা আসল                                    |
| স্বাধীন request, সবগুলোই দরকার                   | `Promise.all`                     | মোট সময় হয় সবচেয়ে ধীরটার সমান, যোগফল নয়              |
| Dashboard-এর panel, যা আলাদাভাবে fail করতে পারে  | `Promise.allSettled`              | একটি মৃত endpoint-এর জন্য পুরো page ফাঁকা হওয়া উচিত নয় |
| শত শত URL                                      | নির্দিষ্ট batch-এর ওপর `Promise.all` | Serial না হয়েই concurrency সীমিত রাখে                  |
| Boundary-তে অবৈধ user input                    | একটি typed result                 | প্রত্যাশিত। Caller-কে একটি message দেখাতে হবে           |
| Code-এর গভীরে একটি ভাঙা invariant                | `throw`                           | স্থানীয়ভাবে ঠিক করার কোনো যুক্তিসঙ্গত উপায় নেই            |

## সাধারণ ভুল

**❌ স্বাধীন কাজ একটার পর একটা await করা।** এক সেকেন্ডের তিনটি request তিন সেকেন্ড নেয়:

```typescript
const user = await fetchUser(); // 1s
const posts = await fetchPosts(); // then 1s
```

**✅ সবগুলো শুরু করুন, তারপর একবার await করুন:**

```typescript
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);
```

**❌ Catch করে কিছুই return না করা।** যে `catch` শুধু log করে এগিয়ে যায়, সেটা caller-কে বলে কাজটা সফল হয়েছে।
হয় পুরোপুরি সামলে নিন, নয় failure-কে এমন একটি মানে বদলান যা signature-এ ঘোষিত, নয়তো আবার throw করুন।

**❌ HTTP error-এ `fetch` reject করবে বলে ভরসা করা।** এটা শুধু network failure-এ reject করে। `response.ok`
নিজে check করুন, নইলে একটি 500-এর body আপনার data হয়ে যাবে।

**❌ String দিয়ে throw বা reject করা।** এতে কোনো stack trace থাকে না, আর প্রতিটি catch site-এ
`error instanceof Error` ভেঙে যায়। একটি `Error` throw করুন।

> ⚠️ `finally`-এর ভেতরে কখনো `await` করবেন না, যদি না নিশ্চিত হন যে সেটা reject করতে পারে না। `finally` থেকে একটি
> throw আসল error-টাকে সরিয়ে দেয়, আর যে failure আপনি জানাতে চাইছিলেন, সেটাই হারিয়ে যায়।

## 🔑 মূল শিক্ষা

- একটি promise একবারই settle হয়, তারপর immutable। তৈরির সঙ্গে সঙ্গেই executor eager-ভাবে চলে।
- `.then` সবসময় একটি নতুন promise return করে, আর `await` শুধু নিজের function-কে থামায়, কখনো event loop-কে নয়।
- `Promise.all` fail-fast। `allSettled` প্রতিটি ফল জানায়। `race` হেরে যাওয়াটিকে cancel করে না।
- ভাঙা invariant-এর জন্য throw করুন। আর প্রত্যাশিত failure return type-এ রাখুন, যাতে caller সেটা এড়িয়ে যেতে না পারে।
- যে promise আপনি await করেন না, সেটা চারপাশের `try` থেকে বেরিয়ে যায় আর unhandled rejection হয়ে যায়।

## Interview-এর প্রশ্ন

**Q: `Promise.all` আর `Promise.allSettled`-এর মধ্যে পার্থক্য কী?**

যেকোনো input reject করলেই `all` সঙ্গে সঙ্গে reject করে, আর যেগুলো সফল হয়েছিল সেগুলোর ফলও ফেলে দেয়। যখন আপনার
হয় সব ফল চাই, নয় একটাও না, তখন এটা ব্যবহার করুন। `allSettled` কখনো reject করে না। এটা প্রতিটি input-এর জন্য একটি
status record দিয়ে resolve হয়। এটা সেই স্বাধীন কাজের জন্য মানায়, যেখানে আংশিক সাফল্যও কাজে লাগে, যেমন একটি
dashboard।

**Q: কখন আপনি error throw না করে return করবেন?**

যখন failure একটি প্রত্যাশিত ফল, যা caller-কে handle করতেই হবে। উদাহরণ: অবৈধ input, না-পাওয়া record, বা
প্রত্যাখ্যাত payment। Return type failure-টাকে signature-এ দৃশ্যমান করে, আর compiler সেটা check করে। Throw করা
মানায় সত্যিকারের ব্যতিক্রমী ক্ষেত্রে, যেখানে প্রতিটি call site-এ check করা শুধুই বাড়তি ঝামেলা।

**Q: `catch (e) { console.error(e); }` সাধারণত একটি bug কেন?**

এটা একটি failure-কে নীরব সাফল্যে বদলে দেয়। Caller যেখানে একটি মান আশা করেছিল, সেখানে পায় `undefined`, আর আসল
লক্ষণ দেখা দেয় সম্পর্কহীন কোনো জায়গায়। একটি catch block-এর কাজ হলো সামলে নেওয়া, অনুবাদ করা, বা আবার throw
করা।

**Q: কখন আপনি ইচ্ছে করে `Promise.all` ব্যবহার না করে loop-এর ভেতরে await করবেন?**

যখন প্রতিটি iteration আগেরটার ওপর নির্ভর করে, অথবা অন্য প্রান্ত rate-limit করে। Side effect-এর ক্রম গুরুত্বপূর্ণ
হলেও একই কাজ করুন। তালিকাটা এত বড় হলে যে একসঙ্গে হাজার হাজার socket খুলে যাবে, তখনও এটা কাজে আসে। Batching
হলো মাঝামাঝি পথ।

## এরপর কী পড়বেন

- [Chapter ?? — Event Loop](#ch-event-loop) — একটি settled promise কেন একটি `setTimeout`-এর আগে আবার চালু হয়
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — খারাপ input error হয়ে ওঠার আগেই থামানো
- [Chapter ?? — Monitoring ও Observability-র মূল কথা](#ch-monitoring-fundamentals) — যে error-গুলো log করেন, সেগুলো দিয়ে কী করবেন
