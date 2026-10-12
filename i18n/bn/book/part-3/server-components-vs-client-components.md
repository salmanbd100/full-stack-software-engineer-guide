---
sourceHash: "e42afcafd75bf5b56fc57deda67bd3dcaf5dfeddef769323119a93888500523a"
title: "Server Component ও Client Component"
translatedAt: "2026-10-12T07:52:57.779Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Server Component ও Client Component {#ch-server-components-vs-client-components}

> সীমারেখাটা টানুন, ঠিক কী কী সেটা পার হতে পারে তা বলুন, আর ব্যাখ্যা করুন কেন `'use client'` প্রতি file-এর একটি switch নয়।

**এই অধ্যায়ে:** দুটো environment, একটি tree · কী serialise হয় · module graph বনাম render tree · boundary পার করে children পাঠানো · boundary পার করে promise পাঠানো

## 💡 মূল ধারণা

**React 19** থেকে একটি React tree দুই জায়গায় render হতে পারে। **Server Component server-এ একবার চলে, আর কখনো
re-render হয় না।** এটা database পড়তে পারে, secret রাখতে পারে, আর সরাসরি `await` করতে পারে। Browser-এ এটা কোনো
JavaScript পাঠায় না, শুধু ফলাফলটা পাঠায়। **Client Component** সাধারণ React: state, effect, event handler, browser
API, আর একটি bundle, যেটা user download করেন।

দুটো একে অপরের বিকল্প নয়। এরা মিলে একটি tree তৈরি করে, আর আসল engineering-এর মজাটা পুরোটাই জোড়ার জায়গায়।
2026–27-এর senior loop-এ এটাই সবচেয়ে বেশি জিজ্ঞেস করা frontend প্রশ্ন। যে উত্তর নম্বর পায়, সেটা *boundary* নিয়ে
কথা বলে, কোনটা বেশি দ্রুত তা নিয়ে নয়।

> ⚠️ **লক্ষ্য বদলাচ্ছে।** Server Component payload-এর format, আর একটি framework directive-গুলো কীভাবে লেখে, React 18
> আর React 19-এর মধ্যে বদলেছে। স্থায়ী নীতিটা বদলায় না: দুটো environment, একটি tree, আর দুইয়ের মধ্যে যা কিছু পার হয়,
> সেটাকে লিখে ফেলা আর পাঠানো সহ্য করতে হবে।

## কীভাবে কাজ করে

### `'use client'` module graph-এ একটি boundary চিহ্নিত করে

বেশিরভাগ ব্যাখ্যা এই বাক্যটাই ভুল করে। একটি file-এর ওপরে `'use client'` মানে "এই component একটি Client Component"
নয়। এর মানে **এই module client bundle-এর একটি entry point।** এটা যত module *import* করে, সবগুলো এর সাথে client
bundle-এ যোগ হয়।

Directive-টি খাটে **module dependency graph**-এ, render tree-তে নয়। এই পার্থক্যের একটি ফল মানুষকে অবাক করে:

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

`Footer` render হয় `Sidebar`-এর *ভেতরে*, যেটা একটি Client Component, তবু এটা একটি Server Component-ই থাকে।
এটা কখনো client bundle-এ ঢোকে না, কারণ `Sidebar` এটাকে import করে না। `Page` এটাকে import করে, render করে, আর
তৈরি element-টি `children` হিসেবে boundary পার করে দিয়ে দেয়। Render tree-তে parent–child সম্পর্ক কিছুই বলে না
যে একটি component কোথায় চলেছে।

মানুষ যে নিয়মটা বারবার বলে, "Client Component Server Component render করতে পারে না", এটাই তার পাশ কাটানোর উপায়।
এরা একটিকে *import* করতে পারে না। কিন্তু হাতে তুলে দেওয়া একটিকে দিব্যি render করতে পারে।

### কী পার হতে পারে

Server Component থেকে Client Component-এ যাওয়া props payload-এ serialise হয়ে network দিয়ে পাঠানো হয়। শুধু
যেসব জিনিসের একটি serialised রূপ আছে, সেগুলোই যেতে পারে।

