---
title: Jenkins
part: 8
chapter: 0
slug: jenkins
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-08-03
tags: [devops, cicd, jenkins]
in_book: false
---

# Jenkins

Jenkins is the oldest and most widely deployed CI server. You will meet it in enterprises with existing pipelines, so interviews focus on **maintaining and modernizing** Jenkins rather than choosing it for a greenfield project.

## Architecture

```
Controller (master)
├── Stores job config, plugins, build history
├── Schedules builds — should NOT run them
└── Agents (nodes)
    ├── Agent 1: EC2 (Linux, Docker)
    ├── Agent 2: EC2 Spot (ephemeral)
    └── Agent 3: EKS pod (Kubernetes plugin)
```

| Component | Role |
|-----------|------|
| **Controller** | Web UI, job definitions, scheduling, plugin management |
| **Agent** | Executes build steps. Connects to the controller |
| **Executor** | One concurrent build slot on an agent |
| **Plugin** | Everything else — Git, Docker, AWS, credentials |

❌ **Never run builds on the controller.** A build can consume all memory, corrupt `JENKINS_HOME`, or read credentials it should not see.

✅ Set the controller's executor count to `0` and run all work on agents.

## Freestyle vs Pipeline

| | Freestyle Job | Pipeline (Jenkinsfile) |
|-|--------------|----------------------|
| **Defined in** | Web UI clicks | Code in the repository |
| **Versioned** | ❌ No | ✅ With the code |
| **Reviewable** | ❌ No | ✅ Pull request |
| **Complex logic** | Impossible | Full Groovy |
| **Use** | ❌ Legacy only | ✅ Always |

> If an interviewer asks how you would improve an existing Jenkins setup, "migrate freestyle jobs to Jenkinsfiles in the repo" is the strongest first answer.

## Declarative Pipeline

Declarative syntax is the modern standard. It is structured, validated, and readable.

```groovy
pipeline {
    agent none                       // no global agent — pick per stage

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '30'))
        disableConcurrentBuilds()     // avoid two deploys racing
        timestamps()
    }

    environment {
        ECR_REGISTRY = '123456789.dkr.ecr.us-east-1.amazonaws.com'
        IMAGE_TAG    = "${env.GIT_COMMIT.take(7)}"
    }

    stages {
        stage('Test') {
            agent { docker { image 'node:22-alpine' } }
            steps {
                sh 'npm ci'
                sh 'npm run lint'
                sh 'npm test -- --ci --reporters=jest-junit'
            }
            post {
                always {
                    junit 'junit.xml'          // publish results even on failure
                }
            }
        }

        stage('Build & Push') {
            when { branch 'main' }
            agent { label 'docker' }
            steps {
                withAWS(role: 'jenkins-ecr-push', roleAccount: '123456789') {
                    sh '''
                        aws ecr get-login-password | \
                          docker login --username AWS --password-stdin $ECR_REGISTRY
                        docker build -t $ECR_REGISTRY/api:$IMAGE_TAG .
                        docker push $ECR_REGISTRY/api:$IMAGE_TAG
                    '''
                }
            }
        }

        stage('Deploy Prod') {
            when { branch 'main' }
            agent { label 'docker' }
            input {
                message 'Deploy to production?'
                submitter 'release-managers'
            }
            steps {
                sh 'aws ecs update-service --cluster prod --service api --force-new-deployment'
            }
        }
    }

    post {
        failure {
            slackSend channel: '#alerts',
                      message: "❌ ${env.JOB_NAME} #${env.BUILD_NUMBER} failed"
        }
        cleanup {
            cleanWs()                 // always clean the workspace
        }
    }
}
```

**Key blocks:**

| Block | Purpose |
|-------|---------|
| `agent` | Where the stage runs. `agent none` at top forces per-stage choice |
| `options` | Timeouts, log rotation, concurrency control |
| `when` | Conditional stage execution (`branch`, `changeset`, `expression`) |
| `input` | Manual approval gate with an allowed submitter |
| `post` | Runs after: `always`, `success`, `failure`, `cleanup` |

⚠️ Always set a `timeout`. Without one, a hung job holds an executor forever.

## Parallel Stages

