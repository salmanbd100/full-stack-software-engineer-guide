# SEO and Analytics

## 💡 **Concept**

SEO makes content discoverable by search engines. Analytics measures how users actually behave. Together they drive product decisions: SEO brings users in, analytics shows what they do next.

**How to answer in an interview:** "For SEO I'd ensure the LCP element is in server-rendered HTML, add structured data for rich snippets, and manage canonical URLs. For analytics I'd implement GA4 with custom events for key conversions, ship a privacy-compliant consent banner, and pipe data to BigQuery for deeper analysis."

---

## SEO Fundamentals

### Meta Tags

```typescript
// Next.js 13+ — metadata API (no extra library needed)
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await fetchProduct(params.slug);
  return {
    title: `${product.name} | Acme Store`,
    description: product.description.slice(0, 155),   // 155 chars max
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.imageUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description,
      images: [product.imageUrl],
    },
    alternates: {
      canonical: `https://acme.com/products/${params.slug}`,
    },
    robots: { index: true, follow: true },
  };
}
```

### Structured Data (Schema.org)

Rich snippets in search results require structured data.

```typescript
interface ProductStructuredData {
  "@context": "https://schema.org";
  "@type": "Product";
  name: string;
  description: string;
  image: string;
  offers: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
    availability: string;
  };
}

function ProductSchema({ product }: { product: Product }) {
  const schema: ProductStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    offers: {
      "@type": "Offer",
      price: product.price.toString(),
      priceCurrency: "USD",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

### Sitemap

```typescript
// app/sitemap.ts — Next.js generates /sitemap.xml automatically
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchAllProducts();
  const productUrls = products.map((p) => ({
    url: `https://acme.com/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    { url: "https://acme.com", changeFrequency: "daily", priority: 1.0 },
    { url: "https://acme.com/about", changeFrequency: "monthly", priority: 0.5 },
    ...productUrls,
  ];
}
```

---

## Rendering and SEO

| Rendering | SEO | Why |
|-----------|-----|-----|
| **SSG** | ✅ Best | Pre-rendered HTML, fastest crawl |
| **SSR** | ✅ Good | Full HTML per request |
| **ISR** | ✅ Good | Fresh HTML with SSG speed |
| **CSR** | ⚠️ Poor | Googlebot must execute JS to see content |

> If SEO matters, content must be in the initial HTML — not inserted after JavaScript executes.

---

## Analytics with GA4

```typescript
// lib/analytics.ts — typed GA4 event helpers
declare global {
  interface Window {
    gtag: (command: string, ...args: unknown[]) => void;
  }
}

interface PageViewEvent {
  page_path: string;
  page_title: string;
}

interface ConversionEvent {
  event_category: string;
  event_label?: string;
  value?: number;
  currency?: string;
}

export function trackPageView({ page_path, page_title }: PageViewEvent): void {
  window.gtag("event", "page_view", { page_path, page_title });
}

export function trackPurchase(orderId: string, value: number): void {
  window.gtag("event", "purchase", {
    transaction_id: orderId,
    value,
    currency: "USD",
  });
}

export function trackEvent(name: string, params: ConversionEvent): void {
  window.gtag("event", name, params);
}
```

### React Router integration

```typescript
// Track page views on route change (SPA)
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    trackPageView({
      page_path: location.pathname,
      page_title: document.title,
    });
  }, [location]);

  return <>{children}</>;
}
```

---

## Privacy and GDPR

Collecting analytics on EU users requires consent. Load GA4 only after consent is granted.

```typescript
type ConsentStatus = "granted" | "denied" | "pending";

interface ConsentState {
  analytics: ConsentStatus;
  marketing: ConsentStatus;
}

function ConsentBanner() {
  const [consent, setConsent] = React.useState<ConsentState>({
    analytics: "pending",
    marketing: "pending",
  });

  const accept = () => {
    const state: ConsentState = { analytics: "granted", marketing: "granted" };
    setConsent(state);
    localStorage.setItem("consent", JSON.stringify(state));
    // Initialize GA4 now that we have consent
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
    });
  };

  if (consent.analytics !== "pending") return null;
  return (
    <div role="dialog" aria-label="Cookie consent">
      <p>We use cookies to improve your experience.</p>
      <button onClick={accept}>Accept</button>
      <button onClick={() => setConsent({ analytics: "denied", marketing: "denied" })}>
        Decline
      </button>
    </div>
  );
}
```

---

## Common Mistakes

❌ **Loading GA4 without consent on EU traffic** — GDPR violation  
❌ **CSR-only rendering for SEO-critical pages** — Google may not index JavaScript-rendered content reliably  
❌ **Missing canonical URLs** — duplicate content hurts ranking (e.g., `/products/1` vs `/products/1?ref=email`)  
❌ **Tracking every event** — analytics debt; track conversions and user intent, not clicks on every button

**Key insight:**

> SEO and rendering are coupled. If your marketing site uses CSR, Google may index an empty page. The fix is SSG or SSR — not adding more meta tags.

---
[← Back to SystemDesign](../README.md)
