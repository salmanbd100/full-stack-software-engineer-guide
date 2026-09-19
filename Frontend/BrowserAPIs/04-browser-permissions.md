---
title: Browser Permissions
part: 2
chapter: 8
slug: browser-permissions
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [frontend, browser, apis, permissions]
in_book: true
---

# Browser Permissions {#ch-browser-permissions}

> Ask for a permission at a moment the user understands, because a denial is usually permanent.

**In this chapter:** the Permissions API · the three states · geolocation · notifications · camera and microphone · asking at the right time

## 💡 The Core Idea

A permission prompt is a question you get to ask **once**. The browser records the answer per origin,
and a denial is sticky — there is no API that re-opens the dialog, and the only route back is the user
changing a setting they will never look for. That turns *when* you ask into a design decision with a
permanent consequence, which is why this chapter is mostly about timing rather than about API calls.

Four rules follow from it. Most permissions need a secure context — HTTPS or `localhost`. Some need a
user gesture, so they cannot fire on page load at all. The user can revoke at any time from browser
settings, so `denied` is a state the code has to render, not an error. And permissions are scoped to an
origin — scheme, host and port — so `https://app.example.com` and `https://example.com` are strangers.

> ⚠️ **Moving target:** the set of names `navigator.permissions.query` accepts differs per browser and
> grows every year, and browsers keep tightening when a prompt may appear at all — quieter notification
> UI, gesture requirements, one-time grants that expire when the tab closes. The durable principle is
> that a denial is sticky and only the user can undo it, so *when* you ask is a design decision, not a
> code detail.

## How It Works

### Checking without asking

`navigator.permissions.query` reports state without showing a dialog.

```typescript
type State = "granted" | "denied" | "prompt";

async function checkCamera(): Promise<State> {
  const status = await navigator.permissions.query({ name: "camera" as PermissionName });
  return status.state;
}
```

Listen for changes — the user revokes from settings, or another tab grants:

```typescript
const status = await navigator.permissions.query({ name: "geolocation" });
status.addEventListener("change", () => {
  console.log("State changed to:", status.state);
});
```

> The Permissions API **does not request** the permission — it only reports state. To request, you call the feature's own API — `getUserMedia`, `Notification.requestPermission`.

### The three states

| State | What It Means | What to Do |
|-------|---------------|------------|
| `granted` | User already said yes | Use the feature |
| `denied` | User said no (or browser blocks it) | Show a "how to re-enable in settings" hint — you cannot re-prompt |
| `prompt` | Not asked yet | Trigger a request after a user gesture |

> Once a user picks **denied**, the browser will not show your prompt again. The only way back is a settings change by the user.

### Geolocation

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

### Notifications

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

### Camera and microphone

Camera and microphone come from `getUserMedia`, and the call itself **is** the prompt.

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

### Clipboard

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

## When to Use It

A prompt at the wrong moment is a denial, and a denial is permanent. Progressive disclosure is the
pattern that fixes it.

1. **Never on load.** Wait until the user clicks the feature — "Find places near me".
2. **Explain in your own interface first.** A one-line panel saying why location is needed — "Location
   is used to show nearby stores" — and then the native prompt.
3. **Check state before trying.** If the answer is already `denied`, show recovery instructions rather
   than a call that does nothing.
4. **Degrade to a manual input.** A postcode field or a file picker is what the feature falls back to,
   and it has to be good enough to use.

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

## Common Mistakes

**❌ Asking for everything on page load.** Three prompts before the user has seen the page means three
denials, and every one of them is permanent.

```typescript
// ❌ Triggers three prompts on page load — most users deny all three
Notification.requestPermission();
navigator.geolocation.getCurrentPosition((pos: GeolocationPosition) => showNearby(pos.coords));
navigator.mediaDevices.getUserMedia({ video: true });
```

**❌ Treating `denied` as an error.** It is a state with its own interface: an explanation, a route
into browser settings, and the manual fallback.

**❌ Hiding the `<video>` element instead of stopping the tracks.** The camera stays on, the hardware
indicator stays lit, and the device stays locked from other applications.

**❌ Prompting outside a user gesture.** Safari and Firefox refuse to show the dialog at all, so the
call looks like a silent failure rather than a rejection.

**❌ Requesting more than the feature needs.** `{ video: true, audio: true }` for a feature that only
records audio doubles what the user is being asked to trust you with.

## 🔑 Key Takeaways

- A permission is asked once per origin, and a denial cannot be re-prompted from code — only the user
  can undo it from browser settings.
- `navigator.permissions.query` reports state without prompting; the feature's own API is what asks.
- Ask on a user action, after your own interface has explained why, never on page load.
- `denied` is a state to design for, with recovery instructions and a manual fallback.
- Call `stop()` on every track when you are finished, or the camera indicator stays on.

## Interview Questions

**Q: How is the Permissions API different from calling the feature directly?**

`navigator.permissions.query` **checks** state — `granted`, `denied`, or `prompt` — without showing a dialog. The actual request happens through the feature API (`getUserMedia`, `Notification.requestPermission`, `getCurrentPosition`). Use the Permissions API to decide whether to even attempt the call, or to show recovery UI when the answer is already `denied`.

**Q: Why might `Notification.requestPermission()` not show a prompt?**

Three common reasons: (1) not called from a user gesture (Safari/Firefox enforce this), (2) the user has already denied it — the browser remembers and won't re-prompt, (3) you're not in a secure context (no HTTPS). Always check `Notification.permission` first and gate on a click.

**Q: How would you build a "Find restaurants near me" button?**

On click: query the geolocation permission state. If `denied`, show a "fix in settings" hint and a zip-code input as fallback. Otherwise call `getCurrentPosition` with a timeout and `enableHighAccuracy: false` (faster, less battery). Handle the error path the same as `denied`. Cache the last fix for a minute with `maximumAge`.

**Q: How do you make sure the camera indicator turns off?**

Call `stop()` on every track in the `MediaStream` (`stream.getTracks().forEach(t => t.stop())`). If you only hide the `<video>` element, the camera stays on and the browser indicator keeps shining. Clean up in your `useEffect` return or component unmount.

**Q: A user denied notifications. How do you re-prompt?**

You can't — once denied, the browser won't show your prompt again. You can only show **in-page instructions** telling the user how to re-enable it from the browser's site settings (click the lock icon, find Notifications, switch back to Ask/Allow). Re-checking via the Permissions API will reflect the new state automatically.

**Q: Which permissions are the risky ones, from a privacy standpoint?**

Geolocation, camera, microphone, clipboard read, and persistent background features (Push, Background Sync). They expose either who/where the user is, or sensitive content. Best practice: minimum scope — `audio: true` only, never both unless needed, explain why before prompting, and stop tracks/release handles immediately after use.

## What to Read Next

- [Chapter ?? — Install and Push](#ch-install-and-push) — the notification permission in the context
  that actually needs it
- [Chapter ?? — Accessible Forms and Error Messaging](#ch-accessible-forms) — the other place a
  fallback input has to be good enough to use
- [Chapter ?? — Client-Side Input Handling](#ch-client-side-input-handling) — what to do with the data
  the browser hands back
