---
sourceHash: "442c6a6c8b227fbdf7d7e369757d3406d5298cd978b567fcc55c32444f500f09"
title: "OOP ও Inheritance-এর বদলে Composition"
translatedAt: "2026-10-12T07:46:02.402Z"
model: "claude-opus-5-5 (Claude Code)"
---

# OOP এবং Inheritance-এর বদলে Composition {#ch-composition-over-inheritance}

> চারটি স্তম্ভকে তাদের খরচ দিয়ে ব্যাখ্যা করুন। চতুর্থ স্তরে গিয়ে একটা hierarchy কেন আর কাজ করে না, সেটা বলুন। আর কোন আকারগুলো তার জায়গা নেয়, সেটা দেখান।

**এই অধ্যায়ে:** state আর তার নিয়ম · `private` বনাম `#` · structural polymorphism · গভীর hierarchy-র খরচ · has-a, dependency injection আর higher-order function

## 💡 মূল ধারণা

Object-oriented programming একটা প্রশ্নের উত্তর দেয়: **state কোথায় থাকে, আর কে সেটা বদলাতে পারে?**
একটা object-এর উত্তর হলো "এখানে, আর শুধু এই method-গুলোর মাধ্যমে"। Encapsulation, inheritance, polymorphism
আর abstraction — সবই এই উত্তর থেকে আসে।

Inheritance হলো সেই স্তম্ভ, যেটা ভুল পথে যায়। এটা একটা subclass-কে তার পূর্বপুরুষদের সব কাজের সঙ্গে বেঁধে দেয়,
এমনকি যে অংশগুলো সে কখনো চায়নি সেগুলোর সঙ্গেও। Composition একটা object-কে শুধু সেই interface-গুলোর সঙ্গে বাঁধে,
যেগুলো সে চায়। "Composition বেছে নিন" কথাটা রুচির ব্যাপার নয়। কোন পরিবর্তনগুলো নিরাপদ থাকে, এটা তার ব্যাপার।

## কীভাবে কাজ করে

### Object মানে state আর তার নিয়ম

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

"Title কখনো খালি হবে না" — এই নিয়মটা ঠিক সেই field-এর পাশে বসে, যেটাকে সে রক্ষা করে। তাই কোনো caller এটা ভাঙতে
পারে না। Audit trail ভুলে যাওয়ার উপায় নেই, কারণ title বদলানোর একমাত্র পথটাই পরিবর্তনটা record করে।

### `private` আসলে কী বোঝায়

| Modifier           | কে নিশ্চিত করে              | কে দেখতে পায়                   |
| ------------------ | -------------------------- | ---------------------------- |
| `public` (default) | —                          | সবাই                         |
| `protected`        | Compiler                   | Class আর তার subclass-গুলো    |
| `private`          | **শুধু compiler**           | Class                        |
| `#field`           | **JavaScript runtime**     | Class, runtime-এও             |

তৃতীয় সারিটাই interview-এর প্রশ্ন। `(s as any).token` runtime-এ একটা `private` field-এ পৌঁছে যায়।
`s.#secret` একটা `SyntaxError`, যেটা কোনো cast দিয়ে এড়ানো যায় না। সাধারণ design boundary-র জন্য `private` ব্যবহার
করুন। যখন কোনো value খারাপ আচরণ করা code-এর কাছেও ফাঁস হওয়া চলবে না, তখন `#` ব্যবহার করুন। যেমন এমন একটা token,
যেটায় কোনো third-party script পৌঁছে যেতে পারে।

> ⚠️ **প্রতিটা field-এর জন্য একটা getter আর setter মানেই encapsulation নয়।** প্রতিটা private field-এর যদি একটা
> public জোড়া থাকে, তাহলে object-টা শুধু বাড়তি code-সহ একটা data-র থলি। Setter তখনই তার জায়গা পায়, যখন সে
> validate করে, normalise করে বা record করে।

### Polymorphism conditional সরিয়ে দেয়

Caller একটা আকারের ওপর নির্ভর করে, কোনো concrete type-এর ওপর নয়। তাই নতুন implementation এলে caller-কে বদলাতে
হয় না। TypeScript **structural**: সঠিক member-ওয়ালা যেকোনো object একটা interface পূরণ করে, `implements` থাকুক বা
না থাকুক।

| রূপ             | Mechanism                                        | কখন resolve হয়     |
| -------------- | ------------------------------------------------ | --------------- |
| **Subtype**    | একাধিক implementation-ওয়ালা একটা interface        | Runtime-এ        |
| **Parametric** | Generics — `Repository<T>` যেকোনো `T`-এর জন্য কাজ করে | Compile time-এ   |
| **Structural** | সঠিক আকারের যেকোনো object type-এ মিলে যায়          | Compile time-এ   |

