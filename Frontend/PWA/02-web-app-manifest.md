# Web App Manifest

## Overview

The Web App Manifest is a JSON file that describes how your PWA should behave when installed on a user's device. It defines the app's name, icons, display mode, theme colors, and more - making your PWA installable and discoverable.

---

## Table of Contents

- [What is a Web App Manifest](#what-is-a-web-app-manifest)
- [Linking the Manifest](#linking-the-manifest)
- [Core Properties](#core-properties)
- [Display Modes](#display-modes)
- [Icon Configuration](#icon-configuration)
- [Installation Criteria](#installation-criteria)
- [iOS Support](#ios-support)
- [Validation](#validation)
- [Interview Questions](#interview-questions)

---

## What is a Web App Manifest

### 💡 **Definition**

A JSON file that tells the browser how to display and behave when your PWA is installed on a device.

**Key Insight:**
> The manifest is required for PWA installability. Without it, users cannot add your app to their home screen.

---

### 💡 **Why It Matters**

| Benefit | Description |
|---------|-------------|
| **Installability** | Required for install prompt to appear |
| **Branding** | Custom icon, name, and splash screen |
| **Display Control** | Standalone, fullscreen, or minimal UI |
| **Discoverability** | Better indexing by search engines |
| **App-Like Experience** | Native feel when launched |

---

## Linking the Manifest

### 💡 **HTML Link**

```html
<head>
  <link rel="manifest" href="/manifest.json">
</head>
```

---

### 💡 **File Location Options**

| Location | Description |
|----------|-------------|
| `/manifest.json` | Most common, root level |
| `/public/manifest.json` | Create React App default |
| `/static/manifest.json` | Static assets folder |

---

### 💡 **CORS and MIME Type**

```javascript
// Server configuration (Express)
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile('manifest.json');
});
```

---

## Core Properties

### 💡 **Essential Properties**

| Property | Purpose | Required |
|----------|---------|----------|
| `name` | Full app name (install prompts) | Yes |
| `short_name` | Home screen label (12 chars max) | Yes |
| `start_url` | URL when app launches | Yes |
| `display` | How app appears | Yes |
| `icons` | App icons (192x192 minimum) | Yes |
| `theme_color` | Browser UI color | Recommended |
| `background_color` | Splash screen color | Recommended |

---

### 💡 **Minimal Valid Manifest**

```json
{
  "name": "My PWA",
  "short_name": "PWA",
  "start_url": "/",
  "display": "standalone",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

### 💡 **Complete Manifest**

```json
{
  "name": "My Awesome Application",
  "short_name": "MyApp",
  "description": "A PWA that does awesome things",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#3367D6",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### 💡 **Property Details**

| Property | Description | Example |
|----------|-------------|---------|
| `name` | Full name (up to 45 chars) | `"My Awesome App"` |
| `short_name` | Home screen (12 chars) | `"MyApp"` |
| `description` | App purpose (50-100 chars) | `"A todo app"` |
| `start_url` | Launch URL | `"/"` or `"/app"` |
| `scope` | URLs in PWA | `"/"` or `"/app/"` |
| `display` | Display mode | `"standalone"` |
| `orientation` | Screen orientation | `"portrait-primary"` |
| `theme_color` | Browser UI color | `"#3367D6"` |
| `background_color` | Splash screen color | `"#FFFFFF"` |

---

### 💡 **theme_color vs background_color**

| Property | When Shown | Purpose |
|----------|------------|---------|
| `theme_color` | During use | Colors browser address bar |
| `background_color` | During load | Splash screen background |

**Flow:**

```
User taps icon
    ↓
Splash screen (background_color)
    ↓
App loads
    ↓
App running (theme_color visible in address bar)
```

---

## Display Modes

### 💡 **Mode Comparison**

| Mode | Browser UI | Use Case |
|------|------------|----------|
| `fullscreen` | None | Games, immersive apps |
| `standalone` | Minimal | Most PWAs (recommended) |
| `minimal-ui` | Back/forward buttons | Hybrid experience |
| `browser` | Full | Standard web page |

---

### 💡 **Display Mode Selection**

| Question | If Yes | If No |
|----------|--------|-------|
| Need entire screen? | `fullscreen` | `standalone` |
| Want app-like feel? | `standalone` | `minimal-ui` |
| Need navigation controls? | `minimal-ui` | `standalone` |

**Recommendation:** Use `standalone` for most PWAs.

---

### 💡 **Display Mode Examples**

**Fullscreen:**

```json
{ "display": "fullscreen" }
```

- Entire screen, no system UI
- User cannot see address bar
- Best for games

**Standalone:**

```json
{ "display": "standalone" }
```

- App-like appearance
- No address bar
- System back gestures work

**Minimal-UI:**

```json
{ "display": "minimal-ui" }
```

- Minimal navigation controls
- Limited browser support

---

## Icon Configuration

### 💡 **Required Sizes**

| Size | Purpose | Required |
|------|---------|----------|
| 192x192 | Installation minimum | Yes |
| 512x512 | Splash screens | Recommended |
| 180x180 | iOS home screen | For iOS |

---

### 💡 **Icon Properties**

| Property | Description | Example |
|----------|-------------|---------|
| `src` | Path to icon | `"/icon-192.png"` |
| `sizes` | Dimensions | `"192x192"` |
| `type` | MIME type | `"image/png"` |
| `purpose` | Usage type | `"any"`, `"maskable"` |

---

### 💡 **Icon Purpose Values**

| Purpose | Description | When to Use |
|---------|-------------|-------------|
| `any` | Standard icon | Default, all uses |
| `maskable` | Adaptive icon with safe zone | Android adaptive icons |
| `badge` | Monochrome notification icon | Notifications |

---

### 💡 **Maskable Icons**

Maskable icons have a "safe zone" (center 40%) where important content must fit.

```json
{
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

**Key Insight:**
> Include both `any` and `maskable` icons for best Android experience. Maskable icons ensure your logo isn't cropped on devices with different icon shapes.

---

### 💡 **Recommended Icon Set**

```json
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-192-maskable.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
```

---

## Installation Criteria

### 💡 **Requirements for Install Prompt**

| Requirement | Description |
|-------------|-------------|
| **Manifest** | Valid manifest with required properties |
| **HTTPS** | Served over HTTPS (localhost exempt) |
| **Service Worker** | Registered with fetch handler |
| **Icons** | At least 192x192 PNG icon |
| **Engagement** | User interaction with site |

---

### 💡 **Checking Installability**

```javascript
// Check if installable
async function checkInstallability() {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  const manifest = await fetch(manifestLink.href).then(r => r.json());
  const swReg = await navigator.serviceWorker.getRegistration();

  console.log('Has manifest:', !!manifestLink);
  console.log('Has name:', !!manifest.name);
  console.log('Has icons:', !!manifest.icons?.length);
  console.log('Has SW:', !!swReg);
  console.log('Is HTTPS:', location.protocol === 'https:');
}
```

---

### 💡 **Handling Install Prompt**

```javascript
let deferredPrompt;

// Capture the prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

// Trigger installation
async function installApp() {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install outcome:', outcome);
  deferredPrompt = null;
}

// Detect installation
window.addEventListener('appinstalled', () => {
  console.log('PWA installed!');
  hideInstallButton();
});
```

---

## iOS Support

### 💡 **iOS Limitations**

| Feature | iOS Support |
|---------|-------------|
| Manifest | Partial (ignored in some cases) |
| Install prompt | No (manual Add to Home Screen) |
| Push notifications | No |
| Background sync | No |
| Service Worker | Yes (Safari 16+) |

---

### 💡 **iOS Meta Tags**

```html
<head>
  <!-- Standard manifest -->
  <link rel="manifest" href="/manifest.json">

  <!-- iOS fallbacks -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="MyApp">

  <!-- iOS icon (180x180) -->
  <link rel="apple-touch-icon" href="/icon-180.png">

  <!-- Optional: splash screen -->
  <link rel="apple-touch-startup-image" href="/splash.png">
</head>
```

---

### 💡 **Complete iOS Setup**

```html
<head>
  <!-- Manifest for Chrome, Firefox, Edge -->
  <link rel="manifest" href="/manifest.json">

  <!-- iOS specific -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="MyApp">

  <!-- iOS icons for different devices -->
  <link rel="apple-touch-icon" href="/icon-180.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png">
  <link rel="apple-touch-icon" sizes="120x120" href="/icon-120.png">

  <!-- Theme color for all browsers -->
  <meta name="theme-color" content="#3367D6">
</head>
```

**Key Insight:**
> Always include both manifest and iOS meta tags for maximum compatibility.

---

## Validation

### 💡 **Validation Methods**

| Method | How |
|--------|-----|
| **Lighthouse** | DevTools → Lighthouse → PWA Audit |
| **DevTools** | Application → Manifest |
| **PWA Builder** | pwabuilder.com |
| **Manual** | Check required properties |

---

### 💡 **Common Validation Errors**

| Error | Fix |
|-------|-----|
| Missing name | Add `name` property |
| Missing icons | Add 192x192 icon |
| Invalid start_url | Ensure URL exists |
| No Service Worker | Register SW |
| Not HTTPS | Deploy to HTTPS |

---

### 💡 **Validation Script**

```javascript
async function validateManifest() {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return console.error('No manifest link');

  const manifest = await fetch(link.href).then(r => r.json());

  const checks = {
    name: !!manifest.name,
    short_name: !!manifest.short_name,
    start_url: !!manifest.start_url,
    display: !!manifest.display,
    icon_192: manifest.icons?.some(i => i.sizes?.includes('192')),
    icon_512: manifest.icons?.some(i => i.sizes?.includes('512')),
    theme_color: !!manifest.theme_color,
    background_color: !!manifest.background_color
  };

  console.table(checks);
}
```

---

## Interview Questions

### 💡 **Question 1: What is a Web App Manifest?**

**Answer:**

A JSON file that defines how a PWA behaves when installed.

| Purpose | Description |
|---------|-------------|
| Installation | Required for install prompt |
| Metadata | App name, description, icons |
| Display | How app appears (standalone, fullscreen) |
| Branding | Colors, splash screen |
| Discoverability | Search engine indexing |

---

### 💡 **Question 2: What properties are required for installation?**

**Answer:**

| Property | Requirement |
|----------|-------------|
| `name` or `short_name` | At least one |
| `start_url` | Required |
| `display` | Required |
| `icons` | 192x192 minimum |
| Service Worker | Registered |
| HTTPS | Required |

```json
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }]
}
```

---

### 💡 **Question 3: Explain display modes**

**Answer:**

| Mode | Description | Best For |
|------|-------------|----------|
| `fullscreen` | No UI, entire screen | Games |
| `standalone` | App-like, no address bar | Most PWAs |
| `minimal-ui` | Minimal navigation controls | Hybrid |
| `browser` | Full browser UI | Fallback |

**Recommendation:** Use `standalone` for most applications.

---

### 💡 **Question 4: How do you support iOS?**

**Answer:**

iOS has limited manifest support. Use meta tags as fallback:

```html
<!-- Manifest for other browsers -->
<link rel="manifest" href="/manifest.json">

<!-- iOS fallbacks -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="MyApp">
<link rel="apple-touch-icon" href="/icon-180.png">
```

| iOS Limitation | Workaround |
|----------------|------------|
| No install prompt | User manually adds to home screen |
| Manifest ignored | Use meta tags |
| No push notifications | None (unsupported) |

---

### 💡 **Question 5: What is a maskable icon?**

**Answer:**

An icon designed with a "safe zone" (center 40%) for Android adaptive icons.

| Icon Type | Description |
|-----------|-------------|
| `any` | Standard icon, used everywhere |
| `maskable` | Safe zone design, Android adaptive |

```json
{
  "icons": [
    { "src": "/icon.png", "sizes": "192x192", "purpose": "any" },
    { "src": "/icon-maskable.png", "sizes": "192x192", "purpose": "maskable" }
  ]
}
```

**Why needed:** Android devices may display icons as circles, squares, or rounded shapes. Maskable ensures important content isn't cropped.

---

### 💡 **Question 6: Difference between start_url and scope?**

**Answer:**

| Property | Purpose | Example |
|----------|---------|---------|
| `start_url` | Launch URL | `/app/home` |
| `scope` | URLs in PWA | `/app/` |

- `start_url`: Single URL opened when app launches
- `scope`: Directory of URLs controlled by PWA

```json
{
  "start_url": "/app/todos",
  "scope": "/app/"
}
```

URLs outside scope open in regular browser.

---

### 💡 **Question 7: Difference between theme_color and background_color?**

**Answer:**

| Property | When Visible | Purpose |
|----------|--------------|---------|
| `theme_color` | During use | Browser UI (address bar) |
| `background_color` | During load | Splash screen |

```json
{
  "theme_color": "#1976D2",
  "background_color": "#FFFFFF"
}
```

**Flow:** Splash (background_color) → App loads → Running (theme_color)

---

### 💡 **Question 8: How to validate a manifest?**

**Answer:**

| Tool | Location |
|------|----------|
| Lighthouse | DevTools → Lighthouse → PWA |
| DevTools | Application → Manifest |
| PWA Builder | pwabuilder.com |
| web.dev | web.dev/measure |

**Manual check:**

```javascript
const manifest = await fetch('/manifest.json').then(r => r.json());
console.log('name:', !!manifest.name);
console.log('icons:', !!manifest.icons?.length);
console.log('start_url:', !!manifest.start_url);
```

---

### 💡 **Question 9: How to handle install prompt?**

**Answer:**

```javascript
let deferredPrompt;

// Capture prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

// Show prompt on button click
installButton.addEventListener('click', async () => {
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
});

// Detect installation
window.addEventListener('appinstalled', () => {
  hideInstallButton();
});
```

---

### 💡 **Question 10: Best practices for manifest?**

**Answer:**

| Do | Don't |
|----|-------|
| Include both 192x192 and 512x512 icons | Use only one icon size |
| Add maskable icons for Android | Forget iOS meta tags |
| Use relative URLs | Hardcode absolute URLs |
| Match theme_color to app design | Ignore color properties |
| Keep short_name under 12 chars | Use very long names |
| Include iOS meta tag fallbacks | Rely only on manifest |

---

## Summary

### 💡 **Key Takeaways**

| Concept | Summary |
|---------|---------|
| **Purpose** | Define PWA metadata and behavior |
| **Required** | name, start_url, display, icons |
| **Display Modes** | standalone (recommended), fullscreen, minimal-ui |
| **Icons** | 192x192 minimum, maskable for Android |
| **iOS** | Use meta tags as fallback |
| **Validation** | Lighthouse, DevTools, PWA Builder |

**Key Insight:**
> Manifest + Service Worker + HTTPS = Installable PWA

---

## Navigation

**Previous:** [01 - Service Workers](./01-service-workers.md)

**Next:** [03 - Offline Patterns](./03-offline-patterns.md)

---

[Back to PWA](./README.md) | [Back to Frontend](../README.md)
