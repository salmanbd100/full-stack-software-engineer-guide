---
sourceHash: "62ae0a17c55cbb8c581f7062127a11dcd95b66ecfdf3e6ca4cabe1fd1590f4ba"
title: "Part VII — AI Engineering"
translatedAt: "2026-10-12T12:27:47.593Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VII — AI Engineering

এই অংশ তাঁদের জন্য, যাঁরা **model দিয়ে feature বানান**, যাঁরা model train করেন তাঁদের জন্য নয়। এখানে CUDA নেই,
PyTorch নেই, gradient descent নেই, আর cosine similarity-র জন্য যতটুকু লাগে তার বাইরে কোনো গণিত নেই। তার বদলে এটা
সেই কাজ cover করে, যা 2027-এ একজন full stack engineer-কে আসলে দেওয়া হয়। TypeScript থেকে একটি model call করা।
উত্তর stream করা আর সেটাকে structured রাখা। Model-কে tool দেওয়া আর সঠিক context retrieve করা। এর কোনোটা আদৌ কাজ
করছে কি না, তা মাপা। তারপর এমন একটি system-এর চারপাশে interface design করা, যেটা ধীর, মাঝে মাঝে ভুল, আর কখনোই
পুরোপুরি deterministic নয়।

2026-এর hiring নিয়ে প্রতিটি survey একই তিনটি skill-এ গিয়ে পৌঁছায় — **RAG, agent আর evaluation** — আর তিনটির মধ্যে
evaluation-কেই সবচেয়ে কম শেখানো skill বলে। এই অংশের গঠনও সেরকম। পাঁচটি section mechanics শেখায়। `Production/`
শেখায় সেই মাপজোখ, যা একজন demo বানানো মানুষকে একজন feature ship করা মানুষ থেকে আলাদা করে। `AIUX/` interface-এর
স্তর cover করে, যা backend আর ML-এর লোকদের লেখা প্রতিটি AI বইয়ের সবচেয়ে দুর্বল অধ্যায়।

> একটি AI round-এ senior প্রশ্নটা কখনো "আপনি কি API call করতে পারেন" নয়। প্রশ্নটা হলো "আপনি কীভাবে জানেন এটা কাজ
> করে, আর যখন করেনি তখন আপনি কী করেছিলেন"।

## চলমান Project

একটি ছোট application পুরো অংশ জুড়ে চলে: একটি **documentation assistant**, যা একটি codebase-এর নিজস্ব docs নিয়ে
প্রশ্নের উত্তর দেয়। এটা ইচ্ছা করেই সাদামাটা, আর ইচ্ছা করেই সম্পূর্ণ। এই অংশের শেষে এটা একটি model call করে, browser-এ
stream করে, একটি vector store থেকে retrieve করে আর tool ব্যবহার করে। এর একটি golden set-সহ eval suite আছে, প্রতি
প্রশ্নে এর খরচ জানা, আর model refuse করলে এটা সৎভাবে fail করে।

আটটি আলাদা snippet আটটি জিনিস শেখায়। কুড়িটি অধ্যায় ধরে বড় হওয়া একটি application শেখায় টুকরোগুলো কীভাবে একে
অপরকে সীমাবদ্ধ করে, আর interview আসলে সেটা নিয়েই।

## Section-গুলো

