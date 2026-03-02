[← README](./README.md) | [← 06 Composition vs Inheritance](./06-composition-vs-inheritance.md)

---

# 07 — OOP in the Real World

## 💡 **Connecting Theory to Practice**

OOP principles are not academic exercises — they form the backbone of how modern full-stack applications are structured. This chapter ties together everything from encapsulation and polymorphism to SOLID and composition, showing how they manifest in production codebases.

> **Key Insight:**
> Understanding OOP in isolation is not enough. Interviewers expect you to explain *how* and *why* you apply these principles when building real systems.

---

## Layered Architecture — The OOP Backbone

Most production backend applications follow a layered architecture where each layer is a set of classes with a single, clear responsibility.

```
+-------------------------------+
|      Controller Layer         |  <-- Handles HTTP requests
|      (Routes + Validation)    |
+-------------------------------+
|       Service Layer           |  <-- Business logic
|    (Business Rules + DTOs)    |
+-------------------------------+
|     Repository Layer          |  <-- Data access
|   (Database Operations)       |
+-------------------------------+
|       Entity Layer            |  <-- Data models
|   (Database Schemas/Models)   |
+-------------------------------+
```

**How the layers interact:**

```
Client Request
    |
    v
Controller  -->  validates input, delegates to service
    |
    v
Service     -->  orchestrates business logic, calls repositories
    |
    v
Repository  -->  reads/writes to database
    |
    v
Entity      -->  represents a database row as an object
    |
    v
Response flows back up through the same layers
```

**Why this matters for OOP:**

| Layer | OOP Principle | Explanation |
|-------|--------------|-------------|
| **Controller** | Single Responsibility | Only handles HTTP concerns |
| **Service** | Encapsulation | Business rules hidden behind a clean interface |
| **Repository** | Abstraction | Database details abstracted away |
| **Entity** | Encapsulation | Data + validation co-located |
| **Cross-layer** | Dependency Injection | Each layer receives its dependencies |

---

## Core Patterns

### 💡 **1. Services — Business Logic Classes**

Services encapsulate business rules. They are the heart of the application and the primary place where OOP shines.

**Key Characteristics:**

- **Single Responsibility:** Each service owns one domain (users, orders, auth)
- **Dependency Injection:** Services receive repositories and other services via constructors
- **Testable:** DI makes it trivial to swap real dependencies for mocks

**TypeScript Example:**

```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

interface IEmailService {
  sendWelcomeEmail(to: string, name: string): Promise<void>;
}

class UserService {
  // Dependencies injected via constructor
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService
  ) {}

  async createUser(dto: CreateUserDTO): Promise<UserResponseDTO> {
    // Business rule: no duplicate emails
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const hashedPassword = await hashPassword(dto.password);
    const user = await this.userRepo.save({
      ...dto,
      password: hashedPassword,
      createdAt: new Date(),
    });

    // Side effect: send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    // Return DTO, not the raw entity (hides password)
    return UserResponseDTO.fromEntity(user);
  }

  async getUserById(id: string): Promise<UserResponseDTO> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return UserResponseDTO.fromEntity(user);
  }
}
```

> **Key Insight:**
> Notice how `UserService` depends on *interfaces* (`IUserRepository`, `IEmailService`), not concrete classes. This is the Dependency Inversion Principle in action.

---

### 💡 **2. Repositories — Data Access Abstraction**

Repositories abstract away database operations so the service layer never knows whether data comes from PostgreSQL, MongoDB, or an in-memory store.

**Generic Base Repository:**

```typescript
interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  save(entity: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class BaseRepository<T> implements IBaseRepository<T> {
  constructor(private readonly model: any) {} // ORM model

  async findById(id: string): Promise<T | null> {
    return this.model.findOne({ where: { id } });
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    return this.model.find({ where: filter });
  }

  async save(entity: Partial<T>): Promise<T> {
    return this.model.create(entity);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    await this.model.update(data, { where: { id } });
    return this.findById(id) as Promise<T>;
  }

  async delete(id: string): Promise<void> {
    await this.model.destroy({ where: { id } });
  }
}
```

