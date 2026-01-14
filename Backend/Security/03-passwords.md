# Password Security

## Overview

**Password security** is one of the most critical aspects of application security. Poor password handling has led to massive data breaches affecting millions of users. This guide covers best practices for storing, validating, and managing passwords securely.

**Key Principle:** Never store passwords in plain text. Always use strong, adaptive hashing algorithms with salt.

---

## 🔒 Password Hashing Fundamentals

### 💡 **Why Hash Passwords?**

**The Problem:**
If passwords are stored in plain text, anyone with database access (hackers, rogue employees, backups) can read all user passwords.

**The Solution:**
Hash passwords using one-way cryptographic functions that are:
- **One-way:** Cannot be reversed to get original password
- **Deterministic:** Same password always produces same hash
- **Collision-resistant:** Different passwords produce different hashes
- **Slow:** Computationally expensive to prevent brute force attacks

---

## 🛠 Hashing Algorithms

### Comparison Table

| Algorithm | Status | Rounds | Salt | Memory-Hard | Use Case |
|-----------|--------|--------|------|-------------|----------|
| **bcrypt** | ✅ Good | 10-12 | Built-in | No | Most common, battle-tested |
| **Argon2** | ✅ Best | Variable | Built-in | Yes | Modern, most secure |
| **scrypt** | ✅ Good | Variable | Built-in | Yes | Less common than bcrypt |
| **PBKDF2** | ⚠️ OK | 100K+ | Manual | No | Acceptable but weaker |
| **SHA-256** | ❌ Bad | N/A | Manual | No | Too fast, easily brute-forced |
| **MD5** | ❌ Never | N/A | No | No | Broken, insecure |

---

## 💪 Bcrypt Implementation

### 💡 **Bcrypt: Industry Standard**

**Why Bcrypt?**
- Battle-tested (20+ years in production)
- Automatically handles salting
- Adaptive (configurable rounds)
- Resistant to brute force and rainbow tables

**Installation:**
```bash
npm install bcryptjs  # Pure JavaScript
# or
npm install bcrypt    # Native C++ (faster)
```

### Basic Usage

```javascript
const bcrypt = require('bcryptjs');

// Hash a password
async function hashPassword(password) {
  const saltRounds = 10; // 2^10 iterations
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

// Verify a password
async function verifyPassword(password, hash) {
  const isValid = await bcrypt.compare(password, hash);
  return isValid;
}

// Example
const password = 'MySecureP@ssw0rd!';
const hash = await hashPassword(password);
console.log(hash);
// $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

const isValid = await verifyPassword('MySecureP@ssw0rd!', hash);
console.log(isValid); // true

const isFake = await verifyPassword('WrongPassword', hash);
console.log(isFake); // false
```

---

## 🚀 Complete Authentication System

### User Registration with Password Hashing

```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const app = express();
app.use(express.json());

// Register new user
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate password strength
    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password (bcrypt automatically handles salt)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Password strength validation
function isPasswordStrong(password) {
  // At least 8 characters
  if (password.length < 8) return false;

  // Contains uppercase
  if (!/[A-Z]/.test(password)) return false;

  // Contains lowercase
  if (!/[a-z]/.test(password)) return false;

  // Contains number
  if (!/[0-9]/.test(password)) return false;

  // Contains special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

  return true;
}
```

### User Login with Password Verification

```javascript
// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Log failed attempt (for security monitoring)
      await logFailedLogin(user._id, req.ip);

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed login attempts on success
    await resetFailedLoginAttempts(user._id);

    // Generate session/JWT token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

---

## 🔐 Advanced Password Security

### Salt Rounds Configuration

**Higher rounds = More secure but slower**

```javascript
// Development: Fast but less secure
const SALT_ROUNDS_DEV = 8;  // ~40ms

// Production: Balanced
const SALT_ROUNDS_PROD = 10; // ~150ms

// High-security: Slow but very secure
const SALT_ROUNDS_HIGH = 12; // ~600ms

