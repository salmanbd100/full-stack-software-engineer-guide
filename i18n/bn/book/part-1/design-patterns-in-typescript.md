---
sourceHash: "2706f06f3a93553fd951af6033a3756e96cec9e3b24a597c5164e5b826645f03"
title: "TypeScript-এ Design Pattern"
translatedAt: "2026-10-12T07:47:38.589Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript-এ Design Pattern {#ch-design-patterns-in-typescript}

> Pattern-এর আগে সমস্যাটার নাম বলুন। আর জানুন, এখানে কোন classic pattern-গুলো ছোট হয়ে একটা function-এ পরিণত হয়।

**এই অধ্যায়ে:** strategy · observer · factory · adapter · decorator · builder · যে pattern-গুলো TypeScript আপনাকে আগেই দিয়ে রেখেছে

## 💡 মূল ধারণা

Pattern হলো বারবার ঘটা একটা সমস্যার নাম, আর তার একটা পরীক্ষিত ভালো সমাধান। নামটাই সবচেয়ে কম মূল্যবান অংশ।
নম্বর পাওয়া যায় আগে সমস্যাটা বলে: *"প্রতিবার নতুন payment provider যোগ করলে এই switch-এ একটা করে branch বাড়ে,
আর প্রতিটা branch একই function-এ হাত দেয়।"*

বেশিরভাগ candidate উত্তরের দ্বিতীয় অর্ধেকটা মিস করেন: **TypeScript, Java নয়**। Gang of Four-এর বেশ কিছু pattern
আছে এমন একটা সীমাবদ্ধতা এড়ানোর জন্য, যেটা এই ভাষায় নেই। একটা singleton হলো একটা module। একটা strategy সাধারণত
একটা function। একটা observer প্রায়ই একটা `EventTarget`। ভাষায় mechanism আগে থেকেই থাকলেও class hierarchy বানানো —
এটা mid-level-এর লক্ষণ।

## কোন সমস্যা, কোন Pattern

| আপনার আসল সমস্যা | Pattern | TypeScript-এর নিজস্ব রূপ |
| --- | --- | --- |
| একটার জায়গায় আরেকটা বসানো যায় এমন কয়েকটা algorithm | **Strategy** | `Record<Kind, Fn>` |
| একটা event-এ অনেক কিছুকে সাড়া দিতে হবে | **Observer** | `EventTarget`, একটা emitter, একটা signal |
| কোন class বানাতে হবে, তা input-এর ওপর নির্ভর করে | **Factory** | একটা union return করা function |
| একটা external API-র আকার ভুল | **Adapter** | একটা wrapper module |
| মূলটা edit না করে behaviour যোগ করা | **Decorator** | একটা higher-order function |
| একটা constructor-এর parameter বেড়ে আটটা হয়েছে | **Builder** | সাধারণত একটা options object |
| একটাই instance, সবার মধ্যে ভাগ করা | **Singleton** | একটা module-level `const` |

ডানদিকের column-টা উড়িয়ে দেওয়ার জন্য নয়। এটা হলো "এখানে আপনি এটা কীভাবে implement করবেন" প্রশ্নের উত্তর।
এটা হাতের কাছে থাকলেই বোঝা যায়, আপনি শুধু catalogue জানেন, নাকি সত্যিই ব্যবহার করেছেন।

## Strategy

প্রতিটা algorithm-কে এমনভাবে মুড়ে দিন, যাতে caller কোনটা কোনটা না জেনেই সেগুলো বদলাতে পারে।

শুরুর অবস্থা হলো একটা `shippingCost` function, যেটা একটা `method` string-এর ওপর branch করে। প্রতিটা নতুন option
এটাকে edit করে, আর প্রতিটা edit আগে থেকে থাকা branch-গুলোকে ঝুঁকিতে ফেলে।

```typescript
// ✅ One algorithm per entry. Adding a method adds a key, not an edit.
type ShippingRate = (order: Order) => number;

const rates = {
  standard: (o: Order) => o.weightKg * 2,
  express: (o: Order) => o.weightKg * 5 + 10,
  freight: (o: Order) => Math.max(50, o.weightKg * 1.2),
} satisfies Record<string, ShippingRate>;

type Method = keyof typeof rates;

function shippingCost(order: Order, method: Method): number {
  return rates[method](order); // no default branch — the type covers it
}
```

`satisfies` (TypeScript 4.9 এবং পরের version) এখানে আসল কাজটা করছে। এটা প্রতিটা entry-কে `ShippingRate`-এর সঙ্গে
মিলিয়ে দেখে, আবার literal key-এর নামগুলোও রেখে দেয়। তাই `Method` হয় `string`-এর বদলে আসল method-গুলোর একটা union।
ফলে অজানা একটা method runtime-এ throw হওয়ার বদলে compile error হয়ে যায়।

