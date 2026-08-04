# DAST — Dynamic Application Security Testing

DAST attacks a **running** application from the outside. It has no access to source code, so it finds what is actually exploitable over the network.

## SAST vs DAST

| | **SAST** | **DAST** |
|---|---------|---------|
| **Input** | Source code | A running URL |
| **Runs** | On every pull request | Against a deployed environment |
| **Speed** | Seconds to minutes | Minutes to hours |
| **False positives** | ⚠️ Many | ✅ Few — it proves exploitability |
| **Tells you the line** | ✅ Yes | ❌ No, only the request |
| **Finds config issues** | ❌ No | ✅ Yes — headers, TLS, exposed endpoints |
| **Coverage** | All code paths | Only paths it can reach |

> SAST asks "could this be exploitable?". DAST asks "is this exploitable right now?".

**What only DAST finds:**

- ✅ Missing security headers (`Content-Security-Policy`, `HSTS`)
- ✅ Weak TLS configuration and expired certificates
- ✅ Debug endpoints or admin panels left exposed
- ✅ Verbose error pages leaking stack traces and versions
- ✅ Session and cookie flaw behaviour (`Secure`, `HttpOnly`, `SameSite`)
- ✅ Misconfiguration that exists only in the deployed environment

## The Authentication Problem

🔴 **This is the single biggest reason DAST deployments fail.** An unauthenticated scan only tests your login page — typically under 5% of the attack surface.

```
❌ Unauthenticated scan:
   /login, /register, /forgot-password, /health
   → 4 endpoints tested, 200 unreachable

✅ Authenticated scan:
   full application behind the session
   → real coverage
```

**Getting the scanner logged in:**

| Method | Notes |
|--------|-------|
| **Inject a bearer token** | ✅ Simplest and most reliable for APIs |
| **Recorded login script** | Needed for form login and SPAs |
| **Session cookie replay** | Works, but expires mid-scan |

⚠️ The scanner will find and click "Delete account" and "Log out". Two fixes: exclude those URLs, and use a **seeded, disposable test account** in a throwaway environment.

**A ZAP API scan against an OpenAPI spec — the highest-value DAST setup:**

```yaml
name: dast
on:
  workflow_dispatch:
  schedule:
    - cron: "0 2 * * *"      # nightly — DAST is too slow for every PR

jobs:
  zap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # ✅ Spec-driven: ZAP knows every endpoint, no crawling guesswork
      - name: ZAP API scan
        uses: zaproxy/action-api-scan@v0
        with:
          target: https://staging.example.com/openapi.json
          format: openapi
          cmd_options: >-
            -z "-config replacer.full_list(0).description=auth
                -config replacer.full_list(0).enabled=true
                -config replacer.full_list(0).matchtype=REQ_HEADER
                -config replacer.full_list(0).matchstr=Authorization
                -config replacer.full_list(0).replacement=Bearer ${{ secrets.DAST_TOKEN }}"
          rules_file_name: .zap/rules.tsv   # tune out known false positives
          allow_issue_writing: false
```

✨ If you have an OpenAPI or GraphQL schema, use the **API scan** rather than the spider. Crawling a single-page application misses most routes; a spec lists them all.

## Baseline vs Full Scan

| Scan Type | Duration | Safe Against | Use For |
|-----------|----------|-------------|---------|
| **Baseline (passive)** | 1–5 min | ✅ Any environment | Every deploy — headers, TLS, cookies |
| **API scan** | 5–20 min | Staging | Nightly, spec-driven |
| **Full active scan** | 30 min – hours | 🔴 **Never production** | Weekly / pre-release |

🔴 An active scan sends real attack payloads. It **will** create thousands of records, trigger emails, fire webhooks, and can exhaust the database. Run it only against an isolated environment with disposable data.

✅ Put the fast passive baseline scan in the deploy pipeline as a gate. Run the slow active scan on a schedule.

## Where DAST Goes in the Pipeline

```
Build ──► Deploy to ephemeral env ──► Baseline DAST (2 min)  ◄── gate
                                          ↓ pass
                                       Deploy to staging
                                          ↓
                            Nightly full active scan  ◄── report, ticket
                                          ↓
                                       Production
                                          ↓
                              Passive header/TLS check only
```

⚠️ **Do not put a full DAST scan in the pull request pipeline.** A 40-minute scan will be removed by the first person who needs to ship a hotfix.

## Tooling

| Tool | Notes |
|------|-------|
| **OWASP ZAP** | ✅ Free, scriptable, first-class CI support, API scan mode |
| **Burp Suite Pro** | Best for manual testing; Enterprise edition for automation |
| **Nuclei** | ✅ Fast template-based checks — excellent for known CVEs and misconfigurations |
| **Nikto** | Quick web server checks, dated but cheap |
| **AWS Inspector** | Not DAST — scans EC2/ECR/Lambda for known CVEs, no HTTP attacks |