```groovy
stage('Checks') {
    parallel {
        stage('Unit')        { steps { sh 'npm run test:unit' } }
        stage('Integration') { steps { sh 'npm run test:integration' } }
        stage('SAST')        { steps { sh 'npm audit --audit-level=high' } }
    }
}
```

✅ `failFast true` inside `parallel` aborts siblings as soon as one fails — saves agent time.

## Declarative vs Scripted

| | Declarative | Scripted |
|-|------------|----------|
| **Starts with** | `pipeline { }` | `node { }` |
| **Structure** | Enforced sections | Free-form Groovy |
| **Validation** | Fails early on syntax | Fails at runtime |
| **Complex logic** | Escape via `script { }` | Native |
| **Use** | ✅ Default | Only for genuinely dynamic pipelines |

```groovy
// Escape hatch inside a declarative pipeline
steps {
    script {
        def services = readJSON file: 'services.json'
        services.each { svc -> sh "./build.sh ${svc}" }
    }
}
```

## Credentials

Jenkins has a built-in credential store. Secrets are referenced by ID, never inlined.

```groovy
steps {
    withCredentials([
        string(credentialsId: 'npm-token', variable: 'NPM_TOKEN'),
        usernamePassword(credentialsId: 'db',
                         usernameVariable: 'DB_USER',
                         passwordVariable: 'DB_PASS')
    ]) {
        sh 'npm publish'      // $NPM_TOKEN masked in console output
    }
}
```

| Credential Type | Use For |
|----------------|---------|
| **Secret text** | API tokens |
| **Username/password** | Registries, databases |
| **SSH private key** | Git over SSH, server access |
| **AWS credentials** | ❌ Prefer IAM instance roles or `withAWS` role assumption |

✅ **On AWS, avoid stored AWS keys entirely.** Give the Jenkins agent an EC2 instance profile (or IRSA if on EKS) and assume target roles with the AWS Steps plugin.

⚠️ Jenkins masks credentials in logs, but `echo $SECRET` in a shell trace or a `set -x` script can still leak them. Keep secrets out of command arguments.

## Shared Libraries

Shared libraries stop 40 teams from copy-pasting the same 200-line Jenkinsfile.

```
my-shared-library/
├── vars/
│   └── standardNodePipeline.groovy    # global function
└── src/com/acme/Deployer.groovy       # classes
```

```groovy
// vars/standardNodePipeline.groovy
def call(Map config) {
    pipeline {
        agent { label 'docker' }
        stages {
            stage('Test')   { steps { sh 'npm ci && npm test' } }
            stage('Deploy') {
                when { branch 'main' }
                steps { sh "./deploy.sh ${config.service}" }
            }
        }
    }
}
```

**Every repo's Jenkinsfile becomes:**

```groovy
@Library('acme-pipelines@v3') _
standardNodePipeline(service: 'api')
```

✅ Pin the library to a **tag**, not `master`. Otherwise a library change breaks every pipeline in the company at once.

## Multibranch Pipelines

A multibranch pipeline scans the repository and creates a job per branch that has a `Jenkinsfile`.

- New branch → job created automatically
- Branch deleted → job removed
- Pull requests get their own builds

✅ This is the standard way to run Jenkins against a Git repository. Combine it with `when { branch 'main' }` so deploy stages only run on the default branch.

## Jenkins on AWS

| Pattern | Description |
|---------|-------------|
| **Controller on EC2 + EBS** | `JENKINS_HOME` on EBS, snapshot for backup |
| **EC2 Fleet plugin** | Autoscale agents on Spot instances — big cost win |
| **Kubernetes plugin on EKS** | Each build runs in a fresh pod, then disappears |
| **IAM instance profile** | Agents get AWS access with no stored keys |
| **ALB + ACM** | HTTPS in front of the controller |

✅ **Ephemeral agents are the key improvement.** Static long-lived agents accumulate state — leftover Docker images, stale caches, `/tmp` clutter — and cause "works on agent 2 but not agent 5" failures.

## Backup and Disaster Recovery

Everything that matters lives in `JENKINS_HOME`.

