---
sourceHash: "6885d88097fcca0a2751acefac6df9f1fa03d0f0e27ce3377a09d20a826cd06b"
title: "Action ও Form"
translatedAt: "2026-10-12T07:53:38.596Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Action ও Form {#ch-react-actions-and-forms}

> এমন একটি form submit করুন, যেটা hydration-এর আগেই কাজ করে, নিজের pending state নিজেই জানায়, আর server যেটাকে বিশ্বাস করতে পারে না।

**এই অধ্যায়ে:** Action কী · `<form action>` · `useActionState` · `useFormStatus` · `useOptimistic` · Server Function আর তার security

## 💡 মূল ধারণা

আগে একটি React application-এর প্রতিটি mutation-এর জন্য হাতে লেখা state-এর একই চারটি টুকরো লাগত: submitting, error,
result, আর request চলাকালীন একটি optimistic value। সবাই এগুলো লিখত, প্রত্যেকে একটু আলাদাভাবে, আর বেশিরভাগ মানুষ race
condition-গুলো ভুল করত।

React 19 এটাকে একটি first-class ধারণা বানিয়েছে। **Action হলো একটি async function, যেটা React একটি transition-এর
ভেতরে চালায়**, আর React আপনার হয়ে এর pending state ট্র্যাক করে। একটিকে form-এর `action` prop-এ দিন, আর form-টি আবার
একটি আসল submission হয়ে যায়। আপনার JavaScript load হওয়ার আগেই এটা কাজ করে।

> Senior পর্যায়ের আসল কথাটা hook-গুলো নয়। আসল কথা হলো, প্রথম second-এ, hydration শেষ হওয়ার আগে submit করা একটি
> form হারিয়ে যায় না, আবার চালানো হয়।

> ⚠️ **লক্ষ্য বদলাচ্ছে:** এখানকার নামগুলো ইতিমধ্যে একবার বদলেছে। `useFormState` হয়েছে `useActionState`, আর React-এর
> নিজের documentation Server Action-এর নাম বদলে Server Function রেখেছে। ধরে নিন hook-এর surface আরও কিছুদিন থিতু হতে
> থাকবে। স্থায়ী নীতিটা নিচে আছে, আর সেটা বদলানোর ক্ষমতা React-এর নেই: একটি `<form>` JavaScript ছাড়াই post করে। তাই
> একটি Action যা কিছু যোগ করে, সবই এমন একটি submission-এর ওপরে enhancement, যেটা আগে থেকেই কাজ করে।

## কীভাবে কাজ করে

### `<form action={fn}>`

URL-এর বদলে একটি function দিন। React এটাকে `FormData` দিয়ে call করে, একটি transition-এর ভেতরে, কোনো
`preventDefault` ছাড়াই। সফল হলে এটা আপনার হয়ে একটি uncontrolled form reset করে দেয়।

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

আলাদা আলাদা button `formAction` দিয়ে এটা override করতে পারে। এভাবেই একটি form-এ একটি hidden field আর একটি branch
ছাড়াই একটি "Publish" আর একটি "Save draft" button থাকতে পারে।

### `useActionState` — result আর pending flag

এটা একটি action-কে wrap করে, যাতে React এর return করা শেষ value-টি রেখে দেয়। Signature-টি হলো submission-গুলোর ওপর
একটি reducer: function-টি আগের state আর form data পায়।

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

Error throw না করে return করাটা ইচ্ছাকৃত। Return করা value server থেকে serialisation পার হয়ে টিকে থাকে। এটা ব্যর্থতাকে
render tree-তেও রাখে, error boundary-তে নয়।

### `useFormStatus` — একটি child থেকে pending state

এটা `react-dom` থেকে import করুন, `react` থেকে নয়। এটা এর **ওপরের** সবচেয়ে কাছের `<form>`-এর status পড়ে। এটাই একটি
shared submit button সম্ভব করে।

