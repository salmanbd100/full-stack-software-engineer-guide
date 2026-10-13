---
sourceHash: "d685cf3c07be2a1acc076c4eca788a1387529fbf0c7920343cded587cee84772"
title: "Container Image: Build ও Hardening"
translatedAt: "2026-10-13T03:03:07.583Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Container Image: Build ও Hardening {#ch-docker-fundamentals}

> আপনার pipeline যে image ship করে, সেটা এমনভাবে build করুন যাতে কয়েক সেকেন্ডে আবার build হয়, অপ্রয়োজনীয় কিছু বহন না করে, আর কোনো privilege ছাড়া চলে।

**এই অধ্যায়ে:** image আর container আসলে কী · cache-এর ক্রম আর multi-stage build · base image বাছাই · non-root, read-only আর build secret · scanning আর exit code

## 💡 মূল ধারণা

একটি container হলো host-এর kernel-এর ওপর চলা একটি সাধারণ process, যার কাছে **machine-এর একটি সীমিত দৃশ্য** থাকে।
Namespace ঠিক করে এটা কী দেখতে পাবে: এর নিজস্ব process-এর তালিকা, network আর mount table। Control group
(cgroup) ঠিক করে এটা কতটা CPU আর memory ব্যবহার করতে পারবে। কোনো guest operating system নেই, কোনো hypervisor-ও
নেই। কিছুই boot হয় না, তাই একটি container কয়েক millisecond-এ চালু হয়।

একটি **image** হলো read-only layer-এর একটি সাজানো stack, সঙ্গে metadata, যা বলে কোন command চালাতে হবে আর কোন
user হিসেবে। একটি **container** হলো সেই image, যার ওপরে একটি writable layer আছে। Container delete করলে শুধু
writable layer-টি যায়। Image হলো সেই artefact, যা আপনার pipeline build করে, tag করে আর promote করে। Container
হলো এর সস্তা, ফেলে দেওয়ার মতো copy।

প্রতিটি Dockerfile instruction একসঙ্গে দুটি কাজ করে। এটা **একটি cache key যোগ করে**, যা build time ঠিক করে। আর
এটা **artefact-এ content যোগ করে**, যা image size আর attack surface ঠিক করে। Dockerfile লেখার দক্ষতার বেশিরভাগটাই
হলো এই দুটি কাজকে আলাদা করে মাথায় রাখা।

> Layer শুধু যোগ হয়। পরের কোনো layer-এ delete করা একটি file আগের layer-এর ভেতরে তখনও থাকে, আর `docker history`
> দেখায় সেটা কীভাবে সেখানে এল।

## কীভাবে কাজ করে

### Container ছোট Virtual Machine নয়

একটি virtual machine নিজের kernel boot করে। একটি container host-এর kernel share করে। তাই container আপনাকে দেয়
**packaging আর resource isolation**, কোনো শক্ত security boundary নয়। Untrusted code-এর জায়গা একটি microVM
sandbox-এ (একটি ছোট, দ্রুত virtual machine, যার নিজস্ব kernel আছে)।

### Layer, আর ক্রম কেন build time ঠিক করে

প্রতিটি instruction একটি layer তৈরি করে, যাকে এর content-এর একটি hash দিয়ে চেনা হয়। একই রকম layer একবারই store
হয় আর একবারই pull হয়, যত image-ই সেটা ব্যবহার করুক।

**Image হলো layer-এর একটি stack; শুধু সবার ওপরেরটা writable:**

```text
writable layer   ← the container's own; discarded on removal
COPY . .         ← your source
RUN pnpm install ← node_modules
COPY package*    ← the manifest
FROM node:24-alpine  ← the base, shared with every other image using it
```

একটি layer-এর hash তার নিচের প্রতিটি layer-কে ধরে। Source-এর এক line বদলালে সেই layer আর তার পরের সবকিছু আবার
build হয়। আগের কিছুই হয় না। তাই instruction সাজান সবচেয়ে কম বদলায় থেকে সবচেয়ে বেশি বদলায় এমন ক্রমে: শুধু
manifest আর lockfile copy করুন, install করুন, তারপর source copy করুন। এই দুটি copy উল্টে দিলে একটি component-এ
এক line-এর পরিবর্তন পুরো dependency tree আবার install করায়।

