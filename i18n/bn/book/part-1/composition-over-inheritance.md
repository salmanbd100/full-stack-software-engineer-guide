---
sourceHash: "442c6a6c8b227fbdf7d7e369757d3406d5298cd978b567fcc55c32444f500f09"
title: "OOP ও Inheritance-এর বদলে Composition"
translatedAt: "2026-10-14T04:33:49.666Z"
model: "claude-opus-5-5 (Claude Code)"
---

# OOP ও Inheritance-এর বদলে Composition {#ch-composition-over-inheritance}

> চারটি pillar ব্যাখ্যা করুন তাদের খরচ দিয়ে, বলুন চতুর্থ স্তরে গিয়ে hierarchy কেন আর কাজ করে না, আর দেখান কোন আকার তার জায়গা নেয়।

**এই অধ্যায়ে:** state আর তার নিয়ম · `private` বনাম `#` · structural polymorphism · গভীর hierarchy-র খরচ · has-a, dependency injection আর higher-order function

## 💡 মূল ধারণা

Object-oriented programming একটিমাত্র প্রশ্নের উত্তর দেয়: **state কোথায় থাকে, আর কে তা বদলাতে পারে?** Object-এর
উত্তর: "এখানে, আর শুধু এই method-গুলো দিয়ে।" Encapsulation, inheritance, polymorphism আর abstraction, সবই
এই উত্তর থেকে আসে।

গোলমাল বাধায় inheritance। এটা subclass-কে তার পূর্বপুরুষদের সব কাজের সঙ্গে বেঁধে ফেলে, এমনকি যে অংশ সে কখনো
চায়নি সেটার সঙ্গেও। Composition একটি object-কে বাঁধে শুধু সেই interface-গুলোর সঙ্গে, যেগুলো সে চেয়ে নেয়।
"Composition বেছে নিন" কথাটা রুচির ব্যাপার নয়। কোন বদলগুলো নিরাপদ থাকে, ব্যাপারটা সেটা নিয়ে।

## কীভাবে কাজ করে

### Object মানে state, সঙ্গে তার নিয়ম

```typescript
class Report {
  private readonly audit: { at: Date; action: string }[] = [];

  // Parameter properties declare and assign a field in one place
  constructor(
    public readonly id: string,
    private title: string,
  ) {}

  rename(next: string, by: string): void {
    if (next.trim().length === 0) throw new Error('Title cannot be empty');
    this.title = next;
    this.audit.push({ at: new Date(), action: `renamed by ${by}` });
  }
}
```

"Title কখনো খালি হবে না" নিয়মটা বসে আছে ঠিক সেই field-এর পাশে, যাকে সে পাহারা দেয়। তাই কোনো caller এটা ভাঙতে
পারে না। Audit trail-ও ভুলে যাওয়ার উপায় নেই, কারণ title বদলানোর একমাত্র পথটাই বদলটা লিখে রাখে।

### `private` আসলে কী বোঝায়

| Modifier           | কে আটকায়                  | কে দেখতে পায়                  |
| ------------------ | -------------------------- | ---------------------------- |
| `public` (default) | —                          | সবাই                         |
| `protected`        | Compiler                   | Class আর তার subclass         |
| `private`          | **শুধু compiler**          | Class                        |
| `#field`           | **JavaScript runtime**     | Class, runtime-এও            |

Interview-এর প্রশ্নটা ওই তৃতীয় row-তেই। `(s as any).token` runtime-এ ঠিকই `private` field-এ পৌঁছে যায়।
`s.#secret` হলো `SyntaxError`, কোনো cast দিয়ে একে হারানো যায় না। সাধারণ design boundary-র জন্য `private` দিন।
`#` দিন তখন, যখন value-টা গোলমেলে code-এর কাছেও ফাঁস হওয়া চলবে না, যেমন এমন token, যেটা third-party script-এর
নাগালে যেতে পারে।