Abstraction-এর জন্য interface বেছে নিন। Abstract class-এর দিকে তখনই যান, যখন implementation-গুলো সত্যিকারের
behaviour ভাগ করে। সাধারণ ক্ষেত্রটা হলো ধাপগুলোর একটা নির্দিষ্ট ক্রম, যার একটা ধাপ খোলা রাখা: **template method**।

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

ওই override-টা Liskov substitution principle ভাঙে। এই নীতি বলে, parent যেখানে কাজ করে, subtype-কেও সেখানে কাজ
করতে হবে। যে code-এর হাতে একটা `Manager` আছে, সেটা এখন এমন কারণে fail করতে পারে, যেটা সে দেখতেই পায় না।

| খরচ                              | দেখতে কেমন                                                                 |
| -------------------------------- | -------------------------------------------------------------------------- |
| **ভঙ্গুর base class**             | `Employee`-এ একটা পরিবর্তন এমন class ভেঙে দেয়, যেগুলো তার লেখক কখনো খোলেনইনি |
| **Behaviour খুঁজে পাওয়া কঠিন**     | "`work` আসলে কোথায় চলে?" — জানতে চারটা file লাগে                            |
| **শুধু একটা axis**                 | একটা class-এর parent একটাই, তাই role × contract × region-এর প্রতিটা মিশ্রণের জন্য একটা করে class লাগে |

### Is-a-এর বদলে has-a

Composition প্রতিটা axis-কে আলাদা value হিসেবে model করে। তারপর object-কে শুধু তার দরকারি value-গুলো দেয়।

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

Behaviour এখন একটা value। আপনি এটাকে runtime-এ বদলাতে পারেন, আলাদা করে test করতে পারেন, আবার ব্যবহার করতে
পারেন। একটা superclass এই তিনটার কোনোটাই দেয় না।

### Dependency injection হলো নিয়ম-মানা composition

একটা class তার দরকারি collaborator-গুলো ঘোষণা করে। তারপর সেগুলো তাকে দিয়ে দেওয়া হয়, সে নিজে বানায় না।

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

পুরো যুক্তিটাই testing। ধরুন `ReportService` নিজের database client নিজেই বানাত, আর `new Date()` call করত। তাহলে
"একদিন পরে কি একটা report stale হয়ে যায়?" — এটা test করতে একটা database আর একটা time machine লাগত। দুটোই inject
করা থাকলে test হলো দুটো object literal। কোনো class লাগে না, কোনো mocking library-ও লাগে না।

Cross-cutting concern হলো এমন বিষয়, যেটা অনেক handler ভাগ করে নেয়, যেমন logging বা auth। Stateless concern-এর
জন্য একটা **higher-order function**-ও composition। `withAuth(withLogging(getReport))` একটা handler-কে দুবার মোড়ায়।
এটাই class ছাড়া decorator pattern।

> ⚠️ **সবকিছু inject করাও একটা আলাদা দুর্গন্ধ।** নয়টা dependency-ওয়ালা একটা constructor আপনাকে বলছে যে class-টা
> নয়টা কাজ করে। Wiring নয়, class-টা ঠিক করুন।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                          | বেছে নিন                       | কেন                                               |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------- |
| সত্যিকারের "is a", স্থির, এক বা দুই স্তর             | Inheritance                   | ভাগ করা code-টা বাস্তব, আর আলাদা হয়ে যাওয়ার সম্ভাবনা কম |
| একটা নির্দিষ্ট algorithm, যার একটা ধাপ বদলায়         | Inheritance (template method) | ক্রমটাই হলো ভাগ করা জিনিস                           |
| Behaviour একাধিক axis-এ বদলায়                     | Composition                   | Single inheritance দুটো axis প্রকাশ করতে পারে না     |
| বদলানো যায় এমন behaviour, বা আলাদা করে test          | Composition আর injection      | একটা field বদলান; একটা collaborator পাঠিয়ে দিন      |
| একটা subclass কোনো method override করে কিছুই করবে না | Composition                   | ওই override হলো একটা Liskov লঙ্ঘন, যেটা ধরা পড়ার অপেক্ষায় |

Framework-এর base class আর error hierarchy হলো যুক্তিসংগত inheritance। একটা উদাহরণ হলো
`class NotFoundError extends HttpError`। নিয়মটা হলো: inheritance উত্তর দেয় "এগুলো behaviour ভাগ করে",
কখনোই "এগুলো কিছু field ভাগ করে" নয়।

## সাধারণ ভুল

❌ **রক্তশূন্য (anaemic) object।** Public field, আর সেগুলো বদলানোর জন্য একটা আলাদা service — এটা class syntax-এ
লেখা procedural code।
✅ নিয়মটা যে state-কে রক্ষা করে, তার পাশেই রাখুন। তাহলে কোনো invalid object বানানোই যাবে না।

