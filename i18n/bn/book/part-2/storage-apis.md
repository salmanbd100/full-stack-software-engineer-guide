---
sourceHash: "4afe78c16821633ea91ec97aa4264c9b45c3a1addd49b392f7d142f31bab578a"
title: "Web Storage ও IndexedDB"
translatedAt: "2026-10-14T04:51:44.247Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Web Storage ও IndexedDB {#ch-storage-apis}

> localStorage, sessionStorage আর IndexedDB-র মধ্যে জেনে-বুঝে বাছাই করুন, আর জেনে রাখুন কেন এদের কোনোটাতেই token রাখা উচিত নয়।

**এই অধ্যায়ে:** localStorage বনাম sessionStorage · tab জুড়ে `storage` event · quota আর eviction · কখন IndexedDB-র জটিলতা পোষায় · transaction আর migration

## 💡 মূল ধারণা

Browser সাধারণ storage দেয় দুই রকম। **Web storage** মানে `localStorage` আর `sessionStorage`। এটা ছোট,
synchronous, শুধু string রাখে এমন key-value cache। **IndexedDB** একটা asynchronous database, যা পুরো object রাখে,
index করে, আর কয়েকশো megabyte ধরে রাখতে পারে।

কোনোটাই security boundary নয়। আপনার পাতার যেকোনো script দুটিই পড়তে পারে। আর কোনোটাই টিকে থাকবে, এমন নিশ্চয়তা
নেই, কারণ storage-এর চাপে browser যেকোনোটাকে evict (মুছে) করতে পারে। তাই দুটির নিয়ম একই। Value হারালে যদি app
ভাঙে, বা ফাঁস হলে যদি ক্ষতি হয়, তাহলে তার জায়গা অন্য কোথাও।

```typescript
localStorage.setItem("theme", "dark");
const theme: string | null = localStorage.getItem("theme"); // "dark", or null if missing
```

> ⚠️ **যা বদলাতে থাকে:** browser এখন top-level site ধরে storage ভাগ করে, তাই দুটি আলাদা parent site-এ embed করা একই
> origin দুটি আলাদা store দেখে। Eviction-এর নিয়মও browser ভেদে আলাদা, আর বদলাতেই থাকে। টেকসই নীতি হলো, এটা
> same-origin storage, যার কোনো security boundary নেই, আর টিকে থাকার কোনো প্রতিশ্রুতিও নেই।

## কীভাবে কাজ করে

### Web storage-এর দুটি object

| বৈশিষ্ট্য | `localStorage` | `sessionStorage` |
| ------- | -------------- | ---------------- |
| **আয়ু** | কেউ মুছে না দেওয়া পর্যন্ত | Tab বন্ধ হওয়া পর্যন্ত |
| **পরিধি** | Origin-এর সব tab ভাগ করে নেয় | শুধু একটি tab |
| **Tab জুড়ে event** | ✅ `storage` fire করে | ❌ না |
| **আকার** | Origin প্রতি ~5–10 MB | Origin প্রতি ~5–10 MB |

Value সবসময় string, তাই object-কে `JSON` হয়ে যেতে হয়। Parse করার সময় `try`/`catch` লাগে। User, বা আপনার নিজের
app-এর পুরনো কোনো version, ভুল JSON রেখে যেতে পারে, আর start-up-এ ধরা না পড়া parse error পুরো পাতাটাই ফেলে দেয়।

**একটা typed wrapper, যাতে call-এর জায়গায় আনুষ্ঠানিকতা লাগে না:**

```typescript
class TypedStorage<T> {
  constructor(private readonly key: string, private readonly storage: Storage = localStorage) {}

  get(): T | null {
    const raw = this.storage.getItem(this.key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null; // Corrupt, or edited by hand in DevTools
    }
  }

  set(value: T): void {
    this.storage.setItem(this.key, JSON.stringify(value));
  }
}
```

### Tab জুড়ে sync

`localStorage`-এ লিখলে একই origin-এর **অন্য** tab-গুলোতে `storage` event fire হয়। যে tab বদলটা করেছে, সেখানে হয়
না। Interviewer-রা জিজ্ঞেস করেন ঠিক এই খুঁটিনাটিটাই।

```typescript
window.addEventListener("storage", (e: StorageEvent): void => {
  if (e.key === "theme") document.documentElement.dataset.theme = e.newValue ?? "light";
});
```

Theme sync আর একসঙ্গে সব tab থেকে logout, দুটিই এতে হয়ে যায়। যে message পাঠানো tab-টাতেও পৌঁছানো দরকার, তার জন্য
`BroadcastChannel` বেশি সহজ।

### Quota আর eviction

