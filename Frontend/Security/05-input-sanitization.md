# Input Validation and Sanitization

## Overview

Input validation and sanitization are fundamental security practices that prevent injection attacks, data corruption, and security vulnerabilities. Every piece of user input must be validated and sanitized before processing or storing. This guide covers client-side and server-side validation, popular validation libraries, and sanitization techniques for modern web applications.

## Table of Contents
- [Client-Side vs Server-Side Validation](#client-side-vs-server-side-validation)
- [Validation Libraries](#validation-libraries)
- [Zod Validation](#zod-validation)
- [Yup Validation](#yup-validation)
- [React Hook Form Integration](#react-hook-form-integration)
- [Sanitization Techniques](#sanitization-techniques)
- [DOMPurify for HTML](#dompurify-for-html)
- [Validator.js for Common Patterns](#validatorjs-for-common-patterns)
- [SQL Injection Prevention](#sql-injection-prevention)
- [Command Injection Prevention](#command-injection-prevention)
- [File Upload Security](#file-upload-security)
- [Interview Questions](#interview-questions)

## Client-Side vs Server-Side Validation

### Comparison

Client-side validation provides immediate user feedback but offers zero security since attackers can bypass it entirely through browser tools or API calls. Server-side validation is the security boundary that must validate all inputs regardless of client-side checks.

```javascript
// Security Principle: NEVER trust client-side validation alone!

const validationApproach = {
  clientSide: {
    purpose: 'User experience (immediate feedback)',
    security: 'NONE - can be bypassed',
    performance: 'Fast',
    when: 'Always use, but never rely on alone'
  },
  serverSide: {
    purpose: 'Security (actual enforcement)',
    security: 'HIGH - cannot be bypassed',
    performance: 'Slower (network round-trip)',
    when: 'ALWAYS required for security'
  }
};

//  Correct approach: Both layers
// Client-side: UX
// Server-side: Security
```

### Client-Side Validation (UX Only)

```jsx
// L Common mistake: Only client-side validation
function ContactForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setError('Invalid email');
      return;
    }

    // L Directly submit - attacker can bypass client validation
    fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <span>{error}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Server-Side Validation (Security)

```javascript
//  Server-side validation (REQUIRED)
app.post('/api/contact', async (req, res) => {
  const { email } = req.body;

  // Validate on server (cannot be bypassed)
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Additional validation
  if (email.length > 254) {
    return res.status(400).json({ error: 'Email too long' });
  }

  // Sanitize before storing
  const sanitizedEmail = email.trim().toLowerCase();

  await db.contacts.insert({ email: sanitizedEmail });
  res.json({ success: true });
});
```

## Validation Libraries

### Popular Libraries Comparison

Modern JavaScript validation libraries offer different trade-offs between bundle size, TypeScript integration, and API design. Choosing the right library depends on project requirements, whether validation runs client-side or server-side, and team TypeScript adoption.

```javascript
// Library comparison
const validationLibraries = {
  zod: {
    type: 'TypeScript-first',
    pros: ['Type inference', 'Composable', 'Client & server'],
    cons: ['Slightly larger bundle'],
    bestFor: 'TypeScript projects, full-stack validation'
  },
  yup: {
    type: 'Schema builder',
    pros: ['Mature', 'Large ecosystem', 'Formik integration'],
    cons: ['No type inference', 'Larger API surface'],
    bestFor: 'React forms, established projects'
  },
  joi: {
    type: 'Server-side validation',
    pros: ['Powerful', 'Descriptive errors'],
    cons: ['Large bundle', 'Not ideal for browser'],
    bestFor: 'Node.js/Express backend'
  },
  validator: {
    type: 'String validators',
    pros: ['Lightweight', 'Simple', 'Many validators'],
    cons: ['No schema', 'String-only'],
    bestFor: 'Simple validation needs'
  }
};
```

## Zod Validation

### Basic Usage

Zod provides TypeScript-first schema validation with automatic type inference, meaning validation schemas double as type definitions. This eliminates duplication between runtime validation and compile-time types, ensuring they stay synchronized.

```typescript
import { z } from 'zod';

// Define schema
const userSchema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+').max(120),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
  username: z.string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric and underscore'),
  website: z.string().url().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'Must accept terms'
  })
});

// Infer TypeScript type from schema
type User = z.infer<typeof userSchema>;

// Validate data
const validateUser = (data: unknown) => {
  try {
    const validData = userSchema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors
      };
    }
    throw error;
  }
};

// Usage
const result = validateUser({
  email: 'user@example.com',
  age: 25,
  password: 'SecurePass123',
  username: 'john_doe',
  agreeToTerms: true
});

if (result.success) {
  console.log('Valid data:', result.data);
} else {
  console.log('Validation errors:', result.errors);
}
```

### Advanced Zod Patterns

```typescript
// Custom validation
const strongPasswordSchema = z.string()
  .refine(
    (password) => {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*]/.test(password);
      return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    },
    { message: 'Password must contain uppercase, lowercase, number, and special character' }
  );

// Dependent fields
const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Transform data
const emailSchema = z.string()
  .email()
  .transform((email) => email.toLowerCase().trim());

// Conditional validation
const shippingSchema = z.object({
  country: z.string(),
  state: z.string().optional(),
  zipCode: z.string()
}).refine((data) => {
  if (data.country === 'US' && !data.state) {
    return false;
  }
  return true;
}, {
  message: 'State is required for US addresses',
  path: ['state']
});

// Array validation
const tagsSchema = z.array(z.string())
  .min(1, 'At least one tag required')
  .max(5, 'Maximum 5 tags allowed')
  .refine((tags) => new Set(tags).size === tags.length, {
    message: 'Tags must be unique'
  });
```

### Server-Side with Zod

```typescript
// Express route with Zod validation
import express from 'express';
import { z } from 'zod';

const app = express();

// Validation middleware
const validate = (schema: z.ZodSchema) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.flatten().fieldErrors
        });
      }
      next(error);
    }
  };
};