⚠️ একটি cache তখনই আবার ব্যবহার হয়, যখন **builder-এর কাছে layer-গুলো এখনো আছে**। একটি নতুন CI runner-এর কাছে
কিছুই নেই, তাই pipeline-কে স্পষ্টভাবে একটি cache import করতে হয়।
[Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) দেখুন। দ্রুত local rebuild আর দ্রুত
pipeline build দুটি আলাদা সমস্যা, আর এদের সমাধানও আলাদা।

### Multi-Stage Build ঠিক করে কী ship হবে

একটি build-এর দরকার হয় toolchain, dev dependency আর source। Runtime-এর এগুলোর কোনোটাই দরকার নেই। Stage এই
দুটিকে আলাদা করে, আর শুধু শেষ stage-টিই image হয়।

**এক stage-এ build করুন, আরেকটি থেকে শুধু output ship করুন:**

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./        # changes only when dependencies change
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .                                   # changes on every commit
RUN pnpm build && pnpm prune --prod        # drop dev dependencies from node_modules

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node                                  # the official image already provides this user
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

ওই file-এর চারটি খুঁটিনাটি দেখতে যতটা মনে হয়, তার চেয়ে বেশি গুরুত্বপূর্ণ:

- `--from=build` **file copy করে, layer নয়**, তাই build stage-এর কোনো history ফলাফলে পৌঁছায় না।
- Copy-র সময় `--chown` দিলে পরে আর `RUN chown -R` লাগে না, যেটা নতুন একটি layer-এ প্রতিটি file duplicate করত।
- `USER` আসে copy-গুলোর পরে। Build-এর write access দরকার। Runtime-এর দরকার নেই।
- `CMD` array রূপ ব্যবহার করে। Shell রূপ, `CMD node server.js`, একটি shell-কে PID 1 বানায়, আর সেই shell
  SIGTERM-কে Node-এর কাছে পৌঁছে দেয় না।

একটি `.dockerignore` যোগ করুন, যেখানে `node_modules`, `.git` আর প্রতিটি local environment file-এর নাম থাকবে। এটা
যতটা size-এর নিয়ন্ত্রণ, ততটাই security-র নিয়ন্ত্রণ, কারণ এটা `COPY . .` দিয়ে secret ভেতরে copy হওয়া আটকায়।

### Base Image বাছাই

| Base | Size | কখন বাছবেন |
| ---------------------------- | ------- | --------------------------------------------- |
| `node:24` | ~1.1 GB | Production-এ কখনো নয় — পুরো একটি Debian userland |
| `node:24-slim` | ~200 MB | কোনো native module musl-এর সঙ্গে build হচ্ছে না |
| `node:24-alpine` | ~130 MB | একটি Node service-এর default |
| `gcr.io/distroless/nodejs24` | ~110 MB | ভেতরে login করার চেয়ে hardening বেশি গুরুত্বপূর্ণ |

Distroless image-এ কোনো shell নেই, কোনো package manager নেই। ঢুকে পড়ার পর একজন attacker যা খোঁজে, তার বেশিরভাগই
এতে বাদ পড়ে। এতে `docker exec … sh`-ও বাদ পড়ে, তাই debug করতে হয় log, metrics আর একটি অস্থায়ী debug container
দিয়ে।

**একটি build হুবহু আবার তৈরি করতে হলে digest দিয়ে pin করুন:**

```dockerfile
FROM node:24-alpine@sha256:9e2f...   # exact bytes, not a pointer someone can move
```

একটি tag বদলানো যায়। `node:24-alpine` প্রায়ই নতুন করে build হয়। Security patch-এর জন্য এটা ভালো, আর গত
মঙ্গলবারের image আবার build করার জন্য খারাপ। নিজের image-গুলো commit SHA দিয়ে tag করুন, কখনো শুধু `latest` দিয়ে
নয়।

