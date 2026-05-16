# Disaster Recovery

## 💡 **Concept**

Disaster Recovery (DR) is your plan to restore service after a catastrophic failure — a region outage, data corruption, or ransomware attack. Two metrics define every DR strategy: **RTO** (how long until you're back) and **RPO** (how much data you can afford to lose).

**How to answer in an interview:** "I need to define RTO and RPO first. For a financial service, RPO might be zero and RTO might be 1 minute — that requires active-active multi-region. For an internal dashboard, RTO of 4 hours and RPO of 1 hour is acceptable — a warm standby is enough."

---

## RTO and RPO

| Term | Meaning | Example |
|------|---------|---------|
| **RTO** (Recovery Time Objective) | How long until service resumes | < 5 minutes |
| **RPO** (Recovery Point Objective) | How much data loss is acceptable | < 1 minute |

Lower RTO/RPO = higher cost and complexity.

---

## The Four DR Strategies

```
Cost and complexity →
Backup & Restore → Pilot Light → Warm Standby → Active-Active
←  Higher RTO/RPO                               Lower RTO/RPO →
```

### 1. Backup and Restore

**RTO:** hours | **RPO:** hours

Store backups in S3. Restore from scratch when needed. Cheapest option.

```typescript
interface BackupConfig {
  database: {
    automatedBackups: boolean;
    retentionDays: number;       // RDS automated backups
    snapshotFrequency: "daily" | "hourly";
  };
  application: {
    amiBackups: boolean;         // EC2 machine images
    s3CrossRegionReplication: boolean;
  };
}

const backupStrategy: BackupConfig = {
  database: {
    automatedBackups: true,
    retentionDays: 7,
    snapshotFrequency: "daily"
  },
  application: {
    amiBackups: true,
    s3CrossRegionReplication: true   // replicate to DR region
  }
};
```

### 2. Pilot Light

**RTO:** 30–60 min | **RPO:** minutes

Core infrastructure runs in DR region at minimum capacity. Data replicates continuously. Scale up on failover.

```
Primary region:        DR region (pilot light):
Full EC2 ASG           0 running instances (but AMI ready)
RDS primary       →    RDS read replica (will be promoted)
S3 primary        →    S3 CRR (cross-region replication)
```

**Failover steps:**
1. Promote RDS read replica to primary
2. Launch EC2 instances from pre-built AMI
3. Update Route 53 to point to DR region

### 3. Warm Standby

**RTO:** minutes | **RPO:** seconds

DR region runs a reduced-capacity duplicate. Scale out on failover, not from zero.

```typescript
interface WarmStandbyConfig {
  primaryRegion: string;
  drRegion: string;
  capacityRatio: number;       // DR runs at 25% of primary capacity
  rdsReplication: "synchronous" | "asynchronous";
  autoFailover: boolean;
}

const warmStandby: WarmStandbyConfig = {
  primaryRegion: "us-east-1",
  drRegion: "eu-west-1",
  capacityRatio: 0.25,         // scale to 100% on failover
  rdsReplication: "asynchronous",
  autoFailover: false          // manual failover decision
};
```

### 4. Active-Active (Multi-Region)

**RTO:** seconds | **RPO:** near-zero

Both regions serve production traffic simultaneously. Route 53 latency routing splits traffic. Each region has its own primary DB; data replicates bidirectionally.

```
Route 53 (latency routing)
├── us-east-1 ALB → ECS → Aurora Global Primary
└── eu-west-1 ALB → ECS → Aurora Global Secondary
                             ↕ (< 1 s replication)
```

**Aurora Global Database** enables < 1 second cross-region replication with automated regional failover.

---

## Strategy Selection

| RTO / RPO | Strategy | Monthly cost relative to primary |
|----------|---------|--------------------------------|
| Hours / Hours | Backup & Restore | ~5% |
| 30–60 min / minutes | Pilot Light | ~10% |
| Minutes / seconds | Warm Standby | ~50% |
| Seconds / near-zero | Active-Active | ~200% |

---

## Data Backup Best Practices

```typescript
interface BackupPolicy {
  frequency: string;
  retention: {
    daily: number;      // keep daily backups for N days
    weekly: number;     // keep weekly backups for N weeks
    monthly: number;    // keep monthly backups for N months
  };
  offsite: boolean;     // replicate to different region
  encrypted: boolean;
  tested: boolean;      // regularly test restoration
}

const productionBackup: BackupPolicy = {
  frequency: "every 6 hours",
  retention: {
    daily: 7,
    weekly: 4,
    monthly: 12
  },
  offsite: true,
  encrypted: true,
  tested: true          // monthly restoration drill
};
```

> **Test your backups.** An untested backup is not a backup. Run restoration drills monthly.

---

## Chaos Engineering

Test DR readiness before a real disaster.

| Practice | What it tests |
|---------|--------------|
| **Terminate random EC2** | Auto Scaling replacement |
| **Fail RDS primary** | Multi-AZ failover |
| **Block AZ traffic** | Multi-AZ routing |
| **Throttle network** | Timeout and retry logic |
| **Full region failover drill** | Complete DR process |

AWS Fault Injection Simulator (FIS) automates these experiments.

---

## Common Mistakes

❌ **Never testing the DR plan** — a DR plan you've never tested is a guess  
❌ **Single-region RDS without Multi-AZ** — AZ failure takes down your database  
❌ **Forgetting dependencies** — DNS TTL, cache warm-up, and third-party API limits can extend RTO  
❌ **Restoring from S3 CRR without checking replication lag** — data might not be fully synced at time of failure

**Key insight:**

> Start with the business requirement: what RTO and RPO does the product need? Work backward to the strategy. Most internal tools can tolerate Pilot Light (30–60 min RTO). Customer-facing services typically need Warm Standby or better.

---
[← Back to SystemDesign](../README.md)
