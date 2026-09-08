---
title: Password Security
part: 5
chapter: 0
slug: password-security
level: intermediate
reading_time: 8
updated: 2026-09-01
tags: [security, passwords, argon2, mfa, bcrypt]
in_book: true
---

# Password Security {#ch-password-security}

> Store a password so a database leak is not an account leak, and design a reset flow that is not the weakest link.

**In this chapter:** choosing a hashing algorithm · why salt and pepper differ · registration and login · rules that help and rules that do not · reset flows · a second factor

## 💡 The Core Idea

You never store a password. You store a value derived from it by a function that is deliberately
slow and impossible to reverse, so that a stolen database is not a stolen set of accounts.

"Deliberately slow" is the part general-purpose hashes get wrong. SHA-256 is designed to be fast,
and a modern GPU computes billions of SHA-256 hashes per second — so a leaked SHA-256 table of
common passwords is cracked in minutes. A password hash must be slow on purpose, and tunable, so it
can be made slower as hardware improves.

## Choosing an Algorithm

| Algorithm | Verdict | Notes |
| --------- | ------- | ----- |
| **Argon2id** | ✅ First choice | Memory-hard, so GPUs and ASICs lose their advantage |
| **scrypt** | ✅ Acceptable | Also memory-hard; fewer good libraries |
| **bcrypt** | ✅ Still fine | Everywhere, well understood; caps input at 72 bytes |
| PBKDF2 | ⚠️ Only if a compliance regime demands it | Not memory-hard |
| SHA-256, MD5, SHA-1 | ❌ Never | Fast by design — that is the whole problem |

```typescript
import argon2 from 'argon2';

// OWASP's 2026 baseline. Tune upwards until hashing takes ~250ms on your hardware.
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB — the memory-hard parameter, the one that matters
  timeCost: 2,        // iterations
  parallelism: 1,
};

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, OPTIONS);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain); // Parameters are embedded in the hash string.
  } catch {
    return false; // A malformed stored hash must not throw a 500 at a login endpoint.
  }
}
```

The parameters are stored inside the hash, which is what lets you raise the cost later and rehash
each user transparently on their next successful login.

> ⚠️ bcrypt silently truncates input at 72 bytes. A passphrase manager generating 100-character
> passwords means the last 28 characters do nothing, and — worse — pre-hashing with SHA-256 to work
> around it introduces a password-shucking weakness unless done carefully. Argon2id has no such
> limit.

### Salt and pepper

A **salt** is a random value per password, stored alongside the hash. It means two users with the
same password have different hashes, so one cracked hash does not reveal the other, and precomputed
rainbow tables are useless. Argon2 and bcrypt generate and embed the salt for you — you should never
be writing salt-handling code.

A **pepper** is a single secret value, the same for every password, kept outside the database — in a
secret manager or an HSM. It means a database leak alone is not enough to start cracking. It is
optional, and its cost is that rotating it requires rehashing on next login.

## Registration and Login

```typescript
async function login(email: string, password: string): Promise<Session> {
  const user = await db.users.findUnique({ where: { email: email.toLowerCase() } });

  // Always do the work, even for an unknown email, or response time leaks which
  // addresses are registered.
  const stored = user?.passwordHash ?? DUMMY_HASH;
  const ok = await verifyPassword(stored, password);

  if (!user || !ok) {
    await recordFailedAttempt(email);
    // One message for both cases. "No such user" is an account enumeration oracle.
    throw new AppError('Invalid email or password', 401, 'invalid_credentials');
  }

  // Opportunistic upgrade: the cost parameters changed since this hash was made.
  if (argon2.needsRehash(user.passwordHash, OPTIONS)) {
    await db.users.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  }

  return createSession(user.id);
}
```

Three things in that function are the whole answer to "how do you write a login endpoint":
constant-ish work regardless of whether the account exists, one generic error message, and an
opportunistic rehash.

## Rules That Help and Rules That Do Not

Current NIST and OWASP guidance is the opposite of what most systems still enforce.

