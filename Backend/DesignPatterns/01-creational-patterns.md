# Creational Design Patterns

## 🎯 Overview

Creational patterns **abstract the object instantiation process**, making a system independent of how its objects are created, composed, and represented. They help make a system independent of how its objects are created.

### When to Use Creational Patterns

| Scenario | Pattern |
|----------|---------|
| Need exactly one instance | Singleton |
| Hide concrete class from client | Factory Method |
| Create families of related objects | Abstract Factory |
| Complex object construction | Builder |
| Clone existing objects | Prototype |

---

## Singleton

### 💡 **Intent**

Ensure a class has only **one instance** and provide a **global point of access** to it.

### Problem It Solves

```
Without Singleton:
├── Multiple database connections created unnecessarily
├── Inconsistent configuration across the application
├── Resource wastage (memory, connections)
└── Race conditions in initialization
```

### Structure

```
┌─────────────────────────────────┐
│           Singleton             │
├─────────────────────────────────┤
│ - instance: Singleton           │
├─────────────────────────────────┤
│ - constructor()                 │
│ + getInstance(): Singleton      │
│ + businessMethod()              │
└─────────────────────────────────┘
```

### Implementation

**Basic Singleton (TypeScript):**

```typescript
interface ConnectionObject {
  connected: boolean;
  timestamp: number;
}

class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private connection: ConnectionObject;

  constructor() {
    if (DatabaseConnection.instance) {
      throw new Error('Use DatabaseConnection.getInstance() instead');
    }
    this.connection = this.createConnection();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private createConnection(): ConnectionObject {
    console.log('Creating database connection...');
    return { connected: true, timestamp: Date.now() };
  }

  public query(sql: string): string {
    return `Executing: ${sql}`;
  }
}

// Usage
const db1 = DatabaseConnection.getInstance();
const db2 = DatabaseConnection.getInstance();
console.log(db1 === db2); // true - same instance
```

**Module Pattern Singleton (Preferred in TypeScript):**

```typescript
// logger.ts
interface LogEntry {
  timestamp: Date;
  message: string;
}

interface LoggerInstance {
  log(message: string): void;
  getLogs(): LogEntry[];
  clear(): void;
}

const Logger = (() => {
  let instance: LoggerInstance | undefined;

  function createInstance(): LoggerInstance {
    const logs: LogEntry[] = [];

    return {
      log(message: string): void {
        const entry: LogEntry = { timestamp: new Date(), message };
        logs.push(entry);
        console.log(`[${entry.timestamp.toISOString()}] ${message}`);
      },

      getLogs(): LogEntry[] {
        return [...logs];
      },

      clear(): void {
        logs.length = 0;
      }
    };
  }

  return {
    getInstance(): LoggerInstance {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    }
  };
})();

export default Logger;

// Usage
import Logger from './logger';

const logger1 = Logger.getInstance();
const logger2 = Logger.getInstance();
logger1.log('Application started');
console.log(logger1 === logger2); // true
```

**TypeScript Singleton:**

```typescript
class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, string> = new Map();

  private constructor() {
    this.loadDefaults();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadDefaults(): void {
    this.config.set('environment', process.env.NODE_ENV || 'development');
    this.config.set('port', process.env.PORT || '3000');
  }

  public get(key: string): string | undefined {
    return this.config.get(key);
  }

  public set(key: string, value: string): void {
    this.config.set(key, value);
  }
}

// Usage
const config = ConfigManager.getInstance();
console.log(config.get('environment')); // 'development'
```

### Real-World Examples

| Library/Framework | Singleton Usage |
|-------------------|-----------------|
| **Express** | `app` instance |
| **Mongoose** | Default connection |
| **Winston** | Default logger |
| **Redux** | Store instance |
| **NestJS** | Default scope providers |

### Pros and Cons

**Pros:**
- ✅ Guarantees single instance
- ✅ Global access point
- ✅ Lazy initialization (created when needed)
- ✅ Resource efficiency

**Cons:**
- ❌ Violates Single Responsibility Principle
- ❌ Difficult to unit test (global state)
- ❌ Can hide dependencies
- ❌ Thread safety concerns (less relevant in JS)

### Interview Questions

**Q: What are the problems with Singleton pattern?**

**A:** Singletons have several drawbacks:

1. **Testing Difficulty:**
```typescript
// ❌ Hard to test - uses global singleton
class UserService {
  getUser(id: string): string {
    return DatabaseConnection.getInstance().query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

// ✅ Better - inject dependency
interface Database {
  query(sql: string): string;
}

class UserService {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  getUser(id: string): string {
    return this.database.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}
```

2. **Hidden Dependencies:**
   - Code using singletons doesn't explicitly declare dependencies
   - Makes code harder to understand and maintain

3. **Global State:**
   - Changes in one part of the application affect others
   - Can lead to unexpected bugs

**Q: When is Singleton appropriate?**

**A:** Singleton is appropriate when:
- Resource is expensive to create (database connection)
- Only one instance makes logical sense (configuration manager)
- Global access is genuinely needed (logging service)
- The object is stateless or manages shared state intentionally

