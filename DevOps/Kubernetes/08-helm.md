---
title: Helm Charts
part: 8
chapter: 0
slug: helm
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-08-03
tags: [devops, kubernetes, helm]
in_book: false
---

# Helm Charts

Raw Kubernetes YAML does not scale across environments. Helm packages, templates, and versions your manifests.

## The Problem Helm Solves

```
❌ Raw YAML per environment:
   k8s/dev/deployment.yaml     ─┐
   k8s/staging/deployment.yaml  ├── 90% identical, drift constantly
   k8s/prod/deployment.yaml    ─┘

✅ One chart, three values files:
   chart/templates/deployment.yaml
   values-dev.yaml | values-staging.yaml | values-prod.yaml
```

Helm gives you three things: **templating** (one manifest, many environments), **packaging** (a versioned, distributable unit), and **release management** (upgrade, rollback, history).

## Chart Structure

```
api-chart/
├── Chart.yaml           # name, version, dependencies
├── values.yaml          # default values — the chart's public interface
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl     # reusable template snippets
│   └── NOTES.txt        # printed after install
└── charts/              # vendored dependency charts
```

```yaml
# Chart.yaml
apiVersion: v2
name: api
version: 1.4.2              # the CHART version
appVersion: "2.8.0"         # the APPLICATION version
dependencies:
  - name: redis
    version: "20.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: redis.enabled     # only installed if values enable it
```

⚠️ `version` and `appVersion` are different and both matter. `version` changes when the chart's templates change; `appVersion` tracks the application image. Bumping the app image without bumping the chart version makes releases untraceable.

