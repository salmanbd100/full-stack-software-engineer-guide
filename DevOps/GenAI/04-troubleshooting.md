---
title: AI-Powered Troubleshooting
part: 8
chapter: 0
slug: genai-troubleshooting
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-04
tags: [devops, genai, troubleshooting]
in_book: false
---

# AI-Powered Troubleshooting

Debugging is pattern matching across noisy text, which is what language models are good at. It is also risk assessment under uncertainty, which they are bad at. Knowing the split is the skill.

## Where AI Fits in Debugging

```
Symptom
   ↓
Gather evidence        ← you (logs, metrics, traces)
   ↓
Generate hypotheses    ← ✅ AI is genuinely strong here
   ↓
Test each hypothesis   ← you (AI cannot query your systems safely)
   ↓
Decide remediation     ← 🔴 you own this
   ↓
Verify                 ← you
```

> AI widens the hypothesis list. It cannot rank the hypotheses by risk in **your** environment, and it cannot decide what is safe to do to production.

⚠️ A model will always produce an answer. Under time pressure, a fluent wrong answer is more dangerous than no answer, because it feels like progress.

## Strong Use: Decoding Errors

Cryptic errors with well-known causes are the ideal case.

| Error | AI Value |
|-------|----------|
| `CrashLoopBackOff` with an exit code | ✅ High — maps to a known cause list |
| `OOMKilled` (exit 137) | ✅ High |
| Terraform cycle errors | ✅ High — explains the dependency graph |
| Kubernetes `FailedScheduling` events | ✅ High — taints, resources, affinity, IPs |
| ECS task stopped reasons | ✅ High |
| A 300-line Java stack trace | ✅ High — finds the relevant frame |
| TLS handshake failures | ✅ Good |
| `AccessDenied` on an AWS API | ✅ Good — explains which policy element is missing |

**Prompt with the raw evidence, not your interpretation:**

```
Kubernetes pod is in CrashLoopBackOff. Raw evidence:

kubectl describe pod: [paste — include Events]
kubectl logs --previous: [paste]
Deployment spec: [paste]

Give me a ranked list of possible causes with the exact command
to confirm or eliminate each one. Do not suggest fixes yet.
```

✅ **"Do not suggest fixes yet"** is the key instruction. It stops the model jumping to a confident remediation and keeps you in diagnosis, which is where the value is.

❌ **Bad prompt:** *"My pod keeps crashing, I think it's a memory issue — how do I fix it?"* You have handed it your own bias, and it will confirm it.

## Log Triage at Scale

Reducing 50,000 lines to the 5 that matter.

| Task | Approach |
|------|----------|
| **Cluster similar errors** | Paste a sample, ask for grouping by root cause |
| **Find the first occurrence** | Ask for a timeline of distinct error types |
| **Write the query** | ✅ Ask for the Logs Insights / PromQL query, then run it yourself |
| **Explain a correlation** | Two metrics moving together — ask for mechanisms |

✨ **The best pattern: have AI write the query, not read the data.** Queries are verifiable, cheap, and keep sensitive logs out of the tool.

```
Write a CloudWatch Logs Insights query for log group /aws/ecs/checkout-api that:
- filters to ERROR level in the last 3 hours
- extracts the `requestId` and `errorCode` JSON fields
- counts by errorCode, descending
- shows the earliest and latest timestamp per errorCode
```

```sql
-- Verifiable output you run yourself
fields @timestamp, requestId, errorCode
| filter level = "ERROR"
| stats count(*) as errors,
        earliest(@timestamp) as first_seen,
        latest(@timestamp) as last_seen
  by errorCode
| sort errors desc
```

🔴 **Never paste production logs containing personal data, tokens, or customer identifiers into a third-party tool.** See [AI Security Considerations](./07-security.md).

## Root Cause Analysis — With Constraints

AI conflates correlation with causation aggressively. Constrain it.