| Section                                    | অধ্যায় | কী cover করে                                                              |
| ------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| [ভিত্তি](#ch-ai-foundations-index)     | 3        | Model কীভাবে আচরণ করে আর কোনটা বাছবেন, prompting, context engineering          |
| [Integration](#ch-ai-integration-index)     | 5        | Call করা, streaming, structured output, tool আর tool surface, MCP       |
| [RAG](#ch-ai-rag-index)                     | 3        | কখন retrieve করবেন, ingestion, embedding আর retrieval                        |
| [Agent](#ch-ai-agents-index)               | 2        | Loop আর multi-agent pattern, memory আর durability                     |
| [Production](#ch-ai-production-index)       | 4        | Eval আর error analysis, observability আর খরচ, guardrail, prompt injection |
| [AIUX](#ch-ai-aiux-index)                   | 2        | Latency আর generative UI, trust আর failure state                          |

একটি শেষ অধ্যায়, [**Interview-এ AI**](#ch-ai-in-interviews), এই অংশের root-এ বসে আছে। Interviewer-রা এই বিষয়গুলো
আসলে কীভাবে জিজ্ঞেস করেন, সেটা এটা cover করে: _একটি RAG system design করুন_, _এই feature আপনি কীভাবে evaluate
করবেন_, _আপনার agent loop-এ আটকে আছে, debug করুন_, _model-এর version বদলালে কী ভাঙে_।

> ⚠️ **যা বদলাতে থাকে, স্বভাবতই।** Provider SDK, AI SDK আর Model Context Protocol — সবই কয়েক মাস পরপর breaking
> change ship করে। এই অংশ **AI SDK 7** আর **MCP revision 2025-11-25** অনুযায়ী লেখা। টেকসই বিষয়বস্তু API-র নামের
> নিচে থাকে। Parameter-এর নাম যা-ই হোক, token budget একটি budget-ই। Store যা-ই হোক, retrieval-এর মান মাপা যায়। একটি
> eval suite তার ভেতরের প্রতিটি SDK-র চেয়ে বেশিদিন টেকে। যেখানে কোনো অধ্যায় একটি version-এর নাম বলে, সেখানে কেন
> বলে সেটাও বলে।

## Interviewer-রা যা যাচাই করেন

এই অংশে senior হওয়ার সংকেত হলো **উন্নতি করার আগে মাপা — একটি ভুল উত্তরকে দুর্ভাগ্য হিসেবে নয়, retrieval bug বা
eval-এর ফাঁক হিসেবে দেখা।**

- **আপনার কাছে কি একটি সংখ্যা আছে?** "এটা ভালো মনে হচ্ছে" — এই উত্তর একটি AI interview খারাপভাবে শেষ করে। পঞ্চাশটি
  প্রশ্নের একটি golden set আর একটি pass rate — এই উত্তর তা করে না।
- **আপনি কি একটি failure খুঁজে বের করতে পারেন?** Assistant ভুল উত্তর দেয়। যে candidate জিজ্ঞেস করেন সঠিক chunk
  retrieve হয়েছিল কি না, তিনি prompt নতুন করে লেখা candidate-এর চেয়ে এগিয়ে।
- **আপনি কি জানেন এর খরচ কত?** প্রতি request-এ token, cache hit rate, আর load-এর মধ্যে request path-এর দাম। বহু বছরের
  মধ্যে AI feature-ই প্রথম feature, যার প্রান্তিক খরচ প্রতি user হিসেবে দেখা যায়।
- **আপনি কি অসুখী path-টা design করেছেন?** Refusal, timeout, আংশিক উত্তর আর rate limit এখানে স্বাভাবিক অবস্থা, edge
  case নয়।
- **আপনি কি জানেন security boundary কোথায়?** Prompt injection এই ক্ষেত্রের সংজ্ঞায়িত দুর্বলতা। একটি বাক্যেই এটা
  বোঝানো যায়: "model অবিশ্বস্ত লেখা পড়ে, আর tool call করতে পারে"।

**একই প্রশ্নে, mid নাকি senior:**

| জিজ্ঞাসা | Mid উত্তর | Senior উত্তর |
| ----- | ---------- | ------------- |
| "উত্তরগুলো ভুল" | "আমি prompt উন্নত করেছি" | "আমি আগে দেখেছি সঠিক chunk retrieve হয়েছিল কি না — এটা retrieval bug, prompting-এর নয়" |
| "এটা কি কাজ করছে?" | "এখন অনেক ভালো মনে হচ্ছে" | "পঞ্চাশ প্রশ্নের golden set-এ pass rate 61% থেকে 84% হয়েছে, আর এই হলো যা এখনো fail করে" |
| "খরচ কত?" | "API বেশ সস্তা" | প্রতি request-এ token, cache hit rate, আর আসল load-এ প্রতি user প্রতি মাসে খরচ |

## পড়ার ক্রম

`Foundations/` → `Integration/` হলো মেরুদণ্ড, আর বেশিরভাগ পাঠক কাজে প্রথম এই অর্ধেকটাই ব্যবহার করবেন। তারপর role
অনুযায়ী ভাগ হয়ে যান। Product-এর দিকে কাজ করা একজন engineer এরপর `AIUX/` আর `RAG/`-এ যাবেন। যিনি internal tooling
বানাচ্ছেন, তিনি `Agents/`-এ যাবেন। `Production/` নম্বরের হিসাবে শেষে, আর interview-এ প্রথমে। আপনার পথ যা-ই হোক, এটা
পড়ুন।

**Interview sprint:** `Foundations/01`, `Integration/03`–`04`, `RAG/01`, `Production/01`, তারপর
[Interview-এ AI](#ch-ai-in-interviews)। এতে আছে mental model, সবসময় আসা দুটো mechanics, যে সিদ্ধান্ত বেশিরভাগ team ভুল
করে, বাজারে যে skill-এর ঘাটতি, আর round-টার নিজের গঠন।