**Specific Repository Extending Base:**

```typescript
class UserRepository extends BaseRepository<User> {
  constructor(model: any) {
    super(model);
  }

  // Domain-specific query not in base
  async findByEmail(email: string): Promise<User | null> {
    return this.model.findOne({ where: { email } });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.model.find({ where: { isActive: true } });
  }
}
```

**OOP principles at work:**

- ✅ **Generics** — `BaseRepository<T>` avoids code duplication
- ✅ **Inheritance** — specific repositories extend the base for shared CRUD
- ✅ **Polymorphism** — any repository satisfying `IBaseRepository<T>` is interchangeable

---

### 💡 **3. Controllers — Request Handling**

Controllers are the entry point for HTTP requests. The golden rule is **thin controllers, fat services** — controllers should only validate input and delegate to services.

**TypeScript Example (Express-style):**

```typescript
class UserController {
  constructor(private readonly userService: UserService) {}

  // POST /users
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = CreateUserDTO.validate(req.body); // Validate input
      const user = await this.userService.createUser(dto); // Delegate
      res.status(201).json(user);
    } catch (error) {
      next(error); // Let error middleware handle it
    }
  }

  // GET /users/:id
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await this.userService.getUserById(req.params.id);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}
```

**❌ Bad Practice — Fat Controller:**

```typescript
// Business logic leaking into the controller
async create(req: Request, res: Response): Promise<void> {
  const existing = await db.query("SELECT * FROM users WHERE email = $1", [req.body.email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "Email taken" });
    return;
  }
  const hashed = await bcrypt.hash(req.body.password, 10);
  const user = await db.query("INSERT INTO users ...", [req.body.name, hashed]);
  await sendEmail(user.email, "Welcome!");
  res.status(201).json(user);
}
```

**✅ Good Practice — Thin Controller:**

```typescript
async create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = CreateUserDTO.validate(req.body);
    const user = await this.userService.createUser(dto);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}
```

> **Key Insight:**
> If your controller method is longer than 5-10 lines, business logic is probably leaking into it. Push that logic down into the service layer.

---

### 💡 **4. DTOs — Data Transfer Objects**

DTOs define the shape of data crossing boundaries (client to server, service to controller, etc.). They are critical for validation, security, and API contracts.

**TypeScript Example:**

```typescript
// What the client sends to create a user
class CreateUserDTO {
  name: string;
  email: string;
  password: string;

  static validate(body: unknown): CreateUserDTO {
    if (!body || typeof body !== "object") {
      throw new ValidationError("Invalid request body");
    }
    const { name, email, password } = body as Record<string, unknown>;
    if (typeof name !== "string" || name.length < 2) {
      throw new ValidationError("Name must be at least 2 characters");
    }
    if (typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError("Invalid email");
    }
    if (typeof password !== "string" || password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }
    const dto = new CreateUserDTO();
    dto.name = name;
    dto.email = email;
    dto.password = password;
    return dto;
  }
}

// What the client sends to update a user (all fields optional)
class UpdateUserDTO {
  name?: string;
  email?: string;
}

// What the server sends back (never includes password)
class UserResponseDTO {
  id: string;
  name: string;
  email: string;
  createdAt: Date;

  static fromEntity(user: User): UserResponseDTO {
    const dto = new UserResponseDTO();
    dto.id = user.id;
    dto.name = user.name;
    dto.email = user.email;
    dto.createdAt = user.createdAt;
    return dto; // Password is never exposed
  }
}
```

**Why DTOs Matter:**

| Concern | Without DTOs | With DTOs |
|---------|-------------|-----------|
| **Security** | Password hash accidentally sent to client | Response DTO explicitly excludes sensitive fields |
| **Validation** | Scattered validation logic | Centralized in DTO class |
| **API Contract** | Shape changes break clients | DTOs decouple internal models from API |
| **Documentation** | Unclear what fields are required | DTO class is self-documenting |