❌ **Unconstrained:** *"Latency went up at 14:00, what caused it?"* → a plausible story, invented.

✅ **Constrained:**

```
Facts only:
- p99 latency: 180ms → 4200ms at 14:03 UTC, sustained
- p50 unchanged at 45ms
- CPU and memory flat
- RDS DatabaseConnections: 40 → 190 at 14:02
- No deployment in the last 6 hours
- Error rate unchanged

For each hypothesis, state:
1. The mechanism (how it produces exactly this signature)
2. What evidence would confirm it
3. What evidence would REFUTE it
4. Whether the facts above already refute it
```

✨ **Asking for refuting evidence is the highest-value prompting technique in debugging.** It forces the model to reason against its own suggestion rather than elaborating on it.

⚠️ Note what the facts above already tell you: p50 flat with p99 exploding means a subset of requests, not general saturation. Connections tripling with no deploy suggests connection pool exhaustion or a slow query holding connections — the model will find this if you give it the numbers instead of your theory.

## Where AI Fails in Incidents

| Failure | Why |
|---------|-----|
| **No knowledge of your system's history** | Cannot know this broke the same way in March |
| **Cannot assess blast radius** | Suggests `kubectl delete` with no idea what depends on it |
| **Confident about the wrong region/account** | Guesses names it has not seen |
| **Optimizes for a plausible story** | Coherence over truth |
| **Anchors on your framing** | Tell it you suspect memory, it finds memory |
| **No sense of urgency trade-offs** | Suggests investigating when you should roll back |

🔴 **The mitigate-before-diagnose principle still applies.** If a deploy went out and things broke, roll back first and understand later. AI will happily engage in a fascinating root cause discussion while the outage continues.

```
Correct incident order:
1. Stop the bleeding (roll back, shed load, failover)
2. Confirm recovery
3. THEN diagnose — this is where AI helps
```

## AWS-Native AI for Operations

| Service | What It Does | Prompting? |
|---------|-------------|-----------|
| **Amazon DevOps Guru** | ML anomaly detection on AWS resources; correlates into insights | ❌ None — passive |
| **CloudWatch anomaly detection** | Learns a metric's normal band | ❌ None |
| **Amazon Q Developer** | Answers questions about your account and resources | ✅ Yes |
| **Amazon Q in Slack/Teams** | Investigate from the incident channel | ✅ Yes |

✅ **DevOps Guru is the highest-value "AI for ops" service on AWS** precisely because it needs no prompting. It learns normal behaviour per resource and surfaces correlated anomalies with the related events, which is the tedious part of an investigation.

⚠️ It needs several weeks of data to be useful and it can be noisy in environments with irregular traffic.

## Building Your Own Triage Automation

For repeated patterns, a small Bedrock-backed Lambda beats a human reading the same alert every week.

```typescript
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({});

interface TriageResult {
  category: "deploy" | "dependency" | "capacity" | "config" | "unknown";
  confidence: "high" | "medium" | "low";
  suggestedRunbook: string;
  reasoning: string;
}

// Classify an alert into a known category and point at a runbook.
// Note: it CLASSIFIES and LINKS — it never remediates.
export async function triage(alert: string, recentDeploys: string[]): Promise<TriageResult> {
  const prompt = `Classify this alert into exactly one category.
Return only JSON matching the TriageResult shape.
If the evidence does not clearly support a category, use "unknown"
with confidence "low" — do not guess.

Alert: ${alert}
Deploys in the last hour: ${recentDeploys.join(", ") || "none"}`;

  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId: "anthropic.claude-sonnet-4-5-20250929-v1:0",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 512,
        temperature: 0, // ✅ deterministic — same alert, same classification
        messages: [{ role: "user", content: prompt }],
      }),
    }),
  );

  const body = JSON.parse(new TextDecoder().decode(res.body));
  return JSON.parse(body.content[0].text) as TriageResult;
}
```

**Design rules for AI in an incident path:**

