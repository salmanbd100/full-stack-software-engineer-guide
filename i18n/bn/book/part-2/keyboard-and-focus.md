---
sourceHash: "d698b547091ee93edb58825682d2103657da83912efae0995b447d4b5ec5b904"
title: "Keyboard ও Focus Management"
translatedAt: "2026-10-12T12:12:08.527Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Keyboard ও Focus Management {#ch-keyboard-and-focus}

> পুরো interface keyboard দিয়ে পৌঁছানোর মতো করুন, আর page বদলায় এমন প্রতিটি action-এর পর focus কোনো যুক্তিসঙ্গত জায়গায় রাখুন।

**এই অধ্যায়ে:** focus হলো keyboard-এর cursor · tab order আর `tabindex` · দৃশ্যমান focus · `<dialog>` আর `inert` দিয়ে modal · একটি action-এর পর focus · composite widget

## 💡 মূল ধারণা

Focus হলো keyboard user-এর cursor। Keyboard accessibility-র সবকিছু আসে একে এভাবে দেখা থেকেই। এটা কোথায় আছে, তা আপনি
সবসময় দেখতে পান, আর এটা page-এর সঙ্গে মিলিয়ে একটি ক্রমে সরে। Screen-এ যা আছে তা বদলায় এমন যেকোনো action-এর পর,
**কাউকে না কাউকে ঠিক করতে হয় এটা কোথায় যাবে।** সেই সিদ্ধান্ত বাদ দিলে browser একটি খারাপ সিদ্ধান্ত নেয়। সাধারণত সে
focus-কে document-এর একেবারে ওপরে পাঠিয়ে দেয়, আর user-কে ফিরে আসতে আবার header-এর ভেতর দিয়ে tab করতে হয়।

এটাই সেই accessibility ক্ষেত্র, যেটা সবচেয়ে বেশি মানুষকে সাহায্য করে। Screen reader user, শুধু keyboard ব্যবহারকারী,
আর হাত কাঁপা বা RSI (repetitive strain injury) আছে এমন user — সবাই এর ওপর নির্ভর করেন। আপনার নিজের product-এর power
user-রাও এটা ভালো হলে সঙ্গে সঙ্গে টের পান।

> দুটো প্রশ্ন বেশিরভাগ ত্রুটি ধরে ফেলে। আমি কি এটা keyboard দিয়ে করতে পারি? করার পর focus কোথায়?

## কীভাবে কাজ করে

### Tab order DOM-কে অনুসরণ করে

Browser document-এর ক্রম থেকে tab sequence বানায়, শুধু focusable element-গুলো নিয়ে। এর থেকে আসে একটি শক্ত নিয়ম আর
একটি ছোট শব্দভান্ডার।

| Value | Behaviour | কখন ব্যবহার করবেন |
| --- | --- | --- |
| কোনো `tabindex` নেই | শুধু স্বাভাবিকভাবে focusable element | সবসময় default |
| `tabindex="0"` | Focusable, DOM-এর ক্রমে | যে custom control-এ পৌঁছানো যেতে হবে |
| `tabindex="-1"` | Script দিয়ে focusable, Tab এড়িয়ে যায় | একটি action-এর পর focus-এর target |
| `tabindex="1"` ও তার বেশি | **সবকিছুর আগে লাফিয়ে যায়** | কখনো না |

একটি positive `tabindex` element-টিকে পুরো স্বাভাবিক ক্রমের সামনে টেনে আনে। তখন markup বদলালেই sequence সরে যায়, আর
কেন, সেটা কারও মনে থাকে না। Tab order ভুল হলে **DOM-এর ক্রম ঠিক করুন**। CSS-এর `order` আর `grid-area` focus সরায় না।
একটি page দেখতে যুক্তিসঙ্গত হলেও কেন এলোমেলোভাবে tab করে, তার সবচেয়ে সাধারণ কারণ এটাই।

### Focus দৃশ্যমান হতে হবে

