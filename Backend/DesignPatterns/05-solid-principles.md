# SOLID Principles

## 🎯 Overview

SOLID is an acronym for five design principles intended to make software designs more **understandable, flexible, and maintainable**. These principles were introduced by Robert C. Martin (Uncle Bob) and are fundamental to object-oriented design.

### The SOLID Acronym

| Letter | Principle | One-Liner |
|--------|-----------|-----------|
| **S** | Single Responsibility | One class, one reason to change |
| **O** | Open/Closed | Open for extension, closed for modification |
| **L** | Liskov Substitution | Subtypes must be substitutable for base types |
| **I** | Interface Segregation | Many specific interfaces over one general |
| **D** | Dependency Inversion | Depend on abstractions, not concretions |

---

## Single Responsibility Principle (SRP)

### 💡 **Definition**

> A class should have **one, and only one, reason to change**.

This means each class should have only one responsibility or job. If a class has multiple responsibilities, changes to one responsibility may affect the other.

### Problem Without SRP

```typescript
// ❌ Bad: Class has multiple responsibilities
class User {
  private name: string;
  private email: string;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }

  // Responsibility 1: User data management
  getName(): string { return this.name; }
  getEmail(): string { return this.email; }

  // Responsibility 2: Database operations
  save(): void {
    const sql = `INSERT INTO users (name, email) VALUES ('${this.name}', '${this.email}')`;
    database.execute(sql);
  }

  // Responsibility 3: Email operations
  sendWelcomeEmail(): void {
    emailService.send(this.email, 'Welcome!', 'Welcome to our platform');
  }

  // Responsibility 4: Validation
  validate(): void {
    if (!this.name) throw new Error('Name required');
    if (!this.email.includes('@')) throw new Error('Invalid email');
  }

  // Responsibility 5: Formatting
  toJSON(): string {
    return JSON.stringify({ name: this.name, email: this.email });
  }

  toCSV(): string {
    return `${this.name},${this.email}`;
  }
}

// Problems:
// - Changes to email logic require modifying User class
// - Changes to database schema require modifying User class
// - Changes to validation rules require modifying User class
// - Hard to test each responsibility in isolation
```

### Solution With SRP

```typescript
// ✅ Good: Each class has a single responsibility

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface DatabaseClient {
  execute(sql: string, params: unknown[]): Promise<unknown>;
  query(sql: string, params: unknown[]): Promise<unknown[]>;
}

interface EmailClient {
  send(to: string, subject: string, body: string): Promise<void>;
}

// Responsibility: User data model
class User {
  private name: string;
  private email: string;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }

  getName(): string { return this.name; }
  getEmail(): string { return this.email; }
}

// Responsibility: User validation
class UserValidator {
  validate(user: User): ValidationResult {
    const errors: string[] = [];

    if (!user.getName()) {
      errors.push('Name is required');
    }

    if (!user.getEmail()?.includes('@')) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Responsibility: User persistence
class UserRepository {
  private database: DatabaseClient;

  constructor(database: DatabaseClient) {
    this.database = database;
  }

  async save(user: User): Promise<unknown> {
    const sql = `INSERT INTO users (name, email) VALUES ($1, $2)`;
    return this.database.execute(sql, [user.getName(), user.getEmail()]);
  }

  async findByEmail(email: string): Promise<unknown[]> {
    const sql = `SELECT * FROM users WHERE email = $1`;
    return this.database.query(sql, [email]);
  }
}

// Responsibility: User notifications
class UserNotificationService {
  private emailService: EmailClient;

  constructor(emailService: EmailClient) {
    this.emailService = emailService;
  }

  async sendWelcomeEmail(user: User): Promise<void> {
    await this.emailService.send(
      user.getEmail(),
      'Welcome!',
      `Hello ${user.getName()}, welcome to our platform!`
    );
  }
}

// Responsibility: User formatting/serialization
class UserFormatter {
  toJSON(user: User): string {
    return JSON.stringify({
      name: user.getName(),
      email: user.getEmail()
    });
  }

  toCSV(user: User): string {
    return `${user.getName()},${user.getEmail()}`;
  }
}

// Usage: Compose classes together
class UserService {
  private validator: UserValidator;
  private repository: UserRepository;
  private notificationService: UserNotificationService;

  constructor(
    validator: UserValidator,
    repository: UserRepository,
    notificationService: UserNotificationService
  ) {
    this.validator = validator;
    this.repository = repository;
    this.notificationService = notificationService;
  }

  async createUser(name: string, email: string): Promise<User> {
    const user = new User(name, email);

    const validation = this.validator.validate(user);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    await this.repository.save(user);
    await this.notificationService.sendWelcomeEmail(user);

    return user;
  }
}
```

