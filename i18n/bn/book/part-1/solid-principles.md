---
sourceHash: "033612f43e6432d8fc2486e7b585fcae814f0a525dc9c4e36f8e10fe7aef03aa"
title: "SOLID নীতি"
translatedAt: "2026-10-12T07:46:54.815Z"
model: "claude-opus-5-5 (Claude Code)"
---

# SOLID নীতি {#ch-solid-principles}

> পাঁচটি নীতি সেখানে প্রয়োগ করুন, যেখানে সেগুলো কাজে লাগে। যেখানে লাগে না, সেখানে খরচটার নাম বলুন।

**এই অধ্যায়ে:** single responsibility · open/closed · Liskov substitution · interface segregation · dependency inversion

## 💡 মূল ধারণা

SOLID হলো পাঁচটি design নীতি, যার লক্ষ্য এমন code, যেটা ভয় ছাড়াই বদলানো যায়। Interview-এ এটা সবচেয়ে বেশি
জিজ্ঞেস করা design বিষয়, আর সাধারণত সবচেয়ে খারাপ উত্তর পাওয়া বিষয়ও। Acronym-টা মুখস্থ বলা সহজ; প্রয়োগ করা
সহজ নয়। পাঁচটি সমান কাজের নয়। **Dependency inversion আর single responsibility আপনার প্রতিদিনের code লেখার ধরন
বদলে দেয়।** Liskov আর interface segregation-এর পরিসর ছোট। আর open/closed হলো এদের মধ্যে সবচেয়ে বেশি ভুলভাবে
উদ্ধৃত।

> **একটা শক্ত উত্তরকে যা আলাদা করে:** আগে smell, তারপর সমাধান, তারপর খরচ। এর প্রতিটা নীতিকেই অতিরিক্ত প্রয়োগ
> করে এক-method-এর interface-এর একটা গোলকধাঁধা বানানো যায়। এটা মুখে বলাই senior-এর সংকেত।

## Single Responsibility (SRP)

> একটা class-এর বদলানোর কারণ থাকবে একটা, এবং শুধু একটাই।

**"একটা দায়িত্ব" কথাটা অস্পষ্ট; "বদলানোর একটা কারণ" যাচাই করা যায়।** আরও ধারালো করে বললে: একটা module একজন
*actor*-এর কাছে জবাবদিহি করবে। Actor মানে মানুষের এমন একটা দল, যারা একটা পরিবর্তন চাইতে পারে।

```typescript
// ❌ Three actors, three reasons to change, one class.
async function register(email: string, password: string): Promise<void> {
  if (!email.includes('@')) throw new Error('bad email'); // ← product rules
  const hash = await bcrypt.hash(password, 12);
  await db.query('INSERT INTO users …', [email, hash]); // ← DBA / schema
  await sendgrid.send({ to: email, template: 'welcome' }); // ← marketing
}
```

সমাধান হলো তিনটা collaborator: একটা `UserRepository`, একটা `PasswordHasher` আর একটা `EmailSender`। আপনি এগুলো
একটা `UserRegistration` class-এ পাঠান, যেটা শুধু এগুলোকে জোড়া লাগায়। প্রত্যেকটার বদলানোর কারণ একটা, আর
validation-এর নিয়মটা আলাদাভাবে test করা যায়।

⚠️ **ব্যর্থতার রূপটা হলো উল্টো চরম।** `UserEmailValidator`, `UserEmailNormalizer`,
`UserEmailComparer` — একটা string-এর জন্য তিনটা class। SRP বদলানোর কারণ নিয়ে, লাইনের সংখ্যা নিয়ে নয়। দুটো
জিনিস যদি সবসময় একসঙ্গে বদলায়, তাহলে সেগুলো একসঙ্গেই থাকা উচিত।

## Open/Closed (OCP)

> Extension-এর জন্য খোলা, modification-এর জন্য বন্ধ।

**মূল কথা "কখনো কোনো file edit করবেন না" নয়।** মূল কথা হলো, একটা *নতুন case* যোগ করতে গিয়ে যেন এমন code
edit করতে না হয়, যেটা আগে থেকেই কাজ করছে আর test করা আছে।

