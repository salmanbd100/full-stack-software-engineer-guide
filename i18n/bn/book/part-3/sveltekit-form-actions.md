---
sourceHash: "3867fff9d4082ae6aafd7b4a0a05ebb4e977f1857f122de412ee4b23d19ebdf1"
title: "SvelteKit Form Action"
translatedAt: "2026-10-17T01:38:43.407Z"
model: "claude-opus-5-5 (Claude Code)"
---

# SvelteKit Form Action {#ch-sveltekit-form-actions}

> এমন form লিখুন, যা আপনার JavaScript পৌঁছানোর আগেই কাজ করে। তারপর SvelteKit-কে দিন সেটাকে application-এর মতো অনুভব করানোর দায়িত্ব।

**এই অধ্যায়ে:** default action · named action · `fail` দিয়ে validation error ফেরত দেওয়া · `use:enhance` আপনার হয়ে কী করে · security check কোথায় বসে

## 💡 মূল ধারণা

SvelteKit 2-এর form action হলো **সত্যিকারের HTML form submission**। Browser route-এ `multipart/form-data` post করে,
server সেটা সামলায়, আর response হিসেবে আসে একটি page। এটাই ভিত্তি। JavaScript বন্ধ থাকলেও এটা চলে, ধীর connection-এও
চলে, আর আপনার bundle download শেষ হওয়ার আগে আসা request-এর জন্যও চলে।

তারপর `use:enhance` একই form-কে page reload ছাড়া `fetch`-এ উন্নীত করে। Server-এ কিছুই বদলায় না। এই ক্রমটাই আসল
কথা: **enhance করা পথ হলো চালু পথটার একটি optimisation**, উল্টোটা নয়। তাই "JavaScript ছাড়া কী হবে" এই প্রশ্নের
উত্তর পরে আর কখনো খুঁজতে হয় না।

> ⚠️ **যা বদলাতে থাকে:** SvelteKit 2.27 experimental `kit.experimental.remoteFunctions` flag-এর পেছনে **remote
> function** যোগ করেছে। এগুলো হলো `query`, `form`, `command` আর `prerender`, যা `.remote.ts` file থেকে export
> হয় আর সরাসরি component-এ import করা যায়। একই কাজের এটা আলাদা একটি রূপ, আর এখনো stable নয়। টেকসই নীতি দুই
> ক্ষেত্রেই খাটে: mutation হলো server-side function, যার নিজস্ব authorisation আর validation থাকে।

## কীভাবে কাজ করে

### Default action

```typescript
// src/routes/login/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "");

    const user = await authenticate(email, String(data.get("password") ?? ""));
    if (!user) {
      // 4xx plus the data the form needs to re-render itself
      return fail(400, { email, incorrect: true });
    }

    cookies.set("session", await createSession(user.id), { path: "/", httpOnly: true });
    redirect(303, "/dashboard");
  },
} satisfies Actions;
```

```svelte
<script lang="ts">
  let { form } = $props(); // whatever the action returned
</script>

<form method="POST">
  <input name="email" value={form?.email ?? ""} />
  <input name="password" type="password" />
  {#if form?.incorrect}<p class="error">Those details did not match.</p>{/if}
  <button>Sign in</button>
</form>
```

তিনটি জিনিস আলাদা করে বলার মতো। `fail(status, data)` ফেরত দেয় **body-সহ একটি 4xx**। ফলে page আবার render হয়, আর
user-এর লেখা input field-গুলোতে থেকে যায়। `redirect(303, …)` ব্যবহার করে See Other status, তাই browser এরপর একটি
`GET` করে, আর refresh করলে আবার post হয় না। আর return করা value আসে `form` prop হিসেবে, action থেকেই type পেয়ে।

### Named action

একটি route-এ প্রায়ই কয়েকটি verb লাগে। সেগুলোর নাম দিন, আর form থেকে একটিকে target করুন:

```typescript
export const actions = {
  create: async ({ request }) => {
    /* … */
  },
  archive: async ({ request }) => {
    /* … */
  },
} satisfies Actions;
```

```svelte
<form method="POST" action="?/create">…</form>

<!-- or a second button inside one form -->
<button formaction="?/archive">Archive</button>
```

