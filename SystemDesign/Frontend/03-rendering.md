# Rendering Strategies

## 💡 **Concept**

Rendering strategy determines when and where HTML is generated. It's the most impactful architectural decision for performance and SEO. The choice is driven by how dynamic the content is and whether SEO matters.

**How to answer in an interview:** "I'd choose the rendering strategy per page type, not per application. Marketing pages use SSG for best performance and SEO. Product listings use ISR for fresh data without full rebuilds. Authenticated dashboards use CSR — SEO doesn't matter there. If a page needs real-time personalization, SSR."

---

## Quick Comparison

| Strategy | TTFB | FCP | SEO | Server Cost | Best For |
|----------|------|-----|-----|-------------|---------|
| **CSR** | Fast | Slow | ❌ | Low | Dashboards, SaaS |
| **SSR** | Slow | Fast | ✅ | High | Dynamic public pages |
| **SSG** | Fastest | Fastest | ✅ | Lowest | Blogs, docs, marketing |
| **ISR** | Fastest | Fastest | ✅ | Low | E-commerce, content sites |

---

## Client-Side Rendering (CSR)

The server sends a minimal HTML shell. React downloads, executes, fetches data, and renders — all in the browser.

**Use when:** Authenticated apps, admin panels, tools where SEO doesn't matter.

```typescript
// Pure CSR — data fetched entirely client-side
function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
  });

  if (isLoading) return <Skeleton />;
  return <DashboardContent stats={stats} />;
}
```

---

## Server-Side Rendering (SSR)

The server runs React on every request, sends fully-formed HTML. React "hydrates" it client-side.

**Use when:** Public pages with dynamic, personalized, or frequently-changing content.

```typescript
// Next.js SSR — runs on every request
export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { params, req } = context;
  const user = await getSessionUser(req);
  const product = await fetchProduct(params?.id as string);

  return { props: { product, user } };
}

export default function ProductPage({ product, user }: Props) {
  return <ProductDetail product={product} user={user} />;
}
```

---

## Static Site Generation (SSG)

HTML generated once at build time. Served from CDN — zero server computation per request.

**Use when:** Content changes rarely (blogs, docs, marketing pages).

```typescript
// Next.js SSG — runs at build time only
export async function getStaticPaths() {
  const posts = await fetchAllPosts();
  return {
    paths: posts.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,  // 404 for unknown paths
  };
}

export async function getStaticProps({ params }: GetStaticPropsContext) {
  const post = await fetchPost(params?.slug as string);
  return { props: { post } };
}
```

---

## Incremental Static Regeneration (ISR)

Generates static pages at build time but re-generates them in the background after a TTL. Best of SSG + SSR.

**Use when:** Content changes periodically — e-commerce listings, news, product catalogs.

```typescript
// ISR — static with background revalidation
export async function getStaticProps() {
  const products = await fetchProducts();
  return {
    props: { products },
    revalidate: 3600,  // regenerate at most once per hour
  };
}
```

**How ISR works:**
```
1. First request → serve stale static page
2. Background → server re-generates the page with fresh data
3. Next request → serve the updated page
4. Repeat after `revalidate` seconds
```

---

## Decision Matrix

```
Page type                | Strategy     | Why
-------------------------|--------------|-----------------------------
Marketing / landing      | SSG          | Static, best perf + SEO
Blog / docs              | SSG          | Rarely changes
Product listing          | ISR (1h TTL) | Prices change, but not live
News / real-time feed    | SSR          | Changes every request
Authenticated dashboard  | CSR          | No SEO need, highly dynamic
Search results           | SSR          | Dynamic per query
```

---

## Hydration

After SSR/SSG, React downloads JavaScript and "hydrates" the static HTML — attaching event listeners without re-rendering the DOM.

**Progressive hydration:** Hydrate above-fold components first. Defer below-fold ones until visible.

```typescript
import React, { lazy, Suspense } from "react";

// Critical — hydrated immediately
import Header from "./Header";
import Hero from "./Hero";

// Non-critical — hydrated when needed
const Reviews = lazy(() => import("./Reviews"));
const RelatedProducts = lazy(() => import("./RelatedProducts"));

export default function ProductPage() {
  return (
    <>
      <Header />
      <Hero />
      <Suspense fallback={<Skeleton />}>
        <Reviews />
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <RelatedProducts />
      </Suspense>
    </>
  );
}
```

---

## Common Mistakes

❌ **One strategy for the whole app** — use SSG for marketing, CSR for dashboards, ISR for listings  
❌ **SSR for authenticated pages** — adds server cost with no SEO benefit  
❌ **SSG for frequently-changing content** — users see stale data; use ISR instead  
❌ **Forgetting hydration mismatch** — server HTML must match client render or React throws

**Key insight:**

> Modern frameworks like Next.js let you mix strategies per page. The optimal setup: SSG for static content, ISR for periodic updates, SSR for personalized public pages, CSR for authenticated sections.

---
[← Back to SystemDesign](../README.md)