```css
/* ❌ Removes the only cursor a keyboard user has. A 2.4.7 failure. */
*:focus { outline: none; }

/* ✅ Ring for keyboard interaction, suppressed for mouse. */
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

মানুষ outline মুছে ফেলে, কারণ mouse click-এ এটা দেখা যায়। `:focus-visible` ঠিক সেই কারণেই আছে। Browser-এর নিজের
heuristic সমস্যাটা আগেই সমাধান করে, তাই `outline: none`-এর পক্ষে আর কোনো যুক্তি থাকে না।

দুটো খুঁটিনাটি জানার মতো। প্রথমত, **1.4.11 indicator-এর জন্য পাশের রঙের তুলনায় 3 : 1 contrast চায়**, যেটা একটি
অস্পষ্ট এক-pixel-এর রেখাকে বাতিল করে দেয়। ওপরের 2 px, 3 : 1 ring-টি এসেছে 2.4.13 Focus Appearance থেকে। সেই criterion
AAA, কিন্তু একটি design system-এর জন্য এটাই ব্যবহারিক মানদণ্ড। দ্বিতীয়ত, **2.4.11 Focus Not Obscured** WCAG 2.2-এ AA
level-এ নতুন। একটি sticky header বা cookie bar focus করা element-কে পুরোপুরি ঢেকে দিতে পারবে না। Audit-এ গিয়ে আবিষ্কার
না করে focusable content-এ `scroll-margin-top` যোগ করুন।

### Skip link, এখনো

বড় header-ওয়ালা একটি page-এ প্রথম Tab stop-টি user-কে content-এ পৌঁছাতে দেওয়া উচিত।

```html
<a class="skip-link" href="#main">Skip to content</a>
<!-- … header, navigation … -->
<main id="main" tabindex="-1">…</main>
```

Target-এ `tabindex="-1"` গুরুত্বপূর্ণ। এটা না থাকলে কিছু browser viewport সরায়, কিন্তু focus নয়, তাই পরের Tab আবার
header থেকে চলতে থাকে। Focus না হওয়া পর্যন্ত link-টি দৃশ্যত লুকানো থাকতে পারে, কিন্তু focus হলে এটাকে দৃশ্যমান হতেই হবে।

### Modal: native element আপনার হয়ে চারটি কাজ করে

একটি dialog user-কে চারটি behaviour দিতে বাধ্য। Focus ভেতরে যায়, Tab ভেতরেই থাকে, Escape বন্ধ করে, আর যেটা এটাকে
খুলেছিল focus সেখানে ফিরে যায়। `showModal()`-সহ `<dialog>` চারটির মধ্যে তিনটি দেয়, সঙ্গে একটি inert background।

```typescript
const dialog = document.querySelector<HTMLDialogElement>('#confirm')!;