---

## Factory Method

### 💡 **Intent**

Define an interface for creating an object, but let **subclasses decide** which class to instantiate. Factory Method lets a class defer instantiation to subclasses.

### Problem It Solves

```
Without Factory:
├── Client code coupled to concrete classes
├── Hard to extend with new types
├── Complex conditional logic for object creation
└── Difficult to test (can't mock creation)
```

### Structure

```
┌─────────────────┐         ┌─────────────────┐
│    Creator      │         │    Product      │
├─────────────────┤         ├─────────────────┤
│ + factoryMethod()│◄───────│ + operation()   │
│ + someOperation()│         └────────┬────────┘
└────────┬────────┘                   │
         │                            │
         │                   ┌────────┴────────┐
┌────────┴────────┐          │                 │
│ ConcreteCreatorA│    ┌─────┴─────┐    ┌─────┴─────┐
├─────────────────┤    │ ProductA  │    │ ProductB  │
│ + factoryMethod()│    └───────────┘    └───────────┘
└─────────────────┘
```

### Implementation

**Simple Factory (Not a Pattern, but Common):**

```typescript
type NotificationType = 'email' | 'sms' | 'push';

interface Notification {
  type: NotificationType;
  message: string;
  send(to: string): void;
}

class EmailNotification implements Notification {
  public type: NotificationType = 'email';
  public message: string;

  constructor(message: string) {
    this.message = message;
  }

  send(to: string): void {
    console.log(`Sending email to ${to}: ${this.message}`);
  }
}

class SMSNotification implements Notification {
  public type: NotificationType = 'sms';
  public message: string;

  constructor(message: string) {
    this.message = message;
  }

  send(to: string): void {
    console.log(`Sending SMS to ${to}: ${this.message}`);
  }
}

class PushNotification implements Notification {
  public type: NotificationType = 'push';
  public message: string;

  constructor(message: string) {
    this.message = message;
  }

  send(to: string): void {
    console.log(`Sending push to ${to}: ${this.message}`);
  }
}

// Simple factory function
function createNotification(type: NotificationType, message: string): Notification {
  switch (type) {
    case 'email':
      return new EmailNotification(message);
    case 'sms':
      return new SMSNotification(message);
    case 'push':
      return new PushNotification(message);
    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

// Usage
const notification = createNotification('email', 'Hello!');
notification.send('user@example.com');
```

**Factory Method Pattern:**

```typescript
// Abstract Creator
abstract class NotificationCreator {
  // Factory method - subclasses override this
  abstract createNotification(message: string): Notification;

  // Template method using the factory method
  sendNotification(to: string, message: string): Notification {
    const notification = this.createNotification(message);
    notification.send(to);
    this.logSent(notification, to);
    return notification;
  }

  private logSent(notification: Notification, to: string): void {
    console.log(`${notification.type} notification sent to ${to}`);
  }
}

// Concrete Creators
class EmailNotificationCreator extends NotificationCreator {
  createNotification(message: string): Notification {
    return new EmailNotification(message);
  }
}

class SMSNotificationCreator extends NotificationCreator {
  createNotification(message: string): Notification {
    return new SMSNotification(message);
  }
}

// Usage
interface User {
  contact: string;
}

function notifyUser(user: User, message: string, preferredChannel: NotificationType): Notification {
  let creator: NotificationCreator;

  switch (preferredChannel) {
    case 'email':
      creator = new EmailNotificationCreator();
      break;
    case 'sms':
      creator = new SMSNotificationCreator();
      break;
    default:
      creator = new EmailNotificationCreator();
  }

  return creator.sendNotification(user.contact, message);
}

notifyUser({ contact: 'user@example.com' }, 'Welcome!', 'email');
```

**TypeScript Factory Method:**

```typescript
// Product interface
interface PaymentProcessor {
  processPayment(amount: number): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
}

interface RefundResult {
  success: boolean;
  refundId: string;
}

// Concrete Products
class StripeProcessor implements PaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    console.log(`Processing $${amount} via Stripe`);
    return { success: true, transactionId: `stripe_${Date.now()}` };
  }

  async refund(transactionId: string): Promise<RefundResult> {
    console.log(`Refunding ${transactionId} via Stripe`);
    return { success: true, refundId: `refund_${Date.now()}` };
  }
}

class PayPalProcessor implements PaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    console.log(`Processing $${amount} via PayPal`);
    return { success: true, transactionId: `paypal_${Date.now()}` };
  }

  async refund(transactionId: string): Promise<RefundResult> {
    console.log(`Refunding ${transactionId} via PayPal`);
    return { success: true, refundId: `refund_${Date.now()}` };
  }
}

// Creator with Factory Method
abstract class PaymentService {
  protected abstract createProcessor(): PaymentProcessor;

  async checkout(amount: number): Promise<PaymentResult> {
    const processor = this.createProcessor();
    const result = await processor.processPayment(amount);
    await this.sendReceipt(result.transactionId, amount);
    return result;
  }

  private async sendReceipt(transactionId: string, amount: number): Promise<void> {
    console.log(`Receipt sent for ${transactionId}: $${amount}`);
  }
}

// Concrete Creators
class StripePaymentService extends PaymentService {
  protected createProcessor(): PaymentProcessor {
    return new StripeProcessor();
  }
}

class PayPalPaymentService extends PaymentService {
  protected createProcessor(): PaymentProcessor {
    return new PayPalProcessor();
  }
}

// Usage
async function processOrder(paymentMethod: 'stripe' | 'paypal', amount: number): Promise<PaymentResult> {
  const service = paymentMethod === 'stripe'
    ? new StripePaymentService()
    : new PayPalPaymentService();

  return service.checkout(amount);
}
```

