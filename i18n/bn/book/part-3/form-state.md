---
sourceHash: "a5e81dc3842e8a50c7fc085a499850765388f9d5ac4e091e27fa3019c1ef7c12"
title: "Form State"
translatedAt: "2026-10-17T01:34:37.935Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Form State {#ch-form-state}

> Schema রাখুন একটিই, validation চালান wire-এর দুই পাশেই, আর প্রতিটি keystroke-এ পুরো form re-render করা বন্ধ করুন।

**এই অধ্যায়ে:** draft-এর lifecycle · controlled বনাম uncontrolled · এক schema, দুই runtime · error কখন দেখাবেন · server-action form · কয়েক ধাপের draft

## 💡 মূল ধারণা

State-এর সব ধরনের মধ্যে শুধু form state-ই **ইচ্ছে করে invalid থাকে**। কেউ email address টাইপ করার সময় পার হয়ে
যায় "a", "al", "ali"। এগুলোর কোনোটাই email address নয়। কিন্তু প্রতিটি অক্ষরে সেটা মনে করিয়ে দেওয়া
user-এর সঙ্গে শত্রুতা ছাড়া কিছু নয়।

এই একটি বৈশিষ্ট্যের জন্যই form-কে application state-এ রাখা চলে না। Application state-এর valid থাকার কথা।
Form হলো একটি draft, যেটা শেষে গিয়ে valid হয়, যদি আদৌ হয়।

Form-এর একটি lifecycle আছে। এই অধ্যায়ের প্রতিটি সিদ্ধান্ত সেই lifecycle-এর কোনো এক জায়গার সঙ্গে জড়িত:

```text
pristine → dirty → validated → submitting → submitted or failed
```

## কীভাবে কাজ করে

### Controlled বনাম uncontrolled

| | Controlled | Uncontrolled |
| --- | --- | --- |
| **Value কোথায় থাকে** | React state-এ | DOM node-এ |
| **Keystroke-এ re-render** | হ্যাঁ, প্রতিটিতে | না |
| **Value পড়া** | সবসময় হাতের কাছে | Submit-এর সময়, অথবা ref দিয়ে |
| **কখন লাগে** | Live formatting, একটির ওপর আরেকটা নির্ভরশীল field, live preview | বাকি সব ক্ষেত্রে |

বড় controlled form প্রতিটি অক্ষরে re-render হয়। বিশটি field আর প্রতি render-এ একবার validation থাকলে মাঝারি
দামের phone-এ input lag স্পষ্ট টের পাওয়া যায়। Enterprise form-এ performance-এর সমস্যা বলতে সবচেয়ে বেশি দেখা
যায় এটাই।

React Hook Form জনপ্রিয় কারণ ভেতরে ভেতরে সেটা uncontrolled। Input-গুলো DOM-এর সঙ্গে register হয়, আর library
শুধু দরকারি জিনিসটুকুতে subscribe করে। কোনো component re-render হয় কেবল তখনই, যখন তার নিজের error state বদলায়।

### এক schema, দুই runtime

Library বাছাইয়ের চেয়েও বেশি জরুরি একটি নিয়ম: **validation-এর নিয়ম একবার লিখুন, আর দুই জায়গাতেই চালান।**
Client-এর validation হলো user experience-এর ব্যাপার। Server-এর validation হলো correctness-এর ব্যাপার। যে নিয়ম
শুধু এক পাশে আছে, সেটা হয় security hole, নয়তো ভাঙা form।

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

`z.infer` থাকায় Zod runtime-এর নিয়ম থেকেই TypeScript type বের করে দেয়। ফলে নিয়মের পাশে আলাদা করে type declare
করতে হয় না। Definition একটিই, তাই দুটি আলাদা হয়ে যাওয়ার সুযোগও নেই।

> ⚠️ **যা বদলাতে থাকে:** Zod 4 string format-গুলোকে top-level function-এ সরিয়ে নিয়েছে (`z.email()` এসেছে
> `z.string().email()`-এর জায়গায়), আর error-issue-এর type-গুলো নতুন করে সাজিয়েছে। টেকসই ধারণাটা হলো এমন একটি
> schema, যেটা থেকে runtime validation আর static type দুটিই আসে। Call-এর syntax বদলাতেই থাকবে। একই contract
> মানে এমন অন্য validator-ও resolver-এর পেছনে বসিয়ে দেওয়া যায়।

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

**Endpoint-এর দিকেও একই schema চলে:**

```typescript
const parsed = inviteSchema.safeParse(await request.json());
if (!parsed.success) {
  return Response.json({ errors: parsed.error.flatten() }, { status: 400 });
}
```

### Error কখন দেখাবেন

Validation-এর *সময়* বাছাই করাটা user experience-এর সিদ্ধান্ত। ভুল হলে form-কে আক্রমণাত্মক মনে হয়।