## Templating Basics

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "api.fullname" . }}
  labels: {{- include "api.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels: {{- include "api.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        # Forces a rollout when the ConfigMap changes
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels: {{- include "api.selectorLabels" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "api.serviceAccountName" . }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          resources: {{- toYaml .Values.resources | nindent 12 }}
          {{- with .Values.env }}
          env: {{- toYaml . | nindent 12 }}
          {{- end }}
```

**The syntax that matters:**

| Construct | Purpose |
|-----------|---------|
| `{{ .Values.x }}` | Value from `values.yaml` or `--set` |
| `{{ .Release.Name }}` | The release name given at install |
| `{{ .Chart.Name }}` | From `Chart.yaml` |
| `{{- ... }}` / `{{ ... -}}` | Trim whitespace before / after |
| `nindent 4` | Newline + indent — the usual choice inside templates |
| `toYaml` | Serialize a values object into YAML |
| `{{- with .Values.x }}` | Enter scope only if non-empty (`.` becomes that value) |
| `include "name" .` | Call a named template from `_helpers.tpl` |
| `required "msg" .Values.x` | Fail the render if a value is missing |
| `default` | Fallback value |

⚠️ **Whitespace is the main source of Helm frustration.** YAML is indentation-sensitive and templates are text substitution. Always render with `helm template` before committing.

## Values Layering

Later sources override earlier ones:

```
1. Chart's values.yaml (defaults)
2. Parent chart values (for subcharts)
3. -f values-prod.yaml         (multiple -f allowed, later wins)
4. --set key=value             ← highest precedence
```

```bash
helm upgrade --install api ./api-chart \
  -f values-prod.yaml \
  --set image.tag=a3f9c21 \
  --namespace production
```

✅ Use `-f` files for environment configuration held in git, and `--set` only for the image tag injected by CI. Values set through `--set` are invisible to anyone reading the repo.

## Essential Commands

```bash
# ✅ The idempotent command to use in CI — installs or upgrades
helm upgrade --install api ./api-chart -f values-prod.yaml \
  --namespace production --create-namespace \
  --atomic --timeout 5m

# Render locally without touching the cluster — do this before every commit
helm template api ./api-chart -f values-prod.yaml

# Diff against what is actually deployed (helm-diff plugin)
helm diff upgrade api ./api-chart -f values-prod.yaml

helm list -n production          # releases and their revisions
helm history api -n production   # revision history
helm rollback api 3 -n production
helm lint ./api-chart
helm get values api -n production   # values actually used by the release
```

**Flags worth knowing:**

| Flag | Effect |
|------|--------|
| `--atomic` | ✅ Roll back automatically if the upgrade fails |
| `--wait` | Wait until resources are ready (implied by `--atomic`) |
| `--timeout` | How long to wait before declaring failure |
| `--dry-run` | Render and validate against the API server, apply nothing |
| `--create-namespace` | Create the namespace if missing |

✅ `helm upgrade --install --atomic` is the single most useful production invocation: idempotent, waits for readiness, and self-heals on failure.

## Release State and Rollback

Helm 3 stores each release revision as a Secret in the release's namespace.

```bash
kubectl get secrets -n production -l owner=helm
# sh.helm.release.v1.api.v1, ...v2, ...v3
```

```bash
helm history api
# REVISION  STATUS      CHART        APP VERSION  DESCRIPTION
# 1         superseded  api-1.4.0    2.7.0        Install complete
# 2         superseded  api-1.4.1    2.8.0        Upgrade complete
# 3         deployed    api-1.4.2    2.8.1        Upgrade complete

helm rollback api 2
```

⚠️ **Helm rollback does not undo everything.** It reverts the Kubernetes objects Helm manages. It cannot reverse a database migration a Job ran, and it does not delete resources created outside the release. Rollback is not a substitute for backward-compatible changes.

⚠️ A release stuck in `pending-upgrade` (usually a cancelled or timed-out apply) blocks further upgrades. Fix with `helm rollback` to the last good revision.

## Hooks

Hooks run resources at defined points in the release lifecycle.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "api.fullname" . }}-migrate
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"                  # lower runs first
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["npm", "run", "migrate"]
```

| Hook | Runs |
|------|------|
| `pre-install` / `post-install` | Around first install |
| `pre-upgrade` / `post-upgrade` | Around an upgrade — where migrations belong |
| `pre-delete` / `post-delete` | Around uninstall |
| `test` | On `helm test` |

⚠️ **A failed hook fails the release**, and hook resources are not tracked in the release manifest, so `helm rollback` will not undo their effects. Migrations run in hooks must be backward compatible — see expand/contract in [Deployment Strategies](../CICD/06-deployment-strategies.md).

## Library and Umbrella Charts

| Pattern | Purpose |
|---------|---------|
| **Library chart** (`type: library`) | Shared templates only, never installed directly |
| **Umbrella chart** | A parent whose dependencies are your services — deploy a whole stack |
| **Subchart** | A dependency, configured via a nested values key |

```yaml
# Parent values.yaml configuring a subchart
redis:                      # keys under the subchart's name
  enabled: true
  auth:
    enabled: true
  master:
    persistence:
      size: 8Gi
```

✅ A library chart is how a platform team standardizes Deployments, Services, and probes across dozens of application charts — each app chart supplies values, the library supplies structure.

⚠️ Umbrella charts couple release lifecycles: one failing subchart blocks the whole release. For independently deployable microservices, prefer one release per service.

## Helm vs Kustomize vs Raw YAML

| | Helm | Kustomize | Raw YAML |
|-|------|-----------|----------|
| **Approach** | Go templating | Patch overlays on a base | None |
| **Learning curve** | Steeper | Gentle | None |
| **Distribution** | ✅ Versioned repos | ❌ Copy the repo | ❌ |
| **Conditionals / loops** | ✅ Yes | ❌ No | ❌ |
| **Release tracking + rollback** | ✅ Built in | ❌ Uses `kubectl apply` | ❌ |
| **Readability** | Templates obscure the output | ✅ Output is plain YAML | ✅ Best |
| **Built into kubectl** | ❌ | ✅ `kubectl apply -k` | ✅ |

**How to choose:**

| Situation | Choose |
|-----------|--------|
| Distributing a chart to other teams or publicly | **Helm** — versioning and packaging are the point |
| Installing third-party software (Prometheus, ESO) | **Helm** — that's how they ship |
| Your own apps, few environments, GitOps | **Kustomize** — simpler, output is reviewable |
| Complex conditionals across many environments | **Helm** |

> A common production combination is Helm for third-party charts and Kustomize for your own services, both driven by Argo CD. Argo CD also supports rendering a Helm chart and applying Kustomize patches on top.

## Chart Quality Checklist

- [ ] Every configurable value in `values.yaml` with a sensible default
- [ ] `resources` configurable, with defaults set (never unlimited)
- [ ] Probes configurable
- [ ] `securityContext` defaults to non-root
- [ ] ServiceAccount created by the chart, optionally with an IAM role annotation
- [ ] `checksum/config` annotation so config changes trigger a rollout
- [ ] `helm lint` and `helm template` clean
- [ ] Chart version bumped on every template change
- [ ] `NOTES.txt` explains how to reach the deployed app
- [ ] No secrets committed in `values.yaml` — reference External Secrets instead

## Interview Q&A

**Q: What problem does Helm solve that raw manifests don't?**

Three things. Templating, so one set of manifests serves every environment through values files instead of near-duplicate YAML that drifts apart. Packaging, so a chart is a versioned, distributable artifact — which is why essentially all third-party Kubernetes software ships as a Helm chart. And release management: Helm records each revision, knows which objects belong to a release, and can roll back or clean up as a unit, whereas `kubectl apply` has no concept of a release and leaves orphaned objects when you remove a manifest from a directory.

**Q: What's the difference between Helm's `version` and `appVersion`?**

`version` is the chart's own version and must change whenever the templates or default values change — it is what consumers pin to. `appVersion` is informational and tracks the application inside the chart, typically matching the container image tag, and it is the default for `image.tag` in most charts. They move independently: fixing a probe configuration bumps `version` but not `appVersion`, while shipping a new application release bumps `appVersion` and usually `version` too. Teams that leave `version` static while changing templates lose the ability to tell which chart produced a given deployment.

**Q: How do you handle database migrations with Helm?**

With a `pre-upgrade` hook Job that runs the migration before the new pods roll out, using hook weights if several must run in order and a delete policy so old hook Jobs are cleaned up. The critical caveat is that hooks are not part of the release manifest, so `helm rollback` reverts the Kubernetes objects but does nothing about a migration that already ran. That means the migration itself must be backward compatible — expand/contract, where you add the new column, deploy code that writes both, backfill, then read from the new one, and only drop the old column in a later release. Otherwise a rollback leaves the previous application version pointed at a schema it cannot use.

**Q: Helm or Kustomize?**

They solve overlapping problems differently. Helm templates with Go templating and gives you packaging, versioning, and release tracking, which is essential for distributing charts and is how all third-party software ships. Kustomize patches a base with overlays, produces plain reviewable YAML, needs no new language, and is built into kubectl. My default is Helm for third-party software because that is the distribution format, and Kustomize for our own applications where the environments differ in a handful of values and I want the diff in a pull request to be readable YAML rather than a template. If our own apps needed heavy conditionals across many environments, or we were distributing them to other teams, I would use Helm for those too.

**Q: A `helm upgrade` failed halfway and now the release is stuck. What do you do?**

The release is likely in `pending-upgrade`, which blocks further upgrades because Helm believes an operation is still in flight. I check `helm history` to find the last successfully deployed revision and `helm rollback` to it, which clears the pending state and returns the cluster to a known good configuration. Then I diagnose the actual failure — usually a readiness probe never passing, an image that cannot be pulled, or an invalid manifest rejected by admission. To prevent it recurring I use `--atomic` with a `--timeout`, which makes Helm roll back automatically on failure rather than leaving a half-applied release, and I run `helm template` plus `helm diff upgrade` in CI so manifest errors surface before they reach the cluster.

---

[← RBAC & Security](./07-rbac-security.md) | [Monitoring & Logging →](./09-monitoring.md)
