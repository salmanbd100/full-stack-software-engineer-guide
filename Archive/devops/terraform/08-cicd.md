---
title: Terraform in CI/CD
part: 8
chapter: 0
slug: cicd
level: intermediate # beginner | intermediate | advanced
reading_time: 18
updated: 2026-08-03
tags: [devops, terraform, cicd]
in_book: false
---

# Terraform in CI/CD

Running Terraform from a laptop does not scale and does not audit. This file covers the pipeline that replaces it.

## Why Applies Must Move to CI

| Problem With Local Applies | What CI Fixes |
|---------------------------|---------------|
| No record of who changed production | Every apply is a pipeline run with an actor |
| Long-lived admin credentials on laptops | Short-lived OIDC credentials, scoped per environment |
| Different Terraform and provider versions per person | One pinned version |
| Uncommitted local edits get applied | Only committed code runs |
| Two people apply at once | Pipeline serialises runs per environment |

> If you cannot answer "who changed this, when, and what plan did they approve?" then Terraform is not really under control.

## The Core Workflow

```
Pull request opened
   ↓
fmt · validate · tflint · checkov · terraform test     (no credentials)
   ↓
terraform plan  (read-only role)
   ↓
policy check against plan.json
   ↓
plan posted as a PR comment  →  human review
   ↓
merge to main
   ↓
terraform apply  (write role, environment approval for prod)
```

**Two rules that make this safe:**

1. **Plan on pull request, apply on merge.** Never apply from a branch.
2. **Apply the saved plan file, not a fresh plan.** Otherwise you apply something nobody reviewed.

## Authenticate With OIDC, Not Keys

🔴 **Never store AWS access keys in CI secrets.** They are long-lived, they leak, and rotating them is manual.

✅ **OIDC:** the CI provider issues a short-lived token, AWS exchanges it for temporary credentials.

```hcl
# One-time setup: trust GitHub's OIDC provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "terraform_apply" {
  name = "terraform-apply"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # 🔴 Critical: scope to one repo AND one environment
          "token.actions.githubusercontent.com:sub" = "repo:acme/infrastructure:environment:production"
        }
      }
    }]
  })
}
```

⚠️ **The `sub` condition is the whole security boundary.** A loose condition like `repo:acme/*` lets any repository in the org assume your production apply role. Scope it to a specific repository and a specific branch or environment.

**Two roles, not one:**

| Role | Permissions | Used By |
|------|------------|---------|
| `terraform-plan` | `ReadOnlyAccess` + state read + lock write | Pull request jobs |
| `terraform-apply` | Write permissions for what it manages | Merge-to-main jobs only |

This means a pull request from a fork, or a malicious change to the workflow file, cannot write to AWS.

## GitHub Actions Pipeline

