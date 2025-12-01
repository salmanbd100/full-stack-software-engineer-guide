# Request & Response Objects

## Overview

The request (req) and response (res) objects are central to handling HTTP communication in Express. Understanding these objects and their methods is essential for building APIs and web applications.

## Request Object (req)

### What is the Request Object?

The `req` object represents the HTTP request and contains properties for the request query string, parameters, body, HTTP headers, and more.

### Common Request Properties

```javascript
app.get('/api/users/:id', (req, res) => {
  // Route parameters
  console.log(req.params);        // { id: '123' }

  // Query string
  console.log(req.query);         // { page: '1', limit: '10' }

  // Request body
  console.log(req.body);          // { name: 'John', email: 'john@example.com' }

  // HTTP headers
  console.log(req.headers);       // { authorization: 'Bearer token', ... }

  // Request method
  console.log(req.method);        // 'GET'

  // Request URL
  console.log(req.url);           // '/api/users/123?page=1'

  // Full request path
  console.log(req.path);          // '/api/users/123'

  // Base URL
  console.log(req.baseUrl);       // '/api'

  // Original URL
  console.log(req.originalUrl);   // '/api/users/123?page=1'

  // Protocol
  console.log(req.protocol);      // 'http' or 'https'

  // Hostname
  console.log(req.hostname);      // 'example.com'

  // IP address
  console.log(req.ip);            // '127.0.0.1'

  // Cookies
  console.log(req.cookies);       // { sessionId: 'abc123' }

  // Signed cookies
  console.log(req.signedCookies); // { userId: '456' }
});
```

### Request Properties

**1. req.params**
```javascript
// Route: /users/:userId/posts/:postId
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  res.json({ userId, postId });
});

// GET /users/123/posts/456
// Output: { userId: '123', postId: '456' }
```

**2. req.query**
```javascript
// URL: /search?q=javascript&page=2&sort=desc
app.get('/search', (req, res) => {
  const { q, page = 1, sort = 'asc' } = req.query;

  res.json({
    query: q,
    page: parseInt(page),
    sort
  });
});
```

**3. req.body**
```javascript
// Requires body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/users', (req, res) => {
  const { name, email, password } = req.body;

  // Create user
  res.status(201).json({
    message: 'User created',
    user: { name, email }
  });
});
```

**4. req.headers**
```javascript
app.get('/api/data', (req, res) => {
  // Get specific header
  const token = req.headers.authorization;
  const contentType = req.headers['content-type'];
  const userAgent = req.headers['user-agent'];

  res.json({
    token,
    contentType,
    userAgent
  });
});

// Using req.get() for headers
app.get('/api/info', (req, res) => {
  const auth = req.get('Authorization');
  const host = req.get('Host');

  res.json({ auth, host });
});
```

**5. req.cookies**
```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser('secret-key'));

app.get('/profile', (req, res) => {
  const sessionId = req.cookies.sessionId;
  const userId = req.signedCookies.userId;

  res.json({ sessionId, userId });
});
```

### Request Methods

**1. req.get(header)**
```javascript
app.get('/api/data', (req, res) => {
  const contentType = req.get('Content-Type');
  const accept = req.get('Accept');

  res.json({ contentType, accept });
});
```

**2. req.is(type)**
```javascript
app.post('/api/data', (req, res) => {
  if (req.is('application/json')) {
    // Handle JSON
  } else if (req.is('application/xml')) {
    // Handle XML
  } else {
    res.status(415).send('Unsupported Media Type');
  }
});
```

**3. req.accepts(types)**
```javascript
app.get('/api/data', (req, res) => {
  const acceptsJson = req.accepts('json');
  const acceptsHtml = req.accepts('html');

  if (acceptsJson) {
    res.json({ data: [] });
  } else if (acceptsHtml) {
    res.send('<html>...</html>');
  } else {
    res.status(406).send('Not Acceptable');
  }
});
```

## Response Object (res)

### What is the Response Object?

The `res` object represents the HTTP response that an Express app sends when it receives an HTTP request.

### Common Response Methods

**1. res.send()**
```javascript
// Send various types of responses
app.get('/string', (req, res) => {
  res.send('Hello World');
});

app.get('/html', (req, res) => {
  res.send('<h1>Hello World</h1>');
});

app.get('/buffer', (req, res) => {
  res.send(Buffer.from('Hello'));
});

app.get('/object', (req, res) => {
  res.send({ message: 'Hello' });
});
```

