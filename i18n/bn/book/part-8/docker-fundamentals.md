---
sourceHash: "d685cf3c07be2a1acc076c4eca788a1387529fbf0c7920343cded587cee84772"
title: "Container Image: Build ও Hardening"
translatedAt: "2026-10-19T07:59:22.952Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Container Image: Build ও Hardening {#ch-docker-fundamentals}

> আপনার pipeline যে image ship করে, সেটা এমনভাবে বানান, যাতে কয়েক সেকেন্ডে rebuild হয়, অদরকারি কিছু বয়ে না বেড়ায়, আর কোনো privilege ছাড়াই চলে।

**এই অধ্যায়ে:** image আর container আসলে কী · cache-এর ক্রম আর multi-stage build · base image বাছাই · non-root, read-only আর build secret · scanning আর exit code

## 💡 মূল ধারণা

Container হলো host-এর kernel-এর ওপর চলা সাধারণ একটি process, যার কাছে **machine-এর একটি সীমিত দৃশ্য** আছে। কী দেখতে
পাবে, তা ঠিক করে namespace: নিজের process list, network আর mount table। কতটা CPU আর memory পাবে, তা ঠিক করে control
group (cgroup)। কোনো guest operating system নেই, hypervisor-ও নেই। কিছু boot হয় না, তাই container চালু হয় কয়েক
millisecond-এ।

**Image** হলো read-only layer-এর একটি সাজানো stack, সঙ্গে metadata, যা বলে কোন command চলবে আর কোন user হিসেবে।
**Container** হলো সেই image, যার ওপরে একটি লেখার মতো layer বসানো। Container মুছলে চলে যায় শুধু ওই লেখার layer-টা।
আপনার pipeline যে artefact build করে, tag দেয় আর promote করে, সেটা image। Container তার সস্তা, ফেলে দেওয়ার মতো copy।

Dockerfile-এর প্রতিটি instruction একসঙ্গে দুটি কাজ করে। এটা **একটি cache key যোগ করে**, যা build-এর সময় ঠিক করে। আবার
**artefact-এ content যোগ করে**, যা image-এর আকার আর attack surface ঠিক করে। Dockerfile লেখার দক্ষতার বেশিরভাগটাই হলো এই
দুটি কাজ গুলিয়ে না ফেলা।

> Layer শুধু যোগ করে। পরের layer-এ মোছা file আগের layer-এ ঠিকই থেকে যায়, আর `docker history`
> দেখিয়ে দেয় সেটা কীভাবে এসেছিল।

## কীভাবে কাজ করে

### Container ছোট virtual machine নয়

Virtual machine নিজের kernel boot করে। Container host-এর kernel ভাগ করে নেয়। তাই container দেয় **packaging আর resource
isolation**, শক্ত কোনো security boundary নয়। Untrusted code-এর জায়গা microVM sandbox-এ (নিজস্ব kernel-ওয়ালা ছোট, দ্রুত
একটি virtual machine)।

### Layer, আর কেন ক্রমই build-এর সময় ঠিক করে

প্রতিটি instruction একটি layer বানায়, যাকে চেনা হয় তার content-এর hash দিয়ে। একই রকম layer জমা থাকে একবার, pull-ও
হয় একবার, যত image-ই সেটা ব্যবহার করুক।

**Image হলো layer-এর stack; লেখা যায় শুধু সবচেয়ে ওপরেরটায়:**

```text
writable layer   ← the container's own; discarded on removal
COPY . .         ← your source
RUN pnpm install ← node_modules
COPY package*    ← the manifest
FROM node:24-alpine  ← the base, shared with every other image using it
```

একটি layer-এর hash তার নিচের প্রতিটি layer-কে ধরে। Source-এর এক line বদলালে সেই layer আর তার পরের সবকিছু আবার build
হয়। আগেরগুলো হয় না। তাই instruction সাজান সবচেয়ে কম বদলায় থেকে সবচেয়ে বেশি বদলায়, এই ক্রমে: আগে শুধু manifest আর
lockfile copy করুন, install করুন, তারপর source copy করুন। এই দুটি copy উল্টে দিলে একটি component-এ এক line বদলালেই পুরো
dependency tree আবার install হয়।

⚠️ Cache আবার কাজে লাগে শুধু তখনই, যখন **builder-এর কাছে layer-গুলো এখনো আছে**। নতুন CI runner-এর কাছে কিছুই নেই, তাই
pipeline-কে স্পষ্টভাবে cache import করতে হয়। দেখুন [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions)।
Local-এ দ্রুত rebuild আর pipeline-এ দ্রুত build দুটি আলাদা সমস্যা, সমাধানও আলাদা।