// Schema
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(50)
});

// Route with validation
app.post('/api/users', validate(createUserSchema), async (req, res) => {
  // req.body is now validated
  const { email, password, name } = req.body;

  // Process validated data
  const user = await createUser({ email, password, name });
  res.json(user);
});
```

## Yup Validation

### Basic Usage

```javascript
import * yup from 'yup';

// Define schema
const userSchema = yup.object({
  email: yup.string()
    .email('Invalid email')
    .required('Email is required'),
  age: yup.number()
    .min(18, 'Must be 18 or older')
    .max(120, 'Invalid age')
    .required(),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain uppercase letter')
    .matches(/[0-9]/, 'Must contain number')
    .required(),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required(),
  website: yup.string().url('Must be a valid URL'),
  acceptTerms: yup.boolean()
    .oneOf([true], 'Must accept terms and conditions')
});

// Validate
const validateUser = async (data) => {
  try {
    const validData = await userSchema.validate(data, {
      abortEarly: false // Get all errors
    });
    return { success: true, data: validData };
  } catch (error) {
    return {
      success: false,
      errors: error.inner.reduce((acc, err) => ({
        ...acc,
        [err.path]: err.message
      }), {})
    };
  }
};
```

### Advanced Yup Patterns

```javascript
// Custom validation method
yup.addMethod(yup.string, 'username', function(message) {
  return this.test('username', message, function(value) {
    const { path, createError } = this;

    if (!value) return true; // Let required() handle this

    const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(value);
    return isValid || createError({ path, message: message || 'Invalid username format' });
  });
});

// Usage
const schema = yup.object({
  username: yup.string().username().required()
});

// Conditional validation
const profileSchema = yup.object({
  accountType: yup.string().oneOf(['personal', 'business']).required(),
  companyName: yup.string()
    .when('accountType', {
      is: 'business',
      then: (schema) => schema.required('Company name is required for business accounts'),
      otherwise: (schema) => schema.notRequired()
    }),
  taxId: yup.string()
    .when('accountType', {
      is: 'business',
      then: (schema) => schema.required().matches(/^\d{2}-\d{7}$/, 'Invalid tax ID format'),
      otherwise: (schema) => schema.notRequired()
    })
});

