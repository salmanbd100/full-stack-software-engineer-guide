---
sourceHash: "cb92d9b9ab30501a33a98f0965e3d7a1b93205ae17b94c7545636ec3d1aca4d4"
title: "Runes Model, Component ও Snippet"
translatedAt: "2026-10-12T12:10:21.520Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Runes Model, Component ও Snippet {#ch-svelte-runes}

> কোন value-গুলো reactive তা বলে দিন, markup-কে একটি value হিসেবে এদিক-ওদিক পাঠান, আর compiler-কে শুধু সেই DOM node-গুলো update করতে দিন, যেগুলো ওই value-এর ওপর নির্ভর করে।

**এই অধ্যায়ে:** rune আসলে কী · `$state`, `$derived` আর `$effect` · fine-grained update বনাম React-এর re-render · `$props` আর `$bindable` · slot-এর জায়গায় snippet

## 💡 মূল ধারণা

Rune এমন কোনো function নয়, যেটা আপনি call করেন। এটা একটি **compiler-এর নির্দেশ**, যেটা দেখতে function-এর মতো।
`$state(0)` runtime-এ কখনো চলে না। Compiler এটা দেখে, variable-টিকে একটি signal-এ পরিণত করে, আর প্রতিটি read ও write
নতুন করে লেখে।

এজন্যই rune-এর কোনো import নেই: `$state` হলো syntax। এজন্যই Svelte 5-এ reactivity **প্রতি value-এর, প্রতি
component-এর নয়**। React একটি component function আবার চালায়, আর ফলাফল তুলনা করে। Svelte একটি graph বানায়: কোন
value কোন DOM node-কে খাওয়ায়। একটি value বদলালে যে node-গুলো সেটা পড়ে সেগুলো update হয়, আর কিছুই চলে না।

Component-ও একই ধারণা মেনে চলে। একটি **snippet** হলো নামসহ markup, আর একটি declare করলে একটি value তৈরি হয়।
আপনি এটাকে অন্য যেকোনো কিছুর মতোই prop হিসেবে পাঠান। Svelte 4-এর slot ছিল একটি আলাদা mechanism। Snippet সেটা সরিয়ে দেয়।

> ⚠️ **যা বদলাতে থাকে:** rune আর snippet Svelte 5-এর। Svelte 4-এর `let` reactivity, `$:` statement,
> `writable` store আর `<slot />` legacy mode-এ এখনো compile হয়। বাস্তব codebase-এ দুটিই থাকে, আর search-এর
> ফলাফলে দুটি মিশে যায়। যে নীতি টিকে থাকবে: reactivity *declare করা* হয়, আর Svelte 5 সেটা value-এর ওপর declare করে।

## কীভাবে কাজ করে

### যে চারটি rune আপনি প্রতিদিন ব্যবহার করেন

| Rune       | যা declare করে                            | সবচেয়ে কাছের React ধারণা                  |
| ---------- | ----------------------------------- | ----------------------------------- |
| `$state`   | এমন একটি value যেটা বদলাতে পারে              | `useState`, setter ছাড়া      |
| `$derived` | অন্য value থেকে হিসাব করা একটি value   | Render-এর সময় একটি সাধারণ expression    |
| `$props`   | Component-এর input               | `props` argument                |
| `$effect`  | DOM update হওয়ার পর চালানোর কাজ    | `useEffect`                         |

**একটি derived total, কোনো dependency array ছাড়া:**

```svelte
<script lang="ts">
  let quantity = $state(1);
  let unitPrice = $state(4.5);
  let total = $derived(quantity * unitPrice);
</script>

<input type="number" bind:value={quantity} />
<p>Total: {total.toFixed(2)}</p>
```

কোনো dependency array নেই, কোনো memo নেই। `total` চলার সময় যা পড়ে তা নিজেই লিখে রাখে। তাই expression refactor
করলেও এটা চুপচাপ ভেঙে যেতে পারে না। একটি derived value **টেনে আনা হয়, ঠেলে পাঠানো হয় না**। Svelte এটাকে
stale হিসেবে চিহ্নিত করে, আর পরের বার কেউ এটা পড়লে আবার হিসাব করে। একাধিক statement-এর হিসাবের জন্য
`$derived.by` ব্যবহার করুন।

### `$state` deep, আর তার একটি খরচ আছে

Object বা array-এর ওপর `$state` একটি **proxy** return করে। Nested property বদলানো reactive, তাই
`form.address.city = city` সরাসরি কাজ করে, কোনো spread বা setter ছাড়াই।

Proxy মূল object নয়। `structuredClone`, কোনো charting library বা একটি `fetch` body-তে দেওয়ার আগে
`$state.snapshot(form)` দিয়ে এটা খুলে নিন। 10,000 row-এর একটি API response proxy করতেও সত্যিকারের সময় লাগে।
`$state.raw` এটা ঠিক করে: value-টি **নতুন করে assign** করলে reactive হয়, আর কখনো proxy হয় না।