### কী ship হবে, তা ঠিক করে multi-stage build

Build-এর জন্য লাগে toolchain, dev dependency আর source। Runtime-এর এর কোনোটাই লাগে না। Stage এই দুটিকে আলাদা করে, আর
image হয় শুধু শেষ stage-টা।

**এক stage-এ build করুন, আরেক stage থেকে ship করুন শুধু output:**

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

- `--from=build` copy করে **file, layer নয়**, তাই build stage-এর ইতিহাসের কিছুই ফলাফলে পৌঁছায় না।
- Copy-র সময়েই `--chown` দিলে পরে `RUN chown -R` লাগে না। সেটা লাগলে প্রতিটি file নতুন একটি layer-এ দ্বিগুণ হয়ে যেত।
- `USER` আসে copy-গুলোর পরে। Build-এর write access লাগে, runtime-এর লাগে না।
- `CMD` array form ব্যবহার করে। Shell form, মানে `CMD node server.js`, একটি shell-কে PID 1 বানায়, আর সেই shell
  SIGTERM-টা Node-এর কাছে পৌঁছে দেয় না।

একটি `.dockerignore` যোগ করুন, যাতে থাকবে `node_modules`, `.git` আর প্রতিটি local environment file। এটা আকার নিয়ন্ত্রণের
মতোই security-র নিয়ন্ত্রণও, কারণ `COPY . .` যাতে secret ভেতরে copy না করে, সেটা এটাই আটকায়।

### Base image বাছাই

| Base | আকার | কখন বাছবেন |
| ---------------------------- | ------- | --------------------------------------------- |
| `node:24` | ~1.1 GB | Production-এ কখনো নয়, এতে পুরো Debian userland |
| `node:24-slim` | ~200 MB | কোনো native module musl-এর সঙ্গে build হয় না |
| `node:24-alpine` | ~130 MB | Node service-এর default |
| `gcr.io/distroless/nodejs24` | ~110 MB | ভেতরে log in করার চেয়ে hardening বেশি জরুরি |

Distroless image-এ কোনো shell নেই, package manager-ও নেই। Attacker ভেতরে ঢোকার পরে যেসব জিনিস হাতে নেয়, তার বেশিরভাগই
এতে বাদ যায়। আবার `docker exec … sh`-ও বাদ যায়। তাই debug করতে হয় log, metrics আর একটি অস্থায়ী debug container দিয়ে।

**কোনো build হুবহু আবার তৈরি করতে হলে digest দিয়ে pin করুন:**

```dockerfile
FROM node:24-alpine@sha256:9e2f...   # exact bytes, not a pointer someone can move
```

Tag বদলানো যায়। `node:24-alpine` ঘনঘন rebuild হয়। Security patch-এর জন্য এটা ভালো, কিন্তু গত মঙ্গলবারের image আবার
বানাতে গেলে খারাপ। নিজের image-এ commit SHA দিয়ে tag দিন, কখনো শুধু `latest` নয়।

### Runtime-এর hardening

নিচের নিয়ন্ত্রণগুলো তার হাতে, যা image-টা চালায়: local stack হলে Compose, নয়তো orchestrator। Orchestrator সাধারণত
অন্য কোনো team-এর platform, আর সেখানেও একই setting থাকে, শুধু নাম আলাদা।

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

⚠️ **যে container-কে পুরোপুরি বিশ্বাস করেন না, তাতে কখনো Docker socket mount করবেন না।** `/var/run/docker.sock` হলো পুরো
Docker API। কোনো process এটা হাতে পেলে host-এর filesystem mount করা privileged container চালু করে ফেলতে পারে।

### Secret কখনো layer-এ থাকবে না

`ARG` আর `ENV`-এর value জমা থাকে image-এর metadata-তে, আর `docker history` সেগুলো দেখিয়ে দেয়। কখনো কখনো build-এর সত্যিই
credential লাগে, যেমন source map upload করতে। তখন সেটা শুধু একটি instruction-এর জন্য mount করুন।

**একটি `RUN`-এর জন্য secret mount করুন, তারপর build-এর সময় সেটা পাঠান:**

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=sourcemap_token,env=SENTRY_AUTH_TOKEN \
    pnpm build
```

```bash
docker build --secret id=sourcemap_token,env=SENTRY_AUTH_TOKEN -t api:1.4.2 .
```

Value-টা দেখতে পায় শুধু ওই একটি `RUN`, আর কোনো layer-এ সেটা যায় না। Runtime secret আলাদা সমস্যা। Container চালু হওয়ার
সময় secret store থেকে সেগুলো ঢুকিয়ে দিন, যাতে একটি rotate করতে গিয়ে rebuild করতে না হয়।

### Scan করুন, আর করতেই থাকুন

গত মাসে ship করা image-এর বিরুদ্ধেও নতুন vulnerability প্রকাশ হয়। তাই scanning শুধু build gate নয়, নির্দিষ্ট সময় পরপর
চলা একটি job-ও।

**High আর critical finding পেলে pipeline fail করান:**

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 api:1.4.2
```

