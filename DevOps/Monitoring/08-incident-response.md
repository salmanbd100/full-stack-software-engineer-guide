# Incident Response

Incidents are inevitable. What distinguishes a good team is that the response is a practised process, not improvisation under stress.

## The Lifecycle

```
Detect  →  Triage  →  Mitigate  →  Resolve  →  Learn
  │          │           │            │          │
 alert    severity    stop the      fix the   postmortem
 fires    assigned    bleeding      cause     + actions
```

🔴 **Mitigate before you diagnose.** The instinct to find the root cause first is what turns a five-minute incident into an hour. Stop the user impact, then investigate.

| Phase | Goal | Typical Action |
|-------|------|---------------|
| **Detect** | Know before the customer tells you | Alert fires, or a canary fails |
| **Triage** | Assign severity and an owner | Declare the incident, open a channel |
| **Mitigate** | Restore service | Roll back, scale up, fail over, disable a flag |
| **Resolve** | Fix the underlying cause | Deploy the real fix |
| **Learn** | Prevent recurrence | Blameless postmortem, tracked actions |

## Severity Levels

Define these in advance. Arguing about severity during an incident wastes the time that matters.

| Sev | Meaning | Response | Comms |
|-----|---------|----------|-------|
| **SEV1** | Total outage, or data loss | All hands, immediately | Status page + exec update every 30 min |
| **SEV2** | Major feature broken, or severe degradation | On-call + owning team, immediately | Status page, hourly update |
| **SEV3** | Minor feature broken, workaround exists | Business hours | Internal only |
| **SEV4** | Cosmetic or single-user | Backlog | Ticket |

✅ **Anyone can declare an incident.** Requiring permission to declare delays response, and the cost of over-declaring is far lower than the cost of under-declaring.

⚠️ Severity can change. A SEV3 that turns out to be corrupting data becomes a SEV1 immediately.

## Incident Command

Borrowed from emergency services. It exists so nobody has to decide who decides.

| Role | Owns | Does Not |
|------|------|----------|
| **Incident Commander (IC)** | Coordination, decisions, delegation | 🔴 Debug or type commands |
| **Operations / Tech Lead** | Investigating and applying fixes | Communicate externally |
| **Communications Lead** | Status page, stakeholders, customers | Debug |
| **Scribe** | Timeline of actions and findings | Debug |

🔴 **The IC must not be debugging.** The moment the coordinator's head is inside a terminal, nobody is tracking who is doing what, whether the mitigation worked, or that a second problem has appeared. On small teams one person may hold IC and Comms, but never IC and Operations.

**How the IC actually works:**

```
IC: "Sam, check if the last deploy correlates. Two minutes."
IC: "Priya, get error rate by AZ. Two minutes."
IC: "I am not making a rollback decision until I hear both."
    ...
IC: "Confirmed — the deploy is the cause. Sam, roll back now.
     Priya, watch error rate. Alex, update the status page: cause
     identified, mitigation in progress."
```

✅ Short, explicit, time-boxed assignments. No open-ended "can someone look at the database?"

## Mitigation First

The actions that stop user impact, roughly in order of speed:

| Action | Restores In | Use When |
|--------|------------|----------|
| **Toggle a feature flag off** | Seconds | The bad code path is behind a flag |
| **Roll back the deploy** | 1–5 min | ✅ Impact started after a deploy |
| **Scale out** | 2–10 min | Saturation under load |
| **Fail over to another AZ/region** | 5–15 min | Zonal or regional failure |
| **Shed load / rate limit** | Seconds | Overload cascading into total failure |
| **Restart the service** | Seconds | ⚠️ Last resort — destroys the evidence |

> **"Did anything change?" is the highest-yield first question.** The large majority of incidents are caused by a deployment, a configuration change, a certificate expiry, or a traffic shift.

⚠️ **Restarting destroys diagnostic state.** If you must restart, capture a heap dump, thread dump, or `kubectl describe` output first — otherwise the postmortem cannot determine the cause and it will happen again.

## AWS Systems Manager for Response

SSM is the AWS-native tool for touching production safely during an incident.

```bash
# Shell access with no SSH, no bastion, no inbound ports — and it is audited
aws ssm start-session --target i-0abc123def456

# Run a diagnostic across every affected instance at once
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "Key=tag:Service,Values=payments" \
  --parameters 'commands=["df -h","free -m","systemctl status payments"]'
```

✅ **Session Manager is the right answer to "how do you access production?"** No SSH keys to manage, no bastion host, no port 22 open, every session logged to CloudWatch or S3 for audit.

**Automation documents — codified runbooks:**

```yaml
description: Restart the payments service and verify recovery
parameters:
  InstanceId: { type: String }
mainSteps:
  - name: captureDiagnostics
    action: aws:runCommand
    inputs:
      DocumentName: AWS-RunShellScript
      Parameters:
        commands:
          - "journalctl -u payments -n 500 > /tmp/incident-$(date +%s).log"
          - "aws s3 cp /tmp/incident-*.log s3://acme-incident-artifacts/"
  - name: restartService
    action: aws:runCommand
    inputs:
      DocumentName: AWS-RunShellScript
      Parameters:
        commands: ["systemctl restart payments"]
  - name: verifyHealth
    action: aws:runCommand
    inputs:
      DocumentName: AWS-RunShellScript
      Parameters:
        commands: ["sleep 15", "curl -fsS localhost:3000/health"]
```