| Boundary পার হয়                                    | পার হয় না                                      |
| -------------------------------------------------------- | ---------------------------------------------------- |
| Primitive — string, number, bigint, boolean, `null`, `undefined` | সাধারণ function আর closure               |
| Array, `Map`, `Set`, typed array, plain object        | Class, আর তার যেকোনো instance                     |
| `Date`                                                   | `null` prototype-ওয়ালা object                      |
| JSX element — Server Component-এর output সহ          | `Symbol.for` দিয়ে register না করা symbol             |
| Promise                                                  | Database handle বা request object ধরে রাখা যেকোনো কিছু |
| Server Function — যেগুলো `'use server'` দিয়ে চিহ্নিত            | —                                                    |

Function ব্যর্থ হয়, কারণ code-এর কোনো serialised রূপ নেই। React render-এর সময় throw করে। এটাই সঠিক আচরণ, কিন্তু
প্রথমবার error-টা বিভ্রান্তিকর লাগে। দুটো সঠিক সমাধান আছে। Data নিচে পাঠান আর handler-টি Client Component-এর ভেতরে
define করুন। অথবা একটি **Server Function** পাঠান, যেটাকে React code হিসেবে নয়, একটি reference হিসেবে serialise করে।

### Boundary পার করে একটি promise পাঠানো

Response দেওয়ার আগে একটি Server Component-কে সবকিছু await করতে হয় না। এটা একটি ধীর query শুরু করে unresolved
promise-টি prop হিসেবে পাঠাতে পারে। তারপর client একটি Suspense boundary-র ভেতরে `use` দিয়ে সেটা resolve করে।

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

Note-টি আসে প্রথম flush-এ (HTML-এর প্রথম যে chunk পাঠানো হয়)। Query শেষ হলে comment-গুলো stream হয়ে আসে। কোনো কিছুই
সবকিছুর জন্য অপেক্ষা করে না।

### Boundary কোথায় থাকা উচিত

এটাকে **নিচে আর বাইরের দিকে** ঠেলে দিন: interactivity যতটা চায়, tree-তে ততটা গভীরে আর ততটা সরু। ধরুন একটি
page-এর একমাত্র interactive element একটি like button। তাহলে page-টির উচিত একটি button-এর সমান JavaScript পাঠানো,
পুরো page-এর সমান নয়।

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

Server হলো default। Client-এ যান তখনই, যখন এমন কিছু লাগে যা server আপনাকে দিতে পারে না।

| আপনার যা লাগে                                    | Component-এর ধরন | কেন                                          |
| -------------------------------------------- | -------------- | --------------------------------------------- |
| Database বা internal service থেকে data  | Server         | কোনো round trip নেই, কোনো credential প্রকাশ পায় না         |
| শুধু output format করার জন্য ব্যবহৃত একটি বড় dependency | Server        | Library-টি কখনো browser-এ পৌঁছায় না         |
| `useState`, `useReducer`, `useEffect`        | Client         | যে component একবার render হয়, তার কোনো state থাকে না |
| একটি event handler — `onClick`, `onChange`     | Client         | Handler হলো code, আর code serialise হয় না |
| `window`, `localStorage`, `IntersectionObserver` | Client     | এই API-গুলো server-এ নেই           |
| একটি secret — API key, signing token       | Server         | Payload-এ যা থাকে, সবই public             |

## সাধারণ ভুল

**❌ প্রতিটি file-এর ওপরে `'use client'`।** এটা জমতে থাকে। প্রতিটি directive তার পুরো import subtree-কে bundle-এ টেনে
আনে। একটি layout-এর root-এ একটি directive চুপচাপ পুরো application-কে আবার client-rendered বানিয়ে দিতে পারে, কোনো error
ছাড়াই।

**❌ একটি child-কে interactive করতে নিচে একটি callback পাঠানো:**

```tsx
<ClientList onSelect={(id: string) => db.select(id)} />  // Throws — a function cannot serialise
```

**✅ বরং একটি Server Function পাঠান**, অথবা id-টি পাঠান আর handler-এর দায়িত্ব Client Component-কে দিন।

**❌ UI-এর যা লাগে, তার চেয়ে অনেক বেশি serialise করা।** Boundary পার হওয়া প্রতিটি prop HTML response-এ কিছু byte,
*আর* client-এর জন্য parse করার কাজ। দুটো field পড়ার জন্য 200 field-এর একটি record পাঠানো আসলে একটি payload সমস্যা,
সুবিধার ছদ্মবেশে।