> ⚠️ **প্রতিটি field-এর জন্য getter আর setter মানেই encapsulation নয়।** প্রতিটি private field-এর যদি একটা করে
> public জোড়া থাকে, তাহলে object-টা আসলে বাড়তি code সহ data-র একটা থলে। Setter তখনই কাজের, যখন সেটা যাচাই করে,
> normalise করে, বা লিখে রাখে।

### Polymorphism conditional সরিয়ে দেয়

Caller নির্ভর করে একটা shape-এর ওপর, কোনো নির্দিষ্ট type-এর ওপর নয়। তাই নতুন implementation এলে caller-এ হাত
দিতে হয় না। TypeScript **structural**: ঠিক member-গুলো থাকলেই যেকোনো object একটি interface মেনে নেয়,
`implements` লেখা থাকুক বা না থাকুক।

| রূপ            | কীভাবে কাজ করে                                    | কখন ঠিক হয়      |
| -------------- | ------------------------------------------------ | --------------- |
| **Subtype**    | একটি interface, তার কয়েকটি implementation         | Runtime-এ       |
| **Parametric** | Generics — `Repository<T>` যেকোনো `T`-এর জন্য চলে | Compile-time-এ  |
| **Structural** | ঠিক shape থাকলেই যেকোনো object type-এ খাপ খায়    | Compile-time-এ  |

Abstraction-এর জন্য interface-ই ভালো। Abstract class তখনই নিন, যখন implementation-গুলো সত্যিই কোনো আচরণ ভাগ করে।
সাধারণত সেটা হয় ধাপের একটা নির্দিষ্ট ক্রম, যার একটি ধাপ খোলা রাখা: **template method**।

### গভীর hierarchy-র খরচ

```typescript
// ❌ Four levels, and the fourth has to break the contract
class Employee { work(): void {} }
class Manager extends Employee { approve(): void {} }
class RegionalManager extends Manager { setBudget(): void {} }

class ContractRegionalManager extends RegionalManager {
  approve(): never {
    throw new Error('Contractors cannot approve'); // any code holding a Manager can now throw
  }
}
```

ওই override Liskov substitution principle ভাঙে। নীতিটা বলে, parent যেখানে চলে, subtype-কেও সেখানে চলতে হবে। এখন
`Manager` হাতে থাকা code এমন কারণে ব্যর্থ হতে পারে, যা সে দেখতেই পায় না।

| খরচ                              | দেখতে কেমন                                                                 |
| -------------------------------- | -------------------------------------------------------------------------- |
| **ভঙ্গুর base class**            | `Employee`-এ একটা বদল এমন class ভেঙে দেয়, যা তার লেখক কখনো খুলেও দেখেননি    |
| **আচরণ খুঁজে পাওয়া কঠিন**         | "`work` আসলে চলে কোথায়?" জানতে চারটি file ঘাঁটতে হয়                      |
| **শুধু একটি অক্ষ**                | Class-এর parent একটাই, তাই role × contract × region-এর প্রতিটি মিশ্রণে একটি করে class লাগে |

### Is-a-র বদলে has-a

Composition প্রতিটি অক্ষকে আলাদা একটি value হিসেবে ধরে, আর object-কে দেয় শুধু যেগুলো তার দরকার।

```typescript
interface ApprovalRights {
  canApprove(amount: number): boolean;
}

class Staff {
  constructor(
    public readonly name: string,
    private readonly approval: ApprovalRights,
    private readonly budget?: { limit: number },
  ) {}

  approve(amount: number): boolean {
    return this.approval.canApprove(amount) && amount <= (this.budget?.limit ?? 0);
  }
}

const contractor = new Staff('Priya', { canApprove: () => false }); // any mix, no class per mix
```

আচরণটা এখন একটা value। Runtime-এ বদলে দিতে পারেন, আলাদা করে test করতে পারেন, আবার ব্যবহারও করতে পারেন।
Superclass এই তিনটির একটিও দেয় না।

### Dependency injection মানে নিয়ম মেনে composition

