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

```typescript
interface CardDetails {
  last4: string;
  expiry?: string;
  cardNumber?: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  provider: string;
}

interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
}

// Target interface - what our system expects
abstract class PaymentProcessor {
  abstract processPayment(amount: number, currency: string, cardDetails: CardDetails): PaymentResponse;
  abstract refund(transactionId: string, amount: number): RefundResponse;
}

// Adaptee 1 - Stripe's actual API (incompatible interface)
interface StripeChargeResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface StripeRefundResult {
  id: string;
  amount: number;
  status: string;
}

class StripeAPI {
  createCharge(amountInCents: number, currency: string, source: string): StripeChargeResult {
    console.log(`Stripe: Charging ${amountInCents} cents ${currency}`);
    return {
      id: `ch_${Date.now()}`,
      amount: amountInCents,
      currency,
      status: 'succeeded'
    };
  }

  createRefund(chargeId: string, amountInCents: number): StripeRefundResult {
    console.log(`Stripe: Refunding ${amountInCents} cents for ${chargeId}`);
    return {
      id: `re_${Date.now()}`,
      amount: amountInCents,
      status: 'succeeded'
    };
  }
}

// Adaptee 2 - PayPal's actual API (different incompatible interface)
interface PayPalPaymentDetails {
  amount: { total: number; currency: string };
  payer: { payment_method: string };
}

interface PayPalPaymentResult {
  paymentId: string;
  state: string;
  amount: { total: number };
}

interface PayPalRefundResult {
  refundId: string;
  state: string;
}

class PayPalAPI {
  executePayment(paymentDetails: PayPalPaymentDetails): PayPalPaymentResult {
    console.log(`PayPal: Processing payment of ${paymentDetails.amount.total}`);
    return {
      paymentId: `PAY_${Date.now()}`,
      state: 'approved',
      amount: paymentDetails.amount
    };
  }

  refundPayment(paymentId: string, refundAmount: number): PayPalRefundResult {
    console.log(`PayPal: Refunding ${refundAmount} for ${paymentId}`);
    return {
      refundId: `REF_${Date.now()}`,
      state: 'completed'
    };
  }
}

// Adapter for Stripe
class StripeAdapter extends PaymentProcessor {
  private stripe: StripeAPI;

  constructor() {
    super();
    this.stripe = new StripeAPI();
  }

  processPayment(amount: number, currency: string, cardDetails: CardDetails): PaymentResponse {
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

  refund(transactionId: string, amount: number): RefundResponse {
    const amountInCents = Math.round(amount * 100);
    const result = this.stripe.createRefund(transactionId, amountInCents);

    return {
      success: result.status === 'succeeded',
      refundId: result.id,
      amount: result.amount / 100
    };
  }

  private createStripeSource(cardDetails: CardDetails): string {
    return `tok_${cardDetails.last4}`;
  }
}

// Adapter for PayPal
class PayPalAdapter extends PaymentProcessor {
  private paypal: PayPalAPI;

  constructor() {
    super();
    this.paypal = new PayPalAPI();
  }

  processPayment(amount: number, currency: string, cardDetails: CardDetails): PaymentResponse {
    // Convert to PayPal's expected format
    const paymentDetails: PayPalPaymentDetails = {
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

  refund(transactionId: string, amount: number): RefundResponse {
    const result = this.paypal.refundPayment(transactionId, amount);

    return {
      success: result.state === 'completed',
      refundId: result.refundId,
      amount
    };
  }
}

// Client code - works with any adapter
interface CartItem {
  name: string;
  price: number;
}

interface Cart {
  items: CartItem[];
}

interface CheckoutResult {
  orderId: string;
  payment: PaymentResponse;
}

class CheckoutService {
  private paymentProcessor: PaymentProcessor;

  constructor(paymentProcessor: PaymentProcessor) {
    this.paymentProcessor = paymentProcessor;
  }

  checkout(cart: Cart, paymentDetails: CardDetails): CheckoutResult {
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

const cart: Cart = { items: [{ name: 'Product', price: 29.99 }] };
const cardDetails: CardDetails = { last4: '4242' };

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

  createUser(data: { name: string; email: string }): void {
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

```typescript
interface RequestUser {
  id: number;
  name: string;
}

interface RequestBody {
  [key: string]: unknown;
}

interface RequestHeaders {
  authorization?: string;
  'x-client-id'?: string;
  [key: string]: string | undefined;
}