const SALT_ROUNDS = process.env.NODE_ENV === 'production'
  ? SALT_ROUNDS_PROD
  : SALT_ROUNDS_DEV;

const hash = await bcrypt.hash(password, SALT_ROUNDS);
```

**Choosing Salt Rounds:**
- **Goal:** Password hashing should take ~150-300ms
- **Test on your hardware:**
  ```javascript
  async function benchmarkBcrypt(rounds) {
    const start = Date.now();
    await bcrypt.hash('test-password', rounds);
    const duration = Date.now() - start;
    console.log(`Rounds ${rounds}: ${duration}ms`);
  }

  benchmarkBcrypt(8);  // ~40ms
  benchmarkBcrypt(10); // ~150ms
  benchmarkBcrypt(12); // ~600ms
  benchmarkBcrypt(14); // ~2400ms
  ```

---

## 🧂 Salt and Pepper

### 💡 **Understanding Salt**

**Salt:** Random data added to password before hashing

**Purpose:**
- Prevents rainbow table attacks
- Makes identical passwords have different hashes
- Unique salt per password

```javascript
// ❌ Without Salt
hash('password123')
// Always: 482c811da5d5b4bc6d497ffa98491e38

// ✅ With Salt
hash('password123' + 'randomsalt1')
// Different: 5e884898da28047151d0e56f8dc62927

hash('password123' + 'randomsalt2')
// Different: e3b0c44298fc1c149afbf4c8996fb924
```

**Bcrypt automatically handles salting:**
```javascript
// Bcrypt embeds salt in the hash
const hash = await bcrypt.hash('password123', 10);
// $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
//  ^   ^  ^----------------------^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//  |   |  |                      |
//  |   |  Salt (22 chars)        Hash (31 chars)
//  |   Cost factor (2^10)
//  Algorithm (bcrypt 2a)
```

### 💡 **Understanding Pepper**

**Pepper:** Secret key added to password before hashing

**Characteristics:**
- Same for all passwords
- Stored separately from database (environment variable)
- Adds extra layer of security

```javascript
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Pepper stored in environment variable
const PEPPER = process.env.PASSWORD_PEPPER || 'fallback-pepper-key';

// Hash with pepper
async function hashPasswordWithPepper(password) {
  // Add pepper before hashing
  const pepperedPassword = crypto
    .createHmac('sha256', PEPPER)
    .update(password)
    .digest('hex');

  // Hash the peppered password
  const hash = await bcrypt.hash(pepperedPassword, 10);
  return hash;
}

// Verify with pepper
async function verifyPasswordWithPepper(password, hash) {
  const pepperedPassword = crypto
    .createHmac('sha256', PEPPER)
    .update(password)
    .digest('hex');

  return await bcrypt.compare(pepperedPassword, hash);
}

// Usage
const password = 'MySecurePassword123!';
const hash = await hashPasswordWithPepper(password);
const isValid = await verifyPasswordWithPepper(password, hash);
```

**Pepper Benefits:**
- If database is compromised, pepper remains secret
- Attacker needs both database AND pepper to crack passwords
- Can rotate pepper (requires rehashing all passwords)

---

## 💎 Argon2: Modern Alternative

### 💡 **Argon2: Winner of Password Hashing Competition**

**Why Argon2?**
- Winner of Password Hashing Competition (2015)
- Memory-hard (resistant to GPU/ASIC attacks)
- More secure than bcrypt
- Configurable memory, time, and parallelism

**Installation:**
```bash
npm install argon2
```

### Argon2 Implementation

```javascript
const argon2 = require('argon2');

// Hash password with Argon2
async function hashPasswordArgon2(password) {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,  // Hybrid mode (best)
    memoryCost: 65536,      // 64 MB
    timeCost: 3,            // 3 iterations
    parallelism: 4,         // 4 threads
  });
  return hash;
}

// Verify password
async function verifyPasswordArgon2(password, hash) {
  const isValid = await argon2.verify(hash, password);
  return isValid;
}

