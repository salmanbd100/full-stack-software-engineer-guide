---
title: Persistent Volumes (EBS & EFS)
part: 8
chapter: 0
slug: kubernetes-storage
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-03
tags: [devops, kubernetes, storage]
in_book: false
---

# Persistent Volumes (EBS & EFS)

Containers have ephemeral filesystems. When a pod is replaced, everything written inside it is gone. Persistent storage is how state survives.

## The Three-Object Model

```
StorageClass          "how to create volumes"     — cluster admin defines
      │
      ▼  dynamic provisioning
PersistentVolume      the actual EBS volume / EFS mount
      ▲
      │  binding
PersistentVolumeClaim "I need 20Gi, ReadWriteOnce" — app team requests
      ▲
      │
     Pod              mounts the PVC
```

| Object | Owner | Answers |
|--------|-------|---------|
| **StorageClass** | Platform team | Which driver, which disk type, what parameters |
| **PersistentVolume (PV)** | Created automatically | The real storage resource |
| **PersistentVolumeClaim (PVC)** | App team | How much, which access mode, which class |

> The point of this indirection is portability. The application asks for "20Gi, ReadWriteOnce, class `gp3`" and never mentions EBS. The same manifest works on any cloud with an equivalent StorageClass.

## Access Modes

| Mode | Short | Meaning | EBS | EFS |
|------|-------|---------|-----|-----|
| **ReadWriteOnce** | RWO | One **node** can mount it read-write | ✅ | ✅ |
| **ReadOnlyMany** | ROX | Many nodes, read-only | ❌ | ✅ |
| **ReadWriteMany** | RWX | Many nodes, read-write | ❌ | ✅ |
| **ReadWriteOncePod** | RWOP | Exactly one **pod** | ✅ | ✅ |

⚠️ **ReadWriteOnce means one node, not one pod.** Several pods on the *same* node can share an RWO volume. If you truly need single-pod access — for a database that would corrupt under concurrent writers — use `ReadWriteOncePod`.

> **This is the most common storage interview question on AWS:** EBS is a block device attached to one EC2 instance, so it cannot do ReadWriteMany. If two pods on different nodes must write the same files, you need EFS.

## EBS with the EBS CSI Driver

The default for single-writer workloads: databases, queues, anything needing low-latency block storage.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"                       # ✅ always
  kmsKeyId: arn:aws:kms:us-east-1:123456789:key/abc
volumeBindingMode: WaitForFirstConsumer   # ⚠️ critical on multi-AZ clusters
allowVolumeExpansion: true
reclaimPolicy: Retain                     # keep data if the PVC is deleted
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: gp3
  resources:
    requests: { storage: 100Gi }
```

### `volumeBindingMode` — The AZ Trap

An EBS volume lives in **one availability zone** and can only attach to instances in that zone.

```
❌ Immediate binding:
   PVC created → EBS volume provisioned in us-east-1a
   Pod scheduled → scheduler picks a node in us-east-1b
   Result: pod stuck in Pending forever — volume cannot attach

✅ WaitForFirstConsumer:
   PVC created → nothing happens yet
   Pod scheduled → node chosen in us-east-1b
   THEN volume provisioned in us-east-1b → attaches cleanly
```

✅ Always use `WaitForFirstConsumer` on multi-AZ clusters. This is the single most common EBS-on-Kubernetes failure.

### Volume Expansion

```bash
kubectl patch pvc postgres-data -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'
```

| Direction | Supported |
|-----------|-----------|
| Grow | ✅ Yes, with `allowVolumeExpansion: true` |
| Shrink | ❌ Never — create a new volume and migrate |

⚠️ EBS enforces a cooldown (roughly 6 hours) between modifications of the same volume. Do not plan a resize you might need to undo quickly.

## EFS with the EFS CSI Driver

The answer whenever you need ReadWriteMany.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: efs
provisioner: efs.csi.aws.com
parameters:
  provisioningMode: efs-ap                # dynamic access point per PVC
  fileSystemId: fs-0123456789abcdef
  directoryPerms: "700"
  uid: "1000"
  gid: "1000"
```