একটি route-এ হয় একটি `default` action থাকে, নয়তো named action-গুলো। দুটি একসঙ্গে থাকতে পারে না। সাধারণ HTML পথ
`?/name` query parameter দিয়ে এদের মধ্যে বাছাই করে। এজন্যই এটা JavaScript ছাড়াও কাজ করে।

### `use:enhance`

```svelte
<script lang="ts">
  import { enhance } from "$app/forms";
</script>

<form method="POST" use:enhance>…</form>
```

কিছু না দিয়ে শুধু যোগ করলে এটা submission আটকে `fetch` দিয়ে পাঠায়। তারপর browser যা করত, তা-ই করে। `form` prop আর
page status update করে, সফল হলে form reset করে, **সব load data invalidate করে**, আর redirect follow করে। ফলাফল আচরণ
করে সাধারণ version-এর মতোই, শুধু reload ছাড়া।

যে অংশগুলো আপনার হাতে চান, সেগুলোর দায়িত্ব নিতে একটি function দিন:

```svelte
<script lang="ts">
  import { enhance } from "$app/forms";
  let saving = $state(false);
</script>

<form
  method="POST"
  use:enhance={() => {
    saving = true;
    return async ({ update }) => {
      await update(); // the default behaviour — keep it unless you mean not to
      saving = false;
    };
  }}
>
  <button disabled={saving}>{saving ? "Saving…" : "Save"}</button>
</form>
```

> ⚠️ Callback return করলে default handling **বাদ পড়ে যায়**। `update()` call করতে ভুলে গেলে form আর reset হয় না,
> `form` prop আর আসে না, আর load-গুলো আবার চলে না। কোনো error-ও আপনাকে জানায় না।

### Security check কোথায় বসে

Action একটি public endpoint। যে কেউ `POST` দিয়ে এখানে পৌঁছাতে পারে, তাই page-এর পাশে থাকা কিছুই প্রমাণ করে না:

```typescript
export const actions = {
  archive: async ({ request, locals, params }) => {
    if (!locals.user) return fail(401, { message: "Sign in first." });

    const parsed = archiveSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { errors: parsed.error.flatten().fieldErrors });

    // Ownership is part of the query, not a check after it
    const updated = await db.invoice.updateMany({
      where: { id: params.id, ownerId: locals.user.id },
      data: { archived: true },
    });
    if (updated.count === 0) return fail(403, { message: "Not yours to archive." });
  },
} satisfies Actions;
```