**2. res.json()**
```javascript
app.get('/api/users', (req, res) => {
  res.json({
    users: [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' }
    ]
  });
});

// With status
app.post('/api/users', (req, res) => {
  res.status(201).json({
    message: 'User created',
    user: { id: 3, name: 'Bob' }
  });
});
```

**3. res.status()**
```javascript
app.get('/api/not-found', (req, res) => {
  res.status(404).json({
    error: 'Resource not found'
  });
});

// Common status codes
res.status(200); // OK
res.status(201); // Created
res.status(400); // Bad Request
res.status(401); // Unauthorized
res.status(403); // Forbidden
res.status(404); // Not Found
res.status(500); // Internal Server Error
```

**4. res.sendStatus()**
```javascript
app.delete('/api/users/:id', (req, res) => {
  // Send status with message
  res.sendStatus(204); // No Content
  // Equivalent to: res.status(204).send('No Content')
});

app.get('/api/unauthorized', (req, res) => {
  res.sendStatus(401); // Unauthorized
});
```

**5. res.redirect()**
```javascript
// Redirect to another URL
app.get('/old-url', (req, res) => {
  res.redirect('/new-url');
});

// Redirect with status code
app.get('/moved', (req, res) => {
  res.redirect(301, 'https://newdomain.com');
});

// Redirect back
app.post('/form', (req, res) => {
  // Process form
  res.redirect('back');
});
```

**6. res.sendFile()**
```javascript
const path = require('path');

app.get('/download', (req, res) => {
  const file = path.join(__dirname, 'files', 'document.pdf');
  res.sendFile(file);
});

// With options
app.get('/image', (req, res) => {
  const options = {
    root: path.join(__dirname, 'public'),
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  };

  res.sendFile('image.jpg', options, (err) => {
    if (err) {
      res.status(500).send('Error sending file');
    }
  });
});
```

**7. res.download()**
```javascript
app.get('/download/:filename', (req, res) => {
  const file = path.join(__dirname, 'files', req.params.filename);

  // Trigger download
  res.download(file);

  // With custom filename
  res.download(file, 'custom-name.pdf');

  // With callback
  res.download(file, (err) => {
    if (err) {
      console.error('Download failed:', err);
    }
  });
});
```

**8. res.render()**
```javascript
// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/profile/:id', (req, res) => {
  const user = { id: req.params.id, name: 'John' };

  res.render('profile', {
    title: 'User Profile',
    user: user
  });
});
```

### Setting Headers

**1. res.set() / res.header()**
```javascript
app.get('/api/data', (req, res) => {
  // Set single header
  res.set('Content-Type', 'application/json');

  // Set multiple headers
  res.set({
    'Content-Type': 'application/json',
    'X-Custom-Header': 'value',
    'Cache-Control': 'no-cache'
  });

  res.json({ data: [] });
});
```

**2. res.type()**
```javascript
app.get('/data', (req, res) => {
  res.type('json');        // application/json
  res.type('html');        // text/html
  res.type('text');        // text/plain
  res.type('.jpg');        // image/jpeg

  res.send(data);
});
```

**3. res.append()**
```javascript
app.get('/api/data', (req, res) => {
  res.append('Link', '<https://api.example.com>');
  res.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');

  res.json({ data: [] });
});
```

### Cookie Methods

**1. res.cookie()**
```javascript
app.post('/login', (req, res) => {
  // Set cookie
  res.cookie('sessionId', 'abc123', {
    maxAge: 900000,
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });

  res.json({ message: 'Logged in' });
});

// Signed cookie
app.post('/auth', (req, res) => {
  res.cookie('userId', '123', { signed: true });
  res.send('Authenticated');
});
```

**2. res.clearCookie()**
```javascript
app.post('/logout', (req, res) => {
  res.clearCookie('sessionId');
  res.clearCookie('userId', { path: '/admin' });

  res.json({ message: 'Logged out' });
});
```

## Content Negotiation

### Handling Different Content Types

```javascript
app.get('/api/data', (req, res) => {
  const data = { users: [{ name: 'John' }] };

  res.format({
    'text/plain': () => {
      res.send('Plain text');
    },

    'text/html': () => {
      res.send('<html><body>HTML</body></html>');
    },

    'application/json': () => {
      res.json(data);
    },

    'default': () => {
      res.status(406).send('Not Acceptable');
    }
  });
});
```

