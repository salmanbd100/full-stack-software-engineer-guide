---
title: Log Aggregation on AWS (OpenSearch & ELK)
part: 8
chapter: 0
slug: elk-aws
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-03
tags: [devops, monitoring, elk, aws]
in_book: false
---

# Log Aggregation on AWS (OpenSearch & ELK)

Centralised logging is where large amounts of money get spent quietly. This file covers the pipeline design and the cost decisions.

## Why Centralise Logs at All

```
❌ Logs on the instance:
   - The instance is replaced → logs gone
   - 40 containers → 40 places to look
   - No search across services
   - Cannot correlate a request across the stack

✅ Centralised:
   - Survives the instance
   - One query across everything
   - Correlate by trace ID
   - Retention and access control in one place
```

⚠️ In containers this is not optional. A crashed pod's logs disappear with it, and `kubectl logs` cannot show you a pod that no longer exists.

## The ELK / OpenSearch Stack

| Component | Job | AWS Equivalent |
|-----------|-----|----------------|
| **Elasticsearch** | Store and index | Amazon OpenSearch Service |
| **Logstash** | Parse and transform | Fluent Bit, Kinesis Data Firehose |
| **Kibana** | Search and dashboard | OpenSearch Dashboards |
| **Beats / Fluent Bit** | Ship logs from hosts | Fluent Bit (the standard now) |

⚠️ **Naming:** AWS forked Elasticsearch 7.10 as **OpenSearch** after the licence change. Elasticsearch is Elastic's product; OpenSearch is the AWS-managed one. Interviewers use the terms loosely — know that they diverged.

## Pipeline Architecture

```
Application (stdout, JSON)
      ↓
Fluent Bit (DaemonSet on each node)
      ↓
   ┌──┴────────────────────────┐
   ↓                           ↓
Kinesis Data Firehose      OpenSearch  ← hot, searchable, 7–30 days
   ↓
S3 (Parquet)  ← cold, cheap, queried with Athena, years
```

✅ **This two-path design is the answer to the cost problem.** Recent logs go to OpenSearch where interactive search matters. Everything also lands in S3, where storage is roughly 20× cheaper and Athena can query it when you need history.

**Fluent Bit is the standard shipper** — it is written in C, uses a few megabytes of memory, and replaced Fluentd for most workloads.

```ini
[SERVICE]
    Flush         5
    Daemon        off
    Log_Level     warn

[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Mem_Buf_Limit     50MB
    Skip_Long_Lines   On

[FILTER]
    Name                kubernetes
    Match               kube.*
    Merge_Log           On
    Keep_Log            Off
    K8S-Logging.Parser  On

# Drop noise before it costs money
[FILTER]
    Name    grep
    Match   kube.*
    Exclude log /health|/readiness|kube-probe/

[OUTPUT]
    Name            opensearch
    Match           kube.*
    Host            search-acme-abc123.eu-west-1.es.amazonaws.com
    Port            443
    TLS             On
    AWS_Auth        On
    AWS_Region      eu-west-1
    Index           logs
    Logstash_Format On
    Logstash_Prefix app-logs
    Retry_Limit     5
```

🔴 **The `grep` exclude filter is the highest-value line in that config.** Health check logs are typically 30–60% of log volume in Kubernetes and have zero diagnostic value.

## Index Design

An **index** is where documents live. Getting this wrong is the main cause of OpenSearch problems.

```
❌ One index for everything, forever
   - Cannot delete old data without deleting documents one by one
   - Shards grow until queries crawl

✅ Time-based indices
   app-logs-2026.08.01
   app-logs-2026.08.02
   app-logs-2026.08.03
   → deleting yesterday is dropping one index: instant
```

### Shards — the classic mistake

```
Index = shards, each shard is a separate Lucene index
```

| Rule | Value |
|------|-------|
| **Target shard size** | 10–50 GB |
| **Shards per GB of heap** | Under 20 |
| **Small daily volume** | 1 shard, not 5 |

🔴 **Over-sharding is the most common OpenSearch failure.** The default used to be 5 shards per index. With daily indices at 2 GB, that is 5 shards of 400 MB each — 150 tiny shards a month, each costing cluster-state overhead and memory, for no benefit.

```json
PUT _index_template/app-logs
{
  "index_patterns": ["app-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "refresh_interval": "30s"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "level":      { "type": "keyword" },
        "service":    { "type": "keyword" },
        "trace_id":   { "type": "keyword" },
        "message":    { "type": "text" },
        "duration_ms":{ "type": "long" }
      }
    }
  }
}
```