```tsx
"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : children}</button>;
}
```

> ⚠️ `useFormStatus`-কে form-এর একটি **child**-এ থাকতে হবে, কখনো সেই component-এ নয়, যেটা `<form>` element render
> করে। একই component-এ এটা সবসময় `pending: false` জানায়। কোনো warning নেই, আর button-টি কখনো disable হয় না।

### `useOptimistic` — ঘটার আগেই ফলাফল দেখানো

Action চলার সময় render করার জন্য React-কে একটি অস্থায়ী value দিন। Action settle হলে React optimistic value বাদ দিয়ে
আসল state দেখায়।

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

Rollback automatic: action throw করলে React আসল state-এ ফিরে যায়। User-কে জানানোটা automatic *নয়*। সেটা এখনো আপনার
কাজ।

### Progressive enhancement

Action-ওয়ালা একটি form একটি form-ই। Hydration-এর আগে, যখন React এখনো HTML-এ জুড়ে বসেনি, browser এটা submit করে।
Hydration শেষ হলে React সেই submission আবার চালায়। HTML আসা আর JavaScript চলার মাঝখানে কিছুই হারায় না। আসল network-এ
আসল user-রা ঠিক এই সময়টাতেই click করেন।

এটা তখনই খাটে, যখন form-টি named input-সহ একটি আসল `<form>`। `onClick`-ওয়ালা একটি `<div>`-এ এর কিছুই নেই।

### Server Function

`'use server'` দিয়ে চিহ্নিত একটি function server-এ চলে, আর আপনি এটাকে prop হিসেবে client-এর হাতে দিতে পারেন। React
এটাকে একটি **reference** হিসেবে serialise করে। Client call করার জন্য একটি generated endpoint পায়।

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

খেয়াল করুন, প্রথম তিনটি line আসলে কী। **একটি Server Function হলো একটি generated নামওয়ালা public HTTP endpoint।**
যে কেউ যেকোনো argument দিয়ে এটা call করতে পারে। Authentication, authorisation আর validation এর ভেতরেই থাকা উচিত,
প্রতিবার। একটি component-এর সাথে একই file-এ থাকা কোনো access control নয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি                                        | কী ব্যবহার করবেন                                    |
| ------------------------------------------------- | --------------------------------------------- |
| কিছু mutate করে এমন যেকোনো form                   | `<form action>` — কখনো `onSubmit` আর fetch নয় |
| Result বা error দেখাতে হবে           | `useActionState`                              |
| একটি design system-এ একটি reusable submit button       | Button-এর ভেতরে `useFormStatus`                 |
| Chat, like, toggle — যেখানে latency টের পাওয়া যায়      | `useOptimistic`                               |
| Submit-এর আগে জটিল client-side validation      | একটি form library, নিচে একটি action-সহ      |
| Form ছাড়া একটি mutation — একটি delete icon           | Async call-এর চারপাশে `startTransition`        |

## সাধারণ ভুল

**❌ একটি Server Function-এর caller-কে বিশ্বাস করা।** এটা একটি endpoint। Argument validate করুন আর session যাচাই
করুন function-এর ভেতরে, যে component button render করে সেখানে নয়।

**❌ Form-এর পাশে `useFormStatus`।** এটা এর *ওপরের* form পড়ে। একই component-এ এটা চিরকাল `false` return করে, আর
কিছুই disable হয় না।

**❌ অভ্যাসের বশে `onSubmit` আর `preventDefault` রেখে দেওয়া।** ওই পথে hydration-এর আগের replay আর automatic reset দুটোই
হাতছাড়া হয়। আপনি আবার হাতে pending state লেখায় ফিরে যান।

**❌ ব্যর্থতার কোনো ব্যবস্থা ছাড়া optimistic update।** Rollback automatic। ব্যাখ্যাটা নয়। যে message চুপচাপ উধাও হয়ে
যায়, সেটা পাঠাতে এক second লাগা message-এর চেয়েও খারাপ।