**❌ ধরে নেওয়া যে একটি Server Component পরে interactive হতে পারবে।** এর কোনো state নেই, আর এটা কখনো re-render হয় না।
"এটাকে hydrate করো" (পরে এতে client code জুড়ে দাও) বলে কিছু নেই। Interactive অংশটা শুরু থেকেই একটি Client Component
হতে হবে।

## 🔑 মূল শিক্ষা

- Server Component server-এ একবার render হয়, কোনো JavaScript পাঠায় না, আর state রাখতে পারে না।
- `'use client'` **module graph**-এ একটি entry point চিহ্নিত করে, তাই সেই module যা কিছু import করে, সবই client bundle-এ যোগ হয়।
- একটি Client Component `children` হিসেবে হাতে পাওয়া Server Component render করতে পারে; শুধু একটিকে import করতে পারে না।
- শুধু serialise করা যায় এমন value-ই boundary পার হয় — function ব্যর্থ হয়, আর Server Function ব্যতিক্রম, কারণ এরা একটি reference হিসেবে পার হয়।
- Boundary-কে সবচেয়ে ছোট interactive leaf পর্যন্ত নিচে ঠেলে দিন; root-এর কাছে একটি directive পুরো model-টাকেই বাতিল করে দেয়।

## Interview-এর প্রশ্ন

**Q: Server Component থেকে Client Component-এ prop হিসেবে একটি function পাঠানো যায় না কেন?**

Boundary পার হওয়া props payload-এ serialise হয়ে network দিয়ে পাঠানো হয়। Function-এর কোনো serialised রূপ নেই, তাই
React render-এর সময় throw করে। দুটো সমাধান আছে। Data নিচে পাঠান আর handler-টি Client Component-এর ভেতরে define
করুন। অথবা একটি Server Function পাঠান, যেটাকে React code হিসেবে নয়, client call করতে পারে এমন একটি reference
হিসেবে serialise করে।

**Q: একজন সহকর্মী বলছেন, Client Component Server Component render করতে পারে না। উনি কি ঠিক?**

অর্ধেক ঠিক। একটি Client Component একটি Server Component-কে *import* করতে পারে না, কারণ import করলে module-টি client
bundle-এ চলে আসবে। কিন্তু `children` বা অন্য যেকোনো element prop হিসেবে পাওয়া একটিকে এটা render করতে পারে। Parent,
অর্থাৎ একটি Server Component, সেটা আগেই render করে ফেলেছে। Directive তার রেখা টানে module graph-এ, render tree-তে নয়।

**Q: `'use client'` boundary কোথায় বসাবেন, আর ভুল জায়গায় বসালে কী হয়?**

Interactivity যতটা চায়, ততটা গভীরে আর ততটা সরু করে, আদর্শভাবে সবচেয়ে ছোট সেই leaf-এ, যার state বা একটি handler
লাগে। খুব ওপরে বসালে এর নিচের প্রতিটি module client bundle-এ যোগ হয়। যে page-এর একটি button-এর সমান JavaScript
পাঠানোর কথা ছিল, সেটা তখন পুরো article পাঠায়। এর জন্য কোনো error নেই। এটা শুধু একটি বড় হয়ে যাওয়া bundle হিসেবে
ধরা পড়ে।

**Q: কখন Server Component ভুল পছন্দ?**

যখন জিনিসটা সত্যিই device-এ user-এর session-এর অংশ। যেমন একটি controlled input, একটি drag interaction,
`window` বা `localStorage` পড়ে এমন যেকোনো কিছু, আর round trip ছাড়াই সাড়া দিতে হয় এমন যেকোনো কিছু। Server Component
একবার render হয়, আর কখনো নয়। তাই response-এর পরে যে state বদলাতে হবে, সেটাকে client-এই থাকতে হবে।

## এরপর কী পড়বেন

- [Chapter ?? — Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming) — payload কীভাবে টুকরো টুকরো হয়ে আসে
- [Chapter ?? — Action ও Form](#ch-react-actions-and-forms) — যে Server Function একটি reference হিসেবে boundary পার হয়
- [Chapter ?? — Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum) — SSR, SSG আর PPR-এর পাশে এর অবস্থান