// Base component types
class Request {
  public body: RequestBody;
  public headers: RequestHeaders;
  public user: RequestUser | null;

  constructor(body: RequestBody, headers: RequestHeaders = {}) {
    this.body = body;
    this.headers = headers;
    this.user = null;
  }
}

class Response {
  public statusCode: number = 200;
  public body: unknown = null;
  public headers: Record<string, string> = {};

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(data: unknown): this {
    this.body = data;
    this.headers['Content-Type'] = 'application/json';
    return this;
  }
}

// Base handler
abstract class RequestHandler {
  abstract handle(req: Request, res: Response): Response | null;
}

// Concrete handler
class UserCreateHandler extends RequestHandler {
  handle(req: Request, res: Response): Response {
    console.log('Creating user:', req.body);
    return res.status(201).json({ id: 1, ...req.body });
  }
}

// Decorator base class
class HandlerDecorator extends RequestHandler {
  protected handler: RequestHandler;

  constructor(handler: RequestHandler) {
    super();
    this.handler = handler;
  }

  handle(req: Request, res: Response): Response | null {
    return this.handler.handle(req, res);
  }
}

// Concrete decorators
class LoggingDecorator extends HandlerDecorator {
  handle(req: Request, res: Response): Response | null {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] Request started`);

    const result = super.handle(req, res);

    console.log(`[${new Date().toISOString()}] Request completed in ${Date.now() - start}ms`);
    return result;
  }
}

class AuthenticationDecorator extends HandlerDecorator {
  handle(req: Request, res: Response): Response | null {
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

interface ValidationRule {
  required?: boolean;
  type?: string;
}

interface ValidationSchema {
  [field: string]: ValidationRule;
}

class ValidationDecorator extends HandlerDecorator {
  private schema: ValidationSchema;

  constructor(handler: RequestHandler, schema: ValidationSchema) {
    super(handler);
    this.schema = schema;
  }

  handle(req: Request, res: Response): Response | null {
    const errors = this.validate(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    return super.handle(req, res);
  }

  private validate(body: RequestBody): string[] {
    const errors: string[] = [];

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
  private limit: number;
  private requests: Map<string, number>;

  constructor(handler: RequestHandler, limit: number = 100) {
    super(handler);
    this.limit = limit;
    this.requests = new Map();
  }

  handle(req: Request, res: Response): Response | null {
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
const schema: ValidationSchema = {
  name: { required: true, type: 'string' },
  email: { required: true, type: 'string' }
};

// Stack decorators: RateLimit -> Auth -> Validation -> Logging -> Handler
let handler: RequestHandler = new UserCreateHandler();
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

```typescript
// Component interface
abstract class Beverage {
  abstract getDescription(): string;
  abstract cost(): number;
}

// Concrete components
class Espresso extends Beverage {
  getDescription(): string {
    return 'Espresso';
  }

  cost(): number {
    return 1.99;
  }
}

class HouseBlend extends Beverage {
  getDescription(): string {
    return 'House Blend Coffee';
  }

  cost(): number {
    return 0.89;
  }
}

// Decorator base
abstract class CondimentDecorator extends Beverage {
  protected beverage: Beverage;

  constructor(beverage: Beverage) {
    super();
    this.beverage = beverage;
  }
}

// Concrete decorators
class Milk extends CondimentDecorator {
  getDescription(): string {
    return `${this.beverage.getDescription()}, Milk`;
  }

  cost(): number {
    return this.beverage.cost() + 0.10;
  }
}

class Mocha extends CondimentDecorator {
  getDescription(): string {
    return `${this.beverage.getDescription()}, Mocha`;
  }

  cost(): number {
    return this.beverage.cost() + 0.20;
  }
}

class Whip extends CondimentDecorator {
  getDescription(): string {
    return `${this.beverage.getDescription()}, Whip`;
  }

  cost(): number {
    return this.beverage.cost() + 0.15;
  }
}

class Soy extends CondimentDecorator {
  getDescription(): string {
    return `${this.beverage.getDescription()}, Soy`;
  }