### Real-World Examples

| Library/Framework | Factory Usage |
|-------------------|---------------|
| **React** | `React.createElement()` |
| **Mongoose** | `mongoose.model()` |
| **Express** | `express.Router()` |
| **Winston** | `winston.createLogger()` |
| **Knex** | `knex.schema.createTable()` |

### Pros and Cons

**Pros:**
- ✅ Decouples client from concrete classes
- ✅ Follows Open/Closed Principle (easy to add new types)
- ✅ Single Responsibility (creation logic centralized)
- ✅ Easier testing (can mock factories)

**Cons:**
- ❌ Code may become more complicated
- ❌ Requires parallel class hierarchies
- ❌ Over-engineering for simple cases

### Interview Questions

**Q: What's the difference between Simple Factory and Factory Method?**

**A:**

| Aspect | Simple Factory | Factory Method |
|--------|----------------|----------------|
| **Type** | Not a pattern (idiom) | GoF Design Pattern |
| **Structure** | Single function/class | Class hierarchy |
| **Extension** | Modify factory code | Add new creator subclass |
| **OCP** | Violates (must modify) | Follows (extend) |
| **Complexity** | Low | Higher |

```typescript
// Simple Factory - modify to add new types
class Circle { getArea(): number { return 0; } }
class Square { getArea(): number { return 0; } }
class Triangle { getArea(): number { return 0; } }

function createShape(type: 'circle' | 'square'): Circle | Square {
  if (type === 'circle') return new Circle();
  if (type === 'square') return new Square();
  // Must modify this function to add new shapes
  throw new Error('Unknown shape');
}

// Factory Method - extend to add new types
abstract class ShapeFactory {
  abstract createShape(): Circle | Square | Triangle;
}

class CircleFactory extends ShapeFactory {
  createShape(): Circle { return new Circle(); }
}

// Add new shape without modifying existing code
class TriangleFactory extends ShapeFactory {
  createShape(): Triangle { return new Triangle(); }
}
```

---

## Abstract Factory

### 💡 **Intent**

Provide an interface for creating **families of related or dependent objects** without specifying their concrete classes.

### Problem It Solves

```
Without Abstract Factory:
├── Client knows about all concrete classes
├── Mixing incompatible objects (e.g., Windows button with Mac checkbox)
├── Hard to switch between product families
└── Scattered creation logic
```

### Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     AbstractFactory                          │
├─────────────────────────────────────────────────────────────┤
│ + createProductA(): AbstractProductA                         │
│ + createProductB(): AbstractProductB                         │
└─────────────────────────────────────────────────────────────┘
                            △
            ┌───────────────┴───────────────┐
   ┌────────┴────────┐            ┌────────┴────────┐
   │ ConcreteFactory1│            │ ConcreteFactory2│
   ├─────────────────┤            ├─────────────────┤
   │ + createProductA│            │ + createProductA│
   │ + createProductB│            │ + createProductB│
   └─────────────────┘            └─────────────────┘
```

### Implementation

**Database Abstraction Example:**

```typescript
interface QueryState {
  columns: string | string[];
  table: string;
  conditions: string[];
}

// Abstract Products
abstract class Connection {
  abstract connect(): { type: string; connected: boolean };
  abstract disconnect(): void;
}

abstract class QueryBuilder {
  abstract select(columns: string | string[]): this;
  abstract from(table: string): this;
  abstract where(condition: string): this;
  abstract build(): string;
}

// PostgreSQL Family
class PostgreSQLConnection extends Connection {
  connect(): { type: string; connected: boolean } {
    console.log('Connecting to PostgreSQL...');
    return { type: 'postgresql', connected: true };
  }

  disconnect(): void {
    console.log('Disconnecting from PostgreSQL');
  }
}

class PostgreSQLQueryBuilder extends QueryBuilder {
  private query: QueryState = { columns: '*', table: '', conditions: [] };

  select(columns: string | string[]): this {
    this.query.columns = columns;
    return this;
  }

  from(table: string): this {
    this.query.table = `"${table}"`;  // PostgreSQL uses double quotes
    return this;
  }

  where(condition: string): this {
    this.query.conditions.push(condition);
    return this;
  }