### `$effect` হলো জরুরি বেরোনোর পথ

একটি effect DOM update হওয়ার পর চলে, যা পড়েছে তা track করে, আর সেই value বদলালে আবার চলে। এটা আছে
**Svelte-এর বাইরের জিনিসের সঙ্গে মিলিয়ে রাখার** জন্য: একটি canvas, একটি map, একটি event listener, একটি analytics call।

**একটি effect, যেটা non-Svelte chart চালায়:**

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

> ⚠️ যে `$effect` এমন state লেখে যেটা সে নিজেও পড়ে, সেটা একটি infinite loop তৈরি করে। কোনো effect-এর কাজ যদি একটি
> value set করা হয়, তাহলে সেই value-এর `$derived` হওয়ার কথা ছিল।

### Fine-grained update বনাম React-এর re-render

| দিক                   | React 19 (virtual DOM)          | Svelte 5 (compiled signal)           |
| --------------------------- | ------------------------------- | ------------------------------------- |
| Update-এর মাত্রা          | Component subtree               | আলাদা আলাদা DOM node                   |
| পাঠানো runtime             | বড় — reconciler         | ছোট — বেশিরভাগ logic compile হয়ে মিলিয়ে যায়      |
| ভুলের খরচ কোথায়     | Re-render boundary            | যে effect state লেখে              |

React diff রেখে দেয়, কারণ একটি pure render ফেলে দিয়ে আবার শুরু করা যায়। Concurrency আর Suspense-এর এটা
লাগে। সাধারণভাবে কোনো model-ই বেশি দ্রুত নয়, আর বেশিরভাগ product-এর জন্য এখানে গতি সীমাবদ্ধতা নয়।

### `$props` আর `$bindable`

Prop-গুলো `$props()` থেকে destructure করা হয়। Default আর rest সাধারণ JavaScript syntax ব্যবহার করে।

**একটি typed props declaration, একটি bindable prop-সহ:**

```svelte
<script lang="ts">
  let { label, value = $bindable("") }: { label: string; value?: string } = $props();
</script>
```

Svelte 5-এ **default-ভাবে কোনো prop two-way নয়**। Parent `bind:value` লিখলে child-কে `$bindable` দিয়ে
সম্মতি দিতে হয়। এটা Svelte 4-এর উল্টো, আর migrate করার সময় মানুষ এখানে আটকে যায়।

### Snippet: `children` আর নামযুক্ত snippet prop

একটি component-এর tag-এর মাঝের content আসে একটি `children` prop হিসেবে। Tag-এর ভেতরে declare করা একটি snippet
সেই নামের একটি prop হয়ে যায়। দুটি মিলে `<slot />` আর named slot-এর জায়গা নেয়।

**একটি panel, যার header বাধ্যতামূলক আর footer ঐচ্ছিক:**

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

**Caller tag-এর ভেতরে নামযুক্ত snippet-গুলো declare করে:**

```svelte
<Panel>
  {#snippet header()}Invoices{/snippet}
  <InvoiceTable {invoices} />
</Panel>
```

Snippet একটি value, তাই `{#if footer}` একটি সাধারণ truthiness test। কোনো `$$slots` object নেই।

### Snippet argument নেয়, আর `let:` এই কাজের জন্যই ছিল

এটা headless pattern। Component loop আর logic-এর মালিক। Caller একটি row-এর markup-এর মালিক। এটা React-এর
render prop-এর সরাসরি সমতুল্য।

**একটি table, যেটা caller-কে প্রতিটি row render করতে দেয়:**

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

Type হলো `Snippet<[T]>`। Tuple-টি parameter-এর type-গুলো ক্রমানুসারে তালিকা করে, তাই `Snippet<[Invoice, number]>`
দুটি argument নেয়, আর শুধু `Snippet` কোনোটাই নেয় না।

Snippet **component নয়**। এর কোনো state নেই, কোনো lifecycle নেই। এটা সেই scope-এর ওপর একটি closure, যেখানে এটা
declare করা হয়েছে। Markup-এর যদি নিজস্ব `$state` বা `$effect` লাগে, তাহলে এটাকে component বানান।

> ⚠️ `{#each}`-এর ভেতরে declare করা snippet সেই iteration-এর variable-গুলোর ওপর close করে। পরে render হলে এটা
> capture করা value-ই দেখায়। সাধারণত আপনি এটাই চান, আর মাঝেমধ্যে এটা খুব বিভ্রান্তিকর।

## কখন ব্যবহার করবেন