  cost(): number {
    return this.beverage.cost() + 0.25;
  }
}

// Usage
let beverage: Beverage = new Espresso();
console.log(`${beverage.getDescription()}: $${beverage.cost()}`);
// Espresso: $1.99

// Double mocha with whip
beverage = new Whip(new Mocha(new Mocha(beverage)));
console.log(`${beverage.getDescription()}: $${beverage.cost()}`);
// Espresso, Mocha, Mocha, Whip: $2.54

// House blend with soy, mocha, and whip
let houseBlend: Beverage = new Whip(new Mocha(new Soy(new HouseBlend())));
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

```typescript
// Inheritance: need class for each combination
class MochaEspresso extends Espresso { getDescription() { return 'Mocha Espresso'; } cost() { return 2.19; } }
class WhipMochaEspresso extends Mocha { getDescription() { return 'Whip Mocha Espresso'; } cost() { return 2.34; } }
// ... explosion of classes!

// Decorator: compose at runtime
let drink: Beverage = new Espresso();
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

```typescript
interface StockCheckResult {
  available: boolean;
  quantity: number;
}

interface ReservationResult {
  reserved: boolean;
  reservationId: string;
}

interface ShippingCost {
  cost: number;
  estimatedDays: number;
}

interface ShipmentResult {
  trackingNumber: string;
}

interface CardPaymentDetails {
  cardNumber: string;
  expiry: string;
}

interface TransactionResult {
  success: boolean;
  transactionId: string;
}

interface RefundResult {
  success: boolean;
}

// Complex subsystem classes
class InventoryService {
  checkStock(productId: string): StockCheckResult {
    console.log(`Checking stock for product ${productId}`);
    return { available: true, quantity: 10 };
  }

  reserveStock(productId: string, quantity: number): ReservationResult {
    console.log(`Reserving ${quantity} units of product ${productId}`);
    return { reserved: true, reservationId: `RES_${Date.now()}` };
  }

  releaseStock(reservationId: string): void {
    console.log(`Releasing reservation ${reservationId}`);
  }
}

class PaymentService {
  validateCard(cardDetails: CardPaymentDetails): { valid: boolean } {
    console.log('Validating card...');
    return { valid: true };
  }

  processPayment(amount: number, cardDetails: CardPaymentDetails): TransactionResult {
    console.log(`Processing payment of $${amount}`);
    return { success: true, transactionId: `TXN_${Date.now()}` };
  }

  refund(transactionId: string): RefundResult {
    console.log(`Refunding transaction ${transactionId}`);
    return { success: true };
  }
}

class ShippingService {
  calculateShipping(address: string, items: OrderItem[]): ShippingCost {
    console.log('Calculating shipping...');
    return { cost: 9.99, estimatedDays: 3 };
  }

  createShipment(orderId: string, address: string, items: OrderItem[]): ShipmentResult {
    console.log(`Creating shipment for order ${orderId}`);
    return { trackingNumber: `TRACK_${Date.now()}` };
  }
}

class NotificationService {
  sendOrderConfirmation(email: string, orderDetails: unknown): void {
    console.log(`Sending order confirmation to ${email}`);
  }

  sendShippingNotification(email: string, trackingNumber: string): void {
    console.log(`Sending shipping notification to ${email}`);
  }
}

interface SavedOrder {
  id: string;
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  transactionId: string;
  status: string;
  trackingNumber?: string;
}

class OrderRepository {
  save(order: Omit<SavedOrder, 'id'>): SavedOrder {
    console.log('Saving order to database');
    return { ...order, id: `ORD_${Date.now()}` };
  }

  update(orderId: string, data: Partial<SavedOrder>): void {
    console.log(`Updating order ${orderId}`);
  }
}

interface Customer {
  name: string;
  email: string;
  address: string;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

interface OrderResult {
  orderId: string;
  total: number;
  trackingNumber: string;
  estimatedDelivery: number;
}

// Facade - simplifies the complex subsystem
class OrderFacade {
  private inventory: InventoryService;
  private payment: PaymentService;
  private shipping: ShippingService;
  private notification: NotificationService;
  private orderRepo: OrderRepository;

  constructor() {
    this.inventory = new InventoryService();
    this.payment = new PaymentService();
    this.shipping = new ShippingService();
    this.notification = new NotificationService();
    this.orderRepo = new OrderRepository();
  }

  async placeOrder(customer: Customer, items: OrderItem[], paymentDetails: CardPaymentDetails): Promise<OrderResult> {
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
      const shippingInfo = this.shipping.calculateShipping(customer.address, items);
      const total = subtotal + shippingInfo.cost;

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
        shippingCost: shippingInfo.cost,
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
        estimatedDelivery: shippingInfo.estimatedDays
      };

    } catch (error) {
      console.error('Order failed:', (error as Error).message);
      throw error;
    }
  }