### Runtime-কে Harden করা

নিচের নিয়ন্ত্রণগুলো তার, যে image-টি চালায়: local stack-এর জন্য Compose, নয়তো orchestrator। Orchestrator সাধারণত
অন্য কোনো team-এর platform, আর সেটা একই setting ভিন্ন নামে ব্যবহার করে।

**Process-এর যা দরকার নেই, সব কেড়ে নিন:**

```yaml
services:
  api:
    image: api:1.4.2
    user: "1000:1000"            # an escape does not land as root
    read_only: true              # a dropped web shell has nowhere to be written
    tmpfs: [/tmp]                # hand back only what genuinely needs writing
    cap_drop: [ALL]              # drop every Linux capability…
    cap_add: [NET_BIND_SERVICE]  # …then add back only what is needed
    security_opt: [no-new-privileges:true]   # no escalation through a setuid binary
    deploy:
      resources:
        limits: { cpus: "2", memory: 1G, pids: 200 }   # pids stops a fork bomb
```

⚠️ **যে container-কে আপনি পুরোপুরি বিশ্বাস করেন না, তাতে কখনো Docker socket mount করবেন না।**
`/var/run/docker.sock` হলো পুরো Docker API। এটা যে process-এর হাতে আছে, সে একটি privileged container চালু করতে
পারে, যেটা host-এর filesystem mount করে।

### Secret কখনো Layer-এ থাকা উচিত নয়

`ARG` আর `ENV`-এর value image-এর metadata-তে store হয়, আর `docker history` সেগুলো দেখায়। কখনো কখনো একটি
build-এর সত্যিই একটি credential দরকার হয়, যেমন source map upload করতে। তখন সেটা শুধু একটি instruction-এর জন্য
mount করুন।

**একটি `RUN`-এর জন্য secret mount করুন, তারপর build-এর সময় সেটা দিন:**

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=sourcemap_token,env=SENTRY_AUTH_TOKEN \
    pnpm build
```

```bash
docker build --secret id=sourcemap_token,env=SENTRY_AUTH_TOKEN -t api:1.4.2 .
```

Value-টি শুধু সেই একটি `RUN` দেখতে পায়, আর কোনো layer-এ যায় না। Runtime secret আলাদা সমস্যা। Container চালু হওয়ার
সময় একটি secret store থেকে সেগুলো inject করুন, যাতে একটি rotate করলে আবার build করতে না হয়।

### Scan করুন, আর Scan করতে থাকুন

গত মাসে আপনি যে image ship করেছেন, তার বিরুদ্ধে নতুন vulnerability প্রকাশিত হয়। তাই scanning শুধু build gate নয়,
একটি scheduled job-ও।

**High আর critical finding পেলে pipeline fail করান:**

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 api:1.4.2
```

Push-এর আগে এটা চালান, আর deploy করা জিনিসের ওপর একটি schedule-এ আবার চালান। `docker buildx build --sbom=true`
দিয়ে একটি software bill of materials (SBOM)-ও তৈরি করুন। তাহলে পরের ব্যাপকভাবে exploit হওয়া library যখন আসবে,
"আমরা কি আক্রান্ত?" প্রশ্নটা হবে একটি query, rebuild নয়।

### যখন একটি Container চালু থাকে না

Exit code-ই প্রথম রোগনির্ণয়।

**Exit code আর out-of-memory flag পড়ুন:**

```bash
docker inspect api --format='{{.State.ExitCode}} {{.State.OOMKilled}}'
```

| Code | মানে | কোথায় দেখবেন |
| ----- | -------------------------------- | ------------------------------------------------ |
| `1` | Application throw করেছে | `docker logs`, প্রথম দশ line |
| `137` | SIGKILL — সাধারণত OOM killer | Memory limit, নয়তো একটি leak |
| `139` | Segmentation fault | ভুল architecture-এর জন্য build করা একটি native module |

