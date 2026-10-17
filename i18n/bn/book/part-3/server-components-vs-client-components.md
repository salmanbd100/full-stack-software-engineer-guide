---
sourceHash: "e42afcafd75bf5b56fc57deda67bd3dcaf5dfeddef769323119a93888500523a"
title: "Server Component ও Client Component"
translatedAt: "2026-10-17T01:10:26.858Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Server Component ও Client Component {#ch-server-components-vs-client-components}

> Boundary-টা আঁকুন, ঠিক কী তা পার হতে পারে তা বলুন, আর ব্যাখ্যা করুন কেন `'use client'` প্রতিটি file-এর একটি switch নয়।

**এই অধ্যায়ে:** দুটি পরিবেশ, একটি tree · কী serialise হয় · module graph বনাম render tree · boundary পেরিয়ে children পাঠানো · boundary পেরিয়ে promise পাঠানো

## 💡 মূল ধারণা

**React 19** থেকে একটি React tree দুই জায়গায় render হতে পারে। **Server Component চলে একবারই, server-এ, আর কখনো re-render হয় না।** এটা
database পড়তে পারে, secret রাখতে পারে, সরাসরি `await` করতে পারে। Browser-এ কোনো JavaScript পাঠায় না, পাঠায় শুধু result। **Client Component**
হলো সাধারণ React: state, effect, event handler, browser API, আর এমন একটি bundle যা user download করেন।

দুটি একটি আরেকটির বিকল্প নয়। মিলে এরা একটিই tree বানায়, আর আসল engineering-এর সবটাই জোড়ের জায়গায়। 2026–27-এর senior loop-এ frontend-এর
সবচেয়ে বেশি জিজ্ঞেস করা প্রশ্ন এটাই। যে উত্তরগুলো নম্বর পায়, সেগুলো কোনটা দ্রুত তা নিয়ে নয়, *boundary* নিয়ে।

> ⚠️ **যা বদলাতে থাকে।** Server Component payload-এর format, আর framework কীভাবে directive লেখে, দুটিই React 18 থেকে React 19-এ বদলেছে। টেকসই
> নীতি বদলায় না: দুটি পরিবেশ, একটি tree, আর দুটির মধ্যে যা কিছু পার হয়, তাকে লিখে ফেলে পাঠানোর ধাক্কা সামলাতে হয়।

## কীভাবে কাজ করে

### `'use client'` module graph-এ একটি boundary চিহ্নিত করে

বেশিরভাগ ব্যাখ্যা ঠিক এই বাক্যটাই ভুল বলে। File-এর মাথায় `'use client'` মানে "এই component একটি Client Component" নয়। এর মানে **এই module
client bundle-এ ঢোকার একটি দরজা।** এটা যত module *import* করে, সবই এর সঙ্গে client bundle-এ যোগ হয়।

Directive খাটে **module dependency graph**-এ, render tree-তে নয়। এই পার্থক্যের একটি ফল মানুষকে অবাক করে:

```tsx
// app/page.tsx — a Server Component, no directive
import Sidebar from "./Sidebar";      // Client Component
import Footer from "./Footer";        // No directive — stays a Server Component

export default async function Page() {
  const user: User = await db.users.current();
  return (
    <Sidebar user={user}>
      <Footer />   {/* Rendered on the server, passed to a client component as children */}
    </Sidebar>
  );
}
```

`Footer` render হয় `Sidebar`-এর *ভেতরে*, যা একটি Client Component, তবু Footer Server Component-ই থাকে। এটা কখনো client bundle-এ ঢোকে না,
কারণ `Sidebar` একে import করে না। `Page` একে import করে, render করে, আর তৈরি হয়ে যাওয়া element-টা `children` হিসেবে boundary-র ওপারে পাঠিয়ে
দেয়। Render tree-তে parent–child সম্পর্ক দেখে বলা যায় না কোনো component কোথায় চলেছে।

মানুষ যে নিয়মটা আওড়ায়, "Client Component Server Component render করতে পারে না", তার পাশ কাটানোর পথ এটাই। Client Component একটিকে *import*
করতে পারে না। কিন্তু হাতে তুলে দেওয়া একটিকে দিব্যি render করতে পারে।

### কী পার হতে পারে

Server Component থেকে Client Component-এ যাওয়া props serialise হয়ে payload-এ ঢোকে আর network দিয়ে যায়। যেতে পারে শুধু সেসব জিনিস, যার
serialise করা রূপ আছে।

