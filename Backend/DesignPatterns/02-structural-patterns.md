# Structural Design Patterns

## 🎯 Overview

Structural patterns **compose objects into larger structures** while keeping those structures flexible and efficient. They explain how to assemble objects and classes into larger structures, while keeping those structures flexible and efficient.

### When to Use Structural Patterns

| Scenario | Pattern |
|----------|---------|
| Make incompatible interfaces work together | Adapter |
| Add responsibilities dynamically | Decorator |
| Provide simplified interface to complex system | Facade |
| Control access to an object | Proxy |
| Treat individual and composite objects uniformly | Composite |
| Separate abstraction from implementation | Bridge |

---

## Adapter

### 💡 **Intent**

Convert the interface of a class into another interface clients expect. Adapter lets classes work together that couldn't otherwise because of incompatible interfaces.

### Problem It Solves

```
Without Adapter:
├── Can't use third-party library with incompatible interface
├── Legacy code doesn't match new system's expectations
├── Multiple similar services with different APIs
└── Tight coupling to specific implementations
```

### Structure

```
┌─────────────────┐         ┌─────────────────┐
│     Client      │────────▶│     Target      │
└─────────────────┘         ├─────────────────┤
                            │ + request()     │
                            └────────△────────┘
                                     │
                            ┌────────┴────────┐
                            │     Adapter     │
                            ├─────────────────┤
                            │ + request()     │───────▶ adaptee.specificRequest()
                            │ - adaptee       │
                            └─────────────────┘
                                     │
                            ┌────────┴────────┐
                            │     Adaptee     │
                            ├─────────────────┤
                            │ + specificRequest()
                            └─────────────────┘
```

### Implementation

**Payment Gateway Adapter:**

```javascript
// Target interface - what our system expects
class PaymentProcessor {
  processPayment(amount, currency, cardDetails) {
    throw new Error('processPayment must be implemented');
  }

  refund(transactionId, amount) {
    throw new Error('refund must be implemented');
  }
}

// Adaptee 1 - Stripe's actual API (incompatible interface)
class StripeAPI {
  createCharge(amountInCents, currency, source) {
    console.log(`Stripe: Charging ${amountInCents} cents ${currency}`);
    return {
      id: `ch_${Date.now()}`,
      amount: amountInCents,
      currency,
      status: 'succeeded'
    };
  }

  createRefund(chargeId, amountInCents) {
    console.log(`Stripe: Refunding ${amountInCents} cents for ${chargeId}`);
    return {
      id: `re_${Date.now()}`,
      amount: amountInCents,
      status: 'succeeded'
    };
  }
}

// Adaptee 2 - PayPal's actual API (different incompatible interface)
class PayPalAPI {
  executePayment(paymentDetails) {
    console.log(`PayPal: Processing payment of ${paymentDetails.amount}`);
    return {
      paymentId: `PAY_${Date.now()}`,
      state: 'approved',
      amount: paymentDetails.amount
    };
  }

  refundPayment(paymentId, refundAmount) {
    console.log(`PayPal: Refunding ${refundAmount} for ${paymentId}`);
    return {
      refundId: `REF_${Date.now()}`,
      state: 'completed'
    };
  }
}

// Adapter for Stripe
class StripeAdapter extends PaymentProcessor {
  constructor() {
    super();
    this.stripe = new StripeAPI();
  }

  processPayment(amount, currency, cardDetails) {
    // Convert dollars to cents (Stripe uses cents)
    const amountInCents = Math.round(amount * 100);

    // Adapt card details to Stripe's source format
    const source = this.createStripeSource(cardDetails);

    const result = this.stripe.createCharge(amountInCents, currency, source);

    // Normalize response to our system's format
    return {
      success: result.status === 'succeeded',
      transactionId: result.id,
      amount: result.amount / 100,
      provider: 'stripe'
    };
  }

  refund(transactionId, amount) {
    const amountInCents = Math.round(amount * 100);
    const result = this.stripe.createRefund(transactionId, amountInCents);

    return {
      success: result.status === 'succeeded',
      refundId: result.id,
      amount: result.amount / 100
    };
  }

  createStripeSource(cardDetails) {
    return `tok_${cardDetails.last4}`;
  }
}

// Adapter for PayPal
class PayPalAdapter extends PaymentProcessor {
  constructor() {
    super();
    this.paypal = new PayPalAPI();
  }

  processPayment(amount, currency, cardDetails) {
    // Convert to PayPal's expected format
    const paymentDetails = {
      amount: { total: amount, currency },
      payer: { payment_method: 'credit_card' }
    };

    const result = this.paypal.executePayment(paymentDetails);

    return {
      success: result.state === 'approved',
      transactionId: result.paymentId,
      amount: result.amount.total,
      provider: 'paypal'
    };
  }

  refund(transactionId, amount) {
    const result = this.paypal.refundPayment(transactionId, amount);

    return {
      success: result.state === 'completed',
      refundId: result.refundId,
      amount
    };
  }
}

// Client code - works with any adapter
class CheckoutService {
  constructor(paymentProcessor) {
    this.paymentProcessor = paymentProcessor;
  }

  checkout(cart, paymentDetails) {
    const total = cart.items.reduce((sum, item) => sum + item.price, 0);

    const result = this.paymentProcessor.processPayment(
      total,
      'USD',
      paymentDetails
    );

    if (result.success) {
      console.log(`Payment successful: ${result.transactionId}`);
      return { orderId: `ORD_${Date.now()}`, payment: result };
    }

    throw new Error('Payment failed');
  }
}

// Usage - easily swap payment providers
const stripeCheckout = new CheckoutService(new StripeAdapter());
const paypalCheckout = new CheckoutService(new PayPalAdapter());

const cart = { items: [{ name: 'Product', price: 29.99 }] };
const cardDetails = { last4: '4242' };

stripeCheckout.checkout(cart, cardDetails);
// Stripe: Charging 2999 cents USD
// Payment successful: ch_1234567890
```

