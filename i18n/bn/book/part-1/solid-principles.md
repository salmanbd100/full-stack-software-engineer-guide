---
sourceHash: "033612f43e6432d8fc2486e7b585fcae814f0a525dc9c4e36f8e10fe7aef03aa"
title: "SOLID নীতি"
translatedAt: "2026-10-14T04:34:44.582Z"
model: "claude-opus-5-5 (Claude Code)"
---

# SOLID নীতি {#ch-solid-principles}

> পাঁচটি নীতি খাটান সেখানে, যেখানে এরা কাজে আসে। আর যেখানে আসে না, সেখানে খরচটা নাম ধরে বলুন।

**এই অধ্যায়ে:** single responsibility · open/closed · Liskov substitution · interface segregation · dependency inversion

## 💡 মূল ধারণা

SOLID হলো পাঁচটি design নীতি, যার লক্ষ্য এমন code, যা ভয় না পেয়ে বদলানো যায়। Interview-এ design নিয়ে সবচেয়ে বেশি
জিজ্ঞেস করা হয় এটাই, আর সাধারণত সবচেয়ে খারাপ উত্তরও আসে এখানেই। Acronym মুখস্থ বলা সহজ, খাটানো সহজ নয়। পাঁচটি
নীতি সমান কাজের নয়। **Dependency inversion আর single responsibility রোজ আপনার code লেখার ধরন বদলে দেয়।** Liskov
আর interface segregation-এর পরিধি ছোট। আর open/closed নিয়ে সবচেয়ে বেশি ভুল উদ্ধৃতি হয়।

> **জোরালো উত্তরকে যা আলাদা করে:** আগে দুর্গন্ধ, তারপর সমাধান, তারপর খরচ। এর প্রতিটি নীতি মাত্রা ছাড়িয়ে খাটালে
> এক method-এর interface-এর গোলকধাঁধা তৈরি হয়। সেটা মুখে বলতে পারাই senior-এর লক্ষণ।

## Single Responsibility (SRP)

> একটি class-এর বদলানোর কারণ থাকবে একটি, আর শুধু একটিই।

**"একটি দায়িত্ব" কথাটা অস্পষ্ট; "বদলানোর একটি কারণ" যাচাই করা যায়।** আরও ধারালো করে বললে: একটি module জবাব দেবে
একজন *actor*-কে। Actor মানে মানুষের এমন একটি দল, যারা বদলের অনুরোধ করতে পারে।

```typescript
// ❌ Three actors, three reasons to change, one class.
async function register(email: string, password: string): Promise<void> {
  if (!email.includes('@')) throw new Error('bad email'); // ← product rules
  const hash = await bcrypt.hash(password, 12);
  await db.query('INSERT INTO users …', [email, hash]); // ← DBA / schema
  await sendgrid.send({ to: email, template: 'welcome' }); // ← marketing
}
```

সমাধান তিনটি collaborator: `UserRepository`, `PasswordHasher` আর `EmailSender`। এগুলো পাঠিয়ে দেন একটি
`UserRegistration` class-এ, যার কাজ শুধু এদের জোড়া দেওয়া। প্রতিটির বদলানোর কারণ একটি, আর validation-এর নিয়মটা
আলাদা করে test করা যায়।

⚠️ **ব্যর্থতা আসে উল্টো দিকের বাড়াবাড়ি থেকে।** `UserEmailValidator`, `UserEmailNormalizer`,
`UserEmailComparer` — একটি string-এর জন্য তিনটি class। SRP বদলের কারণ নিয়ে, line গোনা নিয়ে নয়। দুটি জিনিস যদি
সবসময় একসঙ্গে বদলায়, তাহলে ওরা একসঙ্গেই থাকবে।

## Open/Closed (OCP)

> Extension-এর জন্য খোলা, modification-এর জন্য বন্ধ।

**কথাটা "কখনো file edit করবেন না" নয়।** কথাটা হলো, *নতুন case* যোগ করতে গিয়ে এমন code বদলাতে হবে না, যা আগে
থেকেই কাজ করছে আর test হয়ে আছে।

দুর্গন্ধটা চেনা: একটা function একটা `format` string দেখে switch করে, আর প্রতি quarter-এ তাতে একটা branch বাড়ে।
প্রতিটি edit চালু branch-গুলোকে ঝুঁকিতে ফেলে, আর প্রতিবার পুরো file আবার test করতে হয়।

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

PDF export যোগ করতে এখন শুধু একটি object লিখে register করলেই হয়। আগের কিছুতে হাত দিতে হয় না।

