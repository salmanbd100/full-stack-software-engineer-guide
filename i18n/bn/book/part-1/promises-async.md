---
sourceHash: "8868d3f1347e396c7d5fa4dda9b88f9d9fcb05005c7079fcafa3d1f37d014884"
title: "Promise, Async/Await ও Error"
translatedAt: "2026-10-13T11:54:24.594Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Promise, Async/Await ও Error {#ch-promises-async}

> Async কাজ nesting ছাড়াই জোড়া লাগান, আর failure-এর পথটাকে success-এর পথের মতোই ভেবেচিন্তে সামলান।

**এই অধ্যায়ে:** promise-এর state আর chaining · `async`/`await` · `all`, `allSettled`, `race` আর `any` · throw করবেন, নাকি typed result return করবেন · custom error আর unhandled rejection

## 💡 মূল ধারণা

Promise হলো এমন একটি value-র পাত্র, যেটা এখনো তৈরি হয়নি। এর তিনটি state: pending, fulfilled আর rejected। একবার settle
হয়ে গেলে এটা **আর বদলায় না**। `async`/`await` নতুন কোনো ক্ষমতা আনে না। এটা শুধু promise-এর code সাধারণ statement-এর
মতো লিখতে দেয়, আর failure-এর পথের জন্য দেয় `try`/`catch`।

আসল design-টা থাকে failure-এর পথেই। **প্রত্যাশিত** failure, যেমন form-এর খালি field বা খুঁজে না পাওয়া record, function-এর
চুক্তিরই অংশ। এটা type-এর ভেতরে return করুন। **ব্যতিক্রমী** failure, যেমন database-এর সঙ্গে যোগাযোগ হারানো বা ভেঙে
যাওয়া invariant, throw করা উচিত। খারাপ error handling-এর বেশিরভাগই একটিকে অন্যটা ভেবে সামলায়।

## কীভাবে কাজ করে

```text
pending ──resolve(value)──> fulfilled  (settled, immutable)
   │
   └─────reject(reason)───> rejected   (settled, immutable)
```

Promise **eager**। আপনি `new Promise` call করার সঙ্গে সঙ্গেই executor চলে, handler জোড়ার সময় নয়। কেউ শুনুক বা না শুনুক,
promise বানানো মানেই কাজ শুরু।

### Chaining সব সমান করে দেয়

প্রতিটি `.then` একটি **নতুন** promise return করে। Handler কোনো promise return করলে chain সেটাকে ভেতরে বসিয়ে না রেখে
নিজের করে নেয়। এভাবে callback-এর পিরামিড একটি সমান তালিকা হয়ে যায়। আগের যেকোনো ধাপের rejection শেষের একটি `.catch`-ই
সামলে নেয়।

```typescript
fetchUser(1)
  .then((user: User): Promise<Post[]> => fetchPosts(user.id)) // adopted, not nested
  .then((posts: Post[]): Post => posts[0]) // a plain value is wrapped for you
  .catch((error: unknown): void => console.error(error)) // covers every step above
  .finally((): void => console.log('cleanup'));
```

### `async` আর `await`

`async` return value-কে একটি promise-এ মুড়ে দেয়। `await` একটি promise খুলে নেয়, আর **শুধু সেই function-টাকেই** থামিয়ে
রাখে। Event loop বাকি সবকিছু চালাতে থাকে। `finally` বেরোনোর প্রতিটি পথেই চলে, তাই পরিষ্কারের কাজ রাখার জায়গা এটাই।

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

| Combinator           | কখন settle হয়              | কোনোটা reject হলে                  | কিসের জন্য                            |
| -------------------- | ------------------------- | ------------------------------- | ---------------------------------- |
| `Promise.all`        | সবগুলো fulfil হলে                | সঙ্গে সঙ্গে reject (fail-fast) | আলাদা আলাদা কাজ, যার সবগুলোই দরকার   |
| `Promise.allSettled` | সবগুলো settle হলে                | প্রতিটির আলাদা হিসাব দেয়            | যেখানে আংশিক failure চলে |
| `Promise.race`       | প্রথম যেটা **settle** হয়   | সেটা reject হলে reject           | Timeout                           |
| `Promise.any`        | প্রথম যেটা **fulfil** হয়   | সবগুলো reject হলে তবেই reject      | কয়েকটি mirror-এর মধ্যে fallback            |

