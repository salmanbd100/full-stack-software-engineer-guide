---
sourceHash: "4afe78c16821633ea91ec97aa4264c9b45c3a1addd49b392f7d142f31bab578a"
title: "Web Storage ও IndexedDB"
translatedAt: "2026-10-12T12:10:22.893Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Web Storage ও IndexedDB {#ch-storage-apis}

> localStorage, sessionStorage আর IndexedDB-এর মধ্যে ভেবেচিন্তে বেছে নিন, আর জানুন কেন এদের কোনোটাতেই token রাখা উচিত নয়।

**এই অধ্যায়ে:** localStorage বনাম sessionStorage · cross-tab `storage` event · quota আর eviction · কখন IndexedDB তার জটিলতার যোগ্য · transaction আর migration

## 💡 মূল ধারণা

Browser দুই ধরনের সাধারণ storage দেয়। **Web storage** মানে `localStorage` আর
`sessionStorage`। এটা একটি ছোট, synchronous, শুধু string রাখা key-value cache। **IndexedDB** একটি asynchronous
database, যেটা পুরো object রাখে, সেগুলোকে index করে, আর কয়েকশো megabyte ধরে রাখতে পারে।

কোনোটাই security boundary নয়। আপনার page-এর যেকোনো script দুটোই পড়তে পারে। আর কোনোটারই টিকে থাকার নিশ্চয়তা
নেই, কারণ storage-এর চাপে browser যেকোনোটাকে evict (মুছে) করতে পারে। তাই দুটোর জন্য নিয়ম একই। Value হারালে যদি
app ভেঙে যায়, বা ফাঁস হলে যদি সমস্যা হয়, তাহলে সেটা অন্য কোথাও রাখুন।

```typescript
localStorage.setItem("theme", "dark");
const theme: string | null = localStorage.getItem("theme"); // "dark", or null if missing
```

> ⚠️ **যা বদলাতে থাকে:** browser-গুলো এখন storage-কে top-level site অনুযায়ী ভাগ করে। তাই দুটো আলাদা parent site-এ
> embed করা একই origin দুটো আলাদা store দেখে। Eviction-এর নিয়মও browser ভেদে আলাদা, আর বদলাতে থাকে। টেকসই নীতি
> হলো, এটা same-origin storage, যার কোনো security boundary নেই আর টিকে থাকার কোনো প্রতিশ্রুতি নেই।

## কীভাবে কাজ করে

### দুটো web storage object

| Feature | `localStorage` | `sessionStorage` |
| ------- | -------------- | ---------------- |
| **আয়ু** | যতক্ষণ না কিছু এটা মুছে দেয় | Tab বন্ধ হওয়া পর্যন্ত |
| **Scope** | Origin-এর প্রতিটি tab ভাগ করে | শুধু একটি tab |
| **Cross-tab event** | ✅ `storage` fire করে | ❌ না |
| **Size** | প্রতি origin-এ ~5–10 MB | প্রতি origin-এ ~5–10 MB |

Value সবসময় string, তাই object-গুলো `JSON`-এর মধ্য দিয়ে যায়। Parse-এর জন্য একটি `try`/`catch` লাগে। একজন user,
বা আপনার নিজের app-এর একটি পুরোনো version, invalid JSON রেখে যেতে পারে। আর start-up-এ একটি uncaught parse error
পুরো page নামিয়ে দেয়।

**একটি typed wrapper, যেটা call site থেকে আনুষ্ঠানিকতা সরিয়ে দেয়:**

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

### Cross-tab sync

একটি `localStorage` write একই origin-এর **অন্য** tab-গুলোতে একটি `storage` event fire করে। যে tab পরিবর্তনটা
করেছে, সেখানে এটা fire হয় না। Interviewer-রা ঠিক এই খুঁটিনাটি নিয়েই প্রশ্ন করেন।

```typescript
window.addEventListener("storage", (e: StorageEvent): void => {
  if (e.key === "theme") document.documentElement.dataset.theme = e.newValue ?? "light";
});
```

এটা দিয়ে theme sync আর একসঙ্গে প্রতিটি tab থেকে logout করা যায়। যে message পাঠানো tab-এও পৌঁছানো উচিত, তার জন্য
`BroadcastChannel` সহজতর tool।

### Quota আর eviction

