---
sourceHash: "512858c87be20c28c2f51505f882d8ec1aaebce1ed08b13135bf12872267329f"
title: "MCP (Model Context Protocol)"
translatedAt: "2026-10-19T08:00:30.408Z"
model: "claude-opus-5-5 (Claude Code)"
---

# MCP (Model Context Protocol) {#ch-model-context-protocol}

> প্রতিটি application-এর জন্য একই tool adapter বারবার লেখা বন্ধ করুন, আর জেনে নিন কখন একটি server বানানো সত্যিই লাভের।

**এই অধ্যায়ে:** যে N×M সমস্যার সমাধান করে · client, server আর transport · server কী কী দেয় · server-এর সঙ্গে যুক্ত হওয়া · কখন বানাবেন · trust boundary

## 💡 মূল ধারণা

MCP আসার আগে, যে application-ই চাইত model আপনার issue tracker-এ পৌঁছাক, সেই application নিজের adapter লিখত। পাঁচটি application
আর আটটি system মানে চল্লিশটি adapter, সবগুলো একই কাজ করছে, আলাদা আলাদা ভাবে। **MCP এই N×M সমস্যাকে N+M বানিয়ে
দেয়। প্রতিটি system একটি করে server দেয়। প্রতিটি application একটিই client protocol বোঝে।**

Language Server Protocol ঠিক এই কাজটাই করেছিল, আর interview-এ তুলনাটা নাম ধরে বলাই ভালো। LSP editor-গুলোকে
language বিশ্লেষণে বেশি দক্ষ করেনি। শুধু প্রতিটি editor-কে প্রতিটি language-এর জন্য সেটা নতুন করে বানানো থেকে
রেহাই দিয়েছে। তেমনি MCP model-কে tool ব্যবহারে বেশি দক্ষ করে না। Tool নিজের পরিচয় কীভাবে দেবে, শুধু সেটার একটি
মান ঠিক করে দেয়।

> MCP হলো plumbing, বুদ্ধি নয়। Adapter কে লিখবে, সেটা বদলায়। Model কী করতে পারে, সেটা বদলায় না।

## কীভাবে কাজ করে

### তিনটি ভূমিকা

| ভূমিকা | কী | উদাহরণ |
| --- | --- | --- |
| **Host** | যে application-এর সঙ্গে user কাজ করেন | একটি IDE, একটি chat product, আপনার assistant |
| **Client** | একটি server-এর সঙ্গে host-এর connection | প্রতি server-এ একটি, host সামলায় |
| **Server** | যে process protocol দিয়ে নিজের ক্ষমতাগুলো দেয় | একটি docs server, একটি database server |

