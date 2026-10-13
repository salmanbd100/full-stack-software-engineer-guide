---
sourceHash: "512858c87be20c28c2f51505f882d8ec1aaebce1ed08b13135bf12872267329f"
title: "MCP (Model Context Protocol)"
translatedAt: "2026-10-12T12:28:10.308Z"
model: "claude-opus-5-5 (Claude Code)"
---

# MCP (Model Context Protocol) {#ch-model-context-protocol}

> প্রতিটি application-এর জন্য একই tool adapter বারবার লেখা বন্ধ করুন, আর জানুন কখন একটি server বানানো সার্থক।

**এই অধ্যায়ে:** যে N×M সমস্যার সমাধান এটা করে · client, server আর transport · একটি server কী expose করে · একটির সঙ্গে connect করা · কখন একটি বানাবেন · trust boundary

## 💡 মূল ধারণা

MCP-র আগে, যে application-ই চাইত model আপনার issue tracker-এ পৌঁছাক, সে নিজের adapter লিখত। পাঁচটি
application আর আটটি system মানে চল্লিশটি adapter, সবাই একই কাজ ভিন্নভাবে করছে। **MCP এই N×M সমস্যাকে
N+M-এ পরিণত করে। প্রতিটি system একটি server expose করে। প্রতিটি application একটি client protocol-এ কথা
বলে।**

এটা Language Server Protocol-এর মতো একই চাল, আর interview-এ এভাবেই নাম ধরে বলা ভালো। LSP editor-দের
language analysis-এ ভালো করেনি। এটা প্রতিটি editor-কে প্রতিটি language-এর জন্য সেটা নতুন করে বানানো থেকে
থামিয়েছে। MCP-ও model-কে tool ব্যবহারে ভালো করে না। এটা ঠিক করে দেয়, একটি tool নিজেকে কীভাবে বর্ণনা করবে।

> MCP হলো plumbing, বুদ্ধি নয়। এটা বদলায় adapter কে লিখবে, model কী করতে পারে তা নয়।

## কীভাবে কাজ করে

### তিনটি role

| Role | কী | উদাহরণ |
| --- | --- | --- |
| **Host** | যে application-এর সঙ্গে user কাজ করেন | একটি IDE, একটি chat product, আপনার assistant |
| **Client** | একটি server-এর সঙ্গে host-এর connection | প্রতি server-এ একটি, host সেটা manage করে |
| **Server** | একটি process, যা protocol-এর মাধ্যমে capability expose করে | একটি docs server, একটি database server |

