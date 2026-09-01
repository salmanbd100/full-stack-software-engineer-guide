---
title: Authorisation
part: 5
chapter: 0
slug: authorisation
level: advanced
reading_time: 9
updated: 2026-09-01
tags: [security, rbac, abac, authorisation, multi-tenancy]
in_book: true
---

# Authorisation {#ch-authorisation}

> Decide who may do what in one place, and check the object rather than the route.

**In this chapter:** authentication against authorisation · RBAC, ABAC and ACLs · policy engines · tenant isolation · why OAuth scopes are not permissions

## 💡 The Core Idea

Authentication asks *who are you*. Authorisation asks *may you do this, to this thing*. They fail
differently and they fail in different places.

The distinction that matters in code: authentication is a property of the **request**, so one
middleware can establish it. Authorisation is a property of the **request and the object together**,
so it cannot live in a route guard alone. `GET /orders/9` with a valid token from any authenticated
user must still verify that order 9 belongs to them.

That single sentence is the most common real vulnerability in production APIs. OWASP calls it
**broken object-level authorisation**, and it is a missing `WHERE` clause, not an exotic exploit.

## The Three Models

| Model | Decides from | Fits |
| ----- | ------------ | ---- |
| **RBAC** — role-based | The user's role | Most applications; small, stable permission sets |
| **ABAC** — attribute-based | Attributes of user, resource and context | Rules like "only during business hours", "only own department" |
| **ACL** — access control list | A per-object list of grants | Sharing: documents, folders, calendars |

**RBAC, done properly** means roles map to permissions, and code checks permissions — never roles.

```typescript
type Permission = 'order:read' | 'order:write' | 'order:refund' | 'user:manage';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  viewer: ['order:read'],
  agent: ['order:read', 'order:write'],
  manager: ['order:read', 'order:write', 'order:refund'],
  admin: ['order:read', 'order:write', 'order:refund', 'user:manage'],
};

export function requirePermission(permission: Permission): RequestHandler {
  return (req, res, next) => {
    const granted = ROLE_PERMISSIONS[req.user.role] ?? [];
    if (!granted.includes(permission)) {
      return void res.status(403).json({ error: { code: 'forbidden' } });
    }
    next();
  };
}
```

Checking `if (user.role === 'admin')` scattered through handlers is the anti-pattern. Adding a role
then means auditing every conditional in the codebase; adding a permission to a role's list is one
line.

**ABAC** evaluates a rule against attributes, which is what you need as soon as a requirement
contains the word "own" or "only when".

```typescript
interface Ctx { user: User; resource: Order; now: Date }

const canRefund = ({ user, resource, now }: Ctx): boolean =>
  user.permissions.includes('order:refund') &&
  resource.tenantId === user.tenantId &&                 // tenant isolation
  resource.total <= user.refundLimit &&                  // attribute of the user
  now.getTime() - resource.paidAt.getTime() < 30 * 864e5; // attribute of the resource
```

**ACLs** are for user-driven sharing. The grant lives with the object, because only the object's
owner knows who should see it.

```sql
CREATE TABLE document_grants (
  document_id bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  subject_id  bigint NOT NULL,               -- a user or a group
  level       text   NOT NULL CHECK (level IN ('viewer','commenter','editor','owner')),
  PRIMARY KEY (document_id, subject_id)
);
```

Most real systems use all three: RBAC for what a job function may do, ABAC for the conditions, ACLs
for what users share with each other.

## Enforce at the Data Layer

The reliable defence against object-level authorisation bugs is to make the authorisation part of
the query, so forgetting it returns nothing rather than everything.

```typescript
// ❌ Route guard only. Any authenticated user reads any order.
app.get('/orders/:id', requireAuth, async (req, res) => {
  res.json(await db.orders.findUnique({ where: { id: req.params.id } }));
});

// ✅ The tenant and the owner are part of the query, not a separate check.
app.get('/orders/:id', requireAuth, requirePermission('order:read'), async (req, res) => {
  const order = await db.orders.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
  });
  // 404, not 403 — a 403 confirms the order exists, which is itself a leak.
  if (!order) return void res.status(404).json({ error: { code: 'not_found' } });
  res.json(order);
});
```

The 404-versus-403 choice is worth stating deliberately. A 403 tells the caller the resource exists,
which for sequential ids leaks the size and shape of your data. Return 404 when the caller should
not know the object exists, and 403 when they already legitimately know.

## Tenant Isolation

