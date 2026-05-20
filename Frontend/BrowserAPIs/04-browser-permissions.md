# Browser Permissions

## Table of Contents
- [What Permissions Are](#what-permissions-are)
- [The Permissions API](#the-permissions-api)
- [Permission States](#permission-states)
- [Geolocation](#geolocation)
- [Notifications](#notifications)
- [Camera & Microphone](#camera--microphone)
- [Clipboard](#clipboard)
- [Design: Asking the Right Way](#design-asking-the-right-way)
- [Interview Questions](#interview-questions)

---

## What Permissions Are

Sensitive browser features (location, camera, mic, notifications, clipboard, sensors) sit behind a **permission prompt**. The browser asks the user once, then remembers the answer **per origin**.

**Key rules to know:**

- Most permissions require a **secure context** (HTTPS, or `localhost`).
- Some require a **user gesture** (click, key press) to even prompt — you can't trigger them on page load.
- The user can revoke any permission from browser settings. Your code must handle "denied" gracefully.
- Permissions are **per origin** (scheme + host + port). `https://app.example.com` and `https://example.com` are different.

---

## The Permissions API

`navigator.permissions.query` lets you **check** state without prompting:

```typescript
type State = "granted" | "denied" | "prompt";

async function checkCamera(): Promise<State> {
  const status = await navigator.permissions.query({ name: "camera" as PermissionName });
  return status.state;
}
```

Listen for changes (user revokes from settings, another tab grants):

```typescript
const status = await navigator.permissions.query({ name: "geolocation" });
status.addEventListener("change", () => {
  console.log("State changed to:", status.state);
});
```

> The Permissions API **does not request** the permission — it only reports state. To request, you call the feature's own API (e.g. `getUserMedia`, `Notification.requestPermission`).

---

## Permission States

| State | What It Means | What to Do |
|-------|---------------|------------|
| `granted` | User already said yes | Use the feature |
| `denied` | User said no (or browser blocks it) | Show a "how to re-enable in settings" hint — you cannot re-prompt |
| `prompt` | Not asked yet | Trigger a request after a user gesture |

> Once a user picks **denied**, the browser will not show your prompt again. The only way back is a settings change by the user.

---

## Geolocation

```typescript
function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000, // OK to reuse a 1-min-old fix
    });
  });
}

try {
  const pos = await getPosition();
  console.log(pos.coords.latitude, pos.coords.longitude);
} catch (err) {
  if (err instanceof GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) showFallbackUI();
  }
}
```

**For continuous tracking**, use `watchPosition` and remember to call `clearWatch` on unmount.

---

## Notifications

```typescript
async function enableNotifications(): Promise<boolean> {
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

function notify(title: string, body: string): void {
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/icon.png" });
}
```

> ⚠️ Many browsers (Safari, Firefox) only let you call `requestPermission` from a user gesture. Don't prompt on page load — it tanks the grant rate and ships you straight to `denied`.

**For background pushes** (delivered when the tab is closed), you need a **Service Worker + Push API**, not just the Notifications API.

---

## Camera & Microphone

Camera and mic come from `getUserMedia`. The call itself **is** the prompt:

```typescript
async function startCamera(videoEl: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 } },
    audio: true,
  });
  videoEl.srcObject = stream;
  return stream;
}

function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop()); // Releases the camera light
}
```

**Common errors from `getUserMedia`:**

| Error name | Meaning |
|------------|---------|
| `NotAllowedError` | User denied, or origin not allowed |
| `NotFoundError` | No camera/mic available |
| `NotReadableError` | Device in use by another app |
| `OverconstrainedError` | No device matches the requested constraints |

> Always call `track.stop()` when you're done. Otherwise the browser keeps the indicator on and the device locked from other apps.

---

## Clipboard

```typescript
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function readText(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}
```

**What to know:**

- **Writing** the clipboard usually works inside a user gesture without a prompt.
- **Reading** the clipboard almost always shows a prompt — browsers treat it as sensitive.
- Older browsers / iframes may need the legacy `document.execCommand("copy")` fallback.

---

## Design: Asking the Right Way

A permission prompt at the wrong moment is a denial. Use **progressive disclosure**:

1. **Don't ask on load.** Wait until the user clicks the feature ("Find places near me").
2. **Pre-explain in your UI.** Show a small modal: "We use location to show nearby stores." Then trigger the native prompt.
3. **Check state first.** If `denied`, don't try — show recovery instructions instead.
4. **Degrade gracefully.** Default to a manual input (zip code, file upload) when permission is missing.

```typescript
async function tryUseLocation(): Promise<void> {
  const status = await navigator.permissions.query({ name: "geolocation" });

  if (status.state === "denied") {
    showSettingsHint();   // "Click the lock icon → reset location"
    return;
  }

  // 'granted' or 'prompt' — call the feature
  const pos = await getPosition();
  showNearby(pos.coords);
}
```

**Bad pattern — asking everything upfront:**

```typescript
// ❌ Triggers three prompts on page load — most users deny all three
Notification.requestPermission();
navigator.geolocation.getCurrentPosition(...);
navigator.mediaDevices.getUserMedia({ video: true });
```

---

## Interview Questions

### Q: How is the Permissions API different from calling the feature directly?

`navigator.permissions.query` **checks** state — `granted`, `denied`, or `prompt` — without showing a dialog. The actual request happens through the feature API (`getUserMedia`, `Notification.requestPermission`, `getCurrentPosition`). Use the Permissions API to decide whether to even attempt the call, or to show recovery UI when the answer is already `denied`.

### Q: Why might `Notification.requestPermission()` not show a prompt?

Three common reasons: (1) not called from a user gesture (Safari/Firefox enforce this), (2) the user has already denied it — the browser remembers and won't re-prompt, (3) you're not in a secure context (no HTTPS). Always check `Notification.permission` first and gate on a click.

### Q: How would you build a "Find restaurants near me" button?

On click: query the geolocation permission state. If `denied`, show a "fix in settings" hint and a zip-code input as fallback. Otherwise call `getCurrentPosition` with a timeout and `enableHighAccuracy: false` (faster, less battery). Handle the error path the same as `denied`. Cache the last fix for a minute with `maximumAge`.

### Q: How do you make sure the camera indicator turns off?

Call `stop()` on every track in the `MediaStream` (`stream.getTracks().forEach(t => t.stop())`). If you only hide the `<video>` element, the camera stays on and the browser indicator keeps shining. Clean up in your `useEffect` return or component unmount.

### Q: A user denied notifications. How do you re-prompt?

You can't — once denied, the browser won't show your prompt again. You can only show **in-page instructions** telling the user how to re-enable it from the browser's site settings (click the lock icon, find Notifications, switch back to Ask/Allow). Re-checking via the Permissions API will reflect the new state automatically.

### Q: Which permissions are dangerous from a privacy standpoint?

Geolocation, camera, microphone, clipboard read, and persistent background features (Push, Background Sync). They expose either who/where the user is, or sensitive content. Best practice: minimum scope (e.g. `audio: true` only, never both unless needed), explain why before prompting, and stop tracks/release handles immediately after use.

---

[← Previous: IndexedDB](./03-indexeddb.md) | [Back to Browser APIs →](./README.md)