Quota ছাড়িয়ে লিখতে গেলে `QuotaExceededError` throw হয়। Private browsing-এ storage পুরো বন্ধও থাকতে পারে, তাই
storage আছে কিনা জানার একমাত্র নির্ভরযোগ্য উপায় `try`-এর ভেতরে একবার লিখে দেখা। `navigator.storage.estimate()` web
storage, IndexedDB আর Cache API মিলিয়ে আসল ব্যবহার জানায়। তাতে limit এগিয়ে আসছে কিনা দেখা যায়।
`navigator.storage.persist()` browser-কে evict না করার অনুরোধ করে, কিন্তু সেটা অনুরোধ, প্রতিশ্রুতি নয়।

### কখন IndexedDB-র জটিলতা পোষায়

IndexedDB ব্যবহার করা ঝামেলার, আর ঝামেলার কারণ একটাই। Storage থাকে disk-এ, আর main thread-এ synchronous disk read
হলে rendering আর input দুটিই জমে যায়। তাই IndexedDB-র প্রতিটি operation একটা request return করে, উত্তর দেয় পরে।

| শব্দ | মানে |
| ---- | ------- |
| **Object store** | Table-এর মতো — একই ধরনের object রাখে |
| **Key** | প্রতিটি record-এর আলাদা ID, `keyPath` বা `autoIncrement` থেকে |
| **Index** | কোনো property ধরে দ্বিতীয় একটা lookup, যেমন `by-updatedAt` |
| **Transaction** | `readonly` বা `readwrite` একটা পরিধি, যা একসঙ্গে commit বা rollback হয় |
| **Version** | একটা সংখ্যা। Schema বদলায় শুধু এটা বাড়লেই |

Production-এ কাঁচা event-ভিত্তিক API প্রায় কেউই ব্যবহার করেন না। `idb` wrapper একই model-কে promise আর TypeScript
generics-এর পেছনে রাখে।

**`idb` দিয়ে open, migrate আর query করা:**

```typescript
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface Note {
  id: number;
  title: string;
  updatedAt: number;
}

interface NotesDB extends DBSchema {
  notes: { key: number; value: Note; indexes: { "by-updatedAt": number } };
}

async function getDB(): Promise<IDBPDatabase<NotesDB>> {
  return openDB<NotesDB>("notes-app", 2, {
    // Runs only when the stored version is lower. The only place schema may change.
    upgrade(db, oldVersion) {
      if (oldVersion < 1) db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
      if (oldVersion < 2) db.transaction.objectStore("notes").createIndex("by-updatedAt", "updatedAt");
    },
  });
}

const db = await getDB();
const since: number = Date.now() - 86_400_000;
const recent: Note[] = await db.getAllFromIndex("notes", "by-updatedAt", IDBKeyRange.lowerBound(since));
```

`oldVersion` check-গুলোই migration-এর pattern। প্রতিটি ধাপ একবার করে, ক্রম মেনে চলে, তাই তিনটি release বাদ দেওয়া
user-ও বর্তমান schema-তে পৌঁছে যান।

> ⚠️ Event loop-এর পালা শেষ হলেই transaction commit হয়। মাঝখানে কোনো `fetch`-এর জন্য `await` করলে transaction বন্ধ
> হয়ে যায়, আর পরের IndexedDB call throw করে। আগে fetch করুন, তারপর transaction খুলুন।

## কখন ব্যবহার করবেন

| দরকার | কী নেবেন | কেন |
| ---- | ---- | --- |
| Theme, ভাষা, ছোট কোনো পছন্দ | `localStorage` | ছোট, হারালে ক্ষতি নেই, প্রতিটি tab-এ চাই |
| এই tab-এর form draft বা wizard-এর state | `sessionStorage` | একই form পূরণ করা দুটি tab-এ যেন ধাক্কা না লাগে |
| ~5 MB-এর বেশি, query, বা `Blob` | IndexedDB | Asynchronous, index করা, binary data রাখে |
| Offline record আর বাকি থাকা write-এর queue | IndexedDB | Transaction আছে শুধু এরই |
| Service worker যে HTTP response আবার দেয় | Cache API | Key হিসেবে `Request`, ফেরত দেয় `Response` |
| Token, ব্যক্তিগত data, স্পর্শকাতর যেকোনো কিছু | **এদের কোনোটাই নয়** | `HttpOnly` cookie, যা script পড়তে পারে না |

## সাধারণ ভুল

**❌ ভুল — `localStorage`-এ token:**

```typescript
// One injected script sends this to an attacker.
localStorage.setItem("authToken", "eyJhbGci...");
```

**✅ ঠিক — এমন cookie, যা JavaScript পড়তে পারে না:**

```typescript
// Set by the server, never by client code:
// Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax
```

প্রথম line তিনভাবে ব্যর্থ। XSS সরাসরি এটা পড়ে ফেলে। এটা disk-এ সাধারণ লেখা হিসেবে পড়ে থাকে। আর এর কোনো মেয়াদ
নেই, তাই ভুলে যাওয়া token চিরকাল বেঁচে থাকে।

**❌ ভুল — hot path-এ web storage পড়া।** API-টা synchronous। Scroll-এর সময় বড় একটা `JSON.parse` main thread-এ পড়ে,
আর একটা frame পড়ে যাওয়া হিসেবে দেখা দেয়।

