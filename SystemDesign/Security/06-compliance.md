# Compliance and Data Governance

Compliance is engineering work. Encryption, access logs, retention policies, and breach response all show up in code. This file covers the frameworks a senior engineer at an enterprise will be asked about: GDPR, HIPAA, PCI-DSS, and SOC 2, plus the cross-cutting concerns (audit logs, retention, residency) that they all share.

## Table of Contents

1. [GDPR](#gdpr)
2. [HIPAA](#hipaa)
3. [PCI-DSS](#pci-dss)
4. [SOC 2](#soc-2)
5. [Audit Logging](#audit-logging)
6. [Data Retention](#data-retention)
7. [Data Residency](#data-residency)

---

## GDPR

### 💡 **EU law that gives users rights over their personal data**

Applies to any company that processes data of EU residents, regardless of where the company is based.

### Data Subject Rights

Every EU user can ask you to:

| Right         | What It Means                                   |
| ------------- | ----------------------------------------------- |
| Access        | Get a copy of all data you hold on them         |
| Rectification | Correct wrong data                              |
| Erasure       | "Right to be forgotten" — delete everything     |
| Portability   | Receive data in a machine-readable format       |
| Objection     | Stop processing for marketing or profiling      |

**Implementing Erasure:**

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  deletedAt: Date | null;
}

async function eraseUser(userId: string): Promise<void> {
  // Hard-delete identifiers; keep anonymized rows for analytics integrity
  await db.transaction(async (tx) => {
    await tx.users.update(userId, {
      email: `deleted-${userId}@example.invalid`,
      name: "[deleted]",
      phone: null,
      deletedAt: new Date(),
    });
    await tx.auditLog.deleteByUser(userId);
    await tx.sessions.deleteByUser(userId);
  });

  // Propagate to downstream systems
  await analytics.eraseUser(userId);
  await crm.eraseUser(userId);
  await searchIndex.eraseUser(userId);
}
```

**Common Mistakes:**

❌ Soft-deleting and calling it done. The row is still there.
✅ Either hard-delete or anonymize fields that identify the person.

❌ Forgetting backups and data warehouses. They contain PII too.
✅ Document a retention policy that covers backups (typical: erase within 30 days).

### Consent

Marketing emails, tracking cookies, and analytics require opt-in consent.

- ✅ Pre-ticked boxes are not consent
- ✅ Keep a record of when and how consent was given
- ✅ Make withdrawal as easy as giving consent

### Data Protection Officer (DPO)

Required if you do large-scale processing of sensitive data or systematic monitoring. The DPO is the contact point for users and supervisory authorities.

### Breach Notification

You must notify the supervisory authority within **72 hours** of becoming aware of a breach.

> GDPR fines reach 4% of global annual revenue or €20M, whichever is higher. Not a theoretical risk — Meta, Amazon, and Google have all paid 9-figure fines.

---

## HIPAA

### 💡 **US law that protects health data**

Applies if you store, transmit, or process **Protected Health Information (PHI)** for a covered entity (hospital, insurer, doctor) or as a business associate.

### What Counts as PHI

Any health info combined with one of 18 identifiers (name, email, SSN, address, medical record number, etc.).

```typescript
// All PHI — must be encrypted at rest and in transit
interface PatientRecord {
  patientId: string;
  name: string;
  dob: Date;
  ssn: string;
  diagnosis: string[];
  notes: string;
}
```

### Core Requirements

| Safeguard      | Examples                                       |
| -------------- | ---------------------------------------------- |
| Administrative | Role-based access, training, sanctions         |
| Physical       | Locked data centers, badge access              |
| Technical      | Encryption (AES-256), audit logs, auto-logout  |

**Encryption Pattern:**

```typescript
import crypto from "crypto";

const KEY: Buffer = Buffer.from(process.env.PHI_KEY!, "hex");

function encryptPHI(plaintext: string): { iv: string; data: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("hex"),
    data: encrypted.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}
```

### Business Associate Agreement (BAA)

Every vendor that touches PHI must sign a BAA. AWS, GCP, and Azure offer HIPAA-eligible services, but you must request a BAA and only use the eligible service list.

**Common Mistakes:**

❌ Logging PHI in CloudWatch or Datadog without confirming the logger is HIPAA-eligible.
✅ Redact PHI before logging, or route logs to a HIPAA-eligible store.

> HIPAA violations cost up to $1.5M per category per year, and US Department of Health publishes a public "wall of shame" of breaches over 500 records.

---

## PCI-DSS

### 💡 **The card networks' rules for handling cardholder data**

Mandatory for anyone who stores, transmits, or processes credit card numbers (the PAN — Primary Account Number).

### Scope Reduction Through Tokenization

The fastest way to comply is to never touch the card number.

```typescript
// ❌ Bad — your servers see the PAN, full PCI scope applies
app.post("/checkout", async (req: Request, res: Response): Promise<void> => {
  await db.cards.insert({ pan: req.body.cardNumber });
});

// ✅ Good — Stripe Elements posts directly to Stripe, you only store a token
app.post("/checkout", async (req: Request, res: Response): Promise<void> => {
  const token: string = req.body.stripeToken; // opaque, useless to attackers
  const customer = await stripe.customers.create({ source: token });
  await db.customers.insert({ stripeId: customer.id });
});
```

| Approach              | PCI Scope                | Effort                |
| --------------------- | ------------------------ | --------------------- |
| Process cards yourself | Full (PCI Level 1)       | 12+ months, expensive |
| Hosted fields (Stripe Elements, Braintree Hosted Fields) | Minimal (SAQ A) | Hours                 |
| Tokenize via API      | Reduced (SAQ A-EP)       | Days                  |

### Core PCI Rules

- ✅ Never store CVV/CVC after authorization
- ✅ Encrypt PAN with strong crypto if you must store it
- ✅ Mask PAN in UIs (show only first 6 + last 4 digits)
- ✅ Quarterly external vulnerability scans (ASV scan)
- ❌ Never log full card numbers

> Use Stripe, Adyen, or Braintree. Building PCI Level 1 yourself is millions of dollars per year.

---

## SOC 2

### 💡 **Audit framework that proves your controls work**

SOC 2 is not a law. It is a report a third-party auditor produces, used by enterprise buyers to vet vendors.

### Trust Service Criteria

| Criterion       | What It Covers                              |
| --------------- | ------------------------------------------- |
| Security        | Required for every report                   |
| Availability    | Uptime, DR, capacity                        |
| Confidentiality | Sensitive business data                     |
| Processing Integrity | Correct, complete, timely processing   |
| Privacy         | PII handling                                |

### Type I vs Type II

- **Type I**: snapshot — controls exist on a given date
- **Type II**: covers 6–12 months — auditor checks the controls actually ran

### Engineering Work for SOC 2

```typescript
// 1. Access reviews — log every prod access
interface AccessEvent {
  userId: string;
  resource: string;
  action: string;
  timestamp: Date;
  ipAddress: string;
}

// 2. Change management — every prod change tied to a ticket
// (enforced via branch protection + required PR reviews)

// 3. Vulnerability management — scan and patch on a schedule

// 4. Incident response — documented runbooks and post-mortems
```

**Senior Engineer's SOC 2 Checklist:**

- ✅ MFA on all admin accounts
- ✅ Code review required on `main`
- ✅ Encryption at rest and in transit
- ✅ Background checks on engineers with prod access
- ✅ Annual penetration test
- ✅ Documented incident response plan, tested yearly

> SOC 2 audits cost $20–60k a year. The actual cost is the engineering hours to maintain the controls. Build them into the platform from day one.

---

## Audit Logging

### 💡 **Append-only record of who did what, when, from where**

Audit logs are the foundation of GDPR, HIPAA, PCI, and SOC 2. They are also priceless during incident response.

```typescript
interface AuditEntry {
  id: string;          // ulid or uuid
  timestamp: Date;
  actorId: string;     // user or service
  actorType: "user" | "service" | "system";
  action: string;      // "user.delete", "order.refund"
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  result: "success" | "failure";
}

async function audit(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<void> {
  await db.auditLog.insert({
    ...entry,
    id: ulid(),
    timestamp: new Date(),
  });
}

// Usage
await audit({
  actorId: req.user.id,
  actorType: "user",
  action: "patient.record.view",
  resourceType: "patient",
  resourceId: patient.id,
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"] ?? "",
  metadata: { reason: req.body.reason },
  result: "success",
});
```

**Rules:**

- ✅ Append-only — never UPDATE or DELETE audit rows
- ✅ Store in a separate database or write to S3 with Object Lock
- ✅ Sign or hash-chain entries to detect tampering
- ❌ Never log passwords, full card numbers, or unredacted PHI

> Auditors will ask for sample log entries. If you cannot produce them, you fail the audit.

---

## Data Retention

### 💡 **Keep data only as long as you need it**

Both GDPR and HIPAA require a documented retention policy. The principle: collect less, keep it shorter.

| Data Type           | Typical Retention     |
| ------------------- | --------------------- |
| Active user data    | While account active  |
| Deleted user data   | 30 days then erased   |
| Application logs    | 30–90 days            |
| Audit logs          | 1–7 years (varies)    |
| Backups             | 30–90 days            |
| Financial records (US) | 7 years            |
| Medical records (US, HIPAA) | 6 years      |

**Automated Cleanup:**

```typescript
// Scheduled job — runs daily
async function purgeExpired(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await db.users.deleteWhere({
    deletedAt: { lt: cutoff },
  });

  await db.sessions.deleteWhere({
    expiresAt: { lt: new Date() },
  });

  await s3.deleteOlderThan("logs/", cutoff);
}
```

**Common Mistakes:**

❌ "We might need it someday" — that is a liability, not an asset.
✅ Define retention per data class, enforce with code or S3 lifecycle policies.

---

## Data Residency

### 💡 **Some data must physically stay in a specific country or region**

GDPR limits transfers of EU personal data outside the EU. China, Russia, India, and many other countries have similar laws.

**Architectural Patterns:**

| Pattern              | When to Use                       |
| -------------------- | --------------------------------- |
| Single-region        | Small market, low complexity      |
| Multi-region active-active | Global users, low latency   |
| Region-pinned per tenant | Strict residency requirements |

**Region-Pinned Tenant:**

```typescript
interface Tenant {
  id: string;
  name: string;
  region: "us-east-1" | "eu-west-1" | "ap-south-1";
}

function dbForTenant(tenant: Tenant): Pool {
  switch (tenant.region) {
    case "us-east-1": return dbUsEast;
    case "eu-west-1": return dbEuWest;
    case "ap-south-1": return dbApSouth;
  }
}
```

**Rules for EU→US Transfers:**

- ✅ Use Standard Contractual Clauses (SCCs)
- ✅ Or rely on the EU-US Data Privacy Framework (2023+)
- ✅ Encrypt data so the US provider cannot read it
- ❌ Do not assume your CDN or analytics vendor is EU-only — verify

> Schrems II invalidated Privacy Shield in 2020. Residency law changes; design for flexibility, not for one current rule.

---

## Interview Quick-Reference

| Framework  | Applies To                          | Headline Rule                              |
| ---------- | ----------------------------------- | ------------------------------------------ |
| GDPR       | EU residents' personal data         | 72-hour breach notice; right to erasure    |
| HIPAA      | US health data                      | BAA with every vendor; encrypt PHI         |
| PCI-DSS    | Credit card data                    | Tokenize; never store CVV                  |
| SOC 2      | Vendor trust (B2B)                  | Continuous controls + annual Type II audit |

**Universal Engineering Controls:**

1. Encrypt data at rest (AES-256) and in transit (TLS 1.2+)
2. MFA on all privileged accounts
3. Append-only audit logs
4. Documented retention with automated cleanup
5. Incident response runbook, tested at least yearly
6. Least-privilege IAM, reviewed quarterly

[← Back to SystemDesign](../README.md)