| আপনি চান                                    | যা ব্যবহার করবেন                     | যা নয়                        |
| ------------------------------------------- | ----------------------------- | -------------------------- |
| অন্য value থেকে হিসাব করা একটি value           | `$derived` বা `$derived.by`   | Assign করে এমন `$effect`     |
| একটি বড়, read-only payload                   | `$state.raw`                  | `$state` — proxy-র খরচ আছে |
| Non-Svelte library-কে state দেওয়া        | `$state.snapshot`             | Proxy নিজে           |
| Parent থেকে two-way binding                | Prop-এর ওপর `$bindable`       | শুধু `bind:`              |
| Component-এ পাঠানো markup               | একটি snippet prop বা `children`  | `<slot />`                 |
| যে markup state বা effect-এর মালিক          | একটি component                   | একটি snippet                  |

## সাধারণ ভুল

**❌ এক টুকরো state-কে আরেকটির সঙ্গে মিলিয়ে রাখতে `$effect` ব্যবহার করা।** এতে একটি বাড়তি render pass আর loop-এর
ঝুঁকি যোগ হয়। **✅ `let full = $derived(`${first} ${last}`)`** — এক line, কোনো lifecycle নেই।

**❌ `$state` object সরাসরি কোনো বাইরের library-কে দেওয়া।** এগুলো proxy। `structuredClone`
throw করে, আর deep-equality check ভুল আচরণ করে। আগে snapshot নিন।

**❌ Prop ঐচ্ছিক হলেও `{@render children()}` call করা।** `{@render children?.()}` ব্যবহার করুন, নইলে কিছু
পাঠানো না হলে render throw করে।

## 🔑 মূল শিক্ষা

- Rune হলো compiler syntax, import করা function নয়, আর এজন্যই এদের কোনো dependency array লাগে না।
- `$state` একটি proxy দিয়ে deep-ভাবে reactive, তাই Svelte-এর বাইরের code-কে দেওয়ার আগে snapshot নিন।
- `$derived` হলো default, আর `$effect` ব্যতিক্রম, শুধু Svelte-এর বাইরের জিনিসের সঙ্গে কথা বলার জন্য।
- Child `$bindable` declare না করলে prop one-way।
- Snippet হলো value হিসেবে markup। `children` আর snippet prop slot-এর জায়গা নেয়। Snippet-এর নিজস্ব কোনো state নেই।

## Interview-এর প্রশ্ন

**Q: Rune কী, আর এর কেন dependency array লাগে না?**

এটা compiler syntax। `$state` আর `$derived` compile হয়ে signal read আর write-এ পরিণত হয়। Dependency-গুলো
expression আসলে evaluate হওয়ার সময় লেখা হয়, হাতে declare করা হয় না। এতে সেই bug-গুলো দূর হয়, যেখানে একটি
hook-এর dependency list ওপরের code থেকে সরে যায়।

**Q: একটি value হিসাব করতে `$effect` কেন ভুল tool?**

এটা DOM update হওয়ার পর চলে, তাই value-টি সবসময় এক pass পিছিয়ে থাকে। State লেখে এমন একটি effect নিজেকে আবার
চালু করতেও পারে। `$derived` read-এর সময় lazily হিসাব করে, আর loop করতে পারে না। Effect হলো Svelte-এর বাইরে
পৌঁছানোর জন্য।

**Q: Svelte 5-এর update model React-এর থেকে কীভাবে আলাদা, আর এতে কি কিছু যায় আসে?**

React component আবার চালায় আর output diff করে, তাই কাজ বাড়ে যা re-render হয়েছে তার অনুপাতে। Svelte ঠিক সেই
node-গুলো update করে, যেগুলো বদলে যাওয়া value পড়ে। React diff রাখে, কারণ আবার চালানো যায় এমন render
concurrency চালায়। বেশিরভাগ product-এর জন্য team, ecosystem আর rendering কৌশল model-এর চেয়ে বেশি নির্ধারণ করে।

**Q: এমন একটি table component কীভাবে বানাবেন, যেটা caller-কে প্রতিটি row render করতে দেয়?**

Data-কে একটি prop হিসেবে নিন, আর row-এর জন্য একটি `Snippet<[Row]>`। Component loop, empty state আর যেকোনো
sorting-এর মালিক। Caller `{#snippet row(item)}`-এর ভেতরে cell-গুলো লেখে। এটা React-এর render prop pattern।

**Q: কখন কোনো কিছু component না হয়ে snippet হবে?**

যখন এর নিজস্ব কোনো state নেই। Snippet হলো lifecycle ছাড়া একটি closure, তাই এটা এমন markup-এর জন্য মানানসই, যেটা
caller দেয় আর callee বসায়। এর নিজস্ব `$state` বা একটি effect লাগলেই এটাকে component বানান।

## এরপর কী পড়বেন

- [Chapter ?? — SvelteKit-এ Routing ও Loading](#ch-sveltekit-routing-and-loading) — এই component-গুলো কোথা থেকে data পায়
- [Chapter ?? — `useEffect` and When Not to Use It](#ch-when-not-to-use-effect) — effect নিয়ে একই যুক্তি, React-এ
- [Chapter ?? — Component Composition Pattern](#ch-react-composition-patterns) — render prop, snippet-এর React সংস্করণ