❌ **একটা helper method আবার ব্যবহারের জন্য inherit করা।** Subclass এখন parent-এর পুরো surface বয়ে বেড়ায়।
✅ Helper-টাকে একটা module-এ বা একটা inject করা collaborator-এ সরিয়ে দিন।

❌ **শুরু থেকেই সবকিছুর জন্য একটা interface।** একটা interface-এর পেছনে একটাই implementation মানে শুধু
indirection।
✅ দ্বিতীয় implementation এলে interface যোগ করুন, অথবা যখন সেটাই test-কে সম্ভব করে।

❌ **Injection-এর বদলে service locator।** যে class `container.get('db')` call করে, সে আবার তার dependency-গুলো
লুকিয়ে ফেলে।
✅ Dependency-টা constructor parameter হিসেবে নিন, যাতে signature-টাই সেটা document করে।

## 🔑 মূল শিক্ষা

- একটা object state আর সেই state-এর নিয়মগুলো এক জায়গায় রাখে। প্রতিটা স্তম্ভ এখান থেকেই আসে।
- TypeScript-এর `private` একটা compile-time check, যেটা একটা cast দিয়েই এড়ানো যায়। `#field` নিশ্চিত করে runtime।
- TypeScript structural, তাই সঠিক আকারের যেকোনো object একটা interface পূরণ করে। এতে test double সস্তা হয়।
- Behaviour একাধিক axis-এ বদলালে hierarchy ভেঙে পড়ে, কারণ একটা class-এর parent ঠিক একটাই।
- Dependency injection হলো collaborator-দের ওপর composition প্রয়োগ। এর লাভ হলো এমন একটা unit, যেটা infrastructure ছাড়াই test করা যায়।

## Interview-এর প্রশ্ন

**Q: একটা TypeScript class-এ `private` আর `#`-এর পার্থক্য কী?**

Compiler `private` নিশ্চিত করে, তারপর JavaScript থেকে সেটা মুছে ফেলে। তাই `any`-তে একটা cast runtime-এ field-টায়
পৌঁছে যায়। `#` হলো JavaScript-এর private field, যেটা runtime নিশ্চিত করে। বাইরে থেকে এটা পড়া একটা syntax error।
Design boundary-র জন্য `private`, আর value ফাঁস হওয়া চলবে না এমন ক্ষেত্রে `#` ব্যবহার করুন।

**Q: "Inheritance-এর বদলে composition বেছে নিন" — কেন?**

Inheritance আপনাকে পূর্বপুরুষদের সব কাজের সঙ্গে বেঁধে দেয়, অথচ সাধারণত আপনার দরকার ছিল behaviour-এর একটা টুকরো।
Composition সেই টুকরোটার একটা নাম দেয় আর সেটাকে বদলানো যায় এমন করে তোলে। প্রতিটা অংশকে আলাদা করে test করার
সুযোগও রাখে। তবে সত্যিকারের "is a"-র ক্ষেত্রে, যেখানে ভাগ করা code একটা স্থির algorithm, inheritance এখনো জেতে।

**Q: এমন একটা ক্ষেত্র দেখান, যেখানে inheritance-ই সঠিক সিদ্ধান্ত।**

Template method: একটা নির্দিষ্ট ক্রম, যার একটা ধাপ বদলায়। যেমন আগে validate, তারপর deliver, যেখানে শুধু delivery
channel অনুযায়ী আলাদা। ভাগ করা জিনিসটা হলো *ক্রম*। একটা interface এটা প্রকাশ করতে পারে না, আর composition প্রতিটা
implementation-এ এটা বারবার লিখত। Error hierarchy হলো অন্য সৎ ক্ষেত্রটা।

**Q: TypeScript structurally typed। এতে কী বদলায়?**

Substitutability নির্ভর করে আকারের ওপর, declaration-এর ওপর নয়। Test double আর adapter সস্তা হয়ে যায়, কারণ একটা
object literal-ই একটা dependency পূরণ করতে পারে। কিন্তু একই আকারের দুটো সম্পর্কহীন type-ও তখন একটার জায়গায় আরেকটা
বসানো যায়, আর এতে একটা আসল bug লুকিয়ে থাকতে পারে। যখন nominal behaviour দরকার, অর্থাৎ type মেলে নাম দিয়ে, তখন
বের হওয়ার পথ হলো একটা branded type (একটা অনন্য tag field যোগ করা type)।

## এরপর কী পড়বেন

- [Chapter ?? — SOLID নীতি](#ch-solid-principles) — dependency inversion আর Liskov, নিয়ম হিসেবে বলা
- [Chapter ?? — TypeScript-এ Design Pattern](#ch-design-patterns-in-typescript) — strategy আর decorator, যেগুলো আসলে নাম-দেওয়া composition
- [Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries) — একই ধারণা, পুরো system-এর মাপে