**Logger Adapter:**

```typescript
// Target interface
interface Logger {
  debug(message: string, context?: object): void;
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, context?: object): void;
}

// Adaptee - Winston logger (different interface)
import winston from 'winston';

class WinstonLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'debug',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });
  }

  log(level: string, message: string, meta?: object): void {
    this.logger.log(level, message, meta);
  }
}

// Adapter
class WinstonAdapter implements Logger {
  private winston: WinstonLogger;

  constructor() {
    this.winston = new WinstonLogger();
  }

  debug(message: string, context?: object): void {
    this.winston.log('debug', message, context);
  }

  info(message: string, context?: object): void {
    this.winston.log('info', message, context);
  }

  warn(message: string, context?: object): void {
    this.winston.log('warn', message, context);
  }

  error(message: string, context?: object): void {
    this.winston.log('error', message, context);
  }
}

// Adapter for Pino (another logging library)
import pino from 'pino';

class PinoAdapter implements Logger {
  private pino: pino.Logger;

  constructor() {
    this.pino = pino();
  }

  debug(message: string, context?: object): void {
    this.pino.debug(context || {}, message);
  }

  info(message: string, context?: object): void {
    this.pino.info(context || {}, message);
  }

  warn(message: string, context?: object): void {
    this.pino.warn(context || {}, message);
  }

  error(message: string, context?: object): void {
    this.pino.error(context || {}, message);
  }
}

// Client code - works with any logger
class UserService {
  constructor(private logger: Logger) {}

  createUser(data: { name: string; email: string }) {
    this.logger.info('Creating user', { email: data.email });
    // ... create user logic
    this.logger.debug('User created successfully', { name: data.name });
  }
}

// Easy to switch logging implementations
const service = new UserService(new WinstonAdapter());
// or
const serviceWithPino = new UserService(new PinoAdapter());
```

### Pros and Cons

**Pros:**
- ✅ Single Responsibility (separate conversion logic)
- ✅ Open/Closed (add new adapters without changing client)
- ✅ Work with incompatible third-party code
- ✅ Reuse existing classes

**Cons:**
- ❌ Overall complexity increases
- ❌ Sometimes simpler to change the service class
- ❌ Extra layer of indirection

### Interview Questions

**Q: What's the difference between Adapter and Facade?**

**A:**

| Aspect | Adapter | Facade |
|--------|---------|--------|
| **Purpose** | Make interfaces compatible | Simplify complex interface |
| **Scope** | Single class adaptation | Multiple classes simplified |
| **Direction** | Wraps one interface | Wraps entire subsystem |
| **Interface** | Implements target interface | Defines new simple interface |

---

## Decorator

### 💡 **Intent**

Attach additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality.

### Problem It Solves

```
Without Decorator:
├── Class explosion with every combination of features
├── Cannot add behavior at runtime
├── Inheritance is static and inflexible
└── Violates Single Responsibility Principle
```

### Structure

```
┌─────────────────┐
│   Component     │
├─────────────────┤
│ + operation()   │
└────────△────────┘
         │
    ┌────┴────────────────────┐
    │                         │
┌───┴────────────┐    ┌───────┴──────────┐
│ConcreteComponent│    │    Decorator     │
├────────────────┤    ├──────────────────┤
│ + operation()  │    │ - component      │
└────────────────┘    │ + operation()    │
                      └────────△─────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
     ┌────────┴────────┐              ┌────────┴────────┐
     │ConcreteDecoratorA│              │ConcreteDecoratorB│
     ├─────────────────┤              ├─────────────────┤
     │ + operation()   │              │ + operation()   │
     │ + addedBehavior()│              │ + addedState   │
     └─────────────────┘              └─────────────────┘
```

### Implementation

**Express-Style Middleware:**