| Boundary পার হয় | পার হয় না |
| --------------- | --------- |
| Primitive — string, number, bigint, boolean, `null`, `undefined` | সাধারণ function আর closure |
| Array, `Map`, `Set`, typed array, সাধারণ object | Class, আর তার যেকোনো instance |
| `Date` | `null` prototype-ওয়ালা object |
| JSX element — Server Component-এর output সহ | `Symbol.for` দিয়ে register না করা symbol |
| Promise | Database handle বা request object ধরে রাখা যেকোনো কিছু |
| Server Function — যেগুলোতে `'use server'` চিহ্ন দেওয়া | — |

Function ব্যর্থ হয়, কারণ code-এর কোনো serialise করা রূপ নেই। React render-এর সময় throw করে। আচরণটা ঠিক, কিন্তু প্রথমবার error-টা বিভ্রান্ত
করে। সঠিক জবাব দুটি। Data নিচে পাঠান আর handler-টা Client Component-এর ভেতরে define করুন। অথবা একটি **Server Function** পাঠান, যা React
code হিসেবে নয়, একটি reference হিসেবে serialise করে।

### Boundary পেরিয়ে promise পাঠানো

Response দেওয়ার আগে Server Component-কে সবকিছু await করতে হয় না। এটা একটি ধীর query শুরু করে resolve না হওয়া promise-টা prop হিসেবে পাঠাতে
পারে। তারপর client একটি Suspense boundary-র ভেতরে `use` দিয়ে সেটা resolve করে।

```tsx
// Server Component
export default async function Page({ id }: { id: string }) {
  const note: Note = await db.notes.get(id);         // Awaited — blocks the shell
  const commentsPromise: Promise<Comment[]> = db.comments.get(id); // Not awaited

  return (
    <article>
      <NoteBody note={note} />
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments commentsPromise={commentsPromise} />
      </Suspense>
    </article>
  );
}
```