> ⚠️ **যে দুটো branch কখনো বদলায় না, তাদের এর দরকার নেই।** সেখানে একটা map-এর চেয়ে `if` বেশি পরিষ্কার। Pattern-টা
> তখনই তার দাম তোলে, যখন সেটটা বাড়ে বা পছন্দটা configuration থেকে আসে।

## Observer

Source-কে না জানিয়েই অনেক কিছুকে একটা event-এ সাড়া দিতে দিন।

```typescript
class TypedEmitter<Events extends Record<string, unknown>> {
  private readonly listeners = new Map<keyof Events, Set<(p: never) => void>>();

  on<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(fn as (p: never) => void);
    this.listeners.set(event, set);
    return () => set.delete(fn as (p: never) => void); // unsubscribe, returned by design
  }
}
```

`on` থেকে unsubscribe function return করা — এই খুঁটিনাটিটা নকল করার মতো। যে observer সরানো যায় না, দীর্ঘ সময় চলা
front end-এ সেটাই সবচেয়ে সাধারণ memory leak। Subscribe করার সময়েই `on` যখন clean-up function হাতে দিয়ে দেয়, তখন
কেউ সেটা call করতে ভুলে গেলে একজন reviewer সেটা দেখতে পান।

> ⚠️ **Synchronously emit করা মানে একটা ধীর listener publisher-কে আটকে দেয়।** Listener-গুলো ক্রমানুসারে চলবে,
> parallel-এ চলবে, নাকি একটা queue-তে — সেটা ভেবেচিন্তে ঠিক করুন, আর type-এর নামেই সেটা বলে দিন।

## Factory

কোন implementation বানানো হবে, সেই সিদ্ধান্তটা এক জায়গায় সরিয়ে আনুন।

একটা `createExporter(format)` function `'csv' | 'xlsx' | 'pdf'`-এর ওপর switch করে আর একটা `Exporter` return করে।
পুরো pattern এটুকুই: caller-রা একটা format চায়, কখনো কোনো class-এর নাম দেখে না।

কীভাবে বানাতে হয়, সেই জ্ঞান থাকে এক জায়গায়। `createExporter` call করা কেউ জানে না যে PDF-এর জন্য font লাগে। সেটা
বদলালে একটা function বদলায়। `default` না থাকাটা ইচ্ছাকৃত। Union-এ একটা format যোগ করুন, আর TypeScript compile
time-এই function-টাকে non-exhaustive বলে চিহ্নিত করবে।

## Adapter

যে interface আপনার নিয়ন্ত্রণে নেই, সেটাকে আপনার code যে interface আশা করে, তার সঙ্গে মিলিয়ে দিন।

```typescript
// The shape your application wants.
interface PaymentGateway {
  charge(amountPence: number, token: string): Promise<{ id: string }>;
}

// The vendor ships different names and different units.
export const vendorGateway: PaymentGateway = {
  async charge(amountPence, token) {
    const res = await vendor.createTransaction({ amount_in_cents: amountPence, source: token });
    return { id: res.txn_id };
  },
};
```

ওই vendor সম্পর্কে প্রতিটা ধারণা এখন একটা file-এ। Vendor বদলানো মানে একটা দ্বিতীয় adapter আর wiring-এর এক লাইন।
Unit test-গুলো কখনো vendor-কে ছোঁয়নি, কারণ সেগুলো `PaymentGateway`-এর বিপরীতে লেখা।

## Decorator

কোনো কিছুকে edit না করে তার চারপাশে behaviour যোগ করুন। TypeScript-এ এটা সাধারণত একটা function, class নয়।

```typescript
type Handler = (req: Request) => Promise<Response>;

const withTiming =
  (name: string) =>
  (next: Handler): Handler =>
  async (req) => {
    const started = performance.now();
    try {
      return await next(req);
    } finally {
      metrics.observe(name, performance.now() - started);
    }
  };

// withRetry has the same shape: a Handler in, a Handler out.
const handler = withTiming('report')(withRetry(3)(fetchReport));
```

ক্রম গুরুত্বপূর্ণ, আর পড়তে হয় ভেতর থেকে বাইরে। Retry মোড়ায় fetch-কে, আর timing মোড়ায় retry-কে। তাই metric-টা তিনটা
attempt-ই ধরে। প্রতিটা attempt-এর আলাদা timing পেতে এদের জায়গা বদলে দিন। কেন — সেটা ব্যাখ্যা করাই পরের প্রশ্ন।

## Builder