Quota ছাড়িয়ে যাওয়া একটি write `QuotaExceededError` throw করে। Private browsing storage পুরোপুরি বন্ধ করে দিতে পারে।
তাই একটি `try`-এর ভেতরে write করাই একমাত্র নির্ভরযোগ্য availability check। `navigator.storage.estimate()`
web storage, IndexedDB আর Cache API মিলিয়ে আসল ব্যবহার জানায়। এতে limit কাছে আসছে কি না দেখা যায়।
`navigator.storage.persist()` browser-কে evict না করতে অনুরোধ করে, কিন্তু এটা একটি অনুরোধ, প্রতিশ্রুতি নয়।

### কখন IndexedDB তার জটিলতার যোগ্য

IndexedDB ব্যবহার করা ঝামেলার, আর এই ঝামেলার একটিই কারণ। Storage থাকে disk-এ, আর main thread-এ একটি synchronous
disk read rendering আর input-কে জমিয়ে দেয়। তাই প্রতিটি IndexedDB operation একটি request return করে, আর উত্তর
দেয় পরে।

| শব্দ | অর্থ |
| ---- | ------- |
| **Object store** | একটি table-এর মতো — এক ধরনের object রাখে |
| **Key** | প্রতিটি record-এর অনন্য ID, একটি `keyPath` বা `autoIncrement` থেকে |
| **Index** | একটি property-র ওপর দ্বিতীয় একটি lookup, যেমন `by-updatedAt` |
| **Transaction** | একটি `readonly` বা `readwrite` scope, যেটা একসঙ্গে commit বা roll back হয় |
| **Version** | একটি সংখ্যা। Schema পরিবর্তন হয় শুধু এটা বাড়লে |

Production-এ প্রায় কেউই raw event-ভিত্তিক API ব্যবহার করে না। `idb` wrapper একই model-কে promise আর TypeScript
generic-এর পেছনে রাখে।

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

`oldVersion` check-গুলোই migration pattern। প্রতিটি ধাপ একবার, ক্রম অনুযায়ী চলে। তাই যে user তিনটি release বাদ
দিয়েছেন, তিনিও বর্তমান schema-তে পৌঁছান।

> ⚠️ একটি transaction commit হয়, যখন তার event-loop turn শেষ হয়। মাঝখানে একটি `fetch`-কে `await` করলে
> transaction বন্ধ হয়ে যায়, আর পরের IndexedDB call throw করে। আগে fetch করুন, তারপর transaction খুলুন।

## কখন ব্যবহার করবেন

| প্রয়োজন | বেছে নিন | কেন |
| ---- | ---- | --- |
| Theme, ভাষা, একটি ছোট preference | `localStorage` | ছোট, হারালে ক্ষতি নেই, প্রতিটি tab-এ দরকার |
| এই tab-এর form draft বা wizard state | `sessionStorage` | একই form পূরণ করা দুটো tab-এর মধ্যে সংঘর্ষ হওয়া চলবে না |
| ~5 MB-এর বেশি, query, বা `Blob` | IndexedDB | Asynchronous, indexed, binary data রাখে |
| Offline record আর pending write-এর একটি queue | IndexedDB | শুধু এরই transaction আছে |
| যে HTTP response একটি service worker আবার চালায় | Cache API | `Request` দিয়ে key করা, একটি `Response` return করে |
| Token, ব্যক্তিগত data, যেকোনো সংবেদনশীল কিছু | **এদের কোনোটাই নয়** | একটি `HttpOnly` cookie, যেটা script পড়তে পারে না |

## সাধারণ ভুল

**❌ ভুল — `localStorage`-এ একটি token:**

```typescript
// One injected script sends this to an attacker.
localStorage.setItem("authToken", "eyJhbGci...");
```

**✅ সঠিক — এমন একটি cookie, যেটা JavaScript পড়তে পারে না:**

```typescript
// Set by the server, never by client code:
// Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax
```

প্রথম line-টি তিনভাবে ব্যর্থ হয়। একটি XSS এটা সরাসরি পড়ে ফেলে। এটা disk-এ plain text হিসেবে বসে থাকে। আর এর
কোনো expiry নেই, তাই ভুলে যাওয়া একটি token চিরকাল বেঁচে থাকে।

**❌ ভুল — একটি hot path-এ web storage পড়া।** API-টি synchronous। Scroll-এর সময় একটি বড় `JSON.parse` main
thread-এ পড়ে, আর একটি drop হওয়া frame হিসেবে দেখা দেয়।

**❌ ভুল — `upgrade`-এর বাইরে schema বদলানো।** অন্য কোথাও `createObjectStore` throw করে। নতুন store বা index মানেই
একটি version বাড়ানো, প্রতিবার।

**❌ ভুল — যা ফেরত আসে তার ওপর ভরসা করা।** User-রা DevTools-এ প্রতিটি store edit করতে পারেন। আপনি যে shape-এর
ওপর নির্ভর করেন, সেটা validate করুন, ঠিক যেমন একটি server response করতেন।

