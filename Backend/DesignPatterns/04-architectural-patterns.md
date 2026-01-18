# Architectural Design Patterns

## 🎯 Overview

Architectural patterns are **high-level patterns** that define the overall structure and organization of software systems. Unlike GoF patterns that solve specific design problems, architectural patterns address system-wide concerns like separation of concerns, testability, and maintainability.

### Why Architectural Patterns Matter

| Benefit | Description |
|---------|-------------|
| **Separation of Concerns** | Each layer has distinct responsibility |
| **Testability** | Easy to mock and test in isolation |
| **Maintainability** | Changes are localized to specific areas |
| **Scalability** | System can grow without major rewrites |
| **Team Collaboration** | Clear boundaries for parallel development |

---

## Repository

### 💡 **Intent**

Mediate between the domain and data mapping layers using a **collection-like interface** for accessing domain objects. Repository encapsulates the logic required to access data sources.

### Problem It Solves

```
Without Repository:
├── Business logic mixed with data access code
├── Duplicate query logic throughout codebase
├── Hard to switch data sources
├── Difficult to test without database
└── SQL/queries scattered in controllers
```

### Structure

```
┌─────────────────┐         ┌─────────────────────┐
│    Service      │────────▶│     Repository      │
│    (Business)   │         ├─────────────────────┤
└─────────────────┘         │ + findAll()         │
                            │ + findById(id)      │
                            │ + save(entity)      │
                            │ + delete(id)        │
                            └──────────△──────────┘
                                       │
                           ┌───────────┴───────────┐
                           │                       │
               ┌───────────┴───────────┐  ┌───────┴───────────┐
               │ PostgreSQLRepository  │  │  MongoRepository   │
               └───────────────────────┘  └───────────────────┘
```

### Implementation

**Generic Repository Interface:**

```typescript
// Entity interface
interface Entity {
  id: string;
}

// Repository interface
interface Repository<T extends Entity> {
  findAll(options?: QueryOptions): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findOne(criteria: Partial<T>): Promise<T | null>;
  findMany(criteria: Partial<T>, options?: QueryOptions): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(criteria?: Partial<T>): Promise<number>;
  exists(id: string): Promise<boolean>;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// User entity
interface User extends Entity {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
}
```

**PostgreSQL Repository Implementation:**

