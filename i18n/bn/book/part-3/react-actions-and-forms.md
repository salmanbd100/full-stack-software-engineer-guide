---
sourceHash: "6885d88097fcca0a2751acefac6df9f1fa03d0f0e27ce3377a09d20a826cd06b"
title: "Action ও Form"
translatedAt: "2026-10-17T01:34:20.724Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Action ও Form {#ch-react-actions-and-forms}

> এমন form submit করুন, যা hydration-এর আগেই কাজ করে, নিজের pending state নিজেই জানায়, আর যাকে server কখনো বিশ্বাস করে না।

**এই অধ্যায়ে:** Action আসলে কী · `<form action>` · `useActionState` · `useFormStatus` · `useOptimistic` · Server Function আর তার security

## 💡 মূল ধারণা

আগে React app-এর প্রতিটি mutation-এ একই চারটি state হাতে লিখতে হতো: submitting, error, result, আর request
চলার সময়ের optimistic value। সবাই এগুলো লিখত, প্রত্যেকে একটু আলাদাভাবে। আর বেশিরভাগই race condition-এ ভুল করত।

React 19 এটাকে framework-এরই অংশ বানিয়ে দিয়েছে। **Action হলো এমন async function, যা React একটি transition-এর
ভেতরে চালায়**, আর তার pending state React নিজেই track করে। Form-এর `action` prop-এ একটি Action দিলে form আবার
সত্যিকারের submission হয়ে যায়। আপনার JavaScript load হওয়ার আগেই সেটা কাজ করে।

> Senior-লেভেলের আসল কথা hook-গুলো নয়। আসল কথা হলো, hydration শেষ হওয়ার আগে, প্রথম সেকেন্ডেই কেউ form submit
> করলে সেটা হারিয়ে যায় না, পরে আবার চালানো হয়।

> ⚠️ **যা বদলাতে থাকে:** এখানকার নামগুলো এর মধ্যেই একবার বদলেছে। `useFormState` হয়ে গেছে
> `useActionState`, আর React-এর নিজের documentation Server Action-এর নাম বদলে Server Function রেখেছে। Hook-গুলো
> আরও কিছুদিন থিতু হতে থাকবে, ধরে নিন। কিন্তু নিচের টেকসই নীতিটা বদলানোর ক্ষমতা React-এর নেই: JavaScript ছাড়াই
> `<form>` post হয়। তাই Action যা কিছু যোগ করে, সবই এমন একটি submission-এর ওপর বাড়তি সুবিধা, যা আগে থেকেই কাজ করে।

## কীভাবে কাজ করে

### `<form action={fn}>`

URL-এর বদলে একটি function দিন। React সেটা call করে `FormData` দিয়ে, একটি transition-এর ভেতরে, আর
`preventDefault` লাগে না। সফল হলে uncontrolled form-টা React নিজেই reset করে দেয়।

```tsx
function Search() {
  async function search(formData: FormData): Promise<void> {
    const query: string = String(formData.get("query"));
    await router.push(`/results?q=${encodeURIComponent(query)}`);
  }

  return (
    <form action={search}>
      <input name="query" />
      <button type="submit">Search</button>
    </form>
  );
}
```

আলাদা আলাদা button `formAction` দিয়ে এটা override করতে পারে। এভাবেই একটি form-এ "Publish" আর "Save draft"
দুটি button রাখা যায়, hidden field বা branch ছাড়াই।

### `useActionState` — result আর pending flag

এটা একটি action-কে মুড়ে দেয়, যাতে action-এর শেষ return করা value React মনে রাখে। Signature-টা আসলে submission-এর
ওপর একটি reducer: function পায় আগের state আর form data।

```tsx
interface FormState {
  error: string | null;
}

function UpdateName() {
  const [state, submitAction, isPending] = useActionState<FormState, FormData>(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await updateName(String(formData.get("name")));
      return result.ok ? { error: null } : { error: result.message };
    },
    { error: null },
  );

  return (
    <form action={submitAction}>
      <input name="name" disabled={isPending} />
      {state.error !== null && <p role="alert">{state.error}</p>}
      <button type="submit">Save</button>
    </form>
  );
}
```

Error throw না করে return করাটা ইচ্ছে করে করা। Return করা value server থেকে serialise হয়ে নিরাপদে আসে। তা ছাড়া
failure-টা error boundary-তে না গিয়ে render tree-তেই থাকে।

### `useFormStatus` — child থেকে pending state