// Array validation with unique values
const interestsSchema = yup.object({
  interests: yup.array()
    .of(yup.string())
    .min(1, 'Select at least one interest')
    .max(5, 'Select up to 5 interests')
    .test('unique', 'Interests must be unique', (values) => {
      return values ? new Set(values).size === values.length : true;
    })
});
```

## React Hook Form Integration

### With Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema
const formSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  age: z.number().min(18, 'Must be 18+')
});

type FormData = z.infer<typeof formSchema>;

function RegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema)
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Registration failed');

      // Success
      alert('Registration successful!');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          type="email"
          {...register('email')}
          placeholder="Email"
        />
        {errors.email && <span>{errors.email.message}</span>}
      </div>

      <div>
        <input
          type="password"
          {...register('password')}
          placeholder="Password"
        />
        {errors.password && <span>{errors.password.message}</span>}
      </div>

      <div>
        <input
          type="number"
          {...register('age', { valueAsNumber: true })}
          placeholder="Age"
        />
        {errors.age && <span>{errors.age.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Register'}
      </button>
    </form>
  );
}
```

### With Yup

```tsx
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Schema
const schema = yup.object({
  username: yup.string().required('Username is required').min(3),
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required()
});

function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  });

  const onSubmit = (data) => {
    console.log('Valid data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('username')} placeholder="Username" />
      {errors.username && <p>{errors.username.message}</p>}

      <input {...register('email')} placeholder="Email" />
      {errors.email && <p>{errors.email.message}</p>}

      <input type="password" {...register('password')} placeholder="Password" />
      {errors.password && <p>{errors.password.message}</p>}

      <input type="password" {...register('confirmPassword')} placeholder="Confirm Password" />
      {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}

      <button type="submit">Sign Up</button>
    </form>
  );
}
```

## Sanitization Techniques

### Input vs Output Sanitization

```javascript
// Input sanitization: Clean before storing
const sanitizeInput = (input) => {
  return input
    .trim()                    // Remove whitespace
    .replace(/[<>]/g, '');     // Remove angle brackets
};

// Output sanitization: Encode before displaying
const sanitizeOutput = (output) => {
  return output
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Usage
app.post('/api/comment', (req, res) => {
  const rawComment = req.body.comment;

  // Sanitize before storing
  const sanitized = sanitizeInput(rawComment);
  db.comments.insert({ text: sanitized });

  res.json({ success: true });
});

app.get('/api/comments', (req, res) => {
  const comments = db.comments.find();

  // Sanitize before sending
  const safe = comments.map(c => ({
    ...c,
    text: sanitizeOutput(c.text)
  }));

  res.json(safe);
});
```

## DOMPurify for HTML

### Basic Usage

```javascript
import DOMPurify from 'dompurify';

// Sanitize HTML content
const dirtyHTML = `
  <div>
    <p>Safe content</p>
    <script>alert('XSS')</script>
    <img src=x onerror="alert('XSS')">
    <a href="javascript:alert('XSS')">Click</a>
  </div>
`;

const cleanHTML = DOMPurify.sanitize(dirtyHTML);

// Result: <div><p>Safe content</p><img src="x"><a>Click</a></div>
// Script tags, event handlers, and javascript: URLs removed
```

### Advanced Configuration

```javascript
// Allow specific tags and attributes
const config = {
  ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false
};

const cleanHTML = DOMPurify.sanitize(dirtyHTML, config);

// Custom configuration for markdown-like content
const markdownConfig = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
  ALLOWED_ATTR: ['href'],
  KEEP_CONTENT: true // Keep text content when removing tags
};

// Sanitize and return text
const textOnly = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: [],
  KEEP_CONTENT: true
});
```

### React Integration

```jsx
import DOMPurify from 'dompurify';

function UserComment({ comment }) {
  // Sanitize HTML before rendering
  const sanitizedHTML = DOMPurify.sanitize(comment.html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });

  return (
    <div
      className="comment"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
}

// Better: Use markdown instead of raw HTML
import DOMPurify from 'dompurify';
import marked from 'marked';

function SafeMarkdown({ markdown }) {
  // Convert markdown to HTML
  const rawHTML = marked.parse(markdown);

  // Sanitize the generated HTML
  const safeHTML = DOMPurify.sanitize(rawHTML);

  return <div dangerouslySetInnerHTML={{ __html: safeHTML }} />;
}
```

