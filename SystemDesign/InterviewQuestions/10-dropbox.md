# Design Google Docs (Collaborative Document Editing)

## Problem Statement

Design a scalable real-time collaborative document editing system that allows multiple users to simultaneously edit the same document with instant synchronization, conflict resolution, version history, and offline support. The system should handle millions of concurrent editing sessions with sub-second latency.

**Examples**: Google Docs, Microsoft Office 365, Notion, Figma

## Requirements

### Functional Requirements

**Core Features:**
1. ✅ **Real-time Collaboration**: Multiple users edit simultaneously, see changes instantly
2. ✅ **Conflict Resolution**: Handle concurrent edits without data loss
3. ✅ **Cursor & Selection**: See other users' cursors and selections in real-time
4. ✅ **Version History**: View and restore previous versions
5. ✅ **Offline Editing**: Edit offline, sync when online
6. ✅ **Rich Text Editing**: Formatting (bold, italic, fonts, colors)
7. ✅ **Comments & Suggestions**: Add comments, suggest edits
8. ✅ **Access Control**: Share with view/comment/edit permissions

**Out of Scope** (Nice to Have):
- ❌ Voice/video calling
- ❌ Advanced spreadsheet formulas
- ❌ Presentations/slides
- ❌ AI writing assistance

### Non-Functional Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| **Latency** | < 200ms | Real-time collaboration feel |
| **Availability** | 99.99% | Always accessible |
| **Consistency** | Eventual | All users see same content eventually |
| **Scalability** | 50 concurrent editors per doc | Typical team size |
| **Throughput** | 1M operations/sec | Global scale |

## Capacity Estimation

### 💡 **Traffic Estimates**

**Assumptions:**
```
Total users: 2 billion
Daily Active Users (DAU): 500 million
Documents created per day: 50 million
Active editing sessions: 10 million concurrent
Average session duration: 30 minutes
Edits per session: 100
```

**Request Rates:**
```
Edit operations: 10M sessions × 100 edits / 30 min = 333K ops/sec
Document loads: 50M docs × 5 users avg = 250M loads/day = 2,900/sec
Cursor movements: 10M sessions × 10 updates/sec = 100M updates/sec (ephemeral)
```

### 💡 **Storage Estimates**

**Document Storage:**
```
Average document size: 50 KB (text + formatting)
Documents: 50M new/day × 365 = 18.25 billion/year
Storage: 18.25B × 50 KB = 912 TB/year
With compression (70%): ~274 TB/year
```

**Operation Log (for CRDT):**
```
Operations per document: 1,000 (average lifetime)
Operation size: 100 bytes
18.25B docs × 1,000 ops × 100 bytes = 1.825 PB/year
```

**Version Snapshots:**
```
Snapshots per document: 10
Snapshot size: 50 KB
18.25B × 10 × 50 KB = 9.125 PB/year
```

### 💡 **Bandwidth Estimates**

**Incoming (edits):**
```
333K ops/sec × 100 bytes = 33 MB/sec = 264 Mbps
```

**Outgoing (broadcast to collaborators):**
```
333K ops × 5 collaborators avg × 100 bytes = 166 MB/sec = 1.3 Gbps
```

## High-Level Design

### Architecture Overview

```
┌─────────────────┐
│  Web Client     │
│  (Browser)      │
└────────┬────────┘
         │ WebSocket
         ▼
┌─────────────────┐
│  CDN + LB       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  WebSocket Gateway (Node.js)│
│  - Connection management    │
│  - Broadcast operations     │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Redis  │ │  Kafka   │
│(Cursor,│ │(Op log)  │
│ Lock)  │ │          │
└────────┘ └─────┬────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│Document│  │Version │  │Comment │
│Service │  │Service │  │Service │
└───┬────┘  └───┬────┘  └───┬────┘
    │           │            │
    └───────────┼────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│MongoDB  │ │   S3    │ │  Redis  │
│(Docs,   │ │(Version │ │(Session │
│ Meta)   │ │ Snaps)  │ │ State)  │
└─────────┘ └─────────┘ └─────────┘
```

### 💡 **Key Components**