```javascript
// Base component
class Request {
  constructor(body, headers = {}) {
    this.body = body;
    this.headers = headers;
    this.user = null;
  }
}

class Response {
  constructor() {
    this.statusCode = 200;
    this.body = null;
    this.headers = {};
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.body = data;
    this.headers['Content-Type'] = 'application/json';
    return this;
  }
}

// Base handler
class RequestHandler {
  handle(req, res) {
    throw new Error('handle must be implemented');
  }
}

// Concrete handler
class UserCreateHandler extends RequestHandler {
  handle(req, res) {
    console.log('Creating user:', req.body);
    return res.status(201).json({ id: 1, ...req.body });
  }
}

// Decorator base class
class HandlerDecorator extends RequestHandler {
  constructor(handler) {
    super();
    this.handler = handler;
  }

  handle(req, res) {
    return this.handler.handle(req, res);
  }
}

// Concrete decorators
class LoggingDecorator extends HandlerDecorator {
  handle(req, res) {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] Request started`);

    const result = super.handle(req, res);

    console.log(`[${new Date().toISOString()}] Request completed in ${Date.now() - start}ms`);
    return result;
  }
}

class AuthenticationDecorator extends HandlerDecorator {
  handle(req, res) {
    const token = req.headers['authorization'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Simulate token verification
    req.user = { id: 1, name: 'John' };
    console.log('User authenticated:', req.user.name);

    return super.handle(req, res);
  }
}

class ValidationDecorator extends HandlerDecorator {
  constructor(handler, schema) {
    super(handler);
    this.schema = schema;
  }

  handle(req, res) {
    const errors = this.validate(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    return super.handle(req, res);
  }

  validate(body) {
    const errors = [];

    for (const [field, rules] of Object.entries(this.schema)) {
      if (rules.required && !body[field]) {
        errors.push(`${field} is required`);
      }
      if (rules.type && typeof body[field] !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
      }
    }

    return errors;
  }
}

class RateLimitDecorator extends HandlerDecorator {
  constructor(handler, limit = 100) {
    super(handler);
    this.limit = limit;
    this.requests = new Map();
  }

  handle(req, res) {
    const clientId = req.headers['x-client-id'] || 'anonymous';
    const count = this.requests.get(clientId) || 0;

    if (count >= this.limit) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    this.requests.set(clientId, count + 1);
    return super.handle(req, res);
  }
}

// Usage - compose decorators
const schema = {
  name: { required: true, type: 'string' },
  email: { required: true, type: 'string' }
};

// Stack decorators: RateLimit -> Auth -> Validation -> Logging -> Handler
let handler = new UserCreateHandler();
handler = new LoggingDecorator(handler);
handler = new ValidationDecorator(handler, schema);
handler = new AuthenticationDecorator(handler);
handler = new RateLimitDecorator(handler, 10);

// Test
const req = new Request(
  { name: 'John', email: 'john@example.com' },
  { authorization: 'Bearer token123', 'x-client-id': 'client1' }
);
const res = new Response();

handler.handle(req, res);
console.log('Response:', res.statusCode, res.body);
```

**Coffee Shop Example (Classic):**

```javascript
// Component interface
class Beverage {
  getDescription() {
    return 'Unknown Beverage';
  }

  cost() {
    throw new Error('cost must be implemented');
  }
}

// Concrete components
class Espresso extends Beverage {
  getDescription() {
    return 'Espresso';
  }

  cost() {
    return 1.99;
  }
}

class HouseBlend extends Beverage {
  getDescription() {
    return 'House Blend Coffee';
  }

  cost() {
    return 0.89;
  }
}

// Decorator base
class CondimentDecorator extends Beverage {
  constructor(beverage) {
    super();
    this.beverage = beverage;
  }
}

// Concrete decorators
class Milk extends CondimentDecorator {
  getDescription() {
    return `${this.beverage.getDescription()}, Milk`;
  }

  cost() {
    return this.beverage.cost() + 0.10;
  }
}

class Mocha extends CondimentDecorator {
  getDescription() {
    return `${this.beverage.getDescription()}, Mocha`;
  }

  cost() {
    return this.beverage.cost() + 0.20;
  }
}

class Whip extends CondimentDecorator {
  getDescription() {
    return `${this.beverage.getDescription()}, Whip`;
  }

  cost() {
    return this.beverage.cost() + 0.15;
  }
}

class Soy extends CondimentDecorator {
  getDescription() {
    return `${this.beverage.getDescription()}, Soy`;
  }

  cost() {
    return this.beverage.cost() + 0.25;
  }
}

// Usage
let beverage = new Espresso();
console.log(`${beverage.getDescription()}: $${beverage.cost()}`);
// Espresso: $1.99

// Double mocha with whip
beverage = new Whip(new Mocha(new Mocha(beverage)));
console.log(`${beverage.getDescription()}: $${beverage.cost()}`);
// Espresso, Mocha, Mocha, Whip: $2.54

// House blend with soy, mocha, and whip
let houseBlend = new Whip(new Mocha(new Soy(new HouseBlend())));
console.log(`${houseBlend.getDescription()}: $${houseBlend.cost()}`);
// House Blend Coffee, Soy, Mocha, Whip: $1.49
```

**TypeScript Stream Decorator:**

```typescript
interface DataStream {
  write(data: string): string;
  read(): string;
}

class FileStream implements DataStream {
  private content = '';

  write(data: string): string {
    this.content = data;
    return data;
  }

  read(): string {
    return this.content;
  }
}

abstract class StreamDecorator implements DataStream {
  protected stream: DataStream;

  constructor(stream: DataStream) {
    this.stream = stream;
  }

