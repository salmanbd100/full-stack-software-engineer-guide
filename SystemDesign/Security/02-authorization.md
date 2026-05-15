# Authorization

Authorization answers: **what is this user allowed to do?** Authentication proves _who_; authorization decides _what_.

This doc covers RBAC, ABAC, ACLs, policy engines (OPA), multi-tenancy, OAuth scopes, and the rule that ties them all together — **always enforce on the server**.

---

## 1. RBAC — Role-Based Access Control

### 💡 **Group permissions into roles, assign roles to users**

RBAC is the most common model in enterprise apps. Users get roles like `admin`, `editor`, `viewer`. Each role carries a fixed set of permissions.

**How It Works:**

```
User → Roles → Permissions → Resources
```

A user can have one or many roles. Permissions are checked against the union.

**TypeScript example:**

```typescript
type Role = "admin" | "editor" | "viewer";
type Permission =
  | "report:read"
  | "report:write"
  | "report:delete"
  | "user:manage";

const rolePermissions: Record<Role, Permission[]> = {
  admin: ["report:read", "report:write", "report:delete", "user:manage"],
  editor: ["report:read", "report:write"],
  viewer: ["report:read"],
};

function can(roles: Role[], permission: Permission): boolean {
  return roles.some((r: Role) => rolePermissions[r].includes(permission));
}

// Express middleware
function requirePermission(perm: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!can(req.user.roles, perm)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

app.delete("/reports/:id", requirePermission("report:delete"), deleteReport);
```

**When to Use:**

- ✅ Most CRUD apps with a small, stable set of roles.
- ✅ Internal dashboards, admin panels.
- ❌ When access depends on data attributes (owner, region, time of day).

**Common Mistakes:**

- ❌ Treating roles as permissions (`role === "admin"`) — hard to refactor later.
- ❌ Hardcoding role checks in UI without server-side enforcement.
- ✅ Always check the permission, not the role name.

> Roles are how you _grant_ access. Permissions are what you _check_. Don't confuse them.

---

## 2. ABAC — Attribute-Based Access Control

### 💡 **Decide access based on attributes of user, resource, and context**

ABAC is more flexible than RBAC. Rules use attributes like department, region, resource owner, or time.

**Example rule:**

> A user can edit a report if they own it, or if they are a manager in the same department.

```typescript
interface User {
  id: string;
  department: string;
  roles: string[];
}

interface Report {
  id: string;
  ownerId: string;
  department: string;
}

function canEditReport(user: User, report: Report): boolean {
  if (report.ownerId === user.id) return true;
  if (user.roles.includes("manager") && user.department === report.department) {
    return true;
  }
  return false;
}
```

**RBAC vs ABAC:**

| Feature        | RBAC                             | ABAC                                     |
| -------------- | -------------------------------- | ---------------------------------------- |
| **Model**      | User → role → permission         | User + resource + context → decision     |
| **Flexibility**| Low — fixed roles                | High — any attribute                     |
| **Complexity** | Simple                           | Higher                                   |
| **Audit**      | Easy ("who has admin?")          | Harder                                   |
| **Best for**   | Stable role sets                 | Multi-tenant SaaS, healthcare, gov       |

**When to Use:**

- ✅ Rules involve resource ownership ("user can edit their own posts").
- ✅ Multi-tenant systems with per-tenant rules.
- ❌ Simple apps where 3–4 roles cover everything.

> Most real systems are RBAC at the edge, ABAC in the middle. Start with RBAC and add attributes when roles aren't enough.

---

## 3. ACLs — Access Control Lists

### 💡 **Attach a list of allowed users/groups directly to a resource**

ACLs flip the model. Instead of asking "what can this user do?", you ask "who can access this resource?". Used by file systems, Google Drive, GitHub repos.

**Example:**

```typescript
interface Acl {
  resourceId: string;
  entries: Array<{
    principalId: string; // user or group ID
    permissions: Array<"read" | "write" | "share">;
  }>;
}

function canRead(acl: Acl, userId: string, groupIds: string[]): boolean {
  return acl.entries.some(
    (e) =>
      (e.principalId === userId || groupIds.includes(e.principalId)) &&
      e.permissions.includes("read")
  );
}
```

**When to Use:**

- ✅ Document sharing (Drive, Notion, Dropbox).
- ✅ Per-record sharing in CRMs.
- ❌ When permissions are uniform across all resources of a type — RBAC is simpler.

**Common Mistakes:**

- ❌ Storing ACLs in a single JSON column — kills query performance.
- ❌ Forgetting inheritance (folder → file).

---

## 4. Policy-Based Authorization (OPA)

### 💡 **Move policy out of code into a dedicated engine**

When authorization rules get complex — different per tenant, change often, need audit — a policy engine like **Open Policy Agent (OPA)** centralizes them.

**How It Works:**

Your app sends a query (`Can user X do Y on resource Z?`) to OPA. OPA evaluates a policy file (written in Rego) and returns allow/deny.

