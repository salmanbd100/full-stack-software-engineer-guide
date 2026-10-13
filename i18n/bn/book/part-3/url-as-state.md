---
sourceHash: "28aa627b61d282c3ed46742ae2050c7a239e571fba15cb50769351a4438c75b9"
title: "State হিসেবে URL"
translatedAt: "2026-10-12T12:13:55.205Z"
model: "claude-opus-5-5 (Claude Code)"
---

# State হিসেবে URL {#ch-url-as-state}

> একজন user যে view input share করতে চাইবেন, তার সবটাই address bar-এ রাখুন। Typed রাখুন, আর history-র একটি ভেবেচিন্তে ঠিক করা নীতি রাখুন।

**এই অধ্যায়ে:** URL কোন কাজে ভালো · param parse আর serialise করা · push বনাম replace · update throttle করা · server-এ param পড়া · URL-এ কী কখনো রাখা যাবে না

## 💡 মূল ধারণা

URL এমন একটি state container, যার একটি user interface আগে থেকেই আছে। এর একটি back button আছে, একটি forward button
আছে, একটি share action, একটি bookmark আর একটি edit field আছে। আপনার লেখা কোনো store এগুলো কখনো বিনা খরচে পাবে না।

Application state-এর মধ্যে এটাই একমাত্র অংশ, যেটা user *দেখতে* পান। এটা একটি feature, আবার একটি সীমাও। এখানে যা
রাখবেন, তা public, edit করা যায়, আর এতটা টেকসই যে একসময় support ticket-এ গিয়ে পৌঁছায়।

কোনো value এখানে রাখা উচিত কি না, তার পরীক্ষা এক বাক্যের: **কেউ যদি এই link একটি message-এ paste করেন, প্রাপক কি
একই view দেখবেন?** Filter, sort order, page number, খোলা tab, select করা row: হ্যাঁ। Hover state, scroll position,
অর্ধেক খোলা menu: না।

## কীভাবে কাজ করে

### URL-এর সবকিছুই string

Search param-এর কোনো type নেই। প্রতিটি value-র ঢোকার পথে একটি parser আর বেরোনোর পথে একটি serialiser লাগে। প্রতিটি
parse fail করতে পারে, কারণ user-রা URL edit করেন।

**`nuqs` দিয়ে default সহ typed param:**

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

এখান থেকে দুটি design নিয়ম আসে।

**Default যেন URL-এ না দেখা যায়।** প্রথম visit-এ `?page=1&sort=newest` শুধুই আবর্জনা। এতে একটি view-র জন্য দুটি
URL তৈরি হয়, আর caching ও search engine-এর signal ভাগ হয়ে যায়। কোনো param তার default-এর সমান হলে সেটা মুছে দিন।

**অচেনা value-তে crash নয়, fallback হবে।** `?sort=banana` থেকে `?sort=newest` মাত্র এক keystroke দূরে। একটি
literal union-এর বিপরীতে parse করুন, আর default-এ ফিরে যান। String-কে বিশ্বাস করবেন না।

### Push নাকি replace

প্রতিটি URL update হয় একটি history entry, নয়তো একটি overwrite। ভুলটা বাছলে back button দুই দিকের যেকোনো একদিকে
ভেঙে যায়।

| পরিবর্তন | Mode | কেন |
| ------ | ---- | --- |
| Page number, tab, একটি detail view খোলা | **push** | User এটাকে navigation মনে করেন, আর আশা করেন back দিলে এটা undo হবে |
| Slider টানা, search box-এ type করা | **replace** | নইলে চল্লিশবার back চাপতে হবে |
| একটি dropdown থেকে filter apply করা | **push** | একটি ইচ্ছাকৃত action, একটি history entry |
| Mount-এর সময় state ফিরিয়ে আনা | **replace** | এটা কখনো navigation ছিলই না |

যে ব্যর্থতার সাথে সবার দেখা হয়েছে: এমন একটি search box, যেটা প্রতিটি keystroke-এ push করে। Page ছেড়ে যেতে হলে
যতগুলো অক্ষর type করেছেন, ততবার back চাপতে হয়।

### Write throttle করা

`replace` দিয়েও প্রতিটি keystroke-এ URL লেখা খরুচে। এটা router-কে নাড়া দেয়। যেসব framework-এ param বদলালে
server-এ একটি round trip হয়, সেখানে প্রতিটি অক্ষরে একটি round trip পান।