তারপর `docker logs` পড়ুন, আর environment ও mount-এর জন্য `docker inspect` দেখুন। Log খালি হলে,
`docker run -it --entrypoint sh <image>` আপনাকে filesystem দেয়, বারবার মরে যাওয়া process-টি ছাড়াই।

## কখন ব্যবহার করবেন

| পরিস্থিতি | এটা করুন | কেন |
| ------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| একটি Node service, যা আপনি নিজে deploy করেন | Registry-তে একটি multi-stage image, SHA দিয়ে tag করা | একই artefact CI, staging আর production-এ চলে |
| একটি managed platform-এ একটি frontend | কোনো Dockerfile নয় | Platform-ই এটা build করে আর চালায়; একটি Dockerfile শুধু রক্ষণাবেক্ষণের কাজ বাড়ায় |
| Audit-এর জন্য একটি reproducible build | Base-কে digest দিয়ে pin করুন, lockfile commit করুন | Tag সরে যায়; digest সরে না |
| Build-এর সময় একটি credential দরকার | একটি BuildKit secret mount, কখনো `ARG` নয় | `ARG` `docker history`-তে পড়া যায় |
| অন্য কারো untrusted code চালানো | একটি microVM sandbox | একটি shared kernel এমন boundary নয়, যার ওপর বাজি ধরা যায় |

## সাধারণ ভুল

❌ **Install-এর ওপরে `COPY . .`।** প্রতিটি commit dependency layer-কে invalidate করে, আর build-এ কয়েক মিনিট লাগে।
✅ আগে manifest আর lockfile, তারপর install, তারপর source।

❌ **Private registry-র জন্য `ARG NPM_TOKEN`।** Image যতদিন বেঁচে থাকে, ততদিন এটা `docker history`-তে পড়া যায়।
✅ এটাকে একটি BuildKit secret হিসেবে mount করুন।

❌ **"এটা তো শুধু একটি container" ভেবে root হিসেবে চালানো।** Kernel shared, তাই ভেতরের root বাইরের root থেকে মাত্র
একটি bug দূরে। ✅ `USER node`, সঙ্গে `read_only`, আর যেখানে write দরকার সেখানে একটি `tmpfs`।

❌ **`latest` deploy করা।** দুটি machine এক সপ্তাহ ব্যবধানে এটা pull করে আর আলাদা image পায়। ✅ Commit SHA দিয়ে
tag করুন, আর ঠিক সেই tag-টিই প্রতিটি environment-এর মধ্য দিয়ে promote করুন।

❌ **শুধু একবার, build-এর সময় scan করা।** Ship করার সময় image পরিষ্কার ছিল। Advisory এসেছে বৃহস্পতিবার।
✅ Deploy করা image-গুলো একটি schedule-এ scan করুন, আর query করা যায় এমন একটি SBOM রাখুন।

## 🔑 মূল শিক্ষা

- একটি container হলো machine-এর সীমিত দৃশ্যসহ একটি host process। তাই এটা packaging আর resource isolation দেয়,
  কিন্তু শক্ত কোনো security boundary দেয় না।
- একটি image হলো read-only layer-এর একটি stack, আর এটাই সেই artefact যা pipeline ship করে। Container হলো এর
  ফেলে দেওয়ার মতো copy।
- Instruction-এর ক্রম build time ঠিক করে, আর শেষ stage-এর content ঠিক করে image size আর attack surface।
- Layer শুধু যোগ হয়, তাই একটি build secret copy করে পরে delete করা চলে না। সেটা একটি instruction-এর জন্য mount
  করতে হয়।
- একটি non-root user, একটি read-only filesystem, বাদ দেওয়া capability আর scheduled scanning — একটি image audit
  যা জিজ্ঞেস করে, তার বেশিরভাগই এগুলোতে ঢাকা পড়ে।

## Interview-এর প্রশ্ন

**Q: Image আর container-এর পার্থক্য কী, আর একটি container কেন একটি ছোট virtual machine নয়?**