---

### 💡 **5. Entities — Database Models with OOP**

Entities represent database records as objects. Modern ORMs like TypeORM use decorators to map classes to tables.

**TypeScript Example (TypeORM-style):**

```typescript
@Entity("users")
class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // Hashed, never exposed via DTO

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  // Encapsulated business logic on the entity itself
  deactivate(): void {
    this.isActive = false;
  }

  hasOrdersAbove(amount: number): boolean {
    return this.orders.some((order) => order.total > amount);
  }
}
```

---

## OOP in Different Frameworks

### 💡 **Express.js with OOP**

Express does not enforce OOP, but you can structure it with classes for better organization.

```typescript
// Wiring it all together with DI
class App {
  private app: Express;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Manual dependency injection
    const userRepo = new UserRepository(UserModel);
    const emailService = new EmailService();
    const userService = new UserService(userRepo, emailService);
    const userController = new UserController(userService);

    this.app.post("/users", (req, res, next) =>
      userController.create(req, res, next)
    );
    this.app.get("/users/:id", (req, res, next) =>
      userController.getById(req, res, next)
    );
  }

  listen(port: number): void {
    this.app.listen(port, () => console.log(`Server running on ${port}`));
  }
}
```

---

### 💡 **NestJS — OOP-First Framework**

NestJS is designed around OOP from the ground up. It uses decorators, dependency injection containers, and modules.

```typescript
// NestJS handles DI automatically via decorators
@Injectable()
class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService
  ) {}

  async createUser(dto: CreateUserDTO): Promise<UserResponseDTO> {
    const user = this.userRepo.create(dto);
    await this.userRepo.save(user);
    await this.emailService.sendWelcomeEmail(user.email, user.name);
    return UserResponseDTO.fromEntity(user);
  }
}

@Controller("users")
class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() dto: CreateUserDTO): Promise<UserResponseDTO> {
    return this.userService.createUser(dto);
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<UserResponseDTO> {
    return this.userService.getUserById(id);
  }
}
```

**Express vs NestJS OOP Comparison:**

| Aspect | Express + OOP | NestJS |
|--------|--------------|--------|
| **DI** | Manual wiring | Automatic via `@Injectable()` |
| **Decorators** | Optional | Core to the framework |
| **Modules** | Roll your own | Built-in `@Module()` system |
| **Learning curve** | Lower | Higher |
| **OOP enforcement** | Convention-based | Framework-enforced |

---

### 💡 **OOP in React (Brief)**

React moved from class components to hooks, but OOP patterns still appear at the architectural level.

**Historical Context — Class Components:**

```typescript
class Counter extends React.Component<{}, { count: number }> {
  state = { count: 0 };

  increment = (): void => {
    this.setState((prev) => ({ count: prev.count + 1 }));
  };

  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}
```

**Where OOP Still Applies in React Architectures:**

- ✅ **State management stores** — MobX uses observable classes
- ✅ **API service layers** — `UserService`, `AuthService` classes called from hooks
- ✅ **Error boundaries** — still require class components
- ❌ **UI components** — hooks and functional components are idiomatic

> **Key Insight:**
> React moved away from class-based *components*, but OOP patterns remain valuable in the *architecture* surrounding React — services, state stores, and utility layers.

---

## Testing OOP Code

### 💡 **Why OOP Makes Testing Easier**

Dependency Injection is the key. When a class receives its dependencies through the constructor, you can replace real implementations with test doubles.

```
Production:
UserService  -->  PostgresUserRepository  -->  Real Database

Testing:
UserService  -->  MockUserRepository      -->  In-Memory Data
```

### TypeScript Example — Testing a Service:

```typescript
// A simple mock repository
class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async save(user: Partial<User>): Promise<User> {
    const newUser = { id: "test-id-1", createdAt: new Date(), ...user } as User;
    this.users.push(newUser);
    return newUser;
  }

  async delete(id: string): Promise<void> {
    this.users = this.users.filter((u) => u.id !== id);
  }
}

class MockEmailService implements IEmailService {
  public sentEmails: Array<{ to: string; name: string }> = [];

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    this.sentEmails.push({ to, name }); // Track calls instead of sending
  }
}

// Test suite
describe("UserService", () => {
  let userService: UserService;
  let mockUserRepo: MockUserRepository;
  let mockEmailService: MockEmailService;

  beforeEach(() => {
    mockUserRepo = new MockUserRepository();
    mockEmailService = new MockEmailService();
    userService = new UserService(mockUserRepo, mockEmailService);
  });

  it("should create a user and send welcome email", async () => {
    const dto: CreateUserDTO = {
      name: "Alice",
      email: "alice@example.com",
      password: "securepass123",
    };

    const result = await userService.createUser(dto);

    expect(result.name).toBe("Alice");
    expect(result.email).toBe("alice@example.com");
    expect(mockEmailService.sentEmails).toHaveLength(1);
    expect(mockEmailService.sentEmails[0].to).toBe("alice@example.com");
  });

  it("should throw ConflictError for duplicate email", async () => {
    const dto: CreateUserDTO = {
      name: "Alice",
      email: "alice@example.com",
      password: "securepass123",
    };

    await userService.createUser(dto);

    await expect(userService.createUser(dto)).rejects.toThrow(ConflictError);
  });
});
```

**Why this works:**

- ✅ No database needed — tests run in milliseconds
- ✅ No network calls — email service is mocked
- ✅ Isolated — each test gets fresh instances via `beforeEach`
- ✅ Deterministic — no external state affects outcomes

---

## Common OOP Interview Questions with Model Answers

### 💡 **Q1: "Design a parking lot system"**

**Approach:** Identify the key entities and their relationships.

```typescript
class Vehicle {
  constructor(
    public licensePlate: string,
    public size: VehicleSize
  ) {}
}

enum VehicleSize {
  MOTORCYCLE = "motorcycle",
  COMPACT = "compact",
  LARGE = "large",
}

class ParkingSpot {
  private vehicle: Vehicle | null = null;

  constructor(
    public id: string,
    public size: VehicleSize,
    public level: number
  ) {}

  isAvailable(): boolean {
    return this.vehicle === null;
  }

  canFit(vehicle: Vehicle): boolean {
    return this.isAvailable() && this.size >= vehicle.size;
  }

  park(vehicle: Vehicle): void {
    if (!this.canFit(vehicle)) throw new Error("Cannot fit vehicle");
    this.vehicle = vehicle;
  }

  vacate(): Vehicle | null {
    const v = this.vehicle;
    this.vehicle = null;
    return v;
  }
}

class ParkingLot {
  private spots: ParkingSpot[] = [];

  constructor(private readonly levels: number, spotsPerLevel: number) {
    for (let level = 0; level < levels; level++) {
      for (let i = 0; i < spotsPerLevel; i++) {
        this.spots.push(new ParkingSpot(`${level}-${i}`, VehicleSize.COMPACT, level));
      }
    }
  }

  findAvailableSpot(vehicle: Vehicle): ParkingSpot | null {
    return this.spots.find((spot) => spot.canFit(vehicle)) ?? null;
  }

  parkVehicle(vehicle: Vehicle): Ticket {
    const spot = this.findAvailableSpot(vehicle);
    if (!spot) throw new Error("Parking lot is full");
    spot.park(vehicle);
    return new Ticket(vehicle, spot, new Date());
  }
}

class Ticket {
  constructor(
    public vehicle: Vehicle,
    public spot: ParkingSpot,
    public entryTime: Date
  ) {}

  calculateFee(exitTime: Date, ratePerHour: number): number {
    const hours = Math.ceil(
      (exitTime.getTime() - this.entryTime.getTime()) / (1000 * 60 * 60)
    );
    return hours * ratePerHour;
  }
}
```