### Benefits of SRP

| Benefit | Description |
|---------|-------------|
| **Easier Testing** | Test each responsibility in isolation |
| **Lower Coupling** | Changes are localized to specific classes |
| **Better Readability** | Classes are smaller and focused |
| **Easier Maintenance** | Find and fix bugs faster |
| **Reusability** | Reuse classes in different contexts |

### Interview Questions

**Q: How do you identify if a class violates SRP?**

**A:** Look for these signs:
1. **Multiple reasons to change** - Does the class change for database changes AND UI changes AND business rule changes?
2. **And/or in class description** - "This class manages users AND sends emails AND validates data"
3. **Many dependencies** - Class requires many unrelated dependencies
4. **Hard to name** - If you can't give a clear, specific name, it probably does too much

---

## Open/Closed Principle (OCP)

### 💡 **Definition**

> Software entities should be **open for extension, but closed for modification**.

You should be able to add new functionality without changing existing code. This is typically achieved through abstraction and polymorphism.

### Problem Without OCP

```typescript
// ❌ Bad: Must modify existing code to add new payment methods
type PaymentType = 'creditCard' | 'paypal' | 'bitcoin';

interface Payment {
  type: PaymentType;
  amount: number;
}

class PaymentProcessor {
  processPayment(payment: Payment): void {
    if (payment.type === 'creditCard') {
      // Credit card logic
      console.log('Processing credit card payment');
      this.processCreditCard(payment);
    } else if (payment.type === 'paypal') {
      // PayPal logic
      console.log('Processing PayPal payment');
      this.processPayPal(payment);
    } else if (payment.type === 'bitcoin') {
      // Bitcoin logic - ADDED LATER (modified existing code!)
      console.log('Processing Bitcoin payment');
      this.processBitcoin(payment);
    } else {
      // Every new payment method requires modifying this class!
      throw new Error('Unknown payment type');
    }
  }

  private processCreditCard(payment: Payment): void { /* ... */ }
  private processPayPal(payment: Payment): void { /* ... */ }
  private processBitcoin(payment: Payment): void { /* ... */ }
}
```

### Solution With OCP

```typescript
// ✅ Good: Extend functionality without modifying existing code

// Abstract payment strategy
interface PaymentStrategy {
  process(amount: number): Promise<PaymentResult>;
  validate(): boolean;
  getName(): string;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  message: string;
}

// Concrete implementations - each can be added without modifying existing code
class CreditCardPayment implements PaymentStrategy {
  constructor(
    private cardNumber: string,
    private cvv: string,
    private expiry: string
  ) {}

  validate(): boolean {
    return this.cardNumber.length === 16 && this.cvv.length >= 3;
  }

  async process(amount: number): Promise<PaymentResult> {
    console.log(`Processing $${amount} via Credit Card`);
    return {
      success: true,
      transactionId: `CC_${Date.now()}`,
      message: 'Payment processed'
    };
  }

  getName(): string {
    return 'Credit Card';
  }
}

class PayPalPayment implements PaymentStrategy {
  constructor(private email: string) {}

  validate(): boolean {
    return this.email.includes('@');
  }

  async process(amount: number): Promise<PaymentResult> {
    console.log(`Processing $${amount} via PayPal`);
    return {
      success: true,
      transactionId: `PP_${Date.now()}`,
      message: 'Payment processed'
    };
  }

  getName(): string {
    return 'PayPal';
  }
}

// NEW: Add Apple Pay without modifying existing code!
class ApplePayPayment implements PaymentStrategy {
  constructor(private deviceToken: string) {}

  validate(): boolean {
    return this.deviceToken.length > 0;
  }

  async process(amount: number): Promise<PaymentResult> {
    console.log(`Processing $${amount} via Apple Pay`);
    return {
      success: true,
      transactionId: `AP_${Date.now()}`,
      message: 'Payment processed'
    };
  }

  getName(): string {
    return 'Apple Pay';
  }
}

// Payment processor - CLOSED for modification, OPEN for extension
class PaymentProcessor {
  async processPayment(strategy: PaymentStrategy, amount: number): Promise<PaymentResult> {
    if (!strategy.validate()) {
      return {
        success: false,
        transactionId: '',
        message: `Invalid ${strategy.getName()} payment details`
      };
    }

    console.log(`Using ${strategy.getName()} payment method`);
    return strategy.process(amount);
  }
}

// Usage
const processor = new PaymentProcessor();

// Process different payment types without modifying PaymentProcessor
await processor.processPayment(new CreditCardPayment('4242424242424242', '123', '12/25'), 100);
await processor.processPayment(new PayPalPayment('user@example.com'), 50);
await processor.processPayment(new ApplePayPayment('device_token_123'), 75);
```