Class নিজে collaborator বানায় না। কী কী লাগবে, সেটা declare করে, আর সেগুলো তার হাতে তুলে দেওয়া হয়।

```typescript
class ReportService {
  // Depends on two interfaces — not on Postgres, and not on the system clock
  constructor(
    private readonly store: ReportStore,
    private readonly clock: Clock,
  ) {}

  async isStale(id: string): Promise<boolean> {
    const report = await this.store.findById(id);
    if (report === null) return false;
    return this.clock.now().getTime() - report.updatedAt.getTime() > 86_400_000;
  }
}
```

পুরো যুক্তিটাই testing। ধরুন `ReportService` নিজেই তার database client বানাত আর
`new Date()` call করত। তাহলে "একদিন পরে কি report stale হয়ে যায়?" test করতে লাগত একটা database আর একটা time
machine। দুটিই inject করা থাকলে test-এ লাগে মাত্র দুটি object literal। কোনো class লাগে না, mocking library-ও না।

যে concern অনেক handler ভাগ করে নেয়, যেমন logging বা auth, তাকে বলে cross-cutting concern। এর মধ্যে যেগুলো
stateless, সেগুলোর জন্য **higher-order function**-ও composition। `withAuth(withLogging(getReport))` একটি
handler-কে দুবার মোড়ায়। এটা class ছাড়া decorator pattern।

> ⚠️ **সবকিছু inject করাও একটা দুর্গন্ধ।** নয়টি dependency-ওয়ালা constructor আসলে বলছে, class-টা নয়টি কাজ করে।
> Wiring নয়, class-টাকে ঠিক করুন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                       | কী বেছে নেবেন                 | কেন                                               |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------- |
| সত্যিকারের "is a", স্থির, এক বা দুই স্তর             | Inheritance                   | ভাগ করা code সত্যিই আছে, আর আলাদা হয়ে যাওয়ার সম্ভাবনা কম |
| নির্দিষ্ট algorithm, যার একটি ধাপ বদলায়           | Inheritance (template method) | ধাপের ক্রমটাই ভাগ করা জিনিস                        |
| আচরণ একাধিক অক্ষে বদলায়                          | Composition                   | Single inheritance দুটি অক্ষ প্রকাশ করতে পারে না     |
| বদলানো যায় এমন আচরণ, বা আলাদা করে test             | Composition আর injection      | একটা field বদলান; collaborator বাইরে থেকে দিন       |
| Subclass এমন override লিখবে, যা কিছুই করে না       | Composition                   | ওই override একটা Liskov লঙ্ঘন, ধরা পড়ার অপেক্ষায় |

Framework-এর base class আর error hierarchy-তে inheritance যুক্তিসঙ্গত। যেমন
`class NotFoundError extends HttpError`। নিয়মটা হলো: inheritance উত্তর দেয় "এরা একই আচরণ ভাগ করে" প্রশ্নের,
"এদের কয়েকটি field একই" প্রশ্নের কখনো নয়।

## সাধারণ ভুল

❌ **রক্তশূন্য object।** Public field, আর সেগুলো বদলানোর জন্য আলাদা একটা service — এটা class-এর syntax-এ লেখা
procedural code।
✅ নিয়মটা রাখুন সেই state-এর পাশে, যাকে সে পাহারা দেয়, যাতে ভুল object বানানোই না যায়।

❌ **একটা helper method আবার ব্যবহার করতে inherit করা।** Subclass-কে তখন parent-এর পুরো surface বয়ে বেড়াতে হয়।
✅ Helper-টা কোনো module-এ বা inject করা collaborator-এ সরিয়ে দিন।

❌ **শুরু থেকেই সবকিছুর জন্য interface।** একটিমাত্র implementation-এর সামনে interface মানে শুধু বাড়তি ঘুরপথ।
✅ Interface যোগ করুন দ্বিতীয় implementation এলে, বা যখন সেটা ছাড়া test করাই যায় না।

