---
sourceHash: "8868d3f1347e396c7d5fa4dda9b88f9d9fcb05005c7079fcafa3d1f37d014884"
title: "Promise, Async/Await ও Error"
translatedAt: "2026-10-13T12:12:35.634Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Promise, Async/Await ও Error {#ch-promises-async}

> Asynchronous কাজ nest না করে জোড়া লাগান, আর ব্যর্থতার পথটাও সাফল্যের পথের মতোই ভেবেচিন্তে সামলান।

**এই অধ্যায়ে:** promise-এর state আর chaining · `async`/`await` · `all`, `allSettled`, `race` আর `any` · throw করবেন, নাকি typed result return করবেন · custom error আর unhandled rejection

## 💡 মূল ধারণা

Promise হলো এমন একটি value-এর পাত্র, যা এখনো তৈরি হয়নি। এর তিনটি state: pending, fulfilled আর rejected। একবার
settle হয়ে গেলে এটা **আর বদলায় না**। `async`/`await` নতুন কোনো ক্ষমতা যোগ করে না। এটা শুধু promise-এর code
সাধারণ statement-এর মতো লিখতে দেয়, আর ব্যর্থতার পথের জন্য দেয় `try`/`catch`।

আসল design-টা থাকে ব্যর্থতার পথেই। **প্রত্যাশিত** ব্যর্থতা, যেমন form-এর একটি খালি field বা খুঁজে না পাওয়া record,
function-এর contract-এরই অংশ। সেটা type-এর ভেতর দিয়ে return করুন। **ব্যতিক্রমী** ব্যর্থতা, যেমন database-এর
সংযোগ হারানো বা ভেঙে যাওয়া invariant, throw করা উচিত। বেশিরভাগ খারাপ error handling-এর মূলে আছে একটিকে আরেকটি
ভেবে বসা।

## কীভাবে কাজ করে

```text
pending ──resolve(value)──> fulfilled  (settled, immutable)
   │
   └─────reject(reason)───> rejected   (settled, immutable)
```

Promise **অপেক্ষা করে না**। Handler জোড়ার সময় নয়, `new Promise` call করার মুহূর্তেই executor চলে যায়। কেউ শুনুক
বা না শুনুক, promise তৈরি করলেই কাজ শুরু হয়ে যায়।

### Chaining সব সমান করে দেয়

প্রতিটি `.then` একটি **নতুন** promise return করে। Handler নিজে একটি promise return করলে chain সেটাকে nest না করে
নিজের করে নেয়। ফলে callback-এর পিরামিড হয়ে যায় একটি সমতল তালিকা। শেষে একটি `.catch` থাকলেই আগের যেকোনো ধাপের
rejection ধরা পড়ে।

```typescript
fetchUser(1)
  .then((user: User): Promise<Post[]> => fetchPosts(user.id)) // adopted, not nested
  .then((posts: Post[]): Post => posts[0]) // a plain value is wrapped for you
  .catch((error: unknown): void => console.error(error)) // covers every step above
  .finally((): void => console.log('cleanup'));
```

### `async` আর `await`

`async` return value-কে একটি promise-এ মুড়ে দেয়। `await` একটি promise খুলে value বের করে, আর থামিয়ে রাখে
**শুধু সেই function-টাকে**। বাকি সব কিছু event loop চালিয়ে যায়। `finally` প্রতিটি বেরোনোর পথেই চলে, তাই cleanup-এর
জায়গা এটাই।

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
| `Promise.all`        | সবগুলো fulfil হলে                | সঙ্গে সঙ্গে reject করে (fail-fast) | স্বাধীন কাজ, যার প্রতিটির ফল লাগবে   |
| `Promise.allSettled` | সবগুলো settle হলে                | প্রতিটি entry-তে আলাদা করে জানায়            | যেখানে কিছু ব্যর্থ হলেও চলে |
| `Promise.race`       | প্রথম যেটা **settle** হয়   | সেটা reject হলে reject করে    | Timeout                           |
| `Promise.any`        | প্রথম যেটা **fulfil** হয়   | শুধু সবগুলো reject হলে reject করে      | একাধিক mirror-এর মধ্যে fallback               |

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
`AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)])` এক লাইনেই caller-এর cancellation আর একটি
deadline জুড়ে দেয়।

