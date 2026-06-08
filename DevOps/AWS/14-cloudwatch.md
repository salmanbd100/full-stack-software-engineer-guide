# CloudWatch (Monitoring & Observability)

AWS's native monitoring service — metrics, logs, alarms, and dashboards in one place.

## What CloudWatch Does

CloudWatch collects data from your AWS resources and applications. It answers three questions:

- **What is happening right now?** (metrics, dashboards)
- **Did something go wrong?** (alarms, notifications)
- **Why did it happen?** (logs, log insights)

```
AWS Services → CloudWatch Metrics
App Logs     → CloudWatch Logs
Alarms       → SNS / Auto Scaling / Lambda
Dashboards   → Visualize everything
```

## Metrics

### Standard vs Custom

| Type | Who Creates It | Examples | Cost |
|------|---------------|----------|------|
| **Standard** | AWS automatically | EC2 CPU, RDS connections, Lambda duration | Free |
| **Custom** | You push via API | Request count, queue depth, error rate | ~$0.30/metric/month |

⚠️ **EC2 memory and disk usage are NOT standard metrics.** AWS doesn't have access to the OS internals. You need the CloudWatch Agent to collect them.

### Key Concepts

**Namespace** — a logical grouping for metrics.

- `AWS/EC2` — standard EC2 metrics
- `AWS/RDS` — standard RDS metrics
- `MyApp/API` — your custom metrics

**Dimensions** — key-value pairs that filter metrics. For example, `InstanceId=i-1234` lets you see CPU for one specific EC2 instance, not the whole fleet.

**Resolution:**

- Standard: 1-minute granularity (default)
- High-resolution: 1-second granularity — available for custom metrics, costs more

### Publishing Custom Metrics

```bash
# Push a custom metric to CloudWatch
aws cloudwatch put-metric-data \
  --namespace "MyApp/API" \
  --metric-name "RequestCount" \
  --value 42 \
  --unit Count \
  --dimensions Environment=prod,Service=checkout
```

## CloudWatch Alarms

An alarm watches one metric and fires an action when it crosses a threshold.

### Alarm States

| State | Meaning |
|-------|---------|
| **OK** | Metric is within threshold |
| **ALARM** | Threshold crossed — action triggered |
| **INSUFFICIENT_DATA** | Not enough data to evaluate |

### Alarm Actions

- **SNS** — notify a team via email, Slack, PagerDuty
- **Auto Scaling** — scale your ASG in or out
- **EC2** — reboot, stop, or recover an instance
- **Systems Manager** — create an OpsItem for incident tracking

### Create an Alarm via CLI

```bash
# Alert when EC2 CPU > 80% for 2 consecutive minutes
aws cloudwatch put-metric-alarm \
  --alarm-name "HighCPU-prod-web" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 60 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ops-alerts \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0
```

### Composite Alarms

A composite alarm combines multiple alarms with AND/OR logic.

```
Composite: HighCPU AND HighNetworkOut → page on-call
```

✅ Use composite alarms to reduce noise. A single high-CPU spike may not matter. CPU high AND memory high AND error rate high — that's an incident.

❌ Don't create dozens of independent alarms for the same service. You'll get alert fatigue.

## CloudWatch Logs

### Structure

```
Log Group (one per app or service)
  └── Log Stream (one per instance or container)
        └── Log Events (individual log lines)
```

**Log groups** hold retention settings and metric filters. Set retention — otherwise logs stay forever and cost money.

```bash
# Set log retention to 30 days
aws logs put-retention-policy \
  --log-group-name /myapp/api \
  --retention-in-days 30
```

### Metric Filters

Extract a metric from log text. For example, count how many times "ERROR" appears.

```bash
# Create a filter that counts ERROR log lines
aws logs put-metric-filter \
  --log-group-name /myapp/api \
  --filter-name ErrorCount \
  --filter-pattern "ERROR" \
  --metric-transformations \
      metricName=ErrorCount,metricNamespace=MyApp/API,metricValue=1
```