```yaml
spec:
  accessModes: [ReadWriteMany]            # many pods, many nodes, all writing
  storageClassName: efs
  resources: { requests: { storage: 5Gi } }   # EFS is elastic; this is nominal
```

| | EBS | EFS |
|-|-----|-----|
| **Type** | Block device | NFS file system |
| **Access modes** | RWO only | RWX, ROX, RWO |
| **AZ scope** | Single AZ | Multi-AZ (regional) |
| **Latency** | Sub-millisecond | Single-digit ms |
| **Throughput** | Per-volume provisioned | Elastic, scales with size |
| **Cost per GB** | Lower | ~3× higher |
| **Best for** | Databases, single-writer state | Shared uploads, WordPress-style content, ML datasets |

❌ **Never run a database on EFS.** NFS file locking semantics cause corruption and terrible performance for transactional workloads.

⚠️ EFS requires port 2049 open from the node security group to the mount target security group. A mount hanging at pod startup is nearly always this.

## StatefulSet Storage

`volumeClaimTemplates` creates one PVC per pod, and reattaches the same one after a restart.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-headless
  replicas: 3
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: gp3
        resources: { requests: { storage: 100Gi } }
```

**Result:**

```
postgres-0 ──▶ PVC data-postgres-0 ──▶ EBS vol in us-east-1a
postgres-1 ──▶ PVC data-postgres-1 ──▶ EBS vol in us-east-1b
postgres-2 ──▶ PVC data-postgres-2 ──▶ EBS vol in us-east-1c
```

`postgres-1` restarting always reattaches `data-postgres-1`. That stable pairing of identity and storage is the whole reason StatefulSets exist.

⚠️ **Deleting a StatefulSet does not delete its PVCs** — deliberately, so you don't lose data. They must be cleaned up manually, and forgotten PVCs are a common source of surprise EBS cost.

⚠️ Because each pod's volume is pinned to one AZ, a pod cannot be rescheduled into a different AZ. Losing an AZ makes that replica unschedulable until the AZ returns.

## Reclaim Policy

What happens to the underlying volume when the PVC is deleted:

| Policy | Behaviour |
|--------|-----------|
| **Delete** | EBS volume is destroyed. Default for dynamic provisioning |
| **Retain** | ✅ PV and EBS volume remain; data survives, must be released manually |

✅ Use `Retain` for anything holding real data. `Delete` means one `kubectl delete pvc` — or an over-eager GitOps prune — permanently destroys production data.

## Ephemeral Storage

Not everything needs to persist.

| Volume Type | Lifetime | Use For |
|-------------|----------|---------|
| **emptyDir** | Pod lifetime | Scratch space, cache, sidecar handoff |
| **emptyDir** with `medium: Memory` | Pod lifetime, RAM-backed | Fast temp files (counts against memory limit) |
| **Container filesystem** | Container lifetime | ❌ Nothing you want to keep |
| **downwardAPI** | Pod lifetime | Pod metadata as files |
| **projected** | Pod lifetime | Combine Secret + ConfigMap + token in one mount |

```yaml
volumes:
  - name: cache
    emptyDir:
      sizeLimit: 1Gi         # ✅ prevents filling the node's disk
```

⚠️ Without `sizeLimit`, a runaway process writing to `emptyDir` fills the node's root disk and triggers `DiskPressure`, which evicts pods across the **whole node** — including unrelated workloads.

## Snapshots and Backup

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snap-20260803
spec:
  volumeSnapshotClassName: ebs-snapshot
  source:
    persistentVolumeClaimName: data-postgres-0
```

Restoring means creating a PVC with the snapshot as its `dataSource`:

```yaml
spec:
  dataSource:
    name: postgres-snap-20260803
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes: [ReadWriteOnce]
  resources: { requests: { storage: 100Gi } }
```

| Approach | Covers |
|----------|--------|
| **VolumeSnapshot** | The volume only |
| **AWS Backup** | EBS/EFS on a schedule, with retention policy |
| **Velero** | ✅ Kubernetes objects **and** volumes — full cluster restore |

⚠️ A volume snapshot is not a database backup. Snapshotting a running database captures whatever was on disk mid-transaction. For consistency, use the database's own backup tooling, or freeze writes before snapshotting.

## Debugging Storage