| Mode | আচরণ | রায় |
| ---- | --------- | ------- |
| `onSubmit` | Submit করার পরেই কেবল error আসে | নিরাপদ default; লম্বা form-এ খারাপ |
| `onChange` | টাইপ করতে করতেই error | শত্রুতা — প্রতিটি অসম্পূর্ণ value-কে ভুল বলে |
| `onBlur` | Field ছেড়ে গেলে error | ভালো |
| `onTouched` | প্রথমে blur-এ, একবার touch হলে তারপর live | **বেশিরভাগ form-এর জন্য সেরা** |

User-রা আসলে `onTouched`-এর মতো আচরণই আশা করে। Field-এর কাজ শেষ না হওয়া পর্যন্ত কিছু বলবেন না। তারপর user যখন
ভুল ঠিক করছে, তখন live শুধরে দিন।

যে mode-ই বাছুন, error-কে assistive technology পর্যন্ত পৌঁছাতে হবে। Message-টা input-এর সঙ্গে
`aria-describedby` দিয়ে জুড়ে দিন, field-টাকে `aria-invalid` mark করুন, আর submit ব্যর্থ হলে focus নিয়ে যান
প্রথম error-এ। দেখুন [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms)।

### Server-action form

Server action বদলায় submit handler কোথায় থাকবে, সেটা। Validation-এর কী লাগে, তা বদলায় না। Form post হয় একটি
server function-এ। সেই function একই schema চালায়, আর field-এর error ফেরত দেয় data হিসেবে।

এই pattern-এর সঙ্গে দুটি সুবিধা আসে। Form **JavaScript ছাড়াও চলে**, কারণ এটা আসল endpoint-এ post করা একটি আসল
form। আর যে error দেখানো হয়, সেটা server-এরই, তাই দুই পাশের মধ্যে অমিল হওয়ার উপায় নেই।

