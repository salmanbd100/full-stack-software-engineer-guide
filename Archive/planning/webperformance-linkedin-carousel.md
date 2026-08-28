# LinkedIn Carousel: Web Performance Essentials

> **How to use this file:**
> Each slide below is one PDF page for a LinkedIn carousel post. Copy the content into Canva, Figma, or Google Slides to design visuals. Recommended size: **1080 × 1350 px** (4:5 ratio works best on LinkedIn).

---

## 🎨 Slide 1 — Cover

**Headline:**
# Web Performance
## 10 Things Every Frontend Dev Must Know

**Subtitle:**
A quick guide to faster, smoother websites.

**Footer:**
👉 Swipe to learn →
💾 Save for later

**Visual hint:** Speed gauge or rocket icon. Bold gradient background.

---

## 🎨 Slide 2 — Why Performance Matters

**Headline:**
# Slow sites lose money. Fast.

**Stats (3 big numbers):**

⏱ **1 second** delay
→ 7% fewer conversions

⚡ **0.1 second** faster LCP
→ 8% more sales

🔍 **Google** ranks fast sites higher
→ More organic traffic

**Bottom line:**
> Performance isn't optional. It's revenue.

---

## 🎨 Slide 3 — The Core Web Vitals

**Headline:**
# Google grades you on 3 numbers

| Metric | Measures | Goal |
|--------|----------|------|
| **LCP** | Loading speed | < 2.5s |
| **INP** | Responsiveness | < 200ms |
| **CLS** | Visual stability | < 0.1 |

**Memorize these numbers.**
They affect your SEO ranking directly.

---

## 🎨 Slide 4 — LCP (Loading)

**Headline:**
# LCP — Largest Contentful Paint

When does your main content show up?
**Goal: under 2.5 seconds**

**Quick wins:**

✅ Compress your hero image
✅ Use AVIF or WebP format
✅ Add `priority` to the LCP image
✅ Preload critical fonts and CSS
✅ Use a CDN

**Pro tip:**
The LCP element is usually a hero image. Optimize that first.

---

## 🎨 Slide 5 — INP (Responsiveness)

**Headline:**
# INP — Interaction to Next Paint

How fast does your page respond to clicks?
**Goal: under 200ms**

**Quick wins:**

✅ Break long JS tasks into chunks
✅ Debounce search inputs (300ms)
✅ Throttle scroll handlers (100ms)
✅ Use Web Workers for heavy work
✅ `useMemo` + `useCallback` in React

**Watch out:**
Any task longer than 50ms blocks user input.

---

## 🎨 Slide 6 — CLS (Stability)

**Headline:**
# CLS — Cumulative Layout Shift

How much does your page jump around?
**Goal: under 0.1**

**Quick wins:**

✅ Always set `width` & `height` on images
✅ Reserve space for ads with `min-height`
✅ Use `font-display: swap` for fonts
✅ Avoid inserting content above existing content
✅ Use CSS `aspect-ratio`

**Golden rule:**
> Reserve space BEFORE content loads.

---

## 🎨 Slide 7 — Lazy Load Everything

**Headline:**
# Don't load what users don't see

**Images:**
```html
<img src="..." loading="lazy" />
```

**Components:**
```jsx
const Heavy = React.lazy(() => import('./Heavy'));
```

**Routes:**
Split each page into its own chunk.

**Result:**
📉 20-40% faster initial load
💰 Big bandwidth savings

---

## 🎨 Slide 8 — Image Optimization

**Headline:**
# Images = 50%+ of page weight

**The fix in 4 steps:**

1️⃣ **Use AVIF or WebP**
   → 50% smaller than JPEG

2️⃣ **Use `srcset`**
   → Right size for each device

3️⃣ **Lazy load below the fold**
   → `loading="lazy"`

4️⃣ **Use an image CDN**
   → Cloudinary, Imgix, or Vercel

**Bonus:** Always set `width` and `height` to prevent layout shift.

---

## 🎨 Slide 9 — Bundle Size Matters

**Headline:**
# Smaller JS = faster page

**Target: < 200 KB initial bundle (gzipped)**

**How to get there:**

🌳 **Tree shake** unused code
✂️ **Code split** by route
🗜 **Minify** with Terser/esbuild
📦 **Compress** with Brotli (75% smaller)

**Watch out for:**
- `moment.js` (288 KB) → use `date-fns` (2 KB)
- Importing all of `lodash` (70 KB)
- Heavy chart libraries loaded eagerly

---

## 🎨 Slide 10 — Tools & Closing

**Headline:**
# Measure → Improve → Repeat

**Lab data (development):**
🛠 Lighthouse
🛠 Chrome DevTools
🛠 WebPageTest

**Field data (production):**
📊 `web-vitals` library
📊 Chrome User Experience Report
📊 Google Analytics 4

**Closing message:**

> You can't improve what you don't measure.
> Start with Core Web Vitals.
> Ship faster sites.

**Call to action:**
💾 Save this post
🔁 Share with your team
💬 What's your biggest performance challenge?

---

## 📐 Design Tips for the Carousel

| Element | Recommendation |
|---------|----------------|
| **Size** | 1080 × 1350 px (4:5 ratio) |
| **Font** | Bold sans-serif (Inter, Poppins, Montserrat) |
| **Colors** | 2-3 max, with one accent |
| **Text size** | Headlines 60-80pt, body 24-32pt |
| **Whitespace** | Plenty — don't crowd slides |
| **Visuals** | One icon or image per slide max |
| **Brand** | Your name/handle on every slide footer |

## 🚀 Tools to Build the PDF

1. **Canva** → free templates for LinkedIn carousels
2. **Figma** → design from scratch with full control
3. **Google Slides** → export as PDF
4. **Beautiful.ai** → AI-assisted slide design

## ✍️ Suggested LinkedIn Caption

```
Most websites are slower than they need to be.

I spent weeks studying web performance for senior frontend roles.
Here are 10 things every developer should know 👇

(Save this for your next project)

#webperformance #frontend #javascript #react #webdev
```
