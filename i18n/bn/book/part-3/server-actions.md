---
sourceHash: "0a1e44a60ea7d623955d2fda7f8af662a84243454ce2e728d57f75f2572002bf"
title: "Server Action"
translatedAt: "2026-10-17T01:39:53.334Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Server Action {#ch-server-actions}

> Mutation লিখুন যে form তাকে চালায় তার পাশেই, আর তাকে ঠিক ততটাই সন্দেহ করুন, যতটা একটি public POST endpoint-কে করতেন।

**এই অধ্যায়ে:** `'use server'` আসলে কী তৈরি করে · প্রতিটি action-এর চারটি check · validation · revalidation · কখন Route Handler ভালো tool

## 💡 মূল ধারণা

Server Action দেখতে function call-এর মতো, কিন্তু আসলে তা নয়। `'use server'` bundler-কে বলে function-টা server-এ
রাখতে, আর client-কে দিতে একটি **reference**: generated একটি অস্বচ্ছ id। Form submit হলে browser সেই id আর
argument-গুলো আপনার application-এ POST করে। Next.js মিলে যাওয়া function-টা চালায়।

Action কীভাবে লিখবেন, তার সবকিছু এই একটি কথা থেকেই আসে। Action একটি HTTP endpoint। তার একটি URL আছে। Caller যা
পাঠায়, action সবই নেয়। পাশের component-টা administrator-এর জন্য render হয়েছিল কি না, তাতে action-এর কিছু যায় আসে না।

> Action-কে তার form-এর পাশে রাখা একটা সুবিধা, security boundary নয়। Action কোন file-এ আছে, তা দেখে বোঝা যায় না
> কে একে call করতে পারে।

> ⚠️ **যা বদলাতে থাকে:** action ঘিরে থাকা API-গুলো প্রতিটি release-এ বদলায়। `useActionState` জায়গা নিয়েছে
> `useFormState`-এর, আর `forbidden()` ও `unauthorized()` এসেছে নিজস্ব file convention নিয়ে। টেকসই নীতি বদলায় না:
> action একটি public endpoint, আর check-গুলো থাকবে তার ভেতরেই।

## কীভাবে কাজ করে

### গঠন

```tsx
// app/actions.ts
"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";

export async function createPost(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  const parsed = PostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid post");

  await db.post.create({ data: { ...parsed.data, authorId: session.user.id } });
  updateTag("posts");
  redirect("/posts");
}
```

এটা সরাসরি form-এ দিয়ে দিন। তখন form hydration-এর আগেই (React HTML-এর সঙ্গে যুক্ত হওয়ার আগেই) কাজ করে, কারণ
browser সত্যিকারের submission করে:

```tsx
<form action={createPost}>
  <input name="title" required />
  <button type="submit">Create</button>
</form>
```