```typescript
import { Pool, QueryResult } from 'pg';

class PostgreSQLUserRepository implements Repository<User> {
  private pool: Pool;
  private tableName = 'users';

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findAll(options?: QueryOptions): Promise<User[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'asc'}`;
    }

    if (options?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    const result = await this.pool.query(query, params);
    return result.rows.map(this.mapToEntity);
  }

  async findById(id: string): Promise<User | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async findOne(criteria: Partial<User>): Promise<User | null> {
    const { whereClause, params } = this.buildWhereClause(criteria);
    const query = `SELECT * FROM ${this.tableName} ${whereClause} LIMIT 1`;
    const result = await this.pool.query(query, params);
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async findMany(criteria: Partial<User>, options?: QueryOptions): Promise<User[]> {
    const { whereClause, params } = this.buildWhereClause(criteria);
    let query = `SELECT * FROM ${this.tableName} ${whereClause}`;

    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'asc'}`;
    }

    if (options?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    const result = await this.pool.query(query, params);
    return result.rows.map(this.mapToEntity);
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    const id = this.generateId();
    const query = `
      INSERT INTO ${this.tableName} (id, name, email, role, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [id, data.name, data.email, data.role, data.createdAt || new Date()];
    const result = await this.pool.query(query, params);
    return this.mapToEntity(result.rows[0]);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const { setClause, params } = this.buildSetClause(data, id);
    const query = `UPDATE ${this.tableName} ${setClause} WHERE id = $1 RETURNING *`;
    const result = await this.pool.query(query, params);

    if (!result.rows[0]) {
      throw new Error(`User with id ${id} not found`);
    }

    return this.mapToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async count(criteria?: Partial<User>): Promise<number> {
    let query = `SELECT COUNT(*) FROM ${this.tableName}`;
    let params: any[] = [];

    if (criteria) {
      const where = this.buildWhereClause(criteria);
      query += ` ${where.whereClause}`;
      params = where.params;
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async exists(id: string): Promise<boolean> {
    const query = `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE id = $1)`;
    const result = await this.pool.query(query, [id]);
    return result.rows[0].exists;
  }

  // Helper methods
  private mapToEntity(row: any): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at
    };
  }

  private buildWhereClause(criteria: Partial<User>): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined) {
        params.push(value);
        conditions.push(`${this.toSnakeCase(key)} = $${params.length}`);
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
  }

  private buildSetClause(data: Partial<User>, id: string): { setClause: string; params: any[] } {
    const params: any[] = [id];
    const sets: string[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        params.push(value);
        sets.push(`${this.toSnakeCase(key)} = $${params.length}`);
      }
    });

    return { setClause: `SET ${sets.join(', ')}`, params };
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private generateId(): string {
    return `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**In-Memory Repository for Testing:**

```typescript
class InMemoryUserRepository implements Repository<User> {
  private users: Map<string, User> = new Map();

  async findAll(options?: QueryOptions): Promise<User[]> {
    let users = Array.from(this.users.values());

    if (options?.orderBy) {
      users.sort((a, b) => {
        const aVal = a[options.orderBy as keyof User];
        const bVal = b[options.orderBy as keyof User];
        const direction = options.orderDirection === 'desc' ? -1 : 1;
        return aVal > bVal ? direction : -direction;
      });
    }

    if (options?.offset) {
      users = users.slice(options.offset);
    }

    if (options?.limit) {
      users = users.slice(0, options.limit);
    }

    return users;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findOne(criteria: Partial<User>): Promise<User | null> {
    return Array.from(this.users.values()).find(user =>
      Object.entries(criteria).every(([key, value]) =>
        user[key as keyof User] === value
      )
    ) || null;
  }

  async findMany(criteria: Partial<User>, options?: QueryOptions): Promise<User[]> {
    const filtered = Array.from(this.users.values()).filter(user =>
      Object.entries(criteria).every(([key, value]) =>
        user[key as keyof User] === value
      )
    );

    return options?.limit ? filtered.slice(0, options.limit) : filtered;
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    const user: User = {
      id: `usr_${Date.now()}`,
      ...data,
      createdAt: data.createdAt || new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User with id ${id} not found`);
    }

    const updated = { ...existing, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async count(criteria?: Partial<User>): Promise<number> {
    if (!criteria) return this.users.size;
    const matches = await this.findMany(criteria);
    return matches.length;
  }

  async exists(id: string): Promise<boolean> {
    return this.users.has(id);
  }

  // Test helper
  clear(): void {
    this.users.clear();
  }
}
```

**Service Using Repository:**

```typescript
class UserService {
  constructor(private userRepository: Repository<User>) {}

  async createUser(data: { name: string; email: string }): Promise<User> {
    // Check if email already exists
    const existing = await this.userRepository.findOne({ email: data.email });
    if (existing) {
      throw new Error('Email already in use');
    }

    return this.userRepository.create({
      ...data,
      role: 'user',
      createdAt: new Date()
    });
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async getAdmins(): Promise<User[]> {
    return this.userRepository.findMany({ role: 'admin' });
  }

  async promoteToAdmin(id: string): Promise<User> {
    return this.userRepository.update(id, { role: 'admin' });
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new Error('User not found');
    }
  }
}

// Usage in production
const pool = new Pool({ /* connection config */ });
const productionService = new UserService(new PostgreSQLUserRepository(pool));

// Usage in tests
const testRepository = new InMemoryUserRepository();
const testService = new UserService(testRepository);
```

### Pros and Cons

**Pros:**
- ✅ Decouples business logic from data access
- ✅ Centralizes data access logic
- ✅ Easy to test with mock repositories
- ✅ Easy to swap data sources

**Cons:**
- ❌ Additional abstraction layer
- ❌ Can become too generic
- ❌ May duplicate ORM functionality

---

## Dependency Injection

### 💡 **Intent**

A technique whereby one object **supplies the dependencies** of another object rather than the dependent object creating them itself. This is a specific form of Inversion of Control (IoC).

### Problem It Solves

```
Without DI:
├── Classes create their own dependencies (tight coupling)
├── Hard to replace dependencies for testing
├── Difficult to change implementations
├── Hidden dependencies make code hard to understand
└── Cannot configure dependencies at runtime
```

### Types of Dependency Injection

| Type | Description | When to Use |
|------|-------------|-------------|
| **Constructor Injection** | Pass dependencies via constructor | Preferred - most explicit |
| **Setter Injection** | Pass dependencies via setter methods | Optional dependencies |
| **Interface Injection** | Dependency provides injector method | Rare, framework-specific |

### Implementation

**Without DI (Tight Coupling):**

```javascript
// ❌ Bad: Class creates its own dependencies
class UserService {
  constructor() {
    // Hardcoded dependencies
    this.database = new PostgreSQLDatabase();
    this.logger = new WinstonLogger();
    this.emailService = new SendGridEmailService();
  }

  async createUser(data) {
    this.logger.info('Creating user');
    const user = await this.database.insert('users', data);
    await this.emailService.send(user.email, 'Welcome!');
    return user;
  }
}

// Problems:
// 1. Cannot test without real database, logger, email service
// 2. Cannot swap implementations
// 3. Hidden dependencies
```

**With DI (Loose Coupling):**

```typescript
// Interfaces
interface Logger {
  info(message: string): void;
  error(message: string, error?: Error): void;
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface Database {
  insert<T>(table: string, data: T): Promise<T & { id: string }>;
  findById<T>(table: string, id: string): Promise<T | null>;
}

// ✅ Good: Dependencies injected via constructor
class UserService {
  constructor(
    private database: Database,
    private logger: Logger,
    private emailService: EmailService
  ) {}

  async createUser(data: { name: string; email: string }) {
    this.logger.info('Creating user');

    try {
      const user = await this.database.insert('users', data);
      await this.emailService.send(user.email, 'Welcome!', 'Welcome to our platform!');
      this.logger.info(`User created: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error as Error);
      throw error;
    }
  }
}

// Production setup
const productionService = new UserService(
  new PostgreSQLDatabase(config.database),
  new WinstonLogger(),
  new SendGridEmailService(config.sendgrid)
);

// Test setup with mocks
const mockDatabase: Database = {
  insert: jest.fn().mockResolvedValue({ id: '1', name: 'Test', email: 'test@example.com' }),
  findById: jest.fn()
};

const mockLogger: Logger = {
  info: jest.fn(),
  error: jest.fn()
};

const mockEmailService: EmailService = {
  send: jest.fn().mockResolvedValue(undefined)
};

const testService = new UserService(mockDatabase, mockLogger, mockEmailService);
```

**Simple DI Container:**

```typescript
type Constructor<T> = new (...args: any[]) => T;
type Factory<T> = () => T;

class Container {
  private services: Map<string, any> = new Map();
  private factories: Map<string, Factory<any>> = new Map();
  private singletons: Map<string, any> = new Map();

  // Register a class
  register<T>(token: string, constructor: Constructor<T>, dependencies: string[] = []): this {
    this.factories.set(token, () => {
      const deps = dependencies.map(dep => this.resolve(dep));
      return new constructor(...deps);
    });
    return this;
  }

  // Register a factory function
  registerFactory<T>(token: string, factory: Factory<T>): this {
    this.factories.set(token, factory);
    return this;
  }

  // Register a singleton
  registerSingleton<T>(token: string, constructor: Constructor<T>, dependencies: string[] = []): this {
    this.factories.set(token, () => {
      if (!this.singletons.has(token)) {
        const deps = dependencies.map(dep => this.resolve(dep));
        this.singletons.set(token, new constructor(...deps));
      }
      return this.singletons.get(token);
    });
    return this;
  }

  // Register an instance
  registerInstance<T>(token: string, instance: T): this {
    this.services.set(token, instance);
    return this;
  }

  // Resolve a dependency
  resolve<T>(token: string): T {
    // Check for direct instance
    if (this.services.has(token)) {
      return this.services.get(token);
    }

    // Check for factory
    if (this.factories.has(token)) {
      return this.factories.get(token)!();
    }

    throw new Error(`Service '${token}' not found`);
  }
}

// Usage
const container = new Container();

// Register services
container
  .registerSingleton('logger', ConsoleLogger)
  .registerSingleton('database', PostgreSQLDatabase, ['config'])
  .register('userRepository', PostgreSQLUserRepository, ['database'])
  .register('userService', UserService, ['userRepository', 'logger', 'emailService'])
  .registerInstance('config', { host: 'localhost', port: 5432 })
  .registerFactory('emailService', () => new SendGridEmailService(process.env.SENDGRID_KEY!));

// Resolve
const userService = container.resolve<UserService>('userService');
```

**NestJS-Style Decorators:**

```typescript
// Decorator-based DI (similar to NestJS)
const Injectable = () => (target: any) => {
  // Mark class as injectable
  Reflect.defineMetadata('injectable', true, target);
};

const Inject = (token: string) => (target: any, key: string | undefined, index: number) => {
  const existingDeps = Reflect.getMetadata('dependencies', target) || [];
  existingDeps[index] = token;
  Reflect.defineMetadata('dependencies', existingDeps, target);
};

// Services
@Injectable()
class LoggerService {
  info(message: string) {
    console.log(`[INFO] ${message}`);
  }
}

@Injectable()
class DatabaseService {
  constructor(@Inject('CONFIG') private config: any) {}

  query(sql: string) {
    console.log(`Executing on ${this.config.host}: ${sql}`);
  }
}

@Injectable()
class UserService {
  constructor(
    private logger: LoggerService,
    private database: DatabaseService
  ) {}

  getUsers() {
    this.logger.info('Fetching users');
    return this.database.query('SELECT * FROM users');
  }
}
```

### Interview Questions

**Q: What's the difference between DI and Service Locator?**

**A:**

| Aspect | Dependency Injection | Service Locator |
|--------|---------------------|-----------------|
| **How** | Dependencies pushed in | Dependencies pulled from locator |
| **Explicitness** | Dependencies visible in constructor | Hidden behind locator calls |
| **Testing** | Easy to mock via constructor | Need to configure locator |
| **Coupling** | Depends on interfaces | Depends on locator |

```javascript
// DI: Dependencies explicit
class UserService {
  constructor(database, logger) {  // Clear what's needed
    this.database = database;
    this.logger = logger;
  }
}

// Service Locator: Dependencies hidden
class UserService {
  constructor() {
    this.database = ServiceLocator.get('database');  // Hidden dependency
    this.logger = ServiceLocator.get('logger');
  }
}
```

---

## MVC (Model-View-Controller)

### 💡 **Intent**

Separate an application into three interconnected components: **Model** (data/business logic), **View** (presentation), and **Controller** (input handling).

### Structure

```
User Input
     │
     ▼
┌─────────────────┐
│   Controller    │ ──── Handles requests, orchestrates
├─────────────────┤
│ + handleRequest()│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────┐
│ Model │  │ View  │
├───────┤  ├───────┤
│ Data  │  │Render │
│ Logic │  │Output │
└───────┘  └───────┘
```

### Implementation

**Express MVC Structure:**

```
src/
├── controllers/
│   └── userController.ts
├── models/
│   └── User.ts
├── views/
│   └── users/
│       ├── index.ejs
│       └── show.ejs
├── services/
│   └── userService.ts
├── routes/
│   └── userRoutes.ts
└── app.ts
```

```typescript
// Model - src/models/User.ts
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

class UserModel {
  private users: User[] = [];

  findAll(): User[] {
    return this.users;
  }

  findById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  create(data: Omit<User, 'id' | 'createdAt'>): User {
    const user: User = {
      id: `${Date.now()}`,
      ...data,
      createdAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  update(id: string, data: Partial<User>): User | null {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    this.users[index] = { ...this.users[index], ...data };
    return this.users[index];
  }

  delete(id: string): boolean {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return false;

    this.users.splice(index, 1);
    return true;
  }
}

export const userModel = new UserModel();
```

```typescript
// Controller - src/controllers/userController.ts
import { Request, Response } from 'express';
import { userModel } from '../models/User';

export const userController = {
  // GET /users
  index(req: Request, res: Response) {
    const users = userModel.findAll();

    // For API requests
    if (req.accepts('json')) {
      return res.json(users);
    }

    // For browser requests - render view
    res.render('users/index', { users });
  },

  // GET /users/:id
  show(req: Request, res: Response) {
    const user = userModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.accepts('json')) {
      return res.json(user);
    }

    res.render('users/show', { user });
  },

  // POST /users
  create(req: Request, res: Response) {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email required' });
    }

    const user = userModel.create({ name, email });
    res.status(201).json(user);
  },

  // PUT /users/:id
  update(req: Request, res: Response) {
    const user = userModel.update(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  },

  // DELETE /users/:id
  delete(req: Request, res: Response) {
    const deleted = userModel.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  }
};
```

```typescript
// Routes - src/routes/userRoutes.ts
import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

router.get('/', userController.index);
router.get('/:id', userController.show);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

export default router;
```

```typescript
// App - src/app.ts
import express from 'express';
import userRoutes from './routes/userRoutes';

const app = express();

app.use(express.json());
app.set('view engine', 'ejs');

app.use('/users', userRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### MVC Variants

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **MVC** | Controller mediates Model-View | Traditional web apps |
| **MVP** | Presenter handles all logic, View is passive | Desktop apps, testing focus |
| **MVVM** | ViewModel with two-way binding | Modern frontend (React, Vue) |

---

## Service Layer

### 💡 **Intent**

Define an application's boundary with a layer of services that establishes a set of available operations and coordinates the application's response to each operation.

### Structure

```
┌─────────────────────────────────────────────────────┐
│                   Presentation Layer                 │
│            (Controllers, API Endpoints)              │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│                    Service Layer                     │
│     (Application Logic, Transaction Management)      │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ UserService │  │OrderService │  │EmailService │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│                    Domain Layer                      │
│        (Entities, Repositories, Domain Logic)        │
└─────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// Domain entities
interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

// Service Layer
class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private userRepository: UserRepository,
    private paymentService: PaymentService,
    private inventoryService: InventoryService,
    private notificationService: NotificationService
  ) {}

  // Application use case: Place an order
  async placeOrder(userId: string, items: OrderItem[]): Promise<Order> {
    // 1. Validate user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.status === 'suspended') {
      throw new Error('User account is suspended');
    }

    // 2. Check inventory
    for (const item of items) {
      const available = await this.inventoryService.checkStock(item.productId);
      if (available < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
    }

    // 3. Calculate total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 4. Create order
    const order = await this.orderRepository.create({
      userId,
      items,
      total,
      status: 'pending'
    });

    // 5. Reserve inventory
    for (const item of items) {
      await this.inventoryService.reserve(item.productId, item.quantity, order.id);
    }

    // 6. Send confirmation
    await this.notificationService.sendOrderConfirmation(user.email, order);

    return order;
  }

  // Application use case: Process payment
  async processPayment(orderId: string, paymentDetails: PaymentDetails): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    if (order.status !== 'pending') {
      throw new Error('Order is not pending payment');
    }

    // Process payment
    const paymentResult = await this.paymentService.charge(paymentDetails, order.total);

    if (!paymentResult.success) {
      // Release inventory
      for (const item of order.items) {
        await this.inventoryService.release(item.productId, item.quantity, order.id);
      }
      throw new Error('Payment failed');
    }

    // Update order status
    const updatedOrder = await this.orderRepository.update(orderId, {
      status: 'paid',
      paymentId: paymentResult.transactionId
    });

    // Get user for notification
    const user = await this.userRepository.findById(order.userId);
    await this.notificationService.sendPaymentConfirmation(user!.email, updatedOrder);

    return updatedOrder;
  }

  // Application use case: Cancel order
  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      throw new Error('Cannot cancel shipped orders');
    }

    // Refund if paid
    if (order.status === 'paid') {
      await this.paymentService.refund(order.paymentId!);
    }

    // Release inventory
    for (const item of order.items) {
      await this.inventoryService.release(item.productId, item.quantity, order.id);
    }

    // Update order
    const cancelledOrder = await this.orderRepository.update(orderId, {
      status: 'cancelled',
      cancelReason: reason
    });

    // Notify user
    const user = await this.userRepository.findById(order.userId);
    await this.notificationService.sendCancellationNotice(user!.email, cancelledOrder);

    return cancelledOrder;
  }
}

// Controller uses Service Layer
class OrderController {
  constructor(private orderService: OrderService) {}

  async create(req: Request, res: Response) {
    try {
      const order = await this.orderService.placeOrder(req.user.id, req.body.items);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async pay(req: Request, res: Response) {
    try {
      const order = await this.orderService.processPayment(req.params.id, req.body.payment);
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async cancel(req: Request, res: Response) {
    try {
      const order = await this.orderService.cancelOrder(req.params.id, req.body.reason);
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
```

### Service vs Repository

| Aspect | Service Layer | Repository |
|--------|---------------|------------|
| **Purpose** | Application/business logic | Data access |
| **Scope** | Orchestrates multiple operations | Single entity CRUD |
| **Dependencies** | Multiple repositories, services | Database/ORM |
| **Transactions** | Manages transactions | Part of transaction |

---

## Unit of Work

### 💡 **Intent**

Maintain a **list of objects affected by a business transaction** and coordinate writing out changes and resolving concurrency problems.

### Implementation

```typescript
interface UnitOfWork {
  registerNew<T>(entity: T): void;
  registerDirty<T>(entity: T): void;
  registerDeleted<T>(entity: T): void;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

class DatabaseUnitOfWork implements UnitOfWork {
  private newEntities: Map<string, any[]> = new Map();
  private dirtyEntities: Map<string, any[]> = new Map();
  private deletedEntities: Map<string, any[]> = new Map();
  private connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  registerNew<T extends { __table?: string }>(entity: T): void {
    const table = entity.__table || entity.constructor.name.toLowerCase() + 's';
    if (!this.newEntities.has(table)) {
      this.newEntities.set(table, []);
    }
    this.newEntities.get(table)!.push(entity);
  }

  registerDirty<T extends { __table?: string; id: string }>(entity: T): void {
    const table = entity.__table || entity.constructor.name.toLowerCase() + 's';
    if (!this.dirtyEntities.has(table)) {
      this.dirtyEntities.set(table, []);
    }
    this.dirtyEntities.get(table)!.push(entity);
  }

  registerDeleted<T extends { __table?: string; id: string }>(entity: T): void {
    const table = entity.__table || entity.constructor.name.toLowerCase() + 's';
    if (!this.deletedEntities.has(table)) {
      this.deletedEntities.set(table, []);
    }
    this.deletedEntities.get(table)!.push(entity);
  }

  async commit(): Promise<void> {
    await this.connection.beginTransaction();

    try {
      // Insert new entities
      for (const [table, entities] of this.newEntities) {
        for (const entity of entities) {
          await this.connection.insert(table, entity);
        }
      }

      // Update dirty entities
      for (const [table, entities] of this.dirtyEntities) {
        for (const entity of entities) {
          await this.connection.update(table, entity.id, entity);
        }
      }

      // Delete removed entities
      for (const [table, entities] of this.deletedEntities) {
        for (const entity of entities) {
          await this.connection.delete(table, entity.id);
        }
      }

      await this.connection.commitTransaction();
      this.clear();
    } catch (error) {
      await this.connection.rollbackTransaction();
      throw error;
    }
  }

  async rollback(): Promise<void> {
    this.clear();
  }

  private clear(): void {
    this.newEntities.clear();
    this.dirtyEntities.clear();
    this.deletedEntities.clear();
  }
}

// Usage with repositories
class UserRepository {
  constructor(private uow: UnitOfWork) {}

  add(user: User): void {
    this.uow.registerNew(user);
  }

  update(user: User): void {
    this.uow.registerDirty(user);
  }

  remove(user: User): void {
    this.uow.registerDeleted(user);
  }
}

// Service using Unit of Work
class TransferService {
  constructor(
    private uow: UnitOfWork,
    private accountRepo: AccountRepository
  ) {}

  async transfer(fromId: string, toId: string, amount: number): Promise<void> {
    const fromAccount = await this.accountRepo.findById(fromId);
    const toAccount = await this.accountRepo.findById(toId);

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient funds');
    }

    fromAccount.balance -= amount;
    toAccount.balance += amount;

    this.accountRepo.update(fromAccount);
    this.accountRepo.update(toAccount);

    // Both updates committed together or both rolled back
    await this.uow.commit();
  }
}
```

---

## Summary: Choosing the Right Architectural Pattern

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| **Repository** | Abstract data access | Any app with data persistence |
| **DI** | Manage dependencies | All applications |
| **MVC** | Separate concerns | Web applications |
| **Service Layer** | Application boundary | Complex business logic |
| **Unit of Work** | Transaction management | Multiple related changes |

### Typical Backend Architecture

```
┌────────────────────────────────────────┐
│           Controllers (API)            │ ← Handle HTTP requests
└────────────────────┬───────────────────┘
                     │
┌────────────────────▼───────────────────┐
│            Service Layer               │ ← Business logic, orchestration
└────────────────────┬───────────────────┘
                     │
┌────────────────────▼───────────────────┐
│            Repositories                │ ← Data access abstraction
└────────────────────┬───────────────────┘
                     │
┌────────────────────▼───────────────────┐
│         Database / External APIs        │
└────────────────────────────────────────┘

Cross-cutting: DI Container manages all dependencies
```

---

**Next:** [SOLID Principles →](./05-solid-principles.md)

---

[← Behavioral Patterns](./03-behavioral-patterns.md) | [Back to Design Patterns](./README.md)