  write(data: string): string {
    return this.stream.write(data);
  }

  read(): string {
    return this.stream.read();
  }
}

class EncryptionDecorator extends StreamDecorator {
  private key: string;

  constructor(stream: DataStream, key: string) {
    super(stream);
    this.key = key;
  }

  write(data: string): string {
    const encrypted = this.encrypt(data);
    return super.write(encrypted);
  }

  read(): string {
    const data = super.read();
    return this.decrypt(data);
  }

  private encrypt(data: string): string {
    // Simple XOR encryption for demo
    return data.split('').map((char, i) =>
      String.fromCharCode(char.charCodeAt(0) ^ this.key.charCodeAt(i % this.key.length))
    ).join('');
  }

  private decrypt(data: string): string {
    return this.encrypt(data); // XOR is symmetric
  }
}

class CompressionDecorator extends StreamDecorator {
  write(data: string): string {
    const compressed = this.compress(data);
    return super.write(compressed);
  }

  read(): string {
    const data = super.read();
    return this.decompress(data);
  }

  private compress(data: string): string {
    // Simple run-length encoding for demo
    return data.replace(/(.)\1+/g, (match, char) => `${match.length}${char}`);
  }

  private decompress(data: string): string {
    return data.replace(/(\d+)(.)/g, (_, count, char) => char.repeat(parseInt(count)));
  }
}

class LoggingDecorator extends StreamDecorator {
  write(data: string): string {
    console.log(`Writing ${data.length} characters`);
    const result = super.write(data);
    console.log('Write complete');
    return result;
  }

  read(): string {
    console.log('Reading data...');
    const data = super.read();
    console.log(`Read ${data.length} characters`);
    return data;
  }
}

// Usage - stack decorators
let stream: DataStream = new FileStream();
stream = new CompressionDecorator(stream);
stream = new EncryptionDecorator(stream, 'secretkey');
stream = new LoggingDecorator(stream);

stream.write('Hello World!');
console.log(stream.read()); // Hello World!
```

### Real-World Examples

| Library/Framework | Decorator Usage |
|-------------------|-----------------|
| **Express** | Middleware chain |
| **NestJS** | `@UseGuards()`, `@UseInterceptors()` |
| **TypeScript** | Decorators (`@Injectable`, `@Controller`) |
| **Java I/O** | InputStream decorators |
| **Python** | Function decorators |

### Pros and Cons

**Pros:**
- ✅ Extend behavior without modifying original class
- ✅ Add/remove responsibilities at runtime
- ✅ Combine behaviors by stacking decorators
- ✅ Single Responsibility (each decorator one concern)

**Cons:**
- ❌ Many small objects can be hard to debug
- ❌ Order of decorators matters
- ❌ Initial configuration can be complex
- ❌ Hard to remove specific decorator from middle of stack

### Interview Questions

**Q: What's the difference between Decorator and Inheritance?**

**A:**

| Aspect | Inheritance | Decorator |
|--------|-------------|-----------|
| **Binding** | Compile-time (static) | Runtime (dynamic) |
| **Flexibility** | Fixed hierarchy | Composable |
| **Combinations** | Class explosion | Mix and match |
| **Adding behavior** | Subclass each combination | Stack decorators |

```javascript
// Inheritance: need class for each combination
class MochaEspresso extends Espresso { }
class WhipMochaEspresso extends MochaEspresso { }
class DoubleMochaWhipEspresso extends WhipMochaEspresso { }
// ... explosion of classes!

// Decorator: compose at runtime
let drink = new Espresso();
drink = new Mocha(drink);
drink = new Mocha(drink);
drink = new Whip(drink);
// Single hierarchy, infinite combinations
```

---

## Facade

### 💡 **Intent**

Provide a **unified interface** to a set of interfaces in a subsystem. Facade defines a higher-level interface that makes the subsystem easier to use.

### Problem It Solves

```
Without Facade:
├── Client code coupled to many subsystem classes
├── Complex initialization sequences
├── Hard to understand how to use the subsystem
└── Changes in subsystem ripple through client code
```

### Structure

```
┌─────────────────┐
│     Client      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Facade      │
├─────────────────┤
│ + operation()   │
└────────┬────────┘
         │
   ┌─────┴─────┬─────────────┐
   │           │             │
   ▼           ▼             ▼
┌──────┐   ┌──────┐     ┌──────┐
│ClassA│   │ClassB│     │ClassC│
└──────┘   └──────┘     └──────┘
     Subsystem classes
```

### Implementation

**Order Processing Facade:**

```javascript
// Complex subsystem classes
class InventoryService {
  checkStock(productId) {
    console.log(`Checking stock for product ${productId}`);
    return { available: true, quantity: 10 };
  }

  reserveStock(productId, quantity) {
    console.log(`Reserving ${quantity} units of product ${productId}`);
    return { reserved: true, reservationId: `RES_${Date.now()}` };
  }

  releaseStock(reservationId) {
    console.log(`Releasing reservation ${reservationId}`);
  }
}

class PaymentService {
  validateCard(cardDetails) {
    console.log('Validating card...');
    return { valid: true };
  }