**Rego policy:**

```
package app.authz

default allow := false

# Owners can edit their own reports
allow if {
  input.action == "edit"
  input.resource.type == "report"
  input.resource.ownerId == input.user.id
}

# Managers can edit reports in their department
allow if {
  input.action == "edit"
  input.resource.type == "report"
  "manager" in input.user.roles
  input.user.department == input.resource.department
}
```

**Calling OPA from TypeScript:**

```typescript
async function isAllowed(input: AuthzInput): Promise<boolean> {
  const res = await fetch("http://opa:8181/v1/data/app/authz/allow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const { result } = (await res.json()) as { result: boolean };
  return result;
}
```

**When to Use:**

- ✅ Policies change without redeploying the app.
- ✅ Many services share the same rules (microservices).
- ✅ Compliance demands separation of policy from code.
- ❌ Small apps with 3 roles — overkill.

> A policy engine pays off when product, security, and compliance teams all need to read the rules.

---

## 5. Multi-Tenancy

### 💡 **Every query must be scoped to the tenant**

In a multi-tenant SaaS, the worst bug is one tenant seeing another's data. Authorization must enforce tenant isolation on _every_ query.

**Pattern 1: Tenant ID in every query**

```typescript
async function getReports(user: User): Promise<Report[]> {
  return db.reports.find({ tenantId: user.tenantId }); // always
}
```

**Pattern 2: Row-Level Security (Postgres)**

```sql
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON reports
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Then in code:

```typescript
await db.query("SET app.tenant_id = $1", [user.tenantId]);
// All subsequent queries are auto-filtered
```

**Common Mistakes:**

- ❌ Trusting a `tenantId` from the request body — always derive it from the authenticated session.
- ❌ Caching across tenants without keying by tenant ID.
- ❌ Admin queries that bypass tenant filters and leak in logs.

> In multi-tenant systems, tenant isolation is part of authorization. Test it like a security boundary.

---

## 6. OAuth Scopes

### 💡 **Scopes limit what an access token can do, not who the user is**

When a third-party app calls your API on behalf of a user, you don't want it to do _everything_ the user can. Scopes narrow that.

**Example:**

```
read:reports      → can list and read reports
write:reports     → can create and edit reports
admin:users       → can manage users
```

**Enforcement:**

```typescript
function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tokenScopes: string[] = (req.token.scope as string).split(" ");
    if (!tokenScopes.includes(scope)) {
      return res.status(403).json({ error: "insufficient_scope" });
    }
    next();
  };
}

app.post("/reports", requireScope("write:reports"), createReport);
```

**Scopes vs Permissions:**

| Concept      | Purpose                                  |
| ------------ | ---------------------------------------- |
| **Scope**    | Limits a third-party token's reach       |
| **Permission** | Limits what a user can do internally   |

A scope check is _necessary but not sufficient_. After the scope passes, you still check the user's own permissions.

---

## 7. Server-Side Enforcement (Non-Negotiable)

### 💡 **The frontend hides buttons. The backend stops attacks.**

A common interview trap: a candidate says "we hide the delete button for non-admins". That is UX, not security.

**Rules:**

- ✅ Every protected endpoint checks authorization on the server.
- ✅ GraphQL resolvers check field-level access.
- ✅ Direct object reference checks (`/reports/123` — is user allowed?).
- ❌ Trusting role/permission claims sent from the client.
- ❌ Relying on a hidden UI element to prevent access.

**Insecure Direct Object Reference (IDOR):**

```typescript
// ❌ BAD — any logged-in user can read any report
app.get("/reports/:id", async (req, res) => {
  const report = await db.reports.findById(req.params.id);
  res.json(report);
});

// ✅ GOOD — verify ownership / permission
app.get("/reports/:id", async (req, res) => {
  const report = await db.reports.findById(req.params.id);
  if (!report || !canRead(req.user, report)) {
    return res.status(404).json({ error: "Not found" });
  }
  res.json(report);
});
```

> Return `404` instead of `403` for unauthorized resource access. Don't tell attackers what exists.

---

## Quick Decision Guide

| Scenario                              | Use This         |
| ------------------------------------- | ---------------- |
| 3–10 roles, stable permissions        | RBAC             |
| Owner-based or department-based rules | ABAC             |
| Per-document sharing (Drive-like)     | ACLs             |
| Rules change often, many services     | OPA / policy     |
| Multi-tenant SaaS                     | RBAC + tenant ID |
| Third-party API access                | OAuth scopes     |

---

## Key Takeaways

> **Roles grant access. Permissions check access. Code against permissions.**

> **RBAC for simple apps. ABAC when rules depend on data. OPA when rules change often.**

> **In multi-tenant systems, tenant isolation is the most important authorization rule.**

> **Frontend hides things. Backend prevents things. Always enforce server-side.**

> **For unauthorized access, return 404 — don't confirm the resource exists.**

---

[← Back to SystemDesign](../README.md)