## Validator.js for Common Patterns

### Installation and Usage

```bash
npm install validator
```

```javascript
import validator from 'validator';

// Email validation
const email = 'user@example.com';
if (validator.isEmail(email)) {
  console.log('Valid email');
}

// URL validation
const url = 'https://example.com';
if (validator.isURL(url)) {
  console.log('Valid URL');
}

// Credit card validation
const creditCard = '4532-1234-5678-9010';
if (validator.isCreditCard(creditCard.replace(/-/g, ''))) {
  console.log('Valid credit card number');
}

// Common validators
const validators = {
  isAlpha: validator.isAlpha('abc'),           // true
  isNumeric: validator.isNumeric('123'),       // true
  isAlphanumeric: validator.isAlphanumeric('abc123'), // true
  isMobilePhone: validator.isMobilePhone('+1234567890', 'en-US'),
  isIP: validator.isIP('192.168.1.1'),         // true
  isJSON: validator.isJSON('{"key": "value"}'), // true
  isJWT: validator.isJWT('eyJ...'),            // JWT token
  isUUID: validator.isUUID('550e8400-e29b-41d4-a716-446655440000'),
  isEmpty: validator.isEmpty('   ', { ignore_whitespace: true }),
  isStrongPassword: validator.isStrongPassword('MyP@ss123', {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  })
};
```

### Custom Validation Functions

```javascript
import validator from 'validator';

// Username validation
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  if (!validator.isLength(username, { min: 3, max: 20 })) {
    return { valid: false, error: 'Username must be 3-20 characters' };
  }

  if (!validator.matches(username, /^[a-zA-Z0-9_]+$/)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  return { valid: true };
}

// Phone number validation
function validatePhone(phone, countryCode = 'US') {
  const sanitized = phone.replace(/[\s()-]/g, '');

  if (!validator.isMobilePhone(sanitized, countryCode)) {
    return { valid: false, error: 'Invalid phone number' };
  }

  return { valid: true, sanitized };
}

// Sanitization helpers
function sanitizeString(input) {
  let sanitized = validator.trim(input);
  sanitized = validator.escape(sanitized);  // HTML escape
  return sanitized;
}

function sanitizeEmail(email) {
  const normalized = validator.normalizeEmail(email, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false
  });
  return normalized ? normalized.toLowerCase() : null;
}
```

## SQL Injection Prevention

### Vulnerable Code

```javascript
// L NEVER do this - SQL injection vulnerability
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;

  // Dangerous: Direct string concatenation
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  db.query(query, (err, result) => {
    res.json(result);
  });
});

// Attack: /user/1 OR 1=1
// Executes: SELECT * FROM users WHERE id = 1 OR 1=1
// Returns ALL users!
```

### Parameterized Queries (Correct)

```javascript
//  Use parameterized queries (prepared statements)
app.get('/user/:id', async (req, res) => {
  const userId = req.params.id;

  // Validate input
  if (!validator.isNumeric(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Parameterized query - safe from SQL injection
  const query = 'SELECT * FROM users WHERE id = ?';
  const result = await db.query(query, [userId]);

  res.json(result);
});

// With named parameters (some libraries)
const query = 'SELECT * FROM users WHERE id = :userId AND status = :status';
const result = await db.query(query, { userId, status: 'active' });
```

### ORM Usage (TypeORM, Prisma)

```typescript
//  Using Prisma (automatically prevents SQL injection)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

app.get('/user/:id', async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Prisma automatically uses parameterized queries
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  res.json(user);
});

// Complex query with Prisma
const users = await prisma.user.findMany({
  where: {
    email: {
      contains: userInput // Safe - Prisma sanitizes
    },
    status: 'active'
  },
  select: {
    id: true,
    name: true,
    email: true
  }
});
```

## Command Injection Prevention

### Vulnerable Code