  build(): string {
    const cols = Array.isArray(this.query.columns) ? this.query.columns.join(', ') : this.query.columns;
    let sql = `SELECT ${cols} FROM ${this.query.table}`;
    if (this.query.conditions.length > 0) {
      sql += ` WHERE ${this.query.conditions.join(' AND ')}`;
    }
    return sql;
  }
}

// MySQL Family
class MySQLConnection extends Connection {
  connect(): { type: string; connected: boolean } {
    console.log('Connecting to MySQL...');
    return { type: 'mysql', connected: true };
  }

  disconnect(): void {
    console.log('Disconnecting from MySQL');
  }
}

class MySQLQueryBuilder extends QueryBuilder {
  private query: QueryState = { columns: '*', table: '', conditions: [] };

  select(columns: string | string[]): this {
    this.query.columns = columns;
    return this;
  }

  from(table: string): this {
    this.query.table = `\`${table}\``;  // MySQL uses backticks
    return this;
  }

  where(condition: string): this {
    this.query.conditions.push(condition);
    return this;
  }

  build(): string {
    const cols = Array.isArray(this.query.columns) ? this.query.columns.join(', ') : this.query.columns;
    let sql = `SELECT ${cols} FROM ${this.query.table}`;
    if (this.query.conditions.length > 0) {
      sql += ` WHERE ${this.query.conditions.join(' AND ')}`;
    }
    return sql;
  }
}

// Abstract Factory
abstract class DatabaseFactory {
  abstract createConnection(): Connection;
  abstract createQueryBuilder(): QueryBuilder;
}

// Concrete Factories
class PostgreSQLFactory extends DatabaseFactory {
  createConnection(): Connection {
    return new PostgreSQLConnection();
  }

  createQueryBuilder(): QueryBuilder {
    return new PostgreSQLQueryBuilder();
  }
}

class MySQLFactory extends DatabaseFactory {
  createConnection(): Connection {
    return new MySQLConnection();
  }

  createQueryBuilder(): QueryBuilder {
    return new MySQLQueryBuilder();
  }
}

// Client code - works with any factory
class DatabaseClient {
  private connection: Connection;
  private queryBuilder: QueryBuilder;

  constructor(factory: DatabaseFactory) {
    this.connection = factory.createConnection();
    this.queryBuilder = factory.createQueryBuilder();
  }

  findUsers(status: string): void {
    this.connection.connect();

    const query = this.queryBuilder
      .select('id, name, email')
      .from('users')
      .where(`status = '${status}'`)
      .build();

    console.log('Executing:', query);

    this.connection.disconnect();
  }
}

// Usage
const dbType = process.env.DB_TYPE || 'postgresql';

const factory: DatabaseFactory = dbType === 'mysql'
  ? new MySQLFactory()
  : new PostgreSQLFactory();

const client = new DatabaseClient(factory);
client.findUsers('active');

// Output for PostgreSQL:
// Connecting to PostgreSQL...
// Executing: SELECT id, name, email FROM "users" WHERE status = 'active'
// Disconnecting from PostgreSQL
```

**TypeScript UI Component Factory:**

```typescript
// Abstract Products
interface Button {
  render(): string;
  onClick(handler: () => void): void;
}

interface Input {
  render(): string;
  getValue(): string;
  setValue(value: string): void;
}

interface Modal {
  render(): string;
  open(): void;
  close(): void;
}

// Material Design Family
class MaterialButton implements Button {
  private handler?: () => void;

  render(): string {
    return '<button class="mdc-button mdc-button--raised">Click me</button>';
  }

  onClick(handler: () => void): void {
    this.handler = handler;
  }
}

class MaterialInput implements Input {
  private value = '';

  render(): string {
    return '<div class="mdc-text-field"><input class="mdc-text-field__input" /></div>';
  }

  getValue(): string { return this.value; }
  setValue(value: string): void { this.value = value; }
}

class MaterialModal implements Modal {
  render(): string {
    return '<div class="mdc-dialog">...</div>';
  }
  open(): void { console.log('Opening Material modal'); }
  close(): void { console.log('Closing Material modal'); }
}

// Bootstrap Family
class BootstrapButton implements Button {
  private handler?: () => void;

  render(): string {
    return '<button class="btn btn-primary">Click me</button>';
  }

  onClick(handler: () => void): void {
    this.handler = handler;
  }
}

class BootstrapInput implements Input {
  private value = '';

  render(): string {
    return '<input class="form-control" />';
  }

  getValue(): string { return this.value; }
  setValue(value: string): void { this.value = value; }
}

class BootstrapModal implements Modal {
  render(): string {
    return '<div class="modal">...</div>';
  }
  open(): void { console.log('Opening Bootstrap modal'); }
  close(): void { console.log('Closing Bootstrap modal'); }
}

// Abstract Factory
interface UIFactory {
  createButton(): Button;
  createInput(): Input;
  createModal(): Modal;
}

// Concrete Factories
class MaterialUIFactory implements UIFactory {
  createButton(): Button { return new MaterialButton(); }
  createInput(): Input { return new MaterialInput(); }
  createModal(): Modal { return new MaterialModal(); }
}