| Rule | Why |
|------|-----|
| **Classify and enrich, never remediate** | A wrong automated action extends the outage |
| `temperature: 0` | Same input must give the same output |
| **Explicit "unknown" option** | Removes the pressure to guess |
| **Post to the channel, do not act** | Humans stay in the loop |
| **Log every input and output** | You must be able to audit its suggestions |

## Interview Q&A

**Q: How do you use AI when debugging a production issue?**

For hypothesis generation and for decoding evidence, not for deciding what to do. It is genuinely strong at taking a `CrashLoopBackOff` with its events and previous logs, or a 300-line stack trace, and producing a ranked list of plausible causes with the command to confirm or eliminate each — that widens my search faster than working alone. I also use it to write queries rather than to read data: asking for a CloudWatch Logs Insights or PromQL query gives me something verifiable that I run myself, and it keeps sensitive logs out of a third-party tool. What I keep is the decision about remediation, because the model cannot assess blast radius in my environment and has no memory of the fact that this broke the same way three months ago. And the incident order does not change: if something deployed and then broke, I roll back first and diagnose afterwards, because AI will happily hold an interesting root cause discussion while the outage continues.

**Q: What is the most useful prompting technique for debugging?**

Asking for refuting evidence. If I only ask what could cause a symptom, the model produces a coherent list and then elaborates confidently on whichever one I engage with. If I ask, for each hypothesis, what evidence would confirm it, what evidence would refute it, and whether the facts I have already provided rule it out, it has to reason against its own suggestions. That converts a plausible story into a testable set of alternatives and surfaces the ones I can eliminate immediately. The complementary technique is withholding my own theory — giving raw numbers rather than saying "I think it's memory", because these models anchor hard on the framing they are given and will find supporting evidence for whatever I suggest.

**Q: What are the limits of AI during an incident?**

It has no knowledge of your system's history, so it cannot tell you this is the third time this quarter or that the same symptom last time turned out to be a downstream dependency. It cannot assess blast radius, so it will suggest deleting or restarting something without knowing what depends on it. It optimizes for a coherent narrative rather than truth, which is exactly the wrong bias when the real cause is something unglamorous. It anchors on your framing, so it amplifies your existing bias rather than challenging it. And it has no sense of the urgency trade-off — it will propose a thorough investigation when the correct action is to roll back immediately and understand later. That last one matters most, because the fluency makes investigation feel like progress while customers are still affected.

**Q: What is Amazon DevOps Guru and why is it different from asking a chatbot?**

DevOps Guru is a managed machine learning service that continuously learns the normal behaviour of your AWS resources and surfaces anomalies as correlated insights, together with the related events and affected resources. The difference is that it is passive — there is no prompt, so there is no opportunity for it to hallucinate an answer to a question, and it is working from your actual telemetry rather than from a description you typed. That makes it well suited to the tedious part of an investigation, which is noticing that a latency change, a connection count change, and a recent configuration change are related. The caveats are that it needs several weeks of data before it is useful, it can be noisy for workloads with irregular traffic, and it tells you what is anomalous rather than what to do about it.

**Q: Would you automate remediation with an AI model?**

Not the remediation itself. I would automate classification and enrichment — take an alert, categorize it, correlate it with recent deployments, and post the likely category plus a link to the relevant runbook into the incident channel. That saves the first several minutes of every investigation with no downside if it is wrong, because a human still decides. I would not let a model take a remediating action, because a wrong action during an incident extends the outage and the model cannot evaluate blast radius. If I did build it, the design rules would be temperature zero so the same alert always classifies the same way, an explicit "unknown" category with low confidence so there is no pressure to guess, and full logging of every input and output so its suggestions can be audited afterwards. Deterministic automation — roll back on an SLO breach during a canary — is a better fit for the remediation path than a model.

---

[← AI for Documentation](./03-documentation.md) | [Index](./README.md) | [AI for Monitoring →](./05-monitoring.md)