  // Additional simplified methods
  async cancelOrder(orderId: string): Promise<void> {
    // Simplified cancellation logic
    console.log(`Cancelling order ${orderId}`);
  }

  async trackOrder(orderId: string): Promise<void> {
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

```typescript
interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  fetchedAt: string;
}

interface CachedEntry {
  data: WeatherData;
  timestamp: number;
}

// Real subject
class WeatherAPI {
  async getWeather(city: string): Promise<WeatherData> {
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
  private api: WeatherAPI;
  private cache: Map<string, CachedEntry>;
  private ttl: number;

  constructor(ttlMs: number = 60000) {
    this.api = new WeatherAPI();
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  async getWeather(city: string): Promise<WeatherData> {
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

  clearCache(): void {
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

```typescript
// Heavy object
class LargeDocument {
  public id: string;
  private content: string | null = null;

  constructor(id: string) {
    this.id = id;
    this.loadContent();
  }

  private loadContent(): void {
    console.log(`Loading document ${this.id}... (expensive operation)`);
    // Simulate loading large content
    this.content = `Large content for document ${this.id}`.repeat(1000);
    console.log(`Document ${this.id} loaded (${this.content.length} chars)`);
  }

  getContent(): string {
    return this.content ?? '';
  }

  getPreview(): string {
    return (this.content ?? '').substring(0, 100);
  }
}

// Virtual Proxy - delays loading until needed
class DocumentProxy {
  private id: string;
  private document: LargeDocument | null = null;

  constructor(id: string) {
    this.id = id;
  }

  // Lazy initialization
  private getDocument(): LargeDocument {
    if (!this.document) {
      this.document = new LargeDocument(this.id);
    }
    return this.document;
  }

  getContent(): string {
    return this.getDocument().getContent();
  }

  getPreview(): string {
    return this.getDocument().getPreview();
  }

  // Cheap operation - no loading needed
  getId(): string {
    return this.id;
  }
}

// Document list with proxies
class DocumentLibrary {
  private documents: DocumentProxy[] = [];

  addDocument(id: string): void {
    // Create proxy instead of real document
    this.documents.push(new DocumentProxy(id));
  }

  // List documents without loading content
  listDocuments(): string[] {
    return this.documents.map(doc => doc.getId());
  }

  // Only loads the specific document when accessed
  openDocument(id: string): string | null {
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

**TypeScript Proxy Object:**

```typescript
// Using TypeScript's built-in Proxy
function createLoggingProxy<T extends object>(target: T, name: string): T {
  return new Proxy(target, {
    get(target: T, property: string | symbol, receiver: unknown): unknown {
      const value = Reflect.get(target, property, receiver);

      if (typeof value === 'function') {
        return function (...args: unknown[]): unknown {
          console.log(`[${name}] Calling ${String(property)} with:`, args);
          const result = (value as Function).apply(target, args);
          console.log(`[${name}] ${String(property)} returned:`, result);
          return result;
        };
      }

      console.log(`[${name}] Getting ${String(property)}:`, value);
      return value;
    },

    set(target: T, property: string | symbol, value: unknown, receiver: unknown): boolean {
      console.log(`[${name}] Setting ${String(property)} to:`, value);
      return Reflect.set(target, property, value, receiver);
    }
  });
}

// Usage
interface UserObject {
  name: string;
  age: number;
  greet(): string;
}

const user: UserObject = {
  name: 'John',
  age: 30,
  greet(): string {
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

```typescript
// Component
abstract class FileSystemItem {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract getSize(): number;
  abstract print(indent?: string): void;
}

// Leaf
class File extends FileSystemItem {
  private size: number;

  constructor(name: string, size: number) {
    super(name);
    this.size = size;
  }

  getSize(): number {
    return this.size;
  }

  print(indent: string = ''): void {
    console.log(`${indent}📄 ${this.name} (${this.size} bytes)`);
  }
}

// Composite
class Directory extends FileSystemItem {
  private children: FileSystemItem[] = [];

  constructor(name: string) {
    super(name);
  }

  add(item: FileSystemItem): this {
    this.children.push(item);
    return this;
  }

  remove(item: FileSystemItem): this {
    const index = this.children.indexOf(item);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    return this;
  }

  getSize(): number {
    return this.children.reduce((total, child) => total + child.getSize(), 0);
  }

  print(indent: string = ''): void {
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