সমাধান হলো input-কে local-ভাবে controlled রাখা, আর URL write-কে throttle বা debounce করা। Debounce typing থামা
পর্যন্ত অপেক্ষা করে:

```typescript
const [q, setQ] = useQueryState('q', {
  defaultValue: '',
  limitUrlUpdates: { method: 'debounce', timeMs: 300 },
});
```

Input responsive থাকে, কারণ DOM value সাথে সাথে update হয়। URL, আর এর ওপর নির্ভর করা যেকোনো fetch, user থামলে
পিছু ধরে।

### Shallow কি না: এটা কি refetch করবে?

Client নিজেই একটি URL update সামলাতে পারে। আবার update-টি server-এ ফিরে গিয়ে নতুন param দিয়ে route-টি re-render-ও
করাতে পারে। Framework-গুলো এটা একটি `shallow` flag হিসেবে দেয়, আর এটা একটি আসল সিদ্ধান্ত:

- **Shallow:** client-এর কাছে যা দরকার তা আগেই আছে, তাই update শুধু একটি re-render। আগে থেকে load করা data-র ওপর
  client-side filter-এর জন্য এটা ঠিক।
- **Shallow নয়:** server নতুন param দিয়ে re-render করে। যখন param-ই query চালায়, তখন এটা ঠিক। একটি আসল dataset-এর
  ওপর search, pagination আর filtering-এ সাধারণত এটাই হয়।

দ্বিতীয় option-টির কারণেই URL state server rendering-এর সাথে এত ভালো মেলে। Param-গুলো server render-এর input,
তাই paste করা একটি link একেবারে প্রথম response-এই সঠিক page দেয়, কোনো client fetch ছাড়াই। এতে search engine-ও ওই
route-গুলো index করতে পারে। [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route)
দেখুন।

### Server-এ param পড়া

Param request-এর সাথেই আসে, তাই প্রথম render-ই সঠিক হতে পারে। প্রথমে default view দেখিয়ে তারপর filter করা view-তে
লাফ দেওয়ার কোনো ঝলকানি থাকে না।

খরচটা হলো: বেশিরভাগ framework-এ search parameter পড়লে route dynamic হয়ে যায়। Response এখন request-এর ওপর
নির্ভর করে, তাই এটা পুরোপুরি static হতে পারে না। Search page-এর জন্য এই tradeoff ঠিক। Tracking parameter সহ
একটি marketing page-এর জন্য এটা ভুল, আর সেটা
[Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route)-এর বিষয়।

### URL-এ কী কখনো রাখা যাবে না

মানুষ যতটা ভাবে, URL তার চেয়ে অনেক দূর যায়। Server, proxy আর analytics এগুলো log-এ লেখে। `Referer` header এগুলো
third-party script-এর কাছে পাঠায়। Shared machine-এ browser history এগুলো রেখে দেয়, আর মানুষ এগুলো ticket-এ paste
করে।

| কখনো নয় | কারণ |
| ----- | ------- |
| Token, session identifier, password reset code | সব জায়গায় log হয়, forward হয়, cache হয় |
| ব্যক্তিগত data — email address, account number | একই কারণ, আর সাধারণত এটা compliance লঙ্ঘন |
| বড় payload — পুরো একটি result set, serialise করা একটি form | দৈর্ঘ্যের সীমা আছে, আর data সরে গেলে link কাজ করা বন্ধ করে |
| অন্য param থেকে বের করা যায় এমন কিছু | এমন জায়গায় সত্যের দ্বিতীয় উৎস, যেটা user edit করতে পারেন |

Browser, proxy আর server মিলিয়ে URL দৈর্ঘ্যের ব্যবহারিক সীমা কয়েক হাজার অক্ষর। প্রথমে সাধারণত browser নয়, একটি
CDN ভাঙে। Param-গুলোকে identifier আর enumeration-এ সীমিত রাখুন।

## কখন ব্যবহার করবেন

| State | URL-এ? |
| ----- | ----------- |
| Search query, filter, sort, pagination | **হ্যাঁ** |
| Active tab, select করা row, খোলা detail panel | **হ্যাঁ** |
| একটি report-এর date range | **হ্যাঁ** |
| Map-এর centre আর zoom | **হ্যাঁ**, throttle করে |
| Sidebar collapse করা, theme | না — client state, প্রতিটি device-এ persist করা |
| Draft form value | না — form state |
| Fetch করা result নিজেই | না — server state, param দিয়ে key করা |

