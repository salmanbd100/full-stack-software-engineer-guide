---
title: Express
part: 5
chapter: 0
slug: express
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-07
tags: [express, node, middleware, http, backend]
in_book: true
---

# Express {#ch-express}

> Read an Express app as an ordered pipeline, type the handlers properly, and know what Express deliberately does not give you.

**In this chapter:** the pipeline as the whole mental model · what Express 5 changed · typing handlers and errors · routers as composition · what you have to add yourself

## 💡 The Core Idea

Express is a **list of functions run in order against one mutable request**. That is the entire model.
There is no dependency container, no lifecycle, no request scope. `app.use` pushes a function onto a
list; a request walks the list from the top until something calls `res.send` or the list runs out.

Understanding it as a list explains almost every Express bug. A body parser registered after the route
means `req.body` is undefined. An auth check registered after the handler means the handler already
ran. Nothing is wired up declaratively, so **registration order is the configuration.**

That minimalism is also why Express is still the reference framework in interviews. It hides nothing,
so an interviewer can ask what happens between the socket and your handler and expect a real answer.

## How It Works

Every middleware has the same shape: take the request, optionally change it, then either respond or
call `next()`.

**A pipeline in registration order:**

```typescript
import express, { type Request, type Response, type NextFunction } from "express";

const app = express();

app.use(express.json({ limit: "100kb" })); // 1. parse the body — before any route needs it
app.use(requestId); // 2. attach an id used by every log line below
app.use("/api", authenticate); // 3. path-scoped: /api only
app.get("/api/orders/:id", getOrder); // 4. the route
app.use(notFound); // 5. nothing matched
app.use(errorHandler); // 6. four arguments — the error pipeline
```

Steps 5 and 6 are last because Express reaches them only after everything above declined to respond.
Register them first and your API returns 404 for every valid route.

### Typing a handler without repeating yourself

`Request` is generic over params, response body, request body and query. Naming those once is what
turns Express from untyped into checkable.

```typescript
interface OrderParams {
  id: string;
}
interface OrderBody {
  quantity: number;
}

// Params, response body, request body — in that order.
async function getOrder(
  req: Request<OrderParams, Order, OrderBody>,
  res: Response<Order>,
  next: NextFunction,
): Promise<void> {
  const order = await orders.find(req.params.id); // req.params.id is string, not any
  if (!order) {
    next(new NotFoundError("order", req.params.id));
    return;
  }
  res.json(order);
}
```

Two habits worth keeping. Return `Promise<void>`, never the result of `res.json()` — returning a
`Response` makes the handler ineligible for some middleware signatures. And `return` after calling
`next()`, because `next()` does not stop your function.

### What Express 5 changed

> ⚠️ **Moving target:** Express 5 shipped in 2024 after a decade of 4.x, and most tutorials online are
> still 4.x. The durable principle is that Express is a middleware list; the two changes below are the
> ones that break real code on upgrade. Check the migration guide for the rest.

| Change | Consequence |
| ------ | ----------- |
| A rejected promise from a handler is forwarded to `next()` automatically | `asyncHandler` wrappers and `.catch(next)` are no longer needed |
| Wildcards must be named — `'*'` is gone, `'/*splat'` replaces it | `app.all('*')` throws on boot. Catch-all routes need rewriting |

The first is the one to name in an interview. In Express 4 an `async` handler that threw left the
request hanging until the client timed out, because the rejection had nowhere to go. In Express 5 the
router inspects the return value and calls `next(error)` on rejection, so a thrown error reaches your
error middleware the same way a synchronous one does.

### The error handler is defined by its arity

Express identifies error middleware by counting parameters: **exactly four**, or it is treated as
ordinary middleware and never sees the error.

```typescript
// Four parameters. `next` is unused and must still be declared.
function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const status = err instanceof HttpError ? err.status : 500;

  // Log the cause with the request id; return a body that leaks nothing.
  req.log.error({ err, requestId: req.id }, "request failed");

  res.status(status).json({
    error: status === 500 ? "Internal Server Error" : (err as HttpError).message,
  });
}
```

