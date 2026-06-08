# RDS (Relational Database Service)

RDS is a managed relational database. AWS handles patching, backups, hardware, and failover — you focus on your schema and queries.

## What RDS Gives You

✅ Automated backups and point-in-time recovery  
✅ Multi-AZ high availability with automatic failover  
✅ Read Replicas for read scaling  
✅ Encryption at rest (KMS) and in transit (SSL)  
✅ Automated minor version patching  

❌ No SSH access to the underlying OS  
❌ No custom storage engine plugins  
❌ Less control than running your own DB on EC2  

## Supported Engines

| Engine | Notes |
|--------|-------|
| **MySQL** | Most common; broad community support |
| **PostgreSQL** | Feature-rich; strong for complex queries |
| **MariaDB** | MySQL fork; community-driven |
| **Oracle** | Enterprise licensing required |
| **SQL Server** | Microsoft licensing; Windows workloads |
| **Aurora** | AWS-native; MySQL and PostgreSQL compatible |

## Aurora — The AWS-Native Engine

Aurora is not just another RDS engine — it is a ground-up rewrite by AWS.

**Aurora vs standard MySQL/PostgreSQL:**

| Feature | Aurora | MySQL/PostgreSQL on RDS |
|---------|--------|------------------------|
| **Speed** | Up to 5× faster (MySQL), 3× (Postgres) | Baseline |
| **Storage** | Auto-scales to 128 TB | Manual provisioning |
| **Replication** | 6 copies across 3 AZs (built-in) | Multi-AZ = 1 standby |
| **Read Replicas** | Up to 15 | Up to 5 |
| **Failover** | ~30 seconds | ~60–120 seconds |
| **Cost** | ~20% higher than RDS MySQL | Lower |

**Aurora Serverless v2** — scales compute capacity automatically (in Aurora Capacity Units) based on load. Ideal for unpredictable or spiky traffic patterns.

> Use Aurora for new production workloads unless you need Oracle or SQL Server. The built-in HA and scaling are worth the price premium.

## Multi-AZ Deployment

Multi-AZ is for **high availability**, not performance.

```
Primary DB (us-east-1a)
    │
    │ Synchronous replication
    │
Standby DB (us-east-1b)  ← NOT readable, NOT a replica
```

**How it works:**
1. AWS creates a standby instance in a different AZ
2. Every write to the primary is synchronously replicated to the standby
3. If the primary fails, AWS updates the DNS endpoint to point to the standby
4. Failover takes **1–2 minutes** (automatic, no manual action needed)

✅ Automatic failover  
✅ Synchronous replication — no data loss  
✅ Backups are taken from the standby — no I/O impact on primary  
❌ Standby is not accessible for reads — it only exists for failover  
❌ Adds ~20% cost  

⚠️ **Multi-AZ ≠ Read Replica.** The standby cannot serve traffic. It is a hot spare only.

## Read Replicas

Read Replicas are for **read scaling**, not high availability.

```
Primary DB (writes)
    │
    │ Asynchronous replication
    ├──► Read Replica 1 (reads)
    ├──► Read Replica 2 (reads)
    └──► Read Replica 3 (reads, cross-region)
```

**How it works:**
1. Asynchronous replication — slight lag behind primary (usually milliseconds)
2. Applications read from the replica endpoint directly
3. Replicas are readable — point your reporting/analytics queries here
4. Can be promoted to a standalone DB (breaks replication)
5. Up to **5 replicas** (MySQL, Postgres) or **15 replicas** (Aurora)

✅ Reduces load on the primary  
✅ Can be in the same region, cross-region, or cross-AZ  
✅ Cross-region replicas support disaster recovery  
❌ Asynchronous — replica may be slightly behind the primary  
❌ NOT automatic failover — promotion is a manual action  

## Multi-AZ vs Read Replicas — Critical Comparison

This distinction appears in almost every senior AWS interview.

| Feature | Multi-AZ | Read Replica |
|---------|----------|--------------|
| **Purpose** | High availability | Read scaling |
| **Replication** | Synchronous | Asynchronous |
| **Standby readable?** | ❌ No | ✅ Yes |
| **Failover** | ✅ Automatic | ❌ Manual promotion |
| **Number** | 1 standby | Up to 5 (15 for Aurora) |
| **Cross-region** | ❌ No | ✅ Yes |
| **Data loss on failure** | None (sync) | Possible (async lag) |
| **Use when** | You need uptime SLA | Read-heavy workloads |

> **Memory trick:** Multi-AZ = failover. Read Replica = read offloading.

## Backups: Automated vs Manual Snapshots

| Feature | Automated Backups | Manual Snapshots |
|---------|-------------------|-----------------|
| **Trigger** | Daily automatic | You run on demand |
| **What's saved** | Full daily + transaction logs | Full snapshot |
| **Retention** | 1–35 days (configurable) | Until you delete it |
| **Point-in-time restore** | ✅ Yes (to any second in retention window) | ❌ No (snapshot moment only) |
| **Cross-region copy** | ✅ Yes | ✅ Yes |
| **On instance delete** | ❌ Deleted with instance | ✅ Persists |

