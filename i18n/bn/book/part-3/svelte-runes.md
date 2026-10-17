---
sourceHash: "cb92d9b9ab30501a33a98f0965e3d7a1b93205ae17b94c7545636ec3d1aca4d4"
title: "Runes Model, Component ও Snippet"
translatedAt: "2026-10-17T01:37:25.493Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Runes Model, Component ও Snippet {#ch-svelte-runes}

> কোন value reactive তা বলে দিন, markup-কে value হিসেবে এদিক-ওদিক পাঠান, আর compiler-কে শুধু সেই DOM node-গুলো update করতে দিন যারা ওই value-র ওপর নির্ভর করে।

**এই অধ্যায়ে:** rune আসলে কী · `$state`, `$derived` আর `$effect` · fine-grained update বনাম React-এর re-render · `$props` আর `$bindable` · slot-এর জায়গায় snippet

## 💡 মূল ধারণা

Rune এমন কোনো function নয়, যা আপনি call করেন। এটা function-এর মতো দেখতে একটি **compiler instruction**। `$state(0)`
runtime-এ কখনো চলেই না। Compiler এটা দেখে variable-টাকে signal বানিয়ে ফেলে, আর প্রতিটি read ও write নতুন করে লেখে।

এজন্যই rune-এর কোনো import নেই: `$state` হলো syntax। আর এজন্যই Svelte 5-এ reactivity **value ধরে, component ধরে
নয়**। React component function আবার চালায়, তারপর ফলাফল মেলায়। Svelte একটি graph বানায়: কোন value কোন DOM node-কে
খাওয়ায়। একটি value বদলালে update হয় শুধু সেই node-গুলো, যারা value-টা পড়ে। আর কিছুই চলে না।

Component-ও একই ধারণা মেনে চলে। **Snippet** হলো নাম দেওয়া markup, আর একটি snippet declare করলেই একটি value তৈরি
হয়। অন্য যেকোনো জিনিসের মতো এটাকে prop হিসেবে পাঠান। Svelte 4-এর slot ছিল আলাদা একটি ব্যবস্থা। Snippet সেটার
দরকারই ফুরিয়ে দেয়।

> ⚠️ **যা বদলাতে থাকে:** rune আর snippet হলো Svelte 5-এর। Svelte 4-এর `let` reactivity, `$:` statement,
> `writable` store আর `<slot />` এখনো legacy mode-এ compile হয়। আসল codebase-এ দুটিই থাকে, search result-এও
> দুটি মেশানো আসে। টেকসই নীতি: reactivity *declare* করতে হয়, আর Svelte 5 সেটা declare করে value-র ওপর।

## কীভাবে কাজ করে

### প্রতিদিন যে চারটি rune লাগে

| Rune       | যা declare করে                          | React-এ সবচেয়ে কাছের ধারণা           |
| ---------- | ------------------------------------- | ----------------------------------- |
| `$state`   | এমন value, যা বদলাতে পারে              | `useState`, setter ছাড়া             |
| `$derived` | অন্য value থেকে হিসাব করা value          | Render-এর সময় একটি সাধারণ expression |
| `$props`   | Component-এর input                     | `props` argument                    |
| `$effect`  | DOM update-এর পরে যে কাজ চালাতে হবে      | `useEffect`                         |

**Dependency array ছাড়া একটি derived total:**

```svelte
<script lang="ts">
  let quantity = $state(1);
  let unitPrice = $state(4.5);
  let total = $derived(quantity * unitPrice);
</script>

<input type="number" bind:value={quantity} />
<p>Total: {total.toFixed(2)}</p>
```

Dependency array নেই, memo-ও নেই। `total` চলার সময় যা যা পড়ে, তা মনে রাখে। তাই expression refactor করলেও এটা
চুপচাপ ভেঙে যেতে পারে না। Derived value **push হয় না, pull হয়**। Svelte এটাকে stale বলে চিহ্নিত করে রাখে, আর
পরের বার কেউ পড়তে এলে আবার হিসাব করে। কয়েক statement-এর হিসাবের জন্য `$derived.by` ব্যবহার করুন।

### `$state` গভীর পর্যন্ত reactive, আর তার একটি দাম আছে

Object বা array-তে `$state` দিলে ফেরত আসে একটি **proxy**। Nested property বদলালেও সেটা reactive, তাই
`form.address.city = city` সোজা কাজ করে। Spread লাগে না, setter-ও লাগে না।

তবে proxy আসল object নয়। `structuredClone`, কোনো charting library বা `fetch` body-তে দেওয়ার আগে
`$state.snapshot(form)` দিয়ে এটা খুলে নিন। 10,000 row-এর API response proxy করতেও সত্যিকারের সময় লাগে। এর সমাধান
`$state.raw`: value **নতুন করে assign করলে** reactive হয়, কিন্তু কখনো proxy হয় না।

### `$effect` হলো বেরোনোর দরজা

Effect চলে DOM update-এর পরে। যা পড়েছে তা মনে রাখে, আর সেই value-গুলো বদলালে আবার চলে। এর কাজ **Svelte-এর
বাইরের জিনিসের সঙ্গে তাল মেলানো**: canvas, map, event listener, analytics call।