### Throw করবেন, নাকি typed result return করবেন

| পদ্ধতি              | কোথায় মানায়                                  | দাম                                              |
| --------------------- | -------------------------------------- | ------------------------------------------------- |
| `throw` / reject      | ভাঙা invariant, এমন state যা থেকে ফেরা যায় না | Signature-এ দেখা যায় না; catch করতে ভুলে যাওয়া সহজ |
| Typed result return করা | যে ব্যর্থতা caller-কে সামলাতেই হবে        | প্রতিটি call site-কে check করতে হয়                    |

**Typed result থাকলে প্রত্যাশিত ব্যর্থতা এড়িয়ে যাওয়ার উপায় থাকে না:**

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

`.ok` check করলে union সরু হয়ে আসে, তাই ব্যর্থতার branch-এ `.data` পড়তে গেলে code compile-ই হবে না।

### Custom error, আর মূল কারণটা ধরে রাখা

Custom class থাকলে caller "input ভুল ছিল" আর "network বন্ধ ছিল" আলাদা করতে পারে। তাকে আর message-এর string
মেলাতে হয় না। আরও ভালো message দিয়ে আবার throw করার সময় `cause` (ES2022) মূল error-টা ধরে রাখে।

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
method যোগ করুন, নইলে log-এ কিছুই লেখা হবে না।

### Unhandled rejection

`await`-এর চারপাশের `try`/`catch` rejection-কে synchronous throw-এর মতোই ধরে। কিন্তু যে promise আপনি কখনো await
করেননি, তার rejection এটা **ধরে না**। সেটা হয়ে যায় **unhandled rejection**। Browser সেটা জানায়
`window.onunhandledrejection` দিয়ে। Node.js একটি process event তোলে, আর default অবস্থায় process-টাই crash করে।
দুটিকেই আপনার monitoring-এর সঙ্গে জুড়ে দিন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                      | কী ব্যবহার করবেন                         | কেন                                               |
| --------------------------------------------- | --------------------------------- | ------------------------------------------------- |
| প্রতিটি ধাপের আগের ধাপের ফল লাগে    | পরপর `await`                | নির্ভরতাটা সত্যিই আছে                            |
| স্বাধীন request, সবগুলোই লাগবে            | `Promise.all`                     | মোট সময় হয় সবচেয়ে ধীরটার সমান, সবার যোগফল নয়            |
| Dashboard-এর panel, যেগুলো আলাদা আলাদা ব্যর্থ হতে পারে  | `Promise.allSettled`              | একটি endpoint মরে গেলে পুরো page ফাঁকা হওয়া উচিত নয়       |
| শত শত URL                              | নির্দিষ্ট মাপের batch-এ `Promise.all`  | পুরো serial না হয়েও concurrency সীমার মধ্যে থাকে           |
| Boundary-তে আসা ভুল user input              | Typed result                    | প্রত্যাশিত; caller-কে একটি message দেখাতে হবে        |
| Code-এর গভীরে ভাঙা invariant           | `throw`                           | ওখানে দাঁড়িয়ে সামলানোর কোনো যুক্তিসঙ্গত উপায় নেই                        |

## সাধারণ ভুল

**❌ স্বাধীন কাজ একটার পর একটা await করা।** এক সেকেন্ডের তিনটি request-এ লাগে তিন সেকেন্ড:

```typescript
const user = await fetchUser(); // 1s
const posts = await fetchPosts(); // then 1s
```

**✅ সবগুলো শুরু করে দিন, তারপর একবার await করুন:**

```typescript
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);
```

**❌ Catch করে কিছুই return না করা।** যে `catch` শুধু log করে এগিয়ে যায়, সে caller-কে জানায় কাজটা সফল হয়েছে।
হয় পুরোপুরি সামলে নিন, নয়তো ব্যর্থতাকে এমন value-তে বদলে দিন যা signature-এ ঘোষণা করা আছে, নয়তো আবার throw করুন।

**❌ ধরে নেওয়া যে HTTP error হলে `fetch` reject করবে।** এটা reject করে শুধু network ব্যর্থ হলে।
`response.ok` নিজে check করুন, নইলে 500-এর body-ই আপনার data হয়ে যাবে।