### OCP with Decorators

```typescript
// Base logger - closed for modification
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

// Extend with decorators - open for extension
class TimestampLogger implements Logger {
  constructor(private logger: Logger) {}

  log(message: string): void {
    this.logger.log(`[${new Date().toISOString()}] ${message}`);
  }
}

class PrefixLogger implements Logger {
  constructor(private logger: Logger, private prefix: string) {}

  log(message: string): void {
    this.logger.log(`${this.prefix}: ${message}`);
  }
}

class FilterLogger implements Logger {
  constructor(private logger: Logger, private minLevel: string) {}

  log(message: string): void {
    if (this.shouldLog(message)) {
      this.logger.log(message);
    }
  }

  private shouldLog(message: string): boolean {
    // Filtering logic
    return true;
  }
}

// Compose loggers without modifying any existing class
let logger: Logger = new ConsoleLogger();
logger = new TimestampLogger(logger);
logger = new PrefixLogger(logger, 'APP');

logger.log('Application started');
// Output: APP: [2024-01-15T10:30:00.000Z] Application started
```

---

## Liskov Substitution Principle (LSP)

### 💡 **Definition**

> Objects of a superclass should be **replaceable with objects of its subclasses** without affecting the correctness of the program.

If `S` is a subtype of `T`, then objects of type `T` can be replaced with objects of type `S` without altering any of the desirable properties of the program.

### Problem Without LSP

```typescript
// ❌ Bad: Rectangle/Square problem - classic LSP violation
class Rectangle {
  protected width: number;
  protected height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setWidth(width: number): void {
    this.width = width;
  }

  setHeight(height: number): void {
    this.height = height;
  }

  getArea(): number {
    return this.width * this.height;
  }
}

class Square extends Rectangle {
  constructor(side: number) {
    super(side, side);
  }

  // ❌ Violates LSP: changes behavior unexpectedly
  setWidth(width: number): void {
    this.width = width;
    this.height = width;  // Also changes height!
  }

  setHeight(height: number): void {
    this.width = height;  // Also changes width!
    this.height = height;
  }
}

// This function expects Rectangle behavior
function increaseRectangleWidth(rectangle: Rectangle): number {
  rectangle.setWidth(rectangle['width'] + 10);
  // Expects: only width changes, height stays same
  return rectangle.getArea();
}

const rect = new Rectangle(5, 10);
console.log(increaseRectangleWidth(rect)); // 150 (15 * 10) ✓

const square = new Square(5);
console.log(increaseRectangleWidth(square)); // 225 (15 * 15) ✗ - unexpected!
// Square cannot substitute for Rectangle without breaking expectations
```

### Solution With LSP

```typescript
// ✅ Good: Design with LSP in mind

// Common interface for shapes
interface Shape {
  getArea(): number;
}

// Rectangle doesn't inherit from Square or vice versa
class Rectangle implements Shape {
  constructor(
    private width: number,
    private height: number
  ) {}

  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }

  setWidth(width: number): void {
    this.width = width;
  }

  setHeight(height: number): void {
    this.height = height;
  }

  getArea(): number {
    return this.width * this.height;
  }
}

class Square implements Shape {
  constructor(private side: number) {}

  getSide(): number { return this.side; }

  setSide(side: number): void {
    this.side = side;
  }

  getArea(): number {
    return this.side * this.side;
  }
}

// Functions work with the Shape interface
function printArea(shape: Shape): void {
  console.log(`Area: ${shape.getArea()}`);
}

// Both can be used wherever Shape is expected
printArea(new Rectangle(5, 10)); // Area: 50
printArea(new Square(5));         // Area: 25
```