| Component | Technology | Purpose | Scale |
|-----------|-----------|---------|-------|
| **WebSocket Gateway** | Node.js (Socket.io) | Persistent connections, real-time sync | 500 servers |
| **Document Service** | Java, Go | Document CRUD, access control | 200 servers |
| **OT/CRDT Engine** | Custom (JavaScript) | Operational transformation for edits | Embedded in gateway |
| **Version Service** | Go | Create/restore snapshots | 50 servers |
| **Comment Service** | Node.js | Manage comments, suggestions | 50 servers |
| **Lock Service** | Redis | Distributed locking for edits | 20 nodes |
| **Message Queue** | Kafka | Operation log, async processing | 20 brokers |
| **Document DB** | MongoDB | Document metadata, content | Sharded (100 nodes) |
| **Object Storage** | S3 | Version snapshots, attachments | Unlimited |
| **Cache** | Redis | Active documents, session state | 50 nodes |

## Detailed Design

### 💡 **Operational Transformation (OT) for Conflict Resolution**

**Problem**: Two users type at the same position simultaneously

**Example Conflict:**
```
Initial: "Hello"
User A inserts " World" at position 5 → "Hello World"
User B inserts "!" at position 5 → "Hello!"

Without OT: "Hello World!" or "Hello! World" (inconsistent)
With OT: "Hello World!" (consistent across all clients)
```

**OT Algorithm:**

```javascript
class OperationalTransformation {
  // Operation types
  static INSERT = 'insert';
  static DELETE = 'delete';

  // Transform operation A against operation B
  // Returns transformed operation A'
  static transform(opA, opB) {
    // Both operations are inserts
    if (opA.type === this.INSERT && opB.type === this.INSERT) {
      if (opA.position < opB.position) {
        // A is before B, no change needed
        return opA;
      } else if (opA.position > opB.position) {
        // A is after B, shift A's position by B's length
        return {
          ...opA,
          position: opA.position + opB.text.length,
        };
      } else {
        // Same position, use user ID for tie-breaking
        if (opA.userId < opB.userId) {
          return opA;
        } else {
          return {
            ...opA,
            position: opA.position + opB.text.length,
          };
        }
      }
    }

    // A is insert, B is delete
    if (opA.type === this.INSERT && opB.type === this.DELETE) {
      if (opA.position <= opB.position) {
        return opA; // A is before deleted range
      } else if (opA.position > opB.position + opB.length) {
        // A is after deleted range
        return {
          ...opA,
          position: opA.position - opB.length,
        };
      } else {
        // A is inside deleted range
        return {
          ...opA,
          position: opB.position,
        };
      }
    }

    // A is delete, B is insert
    if (opA.type === this.DELETE && opB.type === this.INSERT) {
      if (opA.position < opB.position) {
        return opA;
      } else {
        return {
          ...opA,
          position: opA.position + opB.text.length,
        };
      }
    }

    // Both operations are deletes
    if (opA.type === this.DELETE && opB.type === this.DELETE) {
      if (opA.position + opA.length <= opB.position) {
        return opA; // No overlap
      } else if (opA.position >= opB.position + opB.length) {
        // A is after B
        return {
          ...opA,
          position: opA.position - opB.length,
        };
      } else {
        // Overlapping deletes
        const start = Math.max(opA.position, opB.position);
        const end = Math.min(
          opA.position + opA.length,
          opB.position + opB.length
        );
        const overlap = end - start;

        if (opA.position < opB.position) {
          return {
            ...opA,
            length: opA.length - overlap,
          };
        } else {
          return {
            ...opA,
            position: opB.position,
            length: opA.length - overlap,
          };
        }
      }
    }

    return opA;
  }

  // Apply operation to document
  static apply(document, operation) {
    if (operation.type === this.INSERT) {
      return (
        document.slice(0, operation.position) +
        operation.text +
        document.slice(operation.position)
      );
    } else if (operation.type === this.DELETE) {
      return (
        document.slice(0, operation.position) +
        document.slice(operation.position + operation.length)
      );
    }
    return document;
  }
}
```

**Alternative: CRDT (Conflict-free Replicated Data Type)**