⚠️ When you delete an RDS instance, automated backups are deleted. **Take a final manual snapshot before deleting** any production database.

## RDS Security

```
VPC
├── Private subnet (DB subnet group)
│   ├── RDS Primary
│   └── RDS Standby
│
└── Security Group
    └── Allow port 5432 from app-servers-sg only
```

**Four layers of security:**

1. **Network** — put RDS in private subnets inside a VPC; never expose publicly
2. **Security Groups** — allow inbound only from your application security group
3. **IAM authentication** — use IAM tokens instead of passwords (supported for MySQL and PostgreSQL)
4. **Encryption** — at rest via KMS (set at creation, cannot enable later); in transit via SSL/TLS

```bash
# Connect to Postgres with SSL required
psql "host=mydb.xxx.rds.amazonaws.com \
      dbname=myapp \
      user=admin \
      sslmode=require"
```

⚠️ **Encryption at rest must be enabled at creation.** You cannot enable it on a running unencrypted instance. To encrypt: snapshot → copy with encryption → restore from encrypted snapshot.

## Parameter Groups

Parameter groups hold database engine settings (like `max_connections`, `innodb_buffer_pool_size`).

- Default parameter group — read-only, cannot edit
- Custom parameter group — create your own and attach to the instance
- Changes to **static** parameters require a reboot
- Changes to **dynamic** parameters apply immediately

```bash
# Create a custom parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name myapp-postgres14 \
  --db-parameter-group-family postgres14 \
  --description "Custom params for myapp"

# Modify a parameter
aws rds modify-db-parameter-group \
  --db-parameter-group-name myapp-postgres14 \
  --parameters "ParameterName=max_connections,ParameterValue=200,ApplyMethod=pending-reboot"
```

## Common CLI Commands

```bash
# Create a Multi-AZ RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier myapp-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username admin \
  --master-user-password secret123 \
  --allocated-storage 100 \
  --multi-az \
  --storage-encrypted

# List all RDS instances
aws rds describe-db-instances \
  --query "DBInstances[*].{ID:DBInstanceIdentifier,Class:DBInstanceClass,Status:DBInstanceStatus,MultiAZ:MultiAZ}"

# Create a manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier myapp-prod \
  --db-snapshot-identifier myapp-prod-pre-migration

# Create a read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier myapp-prod-replica \
  --source-db-instance-identifier myapp-prod
```

## Interview Q&A

**Q: What is the difference between Multi-AZ and Read Replicas? Which do you use for failover?**

Multi-AZ is for high availability. It keeps a synchronous standby in a different AZ. If the primary fails, AWS automatically fails over to the standby in 1–2 minutes — no data loss, no manual action. The standby cannot serve reads.

Read Replicas are for read scaling. They use asynchronous replication, so they can lag slightly behind the primary. They are readable, but promotion to primary is a manual action — they are not used for automatic failover.

Use Multi-AZ for uptime requirements. Use Read Replicas when your app is read-heavy and you want to offload queries.

---

**Q: What is Aurora and when would you choose it over standard RDS?**

Aurora is AWS's own database engine, compatible with MySQL and PostgreSQL. It stores data in a distributed storage layer across 3 AZs automatically (6 copies). It is up to 5× faster than MySQL, supports up to 15 read replicas, and fails over in about 30 seconds versus 60–120 for standard RDS.

Choose Aurora for new production workloads, especially if you need high availability and fast failover. Stick with standard RDS if you need Oracle or SQL Server, or if you have a strict budget.

---

**Q: How does automatic failover work in a Multi-AZ deployment?**

1. RDS detects the primary is unhealthy (via health checks)
2. It promotes the standby to primary
3. The RDS endpoint DNS record is updated to point to the new primary
4. Applications reconnect — failover completes in 1–2 minutes

Your application must handle reconnection. Use connection retry logic and short TCP timeouts. The endpoint URL stays the same — only the IP behind it changes.

---

**Q: Can you scale RDS vertically? What is the impact?**

Yes — change the instance class (for example, from `db.t3.medium` to `db.r6g.large`) via the console or CLI. For Multi-AZ, AWS first upgrades the standby, then performs a failover and upgrades the old primary — downtime is typically under 60 seconds. For single-AZ instances, downtime is a few minutes while the instance restarts. Schedule vertical scaling during a maintenance window.

---

**Q: How do you restore an RDS database to a specific point in time?**

Use **point-in-time recovery (PITR)**. Automated backups store daily snapshots plus transaction logs continuously. You can restore to any second within your retention window (1–35 days). In the console: choose the instance → "Restore to point in time" → pick the timestamp. This creates a **new** RDS instance — it does not overwrite your existing one.

---

[← EBS & EFS](./08-storage.md) | [DynamoDB →](./10-dynamodb.md)