### Another LSP Example

```typescript
// ✅ Good: Bird hierarchy respecting LSP

interface Bird {
  eat(): void;
  sleep(): void;
}

interface FlyingBird extends Bird {
  fly(): void;
}

interface SwimmingBird extends Bird {
  swim(): void;
}

// Can fly
class Eagle implements FlyingBird {
  eat(): void { console.log('Eagle eating'); }
  sleep(): void { console.log('Eagle sleeping'); }
  fly(): void { console.log('Eagle flying high'); }
}

class Sparrow implements FlyingBird {
  eat(): void { console.log('Sparrow eating seeds'); }
  sleep(): void { console.log('Sparrow sleeping'); }
  fly(): void { console.log('Sparrow flying'); }
}

// Can swim but not fly
class Penguin implements SwimmingBird {
  eat(): void { console.log('Penguin eating fish'); }
  sleep(): void { console.log('Penguin sleeping'); }
  swim(): void { console.log('Penguin swimming'); }
}

// Functions expecting specific capabilities
function makeFly(bird: FlyingBird): void {
  bird.fly(); // All FlyingBirds can fly - LSP satisfied
}

function makeSwim(bird: SwimmingBird): void {
  bird.swim(); // All SwimmingBirds can swim - LSP satisfied
}

makeFly(new Eagle());   // ✓ Works
makeFly(new Sparrow()); // ✓ Works
// makeFly(new Penguin()); // ✗ Type error - Penguin can't fly

makeSwim(new Penguin()); // ✓ Works
```

### LSP Checklist

To verify LSP compliance, check that subclasses:

| Check | Description |
|-------|-------------|
| **Preconditions** | Cannot strengthen preconditions (require more) |
| **Postconditions** | Cannot weaken postconditions (promise less) |
| **Invariants** | Must preserve parent class invariants |
| **Exceptions** | Cannot throw new exception types |
| **History** | Cannot change parent's state in unexpected ways |

---

## Interface Segregation Principle (ISP)

### 💡 **Definition**

> No client should be forced to depend on methods it does not use.

Create smaller, more specific interfaces rather than one large, general-purpose interface. Clients should only know about methods that are relevant to them.

### Problem Without ISP

```typescript
// ❌ Bad: Fat interface forces implementation of unused methods
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
  attendMeeting(): void;
  writeReport(): void;
  supervise(): void;
  approveTimeOff(): void;
}

class Developer implements Worker {
  work(): void { console.log('Writing code'); }
  eat(): void { console.log('Eating lunch'); }
  sleep(): void { console.log('Sleeping'); }
  attendMeeting(): void { console.log('Attending standup'); }
  writeReport(): void { console.log('Writing sprint report'); }

  // ❌ Developer doesn't supervise - forced to implement
  supervise(): void {
    throw new Error('Developers do not supervise');
  }

  // ❌ Developer doesn't approve time off - forced to implement
  approveTimeOff(): void {
    throw new Error('Developers cannot approve time off');
  }
}

class Manager implements Worker {
  work(): void { console.log('Managing team'); }
  eat(): void { console.log('Eating lunch'); }
  sleep(): void { console.log('Sleeping'); }
  attendMeeting(): void { console.log('Leading meeting'); }
  supervise(): void { console.log('Supervising team'); }
  approveTimeOff(): void { console.log('Approving time off'); }

  // ❌ Manager doesn't write reports - forced to implement
  writeReport(): void {
    throw new Error('Managers delegate report writing');
  }
}
```

### Solution With ISP

