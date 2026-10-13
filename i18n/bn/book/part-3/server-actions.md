---
sourceHash: "0a1e44a60ea7d623955d2fda7f8af662a84243454ce2e728d57f75f2572002bf"
title: "Server Action"
translatedAt: "2026-10-12T12:11:48.650Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Server Action {#ch-server-actions}

> একটি mutation লিখুন সেই form-এর পাশেই, যেটা একে trigger করে, আর এটাকে ঠিক ততটাই সন্দেহের চোখে দেখুন, যতটা একটি public POST endpoint-কে দেখতেন।

**এই অধ্যায়ে:** `'use server'` আসলে কী তৈরি করে · প্রতিটি action-এর যে চারটি check লাগে · validation · revalidation · কখন Route Handler ভালো tool

## 💡 মূল ধারণা

একটি Server Action দেখতে একটি function call-এর মতো, কিন্তু এটা function call নয়। `'use server'` bundler-কে বলে
function-টি server-এ রেখে দিতে, আর client-কে একটি **reference** দিতে: একটি অস্বচ্ছ, generate করা id। Form submit হলে
browser সেই id আর তার argument-গুলো আপনার application-এ POST করে। Next.js মিলে যাওয়া function-টি চালায়।

Action কীভাবে লিখবেন, তার সবকিছু এই একটি সত্য থেকেই আসে। Action একটি HTTP endpoint। এর একটি URL আছে। Caller যা
পাঠায়, এটা তাই নেয়। এর পাশের component যে একজন administrator-এর জন্য render হয়েছিল, তাতে এর কিছু যায় আসে না।

> Action-কে তার form-এর পাশে রাখা একটি সুবিধা, security boundary নয়। Action কোন file-এ আছে, তা থেকে বোঝা যায় না কে এটা
> call করতে পারে।

> ⚠️ **যা বদলাতে থাকে:** action-এর চারপাশের API প্রতিটি release-এ বদলায়। `useActionState` `useFormState`-এর
> জায়গা নিয়েছে, আর `forbidden()` ও `unauthorized()` এসেছে নিজস্ব file convention নিয়ে। স্থায়ী নীতিটি বদলায় না:
> একটি action একটি public endpoint, আর check-গুলোর জায়গা এর ভেতরে।

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

এটা সরাসরি একটি form-এ পাঠিয়ে দিন। তখন form-টি hydration-এর আগেই (React HTML-এর সাথে যুক্ত হওয়ার আগে) কাজ করে,
কারণ browser একটি সত্যিকারের submission করে:

```tsx
<form action={createPost}>
  <input name="title" required />
  <button type="submit">Create</button>
</form>
```

