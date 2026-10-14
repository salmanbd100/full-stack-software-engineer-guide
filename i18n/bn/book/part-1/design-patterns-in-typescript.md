---
sourceHash: "2706f06f3a93553fd951af6033a3756e96cec9e3b24a597c5164e5b826645f03"
title: "TypeScript-এ Design Pattern"
translatedAt: "2026-10-14T04:35:31.298Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TypeScript-এ Design Pattern {#ch-design-patterns-in-typescript}

> Pattern-এর আগে সমস্যার নাম বলুন, আর জেনে রাখুন কোন classic pattern এই ভাষায় ছোট হতে হতে একটা function হয়ে যায়।

**এই অধ্যায়ে:** strategy · observer · factory · adapter · decorator · builder · যে pattern-গুলো TypeScript আগে থেকেই দিয়ে রেখেছে

## 💡 মূল ধারণা

Pattern হলো বারবার ফিরে আসা একটা সমস্যার নাম, আর তার একটা পরীক্ষিত সমাধান। এর মধ্যে নামটাই সবচেয়ে কম দামি। নম্বর
আসে আগে সমস্যাটা বলতে পারলে: *"নতুন payment provider যোগ করলেই এই switch-এ একটা করে branch বাড়ে, আর প্রতিটি
branch একই function-এ হাত দেয়।"*

বেশিরভাগ candidate উত্তরের দ্বিতীয় অর্ধেকটা ধরতে পারেন না: **TypeScript, Java নয়**। Gang of Four-এর বেশ কয়েকটি
pattern আছে এমন সীমাবদ্ধতা এড়াতে, যা এই ভাষার নেই-ই। Singleton আসলে একটা module। Strategy সাধারণত একটা
function। Observer প্রায়ই একটা `EventTarget`। ভাষায় যে ব্যবস্থা আগে থেকেই আছে, তার জন্য class hierarchy বানানো
দেখলেই বোঝা যায় candidate mid-level।

## কোন সমস্যায় কোন Pattern

| আসলে যে সমস্যাটা আছে | Pattern | TypeScript-এর নিজস্ব রূপ |
| --- | --- | --- |
| অদলবদল করা যায় এমন কয়েকটি algorithm | **Strategy** | `Record<Kind, Fn>` |
| একটি event-এ অনেক কিছুর সাড়া দিতে হবে | **Observer** | `EventTarget`, একটা emitter, একটা signal |
| কোন class বানানো হবে, তা input-এর ওপর নির্ভর করে | **Factory** | Union return করা একটা function |
| বাইরের API-র shape ভুল | **Adapter** | একটা wrapper module |
| মূল code না বদলে আচরণ যোগ করা | **Decorator** | একটা higher-order function |
| Constructor-এ parameter বেড়ে আটটি হয়েছে | **Builder** | সাধারণত একটা options object |
| একটিই instance, সবাই ভাগ করে | **Singleton** | Module-level একটা `const` |

ডানের column-টা pattern-কে উড়িয়ে দেওয়া নয়। "এখানে এটা কীভাবে implement করবেন" প্রশ্নের উত্তর ওটাই। এই উত্তর
তৈরি থাকলেই বোঝা যায়, আপনি catalogue শুধু জানেন না, ব্যবহারও করেছেন।

## Strategy

প্রতিটি algorithm-কে এমনভাবে মুড়ে রাখুন, যাতে caller কোনটা কোনটা না জেনেই অদলবদল করতে পারে।

শুরুটা একটা `shippingCost` function, যেটা একটা `method` string দেখে branch করে। প্রতিটি নতুন option-এ এটা edit
করতে হয়, আর প্রতিটি edit আগের branch-গুলোকে ঝুঁকিতে ফেলে।

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

এখানে `satisfies` (TypeScript 4.9 ও পরের version) সত্যিকারের কাজ করছে। এটা প্রতিটি entry-কে
`ShippingRate`-এর সঙ্গে মিলিয়ে দেখে, আবার literal key-র নামগুলোও রেখে দেয়। তাই `Method` হয় আসল method-গুলোর
union, `string` নয়। ফলে অজানা method দিলে runtime-এ throw না হয়ে compile error হয়।