**Nuclei is worth adding alongside ZAP:**

```bash
# Fast, low-noise checks for exposed panels, misconfigurations, and known CVEs
nuclei -u https://staging.example.com \
       -severity critical,high \
       -exclude-tags dos,fuzz \
       -json-export nuclei.json
```

## What DAST Cannot Find

| Blind Spot | Why | Cover It With |
|-----------|-----|--------------|
| **Broken access control between users** | Scanner has one identity | Authorization integration tests |
| **Business logic flaws** | No concept of intent | Threat modelling, manual testing |
| **Unreachable code paths** | Needs a specific state to reach | SAST |
| **Vulnerable dependencies** | Not visible externally | SCA |
| **Stored secrets** | Not exposed over HTTP | Secrets scanning |
| **Second-order effects** | Payload triggers hours later in a job | Manual testing |

🔴 **Access control again.** A scanner logged in as user A cannot tell that requesting user B's order succeeded when it should have failed — it just sees an HTTP 200.

**Test authorization yourself — it is the highest-value security test you can write:**

```typescript
// The test SAST and DAST both miss
describe("order authorization", () => {
  it("refuses to return another user's order", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const bobsOrder = await createOrder(bob.id);

    const res = await request(app)
      .get(`/api/orders/${bobsOrder.id}`)
      .set("Authorization", `Bearer ${alice.token}`);

    expect(res.status).toBe(404); // ❌ never 200
  });
});
```

> Write one of these for every resource-scoped endpoint. This single test pattern prevents the most common serious vulnerability in web applications.

## Interview Q&A

**Q: What is DAST and where does it belong in a pipeline?**

DAST tests a running application from the outside, sending real HTTP requests including attack payloads, with no knowledge of the source code. Because it needs a deployed target and takes minutes to hours, it does not belong in the pull request pipeline. The pattern I would use is a fast passive baseline scan — checking security headers, TLS configuration, and cookie flags — as a gate after deploying to an ephemeral or staging environment, since that takes a couple of minutes and catches real misconfiguration. The slow, full active scan runs on a nightly or weekly schedule against an isolated environment with disposable data, and its findings become tickets rather than build failures. Against production I would only ever run passive checks, because active scanning sends destructive payloads.

**Q: Why do most DAST implementations fail to find much?**

Because the scan is unauthenticated. If the scanner cannot log in, it only ever tests the login, registration, and health endpoints, which is a tiny fraction of the attack surface, and the report comes back nearly empty — which teams then read as "we're secure". Getting authentication working properly is the main implementation effort: injecting a bearer token is the most reliable approach for APIs, while form login and single-page applications need a recorded authentication script. The second reason is crawler coverage. A spider cannot discover routes in a client-rendered application, so if an OpenAPI or GraphQL schema exists, the spec-driven API scan gives dramatically better coverage than crawling.

**Q: Can you run a DAST scan against production?**

A passive scan, yes — checking response headers, TLS configuration, and cookie attributes involves no attack traffic and is safe. A full active scan, no. Active scanning sends injection payloads, path traversal attempts, and fuzzed input to every parameter it finds, which means it will create large volumes of junk records, trigger real emails and webhooks, potentially delete data by following destructive links, and can put enough load on the database to cause an incident. It also generates alerts that look identical to a genuine attack, which wastes your responders' time. The correct target is an isolated environment that mirrors production configuration but contains disposable, seeded data.

**Q: How do SAST, DAST, and SCA fit together?**

They cover different parts of the same problem. SAST reads your own source code and finds injection, unsafe deserialization, and hard-coded secrets, running fast enough for every pull request and pointing at the exact line. SCA looks at your dependencies, which is where the majority of vulnerable code in a modern application actually lives, and matches them against vulnerability databases. DAST tests the deployed system, which is the only way to find misconfiguration, missing headers, weak TLS, and exposed endpoints that exist in the environment rather than the code. None of them reliably find broken access control or business logic flaws, so those need explicitly written authorization tests and human review. A pipeline with all three plus runtime detection covers most of the realistic ground.

**Q: What is the most valuable security test a development team can write themselves?**

An authorization test for every resource-scoped endpoint: authenticate as one user, request another user's resource, and assert the response is a 404 or 403 rather than a 200. This matters because broken access control is the top category in the OWASP Top 10 and it is precisely the thing automated tooling cannot detect — a scanner sees a successful response and has no way to know it should have been denied, and a static analyser sees a perfectly ordinary database lookup. The test is cheap to write, runs in the normal test suite, and prevents the class of bug rather than one instance, since it fails the moment someone adds a new endpoint without an ownership check.

---

[← SAST](./02-sast.md) | [Index](./README.md) | [Container Security →](./04-container-security.md)