// Example
const password = 'MySecurePassword123!';
const hash = await hashPasswordArgon2(password);
console.log(hash);
// $argon2id$v=19$m=65536,t=3,p=4$...

const isValid = await verifyPasswordArgon2(password, hash);
console.log(isValid); // true
```

### Argon2 vs Bcrypt

```javascript
// Performance comparison
async function compareBcryptArgon2(password) {
  // Bcrypt
  const bcryptStart = Date.now();
  const bcryptHash = await bcrypt.hash(password, 10);
  const bcryptTime = Date.now() - bcryptStart;

  // Argon2
  const argon2Start = Date.now();
  const argon2Hash = await argon2.hash(password);
  const argon2Time = Date.now() - argon2Start;

  console.log(`Bcrypt: ${bcryptTime}ms`);
  console.log(`Argon2: ${argon2Time}ms`);
}

// Bcrypt: ~150ms (CPU-bound)
// Argon2: ~200ms (CPU + Memory-bound, more secure)
```

**When to Choose:**

| Scenario | Choose | Why |
|----------|--------|-----|
| **New project** | Argon2 | Most secure, modern standard |
| **Existing project** | Bcrypt | Battle-tested, widely supported |
| **High-security** | Argon2 | Memory-hard, GPU-resistant |
| **Low-memory environment** | Bcrypt | Less memory intensive |

---

## 🔑 Password Requirements

### Strong Password Policy

```javascript
class PasswordValidator {
  static validate(password) {
    const errors = [];

    // Length
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    // Character types
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Common passwords check
    if (this.isCommonPassword(password)) {
      errors.push('This password is too common. Please choose a different one');
    }

    // No spaces
    if (/\s/.test(password)) {
      errors.push('Password must not contain spaces');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static isCommonPassword(password) {
    const commonPasswords = [
      'password', 'Password123', '12345678', 'qwerty',
      'abc123', 'letmein', 'welcome', 'monkey',
      'admin', 'password1', '123456789', 'Password1!'
    ];

    return commonPasswords.some(common =>
      password.toLowerCase().includes(common.toLowerCase())
    );
  }

  static calculateStrength(password) {
    let strength = 0;

    // Length
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (password.length >= 16) strength += 1;

    // Character variety
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    // Patterns (reduce strength)
    if (/(.)\1{2,}/.test(password)) strength -= 1; // Repeated chars
    if (/^[a-zA-Z]+$/.test(password)) strength -= 1; // Letters only
    if (/^[0-9]+$/.test(password)) strength -= 2; // Numbers only

    strength = Math.max(0, Math.min(5, strength));

    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return {
      score: strength,
      level: levels[strength],
    };
  }
}

// Usage in API
app.post('/auth/register', async (req, res) => {
  const { password } = req.body;

  const validation = PasswordValidator.validate(password);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Password does not meet requirements',
      details: validation.errors,
    });
  }

  const strength = PasswordValidator.calculateStrength(password);
  if (strength.score < 3) {
    return res.status(400).json({
      error: 'Password is too weak',
      strength: strength.level,
    });
  }

  // Proceed with registration...
});
```

---

## 🔄 Password Reset Flow

### Secure Password Reset Implementation

```javascript
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const sendEmail = require('./services/email');

