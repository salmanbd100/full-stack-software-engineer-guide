---
sourceHash: "28aa627b61d282c3ed46742ae2050c7a239e571fba15cb50769351a4438c75b9"
title: "State হিসেবে URL"
translatedAt: "2026-10-17T01:35:28.181Z"
model: "claude-opus-5-5 (Claude Code)"
---

# State হিসেবে URL {#ch-url-as-state}

> User শেয়ার করতে চাইবে এমন প্রতিটি view input address bar-এ রাখুন, type সহ, আর history নিয়ে একটি ভেবেচিন্তে নেওয়া নীতি মেনে।

**এই অধ্যায়ে:** URL কোন কাজে ভালো · param parse আর serialise করা · push বনাম replace · update throttle করা · server-এ param পড়া · URL-এ যা কখনো রাখা যাবে না

## 💡 মূল ধারণা

URL এমন একটি state container, যার user interface আগে থেকেই তৈরি। এতে back button আছে, forward button আছে, share
করার ব্যবস্থা আছে, bookmark আছে, edit করার জায়গাও আছে। আপনি নিজে যত store-ই লিখুন, এগুলো কোনোটাই বিনা খরচে
পাবে না।

Application state-এর মধ্যে শুধু এটাই user *দেখতে* পায়। এটা সুবিধাও, সীমাও। এখানে যা রাখবেন তা public, edit করা
যায়, আর এত দিন টিকে থাকে যে শেষে support ticket-এ গিয়ে পৌঁছায়।

কোনো value এখানে রাখার মতো কি না, সেটা যাচাইয়ের প্রশ্ন একটিই: **কেউ link-টা message-এ paste করলে যে পাবে, সে কি
একই view দেখবে?** Filter, sort order, page number, খোলা tab, select করা row: হ্যাঁ। Hover state, scroll position,
আধখোলা menu: না।

## কীভাবে কাজ করে

### URL-এর সবকিছুই string

Search param-এর কোনো type নেই। ঢোকার সময় প্রতিটি value-র parser লাগে, আর বেরোনোর সময় serialiser। আর প্রতিটি
parse ব্যর্থ হতে পারে, কারণ user-রা URL নিজেরা edit করে।

**`nuqs` দিয়ে typed param, default সহ:**

```typescript
import { useQueryStates, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs';

const sortOptions = ['newest', 'oldest', 'popular'] as const;

const [filters, setFilters] = useQueryStates({
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(sortOptions).withDefault('newest'),
  q: parseAsString.withDefault(''),
});

// filters.page is number, filters.sort is 'newest' | 'oldest' | 'popular'
setFilters({ page: 2 }); // updates only `page`, leaves the rest of the URL alone
```

এখান থেকে দুটি নকশার নিয়ম আসে।

**Default value URL-এ দেখানো উচিত নয়।** প্রথম visit-এ `?page=1&sort=newest` শুধু বাড়তি জঞ্জাল। এতে একই view-এর
দুটি URL তৈরি হয়, আর caching ও search engine-এর signal দুই ভাগ হয়ে যায়। Param-এর value default-এর সমান হলে
সেটা মুছে দিন।

**অচেনা value এলে crash নয়, default-এ ফিরে যেতে হবে।** `?sort=banana` থেকে `?sort=newest` মাত্র একটি keystroke
দূরে। Literal union-এর বিপরীতে parse করুন, না মিললে default নিন। String-টাকে বিশ্বাস করবেন না।

### Push নাকি replace

প্রতিটি URL update হয় নতুন history entry, নয়তো overwrite। ভুল বাছলে back button দুই দিকের যেকোনো একদিকে ভেঙে যায়।

| পরিবর্তন | Mode | কেন |
| ------ | ---- | --- |
| Page number, tab, detail view খোলা | **push** | User এটাকে navigation ভাবে, আর আশা করে back চাপলে এটা ফিরে যাবে |
| Slider টানা, search box-এ টাইপ করা | **replace** | নইলে চল্লিশবার back চাপতে হবে |
| Dropdown থেকে filter বসানো | **push** | একটি ভেবেচিন্তে করা কাজ, একটি history entry |
| Mount-এর সময় state ফিরিয়ে আনা | **replace** | এটা কখনো navigation ছিলই না |

এই ভুলটা সবাই দেখেছে: এমন search box, যেটা প্রতিটি keystroke-এ push করে। Page ছেড়ে যেতে হলে যত অক্ষর টাইপ
করেছেন, ততবার back চাপতে হয়।

### Write throttle করা