  processPayment(amount, cardDetails) {
    console.log(`Processing payment of $${amount}`);
    return { success: true, transactionId: `TXN_${Date.now()}` };
  }

  refund(transactionId) {
    console.log(`Refunding transaction ${transactionId}`);
    return { success: true };
  }
}

class ShippingService {
  calculateShipping(address, items) {
    console.log('Calculating shipping...');
    return { cost: 9.99, estimatedDays: 3 };
  }

  createShipment(orderId, address, items) {
    console.log(`Creating shipment for order ${orderId}`);
    return { trackingNumber: `TRACK_${Date.now()}` };
  }
}

class NotificationService {
  sendOrderConfirmation(email, orderDetails) {
    console.log(`Sending order confirmation to ${email}`);
  }

  sendShippingNotification(email, trackingNumber) {
    console.log(`Sending shipping notification to ${email}`);
  }
}

class OrderRepository {
  save(order) {
    console.log('Saving order to database');
    return { ...order, id: `ORD_${Date.now()}` };
  }

  update(orderId, data) {
    console.log(`Updating order ${orderId}`);
  }
}

// Facade - simplifies the complex subsystem
class OrderFacade {
  constructor() {
    this.inventory = new InventoryService();
    this.payment = new PaymentService();
    this.shipping = new ShippingService();
    this.notification = new NotificationService();
    this.orderRepo = new OrderRepository();
  }

  async placeOrder(customer, items, paymentDetails) {
    try {
      console.log('\n=== Starting Order Process ===\n');

      // Step 1: Check and reserve inventory
      for (const item of items) {
        const stock = this.inventory.checkStock(item.productId);
        if (!stock.available || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
      }

      const reservations = items.map(item =>
        this.inventory.reserveStock(item.productId, item.quantity)
      );

      // Step 2: Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = this.shipping.calculateShipping(customer.address, items);
      const total = subtotal + shipping.cost;

      // Step 3: Process payment
      const cardValidation = this.payment.validateCard(paymentDetails);
      if (!cardValidation.valid) {
        reservations.forEach(r => this.inventory.releaseStock(r.reservationId));
        throw new Error('Invalid payment details');
      }

      const paymentResult = this.payment.processPayment(total, paymentDetails);
      if (!paymentResult.success) {
        reservations.forEach(r => this.inventory.releaseStock(r.reservationId));
        throw new Error('Payment failed');
      }

      // Step 4: Create order
      const order = this.orderRepo.save({
        customer,
        items,
        subtotal,
        shippingCost: shipping.cost,
        total,
        transactionId: paymentResult.transactionId,
        status: 'confirmed'
      });

      // Step 5: Create shipment
      const shipment = this.shipping.createShipment(
        order.id,
        customer.address,
        items
      );

      // Step 6: Update order with tracking
      this.orderRepo.update(order.id, {
        trackingNumber: shipment.trackingNumber,
        status: 'shipped'
      });

      // Step 7: Send notifications
      this.notification.sendOrderConfirmation(customer.email, order);
      this.notification.sendShippingNotification(customer.email, shipment.trackingNumber);

      console.log('\n=== Order Complete ===\n');

      return {
        orderId: order.id,
        total,
        trackingNumber: shipment.trackingNumber,
        estimatedDelivery: shipping.estimatedDays
      };

    } catch (error) {
      console.error('Order failed:', error.message);
      throw error;
    }
  }

  // Additional simplified methods
  async cancelOrder(orderId) {
    // Simplified cancellation logic
    console.log(`Cancelling order ${orderId}`);
  }

  async trackOrder(orderId) {
    // Simplified tracking
    console.log(`Tracking order ${orderId}`);
  }
}

// Client code - simple interface
const orderFacade = new OrderFacade();

const result = await orderFacade.placeOrder(
  {
    name: 'John Doe',
    email: 'john@example.com',
    address: '123 Main St, NYC'
  },
  [
    { productId: 'PROD_1', quantity: 2, price: 29.99 },
    { productId: 'PROD_2', quantity: 1, price: 49.99 }
  ],
  { cardNumber: '4242424242424242', expiry: '12/25' }
);

console.log('Order result:', result);
```

**Video Conversion Facade:**

```typescript
// Complex subsystem
class VideoFile {
  constructor(public filename: string) {}
}

class CodecFactory {
  extract(file: VideoFile): string {
    const extension = file.filename.split('.').pop();
    console.log(`Extracting ${extension} codec`);
    return extension || 'unknown';
  }
}

class BitrateReader {
  read(filename: string, codec: string): string {
    console.log(`Reading bitrate for ${filename} using ${codec}`);
    return 'bitrate_data';
  }

  convert(buffer: string, codec: string): string {
    console.log(`Converting buffer with ${codec}`);
    return 'converted_data';
  }
}

class AudioMixer {
  fix(result: string): string {
    console.log('Fixing audio...');
    return result + '_audio_fixed';
  }
}

class VideoConverter {
  convert(buffer: string, format: string): string {
    console.log(`Converting to ${format} format`);
    return `${buffer}_${format}`;
  }
}

class FileWriter {
  write(data: string, filename: string): void {
    console.log(`Writing to ${filename}`);
  }
}

// Facade
class VideoConversionFacade {
  private codecFactory = new CodecFactory();
  private bitrateReader = new BitrateReader();
  private audioMixer = new AudioMixer();
  private videoConverter = new VideoConverter();
  private fileWriter = new FileWriter();

