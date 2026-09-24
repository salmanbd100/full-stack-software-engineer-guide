---
title: Web Components and Framework Interop
part: 3
chapter: 56
slug: web-components-and-interop
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-23
tags: [web-components, custom-elements, shadow-dom, design-systems, react, interop]
in_book: true
---

# Web Components and Framework Interop {#ch-web-components-and-interop}

> Ship one component library to three frameworks, and know exactly what you give up to do it.

**In this chapter:** the three platform pieces · what React 19 changed · the events and props boundary · styling across the shadow boundary · server rendering · the honest decision rule

## 💡 The Core Idea

A custom element is a component the browser understands. It is registered once, used as a tag, and works
in React, in Svelte, in a Rails template and in a plain HTML file — because none of those has to know
anything about it.

That is the whole argument, and it is an organisational argument rather than a technical one. One team
maintaining a design system for six product teams on three frameworks either ships three
implementations, or ships one thing all three can consume. The platform component is the only thing all
three can consume.

> Nobody reaches for web components because the authoring experience is better. They reach for them when
> the alternative is maintaining the same button three times.

## How It Works

Three separate features, usually used together and independently useful.

| Piece | Gives you | Independent? |
| ----- | --------- | ------------ |
| **Custom elements** | A tag name bound to a class, with lifecycle callbacks | Yes — usable with no shadow DOM at all |
| **Shadow DOM** | Style and markup encapsulation, with slots for projected content | Yes |
| **HTML templates** | Inert markup to clone | Yes, and largely superseded by frameworks |

**A custom element, in the shape a design system ships:**

```typescript
class RatingStars extends HTMLElement {
  // Which attributes trigger attributeChangedCallback.
  static observedAttributes: string[] = ["value"];

  connectedCallback(): void {
    this.attachShadow({ mode: "open" });
    this.render();
  }

  attributeChangedCallback(_name: string, _old: string, _next: string): void {
    this.render();
  }

  private render(): void {
    // Events are the output half of the contract — see below.
    this.shadowRoot!.innerHTML = `<span part="stars">${"★".repeat(Number(this.getAttribute("value")))}</span>`;
  }
}

customElements.define("rating-stars", RatingStars);
```

### What React 19 changed

This is the version stamp that matters, because most of the "web components are painful in React"
folklore predates it.

Before React 19, React set unrecognised props as **attributes**, which meant everything crossing the
boundary was stringified — an object prop arrived as `"[object Object]"`. React 19 added full custom
element support and passes the Custom Elements Everywhere suite:

- **On the client:** a prop that matches a property on the element instance is set as a **property**.
  Anything else is set as an attribute.
- **On the server:** primitives — `string`, `number`, `true` — render as attributes. Objects, symbols,
  functions and `false` are **omitted entirely**.

That asymmetry is the thing to remember. An object prop works on the client and is simply absent in
server-rendered HTML, so a component that depends on it renders empty until hydration.

### The two halves of the contract

**In: attributes for primitives, properties for everything else.** Attributes are strings, always. A
number crosses as `"5"` and an object cannot cross at all, so rich data has to be assigned as a property.

**Out: events, not callbacks.** A custom element cannot take a function as an attribute, so it reports
by dispatching:

```typescript
// `composed: true` is what lets the event escape the shadow boundary.
this.dispatchEvent(
  new CustomEvent<{ value: number }>("rating-change", {
    detail: { value: 4 },
    bubbles: true,
    composed: true,
  }),
);
```

React's `onRatingChange` convention does not exist here — React only knows about its own synthetic
events. React 19 improves props, not events, so a custom event still needs a ref and
`addEventListener`, which is what most teams wrap in a thin generated React adapter.

### Styling across the boundary

Shadow DOM's encapsulation is the feature and the constraint: your stylesheet cannot reach in, and the
component's cannot leak out. Three sanctioned ways through it:

| Mechanism | What it exposes |
| --------- | --------------- |
| **Custom properties** | They inherit through the boundary — the main theming channel |
| **`::part()`** | Named internals the consumer may style, chosen by the author |
| **Slots** | Consumer-supplied markup, styled by the consumer's own stylesheet |

This is why the token discipline matters: a design system whose colours are custom properties themes
cleanly across the boundary, and one whose colours live in a framework config does not.

> ⚠️ **Moving target:** declarative shadow DOM, scoped custom element registries and the styling
> proposals around them have moved every year since 2023. The durable principle is the contract — data
> in as attributes and properties, results out as events, styling through custom properties and parts —
> and that has not changed since custom elements shipped.

