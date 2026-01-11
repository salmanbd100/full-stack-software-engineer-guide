# SEO and Analytics

## Overview
Search Engine Optimization (SEO) and analytics are essential for discoverability and understanding user behavior. Good SEO increases organic traffic, while analytics provide insights for data-driven decisions.

## 💡 **SEO Fundamentals**

Core SEO concepts including meta tags, structured data, and sitemaps for better search engine visibility.

### Meta Tags

Essential metadata for search engines and social media.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Basic Meta Tags -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title - Brand Name (max 60 chars)</title>
  <meta name="description" content="Concise description of the page content. Appears in search results. (max 160 chars)">
  <meta name="keywords" content="keyword1, keyword2, keyword3">
  <meta name="author" content="Author Name">

  <!-- Canonical URL -->
  <link rel="canonical" href="https://example.com/page">

  <!-- Open Graph (Facebook, LinkedIn) -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Page Title">
  <meta property="og:description" content="Description for social sharing">
  <meta property="og:image" content="https://example.com/image.jpg">
  <meta property="og:url" content="https://example.com/page">
  <meta property="og:site_name" content="Brand Name">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@username">
  <meta name="twitter:title" content="Page Title">
  <meta name="twitter:description" content="Description for Twitter">
  <meta name="twitter:image" content="https://example.com/image.jpg">

  <!-- Robots -->
  <meta name="robots" content="index, follow">
  <!-- OR -->
  <meta name="robots" content="noindex, nofollow">
</head>
</html>
```

### React Meta Tags

Dynamic meta tag management in React applications using libraries like react-helmet for client-side routing.

```jsx
// Using react-helmet
import { Helmet } from 'react-helmet';

function ProductPage({ product }) {
  return (
    <>
      <Helmet>
        <title>{product.name} - Shop Name</title>
        <meta name="description" content={product.description} />

        {/* Open Graph */}
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.image} />
        <meta property="og:type" content="product" />
        <meta property="product:price:amount" content={product.price} />
        <meta property="product:price:currency" content="USD" />

        {/* Schema.org */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "image": product.image,
            "description": product.description,
            "brand": product.brand,
            "offers": {
              "@type": "Offer",
              "price": product.price,
              "priceCurrency": "USD"
            }
          })}
        </script>
      </Helmet>

      <div>{/* Product content */}</div>
    </>
  );
}

// Next.js Head component
import Head from 'next/head';

function ProductPage({ product }) {
  return (
    <>
      <Head>
        <title>{product.name} - Shop Name</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.name} />
        <link rel="canonical" href={`https://example.com/products/${product.id}`} />
      </Head>

      <div>{/* Product content */}</div>
    </>
  );
}
```

### Structured Data (Schema.org)

Help search engines understand content.

```html
<!-- Article -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "image": "https://example.com/image.jpg",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Publisher Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "2024-01-15",
  "dateModified": "2024-01-20"
}
</script>

<!-- Product -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "image": "https://example.com/product.jpg",
  "description": "Product description",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "89"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/product",
    "priceCurrency": "USD",
    "price": "29.99",
    "availability": "https://schema.org/InStock"
  }
}
</script>

<!-- Breadcrumbs -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Home",
    "item": "https://example.com"
  }, {
    "@type": "ListItem",
    "position": 2,
    "name": "Products",
    "item": "https://example.com/products"
  }, {
    "@type": "ListItem",
    "position": 3,
    "name": "Product Name"
  }]
}
</script>
```

### Sitemap

XML file listing all website pages to help search engines discover and index content efficiently.

```xml
<!-- sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/products</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

```javascript
// Dynamic sitemap generation (Next.js)
export async function getServerSideProps({ res }) {
  const products = await fetchProducts();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>https://example.com/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
      ${products.map(product => `
        <url>
          <loc>https://example.com/products/${product.id}</loc>
          <lastmod>${product.updatedAt}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `).join('')}
    </urlset>
  `;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
}
```

### Robots.txt

Plain text file instructing search engine crawlers which pages to index or avoid crawling.

```
# robots.txt
User-agent: *
Disallow: /admin/
Disallow: /api/
Allow: /api/public/

Sitemap: https://example.com/sitemap.xml
```

## Rendering for SEO

Choosing appropriate rendering strategies to ensure search engines can properly crawl and index content.

### Server-Side Rendering

Rendering pages on the server to provide complete HTML to search engine crawlers for better SEO.

```javascript
// Next.js SSR for SEO
export async function getServerSideProps({ params }) {
  const product = await fetchProduct(params.id);

  return {
    props: {
      product,
      // Generate meta tags server-side
      meta: {
        title: `${product.name} - Shop`,
        description: product.description,
        image: product.image
      }
    }
  };
}