In a multi-tenant system, `tenantId` in every query is a rule that a single missed `WHERE` clause
breaks — and the failure mode is one customer reading another's data. Three levels of defence, in
order of strength:

| Approach | Guarantee | Cost |
| -------- | --------- | ----- |
| `tenantId` in every query by convention | None — one omission is a breach | Free, and insufficient |
| A repository layer that injects `tenantId` | No handler can construct a query without it | A layer to maintain |
| Row-level security in the database | The database refuses cross-tenant reads | Session variable per connection; harder with pooling |

```sql
-- Postgres RLS: the guarantee lives below the application.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::bigint);
```

Row-level security is the answer that impresses in an interview, with the honest caveat: it requires
setting a session variable on each connection, which interacts badly with transaction-mode
connection pooling. Say the caveat.

## OAuth Scopes Are Not Permissions

A scope says what an **application** was allowed to ask for on the user's behalf. A permission says
what the **user** may do. A token with `orders:write` does not mean this user may write this order.

```typescript
// Both checks, in order: the client's scope, then the user's permission on the object.
if (!token.scope.includes('orders:write')) return res.status(403).json({ error: { code: 'insufficient_scope' } });
if (!(await canEdit(req.user, order))) return res.status(403).json({ error: { code: 'forbidden' } });
```

Treating a scope as a permission is how an integration granted read access to one resource ends up
able to write to everything.

## Policy Engines

Past a few dozen rules, the decision logic wants to live outside the handlers. A policy engine —
OPA with Rego, Cedar, or an internal equivalent — gives you rules as data: versioned, testable, and
changeable without a deploy.

| Signal | Meaning |
| ------ | ------- |
| Rules change more often than code | ✅ Externalise the policy |
| Non-engineers need to read or audit the rules | ✅ Externalise |
| Several services must reach the same decision | ✅ Externalise |
| One service, one team, a dozen rules | ❌ Keep it in code — the engine costs more than it saves |

> ⚠️ A remote policy decision on every request adds a network hop to your hot path. Evaluate
> locally with a distributed policy bundle, or cache decisions with a short TTL and an explicit
> invalidation path.

## Common Mistakes

**❌ Authorising on the route and not the object.** The single most common real vulnerability.

**❌ Checking roles instead of permissions.** Every new role becomes a codebase-wide audit.

**❌ Trusting a client-supplied `tenantId` or `userId`.** Both come from the verified token, never
from the body or the query string.

**❌ Deciding on the client.** Hiding a button is user experience, not authorisation. Every check is
repeated on the server.

**❌ Failing open.** If the policy lookup errors, deny. A permissive default is a vulnerability with
a plausible excuse.

## 🔑 Key Takeaways

- Authentication is a property of the request; authorisation is a property of the request and the object together.
- Map roles to permissions and check permissions — never a role name in a handler.
- Put the tenant and owner in the query so a forgotten check returns nothing rather than everything.
- Return 404 rather than 403 when the caller should not learn the object exists.
- An OAuth scope is what the application may ask for, not what the user may do; check both.

## Interview Questions

**Q: What is broken object-level authorisation, and how do you prevent it structurally?**

It is checking that the caller is authenticated, and that their role permits the action in general,
but never checking that this specific object is theirs — so changing an id in the URL reads someone
else's data. The structural fix is to make ownership part of the query, ideally through a repository
layer or row-level security, so that omitting the check yields no rows instead of the wrong rows.

**Q: RBAC or ABAC?**

RBAC while the permission set is small and stable — it is simple to reason about and easy to audit.
ABAC as soon as requirements mention conditions: own department, business hours, under a value
threshold. In practice you combine them, using roles for the coarse grant and attributes for the
conditions, because pure ABAC becomes hard for anyone to reason about.

**Q: 403 or 404 for a resource the user may not see?**

404 when the caller should not learn the resource exists — a 403 on sequential ids lets an attacker
enumerate your data volume and, sometimes, infer relationships. 403 when they already legitimately
know it exists, such as a document shared with their team that they may read but not edit, because
there a 404 is actively confusing.

## What to Read Next

- [Chapter ?? — Sessions and JWTs](#ch-jwt) — establishing the identity these checks depend on
- [Chapter ?? — Input Validation and Injection](#ch-backend-input-validation) — the other half of trusting a request
- [Chapter ?? — REST API Best Practices](#ch-rest-best-practices) — where the 403 and 404 sit in the status code map
