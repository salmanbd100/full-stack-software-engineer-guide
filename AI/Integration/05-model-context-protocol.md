---
title: MCP (Model Context Protocol)
part: 7
chapter: 0
slug: model-context-protocol
level: advanced
reading_time: 11
updated: 2026-09-07
tags: [ai, mcp, protocol, tools, integration, typescript]
in_book: true
---

# MCP (Model Context Protocol) {#ch-model-context-protocol}

> Stop writing the same tool adapter for every application, and know when a server is worth building.

**In this chapter:** the N×M problem it solves · clients, servers and transports · what a server exposes · connecting one · when to build one · the trust boundary

## 💡 The Core Idea

Before MCP, every application that wanted the model to reach your issue tracker wrote its own adapter.
Five applications and eight systems meant forty adapters, all doing the same thing differently. **MCP
turns that N×M problem into N+M: each system exposes one server, each application speaks one client
protocol.**

It is the same move as the Language Server Protocol, and worth naming that way in an interview. LSP did
not make editors better at language analysis; it stopped every editor reimplementing it for every
language. MCP does not make models better at using tools. It standardises how a tool describes itself.

> MCP is plumbing, not intelligence. It changes who writes the adapter, not what the model can do.

## How It Works

### Three roles

| Role | Is | Example |
| --- | --- | --- |
| **Host** | The application the user interacts with | An IDE, a chat product, your assistant |
| **Client** | The connection the host holds to one server | One per server, managed by the host |
| **Server** | A process exposing capabilities over the protocol | A docs server, a database server |

