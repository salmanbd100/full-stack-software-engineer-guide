---
sourceHash: "d698b547091ee93edb58825682d2103657da83912efae0995b447d4b5ec5b904"
title: "Keyboard ও Focus Management"
translatedAt: "2026-10-17T01:03:05.760Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Keyboard ও Focus Management {#ch-keyboard-and-focus}

> পুরো interface keyboard দিয়ে ব্যবহারযোগ্য করুন। আর page বদলে দেয় এমন প্রতিটি কাজের পরে focus কোনো যুক্তিসঙ্গত জায়গায় রাখুন।

**এই অধ্যায়ে:** focus মানে keyboard-এর cursor · tab order আর `tabindex` · দৃশ্যমান focus · `<dialog>` আর `inert` দিয়ে modal · কোনো কাজের পরে focus · composite widget

## 💡 মূল ধারণা

Focus হলো keyboard user-এর cursor। একে cursor হিসেবে দেখলেই keyboard accessibility-র বাকি সব বোঝা যায়। Focus কোথায় আছে
তা সবসময় দেখা যায়, আর এটা এমন ক্রমে সরে, যা page-এর সঙ্গে মেলে। আর screen-এ যা আছে তা বদলে দেয় এমন যেকোনো কাজের পরে,
**focus কোথায় যাবে তা কাউকে ঠিক করতেই হয়।** আপনি সিদ্ধান্ত না নিলে browser একটি খারাপ সিদ্ধান্ত নেয়। সাধারণত focus পাঠিয়ে
দেয় document-এর একদম ওপরে, আর user-কে আগের জায়গায় ফিরতে আবার header-এর ভেতর দিয়ে tab করতে হয়।

Accessibility-র মধ্যে এই অংশটাই সবচেয়ে বেশি মানুষের কাজে লাগে। Screen reader user, শুধু keyboard ব্যবহার করা user, আর কাঁপুনি
বা RSI (repetitive strain injury) আছে এমন user, সবাই এর ওপর নির্ভর করেন। আপনার নিজের product-এর power user-রাও এটা ভালো হলে
সঙ্গে সঙ্গে টের পান।

> দুটি প্রশ্নেই বেশিরভাগ defect ধরা পড়ে। এটা কি keyboard দিয়ে করা যায়? করার পরে focus কোথায়?

## কীভাবে কাজ করে

### Tab order DOM-কে অনুসরণ করে

Browser tab-এর ক্রম বানায় document-এর ক্রম ধরে, শুধু focus করা যায় এমন element নিয়ে। এখান থেকে আসে একটি কড়া নিয়ম আর
ছোট একটি শব্দভান্ডার।

| Value | আচরণ | কখন ব্যবহার করবেন |
| --- | --- | --- |
| কোনো `tabindex` নেই | শুধু স্বাভাবিকভাবে focus করা যায় এমন element | সবসময় এটাই default |
| `tabindex="0"` | Focus করা যায়, DOM-এর ক্রমে | এমন custom control, যেখানে পৌঁছাতে হবে |
| `tabindex="-1"` | Script দিয়ে focus করা যায়, Tab এড়িয়ে যায় | কোনো কাজের পরে focus-এর গন্তব্য |
| `tabindex="1"` বা তার বেশি | **সবকিছুর আগে লাফিয়ে চলে যায়** | কখনোই না |

Positive `tabindex` element-টাকে পুরো স্বাভাবিক ক্রমের সামনে টেনে আনে। তারপর markup বদলালেই ক্রমটা এলোমেলো হয়ে যায়, আর কেন
এমন হলো তা কারও মনে থাকে না। Tab order ভুল হলে **DOM-এর ক্রম ঠিক করুন**। CSS `order` আর `grid-area` focus সরায় না। Page
দেখতে ঠিকঠাক অথচ tab করলে এদিক-ওদিক লাফায়, এর সবচেয়ে সাধারণ কারণ এটাই।

### Focus দেখা যেতে হবে