// Step 1: Request password reset
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        message: 'If that email exists, we sent a reset link',
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before storing (prevent token theft from database)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token and expiry (15 minutes)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Send email with unhashed token
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    res.json({
      message: 'If that email exists, we sent a reset link',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Step 2: Reset password with token
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the token from URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired reset token',
      });
    }

    // Validate new password
    const validation = PasswordValidator.validate(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid password',
        details: validation.errors,
      });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);

    // Clear reset token
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Successful',
      html: `
        <h2>Password Changed</h2>
        <p>Your password has been successfully reset.</p>
        <p>If you didn't make this change, contact support immediately.</p>
      `,
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});
```

---

## 🔒 Brute Force Protection

### Rate Limiting and Account Locking

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

// Redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// 1. Global rate limiting
const globalLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP',
});

// 2. Login-specific rate limiting
const loginLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many login attempts. Please try again later.',
});

// 3. Account-level protection
class AccountProtection {
  static async recordFailedAttempt(userId, ip) {
    const key = `failed_login:${userId}`;

    const attempts = await redisClient.incr(key);

    if (attempts === 1) {
      // Set expiry on first attempt
      await redisClient.expire(key, 15 * 60); // 15 minutes
    }

    // Lock account after 5 failed attempts
    if (attempts >= 5) {
      await this.lockAccount(userId, 30 * 60); // Lock for 30 minutes
    }

    return attempts;
  }

  static async resetFailedAttempts(userId) {
    await redisClient.del(`failed_login:${userId}`);
  }

  static async lockAccount(userId, durationSeconds) {
    const lockKey = `account_locked:${userId}`;
    await redisClient.setex(lockKey, durationSeconds, 'true');

    // Notify user via email
    const user = await User.findById(userId);
    await sendEmail({
      to: user.email,
      subject: 'Account Temporarily Locked',
      html: `
        <h2>Security Alert</h2>
        <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
        <p>It will be unlocked in ${durationSeconds / 60} minutes.</p>
        <p>If this wasn't you, please reset your password immediately.</p>
      `,
    });
  }

  static async isAccountLocked(userId) {
    const lockKey = `account_locked:${userId}`;
    const isLocked = await redisClient.get(lockKey);
    return !!isLocked;
  }
}

// Apply to login endpoint
app.post('/auth/login',
  globalLimiter,
  loginLimiter,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is locked
      const isLocked = await AccountProtection.isAccountLocked(user._id);
      if (isLocked) {
        return res.status(423).json({
          error: 'Account temporarily locked due to multiple failed attempts',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        // Record failed attempt
        const attempts = await AccountProtection.recordFailedAttempt(
          user._id,
          req.ip
        );

        return res.status(401).json({
          error: 'Invalid credentials',
          attemptsRemaining: Math.max(0, 5 - attempts),
        });
      }

      // Successful login - reset failed attempts
      await AccountProtection.resetFailedAttempts(user._id);

      // Generate token and respond...
      const token = generateToken(user);
      res.json({ token, user: { id: user._id, email: user.email } });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);
```

---

## 🔐 Two-Factor Authentication (2FA)

### TOTP (Time-Based One-Time Password) Implementation

```bash
npm install speakeasy qrcode
```

```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Enable 2FA for user
app.post('/auth/2fa/enable', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `MyApp (${user.email})`,
      issuer: 'MyApp',
    });

    // Store temporary secret (not active until verified)
    user.twoFactorTempSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      message: 'Scan QR code with authenticator app',
      qrCode: qrCodeUrl,
      secret: secret.base32, // Backup code
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

// Verify and activate 2FA
app.post('/auth/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ error: '2FA setup not initiated' });
    }

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time-steps before/after
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    // Activate 2FA
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorEnabled = true;
    user.twoFactorTempSecret = undefined;

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    user.backupCodes = backupCodes.map(code => bcrypt.hashSync(code, 8));

    await user.save();

    res.json({
      message: '2FA enabled successfully',
      backupCodes, // Show once, user must save them
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Login with 2FA
app.post('/auth/login/2fa', async (req, res) => {
  try {
    const { email, password, token } = req.body;

    // Verify email/password first
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled for this account' });
    }

    // Verify 2FA token
    const isValidToken = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValidToken) {
      // Check backup codes
      const isValidBackupCode = await verifyBackupCode(user, token);
      if (!isValidBackupCode) {
        return res.status(401).json({ error: 'Invalid 2FA token' });
      }
    }

    // Successful 2FA login
    const authToken = generateToken(user);
    res.json({ token: authToken, user: { id: user._id, email: user.email } });
  } catch (error) {
    console.error('2FA login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Generate backup codes
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

// Verify backup code
async function verifyBackupCode(user, code) {
  for (let i = 0; i < user.backupCodes.length; i++) {
    const isValid = await bcrypt.compare(code, user.backupCodes[i]);
    if (isValid) {
      // Remove used backup code
      user.backupCodes.splice(i, 1);
      await user.save();
      return true;
    }
  }
  return false;
}
```