একটি host অনেকগুলো client চালায়, প্রতি server-এ একটি। Model নিজে এই ছবিতে একেবারেই নেই। Host তার
client-দের কাছ থেকে tool definition জড়ো করে, আর সাধারণ tool definition হিসেবেই model call-এ পাঠায়।
[Chapter ?? — Tool Calling ও Tool Surface](#ch-tool-calling)-এর সবকিছু নিচে এখনো খাটে।

### একটি server কী expose করে

| Primitive | এটা কী | কে নিয়ন্ত্রণ করে |
| --- | --- | --- |
| **Tools** | Function, যেগুলো model call করতে পারে | Model, host-এর মাধ্যমে |
| **Resources** | পড়া যায় এমন content, URI দিয়ে চিহ্নিত | Application |
| **Prompts** | বারবার ব্যবহারযোগ্য template করা instruction | User, সাধারণত একটি command হিসেবে |

এই ভাগটা গুরুত্বপূর্ণ, আর লোকে প্রায়ই এটা মিস করে। Tool চালায় model, আর tool-এর effect থাকতে পারে।
Resource চালায় application, আর সেটা read-only: একটি file, একটি table, একটি document। **একটি resource attach
করা আর model-কে একটি tool call করতে দেওয়া এক জিনিস নয়।** দুটি গুলিয়ে ফেললে একটি read-only integration
এমন write access পেয়ে যায়, যেটা কেউ review করেনি।

### Transport

```text
stdio  →  local process, same machine, no network
http   →  remote server, streamable HTTP, needs auth
```

**Transport দুটি, আর বাছাইটা আসলে security-র প্রশ্ন, networking-এর নয়।**

`stdio` server-কে একটি child process হিসেবে চালু করে, আর standard input ও output দিয়ে কথা বলে। Local
tooling-এর জন্য এটাই ঠিক বাছাই, যেমন একটি file server বা একটি local database। যিনি এটা চালু করেছেন, এটা
তাঁর permission পেয়ে যায়।

Streamable HTTP remote server-এর জন্য, আর remote মানেই যা যা আসে সব নিয়ে আসে: authentication, transport
security, rate limit আর একটি audit trail। একটি HTTP MCP server হলো tool-এর আকারের বর্ণনাসহ একটি public
API, আর এর দরকার একটি public API-র মতোই নিয়ন্ত্রণ।

### একটি server-এর সঙ্গে connect করা

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

ওই snippet-এ দুটি জিনিস খেয়াল করার মতো। Tool **runtime-এ discover হয়**, তাই আপনার application-এর দুটি
deploy-এর মাঝে একটি server তার দেওয়া জিনিস বদলে ফেলতে পারে। এতে iteration সহজ হয়, আর এটাই কারণ যে
যেটার ওপর আপনি নির্ভর করেন, তার version pin করবেন। আরেকটি বিষয়: spread দিয়ে tool set merge করলে পরের
server চুপচাপ আগের server-এর একই নামের tool-কে override করে দেয়। এগুলোকে namespace করুন (প্রতিটি নামের
আগে তার server-এর নাম বসান)।

> ⚠️ **যা বদলাতে থাকে:** এই অধ্যায়টি **MCP revision 2025-11-25** অনুযায়ী লেখা। Specification আর client
> package দুটিই কয়েক মাসের মধ্যে বদলায়। SSE transport এর মধ্যেই legacy, streamable HTTP-র পক্ষে। যে নীতি
> টিকে থাকবে, তা হলো তিনটি primitive আর client/server ভাগ। Implement করার আগে বর্তমান revision দেখে নিন।

### কখন একটি বানানো সার্থক

| পরিস্থিতি | Server বানাবেন? | কেন |
| --- | --- | --- |
| একটি application, tool আপনার নিয়ন্ত্রণে | ❌ না | Code-এ define করুন; protocol পুরোটাই বাড়তি বোঝা |
| কয়েকটি application, একটি internal system | ✅ হ্যাঁ | ঠিক এটাই N×M |
| Third party-রা আপনার product-এ পৌঁছাবে | ✅ হ্যাঁ | Tool-এর আকারের একটি public integration surface |
| একটি existing server কাজটা করে | ❌ সেটাই ব্যবহার করুন | কারও server audit করা নিজেরটা লেখার চেয়ে সস্তা |
| স্বল্প সময়ের একটি prototype | ❌ না | এমন একটি process boundary, যেটা এখনো দরকার নেই |

সৎ default উত্তর হলো না। Repo-র ভেতরে পাঁচটি tool সহ একটি application protocol থেকে কিছুই পায় না, শুধু
একটি process যেটা দেখাশোনা করতে হয়, আর একটি schema যেটা sync রাখতে হয়।

### Trust boundary

একটি MCP server এমন code, যেটা আপনি লেখেননি। এটা tool বর্ণনা করে এমন text-এ, যেটা model পড়বে। আর আপনি
যে credential দিয়েছেন, তা নিয়েই এটা চলে। এর প্রতিটি তথ্যই একটি ঝুঁকি।

- **Tool description হলো prompt text।** একটি ক্ষতিকর server এমন description লিখতে পারে, যেটা model-কে
  একটি argument-এর ভেতরে context exfiltrate (গোপনে বাইরে পাচার) করতে বলে। শুধু code নয়, description-ও
  review করুন।
- **Server তার expose করা জিনিস বদলাতে পারে।** Runtime-এ discover হওয়া tool আপনার review করা tool-এর থেকে
  আলাদা হতে পারে। যেটার ওপর নির্ভর করেন, তার version pin করুন।
- **একটি local server-এর কাছে user-এর permission থাকে।** একজন developer-এর machine থেকে চালু করা `stdio`
  server সেই developer যা পড়তে পারেন সবই পড়তে পারে, disk-এ থাকা credential-সহ।
- **Server জোড়া দিলে তাদের নাগালও জোড়া লাগে।** যে server private data পড়ে, আর যে server public-এ post
  করতে পারে, দুটি মিলে একটি exfiltration পথ তৈরি হয়, যেটা কোনোটার একার নেই।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন |
| --- | --- |
| আপনার application, আপনার tool, একটি codebase | সাধারণ tool definition |
| একই integration তিনটি internal app চায় | একটি MCP server |
| একটি assistant-কে existing ecosystem-এর সঙ্গে connect করা | একটি MCP client |
| আপনার product-কে সাধারণভাবে AI application-দের কাছে expose করা | একটি MCP server, public API হিসেবে গণ্য |

## সাধারণ ভুল

**❌ একজন consumer-এর জন্য server বানানো**

> Protocol N×M-এর সমাধান করে। N=1 হলে আপনি শুধু একটি process, একটি schema আর একটি version যোগ করলেন, যেগুলো
> maintain করতে হবে।

**❌ Code ঠিক দেখাচ্ছে বলে একটি third-party server-কে বিশ্বাস করা**

> Tool description model-এর কাছে instruction হিসেবে পৌঁছায়। Injection surface সেটাই, আর বেশিরভাগ team যে
> code review করে, তাতে এটা থাকে না।

**❌ Namespace ছাড়াই কয়েকটি server-এর tool set merge করা**

> একই নাম চুপচাপ ধাক্কা খায়, আর শেষেরটা জেতে। তখন model এমন একটি tool call করে, যেটা আপনি আশা করেননি।

**✅ একটি remote MCP server-কে সেই নিয়ন্ত্রণ দিন, যা যেকোনো public API-কে দিতেন**

> Authentication, প্রতি caller-এ rate limit, least-privilege credential, আর প্রতিটি tool invocation-এর একটি
> audit log। এটা একটি API। Tool-এর আকারের description তাতে কিছু বদলায় না।

## 🔑 মূল শিক্ষা

- MCP ঠিক করে দেয় tool নিজেদের কীভাবে বর্ণনা করবে, আর N×M integration-কে N+M-এ পরিণত করে।
- একটি host প্রতি server-এ একটি client চালায়। Model সাধারণ tool definition দেখে, protocol সম্পর্কে কিছুই জানে না।
- Tool চালায় model, আর সেটা কাজ করতে পারে। Resource চালায় application, আর সেটা read-only। দুটি গুলিয়ে ফেলবেন না।
- Third-party server-এর tool description হলো অবিশ্বস্ত prompt text, যা আপনার model-এ পৌঁছায়।
- কয়েকটি application-এর একই integration দরকার হলে server বানান; না হলে tool code-এ define করুন।

## Interview-এর প্রশ্ন

**Q: MCP আসলে কোন সমস্যার সমাধান করে?**

Adapter-এর পুনরাবৃত্তি। যে application-ই চাইত model একটি নির্দিষ্ট system-এ পৌঁছাক, সে নিজের integration
লিখত। পাঁচটি application আর আটটি system মানে চল্লিশটি adapter। MCP একটি protocol define করে, তাই প্রতিটি
system একটি server ship করে আর প্রতিটি application একটি client ship করে। এটা tool-এর ক্ষেত্রে Language
Server Protocol-এর যুক্তি। এটা model-কে বেশি বুদ্ধিমান করে না। এটা সবাইকে একই glue বারবার লেখা থেকে থামায়।

**Q: আপনার team-এর internal API-র জন্য কি একটি MCP server বানাবেন?**

শুধু তখনই, যখন একাধিক application-এর এটা দরকার। একজন consumer থাকলে repo-র ভেতরের tool definition বেশি
সহজ, বেশি দ্রুত, আর type-check করাও সহজ। Protocol শুধু একটি process boundary আর sync রাখার মতো একটি schema
যোগ করে। দ্বিতীয় আর তৃতীয় application যখন একই integration চায়, হিসাব উল্টে যায়। একটি chat product, একটি
IDE আর একটি support tool-এর কথা ভাবুন। তখন তিনটি adapter-এর চেয়ে একটি server ভালো।

**Q: একটি third-party MCP server-এর সঙ্গে connect করার security ঝুঁকি কী?**

এর tool description হলো prompt text, যা সরাসরি model-এর context-এ যায়। একটি server নিরীহ দেখতে একটি tool-কে
লুকানো instruction দিয়ে বর্ণনা করতে পারে। সেগুলো model-কে conversation-এর অন্য জায়গার data পাচার করতে
চালিত করে। Server-এর source code review করলে এটা ধরা পড়ে না, কারণ payload থাকে description-এ। Server জোড়া
দেওয়া এর আরও ধারালো রূপ। একটি private data পড়ে আর একটি বাইরে post করতে পারে, দুটি মিলে এমন একটি
exfiltration পথ তৈরি করে, যেটা কোনোটার একার নেই।

**Q: Tool আর resource-এর পার্থক্য কী, আর সেটা কেন গুরুত্বপূর্ণ?**

Tool invoke করে model, আর tool-এর side effect থাকতে পারে। Resource হলো content, যেটা application attach করা
বেছে নেয়, URI দিয়ে চিহ্নিত আর read-only। পার্থক্যটা ঠিক করে নিয়ন্ত্রণ কার হাতে। Resource attach করা মানে
model কী দেখবে, তা application ঠিক করছে। Tool expose করা মানে model-কে কাজ করার ক্ষমতা দেওয়া। দুটিকে এক
রকম ধরলে একটি read-only integration এমন write access পেয়ে যায়, যেটা কেউ অনুমোদন করেনি।

**Q: একটি MCP server-এর মাধ্যমে একটি tool call fail করছে। কোথায় খুঁজবেন?**

যেকোনো tool call-এর মতো একই জায়গায়, সঙ্গে আরও একটি। প্রথমে transport: process কি চালু আছে, আর HTTP
endpoint কি authenticate করছে? তারপর schema, কারণ argument-কে এখনো validate হতে হয়। তারপর description, কারণ
model বোধগম্য কোনো কারণে ভুল tool call করতে পারে। বাড়তি জায়গাটি হলো version drift। Tool runtime-এ discover
হয়, তাই server আপনার review করা জিনিসের থেকে ভিন্ন কিছু expose করতে পারে।

## এরপর কী পড়বেন

- [Chapter ?? — Tool Calling ও Tool Surface](#ch-tool-calling) — যে mechanism-কে MCP standardise করে, আর একটি tool description কীসে কাজ করে
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — কেন একটি tool description একটি attack surface