## Handling File Uploads

### Using Multer

```javascript
const multer = require('multer');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Single file upload
app.post('/upload', upload.single('avatar'), (req, res) => {
  // req.file contains the uploaded file
  console.log(req.file);

  res.json({
    message: 'File uploaded',
    filename: req.file.filename
  });
});

// Multiple files upload
app.post('/upload-multiple', upload.array('photos', 10), (req, res) => {
  // req.files contains array of uploaded files
  console.log(req.files);

  res.json({
    message: 'Files uploaded',
    count: req.files.length
  });
});

// Multiple fields
app.post('/upload-fields',
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'gallery', maxCount: 8 }
  ]),
  (req, res) => {
    console.log(req.files);
    res.json({ message: 'Files uploaded' });
  }
);
```

## Response Streaming

### Sending Large Files

```javascript
app.get('/video', (req, res) => {
  const path = 'video.mp4';
  const stat = fs.statSync(path);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Handle range requests
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    const stream = fs.createReadStream(path, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });

    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });

    fs.createReadStream(path).pipe(res);
  }
});
```

## Interview Questions

### Q1: What is the difference between res.send() and res.json()?

**Answer:**
- `res.json()` converts the value to JSON and sets Content-Type to application/json
- `res.send()` can send various types (string, object, buffer) and infers Content-Type
- `res.json()` is more explicit and recommended for APIs

```javascript
res.send({ name: 'John' });  // Works, but less explicit
res.json({ name: 'John' });  // Preferred for JSON APIs
```

### Q2: How do you access route parameters, query parameters, and request body?

**Answer:**
```javascript
// URL: /users/123?page=2
// Body: { name: 'John' }

app.post('/users/:id', (req, res) => {
  const id = req.params.id;         // '123'
  const page = req.query.page;      // '2'
  const name = req.body.name;       // 'John'
});
```

### Q3: How do you set custom headers in Express?

**Answer:**
```javascript
app.get('/api/data', (req, res) => {
  res.set('X-Custom-Header', 'value');
  res.set({
    'X-Powered-By': 'Express',
    'Cache-Control': 'no-cache'
  });

  res.json({ data: [] });
});
```

### Q4: What is the difference between res.redirect() and res.sendFile()?

**Answer:**
- `res.redirect()` sends a 302/301 response telling the browser to navigate to a different URL
- `res.sendFile()` sends the actual file content to the client

### Q5: How do you handle file uploads in Express?

**Answer:**
Use middleware like Multer:

```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file); // File info
  res.send('File uploaded');
});
```

## Best Practices

### ✅ Do's

1. **Use appropriate status codes**
```javascript
res.status(201).json({ user }); // Created
res.status(404).json({ error: 'Not found' });
res.status(400).json({ error: 'Bad request' });
```

2. **Use res.json() for APIs**
```javascript
// Good: Explicit JSON response
res.json({ data: [] });

// Avoid: Less explicit
res.send({ data: [] });
```

3. **Validate request data**
```javascript
app.post('/users', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password required'
    });
  }

  // Process...
});
```

4. **Set security headers**
```javascript
res.set({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'"
});
```

### ❌ Don'ts

1. **Don't send multiple responses**
```javascript
// Bad: Error - Cannot set headers after they are sent
app.get('/', (req, res) => {
  res.send('First');
  res.send('Second'); // Error!
});
```

2. **Don't trust user input**
```javascript
// Bad: No validation
app.post('/users', (req, res) => {
  const user = req.body;
  User.create(user); // Dangerous!
});

// Good: Validate and sanitize
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  // Validate...
});
```

3. **Don't expose sensitive info**
```javascript
// Bad: Exposing internal errors
res.status(500).json({ error: err.stack });

// Good: Generic error message
res.status(500).json({ error: 'Internal server error' });
```

## Summary

- **Request object** contains all information about the HTTP request
- **Response object** is used to send HTTP response back to the client
- Use appropriate response methods (json, send, sendFile, etc.)
- Set proper status codes and headers
- Handle file uploads with Multer
- Always validate and sanitize user input

---

[← Previous: Routing & Middleware](./01-routing-middleware.md) | [Next: Error Handling →](./03-error-handling.md)