---

## 📚 Interview Questions

### Q1: Why should you never store passwords in plain text?

**Answer:**

**Security Risks:**

1. **Database Breach:** If attackers access your database, they get all passwords
2. **Insider Threat:** Rogue employees can see user passwords
3. **Backup Exposure:** Backup files may be less secured
4. **Password Reuse:** Users often reuse passwords across sites
5. **Legal Liability:** Violates data protection regulations (GDPR, CCPA)

**Real-World Impact:**

```javascript
// ❌ Plain text storage (2012 LinkedIn breach)
users: [
  { email: "user@example.com", password: "MyPassword123" }
]
// Result: 6.5 million passwords exposed

// ✅ Hashed storage
users: [
  {
    email: "user@example.com",
    password: "$2a$10$N9qo8uLOickgx2ZMRZoMye..."
  }
]
// Result: Even if breached, passwords are not readable
```

**Consequences:**
- Loss of user trust
- Legal penalties (GDPR fines up to 4% of revenue)
- Reputational damage
- Class-action lawsuits
- Users' accounts on other sites compromised

**Correct Approach:**
```javascript
// Always hash passwords
const bcrypt = require('bcryptjs');

// Registration
const hashedPassword = await bcrypt.hash(plainPassword, 10);
await User.create({ email, password: hashedPassword });

// Login
const user = await User.findOne({ email });
const isValid = await bcrypt.compare(plainPassword, user.password);
```

---

### Q2: What's the difference between hashing and encryption?

**Answer:**

| Feature | Hashing | Encryption |
|---------|---------|------------|
| **Direction** | One-way (irreversible) | Two-way (reversible) |
| **Purpose** | Data integrity, passwords | Data confidentiality |
| **Key Required** | No (or optional pepper) | Yes (encryption key) |
| **Output** | Fixed-length hash | Variable-length ciphertext |
| **Deterministic** | Yes (same input → same hash) | No (with IV, different each time) |
| **Use Case** | Passwords, checksums | Sensitive data storage |

**Hashing (Passwords):**
```javascript
const bcrypt = require('bcryptjs');

// One-way: Cannot get password back from hash
const hash = await bcrypt.hash('password123', 10);
// $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

// Verification: Compare new hash with stored hash
const isValid = await bcrypt.compare('password123', hash); // true

// ❌ Cannot reverse
const original = bcrypt.decrypt(hash); // Doesn't exist!
```

**Encryption (Sensitive Data):**
```javascript
const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

// Two-way: Can decrypt to get original data
function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const encrypted = encrypt('sensitive data');
const decrypted = decrypt(encrypted); // 'sensitive data'
```

**When to Use Each:**

**Use Hashing:**
- ✅ Passwords
- ✅ File integrity checks
- ✅ Digital signatures
- ✅ Irreversible data

**Use Encryption:**
- ✅ Credit card numbers
- ✅ Personal data (SSN, address)
- ✅ API keys in database
- ✅ Need to retrieve original data

**Key Insight:**
> Passwords should ALWAYS be hashed (with bcrypt/Argon2), never encrypted. Even admins shouldn't see user passwords.

---

### Q3: What is salt and why is it important?

**Answer:**

**Salt:** Random data added to each password before hashing

**Why Salt Matters:**

**❌ Without Salt (Rainbow Table Attack):**
```javascript
// Same password → Same hash
hash('password123') = '482c811da5d5b4bc6d497ffa98491e38'
hash('password123') = '482c811da5d5b4bc6d497ffa98491e38'
hash('password123') = '482c811da5d5b4bc6d497ffa98491e38'

// Attacker precomputes common passwords:
{
  '482c811da5d5b4bc6d497ffa98491e38': 'password123',
  'e3b0c44298fc1c149afbf4c8996fb924': 'letmein',
  // ... millions of common passwords
}

// Instant crack by lookup
```