```css
/* ❌ Removes the only cursor a keyboard user has. A 2.4.7 failure. */
*:focus { outline: none; }

/* ✅ Ring for keyboard interaction, suppressed for mouse. */
:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

মানুষ outline মুছে দেয়, কারণ mouse click করলেও সেটা দেখা যায়। `:focus-visible` ঠিক এই কারণেই আছে। Browser-এর নিজের হিসাবই
সমস্যাটা মিটিয়ে দেয়, তাই `outline: none`-এর পক্ষে আর কোনো যুক্তি থাকে না।

দুটি খুঁটিনাটি জানা দরকার। প্রথমত, **1.4.11 চায় 3 : 1 contrast**, পাশের রঙের তুলনায় indicator-এর জন্য। তাই হালকা এক pixel-এর
line চলবে না। ওপরের 2 px, 3 : 1 ring-টা এসেছে 2.4.13 Focus Appearance থেকে। সেই criterion AAA, কিন্তু design system-এর জন্য
বাস্তবে এটাই মান হওয়া উচিত। দ্বিতীয়ত, **2.4.11 Focus Not Obscured** WCAG 2.2-এ AA level-এ নতুন। Sticky header বা cookie
bar focused element-কে পুরোপুরি ঢাকতে পারবে না। Audit-এ গিয়ে জানার বদলে focus করা যায় এমন content-এ `scroll-margin-top` দিন।

### Skip link, এখনো

বড় header-ওয়ালা page-এ প্রথম Tab-এই user-কে content-এ পৌঁছানোর সুযোগ দিতে হবে।

```html
<a class="skip-link" href="#main">Skip to content</a>
<!-- … header, navigation … -->
<main id="main" tabindex="-1">…</main>
```

গন্তব্যে `tabindex="-1"` থাকা জরুরি। না থাকলে কিছু browser viewport সরায়, কিন্তু focus সরায় না, ফলে পরের Tab আবার header
থেকেই চলে। Focus না পাওয়া পর্যন্ত link-টা চোখের আড়ালে থাকতে পারে, কিন্তু focus পেলে দেখা যেতেই হবে।

### Modal: native element আপনার হয়ে চারটি কাজ করে

User-এর কাছে dialog-এর দায় চারটি আচরণ। Focus ভেতরে যায়, Tab ভেতরেই থাকে, Escape চাপলে বন্ধ হয়, আর যে জিনিস dialog খুলেছিল,
focus সেখানে ফিরে যায়। `showModal()`-সহ `<dialog>` চারটির তিনটি দেয়, সঙ্গে inert একটি background।

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

ভেতরে যে element-এর focus পাওয়ার কথা, তাতে `autofocus` দিন। সাধারণত সেটা প্রথম input, অথবা কিছু মুছে ফেলার confirmation-এ
সবচেয়ে নিরাপদ button। **2027 সালে হাতে বানানো focus trap মানে কেউ ভুল element বেছে নিয়েছেন।** আর সেটা প্রায় সবসময়ই সূক্ষ্মভাবে
ভুল হয়। Shadow DOM, iframe আর পরে যোগ হওয়া content, সবই focus করা যায় এমন selector-এর `querySelectorAll`-কে হারিয়ে দেয়।

যেখানে pattern-টা modal নয়, যেমন side panel বা mega-menu, সেখানে `inert` একাই আটকে রাখার কাজটা করে। Inert element focus করা
যায় না, click করা যায় না, assistive technology পড়তেও পারে না।

```typescript
// Everything outside the panel becomes non-interactive and unfocusable.
document.querySelector<HTMLElement>('#app')!.inert = true;
```

### কোনো কাজের পরে focus কোথায় যায়

এই সিদ্ধান্তই চলনসই implementation আর ভালো implementation-কে আলাদা করে।

| কাজ | Focus যাওয়া উচিত | কেন |
| --- | --- | --- |
| Dialog খোলে | ভেতরে, প্রথম control-এ বা heading-এ | নইলে Tab overlay-এর পেছনে চলতে থাকে |
| Dialog বন্ধ হয় | Trigger-এ ফিরে | User নিজের জায়গায় ফিরে যান |
| একটি row মুছে ফেলা হয় | পরের row-এ, list খালি হলে list-এর heading-এ | Trigger আর নেই |
| Wizard-এর পরের ধাপে যাওয়া | নতুন ধাপের heading-এ, `tabindex="-1"` দিয়ে | বদলটা announce হয়, আর Tab ঠিক জায়গা থেকে চলে |
| Client-side route বদল | নতুন view-এর `<h1>` বা `<main>`-এ | Client-side navigation-এ কিছুই focus সরায় না |
| Async result আসে | **কোথাও না** — live region-এ announce করুন | User যা শুরু করেননি, তার জন্য focus সরানো শত্রুতার শামিল |

Single-page application প্রায় নিয়মিত route বদলের row-টা বাদ দেয়। আসল navigation focus-কে document-এ ফিরিয়ে আনে। Client-side
route বদল তা করে না, ফলে user আগের page-এ যেখানে ছিলেন, সেখান থেকেই tab করে চলেন।

```typescript
// Run on route change: move focus, do not scroll-jack, and let the heading be announced.
function focusNewView(): void {
  const heading = document.querySelector<HTMLElement>('main h1');
  heading?.setAttribute('tabindex', '-1');
  heading?.focus({ preventScroll: false });
}
```

### Composite widget-এর নিজের key model আছে

Tab list, toolbar, tree বা grid-এর ভেতরে Tab দিয়ে চলাফেরা হয় না। পুরো widget-টা **একটি** Tab stop, আর ভেতরে চলাফেরা হয় arrow
key দিয়ে। এসব pattern-এর user-রা এটাই আশা করেন।

| কৌশল | কীভাবে কাজ করে | কোথায় মানায় |
| --- | --- | --- |
| **Roving `tabindex`** | ঠিক একটি child-এর `tabindex="0"`, বাকিদের `-1`; arrow key সেটাকে সরায় | Tabs, toolbar, radio-ধাঁচের group |
| **`aria-activedescendant`** | DOM focus container-এই থাকে; attribute-টা active child-এর নাম বলে | Combobox, বড় listbox |

আপসটা এরকম। Roving `tabindex` সত্যিকারের DOM focus দেয়, তাই `:focus-visible`-এর styling আর native scrolling কাজ করে।
`aria-activedescendant` typing-কে input-এই রাখে, আর এজন্যই combobox-এ এটা লাগে।

> ⚠️ WCAG 2.2 AA level-এ 2.5.7 Dragging Movements যোগ করেছে। Drag করে ক্রম বদলানো যায় এমন সবকিছুর single-pointer বিকল্প
> লাগে। Drag-and-drop list-কে keyboard-এর একটি পথ দিন, যেমন Move up, Move down, বা cut আর paste। তাতে criterion-ও পূরণ হয়,
> প্রত্যেক keyboard user-এর কাজও চলে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী বেছে নেবেন | কেন |
| --- | --- | --- |
| Interaction আটকে রাখা dialog | `showModal()`-সহ `<dialog>` | Focus আটকে রাখা, inert background আর Escape, সবই native |
| Modal নয় এমন panel, যা তবু page আটকাবে | বাকি অংশে `inert` | Trap-এর বদলে একটিই attribute |
| Tab order দেখার ক্রমের সঙ্গে মেলে না | DOM-এর ক্রম বদলান | CSS-এর ক্রম কখনো focus সরায় না |
| APG list-এর কোনো custom widget | Roving `tabindex` বা `aria-activedescendant` | Tab widget থেকে বেরিয়ে যায়; arrow ভেতরে চলে |
| User চাননি এমন background result | Focus নয়, live region | Focus কেড়ে নিলে user নিজের জায়গা হারান |

## সাধারণ ভুল

**❌ কোনো বিকল্প ছাড়াই `outline: none`**

> Keyboard-এর একমাত্র cursor-টাই মুছে ফেলা হলো। আপত্তি যদি mouse-এর ring নিয়ে হয়, `:focus-visible` সেটা আগেই মিটিয়ে দিয়েছে।

**❌ ক্রম "ঠিক" করতে positive `tabindex`**

> এটা element-টাকে পুরো document-এর আগে লাফিয়ে নিয়ে যায়, আর markup বদলাতে বদলাতে ক্রমটা পচে যায়। তার বদলে element-টাই
> সরান।

**❌ Focus না ফিরিয়ে dialog বন্ধ করা**

> Focus গিয়ে পড়ে document-এ, ফলে user-কে আগের জায়গায় ফিরতে page-এর একদম ওপর থেকে tab করতে হয়।

**❌ প্রতিটি async update-এ focus সরানো**

> যে toast focus কেড়ে নেয়, সেটা typing-এর মাঝখানে বাধা দেয়। ভদ্রভাবে announce করুন, cursor-কে ছেড়ে দিন।

**✅ Pull request খোলার আগে নিজের feature-এ tab করে দেখা**

> দুই মিনিট, কোনো tool লাগে না, আর যেকোনো automated rule set-এর চেয়ে বেশি আসল defect ধরা পড়ে।

## 🔑 মূল শিক্ষা

- Tab order আসে DOM থেকে, তাই নিরাপদ শুধু `tabindex="0"` আর `tabindex="-1"`। CSS দিয়ে ক্রম বদলালে focus কখনো সরে না।
- `:focus-visible` keyboard user-কে ring দেখায়, কিন্তু mouse click-এ দেখায় না, তাই outline মোছার আর কোনো কারণ নেই।
- `showModal()`-সহ `<dialog>` focus আটকে রাখে, background inert করে আর Escape সামলায়। Trigger-এ focus ফিরিয়ে দেওয়া তবু আপনার কাজ।
- Screen-এ যা আছে তা বদলে দেয় এমন প্রতিটি কাজের পরে focus কোথায় পড়বে, তা স্পষ্ট করে ঠিক করতে হয়, বিশেষ করে client-side route বদলে।
- Tabs, toolbar আর combobox-এর ভেতরে widget-টা একটি Tab stop, আর ভেতরে arrow key দিয়ে চলাফেরা হয়, roving `tabindex` বা `aria-activedescendant` দিয়ে।

## Interview-এর প্রশ্ন

**Q: Focus outline মুছে দেওয়ায় সমস্যা কী, আর তার বদলে কী করবেন?**

এতে keyboard user কোথায় আছেন, তার একমাত্র চিহ্নটাই মুছে যায়। এটা 2.4.7-এ ফেল করে, আর mouse ছাড়া product-টা অচল হয়ে যায়।
মানুষ এটা মোছে, কারণ mouse click-এও ring দেখা যায়, আর `:focus-visible` ঠিক সেই সমস্যাই মিটিয়ে দিয়েছে: keyboard ব্যবহারে
browser ring দেখায়, pointer-এ লুকায়। পাশের রঙের তুলনায় এটা 3 : 1 মানে কি না, সেটাও যাচাই করব। হালকা outline review পার হয়ে
যায়, কিন্তু audit-এ ফেল করে।

**Q: একটি dialog খোলে, অথচ Tab তার পেছনের page-এর ভেতর দিয়ে চলতেই থাকে। কী হচ্ছে?**

কিছুই focus-কে dialog-এর ভেতরে সরায়নি, আর কিছুই background-কে inert করেনি। এটা style করা একটি overlay, modal নয়। `<dialog>`
আর `showModal()` দিলে browser focus ভেতরে নেয়, পেছনের সবকিছু inert করে, আর Escape-এ বন্ধ করে। Markup বদলানো না গেলে page-এর
container-এ `inert` দেওয়াই সবচেয়ে ছোট সঠিক সমাধান। যেভাবেই হোক, বন্ধ করার সময় trigger-এ focus ফিরিয়ে দেওয়াটা যোগ করব, কারণ
এটা কেউ আপনার হয়ে করে না।

**Q: User table থেকে একটি row মুছে ফেললে focus কোথায় যাওয়া উচিত?**

"কোথাও না" নয়, অথচ default-এ ঠিক সেটাই হয়। Trigger আর নেই, তাই focus গিয়ে পড়ে body-তে। সাধারণত পরের row-এর action button-ই
ঠিক জায়গা। মোছা row-টা শেষেরটা হলে আগের row, আর list খালি হয়ে গেলে table-এর heading। মুছে ফেলার কথাটা একটি polite live
region-এও announce করব। শুধু focus সরালে screen reader user জানতে পারেন না কী ঘটল।

**Q: Single-page application-এ keyboard navigation কীভাবে আলাদা?**

আসল navigation নতুন document-এর একদম ওপরে focus ফিরিয়ে আনে। Client-side route বদল তা করে না, ফলে user-এর focus থেকে যায় এমন
একটি link-এ, যা layout-এ আর নেই। সমাধান হলো route বদলালে focus নতুন view-এর heading-এ সরানো, `tabindex="-1"` দিয়ে। তাতে tab-এর
ক্রম ঠিক জায়গা থেকে শুরু হয়, আর নতুন page-এর title announce হয়। SPA সবচেয়ে বেশি এই অংশটাই বাদ দেয়।

**Q: কখন Tab নয়, arrow key দিয়ে navigate করা উচিত?**

Composite widget-এর ভেতরে, যেমন tabs, toolbar, menu, tree বা grid। পুরো widget-টা হওয়া উচিত একটি Tab stop, যাতে keyboard user
এক চাপেই এটা পার হয়ে যেতে পারেন। ভেতরে চলে arrow। আমি roving `tabindex` ব্যবহার করব, যাতে DOM focus সত্যিকারের হয় আর
`:focus-visible` কাজ করে। ব্যতিক্রম combobox। সেখানে highlight সরলেও `aria-activedescendant` typing-কে input-এই রাখে।

## এরপর কী পড়বেন

- [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) — এসব composite widget-এর যে role লাগে
- [Chapter ?? — Accessible Form ও Error Message](#ch-accessible-forms) — validation-এর সময় focus আর announcement
- [Chapter ?? — Accessibility Testing](#ch-testing-accessibility) — keyboard pass, আর automation কেন এটা ধরতে পারে না