Session, validation আর ownership প্রতিবার check করুন, action-এর ভেতরে। Schema design আছে
[Chapter ?? — Input Validation](#ch-backend-input-validation)-এ। এখানে সেটা call করা হয়।

Default-ভাবে SvelteKit form post-এ `Origin` header check করে। এতে পুরনো ধাঁচের cross-site form submission আটকায়।
তবে এটা ন্যূনতম সুরক্ষা মাত্র, ওপরের authorisation check-এর বিকল্প নয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                       | ব্যবহার করুন                                 |
| ------------------------------------------- | ----------------------------------------- |
| User যে form submit করেন                     | Form action                                |
| এক page-এ কয়েকটি verb                        | Named action                               |
| Form ছাড়া mutation — যেমন "like" button      | `+server.ts` endpoint, বা একটি command     |
| Webhook বা public API                        | `+server.ts`                               |
| Optimistic UI                                | Custom callback-সহ `use:enhance`           |
| File upload                                  | Form action — `formData` এটা সামলায়         |

## সাধারণ ভুল

**❌ Submit করা value ছাড়া `fail()` return করা।** Page খালি অবস্থায় আবার render হয়, আর user-কে সব আবার টাইপ করতে
হয়। তাঁরা যা লিখেছিলেন, password বাদে, সব ফেরত পাঠান।

**❌ POST-এর পর 302 redirect।** `redirect(303, …)` ব্যবহার করুন, যাতে browser এরপর `GET` করে। নইলে refresh করলে
আবার submit হয়।

**❌ এমন custom `enhance` callback, যা কখনো `update()` call করে না।** চুপচাপ হারিয়ে গেছে reset, `form` prop আর
invalidation।

**❌ Page-এর পাশে আছে বলে action-কে বিশ্বাস করা।** এটা একটি URL। Session check করুন, body validate করুন, আর ownership
রাখুন query-র ভেতরে।

**❌ আগে JavaScript-এর পথ বানানো।** আগে সাধারণ form লিখুন, scripting বন্ধ রেখে কাজ করে কি না দেখুন, তারপর
`use:enhance` যোগ করুন। উল্টো ক্রমে করলে JavaScript ছাড়া পথটা চুপচাপ কাজ করা বন্ধ করে দেয়।

**❌ Validation ব্যর্থ হলে সাদামাটা `Error` throw করা।** তাতে হয় একটি 500 আর একটি error page। Validation-এর ব্যর্থতা
হলো `fail(400, …)`, আর তার জায়গা form-এর ভেতরে।

## 🔑 মূল শিক্ষা

- Form action সত্যিকারের HTML form post, তাই কোনো JavaScript load হওয়ার আগেই route কাজ করে।
- `fail(status, data)` user-এর input-সহ page আবার render করে। `redirect(303, …)` আবার post হওয়া ঠেকায়।
- `use:enhance` একই form-কে `fetch`-এ উন্নীত করে। Custom callback দিলে, `update()` call না করলে, default আচরণ বাদ পড়ে।
- Action হলো public endpoint। Session, validation আর ownership check সবই এর ভেতরে থাকবে।
- Named action আর `?/name` মিলে এক route-এ কয়েকটি verb scripting ছাড়াই চালু রাখে।

## Interview-এর প্রশ্ন

**Q: Hydration-এর আগে SvelteKit form কেমন আচরণ করে?**

ঠিক একটি HTML form-এর মতো: browser route-এ post করে, action চলে, আর server একটি page ফেরত দেয়। এটাই default পথ,
fallback নয়। পরে `use:enhance` একই submission আটকে সেটা `fetch` দিয়ে পাঠায়। তাই এখানে progressive enhancement-এর
জন্য বাড়তি কোনো code লাগে না। চালু version-টাই আপনি প্রথমে লিখেছেন।

**Q: Action-এ `fail` আর error throw করার পার্থক্য কী?**

`fail` body-সহ একটি 4xx ফেরত দেয়, তাই page আবার render হয় user-এর data আর আপনার validation message-সহ, `form` prop-এ।
Throw করলে আসে error page, আর submission হারিয়ে যায়। Validation-এর সমস্যা প্রত্যাশিত ফলাফল, তাই সেগুলো যাবে `fail`-এ।
Throw করা error-এর মানে হওয়া উচিত সত্যিই কিছু গোলমাল হয়েছে।

**Q: `use:enhance`-কে callback দিলে কী হয়?**

এটা request-এর আগে, আর return করা function-এর মাধ্যমে response-এর পরে, নিয়ন্ত্রণ আপনার হাতে দেয়। সঙ্গে নিজের কাজও
বন্ধ করে দেয়। `update()` default আচরণটা চালায়: form reset করে, `form` prop update করে, load invalidate করে আর redirect
follow করে। যে callback এটা কখনো call করে না, সেটা চুপচাপ এই চারটিই বন্ধ করে দিয়েছে।

**Q: কেউ সরাসরি আপনার form action-এ post করলে তাকে কী আটকায়?**

কিছুই না, আর সেটাই আসল কথা। Action একটি URL, যা যেকোনো client-এর `POST` নেয়। SvelteKit `Origin` header check করে,
যা পুরনো ধাঁচের cross-site submission সামলায়। কিন্তু authorisation আর validation আপনার দায়িত্ব। Session verify করুন,
body-কে schema দিয়ে parse করুন, আর ownership পরে check না করে query-র ভেতরেই রাখুন।

## এরপর কী পড়বেন

- [Chapter ?? — SvelteKit-এ Routing ও Loading](#ch-sveltekit-routing-and-loading) — একই model-এর read-এর দিক
- [Chapter ?? — Server Action](#ch-server-actions) — একই প্রশ্নের Next.js-এর উত্তর
- [Chapter ?? — Input Validation](#ch-backend-input-validation) — action যে schema parse করে, তার design