⚠️ **`keyword` vs `text` matters:**

| Type | Behaviour | Use For |
|------|-----------|---------|
| `keyword` | Exact match, aggregatable | `level`, `service`, `trace_id`, IDs |
| `text` | Analysed into tokens, full-text search | `message` |

✅ Setting `service` as `text` breaks aggregations and wastes space. Setting `message` as `keyword` makes full-text search impossible.

✨ `refresh_interval: 30s` instead of the 1-second default significantly reduces indexing cost for logs, where near-real-time search is not required.

## Index State Management (ISM)

Automates the hot → warm → cold → delete lifecycle.

```json
{
  "policy": {
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "transitions": [{ "state_name": "warm", "conditions": { "min_index_age": "7d" }}]
      },
      {
        "name": "warm",
        "actions": [
          { "replica_count": { "number_of_replicas": 0 }},
          { "force_merge": { "max_num_segments": 1 }}
        ],
        "transitions": [{ "state_name": "delete", "conditions": { "min_index_age": "30d" }}]
      },
      {
        "name": "delete",
        "actions": [{ "delete": {} }]
      }
    ]
  }
}
```

| Tier | Storage | Use |
|------|---------|-----|
| **Hot** | Instance SSD | Active writes, fast search — days |
| **UltraWarm** | S3-backed | Read-only, ~10× cheaper — weeks |
| **Cold** | S3, must be attached to query | Compliance — months |
| **Delete** | — | Everything eventually |

✅ **UltraWarm is the main cost lever in OpenSearch.** Moving 7-day-old indices there typically cuts storage cost by an order of magnitude with only a modest query slowdown.

## Cluster Sizing

```
Daily ingest × retention days × (1 + replicas) × 1.15 overhead = storage needed
```

**Example:**

```
50 GB/day × 14 days × 2 (one replica) × 1.15 = 1,610 GB
```

| Component | Guidance |
|-----------|----------|
| **Dedicated master nodes** | 3, always — odd number for quorum |
| **Data nodes** | Minimum 2, spread across AZs |
| **Heap** | 50% of RAM, never above 32 GB (pointer compression) |
| **Multi-AZ** | Required for production |

🔴 **Never run production without dedicated master nodes.** When data nodes are also masters, a heavy query can destabilise cluster management and cause a split brain.