```typescript
// ✅ Good: Segregated interfaces

interface Workable {
  work(): void;
}

interface Eatable {
  eat(): void;
}

interface Sleepable {
  sleep(): void;
}

interface MeetingAttendee {
  attendMeeting(): void;
}

interface ReportWriter {
  writeReport(): void;
}

interface Supervisor {
  supervise(): void;
  approveTimeOff(): void;
}

// Developer only implements what it needs
class Developer implements Workable, Eatable, Sleepable, MeetingAttendee, ReportWriter {
  work(): void { console.log('Writing code'); }
  eat(): void { console.log('Eating lunch'); }
  sleep(): void { console.log('Sleeping'); }
  attendMeeting(): void { console.log('Attending standup'); }
  writeReport(): void { console.log('Writing sprint report'); }
}

// Manager implements different interfaces
class Manager implements Workable, Eatable, Sleepable, MeetingAttendee, Supervisor {
  work(): void { console.log('Managing team'); }
  eat(): void { console.log('Eating lunch'); }
  sleep(): void { console.log('Sleeping'); }
  attendMeeting(): void { console.log('Leading meeting'); }
  supervise(): void { console.log('Supervising team'); }
  approveTimeOff(): void { console.log('Approving time off'); }
}

// Robot worker - doesn't eat or sleep
class Robot implements Workable {
  work(): void { console.log('Processing tasks'); }
  // Doesn't need to implement eat() or sleep()
}

// Functions only require what they need
function conductMeeting(attendees: MeetingAttendee[]): void {
  attendees.forEach(a => a.attendMeeting());
}

function generateReports(writers: ReportWriter[]): void {
  writers.forEach(w => w.writeReport());
}
```

### Real-World ISP Example

```typescript
// ❌ Bad: One interface for all CRUD operations
interface Repository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  bulkCreate(data: T[]): Promise<T[]>;
  bulkDelete(ids: string[]): Promise<number>;
  findByQuery(query: object): Promise<T[]>;
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
  // ... 20 more methods
}

// ✅ Good: Segregated repository interfaces
interface ReadRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findByQuery(query: object): Promise<T[]>;
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
}

interface WriteRepository<T> {
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

interface BulkRepository<T> {
  bulkCreate(data: T[]): Promise<T[]>;
  bulkDelete(ids: string[]): Promise<number>;
}

// Combine interfaces as needed
interface FullRepository<T> extends ReadRepository<T>, WriteRepository<T> {}

// Read-only service only needs ReadRepository
class ReportService {
  constructor(private userRepo: ReadRepository<User>) {}

  async generateUserReport(): Promise<Report> {
    const users = await this.userRepo.findAll();
    const count = await this.userRepo.count();
    // Generate report...
    return { users, count };
  }
}

// Admin service needs full access
class AdminService {
  constructor(private userRepo: FullRepository<User>) {}

  async deleteInactiveUsers(): Promise<number> {
    const inactive = await this.userRepo.findByQuery({ status: 'inactive' });
    let deleted = 0;
    for (const user of inactive) {
      await this.userRepo.delete(user.id);
      deleted++;
    }
    return deleted;
  }
}
```

---

## Dependency Inversion Principle (DIP)

### 💡 **Definition**

> 1. High-level modules should not depend on low-level modules. Both should depend on abstractions.
> 2. Abstractions should not depend on details. Details should depend on abstractions.

This principle is about decoupling software modules so that high-level modules (business logic) don't depend on low-level modules (implementation details).

### Problem Without DIP

```typescript
// ❌ Bad: High-level module depends on low-level modules

// Low-level modules
class MySQLDatabase {
  connect(): void { console.log('Connecting to MySQL'); }
  query(sql: string): unknown[] { console.log(`MySQL: ${sql}`); return []; }
}

class ConsoleLogger {
  log(message: string): void { console.log(`[LOG] ${message}`); }
}

class SmtpEmailService {
  send(to: string, subject: string, body: string): void {
    console.log(`Sending email to ${to}: ${subject}`);
  }
}

// ❌ High-level module directly depends on low-level modules
class UserService {
  private database: MySQLDatabase;
  private logger: ConsoleLogger;
  private emailService: SmtpEmailService;

  constructor() {
    // Hardcoded dependencies on concrete implementations
    this.database = new MySQLDatabase();
    this.logger = new ConsoleLogger();
    this.emailService = new SmtpEmailService();
  }

  async createUser(userData: { name: string; email: string }): Promise<unknown[]> {
    this.logger.log('Creating user...');
    this.database.connect();
    const result = this.database.query(`INSERT INTO users...`);
    this.emailService.send(userData.email, 'Welcome', 'Welcome!');
    return result;
  }
}

// Problems:
// 1. Cannot switch database without changing UserService
// 2. Cannot test without real MySQL, console, SMTP
// 3. UserService knows too much about implementation details
```