class BootstrapUIFactory implements UIFactory {
  createButton(): Button { return new BootstrapButton(); }
  createInput(): Input { return new BootstrapInput(); }
  createModal(): Modal { return new BootstrapModal(); }
}

// Client code
class LoginForm {
  private button: Button;
  private usernameInput: Input;
  private passwordInput: Input;

  constructor(factory: UIFactory) {
    this.button = factory.createButton();
    this.usernameInput = factory.createInput();
    this.passwordInput = factory.createInput();
  }

  render(): string {
    return `
      <form>
        ${this.usernameInput.render()}
        ${this.passwordInput.render()}
        ${this.button.render()}
      </form>
    `;
  }
}

// Usage - switch between UI frameworks easily
const uiFramework = 'material';
const uiFactory: UIFactory = uiFramework === 'material'
  ? new MaterialUIFactory()
  : new BootstrapUIFactory();

const loginForm = new LoginForm(uiFactory);
console.log(loginForm.render());
```

### Pros and Cons

**Pros:**
- ✅ Guarantees compatibility between products
- ✅ Loose coupling between client and concrete products
- ✅ Single Responsibility (creation in one place)
- ✅ Open/Closed (add new families easily)

**Cons:**
- ❌ Complexity increases with more products
- ❌ All products must be implemented by each factory
- ❌ Adding new product types requires changing all factories

### Interview Questions

**Q: When would you use Abstract Factory over Factory Method?**

**A:**

| Use Factory Method When | Use Abstract Factory When |
|-------------------------|---------------------------|
| Creating one product type | Creating families of related products |
| Single variation point | Multiple related variation points |
| Products can be used independently | Products must be used together |
| Simpler hierarchy | Complex product families |

```typescript
// Factory Method: One product, multiple variants
abstract class NotificationFactory {
  abstract createNotification(): Notification; // one product
}

// Abstract Factory: Multiple related products
interface UIComponentFactory {
  createButton(): Button;   // product A
  createInput(): Input;     // product B
  createModal(): Modal;     // product C
  // All products are designed to work together
}
```

---

## Builder

### 💡 **Intent**

Separate the construction of a complex object from its representation, allowing the **same construction process** to create different representations.

### Problem It Solves

```
Without Builder:
├── Constructor with many parameters (telescoping constructor)
├── Hard to read construction code
├── No way to create partial/incomplete objects
└── Complex objects require multiple creation steps
```

### Structure

```
┌─────────────────────┐     ┌─────────────────────┐
│      Director       │────▶│      Builder        │
├─────────────────────┤     ├─────────────────────┤
│ + construct()       │     │ + buildPartA()      │
└─────────────────────┘     │ + buildPartB()      │
                            │ + getResult()       │
                            └──────────△──────────┘
                                       │
                            ┌──────────┴──────────┐
                            │   ConcreteBuilder   │
                            ├─────────────────────┤
                            │ + buildPartA()      │
                            │ + buildPartB()      │
                            │ + getResult()       │
                            └─────────────────────┘
```

### Implementation

**Query Builder Example:**

```typescript
interface JoinClause {
  table: string;
  on: string;
  type: string;
}

interface WhereClause {
  condition: string;
  value?: unknown;
  type: 'AND' | 'OR';
}

interface OrderByClause {
  column: string;
  direction: string;
}

interface QueryState {
  type: string;
  columns: string[];
  table: string;
  joins: JoinClause[];
  conditions: WhereClause[];
  orderBy: OrderByClause[];
  limit: number | null;
  offset: number | null;
}

class SQLQueryBuilder {
  private query: QueryState;

  constructor() {
    this.query = this.buildEmptyQuery();
  }

  private buildEmptyQuery(): QueryState {
    return {
      type: 'SELECT',
      columns: ['*'],
      table: '',
      joins: [],
      conditions: [],
      orderBy: [],
      limit: null,
      offset: null
    };
  }

  reset(): this {
    this.query = this.buildEmptyQuery();
    return this;
  }

  select(...columns: string[]): this {
    this.query.columns = columns.length ? columns : ['*'];
    return this;
  }

  from(table: string): this {
    this.query.table = table;
    return this;
  }

  where(condition: string, value?: unknown): this {
    this.query.conditions.push({ condition, value, type: 'AND' });
    return this;
  }

  orWhere(condition: string, value?: unknown): this {
    this.query.conditions.push({ condition, value, type: 'OR' });
    return this;
  }

  join(table: string, on: string, type: string = 'INNER'): this {
    this.query.joins.push({ table, on, type });
    return this;
  }

  leftJoin(table: string, on: string): this {
    return this.join(table, on, 'LEFT');
  }

  orderBy(column: string, direction: string = 'ASC'): this {
    this.query.orderBy.push({ column, direction });
    return this;
  }

  limit(count: number): this {
    this.query.limit = count;
    return this;
  }

  offset(count: number): this {
    this.query.offset = count;
    return this;
  }