## সাধারণ ভুল

**❌ প্রতিটি keystroke-এ একটি history entry push করা।**
✅ Replace করুন, আর throttle করুন। Back button কোনো keystroke log নয়।

**❌ Parse না করে param পড়া।**
✅ User আর bot যা খুশি পাঠাবে। Fallback সহ একটি union বা number-এ parse করুন।

**❌ URL-এ default লিখে দেওয়া।**
✅ একটি view-র জন্য দুটি URL caching আর search signal ভাগ করে দেয়, আর দেখতেও অযত্নের মনে হয়।

**❌ একই value URL-এ আর একটি store-এ রাখা।**
✅ সত্যের দুটি উৎস, যেগুলো back button চাপার পর আলাদা কথা বলে। URL জেতে। বাকি সব এখান থেকে বের করুন।

**❌ Share করা যায় এমন link-এ এমন identifier রাখা, যেটা তথ্য ফাঁস করে।**
✅ URL যে প্রতিটি ধাপ পেরোয়, সেটাই এটাকে log করে। একে public ধরে নিন।

## 🔑 মূল শিক্ষা

- URL হলো share করা যায়, edit করা যায়, টেকসই একটি state, যার সাথে back button আগে থেকেই লাগানো।
- প্রতিটি param একটি string, তাই প্রতিটির একটি parser, একটি default আর আবর্জনার জন্য একটি fallback লাগে।
- ইচ্ছাকৃত navigation-এর জন্য push, একটানা adjustment-এর জন্য replace, আর write-গুলো throttle করুন।
- Server-এ param পড়লে প্রথম render সঠিক হয়, তবে খরচ হিসেবে route dynamic হয়ে যায়।
- URL সব জায়গায় log হয়। এতে কখনো token, ব্যক্তিগত data বা বড় payload রাখবেন না।

## Interview-এর প্রশ্ন

**Q: কোন state URL-এ থাকা উচিত?**

যা একজন user share করতে, bookmark করতে বা back button দিয়ে পৌঁছাতে চাইবেন: search query, filter, sort,
pagination, active tab, select করা item। পরীক্ষাটা হলো, link paste করলে প্রেরকের view আবার দেখা যাওয়া উচিত কি না।
অল্পক্ষণের interface state আর সংবেদনশীল যেকোনো কিছু বাইরে থাকে।

**Q: একটি search box যেন back button নষ্ট না করে, সেটা কীভাবে ঠেকাবেন?**

URL update-এর জন্য push নয়, replace ব্যবহার করুন। তখন typing প্রতিটি অক্ষরে নতুন entry যোগ না করে বর্তমান entry-টি
overwrite করে। Write-টি কয়েকশো millisecond debounce-ও করুন। Input value local রাখুন, যাতে URL পিছু ধরার সময়ও
এটা responsive থাকে।

**Q: একই value URL আর একটি store দুই জায়গাতেই থাকলে কী ভাঙে?**

দুটি আলাদা কথা বলে। Back button চাপলে URL বদলায়, আপনার setter-এর মধ্য দিয়ে না গিয়েই। Store পুরোনো value রেখে দেয়,
আর page দুটির মিশেল দেখায়। URL-কে সত্যের উৎস বানান আর বাকি সব এখান থেকে বের করুন, নয়তো value-টি URL থেকে পুরোপুরি
বাইরে রাখুন।

**Q: Server-এ search param পড়ার খরচ কী?**

Route dynamic হয়ে যায়। Response এখন request-এর ওপর নির্ভর করে, তাই এটা static cache থেকে serve করা যায় না। একটি
search বা filter page-এর জন্য এটা ঠিক, যেখানে param-ই তো query। কিন্তু প্রায় static একটি page, যেটায় ঘটনাচক্রে একটি
campaign tracking parameter আসে, সেখানে এটা ভুল।

## এরপর কী পড়বেন

- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) — অন্য category-গুলোর মধ্যে এটা কোথায় বসে
- [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) — param-এর রকমফের, canonical URL আর duplicate indexing
- [Chapter ?? — SvelteKit-এ Routing ও Loading](#ch-sveltekit-routing-and-loading) — server load function-এর input হিসেবে param