```javascript
// Simpler than OT, eventually consistent
class CRDT_Document {
  constructor() {
    this.characters = []; // Array of character objects
  }

  // Each character has: { char, id: [siteId, clock], visible: boolean }
  insert(char, position, siteId, clock) {
    const id = [siteId, clock];
    const newChar = { char, id, visible: true };

    // Find insertion point based on position and ID ordering
    this.characters.splice(position, 0, newChar);
  }

  delete(position) {
    // Don't actually delete, just mark as invisible (tombstone)
    this.characters[position].visible = false;
  }

  toString() {
    return this.characters
      .filter((c) => c.visible)
      .map((c) => c.char)
      .join('');
  }

  // Merge operations from remote user
  merge(remoteChars) {
    // CRDTs are commutative - order doesn't matter
    // Merge based on character IDs
    for (const remoteChar of remoteChars) {
      const index = this.findInsertionIndex(remoteChar.id);
      if (index === -1) {
        // Character already exists, check if visibility changed
        const existing = this.characters.find(
          (c) => this.compareIds(c.id, remoteChar.id) === 0
        );
        if (existing) {
          existing.visible = remoteChar.visible;
        }
      } else {
        this.characters.splice(index, 0, remoteChar);
      }
    }
  }

  findInsertionIndex(id) {
    for (let i = 0; i < this.characters.length; i++) {
      if (this.compareIds(this.characters[i].id, id) > 0) {
        return i;
      }
    }
    return this.characters.length;
  }

  compareIds(id1, id2) {
    // [siteId, clock]
    if (id1[0] !== id2[0]) {
      return id1[0] - id2[0];
    }
    return id1[1] - id2[1];
  }
}
```

### 💡 **Real-time Synchronization (WebSocket)**

**Client-Side Editor:**

```javascript
class CollaborativeEditor {
  constructor(documentId, userId) {
    this.documentId = documentId;
    this.userId = userId;
    this.document = '';
    this.version = 0; // Optimistic locking
    this.pendingOperations = [];
    this.ws = null;
    this.editor = null; // QuillJS or similar
  }

  connect() {
    this.ws = new WebSocket(
      `wss://docs.example.com/ws?doc=${this.documentId}&user=${this.userId}`
    );

    this.ws.onopen = () => {
      console.log('Connected to document');
      this.requestFullSync();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.reconnect();
    };
  }

  requestFullSync() {
    // Get full document state
    this.ws.send(
      JSON.stringify({
        type: 'sync_request',
        doc_id: this.documentId,
      })
    );
  }

  handleServerMessage(message) {
    switch (message.type) {
      case 'sync_response':
        // Full document sync
        this.document = message.content;
        this.version = message.version;
        this.editor.setText(this.document);
        break;

      case 'operation':
        // Remote operation from another user
        this.applyRemoteOperation(message.operation);
        break;

      case 'cursor_update':
        // Show remote user's cursor
        this.showRemoteCursor(message.user_id, message.position, message.selection);
        break;

      case 'user_joined':
        this.showNotification(`${message.user_name} joined`);
        break;

      case 'user_left':
        this.showNotification(`${message.user_name} left`);
        break;

      case 'ack':
        // Server acknowledged our operation
        this.handleAck(message.operation_id);
        break;

      case 'conflict':
        // Server detected conflict, resync
        this.requestFullSync();
        break;
    }
  }

  // User types in editor
  onLocalEdit(delta) {
    const operation = this.deltaToOperation(delta);
    operation.id = this.generateOperationId();
    operation.userId = this.userId;
    operation.version = this.version;

    // Apply locally immediately (optimistic update)
    this.document = OperationalTransformation.apply(this.document, operation);

    // Send to server
    this.sendOperation(operation);

    // Track pending operations
    this.pendingOperations.push(operation);
  }

  sendOperation(operation) {
    this.ws.send(
      JSON.stringify({
        type: 'operation',
        operation: operation,
      })
    );
  }

  applyRemoteOperation(operation) {
    // Transform against pending operations
    let transformedOp = operation;
    for (const pendingOp of this.pendingOperations) {
      transformedOp = OperationalTransformation.transform(
        transformedOp,
        pendingOp
      );
    }

    // Apply to document
    this.document = OperationalTransformation.apply(
      this.document,
      transformedOp
    );

    // Update editor (suppress local change event)
    this.editor.updateContents(this.operationToDelta(transformedOp), 'silent');

    // Increment version
    this.version++;
  }

  handleAck(operationId) {
    // Remove acknowledged operation from pending
    this.pendingOperations = this.pendingOperations.filter(
      (op) => op.id !== operationId
    );

    this.version++;
  }

  // Cursor position tracking
  onCursorMove(position, selection) {
    // Throttle cursor updates (max 10 per second)
    if (Date.now() - this.lastCursorUpdate < 100) return;

    this.ws.send(
      JSON.stringify({
        type: 'cursor_update',
        position: position,
        selection: selection,
      })
    );

    this.lastCursorUpdate = Date.now();
  }

  showRemoteCursor(userId, position, selection) {
    // Display colored cursor/selection for remote user
    const color = this.getUserColor(userId);
    this.editor.addCursor(userId, position, selection, color);
  }

  getUserColor(userId) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    return colors[userId.charCodeAt(0) % colors.length];
  }
}
```

**Server-Side Coordination:**

```javascript
class DocumentCoordinator {
  constructor() {
    this.activeDocuments = new Map(); // doc_id -> { users, operations }
    this.wss = new WebSocket.Server({ port: 8080 });
    this.redis = new Redis();
    this.kafka = new Kafka();

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  async handleConnection(ws, req) {
    const url = new URL(req.url, 'ws://localhost');
    const documentId = url.searchParams.get('doc');
    const userId = url.searchParams.get('user');

    // Verify access permissions
    const hasAccess = await this.verifyAccess(userId, documentId);
    if (!hasAccess) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Join document session
    await this.joinDocument(documentId, userId, ws);

    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(documentId, userId, JSON.parse(data));
    });