**এমন effect, যা Svelte-এর বাইরের একটি chart চালায়:**

```svelte
<script lang="ts">
  let chart = $state<HTMLCanvasElement | undefined>();
  let data = $state<number[]>([]);

  $effect(() => {
    if (!chart) return;
    const instance = drawChart(chart, data); // reads `data`, so re-runs when it changes
    return () => instance.destroy(); // teardown, like useEffect's cleanup
  });
</script>
```

> ⚠️ যে `$effect` একই state পড়ে আবার সেটাতেই লেখে, সেটা infinite loop বানায়। কোনো effect-এর কাজ যদি হয় একটি
> value set করা, তাহলে সেই value-টার আসলে `$derived` হওয়ার কথা ছিল।

### Fine-grained update বনাম React-এর re-render

| দিক                          | React 19 (virtual DOM)           | Svelte 5 (compiled signal)             |
| --------------------------- | ------------------------------- | ------------------------------------- |
| Update কতটা সূক্ষ্ম            | Component subtree               | আলাদা আলাদা DOM node                   |
| কতটা runtime ship হয়         | বড় — reconciler সহ              | ছোট — বেশিরভাগ logic compile-এ মিলিয়ে যায় |
| ভুলের দাম দিতে হয় কোথায়       | Re-render boundary               | State-এ লেখা effect                   |

React diff রেখে দেয়, কারণ pure render ফেলে দিয়ে আবার শুরু করা যায়। Concurrency আর Suspense-এর এটা লাগে। সাধারণভাবে
কোনো model-ই বেশি দ্রুত নয়, আর বেশিরভাগ product-এ এখানকার গতি আসল সীমা নয়।

### `$props` আর `$bindable`

Props destructure করা হয় `$props()` থেকে। Default আর rest-এর জন্য সাধারণ JavaScript syntax-ই চলে।

**একটি bindable prop-সহ typed props declaration:**

```svelte
<script lang="ts">
  let { label, value = $bindable("") }: { label: string; value?: string } = $props();
</script>
```

Svelte 5-এ **default-ভাবে কোনো prop two-way নয়**। Parent `bind:value` লিখলে child-কে `$bindable` দিয়ে সেটা চালু
করতে হয়। Svelte 4-এ ছিল উল্টো, তাই migrate করার সময় অনেকে এখানে আটকান।

### Snippet: `children` আর নাম দেওয়া snippet prop

Component-এর tag-এর মাঝখানের content আসে `children` prop হিসেবে। Tag-এর ভেতরে declare করা snippet সেই নামের prop হয়ে
যায়। দুটি মিলে `<slot />` আর named slot-এর জায়গা নেয়।

**আবশ্যিক header আর ঐচ্ছিক footer-সহ একটি panel:**

```svelte
<!-- Panel.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";

  let { header, children, footer }: { header: Snippet; children: Snippet; footer?: Snippet } = $props();
</script>

<section>
  <h2>{@render header()}</h2>
  <div>{@render children()}</div>
  {#if footer}<footer>{@render footer()}</footer>{/if}
</section>
```

**Caller নাম দেওয়া snippet-গুলো tag-এর ভেতরে declare করে:**

```svelte
<Panel>
  {#snippet header()}Invoices{/snippet}
  <InvoiceTable {invoices} />
</Panel>
```

Snippet যেহেতু value, `{#if footer}` তাই সাধারণ truthiness test। কোনো `$$slots` object নেই।

### Snippet argument নেয়, `let:` ঠিক এই কাজেই ছিল

এটাই headless pattern। Loop আর logic component-এর। একটি row-এর markup caller-এর। React-এর render prop-এর সরাসরি
সমতুল্য।

**এমন table, যেখানে প্রতিটি row caller render করে:**

```svelte
<!-- DataTable.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";

  let { rows, row, empty }: { rows: Invoice[]; row: Snippet<[Invoice]>; empty?: Snippet } = $props();
</script>

{#each rows as item}
  <tr>{@render row(item)}</tr>
{:else}
  {@render empty?.()}
{/each}
```

Type হলো `Snippet<[T]>`। Tuple-এ parameter-এর type ক্রম অনুযায়ী থাকে, তাই `Snippet<[Invoice, number]>` দুটি
argument নেয়, আর শুধু `Snippet` কোনো argument নেয় না।

Snippet **component নয়**। এর state নেই, lifecycle নেই। যে scope-এ declare হয়েছে, এটা তার ওপর একটি closure। Markup-এর
নিজস্ব `$state` বা `$effect` লাগলে সেটাকে component বানান।

> ⚠️ `{#each}`-এর ভেতরে declare করা snippet সেই iteration-এর variable-গুলো ধরে রাখে। পরে render হলে সেটা ধরে রাখা
> value-গুলোই দেখায়। সাধারণত এটাই চান, তবে মাঝে মাঝে খুব বিভ্রান্তিকর।

## কখন ব্যবহার করবেন