**✅ With Salt (Unique Hash):**
```javascript
// Different salt → Different hash (even for same password)
hash('password123' + 'salt1') = '5e884898da28047151d0e56f8dc62927'
hash('password123' + 'salt2') = 'e3b0c44298fc1c149afbf4c8996fb924'
hash('password123' + 'salt3') = '7c4a8d09ca3762af61e59520943dc26494f8941b'

// Rainbow table is useless!
// Attacker must crack each password individually
```

**How Salt Works:**

```javascript
// Manual salt implementation (for understanding)
const crypto = require('crypto');

function hashPassword(password) {
  // Generate unique salt for this password
  const salt = crypto.randomBytes(16).toString('hex');

  // Combine password + salt, then hash
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
    .toString('hex');

  // Store salt with hash (salt is not secret)
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  // Extract salt from stored hash
  const [salt, hash] = storedHash.split(':');

  // Hash input password with same salt
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
    .toString('hex');

  // Compare hashes
  return hash === verifyHash;
}

// Usage
const user1 = { password: hashPassword('password123') };
const user2 = { password: hashPassword('password123') };

console.log(user1.password);
// 2ef7bde608ce5404e97d5f042f95f89f1c232871af396977c82dc9a25c5f4f65:9a8b7c...

console.log(user2.password);
// 8c3f9e1a7b2d4e5f6c7a8b9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f:4d3e2a...

// Same password, different hashes!
```

**Bcrypt Automatic Salt:**
```javascript
// Bcrypt handles salt automatically
const bcrypt = require('bcryptjs');

const hash1 = await bcrypt.hash('password123', 10);
const hash2 = await bcrypt.hash('password123', 10);

console.log(hash1);
// $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

console.log(hash2);
// $2a$10$KZVb1T3rQzAcNvQf1Zy5jO5k8vTzJzZ9YjZ8YjZ8YjZ8YjZ8YjZ8

// Different hashes, salt embedded in hash string
```

**Key Benefits:**
1. **Defeats Rainbow Tables:** Precomputed hash tables useless
2. **Unique Per Password:** Same password → different hashes
3. **Database Breach Mitigation:** Each password must be cracked individually
4. **Not Secret:** Salt can be stored in plain text with hash

**Key Insight:**
> Salt makes it impossible to crack multiple passwords at once. Even if 10,000 users have 'password123', attacker must crack each individually.

---

### Q4: What is the difference between bcrypt and Argon2?

**Answer:**

| Feature | Bcrypt | Argon2 |
|---------|--------|--------|
| **Age** | 1999 (24+ years) | 2015 (9 years) |
| **Algorithm** | Blowfish cipher | Hybrid (data-dependent/independent) |
| **Memory-Hard** | No (CPU-bound) | Yes (configurable memory) |
| **GPU Resistance** | Good | Better |
| **ASIC Resistance** | Good | Better |
| **Configuration** | Cost factor (rounds) | Memory, time, parallelism |
| **Adoption** | Very high | Growing |
| **Speed** | ~150ms (10 rounds) | ~200ms (default config) |

**Bcrypt:**

**Pros:**
- ✅ Battle-tested (20+ years in production)
- ✅ Simple API
- ✅ Widely supported
- ✅ Automatic salt handling
- ✅ Adaptive (configurable rounds)

**Cons:**
- ❌ Not memory-hard (vulnerable to GPU/ASIC attacks)
- ❌ Limited to 72 bytes password length
- ❌ Older algorithm

```javascript
const bcrypt = require('bcryptjs');

// Simple configuration
const hash = await bcrypt.hash(password, 10); // Only cost factor
const isValid = await bcrypt.compare(password, hash);
```

**Argon2:**

