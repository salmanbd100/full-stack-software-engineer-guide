---
sourceHash: "3867fff9d4082ae6aafd7b4a0a05ebb4e977f1857f122de412ee4b23d19ebdf1"
title: "SvelteKit Form Action"
translatedAt: "2026-10-12T12:11:38.172Z"
model: "claude-opus-5-5 (Claude Code)"
---

# SvelteKit Form Action {#ch-sveltekit-form-actions}

> এমন একটি form লিখুন, যেটা আপনার JavaScript পৌঁছানোর আগেই কাজ করে, তারপর SvelteKit-কে এটাকে একটি application-এর মতো অনুভূতি দিতে দিন।

**এই অধ্যায়ে:** default action · named action · `fail` দিয়ে validation error return করা · `use:enhance` আপনার জন্য কী করে · security check কোথায় বসে

## 💡 মূল ধারণা

SvelteKit 2-এর একটি form action হলো একটি **সত্যিকারের HTML form submission**। Browser route-এ `multipart/form-data`
post করে, server সেটা সামলায়, আর response হয় একটি page। এটাই ভিত্তি। এটা JavaScript বন্ধ থাকলেও কাজ করে, ধীর
connection-এও, আর এমন request-এর জন্যও, যেটা আপনার bundle download শেষ হওয়ার আগেই আসে।

তারপর `use:enhance` একই form-কে page reload ছাড়া একটি `fetch`-এ উন্নীত করে। Server-এ কিছুই বদলায় না।
এই ক্রমটাই আসল কথা: **enhanced path হলো কাজ করা path-এর একটি optimisation**, উল্টোটা নয়। তাই
"JavaScript ছাড়া কী হবে" প্রশ্নের উত্তর আপনাকে পরে কখনো দিতে হয় না।

> ⚠️ **যা বদলাতে থাকে:** SvelteKit 2.27 experimental `kit.experimental.remoteFunctions` flag-এর পেছনে
> **remote function** যোগ করেছে। এগুলো হলো `query`, `form`, `command` আর `prerender`, যেগুলো `.remote.ts` file
> থেকে export হয় আর সরাসরি component-এ import হয়। একই কাজের জন্য এগুলো ভিন্ন একটি আকার, আর এখনো stable নয়।
> যে নীতি টিকে থাকবে, তা দুই ক্ষেত্রেই খাটে: mutation হলো একটি server-side function, যার নিজস্ব authorisation
> আর validation আছে।

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

তিনটি জিনিস আলাদা করে বলার মতো। `fail(status, data)` একটি **body-সহ 4xx** return করে। এতে page আবার render হয়,
আর user-এর input field-গুলোতে থেকে যায়। `redirect(303, …)` See Other status ব্যবহার করে, তাই browser একটি
`GET` দিয়ে অনুসরণ করে, আর refresh করলে আবার post হয় না। আর return করা value `form` prop হিসেবে আসে, যার type
action থেকে নেওয়া।

### Named action

একটি route-এর প্রায়ই কয়েকটি verb লাগে। সেগুলোর নাম দিন, আর form থেকে একটিকে target করুন:

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

একটি route-এ হয় একটি `default` action থাকে, নয়তো named action-গুলো, কখনো দুটোই নয়। সাধারণ HTML path
`?/name` query parameter দিয়ে এদের মধ্যে বাছাই করে। এজন্যই এটা JavaScript ছাড়া কাজ করে।

### `use:enhance`

```svelte
<script lang="ts">
  import { enhance } from "$app/forms";
</script>

<form method="POST" use:enhance>…</form>
```

খালি যোগ করলে এটা submission আটকে দেয়, আর `fetch` দিয়ে পাঠায়। তারপর browser যা করত, সেটাই করে। এটা `form`
prop আর page status update করে, সফল হলে form reset করে, **সব load data invalidate করে**, আর redirect অনুসরণ করে।
ফলাফল সাধারণ সংস্করণের মতোই আচরণ করে, শুধু reload ছাড়া।

আপনার যে অংশগুলো দরকার, সেগুলোর নিয়ন্ত্রণ নিতে একটি function দিন:

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

> ⚠️ একটি callback return করলে default handling **প্রতিস্থাপিত** হয়। `update()` call করতে ভুলে গেলে form reset
> হওয়া বন্ধ হয়, `form` prop আসা বন্ধ হয়, আর load আবার চলা বন্ধ হয়। কোনো error আপনাকে জানায় না।

### Security check কোথায় বসে

একটি action হলো একটি public endpoint। যে কেউ একটি `POST` দিয়ে এখানে পৌঁছাতে পারে, তাই page-এর পাশে থাকা কিছুই
প্রমাণ করে না:

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