> ⚠️ **কখনো বদলায় না এমন দুটি branch-এর জন্য এটা লাগে না।** সেখানে map-এর চেয়ে `if` বেশি পরিষ্কার। Pattern-টা
> কাজে আসে শুধু তখন, যখন তালিকা বাড়তে থাকে বা বাছাইটা আসে configuration থেকে।

## Observer

Source না জেনেই অনেক কিছু যেন একটা event-এ সাড়া দিতে পারে।

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

নকল করার মতো খুঁটিনাটি হলো `on` থেকে unsubscribe function return করা। দীর্ঘক্ষণ চলা front end-এ সবচেয়ে চেনা
memory leak হলো এমন observer, যাকে সরানো যায় না। Subscribe করার সময়েই `on` যদি clean-up function হাতে তুলে দেয়,
তাহলে কেউ সেটা call করতে ভুলে গেলে reviewer দেখতে পান।

> ⚠️ **Synchronously emit করলে একটা ধীর listener পুরো publisher-কে আটকে দেয়।** Listener-গুলো পরপর চলবে, একসঙ্গে
> চলবে, নাকি queue-তে যাবে, তা জেনে-বুঝে ঠিক করুন, আর type-এর নামেই সেটা বলে দিন।

## Factory

কোন implementation বানানো হবে, সেই সিদ্ধান্ত এক জায়গায় নিয়ে আসুন।

একটা `createExporter(format)` function `'csv' | 'xlsx' | 'pdf'`-এর ওপর switch করে একটা `Exporter` return করে।
Pattern বলতে এটুকুই: caller একটা format চায়, কোনো class-এর নাম কখনো দেখে না।

কীভাবে বানাতে হয়, সেই জ্ঞান থাকে এক জায়গায়। `createExporter` যে call করছে, সে জানেই না PDF-এর জন্য font লাগে।
এটা বদলালে বদলায় একটিমাত্র function। `default` না থাকাটা ইচ্ছাকৃত। Union-এ নতুন format যোগ করলে TypeScript
compile-time-এই জানিয়ে দেয় যে function-টা আর exhaustive নয়।

## Adapter

যে interface আপনার নিয়ন্ত্রণে নেই, সেটাকে আপনার code-এর চাওয়া interface-এর সঙ্গে খাপ খাওয়ান।

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

ওই vendor সম্পর্কে যত অনুমান, সব এখন একটি file-এ। Vendor বদলাতে লাগে দ্বিতীয় একটা adapter আর wiring-এর এক line।
Unit test-গুলো vendor-কে কখনো ছোঁয়নি, কারণ সেগুলো লেখা হয়েছিল `PaymentGateway`-এর ওপর।

## Decorator

কোনো কিছু edit না করে তার চারপাশে আচরণ যোগ করা। TypeScript-এ এটা সাধারণত একটা function, class নয়।

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

ক্রম গুরুত্বপূর্ণ, আর পড়তে হয় ভেতর থেকে বাইরে। Retry মোড়ায় fetch-কে, আর timing মোড়ায় retry-কে, তাই metric-এ
তিনটি চেষ্টাই ধরা পড়ে। উল্টে দিলে প্রতিটি চেষ্টার আলাদা timing পাবেন। কেন, সেটা ব্যাখ্যা করাই পরের প্রশ্ন।

## Builder

জানা দরকার, তবে যত শেখানো হয় তত ব্যবহারের দরকার নেই। Builder তখনই কাজের, যখন object বানানো সত্যিই ধাপে ধাপে হয়,
আর শেষ ধাপের আগে object-টা অচল। যেমন জোড়া লাগানো হচ্ছে এমন একটা query, বা একটা multipart request। অনেক সময়
আসল সমস্যা হলো "এই constructor-এ parameter বড্ড বেশি"। তখন default সহ destructure করা options object বেশি সহজ।
তার field-গুলোর নাম থাকে, optional হয়, check হয়, আর রক্ষণাবেক্ষণের জন্য কোনো builder class থাকে না।