**Pros:**
- ✅ Winner of Password Hashing Competition (2015)
- ✅ Memory-hard (resistant to GPU/ASIC attacks)
- ✅ Highly configurable (memory, time, parallelism)
- ✅ Modern, state-of-the-art
- ✅ Recommended by OWASP

**Cons:**
- ❌ Newer (less battle-tested)
- ❌ More complex configuration
- ❌ Less widespread adoption

```javascript
const argon2 = require('argon2');

// Advanced configuration
const hash = await argon2.hash(password, {
  type: argon2.argon2id,  // Variant
  memoryCost: 65536,      // 64 MB memory
  timeCost: 3,            // 3 iterations
  parallelism: 4,         // 4 threads
});

const isValid = await argon2.verify(hash, password);
```

**Security Comparison:**

```javascript
// Bcrypt: CPU-bound
// Attacker with powerful GPU can try ~10,000 passwords/second

// Argon2: Memory + CPU-bound
// Attacker with same GPU limited to ~100 passwords/second
// 100x slower for attacker!
```

**When to Choose:**

**Choose Bcrypt:**
- ✅ Existing codebase already uses it
- ✅ Need wide compatibility
- ✅ Team familiar with it
- ✅ Low-memory environment
- ✅ "Good enough" security

**Choose Argon2:**
- ✅ New project
- ✅ High-security requirements
- ✅ Protecting against GPU/ASIC attacks
- ✅ Following latest best practices
- ✅ Modern infrastructure

**Migration Strategy:**

```javascript
// Support both during transition
async function hashPassword(password) {
  // Use Argon2 for new passwords
  return await argon2.hash(password);
}

async function verifyPassword(password, hash) {
  // Detect algorithm from hash format
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    // Bcrypt hash
    const isValid = await bcrypt.compare(password, hash);

    // Rehash with Argon2 on successful login
    if (isValid) {
      const newHash = await argon2.hash(password);
      await updateUserPassword(userId, newHash);
    }

    return isValid;
  } else {
    // Argon2 hash
    return await argon2.verify(hash, password);
  }
}
```

**Key Insight:**
> Both are secure. Use Argon2 for new projects (more secure), bcrypt for existing projects (battle-tested). Never use anything weaker.

---

### Q5: How do you implement secure password reset functionality?

**Answer:**

**Secure Password Reset Flow:**

**1. User Requests Reset**

