---
title: Client-Side Input Handling
part: 4
chapter: 0
slug: client-side-input-handling
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-29
tags: [frontend, security, input, validation, postmessage]
in_book: true
---

# Client-Side Input Handling {#ch-client-side-input-handling}

> Know exactly which client-side checks are user experience and which ones are the only check there is.

**In this chapter:** why client validation is not security · sharing one schema across the boundary · file uploads in the browser · `postMessage` and redirect targets

## 💡 The Core Idea

Client-side validation is a user-experience feature. Anyone can open dev tools, or skip the page entirely
and call the API with `curl` — so every rule enforced only in the browser is a suggestion.

That is not the whole story, though, and treating it as the whole story is where senior candidates lose
marks. Some inputs never reach your server at all: a `postMessage` from an embedded widget, a value read
out of `location.hash`, a redirect target in a query string. Those are consumed entirely in the browser,
so the browser is the only place they can be checked. The skill is knowing which category an input is in.

## How It Works

| Input                            | Where it is consumed | Who must check it        |
| -------------------------------- | -------------------- | ------------------------ |
| Form field posted to your API    | Server               | Server (client for UX)   |
| File chosen in a file input      | Server               | Server (client for UX)   |
| `postMessage` from an iframe     | Browser              | **Browser only**         |
| `?next=` redirect parameter      | Browser or server    | Whichever performs the redirect |
| Value read from `location.hash`  | Browser              | **Browser only**         |

The first two are the familiar case. The rest are the ones that get missed, because there is no server
handler to review.

## Validation That Reaches the Server

For anything the server will act on, the client's job is feedback speed, not enforcement.

```typescript
// ❌ The mistake: the endpoint trusts that the form already checked.
app.post("/contact", (req, res) => {
  db.contacts.insert({ email: req.body.email }); // attacker posted raw JSON
});
```