Push-এর আগে চালান, আর deploy করা image-এর ওপর নির্দিষ্ট সময় পরপর আবার চালান। `docker buildx build --sbom=true` দিয়ে
software bill of materials (SBOM)-ও বানিয়ে রাখুন। তাহলে পরের বার কোনো library-র দুর্বলতা ব্যাপকভাবে কাজে লাগানো শুরু
হলে "আমরা কি আক্রান্ত?" প্রশ্নের উত্তর হবে একটি query, rebuild নয়।

### Container চালু থাকছে না

প্রথম রোগনির্ণয় হলো exit code।

**Exit code আর out-of-memory flag পড়ুন:**

```bash
docker inspect api --format='{{.State.ExitCode}} {{.State.OOMKilled}}'
```

| Code | মানে | কোথায় দেখবেন |
| ----- | -------------------------------- | ------------------------------------------------ |
| `1` | Application throw করেছে | `docker logs`, প্রথম দশ line |
| `137` | SIGKILL, সাধারণত OOM killer | Memory limit, নয়তো একটি leak |
| `139` | Segmentation fault | ভুল architecture-এর জন্য build করা native module |

তারপর `docker logs` পড়ুন, আর environment আর mount দেখতে `docker inspect` দেখুন। Log খালি থাকলে
`docker run -it --entrypoint sh <image>` আপনাকে filesystem-টা দেয়, বারবার মরে যাওয়া process-টা ছাড়াই।

## কখন ব্যবহার করবেন

| পরিস্থিতি | এটা করুন | কেন |
| ------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| যে Node service নিজেরা deploy করেন | Registry-তে multi-stage image, SHA দিয়ে tag | CI, staging আর production-এ একই artefact চলে |
| Managed platform-এ frontend | Dockerfile নয় | Platform নিজেই build করে চালায়; Dockerfile শুধু রক্ষণাবেক্ষণ বাড়ায় |
| Audit-এর জন্য হুবহু আবার তৈরি করা যায় এমন build | Base-কে digest দিয়ে pin করুন, lockfile commit করুন | Tag সরে যায়; digest সরে না |
| Build-এর সময় credential লাগে | BuildKit secret mount, কখনো `ARG` নয় | `docker history`-তে `ARG` পড়া যায় |
| অন্য কারও untrusted code চালানো | MicroVM sandbox | ভাগ করা kernel-এর ওপর বাজি ধরার মতো boundary নয় |

## সাধারণ ভুল

❌ **Install-এর ওপরে `COPY . .`।** প্রতিটি commit dependency layer বাতিল করে দেয়, আর build-এ কয়েক মিনিট লাগে।
✅ আগে manifest আর lockfile, তারপর install, তারপর source।

❌ **Private registry-র জন্য `ARG NPM_TOKEN`।** Image যতদিন থাকে, ততদিন এটা `docker history`-তে পড়া যায়।
✅ BuildKit secret হিসেবে mount করুন।

❌ **"এটা তো শুধু container" ভেবে root হিসেবে চালানো।** Kernel ভাগ করা, তাই ভেতরের root আর বাইরের root-এর মাঝে মাত্র
একটি bug-এর দূরত্ব। ✅ `USER node`, সঙ্গে `read_only`, আর যেখানে লিখতে হয় সেখানে একটি `tmpfs`।

❌ **`latest` deploy করা।** দুটি machine এক সপ্তাহের ব্যবধানে pull করলে দুটি আলাদা image পায়। ✅ Commit SHA দিয়ে tag
দিন, আর ঠিক সেই tag-টাই প্রতিটি environment-এ promote করুন।

❌ **শুধু build-এর সময় একবার scan করা।** Ship করার সময় image পরিষ্কার ছিল। Advisory এসেছে বৃহস্পতিবার।
✅ Deploy করা image-গুলো নির্দিষ্ট সময় পরপর scan করুন, আর query করা যায় এমন একটি SBOM রাখুন।

## 🔑 মূল শিক্ষা

- Container হলো machine-এর সীমিত দৃশ্য পাওয়া একটি host process। তাই এটা packaging আর resource isolation দেয়, শক্ত
  security boundary দেয় না।