এটা import করুন `react-dom` থেকে, `react` থেকে নয়। এটা পড়ে নিজের **ওপরে** থাকা সবচেয়ে কাছের `<form>`-এর status।
এ কারণেই সবার জন্য একটি shared submit button বানানো সম্ভব হয়।

```tsx
"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : children}</button>;
}
```

> ⚠️ `useFormStatus` রাখতে হবে form-এর কোনো **child**-এ। যে component `<form>` element render করে, সেখানে রাখলে
> চলবে না। একই component-এ রাখলে এটা সবসময় `pending: false` দেয়। কোনো warning আসে না, button-টা শুধু কখনো
> disable হয় না।

### `useOptimistic` — ঘটার আগেই ফল দেখানো

Action চলার সময় render করার জন্য React-কে একটি অস্থায়ী value দিন। Action শেষ হলে React optimistic value-টা ফেলে
দিয়ে আসল state দেখায়।

```tsx
function Thread({ messages, sendMessage }: ThreadProps) {
  const [optimistic, addOptimistic] = useOptimistic<Message[], string>(
    messages,
    (current: Message[], text: string) => [...current, { id: "pending", text, sending: true }],
  );

  async function formAction(formData: FormData): Promise<void> {
    const text: string = String(formData.get("message"));
    addOptimistic(text);                 // Appears instantly
    await sendMessage(text);             // Real state arrives, optimistic value is discarded
  }

  return (
    <form action={formAction}>
      {optimistic.map((m: Message) => <p key={m.id} className={m.sending ? "dim" : ""}>{m.text}</p>)}
      <input name="message" />
    </form>
  );
}
```

Rollback নিজে থেকেই হয়: action throw করলে React আসল state-এ ফিরে যায়। কিন্তু user-কে জানানোটা নিজে থেকে হয় *না*।
সেটা এখনো আপনার কাজ।

### Progressive enhancement

Action-ওয়ালা form আসলে একটি সাধারণ form-ই। Hydration-এর আগে, মানে React যখন HTML-এর সঙ্গে এখনো যুক্ত হয়নি,
browser নিজেই form-টা submit করে। Hydration শেষ হলে React সেই submission আবার চালায়। HTML আসা আর JavaScript
চলার মাঝখানে কিছুই হারায় না। আর আসল network-এ আসল user ঠিক এই সময়েই click করে।

এটা খাটে শুধু তখনই, যখন form সত্যিকারের `<form>`, আর input-গুলোর নাম আছে। `onClick` দেওয়া `<div>` এর কিছুই পায় না।

### Server Function

`'use server'` চিহ্ন দেওয়া function চলে server-এ, আর সেটা prop হিসেবে client-কে দেওয়া যায়। React একে serialise
করে একটি **reference** হিসেবে। Client পায় call করার জন্য একটি generated endpoint।

```tsx
"use server";

export async function updateName(name: string): Promise<Result> {
  const session = await getSession();
  if (session === null) return { ok: false, message: "Not signed in" };
  if (name.trim().length < 2) return { ok: false, message: "Name is too short" };

  await db.users.update(session.userId, { name });
  return { ok: true };
}
```

প্রথম তিনটি line আসলে কী, খেয়াল করুন। **Server Function হলো generated নামওয়ালা একটি public HTTP endpoint।** যে
কেউ যেকোনো argument দিয়ে একে call করতে পারে। তাই authentication, authorisation আর validation প্রতিবার এর ভেতরেই
থাকবে। Component-এর সঙ্গে একই file-এ থাকা কোনো access control নয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                         | কী ব্যবহার করবেন                               |
| ------------------------------------------------ | --------------------------------------------- |
| যেকোনো form, যা কিছু বদলায়                       | `<form action>` — `onSubmit` আর fetch কখনো নয় |
| Result বা error দেখাতে হবে                        | `useActionState`                              |
| Design system-এ বারবার ব্যবহারের submit button    | Button-এর ভেতরে `useFormStatus`                |
| Chat, like, toggle — যেখানে latency চোখে পড়ে     | `useOptimistic`                               |
| Submit-এর আগে জটিল client-side validation       | Form library, নিচে একটি action সহ              |
| Form ছাড়া mutation — যেমন delete icon           | Async call-এর চারপাশে `startTransition`        |

## সাধারণ ভুল

**❌ Server Function-এর caller-কে বিশ্বাস করা।** এটা একটি endpoint। Argument validate করুন আর session check করুন
function-এর ভেতরেই, button render করা component-এ নয়।