function openConfirm(trigger: HTMLElement): void {
  dialog.showModal();          // Focus moves in, background inert, Escape closes.
  dialog.addEventListener(
    'close',
    () => trigger.focus(),     // The one step nothing does for you.
    { once: true },
  );
}
```

ভেতরে যে element-এর focus পাওয়া উচিত, তাতে `autofocus` যোগ করুন। সাধারণত সেটা প্রথম input, অথবা একটি destructive
confirmation-এ সবচেয়ে নিরাপদ button। **2027-এ হাতে বানানো একটি focus trap বোঝায় যে কেউ ভুল element বেছে নিয়েছেন।**
এটা প্রায় সবসময় সূক্ষ্মভাবে ভুলও হয়। Shadow DOM, iframe আর dynamically যোগ হওয়া content — সবই focusable selector-এর
একটি `querySelectorAll`-কে হারিয়ে দেয়।

যেখানে modal সঠিক pattern নয়, যেমন একটি side panel বা একটি mega-menu, সেখানে `inert` নিজেই আটকে রাখার কাজটা করে। একটি
inert element-এ focus করা, click করা বা assistive technology দিয়ে পড়া যায় না।

```typescript
// Everything outside the panel becomes non-interactive and unfocusable.
document.querySelector<HTMLElement>('#app')!.inert = true;
```

### একটি action-এর পর focus কোথায় যায়

এই সিদ্ধান্তটাই একটি চলনসই implementation-কে একটি ভালো implementation থেকে আলাদা করে।

| Action | Focus যাওয়া উচিত | কেন |
| --- | --- | --- |
| Dialog খোলে | এর ভেতরে, প্রথম control বা heading-এ | নইলে Tab overlay-এর পেছনে চলতে থাকে |
| Dialog বন্ধ হয় | Trigger-এ ফিরে | User-কে তাঁর জায়গায় ফিরিয়ে দেয় |
| একটি row delete হয় | পরের row-তে, অথবা খালি হলে list-এর heading-এ | Trigger আর নেই |
| একটি wizard-এর ধাপ এগোয় | নতুন ধাপের heading-এ, `tabindex="-1"` দিয়ে | পরিবর্তনটা ঘোষণা করে আর Tab-কে সঠিক জায়গায় রাখে |
| Client-side route change | নতুন view-এর `<h1>` বা `<main>`-এ | Client-side navigation-এ কিছুই focus সরায় না |
| Async result আসে | **কোথাও না** — একটি live region-এ ঘোষণা করুন | User যা শুরু করেননি, তার জন্য focus সরানো বিরক্তিকর |

Single-page application প্রায়ই route-change-এর row-টি বাদ দেয়। একটি আসল navigation focus-কে document-এ reset করে।
Client-side route change তা করে না, তাই user আগের page-এ যেখানে ছিলেন, সেখান থেকেই tab করতে থাকেন।

```typescript
// Run on route change: move focus, do not scroll-jack, and let the heading be announced.
function focusNewView(): void {
  const heading = document.querySelector<HTMLElement>('main h1');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: false });
}
```

### Composite widget-এর নিজস্ব key model আছে

একটি tab list, toolbar, tree বা grid-এর ভেতরে Tab দিয়ে navigation হয় না। Widget-টি **একটিই** Tab stop, আর arrow key
এর ভেতরে চলাফেরা করায়। এই pattern-গুলোর user-রা এটাই আশা করেন।

| কৌশল | কীভাবে কাজ করে | কোথায় মানায় |
| --- | --- | --- |
| **Roving `tabindex`** | ঠিক একটি child-এর `tabindex="0"`, বাকিদের `-1`; arrow key এটাকে সরায় | Tabs, toolbar, radio-ধাঁচের group |
| **`aria-activedescendant`** | DOM focus container-এই থাকে; attribute-টি active child-এর নাম বলে | Combobox, বড় listbox |

Trade-off-টা এই। Roving `tabindex` আপনাকে আসল DOM focus দেয়, তাই `:focus-visible` styling আর native scrolling কাজ করে।
`aria-activedescendant` typing-কে input-এই রাখে, আর এই কারণেই একটি combobox-এর এটা লাগে।

> ⚠️ WCAG 2.2 AA level-এ 2.5.7 Dragging Movements যোগ করেছে। Drag করে ক্রম বদলানো যেকোনো কিছুর একটি single-pointer
> বিকল্প লাগে। একটি drag-and-drop list-কে একটি keyboard পথ দিন, যেমন Move up, Move down, বা cut আর paste। এতে
> criterion-টিও মেটে, প্রতিটি keyboard user-এর প্রয়োজনও মেটে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --- | --- | --- |
| একটি blocking dialog | `showModal()`-সহ `<dialog>` | Focus আটকে রাখা, inert background আর Escape — সবই native |
| একটি non-modal panel, যেটা তবু page আটকাবে | বাকি অংশে `inert` | একটি trap-এর বদলে একটি attribute |
| Tab order দৃশ্যমান ক্রমের সঙ্গে মেলে না | DOM-এর ক্রম বদলান | CSS-এর ক্রম কখনো focus সরায় না |
| APG list-এর একটি custom widget | Roving `tabindex` বা `aria-activedescendant` | Tab widget থেকে বেরিয়ে যায়; arrow ভেতরে চলাফেরা করায় |
| User চাননি এমন একটি background result | Focus নয়, একটি live region | Focus কেড়ে নিলে user তাঁর জায়গা হারান |

## সাধারণ ভুল

**❌ কোনো বিকল্প ছাড়া `outline: none`**

> একমাত্র keyboard cursor-টিই সরিয়ে ফেলা হলো। আপত্তি যদি mouse-এর ring নিয়ে হয়, `:focus-visible` সেটা আগেই ঠিক করেছে।

**❌ ক্রম "ঠিক" করতে একটি positive `tabindex`**

> এটা element-টিকে পুরো document-এর আগে লাফিয়ে দেয়, আর markup বদলাতে বদলাতে sequence নষ্ট হয়ে যায়। বরং element-টি
> সরান।

**❌ Focus ফেরত না দিয়ে dialog বন্ধ করা**

> Focus document-এ পড়ে যায়, তাই user-কে আগের জায়গায় ফিরতে page-এর ওপর থেকে tab করতে হয়।

**❌ প্রতিটি async update-এ focus সরানো**

> Focus কেড়ে নেওয়া একটি toast typing-এ বাধা দেয়। এটা polite-ভাবে ঘোষণা করুন, আর cursor-কে নিজের জায়গায় থাকতে দিন।

**✅ Pull request খোলার আগে নিজের feature-এর ভেতর দিয়ে tab করে দেখা**

> দুই মিনিট, কোনো tooling নেই, আর এটা যেকোনো automated rule set-এর চেয়ে বেশি আসল ত্রুটি ধরে।

## 🔑 মূল শিক্ষা

- Tab order আসে DOM থেকে, তাই শুধু `tabindex="0"` আর `tabindex="-1"` নিরাপদ। CSS দিয়ে ক্রম বদলালে focus কখনো সরে না।
- `:focus-visible` keyboard user-দের একটি ring দেয়, mouse click-এ না দেখিয়ে। তাই outline সরানোর আর কোনো কারণ থাকে না।
- `showModal()`-সহ `<dialog>` দেয় focus আটকে রাখা, একটি inert background আর Escape। Trigger-এ focus ফেরত দেওয়া এখনো আপনার কাজ।
- Screen-এ যা আছে তা বদলায় এমন প্রতিটি action-এর জন্য focus কোথায় নামবে, সে বিষয়ে একটি স্পষ্ট সিদ্ধান্ত লাগে, বিশেষ করে client-side route change-এ।
- Tabs, toolbar আর combobox-এর ভেতরে widget-টি একটিই Tab stop, আর arrow key এর ভেতরে navigate করে, roving `tabindex` বা `aria-activedescendant` দিয়ে।

## Interview-এর প্রশ্ন

**Q: Focus outline সরিয়ে ফেলায় সমস্যা কী, আর তার বদলে আপনি কী করেন?**

এটা মুছে দেয় সেই একমাত্র চিহ্ন, যা দিয়ে একজন keyboard user বোঝেন তিনি কোথায় আছেন। এতে 2.4.7 fail করে, আর product mouse
ছাড়া ব্যবহারের অযোগ্য হয়ে যায়। মানুষ এটা সরায়, কারণ mouse click-এ ring দেখা যায়, আর `:focus-visible` ঠিক সেটাই আগে
থেকে সমাধান করে: browser keyboard ব্যবহারে ring দেখায়, pointer-এর ক্ষেত্রে লুকায়। আমি এটাও যাচাই করব যে এটা পাশের রঙের
তুলনায় 3 : 1 মেটায় কি না। একটি অস্পষ্ট outline review পার হয়ে যায়, আর audit-এ fail করে।

**Q: একটি dialog খোলে, আর Tab তার পেছনের page-এর ভেতর দিয়ে চলতেই থাকে। কী হচ্ছে?**

কিছুই focus-কে dialog-এর ভেতরে সরায়নি, আর কিছুই background-কে inert করেনি। এটা একটি styled overlay, modal নয়।
`<dialog>` আর `showModal()` দিলে browser focus ভেতরে নিয়ে যায়, পেছনের সবকিছু inert করে, আর Escape-এ বন্ধ হয়। Markup
বদলানো না গেলে, page container-এ `inert` হলো সবচেয়ে ছোট সঠিক fix। যেভাবেই হোক, বন্ধ হওয়ার সময় trigger-এ focus ফেরত
দেওয়াটা আমি যোগ করব, কারণ সেটা কিছুই আপনার হয়ে করে না।

**Q: User একটি table থেকে একটি row delete করার পর focus কোথায় যাওয়া উচিত?**

"কোথাও না" নয়, যেটা default-এ ঘটে। Trigger চলে গেছে, তাই focus body-তে পড়ে যায়। সাধারণত পরের row-এর action button
সঠিক। মুছে ফেলা row-টি শেষটা হলে আগের row ব্যবহার করুন, আর list এখন খালি হলে table-এর heading। আমি একটি polite live
region-এ deletion-টাও ঘোষণা করব। শুধু focus সরালেই একজন screen reader user জানতে পারেন না কী ঘটেছে।

**Q: একটি single-page application-এ keyboard navigation কীভাবে আলাদা?**

একটি আসল navigation focus-কে নতুন document-এর ওপরে reset করে। Client-side route change তা করে না, তাই user এমন একটি
link-এ focus করা অবস্থায় থাকেন, যেটা আর layout-এ নেই। সমাধান হলো route change-এ focus-কে নতুন view-এর heading-এ সরানো,
`tabindex="-1"` দিয়ে। এতে tab sequence সঠিক জায়গায় বসে, আর নতুন page-এর title ঘোষিত হয়। একটি SPA সবচেয়ে বেশি বাদ দেয়
এই অংশটাই।

**Q: কখন Tab-এর বদলে arrow key দিয়ে navigate করা উচিত?**

একটি composite widget-এর ভেতরে, যেমন tabs, একটি toolbar, একটি menu, একটি tree বা একটি grid। পুরো widget-টি একটিই Tab
stop হওয়া উচিত, যাতে একজন keyboard user এক চাপে এটা পেরিয়ে যেতে পারেন। Arrow এর ভেতরে চলাফেরা করায়। আমি একটি roving
`tabindex` ব্যবহার করব, যাতে DOM focus আসল হয় আর `:focus-visible` কাজ করে। ব্যতিক্রম হলো combobox। সেখানে
`aria-activedescendant` highlight সরলেও typing-কে input-এই রাখে।

## এরপর কী পড়বেন

- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — ওই composite widget-গুলোর যে role লাগে
- [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms) — validation-এর সময় focus আর ঘোষণা
- [Chapter ?? — Accessibility Testing](#ch-testing-accessibility) — keyboard pass, আর automation কেন এটা ধরতে পারে না