- Image হলো read-only layer-এর stack, আর pipeline এটাই ship করে। Container তার ফেলে দেওয়ার মতো copy।
- Instruction-এর ক্রম build-এর সময় ঠিক করে। শেষ stage-এর content ঠিক করে image-এর আকার আর attack surface।
- Layer শুধু যোগ করে। তাই build secret copy করে পরে মুছলে চলবে না, একটি instruction-এর জন্য mount করতে হবে।
- Non-root user, read-only filesystem, বাদ দেওয়া capability আর নির্দিষ্ট সময় পরপর scanning: image audit-এ যা জিজ্ঞেস
  করা হয়, তার বেশিরভাগই এতে ঢাকা পড়ে।

## Interview-এর প্রশ্ন

**Q: Image আর container-এর পার্থক্য কী, আর container কেন ছোট virtual machine নয়?**

Image হলো layer-এর একটি read-only stack, সঙ্গে process কীভাবে চালু হবে তার metadata। Container তার একটি instance, যার
ওপরে একটি পাতলা লেখার layer। কিছুই virtualise করা হয় না: container হলো namespace আর cgroup দিয়ে সীমিত একটি host process,
তাই কয়েক millisecond-এ চালু হয়। দাম হলো kernel ভাগ করা। এজন্যই untrusted code-এর জায়গা virtual machine-এ।

**Q: একটি image build হতে নয় মিনিট লাগে, অথচ বদল শুধু application code-এর এক line। গোলমালটা কোথায়?**

Source copy হচ্ছে dependency install-এর আগে, তাই যেকোনো code change `node_modules` layer বাতিল করে দেয়। আগে manifest
আর lockfile copy করুন, install করুন, তারপর source copy করুন। CI-তে এর দ্বিতীয় একটি অংশ আছে: নতুন runner-এর কাছে কোনো
layer cache নেই, তাই pipeline-কে registry বা cache backend থেকে cache import করতে হয়।

**Q: `ARG` দিয়ে build secret পাঠানো যায় না কেন?**

`ARG`-এর value image-এর build metadata-তে লেখা থাকে, আর যে কেউ image pull করতে পারলেই `docker history` দিয়ে সেটা পড়তে
পারেন। পরের layer-এ file মুছলে লাভ নেই, কারণ layer শুধু যোগ করে। BuildKit secret mount value-টা শুধু সেই একটি `RUN`-কে
দেয়, যার দরকার, আর কোনো layer-এ লেখে না।

**Q: আপনি কি distroless base image ব্যবহার করবেন?**

যে service-এ security review গুরুত্বপূর্ণ, সেখানে হ্যাঁ। Shell আর package manager না থাকায় ভেতরে ঢোকার পর attacker যেসব
tool ব্যবহার করে, তার বেশিরভাগই বাদ যায়। অনেক জানা vulnerability (CVE)-ও বাদ যায়। দাম হলো debug করার সুবিধা: যে shell
নেই, তাতে exec করে ঢোকা যায় না। Team যদি debug করতে শুধু container-এ log in করতেই জানে, তাহলে distroless কাজে আসার আগে
ভোগাবে।

**Q: একটি container 137 দিয়ে exit করেছে। কী হয়েছিল, আর কী check করবেন?**

137 মানে 128 যোগ 9, তাই process-টা SIGKILL পেয়েছে। বাস্তবে পাঠায় প্রায় সবসময় OOM (out-of-memory) killer। নিশ্চিত হতে
`docker inspect`-এ `State.OOMKilled` দেখুন। তারপর ঠিক করুন limit খুব কম, নাকি process-টা leak করছে। স্বাভাবিক run-এর
সময় `docker stats` দেখলে বোঝা যায়: leak থাকলে memory কেবল বাড়তেই থাকে, কখনো নামে না।

**Q: সদ্য ঘোষিত কোনো vulnerability আপনাকে আক্রান্ত করছে কি না, কীভাবে বের করবেন?**

Build-এর সময় SBOM বানিয়ে image-এর সঙ্গে জমা রেখে। তাহলে প্রশ্নটা হয়ে যায় deploy করা সবকিছুর ওপর একটি query। চালু
image-গুলোর নির্দিষ্ট সময় পরপর scanning একই ঝুঁকি অন্য দিক থেকে ঢাকে। Build-এর সময়ের scan পার হওয়া image একটুও না
বদলেই পরে vulnerable হয়ে যেতে পারে।

## এরপর কী পড়বেন

- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) — pipeline-এ এই image-এর build, caching,
  scanning আর signing
- [Chapter ?? — Deployment Strategy, Rollback ও Feature Flag](#ch-deployment-strategies) — SHA দিয়ে tag দেওয়া
  image নিরাপদে promote করা, আর roll back করা