**❌ Form-এর পাশে `useFormStatus`।** এটা পড়ে নিজের *ওপরের* form। একই component-এ রাখলে চিরকাল `false` দেয়, আর
কিছুই disable হয় না।

**❌ অভ্যাসবশে `onSubmit` আর `preventDefault` রেখে দেওয়া।** এ পথে hydration-এর আগের replay আর automatic reset,
দুটিই হারান। আবার সেই হাতে pending state লেখার যুগে ফিরে যান।

**❌ Fail করলে কী হবে, তা না ভেবে optimistic update।** Rollback নিজে থেকে হয়, কিন্তু ব্যাখ্যা হয় না। পাঠাতে এক
সেকেন্ড লাগা message-এর চেয়ে চুপচাপ উধাও হয়ে যাওয়া message অনেক খারাপ।

**❌ অভ্যাসবশে সব জায়গায় controlled input।** Action পড়ে `FormData`, তাই `name` attribute দেওয়া uncontrolled
input-ই যথেষ্ট। Hydration-এর আগে form কাজ করে এগুলোর জোরেই।

## 🔑 মূল শিক্ষা

- Action হলো async function, যা React একটি transition-এ চালায় আর তার pending state নিজেই track করে।
- `<form action>`-এ `preventDefault` লাগে না, সফল হলে reset হয়, আর hydration-এর আগে submit হলে পরে আবার চলে।
- `useActionState` দেয় শেষ result আর একটি pending flag। `useFormStatus` সেই pending state পড়ে child থেকে।
- `useOptimistic` fail করলে নিজেই rollback করে, কিন্তু user-কে জানানো এখনো আপনার কাজ।
- Server Function একটি public endpoint। Authenticate, authorise আর validate করুন এর ভেতরেই।

## Interview-এর প্রশ্ন

**Q: `onSubmit` আর `fetch` যা দিত না, React 19 তার বাইরে কী দেয়?**

Pending state, automatic reset, আর transition-এর আচরণ, যাতে page responsive থাকে। তবে আসল জিনিস progressive
enhancement। `action` দেওয়া form hydration-এর আগেই কাজ করে, আর ওই সময়ে করা submission React হারিয়ে না ফেলে
পরে আবার চালায়। ধীর device-এ এই সময়টা কয়েক সেকেন্ড, আর অধৈর্য user ঠিক তখনই click করে।

**Q: Design system-এর জন্য এমন submit button কীভাবে বানাবেন, যে জানে কখন submit চলছে?**

Button component-এর ভেতরে `useFormStatus`। এটা tree-তে নিজের ওপরের সবচেয়ে কাছের form পড়ে, তাই button-এ কোনো
prop লাগে না, form থেকে কিছু জোড়াও লাগে না। ফাঁদটা হলো: এটাকে `<form>`-এর child হতেই হবে। Form element render
করা component-এই call করলে এটা চিরকাল `pending: false` দেয়, কোনো warning ছাড়াই।

**Q: কেউ সরাসরি যেকোনো argument দিয়ে আপনার Server Function call করলে কী আটকায়?**

কিছুই না। এটা compile হয়ে generated নামের একটি public endpoint হয়, আর client তার একটি reference পায়। তাই
প্রতিটি Server Function-এর নিজস্ব session check, authorisation check আর input validation লাগে, ঠিক route handler-এর
মতো। যে component call করে তার পাশে রাখাটা developer-এর সুবিধা, security boundary নয়।

**Q: Optimistic update কখন ভুল সিদ্ধান্ত?**

যখন ভুল হওয়ার দাম বেশি, বা ভুলটা বোঝানো কঠিন। পাঠানো message বা দেওয়া like আগে দেখানো ঠিক আছে, message fail
করলে user সেটা বোঝে। কিন্তু server রাজি হওয়ার আগেই completed payment, confirmed booking বা deleted record দেখানো
ঠিক নয়। সংশোধন যখন আসে, user ততক্ষণে এগিয়ে গেছে, আর যা দেখেছে তার ভিত্তিতে কাজও করে ফেলেছে।

## এরপর কী পড়বেন

- [Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) — যে mechanism-এর ওপর Action দাঁড়িয়ে
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — function reference কীভাবে boundary পার হয়
- [Chapter ?? — Form State](#ch-form-state) — validation, schema, আর সেগুলো কোথায় চলে
