---
sourceHash: "a5e81dc3842e8a50c7fc085a499850765388f9d5ac4e091e27fa3019c1ef7c12"
title: "Form State"
translatedAt: "2026-10-12T12:12:51.019Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Form State {#ch-form-state}

> একটি schema রাখুন, wire-এর দুই পাশেই validate করুন, আর প্রতিটি keystroke-এ পুরো form re-render করা বন্ধ করুন।

**এই অধ্যায়ে:** draft-এর lifecycle · controlled বনাম uncontrolled · একটি schema, দুটি runtime · কখন error দেখাবেন · server-action form · একাধিক ধাপের draft

## 💡 মূল ধারণা

Form state-ই একমাত্র ধরন, যেটা **ইচ্ছা করেই invalid**। একজন user email address টাইপ করার সময় "a", "al", "ali"
পার হয়ে যান। এর কোনোটাই email address নয়, আর প্রতিটি ধাপে সেটা তাঁকে বলা বিরক্তিকর।

এই একটি বৈশিষ্ট্যের কারণেই form application state-এ থাকে না। Application state valid হওয়া উচিত। একটি form হলো
একটি draft, যা শেষে গিয়ে valid হয় — যদি আদৌ হয়।

একটি form-এর একটি lifecycle আছে, আর এই অধ্যায়ের প্রতিটি সিদ্ধান্ত তার কোনো একটি বিন্দুর সঙ্গে যুক্ত:

```text
pristine → dirty → validated → submitting → submitted or failed
```

## কীভাবে কাজ করে

### Controlled বনাম uncontrolled

| | Controlled | Uncontrolled |
| --- | --- | --- |
| **Value কোথায় থাকে** | React state | DOM node |
| **Keystroke-এ re-render** | হ্যাঁ, প্রতিটিতে | না |
| **Value পড়া** | সবসময় পাওয়া যায় | Submit-এর সময়, বা একটি ref দিয়ে |
| **কীসের জন্য দরকার** | Live formatting, নির্ভরশীল field, live preview | বাকি সবকিছু |

একটি বড় controlled form প্রতিটি character-এ re-render হয়। বিশটি field আর প্রতিটি render-এ একবার validation — একটি
মাঝারি মানের phone-এ এতে মাপার মতো input lag হয়। Enterprise form-এ এটাই সবচেয়ে সাধারণ performance সমস্যা।

React Hook Form জনপ্রিয়, কারণ ভেতরে ভেতরে এটা uncontrolled। Input-গুলো DOM-এ register হয়, আর library যা দরকার
শুধু তাতেই subscribe করে। Component re-render হয় শুধু তখন, যখন তার নিজের error state বদলায়।

### একটি schema, দুটি runtime

যেকোনো library বাছাইয়ের চেয়ে একটি নিয়ম বেশি গুরুত্বপূর্ণ: **validation-এর নিয়ম একবার লিখুন, আর দুই জায়গাতেই
চালান।** Client validation একটি user-experience feature। Server validation হলো সঠিকতা। যে নিয়ম শুধু এক পাশে আছে,
সেটা হয় একটি security ফাঁক, নয়তো একটি ভাঙা form।

```typescript
import { z } from 'zod';

// Shared by the form and the endpoint. Zod 4 promotes formats to top level: z.email(), not z.string().email().
export const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(['viewer', 'editor', 'admin']),
  message: z.string().max(500).optional(),
});

export type InviteInput = z.infer<typeof inviteSchema>;
```

`z.infer` দিয়ে Zod runtime নিয়ম থেকেই TypeScript type বের করে নেয়, তাই নিয়মের পাশে আলাদা করে type declare করতে
হয় না। একটি definition, কোনো অমিল নেই।

> ⚠️ **যা বদলাতে থাকে:** Zod 4 string format-গুলোকে top-level function-এ সরিয়েছে (`z.email()` এসেছে
> `z.string().email()`-এর জায়গায়), আর error-issue type-গুলো নতুন করে সাজিয়েছে। যে ধারণা টিকে থাকে, সেটা হলো একটি
> schema, যা runtime validation আর একটি static type দুটিই তৈরি করে। Call-এর syntax বদলাতেই থাকবে। একই চুক্তি মানে
> এমন অন্য validator একটি resolver-এর পেছনে বসিয়ে বদলে নেওয়া যায়।

**Form-এর দিক:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState } = useForm<InviteInput>({
  resolver: zodResolver(inviteSchema),
  mode: 'onTouched', // validate after first blur, then on change
});