জানা দরকার, তবে যতটা শেখানো হয় তার চেয়ে কম ব্যবহার করা উচিত। Builder তখনই তার জায়গা পায়, যখন বানানোটা সত্যিই
ধাপে ধাপে হয়, আর শেষ ধাপের আগ পর্যন্ত object-টা invalid থাকে। উদাহরণ: জোড়া লাগানো হচ্ছে এমন একটা query, বা একটা
multipart request। কখনো কখনো আসল সমস্যা হলো "এই constructor-এর parameter অনেক বেশি"। তখন default-সহ একটা
destructured options object বেশি সহজ। এর field-গুলোর নাম থাকে, সেগুলো optional আর check করা হয়, আর maintain করার
জন্য কোনো builder class থাকে না।

## সাধারণ ভুল

❌ **সমস্যার আগে pattern-এর নাম বলা।** "আমি একটা strategy ব্যবহার করব" এমন একটা প্রশ্নের উত্তর দেয়, যেটা কেউ করেনি।
✅ যে পরিবর্তনটা বারবার ঘটছে, সেটা বর্ণনা করুন। তারপর এমন structure প্রস্তাব করুন, যেটা সেটাকে শুষে নেয়।

❌ **Static `getInstance`-ওয়ালা একটা singleton class।** ES module আগে থেকেই singleton। Module-এর body একবারই চলে, আর
প্রতিটা importer একই export ভাগ করে নেয়।
✅ একটা `const` export করুন। Class-এর দিকে তখনই যান, যখন test-এ instance-টা সত্যিই বদলাতে হয়।

## 🔑 মূল শিক্ষা

- আগে বারবার ঘটা পরিবর্তনটা বলুন। Pattern হলো উত্তরের দ্বিতীয় অর্ধেক, কখনোই প্রথম নয়।
- TypeScript-এ strategy সাধারণত function-এর একটা typed record, আর `satisfies` key-গুলোকে একটা check করা union হিসেবে রাখে।
- Observer-এর `on` থেকে unsubscribe function return করুন, কারণ ভুলে যাওয়া listener-ই হলো চিরচেনা leak।
- এই ভাষায় বেশ কিছু classic pattern (singleton, decorator, facade) হয়ে যায় একটা module, একটা function আর একটা export।

## Interview-এর প্রশ্ন

**Q: Payment provider-এর ওপর এই `switch`-টা শুধু বাড়ছেই। আপনি কী করবেন?**

আগে বলুন, এই বাড়তে থাকার খরচ কী। প্রতিটা provider একই function edit করে, তাই প্রতিটা পরিবর্তন বাকিগুলোকে ঝুঁকিতে
ফেলে, আর file-টায় merge conflict জমে। তারপর একটা strategy প্রস্তাব করুন: provider দিয়ে key করা একটা record, প্রতিটা
implementation-এর জন্য একটা entry। তখন নতুন provider যোগ করা মানে একটা entry যোগ করা। TypeScript-এ আমি `satisfies`
ব্যবহার করতাম, যাতে key-এর union record থেকেই আসে, আর caller কোনো অজানা provider পাঠাতে না পারে।

**Q: Decorator, proxy আর adapter-এর পার্থক্য কী? সবগুলোই তো কিছু একটাকে মোড়ায়।**

উদ্দেশ্য — আর interviewer উদ্দেশ্যটাই যাচাই করছেন। Decorator একই interface রেখে behaviour যোগ করে। Proxy একই
interface রাখে আর *access* নিয়ন্ত্রণ করে: lazily, remotely, বা একটা cache দিয়ে। Adapter ইচ্ছে করে interface-টা
*বদলে দেয়*, যাতে একটা অমিল জিনিস খাপ খায়। আকার একই, কারণ তিনটা আলাদা।

**Q: কখন একটা pattern ভুল উত্তর?**

যখন implementation একটাই, আর দ্বিতীয়টার কোনো প্রমাণ নেই। প্রতিটা pattern indirection দিয়ে flexibility কেনে, আর
indirection-এর দাম আপনি প্রতিবার পড়ার সময় দেন। সৎ উত্তর হলো, আমি আগে সরাসরি code লিখতাম। দ্বিতীয় case এলে structure
যোগ করতাম। তখনই আমি অবশেষে জানি, abstraction-টা দেখতে কেমন হওয়া উচিত।

## এরপর কী পড়বেন

- [Chapter ?? — SOLID নীতি](#ch-solid-principles) — open/closed আর dependency inversion, যেগুলো এই pattern-গুলোর বেশিরভাগই implement করে
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — একই ধারণা, পুরো system-এর মাপে
- [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) — ওপরের function-রূপগুলো এখানে কেন class-রূপগুলোর চেয়ে ভালো