```javascript
// L NEVER execute user input directly
app.post('/convert', (req, res) => {
  const filename = req.body.filename;

  // Dangerous: Command injection vulnerability
  exec(`convert ${filename} output.pdf`, (error, stdout) => {
    res.json({ success: true });
  });
});

// Attack: filename = "file.txt; rm -rf /"
// Executes: convert file.txt; rm -rf / output.pdf
// Deletes entire filesystem!
```

### Safe Alternatives

```javascript
import { execFile } from 'child_process';
import path from 'path';

//  Use execFile with argument array
app.post('/convert', (req, res) => {
  const filename = req.body.filename;

  // Validate filename
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Sanitize: Allow only alphanumeric, dots, and hyphens
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename format' });
  }

  // Use execFile with arguments array (safer)
  execFile('convert', [filename, 'output.pdf'], (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: 'Conversion failed' });
    }
    res.json({ success: true });
  });
});

//  Whitelist approach
const ALLOWED_COMMANDS = ['convert', 'resize', 'compress'];

app.post('/process', (req, res) => {
  const { command, filename } = req.body;

  if (!ALLOWED_COMMANDS.includes(command)) {
    return res.status(400).json({ error: 'Invalid command' });
  }

  // Validate and sanitize filename
  const safeName = path.basename(filename); // Remove directory traversal

  execFile(command, [safeName], (error, stdout) => {
    // Process result
  });
});
```

## File Upload Security

### Comprehensive File Upload Validation