প্রতিবার action-এর ভেতরে session, validation আর ownership check করুন। Schema design-এর জায়গা
[Chapter ?? — Input Validation](#ch-backend-input-validation)-এ। আর এখানেই আপনি সেটা call করেন।

Default-ভাবে SvelteKit form post-এ `Origin` header check করে। এটা পুরনো ধাঁচের cross-site form
submission ঠেকায়। এটা একটি ন্যূনতম স্তর, এর ওপরের authorisation check-এর বিকল্প নয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                   | যা ব্যবহার করবেন                                       |
| ------------------------------------------- | ----------------------------------------- |
| User submit করেন এমন একটি form                      | একটি form action                              |
| এক page-এ কয়েকটি verb                    | Named action                              |
| Form ছাড়া একটি mutation — একটি "like" button    | একটি `+server.ts` endpoint, বা একটি command      |
| একটি webhook বা একটি public API                    | `+server.ts`                               |
| Optimistic UI                                | Custom callback-সহ `use:enhance`       |
| একটি file upload                                | একটি form action — `formData` এটা সামলায়      |

## সাধারণ ভুল

**❌ Submit করা value ছাড়া `fail()` return করা।** Page খালি অবস্থায় আবার render হয়, আর user সবকিছু আবার
টাইপ করেন। তিনি যা দিয়েছিলেন তা ফেরত পাঠান, password বাদে।

**❌ একটি POST-এর পর 302 redirect।** `redirect(303, …)` ব্যবহার করুন, যাতে browser একটি `GET` দিয়ে অনুসরণ করে।
নইলে refresh করলে আবার submit হয়।

**❌ এমন custom `enhance` callback, যেটা কখনো `update()` call করে না।** আপনি চুপচাপ reset, `form` prop
আর invalidation হারিয়েছেন।

**❌ Page-এর পাশে আছে বলে action-কে বিশ্বাস করা।** এটা একটি URL। Session check করুন, body validate করুন,
আর ownership-কে query-র ভেতরে রাখুন।

**❌ আগে JavaScript path বানানো।** সাধারণ form লিখুন, scripting বন্ধ রেখে এটা কাজ করে কিনা নিশ্চিত হোন, তারপর
`use:enhance` যোগ করুন। উল্টোভাবে করলে JavaScript-ছাড়া path চুপচাপ কাজ করা বন্ধ করে দেয়।

**❌ Validation ব্যর্থ হলে একটি খালি `Error` throw করা।** সেটা একটি 500 আর একটি error page। Validation-এর
ব্যর্থতা হলো `fail(400, …)`, আর এর জায়গা form-এর ভেতরে।

## 🔑 মূল শিক্ষা

- Form action হলো একটি সত্যিকারের HTML form post, তাই কোনো JavaScript load হওয়ার আগেই route কাজ করে।
- `fail(status, data)` user-এর input-সহ page আবার render করে। `redirect(303, …)` আবার post হওয়া ঠেকায়।
- `use:enhance` একই form-কে `fetch`-এ উন্নীত করে। আপনি `update()` call না করলে একটি custom callback এর default-গুলো প্রতিস্থাপন করে।
- Action হলো public endpoint। Session, validation আর ownership check — সবগুলোর জায়গা এদের ভেতরে।
- Named action, সঙ্গে `?/name`, একটি route-এ একাধিক verb-কে scripting ছাড়াই কাজ করিয়ে রাখে।

## Interview-এর প্রশ্ন

**Q: Hydration-এর আগে একটি SvelteKit form কীভাবে আচরণ করে?**

ঠিক একটি HTML form-এর মতো: browser route-এ post করে, action চলে, আর server একটি page return করে। এটাই
default path, কোনো fallback নয়। পরে `use:enhance` একই submission আটকে দেয়, আর বদলে `fetch` দিয়ে পাঠায়। তাই
এখানে progressive enhancement-এর জন্য কোনো বাড়তি code লাগে না। কাজ করা সংস্করণটাই আপনি প্রথমে লিখেছেন।

**Q: Action-এ `fail` আর একটি error throw করার মধ্যে পার্থক্য কী?**

`fail` একটি body-সহ 4xx return করে, তাই page user-এর data আর আপনার validation message নিয়ে `form` prop-এ আবার
render হয়। Throw করলে একটি error page তৈরি হয়, আর submission হারিয়ে যায়। Validation-এর সমস্যা প্রত্যাশিত ফলাফল,
আর এদের জায়গা `fail`-এ। Throw করা error মানে হওয়া উচিত যে সত্যিই কিছু ভুল হয়েছে।

**Q: `use:enhance`-কে একটি callback দিলে এটা কী করে?**

এটা request-এর আগে, আর return করা function-এর মাধ্যমে response-এর পরে, নিয়ন্ত্রণ আপনার হাতে দেয়। এটা নিজের
কাজ করাও বন্ধ করে দেয়। `update()` default আচরণটি করে: form reset করে, `form` prop update করে, load invalidate
করে আর redirect অনুসরণ করে। যে callback এটা কখনো call করে না, সেটা চুপচাপ চারটিই বন্ধ করে দিয়েছে।

**Q: কাউকে সরাসরি আপনার form action-এ post করা থেকে কী আটকায়?**

কিছুই না, আর সেটাই আসল কথা। Action হলো একটি URL, যেটা যেকোনো client থেকে একটি `POST` গ্রহণ করে। SvelteKit
`Origin` header check করে, যেটা পুরনো ধাঁচের cross-site submission সামলায়। কিন্তু authorisation আর
validation আপনার কাজ। Session যাচাই করুন, body-কে একটি schema-র বিপরীতে parse করুন, আর পরে check না করে
ownership-কে query-র ভেতরে রাখুন।

## এরপর কী পড়বেন

- [Chapter ?? — SvelteKit-এ Routing ও Loading](#ch-sveltekit-routing-and-loading) — একই model-এর read-এর অংশ
- [Chapter ?? — Server Action](#ch-server-actions) — Next.js একই প্রশ্নের উত্তর দিচ্ছে
- [Chapter ?? — Input Validation](#ch-backend-input-validation) — action যে schema parse করে, তার design
