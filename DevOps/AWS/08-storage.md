# EBS & EFS (Block and File Storage)

EBS is a hard disk for your EC2 instance. EFS is a shared network drive that many instances can use at once.

## EBS Overview

**Elastic Block Store (EBS)** — persistent block storage attached to one EC2 instance. Think of it as an external SSD plugged into your VM.

```
EC2 Instance
    │
    └── EBS Volume (block storage, same AZ)
```

**Key facts:**
- Lives in **one Availability Zone** — always in the same AZ as your EC2
- Persists after instance stop/restart (unlike instance store)
- Can resize upward — you can increase size, but never decrease
- Network-attached, not physically inside the host

## EBS Volume Types

| Type | Category | IOPS | Throughput | Best For |
|------|----------|------|------------|----------|
| **gp3** | General SSD | 3,000–16,000 | 125–1,000 MB/s | Default choice for most workloads |
| **gp2** | General SSD | 100–16,000 (tied to size) | Up to 250 MB/s | Legacy — prefer gp3 |
| **io2 Block Express** | Provisioned SSD | Up to 256,000 | Up to 4,000 MB/s | Mission-critical DBs (Oracle, SAP) |
| **st1** | Throughput HDD | 500 | 500 MB/s | Big data, log processing, streaming |
| **sc1** | Cold HDD | 250 | 250 MB/s | Infrequent access, archives |

> **gp3 is the default.** It decouples IOPS from size — you can add IOPS without buying more storage. Always prefer gp3 over gp2 for new volumes.

**When to reach for io2:**
- Need > 16,000 IOPS
- Running Oracle, SQL Server, or SAP HANA
- Multi-Attach is required

⚠️ **st1 and sc1 cannot be used as boot volumes.** Only SSD types (gp2, gp3, io1, io2) can boot an instance.

## EBS Key Properties

**Single-AZ attachment:**
```
us-east-1a: EC2 → EBS volume ✅
us-east-1b: EC2 → same EBS volume ❌  (must snapshot and recreate)
```

**Multi-Attach (io1/io2 only):**
- Attach one volume to up to 16 instances in the same AZ
- Each instance needs a cluster-aware filesystem (like GFS2)
- Use case: high-availability shared storage for Linux clusters

⚠️ Multi-Attach does NOT work with gp2 or gp3.

## EBS Snapshots