## সাধারণ ভুল

❌ **সমস্যার আগে pattern-এর নাম বলা।** "আমি strategy ব্যবহার করব" এমন প্রশ্নের উত্তর, যা কেউ করেনি।
✅ যে বদলটা বারবার আসছে, আগে সেটা বলুন, তারপর এমন structure প্রস্তাব করুন, যা সেই বদল সামলে নেয়।

❌ **Static `getInstance` সহ singleton class।** ES module নিজেই singleton। Module-এর body একবারই চলে, আর যে-ই
import করুক, সবাই একই export পায়।
✅ একটা `const` export করুন। Class নিন শুধু তখন, যখন test-এ instance-টা সত্যিই বদলাতে হয়।

## 🔑 মূল শিক্ষা

- আগে বলুন কোন বদলটা বারবার আসছে। Pattern উত্তরের দ্বিতীয় অর্ধেক, কখনো প্রথম নয়।
- TypeScript-এ strategy সাধারণত function-এর একটা typed record, আর `satisfies` key-গুলোকে check হওয়া union হিসেবে রাখে।
- Observer-এর `on` থেকে unsubscribe function return করুন, কারণ ভুলে যাওয়া listener-ই সবচেয়ে চেনা leak।
- এই ভাষায় কয়েকটি classic pattern (singleton, decorator, facade) হয়ে যায় একটা module, একটা function আর একটা export।

## Interview-এর প্রশ্ন

**Q: Payment provider-এর ওপর এই `switch` বড় হয়েই চলেছে। আপনি কী করবেন?**

আগে বলব এই বেড়ে চলার খরচ কী। প্রতিটি provider একই function edit করে, তাই প্রতিটি বদল বাকিগুলোকে ঝুঁকিতে ফেলে,
আর file-টায় merge conflict লেগেই থাকে। তারপর strategy প্রস্তাব করব: provider-কে key ধরে একটা record, প্রতিটি
implementation-এর জন্য একটি করে entry। তখন নতুন provider মানে শুধু নতুন একটা entry। TypeScript-এ আমি
`satisfies` ব্যবহার করব, যাতে key-র union আসে record থেকেই, আর caller অজানা provider পাঠাতে না পারে।

**Q: Decorator, proxy আর adapter-এর পার্থক্য কী? তিনটিই তো কিছু একটাকে মোড়ায়।**

উদ্দেশ্যে, আর interviewer যাচাই করছেন ঠিক সেটাই। Decorator একই interface রেখে আচরণ যোগ করে। Proxy-ও একই
interface রাখে, কিন্তু নিয়ন্ত্রণ করে *access*: lazy ভাবে, remote থেকে, বা cache দিয়ে। Adapter জেনে-বুঝে
interface-টাই *বদলে দেয়*, যাতে বেমানান জিনিসও খাপ খায়। আকার এক, কারণ তিনটি আলাদা।

**Q: কখন pattern ভুল উত্তর?**

যখন implementation একটাই, আর দ্বিতীয়টা আসার কোনো লক্ষণ নেই। প্রতিটি pattern নমনীয়তা কেনে ঘুরপথের বিনিময়ে, আর
সেই ঘুরপথের দাম দিতে হয় প্রতিবার code পড়ার সময়। সৎ উত্তর হলো, আমি আগে সরাসরি code লিখব। Structure যোগ করব দ্বিতীয়
case এলে। তখনই আসলে প্রথমবার বোঝা যায়, abstraction-টা দেখতে কেমন হওয়া উচিত।

## এরপর কী পড়বেন

- [Chapter ?? — SOLID নীতি](#ch-solid-principles) — open/closed আর dependency inversion, এই pattern-গুলোর বেশিরভাগ যা বাস্তবে আনে
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — একই ধারণা, পুরো system-এর মাপে
- [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) — ওপরের function রূপগুলো কেন এখানে class রূপকে হারায়