  build(): string {
    const { columns, table, joins, conditions, orderBy, limit, offset } = this.query;

    let sql = `SELECT ${columns.join(', ')} FROM ${table}`;

    // Add joins
    for (const join of joins) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // Add conditions
    if (conditions.length > 0) {
      const whereClause = conditions
        .map((c, i) => i === 0 ? c.condition : `${c.type} ${c.condition}`)
        .join(' ');
      sql += ` WHERE ${whereClause}`;
    }

    // Add order by
    if (orderBy.length > 0) {
      const orderClause = orderBy.map(o => `${o.column} ${o.direction}`).join(', ');
      sql += ` ORDER BY ${orderClause}`;
    }

    // Add limit and offset
    if (limit !== null) {
      sql += ` LIMIT ${limit}`;
    }
    if (offset !== null) {
      sql += ` OFFSET ${offset}`;
    }

    const result = sql;
    this.reset();  // Reset for next query
    return result;
  }
}

// Usage - fluent interface
const query = new SQLQueryBuilder()
  .select('users.id', 'users.name', 'orders.total')
  .from('users')
  .leftJoin('orders', 'users.id = orders.user_id')
  .where('users.status = ?', 'active')
  .where('orders.total > ?', 100)
  .orderBy('orders.total', 'DESC')
  .limit(10)
  .offset(20)
  .build();

console.log(query);
// SELECT users.id, users.name, orders.total FROM users
// LEFT JOIN orders ON users.id = orders.user_id
// WHERE users.status = ? AND orders.total > ?
// ORDER BY orders.total DESC LIMIT 10 OFFSET 20
```

**HTTP Request Builder:**

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface AuthConfig {
  type: 'bearer' | 'basic';
  credentials: string;
}

interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  timeout: number;
  retries: number;
  auth: AuthConfig | null;
}

class HttpRequestBuilder {
  private request: RequestConfig;

  constructor() {
    this.request = this.buildEmptyRequest();
  }

  private buildEmptyRequest(): RequestConfig {
    return {
      method: 'GET',
      url: '',
      headers: {},
      body: null,
      timeout: 30000,
      retries: 0,
      auth: null
    };
  }

  reset(): this {
    this.request = this.buildEmptyRequest();
    return this;
  }

  get(url: string): this {
    this.request.method = 'GET';
    this.request.url = url;
    return this;
  }

  post(url: string): this {
    this.request.method = 'POST';
    this.request.url = url;
    return this;
  }

  put(url: string): this {
    this.request.method = 'PUT';
    this.request.url = url;
    return this;
  }

  delete(url: string): this {
    this.request.method = 'DELETE';
    this.request.url = url;
    return this;
  }

  header(key: string, value: string): this {
    this.request.headers[key] = value;
    return this;
  }

  contentType(type: string): this {
    return this.header('Content-Type', type);
  }

  json(data: unknown): this {
    this.request.body = JSON.stringify(data);
    return this.contentType('application/json');
  }

  bearer(token: string): this {
    return this.header('Authorization', `Bearer ${token}`);
  }

  basicAuth(username: string, password: string): this {
    const encoded = Buffer.from(`${username}:${password}`).toString('base64');
    return this.header('Authorization', `Basic ${encoded}`);
  }

  timeout(ms: number): this {
    this.request.timeout = ms;
    return this;
  }

  retry(count: number): this {
    this.request.retries = count;
    return this;
  }

  async execute(): Promise<Response> {
    const { method, url, headers, body, timeout, retries } = this.request;

    const options: RequestInit = {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(timeout)
    };

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        this.reset();
        return response;
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  build(): RequestConfig {
    const result = { ...this.request };
    this.reset();
    return result;
  }
}

// Usage
const http = new HttpRequestBuilder();

// Simple GET request
const users = await http
  .get('https://api.example.com/users')
  .bearer('my-token')
  .timeout(5000)
  .execute();

// POST with JSON body
const newUser = await http
  .post('https://api.example.com/users')
  .bearer('my-token')
  .json({ name: 'John', email: 'john@example.com' })
  .retry(3)
  .execute();
```

**TypeScript Builder with Director:**