| আপনি চান                                     | কী ব্যবহার করবেন               | যা নয়                       |
| ------------------------------------------- | ----------------------------- | -------------------------- |
| অন্য value থেকে হিসাব করা value               | `$derived` বা `$derived.by`   | Assign করা `$effect`        |
| বড়, শুধু পড়ার মতো payload                    | `$state.raw`                  | `$state` — proxy-র খরচ আছে |
| Svelte-এর বাইরের library-কে state দেওয়া       | `$state.snapshot`             | Proxy নিজেই                |
| Parent থেকে two-way binding                  | Prop-এ `$bindable`            | শুধু `bind:`               |
| Component-এ markup পাঠানো                    | Snippet prop বা `children`    | `<slot />`                 |
| এমন markup, যার নিজস্ব state বা effect আছে    | Component                     | Snippet                    |

## সাধারণ ভুল

**❌ এক state-কে আরেকটির সঙ্গে মিলিয়ে রাখতে `$effect` ব্যবহার করা।** এতে একটি বাড়তি render pass হয়, আর loop-এর
ঝুঁকি আসে। **✅ `let full = $derived(`${first} ${last}`)`** — এক line, কোনো lifecycle নেই।

**❌ `$state` object সরাসরি বাইরের library-তে পাঠানো।** এগুলো proxy। `structuredClone` error throw করে, আর deep
equality check ঠিকমতো কাজ করে না। আগে snapshot নিন।

**❌ Prop ঐচ্ছিক হলেও `{@render children()}` call করা।** `{@render children?.()}` লিখুন, নইলে কিছু না পাঠালে render
error throw করে।

## 🔑 মূল শিক্ষা

- Rune হলো compiler syntax, import করা function নয়। এজন্যই এদের dependency array লাগে না।
- `$state` proxy দিয়ে গভীর পর্যন্ত reactive, তাই Svelte-এর বাইরের code-কে দেওয়ার আগে snapshot নিন।
- Default হলো `$derived`, আর `$effect` ব্যতিক্রম, শুধু Svelte-এর বাইরের জিনিসের সঙ্গে কথা বলার জন্য।
- Child `$bindable` declare না করলে props one-way।
- Snippet মানে value হিসেবে markup। `children` আর snippet prop slot-এর জায়গা নেয়। Snippet-এর নিজের কোনো state নেই।

## Interview-এর প্রশ্ন

**Q: Rune কী, আর এর dependency array লাগে না কেন?**

এটা compiler syntax। `$state` আর `$derived` compile হয়ে signal-এর read আর write হয়ে যায়। Dependency হাতে declare
করতে হয় না, expression আসলে চলার সময় যা পড়ে তা থেকেই রেকর্ড হয়। ফলে hook-এর dependency list ওপরের code থেকে সরে
যাওয়ার bug-গুলো আর থাকে না।

**Q: Value হিসাব করার জন্য `$effect` কেন ভুল tool?**

এটা চলে DOM update হয়ে যাওয়ার পরে, তাই value সবসময় এক pass পিছিয়ে থাকে। State-এ লেখা effect নিজেকে আবার চালু
করেও ফেলতে পারে। `$derived` হিসাব করে lazily, পড়ার সময়, আর loop করতে পারে না। Effect হলো Svelte-এর বাইরে হাত
বাড়ানোর জন্য।

**Q: Svelte 5-এর update model React-এর থেকে কীভাবে আলাদা, আর তাতে কিছু যায় আসে কি?**

React component আবার চালিয়ে output diff করে, তাই কাজ বাড়ে যতটা re-render হয়েছে তার সঙ্গে। Svelte update করে ঠিক
সেই node-গুলো, যারা বদলানো value পড়ে। React diff রাখে, কারণ আবার চালানো যায় এমন render-ই concurrency-র ভিত্তি।
বেশিরভাগ product-এ model-এর চেয়ে team, ecosystem আর rendering strategy বেশি প্রভাব ফেলে।

**Q: এমন table component কীভাবে বানাবেন, যেখানে প্রতিটি row caller render করবে?**

Data নিন prop হিসেবে, আর row-এর জন্য একটি `Snippet<[Row]>`। Loop, empty state আর sorting component-এর। Caller
cell-গুলো লেখে `{#snippet row(item)}`-এর ভেতরে। এটা React-এর render prop pattern।

**Q: কোনো কিছু কখন component না হয়ে snippet হবে?**

যখন তার নিজস্ব কোনো state নেই। Snippet হলো lifecycle-হীন closure, তাই এমন markup-এর জন্য মানানসই, যা caller দেয়
আর callee জায়গামতো বসায়। নিজস্ব `$state` বা effect লাগলেই সেটাকে component বানান।

## এরপর কী পড়বেন

- [Chapter ?? — SvelteKit-এ Routing ও Loading](#ch-sveltekit-routing-and-loading) — এই component-গুলো data পায় কোথা থেকে
- [Chapter ?? — `useEffect` and When Not to Use It](#ch-when-not-to-use-effect) — effect নিয়ে একই যুক্তি, React-এ
- [Chapter ?? — Component Composition Pattern](#ch-react-composition-patterns) — render prop, snippet-এর React সংস্করণ