**❌ ভুল — `upgrade`-এর বাইরে schema বদলানো।** অন্য কোথাও `createObjectStore` call করলে throw করে। নতুন store বা
index মানে প্রতিবারই version বাড়ানো।

**❌ ভুল — যা ফেরত আসে তা বিশ্বাস করা।** User DevTools-এ প্রতিটি store edit করতে পারেন। যে shape-এর ওপর নির্ভর করেন,
সেটা যাচাই করুন, ঠিক server response-এর মতো।

## 🔑 মূল শিক্ষা

- পাতার প্রতিটি script web storage আর IndexedDB পড়তে পারে, আর browser দুটিকেই evict করতে পারে, তাই কোনোটাতেই গোপন বা অপূরণীয় data রাখা চলে না।
- `localStorage` সব tab ভাগ করে নেয় আর tab বন্ধ হলেও থেকে যায়। `sessionStorage` একটি tab-এর, tab-এর সঙ্গেই মরে।
- `storage` event সেই tab ছাড়া বাকি সব tab-এ পৌঁছায়, যেটা value লিখেছে।
- IndexedDB asynchronous, কারণ synchronous disk access পাতাকে জমিয়ে দিত। এর খরচ পোষায় ~5 MB-এর বেশি হলে, binary data, query বা offline write-এর জন্য।
- Schema বদলায় শুধু upgrade handler-এর ভেতরে। ভেতরে অসম্পর্কিত কাজের জন্য await করলে transaction বন্ধ হয়ে যায়।

## Interview-এর প্রশ্ন

**Q: `localStorage` আর `sessionStorage`-এর পার্থক্য কী?**

দুটিই origin-এর পরিধিতে key-value store। `localStorage` না মোছা পর্যন্ত থাকে, আর সব tab ভাগ করে নেয়।
`sessionStorage` tab বন্ধ হলে মুছে যায়, আর শুধু সেই tab-এর, তাই form draft-এর জন্য এটাই ঠিক। `storage` event fire
করে শুধু `localStorage`, তাই tab জুড়ে sync চালায় শুধু সেটাই।

**Q: User এক tab-এ logout করলেন। বাকি খোলা tab-গুলো কীভাবে জানবে?**

Logout-এর সময় `localStorage`-এ একটা চিহ্ন লিখুন। Origin-এর বাকি প্রতিটি tab-এ `storage` event fire হয়, আর প্রতিটি
tab নিজের state মুছে redirect করে। যে tab লিখেছে, সে কোনো event পায় না, তাই নিজের logout সে সরাসরি সামলায়।
`BroadcastChannel` একই কাজ করে আরও পরিষ্কার message API দিয়ে। যেভাবেই করুন, server-কেও session শেষ করতে হবে, কারণ
ঘুমিয়ে থাকা tab event শুনবে না।

**Q: কখন `localStorage`-এর বদলে IndexedDB বেছে নেবেন?**

চারটি শর্তের যেকোনো একটি খাটলে। কয়েক megabyte-এর বেশি রাখছেন, object-এর field ধরে query করছেন, `Blob`-এর মতো
binary data রাখছেন, বা কোনো read এত বড় যে synchronous হলে একটা frame খেয়ে ফেলত। অল্প কয়েকটি ছোট string-এর জন্য
IndexedDB মানে কোনো লাভ ছাড়া জটিলতা।

**Q: IndexedDB-র schema migration কীভাবে কাজ করে?**

প্রতিটি database-এর একটা version আছে। বড় সংখ্যা দিয়ে খুললে upgrade handler fire হয়, আর schema-র প্রতিটি বদল সেখানেই
করতে হয়। পুরনো version দেখে branch করলে প্রতিটি ধাপ একবার করে, ক্রম মেনে চলে, তাই কয়েকটি release পিছিয়ে থাকা user-ও
বর্তমান schema-তে পৌঁছান।

**Q: Quota ছুঁয়ে ফেললে কী হয়?**

Write `QuotaExceededError` throw করে। তাই যে store বাড়তে পারে, তার `try`/`catch` আর একটা পরিষ্কারের ধাপ লাগে, যেমন TTL
(time-to-live) ধরে ঝাড়ু দেওয়া, বা সবচেয়ে কম সম্প্রতি ব্যবহার হওয়াগুলো সরানো। `navigator.storage.estimate()` দিয়ে
limit-এ পৌঁছানোর আগেই তা দেখা যায়, সব store মিলিয়ে একসঙ্গে।

## এরপর কী পড়বেন

- [Chapter ?? — Cookie ও SameSite](#ch-cookies-same-site) — session token-এর জায়গা কোথায়, আর `SameSite` আসলে কী রক্ষা করে
- [Chapter ?? — Service Worker, Caching ও Offline](#ch-service-workers) — Cache API, আর IndexedDB-তে থাকা offline write queue
- [Chapter ?? — XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention) — যে attack-এর কারণে token-এর নিয়মটা গুরুত্বপূর্ণ