### Solution With DIP

```typescript
// ✅ Good: Both high-level and low-level depend on abstractions

// Abstractions (interfaces)
interface Database {
  connect(): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  disconnect(): Promise<void>;
}

interface Logger {
  info(message: string): void;
  error(message: string, error?: Error): void;
  debug(message: string): void;
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

// Low-level modules implement abstractions
class MySQLDatabase implements Database {
  async connect(): Promise<void> {
    console.log('Connecting to MySQL');
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    console.log(`MySQL: ${sql}`);
    return [];
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from MySQL');
  }
}

class PostgreSQLDatabase implements Database {
  async connect(): Promise<void> {
    console.log('Connecting to PostgreSQL');
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    console.log(`PostgreSQL: ${sql}`);
    return [];
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from PostgreSQL');
  }
}

class WinstonLogger implements Logger {
  info(message: string): void { console.log(`[INFO] ${message}`); }
  error(message: string, error?: Error): void { console.error(`[ERROR] ${message}`, error); }
  debug(message: string): void { console.log(`[DEBUG] ${message}`); }
}

class SendGridEmailService implements EmailService {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log(`SendGrid: Sending to ${to}`);
  }
}

// High-level module depends on abstractions
class UserService {
  constructor(
    private database: Database,      // Abstraction
    private logger: Logger,          // Abstraction
    private emailService: EmailService  // Abstraction
  ) {}

  async createUser(userData: { name: string; email: string }): Promise<void> {
    this.logger.info('Creating user...');

    try {
      await this.database.connect();
      await this.database.query(
        'INSERT INTO users (name, email) VALUES ($1, $2)',
        [userData.name, userData.email]
      );
      await this.emailService.send(userData.email, 'Welcome', 'Welcome!');
      this.logger.info('User created successfully');
    } catch (error) {
      this.logger.error('Failed to create user', error as Error);
      throw error;
    } finally {
      await this.database.disconnect();
    }
  }
}

// Dependency injection at composition root
function createProductionUserService(): UserService {
  return new UserService(
    new PostgreSQLDatabase(),
    new WinstonLogger(),
    new SendGridEmailService()
  );
}

// Easy to create test version with mocks
function createTestUserService(): UserService {
  const mockDatabase: Database = {
    connect: async () => {},
    query: async () => [],
    disconnect: async () => {}
  };

  const mockLogger: Logger = {
    info: () => {},
    error: () => {},
    debug: () => {}
  };

  const mockEmailService: EmailService = {
    send: async () => {}
  };

  return new UserService(mockDatabase, mockLogger, mockEmailService);
}
```

### DIP with Dependency Injection Container

```typescript
// Container manages dependency creation and injection
class Container {
  private bindings = new Map<string, () => any>();

  bind<T>(token: string, factory: () => T): void {
    this.bindings.set(token, factory);
  }

  resolve<T>(token: string): T {
    const factory = this.bindings.get(token);
    if (!factory) {
      throw new Error(`No binding for ${token}`);
    }
    return factory();
  }
}

// Setup
const container = new Container();

// Bind abstractions to implementations
container.bind<Database>('Database', () => new PostgreSQLDatabase());
container.bind<Logger>('Logger', () => new WinstonLogger());
container.bind<EmailService>('EmailService', () => new SendGridEmailService());

container.bind<UserService>('UserService', () => new UserService(
  container.resolve('Database'),
  container.resolve('Logger'),
  container.resolve('EmailService')
));

// Usage
const userService = container.resolve<UserService>('UserService');
```

### Dependency Inversion vs Dependency Injection

| Aspect | Dependency Inversion | Dependency Injection |
|--------|---------------------|---------------------|
| **What** | Design principle | Implementation technique |
| **Focus** | Depend on abstractions | How to provide dependencies |
| **Scope** | Architecture level | Object creation level |
| **Relationship** | DIP is the goal | DI is one way to achieve DIP |