**❌ অভ্যাসবশত সব জায়গায় controlled input।** Action `FormData` পড়ে, তাই `name` attribute-ওয়ালা uncontrolled input-ই
যথেষ্ট। এগুলোই form-কে hydration-এর আগে কাজ করায়।

## 🔑 মূল শিক্ষা

- Action হলো একটি async function, যেটা React একটি transition-এ চালায়, আর আপনার হয়ে pending state ট্র্যাক করে।
- `<form action>`-এ কোনো `preventDefault` লাগে না, সফল হলে reset হয়, আর hydration-এর আগে submit হলে আবার চালানো হয়।
- `useActionState` শেষ result আর একটি pending flag return করে। `useFormStatus` একটি child থেকে সেই pending state পড়ে।
- `useOptimistic` ব্যর্থ হলে automatic rollback করে, কিন্তু user-কে জানানো এখনো আপনার কাজ।
- একটি Server Function একটি public endpoint। এর ভেতরেই authenticate, authorise আর validate করুন।

## Interview-এর প্রশ্ন

**Q: `onSubmit` আর `fetch` যা দিত না, React 19 আপনাকে তা কী দেয়?**

Pending state, automatic reset, আর transition-এর semantics, যেটা page-কে responsive রাখে। কিন্তু যেটা আসলে গুরুত্বপূর্ণ,
সেটা progressive enhancement। একটি `action`-ওয়ালা form hydration-এর আগেই কাজ করে, আর ওই সময়ে করা একটি submission
React হারিয়ে না ফেলে আবার চালায়। ধীর device-এ ওই সময়টা কয়েক second স্থায়ী হয়, আর ঠিক তখনই অধৈর্য user-রা click
করেন।

**Q: একটি design system-এর জন্য এমন একটি submit button কীভাবে বানাবেন, যেটা জানে কখন submit হচ্ছে?**

Button component-এর ভেতরে `useFormStatus`। এটা tree-তে এর ওপরের সবচেয়ে কাছের form পড়ে, তাই button-এর কোনো props
লাগে না, form থেকে কোনো wiring-ও লাগে না। ফাঁদটা হলো: এটাকে `<form>`-এর একটি child হতে হবে। Form element render করে
এমন একই component-এ call করলে এটা চিরকাল `pending: false` জানায়, কোনো warning ছাড়াই।

**Q: একজন user-কে যেকোনো argument দিয়ে সরাসরি আপনার Server Function call করা থেকে কী আটকায়?**

কিছুই না। এটা একটি generated নামওয়ালা public endpoint-এ compile হয়, আর client এর একটি reference পায়। প্রতিটি Server
Function-এর নিজস্ব session check, authorisation check আর input validation লাগে, ঠিক একটি route handler-এর মতো। যে
component এটা call করে, তার পাশে রাখাটা developer-দের সুবিধা, কোনো security boundary নয়।

**Q: কখন optimistic update ভুল পছন্দ?**

যখন ভুল হওয়াটা ব্যয়বহুল বা ব্যাখ্যা করা কঠিন। একটি পাঠানো message বা toggle করা like দেখানো ঠিক আছে। ব্যর্থ হওয়া
message user বোঝেন। কিন্তু server রাজি হওয়ার আগে একটি সম্পন্ন payment, একটি নিশ্চিত booking বা একটি মুছে ফেলা record
দেখানো ঠিক নয়। সংশোধন আসে তখন, যখন user এগিয়ে গেছেন আর যা দেখেছেন তার ভিত্তিতে কাজ করে ফেলেছেন।

## এরপর কী পড়বেন

- [Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) — যে mechanism-এর ওপর Action তৈরি
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — একটি function reference কীভাবে boundary পার হয়
- [Chapter ?? — Form State](#ch-form-state) — validation, schema আর এগুলো কোথায় চলে