Then create an alarm on that metric — you now have alerting on log errors.

### CloudWatch Log Insights

A query language to search and analyze logs. Much faster than grepping raw S3 exports.

```bash
# Find the top 10 slowest API requests in the last hour
fields @timestamp, requestId, duration
| filter duration > 1000
| sort duration desc
| limit 10
```

```bash
# Count errors by type in the last 24 hours
fields @timestamp, errorType
| filter level = "ERROR"
| stats count(*) as errorCount by errorType
| sort errorCount desc
```

```bash
# Start a Log Insights query via CLI
aws logs start-query \
  --log-group-name /myapp/api \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | limit 20'
```

## CloudWatch Agent

The agent runs on your EC2 instance and collects OS-level metrics and logs that CloudWatch can't get on its own.

| Without Agent | With Agent |
|--------------|------------|
| CPU (hypervisor level) | Memory usage |
| Network in/out | Disk usage |
| Status checks | Custom log files |
| - | Process-level metrics |

```bash
# Install the CloudWatch Agent on Amazon Linux 2
sudo yum install amazon-cloudwatch-agent -y

# Configure it (wizard or JSON config)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start the agent
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent
```

The agent configuration is a JSON file that specifies which metrics and log files to collect.

## Common DevOps Alarm Patterns

| Scenario | Metric | Threshold | Action |
|----------|--------|-----------|--------|
| High CPU on EC2 fleet | `CPUUtilization` | > 80% for 5 min | Scale out ASG |
| ALB 5xx errors | `HTTPCode_Target_5XX_Count` | > 10 in 1 min | Notify on-call |
| Lambda errors | `Errors` | > 0 in 1 min | Notify team |
| RDS low storage | `FreeStorageSpace` | < 10 GB | Notify DBA |
| SQS queue depth | Custom metric | > 1000 messages | Scale consumer |

## Useful CLI Commands

```bash
# List alarms in ALARM state
aws cloudwatch describe-alarms --state-value ALARM

# Get CPU metrics for an EC2 instance (last hour)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average

# Get Log Insights query results
aws logs get-query-results --query-id <query-id>
```

## Interview Q&A

**Q: How do you monitor EC2 memory usage with CloudWatch?**

Memory is an OS-level metric. AWS cannot see inside the OS. You must install the CloudWatch Agent on the instance. The agent reads memory from the OS and pushes it as a custom metric to CloudWatch. Without the agent, memory data is simply not available.

**Q: What is the difference between CloudWatch and CloudTrail?**

CloudWatch monitors **performance and behavior** — CPU, errors, latency, logs. CloudTrail records **API activity** — who called which AWS API, when, from where. Use CloudWatch to know *what is happening*. Use CloudTrail to know *who did what*. They complement each other.

**Q: How do you set up an alert for 5xx errors from an ALB?**

ALB publishes the metric `HTTPCode_Target_5XX_Count` to CloudWatch under the `AWS/ApplicationELB` namespace. Create a CloudWatch alarm on that metric with a threshold of, say, more than 10 in one minute. Set the alarm action to publish to an SNS topic that notifies your on-call channel.

**Q: What is a composite alarm and why would you use it?**

A composite alarm combines multiple child alarms using AND/OR logic. For example: alert only when CPU is high AND the error rate is also high. This reduces false positives. A single spike in one metric might not mean an incident. Combining signals gives you higher-confidence alerting with less noise.

**Q: How do you query logs efficiently in CloudWatch?**

Use CloudWatch Log Insights. It runs queries directly against log groups without exporting to S3. Key operators: `fields` (select columns), `filter` (where clause), `stats` (aggregate), `sort`, `limit`. For large time ranges, narrow your window and use specific log groups. Avoid querying all log groups at once — it's slow and expensive.

---

[← Load Balancers](./13-load-balancers.md) | [Security Services →](./15-security.md)