## When to Use It

| Situation | Reach for | Why |
| --------- | --------- | --- |
| A design system consumed by several frameworks | Custom elements | The only artefact all of them can use |
| Incremental migration away from a legacy framework | Custom elements | Both stacks can mount the same component |
| A widget embedded in customers' sites | Custom elements with shadow DOM | Encapsulation stops their CSS breaking yours |
| Product UI inside one React codebase | React components | You would pay the boundary cost for nothing |
| Anything that must server-render with rich data | React or Svelte components | Non-primitive props are dropped during SSR |

### What you give up

- **Server rendering.** A custom element renders as an empty tag until its script runs. Declarative
  shadow DOM improves this and is not universally available; for content that must be in the HTML, this
  is disqualifying.
- **Type safety at the seam.** JSX does not know your element's props unless you declare them, so the
  compiler stops helping exactly where the two systems meet.
- **Ergonomics.** Every consuming framework wants a thin wrapper — for events, for types, for refs — and
  that wrapper is code somebody maintains.

## Common Mistakes

**❌ Passing an object and expecting it to survive the server.** React 19 omits non-primitive props in
SSR output. The component renders blank until hydration, which looks like a bug in production and works
perfectly in development.

**❌ Dispatching an event without `composed: true`.** It stops at the shadow boundary, so nothing
outside the component ever hears it, and the author usually discovers this after shipping.

**❌ Encapsulating so hard that nothing is themeable.** A shadow root with no custom properties and no
`::part()` is a component nobody can adapt, and the first product team that needs a different corner
radius will fork it.

**❌ Reaching for web components inside one application.** The whole return is cross-framework reuse. Pay
the boundary cost only when you are actually crossing a boundary.

## 🔑 Key Takeaways

- A custom element is the only component artefact every framework can consume, which makes it an
  organisational tool more than a technical one.
- React 19 assigns matching props as properties on the client, but omits non-primitive props during
  server rendering — that asymmetry is where the bugs live.
- Data goes in as attributes and properties; results come out as events, and the event needs
  `composed: true` to escape the shadow root.
- Custom properties and `::part()` are the sanctioned ways through the style boundary, which is why
  design tokens belong in custom properties.
- Inside a single-framework codebase, web components cost you ergonomics and type safety and return
  nothing.

## Interview Questions

**Q: A platform team wants one component library for React, SvelteKit and a legacy Angular app. What do you recommend?**

Custom elements, with the caveats stated up front. It is the only artefact all three can mount, and the
alternative is three implementations that drift within two quarters. The caveats are that each framework
wants a thin generated wrapper for events and types, that server-rendered content will not be in the
HTML until the script runs, and that theming has to go through custom properties and `::part()` from day
one — retrofitting that after six teams have adopted the library is the expensive version.

**Q: What actually changed for web components in React 19?**

React used to treat unrecognised props as attributes, so anything non-primitive was stringified and
object props were unusable. React 19 checks whether the prop matches a property on the element instance
and assigns it as a property if so, falling back to an attribute. During server rendering it emits
primitives as attributes and drops objects, functions and `false` entirely. So props are solved and
events are not — a custom event still needs a ref and `addEventListener`.

**Q: What does shadow DOM buy, and what does it cost?**

It buys real encapsulation: the consumer's stylesheet cannot reach in and the component's cannot leak
out, which is why embeddable widgets use it. It costs you every convenience built on global CSS —
utility classes do not apply inside, global resets do not apply inside, and anything the consumer wants
to restyle has to have been deliberately exposed as a custom property or a part. Encapsulation and
themeability pull against each other, and the author has to decide where the seam is.

**Q: When would you deliberately not use shadow DOM but still use custom elements?**

When you want the lifecycle and the tag but not the style isolation — a behaviour wrapper, an analytics
boundary, a progressive-enhancement element around existing markup. Light-DOM custom elements
participate in the page's cascade, so the design system's utilities and resets still apply, and server
rendering works because the markup is real HTML that the element then upgrades.

## What to Read Next

- [Chapter ?? — Styling Strategy](#ch-styling-strategy) — why the token layer has to be custom properties for any of this to theme
- [Chapter ?? — Micro-Frontends](#ch-micro-frontends) — the other answer to "several teams, one page", and its costs
- [Chapter ?? — Design Systems at Scale](#ch-design-systems-at-scale) — the contract this chapter is an implementation of