```typescript
// `all` keeps tuple types, so destructuring is fully typed
const [user, posts] = await Promise.all([fetchUser(1), fetchPosts(1)]);

// `allSettled` returns a discriminated union — `status` narrows it
for (const result of await Promise.allSettled([fetchUser(1), fetchPosts(1)])) {
  if (result.status === 'fulfilled') console.log(result.value);
  else console.error(result.reason);
}
```

`race` হেরে যাওয়াটাকে cancel করে না। যে request সত্যিই থামাতে হবে, তাতে একটি signal পাঠান।
`AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)])` এক লাইনেই caller-এর cancel আর একটি deadline
একসঙ্গে জুড়ে দেয়।

### Throw করবেন, নাকি typed result return করবেন

| উপায়              | কোথায় মানায়                                  | দাম                                              |
| --------------------- | -------------------------------------- | ------------------------------------------------- |
| `throw` / reject      | ভেঙে যাওয়া invariant, যে state থেকে ফেরা যায় না | Signature দেখে বোঝা যায় না, catch করতে ভুলে যাওয়া সহজ |
| Typed result return | যে failure caller-কে সামলাতেই হবে        | প্রতিটি call site-কে check করতে হয়                    |

**Typed result থাকলে প্রত্যাশিত failure উপেক্ষা করার উপায়ই থাকে না:**

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

`.ok` check করলে union narrow হয়ে যায়, তাই failure-এর branch-এ `.data` পড়তে গেলে compile-ই হবে না।

### Custom error, আর আসল কারণটা ধরে রাখা

Custom class থাকলে caller "input ভুল ছিল" আর "network বন্ধ ছিল" আলাদা করে চিনতে পারে। Message-এর string মিলিয়ে দেখতে
হয় না। আরও ভালো message দিয়ে আবার throw করার সময় `cause` (ES2022) মূল error-টা ধরে রাখে।

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
method যোগ করুন, নইলে আপনার log-এ কিছুই লেখা থাকবে না।

### Unhandled rejection

`await`-এর চারপাশে `try`/`catch` থাকলে rejection-টা synchronous throw-এর মতোই ধরা পড়ে। কিন্তু যে promise আপনি কখনো
await করেননি, তার rejection এটা ধরে **না**। সেটা হয়ে যায় **unhandled rejection**। Browser এটা জানায়
`window.onunhandledrejection` দিয়ে। Node.js একটি process event তোলে, আর default-ভাবে process-টাই crash করায়। দুটিকেই
আপনার monitoring-এর সঙ্গে জুড়ে দিন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                      | কী ব্যবহার করবেন                         | কেন                                               |
| --------------------------------------------- | --------------------------------- | ------------------------------------------------- |
| প্রতিটি ধাপে আগের ধাপের result লাগে    | পরপর `await`                | নির্ভরতাটা সত্যিকারের                            |
| আলাদা আলাদা request, সবগুলোই দরকার            | `Promise.all`                     | মোট সময় হয় সবচেয়ে ধীরটার সমান, যোগফল নয়            |
| Dashboard-এর panel, যেগুলো আলাদাভাবে fail করতে পারে  | `Promise.allSettled`              | একটি endpoint বসে গেলে পুরো পাতা ফাঁকা হওয়া উচিত নয়       |
| শয়ে শয়ে URL                              | নির্দিষ্ট batch-এ ভাগ করে `Promise.all`  | একটি একটি করে না চালিয়েও concurrency সীমার মধ্যে রাখে           |
| Boundary-তে ভুল user input              | Typed result                    | প্রত্যাশিত। Caller-কে একটি message দেখাতেই হবে        |
| Code-এর গভীরে ভেঙে যাওয়া invariant           | `throw`                           | ওখানে বসে সামলানোর কোনো যুক্তিসঙ্গত উপায় নেই                        |

## সাধারণ ভুল

**❌ আলাদা আলাদা কাজ একটির পর একটি await করা।** এক সেকেন্ডের তিনটি request-এ লাগে তিন সেকেন্ড:

```typescript
const user = await fetchUser(); // 1s
const posts = await fetchPosts(); // then 1s
```

**✅ সবগুলো একসঙ্গে শুরু করুন, তারপর একবার await করুন:**

```typescript
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);
```

**❌ Catch করে কিছুই return না করা।** যে `catch` শুধু log করে এগিয়ে যায়, সে caller-কে বলে কাজটা সফল হয়েছে। হয় পুরোপুরি
সামলে নিন, নয় failure-টাকে এমন value বানান যা signature-এ ঘোষণা করা আছে, নয়তো আবার throw করুন।