| Rule | Verdict | Why |
| ---- | ------- | --- |
| Minimum 8 characters, ideally 12 | ✅ | Length is what actually resists cracking |
| Maximum of at least 64 characters | ✅ | Do not block passphrases or managers |
| Check against a breached-password list | ✅ | The single highest-value check |
| Allow every Unicode character, including spaces | ✅ | Restricting the alphabet shrinks the search space |
| Mandatory mixed case, digits and symbols | ❌ | Produces `Password1!` — predictable, and no stronger |
| Forced rotation every 90 days | ❌ | Produces `Summer2026`, then `Autumn2026` |
| Truncating or stripping characters silently | ❌ | The user cannot log in and does not know why |

The breached-password check is worth implementing properly. The "have I been pwned" range API lets
you check a password against known breaches without sending it: hash it with SHA-1, send the first
five hex characters, and search the returned suffixes locally — k-anonymity, so the service never
learns the full hash.

## Reset Flows

A reset flow is a way to obtain an account without the password. It is attacked more often than the
login form.

| Rule | Reason |
| ---- | ------ |
| Token is 32+ random bytes | Guessing must be infeasible |
| Store only the hash of the token | A database leak must not hand over live reset links |
| 15–60 minute expiry | Shrinks the window |
| Single use — deleted on success | A link in an inbox is reusable otherwise |
| Same response whether or not the email exists | Otherwise the form is an enumeration oracle |
| Invalidate all sessions on success | The attacker may already be logged in |
| Never include the new password in the email | Email is not a secure channel |

That last-but-one rule is the one people miss. If an attacker had a session, resetting the password
should end it — otherwise the recovery did not recover anything.

## Brute Force and a Second Factor

Rate limiting on the login endpoint is not optional, and it must be keyed on **both** the account
and the source. Per-account limiting alone lets an attacker spray one password across a million
accounts; per-IP limiting alone is defeated by a botnet. See
[Chapter ?? — Rate Limiting](#ch-rate-limiting) for the mechanism.

Lockout is a trade: locking an account after five failures stops brute force and hands an attacker a
denial-of-service against any user whose email they know. Progressive delay plus a CAPTCHA after a
threshold is usually the better balance.

| Second factor | Strength | Note |
| ------------- | -------- | ---- |
| **Passkeys / WebAuthn** | ✅ Strongest | Phishing-resistant by design — the credential is bound to the origin |
| **TOTP** (authenticator app) | ✅ Good | Needs a rate limit of its own; six digits is 1-in-a-million per guess |
| **Push approval** | ⚠️ Fair | Vulnerable to approval fatigue |
| **SMS** | ⚠️ Weak | SIM swap and SS7 interception; better than nothing |
| **Email code** | ❌ | The email account is usually the reset channel already |

Passkeys are the direction of travel and worth being able to describe: a key pair generated on the
device, with the private key never leaving it, and the challenge signed per origin — which is why
phishing does not work against them.

## 🔑 Key Takeaways

- Password hashing must be deliberately slow and tunable; Argon2id is the current first choice.
- Salt is per-password and handled by the library; pepper is one secret kept outside the database.
- A login endpoint must take similar time and return an identical message whether or not the account exists.
- Length and a breached-password check beat composition rules and forced rotation, which make passwords worse.
- A reset must invalidate every existing session, or the recovery leaves the attacker logged in.

## Interview Questions

**Q: Why not SHA-256 with a salt?**

Because SHA-256 is fast by design — billions of hashes per second on a GPU — so a salt only stops
precomputed tables, not brute force against each hash individually. A password hash needs a tunable
work factor and, ideally, to be memory-hard so specialised hardware gains no advantage. Argon2id and
bcrypt are built for exactly that.

**Q: Salt or pepper?**

Both, if you can. The salt is random per password, stored with the hash, and defeats rainbow tables
and hash comparison between users. The pepper is a single secret stored outside the database, so
that leaking the database is not enough to begin cracking. The salt is mandatory and free; the
pepper is optional and costs you a rehash-on-login when it rotates.

**Q: Your login endpoint responds in 50 ms for unknown emails and 300 ms for known ones. Why does that matter?**

It is an account enumeration oracle: an attacker can confirm which addresses are registered without
a single successful login, which feeds credential stuffing and phishing. The fix is to verify against
a dummy hash when the user does not exist, so the work — and therefore the timing — is comparable,
and to return one message for both cases.

## What to Read Next

- [Chapter ?? — Sessions and JWTs](#ch-jwt) — what is issued once the password checks out
- [Chapter ?? — OAuth 2.1 and OpenID Connect](#ch-oauth) — delegating this problem to someone else
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — the limiter the login endpoint depends on