**OOP Principles Used:**
- **Encapsulation** — `ParkingSpot` manages its own state
- **Single Responsibility** — each class owns one concept
- **Composition** — `ParkingLot` is composed of `ParkingSpot` objects

---

### 💡 **Q2: "How would you structure a backend service?"**

**Model Answer:**

> I use a layered architecture with four layers: Controllers handle HTTP concerns, Services contain business logic, Repositories abstract data access, and Entities represent the data models. Each layer depends on abstractions (interfaces) rather than concrete implementations, which follows the Dependency Inversion Principle. Dependencies are injected via constructors, making every layer independently testable.

Refer to the [layered architecture diagram](#layered-architecture--the-oop-backbone) at the top of this file.

---

### 💡 **Q3: "Explain DI and why it matters"**

**Model Answer:**

> Dependency Injection means a class receives its dependencies from the outside rather than creating them internally. This matters for three reasons: first, **testability** — you can inject mocks during testing. Second, **flexibility** — swapping implementations (e.g., switching from PostgreSQL to MongoDB) requires changing only the wiring code, not the business logic. Third, **SOLID compliance** — it enforces the Dependency Inversion Principle, making code depend on abstractions rather than concrete classes.

---

### 💡 **Q4: "Class components vs Hooks in React"**

**Model Answer:**

| Aspect | Class Components | Hooks |
|--------|-----------------|-------|
| **Paradigm** | OOP (inheritance from `React.Component`) | Functional + closures |
| **State** | `this.state` + `this.setState` | `useState` |
| **Side Effects** | Lifecycle methods (`componentDidMount`, etc.) | `useEffect` |
| **Code Reuse** | HOCs, render props (complex) | Custom hooks (simple) |
| **Bundle Size** | Slightly larger | Slightly smaller |

> Classes are not *wrong*, but hooks are idiomatic React. OOP patterns are still valuable in the service and state management layers surrounding React components.

---

### 💡 **Q5: "How do you handle different notification types?"**

**Model Answer:** Use polymorphism with a common interface.

```typescript
interface NotificationChannel {
  send(to: string, message: string): Promise<void>;
}

class EmailNotification implements NotificationChannel {
  async send(to: string, message: string): Promise<void> {
    // Send via SMTP
  }
}

class SMSNotification implements NotificationChannel {
  async send(to: string, message: string): Promise<void> {
    // Send via Twilio
  }
}

class PushNotification implements NotificationChannel {
  async send(to: string, message: string): Promise<void> {
    // Send via Firebase
  }
}

class NotificationService {
  constructor(private readonly channels: NotificationChannel[]) {}

  async notifyAll(to: string, message: string): Promise<void> {
    await Promise.all(
      this.channels.map((channel) => channel.send(to, message))
    );
  }
}

// Usage — add new channels without modifying NotificationService (Open/Closed Principle)
const service = new NotificationService([
  new EmailNotification(),
  new SMSNotification(),
  new PushNotification(),
]);
```

---

## Key Takeaways

| Principle | Real-World Application |
|-----------|----------------------|
| **Encapsulation** | Services hide business logic behind clean interfaces |
| **Abstraction** | Repositories abstract database details from services |
| **Polymorphism** | Notification channels, payment providers, auth strategies |
| **Composition** | Services composed of repositories and other services |
| **DI** | Constructor injection enables testing and flexibility |
| **SOLID** | Layered architecture naturally follows all five principles |

**Final Principles:**

- ✅ OOP provides structure for large codebases — without it, business logic scatters across files
- ✅ Composition + DI are the most practical OOP patterns in modern development
- ✅ Program against interfaces, not concrete classes
- ✅ Keep inheritance hierarchies shallow — prefer composition
- ⚠️ Do not over-engineer — use OOP where it adds clarity, not everywhere by default
- ❌ Avoid deep inheritance chains — they become rigid and hard to refactor

> **Key Insight:**
> The goal of OOP in production code is not to use every pattern — it is to write code that is **easy to test, easy to extend, and easy for other engineers to understand**.

---

[← Back to README](./README.md)