Smell-টা হলো এমন একটা function, যেটা একটা `format` string-এর ওপর switch করে আর প্রতি quarter-এ একটা করে
branch বাড়ায়। প্রতিটা edit আগে থেকে কাজ করা branch-গুলোকে ঝুঁকিতে ফেলে, আর প্রতিবার পুরো file-টা আবার test
করতে হয়।

```typescript
// ✅ New formats are added, never edited in.
interface Exporter {
  readonly format: string;
  export(data: Row[]): string;
}

class ExportRegistry {
  private readonly exporters = new Map<string, Exporter>();

  register(exporter: Exporter): void {
    this.exporters.set(exporter.format, exporter);
  }

  export(data: Row[], format: string): string {
    const exporter = this.exporters.get(format);
    if (exporter === undefined) throw new UnsupportedFormatError(format);
    return exporter.export(data);
  }
}
```

PDF export যোগ করা মানে একটা object লেখা আর সেটা register করা। আগের কিছুতেই হাত দিতে হয় না।

> ⚠️ **এটা Strategy, নীতির দিক থেকে দেখা।** OCP হলো লক্ষ্য। Strategy, factory আর decorator হলো mechanism।
> দেখুন [Chapter ?? — TypeScript-এ Design Pattern](#ch-design-patterns-in-typescript)।

একটা `switch` মানেই আপনা থেকে লঙ্ঘন নয়। কিছু case-এর সেট সত্যিই নির্দিষ্ট, যেমন HTTP method বা চারটা log level।
সেখানে exhaustiveness check-সহ একটা `switch` একটা registry-র চেয়ে ভালো, কারণ compiler যাচাই করে যে আপনি সবকিছু
handle করেছেন। OCP সেই axis-গুলোর ক্ষেত্রে প্রযোজ্য, যেগুলো সত্যিই বদলায়।

## Liskov Substitution (LSP)

> যেখানে base type আশা করা হয়, সেখানে একটা subtype ব্যবহার করা যাবে — caller টেরই পাবে না।

এটা **behaviour নিয়ে, signature নিয়ে নয়**। TypeScript type যাচাই করে; contract যাচাই করতে পারেন শুধু আপনি।

Rectangle/Square হলো পাঠ্যবইয়ের উদাহরণ। একটা `Square` তার বাহুগুলো সমান রাখে। তাই যে caller width আর height
আলাদাভাবে set করে, তাকে সে ভেঙে দেয়, যদিও type-গুলো মিলে যায়।

আপনি বাস্তবে যে রূপটার মুখোমুখি হবেন, সেটা আলাদা। একটা `Storage` interface `write` আর `delete`-এর প্রতিশ্রুতি দেয়,
আর একটা `ReadOnlyArchiveStorage` দুটোই implement করে error throw করে। এটা compile হয় আর interface-টা পূরণ করে।
আবার base contract মেনে লেখা প্রতিটা caller-কেও ভেঙে দেয়।

সমাধান ভালো error message নয়, ভালো interface। Read আর write আলাদা করুন — এটাই ISP। তাহলে একটা archive সোজা
কথায় `WritableStorage` নয়।

একটা subtype তার input থেকে বেশি দাবি করতে পারে না (precondition শক্ত করা)। তার result নিয়ে কম প্রতিশ্রুতিও দিতে
পারে না (postcondition দুর্বল করা)। কোনো invariant ভাঙতে পারে না, বা এমন exception throw করতে পারে না, যেটা base type
কখনো ঘোষণা করেনি। TypeScript এই চারটার একটাও যাচাই করে না।

> ⚠️ বেশিরভাগ LSP লঙ্ঘন হলো substitutability-র জন্য নয়, code reuse-এর জন্য ব্যবহার করা inheritance। যখন "is a"
> কথায় সত্যি কিন্তু behaviour-এ নয়, তখন composition ব্যবহার করুন।

## Interface Segregation (ISP)

> কোনো client-কে এমন method-এর ওপর নির্ভর করতে বাধ্য করা উচিত নয়, যেটা সে ব্যবহার করে না।

ছয়-method-এর একটা `Repository<T>` একটা append-only audit log-কে `delete` implement করতে বাধ্য করে। এটা implement
করার একমাত্র উপায় হলো throw করা, আর সেটা একটা LSP লঙ্ঘনও।

এটাকে `Readable<T>`, `Writable<T>` আর `Deletable`-এ ভাগ করুন। তখন একটা audit log ঘোষণা করে
`implements Readable<AuditEntry>, Writable<AuditEntry>`, আর type নিজেই বলে দেয় "append-only"।

**পরিচ্ছন্নতার বাইরেও:** ছয়-method-এর interface-এর একজন consumer-কে বদলাতে হয়, যখন ছয়টার যেকোনো একটা বদলায়।
তার test-কেও ছয়টাই stub করতে হয়। সরু interface মানে সরু test double আর ছোট blast radius। তবে থামুন সুসংহত
role-এ গিয়ে, প্রতি interface-এ একটা method-এ নয়।

## Dependency Inversion (DIP)

> উঁচু স্তরের module নিচু স্তরের module-এর ওপর নির্ভর করবে না। দুটোই abstraction-এর ওপর নির্ভর করবে।

**এটাই সেই নীতি, যেটা আপনার code সবচেয়ে বেশি বদলায়**, আর মানুষ সাধারণত এটা উল্টো করে ব্যাখ্যা করে। Inversion-টা
হলো *interface-এর মালিক কে*, সেই প্রশ্নে।

```typescript
// Defined by the consumer, in domain language — this is the inversion.
interface PaymentGateway {
  charge(amountCents: number, token: string): Promise<{ id: string }>;
}

// ✅ High-level policy, no vendor anywhere in sight.
class OrderService {
  constructor(private readonly payments: PaymentGateway) {}

  async checkout(order: Order, token: string): Promise<void> {
    const charge = await this.payments.charge(order.totalCents, token);
    order.markPaid(charge.id);
  }
}

// The detail conforms to the domain's interface, not the reverse.
class StripeGateway implements PaymentGateway {} // SDK calls here
```

**যে খুঁটিনাটি মানুষ মিস করে:** `PaymentGateway` থাকে `OrderService`-এর সঙ্গে, Stripe adapter-এর সঙ্গে নয়। এটাই একে
inversion বানায়: domain আকারটা ঠিক করে, আর vendor-রা নিজেদের মানিয়ে নেয়। Interface-টা infrastructure layer-এ রাখলে
আপনি শুধু একটা file যোগ করলেন।

এতে তিনটা জিনিস পাওয়া যায়। Unit test একটা সাধারণ object ব্যবহার করে, কোনো network লাগে না। Vendor বদলালে হাত দিতে হয়
একটা adapter আর wiring-এর এক লাইনে। Domain যেকোনো framework-এ নিয়ে যাওয়া যায়।

> **DIP মানে DI নয়।** DIP হলো নীতি: এমন abstraction-এর ওপর নির্ভর করুন, যার মালিক আপনি। DI (dependency injection)
> হলো পৌঁছে দেওয়ার mechanism: সেটা পাঠিয়ে দিন। একটা concrete class inject করলে DI পূরণ হয়, কিন্তু DIP পুরোপুরি
> ভাঙে। দেখুন
> [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance)।

## SOLID যখন ভুল পথে যায়

প্রতিটা নীতির একটা অতিরিক্ত-প্রয়োগের রূপ আছে। Interviewer-রা ঠিক এগুলোর নাম শুনতে চান:

| অতিরিক্ত প্রয়োগের রূপ | ফলাফল |
| --------------- | ------ |
| SRP → প্রতি method-এ একটা class | একটা request অনুসরণ করতে বারোটা file |
| OCP → প্রতিটা axis-এর জন্য একটা abstraction | দুটো case-এর জন্য একটা plugin architecture, যেগুলো কখনো বদলায়নি |
| ISP → প্রতি interface-এ একটা method | একটা collaborator-কে বর্ণনা করতে দশটা interface |
| DIP → প্রতি class-এ একটা interface | ঠিক একটা implementation-ওয়ালা indirection, চিরকালের জন্য |

**যে নিয়ম এটাকে সৎ রাখে:** একটা নীতি তখনই প্রয়োগ করুন, যখন আপনি বলতে পারেন সেটা কোন পরিবর্তনকে সস্তা করে।
"পরের quarter-এ আমাদের দ্বিতীয় একটা payment provider লাগবে" — এটা একটা কারণ। "এটা বেশি SOLID" — এটা কারণ নয়।

## 🔑 মূল শিক্ষা

- প্রতিদিনের কাজের বেশিরভাগ মূল্য আসে dependency inversion আর single responsibility থেকে। বাকি তিনটার পরিসর ছোট।
- Single responsibility হলো কে পরিবর্তন চাইতে পারে, সেটা নিয়ে। একটা class-এ কয়টা method আছে, সেটা নিয়ে নয়।
- Open/closed হলো লক্ষ্য। Strategy, factory আর decorator হলো সেখানে পৌঁছানোর mechanism। Exhaustiveness check-সহ একটা নির্দিষ্ট `switch` লঙ্ঘন নয়।
- দ্বিতীয় case এলে এই নীতিগুলোর দিকে refactor করুন। শুরু থেকেই এগুলো দিয়ে শুরু করলে এমন এক-method-এর interface তৈরি হয়, যেগুলো কেউ পড়ে না।

## Interview-এর প্রশ্ন

**Q: একটা বাস্তব উদাহরণ দিয়ে SRP ব্যাখ্যা করুন।**

বদলানোর একটা কারণ — আরও ভালোভাবে বললে, একজন *actor*। ধরুন একটা registration method input validate করে, password hash করে, database-এ লেখে আর একটা welcome email পাঠায়। এটা product, security, DBA আর marketing — চারটা দলের কাছে জবাবদিহি করে। তাই চারটা দলের যেকোনোটা এটাকে বদলাতে বাধ্য করতে পারে। এটাকে একটা repository, একটা hasher আর একটা mailer-এ ভাগ করুন। এখন একটা email template বদলালে password hashing ভাঙতে পারে না। আর আমি কোনো database ছাড়াই validation-এর নিয়মটা test করতে পারি।

**Q: আপনি বাস্তবে দেখেছেন এমন একটা Liskov লঙ্ঘনের উদাহরণ দিন।**

একটা read-only storage implementation, যার `write` আর `delete` throw করে। এটা interface পূরণ করে আর ঠিকঠাক compile হয়, কিন্তু base contract মেনে লেখা প্রতিটা caller-কে ভেঙে দেয়। আসল সমস্যা ছিল interface-টা। Read আর write আলাদা হওয়া উচিত ছিল, তাহলে একটা read-only backend সোজা কথায় writable হতো না। বেশিরভাগ LSP লঙ্ঘন শেষ পর্যন্ত দেখা যায় substitutability-র জন্য নয়, reuse-এর জন্য ব্যবহার করা inheritance।

**Q: কখন আপনি ইচ্ছে করে SOLID উপেক্ষা করবেন?**

যখন যে পরিবর্তন থেকে এটা রক্ষা করে, সেটা আসছেই না। একটা implementation-ওয়ালা interface, যার দ্বিতীয়টা দেখা যাচ্ছে না, এমন একটা option-এর জন্য maintenance খরচ করায়, যেটা কেউ ব্যবহার করবে না। প্রতি method-এ একটা class একটা request-কে গুপ্তধন খোঁজার খেলায় পরিণত করে। আমি একটা নীতি তখনই প্রয়োগ করি, যখন বলতে পারি সেটা কোন পরিবর্তনকে সস্তা করে। বলতে না পারলে আমি সহজ code লিখি, আর দ্বিতীয় case সত্যিই এলে refactor করি।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript-এ Design Pattern](#ch-design-patterns-in-typescript) — যে mechanism-গুলো এই নীতিগুলো implement করে
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — পুরো একটা system-এ dependency inversion-এর প্রয়োগ
- [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) — Liskov লঙ্ঘন আসলে কোথা থেকে আসে