One error handler at the bottom of the app, and handlers that throw or call `next(err)`. That gives
one place where status codes and response shapes are decided — see
[Chapter ?? — Error Handling in Node](#ch-nodejs-error-handling) for the operational-versus-programmer
error split this depends on.

### Routers are the only composition Express offers

A `Router` is a mountable pipeline with the same interface as the app. That is how a large Express
codebase stays navigable.

```typescript
// routes/orders.ts — owns everything under /orders, including its own middleware
export const orders = express.Router();
orders.use(requireScope("orders:read"));
orders.get("/:id", getOrder);
orders.post("/", requireScope("orders:write"), validate(CreateOrder), createOrder);

// app.ts
app.use("/api/orders", orders);
```

Mount the router with the prefix, and keep the prefix out of the router. The router then has no
opinion about where it lives, which is what makes it testable in isolation.

### What Express does not do

This is the part candidates miss, and it is the honest answer to "why would you pick something else".

| Concern | Express gives you | You add |
| ------- | ----------------- | ------- |
| Validation | Nothing | A schema validator — see [Chapter ?? — Input Validation and Injection](#ch-backend-input-validation) |
| Structured config and wiring | Nothing | Manual composition, or a framework with a container |
| Serialisation | `JSON.stringify` | Explicit response mappers, so internal fields cannot leak |
| Observability | Nothing | Request ids, logging and tracing middleware |
| Type safety across the wire | Nothing | A typed contract — see [Chapter ?? — tRPC and Typed APIs](#ch-trpc) |

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| A backend-for-frontend beside a React or Next.js app | Express | Small surface, and the whole team can read it |
| A service with 5+ domains and several teams | NestJS | Structure you would otherwise invent — [Chapter ?? — NestJS](#ch-nestjs) |
| Deploying to an edge or worker runtime | Hono | Express needs Node APIs — [Chapter ?? — Edge Runtimes and Hono](#ch-edge-runtimes) |
| Throughput-bound JSON API on Node | Fastify | Faster serialisation and schema-driven routes |
| A Next.js app that needs a few endpoints | Neither | Route handlers already are the server — [Chapter ?? — Route Handlers and the BFF](#ch-route-handlers-and-the-bff) |

## Common Mistakes

❌ **Registering the body parser after the routes.** `req.body` is `undefined` and the cause is
invisible in the handler.
✅ Parsers first, routes next, 404 and error handlers last.

❌ **An error handler with three parameters.** Express treats it as normal middleware, the error
passes straight through, and the client gets Express's default HTML stack trace.
✅ Declare all four parameters even when `next` is unused.

❌ **Responding twice.** Calling `next()` after `res.json()` runs the rest of the pipeline against a
finished response and logs `ERR_HTTP_HEADERS_SENT`.
✅ `return` immediately after responding.

❌ **Doing CPU work in a handler.** One synchronous loop blocks every other request on the process,
because there is one thread — see [Chapter ?? — The Event Loop and Async Node](#ch-event-loop-async).
✅ Move it to a worker thread or a queue.

❌ **Trusting `req.body` because it is typed.** The generic is a claim you made, not a check.
✅ Validate at the boundary and derive the type from the schema.

## 🔑 Key Takeaways

- Express is an ordered list of functions over one mutable request; registration order is the configuration.
- Express 5 forwards rejected promises to `next()`, which removes the `asyncHandler` wrapper for good.
- Error middleware is recognised by having exactly four parameters, not by where it sits.
- Routers are Express's only composition tool — mount them with the prefix and keep the prefix out.
- Express deliberately omits validation, wiring and serialisation, so every project adds its own.

## Interview Questions

**Q: An async Express handler throws and the client hangs. What happened?**

That is Express 4 behaviour: the router called the handler, got a promise back, and ignored it, so the
rejection had nowhere to go and the response was never written. The fixes are `.catch(next)`, a wrapper
that does it for you, or upgrading to Express 5, where the router forwards rejections to `next()`
itself. Naming the version is the part that shows you have hit it in production.

**Q: How do you make sure every error response has the same shape?**

One error-handling middleware at the bottom of the app, and handlers that only throw. The handler
decides what went wrong; the middleware decides the status code and the body. Anything that formats an
error inside a route guarantees the shapes drift apart, and the client ends up parsing three different
error formats.

**Q: Where would you put authentication?**

As path-scoped middleware mounted above the routes that need it — typically on the router, so the
requirement lives next to the routes it protects rather than in a global list someone has to
cross-reference. Global for genuinely everything, and never after the routes, because middleware
registered below a matching route never runs.

**Q: When would you not use Express?**

When the runtime is not Node — Express depends on Node's `http` module, so an edge or worker
deployment needs a Web-standards framework instead. Also when the team is large enough that the lack
of structure costs more than the simplicity buys; that is the argument for NestJS. For a
backend-for-frontend beside a React app, Express is still the right size.

## What to Read Next

- [Chapter ?? — NestJS](#ch-nestjs) — the same pipeline with modules, dependency injection and structure enforced
- [Chapter ?? — Error Handling in Node](#ch-nodejs-error-handling) — what belongs in the error handler this chapter registers
- [Chapter ?? — REST API Best Practices](#ch-rest-best-practices) — the contract those routes should expose