✅ Note the order: **capture evidence, then restart.** That is the discipline codifying a runbook enforces.

## Runbooks

A runbook is what turns a 3am page into following steps rather than reasoning from scratch.

**The structure that works:**

```markdown
# Runbook: Checkout error rate above 1%

## Impact
Users cannot complete purchases. Revenue-affecting. SEV2 minimum.

## Verify it is real
1. Grafana → Checkout Overview → confirm error rate panel
2. Synthetics canary `checkout-flow` — is it failing too?
   (If the canary passes, suspect the monitoring, not the service)

## Diagnose — in this order
1. Was there a deploy in the last 30 min?  `kubectl rollout history deploy/checkout`
2. Is it one AZ?  Grafana → errors by availability zone
3. Is the payment provider up?  https://status.stripe.com
4. Connection pool exhausted?  `checkout_db_pool_available` metric

## Mitigate
| Finding | Action |
|---------|--------|
| Recent deploy correlates | `kubectl rollout undo deploy/checkout` |
| One AZ | Cordon nodes in that AZ |
| Provider outage | Enable `payments.fallback_provider` flag |
| Pool exhausted | Scale replicas; then raise pool size |

## Escalate
- Payments team: #payments-oncall
- Provider issue: platform lead
```

| Rule | Why |
|------|-----|
| **Impact first** | The reader needs to know the stakes before the steps |
| **Verify before acting** | Rules out a monitoring failure |
| **Ordered diagnosis** | Most likely cause first |
| **Explicit commands** | Copy-pasteable, not "check the database" |
| **Test them** | An untested runbook is fiction |

🔴 **Untested runbooks are worse than none** — they create false confidence. Exercise them during game days.

## Postmortems

**Blameless** means the analysis targets systems, not people.

❌ **Blameful:** "Sam deployed without running tests."
✅ **Blameless:** "The pipeline allowed a deploy to production with failing tests. There was no required status check."

> The blameless framing is not politeness — it is accuracy. "Sam should be more careful" prevents nothing. "The pipeline permitted it" produces a fix.

**Template:**

```markdown
# Postmortem: Checkout outage 2026-08-03

## Summary
Checkout returned 5xx for 34 minutes. ~4,200 failed purchases,
estimated £61,000 in delayed revenue.

## Impact
- 14:32–15:06 UTC
- 100% of checkout attempts failed for 22 min, degraded for 12
- SLO: consumed 78% of the monthly error budget

## Timeline (UTC)
14:30  Deploy v2.4.1 begins
14:32  Error rate crosses 1%; alert fires
14:34  On-call acknowledges
14:41  IC declared, incident channel opened
14:52  Deploy correlation identified
14:58  Rollback started
15:06  Error rate normal
15:20  Incident closed

## Root cause
v2.4.1 raised the DB connection pool size per pod from 10 to 25.
With 40 pods that requested 1,000 connections against an RDS
max_connections of 500. Pods that could not acquire a connection
returned 500.

## What went well
- Alert fired within 2 minutes
- Rollback worked cleanly

## What went badly
- 9 minutes from acknowledgement to declaring an incident
- No staging test at production pod count
- No alarm on RDS connection utilisation

## Contributing factors
- Staging runs 4 pods, so the limit was never approached
- Pool size is per-pod config with no cluster-wide view

## Action items
| Action | Owner | Due | Ticket |
|--------|-------|-----|--------|
| Alarm on RDS connections > 80% | Priya | 2026-08-10 | OPS-412 |
| Load test at production pod count in CI | Sam | 2026-08-17 | OPS-413 |
| Derive pool size from replica count | Alex | 2026-08-24 | OPS-414 |
| IC declared within 5 min — update on-call training | Dana | 2026-08-10 | OPS-415 |
```

**What makes a postmortem worth writing:**

| ✅ Do | ❌ Don't |
|------|---------|
| Quantify impact in users and money | "Some users were affected" |
| Timeline with real timestamps | Vague ordering |
| Action items with owners and dates | "We should improve testing" |
| Ask *why the system allowed it* | Stop at "human error" |
| Publish it internally | File it privately |

🔴 **Action items without an owner and a date are decoration.** Track them in the normal backlog with the same priority as features, or the same incident recurs.

**The Five Whys, applied properly:**

```
Checkout failed
  → why? DB connections exhausted
  → why? Pool size raised 2.5× per pod
  → why? Nobody knew the cluster-wide total
  → why? Pool config is per-pod with no aggregate view
  → why? No load test at production scale
     ↑ the actionable cause
```

## Metrics That Matter

| Metric | Measures | Target |
|--------|----------|--------|
| **MTTD** — time to detect | Monitoring quality | Under 5 min |
| **MTTA** — time to acknowledge | On-call responsiveness | Under 5 min |
| **MTTR** — time to restore | Mitigation capability | Under 1 hour (DORA elite) |
| **Change failure rate** | Deploy quality | Under 15% |
| **Repeat incidents** | Whether postmortems work | Trending to zero |

