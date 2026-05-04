---
name: linkedin-carousel
description: Convert any topic or documentation file into a 7–10 slide LinkedIn carousel post. Use when the user asks to "make a LinkedIn post", "create a carousel", "make slides", "make a PDF for LinkedIn", or asks to turn documentation into a slideshow. Output is mobile-friendly, concise, and ready to paste into Canva/Figma.
---

# LinkedIn Carousel Generator

Generate a high-quality LinkedIn carousel post (7–10 slides) from a topic, file, or directory in this repository.

## When to Use This Skill

Trigger this skill when the user says any of:
- "Make a LinkedIn carousel from [topic]"
- "Create a carousel post for [file]"
- "Turn [docs] into a LinkedIn slideshow"
- "Make 7-10 slides about [X]"
- "Make a PDF for LinkedIn from [Y]"

## Inputs to Gather

Before writing slides, confirm or infer:

1. **Source material** — file path, directory, or topic (e.g. `Frontend/WebPerformance/`)
2. **Slide count** — default to **10** unless user specifies (range: 7–10)
3. **Audience** — default to "frontend developers" unless told otherwise
4. **Tone** — default: confident, beginner-friendly, no jargon

If the user gives a directory, **read the README.md or main files first** to extract the most important concepts. Do not include every detail — pick what's interview-worthy or share-worthy.

## Slide Structure (Mandatory)

Every carousel must have these 3 zones:

```
[Slide 1]      → Hook / Cover
[Slides 2–N-1] → Content (1 idea per slide)
[Slide N]      → Tools, CTA, closing
```

### Per-Slide Rules

| Rule | Why |
|------|-----|
| **One headline per slide** | Mobile screens are tiny |
| **3–5 bullets max** | More = unreadable on phone |
| **Use big numbers/stats** | They stop the scroll |
| **Use emojis sparingly** | 1–3 per slide, not decoration |
| **Include a takeaway** | Each slide should teach 1 thing |
| **No paragraphs** | Use bullets, tables, or short lines |

### Slide Type Guide

| Slide # | Type | Must Include |
|---------|------|--------------|
| 1 | **Cover** | Bold title, subtitle, "Swipe →", "Save 💾" |
| 2 | **Why it matters** | Stats, business impact, hook |
| 3–N-1 | **Concept** | Headline + 3-5 bullets + 1 takeaway |
| N | **CTA** | Tools, summary, engagement question |

## Output Format

Write a **single markdown file** named `LINKEDIN-CAROUSEL-<topic>.md` (kebab-case topic) in the same directory as the source material, OR in the project root if the source is a topic without a clear location.

The file MUST contain these sections in order:

```markdown
# LinkedIn Carousel: <Topic>

> **How to use this file:**
> Each slide below is one PDF page. Copy the content into Canva, Figma,
> or Google Slides. Recommended size: **1080 × 1350 px** (4:5 ratio).

---

## 🎨 Slide 1 — Cover
[Headline, subtitle, CTA, visual hint]

---

## 🎨 Slide 2 — <Title>
[Content]

... (more slides) ...

---

## 📐 Design Tips for the Carousel
[Table of size, font, colors, spacing recommendations]

## 🚀 Tools to Build the PDF
[Canva, Figma, Google Slides options]

## ✍️ Suggested LinkedIn Caption
[Code block with copy-paste ready caption + hashtags]
```

## Slide Content Template

Each content slide should follow this exact pattern:

```markdown
## 🎨 Slide N — <Short Title>

**Headline:**
# <Big bold question or statement>

[Optional 1-line subtitle answering the headline]

**Quick wins / Key points:**

✅ Point 1 (action verb start)
✅ Point 2
✅ Point 3
✅ Point 4 (max 5 total)

**Pro tip / Takeaway:**
> One memorable line the reader will screenshot.
```

## Mandatory End Sections

Always include these 3 closing sections in the output file:

### 1. Design Tips Table

```markdown
| Element | Recommendation |
|---------|----------------|
| **Size** | 1080 × 1350 px (4:5 ratio) |
| **Font** | Bold sans-serif (Inter, Poppins, Montserrat) |
| **Colors** | 2-3 max, with one accent |
| **Text size** | Headlines 60-80pt, body 24-32pt |
| **Whitespace** | Plenty — don't crowd slides |
| **Visuals** | One icon or image per slide max |
| **Brand** | Your name/handle on every slide footer |
```

### 2. Tools List

```markdown
1. **Canva** → free templates for LinkedIn carousels
2. **Figma** → design from scratch with full control
3. **Google Slides** → export as PDF
4. **Beautiful.ai** → AI-assisted slide design
```

### 3. LinkedIn Caption

A copy-paste-ready caption inside a code block, with:
- Hook in the first line (curiosity gap)
- Brief context (1–2 lines)
- "Save this post" line
- 3–5 relevant hashtags

## Quality Checklist

Before finalizing, verify:

- [ ] Slide count is between 7 and 10
- [ ] Every slide fits visually on a 4:5 mobile screen
- [ ] No slide has more than 5 bullets
- [ ] No slide has a paragraph longer than 2 lines
- [ ] Headlines are bold and short (under 8 words)
- [ ] Numbers and stats appear on at least 2 slides
- [ ] Cover slide has a clear hook
- [ ] Closing slide has a CTA + engagement question
- [ ] Design tips table is included at the end
- [ ] Suggested LinkedIn caption is included
- [ ] Tone is beginner-friendly, no walls of text
- [ ] File is saved with a clear name (`LINKEDIN-CAROUSEL-<topic>.md`)

## Voice & Style

- ✅ Use simple words ("show up" not "render")
- ✅ Use short sentences
- ✅ Use stats and numbers liberally
- ✅ Use action verbs in bullets ("Compress images", not "Image compression")
- ❌ Don't use "leverage", "synergize", or other corporate jargon
- ❌ Don't write long paragraphs — slides aren't blog posts
- ❌ Don't include code blocks longer than 5 lines (use 1-3 line snippets only)

## Example Reference

For a gold-standard example of the output format, see:
`Frontend/WebPerformance/LINKEDIN-CAROUSEL.md`

That file shows exactly how the slides should look — headlines, bullets, tables, design hints, and the closing caption.

## After Creating the File

End your response with a short summary that includes:
1. The file path you wrote to
2. The topics covered (one line per slide)
3. A reminder that the user should design the slides in Canva/Figma at 1080 × 1350 px

Do not narrate the process while writing. Write the file, then summarize briefly.
