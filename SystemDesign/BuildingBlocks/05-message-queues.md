# Message Queues & Pub/Sub

## Part 1: Message Queue Pattern

### 💡 **Problem → Solution**

| Aspect | Details |
|--------|---------|
| **Problem** | Write + Spike (Traffic overwhelms backend) |
| **Solution** | Message Queue (Buffer + Async) |
| **Scale** | 10M+ daily jobs |
| **Spike Handling** | 1K → 100K req/sec |

**When to Use:**

| Scenario | Example |
|----------|---------|
| ✅ Background jobs | 10M+ emails/notifications/reports daily |
| ✅ Traffic spikes | Flash sales: 1K → 100K req/sec |
| ✅ Rate mismatch | API: 50K RPS, Worker: 5K RPS |
| ✅ Reliability needs | Downstream service unavailable |

---

## Queue Pattern Overview

### What is a Message Queue?

A **message queue** is an asynchronous communication pattern that decouples message producers from consumers. Producers send messages to a queue without waiting for processing. Consumers pull messages from the queue and process them independently, at their own pace.

Think of it like a restaurant's order queue: customers (producers) place orders that go to a ticket system (queue), and chefs (consumers) pick up orders when ready. If 50 customers arrive at once, orders queue up rather than overwhelming the kitchen.

This pattern transforms **synchronous blocking operations** into **asynchronous non-blocking workflows**, enabling systems to handle traffic spikes gracefully and scale producer/consumer layers independently.

### Key Characteristics

- **Asynchronous Processing**: Producers don't wait for consumers to finish - requests return immediately with "job queued" status
- **At-Least-Once Delivery**: Messages are guaranteed delivery but may be processed multiple times if workers fail mid-processing
- **FIFO or Priority Ordering**: Standard queues process oldest messages first; priority queues handle urgent tasks earlier
- **Decoupling**: Producers and consumers scale independently - add workers without changing API servers
- **Complexity**: Time O(1) enqueue/dequeue, Space O(n) for n queued messages

### Real-World Applications

- **Amazon**: Order processing queue handles 300M+ orders annually - separates checkout from inventory/shipping/billing
- **Uber**: Driver matching queue processes 15M trips/day - decouples rider requests from complex matching algorithm (100-500ms)
- **Slack**: Message delivery queue handles 10B+ messages/month - ensures reliable delivery even when recipients offline

---

## Core Concepts

### Architecture Pattern

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Producer  │         │  Message Queue   │         │  Consumer   │
│  (API/Web)  │─────────▶│                  │────────▶│  (Worker)   │
│             │  Enqueue │  ┌────┬────┬────┐│ Dequeue │             │
│  Fast Layer │  (1-5ms) │  │ M1 │ M2 │ M3 ││ Process │ Slow Layer  │
└─────────────┘          │  └────┴────┴────┘│ (50-500ms)│           │
                         │                  │         │             │
     │                   │  Visibility      │         │  Ack/Nack   │
     │ Return           │  Timeout: 30s    │         │  on Complete │
     │ "Job Queued"     │                  │         │             │
     ▼                  └──────────────────┘         └─────────────┘
┌─────────────┐
│  201 Created│         Dead Letter Queue (DLQ)
│  Job ID:    │         ┌────────────────────┐
│  abc-123    │         │  Failed Messages   │
└─────────────┘         │  (after 3 retries) │
                        └────────────────────┘

Flow:
1. Producer sends message → Queue (async, returns immediately)
2. Message sits in queue until consumer available
3. Consumer pulls message → Becomes invisible to other consumers
4. Consumer processes → Sends ACK (delete) or NACK (retry)
5. If no ACK within visibility timeout → Message reappears in queue
```

### Key Components

1. **Producer**: Service that creates and sends messages to the queue (API servers, webhooks, event sources)
2. **Queue**: Persistent buffer storing messages with ordering guarantees (FIFO or standard)
3. **Consumer (Worker)**: Service that pulls, processes, and acknowledges messages (background workers, batch processors)
4. **Dead Letter Queue (DLQ)**: Separate queue for messages that repeatedly fail processing (debugging, manual intervention)
5. **Visibility Timeout**: Time window during which a message is invisible to other consumers after being pulled (prevents duplicate processing)

### How It Works

**Example: Video Upload Processing**

1. **User uploads 2GB video** → API server receives upload
2. **API creates job message**: `{ videoId: "v123", userId: "u456", s3Key: "uploads/video.mp4" }`
3. **API enqueues message** → Returns `201 Created` with `jobId` in 50ms (doesn't wait for transcoding)
4. **Message waits in queue** → Could be seconds or hours depending on worker availability
5. **Worker pulls message** → Message becomes invisible for 30 minutes (visibility timeout)
6. **Worker transcodes video** → Takes 10-15 minutes for 1080p → 720p, 480p, 360p
7. **Worker sends ACK** → Message deleted from queue permanently
8. **If worker crashes** → After 30 min visibility timeout, message reappears for retry

---

## Example 1: Simple Queue (JavaScript/Node.js)

### Scenario

E-commerce platform processes 50k orders/day. During Black Friday, traffic spikes to 500k orders/day (10x). Instead of scaling order processing API to handle 10x traffic (expensive), use queue to buffer orders and scale workers independently.

### Implementation

```javascript
// message-queue.js - In-memory queue (Redis-based in production)
class MessageQueue {
    constructor(name) {
        this.name = name;
        this.queue = [];
        this.processing = new Map(); // messageId → { message, visibilityTimeout }
        this.dlq = [];
        this.stats = { enqueued: 0, processed: 0, failed: 0 };
    }

    // Producer: Enqueue message (O(1) operation)
    async enqueue(message, priority = 0) {
        const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const envelope = {
            id: messageId,
            body: message,
            priority,
            enqueuedAt: Date.now(),
            attempts: 0,
            maxRetries: 3
        };

        this.queue.push(envelope);
        // Sort by priority (higher first), then FIFO
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.enqueuedAt - b.enqueuedAt;
        });

        this.stats.enqueued++;
        console.log(`✓ Enqueued message ${messageId} (priority: ${priority})`);
        return messageId;
    }

    // Consumer: Dequeue message with visibility timeout
    async dequeue(visibilityTimeoutMs = 30000) {
        if (this.queue.length === 0) {
            return null; // No messages available
        }

        const message = this.queue.shift();

        // Make message invisible to other consumers
        const visibilityTimeout = setTimeout(() => {
            this.returnToQueue(message.id);
        }, visibilityTimeoutMs);

        this.processing.set(message.id, { message, visibilityTimeout });
        message.attempts++;

        console.log(`→ Dequeued message ${message.id} (attempt ${message.attempts}/${message.maxRetries})`);
        return message;
    }

    // Consumer: Acknowledge successful processing
    async ack(messageId) {
        const item = this.processing.get(messageId);
        if (!item) {
            throw new Error(`Message ${messageId} not in processing state`);
        }

        clearTimeout(item.visibilityTimeout);
        this.processing.delete(messageId);
        this.stats.processed++;

        console.log(`✓ ACK message ${messageId} - deleted from queue`);
    }

    // Consumer: Negative acknowledge (retry or DLQ)
    async nack(messageId) {
        const item = this.processing.get(messageId);
        if (!item) return;

        clearTimeout(item.visibilityTimeout);
        this.processing.delete(messageId);

        const message = item.message;

        if (message.attempts >= message.maxRetries) {
            // Move to Dead Letter Queue after max retries
            this.dlq.push(message);
            this.stats.failed++;
            console.log(`✗ Message ${messageId} moved to DLQ after ${message.attempts} attempts`);
        } else {
            // Retry: return to queue
            this.queue.unshift(message);
            console.log(`↻ NACK message ${messageId} - returned to queue for retry`);
        }
    }

    // Internal: Return message to queue if visibility timeout expires
    returnToQueue(messageId) {
        const item = this.processing.get(messageId);
        if (!item) return;

        this.processing.delete(messageId);
        this.queue.unshift(item.message);
        console.log(`⏱ Message ${messageId} visibility timeout expired - returned to queue`);
    }

    getStats() {
        return {
            ...this.stats,
            queueDepth: this.queue.length,
            processing: this.processing.size,
            dlqDepth: this.dlq.length
        };
    }
}