## 🔑 মূল শিক্ষা

- Page-এর প্রতিটি script web storage আর IndexedDB পড়তে পারে, আর browser দুটোকেই evict করতে পারে। তাই কোনোটাই secret বা অপূরণীয় data রাখে না।
- `localStorage` সব tab ভাগ করে, আর tab বন্ধ হলেও থেকে যায়। `sessionStorage` একটি tab-এর, আর tab-এর সঙ্গেই মরে যায়।
- `storage` event প্রতিটি tab-এ পৌঁছায়, শুধু যে tab value লিখেছে সেটা ছাড়া।
- IndexedDB asynchronous, কারণ synchronous disk access page-কে জমিয়ে দিত। ~5 MB-এর বেশি হলে, binary data, query বা offline write-এর জন্য এটা তার খরচের যোগ্য।
- Schema পরিবর্তন হয় শুধু upgrade handler-এর ভেতরে। Transaction-এর ভেতরে অসম্পর্কিত কাজ await করলে transaction বন্ধ হয়ে যায়।

## Interview-এর প্রশ্ন

**Q: `localStorage` আর `sessionStorage`-এর পার্থক্য কী?**

দুটোই origin-এর scope-এ থাকা key-value store। `localStorage` মুছে না দেওয়া পর্যন্ত থাকে, আর প্রতিটি tab এটা ভাগ
করে। `sessionStorage` tab বন্ধ হলে মুছে যায়, আর শুধু সেই tab-এরই থাকে। তাই form draft-এর জন্য এটা ঠিক। শুধু
`localStorage` `storage` event fire করে, তাই শুধু এটাই cross-tab sync চালায়।

**Q: একজন user একটি tab-এ logout করলেন। বাকি খোলা tab-গুলো কীভাবে জানবে?**

Logout-এর সময় `localStorage`-এ একটি marker লিখুন। Origin-এর বাকি প্রতিটি tab-এ `storage` event fire হয়, আর প্রতিটি
tab নিজের state মুছে redirect করে। যে tab লিখেছে, সে কোনো event পায় না, তাই সে নিজের logout সরাসরি সামলায়।
`BroadcastChannel` একই কাজ করে, আরও পরিচ্ছন্ন একটি message API দিয়ে। যেভাবেই করুন, server-কেও session শেষ করতে
হবে, কারণ ঘুমিয়ে থাকা একটি tab event শুনতে পাবে না।

**Q: কখন আপনি `localStorage`-এর বদলে IndexedDB বেছে নেবেন?**

যখন চারটি জিনিসের যেকোনো একটি সত্য। আপনি কয়েক megabyte-এর বেশি রাখছেন, object-এর field-এর ওপর query করছেন,
`Blob`-এর মতো binary data রাখছেন, অথবা একটি read এত বড় যে synchronous-ভাবে চললে একটি frame খরচ হতো। হাতে গোনা
কয়েকটি ছোট string-এর জন্য IndexedDB হলো লাভহীন জটিলতা।

**Q: IndexedDB schema migration কীভাবে কাজ করে?**

প্রতিটি database-এর একটি version থাকে। বড় সংখ্যা দিয়ে খুললে upgrade handler fire হয়, আর প্রতিটি schema পরিবর্তন
সেখানেই করতে হয়। পুরোনো version অনুযায়ী branch করলে প্রতিটি ধাপ একবার আর ক্রম অনুযায়ী চলে। তাই কয়েকটি release
পিছিয়ে থাকা একজন user-ও বর্তমান schema-তে পৌঁছান।

**Q: Quota-তে পৌঁছালে কী হয়?**

Write `QuotaExceededError` throw করে। তাই যে store বাড়তে পারে, তার একটি `try`/`catch` আর একটি cleanup pass লাগে।
যেমন একটি TTL (time-to-live) sweep, বা least-recently-used removal। `navigator.storage.estimate()`
আপনাকে limit-এ পৌঁছানোর আগেই সেটা দেখতে দেয়, সব store মিলিয়ে একসঙ্গে।

## এরপর কী পড়বেন

- [Chapter ?? — Cookie ও SameSite](#ch-cookies-same-site) — session token কোথায় থাকা উচিত, আর `SameSite` আসলে কী রক্ষা করে
- [Chapter ?? — Service Worker, Caching ও Offline](#ch-service-workers) — Cache API, আর IndexedDB-তে থাকা offline write queue
- [Chapter ?? — XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention) — যে attack-এর কারণে token-এর নিয়মটি গুরুত্বপূর্ণ
