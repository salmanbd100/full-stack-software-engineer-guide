---
sourceHash: "62ae0a17c55cbb8c581f7062127a11dcd95b66ecfdf3e6ca4cabe1fd1590f4ba"
title: "Part VII — AI Engineering"
translatedAt: "2026-10-19T07:53:23.326Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VII — AI Engineering

এই অংশটা সেই engineer-দের জন্য, যাঁরা **model দিয়ে feature বানান**। যাঁরা model train করেন, তাঁদের জন্য নয়। এখানে
CUDA নেই, PyTorch নেই, gradient descent নেই। Cosine similarity বুঝতে যতটুকু অঙ্ক লাগে, তার বেশি কিছুও নেই। বদলে আছে
সেই কাজ, যা 2027-এ একজন full stack engineer-কে সত্যিই দেওয়া হয়। TypeScript থেকে model call করা। উত্তরটা stream করা,
আর সেটাকে structured রাখা। Model-কে tool দেওয়া, আর ঠিক context-টা খুঁজে আনা। এর কোনোটা আদৌ কাজ করছে কি না, তা মাপা।
তারপর এমন একটি system ঘিরে interface design করা, যেটা ধীর, মাঝে মাঝে ভুল, আর কখনোই পুরোপুরি deterministic নয়।

2026-এর hiring নিয়ে যত survey হয়েছে, সবগুলো একই তিনটি skill-এ গিয়ে থামে: **RAG, agent আর evaluation**। আর তিনটির
মধ্যে evaluation-কেই সবাই বলে সবচেয়ে কম শেখানো skill। এই অংশের গড়নও তাই। পাঁচটি section কলকবজা শেখায়।
`Production/` শেখায় মাপার কাজ, আর এটাই আলাদা করে দেয় কে শুধু demo বানিয়েছেন আর কে feature ship করেছেন।
`AIUX/` দেখায় interface-এর স্তরটা। Backend আর ML-এর লোকেরা যত AI বই লিখেছেন, সবগুলোতে এটাই সবচেয়ে দুর্বল অধ্যায়।

> AI round-এ senior প্রশ্নটা কখনোই "API call করতে পারেন কি না" নয়। প্রশ্নটা হলো, "কাজ করছে, সেটা কীভাবে জানেন? আর
> যখন করেনি, তখন কী করেছিলেন?"

## চলমান Project

পুরো অংশ জুড়ে একটিই ছোট application চলে: একটি **documentation assistant**, যেটা কোনো codebase-এর নিজের docs নিয়ে
প্রশ্নের উত্তর দেয়। এটা ইচ্ছে করেই সাদামাটা, আর ইচ্ছে করেই সম্পূর্ণ। অংশের শেষে এটা model call করে, browser-এ stream
করে, vector store থেকে retrieve করে, আর tool ব্যবহার করে। এর একটি eval suite আছে, সঙ্গে golden set। প্রতিটি প্রশ্নে
খরচ কত, তা জানা। আর model refuse করলে এটা সৎভাবে fail করে।

আলাদা আটটি snippet আটটি জিনিস শেখায়। কিন্তু কুড়িটি অধ্যায় ধরে বেড়ে ওঠা একটি application শেখায় টুকরোগুলো একে অপরকে
কীভাবে বেঁধে রাখে। Interview-টা আসলে এটা নিয়েই।

## অংশগুলো