A host runs many clients, one per server. The model itself is not in this picture at all — the host
collects tool definitions from its clients and passes them into the model call as ordinary tool
definitions. Everything from [Chapter ?? — Tool Calling](#ch-tool-calling) still applies underneath.

### What a server exposes

| Primitive | What it is | Controlled by |
| --- | --- | --- |
| **Tools** | Functions the model can call | The model, via the host |
| **Resources** | Readable content, addressed by URI | The application |
| **Prompts** | Reusable templated instructions | The user, usually as a command |

The split matters and is often missed. Tools are model-driven and can have effects. Resources are
application-driven and read-only — a file, a table, a document. **Attaching a resource is not the same as
letting the model call a tool**, and blurring the two is how a read-only integration acquires write
access nobody reviewed.

### Transports

```text
stdio  →  local process, same machine, no network
http   →  remote server, streamable HTTP, needs auth
```

**Two transports, and the choice is really a security question, not a networking one.**

`stdio` launches the server as a child process and speaks over standard input and output. It is the right
choice for local tooling — a file server, a local database — and it inherits the permissions of whoever
started it.

Streamable HTTP is for remote servers and brings everything remote implies: authentication, transport
security, rate limits, and an audit trail. An HTTP MCP server is a public API with a tool-shaped
description, and it needs the controls of one.

### Connecting to a server

```typescript
import { createMCPClient } from '@ai-sdk/mcp';
import { generateText, isStepCount } from 'ai';

const client = await createMCPClient({
  transport: { type: 'http', url: 'https://internal.example.com/mcp', headers: { Authorization: bearer } },
});

try {
  const mcpTools = await client.tools();   // discovered at runtime, not compiled in
  const { text } = await generateText({
    model: 'anthropic/claude-sonnet-4.6',
    tools: { ...mcpTools, ...localTools },
    stopWhen: isStepCount(6),
    messages,
  });
} finally {
  await client.close();
}
```

Two things in that snippet deserve attention. Tools are **discovered at runtime**, so a server can change
what it offers between deployments of your application — good for iteration, and a reason to pin
versions for anything you depend on. And merging tool sets by spread means a later server silently
overrides an earlier server's identically named tool. Namespace them.

> ⚠️ **Moving target:** this chapter is stamped against **MCP revision 2025-11-25**, and both the
> specification and the client packages move on a scale of months — the SSE transport is already legacy
> in favour of streamable HTTP. The durable principle is the three primitives and the client/server
> split. Check the current revision before implementing.

### When building one is worth it

| Situation | Build a server? | Why |
| --- | --- | --- |
| One application, tools you control | ❌ No | Define them in code; the protocol is pure overhead |
| Several applications, one internal system | ✅ Yes | This is exactly N×M |
| Third parties should reach your product | ✅ Yes | A tool-shaped public integration surface |
| An existing server does it | ❌ Use it | Auditing someone's server is cheaper than writing yours |
| A short-lived prototype | ❌ No | A process boundary you do not need yet |

The honest default is no. A single application with five in-repo tools gets nothing from a protocol
except a process to supervise and a schema to keep in sync.

### The trust boundary

An MCP server is code you did not write, describing tools in text the model will read, running with
whatever credentials you gave it. Every one of those clauses is a risk.

- **Tool descriptions are prompt text.** A malicious server can write a description that instructs the
  model to exfiltrate context into an argument. Review descriptions, not just code.
- **Servers can change what they expose.** Tools discovered at runtime can differ from the ones you
  reviewed. Pin versions for anything you depend on.
- **A local server has the user's permissions.** A `stdio` server started from a developer machine can
  read whatever that developer can read, including credentials on disk.
- **Combining servers combines their reach.** A server that reads private data plus a server that can
  post publicly is an exfiltration path neither one has alone.

## When to Use It

| Scenario | Reach for |
| --- | --- |
| Your application, your tools, one codebase | Plain tool definitions |
| Same integration wanted by three internal apps | An MCP server |
| Connecting an assistant to an existing ecosystem | An MCP client |
| Exposing your product to AI applications generally | An MCP server, treated as a public API |

## Common Mistakes

**❌ Building a server for one consumer**

> The protocol solves N×M. With N=1 you have added a process, a schema and a version to maintain.

**❌ Trusting a third-party server because the code looks fine**

> The tool descriptions reach the model as instructions. That is the injection surface, and it is not in
> the code review most teams run.

**❌ Merging tool sets from several servers without namespacing**

> Identical names collide silently and the last one wins. The model then calls a tool you did not expect.

**✅ Give a remote MCP server the controls you would give any public API**

> Authentication, per-caller rate limits, least-privilege credentials, and an audit log of every tool
> invocation. It is an API; the tool-shaped description does not change that.

## 🔑 Key Takeaways

- MCP standardises how tools describe themselves, turning N×M integrations into N+M.
- A host runs one client per server; the model sees ordinary tool definitions and knows nothing about the protocol.
- Tools are model-driven and can act; resources are application-driven and read-only — do not conflate them.
- Tool descriptions from a third-party server are untrusted prompt text reaching your model.
- Build a server when several applications need the same integration; otherwise define tools in code.

## Interview Questions

**Q: What problem does MCP actually solve?**

Adapter duplication. Every application that wanted a model to reach a given system used to write its own
integration, so five applications and eight systems meant forty adapters. MCP defines one protocol, so
each system ships one server and each application ships one client. It is the Language Server Protocol
argument applied to tools — it does not make the model smarter, it stops everyone rewriting the same
glue.

**Q: Would you build an MCP server for your team's internal API?**

Only if more than one application needs it. With a single consumer, in-repo tool definitions are simpler,
faster and easier to type-check, and the protocol only adds a process boundary and a schema to keep in
sync. The moment a second and third application want the same integration — a chat product, an IDE, a
support tool — the arithmetic flips and one server beats three adapters.

**Q: What is the security risk in connecting to a third-party MCP server?**

That its tool descriptions are prompt text going straight into the model's context. A server can describe
a benign-looking tool with instructions that steer the model into passing along data from elsewhere in
the conversation, and reviewing the server's source code does not catch it because the payload is in the
description. Combining servers is the sharper version: one that reads private data and one that can post
externally form an exfiltration path that neither has alone.

**Q: How do tools and resources differ, and why does it matter?**

Tools are invoked by the model and can have side effects. Resources are content the application chooses
to attach, addressed by URI and read-only. The distinction matters because it decides who is in control:
attaching a resource is the application deciding what the model sees, while exposing a tool is granting
the model the ability to act. Treating them the same is how a read-only integration acquires write
access nobody signed off on.

**Q: A tool call through an MCP server fails. Where do you look?**

The same places as any tool call, plus one. Transport first — is the process alive, is the HTTP endpoint
authenticating. Then the schema, because arguments still have to validate. Then the description, since
the model may be calling the wrong tool for an understandable reason. The extra place is version drift:
tools are discovered at runtime, so the server may be exposing something different from what was
reviewed.

## What to Read Next

- [Chapter ?? — Tool Calling](#ch-tool-calling) — the mechanism MCP standardises the description of
- [Chapter ?? — Designing the Tool Surface](#ch-designing-the-tool-surface) — what makes a tool description work
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — why a tool description is an attack surface