খরচটা হলো প্রতিবার validation-এ একটি round trip। তাই production-এর বেশিরভাগ form client-এও schema চালায়, আর
server-কে চূড়ান্ত কর্তৃপক্ষ ধরে। খুঁটিনাটি (pending state, ফেরত আসা error, progressive enhancement) আছে
[Chapter ?? — Action ও Form](#ch-react-actions-and-forms) আর
[Chapter ?? — Server Action](#ch-server-actions)-এ। অন্য framework-এ একই ধারণা পাবেন
[Chapter ?? — SvelteKit Form Action](#ch-sveltekit-form-actions)-এ।

### কয়েক ধাপের form, আর draft কোথায় থাকে

Wizard এমন একটি প্রশ্ন তোলে, যেটা একক form তোলে না: user তৃতীয় ধাপে refresh করলে কী হবে?

| পদ্ধতি | Refresh-এর পরেও থাকে | কোথায় মানায় |
| -------- | ---------------- | --------- |
| একটিই form, ধাপগুলো শুধু আলাদা view | না | ছোট flow, এক বসায় শেষ হয় |
| ধাপ URL-এ, value memory-তে | শুধু ধাপটা | যেখানে আবার শুরু করতে হলেও চলে |
| Draft রাখা `sessionStorage`-এ | হ্যাঁ, ওই device-এ | লম্বা flow, account লাগে না |
| প্রতি ধাপে draft server-এ save | হ্যাঁ, সব জায়গায় | Application, onboarding, যেকোনো লম্বা কাজ |

প্রতিটি ধাপ validate করুন পুরো schema-র একটি অংশ দিয়ে, আর শেষ submit-এ আবার পুরো schema দিয়ে। Restore হওয়া
draft দিয়ে যে user শেষ ধাপে পৌঁছেছে, সে হয়তো বর্তমান নিয়মে প্রথম ধাপ পার হয়নি।

## কখন ব্যবহার করবেন

| পরিস্থিতি | পদ্ধতি |
| --------- | -------- |
| দুই-তিনটি সাধারণ field | Uncontrolled input, আর submit-এ schema |
| সাধারণ business form | React Hook Form আর shared schema, `onTouched` |
| Live formatting বা নির্ভরশীল field | Controlled, কেবল ওই field-গুলোর জন্য |
| Progressive enhancement বাধ্যতামূলক | Server-action form, দুই পাশেই schema |
| লম্বা application flow | Draft persist করুন, প্রতি ধাপে validation, শেষে পুরোটার validation |

## সাধারণ ভুল

**❌ Form-এর value global store-এ রাখা।**
✅ তাহলে প্রতিটি keystroke-এ store-এ subscribe করা সবকিছু re-render হয়। Form state স্বভাবতই local। শুধু
*submit হওয়া ফলাফলটাই* অন্য কোথাও যাওয়ার যোগ্য।

**❌ Validation-এর নিয়ম দুবার লেখা।**
✅ এক release-এর মধ্যেই দুটি আলাদা হয়ে যায়। একটি schema export করুন, আর দুই পাশেই সেটা import করুন।

**❌ Client-এর validation-এ ভরসা করা।**
✅ এটা সৎ user-দের সুবিধার জন্য। Endpoint-কে প্রতিটি field আবার validate করতে হবে। দেখুন
[Chapter ?? — Input Validation](#ch-backend-input-validation)।

**❌ প্রথম keystroke থেকেই প্রতিটি change-এ validate করা।**
✅ User প্রথম শব্দটা লেখা শেষ করার আগেই error দেখে। `onTouched` ব্যবহার করুন।

**❌ Error message দেখানো, অথচ input-এর সঙ্গে তার কোনো programmatic যোগ নেই।**
✅ Screen reader field-টার নাম বলে, কিন্তু কেন ভুল হলো তা জানে না। `aria-describedby` আর
`aria-invalid` জুড়ে দিন।

**❌ Edit চলার মাঝখানে server থেকে নতুন data এলে form reset করে দেওয়া।**
✅ এতে user-এর করা কাজ ফেলে দিলেন। Dirty field-গুলোর সঙ্গে মিলিয়ে দেখুন, তারপর জিজ্ঞেস করুন, অথবা শুধু
untouched field-গুলো merge করুন।

## 🔑 মূল শিক্ষা

- Form state নকশা অনুযায়ীই invalid, আর ঠিক এ কারণেই সেটা application state-এ রাখা চলে না।
- Uncontrolled input থাকলে প্রতি keystroke-এ re-render হয় না। Controlled field নিন কেবল যেখানে value live দরকার।
- Form আর endpoint দুটিই একটি schema import করলে runtime check আর static type দুটিই সেখান থেকে আসে।
- প্রথম blur-এর পরে validate করুন, তারপর live। User-রা `onTouched` mode-ই আশা করে।
- Client-এর validation হলো user experience। Server-এর validation হলো correctness, আর সেটা কখনো বাদ দেওয়া যায় না।

## Interview-এর প্রশ্ন

**Q: আধুনিক form library-তে uncontrolled input default কেন?**

Controlled input প্রতিটি keystroke-এ component re-render করে। ফলে বড় form-এর যেকোনো জায়গায় একটি অক্ষর টাইপ
করলেই পুরো form re-render হয়। Uncontrolled input value-টা DOM-এই রেখে দেয়। Library শুধু বদলানো জিনিসে
subscribe করে, সাধারণত একটি field-এর error state-এ। তাই টাইপ করতে কোনো খরচ নেই।

**Q: Server-ও যখন validate করে, তখন validation কোথায় রাখবেন?**

দুই জায়গাতেই, একটি schema থেকে। Client-এর copy round trip ছাড়াই user-কে সঙ্গে সঙ্গে feedback দেয়। Server-এর
copy থাকে কারণ যে কেউ client-টা পুরোপুরি এড়িয়ে যেতে পারে। একটি shared schema module থাকলে দুটির মধ্যে অমিল
হয় না, আর সেখান থেকে TypeScript type infer করলে তৃতীয় copy-টাও লাগে না।

**Q: Validation error কখন দেখাবেন, তা কীভাবে ঠিক করেন?**

User যখন প্রথমবার field-টা টাইপ করছে, তখন নয়। প্রতিটি অসম্পূর্ণ value-ই invalid, তাই live error ঘ্যানঘ্যান
করার মতো লাগে। Blur-এ validate করুন, তারপর ওই field-কে live validation-এ নিয়ে যান, যাতে ভুল শোধরানোর সঙ্গে
সঙ্গেই user তা দেখতে পায়। Submit-এ সব error দেখান, আর focus নিয়ে যান প্রথম error-এ।

**Q: User একটি record অর্ধেক edit করেছে, এমন সময় background refetch নতুন server data নিয়ে এল। কী করবেন?**

User যে field-গুলোতে হাত দিয়েছে, সেগুলো overwrite করবেন না। আসা data-কে dirty field-এর তালিকার সঙ্গে মিলিয়ে
দেখুন। যেগুলোতে হাত পড়েনি, সেগুলো চুপচাপ merge করুন। যেগুলোতে হাত পড়েছে, সেগুলো হয় যেমন আছে রেখে দিন,
নয়তো একটি conflict দেখান, যেটা user নিজে মেটাবে। পুরো form reset করে দেওয়াটাই সাধারণ bug, আর তাতে user-এর
কাজ নষ্ট হয়।

## এরপর কী পড়বেন

- [Chapter ?? — Action ও Form](#ch-react-actions-and-forms) — submit-এর অংশটা, pending state আর progressive enhancement সহ
- [Chapter ?? — Input Validation](#ch-backend-input-validation) — server-এর copy কেন বাদ দেওয়া যায় না
- [Chapter ?? — State হিসেবে URL](#ch-url-as-state) — আরেকটা ধরন, যেটা refresh-এর পরেও টিকে থাকে