একটি image হলো layer-এর একটি read-only stack, সঙ্গে process কীভাবে চালু করতে হবে সেই metadata। একটি container
হলো এর একটি instance, যার ওপরে একটি পাতলা writable layer আছে। কিছুই virtualise করা হয় না: container হলো
namespace আর cgroup দিয়ে সীমিত একটি host process, তাই এটা কয়েক millisecond-এ চালু হয়। এর মূল্য হলো একটি shared
kernel। এ কারণেই untrusted code-এর জায়গা একটি virtual machine-এ।

**Q: একটি image build হতে নয় মিনিট লাগে, আর একমাত্র পরিবর্তন ছিল application code-এর এক line। সমস্যা কী?**

Source copy করা হচ্ছে dependency install-এর ওপরে, তাই code-এর যেকোনো পরিবর্তন `node_modules` layer-কে invalidate
করে। আগে manifest আর lockfile copy করুন, install করুন, তারপর source copy করুন। CI-তে এর একটি দ্বিতীয় অংশ আছে:
নতুন runner-এর কোনো layer cache নেই, তাই pipeline-কে একটি registry বা cache backend থেকে cache import করতে হয়।

**Q: `ARG` দিয়ে একটি build secret কেন পাঠানো যায় না?**

`ARG`-এর value image-এর build metadata-তে লেখা থাকে, আর যে image pull করতে পারে, সে `docker history` দিয়ে সেগুলো
পড়তে পারে। পরের layer-এ file delete করে লাভ নেই, কারণ layer শুধু যোগ হয়। একটি BuildKit secret mount value-টি
শুধু সেই একটি `RUN`-কে দেয়, যার এটা দরকার, আর কোনো layer-এ লেখে না।

**Q: আপনি কি একটি distroless base image ব্যবহার করবেন?**

যে service-এর ক্ষেত্রে security review গুরুত্বপূর্ণ, সেখানে হ্যাঁ। Shell আর package manager না থাকলে, ঢুকে পড়ার পর
একজন attacker যে tool-গুলো ব্যবহার করে, তার বেশিরভাগই বাদ পড়ে। অনেক জানা vulnerability (CVE)-ও বাদ পড়ে। মূল্য
হলো debug করার সুবিধা: যে shell নেই, তাতে exec করা যায় না। Team-এর debug করার একমাত্র উপায় যদি container-এ login
করা হয়, তাহলে distroless উপকার করার আগে কষ্ট দেবে।

**Q: একটি container 137 দিয়ে exit করেছে। কী ঘটেছে, আর আপনি কী check করবেন?**

137 হলো 128 যোগ 9, তাই process-টি SIGKILL পেয়েছে। বাস্তবে যে পাঠায়, সে প্রায় সবসময় OOM (out-of-memory) killer।
`docker inspect`-এ `State.OOMKilled` দিয়ে নিশ্চিত হন। তারপর ঠিক করুন limit খুব কম, নাকি process-টি leak করছে:
স্বাভাবিক চলার সময় `docker stats` দেখায়, leak থাকলে memory বাড়তেই থাকে, কখনো কমে না।

**Q: নতুন ঘোষিত একটি vulnerability আপনাকে প্রভাবিত করে কি না, কীভাবে বের করবেন?**

Build-এর সময় একটি SBOM তৈরি করে image-এর সঙ্গে store করে রাখলে প্রশ্নটা হয়ে যায় deploy করা সবকিছুর ওপর একটি
query। চলমান image-গুলোর scheduled scanning অন্য দিক থেকে একই ঝুঁকি ঢাকে। Build-এর সময়কার scan পাস করা একটি
image পরে কোনো পরিবর্তন ছাড়াই vulnerable হয়ে যেতে পারে।

## এরপর কী পড়বেন

- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) — pipeline-এ এই image build, cache, scan
  আর sign করা
- [Chapter ?? — Deployment Strategy, Rollback ও Feature Flag](#ch-deployment-strategies) — SHA দিয়ে tag করা
  image নিরাপদে promote করা, আর rollback করা