```bash
kubectl get pvc                          # Pending = provisioning problem
kubectl describe pvc postgres-data       # events explain why
kubectl get pv
kubectl describe pod postgres-0          # attach/mount errors appear here
```

| Symptom | Cause |
|---------|-------|
| PVC `Pending`, no events | No StorageClass, or wrong `storageClassName` |
| PVC `Pending` with "waiting for first consumer" | ✅ Normal with `WaitForFirstConsumer` |
| Pod `Pending`, "volume node affinity conflict" | Volume in a different AZ than any schedulable node |
| `FailedAttachVolume` | Volume still attached to another node (usually a stale node) |
| EFS mount hangs | Security group not allowing TCP 2049 |
| PVC `Terminating` forever | A pod still references it |

## Interview Q&A

**Q: Explain the relationship between StorageClass, PV, and PVC.**

A StorageClass is a cluster-level template describing how to create storage — which CSI driver, which disk type, encryption, binding behaviour. A PersistentVolumeClaim is an application's request: this much capacity, this access mode, this class. A PersistentVolume is the actual storage resource, which with dynamic provisioning the CSI driver creates automatically in response to the claim, then binds to it. The indirection exists for portability and separation of concerns: the application manifest never mentions EBS or a volume ID, so the same manifest works anywhere an equivalent StorageClass exists, and the platform team controls the storage parameters centrally.

**Q: Why can't multiple pods on different nodes write to the same EBS volume?**

Because EBS is a block device, and a block device can be attached to only one EC2 instance at a time. Kubernetes expresses this as ReadWriteOnce: one node may mount it read-write. Note the subtlety — that is one node, not one pod, so several pods scheduled onto the same node can share an RWO volume. If you genuinely need many pods across many nodes writing the same files, you need a network file system, which on AWS means EFS with ReadWriteMany. If you need to guarantee exactly one pod, use ReadWriteOncePod, which is what a database volume should use to prevent two writers corrupting the data.

**Q: A pod using an EBS volume is stuck in `Pending` with a volume node affinity conflict. What happened?**

The volume was provisioned in one availability zone and the scheduler wants to place the pod on a node in a different zone, and an EBS volume cannot cross zones. This happens when the StorageClass uses `volumeBindingMode: Immediate`, so the volume is created as soon as the PVC exists, before anyone knows where the pod will run. The fix is `volumeBindingMode: WaitForFirstConsumer`, which defers provisioning until the scheduler has chosen a node, then creates the volume in that node's zone. It is worth adding that this also constrains the workload permanently: once a pod's volume lives in one zone, the pod can only ever be scheduled in that zone, so losing that AZ makes the replica unschedulable.

**Q: How do you back up stateful workloads in Kubernetes?**

Volume snapshots through the CSI snapshot API cover the block storage, and on AWS these become EBS snapshots that AWS Backup can schedule with retention policies. But snapshots alone are not a cluster backup — they hold no Kubernetes objects, so for disaster recovery I would use Velero, which captures both the API objects and the volume snapshots and can restore a namespace or a whole cluster. The important caveat is application consistency: snapshotting a running database captures the disk mid-transaction, which may not be a recoverable state. For databases the correct approach is the engine's own backup mechanism — or freezing writes before the snapshot — which is one of several reasons to prefer RDS over self-hosting a database in the cluster.

**Q: What happens to the data when you delete a StatefulSet?**

The PVCs and the underlying volumes are kept. StatefulSet deletion deliberately does not cascade to the PersistentVolumeClaims created by `volumeClaimTemplates`, because the assumption is that the data matters more than the workload — deleting and recreating a StatefulSet reattaches the existing volumes to the same pod ordinals. The consequence is that cleanup is manual, and orphaned PVCs are a common source of unnoticed EBS spend. Whether the underlying EBS volume survives deleting the PVC depends on the reclaim policy: `Delete`, the default for dynamic provisioning, destroys it, while `Retain` keeps it. For anything holding real data I set `Retain`, so a single accidental PVC deletion or a GitOps prune cannot permanently destroy production data.

---

[← ConfigMaps & Secrets](./05-configmaps-secrets.md) | [RBAC & Security →](./07-rbac-security.md)