```typescript
interface UserSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  permissions: string[];
  settings: UserSettings;
  createdAt: Date;
}

class UserBuilder {
  private user: Partial<User> = {};

  setId(id: string): this {
    this.user.id = id;
    return this;
  }

  setName(name: string): this {
    this.user.name = name;
    return this;
  }

  setEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  setRole(role: 'admin' | 'user' | 'guest'): this {
    this.user.role = role;
    return this;
  }

  setPermissions(permissions: string[]): this {
    this.user.permissions = permissions;
    return this;
  }

  setSettings(settings: UserSettings): this {
    this.user.settings = settings;
    return this;
  }

  setCreatedAt(date: Date): this {
    this.user.createdAt = date;
    return this;
  }

  build(): User {
    // Validate required fields
    if (!this.user.id || !this.user.name || !this.user.email) {
      throw new Error('Missing required fields: id, name, email');
    }

    // Set defaults
    const user: User = {
      id: this.user.id,
      name: this.user.name,
      email: this.user.email,
      role: this.user.role ?? 'user',
      permissions: this.user.permissions ?? [],
      settings: this.user.settings ?? {
        theme: 'light',
        notifications: true,
        language: 'en'
      },
      createdAt: this.user.createdAt ?? new Date()
    };

    // Reset for next build
    this.user = {};

    return user;
  }
}

// Director - knows how to build specific user types
class UserDirector {
  private builder: UserBuilder;

  constructor(builder: UserBuilder) {
    this.builder = builder;
  }

  createAdmin(id: string, name: string, email: string): User {
    return this.builder
      .setId(id)
      .setName(name)
      .setEmail(email)
      .setRole('admin')
      .setPermissions(['read', 'write', 'delete', 'admin'])
      .setSettings({ theme: 'dark', notifications: true, language: 'en' })
      .build();
  }

  createGuest(id: string): User {
    return this.builder
      .setId(id)
      .setName('Guest')
      .setEmail('guest@example.com')
      .setRole('guest')
      .setPermissions(['read'])
      .setSettings({ theme: 'light', notifications: false, language: 'en' })
      .build();
  }

  createBasicUser(id: string, name: string, email: string): User {
    return this.builder
      .setId(id)
      .setName(name)
      .setEmail(email)
      .setRole('user')
      .setPermissions(['read', 'write'])
      .build();
  }
}

// Usage
const builder = new UserBuilder();
const director = new UserDirector(builder);

const admin = director.createAdmin('1', 'Admin User', 'admin@example.com');
const guest = director.createGuest('2');
const user = director.createBasicUser('3', 'John Doe', 'john@example.com');

// Or use builder directly for custom configuration
const customUser = new UserBuilder()
  .setId('4')
  .setName('Custom User')
  .setEmail('custom@example.com')
  .setRole('user')
  .setPermissions(['read', 'write', 'export'])
  .setSettings({ theme: 'dark', notifications: true, language: 'es' })
  .build();
```

### Pros and Cons

**Pros:**
- ✅ Construct objects step by step
- ✅ Reuse construction code for different representations
- ✅ Single Responsibility (isolate complex construction)
- ✅ Fluent interface improves readability

**Cons:**
- ❌ Overall complexity increases
- ❌ Requires creating multiple classes
- ❌ Client must know about director and builder

### Interview Questions

**Q: What's the difference between Builder and Factory?**

**A:**

| Aspect | Factory | Builder |
|--------|---------|---------|
| **Focus** | What to create | How to create |
| **Construction** | Single step | Multi-step |
| **Object complexity** | Simple to medium | Complex objects |
| **Return** | Complete object | Object after multiple steps |
| **Configuration** | Parameters to method | Method chaining |

```typescript
// Factory - single step, what to create
class UserFactory {
  static create(role: 'admin' | 'user'): User {
    // returns user in one step
    return {} as User;
  }
}
const factoryUser = UserFactory.create('admin');

// Builder - multi-step, how to create
const builtUser = new UserBuilder()
  .setName('John')
  .setEmail('john@example.com')
  .setRole('admin')
  .setPermissions(['delete'])
  .build();
```

---

## Prototype

### 💡 **Intent**

Specify the kinds of objects to create using a prototypical instance, and create new objects by **copying this prototype**.

### Problem It Solves

```
Without Prototype:
├── Expensive object creation (complex initialization)
├── Need to create similar objects with slight variations
├── Don't know concrete class at compile time
└── Want to avoid subclass explosion for variants
```

### Implementation

**TypeScript Prototype (Native):**

```typescript
interface VehiclePrototype {
  make: string;
  model: string;
  getInfo(): string;
  clone(): VehiclePrototype;
}

const vehiclePrototype: VehiclePrototype = {
  make: '',
  model: '',
  getInfo(): string {
    return `${this.make} ${this.model}`;
  },
  clone(): VehiclePrototype {
    return { ...this };
  }
};

const car: VehiclePrototype = { ...vehiclePrototype, make: 'Toyota', model: 'Camry' };
const carClone: VehiclePrototype = car.clone();
carClone.model = 'Corolla';

console.log(car.getInfo());      // Toyota Camry
console.log(carClone.getInfo()); // Toyota Corolla
```

**Class-Based Prototype:**

```typescript
interface DocumentMetadata {
  createdAt: Date;
  version: number;
}

interface DocumentStyles {
  fontSize: number;
  fontFamily: string;
  color: string;
}

class DocumentTemplate {
  public title: string;
  public content: string;
  public styles: DocumentStyles;
  public metadata: DocumentMetadata;

  constructor(title: string, content: string, styles: DocumentStyles) {
    this.title = title;
    this.content = content;
    this.styles = styles;
    this.metadata = {
      createdAt: new Date(),
      version: 1
    };
  }

  // Deep clone method
  clone(): DocumentTemplate {
    const clone = new DocumentTemplate(
      this.title,
      this.content,
      { ...this.styles }  // Shallow copy of styles
    );

    // Deep copy metadata
    clone.metadata = JSON.parse(JSON.stringify(this.metadata)) as DocumentMetadata;
    clone.metadata.version++;
    clone.metadata.createdAt = new Date();

    return clone;
  }

  setTitle(title: string): this {
    this.title = title;
    return this;
  }

  setContent(content: string): this {
    this.content = content;
    return this;
  }
}

// Prototype Registry
class DocumentRegistry {
  private templates: Map<string, DocumentTemplate> = new Map();

  register(name: string, template: DocumentTemplate): void {
    this.templates.set(name, template);
  }

  create(name: string): DocumentTemplate {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template '${name}' not found`);
    }
    return template.clone();
  }
}