// Usage Example: Order Processing
const orderQueue = new MessageQueue('orders');

// Producer: API endpoint receives order
async function createOrder(orderData) {
    try {
        // Validate order (fast, <10ms)
        const orderId = await saveOrderToDatabase(orderData);

        // Enqueue processing job (async, doesn't block API response)
        const jobId = await orderQueue.enqueue({
            orderId,
            userId: orderData.userId,
            items: orderData.items,
            total: orderData.total,
            timestamp: Date.now()
        }, orderData.isPriority ? 10 : 0); // Priority orders jump the queue

        // Return immediately (API responds in ~50ms)
        return {
            orderId,
            jobId,
            status: 'processing',
            message: 'Order received and queued for processing'
        };
    } catch (error) {
        console.error('Order creation failed:', error);
        throw error;
    }
}

// Consumer: Worker processes orders
async function processOrders() {
    while (true) {
        const message = await orderQueue.dequeue(60000); // 60s visibility timeout

        if (!message) {
            // No messages - wait before polling again
            await sleep(1000);
            continue;
        }

        try {
            const order = message.body;

            // Process order (slow operations: inventory check, payment, shipping)
            await checkInventory(order.items);        // 50-200ms
            await processPayment(order.userId, order.total); // 500-2000ms
            await createShipment(order.orderId);      // 100-500ms
            await sendConfirmationEmail(order.userId); // 200-800ms

            // Mark message as successfully processed
            await orderQueue.ack(message.id);
            console.log(`Order ${order.orderId} processed successfully`);

        } catch (error) {
            console.error(`Order processing failed:`, error);
            // Negative acknowledge - will retry or move to DLQ
            await orderQueue.nack(message.id);
        }
    }
}