```yaml
# .github/workflows/terraform.yml
name: terraform

on:
  pull_request:
    paths: ['live/prod/**', 'modules/**']
  push:
    branches: [main]
    paths: ['live/prod/**', 'modules/**']

# Serialise runs per environment — Terraform's lock is a backstop, not a queue
concurrency:
  group: terraform-prod
  cancel-in-progress: false

env:
  TF_VERSION: 1.9.5
  WORKING_DIR: live/prod

jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    defaults:
      run:
        working-directory: ${{ env.WORKING_DIR }}
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111122223333:role/terraform-plan
          aws-region: eu-west-1

      - run: terraform init
      - run: terraform plan -out=tfplan -input=false -lock-timeout=5m

      # Human-readable for the comment, machine-readable for policy
      - run: terraform show -no-color tfplan > plan.txt
      - run: terraform show -json tfplan > plan.json

      - name: Policy check
        run: conftest test plan.json --policy ../../policy/

      - name: Comment plan on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('${{ env.WORKING_DIR }}/plan.txt', 'utf8');
            const body = `#### Terraform Plan
            <details><summary>Show plan</summary>

            \`\`\`terraform
            ${plan.length > 60000 ? plan.slice(0, 60000) + '\n... truncated' : plan}
            \`\`\`
            </details>`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            });

      # Hand the exact reviewed plan to the apply job
      - uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: ${{ env.WORKING_DIR }}/tfplan
          retention-days: 5

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production      # ← GitHub environment protection = manual approval
    permissions:
      id-token: write
      contents: read
    defaults:
      run:
        working-directory: ${{ env.WORKING_DIR }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111122223333:role/terraform-apply
          aws-region: eu-west-1

      - uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: ${{ env.WORKING_DIR }}

      - run: terraform init
      # ✅ Apply the reviewed plan file — no -auto-approve on a fresh plan
      - run: terraform apply -input=false tfplan
```

## Why the Saved Plan File Matters

❌ **Anti-pattern — plan on PR, then a *different* plan on apply:**

```yaml
- run: terraform plan          # reviewer sees this
# ... merge ...
- run: terraform apply -auto-approve   # 🔴 recomputes a NEW plan
```

Between review and merge, someone else could have applied, a data source could have changed, or another commit could have landed. What you apply is not what was approved.

✅ **Apply the artifact:**

```yaml
- run: terraform plan -out=tfplan   # saved and uploaded
- run: terraform apply tfplan       # exactly what was reviewed
```

⚠️ Saved plan files can contain sensitive values. Set a short artifact retention, and restrict who can download artifacts.

**Staleness guard:** if the plan artifact is older than the current state serial, Terraform refuses to apply it and tells you the plan is stale. That is the behaviour you want — regenerate and re-review.

## Handling Many Environments

**Matrix over directories:**

```yaml
jobs:
  plan:
    strategy:
      fail-fast: false
      matrix:
        stack: [10-network, 20-data, 30-platform, 40-apps]
    steps:
      - run: terraform plan -out=tfplan
        working-directory: live/prod/${{ matrix.stack }}
```

**Only run what changed** — use a path filter so a change to `40-apps` does not plan the whole estate:

```yaml
- uses: dorny/paths-filter@v3
  id: changes
  with:
    filters: |
      network: ['live/prod/10-network/**', 'modules/network/**']
      apps:    ['live/prod/40-apps/**', 'modules/service/**']
```

**Promotion order** — environments run in sequence, not in parallel:

```
dev  →  staging  →  [approval]  →  prod
```

✅ The same commit and the same module version flows through each. Never apply to production a version that has not been applied to staging.

## Drift Detection

Manual changes and out-of-band updates happen. Detect them on a schedule.

```yaml
name: drift-detection

on:
  schedule:
    - cron: '0 6 * * 1-5'   # weekday mornings
  workflow_dispatch:

jobs:
  detect:
    strategy:
      matrix:
        stack: [10-network, 20-data, 30-platform, 40-apps]
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111122223333:role/terraform-plan
          aws-region: eu-west-1
      - run: terraform init
        working-directory: live/prod/${{ matrix.stack }}

      # -detailed-exitcode: 0 = no changes, 1 = error, 2 = drift
      - id: plan
        continue-on-error: true
        run: terraform plan -detailed-exitcode -lock=false
        working-directory: live/prod/${{ matrix.stack }}

      - if: steps.plan.outputs.exitcode == 2
        run: |
          echo "Drift detected in ${{ matrix.stack }}"
          # send to Slack / open an issue / raise a PagerDuty event
          exit 1
```

| Exit Code | Meaning |
|-----------|---------|
| `0` | No changes — clean |
| `1` | Error running the plan |
| `2` | Drift — the plan has changes |

✅ Use `-lock=false` for drift detection. It is read-only, and you do not want a scheduled job blocking a real apply.

## Handling Failed Applies

An apply that fails halfway leaves partial infrastructure. This is a favourite scenario question.

```
apply → creates VPC ✅ → creates subnets ✅ → creates RDS ❌ (quota exceeded)
```

**What actually happens:** Terraform writes state for everything that succeeded, then stops. State is consistent with reality — it is just incomplete.

**Recovery:**

1. Read the error. Most failures are quota limits, IAM permissions, or invalid values.
2. Fix the cause — raise the quota, add the permission, correct the config.
3. Run `terraform plan` again. It will plan only the remaining work.
4. Apply.

⚠️ **Do not** run `terraform destroy` to "start clean" on a production stack. Fix forward.

**If the pipeline was killed mid-apply**, the state lock is still held:

```bash
terraform force-unlock <LOCK_ID>
```

🔴 Confirm no apply is genuinely still running first. Breaking a live lock is how state gets corrupted.

## Version Pinning

Three things must be pinned, or your pipeline is not reproducible.

```hcl
terraform {
  required_version = "~> 1.9.0"        # 1. Terraform itself

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"              # 2. Providers
    }
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"                    # 3. Modules
}
```

✅ **Commit `.terraform.lock.hcl`.** It records exact provider versions and checksums, so every CI run and every developer gets identical providers.

```bash
# Add hashes for other platforms so the lock works on Linux CI and macOS laptops
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64
```

❌ Never run `terraform init -upgrade` in a pipeline. That silently changes provider versions on a normal deploy.

## Common Pipeline Mistakes

| Mistake | Consequence | Fix |
|---------|------------|-----|
| Long-lived AWS keys in secrets | Leak = full account compromise | OIDC with a scoped `sub` |
| Same role for plan and apply | A PR can write to production | Read-only plan role |
| `apply -auto-approve` on a fresh plan | Applies something unreviewed | Apply the saved plan artifact |
| No `concurrency` group | Two applies race; locks time out | One concurrency group per environment |
| `-upgrade` in init | Provider changes on a routine deploy | Commit the lock file |
| No drift detection | Manual changes discovered during an incident | Scheduled `-detailed-exitcode` plan |
| Plan output in job logs only | Reviewers do not read it | Post it as a PR comment |

## Interview Q&A

**Q: Describe a production Terraform CI/CD pipeline.**

On a pull request, the fast credential-free checks run first: `fmt -check`, `validate` with `-backend=false`, TFLint, Checkov, and plan-mode `terraform test`. Then a plan job assumes a read-only role via OIDC, runs `terraform plan -out=tfplan`, converts it to JSON and runs policy checks with Conftest, posts the human-readable plan as a pull request comment, and uploads the plan file as an artifact. Merging to main triggers the apply job, which uses a separate write role, waits on a GitHub environment protection rule for manual approval on production, downloads the plan artifact, and runs `terraform apply tfplan`. Every environment has its own concurrency group so applies serialise. Alongside it there is a scheduled drift-detection workflow using `plan -detailed-exitcode` that alerts when exit code 2 comes back.

**Q: Why authenticate with OIDC instead of AWS access keys?**

Access keys stored in CI secrets are long-lived credentials sitting in a system that many people can influence, and rotating them is manual work nobody does. OIDC removes the stored secret entirely: the CI provider issues a signed short-lived token describing the workflow, AWS trusts that provider, and STS exchanges the token for credentials that expire in an hour. The critical detail is the trust policy condition on the `sub` claim. It has to name the specific repository and the specific branch or environment — something like `repo:acme/infrastructure:environment:production`. If you leave it as a wildcard over the organisation, any repository can assume your production apply role, which is worse than the access key you were trying to remove.

**Q: Why should the apply step use the saved plan file rather than running plan again?**

Because a fresh plan is not the plan that was reviewed. Between the pull request plan and the merge, another apply might have run, a data source could return something different, or another commit could have landed. If apply computes its own plan and runs with `-auto-approve`, you have automated applying changes that no human ever saw. Saving with `plan -out=tfplan`, uploading it as an artifact, and applying that exact file means what ships is what was approved. Terraform also refuses to apply a plan that has become stale relative to state, which correctly forces a re-plan and a re-review rather than silently proceeding. The one thing to be careful about is that plan files can contain sensitive values, so artifact retention should be short and access restricted.

**Q: A `terraform apply` failed halfway through. What is the state of your infrastructure and how do you recover?**

Terraform is not transactional, so the resources that were created before the failure exist and are recorded in state. State is consistent with reality — it is just incomplete relative to your configuration. That is actually the good case: you have not lost track of anything. Recovery is to read the error, which is usually a service quota, a missing IAM permission, or a value the provider rejected, fix that cause, and run plan again. The new plan will only contain the work that did not complete, and you apply it. What you should not do is run `destroy` to start clean, because on a production stack that is far more damaging than a partial apply. If the pipeline was killed rather than failing cleanly, the state lock will still be held, so you need `force-unlock` with the lock ID — but only after confirming nothing is genuinely still running.

**Q: How do you stop a pull request from being able to change production infrastructure?**

Separate roles with separate trust conditions. The plan role has `ReadOnlyAccess` plus permission to read the state object and write the lock, and its OIDC trust policy allows pull request workflows. The apply role has write permissions and its trust policy is scoped to the `main` branch or a protected GitHub environment, so a workflow running from a branch cannot assume it at all. On top of that, the apply job is gated by an environment protection rule requiring manual approval, and the plan is subject to policy checks that block dangerous actions like deleting an RDS instance. Branch protection with required reviews means the workflow file itself cannot be edited without review, which closes the loop — otherwise someone could just change the pipeline to use the apply role.

**Q: How do you detect drift, and what do you do about it?**

A scheduled workflow that runs `terraform plan -detailed-exitcode -lock=false` against every stack. The detailed exit code is the useful part: 0 means no changes, 1 means the plan errored, and 2 means there are changes — which on a stack where nothing was committed means drift. Exit code 2 raises an alert with the plan output attached. `-lock=false` matters because this is read-only and you do not want a scheduled job blocking a real apply. When drift shows up, you decide whether the manual change was wrong, in which case you apply the code to overwrite it, or whether it was right, in which case you bring it into the code and apply. The structural fix is removing human write access to production so drift cannot be created, with a break-glass role that raises an alert when it is used.

---
[Terraform Index](./README.md) | [← Testing](./07-testing.md) | [Security →](./09-security.md)