একটি host অনেক client চালায়, প্রতি server-এ একটি করে। Model নিজে এই ছবিতে একেবারেই নেই। Host তার client-গুলো
থেকে tool definition জোগাড় করে, আর সেগুলো সাধারণ tool definition হিসেবেই model call-এ পাঠায়। ফলে
[Chapter ?? — Tool Calling ও Tool Surface](#ch-tool-calling)-এর সব কথা নিচের স্তরে এখনো খাটে।

### Server কী কী দেয়

| Primitive | জিনিসটা কী | কার নিয়ন্ত্রণে |
| --- | --- | --- |
| **Tools** | যে function model call করতে পারে | Model-এর, host-এর মাধ্যমে |
| **Resources** | পড়ার মতো content, URI দিয়ে চিহ্নিত | Application-এর |
| **Prompts** | বারবার ব্যবহারযোগ্য template করা নির্দেশ | User-এর, সাধারণত একটি command হিসেবে |

এই ভাগটা গুরুত্বপূর্ণ, অথচ অনেকেই খেয়াল করেন না। Tool চালায় model, আর tool কিছু বদলে দিতে পারে। Resource ঠিক
করে application, আর সেটা read-only: একটি file, একটি table, একটি document। **Resource জুড়ে দেওয়া আর model-কে tool
call করতে দেওয়া এক জিনিস নয়।** দুটিকে গুলিয়ে ফেললে একটি read-only integration এমন write access পেয়ে যায়, যা কেউ
review করেনি।

### Transport

```text
stdio  →  local process, same machine, no network
http   →  remote server, streamable HTTP, needs auth
```

**Transport দুটি, আর কোনটা নেবেন সেটা আসলে networking-এর নয়, security-র প্রশ্ন।**

`stdio` server-কে child process হিসেবে চালায়, আর standard input-output দিয়ে কথা বলে। Local tooling-এর জন্য এটাই
ঠিক, যেমন file server বা local database। যিনি এটা চালু করেছেন, তাঁর সব permission এটা পেয়ে যায়।

Streamable HTTP হলো remote server-এর জন্য, আর remote মানেই যা যা লাগে, সবই এর সঙ্গে আসে: authentication,
transport security, rate limit আর audit trail। HTTP MCP server আসলে tool-এর আকারে বর্ণনা দেওয়া একটি public API,
আর public API-র সব control এরও লাগে।

### Server-এর সঙ্গে যুক্ত হওয়া

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

এই snippet-এ দুটি জিনিস খেয়াল করার মতো। প্রথমত, tool **runtime-এ খুঁজে পাওয়া যায়**, তাই আপনার application-এর
দুটি deploy-এর মাঝে server যা দেয় তা বদলে যেতে পারে। Iteration-এর জন্য এটা সুবিধা, আবার এ কারণেই যার ওপর নির্ভর
করেন তার version pin করা উচিত। দ্বিতীয়ত, spread দিয়ে tool set মেলালে পরের server একই নামের আগের tool-কে চুপচাপ
মুছে নিজেরটা বসিয়ে দেয়। তাই namespace দিন, মানে প্রতিটি নামের আগে তার server-এর নাম জুড়ে দিন।

> ⚠️ **যা বদলাতে থাকে:** এই অধ্যায় লেখা হয়েছে **MCP revision 2025-11-25** ধরে। Specification আর client
> package দুটিই কয়েক মাসের মধ্যে বদলায়। SSE transport ইতিমধ্যে legacy হয়ে গেছে, তার জায়গা নিয়েছে streamable
> HTTP। যা টিকে থাকবে, তা হলো তিনটি primitive আর client/server-এর ভাগ। Implement করার আগে বর্তমান revision দেখে নিন।

### কখন বানানো লাভের

| পরিস্থিতি | Server বানাবেন? | কেন |
| --- | --- | --- |
| একটি application, tool আপনার নিয়ন্ত্রণে | ❌ না | Code-এই define করুন; protocol এখানে শুধু বাড়তি বোঝা |
| কয়েকটি application, একটি internal system | ✅ হ্যাঁ | ঠিক এটাই N×M |
| বাইরের লোকেরা আপনার product-এ পৌঁছাবে | ✅ হ্যাঁ | Tool-এর আকারে একটি public integration surface |
| এমন server আগে থেকেই আছে | ❌ সেটাই ব্যবহার করুন | অন্যের server audit করা নিজেরটা লেখার চেয়ে সস্তা |
| অল্পদিনের prototype | ❌ না | এমন process boundary, যা এখনো দরকার নেই |

সৎ default উত্তর হলো, না। Repo-র ভেতরে পাঁচটি tool আছে এমন একটি application protocol থেকে কিছুই পায় না, শুধু
একটি process পাহারা দেওয়ার দায় আর একটি schema মিলিয়ে রাখার ঝামেলা ছাড়া।

### Trust boundary

MCP server এমন code, যা আপনি লেখেননি। এটা tool-এর বর্ণনা দেয় এমন text-এ, যা model পড়বে, আর আপনি যে credential
দিয়েছেন তা নিয়েই চলে। এই প্রতিটি তথ্যই একটি করে ঝুঁকি।

- **Tool-এর বর্ণনা আসলে prompt text।** খারাপ উদ্দেশ্যের একটি server এমন বর্ণনা লিখতে পারে, যা model-কে বলে কোনো
  argument-এর ভেতরে context exfiltrate করতে, মানে চুপিসারে বাইরে পাচার করতে। শুধু code নয়, বর্ণনাও review করুন।
- **Server যা দেয় তা বদলাতে পারে।** Runtime-এ খুঁজে পাওয়া tool আপনার review করা tool-এর থেকে আলাদা হতে পারে। যার
  ওপর নির্ভর করেন, তার version pin করুন।
- **Local server user-এর permission পায়।** Developer-এর machine থেকে চালু হওয়া `stdio` server সেই developer যা
  পড়তে পারেন, সবই পড়তে পারে, disk-এ রাখা credential-ও।
- **Server জোড়া দিলে তাদের নাগালও জোড়া লাগে।** একটি server private data পড়তে পারে, আরেকটি public-এ post করতে
  পারে। দুটি একসঙ্গে থাকলে exfiltration-এর এমন পথ তৈরি হয়, যা আলাদা আলাদা কোনোটারই নেই।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন |
| --- | --- |
| আপনার application, আপনার tool, একটি codebase | সাধারণ tool definition |
| একই integration চায় তিনটি internal app | একটি MCP server |
| কোনো assistant-কে চালু একটি ecosystem-এ যুক্ত করা | একটি MCP client |
| সাধারণভাবে AI application-গুলোর কাছে আপনার product খুলে দেওয়া | একটি MCP server, public API-র মতো করে সামলানো |

## সাধারণ ভুল

**❌ একজন মাত্র ব্যবহারকারীর জন্য server বানানো**

> Protocol-টা N×M-এর সমাধান। N=1 হলে আপনি শুধু একটি process, একটি schema আর একটি version-এর রক্ষণাবেক্ষণের দায় বাড়ালেন।

**❌ Code দেখতে ঠিক লাগছে বলে বাইরের server-কে বিশ্বাস করা**

> Tool-এর বর্ণনা model-এর কাছে নির্দেশ হিসেবে পৌঁছায়। Injection surface সেটাই, আর বেশিরভাগ team যে code review
> চালায়, তাতে এটা ধরা পড়ে না।

**❌ কয়েকটি server-এর tool set namespace ছাড়া মিলিয়ে ফেলা**

> একই নাম চুপচাপ ধাক্কা খায়, আর শেষেরটাই জেতে। তখন model এমন tool call করে, যা আপনি আশা করেননি।

**✅ Remote MCP server-কে সেই সব control দিন, যা যেকোনো public API-কে দিতেন**

> Authentication, প্রতিটি caller-এর জন্য আলাদা rate limit, least-privilege credential, আর প্রতিটি tool call-এর
> audit log। এটা একটি API। Tool-এর আকারে বর্ণনা থাকলেও সেটা বদলায় না।

## 🔑 মূল শিক্ষা

- Tool কীভাবে নিজের বর্ণনা দেবে, MCP তার একটি মান ঠিক করে দেয়, ফলে N×M integration হয়ে যায় N+M।
- Host প্রতি server-এ একটি করে client চালায়। Model দেখে সাধারণ tool definition, protocol সম্পর্কে কিছুই জানে না।
- Tool চালায় model, আর tool কাজ করতে পারে। Resource ঠিক করে application, আর সেটা read-only। দুটিকে গুলিয়ে ফেলবেন না।
- বাইরের server-এর tool বর্ণনা হলো অবিশ্বস্ত prompt text, যা সরাসরি আপনার model-এ পৌঁছায়।
- কয়েকটি application-এর একই integration লাগলে server বানান; নইলে tool code-এই define করুন।

## Interview-এর প্রশ্ন

**Q: MCP আসলে কোন সমস্যার সমাধান করে?**

একই adapter বারবার লেখার সমস্যা। আগে যে application-ই চাইত model কোনো system-এ পৌঁছাক, সেটাই নিজের integration
লিখত। পাঁচটি application আর আটটি system মানে চল্লিশটি adapter। MCP একটি protocol ঠিক করে দেয়, তাই প্রতিটি system
দেয় একটি server আর প্রতিটি application দেয় একটি client। Language Server Protocol-এর যুক্তিটাই এখানে tool-এর
ক্ষেত্রে খাটানো হয়েছে। এতে model বেশি বুদ্ধিমান হয় না। শুধু সবাইকে একই জোড়াতালির code বারবার লেখা থেকে রেহাই দেয়।

**Q: আপনার team-এর internal API-র জন্য কি MCP server বানাবেন?**

শুধু তখনই, যখন একাধিক application-এর এটা লাগে। ব্যবহারকারী একটি হলে repo-র ভেতরের tool definition সহজ, দ্রুত,
আর type-check করাও সহজ। Protocol সেখানে শুধু একটি process boundary আর মিলিয়ে রাখার মতো একটি schema যোগ করে।
দ্বিতীয় আর তৃতীয় application একই integration চাইলে হিসাবটা উল্টে যায়। ধরুন একটি chat product, একটি IDE আর একটি
support tool। তখন তিনটি adapter-এর চেয়ে একটি server ভালো।

**Q: বাইরের MCP server-এর সঙ্গে যুক্ত হওয়ার security ঝুঁকি কী?**

এর tool বর্ণনা হলো prompt text, যা সোজা model-এর context-এ যায়। একটি server নিরীহ দেখতে tool-এর বর্ণনায় লুকানো
নির্দেশ রাখতে পারে। সেই নির্দেশ model-কে conversation-এর অন্য জায়গার data চালান করে দিতে ঠেলে দেয়। Server-এর
source code review করে এটা ধরা যায় না, কারণ payload-টা থাকে বর্ণনায়। আরও ধারালো রূপ হলো server জোড়া দেওয়া।
একটি private data পড়ে আর একটি বাইরে post করতে পারে, এমন দুটি মিলে exfiltration-এর পথ তৈরি হয়, যা আলাদাভাবে
কোনোটারই নেই।

**Q: Tool আর resource-এ পার্থক্য কী, আর তাতে কী আসে যায়?**

Tool call করে model, আর tool-এর side effect থাকতে পারে। Resource হলো সেই content, যা application নিজে বেছে জুড়ে
দেয়। এটা URI দিয়ে চিহ্নিত, আর read-only। পার্থক্যটা ঠিক করে নিয়ন্ত্রণ কার হাতে। Resource জুড়ে দেওয়া মানে model কী
দেখবে, তা application ঠিক করছে। Tool খুলে দেওয়া মানে model-কে কাজ করার ক্ষমতা দেওয়া। দুটিকে এক ভাবলে একটি
read-only integration এমন write access পেয়ে যায়, যাতে কেউ সই করেনি।

**Q: MCP server দিয়ে একটি tool call ব্যর্থ হয়েছে। কোথায় দেখবেন?**

যেকোনো tool call-এর মতো একই জায়গায়, সঙ্গে আরেকটি। আগে transport: process কি বেঁচে আছে, HTTP endpoint কি
authenticate করছে? তারপর schema, কারণ argument-কে এখনো validate হতে হয়। তারপর বর্ণনা, কারণ model বোঝা যায় এমন
কোনো কারণেই ভুল tool call করে থাকতে পারে। বাড়তি জায়গাটা হলো version drift। Tool runtime-এ খুঁজে পাওয়া যায়, তাই
server হয়তো এমন কিছু দিচ্ছে, যা আপনার review করা জিনিস থেকে আলাদা।

## এরপর কী পড়বেন

- [Chapter ?? — Tool Calling ও Tool Surface](#ch-tool-calling) — MCP যে ব্যবস্থার মান ঠিক করে, আর কী থাকলে একটি tool বর্ণনা কাজ করে
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — tool-এর বর্ণনা কেন একটি attack surface