```javascript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fileType from 'file-type';

// Allowed file types
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf']
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    // Generate random filename to prevent conflicts
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_TYPES[file.mimetype]) {
    return cb(new Error('Invalid file type'), false);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_TYPES[file.mimetype].includes(ext)) {
    return cb(new Error('File extension does not match MIME type'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Upload endpoint with additional validation
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Verify actual file type (magic bytes)
    const buffer = await fs.readFile(req.file.path);
    const type = await fileType.fromBuffer(buffer);

    if (!type || !ALLOWED_TYPES[type.mime]) {
      // Delete uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Sanitize filename for display
    const originalName = path.basename(req.file.originalname);
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Move to final destination
    const finalPath = `uploads/${req.file.filename}`;
    await fs.rename(req.file.path, finalPath);

    res.json({
      success: true,
      filename: safeName,
      path: finalPath,
      size: req.file.size
    });
  } catch (error) {
    // Cleanup on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

### Client-Side File Validation

```jsx
function FileUpload() {
  const [error, setError] = useState('');

  const validateFile = (file) => {
    // Size validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return false;
    }

    // Type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and PDF allowed.');
      return false;
    }

    // Extension validation
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setError('Invalid file extension');
      return false;
    }

    return true;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side validation (UX only)
    if (!validateFile(file)) {
      e.target.value = ''; // Clear input
      return;
    }

    // Upload file
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Upload failed');
        return;
      }

      const result = await response.json();
      console.log('Upload successful:', result);
    } catch (error) {
      setError('Upload failed');
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.pdf"
        onChange={handleFileChange}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

## Interview Questions

**Q1: What's the difference between validation and sanitization?**

**A:**
- **Validation**: Checks if input meets criteria (format, length, type). Rejects invalid input.
- **Sanitization**: Modifies input to make it safe (remove/escape dangerous characters).

```javascript
// Validation: Check if email is valid
const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Sanitization: Clean email
const sanitized = email.trim().toLowerCase();
```

Both are necessary: Validate to ensure correct format, sanitize to prevent attacks.

**Q2: Why can't you rely on client-side validation alone?**

**A:** Client-side validation can be bypassed:
- User can disable JavaScript
- Attacker can use browser DevTools to modify code
- Direct API calls bypass frontend entirely
- Malicious users can craft requests with tools like curl

**Always validate on server** - client-side is only for UX.

**Q3: How do you prevent SQL injection?**

**A:** Use parameterized queries (prepared statements):

```javascript
// L Vulnerable
const query = `SELECT * FROM users WHERE id = ${userId}`;

//  Safe
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

//  Or use ORM like Prisma
const user = await prisma.user.findUnique({ where: { id: userId } });
```

Never concatenate user input into SQL strings.

**Q4: What is DOMPurify and when should you use it?**

**A:** DOMPurify is a library that sanitizes HTML to prevent XSS attacks.

**Use when:**
- Displaying user-generated HTML content
- Rendering markdown converted to HTML
- Using `dangerouslySetInnerHTML` in React

```javascript
import DOMPurify from 'dompurify';

const cleanHTML = DOMPurify.sanitize(userHTML);
```

It removes dangerous elements (script tags, event handlers, javascript: URLs).

**Q5: How would you validate a file upload securely?**

**A:** Multi-layer validation:

```javascript
// 1. Client-side (UX)
- Check file size
- Check MIME type
- Check file extension

// 2. Server-side (Security)
- Verify MIME type matches extension
- Check magic bytes (actual file type)
- Limit file size
- Sanitize filename
- Store with random name
- Scan for viruses (optional)
```

**Q6: What's the difference between Zod and Yup?**

**A:**
- **Zod**: TypeScript-first, type inference, smaller API
- **Yup**: JavaScript-first, larger ecosystem, Formik integration

```typescript
// Zod - Type inference
const schema = z.object({ email: z.string().email() });
type User = z.infer<typeof schema>; // Automatic type

// Yup - No type inference
const schema = yup.object({ email: yup.string().email() });
// Need manual TypeScript interface
```

Choose Zod for TypeScript projects, Yup for established JS projects.

**Q7: How do you prevent command injection?**

**A:**
1. **Avoid shell execution** when possible
2. **Use execFile** instead of exec (arguments array)
3. **Whitelist** allowed commands
4. **Validate and sanitize** all inputs
5. **Never** pass user input directly to shell

```javascript
// L Dangerous
exec(`command ${userInput}`);

//  Safe
execFile('command', [sanitizedInput]);
```

**Q8: What are common password validation requirements?**

**A:**
```javascript
const passwordSchema = z.string()
  .min(8, 'At least 8 characters')
  .max(128, 'Max 128 characters')
  .regex(/[a-z]/, 'At least one lowercase')
  .regex(/[A-Z]/, 'At least one uppercase')
  .regex(/[0-9]/, 'At least one number')
  .regex(/[^a-zA-Z0-9]/, 'At least one special character');
```

Also check against common passwords list and implement rate limiting.

**Q9: How do you sanitize HTML in React?**

**A:**
```jsx
// L Never use dangerouslySetInnerHTML without sanitization
<div dangerouslySetInnerHTML={{ __html: userHTML }} />

//  Sanitize first
import DOMPurify from 'dompurify';

function UserContent({ html }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

//  Better: Use markdown instead
```

**Q10: What's validator.js used for?**

**A:** Validator.js provides string validation and sanitization functions:

```javascript
import validator from 'validator';

validator.isEmail('user@example.com');        // Email
validator.isURL('https://example.com');       // URL
validator.isCreditCard('4532123456789010');   // Credit card
validator.isMobilePhone('+1234567890', 'US'); // Phone
validator.isStrongPassword('MyP@ss123');      // Password
validator.escape('<script>alert(1)</script>'); // Sanitize
```

Good for simple validation without heavy schema libraries.

## Summary

**Key Takeaways:**

1. **Defense in Depth**: Always validate on both client and server
2. **Never Trust User Input**: All input is potentially malicious
3. **Use Libraries**: Don't write validation from scratch (Zod, Yup, validator.js)
4. **Sanitize Appropriately**: Input vs output sanitization
5. **Parameterized Queries**: Prevent SQL injection
6. **File Upload Security**: Validate type, size, and content
7. **DOMPurify for HTML**: Prevent XSS when displaying user HTML

**Validation Checklist:**
- [ ] Client-side validation for UX
- [ ] Server-side validation for security
- [ ] Input sanitization before storage
- [ ] Output encoding before display
- [ ] Use parameterized queries for SQL
- [ ] Validate file uploads thoroughly
- [ ] Use trusted libraries (Zod, Yup, DOMPurify)

**Common Mistakes:**
- Relying only on client-side validation
- String concatenation in SQL queries
- Accepting file uploads without validation
- Using `eval()` or `exec()` with user input
- Not sanitizing HTML before rendering

---

[Next: Browser APIs �](../BrowserAPIs/README.md) | [� Back to Security](./README.md)