export default function ProductPage({ product, meta }) {
  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:image" content={meta.image} />
      </Head>

      {/* Product content is in initial HTML for crawlers */}
      <div>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
      </div>
    </>
  );
}
```

### Dynamic Rendering

Detecting search engine bots and serving pre-rendered HTML while maintaining SPA for users. Serve different content to bots vs users.

```javascript
// Detect bots
function isBot(userAgent) {
  const botPattern = /bot|googlebot|crawler|spider|robot|crawling/i;
  return botPattern.test(userAgent);
}

// Express middleware
app.use((req, res, next) => {
  if (isBot(req.headers['user-agent'])) {
    // Serve pre-rendered HTML to bots
    return res.sendFile('/prerendered/' + req.path + '.html');
  }

  // Serve SPA to users
  next();
});
```

## Performance and SEO

Understanding how page performance metrics directly impact search engine rankings and visibility.

### Core Web Vitals

Google's ranking factors.

```javascript
// Measure and report Core Web Vitals
import { getCLS, getFID, getLCP } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch('/analytics', {
    method: 'POST',
    body: JSON.stringify(metric),
    keepalive: true
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);

// React hook
function useWebVitals() {
  useEffect(() => {
    getCLS(console.log);
    getFID(console.log);
    getLCP(console.log);
  }, []);
}
```

## Analytics Implementation

Integrating analytics tools to track user behavior, measure conversions, and inform data-driven decisions.

### Google Analytics 4

Latest version of Google Analytics with event-based tracking and cross-platform measurement capabilities.

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

```javascript
// React implementation
import ReactGA from 'react-ga4';

// Initialize
ReactGA.initialize('G-XXXXXXXXXX');

// Track page views
function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({ hitType: 'pageview', page: location.pathname });
  }, [location]);
}

// Track events
function ProductCard({ product }) {
  const handleAddToCart = () => {
    // Track event
    ReactGA.event({
      category: 'Ecommerce',
      action: 'Add to Cart',
      label: product.name,
      value: product.price
    });

    addToCart(product);
  };

  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}

// Track e-commerce
ReactGA.event('purchase', {
  transaction_id: 'T12345',
  value: 99.99,
  currency: 'USD',
  items: [{
    item_id: 'SKU123',
    item_name: 'Product Name',
    price: 99.99,
    quantity: 1
  }]
});
```

### Custom Analytics

Building custom analytics tracking system for complete control over data collection and privacy.

```javascript
// Custom analytics tracker
class Analytics {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.queue = [];
    this.flushInterval = 5000; // 5 seconds

    this.startAutoFlush();
  }

  track(event, properties = {}) {
    this.queue.push({
      event,
      properties,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true
    }).catch(error => {
      console.error('Analytics error:', error);
      // Re-add to queue on failure
      this.queue.unshift(...events);
    });
  }

  startAutoFlush() {
    setInterval(() => this.flush(), this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }

  pageView(page) {
    this.track('page_view', { page });
  }

  click(element, label) {
    this.track('click', {
      element,
      label,
      x: event.clientX,
      y: event.clientY
    });
  }

  error(error) {
    this.track('error', {
      message: error.message,
      stack: error.stack
    });
  }

  performance(metric) {
    this.track('performance', metric);
  }
}

// Initialize
const analytics = new Analytics('/api/analytics');

// Track page views
analytics.pageView(window.location.pathname);

// Track clicks
document.addEventListener('click', (e) => {
  if (e.target.matches('button, a')) {
    analytics.click(e.target.tagName, e.target.textContent);
  }
});

// Track errors
window.addEventListener('error', (e) => {
  analytics.error(e.error);
});

// Track performance
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];

  analytics.performance({
    metric: 'page_load',
    ttfb: perfData.responseStart - perfData.requestStart,
    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
    loadComplete: perfData.loadEventEnd - perfData.fetchStart
  });
});
```

### Event Tracking

Tracking specific user interactions and custom events for detailed behavior analysis and conversion funnels.

```javascript
// React hook for tracking
function useAnalytics() {
  const track = useCallback((event, properties) => {
    if (window.gtag) {
      window.gtag('event', event, properties);
    }
  }, []);

  return { track };
}

// Usage
function CheckoutButton({ amount }) {
  const { track } = useAnalytics();

  const handleCheckout = () => {
    track('begin_checkout', {
      currency: 'USD',
      value: amount
    });

    // Proceed with checkout
  };

  return <button onClick={handleCheckout}>Checkout</button>;
}