```tsx
"use client";

export function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments: Comment[] = use(commentsPromise); // Resumes the server's promise
  return <ul>{comments.map((c: Comment) => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

Note-টা আসে প্রথম flush-এই (HTML-এর প্রথম পাঠানো টুকরো)। Query শেষ হলে comment-গুলো stream হয়ে আসে। কোনো কিছুই সবকিছুর জন্য অপেক্ষা করে না।

### Boundary কোথায় বসবে

একে ঠেলে দিন **নিচে আর বাইরের দিকে**: interactivity-র যতটুকু দরকার, tree-র তত গভীরে আর তত সরু করে। ধরুন একটি page-এ interactive element শুধু
একটি like button। তাহলে page পাঠাবে একটি button-এর মাপের JavaScript, পুরো page-এর নয়।

```tsx
// ❌ The whole article becomes client code because of one button
"use client";
export function Article({ post }: { post: Post }) {
  const [liked, setLiked] = useState<boolean>(false);
  return (
    <article>
      {/* a great deal of static markup, now all shipped to the browser */}
      <button onClick={() => setLiked(true)}>{liked ? "Liked" : "Like"}</button>
    </article>
  );
}
```

```tsx
// ✅ Server Component, with one small client leaf
export function Article({ post }: { post: Post }) {
  return (
    <article>
      {/* the same static markup, zero JavaScript */}
      <LikeButton postId={post.id} />
    </article>
  );
}
```

## কখন ব্যবহার করবেন

Default হলো server। Client-এ সরান তখন, যখন এমন কিছু লাগে যা server দিতে পারে না।

| আপনার দরকার | Component-এর ধরন | কেন |
| ----------- | --------------- | --- |
| Database বা ভেতরের কোনো service থেকে data | Server | কোনো round trip নেই, credential বাইরে যায় না |
| বড় একটি dependency, যা শুধু output format করতে লাগে | Server | Library কখনো browser-এ পৌঁছায় না |
| `useState`, `useReducer`, `useEffect` | Client | যে component একবার render হয়, তার কোনো state থাকে না |
| Event handler — `onClick`, `onChange` | Client | Handler মানে code, আর code serialise হয় না |
| `window`, `localStorage`, `IntersectionObserver` | Client | এই API-গুলো server-এ নেই |
| Secret — API key, signing token | Server | Payload-এ যা থাকে, সবই প্রকাশ্য |

## সাধারণ ভুল

**❌ প্রতিটি file-এর মাথায় `'use client'`।** এটা জমতে থাকে। প্রতিটি directive তার পুরো import subtree টেনে bundle-এ নিয়ে যায়। Layout-এর
root-এ একটি থাকলেই চুপচাপ পুরো application আবার client-rendered হয়ে যেতে পারে, কোনো error ছাড়াই।

**❌ Child-কে interactive করতে নিচে একটি callback পাঠানো:**

```tsx
<ClientList onSelect={(id: string) => db.select(id)} />  // Throws — a function cannot serialise
```

**✅ তার বদলে একটি Server Function পাঠান**, অথবা id পাঠান আর handler-এর মালিক Client Component-কে হতে দিন।

**❌ UI-এর যা লাগে তার চেয়ে অনেক বেশি serialise করা।** Boundary পার হওয়া প্রতিটি prop HTML response-এ বাড়তি byte, *আবার* client-এর জন্য parse
করার বাড়তি কাজ। Component দুটি field পড়বে বলে 200 field-এর record পাঠানো আসলে payload-এর সমস্যা, সুবিধার ছদ্মবেশে।

**❌ ধরে নেওয়া যে Server Component পরে interactive হতে পারবে।** এর state নেই, আর এটা কখনো re-render হয় না। "এটাকে hydrate করো" (পরে client
code জুড়ে দেওয়া) বলে কিছু নেই। Interactive অংশটাকে শুরু থেকেই Client Component হতে হবে।

## 🔑 মূল শিক্ষা

- Server Component server-এ একবার render হয়, কোনো JavaScript পাঠায় না, আর state রাখতে পারে না।
- `'use client'` **module graph**-এ একটি দরজা চিহ্নিত করে, তাই সেই module যা import করে, সবই client bundle-এ যোগ হয়।
- Client Component `children` হিসেবে হাতে পাওয়া Server Component render করতে পারে; শুধু import করতে পারে না।
- Boundary পার হয় শুধু serialise করা যায় এমন value — function ব্যর্থ হয়, আর Server Function ব্যতিক্রম কারণ সেটা reference হিসেবে পার হয়।
- Boundary-কে ঠেলে নামিয়ে দিন সবচেয়ে ছোট interactive leaf পর্যন্ত; root-এর কাছে একটি directive পুরো model-টাই নষ্ট করে দেয়।

## Interview-এর প্রশ্ন

**Q: Server Component থেকে Client Component-এ prop হিসেবে function পাঠানো যায় না কেন?**

Boundary পার হওয়া props serialise হয়ে payload-এ ঢোকে আর network দিয়ে যায়। Function-এর কোনো serialise করা রূপ নেই, তাই React render-এর
সময় throw করে। সমাধান দুটি। Data নিচে পাঠান আর handler Client Component-এর ভেতরে define করুন। অথবা একটি Server Function পাঠান, যা React
code হিসেবে নয়, client call করতে পারে এমন একটি reference হিসেবে serialise করে।

**Q: একজন সহকর্মী বলছেন, Client Component Server Component render করতে পারে না। তিনি কি ঠিক?**

অর্ধেক ঠিক। Client Component একটি Server Component *import* করতে পারে না, কারণ import করলে module-টা client bundle-এ চলে আসত। কিন্তু
`children` বা অন্য কোনো element prop হিসেবে পাঠানো একটিকে render করতে পারে। Parent, যা একটি Server Component, সেটা আগেই render করে ফেলেছে।
Directive তার রেখা টানে module graph-এ, render tree-তে নয়।

**Q: `'use client'` boundary কোথায় বসাবেন, আর ভুল জায়গায় বসালে কী হয়?**

Interactivity-র যতটুকু দরকার, তত গভীরে আর তত সরু করে, আদর্শভাবে সবচেয়ে ছোট সেই leaf-এ, যার state বা handler লাগে। বেশি ওপরে বসালে তার
নিচের প্রতিটি module client bundle-এ যোগ হয়। যে page-এর একটি button-এর মাপের JavaScript পাঠানোর কথা ছিল, সেটা তখন পুরো article পাঠায়। এর
জন্য কোনো error নেই। ধরা পড়ে শুধু বড় হয়ে যাওয়া bundle দেখে।

**Q: কখন Server Component ভুল পছন্দ?**

যখন জিনিসটা সত্যিই device-এ user-এর session-এর অংশ। যেমন controlled input, drag-এর interaction, `window` বা `localStorage` পড়ে এমন যেকোনো
কিছু, আর round trip ছাড়া সাড়া দিতে হয় এমন যেকোনো কিছু। Server Component একবার render হয়, আর কখনো নয়। তাই response-এর পরে যে state বদলাতে
হবে, তাকে client-এই থাকতে হবে।

## এরপর কী পড়বেন

- [Chapter ?? — Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming) — payload কীভাবে টুকরো টুকরো হয়ে আসে
- [Chapter ?? — Action ও Form](#ch-react-actions-and-forms) — যে Server Function reference হিসেবে boundary পার হয়
- [Chapter ?? — Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum) — SSR, SSG আর PPR-এর পাশে এর অবস্থান