`replace` দিলেও প্রতিটি keystroke-এ URL লেখা দামি। এতে router নড়ে ওঠে। যে framework-এ param বদলালে server-এ
round trip হয়, সেখানে প্রতি অক্ষরে একটি round trip।

সমাধান হলো input-টাকে local-ভাবে controlled রাখা, আর URL-এ লেখাটা throttle বা debounce করা। Debounce টাইপ থামা
পর্যন্ত অপেক্ষা করে:

```typescript
const [q, setQ] = useQueryState('q', {
  defaultValue: '',
  limitUrlUpdates: { method: 'debounce', timeMs: 300 },
});
```

Input সঙ্গে সঙ্গে সাড়া দেয়, কারণ DOM-এর value তখনই update হয়। URL, আর সেটা যে fetch চালায়, তারা পিছিয়ে থেকে
ধরে ফেলে user থামলে।

### Shallow কি না: এতে কি refetch হবে?

URL update client নিজেই সামলাতে পারে। আবার update-টা server-এ ফিরে গিয়ে নতুন param দিয়ে route-টা re-render-ও
করাতে পারে। Framework-গুলো এটা দেয় `shallow` flag হিসেবে, আর এটা সত্যিকারের একটি সিদ্ধান্ত:

- **Shallow:** দরকারি সবকিছু client-এর কাছে আগেই আছে, তাই update মানে শুধু একটি re-render। আগে থেকে load হওয়া
  data-র ওপর client-side filter-এর জন্য এটাই ঠিক।
- **Shallow নয়:** নতুন param দিয়ে server re-render করে। Param যখন query চালায়, তখন এটাই ঠিক। আসল dataset-এর
  ওপর search, pagination আর filtering-এ সাধারণত এটাই হয়।

দ্বিতীয় পথটার জন্যই URL state আর server rendering এত ভালো মেলে। Param-গুলো server render-এর input, তাই paste
করা link একদম প্রথম response-এই ঠিক page দেয়, client-এ কোনো fetch ছাড়াই। এতে search engine-ও ওই route-গুলো
index করতে পারে। দেখুন
[Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route)।

### Server-এ param পড়া

Param যেহেতু request-এর সঙ্গেই আসে, প্রথম render-ই ঠিক হতে পারে। Default view এক ঝলক দেখিয়ে তারপর filter করা
view-তে লাফ দেওয়ার ব্যাপার থাকে না।

খরচটা হলো: বেশিরভাগ framework-এ search parameter পড়লেই route dynamic হয়ে যায়। Response এখন request-এর ওপর
নির্ভর করে, তাই সেটা পুরোপুরি static হতে পারে না। Search page-এর জন্য এই tradeoff ঠিক। কিন্তু tracking parameter
আসা marketing page-এর জন্য ভুল, আর সেই ক্ষেত্রটা আলোচনা করা হয়েছে
[Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route)-এ।

### URL-এ যা কখনো রাখা যাবে না

URL মানুষের ধারণার চেয়ে অনেক দূর যায়। Server, proxy আর analytics সেটা log-এ লিখে রাখে। `Referer` header সেটা
third-party script-এর কাছে পাঠিয়ে দেয়। Shared machine-এ browser history সেটা রেখে দেয়, আর মানুষ সেটা ticket-এ
paste করে।

| কখনো নয় | কারণ |
| ----- | ------- |
| Token, session identifier, password reset code | সব জায়গায় log হয়, forward হয়, cache হয় |
| ব্যক্তিগত data — email address, account number | একই সমস্যা, আর সাধারণত এটা compliance ভঙ্গ |
| বড় payload — পুরো result set, serialise করা form | দৈর্ঘ্যের সীমা আছে, আর data সরে গেলে link কাজ করা বন্ধ করে |
| অন্য param থেকে বের করা যায় এমন কিছু | এমন জায়গায় দ্বিতীয় source of truth, যেটা user edit করতে পারে |

Browser, proxy আর server মিলিয়ে URL-এর দৈর্ঘ্যের বাস্তব সীমা কয়েক হাজার অক্ষর। সাধারণত সবার আগে ভাঙে CDN,
browser নয়। Param-এ শুধু identifier আর enumeration রাখুন।

## কখন ব্যবহার করবেন