**❌ String দিয়ে throw বা reject করা।** এতে কোনো stack trace থাকে না, আর প্রতিটি catch-এর জায়গায়
`error instanceof Error` ভেঙে যায়। `Error` throw করুন।

> ⚠️ `finally`-এর ভেতরে কখনো `await` করবেন না, যদি না নিশ্চিত হন যে সেটা reject করতে পারে না। `finally` থেকে
> throw হলে সেটা মূল error-কে সরিয়ে তার জায়গা নেয়, আর যে ব্যর্থতাটা জানাতে চাইছিলেন সেটাই হারিয়ে যায়।

## 🔑 মূল শিক্ষা

- Promise একবারই settle হয়, তারপর আর বদলায় না; তৈরি হওয়ার মুহূর্তেই executor চলে যায়।
- `.then` সবসময় নতুন promise return করে, আর `await` থামায় শুধু নিজের function-কে, event loop-কে কখনো নয়।
- `Promise.all` fail-fast; `allSettled` প্রতিটি ফল জানায়; `race` হেরে যাওয়াটাকে cancel করে না।
- ভাঙা invariant-এ throw করুন, আর প্রত্যাশিত ব্যর্থতা রাখুন return type-এ, যাতে caller সেটা এড়াতে না পারে।
- যে promise await করেন না, সেটা চারপাশের `try` থেকে বেরিয়ে যায় আর unhandled rejection হয়ে দাঁড়ায়।

## Interview-এর প্রশ্ন

**Q: `Promise.all` আর `Promise.allSettled`-এর পার্থক্য কী?**

কোনো একটি input reject করলেই `all` reject করে, আর যেগুলো সফল হয়েছিল তাদের ফলও ফেলে দেয়। যখন হয় সব ফল চাই, নয়তো
কিছুই না, তখন এটা ব্যবহার করুন। `allSettled` কখনো reject করে না। প্রতিটি input-এর জন্য একটি status record দিয়ে
resolve হয়। এমন স্বাধীন কাজে এটা মানায়, যেখানে আংশিক সাফল্যও কাজের, যেমন একটি dashboard।

**Q: কখন error throw না করে return করবেন?**

যখন ব্যর্থতাটা একটি প্রত্যাশিত ফল, যা caller-কে সামলাতেই হবে। যেমন ভুল input, খুঁজে না পাওয়া record, বা প্রত্যাখ্যাত
payment। Return type-এ থাকলে ব্যর্থতাটা signature-এই দেখা যায়, আর compiler সেটা যাচাই করে। Throw মানায় সত্যিকারের
ব্যতিক্রমী ক্ষেত্রে, যেখানে প্রতিটি call site-এ check রাখা শুধু গোলমাল বাড়াত।

**Q: `catch (e) { console.error(e); }` সাধারণত কেন একটি bug?**

এটা ব্যর্থতাকে নীরব সাফল্যে বদলে দেয়। Caller যেখানে value আশা করছিল, সেখানে পায় `undefined`, আর আসল লক্ষণটা দেখা দেয়
একেবারে অন্য কোথাও। Catch block-এর কাজ হয় সামলে নেওয়া, অন্য রূপে বদলে দেওয়া, নয়তো আবার throw করা।

**Q: কখন ইচ্ছে করেই `Promise.all`-এর বদলে loop-এর ভেতরে await করবেন?**

যখন প্রতিটি iteration আগেরটার ওপর নির্ভর করে, বা অন্য প্রান্ত rate-limit করে। Side effect-এর ক্রম জরুরি হলেও তাই
করবেন। List এত বড় হলে যে একসঙ্গে হাজার হাজার socket খুলে যাবে, তখনও এটা কাজে আসে। মাঝামাঝি পথ হলো batch করা।

## এরপর কী পড়বেন

- [Chapter ?? — Event Loop](#ch-event-loop) — settle হওয়া promise কেন `setTimeout`-এর আগে আবার চলে
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — খারাপ input error হয়ে ওঠার আগেই থামানো
- [Chapter ?? — Monitoring ও Observability-র মূল কথা](#ch-monitoring-fundamentals) — log করা error নিয়ে এরপর কী করবেন