// HOC for tracking page views
function withPageTracking(Component) {
  return function TrackedComponent(props) {
    const location = useLocation();

    useEffect(() => {
      window.gtag?.('config', 'G-XXXXXXXXXX', {
        page_path: location.pathname
      });
    }, [location]);

    return <Component {...props} />;
  };
}
```

## Privacy and Consent

Implementing GDPR-compliant cookie consent and privacy controls for analytics tracking.

### Cookie Consent

User consent interface for cookie usage required by GDPR and privacy regulations before tracking.

```jsx
function CookieConsent() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (consent === 'true') {
      setAccepted(true);
      initializeAnalytics();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setAccepted(true);
    initializeAnalytics();
  };

  if (accepted) return null;

  return (
    <div className="cookie-consent">
      <p>We use cookies to improve your experience.</p>
      <button onClick={handleAccept}>Accept</button>
      <button onClick={() => setAccepted(true)}>Decline</button>
    </div>
  );
}

function initializeAnalytics() {
  // Initialize Google Analytics only after consent
  ReactGA.initialize('G-XXXXXXXXXX');
}
```

### GDPR Compliance

Granular cookie categorization and consent management for European privacy law compliance.

```javascript
// Cookie categorization
const cookies = {
  necessary: {
    session: { expires: '1 day', description: 'Session management' }
  },
  analytics: {
    ga: { expires: '2 years', description: 'Google Analytics' }
  },
  marketing: {
    ads: { expires: '1 year', description: 'Advertising' }
  }
};

// Granular consent
function CookieSettings() {
  const [settings, setSettings] = useState({
    necessary: true,  // Always true
    analytics: false,
    marketing: false
  });

  const handleSave = () => {
    localStorage.setItem('cookie-settings', JSON.stringify(settings));

    // Initialize only consented services
    if (settings.analytics) {
      initializeAnalytics();
    }

    if (settings.marketing) {
      initializeAds();
    }
  };

  return (
    <div>
      <h3>Cookie Settings</h3>

      <label>
        <input type="checkbox" checked disabled />
        Necessary (always on)
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.analytics}
          onChange={e => setSettings({
            ...settings,
            analytics: e.target.checked
          })}
        />
        Analytics
      </label>

      <label>
        <input
          type="checkbox"
          checked={settings.marketing}
          onChange={e => setSettings({
            ...settings,
            marketing: e.target.checked
          })}
        />
        Marketing
      </label>

      <button onClick={handleSave}>Save Settings</button>
    </div>
  );
}
```

## Interview Questions

**Q: How does SSR improve SEO compared to CSR?**

A: SSR provides:
- **Complete HTML in initial response**: Crawlers see content immediately
- **Faster First Contentful Paint**: Better user experience signal
- **Social media previews**: Proper Open Graph tags
- **Works without JavaScript**: Accessible to all crawlers

CSR requires JavaScript execution, which some crawlers don't support well.

**Q: What are Core Web Vitals and why do they matter for SEO?**

A: Google's user experience metrics used as ranking factors:
- **LCP (Largest Contentful Paint)**: < 2.5s - Loading performance
- **FID (First Input Delay)**: < 100ms - Interactivity
- **CLS (Cumulative Layout Shift)**: < 0.1 - Visual stability

Good scores improve search rankings and user experience.

**Q: How do you implement analytics without impacting performance?**

A: Strategies:
1. **Lazy load analytics**: Load after page interactive
2. **Batch events**: Send multiple events together
3. **Use sendBeacon**: Non-blocking API
4. **Defer scripts**: Use async/defer attributes
5. **Self-host when possible**: Reduce third-party impact

```javascript
// Lazy load
useEffect(() => {
  if (document.readyState === 'complete') {
    loadAnalytics();
  } else {
    window.addEventListener('load', loadAnalytics);
  }
}, []);
```

**Q: What's the difference between canonical URLs and redirects?**

A:
- **Canonical URL**: Suggests preferred URL, doesn't redirect
  ```html
  <link rel="canonical" href="https://example.com/product">
  ```
- **Redirect**: Sends user/crawler to different URL
  ```javascript
  res.redirect(301, '/new-url')
  ```

Use canonical for duplicate content, redirect for moved pages.

## Best Practices

**SEO:**
- Use semantic HTML (h1, h2, nav, article)
- Include descriptive meta tags
- Implement structured data
- Create XML sitemap
- Use SSR/SSG for public content
- Optimize images (alt text, file names)
- Mobile-friendly design
- Fast page load times

**Analytics:**
- Track meaningful events
- Respect user privacy
- Implement cookie consent
- Batch analytics calls
- Monitor Core Web Vitals
- Set up conversion funnels
- A/B test important changes

**Performance:**
- Lazy load analytics scripts
- Use sendBeacon for tracking
- Minimize third-party scripts
- Monitor Real User Monitoring (RUM)

## Summary

- SEO requires semantic HTML, meta tags, and structured data
- SSR/SSG provides better SEO than CSR
- Core Web Vitals impact both UX and search rankings
- Analytics should be privacy-conscious and performant
- Structured data helps search engines understand content
- Cookie consent is required for GDPR compliance

---
[� Back to SystemDesign](../README.md)