// Start multiple workers for parallel processing
const NUM_WORKERS = 5; // Scale based on queue depth
for (let i = 0; i < NUM_WORKERS; i++) {
    processOrders().catch(console.error);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Explanation

**Key Design Decisions:**

1. **Immediate API Response**: API returns in 50ms with "processing" status, not waiting for 2-3 second order processing
2. **Visibility Timeout**: Prevents duplicate processing if worker crashes - message reappears after 60s
3. **Priority Queue**: Premium orders (`priority: 10`) processed before standard orders
4. **Dead Letter Queue**: After 3 failed attempts, message moves to DLQ for manual investigation
5. **Independent Scaling**: Can scale workers (5 → 50) without touching API servers

### Trade-offs

- ✅ **Pros**: Decouples fast API from slow processing, handles traffic spikes gracefully, enables independent scaling
- ✅ **Pros**: Reliable delivery with retries, fault-tolerant (worker crashes don't lose messages)
- ❌ **Cons**: Eventual consistency (order status not immediately final), requires polling or webhooks for status updates
- ❌ **Cons**: At-least-once delivery requires idempotent consumers (payment processor must handle duplicate charges)

---

## Example 2: AWS SQS with Python

### Scenario

Social media platform sends 100M push notifications daily. Notification service can process 50k/second, but traffic spikes to 500k/second during breaking news events. Use AWS SQS to buffer notification requests.

### Implementation

```python
# notification_producer.py
import boto3
import json
from datetime import datetime

class NotificationProducer:
    def __init__(self, queue_url):
        self.sqs = boto3.client('sqs', region_name='us-east-1')
        self.queue_url = queue_url

    def send_notification(self, user_id, title, message, priority='normal'):
        """
        Send notification to queue (returns in <10ms)
        Doesn't wait for actual notification delivery
        """
        try:
            message_body = {
                'userId': user_id,
                'title': title,
                'message': message,
                'timestamp': datetime.utcnow().isoformat(),
                'retryCount': 0
            }

            # Message attributes for filtering/routing
            message_attributes = {
                'Priority': {
                    'StringValue': priority,
                    'DataType': 'String'
                },
                'NotificationType': {
                    'StringValue': 'push',
                    'DataType': 'String'
                }
            }

            # Send to SQS (async operation, ~5-10ms)
            response = self.sqs.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(message_body),
                MessageAttributes=message_attributes,
                # Delay delivery by 5 seconds (optional)
                DelaySeconds=0
            )

            print(f"✓ Notification queued: {response['MessageId']}")
            return response['MessageId']

        except Exception as e:
            print(f"✗ Failed to queue notification: {e}")
            raise

    def send_batch(self, notifications):
        """
        Send up to 10 notifications in single API call
        Increases throughput from 300 msg/s → 3000 msg/s
        """
        if len(notifications) > 10:
            raise ValueError("Batch size cannot exceed 10 messages")

        entries = []
        for i, notif in enumerate(notifications):
            entries.append({
                'Id': str(i),
                'MessageBody': json.dumps(notif),
                'MessageAttributes': {
                    'Priority': {
                        'StringValue': notif.get('priority', 'normal'),
                        'DataType': 'String'
                    }
                }
            })

        response = self.sqs.send_message_batch(
            QueueUrl=self.queue_url,
            Entries=entries
        )

        print(f"✓ Batch sent: {len(response['Successful'])} succeeded, {len(response.get('Failed', []))} failed")
        return response


# notification_consumer.py
import boto3
import json
import time

class NotificationConsumer:
    def __init__(self, queue_url):
        self.sqs = boto3.client('sqs', region_name='us-east-1')
        self.queue_url = queue_url

    def process_notifications(self):
        """
        Long-polling consumer - waits up to 20s for messages
        More efficient than short polling (reduces empty receives)
        """
        while True:
            try:
                # Receive up to 10 messages (max batch size)
                # WaitTimeSeconds=20 enables long polling
                response = self.sqs.receive_message(
                    QueueUrl=self.queue_url,
                    MaxNumberOfMessages=10,
                    WaitTimeSeconds=20,  # Long polling reduces costs
                    VisibilityTimeout=300,  # 5 minutes to process
                    MessageAttributeNames=['All']
                )

                messages = response.get('Messages', [])

                if not messages:
                    print("No messages in queue, continuing to poll...")
                    continue

                print(f"→ Received {len(messages)} messages")

                # Process messages in parallel
                for message in messages:
                    self.process_message(message)

            except Exception as e:
                print(f"✗ Error polling queue: {e}")
                time.sleep(5)

    def process_message(self, message):
        """Process single notification and send to device"""
        try:
            body = json.loads(message['Body'])
            receipt_handle = message['ReceiptHandle']

            user_id = body['userId']
            title = body['title']
            notification_message = body['message']

            # Send push notification (slow operation: 100-500ms)
            success = self.send_push_notification(user_id, title, notification_message)

            if success:
                # Delete message from queue (ACK)
                self.sqs.delete_message(
                    QueueUrl=self.queue_url,
                    ReceiptHandle=receipt_handle
                )
                print(f"✓ Notification sent to user {user_id}")
            else:
                # Don't delete - message will reappear after visibility timeout
                print(f"✗ Failed to send notification to user {user_id}, will retry")

        except Exception as e:
            print(f"✗ Error processing message: {e}")
            # Message will automatically retry after visibility timeout

    def send_push_notification(self, user_id, title, message):
        """
        Simulate sending push notification via FCM/APNs
        In production: use Firebase Cloud Messaging or Apple Push Notification service
        """
        try:
            # Simulate API call to push notification service
            time.sleep(0.2)  # 200ms average latency

            # Idempotency check: don't send duplicate notifications
            notification_id = f"{user_id}:{title}:{message}"
            if self.is_already_sent(notification_id):
                print(f"  Duplicate notification detected, skipping")
                return True

            # Send to FCM/APNs
            # fcm_response = fcm.send(user_id, title, message)

            self.mark_as_sent(notification_id)
            return True

        except Exception as e:
            print(f"  Push notification failed: {e}")
            return False

    def is_already_sent(self, notification_id):
        # Check Redis/DynamoDB for deduplication
        # return redis.exists(f"notif:{notification_id}")
        return False

    def mark_as_sent(self, notification_id):
        # Store in Redis with 24h TTL for deduplication
        # redis.setex(f"notif:{notification_id}", 86400, "1")
        pass


# Usage
if __name__ == "__main__":
    QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789/notifications-queue"

    # Start consumer (run multiple instances for scale)
    consumer = NotificationConsumer(QUEUE_URL)
    consumer.process_notifications()
```

### Explanation

**AWS SQS Benefits:**

1. **Managed Service**: No infrastructure to manage, automatically scales to billions of messages
2. **Long Polling**: `WaitTimeSeconds=20` reduces empty receives from 90% → <10%, lowers costs by 10x
3. **Batch Operations**: `send_message_batch` increases throughput 10x (300 msg/s → 3000 msg/s)
4. **Dead Letter Queue**: Configure redrive policy to move failed messages after N retries
5. **Cost**: $0.40 per million requests → 100M notifications/day = $40/day = $1,200/month

### Trade-offs

- ✅ **Pros**: Fully managed (no servers), unlimited scaling, high availability (99.9% SLA), automatic retries
- ✅ **Pros**: Long polling reduces costs, batch operations increase throughput, encryption at rest/transit
- ❌ **Cons**: At-least-once delivery (duplicates possible), max message size 256KB, max retention 14 days
- ❌ **Cons**: Standard queue has no ordering guarantee (use FIFO queue if order matters, but 3000 TPS limit)

---

## Example 3: Queue Infrastructure (Terraform + AWS)

### AWS Services

- **SQS (Simple Queue Service)**: Managed message queue, 99.9% availability, unlimited throughput
- **CloudWatch**: Queue depth monitoring, alerting on high backlog
- **Auto Scaling**: Scale worker EC2/ECS instances based on queue depth
- **DLQ (Dead Letter Queue)**: Separate queue for failed messages after max retries

### Infrastructure as Code

```hcl
# terraform/message-queue.tf

# Main processing queue
resource "aws_sqs_queue" "orders_queue" {
  name                       = "orders-processing-queue"
  delay_seconds              = 0
  max_message_size           = 262144  # 256 KB
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20      # Long polling enabled
  visibility_timeout_seconds = 300     # 5 minutes for processing

  # Dead Letter Queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3  # Move to DLQ after 3 failed attempts
  })

  # Encryption at rest
  kms_master_key_id = aws_kms_key.sqs_encryption.id

  tags = {
    Environment = "production"
    Service     = "order-processing"
  }
}

# Dead Letter Queue for failed messages
resource "aws_sqs_queue" "orders_dlq" {
  name                      = "orders-processing-dlq"
  message_retention_seconds = 1209600 # 14 days retention

  tags = {
    Environment = "production"
    Service     = "order-processing"
    Purpose     = "dead-letter-queue"
  }
}

# KMS key for encryption
resource "aws_kms_key" "sqs_encryption" {
  description             = "KMS key for SQS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# CloudWatch alarm: Queue depth too high (backlog building up)
resource "aws_cloudwatch_metric_alarm" "queue_depth_high" {
  alarm_name          = "orders-queue-depth-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300  # 5 minutes
  statistic           = "Average"
  threshold           = 10000  # Alert if >10k messages queued
  alarm_description   = "Orders queue backlog exceeds 10k messages"

  dimensions = {
    QueueName = aws_sqs_queue.orders_queue.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# CloudWatch alarm: Messages in DLQ (processing failures)
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "orders-dlq-has-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0  # Alert on any DLQ messages
  alarm_description   = "Failed orders detected in DLQ"

  dimensions = {
    QueueName = aws_sqs_queue.orders_dlq.name
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "sqs-alerts"
}

# Auto Scaling based on queue depth
resource "aws_appautoscaling_target" "ecs_workers" {
  max_capacity       = 50  # Max 50 worker instances
  min_capacity       = 2   # Min 2 instances (always on)
  resource_id        = "service/order-processing/workers"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "scale_on_queue_depth" {
  name               = "scale-workers-on-queue-depth"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_workers.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_workers.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_workers.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 100.0  # Target: 100 messages per worker

    customized_metric_specification {
      metric_name = "ApproximateNumberOfMessagesVisible"
      namespace   = "AWS/SQS"
      statistic   = "Average"
      unit        = "Count"

      dimensions {
        name  = "QueueName"
        value = aws_sqs_queue.orders_queue.name
      }
    }

    scale_in_cooldown  = 300  # Wait 5 min before scaling down
    scale_out_cooldown = 60   # Wait 1 min before scaling up again
  }
}

# IAM policy for producers (API servers)
resource "aws_iam_policy" "sqs_producer" {
  name        = "sqs-orders-producer-policy"
  description = "Allow sending messages to orders queue"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:SendMessageBatch",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.orders_queue.arn
      }
    ]
  })
}

# IAM policy for consumers (worker instances)
resource "aws_iam_policy" "sqs_consumer" {
  name        = "sqs-orders-consumer-policy"
  description = "Allow receiving and deleting messages from orders queue"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:ChangeMessageVisibility",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.orders_queue.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.orders_dlq.arn
      }
    ]
  })
}

# Output queue URL for application configuration
output "orders_queue_url" {
  value       = aws_sqs_queue.orders_queue.url
  description = "URL for orders processing queue"
}

output "orders_queue_arn" {
  value       = aws_sqs_queue.orders_queue.arn
  description = "ARN for orders processing queue"
}

output "dlq_url" {
  value       = aws_sqs_queue.orders_dlq.url
  description = "URL for dead letter queue"
}
```

### Cost Considerations

**AWS SQS Pricing (us-east-1):**
- First 1M requests/month: Free
- After 1M: $0.40 per million requests (or $0.00000040 per request)

**Example: 100M messages/day**
- Monthly requests: 100M/day × 30 days = 3B requests
- Cost: (3,000M - 1M free) × $0.40 / 1M = $1,199.60/month
- Data transfer: Minimal (messages <10KB)
- **Total: ~$1,200/month for 100M messages/day**

**Comparison to self-hosted RabbitMQ:**
- 5× m5.large instances (HA cluster): $350/month
- Engineering time (setup, maintenance, monitoring): $5,000-10,000/month
- **SQS wins for most use cases unless >1B messages/day**

---

## Part 2: Pub/Sub Pattern

### Problem → Solution

**Problem**: Broadcast + Realtime → Need to notify multiple services/clients when events occur
**Solution**: Pub/Sub - Publishers broadcast events to topics; multiple subscribers receive copies independently
**When to Use**:
- Broadcasting order events to 5 microservices (inventory, shipping, analytics, recommendations, email)
- Real-time notifications to 10M+ connected users (live scores, stock prices, breaking news)
- Event-driven architecture where services react to events without tight coupling
- Fanout scenarios where one event triggers multiple workflows (user signup → welcome email + analytics + CRM + recommendations)

---

## Pub/Sub Pattern Overview

### What is Pub/Sub?

**Publish-Subscribe (Pub/Sub)** is a messaging pattern where publishers send messages to topics without knowing who will receive them. Subscribers express interest in topics and receive all messages published to those topics. Each subscriber gets an independent copy of every message.

Think of it like a newspaper subscription: the publisher (newspaper) doesn't know who subscribes, and subscribers don't know how many others also subscribe. When the newspaper publishes (once), all subscribers receive their own copy.

Unlike queues (1 message → 1 consumer), Pub/Sub enables **1 message → N consumers** fanout pattern. This decouples publishers from subscribers and enables event-driven architectures.

### Key Characteristics

- **One-to-Many Fanout**: Single event → multiple subscribers receive independent copies
- **Topic-Based Routing**: Subscribers filter by topics/channels (e.g., `orders.created`, `user.login`, `sensor.temperature`)
- **Push or Pull Delivery**: Push sends messages to webhooks; pull lets subscribers poll at their own pace
- **At-Least-Once Delivery**: Each subscriber guaranteed delivery, but may receive duplicates
- **Complexity**: Time O(1) publish, O(n) fanout to n subscribers; Space O(n × m) for n subscribers × m messages

### Real-World Applications

- **YouTube**: Video upload event → transcoding service, thumbnail service, recommendation service, notification service (4+ subscribers)
- **AWS**: CloudWatch Events broadcasts infrastructure events → Lambda functions, SNS, SQS, Step Functions (10+ subscribers per event type)
- **Stripe**: Payment events (`payment.succeeded`) → customer service system, analytics, fraud detection, accounting (6+ subscribers)

---

## Pub/Sub Core Concepts

### Architecture Pattern

```
┌──────────────┐                    ┌─────────────────────────┐
│  Publisher 1 │───┐                │   Topic: "orders"       │
│  (Checkout)  │   │                │                         │
└──────────────┘   │                │  ┌─────────────────┐    │
                   │  Publish       │  │ Message:        │    │
┌──────────────┐   │  (1-10ms)      │  │ {               │    │
│  Publisher 2 │───┼───────────────▶│  │   orderId: 123  │    │
│  (API)       │   │                │  │   total: 99.99  │    │
└──────────────┘   │                │  │   userId: "abc" │    │
                   │                │  │ }               │    │
┌──────────────┐   │                │  └─────────────────┘    │
│  Publisher 3 │───┘                │                         │
│  (Scheduler) │                    └─────────────────────────┘
└──────────────┘                                │
                                                │ Fanout (broadcast)
                         ┌──────────────────────┼──────────────────────┐
                         │                      │                      │
                         ▼                      ▼                      ▼
              ┌──────────────────┐   ┌──────────────────┐  ┌──────────────────┐
              │ Subscriber 1     │   │ Subscriber 2     │  │ Subscriber 3     │
              │ (Inventory)      │   │ (Shipping)       │  │ (Analytics)      │
              │                  │   │                  │  │                  │
              │ - Decrement qty  │   │ - Create label   │  │ - Track revenue  │
              │ - Check stock    │   │ - Notify carrier │  │ - Update metrics │
              └──────────────────┘   └──────────────────┘  └──────────────────┘
                     │                       │                      │
                     ▼                       ▼                      ▼
              Each processes              Each processes       Each processes
              independently              independently        independently
              (ACK when done)            (ACK when done)      (ACK when done)

Key Differences from Queue:
- Queue: 1 message → 1 consumer (competitive consumers)
- Pub/Sub: 1 message → ALL subscribers (each gets independent copy)
```

### Key Components

1. **Publisher**: Service that emits events to topics (doesn't know who subscribes)
2. **Topic**: Named channel for related events (e.g., `orders.created`, `user.signup`, `payment.succeeded`)
3. **Subscriber**: Service that consumes events from topics (receives all matching messages)
4. **Message**: Event payload with metadata (timestamp, attributes, body)
5. **Subscription**: Configuration linking topic to subscriber (delivery method, filter, retry policy)

### How It Works

**Example: E-commerce Order Created Event**

1. **User completes checkout** → Checkout service creates order in database
2. **Checkout publishes event** to topic `orders.created`: `{ orderId: 123, userId: "abc", total: 99.99, items: [...] }`
3. **Message broadcasts to ALL subscribers** (happens in parallel):
   - **Inventory Service**: Decrements stock quantities
   - **Shipping Service**: Creates shipping label and notifies carrier
   - **Email Service**: Sends order confirmation email
   - **Analytics Service**: Tracks revenue metrics
   - **Fraud Detection**: Analyzes order for suspicious patterns
   - **Recommendation Service**: Updates user purchase history
4. **Each subscriber processes independently** at its own pace (some in 50ms, others in 5 seconds)
5. **Each subscriber ACKs** when done processing (failures don't affect other subscribers)

---

## Example 4: Simple Pub/Sub (JavaScript/Node.js)

### Scenario

Video streaming platform publishes `video.uploaded` events. Multiple services need to react: transcoding service, thumbnail generator, content moderation, search indexer. Using Pub/Sub, each service receives the event independently.

### Implementation

```javascript
// pubsub.js - Simple in-memory Pub/Sub (Redis Pub/Sub in production)
class PubSub {
    constructor() {
        // Map of topic → Set of subscriber callbacks
        this.topics = new Map();
        this.stats = { published: 0, delivered: 0, failed: 0 };
    }

    // Publisher: Publish message to topic (O(n) where n = subscribers)
    async publish(topic, message) {
        const subscribers = this.topics.get(topic) || new Set();

        if (subscribers.size === 0) {
            console.log(`⚠ Published to topic '${topic}' with no subscribers`);
            return 0;
        }

        const messageEnvelope = {
            topic,
            message,
            publishedAt: Date.now(),
            messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        this.stats.published++;
        let deliveredCount = 0;

        // Fanout to all subscribers in parallel
        const deliveryPromises = Array.from(subscribers).map(async (subscriber) => {
            try {
                // Each subscriber receives independent copy
                await subscriber.callback(messageEnvelope);
                this.stats.delivered++;
                deliveredCount++;
            } catch (error) {
                this.stats.failed++;
                console.error(`✗ Subscriber ${subscriber.name} failed:`, error.message);

                // Retry logic (optional)
                if (subscriber.retries < 3) {
                    subscriber.retries++;
                    setTimeout(() => {
                        subscriber.callback(messageEnvelope).catch(() => {});
                    }, 1000 * subscriber.retries);
                }
            }
        });

        await Promise.all(deliveryPromises);

        console.log(`✓ Published to '${topic}': ${deliveredCount}/${subscribers.size} subscribers received`);
        return deliveredCount;
    }

    // Subscriber: Subscribe to topic
    subscribe(topic, name, callback) {
        if (!this.topics.has(topic)) {
            this.topics.set(topic, new Set());
        }

        const subscriber = {
            name,
            callback,
            subscribedAt: Date.now(),
            retries: 0
        };

        this.topics.get(topic).add(subscriber);
        console.log(`✓ '${name}' subscribed to topic '${topic}'`);

        // Return unsubscribe function
        return () => {
            this.topics.get(topic).delete(subscriber);
            console.log(`✓ '${name}' unsubscribed from topic '${topic}'`);
        };
    }

    // Get topic subscribers count
    getSubscriberCount(topic) {
        return (this.topics.get(topic) || new Set()).size;
    }

    getStats() {
        return { ...this.stats };
    }
}

// Usage Example: Video Upload Event
const pubsub = new PubSub();

// Subscriber 1: Transcoding Service
pubsub.subscribe('video.uploaded', 'TranscodingService', async (event) => {
    const { videoId, s3Key, resolution } = event.message;
    console.log(`[Transcoding] Processing video ${videoId}...`);

    // Simulate transcoding (5-10 seconds in reality)
    await sleep(2000);

    // Generate 1080p, 720p, 480p, 360p versions
    console.log(`[Transcoding] ✓ Generated 4 resolutions for ${videoId}`);
});

// Subscriber 2: Thumbnail Generator
pubsub.subscribe('video.uploaded', 'ThumbnailService', async (event) => {
    const { videoId, s3Key } = event.message;
    console.log(`[Thumbnail] Generating thumbnails for ${videoId}...`);

    await sleep(500);

    // Extract 5 thumbnail images at different timestamps
    console.log(`[Thumbnail] ✓ Generated 5 thumbnails for ${videoId}`);
});

// Subscriber 3: Content Moderation
pubsub.subscribe('video.uploaded', 'ModerationService', async (event) => {
    const { videoId, userId } = event.message;
    console.log(`[Moderation] Scanning video ${videoId} for policy violations...`);

    await sleep(1000);

    // Run AI model to detect inappropriate content
    const isSafe = Math.random() > 0.05; // 95% safe
    if (!isSafe) {
        console.log(`[Moderation] ✗ Video ${videoId} flagged for review`);
        // Publish another event for manual review
        await pubsub.publish('video.flagged', { videoId, userId, reason: 'policy_violation' });
    } else {
        console.log(`[Moderation] ✓ Video ${videoId} passed moderation`);
    }
});

// Subscriber 4: Search Indexer
pubsub.subscribe('video.uploaded', 'SearchIndexer', async (event) => {
    const { videoId, title, description, tags } = event.message;
    console.log(`[Search] Indexing video ${videoId} for search...`);

    await sleep(300);

    // Index in Elasticsearch for fast search
    console.log(`[Search] ✓ Indexed video ${videoId}: "${title}"`);
});

// Subscriber 5: Analytics
pubsub.subscribe('video.uploaded', 'AnalyticsService', async (event) => {
    const { userId, videoSize, uploadDuration } = event.message;
    console.log(`[Analytics] Tracking upload metrics...`);

    await sleep(100);

    // Update user stats, track upload patterns
    console.log(`[Analytics] ✓ Logged upload for user ${userId}: ${videoSize}MB in ${uploadDuration}s`);
});

// Publisher: Video Upload API
async function handleVideoUpload(videoData) {
    const { userId, file, title, description, tags } = videoData;

    // Step 1: Upload to S3
    const s3Key = await uploadToS3(file);
    const videoId = generateVideoId();

    // Step 2: Save to database
    await saveVideoToDatabase({ videoId, userId, s3Key, title, description });

    // Step 3: Publish event (triggers all 5 subscribers in parallel)
    await pubsub.publish('video.uploaded', {
        videoId,
        userId,
        s3Key,
        title,
        description,
        tags,
        resolution: '1080p',
        videoSize: file.size / (1024 * 1024), // MB
        uploadDuration: 45 // seconds
    });

    // Step 4: Return immediately (don't wait for processing)
    return {
        videoId,
        status: 'processing',
        message: 'Video uploaded and processing started'
    };
}

// Simulate video upload
async function simulateUpload() {
    console.log('\n=== Video Upload Started ===\n');

    await handleVideoUpload({
        userId: 'user-123',
        file: { size: 157286400 }, // 150 MB
        title: 'My Awesome Video',
        description: 'A great video about system design',
        tags: ['education', 'tech', 'programming']
    });

    console.log('\n=== All Subscribers Processing (in parallel) ===\n');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadToS3(file) {
    return `videos/${Date.now()}/video.mp4`;
}

function generateVideoId() {
    return `vid-${Date.now()}`;
}

async function saveVideoToDatabase(video) {
    // Simulate DB save
    await sleep(50);
}

// Run simulation
simulateUpload().then(() => {
    setTimeout(() => {
        console.log('\n=== Stats ===');
        console.log(pubsub.getStats());
    }, 3000);
});
```

### Explanation

**Key Design Decisions:**

1. **Fanout to All Subscribers**: Single `publish()` call delivers to 5 independent subscribers in parallel
2. **Decoupled Services**: Video upload API doesn't know about transcoding, thumbnails, etc. - just publishes event
3. **Independent Processing**: Each subscriber processes at different speeds (100ms-2000ms) without blocking others
4. **Failure Isolation**: If thumbnail service fails, transcoding/moderation/search still succeed
5. **Easy to Add Subscribers**: Adding recommendation service just requires one `subscribe()` call - no changes to publisher

### Trade-offs

- ✅ **Pros**: Perfect for event-driven architecture, decouples services, easy to add new subscribers, parallel processing
- ✅ **Pros**: Each subscriber processes at own pace, failure isolation (one subscriber crash doesn't affect others)
- ❌ **Cons**: No guaranteed order across subscribers, duplicate messages possible (at-least-once delivery)
- ❌ **Cons**: Harder to implement distributed transactions (all subscribers must succeed or rollback)

---

## Example 5: AWS SNS + SQS Fanout (Terraform)

### Scenario

E-commerce platform publishes `order.created` events. Six different services subscribe:
1. **Inventory Service** (SQS queue) - decrements stock
2. **Shipping Service** (SQS queue) - creates labels
3. **Email Service** (Lambda function) - sends confirmation
4. **Analytics** (Kinesis stream) - tracks metrics
5. **Fraud Detection** (SQS queue) - analyzes patterns
6. **Webhook** (HTTPS endpoint) - notifies third-party

### Infrastructure as Code

```hcl
# terraform/pubsub-fanout.tf

# SNS Topic for order events
resource "aws_sns_topic" "order_events" {
  name              = "order-events"
  display_name      = "E-commerce Order Events"
  fifo_topic        = false  # Standard topic (use FIFO for ordered events)

  # Enable encryption at rest
  kms_master_key_id = aws_kms_key.sns_encryption.id

  tags = {
    Environment = "production"
    Service     = "orders"
  }
}

# KMS key for SNS encryption
resource "aws_kms_key" "sns_encryption" {
  description             = "KMS key for SNS topic encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

# Subscriber 1: Inventory Service (SQS Queue)
resource "aws_sqs_queue" "inventory_queue" {
  name                       = "inventory-order-updates"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20
}

resource "aws_sns_topic_subscription" "inventory_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.inventory_queue.arn

  # Filter policy: only receive order.created and order.cancelled events
  filter_policy = jsonencode({
    eventType = ["order.created", "order.cancelled"]
  })
}

# Allow SNS to send messages to SQS
resource "aws_sqs_queue_policy" "inventory_queue_policy" {
  queue_url = aws_sqs_queue.inventory_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.inventory_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.order_events.arn
          }
        }
      }
    ]
  })
}

# Subscriber 2: Shipping Service (SQS Queue)
resource "aws_sqs_queue" "shipping_queue" {
  name                       = "shipping-order-updates"
  visibility_timeout_seconds = 600  # Shipping takes longer
  message_retention_seconds  = 1209600
  receive_wait_time_seconds  = 20
}

resource "aws_sns_topic_subscription" "shipping_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.shipping_queue.arn

  filter_policy = jsonencode({
    eventType = ["order.created"]
    shippingRequired = [true]  # Only orders that need shipping
  })
}

resource "aws_sqs_queue_policy" "shipping_queue_policy" {
  queue_url = aws_sqs_queue.shipping_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.shipping_queue.arn
        Condition = {
          ArnEquals = { "aws:SourceArn" = aws_sns_topic.order_events.arn }
        }
      }
    ]
  })
}

# Subscriber 3: Email Service (Lambda Function)
resource "aws_lambda_function" "order_email" {
  filename      = "lambda/order-email.zip"
  function_name = "send-order-confirmation-email"
  role          = aws_iam_role.lambda_email_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30

  environment {
    variables = {
      SES_SENDER_EMAIL = "orders@example.com"
    }
  }
}

resource "aws_sns_topic_subscription" "email_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.order_email.arn
}

resource "aws_lambda_permission" "allow_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.order_email.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.order_events.arn
}

# Subscriber 4: Fraud Detection (SQS Queue with DLQ)
resource "aws_sqs_queue" "fraud_dlq" {
  name = "fraud-detection-dlq"
}

resource "aws_sqs_queue" "fraud_queue" {
  name                       = "fraud-detection-queue"
  visibility_timeout_seconds = 900  # 15 minutes for ML inference

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fraud_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sns_topic_subscription" "fraud_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.fraud_queue.arn

  filter_policy = jsonencode({
    eventType = ["order.created"]
    total = [{
      numeric = [">=", 1000]  # Only high-value orders ($1000+)
    }]
  })
}

resource "aws_sqs_queue_policy" "fraud_queue_policy" {
  queue_url = aws_sqs_queue.fraud_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "sns.amazonaws.com" }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.fraud_queue.arn
        Condition = {
          ArnEquals = { "aws:SourceArn" = aws_sns_topic.order_events.arn }
        }
      }
    ]
  })
}

# Subscriber 5: Webhook (HTTPS Endpoint)
resource "aws_sns_topic_subscription" "webhook_subscription" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "https"
  endpoint  = "https://partner-api.example.com/webhooks/orders"

  # Delivery policy with retries
  delivery_policy = jsonencode({
    healthyRetryPolicy = {
      minDelayTarget     = 5
      maxDelayTarget     = 300
      numRetries         = 10
      numNoDelayRetries  = 0
      numMinDelayRetries = 2
      numMaxDelayRetries = 8
      backoffFunction    = "exponential"
    }
  })
}

# CloudWatch Dashboard for monitoring
resource "aws_cloudwatch_dashboard" "pubsub_monitoring" {
  dashboard_name = "order-events-pubsub"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/SNS", "NumberOfMessagesPublished", { stat = "Sum" }],
            [".", "NumberOfNotificationsDelivered", { stat = "Sum" }],
            [".", "NumberOfNotificationsFailed", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "SNS Topic Metrics"
        }
      }
    ]
  })
}

# IAM role for Lambda email function
resource "aws_iam_role" "lambda_email_role" {
  name = "order-email-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_email_ses" {
  role       = aws_iam_role.lambda_email_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSESFullAccess"
}

# Outputs
output "order_events_topic_arn" {
  value       = aws_sns_topic.order_events.arn
  description = "ARN of SNS topic for order events"
}

output "subscriber_queue_urls" {
  value = {
    inventory = aws_sqs_queue.inventory_queue.url
    shipping  = aws_sqs_queue.shipping_queue.url
    fraud     = aws_sqs_queue.fraud_queue.url
  }
  description = "Queue URLs for all subscribers"
}
```

### Cost Considerations

**AWS SNS + SQS Pricing:**
- SNS: $0.50 per million publishes (after 1M free)
- SQS: $0.40 per million requests (after 1M free)
- Lambda: $0.20 per million requests + compute time

**Example: 10M orders/month**
- SNS publishes: 10M × $0.50 / 1M = $5
- SQS receives (4 queues × 10M): 40M × $0.40 / 1M = $16
- Lambda invocations: 10M × $0.20 / 1M = $2
- **Total: ~$23/month for 10M events with 5 subscribers**

---

## Queue vs Pub/Sub Comparison

### Decision Table

| Scenario | Pattern | Reason |
|----------|---------|--------|
| Order processing (1 order → 1 worker) | **Queue** | Competitive consumers, exactly one processor |
| Order notification (1 order → 5 services) | **Pub/Sub** | Fanout to multiple independent subscribers |
| Background jobs (email, reports) | **Queue** | Task distribution, load leveling |
| Real-time updates (live scores, stock prices) | **Pub/Sub** | Broadcast to all connected clients |
| Video transcoding (CPU-intensive, slow) | **Queue** | Worker pool processes jobs one-by-one |
| User signup (→ email + CRM + analytics) | **Pub/Sub** | Single event triggers multiple workflows |
| API rate limiting buffer | **Queue** | Smooth traffic spikes |
| Event-driven microservices | **Pub/Sub** | Services react to domain events |

### Technical Comparison

| Feature | Queue | Pub/Sub |
|---------|-------|---------|
| **Message Flow** | 1 → 1 (one consumer) | 1 → N (all subscribers) |
| **Consumer Type** | Competitive (first available) | Independent (all receive) |
| **Use Case** | Task distribution | Event broadcasting |
| **Ordering** | FIFO (optional) | No ordering guarantee |
| **Delivery** | Exactly-once or at-least-once | At-least-once per subscriber |
| **Scaling** | Add more workers | Add more subscribers |
| **Example** | Order processing | Order notifications |
| **AWS Service** | SQS | SNS (+ SQS for subscribers) |

### Hybrid Pattern: SNS → SQS Fanout

**Best of both worlds:**
- SNS provides Pub/Sub fanout (1 → N broadcast)
- Each subscriber gets dedicated SQS queue (buffering, retries, backpressure)
- Combine benefits: event-driven + reliable delivery + independent scaling

```
Order Created Event
       │
       ▼
   SNS Topic ────────┬────────┬────────┬────────┐
       │             │        │        │        │
       ▼             ▼        ▼        ▼        ▼
   SQS Queue    SQS Queue  Lambda  Kinesis  HTTPS
   (Inventory)  (Shipping) (Email) (Analytics) (Webhook)
```

---

## Interview Deep Dive

### Common Interview Questions

**Q1: What is the difference between a message queue and pub/sub?**

**A**: Both are asynchronous messaging patterns, but with different message flows:

**Message Queue (1 → 1):**
- Producers send messages to queue; consumers compete to process messages
- Each message consumed by exactly ONE worker (competitive consumers)
- Use case: Task distribution, background jobs, load leveling
- Example: 1000 emails to send → 10 workers pull from queue → each worker sends ~100 emails

**Pub/Sub (1 → N):**
- Publishers send messages to topics; ALL subscribers receive independent copies
- Each message delivered to EVERY subscriber (fanout pattern)
- Use case: Event broadcasting, event-driven architecture, real-time notifications
- Example: Order created → inventory service, shipping service, email service, analytics ALL receive the event

**When to use Queue:** Need exactly-one processing (order processing, payments, transcoding)
**When to use Pub/Sub:** Need event broadcasting (notifications, webhooks, microservice coordination)
**Hybrid (SNS→SQS):** Combine both - Pub/Sub fanout with Queue buffering per subscriber

---

**Q2: How would you design a system to process 100M notifications per day using queues?**

**A**: **Architecture:**

```
API Servers (Producers)
    │
    ▼
AWS SQS Queue (Buffer)
    │
    ▼
Auto-Scaling Worker Fleet (Consumers)
    │
    ▼
Push Notification Service (FCM/APNs)
```

**Capacity Planning:**
- 100M notifications/day = 1,157 notifications/second average
- Peak traffic (2x average) = 2,314 notifications/second
- Worker throughput: 50 notifications/second per worker
- Required workers: 2,314 / 50 = **47 workers at peak**

**SQS Configuration:**
- Standard queue (no ordering needed, higher throughput)
- Batch operations: `send_message_batch` (10 messages/request) → 3000 msg/s per producer
- Long polling: `WaitTimeSeconds=20` → reduces costs 10x
- Visibility timeout: 60 seconds (enough for FCM/APNs round-trip)
- DLQ: Move to DLQ after 3 retries for failed devices

**Auto-Scaling Strategy:**
- Target: 100 messages per worker in queue
- Queue depth 1000 → Scale to 10 workers
- Queue depth 10,000 → Scale to 100 workers
- Scale-out fast (1 min cooldown), scale-in slow (5 min cooldown)

**Cost:**
- SQS: 100M messages × $0.40/million = $40/month
- EC2 workers (t3.medium, 47 instances avg): $1,500/month
- **Total: ~$1,540/month for 100M notifications/day**

**Failure Handling:**
- Idempotent consumers: Track sent notifications in Redis (24h TTL) to prevent duplicates
- Retry with exponential backoff: 1s, 2s, 4s delays
- DLQ monitoring: Alert on any DLQ messages for manual review

---

**Q3: Explain how AWS SNS + SQS fanout pattern works and when to use it.**

**A**: **SNS + SQS Fanout** combines Pub/Sub broadcasting with Queue buffering:

**Architecture:**
```
Publisher → SNS Topic → Fan out to:
                        ├─ SQS Queue 1 (Inventory)
                        ├─ SQS Queue 2 (Shipping)
                        ├─ SQS Queue 3 (Analytics)
                        ├─ Lambda Function (Email)
                        └─ HTTPS Endpoint (Webhook)
```

**How It Works:**
1. **Publisher sends 1 message** to SNS topic (single API call)
2. **SNS fans out** to all subscriptions in parallel (5 independent deliveries)
3. **Each SQS queue receives copy** - buffered independently
4. **Each consumer processes** at its own pace from dedicated queue

**Benefits:**
- **Event-driven + Reliable**: Pub/Sub flexibility with SQS durability
- **Independent Buffering**: Slow consumers don't block fast ones (inventory fast, fraud detection slow)
- **Backpressure Handling**: Each subscriber has dedicated queue with its own depth/scaling
- **Filter Policies**: Subscribers only receive relevant events (e.g., `eventType = "order.created"`)

**When to Use:**
- ✅ Multiple independent services need same event
- ✅ Subscribers process at different speeds
- ✅ Need guaranteed delivery per subscriber
- ✅ Want to add subscribers without changing publisher code

**Real-World Example - Stripe Payment Events:**
- 1 `payment.succeeded` event → SNS topic
- Fans out to: Customer service (SQS), Analytics (Kinesis), Accounting (SQS), Fraud (SQS), Webhooks (HTTPS)
- Each subscriber independently processes payment - failure in one doesn't affect others

---

**Q4: What are the failure modes of message queues and how do you handle them?**

**A**: **3 Primary Failure Modes:**

**1. Consumer Failure Mid-Processing**
- **Symptom**: Worker crashes after dequeuing but before ACK
- **Cause**: Out of memory, network timeout, unhandled exception
- **Solution**: Visibility timeout - message reappears after 30-60s for retry
- **Prevention**:
  - Set visibility timeout > max processing time
  - Implement proper error handling and logging
  - Use idempotent consumers (detect duplicate processing)

**2. Poison Messages (Always Fail)**
- **Symptom**: Message repeatedly fails processing, blocks queue
- **Cause**: Malformed data, unhandled edge case, external service down
- **Solution**: Dead Letter Queue (DLQ) - move after 3-5 retries
- **Prevention**:
  - Validate messages before enqueueing
  - Monitor DLQ depth - alert on any messages
  - Manual review process for DLQ messages

**3. Queue Backlog (Producers Faster Than Consumers)**
- **Symptom**: Queue depth growing unbounded, increasing latency
- **Cause**: Traffic spike, consumer crashes, slow processing
- **Solution**: Auto-scaling based on queue depth
- **Prevention**:
  - CloudWatch alarm: queue depth > 10k messages
  - Auto-scale workers: target 100-200 messages per worker
  - Circuit breaker: slow down producers if queue > 100k

**Example Mitigation Strategy:**
```javascript
// Idempotent consumer (prevents duplicate processing)
async function processOrder(message) {
    const orderId = message.body.orderId;

    // Check if already processed (Redis cache, 24h TTL)
    if (await redis.exists(`processed:${orderId}`)) {
        console.log(`Order ${orderId} already processed, skipping`);
        return; // ACK without reprocessing
    }

    // Process order
    await processPayment(orderId);
    await updateInventory(orderId);

    // Mark as processed
    await redis.setex(`processed:${orderId}`, 86400, "1");
}
```

---

**Q5: How would you implement real-time notifications for 10M concurrent users using Pub/Sub?**

**A**: **Architecture - Live Sports Scores Example:**

```
Game Score Update (Publisher)
       │
       ▼
   SNS Topic ("game.score.updated")
       │
       ▼
   AWS AppSync (GraphQL Subscriptions)
       │
       ▼
10M WebSocket Connections (Clients)
```

**Scalability Strategy:**

**1. Hierarchical Topics (Reduce Fanout)**
```
Root Topic: "game.score.updated"
    ├─ Subtopic: "game.12345.score"  (100k subscribers for popular game)
    ├─ Subtopic: "game.12346.score"  (50k subscribers)
    └─ Subtopic: "game.12347.score"  (200k subscribers)
```
- Users subscribe to specific game topics, not all games
- Publisher sends to specific game topic, not all 10M users

**2. Regional Fanout (Reduce Latency)**
```
SNS Topic (us-east-1) → 3M users in East
SNS Topic (eu-west-1) → 4M users in Europe
SNS Topic (ap-south-1) → 3M users in Asia
```
- Publish to all regions (3 SNS topics)
- Each region handles local WebSocket connections
- Latency: 50-100ms vs 200-500ms global

**3. WebSocket Connection Pooling**
- AWS AppSync: Managed GraphQL subscriptions, auto-scales to millions
- Alternative: API Gateway WebSocket API + Lambda
- Connection management: Keep-alive every 30s, reconnect on disconnect

**4. Message Filtering**
```javascript
// Client subscribes with filter
subscription {
    scoreUpdated(gameId: "12345") {
        homeScore
        awayScore
        timestamp
    }
}
```
- Server-side filtering before WebSocket send
- Reduces bandwidth: Only send relevant updates to each client

**Capacity Planning:**
- 10M connections × 1KB/connection = 10GB connection state
- Score updates: 100 games × 10 updates/game/minute = 1,000 updates/minute
- Average fanout: 100k subscribers per game
- Messages/second: 1,000 updates/min × 100k subscribers / 60s = **1.6M messages/second**

**AWS AppSync Scaling:**
- Auto-scales to millions of connections
- Pricing: $3.50 per million messages
- Cost: 1.6M msg/s × 86,400s/day × 30 days/month = 4.1T messages/month
- Monthly cost: 4.1T × $3.50 / 1M = **$14,400/month**

**Optimization - Batching:**
- Send updates every 5 seconds instead of real-time
- Reduces messages by 5x: **$2,880/month**
- Trade-off: 5s delay acceptable for live scores

---

### Discussion Points to Prepare

**When to use Queue vs Pub/Sub:**
- Queue: Exactly-once task processing, competitive consumers, load distribution
- Pub/Sub: Event broadcasting, fanout to multiple services, event-driven architecture
- Hybrid (SNS→SQS): Best of both - Pub/Sub flexibility + Queue reliability

**Ordering guarantees:**
- Standard queues: No ordering (higher throughput)
- FIFO queues: Strict ordering (3000 TPS limit)
- Pub/Sub: No cross-subscriber ordering

**Delivery semantics:**
- At-most-once: Fire-and-forget (UDP, unreliable)
- At-least-once: Guaranteed delivery, possible duplicates (SQS, SNS)
- Exactly-once: No duplicates, complex implementation (Kafka transactions, idempotent consumers)

**Backpressure handling:**
- Queue: Producers keep sending, queue buffers (potential unbounded growth)
- Monitoring: Alert on queue depth thresholds
- Solution: Auto-scale consumers, rate limit producers, circuit breaker

---

## Tools & Technologies

### Industry Standard Solutions

| Tool | Use Case | Pros | Cons | Scale |
|------|----------|------|------|-------|
| **AWS SQS** | Managed queue | Fully managed, unlimited scale, cheap | No ordering (standard), 256KB limit | Millions TPS |
| **AWS SNS** | Managed Pub/Sub | Easy fanout, 10M+ subscribers | Push-only, no replay | 300 msg/s per topic |
| **RabbitMQ** | Queue + Pub/Sub | Flexible routing, many protocols | Requires cluster management | 50k msg/s |
| **Apache Kafka** | Event streaming | High throughput, replay, ordering | Complex ops, higher latency | Millions msg/s |
| **Redis Pub/Sub** | In-memory Pub/Sub | Ultra-low latency (<1ms) | Fire-and-forget (no persistence) | 100k+ msg/s |
| **Google Pub/Sub** | Managed Pub/Sub | Global, at-least-once, replay | GCP-only, more expensive than SQS | Millions msg/s |
| **Azure Service Bus** | Queue + Pub/Sub | Enterprise features, transactions | Azure-only, complex pricing | 100k msg/s |

### Cloud Provider Solutions

**AWS:**
- **SQS (Queue)**: $0.40 per million requests, unlimited throughput, FIFO available
- **SNS (Pub/Sub)**: $0.50 per million publishes, 10M+ subscriptions, filter policies
- **SNS + SQS Fanout**: Best practice for event-driven microservices
- **EventBridge**: Event bus with schema registry, 15+ AWS service integrations

**GCP:**
- **Cloud Tasks (Queue)**: HTTP-based task queue, scheduled execution
- **Pub/Sub**: Global messaging, 10s message retention, exactly-once delivery (beta)
- **Firestore Triggers**: Real-time database events → Cloud Functions

**Azure:**
- **Service Bus (Queue)**: Enterprise messaging, sessions, transactions
- **Event Grid (Pub/Sub)**: Event routing, 24h retention, CloudEvents schema
- **Azure Functions**: Event-driven compute (trigger on queue/topic)

---

## Best Practices

### Do's ✅

- **Use Idempotent Consumers**: Always assume at-least-once delivery - check if message already processed before executing
  ```javascript
  if (await redis.exists(`processed:${messageId}`)) return;
  // Process message...
  await redis.setex(`processed:${messageId}`, 86400, "1");
  ```

- **Set Appropriate Visibility Timeout**: Timeout should be > max processing time to prevent duplicate processing
  - Fast operations (50-200ms): 30s visibility timeout
  - Slow operations (5-10s): 5min visibility timeout
  - Very slow (ML inference 1-5min): 15min visibility timeout

- **Use Dead Letter Queues**: Move poison messages after 3-5 retries to prevent blocking queue
  - Monitor DLQ depth - alert on any messages
  - Implement manual review process for DLQ
  - Log failed message details for debugging

- **Monitor Queue Depth**: Set CloudWatch alarms for queue depth thresholds
  - Normal: 0-1000 messages (consumers keeping up)
  - Warning: 1000-10,000 messages (consumers falling behind)
  - Critical: >10,000 messages (backlog growing, scale workers)

- **Use Batch Operations**: `send_message_batch` and `receive_message` with `MaxNumberOfMessages=10` increases throughput 10x
  ```python
  # Receive up to 10 messages per API call (vs 1 message)
  messages = sqs.receive_message(QueueUrl=url, MaxNumberOfMessages=10)
  ```

### Don'ts ❌

- **Don't Assume FIFO in Standard Queues**: Use FIFO queues if ordering matters, but accept 3000 TPS limit
  - Standard queue: Unlimited TPS, best-effort ordering
  - FIFO queue: 3000 TPS, strict ordering, exactly-once delivery

- **Don't Store Large Payloads in Messages**: Max 256KB per message - use S3 for larger data
  ```javascript
  // ❌ Bad: Embed 5MB video in message
  await queue.send({ videoData: base64Video });

  // ✅ Good: Upload to S3, send reference
  const s3Key = await uploadToS3(video);
  await queue.send({ s3Key });
  ```

- **Don't Ignore DLQ Messages**: Failed messages indicate bugs or external service issues - must investigate
  - Set up alerts for DLQ messages
  - Implement retry after fix (reprocess DLQ messages)

- **Don't Use Pub/Sub for Task Distribution**: Use queues for competitive consumers (1 task → 1 worker)
  - Pub/Sub sends to ALL subscribers (duplicates work)
  - Queue sends to ONE consumer (distributes work)

### Monitoring & Observability

**Key Metrics:**

**Queue Metrics:**
- `ApproximateNumberOfMessagesVisible`: Messages waiting in queue (queue depth)
- `ApproximateAgeOfOldestMessage`: How long oldest message has been waiting (latency indicator)
- `NumberOfMessagesSent`: Producer throughput
- `NumberOfMessagesReceived`: Consumer throughput
- `NumberOfMessagesDeleted`: Successfully processed messages

**Pub/Sub Metrics:**
- `NumberOfMessagesPublished`: Events published to topic
- `NumberOfNotificationsDelivered`: Successful deliveries to subscribers
- `NumberOfNotificationsFailed`: Failed deliveries (retry or alert)

**Alerting Thresholds:**
```
Queue Depth > 10,000        → WARNING (scale workers)
Queue Depth > 100,000       → CRITICAL (circuit breaker)
Age of Oldest Message > 5m  → WARNING (consumers slow)
DLQ Messages > 0            → CRITICAL (processing failures)
Failed Notifications > 1%   → WARNING (subscriber issues)
```

**Debugging Common Issues:**
- **Queue depth growing**: Consumers too slow or crashed - scale workers, check processing time
- **DLQ messages**: Poison messages or external service down - check logs, manual review
- **High latency**: Visibility timeout too high or consumers slow - optimize processing
- **Duplicate processing**: Visibility timeout too low - increase timeout or improve idempotency

---

## Common Failure Modes

### Failure Scenario 1: Poison Message Blocking Queue

- **Symptom**: Single malformed message repeatedly fails, gets retried infinitely, blocks consumers
- **Cause**: Invalid JSON, missing required fields, edge case bug in consumer code
- **Solution**:
  1. Set `maxReceiveCount=3` in redrive policy
  2. After 3 failures → auto-move to Dead Letter Queue
  3. Alert on DLQ messages for manual investigation
  4. Fix bug, reprocess DLQ messages back to main queue
- **Prevention**:
  - Validate messages before enqueuing (schema validation)
  - Implement comprehensive error handling in consumers
  - Log failed messages with full context for debugging

### Failure Scenario 2: Consumer Crashes Mid-Processing (Duplicate Charge)

- **Symptom**: Consumer processes payment, crashes before ACK → message reappears → double charge customer
- **Cause**: Worker crashes after calling payment API but before sending ACK (network failure, OOM, unhandled exception)
- **Solution**: Implement idempotent consumer with deduplication
  ```javascript
  async function processPayment(message) {
      const orderId = message.body.orderId;

      // Check if payment already processed (idempotency check)
      const processed = await redis.get(`payment:${orderId}`);
      if (processed) {
          console.log(`Payment ${orderId} already processed`);
          return; // ACK without duplicate charge
      }

      // Process payment
      const charge = await stripe.charges.create({
          amount: message.body.total,
          idempotency_key: orderId  // Stripe handles duplicates
      });

      // Mark as processed (24h TTL for dedup window)
      await redis.setex(`payment:${orderId}`, 86400, charge.id);
  }
  ```
- **Prevention**:
  - Always implement idempotent consumers (check before executing)
  - Use external idempotency keys (Stripe, payment processors support this)
  - Store processing state in Redis/DynamoDB with TTL

### Failure Scenario 3: Queue Backlog Explosion (Traffic Spike)

- **Symptom**: Black Friday traffic spike - queue depth grows from 100 → 1M messages, processing delay hours
- **Cause**: Producers (API) enqueuing 50k msg/s, consumers processing 5k msg/s → net +45k msg/s backlog
- **Solution**:
  1. **Auto-scale workers**: Queue depth 1M → scale to 100 workers (vs normal 10)
  2. **Priority queue**: VIP orders get `priority=10`, processed first
  3. **Backpressure**: If queue > 1M, return 503 to clients (circuit breaker)
  4. **Batch processing**: Process 10 messages per pull (vs 1)
- **Prevention**:
  - Monitor queue depth - alert at 10k, critical at 100k
  - Auto-scale based on `ApproximateNumberOfMessagesVisible / workers` (target: 100 per worker)
  - Load test for 10x traffic spike scenarios
  - Implement rate limiting on producers if queue depth critical

**CloudWatch Auto-Scale Policy:**
```hcl
target_tracking_scaling_policy {
  target_value = 100  # Target: 100 messages per worker
  metric_name  = "ApproximateNumberOfMessagesVisible"

  scale_out_cooldown = 60   # Scale up fast (1 min)
  scale_in_cooldown  = 300  # Scale down slow (5 min)
}
```

---

## Summary

### Key Takeaways

- **Queue Pattern**: Decouples producers from consumers, enables async processing, handles traffic spikes through buffering
- **Pub/Sub Pattern**: Broadcasts events to multiple independent subscribers, enables event-driven architecture
- **When to Use Queue**: Task distribution (1 message → 1 worker), background jobs, load leveling
- **When to Use Pub/Sub**: Event broadcasting (1 message → N subscribers), microservice coordination, real-time updates
- **Main Trade-off**: Eventual consistency vs immediate response, at-least-once delivery requires idempotent consumers

### Related Patterns

- **Event Sourcing**: Store all state changes as events in topic, rebuild state by replaying events
- **CQRS (Command Query Responsibility Segregation)**: Commands → Queue, Events → Pub/Sub for read model updates
- **Saga Pattern**: Distributed transactions using queue for orchestration or Pub/Sub for choreography
- **Circuit Breaker**: Stop enqueueing if queue depth exceeds threshold (backpressure)

### Interview Checklist

- [ ] Can explain Queue (1→1) vs Pub/Sub (1→N) in 2 minutes with examples
- [ ] Can draw architecture diagram showing producer, queue/topic, consumer flow
- [ ] Know 2-3 real-world examples (AWS SQS for orders, SNS for notifications, Kafka for event streaming)
- [ ] Understand failure modes (poison messages, duplicate processing, backlog explosion) and mitigations
- [ ] Can compare Queue vs Pub/Sub trade-offs and when to use each
- [ ] Know scaling strategy: Auto-scale workers based on queue depth (target: 100 messages per worker)
- [ ] Understand idempotent consumers and why they're critical (at-least-once delivery)
- [ ] Can calculate costs for AWS SQS/SNS at different scales (100M messages = $1,200/month)

---
[← Back to SystemDesign](../README.md)