const onSubmit = handleSubmit(async (values: InviteInput) => {
  await sendInvite(values); // values are already parsed and typed
});
```

**Endpoint-এর দিক একই schema চালায়:**

```typescript
const parsed = inviteSchema.safeParse(await request.json());
if (!parsed.success) {
  return Response.json({ errors: parsed.error.flatten() }, { status: 400 });
}
```

### কখন error দেখাবেন

Validation-এর *সময়* একটি user-experience সিদ্ধান্ত। ভুল করলে form-কে আক্রমণাত্মক মনে হয়।

| Mode | আচরণ | রায় |
| ---- | --------- | ------- |
| `onSubmit` | Error দেখা যায় শুধু submit করার পরে | নিরাপদ default; লম্বা form-এর জন্য খারাপ |
| `onChange` | টাইপ করার সময়ই error | বিরক্তিকর — প্রতিটি অসম্পূর্ণ value-কে ভুল বলে |
| `onBlur` | Field ছেড়ে যাওয়ার সময় error | ভালো |
| `onTouched` | প্রথমে blur, একবার ছোঁয়ার পরে live | **বেশিরভাগ form-এর জন্য সেরা** |

`onTouched` সেই pattern, যা user-রা আশা করেন। একটি field-এর কাজ শেষ না হওয়া পর্যন্ত কিছু বলবেন না, তারপর তিনি
ঠিক করার সময় live-ভাবে শুধরে দিন।

যে mode-ই বাছুন, error-কে assistive technology পর্যন্ত পৌঁছাতে হবে। `aria-describedby` দিয়ে message-টিকে input-এর
সঙ্গে যুক্ত করুন, field-টিকে `aria-invalid` চিহ্নিত করুন, আর submit ব্যর্থ হলে focus প্রথম error-এ সরিয়ে নিন।
[Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms) দেখুন।

### Server-action form

Server action বদলায় submit handler কোথায় থাকে, validation-এর কী দরকার তা নয়। Form একটি server function-এ post
করে। সেই function একই schema চালায়, আর field error-গুলো data হিসেবে return করে।

এই pattern-এর সঙ্গে দুটি বৈশিষ্ট্য আসে। Form **JavaScript ছাড়াই কাজ করে**, কারণ এটা একটি আসল form, যা একটি আসল
endpoint-এ post করে। আর এটা যে error দেখায়, সেগুলো server-এর, তাই দুই পাশে অমিল হতে পারে না।

দাম হলো প্রতিটি validation-এ একটি round trip। তাই বেশিরভাগ production form client-এও schema চালায়, আর server-কে
চূড়ান্ত কর্তৃপক্ষ ধরে। খুঁটিনাটি (pending state, return করা error, progressive enhancement) আছে
[Chapter ?? — Action ও Form](#ch-react-actions-and-forms) আর
[Chapter ?? — Server Action](#ch-server-actions)-এ। অন্য একটি framework-এ একই ধারণা হলো
[Chapter ?? — SvelteKit Form Action](#ch-sveltekit-form-actions)।

### একাধিক ধাপের form, আর draft কোথায় থাকে

একটি wizard এমন একটি প্রশ্ন তোলে, যা একটি একক form তোলে না: user তৃতীয় ধাপে refresh করলে কী হবে?

| পদ্ধতি | Refresh-এর পরে টেকে | কীসের জন্য ঠিক |
| -------- | ---------------- | --------- |
| একটি form, ধাপগুলো আলাদা view | না | ছোট flow, যা এক বসায় শেষ হয় |
| ধাপ URL-এ, value memory-তে | শুধু ধাপ | যে flow-তে আবার শুরু করা চলে |
| Draft `sessionStorage`-এ রাখা | হ্যাঁ, সেই device-এ | লম্বা flow, কোনো account লাগে না |
| প্রতিটি ধাপে draft server-এ save করা | হ্যাঁ, সব জায়গায় | Application, onboarding, লম্বা যেকোনো কিছু |

প্রতিটি ধাপকে পুরো schema-র একটি অংশ দিয়ে validate করুন, আর চূড়ান্ত submit-এ পুরো schema আবার validate করুন। যে
user একটি restore করা draft দিয়ে শেষ ধাপে পৌঁছেছেন, তিনি হয়তো বর্তমান নিয়মে প্রথম ধাপ পার হননি।

## কখন ব্যবহার করবেন

| পরিস্থিতি | পদ্ধতি |
| --------- | -------- |
| দুই-তিনটি সাধারণ field | Uncontrolled input, আর submit-এ একটি schema |
| একটি সাধারণ business form | React Hook Form আর একটি shared schema, `onTouched` |
| Live formatting বা নির্ভরশীল field | Controlled, শুধু সেই field-গুলোর জন্য |
| Progressive enhancement বাধ্যতামূলক | একটি server-action form, দুই পাশেই schema |
| একটি লম্বা application flow | সংরক্ষিত draft, প্রতিটি ধাপে validation, শেষে পুরো validation |

## সাধারণ ভুল

**❌ Form-এর value একটি global store-এ রাখা।**
✅ তাহলে প্রতিটি keystroke এতে subscribe করা সবকিছুকে re-render করায়। Form state স্বভাবতই local। শুধু
*submit করা ফলাফল*-এর জায়গা অন্য কোথাও।

**❌ Validation-এর নিয়ম দুবার লেখা।**
✅ এক release-এর মধ্যেই এগুলোর অমিল হয়। একটি schema export করুন, আর দুই পাশে import করুন।

**❌ Client validation-কে বিশ্বাস করা।**
✅ এটা সৎ user-দের জন্য একটি সুবিধা মাত্র। Endpoint-কে প্রতিটি field আবার validate করতে হবে।
[Chapter ?? — Input Validation](#ch-backend-input-validation) দেখুন।

**❌ প্রথম keystroke থেকেই প্রতিটি পরিবর্তনে validate করা।**
✅ User প্রথম শব্দটি টাইপ শেষ করার আগেই একটি error দেখেন। `onTouched` ব্যবহার করুন।

**❌ এমন error message দেখানো, যার input-এর সঙ্গে কোনো programmatic যোগ নেই।**
✅ একটি screen reader field-টি ঘোষণা করে, কিন্তু কেন ব্যর্থ হলো তা জানে না। `aria-describedby` আর
`aria-invalid` যুক্ত করুন।

**❌ Edit-এর মাঝখানে নতুন server data এলে form reset করা।**
✅ আপনি user-এর কাজ ফেলে দিয়েছেন। Dirty field-গুলোর সঙ্গে মিলিয়ে দেখুন আর জিজ্ঞেস করুন, বা শুধু না-ছোঁয়া
field-গুলো merge করুন।

## 🔑 মূল শিক্ষা

- Form state নকশাগতভাবেই invalid, আর এ কারণেই এটা application state-এ থাকে না।
- Uncontrolled input প্রতিটি keystroke-এ re-render এড়ায়। Controlled field ব্যবহার করুন শুধু যেখানে value live দরকার।
- Form আর endpoint দুটিই যে একটি schema import করে, সেটা runtime check আর static type দুটিই তৈরি করে।
- প্রথম blur-এর পরে validate করুন, তারপর live। `onTouched` সেই mode, যা user-রা আশা করেন।
- Client validation হলো user experience। Server validation হলো সঠিকতা, আর এটা কখনো ঐচ্ছিক নয়।

## Interview-এর প্রশ্ন

**Q: আধুনিক form library-তে uncontrolled input কেন default?**

একটি controlled input প্রতিটি keystroke-এ component-কে re-render করে। তখন একটি বড় form তার যেকোনো জায়গায় টাইপ করা
প্রতিটি character-এ re-render হয়। Uncontrolled input value-কে DOM-এ রেখে দেয়। Library শুধু যা বদলায় তাতেই subscribe
করে, সাধারণত একটি field-এর error state, তাই টাইপ করার কোনো খরচ নেই।

**Q: Server-ও যখন validate করে, তখন validation কোথায় থাকা উচিত?**

দুই জায়গাতেই, একটি schema থেকে। Client-এর copy user-কে round trip ছাড়াই সঙ্গে সঙ্গে feedback দেয়। Server-এর copy
থাকে, কারণ যে কেউ client-কে পুরোপুরি এড়িয়ে যেতে পারে। একটি schema module share করলে দুটির অমিল বন্ধ হয়, আর তা থেকে
TypeScript type infer করলে তৃতীয় একটি copy-ও লাগে না।

**Q: কখন একটি validation error দেখাবেন, সেটা কীভাবে ঠিক করেন?**

User যখন প্রথমবার একটি field টাইপ করছেন, তখন নয়। প্রতিটি অসম্পূর্ণ value invalid, তাই live error খোঁচানোর মতো শোনায়।
Blur-এ validate করুন, তারপর সেই field-কে live validation-এ নিয়ে যান, যাতে user সঙ্গে সঙ্গে দেখেন তাঁর সংশোধন ঠিক হয়েছে।
Submit-এ সবকিছু দেখান, আর focus প্রথম error-এ সরিয়ে নিন।

**Q: একজন user একটি record edit করার মাঝপথে, আর একটি background refetch নতুন server data নিয়ে আসে। কী করবেন?**

তিনি যে field-গুলো ছুঁয়েছেন, সেগুলো overwrite করবেন না। আসা data-কে dirty field-এর তালিকার সঙ্গে মিলিয়ে দেখুন।
না-ছোঁয়া field-গুলো চুপচাপ merge করুন। ছোঁয়া field-গুলো হয় যেমন আছে তেমন রাখুন, নয়তো এমন একটি conflict দেখান যা
user সমাধান করতে পারেন। পুরো form reset করাই সাধারণ bug, আর এটা তাঁর কাজ নষ্ট করে।

## এরপর কী পড়বেন

- [Chapter ?? — Action ও Form](#ch-react-actions-and-forms) — submit-এর অর্ধেক, pending state আর progressive enhancement সহ
- [Chapter ?? — Input Validation](#ch-backend-input-validation) — server-এর copy কেন আপস-যোগ্য নয়
- [Chapter ?? — State হিসেবে URL](#ch-url-as-state) — আরেকটি ধরন, যা refresh-এর পরেও টেকে