React-এর দিকটা React 19 যেখানেই চলুক, একই: ফেরত value আর pending flag-এর জন্য `useActionState`, চলমান state-এর
জন্য `useOptimistic`, আর submit button-এর ভেতরে `useFormStatus`।
[Chapter ?? — Action ও Form](#ch-react-actions-and-forms)-এ সেটা আছে। এই অধ্যায় server-এর দিকটা নিয়ে।

### চারটি check

প্রতিটি action কিছু ছোঁয়ার আগে এই চারটি কাজ করে, এই ক্রমেই।

| Check          | প্রশ্ন                                          | বাদ পড়লে কী হয়                                 |
| -------------- | --------------------------------------------- | --------------------------------------------- |
| **Authenticate** | কে call করছে?                                | Internet-এর যে কেউ আপনার mutation চালাতে পারে  |
| **Authorise**    | তার কি *এই কাজটা* করার অনুমতি আছে?            | যেকোনো logged-in user administrator সাজতে পারে |
| **Validate**     | Input-এর shape কি ঠিক?                        | ভাঙাচোরা data database-এ পৌঁছে যায়             |
| **Scope**        | যে record-এর নাম দিল, সেটা কি তারই?           | শুধু id বদলে যেকোনো user যেকোনো row edit করতে পারে |

চতুর্থটাই মানুষ বাদ দেয়। App Router-এর code review-এ সবচেয়ে বেশি ধরা পড়া সমস্যা এখান থেকেই আসে।

```typescript
// ❌ Unsafe: the whole item, including its id, came from the client
export async function completeItemUnsafe(item: Item): Promise<void> {
  await db.item.update({ where: { id: item.id }, data: { completed: true } });
}

// ✅ Safe: take only the change, derive identity from the session, look up by ownership
export async function completeItem(itemId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) unauthorized();

  const item = await db.item.findFirst({ where: { id: itemId, ownerId: session.user.id } });
  if (!item) forbidden(); // not "not found" — they are not allowed to know

  await db.item.update({ where: { id: item.id }, data: { completed: true } });
}
```

`next/navigation`-এর `unauthorized()` আর `forbidden()` throw করে মিলে যাওয়া `unauthorized.tsx` আর
`forbidden.tsx` file-এ পাঠায়। ফলে failure-এর UI action-এর বাইরে থাকে।

### Validation form-এর কাজ নয়

`FormData`-র value হলো `string | File | null`। Input-এ `required` attribute browser-এর জন্য শুধু একটি ইঙ্গিত, আর
হাতে বানানো POST-এ সেটা থাকেই না। একমাত্র যে validation গোনায় ধরা হয়, সেটা চলে action-এর ভেতরে, runtime schema দিয়ে।

```typescript
const PostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  publishAt: z.coerce.date().optional(),
});
```

Throw না করে failure-টা state হিসেবে return করুন, যাতে form সেটা render করতে পারে। `useActionState`-এর state
parameter ঠিক এজন্যই।

### Next.js নিজে যা করে দেয়

দুটি সুরক্ষা বিনা খরচে পাওয়া যায়। এগুলো আছে জানার চেয়ে এদের সীমা জানা বেশি জরুরি।

- **CSRF** (cross-site request forgery)। Next.js `Origin` header-কে `Host`-এর সঙ্গে মিলিয়ে দেখে, আর না মিললে
  request বাতিল করে। Host বদলে দেয় এমন reverse proxy-র পেছনে থাকলে এটা আবার চালু করতে
  `serverActions.allowedOrigins` set করুন। এটা দেখে request কোথা থেকে এসেছে। এটা authentication নয়।
- **Closure encryption।** Action তার component থেকে যে variable-গুলো ধরে রাখে, client-এ পাঠানোর আগে Next.js সেগুলো
  encrypt করে। তাই closure-এ ধরা user id page source-এ পড়া যায় না। কয়েকটি server instance থাকলে build-এর সময়
  `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` দিয়ে সবাইকে একই key share করতে হয়। না করলে যে instance payload-টা
  বানায়নি, সেখানে decryption fail করে।

Encrypt করা মানে এই নয় যে authorisation-এর জন্য ভরসা করা যায়। Closure হলো সেই render-এর একটি value, যা form-টা
তৈরি করেছিল। একে input হিসেবে ধরুন, আর আবার check করুন:

```tsx
export default async function Page() {
  const publishVersion = await getLatestVersion();

  async function publish(): Promise<void> {
    "use server";
    // The version the user saw. Re-read the current one — the form may be minutes old.
    if (publishVersion !== (await getLatestVersion())) throw new Error("Version has changed");
    await publishDraft();
  }

  return <form><button formAction={publish}>Publish</button></form>;
}
```

### Mutation-এর পরে

যে action data বদলায় কিন্তু কিছুই invalidate করে না, সেটা user-কে পুরনো value-ই দেখাতে থাকে। Tag ধরে invalidate
করুন, তারপর flow এগোলে redirect করুন। একই user-কে ফল দেখাতে হলে `updateTag`, আর পরের visitor দেখলেই চললে
`revalidateTag`। এই পার্থক্য আছে
[Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching)-এ।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                          | কী ব্যবহার করবেন                              |
| ------------------------------------------------ | ------------------------------------------- |
| আপনার নিজের application-এর form                  | Server Action                               |
| Client Component-এর button থেকে mutation         | Server Action, import করে call করুন          |
| এমন read, যা CDN cache করতে পারা উচিত             | Route Handler — action সবসময় POST          |
| Mobile client বা third-party integration          | Documented contract সহ Route Handler        |
| Payment provider-এর webhook                       | Route Handler — signature check লাগে        |
| অনেকক্ষণ চলা job                                  | Action থেকে queue-তে দিন; action আটকে রাখবেন না |

## সাধারণ ভুল

**❌ Client থেকে পুরো object পাঠানো।** `completeItem(item)` দিলে id, owner আর price caller-ই ঠিক করে দেয়। যতটুকু
না পাঠালেই নয়, ততটুকু পাঠান, সাধারণত একটি identifier আর একটি পরিবর্তন। বাকিটা server-এ খুঁজে নিন।

**❌ Component private ছিল বলে action-ও private ধরে নেওয়া।** কোনো UI render হোক বা না হোক, endpoint থাকে। যে action
শুধু admin page থেকে পৌঁছানো যায়, সেটা `curl` থেকেও পৌঁছানো যায়।

**❌ `required`, `maxlength` বা disabled button-এ ভরসা করা।** তিনটিই client-side, আর replay করা request-এ এদের একটিও
থাকে না। সবসময় action-এর ভেতরে validate করুন।

**❌ Cache করা যায় এমন read-এর জন্য action।** Server Action হলো POST। তাই HTTP cache নেই, CDN নেই, আর call-গুলো
একটির পর একটি চলে। এর বদলে Route Handler বা Server Component-এ fetch ব্যবহার করুন।

**❌ Write-এর পরে revalidation নেই।** Mutation সফল হয়, page দেখায় আগের value, আর bug report-এ লেখা আসে "save কাজ
করছে না"।

**❌ `'use server'` file থেকে helper export করা।** প্রতিটি export করা async function call করার মতো endpoint হয়ে যায়,
আর অন্য যেকোনো export থাকলে build fail করে। Action রাখুন নিজস্ব module-এ, helper অন্য জায়গায়।

## 🔑 মূল শিক্ষা

- `'use server'` generated id-ওয়ালা একটি public POST endpoint তৈরি করে; client-এর কাছে থাকে reference, code নয়।
- প্রতিটি action authenticate, authorise, validate করে, আর ownership দিয়ে scope ঠিক করে — এই ক্রমে, action-এর ভেতরে।
- `FormData`-র কোনো type নেই, আর সেটা client-এর হাতে; runtime schema parse-ই একমাত্র validation, যা গোনায় ধরা হয়।
- Next.js Origin আর Host মিলিয়ে দেখে, closure encrypt করে, কিন্তু এর কোনোটাই authorisation নয়।
- Action শুধু POST: cache করার মতো read আর নিয়ন্ত্রণের বাইরের caller-এর জন্য Route Handler ব্যবহার করুন।

## Interview-এর প্রশ্ন

**Q: User-কে সরাসরি Server Action call করতে কী আটকায়?**

কিছুই না। এটা generated identifier-ওয়ালা একটি HTTP endpoint, আর identifier-টা user-এর হাতে থাকা page-এই আছে।
সুরক্ষা বলতে শুধু action-এর ভেতরের check-গুলো। Session check করুন, permission check করুন, input validate করুন, আর
হাতে পাওয়া id দিয়ে নয়, owner দিয়ে record খুঁজুন।

**Q: আপনার actions file-এর প্রতিটি export-এ পৌঁছানো যায়। এর ফল কী?**

File-টা একটি API surface, তাই সেভাবেই দেখুন। `'use server'` module-এ async helper রাখা চলে না, কারণ প্রতিটি
call করার মতো endpoint হয়ে যায়। Constant তো সেখানে থাকতেই পারে না: async function নয় এমন যেকোনো export build
বাতিল করে দেয়। File-এ শুধু action রাখুন, আর প্রতিটি check করুন।

**Q: একটি Server Action যে page-এ render হয়েছিল, সেখানকার একটি value closure-এ ধরে রেখেছে। এটা কি বিশ্বাস করা যায়?**

Authorisation-এর জন্য নয়। Next.js closure variable encrypt করে, যাতে page source-এ পড়া না যায়। এতে গোপনীয়তা রক্ষা
হয়। কিন্তু value-টা তবু এমন render থেকে আসে, যা হয়তো কয়েক মিনিট পুরনো, আর আসে request-এর সঙ্গেই। একে input
হিসেবে ব্যবহার করুন, সত্য হিসেবে নয়: বর্তমান state আবার পড়ুন আর মিলিয়ে দেখুন।

**Q: কখন এর বদলে Route Handler লিখবেন?**

যখন caller আপনার নিজের UI নয়, অথবা যখন request-টা GET হওয়া উচিত। Mobile client, third-party integration আর
webhook-এর লাগে স্থিতিশীল, documented contract, আর নিজস্ব authentication। Cache করার মতো read-এর লাগে HTTP-এর
semantics, যা শুধু POST চলা action দিতে পারে না। Action হলো সেই mutation-এর জন্য, যা আপনার নিজের application
শুরু করে।

## এরপর কী পড়বেন

- [Chapter ?? — Action ও Form](#ch-react-actions-and-forms) — client-এর দিকটা যে React hook-গুলো চালায়
- [Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching) — write-এর পরে ঠিকভাবে invalidate করা
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — action যে schema দিয়ে parse করে, তার নকশা