> ⚠️ **নীতির দিক থেকে দেখলে এটাই Strategy।** OCP হলো লক্ষ্য। Strategy, factory আর decorator হলো সেখানে পৌঁছানোর
> উপায়। দেখুন [Chapter ?? — TypeScript-এ Design Pattern](#ch-design-patterns-in-typescript)।

`switch` থাকলেই নীতি ভাঙা হয়ে যায় না। কিছু case-এর তালিকা সত্যিই স্থির, যেমন HTTP method বা চারটি log level।
সেখানে exhaustiveness check সহ `switch` registry-র চেয়ে ভালো, কারণ সব case handle হয়েছে কিনা compiler নিজেই
যাচাই করে। OCP খাটে শুধু সেই অক্ষে, যা সত্যিই বদলায়।

## Liskov Substitution (LSP)

> Base type যেখানে আশা করা হয়, subtype-কেও সেখানে ব্যবহার করা যাবে, আর caller টেরও পাবে না।

এটা **আচরণ নিয়ে, signature নিয়ে নয়**। Type যাচাই করে TypeScript; contract যাচাই করতে পারেন শুধু আপনি।

Rectangle/Square-এর উদাহরণটা পাঠ্যবইয়ের। `Square` তার বাহুগুলো সমান রাখে। তাই যে caller width আর height আলাদা
আলাদা set করে, তাকে এটা ভেঙে দেয়, যদিও type-গুলো দিব্যি মিলে যায়।

আপনি বাস্তবে যেটার মুখোমুখি হবেন, সেটা অন্যরকম। একটা `Storage` interface `write` আর `delete`-এর কথা দেয়, আর
`ReadOnlyArchiveStorage` দুটিই implement করে throw করে। Compile হয়, interface-ও মেনে চলে। আবার base contract
মেনে লেখা প্রতিটি caller-কেও ভেঙে দেয়।

সমাধান ভালো error message নয়, ভালো interface। Read আর write আলাদা করে দিন, সেটাই ISP। তাহলে archive সোজাসুজি
`WritableStorage`-ই নয়।

Subtype তার input-এর কাছে বেশি দাবি করতে পারবে না (precondition কড়া করা), আর ফলাফল নিয়ে কম কথা দিতে পারবে না
(postcondition ঢিলে করা)। কোনো invariant ভাঙতে পারবে না, আর base type যে exception কখনো declare করেনি, তা throw
করতে পারবে না। এই চারটির একটিও TypeScript যাচাই করে না।

> ⚠️ বেশিরভাগ LSP লঙ্ঘনের মূলে আছে inheritance, যেটা নেওয়া হয়েছিল একটার জায়গায় আরেকটা বসানোর জন্য নয়, code আবার
> ব্যবহারের জন্য। "Is a" কথায় খাটে কিন্তু আচরণে খাটে না, এমন হলে composition নিন।

## Interface Segregation (ISP)

> কোনো client-কে এমন method-এর ওপর নির্ভর করতে বাধ্য করা যাবে না, যা সে ব্যবহারই করে না।

ছয় method-এর একটা `Repository<T>` শুধু-যোগ-করা-যায় এমন audit log-কেও `delete` implement করতে বাধ্য করে। সেটা
implement করার একমাত্র উপায় throw করা, আর সেটা একই সঙ্গে LSP লঙ্ঘনও।

একে ভেঙে `Readable<T>`, `Writable<T>` আর `Deletable` করুন। তখন audit log declare করে
`implements Readable<AuditEntry>, Writable<AuditEntry>`, আর type নিজেই বলে দেয় "শুধু যোগ করা যায়"।

**গোছানো দেখানোর বাইরেও লাভ আছে:** ছয় method-এর interface যে ব্যবহার করে, ছয়টির যেকোনোটা বদলালে তাকেও বদলাতে হয়।
তার test-এও ছয়টিরই stub লাগে। Interface সরু হলে test double সরু হয়, আর কোনো বদলের ধাক্কাও কম জায়গায় লাগে। তবে
থামুন সুসংহত role-এ এসে, প্রতিটি interface-এ একটি method পর্যন্ত যাবেন না।

## Dependency Inversion (DIP)

> উঁচু স্তরের module নিচু স্তরের module-এর ওপর নির্ভর করবে না। দুটিই নির্ভর করবে abstraction-এর ওপর।

**আপনার code সবচেয়ে বেশি বদলায় এই নীতিই**, আর লোকে সাধারণত এটা উল্টো করে বোঝায়। Inversion-টা আসলে *interface-এর
মালিক কে*, তা নিয়ে।

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

**যে খুঁটিনাটি লোকে খেয়াল করে না:** `PaymentGateway` থাকে `OrderService`-এর সঙ্গে, Stripe adapter-এর সঙ্গে নয়।
Inversion বলা হয় এই কারণেই: shape ঠিক করে domain, আর vendor-রা তার সঙ্গে নিজেদের মানিয়ে নেয়। Interface-টা
infrastructure layer-এ রাখলে আপনি শুধু একটা বাড়তি file যোগ করেছেন।

এতে তিনটি জিনিস পাওয়া যায়। Unit test চলে সাধারণ একটা object দিয়ে, network ছাড়াই। Vendor বদলালে হাত পড়ে একটি
adapter-এ আর wiring-এর এক line-এ। আর domain যেকোনো framework-এ নিয়ে যাওয়া যায়।

> **DIP আর DI এক জিনিস নয়।** DIP হলো নীতি: এমন abstraction-এর ওপর নির্ভর করুন, যার মালিক আপনি। DI (dependency
> injection) হলো পৌঁছে দেওয়ার উপায়: বাইরে থেকে পাঠিয়ে দিন। একটি concrete class inject করলে DI মানা হয়, কিন্তু DIP
> পুরোপুরি ভাঙা হয়। দেখুন
> [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance)।

## SOLID যখন ভুল পথে যায়

প্রতিটি নীতির একটা বাড়াবাড়ি রূপ আছে, আর interviewer-রা কান পেতে থাকেন সেগুলোর নাম আপনি বলতে পারেন কিনা:

| বাড়াবাড়ি রূপ | ফল |
| --------------- | ------ |
| SRP → প্রতিটি method-এর জন্য একটি class | একটি request বুঝতে বারোটি file ঘাঁটতে হয় |
| OCP → প্রতিটি অক্ষের জন্য একটি abstraction | এমন দুটি case-এর জন্য plugin architecture, যারা কখনো বদলায়নি |
| ISP → প্রতিটি interface-এ একটি method | একটি collaborator-কে বর্ণনা করতে দশটি interface |
| DIP → প্রতিটি class-এর জন্য একটি interface | চিরকাল ঠিক একটি implementation-ওয়ালা ঘুরপথ |

**যে নিয়ম এটাকে সৎ রাখে:** নীতি তখনই খাটান, যখন বলতে পারেন এটা কোন বদলকে সস্তা করছে। "পরের quarter-এ আমাদের
দ্বিতীয় payment provider লাগবে" একটা কারণ। "এটা বেশি SOLID" কোনো কারণ নয়।

## 🔑 মূল শিক্ষা

- রোজকার কাজের বেশিরভাগ লাভ আসে dependency inversion আর single responsibility থেকে। বাকি তিনটির পরিধি ছোট।
- Single responsibility হলো কে বদলের অনুরোধ করতে পারে তা নিয়ে, class-এ কয়টি method আছে তা নিয়ে নয়।
- Open/closed একটা লক্ষ্য, আর strategy, factory ও decorator সেখানে পৌঁছানোর উপায়। Exhaustiveness check সহ স্থির `switch` নীতি ভাঙে না।
- এই নীতিগুলোর দিকে refactor করুন দ্বিতীয় case এলে। শুরুতেই এগুলো দিয়ে শুরু করলে এমন এক method-এর interface তৈরি হয়, যা কেউ পড়ে না।

## Interview-এর প্রশ্ন

**Q: একটা বাস্তব উদাহরণ দিয়ে SRP বুঝিয়ে বলুন।**

বদলানোর একটি কারণ, আরও ভালো করে বললে একজন *actor*। ধরুন একটা registration method input validate করে, password hash করে, database-এ লেখে আর welcome email পাঠায়। এটা জবাব দেয় product, security, DBA আর marketing-কে, মানে চারটি দলের যেকোনোটা একে বদলাতে বাধ্য করতে পারে। একে ভেঙে repository, hasher আর mailer করুন। তখন email template বদলালে password hashing ভাঙতে পারে না, আর validation-এর নিয়মটা database ছাড়াই test করতে পারি।

**Q: নিজের চোখে দেখা একটা Liskov লঙ্ঘনের উদাহরণ দিন।**

একটা read-only storage implementation, যার `write` আর `delete` throw করে। Interface মেনে চলে, দিব্যি compile হয়, কিন্তু base contract মেনে লেখা প্রতিটি caller-কে ভেঙে দেয়। আসল সমস্যা ছিল interface-এ। Read আর write আলাদা থাকা উচিত ছিল, তাহলে read-only backend সোজাসুজি writable হতোই না। বেশিরভাগ LSP লঙ্ঘন শেষে দেখা যায় এমন inheritance, যা নেওয়া হয়েছিল code আবার ব্যবহারের জন্য, একটার জায়গায় আরেকটা বসানোর জন্য নয়।

**Q: কখন জেনে-বুঝে SOLID উপেক্ষা করবেন?**

যে বদলের বিরুদ্ধে এটা সুরক্ষা দেয়, সেই বদল যখন আসছেই না। একটিমাত্র implementation-ওয়ালা interface, যার দ্বিতীয়টা দিগন্তেও নেই, এমন একটা সুযোগের জন্য রক্ষণাবেক্ষণের খরচ চাপায় যা কেউ ব্যবহার করবে না। প্রতিটি method-এর জন্য একটি class একটা request-কে গুপ্তধন খোঁজার খেলা বানিয়ে ফেলে। আমি নীতি খাটাই তখনই, যখন বলতে পারি এটা কোন বদলকে সস্তা করছে। বলতে না পারলে সহজ code লিখি, আর দ্বিতীয় case সত্যিই এলে refactor করি।

## এরপর কী পড়বেন

- [Chapter ?? — TypeScript-এ Design Pattern](#ch-design-patterns-in-typescript) — যে উপায়গুলো দিয়ে এই নীতিগুলো বাস্তবে আসে
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — পুরো system-এ dependency inversion
- [Chapter ?? — OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) — Liskov লঙ্ঘন আসলে কোথা থেকে আসে