❌ **Injection-এর বদলে service locator।** যে class `container.get('db')` call করে, সে আবার তার dependency লুকিয়ে
ফেলে।
✅ Dependency নিন constructor parameter হিসেবে, যাতে signature দেখেই সেটা বোঝা যায়।

## 🔑 মূল শিক্ষা

- Object state আর সেই state-এর নিয়ম এক জায়গায় রাখে। প্রতিটি pillar আসে এখান থেকেই।
- TypeScript-এর `private` compile-time-এর check, একটা cast-ই একে হারিয়ে দেয়। `#field` আটকায় runtime।
- TypeScript structural, তাই ঠিক shape-এর যেকোনো object interface মেনে নেয়। Test double বানানো তাই সস্তা।
- আচরণ একাধিক অক্ষে বদলালে hierarchy ভেঙে পড়ে, কারণ class-এর parent ঠিক একটাই।
- Dependency injection হলো collaborator-এর ওপর composition, আর এর লাভ হলো infrastructure ছাড়াই test করা যায় এমন unit।

## Interview-এর প্রশ্ন

**Q: TypeScript class-এ `private` আর `#`-এর পার্থক্য কী?**

`private` আটকায় compiler, তারপর JavaScript থেকে সেটা মুছে ফেলে। তাই `any`-তে cast করলে runtime-এ field-টায় পৌঁছানো
যায়। `#` হলো JavaScript-এর private field, যেটা runtime নিজে আটকায়। বাইরে থেকে পড়তে গেলে syntax error হয়। Design
boundary-র জন্য `private` নিন, আর value ফাঁস হওয়া চলবে না এমন জায়গায় `#`।

**Q: "Inheritance-এর চেয়ে composition ভালো" — কেন?**

Inheritance আপনাকে পূর্বপুরুষদের সব কাজের সঙ্গে বেঁধে ফেলে, অথচ সাধারণত আপনার দরকার ছিল আচরণের একটা টুকরো।
Composition সেই টুকরোটার নাম দেয় আর তাকে বদলানোর মতো করে রাখে। প্রতিটি অংশকে আলাদা করে test করাও যায়। তবে
সত্যিকারের "is a", যার ভাগ করা code একটা স্থির algorithm, সেখানে inheritance এখনো জেতে।

**Q: এমন একটা উদাহরণ দেখান, যেখানে inheritance-ই ঠিক সিদ্ধান্ত।**

Template method: ধাপের একটা নির্দিষ্ট ক্রম, যার একটি ধাপ বদলায়। যেমন আগে validate, তারপর deliver, আর শুধু
deliver-এর ধরন channel অনুযায়ী আলাদা। ভাগ করা জিনিসটা হলো *ক্রম*। Interface এটা প্রকাশ করতে পারে না, আর
composition দিলে প্রতিটি implementation-এ ক্রমটা আবার লিখতে হতো। আরেকটি সৎ উদাহরণ error hierarchy।

**Q: TypeScript structurally typed। এতে কী বদলায়?**

একটার জায়গায় আরেকটা বসানো যাবে কিনা, তা ঠিক হয় shape দেখে, declaration দেখে নয়। Test double আর adapter সস্তা
হয়ে যায়, কারণ একটা object literal-ই dependency-র চাহিদা মেটাতে পারে। কিন্তু একই shape-এর দুটি সম্পর্কহীন type-ও
তখন অদলবদল করা যায়, আর তাতে সত্যিকারের bug চাপা পড়তে পারে। Nominal আচরণ চাইলে, মানে type মিলবে নাম দেখে, তখন
বেরোনোর পথ branded type (এমন type, যাতে আলাদা একটা tag field যোগ করা থাকে)।

## এরপর কী পড়বেন

- [Chapter ?? — SOLID নীতি](#ch-solid-principles) — dependency inversion আর Liskov, নিয়ম হিসেবে লেখা
- [Chapter ?? — TypeScript-এ Design Pattern](#ch-design-patterns-in-typescript) — strategy আর decorator, মানে নাম দেওয়া composition
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — একই ধারণা, পুরো system-এর মাপে