// Usage
const registry = new DocumentRegistry();

// Register templates
registry.register('report', new DocumentTemplate(
  'Monthly Report',
  'Report content here...',
  { fontSize: 12, fontFamily: 'Arial', color: '#333' }
));

registry.register('invoice', new DocumentTemplate(
  'Invoice',
  'Invoice details...',
  { fontSize: 10, fontFamily: 'Courier', color: '#000' }
));

// Create documents from templates
const report1 = registry.create('report').setTitle('January Report');
const report2 = registry.create('report').setTitle('February Report');
const invoice = registry.create('invoice').setContent('Invoice #123');

console.log(report1.title);  // January Report
console.log(report2.title);  // February Report
console.log(report1 === report2);  // false (different instances)
```

**TypeScript with Deep Clone:**

```typescript
interface Cloneable<T> {
  clone(): T;
}

interface ServerOptions {
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

class ServerConfig implements Cloneable<ServerConfig> {
  constructor(
    public host: string,
    public port: number,
    public ssl: boolean,
    public options: ServerOptions
  ) {}

  clone(): ServerConfig {
    return new ServerConfig(
      this.host,
      this.port,
      this.ssl,
      {
        timeout: this.options.timeout,
        retries: this.options.retries,
        headers: { ...this.options.headers }
      }
    );
  }

  withHost(host: string): ServerConfig {
    const clone = this.clone();
    clone.host = host;
    return clone;
  }

  withPort(port: number): ServerConfig {
    const clone = this.clone();
    clone.port = port;
    return clone;
  }

  withSSL(ssl: boolean): ServerConfig {
    const clone = this.clone();
    clone.ssl = ssl;
    return clone;
  }
}

// Base configuration
const baseConfig = new ServerConfig('localhost', 3000, false, {
  timeout: 5000,
  retries: 3,
  headers: { 'Content-Type': 'application/json' }
});

// Create variations
const devConfig = baseConfig.clone();
const prodConfig = baseConfig
  .withHost('api.example.com')
  .withPort(443)
  .withSSL(true);

const stagingConfig = prodConfig.withHost('staging.example.com');

console.log(devConfig.host);     // localhost
console.log(prodConfig.host);    // api.example.com
console.log(stagingConfig.host); // staging.example.com
```

### Shallow vs Deep Clone

```typescript
// ⚠️ Shallow Clone - shares nested object references
const shallowClone = <T extends object>(obj: T): T => ({ ...obj });

interface Person {
  name: string;
  address: { city: string };
}

const original: Person = {
  name: 'John',
  address: { city: 'NYC' }
};

const shallow = shallowClone(original);
shallow.address.city = 'LA';
console.log(original.address.city); // 'LA' - original also changed!

// ✅ Deep Clone - creates independent copy
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;

  const clone: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }
  return clone as T;
}

// Or use structuredClone (modern browsers/Node 17+)
const deep = structuredClone(original);
deep.address.city = 'LA';
console.log(original.address.city); // 'NYC' - original unchanged
```

### Pros and Cons

**Pros:**
- ✅ Clone objects without coupling to concrete classes
- ✅ Remove repeated initialization code
- ✅ Produce complex objects more conveniently
- ✅ Alternative to inheritance for presets

**Cons:**
- ❌ Cloning objects with circular references is tricky
- ❌ Deep cloning can be complex
- ❌ Need to implement clone for each class

---

## Summary: Choosing the Right Creational Pattern

| Need | Pattern | Example |
|------|---------|---------|
| Single global instance | **Singleton** | Logger, Config |
| Hide concrete class | **Factory Method** | Notification types |
| Create related objects | **Abstract Factory** | UI themes, DB drivers |
| Complex construction | **Builder** | Query builder, Request builder |
| Clone existing objects | **Prototype** | Document templates, Configs |

### Decision Flowchart

```
Start
  │
  ▼
Need only ONE instance? ──Yes──► Singleton
  │
  No
  ▼
Creating families of related objects? ──Yes──► Abstract Factory
  │
  No
  ▼
Complex multi-step construction? ──Yes──► Builder
  │
  No
  ▼
Need to clone existing objects? ──Yes──► Prototype
  │
  No
  ▼
Hide instantiation details? ──Yes──► Factory Method
  │
  No
  ▼
Use simple constructor or consider if pattern needed
```

---

**Next:** [Structural Patterns →](./02-structural-patterns.md)

---

[← Back to Design Patterns](./README.md) | [Back to Backend Guide](../README.md)