  convertVideo(filename: string, format: string): string {
    console.log(`\nStarting conversion of ${filename} to ${format}...\n`);

    const file = new VideoFile(filename);
    const sourceCodec = this.codecFactory.extract(file);

    let buffer = this.bitrateReader.read(filename, sourceCodec);
    buffer = this.bitrateReader.convert(buffer, format);
    buffer = this.audioMixer.fix(buffer);

    const result = this.videoConverter.convert(buffer, format);

    const outputFilename = filename.replace(/\.[^/.]+$/, `.${format}`);
    this.fileWriter.write(result, outputFilename);

    console.log(`\nConversion complete: ${outputFilename}\n`);

    return outputFilename;
  }
}

// Client code - one simple call
const converter = new VideoConversionFacade();
converter.convertVideo('movie.ogg', 'mp4');
```

### Real-World Examples

| Library/Framework | Facade Usage |
|-------------------|--------------|
| **jQuery** | `$()` - DOM manipulation facade |
| **Mongoose** | `Model.find()` - MongoDB query facade |
| **Express** | `app.listen()` - HTTP server facade |
| **AWS SDK** | High-level clients for services |

### Pros and Cons

**Pros:**
- ✅ Isolates clients from subsystem complexity
- ✅ Promotes weak coupling
- ✅ Doesn't prevent direct subsystem access if needed
- ✅ Single entry point for common operations

**Cons:**
- ❌ Can become a "god object" if not careful
- ❌ May hide useful subsystem features
- ❌ Additional layer of abstraction

---

## Proxy

### 💡 **Intent**

Provide a **surrogate or placeholder** for another object to control access to it.

### Problem It Solves

```
Without Proxy:
├── No access control to objects
├── No lazy initialization for expensive objects
├── No caching for repeated operations
├── No logging/auditing of object access
```

### Types of Proxies

| Type | Purpose | Example |
|------|---------|---------|
| **Virtual Proxy** | Lazy initialization | Load image on demand |
| **Protection Proxy** | Access control | Check permissions |
| **Caching Proxy** | Cache results | Memoize API calls |
| **Logging Proxy** | Audit access | Log method calls |
| **Remote Proxy** | Access remote object | RPC calls |

### Implementation

**Caching Proxy:**

```javascript
// Real subject
class WeatherAPI {
  async getWeather(city) {
    console.log(`[API] Fetching weather for ${city}...`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      city,
      temperature: Math.round(Math.random() * 30),
      condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
      fetchedAt: new Date().toISOString()
    };
  }
}

// Caching Proxy
class WeatherAPIProxy {
  constructor(ttlMs = 60000) {
    this.api = new WeatherAPI();
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  async getWeather(city) {
    const cached = this.cache.get(city);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log(`[Cache] Returning cached weather for ${city}`);
      return cached.data;
    }

    const data = await this.api.getWeather(city);

    this.cache.set(city, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  clearCache() {
    this.cache.clear();
    console.log('[Cache] Cleared');
  }
}

// Usage
const weatherService = new WeatherAPIProxy(30000); // 30 second TTL

// First call - hits API
console.log(await weatherService.getWeather('London'));
// [API] Fetching weather for London...
// { city: 'London', temperature: 22, ... }

// Second call - returns cached
console.log(await weatherService.getWeather('London'));
// [Cache] Returning cached weather for London
// { city: 'London', temperature: 22, ... }
```

**Protection Proxy:**

```typescript
interface UserService {
  getUser(id: string): User | null;
  updateUser(id: string, data: Partial<User>): User;
  deleteUser(id: string): void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface RequestContext {
  user: User;
}

// Real service
class RealUserService implements UserService {
  private users = new Map<string, User>();

  constructor() {
    // Seed data
    this.users.set('1', { id: '1', name: 'John', email: 'john@example.com', role: 'user' });
    this.users.set('2', { id: '2', name: 'Admin', email: 'admin@example.com', role: 'admin' });
  }

  getUser(id: string): User | null {
    return this.users.get(id) || null;
  }

  updateUser(id: string, data: Partial<User>): User {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');

    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  deleteUser(id: string): void {
    this.users.delete(id);
  }
}

// Protection Proxy
class UserServiceProxy implements UserService {
  private service: RealUserService;
  private context: RequestContext;

  constructor(context: RequestContext) {
    this.service = new RealUserService();
    this.context = context;
  }

  getUser(id: string): User | null {
    // Anyone can read
    return this.service.getUser(id);
  }

  updateUser(id: string, data: Partial<User>): User {
    // Users can only update themselves, admins can update anyone
    if (this.context.user.role !== 'admin' && this.context.user.id !== id) {
      throw new Error('Access denied: Cannot update other users');
    }

    // Only admins can change roles
    if (data.role && this.context.user.role !== 'admin') {
      throw new Error('Access denied: Cannot change user role');
    }

    console.log(`[Audit] User ${this.context.user.id} updating user ${id}`);
    return this.service.updateUser(id, data);
  }

  deleteUser(id: string): void {
    // Only admins can delete
    if (this.context.user.role !== 'admin') {
      throw new Error('Access denied: Admin required');
    }

    console.log(`[Audit] Admin ${this.context.user.id} deleting user ${id}`);
    this.service.deleteUser(id);
  }
}

// Usage
const adminContext: RequestContext = {
  user: { id: '2', name: 'Admin', email: 'admin@example.com', role: 'admin' }
};

const userContext: RequestContext = {
  user: { id: '1', name: 'John', email: 'john@example.com', role: 'user' }
};

const adminService = new UserServiceProxy(adminContext);
const userService = new UserServiceProxy(userContext);

// Admin can do anything
adminService.updateUser('1', { name: 'John Doe' }); // ✅ Works
adminService.deleteUser('1'); // ✅ Works

// User has restrictions
userService.updateUser('1', { name: 'Johnny' }); // ✅ Works (own profile)
userService.updateUser('2', { name: 'Hacked' }); // ❌ Access denied
userService.deleteUser('2'); // ❌ Access denied
```

**Virtual Proxy (Lazy Loading):**

```javascript
// Heavy object
class LargeDocument {
  constructor(id) {
    this.id = id;
    this.content = null;
    this.loadContent();
  }

  loadContent() {
    console.log(`Loading document ${this.id}... (expensive operation)`);
    // Simulate loading large content
    this.content = `Large content for document ${this.id}`.repeat(1000);
    console.log(`Document ${this.id} loaded (${this.content.length} chars)`);
  }

  getContent() {
    return this.content;
  }

  getPreview() {
    return this.content.substring(0, 100);
  }
}

// Virtual Proxy - delays loading until needed
class DocumentProxy {
  constructor(id) {
    this.id = id;
    this.document = null;
  }

  // Lazy initialization
  getDocument() {
    if (!this.document) {
      this.document = new LargeDocument(this.id);
    }
    return this.document;
  }

  getContent() {
    return this.getDocument().getContent();
  }

  getPreview() {
    return this.getDocument().getPreview();
  }

  // Cheap operation - no loading needed
  getId() {
    return this.id;
  }
}

// Document list with proxies
class DocumentLibrary {
  constructor() {
    this.documents = [];
  }

  addDocument(id) {
    // Create proxy instead of real document
    this.documents.push(new DocumentProxy(id));
  }

  // List documents without loading content
  listDocuments() {
    return this.documents.map(doc => doc.getId());
  }

  // Only loads the specific document when accessed
  openDocument(id) {
    const doc = this.documents.find(d => d.getId() === id);
    if (doc) {
      return doc.getContent(); // Triggers lazy load
    }
    return null;
  }
}

// Usage
const library = new DocumentLibrary();

// Adding documents doesn't load them
library.addDocument('doc1');
library.addDocument('doc2');
library.addDocument('doc3');
console.log('Documents added (not loaded yet)');

// Listing is cheap
console.log('Library:', library.listDocuments());
// Library: ['doc1', 'doc2', 'doc3']

// Only doc1 gets loaded when opened
console.log('\nOpening doc1:');
library.openDocument('doc1');
// Loading document doc1... (expensive operation)
// Document doc1 loaded (35000 chars)
```

**JavaScript Proxy Object:**

```javascript
// Using JavaScript's built-in Proxy
const createLoggingProxy = (target, name) => {
  return new Proxy(target, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (typeof value === 'function') {
        return function (...args) {
          console.log(`[${name}] Calling ${String(property)} with:`, args);
          const result = value.apply(target, args);
          console.log(`[${name}] ${String(property)} returned:`, result);
          return result;
        };
      }

      console.log(`[${name}] Getting ${String(property)}:`, value);
      return value;
    },

    set(target, property, value, receiver) {
      console.log(`[${name}] Setting ${String(property)} to:`, value);
      return Reflect.set(target, property, value, receiver);
    }
  });
};

// Usage
const user = {
  name: 'John',
  age: 30,
  greet() {
    return `Hello, I'm ${this.name}`;
  }
};

const proxiedUser = createLoggingProxy(user, 'User');

proxiedUser.name;          // [User] Getting name: John
proxiedUser.age = 31;      // [User] Setting age to: 31
proxiedUser.greet();       // [User] Calling greet with: []
                           // [User] greet returned: Hello, I'm John
```

### Pros and Cons

**Pros:**
- ✅ Control access without changing real object
- ✅ Manage lifecycle of heavy objects
- ✅ Works even if real object isn't ready
- ✅ Open/Closed Principle

**Cons:**
- ❌ Response may be delayed
- ❌ Code complexity increases
- ❌ Can hide the real object's interface

---

## Composite

### 💡 **Intent**

Compose objects into **tree structures** to represent part-whole hierarchies. Composite lets clients treat individual objects and compositions uniformly.

### Implementation

**File System:**

```javascript
// Component
class FileSystemItem {
  constructor(name) {
    this.name = name;
  }

  getSize() {
    throw new Error('getSize must be implemented');
  }

  print(indent = '') {
    throw new Error('print must be implemented');
  }
}

// Leaf
class File extends FileSystemItem {
  constructor(name, size) {
    super(name);
    this.size = size;
  }

  getSize() {
    return this.size;
  }

  print(indent = '') {
    console.log(`${indent}📄 ${this.name} (${this.size} bytes)`);
  }
}

// Composite
class Directory extends FileSystemItem {
  constructor(name) {
    super(name);
    this.children = [];
  }

  add(item) {
    this.children.push(item);
    return this;
  }

  remove(item) {
    const index = this.children.indexOf(item);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    return this;
  }

  getSize() {
    return this.children.reduce((total, child) => total + child.getSize(), 0);
  }

  print(indent = '') {
    console.log(`${indent}📁 ${this.name}/ (${this.getSize()} bytes)`);
    this.children.forEach(child => child.print(indent + '  '));
  }
}

// Usage
const root = new Directory('root')
  .add(new File('readme.md', 1024))
  .add(new File('.gitignore', 256))
  .add(
    new Directory('src')
      .add(new File('index.js', 2048))
      .add(new File('app.js', 4096))
      .add(
        new Directory('components')
          .add(new File('Button.js', 512))
          .add(new File('Input.js', 768))
      )
  )
  .add(
    new Directory('tests')
      .add(new File('app.test.js', 1536))
  );

root.print();
// 📁 root/ (10240 bytes)
//   📄 readme.md (1024 bytes)
//   📄 .gitignore (256 bytes)
//   📁 src/ (7424 bytes)
//     📄 index.js (2048 bytes)
//     📄 app.js (4096 bytes)
//     📁 components/ (1280 bytes)
//       📄 Button.js (512 bytes)
//       📄 Input.js (768 bytes)
//   📁 tests/ (1536 bytes)
//     📄 app.test.js (1536 bytes)

console.log('Total size:', root.getSize(), 'bytes');
```

---

## Bridge

### 💡 **Intent**

Decouple an **abstraction from its implementation** so that the two can vary independently.

### Implementation

```typescript
// Implementation interface
interface MessageSender {
  send(message: string, recipient: string): void;
}

// Concrete implementations
class EmailSender implements MessageSender {
  send(message: string, recipient: string): void {
    console.log(`Email to ${recipient}: ${message}`);
  }
}

class SMSSender implements MessageSender {
  send(message: string, recipient: string): void {
    console.log(`SMS to ${recipient}: ${message}`);
  }
}

class SlackSender implements MessageSender {
  send(message: string, recipient: string): void {
    console.log(`Slack to ${recipient}: ${message}`);
  }
}

// Abstraction
abstract class Notification {
  constructor(protected sender: MessageSender) {}

  abstract notify(recipient: string): void;
}

// Refined abstractions
class AlertNotification extends Notification {
  constructor(sender: MessageSender, private alertMessage: string) {
    super(sender);
  }

  notify(recipient: string): void {
    this.sender.send(`🚨 ALERT: ${this.alertMessage}`, recipient);
  }
}

class ReminderNotification extends Notification {
  constructor(sender: MessageSender, private reminderMessage: string) {
    super(sender);
  }

  notify(recipient: string): void {
    this.sender.send(`⏰ Reminder: ${this.reminderMessage}`, recipient);
  }
}

// Usage - combine any abstraction with any implementation
const emailAlert = new AlertNotification(new EmailSender(), 'Server is down!');
const smsReminder = new ReminderNotification(new SMSSender(), 'Meeting at 3 PM');
const slackAlert = new AlertNotification(new SlackSender(), 'Deployment failed');

emailAlert.notify('admin@example.com');    // Email to admin@example.com: 🚨 ALERT: Server is down!
smsReminder.notify('+1234567890');          // SMS to +1234567890: ⏰ Reminder: Meeting at 3 PM
slackAlert.notify('@devops-team');          // Slack to @devops-team: 🚨 ALERT: Deployment failed
```

---

## Summary: Choosing the Right Structural Pattern

| Need | Pattern | Key Idea |
|------|---------|----------|
| Make interfaces compatible | **Adapter** | Wrap incompatible interface |
| Add behavior dynamically | **Decorator** | Wrap and enhance |
| Simplify complex subsystem | **Facade** | Unified simple interface |
| Control object access | **Proxy** | Surrogate with same interface |
| Tree structures | **Composite** | Uniform leaf/composite treatment |
| Separate abstraction/implementation | **Bridge** | Two hierarchies |

### Quick Decision Guide

```
"I need to..."

├── Use a class with incompatible interface
│   └── Adapter
│
├── Add features without changing class
│   └── Decorator
│
├── Simplify a complex API
│   └── Facade
│
├── Control access (lazy load, cache, auth)
│   └── Proxy
│
├── Work with tree-like structures
│   └── Composite
│
└── Allow abstraction and implementation to vary
    └── Bridge
```

---

**Next:** [Behavioral Patterns →](./03-behavioral-patterns.md)

---

[← Creational Patterns](./01-creational-patterns.md) | [Back to Design Patterns](./README.md)