```bash
# What to back up
$JENKINS_HOME/
├── jobs/          # job configs and build history
├── plugins/       # installed plugins + versions
├── secrets/       # ⚠️ master keys — required to decrypt credentials
├── users/
└── config.xml
```

✅ Store it as code where possible: Jenkinsfiles in repos, plugins pinned in a `plugins.txt`, and controller config via **Configuration as Code (JCasC)**.

```yaml
# jenkins.yaml — JCasC
jenkins:
  numExecutors: 0
  authorizationStrategy:
    roleBased:
      roles:
        global:
          - name: admin
            permissions: [Overall/Administer]
            assignments: [platform-team]
```

> With JCasC plus Jenkinsfiles, a destroyed controller is recreated by a Terraform apply — not a two-day restore.

## Jenkins vs Modern CI

| | Jenkins | GitHub Actions / GitLab CI |
|-|---------|---------------------------|
| **Hosting** | You run and patch it | Managed |
| **Flexibility** | Extremely high (2000+ plugins) | Moderate |
| **Maintenance** | High — plugin updates, security CVEs | Near zero |
| **Cost** | Infrastructure + engineer time | Per-minute |
| **Enterprise fit** | Air-gapped, custom hardware, legacy | Cloud-native |

> Honest interview position: Jenkins is the right answer for air-gapped environments, unusual build hardware, or a large existing investment. For a new cloud-native project, choose the CI that ships with your Git host.

## Interview Q&A

**Q: What is the difference between a declarative and a scripted Jenkins pipeline?**

Declarative pipelines start with `pipeline { }` and use a fixed structure of `agent`, `stages`, `steps`, `post`. Jenkins validates the structure before the build starts, so syntax errors fail immediately, and the visualization in Blue Ocean and the stage view works properly. Scripted pipelines start with `node { }` and are essentially raw Groovy, which gives unlimited flexibility but no early validation and much harder maintenance. Use declarative by default, and drop into a `script { }` block for the rare piece of dynamic logic you cannot express declaratively.

**Q: How do you manage secrets in Jenkins?**

Store them in the Jenkins credential store, referenced by ID, and inject them only inside a `withCredentials` block so the scope is limited to the steps that need them. Jenkins masks the values in console output. For AWS specifically, avoid storing access keys at all: give the agent an EC2 instance profile or use IRSA on EKS, and assume the target role at build time with the AWS Steps plugin, so credentials are temporary. Be careful with shell tracing — a `set -x` or a secret passed as a command-line argument can still appear in logs or in the process list.

**Q: Why should builds not run on the Jenkins controller?**

The controller holds job configuration, build history, plugins, and the encryption keys for all credentials. A build running there can exhaust memory or disk and take the whole CI system down, and malicious or careless build code has filesystem access to `JENKINS_HOME`, including the credential store. Running builds on separate agents isolates that risk and lets you scale build capacity independently. The standard hardening step is setting the controller's executor count to zero.

**Q: What are Jenkins shared libraries and when do you use them?**

A shared library is a Git repository containing reusable pipeline code — global functions under `vars/` and Groovy classes under `src/`. Repositories load it with `@Library('name@version')` and call a single function, so a standard build-test-deploy pipeline lives in one place instead of being copy-pasted into fifty Jenkinsfiles. This is how a platform team enforces consistent security scanning and deployment behaviour. Always reference the library by a version tag rather than a branch, so a library change rolls out deliberately rather than breaking every pipeline at once.

**Q: How would you modernize a legacy Jenkins setup?**

Start by moving freestyle jobs to Jenkinsfiles in the application repositories, so pipelines are versioned and reviewable, and configure multibranch pipelines so branches and pull requests are picked up automatically. Move controller configuration into Configuration as Code and pin plugin versions, so the controller becomes reproducible from Terraform instead of a hand-built server. Replace static agents with ephemeral ones — Kubernetes pods on EKS or Spot instances via the EC2 Fleet plugin — which removes state-related flakiness and cuts cost. Then extract duplicated pipeline logic into a versioned shared library. If the workloads have no special hardware or network requirements, propose migrating to the CI that ships with the Git host as the longer-term goal.

---

[← GitLab CI](./04-gitlab-ci.md) | [Deployment Strategies →](./06-deployment-strategies.md)