| অংশ | অধ্যায় | কী নিয়ে |
| --- | ------ | ------- |
| [ভিত্তি](#ch-ai-foundations-index)     | 3        | Model কীভাবে আচরণ করে আর কোনটা বাছবেন, prompting, context engineering |
| [Integration](#ch-ai-integration-index)     | 5        | Call করা, streaming, structured output, tool আর tool surface, MCP |
| [RAG](#ch-ai-rag-index)                     | 3        | কখন retrieve করবেন, ingestion, embedding আর retrieval |
| [Agent](#ch-ai-agents-index)               | 2        | Loop আর multi-agent pattern, memory আর durability |
| [Production](#ch-ai-production-index)       | 4        | Eval আর error analysis, observability আর খরচ, guardrail, prompt injection |
| [AIUX](#ch-ai-aiux-index)                   | 2        | Latency আর generative UI, ভরসা আর failure state |

এই অংশের গোড়ায় শেষ একটি অধ্যায় আছে, [**AI in Interviews**](#ch-ai-in-interviews)। Interviewer-রা এই বিষয়গুলো আসলে
কীভাবে জিজ্ঞেস করেন, সেটা ওখানে আছে: _একটি RAG system design করুন_, _এই feature-টা কীভাবে evaluate করবেন_, _আপনার agent
loop-এ আটকে গেছে, debug করুন_, _model-এর version বদলালে কী ভাঙে_।

> ⚠️ **যা বদলাতে থাকে, আর সেটা স্বভাবগতভাবেই।** Provider SDK, AI SDK আর Model Context Protocol, তিনটিই কয়েক মাস পরপর
> breaking change ship করে। এই অংশ লেখা হয়েছে **AI SDK 7** আর **MCP revision 2025-11-25** ধরে। টেকসই জিনিসগুলো থাকে
> API-র নামের নিচে। Parameter-এর নাম যা-ই হোক, token budget একটি budget-ই। Store যেটাই হোক, retrieval-এর মান মাপা যায়।
> আর eval suite তার ভেতরের প্রতিটি SDK-র চেয়ে বেশিদিন টেকে। কোনো অধ্যায়ে version-এর নাম থাকলে, কেন আছে তাও বলা আছে।

## Interviewer-রা যা যাচাই করেন

এই অংশে senior হওয়ার লক্ষণ হলো **উন্নতি করার আগে মাপা। ভুল উত্তরকে দুর্ভাগ্য নয়, retrieval bug বা eval-এর ফাঁক
হিসেবে দেখা।**

- **আপনার কাছে কোনো সংখ্যা আছে?** "আগের চেয়ে ভালো লাগছে" বললে AI interview খারাপভাবে শেষ হয়। পঞ্চাশটি প্রশ্নের একটি
  golden set আর একটি pass rate বললে তা হয় না।
- **Failure-টা কোথায়, খুঁজে বের করতে পারেন?** Assistant ভুল উত্তর দিচ্ছে। যে candidate জিজ্ঞেস করেন ঠিক chunk-টা
  retrieve হয়েছিল কি না, তিনি prompt নতুন করে লেখা candidate-এর চেয়ে এগিয়ে।
- **খরচ কত, জানেন?** প্রতি request-এ কত token, cache hit rate কত, আর load-এর মধ্যে request path-এর দাম কত। বহু বছর
  পর AI feature-ই প্রথম, যার প্রান্তিক খরচ প্রতিটি user ধরে চোখে দেখা যায়।
- **খারাপ পথটা design করেছেন?** Refusal, timeout, আধখানা উত্তর আর rate limit এখানে edge case নয়। এগুলো স্বাভাবিক
  অবস্থারই অংশ।
- **Security boundary কোথায়, জানেন?** Prompt injection এই ক্ষেত্রের সবচেয়ে বড় দুর্বলতা। একটি বাক্যেই ব্যাপারটা বোঝানো
  যায়: "model অবিশ্বস্ত text পড়ে, আর tool call করতে পারে"।

**একই প্রশ্নে mid আর senior-এর তফাত:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| "উত্তরগুলো ভুল আসছে" | "Prompt-টা ভালো করেছি" | "আগে দেখেছি ঠিক chunk-টা retrieve হয়েছিল কি না। এটা retrieval bug, prompting-এর নয়" |
| "কাজ করছে?" | "এখন অনেক ভালো লাগছে" | "পঞ্চাশ প্রশ্নের golden set-এ pass rate 61% থেকে 84% হয়েছে। আর এই হলো যা এখনো fail করে" |
| "খরচ কত?" | "API তো বেশ সস্তা" | প্রতি request-এ token, cache hit rate, আর আসল load-এ প্রতি user-এর মাসিক খরচ |

## পড়ার ক্রম

`Foundations/` → `Integration/` হলো মেরুদণ্ড। বেশিরভাগ পাঠক কাজে প্রথম এই অর্ধেকটাই লাগাবেন। তারপর ভূমিকা অনুযায়ী পথ
আলাদা। Product-এর দিকে কাজ করলে এরপর `AIUX/` আর `RAG/` পড়ুন। Internal tooling বানালে `Agents/`-এ যান। `Production/`
numbering-এ সবার শেষে, কিন্তু interview-এ সবার আগে। যে পথেই যান, এটা পড়ুন।

**Interview sprint:** `Foundations/01`, `Integration/03`–`04`, `RAG/01`, `Production/01`, তারপর
[Interview-এ AI](#ch-ai-in-interviews)। এতে আছে mental model, যে দুটি কলকবজার প্রশ্ন সবসময় আসে, যে সিদ্ধান্তে বেশিরভাগ
team ভুল করে, যে skill-এর বাজারে ঘাটতি, আর round-টার নিজের চেহারা।