**❌ ধরে নেওয়া যে HTTP error হলে `fetch` reject করবে।** এটা reject করে শুধু network failure-এ। `response.ok`
নিজে check করুন, নইলে 500-এর body-ই আপনার data হয়ে যাবে।

**❌ String দিয়ে throw বা reject করা।** এতে stack trace থাকে না, আর প্রতিটি catch-এ `error instanceof Error` ভেঙে যায়।
একটি `Error` throw করুন।

> ⚠️ নিশ্চিত না হলে `finally`-এর ভেতরে কখনো `await` করবেন না, কারণ সেটা reject হতে পারে। `finally` থেকে throw হলে মূল
> error-টা চাপা পড়ে যায়, আর যে failure জানাতে চাইছিলেন সেটাই হারিয়ে ফেলেন।

## 🔑 মূল শিক্ষা

- Promise একবারই settle হয়, তারপর আর বদলায় না। Promise বানানোর সঙ্গে সঙ্গেই executor চলে।
- `.then` সবসময় নতুন promise return করে, আর `await` শুধু নিজের function-টাকে থামায়, event loop-কে কখনো নয়।
- `Promise.all` fail-fast। `allSettled` প্রতিটি ফলাফল জানায়। `race` হেরে যাওয়াটাকে cancel করে না।
- ভাঙা invariant-এর জন্য throw করুন। প্রত্যাশিত failure return type-এ রাখুন, যাতে caller এড়িয়ে যেতে না পারে।
- যে promise await করেন না, সে চারপাশের `try` থেকে ফসকে যায়, আর unhandled rejection হয়ে দাঁড়ায়।

## Interview-এর প্রশ্ন

**Q: `Promise.all` আর `Promise.allSettled`-এর পার্থক্য কী?**

কোনো একটি input reject হলেই `all` সঙ্গে সঙ্গে reject করে, আর যেগুলো সফল হয়েছিল সেগুলোর result ফেলে দেয়। যখন হয়
সবগুলো result চাই, নয়তো একটিও না, তখন এটা ব্যবহার করুন। `allSettled` কখনো reject করে না। প্রতিটি input-এর জন্য একটি
status record দিয়ে resolve হয়। আলাদা আলাদা কাজ, যেখানে আংশিক সাফল্যও কাজের, যেমন dashboard, তার জন্য এটাই মানায়।

**Q: কখন error throw না করে return করবেন?**

যখন failure-টা একটি প্রত্যাশিত ফলাফল, যেটা caller-কে সামলাতেই হবে। যেমন ভুল input, খুঁজে না পাওয়া record, বা
প্রত্যাখ্যাত payment। Return type থাকলে failure-টা signature-এই দেখা যায়, আর compiler সেটা check করে। Throw মানায়
সত্যিকারের ব্যতিক্রমী ক্ষেত্রে, যেখানে প্রতিটি call site-এ check বসানো শুধু হট্টগোল বাড়াবে।

**Q: `catch (e) { console.error(e); }` সাধারণত কেন একটি bug?**

এটা failure-কে চুপচাপ success বানিয়ে দেয়। Caller যেখানে একটি value আশা করছিল, সেখানে পায় `undefined`, আর আসল লক্ষণ
দেখা দেয় একেবারে অন্য কোথাও। Catch block-এর কাজ হলো হয় সামলে নেওয়া, নয় অন্য রূপে বদলে দেওয়া, নয়তো আবার throw করা।

**Q: কখন ইচ্ছে করেই `Promise.all` বাদ দিয়ে loop-এর ভেতরে await করবেন?**

যখন প্রতিটি ধাপ আগেরটার ওপর নির্ভর করে, বা অন্য পাশের server rate-limit করে। Side effect-এর ক্রম জরুরি হলেও একই কাজ
করুন। List এত বড় যে একসঙ্গে হাজার হাজার socket খুলে যাবে, তখনও এটা কাজে দেয়। মাঝামাঝি পথ হলো batch করা।

## এরপর কী পড়বেন

- [Chapter ?? — Event Loop](#ch-event-loop) — settle হওয়া promise কেন `setTimeout`-এর আগে আবার চলে
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — খারাপ input error হয়ে ওঠার আগেই আটকানো
- [Chapter ?? — Monitoring ও Observability-র মূল কথা](#ch-monitoring-fundamentals) — log করা error নিয়ে এরপর কী করবেন