    ws.on('close', () => {
      this.leaveDocument(documentId, userId);
    });
  }

  async joinDocument(documentId, userId, ws) {
    // Create or get document session
    if (!this.activeDocuments.has(documentId)) {
      this.activeDocuments.set(documentId, {
        users: new Map(),
        operations: [],
        lock: null,
      });
    }

    const session = this.activeDocuments.get(documentId);
    session.users.set(userId, ws);

    // Notify other users
    this.broadcast(documentId, userId, {
      type: 'user_joined',
      user_id: userId,
      user_name: await this.getUserName(userId),
    });

    // Send current document state to new user
    const document = await this.getDocument(documentId);
    ws.send(
      JSON.stringify({
        type: 'sync_response',
        content: document.content,
        version: document.version,
      })
    );
  }

  async handleMessage(documentId, userId, message) {
    const session = this.activeDocuments.get(documentId);

    switch (message.type) {
      case 'operation':
        await this.handleOperation(documentId, userId, message.operation);
        break;

      case 'cursor_update':
        // Broadcast cursor position to other users (ephemeral, no persistence)
        this.broadcast(documentId, userId, {
          type: 'cursor_update',
          user_id: userId,
          position: message.position,
          selection: message.selection,
        });
        break;

      case 'sync_request':
        const document = await this.getDocument(documentId);
        const ws = session.users.get(userId);
        ws.send(
          JSON.stringify({
            type: 'sync_response',
            content: document.content,
            version: document.version,
          })
        );
        break;
    }
  }

  async handleOperation(documentId, userId, operation) {
    const session = this.activeDocuments.get(documentId);

    // Acquire distributed lock (prevent concurrent writes to same range)
    const lockKey = `lock:${documentId}:${operation.position}`;
    const lockAcquired = await this.redis.set(lockKey, userId, 'NX', 'EX', 1);

    if (!lockAcquired) {
      // Another user is editing same position, wait and retry
      await sleep(10);
      return this.handleOperation(documentId, userId, operation);
    }

    try {
      // Get current document version
      const document = await this.getDocument(documentId);

      // Check version (optimistic locking)
      if (operation.version !== document.version) {
        // Version mismatch, client needs to resync
        const ws = session.users.get(userId);
        ws.send(
          JSON.stringify({
            type: 'conflict',
            expected_version: operation.version,
            current_version: document.version,
          })
        );
        return;
      }

      // Apply operation to document
      document.content = OperationalTransformation.apply(
        document.content,
        operation
      );
      document.version++;

      // Persist to database (async)
      await this.updateDocument(documentId, document);

      // Log operation to Kafka (for version history)
      await this.kafka.send({
        topic: 'document-operations',
        messages: [
          {
            key: documentId,
            value: JSON.stringify({
              doc_id: documentId,
              operation: operation,
              timestamp: Date.now(),
            }),
          },
        ],
      });

      // Broadcast operation to all users (except sender)
      this.broadcast(documentId, userId, {
        type: 'operation',
        operation: operation,
      });

      // Send ACK to sender
      const ws = session.users.get(userId);
      ws.send(
        JSON.stringify({
          type: 'ack',
          operation_id: operation.id,
        })
      );
    } finally {
      // Release lock
      await this.redis.del(lockKey);
    }
  }

  broadcast(documentId, excludeUserId, message) {
    const session = this.activeDocuments.get(documentId);
    if (!session) return;

    for (const [userId, ws] of session.users) {
      if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  async leaveDocument(documentId, userId) {
    const session = this.activeDocuments.get(documentId);
    if (!session) return;

    session.users.delete(userId);

    // Notify other users
    this.broadcast(documentId, userId, {
      type: 'user_left',
      user_id: userId,
    });

    // Clean up if no users left
    if (session.users.size === 0) {
      this.activeDocuments.delete(documentId);
    }
  }
}
```

### 💡 **Version History & Snapshots**

**Snapshot Strategy:**

```javascript
class VersionService {
  async createSnapshot(documentId) {
    const document = await db.documents.findOne({ document_id: documentId });

    const snapshot = {
      snapshot_id: generateUUID(),
      document_id: documentId,
      version: document.version,
      content: document.content,
      created_at: Date.now(),
      created_by: document.last_modified_by,
    };

    // Store in S3 (cheaper for large snapshots)
    await s3.putObject({
      Bucket: 'document-snapshots',
      Key: `${documentId}/${snapshot.snapshot_id}`,
      Body: JSON.stringify(snapshot),
    });

    // Store metadata in MongoDB
    await db.snapshots.insertOne({
      snapshot_id: snapshot.snapshot_id,
      document_id: documentId,
      version: snapshot.version,
      created_at: snapshot.created_at,
      created_by: snapshot.created_by,
      size: snapshot.content.length,
    });

    return snapshot.snapshot_id;
  }

  async getVersionHistory(documentId, limit = 50) {
    // Get recent snapshots
    const snapshots = await db.snapshots
      .find({ document_id: documentId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return snapshots;
  }

  async restoreVersion(documentId, snapshotId) {
    // Get snapshot from S3
    const s3Object = await s3.getObject({
      Bucket: 'document-snapshots',
      Key: `${documentId}/${snapshotId}`,
    });

    const snapshot = JSON.parse(s3Object.Body.toString());

    // Create new snapshot of current version (before restoring)
    await this.createSnapshot(documentId);

    // Restore document to snapshot content
    await db.documents.updateOne(
      { document_id: documentId },
      {
        $set: {
          content: snapshot.content,
          version: snapshot.version,
          last_modified_at: Date.now(),
          last_modified_by: snapshot.created_by,
        },
      }
    );

    // Broadcast to all active users to resync
    await this.broadcastResync(documentId);

    return snapshot;
  }

  // Automatic snapshot creation (background job)
  async autoSnapshot() {
    // Create snapshot every 1000 operations or 1 hour
    const documentsToSnapshot = await db.documents
      .find({
        $or: [
          { operations_since_snapshot: { $gte: 1000 } },
          { last_snapshot_at: { $lte: Date.now() - 3600000 } },
        ],
      })
      .toArray();

    for (const doc of documentsToSnapshot) {
      await this.createSnapshot(doc.document_id);

      // Reset counter
      await db.documents.updateOne(
        { document_id: doc.document_id },
        {
          $set: {
            operations_since_snapshot: 0,
            last_snapshot_at: Date.now(),
          },
        }
      );
    }
  }
}

// Run auto-snapshot every 5 minutes
setInterval(() => {
  versionService.autoSnapshot();
}, 300000);
```

### 💡 **Offline Editing & Sync**

**IndexedDB for local storage:**

```javascript
class OfflineEditor {
  constructor(documentId) {
    this.documentId = documentId;
    this.db = null;
    this.isOnline = navigator.onLine;
    this.pendingOperations = [];

    this.initDB();
    this.setupSyncListeners();
  }

  async initDB() {
    this.db = await idb.openDB('google-docs', 1, {
      upgrade(db) {
        // Store documents locally
        db.createObjectStore('documents', { keyPath: 'document_id' });

        // Store pending operations
        db.createObjectStore('pending_operations', {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    });

    // Load document from IndexedDB
    const cachedDoc = await this.db.get('documents', this.documentId);
    if (cachedDoc) {
      this.loadDocument(cachedDoc);
    }
  }

  setupSyncListeners() {
    window.addEventListener('online', () => {
      console.log('Back online, syncing...');
      this.isOnline = true;
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      console.log('Offline mode activated');
      this.isOnline = false;
    });
  }

  async saveLocal(operation) {
    // Save to IndexedDB
    await this.db.add('pending_operations', {
      document_id: this.documentId,
      operation: operation,
      timestamp: Date.now(),
    });

    // Apply locally
    this.applyOperationLocally(operation);
  }

  async syncPendingOperations() {
    // Get all pending operations
    const pending = await this.db.getAll('pending_operations');

    for (const record of pending) {
      if (record.document_id !== this.documentId) continue;

      try {
        // Send to server
        await this.sendOperationToServer(record.operation);

        // Remove from pending
        await this.db.delete('pending_operations', record.id);
      } catch (error) {
        console.error('Failed to sync operation:', error);
        // Will retry on next sync
      }
    }

    // Get fresh copy from server
    await this.fetchLatestDocument();
  }

  async fetchLatestDocument() {
    try {
      const response = await fetch(`/api/documents/${this.documentId}`);
      const document = await response.json();

      // Update local cache
      await this.db.put('documents', document);

      // Reload editor
      this.loadDocument(document);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    }
  }
}
```

### 💡 **Comments & Suggestions**

**Comment System:**

```javascript
class CommentService {
  async addComment(documentId, userId, position, text) {
    const comment = {
      comment_id: generateUUID(),
      document_id: documentId,
      user_id: userId,
      position: position, // Character position in document
      text: text,
      created_at: Date.now(),
      resolved: false,
      replies: [],
    };

    await db.comments.insertOne(comment);

    // Broadcast to all active users
    await this.broadcastComment(documentId, comment);

    return comment;
  }

  async addReply(commentId, userId, text) {
    const reply = {
      reply_id: generateUUID(),
      user_id: userId,
      text: text,
      created_at: Date.now(),
    };

    await db.comments.updateOne(
      { comment_id: commentId },
      { $push: { replies: reply } }
    );

    return reply;
  }

  async resolveComment(commentId) {
    await db.comments.updateOne(
      { comment_id: commentId },
      { $set: { resolved: true, resolved_at: Date.now() } }
    );
  }

  async getComments(documentId) {
    const comments = await db.comments
      .find({ document_id: documentId, resolved: false })
      .sort({ position: 1 })
      .toArray();

    return comments;
  }

  // Adjust comment positions after edit operations
  async adjustCommentPositions(documentId, operation) {
    if (operation.type === 'insert') {
      // Shift comments after insertion point
      await db.comments.updateMany(
        {
          document_id: documentId,
          position: { $gte: operation.position },
        },
        {
          $inc: { position: operation.text.length },
        }
      );
    } else if (operation.type === 'delete') {
      // Shift comments after deletion point
      await db.comments.updateMany(
        {
          document_id: documentId,
          position: { $gt: operation.position },
        },
        {
          $inc: { position: -operation.length },
        }
      );

      // Handle comments within deleted range
      await db.comments.updateMany(
        {
          document_id: documentId,
          position: {
            $gte: operation.position,
            $lt: operation.position + operation.length,
          },
        },
        {
          $set: { position: operation.position, orphaned: true },
        }
      );
    }
  }
}
```

## Database Schema

### 💡 **MongoDB (Documents & Metadata)**

```javascript
// Documents collection
{
  document_id: UUID,
  owner_id: UUID,
  title: String,
  content: String, // Full document content
  version: Number, // Optimistic locking
  created_at: Date,
  last_modified_at: Date,
  last_modified_by: UUID,
  operations_since_snapshot: Number,
  last_snapshot_at: Date,
  access_control: {
    public: Boolean,
    shared_with: [
      {
        user_id: UUID,
        permission: Enum['view', 'comment', 'edit'],
        shared_at: Date
      }
    ]
  }
}

// Comments collection
{
  comment_id: UUID,
  document_id: UUID,
  user_id: UUID,
  position: Number, // Character offset
  text: String,
  created_at: Date,
  resolved: Boolean,
  resolved_at: Date,
  orphaned: Boolean, // Commented text was deleted
  replies: [
    {
      reply_id: UUID,
      user_id: UUID,
      text: String,
      created_at: Date
    }
  ]
}

// Snapshots metadata collection
{
  snapshot_id: UUID,
  document_id: UUID,
  version: Number,
  created_at: Date,
  created_by: UUID,
  size: Number, // bytes
  s3_key: String
}

// Users collection
{
  user_id: UUID,
  email: String,
  name: String,
  avatar_url: String,
  created_at: Date
}
```

### 💡 **Redis (Session & Lock)**

```
# Active document sessions
session:{doc_id} → SET of user_ids

# Cursor positions (TTL: 5 seconds)
cursor:{doc_id}:{user_id} → { position, selection }

# Distributed locks for edit operations
lock:{doc_id}:{position} → user_id (TTL: 1 second)

# Rate limiting
rate_limit:{user_id}:{doc_id} → operation count (TTL: 1 minute)
```

### 💡 **Kafka (Operation Log)**

```javascript
// Topic: document-operations
{
  doc_id: UUID,
  operation: {
    id: UUID,
    type: 'insert' | 'delete',
    position: Number,
    text: String, // for insert
    length: Number, // for delete
    userId: UUID,
    version: Number,
    timestamp: Number
  },
  timestamp: Date
}

// Used for:
// 1. Version history (replay operations)
// 2. Analytics (user activity)
// 3. Audit logs
```

### 💡 **S3 (Version Snapshots)**

```
Bucket: document-snapshots
Key: {document_id}/{snapshot_id}
Content: JSON {
  snapshot_id,
  document_id,
  version,
  content,
  created_at,
  created_by
}
```

## API Design

### 💡 **REST API Endpoints**

**Create Document:**
```http
POST /api/documents
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Untitled Document",
  "content": ""
}

Response:
{
  "document_id": "uuid",
  "owner_id": "user123",
  "title": "Untitled Document",
  "created_at": 1700000000000,
  "edit_url": "https://docs.example.com/d/uuid/edit"
}
```

**Get Document:**
```http
GET /api/documents/{doc_id}
Authorization: Bearer {token}

Response:
{
  "document_id": "uuid",
  "title": "Project Proposal",
  "content": "Full document content...",
  "version": 1543,
  "last_modified_at": 1700000000000,
  "collaborators": [
    {
      "user_id": "user456",
      "name": "John Doe",
      "avatar_url": "https://...",
      "status": "online"
    }
  ]
}
```

**Share Document:**
```http
POST /api/documents/{doc_id}/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "colleague@example.com",
  "permission": "edit" // or "view", "comment"
}

Response:
{
  "status": "shared",
  "share_link": "https://docs.example.com/d/uuid?share=token"
}
```

**Version History:**
```http
GET /api/documents/{doc_id}/versions?limit=20
Authorization: Bearer {token}

Response:
{
  "versions": [
    {
      "snapshot_id": "uuid",
      "version": 1500,
      "created_at": 1700000000000,
      "created_by": "user123",
      "size": 45000
    }
  ]
}
```

**Restore Version:**
```http
POST /api/documents/{doc_id}/restore
Authorization: Bearer {token}
Content-Type: application/json

{
  "snapshot_id": "uuid"
}

Response:
{
  "status": "restored",
  "current_version": 1501
}
```

**Add Comment:**
```http
POST /api/documents/{doc_id}/comments
Authorization: Bearer {token}
Content-Type: application/json

{
  "position": 250,
  "text": "Can we expand on this section?"
}

Response:
{
  "comment_id": "uuid",
  "user": {
    "name": "John Doe",
    "avatar_url": "https://..."
  },
  "created_at": 1700000000000
}
```

## Trade-offs & Bottlenecks

### 💡 **Key Trade-offs**

| Decision | Chosen Approach | Alternative | Rationale |
|----------|----------------|-------------|-----------|
| **Conflict Resolution** | Operational Transformation | CRDT | More accurate, deterministic (Google uses OT) |
| **Synchronization** | WebSocket | HTTP Long Polling | Lower latency, true real-time |
| **Version Storage** | Snapshots + Operation Log | Full copies | Space-efficient, faster restore |
| **Document Storage** | MongoDB (structured) | PostgreSQL | Flexible schema, horizontal scaling |
| **Offline Support** | IndexedDB + Sync on Reconnect | No offline | Better UX, work anywhere |

### 💡 **Potential Bottlenecks**

| Component | Bottleneck | Solution |
|-----------|-----------|----------|
| **WebSocket Servers** | Connection limit | Horizontal scaling, sticky sessions with Redis |
| **OT Transformations** | CPU intensive for large documents | Limit document size (50K chars per doc), pagination |
| **MongoDB Writes** | High update frequency | Use version numbers (optimistic locking), batch updates |
| **Broadcasting** | N² complexity (N users × N operations) | Redis Pub/Sub for fanout, limit concurrent editors to 50 |
| **Version History** | Storage growth | Compress snapshots, delete old versions after 1 year |

### 💡 **Failure Scenarios**

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **WebSocket Server Crash** | Users disconnected | Auto-reconnect, load balancer failover |
| **Network Partition** | Split brain (different versions) | Use version numbers, force resync |
| **Database Down** | Can't save edits | Queue operations in Redis, retry |
| **User Conflict** | Simultaneous edits at same position | OT/CRDT handles gracefully |
| **Large Operation Flood** | Server overload | Rate limiting (100 ops/min per user) |

## Interview Discussion Points

**Q: How do you handle 50 users editing the same document simultaneously?**

A:
1. **Operational Transformation**: Transform each operation against concurrent operations
2. **WebSocket Broadcasting**: Real-time push to all users (Redis Pub/Sub for fanout)
3. **Version Numbers**: Optimistic locking to detect conflicts
4. **Distributed Locks**: Short-lived locks (1s) for editing same position
5. **Rate Limiting**: Prevent spam (100 operations/minute per user)

**Q: What happens when two users delete the same text?**

A: OT handles this gracefully:
1. Both operations get transformed against each other
2. The overlapping deletion is detected
3. Only one deletion is applied (based on timestamp/user ID tie-breaking)
4. All clients converge to the same state eventually

**Q: How do you reduce latency for global users?**

A:
1. **CDN**: Serve static assets from edge locations
2. **Multi-Region Deployment**: WebSocket servers in US, EU, APAC
3. **Smart Routing**: Route to nearest server based on geolocation
4. **Caching**: Cache document content in Redis (hot documents)
5. **Compression**: gzip document content before sending

**Q: How would you implement Google Docs offline mode?**

A:
1. **IndexedDB**: Store document locally in browser
2. **Service Worker**: Intercept network requests, serve from cache
3. **Operation Queue**: Queue edits while offline
4. **Conflict Resolution**: When reconnecting, send all queued operations
5. **Version Check**: If version mismatch, show conflict resolution UI

**Q: How do you prevent data loss?**

A:
1. **Auto-save**: Save every operation immediately (no manual save)
2. **Operation Log**: Persist all operations to Kafka (replay capability)
3. **Snapshots**: Create snapshots every 1000 operations
4. **Replication**: MongoDB replica set (3 copies)
5. **S3 Durability**: 99.999999999% durability for snapshots

## Follow-up Enhancements

**Additional Features:**

1. **Suggestions Mode**: Track changes like "track changes" in Word
2. **Smart Compose**: AI-powered autocomplete
3. **Voice Typing**: Speech-to-text integration
4. **Page Layout**: Headers, footers, page numbers
5. **Tables**: Collaborative table editing
6. **Charts & Diagrams**: Embedded charts with data
7. **Add-ons**: Third-party extensions (Grammarly, etc.)
8. **Export**: PDF, Word, plain text formats

**Monitoring & Observability:**

- **Metrics**: Active documents, concurrent users, operation latency, sync conflicts
- **Alerts**: High latency (>500ms), conflict rate >5%, server errors
- **Dashboards**: Real-time editing sessions, popular documents, user activity
- **Tracing**: Operation path (client → gateway → DB → broadcast)

## Summary

**Key Architectural Decisions:**

1. ✅ **Operational Transformation**: Conflict-free concurrent editing
2. ✅ **WebSocket for Real-time**: Sub-200ms latency for edits
3. ✅ **Snapshots + Operation Log**: Efficient version history
4. ✅ **Distributed Locks**: Prevent edit conflicts at character level
5. ✅ **Offline Support**: IndexedDB + sync on reconnect
6. ✅ **MongoDB for Documents**: Flexible schema, horizontal scaling
7. ✅ **Redis Pub/Sub**: Broadcast operations to all users

**Scale:**
- 500M DAU, 10M concurrent editing sessions
- 333K operations/sec
- 50 concurrent editors per document
- < 200ms operation latency
- 18.25B documents/year

**Trade-offs:**
- OT (accurate, complex) vs CRDT (simple, eventual consistency)
- WebSocket (real-time) vs HTTP polling (simpler)
- Snapshots (space-efficient) vs full copies (simple)
- Eventual consistency (scalable) vs strong consistency (simpler)

---
[← Back to SystemDesign](../README.md)