Snapshots are incremental backups stored in S3 (you don't see the bucket — AWS manages it).

```bash
# Create a snapshot
aws ec2 create-snapshot \
  --volume-id vol-0abc123 \
  --description "pre-deploy backup"

# Copy snapshot to another region (for DR or migration)
aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id snap-0abc123 \
  --destination-region eu-west-1

# Create a new volume from snapshot (in target AZ)
aws ec2 create-volume \
  --snapshot-id snap-0abc123 \
  --availability-zone us-east-1b \
  --volume-type gp3
```

**Snapshot facts:**
- ✅ Incremental — only changed blocks are saved after the first snapshot
- ✅ Can copy across regions (good for disaster recovery)
- ✅ Can create AMIs from snapshots
- ✅ Fast Snapshot Restore (FSR) — eliminates the first-access latency penalty

## EFS Overview

**Elastic File System (EFS)** — managed NFS (Network File System). Multiple EC2 instances can mount the same EFS simultaneously, across multiple AZs.

```
us-east-1a: EC2-A ─┐
                    ├──► EFS (shared)
us-east-1b: EC2-B ─┘
```

**Key facts:**
- Multi-AZ by default — data is stored across multiple AZs
- POSIX-compliant — works like a standard Linux filesystem
- Scales automatically — no capacity planning needed
- Linux only (not Windows)
- Pay per GB used (more expensive than EBS per GB)

**EFS Storage Classes:**

| Class | Use Case |
|-------|----------|
| **Standard** | Frequently accessed files |
| **Infrequent Access (IA)** | Files not accessed for 30+ days — cheaper |
| **Archive** | Files not accessed for 90+ days — cheapest |

Enable **Lifecycle Management** to move files to IA automatically.

## EFS vs EBS Comparison

| Feature | EBS | EFS |
|---------|-----|-----|
| **Type** | Block storage | File storage (NFS) |
| **Scope** | One AZ, one instance | Multi-AZ, many instances |
| **Protocol** | Block (raw disk) | NFS v4 |
| **Concurrent access** | ❌ No (except io1/io2 Multi-Attach) | ✅ Yes — thousands of instances |
| **OS support** | Linux + Windows | Linux only |
| **Scaling** | Manual resize | Automatic |
| **Cost** | Lower per GB | Higher per GB |
| **Use case** | Boot volumes, single-instance DBs | Shared web content, CMS, containers |

## S3 vs EBS vs EFS — Decision Table

| Scenario | Use | Why |
|----------|-----|-----|
| EC2 OS boot volume | **EBS** | Block storage required |
| Single-instance database (MySQL, Postgres) | **EBS** | Low latency, dedicated |
| Shared config/content across many EC2s | **EFS** | Multi-instance NFS mount |
| Static files, images, backups, ML datasets | **S3** | Object storage, no mount needed |
| Big data logs / streaming reads | **EBS st1** | High throughput HDD |
| Long-term archive | **S3 Glacier** | Cheapest per GB |
| Lambda function storage | **S3** or **EFS** | Lambda can't attach EBS |

> **Simple rule:** S3 for objects, EBS for one instance, EFS for many instances.

## Common CLI Commands

```bash
# List all volumes in a region
aws ec2 describe-volumes \
  --query "Volumes[*].{ID:VolumeId,Size:Size,Type:VolumeType,AZ:AvailabilityZone,State:State}"

# Create a gp3 volume
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --volume-type gp3 \
  --size 100 \
  --iops 3000

# Attach a volume to an EC2 instance
aws ec2 attach-volume \
  --volume-id vol-0abc123 \
  --instance-id i-0def456 \
  --device /dev/sdf

# List snapshots you own
aws ec2 describe-snapshots --owner-ids self
```

## Interview Q&A

**Q: What is the difference between S3, EBS, and EFS? Which do you use when?**

S3 is object storage — use it for files you access via URL or SDK (images, backups, static assets). EBS is block storage — use it when one EC2 instance needs a disk (databases, boot volumes). EFS is shared file storage — use it when multiple EC2 instances need to read and write the same files at the same time (shared web content, CMS uploads, containerized apps).

---

**Q: Can you attach one EBS volume to multiple EC2 instances?**

Not by default. Standard EBS volumes (gp2, gp3, st1, sc1) attach to one instance in one AZ. The exception is **Multi-Attach**, available only on io1 and io2 volumes. With Multi-Attach you can attach to up to 16 instances in the same AZ — but all instances must use a cluster-aware filesystem.

---

**Q: What happens to an EBS volume when you terminate an EC2 instance?**

The root (boot) volume is deleted by default — this is controlled by the `DeleteOnTermination` flag, which is `true` by default for root volumes. Additional data volumes have `DeleteOnTermination=false` by default, so they persist after termination. You can change this setting at launch or while the instance is running.

---

**Q: How do you migrate an EBS volume to a different Availability Zone?**

You cannot move an EBS volume directly — it is locked to its AZ. The process is:
1. Create a snapshot of the volume
2. Create a new volume from that snapshot, specifying the target AZ
3. Attach the new volume to an EC2 instance in the target AZ

To move data across regions, copy the snapshot to the target region first, then create the volume there.

---

**Q: Why would you use EFS instead of EBS?**

Use EFS when multiple EC2 instances need concurrent read/write access to the same files. Common scenarios: shared web server content (WordPress multisite), shared configuration files, or containerized microservices that need a common storage layer. EFS removes the need to sync files across instances manually. The tradeoff is higher cost per GB and Linux-only support.

---

[← S3](./07-s3.md) | [RDS →](./09-rds.md)