| State | URL-এ রাখবেন? |
| ----- | ----------- |
| Search query, filter, sort, pagination | **হ্যাঁ** |
| Active tab, select করা row, খোলা detail panel | **হ্যাঁ** |
| Report-এর date range | **হ্যাঁ** |
| Map-এর centre আর zoom | **হ্যাঁ**, throttle করে |
| Sidebar collapse, theme | না — client state, প্রতি device-এ persist করা |
| Form-এর draft value | না — form state |
| Fetch করা ফলাফল নিজেই | না — server state, param দিয়ে key করা |

## সাধারণ ভুল

**❌ প্রতিটি keystroke-এ history entry push করা।**
✅ Replace করুন, আর throttle করুন। Back button keystroke-এর log নয়।

**❌ Parse না করেই param পড়া।**
✅ User আর bot যা খুশি পাঠাবে। Fallback সহ union বা number-এ parse করুন।

**❌ URL-এ default value লেখা।**
✅ একই view-এর দুটি URL caching আর search signal দুই ভাগ করে দেয়, আর দেখতেও অযত্নের মনে হয়।

**❌ একই value URL-এ আর store-এ দুই জায়গায় রাখা।**
✅ দুটি source of truth, back button চাপলেই যাদের মধ্যে অমিল হয়। URL-ই জিতবে। বাকি সব সেখান থেকে derive করুন।

**❌ শেয়ার করার link-এ এমন identifier রাখা, যেটা তথ্য ফাঁস করে।**
✅ URL যেখান দিয়ে যায়, সেখানেই log হয়। একে public ধরে নিন।

## 🔑 মূল শিক্ষা

- URL হলো শেয়ার করা যায়, edit করা যায়, টিকে থাকে এমন state, যার সঙ্গে back button আগে থেকেই জোড়া।
- প্রতিটি param string, তাই প্রতিটির জন্য parser, default আর আজেবাজে value-র fallback লাগে।
- ভেবেচিন্তে করা navigation-এ push, টানা adjust করার সময় replace, আর write throttle করুন।
- Server-এ param পড়লে প্রথম render ঠিক হয়, তবে বিনিময়ে route dynamic হয়ে যায়।
- URL সব জায়গায় log হয়। Token, ব্যক্তিগত data বা বড় payload কখনো URL-এ রাখবেন না।

## Interview-এর প্রশ্ন

**Q: কোন state URL-এ রাখা উচিত?**

User যা শেয়ার করতে, bookmark করতে বা back button দিয়ে ফিরে পেতে চাইবে, সবই: search query, filter, sort,
pagination, active tab, select করা item। যাচাইয়ের প্রশ্নটা হলো, link paste করলে কি পাঠানো মানুষের view-টাই আবার
তৈরি হওয়া উচিত? ক্ষণস্থায়ী interface state আর স্পর্শকাতর যেকোনো কিছু বাইরে থাকবে।

**Q: Search box যেন back button নষ্ট না করে, সেটা কীভাবে ঠেকাবেন?**

URL update-এ push নয়, replace ব্যবহার করুন। তাহলে টাইপ করলে প্রতি অক্ষরে নতুন entry যোগ না হয়ে বর্তমান entry-টাই
overwrite হয়। সঙ্গে write-টা কয়েকশো millisecond debounce করুন। Input-এর value local রাখুন, যাতে URL পিছিয়ে
থাকলেও input সঙ্গে সঙ্গে সাড়া দেয়।

**Q: একই value URL আর store দুই জায়গাতেই থাকলে কী ভাঙে?**

দুটির মধ্যে অমিল হয়। Back button চাপলে URL বদলায়, কিন্তু আপনার setter-এর মধ্য দিয়ে যায় না। Store পুরনো value
ধরে রাখে, আর page-এ দুটির মিশ্রণ দেখা যায়। URL-কেই source of truth বানান আর বাকি সব সেখান থেকে derive করুন,
নয়তো value-টা URL থেকে পুরোপুরি বাদ দিন।

**Q: Server-এ search param পড়ার খরচ কী?**

Route dynamic হয়ে যায়। Response এখন request-এর ওপর নির্ভর করে, তাই static cache থেকে serve করা যায় না। Search
বা filter page-এর জন্য এটা ঠিক, কারণ সেখানে param-ই তো query। কিন্তু প্রায় static এমন page-এ, যেখানে ঘটনাচক্রে
campaign tracking parameter আসে, এটা ভুল।

## এরপর কী পড়বেন

- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) — বাকি ধরনগুলোর মধ্যে এই ধরনটা কোথায় বসে
- [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) — param-এর variant, canonical URL আর duplicate indexing
- [Chapter ?? — SvelteKit-এ Routing ও Loading](#ch-sveltekit-routing-and-loading) — server load function-এর input হিসেবে param