React 19 যেখানেই চলে, সেখানে React-এর দিকটা একই: return করা value আর pending flag-এর জন্য `useActionState`, চলমান
state-এর জন্য `useOptimistic`, আর submit button-এর ভেতরে `useFormStatus`।
[Chapter ?? — Action ও Form](#ch-react-actions-and-forms) এটা নিয়ে আলোচনা করে। এই অধ্যায় server-এর অর্ধেকটা নিয়ে।

### চারটি check

প্রতিটি action কোনো কিছু ছোঁয়ার আগে এই চারটি কাজ করে, এই ক্রমে।

| Check          | প্রশ্ন                                      | বাদ পড়লে যা হয়                              |
| -------------- | --------------------------------------------- | --------------------------------------------- |
| **Authenticate** | কে call করছে?                              | Internet-এর যে কেউ আপনার mutation চালাতে পারে   |
| **Authorise**    | তাদের কি *এই কাজটি* করার অনুমতি আছে?                | যেকোনো logged-in user administrator-এর মতো কাজ করতে পারে |
| **Validate**     | Input কি সঠিক shape-এর?                 | ত্রুটিপূর্ণ data database-এ পৌঁছায়            |
| **Scope**        | যে record-এর নাম দিয়েছে, সেটা কি তাদের নিজের?             | একটি id বদলে যেকোনো user যেকোনো row edit করতে পারে    |

চতুর্থটিই মানুষ বাদ দেয়। App Router code review-এ সবচেয়ে সাধারণ finding-টির কারণ এটাই।

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

`next/navigation`-এর `unauthorized()` আর `forbidden()` throw করে মিলে যাওয়া `unauthorized.tsx` আর `forbidden.tsx`
file-এ নিয়ে যায়। এতে failure UI action-এর বাইরে থাকে।

### Validation মানে form নয়

`FormData`-র value হলো `string | File | null`। একটি input-এর `required` attribute browser-এর জন্য একটি ইঙ্গিত মাত্র,
আর হাতে বানানো একটি POST-এ সেটা থাকে না। একমাত্র যে validation গোনায় ধরা হয়, সেটা action-এর ভেতরে চলে, একটি runtime
schema দিয়ে।

```typescript
const PostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  publishAt: z.coerce.date().optional(),
});
```

Throw না করে failure-টি state হিসেবে return করুন, যাতে form সেটা render করতে পারে। `useActionState`-এর state
parameter এজন্যই আছে।

### Next.js আপনার হয়ে যা করে

দুটি সুরক্ষা বিনামূল্যে আসে। এগুলো যে আছে তা জানার চেয়ে এদের সীমা জানা বেশি জরুরি।

- **CSRF** (cross-site request forgery)। Next.js `Origin` header-কে `Host`-এর সাথে তুলনা করে, আর দুটি আলাদা হলে
  request প্রত্যাখ্যান করে। এমন reverse proxy-র পেছনে, যেটা host rewrite করে, এটা আবার চালু করতে
  `serverActions.allowedOrigins` set করুন। এটা check করে request কোথা থেকে এসেছে। এটা authentication নয়।
- **Closure encryption।** একটি action তার component থেকে যে variable-গুলো capture করে, client-এ পাঠানোর আগে Next.js
  সেগুলো encrypt করে। তাই closure-এ ধরা একটি user id page source-এ পড়া যায় না। একাধিক server instance থাকলে, build-এর
  সময় `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`-এর মাধ্যমে তাদের key share করতে হবে। নইলে যে instance payload তৈরি করেনি,
  তার যেকোনোটিতে decryption fail করে।

Encrypt করা মানে authorisation-এর জন্য বিশ্বাস করা নিরাপদ, এমন নয়। Closure হলো সেই render-এর একটি value, যেটা form
তৈরি করেছিল। এটাকে input হিসেবে দেখুন, আর আবার check করুন:

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

যে action data বদলায় কিন্তু কিছুই invalidate করে না, সে user-কে পুরোনো value দেখিয়ে রাখে। Tag ধরে invalidate করুন,
তারপর flow এগিয়ে গেলে redirect করুন। একই user-কে যখন result দেখতেই হবে, তখন `updateTag` ব্যবহার করুন, আর পরের
visitor দেখলেই যথেষ্ট হলে `revalidateTag`। এই পার্থক্য
[Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching)-এ আলোচনা করা হয়েছে।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                        | কী ব্যবহার করবেন                                   |
| ------------------------------------------------ | ------------------------------------------- |
| আপনার নিজের application-এর একটি form                    | একটি Server Action                             |
| একটি Client Component button থেকে একটি mutation         | একটি Server Action, import করে call করা        |
| এমন একটি read, যেটা একটি CDN-এর cache করতে পারা উচিত         | একটি Route Handler — action সবসময় POST   |
| একটি mobile client বা third-party integration      | Document করা contract-সহ একটি Route Handler  |
| একটি payment provider-এর webhook                 | একটি Route Handler — এর signature check লাগে |
| দীর্ঘক্ষণ চলা একটি job                                | Action থেকে enqueue করুন; এটাকে block করবেন না    |

## সাধারণ ভুল

**❌ Client থেকে পুরো object পাঠানো।** `completeItem(item)` caller-কে id, owner আর price বেছে নিতে দেয়। ন্যূনতমটুকু
পাঠান, সাধারণত একটি identifier আর একটি পরিবর্তন, আর বাকিটা খুঁজে বের করুন।

**❌ Component private ছিল বলে action-কেও private ধরে নেওয়া।** কোনো UI render হোক বা না হোক, endpoint থাকেই। যে action
শুধু একটি admin page থেকে পৌঁছানো যায়, সেটা `curl` থেকেও পৌঁছানো যায়।

**❌ `required`, `maxlength` বা একটি disabled button-কে বিশ্বাস করা।** তিনটিই client-side, আর একটি replay করা
request-এ এদের কোনোটিই থাকে না। সবসময় action-এর ভেতরে validate করুন।

**❌ Cache করা যায় এমন read-এর জন্য action ব্যবহার করা।** Server Action হলো POST। তাই কোনো HTTP cache নেই, CDN নেই,
আর call-গুলো একটির পর একটি চলে। তার বদলে একটি Route Handler বা একটি Server Component fetch ব্যবহার করুন।

**❌ Write-এর পরে কোনো revalidation নেই।** Mutation সফল হয়, page আগের value দেখায়, আর bug report বলে "save কাজ
করে না"।

**❌ একটি `'use server'` file থেকে helper export করা।** প্রতিটি export করা async function একটি call করা যায় এমন
endpoint হয়ে যায়, আর অন্য যেকোনো export-এ build fail করে। Action-গুলো নিজস্ব module-এ রাখুন, helper অন্য কোথাও।

## 🔑 মূল শিক্ষা

- `'use server'` একটি generate করা id-সহ একটি public POST endpoint তৈরি করে; client-এর কাছে থাকে একটি reference, code নয়।
- প্রতিটি action authenticate, authorise, validate করে আর ownership দিয়ে scope করে — এই ক্রমে, action-এর ভেতরে।
- `FormData` untyped আর client-এর নিয়ন্ত্রণে; একটি runtime schema parse-ই একমাত্র validation, যেটা গোনায় ধরা হয়।
- Next.js Origin-কে Host-এর সাথে check করে আর closure encrypt করে, কিন্তু কোনোটিই authorisation নয়।
- Action শুধু POST: cache করা যায় এমন read-এর জন্য, আর যে caller-রা আপনার নিয়ন্ত্রণে নেই তাদের জন্য, একটি Route Handler ব্যবহার করুন।

## Interview-এর প্রশ্ন

**Q: একজন user-কে সরাসরি একটি Server Action call করা থেকে কী আটকায়?**

কিছুই না। এটা একটি generate করা identifier-সহ একটি HTTP endpoint, আর সেই identifier user-এর হাতে থাকা page-এই আছে।
একমাত্র সুরক্ষা হলো action-এর ভেতরের check-গুলো। Session check করুন, permission check করুন, input validate করুন, আর
record খুঁজুন owner দিয়ে, আপনার হাতে দেওয়া id দিয়ে নয়।

**Q: আপনার actions file-এর প্রতিটি export-এ পৌঁছানো যায়। এর ফল কী?**

File-টি একটি API surface, তাই এটাকে সেভাবেই দেখুন। Async helper-এর জায়গা `'use server'` module-এ নয়, কারণ প্রতিটি
একটি call করা যায় এমন endpoint হয়ে যায়। Constant তো সেখানে থাকতেই পারে না: async function নয় এমন যেকোনো export
build প্রত্যাখ্যান করে। File-এ শুধু action রাখুন, আর প্রতিটি check করুন।

**Q: একটি Server Action যে page-এ render হয়েছিল, সেখানকার একটি value-র ওপর close করে। এটা কি বিশ্বাস করা যায়?**

Authorisation-এর জন্য নয়। Next.js closure variable encrypt করে, যাতে page source-এ সেগুলো পড়া না যায়। এতে
গোপনীয়তা রক্ষা পায়। কিন্তু value-টি তবু এমন একটি render থেকে আসে, যেটা হয়তো কয়েক মিনিট পুরোনো, আর এটা request-এর
সাথেই আসে। এটাকে একটি input হিসেবে ব্যবহার করুন, সত্য হিসেবে নয়: বর্তমান state আবার পড়ুন আর তুলনা করুন।

**Q: কখন তার বদলে একটি Route Handler লিখবেন?**

যখন caller আপনার নিজের UI নয়, বা যখন request-টি GET হওয়া উচিত। Mobile client, third-party integration আর webhook-এর
একটি স্থিতিশীল, document করা contract আর নিজস্ব authentication লাগে। Cache করা যায় এমন read-এর HTTP semantics লাগে,
যেটা শুধু-POST একটি action দিতে পারে না। Action হলো সেই mutation-এর জন্য, যেগুলো আপনার নিজের application শুরু করে।

## এরপর কী পড়বেন

- [Chapter ?? — Action ও Form](#ch-react-actions-and-forms) — যে React hook-গুলো client-এর অর্ধেকটা চালায়
- [Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching) — একটি write-এর পরে সঠিকভাবে invalidate করা
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — action যে schema দিয়ে parse করে, সেটা design করা