---

## SOLID Summary

### Quick Reference

```
S - Single Responsibility
    → One class, one job
    → "A class should have one reason to change"

O - Open/Closed
    → Extend behavior without modifying code
    → "Open for extension, closed for modification"

L - Liskov Substitution
    → Subtypes must be substitutable
    → "If it looks like a duck but needs batteries, you have the wrong abstraction"

I - Interface Segregation
    → Small, specific interfaces
    → "No client should be forced to depend on methods it doesn't use"

D - Dependency Inversion
    → Depend on abstractions
    → "High-level modules should not depend on low-level modules"
```

### Principles Working Together

```
┌─────────────────────────────────────────────────────────────┐
│                     SOLID Principles                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SRP    "Each class does one thing"                        │
│    │                                                        │
│    └──► Classes are small and focused                      │
│                                                             │
│  OCP    "Add features without changing code"               │
│    │                                                        │
│    └──► Use Strategy, Decorator, Factory patterns          │
│                                                             │
│  LSP    "Subclasses behave like base classes"              │
│    │                                                        │
│    └──► Proper inheritance hierarchies                     │
│                                                             │
│  ISP    "Small, client-specific interfaces"                │
│    │                                                        │
│    └──► Clients only know what they need                   │
│                                                             │
│  DIP    "Depend on abstractions"                           │
│    │                                                        │
│    └──► Flexible, testable architecture                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Interview Questions

**Q: Which SOLID principle is most important?**

**A:** All are important, but **Single Responsibility** is foundational. If you get SRP right, many other principles naturally follow. Small, focused classes are easier to extend (OCP), substitute (LSP), and compose with specific interfaces (ISP, DIP).

**Q: How do SOLID principles relate to design patterns?**

**A:**

| Pattern | Related Principles |
|---------|-------------------|
| **Strategy** | OCP, DIP |
| **Decorator** | OCP, SRP |
| **Factory** | DIP, OCP |
| **Adapter** | DIP, ISP |
| **Observer** | OCP, DIP |
| **Repository** | SRP, DIP |

**Q: When should you NOT strictly follow SOLID?**

**A:**
- **Prototypes/MVPs** - Speed matters more
- **Simple scripts** - Over-engineering adds complexity
- **Performance-critical code** - Abstractions have overhead
- **Small projects** - Architecture overhead not justified

> **Key Insight:** SOLID principles are guidelines, not laws. Apply them judiciously based on context. The goal is maintainable code, not perfect adherence to principles.

---

## Practice Exercise

Refactor this code to follow SOLID principles:

```typescript
// Before: Violates multiple SOLID principles
interface OrderItem {
  price: number;
  quantity: number;
  category: string;
}

interface Customer {
  email: string;
}

interface RawOrder {
  id: string;
  items: OrderItem[];
  customer: Customer;
}

interface OrderResult {
  orderId: string;
  total: number;
}

class MySQLConnection {
  query(sql: string): void { console.log(`Query: ${sql}`); }
}

class OrderProcessor {
  private db: MySQLConnection;

  constructor() {
    this.db = new MySQLConnection();
  }

  process(order: RawOrder): OrderResult {
    // Validate
    if (!order.items.length) throw new Error('No items');
    if (!order.customer.email) throw new Error('No email');

    // Calculate
    let total = 0;
    for (const item of order.items) {
      total += item.price * item.quantity;
      if (item.category === 'electronics') {
        total += total * 0.1; // Electronics tax
      }
    }

    // Save to database
    this.db.query(`INSERT INTO orders...`);

    // Send email (using dynamic require - bad practice shown intentionally)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer');
    nodemailer.sendMail({
      to: order.customer.email,
      subject: 'Order Confirmation',
      text: `Your order total: ${total}`
    });

    // Generate PDF
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfkit = require('pdfkit');
    const doc = new pdfkit();
    doc.text(`Order #${order.id}`);
    // ... PDF generation

    return { orderId: order.id, total };
  }
}
```

Think about how you would split this into classes following SRP, use abstractions for DIP, and make it extensible for OCP.

---

[← Architectural Patterns](./04-architectural-patterns.md) | [Back to Design Patterns](./README.md)