The fix belongs on the server, and it is covered in
[Chapter ?? — Backend Input Validation](#ch-backend-input-validation). What belongs *here* is making sure
the two sides cannot drift apart.

**One schema, both sides.** Zod runs in the browser and in Node, so the same declaration produces the form
validation, the API validation, and the TypeScript type:

```typescript
import { z } from "zod";

export const contactSchema = z.object({
  email: z.email(),
  message: z.string().min(10).max(2000),
  budget: z.number().int().min(0).optional(),
});

export type Contact = z.infer<typeof contactSchema>;
```

```typescript
// Browser — instant feedback, wired into the form library.
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm<Contact>({ resolver: zodResolver(contactSchema) });
```

```typescript
// Server — the same schema, this time as the actual gate.
const parsed = contactSchema.safeParse(req.body);
if (!parsed.success) {
  res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  return;
}
```

Shipping one schema removes the failure mode where the form allows 500 characters and the API allows 200,
and a user loses their draft to a `400` the UI never predicted.

> ⚠️ **Sharing a schema is not sharing a check.** The server still runs `safeParse` on every request. The
> shared file removes drift; it does not remove the server's obligation.

## File Uploads in the Browser

Client-side file checks are worth doing — they stop a user waiting two minutes to upload a 400 MB video
that the API will reject — as long as nobody mistakes them for a control.

```typescript
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

function checkBeforeUpload(file: File): string | null {
  if (file.size > MAX_BYTES) return "Files must be under 5 MB.";
  if (!ACCEPTED.has(file.type)) return "Upload a PNG, JPEG or WebP image.";
  return null;
}
```

`file.type` comes from the operating system's guess at the extension, and the request is trivially
replayed without it. The server still has to check the real size, read the magic bytes, generate its own
filename, and serve the result from a path that cannot execute anything.

**Previewing an upload safely:**

```typescript
const url: string = URL.createObjectURL(file);
imgElement.src = url;
// Release it once the image has loaded, or the blob leaks for the page's lifetime.
imgElement.onload = () => URL.revokeObjectURL(url);
```

Render an untrusted upload with `<img>`, never by reading it as text and inserting it into the DOM. An
SVG is a document that can carry script, so treat SVG uploads as HTML: sanitise them, or serve them from a
separate origin.

## Messages and Redirect Targets

These are the browser-only inputs, and both have the same shape: a value arrives, and the code trusts it
because it looks like it came from inside.

**`postMessage` needs two checks, and most code has neither:**

```typescript
window.addEventListener("message", (event: MessageEvent) => {
  // 1. Who sent it? Any page that has a handle to this window can post.
  if (event.origin !== "https://widgets.example.com") return;

  // 2. Is it the shape you expect? The sender is not your code.
  const parsed = widgetMessageSchema.safeParse(event.data);
  if (!parsed.success) return;

  applyWidgetUpdate(parsed.data);
});
```

Checking `event.origin` against an exact string is the whole defence. `event.origin.includes("example.com")`
passes for `example.com.attacker.net`. And when you send, name the target origin — `postMessage(data, "*")`
broadcasts to whatever page currently occupies that frame.

**Redirect targets are attacker-supplied strings.** A `?next=` parameter that goes straight into
`location.href` is an open redirect: it lends your domain's credibility to a phishing page, and it
survives most link-preview checks because the first hop really is your site.

```typescript
// ❌ Any absolute URL is accepted, including javascript: and other origins.
location.href = new URLSearchParams(location.search).get("next") ?? "/";

// ✅ Accept a path, not a URL — and resolve it against your own origin.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
```

`//evil.com` is a protocol-relative URL, which is why the second condition is there. If you genuinely need
to allow other origins, hold an explicit allowlist of hostnames — never a substring test.

## Common Mistakes

❌ **Disabling the submit button as the validation.** The request can be sent without the button.
✅ Treat the disabled state as feedback and validate the payload on the server.

❌ **`dangerouslySetInnerHTML` on anything the user or an embedded widget supplied.**
✅ Render as text, or sanitise first — see [Chapter ?? — XSS Prevention](#ch-xss-prevention).

❌ **Trusting `event.data` because the iframe is yours.** Anyone can open your page in a frame they
control and post to it.
✅ Check the origin, then parse the payload against a schema.

❌ **Reading a value out of `location.hash` and putting it in the DOM.** This is the DOM-based XSS sink
that no server log will ever show you.
✅ Parse the fragment, allowlist the values you accept, and render as text.

## 🔑 Key Takeaways

- Client-side validation is user experience; the server check is the control, and both should come from one shared schema so they cannot drift.
- Some inputs never reach the server — `postMessage`, URL fragments, redirect parameters — and for those the browser is the only place a check can happen.
- `file.type` and `file.size` in the browser save the user a wasted upload; the server still verifies size, magic bytes, filename and storage path.
- A `postMessage` handler needs an exact origin comparison and a schema check on the payload; substring matching on the origin is not a check.
- Accept a path rather than a URL for redirect targets, and reject `//` as well as absolute URLs.

## Interview Questions

**Q: If client-side validation gives no security, why write it at all?**

Because it is a different job. It turns a round trip and a `400` into instant feedback, and it keeps
obviously malformed requests off the network. The mistake is not writing it — the mistake is letting it be
the only place a rule exists. Sharing one schema between the form and the endpoint gives both properties
without duplicating the rules.

**Q: A colleague adds a `postMessage` listener for an analytics widget. What do you check in review?**

Two things. Whether the handler compares `event.origin` to an exact expected origin before touching
`event.data`, and whether the payload is parsed against a schema rather than destructured. I would also
check the sending side for `postMessage(data, "*")`, which broadcasts the message to whatever page happens
to occupy the frame.

**Q: What is an open redirect and why does it matter if the destination is the attacker's own site?**

It matters precisely because the destination is theirs. The link the victim sees and hovers is your
domain, so it inherits your reputation and passes filters that check the first hop. Accepting only paths
beginning with a single `/`, and resolving them against your own origin, closes it.

**Q: When would you accept a file upload check in the browser as sufficient?**

Never, for anything security-relevant. The browser check exists so the user finds out about a 400 MB file
before uploading it. `file.type` is derived from the extension and the request can be replayed without the
page, so size, content type and filename all get re-established on the server.

## What to Read Next

- [Chapter ?? — XSS Prevention](#ch-xss-prevention) — where an unchecked browser input usually ends up
- [Chapter ?? — Backend Input Validation](#ch-backend-input-validation) — the server half of the shared schema
- [Chapter ?? — Content Security Policy](#ch-content-security-policy) — the backstop when one of these checks is missed