```javascript
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // ✅ GOOD: Don't reveal if user exists
  if (!user) {
    return res.json({
      message: 'If that email exists, we sent a reset link'
    });
  }

  // Generate cryptographically secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // ✅ GOOD: Hash token before storing
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Store hashed token with expiry
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save();

  // Send email with unhashed token
  const resetUrl = `${FRONTEND_URL}/reset?token=${resetToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  res.json({
    message: 'If that email exists, we sent a reset link'
  });
});
```

**Why Hash the Token?**
- If database is breached, attacker can't use tokens
- Only user with email has unhashed token

**2. User Submits New Password**

```javascript
app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  // Hash the received token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with valid, unexpired token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      error: 'Invalid or expired reset token'
    });
  }

  // Validate new password strength
  const validation = PasswordValidator.validate(newPassword);
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Weak password',
      details: validation.errors
    });
  }

  // ✅ GOOD: Hash new password
  user.password = await bcrypt.hash(newPassword, 10);

  // ✅ GOOD: Clear reset token (one-time use)
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // ✅ GOOD: Invalidate existing sessions
  user.tokenVersion += 1;

  await user.save();

  // ✅ GOOD: Notify user
  await sendPasswordChangedEmail(user.email);

  res.json({ message: 'Password reset successful' });
});
```

**Security Best Practices:**

**✅ Do's:**
1. **Generate Secure Tokens:**
   ```javascript
   // ✅ Cryptographically secure
   crypto.randomBytes(32).toString('hex');

   // ❌ Not secure
   Math.random().toString(36);
   ```

2. **Hash Tokens Before Storing:**
   ```javascript
   // Prevent token theft from database
   const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
   ```

3. **Set Short Expiration (15-30 minutes):**
   ```javascript
   user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
   ```

4. **One-Time Use Tokens:**
   ```javascript
   // Clear token after use
   user.passwordResetToken = undefined;
   ```

5. **Don't Reveal User Existence:**
   ```javascript
   // Always same response
   res.json({ message: 'If that email exists, we sent a reset link' });
   ```

6. **Invalidate Existing Sessions:**
   ```javascript
   // Force re-login on all devices
   user.tokenVersion += 1;
   ```

7. **Rate Limit Reset Requests:**
   ```javascript
   const resetLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 3, // 3 requests per 15 minutes
   });

   app.post('/auth/forgot-password', resetLimiter, handler);
   ```

8. **Send Confirmation Email:**
   ```javascript
   // Alert user if they didn't request reset
   await sendPasswordChangedEmail(user.email);
   ```

**❌ Don'ts:**
1. **Don't use weak tokens:** `userId + timestamp`
2. **Don't store tokens unhashed**
3. **Don't have long expiration:** > 1 hour
4. **Don't allow token reuse**
5. **Don't reveal if user exists**
6. **Don't skip email verification**
7. **Don't forget rate limiting**

**Complete Secure Flow:**

```
1. User requests reset
2. Generate crypto-secure random token
3. Hash token, store with 15-min expiry
4. Email user with unhashed token
5. User clicks link, enters new password
6. Verify token (hash and compare)
7. Check expiration
8. Validate new password strength
9. Hash and save new password
10. Clear reset token (one-time use)
11. Invalidate all sessions
12. Email confirmation
```

**Key Insight:**
> Password reset is often the weakest link. Use cryptographically secure tokens, hash before storing, short expiration, one-time use, and rate limiting.

---

## ✅ Best Practices Summary

### ✅ Do's

1. **Always use bcrypt or Argon2** for password hashing
2. **Set minimum 8 characters** with complexity requirements
3. **Use salt automatically** (bcrypt/Argon2 handle this)
4. **Hash tokens** before storing in database
5. **Implement rate limiting** on login and reset endpoints
6. **Use HTTPS** for all authentication endpoints
7. **Validate password strength** before accepting
8. **Implement account locking** after failed attempts
9. **Send security notifications** (password changed, suspicious login)
10. **Use 2FA** for sensitive accounts
11. **Set password reset expiration** (15-30 minutes)
12. **Clear reset tokens** after one use
13. **Monitor for common passwords** and block them
14. **Hash pepper** separately from database

### ❌ Don'ts

1. **Don't store passwords in plain text** (ever!)
2. **Don't use weak algorithms** (MD5, SHA-1, SHA-256 alone)
3. **Don't skip salt** (defeats rainbow tables)
4. **Don't limit password length** unnecessarily
5. **Don't reveal user existence** in error messages
6. **Don't use predictable tokens** for reset
7. **Don't store reset tokens unhashed**
8. **Don't allow unlimited login attempts**
9. **Don't use security questions** (easily guessable)
10. **Don't email passwords** (even after reset)
11. **Don't implement custom crypto** (use proven libraries)
12. **Don't forget to log security events**

---

## 🎯 Summary

- **Never store plain text passwords** - Always hash with bcrypt/Argon2
- **Salt is automatic** with bcrypt/Argon2 - Prevents rainbow tables
- **Pepper adds security** - Additional secret key
- **Bcrypt** is battle-tested and widely used
- **Argon2** is modern and more secure (memory-hard)
- **Validate password strength** - Minimum 8 chars, complexity
- **Implement brute force protection** - Rate limiting + account locking
- **Secure password reset** - Crypto-secure tokens, hash before storing, 15-min expiry
- **Use 2FA** - TOTP with authenticator apps
- **Monitor and alert** - Log security events, notify users

---

[← Back to Backend](../README.md) | [Next: HTTPS & TLS →](./04-https.md)