✅ **MTTR is the one to optimise.** You cannot prevent all failure, so the ability to recover fast is worth more than the pursuit of never failing. Fast rollback, feature flags, and good runbooks move MTTR more than any amount of extra testing.

## Game Days

Practise before you need it.

| Exercise | Tests |
|----------|-------|
| Terminate a random production instance | Auto-recovery, alerting |
| Fail over an RDS instance | Application reconnect logic |
| Block an AZ with a NACL | Multi-AZ assumptions |
| Expire a certificate in staging | Renewal monitoring |
| Page a new on-call engineer with a real scenario | Runbooks, escalation |

✅ **AWS Fault Injection Simulator** runs controlled experiments — CPU stress, instance termination, API throttling — with automatic rollback if guardrail alarms fire.

⚠️ Start in staging. Game days in production require genuine organisational maturity and a stop condition everyone agrees on.

## Interview Q&A

**Q: Walk me through how you handle a production incident.**

Mitigate first, diagnose second — that ordering is the most important thing. Once an alert fires and I have confirmed it is real, usually by checking whether an external canary is also failing, I declare an incident and open a channel so there is one place for context. Then the highest-yield question is "did anything change?", because the large majority of incidents trace to a deploy, a config change, a certificate expiry, or a traffic shift. If a recent deploy correlates, I roll back before understanding why it broke — the code can be diagnosed at leisure once users are served. Only after impact has stopped do I move to root cause. Throughout, someone is coordinating rather than debugging, someone is handling communications so the responders are not answering stakeholder questions, and someone is keeping a timeline that becomes the postmortem.

**Q: What is the role of an incident commander?**

Coordination and decision-making, explicitly not debugging. The IC assigns short time-boxed tasks — "check whether the deploy correlates, two minutes" — collects the findings, decides on mitigation, and makes sure someone owns external communication. The critical constraint is that the IC must keep their hands off the keyboard. The moment the coordinator starts investigating, nobody is tracking who is doing what, whether the mitigation actually worked, or that a second symptom has appeared, and you get three people independently debugging the same thing while nothing gets communicated. On a small team one person can combine IC with communications, but never IC with hands-on operations. The role also exists so that nobody has to work out who is in charge while the site is down.

**Q: What makes a postmortem blameless, and why does it matter?**

Blameless means the analysis is directed at the system rather than the individual. Instead of "Sam deployed without running the tests", the finding is "the pipeline permitted a deploy to production while tests were failing, because there was no required status check". This is not politeness — it is accuracy, and it is what produces fixes. "Sam should be more careful" prevents nothing and generalises to nobody, whereas a required status check prevents the entire class of failure for everyone forever. It also matters for information quality: in a blaming culture people minimise their involvement, so the timeline you get is incomplete and you analyse the wrong incident. The test I apply is whether every "human error" has been pushed one level further to ask why the system allowed that error to have consequences.

**Q: How do you decide what to do first when a service is down?**

Stop the bleeding, in whatever way is fastest, before understanding the cause. The options in rough order of speed are turning off a feature flag, rolling back the last deploy, scaling out, failing over to another zone or region, and shedding load. Rolling back is usually the highest-probability action because most incidents follow a change, so establishing whether a deploy correlates is the first diagnostic step. Restarting the service is a last resort, because it usually works and simultaneously destroys the evidence needed to prevent recurrence — if I have to restart, I capture logs, a thread dump, or `kubectl describe` output first. The general principle is that the user impact and the root cause are separate problems on separate clocks, and only one of them is urgent.

**Q: What metrics do you track for incident response, and which matters most?**

Time to detect, time to acknowledge, time to restore, change failure rate, and the rate of repeat incidents. Time to detect measures whether monitoring is doing its job — if customers tell you before your alerts do, that is a monitoring defect. Time to acknowledge measures on-call health, and a rising number usually means alert fatigue rather than laziness. Repeat incidents measure whether postmortems are actually producing change. The one I would optimise hardest is time to restore, because you cannot prevent all failure, so recovery speed compounds more than any amount of additional pre-release testing. Reliable one-command rollback, feature flags that decouple deploy from release, and runbooks that have actually been tested move MTTR far more than extra test coverage does.

**Q: What is a game day and why run one?**

A deliberate exercise where you break something on purpose to test whether detection, alerting, runbooks, and people actually work. The value is that every part of incident response is untested until it is used, and discovering during a real outage that the runbook references a decommissioned dashboard or that the escalation policy pages someone who left is expensive. Typical exercises are terminating an instance to test auto-recovery, failing over an RDS instance to test application reconnect logic, blocking an availability zone with a NACL to check that multi-AZ claims are real, and paging a newly onboarded engineer with a realistic scenario to test the runbooks from a beginner's perspective. On AWS, Fault Injection Simulator runs these as controlled experiments with guardrail alarms that automatically stop the experiment. I would start in staging, and only move to production once there is a clear stop condition everyone has agreed.

---
[Monitoring Index](./README.md) | [← Alerting & On-Call](./07-alerting.md)