## Access Control and Security

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::111122223333:role/log-shipper" },
    "Action": ["es:ESHttpPost", "es:ESHttpPut"],
    "Resource": "arn:aws:es:eu-west-1:111122223333:domain/acme-logs/app-logs-*"
  }]
}
```

| Control | Why |
|---------|-----|
| **VPC-only domain** | 🔴 Never expose OpenSearch publicly — this is a recurring breach headline |
| **Encryption at rest and node-to-node** | Logs contain sensitive data |
| **Fine-grained access control** | Per-index and per-field permissions |
| **Field masking** | Hide PII fields from most users |
| **IRSA for shippers** | No stored credentials in Fluent Bit |

⚠️ **Logs are a PII liability.** Applications log request bodies, headers, and emails without meaning to. Redact at the shipper, before it reaches storage — once it is indexed, it is in your retention and your breach scope.

## OpenSearch vs CloudWatch Logs

| | CloudWatch Logs | OpenSearch |
|---|---|---|
| **Setup** | ✅ Zero | Cluster to size and operate |
| **Query language** | Logs Insights | ✅ Richer — full-text, aggregations |
| **Dashboards** | Basic | ✅ Strong |
| **Cost model** | Per GB ingested + stored | Per node-hour + storage |
| **Cost at low volume** | ✅ Cheaper | Fixed cluster cost regardless |
| **Cost at high volume** | Expensive | ✅ Cheaper per GB |
| **Retention** | Per log group | ISM with tiering |

✅ **Decision rule:** under roughly 50 GB/day, CloudWatch Logs is simpler and usually cheaper. Above that, or if you need real dashboards and full-text search, OpenSearch wins.

✨ A common pattern: CloudWatch Logs as the landing zone because AWS services write there natively, subscription filters forwarding to OpenSearch for search, and Firehose to S3 for long retention.

## Cost Control Checklist

- [ ] Health check and readiness probe logs dropped at the shipper
- [ ] `DEBUG` disabled in production
- [ ] Shard count matched to volume — not the default 5
- [ ] ISM policy: UltraWarm after 7 days, delete on schedule
- [ ] Long-term archive in S3 as Parquet, queried with Athena
- [ ] `refresh_interval` raised from 1s to 30s
- [ ] Replica count dropped to 0 on warm indices
- [ ] PII redacted before indexing

## Interview Q&A

**Q: Design a logging pipeline for a Kubernetes platform on AWS.**

Applications write structured JSON to stdout and never manage log files themselves. Fluent Bit runs as a DaemonSet, tails the container log files on each node, enriches each record with Kubernetes metadata like namespace, pod, and labels, and drops noise — health checks and readiness probes are typically a third to a half of volume with no diagnostic value. From there I would fan out to two destinations: OpenSearch for recent logs where interactive search and dashboards matter, with a retention of one to four weeks, and Kinesis Data Firehose to S3 in Parquet for long-term archive queried through Athena. That split is the key cost decision, because S3 storage is roughly twenty times cheaper than hot OpenSearch storage and most logs are never read after a few days. Every log line carries a trace ID so it correlates with X-Ray traces.

**Q: What is over-sharding and why does it hurt?**

Each shard is a separate Lucene index with its own memory footprint, file handles, and cluster-state entry, so shards have a fixed overhead independent of how much data they hold. Over-sharding is creating far more shards than your data volume justifies — the classic case is leaving the old default of five shards per index while writing daily indices of two gigabytes, which gives you five 400-megabyte shards a day and a hundred and fifty pointless shards a month. The result is wasted heap, a bloated cluster state that slows every operation, and queries that fan out across many tiny shards for no parallelism benefit. The guidance is to target shard sizes between ten and fifty gigabytes and keep under about twenty shards per gigabyte of heap, which for most daily log indices means a single shard.

**Q: What is the difference between `keyword` and `text` mappings?**

A `text` field is analysed — broken into tokens, lowercased, and indexed for full-text relevance search — while a `keyword` field is stored as a single exact value that can be filtered, sorted, and aggregated on. The distinction matters because getting it wrong breaks things silently. If `service` is mapped as `text`, you cannot reliably aggregate a count of logs per service, because the analyser has split the value into tokens. If `message` is mapped as `keyword`, you can only match the entire message string exactly, so searching for a phrase inside it fails. The rule I apply is that anything with a bounded set of values or used for filtering and grouping — level, service, environment, trace ID — is `keyword`, and free-form human-readable content is `text`.

**Q: CloudWatch Logs or OpenSearch?**

It comes down to volume and what you need to do with the logs. CloudWatch Logs has no infrastructure to run, AWS services write to it natively, and at low volume it is cheaper because you pay per gigabyte rather than for a cluster that costs the same whether it is busy or idle. Its limitations are a weaker query language and fairly basic dashboards. OpenSearch costs you a cluster to size, secure, and operate, but gives genuine full-text search, rich aggregations, and good dashboards, and the per-gigabyte economics become better at scale. My rough dividing line is around fifty gigabytes a day. A common middle path is using both: CloudWatch as the landing zone because AWS services default there, a subscription filter forwarding to OpenSearch for search and dashboards, and Firehose to S3 for cheap long-term retention.

**Q: How do you reduce logging costs?**

Volume first, because both CloudWatch and OpenSearch bill on it. The largest single win is usually dropping health check and probe logs at the shipper, which in Kubernetes is often a third of everything. Next is confirming `DEBUG` is off in production, which can be a tenfold difference on its own. After that it is tiering: an ISM policy moving indices to UltraWarm after about a week cuts storage cost by roughly an order of magnitude, replicas can be dropped to zero on read-only warm indices, and anything needing long retention belongs in S3 as Parquet rather than in a hot index. Configuration details help too — raising `refresh_interval` from one second to thirty reduces indexing overhead meaningfully for logs, where sub-second searchability is not a requirement.

**Q: What are the security concerns with centralised logging?**

The biggest one is that logs accumulate personal data nobody decided to collect. Applications log request bodies, headers, query strings, and error contexts, and those routinely contain emails, tokens, and payment details. Once indexed, that data is inside your retention period and inside your breach scope, so redaction has to happen at the shipper before storage rather than being handled later. Beyond that, the OpenSearch domain must be VPC-only — publicly exposed clusters are a recurring source of breach headlines — with encryption at rest and node-to-node, and fine-grained access control so developers can search their own service's indices but not everything. Field masking is useful for hiding sensitive fields from most users while keeping them available to a small group. Shippers should authenticate through IRSA rather than holding credentials.

---
[Monitoring Index](./README.md) | [← AWS X-Ray](./05-xray.md) | [Alerting & On-Call →](./07-alerting.md)
